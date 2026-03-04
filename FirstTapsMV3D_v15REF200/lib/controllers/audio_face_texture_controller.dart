import 'dart:developer' as developer;
import '../services/audio_metadata_service.dart';

/// AudioFaceTextureController
/// Coordinates audio face texture application between Dart and JavaScript
/// Manages the integration of audio metadata with the 3D file viewer
class AudioFaceTextureController {
  /// Enable/disable audio face textures globally
  bool _isEnabled = true;

  /// Cache of processed audio files to avoid reprocessing
  final Set<String> _processedFiles = <String>{};

  /// Get current enabled state
  bool get isEnabled => _isEnabled;

  /// Enable or disable audio face textures
  void setEnabled(bool enabled) {
    _isEnabled = enabled;
    developer.log(
      'Audio face textures ${enabled ? 'enabled' : 'disabled'}',
      name: 'AudioFaceTextureController',
    );
  }

  /// Process audio file for face texture application
  /// Returns metadata that can be passed to JavaScript
  Map<String, dynamic> processAudioFile(Map<String, dynamic> fileData) {
    if (!_isEnabled) {
      return fileData; // Return unchanged if disabled
    }

    final String filename = fileData['name'] ?? fileData['fileName'] ?? '';

    if (!AudioMetadataService.isAudioFile(filename)) {
      return fileData; // Not an audio file
    }

    // Check if already processed
    final String fileKey =
        '${fileData['path'] ?? filename}_${fileData['size'] ?? 0}';
    if (_processedFiles.contains(fileKey)) {
      developer.log(
        'Audio file already processed: $filename',
        name: 'AudioFaceTextureController',
      );
      return fileData;
    }

    developer.log(
      'Processing audio file for face texture: $filename',
      name: 'AudioFaceTextureController',
    );

    try {
      // Extract metadata
      final Map<String, String?> metadata =
          AudioMetadataService.extractMetadataFromFilename(filename);

      // Enhance file data with audio metadata
      final Map<String, dynamic> enhancedFileData = Map<String, dynamic>.from(
        fileData,
      );
      enhancedFileData['audioMetadata'] = {
        'artist': metadata['artist'],
        'title': metadata['title'],
        'displayText': metadata['displayText'],
        'hasAudioFaceTexture': true,
        'isAudioFile': true,
      };

      // Mark as processed
      _processedFiles.add(fileKey);

      developer.log(
        'Enhanced audio file data for: $filename',
        name: 'AudioFaceTextureController',
      );
      developer.log(
        'Artist: ${metadata['artist']}, Title: ${metadata['title']}',
        name: 'AudioFaceTextureController',
      );

      return enhancedFileData;
    } catch (e) {
      developer.log(
        'Error processing audio file $filename: $e',
        name: 'AudioFaceTextureController',
      );
      return fileData; // Return original data on error
    }
  }

  /// Batch process multiple audio files
  List<Map<String, dynamic>> batchProcessAudioFiles(
    List<Map<String, dynamic>> filesData,
  ) {
    developer.log(
      'Batch processing ${filesData.length} files for audio face textures',
      name: 'AudioFaceTextureController',
    );

    if (!_isEnabled) {
      return filesData; // Return unchanged if disabled
    }

    int audioFileCount = 0;

    final List<Map<String, dynamic>> processedFiles = filesData.map((fileData) {
      if (AudioMetadataService.isAudioFile(fileData['name'] ?? '')) {
        audioFileCount++;
        return processAudioFile(fileData);
      }
      return fileData;
    }).toList();

    developer.log(
      'Processed $audioFileCount audio files out of ${filesData.length} total files',
      name: 'AudioFaceTextureController',
    );

    return processedFiles;
  }

  /// Clear the processed files cache
  void clearCache() {
    _processedFiles.clear();
    developer.log(
      'Cleared audio file processing cache',
      name: 'AudioFaceTextureController',
    );
  }

  /// Get statistics about processed audio files
  Map<String, dynamic> getStatistics() {
    return {
      'enabled': _isEnabled,
      'processedFileCount': _processedFiles.length,
      'supportedExtensions': AudioMetadataService.getSupportedExtensions(),
    };
  }

  /// Check if a specific file has been processed
  bool isFileProcessed(Map<String, dynamic> fileData) {
    final String filename = fileData['name'] ?? fileData['fileName'] ?? '';
    final String fileKey =
        '${fileData['path'] ?? filename}_${fileData['size'] ?? 0}';
    return _processedFiles.contains(fileKey);
  }

  /// Force reprocess a specific file (useful for testing)
  Map<String, dynamic> forceReprocessFile(Map<String, dynamic> fileData) {
    final String filename = fileData['name'] ?? fileData['fileName'] ?? '';
    final String fileKey =
        '${fileData['path'] ?? filename}_${fileData['size'] ?? 0}';

    // Remove from processed cache
    _processedFiles.remove(fileKey);

    developer.log(
      'Force reprocessing audio file: $filename',
      name: 'AudioFaceTextureController',
    );

    // Process again
    return processAudioFile(fileData);
  }
}
