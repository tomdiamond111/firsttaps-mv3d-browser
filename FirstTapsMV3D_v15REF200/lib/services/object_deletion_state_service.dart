import '../models/file_model.dart';

/// Service for tracking the state of 3D object deletion across navigation
/// This handles the case where objects are deleted from the 3D scene but files remain in the app
class ObjectDeletionStateService {
  static final ObjectDeletionStateService _instance =
      ObjectDeletionStateService._internal();
  factory ObjectDeletionStateService() => _instance;
  ObjectDeletionStateService._internal();
  // State tracking
  bool _all3DObjectsDeleted = false;
  DateTime? _deletionTime;
  List<FileModel>? _deletedObjectsBackup;

  // Single object deletion tracking
  final List<FileModel> _deletedObjects = [];
  final Map<String, DateTime> _singleDeletionTimes = {};

  static const int _undoTimeoutMinutes = 30;
  // Getters
  bool get all3DObjectsDeleted => _all3DObjectsDeleted;
  bool get canUndoObjectDeletion =>
      _all3DObjectsDeleted &&
      _deletionTime != null &&
      DateTime.now().difference(_deletionTime!).inMinutes < _undoTimeoutMinutes;
  List<FileModel>? get deletedObjectsBackup => _deletedObjectsBackup;

  // Single object deletion getters
  List<FileModel> get deletedObjects => List.unmodifiable(_deletedObjects);
  bool get hasDeletedObjects => _deletedObjects.isNotEmpty;

  // Check if a specific object can be undone
  bool canUndoSingleObject(String objectId) {
    final deletionTime = _singleDeletionTimes[objectId];
    return deletionTime != null &&
        DateTime.now().difference(deletionTime).inMinutes < _undoTimeoutMinutes;
  }

  /// Mark all 3D objects as deleted and create backup for undo
  void markAll3DObjectsDeleted(List<FileModel> currentFiles) {
    _deletedObjectsBackup = List.from(currentFiles);
    _all3DObjectsDeleted = true;
    _deletionTime = DateTime.now();
    print(
      "ObjectDeletionStateService: All 3D objects marked as deleted. Backup created with ${currentFiles.length} files.",
    );
  }

  /// Add single object to deleted list for undo functionality
  void addDeletedObject(FileModel fileModel) {
    // Remove if already exists to avoid duplicates
    _deletedObjects.removeWhere((obj) => obj.path == fileModel.path);

    _deletedObjects.add(fileModel);
    _singleDeletionTimes[fileModel.path] = DateTime.now();

    print(
      "ObjectDeletionStateService: Single object ${fileModel.name} marked as deleted.",
    );
  }

  /// Get the most recently deleted object that can be undone
  FileModel? getMostRecentlyDeletedObject() {
    if (_deletedObjects.isEmpty) return null;

    // Find the most recently deleted object that can still be undone
    FileModel? mostRecent;
    DateTime? mostRecentTime;

    for (final obj in _deletedObjects) {
      final deletionTime = _singleDeletionTimes[obj.path];
      if (deletionTime != null && canUndoSingleObject(obj.path)) {
        if (mostRecentTime == null || deletionTime.isAfter(mostRecentTime)) {
          mostRecent = obj;
          mostRecentTime = deletionTime;
        }
      }
    }

    return mostRecent;
  }

  /// Remove specific object from deleted list (after successful undo)
  void removeFromDeletedObjects(String objectId) {
    _deletedObjects.removeWhere((obj) => obj.path == objectId);
    _singleDeletionTimes.remove(objectId);

    // If no more single objects are deleted, clear the all3DObjectsDeleted flag
    if (_deletedObjects.isEmpty) {
      _all3DObjectsDeleted = false;
    }

    print(
      "ObjectDeletionStateService: Object $objectId removed from deleted list.",
    );
  }

  /// Restore all 3D objects (undo the deletion)
  List<FileModel>? restoreAll3DObjects() {
    if (!canUndoObjectDeletion) {
      print(
        "ObjectDeletionStateService: Cannot undo - either no recent deletion or timeout exceeded",
      );
      return null;
    }

    final backup = _deletedObjectsBackup;
    _clearDeletionState();
    print("ObjectDeletionStateService: 3D objects restored from backup.");
    return backup;
  }

  /// Clear the deletion state without restoring
  void _clearDeletionState() {
    _all3DObjectsDeleted = false;
    _deletionTime = null;
    _deletedObjectsBackup = null;
  }

  /// Clear all deleted objects (after undo or manual cleanup)
  void clearDeletedObjects() {
    _deletedObjects.clear();
    _singleDeletionTimes.clear();
    _all3DObjectsDeleted = false;
    print("ObjectDeletionStateService: All deleted objects cleared.");
  }

  /// Force clear the deletion state (for cases where we want to reset without undo)
  void forceClearDeletionState() {
    print("ObjectDeletionStateService: Force clearing deletion state");
    _clearDeletionState();
    clearDeletedObjects();
  }

  /// Check if the deletion timeout has been exceeded and clean up if so
  void checkAndCleanupExpiredDeletion() {
    // Clean up expired "delete all" operations
    if (_all3DObjectsDeleted &&
        _deletionTime != null &&
        DateTime.now().difference(_deletionTime!).inMinutes >=
            _undoTimeoutMinutes) {
      print(
        "ObjectDeletionStateService: Deletion timeout exceeded, cleaning up",
      );
      _clearDeletionState();
    }

    // Clean up expired single object deletions
    final expiredObjects = <String>[];
    for (final entry in _singleDeletionTimes.entries) {
      if (DateTime.now().difference(entry.value).inMinutes >=
          _undoTimeoutMinutes) {
        expiredObjects.add(entry.key);
      }
    }

    for (final objectId in expiredObjects) {
      _deletedObjects.removeWhere((obj) => obj.path == objectId);
      _singleDeletionTimes.remove(objectId);
      print(
        "ObjectDeletionStateService: Expired single deletion cleaned up: $objectId",
      );
    }
  }
}
