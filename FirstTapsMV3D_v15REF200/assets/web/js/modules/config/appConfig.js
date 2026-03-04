/**
 * Application Configuration
 * Central configuration for production vs development modes
 * 
 * **IMPORTANT**: Keep this in sync with lib/config/app_config.dart
 */

(function() {
    'use strict';

    /**
     * AppConfig - Global application configuration
     */
    window.AppConfig = {
        /**
         * PRODUCTION FLAG
         * Set to `false` to enable all testing features (scoreboard controls, premium toggles, etc.)
         * Set to `true` to disable all testing features for public release
         * 
         * This flag controls:
         * - Scoreboard testing buttons (Jump to Level 5, Set Points, Toggle Premium, etc.)
         * - Premium world test panels
         * - Debug mode features
         */
        IS_PRODUCTION: false, // ✅ UNLOCKED for testing/marketing videos (set to true before production release)

        /**
         * Whether to show debug/testing controls in scoreboard
         */
        get showScoreboardDebugControls() {
            return !this.IS_PRODUCTION;
        },

        /**
         * Whether to show premium testing panels in world UIs
         */
        get showPremiumTestPanels() {
            return !this.IS_PRODUCTION;
        },

        /**
         * Whether to enable debug mode features
         */
        get isDebugMode() {
            return !this.IS_PRODUCTION;
        }
    };

    console.log('🔧 AppConfig loaded - Production mode:', window.AppConfig.IS_PRODUCTION);

    /**
     * LOG_CONFIG - Global logging configuration to reduce console noise
     * Set categories to false to silence specific log types
     */
    window.LOG_CONFIG = {
        // Geometry & 3D object creation (very noisy)
        geometry: false,         // "📐 Creating standardized link geometry"
        branding: false,         // "🎨 Creating app material", brand colors
        linkCreation: false,     // "🔗 Processing URL", "🔗 Created link object"
        
        // External service integration (thumbnails, metadata)
        youtube: false,          // YouTube oEmbed, thumbnail fetching
        spotify: false,          // Spotify API calls
        soundcloud: false,       // SoundCloud API calls
        deezer: false,           // Deezer metadata
        vimeo: false,            // Vimeo API calls
        instagram: false,        // Instagram API calls
        tiktok: false,           // TikTok API calls
        thumbnails: false,       // All thumbnail loading logs
        
        // Physics & positioning (very noisy)
        gravity: false,          // "[GRAVITY-DEBUG]" logs
        cameraControls: false,   // "🎥 Camera controls" logs
        
        // Object lifecycle
        objectDeletion: false,   // "Removing object", "Visual state captured"
        objectCreation: false,   // Object spawn/creation logs
        
        // Furniture system
        furnitureRefresh: true,  // Keep refresh logs for debugging
        furnitureContent: false, // Individual furniture content logs
        furnitureSlots: false,   // Furniture slot marker logs
        
        // System events (keep these for important debugging)
        errors: true,            // Always show errors
        warnings: true           // Always show warnings
    };

    /**
     * Helper function to check if a log category is enabled
     * @param {string} category - Category to check
     * @returns {boolean} - True if logging is enabled for this category
     */
    window.shouldLog = function(category) {
        return window.LOG_CONFIG[category] !== false;
    };
    
    console.log('🔧 LOG_CONFIG loaded - Reduced console verbosity enabled');
})();
