/**
 * PREMIUM WORLD THEMES MODULE
 * Extends the existing world theme system with premium themes
 * - Dazzle Theme: Pink/purple bedroom with sparkles and customizable posters
 * - Forest Realm: Enhanced nature theme with tree trunk connections for elevated objects
 */

// Import required modules
import('./posterCreator.js').then(module => {
    window.PosterCreator = module.default || module.PosterCreator;
}).catch(err => console.log('PosterCreator will be loaded via script tag'));

import('./bedroomDecorations.js').then(module => {
    window.BedroomDecorations = module.default || module.BedroomDecorations;
}).catch(err => console.log('BedroomDecorations will be loaded via script tag'));

(function() {
    'use strict';
    
    console.log('🎨 Loading Premium World Themes module...');

    // ============================================================================
    // DAZZLE BEDROOM WORLD TEMPLATE (Premium)
    // ============================================================================
    
    class DazzleBedroomWorldTemplate extends BaseWorldTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                ambientLightColor: 0xFFE4E1, // Soft pink ambient
                ambientLightIntensity: 0.6,
                directionalLightColor: 0xFFFFFF,
                directionalLightIntensity: 0.8,
                ...config
            });
            this.sparkles = [];
            this.posters = [];
        }

        getType() {
            return 'dazzle';
        }

        getHomeViewPosition() {
        return { x: 0, y: 10, z: 25 }; // Same as green plane for consistent camera views
    }

    getHomeViewTarget() {
        return { x: 0, y: 0, z: 10 }; // Same as green plane for consistent camera views

        applyCameraConstraints(controls) {
            controls.minDistance = 2.0;
            controls.maxDistance = 80.0;
        }

        getPositioningConstraints() {
            return {
                requiresSupport: true, // Objects need support in bedroom
                allowedStackingDirections: ['top', 'front', 'back', 'left', 'right'],
                worldBoundaries: {
                    x: { min: -150, max: 150 },
                    y: { min: 0, max: 100 },
                    z: { min: -150, max: 150 }
                }
            };
        }

        setupEnvironment() {
            console.log('💎 Setting up Dazzle Bedroom world...');
            
            // Ground level for positioning
            this.groundLevelY = 0;
            
            // Pink plush carpet floor
            this.createPlushCarpetFloor();
            
            // Soft white ceiling
            this.createSoftCeiling();
            
            // Complete bedroom walls (4 walls extending to ceiling)
            this.createBedroomWalls();
            
            // Bedroom door
            this.createBedroomDoor();
            
            // Window with sky view
            this.createBedroomWindow();
            
            // Bedroom furniture
            this.createFurniture();
            
            // Phase 2 & 3: Girl-themed posters
            this.createBedroomPosters();
            
            // Sparkle effects
            this.createSparkles();
            
            // Atmosphere - much lighter fog so walls are visible
            this.scene.fog = new this.THREE.Fog(0xFFD0F0, 100, 400); // Increased from 30,120 to 100,400
            
            console.log('💎 Dazzle Bedroom world setup complete');
        }

        createPlushCarpetFloor() {
            console.log('💎 Creating plush carpet floor texture...');
            
            // Create canvas for plush carpet texture
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Base pink color for carpet
            ctx.fillStyle = '#FF69B4'; // Hot pink base
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add subtle plush carpet fiber texture (no dark splotches)
            for (let i = 0; i < 800; i++) { // More fibers for texture
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 3 + 1; // Smaller, more subtle
                
                // Only light pink highlights for plush effect
                if (Math.random() > 0.3) { // More frequent but lighter
                    ctx.fillStyle = `rgba(255, 182, 193, ${Math.random() * 0.3 + 0.1})`; // Light pink fibers
                    ctx.beginPath();
                    ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Very subtle white highlights for sparkle
                if (Math.random() > 0.8) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2 + 0.1})`; // Gentle white sparkles
                    ctx.beginPath();
                    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // Add directional carpet fiber lines for realistic plush texture
            ctx.strokeStyle = 'rgba(255, 182, 193, 0.15)'; // Very light pink lines
            ctx.lineWidth = 1;
            for (let i = 0; i < 50; i++) {
                const startX = Math.random() * canvas.width;
                const startY = Math.random() * canvas.height;
                const length = Math.random() * 20 + 10;
                const angle = Math.random() * Math.PI * 2;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(startX + Math.cos(angle) * length, startY + Math.sin(angle) * length);
                ctx.stroke();
            }
            
            // Create texture from canvas
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.wrapS = this.THREE.RepeatWrapping;
            texture.wrapT = this.THREE.RepeatWrapping;
            texture.repeat.set(3, 3); // Good repeat pattern for carpet
            texture.needsUpdate = true; // Force texture update
            
            // Create floor geometry and material
            const floorGeometry = new this.THREE.PlaneGeometry(300, 300);
            const floorMaterial = new this.THREE.MeshStandardMaterial({ 
                map: texture,
                color: 0xFF69B4, // Hot pink base color to ensure visibility
                metalness: 0.0,
                roughness: 0.95, // Very rough for plush carpet feel
                transparent: false
            });
            
            const floor = new this.THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -0.01;
            floor.receiveShadow = true;
            floor.userData = {
                templateObject: true,
                isFloor: true,
                roomElement: true
            };
            this.scene.add(floor);
            this.objects.push(floor);
            
            console.log('💎 Clean plush pink carpet floor created with fiber texture');
        }

        createSoftCeiling() {
            const ceilingGeometry = new this.THREE.PlaneGeometry(300, 300);
            const ceilingMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0xFAFAFA, // Soft white
                metalness: 0.1,
                roughness: 0.3
            });
            const ceiling = new this.THREE.Mesh(ceilingGeometry, ceilingMaterial);
            ceiling.rotation.x = Math.PI / 2; // Face downward
            ceiling.position.y = 100; // At ceiling height
            ceiling.receiveShadow = false;
            ceiling.userData = {
                templateObject: true,
                isCeiling: true,
                roomElement: true
            };
            this.scene.add(ceiling);
            this.objects.push(ceiling);
            
            console.log('💎 Soft white ceiling created');
        }

        createBedroomWalls() {
            const wallHeight = 100; // Full height to ceiling
            const roomSize = 150;
            
            // STRONG pink color for ALL walls - color the INSIDE surfaces
            const pinkColor = 0xFF69B4; // Hot pink to make it VERY obvious
            
            // Back wall (negative Z) - facing FORWARD into room
            const backWallGeometry = new this.THREE.PlaneGeometry(roomSize * 2, wallHeight);
            const backWall = new this.THREE.Mesh(backWallGeometry, new this.THREE.MeshStandardMaterial({ 
                color: pinkColor,
                side: this.THREE.FrontSide // Make sure front side faces into room
            }));
            backWall.position.set(0, wallHeight / 2, -roomSize);
            // NO rotation - facing forward (positive Z) into room
            backWall.userData = { templateObject: true, wallType: 'back', roomElement: true };
            this.scene.add(backWall);
            this.objects.push(backWall);

            // Front wall (positive Z) - facing BACKWARD into room  
            const frontWall = new this.THREE.Mesh(backWallGeometry, new this.THREE.MeshStandardMaterial({ 
                color: pinkColor,
                side: this.THREE.FrontSide
            }));
            frontWall.position.set(0, wallHeight / 2, roomSize);
            frontWall.rotation.y = Math.PI; // Rotate to face backward (negative Z) into room
            frontWall.userData = { templateObject: true, wallType: 'front', roomElement: true };
            this.scene.add(frontWall);
            this.objects.push(frontWall);

            // Left wall (negative X) - facing RIGHT into room
            const sideWallGeometry = new this.THREE.PlaneGeometry(roomSize * 2, wallHeight);
            const leftWall = new this.THREE.Mesh(sideWallGeometry, new this.THREE.MeshStandardMaterial({ 
                color: pinkColor,
                side: this.THREE.FrontSide
            }));
            leftWall.position.set(-roomSize, wallHeight / 2, 0);
            leftWall.rotation.y = Math.PI / 2; // Rotate to face right (positive X) into room
            leftWall.userData = { templateObject: true, wallType: 'left', roomElement: true };
            this.scene.add(leftWall);
            this.objects.push(leftWall);

            // Right wall (positive X) - facing LEFT into room
            const rightWall = new this.THREE.Mesh(sideWallGeometry, new this.THREE.MeshStandardMaterial({ 
                color: pinkColor,
                side: this.THREE.FrontSide
            }));
            rightWall.position.set(roomSize, wallHeight / 2, 0);
            rightWall.rotation.y = -Math.PI / 2; // Rotate to face left (negative X) into room
            rightWall.userData = { templateObject: true, wallType: 'right', roomElement: true };
            this.scene.add(rightWall);
            this.objects.push(rightWall);
            
            console.log('💎 HOT PINK walls created - INSIDE surfaces facing into room');
        }

        createBedroomDoor() {
            // Dark outer frame around the entire door area
            const outerFrameWidth = 40;
            const outerFrameHeight = 90;
            const outerFrameDepth = 4;
            
            const outerFrameGeometry = new this.THREE.BoxGeometry(outerFrameWidth, outerFrameHeight, outerFrameDepth);
            const outerFrameMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0x2F1B14, // Very dark brown outer frame
                metalness: 0.1,
                roughness: 0.9
            });
            const outerFrame = new this.THREE.Mesh(outerFrameGeometry, outerFrameMaterial);
            outerFrame.position.set(0, outerFrameHeight / 2, 147.0); // Deep in wall
            outerFrame.castShadow = true;
            outerFrame.userData = {
                templateObject: true,
                isDoorOuterFrame: true,
                roomElement: true
            };
            this.scene.add(outerFrame);
            this.objects.push(outerFrame);
            
            // Door frame (border around door)
            const frameWidth = 36;
            const frameHeight = 86;
            const frameDepth = 3;
            
            const frameGeometry = new this.THREE.BoxGeometry(frameWidth, frameHeight, frameDepth);
            const frameMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0x4A2C2A, // Darker brown frame for visibility
                metalness: 0.2,
                roughness: 0.8
            });
            const doorFrame = new this.THREE.Mesh(frameGeometry, frameMaterial);
            doorFrame.position.set(0, frameHeight / 2, 147.5); // Against the wall
            doorFrame.castShadow = true;
            doorFrame.userData = {
                templateObject: true,
                isDoorFrame: true,
                roomElement: true
            };
            this.scene.add(doorFrame);
            this.objects.push(doorFrame);
            
            // Main door panel - smaller than frame
            const doorWidth = 32;
            const doorHeight = 82;
            const doorDepth = 2;
            
            const doorGeometry = new this.THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
            const doorMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0x8B4513 // Wood brown
            });
            const door = new this.THREE.Mesh(doorGeometry, doorMaterial);
            door.position.set(0, doorHeight / 2, 148.8); // In front of frame
            door.castShadow = true;
            door.userData = {
                templateObject: true,
                isDoor: true,
                roomElement: true
            };
            this.scene.add(door);
            this.objects.push(door);
            
            // Add door panels for detail
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 2; col++) {
                    const panelGeometry = new this.THREE.BoxGeometry(12, 16, 0.5);
                    const panelMaterial = new this.THREE.MeshStandardMaterial({ 
                        color: 0x704214, // Darker brown for panels
                        metalness: 0.1,
                        roughness: 0.9
                    });
                    
                    const panel = new this.THREE.Mesh(panelGeometry, panelMaterial);
                    panel.position.set(
                        -8 + (col * 16), // Horizontal spacing
                        25 + (row * 20), // Vertical spacing 
                        149.8 // Forward of door
                    );
                    panel.userData = {
                        templateObject: true,
                        isDoorPanel: true,
                        roomElement: true
                    };
                    this.scene.add(panel);
                    this.objects.push(panel);
                }
            }
            
            // Door knob - 2X LARGER and INSIDE the room
            const handleGeometry = new this.THREE.SphereGeometry(4, 16, 16); // 2x larger (was 2, now 4)
            const handleMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0xB87333, // Copper color (not gold)
                metalness: 0.9,
                roughness: 0.1
            });
            const handle = new this.THREE.Mesh(handleGeometry, handleMaterial);
            handle.position.set(13, 41, 147.0); // Right side, inside room, very visible
            handle.userData = {
                templateObject: true,
                isDoorHandle: true,
                roomElement: true
            };
            this.scene.add(handle);
            this.objects.push(handle);
            
            console.log('💎 Bedroom door with dark outer frame, panels, and large interior gold knob created');
        }

        createBedroomWindow() {
            // Window on the right wall - proper frame structure, not solid block
            const windowSize = 40;
            const frameThickness = 2;
            
            // Create window frame as 4 separate pieces (top, bottom, left, right)
            const frameMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0xF5F5DC // Beige frame
            });
            
            // Top frame piece
            const topFrameGeometry = new this.THREE.BoxGeometry(windowSize + 4, frameThickness, frameThickness);
            const topFrame = new this.THREE.Mesh(topFrameGeometry, frameMaterial);
            topFrame.position.set(148.5, 60 + windowSize/2 + 1, 0);
            topFrame.rotation.y = Math.PI / 2;
            topFrame.userData = { templateObject: true, isWindowFrame: true, roomElement: true };
            this.scene.add(topFrame);
            this.objects.push(topFrame);
            
            // Bottom frame piece
            const bottomFrame = new this.THREE.Mesh(topFrameGeometry, frameMaterial);
            bottomFrame.position.set(148.5, 60 - windowSize/2 - 1, 0);
            bottomFrame.rotation.y = Math.PI / 2;
            bottomFrame.userData = { templateObject: true, isWindowFrame: true, roomElement: true };
            this.scene.add(bottomFrame);
            this.objects.push(bottomFrame);
            
            // Left frame piece
            const sideFrameGeometry = new this.THREE.BoxGeometry(frameThickness, windowSize, frameThickness);
            const leftFrame = new this.THREE.Mesh(sideFrameGeometry, frameMaterial);
            leftFrame.position.set(148.5, 60, -windowSize/2 - 1);
            leftFrame.rotation.y = Math.PI / 2;
            leftFrame.userData = { templateObject: true, isWindowFrame: true, roomElement: true };
            this.scene.add(leftFrame);
            this.objects.push(leftFrame);
            
            // Right frame piece
            const rightFrame = new this.THREE.Mesh(sideFrameGeometry, frameMaterial);
            rightFrame.position.set(148.5, 60, windowSize/2 + 1);
            rightFrame.rotation.y = Math.PI / 2;
            rightFrame.userData = { templateObject: true, isWindowFrame: true, roomElement: true };
            this.scene.add(rightFrame);
            this.objects.push(rightFrame);
            
            // Create sky with clouds texture for window glass (completely clean)
            this.createSkyTexture().then(skyTexture => {
                const glassGeometry = new this.THREE.PlaneGeometry(windowSize, windowSize);
                const glassMaterial = new this.THREE.MeshStandardMaterial({ 
                    map: skyTexture,
                    transparent: true,
                    opacity: 0.9,
                    side: this.THREE.DoubleSide
                });
                const glass = new this.THREE.Mesh(glassGeometry, glassMaterial);
                glass.position.set(149.2, 60, 0); // In front of frame
                glass.rotation.y = -Math.PI / 2; // Face inward
                glass.userData = {
                    templateObject: true,
                    isWindow: true,
                    isWindowGlass: true,
                    roomElement: true
                };
                this.scene.add(glass);
                this.objects.push(glass);
                
                console.log('💎 Bedroom window with proper frame structure (not blocking sky) created');
            });
        }

        async createSkyTexture() {
            // Create canvas for sky with clouds
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Sky gradient (blue at top, lighter at bottom)
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#87CEEB'); // Sky blue
            gradient.addColorStop(1, '#B0E0E6'); // Powder blue
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add fluffy white clouds
            for (let i = 0; i < 8; i++) {
                const cloudX = Math.random() * canvas.width;
                const cloudY = Math.random() * canvas.height * 0.7; // Clouds in upper portion
                const cloudSize = Math.random() * 60 + 40;
                
                // Create cloud with multiple circles for fluffy effect
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                for (let j = 0; j < 5; j++) {
                    const offsetX = (Math.random() - 0.5) * cloudSize;
                    const offsetY = (Math.random() - 0.5) * cloudSize * 0.5;
                    const circleSize = cloudSize * (0.3 + Math.random() * 0.4);
                    
                    ctx.beginPath();
                    ctx.arc(cloudX + offsetX, cloudY + offsetY, circleSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // Create and return texture
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            console.log('💎 Sky texture with clouds created');
            return texture;
        }

        createFurniture() {
            // 4-Post Canopy Bed
            const bedBaseGeometry = new this.THREE.BoxGeometry(40, 6, 60);
            const bedBaseMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0xFF69B4 // Hot pink bed base
            });
            const bedBase = new this.THREE.Mesh(bedBaseGeometry, bedBaseMaterial);
            bedBase.position.set(-80, 3, -100);
            bedBase.castShadow = true;
            bedBase.userData.templateObject = true;
            this.scene.add(bedBase);
            this.objects.push(bedBase);
            
            // 4 Wooden Bed Posts
            const postHeight = 40;
            const postGeometry = new this.THREE.CylinderGeometry(1.5, 1.5, postHeight);
            const postMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0x8B4513 // Wood brown
            });
            
            const postPositions = [
                { x: -100, z: -130 }, // Back left
                { x: -60, z: -130 },  // Back right
                { x: -100, z: -70 },  // Front left
                { x: -60, z: -70 }    // Front right
            ];
            
            postPositions.forEach(pos => {
                const post = new this.THREE.Mesh(postGeometry, postMaterial);
                post.position.set(pos.x, postHeight / 2 + 6, pos.z);
                post.castShadow = true;
                post.userData.templateObject = true;
                this.scene.add(post);
                this.objects.push(post);
            });
            
            // Canopy Top Frame - positioned at the TOP of the posts
            const frameWidth = 42;
            const frameDepth = 62;
            const frameThickness = 1;
            const canopyHeight = postHeight + 6; // Top of posts (40 + 6 = 46)
            
            // Front frame rail
            const frontRailGeometry = new this.THREE.BoxGeometry(frameWidth, frameThickness, frameThickness);
            const railMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0x8B4513 // Wood brown
            });
            const frontRail = new this.THREE.Mesh(frontRailGeometry, railMaterial);
            frontRail.position.set(-80, canopyHeight, -70); // At top of posts
            frontRail.userData.templateObject = true;
            this.scene.add(frontRail);
            this.objects.push(frontRail);
            
            // Back frame rail
            const backRail = new this.THREE.Mesh(frontRailGeometry, railMaterial);
            backRail.position.set(-80, canopyHeight, -130); // At top of posts
            backRail.userData.templateObject = true;
            this.scene.add(backRail);
            this.objects.push(backRail);
            
            // Left side rail
            const sideRailGeometry = new this.THREE.BoxGeometry(frameThickness, frameThickness, frameDepth);
            const leftRail = new this.THREE.Mesh(sideRailGeometry, railMaterial);
            leftRail.position.set(-100, canopyHeight, -100); // At top of posts
            leftRail.userData.templateObject = true;
            this.scene.add(leftRail);
            this.objects.push(leftRail);
            
            // Right side rail
            const rightRail = new this.THREE.Mesh(sideRailGeometry, railMaterial);
            rightRail.position.set(-60, canopyHeight, -100); // At top of posts
            rightRail.userData.templateObject = true;
            this.scene.add(rightRail);
            this.objects.push(rightRail);
            
            // Pink Canopy Fabric on TOP of the crossbars
            const canopyGeometry = new this.THREE.PlaneGeometry(frameWidth, frameDepth);
            const canopyMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0xFF69B4, // Hot pink canopy
                transparent: true,
                opacity: 0.8,
                side: this.THREE.DoubleSide
            });
            const canopy = new this.THREE.Mesh(canopyGeometry, canopyMaterial);
            canopy.position.set(-80, canopyHeight + 1, -100); // Above the crossbars
            canopy.rotation.x = -Math.PI / 2; // Horizontal
            canopy.userData.templateObject = true;
            this.scene.add(canopy);
            this.objects.push(canopy);
            
            // Add decorative canopy curtains hanging from the top
            const curtainHeight = 25;
            const curtainMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0xFFB6C1, // Light pink curtains
                transparent: true,
                opacity: 0.6,
                side: this.THREE.DoubleSide
            });
            
            // Front curtains (2 panels hanging from top)
            for (let i = 0; i < 2; i++) {
                const curtainGeometry = new this.THREE.PlaneGeometry(18, curtainHeight);
                const curtain = new this.THREE.Mesh(curtainGeometry, curtainMaterial);
                curtain.position.set(-91 + (i * 22), canopyHeight - 12, -69); // Hanging from top
                curtain.userData.templateObject = true;
                this.scene.add(curtain);
                this.objects.push(curtain);
            }
            
            // Side curtains
            for (let i = 0; i < 2; i++) {
                const curtainGeometry = new this.THREE.PlaneGeometry(curtainHeight, 18);
                const curtain = new this.THREE.Mesh(curtainGeometry, curtainMaterial);
                curtain.position.set(-100 + (i * 40), canopyHeight - 12, -111 + (i * 22));
                curtain.rotation.y = Math.PI / 2;
                curtain.userData.templateObject = true;
                this.scene.add(curtain);
                this.objects.push(curtain);
            }
            
            console.log('💎 4-Post canopy bed with crossbars at top and proper pink canopy created');

            // Enhanced Dresser with drawers and handles
            const dresserWidth = 50;
            const dresserHeight = 25;
            const dresserDepth = 20;
            
            // Main dresser body
            const dresserGeometry = new this.THREE.BoxGeometry(dresserWidth, dresserHeight, dresserDepth);
            const dresserMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0x8B4513 // Brown dresser
            });
            const dresser = new this.THREE.Mesh(dresserGeometry, dresserMaterial);
            dresser.position.set(80, 12.5, -120);
            dresser.castShadow = true;
            dresser.userData.templateObject = true;
            this.scene.add(dresser);
            this.objects.push(dresser);
            
            // Add darker edge borders
            const edgeMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0x654321 // Darker brown edges
            });
            
            // Top and bottom edges
            for (let i = 0; i < 2; i++) {
                const edgeGeometry = new this.THREE.BoxGeometry(dresserWidth + 1, 1, dresserDepth + 1);
                const edge = new this.THREE.Mesh(edgeGeometry, edgeMaterial);
                edge.position.set(80, 12.5 + (i === 0 ? -12.5 : 12.5), -120);
                edge.userData.templateObject = true;
                this.scene.add(edge);
                this.objects.push(edge);
            }
            
            // Side edges
            for (let i = 0; i < 2; i++) {
                const edgeGeometry = new this.THREE.BoxGeometry(1, dresserHeight, dresserDepth + 1);
                const edge = new this.THREE.Mesh(edgeGeometry, edgeMaterial);
                edge.position.set(80 + (i === 0 ? -25.5 : 25.5), 12.5, -120);
                edge.userData.templateObject = true;
                this.scene.add(edge);
                this.objects.push(edge);
            }
            
            // Create 3 drawer fronts with lines and handles
            for (let i = 0; i < 3; i++) {
                const drawerHeight = 6;
                const drawerY = 5 + (i * 7); // Position from bottom up
                
                // Drawer front panel (slightly darker)
                const drawerGeometry = new this.THREE.BoxGeometry(dresserWidth - 4, drawerHeight, 0.5);
                const drawerMaterial = new this.THREE.MeshStandardMaterial({ 
                    color: 0x704214 // Darker brown drawer fronts
                });
                const drawer = new this.THREE.Mesh(drawerGeometry, drawerMaterial);
                drawer.position.set(80, drawerY, -109.5); // Forward of dresser
                drawer.userData.templateObject = true;
                this.scene.add(drawer);
                this.objects.push(drawer);
                
                // Drawer border lines
                const borderMaterial = new this.THREE.MeshStandardMaterial({ 
                    color: 0x4A2C2A // Very dark brown borders
                });
                
                // Top and bottom drawer lines
                for (let j = 0; j < 2; j++) {
                    const lineGeometry = new this.THREE.BoxGeometry(dresserWidth - 3, 0.3, 0.6);
                    const line = new this.THREE.Mesh(lineGeometry, borderMaterial);
                    line.position.set(80, drawerY + (j === 0 ? -3 : 3), -109.3);
                    line.userData.templateObject = true;
                    this.scene.add(line);
                    this.objects.push(line);
                }
                
                // Left and right drawer lines
                for (let j = 0; j < 2; j++) {
                    const lineGeometry = new this.THREE.BoxGeometry(0.3, drawerHeight, 0.6);
                    const line = new this.THREE.Mesh(lineGeometry, borderMaterial);
                    line.position.set(80 + (j === 0 ? -23 : 23), drawerY, -109.3);
                    line.userData.templateObject = true;
                    this.scene.add(line);
                    this.objects.push(line);
                }
                
                // Drawer handles (2 per drawer)
                for (let k = 0; k < 2; k++) {
                    const handleGeometry = new this.THREE.CylinderGeometry(0.5, 0.5, 3);
                    const handleMaterial = new this.THREE.MeshStandardMaterial({ 
                        color: 0xC0C0C0, // Silver handles
                        metalness: 0.8,
                        roughness: 0.2
                    });
                    const handle = new this.THREE.Mesh(handleGeometry, handleMaterial);
                    handle.position.set(80 + (k === 0 ? -10 : 10), drawerY, -108.5);
                    handle.rotation.z = Math.PI / 2; // Horizontal
                    handle.userData.templateObject = true;
                    this.scene.add(handle);
                    this.objects.push(handle);
                }
            }
            
            console.log('💎 Enhanced dresser with drawers, borders, and handles created');
        }

        createBedroomPosters() {
            console.log('🖼️ Creating bedroom posters with new GlobalPosterManager system...');
            
            try {
                // Use new simplified poster system
                this.createPostersWithGlobalManager();
            } catch (error) {
                console.error('❌ Error creating bedroom posters with new system:', error);
                console.log('🔄 Fallback: Creating legacy posters...');
                this.createLegacyPostersDirectly();
            }
        }

        /**
         * Create posters using the new GlobalPosterManager system
         */
        async createPostersWithGlobalManager() {
            console.log('🖼️ Creating Dazzle bedroom posters with GlobalPosterManager...');
            
            // Define poster configurations for Dazzle bedroom
            // NOTE: posterType will be auto-generated from position by SimplifiedPosterCreator
            const posterConfigs = [
                {
                    position: new this.THREE.Vector3(0, 50, -149), // CENTER of back wall
                    rotation: 0,
                    width: 80
                },
                {
                    position: new this.THREE.Vector3(-40, 50, 149), // LEFT side of front wall
                    rotation: Math.PI,
                    width: 80
                },
                {
                    position: new this.THREE.Vector3(-149, 50, 0), // CENTER of left wall
                    rotation: Math.PI / 2,
                    width: 80
                },
                {
                    position: new this.THREE.Vector3(149, 50, -50), // RIGHT wall
                    rotation: -Math.PI / 2,
                    width: 80
                }
            ];
            
            try {
                // Check if PosterSystemInitializer is available
                if (typeof PosterSystemInitializer !== 'undefined') {
                    console.log('🖼️ Using PosterSystemInitializer.createPostersForWorld...');
                    const posters = await PosterSystemInitializer.createPostersForWorld(
                        this.THREE, 
                        this.scene, 
                        this.objects, 
                        'dazzle', 
                        posterConfigs
                    );
                    console.log(`✅ Created ${posters.length} Dazzle posters with GlobalPosterManager`);
                } else if (typeof SimplifiedPosterCreator !== 'undefined') {
                    console.log('🖼️ Using SimplifiedPosterCreator directly...');
                    const creator = new SimplifiedPosterCreator(this.THREE, this.scene, this.objects);
                    const posters = creator.createWorldPosters('dazzle', posterConfigs);
                    console.log(`✅ Created ${posters.length} Dazzle posters with SimplifiedPosterCreator`);
                } else {
                    console.warn('⚠️ No poster creation system available, using fallback...');
                    this.createLegacyPostersDirectly();
                }
            } catch (error) {
                console.error('❌ Error with GlobalPosterManager poster creation:', error);
                this.createLegacyPostersDirectly();
            }
        }

        /**
         * Legacy poster creation method (fallback)
         */
        createLegacyPostersDirectly() {
            console.log('🔄 Using legacy poster creation system...');
            
            // Use SimplifiedPosterCreator with correct method signature
            if (typeof SimplifiedPosterCreator !== 'undefined') {
                console.log('🖼️ Creating dazzle posters with SimplifiedPosterCreator...');
                
                // Use the standard dazzle configuration from SimplifiedPosterCreator
                const posters = SimplifiedPosterCreator.quickSetup(this.THREE, this.scene, this.objects, 'dazzle');
                
                if (posters && posters.length > 0) {
                    console.log(`✅ Created ${posters.length} posters for dazzle world using quickSetup`);
                } else {
                    console.warn('⚠️ No posters created with quickSetup, trying manual creation...');
                    
                    // Manual creation as final fallback
                    const creator = new SimplifiedPosterCreator(this.THREE, this.scene, this.objects);
                    const configs = SimplifiedPosterCreator.getStandardConfigs('dazzle', this.THREE);
                    
                    if (configs && configs.length > 0) {
                        const manualPosters = creator.createWorldPosters('dazzle', configs);
                        console.log(`✅ Created ${manualPosters.length} posters manually for dazzle world`);
                    } else {
                        console.error('❌ No standard configs available for dazzle world');
                        this.createSimplePosters();
                    }
                }
            } else {
                console.warn('⚠️ SimplifiedPosterCreator not available, falling back to simple posters');
                this.createSimplePosters();
            }
        }

        createSimplePosters() {
            // Simple fallback poster creation with proper positions and 16:9 aspect ratio
            console.log('🎨 Creating simple fallback posters...');
            
            const posterConfigs = [
                { 
                    pos: new this.THREE.Vector3(0, 50, -149), // CENTER of back wall, center at Y=50 (wall mounted height)
                    rot: 0, 
                    text: '🦄 UNICORNS',
                    color: 0xFFB6C1 
                },
                { 
                    pos: new this.THREE.Vector3(-40, 50, 149), // LEFT side of front wall, center at Y=50 (wall mounted height)
                    rot: Math.PI, 
                    text: '🌈 RAINBOW',
                    color: 0xDDA0DD 
                },
                { 
                    pos: new this.THREE.Vector3(-149, 50, 0), // CENTER of left wall, center at Y=50 (wall mounted height)
                    rot: Math.PI / 2, 
                    text: '👑 PRINCESS',
                    color: 0xFFB6C1 
                },
                { 
                    pos: new this.THREE.Vector3(149, 50, -50), // RIGHT wall, moved 20 units left from window (was -30, now -50) 
                    rot: -Math.PI / 2, 
                    text: '🦋 BUTTERFLY',
                    color: 0xDDA0DD 
                }
            ];

            posterConfigs.forEach((config, index) => {
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
                    isWallMounted: true, // Additional flag for wall-mounted objects
                    posterType: config.text.toLowerCase().split(' ')[0] // Extract poster type from text
                };

                this.scene.add(poster);
                this.objects.push(poster);
                
                // Add to fileObjects for raycaster detection
                if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
                    window.app.stateManager.fileObjects.push(poster);
                    console.log('🖼️ Simple poster added to raycaster detection system');
                } else {
                    console.warn('⚠️ Could not add simple poster to raycaster system - stateManager not available');
                }
                
                console.log(`🖼️ Simple poster "${config.text}" created at (${config.pos.x}, ${config.pos.y}, ${config.pos.z})`);
            });

            console.log('🎀 Simple posters created as fallback with 16:9 aspect ratio');
            
            // Register simple posters with GlobalPosterManager
            if (typeof window !== 'undefined' && window.globalPosterManager) {
                // Notify GlobalPosterManager about created posters
                this.objects.forEach(obj => {
                    if (obj.userData && obj.userData.isPoster) {
                        window.globalPosterManager.registerPoster(obj, 'dazzle');
                    }
                });
                
                // Trigger poster restoration
                setTimeout(() => {
                    window.globalPosterManager.restoreWorldPosters('dazzle');
                }, 100);
            }
        }

        createSparkles() {
            const sparkleGeometry = new this.THREE.SphereGeometry(0.5, 8, 8);
            const sparkleMaterial = new this.THREE.MeshBasicMaterial({ 
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.8
            });

            for (let i = 0; i < 20; i++) {
                const sparkle = new this.THREE.Mesh(sparkleGeometry, sparkleMaterial);
                sparkle.position.set(
                    (Math.random() - 0.5) * 200,
                    Math.random() * 30 + 5,
                    (Math.random() - 0.5) * 200
                );
                sparkle.userData.isSparkle = true;
                sparkle.userData.templateObject = true;
                this.scene.add(sparkle);
                this.objects.push(sparkle);
                this.sparkles.push(sparkle);
            }
        }

        // EXACT COPY from GreenPlaneWorldTemplate - same behavior as requested
        applyPositionConstraints(object, newPosition, allObjects = []) {
            const constraints = this.getPositioningConstraints();
            
            // Apply world boundaries first
            let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            // Get object height for proper positioning - check userData first (for contact objects), then geometry parameters
            const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
            
            // Ensure objectHeight is a valid number
            const safeObjectHeight = isNaN(objectHeight) || objectHeight === null || objectHeight === undefined ? 1 : objectHeight;
            
            // Check if stacking is enabled and this position is intentional
            const stackingEnabled = window.app?.sortingManager?.stackingConfig?.enabled;
            const isStackedPosition = newPosition.y > (this.groundLevelY + safeObjectHeight / 2 + 0.1); // More than ground level + small tolerance
            
            let constrainedY;
            if (stackingEnabled && isStackedPosition) {
                // If stacking is enabled and this seems to be a stacked position, respect the Y coordinate
                constrainedY = newPosition.y;
                console.log(`Dazzle bedroom constraints for ${object.userData.fileName || 'unknown'}:`);
                console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
                console.log(`  Ground level Y: ${this.groundLevelY}`);
                console.log(`  Object height: ${objectHeight}`);
                console.log(`  Stacking enabled - respecting Y position: ${constrainedY}`);
            } else {
                // Normal ground positioning logic
                constrainedY = this.groundLevelY + safeObjectHeight / 2; // Position so object bottom sits on ground
                
                console.log(`Dazzle bedroom constraints for ${object.userData.fileName || 'unknown'}:`);
                console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
                console.log(`  Ground level Y: ${this.groundLevelY}`);
                console.log(`  Object height: ${safeObjectHeight}`);
                console.log(`  Base constrained Y: ${constrainedY}`);
            }
            
            // DAZZLE BEDROOM WORLD: Objects must be supported - check for objects below (same as green plane)
            if (constraints.requiresSupport && allObjects.length > 0 && !(stackingEnabled && isStackedPosition)) {
                // Only apply support logic if not using stacking system
                const otherObjects = allObjects.filter(obj => obj !== object);
                let supportObject = null;
                let maxSupportHeight = this.groundLevelY + safeObjectHeight / 2; // Ground level + object center height
                
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
                        maxSupportHeight = otherTop + safeObjectHeight / 2; // Object center on top of support
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

        cleanup() {
            super.cleanup();
            this.sparkles.forEach(sparkle => {
                if (sparkle.parent) sparkle.parent.remove(sparkle);
            });
            this.sparkles = [];
            this.posters.forEach(poster => {
                if (poster.parent) poster.parent.remove(poster);
            });
            this.posters = [];
        }
    }

    // ============================================================================
    // FOREST REALM WORLD TEMPLATE (Premium)
    // ============================================================================
    
    class ForestRealmWorldTemplate extends BaseWorldTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                ambientLightColor: 0x2F4F2F, // Dark green ambient
                ambientLightIntensity: 0.4,
                directionalLightColor: 0xFFFACD, // Warm sunlight
                directionalLightIntensity: 0.6,
                ...config
            });
            this.trees = [];
            this.treeTrunks = new Map();
        }

        getType() {
            return 'forest';
        }

        getHomeViewPosition() {
        return { x: 0, y: 10, z: 25 }; // Same as green plane for consistent camera views
    }

    getHomeViewTarget() {
        return { x: 0, y: 0, z: 10 }; // Same as green plane for consistent camera views

        applyCameraConstraints(controls) {
            controls.minDistance = 3.0;
            controls.maxDistance = 120.0;
        }

        // Forest realm supports vertical movement through tree trunk creation
        supportsVerticalMovement() {
            return true;
        }

        getPositioningConstraints() {
            return {
                requiresSupport: true, // Objects need support (ground or tree trunk)
                allowedStackingDirections: ['top', 'trunk'], // Special trunk stacking
                worldBoundaries: {
                    x: { min: -150, max: 150 },
                    y: { min: 0, max: 100 }, // Forest floor is Y=0, can go up to Y=100
                    z: { min: -150, max: 150 }
                }
            };
        }

        // FOREST REALM: Objects must be on or above XZ plane, with tree trunk support for elevated objects
        applyPositionConstraints(object, newPosition, allObjects = []) {
            const constraints = this.getPositioningConstraints();
            
            console.log(`Forest realm constraints for ${object.userData.fileName || 'unknown'}:`);
            console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
            console.log(`  World boundaries:`, constraints.worldBoundaries);
            
            // Apply X and Z boundary constraints
            let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            // Get object height for proper positioning
            const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
            
            // Ensure objectHeight is a valid number
            const safeObjectHeight = isNaN(objectHeight) || objectHeight === null || objectHeight === undefined ? 1 : objectHeight;
            
            // FOREST REALM RULE: Objects cannot go below ground level (Y=0)
            let constrainedY = Math.max(this.groundLevelY, newPosition.y); // Minimum Y is groundLevel (0)
            constrainedY = Math.min(constraints.worldBoundaries.y.max, constrainedY); // Maximum Y is 100
            
            // Check if stacking is enabled and this position is intentional
            const stackingEnabled = window.app?.sortingManager?.stackingConfig?.enabled;
            const isStackedPosition = constrainedY > (this.groundLevelY + safeObjectHeight / 2 + 0.1); // More than ground level + object center height + tolerance
            
            // FOREST REALM SUPPORT LOGIC
            if (constraints.requiresSupport && allObjects.length > 0 && !(stackingEnabled && isStackedPosition)) {
                const otherObjects = allObjects.filter(obj => obj !== object);
                let supportFound = false;
                let maxSupportHeight = this.groundLevelY + safeObjectHeight / 2; // Ground level + object center height
                
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
                } else if (constrainedY > this.groundLevelY + safeObjectHeight / 2) {
                    // Object is elevated but has no object support - provide tree trunk support
                    console.log(`  Object elevated to Y=${constrainedY}, providing magical tree trunk support`);
                    // Keep the elevated position - tree trunk will support it
                } else {
                    // Object is at or near ground level
                    constrainedY = this.groundLevelY + safeObjectHeight / 2; // Position on ground
                    console.log(`  Object positioned on ground at Y=${constrainedY}`);
                }
            } else if (stackingEnabled && isStackedPosition) {
                // Stacking system is handling this - respect the Y coordinate
                console.log(`  Stacking enabled - respecting Y position: ${constrainedY}`);
            } else {
                // Default positioning
                if (constrainedY <= this.groundLevelY + safeObjectHeight / 2) {
                    constrainedY = this.groundLevelY + safeObjectHeight / 2; // On ground
                    console.log(`  Default ground positioning at Y=${constrainedY}`);
                } else {
                    console.log(`  Elevated position maintained with tree trunk support at Y=${constrainedY}`);
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

        setupEnvironment() {
            console.log('🌲 Setting up Forest Realm world...');
            
            // Ground level for positioning
            this.groundLevelY = 0;
            
            // Enhanced forest floor with realistic dark texture
            this.createEnhancedForestFloor();
            
            // Create forest trees
            this.createForest();
            
            // Forest atmosphere - Reduced fog by 50% for better visibility of distant trees
            this.scene.fog = new this.THREE.Fog(0x2F4F2F, 100, 400);
            
            console.log('🌲 Forest Realm world setup complete');
        }

        createEnhancedForestFloor() {
            // Create canvas for forest floor texture
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Base forest green - lightened by 25% from #0A2A0A
            ctx.fillStyle = '#135A13'; // Lighter forest green
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add texture elements with increased visibility (dirt patches, moss, fallen leaves, twigs)
            for (let i = 0; i < 200; i++) { // Increased from 150 to 200 for more visibility
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 12 + 3; // Increased size for better visibility
                
                // Dirt patches - more prominent
                if (Math.random() > 0.6) { // Increased frequency from 0.7 to 0.6
                    ctx.fillStyle = `rgba(139, 101, 67, ${Math.random() * 0.8 + 0.4})`; // Brighter browns
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Moss patches - more visible
                if (Math.random() > 0.75) { // Increased frequency from 0.8 to 0.75
                    ctx.fillStyle = `rgba(85, 189, 85, ${Math.random() * 0.6 + 0.3})`; // Brighter moss green
                    ctx.beginPath();
                    ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Fallen leaves - more colorful and visible
                if (Math.random() > 0.8) { // Increased frequency from 0.85 to 0.8
                    const leafColors = ['#D2691E', '#CD853F', '#90EE90', '#DAA520', '#B8860B']; // Brighter leaf colors
                    ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)];
                    ctx.beginPath();
                    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2); // Slightly larger leaves
                    ctx.fill();
                }
                
                // Small twigs - more visible
                if (Math.random() > 0.85) { // Increased frequency from 0.9 to 0.85
                    ctx.strokeStyle = `rgba(139, 101, 67, ${Math.random() * 0.7 + 0.5})`; // More opaque twigs
                    ctx.lineWidth = 2; // Thicker lines
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + Math.random() * 30 - 15, y + Math.random() * 30 - 15); // Longer twigs
                    ctx.stroke();
                }
            }
            
            // Create texture from canvas
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.wrapS = this.THREE.RepeatWrapping;
            texture.wrapT = this.THREE.RepeatWrapping;
            texture.repeat.set(4, 4);
            
            // Create floor geometry and material
            const floorGeometry = new this.THREE.PlaneGeometry(300, 300);
            const floorMaterial = new this.THREE.MeshStandardMaterial({ 
                map: texture,
                color: 0x135A13, // Lighter forest green base (25% lighter)
                metalness: 0.05, // Reduced metalness for more natural look
                roughness: 0.9, // Slightly reduced roughness
                transparent: false
            });
            
            const floor = new this.THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -0.01;
            floor.receiveShadow = true;
            floor.userData.templateObject = true;
            this.scene.add(floor);
            this.objects.push(floor);
            
            console.log('🌲 Enhanced forest floor created with lighter, more visible texture');
        }

        createForest() {
            const treePositions = [
                { x: -100, z: -80 },
                { x: 120, z: -60 },
                { x: -80, z: 90 },
                { x: 90, z: 100 },
                { x: 0, z: -120 },
                { x: -120, z: 40 },
                { x: 70, z: -100 },
                { x: -40, z: -40 },
                // Added 2 additional trees in the area just beyond file zones
                { x: -60, z: -110 },
                { x: 110, z: 80 }
            ];

            treePositions.forEach((pos, index) => {
                this.createTree(pos.x, pos.z, index);
            });
        }

        createTree(x, z, index) {
            // Tree trunk
            const trunkGeometry = new this.THREE.CylinderGeometry(3, 4, 30, 8);
            const trunkMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0x8B4513 // Brown trunk
            });
            const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(x, 15, z);
            trunk.castShadow = true;
            trunk.userData.templateObject = true;
            trunk.userData.isTreeTrunk = true;
            trunk.userData.treeId = index;
            this.scene.add(trunk);
            this.objects.push(trunk);
            this.trees.push(trunk);

            // Tree crown - 50% brighter for better visibility
            const crownGeometry = new this.THREE.SphereGeometry(15, 8, 6);
            const crownMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0x45CC45 // Brighter green leaves (50% brighter than 0x228B22)
            });
            const crown = new this.THREE.Mesh(crownGeometry, crownMaterial);
            crown.position.set(x, 35, z);
            crown.castShadow = true;
            crown.userData.templateObject = true;
            this.scene.add(crown);
            this.objects.push(crown);
            this.trees.push(crown);
        }

        cleanup() {
            super.cleanup();
            this.trees.forEach(tree => {
                if (tree.parent) tree.parent.remove(tree);
            });
            this.trees = [];
            this.treeTrunks.clear();
        }
    }

    // ============================================================================
    // PREMIUM WORLD THEMES MANAGER CLASS
    // ============================================================================
    
    class PremiumWorldThemes {
        constructor() {
            this.themes = new Map();
            this.themes.set('dazzle', {
                id: 'dazzle',
                name: 'Dazzle Bedroom',
                isPremium: true,
                worldTemplate: DazzleBedroomWorldTemplate
            });
            this.themes.set('forest', {
                id: 'forest', 
                name: 'Forest Realm',
                isPremium: true,
                worldTemplate: ForestRealmWorldTemplate
            });
            this.themes.set('cave', {
                id: 'cave',
                name: 'Cave Explorer',
                isPremium: true,
                worldTemplate: CaveExplorerWorldTemplate
            });
            this.themes.set('christmas', {
                id: 'christmas',
                name: 'ChristmasLand',
                isPremium: true,
                worldTemplate: ChristmasLandWorldTemplate
            });
        }
        
        /**
         * Check if a theme is premium
         */
        isPremiumTheme(themeId) {
            const theme = this.themes.get(themeId);
            return theme && theme.isPremium;
        }
        
        /**
         * Get available premium themes
         */
        getAvailableThemes() {
            return Array.from(this.themes.values());
        }
        
        /**
         * Apply premium theme to the world
         */
        applyPremiumTheme(themeId, app) {
            const theme = this.themes.get(themeId);
            if (!theme) {
                console.warn(`🎨 Premium theme not found: ${themeId}`);
                return false;
            }
            
            console.log(`🎨 Applying premium theme: ${theme.name}`);
            
            try {
                // Switch to the premium world template through the main application
                if (app && app.switchWorldTemplate) {
                    app.switchWorldTemplate(themeId);
                    return true;
                } else {
                    console.error('🎨 Main application or switchWorldTemplate method not available');
                    return false;
                }
                
            } catch (error) {
                console.error(`🎨 Error applying premium theme ${themeId}:`, error);
                return false;
            }
        }
        
        /**
         * Cleanup premium theme effects
         */
        cleanup(app) {
            console.log('🎨 Cleaning up premium theme effects');
            // Premium themes handle their own cleanup in their cleanup() methods
        }
    }

    // ============================================================================
    // GLOBAL INTEGRATION
    // ============================================================================
    
    // Make world template classes available globally for the main application
    window.DazzleBedroomWorldTemplate = DazzleBedroomWorldTemplate;
    window.ForestRealmWorldTemplate = ForestRealmWorldTemplate;
    
    // Make premium world themes manager available globally
    window.PremiumWorldThemes = PremiumWorldThemes;
    
    console.log('🎨 Premium World Template classes loaded successfully!');
})();
