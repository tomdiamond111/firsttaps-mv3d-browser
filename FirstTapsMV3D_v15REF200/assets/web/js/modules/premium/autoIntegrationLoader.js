/**
 * WORLD TEMPLATE AUTO-INTEGRATION LOADER
 * Ensures all auto-integration modules load in the correct order
 * Conservative approach: Only loads new functionality
 */

(function() {
    'use strict';
    
    console.log('🚀 Loading WorldTemplate Auto-Integration System...');

    /**
     * Auto-Integration Loader
     */
    class AutoIntegrationLoader {
        constructor() {
            this.loadOrder = [
                'worldTemplateMetadata',
                'worldTemplateAutoIntegration',
                'dynamicPremiumDetection',
                'worldTemplateRegistryHelper' // Already exists, just needs to initialize
            ];
            this.loaded = new Set();
            this.maxWaitTime = 5000; // 5 seconds max wait
            this.checkInterval = 100; // Check every 100ms
        }
        
        /**
         * Initialize the auto-integration system
         */
        async initialize() {
            console.log('🚀 Initializing auto-integration system...');
            
            try {
                await this.waitForModules();
                await this.initializeModules();
                this.setupGlobalFunctions();
                
                console.log('🚀 Auto-integration system initialized successfully!');
                return true;
                
            } catch (error) {
                console.error('🚀 Failed to initialize auto-integration system:', error);
                return false;
            }
        }
        
        /**
         * Wait for all required modules to load
         */
        async waitForModules() {
            const requiredModules = [
                'WorldTemplateMetadata',
                'WorldTemplateAutoIntegration',
                'DynamicPremiumDetection'
            ];
            
            const startTime = Date.now();
            
            while (Date.now() - startTime < this.maxWaitTime) {
                const allLoaded = requiredModules.every(moduleName => 
                    window[moduleName] && typeof window[moduleName] === 'function'
                );
                
                if (allLoaded) {
                    console.log('🚀 All required modules loaded');
                    return;
                }
                
                await this.delay(this.checkInterval);
            }
            
            throw new Error('Timeout waiting for auto-integration modules to load');
        }
        
        /**
         * Initialize all modules in correct order
         */
        async initializeModules() {
            // 1. Initialize metadata system (no dependencies)
            if (window.WorldTemplateMetadata) {
                console.log('🚀 Metadata system ready');
                this.loaded.add('metadata');
            }
            
            // 2. Initialize auto-integration (depends on metadata)
            if (window.worldTemplateAutoIntegration) {
                await window.worldTemplateAutoIntegration.initialize();
                console.log('🚀 Auto-integration system ready');
                this.loaded.add('autoIntegration');
            }
            
            // 3. Initialize dynamic premium detection (depends on auto-integration)
            if (window.dynamicPremiumDetection) {
                await window.dynamicPremiumDetection.initialize();
                console.log('🚀 Dynamic premium detection ready');
                this.loaded.add('premiumDetection');
            }
            
            // 4. Registry helper should already be initialized
            if (window.worldTemplateRegistryHelper) {
                console.log('🚀 Registry helper ready');
                this.loaded.add('registryHelper');
            }
        }
        
        /**
         * Setup global convenience functions
         */
        setupGlobalFunctions() {
            // Global function to check system status
            window.checkAutoIntegrationStatus = () => {
                return {
                    loaded: Array.from(this.loaded),
                    systems: {
                        metadata: !!window.WorldTemplateMetadata,
                        autoIntegration: !!window.worldTemplateAutoIntegration?.initialized,
                        premiumDetection: !!window.dynamicPremiumDetection?.initialized,
                        registryHelper: !!window.worldTemplateRegistryHelper
                    },
                    registeredTemplates: window.worldTemplateAutoIntegration 
                        ? window.worldTemplateAutoIntegration.getAllRegisteredTemplates()
                        : [],
                    premiumWorlds: window.dynamicPremiumDetection
                        ? window.dynamicPremiumDetection.getAllPremiumWorlds()
                        : []
                };
            };
            
            // Global function to register template with auto-integration
            window.registerWorldTemplateWithAutoIntegration = (templateClass, config = {}) => {
                if (window.worldTemplateRegistryHelper) {
                    return window.worldTemplateRegistryHelper.registerNewTemplate(templateClass, config);
                } else {
                    console.error('Auto-integration system not available');
                    return false;
                }
            };
            
            // Global debug function
            window.debugAutoIntegration = () => {
                const status = window.checkAutoIntegrationStatus();
                console.log('🚀 Auto-Integration System Status:', status);
                
                if (window.worldTemplateAutoIntegration) {
                    console.log('🔄 Auto-Integration Debug:', window.worldTemplateAutoIntegration.getDebugInfo());
                }
                
                if (window.dynamicPremiumDetection) {
                    console.log('💎 Premium Detection Debug:', window.dynamicPremiumDetection.getDebugInfo());
                }
                
                return status;
            };
        }
        
        /**
         * Delay utility
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        /**
         * Get initialization status
         */
        getStatus() {
            return {
                loaded: Array.from(this.loaded),
                totalModules: this.loadOrder.length,
                isComplete: this.loaded.size === this.loadOrder.length
            };
        }
    }
    
    // Create and initialize loader
    const autoIntegrationLoader = new AutoIntegrationLoader();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await autoIntegrationLoader.initialize();
        });
    } else {
        // DOM already loaded, initialize with delay to ensure all modules are loaded
        setTimeout(async () => {
            await autoIntegrationLoader.initialize();
        }, 200);
    }
    
    // Make loader available globally for debugging
    window.autoIntegrationLoader = autoIntegrationLoader;
    
    console.log('🚀 Auto-Integration Loader ready');
    
})();