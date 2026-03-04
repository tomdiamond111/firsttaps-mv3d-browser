/**
 * DESERT OASIS WORLD TEMPLATE (Premium)
 * A premium world template featuring a desert environment with oasis elements
 * Uses Green Plane-style movement constraints and SimpleWorldTemplate framework
 * 
 * Features:
 * - Sandy ground plane with desert colors
 * - Palm trees around oasis
 * - Water feature in center
 * - Desert rocks and dunes
 * - Warm desert lighting
 * - Cactus decorations
 */

(function() {
    'use strict';
    
    console.log('🏜️ Loading Desert Oasis World Template...');

    /**
     * Desert Oasis World Template Configuration
     */
    const DesertOasisConfig = {
        id: 'desert-oasis',
        displayName: 'Desert Oasis',
        description: 'Sandy desert with palm trees and oasis water',
        menuIcon: 'landscape', // Flutter icon for menu
        isPremium: true,
        bundle: 'premium',
        category: 'environment',
        
        // Auto-integration configuration
        fileZones: {
            inherits: 'green-plane', // Use Green Plane-style file zones
            type: 'ground-level',
            customizations: {
                // Could add desert-specific zone customizations here
            }
        },
        
        // Technical metadata
        baseTemplate: 'SimpleWorldTemplate',
        complexity: 'medium',
        memoryUsage: 'medium',
        renderingLoad: 'medium',
        
        // Desert lighting - warm and bright
        lighting: {
            ambientLightColor: 0x8B7355,    // Warm sandy ambient
            ambientLightIntensity: 0.7,
            directionalLightColor: 0xFFF8DC, // Warm desert sun
            directionalLightIntensity: 0.9
        },
        
        // Desert atmosphere
        fog: {
            color: 0xD2B48C,  // Sandy/tan fog
            near: 150,
            far: 300
        },
        
        backgroundColor: 0x87CEEB, // Sky blue background
        
        // Ground plane configuration (desert sand)
        groundPlane: {
            size: 300,
            color: 0xC2B280,  // Sandy desert color
            position: { x: 0, y: -0.01, z: 0 }
        },
        
        // Movement constraints (Green Plane style)
        constraints: {
            requiresSupport: true,  // Objects must sit on ground or other objects (like Green Plane)
            allowedStackingDirections: ['top'], // Only stack on top (like Green Plane)
            worldBoundaries: {
                x: { min: -150, max: 150 },
                y: { min: 0, max: 150 },  // Ground level at 0, reasonable stacking limit
                z: { min: -150, max: 150 }
            }
        },
        
        // Camera settings
        camera: {
            minDistance: 1.0,
            maxDistance: 120.0,
            enablePan: true,
            enableZoom: true,
            enableRotate: true
        },
        
        // Home view (match green plane camera settings)
        homeView: {
            x: 0,
            y: 1,      // Landscape default
            z: -13
        },
        
        homeViewTarget: {
            x: 0,
            y: 5,
            z: -15
        },
        
        // Custom setup function
        setupFunction: function() {
            console.log('🏜️ Setting up Desert Oasis environment...');
            
            try {
                // Create the main oasis feature
                this.createOasisCenter();
                
                // Create palm trees around the oasis
                this.createPalmTrees();
                
                // Create desert rocks and features
                this.createDesertRocks();
                
                // Create cacti scattered around
                this.createCacti();
                
                // Create sand dunes
                this.createSandDunes();
                
                // Create desert decorations
                this.createDesertDecorations();
                
                console.log('🏜️ Desert Oasis environment setup complete');
                
            } catch (error) {
                console.error('🏜️ Error setting up Desert Oasis:', error);
                // Fallback to basic environment
                this.createBasicDesert();
            }
        }
    };

    /**
     * Desert Oasis World Template Class
     * Extends SimpleWorldTemplate with desert-specific functionality
     */
    const DesertOasisWorldTemplate = SimpleWorldTemplate.createFromConfig(DesertOasisConfig);
    
    // Add desert-specific methods to the prototype
    DesertOasisWorldTemplate.prototype.createOasisCenter = function() {
        try {
            // Create water feature in center
            const waterGeometry = new this.THREE.CircleGeometry(8, 32);
            const waterMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x006994,  // Oasis water blue
                transparent: true,
                opacity: 0.8
            });
            
            const water = new this.THREE.Mesh(waterGeometry, waterMaterial);
            water.rotation.x = -Math.PI / 2;
            water.position.set(0, 0, 0);
            water.userData.templateObject = true;
            
            this.addTrackedObject(water, 'oasisWater');
            
            // Create water ripple effect (simple animated scaling)
            const rippleGeometry = new this.THREE.RingGeometry(8, 10, 32);
            const rippleMaterial = new this.THREE.MeshBasicMaterial({ 
                color: 0x4682B4,
                transparent: true,
                opacity: 0.3
            });
            
            const ripple = new this.THREE.Mesh(rippleGeometry, rippleMaterial);
            ripple.rotation.x = -Math.PI / 2;
            ripple.position.set(0, 0.01, 0);
            ripple.userData.templateObject = true;
            ripple.userData.isRipple = true;
            
            this.addTrackedObject(ripple, 'waterRipple');
            
            console.log('🏜️ Created oasis water feature');
            
        } catch (error) {
            console.error('🏜️ Error creating oasis center:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createPalmTrees = function() {
        try {
            const palmPositions = [
                { x: 12, z: 12 },
                { x: -12, z: 12 },
                { x: 12, z: -12 },
                { x: -12, z: -12 },
                { x: 15, z: 0 },
                { x: -15, z: 0 },
                { x: 0, z: 15 },
                { x: 0, z: -15 }
            ];
            
            palmPositions.forEach((pos, index) => {
                this.createPalmTree(pos.x, pos.z, index);
            });
            
            console.log(`🏜️ Created ${palmPositions.length} palm trees`);
            
        } catch (error) {
            console.error('🏜️ Error creating palm trees:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createPalmTree = function(x, z, index) {
        try {
            // Create palm tree trunk
            const trunkGeometry = new this.THREE.CylinderGeometry(0.5, 0.8, 8, 8);
            const trunkMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown trunk
            
            const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(x, 4, z);
            trunk.userData.templateObject = true;
            
            this.addTrackedObject(trunk, 'palmTrunk');
            
            // Create palm fronds (simplified)
            for (let i = 0; i < 6; i++) {
                const frondGeometry = new this.THREE.PlaneGeometry(6, 2);
                const frondMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x228B22,  // Palm green
                    side: this.THREE.DoubleSide
                });
                
                const frond = new this.THREE.Mesh(frondGeometry, frondMaterial);
                frond.position.set(x, 8, z);
                frond.rotation.y = (i / 6) * Math.PI * 2;
                frond.rotation.z = Math.PI / 8; // Slight droop
                frond.userData.templateObject = true;
                
                this.addTrackedObject(frond, 'palmFrond');
            }
            
        } catch (error) {
            console.error('🏜️ Error creating palm tree:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createDesertRocks = function() {
        try {
            const rockPositions = [
                { x: 25, z: 20, scale: 1.2 },
                { x: -30, z: 25, scale: 0.8 },
                { x: 35, z: -15, scale: 1.0 },
                { x: -25, z: -30, scale: 1.5 },
                { x: 40, z: 10, scale: 0.9 },
                { x: -20, z: 35, scale: 1.1 }
            ];
            
            rockPositions.forEach((pos, index) => {
                this.createDesertRock(pos.x, pos.z, pos.scale, index);
            });
            
            console.log(`🏜️ Created ${rockPositions.length} desert rocks`);
            
        } catch (error) {
            console.error('🏜️ Error creating desert rocks:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createDesertRock = function(x, z, scale, index) {
        try {
            // Create irregular rock shape
            const rockGeometry = new this.THREE.DodecahedronGeometry(2 * scale, 0);
            const rockMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x8B7D6B  // Desert rock color
            });
            
            const rock = new this.THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(x, 1 * scale, z);
            rock.rotation.y = Math.random() * Math.PI * 2;
            rock.scale.set(
                0.8 + Math.random() * 0.4,
                0.5 + Math.random() * 0.5,
                0.8 + Math.random() * 0.4
            );
            rock.userData.templateObject = true;
            
            this.addTrackedObject(rock, 'desertRock');
            
        } catch (error) {
            console.error('🏜️ Error creating desert rock:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createCacti = function() {
        try {
            const cactusPositions = [
                { x: 50, z: 30 },
                { x: -45, z: 40 },
                { x: 60, z: -20 },
                { x: -55, z: -35 },
                { x: 45, z: 50 },
                { x: -40, z: -45 },
                { x: 55, z: 0 },
                { x: -50, z: 15 }
            ];
            
            cactusPositions.forEach((pos, index) => {
                this.createCactus(pos.x, pos.z, index);
            });
            
            console.log(`🏜️ Created ${cactusPositions.length} cacti`);
            
        } catch (error) {
            console.error('🏜️ Error creating cacti:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createCactus = function(x, z, index) {
        try {
            // Create main cactus body
            const cactusGeometry = new this.THREE.CylinderGeometry(1, 1.2, 4, 8);
            const cactusMaterial = new this.THREE.MeshLambertMaterial({ color: 0x355E3B }); // Cactus green
            
            const cactus = new this.THREE.Mesh(cactusGeometry, cactusMaterial);
            cactus.position.set(x, 2, z);
            cactus.userData.templateObject = true;
            
            this.addTrackedObject(cactus, 'cactus');
            
            // Add cactus arms (sometimes)
            if (Math.random() > 0.5) {
                const armGeometry = new this.THREE.CylinderGeometry(0.6, 0.7, 2, 6);
                const arm = new this.THREE.Mesh(armGeometry, cactusMaterial);
                arm.position.set(x + 1.5, 3, z);
                arm.rotation.z = Math.PI / 6;
                arm.userData.templateObject = true;
                
                this.addTrackedObject(arm, 'cactusArm');
            }
            
        } catch (error) {
            console.error('🏜️ Error creating cactus:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createSandDunes = function() {
        try {
            const dunePositions = [
                { x: 80, z: 60, width: 20, height: 3 },
                { x: -70, z: 80, width: 25, height: 4 },
                { x: 90, z: -50, width: 18, height: 2.5 },
                { x: -85, z: -70, width: 22, height: 3.5 }
            ];
            
            dunePositions.forEach((pos, index) => {
                this.createSandDune(pos.x, pos.z, pos.width, pos.height, index);
            });
            
            console.log(`🏜️ Created ${dunePositions.length} sand dunes`);
            
        } catch (error) {
            console.error('🏜️ Error creating sand dunes:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createSandDune = function(x, z, width, height, index) {
        try {
            // Create sand dune as a flattened sphere
            const duneGeometry = new this.THREE.SphereGeometry(width, 16, 8);
            const duneMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0xDDD7A0  // Light sandy color
            });
            
            const dune = new this.THREE.Mesh(duneGeometry, duneMaterial);
            dune.position.set(x, height / 2, z);
            dune.scale.set(1, height / width, 1); // Flatten it
            dune.userData.templateObject = true;
            
            this.addTrackedObject(dune, 'sandDune');
            
        } catch (error) {
            console.error('🏜️ Error creating sand dune:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createDesertDecorations = function() {
        try {
            // Add some scattered desert plants
            for (let i = 0; i < 15; i++) {
                const x = (Math.random() - 0.5) * 200;
                const z = (Math.random() - 0.5) * 200;
                
                // Skip if too close to oasis center
                if (Math.sqrt(x * x + z * z) < 20) continue;
                
                this.createDesertPlant(x, z, i);
            }
            
            console.log('🏜️ Created desert decorations');
            
        } catch (error) {
            console.error('🏜️ Error creating desert decorations:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createDesertPlant = function(x, z, index) {
        try {
            // Create small desert shrub
            const plantGeometry = new this.THREE.SphereGeometry(0.5, 8, 6);
            const plantMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x6B8E23  // Olive drab
            });
            
            const plant = new this.THREE.Mesh(plantGeometry, plantMaterial);
            plant.position.set(x, 0.3, z);
            plant.scale.set(
                0.5 + Math.random() * 0.5,
                0.3 + Math.random() * 0.4,
                0.5 + Math.random() * 0.5
            );
            plant.userData.templateObject = true;
            
            this.addTrackedObject(plant, 'desertPlant');
            
        } catch (error) {
            console.error('🏜️ Error creating desert plant:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createBasicDesert = function() {
        console.log('🏜️ Creating basic desert fallback environment');
        
        try {
            // Just create a simple water circle and a few basic objects
            const waterGeometry = new this.THREE.CircleGeometry(6, 16);
            const waterMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x006994,
                transparent: true,
                opacity: 0.8
            });
            
            const water = new this.THREE.Mesh(waterGeometry, waterMaterial);
            water.rotation.x = -Math.PI / 2;
            water.position.set(0, 0, 0);
            water.userData.templateObject = true;
            
            this.addTrackedObject(water, 'basicWater');
            
        } catch (error) {
            console.error('🏜️ Error creating basic desert:', error);
        }
    };
    
    // Add static getConfig method for registry helper
    DesertOasisWorldTemplate.getConfig = function() {
        return DesertOasisConfig;
    };
    
// Override getType to ensure proper identification
DesertOasisWorldTemplate.prototype.getType = function() {
    return 'desert-oasis';
};

DesertOasisWorldTemplate.prototype.getDisplayName = function() {
    return 'Desert Oasis';
};

// Override positioning constraints to implement Green Plane-style behavior
DesertOasisWorldTemplate.prototype.applyPositionConstraints = function(object, newPosition, allObjects = []) {
    const constraints = this.getPositioningConstraints();
    
    // Apply world boundaries first
    let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
    let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
    
    // Get object height for proper positioning - check userData first (for contact objects), then geometry parameters
    const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
    
    // Define ground level (same as Green Plane)
    const groundLevelY = 0;
    
    // Check if stacking is enabled and this position is intentional
    const stackingEnabled = window.app?.sortingManager?.stackingConfig?.enabled;
    const isStackedPosition = newPosition.y > (groundLevelY + objectHeight / 2 + 0.1); // More than ground level + small tolerance
    
    let constrainedY;
    if (stackingEnabled && isStackedPosition) {
        // If stacking is enabled and this seems to be a stacked position, respect the Y coordinate
        constrainedY = newPosition.y;
        console.log(`Desert Oasis constraints for ${object.userData.fileName || 'unknown'}:`);
        console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
        console.log(`  Ground level Y: ${groundLevelY}`);
        console.log(`  Object height: ${objectHeight}`);
        console.log(`  Stacking enabled - respecting Y position: ${constrainedY}`);
    } else {
        // Normal ground positioning logic (same as Green Plane)
        constrainedY = groundLevelY + objectHeight / 2; // Position so object bottom sits on ground
        
        console.log(`Desert Oasis constraints for ${object.userData.fileName || 'unknown'}:`);
        console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
        console.log(`  Ground level Y: ${groundLevelY}`);
        console.log(`  Object height: ${objectHeight}`);
        console.log(`  Base constrained Y: ${constrainedY}`);
    }
    
    // DESERT OASIS WORLD: Objects must be supported - check for objects below (same logic as Green Plane)
    if (constraints.requiresSupport && allObjects.length > 0 && !(stackingEnabled && isStackedPosition)) {
        // Only apply support logic if not using stacking system
        const otherObjects = allObjects.filter(obj => obj !== object);
        let supportObject = null;
        let maxSupportHeight = groundLevelY + objectHeight / 2; // Ground level + object center height
        
        // Find the highest object that can support this object at the constrained position
        for (const otherObj of otherObjects) {
            // Get dimensions for support object - check userData first (for contact objects), then geometry parameters
            const otherWidth = otherObj.userData?.objectWidth || otherObj.geometry?.parameters?.width || (otherObj.geometry?.parameters?.radius * 2) || 1;
            const otherDepth = otherObj.userData?.objectDepth || otherObj.geometry?.parameters?.depth || (otherObj.geometry?.parameters?.radius * 2) || 1;
            const otherHeight = otherObj.userData?.objectHeight || otherObj.geometry?.parameters?.height || 1;
            
            const otherHalfWidth = otherWidth / 2;
            const otherHalfDepth = otherDepth / 2;
            
            // Check if the object is close enough to provide support
            if (Math.abs(constrainedX - otherObj.position.x) < otherHalfWidth && 
                Math.abs(constrainedZ - otherObj.position.z) < otherHalfDepth) {
                // Calculate support height: top of supporting object + half height of object being placed
                const supportHeight = otherObj.position.y + otherHeight / 2 + objectHeight / 2;
                
                if (supportHeight > maxSupportHeight) {
                    maxSupportHeight = supportHeight;
                    supportObject = otherObj;
                }
            }
        }
        
        // If we found a supporting object, only adjust Y (height) but preserve intended X,Z position
        if (supportObject) {
            // DON'T snap X,Z to supporting object - preserve user's intended position
            // Only adjust Y to place on top of supporting object
            constrainedY = maxSupportHeight;
            console.log(`  Found support object: ${supportObject.userData.fileName || 'unknown'} at Y=${supportObject.position.y}`);
            console.log(`  Preserving user position (${constrainedX}, ${constrainedZ}), adjusting Y to: ${constrainedY}`);
        } else {
            // No support found, place on ground (already set above)
            constrainedY = groundLevelY + objectHeight / 2;
            console.log(`  No support found, placing on ground at Y=${constrainedY}`);
        }
    }
    
    const result = {
        x: constrainedX,
        y: constrainedY,
        z: constrainedZ
    };
    
    console.log(`  Final constrained position: (${result.x}, ${result.y}, ${result.z})`);
    return result;
};    // Add animation support for water ripples
    DesertOasisWorldTemplate.prototype.animate = function(time) {
        if (this.scene) {
            // Animate water ripples
            this.scene.traverse(child => {
                if (child.userData && child.userData.isRipple) {
                    child.rotation.z = time * 0.0005;
                    const scale = 1 + Math.sin(time * 0.002) * 0.1;
                    child.scale.set(scale, 1, scale);
                }
            });
        }
    };
    
    // Make available globally
    window.DesertOasisWorldTemplate = DesertOasisWorldTemplate;
    
    // Auto-register with the helper system and new auto-integration
    if (window.worldTemplateRegistryHelper) {
        // Enhanced registration with auto-integration configuration
        const autoIntegrateConfig = {
            fileZones: {
                inherits: 'green-plane',
                type: 'ground-level'
            },
            autoIntegrate: {
                mainApplication: true,
                worldManagement: true,
                sortingManager: true,
                flutterMenu: true
            },
            menu: {
                icon: 'landscape',
                priority: 90, // Higher priority for premium worlds
                visible: true
            }
        };
        
        window.worldTemplateRegistryHelper.registerNewTemplate(DesertOasisWorldTemplate, autoIntegrateConfig);
        console.log('🏜️ Desert Oasis registered with enhanced auto-integration');
    } else {
        console.warn('🏜️ WorldTemplateRegistryHelper not available - registration deferred');
        
        // Fallback: Try to register when helper becomes available
        const registerWhenReady = () => {
            if (window.worldTemplateRegistryHelper) {
                window.worldTemplateRegistryHelper.registerNewTemplate(DesertOasisWorldTemplate);
                console.log('🏜️ Desert Oasis registered (deferred)');
            } else {
                setTimeout(registerWhenReady, 100);
            }
        };
        setTimeout(registerWhenReady, 100);
    }
    
    console.log('🏜️ Desert Oasis World Template loaded successfully!');
    
})();