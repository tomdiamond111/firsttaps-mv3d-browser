import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:video_thumbnail/video_thumbnail.dart';
import 'package:http/http.dart' as http;

/// Service for loading demo media assets and generating thumbnails
/// MP4 files: Generates image thumbnails for face textures
/// MP3 files: Returns null (uses colored fallback with filename)
/// Also provides full media data URLs for playback
/// EXTERNAL URLs: Pre-fetches thumbnails from TikTok/Instagram/YouTube APIs (bypasses CORS)
class DemoAssetLoader {
  // Cache loaded thumbnails to avoid reloading
  static final Map<String, String> _thumbnailCache = {};

  // Cache loaded full media files to avoid reloading
  static final Map<String, String> _mediaCache = {};

  // Cache external URL thumbnails to avoid re-fetching
  static final Map<String, String> _externalThumbnailCache = {};

  /// Load demo asset thumbnail as data URL
  /// - MP4/Video: Generates image thumbnail from first frame
  /// - MP3/Audio: Returns null (will use colored fallback with filename)
  static Future<String?> loadDemoAssetAsDataUrl(String assetPath) async {
    try {
      // Check cache first
      if (_thumbnailCache.containsKey(assetPath)) {
        print('📦 [DEMO LOADER] Returning cached thumbnail for: $assetPath');
        return _thumbnailCache[assetPath];
      }

      print('📦 [DEMO LOADER] Generating thumbnail for: $assetPath');

      // Determine file type from extension
      final extension = assetPath.split('.').last.toLowerCase();

      // MP3/Audio files: Return null to use colored fallback
      if (extension == 'mp3' ||
          extension == 'wav' ||
          extension == 'flac' ||
          extension == 'aac' ||
          extension == 'ogg' ||
          extension == 'm4a') {
        print(
          '📦 [DEMO LOADER] Audio file ($extension) - returning null for colored fallback',
        );
        _thumbnailCache[assetPath] = 'null'; // Cache the null result
        return null;
      }

      // MP4/Video files: Generate thumbnail image
      if (extension == 'mp4' ||
          extension == 'mov' ||
          extension == 'avi' ||
          extension == 'webm' ||
          extension == 'mkv') {
        print(
          '📦 [DEMO LOADER] Video file ($extension) - generating thumbnail',
        );

        // Copy asset to temp file (VideoThumbnail needs file path)
        final ByteData data = await rootBundle.load(assetPath);
        final bytes = data.buffer.asUint8List();
        final tempDir = await getTemporaryDirectory();
        final tempFile = File(
          '${tempDir.path}/demo_${assetPath.split('/').last}',
        );
        await tempFile.writeAsBytes(bytes);

        print('📦 [DEMO LOADER] Wrote ${bytes.length} bytes to temp file');

        // Generate thumbnail using video_thumbnail package
        final thumbnailBytes = await VideoThumbnail.thumbnailData(
          video: tempFile.path,
          imageFormat: ImageFormat.JPEG,
          maxWidth: 128,
          quality: 25,
        );

        // Clean up temp file
        try {
          await tempFile.delete();
        } catch (e) {
          print('⚠️ [DEMO LOADER] Failed to delete temp file: $e');
        }

        if (thumbnailBytes != null) {
          final dataUrl =
              'data:image/jpeg;base64,${base64Encode(thumbnailBytes)}';
          print(
            '📦 [DEMO LOADER] Generated thumbnail: ${thumbnailBytes.length} bytes -> ${(dataUrl.length / 1024).toStringAsFixed(1)} KB',
          );
          _thumbnailCache[assetPath] = dataUrl;
          return dataUrl;
        } else {
          print('❌ [DEMO LOADER] VideoThumbnail returned null');
          _thumbnailCache[assetPath] = 'null';
          return null;
        }
      }

      print('❌ [DEMO LOADER] Unsupported file type: $extension');
      return null;
    } catch (e, stackTrace) {
      print('❌ [DEMO LOADER] Failed to generate thumbnail for $assetPath: $e');
      print('Stack trace: $stackTrace');
      return null;
    }
  }

  /// Load full media file as data URL for playback
  /// Loads the actual MP3/MP4 file content
  static Future<String?> loadMediaAsDataUrl(String assetPath) async {
    try {
      // Check cache first
      if (_mediaCache.containsKey(assetPath)) {
        print('📦 [DEMO MEDIA] Returning cached media for: $assetPath');
        return _mediaCache[assetPath];
      }

      print('📦 [DEMO MEDIA] Loading media file: $assetPath');

      // Load asset from bundle
      final ByteData data = await rootBundle.load(assetPath);
      final bytes = data.buffer.asUint8List();

      print('📦 [DEMO MEDIA] Loaded ${bytes.length} bytes');

      // Determine MIME type from extension
      final extension = assetPath.split('.').last.toLowerCase();
      String mimeType;

      switch (extension) {
        case 'mp3':
          mimeType = 'audio/mp3';
          break;
        case 'mp4':
          mimeType = 'video/mp4';
          break;
        case 'wav':
          mimeType = 'audio/wav';
          break;
        case 'flac':
          mimeType = 'audio/flac';
          break;
        case 'aac':
          mimeType = 'audio/aac';
          break;
        case 'ogg':
          mimeType = 'audio/ogg';
          break;
        case 'm4a':
          mimeType = 'audio/m4a';
          break;
        case 'mov':
          mimeType = 'video/mov';
          break;
        case 'avi':
          mimeType = 'video/avi';
          break;
        case 'webm':
          mimeType = 'video/webm';
          break;
        case 'mkv':
          mimeType = 'video/mkv';
          break;
        default:
          mimeType = 'application/octet-stream';
      }

      // Convert to base64 data URL
      final base64Data = base64Encode(bytes);
      final dataUrl = 'data:$mimeType;base64,$base64Data';

      print(
        '📦 [DEMO MEDIA] Created data URL (size: ${(dataUrl.length / 1024 / 1024).toStringAsFixed(2)} MB)',
      );

      // Cache for future use
      _mediaCache[assetPath] = dataUrl;

      return dataUrl;
    } catch (e) {
      print('❌ [DEMO MEDIA] Failed to load media $assetPath: $e');
      return null;
    }
  }

  /// Pre-load all demo assets on app startup
  /// Returns map of asset paths to thumbnail data URLs
  /// NOTE: No longer loading local demo media files - using external URLs only
  static Future<Map<String, String>> preloadAllDemoAssets() async {
    print(
      '📦 [DEMO LOADER] Skipping local demo media (using external URLs only)',
    );
    return {};
  }

  /// Pre-load all demo MEDIA files for playback
  /// Returns map of asset paths to full media data URLs
  /// NOTE: No longer loading local demo media files - using external URLs only
  static Future<Map<String, String>> preloadAllDemoMedia() async {
    print(
      '📦 [DEMO MEDIA] Skipping local demo media (using external URLs only)',
    );
    return {};
  }

  /// Get a single demo asset data URL (lazy loading)
  static Future<String?> getDemoAssetDataUrl(String assetPath) async {
    if (_thumbnailCache.containsKey(assetPath)) {
      return _thumbnailCache[assetPath];
    }
    return await loadDemoAssetAsDataUrl(assetPath);
  }

  /// Clear cache (useful for memory management)
  static void clearCache() {
    print(
      '📦 [DEMO LOADER] Clearing thumbnail cache (${_thumbnailCache.length} items)',
    );
    print('📦 [DEMO MEDIA] Clearing media cache (${_mediaCache.length} items)');
    _thumbnailCache.clear();
    _mediaCache.clear();
  }

  /// Get cache statistics
  static Map<String, dynamic> getCacheStats() {
    final thumbnailSize = _thumbnailCache.values.fold<int>(
      0,
      (sum, url) => sum + url.length,
    );
    final mediaSize = _mediaCache.values.fold<int>(
      0,
      (sum, url) => sum + url.length,
    );
    final externalSize = _externalThumbnailCache.values.fold<int>(
      0,
      (sum, url) => sum + url.length,
    );
    return {
      'cachedThumbnails': _thumbnailCache.length,
      'cachedMedia': _mediaCache.length,
      'cachedExternal': _externalThumbnailCache.length,
      'thumbnailSizeMB': (thumbnailSize / 1024 / 1024).toStringAsFixed(2),
      'mediaSizeMB': (mediaSize / 1024 / 1024).toStringAsFixed(2),
      'externalSizeMB': (externalSize / 1024 / 1024).toStringAsFixed(2),
      'thumbnails': _thumbnailCache.keys.toList(),
      'media': _mediaCache.keys.toList(),
      'external': _externalThumbnailCache.keys.toList(),
    };
  }

  /// Pre-fetch thumbnails for external URLs (YouTube, TikTok, Instagram, Spotify, Deezer)
  /// This bypasses CORS by fetching from Dart/native code
  /// Returns map of URL -> thumbnail data URL
  static Future<Map<String, String>> prefetchExternalThumbnails(
    List<String> urls,
  ) async {
    print('🌐 [EXTERNAL] Pre-fetching thumbnails for ${urls.length} URLs...');

    final Map<String, String> thumbnails = {};

    for (final url in urls) {
      // Check cache first
      if (_externalThumbnailCache.containsKey(url)) {
        print('✅ [EXTERNAL] Using cached thumbnail for: $url');
        thumbnails[url] = _externalThumbnailCache[url]!;
        continue;
      }

      try {
        String? thumbnailUrl;

        // YouTube
        if (url.contains('youtube.com') || url.contains('youtu.be')) {
          thumbnailUrl = await _fetchYouTubeThumbnail(url);
        }
        // Spotify
        else if (url.contains('spotify.com')) {
          thumbnailUrl = await _fetchSpotifyThumbnail(url);
        }
        // TikTok
        else if (url.contains('tiktok.com')) {
          thumbnailUrl = await _fetchTikTokThumbnail(url);
        }
        // Instagram - oEmbed API unreliable (returns HTML instead of JSON)
        // Using text fallback instead
        else if (url.contains('instagram.com')) {
          print(
            '⚠️ [EXTERNAL] Instagram thumbnails disabled - using text fallback',
          );
          // thumbnailUrl will remain null, handled by JS with "Instagram Link" text
        }
        // Deezer
        else if (url.contains('deezer.com')) {
          thumbnailUrl = await _fetchDeezerThumbnail(url);
        }

        if (thumbnailUrl != null && thumbnailUrl.isNotEmpty) {
          // Download the thumbnail image and convert to data URL
          final dataUrl = await _downloadImageAsDataUrl(thumbnailUrl);
          if (dataUrl != null) {
            thumbnails[url] = dataUrl;
            _externalThumbnailCache[url] = dataUrl;
            print(
              '✅ [EXTERNAL] Fetched thumbnail for: $url (${(dataUrl.length / 1024).toStringAsFixed(1)} KB)',
            );
          }
        } else {
          print('⚠️ [EXTERNAL] No thumbnail URL for: $url');
        }
      } catch (e) {
        print('❌ [EXTERNAL] Failed to fetch thumbnail for $url: $e');
      }

      // Small delay to avoid rate limiting
      await Future.delayed(Duration(milliseconds: 200));
    }

    print(
      '🌐 [EXTERNAL] Pre-fetching complete: ${thumbnails.length}/${urls.length} thumbnails fetched',
    );
    return thumbnails;
  }

  /// Fetch YouTube thumbnail URL from video ID
  static Future<String?> _fetchYouTubeThumbnail(String url) async {
    try {
      // Extract video ID
      String? videoId;
      if (url.contains('youtube.com')) {
        final uri = Uri.parse(url);
        videoId = uri.queryParameters['v'];
      } else if (url.contains('youtu.be')) {
        videoId = url.split('/').last.split('?').first;
      } else if (url.contains('/shorts/')) {
        videoId = url.split('/shorts/').last.split('?').first;
      }

      if (videoId == null) return null;

      // Try maxresdefault first, fallback to hqdefault
      final maxresUrl = 'https://img.youtube.com/vi/$videoId/maxresdefault.jpg';
      final hqUrl = 'https://img.youtube.com/vi/$videoId/hqdefault.jpg';

      // Test maxres availability
      final maxresResponse = await http.head(Uri.parse(maxresUrl));
      if (maxresResponse.statusCode == 200) {
        return maxresUrl;
      }

      return hqUrl;
    } catch (e) {
      print('❌ [YOUTUBE] Failed to get thumbnail URL: $e');
      return null;
    }
  }

  /// Fetch Spotify thumbnail URL from oEmbed API
  static Future<String?> _fetchSpotifyThumbnail(String url) async {
    try {
      final endpoint =
          'https://open.spotify.com/oembed?url=${Uri.encodeComponent(url)}';
      final response = await http.get(Uri.parse(endpoint));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['thumbnail_url'];
      }
      return null;
    } catch (e) {
      print('❌ [SPOTIFY] Failed to get thumbnail URL: $e');
      return null;
    }
  }

  /// Fetch TikTok thumbnail URL from oEmbed API
  static Future<String?> _fetchTikTokThumbnail(String url) async {
    try {
      final endpoint =
          'https://www.tiktok.com/oembed?url=${Uri.encodeComponent(url)}';
      final response = await http.get(Uri.parse(endpoint));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['thumbnail_url'];
      }
      return null;
    } catch (e) {
      print('❌ [TIKTOK] Failed to get thumbnail URL: $e');
      return null;
    }
  }

  /// Fetch Instagram thumbnail URL from oEmbed API
  static Future<String?> _fetchInstagramThumbnail(String url) async {
    try {
      final endpoint =
          'https://www.instagram.com/oembed?url=${Uri.encodeComponent(url)}';
      final response = await http.get(Uri.parse(endpoint));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['thumbnail_url'];
      }
      return null;
    } catch (e) {
      print('❌ [INSTAGRAM] Failed to get thumbnail URL: $e');
      return null;
    }
  }

  /// Fetch Deezer thumbnail URL from API
  static Future<String?> _fetchDeezerThumbnail(String url) async {
    try {
      // Parse Deezer URL to extract content type and ID
      // Examples:
      // https://www.deezer.com/track/104011168
      // https://www.deezer.com/album/12345
      // https://www.deezer.com/playlist/67890

      String? contentType;
      String? contentId;

      if (url.contains('/track/')) {
        contentType = 'track';
        contentId = url.split('/track/').last.split('?').first;
      } else if (url.contains('/album/')) {
        contentType = 'album';
        contentId = url.split('/album/').last.split('?').first;
      } else if (url.contains('/playlist/')) {
        contentType = 'playlist';
        contentId = url.split('/playlist/').last.split('?').first;
      }

      if (contentType == null || contentId == null) {
        print('⚠️ [DEEZER] Could not parse URL: $url');
        return null;
      }

      // Build API endpoint
      final endpoint = 'https://api.deezer.com/$contentType/$contentId';
      final response = await http.get(Uri.parse(endpoint));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        // Extract thumbnail URL based on content type
        String? thumbnailUrl;
        if (contentType == 'track') {
          thumbnailUrl =
              data['album']?['cover_big'] ?? data['album']?['cover_medium'];
        } else if (contentType == 'album') {
          thumbnailUrl = data['cover_big'] ?? data['cover_medium'];
        } else if (contentType == 'playlist') {
          thumbnailUrl = data['picture_big'] ?? data['picture_medium'];
        }

        return thumbnailUrl;
      }
      return null;
    } catch (e) {
      print('❌ [DEEZER] Failed to get thumbnail URL: $e');
      return null;
    }
  }

  /// Download image from URL and convert to data URL
  static Future<String?> _downloadImageAsDataUrl(String imageUrl) async {
    try {
      final response = await http.get(Uri.parse(imageUrl));
      if (response.statusCode == 200) {
        final bytes = response.bodyBytes;
        final mimeType = response.headers['content-type'] ?? 'image/jpeg';
        final dataUrl = 'data:$mimeType;base64,${base64Encode(bytes)}';
        return dataUrl;
      }
      return null;
    } catch (e) {
      print('❌ [DOWNLOAD] Failed to download image from $imageUrl: $e');
      return null;
    }
  }
}
