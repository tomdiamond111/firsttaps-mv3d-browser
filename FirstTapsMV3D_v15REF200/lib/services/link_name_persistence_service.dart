import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/file_model.dart';

/// Service for managing custom link names with persistence across app restarts
class LinkNamePersistenceService {
  static const String _customNamesKey = 'link_custom_names';

  /// Set a custom name for a link object
  Future<void> setCustomName(String objectId, String customName) async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Get existing custom names
      final Map<String, String> customNames = await _getCustomNamesMap();

      // Update the custom name
      customNames[objectId] = customName;

      // Save back to preferences
      await prefs.setString(_customNamesKey, jsonEncode(customNames));

      print(
        "🔗 LinkNamePersistenceService: Saved custom name for $objectId: $customName",
      );
    } catch (e) {
      print("❌ LinkNamePersistenceService: Error saving custom name: $e");
    }
  }

  /// Get a custom name for a link object
  Future<String?> getCustomName(String objectId) async {
    try {
      final Map<String, String> customNames = await _getCustomNamesMap();
      final customName = customNames[objectId];
      if (customName != null) {
        print(
          "🔗 LinkNamePersistenceService: Retrieved custom name for $objectId: $customName",
        );
      }
      return customName;
    } catch (e) {
      print("❌ LinkNamePersistenceService: Error retrieving custom name: $e");
      return null;
    }
  }

  /// Remove a custom name for a link object
  Future<void> removeCustomName(String objectId) async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Get existing custom names
      final Map<String, String> customNames = await _getCustomNamesMap();

      // Remove the custom name
      customNames.remove(objectId);

      // Save back to preferences
      await prefs.setString(_customNamesKey, jsonEncode(customNames));

      print("🔗 LinkNamePersistenceService: Removed custom name for $objectId");
    } catch (e) {
      print("❌ LinkNamePersistenceService: Error removing custom name: $e");
    }
  }

  /// Get all custom names as a map
  Future<Map<String, String>> getAllCustomNames() async {
    return await _getCustomNamesMap();
  }

  /// Sync custom names with FileModel instances
  /// This updates the customDisplayName field in FileModel objects
  Future<List<FileModel>> syncWithFileModels(List<FileModel> files) async {
    try {
      final Map<String, String> customNames = await _getCustomNamesMap();

      if (customNames.isEmpty) {
        return files; // No custom names to sync
      }

      final List<FileModel> updatedFiles = [];

      for (final file in files) {
        final customName = customNames[file.path]; // Use file.path as objectId

        if (customName != null && file.type == FileType.app) {
          // Create updated FileModel with custom display name
          final updatedFile = FileModel(
            name: file.name,
            type: file.type,
            path: file.path,
            parentFolder: file.parentFolder,
            extension: file.extension,
            x: file.x,
            y: file.y,
            z: file.z,
            thumbnailDataUrl: file.thumbnailDataUrl,
            height: file.height,
            fileSize: file.fileSize,
            lastModified: file.lastModified,
            created: file.created,
            mimeType: file.mimeType,
            isReadable: file.isReadable,
            isWritable: file.isWritable,
            customDisplayName: customName, // Set the custom name
            // EXIF metadata fields
            cameraMake: file.cameraMake,
            cameraModel: file.cameraModel,
            dateTimeOriginal: file.dateTimeOriginal,
            imageWidth: file.imageWidth,
            imageHeight: file.imageHeight,
            aperture: file.aperture,
            shutterSpeed: file.shutterSpeed,
            iso: file.iso,
            focalLength: file.focalLength,
            flash: file.flash,
            whiteBalance: file.whiteBalance,
            orientation: file.orientation,
            gpsLatitude: file.gpsLatitude,
            gpsLongitude: file.gpsLongitude,
            gpsAltitude: file.gpsAltitude,
            lensModel: file.lensModel,
            exposureTime: file.exposureTime,
            fNumber: file.fNumber,
            photographicSensitivity: file.photographicSensitivity,
            digitalZoomRatio: file.digitalZoomRatio,
            sceneCaptureType: file.sceneCaptureType,
            subjectDistance: file.subjectDistance,
          );
          updatedFiles.add(updatedFile);
          print(
            "🔗 LinkNamePersistenceService: Synced custom name for ${file.path}: $customName",
          );
        } else {
          updatedFiles.add(file); // No custom name, keep original
        }
      }

      return updatedFiles;
    } catch (e) {
      print("❌ LinkNamePersistenceService: Error syncing with FileModels: $e");
      return files; // Return original files on error
    }
  }

  /// Update a specific FileModel with its custom name if it exists
  Future<FileModel> syncSingleFileModel(FileModel file) async {
    try {
      if (file.type != FileType.app) {
        return file; // Only process app/link objects
      }

      final customName = await getCustomName(file.path);

      if (customName != null && customName != file.customDisplayName) {
        // Create updated FileModel with custom display name
        return FileModel(
          name: file.name,
          type: file.type,
          path: file.path,
          parentFolder: file.parentFolder,
          extension: file.extension,
          x: file.x,
          y: file.y,
          z: file.z,
          thumbnailDataUrl: file.thumbnailDataUrl,
          height: file.height,
          fileSize: file.fileSize,
          lastModified: file.lastModified,
          created: file.created,
          mimeType: file.mimeType,
          isReadable: file.isReadable,
          isWritable: file.isWritable,
          customDisplayName: customName, // Set the custom name
          // EXIF metadata fields
          cameraMake: file.cameraMake,
          cameraModel: file.cameraModel,
          dateTimeOriginal: file.dateTimeOriginal,
          imageWidth: file.imageWidth,
          imageHeight: file.imageHeight,
          aperture: file.aperture,
          shutterSpeed: file.shutterSpeed,
          iso: file.iso,
          focalLength: file.focalLength,
          flash: file.flash,
          whiteBalance: file.whiteBalance,
          orientation: file.orientation,
          gpsLatitude: file.gpsLatitude,
          gpsLongitude: file.gpsLongitude,
          gpsAltitude: file.gpsAltitude,
          lensModel: file.lensModel,
          exposureTime: file.exposureTime,
          fNumber: file.fNumber,
          photographicSensitivity: file.photographicSensitivity,
          digitalZoomRatio: file.digitalZoomRatio,
          sceneCaptureType: file.sceneCaptureType,
          subjectDistance: file.subjectDistance,
        );
      }

      return file; // No changes needed
    } catch (e) {
      print("❌ LinkNamePersistenceService: Error syncing single FileModel: $e");
      return file;
    }
  }

  /// Clear all custom names
  Future<void> clearAllCustomNames() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_customNamesKey);
      print("🔗 LinkNamePersistenceService: Cleared all custom names");
    } catch (e) {
      print("❌ LinkNamePersistenceService: Error clearing custom names: $e");
    }
  }

  /// Private helper to get the custom names map from SharedPreferences
  Future<Map<String, String>> _getCustomNamesMap() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? customNamesJson = prefs.getString(_customNamesKey);

      if (customNamesJson != null) {
        final Map<String, dynamic> decoded = jsonDecode(customNamesJson);
        // Convert to Map<String, String>
        return decoded.map((key, value) => MapEntry(key, value.toString()));
      }

      return <String, String>{}; // Return empty map if no data
    } catch (e) {
      print("❌ LinkNamePersistenceService: Error reading custom names: $e");
      return <String, String>{};
    }
  }
}
