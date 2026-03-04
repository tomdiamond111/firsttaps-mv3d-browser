// modules/worlds/recordStoreWorld.js
// Record Store World Template - Media browsing metaphor
// Dependencies: THREE (global), BaseWorldTemplate

(function() {
    'use strict';
    
    console.log("Loading RecordStoreWorld module...");
    
    /**
     * RECORD STORE WORLD TEMPLATE
     * A warm, inviting space that uses the familiar metaphor of browsing a record/media store
     * Perfect default world - users immediately understand how to organize and browse their collection
     */
    class RecordStoreWorldTemplate extends window.BaseWorldTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                // Warm record store lighting - tungsten/incandescent bulb feel
                ambientLightColor: 0x605040, // Warm amber
                ambientLightIntensity: 0.5,
                directionalLightColor: 0xFFD699, // Warm white with orange tint
                directionalLightIntensity: 0.7,
                ...config
            });
        }

        setupEnvironment() {
            console.log('=== SETTING UP RECORD STORE WORLD ===');
            
            // Ground level
            this.groundLevelY = 0;
            
            // HARDWOOD FLOOR - OPTIMIZED: Single textured plane instead of 2,300+ individual planks
            const floorWidth = 154;
            const floorDepth = 187;
            
            // Create single floor plane with vertex colors for plank variation
            const floorGeometry = new this.THREE.PlaneGeometry(floorWidth, floorDepth, 20, 20);
            
            // Add color variation to simulate wood planks
            const colors = new Float32Array(floorGeometry.attributes.position.count * 3);
            const baseWoodColors = [
                new this.THREE.Color(0x6B4E2C),
                new this.THREE.Color(0x7A5832),
                new this.THREE.Color(0x654020),
                new this.THREE.Color(0x5A4020)
            ];
            
            for (let i = 0; i < floorGeometry.attributes.position.count; i++) {
                const woodColor = baseWoodColors[Math.floor(Math.random() * baseWoodColors.length)].clone();
                const brightness = 0.9 + Math.random() * 0.2;
                woodColor.multiplyScalar(brightness);
                
                colors[i * 3] = woodColor.r;
                colors[i * 3 + 1] = woodColor.g;
                colors[i * 3 + 2] = woodColor.b;
            }
            
            floorGeometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
            
            const floorMaterial = new this.THREE.MeshStandardMaterial({
                vertexColors: true,
                metalness: 0.05,
                roughness: 0.7
            });
            
            const floor = new this.THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -0.01;
            floor.receiveShadow = true;
            floor.userData.templateObject = true;
            this.scene.add(floor);
            this.objects.push(floor);

            // Add warm atmosphere
            this.scene.fog = new this.THREE.Fog(0x4A3520, 150, 400);
            
            // Create retro record store environment
            this.createStoreWalls();
            this.createCeiling();
            this.createSideShelves();
            this.createRecordBins();
            
            console.log('Record store world setup complete');
        }

        createStoreWalls() {
            // Off-white painted walls
            const wallMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xF5F3E8, // Off-white
                side: this.THREE.DoubleSide,
                metalness: 0.05,
                roughness: 0.85
            });

            const storeWidth = 154; // Expanded 10%
            const storeDepth = 187; // Extended for back wall
            const wallHeight = 160; // OPTIMIZED: Raised ceiling to avoid visibility from aerial camera (140)

            // BACK WALL with door and window
            const backWallGroup = new this.THREE.Group();
            
            // Main back wall sections (around door)
            const backWallLeft = new this.THREE.Mesh(
                new this.THREE.PlaneGeometry(50, wallHeight),
                wallMaterial
            );
            backWallLeft.position.set(-45, wallHeight / 2, -storeDepth / 2);
            backWallGroup.add(backWallLeft);
            
            const backWallRight = new this.THREE.Mesh(
                new this.THREE.PlaneGeometry(50, wallHeight),
                wallMaterial
            );
            backWallRight.position.set(45, wallHeight / 2, -storeDepth / 2);
            backWallGroup.add(backWallRight);
            
            // Wood door
            const doorMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x5A4020,
                metalness: 0.1,
                roughness: 0.8
            });
            const door = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(8, 15, 0.5),
                doorMaterial
            );
            door.position.set(-15, 7.5, -storeDepth / 2);
            backWallGroup.add(door);
            
            // Office window
            const windowFrame = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(6, 4, 0.3),
                new this.THREE.MeshStandardMaterial({ color: 0x3A2A1A })
            );
            windowFrame.position.set(8, 35, -storeDepth / 2);
            backWallGroup.add(windowFrame);
            
            const windowGlass = new this.THREE.Mesh(
                new this.THREE.PlaneGeometry(5, 3),
                new this.THREE.MeshStandardMaterial({ 
                    color: 0x88AACC,
                    transparent: true,
                    opacity: 0.4,
                    metalness: 0.5,
                    roughness: 0.1
                })
            );
            windowGlass.position.set(8, 35, -storeDepth / 2 + 0.2);
            backWallGroup.add(windowGlass);
            
            backWallGroup.userData.templateObject = true;
            this.scene.add(backWallGroup);
            this.objects.push(backWallGroup);

            // LEFT WALL
            const leftWall = new this.THREE.Mesh(
                new this.THREE.PlaneGeometry(storeDepth, wallHeight),
                wallMaterial
            );
            leftWall.position.set(-storeWidth / 2, wallHeight / 2, 0);
            leftWall.rotation.y = Math.PI / 2;
            leftWall.userData.templateObject = true;
            this.scene.add(leftWall);
            this.objects.push(leftWall);

            // RIGHT WALL
            const rightWall = new this.THREE.Mesh(
                new this.THREE.PlaneGeometry(storeDepth, wallHeight),
                wallMaterial
            );
            rightWall.position.set(storeWidth / 2, wallHeight / 2, 0);
            rightWall.rotation.y = -Math.PI / 2;
            rightWall.userData.templateObject = true;
            this.scene.add(rightWall);
            this.objects.push(rightWall);

            // FRONT WALL with storefront windows and neon sign
            const frontWallGroup = new this.THREE.Group();
            
            // Wall sections above windows
            const frontWallTop = new this.THREE.Mesh(
                new this.THREE.PlaneGeometry(storeWidth, 33),
                wallMaterial
            );
            frontWallTop.position.set(0, 33.5, storeDepth / 2);
            frontWallTop.rotation.y = Math.PI;
            frontWallGroup.add(frontWallTop);
            
            // Wall sections below windows
            const frontWallBottom = new this.THREE.Mesh(
                new this.THREE.PlaneGeometry(storeWidth, 3),
                wallMaterial
            );
            frontWallBottom.position.set(0, 1.5, storeDepth / 2);
            frontWallBottom.rotation.y = Math.PI;
            frontWallGroup.add(frontWallBottom);
            
            // Large storefront windows
            const windowWidth = 30;
            const windowHeight = 14;
            const windowY = 10;
            
            // Left window
            const leftWindowFrame = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(windowWidth + 0.5, windowHeight + 0.5, 0.3),
                new this.THREE.MeshStandardMaterial({ color: 0x2A2A2A })
            );
            leftWindowFrame.position.set(-35, windowY, storeDepth / 2);
            frontWallGroup.add(leftWindowFrame);
            
            const leftWindow = new this.THREE.Mesh(
                new this.THREE.PlaneGeometry(windowWidth, windowHeight),
                new this.THREE.MeshStandardMaterial({ 
                    color: 0xAADDFF,
                    transparent: true,
                    opacity: 0.3,
                    metalness: 0.5,
                    roughness: 0.1
                })
            );
            leftWindow.position.set(-35, windowY, storeDepth / 2 + 0.2);
            frontWallGroup.add(leftWindow);
            
            // Right window
            const rightWindowFrame = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(windowWidth + 0.5, windowHeight + 0.5, 0.3),
                new this.THREE.MeshStandardMaterial({ color: 0x2A2A2A })
            );
            rightWindowFrame.position.set(35, windowY, storeDepth / 2);
            frontWallGroup.add(rightWindowFrame);
            
            const rightWindow = new this.THREE.Mesh(
                new this.THREE.PlaneGeometry(windowWidth, windowHeight),
                new this.THREE.MeshStandardMaterial({ 
                    color: 0xAADDFF,
                    transparent: true,
                    opacity: 0.3,
                    metalness: 0.5,
                    roughness: 0.1
                })
            );
            rightWindow.position.set(35, windowY, storeDepth / 2 + 0.2);
            frontWallGroup.add(rightWindow);
            
            // Center entrance area
            const entranceMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x2A2A2A,
                metalness: 0.3,
                roughness: 0.7
            });
            const entranceFrame = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(20, 18, 0.3),
                entranceMaterial
            );
            entranceFrame.position.set(0, 9, storeDepth / 2);
            frontWallGroup.add(entranceFrame);
            
            // RED NEON SIGN - "RECORDS"
            const neonMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xFF0033,
                emissive: 0xFF0033,
                emissiveIntensity: 2,
                metalness: 0,
                roughness: 0
            });
            
            // Create neon tubes for "RECORDS" text
            const letterSpacing = 4;
            const startX = -letterSpacing * 3.5;
            const signY = 36;
            
            for (let i = 0; i < 7; i++) {
                const tube = new this.THREE.Mesh(
                    new this.THREE.CylinderGeometry(0.15, 0.15, 3, 8),
                    neonMaterial
                );
                tube.position.set(startX + i * letterSpacing, signY, storeDepth / 2 - 0.5);
                frontWallGroup.add(tube);
                
                // Add glow effect
                const glowLight = new this.THREE.PointLight(0xFF0033, 0.5, 10);
                glowLight.position.set(startX + i * letterSpacing, signY, storeDepth / 2 - 0.5);
                frontWallGroup.add(glowLight);
            }
            
            frontWallGroup.userData.templateObject = true;
            this.scene.add(frontWallGroup);
            this.objects.push(frontWallGroup);
        }

        createCeiling() {
            const storeWidth = 154; // Expanded 10%
            const storeDepth = 170; // Extended for front wall
            const ceilingHeight = 160; // OPTIMIZED: Raised above aerial camera view (140)
            
            // Industrial ceiling with exposed structure
            const ceilingGroup = new this.THREE.Group();
            
            // Ceiling panels
            const ceilingMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xD8D8D0,
                metalness: 0.1,
                roughness: 0.9
            });
            const ceiling = new this.THREE.Mesh(
                new this.THREE.PlaneGeometry(storeWidth, storeDepth),
                ceilingMaterial
            );
            ceiling.rotation.x = Math.PI / 2;
            ceiling.position.y = ceilingHeight;
            ceilingGroup.add(ceiling);
            
            // Exposed ductwork
            const ductMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.6,
                roughness: 0.4
            });
            
            // Main ducts running length of store
            for (let i = -2; i <= 2; i++) {
                if (i === 0) continue; // Skip center
                const duct = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(120, 1.5, 1.5),
                    ductMaterial
                );
                duct.position.set(0, ceilingHeight - 4, i * 20);
                ceilingGroup.add(duct);
            }
            
            // Cross ducts
            for (let i = -3; i <= 3; i++) {
                const duct = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(1.5, 1.5, 120),
                    ductMaterial
                );
                duct.position.set(i * 25, ceilingHeight - 4, 0);
                ceilingGroup.add(duct);
            }
            
            // Fluorescent light fixtures
            const fixtureMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xFFFFEE,
                emissive: 0xFFFFAA,
                emissiveIntensity: 0.8
            });
            
            for (let x = -2; x <= 2; x++) {
                for (let z = -2; z <= 2; z++) {
                    const fixture = new this.THREE.Mesh(
                        new this.THREE.BoxGeometry(8, 0.3, 1.5),
                        fixtureMaterial
                    );
                    fixture.position.set(x * 30, ceilingHeight - 2, z * 30);
                    ceilingGroup.add(fixture);
                    
                    // Add light source
                    const light = new this.THREE.PointLight(0xFFFFDD, 0.5, 50);
                    light.position.set(x * 30, ceilingHeight - 2, z * 30);
                    ceilingGroup.add(light);
                }
            }
            
            ceilingGroup.userData.templateObject = true;
            this.scene.add(ceilingGroup);
            this.objects.push(ceilingGroup);
        }

        createSideShelves() {
            // Darker shelf surface material for contrast
            const shelfSurfaceMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x3A2810, // Darker brown for visibility
                metalness: 0.15,
                roughness: 0.7
            });
            
            // Wood backing material
            const backingMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x5A4020,
                metalness: 0.1,
                roughness: 0.8
            });
            
            const shelfDepth = 5; // Wider for better interaction
            const shelfLength = 154; // Match expanded wall length
            const shelfHeight = 1.5; // Thicker for easier clicking
            const rowHeights = [5, 12]; // Only 2 lowest rows
            const wallX = 77; // Moved out 10%
            
            // LEFT WALL SHELVES (2 continuous long rows)
            for (let i = 0; i < 2; i++) {
                const shelf = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(shelfDepth, shelfHeight, shelfLength),
                    shelfSurfaceMaterial
                );
                shelf.position.set(-wallX + shelfDepth / 2, rowHeights[i], 0);
                shelf.userData.templateObject = true;
                shelf.userData.canPlaceObjects = true;
                this.scene.add(shelf);
                this.objects.push(shelf);
                
                // Add furniture marker for object placement (OPTIMIZED: reduced sphere segments)
                const markerGeometry = new this.THREE.SphereGeometry(0.3, 6, 6);
                const markerMaterial = new this.THREE.MeshBasicMaterial({
                    color: 0xFF6600,
                    transparent: true,
                    opacity: 0.0
                });
                const marker = new this.THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.set(-wallX + shelfDepth / 2, rowHeights[i] + shelfHeight / 2 + 0.2, 0);
                marker.userData.isSlotMarker = true;
                marker.userData.furnitureId = `left_shelf_row${i}`;
                marker.userData.slotIndex = 0;
                marker.userData.templateObject = true;
                this.scene.add(marker);
                this.objects.push(marker);
                
                // Back support panel
                const support = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(0.2, rowHeights[i] * 2, shelfLength),
                    backingMaterial
                );
                support.position.set(-wallX - 0.5, rowHeights[i] / 2, 0);
                support.userData.templateObject = true;
                this.scene.add(support);
                this.objects.push(support);
            }
            
            // RIGHT WALL SHELVES (2 continuous long rows)
            for (let i = 0; i < 2; i++) {
                const shelf = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(shelfDepth, shelfHeight, shelfLength),
                    shelfSurfaceMaterial
                );
                shelf.position.set(wallX - shelfDepth / 2, rowHeights[i], 0);
                shelf.userData.templateObject = true;
                shelf.userData.canPlaceObjects = true;
                this.scene.add(shelf);
                this.objects.push(shelf);
                
                // Add furniture marker for object placement (OPTIMIZED: reduced sphere segments)
                const markerGeometry = new this.THREE.SphereGeometry(0.3, 6, 6);
                const markerMaterial = new this.THREE.MeshBasicMaterial({
                    color: 0xFF6600,
                    transparent: true,
                    opacity: 0.0
                });
                const marker = new this.THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.set(wallX - shelfDepth / 2, rowHeights[i] + shelfHeight / 2 + 0.2, 0);
                marker.userData.isSlotMarker = true;
                marker.userData.furnitureId = `right_shelf_row${i}`;
                marker.userData.slotIndex = 0;
                marker.userData.templateObject = true;
                this.scene.add(marker);
                this.objects.push(marker);
                
                // Back support panel
                const support = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(0.2, rowHeights[i] * 2, shelfLength),
                    backingMaterial
                );
                support.position.set(wallX + 0.5, rowHeights[i] / 2, 0);
                support.userData.templateObject = true;
                this.scene.add(support);
                this.objects.push(support);
            }
        }

        createRecordBins() {
            // Center record bins (platforms for display) - oriented along Z axis
            const binMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x5A4020,
                metalness: 0.1,
                roughness: 0.8
            });
            
            const binWidth = 6; // Compact width
            const binLength = 12; // Shorter length like gallery platforms
            const binHeight = 3; // Lower height for easier climbing
            
            // 2 record bins closer to home area (like gallery platforms)
            const binPositions = [
                { x: -10, z: 5 },  // Left bin - much closer
                { x: 10, z: 5 }    // Right bin - much closer
            ];
            
            binPositions.forEach((pos, index) => {
                const bin = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(binWidth, binHeight, binLength),
                    binMaterial
                );
                bin.position.set(pos.x, binHeight / 2, pos.z);
                bin.userData.templateObject = true;
                bin.userData.canPlaceObjects = true;
                this.scene.add(bin);
                this.objects.push(bin);
                
                // Add furniture marker for object placement (OPTIMIZED: reduced sphere segments)
                const markerGeometry = new this.THREE.SphereGeometry(0.3, 6, 6);
                const markerMaterial = new this.THREE.MeshBasicMaterial({
                    color: 0xFF6600,
                    transparent: true,
                    opacity: 0.0
                });
                const marker = new this.THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.set(pos.x, binHeight + 0.2, pos.z);
                marker.userData.isSlotMarker = true;
                marker.userData.furnitureId = `record_bin_${index + 1}`;
                marker.userData.slotIndex = 0;
                marker.userData.templateObject = true;
                this.scene.add(marker);
                this.objects.push(marker);
            });
        }

        cleanup() {
            if (this.scene) {
                this.scene.fog = null;
            }
            super.cleanup();
        }

        getType() {
            return 'record-store';
        }

        getDisplayName() {
            return 'Record Store';
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

        getPositioningConstraints() {
            return {
                requiresSupport: true,  // Objects must sit on floor or furniture
                allowedStackingDirections: ['top'],
                worldBoundaries: {
                    x: { min: -70, max: 70 },
                    y: { min: 0, max: 160 }, // OPTIMIZED: Updated to match new ceiling height
                    z: { min: -75, max: 75 }
                }
            };
        }

        applyPositionConstraints(object, newPosition, allObjects = []) {
            // Use shared gravity + furniture marker detection from BaseWorldTemplate
            return this.applyGravityWithFurnitureSupport(object, newPosition, allObjects, this.groundLevelY);
        }

        // Suggest default furniture layout for this world
        static getDefaultFurnitureLayout() {
            return [
                {
                    type: 'bookshelf',
                    style: 'woodgrain',
                    position: { x: -40, y: 0, z: -30 },
                    rotation: 0,
                    name: 'Albums Section'
                },
                {
                    type: 'bookshelf',
                    style: 'woodgrain',
                    position: { x: 40, y: 0, z: -30 },
                    rotation: Math.PI,
                    name: 'Playlists Section'
                },
                {
                    type: 'gallery_wall',
                    style: 'marble',
                    position: { x: -50, y: 0, z: 20 },
                    rotation: Math.PI / 2,
                    name: 'Video Wall'
                },
                {
                    type: 'gallery_wall',
                    style: 'silver',
                    position: { x: 0, y: 0, z: -70 },
                    rotation: 0,
                    name: 'Featured Display'
                },
                {
                    type: 'riser',
                    style: 'woodgrain',
                    position: { x: 0, y: 0, z: 30 },
                    rotation: Math.PI,
                    name: 'Top Charts'
                },
                {
                    type: 'stage_small',
                    style: 'neon',
                    position: { x: 50, y: 0, z: 20 },
                    rotation: -Math.PI / 2,
                    name: 'New Releases'
                }
            ];
        }
    }
    
    // Export to global scope
    window.RecordStoreWorldTemplate = RecordStoreWorldTemplate;
    
    console.log("RecordStoreWorld module loaded");
})();
