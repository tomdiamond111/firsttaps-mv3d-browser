/**
 * Recommendation Service (Browser Implementation)
 * Core API fetching service for all platforms with selective platform-specific methods
 * 
 * Features:
 * - 13 platform-specific fetch methods for selective cache replenishment
 * - YouTube API integration with quota optimization
 * - Multi-platform support (YouTube, Vimeo, Dailymotion, Spotify, Deezer, SoundCloud, TikTok, Instagram)
 * - Preference-based filtering integration
 * - Aggressive caching to minimize API quota usage
 */

class RecommendationService {
  constructor() {
    this.config = window.RecommendationsConfig;
    this.storage = window.recommendationsStorage;
    this.preferenceService = window.contentPreferenceLearningService;
    this.metadataCache = new Map(); // URL → metadata for preference learning
  }

  // ============================================================================
  // PUBLIC PLATFORM-SPECIFIC FETCH METHODS (Selective Fetching)
  // ============================================================================

  /**
   * Fetch YouTube Shorts only (for selective cache replenishment)
   */
  async fetchYouTubeShortsOnly(regionCode = null) {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching YouTube shorts only...');
      const shorts = await this._fetchYouTubeShorts(regionCode);
      this._logDebug(`📊 [SELECTIVE] YouTube returned ${shorts.length} shorts`);
      return shorts;
    } catch (e) {
      this._logError('Error fetching YouTube shorts:', e);
      return [];
    }
  }

  /**
   * Fetch Vimeo Shorts only (for selective cache replenishment)
   */
  async fetchVimeoShortsOnly() {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching Vimeo shorts only...');
      const shorts = await this._fetchVimeoShorts();
      this._logDebug(`📊 [SELECTIVE] Vimeo returned ${shorts.length} shorts`);
      return shorts;
    } catch (e) {
      this._logError('Error fetching Vimeo shorts:', e);
      return [];
    }
  }

  /**
   * Fetch Dailymotion Shorts only (for selective cache replenishment)
   */
  async fetchDailymotionShortsOnly() {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching Dailymotion shorts only...');
      const shorts = await this._fetchDailymotionTrending();
      this._logDebug(`📊 [SELECTIVE] Dailymotion returned ${shorts.length} shorts`);
      return shorts;
    } catch (e) {
      this._logError('Error fetching Dailymotion shorts:', e);
      return [];
    }
  }

  /**
   * Fetch TikTok posts only (for selective cache replenishment)
   */
  async fetchTikTokShortsOnly() {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching TikTok posts only...');
      const posts = await this._fetchTikTokTrending();
      this._logDebug(`📊 [SELECTIVE] TikTok returned ${posts.length} posts`);
      return posts;
    } catch (e) {
      this._logError('Error fetching TikTok posts:', e);
      return [];
    }
  }

  /**
   * Fetch Instagram Reels only (for selective cache replenishment)
   */
  async fetchInstagramReelsOnly() {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching Instagram reels only...');
      const reels = await this._fetchInstagramTrending();
      this._logDebug(`📊 [SELECTIVE] Instagram returned ${reels.length} reels`);
      return reels;
    } catch (e) {
      this._logError('Error fetching Instagram reels:', e);
      return [];
    }
  }

  /**
   * Fetch YouTube Music Videos only (for selective cache replenishment)
   */
  async fetchYouTubeMusicVideosOnly(regionCode = null) {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching YouTube music videos only...');
      const videos = await this._fetchYouTubeMusicVideos(regionCode);
      this._logDebug(`📊 [SELECTIVE] YouTube returned ${videos.length} music videos`);
      return videos;
    } catch (e) {
      this._logError('Error fetching YouTube music videos:', e);
      return [];
    }
  }

  /**
   * Fetch Vimeo Music Videos only (for selective cache replenishment)
   */
  async fetchVimeoMusicVideosOnly() {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching Vimeo music videos only...');
      const videos = await this._fetchVimeoMusicVideos(20);
      this._logDebug(`📊 [SELECTIVE] Vimeo returned ${videos.length} music videos`);
      return videos;
    } catch (e) {
      this._logError('Error fetching Vimeo music videos:', e);
      return [];
    }
  }

  /**
   * Fetch Dailymotion Music Videos only (for selective cache replenishment)
   */
  async fetchDailymotionMusicVideosOnly() {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching Dailymotion music videos only...');
      const videos = await this._fetchDailymotionMusicVideos();
      this._logDebug(`📊 [SELECTIVE] Dailymotion returned ${videos.length} music videos`);
      return videos;
    } catch (e) {
      this._logError('Error fetching Dailymotion music videos:', e);
      return [];
    }
  }

  /**
   * Fetch YouTube Music Audio only (for selective cache replenishment)
   */
  async fetchYouTubeMusicAudioOnly(regionCode = null) {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching YouTube Music audio only...');
      const tracks = await this._fetchYouTubeMusicAudio(regionCode);
      this._logDebug(`📊 [SELECTIVE] YouTube Music returned ${tracks.length} tracks`);
      return tracks;
    } catch (e) {
      this._logError('Error fetching YouTube Music audio:', e);
      return [];
    }
  }

  /**
   * Fetch Spotify tracks only (for selective cache replenishment)
   */
  async fetchSpotifyTracksOnly() {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching Spotify tracks only...');
      const tracks = await this._fetchSpotifyPublicPlaylistTracks();
      this._logDebug(`📊 [SELECTIVE] Spotify returned ${tracks.length} tracks`);
      return tracks;
    } catch (e) {
      this._logError('Error fetching Spotify tracks:', e);
      return [];
    }
  }

  /**
   * Fetch Deezer tracks only (for selective cache replenishment)
   */
  async fetchDeezerTracksOnly() {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching Deezer tracks only...');
      const tracks = await this._fetchDeezerChartTracks();
      this._logDebug(`📊 [SELECTIVE] Deezer returned ${tracks.length} tracks`);
      return tracks;
    } catch (e) {
      this._logError('Error fetching Deezer tracks:', e);
      return [];
    }
  }

  /**
   * Fetch SoundCloud tracks only (for selective cache replenishment)
   */
  async fetchSoundCloudTracksOnly() {
    try {
      this._logDebug('📊 [SELECTIVE] Fetching SoundCloud tracks only...');
      const tracks = await this._fetchSoundCloudPublicTracks();
      this._logDebug(`📊 [SELECTIVE] SoundCloud returned ${tracks.length} tracks`);
      return tracks;
    } catch (e) {
      this._logError('Error fetching SoundCloud tracks:', e);
      return [];
    }
  }

  // ============================================================================
  // INTERNAL FETCH METHODS  (Platform-specific implementations)
  // ============================================================================

  /**
   * Fetch YouTube Shorts from API
   * Uses mostPopular endpoint for quota optimization (100 units vs 300)
   */
  async _fetchYouTubeShorts(regionCode = null) {
    try {
      const region = regionCode || this.config.defaultRegionCode;
      const apiKey = this.config.getApiKey('youtube');
      
      if (!apiKey) {
        this._logError('YouTube API key not configured');
        return [];
      }

      // Use mostPopular endpoint for quota optimization
      // Category 24 = Entertainment, Category 10 = Music
      const categoryId = '24';
      const url = `${this.config.youtubeApiBaseUrl}/videos?` +
        `part=snippet,contentDetails&` +
        `chart=mostPopular&` +
        `maxResults=${this.config.youtubeMaxResults}&` +
        `videoCategoryId=${categoryId}&` +
        `regionCode=${region}&` +
        `key=${apiKey}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        this._logError(`YouTube API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const videos = data.items || [];

      this._logDebug(`YouTube API returned ${videos.length} videos`);

      // Convert to LinkObjects
      const links = videos
        .map(video => {
          try {
            const videoId = video.id;
            const snippet = video.snippet || {};
            const thumbnails = snippet.thumbnails || {};
            const thumbnailUrl = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '';

            // Build metadata for preference learning
            const metadata = {
              description: snippet.description || '',
              channelTitle: snippet.channelTitle || '',
              channelId: snippet.channelId || '',
              language: snippet.defaultAudioLanguage || '',
              tags: snippet.tags || [],
              categoryId: snippet.categoryId || '',
            };

            // Cache metadata for dislike recording
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            this.metadataCache.set(videoUrl, metadata);

            return {
              id: `yt-${videoId}`,
              url: videoUrl,
              title: snippet.title || 'Untitled',
              platform: this.config.platformYouTube,
              thumbnailUrl: thumbnailUrl,
              metadata: JSON.stringify(metadata)
            };
          } catch (e) {
            this._logDebug(`⚠️ Failed to parse video: ${e}`);
            return null;
          }
        })
        .filter(link => link !== null);

      // Apply preference filtering
      const filteredLinks = await this._applyPreferenceFiltering(links);
      
      if (filteredLinks.length !== links.length) {
        this._logDebug(`🔇 Preference filter: ${links.length} → ${filteredLinks.length} videos ` +
          `(removed ${links.length - filteredLinks.length} based on learned preferences)`);
      }

      return filteredLinks;
    } catch (e) {
      this._logError('Error fetching YouTube shorts:', e);
      return [];
    }
  }

  /**
   * Fetch Vimeo shorts (manual curation or API if available)
   */
  async _fetchVimeoShorts() {
    // For browser implementation, return hardcoded trending Vimeo shorts
    // In production, integrate with Vimeo API if you have access token
    return [
      {
        id: 'vimeo-336892869',
        url: 'https://vimeo.com/336892869',
        title: 'Rick Astley - Never Gonna Give You Up',
        platform: this.config.platformVimeo,
        thumbnailUrl: '',
        metadata: '{}'
      },
      {
        id: 'vimeo-1154762165',
        url: 'https://vimeo.com/1154762165',
        title: 'Creative Short',
        platform: this.config.platformVimeo,
        thumbnailUrl: '',
        metadata: '{}'
      }
    ];
  }

  /**
   * Fetch Dailymotion trending videos
   */
  async _fetchDailymotionTrending() {
    try {
      // Dailymotion API (no API key required for public content)
      const url = `${this.config.dailymotionApiBaseUrl}/videos?` +
        `fields=id,title,thumbnail_url&` +
        `sort=trending&` +
        `limit=20`;

      const response = await fetch(url);
      
      if (!response.ok) {
        this._logError(`Dailymotion API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const videos = data.list || [];

      return videos.map(video => ({
        id: `dm-${video.id}`,
        url: `https://www.dailymotion.com/video/${video.id}`,
        title: video.title || 'Untitled',
        platform: this.config.platformDailymotion,
        thumbnailUrl: video.thumbnail_url || '',
        metadata: '{}'
      }));
    } catch (e) {
      this._logError('Error fetching Dailymotion trending:', e);
      return [];
    }
  }

  /**
   * Fetch TikTok trending (manual curation)
   */
  async _fetchTikTokTrending() {
    // Return hardcoded TikTok URLs (no public API available)
    // Update these periodically with fresh trending content
    const tiktokUrls = [
      'https://www.tiktok.com/@ifkf137/video/7594422601221426462',
      'https://www.tiktok.com/@nttavernllc/video/7605800744792411422',
      'https://www.tiktok.com/@overtime/video/7609535801252154637'
    ];

    return tiktokUrls.map((url, index) => ({
      id: `tiktok-${index}`,
      url: url,
      title: `TikTok Video ${index + 1}`,
      platform: this.config.platformTikTok,
      thumbnailUrl: '',
      metadata: '{}'
    }));
  }

  /**
   * Fetch Instagram Reels (manual curation)
   */
  async _fetchInstagramTrending() {
    // Return hardcoded Instagram URLs (no public API available)
    return [
      {
        id: 'ig-1',
        url: 'https://www.instagram.com/reel/CdIxYYqgXYZ/',
        title: 'Instagram Reel 1',
        platform: this.config.platformInstagram,
        thumbnailUrl: '',
        metadata: '{}'
      }
    ];
  }

  /**
   * Fetch YouTube Music Videos
   */
  async _fetchYouTubeMusicVideos(regionCode = null) {
    try {
      const region = regionCode || this.config.defaultRegionCode;
      const apiKey = this.config.getApiKey('youtube');
      
      if (!apiKey) {
        this._logError('YouTube API key not configured');
        return [];
      }

      // Category 10 = Music
      const url = `${this.config.youtubeApiBaseUrl}/videos?` +
        `part=snippet,contentDetails&` +
        `chart=mostPopular&` +
        `maxResults=${this.config.youtubeMaxResults}&` +
        `videoCategoryId=10&` +
        `regionCode=${region}&` +
        `key=${apiKey}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        this._logError(`YouTube API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const videos = data.items || [];

      return videos.map(video => {
        const videoId = video.id;
        const snippet = video.snippet || {};
        const thumbnails = snippet.thumbnails || {};

        return {
          id: `yt-music-${videoId}`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title: snippet.title || 'Untitled',
          platform: this.config.platformYouTube,
          thumbnailUrl: thumbnails.high?.url || thumbnails.medium?.url || '',
          metadata: JSON.stringify({
            channelTitle: snippet.channelTitle || '',
            categoryId: snippet.categoryId || ''
          })
        };
      });
    } catch (e) {
      this._logError('Error fetching YouTube music videos:', e);
      return [];
    }
  }

  /**
   * Fetch Vimeo Music Videos
   */
  async _fetchVimeoMusicVideos(maxResults = 20) {
    // Return hardcoded Vimeo music videos
    // In production, integrate with Vimeo API
    return [];
  }

  /**
   * Fetch Dailymotion Music Videos
   */
  async _fetchDailymotionMusicVideos() {
    // Similar to _fetchDailymotionTrending but filter for music category
    return [];
  }

  /**
   * Fetch YouTube Music Audio tracks
   */
  async _fetchYouTubeMusicAudio(regionCode = null) {
    // Similar to _fetchYouTubeMusicVideos
    return await this._fetchYouTubeMusicVideos(regionCode);
  }

  /**
   * Fetch Spotify public playlist tracks
   */
  async _fetchSpotifyPublicPlaylistTracks() {
    // Return hardcoded Spotify URLs (no API key needed for public playlists)
    // Browser can use embed API to get track info
    const spotifyUrls = [
      'https://open.spotify.com/track/7tICCrK3CcyRFKza7yrR0z',
      'https://open.spotify.com/track/12bYYQaLqHliSXvRIYlq8G',
      'https://open.spotify.com/track/1qbmS6ep2hbBRaEZFpn7BX',
      'https://open.spotify.com/track/45Z3m6yazmAi4jZuW0tzW0'
    ];

    return spotifyUrls.map((url, index) => ({
      id: `spotify-${index}`,
      url: url,
      title: `Spotify Track ${index + 1}`,
      platform: this.config.platformSpotify,
      thumbnailUrl: '',
      metadata: '{}'
    }));
  }

  /**
   * Fetch Deezer chart tracks
   */
  async _fetchDeezerChartTracks() {
    try {
      const url = `${this.config.deezerApiBaseUrl}/chart`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        this._logError(`Deezer API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const tracks = data.tracks?.data || [];

      return tracks.slice(0, 20).map(track => ({
        id: `deezer-${track.id}`,
        url: track.link,
        title: `${track.artist?.name} - ${track.title}`,
        platform: this.config.platformDeezer,
        thumbnailUrl: track.album?.cover_medium || '',
        metadata: JSON.stringify({
          artist: track.artist?.name || '',
          album: track.album?.title || ''
        })
      }));
    } catch (e) {
      this._logError('Error fetching Deezer tracks:', e);
      return [];
    }
  }

  /**
   * Fetch SoundCloud public tracks
   */
  async _fetchSoundCloudPublicTracks() {
    // Return hardcoded SoundCloud URLs (API requires auth)
    const soundcloudUrls = [
      'https://soundcloud.com/shaboozey/shaboozey-a-bar-song-tipsy',
      'https://soundcloud.com/billieeilish/birds-of-a-feather',
      'https://soundcloud.com/teddyswims/lose-control'
    ];

    return soundcloudUrls.map((url, index) => ({
      id: `soundcloud-${index}`,
      url: url,
      title: `SoundCloud Track ${index + 1}`,
      platform: this.config.platformSoundCloud,
      thumbnailUrl: '',
      metadata: '{}'
    }));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Apply preference-based filtering to links
   */
  async _applyPreferenceFiltering(links) {
    if (!this.preferenceService || !this.preferenceService.initialized) {
      return links;
    }

    const filtered = [];
    let removedCount = 0;

    for (const link of links) {
      try {
        const metadata = link.metadata ? JSON.parse(link.metadata) : {};
        const filterResult = this.preferenceService.shouldFilterContent(metadata);

        if (!filterResult.shouldFilter) {
          filtered.push(link);
        } else {
          removedCount++;
          this._logDebug(`🔇 Filtered: ${link.title} - ${filterResult.reason}`);
        }
      } catch (e) {
        // If metadata parsing fails, include the link
        filtered.push(link);
      }
    }

    if (removedCount > 0) {
      this._logDebug(`📊 Preference filter removed ${removedCount} links`);
    }

    return filtered;
  }

  /**
   * Debug logging
   */
  _logDebug(message) {
    console.log(`[RecommendationService] ${message}`);
  }

  /**
   * Error logging
   */
  _logError(message, error = null) {
    if (error) {
      console.error(`[RecommendationService] ❌ ${message}`, error);
    } else {
      console.error(`[RecommendationService] ❌ ${message}`);
    }
  }
}

// Create singleton instance
const recommendationService = new RecommendationService();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = recommendationService;
}

// Make available globally
window.RecommendationService = RecommendationService;
window.recommendationService = recommendationService;

console.log('✅ RecommendationService loaded');
