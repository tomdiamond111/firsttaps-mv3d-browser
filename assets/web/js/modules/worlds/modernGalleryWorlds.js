// modules/worlds/modernGalleryWorlds.js
// Modern Gallery World Templates - Three aesthetic variants
// Now using Car Gallery layout structure with themed variations
// Dependencies: THREE (global), BaseWorldTemplate

(function() {
    'use strict';
    
    console.log("Loading ModernGalleryWorlds module...");
    
    /**
     * BASE MODERN GALLERY TEMPLATE
     * Shared Car Gallery layout structure for all modern gallery variants
     * Each variant customizes colors and materials while keeping the same layout
     */
    class BaseModernGalleryTemplate extends window.BaseWorldTemplate {
        constructor(THREE, config = {}) {
            super(THREE, config);
            this.accentLights = [];
        }

        // Shared layout methods - override colors in subclasses
        createDisplayWall(colors) {
            // Dashboard-style wall with 5 cut-out nooks
            const wallWidth = 40;
            const wallHeight = 18;
            const wallThickness = 4;
            const wallZ = -28;
            
            // Main dashboard panel material (theme colors)
            const panelMaterial = new this.THREE.MeshStandardMaterial({
                color: colors.panelColor,
                metalness: colors.panelMetalness,
                roughness: colors.panelRoughness,
                emissive: colors.panelEmissive,
                emissiveIntensity: colors.panelEmissiveIntensity
            });
            
            // Create panel in sections to leave holes for nooks
            const nookWidth = 6;
            const nookHeight = 6;
            const spacing = 7.5;
            
            // Left section
            const leftWidth = wallWidth/2 - 15 - nookWidth/2;
            const leftPanel = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(leftWidth, wallHeight, wallThickness),
                panelMaterial
            );
            leftPanel.position.set(-wallWidth/2 + leftWidth/2, wallHeight/2, wallZ);
            leftPanel.userData.templateObject = true;
            this.scene.add(leftPanel);
            this.objects.push(leftPanel);
            
            // Right section
            const rightWidth = wallWidth/2 - 15 - nookWidth/2;
            const rightPanel = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(rightWidth, wallHeight, wallThickness),
                panelMaterial
            );
            rightPanel.position.set(wallWidth/2 - rightWidth/2, wallHeight/2, wallZ);
            rightPanel.userData.templateObject = true;
            this.scene.add(rightPanel);
            this.objects.push(rightPanel);
            
            // Top section
            const topHeight = wallHeight - (wallHeight/2 + nookHeight/2);
            const topPanel = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(wallWidth - leftWidth - rightWidth, topHeight, wallThickness),
                panelMaterial
            );
            topPanel.position.set(0, wallHeight - topHeight/2, wallZ);
            topPanel.userData.templateObject = true;
            this.scene.add(topPanel);
            this.objects.push(topPanel);
            
            // Bottom section
            const bottomHeight = wallHeight/2 - nookHeight/2;
            const bottomPanel = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(wallWidth - leftWidth - rightWidth, bottomHeight, wallThickness),
                panelMaterial
            );
            bottomPanel.position.set(0, bottomHeight/2, wallZ);
            bottomPanel.userData.templateObject = true;
            this.scene.add(bottomPanel);
            this.objects.push(bottomPanel);
            
            // Vertical strips between nooks
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
            
            // Top edge neon strips (theme colors)
            const topEdgeMaterial = new this.THREE.MeshStandardMaterial({
                color: colors.accentColor,
                emissive: colors.accentEmissive,
                emissiveIntensity: colors.accentIntensity,
                metalness: 1.0,
                roughness: 0.0
            });
            
            const frontEdgeStrip = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(wallWidth, 0.5, 0.5),
                topEdgeMaterial
            );
            frontEdgeStrip.position.set(0, wallHeight, wallZ + wallThickness/2);
            frontEdgeStrip.userData.templateObject = true;
            this.scene.add(frontEdgeStrip);
            this.objects.push(frontEdgeStrip);
            this.accentLights.push(frontEdgeStrip);
            
            const leftEdgeStrip = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(0.5, 0.5, wallThickness),
                topEdgeMaterial.clone()
            );
            leftEdgeStrip.position.set(-wallWidth/2, wallHeight, wallZ);
            leftEdgeStrip.userData.templateObject = true;
            this.scene.add(leftEdgeStrip);
            this.objects.push(leftEdgeStrip);
            this.accentLights.push(leftEdgeStrip);
            
            const rightEdgeStrip = new this.THREE.Mesh(
                new this.THREE.BoxGeometry(0.5, 0.5, wallThickness),
                topEdgeMaterial.clone()
            );
            rightEdgeStrip.position.set(wallWidth/2, wallHeight, wallZ);
            rightEdgeStrip.userData.templateObject = true;
            this.scene.add(rightEdgeStrip);
            this.objects.push(rightEdgeStrip);
            this.accentLights.push(rightEdgeStrip);
            
            // Create 5 cut-out nooks
            const nookDepth = 3;
            const nookY = wallHeight / 2;
            
            for (let i = 0; i < 5; i++) {
                const nookX = (i - 2) * spacing;
                
                const nookFrontZ = wallZ + wallThickness / 2;
                const nookBackZ = wallZ - wallThickness / 2 - nookDepth + 0.5;
                const nookMidZ = (nookFrontZ + nookBackZ) / 2;
                
                // Interior walls (theme colors)
                const recessMaterial = new this.THREE.MeshStandardMaterial({
                    color: colors.recessColor,
                    metalness: 0.7,
                    roughness: 0.3
                });
                
                // Back wall (glowing, theme colors)
                const backWallMaterial = new this.THREE.MeshStandardMaterial({
                    color: colors.accentColor,
                    metalness: 1.0,
                    roughness: 0.0,
                    emissive: colors.accentEmissive,
                    emissiveIntensity: 2.0
                });
                
                const backWall = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(nookWidth, nookHeight, 0.5),
                    backWallMaterial
                );
                backWall.position.set(nookX, nookY, nookBackZ);
                backWall.userData.templateObject = true;
                this.scene.add(backWall);
                this.objects.push(backWall);
                this.accentLights.push(backWall);
                
                // Side walls
                const sideWallGeometry = new this.THREE.BoxGeometry(0.5, nookHeight, nookDepth);
                
                const leftWall = new this.THREE.Mesh(sideWallGeometry, recessMaterial);
                leftWall.position.set(nookX - nookWidth/2, nookY, nookMidZ);
                leftWall.userData.templateObject = true;
                this.scene.add(leftWall);
                this.objects.push(leftWall);
                
                const rightWall = new this.THREE.Mesh(sideWallGeometry, recessMaterial.clone());
                rightWall.position.set(nookX + nookWidth/2, nookY, nookMidZ);
                rightWall.userData.templateObject = true;
                this.scene.add(rightWall);
                this.objects.push(rightWall);
                
                // Top/bottom walls
                const topBottomWallGeometry = new this.THREE.BoxGeometry(nookWidth, 0.5, nookDepth);
                
                const topWall = new this.THREE.Mesh(topBottomWallGeometry, recessMaterial.clone());
                topWall.position.set(nookX, nookY + nookHeight/2, nookMidZ);
                topWall.userData.templateObject = true;
                this.scene.add(topWall);
                this.objects.push(topWall);
                
                const bottomWall = new this.THREE.Mesh(topBottomWallGeometry, recessMaterial.clone());
                bottomWall.position.set(nookX, nookY - nookHeight/2, nookMidZ);
                bottomWall.userData.templateObject = true;
                this.scene.add(bottomWall);
                this.objects.push(bottomWall);
                
                // Glowing shelf
                const shelfY = nookY - nookHeight / 2 + 0.5;
                const shelfGeometry = new this.THREE.BoxGeometry(nookWidth - 0.5, 0.3, nookDepth - 0.5);
                const shelfMaterial = new this.THREE.MeshStandardMaterial({
                    color: colors.accentColor,
                    emissive: colors.accentEmissive,
                    emissiveIntensity: 0.8,
                    metalness: 0.8,
                    roughness: 0.2
                });
                const shelf = new this.THREE.Mesh(shelfGeometry, shelfMaterial);
                shelf.position.set(nookX, shelfY, nookMidZ);
                shelf.userData.templateObject = true;
                this.scene.add(shelf);
                this.objects.push(shelf);
                this.accentLights.push(shelf);
                
                // Interior lighting
                const backLight = new this.THREE.PointLight(colors.accentEmissive, 1.8, 15);
                backLight.position.set(nookX, nookY, nookBackZ - 0.3);
                backLight.userData.templateLight = true;
                this.scene.add(backLight);
                this.objects.push(backLight);
                
                const interiorLight1 = new this.THREE.PointLight(colors.accentEmissive, 1.2, 8);
                interiorLight1.position.set(nookX - nookWidth/3, nookY + nookHeight/3, nookMidZ);
                this.scene.add(interiorLight1);
                this.objects.push(interiorLight1);
                
                const interiorLight2 = new this.THREE.PointLight(colors.accentEmissive, 1.2, 8);
                interiorLight2.position.set(nookX + nookWidth/3, nookY - nookHeight/3, nookMidZ);
                this.scene.add(interiorLight2);
                this.objects.push(interiorLight2);
                
                // Furniture marker (OPTIMIZED: reduced sphere segments from 8x8 to 6x6)
                const markerGeometry = new this.THREE.SphereGeometry(0.3, 6, 6);
                const markerMaterial = new this.THREE.MeshBasicMaterial({
                    color: colors.accentColor,
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
                
                // Neon frame around opening
                const frameThickness = 0.3;
                const frameMaterial = new this.THREE.MeshStandardMaterial({
                    color: colors.accentColor,
                    emissive: colors.accentEmissive,
                    emissiveIntensity: 2.8,
                    metalness: 1.0,
                    roughness: 0.0
                });
                
                const topFrame = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(nookWidth + 0.6, frameThickness, frameThickness),
                    frameMaterial
                );
                topFrame.position.set(nookX, nookY + nookHeight/2, nookFrontZ);
                topFrame.userData.templateObject = true;
                this.scene.add(topFrame);
                this.objects.push(topFrame);
                this.accentLights.push(topFrame);
                
                const bottomFrame = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(nookWidth + 0.6, frameThickness, frameThickness),
                    frameMaterial.clone()
                );
                bottomFrame.position.set(nookX, nookY - nookHeight/2, nookFrontZ);
                bottomFrame.userData.templateObject = true;
                this.scene.add(bottomFrame);
                this.objects.push(bottomFrame);
                this.accentLights.push(bottomFrame);
                
                const leftFrame = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(frameThickness, nookHeight + 0.6, frameThickness),
                    frameMaterial.clone()
                );
                leftFrame.position.set(nookX - nookWidth/2, nookY, nookFrontZ);
                leftFrame.userData.templateObject = true;
                this.scene.add(leftFrame);
                this.objects.push(leftFrame);
                this.accentLights.push(leftFrame);
                
                const rightFrame = new this.THREE.Mesh(
                    new this.THREE.BoxGeometry(frameThickness, nookHeight + 0.6, frameThickness),
                    frameMaterial.clone()
                );
                rightFrame.position.set(nookX + nookWidth/2, nookY, nookFrontZ);
                rightFrame.userData.templateObject = true;
                this.scene.add(rightFrame);
                this.objects.push(rightFrame);
                this.accentLights.push(rightFrame);
            }
        }

        createColumns(colors) {
            // MOVED: Pushed further from origin to avoid demo furniture overlap
            const dialPositions = [
                { x: -50, z: -50, height: 8 },
                { x: 50, z: -50, height: 6 },
                { x: -50, z: 50, height: 5 },
                { x: 50, z: 50, height: 7 }
            ];
            
            dialPositions.forEach((pos, index) => {
                // OPTIMIZED: reduced cylinder segments from 32 to 16 for performance
                const dialGeometry = new this.THREE.CylinderGeometry(2.5, 2.5, pos.height, 16);
                const dialMaterial = new this.THREE.MeshStandardMaterial({
                    color: colors.columnColor,
                    metalness: colors.columnMetalness,
                    roughness: colors.columnRoughness
                });
                
                const dial = new this.THREE.Mesh(dialGeometry, dialMaterial);
                dial.position.set(pos.x, pos.height/2, pos.z);
                dial.userData.templateObject = true;
                dial.userData.canPlaceObjects = true;
                this.scene.add(dial);
                this.objects.push(dial);
                
                // Marker (OPTIMIZED: reduced sphere segments)
                const dialMarkerGeometry = new this.THREE.SphereGeometry(0.3, 6, 6);
                const dialMarkerMaterial = new this.THREE.MeshBasicMaterial({
                    color: colors.accentColor,
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
                
                // LED ring (OPTIMIZED: reduced segments from 16x32 to 8x16 for performance)
                const ringGeometry = new this.THREE.TorusGeometry(2.7, 0.15, 8, 16);
                const ringMaterial = new this.THREE.MeshStandardMaterial({
                    color: colors.accentColor,
                    emissive: colors.accentEmissive,
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
                
                // Point light
                const dialLight = new this.THREE.PointLight(colors.accentEmissive, 0.3, 15);
                dialLight.position.set(pos.x, pos.height + 1, pos.z);
                dialLight.userData.templateLight = true;
                this.scene.add(dialLight);
                this.objects.push(dialLight);
            });
        }

        createPlatforms(colors) {
            // MOVED: Pushed further from origin to avoid demo furniture overlap
            const platforms = [
                { x: -60, z: -40, width: 10, height: 2, depth: 5 },
                { x: 60, z: -40, width: 10, height: 2.5, depth: 5 }
            ];
            
            platforms.forEach((platform, index) => {
                const platformGeometry = new this.THREE.BoxGeometry(
                    platform.width,
                    platform.height,
                    platform.depth
                );
                const platformMaterial = new this.THREE.MeshStandardMaterial({
                    color: colors.platformColor,
                    metalness: colors.platformMetalness,
                    roughness: colors.platformRoughness
                });
                
                const platformMesh = new this.THREE.Mesh(platformGeometry, platformMaterial);
                platformMesh.position.set(platform.x, platform.height/2, platform.z);
                platformMesh.userData.templateObject = true;
                platformMesh.userData.canPlaceObjects = true;
                this.scene.add(platformMesh);
                this.objects.push(platformMesh);
                
                // Marker (OPTIMIZED: reduced sphere segments)
                const platformMarkerGeometry = new this.THREE.SphereGeometry(0.3, 6, 6);
                const platformMarkerMaterial = new this.THREE.MeshBasicMaterial({
                    color: colors.accentColor,
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
                
                // LED edge strips
                const edgeMaterial = new this.THREE.MeshStandardMaterial({
                    color: colors.accentColor,
                    emissive: colors.accentEmissive,
                    emissiveIntensity: 0.8,
                    metalness: 0.8,
                    roughness: 0.2
                });
                
                const stripGeometryFB = new this.THREE.BoxGeometry(platform.width, 0.3, 0.3);
                const frontStrip = new this.THREE.Mesh(stripGeometryFB, edgeMaterial);
                frontStrip.position.set(platform.x, platform.height + 0.15, platform.z - platform.depth/2);
                frontStrip.userData.templateObject = true;
                this.scene.add(frontStrip);
                this.objects.push(frontStrip);
                this.accentLights.push(frontStrip);
                
                const backStrip = new this.THREE.Mesh(stripGeometryFB, edgeMaterial.clone());
                backStrip.position.set(platform.x, platform.height + 0.15, platform.z + platform.depth/2);
                backStrip.userData.templateObject = true;
                this.scene.add(backStrip);
                this.objects.push(backStrip);
                this.accentLights.push(backStrip);
                
                const stripGeometryLR = new this.THREE.BoxGeometry(0.3, 0.3, platform.depth);
                const leftStrip = new this.THREE.Mesh(stripGeometryLR, edgeMaterial.clone());
                leftStrip.position.set(platform.x - platform.width/2, platform.height + 0.15, platform.z);
                leftStrip.userData.templateObject = true;
                this.scene.add(leftStrip);
                this.objects.push(leftStrip);
                this.accentLights.push(leftStrip);
                
                const rightStrip = new this.THREE.Mesh(stripGeometryLR, edgeMaterial.clone());
                rightStrip.position.set(platform.x + platform.width/2, platform.height + 0.15, platform.z);
                rightStrip.userData.templateObject = true;
                this.scene.add(rightStrip);
                this.objects.push(rightStrip);
                this.accentLights.push(rightStrip);
                
                // Vertical corner strips
                const cornerGeometry = new this.THREE.BoxGeometry(0.3, platform.height, 0.3);
                const corners = [
                    { x: -platform.width/2, z: -platform.depth/2 },
                    { x: platform.width/2, z: -platform.depth/2 },
                    { x: -platform.width/2, z: platform.depth/2 },
                    { x: platform.width/2, z: platform.depth/2 }
                ];
                
                corners.forEach(corner => {
                    const cornerStrip = new this.THREE.Mesh(cornerGeometry, edgeMaterial.clone());
                    cornerStrip.position.set(platform.x + corner.x, platform.height/2, platform.z + corner.z);
                    cornerStrip.userData.templateObject = true;
                    this.scene.add(cornerStrip);
                    this.objects.push(cornerStrip);
                    this.accentLights.push(cornerStrip);
                });
            });
        }

        createPillars(colors) {
            // MOVED: Pushed further back to reduce clutter near furniture
            const pillars = [
                { x: -30, z: 60, nookHeights: [3, 7] },
                { x: 30, z: 60, nookHeights: [3, 7] }
            ];
            
            pillars.forEach((pillar, pillarIndex) => {
                const pillarGeometry = new this.THREE.BoxGeometry(4, 10, 4);
                const pillarMaterial = new this.THREE.MeshStandardMaterial({
                    color: colors.pillarColor,
                    metalness: colors.pillarMetalness,
                    roughness: colors.pillarRoughness
                });
                
                const pillarMesh = new this.THREE.Mesh(pillarGeometry, pillarMaterial);
                pillarMesh.position.set(pillar.x, 5, pillar.z);
                pillarMesh.userData.templateObject = true;
                this.scene.add(pillarMesh);
                this.objects.push(pillarMesh);
                
                pillar.nookHeights.forEach((nookY, nookIndex) => {
                    const nookGeometry = new this.THREE.BoxGeometry(3, 2.5, 2);
                    const nookMaterial = new this.THREE.MeshStandardMaterial({
                        color: colors.pillarNookColor,
                        metalness: 0.7,
                        roughness: 0.3,
                        emissive: colors.accentEmissive,
                        emissiveIntensity: 0.6
                    });
                    
                    const nook = new this.THREE.Mesh(nookGeometry, nookMaterial);
                    nook.position.set(pillar.x, nookY, pillar.z);
                    nook.userData.templateObject = true;
                    nook.userData.canPlaceObjects = true;
                    this.scene.add(nook);
                    this.objects.push(nook);
                    
                    const nookLight = new this.THREE.PointLight(colors.accentEmissive, 0.4, 6);
                    nookLight.position.set(pillar.x, nookY, pillar.z);
                    nookLight.userData.templateLight = true;
                    this.scene.add(nookLight);
                    this.objects.push(nookLight);
                    
                    // Marker (OPTIMIZED: reduced sphere segments)
                    const pillarNookMarkerGeometry = new this.THREE.SphereGeometry(0.3, 6, 6);
                    const pillarNookMarkerMaterial = new this.THREE.MeshBasicMaterial({
                        color: colors.accentColor,
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

        createLEDStrips(colors) {
            const stripMaterial = new this.THREE.MeshStandardMaterial({
                color: colors.accentColor,
                emissive: colors.accentEmissive,
                emissiveIntensity: 0.5,
                metalness: 0.8,
                roughness: 0.2
            });

            const stripGeometry = new this.THREE.BoxGeometry(200, 0.2, 2);
            
            const frontStrip = new this.THREE.Mesh(stripGeometry, stripMaterial);
            frontStrip.position.set(0, 0.1, -100);
            frontStrip.userData.templateObject = true;
            frontStrip.userData.ledStrip = true;
            this.scene.add(frontStrip);
            this.objects.push(frontStrip);
            this.accentLights.push(frontStrip);

            const backStrip = new this.THREE.Mesh(stripGeometry, stripMaterial.clone());
            backStrip.position.set(0, 0.1, 100);
            backStrip.userData.templateObject = true;
            backStrip.userData.ledStrip = true;
            this.scene.add(backStrip);
            this.objects.push(backStrip);
            this.accentLights.push(backStrip);

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

            const lightPositions = [
                { x: 0, z: -100 },
                { x: 0, z: 100 },
                { x: -100, z: 0 },
                { x: 100, z: 0 }
            ];

            lightPositions.forEach(pos => {
                const light = new this.THREE.PointLight(colors.accentEmissive, 0.3, 30);
                light.position.set(pos.x, 2, pos.z);
                light.userData.templateLight = true;
                this.scene.add(light);
                this.objects.push(light);
            });
        }

        animate(time) {
            // Neon pulsing (all galleries)
            if (this.accentLights.length > 0) {
                const slowPulse = Math.sin(time * 0.0008) * 0.5 + 0.5;
                this.accentLights.forEach(element => {
                    if (element.material && element.material.emissiveIntensity !== undefined) {
                        element.material.emissiveIntensity = 0.8 + slowPulse * 1.4;
                    }
                });
            }
            
            // Sky shimmer (all galleries)
            if (this.skyBaseColor && this.skyAccentColor && this.scene) {
                const skyShimmer = Math.sin(time * 0.0005) * 0.5 + 0.5;
                const currentSky = this.skyBaseColor.clone().lerp(this.skyAccentColor, skyShimmer);
                this.scene.background = currentSky;
            }
            
            // DARK GALLERY: Animate ember particles rising
            if (this.emberParticles) {
                const positions = this.emberParticles.geometry.attributes.position.array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] += 0.03;
                    if (positions[i + 1] > 35) {
                        positions[i + 1] = 0;
                        positions[i] = (Math.random() - 0.5) * 180;
                        positions[i + 2] = (Math.random() - 0.5) * 180;
                    }
                }
                this.emberParticles.geometry.attributes.position.needsUpdate = true;
            }
            
            // DARK GALLERY: Flicker spotlight cones
            if (this.objects) {
                const spotlights = this.objects.filter(obj => obj.userData.spotlightIndex !== undefined);
                spotlights.forEach(cone => {
                    const flicker = Math.sin(time * 0.002 + cone.userData.spotlightIndex) * 0.02 + 0.06;
                    cone.material.opacity = flicker;
                });
            }
            
            // WARM GALLERY: Animate falling petals
            if (this.fallingPetals) {
                const positions = this.fallingPetals.geometry.attributes.position.array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] -= 0.02;
                    positions[i] += Math.sin(time * 0.001 + i) * 0.01;
                    if (positions[i + 1] < 0) {
                        positions[i + 1] = 50;
                        positions[i] = (Math.random() - 0.5) * 160;
                        positions[i + 2] = (Math.random() - 0.5) * 160;
                    }
                }
                this.fallingPetals.geometry.attributes.position.needsUpdate = true;
            }
        }

        cleanup() {
            this.accentLights = [];
            if (this.scene) {
                this.scene.fog = null;
            }
            super.cleanup();
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
                requiresSupport: true,
                allowedStackingDirections: ['top'],
                worldBoundaries: {
                    x: { min: -60, max: 60 },
                    y: { min: 0, max: 50 },
                    z: { min: -70, max: 70 }
                }
            };
        }

        applyPositionConstraints(object, newPosition, allObjects = []) {
            return this.applyGravityWithFurnitureSupport(object, newPosition, allObjects, this.groundLevelY);
        }
    }

    /**
     * CLEAN MODERN GALLERY - Neutral, minimal, soft purples
     */
    class ModernGalleryCleanTemplate extends BaseModernGalleryTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                ambientLightColor: 0x706888,
                ambientLightIntensity: 0.3,
                directionalLightColor: 0xA090C0,
                directionalLightIntensity: 0.5,
                ...config
            });
        }

        setupEnvironment() {
            console.log('=== SETTING UP CLEAN MODERN GALLERY ===');
            
            this.groundLevelY = 0;
            
            // Background plane - Match floor gray
            const bgPlaneGeometry = new this.THREE.PlaneGeometry(500, 500);
            const bgPlaneMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x909098,
                metalness: 0.1,
                roughness: 0.9
            });
            const bgPlane = new this.THREE.Mesh(bgPlaneGeometry, bgPlaneMaterial);
            bgPlane.rotation.x = -Math.PI / 2;
            bgPlane.position.y = -0.02;
            bgPlane.receiveShadow = true;
            bgPlane.userData.templateObject = true;
            this.scene.add(bgPlane);
            this.objects.push(bgPlane);

            // Floor 185x185 with gradient - Medium gray concrete
            const floorGeometry = new this.THREE.PlaneGeometry(185, 185, 92, 92);
            
            const colors = new Float32Array(floorGeometry.attributes.position.count * 3);
            const baseColor = new this.THREE.Color(0xA0A0B0);
            const accentColor = new this.THREE.Color(0x9090A8);
            
            for (let i = 0; i < floorGeometry.attributes.position.count; i++) {
                const x = floorGeometry.attributes.position.getX(i);
                const z = floorGeometry.attributes.position.getZ(i);
                
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
                metalness: 0.1,
                roughness: 0.8
            });
            
            const floor = new this.THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -0.01;
            floor.receiveShadow = true;
            floor.userData.templateObject = true;
            this.scene.add(floor);
            this.objects.push(floor);

            const grid = new this.THREE.GridHelper(185, 37, 0xAA88FF, 0xD0D0E0);
            grid.material.transparent = true;
            grid.material.opacity = 0.15;
            grid.userData.templateObject = true;
            this.scene.add(grid);
            this.objects.push(grid);

            // Clean theme colors (modern gallery with gray and purple)
            const cleanColors = {
                panelColor: 0xC8C8D8,
                panelMetalness: 0.2,
                panelRoughness: 0.6,
                panelEmissive: 0xB0A8C0,
                panelEmissiveIntensity: 0.15,
                accentColor: 0x9977EE,
                accentEmissive: 0x9977EE,
                accentIntensity: 2.0,
                recessColor: 0xA898B8,
                columnColor: 0xB0B0C0,
                columnMetalness: 0.3,
                columnRoughness: 0.6,
                platformColor: 0xC0C0D0,
                platformMetalness: 0.2,
                platformRoughness: 0.6,
                pillarColor: 0xB0B0C0,
                pillarMetalness: 0.2,
                pillarRoughness: 0.7,
                pillarNookColor: 0x9890A8
            };

            // REMOVED: Nook wall was overlapping with demo furniture
            // this.createDisplayWall(cleanColors);
            this.createColumns(cleanColors);
            this.createPlatforms(cleanColors);
            this.createPillars(cleanColors);
            this.createLEDStrips(cleanColors);

            this.skyBaseColor = new this.THREE.Color(0xB8B0C8);
            this.skyAccentColor = new this.THREE.Color(0xC8C0D8);
            this.scene.background = this.skyBaseColor.clone();
            this.scene.fog = new this.THREE.Fog(0xC0B8D0, 100, 300);
            
            console.log('Clean modern gallery setup complete');
        }

        getType() {
            return 'modern-gallery-clean';
        }

        getDisplayName() {
            return 'Modern Gallery (Clean)';
        }

        static getDefaultFurnitureLayout() {
            return [];
        }
    }

    /**
     * DARK MODERN GALLERY - Masculine, architectural, warm tungsten
     */
    class ModernGalleryDarkTemplate extends BaseModernGalleryTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                ambientLightColor: 0x303035,
                ambientLightIntensity: 0.4,
                directionalLightColor: 0xFFAA66,
                directionalLightIntensity: 0.8,
                ...config
            });
        }

        setupEnvironment() {
            console.log('=== SETTING UP DARK MODERN GALLERY ===');
            
            this.groundLevelY = 0;
            
            // Dark background plane
            const bgPlaneGeometry = new this.THREE.PlaneGeometry(500, 500);
            const bgPlaneMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x0A0A0F,
                metalness: 0.2,
                roughness: 0.9
            });
            const bgPlane = new this.THREE.Mesh(bgPlaneGeometry, bgPlaneMaterial);
            bgPlane.rotation.x = -Math.PI / 2;
            bgPlane.position.y = -0.02;
            bgPlane.receiveShadow = true;
            bgPlane.userData.templateObject = true;
            this.scene.add(bgPlane);
            this.objects.push(bgPlane);

            // Floor 185x185 (OPTIMIZED: reduced from 92x92 to 20x20 subdivisions)
            const floorGeometry = new this.THREE.PlaneGeometry(185, 185, 20, 20);
            
            const colors = new Float32Array(floorGeometry.attributes.position.count * 3);
            const baseColor = new this.THREE.Color(0x2A2A2F);
            const accentColor = new this.THREE.Color(0x3A3040);
            
            for (let i = 0; i < floorGeometry.attributes.position.count; i++) {
                const x = floorGeometry.attributes.position.getX(i);
                const z = floorGeometry.attributes.position.getZ(i);
                
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
                metalness: 0.6,
                roughness: 0.3
            });
            
            const floor = new this.THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -0.01;
            floor.receiveShadow = true;
            floor.userData.templateObject = true;
            this.scene.add(floor);
            this.objects.push(floor);

            // OPTIMIZED: reduced grid divisions from 37 to 15 for better performance
            const grid = new this.THREE.GridHelper(185, 15, 0xFFAA66, 0x3A3A40);
            grid.material.transparent = true;
            grid.material.opacity = 0.15;
            grid.userData.templateObject = true;
            this.scene.add(grid);
            this.objects.push(grid);

            // Dark theme colors (warm orange)
            const darkColors = {
                panelColor: 0x2A2A30,
                panelMetalness: 0.8,
                panelRoughness: 0.2,
                panelEmissive: 0x0A0A10,
                panelEmissiveIntensity: 0.3,
                accentColor: 0xFFAA66,
                accentEmissive: 0xFFAA66,
                accentIntensity: 1.5,
                recessColor: 0x1A1A20,
                columnColor: 0x2A2A35,
                columnMetalness: 0.9,
                columnRoughness: 0.3,
                platformColor: 0x2A2A30,
                platformMetalness: 0.8,
                platformRoughness: 0.2,
                pillarColor: 0x252530,
                pillarMetalness: 0.7,
                pillarRoughness: 0.4,
                pillarNookColor: 0x1A1A25
            };

            // REMOVED: Nook wall was overlapping with demo furniture
            // this.createDisplayWall(darkColors);
            this.createColumns(darkColors);
            this.createPlatforms(darkColors);
            this.createPillars(darkColors);
            this.createLEDStrips(darkColors);

            this.skyBaseColor = new this.THREE.Color(0x3A2A40);
            this.skyAccentColor = new this.THREE.Color(0x4A3A50);
            this.scene.background = this.skyBaseColor.clone();
            this.scene.fog = new this.THREE.Fog(0x2A2A35, 100, 300);
            
            // DARK GALLERY SIGNATURE EFFECT: Volumetric spotlights
            this.createSpotlightCones();
            
            // Rising ember particles
            this.createEmberParticles();
            
            console.log('Dark modern gallery setup complete');
        }

        createSpotlightCones() {
            // Create 8 dramatic spotlight cones from ceiling
            const spotlightPositions = [
                { x: -50, z: -50 },
                { x: 0, z: -50 },
                { x: 50, z: -50 },
                { x: -50, z: 0 },
                { x: 50, z: 0 },
                { x: -50, z: 50 },
                { x: 0, z: 50 },
                { x: 50, z: 50 }
            ];
            
            spotlightPositions.forEach((pos, index) => {
                // OPTIMIZED: reduced segments from 16 to 8 for better performance
                const coneGeometry = new this.THREE.CylinderGeometry(0.5, 8, 40, 8, 1, true);
                const coneMaterial = new this.THREE.MeshBasicMaterial({
                    color: 0xFFAA66,
                    transparent: true,
                    opacity: 0.08,
                    side: this.THREE.DoubleSide,
                    blending: this.THREE.AdditiveBlending
                });
                
                const cone = new this.THREE.Mesh(coneGeometry, coneMaterial);
                cone.position.set(pos.x, 30, pos.z);
                cone.userData.templateObject = true;
                cone.userData.spotlightIndex = index;
                this.scene.add(cone);
                this.objects.push(cone);
            });
        }

        createEmberParticles() {
            // Create rising ember particles (OPTIMIZED: reduced from 100 to 40 for performance)
            const particleCount = 40;
            const geometry = new this.THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            const sizes = new Float32Array(particleCount);
            
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 180;
                positions[i * 3 + 1] = Math.random() * 35;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 180;
                
                // Orange to yellow gradient (brighter)
                const t = Math.random();
                const color = new this.THREE.Color().setHSL(0.08 + t * 0.08, 1, 0.6);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
                
                sizes[i] = Math.random() * 0.6 + 0.3;
            }
            
            geometry.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new this.THREE.BufferAttribute(sizes, 1));
            
            const material = new this.THREE.PointsMaterial({
                size: 0.6,
                vertexColors: true,
                transparent: true,
                opacity: 0.85,
                blending: this.THREE.AdditiveBlending,
                sizeAttenuation: true
            });
            
            this.emberParticles = new this.THREE.Points(geometry, material);
            this.emberParticles.userData.templateObject = true;
            this.scene.add(this.emberParticles);
            this.objects.push(this.emberParticles);
        }

        getType() {
            return 'modern-gallery-dark';
        }

        getDisplayName() {
            return 'Modern Gallery (Dark)';
        }

        static getDefaultFurnitureLayout() {
            return [];
        }
    }

    /**
     * WARM MODERN GALLERY - Feminine, elegant, blush/cream
     */
    class ModernGalleryWarmTemplate extends BaseModernGalleryTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                ambientLightColor: 0xC09078,
                ambientLightIntensity: 0.3,
                directionalLightColor: 0xD8B098,
                directionalLightIntensity: 0.4,
                ...config
            });
        }

        setupEnvironment() {
            console.log('=== SETTING UP WARM MODERN GALLERY ===');
            
            this.groundLevelY = 0;
            
            // Background plane - Darker terracotta
            const bgPlaneGeometry = new this.THREE.PlaneGeometry(500, 500);
            const bgPlaneMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xA88870,
                metalness: 0.1,
                roughness: 0.9
            });
            const bgPlane = new this.THREE.Mesh(bgPlaneGeometry, bgPlaneMaterial);
            bgPlane.rotation.x = -Math.PI / 2;
            bgPlane.position.y = -0.02;
            bgPlane.receiveShadow = true;
            bgPlane.userData.templateObject = true;
            this.scene.add(bgPlane);
            this.objects.push(bgPlane);

            // Floor 185x185 - Warm terracotta/wood tones
            const floorGeometry = new this.THREE.PlaneGeometry(185, 185, 92, 92);
            
            const colors = new Float32Array(floorGeometry.attributes.position.count * 3);
            const baseColor = new this.THREE.Color(0xB89880);
            const accentColor = new this.THREE.Color(0xC8A890);
            
            for (let i = 0; i < floorGeometry.attributes.position.count; i++) {
                const x = floorGeometry.attributes.position.getX(i);
                const z = floorGeometry.attributes.position.getZ(i);
                
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
                metalness: 0.1,
                roughness: 0.6
            });
            
            const floor = new this.THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -0.01;
            floor.receiveShadow = true;
            floor.userData.templateObject = true;
            this.scene.add(floor);
            this.objects.push(floor);

            const grid = new this.THREE.GridHelper(185, 37, 0xFFD0C0, 0xE0C8B8);
            grid.material.transparent = true;
            grid.material.opacity = 0.15;
            grid.userData.templateObject = true;
            this.scene.add(grid);
            this.objects.push(grid);

            // Warm theme colors (terracotta and coral)
            const warmColors = {
                panelColor: 0xD8B8A0,
                panelMetalness: 0.3,
                panelRoughness: 0.5,
                panelEmissive: 0xC8A890,
                panelEmissiveIntensity: 0.2,
                accentColor: 0xEE9977,
                accentEmissive: 0xEE9977,
                accentIntensity: 2.0,
                recessColor: 0xB89880,
                columnColor: 0xC8B0A0,
                columnMetalness: 0.4,
                columnRoughness: 0.5,
                platformColor: 0xD8B8A0,
                platformMetalness: 0.3,
                platformRoughness: 0.5,
                pillarColor: 0xC0A890,
                pillarMetalness: 0.3,
                pillarRoughness: 0.6,
                pillarNookColor: 0xA89078
            };

            // REMOVED: Nook wall was overlapping with demo furniture
            // this.createDisplayWall(warmColors);
            this.createColumns(warmColors);
            this.createPlatforms(warmColors);
            this.createPillars(warmColors);
            this.createLEDStrips(warmColors);

            this.skyBaseColor = new this.THREE.Color(0xC8B0A0);
            this.skyAccentColor = new this.THREE.Color(0xD8C0B0);
            this.scene.background = this.skyBaseColor.clone();
            this.scene.fog = new this.THREE.Fog(0xD0B8A8, 100, 300);
            
            // WARM GALLERY SIGNATURE EFFECT: Falling petals
            this.createFallingPetals();
            
            // Floating ambient orbs
            this.createAmbientOrbs();
            
            console.log('Warm modern gallery setup complete');
        }

        createFallingPetals() {
            // Create gently falling petal particles
            const particleCount = 120;
            const geometry = new this.THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            const sizes = new Float32Array(particleCount);
            
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 160;
                positions[i * 3 + 1] = Math.random() * 45 + 5;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 160;
                
                // Soft pink to cream colors
                const t = Math.random();
                const color = t > 0.5 
                    ? new this.THREE.Color(0xFFD0C0)
                    : new this.THREE.Color(0xFFF0E8);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
                
                sizes[i] = Math.random() * 0.6 + 0.3;
            }
            
            geometry.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new this.THREE.BufferAttribute(sizes, 1));
            
            const material = new this.THREE.PointsMaterial({
                size: 0.5,
                vertexColors: true,
                transparent: true,
                opacity: 0.5,
                sizeAttenuation: true
            });
            
            this.fallingPetals = new this.THREE.Points(geometry, material);
            this.fallingPetals.userData.templateObject = true;
            this.scene.add(this.fallingPetals);
            this.objects.push(this.fallingPetals);
        }

        createAmbientOrbs() {
            // Create 6 floating glowing orbs
            const orbPositions = [
                { x: -60, y: 15, z: -40 },
                { x: 60, y: 18, z: -40 },
                { x: -50, y: 20, z: 30 },
                { x: 50, y: 16, z: 30 },
                { x: -30, y: 22, z: 0 },
                { x: 30, y: 19, z: 0 }
            ];
            
            orbPositions.forEach(pos => {
                const orbGeometry = new this.THREE.SphereGeometry(1.5, 16, 16);
                const orbMaterial = new this.THREE.MeshBasicMaterial({
                    color: 0xFFD0C0,
                    transparent: true,
                    opacity: 0.3,
                    blending: this.THREE.AdditiveBlending
                });
                
                const orb = new this.THREE.Mesh(orbGeometry, orbMaterial);
                orb.position.set(pos.x, pos.y, pos.z);
                orb.userData.templateObject = true;
                this.scene.add(orb);
                this.objects.push(orb);
                
                // Add glow ring
                const ringGeometry = new this.THREE.RingGeometry(2, 3, 32);
                const ringMaterial = new this.THREE.MeshBasicMaterial({
                    color: 0xFFE8E0,
                    transparent: true,
                    opacity: 0.15,
                    side: this.THREE.DoubleSide,
                    blending: this.THREE.AdditiveBlending
                });
                
                const ring = new this.THREE.Mesh(ringGeometry, ringMaterial);
                ring.position.copy(orb.position);
                ring.rotation.x = -Math.PI / 2;
                ring.userData.templateObject = true;
                this.scene.add(ring);
                this.objects.push(ring);
            });
        }

        getType() {
            return 'modern-gallery-warm';
        }

        getDisplayName() {
            return 'Modern Gallery (Warm)';
        }

        static getDefaultFurnitureLayout() {
            return [];
        }
    }
    
    // Export to global scope
    window.ModernGalleryCleanTemplate = ModernGalleryCleanTemplate;
    window.ModernGalleryDarkTemplate = ModernGalleryDarkTemplate;
    window.ModernGalleryWarmTemplate = ModernGalleryWarmTemplate;
    
    console.log("ModernGalleryWorlds module loaded - 3 variants available");
})();
