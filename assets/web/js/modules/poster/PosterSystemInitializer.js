/**
 * PosterSystemInitializer
 * 
 * Handles initialization of the global poster system during app startup.
 * This ensures the GlobalPosterManager is created before any worlds are loaded,
 * eliminating timing dependencies and initialization issues.
 */

class PosterSystemInitializer {
    static isInitialized = false;
    
    /**
     * Initialize the poster system during app startup
     * Call this BEFORE any world loading or scene setup
     */
    static initialize() {
        if (PosterSystemInitializer.isInitialized) {
            console.log('🖼️ Poster system already initialized');
            return window.globalPosterManager;
        }
        
        console.log('🚀 Initializing global poster system...');
        
        try {
            // Initialize GlobalPosterManager
            const manager = GlobalPosterManager.initialize();
            
            // Setup app-level integration
            PosterSystemInitializer.setupAppIntegration();
            
            // Setup world switching hooks
            PosterSystemInitializer.setupWorldSwitchingHooks();
            
            // Mark as initialized
            PosterSystemInitializer.isInitialized = true;
            
            console.log('✅ Global poster system initialization complete');
            return manager;
            
        } catch (error) {
            console.error('❌ Failed to initialize poster system:', error);
            return null;
        }
    }
    
    /**
     * Setup integration with the main app
     */
    static setupAppIntegration() {
        console.log('🔗 Setting up poster system app integration...');
        
        // Wait for app to be available
        const waitForApp = () => {
            if (window.app) {
                // Hook into app's interaction system
                PosterSystemInitializer.hookIntoInteractionSystem();
                
                // Hook into app's world manager
                PosterSystemInitializer.hookIntoWorldManager();
            } else {
                setTimeout(waitForApp, 100);
            }
        };
        
        waitForApp();
    }
    
    /**
     * Hook into the app's interaction system
     */
    static hookIntoInteractionSystem() {
        if (!window.app.interactionManager) {
            console.log('⏳ Waiting for interaction manager...');
            setTimeout(() => PosterSystemInitializer.hookIntoInteractionSystem(), 200);
            return;
        }
        
        console.log('🤝 Hooking into interaction system...');
        
        const interactionManager = window.app.interactionManager;
        const originalHandleLongPress = interactionManager.handleLongPress;
        
        // Override long press handler to route poster interactions to GlobalPosterManager
        interactionManager.handleLongPress = function(object) {
            // Check if it's a poster first
            if (window.globalPosterManager && window.globalPosterManager.isPosterObject(object)) {
                console.log('🖼️ Routing poster long press to GlobalPosterManager');
                return window.globalPosterManager.handlePosterLongPress(object);
            }
            
            // For non-poster objects, use original handler
            return originalHandleLongPress.call(this, object);
        };
        
        console.log('✅ Interaction system integration complete');
    }
    
    /**
     * Hook into the app's world manager
     */
    static hookIntoWorldManager() {
        if (!window.app.worldManager) {
            console.log('⏳ Waiting for world manager...');
            setTimeout(() => PosterSystemInitializer.hookIntoWorldManager(), 200);
            return;
        }
        
        console.log('🌍 Hooking into world manager...');
        
        // Monitor world changes
        const worldManager = window.app.worldManager;
        
        // Hook into world switching if available
        if (worldManager.switchToWorld) {
            const originalSwitchToWorld = worldManager.switchToWorld;
            
            worldManager.switchToWorld = function(worldType, ...args) {
                console.log(`🔄 Poster system: World switching to ${worldType}`);
                
                // Notify poster manager of world switch
                if (window.globalPosterManager) {
                    const currentWorld = window.globalPosterManager.currentWorldType;
                    window.globalPosterManager.dispatchEvent('world-switching', {
                        from: currentWorld,
                        to: worldType
                    });
                }
                
                // Call original method
                return originalSwitchToWorld.call(this, worldType, ...args);
            };
        }
        
        console.log('✅ World manager integration complete');
    }
    
    /**
     * Setup world switching hooks
     */
    static setupWorldSwitchingHooks() {
        console.log('🔄 Setting up world switching hooks...');
        
        // Listen for world template changes
        Object.defineProperty(window, 'currentWorldType', {
            get() {
                return window._currentWorldType;
            },
            set(value) {
                const oldValue = window._currentWorldType;
                window._currentWorldType = value;
                
                // Notify poster manager of world change
                if (window.globalPosterManager && oldValue !== value) {
                    console.log(`🌍 World type changed: ${oldValue} -> ${value}`);
                    window.globalPosterManager.dispatchEvent('world-setup-complete', {
                        worldType: value,
                        previousWorldType: oldValue
                    });
                }
            }
        });
    }
    
    /**
     * Ensure poster system is ready for world template use
     */
    static ensureReady() {
        return new Promise((resolve) => {
            const checkReady = () => {
                if (window.globalPosterManager && window.globalPosterManager.isInitialized) {
                    resolve(window.globalPosterManager);
                } else {
                    setTimeout(checkReady, 50);
                }
            };
            checkReady();
        });
    }
    
    /**
     * Helper for world templates to create posters
     * This method ensures the poster system is ready before creating posters
     */
    static async createPostersForWorld(THREE, scene, objects, worldType, posterConfigs) {
        console.log(`🖼️ Creating posters for ${worldType} world...`);
        
        // Ensure poster system is ready
        await PosterSystemInitializer.ensureReady();
        
        // Create posters using SimplifiedPosterCreator
        const creator = new SimplifiedPosterCreator(THREE, scene, objects);
        return creator.createWorldPosters(worldType, posterConfigs);
    }
    
    /**
     * Quick setup for standard world configurations
     */
    static async quickSetupForWorld(THREE, scene, objects, worldType) {
        console.log(`🚀 Quick poster setup for ${worldType}...`);
        
        // Ensure poster system is ready
        await PosterSystemInitializer.ensureReady();
        
        // Use standard configuration
        return SimplifiedPosterCreator.quickSetup(THREE, scene, objects, worldType);
    }
    
    /**
     * Debug information
     */
    static getDebugInfo() {
        return {
            isInitialized: PosterSystemInitializer.isInitialized,
            hasGlobalManager: !!window.globalPosterManager,
            managerInitialized: window.globalPosterManager ? window.globalPosterManager.isInitialized : false,
            appAvailable: !!window.app,
            interactionManagerAvailable: !!(window.app && window.app.interactionManager),
            worldManagerAvailable: !!(window.app && window.app.worldManager)
        };
    }
    
    /**
     * Reset the poster system (for debugging/testing)
     */
    static reset() {
        console.log('🔄 Resetting poster system...');
        
        PosterSystemInitializer.isInitialized = false;
        GlobalPosterManager.instance = null;
        
        if (window.globalPosterManager) {
            delete window.globalPosterManager;
        }
        
        console.log('✅ Poster system reset complete');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PosterSystemInitializer;
} else if (typeof window !== 'undefined') {
    window.PosterSystemInitializer = PosterSystemInitializer;
}

console.log('🚀 PosterSystemInitializer class loaded successfully');