import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import '../models/link_object.dart';
import '../models/cached_recommendation.dart';
import 'recommendations_storage.dart';
import '../config/recommendations_config.dart';
import 'music_search_service.dart';
import 'user_activity_service.dart';
import '../widgets/music_preferences_dialog.dart';
import 'dart:developer' as developer;
import 'content_feedback_service.dart';
import 'content_preference_learning_service.dart';

/// Service for fetching trending content from various platforms
/// Now supports: YouTube, Last.fm, Deezer, Vimeo, TikTok, Instagram, Dailymotion
/// Integrates with ContentFeedbackService for like/dislike filtering
class RecommendationService {
  final RecommendationsStorage _storage = RecommendationsStorage.instance;
  final MusicSearchService _musicSearchService = MusicSearchService();
  final ContentFeedbackService _feedbackService = contentFeedbackService;
  final ContentPreferenceLearningService _preferenceService =
      contentPreferenceLearningService;

  // Cache URL → metadata mapping for preference learning
  // Stores metadata for recently fetched content so we can record it on dislike
  final Map<String, Map<String, dynamic>> _metadataCache = {};

  /// Genre code mapping for prefix parsing
  /// Format in remote config: "P:https://url.com" where P = Pop
  static const Map<String, String> genreCodeMap = {
    'P': 'pop',
    'R': 'rock',
    'C': 'country',
    'E': 'electronic',
    'RH': 'hip_hop',
    'RB': 'r_and_b',
    'IN': 'indie',
    'CL': 'classical',
    'J': 'jazz',
    'L': 'latin',
    'RG': 'reggae',
  };

  /// Fetch trending shorts from multiple platforms
  /// Supports: YouTube Shorts, TikTok, Instagram Reels
  Future<List<LinkObject>> fetchTrendingShorts({
    String? regionCode,
    bool forceRefresh = false,
  }) async {
    _logDebug(
      '=== fetchTrendingShorts() CALLED (forceRefresh: $forceRefresh) ===',
    );
    try {
      // If force refresh, skip cache entirely
      if (!forceRefresh) {
        // Check cache first
        final cached = await _storage.getCachedRecommendation(
          RecommendationsConfig.contentCategoryShorts,
        );
        if (cached != null && cached.isValid) {
          final cachedLinks = _parseCachedLinks(cached.contentJson);
          final hasYouTube = cachedLinks.any(
            (link) => link.platform == RecommendationsConfig.platformYouTube,
          );

          if (!hasYouTube && RecommendationsConfig.enableYouTubeContent) {
            _logDebug('Cache missing YouTube content - forcing refresh');
            // Clear invalid cache and fetch fresh
            await _storage.deleteCachedRecommendation(
              RecommendationsConfig.contentCategoryShorts,
            );
          } else {
            _logDebug(
              'Returning cached shorts (${cachedLinks.length} links, YouTube: $hasYouTube)',
            );
            // Filter out disliked content before returning cache
            final filtered = await _filterDislikedContent(cachedLinks);
            _logDebug(
              '📊 After dislike filter: ${filtered.length} links (removed ${cachedLinks.length - filtered.length})',
            );
            return filtered;
          }
        }
      } else {
        _logDebug('🔄 Force refresh - bypassing cache completely');
      }

      _logDebug('Fetching FRESH shorts content (force refresh or no cache)...');
      List<LinkObject> allShorts = [];

      // CONTROLLED PLATFORM DISTRIBUTION FOR GALLERY WALL (10 slots):
      // Target: 5-6 YouTube, 1-2 Dailymotion, 1-2 Vimeo, 0-1 Instagram, 0-1 TikTok
      // Strategy: Limit each platform in shuffle pool to achieve desired distribution
      // - YouTube: 12 videos (54% of pool, expect ~5-6 in final 10)
      // - Dailymotion: 4 videos (18% of pool, expect ~1-2 in final 10)
      // - Vimeo: 3 videos (13% of pool, expect ~1-2 in final 10)
      // - Instagram: 2 videos (9% of pool, expect ~0-1 in final 10)
      // - TikTok: 1 video (4% of pool, expect ~0-1 in final 10)
      // Total pool: ~22 items → shuffle → take 10 for variety on each refresh

      // Fetch from YouTube (12 videos for 54% weight in shuffle pool)
      if (RecommendationsConfig.enableYouTubeContent) {
        _logDebug('Attempting to fetch YouTube shorts...');
        final ytShorts = await _fetchYouTubeShorts(regionCode);
        _logDebug('YouTube fetch returned ${ytShorts.length} shorts');
        allShorts.addAll(
          ytShorts.take(12),
        ); // Increased to 12 for dominant presence
      } else {
        _logDebug('YouTube content is DISABLED in config');
      }

      // Fetch from TikTok (limit to 1 for minimal presence)
      if (RecommendationsConfig.enableTikTokContent) {
        final tiktokPosts = await _fetchTikTokTrending();
        _logDebug(
          '🎵 [GALLERY] Adding ${tiktokPosts.take(1).length} TikTok video to shuffle pool',
        );
        allShorts.addAll(tiktokPosts.take(1)); // Limited to 1 for variety
      }

      // Fetch from Instagram (limit to 2 for minimal presence)
      if (RecommendationsConfig.enableInstagramContent) {
        final instaPosts = await _fetchInstagramTrending();
        _logDebug(
          '🎵 [GALLERY] Adding ${instaPosts.take(2).length} Instagram reels to shuffle pool',
        );
        allShorts.addAll(instaPosts.take(2)); // Limited to 2 for variety
      }

      // Fetch from Vimeo shorts (limit to 3 for secondary presence)
      if (RecommendationsConfig.enableVimeoContent) {
        final vimeoShorts = await _fetchVimeoShorts();
        _logDebug(
          '🎵 [GALLERY] Adding ${vimeoShorts.take(3).length} Vimeo shorts to shuffle pool',
        );
        allShorts.addAll(vimeoShorts.take(3)); // Limited to 3 for variety
      }

      // Fetch from Dailymotion (4 videos for secondary presence)
      if (RecommendationsConfig.enableDailymotionContent) {
        final dailymotionShorts = await _fetchDailymotionTrending();
        _logDebug(
          '🎥 [GALLERY] Adding ${dailymotionShorts.take(4).length} Dailymotion videos (API-based)',
        );
        allShorts.addAll(
          dailymotionShorts.take(4),
        ); // Increased to 4 for better presence
      }

      // Log platform distribution BEFORE shuffle
      final platformCounts = <String, int>{};
      for (final short in allShorts) {
        platformCounts[short.platform] =
            (platformCounts[short.platform] ?? 0) + 1;
      }
      _logDebug('📊 Platform distribution (${allShorts.length} total):');
      platformCounts.forEach((platform, count) {
        _logDebug('   $platform: $count videos');
      });

      // DIAGNOSTIC: Show first 15 URLs BEFORE shuffle to see if pool is changing
      _logDebug('🔍 [DIAGNOSTIC] First 15 URLs BEFORE shuffle:');
      for (var i = 0; i < allShorts.length && i < 15; i++) {
        _logDebug('  ${i + 1}. [${allShorts[i].platform}] ${allShorts[i].url}');
      }

      // Shuffle for variety (fresh shuffle on each fetch)
      allShorts.shuffle();

      // DIAGNOSTIC: Show first 15 URLs AFTER shuffle to verify randomization
      _logDebug('🔀 [DIAGNOSTIC] First 15 URLs AFTER shuffle:');
      for (var i = 0; i < allShorts.length && i < 15; i++) {
        _logDebug('  ${i + 1}. [${allShorts[i].platform}] ${allShorts[i].url}');
      }

      // CRITICAL: Filter out disliked content BEFORE caching
      _logDebug('📊 Filtering ${allShorts.length} links for dislikes...');
      final filteredShorts = await _filterDislikedContent(allShorts);
      _logDebug(
        '📊 After dislike filter: ${filteredShorts.length} links (removed ${allShorts.length - filteredShorts.length})',
      );

      // IMPORTANT: NO like-based boosting for Gallery Wall to preserve platform diversity
      // The shuffle + platform distribution ensures variety (TikTok, Instagram, Vimeo, Dailymotion, YouTube)
      // Dislike filtering is sufficient - it removes unwanted content without breaking the mix

      // Take configured max after filtering
      final links = filteredShorts
          .take(RecommendationsConfig.maxShortsPerFurniture)
          .toList();

      // DIAGNOSTIC: Show FINAL 10 URLs that will be sent to JavaScript
      _logDebug(
        '✅ [DIAGNOSTIC] FINAL ${links.length} URLs selected for Gallery Wall:',
      );
      for (var i = 0; i < links.length; i++) {
        _logDebug('  ${i + 1}. [${links[i].platform}] ${links[i].url}');
      }

      // Log final distribution
      final finalCounts = <String, int>{};
      for (final link in links) {
        finalCounts[link.platform] = (finalCounts[link.platform] ?? 0) + 1;
      }
      _logDebug('📊 Final gallery wall (${links.length} videos):');
      finalCounts.forEach((platform, count) {
        _logDebug('   $platform: $count videos');
      });

      // Cache the results
      await _cacheRecommendations(
        RecommendationsConfig.contentCategoryShorts,
        links,
        RecommendationsConfig.shortsCacheDuration,
      );

      // Log platform breakdown for verification
      final platformBreakdown = <String, int>{};
      for (final link in links) {
        platformBreakdown[link.platform] =
            (platformBreakdown[link.platform] ?? 0) + 1;
      }

      _logDebug(
        'Gallery Wall: ${links.length} shorts from ${_countPlatforms(links)} platforms: $platformBreakdown',
      );
      return links;
    } catch (e) {
      _logError('Error fetching trending shorts: $e');
      return [];
    }
  }

  /// Fetch YouTube Shorts via Cloudflare Worker proxy
  Future<List<LinkObject>> _fetchYouTubeShorts(String? regionCode) async {
    try {
      final region = regionCode ?? RecommendationsConfig.defaultRegionCode;
      final workerUrl = RecommendationsConfig.cloudflareWorkerUrl;

      _logDebug('Fetching YouTube shorts via Worker proxy');

      // Use Cloudflare Worker endpoint (keeps API key secure on server)
      final url = Uri.parse('$workerUrl/api/youtube/shorts').replace(
        queryParameters: {
          'maxResults': RecommendationsConfig.youtubeMaxResults.toString(),
          'regionCode': region,
        },
      );

      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final videos = data['items'] as List;

        _logDebug('YouTube API returned ${videos.length} videos');

        // Convert to LinkObjects (handle both videos and search endpoint formats)
        final links = videos
            .map((video) {
              try {
                // Extract video ID (format differs between endpoints)
                // Videos endpoint: id is a string
                // Search endpoint: id is an object with videoId property
                final videoId = video['id'] is String
                    ? video['id'] as String
                    : video['id']['videoId'] as String;

                // Get thumbnail URL with fallback chain
                final thumbnails =
                    video['snippet']['thumbnails'] as Map<String, dynamic>?;
                final thumbnailUrl =
                    thumbnails?['high']?['url'] ??
                    thumbnails?['medium']?['url'] ??
                    thumbnails?['default']?['url'] ??
                    '';

                // Build metadata with rich information for pattern detection
                final snippet = video['snippet'] as Map<String, dynamic>?;
                final metadataMap = <String, dynamic>{
                  'description': snippet?['description'] ?? '',
                  'channelTitle': snippet?['channelTitle'] ?? '',
                  'channelId': snippet?['channelId'] ?? '',
                  'language': snippet?['defaultAudioLanguage'] ?? '',
                  'tags': snippet?['tags'] ?? [],
                  'categoryId': snippet?['categoryId'] ?? '',
                };

                // Add optional fields if available
                if (video['contentDetails'] != null) {
                  metadataMap['duration'] = video['contentDetails']['duration'];
                  // Extract region restriction if exists
                  final contentDetails =
                      video['contentDetails'] as Map<String, dynamic>?;
                  final regionRestriction =
                      contentDetails?['regionRestriction']
                          as Map<String, dynamic>?;
                  if (regionRestriction?['allowed'] != null) {
                    metadataMap['allowedRegions'] =
                        regionRestriction?['allowed'];
                  }
                }
                if (video['statistics'] != null) {
                  metadataMap['viewCount'] =
                      video['statistics']['viewCount'] ?? '0';
                }

                return LinkObject(
                  id: 'yt-$videoId',
                  url: 'https://www.youtube.com/watch?v=$videoId',
                  title: video['snippet']['title'] ?? 'Untitled',
                  platform: RecommendationsConfig.platformYouTube,
                  thumbnailUrl: thumbnailUrl,
                  metadata: json.encode(metadataMap),
                );
              } catch (e) {
                _logDebug('⚠️ Failed to parse video: $e');
                return null;
              }
            })
            .whereType<LinkObject>()
            .toList();

        // DIAGNOSTIC: Show what YouTube is actually returning
        _logDebug('🎥 [DIAGNOSTIC] YouTube API returned these videos:');
        for (var i = 0; i < links.length && i < 10; i++) {
          _logDebug('  ${i + 1}. ${links[i].id} - ${links[i].title}');
        }

        _logDebug('Using all ${links.length} YouTube videos for gallery wall');

        _logDebug(
          'Created ${links.length} YouTube LinkObjects with platform="${RecommendationsConfig.platformYouTube}"',
        );
        if (links.isNotEmpty) {
          _logDebug(
            'Sample YouTube link: ${links.first.url} (platform: ${links.first.platform})',
          );
        }

        // Validate videos by checking thumbnail accessibility
        // Filter out unavailable videos (404 thumbnails) before caching
        _logDebug('Validating ${links.length} YouTube videos...');
        final validatedLinks = await _validateYouTubeVideos(links);
        _logDebug(
          'Validation complete: ${validatedLinks.length}/${links.length} videos available',
        );

        // PHASE 2: Apply learned preference filtering BEFORE returning
        final filteredLinks = await _applyPreferenceFiltering(validatedLinks);
        if (filteredLinks.length != validatedLinks.length) {
          _logDebug(
            '🔇 Preference filter: ${validatedLinks.length} → ${filteredLinks.length} videos '
            '(removed ${validatedLinks.length - filteredLinks.length} based on learned preferences)',
          );
        }

        return filteredLinks;
      } else {
        _logError('YouTube API error: ${response.statusCode}');
        _logError('YouTube API response: ${response.body}');
        return [];
      }
    } catch (e) {
      _logError('Error fetching YouTube shorts: $e');
      return [];
    }
  }

  /// Validate YouTube videos by checking thumbnail accessibility
  /// Filters out unavailable videos (404 thumbnails) to prevent caching broken links
  Future<List<LinkObject>> _validateYouTubeVideos(
    List<LinkObject> videos,
  ) async {
    if (videos.isEmpty) return videos;

    final validVideos = <LinkObject>[];
    final unavailableVideos = <String>[];

    for (final video in videos) {
      try {
        // Skip validation if thumbnail URL is null or empty
        final thumbnailUrl = video.thumbnailUrl;
        if (thumbnailUrl == null || thumbnailUrl.isEmpty) {
          validVideos.add(video);
          _logDebug('No thumbnail URL for ${video.id}, keeping video');
          continue;
        }

        // Check if thumbnail is accessible (HEAD request is faster than GET)
        final thumbnailResponse = await http
            .head(Uri.parse(thumbnailUrl))
            .timeout(
              const Duration(seconds: 3),
              onTimeout: () {
                // Timeout doesn't necessarily mean unavailable, keep the video
                _logDebug(
                  'Thumbnail check timeout for ${video.id}, keeping video',
                );
                return http.Response('', 200);
              },
            );

        if (thumbnailResponse.statusCode == 200) {
          validVideos.add(video);
        } else if (thumbnailResponse.statusCode == 404) {
          unavailableVideos.add('${video.title} (${video.id})');
          _logDebug(
            '❌ Filtered unavailable video: "${video.title}" - ${video.url}',
          );
        } else {
          // Other status codes - keep the video (might be temporary issue)
          validVideos.add(video);
          _logDebug(
            '⚠️ Unexpected status ${thumbnailResponse.statusCode} for ${video.id}, keeping video',
          );
        }
      } catch (e) {
        // Network errors - keep the video (might work when user tries to view it)
        validVideos.add(video);
        _logDebug('Error validating ${video.id}: $e, keeping video');
      }
    }

    if (unavailableVideos.isNotEmpty) {
      _logDebug(
        '🗑️ Filtered out ${unavailableVideos.length} unavailable videos:',
      );
      for (final video in unavailableVideos) {
        _logDebug('  - $video');
      }
    }

    return validVideos;
  }

  /// Fetch TikTok trending (manual curation)
  Future<List<LinkObject>> _fetchTikTokTrending() async {
    try {
      // Uses cached remote config (6hr expiry) - no need to fetch fresh from GitHub every time
      final urls = await RecommendationsConfig.getTikTokTrendingUrls();
      if (urls.isEmpty) {
        _logDebug('No TikTok URLs configured');
        return [];
      }

      _logDebug('🎵 TikTok: Remote config returned ${urls.length} URLs');
      _logDebug(
        '   URLs: ${urls.take(5).join(", ")}${urls.length > 5 ? "..." : ""}',
      );

      final links = <LinkObject>[];
      for (int i = 0; i < urls.length; i++) {
        final url = urls[i];
        // Extract video ID from URL for unique ID
        final videoId = url.split('/').last.split('?').first;

        links.add(
          LinkObject(
            id: 'tt-$videoId',
            url: url,
            title:
                'TikTok Video ${i + 1}', // Generic title, user can see actual title when loaded
            platform: RecommendationsConfig.platformTikTok,
            thumbnailUrl: '', // TikTok thumbnails loaded via embed/player
            metadata: json.encode({
              'description': 'Trending TikTok video',
              'source': 'manual_curation',
            }),
          ),
        );
      }

      _logDebug('Loaded ${links.length} TikTok videos from manual curation');
      return links;
    } catch (e) {
      _logError('Error loading TikTok videos: $e');
      return [];
    }
  }

  /// Fetch Instagram trending (manual curation)
  Future<List<LinkObject>> _fetchInstagramTrending() async {
    try {
      // Uses cached remote config (6hr expiry) - no need to fetch fresh from GitHub every time
      final urls = await RecommendationsConfig.getInstagramReelUrls();
      if (urls.isEmpty) {
        _logDebug('No Instagram URLs configured');
        return [];
      }

      _logDebug('Loading ${urls.length} manually curated Instagram reels...');

      final links = <LinkObject>[];
      for (int i = 0; i < urls.length; i++) {
        final url = urls[i];
        // Extract reel ID from URL for unique ID
        final reelId = url
            .split('/reels/')
            .last
            .split('/')
            .first
            .split('?')
            .first;

        links.add(
          LinkObject(
            id: 'ig-$reelId',
            url: url,
            title:
                'Instagram Reel ${i + 1}', // Generic title, user can see actual title when loaded
            platform: RecommendationsConfig.platformInstagram,
            thumbnailUrl: '', // Instagram thumbnails loaded via embed/player
            metadata: json.encode({
              'caption': 'Trending Instagram reel',
              'source': 'manual_curation',
            }),
          ),
        );
      }

      _logDebug('Loaded ${links.length} Instagram reels from manual curation');
      return links;
    } catch (e) {
      _logError('Error loading Instagram reels: $e');
      return [];
    }
  }

  /// Fetch Vimeo shorts for Gallery Wall
  /// Uses Staff Picks API for variety (comedy, art, experimental, music, etc.)
  Future<List<LinkObject>> _fetchVimeoShorts() async {
    try {
      _logDebug(
        '🎬 [VIMEO SHORTS] Fetching from Staff Picks API for Gallery Wall...',
      );

      // Fetch from general Staff Picks (not just music)
      // Gallery Wall wants variety: comedy, art, experimental, music, etc.
      final staffPicksVideos = await _fetchVimeoStaffPicks(
        maxResults: 50,
      ); // Fetch more for variety

      if (staffPicksVideos.isNotEmpty) {
        _logDebug(
          '🎬 [VIMEO SHORTS] Staff Picks returned ${staffPicksVideos.length} videos',
        );
        return staffPicksVideos;
      }

      // No fallback - if Staff Picks fails, return empty (don't use remote config)
      _logDebug('⚠️ [VIMEO SHORTS] Staff Picks API returned no results');

      final urls = await RecommendationsConfig.getVimeoShortsUrls();
      if (urls.isEmpty) {
        _logDebug('No Vimeo shorts URLs configured');
        return [];
      }

      _logDebug(
        '🎬 [VIMEO SHORTS] Loading ${urls.length} manually curated Vimeo shorts from remote config...',
      );

      final links = <LinkObject>[];
      for (int i = 0; i < urls.length; i++) {
        final url = urls[i];
        // Extract video ID from URL (e.g., https://vimeo.com/336892869 -> 336892869)
        final videoId = url.split('/').last.split('?').first;

        links.add(
          LinkObject(
            id: 'vm-short-$videoId',
            url: url,
            title:
                'Vimeo Short ${i + 1}', // Generic title, actual title loaded via oEmbed
            platform: RecommendationsConfig.platformVimeo,
            thumbnailUrl: '', // Vimeo thumbnails loaded via oEmbed
            metadata: json.encode({
              'description': 'Vimeo short video',
              'source': 'manual_curation',
            }),
          ),
        );
      }

      _logDebug(
        '🎬 [VIMEO SHORTS] Loaded ${links.length} Vimeo shorts from manual curation fallback',
      );
      return links;
    } catch (e) {
      _logError('Error loading Vimeo shorts: $e');
      return [];
    }
  }

  /// Fetch Dailymotion trending shorts (API-based)
  /// Uses Dailymotion public API for trending short videos
  /// Filters for US/global content using improved search queries
  Future<List<LinkObject>> _fetchDailymotionTrending() async {
    try {
      if (!RecommendationsConfig.enableDailymotionContent) {
        _logDebug('Dailymotion content is disabled');
        return [];
      }

      _logDebug('Fetching Dailymotion trending shorts via API (US/global)...');

      // Search for trending/popular short videos with US-focused keywords
      // Use terms that bias toward US/global content
      final searchResults = await _musicSearchService.searchDailymotion(
        'viral shorts comedy USA music dance',
        maxResults: RecommendationsConfig.dailymotionMaxResults,
        country: RecommendationsConfig.dailymotionCountry,
        languages: RecommendationsConfig.dailymotionLanguages,
      );

      if (searchResults.isEmpty) {
        _logDebug('No Dailymotion results found');
        return [];
      }

      // Return all videos ("shorts" = video content, not duration-based)
      final shorts = searchResults;

      // Convert to LinkObjects
      final links = shorts
          .map(
            (result) => LinkObject(
              id: 'dm-${result.id}',
              url: result.url,
              title: result.title,
              platform: RecommendationsConfig.platformDailymotion,
              thumbnailUrl: result.thumbnailUrl ?? '',
              metadata: json.encode({
                'duration': result.duration?.inSeconds ?? 0,
                'artist': result.artist,
                'description': 'Trending Dailymotion short',
              }),
            ),
          )
          .toList();

      _logDebug(
        'Loaded ${links.length} Dailymotion shorts from API (filtered from ${searchResults.length} results)',
      );
      return links;
    } catch (e) {
      _logError('Error fetching Dailymotion trending: $e');
      return [];
    }
  }

  /// Fetch Dailymotion music videos (API-based)
  /// Uses Dailymotion public API for music video content
  /// Filters for US/global content
  Future<List<LinkObject>> _fetchDailymotionMusicVideos() async {
    try {
      _logDebug('=== _fetchDailymotionMusicVideos() CALLED ===');

      if (!RecommendationsConfig.enableDailymotionContent) {
        _logDebug('❌ Dailymotion content is DISABLED in config');
        return [];
      }

      _logDebug(
        '✅ Dailymotion enabled, fetching music videos via API (US/global)...',
      );

      // Search for music videos with US-focused keywords
      final searchResults = await _musicSearchService.searchDailymotion(
        'official music video USA Billboard top hits',
        maxResults: RecommendationsConfig.dailymotionMaxResults,
        country: RecommendationsConfig.dailymotionCountry,
        languages: RecommendationsConfig.dailymotionLanguages,
      );

      _logDebug(
        '🔍 Dailymotion API returned ${searchResults.length} raw results',
      );

      if (searchResults.isEmpty) {
        _logDebug('⚠️ No Dailymotion music videos found from API');
        return [];
      }

      // Return all music videos (no duration filtering)
      // Music videos can be any length
      final musicVideos = searchResults;

      _logDebug('🎥 Found ${musicVideos.length} Dailymotion music videos');

      // Convert to LinkObjects
      final links = musicVideos
          .map(
            (result) => LinkObject(
              id: 'dm-${result.id}',
              url: result.url,
              title: result.title,
              platform: RecommendationsConfig.platformDailymotion,
              thumbnailUrl: result.thumbnailUrl ?? '',
              metadata: json.encode({
                'duration': result.duration?.inSeconds ?? 0,
                'artist': result.artist,
                'description': 'Dailymotion music video',
              }),
            ),
          )
          .toList();

      if (links.isNotEmpty) {
        _logDebug('✅ SUCCESS: Created ${links.length} Dailymotion LinkObjects');
        _logDebug(
          '  Sample Dailymotion video: "${links.first.title}" (${links.first.url})',
        );
      } else {
        _logDebug('❌ PROBLEM: All videos filtered out, returning empty list');
      }

      _logDebug(
        '=== _fetchDailymotionMusicVideos() COMPLETE: ${links.length} videos (filtered from ${searchResults.length} results) ===',
      );
      return links;
    } catch (e, stackTrace) {
      _logError('ERROR in _fetchDailymotionMusicVideos: $e');
      _logError('Stack trace: $stackTrace');
      return [];
    }
  }

  /// Fetch trending music from multiple sources
  /// Supports: Spotify public playlists, Deezer, SoundCloud, YouTube audio tracks
  /// ENSURES MULTI-PLATFORM MIX by taking limited samples from each platform
  Future<List<LinkObject>> fetchTrendingMusic({
    String? regionCode,
    bool forceRefresh = false,
  }) async {
    try {
      // If force refresh, skip cache entirely
      if (!forceRefresh) {
        // Check cache first
        final cached = await _storage.getCachedRecommendation(
          RecommendationsConfig.contentCategoryMusic,
        );
        if (cached != null && cached.isValid) {
          final cachedLinks = _parseCachedLinks(cached.contentJson);
          // Filter out disliked content before returning cache
          final filtered = await _filterDislikedContent(cachedLinks);
          _logDebug(
            '📊 Trending Music cache: ${cachedLinks.length} → ${filtered.length} (removed ${cachedLinks.length - filtered.length} disliked)',
          );
          return filtered;
        }
      } else {
        _logDebug('🔄 Force refresh - bypassing Trending Music cache');
      }

      List<LinkObject> allMusic = [];

      // MULTI-PLATFORM MIXING STRATEGY:
      // Small stage has 30 slots - fetch extra to compensate for genre filtering
      // YouTube Music: 25 tracks
      // Spotify: 20 tracks (100+ available in remote config)
      // Deezer: 15 tracks (API-based)
      // SoundCloud: 20 tracks (75 available in remote config)
      // Total: ~80 tracks → filter by genre/hidden → shuffle → take 30

      // Fetch from YouTube Music (25 tracks)
      if (RecommendationsConfig.enableYouTubeContent) {
        final ytMusic = await _fetchYouTubeMusicAudio(regionCode);
        allMusic.addAll(ytMusic.take(25)); // Extra to compensate for filtering
      }

      // Fetch from Spotify public playlists (20 tracks from 100+ available)
      if (RecommendationsConfig.enableSpotifyPublicPlaylists) {
        final spotifyTracks = await _fetchSpotifyPublicPlaylistTracks();
        _logDebug(
          '🎵 [SMALL STAGE] Adding ${spotifyTracks.take(20).length} Spotify tracks (${spotifyTracks.length} available)',
        );
        allMusic.addAll(
          spotifyTracks.take(20),
        ); // Extra to compensate for filtering
      }

      // Fetch from Deezer (15 tracks - API based)
      if (RecommendationsConfig.enableDeezerContent) {
        final deezerTracks = await _fetchDeezerChartTracks();
        allMusic.addAll(
          deezerTracks.take(15),
        ); // Extra to compensate for filtering
      }

      // Fetch from SoundCloud (20 tracks from 75 available in remote config)
      if (RecommendationsConfig.enableSoundCloudContent) {
        final soundCloudTracks = await _fetchSoundCloudPublicTracks();
        _logDebug(
          '🎵 [SMALL STAGE] Adding ${soundCloudTracks.take(20).length} SoundCloud tracks (${soundCloudTracks.length} available)',
        );
        allMusic.addAll(
          soundCloudTracks.take(20),
        ); // Extra to compensate for filtering
      }

      // Shuffle for variety across platforms
      allMusic.shuffle();
      final links = allMusic
          .take(RecommendationsConfig.maxMusicPerFurniture)
          .toList();

      // Apply filtering (hidden links + genre preferences) at the END
      final filtered = await _filterLinks(links);

      // Cache the results
      await _cacheRecommendations(
        RecommendationsConfig.contentCategoryMusic,
        filtered,
        RecommendationsConfig.musicCacheDuration,
      );

      // Log platform breakdown for verification
      final platformBreakdown = <String, int>{};
      for (final link in filtered) {
        platformBreakdown[link.platform] =
            (platformBreakdown[link.platform] ?? 0) + 1;
      }
      _logDebug(
        'Fetched ${filtered.length} music tracks from ${_countPlatforms(filtered)} platforms: $platformBreakdown',
      );
      return filtered;
    } catch (e) {
      _logError('Error fetching trending music: $e');
      return [];
    }
  }

  /// Fetch Spotify tracks from manually curated public playlist URLs
  /// No API needed - uses public track links from config
  /// NOTE: Genre filtering not applied - remote config URLs lack genre metadata
  Future<List<LinkObject>> _fetchSpotifyPublicPlaylistTracks() async {
    try {
      final trackUrls = await RecommendationsConfig.getSpotifyUrls();

      if (trackUrls.isEmpty || trackUrls.first.contains('EXAMPLE')) {
        _logError(
          'Spotify track URLs not configured. Update spotifyTrendingTrackUrls in config.',
        );
        return [];
      }

      _logDebug(
        'Loading ${trackUrls.length} Spotify tracks from remote config...',
      );

      final links = trackUrls
          .map((urlString) {
            // Parse URL with optional genre prefix (e.g., "P:https://...")
            final parsed = _parseUrlWithGenre(urlString);
            final url = parsed['url']!;
            final genre = parsed['genre'];

            // Extract track ID from URL
            final trackId = url.split('/').last.split('?').first;

            // Create LinkObject
            return LinkObject(
              id: 'spotify-$trackId',
              url: url,
              title:
                  'Spotify Track $trackId', // TODO: Enhance with metadata if needed
              platform: RecommendationsConfig.platformSpotify,
              thumbnailUrl: '', // Can be enhanced with Spotify oEmbed if needed
              metadata: json.encode({
                'source': 'public_playlist',
                'playlist_id': RecommendationsConfig.spotifyTopHitsPlaylistId,
                'description': 'Trending track from public playlist',
                if (genre != null) 'genre': genre,
              }),
            );
          })
          .cast<LinkObject>()
          .toList();

      _logDebug('Loaded ${links.length} Spotify tracks from public playlists');

      // Return without filtering - will be filtered at the end of fetchTrendingMusic()
      return links;
    } catch (e) {
      _logError('Error loading Spotify public playlist tracks: $e');
      return [];
    }
  }

  /// Fetch Deezer chart tracks (FREE, no auth required)
  Future<List<LinkObject>> _fetchDeezerChartTracks() async {
    try {
      final url = Uri.parse(
        '${RecommendationsConfig.deezerApiBaseUrl}'
        '${RecommendationsConfig.deezerChartTracksEndpoint}'
        '?limit=${RecommendationsConfig.maxMusicPerFurniture}',
      );

      _logDebug('Fetching Deezer chart tracks...');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final tracks = data['data'] as List;

        final links = tracks
            .map((track) {
              return LinkObject(
                id: 'dz-${track['id']}',
                url: track['link'] ?? '',
                title: '${track['title']} - ${track['artist']['name']}',
                platform: RecommendationsConfig.platformDeezer,
                thumbnailUrl:
                    track['album']['cover_big'] ?? track['album']['cover'],
                metadata: json.encode({
                  'preview': track['preview'], // 30-second preview URL
                  'duration': track['duration'],
                  'rank': track['position'],
                  'description': 'Rank: ${track['position']}',
                }),
              );
            })
            .cast<LinkObject>()
            .toList();

        _logDebug('Fetched ${links.length} Deezer tracks');
        return links;
      } else {
        _logError('Deezer API error: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      _logError('Error fetching Deezer tracks: $e');
      return [];
    }
  }

  /// Fetch SoundCloud tracks from manually curated public track URLs
  /// No API needed - uses public track links from config
  /// NOTE: Genre filtering not applied - remote config URLs lack genre metadata
  Future<List<LinkObject>> _fetchSoundCloudPublicTracks() async {
    try {
      final trackUrls = await RecommendationsConfig.getSoundCloudUrls();

      if (trackUrls.isEmpty) {
        _logError(
          'SoundCloud track URLs not configured. Update soundCloudTrendingUrls in config.',
        );
        return [];
      }

      _logDebug(
        'Loading ${trackUrls.length} SoundCloud tracks from remote config...',
      );

      final links = trackUrls
          .map((urlString) {
            // Parse URL with optional genre prefix (e.g., "P:https://...")
            final parsed = _parseUrlWithGenre(urlString);
            final url = parsed['url']!;
            final genre = parsed['genre'];

            // Extract track info from URL
            final parts = url.split('/');
            final artist = parts.length > 3 ? parts[3] : 'Unknown Artist';
            final trackSlug = parts.length > 4 ? parts[4] : 'Unknown Track';
            final trackName = trackSlug.replaceAll('-', ' ');

            // Create LinkObject
            return LinkObject(
              id: 'soundcloud-$trackSlug',
              url: url,
              title: '$trackName - $artist',
              platform: RecommendationsConfig.platformSoundCloud,
              thumbnailUrl:
                  '', // Can be enhanced with SoundCloud oEmbed if needed
              metadata: json.encode({
                'source': 'public_track',
                'artist': artist,
                'description': 'Trending track from SoundCloud',
                if (genre != null) 'genre': genre,
              }),
            );
          })
          .cast<LinkObject>()
          .toList();

      _logDebug('Loaded ${links.length} SoundCloud tracks from public URLs');

      // Apply filtering (hidden links + genre preferences)
      final filtered = await _filterLinks(links);
      return filtered;
    } catch (e) {
      _logError('Error loading SoundCloud public tracks: $e');
      return [];
    }
  }

  /// Fetch YouTube audio tracks via Cloudflare Worker proxy
  Future<List<LinkObject>> _fetchYouTubeMusicAudio(String? regionCode) async {
    try {
      final region = regionCode ?? RecommendationsConfig.defaultRegionCode;
      final workerUrl = RecommendationsConfig.cloudflareWorkerUrl;

      // Use Cloudflare Worker endpoint (keeps API key secure on server)
      final url = Uri.parse(
        '$workerUrl/api/youtube/music-audio',
      ).replace(queryParameters: {'maxResults': '20', 'regionCode': region});

      _logDebug('Fetching YouTube music audio via Worker proxy...');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final videos = data['items'] as List;

        final links = videos
            .map((video) {
              final videoId = video['id']['videoId'];
              return LinkObject(
                id: 'yt-audio-$videoId',
                url: 'https://www.youtube.com/watch?v=$videoId',
                title: video['snippet']['title'],
                platform: RecommendationsConfig.platformYouTube,
                thumbnailUrl: video['snippet']['thumbnails']['high']['url'],
                metadata: json.encode({
                  'description': video['snippet']['description'] ?? '',
                }),
              );
            })
            .cast<LinkObject>()
            .toList();

        _logDebug('Fetched ${links.length} YouTube audio tracks');
        return links;
      }
      return [];
    } catch (e) {
      _logError('Error fetching YouTube audio: $e');
      return [];
    }
  }

  /// Fetch trending music videos from multiple platforms
  /// Supports: YouTube, Vimeo, TikTok
  Future<List<LinkObject>> fetchTrendingMusicVideos({
    String? regionCode,
    bool forceRefresh = false,
  }) async {
    _logDebug(
      '=== fetchTrendingMusicVideos() CALLED (forceRefresh: $forceRefresh) ===',
    );
    try {
      // If force refresh, skip cache entirely
      if (!forceRefresh) {
        // Check cache first
        final cached = await _storage.getCachedRecommendation(
          RecommendationsConfig.contentCategoryMusicVideos,
        );
        if (cached != null && cached.isValid) {
          final cachedLinks = _parseCachedLinks(cached.contentJson);

          // Validate cache actually has content - don't return empty cache
          if (cachedLinks.isEmpty) {
            _logDebug('Cache is empty - forcing refresh');
          } else {
            _logDebug(
              'Returning ${cachedLinks.length} cached music videos from ${_countPlatforms(cachedLinks)} platforms',
            );
            // Filter out disliked content before returning cache
            final filtered = await _filterDislikedContent(cachedLinks);
            _logDebug(
              '📊 Music Videos cache: ${cachedLinks.length} → ${filtered.length} (removed ${cachedLinks.length - filtered.length} disliked)',
            );
            return filtered;
          }
        } else {
          _logDebug('No valid cache found - fetching fresh music videos');
        }
      } else {
        _logDebug('🔄 Force refresh - bypassing Music Videos cache');
      }

      List<LinkObject> allVideos = [];

      // RISER PLATFORM DISTRIBUTION STRATEGY:
      // Target: 9 YouTube + 3 Vimeo + 3 Dailymotion = 15 music videos
      // Approach: Fetch extras, shuffle each platform separately, then combine
      // This guarantees correct platform proportions while maintaining variety

      // Fetch from YouTube (fetch 15, shuffle, take 9)
      if (RecommendationsConfig.enableYouTubeContent) {
        final ytVideos = await _fetchYouTubeMusicVideos(regionCode);
        _logDebug(
          '🎥 [RISER] YouTube API returned ${ytVideos.length} music videos',
        );
        ytVideos.shuffle(); // Shuffle first for variety
        allVideos.addAll(
          ytVideos.take(12),
        ); // Take 12 to compensate for filtering, target 9
      }

      // Fetch from Dailymotion music videos (fetch 6, shuffle, take 3)
      if (RecommendationsConfig.enableDailymotionContent) {
        _logDebug('🎥 [RISER] Attempting to fetch Dailymotion music videos...');
        final dailymotionMusic = await _fetchDailymotionMusicVideos();
        _logDebug(
          '🎥 [RISER] Dailymotion API returned ${dailymotionMusic.length} music videos',
        );
        if (dailymotionMusic.isEmpty) {
          _logDebug('⚠️ [RISER] WARNING: Dailymotion returned ZERO videos!');
        } else {
          dailymotionMusic.shuffle(); // Shuffle first
          allVideos.addAll(
            dailymotionMusic.take(6),
          ); // Take 6 to compensate for filtering, target 3
          _logDebug(
            '🎥 [RISER] Adding ${dailymotionMusic.take(6).length} Dailymotion videos to riser',
          );
        }
      } else {
        _logDebug('❌ [RISER] Dailymotion content is DISABLED in config');
      }

      // Fetch from Vimeo (fetch 6 from Staff Picks, shuffle, take 3)
      if (RecommendationsConfig.enableVimeoContent) {
        final vimeoVideos = await _fetchVimeoStaffPicksMusicVideos(
          maxResults: 20,
        ); // Fetch 20 to ensure variety after filtering
        _logDebug(
          '🎥 [RISER] Vimeo Staff Picks returned ${vimeoVideos.length} music videos',
        );
        vimeoVideos.shuffle(); // Shuffle first for variety
        allVideos.addAll(
          vimeoVideos.take(6),
        ); // Take 6 to compensate for filtering, target 3
      }

      // Log pre-filter breakdown
      final preFilterBreakdown = <String, int>{};
      for (final link in allVideos) {
        preFilterBreakdown[link.platform] =
            (preFilterBreakdown[link.platform] ?? 0) + 1;
      }
      _logDebug(
        '🎥 [RISER] Pre-filter: ${allVideos.length} total videos from ${_countPlatforms(allVideos)} platforms: $preFilterBreakdown',
      );

      // Apply light shuffle for variety within each platform batch
      // (Each platform was already shuffled before being added to allVideos)
      allVideos.shuffle();

      // Take 15 videos (will naturally be ~9 YouTube, ~3 Vimeo, ~3 Dailymotion based on our proportions)
      final links = allVideos.take(15).toList();

      // Apply filtering (hidden links + genre preferences) at the END
      final filtered = await _filterLinks(links);

      // Cache the results
      await _cacheRecommendations(
        RecommendationsConfig.contentCategoryMusicVideos,
        filtered,
        RecommendationsConfig.videoCacheDuration,
      );

      final platformBreakdown = <String, int>{};
      for (final link in filtered) {
        platformBreakdown[link.platform] =
            (platformBreakdown[link.platform] ?? 0) + 1;
      }

      _logDebug(
        '🎥 [RISER] Final: ${filtered.length} music videos from ${_countPlatforms(filtered)} platforms: $platformBreakdown (Target: 9 YouTube, 3 Vimeo, 3 Dailymotion)',
      );
      return filtered;
    } catch (e) {
      _logError('Error fetching music videos: $e');
      return [];
    }
  }

  /// Fetch YouTube music videos via Cloudflare Worker proxy
  Future<List<LinkObject>> _fetchYouTubeMusicVideos(String? regionCode) async {
    try {
      final region = regionCode ?? RecommendationsConfig.defaultRegionCode;
      final workerUrl = RecommendationsConfig.cloudflareWorkerUrl;

      // Use Cloudflare Worker endpoint (keeps API key secure on server)
      final url = Uri.parse('$workerUrl/api/youtube/music-videos').replace(
        queryParameters: {
          'maxResults': RecommendationsConfig.youtubeMaxResults.toString(),
          'regionCode': region,
        },
      );

      _logDebug('Fetching YouTube music videos via Worker proxy...');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final videos = data['items'] as List;

        // Filter out shorts, keep only longer music videos
        final musicVideos = videos.where((video) {
          final duration = video['contentDetails']['duration'];
          return _parseDuration(duration) >
              Duration(seconds: RecommendationsConfig.shortsDurationThreshold);
        }).toList();

        final links = musicVideos
            .map((video) {
              return LinkObject(
                id: 'yt-${video['id']}',
                url: 'https://www.youtube.com/watch?v=${video['id']}',
                title: video['snippet']['title'],
                platform: RecommendationsConfig.platformYouTube,
                thumbnailUrl: video['snippet']['thumbnails']['high']['url'],
                metadata: json.encode({
                  'duration': video['contentDetails']['duration'],
                  'viewCount': video['statistics']['viewCount'] ?? '0',
                  'description': video['snippet']['description'] ?? '',
                }),
              );
            })
            .cast<LinkObject>()
            .toList();

        _logDebug('Fetched ${links.length} YouTube music videos');

        // Validate videos by checking thumbnail accessibility
        _logDebug('Validating ${links.length} YouTube music videos...');
        final validatedLinks = await _validateYouTubeVideos(links);
        _logDebug(
          'Validation complete: ${validatedLinks.length}/${links.length} music videos available',
        );

        return validatedLinks;
      }
      return [];
    } catch (e) {
      _logError('Error fetching YouTube music videos: $e');
      return [];
    }
  }

  /// Fetch Vimeo music videos (MANUAL CURATION WITH API METADATA)
  /// Vimeo Category API is too slow/unreliable - using curated URLs
  /// Metadata is cached for 3 days to avoid rate limiting (429 errors)
  ///
  /// NOTE: Genre filtering is NOT applied to remote config URLs yet.
  /// TODO: Migrate to use Cloudflare Worker /api/vimeo/staff-picks endpoint
  Future<List<LinkObject>> _fetchVimeoMusicVideos() async {
    try {
      // TODO: Update to use worker endpoint instead of direct API calls
      final accessToken = RecommendationsConfig.vimeoAccessToken;
      if (accessToken.isEmpty) {
        _logError('Vimeo: Use Cloudflare Worker endpoint instead');
        return [];
      }

      // Check cache first
      final storage = RecommendationsStorage.instance;
      final isCacheValid = await storage.isVimeoCacheValid(
        RecommendationsConfig.vimeoUpdateInterval,
      );

      if (isCacheValid) {
        final cachedMetadata = await storage.getVimeoCache();
        if (cachedMetadata.isNotEmpty) {
          _logDebug(
            'Using cached Vimeo metadata (${cachedMetadata.length} videos)',
          );
          _logDebug(
            '⚠️ Genre filtering not applied - remote config URLs lack genre metadata',
          );
          return await _buildVimeoLinksFromCache(cachedMetadata);
        }
      }

      final vimeoUrls = await RecommendationsConfig.getVimeoMusicUrls();

      _logDebug(
        'Fetching fresh Vimeo metadata for ${vimeoUrls.length} videos (sequential with delay)',
      );

      final links = <LinkObject>[];
      final metadataCache = <String, String>{};
      var successCount = 0;
      var fallbackCount = 0;

      // Fetch sequentially with 300ms delay to avoid rate limiting
      for (var i = 0; i < vimeoUrls.length; i++) {
        // Parse URL with optional genre prefix (e.g., "P:https://...")
        final parsed = _parseUrlWithGenre(vimeoUrls[i]);
        final url = parsed['url']!;
        final genre = parsed['genre'];

        try {
          // Extract video ID from URL (e.g., https://vimeo.com/247467951 -> 247467951)
          final videoId = url.split('/').last.split('?').first;

          // Fetch metadata from Vimeo API
          final apiUrl = Uri.parse(
            '${RecommendationsConfig.vimeoApiBaseUrl}/videos/$videoId',
          );

          final response = await http
              .get(apiUrl, headers: {'Authorization': 'Bearer $accessToken'})
              .timeout(const Duration(seconds: 5));

          if (response.statusCode == 200) {
            final video = json.decode(response.body);

            // Get the best thumbnail available
            final pictures = video['pictures']?['sizes'] as List?;
            final thumbnailUrl = pictures?.last['link'] ?? '';

            final metadata = {
              'title': video['name'] ?? 'Vimeo Music Video',
              'thumbnailUrl': thumbnailUrl,
              'duration': video['duration'],
              'plays': video['stats']?['plays'],
              'description': video['description'] ?? '',
              'source': 'manual_curation',
              if (genre != null) 'genre': genre,
            };

            // Cache the metadata
            metadataCache[videoId] = json.encode(metadata);

            links.add(
              LinkObject(
                id: 'vm-$videoId',
                url: url,
                title: metadata['title'] as String,
                platform: RecommendationsConfig.platformVimeo,
                thumbnailUrl: thumbnailUrl,
                metadata: json.encode(metadata),
              ),
            );
            successCount++;
            _logDebug('✓ Fetched metadata for Vimeo video $videoId');
          } else if (response.statusCode == 429) {
            // Rate limited - use fallback LinkObject without metadata
            fallbackCount++;
            _logError(
              'Vimeo rate limit (429) for video $videoId - using fallback',
            );
            final fallbackMetadata = {
              'title': 'Vimeo Music Video ${i + 1}',
              'source': 'manual_curation_fallback',
              if (genre != null) 'genre': genre,
            };
            metadataCache[videoId] = json.encode(fallbackMetadata);
            links.add(
              LinkObject(
                id: 'vm-$videoId',
                url: url,
                title: 'Vimeo Music Video ${i + 1}',
                platform: RecommendationsConfig.platformVimeo,
                thumbnailUrl: '',
                metadata: json.encode(fallbackMetadata),
              ),
            );
          } else {
            fallbackCount++;
            _logError(
              'Failed to fetch Vimeo video $videoId metadata: ${response.statusCode}',
            );
            // Still add fallback LinkObject so user can access the video
            final fallbackMetadata = {
              'title': 'Vimeo Music Video ${i + 1}',
              'source': 'manual_curation_fallback',
              if (genre != null) 'genre': genre,
            };
            metadataCache[videoId] = json.encode(fallbackMetadata);
            links.add(
              LinkObject(
                id: 'vm-$videoId',
                url: url,
                title: 'Vimeo Music Video ${i + 1}',
                platform: RecommendationsConfig.platformVimeo,
                thumbnailUrl: '',
                metadata: json.encode(fallbackMetadata),
              ),
            );
          }

          // Add delay between requests to avoid rate limiting
          // Skip delay on last iteration
          if (i < vimeoUrls.length - 1) {
            await Future.delayed(const Duration(milliseconds: 300));
          }
        } catch (e) {
          fallbackCount++;
          _logError('Error fetching Vimeo video metadata: $e');
          // Add fallback LinkObject
          final videoId = url.split('/').last.split('?').first;
          final fallbackMetadata = {
            'title': 'Vimeo Music Video ${i + 1}',
            'source': 'manual_curation_fallback',
            if (genre != null) 'genre': genre,
          };
          metadataCache[videoId] = json.encode(fallbackMetadata);
          links.add(
            LinkObject(
              id: 'vm-$videoId',
              url: url,
              title: 'Vimeo Music Video ${i + 1}',
              platform: RecommendationsConfig.platformVimeo,
              thumbnailUrl: '',
              metadata: json.encode(fallbackMetadata),
            ),
          );
        }
      }

      // Save metadata to cache for next time
      if (metadataCache.isNotEmpty) {
        await storage.saveVimeoCache(metadataCache);
        _logDebug('Cached Vimeo metadata for ${metadataCache.length} videos');
      }

      _logDebug(
        'Loaded ${links.length}/${vimeoUrls.length} Vimeo videos (✓ $successCount with metadata, ⚠ $fallbackCount fallbacks)',
      );

      // Return without filtering - will be filtered at the end of fetchTrendingMusicVideos()
      return links;
    } catch (e) {
      _logError('Error loading Vimeo manual curation: $e');
      return [];
    }
  }

  /// Fetch general Vimeo Staff Picks (all categories) for Gallery Wall
  /// Does not filter by music - includes comedy, art, experimental, etc.
  /// TODO: Migrate to use Cloudflare Worker /api/vimeo/staff-picks endpoint
  Future<List<LinkObject>> _fetchVimeoStaffPicks({int maxResults = 50}) async {
    try {
      // TODO: Update to use worker endpoint instead of direct API calls
      final accessToken = RecommendationsConfig.vimeoAccessToken;
      if (accessToken.isEmpty) {
        _logError('Vimeo: Use Cloudflare Worker endpoint instead');
        return [];
      }

      _logDebug(
        '🎬 [VIMEO STAFF PICKS] Fetching general Staff Picks for Gallery Wall...',
      );

      // Query Vimeo Staff Picks channel WITHOUT music filter
      // Get variety: comedy, art, experimental, animation, music, etc.
      final apiUrl =
          Uri.parse(
            '${RecommendationsConfig.vimeoApiBaseUrl}/channels/staffpicks/videos',
          ).replace(
            queryParameters: {
              // NO query parameter - fetch all types of Staff Picks
              'per_page': maxResults.toString(),
              'fields':
                  'uri,name,link,description,duration,created_time,user.name,pictures,tags.name',
              'filter': 'featured', // Staff picks are featured content
              'sort': 'date', // Get recent content first
            },
          );

      final response = await http
          .get(
            apiUrl,
            headers: {
              'Authorization': 'Bearer $accessToken',
              'Accept': 'application/vnd.vimeo.*+json;version=3.4',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final videos = data['data'] as List? ?? [];

        _logDebug(
          '🎬 [VIMEO STAFF PICKS] API returned ${videos.length} videos',
        );

        if (videos.isEmpty) {
          _logDebug('⚠️ [VIMEO STAFF PICKS] No videos found');
          return [];
        }

        final links = <LinkObject>[];

        for (final video in videos) {
          try {
            final uri = video['uri'] as String?;
            if (uri == null) continue;

            // Extract video ID from URI (e.g., "/videos/123456" -> "123456")
            final videoId = uri.split('/').last;
            final videoUrl = 'https://vimeo.com/$videoId';

            // Get the best thumbnail available
            final pictures = video['pictures']?['sizes'] as List?;
            final thumbnailUrl = pictures?.isNotEmpty == true
                ? pictures!.last['link'] ?? ''
                : '';

            // Extract tags
            final tags = video['tags'] as List?;
            final tagNames =
                tags
                    ?.map((tag) => tag['name']?.toString().toLowerCase() ?? '')
                    .where((name) => name.isNotEmpty)
                    .toList() ??
                [];

            final metadata = {
              'title': video['name'] ?? 'Vimeo Staff Pick',
              'author': video['user']?['name'] ?? '',
              'thumbnailUrl': thumbnailUrl,
              'duration': video['duration'],
              'description': video['description'] ?? '',
              'source': 'staff_picks',
              'tags': tagNames,
            };

            links.add(
              LinkObject(
                id: 'vm-staffpick-$videoId',
                url: videoUrl,
                title: metadata['title'] as String,
                platform: RecommendationsConfig.platformVimeo,
                thumbnailUrl: thumbnailUrl,
                metadata: json.encode(metadata),
              ),
            );
          } catch (e) {
            _logError('Error parsing Vimeo Staff Pick video: $e');
            continue;
          }
        }

        _logDebug(
          '🎬 [VIMEO STAFF PICKS] Successfully parsed ${links.length} videos',
        );

        return links;
      } else if (response.statusCode == 429) {
        _logError('⚠️ [VIMEO STAFF PICKS] Rate limited (429)');
        return [];
      } else {
        _logError('❌ [VIMEO STAFF PICKS] API error ${response.statusCode}');
        return [];
      }
    } catch (e) {
      _logError('Error fetching Vimeo Staff Picks: $e');
      return [];
    }
  }

  /// Fetch Vimeo Staff Picks music videos via API
  /// Uses Vimeo's Staff Picks channel with music category filters
  /// Returns fresh, high-quality curated music videos
  /// TODO: Migrate to use Cloudflare Worker /api/vimeo/staff-picks endpoint
  Future<List<LinkObject>> _fetchVimeoStaffPicksMusicVideos({
    int maxResults = 50,
  }) async {
    try {
      // TODO: Update to use worker endpoint instead of direct API calls
      final accessToken = RecommendationsConfig.vimeoAccessToken;
      if (accessToken.isEmpty) {
        _logError('Vimeo: Use Cloudflare Worker endpoint instead');
        return [];
      }

      _logDebug(
        '🎵 [VIMEO STAFF PICKS] Fetching music videos from Staff Picks channel...',
      );

      // Query Vimeo Staff Picks channel with music filter
      // Using multiple strategies to maximize music video results:
      // 1. Staff Picks channel with music query
      // 2. Filter by music-related tags
      final apiUrl =
          Uri.parse(
            '${RecommendationsConfig.vimeoApiBaseUrl}/channels/staffpicks/videos',
          ).replace(
            queryParameters: {
              'query': 'music', // Search for music-related content
              'per_page': maxResults.toString(),
              'fields':
                  'uri,name,link,description,duration,created_time,user.name,pictures,tags.name',
              'filter': 'featured', // Staff picks are featured content
              'sort': 'date', // Get recent content first
            },
          );

      final response = await http
          .get(
            apiUrl,
            headers: {
              'Authorization': 'Bearer $accessToken',
              'Accept': 'application/vnd.vimeo.*+json;version=3.4',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final videos = data['data'] as List? ?? [];

        _logDebug(
          '🎵 [VIMEO STAFF PICKS] API returned ${videos.length} videos',
        );

        if (videos.isEmpty) {
          _logDebug(
            '⚠️ [VIMEO STAFF PICKS] No videos found - falling back to manual curation',
          );
          return await _fetchVimeoMusicVideos(); // Fallback to manual curation
        }

        final links = <LinkObject>[];

        for (final video in videos) {
          try {
            final uri = video['uri'] as String?;
            if (uri == null) continue;

            // Extract video ID from URI (e.g., "/videos/123456" -> "123456")
            final videoId = uri.split('/').last;
            final videoUrl = 'https://vimeo.com/$videoId';

            // Get the best thumbnail available
            final pictures = video['pictures']?['sizes'] as List?;
            final thumbnailUrl = pictures?.isNotEmpty == true
                ? pictures!.last['link'] ?? ''
                : '';

            // Extract tags for potential genre classification
            final tags = video['tags'] as List?;
            final tagNames =
                tags
                    ?.map((tag) => tag['name']?.toString().toLowerCase() ?? '')
                    .where((name) => name.isNotEmpty)
                    .toList() ??
                [];

            // Try to infer genre from tags
            String? genre;
            if (tagNames.contains('pop') || tagNames.contains('pop music')) {
              genre = 'pop';
            } else if (tagNames.contains('rock')) {
              genre = 'rock';
            } else if (tagNames.contains('hip hop') ||
                tagNames.contains('hiphop') ||
                tagNames.contains('rap')) {
              genre = 'hip_hop';
            } else if (tagNames.contains('electronic') ||
                tagNames.contains('edm')) {
              genre = 'electronic';
            } else if (tagNames.contains('country')) {
              genre = 'country';
            } else if (tagNames.contains('r&b') ||
                tagNames.contains('rnb') ||
                tagNames.contains('soul')) {
              genre = 'rb';
            }

            final metadata = {
              'title': video['name'] ?? 'Vimeo Staff Pick',
              'author': video['user']?['name'] ?? '',
              'thumbnailUrl': thumbnailUrl,
              'duration': video['duration'],
              'description': video['description'] ?? '',
              'source': 'staff_picks',
              'tags': tagNames,
              if (genre != null) 'genre': genre,
            };

            links.add(
              LinkObject(
                id: 'vm-staffpick-$videoId',
                url: videoUrl,
                title: metadata['title'] as String,
                platform: RecommendationsConfig.platformVimeo,
                thumbnailUrl: thumbnailUrl,
                metadata: json.encode(metadata),
              ),
            );
          } catch (e) {
            _logError('Error parsing Vimeo Staff Pick video: $e');
            continue;
          }
        }

        _logDebug(
          '🎵 [VIMEO STAFF PICKS] Successfully parsed ${links.length} music videos',
        );

        return links;
      } else if (response.statusCode == 429) {
        _logError(
          '⚠️ [VIMEO STAFF PICKS] Rate limited (429) - falling back to manual curation',
        );
        return await _fetchVimeoMusicVideos(); // Fallback to manual curation
      } else {
        _logError(
          '❌ [VIMEO STAFF PICKS] API error ${response.statusCode} - falling back to manual curation',
        );
        return await _fetchVimeoMusicVideos(); // Fallback to manual curation
      }
    } catch (e) {
      _logError('Error fetching Vimeo Staff Picks: $e');
      // Fallback to manual curation on error
      return await _fetchVimeoMusicVideos();
    }
  }

  /// Build Vimeo LinkObjects from cached metadata
  Future<List<LinkObject>> _buildVimeoLinksFromCache(
    Map<String, String> cache,
  ) async {
    final links = <LinkObject>[];
    var index = 0;
    final vimeoUrls = await RecommendationsConfig.getVimeoMusicUrls();

    for (final urlString in vimeoUrls) {
      // Parse URL with optional genre prefix
      final parsed = _parseUrlWithGenre(urlString);
      final url = parsed['url']!;
      final genre = parsed['genre'];

      final videoId = url.split('/').last.split('?').first;
      final metadataJson = cache[videoId];

      if (metadataJson != null) {
        try {
          final metadata = json.decode(metadataJson) as Map<String, dynamic>;
          // Add genre to metadata if it was in prefix
          if (genre != null && !metadata.containsKey('genre')) {
            metadata['genre'] = genre;
          }
          links.add(
            LinkObject(
              id: 'vm-$videoId',
              url: url,
              title: metadata['title'] ?? 'Vimeo Music Video ${index + 1}',
              platform: RecommendationsConfig.platformVimeo,
              thumbnailUrl: metadata['thumbnailUrl'] ?? '',
              metadata: json.encode(metadata),
            ),
          );
        } catch (e) {
          _logError('Error parsing cached Vimeo metadata for $videoId: $e');
          // Add fallback
          links.add(
            LinkObject(
              id: 'vm-$videoId',
              url: url,
              title: 'Vimeo Music Video ${index + 1}',
              platform: RecommendationsConfig.platformVimeo,
              thumbnailUrl: '',
              metadata: json.encode({
                'source': 'cache_error_fallback',
                if (genre != null) 'genre': genre,
              }),
            ),
          );
        }
      } else {
        // No cache entry - add fallback
        links.add(
          LinkObject(
            id: 'vm-$videoId',
            url: url,
            title: 'Vimeo Music Video ${index + 1}',
            platform: RecommendationsConfig.platformVimeo,
            thumbnailUrl: '',
            metadata: json.encode({
              'source': 'no_cache_fallback',
              if (genre != null) 'genre': genre,
            }),
          ),
        );
      }
      index++;
    }

    _logDebug('Built ${links.length} Vimeo links from cache');

    // Return without filtering - will be filtered at the end of fetchTrendingMusicVideos()
    return links;
  }

  /// Fetch TikTok music videos (manual curation)
  /// NOTE: Genre filtering not applied - remote config URLs lack genre metadata
  Future<List<LinkObject>> _fetchTikTokMusicVideos() async {
    try {
      final urls = await RecommendationsConfig.getTikTokMusicUrls();
      if (urls.isEmpty) {
        _logDebug('No TikTok music URLs configured');
        return [];
      }

      _logDebug(
        'Loading ${urls.length} manually curated TikTok music videos...',
      );

      final links = <LinkObject>[];
      for (int i = 0; i < urls.length; i++) {
        // Parse URL with optional genre prefix (e.g., "P:https://...")
        final parsed = _parseUrlWithGenre(urls[i]);
        final url = parsed['url']!;
        final genre = parsed['genre'];

        // Extract video ID from URL for unique ID
        final videoId = url.split('/').last.split('?').first;

        links.add(
          LinkObject(
            id: 'tt-music-$videoId',
            url: url,
            title: 'TikTok Music Video ${i + 1}',
            platform: RecommendationsConfig.platformTikTok,
            thumbnailUrl: '',
            metadata: json.encode({
              'description': 'TikTok music video',
              'source': 'manual_curation',
              'type': 'music_video',
              if (genre != null) 'genre': genre,
            }),
          ),
        );
      }

      _logDebug(
        'Loaded ${links.length} TikTok music videos from manual curation',
      );

      // Return without filtering - will be filtered at the end of fetchTrendingMusicVideos()
      return links;
    } catch (e) {
      _logError('Error loading TikTok music videos: $e');
      return [];
    }
  }

  /// Fetch Instagram music videos (manual curation)
  Future<List<LinkObject>> _fetchInstagramMusicVideos() async {
    try {
      final urls = await RecommendationsConfig.getInstagramMusicUrls();
      if (urls.isEmpty) {
        _logDebug('No Instagram music URLs configured');
        return [];
      }

      _logDebug(
        'Loading ${urls.length} manually curated Instagram music videos...',
      );

      final links = <LinkObject>[];
      for (int i = 0; i < urls.length; i++) {
        // Parse URL with optional genre prefix (e.g., "P:https://...")
        final parsed = _parseUrlWithGenre(urls[i]);
        final url = parsed['url']!;
        final genre = parsed['genre'];

        // Extract ID from URL (could be /reel/ or /p/)
        final parts = url.split('/');
        final idIndex = parts.indexWhere((p) => p == 'reel' || p == 'p');
        final videoId = idIndex >= 0 && idIndex + 1 < parts.length
            ? parts[idIndex + 1].split('?').first
            : 'unknown-$i';

        links.add(
          LinkObject(
            id: 'ig-music-$videoId',
            url: url,
            title: 'Instagram Music Video ${i + 1}',
            platform: RecommendationsConfig.platformInstagram,
            thumbnailUrl: '',
            metadata: json.encode({
              'caption': 'Instagram music video',
              'source': 'manual_curation',
              'type': 'music_video',
              if (genre != null) 'genre': genre,
            }),
          ),
        );
      }

      _logDebug(
        'Loaded ${links.length} Instagram music videos from manual curation',
      );

      // Return without filtering - will be filtered at the end of fetchTrendingMusicVideos()
      return links;
    } catch (e) {
      _logError('Error loading Instagram music videos: $e');
      return [];
    }
  }

  /// Fetch mixed long-form content for amphitheatre
  /// Currently: YouTube variety (no iTunes for Android-only app)
  Future<List<LinkObject>> fetchMixedContent({String? regionCode}) async {
    try {
      // Check cache first
      final cached = await _storage.getCachedRecommendation(
        RecommendationsConfig.contentCategoryMixed,
      );
      if (cached != null && cached.isValid) {
        return _parseCachedLinks(cached.contentJson);
      }

      final region = regionCode ?? RecommendationsConfig.defaultRegionCode;
      final apiKey = RecommendationsConfig.youtubeApiKey;

      if (apiKey.isEmpty) {
        _logError('YouTube API key not configured');
        return [];
      }

      // Get user preferences
      final prefs = await _storage.getPreferences();
      final categories = prefs.getEnabledVideoCategories();

      List<LinkObject> allContent = [];

      // Fetch trending for each enabled category
      for (var category in categories) {
        final categoryId = _getYouTubeCategoryId(category);
        if (categoryId == null) continue;

        final url = Uri.parse(
          '${RecommendationsConfig.youtubeApiBaseUrl}/videos?'
          'part=snippet,contentDetails&'
          'chart=mostPopular&'
          'regionCode=$region&'
          'videoCategoryId=$categoryId&'
          'maxResults=10&'
          'key=$apiKey',
        );

        try {
          final response = await http.get(url);
          if (response.statusCode == 200) {
            final data = json.decode(response.body);
            final videos = data['items'] as List;

            for (var video in videos) {
              allContent.add(
                LinkObject(
                  id: 'yt-mixed-${video['id']}',
                  url: 'https://www.youtube.com/watch?v=${video['id']}',
                  title: video['snippet']['title'],
                  platform: RecommendationsConfig.platformYouTube,
                  thumbnailUrl: video['snippet']['thumbnails']['high']['url'],
                  metadata: json.encode({
                    'category': category,
                    'duration': video['contentDetails']['duration'],
                    'description': video['snippet']['description'] ?? '',
                  }),
                ),
              );
            }
          }
        } catch (e) {
          _logError('Error fetching category $category: $e');
        }
      }

      // Shuffle and limit
      allContent.shuffle();
      final links = allContent
          .take(RecommendationsConfig.maxAmphitheatreContent)
          .toList();

      // Cache the results
      await _cacheRecommendations(
        RecommendationsConfig.contentCategoryMixed,
        links,
        RecommendationsConfig.videoCacheDuration,
      );

      _logDebug('Fetched ${links.length} mixed content items');
      return links;
    } catch (e) {
      _logError('Error fetching mixed content: $e');
      return [];
    }
  }

  /// Parse ISO 8601 duration from YouTube (e.g., "PT1M30S" = 1 minute 30 seconds)
  Duration _parseDuration(String duration) {
    final regex = RegExp(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?');
    final match = regex.firstMatch(duration);

    if (match == null) return Duration.zero;

    final hours = int.tryParse(match.group(1) ?? '0') ?? 0;
    final minutes = int.tryParse(match.group(2) ?? '0') ?? 0;
    final seconds = int.tryParse(match.group(3) ?? '0') ?? 0;

    return Duration(hours: hours, minutes: minutes, seconds: seconds);
  }

  /// Get YouTube category ID for content type
  String? _getYouTubeCategoryId(String category) {
    switch (category) {
      case 'music':
        return '10';
      case 'comedy':
        return '23';
      case 'entertainment':
        return '24';
      case 'sports':
        return '17';
      case 'news':
        return '25';
      case 'gaming':
        return '20';
      case 'education':
      case 'educational':
        return '27';
      case 'howto':
        return '26';
      default:
        return null;
    }
  }

  /// Count unique platforms in link list
  // ============================================================================
  // GENRE FILTERING (User Music Preferences)
  // ============================================================================
  // TODO: Genre filtering is NOT YET IMPLEMENTED for remote config URLs
  //
  // REASON: Remote config URLs (config.json) are simple string arrays without
  // genre metadata. To implement proper genre filtering, we need to:
  //
  // 1. Change config.json format from:
  //    "vimeo_music_urls": ["url1", "url2", ...]
  //
  //    To:
  //    "vimeo_music_urls": [
  //      {"url": "url1", "genres": ["pop", "rock"]},
  //      {"url": "url2", "genres": ["hip_hop", "indie"]},
  //      ...
  //    ]
  //
  // 2. Update RemoteConfigService.getUrlList() to handle object arrays
  // 3. Update all platform fetch methods to parse genre data
  // 4. Uncomment and use _filterByUserGenrePreferences() below
  //
  // CURRENT BEHAVIOR: All remote config content is shown regardless of
  // user's selected genres. Only API-based content (YouTube search results)
  // respects genre preferences via search terms.
  // ============================================================================

  /// Get user's selected music genre preferences
  /// These are set in MusicPreferencesDialog and stored in SharedPreferences
  Future<List<String>> _getUserSelectedGenres() async {
    try {
      final genres = await MusicPreferencesDialog.loadSelectedGenres();
      _logDebug('User has ${genres.length} genre preferences: $genres');
      return genres;
    } catch (e) {
      _logError('Error loading user genre preferences: $e');
      return []; // Return empty to show all content
    }
  }

  /// Filter LinkObjects by user's selected genre preferences
  /// Returns all links if genres is empty (show everything as fallback)
  ///
  /// NOTE: This method is ready but NOT YET USED because remote config
  /// URLs don't have genre metadata attached. See TODO above.
  Future<List<LinkObject>> _filterByUserGenrePreferences(
    List<LinkObject> links,
  ) async {
    final selectedGenres = await _getUserSelectedGenres();

    if (selectedGenres.isEmpty) {
      _logDebug('No genre preferences set - showing all content');
      return links;
    }

    final filtered = links.where((link) {
      try {
        // Handle nullable metadata string - assign to local variable for null promotion
        final metadataStr = link.metadata;
        if (metadataStr == null || metadataStr.isEmpty) {
          // No metadata - include by default (don't filter out)
          return true;
        }

        final metadata = json.decode(metadataStr);
        final linkGenres = metadata['genres'] as List<dynamic>?;

        if (linkGenres == null || linkGenres.isEmpty) {
          // No genre metadata - include by default (don't filter out)
          return true;
        }

        // Check if any of the link's genres match user preferences
        return linkGenres.any(
          (genre) => selectedGenres.contains(genre.toString()),
        );
      } catch (e) {
        // Error parsing metadata - include by default
        return true;
      }
    }).toList();

    if (filtered.length != links.length) {
      _logDebug(
        'Genre filter: ${links.length} -> ${filtered.length} links '
        '(genres: ${selectedGenres.join(", ")})',
      );
    } else {
      _logDebug('⚠️ Genre filter had no effect - links missing genre metadata');
    }

    return filtered;
  }

  int _countPlatforms(List<LinkObject> links) {
    return links.map((l) => l.platform).toSet().length;
  }

  /// ============================================================================
  /// YOUTUBE CONTENT DIVERSITY SYSTEM
  /// Generates varied query strategies to avoid repetitive content on fresh installs
  /// ============================================================================

  /// Select a random YouTube query strategy to diversify content
  /// Strategies:
  /// 1. mostPopular - Trending videos (baseline)
  /// 2. genreSearch - Search queries based on user's genre preferences
  /// 3. categoryId - Fetch from specific video categories (Music=10, Entertainment=24, etc.)
  /// 4. regionRotation - Use different region codes for global diversity
  Future<Map<String, dynamic>> _selectYouTubeQueryStrategy() async {
    final random = Random();
    final strategies = [
      'mostPopular',
      'genreSearch',
      'categoryId',
      'regionRotation',
    ];
    final selectedStrategy = strategies[random.nextInt(strategies.length)];

    switch (selectedStrategy) {
      case 'genreSearch':
        final searchQuery = await _generateGenreBasedSearchQuery();
        return {'type': 'genreSearch', 'searchQuery': searchQuery};

      case 'categoryId':
        // YouTube video categories: Music=10, Entertainment=24, Film=1, Gaming=20
        final categories = [10, 24, 1, 20];
        final categoryId = categories[random.nextInt(categories.length)];
        return {'type': 'categoryId', 'categoryId': categoryId};

      case 'regionRotation':
        // Rotate through different regions for global diversity
        final regions = [
          'US',
          'GB',
          'CA',
          'AU',
          'DE',
          'FR',
          'JP',
          'KR',
          'BR',
          'MX',
          'IN',
        ];
        final selectedRegion = regions[random.nextInt(regions.length)];
        return {'type': 'regionRotation', 'regionCode': selectedRegion};

      case 'mostPopular':
      default:
        return {'type': 'mostPopular'};
    }
  }

  /// Generate search query based on user's genre preferences
  /// Returns varied search terms aligned with user's taste
  Future<String> _generateGenreBasedSearchQuery() async {
    final userGenres = await _getUserSelectedGenres();
    final random = Random();

    // If no preferences, use general varied queries
    if (userGenres.isEmpty) {
      final generalQueries = [
        'trending music video',
        'new release 2026',
        'viral video',
        'official music video',
        'live performance',
        'short film',
        'creative video',
      ];
      return generalQueries[random.nextInt(generalQueries.length)];
    }

    // Map genre IDs to search query variations
    final genreQueryMap = {
      'pop': [
        'pop music video',
        'pop hits 2026',
        'best pop songs',
        'pop official video',
      ],
      'rock': [
        'rock music video',
        'rock performance',
        'alternative rock',
        'indie rock live',
      ],
      'hip_hop': [
        'hip hop video',
        'rap music video',
        'hip hop 2026',
        'new rap release',
      ],
      'indie': [
        'indie music',
        'indie alternative',
        'indie rock video',
        'indie pop',
      ],
      'electronic': [
        'electronic music',
        'edm video',
        'house music',
        'techno performance',
      ],
      'country': ['country music video', 'country hits', 'country songs 2026'],
      'r_and_b': ['r&b music video', 'rnb official video', 'soul music'],
      'jazz': ['jazz performance', 'jazz music video', 'smooth jazz'],
      'classical': [
        'classical music',
        'orchestra performance',
        'classical concert',
      ],
    };

    // Pick a random genre from user's preferences
    final selectedGenre = userGenres[random.nextInt(userGenres.length)];
    final queries =
        genreQueryMap[selectedGenre] ?? ['$selectedGenre music video'];

    return queries[random.nextInt(queries.length)];
  }

  /// Build YouTube API URL based on selected strategy
  Future<Uri> _buildYouTubeApiUrl({
    required String apiKey,
    required String regionCode,
    required Map<String, dynamic> strategy,
    required int maxResults,
  }) async {
    final baseUrl = RecommendationsConfig.youtubeApiBaseUrl;
    final strategyType = strategy['type'];

    switch (strategyType) {
      case 'genreSearch':
        // Use search endpoint with genre-based query
        final searchQuery = strategy['searchQuery'];
        return Uri.parse(
          '$baseUrl/search?'
          'part=snippet&'
          'q=$searchQuery&'
          'type=video&'
          'videoDuration=any&'
          'maxResults=$maxResults&'
          'regionCode=$regionCode&'
          'relevanceLanguage=en&'
          'order=viewCount&'
          'key=$apiKey',
        );

      case 'categoryId':
        // Use videos endpoint with specific category
        final categoryId = strategy['categoryId'];
        return Uri.parse(
          '$baseUrl/videos?'
          'part=snippet,contentDetails,statistics&'
          'chart=mostPopular&'
          'videoCategoryId=$categoryId&'
          'regionCode=$regionCode&'
          'maxResults=$maxResults&'
          'key=$apiKey',
        );

      case 'regionRotation':
        // Use videos endpoint with different region
        final alternateRegion = strategy['regionCode'];
        return Uri.parse(
          '$baseUrl/videos?'
          'part=snippet,contentDetails,statistics&'
          'chart=mostPopular&'
          'regionCode=$alternateRegion&'
          'maxResults=$maxResults&'
          'key=$apiKey',
        );

      case 'mostPopular':
      default:
        // Standard mostPopular query
        return Uri.parse(
          '$baseUrl/videos?'
          'part=snippet,contentDetails,statistics&'
          'chart=mostPopular&'
          'regionCode=$regionCode&'
          'maxResults=$maxResults&'
          'key=$apiKey',
        );
    }
  }

  /// ============================================================================
  /// END YOUTUBE CONTENT DIVERSITY SYSTEM
  /// ============================================================================

  /// ============================================================================
  /// SMART CONTENT FILTERING SYSTEM (PHASE 1 & 2)
  /// Automatically filters content based on learned preferences from dislike patterns
  /// ============================================================================

  /// Apply learned preference filtering to content list
  /// Filters out content matching user's negative patterns (language, channel, keywords)
  Future<List<LinkObject>> _applyPreferenceFiltering(
    List<LinkObject> links,
  ) async {
    // Initialize preference service if needed (has internal guard)
    await _preferenceService.initialize();

    final filtered = <LinkObject>[];
    int filteredCount = 0;

    for (final link in links) {
      try {
        // Parse metadata for filtering
        final metadataStr = link.metadata;
        if (metadataStr == null || metadataStr.isEmpty) {
          filtered.add(link); // No metadata, can't filter
          continue;
        }

        final metadata = json.decode(metadataStr) as Map<String, dynamic>;

        // CACHE metadata for later use when recording dislikes
        _metadataCache[link.url] = {
          'title': link.title,
          'language': metadata['language'],
          'channelTitle': metadata['channelTitle'],
          'channelId': metadata['channelId'],
          'country': metadata['country'],
          'tags': metadata['tags'],
        };

        // Extract attributes for filtering
        final language = metadata['language'] as String?;
        final channelId = metadata['channelId'] as String?;
        final channelTitle = metadata['channelTitle'] as String?;
        final country = metadata['country'] as String?;
        final title = link.title;
        final tags = (metadata['tags'] as List<dynamic>?)?.cast<String>();

        // Check if content should be filtered
        final shouldFilter = _preferenceService.shouldFilterContent(
          language: language,
          channelId: channelId,
          channelTitle: channelTitle,
          country: country,
          title: title,
          tags: tags,
        );

        if (!shouldFilter) {
          filtered.add(link);
        } else {
          filteredCount++;
          _logDebug(
            '🔇 Filtered: \"${link.title}\" (lang: $language, channel: $channelTitle)',
          );
        }
      } catch (e) {
        // Error parsing, include by default
        filtered.add(link);
      }
    }

    if (filteredCount > 0) {
      _logDebug(
        '🔇 Filtered $filteredCount videos based on learned preferences',
      );
    }

    // Limit cache size to prevent memory bloat
    if (_metadataCache.length > 500) {
      // Remove oldest half of entries (simple approach)
      final keys = _metadataCache.keys.toList();
      for (int i = 0; i < 250; i++) {
        _metadataCache.remove(keys[i]);
      }
    }

    return filtered;
  }

  /// Record dislike with metadata for pattern learning
  /// Called when user dislikes content - looks up metadata from cache
  Future<void> recordDislikeWithMetadata(String url, String title) async {
    try {
      _logDebug('📝 Recording dislike with metadata for: $title');

      // Lookup metadata from cache
      final cached = _metadataCache[url];

      if (cached != null) {
        // We have cached metadata - record with full details
        await _preferenceService.recordDislike(
          url: url,
          title: title,
          language: cached['language'] as String?,
          channelTitle: cached['channelTitle'] as String?,
          channelId: cached['channelId'] as String?,
          country: cached['country'] as String?,
          tags: (cached['tags'] as List<dynamic>?)?.cast<String>(),
        );
        _logDebug('✅ Dislike recorded with full metadata');
      } else {
        // No cached metadata - record with just URL and title
        await _preferenceService.recordDislike(url: url, title: title);
        _logDebug('⚠️ Dislike recorded without metadata (not in cache)');
      }
    } catch (e) {
      _logError('Failed to record dislike metadata: $e');
    }
  }

  /// ============================================================================
  /// END SMART CONTENT FILTERING SYSTEM
  /// ============================================================================

  /// Parse URL with optional genre prefix
  /// Format: "P:https://url.com" or "RH:https://url.com" or just "https://url.com"
  /// Returns: {url: String, genre: String?}
  Map<String, String?> _parseUrlWithGenre(String urlString) {
    // Check for genre prefix pattern (1-2 uppercase letters followed by colon)
    final match = RegExp(r'^([A-Z]{1,2}):(.+)$').firstMatch(urlString);

    if (match != null) {
      final genreCode = match.group(1)!;
      final url = match.group(2)!;
      final genre = genreCodeMap[genreCode];

      if (genre != null) {
        _logDebug('Parsed URL with genre: $genreCode ($genre) -> $url');
        return {'url': url, 'genre': genre};
      } else {
        _logDebug(
          '⚠️ Unknown genre code "$genreCode" - treating as URL without prefix',
        );
        // Unknown code, treat whole string as URL
        return {'url': urlString, 'genre': null};
      }
    }

    // No prefix detected - return URL as-is
    return {'url': urlString, 'genre': null};
  }

  /// Filter list of LinkObjects to remove hidden URLs and apply genre filtering
  /// Returns filtered list matching user preferences
  Future<List<LinkObject>> _filterLinks(List<LinkObject> links) async {
    // CRITICAL: Filter out disliked content FIRST
    links = await _filterDislikedContent(links);

    // Get hidden URLs
    final hiddenUrls = await UserActivityService.instance.getHiddenLinkUrls();
    if (hiddenUrls.isNotEmpty) {
      final beforeCount = links.length;
      links = links.where((link) => !hiddenUrls.contains(link.url)).toList();
      if (links.length < beforeCount) {
        _logDebug(
          'Filtered out ${beforeCount - links.length} hidden links (${links.length} remaining)',
        );
      }
    }

    // Apply genre filtering
    final selectedGenres = await _getUserSelectedGenres();
    if (selectedGenres.isNotEmpty) {
      final beforeCount = links.length;
      links = links.where((link) {
        try {
          // Check metadata for genre
          final metadataStr = link.metadata;
          if (metadataStr == null || metadataStr.isEmpty) {
            return true; // No metadata - include by default
          }

          final metadata = json.decode(metadataStr);
          final genre = metadata['genre'] as String?;

          if (genre == null) {
            return true; // No genre - include by default
          }

          // Only include if genre matches user preferences
          return selectedGenres.contains(genre);
        } catch (e) {
          return true; // Error parsing - include by default
        }
      }).toList();

      if (links.length < beforeCount) {
        _logDebug(
          'Genre filter removed ${beforeCount - links.length} links (${links.length} remaining)',
        );
      }
    }

    // IMPORTANT: NO like-based boosting - preserves platform diversity for all furniture types
    // The shuffle + platform distribution ensures variety across all platforms
    // Dislike filtering is sufficient - it removes unwanted content without breaking the mix
    // Each furniture type (Gallery Wall, Small Stage, Riser) maintains its intended platform proportions

    return links;
  }

  /// Parse cached links from JSON
  List<LinkObject> _parseCachedLinks(String contentJson) {
    try {
      final List<dynamic> jsonList = json.decode(contentJson);
      return jsonList.map((map) => LinkObject.fromMap(map)).toList();
    } catch (e) {
      _logError('Error parsing cached links: $e');
      return [];
    }
  }

  /// Helper to create CachedRecommendation object
  Future<void> _cacheRecommendations(
    String contentCategory,
    List<LinkObject> links,
    int cacheDurationHours,
  ) async {
    final now = DateTime.now();
    final cached = CachedRecommendation(
      id: '${contentCategory}_${now.millisecondsSinceEpoch}',
      contentType: contentCategory,
      fetchedAt: now,
      expiresAt: now.add(Duration(hours: cacheDurationHours)),
      contentJson: json.encode(links.map((l) => l.toMap()).toList()),
    );
    await _storage.saveCachedRecommendation(cached);
  }

  /// Clear all caches
  Future<void> clearAllCaches() async {
    await _storage.clearCache();
    _logDebug('Cleared all recommendation caches');
  }

  /// Clear expired caches
  Future<void> clearExpiredCaches() async {
    await _storage.clearExpiredCache();
    _logDebug('Cleared expired recommendation caches');
  }

  /// Filter out disliked content from link list
  /// Returns only links that the user hasn't disliked
  Future<List<LinkObject>> _filterDislikedContent(
    List<LinkObject> links,
  ) async {
    await _feedbackService.initialize();
    final dislikedUrls = _feedbackService.getDislikedUrls().toSet();

    if (dislikedUrls.isEmpty) {
      return links; // No filtering needed
    }

    final filtered = links
        .where((link) => !dislikedUrls.contains(link.url))
        .toList();
    final removedCount = links.length - filtered.length;

    if (removedCount > 0) {
      _logDebug('👎 Filtered out $removedCount disliked links');
    }

    return filtered;
  }

  /// Boost content from platforms and genres the user likes
  /// Moves liked content to the front of the list for higher visibility
  Future<List<LinkObject>> _boostLikedContent(List<LinkObject> links) async {
    await _feedbackService.initialize();
    final stats = _feedbackService.getStats();

    if (stats.liked == 0) {
      return links; // No likes to boost from
    }

    // Get liked platforms and genres
    final likedPlatforms = stats.platformDistribution.keys.toSet();
    final likedGenres = stats.genreDistribution.keys.toSet();

    if (likedPlatforms.isEmpty && likedGenres.isEmpty) {
      return links;
    }

    _logDebug('👍 Boosting content from liked platforms: $likedPlatforms');

    // Separate boosted vs regular content
    final boosted = <LinkObject>[];
    final regular = <LinkObject>[];

    for (final link in links) {
      final matchesPlatform = likedPlatforms.contains(link.platform);
      final matchesGenre =
          link.metadata != null &&
          likedGenres.any((genre) => link.metadata!.contains(genre));

      if (matchesPlatform || matchesGenre) {
        boosted.add(link);
      } else {
        regular.add(link);
      }
    }

    _logDebug('👍 Boosted ${boosted.length} links, ${regular.length} regular');

    // Return boosted content first, then regular
    return [...boosted, ...regular];
  }

  void _logDebug(String message) {
    if (RecommendationsConfig.enableDebugLogging) {
      print('[RecommendationService] 🎵 $message');
      developer.log(message, name: 'RecommendationService');
    }
  }

  void _logError(String message) {
    print('[RecommendationService ERROR] ❌ $message');
    developer.log(message, name: 'RecommendationService', level: 1000);
  }
}

/// Global recommendation service instance for access throughout the app
final recommendationService = RecommendationService();
