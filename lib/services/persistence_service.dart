import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/file_model.dart'; // This path should be correct if models is lib/models

const String _kPersistedFilesKey = 'persisted_files_list';

class PersistenceService {
  Future<List<FileModel>> loadPersistedFiles() async {
    final prefs = await SharedPreferences.getInstance();
    final String? filesJson = prefs.getString(_kPersistedFilesKey);
    if (filesJson != null) {
      try {
        final List<dynamic> decodedList = jsonDecode(filesJson);
        List<FileModel> files = decodedList
            .map(
              (jsonItem) =>
                  FileModel.fromJson(jsonItem as Map<String, dynamic>),
            )
            .toList();

        // DEBUG: Log furniture metadata for all loaded files
        print('🪑 DEBUG: Loaded ${files.length} files from persistence:');
        for (final file in files) {
          // DEBUG: Check for corrupted paths (app_unknown.package, etc.)
          if (file.path.contains('unknown') || file.path.contains('package')) {
            print(
              '  ❌ CORRUPTED: ${file.name} - path: "${file.path}", isDemo: ${file.isDemo}',
            );
          } else if (file.furnitureId != null ||
              file.furnitureSlotIndex != null) {
            print(
              '  ✅ ${file.name}: furnitureId="${file.furnitureId}", slotIndex=${file.furnitureSlotIndex}',
            );
          } else {
            print('  📁 ${file.name}: no furniture metadata');
          }
        }

        // CRITICAL: Clean up any existing Poster_undefined objects
        files = await _cleanupPosterUndefinedObjects(files);

        // DESIGN DECISION: Remove all demo files from persistence
        final cleanFiles = files.where((file) {
          // Demo files (both media and URL links) are first-install-only.
          // This is intentional - keeps user's library clean.
          // User-added files do NOT have isDemo flag and persist normally.
          if (file.isDemo == true) {
            print(
              '🧹 CLEANUP: Removing demo file from persistence: ${file.name}',
            );
            return false; // Remove all demo files
          }

          // CLEANUP 2: Remove any files with corrupted paths (app_unknown.package, etc.)
          final isCorrupted =
              file.path.contains('unknown') ||
              file.path.contains('package') ||
              file.path == 'app_unknown.package';
          if (isCorrupted) {
            print(
              '🗑️ REMOVING CORRUPTED FILE: ${file.name} (path: ${file.path})',
            );
          }
          return !isCorrupted;
        }).toList();

        if (cleanFiles.length < files.length) {
          print(
            'PersistenceService: Removed ${files.length - cleanFiles.length} corrupted files',
          );
          // Save the cleaned list back
          await savePersistedFiles(cleanFiles);
        }

        return cleanFiles;
      } catch (e) {
        print("PersistenceService: Error loading persisted files: $e");
        // Clear corrupted data
        await prefs.remove(_kPersistedFilesKey);
        return []; // Return empty list on error or corruption
      }
    }
    return []; // Return empty list if no data found
  }

  /// Clean up any Poster_undefined link objects from persistent storage
  Future<List<FileModel>> _cleanupPosterUndefinedObjects(
    List<FileModel> files,
  ) async {
    final originalCount = files.length;

    // Filter out any Poster_undefined objects
    final cleanedFiles = files.where((file) {
      final isPosterUndefined =
          file.name == 'Poster_undefined' ||
          file.name.startsWith('Poster_undefined');

      if (isPosterUndefined) {
        print(
          "🧹 CLEANUP: Removing persistent Poster_undefined object: ${file.name}",
        );
        print(
          "🧹 This prevents unwanted poster URLs from recreating as link objects",
        );
      }

      return !isPosterUndefined;
    }).toList();

    // If we removed any objects, save the cleaned list back to persistence
    if (cleanedFiles.length != originalCount) {
      final removedCount = originalCount - cleanedFiles.length;
      print(
        "🧹 CLEANUP COMPLETE: Removed $removedCount Poster_undefined objects from persistence",
      );

      // Save the cleaned list back to SharedPreferences
      await savePersistedFiles(cleanedFiles);
    }

    return cleanedFiles;
  }

  Future<void> savePersistedFiles(List<FileModel> files) async {
    final prefs = await SharedPreferences.getInstance();

    // DESIGN DECISION: Persist ALL files including demo content
    // Demo content persists with long-duration caching to avoid re-fetching metadata.
    // Objects only change if user explicitly moves/deletes or refreshes furniture.
    // Modified demo objects retain user changes after reload.
    final filesToPersist = files;

    final List<Map<String, dynamic>> encodableList = filesToPersist
        .map((file) => file.toJson())
        .toList();
    await prefs.setString(_kPersistedFilesKey, jsonEncode(encodableList));

    // Performance: Log summary only
    final furnitureFileCount = filesToPersist
        .where((f) => f.furnitureId != null)
        .length;
    print(
      "PersistenceService: Files saved. Count: ${filesToPersist.length} (${furnitureFileCount} with furniture)",
    );
  }

  Future<void> clearPersistedFiles() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kPersistedFilesKey);
    print("PersistenceService: All persisted files cleared.");
  }

  /// Manually clean up all Poster_undefined objects from persistent storage
  /// This can be called directly if needed to force cleanup
  Future<int> cleanupPosterUndefinedObjects() async {
    final files = await loadPersistedFiles();
    final originalCount = files.length;

    final cleanedFiles = files.where((file) {
      final isPosterUndefined =
          file.name == 'Poster_undefined' ||
          file.name.startsWith('Poster_undefined');

      if (isPosterUndefined) {
        print(
          "🧹 MANUAL CLEANUP: Removing Poster_undefined object: ${file.name}",
        );
      }

      return !isPosterUndefined;
    }).toList();

    if (cleanedFiles.length != originalCount) {
      await savePersistedFiles(cleanedFiles);
      final removedCount = originalCount - cleanedFiles.length;
      print(
        "🧹 MANUAL CLEANUP COMPLETE: Removed $removedCount Poster_undefined objects",
      );
      return removedCount;
    }

    return 0;
  }
}
