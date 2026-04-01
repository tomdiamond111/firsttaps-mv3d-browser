/**
 * Recommendation System Integration Helper
 * Provides easy integration with existing furniture spawning system
 */

(function() {
    'use strict';

    console.log('🔧 Loading Recommendation Integration Helper...');

    // ============================================================================
    // FURNITURE TYPE MAPPING
    // ============================================================================
    
    const FURNITURE_TYPE_MAP = {
        // Map furniture types to recommendation content types
        'gallery_wall': 'gallery_wall',
        'riser': 'riser',
        'stage_small': 'stage_small',
        'choir_riser': 'riser',          // Alias
        'small_stage': 'stage_small',    // Alias
        'amphitheatre': 'gallery_wall',  // Uses similar content to gallery wall
    };

    // ============================================================================
    // DISLIKE FILTERING
    // ============================================================================
    
    /**
     * Filter out disliked content from a list of links
     * @param {Array} links - Array of LinkObjects
     * @returns {Array} Filtered array without disliked content
     */
    function filterDislikedLinks(links) {
        if (!window.mediaFeedback) {
            console.warn('⚠️ MediaFeedbackManager not available - skipping dislike filter');
            return links;
        }

        const feedbackService = window.mediaFeedback;
        const dislikedUrls = feedbackService.getDislikedUrls();
        
        console.log(`🔍 Filter check: ${links.length} links vs ${dislikedUrls.length} disliked URLs`);
        
        if (dislikedUrls.length > 0) {
            console.log(`👎 Disliked URLs: ${dislikedUrls.join(', ')}`);
        }
        
        const filtered = links.filter(link => {
            const linkUrl = link.url || link.path || link;
            const isDisliked = feedbackService.isDisliked(linkUrl);
            if (isDisliked) {
                console.log(`👎 FILTERED OUT: "${link.title || link.name || linkUrl}" - ${linkUrl}`);
            }
            return !isDisliked;
        });
        
        const removedCount = links.length - filtered.length;
        if (removedCount > 0) {
            console.log(`🚫 Filtered ${removedCount} disliked item(s) from furniture content`);
        }
        
        return filtered;
    }

    // ============================================================================
    // CONTENT LOADING HELPER
    // ============================================================================

    /**
     * Load content for furniture with recommendation system
     * Falls back to hardcoded content if recommendation system unavailable
     * @param {string} furnitureType - Type of furniture
     * @param {boolean} forceRefresh - Force fresh fetch (default: false)
     * @returns {Promise<Array>} Array of content links
     */
    window.loadFurnitureContent = async function(furnitureType, forceRefresh = false) {
        console.log(`🪑 loadFurnitureContent("${furnitureType}", ${forceRefresh})`);

        // Map furniture type
        const contentType = FURNITURE_TYPE_MAP[furnitureType] || furnitureType;

        // Try recommendation system first
        if (window.getContentForFurniture) {
            try {
                console.log(`📊 Using recommendation system for ${contentType}...`);
                const links = await window.getContentForFurniture(contentType, forceRefresh);
                
                if (links && links.length > 0) {
                    // Apply dislike filter before returning
                    const filteredLinks = filterDislikedLinks(links);
                    console.log(`✅ Loaded ${filteredLinks.length} links via recommendation system (${links.length - filteredLinks.length} filtered)`);
                    return filteredLinks;
                }
            } catch (error) {
                console.warn(`⚠️ Recommendation system failed, falling back to hardcoded content:`, error);
            }
        }

        // Fallback: Use DEMO_PLAYLISTS if available
        if (window.DEMO_PLAYLISTS) {
            console.log(`📋 Using fallback DEMO_PLAYLISTS for ${furnitureType}`);
            const playlist = Object.values(window.DEMO_PLAYLISTS).find(p => p.furnitureType === furnitureType);
            
            if (playlist && playlist.links) {
                const playlistLinks = convertLinksToObjects(playlist.links, furnitureType);
                // Apply dislike filter to fallback content too
                const filteredLinks = filterDislikedLinks(playlistLinks);
                console.log(`✅ Loaded ${filteredLinks.length} links from fallback (${playlistLinks.length - filteredLinks.length} filtered)`);
                return filteredLinks;
            }
        }

        console.warn(`⚠️ No content available for furniture type: ${furnitureType}`);
        return [];
    };

    /**
     * Convert raw URL strings to LinkObject format
     * @param {Array<string>} links - Array of URL strings
     * @param {string} furnitureType - Furniture type for ID generation
     * @returns {Array<Object>} Array of LinkObjects
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
                id: `${furnitureType}-integration-${index}`,
                url: link,
                title: `${platform} content ${index + 1}`,
                platform: platform,
                thumbnailUrl: '',
                metadata: '{}'
            };
        });
    }

    // ============================================================================
    // CONTENT REFRESH HELPER
    // ============================================================================

    /**
     * Refresh content for a specific furniture piece
     * @param {string} furnitureId - ID of the furniture object
     * @param {string} furnitureType - Type of furniture
     * @returns {Promise<Array>} New content links
     */
    window.refreshFurnitureContent = async function(furnitureId, furnitureType) {
        console.log(`🔄 Refreshing content for ${furnitureId} (${furnitureType})...`);
        
        // Force refresh to get new content
        const links = await window.loadFurnitureContent(furnitureType, true);
        
        console.log(`✅ Refreshed: ${links.length} new links`);
        return links;
    };

    // ============================================================================
    // DISLIKE INTEGRATION HELPER
    // ============================================================================

    /**
     * Record a dislike for content (for preference learning)
     * @param {Object} linkObject - Link object that was disliked
     */
    window.recordContentDislike = function(linkObject) {
        if (!window.contentPreferenceLearningService) {
            console.warn('⚠️ Preference learning service not available');
            return;
        }

        try {
            const metadata = linkObject.metadata ? JSON.parse(linkObject.metadata) : {};
            
            window.contentPreferenceLearningService.recordDislike({
                title: linkObject.title || '',
                channelTitle: metadata.channelTitle || '',
                language: metadata.language || '',
                tags: metadata.tags || [],
                categoryId: metadata.categoryId || '',
                platform: linkObject.platform || ''
            });

            console.log(`👎 Dislike recorded: ${linkObject.title}`);
            
            // Show feedback to user (optional)
            if (window.showToast) {
                window.showToast('Dislike recorded - system learning your preferences');
            }
        } catch (error) {
            console.error('❌ Failed to record dislike:', error);
        }
    };

    // ============================================================================
    // LIKE INTEGRATION HELPER (for future enhancement)
    // ============================================================================

    /**
     * Record a like for content (for future preference learning)
     * @param {Object} linkObject - Link object that was liked
     */
    window.recordContentLike = function(linkObject) {
        console.log(`👍 Like recorded: ${linkObject.title}`);
        // Future: Implement like-based boosting
    };

    // ============================================================================
    // CACHE MANAGEMENT HELPERS
    // ============================================================================

    /**
     * Clear cache for specific furniture type
     * @param {string} furnitureType - Furniture type to clear cache for
     */
    window.clearFurnitureCache = async function(furnitureType) {
        if (!window.recommendationsStorage) {
            console.warn('⚠️ Storage service not available');
            return;
        }

        const contentType = FURNITURE_TYPE_MAP[furnitureType] || furnitureType;
        await window.recommendationsStorage.deleteCachedRecommendation(contentType);
        console.log(`✅ Cleared cache for ${furnitureType}`);
    };

    /**
     * Get cache info for all furniture types
     * @returns {Promise<Object>} Cache statistics
     */
    window.getFurnitureCacheInfo = async function() {
        if (!window.recommendationsStorage) {
            console.warn('⚠️ Storage service not available');
            return {};
        }

        const stats = await window.recommendationsStorage.getCacheStats();
        console.table(stats);
        return stats;
    };

    // ============================================================================
    // DEBUGGING HELPERS
    // ============================================================================

    /**
     * Test recommendation system integration
     */
    window.testRecommendationSystem = async function() {
        console.log('🧪 Testing Recommendation System Integration...');
        
        const tests = [
            { type: 'gallery_wall', name: 'Gallery Wall' },
            { type: 'riser', name: 'Riser' },
            { type: 'stage_small', name: 'Small Stage' }
        ];

        for (const test of tests) {
            console.log(`\n📊 Testing ${test.name}...`);
            try {
                const links = await window.loadFurnitureContent(test.type, false);
                console.log(`  ✅ Loaded ${links.length} links`);
                if (links.length > 0) {
                    console.log(`  📊 Platforms: ${[...new Set(links.map(l => l.platform))].join(', ')}`);
                }
            } catch (error) {
                console.error(`  ❌ Failed:`, error);
            }
        }

        console.log('\n📊 Cache Statistics:');
        await window.getFurnitureCacheInfo();

        console.log('\n🧪 Integration test complete!');
    };

    // Export integration status
    window.recommendationIntegrationReady = true;
    console.log('✅ Recommendation Integration Helper loaded');
    console.log('   Available functions:');
    console.log('   - loadFurnitureContent(type, forceRefresh)');
    console.log('   - refreshFurnitureContent(id, type)');
    console.log('   - recordContentDislike(linkObject)');
    console.log('   - clearFurnitureCache(type)');
    console.log('   - getFurnitureCacheInfo()');
    console.log('   - testRecommendationSystem()');

})();
