import 'package:flutter/material.dart';
import '../../services/three_js_interop_service.dart';
import '../../services/object_deletion_state_service.dart';
import '../../models/file_model.dart' as fm;

/// Delegate interface for undo delete operations
abstract class UndoDeleteDelegate {
  BuildContext get context;
  bool get mounted;
  ThreeJsInteropService get threeJsInteropService;
  List<fm.FileModel> get filesToDisplay;

  // Add method for handling actual deletion
  Future<void> handleObjectDeletion(String objectId);

  // Add method to get current file state with latest positions from state manager
  fm.FileModel? getCurrentFileStateFromManager(String objectId) {
    // This should be implemented in the delegate to access the state manager
    // For now, return null to use fallback
    return null;
  }
}

/// Helper class to handle individual object undo delete functionality
/// This restores the missing undo delete functionality from the refactoring
class ThreeJsUndoDeleteHandler {
  final UndoDeleteDelegate delegate;
  final ObjectDeletionStateService _deletionStateService =
      ObjectDeletionStateService();

  // Storage for object positions and attributes before deletion
  final Map<String, fm.FileModel> _deletedObjectsBackup = {};

  ThreeJsUndoDeleteHandler(this.delegate);

  /// Show undo delete snackbar for objects deleted from 3D scene
  /// This method was lost in the refactoring and needs to be restored
  void showUndoDeleteSnackbar(String objectId, String objectName) {
    print("Showing undo delete snackbar for: $objectName (ID: $objectId)");

    ScaffoldMessenger.of(delegate.context).hideCurrentSnackBar();
    ScaffoldMessenger.of(delegate.context).showSnackBar(
      SnackBar(
        content: Text('$objectName deleted'),
        duration: const Duration(seconds: 4),
        backgroundColor: Colors.grey[800],
        action: SnackBarAction(
          label: 'UNDO',
          textColor: Colors.green,
          onPressed: () {
            print("Undo button pressed for deleted object: $objectName");
            undoDeleteObject(objectId, objectName);
          },
        ),
      ),
    );
  }

  /// Restore a deleted object from the 3D scene with all its properties
  /// This method was completely lost in the refactoring and is critical for undo functionality
  /// It preserves object position, face textures, and all other attributes
  Future<void> undoDeleteObject(String objectId, String objectName) async {
    print("Attempting to restore object: $objectName (ID: $objectId)");

    try {
      // Check if this is a furniture object
      if (objectId.startsWith('furniture_')) {
        await _restoreFurnitureObject(objectId, objectName);
      }
      // Check if this is an app object (link object)
      else if (objectId.startsWith('app_')) {
        await _restoreAppObject(objectId, objectName);
      } else {
        await _restoreFileObject(objectId, objectName);
      }

      print("Object restoration completed: $objectName");

      // Clean up the captured state after successful restoration
      _deletedObjectsBackup.remove(objectId);
      print("Cleaned up captured state for: $objectId");

      // Show success feedback
      if (delegate.mounted) {
        ScaffoldMessenger.of(delegate.context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text('$objectName restored')),
              ],
            ),
            duration: const Duration(seconds: 2),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      print("Error restoring object $objectName: $e");

      // Show error feedback
      if (delegate.mounted) {
        ScaffoldMessenger.of(delegate.context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text('Failed to restore $objectName')),
              ],
            ),
            duration: const Duration(seconds: 3),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Restore an app object (link object) with proper positioning
  Future<void> _restoreAppObject(String objectId, String objectName) async {
    print("Restoring app object: $objectName");

    // Try to find the captured app object state first
    fm.FileModel? appFileModel = _deletedObjectsBackup[objectId];

    if (appFileModel != null) {
      print(
        "Found captured app state with preserved position: (${appFileModel.x}, ${appFileModel.y}, ${appFileModel.z})",
      );
    } else {
      // Fallback: try to find the original app object in the file list
      try {
        appFileModel = delegate.filesToDisplay.firstWhere(
          (f) => f.path == objectId,
        );
        print(
          "Found original app file model with position: (${appFileModel.x}, ${appFileModel.y}, ${appFileModel.z})",
        );
      } catch (e) {
        print(
          "Neither captured state nor original app file model found, creating with default position",
        );
        // Create a minimal FileModel for app object restoration if not found
        appFileModel =
            fm.FileModel(
                name: objectName,
                path: objectId, // Use the app ID as the path
                type: fm.FileType.app,
                extension: 'app',
              )
              ..x =
                  0 // Default position - JavaScript will handle proper placement
              ..y =
                  1 // Slightly elevated for visibility
              ..z = 0;
      }
    }

    // Call JavaScript to restore the app object with all its properties
    await delegate.threeJsInteropService.restoreObjectById(
      appFileModel,
      isUndo: true,
    );
  }

  /// Restore a furniture object by calling JavaScript's restoration handler
  Future<void> _restoreFurnitureObject(
    String objectId,
    String objectName,
  ) async {
    print("🪑 Restoring furniture object: $objectName (ID: $objectId)");

    try {
      // Create a minimal FileModel with furniture metadata
      // JavaScript FurnitureManager will handle the actual restoration from its undo state
      final furnitureModel =
          fm.FileModel(
              name: objectName,
              path: objectId,
              type: fm.FileType.other,
              extension: 'furniture',
            )
            ..x = 0
            ..y = 0
            ..z = 0;

      // Add furniture marker so JavaScript knows this is a furniture restoration
      // JavaScript's restoreObjectById override will detect this and call furniture restoration
      print("🪑 Calling JavaScript restoreObjectById for furniture: $objectId");
      await delegate.threeJsInteropService.restoreObjectById(
        furnitureModel,
        isUndo: true,
      );
      print("🪑 Furniture restoration completed: $objectName");
    } catch (e) {
      print("🪑 Error restoring furniture: $e");
      rethrow;
    }
  }

  /// Restore a file object with all its original properties
  /// Restore a file object with complete attribute preservation
  /// This preserves position, face textures, avatars, and other attributes
  Future<void> _restoreFileObject(String objectId, String objectName) async {
    print("Restoring file object: $objectName");

    // Try to find the captured file object state first
    fm.FileModel? fileModel = _deletedObjectsBackup[objectId];

    if (fileModel != null) {
      print(
        "Found captured file state with preserved position: (${fileModel.x}, ${fileModel.y}, ${fileModel.z})",
      );
    } else {
      // Fallback: try to find the original file model in current list
      try {
        // First, try exact path match
        fileModel = delegate.filesToDisplay.firstWhere(
          (f) => f.path == objectId,
        );
        print("Found original file model with preserved attributes");
      } catch (e) {
        // If exact path not found, try contact ID matching for contact objects
        if (objectId.contains('contact://')) {
          try {
            final contactId = objectId.replaceFirst('contact://', '');
            fileModel = delegate.filesToDisplay.firstWhere(
              (f) => f.path.contains(contactId) || f.name.contains(contactId),
            );
            print("Found contact file model by ID matching");
          } catch (e2) {
            print("Contact file model not found in current display list");
          }
        }

        // If still not found, create a properly typed minimal model
        if (fileModel == null) {
          print("Creating fallback file model for restoration");
          fileModel =
              fm.FileModel(
                  name: objectName,
                  path: objectId,
                  type: _getFileTypeFromObjectId(objectId),
                  extension: _extractExtension(objectName),
                )
                ..x = 0
                ..y =
                    1.25 // Contact objects typically at this height
                ..z = 0;
        }
      }
    }

    // Call the ThreeJsInteropService restoreObjectById method
    // This is the critical method that was in the original backup
    print("ThreeJsInteropService: Restoring object $objectName");
    await delegate.threeJsInteropService.restoreObjectById(
      fileModel,
      isUndo: true,
    );
    print("ThreeJsInteropService: Restore object executed successfully");
  }

  /// Determine file type from object ID
  fm.FileType _getFileTypeFromObjectId(String objectId) {
    if (objectId.startsWith('app_')) {
      return fm.FileType.app;
    } else if (objectId.contains('contact://') ||
        objectId.contains('.contact')) {
      return fm.FileType.app; // Use app type for contact objects
    } else if (objectId.contains('.mp4') || objectId.contains('.mov')) {
      return fm.FileType.video;
    } else if (objectId.contains('.mp3') || objectId.contains('.wav')) {
      return fm.FileType.mp3; // Use mp3 type for audio objects
    } else if (objectId.contains('.pdf')) {
      return fm.FileType.pdf;
    } else if (objectId.contains('.jpg') || objectId.contains('.png')) {
      return fm.FileType.image;
    }
    return fm.FileType.other;
  }

  /// Extract file extension from object name for proper restoration
  String _extractExtension(String objectName) {
    if (objectName.contains('.')) {
      return objectName.split('.').last.toLowerCase();
    }
    return '';
  }

  /// Handle object deletion action from JavaScript and show undo snackbar
  /// This bridges the JavaScript deletion event with the Flutter undo UI
  void handleObjectDeletionWithUndo(String objectId, String objectName) {
    print("Object deleted: $objectName (ID: $objectId)");

    // CRITICAL: Skip path objects - they are managed entirely by JavaScript PathManager
    // Paths use IDs like "path_1765336039280_dvvqv9" and should NOT be persisted in Flutter state
    // Paths are NOT in Flutter's file list, so don't call handleObjectDeletion which would fail
    if (objectId.startsWith('path_')) {
      print(
        "🛤️ Ignoring path deletion notification - paths managed by JavaScript PathManager",
      );
      // Don't call delegate.handleObjectDeletion - paths aren't in Flutter's file state
      // JavaScript PathManager handles all path persistence via localStorage
      return;
    }

    // FURNITURE: Show undo snackbar but skip Flutter file deletion
    // Furniture uses IDs like "furniture_1765562454509_m2so7e" and is NOT in Flutter's file list
    // However, we DO want to show the undo snackbar for user feedback
    if (objectId.startsWith('furniture_')) {
      print(
        "🪑 Furniture deletion - showing undo snackbar: $objectName (ID: $objectId)",
      );

      // Create a minimal FileModel for the deletion state service
      final furnitureModel = fm.FileModel(
        name: objectName,
        path: objectId,
        type: fm.FileType.other,
        extension: 'furniture',
      );

      // Add to deletion state service so the 3-dot menu shows undo option
      _deletionStateService.addDeletedObject(furnitureModel);

      // Show the undo snackbar - JavaScript will handle the actual restoration
      showUndoDeleteSnackbar(objectId, objectName);

      // Don't call delegate.handleObjectDeletion - furniture isn't in Flutter's file state
      // JavaScript FurnitureManager handles all furniture persistence via SharedPreferences
      return;
    }

    // Capture the object's current state before deletion
    _captureObjectState(objectId);

    // DON'T show undo snackbar here - let the controller handle it to avoid duplicates
    // The controller's handleFileDeleted method will show the snackbar

    // CRITICAL: Also handle the actual deletion after capturing state
    // This ensures the object is properly removed from the file list and UI
    delegate.handleObjectDeletion(objectId).catchError((error) {
      print("Error during object deletion: $error");
    });
  }

  /// Capture object state before deletion to preserve position and attributes
  void _captureObjectState(String objectId) {
    try {
      // Get the current file state with latest position from state manager
      final fileModel = delegate.getCurrentFileStateFromManager(objectId);

      if (fileModel == null) {
        print("DEBUG: File with ID '$objectId' not found in current state");
        // Fallback to filesToDisplay as before
        final fallbackFileModel = delegate.filesToDisplay.firstWhere(
          (f) => f.path == objectId,
          orElse: () =>
              throw Exception("File not found in filesToDisplay either"),
        );

        print(
          "DEBUG: Using fallback from filesToDisplay - position: (${fallbackFileModel.x}, ${fallbackFileModel.y}, ${fallbackFileModel.z})",
        );

        _deletedObjectsBackup[objectId] =
            fm.FileModel(
                name: fallbackFileModel.name,
                path: fallbackFileModel.path,
                lastModified: fallbackFileModel.lastModified,
                type: fallbackFileModel.type,
                extension: fallbackFileModel.extension,
                fileSize: fallbackFileModel.fileSize,
              )
              ..x = fallbackFileModel.x
              ..y = fallbackFileModel.y
              ..z = fallbackFileModel.z;

        print(
          "Captured fallback state for $objectId: position (${fallbackFileModel.x}, ${fallbackFileModel.y}, ${fallbackFileModel.z})",
        );
        return;
      }

      print(
        "DEBUG: Found object in current state - position: (${fileModel.x}, ${fileModel.y}, ${fileModel.z})",
      );

      // Store a copy of the file model with key attributes
      _deletedObjectsBackup[objectId] =
          fm.FileModel(
              name: fileModel.name,
              path: fileModel.path,
              type: fileModel.type,
              extension: fileModel.extension,
            )
            ..x = fileModel.x
            ..y = fileModel.y
            ..z = fileModel.z
            ..height = fileModel.height
            ..thumbnailDataUrl = fileModel.thumbnailDataUrl
            ..customDisplayName = fileModel.customDisplayName;

      print(
        "Captured state for $objectId: position (${fileModel.x}, ${fileModel.y}, ${fileModel.z})",
      );
    } catch (e) {
      print("Could not capture state for object $objectId: $e");
      // Create a minimal backup for objects not in the file list
      _deletedObjectsBackup[objectId] =
          fm.FileModel(
              name: objectId.contains('//')
                  ? objectId.split('//').last
                  : objectId,
              path: objectId,
              type: objectId.startsWith('app_')
                  ? fm.FileType.app
                  : fm.FileType.other,
              extension: objectId.startsWith('app_') ? 'app' : 'other',
            )
            ..x = 0
            ..y = 1
            ..z = 0;
    }
  }

  /// Create undo delete data for JavaScript communication
  /// This ensures proper data format for JavaScript restoration
  Map<String, dynamic> createUndoDeleteData(
    String objectId,
    String objectName,
  ) {
    return {
      'id': objectId,
      'name': objectName,
      'action': 'undoDelete',
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
  }

  /// Check if an object can be restored (validation)
  bool canRestoreObject(String objectId) {
    if (objectId.isEmpty) return false;

    // App objects can always be restored with minimal data
    if (objectId.startsWith('app_')) return true;

    // File objects can be restored if they exist in the display list
    // or if we can create a minimal model
    return true; // We can always attempt restoration
  }

  /// Get restore status message for UI feedback
  String getRestoreStatusMessage(String objectName, bool success) {
    if (success) {
      return '$objectName restored with all properties';
    } else {
      return 'Failed to restore $objectName';
    }
  }
}
