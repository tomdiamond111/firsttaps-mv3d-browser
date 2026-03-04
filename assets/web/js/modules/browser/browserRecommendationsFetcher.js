/**
 * BROWSER RECOMMENDATIONS FETCHER
 * 
 * Fetches remote config from GitHub Pages and populates window.DART_RECOMMENDATIONS
 * This replicates the Flutter/Dart recommendation system for browser-only mode
 * 
 * Remote Config URL: https://tomdiamond111.github.io/firsttaps-app-config/config.json
 * Cache Duration: 6 hours (matching mobile app)
 */

(function() {
    'use strict';

    console.log('🌐 Loading Browser Recommendations Fetcher...');

    class BrowserRecommendationsFetcher {
        constructor() {
            this.configUrl = 'https://tomdiamond111.github.io/firsttaps-app-config/config.json';
            this.cacheKey = 'browser_remote_config_cache';
            this.cacheTimestampKey = 'browser_remote_config_timestamp';
            this.cacheExpiry = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
            
            // Vimeo API configuration
            this.vimeoAccessToken = '0fa39fb74f07bfe8453358466360d387';
            this.vimeoApiBaseUrl = 'https://api.vimeo.com';
            
            // Store fetched Vimeo content
            this.vimeoStaffPicksUrls = [];
        }

        /**
         * Get remote config (from cache or fetch fresh)
         * @param {boolean} forceRefresh - Force fetch from remote
         * @returns {Promise<Object>} Config object
         */
        async getConfig(forceRefresh = false) {
            console.log(`🌐 Getting remote config (forceRefresh: ${forceRefresh})...`);

            // Check cache first (unless force refresh)
            if (!forceRefresh) {
                const cached = this.getCachedConfig();
                if (cached) {
                    console.log('✅ Using cached remote config');
                    return cached;
                }
            }

            // Fetch from remote
            return await this.fetchRemoteConfig();
        }

        /**
         * Get cached config if still valid
         * @returns {Object|null} Cached config or null
         */
        getCachedConfig() {
            try {
                const timestamp = localStorage.getItem(this.cacheTimestampKey);
                if (!timestamp) {
                    console.log('📦 No cache timestamp found');
                    return null;
                }

                const age = Date.now() - parseInt(timestamp);
                if (age > this.cacheExpiry) {
                    console.log(`📦 Cache expired (age: ${Math.floor(age / 60000)} minutes)`);
                    return null;
                }

                const cached = localStorage.getItem(this.cacheKey);
                if (!cached) {
                    console.log('📦 No cached config found');
                    return null;
                }

                const config = JSON.parse(cached);
                console.log(`📦 Cache valid (age: ${Math.floor(age / 60000)} minutes, version: ${config.version || 'unknown'})`);
                return config;
            } catch (e) {
                console.warn('⚠️ Error reading cache:', e);
                return null;
            }
        }

        /**
         * Fetch config from GitHub Pages
         * @returns {Promise<Object>} Config object
         */
        async fetchRemoteConfig() {
            try {
                console.log(`🌐 Fetching remote config from: ${this.configUrl}`);
                
                const response = await fetch(this.configUrl, {
                    method: 'GET',
                    cache: 'no-cache', // Always get fresh from server
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const config = await response.json();
                console.log('✅ Remote config fetched successfully');
                console.log(`   Version: ${config.version || 'unknown'}`);
                console.log(`   Last updated: ${config.last_updated || 'unknown'}`);

                // Validate config structure
                if (!this.isValidConfig(config)) {
                    console.warn('⚠️ Invalid config structure');
                    throw new Error('Invalid config structure');
                }

                // Cache the config
                this.cacheConfig(config);

                return config;
            } catch (error) {
                console.error('❌ Failed to fetch remote config:', error);
                throw error;
            }
        }

        /**
         * Validate config structure
         * @param {Object} config - Config object
         * @returns {boolean} True if valid
         */
        isValidConfig(config) {
            // Check for required keys
            const requiredKeys = ['version', 'last_updated'];
            for (const key of requiredKeys) {
                if (!config.hasOwnProperty(key)) {
                    console.warn(`⚠️ Missing required key: ${key}`);
                    return false;
                }
            }

            // Check for at least one content array
            const contentKeys = [
                'youtube_trending_video_ids',
                'tiktok_trending_urls',
                'instagram_reel_urls',
                'vimeo_shorts_urls',
                'spotify_trending_urls',
                'soundcloud_trending_urls',
                'deezer_trending_urls'
            ];

            const hasContent = contentKeys.some(key => config[key] && Array.isArray(config[key]));
            if (!hasContent) {
                console.warn('⚠️ No content arrays found in config');
                return false;
            }

            return true;
        }

        /**
         * Cache config to localStorage
         * @param {Object} config - Config object
         */
        cacheConfig(config) {
            try {
                localStorage.setItem(this.cacheKey, JSON.stringify(config));
                localStorage.setItem(this.cacheTimestampKey, Date.now().toString());
                console.log('💾 Remote config cached');
            } catch (e) {
                console.warn('⚠️ Failed to cache config:', e);
            }
        }

        /**
         * Build DART_RECOMMENDATIONS from remote config and API data
         * @param {Object} config - Remote config object
         * @returns {Object} DART_RECOMMENDATIONS object
         */
        buildDartRecommendations(config) {
            console.log('🔨 Building DART_RECOMMENDATIONS from remote config and API data...');

            const recommendations = {};

            // GALLERY WALL: Mix of video platforms (YouTube, TikTok, Instagram, Vimeo, Dailymotion)
            const galleryLinks = [];
            
            // YouTube (4 links - 40%)
            const youtubeIds = config.youtube_trending_video_ids || [];
            for (let i = 0; i < Math.min(4, youtubeIds.length); i++) {
                galleryLinks.push(`https://www.youtube.com/watch?v=${youtubeIds[i]}`);
            }

            // TikTok (2 links - 20%)
            const tiktokUrls = config.tiktok_trending_urls || [];
            for (let i = 0; i < Math.min(2, tiktokUrls.length); i++) {
                galleryLinks.push(tiktokUrls[i]);
            }

            // Instagram (1 link - 10%)
            const instaUrls = config.instagram_reel_urls || [];
            if (instaUrls.length > 0) {
                galleryLinks.push(instaUrls[0]);
            }

            // Vimeo (2 links - 20%) - Use API-fetched Staff Picks OR config fallback
            const vimeoUrls = this.vimeoStaffPicksUrls.length > 0 
                ? this.vimeoStaffPicksUrls 
                : (config.vimeo_shorts_urls || []);
            
            if (this.vimeoStaffPicksUrls.length > 0) {
                console.log('   🎬 Using Vimeo Staff Picks from API');
            } else {
                console.log('   🎬 Using Vimeo URLs from config (API fallback)');
            }
            
            for (let i = 0; i < Math.min(2, vimeoUrls.length); i++) {
                galleryLinks.push(vimeoUrls[i]);
            }

            // Dailymotion (1 link - 10%)
            const dailymotionUrls = config.dailymotion_trending_urls || [];
            if (dailymotionUrls.length > 0) {
                galleryLinks.push(dailymotionUrls[0]);
            }

            recommendations.topHitsMix = {
                furnitureType: 'gallery_wall',
                title: 'Top Hits Mix',
                links: galleryLinks
            };

            console.log(`   ✅ Gallery Wall: ${galleryLinks.length} links`);

            // RISER: Music videos from YouTube, Vimeo, Dailymotion (target: 9 YT + 3 Vimeo + 3 Dailymotion = 15 total)
            const riserLinks = [];

            // YouTube Music Videos (9 links - 60%)
            const youtubeIdsForRiser = config.youtube_trending_video_ids || [];
            for (let i = 0; i < Math.min(9, youtubeIdsForRiser.length); i++) {
                riserLinks.push(`https://www.youtube.com/watch?v=${youtubeIdsForRiser[i]}`);
            }

            // Vimeo Music Videos (3 links - 20%) - Use API-fetched Staff Picks OR config fallback
            const vimeoUrlsForRiser = this.vimeoStaffPicksUrls.length > 0 
                ? this.vimeoStaffPicksUrls 
                : (config.vimeo_shorts_urls || []);
            for (let i = 0; i < Math.min(3, vimeoUrlsForRiser.length); i++) {
                riserLinks.push(vimeoUrlsForRiser[i]);
            }

            // Dailymotion Music Videos (3 links - 20%)
            const dailymotionUrlsForRiser = config.dailymotion_trending_urls || [];
            for (let i = 0; i < Math.min(3, dailymotionUrlsForRiser.length); i++) {
                riserLinks.push(dailymotionUrlsForRiser[i]);
            }

            recommendations.chillVibes = {
                furnitureType: 'riser',
                title: 'Chill Vibes',
                links: riserLinks
            };

            console.log(`   ✅ Riser (Music Videos): ${riserLinks.length} links`);

            // SMALL STAGE: Audio tracks from YouTube Music, Spotify, SoundCloud, Deezer (target: ~30 total)
            const stageLinks = [];

            // YouTube Music Audio (10 links - using same video IDs but for audio playback)
            const youtubeIdsForStage = config.youtube_trending_video_ids || [];
            for (let i = 0; i < Math.min(10, youtubeIdsForStage.length); i++) {
                stageLinks.push(`https://www.youtube.com/watch?v=${youtubeIdsForStage[i]}`);
            }

            // Spotify (10 links)
            const spotifyUrls = config.spotify_trending_urls || [];
            const spotifyCount = Math.min(10, spotifyUrls.length);
            for (let i = 0; i < spotifyCount; i++) {
                // Strip genre prefix if present (e.g., "P:https://..." → "https://...")
                let url = spotifyUrls[i];
                if (url.includes(':http')) {
                    url = url.substring(url.indexOf(':') + 1);
                }
                stageLinks.push(url);
            }

            // SoundCloud (5 links)
            const soundcloudUrls = config.soundcloud_trending_urls || [];
            const soundcloudCount = Math.min(5, soundcloudUrls.length);
            for (let i = 0; i < soundcloudCount; i++) {
                stageLinks.push(soundcloudUrls[i]);
            }

            // Deezer (5 links)
            const deezerUrls = config.deezer_trending_urls || [];
            const deezerCount = Math.min(5, deezerUrls.length);
            for (let i = 0; i < deezerCount; i++) {
                stageLinks.push(deezerUrls[i]);
            }

            recommendations.shortsAndReels = {
                furnitureType: 'stage_small',
                title: 'Music Tracks',
                links: stageLinks
            };

            console.log(`   ✅ Small Stage (Music Tracks): ${stageLinks.length} links`);

            console.log('✅ DART_RECOMMENDATIONS built successfully');
            return recommendations;
        }

        /**
         * Fetch Vimeo Staff Picks from API
         * @param {number} maxResults - Maximum number of videos to fetch
         * @returns {Promise<string[]>} Array of Vimeo URLs
         */
        async fetchVimeoStaffPicks(maxResults = 50) {
            try {
                console.log('🎬 [VIMEO] Fetching Staff Picks from API...');
                
                const apiUrl = `${this.vimeoApiBaseUrl}/channels/staffpicks/videos?per_page=${maxResults}&fields=uri,link&filter=featured&sort=date`;
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.vimeoAccessToken}`,
                        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
                    },
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });

                if (!response.ok) {
                    throw new Error(`Vimeo API returned ${response.status}`);
                }

                const data = await response.json();
                const videos = data.data || [];
                
                console.log(`🎬 [VIMEO] API returned ${videos.length} Staff Picks`);
                
                // Extract video URLs
                const urls = videos.map(video => {
                    const uri = video.uri || '';
                    const videoId = uri.split('/').pop();
                    return `https://vimeo.com/${videoId}`;
                }).filter(url => url !== 'https://vimeo.com/');
                
                // Shuffle to get variety
                const shuffled = urls.sort(() => Math.random() - 0.5);
                
                console.log(`🎬 [VIMEO] Extracted ${shuffled.length} URLs from Staff Picks`);
                return shuffled;
                
            } catch (error) {
                console.warn('⚠️ [VIMEO] Staff Picks API failed:', error.message);
                console.log('   Will fall back to config URLs');
                return [];
            }
        }

        /**
         * Initialize and populate window.DART_RECOMMENDATIONS
         * @param {boolean} forceRefresh - Force fetch from remote
         * @returns {Promise<boolean>} Success
         */
        async initialize(forceRefresh = false) {
            try {
                console.log('🚀 Initializing browser recommendations...');

                // Get config (from cache or remote)
                const config = await this.getConfig(forceRefresh);
                
                // Fetch Vimeo Staff Picks from API (non-blocking fallback to config)
                this.vimeoStaffPicksUrls = await this.fetchVimeoStaffPicks(50);

                // Build DART_RECOMMENDATIONS
                const recommendations = this.buildDartRecommendations(config);

                // Populate window.DART_RECOMMENDATIONS
                window.DART_RECOMMENDATIONS = recommendations;

                console.log('✨ window.DART_RECOMMENDATIONS populated!');
                console.log(`   Gallery Wall: ${recommendations.topHitsMix?.links.length || 0} links`);
                console.log(`   Riser: ${recommendations.chillVibes?.links.length || 0} links`);
                console.log(`   Small Stage: ${recommendations.shortsAndReels?.links.length || 0} links`);

                return true;
            } catch (error) {
                console.error('❌ Failed to initialize recommendations:', error);
                console.log('⚠️ Falling back to hardcoded content');
                
                // Set empty object so defaultFurnitureSpawner knows we tried
                window.DART_RECOMMENDATIONS = {};
                return false;
            }
        }
    }

    // Create global instance
    window.BrowserRecommendationsFetcher = BrowserRecommendationsFetcher;
    window.browserRecommendationsFetcher = new BrowserRecommendationsFetcher();

    console.log('✅ Browser Recommendations Fetcher ready');
})();
