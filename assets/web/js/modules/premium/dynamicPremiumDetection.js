/**
 * DYNAMIC PREMIUM WORLD DETECTION SYSTEM
 * Replaces static isPremiumWorld arrays with dynamic detection
 * Conservative approach: Extends existing functionality without breaking it
 */

(function() {
    'use strict';
    
    console.log('💎 Loading DynamicPremiumDetection...');

    /**
     * Dynamic Premium World Detection System
     */
    class DynamicPremiumDetection {
        constructor() {
            this.staticPremiumWorlds = ['dazzle', 'forest', 'cave', 'christmas', 'desert-oasis'];
            this.dynamicPremiumWorlds = new Set();
            this.initialized = false;
            
            console.log('💎 DynamicPremiumDetection initialized');
        }
        
        /**
         * Initialize the dynamic detection system
         */
        initialize() {
            if (this.initialized) return;
            
            try {
                this.setupGlobalFunctions();
                this.integrateWithExistingSystems();
                this.initialized = true;
                
                console.log('💎 Dynamic premium detection system initialized');
            } catch (error) {
                console.error('💎 Failed to initialize dynamic premium detection:', error);
            }
        }
        
        /**
         * Setup global functions for backward compatibility
         */
        setupGlobalFunctions() {
            // Global function for checking if a world is premium
            window.isDynamicPremiumWorld = (worldType) => {
                return this.isPremiumWorld(worldType);
            };
            
            // Global function to get all premium worlds
            window.getAllPremiumWorlds = () => {
                return this.getAllPremiumWorlds();
            };
            
            // Global function to register dynamic premium world
            window.registerDynamicPremiumWorld = (worldType) => {
                return this.registerPremiumWorld(worldType);
            };
        }
        
        /**
         * Integrate with existing systems
         */
        integrateWithExistingSystems() {
            // Hook into auto-integration system if available
            if (window.worldTemplateAutoIntegration) {
                // Listen for new template registrations
                const originalRegister = window.worldTemplateAutoIntegration.registerTemplate;
                
                window.worldTemplateAutoIntegration.registerTemplate = (templateClass, config = {}) => {
                    const result = originalRegister.call(window.worldTemplateAutoIntegration, templateClass, config);
                    
                    // Check if this is a premium template
                    if (result) {
                        const metadata = window.worldTemplateAutoIntegration.getTemplateMetadata(templateClass.getConfig().id);
                        if (metadata && metadata.isPremium) {
                            this.registerPremiumWorld(metadata.id);
                        }
                    }
                    
                    return result;
                };
            }
        }
        
        /**
         * Check if a world type is premium (combines static and dynamic)
         */
        isPremiumWorld(worldType) {
            // Check static list first (existing worlds)
            if (this.staticPremiumWorlds.includes(worldType)) {
                return true;
            }
            
            // Check dynamic list (new templates)
            if (this.dynamicPremiumWorlds.has(worldType)) {
                return true;
            }
            
            // Check auto-integration system if available
            if (window.worldTemplateAutoIntegration) {
                const metadata = window.worldTemplateAutoIntegration.getTemplateMetadata(worldType);
                if (metadata && metadata.isPremium) {
                    // Cache for future lookups
                    this.dynamicPremiumWorlds.add(worldType);
                    return true;
                }
            }
            
            // Check world template registry helper
            if (window.worldTemplateRegistryHelper && window.worldTemplateRegistryHelper.requiresPremiumBundle) {
                return window.worldTemplateRegistryHelper.requiresPremiumBundle(worldType);
            }
            
            return false;
        }
        
        /**
         * Register a world type as premium
         */
        registerPremiumWorld(worldType) {
            if (!this.staticPremiumWorlds.includes(worldType)) {
                this.dynamicPremiumWorlds.add(worldType);
                console.log(`💎 Registered dynamic premium world: ${worldType}`);
                return true;
            }
            return false; // Already in static list
        }
        
        /**
         * Remove a world type from premium (only affects dynamic list)
         */
        unregisterPremiumWorld(worldType) {
            if (this.dynamicPremiumWorlds.has(worldType)) {
                this.dynamicPremiumWorlds.delete(worldType);
                console.log(`💎 Unregistered dynamic premium world: ${worldType}`);
                return true;
            }
            return false;
        }
        
        /**
         * Get all premium worlds (static + dynamic)
         */
        getAllPremiumWorlds() {
            const allPremium = [...this.staticPremiumWorlds];
            
            // Add dynamic premium worlds
            this.dynamicPremiumWorlds.forEach(worldType => {
                if (!allPremium.includes(worldType)) {
                    allPremium.push(worldType);
                }
            });
            
            // Add from auto-integration system
            if (window.worldTemplateAutoIntegration) {
                const autoIntegratedTemplates = window.worldTemplateAutoIntegration.getAllRegisteredTemplates();
                autoIntegratedTemplates.forEach(metadata => {
                    if (metadata.isPremium && !allPremium.includes(metadata.id)) {
                        allPremium.push(metadata.id);
                    }
                });
            }
            
            return allPremium;
        }
        
        /**
         * Get only dynamically registered premium worlds
         */
        getDynamicPremiumWorlds() {
            return Array.from(this.dynamicPremiumWorlds);
        }
        
        /**
         * Get only static premium worlds
         */
        getStaticPremiumWorlds() {
            return [...this.staticPremiumWorlds];
        }
        
        /**
         * Check if a world requires premium bundle loading
         */
        requiresPremiumBundle(worldType) {
            return this.isPremiumWorld(worldType);
        }
        
        /**
         * Create enhanced isPremiumWorld function for worldManagement.js
         */
        createEnhancedIsPremiumWorldFunction() {
            return (worldType) => {
                // Try dynamic detection first
                if (this.isPremiumWorld(worldType)) {
                    return true;
                }
                
                // Fallback to original static check for safety
                const legacyPremiumWorlds = ['forest', 'dazzle', 'cave', 'christmas', 'desert-oasis'];
                return legacyPremiumWorlds.includes(worldType);
            };
        }
        
        /**
         * Get debug information
         */
        getDebugInfo() {
            return {
                initialized: this.initialized,
                staticPremiumWorlds: this.staticPremiumWorlds,
                dynamicPremiumWorlds: Array.from(this.dynamicPremiumWorlds),
                totalPremiumWorlds: this.getAllPremiumWorlds(),
                systemsIntegrated: {
                    autoIntegration: !!window.worldTemplateAutoIntegration,
                    registryHelper: !!window.worldTemplateRegistryHelper
                }
            };
        }
        
        /**
         * Validate premium world configuration
         */
        validatePremiumWorld(worldType) {
            const checks = {
                isRegistered: this.isPremiumWorld(worldType),
                hasMetadata: false,
                hasTemplate: false
            };
            
            // Check if template exists
            if (window.worldTemplateAutoIntegration) {
                checks.hasMetadata = !!window.worldTemplateAutoIntegration.getTemplateMetadata(worldType);
                checks.hasTemplate = window.worldTemplateAutoIntegration.isAutoIntegrated(worldType);
            }
            
            return checks;
        }
    }
    
    // Create global instance
    window.DynamicPremiumDetection = DynamicPremiumDetection;
    window.dynamicPremiumDetection = new DynamicPremiumDetection();
    
    // Initialize immediately - world templates need this ready when they load
    window.dynamicPremiumDetection.initialize();
    
    console.log('💎 DynamicPremiumDetection module loaded and initialized');
    
})();