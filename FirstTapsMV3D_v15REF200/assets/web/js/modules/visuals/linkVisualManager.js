// modules/visuals/linkVisualManager.js
// Dependencies: THREE (global), window.SharedStateManager
// Exports: window.LinkVisualManager

(function() {
    'use strict';
    
    // Debug flag - set to false to disable verbose logging
    const DEBUG = false;
    
    if (DEBUG) console.log("Loading LinkVisualManager module...");
    
    /**
     * Link Visual Manager - Handles logos, favicons, and category-based appearance for link objects
     */
    class LinkVisualManager {
        constructor(THREE, scene, stateManager) {
            this.THREE = THREE;
            this.scene = scene;
            this.stateManager = stateManager;
            
            // Initialize texture cache
            this.textureCache = new Map();
            
            // CRITICAL: Global thumbnail cache that persists across object recreations (furniture refresh)
            // Maps URL -> thumbnail URL to survive object deletion/recreation
            this.tiktokThumbnailCache = new Map();
            
            // CRITICAL: Pending fetches cache to prevent duplicate concurrent requests
            // Maps URL -> Promise to deduplicate simultaneous fetches during bulk object creation
            this.tiktokPendingFetches = new Map();
            
            // Initialize category system
            this.initializeCategorySystem();
            
            // Initialize pre-built logo cache
            this.initializeLogoCache();
            
            if (DEBUG) console.log('LinkVisualManager initialized');
        }

        /**
         * Fetch with timeout to prevent long delays on CORS errors
         * @param {string} url - URL to fetch
         * @param {number} timeout - Timeout in milliseconds (default: 3000ms)
         * @returns {Promise<Response>} - Fetch response
         */
        async fetchWithTimeout(url, timeout = 3000) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                // Detect CORS errors and fail fast
                if (error.name === 'AbortError') {
                    console.warn(`⚡ Fast-fail: Request timed out after ${timeout}ms:`, url);
                } else if (error.message && error.message.includes('CORS')) {
                    console.warn('⚡ Fast-fail: CORS error detected:', url);
                }
                throw error;
            }
        }

        /**
         * Check if URL is a search/browse page (no specific content ID)
         * Search/browse URLs don't have thumbnails in oEmbed APIs
         * @param {string} url - URL to check
         * @returns {boolean} - True if URL is a search/browse page
         */
        isSearchOrBrowseUrl(url) {
            const lowerUrl = url.toLowerCase();
            
            // Common search/browse patterns
            const searchPatterns = [
                '/search',
                '/results',
                '/browse',
                '/explore',
                'search_query=',
                'search?q=',
                'q='
            ];
            
            return searchPatterns.some(pattern => lowerUrl.includes(pattern));
        }

        /**
         * Initialize category system with colors and patterns
         */
        initializeCategorySystem() {
            // Brand-specific color overrides (takes precedence over category colors)
            this.brandColors = {
                'walmart.com': 0x0071CE,       // Walmart Blue
                'amazon.com': 0xFF9900,        // Amazon Orange
                'ebay.com': 0x0064D2,          // eBay Blue
                'facebook.com': 0x1877F2,      // Facebook Blue
                'twitter.com': 0x1DA1F2,       // Twitter Blue
                'instagram.com': 0xE4405F,     // Instagram Pink
                'linkedin.com': 0x0A66C2,      // LinkedIn Blue
                'youtube.com': 0xFF0000,       // YouTube Red
                'youtu.be': 0xFF0000,          // YouTube Red (short URLs)
                'tiktok.com': 0x000000,        // TikTok Black
                'reddit.com': 0xFF4500,        // Reddit Orange
                'discord.com': 0x5865F2,       // Discord Blurple
                'google.com': 0x4285F4,        // Google Blue
                'microsoft.com': 0x00BCF2,     // Microsoft Blue
                'apple.com': 0x1D1D1F,         // Apple Dark Gray
                'netflix.com': 0xE50914,       // Netflix Red
                'spotify.com': 0x1DB954,       // Spotify Green
                'paypal.com': 0x003087,        // PayPal Blue
                'github.com': 0x181717,        // GitHub Dark
                'stackoverflow.com': 0xF58025, // Stack Overflow Orange
                // MV3D: Music & Podcast Platforms
                'pandora.com': 0x00A0EE,       // Pandora Blue
                'music.apple.com': 0xFA243C,   // Apple Music Red
                'soundcloud.com': 0xFF5500,    // SoundCloud Orange
                'tidal.com': 0x000000,         // Tidal Black
                'music.amazon.com': 0xFF9900,  // Amazon Music Orange
                'deezer.com': 0xFF0000,        // Deezer Red
                'podcasts.apple.com': 0x872EC4,// Apple Podcasts Purple
                'podcasts.google.com': 0x4285F4,// Google Podcasts Blue
                // MV3D: Video Platforms
                'vimeo.com': 0x1AB7EA,         // Vimeo Blue
                'twitch.tv': 0x9146FF,         // Twitch Purple
                'dailymotion.com': 0x00D3FF,   // Dailymotion Blue
            };

            this.categoryConfig = {
                // Social media - vibrant blue
                'social': {
                    color: 0x1DA1F2,
                    pattern: 'gradient',
                    description: 'Social Networks',
                    domains: ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'tiktok.com', 'reddit.com', 'discord.com']
                },
                // Shopping - green
                'shopping': {
                    color: 0x00A651,
                    pattern: 'solid',
                    description: 'Shopping & E-commerce',
                    domains: ['amazon.com', 'ebay.com', 'etsy.com', 'shopify.com', 'walmart.com', 'alibaba.com', 'target.com']
                },
                // News & media - orange
                'news': {
                    color: 0xFF6B35,
                    pattern: 'gradient',
                    description: 'News & Media',
                    domains: ['cnn.com', 'bbc.com', 'nytimes.com', 'reuters.com', 'npr.org', 'techcrunch.com', 'wired.com']
                },
                // Tech & development - purple
                'tech': {
                    color: 0x6F42C1,
                    pattern: 'solid',
                    description: 'Technology & Development',
                    domains: ['github.com', 'stackoverflow.com', 'google.com', 'microsoft.com', 'apple.com', 'developer.mozilla.org']
                },
                // Video platforms - red
                'video': {
                    color: 0xFF0000,
                    pattern: 'gradient',
                    description: 'Video Platforms',
                    domains: ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv']
                },
                // MV3D: Music platforms - green
                'music': {
                    color: 0x1DB954,
                    pattern: 'gradient',
                    description: 'Music Streaming',
                    domains: ['spotify.com', 'pandora.com', 'music.apple.com', 'soundcloud.com', 'tidal.com', 'music.amazon.com', 'deezer.com']
                },
                // MV3D: Podcast platforms - purple
                'podcasts': {
                    color: 0x872EC4,
                    pattern: 'solid',
                    description: 'Podcasts & Audio',
                    domains: ['podcasts.apple.com', 'podcasts.google.com', 'stitcher.com', 'pocketcasts.com', 'overcast.fm']
                },
                // Entertainment - red
                'entertainment': {
                    color: 0xDC3545,
                    pattern: 'gradient',
                    description: 'Entertainment & Streaming',
                    domains: ['netflix.com', 'hulu.com', 'disney.com', 'hbo.com', 'primevideo.com']
                },
                // Education - blue
                'education': {
                    color: 0x007BFF,
                    pattern: 'solid',
                    description: 'Education & Learning',
                    domains: ['wikipedia.org', 'coursera.org', 'edx.org', 'khanacademy.org', 'mit.edu', 'stanford.edu']
                },
                // Business - teal
                'business': {
                    color: 0x20C997,
                    pattern: 'solid',
                    description: 'Business & Finance',
                    domains: ['paypal.com', 'chase.com', 'wellsfargo.com', 'bankofamerica.com', 'bloomberg.com', 'finance.yahoo.com']
                },
                // Government - dark blue
                'government': {
                    color: 0x495057,
                    pattern: 'solid',
                    description: 'Government & Official',
                    tlds: ['.gov', '.mil', '.edu']
                },
                // Default fallback
                'general': {
                    color: 0x6C757D,
                    pattern: 'solid',
                    description: 'General Websites',
                    domains: []
                }
            };
        }

        /**
         * Initialize pre-built logo cache for major sites
         */
        initializeLogoCache() {
            // This will be populated with base64-encoded logos for major sites
            // For now, we'll use emoji/text representations
            this.preBuiltLogos = {
                'google.com': 'G',
                'youtube.com': 'YT',
                'youtu.be': 'YT', // YouTube short URLs
                'facebook.com': 'FB',
                'twitter.com': 'TW',
                'instagram.com': 'Instagram Link',
                'linkedin.com': 'IN',
                'tiktok.com': 'TT',
                'github.com': 'GH',
                'stackoverflow.com': 'SO',
                'wikipedia.org': 'WP',
                'amazon.com': 'AM',
                'netflix.com': 'NF',
                'spotify.com': 'SP',
                'reddit.com': 'RD',
                'discord.com': 'DC',
                'twitch.tv': 'TW',
                'apple.com': 'AP',
                'microsoft.com': 'MS',
                'slack.com': 'SL',
                'zoom.us': 'ZM',
                'dropbox.com': 'DB',
                'walmart.com': 'W',
                'ebay.com': 'E',
                'paypal.com': 'PP',
                // MV3D: Music & Podcast Platforms
                'pandora.com': 'PD',
                'music.apple.com': 'AM',
                'soundcloud.com': 'SC',
                'tidal.com': 'TD',
                'music.amazon.com': 'AZ',
                'deezer.com': 'DZ',
                'podcasts.apple.com': 'PC',
                'podcasts.google.com': 'GP',
                'vimeo.com': 'VM',
                'dailymotion.com': 'DM',
                // Add more as needed
            };
        }

        /**
         * Extract Post ID from social media URLs for better default naming
         * @param {string} url - The URL to extract from
         * @returns {Object} - {platform, postId, suggestedName}
         */
        extractPostId(url) {
            try {
                const urlObj = new URL(url);
                const domain = urlObj.hostname.toLowerCase().replace('www.', '');
                
                // Instagram Post/Reel ID extraction
                if (domain === 'instagram.com') {
                    const reelMatch = url.match(/\/(?:reel|p)\/([^\/\?]+)/);
                    if (reelMatch && reelMatch[1]) {
                        const postType = url.includes('/reel/') ? 'Reel' : 'Post';
                        return {
                            platform: 'instagram',
                            postId: reelMatch[1],
                            suggestedName: `Instagram ${postType} ${reelMatch[1]}`
                        };
                    }
                }
                
                // TikTok Video ID extraction
                if (domain === 'tiktok.com') {
                    const videoMatch = url.match(/\/video\/([0-9]+)/);
                    if (videoMatch && videoMatch[1]) {
                        return {
                            platform: 'tiktok',
                            postId: videoMatch[1],
                            suggestedName: `TikTok Video ${videoMatch[1]}`
                        };
                    }
                    // Handle short URLs like vm.tiktok.com
                    const shortMatch = url.match(/\/([A-Za-z0-9]+)\/?$/);
                    if (shortMatch && shortMatch[1] && shortMatch[1].length < 15) {
                        return {
                            platform: 'tiktok',
                            postId: shortMatch[1],
                            suggestedName: `TikTok ${shortMatch[1]}`
                        };
                    }
                }
                
                // Snapchat Spotlight/Story ID extraction
                if (domain === 'snapchat.com' || domain.endsWith('.snapchat.com')) {
                    const spotlightMatch = url.match(/\/spotlight\/([^\/\?]+)/);
                    if (spotlightMatch && spotlightMatch[1]) {
                        return {
                            platform: 'snapchat',
                            postId: spotlightMatch[1],
                            suggestedName: `Snapchat Spotlight ${spotlightMatch[1]}`
                        };
                    }
                    const storyMatch = url.match(/\/(?:add|story)\/([^\/\?]+)/);
                    if (storyMatch && storyMatch[1]) {
                        return {
                            platform: 'snapchat',
                            postId: storyMatch[1],
                            suggestedName: `Snapchat Story ${storyMatch[1]}`
                        };
                    }
                }
                
                return null;
            } catch (error) {
                console.warn('Error extracting Post ID:', error);
                return null;
            }
        }

        /**
         * Enhance a link object with visual improvements
         * @param {Object} linkObject - Three.js link object
         * @param {Object} linkData - Link metadata (url, title, etc.)
         */
        async enhanceLinkObject(linkObject, linkData) {
            try {
                // Reduced logging to reduce console spam
                // console.log('🎨 [ENHANCE] Starting enhancement for:', linkData.title || linkData.url);
                // console.log('🎨 [ENHANCE] Object ID:', linkObject.userData.id);
                // console.log('🎨 [ENHANCE] URL:', linkData.url);
                
                // Check if already enhanced to avoid re-enhancement
                // CRITICAL: Always allow re-enhancement for branded objects to restore YouTube thumbnails
                // YouTube/media thumbnails get replaced when branding applies new materials
                const isBranded = linkObject.userData.brandingApplied;
                const wasEnhanced = linkObject.userData.visualEnhancement?.enhanced;
                
                if (wasEnhanced && !isBranded) {
                    if (DEBUG) console.log('🎨 [ENHANCE] Link object already enhanced, skipping...');
                    return;
                }
                
                if (wasEnhanced && isBranded) {
                    if (DEBUG) console.log('🎨 [ENHANCE] Re-enhancing branded object to restore YouTube thumbnails...');
                }
                
                // CRITICAL FIX: Initialize proper linkData structure for rename functionality
                // This ensures the rename menu can access and update linkData.title
                const url = linkData.url;
                const domain = url ? new URL(url).hostname.toLowerCase().replace('www.', '') : 'unknown';
                
                // Try to extract Post ID for better default names
                const postIdInfo = this.extractPostId(url);
                let defaultTitle = linkData.title || linkData.name || 'Link';
                
                // Use Post ID for better default name if no title provided
                if (!linkData.title && postIdInfo) {
                    defaultTitle = postIdInfo.suggestedName;
                    if (DEBUG) console.log(`📝 Using Post ID for default name: "${defaultTitle}"`);
                }
                
                // Create/ensure linkData structure exists (required for rename functionality)
                if (!linkObject.userData.linkData) {
                    linkObject.userData.linkData = {
                        title: defaultTitle,
                        url: url,
                        domain: domain,
                        description: linkData.description || '',
                        // CRITICAL FIX: Preserve thumbnailUrl for thumbnail persistence on reload
                        thumbnailUrl: linkData.thumbnailUrl || linkObject.userData.fileData?.thumbnailUrl || linkObject.userData.thumbnailUrl
                    };
                    if (DEBUG) console.log('🔧 [CRITICAL] Created linkData structure for object:', linkObject.userData.id);
                    if (DEBUG) console.log('📝 [CRITICAL] linkData.title:', linkObject.userData.linkData.title);
                    if (linkObject.userData.linkData.thumbnailUrl) {
                        if (DEBUG) console.log('📷 [CRITICAL] Preserved thumbnailUrl:', linkObject.userData.linkData.thumbnailUrl);
                    }
                } else {
                    // Ensure title exists even if structure was created elsewhere
                    if (!linkObject.userData.linkData.title) {
                        linkObject.userData.linkData.title = defaultTitle;
                        if (DEBUG) console.log('🔧 [CRITICAL] Updated missing linkData.title:', defaultTitle);
                    }
                    // CRITICAL FIX: Also ensure thumbnailUrl exists (for thumbnail persistence on reload)
                    if (!linkObject.userData.linkData.thumbnailUrl) {
                        linkObject.userData.linkData.thumbnailUrl = linkData.thumbnailUrl || linkObject.userData.fileData?.thumbnailUrl || linkObject.userData.thumbnailUrl;
                        if (linkObject.userData.linkData.thumbnailUrl) {
                            if (DEBUG) console.log('📷 [CRITICAL] Restored missing thumbnailUrl:', linkObject.userData.linkData.thumbnailUrl);
                        }
                    }
                }
                
                // Also ensure fileName matches linkData.title for consistency
                if (!linkObject.userData.fileName) {
                    linkObject.userData.fileName = linkObject.userData.linkData.title;
                    if (DEBUG) console.log('🔧 Set fileName from linkData.title:', linkObject.userData.fileName);
                }
                
                // CRITICAL: Check if branding system already applied branded textures
                if (linkObject.userData.brandingApplied) {
                    if (DEBUG) console.log(`🎨 Branding already applied to ${linkData.url}, preserving branded textures`);
                    
                    // Still add URL text but don't reshape (geometry should already be correct)
                    this.addUrlTextToTopSurface(linkObject, linkData);
                    
                    // SPECIAL CASE: Still try media thumbnails even with branding
                    // Thumbnails are applied to a specific face and shouldn't conflict with branding
                    // BUT: Skip for search/browse URLs - they don't have thumbnails in oEmbed APIs
                    const url = linkData.url;
                    const isSearchUrl = this.isSearchOrBrowseUrl(url);
                    
                    if (isSearchUrl) {
                        if (DEBUG) console.log(`🔍 Search/browse URL detected - skipping oEmbed thumbnail fetch: ${url}`);
                    } else {
                        const domain = new URL(url).hostname.toLowerCase().replace('www.', '');
                        if (domain === 'youtube.com' || domain === 'youtu.be') {
                            if (DEBUG) console.log(`🎥 Fetching YouTube thumbnail for branded object in background: ${url}`);
                            // Fetch thumbnail asynchronously without blocking
                            this.tryYouTubeThumbnailForBrandedObject(linkObject, url, domain).catch(error => {
                                if (DEBUG) console.log(`⚠️ YouTube branded thumbnail failed: ${error.message}`);
                            });
                        } else if (domain === 'spotify.com' || domain === 'open.spotify.com') {
                            if (DEBUG) console.log(`🎵 Attempting Spotify thumbnail for branded object: ${url}`);
                            await this.trySpotifyThumbnailForBrandedObject(linkObject, url, domain);
                        } else if (domain === 'vimeo.com') {
                            if (DEBUG) console.log(`🎬 Vimeo branded object (fetching thumbnail in background)`);
                            // Fetch thumbnail in background (non-blocking)
                            this.tryVimeoThumbnailForBrandedObject(linkObject, url, domain).catch(error => {
                                if (DEBUG) console.log(`⚠️ Vimeo branded thumbnail failed: ${error.message}`);
                            });
                        } else if (domain === 'deezer.com') {
                            if (DEBUG) console.log(`🎵 Attempting Deezer thumbnail for branded object: ${url}`);
                            await this.tryDeezerThumbnailForBrandedObject(linkObject, url, domain);
                        } else if (domain === 'soundcloud.com') {
                            if (DEBUG) console.log(`🎧 Attempting SoundCloud thumbnail for branded object: ${url}`);
                            await this.trySoundCloudThumbnailForBrandedObject(linkObject, url, domain);
                        } else if (domain === 'tiktok.com') {
                            if (DEBUG) console.log(`🎵 Attempting TikTok thumbnail for branded object: ${url}`);
                            await this.tryTikTokThumbnailForBrandedObject(linkObject, url, domain);
                        } else if (domain === 'dailymotion.com') {
                            if (DEBUG) console.log(`🎬 Attempting Dailymotion thumbnail for branded object: ${url}`);
                            await this.tryDailymotionThumbnailForBrandedObject(linkObject, url, domain);
                        } else if (domain === 'instagram.com') {
                            if (DEBUG) console.log(`📸 Instagram branded object (thumbnails disabled due to CORS)`);
                            // Skip Instagram thumbnail fetch
                        }
                    }
                    
                    // Store minimal enhancement metadata
                    linkObject.userData.visualEnhancement = {
                        enhanced: true,
                        enhancedAt: Date.now(),
                        linkData: linkData,
                        preservedBranding: true
                    };
                    
                    if (DEBUG) console.log('✅ Link object enhanced successfully (branding preserved)');
                    return;
                }
                
                // Store original material for potential restoration
                if (!linkObject.userData.originalMaterial) {
                    linkObject.userData.originalMaterial = linkObject.material;
                }
                
                // 1. Preserve stacking context before any changes
                const wasStacked = this.preserveStackingContext(linkObject);
                
                // 2. Determine category
                const category = this.categorizeLink(linkData.url);
                
                // 3. Apply category-based styling (with brand override support)
                this.applyCategoryStyle(linkObject, category, linkData.url);
                
                // 4. Add logo/favicon to top surface
                await this.addLogoToTopSurface(linkObject, linkData, category);
                
                // 5. Add truncated URL text to top surface (skip for Instagram)
                if (domain !== 'instagram.com') {
                    this.addUrlTextToTopSurface(linkObject, linkData);
                }
                
                // 6. Restore stacking position if needed
                if (wasStacked.wasStacked) {
                    this.restoreStackingContext(linkObject, wasStacked);
                }
                
                // Store enhancement metadata
                linkObject.userData.visualEnhancement = {
                    category: category,
                    enhanced: true,
                    enhancedAt: Date.now(),
                    linkData: linkData // Store for re-enhancement if needed
                };
                
                if (DEBUG) console.log('✅ Link object enhanced successfully');
                
                // Create title label for link object (for easier identification)
                if (window.linkTitleManager) {
                    try {
                        window.linkTitleManager.createOrUpdateLabel(linkObject);
                    } catch (labelError) {
                        console.warn('Failed to create title label:', labelError);
                    }
                }
                
            } catch (error) {
                console.error('Error enhancing link object:', error);
            }
        }

        /**
         * Preserve stacking context before visual changes
         * @param {Object} linkObject - Three.js link object
         * @returns {Object} Stacking context data
         */
        preserveStackingContext(linkObject) {
            const currentY = linkObject.position.y;
            const geometry = linkObject.geometry;
            let objectHeight = 2.53; // Default link height
            
            try {
                if (geometry.parameters?.height) {
                    objectHeight = geometry.parameters.height;
                } else {
                    geometry.computeBoundingBox();
                    objectHeight = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
                }
            } catch (error) {
                console.warn('Could not determine object height for stacking preservation');
            }
            
            const expectedGroundY = objectHeight / 2;
            const isStacked = currentY > (expectedGroundY + 0.5); // 0.5 unit tolerance
            
            if (isStacked) {
                console.log(`🏗️ Preserving stacking context: Y=${currentY}, expected ground=${expectedGroundY}`);
            }
            
            return {
                wasStacked: isStacked,
                originalY: currentY,
                objectHeight: objectHeight,
                expectedGroundY: expectedGroundY
            };
        }

        /**
         * Restore stacking context after visual changes
         * @param {Object} linkObject - Three.js link object
         * @param {Object} stackingContext - Preserved stacking context
         */
        restoreStackingContext(linkObject, stackingContext) {
            if (!stackingContext.wasStacked) return;
            
            console.log(`🏗️ Restoring stacking position: ${stackingContext.originalY}`);
            linkObject.position.y = stackingContext.originalY;
            
            // Mark as having preserved stacking for debugging
            linkObject.userData.stackingPreserved = true;
            linkObject.userData.preservedY = stackingContext.originalY;
        }

        /**
         * Create standardized geometry for link objects with 16:9 aspect ratio
         * This ensures all link objects (Google, YouTube, etc.) have consistent shapes
         * @param {Object} linkData - Link data (optional, for future customization)
         * @returns {THREE.BoxGeometry} - Standardized geometry
         */
        createLinkGeometry(linkData) {
            // Force 16:9 aspect ratio for ALL link objects - 2x larger for better thumbnail visibility
            const aspectRatio = 16/9;
            const width = 4.5;  // 2x larger than previous 2.0
            const height = width / aspectRatio;  // 2.53 units for 16:9 ratio
            const depth = 0.4;  // Moderate depth for video content
            
            if (DEBUG) console.log(`📐 Creating standardized link geometry: ${width} x ${height} x ${depth} (16:9 ratio)`);
            return new this.THREE.BoxGeometry(width, height, depth);
        }

        /**
         * Categorize a link based on its URL
         * @param {string} url - URL to categorize
         * @returns {string} - Category name
         */
        categorizeLink(url) {
            try {
                const urlObj = new URL(url);
                const domain = urlObj.hostname.toLowerCase().replace('www.', '');
                const tld = '.' + domain.split('.').pop();
                
                // Check each category for domain matches
                for (const [categoryName, config] of Object.entries(this.categoryConfig)) {
                    // Check domain matches
                    if (config.domains && config.domains.some(d => domain.includes(d.replace('www.', '')))) {
                        if (DEBUG) console.log(`📂 Categorized ${domain} as ${categoryName}`);
                        return categoryName;
                    }
                    
                    // Check TLD matches (for government sites, etc.)
                    if (config.tlds && config.tlds.includes(tld)) {
                        if (DEBUG) console.log(`📂 Categorized ${domain} as ${categoryName} (by TLD)`);
                        return categoryName;
                    }
                }
                
                if (DEBUG) console.log(`📂 Using general category for ${domain}`);
                return 'general';
                
            } catch (error) {
                console.warn('Error categorizing URL:', error);
                return 'general';
            }
        }

        /**
         * Apply category-based styling to link object
         * @param {Object} linkObject - Three.js link object
         * @param {string} category - Category name
         */
        applyCategoryStyle(linkObject, category, linkUrl = null) {
            const config = this.categoryConfig[category] || this.categoryConfig.general;
            
            // Check for brand-specific color overrides first
            let finalColor = config.color;
            if (linkUrl) {
                try {
                    const urlObj = new URL(linkUrl);
                    const domain = urlObj.hostname.toLowerCase().replace('www.', '');
                    
                    // Check if we have a brand override for this domain
                    if (this.brandColors[domain]) {
                        finalColor = this.brandColors[domain];
                        if (window.shouldLog && window.shouldLog('branding')) {
                            console.log(`� Using brand override color for ${domain}: 0x${finalColor.toString(16)}`);
                        }
                    }
                } catch (error) {
                    console.warn('Error parsing URL for brand override:', error);
                }
            }
            
            // console.log(`�🎨 Applying category style: ${category} with color 0x${finalColor.toString(16)}`);
            
            // Create category-appropriate material with final color
            let baseMaterial;
            
            if (config.pattern === 'gradient') {
                baseMaterial = this.createGradientMaterial(finalColor);
            } else {
                baseMaterial = new this.THREE.MeshLambertMaterial({
                    color: finalColor,
                    transparent: false,
                    opacity: 0.9
                });
            }
            
            // Convert to multi-material setup for face-specific textures (needed for logo on top)
            const materials = [];
            
            // Create 6 materials for box faces (standard Three.js box geometry order)
            // 0: right, 1: left, 2: top, 3: bottom, 4: front, 5: back
            for (let i = 0; i < 6; i++) {
                if (i === 2) { 
                    // Top face - will be replaced with logo texture later
                    materials.push(baseMaterial.clone());
                } else {
                    // Other faces - use the category color
                    materials.push(baseMaterial.clone());
                }
            }
            
            // Apply multi-material to object
            linkObject.material = materials;
            
            // Store category info
            linkObject.userData.category = category;
            linkObject.userData.categoryConfig = config;
            
            if (DEBUG) console.log(`✅ Applied ${category} styling (${config.description}) with color 0x${finalColor.toString(16)}`);
        }

        /**
         * Create a gradient material for enhanced visual appeal
         * @param {number} baseColor - Base color in hex
         * @returns {THREE.Material} - Gradient material
         */
        createGradientMaterial(baseColor) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Create radial gradient
            const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
            
            // Convert hex color to lighter and darker variants
            const r = (baseColor >> 16) & 255;
            const g = (baseColor >> 8) & 255;
            const b = baseColor & 255;
            
            // Lighter center
            const lightR = Math.min(255, r + 40);
            const lightG = Math.min(255, g + 40);
            const lightB = Math.min(255, b + 40);
            
            // Darker edges
            const darkR = Math.max(0, r - 40);
            const darkG = Math.max(0, g - 40);
            const darkB = Math.max(0, b - 40);
            
            gradient.addColorStop(0, `rgb(${lightR}, ${lightG}, ${lightB})`);
            gradient.addColorStop(1, `rgb(${darkR}, ${darkG}, ${darkB})`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 256);
            
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.flipY = true; // Fix for upside down gradient
            texture.needsUpdate = true;
            
            return new this.THREE.MeshLambertMaterial({
                map: texture,
                transparent: false,
                opacity: 0.9
            });
        }

        /**
         * Add logo/favicon to the top surface of link object
         * @param {Object} linkObject - Three.js link object
         * @param {Object} linkData - Link metadata
         * @param {string} category - Link category
         */
        async addLogoToTopSurface(linkObject, linkData, category) {
            try {
                const url = linkData.url;
                const domain = new URL(url).hostname.toLowerCase().replace('www.', '');
                const customName = window.linkNamePersistence?.getCustomName?.(linkObject.uuid);
                
                if (DEBUG) console.log(`🎨 [LOGO] addLogoToTopSurface called for domain: ${domain}`);
                if (DEBUG) console.log(`🎨 [LOGO] Category: ${category}`);
                if (DEBUG) console.log(`🎨 [LOGO] URL: ${url}`);
                
                // CRITICAL: Check if branding system already applied branded textures
                // If so, don't override with linkVisualManager logos
                if (linkObject.userData.brandingApplied) {
                    if (DEBUG) console.log(`🎨 [LOGO] ⚠️ Branding already applied to ${domain}, preserving branded textures`);
                    return;
                }
                
                // Check if this is a search/browse URL (no specific content to fetch thumbnail for)
                const isSearchUrl = this.isSearchOrBrowseUrl(url);
                if (isSearchUrl) {
                    if (DEBUG) console.log(`🔍 [LOGO] Search/browse URL detected - skipping thumbnail fetch, using text logo: ${url}`);
                    // Use text logo for search URLs
                    const logo = this.preBuiltLogos[domain] || this.getCategoryIcon(category);
                    this.applyTextLogo(linkObject, logo, category, domain);
                    return;
                }
                
                // Special handling for YouTube videos - NON-BLOCKING background fetch
                if ((category === 'video' && (domain === 'youtube.com' || domain === 'youtu.be')) || 
                    domain === 'youtube.com' || domain === 'youtu.be') {
                    if (DEBUG) console.log(`🎥 [LOGO] Detected YouTube link, fetching thumbnail in background: ${url}`);
                    // Apply text logo immediately as placeholder, then fetch thumbnail in background
                    this.applyTextLogo(linkObject, this.preBuiltLogos[domain] || '🎥', category, domain);
                    // Fetch thumbnail asynchronously without blocking
                    this.tryYouTubeThumbnail(linkObject, url, category, domain).then(success => {
                        if (success) {
                            if (DEBUG) console.log(`✅ YouTube thumbnail loaded and applied: ${url}`);
                        }
                    }).catch(error => {
                        if (DEBUG) console.log(`⚠️ YouTube thumbnail fetch failed, keeping text logo: ${error.message}`);
                    });
                    return; // Continue with text logo while thumbnail loads in background
                }
                
                // Special handling for TikTok videos - NON-BLOCKING background fetch
                if (domain === 'tiktok.com') {
                    if (DEBUG) console.log(`🎵 [LOGO] Detected TikTok link, fetching thumbnail in background: ${url}`);
                    // Apply text logo immediately as placeholder, then fetch thumbnail in background
                    this.applyTextLogo(linkObject, this.preBuiltLogos[domain] || '🎵', category, domain);
                    // Fetch thumbnail asynchronously without blocking
                    this.tryTikTokThumbnail(linkObject, url, category, domain).then(success => {
                        if (success) {
                            if (DEBUG) console.log(`✅ TikTok thumbnail loaded and applied: ${url}`);
                        }
                    }).catch(error => {
                        if (DEBUG) console.log(`⚠️ TikTok thumbnail fetch failed, keeping text logo: ${error.message}`);
                    });
                    return; // Continue with text logo while thumbnail loads in background
                }
                
                // Instagram: Skip thumbnail fetch (CORS errors), use text logo
                if (domain === 'instagram.com') {
                    if (DEBUG) console.log(`📸 [LOGO] Instagram link detected, using text logo (thumbnails disabled due to CORS)`);
                    // Fall through to text logo below
                }
                
                // Special handling for Snapchat Spotlight - try to get video thumbnail
                if (domain === 'snapchat.com') {
                    if (DEBUG) console.log(`👻 Detected Snapchat link, attempting thumbnail fetch for: ${url}`);
                    const thumbnailApplied = await this.trySnapchatThumbnail(linkObject, url, category, domain);
                    if (thumbnailApplied) {
                        return; // Successfully applied Snapchat thumbnail
                    }
                    // If thumbnail fails, fall through to text logo
                    if (DEBUG) console.log(`👻 Snapchat thumbnail failed, using text logo fallback`);
                }
                
                // Special handling for Spotify tracks - try to get track thumbnail
                if (domain === 'spotify.com' || domain === 'open.spotify.com') {
                    if (DEBUG) console.log(`🎵 Detected Spotify link, attempting thumbnail fetch for: ${url}`);
                    const thumbnailApplied = await this.trySpotifyThumbnail(linkObject, url, category, domain);
                    if (thumbnailApplied) {
                        return; // Successfully applied Spotify thumbnail
                    }
                    // If thumbnail fails, fall through to text logo
                    if (DEBUG) console.log(`🎵 Spotify thumbnail failed, using text logo fallback`);
                }
                
                // Vimeo: Fetch thumbnail in background (non-blocking)
                if (domain === 'vimeo.com') {
                    if (DEBUG) console.log(`🎬 Vimeo link detected, fetching thumbnail in background: ${url}`);
                    // Apply text logo immediately as placeholder, then fetch thumbnail in background
                    this.applyTextLogo(linkObject, this.preBuiltLogos[domain] || 'VM', category, domain);
                    // Fetch thumbnail asynchronously without blocking
                    this.tryVimeoThumbnail(linkObject, url, category, domain).then(success => {
                        if (success) {
                            if (DEBUG) console.log(`✅ Vimeo thumbnail loaded and applied: ${url}`);
                        }
                    }).catch(error => {
                        if (DEBUG) console.log(`⚠️ Vimeo thumbnail fetch failed, keeping text logo: ${error.message}`);
                    });
                    return; // Continue with text logo while thumbnail loads in background
                }
                
                // Special handling for SoundCloud tracks - try to get track thumbnail
                if (domain === 'soundcloud.com') {
                    if (DEBUG) console.log(`🎧 Detected SoundCloud link, attempting thumbnail fetch for: ${url}`);
                    const thumbnailApplied = await this.trySoundCloudThumbnail(linkObject, url, category, domain);
                    if (thumbnailApplied) {
                        return; // Successfully applied SoundCloud thumbnail
                    }
                    // If thumbnail fails, fall through to text logo
                    if (DEBUG) console.log(`🎧 SoundCloud thumbnail failed, using text logo fallback`);
                }
                
                // Check for pre-built logo first
                if (this.preBuiltLogos[domain]) {
                    if (DEBUG) console.log(`📋 Using pre-built logo for ${domain}`);
                    this.applyTextLogo(linkObject, this.preBuiltLogos[domain], category, domain);
                    return;
                }
                
                // Use category-based fallback icon instead of trying to fetch favicon
                this.applyFallbackIcon(linkObject, category);
                
            } catch (error) {
                console.warn('Error adding logo to top surface:', error);
                // Fallback to category-based icon
                this.applyFallbackIcon(linkObject, category);
            }
        }

        /**
         * Apply a text-based logo (emoji or text)
         * @param {Object} linkObject - Three.js link object
         * @param {string} logoText - Text/emoji to display
         * @param {string} category - Link category
         * @param {string} domain - Domain (optional, for special cases)
         */
        applyTextLogo(linkObject, logoText, category, domain = null) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            const customName = window.linkNamePersistence?.getCustomName?.(linkObject.uuid);
            
            // No rotation - text should be readable from Home Camera view
            // ctx.translate(canvas.width / 2, canvas.height / 2);
            // ctx.rotate(Math.PI); // Removed - was making text upside down from Home view
            // ctx.translate(-canvas.width / 2, -canvas.height / 2);
            
            // Extract domain for special handling
            const cleanDomain = domain ? domain.toLowerCase().replace('www.', '') : '';
            
            // Background - use category color with brand override support
            const config = this.categoryConfig[category] || this.categoryConfig.general;
            let backgroundColor = config.color;
            
            // Check for brand color override
            if (cleanDomain && this.brandColors[cleanDomain]) {
                backgroundColor = this.brandColors[cleanDomain];
                if (DEBUG) console.log(`🎯 Applying brand override background for ${cleanDomain}: 0x${backgroundColor.toString(16)}`);
            }
            
            ctx.fillStyle = `#${backgroundColor.toString(16).padStart(6, '0')}`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Logo text positioning - dynamic font size and layout
            // Instagram gets special 2-line treatment
            let logoFontSize = 180;
            let isInstagram = (cleanDomain === 'instagram.com');
            
            if (isInstagram) {
                logoFontSize = 100; // Smaller font for 2-line text
            } else if (logoText.length > 8) {
                logoFontSize = 100; // Smaller font for longer text
            } else if (logoText.length > 4) {
                logoFontSize = 140; // Medium font for medium text
            }
            
            ctx.font = `bold ${logoFontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial, sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Instagram: Split into two lines
            if (isInstagram) {
                ctx.fillText('Instagram', canvas.width / 2, 200);
                ctx.fillText('Link', canvas.width / 2, 300);
            } else {
                // Center vertically - no URL text below
                const logoY = 256;
                ctx.fillText(logoText, canvas.width / 2, logoY);
            }
            
            // No URL text on face (removed to keep clean)
            
            // Create texture and apply to top face
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.flipY = true; // Fix for upside down text
            texture.needsUpdate = true;
            
            this.applyTextureToTopFace(linkObject, texture);
            
            if (DEBUG) console.log(`🎯 Applied enhanced text logo: ${logoText}${urlText ? ' with URL: ' + urlText : ''} (domain: ${cleanDomain})`);
        }

        /**
         * Apply fallback icon based on category
         * @param {Object} linkObject - Three.js link object
         * @param {string} category - Link category
         */
        applyFallbackIcon(linkObject, category) {
            const categoryIcons = {
                'social': 'SOC',
                'shopping': 'SHOP',
                'news': 'NEWS',
                'tech': 'TECH',
                'video': 'VID',           // Updated for video category
                'entertainment': 'ENT',
                'education': 'EDU',
                'business': 'BIZ',
                'government': 'GOV',
                'general': 'LINK'
            };
            
            const icon = categoryIcons[category] || categoryIcons.general;
            this.applyTextLogo(linkObject, icon, category);
            
            if (DEBUG) console.log(`🔄 Applied fallback icon for ${category}: ${icon}`);
        }

        /**
         * Apply texture to the top face of the link object
         * @param {Object} linkObject - Three.js link object
         * @param {THREE.Texture} texture - Texture to apply
         */
        applyTextureToTopFace(linkObject, texture) {
            // Ensure object has multi-material setup for face-specific textures
            if (!Array.isArray(linkObject.material)) {
                // Convert to multi-material
                const originalMaterial = linkObject.material;
                const materials = [];
                
                // Create 6 materials for box faces (Three.js BoxGeometry face order)
                // 0: +X (right), 1: -X (left), 2: +Y (top), 3: -Y (bottom), 4: +Z (front), 5: -Z (back)
                for (let i = 0; i < 6; i++) {
                    if (i === 4 || i === 5) { // Front face (+Z) and Back face (-Z) only
                        materials.push(new this.THREE.MeshLambertMaterial({
                            map: texture.clone(), // Clone texture for multiple faces
                            transparent: false,  // Reduces flicker
                            side: this.THREE.FrontSide,  // Reduces artifacts
                            polygonOffset: true,  // Prevent z-fighting/flickering
                            polygonOffsetFactor: -1,
                            polygonOffsetUnits: -1,
                            depthWrite: true,
                            depthTest: true
                        }));
                    } else {
                        materials.push(originalMaterial.clone());
                    }
                }
                
                linkObject.material = materials;
            } else {
                // Update existing front and back face materials
                [4, 5].forEach(index => {
                    if (linkObject.material[index]) {
                        // Dispose of old texture if it exists
                        if (linkObject.material[index].map) {
                            linkObject.material[index].map.dispose();
                        }
                        linkObject.material[index].map = texture.clone();
                        linkObject.material[index].needsUpdate = true;
                        
                        // CRITICAL: Always apply anti-flicker settings for all platforms
                        // These prevent z-fighting and reduce visual artifacts when thumbnails update
                        linkObject.material[index].transparent = false;  // Reduces flicker
                        linkObject.material[index].side = this.THREE.FrontSide;  // Reduces artifacts
                        linkObject.material[index].polygonOffset = true;
                        linkObject.material[index].polygonOffsetFactor = -1;
                        linkObject.material[index].polygonOffsetUnits = -1;
                        linkObject.material[index].depthWrite = true;
                        linkObject.material[index].depthTest = true;
                    }
                });
            }
            
            // console.log('🎯 Applied texture to front (4) and back (5) faces only');
        }
        
        /**
         * Check if a link object has a YouTube URL
         * @param {Object} linkObject - Three.js link object
         * @returns {boolean} True if object has YouTube URL
         */
        hasYouTubeUrl(linkObject) {
            try {
                // Check various places where URL might be stored
                const url = linkObject.userData?.fileData?.url || 
                           linkObject.userData?.linkData?.url || 
                           linkObject.linkData?.url || '';
                
                if (!url) return false;
                
                // Use existing YouTube detection method
                const videoId = this.extractYouTubeVideoId(url);
                return !!videoId;
            } catch (error) {
                console.warn('Error checking YouTube URL:', error);
                return false;
            }
        }

        /**
         * Check if a link object has an image thumbnail on the front face
         * @param {Object} linkObject - Three.js link object
         * @returns {boolean} True if object has image texture on front face
         */
        hasImageThumbnail(linkObject) {
            try {
                // Check if object has multi-material array
                if (!Array.isArray(linkObject.material)) {
                    return false;
                }
                
                // Check front face (material[4]) for texture map
                const frontMaterial = linkObject.material[4];
                if (!frontMaterial || !frontMaterial.map) {
                    return false;
                }
                
                // Additional check: see if the texture appears to be an image
                // (not a simple canvas-generated text texture)
                const texture = frontMaterial.map;
                
                // If texture has source image, it's likely a thumbnail
                if (texture.image && texture.image.src) {
                    // Check if source suggests it's an image URL (jpg, png, etc.)
                    const src = texture.image.src.toLowerCase();
                    return src.includes('.jpg') || src.includes('.jpeg') || 
                           src.includes('.png') || src.includes('.gif') ||
                           src.includes('youtube.com/vi/'); // YouTube thumbnail URLs
                }
                
                // If it's a CanvasTexture but has YouTube metadata, consider it a thumbnail
                if (linkObject.userData?.youTubeThumbnail) {
                    return true;
                }
                
                return false;
            } catch (error) {
                console.warn('Error checking image thumbnail:', error);
                return false;
            }
        }

        /**
         * Check if link object should preserve front face during name changes
         * @param {Object} linkObject - Three.js link object
         * @returns {boolean} True if front face should be preserved
         */
        shouldPreserveFrontFace(linkObject) {
            return this.hasYouTubeUrl(linkObject) || this.hasImageThumbnail(linkObject);
        }

        /**
         * NEW: Force update the texture of an existing link object with a new name
         * This is specifically for updating existing links with new custom names
         * SMART: Preserves front face thumbnails for YouTube/image links
         */
        forceUpdateLinkTexture(linkObject, newName) {
            if (!linkObject || !newName) {
                console.error('Invalid parameters for texture update');
                return;
            }
            
            // 🔍 DETECTION: Check if this object should preserve front face
            const preserveFrontFace = this.shouldPreserveFrontFace(linkObject);
            
            if (preserveFrontFace) {
                console.log(`🛡️ Preserving front face thumbnail for: ${newName} (YouTube/Image detected)`);
            } else {
                console.log(`📝 Updating both faces for text-only link: ${newName}`);
            }
            
            // Create new texture with the custom name
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size
            canvas.width = 512;
            canvas.height = 256;
            
            // Clear canvas with background
            ctx.fillStyle = '#2196F3'; // Blue background for link objects
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw border
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4;
            ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
            
            // Draw text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Wrap text if too long
            const maxWidth = canvas.width - 40;
            const words = newName.split(' ');
            let line = '';
            let y = canvas.height / 2 - 10;
            
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, canvas.width / 2, y);
                    line = words[n] + ' ';
                    y += 40;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, canvas.width / 2, y);
            
            // Create texture from canvas
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // 🎯 SELECTIVE FACE UPDATES: Determine which faces to update
            const facesToUpdate = preserveFrontFace ? [5] : [4, 5]; // Back-only vs Both faces
            
            console.log(`🎨 Updating faces: ${facesToUpdate.join(', ')} ${preserveFrontFace ? '(preserving front thumbnail)' : '(text-only link)'}`);
            
            // Apply texture to selected faces
            if (Array.isArray(linkObject.material)) {
                // Update existing multi-material
                facesToUpdate.forEach(index => {
                    if (linkObject.material[index]) {
                        // Dispose of old texture
                        if (linkObject.material[index].map) {
                            linkObject.material[index].map.dispose();
                        }
                        linkObject.material[index].map = texture.clone();
                        linkObject.material[index].needsUpdate = true;
                    }
                });
            } else {
                // Convert to multi-material and apply texture selectively
                const originalMaterial = linkObject.material;
                const materials = [];
                
                for (let i = 0; i < 6; i++) {
                    if (facesToUpdate.includes(i)) {
                        materials.push(new this.THREE.MeshLambertMaterial({
                            map: texture.clone(),
                            transparent: false
                        }));
                    } else {
                        materials.push(originalMaterial.clone());
                    }
                }
                
                linkObject.material = materials;
            }
            
            console.log(`🔄 Successfully force-updated link texture with "${newName}" ${preserveFrontFace ? '(front face preserved)' : '(both faces updated)'}`);
        }
        
        /**
         * Check if a URL matches a YouTube video pattern
         * @param {string} url - URL to check
         * @returns {boolean} True if URL is a YouTube video
            
            if (!linkObject || !newName) {
                console.error('Invalid parameters for texture update');
                return;
            }
            
            // Create new texture with the custom name
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size
            canvas.width = 512;
            canvas.height = 256;
            
            // Clear canvas with background
            ctx.fillStyle = '#2196F3'; // Blue background for link objects
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw border
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4;
            ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
            
            // Draw text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Wrap text if too long
            const maxWidth = canvas.width - 40;
            const words = newName.split(' ');
            let line = '';
            let y = canvas.height / 2 - 10;
            
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, canvas.width / 2, y);
                    line = words[n] + ' ';
                    y += 40;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, canvas.width / 2, y);
            
            // Create texture from canvas
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // Force apply to all visible faces (top, front, back)
            if (Array.isArray(linkObject.material)) {
                // Update existing multi-material
                [2, 4, 5].forEach(index => {
                    if (linkObject.material[index]) {
                        // Dispose of old texture
                        if (linkObject.material[index].map) {
                            linkObject.material[index].map.dispose();
                        }
                        linkObject.material[index].map = texture.clone();
                        linkObject.material[index].needsUpdate = true;
                    }
                });
            } else {
                // Convert to multi-material and apply texture
                const originalMaterial = linkObject.material;
                const materials = [];
                
                for (let i = 0; i < 6; i++) {
                    if (i === 2 || i === 4 || i === 5) { // Top, front, back faces
                        materials.push(new this.THREE.MeshLambertMaterial({
                            map: texture.clone(),
                            transparent: false
                        }));
                    } else {
                        materials.push(originalMaterial.clone());
                    }
                }
                
                linkObject.material = materials;
            }
            
            console.log(`🔄 Successfully force-updated link texture with "${newName}"`);
        }

        /**
         * Add truncated URL text to top surface alongside logo
         * @param {Object} linkObject - Three.js link object
         * @param {Object} linkData - Link metadata
         */
        addUrlTextToTopSurface(linkObject, linkData) {
            try {
                const url = linkData.url;
                const domain = new URL(url).hostname.replace('www.', '');
                
                // Truncate domain for display
                const displayText = domain.length > 15 ? domain.substring(0, 15) + '...' : domain;
                
                // This could be integrated with the logo texture or added as a separate element
                // For now, we'll store it in userData for potential future use
                linkObject.userData.displayDomain = displayText;
                
            } catch (error) {
                console.warn('Error adding URL text:', error);
            }
        }

        /**
         * Clean up resources and cache
         */
        dispose() {
            // Clear texture cache
            this.textureCache.clear();
            
            console.log('LinkVisualManager disposed');
        }

        /**
         * Restore visual enhancements for all existing link objects
         * Useful when objects have reverted to default appearance
         */
        async restoreAllLinkEnhancements() {
            try {
                if (DEBUG) console.log('🔄 Restoring visual enhancements for all link objects...');
                
                // Find all link objects in the scene
                const linkObjects = this.scene.children.filter(obj => 
                    obj.userData.isLink || 
                    obj.userData.fileData?.thumbnailUrl ||
                    obj.userData.id?.includes('link')
                );
                
                if (DEBUG) console.log(`Found ${linkObjects.length} link objects to restore`);
                
                for (const linkObject of linkObjects) {
                    try {
                        // Extract link data from userData
                        const linkData = linkObject.userData.visualEnhancement?.linkData || 
                                         linkObject.userData.linkData ||
                                         linkObject.userData.fileData || {
                            url: linkObject.userData.url || linkObject.userData.fileData?.thumbnailUrl || linkObject.userData.fileData?.url,
                            title: linkObject.userData.fileData?.name || linkObject.userData.fileData?.fileName
                        };
                        
                        if (linkData.url) {
                            // Reset enhancement flag to allow re-enhancement
                            if (linkObject.userData.visualEnhancement) {
                                linkObject.userData.visualEnhancement.enhanced = false;
                            }
                            
                            await this.enhanceLinkObject(linkObject, linkData);
                            if (DEBUG) console.log(`✅ Restored enhancement for: ${linkData.url}`);
                        } else {
                            console.warn('⚠️ No URL found for link object, skipping enhancement restoration');
                        }
                        
                    } catch (error) {
                        console.warn('Error restoring individual link object:', error);
                    }
                }
                
                if (DEBUG) console.log('✅ Completed restoring visual enhancements for all link objects');
                
            } catch (error) {
                console.error('Error in restoreAllLinkEnhancements:', error);
            }
        }

        /**
         * Check if a link object has lost its visual enhancements and restore if needed
         * @param {Object} linkObject - Three.js link object to check
         */
        async checkAndRestoreEnhancements(linkObject) {
            try {
                // Check if this is a link object that should be enhanced
                if (!linkObject.userData.isLink && 
                    !linkObject.userData.fileData?.thumbnailUrl && 
                    !linkObject.userData.id?.includes('link')) {
                    return; // Not a link object
                }
                
                // Check if it has lost its enhanced state (reverted to default material)
                const hasLostEnhancements = !linkObject.userData.visualEnhancement?.enhanced ||
                                           !Array.isArray(linkObject.material) ||
                                           (linkObject.material.color && linkObject.material.color.getHex() === 0x4169E1); // Default blue
                
                if (hasLostEnhancements) {
                    console.log('🔄 Link object has lost visual enhancements, restoring...');
                    
                    // Extract link data
                    const linkData = linkObject.userData.visualEnhancement?.linkData || 
                                     linkObject.userData.linkData ||
                                     linkObject.userData.fileData || {
                        url: linkObject.userData.url || linkObject.userData.fileData?.thumbnailUrl || linkObject.userData.fileData?.url,
                        title: linkObject.userData.fileData?.name || linkObject.userData.fileData?.fileName
                    };
                    
                    if (linkData.url) {
                        // Reset enhancement flag
                        if (linkObject.userData.visualEnhancement) {
                            linkObject.userData.visualEnhancement.enhanced = false;
                        }
                        
                        await this.enhanceLinkObject(linkObject, linkData);
                        console.log('✅ Visual enhancements restored for link object');
                    }
                }
                
            } catch (error) {
                console.warn('Error in checkAndRestoreEnhancements:', error);
            }
        }

        /**
         * Backup visual state of a link object before operations that might reset it
         * @param {Object} linkObject - Three.js link object
         * @returns {Object} - Backup of visual state
         */
        backupVisualState(linkObject) {
            try {
                if (!linkObject.userData.visualEnhancement) {
                    return null;
                }
                
                const backup = {
                    enhanced: linkObject.userData.visualEnhancement.enhanced,
                    category: linkObject.userData.visualEnhancement.category,
                    linkData: linkObject.userData.visualEnhancement.linkData,
                    logoType: linkObject.userData.visualEnhancement.logoType,
                    materialBackup: null,
                    geometry: null
                };
                
                // Backup material properties if enhanced
                if (linkObject.material) {
                    if (Array.isArray(linkObject.material)) {
                        backup.materialBackup = linkObject.material.map(mat => ({
                            color: mat.color ? mat.color.clone() : null,
                            emissive: mat.emissive ? mat.emissive.clone() : null,
                            transparent: mat.transparent,
                            opacity: mat.opacity
                        }));
                    } else {
                        backup.materialBackup = {
                            color: linkObject.material.color ? linkObject.material.color.clone() : null,
                            emissive: linkObject.material.emissive ? linkObject.material.emissive.clone() : null,
                            transparent: linkObject.material.transparent,
                            opacity: linkObject.material.opacity
                        };
                    }
                }
                
                console.log('📦 Backed up visual state for link object');
                return backup;
                
            } catch (error) {
                console.warn('Error backing up visual state:', error);
                return null;
            }
        }
        
        /**
         * Restore visual state from backup
         * @param {Object} linkObject - Three.js link object
         * @param {Object} backup - Visual state backup
         */
        restoreVisualState(linkObject, backup) {
            try {
                if (!backup) {
                    console.log('No visual state backup available');
                    return;
                }
                
                // Restore visual enhancement userData
                linkObject.userData.visualEnhancement = {
                    enhanced: backup.enhanced,
                    category: backup.category,
                    linkData: backup.linkData,
                    logoType: backup.logoType
                };
                
                // Restore material properties if available
                if (backup.materialBackup && linkObject.material) {
                    if (Array.isArray(linkObject.material) && Array.isArray(backup.materialBackup)) {
                        linkObject.material.forEach((mat, index) => {
                            if (backup.materialBackup[index]) {
                                const matBackup = backup.materialBackup[index];
                                if (matBackup.color) mat.color.copy(matBackup.color);
                                if (matBackup.emissive) mat.emissive.copy(matBackup.emissive);
                                mat.transparent = matBackup.transparent;
                                mat.opacity = matBackup.opacity;
                                mat.needsUpdate = true;
                            }
                        });
                    } else if (!Array.isArray(linkObject.material) && !Array.isArray(backup.materialBackup)) {
                        const matBackup = backup.materialBackup;
                        if (matBackup.color) linkObject.material.color.copy(matBackup.color);
                        if (matBackup.emissive) linkObject.material.emissive.copy(matBackup.emissive);
                        linkObject.material.transparent = matBackup.transparent;
                        linkObject.material.opacity = matBackup.opacity;
                        linkObject.material.needsUpdate = true;
                    }
                }
                
                console.log('📦 Restored visual state from backup');
                
            } catch (error) {
                console.warn('Error restoring visual state from backup:', error);
            }
        }

        /**
         * Try to load YouTube video thumbnail with fallback logic
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - YouTube URL
         * @param {string} category - Link category
         * @param {string} domain - Domain name
         * @returns {Promise<boolean>} - True if thumbnail was successfully applied
         */
        async tryYouTubeThumbnail(linkObject, url, category, domain) {
            try {
                if (DEBUG) console.log('🎬 Attempting to load YouTube thumbnail for:', url);
                
                // Extract video ID from various YouTube URL formats
                const videoId = this.extractYouTubeVideoId(url);
                if (!videoId) {
                    console.warn('⚠️ Could not extract YouTube video ID from URL:', url);
                    return false;
                }
                
                if (DEBUG) console.log('🎬 Extracted YouTube video ID:', videoId);
                
                // Try different thumbnail sizes in order of reliability
                const thumbnailSizes = [
                    'hqdefault.jpg',      // 480x360 (most reliable)
                    'mqdefault.jpg',      // 320x180 (backup)
                    'default.jpg',        // 120x90 (always available)
                    'maxresdefault.jpg'   // 1280x720 (best quality but often missing)
                ];
                
                let attemptCount = 0;
                for (const thumbnailSize of thumbnailSizes) {
                    attemptCount++;
                    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${thumbnailSize}`;
                    if (DEBUG) console.log(`🎬 Attempt ${attemptCount}/${thumbnailSizes.length}: Trying YouTube thumbnail: ${thumbnailUrl}`);
                    
                    const success = await this.loadAndApplyThumbnail(linkObject, thumbnailUrl, videoId);
                    if (success) {
                        if (DEBUG) console.log(`✅ Successfully loaded YouTube thumbnail on attempt ${attemptCount}: ${thumbnailSize}`);
                        return true;
                    } else {
                        console.warn(`❌ Attempt ${attemptCount} failed for ${thumbnailSize}, trying next size...`);
                    }
                }
                
                console.error(`⚠️ ALL ${thumbnailSizes.length} YouTube thumbnail attempts failed for video: ${videoId}`);
                console.error(`📋 Failed URLs were:`);
                thumbnailSizes.forEach((size, index) => {
                    console.error(`  ${index + 1}. https://img.youtube.com/vi/${videoId}/${size}`);
                });
                return false;
                
            } catch (error) {
                console.error('Error in tryYouTubeThumbnail:', error);
                return false;
            }
        }

        /**
         * Extract YouTube video ID from various URL formats
         * @param {string} url - YouTube URL
         * @returns {string|null} - Video ID or null if not found
         */
        extractYouTubeVideoId(url) {
            try {
                const urlObj = new URL(url);
                
                // Standard YouTube URLs: https://www.youtube.com/watch?v=VIDEO_ID
                if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
                    return urlObj.searchParams.get('v');
                }
                
                // Short YouTube URLs: https://youtu.be/VIDEO_ID
                if (urlObj.hostname === 'youtu.be') {
                    return urlObj.pathname.substring(1); // Remove leading slash
                }
                
                // Embedded URLs: https://www.youtube.com/embed/VIDEO_ID
                if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
                    return urlObj.pathname.split('/embed/')[1];
                }
                
                // YouTube Shorts URLs: https://www.youtube.com/shorts/VIDEO_ID
                if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/shorts/')) {
                    return urlObj.pathname.split('/shorts/')[1].split(/[/?]/)[0];
                }
                
                console.warn('⚠️ Unrecognized YouTube URL format:', url);
                return null;
                
            } catch (error) {
                console.error('Error extracting YouTube video ID:', error);
                return null;
            }
        }

        /**
         * Load and apply thumbnail image to link object
         * @param {Object} linkObject - Three.js link object
         * @param {string} thumbnailUrl - Thumbnail URL to load
         * @param {string} videoId - YouTube video ID for logging
         * @returns {Promise<boolean>} - True if successfully loaded and applied
         */
        async loadAndApplyThumbnail(linkObject, thumbnailUrl, videoId) {
            if (DEBUG) console.log(`🖼️ [LOAD] ========== loadAndApplyThumbnail called ==========`);
            if (DEBUG) console.log(`🖼️ [LOAD] Object ID: ${linkObject.userData.id}`);
            if (DEBUG) console.log(`🖼️ [LOAD] Thumbnail URL: ${thumbnailUrl}`);
            if (DEBUG) console.log(`🖼️ [LOAD] Video ID: ${videoId}`);
            
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                // Add timeout to prevent hanging
                const timeout = setTimeout(() => {
                    console.warn(`🖼️ [LOAD] ⏰ Timeout loading thumbnail: ${thumbnailUrl}`);
                    resolve(false);
                }, 10000); // 10 second timeout
                
                img.onload = () => {
                    try {
                        clearTimeout(timeout);
                        if (DEBUG) console.log(`🖼️ [LOAD] ✅ Image loaded successfully`);
                        
                        // Verify image actually loaded with valid dimensions
                        if (img.width === 0 || img.height === 0) {
                            console.warn(`🖼️ [LOAD] ❌ Invalid thumbnail dimensions for video ${videoId}: ${img.width}x${img.height}`);
                            resolve(false);
                            return;
                        }
                        if (DEBUG) console.log(`🖼️ [LOAD] Image dimensions: ${img.width}x${img.height}`);
                        
                        if (DEBUG) console.log(`🖼️ Successfully loaded thumbnail for video ${videoId} (${img.width}x${img.height})`);
                        
                        // Create canvas and draw the thumbnail
                        const canvas = document.createElement('canvas');
                        canvas.width = 512;
                        canvas.height = 288; // 16:9 aspect ratio
                        const ctx = canvas.getContext('2d');
                        
                        // Fill with black background first
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Draw thumbnail image (this should work if img.onload fired)
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        
                        // Add YouTube branding overlay (red play button)
                        this.addYouTubeBranding(ctx, canvas.width, canvas.height);
                        
                        // Create texture and apply to top face
                        const texture = new this.THREE.CanvasTexture(canvas);
                        texture.flipY = true;
                        texture.needsUpdate = true;
                        
                        this.applyTextureToTopFace(linkObject, texture);
                        
                        // Store thumbnail metadata
                        linkObject.userData.youTubeThumbnail = {
                            videoId: videoId,
                            thumbnailUrl: thumbnailUrl,
                            appliedAt: Date.now(),
                            actualSize: `${img.width}x${img.height}`
                        };
                        
                        resolve(true);
                        
                    } catch (error) {
                        clearTimeout(timeout);
                        console.error('Error processing loaded thumbnail:', error);
                        resolve(false);
                    }
                };
                
                img.onerror = (error) => {
                    clearTimeout(timeout);
                    console.warn(`❌ Failed to load thumbnail: ${thumbnailUrl}`, error);
                    resolve(false);
                };
                
                // Start loading
                // console.log(`🔄 Starting to load thumbnail: ${thumbnailUrl}`);
                img.src = thumbnailUrl;
            });
        }

        /**
         * Add YouTube branding overlay to thumbnail
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {number} width - Canvas width
         * @param {number} height - Canvas height
         */
        addYouTubeBranding(ctx, width, height) {
            try {
                // Add semi-transparent YouTube play button in center
                const centerX = width / 2;
                const centerY = height / 2;
                const buttonSize = Math.min(width, height) * 0.15;
                
                // Red circular background
                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.beginPath();
                ctx.arc(centerX, centerY, buttonSize, 0, 2 * Math.PI);
                ctx.fill();
                
                // White play triangle
                ctx.fillStyle = 'white';
                ctx.beginPath();
                const triangleSize = buttonSize * 0.6;
                ctx.moveTo(centerX - triangleSize * 0.3, centerY - triangleSize * 0.5);
                ctx.lineTo(centerX - triangleSize * 0.3, centerY + triangleSize * 0.5);
                ctx.lineTo(centerX + triangleSize * 0.7, centerY);
                ctx.closePath();
                ctx.fill();
                
            } catch (error) {
                console.warn('Error adding YouTube branding:', error);
            }
        }

        /**
         * Try to load TikTok video thumbnail using Flutter bridge (bypasses CORS)
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - TikTok URL
         * @param {string} category - Link category
         * @param {string} domain - Domain name
         * @returns {Promise<boolean>} - True if thumbnail was successfully applied
         */
        async tryTikTokThumbnail(linkObject, url, category, domain) {
            // CRITICAL FIX: Check if thumbnail already cached in THREE locations:
            // 1. Global cache (survives furniture refresh)
            // 2. linkData.thumbnailUrl (set by branding)
            // 3. tiktokMetadata.thumbnail_url (set by previous thumbnail fetch)
            
            let cachedThumbnailUrl = this.tiktokThumbnailCache.get(url) ||
                                      linkObject.userData.linkData?.thumbnailUrl || 
                                      linkObject.userData.tiktokMetadata?.thumbnail_url;
            
            if (cachedThumbnailUrl) {
                const cacheSource = this.tiktokThumbnailCache.has(url) ? 'global cache' :
                                    linkObject.userData.linkData?.thumbnailUrl ? 'linkData' : 'tiktokMetadata';
                console.log(`🎵 [TIKTOK] Using cached thumbnail from ${cacheSource}:`, cachedThumbnailUrl);
                const success = await this.loadAndApplyThumbnail(
                    linkObject, 
                    cachedThumbnailUrl, 
                    'tiktok'
                );
                if (success) {
                    console.log('✅ TikTok thumbnail applied from cache');
                    return true;
                }
            }
            
            // DEDUPLICATION: Check if fetch already in progress for this URL
            if (this.tiktokPendingFetches.has(url)) {
                console.log(`🎵 [TIKTOK] Fetch already in progress for ${url}, waiting...`);
                try {
                    const thumbnailUrl = await this.tiktokPendingFetches.get(url);
                    if (thumbnailUrl) {
                        console.log(`🎵 [TIKTOK] Reusing fetch result from concurrent request`);
                        const success = await this.loadAndApplyThumbnail(linkObject, thumbnailUrl, 'tiktok');
                        if (success) {
                            console.log('✅ TikTok thumbnail applied from pending fetch');
                            return true;
                        }
                    }
                } catch (error) {
                    console.warn(`🎵 [TIKTOK] Pending fetch failed:`, error);
                }
                return false;
            }
            
            // START NEW FETCH: Create promise and store in pending fetches
            const fetchPromise = this._fetchTikTokThumbnailUrl(url);
            this.tiktokPendingFetches.set(url, fetchPromise);
            
            try {
                const thumbnailUrl = await fetchPromise;
                if (thumbnailUrl) {
                    const success = await this.loadAndApplyThumbnail(linkObject, thumbnailUrl, 'tiktok');
                    if (success) {
                        // Store in global cache for future use
                        this.tiktokThumbnailCache.set(url, thumbnailUrl);
                        console.log(`🎵 [GLOBAL CACHE] Stored TikTok thumbnail for ${url}`);
                        
                        // Store oEmbed metadata in userData for preview screen
                        if (!linkObject.userData.tiktokMetadata) {
                            linkObject.userData.tiktokMetadata = {
                                thumbnail_url: thumbnailUrl
                            };
                        }
                        
                        console.log('✅ TikTok thumbnail applied from new fetch');
                        return true;
                    }
                }
            } catch (error) {
                console.error(`🎵 [TIKTOK] All fetch attempts failed:`, error);
            } finally {
                // Clean up pending fetch
                this.tiktokPendingFetches.delete(url);
            }
            
            return false;
        }
        
        /**
         * Internal method to fetch TikTok thumbnail URL with retry logic
         * @private
         */
        async _fetchTikTokThumbnailUrl(url) {
            const maxRetries = 3;
            const baseTimeout = 8000; // 8 seconds
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    if (DEBUG) console.log(`🎵 [TIKTOK] ========== Attempt ${attempt}/${maxRetries} ==========`);
                    if (DEBUG) console.log('🎵 [TIKTOK] URL:', url);
                    
                    // CRITICAL: Check if Flutter bridge is available
                    if (!window.TikTokMetadataChannel) {
                        console.warn('🎵 [TIKTOK] Flutter bridge not available, skipping');
                        return null;
                    }
                    
                    // CRITICAL: Wait longer before first retry to allow Flutter bridge to fully initialize
                    if (attempt === 1) {
                        console.log('🎵 [TIKTOK] Waiting 2s for Flutter bridge to be ready...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    // Generate unique callback name to prevent collisions with concurrent requests
                    const callbackId = 'thumbnailCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    const callbackName = 'tiktokMetadataCallback_' + callbackId;
                    
                    if (DEBUG) console.log('🎵 [TIKTOK] Requesting via Flutter bridge with callback:', callbackName);
                    
                    // Exponential backoff for timeout
                    const timeout = baseTimeout * attempt;
                    
                    // Request metadata via Flutter bridge (bypasses CORS)
                    const data = await new Promise((resolve, reject) => {
                        // Set up one-time callback
                        window[callbackName] = (metadata) => {
                            if (DEBUG) console.log('🎵 [TIKTOK] ✅ Received metadata via Flutter bridge');
                            delete window[callbackName]; // Clean up
                            resolve(metadata);
                        };
                        
                        // Request via bridge
                        window.TikTokMetadataChannel.postMessage(JSON.stringify({
                            action: 'getTikTokMetadata',
                            url: url,
                            callbackName: callbackName
                        }));
                        
                        // Timeout with exponential backoff
                        setTimeout(() => {
                            if (window[callbackName]) {
                                delete window[callbackName];
                                reject(new Error(`TikTok metadata request timeout (${timeout}ms)`));
                            }
                        }, timeout);
                    });
                
                    if (DEBUG) console.log('🎵 [TIKTOK] ✅ oEmbed data received:', data);
                    if (DEBUG) console.log('🎵 [TIKTOK] Thumbnail URL:', data.thumbnail_url);
                    
                    if (data.thumbnail_url) {
                        console.log(`🎵 [TIKTOK] ✅ Successfully fetched thumbnail URL`);
                        return data.thumbnail_url;
                    } else {
                        console.warn('🎵 [TIKTOK] ⚠️ No thumbnail_url in oEmbed data');
                    }
                    
                    console.warn('🎵 [TIKTOK] ========== TikTok thumbnail attempt FAILED ==========');
                    
                    // If not last attempt, wait before retry with exponential backoff
                    if (attempt < maxRetries) {
                        const waitTime = 2000 * attempt; // 2s, 4s, 6s
                        if (DEBUG) console.log(`🎵 [TIKTOK] Waiting ${waitTime}ms before retry ${attempt + 1}...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                    
                } catch (error) {
                    console.error(`🎵 [TIKTOK] ❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
                    
                    // If not last attempt, wait before retry with exponential backoff
                    if (attempt < maxRetries) {
                        const waitTime = 2000 * attempt; // 2s, 4s, 6s
                        console.log(`🎵 [TIKTOK] Waiting ${waitTime}ms before retry ${attempt + 1}...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }
            }
            
            console.error(`🎵 [TIKTOK] ❌❌❌ All ${maxRetries} attempts failed for TikTok thumbnail`);
            return null;
        }

        /**
         * Try to load Instagram Reel thumbnail using oEmbed API
         * Instagram oEmbed API is publicly accessible for some content
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Instagram URL
         * @param {string} category - Link category
         * @param {string} domain - Domain name
         * @returns {Promise<boolean>} - True if thumbnail was successfully applied
         */
        async tryInstagramThumbnail(linkObject, url, category, domain) {
            try {
                console.log('📸 Instagram thumbnails not supported (CORS restrictions)');
                // Instagram oEmbed API doesn't support CORS from browser
                // Would need backend proxy to fetch
                return false;
                
                // Original attempt (blocked by CORS):
                // const oEmbedUrl = `https://www.instagram.com/oembed?url=${encodeURIComponent(url)}`;
                // const response = await fetch(oEmbedUrl);
                if (!response.ok) {
                    console.warn('⚠️ Instagram oEmbed API request failed:', response.status);
                    return false;
                }
                
                const data = await response.json();
                console.log('📸 Instagram oEmbed data received:', data);
                
                // Extract thumbnail URL from oEmbed response
                const thumbnailUrl = data.thumbnail_url;
                if (!thumbnailUrl) {
                    console.warn('⚠️ No thumbnail URL in Instagram oEmbed response');
                    return false;
                }
                
                console.log('📸 Found Instagram thumbnail URL:', thumbnailUrl);
                
                // Load and apply the thumbnail
                const success = await this.loadAndApplyThumbnail(linkObject, thumbnailUrl, 'instagram');
                
                if (success) {
                    // Store oEmbed metadata in userData for preview screen
                    if (!linkObject.userData.instagramMetadata) {
                        linkObject.userData.instagramMetadata = {
                            thumbnail_url: thumbnailUrl,
                            title: data.title,
                            author_name: data.author_name,
                            author_url: data.author_url
                        };
                        console.log('📸 Stored Instagram metadata:', linkObject.userData.instagramMetadata);
                    }
                    console.log('✅ Successfully loaded Instagram thumbnail');
                    return true;
                }
                
                return false;
                
            } catch (error) {
                console.error('Error in tryInstagramThumbnail:', error);
                return false;
            }
        }

        /**
         * Try to load Snapchat Spotlight thumbnail
         * Note: Snapchat doesn't currently have a public oEmbed API
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Snapchat URL
         * @param {string} category - Link category
         * @param {string} domain - Domain name
         * @returns {Promise<boolean>} - True if thumbnail was successfully applied
         */
        async trySnapchatThumbnail(linkObject, url, category, domain) {
            try {
                console.log('👻 Attempting to load Snapchat thumbnail for:', url);
                
                // Snapchat doesn't have a public oEmbed API currently
                // Return false to use fallback icon
                console.warn('⚠️ Snapchat does not provide a public thumbnail API');
                return false;
                
            } catch (error) {
                console.error('Error in trySnapchatThumbnail:', error);
                return false;
            }
        }

        /**
         * Try to load Spotify track thumbnail using oEmbed API
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Spotify URL
         * @param {string} category - Link category
         * @param {string} domain - Domain name
         * @returns {Promise<boolean>} - True if thumbnail was successfully applied
         */
        async trySpotifyThumbnail(linkObject, url, category, domain) {
            try {
                if (DEBUG) console.log('🎵 Attempting to load Spotify thumbnail for:', url);
                
                // Extract track ID from Spotify URL
                const trackId = this.extractSpotifyTrackId(url);
                if (!trackId) {
                    console.warn('⚠️ Could not extract Spotify track ID from URL:', url);
                    return false;
                }
                
                // Use Spotify oEmbed API to fetch track metadata including thumbnail
                const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
                if (DEBUG) console.log('🎵 Fetching Spotify oEmbed data from:', oEmbedUrl);
                
                try {
                    const response = await this.fetchWithTimeout(oEmbedUrl, 3000); // 3 second timeout
                    if (!response.ok) {
                        console.warn('⚠️ Spotify oEmbed API request failed:', response.status);
                        return false;
                    }
                    
                    const data = await response.json();
                    if (DEBUG) console.log('🎵 Spotify oEmbed data received:', data);
                    
                    // Extract thumbnail URL from oEmbed response
                    const thumbnailUrl = data.thumbnail_url;
                    if (!thumbnailUrl) {
                        console.warn('⚠️ No thumbnail URL in Spotify oEmbed response');
                        return false;
                    }
                    
                    if (DEBUG) console.log('🎵 Found Spotify thumbnail URL:', thumbnailUrl);
                    
                    // Load and apply the thumbnail
                    const success = await this.loadAndApplyThumbnail(linkObject, thumbnailUrl, trackId);
                    if (success) {
                        // Store oEmbed metadata in userData for preview screen
                        if (!linkObject.userData.spotifyMetadata) {
                            linkObject.userData.spotifyMetadata = {
                                thumbnail_url: data.thumbnail_url,
                                title: data.title,
                                artist_name: data.author_name // Spotify uses author_name in oEmbed
                            };
                            if (DEBUG) console.log('🎵 Stored Spotify metadata:', linkObject.userData.spotifyMetadata);
                        }
                        if (DEBUG) console.log('✅ Successfully loaded Spotify thumbnail');
                        return true;
                    }
                    
                    return false;
                    
                } catch (fetchError) {
                    console.error('❌ Error fetching Spotify oEmbed data:', fetchError);
                    return false;
                }
                
            } catch (error) {
                console.error('Error in trySpotifyThumbnail:', error);
                return false;
            }
        }

        /**
         * Extract Spotify track ID from URL
         * @param {string} url - Spotify URL
         * @returns {string|null} - Track ID or null if not found
         */
        extractSpotifyTrackId(url) {
            try {
                // Handle various Spotify URL formats:
                // https://open.spotify.com/track/abc123
                // spotify:track:abc123
                const trackMatch = url.match(/track[/:]([a-zA-Z0-9]+)/);
                if (trackMatch && trackMatch[1]) {
                    return trackMatch[1];
                }
                return null;
            } catch (error) {
                console.error('Error extracting Spotify track ID:', error);
                return null;
            }
        }

        /**
         * Try to load Instagram media thumbnail using oEmbed API
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Instagram URL
         * @param {string} category - Link category
         * @param {string} domain - Domain name
         * @returns {Promise<boolean>} - True if thumbnail was successfully applied
         */
        async tryInstagramThumbnail(linkObject, url, category, domain) {
            try {
                console.log('📸 Attempting to load Instagram thumbnail for:', url);
                
                // Use Instagram oEmbed API to fetch media metadata including thumbnail
                const oEmbedUrl = `https://www.instagram.com/oembed?url=${encodeURIComponent(url)}`;
                console.log('📸 Fetching Instagram oEmbed data from:', oEmbedUrl);
                
                try {
                    const response = await this.fetchWithTimeout(oEmbedUrl, 3000); // 3 second timeout
                    if (!response.ok) {
                        console.warn('⚠️ Instagram oEmbed API request failed:', response.status);
                        return false;
                    }
                    
                    const data = await response.json();
                    console.log('📸 Instagram oEmbed data received:', data);
                    
                    // Extract thumbnail URL from oEmbed response
                    const thumbnailUrl = data.thumbnail_url;
                    if (!thumbnailUrl) {
                        console.warn('⚠️ No thumbnail URL in Instagram oEmbed response');
                        return false;
                    }
                    
                    console.log('📸 Found Instagram thumbnail URL:', thumbnailUrl);
                    
                    // Extract media ID for logging
                    const mediaId = url.match(/\/p\/([^\/\?]+)/) || url.match(/\/reel\/([^\/\?]+)/);
                    const id = mediaId ? mediaId[1] : 'unknown';
                    
                    // Load and apply the thumbnail
                    const success = await this.loadAndApplyThumbnail(linkObject, thumbnailUrl, id);
                    if (success) {
                        // Store oEmbed metadata in userData for preview screen
                        if (!linkObject.userData.instagramMetadata) {
                            linkObject.userData.instagramMetadata = {
                                thumbnail_url: data.thumbnail_url,
                                title: data.title,
                                author_name: data.author_name,
                                author_url: data.author_url
                            };
                            console.log('📸 Stored Instagram metadata:', linkObject.userData.instagramMetadata);
                        }
                        console.log('✅ Successfully loaded Instagram thumbnail');
                        return true;
                    }
                    
                    return false;
                    
                } catch (fetchError) {
                    console.error('❌ Error fetching Instagram oEmbed data:', fetchError);
                    return false;
                }
                
            } catch (error) {
                console.error('Error in tryInstagramThumbnail:', error);
                return false;
            }
        }

        /**
         * Try to load Vimeo video thumbnail using oEmbed API
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Vimeo URL
         * @param {string} category - Link category
         * @param {string} domain - Domain name
         * @returns {Promise<boolean>} - True if thumbnail was successfully applied
         */
        async tryVimeoThumbnail(linkObject, url, category, domain) {
            const maxRetries = 3;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`🎬 Attempt ${attempt}/${maxRetries}: Attempting to load Vimeo thumbnail for:`, url);
                    
                    // Use Vimeo oEmbed API to fetch video metadata including thumbnail
                    const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
                    console.log('🎬 Fetching Vimeo oEmbed data from:', oEmbedUrl);
                    
                    try {
                        const response = await fetch(oEmbedUrl);
                        if (!response.ok) {
                            console.warn(`⚠️ Vimeo oEmbed API request failed (attempt ${attempt}):`, response.status);
                            if (attempt < maxRetries) {
                                const waitTime = 1000 * attempt; // 1s, 2s, 3s
                                console.log(`🎬 Waiting ${waitTime}ms before retry...`);
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                                continue;
                            }
                            return false;
                        }
                        
                        const data = await response.json();
                        console.log('🎬 Vimeo oEmbed data received:', data);
                        
                        // Extract thumbnail URL from oEmbed response
                        const thumbnailUrl = data.thumbnail_url;
                        if (!thumbnailUrl) {
                            console.warn('⚠️ No thumbnail URL in Vimeo oEmbed response');
                            return false;
                        }
                        
                        console.log('🎬 Found Vimeo thumbnail URL:', thumbnailUrl);
                        
                        // Extract video ID for logging
                        const videoId = data.video_id || 'unknown';
                        
                        // Load and apply the thumbnail
                        const success = await this.loadAndApplyThumbnail(linkObject, thumbnailUrl, videoId);
                        if (success) {
                            console.log(`✅ Successfully loaded Vimeo thumbnail on attempt ${attempt}`);
                            return true;
                        }
                        
                        // If loadAndApplyThumbnail failed, retry
                        if (attempt < maxRetries) {
                            const waitTime = 1000 * attempt;
                            console.log(`🎬 Thumbnail load failed, waiting ${waitTime}ms before retry...`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            continue;
                        }
                        return false;
                        
                    } catch (fetchError) {
                        console.error(`❌ Error fetching Vimeo oEmbed data (attempt ${attempt}):`, fetchError);
                        if (attempt < maxRetries) {
                            const waitTime = 1000 * attempt;
                            console.log(`🎬 Waiting ${waitTime}ms before retry...`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            continue;
                        }
                        return false;
                    }
                    
                } catch (error) {
                    console.error(`Error in tryVimeoThumbnail (attempt ${attempt}):`, error);
                    if (attempt < maxRetries) {
                        const waitTime = 1000 * attempt;
                        console.log(`🎬 Waiting ${waitTime}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                    return false;
                }
            }
            
            console.error(`🎬 ❌ All ${maxRetries} attempts failed for Vimeo thumbnail`);
            return false;
        }

        /**
         * Try to load SoundCloud track thumbnail using oEmbed API
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - SoundCloud URL
         * @param {string} category - Link category
         * @param {string} domain - Domain name
         * @returns {Promise<boolean>} - True if thumbnail was successfully applied
         */
        async trySoundCloudThumbnail(linkObject, url, category, domain) {
            try {
                console.log('🎧 Attempting to load SoundCloud thumbnail for:', url);
                
                // Use SoundCloud oEmbed API to fetch track metadata including thumbnail
                const oEmbedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
                console.log('🎧 Fetching SoundCloud oEmbed data from:', oEmbedUrl);
                
                try {
                    const response = await fetch(oEmbedUrl);
                    if (!response.ok) {
                        console.warn('⚠️ SoundCloud oEmbed API request failed:', response.status);
                        return false;
                    }
                    
                    const data = await response.json();
                    console.log('🎧 SoundCloud oEmbed data received:', data);
                    
                    // Extract thumbnail URL from oEmbed response
                    const thumbnailUrl = data.thumbnail_url;
                    if (!thumbnailUrl) {
                        console.warn('⚠️ No thumbnail URL in SoundCloud oEmbed response');
                        return false;
                    }
                    
                    console.log('🎧 Found SoundCloud thumbnail URL:', thumbnailUrl);
                    
                    // Use title or author for logging
                    const trackId = data.title || 'unknown';
                    
                    // Load and apply the thumbnail
                    const success = await this.loadAndApplyThumbnail(linkObject, thumbnailUrl, trackId);
                    if (success) {
                        console.log('✅ Successfully loaded SoundCloud thumbnail');
                        return true;
                    }
                    
                    return false;
                    
                } catch (fetchError) {
                    console.error('❌ Error fetching SoundCloud oEmbed data:', fetchError);
                    return false;
                }
                
            } catch (error) {
                console.error('Error in trySoundCloudThumbnail:', error);
                return false;
            }
        }

        /**
         * Try to apply YouTube thumbnail to branded objects without interfering with brand materials
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Link URL
         * @returns {Promise<boolean>} - True if YouTube thumbnail was successfully applied
         */
        async tryYouTubeThumbnailForBrandedObject(linkObject, url) {
            try {
                // First check if this is a YouTube URL
                const videoId = this.extractYouTubeVideoId(url);
                if (!videoId) {
                    return false;
                }
                
                // Fetch YouTube metadata via oEmbed if we don't have it yet
                if (!linkObject.userData.youtubeMetadata) {
                    try {
                        const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
                        const response = await fetch(oEmbedUrl);
                        if (response.ok) {
                            const data = await response.json();
                            if (data.title) {
                                linkObject.userData.youtubeMetadata = {
                                    title: data.title,
                                    author_name: data.author_name,
                                    thumbnail_url: data.thumbnail_url,
                                    videoId: videoId
                                };
                            }
                        }
                    } catch (oEmbedError) {
                        console.warn('Could not fetch YouTube oEmbed metadata:', oEmbedError);
                        // Continue with thumbnail loading
                    }
                }

                // Try different thumbnail qualities (prioritize ones more likely to exist)
                const thumbnailQualities = [
                    'hqdefault.jpg',      // 480x360 (most reliable)
                    'mqdefault.jpg',      // 320x180 (backup)
                    'default.jpg',        // 120x90 (always exists)
                    'maxresdefault.jpg'   // 1280x720 (best quality but often missing)
                ];

                for (const quality of thumbnailQualities) {
                    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${quality}`;
                    
                    try {
                        const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, videoId);
                        if (success) {
                            // Store YouTube metadata if available from linkData
                            const linkData = linkObject.userData.linkData;
                            if (linkData && linkData.title && !linkData.isMinimal) {
                                if (!linkObject.userData.youtubeMetadata) {
                                    linkObject.userData.youtubeMetadata = {
                                        title: linkData.title,
                                        description: linkData.description,
                                        thumbnailUrl: thumbnailUrl,
                                        videoId: videoId
                                    };
                                }
                            }
                            
                            // Update label now that we have metadata
                            if (window.linkTitleManager && linkObject.userData.youtubeMetadata) {
                                window.linkTitleManager.createOrUpdateLabel(linkObject);
                            }
                            
                            return true;
                        }
                    } catch (error) {
                        console.warn(`Failed to load ${quality} for ${videoId}:`, error);
                        continue;
                    }
                }

                console.warn(`⚠️ No YouTube thumbnail could be loaded for branded object: ${videoId}`);
                return false;
                
            } catch (error) {
                console.error('Error in tryYouTubeThumbnailForBrandedObject:', error);
                return false;
            }
        }

        /**
         * Load and apply thumbnail image to branded link object (preserves brand materials on other faces)
         * @param {Object} linkObject - Three.js link object
         * @param {string} thumbnailUrl - Thumbnail URL to load
         * @param {string} videoId - YouTube video ID for logging
         * @returns {Promise<boolean>} - True if successfully loaded and applied
         */
        async loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, videoId) {
            return new Promise((resolve, reject) => {
                const textureLoader = new THREE.TextureLoader();
                
                textureLoader.load(
                    thumbnailUrl,
                    (texture) => {
                        try {
                            // Configure texture
                            texture.wrapS = THREE.ClampToEdgeWrapping;
                            texture.wrapT = THREE.ClampToEdgeWrapping;
                            texture.minFilter = THREE.LinearFilter;
                            texture.magFilter = THREE.LinearFilter;
                            texture.flipY = true;

                            // Only apply to front face for branded objects
                            if (linkObject.material && Array.isArray(linkObject.material)) {
                                // Apply only to the front face material (index 4)
                                const frontMaterial = linkObject.material[4];
                                if (frontMaterial) {
                                    // Create a new material with the thumbnail
                                    // Anti-flicker settings: polygonOffset prevents z-fighting
                                    const thumbnailMaterial = new THREE.MeshStandardMaterial({
                                        map: texture,
                                        transparent: false,  // Changed from true - reduces flicker
                                        side: THREE.FrontSide,  // Changed from DoubleSide - reduces artifacts
                                        polygonOffset: true,  // Enable polygon offset to prevent z-fighting
                                        polygonOffsetFactor: -1,  // Negative value pulls texture towards camera
                                        polygonOffsetUnits: -1,   // Additional offset for stability
                                        depthWrite: true,  // Ensure proper depth buffer writes
                                        depthTest: true    // Ensure proper depth testing
                                    });
                                    
                                    // Replace only the front face material
                                    linkObject.material[4] = thumbnailMaterial;
                                    
                                    resolve(true);
                                } else {
                                    console.warn(`⚠️ No front face material found for branded object: ${videoId}`);
                                    resolve(false);
                                }
                            } else {
                                console.warn(`⚠️ Invalid material structure for branded object: ${videoId}`);
                                resolve(false);
                            }
                            
                        } catch (error) {
                            console.error(`Error applying thumbnail to branded object ${videoId}:`, error);
                            reject(error);
                        }
                    },
                    undefined,
                    (error) => {
                        console.warn(`Failed to load thumbnail for branded object ${videoId}:`, error);
                        reject(error);
                    }
                );
            });
        }

        /**
         * Try to apply Spotify thumbnail to branded objects without interfering with brand materials
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Link URL
         * @returns {Promise<boolean>} - True if Spotify thumbnail was successfully applied
         */
        async trySpotifyThumbnailForBrandedObject(linkObject, url) {
            try {
                console.log(`🎵 Applying Spotify thumbnail to branded object: ${url}`);

                // Extract track ID
                const trackId = this.extractSpotifyTrackId(url);
                if (!trackId) {
                    console.warn('⚠️ Could not extract Spotify track ID');
                    return false;
                }

                // Check cache first
                const linkData = linkObject.userData.linkData;
                let thumbnailUrl = linkData?.thumbnailUrl;
                
                // If cached, use it immediately
                if (thumbnailUrl) {
                    console.log('🎵 [CACHE] Using cached Spotify thumbnail:', thumbnailUrl);
                    const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, trackId);
                    if (success) {
                        console.log(`✅ Spotify thumbnail applied to branded object: ${trackId}`);
                        return true;
                    }
                }

                // Fetch thumbnail from Spotify oEmbed API
                console.log('🎵 [API] Fetching Spotify thumbnail from oEmbed API...');
                const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
                
                try {
                    const response = await this.fetchWithTimeout(oEmbedUrl, 3000); // 3 second timeout
                    if (!response.ok) {
                        console.warn('⚠️ Spotify oEmbed API request failed:', response.status);
                        return false;
                    }
                    
                    const data = await response.json();
                    thumbnailUrl = data.thumbnail_url;
                    
                    // Store oEmbed metadata in userData for preview screen
                    if (!linkObject.userData.spotifyMetadata) {
                        linkObject.userData.spotifyMetadata = {
                            thumbnail_url: data.thumbnail_url,
                            title: data.title,
                            artist_name: data.artist_name,
                            provider_name: data.provider_name
                        };
                        console.log('🎵 [BRANDED] Stored Spotify metadata:', linkObject.userData.spotifyMetadata);
                    }
                    
                    if (!thumbnailUrl) {
                        console.warn('⚠️ No thumbnail URL in Spotify oEmbed response');
                        return false;
                    }
                    
                    // Cache for future use
                    if (linkData) {
                        linkData.thumbnailUrl = thumbnailUrl;
                        console.log('🎵 [CACHE] Cached Spotify thumbnail URL');
                    }
                    
                    const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, trackId);
                    if (success) {
                        console.log(`✅ Spotify thumbnail applied to branded object: ${trackId}`);
                        return true;
                    }
                    
                } catch (fetchError) {
                    console.error('❌ Error fetching Spotify oEmbed data:', fetchError);
                    return false;
                }

                console.warn(`⚠️ No Spotify thumbnail could be loaded for branded object`);
                return false;
                
            } catch (error) {
                console.error('Error in trySpotifyThumbnailForBrandedObject:', error);
                return false;
            }
        }

        /**
         * Try to apply Vimeo thumbnail to branded objects without interfering with brand materials
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Link URL
         * @returns {Promise<boolean>} - True if Vimeo thumbnail was successfully applied
         */
        async tryVimeoThumbnailForBrandedObject(linkObject, url) {
            try {
                console.log(`🎬 Applying Vimeo thumbnail to branded object: ${url}`);

                // Check cache first
                const linkData = linkObject.userData.linkData;
                let thumbnailUrl = linkData?.thumbnailUrl;
                
                // If cached, use it immediately
                if (thumbnailUrl) {
                    console.log('🎬 [CACHE] Using cached Vimeo thumbnail:', thumbnailUrl);
                    const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1] || 'unknown';
                    const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, videoId);
                    if (success) {
                        console.log(`✅ Vimeo thumbnail applied to branded object: ${videoId}`);
                        return true;
                    }
                }

                // Fetch thumbnail from Vimeo oEmbed API
                console.log('🎬 [API] Fetching Vimeo thumbnail from oEmbed API...');
                const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
                
                try {
                    const response = await fetch(oEmbedUrl);
                    if (!response.ok) {
                        console.warn('⚠️ Vimeo oEmbed API request failed:', response.status);
                        return false;
                    }
                    
                    const data = await response.json();
                    thumbnailUrl = data.thumbnail_url;
                    
                    if (!thumbnailUrl) {
                        console.warn('⚠️ No thumbnail URL in Vimeo oEmbed response');
                        return false;
                    }
                    
                    // Store Vimeo metadata from oEmbed
                    if (data.title && !linkObject.userData.vimeoMetadata) {
                        linkObject.userData.vimeoMetadata = {
                            title: data.title,
                            author_name: data.author_name,
                            thumbnail_url: data.thumbnail_url,
                            video_id: data.video_id
                        };
                        console.log('🎬 Stored Vimeo metadata:', linkObject.userData.vimeoMetadata);
                    }
                    
                    // Cache for future use
                    if (linkData) {
                        linkData.thumbnailUrl = thumbnailUrl;
                        console.log('🎬 [CACHE] Cached Vimeo thumbnail URL');
                    }
                    
                    const videoId = data.video_id || 'unknown';
                    const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, videoId);
                    if (success) {
                        console.log(`✅ Vimeo thumbnail applied to branded object: ${videoId}`);
                        
                        // Update label now that we have metadata
                        if (window.linkTitleManager && linkObject.userData.vimeoMetadata) {
                            window.linkTitleManager.createOrUpdateLabel(linkObject);
                            console.log('📝 Updated label with Vimeo metadata');
                        }
                        
                        return true;
                    }
                    
                } catch (fetchError) {
                    console.error('❌ Error fetching Vimeo oEmbed data:', fetchError);
                    return false;
                }

                console.warn(`⚠️ No Vimeo thumbnail could be loaded for branded object`);
                return false;
                
            } catch (error) {
                console.error('Error in tryVimeoThumbnailForBrandedObject:', error);
                return false;
            }
        }

        /**
         * Try to apply Deezer thumbnail to branded objects without interfering with brand materials
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Link URL
         * @returns {Promise<boolean>} - True if Deezer thumbnail was successfully applied
         */
        async tryDeezerThumbnailForBrandedObject(linkObject, url) {
            const maxRetries = 3;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`🎵 Attempt ${attempt}/${maxRetries}: Applying Deezer thumbnail to branded object: ${url}`);

                    // Extract content type and ID from URL
                    // Example: https://www.deezer.com/track/104011168
                    const urlMatch = url.match(/deezer\.com\/(track|album|playlist)\/([0-9]+)/);
                    if (!urlMatch) {
                        console.warn('⚠️ Could not parse Deezer URL:', url);
                        return false;
                    }

                    const contentType = urlMatch[1];
                    const contentId = urlMatch[2];

                    // Check if linkData already has thumbnail from URL processing
                    const linkData = linkObject.userData.linkData;
                    let thumbnailUrl = linkData?.thumbnailUrl;
                    
                    // If no thumbnail URL, try to fetch it from Flutter bridge (for reloaded objects)
                    if (!thumbnailUrl) {
                        console.log('🎵 [RELOAD] No cached thumbnail, fetching Deezer metadata from Flutter...');
                        try {
                            // Call Deezer metadata bridge directly (same as URLProcessor does)
                            const metadata = await this.requestDeezerMetadataFromBridge(contentType, contentId);
                            if (metadata?.thumbnailUrl) {
                                thumbnailUrl = metadata.thumbnailUrl;
                            // Cache it for future use
                            if (linkData) {
                                linkData.thumbnailUrl = thumbnailUrl;
                            }
                            // Store Deezer metadata in userData
                            if (metadata.title && !linkObject.userData.deezerMetadata) {
                                linkObject.userData.deezerMetadata = {
                                    title: metadata.title,
                                    artist: metadata.artist,
                                    thumbnailUrl: metadata.thumbnailUrl
                                };
                                console.log('🎵 Stored Deezer metadata:', linkObject.userData.deezerMetadata);
                                
                                // Update label now that we have metadata
                                if (window.linkTitleManager) {
                                    window.linkTitleManager.createOrUpdateLabel(linkObject);
                                    console.log('📝 Updated label with Deezer metadata');
                                }
                            }
                            console.log('🎵 [RELOAD] Fetched Deezer thumbnail from Flutter:', thumbnailUrl);
                        }
                    } catch (fetchError) {
                        console.warn('⚠️ Could not fetch Deezer metadata:', fetchError);
                    }
                }
                
                if (thumbnailUrl) {
                    console.log('🎵 Using thumbnail URL:', thumbnailUrl);
                    const success = await this.loadAndApplyThumbnailToBrandedObject(
                        linkObject,
                        thumbnailUrl,
                        contentId
                    );
                    if (success) {
                        // Also check if linkData has title and store as metadata
                        const linkData = linkObject.userData.linkData;
                        if (linkData && linkData.title && !linkData.isMinimal && !linkObject.userData.deezerMetadata) {
                            linkObject.userData.deezerMetadata = {
                                title: linkData.title,
                                description: linkData.description,
                                thumbnailUrl: thumbnailUrl
                            };
                            console.log('🎵 Stored Deezer metadata from linkData:', linkObject.userData.deezerMetadata);
                            
                            // Update label now that we have metadata
                            if (window.linkTitleManager) {
                                window.linkTitleManager.createOrUpdateLabel(linkObject);
                                console.log('📝 Updated label with Deezer metadata');
                            }
                        }
                        console.log(`✅ Deezer thumbnail applied to branded object: ${contentId}`);
                        return true;
                    }
                    return false;
                }

                    console.warn(`⚠️ No Deezer thumbnail could be loaded for branded object (attempt ${attempt})`);
                    
                    // If not last attempt, wait before retry
                    if (attempt < maxRetries) {
                        const waitTime = 1000 * attempt; // 1s, 2s, 3s
                        console.log(`🎵 Waiting ${waitTime}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                    return false;

                } catch (error) {
                    console.error(`Error in tryDeezerThumbnailForBrandedObject (attempt ${attempt}):`, error);
                    
                    // If not last attempt, wait before retry
                    if (attempt < maxRetries) {
                        const waitTime = 1000 * attempt;
                        console.log(`🎵 Waiting ${waitTime}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                    return false;
                }
            }
            
            console.error(`🎵 ❌ All ${maxRetries} attempts failed for Deezer thumbnail`);
            return false;
        }

        /**
         * Request Deezer metadata from Flutter bridge (for persistence recovery)
         * @param {string} contentType - Type of content (track, album, playlist)
         * @param {string} contentId - Deezer content ID
         * @returns {Promise<Object|null>} - Metadata object or null
         */
        requestDeezerMetadataFromBridge(contentType, contentId) {
            return new Promise((resolve) => {
                // Set up callback for Flutter to call back with data
                window.deezerMetadataCallback = (metadata) => {
                    console.log('🎵 [BRIDGE] Received Deezer metadata from Flutter:', metadata);
                    delete window.deezerMetadataCallback; // Clean up
                    resolve(metadata);
                };

                // Set timeout in case Flutter doesn't respond
                const timeoutId = setTimeout(() => {
                    console.warn('⏱️ Deezer metadata request timed out');
                    delete window.deezerMetadataCallback;
                    resolve(null);
                }, 5000);

                // Send request to Flutter via DeezerMetadataChannel
                try {
                    if (window.DeezerMetadataChannel) {
                        const message = JSON.stringify({
                            action: 'getDeezerMetadata',
                            contentType: contentType,
                            contentId: contentId
                        });
                        
                        console.log('🎵 [BRIDGE] Sending to DeezerMetadataChannel:', message);
                        window.DeezerMetadataChannel.postMessage(message);
                        
                        // Clear timeout when callback is called
                        const originalCallback = window.deezerMetadataCallback;
                        window.deezerMetadataCallback = (metadata) => {
                            clearTimeout(timeoutId);
                            originalCallback(metadata);
                        };
                    } else {
                        console.error('❌ DeezerMetadataChannel not available');
                        clearTimeout(timeoutId);
                        delete window.deezerMetadataCallback;
                        resolve(null);
                    }
                } catch (error) {
                    console.error('❌ Error sending Deezer metadata request:', error);
                    clearTimeout(timeoutId);
                    delete window.deezerMetadataCallback;
                    resolve(null);
                }
            });
        }

        /**
         * Try to apply Dailymotion thumbnail to branded objects without interfering with brand materials
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Link URL
         * @returns {Promise<boolean>} - True if Dailymotion thumbnail was successfully applied
         */
        async tryDailymotionThumbnailForBrandedObject(linkObject, url) {
            try {
                console.log(`🎬 Applying Dailymotion thumbnail to branded object: ${url}`);

                // Extract video ID from URL
                const videoId = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/)?.[1] || 'unknown';
                if (!videoId || videoId === 'unknown') {
                    console.warn('⚠️ Could not extract Dailymotion video ID from URL:', url);
                    return false;
                }

                // Check cache first
                const linkData = linkObject.userData.linkData;
                let thumbnailUrl = linkData?.thumbnailUrl;
                
                // If cached, use it immediately
                if (thumbnailUrl) {
                    console.log('🎬 [CACHE] Using cached Dailymotion thumbnail:', thumbnailUrl);
                    const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, videoId);
                    if (success) {
                        console.log(`✅ Dailymotion thumbnail applied to branded object: ${videoId}`);
                        return true;
                    }
                }

                // Fetch thumbnail from Flutter bridge (bypasses CORS)
                console.log('🎬 [FLUTTER BRIDGE] Requesting Dailymotion metadata for branding...');
                
                try {
                    const metadata = await new Promise((resolve) => {
                        // Generate unique callback name to avoid collisions
                        const callbackId = 'brandingCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        const callbackName = 'dailymotionMetadataCallback_' + callbackId;
                        
                        // Set up uniquely-named callback for Flutter response
                        window[callbackName] = (data) => {
                            console.log(`🎬 [FLUTTER BRIDGE] Received Dailymotion metadata for branding:`, data);
                            delete window[callbackName];
                            resolve(data);
                        };
                        
                        // Check if Flutter bridge is available
                        if (!window.DailymotionMetadataChannel) {
                            console.warn('⚠️ DailymotionMetadataChannel not available');
                            delete window[callbackName];
                            resolve(null);
                            return;
                        }
                        
                        // Request metadata from Flutter (include callback name)
                        const requestData = {
                            action: 'getDailymotionMetadata',
                            url: url,
                            callbackName: callbackName // Tell Flutter which callback to use
                        };
                        
                        try {
                            window.DailymotionMetadataChannel.postMessage(JSON.stringify(requestData));
                            console.log(`🎬 [FLUTTER BRIDGE] Metadata request sent (callback: ${callbackName})`);
                        } catch (error) {
                            console.error('❌ Error sending Dailymotion metadata request:', error);
                            delete window[callbackName];
                            resolve(null);
                        }
                        
                        // Timeout after 8 seconds (increased from 5s to allow more time)
                        setTimeout(() => {
                            if (window[callbackName]) {
                                console.warn(`⏱️ Dailymotion metadata request timed out (branding, callback: ${callbackName})`);
                                delete window[callbackName];
                                resolve(null);
                            }
                        }, 8000);
                    });
                    
                    if (metadata && metadata.thumbnailUrl) {
                        thumbnailUrl = metadata.thumbnailUrl || metadata.thumbnail_url;
                        
                        // Store Dailymotion metadata from Flutter
                        if (metadata.title && !linkObject.userData.dailymotionMetadata) {
                            linkObject.userData.dailymotionMetadata = {
                                title: metadata.title,
                                author_name: metadata.author || metadata.author_name,
                                thumbnail_url: thumbnailUrl
                            };
                            console.log('🎬 Stored Dailymotion metadata:', linkObject.userData.dailymotionMetadata);
                        }
                        
                        // Cache for future use
                        if (linkData) {
                            linkData.thumbnailUrl = thumbnailUrl;
                            console.log('🎬 [CACHE] Cached Dailymotion thumbnail URL');
                        }
                        
                        const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, videoId);
                        if (success) {
                            console.log(`✅ Dailymotion thumbnail applied to branded object: ${videoId}`);
                            
                            // Update label now that we have metadata
                            if (window.linkTitleManager && linkObject.userData.dailymotionMetadata) {
                                window.linkTitleManager.createOrUpdateLabel(linkObject);
                                console.log('📝 Updated label with Dailymotion metadata');
                            }
                            
                            return true;
                        }
                    } else {
                        console.warn('⚠️ No thumbnail URL in Dailymotion metadata response');
                    }
                    
                } catch (fetchError) {
                    console.error('❌ Error fetching Dailymotion metadata:', fetchError);
                    return false;
                }

                console.warn(`⚠️ No Dailymotion thumbnail could be loaded for branded object`);
                return false;
                
            } catch (error) {
                console.error('Error in tryDailymotionThumbnailForBrandedObject:', error);
                return false;
            }
        }

        /**
         * Try to apply SoundCloud thumbnail to branded objects without interfering with brand materials
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Link URL
         * @returns {Promise<boolean>} - True if SoundCloud thumbnail was successfully applied
         */
        async trySoundCloudThumbnailForBrandedObject(linkObject, url) {
            try {
                console.log(`🎧 Applying SoundCloud thumbnail to branded object: ${url}`);

                // Check cache first
                const linkData = linkObject.userData.linkData;
                let thumbnailUrl = linkData?.thumbnailUrl;
                
                // If cached, use it immediately
                if (thumbnailUrl) {
                    console.log('🎧 [CACHE] Using cached SoundCloud thumbnail:', thumbnailUrl);
                    const trackId = url.split('/').pop() || 'unknown';
                    const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, trackId);
                    if (success) {
                        console.log(`✅ SoundCloud thumbnail applied to branded object: ${trackId}`);
                        return true;
                    }
                }

                // Fetch thumbnail from SoundCloud oEmbed API
                console.log('🎧 [API] Fetching SoundCloud thumbnail from oEmbed API...');
                const oEmbedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
                
                try {
                    const response = await fetch(oEmbedUrl);
                    if (!response.ok) {
                        console.warn('⚠️ SoundCloud oEmbed API request failed:', response.status);
                        return false;
                    }
                    
                    const data = await response.json();
                    thumbnailUrl = data.thumbnail_url;
                    
                    if (!thumbnailUrl) {
                        console.warn('⚠️ No thumbnail URL in SoundCloud oEmbed response');
                        return false;
                    }
                    
                    // Cache for future use
                    if (linkData) {
                        linkData.thumbnailUrl = thumbnailUrl;
                        console.log('🎧 [CACHE] Cached SoundCloud thumbnail URL');
                    }
                    
                    const trackId = data.title || 'unknown';
                    const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, trackId);
                    if (success) {
                        console.log(`✅ SoundCloud thumbnail applied to branded object: ${trackId}`);
                        return true;
                    }
                    
                } catch (fetchError) {
                    console.error('❌ Error fetching SoundCloud oEmbed data:', fetchError);
                    return false;
                }

                console.warn(`⚠️ No SoundCloud thumbnail could be loaded for branded object`);
                return false;
                
            } catch (error) {
                console.error('Error in trySoundCloudThumbnailForBrandedObject:', error);
                return false;
            }
        }

        /**
         * Try to apply TikTok thumbnail to branded objects without interfering with brand materials
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Link URL
         * @returns {Promise<boolean>} - True if TikTok thumbnail was successfully applied
         */
        async tryTikTokThumbnailForBrandedObject(linkObject, url) {
            try {
                console.log(`🎵 [BRANDED] Applying TikTok thumbnail to branded object: ${url}`);

                // Check cache first - THREE locations:
                // 1. Global cache (survives furniture refresh)
                // 2. linkData.thumbnailUrl (set by previous branding call)
                // 3. tiktokMetadata.thumbnail_url (set by tryTikTokThumbnail)
                const linkData = linkObject.userData.linkData;
                let thumbnailUrl = this.tiktokThumbnailCache.get(url) ||
                                   linkData?.thumbnailUrl ||
                                   linkObject.userData.tiktokMetadata?.thumbnail_url;
                
                // If cached, use it immediately
                if (thumbnailUrl) {
                    const cacheSource = this.tiktokThumbnailCache.has(url) ? 'global cache' :
                                        linkData?.thumbnailUrl ? 'linkData' : 'tiktokMetadata';
                    console.log(`🎵 [CACHE] Using cached TikTok thumbnail from ${cacheSource}:`, thumbnailUrl);
                    const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, 'tiktok');
                    if (success) {
                        console.log(`✅ TikTok thumbnail applied to branded object`);
                        return true;
                    }
                }

                // Fetch thumbnail from Flutter bridge (bypasses CORS)
                console.log('🎵 [FLUTTER BRIDGE] Requesting TikTok metadata for branding...');
                
                try {
                    const metadata = await new Promise((resolve) => {
                        // Generate unique callback name to avoid collisions
                        const callbackId = 'brandingCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        const callbackName = 'tiktokMetadataCallback_' + callbackId;
                        
                        // Set up uniquely-named callback for Flutter response
                        window[callbackName] = (data) => {
                            console.log(`🎵 [FLUTTER BRIDGE] Received TikTok metadata for branding:`, data);
                            delete window[callbackName];
                            resolve(data);
                        };
                        
                        // Check if Flutter bridge is available
                        if (!window.TikTokMetadataChannel) {
                            console.warn('⚠️ TikTokMetadataChannel not available');
                            delete window[callbackName];
                            resolve(null);
                            return;
                        }
                        
                        // Request metadata from Flutter (include callback name)
                        const requestData = {
                            action: 'getTikTokMetadata',
                            url: url,
                            callbackName: callbackName // Tell Flutter which callback to use
                        };
                        
                        try {
                            window.TikTokMetadataChannel.postMessage(JSON.stringify(requestData));
                            console.log(`🎵 [FLUTTER BRIDGE] Metadata request sent (callback: ${callbackName})`);
                        } catch (error) {
                            console.error('❌ Error sending TikTok metadata request:', error);
                            delete window[callbackName];
                            resolve(null);
                        }
                        
                        // Timeout after 8 seconds
                        setTimeout(() => {
                            if (window[callbackName]) {
                                console.warn(`⏱️ TikTok metadata request timed out (branding, callback: ${callbackName})`);
                                delete window[callbackName];
                                resolve(null);
                            }
                        }, 8000);
                    });
                    
                    if (metadata && (metadata.thumbnailUrl || metadata.thumbnail_url)) {
                        thumbnailUrl = metadata.thumbnailUrl || metadata.thumbnail_url;
                        
                        // CRITICAL: Store in global cache to survive furniture refresh
                        this.tiktokThumbnailCache.set(url, thumbnailUrl);
                        console.log(`🎵 [GLOBAL CACHE] Stored TikTok thumbnail for ${url}`);
                        
                        // Store TikTok metadata from Flutter
                        if (metadata.title && !linkObject.userData.tiktokMetadata) {
                            linkObject.userData.tiktokMetadata = {
                                title: metadata.title,
                                author_name: metadata.author || metadata.author_name,
                                thumbnail_url: thumbnailUrl
                            };
                            console.log('🎵 Stored TikTok metadata:', linkObject.userData.tiktokMetadata);
                        }
                        
                        // Cache for future use
                        if (linkData) {
                            linkData.thumbnailUrl = thumbnailUrl;
                            console.log('🎵 [CACHE] Cached TikTok thumbnail URL');
                        }
                        
                        const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, 'tiktok');
                        if (success) {
                            console.log(`✅ TikTok thumbnail applied to branded object`);
                            
                            // Update label now that we have metadata
                            if (window.linkTitleManager && linkObject.userData.tiktokMetadata) {
                                window.linkTitleManager.createOrUpdateLabel(linkObject);
                                console.log('📝 Updated label with TikTok metadata');
                            }
                            
                            return true;
                        }
                    }
                    
                } catch (fetchError) {
                    console.error('❌ Error fetching TikTok metadata via Flutter bridge:', fetchError);
                    return false;
                }

                console.warn(`⚠️ No TikTok thumbnail could be loaded for branded object`);
                return false;
                
            } catch (error) {
                console.error('Error in tryTikTokThumbnailForBrandedObject:', error);
                return false;
            }
        }

        /**
         * Try to apply Instagram thumbnail to branded objects without interfering with brand materials
         * Instagram oEmbed API is publicly accessible for some content
         * @param {Object} linkObject - Three.js link object
         * @param {string} url - Link URL
         * @returns {Promise<boolean>} - True if Instagram thumbnail was successfully applied
         */
        async tryInstagramThumbnailForBrandedObject(linkObject, url) {
            try {
                console.log(`📸 [BRANDED] Instagram thumbnails not supported (CORS restrictions)`);
                // Instagram oEmbed API doesn't support CORS from browser
                return false;
                
                // Original attempt (blocked by CORS):
                // const oEmbedUrl = `https://www.instagram.com/oembed?url=${encodeURIComponent(url)}`;
                // const response = await fetch(oEmbedUrl);
                
                try {
                    const response = null;
                    if (!response.ok) {
                        console.warn('⚠️ Instagram oEmbed API request failed:', response.status);
                        return false;
                    }
                    
                    const data = await response.json();
                    console.log('📸 [BRANDED] Instagram oEmbed data:', data);
                    const thumbnailUrl = data.thumbnail_url;
                    
                    // Store oEmbed metadata in userData for preview screen
                    if (!linkObject.userData.instagramMetadata) {
                        linkObject.userData.instagramMetadata = {
                            thumbnail_url: data.thumbnail_url,
                            title: data.title,
                            author_name: data.author_name,
                            author_url: data.author_url
                        };
                        console.log('📸 [BRANDED] Stored Instagram metadata:', linkObject.userData.instagramMetadata);
                    }
                    
                    if (!thumbnailUrl) {
                        console.warn('⚠️ No thumbnail URL in Instagram oEmbed response');
                        return false;
                    }
                    
                    const success = await this.loadAndApplyThumbnailToBrandedObject(linkObject, thumbnailUrl, 'instagram');
                    if (success) {
                        console.log(`✅ Instagram thumbnail applied to branded object`);
                        return true;
                    }
                    
                } catch (fetchError) {
                    console.error('❌ Error fetching Instagram oEmbed data:', fetchError);
                    return false;
                }

                console.warn(`⚠️ No Instagram thumbnail could be loaded for branded object`);
                return false;
                
            } catch (error) {
                console.error('Error in tryInstagramThumbnailForBrandedObject:', error);
                return false;
            }
        }

        // ...existing code...
    }

    // Export to global scope
    window.LinkVisualManager = LinkVisualManager;
    if (DEBUG) console.log("LinkVisualManager module loaded and exported to window.LinkVisualManager");

})();
