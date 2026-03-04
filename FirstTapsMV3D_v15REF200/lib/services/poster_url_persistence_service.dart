import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Service for managing poster URL persistence across app restarts and world switches
/// Each world template has its own set of poster URLs that persist independently
class PosterURLPersistenceService {
  static const String _baseKey = 'poster_urls';

  /// Save poster URLs for a specific world template
  static Future<bool> savePosterURLsForWorld(
    String worldTemplate,
    Map<String, dynamic> posterURLs,
  ) async {
    try {
      if (worldTemplate.isEmpty || posterURLs.isEmpty) {
        print(
          'PosterURLPersistenceService: Invalid input - worldTemplate or posterURLs empty',
        );
        return false;
      }

      final prefs = await SharedPreferences.getInstance();
      final String worldKey = '${_baseKey}_$worldTemplate';

      // Add metadata to the stored data
      final Map<String, dynamic> dataToStore = {
        'worldTemplate': worldTemplate,
        'savedAt': DateTime.now().millisecondsSinceEpoch,
        'posterURLs': posterURLs,
        'version': '1.0', // For future compatibility
      };

      final success = await prefs.setString(worldKey, jsonEncode(dataToStore));

      if (success) {
        print(
          'PosterURLPersistenceService: Saved ${posterURLs.length} poster URLs for world: $worldTemplate',
        );
        print(
          'PosterURLPersistenceService: Poster types saved: ${posterURLs.keys.toList()}',
        );
      } else {
        print(
          'PosterURLPersistenceService: Failed to save poster URLs for world: $worldTemplate',
        );
      }

      return success;
    } catch (e) {
      print('PosterURLPersistenceService: Error saving poster URLs: $e');
      return false;
    }
  }

  /// Load poster URLs for a specific world template
  static Future<Map<String, dynamic>> loadPosterURLsForWorld(
    String worldTemplate,
  ) async {
    try {
      if (worldTemplate.isEmpty) {
        print('PosterURLPersistenceService: Invalid worldTemplate provided');
        return {};
      }

      final prefs = await SharedPreferences.getInstance();
      final String worldKey = '${_baseKey}_$worldTemplate';
      final String? storedData = prefs.getString(worldKey);

      if (storedData == null) {
        print(
          'PosterURLPersistenceService: No poster URLs found for world: $worldTemplate',
        );
        return {};
      }

      final Map<String, dynamic> parsedData = jsonDecode(storedData);

      // Validate the stored data structure
      if (!parsedData.containsKey('posterURLs')) {
        print(
          'PosterURLPersistenceService: Invalid stored data format for world: $worldTemplate',
        );
        return {};
      }

      final Map<String, dynamic> posterURLs = Map<String, dynamic>.from(
        parsedData['posterURLs'],
      );
      print(
        'PosterURLPersistenceService: Loaded ${posterURLs.length} poster URLs for world: $worldTemplate',
      );
      print(
        'PosterURLPersistenceService: Poster types loaded: ${posterURLs.keys.toList()}',
      );

      return posterURLs;
    } catch (e) {
      print(
        'PosterURLPersistenceService: Error loading poster URLs for world $worldTemplate: $e',
      );
      return {};
    }
  }

  /// Get all worlds that have saved poster URLs
  static Future<List<String>> getWorldsWithPosterURLs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final allKeys = prefs.getKeys();

      final worldsWithPosters = allKeys
          .where((key) => key.startsWith(_baseKey))
          .map((key) => key.replaceFirst('${_baseKey}_', ''))
          .toList();

      print(
        'PosterURLPersistenceService: Found poster URLs for ${worldsWithPosters.length} worlds: $worldsWithPosters',
      );
      return worldsWithPosters;
    } catch (e) {
      print(
        'PosterURLPersistenceService: Error getting worlds with poster URLs: $e',
      );
      return [];
    }
  }

  /// Clear poster URLs for a specific world template
  static Future<bool> clearPosterURLsForWorld(String worldTemplate) async {
    try {
      if (worldTemplate.isEmpty) {
        print(
          'PosterURLPersistenceService: Invalid worldTemplate provided for clearing',
        );
        return false;
      }

      final prefs = await SharedPreferences.getInstance();
      final String worldKey = '${_baseKey}_$worldTemplate';
      final success = await prefs.remove(worldKey);

      if (success) {
        print(
          'PosterURLPersistenceService: Cleared poster URLs for world: $worldTemplate',
        );
      } else {
        print(
          'PosterURLPersistenceService: Failed to clear poster URLs for world: $worldTemplate',
        );
      }

      return success;
    } catch (e) {
      print(
        'PosterURLPersistenceService: Error clearing poster URLs for world $worldTemplate: $e',
      );
      return false;
    }
  }

  /// Clear all poster URLs for all worlds (useful for reset/testing)
  static Future<bool> clearAllPosterURLs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final allKeys = prefs.getKeys();

      final posterKeys = allKeys
          .where((key) => key.startsWith(_baseKey))
          .toList();

      for (final key in posterKeys) {
        await prefs.remove(key);
      }

      print(
        'PosterURLPersistenceService: Cleared poster URLs for ${posterKeys.length} worlds',
      );
      return true;
    } catch (e) {
      print('PosterURLPersistenceService: Error clearing all poster URLs: $e');
      return false;
    }
  }

  /// Save a single poster URL for a specific world and poster type
  static Future<bool> saveSinglePosterURL(
    String worldTemplate,
    String posterType,
    String url, {
    Map<String, dynamic>? additionalData,
  }) async {
    try {
      // Load existing poster URLs for this world
      final existingURLs = await loadPosterURLsForWorld(worldTemplate);

      // Create poster data
      final posterData = {
        'url': url,
        'savedAt': DateTime.now().millisecondsSinceEpoch,
        'posterType': posterType,
        ...?additionalData, // Spread additional data if provided
      };

      // Update the poster URLs map
      existingURLs[posterType] = posterData;

      // Save back to persistence
      return await savePosterURLsForWorld(worldTemplate, existingURLs);
    } catch (e) {
      print('PosterURLPersistenceService: Error saving single poster URL: $e');
      return false;
    }
  }

  /// Get a single poster URL for a specific world and poster type
  static Future<Map<String, dynamic>?> getSinglePosterURL(
    String worldTemplate,
    String posterType,
  ) async {
    try {
      final posterURLs = await loadPosterURLsForWorld(worldTemplate);

      if (posterURLs.containsKey(posterType)) {
        final posterData = posterURLs[posterType];
        if (posterData is Map<String, dynamic>) {
          return posterData;
        }
      }

      return null;
    } catch (e) {
      print('PosterURLPersistenceService: Error getting single poster URL: $e');
      return null;
    }
  }

  /// Validate that a world template is supported
  static bool isValidWorldTemplate(String worldTemplate) {
    const supportedWorlds = [
      'dazzle',
      'green-plane',
      'space',
      'ocean',
      'forest',
    ];
    return supportedWorlds.contains(worldTemplate);
  }

  /// Get debug information about stored poster URLs
  static Future<Map<String, dynamic>> getDebugInfo() async {
    try {
      final worlds = await getWorldsWithPosterURLs();
      final debugInfo = <String, dynamic>{};

      for (final world in worlds) {
        final posterURLs = await loadPosterURLsForWorld(world);
        debugInfo[world] = {
          'posterCount': posterURLs.length,
          'posterTypes': posterURLs.keys.toList(),
          'urls': posterURLs.map(
            (type, data) =>
                MapEntry(type, data is Map ? data['url'] : data.toString()),
          ),
        };
      }

      return {
        'totalWorlds': worlds.length,
        'worldsWithPosters': worlds,
        'details': debugInfo,
      };
    } catch (e) {
      print('PosterURLPersistenceService: Error getting debug info: $e');
      return {'error': e.toString()};
    }
  }
}
