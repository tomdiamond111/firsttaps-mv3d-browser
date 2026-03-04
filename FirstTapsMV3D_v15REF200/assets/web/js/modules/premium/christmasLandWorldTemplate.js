/**
 * CHRISTMASLAND WORLD TEMPLATE (Premium)
 * Self-contained Christmas/winter holiday themed world template
 * Features: red walls, Christmas tree, fireplace, snowman, snow floor, Santa's house, posters
 * Extends BaseWorldTemplate with full poster system implementation
 */

class ChristmasLandWorldTemplate extends BaseWorldTemplate {
    constructor(THREE, config = {}) {
        super(THREE, {
            ambientLightColor: 0xFFE4B5, // Warm Christmas lighting
            ambientLightIntensity: 0.4,
            directionalLightColor: 0xFFF8DC, // Soft winter light
            directionalLightIntensity: 0.6,
            ...config
        });
        
        // Christmas-specific properties
        this.christmasDecorations = null;
        this.logCabin = null;
        this.christmasLights = null;
        this.christmasElements = [];
        
        console.log('🎄 ChristmasLand world template initialized');
    }

    getType() {
        return 'christmas';
    }

    getDisplayName() {
        return 'ChristmasLand';
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
        // Similar to Dazzle bedroom but allow higher view for Christmas tree
        controls.minDistance = 8.0;
        controls.maxDistance = 150.0;
        controls.maxPolarAngle = Math.PI * 0.85; // Allow low view of snow
        controls.minPolarAngle = Math.PI * 0.05; // Allow high view of tree
    }

    /**
     * Christmas positioning constraints - copied from Dazzle Bedroom
     */
    getPositioningConstraints() {
        return {
            requiresSupport: true, // Objects need support in ChristmasLand
            allowedStackingDirections: ['top', 'front', 'back', 'left', 'right'],
            worldBoundaries: {
                x: { min: -150, max: 150 },
                y: { min: 0, max: 120 }, // Increased from 100 to 120 for higher ceiling
                z: { min: -150, max: 150 }
            }
        };
    }

    /**
     * Christmas positioning logic - adapted from Dazzle Bedroom
     */
    applyPositionConstraints(object, newPosition, allObjects = []) {
        const constraints = this.getPositioningConstraints();
        
        // Apply world boundaries first
        let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
        let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
        
        // Get object height for proper positioning - check userData first (for contact objects), then geometry parameters
        const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
        
        // Check if stacking is enabled and this position is intentional
        const stackingEnabled = window.app?.sortingManager?.stackingConfig?.enabled;
        const isStackedPosition = newPosition.y > (this.groundLevelY + objectHeight / 2 + 0.1); // More than ground level + small tolerance
        
        let constrainedY;
        if (stackingEnabled && isStackedPosition) {
            // If stacking is enabled and this seems to be a stacked position, respect the Y coordinate
            constrainedY = newPosition.y;
            console.log(`ChristmasLand constraints for ${object.userData.fileName || 'unknown'}:`);
            console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
            console.log(`  Ground level Y: ${this.groundLevelY}`);
            console.log(`  Object height: ${objectHeight}`);
            console.log(`  Stacking enabled - respecting Y position: ${constrainedY}`);
        } else {
            // Normal ground positioning logic
            constrainedY = this.groundLevelY + objectHeight / 2; // Position so object bottom sits on ground
            
            console.log(`ChristmasLand constraints for ${object.userData.fileName || 'unknown'}:`);
            console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
            console.log(`  Ground level Y: ${this.groundLevelY}`);
            console.log(`  Object height: ${objectHeight}`);
            console.log(`  Base constrained Y: ${constrainedY}`);
        }
        
        // CHRISTMASLAND WORLD: Objects must be supported - check for objects below (same as dazzle bedroom)
        if (constraints.requiresSupport && allObjects.length > 0 && !(stackingEnabled && isStackedPosition)) {
            // Only apply support logic if not using stacking system
            const otherObjects = allObjects.filter(obj => obj !== object);
            let supportObject = null;
            let maxSupportHeight = this.groundLevelY + objectHeight / 2; // Ground level + object center height
            
            // Find the highest object that can support this object at the constrained position
            for (const otherObj of otherObjects) {
                // Get dimensions for support object - check userData first (for contact objects), then geometry parameters
                const otherWidth = otherObj.userData?.objectWidth || otherObj.geometry?.parameters?.width || (otherObj.geometry?.parameters?.radius * 2) || 1;
                const otherDepth = otherObj.userData?.objectDepth || otherObj.geometry?.parameters?.depth || (otherObj.geometry?.parameters?.radius * 2) || 1;
                const otherHeight = otherObj.userData?.objectHeight || otherObj.geometry?.parameters?.height || 1;
                
                // Calculate support object bounds
                const otherTop = otherObj.position.y + otherHeight / 2;
                const otherLeft = otherObj.position.x - otherWidth / 2;
                const otherRight = otherObj.position.x + otherWidth / 2;
                const otherFront = otherObj.position.z - otherDepth / 2;
                const otherBack = otherObj.position.z + otherDepth / 2;
                
                // Check if the constrained position is above this object
                if (constrainedX >= otherLeft && constrainedX <= otherRight &&
                    constrainedZ >= otherFront && constrainedZ <= otherBack &&
                    otherTop > maxSupportHeight) {
                    
                    supportObject = otherObj;
                    maxSupportHeight = otherTop + objectHeight / 2; // Object center on top of support
                    console.log(`  Found support object: ${otherObj.userData.fileName || 'unknown'} at height ${otherTop}`);
                }
            }
            
            constrainedY = maxSupportHeight;
            console.log(`  Final constrained Y with support: ${constrainedY}`);
        }
        
        return {
            x: constrainedX,
            y: constrainedY,
            z: constrainedZ
        };
    }

    /**
     * Set up the Christmas environment
     */
    setupEnvironment() {
        console.log('🎄 Setting up ChristmasLand world...');
        
        // Ground level for positioning
        this.groundLevelY = 0;
        
        // Initialize Christmas systems
        this.initializeChristmasSystems();
        
        // Create snow floor (replaces Dazzle floor)
        this.createSnowFloor();
        
        // PERFORMANCE OPTIMIZATION: Skip log cabin walls (not visible, red walls used instead)
        // this.createLogCabinWalls(); // Disabled for better performance
        
        // Create Christmas posters (inherits from Dazzle)
        this.createChristmasPosters();
        
        // Create Christmas decorations
        this.createChristmasDecorations();
        
        // Set up Christmas lighting
        this.setupChristmasLighting();
        
        // Create Christmas atmosphere
        this.setupChristmasAtmosphere();
        
        console.log('🎄 ChristmasLand world setup complete');
    }

    /**
     * Initialize Christmas-specific systems
     */
    initializeChristmasSystems() {
        console.log('🎄 Initializing Christmas systems...');
        
        // Initialize Christmas decorations
        if (typeof ChristmasDecorations !== 'undefined') {
            this.christmasDecorations = new ChristmasDecorations(this.THREE, this.scene, this.objects);
            console.log('🎄 Christmas decorations system initialized');
        } else {
            console.warn('⚠️ ChristmasDecorations module not available');
        }
        
        // Initialize log cabin walls
        if (typeof ChristmasLogCabin !== 'undefined') {
            this.logCabin = new ChristmasLogCabin(this.THREE, this.scene, this.objects);
            console.log('🏠 Log cabin system initialized');
        } else {
            console.warn('⚠️ ChristmasLogCabin module not available');
        }
        
        // Initialize Christmas lights
        if (typeof ChristmasLights !== 'undefined') {
            this.christmasLights = new ChristmasLights(this.THREE, this.scene);
            console.log('💡 Christmas lights system initialized');
        } else {
            console.warn('⚠️ ChristmasLights module not available');
        }
    }

    /**
     * Create snow floor (overrides Dazzle floor)
     */
    createSnowFloor() {
        console.log('❄️ Creating snow floor...');
        
        const floorSize = 300;
        const geometry = new this.THREE.PlaneGeometry(floorSize, floorSize);
        
        // Snow material
        const material = new this.THREE.MeshStandardMaterial({
            color: 0xFFFAFA, // Snow white
            roughness: 0.8,
            metalness: 0.1,
        });

        const floor = new this.THREE.Mesh(geometry, material);
        floor.position.set(0, 0, 0);
        floor.rotation.x = -Math.PI / 2; // Lie flat
        
        floor.userData = {
            templateObject: true,
            christmasFloor: true,
            snowFloor: true,
            preservePosition: true,
            type: 'christmas_snow_floor'
        };

        this.scene.add(floor);
        this.objects.push(floor);
        
        // Add snow texture variations
        this.addSnowVariations();
        
        console.log('❄️ Snow floor created');
    }

    /**
     * Add snow texture variations to the floor
     */
    addSnowVariations() {
        // Add some snow drifts and patterns
        const snowPatches = [
            { x: -60, z: -40, size: 20, depth: 0.5 },
            { x: 40, z: 30, size: 25, depth: 0.3 },
            { x: -30, z: 70, size: 15, depth: 0.7 },
            { x: 80, z: -20, size: 18, depth: 0.4 },
            { x: 0, z: -80, size: 30, depth: 0.6 },
        ];

        snowPatches.forEach((patch, index) => {
            const geometry = new this.THREE.CircleGeometry(patch.size, 12);
            const material = new this.THREE.MeshStandardMaterial({
                color: 0xFFFFF0, // Slightly warmer white
                roughness: 0.9,
            });

            const snowPatch = new this.THREE.Mesh(geometry, material);
            snowPatch.position.set(patch.x, patch.depth, patch.z);
            snowPatch.rotation.x = -Math.PI / 2;
            
            snowPatch.userData = {
                templateObject: true,
                christmasFloor: true,
                snowVariation: true,
                preservePosition: true,
                type: 'snow_patch'
            };

            this.scene.add(snowPatch);
            this.objects.push(snowPatch);
        });
    }

    /**
     * Create log cabin walls (overrides Dazzle walls)
     */
    createLogCabinWalls() {
        console.log('🏠 Creating ChristmasLand walls...');
        
        // Use red walls instead of log cabin to allow poster visibility
        this.createRedChristmasWalls();
        
        console.log('🏠 ChristmasLand walls created');
    }

    /**
     * Create Christmas decorations
     */
    createChristmasDecorations() {
        console.log('🎄 Creating Christmas decorations...');
        
        if (this.christmasDecorations) {
            this.christmasDecorations.addAllDecorations();
        } else {
            // Fallback simple Christmas decorations
            this.createFallbackChristmasDecorations();
        }
        
        console.log('🎄 Christmas decorations created');
    }

    /**
     * Set up Christmas lighting
     */
    setupChristmasLighting() {
        console.log('💡 Setting up Christmas lighting (performance optimized)...');
        
        // PERFORMANCE OPTIMIZATION: Use simple static lighting instead of complex animations
        this.createSimpleChristmasLighting();
        
        console.log('💡 Christmas lighting setup complete');
    }

    /**
     * PERFORMANCE OPTIMIZED: Simple static Christmas lighting (replaces complex animations)
     */
    createSimpleChristmasLighting() {
        console.log('💡 Creating simple Christmas lighting (static, no animations)...');
        
        // Basic ambient light (warm Christmas glow)
        const ambientLight = new this.THREE.AmbientLight(0xFFE4B5, 0.5); // Warm yellow
        this.scene.add(ambientLight);
        
        // Main directional light (soft winter sun)
        const directionalLight = new this.THREE.DirectionalLight(0xFFF8DC, 0.7); // Cornsilk
        directionalLight.position.set(30, 50, 30);
        directionalLight.target.position.set(0, 0, 0);
        this.scene.add(directionalLight);
        this.scene.add(directionalLight.target);
        
        // Simple fireplace glow (static, no flicker)
        const fireplaceLight = new this.THREE.PointLight(0xFF4500, 1.2, 60); // Orange-red
        fireplaceLight.position.set(0, 10, -145); // Fireplace position
        this.scene.add(fireplaceLight);
        
        console.log('💡 Simple Christmas lighting created - no animations, better performance');
    }

    /**
     * Set up Christmas atmosphere
     */
    setupChristmasAtmosphere() {
        console.log('🎄 Setting up Christmas atmosphere (performance optimized)...');
        
        // PERFORMANCE OPTIMIZATION: No fog needed - keep ChristmasLand bright and cheerful
        // this.scene.fog = new this.THREE.Fog(0xF0F8FF, 80, 300); // Disabled for better performance
        
        console.log('🎄 Christmas atmosphere established (no fog for better performance)');
    }

    /**
     * Create bedroom posters (inherits from Dazzle - same poster system)
     */
    createBedroomPosters() {
        console.log('🖼️ Creating Christmas posters (using Dazzle system)...');
        
        try {
            // Check if BedroomDecorations class is available
            if (typeof BedroomDecorations !== 'undefined') {
                const decorations = new BedroomDecorations(this.THREE, this.scene, this.objects);
                decorations.addPosters();
                console.log('✨ Christmas posters created via BedroomDecorations module');
            } else {
                console.log('⚠️ BedroomDecorations module not loaded, creating posters directly...');
                this.createPostersDirectly();
            }
        } catch (error) {
            console.error('❌ Error creating Christmas posters:', error);
            console.log('🔄 Fallback: Creating simple posters...');
            this.createSimplePosters();
        }
        
        console.log('🖼️ Christmas posters created with full Dazzle functionality');
    }

    /**
     * Create posters directly using PosterCreator
     */
    createPostersDirectly() {
        // Use new GlobalPosterManager system
        if (typeof SimplifiedPosterCreator !== 'undefined') {
            console.log('🎄 Creating Christmas posters with new system...');
            
            // Create poster positions for Christmas world
            const posterPositions = [
                { position: new this.THREE.Vector3(-2, 2, -4.95), posterType: 'christmas-wall-1' },
                { position: new this.THREE.Vector3(2, 2, -4.95), posterType: 'christmas-wall-2' },
                { position: new this.THREE.Vector3(-4.95, 2, 2), posterType: 'christmas-left-1' },
                { position: new this.THREE.Vector3(-4.95, 2, -2), posterType: 'christmas-left-2' }
            ];
            
            const createdPosters = SimplifiedPosterCreator.quickSetup(
                'christmas', 
                posterPositions, 
                this.THREE, 
                this.scene, 
                this.objects
            );
            
            console.log(`✅ Created ${createdPosters.length} posters for Christmas world`);
        } else {
            console.warn('⚠️ SimplifiedPosterCreator not available, falling back to simple posters');
            this.createSimplePosters();
        }
    }

    /**
     * Create simple fallback posters
     */
    createSimplePosters() {
        // Simple fallback poster creation with proper positions and 16:9 aspect ratio
        console.log('🎨 Creating simple Christmas posters...');
        
        const posterConfigs = [
            { 
                pos: new this.THREE.Vector3(0, 35, -146), // Back wall - inside surface (wall at z=-148)
                rot: 0, 
                text: '🎄 CHRISTMAS',
                color: 0x228B22 
            },
            { 
                pos: new this.THREE.Vector3(-40, 35, 146), // Front wall - inside surface (wall at z=148)
                rot: Math.PI, 
                text: '🎅 SANTA',
                color: 0xDC143C 
            },
            { 
                pos: new this.THREE.Vector3(-146, 35, 0), // Left wall - inside surface (wall at x=-148)
                rot: Math.PI / 2, 
                text: '❄️ WINTER',
                color: 0x87CEEB 
            },
            { 
                pos: new this.THREE.Vector3(146, 35, -50), // Right wall - inside surface (wall at x=148)
                rot: -Math.PI / 2, 
                text: '🎁 GIFTS',
                color: 0xFFD700 
            }
        ];

        posterConfigs.forEach((config, index) => {
            // Use 16:9 aspect ratio like YouTube thumbnails
            const aspectRatio = 16/9;
            const width = 80; // Large width for visibility
            const height = width / aspectRatio;  // Maintain 16:9 ratio
            
            const geometry = new this.THREE.PlaneGeometry(width, height);
            const material = new this.THREE.MeshStandardMaterial({
                color: config.color,
                transparent: false
            });

            const poster = new this.THREE.Mesh(geometry, material);
            poster.position.copy(config.pos);
            poster.rotation.y = config.rot;
            poster.userData = {
                templateObject: true,
                isPoster: true,
                posterText: config.text,
                roomElement: true,
                type: 'poster', // Required for raycaster detection
                interactable: true,
                preservePosition: true, // Prevent gravity from affecting posters
                isWallMounted: true, // Additional flag for wall-mounted objects
                posterType: config.text.toLowerCase().split(' ')[0], // Extract poster type from text
                hasDoubleTabInteraction: true // Enable double-tap interactions
            };

            this.scene.add(poster);
            this.objects.push(poster);
            
            // Add to fileObjects for raycaster detection
            if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
                window.app.stateManager.fileObjects.push(poster);
                console.log('🖼️ Christmas poster added to raycaster detection system');
            } else {
                console.warn('⚠️ Could not add Christmas poster to raycaster system - stateManager not available');
            }
            
            console.log(`🖼️ Christmas poster "${config.text}" created at (${config.pos.x}, ${config.pos.y}, ${config.pos.z})`);
        });

        console.log('🎄 Christmas posters created as fallback with 16:9 aspect ratio');
        
        // Register simple posters with GlobalPosterManager
        if (typeof window !== 'undefined' && window.globalPosterManager) {
            // Notify GlobalPosterManager about created posters
            this.objects.forEach(obj => {
                if (obj.userData && obj.userData.isPoster) {
                    window.globalPosterManager.registerPoster(obj, 'christmas');
                }
            });
            
            // Trigger poster restoration
            setTimeout(() => {
                window.globalPosterManager.restoreWorldPosters('christmas');
            }, 100);
            
            console.log('🖱️ Christmas poster interactions enabled');
        } else {
            console.warn('⚠️ GlobalPosterManager not available for Christmas posters');
        }
    }

    /**
     * Create red Christmas walls (replaces log cabin for poster visibility)
     */
    createRedChristmasWalls() {
        console.log('🏠 Creating red Christmas walls for poster visibility...');
        
        const wallHeight = 60; // Raised height to match the updated log cabin
        const walls = [
            // Back wall
            { x: 0, z: -149, width: 298, height: wallHeight, rotation: 0 },
            // Front wall (with door gap) - exact DazzleBedroom positioning
            { x: -75, z: 149, width: 150, height: wallHeight, rotation: 0 },
            { x: 75, z: 149, width: 150, height: wallHeight, rotation: 0 },
            // Left wall
            { x: -149, z: 0, width: 298, height: wallHeight, rotation: Math.PI / 2 },
            // Right wall
            { x: 149, z: 0, width: 298, height: wallHeight, rotation: Math.PI / 2 },
        ];

        walls.forEach((wall, index) => {
            const geometry = new this.THREE.PlaneGeometry(wall.width, wall.height);
            const material = new this.THREE.MeshStandardMaterial({
                color: 0xDC143C, // Crimson red - festive Christmas color
                roughness: 0.6,
                metalness: 0.1,
                side: this.THREE.DoubleSide // Make walls visible from both sides
            });

            const wallMesh = new this.THREE.Mesh(geometry, material);
            wallMesh.position.set(wall.x, wall.height / 2, wall.z);
            wallMesh.rotation.y = wall.rotation;
            
            wallMesh.userData = {
                templateObject: true,
                christmasWall: true,
                redWall: true,
                posterSurface: true, // Mark as surface that can hold posters
                preservePosition: true,
                type: 'christmas_red_wall'
            };

            this.scene.add(wallMesh);
            this.objects.push(wallMesh);
        });
        
        // Add some Christmas decorative elements to the walls
        this.addWallDecorations();
        
        // Create a simple ceiling to replace the complex log cabin roof
        this.createRedCeiling();
        
        console.log('🏠 Red Christmas walls created - posters will be visible!');
    }

    /**
     * Add Christmas decorative elements to the red walls
     */
    addWallDecorations() {
        console.log('🎄 Adding wall decorations...');
        
        // Add some festive trim around the walls
        const trimPositions = [
            // Horizontal trim along top of walls
            { x: 0, y: 60, z: -149, width: 300, height: 4, rotation: 0 },
            { x: 0, y: 60, z: 149, width: 300, height: 4, rotation: 0 },
            { x: -149, y: 60, z: 0, width: 300, height: 4, rotation: Math.PI / 2 },
            { x: 149, y: 60, z: 0, width: 300, height: 4, rotation: Math.PI / 2 },
        ];

        trimPositions.forEach((trim, index) => {
            const geometry = new this.THREE.PlaneGeometry(trim.width, trim.height);
            const material = new this.THREE.MeshStandardMaterial({
                color: 0xFFD700, // Gold trim for elegance
                roughness: 0.3,
                metalness: 0.4,
            });

            const trimMesh = new this.THREE.Mesh(geometry, material);
            trimMesh.position.set(trim.x, trim.y, trim.z);
            trimMesh.rotation.y = trim.rotation;
            
            trimMesh.userData = {
                templateObject: true,
                christmasDecoration: true,
                wallTrim: true,
                preservePosition: true,
                type: 'christmas_wall_trim'
            };

            this.scene.add(trimMesh);
            this.objects.push(trimMesh);
        });
        
        console.log('🎄 Wall decorations added');
    }

    /**
     * Create a simple red ceiling
     */
    createRedCeiling() {
        console.log('🏠 Creating red ceiling...');
        
        const ceilingGeometry = new this.THREE.PlaneGeometry(300, 300);
        const ceilingMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xB22222, // Darker red for ceiling
            roughness: 0.7,
            metalness: 0.1,
        });

        const ceiling = new this.THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.position.set(0, 65, 0); // Higher ceiling at Y=65
        ceiling.rotation.x = Math.PI / 2; // Face down
        
        ceiling.userData = {
            templateObject: true,
            christmasDecoration: true,
            ceiling: true,
            preservePosition: true,
            type: 'christmas_ceiling'
        };

        this.scene.add(ceiling);
        this.objects.push(ceiling);
        
        console.log('🏠 Red ceiling created');
    }

    /**
     * Fallback Christmas walls
     */
    createFallbackChristmasWalls() {
        console.log('🏠 Creating fallback Christmas walls...');
        
        const walls = [
            // Back wall
            { x: 0, z: -149, width: 298, height: 40, rotation: 0 },
            // Front wall (with door gap)
            { x: -75, z: 149, width: 148, height: 40, rotation: 0 },
            { x: 75, z: 149, width: 148, height: 40, rotation: 0 },
            // Left wall
            { x: -149, z: 0, width: 298, height: 40, rotation: Math.PI / 2 },
            // Right wall
            { x: 149, z: 0, width: 298, height: 40, rotation: Math.PI / 2 },
        ];

        walls.forEach((wall, index) => {
            const geometry = new this.THREE.PlaneGeometry(wall.width, wall.height);
            const material = new this.THREE.MeshStandardMaterial({
                color: 0x8B4513, // Brown wood
                roughness: 0.8,
            });

            const wallMesh = new this.THREE.Mesh(geometry, material);
            wallMesh.position.set(wall.x, wall.height / 2, wall.z);
            wallMesh.rotation.y = wall.rotation;
            
            wallMesh.userData = {
                templateObject: true,
                christmasWall: true,
                fallbackWall: true,
                preservePosition: true,
                type: 'christmas_wall'
            };

            this.scene.add(wallMesh);
            this.objects.push(wallMesh);
        });
    }

    /**
     * Fallback Christmas decorations
     */
    createFallbackChristmasDecorations() {
        console.log('🎄 Creating fallback Christmas decorations...');
        
        // Simple Christmas tree
        const treeGeometry = new this.THREE.ConeGeometry(8, 20, 8);
        const treeMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x0F5132, // Dark green
        });
        
        const tree = new this.THREE.Mesh(treeGeometry, treeMaterial);
        tree.position.set(-80, 10, -80);
        
        tree.userData = {
            templateObject: true,
            christmasDecoration: true,
            fallbackTree: true,
            type: 'fallback_christmas_tree'
        };
        
        this.scene.add(tree);
        this.objects.push(tree);
        
        // Simple snowman
        const snowmanGeometry = new this.THREE.SphereGeometry(6, 12, 8);
        const snowmanMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFFAFA,
        });
        
        const snowman = new this.THREE.Mesh(snowmanGeometry, snowmanMaterial);
        snowman.position.set(0, 6, 20);
        
        snowman.userData = {
            templateObject: true,
            christmasDecoration: true,
            fallbackSnowman: true,
            type: 'fallback_snowman'
        };
        
        this.scene.add(snowman);
        this.objects.push(snowman);
    }

    /**
     * Fallback Christmas lighting
     */
    createFallbackChristmasLighting() {
        console.log('💡 Creating fallback Christmas lighting...');
        
        // Warm ambient light
        const ambientLight = new this.THREE.AmbientLight(0xFFE4B5, 0.4);
        this.scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new this.THREE.DirectionalLight(0xFFF8DC, 0.6);
        directionalLight.position.set(30, 50, 30);
        this.scene.add(directionalLight);
        
        // Fireplace glow
        const fireplaceLight = new this.THREE.PointLight(0xFF4500, 1.0, 50);
        fireplaceLight.position.set(0, 10, -140);
        this.scene.add(fireplaceLight);
    }

    /**
     * Cleanup method for when switching away from Christmas world
     */
    cleanup() {
        console.log('🧹 Cleaning up ChristmasLand world...');
        
        // Cleanup Christmas lighting animations
        if (this.christmasLights && this.christmasLights.cleanup) {
            this.christmasLights.cleanup();
        }
        
        // Call parent cleanup (includes poster system cleanup)
        if (super.cleanup) {
            super.cleanup();
        }
        
        console.log('🧹 ChristmasLand cleanup complete');
    }

    /**
     * Get world-specific information
     */
    getWorldInfo() {
        return {
            type: 'christmas',
            name: 'ChristmasLand',
            description: 'Festive Christmas world with red walls and holiday decorations - poster friendly',
            isPremium: true,
            features: [
                'Snow floor with natural variations',
                'Festive red walls with gold trim (poster-friendly)',
                'Higher ceiling for spacious feel',
                'Christmas tree with lights and ornaments',
                'Cozy fireplace with animated fire',
                'Snowman with carrot nose and stick arms',
                'Santa\'s house with snow-covered roof',
                'North Pole with candy cane stripes',
                'Animated Christmas lights and twinkling effects',
                'Full poster system (inherited from Dazzle Bedroom)',
                'Warm winter atmosphere with soft fog'
            ],
            baseWorld: 'Dazzle Bedroom',
            lighting: 'Warm Christmas lighting with animated effects',
            atmosphere: 'Festive winter holiday cabin'
        };
    }

    /**
     * Check if this world supports a specific feature
     */
    supportsFeature(featureName) {
        const supportedFeatures = [
            'poster_system',        // Inherited from Dazzle
            'poster_persistence',   // Inherited from Dazzle
            'room_environment',     // Inherited concept but Christmas themed
            'christmas_decorations', // Christmas-specific
            'animated_lighting',    // Christmas-specific
            'snow_floor',          // Christmas-specific
            'log_cabin_walls',     // Christmas-specific
            'winter_atmosphere',   // Christmas-specific
        ];
        
        return supportedFeatures.includes(featureName);
    }

    /**
     * Get Christmas-specific interaction points
     */
    getInteractionPoints() {
        return [
            {
                name: 'Christmas Tree',
                position: { x: -80, z: -80 },
                description: 'Decorated Christmas tree with lights and ornaments'
            },
            {
                name: 'Fireplace',
                position: { x: 0, z: -145 },
                description: 'Cozy fireplace with animated fire'
            },
            {
                name: 'Snowman',
                position: { x: 0, z: 20 },
                description: 'Friendly snowman with carrot nose'
            },
            {
                name: 'Santa\'s House',
                position: { x: 80, z: 80 },
                description: 'Charming cottage with snow-covered roof'
            },
            {
                name: 'North Pole',
                position: { x: 100, z: 60 },
                description: 'Red and white striped North Pole marker'
            }
        ];
    }

    createChristmasPosters() {
        console.log('🎄 Creating Christmas posters with new GlobalPosterManager system...');
        
        try {
            // Use new simplified poster system
            this.createPostersWithGlobalManager();
        } catch (error) {
            console.error('❌ Error creating Christmas posters with new system:', error);
            console.log('🔄 Fallback: Creating legacy Christmas posters...');
            this.createLegacyChristmasPosters();
        }
    }

    /**
     * Create Christmas posters using the new GlobalPosterManager system
     */
    async createPostersWithGlobalManager() {
        console.log('� Creating Christmas posters with GlobalPosterManager...');
        
        // Define poster configurations for Christmas world
        // NOTE: posterType will be auto-generated from position by SimplifiedPosterCreator
        const posterConfigs = [
            {
                position: new this.THREE.Vector3(0, 50, -147), // CENTER of back wall
                rotation: 0,
                width: 80
            },
            {
                position: new this.THREE.Vector3(-40, 50, 147), // LEFT side of front wall
                rotation: Math.PI,
                width: 80
            },
            {
                position: new this.THREE.Vector3(-147, 50, 0), // CENTER of left wall
                rotation: Math.PI / 2,
                width: 80
            },
            {
                position: new this.THREE.Vector3(147, 50, -50), // RIGHT wall
                rotation: -Math.PI / 2,
                width: 80
            }
        ];
        
        // Create candy cane poles first (decorative elements)
        posterConfigs.forEach(config => {
            const polePosition = new this.THREE.Vector3(config.position.x, 0, config.position.z);
            this.createCandyCanePole(polePosition, 45);
        });
        
        try {
            // Check if PosterSystemInitializer is available
            if (typeof PosterSystemInitializer !== 'undefined') {
                const posters = await PosterSystemInitializer.createPostersForWorld(
                    this.THREE, 
                    this.scene, 
                    this.objects, 
                    'christmas', 
                    posterConfigs
                );
                console.log(`🎄 Created ${posters.length} Christmas posters with GlobalPosterManager`);
            } else {
                console.warn('⚠️ PosterSystemInitializer not available, using fallback...');
                this.createLegacyChristmasPosters();
            }
        } catch (error) {
            console.error('❌ Error with GlobalPosterManager poster creation:', error);
            this.createLegacyChristmasPosters();
        }
    }

    /**
     * Legacy Christmas poster creation (fallback)
     */
    createLegacyChristmasPosters() {
        console.log('🔄 Using legacy Christmas poster creation system...');
        
        const posterConfigs = [
            { 
                pos: new this.THREE.Vector3(0, 50, -147), // CENTER of back wall - IN FRONT of wall (wall at -149)
                rot: 0, 
                text: '🎄 CHRISTMAS',
                color: 0xFFFFFF // White - no tint for image previews
            },
            { 
                pos: new this.THREE.Vector3(-40, 50, 147), // LEFT side of front wall - IN FRONT of wall (wall at 149)
                rot: Math.PI, 
                text: '🎅 SANTA',
                color: 0xFFFFFF // White - no tint for image previews
            },
            { 
                pos: new this.THREE.Vector3(-147, 50, 0), // CENTER of left wall - IN FRONT of wall (wall at -149)
                rot: Math.PI / 2, 
                text: '⛄ SNOWMAN',
                color: 0xFFFFFF // White - no tint for image previews
            },
            { 
                pos: new this.THREE.Vector3(147, 50, -50), // RIGHT wall - IN FRONT of wall (wall at 149)
                rot: -Math.PI / 2, 
                text: '🎁 GIFTS',
                color: 0xFFFFFF // White - no tint for image previews
            }
        ];

        posterConfigs.forEach((config, index) => {
            // Create candy cane pole support for this poster
            const polePosition = new this.THREE.Vector3(config.pos.x, 0, config.pos.z);
            this.createCandyCanePole(polePosition, 45); // Pole extends from ground to just below poster
            
            // Use 16:9 aspect ratio like YouTube thumbnails
            const aspectRatio = 16/9;
            const width = 80; // 2x larger width (was 40)
            const height = width / aspectRatio;  // Maintain 16:9 ratio
            
            const geometry = new this.THREE.PlaneGeometry(width, height);
            const material = new this.THREE.MeshStandardMaterial({
                color: config.color,
                transparent: false
            });

            const poster = new this.THREE.Mesh(geometry, material);
            poster.position.copy(config.pos);
            poster.rotation.y = config.rot;
            poster.userData = {
                templateObject: true,
                isPoster: true,
                posterText: config.text,
                roomElement: true,
                type: 'poster', // Required for raycaster detection
                interactable: true,
                preservePosition: true, // Prevent gravity from affecting posters
                isPoleSupported: true, // Updated flag for pole-supported objects (was isWallMounted)
                posterType: config.text.toLowerCase().split(' ')[0] // Extract poster type from text
            };

            this.scene.add(poster);
            this.objects.push(poster);
            
            // Add to fileObjects for raycaster detection
            if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
                window.app.stateManager.fileObjects.push(poster);
                console.log('🖼️ Legacy Christmas poster added to raycaster detection system');
            } else {
                console.warn('⚠️ Could not add Christmas poster to raycaster system - stateManager not available');
            }
            
            console.log(`🖼️ Legacy Christmas poster "${config.text}" created at (${config.pos.x}, ${config.pos.y}, ${config.pos.z}) with candy cane pole support`);
        });

        console.log('🎄 Legacy Christmas posters created with candy cane pole supports and 16:9 aspect ratio');
        
        // Register legacy posters with GlobalPosterManager
        if (typeof window !== 'undefined' && window.globalPosterManager) {
            // Notify GlobalPosterManager about created posters
            this.objects.forEach(obj => {
                if (obj.userData && obj.userData.isPoster) {
                    window.globalPosterManager.registerPoster(obj, 'christmas');
                }
            });
            
            // Trigger poster restoration
            setTimeout(() => {
                window.globalPosterManager.restoreWorldPosters('christmas');
            }, 100);
        }
    }

    /**
     * Create candy cane striped pole for poster support
     * @param {THREE.Vector3} position - Position for the pole
     * @param {number} height - Height of the pole
     */
    createCandyCanePole(position, height = 45) {
        console.log(`🍭 Creating candy cane pole at (${position.x}, 0, ${position.z})`);
        
        const poleGroup = new this.THREE.Group();
        const stripeHeight = 4; // Height of each stripe segment
        const numStripes = Math.ceil(height / stripeHeight);
        
        for (let i = 0; i < numStripes; i++) {
            const isRed = i % 2 === 0;
            const segmentHeight = Math.min(stripeHeight, height - (i * stripeHeight));
            
            const segmentGeometry = new this.THREE.CylinderGeometry(2, 2, segmentHeight, 8);
            const segmentMaterial = new this.THREE.MeshStandardMaterial({
                color: isRed ? 0xFF0000 : 0xFFFFFF, // Alternating red and white stripes
            });
            
            const segment = new this.THREE.Mesh(segmentGeometry, segmentMaterial);
            segment.position.y = (i * stripeHeight) + (segmentHeight / 2);
            
            segment.userData = {
                templateObject: true,
                christmasDecoration: true,
                candyCanePole: true,
                posterSupport: true,
                preservePosition: true,
                type: 'candy_cane_pole'
            };
            
            poleGroup.add(segment);
        }
        
        poleGroup.position.set(position.x, 0, position.z);
        
        this.scene.add(poleGroup);
        this.objects.push(poleGroup);
        
        console.log(`🍭 Candy cane pole created with ${numStripes} stripes`);
        return poleGroup;
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ChristmasLandWorldTemplate = ChristmasLandWorldTemplate;
    console.log('🎄 ChristmasLand World Template class loaded successfully!');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChristmasLandWorldTemplate;
}