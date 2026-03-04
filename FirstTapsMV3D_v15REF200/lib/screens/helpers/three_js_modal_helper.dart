import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../services/three_js_interop_service.dart';
import '../../services/object_deletion_state_service.dart';
import '../../widgets/stacking_criteria_dialog.dart';

/// Helper class containing all modal and dialog functionality for ThreeJsScreen
///
/// This class provides the exact same modal methods as the original ThreeJsScreen
/// but organized in a separate file for better maintainability.
///
/// CRITICAL: All methods are exact copies - no functionality changes
class ThreeJsModalHelper {
  /// Show object action bottom sheet with move and delete options
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  static Future<void> showObjectActionBottomSheet({
    required BuildContext context,
    required ThreeJsInteropService threeJsInteropService,
    required WebViewController webViewController,
    required String objectIdAsPath,
    required String objectName,
    required Function(String, String) onShowDeleteConfirmation,
  }) async {
    // Get current world type to determine available movement options
    String? currentWorldType;
    try {
      currentWorldType = await threeJsInteropService.getCurrentWorldType();
    } catch (e) {
      print("Error getting current world type: $e");
      currentWorldType = 'green-plane'; // Default fallback
    }

    // Determine if we're in a 3D world (space/ocean/forest) that supports vertical movement
    final bool supportsVerticalMovement =
        currentWorldType == 'space' ||
        currentWorldType == 'ocean' ||
        currentWorldType == 'forest' ||
        currentWorldType == 'cave';

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
        // Check if landscape mode for adjusted padding
        final isLandscape =
            MediaQuery.of(sheetContext).size.width >
            MediaQuery.of(sheetContext).size.height;
        final bottomPadding = isLandscape
            ? 16.0
            : 8.0; // More padding in landscape

        // Build menu items list
        final menuItems = <Widget>[
          // Show movement options based on world type
          if (supportsVerticalMovement) ...[
            // In space/ocean/forest worlds: show separate horizontal and vertical options
            ListTile(
              leading: const Icon(Icons.open_with, color: Colors.blueAccent),
              title: const Text('Move Object Horizontally'),
              subtitle: const Text('Move on ground plane (X/Z axis)'),
              contentPadding: EdgeInsets.zero,
              onTap: () async {
                Navigator.of(sheetContext).pop();
                await threeJsInteropService.selectObjectForMoveCommandJS(
                  objectIdAsPath,
                );
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
                    .selectObjectForVerticalMoveCommandJS(objectIdAsPath);
              },
            ),
          ] else ...[
            // In green-plane world: show standard move option
            ListTile(
              leading: const Icon(Icons.open_with, color: Colors.blueAccent),
              title: const Text('Move Object'),
              contentPadding: EdgeInsets.zero,
              onTap: () async {
                Navigator.of(sheetContext).pop();
                await threeJsInteropService.selectObjectForMoveCommandJS(
                  objectIdAsPath,
                );
              },
            ),
          ],
          ListTile(
            leading: const Icon(Icons.weekend, color: Colors.blueAccent),
            title: const Text('Add to Furniture'),
            subtitle: const Text('Place object on furniture'),
            contentPadding: EdgeInsets.zero,
            onTap: () async {
              Navigator.of(sheetContext).pop();
              await _showAddToFurnitureDialog(
                context,
                webViewController,
                objectIdAsPath,
                objectName,
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.home, color: Colors.green),
            title: const Text('Move to Home Area'),
            subtitle: const Text('Return object to center'),
            contentPadding: EdgeInsets.zero,
            onTap: () async {
              Navigator.of(sheetContext).pop();
              await threeJsInteropService.moveSearchResultToHomeArea(
                objectIdAsPath,
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.delete_outline, color: Colors.redAccent),
            title: const Text('Delete Object'),
            contentPadding: EdgeInsets.zero,
            onTap: () {
              Navigator.of(sheetContext).pop();
              onShowDeleteConfirmation(objectIdAsPath, objectName);
            },
          ),
        ];

        return SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(sheetContext).size.height * 0.7,
            ),
            child: SingleChildScrollView(
              child: Padding(
                padding: EdgeInsets.fromLTRB(16.0, 8.0, 16.0, bottomPadding),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: Text(
                        'Actions for: "$objectName"',
                        style: Theme.of(sheetContext).textTheme.titleLarge
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ),
                    // Show all menu items in single column with subtitles
                    ...menuItems,
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
  static Future<void> showDeleteConfirmationDialog({
    required BuildContext context,
    required ThreeJsInteropService threeJsInteropService,
    required String objectIdAsPath,
    required String objectName,
    required Function(String) onHandleObjectDeletion,
    required Function(String) onFileDeleted, // Add second callback
    required bool mounted,
  }) async {
    // Using showModalBottomSheet instead of showDialog
    await showModalBottomSheet(
      context: context, // Use the main screen's context
      isScrollControlled: true,
      useSafeArea: true,
      builder: (BuildContext sheetContext) {
        // Check if landscape mode for adjusted padding
        final isLandscape =
            MediaQuery.of(sheetContext).size.width >
            MediaQuery.of(sheetContext).size.height;
        final bottomPadding = isLandscape
            ? 16.0
            : 8.0; // More padding in landscape

        // Context for the bottom sheet
        return SafeArea(
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              16.0,
              16.0,
              16.0,
              bottomPadding,
            ), // Adjusted padding for landscape
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
                    'Delete: "$objectName"?', // Updated title
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
                    await onFileDeleted(objectIdAsPath); // Flutter state update

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
  static void showDeleteOptionsDialog({
    required BuildContext context,
    required Function() onDeleteObjects,
    required Function() onDeleteObjectsAndFiles,
  }) {
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
                onDeleteObjects();
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

  /// Show undo confirmation dialog
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  static void showUndoConfirmationDialog({
    required BuildContext context,
    required ObjectDeletionStateService deletionStateService,
    required Function() onPerformUndo,
  }) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Undo Deletion'),
          content: const Text(
            'Are you sure you want to restore all recently deleted objects to the 3D world?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                onPerformUndo();
              },
              child: const Text('Restore'),
            ),
          ],
        );
      },
    );
  }

  /// Show advanced options dialog
  ///
  /// CRITICAL: Enhanced with dark theme while preserving all functionality
  static void showAdvancedOptionsDialog({
    required BuildContext context,
    required ThreeJsInteropService threeJsInteropService,
    required ObjectDeletionStateService deletionStateService,
    required Function() onShowDeleteOptions,
    required Function() onShowUndoConfirmation,
  }) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: Colors.grey[900],
          title: const Row(
            children: [
              Icon(Icons.settings_applications, color: Colors.white),
              SizedBox(width: 8),
              Text('Advanced Options', style: TextStyle(color: Colors.white)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Delete All Objects from World
                ListTile(
                  leading: const Icon(
                    Icons.delete_forever,
                    color: Colors.white,
                  ),
                  title: const Text(
                    'Delete All Objects',
                    style: TextStyle(color: Colors.white),
                  ),
                  subtitle: const Text(
                    'Remove all objects from current world',
                    style: TextStyle(color: Colors.white70),
                  ),
                  onTap: () {
                    Navigator.of(context).pop();
                    Future.delayed(const Duration(milliseconds: 100), () {
                      onShowDeleteOptions();
                    });
                  },
                ),
                const Divider(color: Colors.white),
                // Undo Recent Delete of All Objects
                ListTile(
                  enabled: deletionStateService.canUndoObjectDeletion,
                  leading: Icon(
                    Icons.undo,
                    color: deletionStateService.canUndoObjectDeletion
                        ? Colors.white
                        : Colors.grey,
                  ),
                  title: Text(
                    'Undo Recent Deletion',
                    style: TextStyle(
                      color: deletionStateService.canUndoObjectDeletion
                          ? Colors.white
                          : Colors.grey,
                    ),
                  ),
                  subtitle: Text(
                    'Restore recently deleted objects or files',
                    style: TextStyle(
                      color: deletionStateService.canUndoObjectDeletion
                          ? Colors.white70
                          : Colors.grey,
                    ),
                  ),
                  onTap: deletionStateService.canUndoObjectDeletion
                      ? () {
                          Navigator.of(context).pop();
                          Future.delayed(const Duration(milliseconds: 100), () {
                            onShowUndoConfirmation();
                          });
                        }
                      : null,
                ),
                const Divider(color: Colors.white),
                // Object Stacking Criteria Configuration
                ListTile(
                  leading: const Icon(Icons.layers, color: Colors.white),
                  title: const Text(
                    'Object Stacking Criteria',
                    style: TextStyle(color: Colors.white),
                  ),
                  subtitle: const Text(
                    'Configure how objects are grouped and stacked',
                    style: TextStyle(color: Colors.white70),
                  ),
                  onTap: () {
                    Navigator.of(context).pop();
                    Future.delayed(const Duration(milliseconds: 100), () {
                      _showStackingCriteriaDialog(
                        context,
                        threeJsInteropService,
                      );
                    });
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  /// Show stacking criteria configuration dialog
  static void _showStackingCriteriaDialog(
    BuildContext context,
    ThreeJsInteropService threeJsInteropService,
  ) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StackingCriteriaDialog(threeJsService: threeJsInteropService);
      },
    );
  }

  /// Show dialog to select furniture to add object to
  static Future<void> _showAddToFurnitureDialog(
    BuildContext context,
    WebViewController webViewController,
    String objectId,
    String objectName,
  ) async {
    // Get all furniture from JavaScript
    List<Map<String, dynamic>> furnitureList = [];

    try {
      final result = await webViewController.runJavaScriptReturningResult('''
        (function() {
          if (window.app && window.app.furnitureManager) {
            const allFurniture = window.app.furnitureManager.getAllFurniture();
            const furnitureData = allFurniture.map(f => ({
              id: f.id,
              name: f.name,
              type: f.type,
              capacity: f.capacity,
              objectIds: f.objectIds || [],
              availableSlots: f.capacity - (f.objectIds || []).filter(id => id).length
            }));
            return JSON.stringify(furnitureData);
          }
          return JSON.stringify([]);
        })();
      ''');

      if (result != null) {
        try {
          final decoded = jsonDecode(result.toString());
          if (decoded is String) {
            final innerDecoded = jsonDecode(decoded);
            if (innerDecoded is List) {
              furnitureList = List<Map<String, dynamic>>.from(
                innerDecoded.map((item) => Map<String, dynamic>.from(item)),
              );
            }
          } else if (decoded is List) {
            furnitureList = List<Map<String, dynamic>>.from(
              decoded.map((item) => Map<String, dynamic>.from(item)),
            );
          }
        } catch (e) {
          print('Error parsing furniture data: $e');
        }
      }
    } catch (e) {
      print('Error loading furniture: $e');
    }

    if (!context.mounted) return;

    if (furnitureList.isEmpty) {
      // No furniture available
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No furniture available. Create furniture first from the Options menu.',
          ),
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }

    // Show furniture selection dialog
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (BuildContext sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: Text(
                    'Add "$objectName" to furniture:',
                    style: Theme.of(sheetContext).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
                const Divider(),
                ...furnitureList.map((furniture) {
                  final String furnitureId = furniture['id'] ?? '';
                  final String name = furniture['name'] ?? 'Unnamed';
                  final String type = furniture['type'] ?? '';
                  final int availableSlots = furniture['availableSlots'] ?? 0;
                  final int capacity = furniture['capacity'] ?? 0;

                  return ListTile(
                    leading: Icon(
                      _getFurnitureIcon(type),
                      color: availableSlots > 0 ? Colors.blue : Colors.grey,
                    ),
                    title: Text(name),
                    subtitle: Text(
                      availableSlots > 0
                          ? '$availableSlots/$capacity slots available'
                          : 'Full ($capacity/$capacity)',
                    ),
                    enabled: availableSlots > 0,
                    onTap: availableSlots > 0
                        ? () async {
                            Navigator.of(sheetContext).pop();
                            await _addObjectToFurniture(
                              context,
                              webViewController,
                              objectId,
                              furnitureId,
                              objectName,
                              name,
                            );
                          }
                        : null,
                  );
                }).toList(),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.cancel, color: Colors.grey),
                  title: const Text('Cancel'),
                  onTap: () => Navigator.of(sheetContext).pop(),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Add object to selected furniture
  static Future<void> _addObjectToFurniture(
    BuildContext context,
    WebViewController webViewController,
    String objectId,
    String furnitureId,
    String objectName,
    String furnitureName,
  ) async {
    try {
      await webViewController.runJavaScript('''
        (async function() {
          if (window.app && window.app.furnitureManager) {
            await window.app.furnitureManager.addObjectToFurniture('$furnitureId', '$objectId');
            console.log('Object $objectId added to furniture $furnitureId');
          }
        })();
      ''');

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('"$objectName" added to "$furnitureName"'),
            duration: const Duration(seconds: 2),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error adding object to furniture: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  /// Get furniture type icon
  static IconData _getFurnitureIcon(String type) {
    switch (type) {
      case 'bookshelf':
        return Icons.menu_book;
      case 'riser':
        return Icons.view_week;
      case 'gallery_wall':
        return Icons.photo_library;
      case 'stage_small':
      case 'stage_large':
        return Icons.theaters;
      case 'amphitheatre':
        return Icons.stadium;
      default:
        return Icons.weekend;
    }
  }
}
