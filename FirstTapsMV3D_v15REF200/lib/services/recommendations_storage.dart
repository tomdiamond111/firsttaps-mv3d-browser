import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/recommendation_preferences.dart';
import '../models/link_interaction.dart';
import '../models/cached_recommendation.dart';
import '../config/recommendations_config.dart';

/// JSON-based storage for recommendations data using SharedPreferences
class RecommendationsStorage {
  static final RecommendationsStorage instance = RecommendationsStorage._init();
  RecommendationsStorage._init();

  // Storage keys
  static const String _keyPreferences = 'recommendation_preferences';
  static const String _keyInteractions = 'link_interactions';
  static const String _keyCache = 'recommendation_cache';
  static const String _keyModifiedFurniture = 'modified_furniture_ids';

  /// Get user preferences
  Future<RecommendationPreferences> getPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_keyPreferences);

      if (json == null || json.isEmpty) {
        return RecommendationPreferences(); // Return defaults
      }

      final map = jsonDecode(json) as Map<String, dynamic>;
      return RecommendationPreferences.fromMap(map);
    } catch (e) {
      _logError('Error loading preferences: $e');
      return RecommendationPreferences();
    }
  }

  /// Save user preferences
  Future<void> savePreferences(RecommendationPreferences preferences) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = jsonEncode(preferences.toMap());
      await prefs.setString(_keyPreferences, json);
      _logDebug('Saved preferences');
    } catch (e) {
      _logError('Error saving preferences: $e');
    }
  }

  /// Get all link interactions
  Future<List<LinkInteraction>> getInteractions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_keyInteractions);

      if (json == null || json.isEmpty) {
        return [];
      }

      final list = jsonDecode(json) as List<dynamic>;
      return list.map((item) => LinkInteraction.fromMap(item)).toList();
    } catch (e) {
      _logError('Error loading interactions: $e');
      return [];
    }
  }

  /// Save all link interactions
  Future<void> saveInteractions(List<LinkInteraction> interactions) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = interactions.map((i) => i.toMap()).toList();
      final json = jsonEncode(list);
      await prefs.setString(_keyInteractions, json);
      _logDebug('Saved ${interactions.length} interactions');
    } catch (e) {
      _logError('Error saving interactions: $e');
    }
  }

  /// Add or update a link interaction
  Future<void> saveInteraction(LinkInteraction interaction) async {
    final interactions = await getInteractions();

    // Find existing interaction by URL
    final existingIndex = interactions.indexWhere(
      (i) => i.linkUrl == interaction.linkUrl,
    );

    if (existingIndex >= 0) {
      interactions[existingIndex] = interaction;
    } else {
      interactions.add(interaction);
    }

    await saveInteractions(interactions);
  }

  /// Get cached recommendations
  Future<Map<String, CachedRecommendation>> getCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_keyCache);

      if (json == null || json.isEmpty) {
        return {};
      }

      final map = jsonDecode(json) as Map<String, dynamic>;
      return map.map(
        (key, value) => MapEntry(key, CachedRecommendation.fromMap(value)),
      );
    } catch (e) {
      _logError('Error loading cache: $e');
      return {};
    }
  }

  /// Save cached recommendations
  Future<void> saveCache(Map<String, CachedRecommendation> cache) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final map = cache.map((key, value) => MapEntry(key, value.toMap()));
      final json = jsonEncode(map);
      await prefs.setString(_keyCache, json);
      _logDebug('Saved cache with ${cache.length} entries');
    } catch (e) {
      _logError('Error saving cache: $e');
    }
  }

  /// Get cached recommendation by content type
  Future<CachedRecommendation?> getCachedRecommendation(
    String contentType,
  ) async {
    final cache = await getCache();
    final cached = cache[contentType];

    if (cached == null) return null;

    // Return null if expired
    if (cached.isExpired) {
      await deleteCachedRecommendation(contentType);
      return null;
    }

    return cached;
  }

  /// Save cached recommendation
  Future<void> saveCachedRecommendation(CachedRecommendation cached) async {
    final cache = await getCache();
    cache[cached.contentType] = cached;
    await saveCache(cache);
  }

  /// Delete cached recommendation
  Future<void> deleteCachedRecommendation(String contentType) async {
    final cache = await getCache();
    cache.remove(contentType);
    await saveCache(cache);
  }

  /// Clear all cached recommendations
  Future<void> clearCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_keyCache);
      _logDebug('Cleared all cache');
    } catch (e) {
      _logError('Error clearing cache: $e');
    }
  }

  /// Clear expired cache entries
  Future<void> clearExpiredCache() async {
    final cache = await getCache();
    final now = DateTime.now();

    cache.removeWhere((key, value) => value.expiresAt.isBefore(now));
    await saveCache(cache);
    _logDebug('Cleared expired cache entries');
  }

  /// Get set of modified furniture IDs
  Future<Set<String>> getModifiedFurnitureIds() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = prefs.getStringList(_keyModifiedFurniture);
      return list?.toSet() ?? {};
    } catch (e) {
      _logError('Error loading modified furniture IDs: $e');
      return {};
    }
  }

  /// Save set of modified furniture IDs
  Future<void> saveModifiedFurnitureIds(Set<String> ids) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_keyModifiedFurniture, ids.toList());
      _logDebug('Saved ${ids.length} modified furniture IDs');
    } catch (e) {
      _logError('Error saving modified furniture IDs: $e');
    }
  }

  /// Mark furniture as modified
  Future<void> markFurnitureAsModified(String furnitureId) async {
    final ids = await getModifiedFurnitureIds();
    ids.add(furnitureId);
    await saveModifiedFurnitureIds(ids);
  }

  /// Check if furniture is modified
  Future<bool> isFurnitureModified(String furnitureId) async {
    final ids = await getModifiedFurnitureIds();
    return ids.contains(furnitureId);
  }

  /// Get last update time for furniture type
  Future<DateTime?> getLastUpdateTime(String furnitureType) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final timestamp = prefs.getInt('last_update_$furnitureType');
      return timestamp != null
          ? DateTime.fromMillisecondsSinceEpoch(timestamp)
          : null;
    } catch (e) {
      _logError('Error getting last update time: $e');
      return null;
    }
  }

  /// Set last update time for furniture type
  Future<void> setLastUpdateTime(String furnitureType, DateTime time) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(
        'last_update_$furnitureType',
        time.millisecondsSinceEpoch,
      );
      _logDebug('Set last update time for $furnitureType');
    } catch (e) {
      _logError('Error setting last update time: $e');
    }
  }

  /// Clear all recommendation data
  Future<void> clearAllData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_keyPreferences);
      await prefs.remove(_keyInteractions);
      await prefs.remove(_keyCache);
      await prefs.remove(_keyModifiedFurniture);

      // Remove all last update times
      final keys = prefs.getKeys();
      for (var key in keys) {
        if (key.startsWith('last_update_') || key.startsWith('vimeo_cache_')) {
          await prefs.remove(key);
        }
      }

      _logDebug('Cleared all recommendation data');
    } catch (e) {
      _logError('Error clearing all data: $e');
    }
  }

  /// Get cached Vimeo metadata
  /// Returns map of video ID to JSON metadata string
  Future<Map<String, String>> getVimeoCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheJson = prefs.getString('vimeo_cache_metadata');
      if (cacheJson == null || cacheJson.isEmpty) {
        return {};
      }
      final map = jsonDecode(cacheJson) as Map<String, dynamic>;
      return map.map((key, value) => MapEntry(key, value.toString()));
    } catch (e) {
      _logError('Error loading Vimeo cache: $e');
      return {};
    }
  }

  /// Save Vimeo metadata cache
  Future<void> saveVimeoCache(Map<String, String> cache) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = jsonEncode(cache);
      await prefs.setString('vimeo_cache_metadata', json);
      await prefs.setInt(
        'vimeo_cache_timestamp',
        DateTime.now().millisecondsSinceEpoch,
      );
      _logDebug('Saved Vimeo cache with ${cache.length} entries');
    } catch (e) {
      _logError('Error saving Vimeo cache: $e');
    }
  }

  /// Check if Vimeo cache is valid (not expired)
  Future<bool> isVimeoCacheValid(int maxAgeDays) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final timestamp = prefs.getInt('vimeo_cache_timestamp');
      if (timestamp == null) return false;

      final cacheDate = DateTime.fromMillisecondsSinceEpoch(timestamp);
      final ageInDays = DateTime.now().difference(cacheDate).inDays;
      return ageInDays < maxAgeDays;
    } catch (e) {
      _logError('Error checking Vimeo cache validity: $e');
      return false;
    }
  }

  void _logDebug(String message) {
    if (RecommendationsConfig.enableDebugLogging) {
      print('[RecommendationsStorage] $message');
    }
  }

  void _logError(String message) {
    print('[RecommendationsStorage ERROR] $message');
  }
}
