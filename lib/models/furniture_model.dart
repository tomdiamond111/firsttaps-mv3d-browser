/// Furniture Model for browser version
/// Represents a furniture piece in the 3D world
class Furniture {
  final String id;
  final String type; // gallery_wall, stage_small, riser, amphitheatre
  final Position position;
  final List<String> objectIds; // Link objects on this furniture
  final Map<String, dynamic> metadata;

  Furniture({
    required this.id,
    required this.type,
    required this.position,
    this.objectIds = const [],
    this.metadata = const {},
  });

  /// Create from JSON (from localStorage)
  factory Furniture.fromJson(Map<String, dynamic> json) {
    return Furniture(
      id: json['id'] as String,
      type: json['type'] as String,
      position: Position.fromJson(json['position'] as Map<String, dynamic>),
      objectIds: (json['objectIds'] as List?)?.cast<String>() ?? [],
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
    );
  }

  /// Convert to JSON (for localStorage)
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'position': position.toJson(),
      'objectIds': objectIds,
      'metadata': metadata,
    };
  }

  /// Copy with updated fields
  Furniture copyWith({
    String? id,
    String? type,
    Position? position,
    List<String>? objectIds,
    Map<String, dynamic>? metadata,
  }) {
    return Furniture(
      id: id ?? this.id,
      type: type ?? this.type,
      position: position ?? this.position,
      objectIds: objectIds ?? this.objectIds,
      metadata: metadata ?? this.metadata,
    );
  }

  /// Get furniture capacity (max objects)
  int get capacity {
    switch (type) {
      case 'gallery_wall':
        return 10;
      case 'stage_small':
        return 30;
      case 'riser':
        return 40;
      case 'amphitheatre':
        return 15;
      default:
        return 10;
    }
  }

  /// Get display name
  String get displayName {
    switch (type) {
      case 'gallery_wall':
        return 'Gallery Wall';
      case 'stage_small':
        return 'Small Stage';
      case 'riser':
        return 'Riser';
      case 'amphitheatre':
        return 'Amphitheatre';
      default:
        return type;
    }
  }
}

/// Position in 3D space
class Position {
  final double x;
  final double y;
  final double z;
  final double? rotation;

  Position({required this.x, required this.y, required this.z, this.rotation});

  factory Position.fromJson(Map<String, dynamic> json) {
    return Position(
      x: (json['x'] as num).toDouble(),
      y: (json['y'] as num).toDouble(),
      z: (json['z'] as num).toDouble(),
      rotation: (json['rotation'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {'x': x, 'y': y, 'z': z, if (rotation != null) 'rotation': rotation};
  }
}

/// Link Object Model
/// Represents a URL-based object in the world
class LinkObject {
  final String id;
  final String url;
  final String? customName;
  final Position position;
  final String? furnitureId; // If attached to furniture
  final int? furnitureSlotIndex;
  final Map<String, dynamic> metadata; // Thumbnails, titles, etc.

  LinkObject({
    required this.id,
    required this.url,
    this.customName,
    required this.position,
    this.furnitureId,
    this.furnitureSlotIndex,
    this.metadata = const {},
  });

  factory LinkObject.fromJson(Map<String, dynamic> json) {
    return LinkObject(
      id: json['id'] as String,
      url: json['url'] as String,
      customName: json['customName'] as String?,
      position: Position.fromJson(json['position'] as Map<String, dynamic>),
      furnitureId: json['furnitureId'] as String?,
      furnitureSlotIndex: json['furnitureSlotIndex'] as int?,
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'url': url,
      if (customName != null) 'customName': customName,
      'position': position.toJson(),
      if (furnitureId != null) 'furnitureId': furnitureId,
      if (furnitureSlotIndex != null) 'furnitureSlotIndex': furnitureSlotIndex,
      'metadata': metadata,
    };
  }

  /// Get display name
  String get displayName {
    if (customName != null && customName!.isNotEmpty) {
      return customName!;
    }
    // Try to extract from metadata
    if (metadata['title'] != null) {
      return metadata['title'] as String;
    }
    // Fall back to URL
    return url;
  }

  /// Get platform (youtube, spotify, etc.)
  String get platform {
    if (url.contains('youtube.com') || url.contains('youtu.be')) {
      return 'youtube';
    } else if (url.contains('spotify.com')) {
      return 'spotify';
    } else if (url.contains('vimeo.com')) {
      return 'vimeo';
    } else if (url.contains('tiktok.com')) {
      return 'tiktok';
    } else if (url.contains('instagram.com')) {
      return 'instagram';
    } else if (url.contains('soundcloud.com')) {
      return 'soundcloud';
    } else if (url.contains('deezer.com')) {
      return 'deezer';
    } else if (url.contains('dailymotion.com')) {
      return 'dailymotion';
    }
    return 'unknown';
  }

  /// Copy with updated fields
  LinkObject copyWith({
    String? id,
    String? url,
    String? customName,
    Position? position,
    String? furnitureId,
    int? furnitureSlotIndex,
    Map<String, dynamic>? metadata,
  }) {
    return LinkObject(
      id: id ?? this.id,
      url: url ?? this.url,
      customName: customName ?? this.customName,
      position: position ?? this.position,
      furnitureId: furnitureId ?? this.furnitureId,
      furnitureSlotIndex: furnitureSlotIndex ?? this.furnitureSlotIndex,
      metadata: metadata ?? this.metadata,
    );
  }
}
