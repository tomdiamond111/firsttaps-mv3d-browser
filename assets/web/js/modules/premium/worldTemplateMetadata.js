/**
 * WORLD TEMPLATE METADATA STANDARDS
 * Defines standardized metadata structure for world templates
 * Supports inheritance patterns and automatic integration
 */

(function() {
    'use strict';
    
    console.log('📋 Loading WorldTemplateMetadata...');

    /**
     * Standard metadata structure for world templates
     */
    class WorldTemplateMetadata {
        
        /**
         * Create metadata from template class and user config
         */
        static create(templateClass, userConfig = {}) {
            const templateConfig = templateClass.getConfig ? templateClass.getConfig() : {};
            
            return {
                // Core identification
                id: templateConfig.id || userConfig.id || 'unknown',
                displayName: templateConfig.displayName || userConfig.displayName || 'Unknown World',
                description: templateConfig.description || userConfig.description || '',
                version: templateConfig.version || '1.0.0',
                
                // Classification
                category: templateConfig.category || userConfig.category || 'environment',
                tags: templateConfig.tags || userConfig.tags || [],
                
                // Premium settings
                isPremium: templateConfig.isPremium !== false, // Default to premium
                bundle: templateConfig.bundle || userConfig.bundle || 'premium',
                requiredFeatures: templateConfig.requiredFeatures || userConfig.requiredFeatures || [],
                
                // File zone configuration with inheritance
                fileZones: this.createFileZoneConfig(templateConfig, userConfig),
                
                // Integration settings (what should be auto-integrated)
                integration: this.createIntegrationConfig(userConfig),
                
                // Menu configuration
                menu: this.createMenuConfig(templateConfig, userConfig),
                
                // Technical metadata
                technical: this.createTechnicalConfig(templateConfig, userConfig),
                
                // Timestamps
                metadata: {
                    createdAt: Date.now(),
                    version: '1.0.0'
                }
            };
        }
        
        /**
         * Create file zone configuration with inheritance support
         */
        static createFileZoneConfig(templateConfig, userConfig) {
            const fileZoneConfig = userConfig.fileZones || templateConfig.fileZones || {};
            
            return {
                // Inheritance from existing world types
                inherits: fileZoneConfig.inherits || 'green-plane',
                
                // Zone layout type
                type: fileZoneConfig.type || this.inferZoneType(fileZoneConfig.inherits),
                
                // Custom zone modifications
                customizations: fileZoneConfig.customizations || {},
                
                // Zone behavior settings
                behavior: {
                    autoSort: fileZoneConfig.autoSort !== false, // Default true
                    showIndicators: fileZoneConfig.showIndicators !== false, // Default true
                    enforceZones: fileZoneConfig.enforceZones === true // Default false
                }
            };
        }
        
        /**
         * Create integration configuration
         */
        static createIntegrationConfig(userConfig) {
            const integration = userConfig.autoIntegrate || {};
            
            return {
                // Core system integrations
                mainApplication: integration.mainApplication !== false, // Default true
                worldManagement: integration.worldManagement !== false, // Default true
                sortingManager: integration.sortingManager !== false, // Default true
                
                // UI integrations
                flutterMenu: integration.flutterMenu !== false, // Default true
                
                // Advanced integrations
                premiumDetection: integration.premiumDetection !== false, // Default true
                bundleLoading: integration.bundleLoading !== false // Default true
            };
        }
        
        /**
         * Create menu configuration
         */
        static createMenuConfig(templateConfig, userConfig) {
            const menuConfig = userConfig.menu || templateConfig.menu || {};
            
            return {
                icon: templateConfig.menuIcon || userConfig.menuIcon || menuConfig.icon || 'landscape',
                priority: userConfig.menuPriority || menuConfig.priority || 100,
                visible: menuConfig.visible !== false, // Default true
                category: menuConfig.category || 'worlds',
                
                // Display settings
                showBadge: menuConfig.showBadge || false,
                badgeText: menuConfig.badgeText || '',
                
                // Accessibility
                accessibilityLabel: menuConfig.accessibilityLabel || templateConfig.displayName || 'World Template'
            };
        }
        
        /**
         * Create technical configuration
         */
        static createTechnicalConfig(templateConfig, userConfig) {
            return {
                // Template inheritance
                baseTemplate: templateConfig.baseTemplate || userConfig.baseTemplate || 'SimpleWorldTemplate',
                
                // Required dependencies
                dependencies: templateConfig.dependencies || userConfig.dependencies || [],
                
                // Performance hints
                performance: {
                    complexity: templateConfig.complexity || userConfig.complexity || 'medium',
                    memoryUsage: templateConfig.memoryUsage || userConfig.memoryUsage || 'medium',
                    renderingLoad: templateConfig.renderingLoad || userConfig.renderingLoad || 'medium'
                },
                
                // Compatibility
                compatibility: {
                    minVersion: templateConfig.minVersion || '1.0.0',
                    maxVersion: templateConfig.maxVersion || null,
                    platforms: templateConfig.platforms || ['mobile', 'web']
                }
            };
        }
        
        /**
         * Infer zone type from inheritance
         */
        static inferZoneType(inherits) {
            const zoneTypeMap = {
                'green-plane': 'ground-level',
                'ocean': 'surface-and-depth',
                'space': 'full-3d',
                'dazzle': 'ground-level',
                'forest': 'surface-and-depth',
                'cave': 'ground-level',
                'christmas': 'ground-level',
                'desert-oasis': 'ground-level'
            };
            
            return zoneTypeMap[inherits] || 'ground-level';
        }
        
        /**
         * Validate metadata structure
         */
        static validate(metadata) {
            const errors = [];
            
            // Required fields
            if (!metadata.id) errors.push('Missing required field: id');
            if (!metadata.displayName) errors.push('Missing required field: displayName');
            
            // Valid inheritance
            const validInheritance = ['green-plane', 'ocean', 'space', 'dazzle', 'forest', 'cave', 'christmas', 'desert-oasis'];
            if (!validInheritance.includes(metadata.fileZones.inherits)) {
                errors.push(`Invalid fileZones.inherits: ${metadata.fileZones.inherits}`);
            }
            
            // Valid category
            const validCategories = ['environment', 'themed', 'functional', 'experimental'];
            if (!validCategories.includes(metadata.category)) {
                errors.push(`Invalid category: ${metadata.category}`);
            }
            
            return {
                valid: errors.length === 0,
                errors: errors
            };
        }
        
        /**
         * Merge metadata with defaults
         */
        static mergeWithDefaults(metadata) {
            const defaults = {
                version: '1.0.0',
                category: 'environment',
                isPremium: true,
                bundle: 'premium',
                fileZones: {
                    inherits: 'green-plane',
                    type: 'ground-level',
                    customizations: {},
                    behavior: {
                        autoSort: true,
                        showIndicators: true,
                        enforceZones: false
                    }
                }
            };
            
            return this.deepMerge(defaults, metadata);
        }
        
        /**
         * Deep merge utility
         */
        static deepMerge(target, source) {
            const result = { ...target };
            
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
            
            return result;
        }
    }
    
    // Export for global use
    window.WorldTemplateMetadata = WorldTemplateMetadata;
    
    console.log('📋 WorldTemplateMetadata module loaded');
    
})();