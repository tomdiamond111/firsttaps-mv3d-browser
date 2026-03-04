import 'package:flutter/foundation.dart';
import 'link_object.dart';

/// Represents a furniture piece that contains recommended content
/// from trending platforms (YouTube, Spotify, TikTok, etc.)
class RecommendationFurniture {
  /// Unique identifier for this furniture instance
  final String id;

  /// Type of furniture: "gallery_wall", "small_stage", "riser", "bookshelf", "amphitheatre"
  final String furnitureType;

  /// Always true for recommendation furniture
  final bool isRecommendation;

  /// Whether the user has modified this furniture (changed links, position, etc.)
  bool isModified;

  /// When this furniture's content was last updated
  DateTime lastUpdated;

  /// When this furniture instance was created/spawned
  final DateTime spawnedAt;

  /// The recommended link objects displayed on this furniture
  List<LinkObject> links;

  /// Content category: "shorts", "music", "music_videos", "favorites", "mixed"
  final String contentCategory;

  /// Original number of links when spawned (for modification detection)
  final int originalLinkCount;

  /// Position in 3D world (JSON string)
  String? positionJson;

  /// Rotation in 3D world (JSON string)
  String? rotationJson;

  /// Original position when spawned (for modification detection)
  String? originalPositionJson;

  /// Original rotation when spawned (for modification detection)
  String? originalRotationJson;

  /// Custom name given by user
  String? customName;

  RecommendationFurniture({
    required this.id,
    required this.furnitureType,
    this.isRecommendation = true,
    this.isModified = false,
    required this.lastUpdated,
    required this.spawnedAt,
    required this.links,
    required this.contentCategory,
    required this.originalLinkCount,
    this.positionJson,
    this.rotationJson,
    this.originalPositionJson,
    this.originalRotationJson,
    this.customName,
  });

  /// Create from database map
  factory RecommendationFurniture.fromMap(Map<String, dynamic> map) {
    return RecommendationFurniture(
      id: map['id'] as String,
      furnitureType: map['furniture_type'] as String,
      isRecommendation: true,
      isModified: (map['is_modified'] as int) == 1,
      lastUpdated: DateTime.fromMillisecondsSinceEpoch(
        map['last_updated'] as int,
      ),
      spawnedAt: DateTime.fromMillisecondsSinceEpoch(map['spawned_at'] as int),
      links: [], // Links are loaded separately
      contentCategory: map['content_category'] as String,
      originalLinkCount: map['original_link_count'] as int,
      positionJson: map['position_json'] as String?,
      rotationJson: map['rotation_json'] as String?,
      originalPositionJson: map['original_position_json'] as String?,
      originalRotationJson: map['original_rotation_json'] as String?,
      customName: map['custom_name'] as String?,
    );
  }

  /// Convert to database map
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'furniture_type': furnitureType,
      'is_modified': isModified ? 1 : 0,
      'last_updated': lastUpdated.millisecondsSinceEpoch,
      'spawned_at': spawnedAt.millisecondsSinceEpoch,
      'content_category': contentCategory,
      'original_link_count': originalLinkCount,
      'position_json': positionJson,
      'rotation_json': rotationJson,
      'original_position_json': originalPositionJson,
      'original_rotation_json': originalRotationJson,
      'custom_name': customName,
    };
  }

  /// Check if furniture has been modified by user
  bool checkIfModified() {
    // Link count changed
    if (links.length != originalLinkCount) {
      return true;
    }

    // Position changed
    if (positionJson != null &&
        originalPositionJson != null &&
        positionJson != originalPositionJson) {
      return true;
    }

    // Rotation changed
    if (rotationJson != null &&
        originalRotationJson != null &&
        rotationJson != originalRotationJson) {
      return true;
    }

    // Custom name applied
    if (customName != null && customName!.isNotEmpty) {
      return true;
    }

    return false;
  }

  /// Update modification status
  void updateModificationStatus() {
    isModified = checkIfModified();
  }

  /// Create a copy with updated fields
  RecommendationFurniture copyWith({
    String? id,
    String? furnitureType,
    bool? isRecommendation,
    bool? isModified,
    DateTime? lastUpdated,
    DateTime? spawnedAt,
    List<LinkObject>? links,
    String? contentCategory,
    int? originalLinkCount,
    String? positionJson,
    String? rotationJson,
    String? originalPositionJson,
    String? originalRotationJson,
    String? customName,
  }) {
    return RecommendationFurniture(
      id: id ?? this.id,
      furnitureType: furnitureType ?? this.furnitureType,
      isRecommendation: isRecommendation ?? this.isRecommendation,
      isModified: isModified ?? this.isModified,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      spawnedAt: spawnedAt ?? this.spawnedAt,
      links: links ?? this.links,
      contentCategory: contentCategory ?? this.contentCategory,
      originalLinkCount: originalLinkCount ?? this.originalLinkCount,
      positionJson: positionJson ?? this.positionJson,
      rotationJson: rotationJson ?? this.rotationJson,
      originalPositionJson: originalPositionJson ?? this.originalPositionJson,
      originalRotationJson: originalRotationJson ?? this.originalRotationJson,
      customName: customName ?? this.customName,
    );
  }

  @override
  String toString() {
    return 'RecommendationFurniture(id: $id, type: $furnitureType, '
        'category: $contentCategory, modified: $isModified, links: ${links.length})';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is RecommendationFurniture &&
        other.id == id &&
        other.furnitureType == furnitureType &&
        other.isModified == isModified &&
        other.contentCategory == contentCategory;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        furnitureType.hashCode ^
        isModified.hashCode ^
        contentCategory.hashCode;
  }
}
