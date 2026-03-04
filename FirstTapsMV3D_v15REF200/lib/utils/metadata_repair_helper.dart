import 'dart:developer' as developer;
import '../services/file_metadata_service.dart';
import '../models/file_model.dart';

/// Helper class for repairing metadata on legacy files
///
/// This class handles files that were picked before metadata extraction
/// was implemented, ensuring they get proper metadata.
class MetadataRepairHelper {
  static final FileMetadataService _metadataService = FileMetadataService();

  /// Check if a file model needs metadata repair
  ///
  /// Returns true if the file is missing essential metadata
  static bool needsMetadataRepair(FileModel file) {
    // Check if file is missing size or lastModified
    return file.fileSize == null ||
        file.lastModified == null ||
        file.mimeType == null ||
        file.mimeType!.isEmpty;
  }

  /// Repair metadata for a single file
  ///
  /// Extracts metadata from the file system and updates the FileModel
  static Future<FileModel> repairFileMetadata(FileModel file) async {
    developer.log(
      'Repairing metadata for file: ${file.name}',
      name: 'MetadataRepairHelper',
    );

    try {
      if (file.path.isEmpty) {
        developer.log(
          'Cannot repair metadata: empty file path for ${file.name}',
          name: 'MetadataRepairHelper',
        );
        return file;
      }

      final metadata = await _metadataService.getFileMetadata(file.path);

      if (metadata != null) {
        developer.log(
          'Successfully extracted metadata for ${file.name}: $metadata',
          name: 'MetadataRepairHelper',
        );

        // Create updated file model with extracted metadata
        return FileModel(
          name: file.name,
          type: file.type,
          path: file.path,
          parentFolder: file.parentFolder,
          extension: file.extension,
          x: file.x,
          y: file.y,
          z: file.z,
          height: file.height,
          thumbnailDataUrl: file.thumbnailDataUrl,
          // Update with extracted metadata
          fileSize: metadata['fileSize'] as int?,
          lastModified: metadata['lastModified'] as int?,
          mimeType: metadata['mimeType'] as String?,
          isReadable: metadata['isReadable'] as bool?,
          isWritable: metadata['isWritable'] as bool?,
        );
      } else {
        developer.log(
          'Failed to extract metadata for ${file.name}',
          name: 'MetadataRepairHelper',
        );
        return file;
      }
    } catch (e) {
      developer.log(
        'Error repairing metadata for ${file.name}: $e',
        name: 'MetadataRepairHelper',
      );
      return file;
    }
  }

  /// Repair metadata for a list of files
  ///
  /// Processes files in batches to avoid overwhelming the system
  static Future<List<FileModel>> repairBatchMetadata(
    List<FileModel> files, {
    int batchSize = 5,
  }) async {
    developer.log(
      'Starting batch metadata repair for ${files.length} files',
      name: 'MetadataRepairHelper',
    );

    final List<FileModel> repairedFiles = [];

    for (int i = 0; i < files.length; i += batchSize) {
      final batch = files.skip(i).take(batchSize).toList();
      developer.log(
        'Processing batch ${(i ~/ batchSize) + 1}/${(files.length / batchSize).ceil()}',
        name: 'MetadataRepairHelper',
      );

      final batchResults = await Future.wait(
        batch.map((file) => repairFileMetadata(file)),
      );

      repairedFiles.addAll(batchResults);

      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < files.length) {
        await Future.delayed(const Duration(milliseconds: 100));
      }
    }

    final repairedCount = repairedFiles
        .where((file) => !needsMetadataRepair(file))
        .length;

    developer.log(
      'Batch metadata repair complete: $repairedCount/${files.length} files repaired',
      name: 'MetadataRepairHelper',
    );

    return repairedFiles;
  }

  /// Check if metadata service is available before attempting repair
  static Future<bool> isMetadataServiceReady() async {
    try {
      return await _metadataService.isMetadataServiceAvailable();
    } catch (e) {
      developer.log(
        'Error checking metadata service availability: $e',
        name: 'MetadataRepairHelper',
      );
      return false;
    }
  }

  /// Get repair statistics for a list of files
  static Map<String, int> getRepairStats(List<FileModel> files) {
    final needsRepair = files.where(needsMetadataRepair).length;
    final hasMetadata = files.length - needsRepair;

    return {
      'total': files.length,
      'needsRepair': needsRepair,
      'hasMetadata': hasMetadata,
    };
  }
}
