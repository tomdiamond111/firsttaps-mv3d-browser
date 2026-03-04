// modules/worlds/musicFestivalWorld.js
// Music Festival World Template - Evening outdoor concert metaphor
// Dependencies: THREE (global), BaseWorldTemplate, SharedEnvironmentSystem

(function() {
    'use strict';
    
    console.log("Loading MusicFestivalWorld module...");
    
    /**
     * MUSIC FESTIVAL WORLD TEMPLATE
     * Evening outdoor music festival with stages and ambient concert lighting
     * Based on green plane but with darker, more atmospheric evening setting
     */
    class MusicFestivalWorldTemplate extends window.BaseWorldTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                // Evening/dusk lighting - darker ambient with warm stage lights
                ambientLightColor: 0x202040, // Cool evening blue
                ambientLightIntensity: 0.3,
                directionalLightColor: 0xFFAA66, // Warm stage lighting
                directionalLightIntensity: 0.5,
                ...config
            });
            this.environmentSystem = null;
            this.environment = null;
            this.stageLights = [];
            this.videoScreens = [];
            this.videoPatternIndex = 0;
            this.lastPatternChange = 0;
        }

        setupEnvironment() {
            console.log('=== SETTING UP MUSIC FESTIVAL WORLD ===');
            
            this.groundLevelY = 0;
            
            // Initialize environment system
            this.environmentSystem = new window.SharedEnvironmentSystem(this.THREE, this.scene);
            
            // Create evening festival ground - darker grass
            const groundGeometry = new this.THREE.PlaneGeometry(1000, 1000, 100, 100);
            
            // Evening grass colors - darker greens with blue tint
            const colors = new Float32Array(groundGeometry.attributes.position.count * 3);
            const color1 = new this.THREE.Color(0x0F2F0F); // Very dark forest green
            const color2 = new this.THREE.Color(0x1A4A1A); // Dark forest green
            
            for (let i = 0; i < groundGeometry.attributes.position.count; i++) {
                const y = groundGeometry.attributes.position.getY(i);
                const t = (y + 500) / 1000;
                const color = color1.clone().lerp(color2, t);
                
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
            
            groundGeometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
            
            const groundMaterial = new this.THREE.MeshStandardMaterial({ 
                vertexColors: true,
                side: this.THREE.FrontSide,
                metalness: 0.1,
                roughness: 0.9
            });
            
            const ground = new this.THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.01;
            ground.receiveShadow = true;
            ground.userData.templateObject = true;
            this.scene.add(ground);
            this.objects.push(ground);

            // Subtle grid
            const grid = new this.THREE.GridHelper(120, 24, 0x334433, 0x445544);
            grid.material.transparent = true;
            grid.material.opacity = 0.1;
            grid.userData.templateObject = true;
            this.scene.add(grid);
            this.objects.push(grid);

            // Add colored stage lights (spotlights in different colors)
            this.createStageLights();

            // Build massive festival stage structure
            this.createFestivalStage();

            // Evening fog - heavier than daytime
            this.scene.fog = new this.THREE.Fog(0x1a1a2e, 100, 500);
            
            console.log('Music festival world setup complete - evening atmosphere');
        }

        createStageLights() {
            // Add several colored spotlights to simulate stage/festival lighting
            const lightConfigs = [
                { color: 0xFF0066, position: { x: -30, y: 20, z: -20 } }, // Pink stage light
                { color: 0x00FFFF, position: { x: 30, y: 20, z: -20 } },  // Cyan stage light
                { color: 0xFFAA00, position: { x: 0, y: 25, z: 30 } },    // Amber stage light
                { color: 0x9900FF, position: { x: -40, y: 15, z: 10 } },  // Purple stage light
                { color: 0x00FF66, position: { x: 40, y: 15, z: 10 } }    // Green stage light
            ];

            lightConfigs.forEach((config, index) => {
                const light = new this.THREE.PointLight(config.color, 0.4, 80);
                light.position.set(config.position.x, config.position.y, config.position.z);
                light.userData.templateLight = true;
                light.userData.festivalLight = true;
                light.userData.lightIndex = index;
                this.scene.add(light);
                this.objects.push(light);
                this.stageLights.push(light);
            });
        }

        createFestivalStage() {
            // MASSIVE FESTIVAL STAGE - replaces the nook wall furniture
            // Positioned similar to where gallery_wall would be (x: 50, z: 20)
            // But repositioned closer to home area for object interaction
            
            const stageX = 0;        // Center stage
            const stageZ = -35;      // In front of home area
            const stageBaseY = 0;    // Ground level
            
            // Main stage deck dimensions
            const deckWidth = 65;
            const deckDepth = 45;
            const deckHeight = 5;    // Elevated platform
            const deckThickness = 1;
            
            // === APPROACH STEPS (for climbing with 2.0 tolerance) ===
            const stepCount = 3;
            const stepHeight = deckHeight / stepCount;
            const stepDepth = 4;
            const stepWidth = 20;
            
            for (let i = 0; i < stepCount; i++) {
                const stepY = stageBaseY + (i + 1) * stepHeight;
                const stepZ = stageZ + deckDepth/2 + (stepCount - i) * stepDepth;
                
                const stepGeometry = new this.THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
                const stepMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x1A1A1A,
                    metalness: 0.3,
                    roughness: 0.7
                });
                
                const step = new this.THREE.Mesh(stepGeometry, stepMaterial);
                step.position.set(stageX, stepY - stepHeight/2, stepZ - stepDepth/2);
                step.userData.templateObject = true;
                step.userData.canPlaceObjects = true;
                this.scene.add(step);
                this.objects.push(step);
                
                // Multiple markers across the width of this step (every 5 units for full coverage)
                const markersPerStep = 13; // Every 5 units across 65-unit width
                const markerSpacing = 5;
                const stepMarkerGeometry = new this.THREE.SphereGeometry(0.3, 8, 8);
                const stepMarkerMaterial = new this.THREE.MeshBasicMaterial({
                    color: 0xFF00FF,
                    transparent: true,
                    opacity: 0.0
                });
                
                for (let m = 0; m < markersPerStep; m++) {
                    const markerX = stageX + (m - Math.floor(markersPerStep/2)) * markerSpacing;
                    const stepMarker = new this.THREE.Mesh(stepMarkerGeometry, stepMarkerMaterial);
                    stepMarker.position.set(markerX, stepY + 0.2, stepZ - stepDepth/2);
                    stepMarker.userData.isSlotMarker = true;
                    stepMarker.userData.furnitureId = `stage_step_${i}`;
                    stepMarker.userData.slotIndex = i * 100 + m; // Unique slot per marker
                    stepMarker.userData.templateObject = true;
                    this.scene.add(stepMarker);
                    this.objects.push(stepMarker);
                }
            }
            
            // === MAIN STAGE DECK ===
            const deckGeometry = new this.THREE.BoxGeometry(deckWidth, deckThickness, deckDepth);
            const deckMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x0A0A0A,
                metalness: 0.2,
                roughness: 0.8
            });
            
            const deck = new this.THREE.Mesh(deckGeometry, deckMaterial);
            deck.position.set(stageX, stageBaseY + deckHeight - deckThickness/2, stageZ);
            deck.userData.templateObject = true;
            deck.userData.canPlaceObjects = true;
            this.scene.add(deck);
            this.objects.push(deck);
            
            // Multiple markers across the main deck with 5-unit spacing for full coverage
            const deckMarkersPerRow = 13; // x-axis: every 5 units across 65-unit width
            const deckMarkersDepth = 9; // z-axis: every 5 units across 45-unit depth
            const deckMarkerSpacingX = 5;
            const deckMarkerSpacingZ = 5;
            
            const deckMarkerGeometry = new this.THREE.SphereGeometry(0.3, 8, 8);
            const deckMarkerMaterial = new this.THREE.MeshBasicMaterial({
                color: 0xFF00FF,
                transparent: true,
                opacity: 0.0
            });
            
            for (let dx = 0; dx < deckMarkersPerRow; dx++) {
                for (let dz = 0; dz < deckMarkersDepth; dz++) {
                    const markerX = stageX + (dx - Math.floor(deckMarkersPerRow/2)) * deckMarkerSpacingX;
                    const markerZ = stageZ + (dz - Math.floor(deckMarkersDepth/2)) * deckMarkerSpacingZ;
                    const deckMarker = new this.THREE.Mesh(deckMarkerGeometry, deckMarkerMaterial);
                    deckMarker.position.set(markerX, stageBaseY + deckHeight + 0.2, markerZ);
                    deckMarker.userData.isSlotMarker = true;
                    deckMarker.userData.furnitureId = 'main_stage_deck';
                    deckMarker.userData.slotIndex = dx * 100 + dz; // Unique slot per marker
                    deckMarker.userData.templateObject = true;
                    this.scene.add(deckMarker);
                    this.objects.push(deckMarker);
                }
            }
            
            // === STAGE FRONT EDGE (glowing LED strip) ===
            const edgeHeight = 0.5;
            const edgeGeometry = new this.THREE.BoxGeometry(deckWidth, edgeHeight, 0.3);
            const edgeMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xFF00FF,
                emissive: 0xFF00FF,
                emissiveIntensity: 1.5,
                metalness: 1.0,
                roughness: 0.0
            });
            
            const frontEdge = new this.THREE.Mesh(edgeGeometry, edgeMaterial);
            frontEdge.position.set(stageX, stageBaseY + deckHeight - edgeHeight/2, stageZ + deckDepth/2);
            frontEdge.userData.templateObject = true;
            this.scene.add(frontEdge);
            this.objects.push(frontEdge);
            
            // === SUPPORT POSTS (under stage) ===
            const postRadius = 0.8;
            const postHeight = deckHeight - deckThickness;
            const postGeometry = new this.THREE.CylinderGeometry(postRadius, postRadius, postHeight, 12);
            const postMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x333333,
                metalness: 0.8,
                roughness: 0.3
            });
            
            const postPositions = [
                { x: -deckWidth/3, z: -deckDepth/3 },
                { x: deckWidth/3, z: -deckDepth/3 },
                { x: -deckWidth/3, z: deckDepth/3 },
                { x: deckWidth/3, z: deckDepth/3 }
            ];
            
            postPositions.forEach(pos => {
                const post = new this.THREE.Mesh(postGeometry, postMaterial);
                post.position.set(stageX + pos.x, stageBaseY + postHeight/2, stageZ + pos.z);
                post.userData.templateObject = true;
                this.scene.add(post);
                this.objects.push(post);
            });
            
            // === FOUR CORNER TOWERS (truss columns) ===
            const towerHeight = 35;
            const towerRadius = 1.2;
            const towerGeometry = new this.THREE.CylinderGeometry(towerRadius, towerRadius, towerHeight, 8);
            const towerMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.9,
                roughness: 0.2
            });
            
            const towerSpacing = 5;
            const towerPositions = [
                { x: -deckWidth/2 - towerSpacing, z: -deckDepth/2 - towerSpacing },
                { x: deckWidth/2 + towerSpacing, z: -deckDepth/2 - towerSpacing },
                { x: -deckWidth/2 - towerSpacing, z: deckDepth/2 + towerSpacing },
                { x: deckWidth/2 + towerSpacing, z: deckDepth/2 + towerSpacing }
            ];
            
            towerPositions.forEach(pos => {
                const tower = new this.THREE.Mesh(towerGeometry, towerMaterial);
                tower.position.set(stageX + pos.x, stageBaseY + deckHeight + towerHeight/2, stageZ + pos.z);
                tower.userData.templateObject = true;
                this.scene.add(tower);
                this.objects.push(tower);
            });
            
            // === ROOF CANOPY ===
            const roofWidth = deckWidth + 2 * towerSpacing + 4;
            const roofDepth = deckDepth + 2 * towerSpacing + 4;
            const roofY = stageBaseY + deckHeight + towerHeight;
            
            const roofGeometry = new this.THREE.BoxGeometry(roofWidth, 0.5, roofDepth);
            const roofMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x1A1A1A,
                metalness: 0.5,
                roughness: 0.5,
                transparent: true,
                opacity: 0.4
            });
            
            const roof = new this.THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.set(stageX, roofY, stageZ);
            roof.userData.templateObject = true;
            this.scene.add(roof);
            this.objects.push(roof);
            
            // === FRONT TRUSS (glowing) ===
            const trussGeometry = new this.THREE.BoxGeometry(roofWidth, 1.5, 1.5);
            const trussMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xFFFF00,
                emissive: 0xFFFF00,
                emissiveIntensity: 0.8,
                metalness: 1.0,
                roughness: 0.1
            });
            
            const frontTruss = new this.THREE.Mesh(trussGeometry, trussMaterial);
            frontTruss.position.set(stageX, roofY - 1, stageZ + deckDepth/2 + 2);
            frontTruss.userData.templateObject = true;
            this.scene.add(frontTruss);
            this.objects.push(frontTruss);
            
            // === MID TRUSS ===
            const midTruss = new this.THREE.Mesh(trussGeometry, trussMaterial.clone());
            midTruss.position.set(stageX, roofY - 1, stageZ);
            midTruss.userData.templateObject = true;
            this.scene.add(midTruss);
            this.objects.push(midTruss);
            
            // === BACK TRUSS ===
            const backTruss = new this.THREE.Mesh(trussGeometry, trussMaterial.clone());
            backTruss.position.set(stageX, roofY - 1, stageZ - deckDepth/2 - 2);
            backTruss.userData.templateObject = true;
            this.scene.add(backTruss);
            this.objects.push(backTruss);
            
            // === STAGE BACKDROP (tall LED wall) ===
            const backdropWidth = deckWidth - 4;
            const backdropHeight = 25;
            const backdropGeometry = new this.THREE.BoxGeometry(backdropWidth, backdropHeight, 0.5);
            const backdropMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x0A0A2A,
                emissive: 0x000044,
                emissiveIntensity: 0.5,
                metalness: 0.8,
                roughness: 0.3
            });
            
            const backdrop = new this.THREE.Mesh(backdropGeometry, backdropMaterial);
            backdrop.position.set(stageX, stageBaseY + deckHeight + backdropHeight/2, stageZ - deckDepth/2 - 1);
            backdrop.userData.templateObject = true;
            this.scene.add(backdrop);
            this.objects.push(backdrop);
            
            // === SIDE VIDEO SCREENS (with animated patterns) ===
            this.createVideoScreens(stageX, stageZ, stageBaseY + deckHeight, deckDepth);
            
            // === DRUM RISER ===
            const riserSize = 8;
            const riserHeight = 2.5;
            const riserGeometry = new this.THREE.BoxGeometry(riserSize, riserHeight, riserSize);
            const riserMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x2A2A2A,
                metalness: 0.3,
                roughness: 0.7
            });
            
            const drumRiser = new this.THREE.Mesh(riserGeometry, riserMaterial);
            drumRiser.position.set(stageX, stageBaseY + deckHeight + riserHeight/2, stageZ - deckDepth/4);
            drumRiser.userData.templateObject = true;
            drumRiser.userData.canPlaceObjects = true;
            this.scene.add(drumRiser);
            this.objects.push(drumRiser);
            
            // Drum riser marker
            const drumRiserMarker = new this.THREE.Mesh(deckMarkerGeometry.clone(), deckMarkerMaterial.clone());
            drumRiserMarker.position.set(stageX, stageBaseY + deckHeight + riserHeight + 0.2, stageZ - deckDepth/4);
            drumRiserMarker.userData.isSlotMarker = true;
            drumRiserMarker.userData.furnitureId = 'drum_riser';
            drumRiserMarker.userData.slotIndex = 0;
            drumRiserMarker.userData.templateObject = true;
            this.scene.add(drumRiserMarker);
            this.objects.push(drumRiserMarker);
            
            // === KEYBOARD RISERS (left and right) ===
            const keyRiserWidth = 4;
            const keyRiserDepth = 8;
            const keyRiserHeight = 1.5;
            const keyRiserGeometry = new this.THREE.BoxGeometry(keyRiserWidth, keyRiserHeight, keyRiserDepth);
            
            const leftKeyRiser = new this.THREE.Mesh(keyRiserGeometry, riserMaterial.clone());
            leftKeyRiser.position.set(stageX - 12, stageBaseY + deckHeight + keyRiserHeight/2, stageZ - deckDepth/4);
            leftKeyRiser.userData.templateObject = true;
            leftKeyRiser.userData.canPlaceObjects = true;
            this.scene.add(leftKeyRiser);
            this.objects.push(leftKeyRiser);
            
            // Left keyboard riser marker
            const leftKeyMarker = new this.THREE.Mesh(deckMarkerGeometry.clone(), deckMarkerMaterial.clone());
            leftKeyMarker.position.set(stageX - 12, stageBaseY + deckHeight + keyRiserHeight + 0.2, stageZ - deckDepth/4);
            leftKeyMarker.userData.isSlotMarker = true;
            leftKeyMarker.userData.furnitureId = 'left_keyboard_riser';
            leftKeyMarker.userData.slotIndex = 0;
            leftKeyMarker.userData.templateObject = true;
            this.scene.add(leftKeyMarker);
            this.objects.push(leftKeyMarker);
            
            const rightKeyRiser = new this.THREE.Mesh(keyRiserGeometry, riserMaterial.clone());
            rightKeyRiser.position.set(stageX + 12, stageBaseY + deckHeight + keyRiserHeight/2, stageZ - deckDepth/4);
            rightKeyRiser.userData.templateObject = true;
            rightKeyRiser.userData.canPlaceObjects = true;
            this.scene.add(rightKeyRiser);
            this.objects.push(rightKeyRiser);
            
            // Right keyboard riser marker
            const rightKeyMarker = new this.THREE.Mesh(deckMarkerGeometry.clone(), deckMarkerMaterial.clone());
            rightKeyMarker.position.set(stageX + 12, stageBaseY + deckHeight + keyRiserHeight + 0.2, stageZ - deckDepth/4);
            rightKeyMarker.userData.isSlotMarker = true;
            rightKeyMarker.userData.furnitureId = 'right_keyboard_riser';
            rightKeyMarker.userData.slotIndex = 0;
            rightKeyMarker.userData.templateObject = true;
            this.scene.add(rightKeyMarker);
            this.objects.push(rightKeyMarker);
            
            // === BRIGHT STAGE POINT LIGHTS ===
            const stageLightConfigs = [
                { color: 0xFF00FF, position: { x: -25, y: roofY - 2, z: deckDepth/2 } },
                { color: 0x00FFFF, position: { x: 0, y: roofY - 2, z: deckDepth/2 } },
                { color: 0xFFFF00, position: { x: 25, y: roofY - 2, z: deckDepth/2 } },
                { color: 0xFF0066, position: { x: -20, y: roofY - 2, z: 0 } },
                { color: 0x00FF66, position: { x: 20, y: roofY - 2, z: 0 } },
                { color: 0x9900FF, position: { x: 0, y: roofY - 2, z: -deckDepth/2 } }
            ];
            
            stageLightConfigs.forEach(config => {
                const light = new this.THREE.PointLight(config.color, 1.8, 100);
                light.position.set(stageX + config.position.x, config.position.y, stageZ + config.position.z);
                light.userData.templateLight = true;
                light.userData.stageLight = true;
                this.scene.add(light);
                this.objects.push(light);
            });
            
            console.log('Festival stage created with climbable surfaces');
        }

        createVideoScreens(stageX, stageZ, stageY, stageDept) {
            // Create two large video screens flanking the stage
            const screenWidth = 20;
            const screenHeight = 28;
            const screenDistance = 45;
            const screenZ = stageZ + 5;
            
            // Create canvas for animated patterns
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            
            const ctx = canvas.getContext('2d');
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // Left screen
            const leftScreenGeometry = new this.THREE.PlaneGeometry(screenWidth, screenHeight);
            const leftScreenMaterial = new this.THREE.MeshStandardMaterial({
                map: texture,
                emissive: 0xFFFFFF,
                emissiveMap: texture,
                emissiveIntensity: 1.2,
                side: this.THREE.DoubleSide
            });
            
            const leftScreen = new this.THREE.Mesh(leftScreenGeometry, leftScreenMaterial);
            leftScreen.position.set(stageX - screenDistance, stageY + screenHeight/2, screenZ);
            leftScreen.rotation.y = Math.PI / 6;
            leftScreen.userData.templateObject = true;
            leftScreen.userData.videoScreen = true;
            leftScreen.userData.canvas = canvas;
            leftScreen.userData.ctx = ctx;
            leftScreen.userData.texture = texture;
            this.scene.add(leftScreen);
            this.objects.push(leftScreen);
            this.videoScreens.push(leftScreen);
            
            // Right screen (clone)
            const rightCanvas = document.createElement('canvas');
            rightCanvas.width = 512;
            rightCanvas.height = 512;
            const rightCtx = rightCanvas.getContext('2d');
            const rightTexture = new this.THREE.CanvasTexture(rightCanvas);
            
            const rightScreenMaterial = new this.THREE.MeshStandardMaterial({
                map: rightTexture,
                emissive: 0xFFFFFF,
                emissiveMap: rightTexture,
                emissiveIntensity: 1.2,
                side: this.THREE.DoubleSide
            });
            
            const rightScreen = new this.THREE.Mesh(leftScreenGeometry.clone(), rightScreenMaterial);
            rightScreen.position.set(stageX + screenDistance, stageY + screenHeight/2, screenZ);
            rightScreen.rotation.y = -Math.PI / 6;
            rightScreen.userData.templateObject = true;
            rightScreen.userData.videoScreen = true;
            rightScreen.userData.canvas = rightCanvas;
            rightScreen.userData.ctx = rightCtx;
            rightScreen.userData.texture = rightTexture;
            this.scene.add(rightScreen);
            this.objects.push(rightScreen);
            this.videoScreens.push(rightScreen);
            
            // Add point lights for screen glow
            const leftLight = new this.THREE.PointLight(0xFF00FF, 1.5, 60);
            leftLight.position.copy(leftScreen.position);
            leftLight.userData.templateLight = true;
            this.scene.add(leftLight);
            this.objects.push(leftLight);
            
            const rightLight = new this.THREE.PointLight(0x00FFFF, 1.5, 60);
            rightLight.position.copy(rightScreen.position);
            rightLight.userData.templateLight = true;
            this.scene.add(rightLight);
            this.objects.push(rightLight);
        }

        updateVideoScreenPattern(time) {
            // 4 different animated patterns that rotate every 8 seconds
            const patternDuration = 8000;
            
            if (time - this.lastPatternChange > patternDuration) {
                this.videoPatternIndex = (this.videoPatternIndex + 1) % 4;
                this.lastPatternChange = time;
            }
            
            this.videoScreens.forEach(screen => {
                const ctx = screen.userData.ctx;
                const canvas = screen.userData.canvas;
                const texture = screen.userData.texture;
                
                const w = canvas.width;
                const h = canvas.height;
                const t = time * 0.001;
                
                // Clear canvas
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, w, h);
                
                switch(this.videoPatternIndex) {
                    case 0: // Colorful waves
                        for (let y = 0; y < h; y += 10) {
                            const hue = ((y / h * 360) + t * 50) % 360;
                            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                            const wave = Math.sin(y * 0.02 + t * 2) * 50;
                            ctx.fillRect(w/2 + wave - 100, y, 200, 10);
                        }
                        break;
                        
                    case 1: // Pulsing circles
                        for (let i = 0; i < 5; i++) {
                            const radius = ((t * 100 + i * 50) % 300);
                            const alpha = 1 - (radius / 300);
                            const hue = (i * 72 + t * 30) % 360;
                            ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
                            ctx.lineWidth = 8;
                            ctx.beginPath();
                            ctx.arc(w/2, h/2, radius, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                        break;
                        
                    case 2: // Vertical color bars
                        const barCount = 8;
                        for (let i = 0; i < barCount; i++) {
                            const hue = ((i / barCount * 360) + t * 40) % 360;
                            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                            const barWidth = w / barCount;
                            const offset = ((t * 50) % barWidth);
                            ctx.fillRect(i * barWidth - offset, 0, barWidth, h);
                        }
                        break;
                        
                    case 3: // Plasma effect
                        const imageData = ctx.createImageData(w, h);
                        for (let x = 0; x < w; x++) {
                            for (let y = 0; y < h; y++) {
                                const value = Math.sin(x * 0.02 + t) + 
                                             Math.sin(y * 0.02 + t) + 
                                             Math.sin((x + y) * 0.02 + t);
                                const hue = ((value + 3) / 6 * 360 + t * 30) % 360;
                                const rgb = this.hslToRgb(hue / 360, 1, 0.5);
                                const idx = (y * w + x) * 4;
                                imageData.data[idx] = rgb[0];
                                imageData.data[idx + 1] = rgb[1];
                                imageData.data[idx + 2] = rgb[2];
                                imageData.data[idx + 3] = 255;
                            }
                        }
                        ctx.putImageData(imageData, 0, 0);
                        break;
                }
                
                texture.needsUpdate = true;
            });
        }

        hslToRgb(h, s, l) {
            let r, g, b;
            
            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            
            return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
        }

        animate(time) {
            // Pulse stage lights gently for concert atmosphere
            if (this.stageLights.length > 0) {
                this.stageLights.forEach((light, index) => {
                    const offset = index * 0.7; // Different phase for each light
                    const pulse = Math.sin(time * 0.001 + offset) * 0.5 + 0.5; // 0 to 1
                    light.intensity = 0.2 + pulse * 0.3; // Range: 0.2 to 0.5
                });
            }

            // Update video screen animations
            if (this.videoScreens.length > 0) {
                this.updateVideoScreenPattern(time);
            }

            if (this.environmentSystem) {
                this.environmentSystem.animate(time);
            }
        }

        cleanup() {
            this.stageLights = [];
            
            // Clean up video screens
            this.videoScreens.forEach(screen => {
                if (screen.userData.texture) {
                    screen.userData.texture.dispose();
                }
            });
            this.videoScreens = [];
            
            if (this.environmentSystem) {
                this.environmentSystem.cleanup();
                this.environmentSystem = null;
                this.environment = null;
            }
            
            if (this.scene) {
                this.scene.fog = null;
            }
            
            super.cleanup();
        }

        getType() {
            return 'music-festival';
        }

        getDisplayName() {
            return 'Music Festival';
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
                requiresSupport: true,  // Objects must sit on ground or furniture
                allowedStackingDirections: ['top'],
                worldBoundaries: {
                    x: { min: -450, max: 450 },
                    y: { min: 0, max: 150 },
                    z: { min: -450, max: 450 }
                }
            };
        }

        applyPositionConstraints(object, newPosition, allObjects = []) {
            // Use shared gravity + furniture marker detection from BaseWorldTemplate
            return this.applyGravityWithFurnitureSupport(object, newPosition, allObjects, this.groundLevelY);
        }

        // Suggest default furniture layout for festival
        static getDefaultFurnitureLayout() {
            return [
                {
                    type: 'stage_small',
                    style: 'metal',
                    position: { x: -50, y: 0, z: -30 },
                    rotation: 0,
                    name: 'Side Stage Left'
                },
                {
                    type: 'stage_small',
                    style: 'metal',
                    position: { x: 50, y: 0, z: -30 },
                    rotation: 0,
                    name: 'Side Stage Right'
                },
                {
                    type: 'amphitheatre',
                    style: 'woodgrain',
                    position: { x: 0, y: 0, z: 40 },
                    rotation: Math.PI,
                    name: 'Chill Amphitheatre'
                },
                {
                    type: 'bookshelf',
                    style: 'woodgrain',
                    position: { x: -60, y: 0, z: 20 },
                    rotation: Math.PI / 2,
                    name: 'Merch Booth Left'
                },
                {
                    type: 'bookshelf',
                    style: 'woodgrain',
                    position: { x: 60, y: 0, z: 20 },
                    rotation: -Math.PI / 2,
                    name: 'Merch Booth Right'
                }
            ];
        }
    }
    
    // Export to global scope
    window.MusicFestivalWorldTemplate = MusicFestivalWorldTemplate;
    
    console.log("MusicFestivalWorld module loaded");
})();
