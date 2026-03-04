import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/content_feedback.dart';

/// Service for managing user feedback on content links
/// Syncs with JavaScript localStorage for WebView consistency
class ContentFeedbackService {
  static const String _storageKey = 'mv3d_content_feedback';

  Map<String, ContentFeedback> _feedback = {};
  bool _initialized = false;

  /// Initialize the service
  Future<void> initialize() async {
    if (_initialized) return;

    await _loadFeedback();
    _initialized = true;
    print('✅ ContentFeedbackService initialized');
  }

  /// Load feedback from SharedPreferences
  Future<void> _loadFeedback() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_storageKey);

      if (jsonString != null) {
        final Map<String, dynamic> feedbackMap = jsonDecode(jsonString);
        _feedback = feedbackMap.map(
          (url, data) => MapEntry(
            url,
            ContentFeedback.fromJson(data as Map<String, dynamic>),
          ),
        );
        print('📊 Loaded ${_feedback.length} feedback entries');
      }
    } catch (e) {
      print('⚠️ Failed to load feedback: $e');
      _feedback = {};
    }
  }

  /// Save feedback to SharedPreferences
  Future<void> _saveFeedback() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final feedbackMap = _feedback.map(
        (url, feedback) => MapEntry(url, feedback.toJson()),
      );
      final jsonString = jsonEncode(feedbackMap);
      await prefs.setString(_storageKey, jsonString);
    } catch (e) {
      print('⚠️ Failed to save feedback: $e');
    }
  }

  /// Record user feedback for a URL
  Future<void> recordFeedback({
    required String url,
    required String sentiment, // 'liked' or 'disliked'
    required String platform,
    String? title,
    String? genre,
  }) async {
    if (!_initialized) await initialize();

    if (sentiment != 'liked' && sentiment != 'disliked') {
      print('⚠️ Invalid sentiment: $sentiment');
      return;
    }

    final feedback = ContentFeedback(
      url: url,
      sentiment: sentiment,
      timestamp: DateTime.now(),
      platform: platform,
      title: title,
      genre: genre,
    );

    _feedback[url] = feedback;
    await _saveFeedback();

    print(
      '${sentiment == 'liked' ? '👍' : '👎'} Feedback recorded: ${title ?? url}',
    );
  }

  /// Get feedback for a specific URL
  ContentFeedback? getFeedback(String url) {
    if (!_initialized) return null;
    return _feedback[url];
  }

  /// Check if URL is liked
  bool isLiked(String url) {
    final feedback = getFeedback(url);
    return feedback?.isLiked ?? false;
  }

  /// Check if URL is disliked
  bool isDisliked(String url) {
    final feedback = getFeedback(url);
    return feedback?.isDisliked ?? false;
  }

  /// Remove feedback for a URL
  Future<void> removeFeedback(String url) async {
    if (!_initialized) await initialize();

    if (_feedback.containsKey(url)) {
      _feedback.remove(url);
      await _saveFeedback();
      print('🗑️ Feedback removed for: $url');
    }
  }

  /// Get all liked URLs
  List<String> getLikedUrls() {
    if (!_initialized) return [];
    return _feedback.values.where((f) => f.isLiked).map((f) => f.url).toList();
  }

  /// Get all disliked URLs
  List<String> getDislikedUrls() {
    if (!_initialized) return [];
    return _feedback.values
        .where((f) => f.isDisliked)
        .map((f) => f.url)
        .toList();
  }

  /// Get all feedback entries
  List<ContentFeedback> getAllFeedback() {
    if (!_initialized) return [];
    return _feedback.values.toList();
  }

  /// Get liked URLs by platform
  List<String> getLikedByPlatform(String platform) {
    if (!_initialized) return [];
    return _feedback.values
        .where((f) => f.isLiked && f.platform == platform)
        .map((f) => f.url)
        .toList();
  }

  /// Get liked URLs by genre
  List<String> getLikedByGenre(String genre) {
    if (!_initialized) return [];
    return _feedback.values
        .where((f) => f.isLiked && f.genre == genre)
        .map((f) => f.url)
        .toList();
  }

  /// Get feedback statistics
  FeedbackStats getStats() {
    if (!_initialized) {
      return FeedbackStats(
        total: 0,
        liked: 0,
        disliked: 0,
        platformDistribution: {},
        genreDistribution: {},
      );
    }

    final liked = _feedback.values.where((f) => f.isLiked).toList();
    final disliked = _feedback.values.where((f) => f.isDisliked).toList();

    // Platform distribution
    final platformDist = <String, int>{};
    for (var feedback in liked) {
      platformDist[feedback.platform] =
          (platformDist[feedback.platform] ?? 0) + 1;
    }

    // Genre distribution
    final genreDist = <String, int>{};
    for (var feedback in liked) {
      if (feedback.genre != null) {
        genreDist[feedback.genre!] = (genreDist[feedback.genre!] ?? 0) + 1;
      }
    }

    return FeedbackStats(
      total: _feedback.length,
      liked: liked.length,
      disliked: disliked.length,
      platformDistribution: platformDist,
      genreDistribution: genreDist,
    );
  }

  /// Clear all feedback
  Future<void> clearFeedback() async {
    if (!_initialized) await initialize();

    _feedback.clear();
    await _saveFeedback();
    print('🗑️ All feedback cleared');
  }

  /// Export feedback as JSON string
  String exportFeedback() {
    final feedbackMap = _feedback.map(
      (url, feedback) => MapEntry(url, feedback.toJson()),
    );
    return jsonEncode(feedbackMap);
  }

  /// Import feedback from JSON string
  Future<void> importFeedback(String jsonString) async {
    if (!_initialized) await initialize();

    try {
      final Map<String, dynamic> imported = jsonDecode(jsonString);
      final newFeedback = imported.map(
        (url, data) => MapEntry(
          url,
          ContentFeedback.fromJson(data as Map<String, dynamic>),
        ),
      );

      _feedback.addAll(newFeedback);
      await _saveFeedback();
      print('📥 Feedback imported successfully');
    } catch (e) {
      print('❌ Failed to import feedback: $e');
    }
  }

  /// Debug log current state
  void debugLog() {
    final stats = getStats();
    print('📊 Feedback Stats: $stats');
    print('👍 Liked URLs: ${getLikedUrls().length}');
    print('👎 Disliked URLs: ${getDislikedUrls().length}');
  }
}

/// Global instance
final contentFeedbackService = ContentFeedbackService();
