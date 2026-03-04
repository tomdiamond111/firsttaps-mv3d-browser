import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:typed_data';
import 'package:firsttaps_mv3d/models/file_model.dart' as fm;
import 'package:firsttaps_mv3d/services/state_manager_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:developer' as developer;

/// Helper class for managing demo content files
/// Registers local demo files from assets/demomedia/ as FileModel objects
/// so they can be used in the 3D world during first launch
class DemoContentHelper {
  static const String _demoRegisteredKey = 'demo_files_registered';

  /// Check if demo content has been registered (DEPRECATED - demo files should be created every load)
  @Deprecated('Demo files should be created on every app load from assets')
  static Future<bool> isDemoContentRegistered() async {
    // Always return false to ensure demo files are created every time
    return false;
  }

  /// Mark demo content as registered (DEPRECATED - no longer needed)
  @Deprecated('Demo files should be created on every app load from assets')
  static Future<void> _setDemoContentRegistered() async {
    // No-op: Demo files should be created every load, no need to track
    developer.log(
      '⚠️ _setDemoContentRegistered called but is deprecated',
      name: 'DemoContentHelper',
    );
  }

  /// Get list of demo media files to register
  /// These files are located in assets/demomedia/
  static List<Map<String, dynamic>> getDemoMediaFiles() {
    return [
      {
        'filename': 'Bach Prelude BWV933 piano.mp3',
        'assetPath': 'assets/demomedia/Bach Prelude BWV933 piano.mp3',
        'type': fm.FileType.mp3,
        'mimeType': 'audio/mpeg',
        'category': 'demo',
      },
      {
        'filename': 'cuttyranks_livingcondition.mp4',
        'assetPath': 'assets/demomedia/cuttyranks_livingcondition.mp4',
        'type': fm.FileType.video,
        'mimeType': 'video/mp4',
        'category': 'demo',
      },
      {
        'filename': 'Diamond Bach BWV937 Full rubbermetal good.mp3',
        'assetPath':
            'assets/demomedia/Diamond Bach BWV937 Full rubbermetal good.mp3',
        'type': fm.FileType.mp3,
        'mimeType': 'audio/mpeg',
        'category': 'demo',
      },
      {
        'filename': 'Diamond_Schubert_German Dance D643.mp3',
        'assetPath': 'assets/demomedia/Diamond_Schubert_German Dance D643.mp3',
        'type': fm.FileType.mp3,
        'mimeType': 'audio/mpeg',
        'category': 'demo',
      },
      {
        'filename': 'video1_baseball.mp4',
        'assetPath': 'assets/demomedia/video1_baseball.mp4',
        'type': fm.FileType.video,
        'mimeType': 'video/mp4',
        'category': 'demo',
      },
      {
        'filename': 'video2_treelighting.mp4',
        'assetPath': 'assets/demomedia/video2_treelighting.mp4',
        'type': fm.FileType.video,
        'mimeType': 'video/mp4',
        'category': 'demo',
      },
    ];
  }

  /// Create FileModel objects for demo media files SYNCHRONOUSLY
  /// Returns list of FileModel objects that can be added to the file list
  /// NOTE: Size is set to 0 because we don't need actual file data - JavaScript will load the assets
  static List<fm.FileModel> createDemoFileModelsSync() {
    final demoFiles = getDemoMediaFiles();
    final fileModels = <fm.FileModel>[];

    for (final fileInfo in demoFiles) {
      try {
        // Use 0 for size since we don't need actual file data
        // JavaScript will load the assets directly when needed
        final size = 0;

        // Create FileModel
        final fileModel = fm.FileModel(
          path: fileInfo['assetPath'], // Use asset path
          name: fileInfo['filename'],
          extension: fileInfo['assetPath'].split('.').last,
          fileSize: size,
          type: fileInfo['type'],
          mimeType: fileInfo['mimeType'],
          lastModified: DateTime.now().millisecondsSinceEpoch,
          // CRITICAL: Demo MEDIA files get isDemo flag so they're recreated fresh every time
          // This ensures they always have correct attributes, thumbnails, media preview screens
          // They're removed during cleanup and recreated on next launch
          isDemo: true, // Demo files are recreated on every app load
        );

        fileModels.add(fileModel);
        developer.log(
          '🎵 Created demo FileModel: ${fileModel.name}',
          name: 'DemoContentHelper',
        );
      } catch (e) {
        developer.log(
          '❌ Failed to load demo file ${fileInfo['filename']}: $e',
          name: 'DemoContentHelper',
        );
      }
    }

    developer.log(
      '✅ Created ${fileModels.length} demo FileModels',
      name: 'DemoContentHelper',
    );

    return fileModels;
  }

  /// Register demo content by adding it to StateManagerService (SYNCHRONOUS)
  /// This must be synchronous to ensure demo files exist before JavaScript queries
  /// NOTE: Uses async check internally but returns synchronously - caller should await isDemoContentRegistered() first
  static void registerDemoContentSync(
    StateManagerService stateManager, {
    bool skipIfRegistered = true,
  }) {
    developer.log(
      '🎵 [SYNC] Registering demo content...',
      name: 'DemoContentHelper',
    );
    print('🎵 [SYNC] registerDemoContentSync() called');

    // IMPORTANT: Caller should check isDemoContentRegistered() BEFORE calling this
    // If skipIfRegistered is true and files already exist in memory, skip
    if (skipIfRegistered) {
      final existingDemoFiles = stateManager.files
          .where((f) => f.isDemo)
          .toList();
      if (existingDemoFiles.isNotEmpty) {
        developer.log(
          '⚠️ Demo content already in memory (${existingDemoFiles.length} files), skipping registration',
          name: 'DemoContentHelper',
        );
        print(
          '⚠️ Demo content already exists in memory: ${existingDemoFiles.length} files',
        );
        return;
      }
    }

    // Create and add demo file models SYNCHRONOUSLY
    final demoFiles = createDemoFileModelsSync();
    stateManager.addFiles(demoFiles);

    // NOTE: No persistent flag needed - demo files are created on every app load

    developer.log(
      '✅ Demo content registered: ${demoFiles.length} files added',
      name: 'DemoContentHelper',
    );
    print('✅ [SYNC] Demo content registered: ${demoFiles.length} files added');
    print('🎵 [SYNC] Demo file paths registered:');
    for (final file in demoFiles) {
      print('  - ${file.path}');
    }
  }

  /// Register demo content by adding it to the provided file list (ASYNC - DEPRECATED)
  /// Use registerDemoContentSync() instead for guaranteed execution
  static Future<void> registerDemoContent(
    List<fm.FileModel> existingFiles,
  ) async {
    developer.log(
      '🎵 [ASYNC] Registering demo content...',
      name: 'DemoContentHelper',
    );

    // Check if demo files already exist
    final existingDemoFiles = existingFiles.where((f) => f.isDemo).toList();
    if (existingDemoFiles.isNotEmpty) {
      developer.log(
        '⚠️ Demo content already registered (${existingDemoFiles.length} files)',
        name: 'DemoContentHelper',
      );
      return;
    }

    // Create and add demo file models
    final demoFiles = createDemoFileModelsSync();
    existingFiles.addAll(demoFiles);

    developer.log(
      '✅ Demo content registered: ${demoFiles.length} files added',
      name: 'DemoContentHelper',
    );
  }
}
