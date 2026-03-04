import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:http/http.dart' as http;
import '../../services/three_js_interop_service.dart';
import '../../services/object_deletion_state_service.dart';
import '../../models/file_model.dart' as fm;
import '../helpers/three_js_modal_helper.dart';
import '../../config/api_keys.dart';

/// Mixin containing all modal and dialog handling functionality for ThreeJsScreen
///
/// This mixin provides:
/// - Object action bottom sheets
/// - Delete confirmation dialogs
/// - Delete options dialogs
/// - Undo confirmation dialogs
/// - Advanced options dialogs
///
/// CRITICAL: All methods preserved exactly as original - no functionality changes
mixin ThreeJsModalHandlers<T extends StatefulWidget> on State<T> {
  // Required getters that the main class must provide
  ThreeJsInteropService get threeJsInteropService;
  ObjectDeletionStateService get deletionStateService;
  WebViewController get webViewController;
  @override
  bool get mounted;

  // Required callback methods that the main class must provide
  Future<void> handleObjectDeletion(String objectId);
  void deleteAllObjects();
  void deleteAllObjectsAndFiles();
  void restoreFromBackup();
  void performUndoObjectDelete();
  void updateDisplayOptions();
  bool get showFileInfo;
  bool get useFaceTextures;

  /// Show object action bottom sheet with move and delete options
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  Future<void> showObjectActionBottomSheet(
    String objectIdAsPath,
    String objectName,
  ) async {
    if (!mounted) return;

    // Check if this is a furniture or path object
    bool isFurnitureObject = objectIdAsPath.startsWith('furniture_');
    bool isPathObject = objectIdAsPath.startsWith('path_');

    // Check if this is a link object by looking for "link" in the ID
    // Link objects have IDs like: app_com.link.nypostcom.1754508707556
    bool isLinkObject = objectIdAsPath.contains('link');
    print("Flutter: Object $objectIdAsPath is link object: $isLinkObject");

    // For furniture objects, get object count for Share menu
    int? furnitureObjectCount;
    if (isFurnitureObject) {
      try {
        final result = await webViewController.runJavaScriptReturningResult('''
          (function() {
            const furniture = window.app?.furnitureManager?.storageManager?.getFurniture('$objectIdAsPath');
            if (!furniture || !furniture.objectIds) return 0;
            
            // Count non-null object IDs
            let count = 0;
            for (let i = 0; i < furniture.objectIds.length; i++) {
              if (furniture.objectIds[i]) count++;
            }
            return count;
          })();
        ''');

        if (result != null) {
          furnitureObjectCount = int.tryParse(result.toString());
          print(
            "Flutter: Furniture $objectIdAsPath has $furnitureObjectCount objects",
          );
        }
      } catch (e) {
        print("Error getting furniture object count: $e");
      }
    }

    // For furniture/path objects, get auto-sort state from JavaScript
    bool? autoSortEnabled;
    String? sortCriteria;
    if (isFurnitureObject || isPathObject) {
      try {
        final result = await webViewController.runJavaScriptReturningResult('''
          (function() {
            const manager = ${isFurnitureObject ? 'window.app?.furnitureManager' : 'window.app?.pathManager'};
            if (!manager) return null;
            
            const obj = manager.storageManager.${isFurnitureObject ? 'getFurniture' : 'getPath'}('$objectIdAsPath');
            if (!obj) return null;
            
            return {
              autoSort: obj.autoSort,
              sortCriteria: obj.sortCriteria,
              sortDirection: obj.sortDirection
            };
          })();
        ''');

        if (result != null && result.toString() != 'null') {
          final Map<String, dynamic> data = jsonDecode(result.toString());
          autoSortEnabled = data['autoSort'] as bool?;
          sortCriteria = data['sortCriteria'] as String?;
        }
      } catch (e) {
        print("Error getting auto-sort state: $e");
      }
    }

    // Get current world type to determine available movement options
    String? currentWorldType;
    try {
      currentWorldType = await threeJsInteropService.getCurrentWorldType();
    } catch (e) {
      print("Error getting current world type: $e");
      currentWorldType = 'green-plane'; // Default fallback
    }

    // Determine if we're in a 3D world (space/ocean/forest) that supports vertical movement
    print("Flutter: DEBUG - currentWorldType = '$currentWorldType'");
    print("Flutter: DEBUG - space check: ${currentWorldType == 'space'}");
    print("Flutter: DEBUG - ocean check: ${currentWorldType == 'ocean'}");
    print("Flutter: DEBUG - forest check: ${currentWorldType == 'forest'}");
    print("Flutter: DEBUG - cave check: ${currentWorldType == 'cave'}");
    print(
      "Flutter: DEBUG - christmas check: ${currentWorldType == 'christmas'}",
    );

    final bool supportsVerticalMovement =
        currentWorldType == 'space' ||
        currentWorldType == 'ocean' ||
        currentWorldType == 'forest' ||
        currentWorldType == 'cave' ||
        currentWorldType == 'christmas';

    print(
      "Flutter: supportsVerticalMovement = $supportsVerticalMovement (worldType: $currentWorldType)",
    );

    if (!supportsVerticalMovement) {
      print(
        "Flutter: Vertical movement not available in $currentWorldType world. Switch to Space, Ocean, or Forest world for full 3D movement options.",
      );
    }

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (BuildContext sheetContext) {
        return SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(sheetContext).size.height * 0.7,
            ),
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 8.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: Text(
                        'Actions for: "$objectName"',
                        style: Theme.of(sheetContext).textTheme.titleLarge
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ),
                    // Show "Change Name" option for link objects
                    if (isLinkObject) ...[
                      ListTile(
                        leading: const Icon(
                          Icons.edit_outlined,
                          color: Colors.blue,
                        ),
                        title: const Text('Change Name'),
                        contentPadding: EdgeInsets.zero,
                        onTap: () async {
                          Navigator.of(sheetContext).pop();
                          _showLinkNameChangeDialog(objectIdAsPath, objectName);
                        },
                      ),
                    ],
                    // Show movement options based on world type
                    if (supportsVerticalMovement) ...[
                      // In space/ocean/forest worlds: show separate horizontal and vertical options
                      ListTile(
                        leading: const Icon(
                          Icons.open_with,
                          color: Colors.blueAccent,
                        ),
                        title: const Text('Move Object Horizontally'),
                        subtitle: const Text('Move on ground plane (X/Z axis)'),
                        contentPadding: EdgeInsets.zero,
                        onTap: () async {
                          Navigator.of(sheetContext).pop();
                          await threeJsInteropService
                              .selectObjectForMoveCommandJS(objectIdAsPath);
                        },
                      ),
                      ListTile(
                        leading: const Icon(Icons.height, color: Colors.green),
                        title: const Text('Move Object Vertically'),
                        subtitle: const Text('Move up/down (Y axis)'),
                        contentPadding: EdgeInsets.zero,
                        onTap: () async {
                          Navigator.of(sheetContext).pop();
                          await threeJsInteropService
                              .selectObjectForVerticalMoveCommandJS(
                                objectIdAsPath,
                              );
                        },
                      ),
                    ] else ...[
                      // In green-plane world: show standard move option
                      ListTile(
                        leading: const Icon(
                          Icons.open_with,
                          color: Colors.blueAccent,
                        ),
                        title: const Text('Move Object'),
                        contentPadding: EdgeInsets.zero,
                        onTap: () async {
                          Navigator.of(sheetContext).pop();
                          await threeJsInteropService
                              .selectObjectForMoveCommandJS(objectIdAsPath);
                        },
                      ),
                    ],
                    // Show auto-sort options for furniture and path objects
                    if (isFurnitureObject || isPathObject) ...[
                      const Divider(height: 24),
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8.0),
                        child: Text(
                          'Auto-Sort Settings',
                          style: Theme.of(sheetContext).textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                      StatefulBuilder(
                        builder: (BuildContext context, StateSetter setState) {
                          return SwitchListTile(
                            title: const Text('Auto-Sort Objects'),
                            subtitle: Text(
                              autoSortEnabled == true
                                  ? 'Objects will automatically arrange by ${sortCriteria ?? "fileName"}'
                                  : 'Objects keep manual positions',
                            ),
                            value: autoSortEnabled ?? true,
                            contentPadding: EdgeInsets.zero,
                            onChanged: (bool value) async {
                              setState(() {
                                autoSortEnabled = value;
                              });

                              // Toggle auto-sort in JavaScript
                              try {
                                await webViewController.runJavaScript('''
                              (function() {
                                const manager = ${isFurnitureObject ? 'window.app?.furnitureManager' : 'window.app?.pathManager'};
                                if (!manager) return;
                                
                                const obj = manager.storageManager.${isFurnitureObject ? 'getFurniture' : 'getPath'}('$objectIdAsPath');
                                if (!obj) return;
                                
                                obj.autoSort = $value;
                                manager.storageManager.${isFurnitureObject ? 'updateFurniture' : 'updatePath'}(obj);
                                
                                // Trigger re-sort if enabled
                                if ($value) {
                                  manager.${isFurnitureObject ? 'sortFurniture' : 'sortPathObjects'}('$objectIdAsPath');
                                }
                              })();
                            ''');

                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        value
                                            ? 'Auto-sort enabled - objects will arrange automatically'
                                            : 'Auto-sort disabled - objects keep manual positions',
                                      ),
                                      duration: const Duration(seconds: 2),
                                    ),
                                  );
                                }
                              } catch (e) {
                                print("Error toggling auto-sort: $e");
                              }
                            },
                          );
                        },
                      ),
                      if (autoSortEnabled == true)
                        ListTile(
                          leading: const Icon(Icons.sort, color: Colors.purple),
                          title: const Text('Sort Criteria'),
                          subtitle: Text(
                            'Currently: ${sortCriteria ?? "fileName"}',
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          contentPadding: EdgeInsets.zero,
                          onTap: () async {
                            Navigator.of(sheetContext).pop();
                            await _showSortCriteriaDialog(
                              objectIdAsPath,
                              isFurnitureObject,
                            );
                          },
                        ),
                      const Divider(height: 24),
                    ],
                    // Share Furniture option (for furniture objects only)
                    if (isFurnitureObject) ...[
                      ListTile(
                        leading: const Icon(Icons.share, color: Colors.blue),
                        title: const Text('Share Furniture'),
                        subtitle: Text(
                          furnitureObjectCount != null
                              ? '$furnitureObjectCount object${furnitureObjectCount == 1 ? '' : 's'} • Create shareable link'
                              : 'Create shareable link',
                        ),
                        contentPadding: EdgeInsets.zero,
                        onTap: () async {
                          Navigator.of(sheetContext).pop();
                          await _shareFurnitureFromLongPress(
                            objectIdAsPath,
                            objectName,
                          );
                        },
                      ),
                      ListTile(
                        leading: const Icon(
                          Icons.edit_outlined,
                          color: Colors.blue,
                        ),
                        title: const Text('Rename Furniture'),
                        contentPadding: EdgeInsets.zero,
                        onTap: () async {
                          Navigator.of(sheetContext).pop();
                          _showFurnitureNameChangeDialog(
                            objectIdAsPath,
                            objectName,
                          );
                        },
                      ),
                    ],
                    // Add to Furniture option (for file objects only, not furniture/paths)
                    if (!isFurnitureObject && !isPathObject)
                      ListTile(
                        leading: const Icon(
                          Icons.weekend,
                          color: Colors.blueAccent,
                        ),
                        title: const Text('Add to Furniture'),
                        subtitle: const Text('Place object on furniture'),
                        contentPadding: EdgeInsets.zero,
                        onTap: () async {
                          Navigator.of(sheetContext).pop();
                          await _showAddToFurnitureDialog(
                            objectIdAsPath,
                            objectName,
                          );
                        },
                      ),
                    // Move to Home Area option (for file objects only, not furniture/paths)
                    if (!isFurnitureObject && !isPathObject)
                      ListTile(
                        leading: const Icon(Icons.home, color: Colors.green),
                        title: const Text('Move to Home Area'),
                        subtitle: const Text('Return object to center'),
                        contentPadding: EdgeInsets.zero,
                        onTap: () async {
                          Navigator.of(sheetContext).pop();
                          await threeJsInteropService
                              .moveSearchResultToHomeArea(objectIdAsPath);
                        },
                      ),
                    ListTile(
                      leading: const Icon(
                        Icons.delete_outline,
                        color: Colors.redAccent,
                      ),
                      title: const Text('Delete Object'),
                      contentPadding: EdgeInsets.zero,
                      onTap: () {
                        Navigator.of(sheetContext).pop();
                        showDeleteConfirmationDialog(
                          objectIdAsPath,
                          objectName,
                        );
                      },
                    ),
                    const Divider(height: 1, thickness: 1),
                    ListTile(
                      leading: const Icon(
                        Icons.cancel_outlined,
                        color: Colors.grey,
                      ),
                      title: const Text('Cancel'),
                      contentPadding: EdgeInsets.zero,
                      onTap: () async {
                        Navigator.of(sheetContext).pop();
                        await threeJsInteropService.deselectObjectJS();
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  /// Show delete confirmation dialog for individual objects
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  Future<void> showDeleteConfirmationDialog(
    String objectIdAsPath,
    String objectName,
  ) async {
    // Using showModalBottomSheet instead of showDialog
    await showModalBottomSheet(
      context: context, // Use the main screen's context
      isScrollControlled: true,
      useSafeArea: true,
      builder: (BuildContext sheetContext) {
        // Context for the bottom sheet
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              16.0,
              16.0,
              16.0,
              8.0,
            ), // Adjusted padding
            child: Column(
              mainAxisSize:
                  MainAxisSize.min, // Make the sheet wrap content height
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Padding(
                  padding: const EdgeInsets.only(
                    bottom: 12.0,
                  ), // Increased bottom padding
                  child: Text(
                    'Manage: "$objectName"?', // Slightly rephrased
                    style: Theme.of(sheetContext).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
                ListTile(
                  leading: const Icon(
                    Icons.visibility_off_outlined,
                    color: Colors.orangeAccent,
                  ),
                  title: const Text('Remove from World Only'),
                  contentPadding:
                      EdgeInsets.zero, // Reduce padding for denser look
                  onTap: () async {
                    Navigator.of(
                      sheetContext,
                    ).pop(); // Dismiss the bottom sheet

                    // CRITICAL: Store visual state BEFORE removing object for undo functionality
                    await threeJsInteropService.storeObjectVisualStateForUndo(
                      objectIdAsPath,
                    );

                    await threeJsInteropService.removeObjectByIdJS(
                      objectIdAsPath,
                    );
                    await handleObjectDeletion(
                      objectIdAsPath,
                    ); // Flutter state update

                    // Schedule refreshControlsState after the current frame is built
                    WidgetsBinding.instance.addPostFrameCallback((_) async {
                      if (mounted) {
                        // Check if the widget is still in the tree
                        await threeJsInteropService.refreshControlsState();
                      }
                    });
                  },
                ),
                const Divider(height: 1, thickness: 1), // Thinner divider
                ListTile(
                  leading: const Icon(
                    Icons.cancel_outlined,
                    color: Colors.grey,
                  ),
                  title: const Text('Cancel'),
                  contentPadding: EdgeInsets.zero,
                  onTap: () async {
                    Navigator.of(
                      sheetContext,
                    ).pop(); // Dismiss the bottom sheet
                    await threeJsInteropService.deselectObjectJS();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Show delete options dialog for bulk operations
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  void showDeleteOptionsDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Delete Options'),
          content: const Text('Choose what you want to delete:'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                showDeleteObjectsConfirmation();
              },
              child: const Text('Delete all objects only'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }

  /// Show confirmation dialog for deleting all objects only
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  void showDeleteObjectsConfirmation() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Delete Options'),
          content: const Text('Choose what you want to delete:'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                deleteAllObjects();
              },
              child: const Text('Delete all objects only'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }

  /// Show confirmation dialog for deleting all objects and files
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  void showDeleteObjectsAndFilesConfirmation() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Confirm Deletion'),
          content: const Text(
            'Are you sure you want to delete all objects and files? This action cannot be undone.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                deleteAllObjectsAndFiles();
              },
              child: const Text('Yes'),
            ),
          ],
        );
      },
    );
  }

  /// Show undo confirmation dialog
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  void showUndoConfirmationDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        final fm.FileModel? recentObject = deletionStateService
            .getMostRecentlyDeletedObject();
        return AlertDialog(
          title: const Text('Undo Object Deletion'),
          content: Text(
            recentObject != null
                ? 'Restore "${recentObject.name}" to the world?'
                : 'No recently deleted objects to restore.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            if (recentObject != null)
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  performUndoObjectDelete();
                },
                child: const Text('Undo'),
              ),
          ],
        );
      },
    );
  }

  /// Show advanced options dialog
  ///
  /// CRITICAL: Delegates to helper preserving exact functionality including stacking criteria
  void showAdvancedOptionsDialog() {
    // Delegate to helper - preserves exact same functionality including stacking criteria
    ThreeJsModalHelper.showAdvancedOptionsDialog(
      context: context,
      threeJsInteropService: threeJsInteropService,
      deletionStateService: deletionStateService,
      onShowDeleteOptions: showDeleteOptionsDialog,
      onShowUndoConfirmation: showUndoConfirmationDialog,
    );
  }

  /// Show the link name change dialog
  Future<void> _showLinkNameChangeDialog(
    String objectId,
    String currentName,
  ) async {
    final TextEditingController controller = TextEditingController(
      text: currentName,
    );

    return showDialog<void>(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Change Link Name'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(
              labelText: 'New name',
              hintText: 'Enter new name for this link',
            ),
            autofocus: true,
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
              },
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () async {
                final newName = controller.text.trim();
                Navigator.of(
                  dialogContext,
                ).pop(); // Dismiss dialog first to prevent camera freeze

                if (newName.isNotEmpty && newName != currentName) {
                  // Call JavaScript to update the link name
                  try {
                    // Use runJavaScriptReturningResult to ensure completion
                    await webViewController.runJavaScript('''
                      if (window.linkNameHandler && window.linkNameHandler.updateLinkName) {
                        window.linkNameHandler.updateLinkName('$objectId', '$newName');
                      }
                    ''');

                    // Force camera reset from Dart side as additional safeguard
                    await webViewController.runJavaScript('''
                      if (window.forceCameraReset) { 
                        window.forceCameraReset(); 
                      } else { 
                        console.warn("forceCameraReset not available from Dart"); 
                      }
                    ''');

                    // Show success message
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Link name changed to "$newName"'),
                          backgroundColor: Colors.green,
                        ),
                      );
                    }
                  } catch (e) {
                    print('Error updating link name: $e');
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Error updating link name: $e'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                }
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _showFurnitureNameChangeDialog(
    String furnitureId,
    String currentName,
  ) async {
    final TextEditingController controller = TextEditingController(
      text: currentName,
    );

    return showDialog<void>(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Rename Furniture'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(
              labelText: 'New name',
              hintText: 'Enter new name for this furniture',
            ),
            autofocus: true,
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
              },
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () async {
                final newName = controller.text.trim();
                Navigator.of(dialogContext).pop(); // Dismiss dialog first

                if (newName.isNotEmpty && newName != currentName) {
                  // Call JavaScript to update the furniture name
                  try {
                    await webViewController.runJavaScript('''
                      if (window.furnitureNameHandler && window.furnitureNameHandler.updateFurnitureName) {
                        window.furnitureNameHandler.updateFurnitureName('$furnitureId', '$newName');
                      }
                    ''');

                    // Show success message
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Furniture renamed to "$newName"'),
                          backgroundColor: Colors.green,
                        ),
                      );
                    }
                  } catch (e) {
                    print('Error renaming furniture: $e');
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Error renaming furniture: $e'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                }
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }

  /// Show sort criteria selection dialog for furniture/path auto-sort
  Future<void> _showSortCriteriaDialog(
    String objectId,
    bool isFurniture,
  ) async {
    final List<Map<String, String>> sortOptions = [
      {'value': 'fileName', 'label': 'File Name'},
      {'value': 'fileType', 'label': 'File Type'},
      {'value': 'artist', 'label': 'Artist'},
      {'value': 'title', 'label': 'Title'},
      {'value': 'date', 'label': 'Date'},
    ];

    // Get current sort settings
    String? currentCriteria;
    String? currentDirection;
    try {
      final result = await webViewController.runJavaScriptReturningResult('''
        (function() {
          const manager = ${isFurniture ? 'window.app?.furnitureManager' : 'window.app?.pathManager'};
          if (!manager) return null;
          
          const obj = manager.storageManager.${isFurniture ? 'getFurniture' : 'getPath'}('$objectId');
          if (!obj) return null;
          
          return {
            sortCriteria: obj.sortCriteria || 'fileName',
            sortDirection: obj.sortDirection || 'ascending'
          };
        })();
      ''');

      if (result != null && result.toString() != 'null') {
        final Map<String, dynamic> data = jsonDecode(result.toString());
        currentCriteria = data['sortCriteria'] as String?;
        currentDirection = data['sortDirection'] as String?;
      }
    } catch (e) {
      print("Error getting sort settings: $e");
      currentCriteria = 'fileName';
      currentDirection = 'ascending';
    }

    return showDialog<void>(
      context: context,
      builder: (BuildContext dialogContext) {
        String selectedCriteria = currentCriteria ?? 'fileName';
        String selectedDirection = currentDirection ?? 'ascending';

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Sort Settings'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Sort By:',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  ...sortOptions.map((option) {
                    return RadioListTile<String>(
                      title: Text(option['label']!),
                      value: option['value']!,
                      groupValue: selectedCriteria,
                      contentPadding: EdgeInsets.zero,
                      onChanged: (String? value) {
                        if (value != null) {
                          setState(() {
                            selectedCriteria = value;
                          });
                        }
                      },
                    );
                  }),
                  const SizedBox(height: 16),
                  const Text(
                    'Direction:',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  RadioListTile<String>(
                    title: const Text('Ascending'),
                    value: 'ascending',
                    groupValue: selectedDirection,
                    contentPadding: EdgeInsets.zero,
                    onChanged: (String? value) {
                      if (value != null) {
                        setState(() {
                          selectedDirection = value;
                        });
                      }
                    },
                  ),
                  RadioListTile<String>(
                    title: const Text('Descending'),
                    value: 'descending',
                    groupValue: selectedDirection,
                    contentPadding: EdgeInsets.zero,
                    onChanged: (String? value) {
                      if (value != null) {
                        setState(() {
                          selectedDirection = value;
                        });
                      }
                    },
                  ),
                ],
              ),
              actions: <Widget>[
                TextButton(
                  onPressed: () {
                    Navigator.of(dialogContext).pop();
                  },
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () async {
                    Navigator.of(dialogContext).pop();

                    // Update sort settings in JavaScript
                    try {
                      await webViewController.runJavaScript('''
                        (function() {
                          const manager = ${isFurniture ? 'window.app?.furnitureManager' : 'window.app?.pathManager'};
                          if (!manager) return;
                          
                          const obj = manager.storageManager.${isFurniture ? 'getFurniture' : 'getPath'}('$objectId');
                          if (!obj) return;
                          
                          obj.sortCriteria = '$selectedCriteria';
                          obj.sortDirection = '$selectedDirection';
                          manager.storageManager.${isFurniture ? 'updateFurniture' : 'updatePath'}(obj);
                          
                          // Trigger re-sort with new criteria
                          manager.${isFurniture ? 'sortFurniture' : 'sortPathObjects'}('$objectId');
                        })();
                      ''');

                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Sort updated: ${sortOptions.firstWhere((o) => o['value'] == selectedCriteria)['label']} ($selectedDirection)',
                            ),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      }
                    } catch (e) {
                      print("Error updating sort settings: $e");
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Error updating sort settings: $e'),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    }
                  },
                  child: const Text('Apply'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  /// Show dialog to select furniture for placing object
  Future<void> _showAddToFurnitureDialog(
    String objectId,
    String objectName,
  ) async {
    try {
      // Get all furniture from JavaScript
      final result = await webViewController.runJavaScriptReturningResult('''
        (function() {
          if (window.app && window.app.furnitureManager) {
            const allFurniture = window.app.furnitureManager.getAllFurniture();
            const furnitureData = allFurniture.map(f => ({
              id: f.id,
              name: f.name,
              type: f.type,
              capacity: f.capacity,
              occupiedSlots: f.objectIds.filter(id => id !== null && id !== '').length
            }));
            return JSON.stringify(furnitureData);
          }
          return JSON.stringify([]);
        })();
      ''');

      if (result == null) return;

      final decoded = jsonDecode(result.toString());
      final List<Map<String, dynamic>> furnitureList = decoded is String
          ? List<Map<String, dynamic>>.from(jsonDecode(decoded))
          : List<Map<String, dynamic>>.from(decoded);

      if (!mounted) return;

      if (furnitureList.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No furniture available. Add furniture from Options menu first.',
            ),
            duration: Duration(seconds: 3),
          ),
        );
        return;
      }

      // Show furniture selection dialog
      await showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text('Add "$objectName" to...'),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: furnitureList.length,
              itemBuilder: (context, index) {
                final furniture = furnitureList[index];
                final name = furniture['name'] ?? 'Unnamed';
                final type = furniture['type'] ?? 'furniture';
                final capacity = furniture['capacity'] ?? 0;
                final occupied = furniture['occupiedSlots'] ?? 0;
                final available = capacity - occupied;

                return ListTile(
                  leading: const Icon(Icons.weekend, color: Colors.blueAccent),
                  title: Text(name),
                  subtitle: Text(
                    '$occupied/$capacity slots - $available available',
                  ),
                  enabled: available > 0,
                  onTap: available > 0
                      ? () async {
                          Navigator.of(dialogContext).pop();
                          await _addObjectToFurniture(
                            furniture['id'],
                            objectId,
                            objectName,
                          );
                        }
                      : null,
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel'),
            ),
          ],
        ),
      );

      // CRITICAL: Re-enable camera controls AFTER dialog closes
      await webViewController.runJavaScript('''
        if (window.app && window.app.cameraControls) {
          window.app.cameraControls.enabled = true;
          console.log('📷 Camera controls re-enabled after furniture dialog closed');
        } else {
          console.error('❌ Cannot re-enable camera: app=' + (typeof window.app) + ', cameraControls=' + (window.app ? typeof window.app.cameraControls : 'N/A'));
        }
      ''');
    } catch (e) {
      print('Error showing add to furniture dialog: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  /// Add object to furniture
  Future<void> _addObjectToFurniture(
    String furnitureId,
    String objectId,
    String objectName,
  ) async {
    try {
      // Call JavaScript to add object to furniture
      await webViewController.runJavaScript('''
        (async function() {
          if (window.app && window.app.furnitureManager) {
            const furniture = window.app.furnitureManager.getFurniture('$furnitureId');
            if (!furniture) {
              console.error('Furniture not found: $furnitureId');
              return;
            }
            
            // Find the file object
            const fileObject = window.app.stateManager.fileObjects.find(
              obj => obj.userData.id === '$objectId' || obj.userData.fileId === '$objectId'
            );
            
            if (!fileObject) {
              console.error('File object not found: $objectId');
              return;
            }
            
            // CRITICAL FIX: Mark object as manually placed by user (not API-generated)
            // This ensures it will be preserved during refresh operations
            fileObject.userData.manuallyPlaced = true;
            console.log('🔄 Marked object $objectId as manually placed - will be preserved during refresh');
            
            // Add to furniture (will auto-snap to next available slot)
            // CRITICAL: Pass objectId string, not the mesh object
            // skipAutoSort=true to prevent displacing existing objects
            const slotIndex = await window.app.furnitureManager.addObjectToFurniture(
              '$furnitureId',
              fileObject.userData.id,
              true  // skipAutoSort - don't rearrange existing objects
            );
            
            // CRITICAL: Check >= 0 because slot 0 is valid but falsy!
            if (slotIndex >= 0) {
              console.log('✅ Added $objectName to furniture $furnitureId at slot ' + slotIndex);
            } else {
              console.error('❌ Failed to add $objectName to furniture (slot: ' + slotIndex + ')');
            }
          }
        })();
      ''');

      // CRITICAL: Re-enable camera controls after JavaScript completes
      await webViewController.runJavaScript(
        '''\n        if (window.app && window.app.cameraControls) {\n          window.app.cameraControls.enabled = true;\n          console.log('📷 Camera controls re-enabled after furniture operation');\n        } else {\n          console.error('❌ Cannot re-enable: app=' + (typeof window.app) + ', cameraControls=' + (window.app ? typeof window.app.cameraControls : 'N/A'));\n        }\n      ''',
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Added "$objectName" to furniture'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      print('Error adding object to furniture: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  /// Share furniture from long press menu
  Future<void> _shareFurnitureFromLongPress(
    String furnitureId,
    String furnitureName,
  ) async {
    try {
      // Show share dialog IMMEDIATELY with loading state
      // This provides instant feedback instead of 10-second delay
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => _ShareFurnitureDialog(
          furnitureId: furnitureId,
          furnitureName: furnitureName,
          webViewController: webViewController,
          onComplete: () {
            // Re-enable camera controls when dialog is dismissed
            print('🎯 Re-enabling camera controls after share...');
            webViewController
                .runJavaScript('''
              (function() {
                if (window.app && window.app.cameraControls) {
                  window.app.cameraControls.enabled = true;
                  console.log('✅ Camera controls re-enabled after share');
                }
              })();
            ''')
                .catchError((e) => print('❌ Failed to re-enable controls: $e'));
          },
        ),
      );
    } catch (error) {
      print('❌ Error showing share dialog: $error');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Share failed: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// LEGACY CODE - kept for reference but replaced by _ShareFurnitureDialog
  /// Share furniture from long press menu (OLD - synchronous version)
  Future<void> _shareFurnitureFromLongPressOLD(
    String furnitureId,
    String furnitureName,
  ) async {
    try {
      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      // Call JavaScript share function
      print('🔍 [FLUTTER] Calling shareFurniture for: $furnitureId');
      final result = await webViewController.runJavaScriptReturningResult('''
        (function() {
          console.log('🔍 [JS] shareFurniture IIFE called');
          if (window.app && window.app.shareManager) {
            console.log('🔍 [JS] shareManager exists, calling shareFurniture');
            const result = window.app.shareManager.shareFurniture('$furnitureId');
            console.log('🔍 [JS] shareFurniture returned:', result);
            const jsonResult = JSON.stringify(result);
            console.log('🔍 [JS] JSON stringified result:', jsonResult);
            return jsonResult;
          }
          console.log('🔍 [JS] shareManager NOT available!');
          return JSON.stringify({ error: 'Share manager not available' });
        })();
      ''');
      print(
        '🔍 [FLUTTER] JavaScript returned, result is null: ${result == null}',
      );
      print('🔍 [FLUTTER] Result type: ${result.runtimeType}');
      print('🔍 [FLUTTER] Result value: $result');

      if (mounted) {
        Navigator.pop(context); // Dismiss loading

        if (result != null) {
          print('🔍 [FLUTTER] Raw result from JavaScript: $result');

          try {
            // Parse JSON - JavaScript returns JSON.stringify'd result, need to decode
            // First decode: Gets us the JSON string from JavaScript
            var decoded = jsonDecode(result.toString());
            print('🔍 [FLUTTER] First decode type: ${decoded.runtimeType}');

            // If it's still a String, it was double-encoded, decode again
            if (decoded is String) {
              print(
                '🔍 [FLUTTER] Double-encoded JSON detected, decoding again...',
              );
              decoded = jsonDecode(decoded);
              print('🔍 [FLUTTER] Second decode type: ${decoded.runtimeType}');
            }

            print(
              '🔍 [FLUTTER] Final decoded keys: ${decoded is Map ? decoded.keys.toList() : "NOT A MAP"}',
            );
            print('🔍 [FLUTTER] Final decoded JSON: $decoded');

            if (decoded is! Map) {
              print(
                '❌ [FLUTTER] ERROR: decoded is not a Map, it is ${decoded.runtimeType}',
              );
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Share failed: Invalid response format'),
                  backgroundColor: Colors.red,
                ),
              );
              return;
            }

            if (decoded['error'] != null) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Share failed: ${decoded["error"]}'),
                  backgroundColor: Colors.red,
                ),
              );
              return;
            }

            final shareUrl = decoded['url'] as String? ?? '';
            print(
              '🔍 [FLUTTER] Share URL extracted: ${shareUrl.length} characters',
            );

            // Stats might be missing, handle gracefully
            final stats = decoded['stats'];
            print(
              '🔍 [FLUTTER] Stats value: $stats (type: ${stats.runtimeType})',
            );

            int totalObjects = 0;
            int excludedCount = 0;

            if (stats is Map) {
              // Handle both int and String types from JSON
              final totalObjectsRaw = stats['totalObjects'];
              totalObjects = totalObjectsRaw is int
                  ? totalObjectsRaw
                  : (totalObjectsRaw is String
                        ? int.tryParse(totalObjectsRaw) ?? 0
                        : 0);

              final excludedCountRaw = stats['excludedLocalMedia'];
              excludedCount = excludedCountRaw is int
                  ? excludedCountRaw
                  : (excludedCountRaw is String
                        ? int.tryParse(excludedCountRaw) ?? 0
                        : 0);
            } else {
              print(
                '⚠️ [FLUTTER] No stats object found in response, using defaults',
              );
            }

            print('🔍 [FLUTTER] Total objects: $totalObjects');
            print('🔍 [FLUTTER] Share URL: ${shareUrl.substring(0, 100)}...');

            // Upload data to paste service - try multiple services in parallel for reliability
            String shareableUrl = '';
            String errorMessage = '';
            String serviceName = '';

            print('📤 Uploading furniture data to paste services...');
            print('📤 Data size: ${shareUrl.length} characters');

            // Try GitHub Gist first, then Hastebin as backup
            try {
              Map<String, dynamic> gistResult = await _uploadToGitHubGist(
                shareUrl,
              );

              List<Map<String, dynamic>> uploadResults = [gistResult];

              // If GitHub Gist failed, try Hastebin
              if (gistResult['success'] != true) {
                print('📤 GitHub Gist failed, trying Hastebin...');
                Map<String, dynamic> hastebinResult = await _uploadToHastebin(
                  shareUrl,
                );
                uploadResults.add(hastebinResult);
              }

              // Find first successful upload
              for (final uploadRes in uploadResults) {
                if (uploadRes['success'] == true && uploadRes['url'] != null) {
                  shareableUrl = uploadRes['url'] as String;
                  serviceName = uploadRes['service'] as String;
                  print('✅ Upload successful via $serviceName: $shareableUrl');
                  break;
                }
              }

              if (shareableUrl.isEmpty) {
                // All services failed - collect error messages
                final errors = uploadResults
                    .where((r) => r['error'] != null)
                    .map((r) => '${r["service"]}: ${r["error"]}')
                    .join(', ');
                throw Exception('All paste services failed. $errors');
              }
            } catch (e) {
              print('❌ Upload error: $e');
              errorMessage =
                  'Unable to create shareable link. The upload service may be temporarily unavailable. $e';
              shareableUrl = '';
            }

            // Copy shareable URL to clipboard if successful
            if (shareableUrl.isNotEmpty) {
              await Clipboard.setData(ClipboardData(text: shareableUrl));
              print('📋 Copied shareable URL to clipboard: $shareableUrl');
            }

            // Show error dialog if upload failed
            if (shareableUrl.isEmpty) {
              print('❌ Upload failed - showing error dialog');
              if (mounted) {
                await showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Row(
                      children: [
                        Icon(Icons.error_outline, color: Colors.red),
                        SizedBox(width: 8),
                        Text('Share Failed'),
                      ],
                    ),
                    content: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Unable to create shareable link.',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'All paste services are currently unavailable. This is usually temporary.',
                          style: TextStyle(fontSize: 14),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'What you can try:',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          '• Wait a minute and try again\n'
                          '• Check your internet connection\n'
                          '• Try sharing a different furniture',
                          style: TextStyle(fontSize: 12),
                        ),
                        if (errorMessage.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          const Text(
                            'Technical details:',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            errorMessage,
                            style: const TextStyle(
                              fontSize: 10,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                        const SizedBox(height: 12),
                        Text(
                          'Furniture: $furnitureName',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          'Objects: $totalObjects',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Close'),
                      ),
                    ],
                  ),
                );
              }
              // Re-enable camera controls after error dialog
              print('🎯 Re-enabling camera controls after error...');
              try {
                await webViewController.runJavaScript('''
                  (function() {
                    if (window.app && window.app.cameraControls) {
                      window.app.cameraControls.enabled = true;
                      console.log('✅ Camera controls re-enabled after error');
                    }
                  })();
                ''');
              } catch (e) {
                print('❌ Failed to re-enable controls: $e');
              }
              return;
            }

            // Show success message
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('✓ Shareable link created via $serviceName!'),
                  backgroundColor: Colors.green,
                  duration: const Duration(seconds: 2),
                ),
              );
            }

            // Show share dialog and re-enable controls when dismissed
            await showDialog(
              context: context,
              barrierDismissible: true,
              builder: (context) => AlertDialog(
                title: const Row(
                  children: [
                    Icon(Icons.share, color: Colors.blue),
                    SizedBox(width: 8),
                    Text('Share Furniture'),
                  ],
                ),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Share "$furnitureName" with others!'),
                    const SizedBox(height: 16),
                    Text(
                      'Total Objects: $totalObjects',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    if (excludedCount > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Note: $excludedCount local file${excludedCount == 1 ? '' : 's'} excluded (recipients cannot access local MP3/MP4 files)',
                          style: const TextStyle(
                            color: Colors.orange,
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close'),
                  ),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.share),
                    label: const Text('Share'),
                    onPressed: () async {
                      try {
                        await Share.share(
                          'Hi! Check out my "$furnitureName" 3D furniture:\n\n'
                          '$shareableUrl\n\n'
                          'Made with FirstTaps MV3D\n'
                          'www.firsttaps.com',
                          subject: '$furnitureName from FirstTaps MV3D',
                        );
                      } catch (e) {
                        print('❌ Share failed: $e');
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Share error: $e'),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      }
                    },
                  ),
                ],
              ),
            );

            // Re-enable camera controls after dialog closes
            print('🎯 Re-enabling camera controls...');
            try {
              await webViewController.runJavaScript('''
                (function() {
                  console.log('🎯 [CAMERA FIX] Re-enable script started');
                  
                  // Camera controls are stored in window.app.cameraControls
                  if (window.app && window.app.cameraControls) {
                    window.app.cameraControls.enabled = true;
                    console.log('✅ [CAMERA FIX] window.app.cameraControls.enabled = true');
                  } else if (window.controls) {
                    // Fallback to window.controls if it exists
                    window.controls.enabled = true;
                    console.log('✅ [CAMERA FIX] window.controls.enabled = true');
                  } else {
                    console.warn('⚠️ [CAMERA FIX] Neither window.app.cameraControls nor window.controls found');
                  }
                  
                  // Also check if we need to update the OrbitControls state
                  if (window.THREE && window.scene) {
                    console.log('✅ [CAMERA FIX] THREE and scene available');
                  }
                })();
              ''');
              print('✅ Control re-enable script executed');
            } catch (e) {
              print('❌ Failed to re-enable controls: $e');
            }
          } catch (e, stackTrace) {
            print('❌ Error parsing share result: $e');
            print('Stack trace: $stackTrace');
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to generate share link: $e'),
                backgroundColor: Colors.red,
              ),
            );
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to generate share link'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e, stackTrace) {
      print('❌ Exception in _shareFurnitureFromLongPress: $e');
      print('Stack trace: $stackTrace');
      if (mounted) {
        Navigator.pop(context); // Dismiss loading if still showing
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  /// Upload to ix.io (simple, automation-friendly service)
  Future<Map<String, dynamic>> _uploadToIxIo(String content) async {
    try {
      print('📤 Trying ix.io...');
      print('📤 Data size: ${content.length} bytes');

      final response = await http
          .post(
            Uri.parse('http://ix.io'),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: {'f:1': content},
          )
          .timeout(const Duration(seconds: 15));

      print('📤 ix.io response: ${response.statusCode}');

      if (response.statusCode == 200) {
        print('📤 Response body: ${response.body}');
        // ix.io returns the full URL: http://ix.io/ABCD
        final pasteUrl = response.body.trim();
        final pasteId = pasteUrl.split('/').last;
        const viewerBaseUrl = 'https://share.firsttaps.com/';
        final shareUrl = '$viewerBaseUrl?ixio=$pasteId';

        print('✅ ix.io succeeded: $shareUrl');
        print('✅ Paste ID: $pasteId');
        print('✅ Verify at: http://ix.io/$pasteId');
        return {'success': true, 'url': shareUrl, 'service': 'ix.io'};
      }

      print('⚠️ ix.io failed: HTTP ${response.statusCode}');
      print('⚠️ Response body: ${response.body}');
      return {
        'success': false,
        'error': 'HTTP ${response.statusCode}: ${response.body}',
        'service': 'ix.io',
      };
    } catch (e) {
      print('⚠️ ix.io error: $e');
      return {'success': false, 'error': e.toString(), 'service': 'ix.io'};
    }
  }

  /// Upload to rentry.co (CORS-enabled, clean API)
  Future<Map<String, dynamic>> _uploadToRentry(String content) async {
    try {
      print('📤 Trying rentry.co...');
      print('📤 Data size: ${content.length} bytes');

      // rentry.co requires application/x-www-form-urlencoded, NOT multipart
      final response = await http
          .post(
            Uri.parse('https://rentry.co/api/new'),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: {'text': content},
          )
          .timeout(const Duration(seconds: 15));

      print('📤 rentry.co response: ${response.statusCode}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('📤 Response body: ${response.body}');
        final data = jsonDecode(response.body);
        final pasteUrl = data['url'] as String;
        // Extract paste ID from URL: https://rentry.co/ABCD
        final pasteId = pasteUrl.split('/').last;
        const viewerBaseUrl = 'https://share.firsttaps.com/';
        final shareUrl = '$viewerBaseUrl?rentry=$pasteId';

        print('✅ rentry.co succeeded: $shareUrl');
        print('✅ Paste ID: $pasteId');
        print('✅ Verify at: https://rentry.co/$pasteId/raw');
        return {'success': true, 'url': shareUrl, 'service': 'rentry.co'};
      }

      print('⚠️ rentry.co failed: HTTP ${response.statusCode}');
      print('⚠️ Response body: ${response.body}');
      return {
        'success': false,
        'error': 'HTTP ${response.statusCode}: ${response.body}',
        'service': 'rentry.co',
      };
    } catch (e) {
      print('⚠️ rentry.co error: $e');
      return {'success': false, 'error': e.toString(), 'service': 'rentry.co'};
    }
  }

  /// Upload to GitHub Gist (with authentication)
  Future<Map<String, dynamic>> _uploadToGitHubGist(String content) async {
    try {
      print('📤 Trying GitHub Gist (authenticated)...');
      print('📤 Data size: ${content.length} bytes');

      // Check if token is configured
      if (ApiKeys.githubToken.isEmpty ||
          ApiKeys.githubToken == 'YOUR_GITHUB_TOKEN_HERE') {
        print('⚠️ GitHub token not configured, skipping...');
        return {
          'success': false,
          'error': 'GitHub token not configured',
          'service': 'GitHub Gist',
        };
      }

      final response = await http
          .post(
            Uri.parse('https://api.github.com/gists'),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github+json',
              'Authorization': 'Bearer ${ApiKeys.githubToken}',
            },
            body: jsonEncode({
              'description': 'FirstTaps MV3D Furniture Share',
              'public': true,
              'files': {
                'furniture.txt': {'content': content},
              },
            }),
          )
          .timeout(const Duration(seconds: 20));

      print('📤 GitHub Gist response: ${response.statusCode}');

      if (response.statusCode == 201) {
        print('📤 Response body: ${response.body}');
        final data = jsonDecode(response.body);
        final gistId = data['id'] as String;
        const viewerBaseUrl = 'https://share.firsttaps.com/';
        final shareUrl = '$viewerBaseUrl?gist=$gistId';

        print('✅ GitHub Gist succeeded: $shareUrl');
        print('✅ Gist ID: $gistId');
        print('✅ Verify at: https://gist.github.com/$gistId');
        return {'success': true, 'url': shareUrl, 'service': 'GitHub Gist'};
      }

      print('⚠️ GitHub Gist failed: HTTP ${response.statusCode}');
      print('⚠️ Response body: ${response.body}');
      return {
        'success': false,
        'error': 'HTTP ${response.statusCode}: ${response.body}',
        'service': 'GitHub Gist',
      };
    } catch (e) {
      print('⚠️ GitHub Gist error: $e');
      return {
        'success': false,
        'error': e.toString(),
        'service': 'GitHub Gist',
      };
    }
  }

  /// Upload to Hastebin (simple, reliable backup)
  Future<Map<String, dynamic>> _uploadToHastebin(String content) async {
    try {
      print('📤 Trying Hastebin...');
      print('📤 Data size: ${content.length} bytes');

      final response = await http
          .post(
            Uri.parse('https://hastebin.com/documents'),
            headers: {'Content-Type': 'text/plain'},
            body: content,
          )
          .timeout(const Duration(seconds: 15));

      print('📤 Hastebin response: ${response.statusCode}');

      if (response.statusCode == 200) {
        print('📤 Response body: ${response.body}');
        final data = jsonDecode(response.body);
        final pasteKey = data['key'] as String;
        const viewerBaseUrl = 'https://share.firsttaps.com/';
        final shareUrl = '$viewerBaseUrl?hastebin=$pasteKey';

        print('✅ Hastebin succeeded: $shareUrl');
        print('✅ Paste key: $pasteKey');
        print('✅ Verify at: https://hastebin.com/raw/$pasteKey');
        return {'success': true, 'url': shareUrl, 'service': 'Hastebin'};
      }

      print('⚠️ Hastebin failed: HTTP ${response.statusCode}');
      print('⚠️ Response body: ${response.body}');
      return {
        'success': false,
        'error': 'HTTP ${response.statusCode}: ${response.body}',
        'service': 'Hastebin',
      };
    } catch (e) {
      print('⚠️ Hastebin error: $e');
      return {'success': false, 'error': e.toString(), 'service': 'Hastebin'};
    }
  }
}

/// Stateful dialog for sharing furniture - shows loading initially, updates when ready
class _ShareFurnitureDialog extends StatefulWidget {
  final String furnitureId;
  final String furnitureName;
  final WebViewController webViewController;
  final VoidCallback onComplete;

  const _ShareFurnitureDialog({
    required this.furnitureId,
    required this.furnitureName,
    required this.webViewController,
    required this.onComplete,
  });

  @override
  State<_ShareFurnitureDialog> createState() => _ShareFurnitureDialogState();
}

class _ShareFurnitureDialogState extends State<_ShareFurnitureDialog> {
  bool _isLoading = true;
  String? _shareUrl;
  String? _errorMessage;
  int _totalObjects = 0;
  int _excludedCount = 0;
  String _serviceName = '';
  String _progressMessage = 'Generating share link...';

  @override
  void initState() {
    super.initState();
    _generateShareLink();
  }

  Future<void> _generateShareLink() async {
    try {
      setState(() {
        _progressMessage = 'Serializing furniture objects...';
      });

      // Call JavaScript share function
      print('🔍 [FLUTTER] Calling shareFurniture for: ${widget.furnitureId}');
      final result = await widget.webViewController
          .runJavaScriptReturningResult('''
        (function() {
          console.log('🔍 [JS] shareFurniture IIFE called');
          if (window.app && window.app.shareManager) {
            console.log('🔍 [JS] shareManager exists, calling shareFurniture');
            const result = window.app.shareManager.shareFurniture('${widget.furnitureId}');
            console.log('🔍 [JS] shareFurniture returned:', result);
            const jsonResult = JSON.stringify(result);
            console.log('🔍 [JS] JSON stringified result:', jsonResult);
            return jsonResult;
          }
          console.log('🔍 [JS] shareManager NOT available!');
          return JSON.stringify({ error: 'Share manager not available' });
        })();
      ''');

      if (!mounted) return;

      setState(() {
        _progressMessage = 'Uploading to share service...';
      });

      if (result != null) {
        print('🔍 [FLUTTER] Raw result from JavaScript: $result');

        try {
          // Parse JSON - JavaScript returns JSON.stringify'd result, need to decode
          var decoded = jsonDecode(result.toString());

          // If it's still a String, it was double-encoded, decode again
          if (decoded is String) {
            decoded = jsonDecode(decoded);
          }

          if (decoded is! Map) {
            throw Exception('Invalid response format');
          }

          if (decoded['error'] != null) {
            throw Exception(decoded['error']);
          }

          final shareData = decoded['url'] as String? ?? '';
          final stats = decoded['stats'];

          if (stats is Map) {
            final totalObjectsRaw = stats['totalObjects'];
            _totalObjects = totalObjectsRaw is int
                ? totalObjectsRaw
                : (totalObjectsRaw is String
                      ? int.tryParse(totalObjectsRaw) ?? 0
                      : 0);

            final excludedCountRaw = stats['excludedLocalMedia'];
            _excludedCount = excludedCountRaw is int
                ? excludedCountRaw
                : (excludedCountRaw is String
                      ? int.tryParse(excludedCountRaw) ?? 0
                      : 0);
          }

          print('📤 Upload furniture data to paste services...');
          print('📤 Data size: ${shareData.length} characters');

          // Try GitHub Gist first, then Hastebin as backup
          Map<String, dynamic> gistResult = await _uploadToGitHubGist(
            shareData,
          );

          List<Map<String, dynamic>> uploadResults = [gistResult];

          // If GitHub Gist failed, try Hastebin
          if (gistResult['success'] != true) {
            print('📤 GitHub Gist failed, trying Hastebin...');
            Map<String, dynamic> hastebinResult = await _uploadToHastebin(
              shareData,
            );
            uploadResults.add(hastebinResult);
          }

          // Find first successful upload
          for (final uploadRes in uploadResults) {
            if (uploadRes['success'] == true && uploadRes['url'] != null) {
              _shareUrl = uploadRes['url'] as String;
              _serviceName = uploadRes['service'] as String;
              print('✅ Upload successful via $_serviceName: $_shareUrl');
              break;
            }
          }

          if (_shareUrl == null || _shareUrl!.isEmpty) {
            final errors = uploadResults
                .where((r) => r['error'] != null)
                .map((r) => '${r["service"]}: ${r["error"]}')
                .join(', ');
            throw Exception('All paste services failed. $errors');
          }

          // Copy to clipboard
          await Clipboard.setData(ClipboardData(text: _shareUrl!));
          print('📋 Copied shareable URL to clipboard: $_shareUrl');

          if (mounted) {
            setState(() {
              _isLoading = false;
            });
          }
        } catch (e) {
          if (mounted) {
            setState(() {
              _isLoading = false;
              _errorMessage = e.toString();
            });
          }
        }
      } else {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = 'No response from JavaScript';
          });
        }
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = error.toString();
        });
      }
    }
  }

  // Helper methods for uploading (same as in the mixin)
  /// Upload to ix.io (simple, automation-friendly service)
  Future<Map<String, dynamic>> _uploadToIxIo(String content) async {
    try {
      print('📤 Trying ix.io...');
      print('📤 Data size: ${content.length} bytes');

      final response = await http
          .post(
            Uri.parse('http://ix.io'),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: {'f:1': content},
          )
          .timeout(const Duration(seconds: 15));

      print('📤 ix.io response: ${response.statusCode}');

      if (response.statusCode == 200) {
        print('📤 Response body: ${response.body}');
        // ix.io returns the full URL: http://ix.io/ABCD
        final pasteUrl = response.body.trim();
        final pasteId = pasteUrl.split('/').last;
        const viewerBaseUrl = 'https://share.firsttaps.com/';
        final shareUrl = '$viewerBaseUrl?ixio=$pasteId';

        print('✅ ix.io succeeded: $shareUrl');
        print('✅ Paste ID: $pasteId');
        print('✅ Verify at: http://ix.io/$pasteId');
        return {'success': true, 'url': shareUrl, 'service': 'ix.io'};
      }

      print('⚠️ ix.io failed: HTTP ${response.statusCode}');
      print('⚠️ Response body: ${response.body}');
      return {
        'success': false,
        'error': 'HTTP ${response.statusCode}: ${response.body}',
        'service': 'ix.io',
      };
    } catch (e) {
      print('⚠️ ix.io error: $e');
      return {'success': false, 'error': e.toString(), 'service': 'ix.io'};
    }
  }

  /// Upload to GitHub Gist (with authentication)
  Future<Map<String, dynamic>> _uploadToGitHubGist(String content) async {
    try {
      print('📤 Trying GitHub Gist (authenticated)...');
      print('📤 Data size: ${content.length} bytes');

      // Check if token is configured
      if (ApiKeys.githubToken.isEmpty ||
          ApiKeys.githubToken == 'YOUR_GITHUB_TOKEN_HERE') {
        print('⚠️ GitHub token not configured, skipping...');
        return {
          'success': false,
          'error': 'GitHub token not configured',
          'service': 'GitHub Gist',
        };
      }

      final response = await http
          .post(
            Uri.parse('https://api.github.com/gists'),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github+json',
              'Authorization': 'Bearer ${ApiKeys.githubToken}',
            },
            body: jsonEncode({
              'description': 'FirstTaps MV3D Furniture Share',
              'public': true,
              'files': {
                'furniture.txt': {'content': content},
              },
            }),
          )
          .timeout(const Duration(seconds: 20));

      print('📤 GitHub Gist response: ${response.statusCode}');

      if (response.statusCode == 201) {
        print('📤 Response body: ${response.body}');
        final data = jsonDecode(response.body);
        final gistId = data['id'] as String;
        const viewerBaseUrl = 'https://share.firsttaps.com/';
        final shareUrl = '$viewerBaseUrl?gist=$gistId';

        print('✅ GitHub Gist succeeded: $shareUrl');
        print('✅ Gist ID: $gistId');
        print('✅ Verify at: https://gist.github.com/$gistId');
        return {'success': true, 'url': shareUrl, 'service': 'GitHub Gist'};
      }

      print('⚠️ GitHub Gist failed: HTTP ${response.statusCode}');
      print('⚠️ Response body: ${response.body}');
      return {
        'success': false,
        'error': 'HTTP ${response.statusCode}: ${response.body}',
        'service': 'GitHub Gist',
      };
    } catch (e) {
      print('⚠️ GitHub Gist error: $e');
      return {
        'success': false,
        'error': e.toString(),
        'service': 'GitHub Gist',
      };
    }
  }

  /// Upload to rentry.co (CORS-enabled, clean API)
  Future<Map<String, dynamic>> _uploadToRentry(String content) async {
    try {
      print('📤 Trying rentry.co...');
      print('📤 Data size: ${content.length} bytes');

      // rentry.co requires application/x-www-form-urlencoded, NOT multipart
      final response = await http
          .post(
            Uri.parse('https://rentry.co/api/new'),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: {'text': content},
          )
          .timeout(const Duration(seconds: 15));

      print('📤 rentry.co response: ${response.statusCode}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('📤 Response body: ${response.body}');
        final data = jsonDecode(response.body);
        final pasteUrl = data['url'] as String;
        // Extract paste ID from URL: https://rentry.co/ABCD
        final pasteId = pasteUrl.split('/').last;
        const viewerBaseUrl = 'https://share.firsttaps.com/';
        final shareUrl = '$viewerBaseUrl?rentry=$pasteId';

        print('✅ rentry.co succeeded: $shareUrl');
        print('✅ Paste ID: $pasteId');
        print('✅ Verify at: https://rentry.co/$pasteId/raw');
        return {'success': true, 'url': shareUrl, 'service': 'rentry.co'};
      }

      print('⚠️ rentry.co failed: HTTP ${response.statusCode}');
      print('⚠️ Response body: ${response.body}');
      return {
        'success': false,
        'error': 'HTTP ${response.statusCode}: ${response.body}',
        'service': 'rentry.co',
      };
    } catch (e) {
      print('⚠️ rentry.co error: $e');
      return {'success': false, 'error': e.toString(), 'service': 'rentry.co'};
    }
  }

  /// Upload to Hastebin (simple, reliable backup)
  Future<Map<String, dynamic>> _uploadToHastebin(String content) async {
    try {
      print('📤 Trying Hastebin...');
      print('📤 Data size: ${content.length} bytes');

      final response = await http
          .post(
            Uri.parse('https://hastebin.com/documents'),
            headers: {'Content-Type': 'text/plain'},
            body: content,
          )
          .timeout(const Duration(seconds: 15));

      print('📤 Hastebin response: ${response.statusCode}');

      if (response.statusCode == 200) {
        print('📤 Response body: ${response.body}');
        final data = jsonDecode(response.body);
        final pasteKey = data['key'] as String;
        const viewerBaseUrl = 'https://share.firsttaps.com/';
        final shareUrl = '$viewerBaseUrl?hastebin=$pasteKey';

        print('✅ Hastebin succeeded: $shareUrl');
        print('✅ Paste key: $pasteKey');
        print('✅ Verify at: https://hastebin.com/raw/$pasteKey');
        return {'success': true, 'url': shareUrl, 'service': 'Hastebin'};
      }

      print('⚠️ Hastebin failed: HTTP ${response.statusCode}');
      print('⚠️ Response body: ${response.body}');
      return {
        'success': false,
        'error': 'HTTP ${response.statusCode}: ${response.body}',
        'service': 'Hastebin',
      };
    } catch (e) {
      print('⚠️ Hastebin error: $e');
      return {'success': false, 'error': e.toString(), 'service': 'Hastebin'};
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(
            _isLoading
                ? Icons.share
                : (_errorMessage != null
                      ? Icons.error_outline
                      : Icons.check_circle),
            color: _isLoading
                ? Colors.blue
                : (_errorMessage != null ? Colors.red : Colors.green),
          ),
          const SizedBox(width: 8),
          const Text('Share Furniture'),
        ],
      ),
      content: _buildContent(),
      actions: _buildActions(),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(_progressMessage),
          const SizedBox(height: 8),
          Text(
            'Furniture: ${widget.furnitureName}',
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      );
    }

    if (_errorMessage != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Share Failed',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.red,
            ),
          ),
          const SizedBox(height: 12),
          Text(_errorMessage!),
          const SizedBox(height: 12),
          const Text(
            'What you can try:',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          const SizedBox(height: 4),
          const Text(
            '• Wait a minute and try again\n'
            '• Check your internet connection\n'
            '• Try sharing a different furniture',
            style: TextStyle(fontSize: 12),
          ),
        ],
      );
    }

    // Success state
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Share "${widget.furnitureName}" with others!'),
        const SizedBox(height: 16),
        Text(
          'Total Objects: $_totalObjects',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        if (_excludedCount > 0)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Note: $_excludedCount local file${_excludedCount == 1 ? '' : 's'} excluded',
              style: const TextStyle(color: Colors.orange, fontSize: 12),
            ),
          ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.green.withOpacity(0.1),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: Colors.green),
          ),
          child: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Link copied to clipboard! (via $_serviceName)',
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _buildActions() {
    if (_isLoading) {
      return []; // No actions while loading
    }

    return [
      if (_shareUrl != null) ...[
        TextButton.icon(
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: _shareUrl!));
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Link copied again!'),
                  duration: Duration(seconds: 1),
                ),
              );
            }
          },
          icon: const Icon(Icons.copy),
          label: const Text('Copy'),
        ),
        TextButton.icon(
          onPressed: () async {
            // Use Share.share to open native share sheet (email, text, etc.)
            final shareMessage =
                'Hi! Check out my "Furniture: ${widget.furnitureName}" 3D furniture:\n\n'
                '$_shareUrl\n\n'
                'Made with FirstTaps MV3D\n'
                'www.firsttaps.com';

            await Share.share(
              shareMessage,
              subject: 'Furniture: ${widget.furnitureName} from FirstTaps MV3D',
            );
          },
          icon: const Icon(Icons.share),
          label: const Text('Share via...'),
        ),
      ],
      TextButton(
        onPressed: () {
          Navigator.pop(context);
          widget.onComplete();
        },
        child: Text(_errorMessage != null ? 'Close' : 'Done'),
      ),
    ];
  }
}
