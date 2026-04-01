/**
 * Recommendation Content Manager (Browser Implementation)
 * Manages content pools for each furniture type with selective platform fetching
 * 
 * Features:
 * - Multi-platform cache checking (counts each platform separately)
 * - Selective fetching (only fetches from insufficient platforms)
 * - Cache merging (preserves existing content when replenishing)
 * - Significant YouTube API quota savings
 */

class RecommendationContentManager {
  constructor() {
    this.config = window.RecommendationsConfig;
    this.storage = window.recommendationsStorage;
    this.service = window.recommendationService;
  }

  // ============================================================================
  // GALLERY WALL (Shorts - 10 slots)
  // Target: 6 YouTube, 2 Vimeo, 2 Dailymotion
  // ============================================================================

  /**
   * Get links for Gallery Wall (trending shorts)
   * @param {boolean} forceRefresh - Force fetch new content
   * @returns {Promise<Array>} Array of LinkObjects
   */
  async getGalleryWallLinks(forceRefresh = false) {
    this._logDebug(`getGalleryWallLinks() called (forceRefresh: ${forceRefresh})`);

    const slotsNeeded = 10;
    const minYoutubePool = this.config.minGalleryYoutubePool;
    const minVimeoPool = this.config.minGalleryVimeoPool;
    const minDailymotionPool = this.config.minGalleryDailymotionPool;

    // STEP 1: Try cache first
    let cachedLinks = await this._getCachedLinks(this.config.contentCategoryShorts);
    
    this._logDebug(`Cache returned ${cachedLinks.length} links`);

    // STEP 2: Count each platform separately (CRITICAL for selective fetching)
    const youtubeCount = cachedLinks.filter(l => l.platform === this.config.platformYouTube).length;
    const vimeoCount = cachedLinks.filter(l => l.platform === this.config.platformVimeo).length;
    const dailymotionCount = cachedLinks.filter(l => l.platform === this.config.platformDailymotion).length;

    const isYoutubePoolSufficient = youtubeCount >= minYoutubePool;
    const isVimeoPoolSufficient = vimeoCount >= minVimeoPool;
    const isDailymotionPoolSufficient = dailymotionCount >= minDailymotionPool;
    const allPlatformsSufficient = isYoutubePoolSufficient && isVimeoPoolSufficient && isDailymotionPoolSufficient;

    this._logDebug(
      `🎬 Multi-platform cache: ` +
      `YouTube: ${youtubeCount}/${minYoutubePool} ${isYoutubePoolSufficient ? '✅' : '❌'}, ` +
      `Vimeo: ${vimeoCount}/${minVimeoPool} ${isVimeoPoolSufficient ? '✅' : '❌'}, ` +
      `Dailymotion: ${dailymotionCount}/${minDailymotionPool} ${isDailymotionPoolSufficient ? '✅' : '❌'}`
    );

    // STEP 3: Selective platform fetching (KEY QUOTA SAVER)
    if (forceRefresh && !allPlatformsSufficient) {
      const insufficientPlatforms = [];
      if (!isYoutubePoolSufficient) insufficientPlatforms.push('YouTube');
      if (!isVimeoPoolSufficient) insufficientPlatforms.push('Vimeo');
      if (!isDailymotionPoolSufficient) insufficientPlatforms.push('Dailymotion');

      this._logDebug(
        `🔄 Gallery refresh + insufficient platforms [${insufficientPlatforms.join(', ')}] - selective fetching...`
      );

      const newLinks = [];

      // Fetch only from insufficient platforms
      if (!isYoutubePoolSufficient) {
        const ytLinks = await this.service.fetchYouTubeShortsOnly();
        newLinks.push(...ytLinks);
        this._logDebug(`📊 Fetched ${ytLinks.length} YouTube shorts to replenish pool`);
      }

      if (!isVimeoPoolSufficient) {
        const vimeoLinks = await this.service.fetchVimeoShortsOnly();
        newLinks.push(...vimeoLinks);
        this._logDebug(`📊 Fetched ${vimeoLinks.length} Vimeo shorts to replenish pool`);
      }

      if (!isDailymotionPoolSufficient) {
        const dmLinks = await this.service.fetchDailymotionShortsOnly();
        newLinks.push(...dmLinks);
        this._logDebug(`📊 Fetched ${dmLinks.length} Dailymotion shorts to replenish pool`);
      }

      // STEP 4: Merge new content with existing cache (NOT replacing)
      const mergedLinks = [...cachedLinks, ...newLinks];
      this._logDebug(
        `✅ Selective fetch: ${newLinks.length} new + ${cachedLinks.length} cached = ${mergedLinks.length} total`
      );

      // Cache the merged results
      if (newLinks.length > 0) {
        await this._saveCachedLinks(this.config.contentCategoryShorts, mergedLinks, this.config.shortsCacheDuration);
      }

      return this._filterDislikedLinks(mergedLinks);
    } else if (forceRefresh && allPlatformsSufficient) {
      this._logDebug(
        `♻️ Gallery refresh but all platforms sufficient - reusing cache (0 API calls)`
      );
      this._logDebug(
        `💰 Quota saved - Pool extras: YouTube +${youtubeCount - this.config.galleryYoutubeSlots}, ` +
        `Vimeo +${vimeoCount - this.config.galleryVimeoSlots}, ` +
        `Dailymotion +${dailymotionCount - this.config.galleryDailymotionSlots}`
      );
      return this._filterDislikedLinks(cachedLinks);
    }

    // Not a force refresh - return cache if available
    if (cachedLinks.length > 0) {
      return this._filterDislikedLinks(cachedLinks);
    }

    // No cache - fetch fresh content
    this._logDebug('No cache - fetching Gallery Wall content...');
    const freshLinks = await this._fetchAllShortsplatforms();
    return this._filterDislikedLinks(freshLinks);
  }

  // ============================================================================
  // SMALL STAGE (Music Audio - 30 slots)
  // Target: 9 YouTube Music, 7 Spotify, 7 Deezer, 7 SoundCloud
  // ============================================================================

  /**
   * Get links for Small Stage (music audio tracks)
   * @param {boolean} forceRefresh - Force fetch new content
   * @returns {Promise<Array>} Array of LinkObjects
   */
  async getSmallStageLinks(forceRefresh = false) {
    this._logDebug(`getSmallStageLinks() called (forceRefresh: ${forceRefresh})`);

    const minYoutubePool = this.config.minStageYoutubePool;
    const minSpotifyPool = this.config.minStageSpotifyPool;
    const minDeezerPool = this.config.minStageDeezerPool;
    const minSoundCloudPool = this.config.minStageSoundCloudPool;

    // STEP 1: Try cache first
    let cachedLinks = await this._getCachedLinks(this.config.contentCategoryMusic);

    // STEP 2: Count each platform separately
    const youtubeCount = cachedLinks.filter(l => l.platform === this.config.platformYouTube).length;
    const spotifyCount = cachedLinks.filter(l => l.platform === this.config.platformSpotify).length;
    const deezerCount = cachedLinks.filter(l => l.platform === this.config.platformDeezer).length;
    const soundcloudCount = cachedLinks.filter(l => l.platform === this.config.platformSoundCloud).length;

    const isYoutubePoolSufficient = youtubeCount >= minYoutubePool;
    const isSpotifyPoolSufficient = spotifyCount >= minSpotifyPool;
    const isDeezerPoolSufficient = deezerCount >= minDeezerPool;
    const isSoundCloudPoolSufficient = soundcloudCount >= minSoundCloudPool;
    const allPlatformsSufficient = 
      isYoutubePoolSufficient && 
      isSpotifyPoolSufficient && 
      isDeezerPoolSufficient && 
      isSoundCloudPoolSufficient;

    this._logDebug(
      `🎬 Multi-platform cache: ` +
      `YouTube: ${youtubeCount}/${minYoutubePool} ${isYoutubePoolSufficient ? '✅' : '❌'}, ` +
      `Spotify: ${spotifyCount}/${minSpotifyPool} ${isSpotifyPoolSufficient ? '✅' : '❌'}, ` +
      `Deezer: ${deezerCount}/${minDeezerPool} ${isDeezerPoolSufficient ? '✅' : '❌'}, ` +
      `SoundCloud: ${soundcloudCount}/${minSoundCloudPool} ${isSoundCloudPoolSufficient ? '✅' : '❌'}`
    );

    // STEP 3: Selective platform fetching
    if (forceRefresh && !allPlatformsSufficient) {
      const insufficientPlatforms = [];
      if (!isYoutubePoolSufficient) insufficientPlatforms.push('YouTube');
      if (!isSpotifyPoolSufficient) insufficientPlatforms.push('Spotify');
      if (!isDeezerPoolSufficient) insufficientPlatforms.push('Deezer');
      if (!isSoundCloudPoolSufficient) insufficientPlatforms.push('SoundCloud');

      this._logDebug(
        `🔄 Small Stage refresh + insufficient platforms [${insufficientPlatforms.join(', ')}] - selective fetching...`
      );

      const newLinks = [];

      if (!isYoutubePoolSufficient) {
        const ytLinks = await this.service.fetchYouTubeMusicAudioOnly();
        newLinks.push(...ytLinks);
        this._logDebug(`📊 Fetched ${ytLinks.length} YouTube Music tracks to replenish pool`);
      }

      if (!isSpotifyPoolSufficient) {
        const spotifyLinks = await this.service.fetchSpotifyTracksOnly();
        newLinks.push(...spotifyLinks);
        this._logDebug(`📊 Fetched ${spotifyLinks.length} Spotify tracks to replenish pool`);
      }

      if (!isDeezerPoolSufficient) {
        const deezerLinks = await this.service.fetchDeezerTracksOnly();
        newLinks.push(...deezerLinks);
        this._logDebug(`📊 Fetched ${deezerLinks.length} Deezer tracks to replenish pool`);
      }

      if (!isSoundCloudPoolSufficient) {
        const scLinks = await this.service.fetchSoundCloudTracksOnly();
        newLinks.push(...scLinks);
        this._logDebug(`📊 Fetched ${scLinks.length} SoundCloud tracks to replenish pool`);
      }

      // Merge new content with existing cache
      const mergedLinks = [...cachedLinks, ...newLinks];
      this._logDebug(
        `✅ Selective fetch: ${newLinks.length} new tracks + ${cachedLinks.length} cached = ${mergedLinks.length} total`
      );

      // Cache the merged results
      if (newLinks.length > 0) {
        await this._saveCachedLinks(this.config.contentCategoryMusic, mergedLinks, this.config.musicCacheDuration);
      }

      return this._filterDislikedLinks(mergedLinks);
    } else if (forceRefresh && allPlatformsSufficient) {
      this._logDebug(
        `♻️ Small Stage refresh but all platforms sufficient - reusing cache (0 API calls)`
      );
      return this._filterDislikedLinks(cachedLinks);
    }

    // Not a force refresh - return cache if available
    if (cachedLinks.length > 0) {
      return this._filterDislikedLinks(cachedLinks);
    }

    // No cache - fetch fresh content
    this._logDebug('No cache - fetching Small Stage content...');
    const freshLinks = await this._fetchAllMusicPlatforms();
    return this._filterDislikedLinks(freshLinks);
  }

  // ============================================================================
  // RISER (Music Videos - 15 slots)
  // Target: 10 YouTube, 3 Vimeo, 2 Dailymotion
  // ============================================================================

  /**
   * Get links for Riser (music videos)
   * @param {boolean} forceRefresh - Force fetch new content
   * @returns {Promise<Array>} Array of LinkObjects
   */
  async getRiserLinks(forceRefresh = false) {
    this._logDebug(`getRiserLinks() called (forceRefresh: ${forceRefresh})`);

    const minYoutubePool = this.config.minRiserYoutubePool;
    const minVimeoPool = this.config.minRiserVimeoPool;
    const minDailymotionPool = this.config.minRiserDailymotionPool;

    // Similar logic to Gallery Wall but for music videos
    let cachedLinks = await this._getCachedLinks(this.config.contentCategoryMusicVideos);

    const youtubeCount = cachedLinks.filter(l => l.platform === this.config.platformYouTube).length;
    const vimeoCount = cachedLinks.filter(l => l.platform === this.config.platformVimeo).length;
    const dailymotionCount = cachedLinks.filter(l => l.platform === this.config.platformDailymotion).length;

    const isYoutubePoolSufficient = youtubeCount >= minYoutubePool;
    const isVimeoPoolSufficient = vimeoCount >= minVimeoPool;
    const isDailymotionPoolSufficient = dailymotionCount >= minDailymotionPool;
    const allPlatformsSufficient = isYoutubePoolSufficient && isVimeoPoolSufficient && isDailymotionPoolSufficient;

    this._logDebug(
      `🎬 Multi-platform cache: ` +
      `YouTube: ${youtubeCount}/${minYoutubePool} ${isYoutubePoolSufficient ? '✅' : '❌'}, ` +
      `Vimeo: ${vimeoCount}/${minVimeoPool} ${isVimeoPoolSufficient ? '✅' : '❌'}, ` +
      `Dailymotion: ${dailymotionCount}/${minDailymotionPool} ${isDailymotionPoolSufficient ? '✅' : '❌'}`
    );

    // Selective fetching logic
    if (forceRefresh && !allPlatformsSufficient) {
      const newLinks = [];

      if (!isYoutubePoolSufficient) {
        const ytLinks = await this.service.fetchYouTubeMusicVideosOnly();
        newLinks.push(...ytLinks);
        this._logDebug(`📊 Fetched ${ytLinks.length} YouTube music videos to replenish pool`);
      }

      if (!isVimeoPoolSufficient) {
        const vimeoLinks = await this.service.fetchVimeoMusicVideosOnly();
        newLinks.push(...vimeoLinks);
        this._logDebug(`📊 Fetched ${vimeoLinks.length} Vimeo music videos to replenish pool`);
      }

      if (!isDailymotionPoolSufficient) {
        const dmLinks = await this.service.fetchDailymotionMusicVideosOnly();
        newLinks.push(...dmLinks);
        this._logDebug(`📊 Fetched ${dmLinks.length} Dailymotion music videos to replenish pool`);
      }

      const mergedLinks = [...cachedLinks, ...newLinks];
      
      if (newLinks.length > 0) {
        await this._saveCachedLinks(this.config.contentCategoryMusicVideos, mergedLinks, this.config.videoCacheDuration);
      }

      return this._filterDislikedLinks(mergedLinks);
    } else if (forceRefresh && allPlatformsSufficient) {
      this._logDebug(`♻️ Riser refresh but all platforms sufficient - reusing cache (0 API calls)`);
      return this._filterDislikedLinks(cachedLinks);
    }

    if (cachedLinks.length > 0) {
      return this._filterDislikedLinks(cachedLinks);
    }

    this._logDebug('No cache - fetching Riser content...');
    const freshLinks = await this._fetchAllMusicVideoPlatforms();
    return this._filterDislikedLinks(freshLinks);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get cached links for a content type
   */
  async _getCachedLinks(contentType) {
    const cached = await this.storage.getCachedRecommendation(contentType);
    
    if (cached && cached.contentJson) {
      try {
        return JSON.parse(cached.contentJson);
      } catch (e) {
        this._logError(`Error parsing cached links for ${contentType}:`, e);
        return [];
      }
    }
    
    return [];
  }

  /**
   * Save links to cache
   */
  async _saveCachedLinks(contentType, links, cacheDurationHours) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + cacheDurationHours * 60 * 60 * 1000);

    const cached = {
      id: contentType,
      contentType: contentType,
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      contentJson: JSON.stringify(links)
    };

    await this.storage.saveCachedRecommendation(cached);
    this._logDebug(`💾 Cached ${links.length} links for ${contentType} (expires in ${cacheDurationHours}h)`);
  }

  /**
   * Fetch all shorts platforms (for initial load)
   */
  async _fetchAllShortsPlatforms() {
    const links = [];
    
    if (this.config.enableYouTubeContent) {
      const ytLinks = await this.service.fetchYouTubeShortsOnly();
      links.push(...ytLinks);
    }
    
    if (this.config.enableVimeoContent) {
      const vimeoLinks = await this.service.fetchVimeoShortsOnly();
      links.push(...vimeoLinks);
    }
    
    if (this.config.enableDailymotionContent) {
      const dmLinks = await this.service.fetchDailymotionShortsOnly();
      links.push(...dmLinks);
    }
    
    // Cache the results
    if (links.length > 0) {
      await this._saveCachedLinks(this.config.contentCategoryShorts, links, this.config.shortsCacheDuration);
    }
    
    return links;
  }

  /**
   * Fetch all music platforms (for initial load)
   */
  async _fetchAllMusicPlatforms() {
    const links = [];
    
    if (this.config.enableYouTubeContent) {
      const ytLinks = await this.service.fetchYouTubeMusicAudioOnly();
      links.push(...ytLinks);
    }
    
    if (this.config.enableSpotifyPublicPlaylists) {
      const spotifyLinks = await this.service.fetchSpotifyTracksOnly();
      links.push(...spotifyLinks);
    }
    
    if (this.config.enableDeezerContent) {
      const deezerLinks = await this.service.fetchDeezerTracksOnly();
      links.push(...deezerLinks);
    }
    
    if (this.config.enableSoundCloudContent) {
      const scLinks = await this.service.fetchSoundCloudTracksOnly();
      links.push(...scLinks);
    }
    
    // Cache the results
    if (links.length > 0) {
      await this._saveCachedLinks(this.config.contentCategoryMusic, links, this.config.musicCacheDuration);
    }
    
    return links;
  }

  /**
   * Fetch all music video platforms (for initial load)
   */
  async _fetchAllMusicVideoPlatforms() {
    const links = [];
    
    if (this.config.enableYouTubeContent) {
      const ytLinks = await this.service.fetchYouTubeMusicVideosOnly();
      links.push(...ytLinks);
    }
    
    if (this.config.enableVimeoContent) {
      const vimeoLinks = await this.service.fetchVimeoMusicVideosOnly();
      links.push(...vimeoLinks);
    }
    
    if (this.config.enableDailymotionContent) {
      const dmLinks = await this.service.fetchDailymotionMusicVideosOnly();
      links.push(...dmLinks);
    }
    
    // Cache the results
    if (links.length > 0) {
      await this._saveCachedLinks(this.config.contentCategoryMusicVideos, links, this.config.videoCacheDuration);
    }
    
    return links;
  }

  /**
   * Filter out disliked content from a list of links
   * @param {Array} links - Array of LinkObjects
   * @returns {Array} Filtered array without disliked content
   */
  _filterDislikedLinks(links) {
    let filtered = links;
    let totalRemoved = 0;

    // STEP 1: Filter by URL-based dislikes (MediaFeedbackManager)
    if (window.mediaFeedback) {
      const feedbackService = window.mediaFeedback;
      const dislikedUrls = feedbackService.getDislikedUrls();
      
      if (dislikedUrls.length > 0) {
        this._logDebug(`🔍 URL Filter: ${filtered.length} links vs ${dislikedUrls.length} disliked URLs`);
        
        const urlFiltered = filtered.filter(link => {
          const linkUrl = link.url || link.path || link;
          const isDisliked = feedbackService.isDisliked(linkUrl);
          if (isDisliked) {
            this._logDebug(`👎 FILTERED (URL): "${link.title || linkUrl}"`);
          }
          return !isDisliked;
        });
        
        const urlRemoved = filtered.length - urlFiltered.length;
        if (urlRemoved > 0) {
          this._logDebug(`🚫 URL filter removed ${urlRemoved} item(s)`);
          totalRemoved += urlRemoved;
        }
        filtered = urlFiltered;
      }
    } else {
      this._logDebug('⚠️ MediaFeedbackManager not available');
    }

    // STEP 2: Filter by learned preferences (ContentPreferenceLearningService)
    if (window.contentPreferenceLearningService && window.contentPreferenceLearningService.initialized) {
      const preferenceService = window.contentPreferenceLearningService;
      this._logDebug(`🧠 Preference Filter: Checking ${filtered.length} links against learned patterns`);
      
      const preferenceFiltered = [];
      let preferenceRemoved = 0;

      for (const link of filtered) {
        try {
          // Parse metadata from link (stored as JSON string)
          const metadata = link.metadata ? JSON.parse(link.metadata) : {};
          const filterResult = preferenceService.shouldFilterContent(metadata);

          if (!filterResult.shouldFilter) {
            preferenceFiltered.push(link);
          } else {
            preferenceRemoved++;
            this._logDebug(`🔇 FILTERED (Preference): "${link.title}" - ${filterResult.reason}`);
          }
        } catch (e) {
          // If metadata parsing fails, include the link
          preferenceFiltered.push(link);
        }
      }

      if (preferenceRemoved > 0) {
        this._logDebug(`🚫 Preference filter removed ${preferenceRemoved} item(s)`);
        totalRemoved += preferenceRemoved;
      }
      filtered = preferenceFiltered;
    } else {
      this._logDebug('⚠️ ContentPreferenceLearningService not available or not initialized');
    }

    if (totalRemoved > 0) {
      this._logDebug(`✅ Total filtered: ${totalRemoved} items (${links.length} → ${filtered.length})`);
    }
    
    return filtered;
  }

  /**
   * Debug logging
   */
  _logDebug(message) {
    console.log(`[RecommendationContentManager] ${message}`);
  }

  /**
   * Error logging
   */
  _logError(message, error = null) {
    if (error) {
      console.error(`[RecommendationContentManager] ❌ ${message}`, error);
    } else {
      console.error(`[RecommendationContentManager] ❌ ${message}`);
    }
  }
}

// Create singleton instance
const recommendationContentManager = new RecommendationContentManager();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = recommendationContentManager;
}

// Make available globally
window.RecommendationContentManager = RecommendationContentManager;
window.recommendationContentManager = recommendationContentManager;

console.log('✅ RecommendationContentManager loaded');
