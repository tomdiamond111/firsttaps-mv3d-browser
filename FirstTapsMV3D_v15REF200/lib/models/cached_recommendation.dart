/// Cached recommendation content to reduce API calls
class CachedRecommendation {
  /// Unique identifier
  final String id;

  /// Content type: "shorts", "music", "music_videos", "mixed"
  final String contentType;

  /// When this content was fetched
  final DateTime fetchedAt;

  /// When this content expires
  final DateTime expiresAt;

  /// Cached content as JSON string
  final String contentJson;

  CachedRecommendation({
    required this.id,
    required this.contentType,
    required this.fetchedAt,
    required this.expiresAt,
    required this.contentJson,
  });

  /// Create from database map
  factory CachedRecommendation.fromMap(Map<String, dynamic> map) {
    return CachedRecommendation(
      id: map['id'] as String,
      contentType: map['content_type'] as String,
      fetchedAt: DateTime.fromMillisecondsSinceEpoch(map['fetched_at'] as int),
      expiresAt: DateTime.fromMillisecondsSinceEpoch(map['expires_at'] as int),
      contentJson: map['content_json'] as String,
    );
  }

  /// Convert to database map
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'content_type': contentType,
      'fetched_at': fetchedAt.millisecondsSinceEpoch,
      'expires_at': expiresAt.millisecondsSinceEpoch,
      'content_json': contentJson,
    };
  }

  /// Check if this cached content has expired
  bool get isExpired {
    return DateTime.now().isAfter(expiresAt);
  }

  /// Check if this cached content is still valid
  bool get isValid {
    return !isExpired;
  }

  @override
  String toString() {
    return 'CachedRecommendation(type: $contentType, '
        'expired: $isExpired, expiresAt: $expiresAt)';
  }
}
