import 'dart:convert';
import 'dart:developer' as developer;
import 'package:http/http.dart' as http;
import 'package:firsttaps_mv3d_browser/models/music_search_result.dart';
import 'youtube_quota_service.dart';

/// Service for searching music and videos across multiple platforms
///
/// SECURITY: All API keys are stored server-side in Cloudflare Worker secrets.
/// This service proxies requests through the Cloudflare Worker to keep keys secure.
///
/// Supported platforms:
/// - YouTube (via Cloudflare Worker proxy)
/// - Vimeo (via Cloudflare Worker proxy)
/// - Deezer (public API, no auth required)
/// - Dailymotion (public API, no auth required)
///
/// Worker URL: https://firsttaps-paste.firsttaps.workers.dev
class MusicSearchService {
  // Cloudflare Worker configuration (handles API keys server-side)
  static const String _workerBaseUrl =
      'https://firsttaps-paste.firsttaps.workers.dev';
  static const int _defaultMaxResults = 15;

  // Deezer API configuration (no API key required for basic search)
  static const String _deezerSearchUrl = 'https://api.deezer.com/search';

  // SoundCloud API configuration (public API - no auth required for search)
  static const String _soundcloudSearchUrl =
      'https://api-v2.soundcloud.com/search/tracks';

  // Dailymotion API configuration (no API key required for basic search)
  static const String _dailymotionSearchUrl =
      'https://api.dailymotion.com/videos';

  // Persistent quota tracking service
  final YouTubeQuotaService _quotaService = YouTubeQuotaService();

  /// Initialize the service (call this once at app startup)
  Future<void> initialize() async {
    await _quotaService.initialize();
    developer.log(
      'MusicSearchService initialized with persistent quota tracking',
      name: 'MusicSearchService',
    );
  }

  /// Search YouTube for music/video content via Cloudflare Worker proxy
  /// Returns list of search results or empty list on error
  Future<List<MusicSearchResult>> searchYouTube(
    String query, {
    int maxResults = _defaultMaxResults,
  }) async {
    try {
      // Check if quota is available before making API call
      final hasQuota = await _quotaService.hasQuotaAvailable(
        YouTubeQuotaService.searchCost,
      );

      if (!hasQuota) {
        final quotaStatus = await _quotaService.getQuotaStatus();
        final timeUntilReset = quotaStatus['timeUntilReset'] as Map;

        throw Exception(
          'Daily YouTube search quota exceeded. '
          '${quotaStatus['searchesRemaining']} searches remaining. '
          'Resets in ${timeUntilReset['hours']}h ${timeUntilReset['minutes']}m.',
        );
      }

      // Validate query
      if (query.trim().isEmpty) {
        developer.log('Empty search query', name: 'MusicSearchService');
        return [];
      }

      developer.log(
        'Searching YouTube via Worker: "$query" (max: $maxResults)',
        name: 'MusicSearchService',
      );

      // Use Cloudflare Worker proxy (keeps API key secure on server)
      // Worker endpoint: /api/youtube/music-audio
      final uri = Uri.parse('$_workerBaseUrl/api/youtube/music-audio').replace(
        queryParameters: {'q': query, 'maxResults': maxResults.toString()},
      );

      // Make API request through proxy
      final response = await http.get(uri);

      // Consume quota after successful API call
      await _quotaService.consumeQuota(YouTubeQuotaService.searchCost);

      // Check for errors
      if (response.statusCode != 200) {
        developer.log(
          'YouTube API error: ${response.statusCode} - ${response.body}',
          name: 'MusicSearchService',
        );

        // Try to parse error details
        String errorMessage =
            'Failed to search YouTube: ${response.statusCode}';

        try {
          final errorData = jsonDecode(response.body);
          final apiError = errorData['error'];

          if (apiError != null) {
            final message = apiError['message'] ?? '';
            final errors = apiError['errors'] as List<dynamic>? ?? [];

            developer.log(
              'YouTube API detailed error: $message',
              name: 'MusicSearchService',
            );

            // Handle specific 403 errors
            if (response.statusCode == 403) {
              // Check for Android app restrictions
              if (message.toLowerCase().contains('android') ||
                  message.toLowerCase().contains('blocked') ||
                  errors.any(
                    (e) => (e['reason'] as String? ?? '') == 'forbidden',
                  )) {
                errorMessage =
                    'API key has Android app restrictions. '
                    'Please set API restrictions to "None" or add your app package name and SHA-1 certificate.';
              }
              // Check for quota exceeded
              else if (message.toLowerCase().contains('quota') ||
                  errors.any(
                    (e) => (e['reason'] as String? ?? '').contains(
                      'quotaExceeded',
                    ),
                  )) {
                errorMessage =
                    'Daily search limit reached. Please try again tomorrow.';
              }
              // Check for API key issues
              else if (message.toLowerCase().contains('api key') ||
                  message.toLowerCase().contains('invalid') ||
                  errors.any(
                    (e) =>
                        (e['reason'] as String? ?? '').contains('keyInvalid'),
                  )) {
                errorMessage =
                    'API key error. Please check your API configuration.';
              }
              // Check for disabled API
              else if (message.toLowerCase().contains('disabled') ||
                  errors.any(
                    (e) => (e['reason'] as String? ?? '').contains(
                      'accessNotConfigured',
                    ),
                  )) {
                errorMessage =
                    'YouTube Data API is not enabled. Please enable it in Google Cloud Console.';
              }
              // Generic 403 error
              else {
                errorMessage =
                    'Access forbidden. API key may be restricted or invalid. Details: $message';
              }
            }
          }
        } catch (e) {
          developer.log(
            'Failed to parse error response: $e',
            name: 'MusicSearchService',
          );
        }

        throw Exception(errorMessage);
      }

      // Parse response
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final items = data['items'] as List<dynamic>? ?? [];

      // Convert to MusicSearchResult objects
      final results = items
          .map(
            (item) =>
                MusicSearchResult.fromYouTubeJson(item as Map<String, dynamic>),
          )
          .toList();

      developer.log(
        'YouTube search successful: ${results.length} results found',
        name: 'MusicSearchService',
      );

      return results;
    } catch (e) {
      developer.log(
        'YouTube search failed: $e',
        name: 'MusicSearchService',
        error: e,
      );
      rethrow;
    }
  }

  /// Search Deezer for music
  /// Free API - no authentication required for basic search
  Future<List<MusicSearchResult>> searchDeezer(
    String query, {
    int maxResults = _defaultMaxResults,
  }) async {
    try {
      if (query.trim().isEmpty) {
        developer.log('Empty search query', name: 'MusicSearchService');
        return [];
      }

      developer.log(
        'Searching Deezer: "$query" (max: $maxResults)',
        name: 'MusicSearchService',
      );

      // Build request URL
      final uri = Uri.parse(
        _deezerSearchUrl,
      ).replace(queryParameters: {'q': query, 'limit': maxResults.toString()});

      // Make API request
      final response = await http.get(uri);

      if (response.statusCode != 200) {
        developer.log(
          'Deezer API error: ${response.statusCode}',
          name: 'MusicSearchService',
        );
        throw Exception('Failed to search Deezer: ${response.statusCode}');
      }

      // Parse response
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final items = data['data'] as List<dynamic>? ?? [];

      // Convert to MusicSearchResult objects
      final results = items
          .map(
            (item) =>
                MusicSearchResult.fromDeezerJson(item as Map<String, dynamic>),
          )
          .toList();

      developer.log(
        'Deezer search successful: ${results.length} results found',
        name: 'MusicSearchService',
      );

      return results;
    } catch (e) {
      developer.log(
        'Deezer search failed: $e',
        name: 'MusicSearchService',
        error: e,
      );
      return []; // Return empty list on error instead of rethrowing
    }
  }

  /// Search Vimeo for videos via Cloudflare Worker proxy
  /// Worker handles API authentication securely
  Future<List<MusicSearchResult>> searchVimeo(
    String query, {
    int maxResults = _defaultMaxResults,
  }) async {
    try {
      if (query.trim().isEmpty) {
        developer.log('Empty search query', name: 'MusicSearchService');
        return [];
      }

      developer.log(
        'Searching Vimeo via Worker: "$query" (max: $maxResults)',
        name: 'MusicSearchService',
      );

      // Use Cloudflare Worker proxy (keeps API token secure on server)
      // Worker endpoint: /api/vimeo/staff-picks
      final uri = Uri.parse('$_workerBaseUrl/api/vimeo/staff-picks').replace(
        queryParameters: {'q': query, 'maxResults': maxResults.toString()},
      );

      // Make API request through proxy
      final response = await http.get(uri);

      if (response.statusCode != 200) {
        developer.log(
          'Vimeo API error: ${response.statusCode}',
          name: 'MusicSearchService',
        );
        throw Exception('Failed to search Vimeo: ${response.statusCode}');
      }

      // Parse response
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final items = data['data'] as List<dynamic>? ?? [];

      // Convert to MusicSearchResult objects
      final results = items
          .map(
            (item) =>
                MusicSearchResult.fromVimeoJson(item as Map<String, dynamic>),
          )
          .toList();

      developer.log(
        'Vimeo search successful: ${results.length} results found',
        name: 'MusicSearchService',
      );

      return results;
    } catch (e) {
      developer.log(
        'Vimeo search failed: $e',
        name: 'MusicSearchService',
        error: e,
      );
      return []; // Return empty list on error instead of rethrowing
    }
  }

  /// Search local device files for audio/video
  /// NOTE: Currently disabled due to plugin compatibility issues
  /// Users can still add local files via "Add Files" option
  Future<List<MusicSearchResult>> searchLocalFiles(
    String query, {
    int maxResults = _defaultMaxResults,
  }) async {
    developer.log(
      'Local file search is currently disabled. Use "Add Files" to add local content.',
      name: 'MusicSearchService',
    );
    return []; // Feature temporarily disabled
  }

  /// Search SoundCloud for music tracks
  /// Note: SoundCloud API requires client_id but public access is restricted
  /// Returning empty results for now - future enhancement: use oEmbed or client_id
  Future<List<MusicSearchResult>> searchSoundCloud(
    String query, {
    int maxResults = _defaultMaxResults,
  }) async {
    developer.log(
      'SoundCloud search disabled - API requires authentication',
      name: 'MusicSearchService',
    );
    // SoundCloud public API access is restricted
    // Would need proper client_id registration
    return [];

    /* Original implementation - kept for reference:
    if (query.trim().isEmpty) {
      developer.log('Empty search query', name: 'MusicSearchService');
      return [];
    }

    try {
      developer.log(
        'Searching SoundCloud: "$query" (max: $maxResults)',
        name: 'MusicSearchService',
      );

      // Build request URL with public API endpoint
      final uri = Uri.parse(_soundcloudSearchUrl).replace(
        queryParameters: {
          'q': query,
          'limit': maxResults.toString(),
          'client_id': 'public', // Public access
        },
      );

      // Make API request
      final response = await http.get(uri).timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        developer.log(
          'SoundCloud API error: ${response.statusCode}',
          name: 'MusicSearchService',
        );
        return [];
      }

      // Parse response
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final collection = data['collection'] as List<dynamic>? ?? [];

      // Convert to MusicSearchResult objects
      final results = collection
          .where((item) => item is Map<String, dynamic>)
          .map(
            (item) => MusicSearchResult(
              id: item['id'].toString(),
              title: item['title'] ?? 'Untitled',
              artist: item['user']?['username'] ?? 'Unknown Artist',
              thumbnailUrl: item['artwork_url'] ?? item['user']?['avatar_url'],
              url: item['permalink_url'] ?? '',
              platform: 'soundcloud',
              duration: Duration(milliseconds: item['duration'] ?? 0),
            ),
          )
          .toList();

      developer.log(
        'SoundCloud search successful: ${results.length} results found',
        name: 'MusicSearchService',
      );

      return results;
    } catch (e) {
      developer.log(
        'SoundCloud search failed: $e',
        name: 'MusicSearchService',
        error: e,
      );
      return [];
    }
    */
  }

  /// Search Dailymotion for videos
  /// Uses public API - no authentication required
  /// Filters for US/global content using country and language parameters
  Future<List<MusicSearchResult>> searchDailymotion(
    String query, {
    int maxResults = _defaultMaxResults,
    String country = 'us', // Default to US content
    String languages = 'en', // Default to English
  }) async {
    try {
      if (query.trim().isEmpty) {
        developer.log('Empty search query', name: 'MusicSearchService');
        return [];
      }

      developer.log(
        'Searching Dailymotion: "$query" (max: $maxResults, country: $country)',
        name: 'MusicSearchService',
      );

      // Build request URL with country and language filters
      final uri = Uri.parse(_dailymotionSearchUrl).replace(
        queryParameters: {
          'search': query,
          'limit': maxResults.toString(),
          'fields':
              'id,title,owner.screenname,thumbnail_large_url,url,duration',
          'country': country, // Filter by country (US)
          'languages': languages, // Filter by language (English)
          'sort': 'trending', // Get trending content
        },
      );

      // Make API request
      final response = await http.get(uri).timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        developer.log(
          'Dailymotion API error: ${response.statusCode}',
          name: 'MusicSearchService',
        );
        return [];
      }

      // Parse response
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final items = data['list'] as List<dynamic>? ?? [];

      // Convert to MusicSearchResult objects
      final results = items
          .where((item) => item is Map<String, dynamic>)
          .map(
            (item) => MusicSearchResult(
              id: item['id'] ?? '',
              title: item['title'] ?? 'Untitled',
              artist: item['owner.screenname'] ?? 'Unknown',
              thumbnailUrl: item['thumbnail_large_url'],
              url: item['url'] ?? '',
              platform: 'dailymotion',
              duration: Duration(seconds: item['duration'] ?? 0),
            ),
          )
          .toList();

      developer.log(
        'Dailymotion search successful: ${results.length} results found',
        name: 'MusicSearchService',
      );

      return results;
    } catch (e) {
      developer.log(
        'Dailymotion search failed: $e',
        name: 'MusicSearchService',
        error: e,
      );
      return []; // Return empty list on error
    }
  }

  /// Fetch Spotify track metadata by track ID
  /// Returns metadata map with thumbnail URL or null on error
  /// This bypasses CORS restrictions by fetching from native code
  Future<Map<String, dynamic>?> getSpotifyMetadata(String trackId) async {
    try {
      developer.log(
        'Fetching Spotify track metadata for ID: $trackId',
        name: 'MusicSearchService',
      );

      final endpoint =
          'https://open.spotify.com/oembed?url=https://open.spotify.com/track/$trackId';

      // Make HTTP request (no CORS restrictions in native code)
      final response = await http.get(Uri.parse(endpoint));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        final thumbnailUrl = data['thumbnail_url'];
        final title = data['title'];
        final artist = data['author_name'];

        developer.log(
          'Spotify metadata fetched: $title by $artist (thumbnail: ${thumbnailUrl != null})',
          name: 'MusicSearchService',
        );

        return {
          'thumbnailUrl': thumbnailUrl,
          'title': title,
          'artist': artist,
          'trackId': trackId,
        };
      } else {
        developer.log(
          'Spotify oEmbed API returned status ${response.statusCode}',
          name: 'MusicSearchService',
        );
        return null;
      }
    } catch (e) {
      developer.log(
        'Failed to fetch Spotify metadata: $e',
        name: 'MusicSearchService',
        error: e,
      );
      return null;
    }
  }

  /// Fetch Vimeo video metadata by URL
  /// Returns metadata map with thumbnail URL or null on error
  /// This bypasses CORS restrictions by fetching from native code
  Future<Map<String, dynamic>?> getVimeoMetadata(String url) async {
    try {
      developer.log(
        'Fetching Vimeo metadata for URL: $url',
        name: 'MusicSearchService',
      );

      final endpoint =
          'https://vimeo.com/api/oembed.json?url=${Uri.encodeComponent(url)}';

      // Make HTTP request (no CORS restrictions in native code)
      final response = await http.get(
        Uri.parse(endpoint),
        headers: {'Accept': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        final thumbnailUrl = data['thumbnail_url'];
        final title = data['title'];
        final author = data['author_name'];
        final videoId = data['video_id'];

        developer.log(
          'Vimeo metadata fetched: $title by $author (thumbnail: ${thumbnailUrl != null})',
          name: 'MusicSearchService',
        );

        return {
          'thumbnailUrl': thumbnailUrl,
          'title': title,
          'author': author,
          'videoId': videoId,
          'url': url,
        };
      } else {
        developer.log(
          'Vimeo oEmbed API returned status ${response.statusCode}',
          name: 'MusicSearchService',
        );
        return null;
      }
    } catch (e) {
      developer.log(
        'Failed to fetch Vimeo metadata: $e',
        name: 'MusicSearchService',
        error: e,
      );
      return null;
    }
  }

  /// Fetch Dailymotion video metadata by URL
  /// Returns metadata map with thumbnail URL or null on error
  /// This bypasses CORS restrictions by fetching from native code
  Future<Map<String, dynamic>?> getDailymotionMetadata(String url) async {
    try {
      developer.log(
        'Fetching Dailymotion metadata for URL: $url',
        name: 'MusicSearchService',
      );

      final endpoint =
          'https://www.dailymotion.com/services/oembed?url=${Uri.encodeComponent(url)}&format=json';

      // Make HTTP request (no CORS restrictions in native code)
      final response = await http.get(
        Uri.parse(endpoint),
        headers: {'Accept': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        final thumbnailUrl = data['thumbnail_url'];
        final title = data['title'];
        final author = data['author_name'];

        developer.log(
          'Dailymotion metadata fetched: $title by $author (thumbnail: ${thumbnailUrl != null})',
          name: 'MusicSearchService',
        );

        return {
          'thumbnailUrl': thumbnailUrl,
          'thumbnail_url': thumbnailUrl,
          'title': title,
          'author': author,
          'author_name': author,
          'url': url,
        };
      } else {
        developer.log(
          'Dailymotion oEmbed API returned status ${response.statusCode}',
          name: 'MusicSearchService',
        );
        return null;
      }
    } catch (e) {
      developer.log(
        'Failed to fetch Dailymotion metadata: $e',
        name: 'MusicSearchService',
        error: e,
      );
      return null;
    }
  }

  /// Fetch TikTok video metadata by URL with retry logic
  /// Returns metadata map with thumbnail URL or null on error
  /// This bypasses CORS restrictions by fetching from native code
  /// TikTok oEmbed API can be unreliable, so we retry with progressive timeouts
  Future<Map<String, dynamic>?> getTikTokMetadata(String url) async {
    final endpoint =
        'https://www.tiktok.com/oembed?url=${Uri.encodeComponent(url)}';

    // Retry configuration: 3 attempts with progressive timeouts
    const maxAttempts = 3;
    const timeouts = [
      Duration(seconds: 8),
      Duration(seconds: 12),
      Duration(seconds: 18),
    ];
    const delays = [Duration(seconds: 2), Duration(seconds: 4)];

    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        developer.log(
          'TikTok metadata attempt $attempt/$maxAttempts for URL: $url (timeout: ${timeouts[attempt - 1].inSeconds}s)',
          name: 'MusicSearchService',
        );

        // Make HTTP request with timeout
        final response = await http
            .get(Uri.parse(endpoint))
            .timeout(timeouts[attempt - 1]);

        if (response.statusCode == 200) {
          final data = json.decode(response.body);

          final thumbnailUrl = data['thumbnail_url'];
          final title = data['title'];
          final author = data['author_name'];

          // Validate that we have a thumbnail_url
          if (thumbnailUrl == null || thumbnailUrl.toString().isEmpty) {
            developer.log(
              'TikTok oEmbed data missing thumbnail_url on attempt $attempt',
              name: 'MusicSearchService',
            );

            // Retry if not last attempt
            if (attempt < maxAttempts) {
              await Future.delayed(delays[attempt - 1]);
              continue;
            } else {
              return null;
            }
          }

          developer.log(
            '✅ TikTok metadata fetched on attempt $attempt: $title by $author',
            name: 'MusicSearchService',
          );

          return {
            'thumbnailUrl': thumbnailUrl,
            'title': title,
            'author': author,
            'authorUrl': data['author_url'],
          };
        } else {
          developer.log(
            'TikTok oEmbed API returned status ${response.statusCode} on attempt $attempt',
            name: 'MusicSearchService',
          );

          // Retry if not last attempt
          if (attempt < maxAttempts) {
            await Future.delayed(delays[attempt - 1]);
            continue;
          } else {
            return null;
          }
        }
      } catch (e) {
        developer.log(
          'TikTok metadata attempt $attempt failed: $e',
          name: 'MusicSearchService',
          error: e,
        );

        // Retry if not last attempt
        if (attempt < maxAttempts) {
          await Future.delayed(delays[attempt - 1]);
          continue;
        } else {
          developer.log(
            'All TikTok metadata attempts exhausted for $url',
            name: 'MusicSearchService',
          );
          return null;
        }
      }
    }

    return null;
  }

  /// Fetch Instagram reel/post metadata by URL
  /// Returns metadata map with thumbnail URL or null on error
  /// This bypasses CORS restrictions by fetching from native code
  Future<Map<String, dynamic>?> getInstagramMetadata(String url) async {
    try {
      developer.log(
        'Fetching Instagram metadata for URL: $url',
        name: 'MusicSearchService',
      );

      final endpoint =
          'https://www.instagram.com/oembed?url=${Uri.encodeComponent(url)}';

      // Make HTTP request (no CORS restrictions in native code)
      final response = await http.get(Uri.parse(endpoint));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        final thumbnailUrl = data['thumbnail_url'];
        final title = data['title'];
        final author = data['author_name'];

        developer.log(
          'Instagram metadata fetched: $title by $author (thumbnail: ${thumbnailUrl != null})',
          name: 'MusicSearchService',
        );

        return {
          'thumbnailUrl': thumbnailUrl,
          'title': title,
          'author': author,
          'authorUrl': data['author_url'],
        };
      } else {
        developer.log(
          'Instagram oEmbed API returned status ${response.statusCode}',
          name: 'MusicSearchService',
        );
        return null;
      }
    } catch (e) {
      developer.log(
        'Failed to fetch Instagram metadata: $e',
        name: 'MusicSearchService',
        error: e,
      );
      return null;
    }
  }

  /// Fetch metadata for a single Deezer track/album/playlist by ID
  /// Returns metadata map with thumbnail URL or null on error
  /// This bypasses CORS restrictions by fetching from native code
  Future<Map<String, dynamic>?> getDeezerMetadata(
    String contentType,
    String contentId,
  ) async {
    try {
      developer.log(
        'Fetching Deezer $contentType metadata for ID: $contentId',
        name: 'MusicSearchService',
      );

      // Build API endpoint based on content type
      final String endpoint;
      switch (contentType) {
        case 'track':
          endpoint = 'https://api.deezer.com/track/$contentId';
          break;
        case 'album':
          endpoint = 'https://api.deezer.com/album/$contentId';
          break;
        case 'playlist':
          endpoint = 'https://api.deezer.com/playlist/$contentId';
          break;
        default:
          developer.log(
            'Invalid Deezer content type: $contentType',
            name: 'MusicSearchService',
          );
          return null;
      }

      // Make HTTP request (no CORS restrictions in native code)
      final response = await http.get(Uri.parse(endpoint));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        // Extract metadata based on content type
        String? thumbnailUrl;
        String? title;
        String? artist;

        if (contentType == 'track') {
          thumbnailUrl =
              data['album']?['cover_big'] ?? data['album']?['cover_medium'];
          title = data['title'];
          artist = data['artist']?['name'];
        } else if (contentType == 'album') {
          thumbnailUrl = data['cover_big'] ?? data['cover_medium'];
          title = data['title'];
          artist = data['artist']?['name'];
        } else if (contentType == 'playlist') {
          thumbnailUrl = data['picture_big'] ?? data['picture_medium'];
          title = data['title'];
          artist = data['user']?['name'];
        }

        developer.log(
          'Deezer metadata fetched: $title by $artist (thumbnail: ${thumbnailUrl != null})',
          name: 'MusicSearchService',
        );

        return {
          'thumbnailUrl': thumbnailUrl,
          'title': title,
          'artist': artist,
          'contentType': contentType,
          'contentId': contentId,
        };
      } else {
        developer.log(
          'Deezer API returned status ${response.statusCode}',
          name: 'MusicSearchService',
        );
        return null;
      }
    } catch (e) {
      developer.log(
        'Failed to fetch Deezer metadata: $e',
        name: 'MusicSearchService',
        error: e,
      );
      return null;
    }
  }

  /// Search across all supported platforms
  /// Platforms can be filtered using the platforms parameter
  Future<List<MusicSearchResult>> searchAllPlatforms(
    String query, {
    int maxResults = _defaultMaxResults,
    Set<String> platforms = const {
      'youtube',
      'deezer',
      'vimeo',
      'dailymotion',
      'local',
    },
  }) async {
    try {
      final results = <MusicSearchResult>[];
      final futures = <Future<List<MusicSearchResult>>>[];

      developer.log(
        'Searching platforms: ${platforms.join(", ")}',
        name: 'MusicSearchService',
      );

      // Create search tasks for each enabled platform
      if (platforms.contains('youtube')) {
        futures.add(searchYouTube(query, maxResults: maxResults));
      }
      if (platforms.contains('deezer')) {
        futures.add(searchDeezer(query, maxResults: maxResults));
      }
      if (platforms.contains('vimeo')) {
        futures.add(searchVimeo(query, maxResults: maxResults));
      }
      // SoundCloud removed - API discontinued, no search capability
      if (platforms.contains('dailymotion')) {
        futures.add(searchDailymotion(query, maxResults: maxResults));
      }
      if (platforms.contains('local')) {
        futures.add(searchLocalFiles(query, maxResults: maxResults));
      }

      // Execute all searches in parallel
      final allResults = await Future.wait(
        futures,
        eagerError: false, // Continue even if some platforms fail
      );

      // Combine all results
      for (final platformResults in allResults) {
        results.addAll(platformResults);
      }

      developer.log(
        'Multi-platform search complete: ${results.length} total results',
        name: 'MusicSearchService',
      );

      return results;
    } catch (e) {
      developer.log('Search failed: $e', name: 'MusicSearchService', error: e);
      return [];
    }
  }

  /// Get current quota usage information
  Future<Map<String, dynamic>> getQuotaStatus() async {
    return await _quotaService.getQuotaStatus();
  }

  /// Check if quota warning threshold reached (80%)
  Future<bool> isQuotaWarningThreshold() async {
    final status = await _quotaService.getQuotaStatus();
    return double.parse(status['percentUsed']) >= 80.0;
  }
}
