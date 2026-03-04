import 'dart:developer' as developer;
import '../services/file_metadata_service.dart';

/// Helper class for testing file metadata extraction
///
/// This provides utilities to validate and test the metadata service
/// functionality during development and debugging.
class MetadataTestHelper {
  static final FileMetadataService _metadataService = FileMetadataService();

  /// Test if the metadata service is working correctly
  ///
  /// This function will test the platform channel connectivity
  /// and basic functionality of the metadata service.
  static Future<void> testMetadataService() async {
    developer.log(
      '=== Testing File Metadata Service ===',
      name: 'MetadataTestHelper',
    );

    try {
      // Test 1: Check if service is available
      final isAvailable = await _metadataService.isMetadataServiceAvailable();
      developer.log(
        'Service available: $isAvailable',
        name: 'MetadataTestHelper',
      );

      // Test 2: Get service version
      final version = await _metadataService.getServiceVersion();
      developer.log('Service version: $version', name: 'MetadataTestHelper');

      // Test 3: Test with null/empty path
      final nullResult = await _metadataService.getFileMetadata('');
      developer.log(
        'Empty path result: $nullResult',
        name: 'MetadataTestHelper',
      );

      // Test 4: Test with invalid path
      final invalidResult = await _metadataService.getFileMetadata(
        '/invalid/path/file.txt',
      );
      developer.log(
        'Invalid path result: $invalidResult',
        name: 'MetadataTestHelper',
      );

      developer.log(
        '=== Metadata Service Test Complete ===',
        name: 'MetadataTestHelper',
      );
    } catch (e) {
      developer.log(
        'Error testing metadata service: $e',
        name: 'MetadataTestHelper',
      );
    }
  }

  /// Test metadata extraction with a known file path
  ///
  /// Use this function to test with actual file paths during development
  static Future<Map<String, dynamic>?> testWithFilePath(String filePath) async {
    developer.log(
      'Testing metadata extraction for: $filePath',
      name: 'MetadataTestHelper',
    );

    try {
      final metadata = await _metadataService.getFileMetadata(filePath);

      if (metadata != null) {
        developer.log(
          'Successfully extracted metadata:',
          name: 'MetadataTestHelper',
        );
        metadata.forEach((key, value) {
          developer.log('  $key: $value', name: 'MetadataTestHelper');
        });
      } else {
        developer.log(
          'No metadata returned for: $filePath',
          name: 'MetadataTestHelper',
        );
      }

      return metadata;
    } catch (e) {
      developer.log(
        'Error extracting metadata for $filePath: $e',
        name: 'MetadataTestHelper',
      );
      return null;
    }
  }

  /// Test batch metadata extraction
  static Future<void> testBatchExtraction(List<String> filePaths) async {
    developer.log(
      'Testing batch metadata extraction for ${filePaths.length} files',
      name: 'MetadataTestHelper',
    );

    try {
      final results = await _metadataService.getBatchFileMetadata(filePaths);

      for (int i = 0; i < results.length; i++) {
        final metadata = results[i];
        final filePath = i < filePaths.length ? filePaths[i] : 'Unknown';

        developer.log('File $i ($filePath):', name: 'MetadataTestHelper');
        if (metadata != null) {
          metadata.forEach((key, value) {
            developer.log('  $key: $value', name: 'MetadataTestHelper');
          });
        } else {
          developer.log('  No metadata available', name: 'MetadataTestHelper');
        }
      }
    } catch (e) {
      developer.log(
        'Error in batch metadata extraction: $e',
        name: 'MetadataTestHelper',
      );
    }
  }

  /// Log detailed metadata information in a formatted way
  static void logMetadataDetails(
    Map<String, dynamic> metadata,
    String fileName,
  ) {
    developer.log('=== Metadata for $fileName ===', name: 'MetadataTestHelper');

    // File size
    if (metadata['size'] != null) {
      final sizeBytes = metadata['size'] as int;
      final sizeFormatted = _formatFileSize(sizeBytes);
      developer.log(
        'Size: $sizeBytes bytes ($sizeFormatted)',
        name: 'MetadataTestHelper',
      );
    }

    // Last modified
    if (metadata['lastModified'] != null) {
      final timestamp = metadata['lastModified'] as int;
      final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
      developer.log('Last Modified: $date', name: 'MetadataTestHelper');
    }

    // Creation time
    if (metadata['created'] != null) {
      final timestamp = metadata['created'] as int;
      final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
      developer.log('Created: $date', name: 'MetadataTestHelper');
    }

    // MIME type
    if (metadata['mimeType'] != null) {
      developer.log(
        'MIME Type: ${metadata['mimeType']}',
        name: 'MetadataTestHelper',
      );
    }

    // Permissions
    if (metadata['permissions'] != null) {
      developer.log(
        'Permissions: ${metadata['permissions']}',
        name: 'MetadataTestHelper',
      );
    }

    // Flags
    ['isReadable', 'isWritable', 'isDirectory'].forEach((flag) {
      if (metadata[flag] != null) {
        developer.log('$flag: ${metadata[flag]}', name: 'MetadataTestHelper');
      }
    });

    developer.log('=== End Metadata ===', name: 'MetadataTestHelper');
  }

  /// Simple file size formatting for testing
  static String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024)
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }
}
