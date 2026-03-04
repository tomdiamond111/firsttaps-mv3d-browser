import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Service for learning user content preferences through pattern detection
/// Automatically filters content based on repeated dislikes
class ContentPreferenceLearningService {
  static const String _storageKey = 'mv3d_content_preferences';
  static const String _dislikeMetadataKey = 'mv3d_dislike_metadata';
  static const int _patternDetectionThreshold = 3; // 3+ dislikes = auto-block

  // User's negative preferences (auto-detected from patterns)
  Set<String> _blockedLanguages = {};
  Set<String> _blockedChannels = {};
  Set<String> _blockedCountries = {};
  Set<String> _blockedKeywords = {};

  // Track dislike metadata for pattern detection
  List<Map<String, dynamic>> _dislikeHistory = [];

  bool _initialized = false;

  /// Initialize the service
  Future<void> initialize() async {
    if (_initialized) return;

    await _loadPreferences();
    await _loadDislikeHistory();
    _initialized = true;
    print('✅ ContentPreferenceLearningService initialized');
    _logCurrentFilters();
  }

  /// Load saved preferences from storage
  Future<void> _loadPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_storageKey);

      if (jsonString != null) {
        final Map<String, dynamic> data = jsonDecode(jsonString);
        _blockedLanguages =
            (data['blockedLanguages'] as List<dynamic>?)
                ?.cast<String>()
                .toSet() ??
            {};
        _blockedChannels =
            (data['blockedChannels'] as List<dynamic>?)
                ?.cast<String>()
                .toSet() ??
            {};
        _blockedCountries =
            (data['blockedCountries'] as List<dynamic>?)
                ?.cast<String>()
                .toSet() ??
            {};
        _blockedKeywords =
            (data['blockedKeywords'] as List<dynamic>?)
                ?.cast<String>()
                .toSet() ??
            {};
      }
    } catch (e) {
      print('⚠️ Failed to load content preferences: $e');
    }
  }

  /// Load dislike history for pattern detection
  Future<void> _loadDislikeHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_dislikeMetadataKey);

      if (jsonString != null) {
        final List<dynamic> data = jsonDecode(jsonString);
        _dislikeHistory = data.cast<Map<String, dynamic>>();
      }
    } catch (e) {
      print('⚠️ Failed to load dislike history: $e');
      _dislikeHistory = [];
    }
  }

  /// Save preferences to storage
  Future<void> _savePreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = {
        'blockedLanguages': _blockedLanguages.toList(),
        'blockedChannels': _blockedChannels.toList(),
        'blockedCountries': _blockedCountries.toList(),
        'blockedKeywords': _blockedKeywords.toList(),
      };
      await prefs.setString(_storageKey, jsonEncode(data));
    } catch (e) {
      print('⚠️ Failed to save content preferences: $e');
    }
  }

  /// Save dislike history to storage
  Future<void> _saveDislikeHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_dislikeMetadataKey, jsonEncode(_dislikeHistory));
    } catch (e) {
      print('⚠️ Failed to save dislike history: $e');
    }
  }

  /// Record a content dislike with metadata for pattern detection
  Future<void> recordDislike({
    required String url,
    required String title,
    String? language,
    String? channelTitle,
    String? channelId,
    String? country,
    List<String>? tags,
  }) async {
    if (!_initialized) await initialize();

    // Add to dislike history
    final metadata = {
      'url': url,
      'title': title,
      'language': language,
      'channelTitle': channelTitle,
      'channelId': channelId,
      'country': country,
      'tags': tags,
      'timestamp': DateTime.now().toIso8601String(),
    };

    _dislikeHistory.add(metadata);

    // Keep only last 100 dislikes to avoid storage bloat
    if (_dislikeHistory.length > 100) {
      _dislikeHistory.removeAt(0);
    }

    await _saveDislikeHistory();

    // Detect patterns and update filters
    await _detectAndApplyPatterns();
  }

  /// Detect patterns in dislike history and auto-block
  Future<void> _detectAndApplyPatterns() async {
    bool preferencesChanged = false;

    // Detect language patterns
    final languageCounts = <String, int>{};
    for (final dislike in _dislikeHistory) {
      final language = dislike['language'] as String?;
      if (language != null && language.isNotEmpty) {
        languageCounts[language] = (languageCounts[language] ?? 0) + 1;
      }
    }

    for (final entry in languageCounts.entries) {
      if (entry.value >= _patternDetectionThreshold &&
          !_blockedLanguages.contains(entry.key)) {
        _blockedLanguages.add(entry.key);
        preferencesChanged = true;
        print(
          '🔇 Auto-blocking language: ${entry.key} (disliked ${entry.value} times)',
        );
      }
    }

    // Detect channel patterns
    final channelCounts = <String, Map<String, dynamic>>{};
    for (final dislike in _dislikeHistory) {
      final channelId = dislike['channelId'] as String?;
      final channelTitle = dislike['channelTitle'] as String?;
      if (channelId != null && channelId.isNotEmpty) {
        channelCounts[channelId] = {
          'count': (channelCounts[channelId]?['count'] ?? 0) + 1,
          'title': channelTitle ?? channelId,
        };
      }
    }

    for (final entry in channelCounts.entries) {
      if (entry.value['count'] >= _patternDetectionThreshold &&
          !_blockedChannels.contains(entry.key)) {
        _blockedChannels.add(entry.key);
        preferencesChanged = true;
        print(
          '🔇 Auto-blocking channel: ${entry.value['title']} (disliked ${entry.value['count']} times)',
        );
      }
    }

    // Detect country patterns
    final countryCounts = <String, int>{};
    for (final dislike in _dislikeHistory) {
      final country = dislike['country'] as String?;
      if (country != null && country.isNotEmpty) {
        countryCounts[country] = (countryCounts[country] ?? 0) + 1;
      }
    }

    for (final entry in countryCounts.entries) {
      if (entry.value >= _patternDetectionThreshold &&
          !_blockedCountries.contains(entry.key)) {
        _blockedCountries.add(entry.key);
        preferencesChanged = true;
        print(
          '🔇 Auto-blocking country: ${entry.key} (disliked ${entry.value} times)',
        );
      }
    }

    // Detect keyword/genre patterns in tags and titles
    final keywordCounts = <String, int>{};
    final genreKeywords = [
      // Music genres
      'rap',
      'hiphop',
      'hip hop',
      'hip-hop',
      'metal',
      'death metal',
      'heavy metal',
      'reggaeton',
      'trap',
      'mumble rap',
      'drill',
      'gangsta rap',
      'k-pop',
      'kpop',
      'bollywood',
      'telugu',
      'tamil',
      'malayalam',
      'punjabi',
      'hindi',
      'spanish',
      'español',
      'en español',
      // Sports
      'partido',
      'cricket',
      'football',
      'soccer',
      // Gaming/Video Games
      'pokemon',
      'pokémon',
      'gaming',
      'gameplay',
      'gamer',
      'let\'s play',
      'lets play',
      'playthrough',
      'walkthrough',
      'roblox',
      'fortnite',
      'minecraft',
      'video game',
      'videogame',
      'game review',
      'speedrun',
      'stream',
      'twitch',
      'esport',
      'e-sport',
      'played',
      'gespielt', // German: played
      'spiel', // German: game
    ];

    for (final dislike in _dislikeHistory) {
      final title = (dislike['title'] as String?)?.toLowerCase() ?? '';
      final tags = (dislike['tags'] as List<dynamic>?)?.cast<String>() ?? [];

      // Check title and tags for genre keywords
      for (final keyword in genreKeywords) {
        final lowerKeyword = keyword.toLowerCase();
        if (title.contains(lowerKeyword) ||
            tags.any((tag) => tag.toLowerCase().contains(lowerKeyword))) {
          keywordCounts[lowerKeyword] = (keywordCounts[lowerKeyword] ?? 0) + 1;
        }
      }
    }

    for (final entry in keywordCounts.entries) {
      if (entry.value >= _patternDetectionThreshold &&
          !_blockedKeywords.contains(entry.key)) {
        _blockedKeywords.add(entry.key);
        preferencesChanged = true;
        print(
          '🔇 Auto-blocking keyword: "${entry.key}" (disliked ${entry.value} times)',
        );
      }
    }

    if (preferencesChanged) {
      await _savePreferences();
      _logCurrentFilters();
    }
  }

  /// Check if content should be filtered based on learned preferences
  bool shouldFilterContent({
    String? language,
    String? channelId,
    String? channelTitle,
    String? country,
    String? title,
    List<String>? tags,
  }) {
    if (!_initialized) return false;

    // Filter by language
    if (language != null && _blockedLanguages.contains(language)) {
      return true;
    }

    // Filter by channel
    if (channelId != null && _blockedChannels.contains(channelId)) {
      return true;
    }

    // Filter by country
    if (country != null && _blockedCountries.contains(country)) {
      return true;
    }

    // Filter by keywords in title or tags
    if (title != null || tags != null) {
      final lowerTitle = title?.toLowerCase() ?? '';
      final lowerTags = tags?.map((t) => t.toLowerCase()).toList() ?? [];

      for (final keyword in _blockedKeywords) {
        if (lowerTitle.contains(keyword) ||
            lowerTags.any((tag) => tag.contains(keyword))) {
          return true;
        }
      }
    }

    return false;
  }

  /// Log current filter status
  void _logCurrentFilters() {
    if (_blockedLanguages.isEmpty &&
        _blockedChannels.isEmpty &&
        _blockedCountries.isEmpty &&
        _blockedKeywords.isEmpty) {
      print('📊 No content filters active');
    } else {
      print('📊 Active content filters:');
      if (_blockedLanguages.isNotEmpty) {
        print('   Languages: ${_blockedLanguages.join(', ')}');
      }
      if (_blockedChannels.isNotEmpty) {
        print('   Channels: ${_blockedChannels.length} blocked');
      }
      if (_blockedCountries.isNotEmpty) {
        print('   Countries: ${_blockedCountries.join(', ')}');
      }
      if (_blockedKeywords.isNotEmpty) {
        print('   Keywords: ${_blockedKeywords.join(', ')}');
      }
    }
  }

  /// Get current blocked items (for UI display)
  Map<String, dynamic> getBlockedItems() {
    return {
      'languages': _blockedLanguages.toList(),
      'channels': _blockedChannels.toList(),
      'countries': _blockedCountries.toList(),
      'keywords': _blockedKeywords.toList(),
    };
  }

  /// Manually unblock an item
  Future<void> unblock({
    String? language,
    String? channelId,
    String? country,
    String? keyword,
  }) async {
    if (!_initialized) await initialize();

    bool changed = false;

    if (language != null && _blockedLanguages.remove(language)) {
      print('✅ Unblocked language: $language');
      changed = true;
    }

    if (channelId != null && _blockedChannels.remove(channelId)) {
      print('✅ Unblocked channel: $channelId');
      changed = true;
    }

    if (country != null && _blockedCountries.remove(country)) {
      print('✅ Unblocked country: $country');
      changed = true;
    }

    if (keyword != null && _blockedKeywords.remove(keyword)) {
      print('✅ Unblocked keyword: $keyword');
      changed = true;
    }

    if (changed) {
      await _savePreferences();
      _logCurrentFilters();
    }
  }

  /// Clear all learned preferences (reset)
  Future<void> clearAllPreferences() async {
    if (!_initialized) await initialize();

    _blockedLanguages.clear();
    _blockedChannels.clear();
    _blockedCountries.clear();
    _blockedKeywords.clear();
    _dislikeHistory.clear();

    await _savePreferences();
    await _saveDislikeHistory();

    print('🗑️ All content preferences cleared');
  }
}

/// Global singleton instance
final contentPreferenceLearningService = ContentPreferenceLearningService();
