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
            
            // Cloudflare Worker proxy (keeps API keys hidden server-side)
            // API keys are stored as Worker secrets - never exposed to client
            this.workerBaseUrl = 'https://firsttaps-paste.firsttaps.workers.dev';
            
            // Dailymotion API configuration  
            this.dailymotionApiBaseUrl = 'https://api.dailymotion.com';
            
            // Store fetched API content (pool)
            this.youtubeShorts = [];
            this.vimeoStaffPicksUrls = [];
            this.dailymotionTrendingUrls = [];
            this.dailymotionShortsUrls = [];
            
            // Content pool cache keys
            this.poolCacheKey = 'browser_content_pool';
            this.poolTimestampKey = 'browser_content_pool_timestamp';
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
         * Fetch YouTube Music Videos from API for Gallery Wall
         * Uses videos endpoint with chart + Music category (videoCategoryId=10)
         * MULTI-REGION STRATEGY: Fetches from US (trending), CA (mostPopular), GB (mostPopular)
         * This provides more diverse content than single-region mostPopular  
         * Mobile app ref: recommendation_service.dart _fetchYouTubeShorts() line 237
         * @param {number} maxResults - Number of videos to fetch PER REGION (will fetch 3x this amount total)
         * @returns {Promise<Array<string>>} Array of YouTube URLs
         */
        async fetchYouTubeShorts(maxResults = 50) {
            try {
                console.log(`📺 [YOUTUBE MULTI-REGION] Fetching music videos from US, CA, GB regions...`);
                
                // Fetch from 3 regions in parallel for diversity
                // US: Trending (more diverse than mostPopular) - REDUCED 30% to minimize hip hop
                // CA: MostPopular (English content, less hip-hop heavy than US) - INCREASED 30%
                // GB: MostPopular (English content, indie/rock/pop focus) - INCREASED 30%
                // This balances API quota usage while reducing hip hop saturation
                const regionPromises = [
                    this._fetchYouTubeShortsRegion('US', 'trending', Math.floor(maxResults * 0.7)),
                    this._fetchYouTubeShortsRegion('CA', 'mostPopular', Math.floor(maxResults * 1.3)),
                    this._fetchYouTubeShortsRegion('GB', 'mostPopular', Math.floor(maxResults * 1.3))
                ];
                
                const regionResults = await Promise.all(regionPromises);
                
                // Combine results from all regions
                const allVideos = [
                    ...regionResults[0], // US trending
                    ...regionResults[1], // CA mostPopular
                    ...regionResults[2]  // GB mostPopular
                ];
                
                console.log(`📺 [YOUTUBE MULTI-REGION] Combined ${allVideos.length} videos from 3 regions`);
                console.log(`   US (trending): ${regionResults[0].length} videos`);
                console.log(`   CA (mostPopular): ${regionResults[1].length} videos`);
                console.log(`   GB (mostPopular): ${regionResults[2].length} videos`);
                
                // Deduplicate by video ID (in case same video appears in multiple regions)
                const uniqueUrls = [...new Set(allVideos)];
                console.log(`📺 [YOUTUBE MULTI-REGION] Deduplicated to ${uniqueUrls.length} unique videos`);
                
                return uniqueUrls;
                
            } catch (error) {
                console.error('❌ [YOUTUBE MULTI-REGION] Fetch failed:', error.message);
                return [];
            }
        }

        /**
         * Fetch YouTube Music Videos from a specific region
         * Internal method called by fetchYouTubeShorts
         * @param {string} regionCode - Region code (US, CA, GB, etc.)
         * @param {string} chart - Chart type (trending or mostPopular)
         * @param {number} maxResults - Number of videos to fetch
         * @returns {Promise<Array<string>>} Array of YouTube URLs
         */
        async _fetchYouTubeShortsRegion(regionCode, chart, maxResults) {
            try {
                console.log(`📺 [YOUTUBE ${regionCode}] Fetching ${maxResults} videos (chart=${chart})...`);
                
                // Call Cloudflare Worker proxy with region and chart parameters
                const url = `${this.workerBaseUrl}/api/youtube/shorts?maxResults=${maxResults}&regionCode=${regionCode}&chart=${chart}`;
                
                console.log(`📺 [YOUTUBE ${regionCode}] Calling: ${url}`);
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    console.error(`❌ YouTube ${regionCode} error: ${response.status} ${response.statusText}`);
                    return [];
                }
                
                const data = await response.json();
                const videos = data.items || [];
                
                console.log(`📺 [YOUTUBE ${regionCode}] Received ${videos.length} videos from API`);
                
                // Extract video URLs from videos endpoint with validation
                // Apply filtering in order: basic validation → preference learning → genre prefs → oEmbed
                const videoPromises = videos.map(async video => {
                    if (!video.id || typeof video.id !== 'string') return null;
                    
                    const snippet = video.snippet || {};
                    const channelTitle = snippet.channelTitle || '';
                    const title = snippet.title || '';
                    const videoId = video.id;
                    
                    // Check 1: Must have valid thumbnail URLs
                    const thumbnails = snippet.thumbnails || {};
                    if (!thumbnails.default?.url || !thumbnails.medium?.url || !thumbnails.high?.url) {
                        return null;
                    }
                    
                    // Check 2: Filter live broadcasts
                    if (snippet.liveBroadcastContent && snippet.liveBroadcastContent !== 'none') {
                        return null;
                    }
                    
                    // Check 3: Skip "Topic" channels (audio-only)
                    if (channelTitle.includes(' - Topic') || title.includes('(Official Audio)')) {
                        return null;
                    }
                    
                    // Check 4: Filter non-music channels (studios, game companies)
                    const nonMusicChannels = [
                        'PlayStation', 'Warner Bros', 'Paramount Pictures', 'Prime Video',
                        'Netflix', 'Marvel', 'Universal Pictures', 'Disney',
                        'Epic Games', 'IGN', 'GameSpot', 'ScreenCrush'
                    ];
                    if (nonMusicChannels.some(ch => channelTitle.toLowerCase().includes(ch.toLowerCase()))) {
                        return null;
                    }
                    
                    // Check 5: Filter trailer keywords
                    const trailerKeywords = [
                        'official trailer', 'teaser trailer', 'movie trailer',
                        'launch trailer', 'gameplay trailer', 'reveal trailer'
                    ];
                    const titleLower = title.toLowerCase();
                    if (trailerKeywords.some(kw => titleLower.includes(kw))) {
                        return null;
                    }
                    
                    // Check 6: Filter gaming content
                    const gamingKeywords = ['gameplay', 'walkthrough', 'lets play', 'gaming'];
                    if (gamingKeywords.some(kw => titleLower.includes(kw))) {
                        return null;
                    }
                    
                    // Check 7: PRIORITY 1 - ContentPreferenceLearningService filtering
                    // Block channels/artists user has disliked
                    // This runs BEFORE oEmbed to save requests on blocked content
                    if (window.contentPreferenceLearningService && window.contentPreferenceLearningService.initialized) {
                        const filterResult = window.contentPreferenceLearningService.shouldFilterContent({
                            channelTitle: channelTitle,
                            title: title,
                            language: snippet.defaultAudioLanguage || snippet.defaultLanguage || 'en',
                            tags: snippet.tags || []
                        });
                        
                        if (filterResult.shouldFilter) {
                            console.warn(`   🚫 [PREFERENCE FILTER] Skipping ${videoId}: ${filterResult.reason}`);
                            return null;
                        }
                    }
                    
                    // Check 8: Genre-based filtering using ContentPreferencesService
                    if (window.contentPreferences) {
                        const selectedGenres = window.contentPreferences.getSelectedGenres();
                        const genreKeywords = {
                            hip_hop: [
                                'rap', 'hip hop', 'hiphop', 'hip-hop', 'rapper',
                                'trap', 'drill', 'mumble rap', 'freestyle',
                                'cypher', 'bars', 'spittin', 'mc ',
                                'feat.', 'ft.', 'x '  // Common in rap collaborations
                            ],
                            country: ['country music', 'country'],
                            rock: ['rock', 'metal', 'punk'],
                            electronic: ['edm', 'house music', 'techno', 'dubstep'],
                            classical: ['classical', 'orchestra', 'symphony'],
                            jazz: ['jazz', 'smooth jazz'],
                            latin: ['reggaeton', 'latin trap', 'bachata', 'salsa'],
                            reggae: ['reggae', 'dancehall', 'ska']
                        };
                        
                        const channelLower = channelTitle.toLowerCase();
                        for (const [genreId, keywords] of Object.entries(genreKeywords)) {
                            if (selectedGenres.includes(genreId)) continue;
                            
                            if (keywords.some(kw => titleLower.includes(kw) || channelLower.includes(kw))) {
                                return null;
                            }
                        }
                    }
                    
                    // Check 9: oEmbed validation (expensive, so done last)
                    try {
                        const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
                        const oEmbedResponse = await fetch(oEmbedUrl);
                        
                        if (!oEmbedResponse.ok) {
                            return null;
                        }
                        
                        const oEmbedData = await oEmbedResponse.json();
                        
                        if (oEmbedData.title === 'YouTube Video' || !oEmbedData.title || !oEmbedData.author_name) {
                            return null;
                        }
                        
                        // Cache metadata for preference learning (will be used if user dislikes this video)
                        this._cacheYouTubeMetadata(videoId, {
                            channelTitle: oEmbedData.author_name,
                            title: oEmbedData.title
                        });
                        
                    } catch (error) {
                        return null;
                    }
                    
                    return video;
                });
                
                const validatedVideos = await Promise.all(videoPromises);
                const urls = validatedVideos
                    .filter(v => v !== null)
                    .map(video => {
                        const videoId = video.id;
                        const title = video.snippet?.title || 'Untitled';
                        const channelTitle = video.snippet?.channelTitle || 'Unknown';
                        console.log(`   ✓ ${videoId}: ${title} by ${channelTitle}`);
                        return `https://www.youtube.com/watch?v=${videoId}`;
                    });
                
                console.log(`📺 [YOUTUBE ${regionCode}] Extracted ${urls.length} valid URLs (${Math.round((1 - urls.length/videos.length) * 100)}% filtered)`);
                return urls;
                
            } catch (error) {
                console.error(`❌ [YOUTUBE ${regionCode}] Fetch failed:`, error.message);
                return [];
            }
        }

        /**
         * Cache YouTube metadata for preference learning
         * @param {string} videoId - YouTube video ID
         * @param {Object} metadata - Metadata object
         */
        _cacheYouTubeMetadata(videoId, metadata) {
            if (!window.youtubeMetadataCache) {
                window.youtubeMetadataCache = new Map();
            }
            window.youtubeMetadataCache.set(videoId, metadata);
            console.log(`📊 Cached YouTube metadata for filtering: ${videoId} (${metadata.channelTitle})`);
        }

        /**
         * Fetch YouTube Music Videos for Riser
         * Uses videoCategoryId=10 (Music category), filters OUT shorts
         * Mobile app ref: recommendation_service.dart _fetchYouTubeMusicVideos() line 1360
         * @param {number} maxResults - Number of music videos to fetch
         * @returns {Promise<Array<string>>} Array of YouTube music video URLs
         */
        async fetchYouTubeMusicVideos(maxResults = 50) {
            try {
                console.log(`🎵 [YOUTUBE MUSIC PROXY] Fetching ${maxResults} music videos via Worker...`);
                
                // Call Cloudflare Worker proxy for music videos
                const url = `${this.workerBaseUrl}/api/youtube/music-videos?maxResults=${maxResults}`;
                
                console.log(`🎵 [YOUTUBE MUSIC PROXY] Strategy: Music category (videoCategoryId=10 via Worker)`);
                console.log(`🎵 [YOUTUBE MUSIC PROXY] Calling: ${url}`);
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    console.error(`❌ YouTube Music Proxy error: ${response.status} ${response.statusText}`);
                    return [];
                }
                
                const data = await response.json();
                const videos = data.items || [];
                
                console.log(`🎵 [YOUTUBE MUSIC PROXY] Received ${videos.length} music videos`);
                
                // Extract video URLs (music videos only, shorts already filtered by category)
                // Filter out videos without valid thumbnails (restricted/deleted videos)
                const urls = videos
                    .filter(video => {
                        if (!video.id || typeof video.id !== 'string') return false;
                        const hasThumbnails = video.snippet?.thumbnails?.default?.url;
                        if (!hasThumbnails) {
                            console.warn(`   ⚠️ Skipping music video ${video.id}: No thumbnail data`);
                        }
                        return hasThumbnails;
                    })
                    .map(video => {
                        const videoId = video.id;
                        const url = `https://www.youtube.com/watch?v=${videoId}`;
                        const title = video.snippet?.title || 'Untitled';
                        const channelTitle = video.snippet?.channelTitle || 'Unknown';
                        console.log(`   ♪ ${videoId}: ${title} by ${channelTitle}`);
                        return url;
                    });
                
                console.log(`🎵 [YOUTUBE MUSIC PROXY] Extracted ${urls.length} music video URLs from ${videos.length} total`);
                return urls;
                
            } catch (error) {
                console.error('❌ [YOUTUBE MUSIC PROXY] Fetch failed:', error.message);
                return [];
            }
        }

        /**
         * Fetch YouTube Music Audio for Small Stage
         * Uses search endpoint with 'official audio|lyric video' query and Music category
         * Mobile app ref: recommendation_service.dart _fetchYouTubeMusicAudio() line 1019
         * @param {number} maxResults - Number of audio tracks to fetch
         * @returns {Promise<Array<string>>} Array of YouTube audio URLs
         */
        async fetchYouTubeMusicAudio(maxResults = 25) {
            try {
                console.log(`🎵 [YOUTUBE AUDIO PROXY] Fetching ${maxResults} audio tracks via Worker...`);
                
                // Call Cloudflare Worker proxy for audio tracks
                const url = `${this.workerBaseUrl}/api/youtube/music-audio?maxResults=${maxResults}`;
                
                console.log(`🎵 [YOUTUBE AUDIO PROXY] Strategy: Search with audio query (via Worker)`);
                console.log(`🎵 [YOUTUBE AUDIO PROXY] Calling: ${url}`);
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    console.error(`❌ YouTube Audio Proxy error: ${response.status} ${response.statusText}`);
                    return [];
                }
                
                const data = await response.json();
                const videos = data.items || [];
                
                console.log(`🎵 [YOUTUBE AUDIO PROXY] Received ${videos.length} audio tracks`);
                
                // Extract video URLs from search endpoint (id.videoId format)
                // Filter out videos without valid thumbnails (restricted/deleted videos)
                const urls = videos
                    .filter(video => {
                        if (!video.id?.videoId) return false;
                        const hasThumbnails = video.snippet?.thumbnails?.default?.url;
                        if (!hasThumbnails) {
                            console.warn(`   ⚠️ Skipping audio track ${video.id.videoId}: No thumbnail data`);
                        }
                        return hasThumbnails;
                    })
                    .map(video => {
                        const videoId = video.id.videoId;
                        const url = `https://www.youtube.com/watch?v=${videoId}`;
                        const title = video.snippet?.title || 'Untitled';
                        const channelTitle = video.snippet?.channelTitle || 'Unknown';
                        console.log(`   🎵 ${videoId}: ${title} by ${channelTitle}`);
                        return url;
                    });
                
                console.log(`🎵 [YOUTUBE AUDIO PROXY] Extracted ${urls.length} audio URLs from ${videos.length} total`);
                return urls;
                
            } catch (error) {
                console.error('❌ [YOUTUBE AUDIO PROXY] Fetch failed:', error.message);
                return [];
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
            // CUSTOM DISTRIBUTION (user preference - more YouTube focus):
            // - Fetch 50 YouTube videos, take 13 for pool (59% weight)
            // - Dailymotion: 4 videos (18% weight)
            // - Vimeo: 3 videos (13% weight)  
            // - Instagram: 1 video (4.5% weight)
            // - TikTok: 1 video (4.5% weight)
            // = 22 item pool → shuffle → take 10 for gallery wall
            // This provides buffer for dislike filtering (22 items for 10 slots = 220%)
            const galleryLinks = [];
            
            // YouTube (13 links from 50 fetched) - Use API-fetched shorts OR config fallback
            const youtubeUrls = this.youtubeShorts.length > 0
                ? this.youtubeShorts.slice(0, 13)  // Take 13 from 50 for increased YouTube presence
                : (config.youtube_trending_video_ids || []).map(id => `https://www.youtube.com/watch?v=${id}`);
            
            if (this.youtubeShorts.length > 0) {
                console.log(`   📺 Using YouTube Shorts from API (${youtubeUrls.length} from ${this.youtubeShorts.length} fetched)`);
            } else {
                console.log('   📺 Using YouTube from config (API fallback)');
            }
            
            for (let i = 0; i < Math.min(13, youtubeUrls.length); i++) {
                galleryLinks.push(youtubeUrls[i]);
            }

            // TikTok (1 link)
            const tiktokUrls = config.tiktok_trending_urls || [];
            for (let i = 0; i < Math.min(1, tiktokUrls.length); i++) {
                galleryLinks.push(tiktokUrls[i]);
            }

            // Instagram (1 link)
            const instaUrls = config.instagram_reel_urls || [];
            for (let i = 0; i < Math.min(1, instaUrls.length); i++) {
                galleryLinks.push(instaUrls[i]);
            }

            // Vimeo (3 links - mobile app match) - Use API-fetched Staff Picks OR config fallback
            const vimeoUrls = this.vimeoStaffPicksUrls.length > 0 
                ? this.vimeoStaffPicksUrls 
                : (config.vimeo_shorts_urls || []);
            
            if (this.vimeoStaffPicksUrls.length > 0) {
                console.log(`   🎬 Using Vimeo Staff Picks from API (taking 3 from ${this.vimeoStaffPicksUrls.length})`);
            } else {
                console.log('   🎬 Using Vimeo URLs from config (API fallback)');
            }
            
            for (let i = 0; i < Math.min(3, vimeoUrls.length); i++) {
                galleryLinks.push(vimeoUrls[i]);
            }

            // Dailymotion (4 links - mobile app match) - Use API-fetched trending OR config fallback
            const dailymotionUrls = this.dailymotionTrendingUrls.length > 0
                ? this.dailymotionTrendingUrls
                : (config.dailymotion_trending_urls || []);
            
            if (this.dailymotionTrendingUrls.length > 0) {
                console.log(`   🎬 Using Dailymotion from API (taking 4 from ${this.dailymotionTrendingUrls.length})`);
            } else {
                console.log('   🎬 Using Dailymotion from config (API fallback)');
            }
            
            for (let i = 0; i < Math.min(4, dailymotionUrls.length); i++) {
                galleryLinks.push(dailymotionUrls[i]);
            }

            recommendations.topHitsMix = {
                furnitureType: 'gallery_wall',
                title: 'Top Hits Mix',
                links: galleryLinks
            };

            console.log(`   ✅ Gallery Wall: ${galleryLinks.length} links`);

            // RISER: Music videos from YouTube, Vimeo, Dailymotion (target: 12 YT + 3 Vimeo + 3 Dailymotion = 18 total)
            // Mobile app ref: fetchTrendingMusicVideos() uses separate music video API (videoCategoryId=10)
            const riserLinks = [];

            // YouTube Music Videos (12 links) - Use MUSIC VIDEO API (separate from shorts!)
            const youtubeMusicUrls = this.youtubeMusicVideos.length > 0
                ? this.youtubeMusicVideos
                : (config.youtube_trending_video_ids || []).map(id => `https://www.youtube.com/watch?v=${id}`);
            
            if (this.youtubeMusicVideos.length > 0) {
                console.log(`   🎵 Using YouTube Music Videos from API (${Math.min(12, youtubeMusicUrls.length)} from ${this.youtubeMusicVideos.length} fetched)`);
            } else {
                console.log('   🎵 Using YouTube from config (Music API fallback)');
            }
            
            for (let i = 0; i < Math.min(12, youtubeMusicUrls.length); i++) {
                riserLinks.push(youtubeMusicUrls[i]);
            }

            // Vimeo Music Videos (3 links)
            const vimeoUrlsForRiser = this.vimeoStaffPicksUrls.length > 0 
                ? this.vimeoStaffPicksUrls.slice(3, 6) // Use DIFFERENT videos than Gallery Wall (offset by 3)
                : (config.vimeo_shorts_urls || []);
            for (let i = 0; i < Math.min(3, vimeoUrlsForRiser.length); i++) {
                riserLinks.push(vimeoUrlsForRiser[i]);
            }

            // Dailymotion Music Videos (3 links)
            const dailymotionUrlsForRiser = this.dailymotionTrendingUrls.length > 0
                ? this.dailymotionTrendingUrls.slice(4, 7) // Use DIFFERENT videos than Gallery Wall (offset by 4)
                : (config.dailymotion_trending_urls || []);
            for (let i = 0; i < Math.min(3, dailymotionUrlsForRiser.length); i++) {
                riserLinks.push(dailymotionUrlsForRiser[i]);
            }

            recommendations.chillVibes = {
                furnitureType: 'riser',
                title: 'Chill Vibes',
                links: riserLinks
            };

            console.log(`   ✅ Riser (Music Videos): ${riserLinks.length} links`);

            // SMALL STAGE: Audio tracks (YouTube Music Audio + Spotify + SoundCloud + Deezer)
            // Mobile app ref: fetchTrendingMusic() line 750 - 25 YT Audio + 20 Spotify + 15 Deezer + 20 SoundCloud
            // YouTube Music Audio uses search endpoint with 'official audio|lyric video' query
            const stageLinks = [];
            
            // YouTube Music Audio (10 links from 25 fetched) - Audio-focused content
            const youtubeMusicAudioUrls = this.youtubeMusicAudio.length > 0
                ? this.youtubeMusicAudio
                : (config.youtube_trending_video_ids || []).map(id => `https://www.youtube.com/watch?v=${id}`);
            
            if (this.youtubeMusicAudio.length > 0) {
                console.log(`   🎵 Using YouTube Music Audio from API (${Math.min(10, youtubeMusicAudioUrls.length)} from ${this.youtubeMusicAudio.length} fetched)`);
            } else {
                console.log('   🎵 Using YouTube from config (Audio API fallback)');
            }
            
            for (let i = 0; i < Math.min(10, youtubeMusicAudioUrls.length); i++) {
                stageLinks.push(youtubeMusicAudioUrls[i]);
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

            // AMPHITHEATRE: Short-form videos (YouTube Shorts, TikTok, Instagram Reels, Vimeo shorts, Dailymotion shorts)
            const amphitheatreLinks = [];

            // YouTube Shorts (4 links) - Using video IDs, they work as shorts too
            const youtubeIdsForAmphitheatre = config.youtube_trending_video_ids || [];
            for (let i = 0; i < Math.min(4, youtubeIdsForAmphitheatre.length); i++) {
                // Use /shorts/ format for YouTube Shorts
                const videoId = youtubeIdsForAmphitheatre[i];
                amphitheatreLinks.push(`https://www.youtube.com/shorts/${videoId}`);
            }

            // TikTok (3 links)
            const tiktokUrlsForAmphitheatre = config.tiktok_trending_urls || [];
            for (let i = 0; i < Math.min(3, tiktokUrlsForAmphitheatre.length); i++) {
                amphitheatreLinks.push(tiktokUrlsForAmphitheatre[i]);
            }

            // Instagram Reels (2 links)
            const instaUrlsForAmphitheatre = config.instagram_reel_urls || [];
            for (let i = 0; i < Math.min(2, instaUrlsForAmphitheatre.length); i++) {
                amphitheatreLinks.push(instaUrlsForAmphitheatre[i]);
            }

            // Vimeo Shorts (3 links) - Use API-fetched OR config fallback
            const vimeoUrlsForAmphitheatre = this.vimeoStaffPicksUrls.length > 0 
                ? this.vimeoStaffPicksUrls 
                : (config.vimeo_shorts_urls || []);
            for (let i = 0; i < Math.min(3, vimeoUrlsForAmphitheatre.length); i++) {
                amphitheatreLinks.push(vimeoUrlsForAmphitheatre[i]);
            }

            // Dailymotion Shorts (3 links) - Use API-fetched shorts OR trending fallback
            const dailymotionShortsForAmphitheatre = this.dailymotionShortsUrls.length > 0
                ? this.dailymotionShortsUrls
                : (this.dailymotionTrendingUrls.length > 0 
                    ? this.dailymotionTrendingUrls 
                    : (config.dailymotion_trending_urls || []));
            for (let i = 0; i < Math.min(3, dailymotionShortsForAmphitheatre.length); i++) {
                amphitheatreLinks.push(dailymotionShortsForAmphitheatre[i]);
            }

            recommendations.mixedContent = {
                furnitureType: 'amphitheatre',
                title: 'Short-Form Mix',
                links: amphitheatreLinks
            };

            console.log(`   ✅ Amphitheatre (Short-Form): ${amphitheatreLinks.length} links`);

            // BOOKSHELF: Favorite links (user has liked and opened repeatedly)
            // Mobile app ref: favorites_service.dart getFavorites() - calculates score based on:
            //   - Recency: 70% weight (exponential decay)
            //   - Frequency: 30% weight (logarithmic of open count)
            // For browser: Use curated favorites from config (browser doesn't have persistent interaction tracking yet)
            const bookshelfLinks = [];
            
            // Mix of favorite-worthy content from different platforms
            // TODO: Implement browser-side interaction tracking and scoring system
            const favoriteYoutubeUrls = config.youtube_trending_video_ids || [];
            for (let i = 0; i < Math.min(5, favoriteYoutubeUrls.length); i++) {
                bookshelfLinks.push(`https://www.youtube.com/watch?v=${favoriteYoutubeUrls[i]}`);
            }
            
            const favoriteSpotifyUrls = config.spotify_trending_urls || [];
            for (let i = 0; i < Math.min(3, favoriteSpotifyUrls.length); i++) {
                let url = favoriteSpotifyUrls[i];
                if (url.includes(':http')) {
                    url = url.substring(url.indexOf(':') + 1);
                }
                bookshelfLinks.push(url);
            }
            
            const favoriteVimeoUrls = this.vimeoStaffPicksUrls.length > 0 
                ? this.vimeoStaffPicksUrls.slice(6, 8) // Use different videos
                : (config.vimeo_shorts_urls || []);
            for (let i = 0; i < Math.min(2, favoriteVimeoUrls.length); i++) {
                bookshelfLinks.push(favoriteVimeoUrls[i]);
            }
            
            recommendations.favorites = {
                furnitureType: 'bookshelf',
                title: 'Favorites',
                links: bookshelfLinks
            };

            console.log(`   ✅ Bookshelf (Favorites): ${bookshelfLinks.length} links`);

            console.log('✅ DART_RECOMMENDATIONS built successfully');
            return recommendations;
        }

        /**
         * Fetch Vimeo Staff Picks via Cloudflare Worker proxy
         * Access token is kept server-side, never exposed to browser
         * @param {number} maxResults - Maximum number of videos to fetch
         * @returns {Promise<string[]>} Array of Vimeo URLs
         */
        async fetchVimeoStaffPicks(maxResults = 50) {
            try {
                console.log(`🎬 [VIMEO PROXY] Fetching ${maxResults} Staff Picks via Worker...`);
                
                // Call Cloudflare Worker proxy instead of Vimeo directly
                // Worker keeps access token hidden server-side
                const url = `${this.workerBaseUrl}/api/vimeo/staff-picks?maxResults=${maxResults}`;
                
                console.log(`🎬 [VIMEO PROXY] Calling: ${url}`);
                
                const response = await fetch(url, {
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });

                if (!response.ok) {
                    console.error(`❌ Vimeo Proxy error: ${response.status} ${response.statusText}`);
                    const errorData = await response.json().catch(() => ({}));
                    console.error('   Error details:', errorData.error || errorData);
                    return [];
                }

                const data = await response.json();
                const videos = data.data || [];
                
                console.log(`🎬 [VIMEO PROXY] Received ${videos.length} Staff Picks`);
                
                // Extract video URLs
                const urls = videos.map(video => {
                    const uri = video.uri || '';
                    const videoId = uri.split('/').pop();
                    return `https://vimeo.com/${videoId}`;
                }).filter(url => url !== 'https://vimeo.com/');
                
                // Shuffle to get variety
                const shuffled = urls.sort(() => Math.random() - 0.5);
                
                console.log(`🎬 [VIMEO PROXY] Extracted ${shuffled.length} URLs from Staff Picks`);
                return shuffled;
                
            } catch (error) {
                console.warn('⚠️ [VIMEO PROXY] Staff Picks fetch failed:', error.message);
                console.log('   Will fall back to config URLs');
                return [];
            }
        }

        /**
         * Fetch Dailymotion trending videos from API
         * @param {number} maxResults - Maximum number of videos to fetch
         * @returns {Promise<string[]>} Array of Dailymotion URLs
         */
        async fetchDailymotionTrending(maxResults = 20) {
            try {
                console.log('🎬 [DAILYMOTION] Fetching trending videos from API...');
                
                const apiUrl = `${this.dailymotionApiBaseUrl}/videos?featured=1&limit=${maxResults}&fields=id,title,thumbnail_url`;
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });

                if (!response.ok) {
                    throw new Error(`Dailymotion API returned ${response.status}`);
                }

                const data = await response.json();
                const videos = data.list || [];
                
                console.log(`🎬 [DAILYMOTION] API returned ${videos.length} trending videos`);
                
                // Extract video URLs
                const urls = videos.map(video => {
                    return `https://www.dailymotion.com/video/${video.id}`;
                }).filter(url => url.includes('/video/'));
                
                // Shuffle to get variety
                const shuffled = urls.sort(() => Math.random() - 0.5);
                
                console.log(`🎬 [DAILYMOTION] Extracted ${shuffled.length} URLs`);
                return shuffled;
                
            } catch (error) {
                console.warn('⚠️ [DAILYMOTION] Trending API failed:', error.message);
                console.log('   Will fall back to config URLs');
                return [];
            }
        }

        /**
         * Fetch Dailymotion short videos (< 60 seconds) for Amphitheatre
         * @param {number} maxResults - Maximum number of videos to fetch
         * @returns {Promise<string[]>} Array of Dailymotion short video URLs
         */
        async fetchDailymotionShorts(maxResults = 10) {
            try {
                console.log('🎬 [DAILYMOTION] Fetching short-form videos from API...');
                
                // Use featured=1 parameter instead of duration_max and sort=trending
                // (Dailymotion public API doesn't support those parameters)
                const apiUrl = `${this.dailymotionApiBaseUrl}/videos?featured=1&limit=${maxResults}&fields=id,title,duration,thumbnail_url`;
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });

                if (!response.ok) {
                    throw new Error(`Dailymotion API returned ${response.status}`);
                }

                const data = await response.json();
                const videos = data.list || [];
                
                console.log(`🎬 [DAILYMOTION] API returned ${videos.length} featured videos`);
                
                // Filter for short videos (< 120 seconds to allow some flexibility)
                const shortVideos = videos.filter(video => {
                    const duration = video.duration || 0;
                    return duration > 0 && duration <= 120; // 2 minutes max
                });
                
                console.log(`🎬 [DAILYMOTION] Found ${shortVideos.length} short videos (<2min)`);
                
                // Extract video URLs
                const urls = shortVideos.map(video => {
                    return `https://www.dailymotion.com/video/${video.id}`;
                }).filter(url => url.includes('/video/'));
                
                // Shuffle to get variety
                const shuffled = urls.sort(() => Math.random() - 0.5);
                
                console.log(`🎬 [DAILYMOTION] Extracted ${shuffled.length} short video URLs`);
                return shuffled;
                
            } catch (error) {
                console.warn('⚠️ [DAILYMOTION] Shorts API failed:', error.message);
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
                
                // Fetch content from APIs - SEPARATE content for each furniture type
                // Mobile app has distinct fetch methods for shorts vs music videos vs audio
                // Reference: recommendation_service.dart
                //   - fetchTrendingShorts() line 85 (Gallery Wall)
                //   - fetchTrendingMusicVideos() line 1074 (Riser)
                //   - fetchTrendingMusic() line 750 (Small Stage - with YouTube Music Audio)
                
                // Gallery Wall: Music videos (videoCategoryId=10)
                // Fetch 100+ to ensure enough videos after filtering
                // Fetch YouTube content from multiple regions (US, CA, GB)
                // 35 videos per region × 3 regions = ~105 total videos
                this.youtubeShorts = await this.fetchYouTubeShorts(35);
                
                // Riser: Music videos specifically (videoCategoryId=10, >60sec)
                this.youtubeMusicVideos = await this.fetchYouTubeMusicVideos(50);
                
                // Small Stage: Audio tracks (including YouTube Music Audio)
                this.youtubeMusicAudio = await this.fetchYouTubeMusicAudio(25);
                
                // Shared across furniture types
                this.vimeoStaffPicksUrls = await this.fetchVimeoStaffPicks(50);
                this.dailymotionTrendingUrls = await this.fetchDailymotionTrending(20);
                this.dailymotionShortsUrls = await this.fetchDailymotionShorts(10);

                // Build DART_RECOMMENDATIONS
                const recommendations = this.buildDartRecommendations(config);

                // Populate window.DART_RECOMMENDATIONS
                window.DART_RECOMMENDATIONS = recommendations;

                console.log('✨ window.DART_RECOMMENDATIONS populated!');
                console.log(`   Gallery Wall: ${recommendations.topHitsMix?.links.length || 0} links`);
                console.log(`   Riser: ${recommendations.chillVibes?.links.length || 0} links`);
                console.log(`   Small Stage: ${recommendations.shortsAndReels?.links.length || 0} links`);
                console.log(`   Amphitheatre: ${recommendations.mixedContent?.links.length || 0} links`);
                console.log(`   Bookshelf: ${recommendations.favorites?.links.length || 0} links`);

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
