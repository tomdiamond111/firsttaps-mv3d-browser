/**
 * Configuration for recommendations API and feature flags
 * Browser implementation (localStorage-based)
 */

const RecommendationsConfig = {
  // ============================================================================
  // PLATFORM IDENTIFIERS
  // ============================================================================
  platformYouTube: 'youtube',
  platformSpotify: 'spotify',
  platformDeezer: 'deezer',
  platformVimeo: 'vimeo',
  platformTikTok: 'tiktok',
  platformInstagram: 'instagram',
  platformDailymotion: 'dailymotion',
  platformSoundCloud: 'soundcloud',

  // ============================================================================
  // CONTENT CATEGORIES
  // ============================================================================
  contentCategoryShorts: 'shorts',
  contentCategoryMusic: 'music',
  contentCategoryMusicVideos: 'music_videos',
  contentCategoryMixed: 'mixed',

  // ============================================================================
  // FURNITURE TYPES
  // ============================================================================
  furnitureGalleryWall: 'gallery_wall',
  furnitureSmallStage: 'stage_small',
  furnitureRiser: 'riser',
  furnitureAmphitheatre: 'amphitheatre',

  // ============================================================================
  // CACHE DURATIONS (Hours) - AGGRESSIVE CACHING
  // ============================================================================
  shortsCacheDuration: 48,     // 2 days - reduces YouTube API quota by 75%
  musicCacheDuration: 168,     // 7 days - reduces API calls significantly
  videoCacheDuration: 336,     // 14 days - long-lived cache for music videos

  // ============================================================================
  // CONTENT LIMITS PER FURNITURE
  // ============================================================================
  maxShortsPerFurniture: 10,          // Gallery Wall: 10 slots
  maxMusicPerFurniture: 50,           // Small Stage: 30 slots (fetch 50 for filtering buffer)
  maxVideosPerFurniture: 40,          // Riser: 15 slots (fetch 40 for filtering buffer)
  maxAmphitheatreContent: 20,         // Amphitheatre: 20 slots

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================
  enableRecommendations: true,
  enableYouTubeContent: true,
  enableSpotifyPublicPlaylists: true,
  enableDeezerContent: true,
  enableVimeoContent: true,
  enableTikTokContent: true,
  enableInstagramContent: true,
  enableDailymotionContent: true,
  enableSoundCloudContent: true,

  // ============================================================================
  // API ENDPOINTS
  // ============================================================================
  youtubeApiBaseUrl: 'https://www.googleapis.com/youtube/v3',
  deezerApiBaseUrl: 'https://api.deezer.com',
  vimeoApiBaseUrl: 'https://api.vimeo.com',
  dailymotionApiBaseUrl: 'https://api.dailymotion.com',
  soundCloudApiBaseUrl: 'https://api-v2.soundcloud.com',

  // ============================================================================
  // YOUTUBE API SETTINGS
  // ============================================================================
  defaultRegionCode: 'US',
  youtubeMaxResults: 50,

  // ============================================================================
  // API KEYS (Load from environment or config)
  // ============================================================================
  getApiKey(platform) {
    // In browser, these should be loaded from a config endpoint or environment
    // For now, returning empty strings - implement your own key management
    switch (platform) {
      case 'youtube':
        return window.ENV?.YOUTUBE_API_KEY || '';
      case 'vimeo':
        return window.ENV?.VIMEO_ACCESS_TOKEN || '';
      case 'soundcloud':
        return window.ENV?.SOUNDCLOUD_CLIENT_ID || '';
      case 'github':
        return window.ENV?.GITHUB_TOKEN || '';
      default:
        return '';
    }
  },

  // ============================================================================
  // PLATFORM MINIMUMS (For selective fetching)
  // ============================================================================
  // Gallery Wall (10 slots): 6 YouTube, 2 Vimeo, 2 Dailymotion
  galleryYoutubeSlots: 6,
  galleryVimeoSlots: 2,
  galleryDailymotionSlots: 2,
  minGalleryYoutubePool: 12,      // 2x buffer
  minGalleryVimeoPool: 4,         // 2x buffer
  minGalleryDailymotionPool: 4,   // 2x buffer

  // Small Stage (30 slots): 9 YouTube, 7 Spotify, 7 Deezer, 7 SoundCloud
  stageYoutubeSlots: 9,
  stageSpotifySlots: 7,
  stageDeezerSlots: 7,
  stageSoundCloudSlots: 7,
  minStageYoutubePool: 18,        // 2x buffer
  minStageSpotifyPool: 14,        // 2x buffer
  minStageDeezerPool: 14,         // 2x buffer
  minStageSoundCloudPool: 14,     // 2x buffer

  // Riser (15 slots): 10 YouTube, 3 Vimeo, 2 Dailymotion
  riserYoutubeSlots: 10,
  riserVimeoSlots: 3,
  riserDailymotionSlots: 2,
  minRiserYoutubePool: 20,        // 2x buffer
  minRiserVimeoPool: 6,           // 2x buffer
  minRiserDailymotionPool: 4,     // 2x buffer

  // Amphitheatre (20 slots): 5 YouTube, 5 Vimeo, 5 Dailymotion, 3 TikTok, 2 Instagram
  amphiYoutubeSlots: 5,
  amphiVimeoSlots: 5,
  amphiDailymotionSlots: 5,
  amphiTikTokSlots: 3,
  amphiInstagramSlots: 2,
  minAmphiYoutubePool: 10,        // 2x buffer
  minAmphiVimeoPool: 10,          // 2x buffer
  minAmphiDailymotionPool: 10,    // 2x buffer
  minAmphiTikTokPool: 6,          // 2x buffer
  minAmphiInstagramPool: 4,       // 2x buffer
};

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecommendationsConfig;
}

// Make available globally
window.RecommendationsConfig = RecommendationsConfig;

console.log('✅ RecommendationsConfig loaded');
