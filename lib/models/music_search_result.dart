/// Model class for music/video search results
/// Supports YouTube and future platforms (Spotify, etc.)
class MusicSearchResult {
  final String id;
  final String title;
  final String artist;
  final String platform;
  final String thumbnailUrl;
  final String url;
  final Duration? duration;
  final String? description;
  final int? viewCount;
  final DateTime? publishedAt;

  MusicSearchResult({
    required this.id,
    required this.title,
    required this.artist,
    required this.platform,
    required this.thumbnailUrl,
    required this.url,
    this.duration,
    this.description,
    this.viewCount,
    this.publishedAt,
  });

  /// Create from YouTube API response
  factory MusicSearchResult.fromYouTubeJson(Map<String, dynamic> json) {
    final snippet = json['snippet'] as Map<String, dynamic>;
    final videoId = json['id']['videoId'] as String;

    return MusicSearchResult(
      id: videoId,
      title: snippet['title'] as String? ?? 'Unknown Title',
      artist: snippet['channelTitle'] as String? ?? 'Unknown Artist',
      platform: 'youtube',
      thumbnailUrl: _getBestThumbnail(
        snippet['thumbnails'] as Map<String, dynamic>?,
      ),
      url: 'https://www.youtube.com/watch?v=$videoId',
      description: snippet['description'] as String?,
      publishedAt: snippet['publishedAt'] != null
          ? DateTime.tryParse(snippet['publishedAt'] as String)
          : null,
    );
  }

  /// Create from Deezer API response
  factory MusicSearchResult.fromDeezerJson(Map<String, dynamic> json) {
    final trackId = json['id'].toString();
    final artist = json['artist'] as Map<String, dynamic>?;

    return MusicSearchResult(
      id: trackId,
      title: json['title'] as String? ?? 'Unknown Title',
      artist: artist?['name'] as String? ?? 'Unknown Artist',
      platform: 'deezer',
      thumbnailUrl:
          json['album']?['cover_big'] as String? ??
          json['album']?['cover_medium'] as String? ??
          '',
      url: json['link'] as String? ?? 'https://www.deezer.com/track/$trackId',
      duration: json['duration'] != null
          ? Duration(seconds: json['duration'] as int)
          : null,
      description:
          '${json['album']?['title'] ?? ''} - ${artist?['name'] ?? ''}',
    );
  }

  /// Create from Vimeo API response
  factory MusicSearchResult.fromVimeoJson(Map<String, dynamic> json) {
    final videoId = json['uri']?.toString().split('/').last ?? '';
    final user = json['user'] as Map<String, dynamic>?;

    return MusicSearchResult(
      id: videoId,
      title: json['name'] as String? ?? 'Unknown Title',
      artist: user?['name'] as String? ?? 'Unknown Creator',
      platform: 'vimeo',
      thumbnailUrl: _getVimeoBestThumbnail(json['pictures']),
      url: json['link'] as String? ?? 'https://vimeo.com/$videoId',
      duration: json['duration'] != null
          ? Duration(seconds: json['duration'] as int)
          : null,
      description: json['description'] as String?,
      publishedAt: json['created_time'] != null
          ? DateTime.tryParse(json['created_time'] as String)
          : null,
    );
  }

  /// Create from local audio file
  factory MusicSearchResult.fromLocalFile({
    required String id,
    required String title,
    required String artist,
    required String filePath,
    String? thumbnailPath,
    Duration? duration,
  }) {
    return MusicSearchResult(
      id: id,
      title: title,
      artist: artist,
      platform: 'local',
      thumbnailUrl: thumbnailPath ?? '',
      url: filePath,
      duration: duration,
    );
  }

  /// Get the highest quality thumbnail available
  static String _getBestThumbnail(Map<String, dynamic>? thumbnails) {
    if (thumbnails == null) return '';

    // Try thumbnails in order of quality: maxres > high > medium > default
    for (final quality in ['maxres', 'high', 'medium', 'default']) {
      if (thumbnails.containsKey(quality)) {
        final thumb = thumbnails[quality] as Map<String, dynamic>;
        return thumb['url'] as String? ?? '';
      }
    }

    return '';
  }

  /// Get best Vimeo thumbnail
  static String _getVimeoBestThumbnail(dynamic pictures) {
    if (pictures == null) return '';

    try {
      final sizes = pictures['sizes'] as List<dynamic>?;
      if (sizes != null && sizes.isNotEmpty) {
        // Get largest thumbnail (last in list)
        final largest = sizes.last as Map<String, dynamic>;
        return largest['link'] as String? ?? '';
      }
    } catch (e) {
      // Fallback to base_link if available
      return pictures['base_link'] as String? ?? '';
    }

    return '';
  }

  /// Get platform-specific color for UI display
  String get platformColor {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return '#FF0000';
      case 'spotify':
        return '#1DB954';
      case 'soundcloud':
        return '#FF5500';
      case 'apple music':
        return '#FA243C';
      case 'deezer':
        return '#FF0092';
      case 'vimeo':
        return '#1AB7EA';
      case 'local':
        return '#4CAF50';
      default:
        return '#666666';
    }
  }

  /// Get platform icon emoji
  String get platformIcon {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return '▶️';
      case 'spotify':
        return '🎵';
      case 'soundcloud':
        return '☁️';
      case 'apple music':
        return '🍎';
      case 'deezer':
        return '🎶';
      case 'vimeo':
        return '🎬';
      case 'local':
        return '📁';
      default:
        return '🎵';
    }
  }

  /// Format duration as MM:SS
  String get formattedDuration {
    if (duration == null) return '';
    final minutes = duration!.inMinutes;
    final seconds = duration!.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  /// Format view count with abbreviations (1.2M, 345K, etc.)
  String get formattedViewCount {
    if (viewCount == null) return '';

    if (viewCount! >= 1000000) {
      return '${(viewCount! / 1000000).toStringAsFixed(1)}M views';
    } else if (viewCount! >= 1000) {
      return '${(viewCount! / 1000).toStringAsFixed(1)}K views';
    } else {
      return '$viewCount views';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'artist': artist,
      'platform': platform,
      'thumbnailUrl': thumbnailUrl,
      'url': url,
      'duration': duration?.inSeconds,
      'description': description,
      'viewCount': viewCount,
      'publishedAt': publishedAt?.toIso8601String(),
    };
  }
}
