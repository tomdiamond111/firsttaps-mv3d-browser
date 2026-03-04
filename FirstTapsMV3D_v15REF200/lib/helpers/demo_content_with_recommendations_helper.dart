import 'package:flutter/material.dart';
import 'package:firsttaps_mv3d/models/file_model.dart' as fm;
import 'package:firsttaps_mv3d/services/state_manager_service.dart';
import 'package:firsttaps_mv3d/managers/recommendation_content_manager.dart';
import 'package:firsttaps_mv3d/models/link_object.dart';
import 'package:firsttaps_mv3d/config/recommendations_config.dart';
import 'dart:developer' as developer;

/// Enhanced demo content helper that integrates with recommendations system
/// This supplements or replaces local demo files with trending content from
/// YouTube, Spotify, etc.
///
/// Usage:
/// 1. Set API keys in recommendations_config.dart
/// 2. Call registerRecommendedDemoContent() instead of registerDemoContentSync()
/// 3. System will automatically fetch trending content and create FileModel objects
/// 4. Falls back to local files if network/API unavailable
class DemoContentWithRecommendationsHelper {
  static final RecommendationContentManager _contentManager =
      RecommendationContentManager();

  /// Check if recommendations are enabled and API keys are configured
  static bool get areRecommendationsEnabled {
    if (!RecommendationsConfig.enableRecommendations) {
      return false;
    }

    // Check if at least one content source is configured
    final hasYouTube = RecommendationsConfig.youtubeApiKey.isNotEmpty;
    final hasSpotify =
        RecommendationsConfig.spotifyTrendingTrackUrls.isNotEmpty;
    final hasDeezer = RecommendationsConfig.enableDeezerContent;
    final hasVimeo = RecommendationsConfig.vimeoAccessToken.isNotEmpty;

    return hasYouTube || hasSpotify || hasDeezer || hasVimeo;
  }

  /// Create FileModel objects from LinkObject recommendations
  /// These can be "virtual" files that point to streaming URLs
  static Future<List<fm.FileModel>> _createFileModelsFromLinks(
    List<LinkObject> links, {
    required String category,
  }) async {
    final fileModels = <fm.FileModel>[];

    for (final link in links) {
      try {
        // Determine file type based on platform and content
        fm.FileType fileType;
        String mimeType;
        String extension;

        if (link.platform == RecommendationsConfig.platformSpotify ||
            link.platform == RecommendationsConfig.platformDeezer ||
            link.platform == RecommendationsConfig.platformSoundCloud) {
          // Audio platforms
          fileType = fm.FileType.mp3;
          mimeType = 'audio/mpeg';
          extension = 'mp3';
        } else if (link.platform == RecommendationsConfig.platformYouTube) {
          // All YouTube content treated as video
          fileType = fm.FileType.video;
          mimeType = 'video/mp4';
          extension = 'mp4';
        } else {
          // Other platforms default to video
          fileType = fm.FileType.video;
          mimeType = 'video/mp4';
          extension = 'mp4';
        }

        // Create FileModel with streaming URL as path
        final fileModel = fm.FileModel(
          path: link.url, // Use URL as path - JavaScript can handle streaming
          name: link.title,
          extension: extension,
          fileSize: 0, // Streaming content has no local size
          type: fileType,
          mimeType: mimeType,
          lastModified: DateTime.now().millisecondsSinceEpoch,
          isDemo: true, // Mark as demo so it's recreated on each load
          customDisplayName: link.title, // Use link title as display name
          thumbnailDataUrl: link.thumbnailUrl, // Store thumbnail URL
        );

        fileModels.add(fileModel);
      } catch (e) {
        developer.log(
          '❌ Failed to create FileModel from link ${link.title}: $e',
          name: 'DemoContentWithRecommendations',
        );
      }
    }

    return fileModels;
  }

  /// Create fallback content from Spotify URLs when other sources fail
  /// Used to ensure all furniture has content even if API calls fail
  static Future<List<fm.FileModel>> _createFallbackContent(
    List<String> spotifyUrls,
    String category,
  ) async {
    final fileModels = <fm.FileModel>[];

    for (final url in spotifyUrls) {
      try {
        // CRITICAL: Strip genre prefix (e.g., "P:https://..." → "https://...")
        // Genre prefixes: P=pop, R=rock, RB=r_and_b, RH=hip_hop, C=country, E=electronic
        String cleanUrl = url;
        if (url.contains(':http')) {
          cleanUrl = url.substring(url.indexOf(':') + 1);
        }

        // Extract track name from URL if possible, or use generic name
        final trackId = cleanUrl.split('/').last.split('?').first;

        final fileModel = fm.FileModel(
          path: cleanUrl,
          name: 'Spotify Track $trackId',
          extension: 'mp3',
          fileSize: 0,
          type: fm.FileType.mp3,
          mimeType: 'audio/mpeg',
          lastModified: DateTime.now().millisecondsSinceEpoch,
          isDemo: true,
          customDisplayName: 'Trending Track',
          thumbnailDataUrl: null, // Will be fetched by JavaScript
        );

        fileModels.add(fileModel);
      } catch (e) {
        developer.log(
          '⚠️ Failed to create fallback FileModel: $e',
          name: 'DemoContentWithRecommendations',
        );
      }
    }

    return fileModels;
  }

  /// Fetch recommended content for all furniture types
  /// Returns map of category to FileModel list
  /// OPTIMIZED: Fetches all furniture content in parallel for faster loading
  static Future<Map<String, List<fm.FileModel>>> fetchRecommendedContent({
    bool forceRefresh = false,
  }) async {
    final contentMap = <String, List<fm.FileModel>>{};

    try {
      developer.log(
        '🎵 Fetching recommended content (PARALLEL mode)...',
        name: 'DemoContentWithRecommendations',
      );

      // CRITICAL OPTIMIZATION: Fetch all furniture content in PARALLEL
      // This reduces loading time from 60s+ to ~5-10s (single API round-trip)
      final futures = <Future<void>>[];

      // Gallery Wall (shorts)
      developer.log(
        '🔍 Gallery Wall check: enableYouTubeContent=${RecommendationsConfig.enableYouTubeContent}',
        name: 'DemoContentWithRecommendations',
      );
      if (RecommendationsConfig.enableYouTubeContent) {
        developer.log(
          '✅ Adding Gallery Wall fetch to futures list',
          name: 'DemoContentWithRecommendations',
        );
        futures.add(
          _contentManager
              .getGalleryWallLinks(forceRefresh: forceRefresh)
              .then((galleryLinks) async {
                developer.log(
                  '📥 Gallery Wall fetch returned ${galleryLinks.length} links',
                  name: 'DemoContentWithRecommendations',
                );

                if (galleryLinks.isEmpty) {
                  developer.log(
                    '⚠️ WARNING: Gallery Wall links are EMPTY - this will show no content!',
                    name: 'DemoContentWithRecommendations',
                  );
                }

                final galleryFiles = await _createFileModelsFromLinks(
                  galleryLinks,
                  category: 'gallery_wall_shorts',
                );
                contentMap['gallery_wall'] = galleryFiles;
                developer.log(
                  '✅ Gallery Wall: ${galleryFiles.length} shorts created',
                  name: 'DemoContentWithRecommendations',
                );
              })
              .catchError((e, stackTrace) {
                developer.log(
                  '❌ FAILED to fetch Gallery Wall content: $e',
                  name: 'DemoContentWithRecommendations',
                  error: e,
                  stackTrace: stackTrace,
                );
                contentMap['gallery_wall'] = [];
              }),
        );
      } else {
        developer.log(
          '⚠️ YouTube content DISABLED - Gallery Wall will be empty',
          name: 'DemoContentWithRecommendations',
        );
        contentMap['gallery_wall'] = [];
      }

      // Small Stage (music)
      if (RecommendationsConfig.enableSpotifyPublicPlaylists ||
          RecommendationsConfig.enableDeezerContent) {
        futures.add(
          _contentManager
              .getSmallStageLinks(forceRefresh: forceRefresh)
              .then((stageLinks) async {
                final stageFiles = await _createFileModelsFromLinks(
                  stageLinks,
                  category: 'small_stage_music',
                );
                contentMap['small_stage'] = stageFiles;
                developer.log(
                  '✅ Small Stage: ${stageFiles.length} tracks',
                  name: 'DemoContentWithRecommendations',
                );
              })
              .catchError((e) {
                developer.log(
                  '⚠️ Failed to fetch Small Stage content: $e',
                  name: 'DemoContentWithRecommendations',
                );
                contentMap['small_stage'] = [];
              }),
        );
      }

      // Riser (music videos)
      if (RecommendationsConfig.enableYouTubeContent) {
        futures.add(
          _contentManager
              .getRiserLinks(forceRefresh: forceRefresh)
              .then((riserLinks) async {
                developer.log(
                  '📥 Riser fetch returned ${riserLinks.length} links',
                  name: 'DemoContentWithRecommendations',
                );

                // DIAGNOSTIC: Check for duplicate URLs in riser links
                final uniqueUrls = riserLinks.map((l) => l.url).toSet();
                if (uniqueUrls.length < riserLinks.length) {
                  developer.log(
                    '⚠️ WARNING: Riser has ${riserLinks.length - uniqueUrls.length} DUPLICATE URLs! (${riserLinks.length} total, ${uniqueUrls.length} unique)',
                    name: 'DemoContentWithRecommendations',
                  );
                }

                final riserFiles = await _createFileModelsFromLinks(
                  riserLinks,
                  category: 'riser_videos',
                );
                contentMap['riser'] = riserFiles;
                developer.log(
                  '✅ Riser: ${riserFiles.length} videos created',
                  name: 'DemoContentWithRecommendations',
                );
              })
              .catchError((e, stackTrace) {
                developer.log(
                  '❌ FAILED to fetch Riser content: $e',
                  name: 'DemoContentWithRecommendations',
                  error: e,
                  stackTrace: stackTrace,
                );
                contentMap['riser'] = [];
              }),
        );
      } else {
        developer.log(
          '⚠️ YouTube content DISABLED - Riser will be empty',
          name: 'DemoContentWithRecommendations',
        );
        contentMap['riser'] = [];
      }

      // Bookshelf (favorites)
      futures.add(
        _contentManager
            .getBookshelfLinks()
            .then((bookshelfLinks) async {
              final bookshelfFiles = await _createFileModelsFromLinks(
                bookshelfLinks,
                category: 'bookshelf_favorites',
              );
              contentMap['bookshelf'] = bookshelfFiles;
              developer.log(
                '✅ Bookshelf: ${bookshelfFiles.length} favorites',
                name: 'DemoContentWithRecommendations',
              );
            })
            .catchError((e) {
              developer.log(
                '⚠️ Failed to fetch Bookshelf content: $e',
                name: 'DemoContentWithRecommendations',
              );
              contentMap['bookshelf'] = [];
            }),
      );

      // Amphitheatre (mixed)
      futures.add(
        _contentManager
            .getAmphitheatreLinks(forceRefresh: forceRefresh)
            .then((amphitheatreLinks) async {
              final amphitheatreFiles = await _createFileModelsFromLinks(
                amphitheatreLinks,
                category: 'amphitheatre_mixed',
              );
              contentMap['amphitheatre'] = amphitheatreFiles;
              developer.log(
                '✅ Amphitheatre: ${amphitheatreFiles.length} mixed items',
                name: 'DemoContentWithRecommendations',
              );
            })
            .catchError((e) {
              developer.log(
                '⚠️ Failed to fetch Amphitheatre content: $e',
                name: 'DemoContentWithRecommendations',
              );
              contentMap['amphitheatre'] = [];
            }),
      );

      // Wait for ALL fetches to complete in parallel
      await Future.wait(futures);

      // CRITICAL: Add fallback content for appropriate furniture types
      // Spotify tracks can ONLY be used for audio furniture (Small Stage, Bookshelf, Amphitheatre)
      // Gallery Wall and Riser need VIDEO content, so they should remain empty if video sources fail

      // Fetch fallback URLs from remote config (with fallback to hardcoded)
      final fallbackUrls = await RecommendationsConfig.getSpotifyUrls();

      // Gallery Wall: NO FALLBACK - needs videos (YouTube, TikTok, Instagram), not audio
      if (contentMap['gallery_wall']?.isEmpty ?? true) {
        developer.log(
          '⚠️ Gallery Wall empty - no video content available (YouTube/TikTok/Instagram)',
          name: 'DemoContentWithRecommendations',
        );
        contentMap['gallery_wall'] =
            []; // Leave empty, not compatible with audio
      }

      // Riser: NO FALLBACK - needs music videos, not audio tracks
      if (contentMap['riser']?.isEmpty ?? true) {
        developer.log(
          '⚠️ Riser empty - no music videos available (YouTube/Vimeo/TikTok)',
          name: 'DemoContentWithRecommendations',
        );
        contentMap['riser'] = []; // Leave empty, not compatible with audio
      }

      // Small Stage: Spotify fallback OK (audio tracks from YouTube Music, Spotify, Deezer, SoundCloud)
      if (contentMap['small_stage']?.isEmpty ?? true) {
        developer.log(
          '🔄 Small Stage empty - using Spotify fallback (${fallbackUrls.take(13).length} tracks to fill all slots)',
          name: 'DemoContentWithRecommendations',
        );
        contentMap['small_stage'] = await _createFallbackContent(
          fallbackUrls.take(13).toList(),
          'small_stage_fallback',
        );
      }

      // Bookshelf: Spotify fallback OK (user favorites can be any content type)
      if (contentMap['bookshelf']?.isEmpty ?? true) {
        developer.log(
          '🔄 Bookshelf empty - using Spotify fallback (${fallbackUrls.take(6).length} tracks)',
          name: 'DemoContentWithRecommendations',
        );
        contentMap['bookshelf'] = await _createFallbackContent(
          fallbackUrls.take(6).toList(),
          'bookshelf_fallback',
        );
      }

      // Amphitheatre: Spotify fallback OK (mixed content)
      if (contentMap['amphitheatre']?.isEmpty ?? true) {
        developer.log(
          '🔄 Amphitheatre empty - using Spotify fallback (${fallbackUrls.take(80).length} tracks - cycling)',
          name: 'DemoContentWithRecommendations',
        );
        // For amphitheatre's 80 slots, cycle through available tracks multiple times
        final repeatedUrls = <String>[];
        for (int i = 0; i < 80; i++) {
          repeatedUrls.add(fallbackUrls[i % fallbackUrls.length]);
        }
        contentMap['amphitheatre'] = await _createFallbackContent(
          repeatedUrls,
          'amphitheatre_fallback',
        );
      }

      final totalFiles = contentMap.values.fold(
        0,
        (sum, list) => sum + list.length,
      );
      developer.log(
        '🎉 Fetched ${totalFiles} recommended files across ${contentMap.length} categories',
        name: 'DemoContentWithRecommendations',
      );
    } catch (e) {
      developer.log(
        '❌ Error fetching recommended content: $e',
        name: 'DemoContentWithRecommendations',
        error: e,
      );
    }

    return contentMap;
  }

  /// Get fallback local demo files (from original system)
  /// Used when recommendations are disabled or unavailable
  static List<fm.FileModel> getFallbackDemoFiles() {
    final localFiles = [
      {
        'filename': 'Bach Prelude BWV933 piano.mp3',
        'assetPath': 'assets/demomedia/Bach Prelude BWV933 piano.mp3',
        'type': fm.FileType.mp3,
        'mimeType': 'audio/mpeg',
        'category': 'demo',
      },
      {
        'filename': 'cuttyranks_livingcondition.mp4',
        'assetPath': 'assets/demomedia/cuttyranks_livingcondition.mp4',
        'type': fm.FileType.video,
        'mimeType': 'video/mp4',
        'category': 'demo',
      },
      {
        'filename': 'Diamond Bach BWV937 Full rubbermetal good.mp3',
        'assetPath':
            'assets/demomedia/Diamond Bach BWV937 Full rubbermetal good.mp3',
        'type': fm.FileType.mp3,
        'mimeType': 'audio/mpeg',
        'category': 'demo',
      },
      {
        'filename': 'Diamond_Schubert_German Dance D643.mp3',
        'assetPath': 'assets/demomedia/Diamond_Schubert_German Dance D643.mp3',
        'type': fm.FileType.mp3,
        'mimeType': 'audio/mpeg',
        'category': 'demo',
      },
      {
        'filename': 'video1_baseball.mp4',
        'assetPath': 'assets/demomedia/video1_baseball.mp4',
        'type': fm.FileType.video,
        'mimeType': 'video/mp4',
        'category': 'demo',
      },
      {
        'filename': 'video2_treelighting.mp4',
        'assetPath': 'assets/demomedia/video2_treelighting.mp4',
        'type': fm.FileType.video,
        'mimeType': 'video/mp4',
        'category': 'demo',
      },
    ];

    final fileModels = <fm.FileModel>[];

    for (final fileInfo in localFiles) {
      final fileModel = fm.FileModel(
        path: fileInfo['assetPath'] as String,
        name: fileInfo['filename'] as String,
        extension: (fileInfo['assetPath'] as String).split('.').last,
        fileSize: 0,
        type: fileInfo['type'] as fm.FileType,
        mimeType: fileInfo['mimeType'] as String,
        lastModified: DateTime.now().millisecondsSinceEpoch,
        isDemo: true,
      );

      fileModels.add(fileModel);
    }

    return fileModels;
  }

  /// Register demo content with optional recommendations
  /// This is the main entry point - call this instead of DemoContentHelper.registerDemoContentSync()
  ///
  /// OPTIMIZED: Returns local files immediately, fetches recommendations in background
  /// This prevents API calls from blocking app startup
  static Future<void> registerRecommendedDemoContent(
    StateManagerService stateManager, {
    bool useRecommendations = true,
    bool skipIfRegistered = true,
  }) async {
    developer.log(
      '🎵 Registering demo content (recommendations: $useRecommendations)...',
      name: 'DemoContentWithRecommendations',
    );

    // Check if demo files already exist
    if (skipIfRegistered) {
      final existingDemoFiles = stateManager.files
          .where((f) => f.isDemo)
          .toList();
      if (existingDemoFiles.isNotEmpty) {
        developer.log(
          '⚠️ Demo content already in memory (${existingDemoFiles.length} files), skipping',
          name: 'DemoContentWithRecommendations',
        );
        return;
      }
    }

    // OPTIMIZATION: Skip local demo files, use only cached recommendations
    // Local files are no longer used by furniture system
    developer.log(
      '⚡ Skipping local demo files - furniture uses cached recommendations only',
      name: 'DemoContentWithRecommendations',
    );

    // Fetch recommendations asynchronously in background (non-blocking)
    if (useRecommendations && areRecommendationsEnabled) {
      developer.log(
        '📡 Fetching recommendations in background...',
        name: 'DemoContentWithRecommendations',
      );

      // Fire and forget - don't block UI
      _fetchRecommendationsInBackground(stateManager);
    } else {
      developer.log(
        '⚠️ Recommendations disabled - furniture will be empty until enabled',
        name: 'DemoContentWithRecommendations',
      );
    }
  }

  /// Fetch recommendations in background without blocking UI
  static void _fetchRecommendationsInBackground(
    StateManagerService stateManager,
  ) {
    // Run async without awaiting
    Future(() async {
      try {
        developer.log(
          '🔄 Background fetch started...',
          name: 'DemoContentWithRecommendations',
        );

        final recommendedContent = await fetchRecommendedContent();

        // Flatten all categories into single list
        final recommendedFiles = <fm.FileModel>[];
        for (final categoryFiles in recommendedContent.values) {
          recommendedFiles.addAll(categoryFiles);
        }

        if (recommendedFiles.isNotEmpty) {
          developer.log(
            '✅ Background fetch complete: ${recommendedFiles.length} recommended files available',
            name: 'DemoContentWithRecommendations',
          );

          // Note: Recommended files are cached and will be used on next app launch
          // They can also be displayed in a separate "Trending" section if desired
        } else {
          developer.log(
            '⚠️ Background fetch returned no results',
            name: 'DemoContentWithRecommendations',
          );
        }
      } catch (e) {
        developer.log(
          '⚠️ Background fetch failed: $e',
          name: 'DemoContentWithRecommendations',
          error: e,
        );
      }
    });
  }

  /// Record when a user opens/plays a recommended link
  /// This feeds into the favorites algorithm
  static Future<void> recordLinkOpen({
    required String url,
    required String title,
    required String platform,
  }) async {
    try {
      await _contentManager.recordLinkOpen(
        url: url,
        title: title,
        platform: platform,
      );
      developer.log(
        '✅ Recorded link open: $title',
        name: 'DemoContentWithRecommendations',
      );
    } catch (e) {
      developer.log(
        '⚠️ Failed to record link open: $e',
        name: 'DemoContentWithRecommendations',
        error: e,
      );
    }
  }

  /// Generate JavaScript playlists object from Dart recommendations
  /// Returns JavaScript code that creates window.DART_RECOMMENDATIONS
  /// in the same format as DEMO_PLAYLISTS for compatibility
  static Future<String> generateJavaScriptPlaylists({
    bool forceRefresh = false,
  }) async {
    try {
      developer.log(
        '🎵 Generating JavaScript playlists from recommendations (forceRefresh: $forceRefresh)...',
        name: 'DemoContentWithRecommendations',
      );

      final contentMap = await fetchRecommendedContent(
        forceRefresh: forceRefresh,
      );

      // Build JavaScript object matching DEMO_PLAYLISTS format
      final jsPlaylists = <String>[];

      // Gallery Wall (shorts/videos)
      // CRITICAL: ALWAYS include gallery_wall, even if empty, so merge logic can detect missing content
      final galleryLinks = contentMap['gallery_wall'] ?? [];
      if (galleryLinks.isNotEmpty) {
        final links = galleryLinks
            .map((f) => "'${f.path}'")
            .take(10)
            .join(', ');
        jsPlaylists.add('''
    topHitsMix: {
      furnitureType: 'gallery_wall',
      title: 'Trending Shorts',
      links: [$links]
    }''');
        developer.log(
          '✅ Gallery Wall: ${galleryLinks.length} links added to DART_RECOMMENDATIONS',
          name: 'DemoContentWithRecommendations',
        );
      } else {
        // Include empty gallery_wall so JavaScript knows we tried but failed
        jsPlaylists.add('''
    topHitsMix: {
      furnitureType: 'gallery_wall',
      title: 'Trending Shorts',
      links: []
    }''');
        developer.log(
          '⚠️ Gallery Wall: NO content available - included empty array in DART_RECOMMENDATIONS',
          name: 'DemoContentWithRecommendations',
        );
      }

      // Riser (music videos) - Fill all 15 slots (3 tiers × 5)
      // CRITICAL: ALWAYS include riser to ensure refresh works properly
      final riserLinks = contentMap['riser'] ?? [];
      if (riserLinks.isNotEmpty) {
        final links = riserLinks.map((f) => "'${f.path}'").take(15).join(', ');
        jsPlaylists.add('''
    chillVibes: {
      furnitureType: 'riser',
      title: 'Trending Videos',
      links: [$links]
    }''');
        developer.log(
          '✅ Riser: ${riserLinks.length} links added to DART_RECOMMENDATIONS',
          name: 'DemoContentWithRecommendations',
        );
      } else {
        jsPlaylists.add('''
    chillVibes: {
      furnitureType: 'riser',
      title: 'Trending Videos',
      links: []
    }''');
        developer.log(
          '⚠️ Riser: NO content available - included empty array in DART_RECOMMENDATIONS',
          name: 'DemoContentWithRecommendations',
        );
      }

      // Small Stage (music) - Fill all 13 slots (1 featured + 12 back)
      // CRITICAL: ALWAYS include small_stage to ensure refresh works properly
      final stageLinks = contentMap['small_stage'] ?? [];
      if (stageLinks.isNotEmpty) {
        final links = stageLinks.map((f) => "'${f.path}'").take(13).join(', ');
        jsPlaylists.add('''
    shortsAndReels: {
      furnitureType: 'stage_small',
      title: 'Trending Music',
      links: [$links]
    }''');
      } else {
        jsPlaylists.add('''
    shortsAndReels: {
      furnitureType: 'stage_small',
      title: 'Trending Music',
      links: []
    }''');
      }

      // Bookshelf (favorites from all platforms)
      // CRITICAL: ALWAYS include bookshelf, even if empty, so refresh can find and populate it
      final bookshelfLinks = contentMap['bookshelf'] ?? [];
      if (bookshelfLinks.isNotEmpty) {
        final links = bookshelfLinks
            .map((f) => "'${f.path}'")
            .take(6)
            .join(', ');
        jsPlaylists.add('''
    userFavorites: {
      furnitureType: 'bookshelf',
      title: 'Your Favorites',
      links: [$links]
    }''');
        developer.log(
          '✅ Bookshelf: ${bookshelfLinks.length} links added to DART_RECOMMENDATIONS',
          name: 'DemoContentWithRecommendations',
        );
      } else {
        // Include empty bookshelf so JavaScript knows to use DEMO_PLAYLISTS fallback
        jsPlaylists.add('''
    userFavorites: {
      furnitureType: 'bookshelf',
      title: 'Your Favorites',
      links: []
    }''');
        developer.log(
          '⚠️ Bookshelf: NO content available - included empty array in DART_RECOMMENDATIONS',
          name: 'DemoContentWithRecommendations',
        );
      }

      // Amphitheatre (mixed content from all sources) - REDUCED 50% for performance (20 → 10)
      if (contentMap.containsKey('amphitheatre') &&
          contentMap['amphitheatre']!.isNotEmpty) {
        final links = contentMap['amphitheatre']!
            .map((f) => "'${f.path}'")
            .take(10)
            .join(', ');
        jsPlaylists.add('''
    mixedContent: {
      furnitureType: 'amphitheatre',
      title: 'Mixed Trending',
      links: [$links]
    }''');
      }

      // Only return if we have content
      if (jsPlaylists.isEmpty) {
        developer.log(
          '⚠️ No recommendations available for JavaScript injection',
          name: 'DemoContentWithRecommendations',
        );
        return '';
      }

      final jsCode =
          '''
window.DART_RECOMMENDATIONS = {
${jsPlaylists.join(',\n')}
};
console.log('✨ Dart recommendations injected:', Object.keys(window.DART_RECOMMENDATIONS).length, 'playlists');
console.log('📊 Dart Gallery Wall URLs:', window.DART_RECOMMENDATIONS.topHitsMix?.links || 'No gallery wall data');
''';

      developer.log(
        '✅ Generated JavaScript playlists with ${jsPlaylists.length} categories',
        name: 'DemoContentWithRecommendations',
      );

      // Log first few URLs for verification
      if (contentMap.containsKey('gallery_wall') &&
          contentMap['gallery_wall']!.isNotEmpty) {
        final sampleUrls = contentMap['gallery_wall']!
            .take(5)
            .map((f) => f.path)
            .join(', ');
        developer.log(
          '📊 Sample gallery wall URLs being injected: $sampleUrls',
          name: 'DemoContentWithRecommendations',
        );
      }

      return jsCode;
    } catch (e) {
      developer.log(
        '❌ Failed to generate JavaScript playlists: $e',
        name: 'DemoContentWithRecommendations',
        error: e,
      );
      return '';
    }
  }

  /// Get additional links for a specific furniture type
  /// Used when JavaScript needs more content to fill empty slots after initial population
  static Future<List<String>> getAdditionalLinksForFurniture(
    String furnitureType,
    int count,
  ) async {
    try {
      developer.log(
        '📡 Fetching $count additional links for $furnitureType...',
        name: 'DemoContentWithRecommendations',
      );

      List<LinkObject> linkObjects = [];

      // Fetch appropriate content based on furniture type
      switch (furnitureType) {
        case 'gallery_wall':
          if (RecommendationsConfig.enableYouTubeContent) {
            final allLinks = await _contentManager.getGalleryWallLinks(
              forceRefresh: true,
            );
            linkObjects = allLinks.take(count).toList();
          }
          break;

        case 'riser':
          if (RecommendationsConfig.enableYouTubeContent) {
            final allLinks = await _contentManager.getRiserLinks(
              forceRefresh: true,
            );
            linkObjects = allLinks.take(count).toList();
          }
          break;

        case 'stage_small':
          if (RecommendationsConfig.enableSpotifyPublicPlaylists ||
              RecommendationsConfig.enableDeezerContent) {
            final allLinks = await _contentManager.getSmallStageLinks(
              forceRefresh: true,
            );
            linkObjects = allLinks.take(count).toList();
          }
          break;

        case 'amphitheatre':
          if (RecommendationsConfig.enableYouTubeContent) {
            final allLinks = await _contentManager.getAmphitheatreLinks(
              forceRefresh: true,
            );
            linkObjects = allLinks.take(count).toList();
          }
          break;

        case 'bookshelf':
          if (RecommendationsConfig.enableSpotifyPublicPlaylists) {
            final allLinks = await _contentManager.getBookshelfLinks();
            linkObjects = allLinks.take(count).toList();
          }
          break;

        default:
          developer.log(
            '⚠️ Unknown furniture type: $furnitureType',
            name: 'DemoContentWithRecommendations',
          );
      }

      // Extract URLs from LinkObjects
      final urls = linkObjects.map((link) => link.url).toList();

      developer.log(
        '✅ Fetched ${urls.length} additional links for $furnitureType',
        name: 'DemoContentWithRecommendations',
      );

      return urls;
    } catch (e) {
      developer.log(
        '❌ Failed to fetch additional links for $furnitureType: $e',
        name: 'DemoContentWithRecommendations',
        error: e,
      );
      return [];
    }
  }
}
