/**
 * Recommendation System Initialization
 * Extracted from index2.html for cleaner HTML structure
 */

(function() {
    'use strict';

    console.log('🎯 Initializing Content Recommendation System...');

    // Initialize recommendation system on DOM ready
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            // Initialize preference learning service
            if (window.contentPreferenceLearningService) {
                await window.contentPreferenceLearningService.initialize();
                console.log('✅ Preference learning initialized');
                
                // Log filter stats
                const stats = window.contentPreferenceLearningService.getFilterStats();
                console.log('📊 Filter stats:', stats);
            } else {
                console.warn('⚠️ ContentPreferenceLearningService not loaded');
            }
            
            // Verify all services loaded
            const servicesLoaded = {
                config: !!window.RecommendationsConfig,
                storage: !!window.recommendationsStorage,
                service: !!window.recommendationService,
                manager: !!window.recommendationContentManager,
                preferences: !!window.contentPreferenceLearningService,
                getContent: !!window.getContentForFurniture
            };
            
            console.log('🔧 Recommendation Services:', servicesLoaded);
            
            if (Object.values(servicesLoaded).every(v => v)) {
                console.log('✅ Content Recommendation System ready!');
                
                // Optional: Pre-load content for faster first furniture spawn
                if (window.getContentForFurniture) {
                    console.log('📊 Pre-loading Gallery Wall content...');
                    window.getContentForFurniture('gallery_wall', false)
                        .then(links => {
                            console.log(`✅ Pre-loaded ${links.length} Gallery Wall links`);
                            const platforms = [...new Set(links.map(l => l.platform))];
                            console.log('   Platforms:', platforms.join(', '));
                        })
                        .catch(err => console.warn('⚠️ Pre-load failed:', err));
                }
            } else {
                console.warn('⚠️ Some recommendation services failed to load');
                for (const [name, loaded] of Object.entries(servicesLoaded)) {
                    if (!loaded) console.error(`❌ Missing: ${name}`);
                }
            }
            
            // Make helper function available globally for furniture loading
            window.getRecommendedContent = async function(furnitureType, forceRefresh = false) {
                if (!window.getContentForFurniture) {
                    console.error('❌ Recommendation system not available');
                    return [];
                }
                
                console.log(`📊 Fetching content for ${furnitureType}...`);
                const links = await window.getContentForFurniture(furnitureType, forceRefresh);
                console.log(`✅ Retrieved ${links.length} links for ${furnitureType}`);
                return links;
            };
            
        } catch (error) {
            console.error('❌ Failed to initialize recommendation system:', error);
        }
    });

    // ============================================================================
    // DEBUG/MANAGEMENT FUNCTIONS
    // ============================================================================

    // Expose management functions for debugging
    window.clearRecommendationCache = async function() {
        if (window.recommendationsStorage) {
            await window.recommendationsStorage.clearAllCaches();
            console.log('✅ All recommendation caches cleared');
        } else {
            console.error('❌ Storage service not available');
        }
    };
    
    window.getCacheStats = async function() {
        if (window.recommendationsStorage) {
            const stats = await window.recommendationsStorage.getCacheStats();
            console.table(stats);
            return stats;
        } else {
            console.error('❌ Storage service not available');
            return {};
        }
    };
    
    window.recordDislike = function(linkObject) {
        if (window.contentPreferenceLearningService) {
            const metadata = linkObject.metadata ? JSON.parse(linkObject.metadata) : {};
            window.contentPreferenceLearningService.recordDislike({
                title: linkObject.title || '',
                channelTitle: metadata.channelTitle || '',
                language: metadata.language || '',
                tags: metadata.tags || [],
                platform: linkObject.platform || ''
            });
            console.log('👎 Dislike recorded for preference learning');
        } else {
            console.error('❌ Preference service not available');
        }
    };

    console.log('🎯 Recommendation system initialization loaded');

})();
