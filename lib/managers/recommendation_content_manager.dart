import 'dart:convert';
import '../models/link_object.dart';
import '../services/recommendation_service.dart';
import '../services/favorites_service.dart';
import '../services/recommendations_storage.dart';
import '../config/recommendations_config.dart';

/// Simplified manager that integrates with existing demo furniture system - JSON-based
class RecommendationContentManager {
  final RecommendationService _recommendationService = RecommendationService();
  final FavoritesService _favoritesService = FavoritesService();
  final RecommendationsStorage _storage = RecommendationsStorage.instance;

  /// Get links for Gallery Wall (trending shorts - daily)
  /// OPTIMIZED: Returns cached data immediately, fetches fresh data in background
  /// VALIDATION: Ensures only video content (YouTube, TikTok, Instagram) - no audio
  Future<List<LinkObject>> getGalleryWallLinks({
    bool forceRefresh = false,
  }) async {
    _logDebug('getGalleryWallLinks() called (forceRefresh: $forceRefresh)');

    // If force refresh, skip cache and fetch fresh data
    if (forceRefresh) {
      _logDebug('Force refresh - fetching fresh Gallery Wall content...');
      final freshLinks = await _recommendationService.fetchTrendingShorts(
        forceRefresh: true,
      );
      _logDebug('Force refresh returned ${freshLinks.length} links');

      // CRITICAL: If force refresh returns empty, log detailed warning
      if (freshLinks.isEmpty) {
        _logDebug(
          '⚠️ CRITICAL: Force refresh returned ZERO links for Gallery Wall!',
        );
        _logDebug('   - Check if YouTube API is working');
        _logDebug('   - Check if enableYouTubeContent is true');
        _logDebug('   - Check if content is being filtered out by dislikes');
      }

      return freshLinks;
    }

    // Always try cache first for instant load
    var cachedLinks = await _getCachedLinks(
      RecommendationsConfig.contentCategoryShorts,
    );

    _logDebug('Cache returned ${cachedLinks.length} links');
    if (cachedLinks.isNotEmpty) {
      final platforms = cachedLinks.map((l) => l.platform).toSet().join(', ');
      _logDebug('Cached platforms: $platforms');
    } else {
      _logDebug('⚠️ Cache is EMPTY for Gallery Wall');
    }

    // CRITICAL: Filter out any audio-only platforms (Spotify, Deezer)
    // Gallery Wall should ONLY have videos
    final originalCount = cachedLinks.length;
    cachedLinks = cachedLinks.where((link) {
      return link.platform != RecommendationsConfig.platformSpotify &&
          link.platform != RecommendationsConfig.platformDeezer;
    }).toList();

    if (originalCount > cachedLinks.length) {
      _logDebug(
        '⚠️ Filtered out ${originalCount - cachedLinks.length} audio links from Gallery Wall cache',
      );
    }

    // If cache had invalid content (audio on Gallery Wall), clear it and force refresh
    if (cachedLinks.isEmpty && originalCount > 0) {
      await _storage.deleteCachedRecommendation(
        RecommendationsConfig.contentCategoryShorts,
      );
      _logDebug(
        'Cleared invalid Gallery Wall cache (contained only audio content)',
      );
    }

    // If we have cache and it's not stale, return it immediately
    if (cachedLinks.isNotEmpty &&
        !await _shouldUpdate(RecommendationsConfig.furnitureGalleryWall)) {
      return cachedLinks;
    }

    // If cache is empty, fetch synchronously to ensure we have content
    // If cache is stale but exists, fetch in background
    if (cachedLinks.isEmpty) {
      _logDebug('No cache - fetching Gallery Wall content synchronously...');
      final freshLinks = await _recommendationService.fetchTrendingShorts();
      _logDebug('Fresh fetch returned ${freshLinks.length} links');
      if (freshLinks.isNotEmpty) {
        final platforms = freshLinks.map((l) => l.platform).toSet().join(', ');
        _logDebug('Fresh platforms: $platforms');
      }
      return freshLinks;
    }

    // Cache exists but is stale - fetch in background, return stale cache
    if (await _shouldUpdate(RecommendationsConfig.furnitureGalleryWall)) {
      _fetchAndCacheInBackground(
        RecommendationsConfig.furnitureGalleryWall,
        RecommendationsConfig.contentCategoryShorts,
        () => _recommendationService.fetchTrendingShorts(),
      );
    }

    return cachedLinks;
  }

  /// Get links for Small Stage (trending music - 5-7 days)
  /// OPTIMIZED: Returns cached data immediately
  Future<List<LinkObject>> getSmallStageLinks({
    bool forceRefresh = false,
  }) async {
    // If force refresh, skip cache and fetch fresh data
    if (forceRefresh) {
      _logDebug('Force refresh - fetching fresh Small Stage content...');
      return await _recommendationService.fetchTrendingMusic(
        forceRefresh: true,
      );
    }

    final cachedLinks = await _getCachedLinks(
      RecommendationsConfig.contentCategoryMusic,
    );

    if (cachedLinks.isNotEmpty &&
        !await _shouldUpdate(RecommendationsConfig.furnitureSmallStage)) {
      return cachedLinks;
    }

    if (await _shouldUpdate(RecommendationsConfig.furnitureSmallStage)) {
      _fetchAndCacheInBackground(
        RecommendationsConfig.furnitureSmallStage,
        RecommendationsConfig.contentCategoryMusic,
        () => _recommendationService.fetchTrendingMusic(),
      );
    }

    return cachedLinks;
  }

  /// Get links for Riser (music videos - 5-7 days)
  /// OPTIMIZED: Returns cached data immediately
  /// VALIDATION: Ensures only video content (YouTube, Vimeo, TikTok) - no audio
  Future<List<LinkObject>> getRiserLinks({bool forceRefresh = false}) async {
    // If force refresh, skip cache and fetch fresh data
    if (forceRefresh) {
      _logDebug('Force refresh - fetching fresh Riser content...');
      final freshLinks = await _recommendationService.fetchTrendingMusicVideos(
        forceRefresh: true,
      );
      // Filter out audio-only platforms
      return freshLinks.where((link) {
        return link.platform != RecommendationsConfig.platformSpotify &&
            link.platform != RecommendationsConfig.platformDeezer &&
            link.platform != RecommendationsConfig.platformSoundCloud;
      }).toList();
    }

    var cachedLinks = await _getCachedLinks(
      RecommendationsConfig.contentCategoryMusicVideos,
    );

    // CRITICAL: Filter out audio-only platforms (Spotify, Deezer, SoundCloud)
    // Riser should ONLY have music VIDEOS, not audio tracks
    cachedLinks = cachedLinks.where((link) {
      return link.platform != RecommendationsConfig.platformSpotify &&
          link.platform != RecommendationsConfig.platformDeezer &&
          link.platform != RecommendationsConfig.platformSoundCloud;
    }).toList();

    // If cache had invalid content (audio on Riser), clear it and force refresh
    if (cachedLinks.isEmpty) {
      await _storage.deleteCachedRecommendation(
        RecommendationsConfig.contentCategoryMusicVideos,
      );
      _logDebug('Cleared invalid Riser cache (contained audio content)');
      _logDebug('No cache - fetching Riser content synchronously...');

      // Fetch synchronously when cache is empty
      final freshLinks = await _recommendationService
          .fetchTrendingMusicVideos();
      _logDebug('Fresh fetch returned ${freshLinks.length} links');

      // Filter again in case service returned audio
      final videoLinks = freshLinks.where((link) {
        return link.platform != RecommendationsConfig.platformSpotify &&
            link.platform != RecommendationsConfig.platformDeezer &&
            link.platform != RecommendationsConfig.platformSoundCloud;
      }).toList();

      if (videoLinks.isNotEmpty) {
        _logDebug(
          'Fresh platforms: ${videoLinks.map((l) => l.platform).toSet()}',
        );
      }

      return videoLinks;
    }

    // Cache exists and is valid
    if (!await _shouldUpdate(RecommendationsConfig.furnitureRiser)) {
      return cachedLinks;
    }

    // Cache exists but needs update - do it in background
    _fetchAndCacheInBackground(
      RecommendationsConfig.furnitureRiser,
      RecommendationsConfig.contentCategoryMusicVideos,
      () => _recommendationService.fetchTrendingMusicVideos(),
    );

    return cachedLinks;
  }

  /// Get links for Bookshelf (user favorites - daily)
  Future<List<LinkObject>> getBookshelfLinks() async {
    // Always fetch fresh favorites
    final links = await _favoritesService.getFavorites();
    await _storage.setLastUpdateTime(
      RecommendationsConfig.furnitureBookshelf,
      DateTime.now(),
    );
    return links;
  }

  /// Get links for Amphitheatre (mixed content - weekly)
  Future<List<LinkObject>> getAmphitheatreLinks({
    bool forceRefresh = false,
  }) async {
    // If force refresh, skip cache and fetch fresh data
    if (forceRefresh) {
      _logDebug('Force refresh - fetching fresh Amphitheatre content...');
      final links = await _recommendationService.fetchMixedContent();
      await _storage.setLastUpdateTime(
        RecommendationsConfig.furnitureAmphitheatre,
        DateTime.now(),
      );
      return links;
    }

    if (!await _shouldUpdate(RecommendationsConfig.furnitureAmphitheatre)) {
      return _getCachedLinks(RecommendationsConfig.contentCategoryMixed);
    }

    final links = await _recommendationService.fetchMixedContent();
    await _storage.setLastUpdateTime(
      RecommendationsConfig.furnitureAmphitheatre,
      DateTime.now(),
    );
    return links;
  }

  /// Check if furniture type needs update based on configured intervals
  Future<bool> _shouldUpdate(String furnitureType) async {
    final lastUpdate = await _storage.getLastUpdateTime(furnitureType);
    if (lastUpdate == null) return true;

    final daysSinceUpdate = DateTime.now().difference(lastUpdate).inDays;

    switch (furnitureType) {
      case RecommendationsConfig.furnitureGalleryWall:
        return daysSinceUpdate >= RecommendationsConfig.shortsUpdateInterval;
      case RecommendationsConfig.furnitureSmallStage:
      case RecommendationsConfig.furnitureRiser:
        return daysSinceUpdate >= RecommendationsConfig.musicUpdateInterval;
      case RecommendationsConfig.furnitureBookshelf:
        return daysSinceUpdate >= RecommendationsConfig.favoritesUpdateInterval;
      case RecommendationsConfig.furnitureAmphitheatre:
        return daysSinceUpdate >= RecommendationsConfig.videoUpdateInterval;
      default:
        return false;
    }
  }

  /// Get cached links for content type
  Future<List<LinkObject>> _getCachedLinks(String contentType) async {
    final cached = await _storage.getCachedRecommendation(contentType);
    if (cached != null && cached.isValid) {
      // Parse JSON and return links
      try {
        final jsonList = json.decode(cached.contentJson) as List;
        return jsonList.map((item) => LinkObject.fromMap(item)).toList();
      } catch (e) {
        _logError('Error parsing cached links: $e');
        return [];
      }
    }
    return [];
  }

  /// Mark furniture as modified by user (no longer replace with recommendations)
  Future<void> markFurnitureAsModified(String furnitureId) async {
    await _storage.markFurnitureAsModified(furnitureId);
    _logDebug('Marked furniture $furnitureId as modified');
  }

  /// Check if furniture is modified
  Future<bool> isFurnitureModified(String furnitureId) async {
    return await _storage.isFurnitureModified(furnitureId);
  }

  /// Record a link was opened (for favorites tracking)
  Future<void> recordLinkOpen({
    required String url,
    required String title,
    required String platform,
    String? furnitureId,
  }) async {
    await _favoritesService.recordLinkOpen(
      url: url,
      title: title,
      platform: platform,
      furnitureId: furnitureId,
    );
  }

  /// Update all recommendation content (for manual refresh)
  Future<void> refreshAllContent() async {
    final prefs = await _storage.getPreferences();
    if (!prefs.enabled) {
      _logDebug('Recommendations disabled');
      return;
    }

    _logDebug('Refreshing all recommendation content');

    if (prefs.showShorts) {
      await getGalleryWallLinks();
    }

    if (prefs.showAudio) {
      await getSmallStageLinks();
    }

    if (prefs.showMusicVideos) {
      await getRiserLinks();
    }

    await getBookshelfLinks();
    await getAmphitheatreLinks();

    _logDebug('Content refresh complete');
  }

  /// Check if recommendations are enabled
  Future<bool> isEnabled() async {
    final prefs = await _storage.getPreferences();
    return prefs.enabled && RecommendationsConfig.enableRecommendations;
  }

  /// Fetch and cache content in background without blocking
  void _fetchAndCacheInBackground(
    String furnitureType,
    String contentType,
    Future<List<LinkObject>> Function() fetchFunction,
  ) {
    Future(() async {
      try {
        _logDebug('Background fetch started for $furnitureType');
        final links = await fetchFunction();
        await _storage.setLastUpdateTime(furnitureType, DateTime.now());
        _logDebug(
          'Background fetch complete for $furnitureType: ${links.length} items',
        );
      } catch (e) {
        _logError('Background fetch failed for $furnitureType: $e');
      }
    });
  }

  void _logDebug(String message) {
    if (RecommendationsConfig.enableDebugLogging) {
      print('[RecommendationContentManager] $message');
    }
  }

  void _logError(String message) {
    print('[RecommendationContentManager ERROR] $message');
  }
}
