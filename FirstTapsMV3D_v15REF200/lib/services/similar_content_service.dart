import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/link_object.dart';
import '../config/recommendations_config.dart';
import 'dart:developer' as developer;

/// Service for fetching similar/related content from various platforms
/// Supports: YouTube, Deezer, Dailymotion, Vimeo
class SimilarContentService {
  static final SimilarContentService instance = SimilarContentService._init();
  SimilarContentService._init();

  /// Fetch related videos from YouTube based on a video URL
  Future<List<LinkObject>> getYouTubeRelatedVideos(
    String videoUrl, {
    int maxResults = 10,
  }) async {
    try {
      // Extract video ID from URL
      final videoId = _extractYouTubeVideoId(videoUrl);
      if (videoId == null) {
        _logError('Could not extract YouTube video ID from: $videoUrl');
        return [];
      }

      final apiKey = RecommendationsConfig.youtubeApiKey;
      if (apiKey.isEmpty) {
        _logError('YouTube API key not configured');
        return [];
      }

      // Use search endpoint with relatedToVideoId parameter
      final url = Uri.parse(
        '${RecommendationsConfig.youtubeApiBaseUrl}/search?'
        'part=snippet&'
        'relatedToVideoId=$videoId&'
        'type=video&'
        'maxResults=$maxResults&'
        'key=$apiKey',
      );

      _logDebug('Fetching YouTube related videos for: $videoId');

      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final videos = data['items'] as List;

        final links = videos.map((video) {
          final videoId = video['id']['videoId'];
          return LinkObject(
            id: 'yt-related-$videoId',
            url: 'https://www.youtube.com/watch?v=$videoId',
            title: video['snippet']['title'],
            platform: 'youtube',
            thumbnailUrl:
                video['snippet']['thumbnails']['high']['url'] ??
                video['snippet']['thumbnails']['default']['url'],
            metadata: json.encode({
              'description': video['snippet']['description'] ?? '',
              'channelTitle': video['snippet']['channelTitle'] ?? '',
              'publishedAt': video['snippet']['publishedAt'] ?? '',
            }),
          );
        }).toList();

        _logDebug('Found ${links.length} related YouTube videos');
        return links;
      } else {
        _logError('YouTube API error: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      _logError('Error fetching YouTube related videos: $e');
      return [];
    }
  }

  /// Search YouTube by artist name
  Future<List<LinkObject>> searchYouTubeByArtist(
    String artistName, {
    int maxResults = 10,
  }) async {
    try {
      final apiKey = RecommendationsConfig.youtubeApiKey;
      if (apiKey.isEmpty) return [];

      final url = Uri.parse(
        '${RecommendationsConfig.youtubeApiBaseUrl}/search?'
        'part=snippet&'
        'q=${Uri.encodeComponent(artistName)}&'
        'type=video&'
        'videoCategoryId=10&' // Music category
        'maxResults=$maxResults&'
        'key=$apiKey',
      );

      _logDebug('Searching YouTube for artist: $artistName');

      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final videos = data['items'] as List;

        final links = videos.map((video) {
          final videoId = video['id']['videoId'];
          return LinkObject(
            id: 'yt-search-$videoId',
            url: 'https://www.youtube.com/watch?v=$videoId',
            title: video['snippet']['title'],
            platform: 'youtube',
            thumbnailUrl:
                video['snippet']['thumbnails']['high']['url'] ??
                video['snippet']['thumbnails']['default']['url'],
            metadata: json.encode({
              'description': video['snippet']['description'] ?? '',
              'channelTitle': video['snippet']['channelTitle'] ?? '',
            }),
          );
        }).toList();

        _logDebug('Found ${links.length} videos for artist: $artistName');
        return links;
      } else {
        _logError('YouTube search error: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      _logError('Error searching YouTube: $e');
      return [];
    }
  }

  /// Get related artists from Deezer
  Future<List<LinkObject>> getDeezerRelatedArtists(
    String artistName, {
    int maxResults = 10,
  }) async {
    try {
      // First, search for the artist
      final searchUrl = Uri.parse(
        'https://api.deezer.com/search/artist?q=${Uri.encodeComponent(artistName)}',
      );

      _logDebug('Searching Deezer for artist: $artistName');

      final searchResponse = await http.get(searchUrl);
      if (searchResponse.statusCode != 200) {
        _logError('Deezer search error: ${searchResponse.statusCode}');
        return [];
      }

      final searchData = json.decode(searchResponse.body);
      final artists = searchData['data'] as List;

      if (artists.isEmpty) {
        _logDebug('No Deezer artist found for: $artistName');
        return [];
      }

      // Get the first matching artist's ID
      final artistId = artists.first['id'];

      // Fetch related artists
      final relatedUrl = Uri.parse(
        'https://api.deezer.com/artist/$artistId/related',
      );

      final relatedResponse = await http.get(relatedUrl);
      if (relatedResponse.statusCode != 200) {
        _logError(
          'Deezer related artists error: ${relatedResponse.statusCode}',
        );
        return [];
      }

      final relatedData = json.decode(relatedResponse.body);
      final relatedArtists = relatedData['data'] as List;

      final links = relatedArtists.take(maxResults).map((artist) {
        return LinkObject(
          id: 'deezer-artist-${artist['id']}',
          url: artist['link'],
          title: artist['name'],
          platform: 'deezer',
          thumbnailUrl: artist['picture_big'] ?? artist['picture_medium'],
          metadata: json.encode({
            'artistId': artist['id'],
            'fanCount': artist['nb_fan'] ?? 0,
          }),
        );
      }).toList();

      _logDebug('Found ${links.length} related Deezer artists');
      return links;
    } catch (e) {
      _logError('Error fetching Deezer related artists: $e');
      return [];
    }
  }

  /// Get top tracks from a Deezer artist
  Future<List<LinkObject>> getDeezerArtistTopTracks(
    String artistName, {
    int maxResults = 10,
  }) async {
    try {
      // Search for artist
      final searchUrl = Uri.parse(
        'https://api.deezer.com/search/artist?q=${Uri.encodeComponent(artistName)}',
      );

      final searchResponse = await http.get(searchUrl);
      if (searchResponse.statusCode != 200) return [];

      final searchData = json.decode(searchResponse.body);
      final artists = searchData['data'] as List;
      if (artists.isEmpty) return [];

      final artistId = artists.first['id'];

      // Fetch top tracks
      final tracksUrl = Uri.parse(
        'https://api.deezer.com/artist/$artistId/top?limit=$maxResults',
      );

      final tracksResponse = await http.get(tracksUrl);
      if (tracksResponse.statusCode != 200) return [];

      final tracksData = json.decode(tracksResponse.body);
      final tracks = tracksData['data'] as List;

      final links = tracks.map((track) {
        return LinkObject(
          id: 'deezer-track-${track['id']}',
          url: track['link'],
          title: '${track['artist']['name']} - ${track['title']}',
          platform: 'deezer',
          thumbnailUrl:
              track['album']['cover_big'] ?? track['album']['cover_medium'],
          metadata: json.encode({
            'trackId': track['id'],
            'duration': track['duration'] ?? 0,
            'rank': track['rank'] ?? 0,
          }),
        );
      }).toList();

      _logDebug('Found ${links.length} top tracks for: $artistName');
      return links;
    } catch (e) {
      _logError('Error fetching Deezer top tracks: $e');
      return [];
    }
  }

  /// Search Dailymotion for related videos
  Future<List<LinkObject>> searchDailymotionByArtist(
    String artistName, {
    int maxResults = 10,
  }) async {
    try {
      // Dailymotion API doesn't require auth for basic searches
      final url = Uri.parse(
        'https://api.dailymotion.com/videos?'
        'search=${Uri.encodeComponent(artistName)}&'
        'fields=id,title,thumbnail_url,url&'
        'limit=$maxResults',
      );

      _logDebug('Searching Dailymotion for: $artistName');

      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final videos = data['list'] as List;

        final links = videos.map((video) {
          return LinkObject(
            id: 'dailymotion-${video['id']}',
            url: video['url'],
            title: video['title'],
            platform: 'dailymotion',
            thumbnailUrl: video['thumbnail_url'],
            metadata: json.encode({'videoId': video['id']}),
          );
        }).toList();

        _logDebug('Found ${links.length} Dailymotion videos');
        return links;
      } else {
        _logError('Dailymotion API error: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      _logError('Error searching Dailymotion: $e');
      return [];
    }
  }

  /// Search Vimeo for related videos
  Future<List<LinkObject>> searchVimeoByArtist(
    String artistName, {
    int maxResults = 10,
  }) async {
    try {
      final accessToken = RecommendationsConfig.vimeoAccessToken;

      if (accessToken.isEmpty) {
        _logError('Vimeo access token not configured');
        return [];
      }

      final url = Uri.parse(
        '${RecommendationsConfig.vimeoApiBaseUrl}/videos?'
        'query=${Uri.encodeComponent(artistName)}&'
        'per_page=$maxResults&'
        'sort=relevant',
      );

      _logDebug('Searching Vimeo for: $artistName');

      final response = await http.get(
        url,
        headers: {
          'Authorization': 'bearer $accessToken',
          'Accept': 'application/vnd.vimeo.*+json;version=3.4',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final videos = data['data'] as List;

        final links = videos.map((video) {
          return LinkObject(
            id: 'vimeo-${video['uri'].toString().split('/').last}',
            url: video['link'],
            title: video['name'],
            platform: 'vimeo',
            thumbnailUrl: video['pictures']?['sizes']?.isNotEmpty == true
                ? video['pictures']['sizes'][2]['link']
                : null,
            metadata: json.encode({
              'videoId': video['uri'],
              'duration': video['duration'] ?? 0,
              'description': video['description'] ?? '',
            }),
          );
        }).toList();

        _logDebug('Found ${links.length} Vimeo videos');
        return links;
      } else if (response.statusCode == 401) {
        _logError('Vimeo authentication failed - check access token');
        return [];
      } else {
        _logError('Vimeo API error: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      _logError('Error searching Vimeo: $e');
      return [];
    }
  }

  /// Get recommendations based on multiple favorite links
  /// This combines results from multiple platforms
  Future<List<LinkObject>> getPersonalizedRecommendations({
    required List<String> favoriteUrls,
    required List<String> favoriteArtists,
    int maxResults = 20,
  }) async {
    final List<LinkObject> allRecommendations = [];

    try {
      // Get related content from YouTube videos
      for (final url in favoriteUrls.take(3)) {
        if (url.contains('youtube.com')) {
          final related = await getYouTubeRelatedVideos(url, maxResults: 5);
          allRecommendations.addAll(related);
        }
      }

      // Get content from favorite artists
      for (final artist in favoriteArtists.take(3)) {
        // YouTube
        final ytVideos = await searchYouTubeByArtist(artist, maxResults: 3);
        allRecommendations.addAll(ytVideos);

        // Deezer
        final deezerTracks = await getDeezerArtistTopTracks(
          artist,
          maxResults: 3,
        );
        allRecommendations.addAll(deezerTracks);

        // Dailymotion
        final dmVideos = await searchDailymotionByArtist(artist, maxResults: 2);
        allRecommendations.addAll(dmVideos);

        // Vimeo
        final vimeoVideos = await searchVimeoByArtist(artist, maxResults: 2);
        allRecommendations.addAll(vimeoVideos);
      }

      // Shuffle and limit results
      allRecommendations.shuffle();
      final limited = allRecommendations.take(maxResults).toList();

      _logDebug('Generated ${limited.length} personalized recommendations');
      return limited;
    } catch (e) {
      _logError('Error generating personalized recommendations: $e');
      return [];
    }
  }

  /// Extract YouTube video ID from various URL formats
  String? _extractYouTubeVideoId(String url) {
    final patterns = [
      RegExp(r'youtube\.com/watch\?v=([a-zA-Z0-9_-]+)'),
      RegExp(r'youtu\.be/([a-zA-Z0-9_-]+)'),
      RegExp(r'youtube\.com/embed/([a-zA-Z0-9_-]+)'),
    ];

    for (final pattern in patterns) {
      final match = pattern.firstMatch(url);
      if (match != null && match.groupCount > 0) {
        return match.group(1);
      }
    }

    return null;
  }

  void _logDebug(String message) {
    developer.log(message, name: 'SimilarContentService');
  }

  void _logError(String message) {
    developer.log(message, name: 'SimilarContentService', error: message);
  }
}
