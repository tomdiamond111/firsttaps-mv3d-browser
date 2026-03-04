// modules/worlds/worldTemplates.js
// Dependencies: THREE (global)
// Exports: window.BaseWorldTemplate, window.GreenPlaneWorldTemplate, window.SpaceWorldTemplate, window.OceanWorldTemplate

(function() {
    'use strict';
    
    console.log("Loading WorldTemplates module...");
    
    // ============================================================================
    // BASE WORLD TEMPLATE
    // ============================================================================
    class BaseWorldTemplate {
        constructor(THREE, config = {}) {
            this.THREE = THREE;
            this.config = config;
            this.objects = [];
            this.isActive = false;
            this.skyBoxUrls = config.skyBoxUrls || [];
            this.ambientLightColor = config.ambientLightColor || 0x404040;
            this.ambientLightIntensity = config.ambientLightIntensity || 0.6;
            this.directionalLightColor = config.directionalLightColor || 0xffffff;
            this.directionalLightIntensity = config.directionalLightIntensity || 0.8;
        }

        initialize(scene) {
            this.scene = scene;
            this.setupLighting();
            this.setupSkybox();
            this.setupEnvironment();
            this.isActive = true;
            console.log(`${this.constructor.name} initialized`);
        }

        setupLighting() {
            // Remove existing lights
            const lightsToRemove = [];
            this.scene.traverse((child) => {
                if (child.isLight && child.userData.templateLight) {
                    lightsToRemove.push(child);
                }
            });
            lightsToRemove.forEach(light => this.scene.remove(light));

            // Add ambient light
            const ambientLight = new this.THREE.AmbientLight(this.ambientLightColor, this.ambientLightIntensity);
            ambientLight.userData.templateLight = true;
            this.scene.add(ambientLight);
            this.objects.push(ambientLight);

            // Add directional light
            const directionalLight = new this.THREE.DirectionalLight(this.directionalLightColor, this.directionalLightIntensity);
            directionalLight.position.set(1, 1, 1).normalize();
            directionalLight.userData.templateLight = true;
            this.scene.add(directionalLight);
            this.objects.push(directionalLight);
        }

        setupSkybox() {
            // Remove existing skybox
            if (this.scene.background) {
                this.scene.background = null;
            }
            
            if (this.skyBoxUrls && this.skyBoxUrls.length === 6) {
                const loader = new this.THREE.CubeTextureLoader();
                const texture = loader.load(this.skyBoxUrls);
                this.scene.background = texture;
            }
        }

        setupEnvironment() {
            // Override in subclasses
        }

        cleanup() {
            // Remove all template objects
            this.objects.forEach(obj => {
                if (obj.parent) {
                    obj.parent.remove(obj);
                }
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(mat => mat.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
            this.objects = [];
            
            // Remove skybox
            if (this.scene && this.scene.background) {
                this.scene.background = null;
            }
            
            this.isActive = false;
            console.log(`${this.constructor.name} cleaned up`);
        }

        getType() {
            return 'base';
        }

        // Override in subclasses to define world-specific home view
        getHomeViewPosition() {
            return { x: 0, y: 10, z: 25 }; // Camera behind everything
        }

        // Override in subclasses to define world-specific target
        getHomeViewTarget() {
            return { x: 0, y: 0, z: 10 }; // Look at staging area (in front of home)
        }

        // Override in subclasses to define world-specific camera constraints
        applyCameraConstraints(controls) {
            controls.minDistance = 1.0;
            controls.maxDistance = 100.0;
        }

        // Override in subclasses to define positioning constraints
        getPositioningConstraints() {
            return {
                requiresSupport: false,
                allowedStackingDirections: ['top', 'bottom', 'front', 'back', 'left', 'right'],
                worldBoundaries: {
                    x: { min: -100, max: 100 },
                    y: { min: -100, max: 100 },
                    z: { min: -100, max: 100 }
                }
            };
        }

        // Override in subclasses to define world-specific position restrictions
        restrictCameraPosition(camera, cameraControls) {
            // Default: No restrictions
        }

        applyGravityWithFurnitureSupport(object, newPosition, allObjects, groundLevelY) {
            // CRITICAL: Skip constraint system for furniture/path-snapped objects
            if (object.userData?.preservePosition) {
                console.log(`  ⚡ PRESERVE POSITION: Skipping constraints for ${object.userData.fileName || 'unknown'} (furniture/path snap)`);
                return { x: newPosition.x, y: newPosition.y, z: newPosition.z };
            }
            
            if (object.userData?.isFurniture) {
                console.log(`  ⚡ FURNITURE DRAG: Skipping constraints for ${object.userData.fileName || 'unknown'}`);
                return { x: newPosition.x, y: newPosition.y, z: newPosition.z };
            }
            
            const constraints = this.getPositioningConstraints();
            
            // Apply world boundaries
            let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
            
            // Check if transitioning from non-gravity world
            const comingFromNonGravityWorld = object.userData?.isEnteringStackingFromOcean === true || 
                                             object.userData?.isEnteringStackingFromSpace === true;
            
            const stackingEnabled = window.app?.sortingManager?.stackingConfig?.enabled;
            const isStackedPosition = newPosition.y > (groundLevelY + objectHeight / 2 + 0.1);
            
            let constrainedY;
            if ((stackingEnabled && isStackedPosition) || comingFromNonGravityWorld) {
                constrainedY = newPosition.y;
            } else {
                constrainedY = groundLevelY + objectHeight / 2;
            }
            
            // Check for furniture marker support
            if (constraints.requiresSupport && allObjects.length > 0 && 
                !(stackingEnabled && isStackedPosition) && !comingFromNonGravityWorld) {
                
                console.log(`🎯 [MARKER DEBUG] Checking furniture support for object at (${constrainedX.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${constrainedZ.toFixed(2)})`);
                
                const otherObjects = allObjects.filter(obj => obj !== object);
                let maxSupportHeight = groundLevelY + objectHeight / 2;
                let supportObject = null;
                let markerCount = 0;
                
                for (const otherObj of otherObjects) {
                    if (otherObj.userData?.isSlotMarker) {
                        markerCount++;
                    }
                    
                    const otherWidth = otherObj.userData?.objectWidth || otherObj.geometry?.parameters?.width || (otherObj.geometry?.parameters?.radius * 2) || 1;
                    const otherDepth = otherObj.userData?.objectDepth || otherObj.geometry?.parameters?.depth || (otherObj.geometry?.parameters?.radius * 2) || 1;
                    const otherHeight = otherObj.userData?.objectHeight || otherObj.geometry?.parameters?.height || 1;
                    
                    const otherHalfWidth = otherWidth / 2;
                    const otherHalfDepth = otherDepth / 2;
                    
                    // Get world position for markers
                    let otherX, otherY, otherZ;
                    if (otherObj.userData?.isSlotMarker && otherObj.parent) {
                        const worldPos = new this.THREE.Vector3();
                        otherObj.getWorldPosition(worldPos);
                        otherX = worldPos.x;
                        otherY = worldPos.y;
                        otherZ = worldPos.z;
                    } else {
                        otherX = otherObj.position.x;
                        otherY = otherObj.position.y;
                        otherZ = otherObj.position.z;
                    }
                    
                    // Check if close enough to provide support (2.0 unit snap radius for markers)
                    const snapTolerance = otherObj.userData?.isSlotMarker ? 2.0 : otherHalfWidth;
                    const snapToleranceZ = otherObj.userData?.isSlotMarker ? 2.0 : otherHalfDepth;
                    
                    const distX = Math.abs(constrainedX - otherX);
                    const distZ = Math.abs(constrainedZ - otherZ);
                    
                    if (otherObj.userData?.isSlotMarker && (distX < 5 || distZ < 5)) {
                        console.log(`🎯 [MARKER DEBUG] Checking marker ${otherObj.userData.furnitureId}: pos(${otherX.toFixed(2)}, ${otherY.toFixed(2)}, ${otherZ.toFixed(2)}), distX=${distX.toFixed(2)}, distZ=${distZ.toFixed(2)}, tolerance=${snapTolerance}`);
                    }
                    
                    if (distX <= snapTolerance && distZ <= snapToleranceZ) {
                        
                        const supportHeight = otherObj.userData?.isSlotMarker 
                            ? otherY + objectHeight / 2
                            : otherY + otherHeight / 2 + objectHeight / 2;
                        
                        if (supportHeight > maxSupportHeight) {
                            maxSupportHeight = supportHeight;
                            supportObject = otherObj;
                            if (otherObj.userData?.isSlotMarker) {
                                console.log(`🎯 [MARKER DEBUG] ✅ FOUND SUPPORT! Marker ${otherObj.userData.furnitureId}, height=${supportHeight.toFixed(2)}`);
                            }
                        }
                    }
                }
                
                console.log(`🎯 [MARKER DEBUG] Total markers checked: ${markerCount}, supportObject found: ${supportObject ? 'YES' : 'NO'}`);
                
                if (supportObject) {
                    constrainedY = maxSupportHeight;
                    
                    if (supportObject.userData?.isSlotMarker) {
                        if (!object.userData) object.userData = {};
                        object.userData.furnitureSlotId = supportObject.userData.furnitureId;
                        object.userData.slotIndex = supportObject.userData.slotIndex;
                    }
                }
            }
            
            // Safety check: ensure Y is never below minimum safe height
            const minSafeY = objectHeight / 2;
            if (constrainedY < minSafeY) {
                constrainedY = minSafeY;
            }
            
            return { x: constrainedX, y: constrainedY, z: constrainedZ };
        }
    }

    // ============================================================================
    // GREEN PLANE WORLD TEMPLATE
    // ============================================================================
    class GreenPlaneWorldTemplate extends BaseWorldTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                ambientLightColor: 0x404040,
                ambientLightIntensity: 0.6,
                directionalLightColor: 0xffffff,
                directionalLightIntensity: 0.8,
                ...config
            });
            this.environmentSystem = null;
            this.environment = null;
        }

        setupEnvironment() {
            console.log('=== SETTING UP GREEN PLANE WORLD (MOBILE OPTIMIZED) ===');
            
            // Define ground level for positioning constraints
            this.groundLevelY = 0; // Ground level at Y=0
            
            // Initialize shared environment system
            this.environmentSystem = new window.SharedEnvironmentSystem(this.THREE, this.scene);
            
            // Create complete green plane environment with trees, mountains, clouds, and sky
            this.environment = this.environmentSystem.createEnvironmentPreset('greenPlane');
            
            // Ground - forest green gradient plane with glitter effect
            const groundGeometry = new this.THREE.PlaneGeometry(1000, 1000, 100, 100);
            
            // Create gradient with random sparkle using vertex colors
            const colors = new Float32Array(groundGeometry.attributes.position.count * 3);
            const color1 = new this.THREE.Color(0x1a5a1a); // Darker forest green
            const color2 = new this.THREE.Color(0x2d7a2d); // Lighter forest green
            
            for (let i = 0; i < groundGeometry.attributes.position.count; i++) {
                const y = groundGeometry.attributes.position.getY(i);
                const t = (y + 500) / 1000; // Normalize to 0-1 based on plane size
                const color = color1.clone().lerp(color2, t);
                
                // Add random sparkle/glitter variation (5-15% brightness boost randomly)
                const sparkle = Math.random() < 0.3 ? 1 + (Math.random() * 0.15) : 1;
                
                colors[i * 3] = Math.min(1, color.r * sparkle);
                colors[i * 3 + 1] = Math.min(1, color.g * sparkle);
                colors[i * 3 + 2] = Math.min(1, color.b * sparkle);
            }
            
            groundGeometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
            
            const groundMaterial = new this.THREE.MeshStandardMaterial({ 
                vertexColors: true, // Enable vertex colors for gradient and sparkle
                side: this.THREE.FrontSide, // CRITICAL: Only render front side to prevent seeing underside
                metalness: 0.25, // Slightly higher for sparkle effect
                roughness: 0.75 // Lower roughness for more shine
            });
            const ground = new this.THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.01; // Slightly below ground level to prevent z-fighting
            ground.receiveShadow = true;
            ground.userData.templateObject = true;
            this.scene.add(ground);
            this.objects.push(ground);

            // MOBILE NAVIGATION AIDS: Enhanced grid system for better orientation
            
            // 1. MAIN GRID - Subtle but visible for spatial reference
            const mainGrid = new this.THREE.GridHelper(120, 24, 0x446644, 0x669966);
            mainGrid.material.transparent = true;
            mainGrid.material.opacity = 0.15; // Very subtle
            mainGrid.userData.templateObject = true;
            this.scene.add(mainGrid);
            this.objects.push(mainGrid);

            // Add some atmosphere with fog
            this.scene.fog = new this.THREE.Fog(0xcccccc, 100, 2000);
            
            console.log('Green plane world environment setup complete - plane at y=-0.01, grid at y=0');
        }

        cleanup() {
            // Clean up environment system
            if (this.environmentSystem) {
                this.environmentSystem.cleanup();
                this.environmentSystem = null;
                this.environment = null;
            }
            
            // Remove fog
            if (this.scene) {
                this.scene.fog = null;
            }
            super.cleanup();
        }

        animate(time) {
            // Animate environment objects (clouds, trees, etc.)
            if (this.environmentSystem) {
                this.environmentSystem.animate(time);
            }
        }

        getType() {
            return 'green-plane';
        }

        getHomeViewPosition() {
            // Optimized view of demo Gallery Wall at z: -15 - adjust based on screen orientation
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2; // Consider landscape if width > 1.2x height
            
            if (isLandscape) {
                // Landscape: Close and eye-level for immersive Gallery Wall view
                return { x: 0, y: 1, z: -13 }; // Low eye-level (y:1), extremely close, looking straight at wall
            } else {
                // Portrait: further back and higher for full Gallery Wall view (narrow screen needs distance)
                return { x: 0, y: 10, z: 10 }; // ~25 units from wall after offset, shows full wall
            }
        }

        getHomeViewTarget() {
            return { x: 0, y: 5, z: -15 }; // Look at center of Gallery Wall at z=-15
        }

        applyCameraConstraints(controls) {
            controls.minDistance = 1.0;
            controls.maxDistance = 200.0;
            controls.minPolarAngle = Math.PI * 0.05; // Slight downward tilt allowed
            controls.maxPolarAngle = Math.PI * 0.45; // Prevent going underground
        }

        getPositioningConstraints() {
            const planeSize = this.config.planeSize || 300;
            return {
                requiresSupport: true,  // Objects must sit on plane or other objects
                allowedStackingDirections: ['top'], // Only stack on top
                worldBoundaries: {
                    x: { min: -planeSize/2, max: planeSize/2 },  // ±150 for planeSize=300
                    y: { min: 0, max: planeSize/2 },  // 0 to 150 (reasonable stacking limit)
                    z: { min: -planeSize/2, max: planeSize/2 }   // ±150 for planeSize=300
                }
            };
        }
        applyPositionConstraints(object, newPosition, allObjects = []) {
            // CRITICAL: Skip constraint system for furniture/path-snapped objects
            // These objects have their positions explicitly set and must not be overridden
            if (object.userData?.preservePosition) {
                console.log(`  ⚡ PRESERVE POSITION: Skipping constraints for ${object.userData.fileName || 'unknown'} (furniture/path snap)`);
                return {
                    x: newPosition.x,
                    y: newPosition.y,
                    z: newPosition.z
                };
            }
            
            // CRITICAL: Skip constraints for furniture being dragged to prevent erratic movement
            if (object.userData?.isFurniture) {
                console.log(`  ⚡ FURNITURE DRAG: Skipping constraints for ${object.userData.fileName || 'unknown'}`);
                return {
                    x: newPosition.x,
                    y: newPosition.y,
                    z: newPosition.z
                };
            }
            
            const constraints = this.getPositioningConstraints();
            
            // Apply world boundaries first
            let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            // Get object height for proper positioning - check userData first (for contact objects), then geometry parameters
            const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
            
            // Check if this object is transitioning from a non-gravity world (ocean/space)
            const comingFromNonGravityWorld = object.userData?.isEnteringStackingFromOcean === true || 
                                             object.userData?.isEnteringStackingFromSpace === true;
            
            // Check if stacking is enabled and this position is intentional
            const stackingEnabled = window.app?.sortingManager?.stackingConfig?.enabled;
            const isStackedPosition = newPosition.y > (this.groundLevelY + objectHeight / 2 + 0.1); // More than ground level + small tolerance
            
            if (comingFromNonGravityWorld) {
                console.log(`🌊→🟢 Green plane constraints for ${object.userData.fileName || 'unknown'}: Coming from non-gravity world - preserving stacked position`);
            }
            
            let constrainedY;
            if ((stackingEnabled && isStackedPosition) || comingFromNonGravityWorld) {
                // If stacking is enabled and this seems to be a stacked position, respect the Y coordinate
                constrainedY = newPosition.y;
                console.log(`Green plane constraints for ${object.userData.fileName || 'unknown'}:`);
                console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
                console.log(`  Ground level Y: ${this.groundLevelY}`);
                console.log(`  Object height: ${objectHeight}`);
                console.log(`  Stacking enabled - respecting Y position: ${constrainedY}`);
            } else {
                // Normal ground positioning logic
                constrainedY = this.groundLevelY + objectHeight / 2; // Position so object bottom sits on ground
                
                console.log(`Green plane constraints for ${object.userData.fileName || 'unknown'}:`);
                console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
                console.log(`  Ground level Y: ${this.groundLevelY}`);
                console.log(`  Object height: ${objectHeight}`);
                console.log(`  Base constrained Y: ${constrainedY}`);
            }
            
            // GREEN PLANE WORLD: Objects must be supported - check for objects below
            // CRITICAL: Skip support checking when coming from non-gravity worlds to prevent unstacking
            if (constraints.requiresSupport && allObjects.length > 0 && 
                !(stackingEnabled && isStackedPosition) && !comingFromNonGravityWorld) {
                // Only apply support logic if not using stacking system
                const otherObjects = allObjects.filter(obj => obj !== object);
                let supportObject = null;
                let maxSupportHeight = this.groundLevelY + objectHeight / 2; // Ground level + object center height
                
                console.log(`  🔍 Checking ${otherObjects.length} potential support objects at position (${constrainedX}, ${constrainedZ})`);
                
                // Count markers for debugging
                const markerCount = otherObjects.filter(obj => obj.userData?.isSlotMarker).length;
                console.log(`  🔍 Marker count in support objects: ${markerCount}`);
                if (markerCount === 0 && otherObjects.length > 0) {
                    console.log(`  ⚠️ NO MARKERS FOUND! Sample object userData:`, otherObjects[0].userData);
                }
                
                // Find the highest object that can support this object at the constrained position
                for (const otherObj of otherObjects) {
                    // Get dimensions for support object - check userData first (for contact objects), then geometry parameters
                    const otherWidth = otherObj.userData?.objectWidth || otherObj.geometry?.parameters?.width || (otherObj.geometry?.parameters?.radius * 2) || 1;
                    const otherDepth = otherObj.userData?.objectDepth || otherObj.geometry?.parameters?.depth || (otherObj.geometry?.parameters?.radius * 2) || 1;
                    const otherHeight = otherObj.userData?.objectHeight || otherObj.geometry?.parameters?.height || 1;
                    
                    const otherHalfWidth = otherWidth / 2;
                    const otherHalfDepth = otherDepth / 2;
                    
                    // Get world position for markers (they use local coordinates within furnitureGroup)
                    // For regular objects, position is already in world space
                    let otherX, otherY, otherZ;
                    if (otherObj.userData?.isSlotMarker && otherObj.parent) {
                        const worldPos = new THREE.Vector3();
                        otherObj.getWorldPosition(worldPos);
                        otherX = worldPos.x;
                        otherY = worldPos.y;
                        otherZ = worldPos.z;
                    } else {
                        otherX = otherObj.position.x;
                        otherY = otherObj.position.y;
                        otherZ = otherObj.position.z;
                    }
                    
                    // Debug for furniture markers
                    if (otherObj.userData?.isSlotMarker) {
                        const xDist = Math.abs(constrainedX - otherX);
                        const zDist = Math.abs(constrainedZ - otherZ);
                        // Use 0.5 unit snap radius for precise furniture snapping (sub-1-unit marker spacing)
                        const snapRadius = 0.5;
                        // console.log(`    🪑 Marker at world (${otherX.toFixed(1)}, ${otherZ.toFixed(1)}): xDist=${xDist.toFixed(2)} < ${snapRadius.toFixed(2)}? ${xDist < snapRadius}, zDist=${zDist.toFixed(2)} < ${snapRadius.toFixed(2)}? ${zDist < snapRadius}`);
                    }
                    
                    // Check if the object is close enough to provide support
                    // For furniture markers, use 2.0 unit snap radius (matches marker spacing)
                    // For regular objects, use their actual dimensions
                    const snapTolerance = otherObj.userData?.isSlotMarker ? 2.0 : otherHalfWidth;
                    const snapToleranceZ = otherObj.userData?.isSlotMarker ? 2.0 : otherHalfDepth;
                    
                    if (Math.abs(constrainedX - otherX) < snapTolerance && 
                        Math.abs(constrainedZ - otherZ) < snapToleranceZ) {
                        // Calculate support height: for markers, object bottom sits ON marker surface
                        // For markers (objectHeight = 0.01), place object bottom at marker Y
                        // For other objects, place on top surface
                        const supportHeight = otherObj.userData?.isSlotMarker 
                            ? otherY + objectHeight / 2  // Marker: object bottom at marker surface
                            : otherY + otherHeight / 2 + objectHeight / 2; // Regular: object bottom on top surface
                        
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
                    
                    // FURNITURE MARKER DETECTION: Store furniture slot info for later use
                    // DO NOT set preservePosition here - that prevents future drag operations
                    // preservePosition should only be set at END of drag, not during constraint application
                    if (supportObject.userData?.isSlotMarker) {
                        if (!object.userData) object.userData = {};
                        object.userData.furnitureSlotId = supportObject.userData.furnitureId;
                        object.userData.slotIndex = supportObject.userData.slotIndex;
                        console.log(`  🪑 DETECTED furniture slot - storing slot info (furnitureId: ${supportObject.userData.furnitureId}, slotIndex: ${supportObject.userData.slotIndex})`);
                    }
                } else {
                    // No support found, place on ground (already set above)
                    constrainedY = this.groundLevelY + objectHeight / 2;
                    console.log(`  No support found, placing on ground at Y=${constrainedY}`);
                }
            }
            
            // CRITICAL SAFETY CHECK: Ensure Y is NEVER less than minimum safe height
            // This prevents objects from being buried underground
            // Y must be at least objectHeight/2 so that bottom of object is at Y=0 or above
            const minSafeY = objectHeight / 2; // Minimum Y to ensure object bottom is at Y=0
            if (constrainedY < minSafeY) {
                console.warn(`⚠️ SAFETY: Corrected Y from ${constrainedY.toFixed(3)} to ${minSafeY.toFixed(3)} (object height: ${objectHeight.toFixed(3)})`);
                constrainedY = minSafeY;
            }
            
            const result = {
                x: constrainedX,
                y: constrainedY,
                z: constrainedZ
            };
            
            console.log(`  Final constrained position: (${result.x}, ${result.y}, ${result.z})`);
            return result;
        }
    }

    // ============================================================================
    // SPACE WORLD TEMPLATE
    // ============================================================================
    class SpaceWorldTemplate extends BaseWorldTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                ambientLightColor: 0x111133,
                ambientLightIntensity: 0.3,
                directionalLightColor: 0xffffff,
                directionalLightIntensity: 0.7,
                // Remove skybox URLs since we're using procedural starfield
                skyBoxUrls: [],
                ...config
            });
            
            // Store reference to starfield for animation
            this.starField = null;
        }

        setupEnvironment() {
            console.log('=== SETTING UP SPACE WORLD ===');
            
            // Deep space background with subtle gradient
            this.scene.background = new this.THREE.Color(0x000022); // Deeper space blue
            
            // Create enhanced starfield with varied colors and sizes
            this.createEnhancedStarfield();
            
            // Add some distant planets/objects for atmosphere
            this.createDistantObjects();
            
            // No fog in space
            this.scene.fog = null;
            
            console.log('Space world environment created with enhanced star field');
        }

        createEnhancedStarfield() {
            // Create a star field using points with varied sizes and colors
            const starCount = 1500; // Increased from 1000 for denser field
            const positions = new Float32Array(starCount * 3);
            const colors = new Float32Array(starCount * 3);
            const sizes = new Float32Array(starCount);
            
            for (let i = 0; i < starCount; i++) {
                // Create stars in a large sphere around the scene
                const radius = 150 + Math.random() * 400; // Varied distances
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = radius * Math.cos(phi);
                positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
                
                // Varied star colors - mostly white/blue with some yellow/orange
                const starType = Math.random();
                if (starType < 0.7) {
                    // White/blue stars (70%)
                    colors[i * 3] = 0.8 + Math.random() * 0.2;     // R
                    colors[i * 3 + 1] = 0.8 + Math.random() * 0.2; // G
                    colors[i * 3 + 2] = 1.0;                       // B
                } else if (starType < 0.9) {
                    // Yellow/orange stars (20%)
                    colors[i * 3] = 1.0;                           // R
                    colors[i * 3 + 1] = 0.8 + Math.random() * 0.2; // G
                    colors[i * 3 + 2] = 0.3 + Math.random() * 0.3; // B
                } else {
                    // Red stars (10%)
                    colors[i * 3] = 1.0;                           // R
                    colors[i * 3 + 1] = 0.3 + Math.random() * 0.3; // G
                    colors[i * 3 + 2] = 0.2 + Math.random() * 0.2; // B
                }
                
                // Varied star sizes (most small, some medium, few large) - doubled from previous values
                const sizeType = Math.random();
                if (sizeType < 0.8) {
                    sizes[i] = 1.4 + Math.random() * 1.4; // Small stars (doubled from 0.7-1.4 to 1.4-2.8)
                } else if (sizeType < 0.95) {
                    sizes[i] = 2.6 + Math.random() * 2.0; // Medium stars (doubled from 1.3-2.3 to 2.6-4.6)
                } else {
                    sizes[i] = 4.0 + Math.random() * 2.6; // Large bright stars (doubled from 2.0-3.3 to 4.0-6.6)
                }
            }
            
            const starGeometry = new this.THREE.BufferGeometry();
            starGeometry.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));
            starGeometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
            starGeometry.setAttribute('size', new this.THREE.BufferAttribute(sizes, 1));
            
            const starMaterial = new this.THREE.PointsMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 1.0, // Increased from 0.8 for better visibility
                sizeAttenuation: false,
                size: 2.0 // Doubled star size for better visibility (was 1.0)
            });
            
            const stars = new this.THREE.Points(starGeometry, starMaterial);
            stars.userData.templateObject = true;
            this.scene.add(stars);
            this.objects.push(stars);
            
            // Store reference to starfield for animation
            this.starField = stars;
            
            console.log('Created enhanced star field with', starCount, 'varied stars');
        }

        createDistantObjects() {
            // Create a few distant spheres to represent planets - varied colors and sizes for visual interest
            const planetConfigs = [
                { color: 0xff6b6b, size: 8, distance: 800, position: [300, 100, -600] },     // Red planet (Mars-like)
                { color: 0x4ecdc4, size: 6, distance: 1000, position: [-400, -50, -800] },   // Cyan planet (ice world)
                { color: 0x45b7d1, size: 10, distance: 1200, position: [200, -200, -1000] }, // Blue planet (Earth-like)
                { color: 0xffd700, size: 4, distance: 900, position: [-200, 150, -700] },    // Gold planet (desert world)
                { color: 0x9b59b6, size: 7, distance: 1100, position: [400, -100, -900] }    // Purple planet (gas giant)
            ];

            planetConfigs.forEach((config, index) => {
                const geometry = new this.THREE.SphereGeometry(config.size, 16, 16);
                const material = new this.THREE.MeshLambertMaterial({ color: config.color });
                const planet = new this.THREE.Mesh(geometry, material);
                planet.position.set(...config.position);
                planet.userData.templateObject = true;
                planet.userData.planetIndex = index;
                this.scene.add(planet);
                this.objects.push(planet);
            });
        }

        animate(time) {
            // Rotate the starfield slowly for a dynamic space feel
            if (this.starField) {
                // Convert time to seconds and apply extremely slow rotation
                const timeInSeconds = time * 0.001;
                this.starField.rotation.y = timeInSeconds * 0.001; // Slightly faster than before (2x faster than 0.0005)
            }
            
            // Animate distant planets (subtle orbital motion)
            this.objects.forEach(obj => {
                if (obj.userData.planetIndex !== undefined) {
                    const planetIndex = obj.userData.planetIndex;
                    const timeInSeconds = time * 0.001;
                    
                    // Each planet rotates at slightly different speeds
                    const baseSpeed = 0.02;
                    const speed = baseSpeed * (1 + planetIndex * 0.3);
                    
                    // Store original position if not stored
                    if (!obj.userData.originalPosition) {
                        obj.userData.originalPosition = {
                            x: obj.position.x,
                            y: obj.position.y,
                            z: obj.position.z
                        };
                    }
                    
                    // Apply subtle orbital motion around original position
                    const radius = 50; // Small orbital radius
                    const angle = timeInSeconds * speed + planetIndex * Math.PI * 0.5;
                    obj.position.x = obj.userData.originalPosition.x + Math.cos(angle) * radius;
                    obj.position.z = obj.userData.originalPosition.z + Math.sin(angle) * radius;
                }
            });
        }

        cleanup() {
            // Clear starfield reference
            this.starField = null;
            
            // Call parent cleanup
            super.cleanup();
        }

        getType() {
            return 'space';
        }

        getHomeViewPosition() {
            // Match green plane camera settings for consistent experience
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2;
            
            if (isLandscape) {
                return { x: 0, y: 1, z: -13 };
            } else {
                return { x: 0, y: 10, z: 10 };
            }
        }

        getHomeViewTarget() {
            return { x: 0, y: 5, z: -15 };
        }

        applyCameraConstraints(controls) {
            controls.minDistance = 0.1;
            controls.maxDistance = 1000.0;
            // No polar angle constraints - full 360° freedom in space
        }

        getPositioningConstraints() {
            return {
                requiresSupport: false,  // Objects can float freely in space
                allowedStackingDirections: ['top', 'bottom'], // Stack top/bottom but not sides
                worldBoundaries: {
                    x: { min: -150, max: 150 }, // 300 units total (±150)
                    y: { min: -200, max: 150 }, // Lower limit aligned with ocean world (-200), upper limit for space movement
                    z: { min: -150, max: 150 }  // 300 units total (±150)
                }
            };
        }
        applyPositionConstraints(object, newPosition, allObjects = []) {
            const constraints = this.getPositioningConstraints();
            
            // Check if coming from green-plane with stacked objects - preserve Y position
            const comingFromStackingWorld = object.userData.isEnteringSpaceFromStacking;
            if (comingFromStackingWorld) {
                console.log(`🟢→🚀 Space world: Coming from green-plane with stacked position - preserving Y for ${object.userData.fileName || 'unknown'}`);
            }
            
            // SPACE WORLD: Objects can float freely, just apply boundary constraints
            return {
                x: Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x)),
                y: Math.max(constraints.worldBoundaries.y.min, Math.min(constraints.worldBoundaries.y.max, newPosition.y)),
                z: Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z))
            };
        }
    }

    // ============================================================================
    // OCEAN WORLD TEMPLATE
    // ============================================================================
    class OceanWorldTemplate extends BaseWorldTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                ambientLightColor: 0x404080,
                ambientLightIntensity: 0.4,
                directionalLightColor: 0xffd700,
                directionalLightIntensity: 0.9,
                ...config
            });
        }

        setupEnvironment() {
            console.log('=== SETTING UP OCEAN WORLD ===');
            
            // Set underwater blue background
            this.scene.background = new this.THREE.Color(0x006994); // Deep ocean blue
            
            // Create ocean floor (darker than surface)
            this.createOceanFloor();
            
            // Create ocean surface
            this.createOceanSurface();
            
            // Add underwater lighting effects
            this.setupUnderwaterLighting();
            
            // Add fog for underwater atmosphere
            this.scene.fog = new this.THREE.Fog(0x006994, 50, 1000);
            
            // Create ocean environment features using SharedEnvironmentSystem
            this.createOceanEnvironment();
            
            console.log('Ocean world environment created with floor, surface, underwater lighting, and ocean features');
        }

        createOceanEnvironment() {
            console.log('🌊 Creating ocean environment features...');
            
            // Check if OceanEnvironmentCoordinator is available
            if (typeof window.OceanEnvironmentCoordinator === 'undefined') {
                console.warn('OceanEnvironmentCoordinator not available, skipping ocean features');
                return;
            }
            
            try {
                // Create environment coordinator instance
                const oceanCoordinator = new window.OceanEnvironmentCoordinator(this.THREE, this.scene);
                
                // Create ocean environment with our desired configuration
                const oceanConfig = {
                    islands: { count: 12, minDistance: 300, maxDistance: 600 },
                    palmTrees: { minTreesPerIsland: 2, maxTreesPerIsland: 6 },
                    clouds: { formationCount: 5, layerHeight: 50, horizonSpread: 700 },
                    ships: { count: 6, distance: 450 }
                };
                
                const oceanEnvironment = oceanCoordinator.createOceanEnvironment(oceanConfig);
                
                if (oceanEnvironment) {
                    // Store coordinator for cleanup and animation
                    this.oceanCoordinator = oceanCoordinator;
                    console.log('✅ Ocean environment features created: islands, palm trees, clouds, and ships');
                } else {
                    console.warn('Failed to create ocean environment features');
                }
            } catch (error) {
                console.error('❌ Error creating ocean environment:', error);
            }
        }

        createOceanFloor() {
            console.log('Creating ocean floor...');
            const floorGeometry = new this.THREE.PlaneGeometry(2000, 2000);
            const floorMaterial = new this.THREE.MeshLambertMaterial({
                color: 0x1a4a6b, // Dark blue-gray for ocean floor
                transparent: true,
                opacity: 0.8, // Slightly transparent so surface above is visible
                side: this.THREE.DoubleSide
            });
            
            const floor = new this.THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -5; // Slightly below objects for depth
            floor.userData.templateObject = true;
            floor.userData.isOceanFloor = true;
            
            this.scene.add(floor);
            this.objects.push(floor);
            console.log('Ocean floor created at Y=-5 (transparent for upward visibility)');
        }

        createOceanSurface() {
            console.log('Creating ocean surface...');
            const oceanGeometry = new this.THREE.PlaneGeometry(2000, 2000, 100, 100);
            const oceanMaterial = new this.THREE.MeshLambertMaterial({
                color: 0x87CEEB, // Light sky blue - simulates sunlight filtering through water
                transparent: true,
                opacity: 0.4, // More transparent for better sunlight effect
                side: this.THREE.DoubleSide
            });
            
            const ocean = new this.THREE.Mesh(oceanGeometry, oceanMaterial);
            ocean.rotation.x = -Math.PI / 2;
            ocean.position.y = 0; // Ocean surface at Y=0 - same level as green plane ground
            ocean.userData.templateObject = true;
            ocean.userData.isOceanSurface = true; // Mark as ocean surface for raycasting exclusion
            
            // Add gentle wave animation
            ocean.userData.animate = (time) => {
                const positions = ocean.geometry.attributes.position;
                for (let i = 0; i < positions.count; i++) {
                    const x = positions.getX(i);
                    const z = positions.getZ(i);
                    const wave = Math.sin(x * 0.01 + time * 0.001) * Math.cos(z * 0.01 + time * 0.001) * 5;
                    positions.setY(i, wave);
                }
                positions.needsUpdate = true;
            };
            
            this.scene.add(ocean);
            this.objects.push(ocean);
            console.log('Ocean surface created at Y=0 (same level as ground plane)');
        }

        setupUnderwaterLighting() {
            console.log('Setting up underwater lighting...');
            // Add additional blue-tinted light for underwater effect
            const underwaterLight = new this.THREE.DirectionalLight(0x4f94cd, 0.4);
            underwaterLight.position.set(-1, -0.5, -1).normalize();
            underwaterLight.userData.templateLight = true;
            this.scene.add(underwaterLight);
            this.objects.push(underwaterLight);
            console.log('Underwater lighting added');
        }

        animate(time) {
            // Animate ocean waves
            this.objects.forEach(obj => {
                if (obj.userData.animate) {
                    obj.userData.animate(time);
                }
            });
            
            // Animate ocean environment if coordinator exists
            if (this.oceanCoordinator) {
                this.oceanCoordinator.animate(time);
            }
        }

        cleanup() {
            // Clean up ocean coordinator if it exists
            if (this.oceanCoordinator) {
                console.log('🧹 Cleaning up ocean environment...');
                this.oceanCoordinator.cleanup();
                this.oceanCoordinator = null;
            }
            
            // Remove fog
            if (this.scene) {
                this.scene.fog = null;
            }
            super.cleanup();
        }

        getType() {
            return 'ocean';
        }

        getHomeViewPosition() {
            // Match green plane camera settings for consistent experience
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2;
            
            if (isLandscape) {
                return { x: 0, y: 1, z: -13 };
            } else {
                return { x: 0, y: 10, z: 10 };
            }
        }

        getHomeViewTarget() {
            return { x: 0, y: 5, z: -15 };
        }

        applyCameraConstraints(controls) {
            controls.minDistance = 1.0;
            controls.maxDistance = 300.0;
            controls.minPolarAngle = Math.PI * 0.1; // Prevent too steep downward angle
            controls.maxPolarAngle = Math.PI * 0.9; // Allow underwater viewing
        }

        getPositioningConstraints() {
            return {
                requiresSupport: false,  // Objects float at origin level, ocean surface above
                allowedStackingDirections: ['top', 'bottom', 'sides'], // Full 3D stacking like space world
                worldBoundaries: {
                    x: { min: -150, max: 150 }, // 300 units total (±150) - consistent with other worlds
                    y: { min: -200, max: 100 }, // Allow stacked objects above ocean surface (Y=0) up to Y=100
                    z: { min: -150, max: 150 }  // 300 units total (±150) - consistent with other worlds
                }
            };
        }

        applyPositionConstraints(object, newPosition, allObjects = []) {
            const constraints = this.getPositioningConstraints();
            
            console.log(`Ocean world constraints for ${object.userData.fileName || 'unknown'}:`);
            console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
            console.log(`  World boundaries:`, constraints.worldBoundaries);
            
            // Check if coming from green-plane with stacked objects - preserve Y position
            const comingFromStackingWorld = object.userData.isEnteringOceanFromStacking;
            if (comingFromStackingWorld) {
                console.log(`🟢→🌊 Ocean constraints for ${object.userData.fileName}: Coming from green-plane with stacked position - preserving Y`);
            }
            
            // Apply X and Z boundary constraints
            const constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            const constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            // Get object height for proper positioning - check userData first (for contact objects), then geometry parameters
            const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
            
            // Apply Y boundary constraints
            let constrainedY = Math.max(constraints.worldBoundaries.y.min, Math.min(constraints.worldBoundaries.y.max, newPosition.y));
            
            // OCEAN WORLD: Allow free Y movement within bounds (-200 to 0)
            // If coming from green-plane with stacked objects, preserve the relative Y positions
            if (comingFromStackingWorld) {
                console.log(`  Ocean positioning: Preserving stacked Y=${constrainedY} from green-plane world`);
            } else {
                console.log(`  Ocean positioning: Y=${constrainedY} (free movement within bounds [-200, 0])`);
            }
            
            const constrainedPosition = {
                x: constrainedX,
                y: constrainedY,
                z: constrainedZ
            };
            
            console.log(`  Constrained position: (${constrainedPosition.x}, ${constrainedPosition.y}, ${constrainedPosition.z})`);
            console.log(`  Y was ${newPosition.y >= constraints.worldBoundaries.y.min && newPosition.y <= constraints.worldBoundaries.y.max ? 'within' : 'outside'} bounds [${constraints.worldBoundaries.y.min}, ${constraints.worldBoundaries.y.max}]`);
            
            return constrainedPosition;
        }
    }    
    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.BaseWorldTemplate = BaseWorldTemplate;
    window.GreenPlaneWorldTemplate = GreenPlaneWorldTemplate;
    window.SpaceWorldTemplate = SpaceWorldTemplate;
    window.OceanWorldTemplate = OceanWorldTemplate;
    
    console.log("WorldTemplates module loaded - BaseWorldTemplate, GreenPlaneWorldTemplate, SpaceWorldTemplate, OceanWorldTemplate available globally");
    console.log("📝 Note: Additional world templates (RecordStore, MusicFestival, ModernGallery variants, FutureCarGallery) are loaded separately");
})();
