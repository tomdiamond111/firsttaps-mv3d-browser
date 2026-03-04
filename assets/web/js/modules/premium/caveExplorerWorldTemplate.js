/**
 * CAVE EXPLORER WORLD TEMPLATE (Premium)
 * Self-contained cave environment world template
 * Features: stalagmites instead of trees, cave ceiling, water streams, dark atmosphere
 * Uses BaseWorldTemplate for independence from Forest Realm
 */

class CaveExplorerWorldTemplate extends BaseWorldTemplate {
    constructor(THREE, config = {}) {
        super(THREE, {
            ambientLightColor: 0x1A1A2E, // Very dark blue ambient
            ambientLightIntensity: 0.2,
            directionalLightColor: 0xFF8C42, // Warm torch-like light
            directionalLightIntensity: 0.4,
            ...config
        });
        
        // Cave-specific properties (properly tracked by parent)
        this.caveFloor = null;
        this.caveCeiling = null;
        this.caveFloorVariations = [];
        this.ceilingFormations = [];
        this.pointLights = [];
        this.originalFog = null;
        this.groundLevelY = 0; // Initialize ground level for movement constraints
        
        console.log('🕳️ Cave Explorer world template initialized - extending Forest Realm');
    }

    getType() {
        return 'cave';
    }

    getDisplayName() {
        return 'Cave Explorer';
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
        // Tighter constraints for cave environment
        controls.minDistance = 5.0;
        controls.maxDistance = 80.0;
        controls.maxPolarAngle = Math.PI * 0.8; // Prevent camera from going too low
        controls.minPolarAngle = Math.PI * 0.1; // Prevent camera from going too high (ceiling)
    }

    /**
     * Cave realm supports vertical movement through stalagmite support creation
     * EXACT COPY from Forest Realm functionality
     */
    supportsVerticalMovement() {
        return true;
    }

    /**
     * Cave positioning constraints - copied from Forest Realm
     */
    getPositioningConstraints() {
        return {
            requiresSupport: true, // Objects need support (ground or stalagmite)
            allowedStackingDirections: ['top', 'trunk'], // Special stalagmite stacking
            worldBoundaries: {
                x: { min: -150, max: 150 },
                y: { min: 0, max: 30 }, // Cave floor is Y=0, ceiling at Y=30
                z: { min: -150, max: 150 }
            }
        };
    }

    /**
     * Cave positioning logic - adapted from Forest Realm for stalagmite support
     */
    applyPositionConstraints(object, newPosition, allObjects = []) {
        const constraints = this.getPositioningConstraints();
        
        console.log(`Cave realm constraints for ${object.userData.fileName || 'unknown'}:`);
        console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
        console.log(`  World boundaries:`, constraints.worldBoundaries);
        
        // Apply X and Z boundary constraints
        let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
        let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
        
        // Get object height for proper positioning
        const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
        
        // Ensure objectHeight is a valid number
        const safeObjectHeight = isNaN(objectHeight) || objectHeight === null || objectHeight === undefined ? 1 : objectHeight;
        
        // Ensure groundLevelY is set (fallback to 0 if not initialized)
        const safeGroundLevelY = isNaN(this.groundLevelY) || this.groundLevelY === null || this.groundLevelY === undefined ? 0 : this.groundLevelY;
        
        // CAVE REALM RULE: Objects cannot go below ground level (Y=0)
        let constrainedY = Math.max(safeGroundLevelY, newPosition.y); // Minimum Y is groundLevel (0)
        constrainedY = Math.min(constraints.worldBoundaries.y.max, constrainedY); // Maximum Y is 100
        
        // Check if stacking is enabled and this position is intentional
        const stackingEnabled = window.app?.sortingManager?.stackingConfig?.enabled;
        const isStackedPosition = constrainedY > (safeGroundLevelY + safeObjectHeight / 2 + 0.1); // More than ground level + object center height + tolerance
        
        // CAVE REALM SUPPORT LOGIC (same as Forest Realm)
        if (constraints.requiresSupport && allObjects.length > 0 && !(stackingEnabled && isStackedPosition)) {
            const otherObjects = allObjects.filter(obj => obj !== object);
            let supportFound = false;
            let maxSupportHeight = safeGroundLevelY + safeObjectHeight / 2; // Ground level + object center height
            
            // Check for object support first
            for (const otherObj of otherObjects) {
                const otherWidth = otherObj.userData?.objectWidth || otherObj.geometry?.parameters?.width || (otherObj.geometry?.parameters?.radius * 2) || 1;
                const otherDepth = otherObj.userData?.objectDepth || otherObj.geometry?.parameters?.depth || (otherObj.geometry?.parameters?.radius * 2) || 1;
                const otherHeight = otherObj.userData?.objectHeight || otherObj.geometry?.parameters?.height || 1;
                
                const otherTop = otherObj.position.y + otherHeight / 2;
                const otherLeft = otherObj.position.x - otherWidth / 2;
                const otherRight = otherObj.position.x + otherWidth / 2;
                const otherFront = otherObj.position.z - otherDepth / 2;
                const otherBack = otherObj.position.z + otherDepth / 2;
                
                // Check if the constrained position is above this object
                if (constrainedX >= otherLeft && constrainedX <= otherRight &&
                    constrainedZ >= otherFront && constrainedZ <= otherBack &&
                    otherTop > maxSupportHeight) {
                    
                    supportFound = true;
                    maxSupportHeight = otherTop + safeObjectHeight / 2;
                    console.log(`  Found object support: ${otherObj.userData.fileName || 'unknown'} at height ${otherTop}`);
                    break;
                }
            }
            
            if (supportFound) {
                constrainedY = maxSupportHeight;
                console.log(`  Object positioned on support at Y=${constrainedY}`);
            } else if (constrainedY > safeGroundLevelY + safeObjectHeight / 2) {
                // Object is elevated but has no object support - provide stalagmite support
                console.log(`  Object elevated to Y=${constrainedY}, providing magical stalagmite support`);
                // Create the actual stalagmite support for the elevated object
                setTimeout(() => {
                    if (object && object.position) {
                        const trunkHeight = constrainedY - safeObjectHeight / 2; // Height from ground to object bottom
                        this.createTreeTrunk(object, trunkHeight);
                    }
                }, 100); // Small delay to ensure object is positioned first
                // Keep the elevated position - stalagmite will support it
            } else {
                // Object is at or near ground level
                constrainedY = safeGroundLevelY + safeObjectHeight / 2; // Position on ground
                console.log(`  Object positioned on ground at Y=${constrainedY}`);
            }
        } else if (stackingEnabled && isStackedPosition) {
            // Stacking system is handling this - respect the Y coordinate
            console.log(`  Stacking enabled - respecting Y position: ${constrainedY}`);
        } else {
            // Default positioning
            if (constrainedY <= safeGroundLevelY + safeObjectHeight / 2) {
                constrainedY = safeGroundLevelY + safeObjectHeight / 2; // On ground
                console.log(`  Default ground positioning at Y=${constrainedY}`);
            } else {
                console.log(`  Elevated position maintained with stalagmite support at Y=${constrainedY}`);
                // Create the actual stalagmite support for the elevated object
                if (constrainedY > safeGroundLevelY + safeObjectHeight / 2) {
                    setTimeout(() => {
                        if (object && object.position) {
                            const trunkHeight = constrainedY - safeObjectHeight / 2; // Height from ground to object bottom
                            this.createTreeTrunk(object, trunkHeight);
                        }
                    }, 100); // Small delay to ensure object is positioned first
                }
            }
        }
        
        const finalPosition = {
            x: constrainedX,
            y: constrainedY,
            z: constrainedZ
        };
        
        console.log(`  Constrained position: (${finalPosition.x}, ${finalPosition.y}, ${finalPosition.z})`);
        console.log(`  Y clamped from ${newPosition.y} to valid range [0, ${constraints.worldBoundaries.y.max}]`);
        
        return finalPosition;
    }

    /**
     * Override Forest's setupEnvironment to create cave environment instead
     */
    setupEnvironment() {
        console.log('🕳️ Setting up Cave Explorer world environment...');
        
        // Store original fog for restoration
        this.originalFog = this.scene.fog;
        
        // Create cave environment properly tracked by parent
        this.createCaveFloor();
        this.createCaveCeiling();
        this.createCaveWalls();
        this.createDarkStream();
        // PERFORMANCE OPTIMIZATION: Skip tunnel systems (high polygon count)
        // this.createDivergingTunnels(); // Disabled for better performance
        this.setupCaveLighting();
        this.setupCaveFog();
        this.createCaveDecorations();
        
        console.log('🕳️ Cave Explorer world environment setup complete');
    }

    /**
     * Create cave floor as overlay (not replacement) - properly tracked by parent
     */
    createCaveFloor() {
        console.log('� Creating cave floor overlay...');
        
        const floorSize = 300;
        const geometry = new this.THREE.PlaneGeometry(floorSize, floorSize);
        const material = new this.THREE.MeshStandardMaterial({
            color: 0x2D1B0E, // Dark brown mud
            roughness: 0.95,
            metalness: 0,
        });

        this.caveFloor = new this.THREE.Mesh(geometry, material);
        // CRITICAL: Position at Y=0.01 to overlay on existing ground, not replace it
        this.caveFloor.position.set(0, 0.01, 0);
        this.caveFloor.rotation.x = -Math.PI / 2;
        
        this.caveFloor.userData = {
            templateObject: true,
            caveFloor: true,
            preservePosition: true,
            type: 'cave_floor_overlay',
            worldType: 'cave'
        };

        this.scene.add(this.caveFloor);
        this.objects.push(this.caveFloor); // Track in parent's object array
        
        // Add floor texture variations
        this.addFloorVariations();
        
        console.log('🟫 Cave floor overlay created and tracked');
    }

    /**
     * Add floor texture variations - properly tracked by parent
     */
    addFloorVariations() {
        const patches = [
            { x: -60, z: -40, size: 15, color: 0x1A0F08 }, // Darker patch
            { x: 40, z: 30, size: 20, color: 0x3D2417 },   // Lighter patch
            { x: -30, z: 70, size: 12, color: 0x1A0F08 },
            { x: 80, z: -20, size: 18, color: 0x3D2417 },
            { x: 0, z: -80, size: 25, color: 0x1A0F08 },
        ];

        patches.forEach((patch, index) => {
            const geometry = new this.THREE.CircleGeometry(patch.size, 8);
            const material = new this.THREE.MeshStandardMaterial({
                color: patch.color,
                roughness: 0.98,
            });

            const floorPatch = new this.THREE.Mesh(geometry, material);
            floorPatch.position.set(patch.x, 0.02, patch.z); // Above cave floor overlay
            floorPatch.rotation.x = -Math.PI / 2;
            
            floorPatch.userData = {
                templateObject: true,
                floorVariation: true,
                preservePosition: true,
                type: 'cave_floor_patch',
                worldType: 'cave'
            };

            this.scene.add(floorPatch);
            this.objects.push(floorPatch); // Track in parent's object array
            this.caveFloorVariations.push(floorPatch);
        });
    }

    /**
     * Create cave ceiling - properly tracked by parent
     */
    createCaveCeiling() {
        console.log('🏔️ Creating cave ceiling...');
        
        const ceilingY = 30; // Lower ceiling height for more cave-like feeling
        const ceilingSize = 240;
        
        // Main ceiling plane
        const geometry = new this.THREE.PlaneGeometry(ceilingSize, ceilingSize);
        const material = new this.THREE.MeshStandardMaterial({
            color: 0x3D2F1F, // Brown-gray rocky color
            roughness: 0.95,
            metalness: 0,
        });

        this.caveCeiling = new this.THREE.Mesh(geometry, material);
        this.caveCeiling.position.set(0, ceilingY, 0);
        this.caveCeiling.rotation.x = Math.PI / 2; // Face down
        
        this.caveCeiling.userData = {
            templateObject: true,
            caveCeiling: true,
            preservePosition: true,
            type: 'cave_ceiling',
            worldType: 'cave'
        };

        this.scene.add(this.caveCeiling);
        this.objects.push(this.caveCeiling); // Track in parent's object array
        
        // Add ceiling variations
        this.addCeilingVariations(ceilingY);
        
        console.log('🏔️ Cave ceiling created and tracked');
    }

    /**
     * Create cave walls around the perimeter
     */
    createCaveWalls() {
        console.log('🗿 Creating cave walls...');
        
        const wallHeight = 30;
        const wallDistance = 140;
        const wallThickness = 10;
        
        // Create perimeter walls
        const wallPositions = [
            { x: 0, z: -wallDistance, rotY: 0 },       // North wall
            { x: 0, z: wallDistance, rotY: Math.PI },  // South wall  
            { x: -wallDistance, z: 0, rotY: Math.PI/2 }, // West wall
            { x: wallDistance, z: 0, rotY: -Math.PI/2 }  // East wall
        ];
        
        wallPositions.forEach((wall, index) => {
            const wallGeometry = new this.THREE.BoxGeometry(280, wallHeight, wallThickness);
            const wallMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x4A3B28,     // Brown-grey rocky cave wall color
                roughness: 0.9,
                metalness: 0.1,
            });
            
            const wallMesh = new this.THREE.Mesh(wallGeometry, wallMaterial);
            wallMesh.position.set(wall.x, wallHeight/2, wall.z);
            wallMesh.rotation.y = wall.rotY;
            
            wallMesh.userData = {
                templateObject: true,
                caveWall: true,
                preservePosition: true,
                type: 'cave_wall',
                worldType: 'cave'
            };
            
            this.scene.add(wallMesh);
            this.objects.push(wallMesh);
        });
        
        console.log('🗿 Cave walls created');
    }

    /**
     * Add ceiling variations - properly tracked by parent
     */
    addCeilingVariations(ceilingY) {
        const variations = [
            { x: -40, z: -30, size: 8 },
            { x: 50, z: 20, size: 6 },
            { x: -70, z: 60, size: 10 },
            { x: 30, z: -70, size: 7 },
            { x: 0, z: 40, size: 5 },
            { x: -20, z: 10, size: 4 },
            { x: 60, z: -40, size: 6 },
            { x: -80, z: -60, size: 9 },
        ];

        variations.forEach((variation, index) => {
            // Create main stalactite using cone geometry (hanging from ceiling)
            const stalactiteHeight = 6 + Math.random() * 8; // Longer: 6-14 units
            const stalactiteRadius = variation.size * 0.08; // Thinner: reduced from 0.15 to 0.08
            
            const geometry = new this.THREE.ConeGeometry(
                stalactiteRadius,    // Radius at base (thicker at ceiling)
                stalactiteHeight,    // Height hanging down
                8                    // Radial segments
            );
            const material = new this.THREE.MeshStandardMaterial({
                color: 0x4A3B2A,     // Brown-muddy color for natural cave look
                roughness: 0.9,
            });

            const formation = new this.THREE.Mesh(geometry, material);
            formation.position.set(
                variation.x, 
                ceilingY - stalactiteHeight / 2, // Position so top touches ceiling
                variation.z
            );
            
            // Random rotation for natural look
            formation.rotation.y = Math.random() * Math.PI;
            // Flip cone upside down so it hangs from ceiling
            formation.rotation.z = Math.PI;
            
            formation.userData = {
                templateObject: true,
                ceilingFormation: true,
                preservePosition: true,
                type: 'cave_stalactite',
                worldType: 'cave'
            };

            this.scene.add(formation);
            this.objects.push(formation); // Track in parent's object array

            // Add smaller branch stalactites for realistic formation
            if (Math.random() < 0.7) { // 70% chance of branches
                const numBranches = 1 + Math.floor(Math.random() * 3); // 1-3 branches
                
                for (let i = 0; i < numBranches; i++) {
                    const branchHeight = stalactiteHeight * (0.3 + Math.random() * 0.4); // 30-70% of main height
                    const branchRadius = stalactiteRadius * 0.6; // Thinner than main
                    
                    const branchGeometry = new this.THREE.ConeGeometry(
                        branchRadius,
                        branchHeight,
                        6 // Fewer segments for branches
                    );
                    
                    const branch = new this.THREE.Mesh(branchGeometry, material);
                    
                    // Position branches around the main stalactite
                    const angle = (i / numBranches) * Math.PI * 2;
                    const offsetDistance = stalactiteRadius * 2;
                    branch.position.set(
                        variation.x + Math.cos(angle) * offsetDistance,
                        ceilingY - branchHeight / 2,
                        variation.z + Math.sin(angle) * offsetDistance
                    );
                    
                    // Add slight tilt toward main formation
                    branch.rotation.x = (Math.random() - 0.5) * 0.3;
                    branch.rotation.y = Math.random() * Math.PI;
                    branch.rotation.z = Math.PI + (Math.random() - 0.5) * 0.2;
                    
                    branch.userData = {
                        templateObject: true,
                        ceilingFormation: true,
                        preservePosition: true,
                        type: 'cave_stalactite_branch',
                        worldType: 'cave'
                    };
                    
                    this.scene.add(branch);
                    this.objects.push(branch);
                }
            }
        });
        
        console.log('🗿 Cave ceiling variations (stalactites) created and tracked');
    }

    /**
     * Create dark stream flowing through the cave center
     */
    createDarkStream() {
        console.log('🌊 Creating dark cave stream...');
        
        // Create gentler meandering stream using curve
        const streamCurve = new this.THREE.CatmullRomCurve3([
            new this.THREE.Vector3(-5, 0, -100),
            new this.THREE.Vector3(8, 0, -70),
            new this.THREE.Vector3(-4, 0, -40),
            new this.THREE.Vector3(6, 0, -10),
            new this.THREE.Vector3(-3, 0, 20),
            new this.THREE.Vector3(9, 0, 50),
            new this.THREE.Vector3(-6, 0, 80),
            new this.THREE.Vector3(4, 0, 100)
        ]);
        
        // Create continuous meandering river using smooth curves
        const riverWidth = 3; // Narrower for more realistic stream
        
        // Define meandering path points for smooth curves (less dramatic)
        const riverPoints = [
            new this.THREE.Vector3(0, 0, -100),
            new this.THREE.Vector3(-6, 0, -75),
            new this.THREE.Vector3(8, 0, -50),
            new this.THREE.Vector3(-4, 0, -25),
            new this.THREE.Vector3(9, 0, 0),
            new this.THREE.Vector3(-7, 0, 25),
            new this.THREE.Vector3(5, 0, 50),
            new this.THREE.Vector3(-3, 0, 75),
            new this.THREE.Vector3(4, 0, 100)
        ];
        
        // Create smooth curve through points
        const riverCurve = new this.THREE.CatmullRomCurve3(riverPoints);
        
        // Create flat ribbon geometry following the curve
        const points = riverCurve.getPoints(100); // Get 100 points along curve
        const ribbonGeometry = new this.THREE.BufferGeometry();
        
        const vertices = [];
        const indices = [];
        const uvs = [];
        
        // Create ribbon vertices along the curve
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const t = i / (points.length - 1);
            
            // Get tangent for perpendicular direction
            const tangent = riverCurve.getTangent(t);
            const perpendicular = new this.THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
            
            // Create two vertices for river width
            const leftPoint = point.clone().add(perpendicular.clone().multiplyScalar(riverWidth / 2));
            const rightPoint = point.clone().add(perpendicular.clone().multiplyScalar(-riverWidth / 2));
            
            // Add vertices (left and right bank)
            vertices.push(leftPoint.x, leftPoint.y, leftPoint.z);
            vertices.push(rightPoint.x, rightPoint.y, rightPoint.z);
            
            // Add UV coordinates
            uvs.push(0, t);
            uvs.push(1, t);
            
            // Create triangles (except for last point)
            if (i < points.length - 1) {
                const idx = i * 2;
                // Triangle 1
                indices.push(idx, idx + 1, idx + 2);
                // Triangle 2
                indices.push(idx + 1, idx + 3, idx + 2);
            }
        }
        
        ribbonGeometry.setAttribute('position', new this.THREE.Float32BufferAttribute(vertices, 3));
        ribbonGeometry.setAttribute('uv', new this.THREE.Float32BufferAttribute(uvs, 2));
        ribbonGeometry.setIndex(indices);
        ribbonGeometry.computeVertexNormals();
        
        const waterMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x4A7FA0,     // Lighter blue for better visibility
            roughness: 0.05,     // Very smooth for strong reflections
            metalness: 0.9,      // High metalness for water-like appearance
            transparent: true,
            opacity: 0.85,
            emissive: 0x2A5F8A,  // Lighter emissive blue for visibility
            emissiveIntensity: 0.2, // Increased intensity for visibility
            side: this.THREE.DoubleSide
        });
        
        this.caveStream = new this.THREE.Mesh(ribbonGeometry, waterMaterial);
        this.caveStream.position.y = 0.2; // Above the cave floor
        
        // Add flowing animation data
        this.caveStream.userData = {
            templateObject: true,
            caveStream: true,
            preservePosition: true,
            type: 'cave_stream',
            worldType: 'cave',
            flowOffset: 0,
            isAnimated: true
        };
        
        // Add water flow animation with enhanced flow effects
        this.caveStream.animateFlow = () => {
            if (this.caveStream.userData.flowOffset !== undefined) {
                this.caveStream.userData.flowOffset += 0.02; // Faster base flow
                
                if (this.caveStream.material) {
                    const time = Date.now() * 0.004; // Faster animation timing
                    
                    // More dramatic shimmer effect with waves
                    const shimmer1 = Math.sin(time) * 0.15;
                    const shimmer2 = Math.sin(time * 1.7 + 1) * 0.08;
                    this.caveStream.material.emissiveIntensity = 0.2 + shimmer1 + shimmer2;
                    
                    // Animate roughness for surface ripples
                    this.caveStream.material.roughness = 0.03 + Math.sin(time * 2.5) * 0.03;
                    
                    // Enhanced UV flow animation
                    const uvAttribute = this.caveStream.geometry.getAttribute('uv');
                    if (uvAttribute) {
                        const uvArray = uvAttribute.array;
                        const flowSpeed = 0.015; // Much faster flow
                        
                        for (let i = 1; i < uvArray.length; i += 2) {
                            // Create wave-like flow pattern
                            const waveOffset = Math.sin(time + uvArray[i-1] * 3) * 0.1;
                            uvArray[i] = (uvArray[i] + flowSpeed + waveOffset) % 1;
                        }
                        uvAttribute.needsUpdate = true;
                    }
                    
                    // Add subtle vertex animation for water movement
                    const positionAttribute = this.caveStream.geometry.getAttribute('position');
                    if (positionAttribute && positionAttribute.originalPositions) {
                        const positions = positionAttribute.array;
                        const original = positionAttribute.originalPositions;
                        
                        for (let i = 0; i < positions.length; i += 3) {
                            const x = original[i];
                            const z = original[i + 2];
                            // Add subtle wave motion
                            positions[i + 1] = original[i + 1] + Math.sin(time + x * 0.1 + z * 0.05) * 0.02;
                        }
                        positionAttribute.needsUpdate = true;
                    } else if (positionAttribute) {
                        // Store original positions for animation
                        positionAttribute.originalPositions = positionAttribute.array.slice();
                    }
                }
            }
        };
        
        this.scene.add(this.caveStream);
        this.objects.push(this.caveStream);
        
        console.log('🌊 Flat shimmering cave stream created');
    }

    /**
     * Create diverging tunnel openings in the background
     */
    createDivergingTunnels() {
        console.log('🕳️ Creating diverging tunnels...');
        
        const tunnelPositions = [
            { x: -120, y: 15, z: -100, rotation: 0.3 },      // Left tunnel
            { x: 120, y: 12, z: -100, rotation: -0.3 },      // Right tunnel  
            { x: 0, y: 18, z: -120, rotation: 0 },           // Center tunnel
            { x: -80, y: 10, z: 100, rotation: Math.PI },    // Back left
            { x: 80, y: 14, z: 100, rotation: Math.PI },     // Back right
        ];
        
        tunnelPositions.forEach((tunnel, index) => {
            // Create tunnel opening using cylinder geometry
            const tunnelRadius = 12 + Math.random() * 8;
            const tunnelDepth = 30;
            
            const tunnelGeometry = new this.THREE.CylinderGeometry(
                tunnelRadius,     // Top radius
                tunnelRadius * 0.8, // Bottom radius (slightly narrower)
                tunnelDepth,      // Height/depth
                12,               // Radial segments
                1,                // Height segments
                true              // Open ended
            );
            
            // Very dark material to suggest depth
            const tunnelMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x000000,     // Pure black for deep crevice/tunnel effect
                roughness: 1.0,
                metalness: 0,
                transparent: true,
                opacity: 0.95,      // Almost opaque for deep shadow
                side: this.THREE.DoubleSide
            });
            
            const tunnelMesh = new this.THREE.Mesh(tunnelGeometry, tunnelMaterial);
            tunnelMesh.position.set(tunnel.x, tunnel.y, tunnel.z);
            tunnelMesh.rotation.x = Math.PI / 2; // Horizontal orientation
            tunnelMesh.rotation.z = tunnel.rotation;
            
            tunnelMesh.userData = {
                templateObject: true,
                caveTunnel: true,
                preservePosition: true,
                type: 'cave_tunnel',
                worldType: 'cave'
            };
            
            this.scene.add(tunnelMesh);
            this.objects.push(tunnelMesh);
            
            // Add some depth illusion with darker inner cylinder
            const innerGeometry = new this.THREE.CylinderGeometry(
                tunnelRadius * 0.7,
                tunnelRadius * 0.5,
                tunnelDepth * 0.8,
                8
            );
            const innerMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x000000,
                roughness: 1.0,
                transparent: true,
                opacity: 0.9
            });
            
            const innerTunnel = new this.THREE.Mesh(innerGeometry, innerMaterial);
            innerTunnel.position.copy(tunnelMesh.position);
            innerTunnel.position.z -= tunnelDepth * 0.3; // Push back for depth
            innerTunnel.rotation.copy(tunnelMesh.rotation);
            
            innerTunnel.userData = {
                templateObject: true,
                caveTunnelInner: true,
                preservePosition: true,
                type: 'cave_tunnel_inner',
                worldType: 'cave'
            };
            
            this.scene.add(innerTunnel);
            this.objects.push(innerTunnel);
        });
        
        console.log('🕳️ Diverging tunnels created');
    }

    /**
     * Set up cave lighting - properly tracked by parent
     */
    setupCaveLighting() {
        console.log('💡 Setting up cave lighting (performance optimized)...');
        
        // PERFORMANCE OPTIMIZATION: Simple cave lighting instead of multiple point lights
        this.createSimpleCaveLighting();
        
        console.log('💡 Cave lighting setup complete (optimized)');
    }

    /**
     * PERFORMANCE OPTIMIZED: Simple cave lighting (replaces complex point light system)
     */
    createSimpleCaveLighting() {
        console.log('💡 Creating simple cave lighting (static, minimal point lights)...');
        
        // Basic dark ambient light for cave atmosphere
        const ambientLight = new this.THREE.AmbientLight(0x1A1A2E, 0.3); // Dark blue ambient
        this.scene.add(ambientLight);
        
        // Main directional light (soft torch-like)
        const directionalLight = new this.THREE.DirectionalLight(0xFF8C42, 0.5); // Warm torch light
        directionalLight.position.set(20, 30, 40);
        directionalLight.target.position.set(0, 0, 0);
        this.scene.add(directionalLight);
        this.scene.add(directionalLight.target);
        
        // Single cave entrance light (instead of multiple point lights)
        const entranceLight = new this.THREE.PointLight(0x87CEEB, 0.4, 60); // Sky blue from outside
        entranceLight.position.set(0, 20, 80);
        this.scene.add(entranceLight);
        
        console.log('💡 Simple cave lighting created - better performance');
    }

    /**
     * Set up cave fog
     */
    setupCaveFog() {
        console.log('🌫️ Setting up cave fog (performance optimized)...');
        
        // PERFORMANCE OPTIMIZATION: Lighter fog for better performance and visibility
        this.scene.fog = new this.THREE.Fog(
            0x0F0F23, // Very dark blue-black
            60,       // Increased near distance (less fog computation)
            200       // Increased far distance (simpler gradients)
        );
        
        console.log('🌫️ Cave fog applied (optimized)');
    }

    /**
     * Create cave decorations (stalagmites) - properly tracked by parent
     */
    createCaveDecorations() {
        console.log('🗿 Creating cave decorations (stalagmites)...');
        
        // Create stalagmites instead of trees
        const positions = [
            { x: 50, z: -50 },
            { x: -60, z: 30 },
            { x: 70, z: 60 },
            { x: -40, z: -70 },
            { x: 30, z: 40 },
            { x: -80, z: -20 },
        ];

        positions.forEach((pos, index) => {
            const height = 10 + Math.random() * 8;
            const geometry = new this.THREE.ConeGeometry(2, height, 6);
            const material = new this.THREE.MeshStandardMaterial({
                color: 0x4A3C28,
                roughness: 0.9,
            });

            const stalagmite = new this.THREE.Mesh(geometry, material);
            stalagmite.position.set(pos.x, height / 2, pos.z);
            
            stalagmite.userData = {
                templateObject: true,
                caveDecoration: true,
                type: 'cave_stalagmite',
                worldType: 'cave'
            };

            this.scene.add(stalagmite);
            this.objects.push(stalagmite); // Track in parent's object array
        });
        
        console.log('🗿 Cave decorations (stalagmites) created and tracked');
    }

    /**
     * Override Forest's createTreeTrunk to create stalagmite supports
     */
    createTreeTrunk(targetObject, trunkHeight) {
        console.log(`🗿 Creating support stalagmite for elevated object`);
        
        // Make stalagmite shorter so object sits ON TOP instead of being pierced
        // Leave small gap between stalagmite top and object bottom for visual contact
        const supportGap = 0.05; // Very small gap - objects will appear to sit on stalagmites
        const actualSupportHeight = Math.max(0.5, trunkHeight - supportGap);
        
        console.log(`  Original trunk height: ${trunkHeight}`);
        console.log(`  Actual support height: ${actualSupportHeight} (with ${supportGap} gap)`);
        
        const geometry = new this.THREE.CylinderGeometry(0.4, 0.75, actualSupportHeight, 8);
        const material = new this.THREE.MeshStandardMaterial({
            color: 0x4A3C28,
            roughness: 0.9,
        });

        const support = new this.THREE.Mesh(geometry, material);
        support.position.x = targetObject.position.x;
        support.position.z = targetObject.position.z;
        support.position.y = actualSupportHeight / 2;
        
        support.userData = {
            templateObject: true,
            treeTrunkSupport: true, // Keep same name for Forest system compatibility
            supportFor: targetObject.uuid,
            preservePosition: true,
            type: 'cave_support_stalagmite',
            worldType: 'cave'
        };

        this.scene.add(support);
        this.objects.push(support); // Track in parent's object array
        
        return support;
    }

    /**
     * Update method for animated elements like flowing water
     */
    update() {
        // Animate flowing water stream with shimmering effects
        if (this.caveStream && this.caveStream.material) {
            const time = Date.now() * 0.001; // Convert to seconds
            
            // Create flowing shimmer effect by animating emissive intensity
            const shimmerIntensity = 0.05 + Math.sin(time * 2) * 0.03;
            this.caveStream.material.emissiveIntensity = shimmerIntensity;
            
            // Subtle roughness variation for water movement effect
            const roughnessVariation = 0.01 + Math.sin(time * 3) * 0.005;
            this.caveStream.material.roughness = roughnessVariation;
            
            // Animate UV offset for flowing effect (if texture is added later)
            // Note: This would work better with a normal map or displacement texture
        }
    }

    /**
     * CRITICAL: Override cleanup to use parent's object tracking system
     */
    cleanup() {
        console.log('🧹 Cleaning up Cave Explorer world using parent tracking system...');
        
        // Restore original fog
        if (this.originalFog !== null) {
            this.scene.fog = this.originalFog;
            console.log('🌫️ Restored original fog');
        } else {
            this.scene.fog = null;
            console.log('🌫️ Cleared cave fog');
        }
        
        // Clear cave-specific arrays
        this.caveFloor = null;
        this.caveCeiling = null;
        this.caveFloorVariations = [];
        this.ceilingFormations = [];
        this.pointLights = [];
        
        // CRITICAL: Use parent's cleanup which properly tracks all objects
        super.cleanup();
        
        console.log('🧹 Cave Explorer cleanup complete using ForestRealm system');
    }

    /**
     * Get world-specific information
     */
    getWorldInfo() {
        return {
            type: 'cave',
            name: 'Cave Explorer',
            description: 'Underground cave world with stalagmites and water streams',
            isPremium: true,
            features: [
                'Stalagmite supports for elevated objects',
                'Dark cave atmosphere with torch lighting',
                'Water streams flowing through cave',
                'Low ceiling with hanging stalactites',
                'Muddy cave floor overlay',
                'Inherits Forest Realm movement system'
            ],
            baseWorld: 'Forest Realm',
            lighting: 'Dark with warm torchlight',
            atmosphere: 'Mysterious underground cave'
        };
    }

    /**
     * Check if this world supports a specific feature
     */
    supportsFeature(featureName) {
        const supportedFeatures = [
            'tree_trunk_supports', // Inherited as stalagmite supports
            'upward_movement',     // Inherited from Forest
            'elevated_objects',    // Inherited from Forest
            'dark_atmosphere',     // Cave-specific
            'water_features',      // Cave-specific
            'cave_decorations',    // Cave-specific
        ];
        
        return supportedFeatures.includes(featureName);
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CaveExplorerWorldTemplate = CaveExplorerWorldTemplate;
    console.log('🕳️ Cave Explorer World Template class loaded successfully!');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CaveExplorerWorldTemplate;
}