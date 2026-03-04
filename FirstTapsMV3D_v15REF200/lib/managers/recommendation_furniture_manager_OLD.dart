import 'package:uuid/uuid.dart';
import '../models/recommendation_furniture.dart';
import '../models/link_object.dart';
import '../database/recommendation_furniture_dao.dart';
import '../database/recommendation_preferences_dao.dart';
import '../services/recommendation_service.dart';
import '../services/favorites_service.dart';
import '../config/recommendations_config.dart';

/// Manager for spawning, updating, and maintaining recommendation furniture
class RecommendationFurnitureManager {
  final RecommendationFurnitureDao _furnitureDao = RecommendationFurnitureDao();
  final RecommendationPreferencesDao _preferencesDao =
      RecommendationPreferencesDao();
  final RecommendationService _recommendationService = RecommendationService();
  final FavoritesService _favoritesService = FavoritesService();
  final Uuid _uuid = Uuid();

  /// Initialize recommendation furniture on first launch
  Future<void> initializeRecommendationFurniture() async {
    try {
      final prefs = await _preferencesDao.get();

      if (!prefs.enabled) {
        _logDebug('Recommendations disabled, skipping initialization');
        return;
      }

      // Check if furniture already exists, if so don't reinitialize
      final existing = await _furnitureDao.getAll();
      if (existing.isNotEmpty) {
        _logDebug('Recommendation furniture already initialized');
        return;
      }

      _logDebug('Initializing recommendation furniture for first time');

      // Spawn initial furniture
      if (prefs.showShorts) {
        await _spawnGalleryWall();
      }

      if (prefs.showAudio) {
        await _spawnSmallStage();
      }

      if (prefs.showMusicVideos) {
        await _spawnRiser();
      }

      // Always spawn bookshelf (favorites)
      await _spawnBookshelf();

      // Spawn amphitheatre
      await _spawnAmphitheatre();

      _logDebug('Recommendation furniture initialization complete');
    } catch (e) {
      _logError('Error initializing recommendation furniture: $e');
    }
  }

  /// Update Gallery Wall with daily trending shorts
  Future<void> updateGalleryWall() async {
    await _updateFurniture(
      furnitureType: RecommendationsConfig.furnitureGalleryWall,
      contentCategory: RecommendationsConfig.contentCategoryShorts,
      fetchContent: () => _recommendationService.fetchTrendingShorts(),
    );
  }

  /// Update Small Stage with trending music
  Future<void> updateSmallStage() async {
    await _updateFurniture(
      furnitureType: RecommendationsConfig.furnitureSmallStage,
      contentCategory: RecommendationsConfig.contentCategoryMusic,
      fetchContent: () => _recommendationService.fetchTrendingMusic(),
    );
  }

  /// Update Riser with trending music videos
  Future<void> updateRiser() async {
    await _updateFurniture(
      furnitureType: RecommendationsConfig.furnitureRiser,
      contentCategory: RecommendationsConfig.contentCategoryMusicVideos,
      fetchContent: () => _recommendationService.fetchTrendingMusicVideos(),
    );
  }

  /// Update Bookshelf with user favorites
  Future<void> updateBookshelf() async {
    await _updateFurniture(
      furnitureType: RecommendationsConfig.furnitureBookshelf,
      contentCategory: RecommendationsConfig.contentCategoryFavorites,
      fetchContent: () => _favoritesService.getFavorites(),
    );
  }

  /// Update Amphitheatre with mixed content
  Future<void> updateAmphitheatre() async {
    await _updateFurniture(
      furnitureType: RecommendationsConfig.furnitureAmphitheatre,
      contentCategory: RecommendationsConfig.contentCategoryMixed,
      fetchContent: () => _recommendationService.fetchMixedContent(),
    );
  }

  /// Core furniture update logic: replace oldest unmodified or spawn new
  Future<void> _updateFurniture({
    required String furnitureType,
    required String contentCategory,
    required Future<List<LinkObject>> Function() fetchContent,
  }) async {
    try {
      _logDebug('Updating furniture: $furnitureType');

      // Check if recommendations are enabled
      final prefs = await _preferencesDao.get();
      if (!prefs.enabled) {
        _logDebug('Recommendations disabled, skipping update');
        return;
      }

      // Fetch new content
      final newLinks = await fetchContent();

      if (newLinks.isEmpty) {
        _logDebug('No content fetched for $furnitureType, skipping update');
        return;
      }

      // Get existing furniture of this type
      final existing = await _furnitureDao.getByType(furnitureType);

      // Find unmodified instances
      final unmodified = existing.where((f) => !f.isModified).toList();

      if (unmodified.isEmpty) {
        // All existing furniture is modified, spawn new
        _logDebug('All $furnitureType furniture is modified, spawning new');
        await _spawnFurniture(
          furnitureType: furnitureType,
          contentCategory: contentCategory,
          links: newLinks,
        );
      } else {
        // Replace oldest unmodified furniture
        unmodified.sort((a, b) => a.spawnedAt.compareTo(b.spawnedAt));
        final toReplace = unmodified.first;

        _logDebug(
          'Replacing oldest unmodified $furnitureType (id: ${toReplace.id})',
        );

        // Update furniture with new content
        final updated = toReplace.copyWith(
          links: newLinks,
          lastUpdated: DateTime.now(),
        );

        await _furnitureDao.update(updated);
        _logDebug(
          'Updated $furnitureType furniture with ${newLinks.length} new links',
        );
      }
    } catch (e) {
      _logError('Error updating furniture $furnitureType: $e');
    }
  }

  /// Spawn new Gallery Wall furniture
  Future<void> _spawnGalleryWall() async {
    final links = await _recommendationService.fetchTrendingShorts();
    await _spawnFurniture(
      furnitureType: RecommendationsConfig.furnitureGalleryWall,
      contentCategory: RecommendationsConfig.contentCategoryShorts,
      links: links,
    );
  }

  /// Spawn new Small Stage furniture
  Future<void> _spawnSmallStage() async {
    final links = await _recommendationService.fetchTrendingMusic();
    await _spawnFurniture(
      furnitureType: RecommendationsConfig.furnitureSmallStage,
      contentCategory: RecommendationsConfig.contentCategoryMusic,
      links: links,
    );
  }

  /// Spawn new Riser furniture
  Future<void> _spawnRiser() async {
    final links = await _recommendationService.fetchTrendingMusicVideos();
    await _spawnFurniture(
      furnitureType: RecommendationsConfig.furnitureRiser,
      contentCategory: RecommendationsConfig.contentCategoryMusicVideos,
      links: links,
    );
  }

  /// Spawn new Bookshelf furniture
  Future<void> _spawnBookshelf() async {
    final links = await _favoritesService.getFavorites();
    await _spawnFurniture(
      furnitureType: RecommendationsConfig.furnitureBookshelf,
      contentCategory: RecommendationsConfig.contentCategoryFavorites,
      links: links.isEmpty ? [] : links, // Empty bookshelf is OK initially
    );
  }

  /// Spawn new Amphitheatre furniture
  Future<void> _spawnAmphitheatre() async {
    final links = await _recommendationService.fetchMixedContent();
    await _spawnFurniture(
      furnitureType: RecommendationsConfig.furnitureAmphitheatre,
      contentCategory: RecommendationsConfig.contentCategoryMixed,
      links: links,
    );
  }

  /// Generic spawn furniture method
  Future<void> _spawnFurniture({
    required String furnitureType,
    required String contentCategory,
    required List<LinkObject> links,
  }) async {
    try {
      final now = DateTime.now();
      final furniture = RecommendationFurniture(
        id: _uuid.v4(),
        furnitureType: furnitureType,
        isRecommendation: true,
        isModified: false,
        lastUpdated: now,
        spawnedAt: now,
        links: links,
        contentCategory: contentCategory,
        originalLinkCount: links.length,
      );

      await _furnitureDao.insert(furniture);
      _logDebug('Spawned $furnitureType furniture with ${links.length} links');
    } catch (e) {
      _logError('Error spawning furniture: $e');
    }
  }

  /// Mark furniture as modified (called when user edits it)
  Future<void> markFurnitureAsModified(String furnitureId) async {
    try {
      await _furnitureDao.markAsModified(furnitureId);
      _logDebug('Marked furniture $furnitureId as modified');
    } catch (e) {
      _logError('Error marking furniture as modified: $e');
    }
  }

  /// Delete furniture and handle respawn logic
  Future<void> deleteFurniture(String furnitureId) async {
    try {
      await _furnitureDao.delete(furnitureId);
      _logDebug('Deleted furniture $furnitureId');

      // Note: Furniture will respawn on next scheduled update if recommendations enabled
    } catch (e) {
      _logError('Error deleting furniture: $e');
    }
  }

  /// Get all recommendation furniture
  Future<List<RecommendationFurniture>> getAllFurniture() async {
    return await _furnitureDao.getAll();
  }

  /// Get furniture by type
  Future<List<RecommendationFurniture>> getFurnitureByType(String type) async {
    return await _furnitureDao.getByType(type);
  }

  /// Check if furniture needs update based on last update time
  Future<bool> needsUpdate(String furnitureType) async {
    try {
      final furniture = await _furnitureDao.getByType(furnitureType);
      if (furniture.isEmpty) return true;

      // Find most recent update
      furniture.sort((a, b) => b.lastUpdated.compareTo(a.lastUpdated));
      final mostRecent = furniture.first;

      final daysSinceUpdate = DateTime.now()
          .difference(mostRecent.lastUpdated)
          .inDays;

      // Check against configured intervals
      switch (furnitureType) {
        case RecommendationsConfig.furnitureGalleryWall:
          return daysSinceUpdate >= RecommendationsConfig.shortsUpdateInterval;
        case RecommendationsConfig.furnitureSmallStage:
        case RecommendationsConfig.furnitureRiser:
          return daysSinceUpdate >= RecommendationsConfig.musicUpdateInterval;
        case RecommendationsConfig.furnitureBookshelf:
          return daysSinceUpdate >=
              RecommendationsConfig.favoritesUpdateInterval;
        case RecommendationsConfig.furnitureAmphitheatre:
          return daysSinceUpdate >= RecommendationsConfig.videoUpdateInterval;
        default:
          return false;
      }
    } catch (e) {
      _logError('Error checking if furniture needs update: $e');
      return false;
    }
  }

  /// Execute scheduled daily update (Gallery Wall)
  Future<void> executeDailyUpdate() async {
    _logDebug('Executing daily recommendation update');

    final prefs = await _preferencesDao.get();
    if (!prefs.enabled) {
      _logDebug('Recommendations disabled, skipping daily update');
      return;
    }

    // Update Gallery Wall (shorts) daily
    await updateGalleryWall();

    // Update favorites daily
    await updateBookshelf();

    _logDebug('Daily update complete');
  }

  /// Execute scheduled weekly update (all other furniture)
  Future<void> executeWeeklyUpdate() async {
    _logDebug('Executing weekly recommendation update');

    final prefs = await _preferencesDao.get();
    if (!prefs.enabled) {
      _logDebug('Recommendations disabled, skipping weekly update');
      return;
    }

    // Update all furniture except gallery wall
    await updateSmallStage();
    await updateRiser();
    await updateAmphitheatre();

    _logDebug('Weekly update complete');
  }

  void _logDebug(String message) {
    if (RecommendationsConfig.enableDebugLogging) {
      print('[RecommendationFurnitureManager] $message');
    }
  }

  void _logError(String message) {
    print('[RecommendationFurnitureManager ERROR] $message');
  }
}
