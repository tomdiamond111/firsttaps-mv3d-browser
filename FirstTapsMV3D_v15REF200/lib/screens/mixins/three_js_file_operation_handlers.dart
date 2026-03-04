import 'package:flutter/material.dart';
import 'package:open_filex/open_filex.dart';
import '../../models/file_model.dart' as fm;
import '../../services/three_js_interop_service.dart';
import '../../services/object_deletion_state_service.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Mixin containing all file operation functionality for ThreeJsScreen
///
/// This mixin provides:
/// - File opening functionality
/// - Object deletion handling
/// - Bulk deletion operations
/// - Backup and restore operations
/// - Undo operations for deletions and moves
///
/// CRITICAL: All methods preserved exactly as original - no functionality changes
mixin ThreeJsFileOperationHandlers<T extends StatefulWidget> on State<T> {
  // Required getters that the main class must provide
  WebViewController get webViewController;
  ThreeJsInteropService get threeJsInteropService;
  ObjectDeletionStateService get deletionStateService;
  bool get isWebViewInitialized;
  bool get hasRecentMoves;

  // Required callback properties that the main class must provide
  List<fm.FileModel> get filesToDisplay;
  Future<void> Function(String fileId) get onFileDeleted;
  Future<void> Function()? get onDeleteAllObjects;
  Future<void> Function(fm.FileModel fileModel)? get onUndoObjectDelete;

  // Required callback methods that the main class must provide
  void setHasRecentMoves(bool value);
  Future<void> sendDisplayOptionsToJs();

  /// Handle opening a file with the system's default application
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  Future<void> handleOpenFileRequest(String fileIdAsPath) async {
    try {
      // fileIdAsPath is the path of the file (also serves as ID for demo files)
      final fileToOpen = filesToDisplay.firstWhere(
        (f) => f.path == fileIdAsPath,
        orElse: () => throw Exception('File not found'),
      );

      // Check if this is a demo file using the isDemo flag
      if (fileToOpen.isDemo) {
        print(
          "Demo file detected: ${fileToOpen.path}. Opening in JavaScript media preview.",
        );
        // Demo files use data URLs and must be previewed in-app via JavaScript
        // Send command to JavaScript to open the media preview
        await webViewController.runJavaScript('''
          if (window.mediaPreviewManager && window.app && window.app.furnitureManager) {
            const objectMesh = window.app.furnitureManager.findObjectById('${fileToOpen.path}');
            if (objectMesh) {
              window.mediaPreviewManager.togglePreview(objectMesh.userData, objectMesh);
            } else {
              console.warn('Demo object not found in scene:', '${fileToOpen.path}');
            }
          }
        ''');
        return; // Exit early - demo files handled by JavaScript
      }

      if (fileToOpen.path.isNotEmpty) {
        print("Attempting to open file: ${fileToOpen.path}");

        // Check if this is an audio file and use specific MIME types
        final String extension = fileToOpen.path.toLowerCase().split('.').last;
        final bool isAudioFile = [
          'mp3',
          'wav',
          'flac',
          'aac',
          'ogg',
          'm4a',
        ].contains(extension);

        OpenResult result;
        if (isAudioFile) {
          // Use specific MIME types for different audio formats to help Android choose the right app
          String mimeType;
          switch (extension) {
            case 'mp3':
              mimeType = "audio/mpeg";
              break;
            case 'wav':
              mimeType = "audio/wav";
              break;
            case 'flac':
              mimeType = "audio/flac";
              break;
            case 'aac':
              mimeType = "audio/aac";
              break;
            case 'ogg':
              mimeType = "audio/ogg";
              break;
            case 'm4a':
              mimeType = "audio/mp4";
              break;
            default:
              mimeType = "audio/*";
          }

          result = await OpenFilex.open(fileToOpen.path, type: mimeType);
          print("Audio file opened with specific MIME type: $mimeType");
        } else {
          // For non-audio files, use default behavior
          result = await OpenFilex.open(fileToOpen.path);
        }

        print("OpenFilex result: ${result.type}, Message: ${result.message}");
        if (result.type != ResultType.done) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Could not open file: ${result.message}')),
            );
          }
        }
      } else {
        print("File path is empty for ID (path): $fileIdAsPath");
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('File path not available.')),
          );
        }
      }
    } catch (e) {
      print("Error finding file to open with ID (path) $fileIdAsPath: $e");
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error opening file: $e')));
      }
    }
  }

  /// Handle deletion of a single object
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  Future<void> handleObjectDeletion(String objectId) async {
    print("handleObjectDeletion: Deleting object with ID: $objectId");

    // Skip paths - they're managed entirely by JavaScript PathManager
    if (objectId.startsWith('path_')) {
      print(
        "🛤️ Ignoring path deletion in mixin - paths managed by JavaScript PathManager",
      );
      return;
    }

    await onFileDeleted(objectId);
    print("handleObjectDeletion: Object deleted.");
  }

  /// Delete all objects from the 3D scene
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  void deleteAllObjects() async {
    print("Delete all objects selected - starting deletion process");

    // First, call the HomePageController to delete from persistent storage
    if (onDeleteAllObjects != null) {
      try {
        await onDeleteAllObjects!();
        print("HomePageController deletion completed successfully");
      } catch (e) {
        print("Error calling HomePageController delete all: $e");
        // Continue with 3D scene deletion even if persistence fails
      }
    } else {
      // Fallback: use the deletion state service directly if callback not available
      deletionStateService.markAll3DObjectsDeleted(filesToDisplay);
    }

    // Debug: Check object count before deletion
    try {
      final beforeCount = await webViewController.runJavaScriptReturningResult(
        'getObjectCountJS();',
      );
      print("Objects before deletion: $beforeCount");
    } catch (e) {
      print("Error getting object count before deletion: $e");
    }

    // Use the existing clearFileObjectsJS which safely removes file objects only
    // This preserves lights, ground plane, and other essential scene elements
    try {
      await webViewController.runJavaScript('clearFileObjectsJS();');
      print("clearFileObjectsJS completed successfully");
    } catch (e) {
      print("Error calling clearFileObjectsJS: $e");
    } // Debug: Check object count after deletion
    try {
      final afterCount = await webViewController.runJavaScriptReturningResult(
        'getObjectCountJS();',
      );
      print("Objects after deletion: $afterCount");
    } catch (e) {
      print("Error getting object count after deletion: $e");
    }

    // Force an additional render to ensure changes are visible
    try {
      await webViewController.runJavaScript('forceRenderJS();');
      print("Forced additional render");
    } catch (e) {
      print("Error forcing render: $e");
    }

    // Refresh UI to show undo option
    setState(() {});
  }

  /// Delete all objects and files (both from scene and filesystem)
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  void deleteAllObjectsAndFiles() async {
    // Use the new deletion state service to track the deletion
    deletionStateService.markAll3DObjectsDeleted(filesToDisplay);

    print("Delete all objects and files selected - calling clearFileObjectsJS");

    // First clear the 3D objects
    try {
      await webViewController.runJavaScript('clearFileObjectsJS();');
      print("clearFileObjectsJS completed successfully");
    } catch (e) {
      print("Error calling clearFileObjectsJS: $e");
    }

    // TODO: Add file system deletion logic here
    print(
      "Delete all objects and files selected - objects cleared, file deletion not yet implemented",
    );

    // Refresh UI to show undo option
    setState(() {});
  }

  /// Restore objects from backup
  ///
  /// CRITICAL: Modified to delegate to proper undo handling with persistence
  void restoreFromBackup() async {
    if (!deletionStateService.canUndoObjectDeletion) {
      print("No recent deletion to undo or timeout exceeded");
      return;
    }

    // Get the backed up files from the service
    final backupFiles = deletionStateService.restoreAll3DObjects();
    if (backupFiles == null) {
      print("Failed to restore - no backup available");
      return;
    }

    // Filter out contact files - do not restore contact objects
    final nonContactFiles = backupFiles.where((file) {
      // Check if this is a contact file by examining the path or mimeType
      return !file.path.startsWith('contact://') &&
          !(file.mimeType?.startsWith('contact:') ?? false);
    }).toList();

    print(
      "Restoring ${nonContactFiles.length} non-contact objects from backup (excluded ${backupFiles.length - nonContactFiles.length} contact objects)...",
    );

    // CRITICAL: If onUndoObjectDelete callback is available, use it for each file
    // This ensures proper persistence and state management
    if (onUndoObjectDelete != null) {
      print(
        "Mixin: Using onUndoObjectDelete callback for proper persistence...",
      );
      for (var file in nonContactFiles) {
        await onUndoObjectDelete!(file);
      }
    } else {
      print(
        "Mixin: No callback available, using basic restore (objects may not persist)...",
      );
      // Fallback: Use the service to recreate only non-contact objects from the backup
      threeJsInteropService.sendFilesToWebView(nonContactFiles);
    }

    // Force refresh of display options
    sendDisplayOptionsToJs();
    print("Restore completed - non-contact objects recreated from backup");
    setState(() {}); // Refresh UI to hide undo option
  }

  /// Perform undo for object deletion
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  void performUndoObjectDelete() {
    final deletedObject = deletionStateService.getMostRecentlyDeletedObject();
    if (deletedObject != null && onUndoObjectDelete != null) {
      onUndoObjectDelete!(deletedObject);
    }
  }

  /// Update the recent moves state
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  Future<void> updateRecentMovesState() async {
    if (isWebViewInitialized) {
      try {
        final hasRecent = await threeJsInteropService.hasRecentMovesJS();
        setHasRecentMoves(hasRecent);
      } catch (e) {
        print('Error updating recent moves state: $e');
        setHasRecentMoves(false);
      }
    }
  }

  /// Perform undo for recent move
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  Future<void> performUndoRecentMove() async {
    if (isWebViewInitialized) {
      try {
        final success = await threeJsInteropService.undoRecentMoveJS();
        if (success) {
          print('Undo recent move successful');
          // Update the state to reflect that we may have fewer moves available
          await updateRecentMovesState();
        } else {
          print('Undo recent move failed');
        }
      } catch (e) {
        print('Error performing undo recent move: $e');
      }
    }
  }
}
