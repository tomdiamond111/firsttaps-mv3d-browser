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
            return { x: 0, y: 10, z: 20 }; // Default home position
        }

        // Override in subclasses to define world-specific target
        getHomeViewTarget() {
            return { x: 0, y: 0, z: 0 }; // Default target
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
        }

        setupEnvironment() {
            console.log('=== SETTING UP GREEN PLANE WORLD (MOBILE OPTIMIZED) ===');
            
            // Define ground level for positioning constraints
            this.groundLevelY = 0; // Ground level at Y=0
            
            // Sky blue background for green plane world
            this.scene.background = new this.THREE.Color(0x87CEEB); // Sky blue
            
            // Ground - green plane with landscape-appropriate settings
            const groundGeometry = new this.THREE.PlaneGeometry(1000, 1000);
            const groundMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0x228B22, // Forest green 
                side: this.THREE.FrontSide, // CRITICAL: Only render front side to prevent seeing underside
                metalness: 0.1, 
                roughness: 0.9 
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
            // Remove fog
            if (this.scene) {
                this.scene.fog = null;
            }
            super.cleanup();
        }

        getType() {
            return 'green-plane';
        }

        getHomeViewPosition() {
            // Adjust camera position based on screen orientation for better viewing
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2; // Consider landscape if width > 1.2x height
            
            if (isLandscape) {
                // In landscape mode, get much closer for better viewing (2x closer)
                return { x: 0, y: 4, z: 6 }; // Much closer and lower for landscape (2x closer than before)
            } else {
                return { x: 0, y: 8, z: 15 }; // Standard elevated landscape view for portrait
            }
        }

        getHomeViewTarget() {
            return { x: 0, y: 0, z: 0 }; // Look at the green plane at ground level
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
            const constraints = this.getPositioningConstraints();
            
            // Apply world boundaries first
            let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            // Get object height for proper positioning
            const objectHeight = object.geometry?.parameters?.height || 1;
            let constrainedY = this.groundLevelY + objectHeight / 2; // Position so object bottom sits on ground
            
            // GREEN PLANE WORLD: Objects must be supported - check for objects below
            if (constraints.requiresSupport && allObjects.length > 0) {
                const otherObjects = allObjects.filter(obj => obj !== object);
                let supportObject = null;
                let maxSupportHeight = this.groundLevelY + objectHeight / 2; // Ground level + object center height
                
                // Find the highest object that can support this object at the constrained position
                for (const otherObj of otherObjects) {
                    const otherHalfWidth = (otherObj.geometry.parameters.width || otherObj.geometry.parameters.radius * 2 || 1) / 2;
                    const otherHalfDepth = (otherObj.geometry.parameters.depth || otherObj.geometry.parameters.radius * 2 || 1) / 2;
                    
                    // Check if the object is close enough to provide support
                    if (Math.abs(constrainedX - otherObj.position.x) < otherHalfWidth && 
                        Math.abs(constrainedZ - otherObj.position.z) < otherHalfDepth) {
                        const otherHeight = otherObj.geometry.parameters.height || 1;
                        // Calculate support height: top of supporting object + half height of object being placed
                        const supportHeight = otherObj.position.y + otherHeight / 2 + objectHeight / 2;
                        
                        if (supportHeight > maxSupportHeight) {
                            maxSupportHeight = supportHeight;
                            supportObject = otherObj;
                        }
                    }
                }
                
                // If we found a supporting object, snap to its position and place on top
                if (supportObject) {
                    constrainedX = supportObject.position.x;
                    constrainedZ = supportObject.position.z;
                    constrainedY = maxSupportHeight;
                } else {
                    // No support found, place on ground (already set above)
                    constrainedY = this.groundLevelY + objectHeight / 2;
                }
            }
            
            return {
                x: constrainedX,
                y: constrainedY,
                z: constrainedZ
            };
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
            // Adjust camera position based on screen orientation for better viewing
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2; // Consider landscape if width > 1.2x height
            
            if (isLandscape) {
                // In landscape mode, get much closer for better viewing of floating objects (2x closer)
                return { x: 0, y: 4, z: 6 }; // Much closer position for landscape viewing (2x closer than before)
            } else {
                return { x: 0, y: 8, z: 15 }; // Standard position consistent with green-plane world
            }
        }

        getHomeViewTarget() {
            return { x: 0, y: 0, z: 0 }; // Look at center/origin of 3D world
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
                    y: { min: -200, max: 200 }, // 400 units total (±200) - increased for full 3D movement
                    z: { min: -150, max: 150 }  // 300 units total (±150)
                }
            };
        }
        applyPositionConstraints(object, newPosition, allObjects = []) {
            const constraints = this.getPositioningConstraints();
            
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
            
            console.log('Ocean world environment created with floor, surface and underwater lighting');
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
            ocean.position.y = 50; // Much lower - visible with normal camera rotation from Y=8
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
            console.log('Ocean surface created at Y=50 (light blue sunlight effect)');
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
        }

        cleanup() {
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
            // Adjust camera position based on screen orientation for better viewing
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2; // Consider landscape if width > 1.2x height
            
            if (isLandscape) {
                // In landscape mode, get much closer for better underwater viewing (2x closer)
                return { x: 0, y: 4, z: 6 }; // Much closer position for landscape viewing (2x closer than before)
            } else {
                return { x: 0, y: 8, z: 15 }; // Standard position matching green-plane world
            }
        }

        getHomeViewTarget() {
            return { x: 0, y: 0, z: 0 }; // Look at origin where objects are positioned
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
                    y: { min: -200, max: 200 }, // 400 units total (±200) - increased for full 3D movement
                    z: { min: -150, max: 150 }  // 300 units total (±150) - consistent with other worlds
                }
            };
        }

        applyPositionConstraints(object, newPosition, allObjects = []) {
            const constraints = this.getPositioningConstraints();
            
            // OCEAN WORLD: Objects stay underwater - cannot go above water surface (Y = 50)
            // Water surface is at Y=50, so objects cannot exceed this value
            const maxY = 50; // Ocean surface level - objects cannot go above this
            
            const constrainedPosition = {
                x: Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x)),
                y: Math.max(constraints.worldBoundaries.y.min, Math.min(maxY, newPosition.y)), // Clamp Y to water surface
                z: Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z))
            };
            
            // Log constraint enforcement
            if (newPosition.y > maxY) {
                console.log(`Ocean world: Object ${object.userData.fileName || 'unknown'} prevented from going above water surface. Y clamped from ${newPosition.y} to ${constrainedPosition.y}`);
            }
            
            console.log(`Ocean world constraints applied to ${object.userData.fileName || 'unknown'}: 
                Original: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})
                Constrained: (${constrainedPosition.x}, ${constrainedPosition.y}, ${constrainedPosition.z})`);
            
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
})();
