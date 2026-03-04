/**
 * SIMPLE WORLD TEMPLATE (Conservative Approach)
 * Provides an easy-to-use base class for creating new world templates
 * WITHOUT modifying existing BaseWorldTemplate or world template functionality
 * 
 * SAFETY GUARANTEE: Uses existing BaseWorldTemplate as foundation, purely additive
 */

(function() {
    'use strict';
    
    console.log('🌟 Loading SimpleWorldTemplate (Conservative)...');

    /**
     * SimpleWorldTemplate - Easy world template creation using configuration
     * Extends existing BaseWorldTemplate without modifying it
     */
    class SimpleWorldTemplate extends BaseWorldTemplate {
        constructor(THREE, simpleConfig = {}) {
            // PRESERVE: Use existing BaseWorldTemplate constructor unchanged
            super(THREE, {
                ambientLightColor: simpleConfig.ambientColor || 0x404040,
                ambientLightIntensity: simpleConfig.ambientIntensity || 0.6,
                directionalLightColor: simpleConfig.directionalColor || 0xffffff,
                directionalLightIntensity: simpleConfig.directionalIntensity || 0.8,
                ...simpleConfig.lighting
            });
            
            this.simpleConfig = simpleConfig;
            this.isSimpleTemplate = true; // Flag for identification by helper systems
            this.trackedObjects = new Set(); // Track our own objects for cleanup
            
            // NEW: Enhanced configuration with menu support
            this.config = {
                id: simpleConfig.id || 'simple-world',
                displayName: simpleConfig.displayName || simpleConfig.id || 'Simple World',
                description: simpleConfig.description || `Experience the ${simpleConfig.displayName || 'Simple World'} environment`,
                menuIcon: simpleConfig.menuIcon || 'landscape',
                isPremium: simpleConfig.isPremium !== false, // Default to premium
                bundle: simpleConfig.bundle || 'premium',
                category: simpleConfig.category || 'environment',
                ...simpleConfig
            };
            
            console.log(`🌟 SimpleWorldTemplate created: ${this.config.id}`);
            console.log(`🌟 Menu config:`, {
                title: this.config.displayName,
                description: this.config.description,
                icon: this.config.menuIcon,
                isPremium: this.config.isPremium
            });
        }
        
        /**
         * CONSERVATIVE: Override minimal methods, preserve BaseWorldTemplate behavior
         */
        getType() {
            return this.config.id;
        }
        
        getDisplayName() {
            return this.config.displayName;
        }
        
        /**
         * NEW: Get configuration for registry helper
         */
        static getConfig() {
            // For the class-level config, we need a default
            return {
                id: 'simple-world',
                displayName: 'Simple World',
                description: 'A simple world template',
                isPremium: true,
                bundle: 'premium'
            };
        }
        
        /**
         * NEW: Get instance configuration
         */
        getConfig() {
            return this.config;
        }
        
        /**
         * Enhanced setupEnvironment that uses configuration
         */
        setupEnvironment() {
            console.log(`🌟 Setting up environment for ${this.getDisplayName()}`);
            
            try {
                // Apply basic environment settings from config
                this.applyEnvironmentConfig();
                
                // Call user-defined setup function if provided
                if (this.simpleConfig.setupFunction) {
                    console.log(`🌟 Calling custom setup function for ${this.getDisplayName()}`);
                    this.simpleConfig.setupFunction.call(this);
                }
                
                // Track objects with cleanup helper if available
                this.integrateWithCleanupHelper();
                
                console.log(`🌟 Environment setup complete for ${this.getDisplayName()}`);
                
            } catch (error) {
                console.error(`🌟 Error setting up ${this.getDisplayName()}:`, error);
                // Fallback to basic environment
                this.createBasicEnvironment();
            }
        }
        
        /**
         * Apply environment configuration from simpleConfig
         */
        applyEnvironmentConfig() {
            const config = this.simpleConfig;
            
            // Apply fog if configured
            if (config.fog && this.scene) {
                this.scene.fog = new this.THREE.Fog(
                    config.fog.color || 0xcccccc,
                    config.fog.near || 100,
                    config.fog.far || 2000
                );
                console.log(`🌟 Applied fog: color=${config.fog.color}, near=${config.fog.near}, far=${config.fog.far}`);
            }
            
            // Apply background color if configured
            if (config.backgroundColor && this.scene) {
                this.scene.background = new this.THREE.Color(config.backgroundColor);
                console.log(`🌟 Applied background color: ${config.backgroundColor}`);
            }
            
            // Create ground plane if configured (Green Plane style by default)
            if (config.groundPlane !== false) {
                this.createGroundPlane(config.groundPlane || {});
            }
        }
        
        /**
         * Create a ground plane (similar to Green Plane world)
         */
        createGroundPlane(planeConfig = {}) {
            try {
                const size = planeConfig.size || 300;
                const color = planeConfig.color || 0x4a9f4a;
                const position = planeConfig.position || { x: 0, y: -0.01, z: 0 };
                
                // Create ground plane geometry and material
                const planeGeometry = new this.THREE.PlaneGeometry(size, size);
                const planeMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: color,
                    transparent: planeConfig.transparent || false,
                    opacity: planeConfig.opacity || 1.0
                });
                
                const plane = new this.THREE.Mesh(planeGeometry, planeMaterial);
                plane.rotation.x = -Math.PI / 2;
                plane.position.set(position.x, position.y, position.z);
                plane.userData.templateObject = true;
                plane.userData.objectType = 'groundPlane';
                
                this.addTrackedObject(plane);
                
                console.log(`🌟 Created ground plane: size=${size}, color=${color}`);
                
            } catch (error) {
                console.error('🌟 Error creating ground plane:', error);
            }
        }
        
        /**
         * Add an object to the scene and track it for cleanup
         */
        addTrackedObject(object, objectType = 'decoration') {
            try {
                // Add to scene
                if (this.scene) {
                    this.scene.add(object);
                }
                
                // Add to BaseWorldTemplate's objects array (preserves existing behavior)
                if (this.objects) {
                    this.objects.push(object);
                }
                
                // Track locally for our cleanup
                this.trackedObjects.add(object);
                
                // Track with cleanup helper if available
                if (window.worldCleanupHelper) {
                    window.worldCleanupHelper.trackObjectForNewTemplate(this, object, objectType);
                }
                
                console.log(`🌟 Added tracked object: ${objectType}`);
                
            } catch (error) {
                console.error('🌟 Error adding tracked object:', error);
            }
        }
        
        /**
         * Integrate with cleanup helper system
         */
        integrateWithCleanupHelper() {
            if (window.worldCleanupHelper && this.objects) {
                this.objects.forEach(obj => {
                    if (!this.trackedObjects.has(obj)) {
                        window.worldCleanupHelper.trackObjectForNewTemplate(this, obj, 'inherited');
                        this.trackedObjects.add(obj);
                    }
                });
            }
        }
        
        /**
         * Create basic fallback environment
         */
        createBasicEnvironment() {
            console.log(`🌟 Creating basic fallback environment for ${this.getDisplayName()}`);
            
            // Just create a simple ground plane
            this.createGroundPlane();
        }
        
        /**
         * Get positioning constraints (Green Plane style by default)
         */
        getPositioningConstraints() {
            const config = this.simpleConfig.constraints || {};
            
            return {
                requiresSupport: config.requiresSupport || false,
                allowedStackingDirections: config.allowedStackingDirections || 
                    ['top', 'bottom', 'front', 'back', 'left', 'right'],
                worldBoundaries: config.worldBoundaries || {
                    x: { min: -150, max: 150 },
                    y: { min: 0, max: 100 },
                    z: { min: -150, max: 150 }
                }
            };
        }
        
        /**
         * Apply position constraints (Green Plane style by default)
         */
        applyPositionConstraints(object, newPosition, allObjects = []) {
            const constraints = this.getPositioningConstraints();
            
            // Clamp to world boundaries
            const constrainedX = Math.max(constraints.worldBoundaries.x.min, 
                                 Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            const constrainedY = Math.max(constraints.worldBoundaries.y.min, 
                                 Math.min(constraints.worldBoundaries.y.max, newPosition.y));
            const constrainedZ = Math.max(constraints.worldBoundaries.z.min, 
                                 Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            return {
                x: constrainedX,
                y: constrainedY,
                z: constrainedZ
            };
        }
        
        /**
         * Get home view position
         */
        getHomeViewPosition() {
            const config = this.simpleConfig.homeView || {};
            return {
                x: config.x || 0,
                y: config.y || 30,
                z: config.z || 60
            };
        }
        
        /**
         * Get home view target
         */
        getHomeViewTarget() {
            const config = this.simpleConfig.homeViewTarget || {};
            return {
                x: config.x || 0,
                y: config.y || 0,
                z: config.z || 0
            };
        }
        
        /**
         * Apply camera constraints
         */
        applyCameraConstraints(controls) {
            const config = this.simpleConfig.camera || {};
            
            controls.minDistance = config.minDistance || 1.0;
            controls.maxDistance = config.maxDistance || 100.0;
            
            if (config.enablePan !== undefined) {
                controls.enablePan = config.enablePan;
            }
            if (config.enableZoom !== undefined) {
                controls.enableZoom = config.enableZoom;
            }
            if (config.enableRotate !== undefined) {
                controls.enableRotate = config.enableRotate;
            }
        }
        
        /**
         * CONSERVATIVE: Clean up our tracked objects first, then call parent
         */
        cleanup() {
            console.log(`🧹 Cleaning up SimpleWorldTemplate: ${this.getDisplayName()}`);
            
            try {
                // Clean up with helper first
                if (window.worldCleanupHelper) {
                    window.worldCleanupHelper.cleanupNewTemplateObjects(this);
                }
                
                // Clear our local tracking
                this.trackedObjects.clear();
                
                // Reset scene properties we may have modified
                if (this.scene) {
                    // Only reset if we actually set these
                    if (this.simpleConfig.fog) {
                        this.scene.fog = null;
                    }
                    if (this.simpleConfig.backgroundColor) {
                        this.scene.background = null;
                    }
                }
                
                console.log(`🧹 SimpleWorldTemplate cleanup complete for ${this.getDisplayName()}`);
                
            } catch (error) {
                console.error(`🧹 Error during SimpleWorldTemplate cleanup:`, error);
            }
            
            // PRESERVE: Always call parent cleanup to maintain existing behavior
            super.cleanup();
        }
        
        /**
         * Static method to get configuration (required by registry)
         */
        static getConfig() {
            return this.configData || {
                id: 'simple-world',
                displayName: 'Simple World',
                isPremium: false,
                bundle: 'core'
            };
        }
        
        /**
         * Static factory method to create a template class from configuration
         */
        static createFromConfig(config) {
            const TemplateClass = class extends SimpleWorldTemplate {
                constructor(THREE, sceneConfig = {}) {
                    super(THREE, {...config, ...sceneConfig});
                }
                
                static getConfig() {
                    return config;
                }
            };
            
            // Store config for static access
            TemplateClass.configData = config;
            
            return TemplateClass;
        }
        
        /**
         * Helper method to validate configuration
         */
        static validateConfig(config) {
            const required = ['id', 'displayName'];
            const missing = required.filter(field => !config[field]);
            
            if (missing.length > 0) {
                throw new Error(`Missing required config fields: ${missing.join(', ')}`);
            }
            
            // Validate ID format
            if (!/^[a-z][a-z0-9-]*$/.test(config.id)) {
                throw new Error('Config ID must be lowercase, start with letter, and contain only letters, numbers, and hyphens');
            }
            
            return true;
        }
    }
    
    // Export to global scope
    window.SimpleWorldTemplate = SimpleWorldTemplate;
    
    console.log('🌟 SimpleWorldTemplate loaded successfully!');
    console.log('🌟 Use SimpleWorldTemplate.createFromConfig(config) to create new world templates');
    
})();