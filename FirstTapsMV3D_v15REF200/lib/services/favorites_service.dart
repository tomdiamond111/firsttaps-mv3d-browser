import 'dart:math';
import '../models/link_object.dart';
import '../models/link_interaction.dart';
import 'recommendations_storage.dart';
import '../config/recommendations_config.dart';

/// Service for tracking link interactions and calculating favorites
class FavoritesService {
  final RecommendationsStorage _storage = RecommendationsStorage.instance;

  /// Record that a link was opened/clicked
  Future<void> recordLinkOpen({
    required String url,
    required String title,
    required String platform,
    String? furnitureId,
  }) async {
    try {
      final interactions = await _storage.getInteractions();
      final existingIndex = interactions.indexWhere((i) => i.linkUrl == url);

      if (existingIndex >= 0) {
        // Update existing
        interactions[existingIndex].recordOpen();
      } else {
        // Create new
        final now = DateTime.now();
        interactions.add(
          LinkInteraction(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            linkUrl: url,
            linkTitle: title,
            platform: platform,
            openCount: 1,
            firstOpened: now,
            lastOpened: now,
            furnitureId: furnitureId,
          ),
        );
      }

      await _storage.saveInteractions(interactions);
      _logDebug('Recorded link open: $title');
    } catch (e) {
      _logError('Error recording link open: $e');
    }
  }

  /// Get favorite links based on interaction history
  Future<List<LinkObject>> getFavorites({int? limit}) async {
    try {
      final maxCount = limit ?? RecommendationsConfig.maxFavorites;
      final interactions = await _storage.getInteractions();

      if (interactions.isEmpty) {
        _logDebug('No interactions found for favorites');
        return [];
      }

      // Calculate scores for each interaction
      final scoredInteractions = <LinkInteraction, double>{};
      for (var interaction in interactions) {
        scoredInteractions[interaction] = _calculateFavoriteScore(interaction);
      }

      // Sort by score descending
      final sorted = scoredInteractions.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));

      // Take top N and convert to LinkObjects
      final favorites = sorted
          .take(maxCount)
          .map((entry) => _createLinkObjectFromInteraction(entry.key))
          .toList();

      _logDebug('Generated ${favorites.length} favorites');
      return favorites;
    } catch (e) {
      _logError('Error getting favorites: $e');
      return [];
    }
  }

  /// Calculate a weighted score for an interaction
  /// Formula: (recencyScore * 0.7) + (frequencyScore * 0.3)
  double _calculateFavoriteScore(LinkInteraction interaction) {
    // Recency score: exponential decay over time
    final daysSinceLastOpen = interaction.daysSinceLastOpened;
    final recencyDecay = RecommendationsConfig.favoritesRecencyDecayDays
        .toDouble();
    final recencyScore = exp(-daysSinceLastOpen / recencyDecay);

    // Frequency score: logarithmic to prevent dominance
    final frequencyScore = log(interaction.openCount + 1);

    // Weighted combination
    final score =
        (recencyScore * RecommendationsConfig.favoritesRecencyWeight) +
        (frequencyScore * RecommendationsConfig.favoritesFrequencyWeight);

    return score;
  }

  /// Create LinkObject from LinkInteraction
  LinkObject _createLinkObjectFromInteraction(LinkInteraction interaction) {
    return LinkObject(
      id: interaction.id,
      url: interaction.linkUrl,
      title: interaction.linkTitle,
      platform: interaction.platform,
      thumbnailUrl: null,
    );
  }

  /// Clean up old interactions
  Future<void> cleanupOldInteractions({
    int days = 90,
    int minOpenCount = 2,
  }) async {
    try {
      final interactions = await _storage.getInteractions();
      final cutoffTime = DateTime.now().subtract(Duration(days: days));

      final filtered = interactions.where((i) {
        return i.lastOpened.isAfter(cutoffTime) || i.openCount >= minOpenCount;
      }).toList();

      await _storage.saveInteractions(filtered);
      _logDebug('Cleaned up old interactions');
    } catch (e) {
      _logError('Error cleaning up interactions: $e');
    }
  }

  /// Get all interactions
  Future<List<LinkInteraction>> getAllInteractions() async {
    return await _storage.getInteractions();
  }

  /// Clear all interactions
  Future<void> clearAllInteractions() async {
    await _storage.saveInteractions([]);
    _logDebug('Cleared all interactions');
  }

  void _logDebug(String message) {
    if (RecommendationsConfig.enableDebugLogging) {
      print('[FavoritesService] $message');
    }
  }

  void _logError(String message) {
    print('[FavoritesService ERROR] $message');
  }
}
