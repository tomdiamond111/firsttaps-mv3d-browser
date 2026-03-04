import 'package:flutter/foundation.dart';

/// Media Preview Service for FirstTaps MV3D
/// Provides metadata and support for media preview functionality
/// Bridges between Flutter and JavaScript media preview system
class MediaPreviewService {
  static final MediaPreviewService _instance = MediaPreviewService._internal();
  factory MediaPreviewService() => _instance;
  MediaPreviewService._internal();

  /// Supported media platforms for preview
  static const List<String> supportedPlatforms = [
    'youtube.com',
    'youtu.be',
    'spotify.com',
    'soundcloud.com',
    'vimeo.com',
    'twitch.tv',
    'pandora.com',
    'music.apple.com',
    'tidal.com',
    'music.amazon.com',
    'deezer.com',
    'podcasts.apple.com',
    'podcasts.google.com',
    'tiktok.com',
    'instagram.com',
    'snapchat.com',
  ];

  /// Supported media file extensions for preview
  static const List<String> supportedExtensions = [
    // Video
    '.mp4',
    '.mov',
    '.avi',
    '.webm',
    '.mkv',
    '.m4v',
    '.flv',
    // Audio
    '.mp3',
    '.wav',
    '.flac',
    '.aac',
    '.ogg',
    '.m4a',
    '.wma',
    '.opus',
  ];

  /// Check if URL is a supported media platform
  bool isSupportedPlatform(String url) {
    try {
      final uri = Uri.parse(url);
      final host = uri.host.toLowerCase().replaceAll('www.', '');
      return supportedPlatforms.any((platform) => host.contains(platform));
    } catch (e) {
      debugPrint('MediaPreviewService: Error parsing URL: $e');
      return false;
    }
  }

  /// Check if file extension is supported for media preview
  bool isSupportedExtension(String extension) {
    return supportedExtensions.contains(extension.toLowerCase());
  }

  /// Check if file can be previewed (either URL or file extension)
  bool canPreview(String? url, String? extension) {
    if (url != null && url.isNotEmpty && isSupportedPlatform(url)) {
      return true;
    }
    if (extension != null &&
        extension.isNotEmpty &&
        isSupportedExtension(extension)) {
      return true;
    }
    return false;
  }

  /// Get media type from URL or extension
  String getMediaType(String? url, String? extension) {
    // URL-based detection
    if (url != null && url.isNotEmpty) {
      final lowerUrl = url.toLowerCase();
      if (lowerUrl.contains('youtube.com') || lowerUrl.contains('youtu.be')) {
        return 'youtube';
      }
      if (lowerUrl.contains('spotify.com')) return 'spotify';
      if (lowerUrl.contains('soundcloud.com')) return 'soundcloud';
      if (lowerUrl.contains('vimeo.com')) return 'vimeo';
      if (lowerUrl.contains('twitch.tv')) return 'twitch';
      if (lowerUrl.contains('pandora.com')) return 'pandora';
      if (lowerUrl.contains('music.apple.com')) return 'apple_music';
      if (lowerUrl.contains('tidal.com')) return 'tidal';
      if (lowerUrl.contains('podcasts')) return 'podcast';
    }

    // Extension-based detection
    if (extension != null && extension.isNotEmpty) {
      final lowerExt = extension.toLowerCase();
      if ([
        '.mp4',
        '.mov',
        '.avi',
        '.webm',
        '.mkv',
        '.m4v',
        '.flv',
      ].contains(lowerExt)) {
        return 'video';
      }
      if ([
        '.mp3',
        '.wav',
        '.flac',
        '.aac',
        '.ogg',
        '.m4a',
        '.wma',
        '.opus',
      ].contains(lowerExt)) {
        return 'audio';
      }
    }

    return 'unknown';
  }

  /// Get friendly platform name
  String getPlatformName(String mediaType) {
    const platformNames = {
      'youtube': 'YouTube',
      'spotify': 'Spotify',
      'soundcloud': 'SoundCloud',
      'vimeo': 'Vimeo',
      'twitch': 'Twitch',
      'pandora': 'Pandora',
      'apple_music': 'Apple Music',
      'tidal': 'Tidal',
      'podcast': 'Podcast',
      'video': 'Video File',
      'audio': 'Audio File',
      'unknown': 'Media',
    };
    return platformNames[mediaType] ?? 'Media';
  }

  /// Extract YouTube video ID from URL
  String? extractYouTubeVideoId(String url) {
    try {
      final uri = Uri.parse(url);

      // Standard youtube.com URL
      if (uri.host.contains('youtube.com')) {
        return uri.queryParameters['v'];
      }

      // Short youtu.be URL
      if (uri.host.contains('youtu.be')) {
        return uri.pathSegments.isNotEmpty ? uri.pathSegments[0] : null;
      }
    } catch (e) {
      debugPrint('MediaPreviewService: Error extracting YouTube ID: $e');
    }
    return null;
  }

  /// Extract Spotify track/playlist ID from URL
  String? extractSpotifyId(String url) {
    try {
      final uri = Uri.parse(url);
      final segments = uri.pathSegments;

      // Spotify URLs: spotify.com/track/ID or spotify.com/playlist/ID
      if (segments.length >= 2) {
        return segments.last;
      }
    } catch (e) {
      debugPrint('MediaPreviewService: Error extracting Spotify ID: $e');
    }
    return null;
  }

  /// Log media preview capabilities for debugging
  void logMediaCapabilities() {
    debugPrint('🎵 FirstTaps MV3D - Media Preview Service');
    debugPrint('  Supported Platforms: ${supportedPlatforms.length}');
    debugPrint('  Supported Extensions: ${supportedExtensions.length}');
    debugPrint('  Features: YouTube, Spotify, Local Files, More');
  }
}
