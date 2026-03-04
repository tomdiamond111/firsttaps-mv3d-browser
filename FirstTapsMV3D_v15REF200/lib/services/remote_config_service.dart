import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Remote Configuration Service
///
/// Fetches app configuration (content URLs) from GitHub Pages.
/// Provides caching, fallback to hardcoded values, and graceful error handling.
///
/// Usage:
/// ```dart
/// final config = await RemoteConfigService.getConfig();
/// final spotifyUrls = config['spotify_trending_urls'] as List<dynamic>?;
/// ```
class RemoteConfigService {
  // Remote config URL - fetches from GitHub Pages
  static const String configUrl =
      'https://tomdiamond111.github.io/firsttaps-app-config/config.json';

  // Alternate CDN option (faster, but same repo needed)
  // 'https://cdn.jsdelivr.net/gh/tomdiamond111/firsttaps-app-config@main/config.json'

  static const String cacheKey = 'remote_config_cache';
  static const String lastFetchKey = 'remote_config_last_fetch';
  static const String versionKey = 'remote_config_version';

  // Cache config for 6 hours (balance between freshness and performance)
  static const Duration cacheExpiry = Duration(hours: 6);

  // Singleton pattern for in-memory cache
  static Map<String, dynamic>? _memoryCache;
  static DateTime? _memoryCacheTime;

  /// Get configuration (from memory cache, disk cache, or remote)
  ///
  /// Returns config map with all URL lists
  /// Falls back to hardcoded values if remote fetch fails
  /// @param forceRefresh - If true, bypass all caches and fetch fresh from remote
  static Future<Map<String, dynamic>> getConfig({
    bool forceRefresh = false,
  }) async {
    print(
      '🚀 RemoteConfigService.getConfig() called (forceRefresh: $forceRefresh)',
    );

    // If force refresh requested, skip all caches
    if (forceRefresh) {
      print('🔄 Force refresh - bypassing all caches');
      return await _fetchRemoteConfig();
    }

    // Check memory cache first (fastest)
    if (_memoryCache != null && _memoryCacheTime != null) {
      final age = DateTime.now().difference(_memoryCacheTime!);
      if (age < cacheExpiry) {
        print('✅ Using in-memory remote config cache');
        return _memoryCache!;
      }
    }

    try {
      // Check disk cache
      final cachedConfig = await _getCachedConfig();
      if (cachedConfig != null) {
        _memoryCache = cachedConfig;
        _memoryCacheTime = DateTime.now();
        print('✅ Using disk-cached remote config');
        return cachedConfig;
      }

      // Fetch from remote
      return await _fetchRemoteConfig();
    } catch (e) {
      print('⚠️ Remote config fetch failed: $e');
      print('   Using fallback hardcoded config');
      return _getFallbackConfig();
    }
  }

  /// Get cached config if still valid
  static Future<Map<String, dynamic>?> _getCachedConfig() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastFetch = prefs.getInt(lastFetchKey);

      if (lastFetch != null) {
        final age = DateTime.now().millisecondsSinceEpoch - lastFetch;
        if (age < cacheExpiry.inMilliseconds) {
          final cached = prefs.getString(cacheKey);
          if (cached != null) {
            final config = json.decode(cached) as Map<String, dynamic>;
            if (_isValidConfig(config)) {
              return config;
            }
          }
        }
      }
    } catch (e) {
      print('⚠️ Error reading cached config: $e');
    }
    return null;
  }

  /// Cache config to disk
  static Future<void> _cacheConfig(Map<String, dynamic> config) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(cacheKey, json.encode(config));
      await prefs.setInt(lastFetchKey, DateTime.now().millisecondsSinceEpoch);
      await prefs.setString(
        versionKey,
        config['version'] as String? ?? 'unknown',
      );
      print('💾 Remote config cached to disk');
    } catch (e) {
      print('⚠️ Error caching config: $e');
    }
  }

  /// Fetch remote config (extracted for reuse)
  static Future<Map<String, dynamic>> _fetchRemoteConfig() async {
    try {
      print('🌐 Fetching remote config from GitHub Pages...');
      final response = await http
          .get(Uri.parse(configUrl))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final config = json.decode(response.body) as Map<String, dynamic>;

        // Validate config structure
        if (_isValidConfig(config)) {
          await _cacheConfig(config);
          _memoryCache = config;
          _memoryCacheTime = DateTime.now();

          print('✅ Remote config fetched successfully');
          print('   Version: ${config['version']}');
          print('   Last updated: ${config['last_updated']}');

          return config;
        } else {
          print('⚠️ Invalid config structure, using fallback');
          return _getFallbackConfig();
        }
      } else {
        print('⚠️ HTTP ${response.statusCode} fetching remote config');
        throw Exception('HTTP ${response.statusCode}');
      }
    } catch (e) {
      print('⚠️ Remote config fetch failed: $e');
      print('   Using fallback hardcoded config');
      return _getFallbackConfig();
    }
  }

  /// Validate config structure
  static bool _isValidConfig(Map<String, dynamic> config) {
    // Check required fields
    if (!config.containsKey('version')) return false;

    // Check that at least one URL list exists
    final hasUrls =
        config.containsKey('spotify_trending_urls') ||
        config.containsKey('tiktok_trending_urls') ||
        config.containsKey('instagram_reel_urls') ||
        config.containsKey('vimeo_music_urls') ||
        config.containsKey('soundcloud_trending_urls');

    return hasUrls;
  }

  /// Get fallback config from RecommendationsConfig hardcoded values
  static Map<String, dynamic> _getFallbackConfig() {
    // Import done at runtime to avoid circular dependency
    // We'll use the existing hardcoded values from RecommendationsConfig
    print('📦 Using fallback hardcoded config');

    return {
      'version': '1.0.0-fallback',
      'last_updated': DateTime.now().toIso8601String(),
      'source': 'hardcoded_fallback',
      // Note: These will be populated by RecommendationsConfig
      // when it calls this service
      'spotify_trending_urls': [],
      'tiktok_trending_urls': [],
      'tiktok_music_urls': [],
      'instagram_reel_urls': [],
      'instagram_music_urls': [],
      'vimeo_music_urls': [],
      'soundcloud_trending_urls': [],
    };
  }

  /// Force refresh config (bypass all caches)
  /// Useful for testing or when user manually requests refresh
  static Future<Map<String, dynamic>> forceRefresh() async {
    print('🔄 Force refreshing remote config...');

    // Clear caches
    _memoryCache = null;
    _memoryCacheTime = null;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(cacheKey);
      await prefs.remove(lastFetchKey);
    } catch (e) {
      print('⚠️ Error clearing cache: $e');
    }

    return await getConfig();
  }

  /// Get cached version info
  static Future<String?> getCachedVersion() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(versionKey);
    } catch (e) {
      return null;
    }
  }

  /// Get cache age in hours
  static Future<int?> getCacheAgeHours() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastFetch = prefs.getInt(lastFetchKey);
      if (lastFetch != null) {
        final age = DateTime.now().millisecondsSinceEpoch - lastFetch;
        return (age / 1000 / 60 / 60).round();
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  /// Check if config is using fallback (not from remote)
  static Future<bool> isUsingFallback() async {
    final config = await getConfig();
    return config['source'] == 'hardcoded_fallback';
  }

  /// Get a specific URL list with fallback
  static Future<List<String>> getUrlList(
    String key,
    List<String> fallbackList, {
    bool forceRefresh = false,
  }) async {
    try {
      final config = await getConfig(forceRefresh: forceRefresh);
      final urls = config[key] as List<dynamic>?;

      if (urls != null && urls.isNotEmpty) {
        final urlList = urls.cast<String>();
        if (forceRefresh) {
          print('🔄 Force refresh returned ${urlList.length} URLs for $key');
        }
        return urlList;
      }
    } catch (e) {
      print('⚠️ Error getting URL list for $key: $e');
    }

    print('⚠️ Using fallback list for $key (${fallbackList.length} URLs)');
    return fallbackList;
  }
}
