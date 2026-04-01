/**
 * URL Processing Module
 * Handles URL metadata extraction, YouTube API integration, and Open Graph parsing
 */

class URLProcessor {
    constructor() {
        this.supportedServices = {
            youtube: {
                patterns: [
                    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
                ],
                thumbnailTemplate: 'https://img.youtube.com/vi/{videoId}/maxresdefault.jpg',
                type: 'youtube'
            },
            tiktok: {
                patterns: [
                    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^\/]+\/video\/(\d+)/,
                    /(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\/([a-zA-Z0-9]+)/
                ],
                type: 'tiktok',
                oEmbedEndpoint: 'https://www.tiktok.com/oembed'
            },
            instagram: {
                patterns: [
                    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/
                ],
                type: 'instagram',
                oEmbedEndpoint: 'https://graph.facebook.com/v8.0/instagram_oembed'
            },
            snapchat: {
                patterns: [
                    /(?:https?:\/\/)?(?:www\.)?snapchat\.com\/spotlight\/([a-zA-Z0-9_-]+)/,
                    /(?:https?:\/\/)?(?:www\.)?snapchat\.com\/t\/([a-zA-Z0-9_-]+)/
                ],
                type: 'snapchat'
            },
            vimeo: {
                patterns: [
                    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
                    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/channels\/[^\/]+\/(\d+)/,
                    /(?:https?:\/\/)?(?:player\.)?vimeo\.com\/video\/(\d+)/
                ],
                type: 'vimeo',
                oEmbedEndpoint: 'https://vimeo.com/api/oembed.json'
            },
            deezer: {
                patterns: [
                    /(?:https?:\/\/)?(?:www\.)?deezer\.com\/(?:[a-z]{2}\/)?track\/(\d+)/,
                    /(?:https?:\/\/)?(?:www\.)?deezer\.com\/(?:[a-z]{2}\/)?album\/(\d+)/,
                    /(?:https?:\/\/)?(?:www\.)?deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/
                ],
                type: 'deezer',
                oEmbedEndpoint: 'https://www.deezer.com/plugins/oembed'
            },
            spotify: {
                patterns: [
                    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/track\/([a-zA-Z0-9]+)/,
                    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/album\/([a-zA-Z0-9]+)/,
                    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/playlist\/([a-zA-Z0-9]+)/
                ],
                type: 'spotify',
                oEmbedEndpoint: 'https://open.spotify.com/oembed'
            },
            dailymotion: {
                patterns: [
                    /(?:https?:\/\/)?(?:www\.)?dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
                    /(?:https?:\/\/)?(?:www\.)?dai\.ly\/([a-zA-Z0-9]+)/
                ],
                type: 'dailymotion',
                oEmbedEndpoint: 'https://www.dailymotion.com/services/oembed'
            },
            soundcloud: {
                patterns: [
                    /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/,
                    /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/sets\/[a-zA-Z0-9_-]+/
                ],
                type: 'soundcloud',
                oEmbedEndpoint: 'https://soundcloud.com/oembed'
            }
        };
        
        console.log('🔗 URLProcessor initialized with Dailymotion and SoundCloud support');
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
     * Process a URL and extract metadata
     * @param {string} url - The URL to process
     * @param {Object} options - Processing options {skipMetadata: boolean}
     * @returns {Promise<Object>} - Processed URL data with metadata
     */
    async processURL(url, options = {}) {
        console.log('🔗 Processing URL:', url);
        
        // DEFERRED METADATA: Check if we should skip metadata fetching
        // This speeds up first install by creating minimal objects immediately
        // Metadata can be enriched in background after world loads
        const skipMetadata = options.skipMetadata || window.skipMetadataFetching || false;
        
        if (skipMetadata) {
            console.log('⚡ [DEFERRED] Skipping metadata fetch, creating minimal object');
            return this.createMinimalLinkData(url);
        }
        
        try {
            // Validate and normalize URL
            const normalizedUrl = this.normalizeURL(url);
            if (!normalizedUrl) {
                throw new Error('Invalid URL format');
            }

            // Check for specific service (YouTube, etc.)
            const serviceData = this.detectService(normalizedUrl);
            if (serviceData) {
                console.log('🎥 Detected service:', serviceData.type);
                return await this.processServiceURL(normalizedUrl, serviceData);
            }

            // Fall back to general web page processing
            console.log('🌐 Processing as general web page');
            return await this.processWebPage(normalizedUrl);

        } catch (error) {
            console.error('❌ Error processing URL:', error);
            throw error;
        }
    }

    /**
     * Detect platform by domain (fallback when specific pattern doesn't match)
     * @param {string} domain - Domain name
     * @returns {string|null} - Platform type or null
     */
    detectPlatformByDomain(domain) {
        const domainLower = domain.toLowerCase();
        
        // Map domains to platform types
        const domainMap = {
            'youtube.com': 'youtube',
            'youtu.be': 'youtube',
            'm.youtube.com': 'youtube',
            'spotify.com': 'spotify',
            'open.spotify.com': 'spotify',
            'play.spotify.com': 'spotify',
            'instagram.com': 'instagram',
            'www.instagram.com': 'instagram',
            'tiktok.com': 'tiktok',
            'www.tiktok.com': 'tiktok',
            'snapchat.com': 'snapchat',
            'www.snapchat.com': 'snapchat',
            'vimeo.com': 'vimeo',
            'www.vimeo.com': 'vimeo',
            'dailymotion.com': 'dailymotion',
            'www.dailymotion.com': 'dailymotion',
            'dai.ly': 'dailymotion',
            'deezer.com': 'deezer',
            'www.deezer.com': 'deezer',
            'soundcloud.com': 'soundcloud',
            'www.soundcloud.com': 'soundcloud'
        };
        
        const detected = domainMap[domainLower];
        if (detected) {
            console.log(`🔍 Detected platform by domain: ${detected} (domain: ${domainLower})`);
        }
        return detected || null;
    }

    /**
     * Create minimal link data for deferred metadata fetching
     * Returns immediately with basic URL info, no API calls
     * @param {string} url - The URL
     * @returns {Object} - Minimal link data
     */
    createMinimalLinkData(url) {
        const normalizedUrl = this.normalizeURL(url) || url;
        const serviceData = this.detectService(normalizedUrl);
        
        // Extract domain for display
        let domain = 'web';
        try {
            const urlObj = new URL(normalizedUrl);
            domain = urlObj.hostname.replace('www.', '');
        } catch (e) {
            console.warn('Could not parse URL domain:', e);
        }
        
        // If specific service not detected by pattern, try detecting by domain
        // This handles search pages, browse pages, etc. that don't match content patterns
        let platformType = serviceData?.type;
        if (!platformType) {
            platformType = this.detectPlatformByDomain(domain);
            if (platformType) {
                console.log(`🔍 Detected platform by domain: ${platformType} (search/browse page)`);
            }
        }
        
        return {
            url: normalizedUrl,
            title: `Link (${domain})`,
            description: 'Loading metadata...',
            thumbnailUrl: null,
            linkType: platformType || 'web',
            serviceName: platformType ? platformType.charAt(0).toUpperCase() + platformType.slice(1) : 'Web',
            domain: domain,
            isValid: true,
            isMinimal: true, // Flag to indicate this needs enrichment
            videoId: serviceData?.id,
            trackId: serviceData?.id,
            mediaId: serviceData?.id
        };
    }

    /**
     * Normalize and validate URL
     * @param {string} url - Input URL
     * @returns {string|null} - Normalized URL or null if invalid
     */
    normalizeURL(url) {
        try {
            // Add protocol if missing
            if (!url.match(/^https?:\/\//)) {
                url = 'https://' + url;
            }

            // Validate URL
            const urlObj = new URL(url);
            return urlObj.href;
        } catch (error) {
            console.error('Invalid URL:', url, error);
            return null;
        }
    }

    /**
     * Detect if URL belongs to a specific service
     * @param {string} url - Normalized URL
     * @returns {Object|null} - Service data if detected
     */
    detectService(url) {
        for (const [serviceName, serviceConfig] of Object.entries(this.supportedServices)) {
            for (const pattern of serviceConfig.patterns) {
                const match = url.match(pattern);
                if (match) {
                    return {
                        type: serviceConfig.type,
                        config: serviceConfig,
                        match: match,
                        id: match[1] // Usually the video/content ID
                    };
                }
            }
        }
        return null;
    }

    /**
     * Process URL for specific services (YouTube, etc.)
     * @param {string} url - Normalized URL
     * @param {Object} serviceData - Detected service data
     * @returns {Promise<Object>} - Processed URL data
     */
    async processServiceURL(url, serviceData) {
        switch (serviceData.type) {
            case 'youtube':
                return await this.processYouTubeURL(url, serviceData);
            case 'tiktok':
                return await this.processTikTokURL(url, serviceData);
            case 'instagram':
                return await this.processInstagramURL(url, serviceData);
            case 'spotify':
                return await this.processSpotifyURL(url, serviceData);
            case 'snapchat':
                return await this.processSnapchatURL(url, serviceData);
            case 'vimeo':
                return await this.processVimeoURL(url, serviceData);
            case 'deezer':
                return await this.processDeezerURL(url, serviceData);
            case 'dailymotion':
                return await this.processDailymotionURL(url, serviceData);
            case 'soundcloud':
                return await this.processSoundCloudURL(url, serviceData);
            default:
                console.warn('Unknown service type:', serviceData.type);
                return await this.processWebPage(url);
        }
    }

    /**
     * Process YouTube URL and extract metadata
     * @param {string} url - YouTube URL
     * @param {Object} serviceData - YouTube service data
     * @returns {Promise<Object>} - YouTube video data
     */
    async processYouTubeURL(url, serviceData) {
        if (window.shouldLog && window.shouldLog('youtube')) {
            console.log('🎥 Processing YouTube URL, Video ID:', serviceData.id);
        }

        try {
            const videoId = serviceData.id;
            const thumbnailUrl = serviceData.config.thumbnailTemplate.replace('{videoId}', videoId);

            // Try to get video title from YouTube oEmbed API (no API key required)
            let title = 'YouTube Video';
            let description = '';
            let metadataFetchFailed = false;
            
            try {
                const oEmbedResponse = await this.fetchYouTubeOEmbed(videoId);
                if (oEmbedResponse) {
                    title = oEmbedResponse.title || title;
                    description = `By ${oEmbedResponse.author_name || 'Unknown'}`;
                    console.log(`✅ YouTube metadata fetched: "${title}"`);
                } else {
                    metadataFetchFailed = true;
                    console.warn(`⚠️ YouTube metadata unavailable for video ${videoId} - video may be deleted/private`);
                }
            } catch (error) {
                metadataFetchFailed = true;
                console.warn(`⚠️ Could not fetch YouTube metadata for ${videoId}:`, error);
                // Continue with basic data
            }

            // Validate thumbnail exists
            const validThumbnail = await this.validateThumbnail(thumbnailUrl);
            
            if (!validThumbnail) {
                console.warn(`⚠️ YouTube thumbnail not accessible for video ${videoId}`);
            }

            // If both metadata and thumbnail failed, video is likely deleted/unavailable
            const isLikelyDeleted = metadataFetchFailed && !validThumbnail;
            
            if (isLikelyDeleted) {
                title = 'YouTube Video (Unavailable)';
                description = 'This video may be deleted or private';
                console.warn(`❌ YouTube video ${videoId} appears to be deleted or unavailable`);
            }

            const linkData = {
                url: url,
                title: title,
                description: description,
                thumbnailUrl: validThumbnail ? thumbnailUrl : null,
                linkType: 'youtube',
                videoId: videoId,
                serviceName: 'YouTube',
                domain: 'youtube.com',
                isValid: !isLikelyDeleted, // Mark as invalid if video is unavailable
                isUnavailable: isLikelyDeleted
            };

            console.log('✅ YouTube processing complete:', linkData);
            return linkData;

        } catch (error) {
            console.error('❌ Error processing YouTube URL:', error);
            throw error;
        }
    }

    /**
     * Fetch YouTube video metadata using oEmbed API (no API key required)
     * @param {string} videoId - YouTube video ID
     * @returns {Promise<Object|null>} - Video metadata or null
     */
    async fetchYouTubeOEmbed(videoId) {
        try {
            const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
            const response = await fetch(oEmbedUrl);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 YouTube oEmbed data:', data);
                return data;
            } else {
                console.warn('YouTube oEmbed request failed:', response.status);
                return null;
            }
        } catch (error) {
            console.warn('YouTube oEmbed fetch error:', error);
            return null;
        }
    }

    /**
     * Validate that thumbnail URL is accessible
     * @param {string} thumbnailUrl - Thumbnail URL to validate
     * @returns {Promise<boolean>} - True if thumbnail is accessible
     */
    async validateThumbnail(thumbnailUrl) {
        try {
            const response = await fetch(thumbnailUrl, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.warn('Thumbnail validation failed:', error);
            return false;
        }
    }

    /**
     * Process TikTok URL and extract metadata
     * @param {string} url - TikTok URL
     * @param {Object} serviceData - TikTok service data
     * @returns {Promise<Object>} - TikTok video data
     */
    async processTikTokURL(url, serviceData) {
        if (window.shouldLog && window.shouldLog('tiktok')) {
            console.log('🎵 Processing TikTok URL, Video ID:', serviceData.id);
        }

        try {
            const videoId = serviceData.id;

            // Try to get video metadata from TikTok oEmbed API
            let title = 'TikTok Video';
            let description = '';
            let thumbnailUrl = null;
            
            try {
                // FIRST: Try Flutter bridge (bypasses CORS)
                console.log('🎵 [TIKTOK] Trying Flutter bridge first...');
                const bridgeMetadata = await this.requestTikTokMetadataFromFlutter(url);
                
                if (bridgeMetadata) {
                    console.log('🎵 [TIKTOK] ✅ Got metadata from Flutter bridge:', bridgeMetadata);
                    title = bridgeMetadata.title || title;
                    description = bridgeMetadata.author ? `By ${bridgeMetadata.author}` : '';
                    thumbnailUrl = bridgeMetadata.thumbnailUrl || null;
                } else {
                    // FALLBACK: Try direct fetch (will likely fail with CORS but has fast timeout)
                    console.log('🎵 [TIKTOK] Bridge failed, trying direct fetch...');
                    const oEmbedResponse = await this.fetchTikTokOEmbed(url);
                    if (oEmbedResponse) {
                        title = oEmbedResponse.title || title;
                        description = `By ${oEmbedResponse.author_name || 'TikTok User'}`;
                        thumbnailUrl = oEmbedResponse.thumbnail_url || null;
                    }
                }
            } catch (error) {
                console.warn('Could not fetch TikTok metadata:', error);
                // Continue with basic data
            }

            const linkData = {
                url: url,
                title: title,
                description: description,
                thumbnailUrl: thumbnailUrl,
                linkType: 'tiktok',
                videoId: videoId,
                serviceName: 'TikTok',
                domain: 'tiktok.com',
                isValid: true
            };

            console.log('✅ TikTok processing complete:', linkData);
            return linkData;

        } catch (error) {
            console.error('❌ Error processing TikTok URL:', error);
            throw error;
        }
    }

    /**
     * Process Instagram URL and extract metadata
     * @param {string} url - Instagram URL
     * @param {Object} serviceData - Instagram service data
     * @returns {Promise<Object>} - Instagram media data
     */
    async processInstagramURL(url, serviceData) {
        if (window.shouldLog && window.shouldLog('instagram')) {
            console.log('📸 Processing Instagram URL, Media ID:', serviceData.id);
        }

        try {
            const mediaId = serviceData.id;

            // Try to get media metadata from Instagram oEmbed API
            let title = 'Instagram Reel';
            let description = '';
            let thumbnailUrl = null;
            
            try {
                // FIRST: Try Flutter bridge (bypasses CORS)
                console.log('📸 [INSTAGRAM] Trying Flutter bridge first...');
                const bridgeMetadata = await this.requestInstagramMetadataFromFlutter(url);
                
                if (bridgeMetadata) {
                    console.log('📸 [INSTAGRAM] ✅ Got metadata from Flutter bridge:', bridgeMetadata);
                    title = bridgeMetadata.title || title;
                    description = bridgeMetadata.author ? `By ${bridgeMetadata.author}` : '';
                    thumbnailUrl = bridgeMetadata.thumbnailUrl || null;
                } else {
                    // Instagram oEmbed API no longer works - just use default "Instagram Reel" title
                    console.log('📸 [INSTAGRAM] Bridge failed, using default title "Instagram Reel"');
                }
            } catch (error) {
                console.warn('Could not fetch Instagram metadata:', error);
                // Continue with basic data
            }

            const linkData = {
                url: url,
                title: title,
                description: description,
                thumbnailUrl: thumbnailUrl,
                linkType: 'instagram',
                mediaId: mediaId,
                serviceName: 'Instagram',
                domain: 'instagram.com',
                isValid: true
            };

            console.log('✅ Instagram processing complete:', linkData);
            return linkData;

        } catch (error) {
            console.error('❌ Error processing Instagram URL:', error);
            throw error;
        }
    }

    /**
     * Process Spotify URL and extract metadata
     * PERFORMANCE: Metadata/thumbnails are loaded lazily on-demand to speed up initialization
     * @param {string} url - Spotify URL
     * @param {Object} serviceData - Spotify service data
     * @returns {Promise<Object>} - Spotify track data
     */
    async processSpotifyURL(url, serviceData) {
        if (window.shouldLog && window.shouldLog('spotify')) {
            console.log('🎵 Processing Spotify URL, Track ID:', serviceData.id);
        }

        try {
            const trackId = serviceData.id;

            // LAZY LOADING: Skip metadata fetch during initialization to speed up app startup
            // Thumbnails will be loaded on-demand by linkVisualManager when objects are viewed
            const title = 'Spotify Track';
            const description = '';
            const thumbnailUrl = null; // Will be fetched lazily by trySpotifyThumbnail methods

            const linkData = {
                url: url,
                title: title,
                description: description,
                thumbnailUrl: thumbnailUrl,
                linkType: 'spotify',
                trackId: trackId,
                serviceName: 'Spotify',
                domain: 'spotify.com',
                isValid: true,
                metadataLoaded: false // Flag indicating metadata needs lazy loading
            };

            console.log('✅ Spotify processing complete (lazy loading enabled):', linkData);
            return linkData;

        } catch (error) {
            console.error('❌ Error processing Spotify URL:', error);
            throw error;
        }
    }

    /**
     * Process Snapchat URL and extract metadata
     * @param {string} url - Snapchat URL
     * @param {Object} serviceData - Snapchat service data
     * @returns {Promise<Object>} - Snapchat spotlight data
     */
    async processSnapchatURL(url, serviceData) {
        console.log('👻 Processing Snapchat URL, Spotlight ID:', serviceData.id);

        try {
            const spotlightId = serviceData.id;

            // Snapchat doesn't have a public oEmbed API currently
            // Return basic metadata
            const title = 'Snapchat Spotlight';
            const description = 'Snapchat Spotlight video';

            const linkData = {
                url: url,
                title: title,
                description: description,
                thumbnailUrl: null, // No public thumbnail API
                linkType: 'snapchat',
                spotlightId: spotlightId,
                serviceName: 'Snapchat',
                domain: 'snapchat.com',
                isValid: true
            };

            console.log('✅ Snapchat processing complete:', linkData);
            return linkData;

        } catch (error) {
            console.error('❌ Error processing Snapchat URL:', error);
            throw error;
        }
    }

    /**
     * Process Vimeo URL and extract metadata
     * @param {string} url - Vimeo URL
     * @param {Object} serviceData - Vimeo service data
     * @returns {Promise<Object>} - Vimeo video data
     */
    async processVimeoURL(url, serviceData) {
        if (window.shouldLog && window.shouldLog('vimeo')) {
            console.log('🎬 Processing Vimeo URL, Video ID:', serviceData.id);
        }

        try {
            const videoId = serviceData.id;

            // Try to get video metadata from Vimeo oEmbed API (no API key required)
            let title = 'Vimeo Video';
            let description = '';
            let thumbnailUrl = null;
            
            try {
                const oEmbedResponse = await this.fetchVimeoOEmbed(url);
                if (oEmbedResponse) {
                    title = oEmbedResponse.title || title;
                    description = `By ${oEmbedResponse.author_name || 'Unknown'}`;
                    thumbnailUrl = oEmbedResponse.thumbnail_url || null;
                }
            } catch (error) {
                console.warn('Could not fetch Vimeo metadata:', error);
                // Continue with basic data
            }

            const linkData = {
                url: url,
                title: title,
                description: description,
                thumbnailUrl: thumbnailUrl,
                linkType: 'vimeo',
                videoId: videoId,
                serviceName: 'Vimeo',
                domain: 'vimeo.com',
                isValid: true
            };

            console.log('✅ Vimeo processing complete:', linkData);
            return linkData;

        } catch (error) {
            console.error('❌ Error processing Vimeo URL:', error);
            throw error;
        }
    }

    /**
     * Process Deezer URL and fetch metadata via Flutter bridge (bypasses CORS)
     * @param {string} url - Deezer URL
     * @param {Object} serviceData - Deezer service data
     * @returns {Promise<Object>} - Deezer track/album data
     */
    async processDeezerURL(url, serviceData) {
        if (window.shouldLog && window.shouldLog('deezer')) {
            console.log('🎵 Processing Deezer URL, Content ID:', serviceData.id);
        }

        try {
            const contentId = serviceData.id;

            // Detect content type from URL (track, album, or playlist)
            let contentType = 'track'; // Default
            if (url.includes('/track/')) {
                contentType = 'track';
            } else if (url.includes('/album/')) {
                contentType = 'album';
            } else if (url.includes('/playlist/')) {
                contentType = 'playlist';
            }
            
            let title = 'Deezer Track';
            let description = '';
            let thumbnailUrl = null;
            
            try {
                // Use Flutter bridge to fetch metadata (bypasses CORS restrictions)
                // The bridge calls Deezer API from native code where CORS doesn't apply
                console.log(`🎵 Requesting Deezer metadata via Flutter bridge: ${contentType}/${contentId}`);
                
                const metadata = await this.requestDeezerMetadataFromFlutter(contentType, contentId);
                
                if (metadata) {
                    console.log('📊 Deezer metadata from Flutter:', metadata);
                    title = metadata.title || title;
                    description = metadata.artist ? `By ${metadata.artist}` : '';
                    thumbnailUrl = metadata.thumbnailUrl;
                } else {
                    console.warn('Deezer metadata fetch via Flutter returned null');
                }
            } catch (error) {
                console.warn('Could not fetch Deezer metadata via Flutter:', error);
                // Continue with basic data
            }

            const linkData = {
                url: url,
                title: title,
                description: description,
                thumbnailUrl: thumbnailUrl,
                linkType: 'deezer',
                contentId: contentId,
                serviceName: 'Deezer',
                domain: 'deezer.com',
                isValid: true
            };

            console.log('✅ Deezer processing complete:', linkData);
            return linkData;

        } catch (error) {
            console.error('❌ Error processing Deezer URL:', error);
            throw error;
        }
    }

    /**
     * Process Dailymotion URL and extract metadata
     * @param {string} url - Dailymotion URL
     * @param {Object} serviceData - Dailymotion service data
     * @returns {Promise<Object>} - Dailymotion video data
     */
    async processDailymotionURL(url, serviceData) {
        console.log('🎬 Processing Dailymotion URL, Video ID:', serviceData.id);

        try {
            const videoId = serviceData.id;

            // Try to get video metadata from Dailymotion oEmbed API
            let title = 'Dailymotion Video';
            let description = '';
            let thumbnailUrl = null;
            
            try {
                const oEmbedResponse = await this.fetchDailymotionOEmbed(url);
                if (oEmbedResponse) {
                    title = oEmbedResponse.title || title;
                    description = oEmbedResponse.author_name ? `By ${oEmbedResponse.author_name}` : '';
                    thumbnailUrl = oEmbedResponse.thumbnail_url || null;
                }
            } catch (error) {
                console.warn('Could not fetch Dailymotion metadata:', error);
                // Continue with basic data
            }

            const linkData = {
                url: url,
                title: title,
                description: description,
                thumbnailUrl: thumbnailUrl,
                linkType: 'dailymotion',
                videoId: videoId,
                serviceName: 'Dailymotion',
                domain: 'dailymotion.com',
                isValid: true
            };

            console.log('✅ Dailymotion processing complete:', linkData);
            return linkData;

        } catch (error) {
            console.error('❌ Error processing Dailymotion URL:', error);
            throw error;
        }
    }

    /**
     * Process SoundCloud URL and extract metadata
     * @param {string} url - SoundCloud URL
     * @param {Object} serviceData - SoundCloud service data
     * @returns {Promise<Object>} - SoundCloud track data
     */
    async processSoundCloudURL(url, serviceData) {
        if (window.shouldLog && window.shouldLog('soundcloud')) {
            console.log('🎧 Processing SoundCloud URL');
        }

        try {
            // Try to get track metadata from SoundCloud oEmbed API
            let title = 'SoundCloud Track';
            let description = '';
            let thumbnailUrl = null;
            let author = '';
            
            try {
                const oEmbedResponse = await this.fetchSoundCloudOEmbed(url);
                if (oEmbedResponse) {
                    title = oEmbedResponse.title || title;
                    author = oEmbedResponse.author_name || '';
                    description = author ? `By ${author}` : '';
                    thumbnailUrl = oEmbedResponse.thumbnail_url || null;
                }
            } catch (error) {
                console.warn('Could not fetch SoundCloud metadata:', error);
                // Continue with basic data
            }

            const linkData = {
                url: url,
                title: title,
                description: description,
                thumbnailUrl: thumbnailUrl,
                linkType: 'soundcloud',
                serviceName: 'SoundCloud',
                domain: 'soundcloud.com',
                isValid: true
            };

            console.log('✅ SoundCloud processing complete:', linkData);
            return linkData;

        } catch (error) {
            console.error('❌ Error processing SoundCloud URL:', error);
            throw error;
        }
    }

    /**
     * Request Deezer metadata from Flutter (bypasses CORS)
     * @param {string} contentType - Type of content (track, album, playlist)
     * @param {string} contentId - Deezer content ID
     * @returns {Promise<Object|null>} - Metadata object or null
     */
    requestDeezerMetadataFromFlutter(contentType, contentId) {
        return new Promise((resolve) => {
            // Generate unique callback name to prevent race conditions
            const callbackId = 'urlProcessorCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const callbackName = 'deezerMetadataCallback_' + callbackId;
            
            // Set up callback for Flutter to call back with data
            window[callbackName] = (metadata) => {
                console.log('🎵 [BRIDGE] Received Deezer metadata from Flutter:', metadata);
                clearTimeout(timeoutId); // Clean up timeout
                delete window[callbackName]; // Clean up callback
                resolve(metadata);
            };

            // Set timeout in case Flutter doesn't respond
            const timeoutId = setTimeout(() => {
                console.warn('⏱️ Deezer metadata request timed out');
                delete window[callbackName];
                resolve(null);
            }, 5000);

            // Send request to Flutter via DeezerMetadataChannel
            try {
                if (window.DeezerMetadataChannel) {
                    const message = JSON.stringify({
                        action: 'getDeezerMetadata',
                        contentType: contentType,
                        contentId: contentId,
                        callbackName: callbackName  // Pass unique callback name to Flutter
                    });
                    
                    console.log('🎵 [BRIDGE] Sending to DeezerMetadataChannel:', message, 'callback:', callbackName);
                    window.DeezerMetadataChannel.postMessage(message);
                } else {
                    console.error('❌ DeezerMetadataChannel not available');
                    clearTimeout(timeoutId);
                    delete window[callbackName];
                    resolve(null);
                }
            } catch (error) {
                console.error('❌ Error sending Deezer metadata request:', error);
                clearTimeout(timeoutId);
                delete window[callbackName];
                resolve(null);
            }
        });
    }

    /**
     * Request Spotify metadata from Flutter (bypasses CORS)
     * @param {string} trackId - Spotify track ID
     * @returns {Promise<Object|null>} - Metadata object or null
     */
    requestSpotifyMetadataFromFlutter(trackId) {
        return new Promise((resolve) => {
            // Generate unique callback name to prevent race conditions
            const callbackId = 'urlProcessorCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const callbackName = 'spotifyMetadataCallback_' + callbackId;
            
            // Set up callback for Flutter to call back with data
            window[callbackName] = (metadata) => {
                console.log('🎵 [BRIDGE] Received Spotify metadata from Flutter:', metadata);
                clearTimeout(timeoutId); // Clean up timeout
                delete window[callbackName]; // Clean up callback
                resolve(metadata);
            };

            // Set timeout in case Flutter doesn't respond
            const timeoutId = setTimeout(() => {
                console.warn('⏱️ Spotify metadata request timed out');
                delete window[callbackName];
                resolve(null);
            }, 5000);

            // Send request to Flutter via SpotifyMetadataChannel
            try {
                if (window.SpotifyMetadataChannel) {
                    const message = JSON.stringify({
                        action: 'getSpotifyMetadata',
                        trackId: trackId,
                        callbackName: callbackName  // Pass unique callback name to Flutter
                    });
                    
                    console.log('🎵 [BRIDGE] Sending to SpotifyMetadataChannel:', message, 'callback:', callbackName);
                    window.SpotifyMetadataChannel.postMessage(message);
                } else {
                    console.error('❌ SpotifyMetadataChannel not available');
                    clearTimeout(timeoutId);
                    delete window.spotifyMetadataCallback;
                    resolve(null);
                }
            } catch (error) {
                console.error('❌ Error sending Spotify metadata request:', error);
                clearTimeout(timeoutId);
                delete window.spotifyMetadataCallback;
                resolve(null);
            }
        });
    }

    /**
     * Request TikTok metadata from Flutter (bypasses CORS)
     * @param {string} url - Full TikTok URL
     * @returns {Promise<Object|null>} - Metadata object or null
     */
    requestTikTokMetadataFromFlutter(url) {
        return new Promise((resolve) => {
            // CRITICAL: Generate unique callback name to prevent collisions
            const callbackId = 'requestCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const callbackName = 'tiktokMetadataCallback_' + callbackId;
            
            // Set up callback for Flutter to call back with data
            window[callbackName] = (metadata) => {
                console.log('🎵 [BRIDGE] Received TikTok metadata from Flutter:', metadata);
                clearTimeout(timeoutId);
                delete window[callbackName];
                resolve(metadata);
            };

            // Set timeout in case Flutter doesn't respond
            const timeoutId = setTimeout(() => {
                console.warn('⏱️ TikTok metadata request timed out');
                delete window[callbackName];
                resolve(null);
            }, 5000);

            // Send request to Flutter via TikTokMetadataChannel
            try {
                if (window.TikTokMetadataChannel) {
                    const message = JSON.stringify({
                        action: 'getTikTokMetadata',
                        url: url,
                        callbackName: callbackName
                    });
                    
                    console.log('🎵 [BRIDGE] Sending to TikTokMetadataChannel:', message);
                    window.TikTokMetadataChannel.postMessage(message);
                } else {
                    console.error('❌ TikTokMetadataChannel not available');
                    clearTimeout(timeoutId);
                    delete window[callbackName];
                    resolve(null);
                }
            } catch (error) {
                console.error('❌ Error sending TikTok metadata request:', error);
                clearTimeout(timeoutId);
                delete window[callbackName];
                resolve(null);
            }
        });
    }

    /**
     * Request Instagram metadata from Flutter (bypasses CORS)
     * @param {string} url - Full Instagram URL
     * @returns {Promise<Object|null>} - Metadata object or null
     */
    requestInstagramMetadataFromFlutter(url) {
        return new Promise((resolve) => {
            // CRITICAL: Generate unique callback name to prevent collisions
            const callbackId = 'requestCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const callbackName = 'instagramMetadataCallback_' + callbackId;
            
            // Set up callback for Flutter to call back with data
            window[callbackName] = (metadata) => {
                console.log('📸 [BRIDGE] Received Instagram metadata from Flutter:', metadata);
                clearTimeout(timeoutId);
                delete window[callbackName];
                resolve(metadata);
            };

            // Set timeout in case Flutter doesn't respond
            const timeoutId = setTimeout(() => {
                console.warn('⏱️ Instagram metadata request timed out');
                delete window[callbackName];
                resolve(null);
            }, 5000);

            // Send request to Flutter via InstagramMetadataChannel
            try {
                if (window.InstagramMetadataChannel) {
                    const message = JSON.stringify({
                        action: 'getInstagramMetadata',
                        url: url,
                        callbackName: callbackName
                    });
                    
                    console.log('📸 [BRIDGE] Sending to InstagramMetadataChannel:', message);
                    window.InstagramMetadataChannel.postMessage(message);
                } else {
                    console.error('❌ InstagramMetadataChannel not available');
                    clearTimeout(timeoutId);
                    delete window[callbackName];
                    resolve(null);
                }
            } catch (error) {
                console.error('❌ Error sending Instagram metadata request:', error);
                clearTimeout(timeoutId);
                delete window[callbackName];
                resolve(null);
            }
        });
    }

    /**
     * Fetch TikTok video metadata using Flutter bridge (bypasses CORS)
     * @param {string} url - Full TikTok URL
     * @returns {Promise<Object|null>} - Video metadata or null
     */
    async fetchTikTokOEmbed(url) {
        // CRITICAL: Check if Flutter bridge is available
        if (!window.TikTokMetadataChannel) {
            console.warn('📊 TikTok Flutter bridge not available');
            return null;
        }
        
        const maxRetries = 3;
        const timeouts = [6000, 10000, 15000]; // Increasing timeouts: 6s, 10s, 15s
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Generate unique callback name
                const callbackId = 'urlProcessorCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const callbackName = 'tiktokMetadataCallback_' + callbackId;
                
                const timeout = timeouts[attempt - 1];
                console.log(`📊 TikTok: Requesting metadata via Flutter bridge (attempt ${attempt}/${maxRetries}, timeout: ${timeout}ms)`);
                
                // Request metadata via Flutter bridge (bypasses CORS)
                const data = await new Promise((resolve, reject) => {
                    // Set up one-time callback
                    window[callbackName] = (metadata) => {
                        console.log('📊 TikTok oEmbed data:', metadata);
                        delete window[callbackName]; // Clean up
                        resolve(metadata);
                    };
                    
                    // Request via bridge
                    window.TikTokMetadataChannel.postMessage(JSON.stringify({
                        action: 'getTikTokMetadata',
                        url: url,
                        callbackName: callbackName
                    }));
                    
                    // Timeout with progressive increase
                    setTimeout(() => {
                        if (window[callbackName]) {
                            delete window[callbackName];
                            reject(new Error(`TikTok oEmbed fetch timeout (${timeout}ms)`));
                        }
                    }, timeout);
                });
                
                // Success! Return the data
                if (data && data.thumbnail_url) {
                    console.log(`✅ TikTok metadata fetched successfully on attempt ${attempt}`);
                    return data;
                } else {
                    console.warn(`⚠️ TikTok metadata received but missing thumbnail_url (attempt ${attempt})`);
                    // Continue to retry if no thumbnail
                }
            } catch (error) {
                console.warn(`❌ TikTok oEmbed fetch failed (attempt ${attempt}/${maxRetries}):`, error.message);
            }
            
            // Wait before retry (exponential backoff: 2s, 4s)
            if (attempt < maxRetries) {
                const waitTime = 2000 * attempt;
                console.log(`⏳ Waiting ${waitTime}ms before retry ${attempt + 1}...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        console.error(`❌ All ${maxRetries} TikTok oEmbed fetch attempts failed`);
        return null;
    }

    /**
     * Fetch Instagram media metadata using oEmbed API
     * ⚠️ DEPRECATED: Instagram oEmbed API no longer works with public access tokens (returns 400 errors)
     * This method is kept for reference only and should NOT be called.
     * Use Flutter bridge (requestInstagramMetadataFromFlutter) or default "Instagram Reel" title instead.
     * @param {string} url - Full Instagram URL
     * @returns {Promise<Object|null>} - Media metadata or null
     */
    async fetchInstagramOEmbed(url) {
        try {
            // ⚠️ THIS NO LONGER WORKS - Instagram API returns 400 errors
            const oEmbedUrl = `https://graph.facebook.com/v8.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=public`;
            const response = await this.fetchWithTimeout(oEmbedUrl, 3000); // 3 second timeout
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Instagram oEmbed data:', data);
                return data;
            } else {
                console.warn('Instagram oEmbed request failed:', response.status);
                return null;
            }
        } catch (error) {
            console.warn('Instagram oEmbed fetch error (fast-fail):', error.message);
            return null;
        }
    }

    /**
     * Fetch Vimeo video metadata using Flutter bridge (bypasses CORS)
     * @param {string} url - Full Vimeo URL
     * @returns {Promise<Object|null>} - Video metadata or null
     */
    async fetchVimeoOEmbed(url) {
        try {
            console.log('🎵 [VIMEO] Trying Flutter bridge first...');
            
            // Try Flutter bridge first (bypasses CORS)
            if (window.VimeoMetadataChannel) {
                // Generate unique callback name to prevent race conditions
                const callbackId = 'urlProcessorCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const callbackName = 'vimeoMetadataCallback_' + callbackId;
                
                const metadata = await new Promise((resolve) => {
                    // Set callback for Flutter response
                    window[callbackName] = (data) => {
                        delete window[callbackName]; // Clean up callback
                        resolve(data);
                    };

                    // Send request to Flutter via VimeoMetadataChannel
                    const message = JSON.stringify({
                        action: 'getVimeoMetadata',
                        url: url,
                        callbackName: callbackName  // Pass unique callback name to Flutter
                    });
                    
                    console.log('🎵 [BRIDGE] Sending to VimeoMetadataChannel:', message, 'callback:', callbackName);
                    window.VimeoMetadataChannel.postMessage(message);

                    // Timeout after 10 seconds
                    setTimeout(() => {
                        if (window[callbackName]) {
                            delete window[callbackName];
                            resolve(null);
                        }
                    }, 10000);
                });

                if (metadata) {
                    console.log('🎵 [BRIDGE] Received Vimeo metadata from Flutter:', metadata);
                    console.log('🎵 [VIMEO] ✅ Got metadata from Flutter bridge:', metadata);
                    // Format to match oEmbed structure
                    return {
                        title: metadata.title,
                        author_name: metadata.author,
                        thumbnail_url: metadata.thumbnailUrl,
                        video_id: metadata.videoId
                    };
                } else {
                    console.error('❌ VimeoMetadataChannel returned null');
                }
            } else {
                console.error('❌ VimeoMetadataChannel not available');
            }

            // If bridge fails, return null (don't try direct fetch - it will fail CORS)
            console.warn('⚠️ Vimeo metadata fetch failed - Flutter bridge not available');
            return null;
            
        } catch (error) {
            console.warn('Vimeo metadata fetch error:', error);
            return null;
        }
    }

    /**
     * Fetch Dailymotion video metadata using Flutter bridge (bypasses CORS)
     * @param {string} url - Full Dailymotion URL
     * @returns {Promise<Object|null>} - Video metadata or null
     */
    async fetchDailymotionOEmbed(url) {
        return new Promise(async (resolve) => {
            console.log('🎬 [DAILYMOTION API] Requesting metadata for:', url);
            
            // Extract video ID from URL
            const videoIdMatch = url.match(/video\/([a-zA-Z0-9]+)/);
            if (!videoIdMatch) {
                console.warn('⚠️ Could not extract Dailymotion video ID from URL');
                resolve(null);
                return;
            }
            
            const videoId = videoIdMatch[1];
            
            // Try direct Dailymotion API call (no auth required for public videos)
            try {
                const apiUrl = `https://api.dailymotion.com/video/${videoId}?fields=id,title,thumbnail_url,duration`;
                console.log('🎬 [DAILYMOTION API] Calling:', apiUrl);
                
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    console.warn(`⚠️ Dailymotion API error: ${response.status}`);
                    resolve(null);
                    return;
                }
                
                const data = await response.json();
                console.log('🎬 [DAILYMOTION API] Received metadata:', data);
                
                // Format response to match oEmbed structure
                const metadata = {
                    title: data.title || 'Dailymotion Video',
                    author_name: '', // Dailymotion API doesn't provide author in basic fields
                    thumbnail_url: data.thumbnail_url || null
                };
                
                console.log('✅ [DAILYMOTION API] Successfully fetched title:', metadata.title);
                resolve(metadata);
                
            } catch (error) {
                console.error('❌ Error fetching Dailymotion metadata:', error);
                resolve(null);
            }
        });
    }

    /**
     * Fetch SoundCloud track metadata using oEmbed API
     * @param {string} url - Full SoundCloud URL
     * @returns {Promise<Object|null>} - Trade metadata or null
     */
    async fetchSoundCloudOEmbed(url) {
        try {
            const oEmbedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            console.log('🎧 [API] Fetching SoundCloud thumbnail from oEmbed API...');
            const response = await this.fetchWithTimeout(oEmbedUrl, 3000);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 SoundCloud oEmbed data:', data);
                return data;
            } else {
                console.warn('⚠️ SoundCloud oEmbed API request failed:', response.status);
                return null;
            }
        } catch (error) {
            console.warn('SoundCloud oEmbed fetch error (fast-fail):', error.message);
            return null;
        }
    }

    /**
     * Process general web page and extract Open Graph data
     * @param {string} url - Web page URL
     * @returns {Promise<Object>} - Web page data
     */
    async processWebPage(url) {
        console.log('🌐 Processing web page:', url);

        try {
            // Extract domain for display
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace(/^www\./, '');

            // For now, return basic data
            // In a more advanced implementation, we could use a CORS proxy
            // to fetch the page and parse Open Graph tags
            const linkData = {
                url: url,
                title: this.extractTitleFromURL(url),
                description: `Website: ${domain}`,
                thumbnailUrl: null, // Would be extracted from Open Graph data
                linkType: 'website',
                serviceName: domain,
                domain: domain,
                isValid: true
            };

            console.log('✅ Web page processing complete:', linkData);
            return linkData;

        } catch (error) {
            console.error('❌ Error processing web page:', error);
            throw error;
        }
    }

    /**
     * Extract a reasonable title from URL if no other metadata available
     * @param {string} url - URL to extract title from
     * @returns {string} - Extracted title
     */
    extractTitleFromURL(url) {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;
            
            // Try to get something meaningful from the path
            if (path && path !== '/') {
                const segments = path.split('/').filter(s => s.length > 0);
                if (segments.length > 0) {
                    const lastSegment = segments[segments.length - 1];
                    // Clean up the segment (remove file extensions, decode, etc.)
                    return decodeURIComponent(lastSegment)
                        .replace(/\.[^.]+$/, '') // Remove file extensions
                        .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
                        .replace(/\b\w/g, l => l.toUpperCase()); // Title case
                }
            }
            
            // Fall back to domain name
            return urlObj.hostname.replace(/^www\./, '');
        } catch (error) {
            return 'Website Link';
        }
    }

    /**
     * Generate a unique package name for the link object
     * @param {Object} linkData - Processed link data
     * @returns {string} - Unique package name
     */
    generatePackageName(linkData) {
        const domain = linkData.domain || 'unknown';
        const timestamp = Date.now();
        return `com.link.${domain.replace(/[^a-zA-Z0-9]/g, '')}.${timestamp}`;
    }

    /**
     * Create link object data suitable for the 3D world
     * @param {Object} linkData - Processed link data
     * @param {Object} position - Position for the object {x, y, z}
     * @returns {Object} - Link object data for creation
     */
    createLinkObjectData(linkData, position = {x: 0, y: 1, z: 0}) {
        // CRITICAL: Ensure Y coordinate is never less than 1 (prevents buried objects)
        // This is a safety check in case position is passed incorrectly
        const safePosition = {
            x: position.x !== undefined ? position.x : 0,
            y: (position.y !== undefined && position.y >= 1) ? position.y : 1,
            z: position.z !== undefined ? position.z : 0
        };

        if (position.y !== undefined && position.y < 1) {
            console.warn(`⚠️ Position Y was ${position.y}, corrected to ${safePosition.y} (minimum safe height)`);
        }

        const objectData = {
            name: linkData.title || 'Link',
            packageName: this.generatePackageName(linkData),
            thumbnailUrl: linkData.thumbnailUrl,
            url: linkData.url,
            linkType: linkData.linkType,
            title: linkData.title,
            description: linkData.description,
            serviceName: linkData.serviceName,
            domain: linkData.domain,
            position: safePosition,
            // Additional metadata for the object
            metadata: {
                createdAt: new Date().toISOString(),
                source: 'url_processor',
                version: '1.0'
            }
        };

        console.log('🔗 Created link object data:', objectData);
        return objectData;
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = URLProcessor;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.URLProcessor = URLProcessor;
}

console.log('📦 URLProcessor module loaded successfully');
