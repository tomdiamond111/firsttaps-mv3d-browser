/**
 * DYNAMIC CONTENT GENERATOR
 * Generates content for furniture pieces based on user preferences and furniture type
 * Replaces hardcoded demo content with dynamic, genre-based content
 */

(function() {
    'use strict';

    class DynamicContentGenerator {
        constructor() {
            this.initialized = false;
            this.isRefreshing = false; // Track if refresh is in progress
            
            // Content distribution strategy per furniture type
            this.strategies = {
                gallery_wall: 'ALL_GENRES', // Videos from all selected genres
                bookshelf: 'MOST_PLAYED', // User's most played content
                riser: 'SINGLE_GENRE_ROTATING', // One genre, rotates daily
                stage_small: 'SINGLE_GENRE_ROTATING', // One genre, different from riser
                amphitheatre: 'CURATED_ENTERTAINMENT' // Non-music entertainment
            };

            // Platform distribution weights (for variety)
            this.platformWeights = {
                gallery_wall: { youtube: 0.5, vimeo: 0.2, dailymotion: 0.3 },
                riser: { youtube: 0.4, spotify: 0.3, soundcloud: 0.2, deezer: 0.1 },
                stage_small: { youtube: 0.4, spotify: 0.3, soundcloud: 0.2, deezer: 0.1 },
                bookshelf: { youtube: 0.3, spotify: 0.3, vimeo: 0.1, soundcloud: 0.15, deezer: 0.15 },
                amphitheatre: { youtube: 0.5, vimeo: 0.3, tiktok: 0.1, instagram: 0.1 }
            };

            // Genre-to-search-term mapping
            this.genreSearchTerms = {
                pop: ['pop music', 'top pop hits', 'popular songs'],
                country: ['country music', 'country hits', 'nashville'],
                rock: ['rock music', 'rock classics', 'guitar rock'],
                hip_hop: ['hip hop', 'rap music', 'urban beats'],
                indie: ['indie music', 'alternative', 'indie rock'],
                electronic: ['electronic music', 'edm', 'house music'],
                r_and_b: ['r&b music', 'soul', 'rhythm and blues'],
                classical: ['classical music', 'orchestra', 'symphony'],
                jazz: ['jazz music', 'smooth jazz', 'jazz classics'],
                latin: ['latin music', 'reggaeton', 'salsa'],
                reggae: ['reggae music', 'dancehall', 'ska']
            };

            // Daily rotation state (which genre for single-genre furniture)
            this.rotationState = {
                riser: null,
                stage_small: null,
                lastRotation: Date.now()
            };
        }

        /**
         * Initialize with dependencies
         * @param {Object} contentPrefs - ContentPreferencesService instance
         */
        initialize(contentPrefs) {
            this.contentPrefs = contentPrefs || window.contentPreferences;
            
            if (!this.contentPrefs) {
                console.error('❌ ContentPreferencesService not available');
                return false;
            }

            this.initialized = true;
            return true;
        }

        /**
         * Ensure initialization
         */
        ensureInitialized() {
            if (!this.initialized) {
                this.initialize();
            }
        }

        /**
         * Generate content configuration for furniture
         * @param {string} furnitureType - Furniture type (gallery_wall, riser, etc.)
         * @param {number} slotCount - Number of slots on furniture
         * @returns {Promise<Object>} Content configuration with metadata
         */
        async generateContentConfig(furnitureType, slotCount = 10) {
            this.ensureInitialized();

            const strategy = this.strategies[furnitureType] || 'ALL_GENRES';
            const genres = this.contentPrefs.getSelectedGenres();

            let config = {
                furnitureType: furnitureType,
                strategy: strategy,
                slotCount: slotCount,
                genres: genres,
                cleanMode: this.contentPrefs.isCleanMode(),
                contentItems: []
            };

            switch (strategy) {
                case 'ALL_GENRES':
                    config.contentItems = this.generateAllGenresContent(furnitureType, slotCount, genres);
                    break;

                case 'SINGLE_GENRE_ROTATING':
                    config.contentItems = this.generateSingleGenreContent(furnitureType, slotCount, genres);
                    break;

                case 'MOST_PLAYED':
                    config.contentItems = await this.generateMostPlayedContent(slotCount);
                    break;

                case 'CURATED_ENTERTAINMENT':
                    config.contentItems = this.generateCuratedContent(slotCount);
                    break;

                default:
                    console.warn('⚠️ Unknown strategy, using fallback');
                    config.contentItems = this.generateFallbackContent(slotCount);
            }

            return config;
        }

        /**
         * Generate content from all selected genres (Gallery Wall)
         * @param {string} furnitureType - Furniture type
         * @param {number} slotCount - Number of slots
         * @param {Array<string>} genres - Selected genres
         * @returns {Array} Array of content URLs/metadata
         */
        generateAllGenresContent(furnitureType, slotCount, genres) {
            const items = [];
            const weights = this.platformWeights[furnitureType] || this.platformWeights.gallery_wall;

            // Distribute slots across genres evenly
            const slotsPerGenre = Math.ceil(slotCount / genres.length);

            genres.forEach(genre => {
                const genreSearchTerms = this.genreSearchTerms[genre] || [genre];
                const searchTerm = genreSearchTerms[Math.floor(Math.random() * genreSearchTerms.length)];

                // Generate content items for this genre
                for (let i = 0; i < slotsPerGenre && items.length < slotCount; i++) {
                    const platform = this.selectPlatformByWeight(weights);
                    const item = this.createContentItem(platform, searchTerm, genre);
                    items.push(item);
                }
            });

            // Shuffle for variety
            return this.shuffleArray(items).slice(0, slotCount);
        }

        /**
         * Generate content from ONE rotating genre (Riser/Stage)
         * @param {string} furnitureType - Furniture type
         * @param {number} slotCount - Number of slots
         * @param {Array<string>} genres - Selected genres
         * @returns {Array} Array of content URLs/metadata
         */
        generateSingleGenreContent(furnitureType, slotCount, genres) {
            // Check if rotation needed (once per day)
            this.checkDailyRotation();

            // Get or assign genre for this furniture
            let assignedGenre = this.rotationState[furnitureType];
            
            if (!assignedGenre || !genres.includes(assignedGenre)) {
                // Assign random genre (but different from other single-genre furniture)
                const otherFurniture = furnitureType === 'riser' ? 'stage_small' : 'riser';
                const otherGenre = this.rotationState[otherFurniture];
                
                const availableGenres = genres.filter(g => g !== otherGenre);
                assignedGenre = availableGenres[Math.floor(Math.random() * availableGenres.length)] || genres[0];
                
                this.rotationState[furnitureType] = assignedGenre;
            }

            const items = [];
            const weights = this.platformWeights[furnitureType] || {};
            const genreSearchTerms = this.genreSearchTerms[assignedGenre] || [assignedGenre];

            for (let i = 0; i < slotCount; i++) {
                const searchTerm = genreSearchTerms[Math.floor(Math.random() * genreSearchTerms.length)];
                const platform = this.selectPlatformByWeight(weights);
                const item = this.createContentItem(platform, searchTerm, assignedGenre);
                items.push(item);
            }

            return items;
        }

        /**
         * Generate most-played content (Bookshelf)
         * Uses real user activity data to show favorites + similar content
         * @param {number} slotCount - Number of slots
         * @returns {Array} Array of most played content
         */
        async generateMostPlayedContent(slotCount) {
            try {
                // Request user favorites from Flutter
                const favorites = await this.getUserFavorites();
                
                if (!favorites || favorites.length === 0) {
                    if (window.shouldLog && window.shouldLog('furnitureContent')) {
                        console.log('📚 No user favorites yet, using fallback content');
                    }
                    return this.generateFallbackContent(slotCount);
                }
                
                if (window.shouldLog && window.shouldLog('furnitureContent')) {
                    console.log(`📚 Loaded ${favorites.length} user favorites`);
                }
                
                // Calculate distribution: 60% favorites, 40% recommendations
                const favoriteCount = Math.ceil(slotCount * 0.6);
                const recommendationCount = slotCount - favoriteCount;
                
                const items = [];
                
                // Add top favorites
                for (let i = 0; i < Math.min(favoriteCount, favorites.length); i++) {
                    const fav = favorites[i];
                    items.push({
                        type: 'favorite',
                        url: fav.url,
                        title: fav.title,
                        platform: fav.platform,
                        thumbnailUrl: fav.thumbnailUrl,
                        metadata: {
                            playCount: fav.playCount,
                            source: 'user_favorite'
                        }
                    });
                }
                
                // Request recommendations based on favorites
                if (recommendationCount > 0) {
                    const recommendations = await this.getRecommendationsBasedOnFavorites(recommendationCount);
                    
                    recommendations.forEach(rec => {
                        items.push({
                            type: 'recommendation',
                            url: rec.url,
                            title: rec.title,
                            platform: rec.platform,
                            thumbnailUrl: rec.thumbnailUrl,
                            metadata: {
                                source: 'similar_content',
                                basedOn: rec.basedOn
                            }
                        });
                    });
                }
                
                // Shuffle to mix favorites and recommendations
                return this.shuffleArray(items).slice(0, slotCount);
                
            } catch (e) {
                console.error('❌ Error generating most-played content:', e);
                return this.generateFallbackContent(slotCount);
            }
        }
        
        /**
         * Request user favorites from Flutter via channel
         * @returns {Promise<Array>} Array of favorite links
         */
        getUserFavorites() {
            return new Promise((resolve) => {
                // Set up response listener
                const handleResponse = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.action === 'userFavoritesResponse') {
                            window.removeEventListener('userFavoritesResponse', handleResponse);
                            resolve(data.favorites || []);
                        }
                    } catch (e) {
                        console.error('Error parsing favorites response:', e);
                        resolve([]);
                    }
                };
                
                window.addEventListener('userFavoritesResponse', handleResponse);
                
                // Request favorites from Flutter
                if (window.UserActivityChannel) {
                    window.UserActivityChannel.postMessage(JSON.stringify({
                        action: 'getUserFavorites',
                        limit: 20
                    }));
                    
                    // Timeout after 2 seconds
                    setTimeout(() => {
                        window.removeEventListener('userFavoritesResponse', handleResponse);
                        resolve([]);
                    }, 2000);
                } else {
                    console.warn('UserActivityChannel not available');
                    resolve([]);
                }
            });
        }
        
        /**
         * Request personalized recommendations from Flutter
         * @param {number} count - Number of recommendations
         * @returns {Promise<Array>} Array of recommended links
         */
        getRecommendationsBasedOnFavorites(count) {
            return new Promise((resolve) => {
                const handleResponse = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.action === 'recommendationsResponse') {
                            window.removeEventListener('recommendationsResponse', handleResponse);
                            resolve(data.recommendations || []);
                        }
                    } catch (e) {
                        console.error('Error parsing recommendations response:', e);
                        resolve([]);
                    }
                };
                
                window.addEventListener('recommendationsResponse', handleResponse);
                
                if (window.UserActivityChannel) {
                    window.UserActivityChannel.postMessage(JSON.stringify({
                        action: 'getRecommendations',
                        count: count
                    }));
                    
                    setTimeout(() => {
                        window.removeEventListener('recommendationsResponse', handleResponse);
                        resolve([]);
                    }, 3000);
                } else {
                    resolve([]);
                }
            });
        }

        /**
         * Generate curated entertainment content (Amphitheatre)
         * @param {number} slotCount - Number of slots
         * @returns {Array} Array of entertainment content
         */
        generateCuratedContent(slotCount) {
            const items = [];
            const weights = this.platformWeights.amphitheatre;
            const searchTerms = [
                'funny videos',
                'viral clips',
                'trending entertainment',
                'comedy sketches',
                'amazing talent',
                'viral moments'
            ];

            for (let i = 0; i < slotCount; i++) {
                const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
                const platform = this.selectPlatformByWeight(weights);
                const item = this.createContentItem(platform, searchTerm, 'entertainment');
                items.push(item);
            }

            return items;
        }

        /**
         * Generate fallback content when other methods fail
         * @param {number} slotCount - Number of slots
         * @returns {Array} Array of fallback content
         */
        generateFallbackContent(slotCount) {
            const items = [];
            const fallbackSearches = ['music', 'trending', 'popular'];

            for (let i = 0; i < slotCount; i++) {
                const searchTerm = fallbackSearches[i % fallbackSearches.length];
                items.push({
                    type: 'placeholder',
                    searchTerm: searchTerm,
                    platform: 'youtube',
                    metadata: {
                        title: `Search: ${searchTerm}`,
                        description: 'Placeholder content'
                    }
                });
            }

            return items;
        }

        /**
         * Create content item metadata
         * @param {string} platform - Platform name
         * @param {string} searchTerm - Search term
         * @param {string} genre - Genre/category
         * @returns {Object} Content item object
         */
        createContentItem(platform, searchTerm, genre) {
            return {
                type: 'dynamic',
                platform: platform,
                searchTerm: searchTerm,
                genre: genre,
                cleanMode: this.contentPrefs.isCleanMode(),
                metadata: {
                    title: `${genre} - ${searchTerm}`,
                    description: `Content from ${platform}`,
                    generated: Date.now()
                }
            };
        }

        /**
         * Select platform based on weight distribution
         * @param {Object} weights - Platform weight object
         * @returns {string} Selected platform
         */
        selectPlatformByWeight(weights) {
            const random = Math.random();
            let cumulative = 0;

            for (const [platform, weight] of Object.entries(weights)) {
                cumulative += weight;
                if (random <= cumulative) {
                    return platform;
                }
            }

            // Fallback to first platform
            return Object.keys(weights)[0] || 'youtube';
        }

        /**
         * Check and perform daily rotation if needed
         */
        checkDailyRotation() {
            const hoursSinceRotation = (Date.now() - this.rotationState.lastRotation) / (1000 * 60 * 60);
            
            if (hoursSinceRotation >= 24) {
                this.rotationState.riser = null;
                this.rotationState.stage_small = null;
                this.rotationState.lastRotation = Date.now();
            }
        }

        /**
         * Shuffle array (Fisher-Yates algorithm)
         * @param {Array} array - Array to shuffle
         * @returns {Array} Shuffled array
         */
        shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        }

        /**
         * Force regenerate content for furniture (refresh button)
         * @param {string} furnitureType - Furniture type
         * @param {string} furnitureUUID - Furniture UUID
         * @param {number} slotCount - Number of slots
         * @returns {Object} New content configuration
         */
        refreshContent(furnitureType, furnitureUUID, slotCount) {
            // Generate new content
            const config = this.generateContentConfig(furnitureType, slotCount);
            
            // Mark as refreshed
            if (this.contentPrefs) {
                this.contentPrefs.markRefreshed();
            }

            return config;
        }

        /**
         * Get current genre assignment for furniture
         * @param {string} furnitureType - Furniture type
         * @returns {string|null} Assigned genre or null
         */
        getCurrentGenre(furnitureType) {
            return this.rotationState[furnitureType] || null;
        }

        /**
         * Force genre for furniture (override rotation)
         * @param {string} furnitureType - Furniture type
         * @param {string} genreId - Genre ID to assign
         */
        setGenre(furnitureType, genreId) {
            this.rotationState[furnitureType] = genreId;
        }

        /**
         * Construct URL from platform and search term
         * @param {string} platform - Platform name (youtube, spotify, etc.)
         * @param {string} searchTerm - Search query term
         * @returns {string} Constructed URL for the platform search
         */
        constructUrlFromPlatformAndSearch(platform, searchTerm) {
            const encodedTerm = encodeURIComponent(searchTerm);
            
            const urlTemplates = {
                'youtube': `https://www.youtube.com/results?search_query=${encodedTerm}`,
                'spotify': `https://open.spotify.com/search/${encodedTerm}`,
                'deezer': `https://www.deezer.com/search/${encodedTerm}`,
                'soundcloud': `https://soundcloud.com/search?q=${encodedTerm}`,
                'vimeo': `https://vimeo.com/search?q=${encodedTerm}`,
                'dailymotion': `https://www.dailymotion.com/search/${encodedTerm}`,
                'tiktok': `https://www.tiktok.com/search?q=${encodedTerm}`,
                'instagram': `https://www.instagram.com/explore/tags/${encodedTerm}/`,
                'snapchat': `https://www.snapchat.com/search?q=${encodedTerm}`
            };
            
            const url = urlTemplates[platform.toLowerCase()];
            if (!url) {
                console.warn(`⚠️ Unknown platform "${platform}", falling back to YouTube`);
                return urlTemplates['youtube'];
            }
            
            return url;
        }

        /**
         * Refresh all furniture content based on updated preferences
         * Called when user changes music genres in preferences dialog
         */
        async refreshAllFurniture() {
            // Prevent concurrent refreshes
            if (this.isRefreshing) {
                console.warn('⚠️ Refresh already in progress, ignoring request');
                return;
            }
            
            // Check if required managers exist
            if (!window.app || !window.app.furnitureManager) {
                console.warn('⚠️ furnitureManager not available, cannot refresh furniture');
                return;
            }
            
            if (!window.app.fileObjectManager) {
                console.warn('⚠️ fileObjectManager not available, cannot refresh furniture');
                return;
            }
            
            if (!window.app.urlManager) {
                console.warn('⚠️ urlManager not available, cannot refresh furniture');
                return;
            }
            
            // Set refresh flag
            this.isRefreshing = true;

            // Initialize refresh tracking
            if (!window.REFRESH_CALL_COUNT) window.REFRESH_CALL_COUNT = 0;
            window.REFRESH_CALL_COUNT++;
            const callId = window.REFRESH_CALL_COUNT;
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            
            console.log(`🔄 [REFRESH #${callId}] refreshAllFurniture() called at ${timestamp}`);

            // CRITICAL: Request fresh recommendations from Dart (real content URLs with thumbnails)
            console.log(`📡 [REFRESH #${callId}] Requesting fresh recommendations from Dart...`);
            
            // Check if callback is already registered (double refresh issue)
            if (window.onRecommendationsRefreshed) {
                console.warn(`⚠️ [REFRESH #${callId}] WARNING: onRecommendationsRefreshed callback already exists! This will be overwritten.`);
            }
            
            // Set up callback for when Dart finishes injecting recommendations
            window.onRecommendationsRefreshed = async () => {
                const callbackTimestamp = new Date().toISOString().split('T')[1].split('.')[0];
                console.log(`✅ [REFRESH #${callId}] onRecommendationsRefreshed callback fired at ${callbackTimestamp}`);
                delete window.onRecommendationsRefreshed; // Clean up callback
                
                // Now proceed with furniture refresh using fresh DART_RECOMMENDATIONS
                await this._performFurnitureRefresh();
                
                // Clear refresh flag when complete
                this.isRefreshing = false;
            };
            
            // Set up error callback
            window.onRecommendationsRefreshFailed = async () => {
                console.error('❌ Failed to fetch fresh recommendations, using cached data');
                delete window.onRecommendationsRefreshFailed; // Clean up callback
                
                // Proceed anyway with whatever is in DART_RECOMMENDATIONS (cached)
                await this._performFurnitureRefresh();
                
                // Clear refresh flag when complete
                this.isRefreshing = false;
            };
            
            // Request fresh recommendations from Dart via channel
            if (window.RefreshRecommendationsChannel) {
                console.log(`📡 [REFRESH #${callId}] Calling RefreshRecommendationsChannel...`);
                window.RefreshRecommendationsChannel.postMessage('refresh');
            } else {
                console.warn(`⚠️ [REFRESH #${callId}] RefreshRecommendationsChannel not available, using cached recommendations`);
                // Proceed with cached data
                await this._performFurnitureRefresh();
                // Clear refresh flag
                this.isRefreshing = false;
            }
        }

        /**
         * Refresh a single furniture piece by its ID
         * Called when user clicks refresh button on specific furniture piece
         * @param {string} furnitureId - UUID of furniture piece to refresh
         */
        async refreshSingleFurniture(furnitureId) {
            // Prevent concurrent refreshes
            if (this.isRefreshing) {
                console.warn('⚠️ Refresh already in progress, ignoring request');
                return;
            }
            
            // Check if required managers exist
            if (!window.app || !window.app.furnitureManager) {
                console.warn('⚠️ furnitureManager not available, cannot refresh furniture');
                return;
            }
            
            if (!window.app.fileObjectManager) {
                console.warn('⚠️ fileObjectManager not available, cannot refresh furniture');
                return;
            }
            
            if (!window.app.urlManager) {
                console.warn('⚠️ urlManager not available, cannot refresh furniture');
                return;
            }
            
            // Set refresh flag
            this.isRefreshing = true;

            // CRITICAL: Request fresh recommendations from Dart (real content URLs with thumbnails)
            console.log('📡 Requesting fresh recommendations from Dart...');
            
            // CRITICAL: Clear deduplication history for force refresh
            // This allows the same content to appear again if it's still trending/popular
            if (window.contentDeduplication) {
                console.log('🧹 Clearing deduplication history for force refresh...');
                window.contentDeduplication.clearHistory();
            }
            
            // Set up callback for when Dart finishes injecting recommendations
            window.onRecommendationsRefreshed = async () => {
                delete window.onRecommendationsRefreshed; // Clean up callback
                
                // Now proceed with furniture refresh using fresh DART_RECOMMENDATIONS
                await this._performFurnitureRefresh(furnitureId);
                
                // Clear refresh flag when complete
                this.isRefreshing = false;
            };
            
            // Set up error callback
            window.onRecommendationsRefreshFailed = async () => {
                console.error('❌ Failed to fetch fresh recommendations, using cached data');
                delete window.onRecommendationsRefreshFailed; // Clean up callback
                
                // Proceed anyway with whatever is in DART_RECOMMENDATIONS (cached)
                await this._performFurnitureRefresh(furnitureId);
                
                // Clear refresh flag when complete
                this.isRefreshing = false;
            };
            
            // Request fresh recommendations from Dart via channel
            if (window.RefreshRecommendationsChannel) {
                console.log('📡 Calling RefreshRecommendationsChannel...');
                window.RefreshRecommendationsChannel.postMessage('refresh');
            } else {
                console.warn('⚠️ RefreshRecommendationsChannel not available, using cached recommendations');
                // Proceed with cached data
                await this._performFurnitureRefresh(furnitureId);
                // Clear refresh flag
                this.isRefreshing = false;
            }
        }

        /**
         * Perform the actual furniture refresh using window.DART_RECOMMENDATIONS
         * Separated from refreshAllFurniture() to allow async callback after Dart injection
         * @param {string|null} specificFurnitureId - If provided, only refresh this furniture piece
         */
        async _performFurnitureRefresh(specificFurnitureId = null) {
            // Get furniture pieces (all or specific one)
            let furniturePieces;
            if (specificFurnitureId) {
                const furniture = window.app.furnitureManager.getFurniture(specificFurnitureId);
                if (!furniture) {
                    console.error(`❌ Furniture not found: ${specificFurnitureId.substring(0, 8)}`);
                    return;
                }
                furniturePieces = [furniture];
            } else {
                furniturePieces = window.app.furnitureManager.getAllFurniture();
            }
            
            if (!furniturePieces || furniturePieces.length === 0) {
                return;
            }
            
            // STEP 0: Pre-collect URLs from ALL furniture pieces BEFORE merging playlists
            // This ensures deduplication doesn't filter out URLs we're about to remove
            const allUrlsToCleanup = [];
            for (const furniture of furniturePieces) {
                const existingObjectIds = furniture.objectIds.filter(id => id);
                for (const objectId of existingObjectIds) {
                    try {
                        const object = window.app.stateManager.fileObjects.find(obj => obj.userData.id === objectId);
                        if (object && object.userData.url) {
                            allUrlsToCleanup.push(object.userData.url);
                        }
                    } catch (error) {
                        console.error(`❌ Error collecting URL from object ${objectId}:`, error);
                    }
                }
            }
            
            // Clear URLs from deduplication BEFORE merging playlists
            // This allows removed content to be re-used in the refresh
            if (window.contentDeduplication && allUrlsToCleanup.length > 0) {
                window.contentDeduplication.clearUrls(allUrlsToCleanup);
                console.log(`🧹 Pre-cleared ${allUrlsToCleanup.length} URLs from deduplication before playlist merge`);
            }
            
            // SMART MERGE: Combine API content (YouTube) with hardcoded content (Vimeo, TikTok, Instagram, Spotify)
            // Now deduplication filtering won't exclude the URLs we just cleared
            const playlistSource = this._mergePlaylists(
                window.DART_RECOMMENDATIONS,
                window.DEMO_PLAYLISTS
            );
            
            if (!playlistSource || Object.keys(playlistSource).length === 0) {
                console.warn('⚠️ No playlist source available, cannot refresh furniture');
                return;
            }
            
            // Create spawner instance for placing objects on furniture
            const spawner = new window.DefaultFurnitureSpawner(window.app.furnitureManager, window.app);
            
            // CRITICAL: Explicitly disable skipMetadataFetching during refresh
            // We need full metadata (titles, thumbnails) for refreshed content
            // First install uses skipMetadataFetching=true for speed, but refresh must fetch full data
            window.skipMetadataFetching = false;
            
            try {
                // Refresh each furniture piece sequentially
                for (const furniture of furniturePieces) {
                try {
                    const furnitureType = furniture.type;
                    const furnitureId = furniture.id;
                    
                    console.log(`🔍 [REFRESH DEBUG] Processing furniture type: "${furnitureType}", ID: ${furnitureId.substring(0, 8)}`);
                    console.log(`🔍 [REFRESH DEBUG] Available playlists:`, Object.keys(playlistSource));
                    
                    // Find matching playlist for this furniture type
                    const playlist = Object.values(playlistSource).find(
                        p => p.furnitureType === furnitureType
                    );
                    
                    console.log(`🔍 [REFRESH DEBUG] Playlist found for "${furnitureType}":`, playlist ? `YES (${playlist.links?.length || 0} links)` : 'NO');
                    
                    if (!playlist || !playlist.links || playlist.links.length === 0) {
                        console.warn(`⚠️ Skipping ${furnitureType} - no playlist or empty links`);
                        continue;
                    }
                    
                    // VALIDATION: Gallery Wall should ONLY have video content (YouTube, Vimeo, TikTok, Instagram)
                    // Filter out any Spotify or Deezer audio tracks
                    if (furnitureType === 'gallery_wall') {
                        const originalLength = playlist.links.length;
                        playlist.links = playlist.links.filter(link => {
                            const isSpotify = link.includes('spotify.com');
                            const isDeezer = link.includes('deezer.com');
                            const isAudio = isSpotify || isDeezer;
                            return !isAudio;
                        });
                        
                        // If no valid links remain after filtering, skip this furniture
                        if (playlist.links.length === 0) {
                            console.error(`❌ Gallery Wall playlist has no valid video links after filtering audio content - skipping`);
                            continue;
                        }
                    }
                    
                    // STEP 1: Remove API-generated objects from furniture, PRESERVE manually placed ones
                    // CRITICAL FIX: Only remove objects that were generated by refresh/API
                    // Keep objects that were manually placed by the user (via "Add to Furniture" menu)
                    const existingObjectIds = furniture.objectIds.filter(id => id); // Filter out nulls
                    
                    console.log(`🔄 Furniture ${furnitureType} has ${existingObjectIds.length} existing objects`);
                    
                    // Track which slots have manually placed content (to preserve them)
                    const manuallyPlacedSlots = new Set();
                    
                    for (let i = 0; i < furniture.objectIds.length; i++) {
                        const objectId = furniture.objectIds[i];
                        if (!objectId) continue;
                        
                        // Find the object to check if it's manually placed
                        const object = window.app.stateManager.fileObjects.find(obj => obj.userData.id === objectId);
                        
                        if (object && object.userData.manuallyPlaced) {
                            // This object was manually placed by user - PRESERVE IT
                            console.log(`🔄 Preserving manually placed object ${objectId} in slot ${i}`);
                            manuallyPlacedSlots.add(i);
                            continue; // Skip removal for this object
                        }
                        
                        // This object was API-generated - REMOVE IT during refresh
                        try {
                            // Clean up label explicitly using the object's UUID
                            if (object && window.linkTitleManager) {
                                window.linkTitleManager.removeLabel(object.uuid);
                            }
                            
                            // Remove from furniture tracking
                            furniture.removeObject(objectId);
                            
                            // Delete the actual 3D object from scene
                            window.app.fileObjectManager.removeObjectById(objectId);
                            console.log(`🔄 Removed API-generated object ${objectId} from slot ${i}`);
                        } catch (error) {
                            console.error(`❌ Error removing object ${objectId}:`, error);
                        }
                    }
                    
                    console.log(`🔄 Preserved ${manuallyPlacedSlots.size} manually placed objects`);
                    
                    // STEP 2: Safety cleanup - remove any orphaned labels in the scene
                    // This catches labels that weren't properly cleaned up
                    if (window.linkTitleManager && window.linkTitleManager.labels) {
                        const labelsToRemove = [];
                        window.linkTitleManager.labels.forEach((labelSprite, uuid) => {
                            // Check if the label's object still exists in the scene
                            const objectExists = window.app.stateManager.fileObjects.some(obj => obj.uuid === uuid);
                            if (!objectExists) {
                                labelsToRemove.push(uuid);
                            }
                        });
                        
                        // Remove orphaned labels
                        labelsToRemove.forEach(uuid => {
                            window.linkTitleManager.removeLabel(uuid);
                        });
                    }
                        
                    // STEP 3: Fill slots with retry logic - keep fetching until all slots filled
                    const slotPositions = furniture.positions || [];
                    const targetSlotCount = slotPositions.length;
                    
                    // CRITICAL: Deduplicate URLs before creating objects to prevent duplicates on riser/gallery
                    let availableLinks = [...playlist.links]; // Copy array for consumption
                    const uniqueLinks = [...new Set(availableLinks)]; // Remove duplicates
                    if (uniqueLinks.length < availableLinks.length) {
                        console.log(`🔄 Removed ${availableLinks.length - uniqueLinks.length} duplicate URLs from ${furnitureType} playlist`);
                        availableLinks = uniqueLinks;
                    }
                    
                    let attempt = 0;
                    const MAX_ATTEMPTS = 3;
                    
                    console.log(`🔄 Starting fill process for ${furnitureType}: ${targetSlotCount} slots to fill, ${availableLinks.length} unique links available`);
                    
                    while (attempt < MAX_ATTEMPTS) {
                        attempt++;
                        
                        // Count currently filled slots
                        const currentlyFilled = furniture.objectIds.filter(id => id).length;
                        const slotsNeeded = targetSlotCount - currentlyFilled;
                        
                        if (slotsNeeded <= 0) {
                            console.log(`✅ All ${targetSlotCount} slots filled for ${furnitureType}`);
                            break; // SUCCESS - all slots filled
                        }
                        
                        console.log(`🔄 Attempt ${attempt}/${MAX_ATTEMPTS}: ${currentlyFilled}/${targetSlotCount} filled, need ${slotsNeeded} more objects`);
                        
                        // If we're out of links and need more, request additional recommendations
                        if (availableLinks.length === 0 && slotsNeeded > 0) {
                            console.log(`📡 No more links available, requesting ${slotsNeeded * 2} additional recommendations from API...`);
                            const additionalLinks = await this._requestMoreRecommendations(furnitureType, slotsNeeded * 2);
                            
                            if (additionalLinks && additionalLinks.length > 0) {
                                // Filter audio from gallery_wall if needed
                                let filteredLinks = additionalLinks;
                                if (furnitureType === 'gallery_wall') {
                                    filteredLinks = additionalLinks.filter(link => {
                                        return !link.includes('spotify.com') && !link.includes('deezer.com');
                                    });
                                }
                                
                                // CRITICAL: Deduplicate new links to prevent adding same URL twice
                                const uniqueFiltered = [...new Set(filteredLinks)];
                                if (uniqueFiltered.length < filteredLinks.length) {
                                    console.log(`🔄 Removed ${filteredLinks.length - uniqueFiltered.length} duplicate URLs from additional recommendations`);
                                }
                                
                                availableLinks = uniqueFiltered;
                                console.log(`📥 Received ${additionalLinks.length} additional links (${availableLinks.length} after filtering and deduplication)`);
                            } else {
                                console.warn(`⚠️ No additional recommendations available after attempt ${attempt}`);
                                break; // Can't get more content
                            }
                        }
                        
                        // Find empty slot indices
                        // CRITICAL FIX: Use slotPositions.length instead of objectIds.length
                        // For newly created furniture, objectIds is an empty array but positions exist
                        const emptySlotIndices = [];
                        const totalSlots = slotPositions.length; // Use position count as source of truth
                        for (let i = 0; i < totalSlots; i++) {
                            if (!furniture.objectIds[i]) {
                                emptySlotIndices.push(i);
                            }
                        }
                        
                        console.log(`🔍 [SLOT DEBUG] Furniture has ${totalSlots} total slots, objectIds length: ${furniture.objectIds.length}, found ${emptySlotIndices.length} empty slots`);
                        
                        // Try to fill empty slots with available links
                        const linksToTry = Math.min(availableLinks.length, emptySlotIndices.length);
                        
                        // PERFORMANCE OPTIMIZATION: Process objects in batches instead of one-by-one
                        // This significantly speeds up refresh by parallelizing metadata fetches
                        const BATCH_SIZE = 5; // Process 5 objects at a time
                        
                        for (let batchStart = 0; batchStart < linksToTry; batchStart += BATCH_SIZE) {
                            const batchEnd = Math.min(batchStart + BATCH_SIZE, linksToTry);
                            const batchPromises = [];
                            
                            console.log(`🔄 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: slots ${batchStart}-${batchEnd - 1}`);
                            
                            for (let i = batchStart; i < batchEnd; i++) {
                                const slotIdx = emptySlotIndices[i];
                                const link = availableLinks.shift(); // Remove from available links
                                const slotPos = slotPositions[slotIdx];
                                
                                if (!slotPos) continue;
                                
                                // Create object creation promise (don't await yet)
                                const createPromise = (async () => {
                                    try {
                                        // Create and assign link object to furniture slot using spawner
                                        const createdObj = await spawner.createAndAssignDemoLink(
                                            furniture,
                                            slotPos,
                                            link,
                                            slotIdx,
                                            window.app.urlManager
                                        );
                                        
                                        if (createdObj) {
                                            console.log(`✅ Created object for slot ${slotIdx}`);
                                        } else {
                                            console.warn(`⚠️ Failed to create object for slot ${slotIdx}`);
                                        }
                                    } catch (error) {
                                        console.error(`❌ Error creating object for slot ${slotIdx}:`, error);
                                    }
                                })();
                                
                                batchPromises.push(createPromise);
                            }
                            
                            // Wait for entire batch to complete before moving to next batch
                            await Promise.all(batchPromises);
                            
                            // Small delay between batches to prevent overwhelming the system
                            // Much faster than 200ms per object (was 2000ms for 10 objects, now ~400ms total)
                            if (batchEnd < linksToTry) {
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                        }
                        
                        // If no more links available and still have empty slots, we'll loop again
                        if (availableLinks.length === 0 && emptySlotIndices.length > 0) {
                            console.log(`🔄 Out of links, will request more on next iteration...`);
                        }
                    }
                    
                    // Final check and report
                    const finalFilled = furniture.objectIds.filter(id => id).length;
                    if (finalFilled < targetSlotCount) {
                        console.warn(`⚠️ Only filled ${finalFilled}/${targetSlotCount} slots for ${furnitureType} after ${attempt} attempts`);
                    } else {
                        console.log(`🎉 Successfully filled all ${finalFilled}/${targetSlotCount} slots for ${furnitureType}`);
                    }
                    
                    // CRITICAL: Save this furniture's data to persist objectIds array
                    console.log(`💾 Saving furniture data for ${furniture.id} after refresh...`);
                    await window.app.furnitureManager.storageManager.updateFurniture(furniture);
                } catch (error) {
                    console.error(`❌ Error refreshing furniture ${furniture.id}:`, error);
                }
            }
            } catch (error) {
                console.error('❌ Error during furniture refresh:', error);
            }
        }

        /**
         * Request additional recommendations from Dart API to fill empty slots
         * @param {string} furnitureType - Furniture type needing more content
         * @param {number} count - Number of additional links requested
         * @returns {Promise<Array<string>>} Array of additional link URLs
         */
        async _requestMoreRecommendations(furnitureType, count) {
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.warn('⏱️ Timeout waiting for additional recommendations');
                    resolve([]);
                }, 5000); // 5 second timeout
                
                // Set up callback for when Dart returns additional recommendations
                window.onAdditionalRecommendations = (data) => {
                    clearTimeout(timeout);
                    delete window.onAdditionalRecommendations;
                    
                    if (data && data.recommendations) {
                        console.log(`✅ Received ${data.recommendations.length} additional recommendations from Dart`);
                        resolve(data.recommendations);
                    } else {
                        console.warn('⚠️ No recommendations in response');
                        resolve([]);
                    }
                };
                
                // Request additional recommendations from Dart via channel
                if (window.RefreshRecommendationsChannel) {
                    const request = {
                        action: 'getAdditionalRecommendations',
                        furnitureType: furnitureType,
                        count: count
                    };
                    console.log(`📡 Requesting additional recommendations:`, request);
                    window.RefreshRecommendationsChannel.postMessage(JSON.stringify(request));
                } else {
                    console.warn('⚠️ RefreshRecommendationsChannel not available, cannot request more content');
                    clearTimeout(timeout);
                    resolve([]);
                }
            });
        }

        /**
         * Merge API-based recommendations with hardcoded content for platform diversity
         * @param {Object} dartRecs - API recommendations (YouTube, Dailymotion from Dart)
         * @param {Object} demoPlaylists - Hardcoded playlists (Vimeo, TikTok, Instagram, Spotify)
         * @returns {Object} Merged playlists
         */
        _mergePlaylists(dartRecs, demoPlaylists) {
            if (!demoPlaylists) {
                console.warn('⚠️ No DEMO_PLAYLISTS available, using only Dart recommendations');
                return dartRecs || {};
            }
            
            const merged = {};
            
            // Get user's selected genres for filtering
            const selectedGenres = window.contentPrefs ? window.contentPrefs.getSelectedGenres() : [];
            console.log(`🎭 [GENRE FILTER] Content preferences service available: ${!!window.contentPrefs}`);
            console.log(`🎭 [GENRE FILTER] Selected genres: ${selectedGenres ? selectedGenres.join(', ') : 'NONE'} (${selectedGenres ? selectedGenres.length : 0} genres)`);
            if (!selectedGenres || selectedGenres.length === 0) {
                console.log(`⚠️ [GENRE FILTER] No genres selected - all content will be shown`);
            }
            
            // Process each furniture type
            Object.entries(demoPlaylists).forEach(([playlistKey, demoPlaylist]) => {
                const furnitureType = demoPlaylist.furnitureType;
                
                // Find matching Dart recommendations for this furniture type
                const dartPlaylist = dartRecs && Object.values(dartRecs).find(
                    p => p.furnitureType === furnitureType
                );
                
                // Start with API content - different platforms for different furniture
                let apiLinks = [];
                if (dartPlaylist && dartPlaylist.links) {
                    // GENRE FILTERING: Parse genre tags from remote config URLs
                    let rawLinks = dartPlaylist.links;
                    if (window.genreParser && selectedGenres.length > 0) {
                        const genreFiltered = window.genreParser.parseAndFilter(rawLinks, selectedGenres);
                        rawLinks = genreFiltered.map(item => item.url);
                        console.log(`🎵 Genre filtered ${furnitureType}: ${dartPlaylist.links.length} → ${rawLinks.length} URLs`);
                    }
                    
                    // Filter by platform type for furniture
                    if (furnitureType === 'stage_small') {
                        // Stage gets AUDIO platforms: Spotify, Deezer, YouTube (audio), SoundCloud (all from remote config)
                        apiLinks = rawLinks.filter(link => {
                            return link.includes('spotify.com') || 
                                   link.includes('deezer.com') ||
                                   link.includes('soundcloud.com') ||
                                   link.includes('youtube.com') ||
                                   link.includes('youtu.be');
                        });
                    } else {
                        // Gallery Wall and Riser get VIDEO platforms: YouTube, Dailymotion, Vimeo, TikTok, Instagram (all from remote config)
                        apiLinks = rawLinks.filter(link => {
                            return link.includes('youtube.com') || 
                                   link.includes('youtu.be') ||
                                   link.includes('dailymotion.com') ||
                                   link.includes('vimeo.com') ||
                                   link.includes('tiktok.com') ||
                                   link.includes('instagram.com');
                        });
                    }
                }
                
                // Add hardcoded content (non-API platforms)
                const hardcodedLinks = demoPlaylist.links || [];
                
                // Merge: API content first, then hardcoded content
                let mergedLinks = [...apiLinks, ...hardcodedLinks];
                
                // DEDUPLICATION: Filter out recently shown URLs
                if (window.contentDeduplication) {
                    const beforeCount = mergedLinks.length;
                    mergedLinks = window.contentDeduplication.filterRecentlyShown(mergedLinks);
                    if (beforeCount > mergedLinks.length) {
                        console.log(`🔄 Deduplication ${furnitureType}: ${beforeCount} → ${mergedLinks.length} URLs (removed ${beforeCount - mergedLinks.length} recent)`);
                    }
                }
                
                // FEEDBACK FILTERING: Remove disliked content
                if (window.mediaFeedback) {
                    const beforeCount = mergedLinks.length;
                    mergedLinks = window.mediaFeedback.filterDisliked(mergedLinks);
                    if (beforeCount > mergedLinks.length) {
                        console.log(`👎 Feedback filter ${furnitureType}: removed ${beforeCount - mergedLinks.length} disliked URLs`);
                    }
                }
                
                // Limit to reasonable count per furniture type
                const maxLinks = furnitureType === 'gallery_wall' ? 10 : 
                                furnitureType === 'stage_small' ? 30 : 
                                furnitureType === 'riser' ? 40 : 
                                furnitureType === 'amphitheatre' ? 15 : 
                                10;
                const finalLinks = mergedLinks.slice(0, maxLinks);
                
                // Mark filtered URLs as shown for deduplication tracking
                if (window.contentDeduplication && finalLinks.length > 0) {
                    finalLinks.forEach(url => window.contentDeduplication.markAsShown(url));
                }
                
                merged[playlistKey] = {
                    ...demoPlaylist,
                    links: finalLinks
                };
            });
            
            return merged;
        }
    }

    // ============================================================================
    // GLOBAL INSTANCE
    // ============================================================================
    
    window.DynamicContentGenerator = DynamicContentGenerator;
    
    // Create global instance
    if (!window.contentGenerator) {
        window.contentGenerator = new DynamicContentGenerator();
    }
})();
