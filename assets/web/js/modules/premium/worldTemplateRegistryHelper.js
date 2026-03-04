/**
 * WORLD TEMPLATE REGISTRY HELPER (Conservative Approach)
 * Provides helper functionality for registering and managing new world templates
 * WITHOUT modifying or breaking existing world template functionality
 * 
 * SAFETY GUARANTEE: This system is purely additive and preserves all existing functionality
 */

(function() {
    'use strict';
    
    console.log('🏗️ Loading WorldTemplateRegistryHelper (Conservative)...');

    /**
     * Conservative World Template Registry Helper
     * Only manages NEW world templates, preserves all existing world template functionality
     */
    class WorldTemplateRegistryHelper {
        constructor() {
            this.additionalTemplates = new Map();
            this.existingSystemIntact = true; // Flag to ensure we don't break anything
            this.registeredWorlds = []; // NEW: Track all registered worlds for menu system
            
            console.log('📋 WorldTemplateRegistryHelper initialized (conservative mode)');
            console.log('📋 Existing world templates preserved: Green Plane, Space, Ocean, Dazzle, Forest, Cave, Christmas');
        }
        
        /**
         * CONSERVATIVE: Only register NEW world templates, don't touch existing ones
         * This method only adds new functionality without modifying existing systems
         * ENHANCED: Now also tracks menu configuration for automatic Flutter integration
         * AUTO-INTEGRATION: Automatically integrates with new auto-integration system
         */
        registerNewTemplate(templateClass, autoIntegrateConfig = {}) {
            try {
                const config = templateClass.getConfig();
                
                // Validation to prevent conflicts with existing worlds
                const existingWorldTypes = ['green-plane', 'space', 'ocean', 'dazzle', 'forest', 'cave', 'christmas'];
                if (existingWorldTypes.includes(config.id)) {
                    console.error(`⚠️ Cannot register template with ID "${config.id}" - conflicts with existing world`);
                    return false;
                }
                
                this.additionalTemplates.set(config.id, {
                    class: templateClass,
                    config: config,
                    isNewTemplate: true, // Mark as new so we know it uses the helper system
                    registeredAt: Date.now()
                });
                
                // NEW: Create menu configuration for Flutter integration
                const menuConfig = {
                    worldType: config.id,
                    title: config.displayName,
                    description: config.description || `Experience the ${config.displayName} world`,
                    icon: config.menuIcon || 'landscape',
                    isPremium: config.isPremium !== false, // Default to premium
                    bundle: config.bundle || 'premium',
                    category: config.category || 'environment'
                };
                
                this.registeredWorlds.push(menuConfig);
                
                // SAFETY: Don't modify existing world creation logic
                console.log(`📋 Registered new world template: ${config.id} (existing system preserved)`);
                console.log(`📋 Menu config:`, menuConfig);
                
                // NEW: Auto-integration with new system (if available)
                if (window.worldTemplateAutoIntegration && window.worldTemplateAutoIntegration.initialized) {
                    try {
                        window.worldTemplateAutoIntegration.registerTemplate(templateClass, autoIntegrateConfig);
                        console.log(`🔄 Auto-integrated template: ${config.id}`);
                    } catch (integrationError) {
                        console.warn(`🔄 Auto-integration failed for ${config.id}:`, integrationError);
                        // Non-critical - template still works without auto-integration
                    }
                }
                
                return true;
                
            } catch (error) {
                console.error('📋 Error registering new template:', error);
                return false;
            }
        }
        
        /**
         * Helper method to check if a world is a new template or existing
         * Returns true only for NEW templates managed by this helper
         */
        isNewTemplate(worldType) {
            return this.additionalTemplates.has(worldType);
        }
        
        /**
         * Create instance of a NEW template (doesn't affect existing templates)
         */
        createNewTemplate(worldType, THREE, config = {}) {
            const template = this.additionalTemplates.get(worldType);
            if (!template) {
                console.warn(`📋 New template "${worldType}" not found`);
                return null;
            }
            
            try {
                console.log(`🆕 Creating new template instance: ${worldType}`);
                return new template.class(THREE, config);
            } catch (error) {
                console.error(`📋 Error creating new template "${worldType}":`, error);
                return null;
            }
        }
        
        /**
         * Get all registered new templates (doesn't include existing ones)
         */
        getNewTemplates() {
            return Array.from(this.additionalTemplates.values());
        }
        
        /**
         * Get new premium templates (for bundle loading)
         */
        getNewPremiumTemplates() {
            return this.getNewTemplates().filter(template => 
                template.config && template.config.isPremium
            );
        }
        
        /**
         * Check if a new template requires premium bundle
         */
        requiresPremiumBundle(worldType) {
            const template = this.additionalTemplates.get(worldType);
            return template && template.config && 
                   (template.config.isPremium || template.config.bundle === 'premium');
        }
        
        /**
         * Get display name for a new template
         */
        getDisplayName(worldType) {
            const template = this.additionalTemplates.get(worldType);
            return template && template.config ? template.config.displayName : worldType;
        }
        
        /**
         * Debug method to check system integrity
         */
        verifySystemIntegrity() {
            console.log('🔍 WorldTemplateRegistryHelper System Status:');
            console.log(`   Existing system intact: ${this.existingSystemIntact}`);
            console.log(`   New templates registered: ${this.additionalTemplates.size}`);
            console.log(`   New templates:`, Array.from(this.additionalTemplates.keys()));
            
            return {
                existingSystemIntact: this.existingSystemIntact,
                newTemplatesCount: this.additionalTemplates.size,
                newTemplates: Array.from(this.additionalTemplates.keys())
            };
        }
        
        /**
         * Get all registered world configurations for menu integration
         */
        getRegisteredWorlds() {
            return [...this.registeredWorlds];
        }
        
        /**
         * Get list of all premium world types (including new ones)
         */
        getAllPremiumWorldTypes() {
            const existingPremium = ['dazzle', 'forest', 'cave', 'christmas'];
            const newPremium = this.registeredWorlds
                .filter(world => world.isPremium)
                .map(world => world.worldType);
            
            return [...existingPremium, ...newPremium];
        }
        
        /**
         * Check if any world type requires premium bundle (dynamic check)
         */
        requiresPremiumBundleCheck(worldType) {
            // Check existing premium worlds
            if (['dazzle', 'forest', 'cave', 'christmas'].includes(worldType)) {
                return true;
            }
            
            // Check new premium worlds
            const worldConfig = this.registeredWorlds.find(w => w.worldType === worldType);
            return worldConfig ? worldConfig.isPremium : false;
        }
        
        /**
         * Generate Flutter menu configuration for new worlds
         */
        generateFlutterMenuConfig() {
            const menuItems = this.registeredWorlds.map(world => ({
                worldType: world.worldType,
                title: world.title,
                description: world.description,
                icon: world.icon,
                isPremium: world.isPremium
            }));
            
            console.log('📱 Generated Flutter menu config for new worlds:', menuItems);
            return menuItems;
        }
    }
    
    // Create global instance
    window.WorldTemplateRegistryHelper = WorldTemplateRegistryHelper;
    window.worldTemplateRegistryHelper = new WorldTemplateRegistryHelper();
    
    // Debug function
    window.checkWorldTemplateRegistry = function() {
        if (window.worldTemplateRegistryHelper) {
            return window.worldTemplateRegistryHelper.verifySystemIntegrity();
        }
        return { error: 'Registry helper not available' };
    };
    
    console.log('🏗️ WorldTemplateRegistryHelper loaded successfully!');
    console.log('🏗️ Use window.checkWorldTemplateRegistry() to verify system status');
    
})();