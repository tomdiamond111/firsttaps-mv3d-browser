import 'dart:convert';
import '../models/link_interaction.dart';
import '../models/link_object.dart';
import 'recommendations_storage.dart';
import 'dart:developer' as developer;

/// Service for tracking user interactions and generating personalized recommendations
class UserActivityService {
  static final UserActivityService instance = UserActivityService._init();
  UserActivityService._init();

  final RecommendationsStorage _storage = RecommendationsStorage.instance;

  /// Record a link being opened
  Future<void> recordLinkOpen({
    required String url,
    required String title,
    required String platform,
    String? furnitureId,
    String? artist,
    String? genre,
  }) async {
    try {
      final interactions = await _storage.getInteractions();

      // Find existing interaction
      final existingIndex = interactions.indexWhere((i) => i.linkUrl == url);

      if (existingIndex >= 0) {
        // Update existing
        final existing = interactions[existingIndex];
        existing.recordOpen();
        interactions[existingIndex] = existing;
      } else {
        // Create new
        final newInteraction = LinkInteraction(
          id: 'int_${DateTime.now().millisecondsSinceEpoch}',
          linkUrl: url,
          linkTitle: title,
          platform: platform,
          openCount: 1,
          firstOpened: DateTime.now(),
          lastOpened: DateTime.now(),
          furnitureId: furnitureId,
        );
        interactions.add(newInteraction);
      }

      await _storage.saveInteractions(interactions);
      _logDebug(
        'Recorded link open: $title (opens: ${interactions.firstWhere((i) => i.linkUrl == url).openCount})',
      );
    } catch (e) {
      _logError('Error recording link open: $e');
    }
  }

  /// Get most played links (for bookshelf favorites)
  Future<List<LinkInteraction>> getMostPlayedLinks({int limit = 15}) async {
    try {
      final interactions = await _storage.getInteractions();

      // Sort by open count descending, then by recency
      interactions.sort((a, b) {
        // First sort by open count
        final countCompare = b.openCount.compareTo(a.openCount);
        if (countCompare != 0) return countCompare;

        // If equal, sort by recency
        return b.lastOpened.compareTo(a.lastOpened);
      });

      return interactions.take(limit).toList();
    } catch (e) {
      _logError('Error getting most played links: $e');
      return [];
    }
  }

  /// Get recently played links (last 7 days)
  Future<List<LinkInteraction>> getRecentlyPlayedLinks({int days = 7}) async {
    try {
      final interactions = await _storage.getInteractions();
      final cutoffDate = DateTime.now().subtract(Duration(days: days));

      return interactions
          .where((i) => i.lastOpened.isAfter(cutoffDate))
          .toList()
        ..sort((a, b) => b.lastOpened.compareTo(a.lastOpened));
    } catch (e) {
      _logError('Error getting recently played links: $e');
      return [];
    }
  }

  /// Get favorite platforms (platforms user interacts with most)
  Future<Map<String, int>> getPlatformPreferences() async {
    try {
      final interactions = await _storage.getInteractions();
      final Map<String, int> platformCounts = {};

      for (final interaction in interactions) {
        platformCounts[interaction.platform] =
            (platformCounts[interaction.platform] ?? 0) + interaction.openCount;
      }

      // Sort by count
      final sortedEntries = platformCounts.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));

      return Map.fromEntries(sortedEntries);
    } catch (e) {
      _logError('Error getting platform preferences: $e');
      return {};
    }
  }

  /// Extract artist name from link metadata or title
  String? extractArtistFromTitle(String title) {
    // Common patterns: "Artist - Song", "Song by Artist", "Artist: Song"
    final patterns = [
      RegExp(r'^([^-]+)\s*-\s*', caseSensitive: false),
      RegExp(r'\s+by\s+([^(]+)', caseSensitive: false),
      RegExp(r'^([^:]+):\s*', caseSensitive: false),
    ];

    for (final pattern in patterns) {
      final match = pattern.firstMatch(title);
      if (match != null && match.groupCount > 0) {
        return match.group(1)?.trim();
      }
    }

    return null;
  }

  /// Get top artists based on user interactions
  Future<Map<String, int>> getTopArtists({int limit = 10}) async {
    try {
      final interactions = await _storage.getInteractions();
      final Map<String, int> artistCounts = {};

      for (final interaction in interactions) {
        final artist = extractArtistFromTitle(interaction.linkTitle);
        if (artist != null && artist.isNotEmpty) {
          artistCounts[artist] =
              (artistCounts[artist] ?? 0) + interaction.openCount;
        }
      }

      // Sort by count and take top N
      final sortedEntries = artistCounts.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));

      return Map.fromEntries(sortedEntries.take(limit));
    } catch (e) {
      _logError('Error getting top artists: $e');
      return {};
    }
  }

  /// Get links that haven't been interacted with much (potential to remove)
  Future<List<String>> getLowEngagementUrls({
    int maxOpens = 1,
    int minDaysOld = 7,
  }) async {
    try {
      final interactions = await _storage.getInteractions();
      final cutoffDate = DateTime.now().subtract(Duration(days: minDaysOld));

      return interactions
          .where(
            (i) =>
                i.openCount <= maxOpens && i.firstOpened.isBefore(cutoffDate),
          )
          .map((i) => i.linkUrl)
          .toList();
    } catch (e) {
      _logError('Error getting low engagement URLs: $e');
      return [];
    }
  }

  /// Clear all interaction history (for privacy/reset)
  Future<void> clearAllInteractions() async {
    try {
      await _storage.saveInteractions([]);
      _logDebug('Cleared all user interactions');
    } catch (e) {
      _logError('Error clearing interactions: $e');
    }
  }

  /// Get statistics summary
  Future<Map<String, dynamic>> getStatistics() async {
    try {
      final interactions = await _storage.getInteractions();
      final totalOpens = interactions.fold<int>(
        0,
        (sum, i) => sum + i.openCount,
      );
      final platforms = await getPlatformPreferences();
      final topArtists = await getTopArtists(limit: 5);

      return {
        'totalLinks': interactions.length,
        'totalOpens': totalOpens,
        'avgOpensPerLink': interactions.isEmpty
            ? 0
            : totalOpens / interactions.length,
        'topPlatform': platforms.isEmpty ? 'none' : platforms.keys.first,
        'topArtists': topArtists.keys.toList(),
      };
    } catch (e) {
      _logError('Error getting statistics: $e');
      return {};
    }
  }

  /// Mark a link as hidden/deleted by user - will not show in future furniture refreshes
  Future<void> hideLink(String url) async {
    try {
      final interactions = await _storage.getInteractions();
      final existingIndex = interactions.indexWhere((i) => i.linkUrl == url);

      if (existingIndex >= 0) {
        // Update existing interaction
        interactions[existingIndex].markAsHidden();
      } else {
        // Create new interaction to track the hidden state
        final newInteraction = LinkInteraction(
          id: 'hidden_${DateTime.now().millisecondsSinceEpoch}',
          linkUrl: url,
          linkTitle: 'Hidden Link',
          platform: 'unknown',
          openCount: 0,
          firstOpened: DateTime.now(),
          lastOpened: DateTime.now(),
          isHidden: true,
          hiddenAt: DateTime.now(),
        );
        interactions.add(newInteraction);
      }

      await _storage.saveInteractions(interactions);
      _logDebug('Hidden link: $url');
    } catch (e) {
      _logError('Error hiding link: $e');
    }
  }

  /// Unhide a previously hidden link
  Future<void> unhideLink(String url) async {
    try {
      final interactions = await _storage.getInteractions();
      final existingIndex = interactions.indexWhere((i) => i.linkUrl == url);

      if (existingIndex >= 0) {
        interactions[existingIndex].markAsVisible();
        await _storage.saveInteractions(interactions);
        _logDebug('Unhidden link: $url');
      }
    } catch (e) {
      _logError('Error unhiding link: $e');
    }
  }

  /// Get list of URLs that user has hidden
  Future<Set<String>> getHiddenLinkUrls() async {
    try {
      final interactions = await _storage.getInteractions();
      return interactions
          .where((i) => i.isHidden)
          .map((i) => i.linkUrl)
          .toSet();
    } catch (e) {
      _logError('Error getting hidden links: $e');
      return {};
    }
  }

  /// Get count of hidden links
  Future<int> getHiddenLinkCount() async {
    try {
      final interactions = await _storage.getInteractions();
      return interactions.where((i) => i.isHidden).length;
    } catch (e) {
      _logError('Error getting hidden link count: $e');
      return 0;
    }
  }

  void _logDebug(String message) {
    developer.log(message, name: 'UserActivityService');
  }

  void _logError(String message) {
    developer.log(message, name: 'UserActivityService', error: message);
  }
}
