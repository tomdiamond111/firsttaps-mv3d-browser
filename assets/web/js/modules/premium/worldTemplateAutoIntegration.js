/**
 * WORLD TEMPLATE AUTO-INTEGRATION SYSTEM
 * Provides automatic integration of new world templates across all app systems
 * WITHOUT modifying existing core files heavily
 * 
 * Conservative approach: Create new functionality in separate files
 */

(function() {
    'use strict';
    
    console.log('🔄 Loading WorldTemplateAutoIntegration...');

    /**
     * Handles automatic integration of world templates across app systems
     */
    class WorldTemplateAutoIntegration {
        constructor() {
            this.integrationHooks = new Map();
            this.registeredTemplates = new Map();
            this.initialized = false;
            
            console.log('🔄 WorldTemplateAutoIntegration initialized');
        }
        
        /**
         * Initialize the auto-integration system
         */
        initialize() {
            if (this.initialized) return;
            
            try {
                this.setupIntegrationHooks();
                this.setupRegistryIntegration();
                this.initialized = true;
                
                console.log('🔄 Auto-integration system initialized successfully');
            } catch (error) {
                console.error('🔄 Failed to initialize auto-integration:', error);
            }
        }
        
        /**
         * Register a world template for auto-integration
         */
        registerTemplate(templateClass, config = {}) {
            try {
                const templateConfig = templateClass.getConfig ? templateClass.getConfig() : {};
                const metadata = this.generateTemplateMetadata(templateClass, templateConfig, config);
                
                this.registeredTemplates.set(metadata.id, {
                    class: templateClass,
                    metadata: metadata,
                    config: config
                });
                
                // Auto-integrate with existing systems
                this.integrateTemplate(metadata);
                
                console.log('🔄 Auto-registered template:', metadata.id);
                return true;
                
            } catch (error) {
                console.error('🔄 Failed to register template:', error);
                return false;
            }
        }
        
        /**
         * Generate standardized metadata for a template
         */
        generateTemplateMetadata(templateClass, templateConfig, userConfig) {
            return {
                id: templateConfig.id || userConfig.id || 'unknown',
                displayName: templateConfig.displayName || userConfig.displayName || 'Unknown World',
                description: templateConfig.description || userConfig.description || '',
                isPremium: templateConfig.isPremium !== false, // Default to premium
                bundle: templateConfig.bundle || 'premium',
                category: templateConfig.category || 'environment',
                
                // File zone configuration
                fileZones: {
                    inherits: userConfig.fileZones?.inherits || 'green-plane',
                    type: userConfig.fileZones?.type || 'ground-level',
                    customizations: userConfig.fileZones?.customizations || {}
                },
                
                // Integration settings
                integration: {
                    autoMainApplication: userConfig.autoIntegrate?.mainApplication !== false,
                    autoWorldManagement: userConfig.autoIntegrate?.worldManagement !== false,
                    autoSortingManager: userConfig.autoIntegrate?.sortingManager !== false,
                    autoFlutterMenu: userConfig.autoIntegrate?.flutterMenu !== false
                },
                
                // Menu configuration
                menu: {
                    icon: templateConfig.menuIcon || userConfig.menuIcon || 'landscape',
                    priority: userConfig.menuPriority || 100,
                    visible: userConfig.menuVisible !== false
                }
            };
        }
        
        /**
         * Setup integration hooks with existing systems
         */
        setupIntegrationHooks() {
            // Hook into world template registry helper
            if (window.worldTemplateRegistryHelper) {
                this.integrationHooks.set('registry', window.worldTemplateRegistryHelper);
            }
            
            // Hook into main application if available
            if (window.WindowWorldApp) {
                this.setupMainApplicationHook();
            }
            
            // Hook into sorting manager integration
            this.setupSortingManagerHook();
        }
        
        /**
         * Setup registry integration
         */
        setupRegistryIntegration() {
            if (window.worldTemplateRegistryHelper) {
                // Enhance the existing registry helper with our auto-integration
                const originalRegister = window.worldTemplateRegistryHelper.registerNewTemplate;
                
                window.worldTemplateRegistryHelper.registerNewTemplate = (templateClass) => {
                    // Call original registration
                    const result = originalRegister.call(window.worldTemplateRegistryHelper, templateClass);
                    
                    // Add our auto-integration
                    if (result && this.initialized) {
                        this.registerTemplate(templateClass);
                    }
                    
                    return result;
                };
            }
        }
        
        /**
         * Setup main application integration hook
         */
        setupMainApplicationHook() {
            // Create helper function for dynamic template creation
            window.createTemplateFromRegistry = (worldType, THREE, config = {}) => {
                const template = this.registeredTemplates.get(worldType);
                if (template) {
                    try {
                        return new template.class(THREE, config);
                    } catch (error) {
                        console.error(`🔄 Failed to create template ${worldType}:`, error);
                        return null;
                    }
                }
                return null;
            };
        }
        
        /**
         * Setup sorting manager integration hook
         */
        setupSortingManagerHook() {
            // Create helper for dynamic zone creation
            window.getFileZoneConfigForTemplate = (worldType) => {
                const template = this.registeredTemplates.get(worldType);
                if (template) {
                    return template.metadata.fileZones;
                }
                return null;
            };
        }
        
        /**
         * Integrate a template with existing systems
         */
        integrateTemplate(metadata) {
            if (metadata.integration.autoWorldManagement) {
                this.integratePremiumDetection(metadata);
            }
            
            if (metadata.integration.autoFlutterMenu) {
                this.integrateFlutterMenu(metadata);
            }
        }
        
        /**
         * Integrate with premium world detection
         */
        integratePremiumDetection(metadata) {
            // Create dynamic premium detection function if it doesn't exist
            if (!window.isDynamicPremiumWorld) {
                window.isDynamicPremiumWorld = (worldType) => {
                    const template = this.registeredTemplates.get(worldType);
                    return template ? template.metadata.isPremium : false;
                };
            }
        }
        
        /**
         * Integrate with Flutter menu system
         */
        integrateFlutterMenu(metadata) {
            if (metadata.menu.visible) {
                const menuItem = {
                    worldType: metadata.id,
                    title: metadata.displayName,
                    description: metadata.description,
                    icon: metadata.menu.icon,
                    isPremium: metadata.isPremium,
                    priority: metadata.menu.priority
                };
                
                // Store for later Flutter communication
                if (!window.dynamicWorldMenuItems) {
                    window.dynamicWorldMenuItems = [];
                }
                window.dynamicWorldMenuItems.push(menuItem);
                
                console.log('🔄 Added Flutter menu item for:', metadata.id);
            }
        }
        
        /**
         * Check if a world type is registered for auto-integration
         */
        isAutoIntegrated(worldType) {
            return this.registeredTemplates.has(worldType);
        }
        
        /**
         * Get template metadata
         */
        getTemplateMetadata(worldType) {
            const template = this.registeredTemplates.get(worldType);
            return template ? template.metadata : null;
        }
        
        /**
         * Get all registered templates
         */
        getAllRegisteredTemplates() {
            return Array.from(this.registeredTemplates.values()).map(t => t.metadata);
        }
        
        /**
         * Create template instance
         */
        createTemplate(worldType, THREE, config = {}) {
            const template = this.registeredTemplates.get(worldType);
            if (template) {
                try {
                    return new template.class(THREE, config);
                } catch (error) {
                    console.error(`🔄 Failed to create template ${worldType}:`, error);
                    return null;
                }
            }
            return null;
        }
        
        /**
         * Get debug information
         */
        getDebugInfo() {
            return {
                initialized: this.initialized,
                registeredTemplates: Array.from(this.registeredTemplates.keys()),
                integrationHooks: Array.from(this.integrationHooks.keys()),
                templatesCount: this.registeredTemplates.size
            };
        }
    }
    
    // Create global instance
    window.WorldTemplateAutoIntegration = WorldTemplateAutoIntegration;
    window.worldTemplateAutoIntegration = new WorldTemplateAutoIntegration();
    
    // Initialize immediately - world templates need this ready when they load
    window.worldTemplateAutoIntegration.initialize();
    
    console.log('🔄 WorldTemplateAutoIntegration module loaded and initialized');
    
})();