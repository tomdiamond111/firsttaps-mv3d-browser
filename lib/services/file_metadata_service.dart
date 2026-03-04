import 'package:flutter/services.dart';
import 'dart:developer' as developer;

/// Service for extracting detailed file metadata using platform channels
///
/// This service provides comprehensive file metadata extraction capabilities
/// for both Android and iOS platforms, including fallback mechanisms for
/// robust operation across different file sources and storage types.
class FileMetadataService {
  static const MethodChannel _channel = MethodChannel('file_metadata');

  /// Extract detailed metadata for a single file
  ///
  /// Returns a Map containing:
  /// - size: File size in bytes
  /// - lastModified: Last modification timestamp (milliseconds since epoch)
  /// - created: Creation timestamp (milliseconds since epoch, if available)
  /// - mimeType: MIME type of the file
  /// - permissions: File permissions string
  /// - isReadable: Whether the file can be read
  /// - isWritable: Whether the file can be written
  /// - isDirectory: Whether the path is a directory
  ///
  /// For image files, also includes EXIF metadata fields such as:
  /// - cameraMake, cameraModel: Camera information
  /// - dateTimeOriginal: When the photo was taken
  /// - imageWidth, imageHeight: Image dimensions
  /// - aperture, shutterSpeed, iso, focalLength: Camera settings
  /// - gpsLatitude, gpsLongitude, gpsAltitude: GPS location data
  /// - orientation, flash, whiteBalance: Additional capture settings
  ///
  /// Returns null if metadata extraction fails completely
  Future<Map<String, dynamic>?> getFileMetadata(String filePath) async {
    try {
      print(
        'DEBUG: [FileMetadataService] Starting getFileMetadata for: $filePath',
      );

      developer.log(
        'Extracting metadata for file: $filePath',
        name: 'FileMetadataService',
      );

      if (filePath.isEmpty) {
        print('DEBUG: [FileMetadataService] Empty file path provided');
        developer.log('Empty file path provided', name: 'FileMetadataService');
        return null;
      }

      print(
        'DEBUG: [FileMetadataService] About to call platform channel method',
      );
      print('DEBUG: [FileMetadataService] Channel: ${_channel.name}');
      print('DEBUG: [FileMetadataService] Method: getFileMetadata');
      print('DEBUG: [FileMetadataService] Arguments: {filePath: $filePath}');

      final dynamic rawResult = await _channel.invokeMethod('getFileMetadata', {
        'filePath': filePath,
      });

      print('DEBUG: [FileMetadataService] Platform channel call completed');
      print('DEBUG: [FileMetadataService] Raw result: $rawResult');
      print(
        'DEBUG: [FileMetadataService] Raw result type: ${rawResult.runtimeType}',
      );

      developer.log(
        'Raw platform channel result: $rawResult (type: ${rawResult.runtimeType})',
        name: 'FileMetadataService',
      );

      final Map<String, dynamic>? result;
      if (rawResult is Map) {
        result = Map<String, dynamic>.from(rawResult);
        print('DEBUG: [FileMetadataService] Converted Map result: $result');
      } else {
        result = rawResult as Map<String, dynamic>?;
        print('DEBUG: [FileMetadataService] Cast result: $result');
      }

      if (result != null) {
        print(
          'DEBUG: [FileMetadataService] Result is not null, validating and sanitizing',
        );
        developer.log(
          'Successfully extracted metadata: $result',
          name: 'FileMetadataService',
        );
        final validatedResult = _validateAndSanitizeMetadata(result);
        print(
          'DEBUG: [FileMetadataService] Final validated result: $validatedResult',
        );
        return validatedResult;
      } else {
        print('DEBUG: [FileMetadataService] Result is null');
        developer.log(
          'Platform channel returned null for: $filePath',
          name: 'FileMetadataService',
        );
        return null;
      }
    } on PlatformException catch (e) {
      print(
        'DEBUG: [FileMetadataService] PlatformException: ${e.code} - ${e.message}',
      );
      developer.log(
        'Platform exception getting file metadata: ${e.message}',
        name: 'FileMetadataService',
      );
      return null;
    } catch (e) {
      print('DEBUG: [FileMetadataService] Unexpected error: $e');
      developer.log(
        'Unexpected error getting file metadata: $e',
        name: 'FileMetadataService',
      );
      return null;
    }
  }

  /// Extract metadata for multiple files in a batch operation
  ///
  /// This is more efficient than calling getFileMetadata multiple times
  /// Returns a List of Maps in the same order as input filePaths
  /// Failed extractions return null for that index
  Future<List<Map<String, dynamic>?>> getBatchFileMetadata(
    List<String> filePaths,
  ) async {
    try {
      developer.log(
        'Extracting metadata for ${filePaths.length} files',
        name: 'FileMetadataService',
      );

      if (filePaths.isEmpty) {
        return [];
      }

      // Filter out empty paths
      final validPaths = filePaths.where((path) => path.isNotEmpty).toList();

      if (validPaths.isEmpty) {
        return List.filled(filePaths.length, null);
      }

      final List<dynamic>? results = await _channel.invokeMethod(
        'getBatchFileMetadata',
        {'filePaths': validPaths},
      );

      if (results != null) {
        developer.log(
          'Successfully extracted batch metadata for ${results.length} files',
          name: 'FileMetadataService',
        );

        // Validate and sanitize each result
        return results.map((result) {
          if (result is Map<String, dynamic>) {
            return _validateAndSanitizeMetadata(result);
          }
          return null;
        }).toList();
      } else {
        developer.log(
          'Platform channel returned null for batch operation',
          name: 'FileMetadataService',
        );
        return List.filled(filePaths.length, null);
      }
    } on PlatformException catch (e) {
      developer.log(
        'Platform exception getting batch file metadata: ${e.message}',
        name: 'FileMetadataService',
      );
      return List.filled(filePaths.length, null);
    } catch (e) {
      developer.log(
        'Unexpected error getting batch file metadata: $e',
        name: 'FileMetadataService',
      );
      return List.filled(filePaths.length, null);
    }
  }

  /// Check if the platform channel is available and working
  ///
  /// This can be used to determine if platform-specific metadata extraction
  /// is available, allowing fallback to other methods if needed
  Future<bool> isMetadataServiceAvailable() async {
    try {
      developer.log(
        'Testing metadata service availability...',
        name: 'FileMetadataService',
      );
      final bool? available = await _channel.invokeMethod('isServiceAvailable');
      developer.log(
        'Service availability result: $available',
        name: 'FileMetadataService',
      );
      return available ?? false;
    } catch (e) {
      developer.log(
        'Error checking metadata service availability: $e',
        name: 'FileMetadataService',
      );
      return false;
    }
  }

  /// Get the platform-specific version of the metadata service
  ///
  /// Useful for debugging and ensuring compatibility
  Future<String?> getServiceVersion() async {
    try {
      final String? version = await _channel.invokeMethod('getServiceVersion');
      return version;
    } catch (e) {
      developer.log(
        'Error getting metadata service version: $e',
        name: 'FileMetadataService',
      );
      return null;
    }
  }

  /// Validate and sanitize metadata returned from platform channels
  ///
  /// Ensures data types are correct and values are within expected ranges
  /// Also preserves EXIF metadata fields for image files
  Map<String, dynamic> _validateAndSanitizeMetadata(
    Map<String, dynamic> metadata,
  ) {
    final Map<String, dynamic> sanitized = {};

    // File size - ensure it's a valid integer
    if (metadata['size'] != null) {
      try {
        final size = metadata['size'];
        if (size is int && size >= 0) {
          sanitized['fileSize'] =
              size; // Store as 'fileSize' to match FileModel
        } else if (size is String) {
          final parsedSize = int.tryParse(size);
          if (parsedSize != null && parsedSize >= 0) {
            sanitized['fileSize'] =
                parsedSize; // Store as 'fileSize' to match FileModel
          }
        }
      } catch (e) {
        developer.log(
          'Invalid size value: ${metadata['size']}',
          name: 'FileMetadataService',
        );
      }
    } // Last modified timestamp with fallback logic
    int? lastModifiedTimestamp;
    int? createdTimestamp;

    // Extract lastModified
    if (metadata['lastModified'] != null) {
      try {
        final lastModified = metadata['lastModified'];
        if (lastModified is int && lastModified > 0) {
          lastModifiedTimestamp = lastModified;
        } else if (lastModified is String) {
          final parsedTime = int.tryParse(lastModified);
          if (parsedTime != null && parsedTime > 0) {
            lastModifiedTimestamp = parsedTime;
          }
        }
      } catch (e) {
        developer.log(
          'Invalid lastModified value: ${metadata['lastModified']}',
          name: 'FileMetadataService',
        );
      }
    }

    // Extract created timestamp
    if (metadata['created'] != null) {
      try {
        final created = metadata['created'];
        if (created is int && created > 0) {
          createdTimestamp = created;
        } else if (created is String) {
          final parsedTime = int.tryParse(created);
          if (parsedTime != null && parsedTime > 0) {
            createdTimestamp = parsedTime;
          }
        }
      } catch (e) {
        developer.log(
          'Invalid created value: ${metadata['created']}',
          name: 'FileMetadataService',
        );
      }
    }

    // Implement fallback logic: prefer created date if lastModified is very recent (likely a copy)
    final now = DateTime.now().millisecondsSinceEpoch;
    const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (lastModifiedTimestamp != null) {
      // If lastModified is within the last 24 hours and we have a created timestamp that's older,
      // prefer the created timestamp as it's likely the original file date
      if (createdTimestamp != null &&
          (now - lastModifiedTimestamp) < recentThreshold &&
          createdTimestamp < lastModifiedTimestamp) {
        print(
          'DEBUG: [FileMetadataService] Using created date ($createdTimestamp) instead of lastModified ($lastModifiedTimestamp) - file appears to be recently copied',
        );
        sanitized['lastModified'] = createdTimestamp;
        sanitized['created'] = createdTimestamp;
      } else {
        sanitized['lastModified'] = lastModifiedTimestamp;
        if (createdTimestamp != null) {
          sanitized['created'] = createdTimestamp;
        }
      }
    } else if (createdTimestamp != null) {
      // No lastModified, use created as fallback
      print(
        'DEBUG: [FileMetadataService] No lastModified available, using created date ($createdTimestamp)',
      );
      sanitized['lastModified'] = createdTimestamp;
      sanitized['created'] = createdTimestamp;
    }

    // MIME type - ensure it's a valid string
    if (metadata['mimeType'] != null && metadata['mimeType'] is String) {
      final mimeType = metadata['mimeType'] as String;
      if (mimeType.isNotEmpty && mimeType.contains('/')) {
        sanitized['mimeType'] = mimeType.toLowerCase();
      }
    }

    // Permissions - ensure it's a valid string
    if (metadata['permissions'] != null && metadata['permissions'] is String) {
      final permissions = metadata['permissions'] as String;
      if (permissions.isNotEmpty) {
        sanitized['permissions'] = permissions;
      }
    } // Boolean flags
    ['isReadable', 'isWritable', 'isDirectory'].forEach((key) {
      if (metadata[key] != null) {
        if (metadata[key] is bool) {
          sanitized[key] = metadata[key];
        } else if (metadata[key] is String) {
          sanitized[key] = metadata[key].toString().toLowerCase() == 'true';
        }
      }
    });

    // Preserve EXIF metadata fields for image files
    final exifFields = [
      'cameraMake',
      'cameraModel',
      'dateTimeOriginal',
      'imageWidth',
      'imageHeight',
      'aperture',
      'shutterSpeed',
      'iso',
      'focalLength',
      'flash',
      'whiteBalance',
      'orientation',
      'gpsLatitude',
      'gpsLongitude',
      'gpsAltitude',
      'lensModel',
      'exposureTime',
      'fNumber',
      'photographicSensitivity',
      'digitalZoomRatio',
      'sceneCaptureType',
      'subjectDistance',
    ];

    // Copy EXIF fields if they exist in the metadata
    for (final field in exifFields) {
      if (metadata[field] != null) {
        // Preserve the original value, whether it's string, int, double, etc.
        sanitized[field] = metadata[field];
        print(
          'DEBUG: [FileMetadataService] Preserved EXIF field: $field = ${metadata[field]}',
        );
      }
    }

    // Log if we found EXIF data
    final exifFieldsFound = exifFields
        .where((field) => metadata[field] != null)
        .length;
    if (exifFieldsFound > 0) {
      print(
        'DEBUG: [FileMetadataService] Preserved $exifFieldsFound EXIF fields in metadata',
      );
      developer.log(
        'Preserved $exifFieldsFound EXIF fields for image file',
        name: 'FileMetadataService',
      );
    }

    return sanitized;
  }
}
