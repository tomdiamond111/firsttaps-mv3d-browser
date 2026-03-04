/// Tracks user interaction with link objects for favorites calculation
class LinkInteraction {
  /// Unique identifier
  final String id;

  /// URL of the link
  final String linkUrl;

  /// Title of the link
  final String linkTitle;

  /// Platform: "youtube", "spotify", "tiktok", etc.
  final String platform;

  /// Number of times this link was opened
  int openCount;

  /// When the link was first opened
  final DateTime firstOpened;

  /// When the link was most recently opened
  DateTime lastOpened;

  /// ID of furniture where this link was accessed
  final String? furnitureId;

  /// User has hidden/deleted this link - should not show in furniture refreshes
  bool isHidden;

  /// When the user marked this link as hidden
  DateTime? hiddenAt;

  LinkInteraction({
    required this.id,
    required this.linkUrl,
    required this.linkTitle,
    required this.platform,
    this.openCount = 1,
    required this.firstOpened,
    required this.lastOpened,
    this.furnitureId,
    this.isHidden = false,
    this.hiddenAt,
  });

  /// Create from database map
  factory LinkInteraction.fromMap(Map<String, dynamic> map) {
    return LinkInteraction(
      id: map['id'] as String,
      linkUrl: map['link_url'] as String,
      linkTitle: map['link_title'] as String,
      platform: map['platform'] as String,
      openCount: map['open_count'] as int,
      firstOpened: DateTime.fromMillisecondsSinceEpoch(
        map['first_opened'] as int,
      ),
      lastOpened: DateTime.fromMillisecondsSinceEpoch(
        map['last_opened'] as int,
      ),
      furnitureId: map['furniture_id'] as String?,
      isHidden: map['is_hidden'] as bool? ?? false,
      hiddenAt: map['hidden_at'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['hidden_at'] as int)
          : null,
    );
  }

  /// Convert to database map
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'link_url': linkUrl,
      'link_title': linkTitle,
      'platform': platform,
      'open_count': openCount,
      'first_opened': firstOpened.millisecondsSinceEpoch,
      'last_opened': lastOpened.millisecondsSinceEpoch,
      'furniture_id': furnitureId,
      'is_hidden': isHidden,
      'hidden_at': hiddenAt?.millisecondsSinceEpoch,
    };
  }

  /// Increment open count and update last opened time
  void recordOpen() {
    openCount++;
    lastOpened = DateTime.now();
  }

  /// Mark this link as hidden by the user
  void markAsHidden() {
    isHidden = true;
    hiddenAt = DateTime.now();
  }

  /// Unhide this link
  void markAsVisible() {
    isHidden = false;
    hiddenAt = null;
  }

  /// Get days since last opened
  int get daysSinceLastOpened {
    return DateTime.now().difference(lastOpened).inDays;
  }

  /// Get days since first opened
  int get daysSinceFirstOpened {
    return DateTime.now().difference(firstOpened).inDays;
  }

  /// Create a copy with updated fields
  LinkInteraction copyWith({
    String? id,
    String? linkUrl,
    String? linkTitle,
    String? platform,
    int? openCount,
    DateTime? firstOpened,
    DateTime? lastOpened,
    String? furnitureId,
    bool? isHidden,
    DateTime? hiddenAt,
  }) {
    return LinkInteraction(
      id: id ?? this.id,
      linkUrl: linkUrl ?? this.linkUrl,
      linkTitle: linkTitle ?? this.linkTitle,
      platform: platform ?? this.platform,
      openCount: openCount ?? this.openCount,
      firstOpened: firstOpened ?? this.firstOpened,
      lastOpened: lastOpened ?? this.lastOpened,
      furnitureId: furnitureId ?? this.furnitureId,
      isHidden: isHidden ?? this.isHidden,
      hiddenAt: hiddenAt ?? this.hiddenAt,
    );
  }

  @override
  String toString() {
    return 'LinkInteraction(url: $linkUrl, opens: $openCount, '
        'lastOpened: ${daysSinceLastOpened}d ago, hidden: $isHidden)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is LinkInteraction &&
        other.id == id &&
        other.linkUrl == linkUrl;
  }

  @override
  int get hashCode {
    return id.hashCode ^ linkUrl.hashCode;
  }
}
