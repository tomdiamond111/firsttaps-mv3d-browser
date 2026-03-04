/// Model for user feedback on content links
class ContentFeedback {
  final String url;
  final String sentiment; // 'liked' or 'disliked'
  final DateTime timestamp;
  final String platform; // youtube, spotify, tiktok, etc.
  final String? title;
  final String? genre;

  ContentFeedback({
    required this.url,
    required this.sentiment,
    required this.timestamp,
    required this.platform,
    this.title,
    this.genre,
  });

  /// Create from JSON
  factory ContentFeedback.fromJson(Map<String, dynamic> json) {
    return ContentFeedback(
      url: json['url'] as String,
      sentiment: json['sentiment'] as String,
      timestamp: DateTime.fromMillisecondsSinceEpoch(json['timestamp'] as int),
      platform: json['platform'] as String,
      title: json['title'] as String?,
      genre: json['genre'] as String?,
    );
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'url': url,
      'sentiment': sentiment,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'platform': platform,
      if (title != null) 'title': title,
      if (genre != null) 'genre': genre,
    };
  }

  /// Check if feedback is a like
  bool get isLiked => sentiment == 'liked';

  /// Check if feedback is a dislike
  bool get isDisliked => sentiment == 'disliked';

  @override
  String toString() {
    return 'ContentFeedback(url: $url, sentiment: $sentiment, platform: $platform, title: $title)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ContentFeedback && other.url == url;
  }

  @override
  int get hashCode => url.hashCode;
}

/// Statistics about user feedback
class FeedbackStats {
  final int total;
  final int liked;
  final int disliked;
  final Map<String, int> platformDistribution;
  final Map<String, int> genreDistribution;

  FeedbackStats({
    required this.total,
    required this.liked,
    required this.disliked,
    required this.platformDistribution,
    required this.genreDistribution,
  });

  factory FeedbackStats.fromJson(Map<String, dynamic> json) {
    return FeedbackStats(
      total: json['total'] as int? ?? 0,
      liked: json['liked'] as int? ?? 0,
      disliked: json['disliked'] as int? ?? 0,
      platformDistribution: Map<String, int>.from(
        json['platformDistribution'] as Map? ?? {},
      ),
      genreDistribution: Map<String, int>.from(
        json['genreDistribution'] as Map? ?? {},
      ),
    );
  }

  /// Get most liked platform
  String? get topPlatform {
    if (platformDistribution.isEmpty) return null;
    return platformDistribution.entries
        .reduce((a, b) => a.value > b.value ? a : b)
        .key;
  }

  /// Get most liked genre
  String? get topGenre {
    if (genreDistribution.isEmpty) return null;
    return genreDistribution.entries
        .reduce((a, b) => a.value > b.value ? a : b)
        .key;
  }

  @override
  String toString() {
    return 'FeedbackStats(total: $total, liked: $liked, disliked: $disliked, '
        'topPlatform: $topPlatform, topGenre: $topGenre)';
  }
}
