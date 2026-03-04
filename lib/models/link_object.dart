/// Represents a link object that can be placed on furniture
class LinkObject {
  /// Unique identifier
  final String id;

  /// URL of the content
  final String url;

  /// Display title
  final String title;

  /// Platform: "youtube", "spotify", "tiktok", "instagram", etc.
  final String platform;

  /// Thumbnail image URL
  final String? thumbnailUrl;

  /// Slot index on furniture (for ordering)
  int? slotIndex;

  /// Parent furniture ID
  String? furnitureId;

  /// Additional metadata (JSON string)
  String? metadata;

  LinkObject({
    required this.id,
    required this.url,
    required this.title,
    required this.platform,
    this.thumbnailUrl,
    this.slotIndex,
    this.furnitureId,
    this.metadata,
  });

  /// Create from database map
  factory LinkObject.fromMap(Map<String, dynamic> map) {
    return LinkObject(
      id: map['id'] as String,
      url: map['url'] as String,
      title: map['title'] as String,
      platform: map['platform'] as String,
      thumbnailUrl: map['thumbnail_url'] as String?,
      slotIndex: map['slot_index'] as int?,
      furnitureId: map['furniture_id'] as String?,
      metadata: map['metadata'] as String?,
    );
  }

  /// Convert to database map
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'url': url,
      'title': title,
      'platform': platform,
      'thumbnail_url': thumbnailUrl,
      'slot_index': slotIndex,
      'furniture_id': furnitureId,
      'metadata': metadata,
    };
  }

  /// Create a copy with updated fields
  LinkObject copyWith({
    String? id,
    String? url,
    String? title,
    String? platform,
    String? thumbnailUrl,
    int? slotIndex,
    String? furnitureId,
    String? metadata,
  }) {
    return LinkObject(
      id: id ?? this.id,
      url: url ?? this.url,
      title: title ?? this.title,
      platform: platform ?? this.platform,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      slotIndex: slotIndex ?? this.slotIndex,
      furnitureId: furnitureId ?? this.furnitureId,
      metadata: metadata ?? this.metadata,
    );
  }

  @override
  String toString() {
    return 'LinkObject(title: $title, platform: $platform, url: $url)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is LinkObject && other.id == id && other.url == url;
  }

  @override
  int get hashCode {
    return id.hashCode ^ url.hashCode;
  }
}
