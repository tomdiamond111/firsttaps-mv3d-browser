/**
 * ═══════════════════════════════════════════════════════════════════
 * DEMO CONTENT CONFIGURATION with API INTEGRATION
 * ═══════════════════════════════════════════════════════════════════
 * 
 * INTEGRATED RECOMMENDATION SYSTEM:
 * - Uses RecommendationContentManager for API-driven content
 * - Multi-platform support (YouTube, Vimeo, Dailymotion, Spotify, Deezer, SoundCloud)
 * - Aggressive caching (2-14 days) to minimize API quota usage
 * - Selective platform fetching (only fetches from insufficient platforms)
 * - Fallback to hardcoded content if API fails
 * 
 * ARCHITECTURE:
 * 1. Gallery Wall → getGalleryWallLinks() (shorts: YouTube, Vimeo, Dailymotion, TikTok, Instagram)
 * 2. Riser → getRiserLinks() (music videos: YouTube, Vimeo, Dailymotion)
 * 3. Small Stage → getSmallStageLinks() (music audio: YouTube Music, Spotify, Deezer, SoundCloud)
 * 
 * FORMAT:
 * - For YouTube: Full YouTube URL or video ID
 * - For Spotify: Spotify track URL
 * - For local demo files: Use 'assets/demomedia/filename.mp3' format
 * - For TikTok: Full TikTok URL
 * - For Instagram: Full Instagram Reel URL
 */

(function() {
    'use strict';

    console.log('🎵 Loading Demo Content Configuration with API Integration...');

    // ============================================================================
    // HARDCODED FALLBACK PLAYLISTS (Used if API fails or as supplements)
    // ============================================================================
    const DEMO_PLAYLISTS = {
        // ═════════════════════════════════════════════════════════════
        // GALLERY WALL - Video Shorts (API + Fallback)
        // API provides: YouTube, Vimeo, Dailymotion
        // Fallback provides: TikTok, Instagram (no public API)
        // ═════════════════════════════════════════════════════════════
        topHitsMix: {
            furnitureType: 'gallery_wall',
            title: 'Top Hits Mix',
            useAPI: true,  // NEW: Enable API integration
            links: [
                // Fallback TikTok & Instagram links (no public API)
                'https://www.tiktok.com/@ifkf137/video/7594422601221426462',
                'https://www.tiktok.com/@nttavernllc/video/7605800744792411422',
                'https://www.instagram.com/reel/CdIxYYqgXYZ/',
                // Additional YouTube fallbacks (if API fails)
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'https://www.youtube.com/watch?v=9bZkp7q19f0',
            ]
        },

        // ═════════════════════════════════════════════════════════════
        // RISER - Music Videos (API + Fallback)
        // API provides: YouTube Music Videos, Dailymotion
        // Fallback provides: Vimeo (manual curation)
        // ═════════════════════════════════════════════════════════════
        chillVibes: {
            furnitureType: 'riser',
            title: 'Music Videos',
            useAPI: true,  // NEW: Enable API integration
            links: [
                // Fallback Vimeo music videos
                'https://vimeo.com/336892869',
                'https://vimeo.com/1154762165',
                // Local media files (always included)
                'assets/demomedia/Bach Prelude BWV933 piano.mp3',
                'assets/demomedia/Diamond Bach BWV937 Full rubbermetal good.mp3',
                'assets/demomedia/Diamond_Schubert_German Dance D643.mp3',
            ]
        },

        // ═════════════════════════════════════════════════════════════
        // SMALL STAGE - Music Audio (API + Fallback)
        // API provides: YouTube Music, Spotify, Deezer
        // Fallback provides: SoundCloud (no public API)
        // ═════════════════════════════════════════════════════════════
        shortsAndReels: {
            furnitureType: 'stage_small',
            title: 'Music Tracks',
            useAPI: true,  // NEW: Enable API integration
            links: [
                // Fallback SoundCloud tracks (no public API)
                'https://soundcloud.com/shaboozey/shaboozey-a-bar-song-tipsy',
                'https://soundcloud.com/billieeilish/birds-of-a-feather',
                'https://soundcloud.com/teddyswims/lose-control',
                'https://soundcloud.com/sabrinacarpenter/sabrina-carpenter-espresso',
                'https://soundcloud.com/bensonboone/beautiful-things',
                'https://soundcloud.com/hozier/too-sweet',
            ]
        }
    };

    // ============================================================================
    // API INTEGRATION (Fetches content from RecommendationContentManager)
    // ============================================================================

    /**
     * Get content for a furniture type (API + Fallback)
     * @param {string} furnitureType - 'gallery_wall', 'riser', or 'stage_small'
     * @param {boolean} forceRefresh - Force fetch fresh content
     * @returns {Promise<Array>} Array of content links
     */
    async function getContentForFurniture(furnitureType, forceRefresh = false) {
        const playlist = Object.values(DEMO_PLAYLISTS).find(p => p.furnitureType === furnitureType);
        
        if (!playlist) {
            console.warn(`No playlist configured for furniture type: ${furnitureType}`);
            return [];
        }

        // If API disabled, use fallback only
        if (!playlist.useAPI) {
            console.log(`[DemoContent] Using fallback content for ${furnitureType}`);
            return convertLinksToObjects(playlist.links, furnitureType);
        }

        // Try API first
        try {
            const contentManager = window.recommendationContentManager;
            if (!contentManager) {
                console.warn('[DemoContent] RecommendationContentManager not loaded, using fallback');
                return convertLinksToObjects(playlist.links, furnitureType);
            }

            let apiLinks = [];

            // Fetch from appropriate API method based on furniture type
            switch (furnitureType) {
                case 'gallery_wall':
                    console.log('[DemoContent] 📊 Fetching Gallery Wall content from API...');
                    apiLinks = await contentManager.getGalleryWallLinks(forceRefresh);
                    break;
                
                case 'riser':
                    console.log('[DemoContent] 📊 Fetching Riser content from API...');
                    apiLinks = await contentManager.getRiserLinks(forceRefresh);
                    break;
                
                case 'stage_small':
                    console.log('[DemoContent] 📊 Fetching Small Stage content from API...');
                    apiLinks = await contentManager.getSmallStageLinks(forceRefresh);
                    break;
                
                default:
                    console.warn(`Unknown furniture type: ${furnitureType}`);
                    return convertLinksToObjects(playlist.links, furnitureType);
            }

            // Merge API content with fallback content
            const fallbackLinks = convertLinksToObjects(playlist.links, furnitureType);
            const mergedLinks = [...apiLinks, ...fallbackLinks];

            console.log(`[DemoContent] ✅ ${furnitureType}: ${apiLinks.length} API + ${fallbackLinks.length} fallback = ${mergedLinks.length} total`);

            return mergedLinks;

        } catch (error) {
            console.error(`[DemoContent] Error fetching API content for ${furnitureType}:`, error);
            console.log('[DemoContent] Falling back to hardcoded content');
            return convertLinksToObjects(playlist.links, furnitureType);
        }
    }

    /**
     * Convert raw URL strings to LinkObject format
     */
    function convertLinksToObjects(links, furnitureType) {
        return links.map((link, index) => {
            // Detect platform from URL
            let platform = 'unknown';
            if (link.includes('youtube.com') || link.includes('youtu.be')) platform = 'youtube';
            else if (link.includes('spotify.com')) platform = 'spotify';
            else if (link.includes('soundcloud.com')) platform = 'soundcloud';
            else if (link.includes('tiktok.com')) platform = 'tiktok';
            else if (link.includes('instagram.com')) platform = 'instagram';
            else if (link.includes('vimeo.com')) platform = 'vimeo';
            else if (link.includes('dailymotion.com')) platform = 'dailymotion';
            else if (link.includes('deezer.com')) platform = 'deezer';
            else if (link.includes('assets/demomedia')) platform = 'local';

            return {
                id: `${furnitureType}-fallback-${index}`,
                url: link,
                title: `${platform} content ${index + 1}`,
                platform: platform,
                thumbnailUrl: '',
                metadata: '{}'
            };
        });
    }

    // ============================================================================
    // EXPORT (Make available globally)
    // ============================================================================
    
    window.DEMO_PLAYLISTS = DEMO_PLAYLISTS;
    window.getContentForFurniture = getContentForFurniture;
    
    console.log('✅ Demo Content Configuration loaded (API-enabled)');
    console.log('📋 Configured playlists:', Object.keys(DEMO_PLAYLISTS));
    console.log('🔧 API Integration: ' + (window.recommendationContentManager ? 'Available ✅' : 'Not loaded ⚠️'));
})();
    
    console.log('✅ Demo Content Configuration loaded');
    console.log('📋 Configured playlists:', Object.keys(DEMO_PLAYLISTS));
})();
