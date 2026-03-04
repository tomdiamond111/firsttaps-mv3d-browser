// modules/worlds/futureCarGalleryWorld.js
// Futuristic Car Gallery World Template - Premium car stereo interface aesthetic
// Dependencies: THREE (global), BaseWorldTemplate

(function() {
    'use strict';
    
    console.log("Loading FutureCarGalleryWorld module...");
    
    /**
     * FUTURISTIC CAR GALLERY WORLD TEMPLATE
     * Sleek, premium car stereo interface aesthetic
     * Think Tesla/Audi - clean, modern, tech-forward but not sci-fi
     */
    class FutureCarGalleryWorldTemplate extends window.BaseWorldTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                // Cool tech lighting - electric blue accents
                ambientLightColor: 0x404050, // Cool white
                ambientLightIntensity: 0.3,
                directionalLightColor: 0x00CCFF, // Electric blue
                directionalLightIntensity: 0.5,
                ...config
            });
            this.accentLights = [];
        }

        setupEnvironment() {
            console.log('=== SETTING UP FUTURISTIC CAR GALLERY ===');
            
            this.groundLevelY = 0;
            
            // Large dark background plane (prevents purple sky from showing on ground beyond floor)
            const bgPlaneGeometry = new this.THREE.PlaneGeometry(500, 500);
            const bgPlaneMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x0a0a0f, // Very dark, almost black
                metalness: 0.2,
                roughness: 0.9
            });
            const bgPlane = new this.THREE.Mesh(bgPlaneGeometry, bgPlaneMaterial);
            bgPlane.rotation.x = -Math.PI / 2;
            bgPlane.position.y = -0.02; // Slightly below main floor
            bgPlane.receiveShadow = true;
            bgPlane.userData.templateObject = true;
            this.scene.add(bgPlane);
            this.objects.push(bgPlane);

            // Dark graphite floor with LED strip effect - 185x185 (another 15% larger)
            const floorGeometry = new this.THREE.PlaneGeometry(185, 185, 92, 92);
            
            const colors = new Float32Array(floorGeometry.attributes.position.count * 3);
            const baseColor = new this.THREE.Color(0x181820); // Deep graphite
            const accentColor = new this.THREE.Color(0x1A2030); // Slight blue tint
            
            for (let i = 0; i < floorGeometry.attributes.position.count; i++) {
                const x = floorGeometry.attributes.position.getX(i);
                const z = floorGeometry.attributes.position.getZ(i);
                
                // Create subtle radial gradient from center
                const distFromCenter = Math.sqrt(x * x + z * z) / 50;
                const t = Math.min(1, distFromCenter);
                const color = baseColor.clone().lerp(accentColor, t);
                
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
            
            floorGeometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
            
            const floorMaterial = new this.THREE.MeshStandardMaterial({
                vertexColors: true,
                side: this.THREE.FrontSide,
                metalness: 0.6, // Slightly metallic
                roughness: 0.3  // Smooth finish
            });
            
            const floor = new this.THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -0.01;
            floor.receiveShadow = true;
            floor.userData.templateObject = true;
            this.scene.add(floor);
            this.objects.push(floor);

            // Minimal tech grid
            const grid = new this.THREE.GridHelper(185, 37, 0x00CCFF, 0x004466);
            grid.material.transparent = true;
            grid.material.opacity = 0.15;
            grid.userData.templateObject = true;
            this.scene.add(grid);
            this.objects.push(grid);

            // Create giant dashboard showroom elements
            // REMOVED: Nook wall was overlapping with demo furniture
            // this.createAudioDisplayWall();
            // this.createStepsToNooks();  // Add steps for climbing to nooks - REMOVED
            this.createRadioDialColumns();
            // this.createStepsToDialColumns();  // Add steps for climbing to tall dials - REMOVED
            this.createConsolePlatforms();
            this.createNookPillars();

            // Create LED strip accents around perimeter
            this.createLEDStrips();

            // Animated shimmering sky gradient (blue, purple, pink light show)
            this.skyBaseColor = new this.THREE.Color(0x4a2a6a); // Purple-blue
            this.skyAccentColor = new this.THREE.Color(0x7a3a8a); // Pink-purple
            this.scene.background = this.skyBaseColor.clone();
            this.scene.fog = new this.THREE.Fog(0x5a3a7a, 100, 300); // Distant purple fog only
            
            console.log('Futuristic car gallery setup complete');
        }

        createAudioDisplayWall() {
            // Car dashboard wall with deep cut-out nooks
            const wallWidth = 40;
            const wallHeight = 18;
            const wallThickness = 4;
            const wallZ = -28;
            
            // Main dashboard panel material
            const panelMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x1A1A25,
                metalness: 0.9,
                roughness: 0.2,
                emissive: 0x000510,
                emissiveIntensity: 0.3
            });
            
            // Create panel in sections to leave holes for nooks
            // Nook positions: -15, -7.5, 0, 7.5, 15 (6x6 each, spacing 7.5)
            // Using constants: nookWidth=6, nookHeight=6, spacing=7.5
            
            // Left section (before first nook at x=-15)
            const nookWidth = 6;
            const nookHeight = 6;
            const spacing = 7.5;
            const leftWidth = wallWidth/2 - 15 - nookWidth/2;
            const leftPanel = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(leftWidth, wallHeight, wallThickness),
                panelMaterial
            );
            leftPanel.position.set(-wallWidth/2 + leftWidth/2, wallHeight/2, wallZ);
            leftPanel.userData.templateObject = true;
            this.scene.add(leftPanel);
            this.objects.push(leftPanel);
            
            // Right section (after last nook at x=15)
            const rightWidth = wallWidth/2 - 15 - nookWidth/2;
            const rightPanel = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(rightWidth, wallHeight, wallThickness),
                panelMaterial
            );
            rightPanel.position.set(wallWidth/2 - rightWidth/2, wallHeight/2, wallZ);
            rightPanel.userData.templateObject = true;
            this.scene.add(rightPanel);
            this.objects.push(rightPanel);
            
            // Top section (above nooks)
            const topHeight = wallHeight - (wallHeight/2 + nookHeight/2);
            const topPanel = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(wallWidth - leftWidth - rightWidth, topHeight, wallThickness),
                panelMaterial
            );
            topPanel.position.set(0, wallHeight - topHeight/2, wallZ);
            topPanel.userData.templateObject = true;
            this.scene.add(topPanel);
            this.objects.push(topPanel);
            
            // Bottom section (below nooks)
            const bottomHeight = wallHeight/2 - nookHeight/2;
            const bottomPanel = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(wallWidth - leftWidth - rightWidth, bottomHeight, wallThickness),
                panelMaterial
            );
            bottomPanel.position.set(0, bottomHeight/2, wallZ);
            bottomPanel.userData.templateObject = true;
            this.scene.add(bottomPanel);
            this.objects.push(bottomPanel);
            
            // Vertical strips between nooks (4 strips between 5 nooks)
            const stripWidth = spacing - nookWidth;
            for (let i = 0; i < 4; i++) {
                const stripX = (-15 + nookWidth/2) + (i + 0.5) * spacing;
                const strip = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(stripWidth, nookHeight, wallThickness),
                    panelMaterial
                );
                strip.position.set(stripX, wallHeight/2, wallZ);
                strip.userData.templateObject = true;
                this.scene.add(strip);
                this.objects.push(strip);
            }
            
            // Top LED strip accent
            const topEdgeMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x00FFFF,
                emissive: 0x00FFFF,
                emissiveIntensity: 1.5,
                metalness: 1.0,
                roughness: 0.0
            });
            
            const topStrip = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(wallWidth + 0.5, 0.4, 0.4),
                topEdgeMaterial
            );
            topStrip.position.set(0, wallHeight, wallZ + wallThickness / 2 + 0.2);
            topStrip.userData.templateObject = true;
            this.scene.add(topStrip);
            this.objects.push(topStrip);
            this.accentLights.push(topStrip);
            
            // Left edge neon strip on top surface
            const leftEdgeStrip = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(0.4, 0.4, wallThickness + 0.5),
                topEdgeMaterial.clone()
            );
            leftEdgeStrip.position.set(-wallWidth / 2, wallHeight, wallZ);
            leftEdgeStrip.userData.templateObject = true;
            this.scene.add(leftEdgeStrip);
            this.objects.push(leftEdgeStrip);
            this.accentLights.push(leftEdgeStrip);
            
            // Right edge neon strip on top surface
            const rightEdgeStrip = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(0.4, 0.4, wallThickness + 0.5),
                topEdgeMaterial.clone()
            );
            rightEdgeStrip.position.set(wallWidth / 2, wallHeight, wallZ);
            rightEdgeStrip.userData.templateObject = true;
            this.scene.add(rightEdgeStrip);
            this.objects.push(rightEdgeStrip);
            this.accentLights.push(rightEdgeStrip);
            
            // Create 5 deep cut-out nooks
            const nookDepth = 3; // Deeper for cut-out effect
            const nookY = wallHeight / 2;
            
            for (let i = 0; i < 5; i++) {
                const nookX = (i - 2) * spacing; // -15, -7.5, 0, 7.5, 15
                
                // Calculate positions relative to wall
                const nookFrontZ = wallZ + wallThickness / 2; // Front face of wall
                const nookBackZ = wallZ - wallThickness / 2 - nookDepth + 0.5; // Deep recess
                const nookMidZ = (nookFrontZ + nookBackZ) / 2;
                
                // Create cut-out recess with slightly lighter interior walls to catch light
                const recessMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x151520, // Slightly lighter than before
                    metalness: 0.7,
                    roughness: 0.3 // More reflective
                });
                
                // Back wall of cut-out (deep inside) - highly emissive for depth clarity
                const backWallMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x00FFFF,
                    metalness: 1.0,
                    roughness: 0.0,
                    emissive: 0x00FFFF,
                    emissiveIntensity: 2.0
                });
                
                const backWall = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(nookWidth, nookHeight, 0.4),
                    backWallMaterial
                );
                backWall.position.set(nookX, nookY, nookBackZ);
                backWall.userData.templateObject = true;
                this.scene.add(backWall);
                this.objects.push(backWall);
                this.accentLights.push(backWall); // Add to pulsing lights for visibility
                
                // Side walls connecting back to front
                const sideWallGeometry = new this.THREE.BoxGeometry(0.4, nookHeight, nookDepth);
                
                const leftWall = new this.THREE.Mesh(sideWallGeometry, recessMaterial);
                leftWall.position.set(nookX - nookWidth / 2, nookY, nookMidZ);
                leftWall.userData.templateObject = true;
                this.scene.add(leftWall);
                this.objects.push(leftWall);
                
                const rightWall = new this.THREE.Mesh(sideWallGeometry, recessMaterial);
                rightWall.position.set(nookX + nookWidth / 2, nookY, nookMidZ);
                rightWall.userData.templateObject = true;
                this.scene.add(rightWall);
                this.objects.push(rightWall);
                
                // Top wall of cut-out
                const topWall = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(nookWidth, 0.4, nookDepth),
                    recessMaterial
                );
                topWall.position.set(nookX, nookY + nookHeight / 2, nookMidZ);
                topWall.userData.templateObject = true;
                this.scene.add(topWall);
                this.objects.push(topWall);
                
                // Bottom wall (shelf platform)
                const bottomWall = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(nookWidth, 0.4, nookDepth),
                    recessMaterial
                );
                bottomWall.position.set(nookX, nookY - nookHeight / 2, nookMidZ);
                bottomWall.userData.templateObject = true;
                this.scene.add(bottomWall);
                this.objects.push(bottomWall);
                
                // Glowing shelf inside the recess (where objects sit)
                const shelfWidth = nookWidth * 0.85;
                const shelfDepth = nookDepth * 0.8;
                const shelfThickness = 0.3;
                const shelfY = nookY - nookHeight / 2 + 0.6;
                
                const shelfMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x00FFFF,
                    metalness: 1.0,
                    roughness: 0.0,
                    emissive: 0x00FFFF,
                    emissiveIntensity: 1.5
                });
                
                const shelf = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(shelfWidth, shelfThickness, shelfDepth),
                    shelfMaterial
                );
                shelf.position.set(nookX, shelfY, nookMidZ);
                shelf.userData.templateObject = true;
                shelf.userData.canPlaceObjects = true;
                this.scene.add(shelf);
                this.objects.push(shelf);
                this.accentLights.push(shelf);
                
                // Brilliant LED backlight inside recess (near back wall)
                const backLight = new this.THREE.PointLight(0x00FFFF, 1.8, 15);
                backLight.position.set(nookX, nookY, nookBackZ - 0.3);
                backLight.userData.templateLight = true;
                this.scene.add(backLight);
                this.objects.push(backLight);
                
                // Additional fill lights to illuminate interior side walls
                const interiorLight1 = new this.THREE.PointLight(0x00FFFF, 1.2, 8);
                interiorLight1.position.set(nookX - nookWidth / 3, nookY + nookHeight / 3, nookMidZ);
                interiorLight1.userData.templateLight = true;
                this.scene.add(interiorLight1);
                this.objects.push(interiorLight1);
                
                const interiorLight2 = new this.THREE.PointLight(0x00FFFF, 1.2, 8);
                interiorLight2.position.set(nookX + nookWidth / 3, nookY - nookHeight / 3, nookMidZ);
                interiorLight2.userData.templateLight = true;
                this.scene.add(interiorLight2);
                this.objects.push(interiorLight2);
                
                // MARKER ON SHELF (where objects will snap to)
                const markerGeometry = new this.THREE.SphereGeometry(0.5, 8, 8);
                const markerMaterial = new this.THREE.MeshBasicMaterial({
                    color: 0x00FFFF,
                    transparent: true,
                    opacity: 0.0
                });
                const marker = new this.THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.set(nookX, shelfY + 0.2, nookMidZ);
                marker.userData.isSlotMarker = true;
                marker.userData.furnitureId = `panel_nook_${i}`;
                marker.userData.slotIndex = i;
                marker.userData.templateObject = true;
                this.scene.add(marker);
                this.objects.push(marker);
                
                // Brilliant neon frame around cut-out opening (at wall front)
                const frameThickness = 0.3;
                const frameMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x00FFFF,
                    emissive: 0x00FFFF,
                    emissiveIntensity: 2.8,
                    metalness: 1.0,
                    roughness: 0.0
                });
                
                // Top frame at wall opening
                const topFrame = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(nookWidth + 0.6, frameThickness, frameThickness),
                    frameMaterial
                );
                topFrame.position.set(nookX, nookY + nookHeight / 2, nookFrontZ);
                topFrame.userData.templateObject = true;
                this.scene.add(topFrame);
                this.objects.push(topFrame);
                this.accentLights.push(topFrame);
                
                // Bottom frame at wall opening
                const bottomFrame = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(nookWidth + 0.6, frameThickness, frameThickness),
                    frameMaterial.clone()
                );
                bottomFrame.position.set(nookX, nookY - nookHeight / 2, nookFrontZ);
                bottomFrame.userData.templateObject = true;
                this.scene.add(bottomFrame);
                this.objects.push(bottomFrame);
                this.accentLights.push(bottomFrame);
                
                // Left frame at wall opening
                const leftFrame = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(frameThickness, nookHeight + 0.6, frameThickness),
                    frameMaterial.clone()
                );
                leftFrame.position.set(nookX - nookWidth / 2, nookY, nookFrontZ);
                leftFrame.userData.templateObject = true;
                this.scene.add(leftFrame);
                this.objects.push(leftFrame);
                this.accentLights.push(leftFrame);
                
                // Right frame at wall opening
                const rightFrame = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(frameThickness, nookHeight + 0.6, frameThickness),
                    frameMaterial.clone()
                );
                rightFrame.position.set(nookX + nookWidth / 2, nookY, nookFrontZ);
                rightFrame.userData.templateObject = true;
                this.scene.add(rightFrame);
                this.objects.push(rightFrame);
                this.accentLights.push(rightFrame);
            }
        }

        createStepsToNooks() {
            // Add steps to allow objects to climb from ground level to nook shelves (height ~9 units)
            // Steps positioned in front of nook wall at z=-28
            const wallZ = -28;
            const spacing = 7.5;
            const stepCount = 5;  // 5 steps for ~9 unit climb (each ~1.8 units high)
            const stepHeight = 1.8;
            const stepDepth = 3;
            const stepWidth = 6;  // Wide enough to cover nook width
            
            // Create steps for center 3 nooks (indices 1, 2, 3)
            const nookIndices = [1, 2, 3];
            
            nookIndices.forEach(nookIndex => {
                const nookX = (nookIndex - 2) * spacing;
                
                for (let i = 0; i < stepCount; i++) {
                    const stepY = (i + 1) * stepHeight;
                    const stepZ = wallZ + 10 + (stepCount - i) * stepDepth;  // Steps approach from front
                    
                    const stepGeometry = new this.THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
                    const stepMaterial = new this.THREE.MeshStandardMaterial({
                        color: 0x1A1A25,
                        metalness: 0.7,
                        roughness: 0.3
                    });
                    
                    const step = new this.THREE.Mesh(stepGeometry, stepMaterial);
                    step.position.set(nookX, stepY - stepHeight/2, stepZ - stepDepth/2);
                    step.userData.templateObject = true;
                    step.userData.canPlaceObjects = true;
                    this.scene.add(step);
                    this.objects.push(step);
                    
                    // Marker for each step
                    const stepMarkerGeometry = new this.THREE.SphereGeometry(0.3, 8, 8);
                    const stepMarkerMaterial = new this.THREE.MeshBasicMaterial({
                        color: 0x00FFFF,
                        transparent: true,
                        opacity: 0.0
                    });
                    const stepMarker = new this.THREE.Mesh(stepMarkerGeometry, stepMarkerMaterial);
                    stepMarker.position.set(nookX, stepY + 0.2, stepZ - stepDepth/2);
                    stepMarker.userData.isSlotMarker = true;
                    stepMarker.userData.furnitureId = `nook_${nookIndex}_step_${i}`;
                    stepMarker.userData.slotIndex = i;
                    stepMarker.userData.templateObject = true;
                    this.scene.add(stepMarker);
                    this.objects.push(stepMarker);
                    
                    // LED edge on each step
                    const edgeMaterial = new this.THREE.MeshStandardMaterial({
                        color: 0x00FFFF,
                        emissive: 0x00FFFF,
                        emissiveIntensity: 0.6,
                        metalness: 1.0,
                        roughness: 0.0
                    });
                    
                    const edgeGeometry = new this.THREE.BoxGeometry(stepWidth, 0.2, 0.2);
                    const edge = new this.THREE.Mesh(edgeGeometry, edgeMaterial);
                    edge.position.set(nookX, stepY + 0.1, stepZ - stepDepth);
                    edge.userData.templateObject = true;
                    this.scene.add(edge);
                    this.objects.push(edge);
                    this.accentLights.push(edge);
                }
            });
        }

        createRadioDialColumns() {
            // Giant cylindrical columns that look like volume knobs/radio dials
            // MOVED: Pushed further from origin to avoid demo furniture overlap
            const dialPositions = [
                { x: -50, z: -50, height: 8 },
                { x: 50, z: -50, height: 6 },
                { x: -50, z: 50, height: 5 },
                { x: 50, z: 50, height: 7 }
            ];
            
            dialPositions.forEach((pos, index) => {
                // Main cylinder body
                // OPTIMIZED: Reduced segments from 32 to 16 for better performance
                const dialGeometry = new this.THREE.CylinderGeometry(2.5, 2.5, pos.height, 16);
                const dialMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x2A2A35,
                    metalness: 0.9,
                    roughness: 0.3
                });
                
                const dial = new this.THREE.Mesh(dialGeometry, dialMaterial);
                dial.position.set(pos.x, pos.height / 2, pos.z);
                dial.userData.templateObject = true;
                dial.userData.canPlaceObjects = true;
                this.scene.add(dial);
                this.objects.push(dial);
                
                // Create furniture marker on top for stacking
                // OPTIMIZED: Reduced sphere segments from 8,8 to 6,6 for better performance
                const dialMarkerGeometry = new this.THREE.SphereGeometry(0.3, 6, 6);
                const dialMarkerMaterial = new this.THREE.MeshBasicMaterial({
                    color: 0x00FFFF,
                    transparent: true,
                    opacity: 0.0
                });
                const dialMarker = new this.THREE.Mesh(dialMarkerGeometry, dialMarkerMaterial);
                dialMarker.position.set(pos.x, pos.height + 0.2, pos.z);
                dialMarker.userData.isSlotMarker = true;
                dialMarker.userData.furnitureId = `dial_column_${index}`;
                dialMarker.userData.slotIndex = 0;
                dialMarker.userData.templateObject = true;
                this.scene.add(dialMarker);
                this.objects.push(dialMarker);
                
                // LED ring at top
                // OPTIMIZED: Reduced torus segments from 16x32 to 8x16 for better performance
                const ringGeometry = new this.THREE.TorusGeometry(2.7, 0.15, 8, 16);
                const ringMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x00CCFF,
                    emissive: 0x00AADD,
                    emissiveIntensity: 0.6,
                    metalness: 0.8,
                    roughness: 0.2
                });
                
                const ring = new this.THREE.Mesh(ringGeometry, ringMaterial);
                ring.position.set(pos.x, pos.height, pos.z);
                ring.rotation.x = Math.PI / 2;
                ring.userData.templateObject = true;
                this.scene.add(ring);
                this.objects.push(ring);
                this.accentLights.push(ring);
                
                // Point light above dial
                const dialLight = new this.THREE.PointLight(0x00CCFF, 0.3, 15);
                dialLight.position.set(pos.x, pos.height + 1, pos.z);
                dialLight.userData.templateLight = true;
                this.scene.add(dialLight);
                this.objects.push(dialLight);
            });
        }

        createStepsToDialColumns() {
            // Add steps to climb tall dial columns (heights 5-8 units)
            const dialPositions = [
                { x: -40, z: -10, height: 8 },
                { x: 40, z: -10, height: 6 },
                { x: -35, z: 15, height: 5 },
                { x: 35, z: 15, height: 7 }
            ];
            
            dialPositions.forEach((pos, dialIndex) => {
                // Only add steps for dials taller than 3 units
                if (pos.height > 3) {
                    const stepCount = Math.ceil(pos.height / 1.8);  // ~1.8 units per step
                    const stepHeight = pos.height / stepCount;
                    const stepDepth = 2.5;
                    const stepWidth = 4;
                    
                    for (let i = 0; i < stepCount; i++) {
                        const stepY = (i + 1) * stepHeight;
                        const stepZ = pos.z + 6 + (stepCount - i) * stepDepth;  // Steps approach from front
                        
                        const stepGeometry = new this.THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
                        const stepMaterial = new this.THREE.MeshStandardMaterial({
                            color: 0x1A1A25,
                            metalness: 0.7,
                            roughness: 0.3
                        });
                        
                        const step = new this.THREE.Mesh(stepGeometry, stepMaterial);
                        step.position.set(pos.x, stepY - stepHeight/2, stepZ - stepDepth/2);
                        step.userData.templateObject = true;
                        step.userData.canPlaceObjects = true;
                        this.scene.add(step);
                        this.objects.push(step);
                        
                        // Marker for each step
                        const stepMarkerGeometry = new this.THREE.SphereGeometry(0.3, 8, 8);
                        const stepMarkerMaterial = new this.THREE.MeshBasicMaterial({
                            color: 0x00FFFF,
                            transparent: true,
                            opacity: 0.0
                        });
                        const stepMarker = new this.THREE.Mesh(stepMarkerGeometry, stepMarkerMaterial);
                        stepMarker.position.set(pos.x, stepY + 0.2, stepZ - stepDepth/2);
                        stepMarker.userData.isSlotMarker = true;
                        stepMarker.userData.furnitureId = `dial_${dialIndex}_step_${i}`;
                        stepMarker.userData.slotIndex = i;
                        stepMarker.userData.templateObject = true;
                        this.scene.add(stepMarker);
                        this.objects.push(stepMarker);
                        
                        // LED edge on each step
                        const edgeMaterial = new this.THREE.MeshStandardMaterial({
                            color: 0x00FFFF,
                            emissive: 0x00FFFF,
                            emissiveIntensity: 0.5,
                            metalness: 1.0,
                            roughness: 0.0
                        });
                        
                        const edgeGeometry = new this.THREE.BoxGeometry(stepWidth, 0.15, 0.15);
                        const edge = new this.THREE.Mesh(edgeGeometry, edgeMaterial);
                        edge.position.set(pos.x, stepY + 0.08, stepZ - stepDepth);
                        edge.userData.templateObject = true;
                        this.scene.add(edge);
                        this.objects.push(edge);
                        this.accentLights.push(edge);
                    }
                }
            });
        }

        createConsolePlatforms() {
            // Low wide platforms like car center consoles
            // MOVED: Pushed further from origin to avoid demo furniture overlap
            const platforms = [
                { x: -60, z: -40, width: 10, height: 2, depth: 5 },
                { x: 60, z: -40, width: 10, height: 2.5, depth: 5 }
            ];
            
            platforms.forEach((platform, index) => {
                // Main platform body
                const platformGeometry = new this.THREE.BoxGeometry(
                    platform.width,
                    platform.height,
                    platform.depth
                );
                const platformMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x1A1A25,
                    metalness: 0.8,
                    roughness: 0.2
                });
                
                const platformMesh = new this.THREE.Mesh(platformGeometry, platformMaterial);
                platformMesh.position.set(platform.x, platform.height / 2, platform.z);
                platformMesh.userData.templateObject = true;
                platformMesh.userData.canPlaceObjects = true;
                this.scene.add(platformMesh);
                this.objects.push(platformMesh);
                
                // Create furniture marker on top for stacking
                // OPTIMIZED: Reduced sphere segments from 8,8 to 6,6 for better performance
                const platformMarkerGeometry = new this.THREE.SphereGeometry(0.3, 6, 6);
                const platformMarkerMaterial = new this.THREE.MeshBasicMaterial({
                    color: 0x00FFFF,
                    transparent: true,
                    opacity: 0.0
                });
                const platformMarker = new this.THREE.Mesh(platformMarkerGeometry, platformMarkerMaterial);
                platformMarker.position.set(platform.x, platform.height + 0.2, platform.z);
                platformMarker.userData.isSlotMarker = true;
                platformMarker.userData.furnitureId = `console_platform_${index}`;
                platformMarker.userData.slotIndex = 0;
                platformMarker.userData.templateObject = true;
                this.scene.add(platformMarker);
                this.objects.push(platformMarker);
                
                // LED strips along ALL edges for better visibility
                const edgeMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x00CCFF,
                    emissive: 0x00AADD,
                    emissiveIntensity: 0.8,
                    metalness: 0.8,
                    roughness: 0.2
                });
                
                // Front and back LED strips
                const stripGeometryFB = new this.THREE.BoxGeometry(platform.width, 0.3, 0.3);
                
                const frontStrip = new this.THREE.Mesh(stripGeometryFB, edgeMaterial);
                frontStrip.position.set(
                    platform.x,
                    platform.height + 0.15,
                    platform.z - platform.depth / 2
                );
                frontStrip.userData.templateObject = true;
                this.scene.add(frontStrip);
                this.objects.push(frontStrip);
                this.accentLights.push(frontStrip);
                
                const backStrip = new this.THREE.Mesh(stripGeometryFB, edgeMaterial.clone());
                backStrip.position.set(
                    platform.x,
                    platform.height + 0.15,
                    platform.z + platform.depth / 2
                );
                backStrip.userData.templateObject = true;
                this.scene.add(backStrip);
                this.objects.push(backStrip);
                this.accentLights.push(backStrip);
                
                // Left and right LED strips
                const stripGeometryLR = new this.THREE.BoxGeometry(0.3, 0.3, platform.depth);
                
                const leftStrip = new this.THREE.Mesh(stripGeometryLR, edgeMaterial.clone());
                leftStrip.position.set(
                    platform.x - platform.width / 2,
                    platform.height + 0.15,
                    platform.z
                );
                leftStrip.userData.templateObject = true;
                this.scene.add(leftStrip);
                this.objects.push(leftStrip);
                this.accentLights.push(leftStrip);
                
                const rightStrip = new this.THREE.Mesh(stripGeometryLR, edgeMaterial.clone());
                rightStrip.position.set(
                    platform.x + platform.width / 2,
                    platform.height + 0.15,
                    platform.z
                );
                rightStrip.userData.templateObject = true;
                this.scene.add(rightStrip);
                this.objects.push(rightStrip);
                this.accentLights.push(rightStrip);
                
                // Vertical corner LED strips for extra visibility
                const cornerGeometry = new this.THREE.BoxGeometry(0.3, platform.height, 0.3);
                
                const corners = [
                    { x: -platform.width / 2, z: -platform.depth / 2 },  // front-left
                    { x: platform.width / 2, z: -platform.depth / 2 },   // front-right
                    { x: -platform.width / 2, z: platform.depth / 2 },   // back-left
                    { x: platform.width / 2, z: platform.depth / 2 }     // back-right
                ];
                
                corners.forEach(corner => {
                    const cornerStrip = new this.THREE.Mesh(cornerGeometry, edgeMaterial.clone());
                    cornerStrip.position.set(
                        platform.x + corner.x,
                        platform.height / 2,
                        platform.z + corner.z
                    );
                    cornerStrip.userData.templateObject = true;
                    this.scene.add(cornerStrip);
                    this.objects.push(cornerStrip);
                    this.accentLights.push(cornerStrip);
                });
            });
        }

        createNookPillars() {
            // Tall pillars with lighted display nooks
            // MOVED: Pushed further back to reduce clutter near furniture
            const pillars = [
                { x: -30, z: 60, nookHeights: [3, 7] },
                { x: 30, z: 60, nookHeights: [3, 7] }
            ];
            
            pillars.forEach((pillar, pillarIndex) => {
                // Main pillar structure
                const pillarGeometry = new this.THREE.BoxGeometry(4, 10, 4);
                const pillarMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x252530,
                    metalness: 0.7,
                    roughness: 0.4
                });
                
                const pillarMesh = new this.THREE.Mesh(pillarGeometry, pillarMaterial);
                pillarMesh.position.set(pillar.x, 5, pillar.z);
                pillarMesh.userData.templateObject = true;
                this.scene.add(pillarMesh);
                this.objects.push(pillarMesh);
                
                // Create nooks at specified heights
                pillar.nookHeights.forEach((nookY, nookIndex) => {
                    const nookGeometry = new this.THREE.BoxGeometry(3, 2.5, 2);
                    const nookMaterial = new this.THREE.MeshStandardMaterial({
                        color: 0x0A0A15,
                        metalness: 0.7,
                        roughness: 0.3,
                        emissive: 0x003050,
                        emissiveIntensity: 0.6
                    });
                    
                    const nook = new this.THREE.Mesh(nookGeometry, nookMaterial);
                    nook.position.set(pillar.x, nookY, pillar.z);
                    nook.userData.templateObject = true;
                    nook.userData.canPlaceObjects = true;
                    this.scene.add(nook);
                    this.objects.push(nook);
                    
                    // LED backlight
                    const nookLight = new this.THREE.PointLight(0x00CCFF, 0.4, 6);
                    nookLight.position.set(pillar.x, nookY, pillar.z);
                    nookLight.userData.templateLight = true;
                    this.scene.add(nookLight);
                    this.objects.push(nookLight);
                    
                    // Create furniture marker for stacking
                    // OPTIMIZED: Reduced sphere segments from 8,8 to 6,6 for better performance
                    const pillarNookMarkerGeometry = new this.THREE.SphereGeometry(0.3, 6, 6);
                    const pillarNookMarkerMaterial = new this.THREE.MeshBasicMaterial({
                        color: 0x00FFFF,
                        transparent: true,
                        opacity: 0.0
                    });
                    const pillarNookMarker = new this.THREE.Mesh(pillarNookMarkerGeometry, pillarNookMarkerMaterial);
                    pillarNookMarker.position.set(pillar.x, nookY, pillar.z);
                    pillarNookMarker.userData.isSlotMarker = true;
                    pillarNookMarker.userData.furnitureId = `pillar_nook_${pillarIndex}_${nookIndex}`;
                    pillarNookMarker.userData.slotIndex = nookIndex;
                    this.scene.add(pillarNookMarker);
                    this.objects.push(pillarNookMarker);
                });
            });
        }

        createLEDStrips() {
            // Extended LED borders on ground to frame file zone areas (includes Docs/Apps/Contacts rows)
            const stripMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x00FFFF,
                emissive: 0x00AADD,
                emissiveIntensity: 0.5,
                metalness: 0.8,
                roughness: 0.2
            });

            // Horizontal strips 200 units wide to match 185x185 floor (another 15% larger)
            const stripGeometry = new this.THREE.BoxGeometry(200, 0.2, 2);
            
            // Front strip at z=-100 (15% larger than previous ±87)
            const frontStrip = new this.THREE.Mesh(stripGeometry, stripMaterial);
            frontStrip.position.set(0, 0.1, -100);
            frontStrip.userData.templateObject = true;
            frontStrip.userData.ledStrip = true;
            this.scene.add(frontStrip);
            this.objects.push(frontStrip);
            this.accentLights.push(frontStrip);

            // Back strip at z=100
            const backStrip = new this.THREE.Mesh(stripGeometry, stripMaterial.clone());
            backStrip.position.set(0, 0.1, 100);
            backStrip.userData.templateObject = true;
            backStrip.userData.ledStrip = true;
            this.scene.add(backStrip);
            this.objects.push(backStrip);
            this.accentLights.push(backStrip);

            // Side strips (perpendicular, 200 units to match horizontal strips)
            const sideStripGeometry = new this.THREE.BoxGeometry(2, 0.2, 200);
            
            const leftStrip = new this.THREE.Mesh(sideStripGeometry, stripMaterial.clone());
            leftStrip.position.set(-100, 0.1, 0);
            leftStrip.userData.templateObject = true;
            leftStrip.userData.ledStrip = true;
            this.scene.add(leftStrip);
            this.objects.push(leftStrip);
            this.accentLights.push(leftStrip);

            const rightStrip = new this.THREE.Mesh(sideStripGeometry, stripMaterial.clone());
            rightStrip.position.set(100, 0.1, 0);
            rightStrip.userData.templateObject = true;
            rightStrip.userData.ledStrip = true;
            this.scene.add(rightStrip);
            this.objects.push(rightStrip);
            this.accentLights.push(rightStrip);

            // Add point lights to enhance LED effect at ±100 border positions
            const lightPositions = [
                { x: 0, z: -100 },
                { x: 0, z: 100 },
                { x: -100, z: 0 },
                { x: 100, z: 0 }
            ];

            lightPositions.forEach(pos => {
                const light = new this.THREE.PointLight(0x00CCFF, 0.3, 30);
                light.position.set(pos.x, 2, pos.z);
                light.userData.templateLight = true;
                this.scene.add(light);
                this.objects.push(light);
            });
        }

        animate(time) {
            // Slow, dramatic pulsing for brilliant neon effect
            if (this.accentLights.length > 0) {
                const slowPulse = Math.sin(time * 0.0008) * 0.5 + 0.5; // Slower, 0 to 1
                this.accentLights.forEach(element => {
                    if (element.material && element.material.emissiveIntensity !== undefined) {
                        // More dramatic range for neon brilliance
                        element.material.emissiveIntensity = 0.8 + slowPulse * 1.4; // Range: 0.8 to 2.2
                    }
                });
            }
            
            // Shimmering sky gradient animation (blue → purple → pink)
            // Floor uses vertexColors so scene.background won't affect it
            if (this.skyBaseColor && this.skyAccentColor && this.scene) {
                const skyShimmer = Math.sin(time * 0.0005) * 0.5 + 0.5; // Very slow shimmer, 0 to 1
                const currentSky = this.skyBaseColor.clone().lerp(this.skyAccentColor, skyShimmer);
                this.scene.background = currentSky;
            }
        }

        cleanup() {
            this.accentLights = [];
            
            if (this.scene) {
                this.scene.fog = null;
            }
            
            super.cleanup();
        }

        getType() {
            return 'future-car-gallery';
        }

        getDisplayName() {
            return 'Future Car Gallery';
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
                    x: { min: -60, max: 60 },
                    y: { min: 0, max: 50 },
                    z: { min: -70, max: 70 }
                }
            };
        }

        applyPositionConstraints(object, newPosition, allObjects = []) {
            // Use shared gravity + furniture marker detection from BaseWorldTemplate
            return this.applyGravityWithFurnitureSupport(object, newPosition, allObjects, this.groundLevelY);
        }

        // Suggest default furniture layout for car gallery theme
        static getDefaultFurnitureLayout() {
            return [
                {
                    type: 'gallery_wall',
                    style: 'metal',
                    position: { x: -25, y: 0, z: -5 },
                    rotation: Math.PI / 2,
                    name: 'Left Dashboard Panel'
                },
                {
                    type: 'gallery_wall',
                    style: 'metal',
                    position: { x: 25, y: 0, z: -5 },
                    rotation: -Math.PI / 2,
                    name: 'Right Dashboard Panel'
                },
                {
                    type: 'riser',
                    style: 'silver',
                    position: { x: 0, y: 0, z: 10 },
                    rotation: 0,
                    name: 'Center Console Display'
                },
                {
                    type: 'bookshelf',
                    style: 'metal',
                    position: { x: -20, y: 0, z: -20 },
                    rotation: 0,
                    name: 'Left Media Shelf'
                },
                {
                    type: 'bookshelf',
                    style: 'metal',
                    position: { x: 20, y: 0, z: -20 },
                    rotation: 0,
                    name: 'Right Media Shelf'
                }
            ];
        }
    }
    
    // Export to global scope
    window.FutureCarGalleryWorldTemplate = FutureCarGalleryWorldTemplate;
    
    console.log("FutureCarGalleryWorld module loaded");
})();
