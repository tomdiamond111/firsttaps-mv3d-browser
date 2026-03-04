/**
 * Default Poster URLs
 * 
 * Provides preset YouTube URLs for posters in Dazzle Bedroom and ChristmasLand worlds.
 * URLs are applied only on first visit - user changes are always preserved.
 * 
 * How it works:
 * 1. Listens for world-setup-complete events from GlobalPosterManager
 * 2. Checks if posters already have user-set URLs (skips if they do)
 * 3. Applies default URLs only to posters without URLs
 * 4. Works seamlessly with existing persistence system
 */

class DefaultPosterURLs {
    constructor() {
        console.log('🎬 Initializing Default Poster URLs system...');
        
        // Define default URLs for each poster by posterType ID
        this.defaultURLs = {
            // DAZZLE BEDROOM POSTERS
            'dazzle_poster_0_-149': 'https://youtu.be/e-ORhEE9VVg?si=ueK65Z3goAkUqdxY',      // Taylor Swift - back wall
            'dazzle_poster_-40_149': 'https://youtu.be/gPCCYMeXin0?si=mMO3D1RDRpFZoLKK',     // Meghan Trainor - front left
            'dazzle_poster_-149_0': 'https://youtu.be/QGsevnbItdU?si=hXAi1TUkv5bkMo2F',     // K-pop Demon Hunters - left wall
            'dazzle_poster_149_-50': 'https://youtu.be/JmcA9LIIXWw?si=ZjTRB_SVh68wUVLa',    // Culture Club - right wall
            
            // CHRISTMASLAND POSTERS
            'christmas_poster_0_-147': 'https://youtu.be/47KkONv_L4I?si=fDyMe731kvaTSRxb',   // Christmas - back wall
            'christmas_poster_-40_147': 'https://youtu.be/t_HUlkHYz4A?si=PWpPppb0wrK1nOYy',  // Santa - front left
            'christmas_poster_-147_0': 'https://youtu.be/v1VWi8B9jP8?si=zErkud1bBp77_bjR',   // Snowman - left wall
            'christmas_poster_147_-50': 'https://youtu.be/iaQBQp5tgcw?si=I7znk_odnwry-0ST'   // Gifts - right wall
        };
        
        // Track which worlds have had defaults applied (in-memory only)
        this.worldsInitialized = new Set();
        
        // Initialize the system
        this.initialize();
    }
    
    /**
     * Initialize and connect to GlobalPosterManager
     */
    initialize() {
        // Wait for GlobalPosterManager to be available
        this.waitForGlobalPosterManager();
    }
    
    /**
     * Wait for GlobalPosterManager to be ready
     */
    waitForGlobalPosterManager() {
        if (window.globalPosterManager) {
            console.log('🔗 Connected to GlobalPosterManager');
            this.connectToGlobalPosterManager();
        } else {
            console.log('⏳ Waiting for GlobalPosterManager...');
            setTimeout(() => this.waitForGlobalPosterManager(), 200);
        }
    }
    
    /**
     * Connect to GlobalPosterManager event system
     */
    connectToGlobalPosterManager() {
        const manager = window.globalPosterManager;
        
        // Listen for posters-created event
        manager.addEventListener('posters-created', (data) => {
            console.log('🎬 Posters created event received:', data);
            this.handlePostersCreated(data);
        });
        
        // Listen for world-switching event
        manager.addEventListener('world-switching', (data) => {
            console.log('🔄 World switching - checking for default URLs:', data);
            // Don't re-apply on world switches, only on first poster creation
        });
        
        console.log('✅ Default Poster URLs system connected to GlobalPosterManager');
    }
    
    /**
     * Handle posters-created event
     */
    async handlePostersCreated(data) {
        const { worldType, posters } = data;
        
        // Only apply defaults to dazzle and christmas worlds
        if (worldType !== 'dazzle' && worldType !== 'christmas') {
            console.log(`⏭️ Skipping default URLs for ${worldType} world`);
            return;
        }
        
        // Check if we've already initialized this world this session
        const worldKey = `${worldType}_session`;
        if (this.worldsInitialized.has(worldKey)) {
            console.log(`✓ Default URLs already applied for ${worldType} this session`);
            return;
        }
        
        console.log(`🎬 Applying default URLs for ${worldType} world...`);
        
        // Small delay to ensure GlobalPosterManager is fully ready
        await this.delay(500);
        
        // Apply default URLs
        await this.applyDefaultURLsForWorld(worldType);
        
        // Mark as initialized for this session
        this.worldsInitialized.add(worldKey);
        
        console.log(`✅ Default URLs applied for ${worldType} world`);
    }
    
    /**
     * Apply default URLs for a specific world
     */
    async applyDefaultURLsForWorld(worldType) {
        const manager = window.globalPosterManager;
        
        if (!manager) {
            console.warn('⚠️ GlobalPosterManager not available');
            return;
        }
        
        let appliedCount = 0;
        let skippedCount = 0;
        
        // Get all default URLs for this world
        const worldDefaults = Object.entries(this.defaultURLs).filter(([posterType]) => 
            posterType.startsWith(worldType)
        );
        
        console.log(`🔍 Found ${worldDefaults.length} default URLs for ${worldType}`);
        
        for (const [posterType, defaultURL] of worldDefaults) {
            // Check if this poster already has a user-set URL
            const existingURL = manager.posterData[worldType]?.[posterType];
            
            if (existingURL && typeof existingURL === 'string' && existingURL.trim() !== '') {
                console.log(`⏭️ Poster ${posterType} already has URL: ${existingURL}`);
                skippedCount++;
                continue;
            }
            
            // Apply default URL
            console.log(`🎬 Setting default URL for ${posterType}`);
            console.log(`   URL: ${defaultURL}`);
            
            // Store in GlobalPosterManager's data structure
            if (!manager.posterData[worldType]) {
                manager.posterData[worldType] = {};
            }
            
            manager.posterData[worldType][posterType] = {
                url: defaultURL,
                savedAt: Date.now(),
                worldType: worldType,
                posterPosition: posterType,
                isDefault: true // Mark as default so user knows they can change it
            };
            
            // Save to persistence
            await manager.savePosterData(worldType, posterType, defaultURL);
            
            // Update visual if poster is currently active
            const poster = manager.activePosters.get(posterType);
            if (poster) {
                console.log(`🖼️ Updating visual for ${posterType}`);
                await manager.updatePosterVisual(poster, defaultURL);
            }
            
            appliedCount++;
            
            // Small delay between poster updates
            await this.delay(100);
        }
        
        console.log(`✅ Applied ${appliedCount} default URLs, skipped ${skippedCount} existing URLs`);
    }
    
    /**
     * Utility: Promise-based delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Public method to reset defaults for a world (for testing)
     */
    async resetDefaultsForWorld(worldType) {
        console.log(`🔄 Resetting defaults for ${worldType}...`);
        
        const manager = window.globalPosterManager;
        if (!manager) {
            console.warn('⚠️ GlobalPosterManager not available');
            return;
        }
        
        // Clear the session flag
        this.worldsInitialized.delete(`${worldType}_session`);
        
        // Clear all poster URLs for this world
        const worldDefaults = Object.keys(this.defaultURLs).filter(posterType => 
            posterType.startsWith(worldType)
        );
        
        for (const posterType of worldDefaults) {
            await manager.clearPosterURL(posterType);
        }
        
        console.log(`✅ Reset complete for ${worldType}. Re-enter the world to reapply defaults.`);
    }
    
    /**
     * Public method to get all default URLs (for debugging)
     */
    getDefaultURLs() {
        return { ...this.defaultURLs };
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Create singleton instance when script loads
window.defaultPosterURLs = new DefaultPosterURLs();

// Expose utility functions globally for debugging
window.resetPosterDefaults = async (worldType) => {
    if (window.defaultPosterURLs) {
        await window.defaultPosterURLs.resetDefaultsForWorld(worldType);
    }
};

window.showDefaultPosterURLs = () => {
    if (window.defaultPosterURLs) {
        console.table(window.defaultPosterURLs.getDefaultURLs());
    }
};

console.log('🎬 Default Poster URLs module loaded');
console.log('💡 Debug commands:');
console.log('   - resetPosterDefaults("dazzle") - Reset Dazzle Bedroom defaults');
console.log('   - resetPosterDefaults("christmas") - Reset ChristmasLand defaults');
console.log('   - showDefaultPosterURLs() - Show all default URLs');
