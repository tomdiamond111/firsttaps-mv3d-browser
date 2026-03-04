/**
 * PREMIUM FEATURES INTEGRATION
 * Connects premium features with the existing app systems
 * Provides communication bridge between Flutter and JavaScript premium features
 */

(function() {
    'use strict';
    
    console.log('🎯 Loading Premium Features Integration...');

    // ============================================================================
    // PREMIUM INTEGRATION MANAGER
    // ============================================================================
    
    class PremiumIntegration {
        constructor(app) {
            this.app = app;
            this.premiumWorldThemes = null;
            this.gamingHelperManager = null;
            this.currentTheme = 'greenplane'; // Default theme
            
            this.lastGamingLevelCheck = {
            level4: false,
            level5: false
        };

        // Periodically check for gaming level unlocks
        this.startGamingLevelMonitoring();
        
        console.log('🎯 Premium Integration Manager initialized');
        }
        
        /**
         * Initialize premium features
         */
        initialize() {
            // Wait for premium modules to load
            const checkModules = () => {
                if (window.PremiumWorldThemes && window.GamingHelperManager) {
                    this.premiumWorldThemes = this.app.premiumWorldThemes || new window.PremiumWorldThemes();
                    this.gamingHelperManager = this.app.gamingHelperManager || new window.GamingHelperManager(this.app);
                    
                    // Store references in app
                    this.app.premiumWorldThemes = this.premiumWorldThemes;
                    this.app.gamingHelperManager = this.gamingHelperManager;
                    
                    this.setupMessageHandlers();
                    console.log('🎯 Premium features initialized successfully');
                    return true;
                } else {
                    console.log('🎯 Waiting for premium modules to load...');
                    setTimeout(checkModules, 100);
                    return false;
                }
            };
            
            return checkModules();
        }
        
        /**
         * Setup message handlers for Flutter communication
         */
        setupMessageHandlers() {
            // Create premium feature channel for Flutter communication
            window.premiumFeatureChannel = {
                switchWorldTheme: (themeId) => this.switchWorldTheme(themeId),
                spawnHelper: (type, breed) => this.spawnHelper(type, breed),
                removeHelper: (type) => this.removeHelper(type),
                clearAllHelpers: () => this.clearAllHelpers(),
                getHelperStatus: () => this.getHelperStatus(),
                testHelper: () => this.testHelper(),
                isPremiumTheme: (themeId) => this.isPremiumTheme(themeId),
                getAvailableThemes: () => this.getAvailableThemes(),
                isPremiumFeatureUnlocked: (featureKey) => this.isPremiumFeatureUnlocked(featureKey),
            };
            
            console.log('🎯 Premium feature message handlers setup complete');
        }
        
        // ========================================================================
        // WORLD THEME METHODS
        // ========================================================================
        
        /**
         * Switch to a world theme (free or premium)
         */
        switchWorldTheme(themeId) {
            console.log(`🎨 Switching to theme: ${themeId}`);
            
            try {
                // Check if it's a premium theme
                if (this.premiumWorldThemes.isPremiumTheme(themeId)) {
                    console.log(`🎨 Applying premium theme: ${themeId}`);
                    
                    // Clean up previous premium theme effects
                    this.premiumWorldThemes.cleanup(this.app);
                    
                    // Apply the premium theme
                    const success = this.premiumWorldThemes.applyPremiumTheme(themeId, this.app);
                    
                    if (success) {
                        this.currentTheme = themeId;
                        console.log(`🎨 Successfully switched to premium theme: ${themeId}`);
                        return { success: true, theme: themeId, isPremium: true };
                    } else {
                        console.error(`🎨 Failed to apply premium theme: ${themeId}`);
                        return { success: false, error: 'Failed to apply premium theme' };
                    }
                } else {
                    // Use existing world switching for free themes
                    if (this.app.worldManager && this.app.worldManager.switchToWorld) {
                        // Clean up premium theme effects first
                        this.premiumWorldThemes.cleanup(this.app);
                        
                        // Switch to free theme
                        this.app.worldManager.switchToWorld(themeId);
                        this.currentTheme = themeId;
                        
                        console.log(`🎨 Successfully switched to free theme: ${themeId}`);
                        return { success: true, theme: themeId, isPremium: false };
                    } else {
                        console.error('🎨 World manager not available for free theme switching');
                        return { success: false, error: 'World manager not available' };
                    }
                }
            } catch (error) {
                console.error(`🎨 Error switching theme to ${themeId}:`, error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Check if a theme is premium
         */
        isPremiumTheme(themeId) {
            return this.premiumWorldThemes ? this.premiumWorldThemes.isPremiumTheme(themeId) : false;
        }
        
        /**
         * Get all available themes
         */
        getAvailableThemes() {
            const freeThemes = ['greenplane', 'ocean', 'space'];
            const premiumThemes = ['dazzle', 'forest', 'cave', 'christmas'];
            
            return {
                free: freeThemes,
                premium: premiumThemes,
                current: this.currentTheme
            };
        }
        
        /**
         * Check if a premium feature is unlocked
         * This is a placeholder that assumes features are unlocked for testing
         * In production, this should check with Flutter's premium service
         */
        isPremiumFeatureUnlocked(featureKey) {
            console.log(`🎯 Checking premium feature: ${featureKey}`);
            
            // For now, assume premium gaming levels are unlocked for testing
            // This should eventually communicate with Flutter's PremiumService
            if (featureKey === 'gaming_level_4' || featureKey === 'gaming_level_5') {
                // Check localStorage for development testing first
                const testKey = featureKey === 'gaming_level_4' ? 'test_premium_level_4' : 'test_premium_level_5';
                const isTestUnlocked = localStorage.getItem(testKey) === 'true';
                
                if (isTestUnlocked) {
                    console.log(`🎯 Premium feature ${featureKey} unlocked via localStorage test key`);
                    return true;
                }
                
                // TODO: Add proper Flutter bridge communication here
                // For now, default to unlocked for testing
                console.log(`🎯 Premium feature ${featureKey} defaulting to unlocked for testing`);
                return true;
            }
            
            // For other features, assume unlocked
            return true;
        }
        
        // ========================================================================
        // GAMING HELPER METHODS
        // ========================================================================
        
        /**
         * Spawn a gaming helper
         */
        spawnHelper(type, breed) {
            console.log(`🐕 Spawning helper: ${type} (${breed})`);
            
            if (!this.gamingHelperManager) {
                console.error('🐕 Gaming helper manager not available');
                return { success: false, error: 'Gaming helper manager not available' };
            }
            
            try {
                const helper = this.gamingHelperManager.spawnHelper(type, breed);
                
                if (helper) {
                    console.log(`🐕 Successfully spawned ${type} helper: ${breed}`);
                    return { 
                        success: true, 
                        helper: {
                            type: type,
                            breed: breed,
                            name: helper.breedConfig.name
                        }
                    };
                } else {
                    console.error(`🐕 Failed to spawn helper: ${type} (${breed})`);
                    return { success: false, error: 'Failed to spawn helper' };
                }
            } catch (error) {
                console.error(`🐕 Error spawning helper:`, error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Remove a specific helper type
         */
        removeHelper(type) {
            console.log(`🐕 Removing helper: ${type}`);
            
            if (!this.gamingHelperManager) {
                console.error('🐕 Gaming helper manager not available');
                return { success: false, error: 'Gaming helper manager not available' };
            }
            
            try {
                this.gamingHelperManager.removeHelper(type);
                console.log(`🐕 Successfully removed helper: ${type}`);
                return { success: true, removed: type };
            } catch (error) {
                console.error(`🐕 Error removing helper:`, error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Clear all helpers
         */
        clearAllHelpers() {
            console.log('🐕 Clearing all helpers');
            
            if (!this.gamingHelperManager) {
                console.error('🐕 Gaming helper manager not available');
                return { success: false, error: 'Gaming helper manager not available' };
            }
            
            try {
                this.gamingHelperManager.cleanup();
                console.log('🐕 Successfully cleared all helpers');
                return { success: true };
            } catch (error) {
                console.error('🐕 Error clearing helpers:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Get helper status for UI
         */
        getHelperStatus() {
            if (!this.gamingHelperManager) {
                return { active: false, helpers: [] };
            }
            
            try {
                const status = this.gamingHelperManager.getHelperStatus();
                const helpers = this.gamingHelperManager.getActiveHelpers();
                
                return {
                    active: helpers.length > 0,
                    count: helpers.length,
                    helpers: Object.values(status),
                    detailed: status
                };
            } catch (error) {
                console.error('🐕 Error getting helper status:', error);
                return { active: false, helpers: [], error: error.message };
            }
        }
        
        /**
         * Test helper functionality
         */
        testHelper() {
            console.log('🐕 Testing helper functionality');
            
            if (!this.gamingHelperManager) {
                return { success: false, error: 'Gaming helper manager not available' };
            }
            
            try {
                // Clear tapped entities to allow retapping
                this.gamingHelperManager.clearTappedEntities();
                
                // Get treasure stats if available
                let treasureStats = {};
                if (this.app.treasureBoxManager) {
                    treasureStats = this.app.treasureBoxManager.getTreasureStats();
                }
                
                return {
                    success: true,
                    message: 'Helper test completed - tapped entities cleared',
                    treasureStats: treasureStats,
                    helperStatus: this.getHelperStatus()
                };
            } catch (error) {
                console.error('🐕 Error testing helpers:', error);
                return { success: false, error: error.message };
            }
        }
        
        // ========================================================================
        // INTEGRATION WITH EXISTING SYSTEMS
        // ========================================================================
        
        /**
         * Integrate with existing object position updates for tree trunks
         */
        onObjectPositionChanged(object) {
            // Update tree trunk for forest theme
            if (this.currentTheme === 'forest' && this.premiumWorldThemes) {
                this.premiumWorldThemes.updateTreeTrunkForObject(object, this.app);
            }
        }
        
        /**
         * Get current premium features status
         */
        getStatus() {
            return {
                initialized: !!(this.premiumWorldThemes && this.gamingHelperManager),
                currentTheme: this.currentTheme,
                helperStatus: this.getHelperStatus(),
                availableThemes: this.getAvailableThemes()
            };
        }
    }

    // ============================================================================
    // GLOBAL INTEGRATION
    // ============================================================================
    
    // Make available globally
    window.PremiumIntegration = PremiumIntegration;
    
    // Initialize when app is available
    const initializePremiumIntegration = () => {
        if (window.app) {
            window.app.premiumIntegration = new PremiumIntegration(window.app);
            
            // Initialize after a brief delay to ensure all modules are loaded
            setTimeout(() => {
                window.app.premiumIntegration.initialize();
            }, 500);
            
            console.log('🎯 Premium Integration attached to app');
        } else {
            console.log('🎯 Waiting for app to be available...');
            setTimeout(initializePremiumIntegration, 100);
        }
    };
    
    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePremiumIntegration);
    } else {
        initializePremiumIntegration();
    }
    
    console.log('🎯 Premium Features Integration module loaded successfully!');
})();
