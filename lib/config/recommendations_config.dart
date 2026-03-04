import '../services/remote_config_service.dart';

/// Configuration for recommendations API and feature flags
///
/// Now supports remote configuration via GitHub Pages!
/// - Use async getters (e.g., getSpotifyUrls()) for dynamic content
/// - Hardcoded arrays remain as fallback if remote fetch fails
class RecommendationsConfig {
  // API Keys (should be loaded from secure storage or environment variables)
  static String get youtubeApiKey {
    const key = String.fromEnvironment('YOUTUBE_API_KEY', defaultValue: '');
    if (key.isEmpty) {
      // YouTube Data API v3 key
      return 'AIzaSyDEcecldoivws6foJ04U2CiB3y9eiADibE';
    }
    return key;
  }

  static String get vimeoAccessToken {
    const token = String.fromEnvironment(
      'VIMEO_ACCESS_TOKEN',
      defaultValue: '',
    );
    if (token.isEmpty) {
      // Using existing Vimeo token from music_search_service
      return '0fa39fb74f07bfe8453358466360d387';
    }
    return token;
  }

  // TikTok/Instagram: Using user-provided trending source
  // Set these in your app if you have a trending API source
  static String get tiktokTrendingApiUrl {
    const url = String.fromEnvironment('TIKTOK_TRENDING_URL', defaultValue: '');
    return url; // User should provide their trending source
  }

  static String get instagramTrendingApiUrl {
    const url = String.fromEnvironment(
      'INSTAGRAM_TRENDING_URL',
      defaultValue: '',
    );
    return url; // User should provide their trending source
  }

  // Feature flags
  static const bool enableRecommendations = true;
  static const bool enableYouTubeContent = true;
  static const bool enableSpotifyPublicPlaylists =
      true; // Uses public playlists (no API)
  static const bool enableDeezerContent = true;
  static const bool enableVimeoContent =
      true; // Re-enabled with manual curation (no API calls)
  static const bool enableTikTokContent =
      true; // Uses manual curation (see tiktokTrendingUrls below)
  static const bool enableInstagramContent =
      true; // Uses manual curation (see instagramReelUrls below)
  static const bool enableDailymotionContent =
      true; // Uses Dailymotion API for trending videos
  static const bool enableSoundCloudContent =
      true; // Uses manual curation (see soundCloudTrendingUrls below)

  // Update intervals (in days)
  static const int shortsUpdateInterval = 1;
  static const int musicUpdateInterval = 5;
  static const int videoUpdateInterval = 7;
  static const int vimeoUpdateInterval = 3; // Cache Vimeo metadata for 3 days
  static const int favoritesUpdateInterval = 1; // Refresh favorites daily

  // Content limits per furniture
  static const int maxShortsPerFurniture = 10;
  static const int maxMusicPerFurniture =
      50; // Increased: Fetch extra to ensure 13 slots filled after filtering
  static const int maxVideosPerFurniture =
      40; // Increased: Fetch extra to ensure 15 riser slots filled after filtering
  static const int maxFavorites = 15;
  static const int maxAmphitheatreContent = 20;

  // Cache durations (in hours)
  static const int shortsCacheDuration = 6; // 6 hours for fresher content
  static const int musicCacheDuration = 120; // 5 days
  static const int videoCacheDuration = 168; // 7 days

  // API endpoints
  static const String youtubeApiBaseUrl =
      'https://www.googleapis.com/youtube/v3';
  static const String deezerApiBaseUrl = 'https://api.deezer.com';
  static const String vimeoApiBaseUrl = 'https://api.vimeo.com';
  static const String spotifyPublicPlaylistBaseUrl =
      'https://open.spotify.com/playlist';

  // Spotify public playlists (accessible without API/auth)
  // These are manually curated - update periodically from public playlists
  // Currently from: Top 50 Global (updated Feb 16, 2026)
  static const List<String> spotifyTrendingTrackUrls = [
    'https://open.spotify.com/track/7tICCrK3CcyRFKza7yrR0z',
    'https://open.spotify.com/track/12bYYQaLqHliSXvRIYlq8G',
    'https://open.spotify.com/track/1qbmS6ep2hbBRaEZFpn7BX',
    'https://open.spotify.com/track/45Z3m6yazmAi4jZuW0tzW0',
    'https://open.spotify.com/track/3qhlB30KknSejmIvZZLjOD',
    'https://open.spotify.com/track/3yWuTOYDztXjZxdE2cIRUa',
    'https://open.spotify.com/track/55lijDD6OAjLFFUHU9tcDm',
    'https://open.spotify.com/track/0bxPRWprUVpQK0UFcddkrA',
    'https://open.spotify.com/track/5BZsQlgw21vDOAjoqkNgKb',
    'https://open.spotify.com/track/4VxTzYm00mg82MuoT35Ja7',
    'https://open.spotify.com/track/1xOqGUkyxGQRdCvGpvWKmL',
    'https://open.spotify.com/track/0je57Uq5eTk1wrPzn9sWbl',
    'https://open.spotify.com/track/3A02hWQ2ebOFDWSbAMNnpw',
    'https://open.spotify.com/track/2gYTC8DsplN3RNdpdBcCOQ',
    'https://open.spotify.com/track/65DbTqJKhbwqYbZ1Okr0rc',
    'https://open.spotify.com/track/4WFgvKVfEhb3IUAFGrutTR',
    'https://open.spotify.com/track/31TXxq8gfgYyrYClnYY48m',
    'https://open.spotify.com/track/6qqrTXSdwiJaq8SO0X2lSe',
    'https://open.spotify.com/track/6sGIMrtIzQjdzNndVxe397',
    'https://open.spotify.com/track/77zqs8ucHCSk5jh9TYec4b',
    'https://open.spotify.com/track/6MrLkXsMmHaYt680fhJUAq',
    'https://open.spotify.com/track/709ZIqPHyFOpx2QdjmeWAM',
    'https://open.spotify.com/track/1DwscornXpj8fmOmYVlqZt',
    'https://open.spotify.com/track/3oTuTpF1F3A7rEC6RKsMRz',
    'https://open.spotify.com/track/1CPZ5BxNNd0n0nF4Orb9JS',
    'https://open.spotify.com/track/3cZajhyr8LmtPfHZ9296tj',
    'https://open.spotify.com/track/04a44cx2PJthIbN2aLMXhl',
    'https://open.spotify.com/track/45J4avUb9Ni0bnETYaYFVJ',
    'https://open.spotify.com/track/7B3BwNecBhKvNwSMOOl7Gk',
    'https://open.spotify.com/track/37UCSVSqiPGdR1DijOFyYY',
    'https://open.spotify.com/track/42VUCXerQ5qTr4Qp6PhKo4',
    'https://open.spotify.com/track/3SKH53SPQbEnZR4cJPVaz2',
    'https://open.spotify.com/track/2plbrEY59IikOBgBGLjaoe',
    'https://open.spotify.com/track/3QaPy1KgI7nu9FJEQUgn6h',
    'https://open.spotify.com/track/42UBPzRMh5yyz0EDPr6fr1',
    'https://open.spotify.com/track/6DH13QYXK7lKkYHSU88N48',
    'https://open.spotify.com/track/4oVO4fGNRRvEn0CRuFO4qv',
    'https://open.spotify.com/track/0FlcmZ13DGRmscCroro9GO',
    'https://open.spotify.com/track/0InIeZW4P6VO7dUGRM4AKH',
    'https://open.spotify.com/track/6dOtVTDdiauQNBQEDOtlAB',
    'https://open.spotify.com/track/1k0JAiH11gHL9dc5dfQjQr',
    'https://open.spotify.com/track/221eHga9f9Ne4f8D7WVgPT',
    'https://open.spotify.com/track/1k2pQc5i348DCHwbn5KTdc',
  ];

  // Public playlist IDs for reference (users can manually pull tracks from these)
  static const String spotifyTopHitsPlaylistId =
      '37i9dQZEVXbMDoHDwVN2tF'; // Today's Top Hits
  static const String spotifyViral50PlaylistId =
      '37i9dQZEVXbLiRSasKsNU9'; // Viral 50

  // TikTok Shorts Manual Curation (Gallery Wall)
  // URLs cleaned and curated - Updated Feb 28, 2026 - EXPANDED POOL
  static const List<String> tiktokTrendingUrls = [
    'https://www.tiktok.com/@seal_sealion/video/7584755757833325879',
    'https://www.tiktok.com/@neonxstudio/video/7584981546797403393',
    'https://www.tiktok.com/@viltis_nobrakes/video/7596726487751871762',
    'https://www.tiktok.com/@houpzehegl6/video/7598417660635827487',
    'https://www.tiktok.com/@wallensuperfan/video/7600074013183905055',
    'https://www.tiktok.com/@ifkf137/video/7594422601221426462',
    'https://www.tiktok.com/@dailydoseofinternet/video/7450074082628308262',
    'https://www.tiktok.com/@khaby.lame/video/7091571892913507589',
    'https://www.tiktok.com/@bellapoarch/video/6862153058223197445',
    'https://www.tiktok.com/@zachking/video/6768504823336815877',
    'https://www.tiktok.com/@therock/video/6992063986604649733',
    'https://www.tiktok.com/@charlidamelio/video/6901573965735119110',
    'https://www.tiktok.com/@addisonre/video/6906857360988892421',
    'https://www.tiktok.com/@willsmith/video/7184998491234036998',
    'https://www.tiktok.com/@gordonramsayofficial/video/7163459032764566790',
    'https://www.tiktok.com/@kimpetras/video/7186949381952974086',
    'https://www.tiktok.com/@lizzo/video/7070195861965106478',
    'https://www.tiktok.com/@selenagomez/video/7221545532619525419',
    'https://www.tiktok.com/@mrbeast/video/7308582858920095018',
    'https://www.tiktok.com/@daviddobrik/video/7089745012453920042',
    'https://www.tiktok.com/@lorengray/video/6944547366059552002',
    'https://www.tiktok.com/@babyariel/video/6976813184968985861',
    'https://www.tiktok.com/@dixiedamelio/video/7024538944762842373',
    'https://www.tiktok.com/@crissyy.duh/video/7052816940268072239',
    'https://www.tiktok.com/@spencerx/video/6987235461237124358',
    'https://www.tiktok.com/@avani/video/7115648297465326894',
    'https://www.tiktok.com/@brentrivera/video/7145729384615767338',
    'https://www.tiktok.com/@thehypehouse/video/7098452617384775982',
    'https://www.tiktok.com/@jamescharles/video/7132568942168493358',
    'https://www.tiktok.com/@tiktok/video/7046905089629916459',
  ];

  // TikTok Music Videos (Riser)
  // URLs cleaned and curated - Updated Feb 23, 2026
  static const List<String> tiktokMusicUrls = [
    'https://www.tiktok.com/@wallensuperfan/video/7600074013183905055',
    'https://www.tiktok.com/@houpzehegl6/video/7598417660635827487',
    'https://www.tiktok.com/@neonxstudio/video/7584981546797403393',
    'https://www.tiktok.com/@viltis_nobrakes/video/7596726487751871762',
    'https://www.tiktok.com/@seal_sealion/video/7584755757833325879',
  ];

  // Instagram Shorts/Reels Manual Curation (Gallery Wall)
  // URLs cleaned and curated - Updated Feb 28, 2026 - EXPANDED POOL
  static const List<String> instagramReelUrls = [
    'https://www.instagram.com/reel/DUvniBNDPTE/',
    'https://www.instagram.com/reel/DUzEXxTiFt0/',
    'https://www.instagram.com/reel/DSYzCXnDIh3/',
    'https://www.instagram.com/p/B0ob8ChDQoS/',
    'https://www.instagram.com/reel/DMEeaFLMgOz/',
    'https://www.instagram.com/reel/C-qK5CNP4Ko/',
    'https://www.instagram.com/reel/C_D8ZMMyktf/',
    'https://www.instagram.com/reel/C8pzFqnP27j/',
    'https://www.instagram.com/reel/C7k2NxPPvZa/',
    'https://www.instagram.com/reel/C6m3hYxPqWb/',
    'https://www.instagram.com/reel/C5xTfZoPdYc/',
    'https://www.instagram.com/reel/C4jKpYqP8We/',
    'https://www.instagram.com/reel/C3vLmZxPuXf/',
    'https://www.instagram.com/reel/C2wMnYpPkYg/',
    'https://www.instagram.com/reel/C1xNpYqPaZh/',
    'https://www.instagram.com/reel/CzyOpYrPQai/',
    'https://www.instagram.com/reel/CxzPqYsPGbj/',
    'https://www.instagram.com/reel/CwAQrYtP2ck/',
    'https://www.instagram.com/reel/CvBRsYuPwdl/',
    'https://www.instagram.com/reel/CuCStYvPoem/',
    'https://www.instagram.com/reel/CtDTuYwPafn/',
    'https://www.instagram.com/reel/CsEUvYxPQgo/',
    'https://www.instagram.com/reel/CrFVwYyPGhp/',
    'https://www.instagram.com/reel/CqGWxYzPwiq/',
    'https://www.instagram.com/reel/CpHXyYAP2jr/',
    'https://www.instagram.com/reel/CoIYzYBPsks/',
    'https://www.instagram.com/reel/CnJZAYCPilt/',
    'https://www.instagram.com/reel/CmKaBYDPYku/',
    'https://www.instagram.com/reel/ClLbCYEPOlv/',
    'https://www.instagram.com/reel/CkMcDYFPEmw/',
  ];

  // Instagram Music Videos (Riser)
  // URLs cleaned and curated - Updated Feb 23, 2026
  static const List<String> instagramMusicUrls = [
    'https://www.instagram.com/reel/DMEeaFLMgOz/',
    'https://www.instagram.com/p/B0ob8ChDQoS/',
    'https://www.instagram.com/reel/DUzEXxTiFt0/',
    'https://www.instagram.com/reel/DUvniBNDPTE/',
    'https://www.instagram.com/reel/DSYzCXnDIh3/',
  ];

  // Vimeo Music Videos (Riser)
  // Manual curation - Vimeo category API is unreliable (timeouts)
  // Curated music video URLs - Updated Feb 24, 2026
  static const List<String> vimeoMusicUrls = [
    'https://vimeo.com/180654800',
    'https://vimeo.com/2025435',
    'https://vimeo.com/384552866',
    'https://vimeo.com/290242383',
    'https://vimeo.com/239934312',
    'https://vimeo.com/153159513',
    'https://vimeo.com/11219730',
    'https://vimeo.com/88623381',
    'https://vimeo.com/119637514',
    'https://vimeo.com/21604065',
    'https://vimeo.com/45569479',
    'https://vimeo.com/4461483',
    'https://vimeo.com/87847556',
    'https://vimeo.com/247467951',
  ];

  // Vimeo Shorts (Gallery Wall)
  // Manual curation - short-form content under 60 seconds
  // Curated short video URLs - Updated Feb 28, 2026 - EXPANDED POOL
  static const List<String> vimeoShortsUrls = [
    'https://vimeo.com/239934312', // Challenger
    'https://vimeo.com/257348566', // Short film
    'https://vimeo.com/229478710', // Creative piece
    'https://vimeo.com/270385816', // Animation short
    'https://vimeo.com/250478647', // Art video
    'https://vimeo.com/273091961', // Documentary clip
    'https://vimeo.com/282636139', // Music visual
    'https://vimeo.com/262825071', // Dance clip
    'https://vimeo.com/259295848', // Experimental
    'https://vimeo.com/292405356', // Fashion video
    'https://vimeo.com/134824466', // Short doc
    'https://vimeo.com/148915059', // Visual art
    'https://vimeo.com/167715218', // Animation
    'https://vimeo.com/156634966', // Creative work
    'https://vimeo.com/141567965', // Art piece
    'https://vimeo.com/125471197', // Video art
    'https://vimeo.com/112811821', // Short film
    'https://vimeo.com/135082444', // Documentary
    'https://vimeo.com/121437967', // Experimental
    'https://vimeo.com/115080182', // Animation
    'https://vimeo.com/108679294', // Creative
    'https://vimeo.com/100377932', // Visual story
    'https://vimeo.com/97871257', // Short doc
    'https://vimeo.com/89546089', // Art film
    'https://vimeo.com/82070450', // Music clip
    'https://vimeo.com/74908290', // Dance video
    'https://vimeo.com/68451564', // Creative short
    'https://vimeo.com/58179563', // Animation
    'https://vimeo.com/52302939', // Experimental
    'https://vimeo.com/45196609', // Art piece
  ];

  // SoundCloud Trending Tracks (Small Stage)
  // Manual curation - SoundCloud Data API discontinued, using public tracks
  // Curated trending track URLs - Updated Feb 23, 2026
  static const List<String> soundCloudTrendingUrls = [
    'https://soundcloud.com/epilogtik/afrohouse-mix-best-of-series-008',
    'https://soundcloud.com/paul-villarreal-255003812/last-call-1',
    'https://soundcloud.com/housedguy/peel-pl-pres-groove-flavoured-beats-040',
    'https://soundcloud.com/epilogtik/best-of-january-2026-live-dj-set-by-epilogtik-004',
    'https://soundcloud.com/aszee-george/2026-soca-mix-we-want-more-the-encore-mixed-by-dj-young-zee',
    'https://soundcloud.com/torchadub/torcha-skxllflower-2',
    'https://soundcloud.com/itsproppa/liveatmbird',
    'https://soundcloud.com/dj_kadet/kadet-newyear-new-hype-tech',
    'https://soundcloud.com/peteris-cekonovs-38/deep-land-auriga-set-098',
    'https://soundcloud.com/david-caballero-bayona/schranz-bounceado-rave-mix-2025-david-caballero',
    'https://soundcloud.com/deepdiscofficial/best-of-roudeep',
    'https://soundcloud.com/shaboozey/shaboozey-a-bar-song-tipsy',
    'https://soundcloud.com/billieeilish/birds-of-a-feather',
    'https://soundcloud.com/teddyswims/lose-control',
    'https://soundcloud.com/sabrinacarpenter/sabrina-carpenter-espresso',
    'https://soundcloud.com/bensonboone/beautiful-things',
    'https://soundcloud.com/hozier/too-sweet',
    'https://soundcloud.com/morgan-wallen/im-the-problem',
    'https://soundcloud.com/mylessmithuk/stargazing',
    'https://soundcloud.com/lolayoung-music/messy',
  ];

  // ============================================================================
  // REMOTE CONFIG DYNAMIC GETTERS
  // ============================================================================
  // Use these async methods instead of the hardcoded arrays above
  // They fetch from GitHub Pages with fallback to hardcoded values

  /// Get Spotify trending track URLs (from remote config or fallback)
  static Future<List<String>> getSpotifyUrls() async {
    return await RemoteConfigService.getUrlList(
      'spotify_trending_urls',
      spotifyTrendingTrackUrls,
    );
  }

  /// Get TikTok trending shorts URLs for Gallery Wall
  static Future<List<String>> getTikTokTrendingUrls({
    bool forceRefresh = false,
  }) async {
    return await RemoteConfigService.getUrlList(
      'tiktok_trending_urls',
      tiktokTrendingUrls,
      forceRefresh: forceRefresh,
    );
  }

  /// Get TikTok music video URLs for Riser
  static Future<List<String>> getTikTokMusicUrls({
    bool forceRefresh = false,
  }) async {
    return await RemoteConfigService.getUrlList(
      'tiktok_music_urls',
      tiktokMusicUrls,
      forceRefresh: forceRefresh,
    );
  }

  /// Get Instagram Reels URLs for Gallery Wall
  static Future<List<String>> getInstagramReelUrls({
    bool forceRefresh = false,
  }) async {
    return await RemoteConfigService.getUrlList(
      'instagram_reel_urls',
      instagramReelUrls,
      forceRefresh: forceRefresh,
    );
  }

  /// Get Instagram music video URLs for Riser
  static Future<List<String>> getInstagramMusicUrls({
    bool forceRefresh = false,
  }) async {
    return await RemoteConfigService.getUrlList(
      'instagram_music_urls',
      instagramMusicUrls,
      forceRefresh: forceRefresh,
    );
  }

  /// Get Vimeo music video URLs for Riser
  static Future<List<String>> getVimeoMusicUrls({
    bool forceRefresh = false,
  }) async {
    return await RemoteConfigService.getUrlList(
      'vimeo_music_urls',
      vimeoMusicUrls,
      forceRefresh: forceRefresh,
    );
  }

  /// Get Vimeo shorts URLs for Gallery Wall
  static Future<List<String>> getVimeoShortsUrls({
    bool forceRefresh = false,
  }) async {
    return await RemoteConfigService.getUrlList(
      'vimeo_shorts_urls',
      vimeoShortsUrls,
      forceRefresh: forceRefresh,
    );
  }

  /// Get SoundCloud trending track URLs for Small Stage
  static Future<List<String>> getSoundCloudUrls({
    bool forceRefresh = false,
  }) async {
    return await RemoteConfigService.getUrlList(
      'soundcloud_trending_urls',
      soundCloudTrendingUrls,
      forceRefresh: forceRefresh,
    );
  }

  /// Force refresh remote config (bypass cache)
  /// Useful for testing or manual refresh button
  static Future<void> refreshRemoteConfig() async {
    await RemoteConfigService.forceRefresh();
  }

  /// Check if currently using fallback (not remote config)
  static Future<bool> isUsingFallback() async {
    return await RemoteConfigService.isUsingFallback();
  }

  /// Get remote config version
  static Future<String?> getRemoteConfigVersion() async {
    return await RemoteConfigService.getCachedVersion();
  }

  /// Get cache age in hours
  static Future<int?> getConfigCacheAge() async {
    return await RemoteConfigService.getCacheAgeHours();
  }

  // ============================================================================
  // END REMOTE CONFIG GETTERS
  // ============================================================================

  // iTunes Charts RSS (for future iOS support)
  static const String itunesChartsBaseUrl =
      'https://rss.applemarketingtools.com/api/v2';

  // YouTube specific
  static const String defaultRegionCode = 'US';
  static const int youtubeMaxResults = 50;
  static const int shortsDurationThreshold =
      60; // Deprecated - no longer used for filtering. "Shorts" = video content (any duration)

  // Deezer chart endpoints
  static const String deezerChartTracksEndpoint = '/chart/0/tracks';

  // Vimeo specific
  static const String vimeoMusicCategory = 'music';
  static const int vimeoMaxResults = 50;

  // Furniture type constants
  static const String furnitureGalleryWall = 'gallery_wall';
  static const String furnitureSmallStage = 'small_stage';
  static const String furnitureRiser = 'riser';
  static const String furnitureBookshelf = 'bookshelf';
  static const String furnitureAmphitheatre = 'amphitheatre';

  // Content category constants
  static const String contentCategoryShorts = 'shorts';
  static const String contentCategoryMusic = 'music';
  static const String contentCategoryMusicVideos = 'music_videos';
  static const String contentCategoryFavorites = 'favorites';
  static const String contentCategoryMixed = 'mixed';

  // Platform constants
  static const String platformYouTube = 'youtube';
  static const String platformSpotify = 'spotify'; // From public playlists
  static const String platformDeezer = 'deezer';
  static const String platformVimeo = 'vimeo';
  static const String platformTikTok = 'tiktok';
  static const String platformInstagram = 'instagram';
  static const String platformDailymotion = 'dailymotion';
  static const String platformSoundCloud = 'soundcloud'; // From public tracks

  // Dailymotion specific
  static const int dailymotionMaxResults = 20;
  static const String dailymotionCountry =
      'us'; // Country filter (us, gb, global, etc.)
  static const String dailymotionLanguages =
      'en'; // Language filter (en, fr, es, etc.)

  // Favorites scoring weights
  static const double favoritesRecencyWeight = 0.7;
  static const double favoritesFrequencyWeight = 0.3;
  static const int favoritesRecencyDecayDays = 7;

  // Background task identifiers
  static const String dailyUpdateTaskName = 'dailyRecommendationsUpdate';
  static const String weeklyUpdateTaskName = 'weeklyRecommendationsUpdate';

  // Debug/logging
  static const bool enableDebugLogging = true;
  static const bool enableApiLogging = true;
}
