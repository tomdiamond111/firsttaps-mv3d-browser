/**
 * FURNITURE VISUAL MANAGER
 * Handles rendering of furniture in the 3D world with slots, rotation handles, and visual effects
 */

(function() {
    'use strict';

    console.log('🪑 Loading Furniture Visual Manager...');

    // ============================================================================
    // FURNITURE VISUAL MANAGER CLASS
    // ============================================================================
    
    class FurnitureVisualManager {
        constructor(scene, camera) {
            this.scene = scene;
            this.camera = camera;
            this.THREE = window.THREE;
            
            // Visual state
            this.furnitureMeshes = new Map(); // furnitureId -> { slots: [], structure: [], handles: [] }
            this.activeFurniture = new Map(); // furnitureId -> Furniture object
            
            // Materials (reusable per style)
            this.styleMaterials = this.createStyleMaterials();
            
            // Slot materials
            this.slotMaterials = this.createSlotMaterials();
            
            // Idle animations manager
            this.idleAnimationManager = null;
            console.log('🪑 [ANIM-DEBUG] Checking for FurnitureIdleAnimationManager:', typeof window.FurnitureIdleAnimationManager);
            if (window.FurnitureIdleAnimationManager) {
                this.idleAnimationManager = new window.FurnitureIdleAnimationManager();
                console.log('🎨 Idle animation manager initialized successfully');
            } else {
                console.warn('⚠️ FurnitureIdleAnimationManager not found - idle animations disabled');
            }
            
            console.log('🪑 FurnitureVisualManager initialized');
        }

        /**
         * Create style-based materials from FURNITURE_STYLES
         */
        createStyleMaterials() {
            const materials = {};
            
            Object.entries(window.FURNITURE_STYLES).forEach(([styleName, styleConfig]) => {
                const materialConfig = {
                    color: styleConfig.color,
                    metalness: styleConfig.metalness,
                    roughness: styleConfig.roughness,
                    emissive: styleConfig.emissive || 0x000000,
                    emissiveIntensity: styleConfig.emissiveIntensity || 0
                };
                
                if (styleConfig.transparent) {
                    materialConfig.transparent = true;
                    materialConfig.opacity = styleConfig.opacity || 1.0;
                }
                
                materials[styleName] = new this.THREE.MeshStandardMaterial(materialConfig);
            });
            
            return materials;
        }

        /**
         * Create slot marker materials (similar to path markers)
         */
        createSlotMaterials() {
            return {
                default: new this.THREE.MeshStandardMaterial({
                    color: 0x888888,
                    metalness: 0.3,
                    roughness: 0.7,
                    emissive: new window.THREE.Color(0x222222),
                    emissiveIntensity: 0.2
                }),
                
                active: new this.THREE.MeshStandardMaterial({
                    color: 0x3498db,
                    metalness: 0.5,
                    roughness: 0.4,
                    emissive: new window.THREE.Color(0x2980b9),
                    emissiveIntensity: 0.8
                }),
                
                occupied: new this.THREE.MeshStandardMaterial({
                    color: 0x444444,
                    metalness: 0.3,
                    roughness: 0.8,
                    emissive: new window.THREE.Color(0x111111),
                    emissiveIntensity: 0.1
                }),
                
                // PLAYBACK STATE MATERIALS (marker-based navigation)
                inactive: new this.THREE.MeshStandardMaterial({
                    color: 0x4A90E2,      // Blue
                    emissive: 0x000000,
                    emissiveIntensity: 0,
                    metalness: 0.4,
                    roughness: 0.6,
                    transparent: true,
                    opacity: 0.6
                }),
                
                next: new this.THREE.MeshStandardMaterial({
                    color: 0x0000FF,      // Blue (next to play)
                    emissive: 0x0000FF,
                    emissiveIntensity: 0.6,  // Moderate glow
                    metalness: 0.5,
                    roughness: 0.3
                }),
                
                playing: new this.THREE.MeshStandardMaterial({
                    color: 0x00FF00,      // Green (currently playing)
                    emissive: 0x00FF00,
                    emissiveIntensity: 0.9,  // Very strong glow
                    metalness: 0.6,
                    roughness: 0.2
                }),
                
                played: new this.THREE.MeshStandardMaterial({
                    color: 0xFF0000,      // Red
                    emissive: 0xFF0000,
                    emissiveIntensity: 0.4,  // Moderate glow
                    metalness: 0.5,
                    roughness: 0.4,
                    transparent: true,
                    opacity: 0.8
                })
            };
        }

        /**
         * Add a furniture piece to the scene
         */
        async addFurniture(furniture) {
            if (this.activeFurniture.has(furniture.id)) {
                console.warn('🪑 Furniture already exists:', furniture.id);
                return false;
            }

            console.log(`🪑 Adding furniture to scene: ${furniture.type} with ${furniture.capacity} slots`);
            
            // Create a Group to contain all furniture elements
            const furnitureGroup = new this.THREE.Group();
            furnitureGroup.name = `Furniture: ${furniture.name}`;
            furnitureGroup.position.set(furniture.position.x, furniture.position.y, furniture.position.z);
            furnitureGroup.rotation.y = furniture.rotation;
            furnitureGroup.raycast = () => {}; // Disable group raycasting - only structure and slots are interactive
            
            // Set userData for interaction system
            furnitureGroup.userData = {
                id: furniture.id,
                name: furniture.name,
                fileName: `Furniture: ${furniture.type}`,
                type: 'furniture',
                furnitureId: furniture.id,
                furnitureType: furniture.type,
                isFurniture: true,
                capacity: furniture.capacity,
                objectIds: furniture.objectIds,
                style: furniture.style,
                sortingCriteria: furniture.sortingCriteria
            };
            
            const visualElements = {
                group: furnitureGroup,
                structure: [],      // Main furniture structure meshes
                slots: [],          // Slot marker meshes
                handles: [],        // Rotation handles
                decorations: [],    // Additional decorative elements
                tapArea: null       // Invisible tap area for easier interaction
            };

            // Create furniture structure based on type
            this.createFurnitureStructure(furniture, visualElements, furnitureGroup);
            
            // Create slot markers
            this.createSlotMarkers(furniture, visualElements, furnitureGroup);
            
            // CRITICAL: Link slot meshes to furniture data model
            // This is required for furniture restoration - the furniture object needs slots array
            furniture.slots = visualElements.slots;
            console.log(`🪑 Linked ${furniture.slots.length} slot meshes to furniture data model`);
            
            // Rotation handle removed - furniture now rotates on double-tap

            // Add the group to the scene
            this.scene.add(furnitureGroup);

            // Store references
            this.furnitureMeshes.set(furniture.id, visualElements);
            this.activeFurniture.set(furniture.id, furniture);

            console.log(`🪑 Furniture added successfully: ${furniture.id}`);
            return true;
        }

        /**
         * Create furniture structure meshes based on type
         */
        createFurnitureStructure(furniture, visualElements, furnitureGroup) {
            // Create invisible tap area FIRST for easier interaction (hit detection)
            this.createFurnitureTapArea(furniture, visualElements, furnitureGroup);
            
            const styleMaterial = this.styleMaterials[furniture.style] || this.styleMaterials.woodgrain;
            console.log(`🪑 Creating ${furniture.type} with style: ${furniture.style}, material color: ${styleMaterial.color.getHexString()}`);
            
            switch (furniture.type) {
                case window.FURNITURE_TYPES.BOOKSHELF:
                    this.createBookshelfStructure(furniture, visualElements, furnitureGroup, styleMaterial);
                    break;
                
                case window.FURNITURE_TYPES.RISER:
                    this.createRiserStructure(furniture, visualElements, furnitureGroup, styleMaterial);
                    break;
                
                case window.FURNITURE_TYPES.GALLERY_WALL:
                    this.createGalleryWallStructure(furniture, visualElements, furnitureGroup, styleMaterial);
                    break;
                
                case window.FURNITURE_TYPES.STAGE_SMALL:
                case window.FURNITURE_TYPES.STAGE_LARGE:
                    this.createStageStructure(furniture, visualElements, furnitureGroup, styleMaterial);
                    break;
                
                case window.FURNITURE_TYPES.AMPHITHEATRE:
                    this.createAmphitheatreStructure(furniture, visualElements, furnitureGroup, styleMaterial);
                    break;
            }
        }

        /**
         * Create bookshelf structure (shelves + back panel)
         */
        createBookshelfStructure(furniture, visualElements, furnitureGroup, material) {
            const { width, height, depth, rows, shelfThickness } = furniture.geometryParams;
            
            // Back panel
            const backGeometry = new this.THREE.BoxGeometry(width, height, 0.2);
            const back = new this.THREE.Mesh(backGeometry, material);
            back.position.set(0, height / 2, -depth / 2);
            back.userData = this.createStructureUserData(furniture);
            furnitureGroup.add(back);
            visualElements.structure.push(back);
            
            // Shelves
            const shelfGeometry = new this.THREE.BoxGeometry(width, shelfThickness, depth);
            for (let i = 0; i <= rows; i++) {
                const shelf = new this.THREE.Mesh(shelfGeometry, material);
                const y = i * (height / rows);
                shelf.position.set(0, y, 0);
                shelf.userData = this.createStructureUserData(furniture);
                furnitureGroup.add(shelf);
                visualElements.structure.push(shelf);
            }
            
            // Side panels
            const sideGeometry = new this.THREE.BoxGeometry(0.2, height, depth);
            const leftSide = new this.THREE.Mesh(sideGeometry, material);
            leftSide.position.set(-width / 2, height / 2, 0);
            leftSide.userData = this.createStructureUserData(furniture);
            furnitureGroup.add(leftSide);
            visualElements.structure.push(leftSide);
            
            const rightSide = new this.THREE.Mesh(sideGeometry, material);
            rightSide.position.set(width / 2, height / 2, 0);
            rightSide.userData = this.createStructureUserData(furniture);
            furnitureGroup.add(rightSide);
            visualElements.structure.push(rightSide);
            
            console.log(`🪑 Created bookshelf structure with ${visualElements.structure.length} elements`);
        }

        /**
         * Create riser structure (3 curved stepped benches - choir riser style)
         */
        createRiserStructure(furniture, visualElements, furnitureGroup, material) {
            const { width, height, depth } = furniture.geometryParams;
            const tiers = 3; // 3 stepped rows
            const tierHeight = 1.0; // 2x higher (was 0.5) for better visibility
            const tierDepth = depth / tiers / 2; // Half width for narrower steps
            const curvature = 0.2; // Slight curve factor
            
            // Create 3 tiered platforms (back to front, bottom to top)
            for (let i = 0; i < tiers; i++) {
                const currentHeight = (tiers - i - 1) * tierHeight; // Back row highest
                const zOffset = (i - (tiers - 1) / 2) * tierDepth; // Adjacent steps, no gaps
                
                // Create curved platform using multiple segments
                const segments = 10; // More segments for smoother curve
                for (let seg = 0; seg < segments; seg++) {
                    const segmentWidth = width / segments;
                    const xPos = (seg - segments / 2 + 0.5) * segmentWidth;
                    
                    // Apply slight curve (arc shape)
                    const normalizedX = xPos / (width / 2);
                    const curveOffset = curvature * (1 - normalizedX * normalizedX); // Parabolic curve
                    
                    const benchGeometry = new this.THREE.BoxGeometry(segmentWidth * 1.05, 0.3, tierDepth);
                    const bench = new this.THREE.Mesh(benchGeometry, material);
                    bench.position.set(xPos, currentHeight + curveOffset, zOffset);
                    bench.userData = this.createStructureUserData(furniture);
                    furnitureGroup.add(bench);
                    visualElements.structure.push(bench);
                }
                
                // Add front edge for each tier
                const edgeGeometry = new this.THREE.BoxGeometry(width, tierHeight, 0.1);
                const edge = new this.THREE.Mesh(edgeGeometry, material);
                edge.position.set(0, currentHeight / 2, zOffset + tierDepth / 2);
                edge.userData = this.createStructureUserData(furniture);
                furnitureGroup.add(edge);
                visualElements.structure.push(edge);
            }
            
            console.log(`🪑 Created riser (choir benches) with ${visualElements.structure.length} elements`);
        }

        /**
         * Create gallery wall structure (vertical display wall)
         */
        createGalleryWallStructure(furniture, visualElements, furnitureGroup, material) {
            const { width, height, thickness } = furniture.geometryParams;
            
            // Main wall
            const wallGeometry = new this.THREE.BoxGeometry(width, height, thickness);
            const wall = new this.THREE.Mesh(wallGeometry, material);
            wall.position.set(0, height / 2, 0);
            wall.userData = this.createStructureUserData(furniture);
            furnitureGroup.add(wall);
            visualElements.structure.push(wall);
            
            // Decorative frame (optional)
            const frameThickness = 0.2;
            const frameDepth = 0.3;
            
            // Top frame
            const topFrameGeometry = new this.THREE.BoxGeometry(width + frameDepth * 2, frameThickness, frameDepth);
            const topFrame = new this.THREE.Mesh(topFrameGeometry, material);
            topFrame.position.set(0, height + frameThickness / 2, 0);
            topFrame.userData = this.createStructureUserData(furniture);
            furnitureGroup.add(topFrame);
            visualElements.structure.push(topFrame);
            
            console.log(`🪑 Created gallery wall structure with ${visualElements.structure.length} elements`);
        }

        /**
         * Create stage structure (performance platform with roof, back wall, and center marker)
         */
        createStageStructure(furniture, visualElements, furnitureGroup, material) {
            const { width, height, depth } = furniture.geometryParams;
            const roofHeight = height + 10; // Roof 10 units above platform
            
            // Stage platform
            const platformGeometry = new this.THREE.BoxGeometry(width, height, depth);
            const platform = new this.THREE.Mesh(platformGeometry, material);
            platform.position.set(0, height / 2, 0);
            platform.userData = this.createStructureUserData(furniture);
            furnitureGroup.add(platform);
            visualElements.structure.push(platform);
            
            // Back wall
            const backWallGeometry = new this.THREE.BoxGeometry(width, roofHeight - height, 0.2);
            const backWall = new this.THREE.Mesh(backWallGeometry, material);
            backWall.position.set(0, height + (roofHeight - height) / 2, -depth / 2);
            backWall.userData = this.createStructureUserData(furniture);
            furnitureGroup.add(backWall);
            visualElements.structure.push(backWall);
            
            // Roof
            const roofGeometry = new this.THREE.BoxGeometry(width, 0.2, depth);
            const roof = new this.THREE.Mesh(roofGeometry, material);
            roof.position.set(0, roofHeight, 0);
            roof.userData = this.createStructureUserData(furniture);
            furnitureGroup.add(roof);
            visualElements.structure.push(roof);
            
            // Side pillars (2 front corners)
            const pillarGeometry = new this.THREE.BoxGeometry(0.3, roofHeight - height, 0.3);
            const leftPillar = new this.THREE.Mesh(pillarGeometry, material);
            leftPillar.position.set(-width / 2 + 0.3, height + (roofHeight - height) / 2, depth / 2 - 0.3);
            leftPillar.userData = this.createStructureUserData(furniture);
            furnitureGroup.add(leftPillar);
            visualElements.structure.push(leftPillar);
            
            const rightPillar = new this.THREE.Mesh(pillarGeometry, material);
            rightPillar.position.set(width / 2 - 0.3, height + (roofHeight - height) / 2, depth / 2 - 0.3);
            rightPillar.userData = this.createStructureUserData(furniture);
            furnitureGroup.add(rightPillar);
            visualElements.structure.push(rightPillar);
            
            // Featured marker is now slot[0] (created by createMarkers() below)
            // Gold appearance will be applied automatically for slot[0] on stages
            
            // Front edge step
            const stepGeometry = new this.THREE.BoxGeometry(width, 0.2, 0.5);
            const step = new this.THREE.Mesh(stepGeometry, material);
            step.position.set(0, height + 0.1, depth / 2 + 0.25);
            step.userData = this.createStructureUserData(furniture);
            furnitureGroup.add(step);
            visualElements.structure.push(step);
            
            console.log(`🪑 Created stage with roof, back wall, and center marker - ${visualElements.structure.length} elements`);
        }

        /**
         * Create amphitheatre structure (tiered seating)
         */
        createAmphitheatreStructure(furniture, visualElements, furnitureGroup, material) {
            const { radius, tiers, tierHeight, tierDepth } = furniture.geometryParams;
            
            // Create each tier as a curved platform
            for (let tier = 0; tier < tiers; tier++) {
                const tierRadius = radius - (tier * tierDepth);
                const tierGeometry = new this.THREE.CylinderGeometry(
                    tierRadius,
                    tierRadius,
                    tierHeight,
                    32,
                    1,
                    false,
                    0,
                    Math.PI // Semicircle
                );
                
                const tierMesh = new this.THREE.Mesh(tierGeometry, material);
                tierMesh.position.set(0, tier * tierHeight + tierHeight / 2, 0);
                tierMesh.userData = this.createStructureUserData(furniture);
                furnitureGroup.add(tierMesh);
                visualElements.structure.push(tierMesh);
            }
            
            // Add stepped back wall to match tiered structure
            for (let tier = 0; tier < tiers; tier++) {
                const tierRadius = radius - (tier * tierDepth);
                const wallWidth = tierRadius * 2; // Width matches this tier's diameter
                const wallThickness = 0.5;
                
                const wallGeometry = new this.THREE.BoxGeometry(wallWidth, tierHeight, wallThickness);
                const wallMesh = new this.THREE.Mesh(wallGeometry, material);
                wallMesh.position.set(0, tier * tierHeight + tierHeight / 2, 0); // Match tier height
                wallMesh.rotation.y = Math.PI / 2; // Rotate 90 degrees to cover the back
                wallMesh.userData = this.createStructureUserData(furniture);
                furnitureGroup.add(wallMesh);
                visualElements.structure.push(wallMesh);
            }
            
            console.log(`🪑 Created amphitheatre structure with ${visualElements.structure.length} tiers + stepped back wall`);
        }

        /**
         * Create structure userData for raycasting (long-press menu)
         */
        createStructureUserData(furniture) {
            return {
                id: furniture.id,
                name: furniture.name,
                fileName: `Furniture: ${furniture.type}`,
                type: 'furniture',
                furnitureId: furniture.id,
                furnitureType: furniture.type,
                isFurniture: true,
                isFurnitureStructure: true, // For detecting clicks on main structure
                capacity: furniture.capacity,
                objectIds: furniture.objectIds
            };
        }

        /**
         * Create invisible tap area for easier furniture interaction
         * Covers entire furniture bounds to make tapping easier on sparse geometry
         */
        createFurnitureTapArea(furniture, visualElements, furnitureGroup) {
            const params = furniture.geometryParams;
            
            // Get dimensions with fallbacks to prevent NaN errors
            // Gallery wall uses thickness instead of depth
            // Amphitheatre uses radius-based calculations
            let width = params.width;
            let height = params.height;
            let depth = params.depth;
            
            // Fallback calculations for furniture types with non-standard params
            if (!width && params.radius) {
                width = params.radius * 2; // Amphitheatre
            }
            if (!height && params.tierHeight && params.tiers) {
                height = params.tierHeight * params.tiers; // Amphitheatre
            }
            if (!depth && params.thickness) {
                depth = params.thickness; // Gallery wall
            } else if (!depth && params.tierDepth) {
                depth = params.tierDepth; // Amphitheatre
            }
            
            // Final safety fallbacks
            width = width || 10;
            height = height || 5;
            depth = depth || 2;
            
            // Create invisible box covering entire furniture bounds (significantly larger for easier tapping)
            const tapAreaGeometry = new this.THREE.BoxGeometry(
                width * 1.5,  // 50% larger for much easier tapping from distance
                height * 1.5,
                depth * 1.5
            );
            
            // Invisible material - doesn't render but intercepts raycasts
            const tapAreaMaterial = new this.THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0,
                colorWrite: false,  // Doesn't affect color buffer
                depthWrite: false   // Doesn't affect depth buffer
            });
            
            const tapArea = new this.THREE.Mesh(tapAreaGeometry, tapAreaMaterial);
            tapArea.position.set(0, height / 2, 0);
            
            // Mark as furniture tap area for raycasting
            tapArea.userData = {
                ...this.createStructureUserData(furniture),
                isFurnitureTapArea: true
            };
            
            // CRITICAL FIX: Custom raycast that disables itself when camera is close
            // This allows objects ON the furniture to be tapped when up close
            const originalRaycast = tapArea.raycast.bind(tapArea);
            tapArea.raycast = (raycaster, intersects) => {
                // Get camera from raycaster
                const camera = raycaster.camera;
                if (camera && furnitureGroup) {
                    // Calculate distance from camera to furniture
                    const furnitureWorldPos = new this.THREE.Vector3();
                    furnitureGroup.getWorldPosition(furnitureWorldPos);
                    const distance = camera.position.distanceTo(furnitureWorldPos);
                    
                    // Only allow tap area raycasting when camera is FAR (>35 units)
                    // When close, disable it so objects on furniture can be clicked
                    // 35 units matches the file zone pattern distance threshold
                    if (distance <= 35) {
                        console.log(`🪑 [TAP AREA] Camera close (${distance.toFixed(1)} units) - disabling tap area raycast to allow object clicks`);
                        return; // Don't add to intersects
                    }
                }
                
                // Camera is far - use normal raycasting for easier furniture tapping
                originalRaycast(raycaster, intersects);
            };
            
            // Add FIRST to furniture group so raycaster hits it before objects
            furnitureGroup.add(tapArea);
            visualElements.tapArea = tapArea;
            
            console.log(`🪑 Created tap area for ${furniture.type}: ${(width * 1.5).toFixed(1)}x${(height * 1.5).toFixed(1)}x${(depth * 1.5).toFixed(1)}`);
        }

        /**
         * Create slot markers for object placement
         */
        createSlotMarkers(furniture, visualElements, furnitureGroup) {
            const slotGeometry = new this.THREE.CylinderGeometry(0.5, 0.6, 0.2, 16);
            
            furniture.positions.forEach((pos, index) => {
                // FEATURED MARKER: Gold material for slot[0] on stage types
                let slotMaterial;
                if (index === 0 && (furniture.type === window.FURNITURE_TYPES.STAGE_SMALL || furniture.type === window.FURNITURE_TYPES.STAGE_LARGE)) {
                    slotMaterial = new this.THREE.MeshStandardMaterial({
                        color: 0xFFD700,      // Gold
                        emissive: 0xFFD700,
                        emissiveIntensity: 0.5,
                        metalness: 0.8,
                        roughness: 0.2
                    });
                } else {
                    slotMaterial = this.slotMaterials.default.clone();
                }
                
                const slot = new this.THREE.Mesh(slotGeometry, slotMaterial);
                
                // Local position (furniture group handles world position)
                slot.position.set(pos.x, pos.y + 0.1, pos.z);
                
                // Full userData for raycasting AND stacking support
                // Add objectHeight/Width/Depth so the stacking system recognizes this as a valid support
                slot.userData = {
                    id: furniture.id,
                    name: furniture.name,
                    fileName: `Furniture: ${furniture.type}`,
                    type: 'furniture',
                    furnitureId: furniture.id,
                    slotIndex: index,
                    isFurnitureSlot: true,
                    isSlotMarker: true,  // Flag for stacking support detection
                    isFurniture: true,
                    furnitureType: furniture.type,
                    capacity: furniture.capacity,
                    // STACKING SUPPORT: Define dimensions so this acts as a valid support surface
                    objectHeight: 0.01,  // Effectively zero - use marker world position directly for furniture surface
                    objectWidth: 4.0,   // Increased from 1.2 to 4.0 for easier touch placement (2.0 unit detection radius)
                    objectDepth: 4.0,   // Increased from 1.2 to 4.0 for easier touch placement (2.0 unit detection radius)
                    isSupportSurface: true,  // Flag to indicate this can support other objects
                    rotation: pos.rotation  // Store rotation for object restoration
                };
                slot.name = `${furnitureGroup.name} (Slot ${index + 1})`;
                
                furnitureGroup.add(slot);
                visualElements.slots.push(slot);
            });

            console.log(`🪑 Created ${visualElements.slots.length} slot markers with stacking support`);
        }

        /**
         * Create rotation icon (curved arrow SVG) at bottom right corner
         */
        createRotationHandle(furniture, visualElements, furnitureGroup) {
            // Create a large, easy-to-tap 3D rotation button on top of furniture
            // Using a cylinder for the button base
            const buttonRadius = 0.8;  // Large enough to tap easily
            const buttonHeight = 0.3;
            
            const buttonGeometry = new this.THREE.CylinderGeometry(buttonRadius, buttonRadius, buttonHeight, 32);
            const buttonMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xFFD700,  // Gold color
                metalness: 0.6,
                roughness: 0.3,
                emissive: 0xFFD700,
                emissiveIntensity: 0.3
            });
            
            const button = new this.THREE.Mesh(buttonGeometry, buttonMaterial);
            
            // Position at top center of furniture
            const centerX = 0;
            const topY = this.getTopEdgeY(furniture) + 0.2; // Slightly above top
            const centerZ = 0;
            
            button.position.set(centerX, topY, centerZ);
            
            // Add rotation arrow symbol on top using a texture
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Draw curved arrow (rotation symbol) - larger and clearer
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 16;
            ctx.lineCap = 'round';
            
            // Draw circular arrow (270 degrees)
            ctx.beginPath();
            ctx.arc(128, 128, 80, 0.2 * Math.PI, 1.7 * Math.PI);
            ctx.stroke();
            
            // Draw arrowhead
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(128 + 65, 128 - 35);
            ctx.lineTo(128 + 95, 128 - 20);
            ctx.lineTo(128 + 75, 128 + 10);
            ctx.closePath();
            ctx.fill();
            
            // Create texture and apply to top of button
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // Create arrow symbol as a separate mesh on top
            const arrowGeometry = new this.THREE.CylinderGeometry(buttonRadius * 0.9, buttonRadius * 0.9, 0.05, 32);
            const arrowMaterial = new this.THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                opacity: 1.0,
                metalness: 0.3,
                roughness: 0.5
            });
            
            const arrowMesh = new this.THREE.Mesh(arrowGeometry, arrowMaterial);
            arrowMesh.position.y = buttonHeight / 2 + 0.03; // On top of button
            arrowMesh.rotation.x = -Math.PI / 2; // Face upward
            
            button.add(arrowMesh);
            
            // Set userData for interaction
            button.userData = {
                name: furniture.name,
                type: 'furnitureRotationIcon',
                furnitureId: furniture.id,
                isRotationIcon: true,
                isRotationHandle: true,
                isFurniture: false
            };
            button.name = `${furnitureGroup.name} (Rotation Button)`;
            
            furnitureGroup.add(button);
            visualElements.handles.push(button);
            
            console.log(`🪑 Created large 3D rotation button (radius: ${buttonRadius})`);
        }

        /**
         * Get top edge Y coordinate for rotation icon
         */
        getTopEdgeY(furniture) {
            switch (furniture.type) {
                case window.FURNITURE_TYPES.BOOKSHELF:
                    return furniture.geometryParams.height + 1;
                case window.FURNITURE_TYPES.GALLERY_WALL:
                    return furniture.geometryParams.height + 1;
                case window.FURNITURE_TYPES.RISER:
                    return 3.5; // Above tallest step
                case window.FURNITURE_TYPES.STAGE_SMALL:
                case window.FURNITURE_TYPES.STAGE_LARGE:
                    return furniture.geometryParams.height + 11; // Above roof
                case window.FURNITURE_TYPES.AMPHITHEATRE:
                    return 2;
                default:
                    return 3;
            }
        }

        /**
         * Get bottom edge Y coordinate for rotation icon (DEPRECATED - using top center now)
         */
        getBottomEdgeY(furniture) {
            switch (furniture.type) {
                case window.FURNITURE_TYPES.BOOKSHELF:
                case window.FURNITURE_TYPES.GALLERY_WALL:
                    return 1;
                case window.FURNITURE_TYPES.RISER:
                    return 0.5;
                case window.FURNITURE_TYPES.STAGE_SMALL:
                case window.FURNITURE_TYPES.STAGE_LARGE:
                    return furniture.geometryParams.height + 1;
                case window.FURNITURE_TYPES.AMPHITHEATRE:
                    return 0.5;
                default:
                    return 1;
            }
        }

        /**
         * Get front edge Z coordinate for rotation handle
         */
        getFrontEdgeZ(furniture) {
            switch (furniture.type) {
                case window.FURNITURE_TYPES.BOOKSHELF:
                    return furniture.geometryParams.depth / 2 + 1;
                case window.FURNITURE_TYPES.RISER:
                case window.FURNITURE_TYPES.STAGE_SMALL:
                case window.FURNITURE_TYPES.STAGE_LARGE:
                    return furniture.geometryParams.depth / 2 + 1;
                case window.FURNITURE_TYPES.GALLERY_WALL:
                    return furniture.geometryParams.thickness / 2 + 1;
                case window.FURNITURE_TYPES.AMPHITHEATRE:
                    return furniture.geometryParams.radius + 2;
                default:
                    return 2;
            }
        }

        /**
         * Highlight slot marker (when object preview is active)
         */
        highlightSlot(furnitureId, slotIndex) {
            const visualElements = this.furnitureMeshes.get(furnitureId);
            if (!visualElements) return;
            
            const slot = visualElements.slots[slotIndex];
            if (slot) {
                slot.material = this.slotMaterials.active;
                console.log(`🪑 Highlighted slot ${slotIndex} on furniture ${furnitureId}`);
            }
        }

        /**
         * Clear slot highlight
         */
        clearSlotHighlight(furnitureId, slotIndex) {
            const visualElements = this.furnitureMeshes.get(furnitureId);
            if (!visualElements) return;
            
            const slot = visualElements.slots[slotIndex];
            if (slot) {
                const furniture = this.activeFurniture.get(furnitureId);
                const isOccupied = furniture && furniture.objectIds[slotIndex];
                slot.material = isOccupied ? this.slotMaterials.occupied : this.slotMaterials.default;
                console.log(`🪑 Cleared highlight on slot ${slotIndex}`);
            }
        }

        /**
         * Remove furniture from scene
         */
        removeFurniture(furnitureId) {
            const visualElements = this.furnitureMeshes.get(furnitureId);
            if (!visualElements) {
                console.warn('🪑 Furniture not found in visual manager:', furnitureId);
                return false;
            }

            // Stop idle animations before removal
            if (this.idleAnimationManager) {
                this.idleAnimationManager.stopAnimation(furnitureId, this);
                console.log(`🪑 Stopped idle animations for furniture: ${furnitureId}`);
            }

            // Remove group from scene
            this.scene.remove(visualElements.group);
            
            // Dispose geometries and materials
            this.disposeVisualElements(visualElements);

            // Clear references
            this.furnitureMeshes.delete(furnitureId);
            this.activeFurniture.delete(furnitureId);

            console.log(`🪑 Removed furniture: ${furnitureId}`);
            return true;
        }

        /**
         * Dispose visual elements to free memory
         */
        disposeVisualElements(visualElements) {
            [...visualElements.structure, ...visualElements.slots, ...visualElements.handles].forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) {
                    if (mesh.material.map) mesh.material.map.dispose();
                    mesh.material.dispose();
                }
            });
        }

        /**
         * Update furniture position (when moved)
         */
        updateFurniturePosition(furnitureId, newPosition) {
            const visualElements = this.furnitureMeshes.get(furnitureId);
            const furniture = this.activeFurniture.get(furnitureId);
            
            if (!visualElements || !furniture) {
                console.warn('🪑 Cannot update position - furniture not found:', furnitureId);
                return false;
            }

            // DIAGNOSTIC: Check children before and after position change
            const childCountBefore = visualElements.group.children.length;
            console.log(`🪑 Visual Manager: BEFORE position.set - ${childCountBefore} children`);
            
            visualElements.group.position.set(newPosition.x, newPosition.y, newPosition.z);
            furniture.position = newPosition;
            furniture.lastModified = Date.now();
            
            const childCountAfter = visualElements.group.children.length;
            console.log(`🪑 Visual Manager: AFTER position.set - ${childCountAfter} children`);
            if (childCountBefore !== childCountAfter) {
                console.error(`🪑 ERROR: Children count changed during position update! ${childCountBefore} -> ${childCountAfter}`);
            }

            console.log(`🪑 Updated furniture position: ${furnitureId}`, newPosition);
            return true;
        }

        /**
         * Update furniture rotation (when rotated via handle)
         */
        updateFurnitureRotation(furnitureId, newRotation) {
            const visualElements = this.furnitureMeshes.get(furnitureId);
            const furniture = this.activeFurniture.get(furnitureId);
            
            if (!visualElements || !furniture) {
                console.warn('🪑 Cannot update rotation - furniture not found:', furnitureId);
                return false;
            }

            visualElements.group.rotation.y = newRotation;
            furniture.rotation = newRotation;
            furniture.lastModified = Date.now();

            console.log(`🪑 Updated furniture rotation: ${furnitureId}`, newRotation);
            return true;
        }

        /**
         * Get furniture mesh group
         */
        getFurnitureGroup(furnitureId) {
            const visualElements = this.furnitureMeshes.get(furnitureId);
            return visualElements ? visualElements.group : null;
        }

        /**
         * Get all slot markers from all furniture (for stacking support detection)
         * @returns {Array} Array of all slot marker meshes with world positions
         */
        getAllSlotMarkers() {
            const allMarkers = [];
            
            this.furnitureMeshes.forEach((visualElements, furnitureId) => {
                if (visualElements.slots && visualElements.slots.length > 0) {
                    // Return the actual slot meshes - they already have world positions via scene graph
                    visualElements.slots.forEach(slot => {
                        allMarkers.push(slot);
                    });
                }
            });
            
            console.log(`🪑 getAllSlotMarkers returning ${allMarkers.length} markers`);
            if (allMarkers.length > 0) {
                console.log(`🪑 Sample marker properties:`, {
                    hasPosition: !!allMarkers[0].position,
                    hasUserData: !!allMarkers[0].userData,
                    hasGeometry: !!allMarkers[0].geometry,
                    objectHeight: allMarkers[0].userData?.objectHeight,
                    objectWidth: allMarkers[0].userData?.objectWidth,
                    objectDepth: allMarkers[0].userData?.objectDepth,
                    isSupportSurface: allMarkers[0].userData?.isSupportSurface
                });
            }
            
            return allMarkers;
        }

        /**
         * Get all furniture IDs
         */
        getAllFurnitureIds() {
            return Array.from(this.activeFurniture.keys());
        }

        /**
         * Update marker states for playback visualization
         * @param {string} furnitureId - Furniture ID
         * @param {number} activeIndex - Currently playing slot index
         * @param {Array<number>} playedIndices - Previously played slot indices
         * @param {number|null} nextIndex - Next slot to play (null if none)
         */
        updateMarkerStates(furnitureId, activeIndex, playedIndices = [], nextIndex = null) {
            const visualElements = this.furnitureMeshes.get(furnitureId);
            if (!visualElements || !visualElements.slots) return;

            const furniture = this.activeFurniture.get(furnitureId);
            if (!furniture) return;

            const objectIds = furniture.objectIds || [];
            
            console.log(`🪑 Updating marker states: active=${activeIndex}, played=[${playedIndices.join(', ')}], next=${nextIndex}`);

            visualElements.slots.forEach((slot, index) => {
                const hasObject = objectIds[index];
                
                if (index === activeIndex && hasObject) {
                    // Currently playing - GREEN GLOW
                    slot.material = this.slotMaterials.playing;
                } else if (playedIndices.includes(index) && hasObject) {
                    // Previously played - RED GLOW
                    slot.material = this.slotMaterials.played;
                } else if (index === nextIndex && hasObject) {
                    // Next to play - BLUE GLOW
                    slot.material = this.slotMaterials.next;
                } else if (hasObject) {
                    // Has object but not active - INACTIVE (blue, semi-transparent)
                    slot.material = this.slotMaterials.inactive;
                } else if (index === 0 && (furniture.type === window.FURNITURE_TYPES.STAGE_SMALL || furniture.type === window.FURNITURE_TYPES.STAGE_LARGE)) {
                    // Featured marker (slot 0) - keep gold when empty
                    slot.material = new this.THREE.MeshStandardMaterial({
                        color: 0xFFD700,
                        emissive: 0xFFD700,
                        emissiveIntensity: 0.5,
                        metalness: 0.8,
                        roughness: 0.2
                    });
                } else {
                    // Empty slot - DEFAULT
                    slot.material = this.slotMaterials.default;
                }
            });
        }

        /**
         * Reset all markers to default state (when playback stops)
         */
        resetMarkerStates(furnitureId) {
            const visualElements = this.furnitureMeshes.get(furnitureId);
            if (!visualElements || !visualElements.slots) return;

            const furniture = this.activeFurniture.get(furnitureId);
            if (!furniture) return;

            const objectIds = furniture.objectIds || [];

            visualElements.slots.forEach((slot, index) => {
                const hasObject = objectIds[index];
                
                if (hasObject) {
                    // Has object - INACTIVE (blue)
                    slot.material = this.slotMaterials.inactive;
                } else if (index === 0 && (furniture.type === window.FURNITURE_TYPES.STAGE_SMALL || furniture.type === window.FURNITURE_TYPES.STAGE_LARGE)) {
                    // Featured marker - keep gold
                    slot.material = new this.THREE.MeshStandardMaterial({
                        color: 0xFFD700,
                        emissive: 0xFFD700,
                        emissiveIntensity: 0.5,
                        metalness: 0.8,
                        roughness: 0.2
                    });
                } else {
                    // Empty slot - DEFAULT
                    slot.material = this.slotMaterials.default;
                }
            });

            console.log(`🪑 Reset marker states for furniture ${furnitureId}`);
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    
    window.FurnitureVisualManager = FurnitureVisualManager;
    
    console.log('✅ Furniture Visual Manager loaded');
})();
