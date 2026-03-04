import '../models/file_model.dart';
import 'app_service.dart';
import 'dart:developer' as developer;

/// Service to manage app object positions during menu selection changes
class AppPositionService {
  final AppService _appService;

  AppPositionService({required AppService appService})
    : _appService = appService;

  /// Handles app selection while preserving existing positions
  Future<List<FileModel>> processAppSelection(
    List<AppInfo> selectedApps,
    List<FileModel> currentFiles,
  ) async {
    try {
      developer.log(
        'Processing app selection: ${selectedApps.length} apps',
        name: 'AppPositionService',
      );

      // Step 1: Store existing app positions before removing them
      final existingAppPositions = _storeExistingAppPositions(currentFiles);

      developer.log(
        'Stored positions for ${existingAppPositions.length} existing apps',
        name: 'AppPositionService',
      );

      // Step 2: Save favorite apps to persistence
      await _appService.saveFavoriteApps(selectedApps);

      // Step 3: Find NEW apps that aren't already in the scene
      final existingAppFiles = currentFiles
          .where((file) => _isAppFile(file))
          .toList();

      final existingAppPaths = existingAppFiles
          .map((file) => file.path)
          .toSet();

      final newApps = selectedApps.where((app) {
        final appPath = 'app_${app.packageName}';
        return !existingAppPaths.contains(appPath);
      }).toList();

      developer.log(
        'Selected apps: ${selectedApps.length}, Existing apps: ${existingAppFiles.length}, NEW apps: ${newApps.length}',
        name: 'AppPositionService',
      );

      // Step 4: Convert only NEW apps to file models with preserved positions
      final appFileModels = newApps
          .map((app) => _convertAppToFileModel(app, existingAppPositions))
          .toList();

      developer.log(
        'Created ${appFileModels.length} NEW app file models with position preservation',
        name: 'AppPositionService',
      );

      return appFileModels;
    } catch (e) {
      developer.log(
        'Error processing app selection: $e',
        name: 'AppPositionService',
      );
      rethrow;
    }
  }

  /// Store existing app positions in a map for later restoration
  Map<String, Map<String, double?>> _storeExistingAppPositions(
    List<FileModel> currentFiles,
  ) {
    final positions = <String, Map<String, double?>>{};

    final existingAppFiles = currentFiles
        .where((file) => _isAppFile(file))
        .toList();

    for (final appFile in existingAppFiles) {
      positions[appFile.path] = {
        'x': appFile.x,
        'y': appFile.y,
        'z': appFile.z,
        'height': appFile.height,
      };

      developer.log(
        'Stored position for ${appFile.name}: (${appFile.x}, ${appFile.y}, ${appFile.z})',
        name: 'AppPositionService',
      );
    }

    return positions;
  }

  /// Convert AppInfo to FileModel with position preservation
  FileModel _convertAppToFileModel(
    AppInfo app,
    Map<String, Map<String, double?>> existingPositions,
  ) {
    final appPath = 'app_${app.packageName}';

    // Check if we have existing position data for this app
    final existingPosition = existingPositions[appPath];

    if (existingPosition != null) {
      developer.log(
        'Restoring position for app ${app.name}: (${existingPosition['x']}, ${existingPosition['y']}, ${existingPosition['z']})',
        name: 'AppPositionService',
      );

      return FileModel(
        path: appPath,
        name: app.name,
        type: FileType.app,
        extension: 'app',
        thumbnailDataUrl: null,
        fileSize: 0,
        lastModified: DateTime.now().millisecondsSinceEpoch,
        x: existingPosition['x'], // Restore existing position
        y: existingPosition['y'],
        z: existingPosition['z'],
        height: existingPosition['height'],
        // Store package name as link URL so JavaScript creates proper app link objects
        mimeType: 'link:app://${app.packageName}',
      );
    }

    // New app - use default values (will be positioned by 3D world)
    developer.log(
      'Creating new app ${app.name} with default position',
      name: 'AppPositionService',
    );

    return FileModel(
      path: appPath,
      name: app.name,
      type: FileType.app,
      extension: 'app',
      thumbnailDataUrl: null,
      fileSize: 0,
      lastModified: DateTime.now().millisecondsSinceEpoch,
      // Store package name as link URL so JavaScript creates proper app link objects
      mimeType: 'link:app://${app.packageName}',
    );
  }

  /// Check if a file is an app object
  bool _isAppFile(FileModel file) {
    return file.type == FileType.app ||
        file.path.startsWith('app_') ||
        file.extension == 'app';
  }

  /// Remove existing app files from the current file list
  List<FileModel> removeExistingAppFiles(List<FileModel> currentFiles) {
    final nonAppFiles = currentFiles
        .where((file) => !_isAppFile(file))
        .toList();

    final removedCount = currentFiles.length - nonAppFiles.length;

    developer.log(
      'Removed $removedCount existing app files, kept ${nonAppFiles.length} non-app files',
      name: 'AppPositionService',
    );

    return nonAppFiles;
  }
}
