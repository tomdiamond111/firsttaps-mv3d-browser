// ============================================================================
// THREE.JS FILE VIEWER - PREMIUM BUNDLE
// Generated: 2026-03-06 20:43:22
// Development Mode: False
// Bundle Type: Premium Features
// ============================================================================

console.log("Loading Three.js File Viewer - PREMIUM BUNDLE...");

// ============================================================================
// MODULE: modules\premium\posterCreator.js
// ============================================================================
/**
 * Poster Creator Module
 * Creates various poster types for bedroom environments
 */

class PosterCreator {
    constructor(THREE, scene, objects) {
        this.THREE = THREE;
        this.scene = scene;
        this.objects = objects;
    }

    /**
     * Create canvas-based poster texture
     */
    createPosterTexture(width, height, backgroundColor, textColor, title, subtitle = '') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Add sparkle effect
        this.addSparkles(ctx, width, height);

        // Title text
        ctx.fillStyle = textColor;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, width/2, height/3);

        // Subtitle if provided
        if (subtitle) {
            ctx.font = '32px Arial';
            ctx.fillText(subtitle, width/2, height/2);
        }

        // Add decorative border
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, width-20, height-20);

        return new this.THREE.CanvasTexture(canvas);
    }

    /**
     * Add sparkle effects to canvas
     */
    addSparkles(ctx, width, height) {
        ctx.fillStyle = '#FFD700'; // Gold sparkles
        const sparkleCount = 50;
        
        for (let i = 0; i < sparkleCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 3 + 1;
            
            // Draw star shape
            this.drawStar(ctx, x, y, size);
        }
    }

    /**
     * Draw a star shape
     */
    drawStar(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(0, -size);
        for (let i = 0; i < 5; i++) {
            ctx.rotate(Math.PI / 5);
            ctx.lineTo(0, -size * 0.5);
            ctx.rotate(Math.PI / 5);
            ctx.lineTo(0, -size);
        }
        ctx.fill();
        ctx.restore();
    }

    /**
     * Create a poster mesh with given texture and position
     */
    createPosterMesh(texture, width, height, position, rotation = 0) {
        // Use 16:9 aspect ratio like YouTube thumbnails for proper display
        const aspectRatio = 16/9;
        const posterWidth = width;
        const posterHeight = posterWidth / aspectRatio;  // Maintain 16:9 ratio
        
        const geometry = new this.THREE.PlaneGeometry(posterWidth, posterHeight);
        const material = new this.THREE.MeshStandardMaterial({
            map: texture,
            transparent: false
        });

        const poster = new this.THREE.Mesh(geometry, material);
        poster.position.copy(position);
        poster.rotation.y = rotation;
        
        poster.userData = {
            templateObject: true,
            isPoster: true,
            roomElement: true,
            type: 'poster', // Required for raycaster detection
            interactable: true,
            preservePosition: true, // Prevent gravity from affecting posters
            isWallMounted: true, // Additional flag for wall-mounted objects
            posterType: 'custom' // Will be overridden by specific poster types
        };

        this.scene.add(poster);
        this.objects.push(poster);
        
        // Add to fileObjects for raycaster detection
        if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
            window.app.stateManager.fileObjects.push(poster);
            console.log('🖼️ Poster added to raycaster detection system');
        } else {
            console.warn('⚠️ Could not add poster to raycaster system - stateManager not available');
        }
        
        console.log(`🖼️ Created poster ${posterWidth}x${posterHeight} (16:9) at (${position.x}, ${position.y}, ${position.z})`);
        return poster;
    }

    /**
     * Create unicorn poster - CENTER of back wall (behind bed)
     */
    createUnicornPoster() {
        const texture = this.createPosterTexture(
            512, 512,
            '#FFB6C1', // Light pink background
            '#FF1493', // Deep pink text
            '🦄 UNICORNS 🦄',
            'Are Magical!'
        );

        const poster = this.createPosterMesh(
            texture,
            80, 0, // Width will be 80 (2x larger), height calculated for 16:9 ratio
            new this.THREE.Vector3(0, 50, -149), // CENTER of back wall, center at Y=50 (wall mounted height)
            0 // Face forward into room
        );
        
        poster.userData.posterType = 'unicorn';
        return poster;
    }

    /**
     * Create rainbow poster - LEFT side of front wall (next to door)
     */
    createRainbowPoster() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 512, 512);

        // Draw rainbow stripes
        const colors = ['#FF0000', '#FF8C00', '#FFD700', '#00FF00', '#0000FF', '#8A2BE2'];
        const stripeHeight = 60;
        const startY = 150;

        colors.forEach((color, index) => {
            ctx.fillStyle = color;
            ctx.fillRect(50, startY + (index * stripeHeight), 412, stripeHeight);
        });

        // Add text
        ctx.fillStyle = '#FF1493';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🌈 RAINBOW 🌈', 256, 100);
        ctx.fillText('DREAMS', 256, 450);

        // Add sparkles
        this.addSparkles(ctx, 512, 512);

        const texture = new this.THREE.CanvasTexture(canvas);
        
        const poster = this.createPosterMesh(
            texture,
            80, 0, // Width will be 80 (2x larger), height calculated for 16:9 ratio
            new this.THREE.Vector3(-40, 50, 149), // LEFT side of front wall, center at Y=50 (wall mounted height)
            Math.PI // Face backward into room
        );
        
        poster.userData.posterType = 'rainbow';
        return poster;
    }

    /**
     * Create princess poster - CENTER of left wall (dresser wall)
     */
    createPrincessPoster() {
        const texture = this.createPosterTexture(
            512, 512,
            '#DDA0DD', // Plum background
            '#FF69B4', // Hot pink text
            '👑 PRINCESS 👑',
            'Power!'
        );

        const poster = this.createPosterMesh(
            texture,
            80, 0, // Width will be 80 (2x larger), height calculated for 16:9 ratio
            new this.THREE.Vector3(-149, 50, 0), // CENTER of left wall, center at Y=50 (wall mounted height)
            Math.PI / 2 // Face right into room
        );
        
        poster.userData.posterType = 'princess';
        return poster;
    }

    /**
     * Create butterfly poster - CENTER of right wall (opposite window)
     */
    createButterflyPoster() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#FFE4E1');
        gradient.addColorStop(1, '#FFB6C1');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // Add butterfly emoji and text
        ctx.fillStyle = '#FF1493';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🦋 BUTTERFLY 🦋', 256, 200);
        ctx.font = '36px Arial';
        ctx.fillText('Garden', 256, 350);

        // Add sparkles
        this.addSparkles(ctx, 512, 512);

        const texture = new this.THREE.CanvasTexture(canvas);
        
        const poster = this.createPosterMesh(
            texture,
            40, 0, // Width will be 40, height calculated for 16:9 ratio  
            new this.THREE.Vector3(149, 50, -50), // RIGHT wall, moved 20 units left from window (was -30, now -50)
            -Math.PI / 2 // Face left into room
        );
        
        poster.userData.posterType = 'butterfly';
        return poster;
    }

    /**
     * Create all bedroom posters
     */
    createAllPosters() {
        console.log('🖼️ Creating bedroom posters...');
        
        const posters = [
            this.createUnicornPoster(),
            this.createRainbowPoster(),
            this.createPrincessPoster(),
            this.createButterflyPoster()
        ];

        console.log(`✨ Created ${posters.length} sparkly posters!`);
        return posters;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PosterCreator;
} else if (typeof window !== 'undefined') {
    window.PosterCreator = PosterCreator;
}


// ============================================================================
// MODULE: modules\premium\bedroomDecorations.js
// ============================================================================
/**
 * Bedroom Decorations Module
 * Handles all decorative elements for the bedroom theme
 */

class BedroomDecorations {
    constructor(THREE, scene, objects) {
        this.THREE = THREE;
        this.scene = scene;
        this.objects = objects;
        
        // Initialize poster creator
        this.posterCreator = new PosterCreator(THREE, scene, objects);
        
        // Initialize poster interaction system using GlobalPosterManager
        this.posterManager = null;
        if (typeof window.GlobalPosterManager !== 'undefined') {
            this.posterManager = window.GlobalPosterManager.getInstance();
            
            // Ensure the poster manager knows this is the dazzle/bedroom world
            if (this.posterManager.updateWorldType) {
                this.posterManager.updateWorldType('dazzle');
            }
            
            console.log('🖼️ GlobalPosterManager initialized for dazzle bedroom world');
        } else {
            console.log('⚠️ GlobalPosterManager not available');
        }
    }

    /**
     * Add all decorative elements to the bedroom
     */
    addAllDecorations() {
        console.log('🎀 Adding bedroom decorations...');
        
        // Phase 2 & 3: Add posters
        this.addPosters();
        
        // Future phases can be added here:
        // this.addRugs();
        // this.addCurtains();
        // this.addToys();
        // this.addLighting();
        
        console.log('✨ All bedroom decorations added!');
    }

    /**
     * Phase 2 & 3: Add posters to walls
     */
    addPosters() {
        console.log('🖼️ Phase 2 & 3: Adding posters...');
        
        try {
            const posters = this.posterCreator.createAllPosters();
            console.log(`🎨 Successfully created ${posters.length} posters`);
            
            // Set up double-tap interaction for each poster
            if (this.posterInteraction) {
                posters.forEach(poster => {
                    // Preserve existing userData and add interaction properties
                    poster.userData = {
                        ...poster.userData,
                        hasDoubleTabInteraction: true,
                        interactionHandler: this.posterInteraction,
                        type: 'poster', // Ensure type is preserved
                        interactable: true // Ensure interactable is preserved
                    };
                });
                console.log('🖱️ Double-tap interactions enabled for all posters');
                
                // Restore poster URLs after a brief delay to ensure all posters are fully created
                // and persistence channel is ready
                setTimeout(() => {
                    this.posterInteraction.restorePosterURLs();
                }, 500); // Increased delay to ensure persistence channel is fully initialized
            } else {
                console.log('⚠️ Poster interaction system not available for restoration');
            }
            
            return posters;
        } catch (error) {
            console.error('❌ Error creating posters:', error);
            return [];
        }
    }

    /**
     * Future Phase: Add rugs (placeholder)
     */
    addRugs() {
        console.log('🏠 Future: Adding rugs...');
        // Implementation for future phase
    }

    /**
     * Future Phase: Add curtains (placeholder)
     */
    addCurtains() {
        console.log('🪟 Future: Adding curtains...');
        // Implementation for future phase
    }

    /**
     * Future Phase: Add toys (placeholder)
     */
    addToys() {
        console.log('🧸 Future: Adding toys...');
        // Implementation for future phase
    }

    /**
     * Future Phase: Add enhanced lighting (placeholder)
     */
    addLighting() {
        console.log('💡 Future: Adding enhanced lighting...');
        // Implementation for future phase
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BedroomDecorations;
} else if (typeof window !== 'undefined') {
    window.BedroomDecorations = BedroomDecorations;
}


// ============================================================================
// MODULE: modules\premium\christmasDecorations.js
// ============================================================================
/**
 * Christmas Decorations Module
 * Handles all decorative elements for the ChristmasLand world
 * Creates Christmas tree, fireplace, snowman, Santa's house, and North Pole
 */

class ChristmasDecorations {
    constructor(THREE, scene, objects) {
        this.THREE = THREE;
        this.scene = scene;
        this.objects = objects;
        
        console.log('🎄 Christmas decorations system initialized');
    }

    /**
     * Add all Christmas decorative elements
     */
    addAllDecorations() {
        console.log('🎄 Adding all Christmas decorations...');
        
        this.createChristmasTree();
        this.createFireplace();
        this.createSnowman();
        this.createSantasHouse();
        this.createNorthPole();
        this.addChristmasLights();
        this.addChristmasAmbience();
        
        console.log('🎄 Christmas decorations complete');
    }

    /**
     * Create large Christmas tree in corner
     */
    createChristmasTree() {
        console.log('🎄 Creating Christmas tree...');
        
        const treePosition = { x: -80, z: -80 }; // Back left corner
        
        // Create tree trunk
        const trunkGeometry = new this.THREE.CylinderGeometry(3, 4, 8, 8);
        const trunkMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown
            roughness: 0.8,
        });
        
        const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(treePosition.x, 4, treePosition.z);
        
        trunk.userData = {
            templateObject: true,
            christmasDecoration: true,
            christmasTree: true,
            treePart: 'trunk',
            preservePosition: true,
            type: 'christmas_tree_trunk'
        };
        
        this.scene.add(trunk);
        this.objects.push(trunk);
        
        // Create tree layers (3 layers getting smaller)
        const layerHeights = [15, 12, 8];
        const layerRadii = [12, 9, 6];
        let currentY = 8;
        
        layerHeights.forEach((height, index) => {
            const layerGeometry = new this.THREE.ConeGeometry(layerRadii[index], height, 8);
            const layerMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x0F5132, // Dark green
                roughness: 0.7,
            });
            
            const layer = new this.THREE.Mesh(layerGeometry, layerMaterial);
            layer.position.set(treePosition.x, currentY + height / 2, treePosition.z);
            
            layer.userData = {
                templateObject: true,
                christmasDecoration: true,
                christmasTree: true,
                treePart: `layer_${index}`,
                preservePosition: true,
                type: 'christmas_tree_layer'
            };
            
            this.scene.add(layer);
            this.objects.push(layer);
            
            currentY += height * 0.7; // Overlap layers slightly
        });
        
        // Add tree star on top
        this.createTreeStar(treePosition.x, currentY + 3, treePosition.z);
        
        // Add ornaments
        this.addTreeOrnaments(treePosition);
        
        console.log('🎄 Christmas tree created');
    }

    /**
     * Create star on top of Christmas tree
     */
    createTreeStar(x, y, z) {
        const starGeometry = new this.THREE.ConeGeometry(1.5, 3, 5);
        const starMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFD700, // Gold
            emissive: 0xFFD700,
            emissiveIntensity: 0.3,
        });
        
        const star = new this.THREE.Mesh(starGeometry, starMaterial);
        star.position.set(x, y, z);
        
        star.userData = {
            templateObject: true,
            christmasDecoration: true,
            christmasTree: true,
            treePart: 'star',
            preservePosition: true,
            type: 'christmas_tree_star'
        };
        
        this.scene.add(star);
        this.objects.push(star);
    }

    /**
     * Add ornaments to Christmas tree
     */
    addTreeOrnaments(treePosition) {
        const ornamentPositions = [
            // Layer 1 ornaments
            { x: treePosition.x - 8, y: 12, z: treePosition.z + 3, color: 0xFF0000 }, // Red
            { x: treePosition.x + 5, y: 14, z: treePosition.z - 6, color: 0x0000FF }, // Blue
            { x: treePosition.x - 3, y: 16, z: treePosition.z + 8, color: 0xFFD700 }, // Gold
            { x: treePosition.x + 7, y: 10, z: treePosition.z + 4, color: 0xC0C0C0 }, // Silver
            
            // Layer 2 ornaments
            { x: treePosition.x - 5, y: 22, z: treePosition.z + 2, color: 0xFF0000 },
            { x: treePosition.x + 4, y: 24, z: treePosition.z - 3, color: 0x0000FF },
            { x: treePosition.x - 2, y: 20, z: treePosition.z + 5, color: 0xFFD700 },
            
            // Layer 3 ornaments
            { x: treePosition.x - 2, y: 30, z: treePosition.z + 1, color: 0xC0C0C0 },
            { x: treePosition.x + 3, y: 32, z: treePosition.z - 2, color: 0xFF0000 },
        ];

        ornamentPositions.forEach((ornament, index) => {
            const geometry = new this.THREE.SphereGeometry(0.8, 8, 6);
            const material = new this.THREE.MeshStandardMaterial({
                color: ornament.color,
                metalness: 0.8,
                roughness: 0.2,
            });
            
            const ornamentMesh = new this.THREE.Mesh(geometry, material);
            ornamentMesh.position.set(ornament.x, ornament.y, ornament.z);
            
            ornamentMesh.userData = {
                templateObject: true,
                christmasDecoration: true,
                christmasTree: true,
                treePart: 'ornament',
                ornamentId: index,
                preservePosition: true,
                type: 'christmas_ornament'
            };
            
            this.scene.add(ornamentMesh);
            this.objects.push(ornamentMesh);
        });
    }

    /**
     * Create fireplace in middle of wall
     */
    createFireplace() {
        console.log('🔥 Creating fireplace...');
        
        const fireplacePosition = { x: 0, z: -149 }; // Center of back wall
        
        // Fireplace base
        const baseGeometry = new this.THREE.BoxGeometry(25, 15, 8);
        const baseMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown brick
            roughness: 0.8,
        });
        
        const base = new this.THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(fireplacePosition.x, 7.5, fireplacePosition.z);
        
        base.userData = {
            templateObject: true,
            christmasDecoration: true,
            fireplace: true,
            fireplacepart: 'base',
            preservePosition: true,
            type: 'fireplace_base'
        };
        
        this.scene.add(base);
        this.objects.push(base);
        
        // Fireplace opening
        const openingGeometry = new this.THREE.BoxGeometry(18, 10, 5);
        const openingMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x000000, // Black interior
        });
        
        const opening = new this.THREE.Mesh(openingGeometry, openingMaterial);
        opening.position.set(fireplacePosition.x, 10, fireplacePosition.z - 1);
        
        opening.userData = {
            templateObject: true,
            christmasDecoration: true,
            fireplace: true,
            fireplacepart: 'opening',
            preservePosition: true,
            type: 'fireplace_opening'
        };
        
        this.scene.add(opening);
        this.objects.push(opening);
        
        // Add fire effect
        this.createFireEffect(fireplacePosition.x, 8, fireplacePosition.z - 2);
        
        // Add mantle
        this.createFireplaceMantle(fireplacePosition);
        
        console.log('🔥 Fireplace created');
    }

    /**
     * Create fire effect in fireplace
     */
    createFireEffect(x, y, z) {
        // Simple fire effect using orange/red spheres
        const firePositions = [
            { x: x - 3, y: y, z: z, scale: 1.2 },
            { x: x + 2, y: y + 1, z: z, scale: 0.8 },
            { x: x, y: y + 2, z: z, scale: 1.0 },
            { x: x - 1, y: y + 1.5, z: z, scale: 0.6 },
        ];

        firePositions.forEach((fire, index) => {
            const geometry = new this.THREE.SphereGeometry(fire.scale, 6, 4);
            const material = new this.THREE.MeshBasicMaterial({
                color: index % 2 === 0 ? 0xFF4500 : 0xFF6347, // Orange/red
                transparent: true,
                opacity: 0.8,
            });
            
            const flame = new this.THREE.Mesh(geometry, material);
            flame.position.set(fire.x, fire.y, fire.z);
            
            flame.userData = {
                templateObject: true,
                christmasDecoration: true,
                fireplace: true,
                fireplacepart: 'fire',
                preservePosition: true,
                type: 'fireplace_fire'
            };
            
            this.scene.add(flame);
            this.objects.push(flame);
        });
        
        // Add fire light
        const fireLight = new this.THREE.PointLight(0xFF4500, 1, 30);
        fireLight.position.set(x, y + 2, z);
        
        fireLight.userData = {
            templateObject: true,
            christmasDecoration: true,
            fireplace: true,
            fireplacepart: 'light',
            type: 'fireplace_light'
        };
        
        this.scene.add(fireLight);
    }

    /**
     * Create fireplace mantle
     */
    createFireplaceMantle(fireplacePosition) {
        const mantleGeometry = new this.THREE.BoxGeometry(30, 2, 10);
        const mantleMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.6,
        });
        
        const mantle = new this.THREE.Mesh(mantleGeometry, mantleMaterial);
        mantle.position.set(fireplacePosition.x, 18, fireplacePosition.z);
        
        mantle.userData = {
            templateObject: true,
            christmasDecoration: true,
            fireplace: true,
            fireplacepart: 'mantle',
            preservePosition: true,
            type: 'fireplace_mantle'
        };
        
        this.scene.add(mantle);
        this.objects.push(mantle);
    }

    /**
     * Create snowman in center of room
     */
    createSnowman() {
        console.log('⛄ Creating snowman...');
        
        const snowmanPosition = { x: 0, z: 20 }; // Center of room, towards front
        
        // Bottom snowball
        const bottomGeometry = new this.THREE.SphereGeometry(8, 12, 8);
        const snowMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFFAFA, // Snow white
            roughness: 0.8,
        });
        
        const bottom = new this.THREE.Mesh(bottomGeometry, snowMaterial);
        bottom.position.set(snowmanPosition.x, 8, snowmanPosition.z);
        
        bottom.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'bottom',
            preservePosition: true,
            type: 'snowman_bottom'
        };
        
        this.scene.add(bottom);
        this.objects.push(bottom);
        
        // Middle snowball
        const middleGeometry = new this.THREE.SphereGeometry(6, 12, 8);
        const middle = new this.THREE.Mesh(middleGeometry, snowMaterial);
        middle.position.set(snowmanPosition.x, 20, snowmanPosition.z);
        
        middle.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'middle',
            preservePosition: true,
            type: 'snowman_middle'
        };
        
        this.scene.add(middle);
        this.objects.push(middle);
        
        // Head snowball
        const headGeometry = new this.THREE.SphereGeometry(4, 12, 8);
        const head = new this.THREE.Mesh(headGeometry, snowMaterial);
        head.position.set(snowmanPosition.x, 30, snowmanPosition.z);
        
        head.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'head',
            preservePosition: true,
            type: 'snowman_head'
        };
        
        this.scene.add(head);
        this.objects.push(head);
        
        // Add snowman features
        this.addSnowmanFeatures(snowmanPosition);
        
        console.log('⛄ Snowman created');
    }

    /**
     * Add features to snowman (carrot nose, coal eyes, stick arms)
     */
    addSnowmanFeatures(snowmanPosition) {
        // Carrot nose
        const noseGeometry = new this.THREE.ConeGeometry(0.5, 3, 6);
        const noseMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFF8C00, // Orange
        });
        
        const nose = new this.THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(snowmanPosition.x, 30, snowmanPosition.z + 4);
        nose.rotation.x = Math.PI / 2;
        
        nose.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'nose',
            preservePosition: true,
            type: 'snowman_nose'
        };
        
        this.scene.add(nose);
        this.objects.push(nose);
        
        // Coal eyes
        const eyeGeometry = new this.THREE.SphereGeometry(0.5, 6, 4);
        const eyeMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x000000, // Black
        });
        
        // Left eye
        const leftEye = new this.THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(snowmanPosition.x - 1.5, 31, snowmanPosition.z + 3.5);
        leftEye.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'eye_left',
            preservePosition: true,
            type: 'snowman_eye'
        };
        this.scene.add(leftEye);
        this.objects.push(leftEye);
        
        // Right eye
        const rightEye = new this.THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(snowmanPosition.x + 1.5, 31, snowmanPosition.z + 3.5);
        rightEye.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'eye_right',
            preservePosition: true,
            type: 'snowman_eye'
        };
        this.scene.add(rightEye);
        this.objects.push(rightEye);
        
        // Stick arms
        const armGeometry = new this.THREE.CylinderGeometry(0.2, 0.2, 8, 6);
        const armMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown
        });
        
        // Left arm
        const leftArm = new this.THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(snowmanPosition.x - 8, 20, snowmanPosition.z);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'arm_left',
            preservePosition: true,
            type: 'snowman_arm'
        };
        this.scene.add(leftArm);
        this.objects.push(leftArm);
        
        // Right arm
        const rightArm = new this.THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(snowmanPosition.x + 8, 20, snowmanPosition.z);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'arm_right',
            preservePosition: true,
            type: 'snowman_arm'
        };
        this.scene.add(rightArm);
        this.objects.push(rightArm);
    }

    /**
     * Create Santa's house in corner
     */
    createSantasHouse() {
        console.log('🏠 Creating Santa\'s house...');
        
        const housePosition = { x: 80, z: 80 }; // Front right corner
        
        // House base
        const baseGeometry = new this.THREE.BoxGeometry(20, 15, 20);
        const baseMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown wood
            roughness: 0.8,
        });
        
        const base = new this.THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(housePosition.x, 7.5, housePosition.z);
        
        base.userData = {
            templateObject: true,
            christmasDecoration: true,
            santasHouse: true,
            housePart: 'base',
            preservePosition: true,
            type: 'santas_house_base'
        };
        
        this.scene.add(base);
        this.objects.push(base);
        
        // Snow-covered roof
        const roofGeometry = new this.THREE.ConeGeometry(16, 10, 4);
        const roofMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFFAFA, // White snow
            roughness: 0.7,
        });
        
        const roof = new this.THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(housePosition.x, 20, housePosition.z);
        roof.rotation.y = Math.PI / 4; // Diamond shape
        
        roof.userData = {
            templateObject: true,
            christmasDecoration: true,
            santasHouse: true,
            housePart: 'roof',
            preservePosition: true,
            type: 'santas_house_roof'
        };
        
        this.scene.add(roof);
        this.objects.push(roof);
        
        // Add house details
        this.addHouseDetails(housePosition);
        
        console.log('🏠 Santa\'s house created');
    }

    /**
     * Add details to Santa's house
     */
    addHouseDetails(housePosition) {
        // Door
        const doorGeometry = new this.THREE.BoxGeometry(4, 8, 0.5);
        const doorMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x654321, // Dark brown
        });
        
        const door = new this.THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(housePosition.x, 4, housePosition.z + 10);
        
        door.userData = {
            templateObject: true,
            christmasDecoration: true,
            santasHouse: true,
            housePart: 'door',
            preservePosition: true,
            type: 'santas_house_door'
        };
        
        this.scene.add(door);
        this.objects.push(door);
        
        // Windows
        const windowGeometry = new this.THREE.BoxGeometry(3, 3, 0.3);
        const windowMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x87CEEB, // Light blue
            transparent: true,
            opacity: 0.8,
        });
        
        // Left window
        const leftWindow = new this.THREE.Mesh(windowGeometry, windowMaterial);
        leftWindow.position.set(housePosition.x - 8, 10, housePosition.z + 10);
        leftWindow.userData = {
            templateObject: true,
            christmasDecoration: true,
            santasHouse: true,
            housePart: 'window',
            preservePosition: true,
            type: 'santas_house_window'
        };
        this.scene.add(leftWindow);
        this.objects.push(leftWindow);
        
        // Right window
        const rightWindow = new this.THREE.Mesh(windowGeometry, windowMaterial);
        rightWindow.position.set(housePosition.x + 8, 10, housePosition.z + 10);
        rightWindow.userData = {
            templateObject: true,
            christmasDecoration: true,
            santasHouse: true,
            housePart: 'window',
            preservePosition: true,
            type: 'santas_house_window'
        };
        this.scene.add(rightWindow);
        this.objects.push(rightWindow);
    }

    /**
     * Create North Pole next to Santa's house
     */
    createNorthPole() {
        console.log('🎯 Creating North Pole...');
        
        const polePosition = { x: 100, z: 60 }; // Next to Santa's house
        
        // Pole
        const poleGeometry = new this.THREE.CylinderGeometry(1, 1, 25, 8);
        const poleMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFFFFF, // White
        });
        
        const pole = new this.THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(polePosition.x, 12.5, polePosition.z);
        
        pole.userData = {
            templateObject: true,
            christmasDecoration: true,
            northPole: true,
            polePart: 'pole',
            preservePosition: true,
            type: 'north_pole_pole'
        };
        
        this.scene.add(pole);
        this.objects.push(pole);
        
        // Red stripes
        for (let i = 0; i < 8; i++) {
            const stripeGeometry = new this.THREE.RingGeometry(1, 1.1, 8);
            const stripeMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xFF0000, // Red
            });
            
            const stripe = new this.THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.position.set(polePosition.x, 2 + (i * 3), polePosition.z);
            stripe.rotation.x = Math.PI / 2;
            
            stripe.userData = {
                templateObject: true,
                christmasDecoration: true,
                northPole: true,
                polePart: 'stripe',
                preservePosition: true,
                type: 'north_pole_stripe'
            };
            
            this.scene.add(stripe);
            this.objects.push(stripe);
        }
        
        // Sign
        const signGeometry = new this.THREE.BoxGeometry(8, 4, 0.5);
        const signMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFFFFF, // White
        });
        
        const sign = new this.THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(polePosition.x, 27, polePosition.z);
        
        sign.userData = {
            templateObject: true,
            christmasDecoration: true,
            northPole: true,
            polePart: 'sign',
            preservePosition: true,
            type: 'north_pole_sign'
        };
        
        this.scene.add(sign);
        this.objects.push(sign);
        
        console.log('🎯 North Pole created');
    }

    /**
     * Add Christmas lights throughout the scene
     */
    addChristmasLights() {
        console.log('💡 Adding Christmas lights...');
        
        // String lights around the room perimeter
        const lightPositions = [
            // Around ceiling perimeter
            { x: -100, y: 35, z: -100 }, { x: -50, y: 35, z: -100 }, { x: 0, y: 35, z: -100 }, { x: 50, y: 35, z: -100 }, { x: 100, y: 35, z: -100 },
            { x: 100, y: 35, z: -50 }, { x: 100, y: 35, z: 0 }, { x: 100, y: 35, z: 50 }, { x: 100, y: 35, z: 100 },
            { x: 50, y: 35, z: 100 }, { x: 0, y: 35, z: 100 }, { x: -50, y: 35, z: 100 }, { x: -100, y: 35, z: 100 },
            { x: -100, y: 35, z: 50 }, { x: -100, y: 35, z: 0 }, { x: -100, y: 35, z: -50 },
        ];

        const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF]; // Various colors
        
        lightPositions.forEach((pos, index) => {
            const lightGeometry = new this.THREE.SphereGeometry(0.8, 6, 4);
            const lightMaterial = new this.THREE.MeshStandardMaterial({
                color: colors[index % colors.length],
                emissive: colors[index % colors.length],
                emissiveIntensity: 0.5,
            });
            
            const light = new this.THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(pos.x, pos.y, pos.z);
            
            light.userData = {
                templateObject: true,
                christmasDecoration: true,
                christmasLights: true,
                preservePosition: true,
                type: 'christmas_light'
            };
            
            this.scene.add(light);
            this.objects.push(light);
        });
        
        console.log('💡 Christmas lights added');
    }

    /**
     * Add Christmas ambience
     */
    addChristmasAmbience() {
        console.log('✨ Adding Christmas ambience...');
        
        // Add some scattered gift boxes
        this.createGiftBoxes();
        
        // Add candy canes
        this.createCandyCanes();
        
        console.log('✨ Christmas ambience added');
    }

    /**
     * Create gift boxes scattered around
     */
    createGiftBoxes() {
        const giftPositions = [
            { x: -60, z: -60, color: 0xFF0000 }, // Red
            { x: 40, z: -40, color: 0x00FF00 }, // Green
            { x: -30, z: 40, color: 0x0000FF }, // Blue
            { x: 60, z: -20, color: 0xFFD700 }, // Gold
        ];

        giftPositions.forEach((gift, index) => {
            const size = 3 + Math.random() * 2;
            const boxGeometry = new this.THREE.BoxGeometry(size, size, size);
            const boxMaterial = new this.THREE.MeshStandardMaterial({
                color: gift.color,
                metalness: 0.3,
                roughness: 0.7,
            });
            
            const box = new this.THREE.Mesh(boxGeometry, boxMaterial);
            box.position.set(gift.x, size / 2, gift.z);
            
            box.userData = {
                templateObject: true,
                christmasDecoration: true,
                giftBox: true,
                preservePosition: true,
                type: 'christmas_gift'
            };
            
            this.scene.add(box);
            this.objects.push(box);
        });
    }

    /**
     * Create candy canes
     */
    createCandyCanes() {
        const candyCanePositions = [
            { x: -20, z: -90 },
            { x: 20, z: -90 },
            { x: 90, z: -20 },
            { x: 90, z: 20 },
        ];

        candyCanePositions.forEach((pos, index) => {
            // Candy cane shaft
            const shaftGeometry = new this.THREE.CylinderGeometry(1, 1, 12, 8);
            const shaftMaterial = new this.THREE.MeshStandardMaterial({
                color: index % 2 === 0 ? 0xFF0000 : 0xFFFFFF, // Red and white stripes
            });
            
            const shaft = new this.THREE.Mesh(shaftGeometry, shaftMaterial);
            shaft.position.set(pos.x, 6, pos.z);
            
            shaft.userData = {
                templateObject: true,
                christmasDecoration: true,
                candyCane: true,
                preservePosition: true,
                type: 'candy_cane'
            };
            
            this.scene.add(shaft);
            this.objects.push(shaft);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChristmasDecorations;
} else if (typeof window !== 'undefined') {
    window.ChristmasDecorations = ChristmasDecorations;
}

// ============================================================================
// MODULE: modules\premium\christmasLogCabin.js
// ============================================================================
/**
 * Christmas Log Cabin Module
 * Handles the log cabin wall system for ChristmasLand world
 * Creates cozy wood walls with snow accents
 */

class ChristmasLogCabin {
    constructor(THREE, scene, objects) {
        this.THREE = THREE;
        this.scene = scene;
        this.objects = objects;
        
        console.log('🏠 Christmas log cabin system initialized');
    }

    /**
     * Create all log cabin walls
     */
    createLogCabinWalls() {
        console.log('🏠 Creating log cabin walls...');
        
        this.createWallStructure();
        this.addWallDetails();
        this.addSnowAccents();
        
        console.log('🏠 Log cabin walls complete');
    }

    /**
     * Create the main wall structure
     */
    createWallStructure() {
        const wallHeight = 60; // Raised from 40 to 60 (20 units higher)
        const wallLength = 300;
        const logHeight = 4;
        const numLogs = wallHeight / logHeight;
        
        // Create walls with log texture
        const walls = [
            // Back wall
            { x: 0, z: -150, width: wallLength, rotation: 0 },
            // Front wall (with door gap)
            { x: -75, z: 150, width: wallLength / 2, rotation: 0 },
            { x: 75, z: 150, width: wallLength / 2, rotation: 0 },
            // Left wall
            { x: -150, z: 0, width: wallLength, rotation: Math.PI / 2 },
            // Right wall
            { x: 150, z: 0, width: wallLength, rotation: Math.PI / 2 },
        ];

        walls.forEach((wall, wallIndex) => {
            this.createLogWall(wall, wallIndex, numLogs, logHeight);
        });
    }

    /**
     * Create a single log wall
     */
    createLogWall(wallConfig, wallIndex, numLogs, logHeight) {
        for (let logLayer = 0; logLayer < numLogs; logLayer++) {
            const y = logHeight / 2 + (logLayer * logHeight);
            
            // Alternate log lengths for authentic log cabin look
            const logLength = wallConfig.width - (logLayer % 2 === 0 ? 0 : 8);
            const xOffset = logLayer % 2 === 0 ? 0 : 4;
            
            const logGeometry = new this.THREE.CylinderGeometry(
                logHeight / 2, 
                logHeight / 2, 
                logLength, 
                8
            );
            
            const logMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x8B4513, // Brown wood
                roughness: 0.8,
                metalness: 0.1,
            });

            const log = new this.THREE.Mesh(logGeometry, logMaterial);
            log.position.set(
                wallConfig.x + xOffset, 
                y, 
                wallConfig.z
            );
            log.rotation.y = wallConfig.rotation;
            log.rotation.z = Math.PI / 2; // Logs lie horizontally
            
            log.userData = {
                templateObject: true,
                christmasDecoration: true,
                logCabinWall: true,
                wallId: wallIndex,
                logLayer: logLayer,
                preservePosition: true,
                type: 'log_cabin_log'
            };

            this.scene.add(log);
            this.objects.push(log);
        }
    }

    /**
     * Add details to the cabin walls
     */
    addWallDetails() {
        console.log('🏠 Adding wall details...');
        
        // Add corner supports
        this.createCornerSupports();
        
        // Add window frames
        this.createWindowFrames();
        
        // Add door frame
        this.createDoorFrame();
        
        console.log('🏠 Wall details added');
    }

    /**
     * Create corner support beams
     */
    createCornerSupports() {
        const corners = [
            { x: -150, z: -150 }, // Back left
            { x: 150, z: -150 },  // Back right
            { x: -150, z: 150 },  // Front left
            { x: 150, z: 150 },   // Front right
        ];

        corners.forEach((corner, index) => {
            const supportGeometry = new this.THREE.BoxGeometry(8, 60, 8); // Updated height from 40 to 60
            const supportMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x654321, // Darker brown
                roughness: 0.9,
            });

            const support = new this.THREE.Mesh(supportGeometry, supportMaterial);
            support.position.set(corner.x, 30, corner.z); // Updated Y from 20 to 30 (60/2)
            
            support.userData = {
                templateObject: true,
                christmasDecoration: true,
                logCabinWall: true,
                cornerSupport: true,
                cornerId: index,
                preservePosition: true,
                type: 'log_cabin_corner'
            };

            this.scene.add(support);
            this.objects.push(support);
        });
    }

    /**
     * Create window frames
     */
    createWindowFrames() {
        const windows = [
            // Back wall windows
            { x: -40, y: 35, z: -150, width: 15, height: 12 }, // Raised Y from 25 to 35
            { x: 40, y: 35, z: -150, width: 15, height: 12 },  // Raised Y from 25 to 35
            
            // Side wall windows
            { x: -150, y: 35, z: -40, width: 15, height: 12, rotation: Math.PI / 2 }, // Raised Y from 25 to 35
            { x: 150, y: 35, z: -40, width: 15, height: 12, rotation: Math.PI / 2 },   // Raised Y from 25 to 35
            { x: -150, y: 35, z: 40, width: 15, height: 12, rotation: Math.PI / 2 },   // Raised Y from 25 to 35
            { x: 150, y: 35, z: 40, width: 15, height: 12, rotation: Math.PI / 2 },    // Raised Y from 25 to 35
        ];

        windows.forEach((window, index) => {
            this.createWindow(window, index);
        });
    }

    /**
     * Create a single window
     */
    createWindow(windowConfig, index) {
        // Window frame
        const frameGeometry = new this.THREE.BoxGeometry(
            windowConfig.width + 2, 
            windowConfig.height + 2, 
            2
        );
        const frameMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x654321, // Dark brown frame
            roughness: 0.8,
        });

        const frame = new this.THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(windowConfig.x, windowConfig.y, windowConfig.z);
        if (windowConfig.rotation) {
            frame.rotation.y = windowConfig.rotation;
        }
        
        frame.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            windowFrame: true,
            windowId: index,
            preservePosition: true,
            type: 'log_cabin_window_frame'
        };

        this.scene.add(frame);
        this.objects.push(frame);

        // Window glass
        const glassGeometry = new this.THREE.PlaneGeometry(
            windowConfig.width, 
            windowConfig.height
        );
        const glassMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x87CEEB, // Light blue tint
            transparent: true,
            opacity: 0.6,
            metalness: 0.9,
            roughness: 0.1,
        });

        const glass = new this.THREE.Mesh(glassGeometry, glassMaterial);
        glass.position.set(windowConfig.x, windowConfig.y, windowConfig.z + 1);
        if (windowConfig.rotation) {
            glass.rotation.y = windowConfig.rotation;
        }
        
        glass.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            windowGlass: true,
            windowId: index,
            preservePosition: true,
            type: 'log_cabin_window_glass'
        };

        this.scene.add(glass);
        this.objects.push(glass);
    }

    /**
     * Create door frame for front entrance
     */
    createDoorFrame() {
        const doorConfig = {
            x: 0,
            y: 30, // Raised from 20 to 30 for taller door
            z: 150,
            width: 20,
            height: 55 // Increased from 35 to 55 for taller door
        };

        // Door frame
        const frameGeometry = new this.THREE.BoxGeometry(
            doorConfig.width + 4, 
            doorConfig.height + 2, 
            4
        );
        const frameMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x654321, // Dark brown
            roughness: 0.8,
        });

        const frame = new this.THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(doorConfig.x, doorConfig.y, doorConfig.z);
        
        frame.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            doorFrame: true,
            preservePosition: true,
            type: 'log_cabin_door_frame'
        };

        this.scene.add(frame);
        this.objects.push(frame);

        // Add door arch detail
        const archGeometry = new this.THREE.CylinderGeometry(
            doorConfig.width / 2, 
            doorConfig.width / 2, 
            4, 
            16, 
            1, 
            false, 
            0, 
            Math.PI
        );
        const arch = new this.THREE.Mesh(archGeometry, frameMaterial);
        arch.position.set(doorConfig.x, doorConfig.y + doorConfig.height / 2, doorConfig.z);
        arch.rotation.z = Math.PI / 2;
        
        arch.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            doorArch: true,
            preservePosition: true,
            type: 'log_cabin_door_arch'
        };

        this.scene.add(arch);
        this.objects.push(arch);
    }

    /**
     * Add snow accents to the cabin
     */
    addSnowAccents() {
        console.log('❄️ Adding snow accents...');
        
        // Snow on window sills
        this.addWindowSnow();
        
        // Snow on corner supports
        this.addCornerSnow();
        
        // Icicles hanging from roof line
        this.addIcicles();
        
        console.log('❄️ Snow accents added');
    }

    /**
     * Add snow to window sills
     */
    addWindowSnow() {
        const windowPositions = [
            { x: -40, z: -150 }, { x: 40, z: -150 },
            { x: -150, z: -40 }, { x: 150, z: -40 },
            { x: -150, z: 40 }, { x: 150, z: 40 },
        ];

        windowPositions.forEach((pos, index) => {
            const snowGeometry = new this.THREE.BoxGeometry(18, 2, 4);
            const snowMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xFFFAFA, // Snow white
                roughness: 0.8,
            });

            const snow = new this.THREE.Mesh(snowGeometry, snowMaterial);
            snow.position.set(pos.x, 28, pos.z); // Raised from 18 to 28 to match higher windows
            
            snow.userData = {
                templateObject: true,
                christmasDecoration: true,
                logCabinWall: true,
                windowSnow: true,
                preservePosition: true,
                type: 'window_snow'
            };

            this.scene.add(snow);
            this.objects.push(snow);
        });
    }

    /**
     * Add snow to corner supports
     */
    addCornerSnow() {
        const corners = [
            { x: -150, z: -150 },
            { x: 150, z: -150 },
            { x: -150, z: 150 },
            { x: 150, z: 150 },
        ];

        corners.forEach((corner, index) => {
            const snowGeometry = new this.THREE.BoxGeometry(10, 3, 10);
            const snowMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xFFFAFA,
                roughness: 0.8,
            });

            const snow = new this.THREE.Mesh(snowGeometry, snowMaterial);
            snow.position.set(corner.x, 61.5, corner.z); // Raised from 41.5 to 61.5 for higher walls
            
            snow.userData = {
                templateObject: true,
                christmasDecoration: true,
                logCabinWall: true,
                cornerSnow: true,
                preservePosition: true,
                type: 'corner_snow'
            };

            this.scene.add(snow);
            this.objects.push(snow);
        });
    }

    /**
     * Add icicles hanging from the roof line
     */
    addIcicles() {
        const iciclePositions = [];
        
        // Generate icicle positions around the perimeter
        for (let i = -140; i <= 140; i += 20) {
            iciclePositions.push({ x: i, z: -150 }); // Back wall
            iciclePositions.push({ x: i, z: 150 });  // Front wall
            iciclePositions.push({ x: -150, z: i }); // Left wall
            iciclePositions.push({ x: 150, z: i });  // Right wall
        }

        iciclePositions.forEach((pos, index) => {
            const length = 3 + Math.random() * 4; // 3-7 units long
            const icicleGeometry = new this.THREE.ConeGeometry(0.3, length, 6);
            const icicleMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xE6F3FF, // Icy blue-white
                transparent: true,
                opacity: 0.9,
                metalness: 0.1,
                roughness: 0.1,
            });

            const icicle = new this.THREE.Mesh(icicleGeometry, icicleMaterial);
            icicle.position.set(pos.x, 60 - length / 2, pos.z); // Updated from 40 to 60 for higher roof line
            
            icicle.userData = {
                templateObject: true,
                christmasDecoration: true,
                logCabinWall: true,
                icicle: true,
                preservePosition: true,
                type: 'icicle'
            };

            this.scene.add(icicle);
            this.objects.push(icicle);
        });
    }

    /**
     * Create cabin roof (optional - can be called separately)
     */
    createCabinRoof() {
        console.log('🏠 Creating cabin roof...');
        
        const roofGeometry = new this.THREE.ConeGeometry(200, 30, 4);
        const roofMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown wood
            roughness: 0.8,
        });

        const roof = new this.THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, 75, 0); // Raised from 55 to 75 (60 + 15 for clearance)
        roof.rotation.y = Math.PI / 4; // Diamond orientation
        
        roof.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            cabinRoof: true,
            preservePosition: true,
            type: 'cabin_roof'
        };

        this.scene.add(roof);
        this.objects.push(roof);

        // Add snow on roof
        const snowRoofGeometry = new this.THREE.ConeGeometry(202, 8, 4);
        const snowRoofMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFFAFA, // Snow white
            roughness: 0.8,
        });

        const snowRoof = new this.THREE.Mesh(snowRoofGeometry, snowRoofMaterial);
        snowRoof.position.set(0, 91, 0); // Raised from 71 to 91 (75 + 16 for snow layer)
        snowRoof.rotation.y = Math.PI / 4;
        
        snowRoof.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            roofSnow: true,
            preservePosition: true,
            type: 'roof_snow'
        };

        this.scene.add(snowRoof);
        this.objects.push(snowRoof);
        
        console.log('🏠 Cabin roof created');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChristmasLogCabin;
} else if (typeof window !== 'undefined') {
    window.ChristmasLogCabin = ChristmasLogCabin;
}

// ============================================================================
// MODULE: modules\premium\christmasLights.js
// ============================================================================
/**
 * Christmas Lights Module
 * Handles animated Christmas lighting effects for ChristmasLand world
 * Creates twinkling lights, warm fireplace glow, and festive atmosphere
 */

class ChristmasLights {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        
        // Animation properties
        this.animationTime = 0;
        this.twinklingLights = [];
        this.fireplaceFlicker = null;
        this.animationFrame = null;
        
        console.log('💡 Christmas lights system initialized');
    }

    /**
     * Set up all Christmas lighting effects
     */
    setupChristmasLighting() {
        console.log('💡 Setting up Christmas lighting...');
        
        this.setupBaseLighting();
        this.setupFireplaceGlow();
        this.setupTwinklingLights();
        this.setupWarmAmbience();
        this.startLightAnimation();
        
        console.log('💡 Christmas lighting setup complete');
    }

    /**
     * Set up base lighting for Christmas atmosphere
     */
    setupBaseLighting() {
        console.log('💡 Setting up base Christmas lighting...');
        
        // Warm ambient light
        const ambientLight = new this.THREE.AmbientLight(0xFFE4B5, 0.4); // Warm yellow
        this.scene.add(ambientLight);
        
        // Main directional light (soft winter sun)
        const directionalLight = new this.THREE.DirectionalLight(0xFFF8DC, 0.6); // Cornsilk
        directionalLight.position.set(30, 50, 30);
        directionalLight.target.position.set(0, 0, 0);
        
        // Enable shadows for cozy effect
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        
        this.scene.add(directionalLight);
        this.scene.add(directionalLight.target);
        
        console.log('💡 Base lighting established');
    }

    /**
     * Set up fireplace glow effect
     */
    setupFireplaceGlow() {
        console.log('🔥 Setting up fireplace glow...');
        
        // Main fireplace light
        const fireplaceLight = new this.THREE.PointLight(0xFF4500, 1.5, 80); // Orange-red
        fireplaceLight.position.set(0, 10, -145); // Fireplace position
        
        fireplaceLight.userData = {
            templateObject: true,
            christmasLighting: true,
            fireplaceLight: true,
            originalIntensity: 1.5,
            type: 'fireplace_glow'
        };
        
        this.scene.add(fireplaceLight);
        this.fireplaceFlicker = fireplaceLight;
        
        // Secondary warm glow for area lighting
        const areaLight = new this.THREE.PointLight(0xFF6347, 0.8, 50); // Tomato color
        areaLight.position.set(0, 15, -140);
        
        areaLight.userData = {
            templateObject: true,
            christmasLighting: true,
            fireplaceAreaLight: true,
            type: 'fireplace_area_glow'
        };
        
        this.scene.add(areaLight);
        
        console.log('🔥 Fireplace glow setup complete');
    }

    /**
     * Set up twinkling Christmas lights around the room
     */
    setupTwinklingLights() {
        console.log('✨ Setting up twinkling lights...');
        
        // String lights around the perimeter
        const stringLightPositions = this.generateStringLightPositions();
        const colors = [
            0xFF0000, // Red
            0x00FF00, // Green  
            0x0000FF, // Blue
            0xFFFF00, // Yellow
            0xFF00FF, // Magenta
            0x00FFFF, // Cyan
            0xFFA500, // Orange
            0xFF1493  // Deep pink
        ];
        
        stringLightPositions.forEach((pos, index) => {
            const color = colors[index % colors.length];
            const light = this.createTwinklingLight(pos.x, pos.y, pos.z, color, index);
            this.twinklingLights.push(light);
        });
        
        // Christmas tree lights
        this.setupChristmasTreeLights();
        
        console.log(`✨ Created ${this.twinklingLights.length} twinkling lights`);
    }

    /**
     * Generate positions for string lights around room perimeter
     */
    generateStringLightPositions() {
        const positions = [];
        const height = 35; // Near ceiling
        const spacing = 25;
        
        // Back wall
        for (let x = -125; x <= 125; x += spacing) {
            positions.push({ x: x, y: height, z: -145 });
        }
        
        // Right wall
        for (let z = -120; z <= 120; z += spacing) {
            positions.push({ x: 145, y: height, z: z });
        }
        
        // Front wall
        for (let x = 125; x >= -125; x -= spacing) {
            positions.push({ x: x, y: height, z: 145 });
        }
        
        // Left wall
        for (let z = 120; z >= -120; z -= spacing) {
            positions.push({ x: -145, y: height, z: z });
        }
        
        return positions;
    }

    /**
     * Create a single twinkling light
     */
    createTwinklingLight(x, y, z, color, index) {
        // Visual bulb
        const bulbGeometry = new this.THREE.SphereGeometry(0.8, 8, 6);
        const bulbMaterial = new this.THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
        });
        
        const bulb = new this.THREE.Mesh(bulbGeometry, bulbMaterial);
        bulb.position.set(x, y, z);
        
        bulb.userData = {
            templateObject: true,
            christmasLighting: true,
            twinklingBulb: true,
            bulbIndex: index,
            preservePosition: true,
            type: 'christmas_bulb'
        };
        
        this.scene.add(bulb);
        
        // Point light for illumination
        const pointLight = new this.THREE.PointLight(color, 0.6, 15);
        pointLight.position.set(x, y, z);
        
        pointLight.userData = {
            templateObject: true,
            christmasLighting: true,
            twinklingLight: true,
            lightIndex: index,
            originalIntensity: 0.6,
            originalColor: color,
            twinklePhase: Math.random() * Math.PI * 2, // Random starting phase
            type: 'christmas_light'
        };
        
        this.scene.add(pointLight);
        
        return {
            bulb: bulb,
            light: pointLight,
            originalColor: color,
            index: index
        };
    }

    /**
     * Set up special lights for the Christmas tree
     */
    setupChristmasTreeLights() {
        console.log('🎄 Setting up Christmas tree lights...');
        
        const treePosition = { x: -80, z: -80 };
        const treeLightPositions = [
            // Layer 1 lights
            { x: treePosition.x - 10, y: 12, z: treePosition.z + 4 },
            { x: treePosition.x + 8, y: 14, z: treePosition.z - 5 },
            { x: treePosition.x - 6, y: 16, z: treePosition.z + 9 },
            { x: treePosition.x + 9, y: 10, z: treePosition.z + 6 },
            
            // Layer 2 lights
            { x: treePosition.x - 7, y: 22, z: treePosition.z + 3 },
            { x: treePosition.x + 6, y: 24, z: treePosition.z - 4 },
            { x: treePosition.x - 3, y: 20, z: treePosition.z + 7 },
            
            // Layer 3 lights
            { x: treePosition.x - 3, y: 30, z: treePosition.z + 2 },
            { x: treePosition.x + 4, y: 32, z: treePosition.z - 3 },
        ];

        const treeColors = [0xFFD700, 0xFFFFFF, 0xFF0000]; // Gold, white, red
        
        treeLightPositions.forEach((pos, index) => {
            const color = treeColors[index % treeColors.length];
            const treeLight = this.createTwinklingLight(pos.x, pos.y, pos.z, color, index + 1000);
            this.twinklingLights.push(treeLight);
        });
        
        console.log('🎄 Christmas tree lights added');
    }

    /**
     * Set up warm ambient atmosphere
     */
    setupWarmAmbience() {
        console.log('🕯️ Setting up warm ambience...');
        
        // Soft overhead lighting to simulate indoor warmth
        const ceilingLights = [
            { x: -50, y: 38, z: -50 },
            { x: 50, y: 38, z: -50 },
            { x: -50, y: 38, z: 50 },
            { x: 50, y: 38, z: 50 },
            { x: 0, y: 38, z: 0 }, // Center
        ];

        ceilingLights.forEach((pos, index) => {
            const light = new this.THREE.PointLight(0xFFE4B5, 0.4, 40); // Warm yellow
            light.position.set(pos.x, pos.y, pos.z);
            
            light.userData = {
                templateObject: true,
                christmasLighting: true,
                ceilingLight: true,
                lightId: index,
                type: 'ceiling_light'
            };
            
            this.scene.add(light);
        });
        
        console.log('🕯️ Warm ambience established');
    }

    /**
     * Start the light animation loop
     */
    startLightAnimation() {
        console.log('🎬 Starting Christmas light animations...');
        
        const animate = () => {
            this.animationTime += 0.016; // ~60fps
            
            // Animate twinkling lights
            this.animateTwinklingLights();
            
            // Animate fireplace flicker
            this.animateFireplaceFlicker();
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
        console.log('🎬 Christmas light animations started');
    }

    /**
     * Animate the twinkling lights
     */
    animateTwinklingLights() {
        this.twinklingLights.forEach((lightObj) => {
            const light = lightObj.light;
            const bulb = lightObj.bulb;
            
            if (light.userData && light.userData.twinklingLight) {
                const phase = light.userData.twinklePhase;
                const time = this.animationTime;
                
                // Create twinkling effect with sine wave
                const twinkle = Math.sin(time * 2 + phase) * 0.3 + 0.7; // 0.4 to 1.0
                const fastTwinkle = Math.sin(time * 8 + phase) * 0.1 + 0.9; // 0.8 to 1.0
                
                // Combine slow and fast twinkling
                const intensity = light.userData.originalIntensity * twinkle * fastTwinkle;
                light.intensity = Math.max(0.1, intensity);
                
                // Update bulb emissive intensity
                if (bulb.material) {
                    bulb.material.emissiveIntensity = 0.2 + (twinkle * 0.4);
                }
            }
        });
    }

    /**
     * Animate fireplace flicker
     */
    animateFireplaceFlicker() {
        if (this.fireplaceFlicker && this.fireplaceFlicker.userData) {
            const time = this.animationTime;
            
            // Create realistic fire flicker
            const flicker1 = Math.sin(time * 6) * 0.2;
            const flicker2 = Math.sin(time * 11) * 0.15;
            const flicker3 = Math.sin(time * 17) * 0.1;
            
            const totalFlicker = 1 + flicker1 + flicker2 + flicker3;
            const intensity = this.fireplaceFlicker.userData.originalIntensity * totalFlicker;
            
            this.fireplaceFlicker.intensity = Math.max(0.5, intensity);
        }
    }

    /**
     * Create special holiday light effects
     */
    createSpecialEffects() {
        console.log('✨ Creating special Christmas effects...');
        
        // Snow sparkle effect (using small lights)
        this.createSnowSparkles();
        
        // Star on Christmas tree special glow
        this.createStarGlow();
        
        console.log('✨ Special effects created');
    }

    /**
     * Create snow sparkle effects
     */
    createSnowSparkles() {
        const sparklePositions = [];
        
        // Generate random sparkle positions across the floor
        for (let i = 0; i < 20; i++) {
            sparklePositions.push({
                x: (Math.random() - 0.5) * 200,
                y: 0.5,
                z: (Math.random() - 0.5) * 200
            });
        }
        
        sparklePositions.forEach((pos, index) => {
            const light = new this.THREE.PointLight(0xFFFFFF, 0.2, 8);
            light.position.set(pos.x, pos.y, pos.z);
            
            light.userData = {
                templateObject: true,
                christmasLighting: true,
                snowSparkle: true,
                sparkleIndex: index,
                originalIntensity: 0.2,
                twinklePhase: Math.random() * Math.PI * 2,
                type: 'snow_sparkle'
            };
            
            this.scene.add(light);
        });
    }

    /**
     * Create special glow for Christmas tree star
     */
    createStarGlow() {
        const treePosition = { x: -80, z: -80 };
        const starY = 38; // Top of tree
        
        const starLight = new this.THREE.PointLight(0xFFD700, 1.2, 25); // Golden glow
        starLight.position.set(treePosition.x, starY, treePosition.z);
        
        starLight.userData = {
            templateObject: true,
            christmasLighting: true,
            starGlow: true,
            originalIntensity: 1.2,
            type: 'star_glow'
        };
        
        this.scene.add(starLight);
    }

    /**
     * Stop light animations and cleanup
     */
    cleanup() {
        console.log('🧹 Cleaning up Christmas lighting...');
        
        // Stop animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Remove all Christmas lights from scene
        this.removeChristmasLightsFromScene();
        
        // Clear references
        this.twinklingLights = [];
        this.fireplaceFlicker = null;
        this.animationTime = 0;
        
        console.log('🧹 Christmas lighting cleanup complete');
    }

    /**
     * Remove all Christmas light objects from the scene
     */
    removeChristmasLightsFromScene() {
        console.log('🗑️ Removing Christmas lights from scene...');
        
        // Find and remove all objects with christmasLighting userData
        const objectsToRemove = [];
        
        this.scene.traverse((object) => {
            if (object.userData && object.userData.christmasLighting) {
                objectsToRemove.push(object);
            }
        });
        
        // Remove the objects
        objectsToRemove.forEach((object) => {
            console.log(`🗑️ Removing Christmas light: ${object.userData.type || 'unknown'}`);
            
            // Dispose of geometry and material if it's a mesh
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            
            // Remove from scene
            this.scene.remove(object);
        });
        
        console.log(`🗑️ Removed ${objectsToRemove.length} Christmas light objects`);
    }

    /**
     * Adjust lighting intensity (for day/night cycle if needed)
     */
    setLightingIntensity(factor) {
        this.twinklingLights.forEach((lightObj) => {
            const originalIntensity = lightObj.light.userData.originalIntensity || 0.6;
            lightObj.light.userData.originalIntensity = originalIntensity * factor;
        });
        
        if (this.fireplaceFlicker && this.fireplaceFlicker.userData) {
            const originalIntensity = this.fireplaceFlicker.userData.originalIntensity || 1.5;
            this.fireplaceFlicker.userData.originalIntensity = originalIntensity * factor;
        }
        
        console.log(`💡 Christmas lighting intensity adjusted by factor: ${factor}`);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChristmasLights;
} else if (typeof window !== 'undefined') {
    window.ChristmasLights = ChristmasLights;
}

// ============================================================================
// MODULE: modules\premium\premiumWorldThemes.js
// ============================================================================
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


// ============================================================================
// MODULE: modules\premium\caveExplorerWorldTemplate.js
// ============================================================================
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

// ============================================================================
// MODULE: modules\premium\christmasLandWorldTemplate.js
// ============================================================================
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

// ============================================================================
// MODULE: modules\premium\worldCleanupHelper.js
// ============================================================================
/**
 * WORLD CLEANUP HELPER (Conservative Approach)
 * Provides safe cleanup functionality for new world templates
 * WITHOUT modifying existing world template cleanup methods
 * 
 * SAFETY GUARANTEE: Only manages objects from NEW templates, preserves all existing cleanup
 */

(function() {
    'use strict';
    
    console.log('🧹 Loading WorldCleanupHelper (Conservative)...');

    /**
     * Conservative World Cleanup Helper
     * Only tracks and cleans up objects from NEW world templates
     * Preserves all existing world cleanup functionality
     */
    class WorldCleanupHelper {
        constructor() {
            this.trackedObjects = new Map(); // Only track NEW objects we add
            this.originalCleanupMethods = new Map(); // Preserve original cleanup methods
            this.objectMetadata = new Map(); // Store metadata about tracked objects
            
            console.log('🧹 WorldCleanupHelper initialized (conservative mode)');
            console.log('🧹 Existing cleanup methods preserved for all existing worlds');
        }
        
        /**
         * CONSERVATIVE: Only track objects from NEW world templates
         * Does not interfere with existing world template object management
         */
        trackObjectForNewTemplate(worldTemplate, object, objectType = 'decoration', metadata = {}) {
            try {
                const worldId = worldTemplate.constructor.name;
                
                // Only track if this is a new template (safety check)
                if (!this.isNewTemplate(worldTemplate)) {
                    console.warn(`🧹 Skipping tracking for existing world template: ${worldId}`);
                    return false;
                }
                
                if (!this.trackedObjects.has(worldId)) {
                    this.trackedObjects.set(worldId, new Set());
                }
                
                this.trackedObjects.get(worldId).add(object);
                
                // Store metadata about the object
                this.objectMetadata.set(object, {
                    worldId: worldId,
                    objectType: objectType,
                    createdAt: Date.now(),
                    ...metadata
                });
                
                console.log(`🧹 Tracking object for new template ${worldId}: ${objectType}`);
                return true;
                
            } catch (error) {
                console.error('🧹 Error tracking object:', error);
                return false;
            }
        }
        
        /**
         * CONSERVATIVE: Only clean up objects we specifically tracked
         * Does not interfere with existing world cleanup methods
         */
        cleanupNewTemplateObjects(worldTemplate) {
            try {
                const worldId = worldTemplate.constructor.name;
                const objects = this.trackedObjects.get(worldId);
                
                if (!objects || objects.size === 0) {
                    console.log(`🧹 No tracked objects to clean up for ${worldId}`);
                    return;
                }
                
                console.log(`🧹 Helper cleaning up ${objects.size} tracked objects for ${worldId}`);
                
                let cleanedCount = 0;
                let errorCount = 0;
                
                objects.forEach(object => {
                    try {
                        const metadata = this.objectMetadata.get(object);
                        
                        // Remove from scene if it has a parent
                        if (object.parent) {
                            object.parent.remove(object);
                        }
                        
                        // Safe disposal
                        this.safeDisposeObject(object);
                        
                        // Clean up metadata
                        this.objectMetadata.delete(object);
                        
                        cleanedCount++;
                        
                        if (metadata) {
                            console.log(`🧹 Cleaned ${metadata.objectType} object (age: ${Date.now() - metadata.createdAt}ms)`);
                        }
                        
                    } catch (error) {
                        console.warn(`🧹 Error cleaning individual object (non-critical):`, error);
                        errorCount++;
                    }
                });
                
                // Clear the tracked objects set
                objects.clear();
                
                console.log(`🧹 Cleanup complete for ${worldId}: ${cleanedCount} objects cleaned, ${errorCount} errors`);
                
            } catch (error) {
                console.error('🧹 Error during new template cleanup:', error);
            }
        }
        
        /**
         * Safe object disposal that handles various Three.js object types
         */
        safeDisposeObject(object) {
            try {
                // Dispose geometry
                if (object.geometry) {
                    object.geometry.dispose();
                }
                
                // Dispose material(s)
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => {
                            this.disposeMaterial(material);
                        });
                    } else {
                        this.disposeMaterial(object.material);
                    }
                }
                
                // Dispose texture(s) if directly attached
                if (object.texture) {
                    if (Array.isArray(object.texture)) {
                        object.texture.forEach(texture => texture.dispose());
                    } else {
                        object.texture.dispose();
                    }
                }
                
                // Handle children recursively
                if (object.children && object.children.length > 0) {
                    [...object.children].forEach(child => {
                        this.safeDisposeObject(child);
                    });
                }
                
            } catch (error) {
                console.warn('🧹 Safe disposal warning (non-critical):', error);
            }
        }
        
        /**
         * Safely dispose of a Three.js material and its textures
         */
        disposeMaterial(material) {
            try {
                // Dispose textures in material
                Object.keys(material).forEach(key => {
                    const value = material[key];
                    if (value && typeof value.dispose === 'function' && value.isTexture) {
                        value.dispose();
                    }
                });
                
                // Dispose the material itself
                material.dispose();
                
            } catch (error) {
                console.warn('🧹 Material disposal warning (non-critical):', error);
            }
        }
        
        /**
         * Check if a world template is a new template (uses helper system)
         */
        isNewTemplate(worldTemplate) {
            return worldTemplate && worldTemplate.isSimpleTemplate === true;
        }
        
        /**
         * Get statistics about tracked objects
         */
        getStatistics() {
            const stats = {
                totalWorlds: this.trackedObjects.size,
                totalObjects: 0,
                worldDetails: {}
            };
            
            this.trackedObjects.forEach((objects, worldId) => {
                stats.totalObjects += objects.size;
                stats.worldDetails[worldId] = {
                    objectCount: objects.size,
                    objectTypes: {}
                };
                
                // Count object types
                objects.forEach(object => {
                    const metadata = this.objectMetadata.get(object);
                    const type = metadata ? metadata.objectType : 'unknown';
                    stats.worldDetails[worldId].objectTypes[type] = 
                        (stats.worldDetails[worldId].objectTypes[type] || 0) + 1;
                });
            });
            
            return stats;
        }
        
        /**
         * Emergency cleanup for all tracked objects (debug/recovery)
         */
        emergencyCleanupAll() {
            console.warn('🚨 Emergency cleanup of all tracked objects!');
            
            this.trackedObjects.forEach((objects, worldId) => {
                console.warn(`🚨 Emergency cleanup for ${worldId}: ${objects.size} objects`);
                
                objects.forEach(object => {
                    try {
                        if (object.parent) {
                            object.parent.remove(object);
                        }
                        this.safeDisposeObject(object);
                    } catch (error) {
                        console.error('🚨 Emergency cleanup error:', error);
                    }
                });
                
                objects.clear();
            });
            
            this.objectMetadata.clear();
            console.warn('🚨 Emergency cleanup complete');
        }
        
        /**
         * Debug method to verify system integrity
         */
        verifySystemIntegrity() {
            const stats = this.getStatistics();
            
            console.log('🔍 WorldCleanupHelper System Status:');
            console.log(`   Total worlds with tracked objects: ${stats.totalWorlds}`);
            console.log(`   Total tracked objects: ${stats.totalObjects}`);
            console.log(`   World details:`, stats.worldDetails);
            
            return stats;
        }
    }
    
    // Create global instance
    window.WorldCleanupHelper = WorldCleanupHelper;
    window.worldCleanupHelper = new WorldCleanupHelper();
    
    // Debug functions
    window.checkWorldCleanup = function() {
        if (window.worldCleanupHelper) {
            return window.worldCleanupHelper.verifySystemIntegrity();
        }
        return { error: 'Cleanup helper not available' };
    };
    
    window.emergencyCleanupAllWorldObjects = function() {
        if (window.worldCleanupHelper) {
            window.worldCleanupHelper.emergencyCleanupAll();
        } else {
            console.error('Cleanup helper not available');
        }
    };
    
    console.log('🧹 WorldCleanupHelper loaded successfully!');
    console.log('🧹 Use window.checkWorldCleanup() to verify system status');
    console.log('🧹 Use window.emergencyCleanupAllWorldObjects() for emergency cleanup');
    
})();

// ============================================================================
// MODULE: modules\premium\simpleWorldTemplate.js
// ============================================================================
/**
 * SIMPLE WORLD TEMPLATE (Conservative Approach)
 * Provides an easy-to-use base class for creating new world templates
 * WITHOUT modifying existing BaseWorldTemplate or world template functionality
 * 
 * SAFETY GUARANTEE: Uses existing BaseWorldTemplate as foundation, purely additive
 */

(function() {
    'use strict';
    
    console.log('🌟 Loading SimpleWorldTemplate (Conservative)...');

    /**
     * SimpleWorldTemplate - Easy world template creation using configuration
     * Extends existing BaseWorldTemplate without modifying it
     */
    class SimpleWorldTemplate extends BaseWorldTemplate {
        constructor(THREE, simpleConfig = {}) {
            // PRESERVE: Use existing BaseWorldTemplate constructor unchanged
            super(THREE, {
                ambientLightColor: simpleConfig.ambientColor || 0x404040,
                ambientLightIntensity: simpleConfig.ambientIntensity || 0.6,
                directionalLightColor: simpleConfig.directionalColor || 0xffffff,
                directionalLightIntensity: simpleConfig.directionalIntensity || 0.8,
                ...simpleConfig.lighting
            });
            
            this.simpleConfig = simpleConfig;
            this.isSimpleTemplate = true; // Flag for identification by helper systems
            this.trackedObjects = new Set(); // Track our own objects for cleanup
            
            // NEW: Enhanced configuration with menu support
            this.config = {
                id: simpleConfig.id || 'simple-world',
                displayName: simpleConfig.displayName || simpleConfig.id || 'Simple World',
                description: simpleConfig.description || `Experience the ${simpleConfig.displayName || 'Simple World'} environment`,
                menuIcon: simpleConfig.menuIcon || 'landscape',
                isPremium: simpleConfig.isPremium !== false, // Default to premium
                bundle: simpleConfig.bundle || 'premium',
                category: simpleConfig.category || 'environment',
                ...simpleConfig
            };
            
            console.log(`🌟 SimpleWorldTemplate created: ${this.config.id}`);
            console.log(`🌟 Menu config:`, {
                title: this.config.displayName,
                description: this.config.description,
                icon: this.config.menuIcon,
                isPremium: this.config.isPremium
            });
        }
        
        /**
         * CONSERVATIVE: Override minimal methods, preserve BaseWorldTemplate behavior
         */
        getType() {
            return this.config.id;
        }
        
        getDisplayName() {
            return this.config.displayName;
        }
        
        /**
         * NEW: Get configuration for registry helper
         */
        static getConfig() {
            // For the class-level config, we need a default
            return {
                id: 'simple-world',
                displayName: 'Simple World',
                description: 'A simple world template',
                isPremium: true,
                bundle: 'premium'
            };
        }
        
        /**
         * NEW: Get instance configuration
         */
        getConfig() {
            return this.config;
        }
        
        /**
         * Enhanced setupEnvironment that uses configuration
         */
        setupEnvironment() {
            console.log(`🌟 Setting up environment for ${this.getDisplayName()}`);
            
            try {
                // Apply basic environment settings from config
                this.applyEnvironmentConfig();
                
                // Call user-defined setup function if provided
                if (this.simpleConfig.setupFunction) {
                    console.log(`🌟 Calling custom setup function for ${this.getDisplayName()}`);
                    this.simpleConfig.setupFunction.call(this);
                }
                
                // Track objects with cleanup helper if available
                this.integrateWithCleanupHelper();
                
                console.log(`🌟 Environment setup complete for ${this.getDisplayName()}`);
                
            } catch (error) {
                console.error(`🌟 Error setting up ${this.getDisplayName()}:`, error);
                // Fallback to basic environment
                this.createBasicEnvironment();
            }
        }
        
        /**
         * Apply environment configuration from simpleConfig
         */
        applyEnvironmentConfig() {
            const config = this.simpleConfig;
            
            // Apply fog if configured
            if (config.fog && this.scene) {
                this.scene.fog = new this.THREE.Fog(
                    config.fog.color || 0xcccccc,
                    config.fog.near || 100,
                    config.fog.far || 2000
                );
                console.log(`🌟 Applied fog: color=${config.fog.color}, near=${config.fog.near}, far=${config.fog.far}`);
            }
            
            // Apply background color if configured
            if (config.backgroundColor && this.scene) {
                this.scene.background = new this.THREE.Color(config.backgroundColor);
                console.log(`🌟 Applied background color: ${config.backgroundColor}`);
            }
            
            // Create ground plane if configured (Green Plane style by default)
            if (config.groundPlane !== false) {
                this.createGroundPlane(config.groundPlane || {});
            }
        }
        
        /**
         * Create a ground plane (similar to Green Plane world)
         */
        createGroundPlane(planeConfig = {}) {
            try {
                const size = planeConfig.size || 300;
                const color = planeConfig.color || 0x4a9f4a;
                const position = planeConfig.position || { x: 0, y: -0.01, z: 0 };
                
                // Create ground plane geometry and material
                const planeGeometry = new this.THREE.PlaneGeometry(size, size);
                const planeMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: color,
                    transparent: planeConfig.transparent || false,
                    opacity: planeConfig.opacity || 1.0
                });
                
                const plane = new this.THREE.Mesh(planeGeometry, planeMaterial);
                plane.rotation.x = -Math.PI / 2;
                plane.position.set(position.x, position.y, position.z);
                plane.userData.templateObject = true;
                plane.userData.objectType = 'groundPlane';
                
                this.addTrackedObject(plane);
                
                console.log(`🌟 Created ground plane: size=${size}, color=${color}`);
                
            } catch (error) {
                console.error('🌟 Error creating ground plane:', error);
            }
        }
        
        /**
         * Add an object to the scene and track it for cleanup
         */
        addTrackedObject(object, objectType = 'decoration') {
            try {
                // Add to scene
                if (this.scene) {
                    this.scene.add(object);
                }
                
                // Add to BaseWorldTemplate's objects array (preserves existing behavior)
                if (this.objects) {
                    this.objects.push(object);
                }
                
                // Track locally for our cleanup
                this.trackedObjects.add(object);
                
                // Track with cleanup helper if available
                if (window.worldCleanupHelper) {
                    window.worldCleanupHelper.trackObjectForNewTemplate(this, object, objectType);
                }
                
                console.log(`🌟 Added tracked object: ${objectType}`);
                
            } catch (error) {
                console.error('🌟 Error adding tracked object:', error);
            }
        }
        
        /**
         * Integrate with cleanup helper system
         */
        integrateWithCleanupHelper() {
            if (window.worldCleanupHelper && this.objects) {
                this.objects.forEach(obj => {
                    if (!this.trackedObjects.has(obj)) {
                        window.worldCleanupHelper.trackObjectForNewTemplate(this, obj, 'inherited');
                        this.trackedObjects.add(obj);
                    }
                });
            }
        }
        
        /**
         * Create basic fallback environment
         */
        createBasicEnvironment() {
            console.log(`🌟 Creating basic fallback environment for ${this.getDisplayName()}`);
            
            // Just create a simple ground plane
            this.createGroundPlane();
        }
        
        /**
         * Get positioning constraints (Green Plane style by default)
         */
        getPositioningConstraints() {
            const config = this.simpleConfig.constraints || {};
            
            return {
                requiresSupport: config.requiresSupport || false,
                allowedStackingDirections: config.allowedStackingDirections || 
                    ['top', 'bottom', 'front', 'back', 'left', 'right'],
                worldBoundaries: config.worldBoundaries || {
                    x: { min: -150, max: 150 },
                    y: { min: 0, max: 100 },
                    z: { min: -150, max: 150 }
                }
            };
        }
        
        /**
         * Apply position constraints (Green Plane style by default)
         */
        applyPositionConstraints(object, newPosition, allObjects = []) {
            const constraints = this.getPositioningConstraints();
            
            // Clamp to world boundaries
            const constrainedX = Math.max(constraints.worldBoundaries.x.min, 
                                 Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            const constrainedY = Math.max(constraints.worldBoundaries.y.min, 
                                 Math.min(constraints.worldBoundaries.y.max, newPosition.y));
            const constrainedZ = Math.max(constraints.worldBoundaries.z.min, 
                                 Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            return {
                x: constrainedX,
                y: constrainedY,
                z: constrainedZ
            };
        }
        
        /**
         * Get home view position
         */
        getHomeViewPosition() {
            const config = this.simpleConfig.homeView || {};
            return {
                x: config.x || 0,
                y: config.y || 30,
                z: config.z || 60
            };
        }
        
        /**
         * Get home view target
         */
        getHomeViewTarget() {
            const config = this.simpleConfig.homeViewTarget || {};
            return {
                x: config.x || 0,
                y: config.y || 0,
                z: config.z || 0
            };
        }
        
        /**
         * Apply camera constraints
         */
        applyCameraConstraints(controls) {
            const config = this.simpleConfig.camera || {};
            
            controls.minDistance = config.minDistance || 1.0;
            controls.maxDistance = config.maxDistance || 100.0;
            
            if (config.enablePan !== undefined) {
                controls.enablePan = config.enablePan;
            }
            if (config.enableZoom !== undefined) {
                controls.enableZoom = config.enableZoom;
            }
            if (config.enableRotate !== undefined) {
                controls.enableRotate = config.enableRotate;
            }
        }
        
        /**
         * CONSERVATIVE: Clean up our tracked objects first, then call parent
         */
        cleanup() {
            console.log(`🧹 Cleaning up SimpleWorldTemplate: ${this.getDisplayName()}`);
            
            try {
                // Clean up with helper first
                if (window.worldCleanupHelper) {
                    window.worldCleanupHelper.cleanupNewTemplateObjects(this);
                }
                
                // Clear our local tracking
                this.trackedObjects.clear();
                
                // Reset scene properties we may have modified
                if (this.scene) {
                    // Only reset if we actually set these
                    if (this.simpleConfig.fog) {
                        this.scene.fog = null;
                    }
                    if (this.simpleConfig.backgroundColor) {
                        this.scene.background = null;
                    }
                }
                
                console.log(`🧹 SimpleWorldTemplate cleanup complete for ${this.getDisplayName()}`);
                
            } catch (error) {
                console.error(`🧹 Error during SimpleWorldTemplate cleanup:`, error);
            }
            
            // PRESERVE: Always call parent cleanup to maintain existing behavior
            super.cleanup();
        }
        
        /**
         * Static method to get configuration (required by registry)
         */
        static getConfig() {
            return this.configData || {
                id: 'simple-world',
                displayName: 'Simple World',
                isPremium: false,
                bundle: 'core'
            };
        }
        
        /**
         * Static factory method to create a template class from configuration
         */
        static createFromConfig(config) {
            const TemplateClass = class extends SimpleWorldTemplate {
                constructor(THREE, sceneConfig = {}) {
                    super(THREE, {...config, ...sceneConfig});
                }
                
                static getConfig() {
                    return config;
                }
            };
            
            // Store config for static access
            TemplateClass.configData = config;
            
            return TemplateClass;
        }
        
        /**
         * Helper method to validate configuration
         */
        static validateConfig(config) {
            const required = ['id', 'displayName'];
            const missing = required.filter(field => !config[field]);
            
            if (missing.length > 0) {
                throw new Error(`Missing required config fields: ${missing.join(', ')}`);
            }
            
            // Validate ID format
            if (!/^[a-z][a-z0-9-]*$/.test(config.id)) {
                throw new Error('Config ID must be lowercase, start with letter, and contain only letters, numbers, and hyphens');
            }
            
            return true;
        }
    }
    
    // Export to global scope
    window.SimpleWorldTemplate = SimpleWorldTemplate;
    
    console.log('🌟 SimpleWorldTemplate loaded successfully!');
    console.log('🌟 Use SimpleWorldTemplate.createFromConfig(config) to create new world templates');
    
})();

// ============================================================================
// MODULE: modules\premium\dynamicPremiumDetection.js
// ============================================================================
/**
 * DYNAMIC PREMIUM WORLD DETECTION SYSTEM
 * Replaces static isPremiumWorld arrays with dynamic detection
 * Conservative approach: Extends existing functionality without breaking it
 */

(function() {
    'use strict';
    
    console.log('💎 Loading DynamicPremiumDetection...');

    /**
     * Dynamic Premium World Detection System
     */
    class DynamicPremiumDetection {
        constructor() {
            this.staticPremiumWorlds = ['dazzle', 'forest', 'cave', 'christmas', 'desert-oasis'];
            this.dynamicPremiumWorlds = new Set();
            this.initialized = false;
            
            console.log('💎 DynamicPremiumDetection initialized');
        }
        
        /**
         * Initialize the dynamic detection system
         */
        initialize() {
            if (this.initialized) return;
            
            try {
                this.setupGlobalFunctions();
                this.integrateWithExistingSystems();
                this.initialized = true;
                
                console.log('💎 Dynamic premium detection system initialized');
            } catch (error) {
                console.error('💎 Failed to initialize dynamic premium detection:', error);
            }
        }
        
        /**
         * Setup global functions for backward compatibility
         */
        setupGlobalFunctions() {
            // Global function for checking if a world is premium
            window.isDynamicPremiumWorld = (worldType) => {
                return this.isPremiumWorld(worldType);
            };
            
            // Global function to get all premium worlds
            window.getAllPremiumWorlds = () => {
                return this.getAllPremiumWorlds();
            };
            
            // Global function to register dynamic premium world
            window.registerDynamicPremiumWorld = (worldType) => {
                return this.registerPremiumWorld(worldType);
            };
        }
        
        /**
         * Integrate with existing systems
         */
        integrateWithExistingSystems() {
            // Hook into auto-integration system if available
            if (window.worldTemplateAutoIntegration) {
                // Listen for new template registrations
                const originalRegister = window.worldTemplateAutoIntegration.registerTemplate;
                
                window.worldTemplateAutoIntegration.registerTemplate = (templateClass, config = {}) => {
                    const result = originalRegister.call(window.worldTemplateAutoIntegration, templateClass, config);
                    
                    // Check if this is a premium template
                    if (result) {
                        const metadata = window.worldTemplateAutoIntegration.getTemplateMetadata(templateClass.getConfig().id);
                        if (metadata && metadata.isPremium) {
                            this.registerPremiumWorld(metadata.id);
                        }
                    }
                    
                    return result;
                };
            }
        }
        
        /**
         * Check if a world type is premium (combines static and dynamic)
         */
        isPremiumWorld(worldType) {
            // Check static list first (existing worlds)
            if (this.staticPremiumWorlds.includes(worldType)) {
                return true;
            }
            
            // Check dynamic list (new templates)
            if (this.dynamicPremiumWorlds.has(worldType)) {
                return true;
            }
            
            // Check auto-integration system if available
            if (window.worldTemplateAutoIntegration) {
                const metadata = window.worldTemplateAutoIntegration.getTemplateMetadata(worldType);
                if (metadata && metadata.isPremium) {
                    // Cache for future lookups
                    this.dynamicPremiumWorlds.add(worldType);
                    return true;
                }
            }
            
            // Check world template registry helper
            if (window.worldTemplateRegistryHelper && window.worldTemplateRegistryHelper.requiresPremiumBundle) {
                return window.worldTemplateRegistryHelper.requiresPremiumBundle(worldType);
            }
            
            return false;
        }
        
        /**
         * Register a world type as premium
         */
        registerPremiumWorld(worldType) {
            if (!this.staticPremiumWorlds.includes(worldType)) {
                this.dynamicPremiumWorlds.add(worldType);
                console.log(`💎 Registered dynamic premium world: ${worldType}`);
                return true;
            }
            return false; // Already in static list
        }
        
        /**
         * Remove a world type from premium (only affects dynamic list)
         */
        unregisterPremiumWorld(worldType) {
            if (this.dynamicPremiumWorlds.has(worldType)) {
                this.dynamicPremiumWorlds.delete(worldType);
                console.log(`💎 Unregistered dynamic premium world: ${worldType}`);
                return true;
            }
            return false;
        }
        
        /**
         * Get all premium worlds (static + dynamic)
         */
        getAllPremiumWorlds() {
            const allPremium = [...this.staticPremiumWorlds];
            
            // Add dynamic premium worlds
            this.dynamicPremiumWorlds.forEach(worldType => {
                if (!allPremium.includes(worldType)) {
                    allPremium.push(worldType);
                }
            });
            
            // Add from auto-integration system
            if (window.worldTemplateAutoIntegration) {
                const autoIntegratedTemplates = window.worldTemplateAutoIntegration.getAllRegisteredTemplates();
                autoIntegratedTemplates.forEach(metadata => {
                    if (metadata.isPremium && !allPremium.includes(metadata.id)) {
                        allPremium.push(metadata.id);
                    }
                });
            }
            
            return allPremium;
        }
        
        /**
         * Get only dynamically registered premium worlds
         */
        getDynamicPremiumWorlds() {
            return Array.from(this.dynamicPremiumWorlds);
        }
        
        /**
         * Get only static premium worlds
         */
        getStaticPremiumWorlds() {
            return [...this.staticPremiumWorlds];
        }
        
        /**
         * Check if a world requires premium bundle loading
         */
        requiresPremiumBundle(worldType) {
            return this.isPremiumWorld(worldType);
        }
        
        /**
         * Create enhanced isPremiumWorld function for worldManagement.js
         */
        createEnhancedIsPremiumWorldFunction() {
            return (worldType) => {
                // Try dynamic detection first
                if (this.isPremiumWorld(worldType)) {
                    return true;
                }
                
                // Fallback to original static check for safety
                const legacyPremiumWorlds = ['forest', 'dazzle', 'cave', 'christmas', 'desert-oasis'];
                return legacyPremiumWorlds.includes(worldType);
            };
        }
        
        /**
         * Get debug information
         */
        getDebugInfo() {
            return {
                initialized: this.initialized,
                staticPremiumWorlds: this.staticPremiumWorlds,
                dynamicPremiumWorlds: Array.from(this.dynamicPremiumWorlds),
                totalPremiumWorlds: this.getAllPremiumWorlds(),
                systemsIntegrated: {
                    autoIntegration: !!window.worldTemplateAutoIntegration,
                    registryHelper: !!window.worldTemplateRegistryHelper
                }
            };
        }
        
        /**
         * Validate premium world configuration
         */
        validatePremiumWorld(worldType) {
            const checks = {
                isRegistered: this.isPremiumWorld(worldType),
                hasMetadata: false,
                hasTemplate: false
            };
            
            // Check if template exists
            if (window.worldTemplateAutoIntegration) {
                checks.hasMetadata = !!window.worldTemplateAutoIntegration.getTemplateMetadata(worldType);
                checks.hasTemplate = window.worldTemplateAutoIntegration.isAutoIntegrated(worldType);
            }
            
            return checks;
        }
    }
    
    // Create global instance
    window.DynamicPremiumDetection = DynamicPremiumDetection;
    window.dynamicPremiumDetection = new DynamicPremiumDetection();
    
    // Initialize immediately - world templates need this ready when they load
    window.dynamicPremiumDetection.initialize();
    
    console.log('💎 DynamicPremiumDetection module loaded and initialized');
    
})();

// ============================================================================
// MODULE: modules\premium\worldTemplateAutoIntegration.js
// ============================================================================
/**
 * WORLD TEMPLATE AUTO-INTEGRATION SYSTEM
 * Provides automatic integration of new world templates across all app systems
 * WITHOUT modifying existing core files heavily
 * 
 * Conservative approach: Create new functionality in separate files
 */

(function() {
    'use strict';
    
    console.log('🔄 Loading WorldTemplateAutoIntegration...');

    /**
     * Handles automatic integration of world templates across app systems
     */
    class WorldTemplateAutoIntegration {
        constructor() {
            this.integrationHooks = new Map();
            this.registeredTemplates = new Map();
            this.initialized = false;
            
            console.log('🔄 WorldTemplateAutoIntegration initialized');
        }
        
        /**
         * Initialize the auto-integration system
         */
        initialize() {
            if (this.initialized) return;
            
            try {
                this.setupIntegrationHooks();
                this.setupRegistryIntegration();
                this.initialized = true;
                
                console.log('🔄 Auto-integration system initialized successfully');
            } catch (error) {
                console.error('🔄 Failed to initialize auto-integration:', error);
            }
        }
        
        /**
         * Register a world template for auto-integration
         */
        registerTemplate(templateClass, config = {}) {
            try {
                const templateConfig = templateClass.getConfig ? templateClass.getConfig() : {};
                const metadata = this.generateTemplateMetadata(templateClass, templateConfig, config);
                
                this.registeredTemplates.set(metadata.id, {
                    class: templateClass,
                    metadata: metadata,
                    config: config
                });
                
                // Auto-integrate with existing systems
                this.integrateTemplate(metadata);
                
                console.log('🔄 Auto-registered template:', metadata.id);
                return true;
                
            } catch (error) {
                console.error('🔄 Failed to register template:', error);
                return false;
            }
        }
        
        /**
         * Generate standardized metadata for a template
         */
        generateTemplateMetadata(templateClass, templateConfig, userConfig) {
            return {
                id: templateConfig.id || userConfig.id || 'unknown',
                displayName: templateConfig.displayName || userConfig.displayName || 'Unknown World',
                description: templateConfig.description || userConfig.description || '',
                isPremium: templateConfig.isPremium !== false, // Default to premium
                bundle: templateConfig.bundle || 'premium',
                category: templateConfig.category || 'environment',
                
                // File zone configuration
                fileZones: {
                    inherits: userConfig.fileZones?.inherits || 'green-plane',
                    type: userConfig.fileZones?.type || 'ground-level',
                    customizations: userConfig.fileZones?.customizations || {}
                },
                
                // Integration settings
                integration: {
                    autoMainApplication: userConfig.autoIntegrate?.mainApplication !== false,
                    autoWorldManagement: userConfig.autoIntegrate?.worldManagement !== false,
                    autoSortingManager: userConfig.autoIntegrate?.sortingManager !== false,
                    autoFlutterMenu: userConfig.autoIntegrate?.flutterMenu !== false
                },
                
                // Menu configuration
                menu: {
                    icon: templateConfig.menuIcon || userConfig.menuIcon || 'landscape',
                    priority: userConfig.menuPriority || 100,
                    visible: userConfig.menuVisible !== false
                }
            };
        }
        
        /**
         * Setup integration hooks with existing systems
         */
        setupIntegrationHooks() {
            // Hook into world template registry helper
            if (window.worldTemplateRegistryHelper) {
                this.integrationHooks.set('registry', window.worldTemplateRegistryHelper);
            }
            
            // Hook into main application if available
            if (window.WindowWorldApp) {
                this.setupMainApplicationHook();
            }
            
            // Hook into sorting manager integration
            this.setupSortingManagerHook();
        }
        
        /**
         * Setup registry integration
         */
        setupRegistryIntegration() {
            if (window.worldTemplateRegistryHelper) {
                // Enhance the existing registry helper with our auto-integration
                const originalRegister = window.worldTemplateRegistryHelper.registerNewTemplate;
                
                window.worldTemplateRegistryHelper.registerNewTemplate = (templateClass) => {
                    // Call original registration
                    const result = originalRegister.call(window.worldTemplateRegistryHelper, templateClass);
                    
                    // Add our auto-integration
                    if (result && this.initialized) {
                        this.registerTemplate(templateClass);
                    }
                    
                    return result;
                };
            }
        }
        
        /**
         * Setup main application integration hook
         */
        setupMainApplicationHook() {
            // Create helper function for dynamic template creation
            window.createTemplateFromRegistry = (worldType, THREE, config = {}) => {
                const template = this.registeredTemplates.get(worldType);
                if (template) {
                    try {
                        return new template.class(THREE, config);
                    } catch (error) {
                        console.error(`🔄 Failed to create template ${worldType}:`, error);
                        return null;
                    }
                }
                return null;
            };
        }
        
        /**
         * Setup sorting manager integration hook
         */
        setupSortingManagerHook() {
            // Create helper for dynamic zone creation
            window.getFileZoneConfigForTemplate = (worldType) => {
                const template = this.registeredTemplates.get(worldType);
                if (template) {
                    return template.metadata.fileZones;
                }
                return null;
            };
        }
        
        /**
         * Integrate a template with existing systems
         */
        integrateTemplate(metadata) {
            if (metadata.integration.autoWorldManagement) {
                this.integratePremiumDetection(metadata);
            }
            
            if (metadata.integration.autoFlutterMenu) {
                this.integrateFlutterMenu(metadata);
            }
        }
        
        /**
         * Integrate with premium world detection
         */
        integratePremiumDetection(metadata) {
            // Create dynamic premium detection function if it doesn't exist
            if (!window.isDynamicPremiumWorld) {
                window.isDynamicPremiumWorld = (worldType) => {
                    const template = this.registeredTemplates.get(worldType);
                    return template ? template.metadata.isPremium : false;
                };
            }
        }
        
        /**
         * Integrate with Flutter menu system
         */
        integrateFlutterMenu(metadata) {
            if (metadata.menu.visible) {
                const menuItem = {
                    worldType: metadata.id,
                    title: metadata.displayName,
                    description: metadata.description,
                    icon: metadata.menu.icon,
                    isPremium: metadata.isPremium,
                    priority: metadata.menu.priority
                };
                
                // Store for later Flutter communication
                if (!window.dynamicWorldMenuItems) {
                    window.dynamicWorldMenuItems = [];
                }
                window.dynamicWorldMenuItems.push(menuItem);
                
                console.log('🔄 Added Flutter menu item for:', metadata.id);
            }
        }
        
        /**
         * Check if a world type is registered for auto-integration
         */
        isAutoIntegrated(worldType) {
            return this.registeredTemplates.has(worldType);
        }
        
        /**
         * Get template metadata
         */
        getTemplateMetadata(worldType) {
            const template = this.registeredTemplates.get(worldType);
            return template ? template.metadata : null;
        }
        
        /**
         * Get all registered templates
         */
        getAllRegisteredTemplates() {
            return Array.from(this.registeredTemplates.values()).map(t => t.metadata);
        }
        
        /**
         * Create template instance
         */
        createTemplate(worldType, THREE, config = {}) {
            const template = this.registeredTemplates.get(worldType);
            if (template) {
                try {
                    return new template.class(THREE, config);
                } catch (error) {
                    console.error(`🔄 Failed to create template ${worldType}:`, error);
                    return null;
                }
            }
            return null;
        }
        
        /**
         * Get debug information
         */
        getDebugInfo() {
            return {
                initialized: this.initialized,
                registeredTemplates: Array.from(this.registeredTemplates.keys()),
                integrationHooks: Array.from(this.integrationHooks.keys()),
                templatesCount: this.registeredTemplates.size
            };
        }
    }
    
    // Create global instance
    window.WorldTemplateAutoIntegration = WorldTemplateAutoIntegration;
    window.worldTemplateAutoIntegration = new WorldTemplateAutoIntegration();
    
    // Initialize immediately - world templates need this ready when they load
    window.worldTemplateAutoIntegration.initialize();
    
    console.log('🔄 WorldTemplateAutoIntegration module loaded and initialized');
    
})();

// ============================================================================
// MODULE: modules\premium\desertOasisWorldTemplate.js
// ============================================================================
/**
 * DESERT OASIS WORLD TEMPLATE (Premium)
 * A premium world template featuring a desert environment with oasis elements
 * Uses Green Plane-style movement constraints and SimpleWorldTemplate framework
 * 
 * Features:
 * - Sandy ground plane with desert colors
 * - Palm trees around oasis
 * - Water feature in center
 * - Desert rocks and dunes
 * - Warm desert lighting
 * - Cactus decorations
 */

(function() {
    'use strict';
    
    console.log('🏜️ Loading Desert Oasis World Template...');

    /**
     * Desert Oasis World Template Configuration
     */
    const DesertOasisConfig = {
        id: 'desert-oasis',
        displayName: 'Desert Oasis',
        description: 'Sandy desert with palm trees and oasis water',
        menuIcon: 'landscape', // Flutter icon for menu
        isPremium: true,
        bundle: 'premium',
        category: 'environment',
        
        // Auto-integration configuration
        fileZones: {
            inherits: 'green-plane', // Use Green Plane-style file zones
            type: 'ground-level',
            customizations: {
                // Could add desert-specific zone customizations here
            }
        },
        
        // Technical metadata
        baseTemplate: 'SimpleWorldTemplate',
        complexity: 'medium',
        memoryUsage: 'medium',
        renderingLoad: 'medium',
        
        // Desert lighting - warm and bright
        lighting: {
            ambientLightColor: 0x8B7355,    // Warm sandy ambient
            ambientLightIntensity: 0.7,
            directionalLightColor: 0xFFF8DC, // Warm desert sun
            directionalLightIntensity: 0.9
        },
        
        // Desert atmosphere
        fog: {
            color: 0xD2B48C,  // Sandy/tan fog
            near: 150,
            far: 300
        },
        
        backgroundColor: 0x87CEEB, // Sky blue background
        
        // Ground plane configuration (desert sand)
        groundPlane: {
            size: 300,
            color: 0xC2B280,  // Sandy desert color
            position: { x: 0, y: -0.01, z: 0 }
        },
        
        // Movement constraints (Green Plane style)
        constraints: {
            requiresSupport: true,  // Objects must sit on ground or other objects (like Green Plane)
            allowedStackingDirections: ['top'], // Only stack on top (like Green Plane)
            worldBoundaries: {
                x: { min: -150, max: 150 },
                y: { min: 0, max: 150 },  // Ground level at 0, reasonable stacking limit
                z: { min: -150, max: 150 }
            }
        },
        
        // Camera settings
        camera: {
            minDistance: 1.0,
            maxDistance: 120.0,
            enablePan: true,
            enableZoom: true,
            enableRotate: true
        },
        
        // Home view (match green plane camera settings)
        homeView: {
            x: 0,
            y: 1,      // Landscape default
            z: -13
        },
        
        homeViewTarget: {
            x: 0,
            y: 5,
            z: -15
        },
        
        // Custom setup function
        setupFunction: function() {
            console.log('🏜️ Setting up Desert Oasis environment...');
            
            try {
                // Create the main oasis feature
                this.createOasisCenter();
                
                // Create palm trees around the oasis
                this.createPalmTrees();
                
                // Create desert rocks and features
                this.createDesertRocks();
                
                // Create cacti scattered around
                this.createCacti();
                
                // Create sand dunes
                this.createSandDunes();
                
                // Create desert decorations
                this.createDesertDecorations();
                
                console.log('🏜️ Desert Oasis environment setup complete');
                
            } catch (error) {
                console.error('🏜️ Error setting up Desert Oasis:', error);
                // Fallback to basic environment
                this.createBasicDesert();
            }
        }
    };

    /**
     * Desert Oasis World Template Class
     * Extends SimpleWorldTemplate with desert-specific functionality
     */
    const DesertOasisWorldTemplate = SimpleWorldTemplate.createFromConfig(DesertOasisConfig);
    
    // Add desert-specific methods to the prototype
    DesertOasisWorldTemplate.prototype.createOasisCenter = function() {
        try {
            // Create water feature in center
            const waterGeometry = new this.THREE.CircleGeometry(8, 32);
            const waterMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x006994,  // Oasis water blue
                transparent: true,
                opacity: 0.8
            });
            
            const water = new this.THREE.Mesh(waterGeometry, waterMaterial);
            water.rotation.x = -Math.PI / 2;
            water.position.set(0, 0, 0);
            water.userData.templateObject = true;
            
            this.addTrackedObject(water, 'oasisWater');
            
            // Create water ripple effect (simple animated scaling)
            const rippleGeometry = new this.THREE.RingGeometry(8, 10, 32);
            const rippleMaterial = new this.THREE.MeshBasicMaterial({ 
                color: 0x4682B4,
                transparent: true,
                opacity: 0.3
            });
            
            const ripple = new this.THREE.Mesh(rippleGeometry, rippleMaterial);
            ripple.rotation.x = -Math.PI / 2;
            ripple.position.set(0, 0.01, 0);
            ripple.userData.templateObject = true;
            ripple.userData.isRipple = true;
            
            this.addTrackedObject(ripple, 'waterRipple');
            
            console.log('🏜️ Created oasis water feature');
            
        } catch (error) {
            console.error('🏜️ Error creating oasis center:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createPalmTrees = function() {
        try {
            const palmPositions = [
                { x: 12, z: 12 },
                { x: -12, z: 12 },
                { x: 12, z: -12 },
                { x: -12, z: -12 },
                { x: 15, z: 0 },
                { x: -15, z: 0 },
                { x: 0, z: 15 },
                { x: 0, z: -15 }
            ];
            
            palmPositions.forEach((pos, index) => {
                this.createPalmTree(pos.x, pos.z, index);
            });
            
            console.log(`🏜️ Created ${palmPositions.length} palm trees`);
            
        } catch (error) {
            console.error('🏜️ Error creating palm trees:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createPalmTree = function(x, z, index) {
        try {
            // Create palm tree trunk
            const trunkGeometry = new this.THREE.CylinderGeometry(0.5, 0.8, 8, 8);
            const trunkMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown trunk
            
            const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(x, 4, z);
            trunk.userData.templateObject = true;
            
            this.addTrackedObject(trunk, 'palmTrunk');
            
            // Create palm fronds (simplified)
            for (let i = 0; i < 6; i++) {
                const frondGeometry = new this.THREE.PlaneGeometry(6, 2);
                const frondMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x228B22,  // Palm green
                    side: this.THREE.DoubleSide
                });
                
                const frond = new this.THREE.Mesh(frondGeometry, frondMaterial);
                frond.position.set(x, 8, z);
                frond.rotation.y = (i / 6) * Math.PI * 2;
                frond.rotation.z = Math.PI / 8; // Slight droop
                frond.userData.templateObject = true;
                
                this.addTrackedObject(frond, 'palmFrond');
            }
            
        } catch (error) {
            console.error('🏜️ Error creating palm tree:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createDesertRocks = function() {
        try {
            const rockPositions = [
                { x: 25, z: 20, scale: 1.2 },
                { x: -30, z: 25, scale: 0.8 },
                { x: 35, z: -15, scale: 1.0 },
                { x: -25, z: -30, scale: 1.5 },
                { x: 40, z: 10, scale: 0.9 },
                { x: -20, z: 35, scale: 1.1 }
            ];
            
            rockPositions.forEach((pos, index) => {
                this.createDesertRock(pos.x, pos.z, pos.scale, index);
            });
            
            console.log(`🏜️ Created ${rockPositions.length} desert rocks`);
            
        } catch (error) {
            console.error('🏜️ Error creating desert rocks:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createDesertRock = function(x, z, scale, index) {
        try {
            // Create irregular rock shape
            const rockGeometry = new this.THREE.DodecahedronGeometry(2 * scale, 0);
            const rockMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x8B7D6B  // Desert rock color
            });
            
            const rock = new this.THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(x, 1 * scale, z);
            rock.rotation.y = Math.random() * Math.PI * 2;
            rock.scale.set(
                0.8 + Math.random() * 0.4,
                0.5 + Math.random() * 0.5,
                0.8 + Math.random() * 0.4
            );
            rock.userData.templateObject = true;
            
            this.addTrackedObject(rock, 'desertRock');
            
        } catch (error) {
            console.error('🏜️ Error creating desert rock:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createCacti = function() {
        try {
            const cactusPositions = [
                { x: 50, z: 30 },
                { x: -45, z: 40 },
                { x: 60, z: -20 },
                { x: -55, z: -35 },
                { x: 45, z: 50 },
                { x: -40, z: -45 },
                { x: 55, z: 0 },
                { x: -50, z: 15 }
            ];
            
            cactusPositions.forEach((pos, index) => {
                this.createCactus(pos.x, pos.z, index);
            });
            
            console.log(`🏜️ Created ${cactusPositions.length} cacti`);
            
        } catch (error) {
            console.error('🏜️ Error creating cacti:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createCactus = function(x, z, index) {
        try {
            // Create main cactus body
            const cactusGeometry = new this.THREE.CylinderGeometry(1, 1.2, 4, 8);
            const cactusMaterial = new this.THREE.MeshLambertMaterial({ color: 0x355E3B }); // Cactus green
            
            const cactus = new this.THREE.Mesh(cactusGeometry, cactusMaterial);
            cactus.position.set(x, 2, z);
            cactus.userData.templateObject = true;
            
            this.addTrackedObject(cactus, 'cactus');
            
            // Add cactus arms (sometimes)
            if (Math.random() > 0.5) {
                const armGeometry = new this.THREE.CylinderGeometry(0.6, 0.7, 2, 6);
                const arm = new this.THREE.Mesh(armGeometry, cactusMaterial);
                arm.position.set(x + 1.5, 3, z);
                arm.rotation.z = Math.PI / 6;
                arm.userData.templateObject = true;
                
                this.addTrackedObject(arm, 'cactusArm');
            }
            
        } catch (error) {
            console.error('🏜️ Error creating cactus:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createSandDunes = function() {
        try {
            const dunePositions = [
                { x: 80, z: 60, width: 20, height: 3 },
                { x: -70, z: 80, width: 25, height: 4 },
                { x: 90, z: -50, width: 18, height: 2.5 },
                { x: -85, z: -70, width: 22, height: 3.5 }
            ];
            
            dunePositions.forEach((pos, index) => {
                this.createSandDune(pos.x, pos.z, pos.width, pos.height, index);
            });
            
            console.log(`🏜️ Created ${dunePositions.length} sand dunes`);
            
        } catch (error) {
            console.error('🏜️ Error creating sand dunes:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createSandDune = function(x, z, width, height, index) {
        try {
            // Create sand dune as a flattened sphere
            const duneGeometry = new this.THREE.SphereGeometry(width, 16, 8);
            const duneMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0xDDD7A0  // Light sandy color
            });
            
            const dune = new this.THREE.Mesh(duneGeometry, duneMaterial);
            dune.position.set(x, height / 2, z);
            dune.scale.set(1, height / width, 1); // Flatten it
            dune.userData.templateObject = true;
            
            this.addTrackedObject(dune, 'sandDune');
            
        } catch (error) {
            console.error('🏜️ Error creating sand dune:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createDesertDecorations = function() {
        try {
            // Add some scattered desert plants
            for (let i = 0; i < 15; i++) {
                const x = (Math.random() - 0.5) * 200;
                const z = (Math.random() - 0.5) * 200;
                
                // Skip if too close to oasis center
                if (Math.sqrt(x * x + z * z) < 20) continue;
                
                this.createDesertPlant(x, z, i);
            }
            
            console.log('🏜️ Created desert decorations');
            
        } catch (error) {
            console.error('🏜️ Error creating desert decorations:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createDesertPlant = function(x, z, index) {
        try {
            // Create small desert shrub
            const plantGeometry = new this.THREE.SphereGeometry(0.5, 8, 6);
            const plantMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x6B8E23  // Olive drab
            });
            
            const plant = new this.THREE.Mesh(plantGeometry, plantMaterial);
            plant.position.set(x, 0.3, z);
            plant.scale.set(
                0.5 + Math.random() * 0.5,
                0.3 + Math.random() * 0.4,
                0.5 + Math.random() * 0.5
            );
            plant.userData.templateObject = true;
            
            this.addTrackedObject(plant, 'desertPlant');
            
        } catch (error) {
            console.error('🏜️ Error creating desert plant:', error);
        }
    };
    
    DesertOasisWorldTemplate.prototype.createBasicDesert = function() {
        console.log('🏜️ Creating basic desert fallback environment');
        
        try {
            // Just create a simple water circle and a few basic objects
            const waterGeometry = new this.THREE.CircleGeometry(6, 16);
            const waterMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x006994,
                transparent: true,
                opacity: 0.8
            });
            
            const water = new this.THREE.Mesh(waterGeometry, waterMaterial);
            water.rotation.x = -Math.PI / 2;
            water.position.set(0, 0, 0);
            water.userData.templateObject = true;
            
            this.addTrackedObject(water, 'basicWater');
            
        } catch (error) {
            console.error('🏜️ Error creating basic desert:', error);
        }
    };
    
    // Add static getConfig method for registry helper
    DesertOasisWorldTemplate.getConfig = function() {
        return DesertOasisConfig;
    };
    
// Override getType to ensure proper identification
DesertOasisWorldTemplate.prototype.getType = function() {
    return 'desert-oasis';
};

DesertOasisWorldTemplate.prototype.getDisplayName = function() {
    return 'Desert Oasis';
};

// Override positioning constraints to implement Green Plane-style behavior
DesertOasisWorldTemplate.prototype.applyPositionConstraints = function(object, newPosition, allObjects = []) {
    const constraints = this.getPositioningConstraints();
    
    // Apply world boundaries first
    let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
    let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
    
    // Get object height for proper positioning - check userData first (for contact objects), then geometry parameters
    const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
    
    // Define ground level (same as Green Plane)
    const groundLevelY = 0;
    
    // Check if stacking is enabled and this position is intentional
    const stackingEnabled = window.app?.sortingManager?.stackingConfig?.enabled;
    const isStackedPosition = newPosition.y > (groundLevelY + objectHeight / 2 + 0.1); // More than ground level + small tolerance
    
    let constrainedY;
    if (stackingEnabled && isStackedPosition) {
        // If stacking is enabled and this seems to be a stacked position, respect the Y coordinate
        constrainedY = newPosition.y;
        console.log(`Desert Oasis constraints for ${object.userData.fileName || 'unknown'}:`);
        console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
        console.log(`  Ground level Y: ${groundLevelY}`);
        console.log(`  Object height: ${objectHeight}`);
        console.log(`  Stacking enabled - respecting Y position: ${constrainedY}`);
    } else {
        // Normal ground positioning logic (same as Green Plane)
        constrainedY = groundLevelY + objectHeight / 2; // Position so object bottom sits on ground
        
        console.log(`Desert Oasis constraints for ${object.userData.fileName || 'unknown'}:`);
        console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
        console.log(`  Ground level Y: ${groundLevelY}`);
        console.log(`  Object height: ${objectHeight}`);
        console.log(`  Base constrained Y: ${constrainedY}`);
    }
    
    // DESERT OASIS WORLD: Objects must be supported - check for objects below (same logic as Green Plane)
    if (constraints.requiresSupport && allObjects.length > 0 && !(stackingEnabled && isStackedPosition)) {
        // Only apply support logic if not using stacking system
        const otherObjects = allObjects.filter(obj => obj !== object);
        let supportObject = null;
        let maxSupportHeight = groundLevelY + objectHeight / 2; // Ground level + object center height
        
        // Find the highest object that can support this object at the constrained position
        for (const otherObj of otherObjects) {
            // Get dimensions for support object - check userData first (for contact objects), then geometry parameters
            const otherWidth = otherObj.userData?.objectWidth || otherObj.geometry?.parameters?.width || (otherObj.geometry?.parameters?.radius * 2) || 1;
            const otherDepth = otherObj.userData?.objectDepth || otherObj.geometry?.parameters?.depth || (otherObj.geometry?.parameters?.radius * 2) || 1;
            const otherHeight = otherObj.userData?.objectHeight || otherObj.geometry?.parameters?.height || 1;
            
            const otherHalfWidth = otherWidth / 2;
            const otherHalfDepth = otherDepth / 2;
            
            // Check if the object is close enough to provide support
            if (Math.abs(constrainedX - otherObj.position.x) < otherHalfWidth && 
                Math.abs(constrainedZ - otherObj.position.z) < otherHalfDepth) {
                // Calculate support height: top of supporting object + half height of object being placed
                const supportHeight = otherObj.position.y + otherHeight / 2 + objectHeight / 2;
                
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
        } else {
            // No support found, place on ground (already set above)
            constrainedY = groundLevelY + objectHeight / 2;
            console.log(`  No support found, placing on ground at Y=${constrainedY}`);
        }
    }
    
    const result = {
        x: constrainedX,
        y: constrainedY,
        z: constrainedZ
    };
    
    console.log(`  Final constrained position: (${result.x}, ${result.y}, ${result.z})`);
    return result;
};    // Add animation support for water ripples
    DesertOasisWorldTemplate.prototype.animate = function(time) {
        if (this.scene) {
            // Animate water ripples
            this.scene.traverse(child => {
                if (child.userData && child.userData.isRipple) {
                    child.rotation.z = time * 0.0005;
                    const scale = 1 + Math.sin(time * 0.002) * 0.1;
                    child.scale.set(scale, 1, scale);
                }
            });
        }
    };
    
    // Make available globally
    window.DesertOasisWorldTemplate = DesertOasisWorldTemplate;
    
    // Auto-register with the helper system and new auto-integration
    if (window.worldTemplateRegistryHelper) {
        // Enhanced registration with auto-integration configuration
        const autoIntegrateConfig = {
            fileZones: {
                inherits: 'green-plane',
                type: 'ground-level'
            },
            autoIntegrate: {
                mainApplication: true,
                worldManagement: true,
                sortingManager: true,
                flutterMenu: true
            },
            menu: {
                icon: 'landscape',
                priority: 90, // Higher priority for premium worlds
                visible: true
            }
        };
        
        window.worldTemplateRegistryHelper.registerNewTemplate(DesertOasisWorldTemplate, autoIntegrateConfig);
        console.log('🏜️ Desert Oasis registered with enhanced auto-integration');
    } else {
        console.warn('🏜️ WorldTemplateRegistryHelper not available - registration deferred');
        
        // Fallback: Try to register when helper becomes available
        const registerWhenReady = () => {
            if (window.worldTemplateRegistryHelper) {
                window.worldTemplateRegistryHelper.registerNewTemplate(DesertOasisWorldTemplate);
                console.log('🏜️ Desert Oasis registered (deferred)');
            } else {
                setTimeout(registerWhenReady, 100);
            }
        };
        setTimeout(registerWhenReady, 100);
    }
    
    console.log('🏜️ Desert Oasis World Template loaded successfully!');
    
})();

// ============================================================================
// MODULE: modules\premium\tropicalParadiseWorldTemplate.js
// ============================================================================
/**
 * TROPICAL PARADISE WORLD TEMPLATE (Premium)
 * A premium world template featuring a tropical beach environment with paradise elements
 * Uses Green Plane-style movement constraints and SimpleWorldTemplate framework
 * 
 * Features:
 * - Sandy beach ground plane with tropical colors
 * - Palm trees with coconuts and swaying fronds
 * - Animated water with ripples
 * - Rocky cliffs and lush hills
 * - Tropical sky gradients
 * - Beach decorations and sun
 */

(function() {
    'use strict';
    
    console.log('🌴 Loading Tropical Paradise World Template...');

    /**
     * Tropical Paradise World Template Configuration
     */
    const TropicalParadiseConfig = {
        id: 'tropical-paradise',
        displayName: 'Tropical Paradise',
        description: 'Beautiful tropical beach with palm trees and azure waters',
        menuIcon: 'landscape', // Flutter icon for menu
        isPremium: true,
        bundle: 'premium',
        category: 'environment',
        
        // Auto-integration configuration
        fileZones: {
            inherits: 'green-plane', // Use Green Plane-style file zones
            type: 'ground-level',
            customizations: {
                // Could add tropical-specific zone customizations here
            }
        },
        
        // Technical metadata
        baseTemplate: 'SimpleWorldTemplate',
        complexity: 'medium',
        memoryUsage: 'medium',
        renderingLoad: 'medium',
        
        // Tropical paradise lighting - warm bright beach sunlight
        lighting: {
            ambientLightColor: 0xFFF8DC,    // Cornsilk - warm tropical ambient
            ambientLightIntensity: 0.8,
            directionalLightColor: 0xFFFFE0, // Light yellow sunlight
            directionalLightIntensity: 1.0
        },
        
        // Tropical atmosphere - clear tropical air
        fog: {
            color: 0x87CEEB,  // Sky blue fog
            near: 200,
            far: 400
        },
        
        backgroundColor: 0x87CEEB, // Sky blue background
        
        // Ground plane configuration (sandy beach)
        groundPlane: {
            size: 300,
            color: 0xF5DEB3,  // Wheat/sandy beach color
            position: { x: 0, y: -0.01, z: 0 }
        },
        
        // Movement constraints (Green Plane style)
        constraints: {
            requiresSupport: true,  // Objects must sit on ground or other objects (like Green Plane)
            allowedStackingDirections: ['top'], // Only stack on top (like Green Plane)
            worldBoundaries: {
                x: { min: -150, max: 150 },
                y: { min: 0, max: 150 },  // Ground level at 0, reasonable stacking limit
                z: { min: -150, max: 150 }
            }
        },
        
        // Camera settings
        camera: {
            minDistance: 1.0,
            maxDistance: 120.0,
            enablePan: true,
            enableZoom: true,
            enableRotate: true
        },
        
        // Home view (match green plane camera settings)
        homeView: {
            x: 0,
            y: 1,      // Landscape default
            z: -13
        },
        
        homeViewTarget: {
            x: 0,
            y: 5,
            z: -15
        },
        
        // Custom setup function
        setupFunction: function() {
            console.log('�️ Setting up Tropical Paradise Beach world...');
            
            try {
                // Initialize arrays for tracking different elements
                if (!this.beachElements) this.beachElements = [];
                if (!this.forestElements) this.forestElements = [];
                if (!this.cliffElements) this.cliffElements = [];
                if (!this.palmTrees) this.palmTrees = [];
                if (!this.decorativeElements) this.decorativeElements = [];
                if (!this.tropicalElements) this.tropicalElements = [];
                if (!this.animationMixers) this.animationMixers = [];
                
                // Create the tropical environment in layers
                this.createTropicalSky();
                this.createBeachSand();
                this.createOceanWater();
                this.createLushForestRing();
                this.createDramaticCliffs();
                this.createPalmTreeGroves();
                this.createTropicalSun();
                this.createBeachDecorations();
                this.createTropicalBirds();
                
                console.log('�️ Tropical Paradise Beach world setup complete!');
                
            } catch (error) {
                console.error('🌴 Error setting up Tropical Paradise:', error);
                // Fallback to basic environment
                this.createBasicTropical();
            }
        }
    };

    /**
     * Tropical Paradise World Template Class
     * Extends SimpleWorldTemplate with tropical-specific functionality
     */
    const TropicalParadiseWorldTemplate = SimpleWorldTemplate.createFromConfig(TropicalParadiseConfig);
    
    // Add tropical-specific methods to the prototype
    // === BEACH ENVIRONMENT CREATION METHODS ===
    
    TropicalParadiseWorldTemplate.prototype.createBeachSand = function() {
        try {
            console.log('🏖️ Creating white sand beach...');
            
            // Main beach area - circular sandy beach
            const beachGeometry = new this.THREE.CircleGeometry(60, 32);
            const beachMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0xF5DEB3, // Sandy beige
                transparent: true,
                opacity: 0.9
            });
            
            const beach = new this.THREE.Mesh(beachGeometry, beachMaterial);
            beach.rotation.x = -Math.PI / 2;
            beach.position.y = 0.1;
            beach.userData.templateObject = true;
            this.addTrackedObject(beach, 'mainBeach');
            this.beachElements.push(beach);
            
            // Add beach texture with small sand mounds
            for (let i = 0; i < 15; i++) {
                const moundGeometry = new this.THREE.SphereGeometry(2 + Math.random() * 2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
                const moundMaterial = new this.THREE.MeshLambertMaterial({ color: 0xDEB887 }); // Burlywood
                const mound = new this.THREE.Mesh(moundGeometry, moundMaterial);
                
                const angle = Math.random() * Math.PI * 2;
                const distance = 20 + Math.random() * 30;
                mound.position.set(
                    Math.cos(angle) * distance,
                    0.2,
                    Math.sin(angle) * distance
                );
                mound.userData.templateObject = true;
                this.addTrackedObject(mound, `sandMound_${i}`);
                this.beachElements.push(mound);
            }
            
        } catch (error) {
            console.error('🏖️ Error creating beach sand:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createOceanWater = function() {
        try {
            console.log('🌊 Creating realistic ocean water...');
            
            // Create animated ocean with advanced shader
            const oceanGeometry = new this.THREE.PlaneGeometry(400, 400, 64, 64);
            
            const oceanMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    deepWater: { value: new this.THREE.Color(0x006994) },
                    shallowWater: { value: new this.THREE.Color(0x40E0D0) },
                    foamColor: { value: new this.THREE.Color(0xFFFFFF) },
                    waveHeight: { value: 0.8 },
                    waveSpeed: { value: 1.2 }
                },
                vertexShader: `
                    uniform float time;
                    uniform float waveHeight;
                    uniform float waveSpeed;
                    varying vec2 vUv;
                    varying float vElevation;
                    varying vec3 vPosition;
                    
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        
                        vec3 pos = position;
                        
                        // Multiple wave layers for realistic ocean
                        float wave1 = sin(pos.x * 0.02 + time * waveSpeed) * waveHeight;
                        float wave2 = sin(pos.y * 0.015 + time * waveSpeed * 0.8) * waveHeight * 0.7;
                        float wave3 = sin((pos.x + pos.y) * 0.025 + time * waveSpeed * 1.5) * waveHeight * 0.4;
                        float wave4 = sin(pos.x * 0.05 + pos.y * 0.03 + time * waveSpeed * 2.0) * waveHeight * 0.2;
                        
                        pos.z += wave1 + wave2 + wave3 + wave4;
                        vElevation = wave1 + wave2 + wave3 + wave4;
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 deepWater;
                    uniform vec3 shallowWater;
                    uniform vec3 foamColor;
                    varying vec2 vUv;
                    varying float vElevation;
                    varying vec3 vPosition;
                    
                    void main() {
                        // Distance from center (beach)
                        float distanceFromCenter = length(vPosition.xy);
                        
                        // Water depth effect - shallow near beach, deep far away
                        float depthFactor = smoothstep(60.0, 200.0, distanceFromCenter);
                        vec3 waterColor = mix(shallowWater, deepWater, depthFactor);
                        
                        // Foam on wave peaks
                        float foamMix = smoothstep(0.3, 0.8, vElevation);
                        vec3 finalColor = mix(waterColor, foamColor, foamMix * 0.4);
                        
                        // Transparency - more transparent near shore
                        float alpha = 0.7 + depthFactor * 0.2;
                        
                        gl_FragColor = vec4(finalColor, alpha);
                    }
                `,
                transparent: true,
                side: this.THREE.DoubleSide
            });
            
            this.oceanPlane = new this.THREE.Mesh(oceanGeometry, oceanMaterial);
            this.oceanPlane.rotation.x = -Math.PI / 2;
            this.oceanPlane.position.y = -0.5;
            this.oceanPlane.userData.templateObject = true;
            this.oceanPlane.userData.isAnimated = true;
            this.oceanPlane.userData.oceanMaterial = oceanMaterial;
            
            this.addTrackedObject(this.oceanPlane, 'tropicalOcean');
            
        } catch (error) {
            console.error('🌊 Error creating ocean water:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createLushForestRing = function() {
        try {
            console.log('🌲 Creating lush tropical forest crescent...');
            
            // Create a crescent-shaped forest (like a moon), open toward the ocean (negative Z)
            const forestPositions = [];
            const numForestSections = 10;
            const forestRadius = 80;
            
            // Create forest sections from -120 degrees to +120 degrees (240 degree arc)
            // This leaves the ocean side (negative Z) open
            for (let i = 0; i < numForestSections; i++) {
                const startAngle = -Math.PI * 2/3; // -120 degrees
                const endAngle = Math.PI * 2/3;   // +120 degrees
                const angle = startAngle + (i / (numForestSections - 1)) * (endAngle - startAngle);
                
                forestPositions.push({
                    x: Math.cos(angle) * forestRadius,
                    z: Math.sin(angle) * forestRadius,
                    width: 25 + Math.random() * 10,
                    depth: 20 + Math.random() * 10,
                    height: 12 + Math.random() * 8
                });
            }
            
            forestPositions.forEach((pos, index) => {
                // Create forest base mound
                const forestGeometry = new this.THREE.SphereGeometry(pos.width, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
                const forestMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x228B22 // Forest green
                });
                const forestBase = new this.THREE.Mesh(forestGeometry, forestMaterial);
                
                forestBase.position.set(pos.x, pos.height * 0.3, pos.z);
                forestBase.scale.y = pos.height / pos.width;
                forestBase.userData.templateObject = true;
                this.addTrackedObject(forestBase, `forestBase_${index}`);
                this.forestElements.push(forestBase);
                
                // Add multiple trees on each forest section
                for (let t = 0; t < 4; t++) {
                    const treeHeight = 15 + Math.random() * 10;
                    
                    // Tree trunk
                    const trunkGeometry = new this.THREE.CylinderGeometry(1, 1.5, treeHeight * 0.4);
                    const trunkMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
                    
                    // Tree canopy - multiple spheres for natural look
                    const canopyGeometry = new this.THREE.SphereGeometry(4 + Math.random() * 3, 12, 8);
                    const canopyMaterial = new this.THREE.MeshLambertMaterial({ 
                        color: 0x006400 // Dark green
                    });
                    const canopy = new this.THREE.Mesh(canopyGeometry, canopyMaterial);
                    
                    // Position within forest section
                    const treeAngle = Math.random() * Math.PI * 2;
                    const treeDistance = Math.random() * pos.width * 0.7;
                    const treeX = pos.x + Math.cos(treeAngle) * treeDistance;
                    const treeZ = pos.z + Math.sin(treeAngle) * treeDistance;
                    const treeY = pos.height * 0.6 + Math.random() * 3;
                    
                    trunk.position.set(treeX, treeY + treeHeight * 0.2, treeZ);
                    canopy.position.set(treeX, treeY + treeHeight * 0.7, treeZ);
                    
                    trunk.userData.templateObject = true;
                    canopy.userData.templateObject = true;
                    
                    this.addTrackedObject(trunk, `forestTree_${index}_${t}_trunk`);
                    this.addTrackedObject(canopy, `forestTree_${index}_${t}_canopy`);
                    this.forestElements.push(trunk, canopy);
                }
            });
            
        } catch (error) {
            console.error('🌲 Error creating forest ring:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createDramaticCliffs = function() {
        try {
            console.log('⛰️ Creating dramatic terraced coastal cliffs...');
            
            // Create cliffs only on the land side (positive Z and sides), not ocean side
            const cliffPositions = [
                { x: -130, z: 80, width: 50, height: 45, depth: 35, rotation: 0.3 },   // Left back
                { x: 130, z: 100, width: 45, height: 42, depth: 32, rotation: -0.4 },  // Right back
                { x: 0, z: 140, width: 60, height: 50, depth: 40, rotation: 0.1 },     // Center back
                { x: -100, z: 120, width: 40, height: 38, depth: 30, rotation: 0.2 },  // Left back 2
                { x: 100, z: 130, width: 42, height: 40, depth: 28, rotation: -0.3 }   // Right back 2
            ];
            
            cliffPositions.forEach((cliff, index) => {
                // Create main cliff with terraced levels
                this.createTerracedCliff(cliff, index);
            });
            
        } catch (error) {
            console.error('⛰️ Error creating dramatic cliffs:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createTerracedCliff = function(cliff, index) {
        try {
            // Create main cliff body - tallest level
            const mainCliffGeometry = new this.THREE.BoxGeometry(cliff.width, cliff.height, cliff.depth);
            const cliffMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x696969, // Dim gray
                flatShading: true
            });
            const mainCliff = new this.THREE.Mesh(mainCliffGeometry, cliffMaterial);
            
            mainCliff.position.set(cliff.x, cliff.height / 2, cliff.z);
            mainCliff.rotation.y = cliff.rotation;
            mainCliff.userData.templateObject = true;
            this.addTrackedObject(mainCliff, `mainCliff_${index}`);
            this.cliffElements.push(mainCliff);
            
            // Create terraced levels stepping down - 3 levels on each side
            const numTerraceLevels = 3;
            const terraceStep = 15; // Distance between terraces
            
            for (let side = -1; side <= 1; side += 2) { // -1 for left, +1 for right
                for (let level = 1; level <= numTerraceLevels; level++) {
                    const terraceHeight = cliff.height * (1 - level * 0.25); // Each level 25% shorter
                    const terraceWidth = cliff.width * (1 - level * 0.15);   // Each level narrower
                    const terraceDepth = cliff.depth * (1 - level * 0.1);    // Each level shallower
                    
                    const terraceGeometry = new this.THREE.BoxGeometry(terraceWidth, terraceHeight, terraceDepth);
                    const terrace = new this.THREE.Mesh(terraceGeometry, cliffMaterial);
                    
                    // Position terraces stepping away from main cliff
                    const stepOutDistance = terraceStep * level;
                    const terraceX = cliff.x + side * stepOutDistance * Math.cos(cliff.rotation);
                    const terraceZ = cliff.z + side * stepOutDistance * Math.sin(cliff.rotation);
                    
                    terrace.position.set(terraceX, terraceHeight / 2, terraceZ);
                    terrace.rotation.y = cliff.rotation;
                    terrace.userData.templateObject = true;
                    
                    this.addTrackedObject(terrace, `terrace_${index}_${side}_${level}`);
                    this.cliffElements.push(terrace);
                    
                    // Add rocky details to each terrace
                    for (let r = 0; r < 2; r++) { // Reduced from 3 to 2
                        const rockSize = 1.5 + Math.random() * 2;
                        const rockGeometry = new this.THREE.BoxGeometry(rockSize, rockSize * 0.8, rockSize * 0.6); // Simplified from DodecahedronGeometry
                        const rockMaterial = new this.THREE.MeshLambertMaterial({ 
                            color: 0x778899 // Light slate gray
                        });
                        const rock = new this.THREE.Mesh(rockGeometry, rockMaterial);
                        
                        rock.position.set(
                            terraceX + (Math.random() - 0.5) * terraceWidth * 0.8,
                            terraceHeight * 0.6 + Math.random() * 3,
                            terraceZ + (Math.random() - 0.5) * terraceDepth * 0.8
                        );
                        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                        rock.userData.templateObject = true;
                        
                        this.addTrackedObject(rock, `terraceRock_${index}_${side}_${level}_${r}`);
                        this.cliffElements.push(rock);
                    }
                }
            }
            
            // Add cliff top vegetation - trees and bushes on main cliff
            const vegetationCount = 5 + Math.random() * 2; // Reduced from 8 + random 4
            for (let v = 0; v < vegetationCount; v++) {
                if (Math.random() > 0.5) {
                    // Create trees on cliff top
                    const treeHeight = 12 + Math.random() * 8;
                    const trunkGeometry = new this.THREE.CylinderGeometry(0.8, 1.2, treeHeight * 0.4);
                    const trunkMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
                    
                    const canopyGeometry = new this.THREE.SphereGeometry(3 + Math.random() * 2, 8, 6);
                    const canopyMaterial = new this.THREE.MeshLambertMaterial({ color: 0x228B22 });
                    const canopy = new this.THREE.Mesh(canopyGeometry, canopyMaterial);
                    
                    const treeX = cliff.x + (Math.random() - 0.5) * cliff.width * 0.8;
                    const treeY = cliff.height + treeHeight * 0.2;
                    const treeZ = cliff.z + (Math.random() - 0.5) * cliff.depth * 0.8;
                    
                    trunk.position.set(treeX, treeY, treeZ);
                    canopy.position.set(treeX, treeY + treeHeight * 0.6, treeZ);
                    
                    trunk.userData.templateObject = true;
                    canopy.userData.templateObject = true;
                    
                    this.addTrackedObject(trunk, `cliffTree_${index}_${v}_trunk`);
                    this.addTrackedObject(canopy, `cliffTree_${index}_${v}_canopy`);
                    this.cliffElements.push(trunk, canopy);
                } else {
                    // Create bushes on cliff top
                    const bushGeometry = new this.THREE.SphereGeometry(2 + Math.random() * 1.5, 8, 6);
                    const bushMaterial = new this.THREE.MeshLambertMaterial({ 
                        color: 0x228B22 // Forest green
                    });
                    const bush = new this.THREE.Mesh(bushGeometry, bushMaterial);
                    
                    bush.position.set(
                        cliff.x + (Math.random() - 0.5) * cliff.width * 0.9,
                        cliff.height + 1 + Math.random() * 2,
                        cliff.z + (Math.random() - 0.5) * cliff.depth * 0.9
                    );
                    bush.userData.templateObject = true;
                    
                    this.addTrackedObject(bush, `cliffBush_${index}_${v}`);
                    this.cliffElements.push(bush);
                }
            }
            
            // Add hanging vines on cliff face
            for (let vine = 0; vine < 3; vine++) { // Reduced from 5 to 3
                const vineGeometry = new this.THREE.CylinderGeometry(0.1, 0.2, 8 + Math.random() * 6, 6); // Reduced segments
                const vineMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x556B2F // Dark olive green
                });
                const vineObj = new this.THREE.Mesh(vineGeometry, vineMaterial);
                
                // Position vines hanging from cliff edge
                const vineAngle = Math.random() * Math.PI * 2;
                const vineDistance = cliff.width * 0.4;
                vineObj.position.set(
                    cliff.x + Math.cos(vineAngle) * vineDistance,
                    cliff.height * 0.7,
                    cliff.z + Math.sin(vineAngle) * vineDistance
                );
                vineObj.rotation.x = (Math.random() - 0.5) * 0.3; // Slight sway
                vineObj.userData.templateObject = true;
                vineObj.userData.isSwaying = true;
                vineObj.userData.swayPhase = Math.random() * Math.PI * 2;
                
                this.addTrackedObject(vineObj, `cliffVine_${index}_${vine}`);
                this.cliffElements.push(vineObj);
            }
            
        } catch (error) {
            console.error('⛰️ Error creating terraced cliff:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createPalmTreeGroves = function() {
        try {
            console.log('🌴 Creating palm tree groves along the beach...');
            
            // Create palm groves positioned between the beach and forest crescent
            // Focus more on the sides and back, leaving ocean approach clear
            const grovePositions = [
                { x: -45, z: 35, count: 5, spread: 15 },   // Left side
                { x: 40, z: 30, count: 4, spread: 12 },    // Right side  
                { x: -35, z: 50, count: 6, spread: 18 },   // Left back
                { x: 50, z: 45, count: 4, spread: 14 },    // Right back
                { x: -55, z: 10, count: 5, spread: 16 },   // Left
                { x: 55, z: 15, count: 4, spread: 14 },    // Right
                { x: -20, z: 60, count: 3, spread: 10 },   // Left back edge
                { x: 25, z: 65, count: 3, spread: 12 }     // Right back edge
            ];
            
            grovePositions.forEach((grove, groveIndex) => {
                for (let p = 0; p < grove.count; p++) {
                    const palmX = grove.x + (Math.random() - 0.5) * grove.spread;
                    const palmZ = grove.z + (Math.random() - 0.5) * grove.spread;
                    
                    this.createDetailedPalmTree(palmX, palmZ, groveIndex, p);
                }
            });
            
        } catch (error) {
            console.error('🌴 Error creating palm groves:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createDetailedPalmTree = function(x, z, groveIndex, treeIndex) {
        try {
            const palmHeight = 18 + Math.random() * 8;
            const palmLean = (Math.random() - 0.5) * 0.3; // Natural lean
            
            // Palm trunk with segments for realism
            const segments = 4; // Reduced from 6 to 4
            const segmentHeight = palmHeight / segments;
            
            for (let s = 0; s < segments; s++) {
                const segmentRadius = 1.2 - (s * 0.1); // Tapers toward top
                const trunkGeometry = new this.THREE.CylinderGeometry(
                    segmentRadius * 0.8, segmentRadius, segmentHeight, 6 // Reduced from 8 to 6 segments
                );
                const trunkMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x8B4513 // Saddle brown
                });
                const segment = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
                
                segment.position.set(
                    x + palmLean * s * 0.5,
                    segmentHeight * (s + 0.5),
                    z
                );
                segment.userData.templateObject = true;
                
                this.addTrackedObject(segment, `palm_${groveIndex}_${treeIndex}_segment_${s}`);
                this.palmTrees.push(segment);
            }
            
            // Palm fronds - 6 large fronds in crown (reduced from 8)
            for (let f = 0; f < 6; f++) {
                const frondAngle = (f / 6) * Math.PI * 2;
                const frondLength = 8 + Math.random() * 4;
                
                // Frond stem
                const stemGeometry = new this.THREE.CylinderGeometry(0.2, 0.3, frondLength, 6); // Reduced segments
                const stemMaterial = new this.THREE.MeshLambertMaterial({ color: 0x228B22 });
                const stem = new this.THREE.Mesh(stemGeometry, stemMaterial);
                
                // Frond leaves - simplified geometry
                const leafGeometry = new this.THREE.PlaneGeometry(frondLength * 0.8, 2);
                const leafMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x228B22,
                    side: this.THREE.DoubleSide
                });
                const leaf = new this.THREE.Mesh(leafGeometry, leafMaterial);
                
                const frondX = x + palmLean * segments * 0.5;
                const frondY = palmHeight;
                const frondZ = z;
                
                // Position and rotate fronds naturally
                stem.position.set(frondX, frondY, frondZ);
                stem.rotation.z = Math.cos(frondAngle) * 0.6;
                stem.rotation.x = Math.sin(frondAngle) * 0.6;
                stem.rotation.y = frondAngle;
                
                leaf.position.copy(stem.position);
                leaf.position.y += frondLength * 0.3;
                leaf.rotation.copy(stem.rotation);
                leaf.rotation.z += (Math.random() - 0.5) * 0.3;
                
                stem.userData.templateObject = true;
                leaf.userData.templateObject = true;
                stem.userData.isSwaying = true;
                leaf.userData.isSwaying = true;
                stem.userData.swayPhase = Math.random() * Math.PI * 2;
                leaf.userData.swayPhase = stem.userData.swayPhase;
                
                this.addTrackedObject(stem, `palm_${groveIndex}_${treeIndex}_frond_${f}_stem`);
                this.addTrackedObject(leaf, `palm_${groveIndex}_${treeIndex}_frond_${f}_leaf`);
                this.palmTrees.push(stem, leaf);
            }
            
            // Coconuts hanging from some palms
            if (Math.random() > 0.4) {
                for (let c = 0; c < 2; c++) { // Reduced from 3 to 2 coconuts
                    const coconutGeometry = new this.THREE.SphereGeometry(0.8, 6, 4); // Reduced from 8,6 to 6,4
                    const coconutMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const coconut = new this.THREE.Mesh(coconutGeometry, coconutMaterial);
                    
                    const coconutAngle = Math.random() * Math.PI * 2;
                    coconut.position.set(
                        x + palmLean * segments * 0.5 + Math.cos(coconutAngle) * 2,
                        palmHeight - 2 - Math.random() * 3,
                        z + Math.sin(coconutAngle) * 2
                    );
                    coconut.userData.templateObject = true;
                    
                    this.addTrackedObject(coconut, `coconut_${groveIndex}_${treeIndex}_${c}`);
                    this.palmTrees.push(coconut);
                }
            }
            
        } catch (error) {
            console.error('🌴 Error creating detailed palm tree:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createTropicalSky = function() {
        try {
            console.log('🌅 Creating dramatic tropical sunset sky...');
            
            // Create sky gradient with tropical sunset colors
            const skyGeometry = new this.THREE.SphereGeometry(500, 32, 15);
            const skyMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    topColor: { value: new this.THREE.Color(0xFF6B35) },    // Sunset orange
                    middleColor: { value: new this.THREE.Color(0xFF8E53) }, // Light orange
                    bottomColor: { value: new this.THREE.Color(0x87CEEB) }, // Sky blue
                    offset: { value: 33 },
                    exponent: { value: 0.6 }
                },
                vertexShader: `
                    varying vec3 vWorldPosition;
                    void main() {
                        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = worldPosition.xyz;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 topColor;
                    uniform vec3 middleColor;
                    uniform vec3 bottomColor;
                    uniform float offset;
                    uniform float exponent;
                    varying vec3 vWorldPosition;
                    void main() {
                        float h = normalize(vWorldPosition).y;
                        float ramp = max(offset, pow(max(h, 0.0), exponent));
                        
                        // Three-color gradient for tropical sunset
                        vec3 color;
                        if (h > 0.3) {
                            color = mix(middleColor, topColor, (h - 0.3) / 0.7);
                        } else {
                            color = mix(bottomColor, middleColor, h / 0.3);
                        }
                        
                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
                side: this.THREE.BackSide
            });
            
            const skyDome = new this.THREE.Mesh(skyGeometry, skyMaterial);
            skyDome.position.y = 0;
            skyDome.userData.templateObject = true;
            this.addTrackedObject(skyDome, 'tropicalSky');
            
        } catch (error) {
            console.error('🌅 Error creating tropical sky:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createTropicalBirds = function() {
        try {
            console.log('🦅 Creating tropical birds...');
            
            // Create a few flying birds for ambiance
            for (let b = 0; b < 4; b++) {
                const birdGeometry = new this.THREE.SphereGeometry(0.8, 6, 4);
                const birdMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x8B0000 // Dark red - tropical bird
                });
                const bird = new this.THREE.Mesh(birdGeometry, birdMaterial);
                
                bird.position.set(
                    (Math.random() - 0.5) * 200,
                    30 + Math.random() * 20,
                    (Math.random() - 0.5) * 200
                );
                bird.userData.templateObject = true;
                bird.userData.isFlying = true;
                bird.userData.flySpeed = 0.5 + Math.random() * 0.5;
                bird.userData.flyRadius = 50 + Math.random() * 30;
                bird.userData.flyAngle = Math.random() * Math.PI * 2;
                
                this.addTrackedObject(bird, `tropicalBird_${b}`);
                this.decorativeElements.push(bird);
            }
            
        } catch (error) {
            console.error('🦅 Error creating tropical birds:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createPalmTrees = function() {
        try {
            console.log('🌴 Creating tropical palm trees...');
            
            // Initialize palmTrees array if not exists
            if (!this.palmTrees) this.palmTrees = [];
            
            const palmPositions = [
                { x: -60, z: 40 }, { x: 60, z: 40 }, { x: -40, z: -20 }, 
                { x: 40, z: -20 }, { x: -80, z: 0 }, { x: 80, z: 0 },
                { x: -30, z: 60 }, { x: 30, z: 60 }
            ];
            
            palmPositions.forEach((pos, index) => {
                this.createPalmTree(pos.x, pos.z);
            });
            
            console.log(`🌴 Created ${palmPositions.length} palm trees`);
            
        } catch (error) {
            console.error('🌴 Error creating palm trees:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createPalmTree = function(x, z) {
        try {
            // Create palm trunk with natural curve
            const trunkGeometry = new this.THREE.CylinderGeometry(0.8, 1.2, 20, 8);
            const trunkMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Saddle brown
            
            const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(x, 10, z);
            trunk.rotation.z = (Math.random() - 0.5) * 0.3; // Slight natural lean
            trunk.userData.templateObject = true;
            
            this.palmTrees.push(trunk);
            this.addTrackedObject(trunk, `palmTrunk_${this.palmTrees.length}`);
            
            // Create coconuts
            for (let c = 0; c < 3; c++) {
                const coconutGeometry = new this.THREE.SphereGeometry(0.8, 8, 6);
                const coconutMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
                const coconut = new this.THREE.Mesh(coconutGeometry, coconutMaterial);
                coconut.position.set(
                    x + (Math.random() - 0.5) * 3, 
                    18 + Math.random() * 2, 
                    z + (Math.random() - 0.5) * 3
                );
                coconut.userData.templateObject = true;
                
                this.addTrackedObject(coconut, `coconut_${this.palmTrees.length}_${c}`);
            }
            
            // Create palm fronds
            for (let i = 0; i < 12; i++) {
                const frondGeometry = new this.THREE.PlaneGeometry(15, 4);
                const frondMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x228B22,  // Forest green
                    side: this.THREE.DoubleSide
                });
                
                const frond = new this.THREE.Mesh(frondGeometry, frondMaterial);
                frond.position.set(x, 19, z);
                frond.rotation.y = (i / 12) * Math.PI * 2;
                frond.rotation.x = -0.4 + Math.random() * 0.2; // Natural droop with variation
                frond.userData.templateObject = true;
                frond.userData.isSwaying = true;
                frond.userData.swayPhase = Math.random() * Math.PI * 2;
                
                this.addTrackedObject(frond, `palmFrond_${this.palmTrees.length}_${i}`);
            }
            
        } catch (error) {
            console.error('🌴 Error creating palm tree:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createAnimatedWater = function() {
        try {
            console.log('🌊 Creating animated tropical water with shader effects...');
            
            // Create animated water with sophisticated shader
            const waterGeometry = new this.THREE.PlaneGeometry(200, 200, 50, 50);
            
            const waterMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    waterColor: { value: new this.THREE.Color(0x0099CC) },
                    foamColor: { value: new this.THREE.Color(0xFFFFFF) }
                },
                vertexShader: `
                    uniform float time;
                    varying vec2 vUv;
                    varying float vElevation;
                    
                    void main() {
                        vUv = uv;
                        
                        vec3 pos = position;
                        
                        // Create ripple effect with multiple waves
                        float wave1 = sin(pos.x * 0.5 + time * 2.0) * 0.3;
                        float wave2 = sin(pos.y * 0.3 + time * 1.5) * 0.2;
                        float wave3 = sin((pos.x + pos.y) * 0.4 + time * 1.0) * 0.15;
                        
                        pos.z += wave1 + wave2 + wave3;
                        vElevation = wave1 + wave2 + wave3;
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 waterColor;
                    uniform vec3 foamColor;
                    varying vec2 vUv;
                    varying float vElevation;
                    
                    void main() {
                        // Mix water color with foam on wave peaks
                        float foamMix = smoothstep(0.2, 0.5, vElevation);
                        vec3 color = mix(waterColor, foamColor, foamMix * 0.3);
                        
                        gl_FragColor = vec4(color, 0.7);
                    }
                `,
                transparent: true,
                side: this.THREE.DoubleSide
            });
            
            this.waterPlane = new this.THREE.Mesh(waterGeometry, waterMaterial);
            this.waterPlane.rotation.x = -Math.PI / 2;
            this.waterPlane.position.y = 0.1; // Slightly above ground
            this.waterPlane.userData.templateObject = true;
            this.waterPlane.userData.isAnimated = true;
            this.waterPlane.userData.waterMaterial = waterMaterial;
            
            this.addTrackedObject(this.waterPlane, 'tropicalWater');
            
        } catch (error) {
            console.error('🌊 Error creating animated water:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createRockyCliffs = function() {
        try {
            console.log('🏔️ Creating rocky tropical cliffs...');
            
            const cliffPositions = [
                { x: -80, z: -80, width: 30, height: 15, depth: 20 },
                { x: 80, z: 70, width: 25, height: 20, depth: 25 },
                { x: -70, z: 80, width: 35, height: 18, depth: 20 },
                { x: 85, z: -60, width: 28, height: 16, depth: 22 }
            ];
            
            cliffPositions.forEach((pos, index) => {
                const cliffGeometry = new this.THREE.BoxGeometry(pos.width, pos.height, pos.depth);
                const cliffMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x696969, // Dim gray
                    flatShading: true
                });
                const cliff = new this.THREE.Mesh(cliffGeometry, cliffMaterial);
                
                cliff.position.set(pos.x, pos.height / 2, pos.z);
                cliff.rotation.y = Math.random() * Math.PI / 4; // Slight random rotation
                cliff.userData.templateObject = true;
                cliff.userData.isCliff = true;
                
                this.addTrackedObject(cliff, `cliff_${index}`);
                
                // Add some smaller rocky outcroppings for detail
                for (let r = 0; r < 2; r++) {
                    const rockGeometry = new this.THREE.DodecahedronGeometry(1.5 + Math.random() * 1, 0);
                    const rockMaterial = new this.THREE.MeshLambertMaterial({ color: 0x778899 });
                    const rock = new this.THREE.Mesh(rockGeometry, rockMaterial);
                    rock.position.set(
                        pos.x + (Math.random() - 0.5) * pos.width * 1.2,
                        Math.random() * 3,
                        pos.z + (Math.random() - 0.5) * pos.depth * 1.2
                    );
                    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    rock.userData.templateObject = true;
                    
                    this.addTrackedObject(rock, `cliffRock_${index}_${r}`);
                }
            });
            
        } catch (error) {
            console.error('🏔️ Error creating rocky cliffs:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createLushHills = function() {
        try {
            console.log('🌿 Creating lush tropical hills...');
            
            const hillPositions = [
                { x: 60, z: 50, radius: 25, height: 12 },
                { x: -65, z: 40, radius: 20, height: 10 },
                { x: 50, z: -70, radius: 22, height: 11 },
                { x: -50, z: -60, radius: 18, height: 9 }
            ];
            
            hillPositions.forEach((pos, index) => {
                // Create rounded hill with proper hemisphere geometry
                const hillGeometry = new this.THREE.SphereGeometry(pos.radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
                const hillMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x4A9F4A // Medium green - more natural color
                });
                const hill = new this.THREE.Mesh(hillGeometry, hillMaterial);
                
                hill.position.set(pos.x, 0, pos.z);
                hill.scale.y = pos.height / pos.radius; // Flatten to create natural hill shape
                hill.userData.templateObject = true;
                hill.userData.isHill = true;
                
                this.addTrackedObject(hill, `hill_${index}`);
                
                // Add some vegetation on hills
                for (let v = 0; v < 5; v++) {
                    const bushGeometry = new this.THREE.SphereGeometry(1 + Math.random() * 1.5, 8, 6);
                    const bushMaterial = new this.THREE.MeshLambertMaterial({ 
                        color: 0x228B22 // Darker green for contrast
                    });
                    const bush = new this.THREE.Mesh(bushGeometry, bushMaterial);
                    
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * pos.radius * 0.8;
                    bush.position.set(
                        pos.x + Math.cos(angle) * distance,
                        pos.height * 0.7 + Math.random() * 2,
                        pos.z + Math.sin(angle) * distance
                    );
                    bush.userData.templateObject = true;
                    
                    this.addTrackedObject(bush, `hillBush_${index}_${v}`);
                }
            });
            
        } catch (error) {
            console.error('🌿 Error creating lush hills:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createSun = function() {
        try {
            console.log('☀️ Creating tropical sun...');
            
            const sunGeometry = new this.THREE.SphereGeometry(8, 32, 16);
            const sunMaterial = new this.THREE.MeshBasicMaterial({ 
                color: 0xFFD700,  // Gold
                emissive: 0xFFD700,
                emissiveIntensity: 0.3
            });
            
            const sun = new this.THREE.Mesh(sunGeometry, sunMaterial);
            sun.position.set(100, 80, -100);
            sun.userData.templateObject = true;
            sun.userData.isGlowing = true;
            
            this.addTrackedObject(sun, 'tropicalSun');
            
        } catch (error) {
            console.error('☀️ Error creating sun:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createBeachDecorations = function() {
        try {
            console.log('🏖️ Creating coastal beach decorations...');
            
            // Seashells scattered along the shoreline
            const shellPositions = [
                { x: -20, z: -10 }, { x: 25, z: -15 }, { x: -15, z: -20 }, 
                { x: 30, z: -8 }, { x: -10, z: -25 }, { x: 18, z: -12 },
                { x: 5, z: -18 }, { x: -30, z: -5 }, { x: 35, z: -22 }
            ];
            
            shellPositions.forEach((pos, index) => {
                const shellGeometry = new this.THREE.ConeGeometry(0.5, 1, 8);
                const shellMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: [0xFFF8DC, 0xF5DEB3, 0xDDA0DD, 0xFFB6C1][Math.floor(Math.random() * 4)]
                });
                const shell = new this.THREE.Mesh(shellGeometry, shellMaterial);
                shell.position.set(pos.x, 0.3, pos.z);
                shell.rotation.z = Math.random() * Math.PI * 2;
                shell.userData.templateObject = true;
                
                this.addTrackedObject(shell, `seashell_${index}`);
                this.decorativeElements.push(shell);
            });
            
            // Driftwood along the beach
            for (let d = 0; d < 6; d++) {
                const driftwoodGeometry = new this.THREE.CylinderGeometry(0.5, 0.8, 4 + Math.random() * 3);
                const driftwoodMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B7355 }); // Burlywood
                const driftwood = new this.THREE.Mesh(driftwoodGeometry, driftwoodMaterial);
                
                const angle = Math.random() * Math.PI;
                const distance = 35 + Math.random() * 15;
                driftwood.position.set(
                    Math.cos(angle) * distance * (Math.random() > 0.5 ? 1 : -1),
                    0.5,
                    -10 - Math.random() * 15
                );
                driftwood.rotation.y = Math.random() * Math.PI * 2;
                driftwood.rotation.z = (Math.random() - 0.5) * 0.5;
                driftwood.userData.templateObject = true;
                
                this.addTrackedObject(driftwood, `driftwood_${d}`);
                this.decorativeElements.push(driftwood);
            }
            
            // Beach grasses near the forest edge
            const grassPositions = [
                { x: -60, z: 45 }, { x: 60, z: 45 }, { x: -45, z: 55 }, 
                { x: 45, z: 55 }, { x: -70, z: 25 }, { x: 70, z: 25 }
            ];
            
            grassPositions.forEach((pos, index) => {
                // Create clumps of beach grass
                for (let g = 0; g < 8; g++) {
                    const grassGeometry = new this.THREE.CylinderGeometry(0.1, 0.2, 2 + Math.random() * 2);
                    const grassMaterial = new this.THREE.MeshLambertMaterial({ color: 0x9ACD32 }); // Yellow green
                    const grass = new this.THREE.Mesh(grassGeometry, grassMaterial);
                    
                    grass.position.set(
                        pos.x + (Math.random() - 0.5) * 8,
                        1 + Math.random(),
                        pos.z + (Math.random() - 0.5) * 8
                    );
                    grass.rotation.x = (Math.random() - 0.5) * 0.3;
                    grass.rotation.z = (Math.random() - 0.5) * 0.3;
                    grass.userData.templateObject = true;
                    grass.userData.isSwaying = true;
                    grass.userData.swayPhase = Math.random() * Math.PI * 2;
                    
                    this.addTrackedObject(grass, `beachGrass_${index}_${g}`);
                    this.decorativeElements.push(grass);
                }
            });
            
        } catch (error) {
            console.error('🏖️ Error creating beach decorations:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createBasicTropical = function() {
        console.log('🌴 Creating basic tropical fallback environment');
        
        try {
            // Just create a simple water area and a few basic objects
            const waterGeometry = new this.THREE.CircleGeometry(8, 16);
            const waterMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x006994,
                transparent: true,
                opacity: 0.8
            });
            
            const water = new this.THREE.Mesh(waterGeometry, waterMaterial);
            water.rotation.x = -Math.PI / 2;
            water.position.set(0, 0, -30); // Behind the center
            water.userData.templateObject = true;
            
            this.addTrackedObject(water, 'basicTropicalWater');
            
        } catch (error) {
            console.error('🌴 Error creating basic tropical:', error);
        }
    };
    
    // Override positioning constraints to implement Green Plane-style behavior
    TropicalParadiseWorldTemplate.prototype.applyPositionConstraints = function(object, newPosition, allObjects = []) {
        const constraints = this.getPositioningConstraints();
        
        // Apply world boundaries first
        let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
        let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
        
        // Get object height for proper positioning - check userData first (for contact objects), then geometry parameters
        const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
        
        // Define ground level (same as Green Plane)
        const groundLevelY = 0;
        
        // Check if stacking is enabled and this position is intentional
        const stackingEnabled = window.app?.sortingManager?.stackingConfig?.enabled;
        const isStackedPosition = newPosition.y > (groundLevelY + objectHeight / 2 + 0.1); // More than ground level + small tolerance
        
        let constrainedY;
        if (stackingEnabled && isStackedPosition) {
            // If stacking is enabled and this seems to be a stacked position, respect the Y coordinate
            constrainedY = newPosition.y;
            console.log(`Tropical Paradise constraints for ${object.userData.fileName || 'unknown'}:`);
            console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
            console.log(`  Ground level Y: ${groundLevelY}`);
            console.log(`  Object height: ${objectHeight}`);
            console.log(`  Stacking enabled - respecting Y position: ${constrainedY}`);
        } else {
            // Normal ground positioning logic (same as Green Plane)
            constrainedY = groundLevelY + objectHeight / 2; // Position so object bottom sits on ground
            
            console.log(`Tropical Paradise constraints for ${object.userData.fileName || 'unknown'}:`);
            console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
            console.log(`  Ground level Y: ${groundLevelY}`);
            console.log(`  Object height: ${objectHeight}`);
            console.log(`  Base constrained Y: ${constrainedY}`);
        }
        
        // TROPICAL PARADISE WORLD: Objects must be supported - check for objects below (same logic as Green Plane)
        if (constraints.requiresSupport && allObjects.length > 0 && !(stackingEnabled && isStackedPosition)) {
            // Only apply support logic if not using stacking system
            const otherObjects = allObjects.filter(obj => obj !== object);
            let supportObject = null;
            let maxSupportHeight = groundLevelY + objectHeight / 2; // Ground level + object center height
            
            // Find the highest object that can support this object at the constrained position
            for (const otherObj of otherObjects) {
                // Get dimensions for support object - check userData first (for contact objects), then geometry parameters
                const otherWidth = otherObj.userData?.objectWidth || otherObj.geometry?.parameters?.width || (otherObj.geometry?.parameters?.radius * 2) || 1;
                const otherDepth = otherObj.userData?.objectDepth || otherObj.geometry?.parameters?.depth || (otherObj.geometry?.parameters?.radius * 2) || 1;
                const otherHeight = otherObj.userData?.objectHeight || otherObj.geometry?.parameters?.height || 1;
                
                const otherHalfWidth = otherWidth / 2;
                const otherHalfDepth = otherDepth / 2;
                
                // Check if the object is close enough to provide support
                if (Math.abs(constrainedX - otherObj.position.x) < otherHalfWidth && 
                    Math.abs(constrainedZ - otherObj.position.z) < otherHalfDepth) {
                    // Calculate support height: top of supporting object + half height of object being placed
                    const supportHeight = otherObj.position.y + otherHeight / 2 + objectHeight / 2;
                    
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
            } else {
                // No support found, place on ground (already set above)
                constrainedY = groundLevelY + objectHeight / 2;
                console.log(`  No support found, placing on ground at Y=${constrainedY}`);
            }
        }
        
        const result = {
            x: constrainedX,
            y: constrainedY,
            z: constrainedZ
        };
        
        console.log(`  Final constrained position: (${result.x}, ${result.y}, ${result.z})`);
        return result;
    };
    
    // Animation Update
    TropicalParadiseWorldTemplate.prototype.update = function(deltaTime) {
        try {
            const time = Date.now() * 0.001;
            
            // Animate ocean waves
            if (this.oceanPlane && this.oceanPlane.userData.oceanMaterial) {
                this.oceanPlane.userData.oceanMaterial.uniforms.time.value = time;
            }
            
            // Animate palm fronds swaying and flying birds
            if (this.trackedObjects) {
                Object.keys(this.trackedObjects).forEach(key => {
                    const obj = this.trackedObjects[key];
                    
                    // Animate palm fronds and vegetation swaying in the breeze
                    if (obj.userData && obj.userData.isSwaying) {
                        const swayPhase = obj.userData.swayPhase || 0;
                        
                        // Different sway patterns for different objects
                        if (obj.geometry && obj.geometry.type === 'CylinderGeometry') {
                            // Vines and grass - more dramatic sway
                            obj.rotation.z = Math.sin(time * 1.2 + swayPhase) * 0.2;
                            obj.rotation.x = Math.cos(time * 0.9 + swayPhase) * 0.1;
                        } else {
                            // Palm fronds - gentle sway
                            obj.rotation.z = Math.sin(time * 0.8 + swayPhase) * 0.15;
                            obj.rotation.x += Math.sin(time * 0.6 + swayPhase) * 0.02;
                        }
                    }
                    
                    // Animate flying birds
                    if (obj.userData && obj.userData.isFlying) {
                        obj.userData.flyAngle += obj.userData.flySpeed * deltaTime;
                        obj.position.x = Math.cos(obj.userData.flyAngle) * obj.userData.flyRadius;
                        obj.position.z = Math.sin(obj.userData.flyAngle) * obj.userData.flyRadius;
                        obj.position.y += Math.sin(time * 2 + obj.userData.flyAngle) * 0.5; // Gentle up/down movement
                        obj.rotation.y = obj.userData.flyAngle + Math.PI / 2; // Face flight direction
                    }
                });
            }
            
            // Update animation mixers
            if (this.animationMixers && this.animationMixers.length > 0) {
                this.animationMixers.forEach(mixer => {
                    mixer.update(deltaTime);
                });
            }
            
        } catch (error) {
            console.error('�️ Error in tropical paradise update:', error);
        }
    };
    
    // Cleanup and Disposal
    TropicalParadiseWorldTemplate.prototype.cleanupEnvironment = function() {
        console.log('🌴 Cleaning up Tropical Paradise environment...');
        
        // Clean up tracked objects
        this.trackedObjects.forEach(obj => {
            if (obj && this.scene && obj.parent === this.scene) {
                this.scene.remove(obj);
                
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(mat => mat.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            }
        });
        
        this.palmTrees = [];
        this.tropicalElements = [];
        this.animationMixers = [];
        this.trackedObjects.clear();
        
        console.log('🌴 Tropical Paradise cleanup complete');
    };

    TropicalParadiseWorldTemplate.prototype.dispose = function() {
        try {
            console.log('🌴 Disposing tropical paradise resources...');
            
            // Clear tropical-specific arrays
            this.palmTrees = [];
            this.tropicalElements = [];
            
            // Dispose animation mixers
            if (this.animationMixers) {
                this.animationMixers.forEach(mixer => {
                    if (mixer.dispose) mixer.dispose();
                });
                this.animationMixers = [];
            }
            
            this.waterPlane = null;
            
            // Call parent dispose if available
            if (this.cleanupEnvironment) {
                this.cleanupEnvironment();
            }
            
        } catch (error) {
            console.error('🌴 Error disposing tropical paradise:', error);
        }
    };
    
    // Add static getConfig method for registry helper
    TropicalParadiseWorldTemplate.getConfig = function() {
        return TropicalParadiseConfig;
    };
    
    // Override getType to ensure proper identification
    TropicalParadiseWorldTemplate.prototype.getType = function() {
        return 'tropical-paradise';
    };

    TropicalParadiseWorldTemplate.prototype.getDisplayName = function() {
        return 'Tropical Paradise';
    };
    
    // Make available globally
    window.TropicalParadiseWorldTemplate = TropicalParadiseWorldTemplate;
    
    // Auto-register with the helper system and new auto-integration
    if (window.worldTemplateRegistryHelper) {
        // Enhanced registration with auto-integration configuration
        const autoIntegrateConfig = {
            fileZones: {
                inherits: 'green-plane',
                type: 'ground-level'
            },
            autoIntegrate: {
                mainApplication: true,
                worldManagement: true,
                sortingManager: true,
                flutterMenu: true
            },
            menu: {
                icon: 'landscape',
                priority: 95, // Higher priority for premium worlds
                visible: true
            }
        };
        
        window.worldTemplateRegistryHelper.registerNewTemplate(TropicalParadiseWorldTemplate, autoIntegrateConfig);
        console.log('🌴 Tropical Paradise registered with enhanced auto-integration');
    } else {
        console.warn('🌴 WorldTemplateRegistryHelper not available - registration deferred');
        
        // Fallback: Try to register when helper becomes available
        const registerWhenReady = () => {
            if (window.worldTemplateRegistryHelper) {
                window.worldTemplateRegistryHelper.registerNewTemplate(TropicalParadiseWorldTemplate);
                console.log('🌴 Tropical Paradise registered (deferred)');
            } else {
                setTimeout(registerWhenReady, 100);
            }
        };
        setTimeout(registerWhenReady, 100);
    }
    
    console.log('🌴 Tropical Paradise World Template loaded successfully!');

})();

// ============================================================================
// MODULE: modules\premium\flowerWonderlandWorldTemplate.js
// ============================================================================
/**
 * FLOWER WONDERLAND WORLD TEMPLATE (Premium)
 * A premium world template featuring a colorful flower field environment
 * Uses Green Plane-style movement constraints and SimpleWorldTemplate framework
 * 
 * Features:
 * - Lush green grass ground plane
 * - Colorful flowers (daisies, roses, sunflowers, tulips, pansies)
 * - Swaying flower animations
 * - Hedge formations
 * - Tree groves
 * - Beautiful sky with clouds
 */

(function() {
    'use strict';
    
    console.log('� Loading Flower Wonderland World Template...');

    /**
     * Flower Wonderland World Template Configuration
     */
    const FlowerWonderlandConfig = {
        id: 'flower-wonderland',
        displayName: 'Flower Wonderland',
        description: 'Beautiful field of colorful flowers with hedges and tree groves',
        menuIcon: 'flower', // Flutter icon for menu
        isPremium: true,
        bundle: 'premium',
        category: 'environment',
        
        // Auto-integration configuration
        fileZones: {
            inherits: 'green-plane', // Use Green Plane-style file zones
            type: 'ground-level',
            customizations: {
                // Could add flower-specific zone customizations here
            }
        },
        
        // Technical metadata
        baseTemplate: 'SimpleWorldTemplate',
        complexity: 'medium',
        memoryUsage: 'medium',
        renderingLoad: 'medium',
        
        // Flower wonderland lighting - romantic sunset atmosphere
        lighting: {
            ambientLightColor: 0xFFE4E1,    // Misty rose ambient (softer, romantic)
            ambientLightIntensity: 0.7,
            directionalLightColor: 0xFFD700, // Golden sunlight (matching sunset)
            directionalLightIntensity: 0.8
        },
        
        // Flower wonderland atmosphere - light pink fog
        fog: {
            color: 0xFFB6C1,  // Light pink fog (matches sky gradient)
            near: 150,
            far: 500
        },
        
        backgroundColor: 0xFF8C42, // Sunset orange background (seamless horizon)
        
        // Ground plane configuration (lush grass)
        groundPlane: {
            size: 300,
            color: 0x32CD32,  // Lime green - vibrant grass
            position: { x: 0, y: -0.01, z: 0 }
        },
        
        // Movement constraints (Green Plane style)
        constraints: {
            requiresSupport: true,  // Objects must sit on ground or other objects (like Green Plane)
            allowedStackingDirections: ['top'], // Only stack on top (like Green Plane)
            worldBoundaries: {
                x: { min: -150, max: 150 },
                y: { min: 0, max: 150 },  // Ground level at 0, reasonable stacking limit
                z: { min: -150, max: 150 }
            }
        },
        
        // Camera settings
        camera: {
            minDistance: 1.0,
            maxDistance: 120.0,
            enablePan: true,
            enableZoom: true,
            enableRotate: true
        },
        
        // Home view (match green plane camera settings)
        homeView: {
            x: 0,
            y: 1,      // Landscape default
            z: -13
        },
        
        homeViewTarget: {
            x: 0,
            y: 5,
            z: -15
        },
        
        // Custom setup function
        setupFunction: function() {
            console.log('� Setting up Flower Wonderland Paradise...');
            
            try {
                // Initialize tracking arrays
                if (!this.flowers) this.flowers = [];
                if (!this.flowerFields) this.flowerFields = [];
                if (!this.flowerHills) this.flowerHills = [];
                if (!this.gardenPaths) this.gardenPaths = [];
                if (!this.decorativeElements) this.decorativeElements = [];
                if (!this.wonderlandElements) this.wonderlandElements = [];
                if (!this.animationMixers) this.animationMixers = [];
                
                // Create flower wonderland in layers
                this.createFlowerWonderlandSky();
                this.createGradientGround();
                this.createFlowerHills();
                this.createFlowerFields();
                this.createIndividualFlowers();
                this.createFloweringTrees();
                this.createButterflies();
                
                console.log('� Flower Wonderland Paradise setup complete!');
                
            } catch (error) {
                console.error('🌺 Error setting up Flower Wonderland:', error);
                // Fallback to basic environment
                this.createBasicFlowerField();
            }
        }
    };

    /**
     * Flower Wonderland World Template Class
     * Extends SimpleWorldTemplate with flower-specific functionality
     */
    const FlowerWonderlandWorldTemplate = SimpleWorldTemplate.createFromConfig(FlowerWonderlandConfig);
    
    // === FLOWER WONDERLAND CREATION METHODS ===
    
    FlowerWonderlandWorldTemplate.prototype.createGradientGround = function() {
        try {
            console.log('� Creating gradient ground plane...');
            
            // Create beautiful gradient ground plane
            const groundGeometry = new this.THREE.PlaneGeometry(400, 400, 32, 32);
            const groundMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    centerColor: { value: new this.THREE.Color(0xFF69B4) },  // Hot pink center
                    edgeColor: { value: new this.THREE.Color(0x8B008B) },    // Dark magenta edges
                    gradientSize: { value: 200.0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 centerColor;
                    uniform vec3 edgeColor;
                    uniform float gradientSize;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    void main() {
                        float distanceFromCenter = length(vPosition.xy) / gradientSize;
                        distanceFromCenter = clamp(distanceFromCenter, 0.0, 1.0);
                        
                        // Create red-pink-purple gradient
                        vec3 redColor = vec3(1.0, 0.2, 0.2);     // Red
                        vec3 pinkColor = vec3(1.0, 0.4, 0.7);    // Pink  
                        vec3 purpleColor = vec3(0.5, 0.2, 0.8);  // Purple
                        
                        vec3 color;
                        if (distanceFromCenter < 0.5) {
                            color = mix(redColor, pinkColor, distanceFromCenter * 2.0);
                        } else {
                            color = mix(pinkColor, purpleColor, (distanceFromCenter - 0.5) * 2.0);
                        }
                        
                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
                side: this.THREE.DoubleSide
            });
            
            const ground = new this.THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = 0;
            ground.userData.templateObject = true;
            this.addTrackedObject(ground, 'gradientGround');
            this.wonderlandElements.push(ground);
            
        } catch (error) {
            console.error('� Error creating gradient ground:', error);
        }
    };

    FlowerWonderlandWorldTemplate.prototype.createFlowerHills = function() {
        try {
            console.log('🌷 Creating textured flower hills outside file zone...');
            
            // Create rolling hills outside the file zone (beyond ~80 units from center)
            const hillPositions = [
                { x: -120, z: 80, radius: 35, height: 8, color: 0xFF69B4 },   // Pink hill
                { x: 110, z: 90, radius: 30, height: 6, color: 0x9370DB },    // Purple hill  
                { x: -100, z: -110, radius: 40, height: 10, color: 0xFFD700 }, // Yellow hill
                { x: 130, z: -100, radius: 32, height: 7, color: 0xFF4500 },   // Orange hill
                { x: 0, z: -140, radius: 45, height: 12, color: 0x00FF7F },    // Green hill
                { x: -140, z: -20, radius: 28, height: 5, color: 0x1E90FF },   // Blue hill
                { x: 120, z: 0, radius: 33, height: 9, color: 0xFF1493 },      // Deep pink hill
                { x: 0, z: 130, radius: 38, height: 8, color: 0x8A2BE2 }       // Blue violet hill
            ];
            
            hillPositions.forEach((hill, index) => {
                // Create base hill with gradient coloring to match ground
                const hillGeometry = new this.THREE.SphereGeometry(hill.radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
                const hillMaterial = new this.THREE.ShaderMaterial({
                    uniforms: {
                        centerColor: { value: new this.THREE.Color(0xFF69B4) },  // Hot pink center
                        edgeColor: { value: new this.THREE.Color(0x8B008B) },    // Dark magenta edges
                    },
                    vertexShader: `
                        varying vec3 vPosition;
                        void main() {
                            vPosition = position;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform vec3 centerColor;
                        uniform vec3 edgeColor;
                        varying vec3 vPosition;
                        void main() {
                            float heightFactor = clamp(vPosition.y / 15.0, 0.0, 1.0);
                            
                            // Same gradient as ground: red-pink-purple
                            vec3 redColor = vec3(1.0, 0.2, 0.2);     // Red
                            vec3 pinkColor = vec3(1.0, 0.4, 0.7);    // Pink  
                            vec3 purpleColor = vec3(0.5, 0.2, 0.8);  // Purple
                            
                            vec3 color;
                            if (heightFactor < 0.5) {
                                color = mix(redColor, pinkColor, heightFactor * 2.0);
                            } else {
                                color = mix(pinkColor, purpleColor, (heightFactor - 0.5) * 2.0);
                            }
                            
                            gl_FragColor = vec4(color, 1.0);
                        }
                    `
                });
                const hillMesh = new this.THREE.Mesh(hillGeometry, hillMaterial);
                
                hillMesh.position.set(hill.x, 0, hill.z);
                hillMesh.scale.y = hill.height / hill.radius;
                hillMesh.userData.templateObject = true;
                this.addTrackedObject(hillMesh, `flowerHill_${index}`);
                this.flowerHills.push(hillMesh);
                
                // Create flower texture overlay using small colored planes
                const flowerCount = 25; // Efficient flower texture
                for (let f = 0; f < flowerCount; f++) {
                    const flowerSize = 0.8 + Math.random() * 0.4;
                    const flowerGeometry = new this.THREE.PlaneGeometry(flowerSize, flowerSize);
                    const flowerMaterial = new this.THREE.MeshLambertMaterial({ 
                        color: hill.color,
                        transparent: true,
                        opacity: 0.8,
                        side: this.THREE.DoubleSide
                    });
                    const flower = new this.THREE.Mesh(flowerGeometry, flowerMaterial);
                    
                    // Distribute flowers across hill surface
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * hill.radius * 0.8;
                    const flowerX = hill.x + Math.cos(angle) * distance;
                    const flowerZ = hill.z + Math.sin(angle) * distance;
                    const flowerY = hill.height * 0.6 + Math.random() * 2;
                    
                    flower.position.set(flowerX, flowerY, flowerZ);
                    flower.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
                    flower.rotation.z = Math.random() * Math.PI * 2;
                    flower.userData.templateObject = true;
                    flower.userData.isSwaying = true;
                    flower.userData.swayPhase = Math.random() * Math.PI * 2;
                    
                    this.addTrackedObject(flower, `hillFlower_${index}_${f}`);
                    this.flowerHills.push(flower);
                }
            });
            
        } catch (error) {
            console.error('🌷 Error creating flower hills:', error);
        }
    };

    FlowerWonderlandWorldTemplate.prototype.createFlowerFields = function() {
        try {
            console.log('🌼 Creating expansive flower fields...');
            
            // Create large flower fields using textured planes for efficiency
            const fieldPositions = [
                { x: -120, z: -40, width: 60, depth: 40, color: 0xFF1493, type: 'roses' },
                { x: 120, z: 30, width: 50, depth: 35, color: 0x9932CC, type: 'lavender' },
                { x: 40, z: -130, width: 70, depth: 45, color: 0xFFFF00, type: 'sunflowers' },
                { x: -80, z: 120, width: 55, depth: 40, color: 0xFF6347, type: 'tulips' }
            ];
            
            fieldPositions.forEach((field, index) => {
                // Create base field plane
                const fieldGeometry = new this.THREE.PlaneGeometry(field.width, field.depth);
                const fieldMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x90EE90 // Grass green base
                });
                const fieldBase = new this.THREE.Mesh(fieldGeometry, fieldMaterial);
                
                fieldBase.rotation.x = -Math.PI / 2;
                fieldBase.position.set(field.x, 0.1, field.z);
                fieldBase.userData.templateObject = true;
                this.addTrackedObject(fieldBase, `flowerField_${index}_base`);
                this.flowerFields.push(fieldBase);
                
                // Add sparse 3D flowers for detail (very efficient)
                const detailFlowerCount = 15;
                for (let d = 0; d < detailFlowerCount; d++) {
                    this.createEfficientFlower(
                        field.x + (Math.random() - 0.5) * field.width * 0.8,
                        field.z + (Math.random() - 0.5) * field.depth * 0.8,
                        field.color,
                        field.type,
                        index,
                        d
                    );
                }
                
                // Add many small flower texture dots for density illusion
                const textureFlowerCount = 40;
                for (let t = 0; t < textureFlowerCount; t++) {
                    const dotSize = 0.5 + Math.random() * 0.3;
                    const dotGeometry = new this.THREE.PlaneGeometry(dotSize, dotSize);
                    const dotMaterial = new this.THREE.MeshLambertMaterial({ 
                        color: field.color,
                        transparent: true,
                        opacity: 0.7
                    });
                    const dot = new this.THREE.Mesh(dotGeometry, dotMaterial);
                    
                    dot.position.set(
                        field.x + (Math.random() - 0.5) * field.width * 0.9,
                        0.3 + Math.random() * 0.2,
                        field.z + (Math.random() - 0.5) * field.depth * 0.9
                    );
                    dot.rotation.x = -Math.PI / 2;
                    dot.userData.templateObject = true;
                    
                    this.addTrackedObject(dot, `fieldTexture_${index}_${t}`);
                    this.flowerFields.push(dot);
                }
            });
            
        } catch (error) {
            console.error('🌼 Error creating flower fields:', error);
        }
    };

    FlowerWonderlandWorldTemplate.prototype.createEfficientFlower = function(x, z, color, type, fieldIndex, flowerIndex) {
        try {
            // Create efficient 3D flowers using simple geometries
            const flowerHeight = 2 + Math.random() * 2;
            
            // Flower stem - simple cylinder
            const stemGeometry = new this.THREE.CylinderGeometry(0.1, 0.15, flowerHeight, 6);
            const stemMaterial = new this.THREE.MeshLambertMaterial({ color: 0x228B22 });
            const stem = new this.THREE.Mesh(stemGeometry, stemMaterial);
            
            stem.position.set(x, flowerHeight / 2, z);
            stem.userData.templateObject = true;
            this.addTrackedObject(stem, `${type}_${fieldIndex}_${flowerIndex}_stem`);
            this.flowers.push(stem);
            
            // Flower head - varies by type but kept simple
            let flowerHead;
            switch(type) {
                case 'roses':
                    // Rose - small sphere cluster
                    flowerHead = new this.THREE.Mesh(
                        new this.THREE.SphereGeometry(0.8, 6, 4),
                        new this.THREE.MeshLambertMaterial({ color: color })
                    );
                    break;
                case 'sunflowers':
                    // Sunflower - flat circle with center
                    flowerHead = new this.THREE.Mesh(
                        new this.THREE.CircleGeometry(1.2, 8),
                        new this.THREE.MeshLambertMaterial({ color: color, side: this.THREE.DoubleSide })
                    );
                    flowerHead.rotation.x = -Math.PI / 2;
                    break;
                case 'tulips':
                    // Tulip - cone shape
                    flowerHead = new this.THREE.Mesh(
                        new this.THREE.ConeGeometry(0.6, 1.5, 6),
                        new this.THREE.MeshLambertMaterial({ color: color })
                    );
                    break;
                default: // lavender and others
                    // Default - small cylinder cluster
                    flowerHead = new this.THREE.Mesh(
                        new this.THREE.CylinderGeometry(0.3, 0.5, 1, 6),
                        new this.THREE.MeshLambertMaterial({ color: color })
                    );
            }
            
            flowerHead.position.set(x, flowerHeight + 0.5, z);
            flowerHead.userData.templateObject = true;
            flowerHead.userData.isSwaying = true;
            flowerHead.userData.swayPhase = Math.random() * Math.PI * 2;
            
            this.addTrackedObject(flowerHead, `${type}_${fieldIndex}_${flowerIndex}_head`);
            this.flowers.push(flowerHead);
            
        } catch (error) {
            console.error('🌺 Error creating efficient flower:', error);
        }
    };

    FlowerWonderlandWorldTemplate.prototype.createGardenPaths = function() {
        try {
            console.log('🛤️ Creating winding garden paths...');
            
            // Create simple stone paths connecting areas
            const pathSegments = [
                { x1: -40, z1: -20, x2: 40, z2: 20, width: 8 },    // Main central path
                { x1: 0, z1: 0, x2: -60, z2: 60, width: 6 },       // Path to pink hill
                { x1: 0, z1: 0, x2: 70, z2: 50, width: 6 },        // Path to purple hill
                { x1: 0, z1: 0, x2: 40, z2: -100, width: 5 }       // Path to sunflower field
            ];
            
            pathSegments.forEach((path, index) => {
                const pathLength = Math.sqrt((path.x2 - path.x1) ** 2 + (path.z2 - path.z1) ** 2);
                const pathGeometry = new this.THREE.PlaneGeometry(pathLength, path.width);
                const pathMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0xD2B48C, // Tan stone color
                    transparent: true,
                    opacity: 0.8
                });
                const pathMesh = new this.THREE.Mesh(pathGeometry, pathMaterial);
                
                // Position and rotate path
                const midX = (path.x1 + path.x2) / 2;
                const midZ = (path.z1 + path.z2) / 2;
                const angle = Math.atan2(path.z2 - path.z1, path.x2 - path.x1);
                
                pathMesh.position.set(midX, 0.05, midZ);
                pathMesh.rotation.x = -Math.PI / 2;
                pathMesh.rotation.z = angle;
                pathMesh.userData.templateObject = true;
                
                this.addTrackedObject(pathMesh, `gardenPath_${index}`);
                this.gardenPaths.push(pathMesh);
            });
            
        } catch (error) {
            console.error('🛤️ Error creating garden paths:', error);
        }
    };

    FlowerWonderlandWorldTemplate.prototype.createIndividualFlowers = function() {
        try {
            console.log('🌸 Creating showcase individual flowers...');
            
            // Create 24 special detailed flowers around the central area in three rings
            const showcasePositions = [];
            
            // Inner ring - 8 flowers
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const radius = 35;
                showcasePositions.push({
                    x: Math.cos(angle) * radius,
                    z: Math.sin(angle) * radius,
                    type: ['rose', 'tulip', 'sunflower', 'lavender'][i % 4],
                    color: [0xFF0000, 0xFF69B4, 0xFFD700, 0x9370DB][i % 4],
                    scale: 1.5
                });
            }
            
            // Middle ring - 8 flowers
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + 0.2; // Slight offset
                const radius = 50;
                showcasePositions.push({
                    x: Math.cos(angle) * radius,
                    z: Math.sin(angle) * radius,
                    type: ['rose', 'tulip', 'sunflower', 'lavender'][i % 4],
                    color: [0xFF1493, 0xFF6347, 0xFFA500, 0x8A2BE2][i % 4],
                    scale: 1.3
                });
            }
            
            // Outer ring - 8 flowers
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + 0.4; // Different offset
                const radius = 65;
                showcasePositions.push({
                    x: Math.cos(angle) * radius,
                    z: Math.sin(angle) * radius,
                    type: ['rose', 'tulip', 'sunflower', 'lavender'][i % 4],
                    color: [0xDC143C, 0xFF4500, 0xFFD700, 0x4B0082][i % 4],
                    scale: 1.2
                });
            }
            
            showcasePositions.forEach((flower, index) => {
                this.createShowcaseFlower(flower.x, flower.z, flower.type, flower.color, flower.scale, index);
            });
            
        } catch (error) {
            console.error('🌸 Error creating individual flowers:', error);
        }
    };

    FlowerWonderlandWorldTemplate.prototype.createShowcaseFlower = function(x, z, type, color, scale, index) {
        try {
            const flowerHeight = 4 * scale;
            
            // Enhanced flower stem
            const stemGeometry = new this.THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, flowerHeight, 8);
            const stemMaterial = new this.THREE.MeshLambertMaterial({ color: 0x228B22 });
            const stem = new this.THREE.Mesh(stemGeometry, stemMaterial);
            
            stem.position.set(x, flowerHeight / 2, z);
            stem.userData.templateObject = true;
            this.addTrackedObject(stem, `showcase_${type}_${index}_stem`);
            this.flowers.push(stem);
            
            // Enhanced flower head
            let flowerHead;
            switch(type) {
                case 'rose':
                    // Multi-layered rose
                    flowerHead = new this.THREE.Mesh(
                        new this.THREE.SphereGeometry(1.2 * scale, 8, 6),
                        new this.THREE.MeshLambertMaterial({ color: color })
                    );
                    break;
                case 'sunflower':
                    // Sunflower with center
                    flowerHead = new this.THREE.Mesh(
                        new this.THREE.CircleGeometry(2 * scale, 12),
                        new this.THREE.MeshLambertMaterial({ color: color, side: this.THREE.DoubleSide })
                    );
                    flowerHead.rotation.x = -Math.PI / 2;
                    // Add dark center
                    const center = new this.THREE.Mesh(
                        new this.THREE.CircleGeometry(0.8 * scale, 8),
                        new this.THREE.MeshLambertMaterial({ color: 0x654321, side: this.THREE.DoubleSide })
                    );
                    center.position.set(x, flowerHeight + 1.1, z);
                    center.rotation.x = -Math.PI / 2;
                    center.userData.templateObject = true;
                    this.addTrackedObject(center, `showcase_${type}_${index}_center`);
                    this.flowers.push(center);
                    break;
                case 'tulip':
                    // Detailed tulip
                    flowerHead = new this.THREE.Mesh(
                        new this.THREE.ConeGeometry(1 * scale, 2 * scale, 8),
                        new this.THREE.MeshLambertMaterial({ color: color })
                    );
                    break;
                default: // lavender
                    // Lavender spike
                    flowerHead = new this.THREE.Mesh(
                        new this.THREE.CylinderGeometry(0.4 * scale, 0.8 * scale, 1.5 * scale, 8),
                        new this.THREE.MeshLambertMaterial({ color: color })
                    );
            }
            
            flowerHead.position.set(x, flowerHeight + 1, z);
            flowerHead.userData.templateObject = true;
            flowerHead.userData.isSwaying = true;
            flowerHead.userData.swayPhase = Math.random() * Math.PI * 2;
            
            this.addTrackedObject(flowerHead, `showcase_${type}_${index}_head`);
            this.flowers.push(flowerHead);
            
        } catch (error) {
            console.error('🌺 Error creating showcase flower:', error);
        }
    };

    FlowerWonderlandWorldTemplate.prototype.createFloweringTrees = function() {
        try {
            console.log('🌳 Creating flowering trees...');
            
            // Create trees with flower blossoms around the perimeter
            const treePositions = [
                { x: -130, z: 0, blossomColor: 0xFFB6C1 },   // Pink blossoms
                { x: 130, z: 0, blossomColor: 0xDDA0DD },    // Plum blossoms
                { x: 0, z: 130, blossomColor: 0xFFFFE0 },    // Light yellow blossoms
                { x: 0, z: -150, blossomColor: 0xF0FFFF },   // White blossoms
                { x: -100, z: 100, blossomColor: 0xFF69B4 }, // Hot pink blossoms
                { x: 100, z: -100, blossomColor: 0xEE82EE }  // Violet blossoms
            ];
            
            treePositions.forEach((tree, index) => {
                // Tree trunk
                const trunkGeometry = new this.THREE.CylinderGeometry(2, 3, 15, 8);
                const trunkMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
                const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
                
                trunk.position.set(tree.x, 7.5, tree.z);
                trunk.userData.templateObject = true;
                this.addTrackedObject(trunk, `flowerTree_${index}_trunk`);
                this.decorativeElements.push(trunk);
                
                // Tree canopy with blossoms
                const canopyGeometry = new this.THREE.SphereGeometry(8, 12, 8);
                const canopyMaterial = new this.THREE.MeshLambertMaterial({ color: 0x228B22 });
                const canopy = new this.THREE.Mesh(canopyGeometry, canopyMaterial);
                
                canopy.position.set(tree.x, 18, tree.z);
                canopy.userData.templateObject = true;
                this.addTrackedObject(canopy, `flowerTree_${index}_canopy`);
                this.decorativeElements.push(canopy);
                
                // Add blossom clusters
                for (let b = 0; b < 12; b++) {
                    const blossomGeometry = new this.THREE.SphereGeometry(0.8, 6, 4);
                    const blossomMaterial = new this.THREE.MeshLambertMaterial({ 
                        color: tree.blossomColor,
                        transparent: true,
                        opacity: 0.8
                    });
                    const blossom = new this.THREE.Mesh(blossomGeometry, blossomMaterial);
                    
                    const angle = (b / 12) * Math.PI * 2;
                    const distance = 4 + Math.random() * 3;
                    blossom.position.set(
                        tree.x + Math.cos(angle) * distance,
                        18 + (Math.random() - 0.5) * 6,
                        tree.z + Math.sin(angle) * distance
                    );
                    blossom.userData.templateObject = true;
                    blossom.userData.isSwaying = true;
                    blossom.userData.swayPhase = Math.random() * Math.PI * 2;
                    
                    this.addTrackedObject(blossom, `flowerTree_${index}_blossom_${b}`);
                    this.decorativeElements.push(blossom);
                }
            });
            
        } catch (error) {
            console.error('🌳 Error creating flowering trees:', error);
        }
    };

    FlowerWonderlandWorldTemplate.prototype.createButterflies = function() {
        try {
            console.log('🦋 Creating magical butterflies...');
            
            // Create animated butterflies for ambiance
            for (let b = 0; b < 6; b++) {
                const butterflyGeometry = new this.THREE.PlaneGeometry(1, 0.8);
                const butterflyMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: [0xFF69B4, 0x9370DB, 0xFFD700, 0xFF6347][Math.floor(Math.random() * 4)],
                    side: this.THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8
                });
                const butterfly = new this.THREE.Mesh(butterflyGeometry, butterflyMaterial);
                
                butterfly.position.set(
                    (Math.random() - 0.5) * 120,
                    3 + Math.random() * 5,
                    (Math.random() - 0.5) * 120
                );
                butterfly.userData.templateObject = true;
                butterfly.userData.isFlying = true;
                butterfly.userData.flySpeed = 1 + Math.random() * 0.5;
                butterfly.userData.flyRadius = 15 + Math.random() * 10;
                butterfly.userData.flyAngle = Math.random() * Math.PI * 2;
                butterfly.userData.flyHeight = butterfly.position.y;
                
                this.addTrackedObject(butterfly, `butterfly_${b}`);
                this.decorativeElements.push(butterfly);
            }
            
        } catch (error) {
            console.error('🦋 Error creating butterflies:', error);
        }
    };

    // Add remaining methods
    FlowerWonderlandWorldTemplate.prototype.createFlowerWonderlandSky = function() {
        try {
            console.log('🌸 Creating magical wonderland sky dome with sunset...');
            
            // Higher resolution for smoother gradients
            const skyGeometry = new this.THREE.SphereGeometry(500, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
            
            const skyMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    // Multi-color gradient colors (bottom to top)
                    horizonColor: { value: new this.THREE.Color(0xFF8C42) },    // Sunset orange
                    lowerSkyColor: { value: new this.THREE.Color(0x87CEEB) },   // Sky blue
                    midSkyColor: { value: new this.THREE.Color(0xFF69B4) },     // Hot pink
                    upperSkyColor: { value: new this.THREE.Color(0x4B0082) },   // Deep purple/indigo
                    sunPosition: { value: new this.THREE.Vector3(-0.3, 0.15, 0.95) }, // Near horizon
                    sunColor: { value: new this.THREE.Color(0xFFD700) },        // Golden sun
                    sunGlowColor: { value: new this.THREE.Color(0xFF8C00) },    // Orange glow
                },
                vertexShader: `
                    varying vec3 vWorldPosition;
                    varying vec3 vNormal;
                    void main() {
                        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = normalize(worldPosition.xyz);
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 horizonColor;
                    uniform vec3 lowerSkyColor;
                    uniform vec3 midSkyColor;
                    uniform vec3 upperSkyColor;
                    uniform vec3 sunPosition;
                    uniform vec3 sunColor;
                    uniform vec3 sunGlowColor;
                    varying vec3 vWorldPosition;
                    varying vec3 vNormal;
                    
                    // Noise function for shimmer effect
                    float noise(vec3 p) {
                        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
                    }
                    
                    void main() {
                        float h = vWorldPosition.y;
                        vec3 skyColor;
                        
                        // Multi-layer gradient
                        if (h < 0.15) {
                            // Horizon to lower sky (orange to blue)
                            skyColor = mix(horizonColor, lowerSkyColor, h / 0.15);
                        } else if (h < 0.4) {
                            // Lower sky to mid sky (blue to hot pink)
                            skyColor = mix(lowerSkyColor, midSkyColor, (h - 0.15) / 0.25);
                        } else {
                            // Mid sky to upper sky (hot pink to deep purple)
                            skyColor = mix(midSkyColor, upperSkyColor, (h - 0.4) / 0.6);
                        }
                        
                        // Add gentle shimmer effect
                        float shimmer = noise(vWorldPosition * 10.0 + time * 0.5) * 0.03;
                        skyColor += shimmer;
                        
                        // Add magical sparkles (random, occasional)
                        float sparkleNoise = noise(vWorldPosition * 50.0 + time * 2.0);
                        if (sparkleNoise > 0.98 && h > 0.5) { // Only in upper sky
                            float sparkleIntensity = (sparkleNoise - 0.98) * 50.0;
                            skyColor += vec3(1.0, 1.0, 0.9) * sparkleIntensity;
                        }
                        
                        // Add sunset sun
                        float sunDistance = distance(vWorldPosition, sunPosition);
                        float sunDisk = 1.0 - smoothstep(0.02, 0.04, sunDistance);
                        float sunGlow = 1.0 - smoothstep(0.04, 0.15, sunDistance);
                        
                        // Apply sun
                        skyColor = mix(skyColor, sunColor, sunDisk);
                        skyColor = mix(skyColor, sunGlowColor, sunGlow * 0.4);
                        
                        gl_FragColor = vec4(skyColor, 1.0);
                    }
                `,
                side: this.THREE.BackSide
            });
            
            const skyDome = new this.THREE.Mesh(skyGeometry, skyMaterial);
            skyDome.position.y = 0;
            skyDome.userData.templateObject = true;
            skyDome.userData.isMagicalSky = true; // Flag for animation updates
            
            // Store reference for animation
            if (!this.wonderlandElements) this.wonderlandElements = [];
            this.wonderlandElements.push(skyDome);
            
            this.addTrackedObject(skyDome, 'wonderlandSky');
            
            console.log('✨ Magical sunset sky with shimmer and sparkles created!');
            
        } catch (error) {
            console.error('🌺 Error creating wonderland sky:', error);
        }
    };
    
    FlowerWonderlandWorldTemplate.prototype.createFlowerField = function() {
        try {
            console.log('🌸 Creating flower field...');
            
            // Create various types of flowers scattered across the field
            const flowerCount = 70;
            const flowerTypes = ['daisy', 'rose', 'sunflower', 'tulip', 'pansy'];
            
            for (let i = 0; i < flowerCount; i++) {
                const type = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
                const angle = Math.random() * Math.PI * 2;
                const distance = 10 + Math.random() * 60;
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;
                
                const flower = this.createFlower(type, x, z);
                this.flowers.push(flower);
            }
            
            console.log(`� Created ${this.flowers.length} flowers`);
            
        } catch (error) {
            console.error('� Error creating flower field:', error);
        }
    };
    
    FlowerWonderlandWorldTemplate.prototype.createFlower = function(type, x, z) {
        try {
            const flowerGroup = new this.THREE.Group();
            
            // Stem - green thin cylinder
            const stemHeight = 1.5 + Math.random() * 0.5;
            const stemGeometry = new this.THREE.CylinderGeometry(0.05, 0.05, stemHeight, 6);
            const stemMaterial = new this.THREE.MeshLambertMaterial({ color: 0x228B22 });
            const stem = new this.THREE.Mesh(stemGeometry, stemMaterial);
            stem.position.y = stemHeight / 2;
            flowerGroup.add(stem);
            
            // Flower head based on type
            let flowerHead;
            switch (type) {
                case 'daisy':
                    flowerHead = this.createDaisy();
                    break;
                case 'rose':
                    flowerHead = this.createRose();
                    break;
                case 'sunflower':
                    flowerHead = this.createSunflower();
                    break;
                case 'tulip':
                    flowerHead = this.createTulip();
                    break;
                case 'pansy':
                    flowerHead = this.createPansy();
                    break;
            }
            
            flowerHead.position.y = stemHeight;
            flowerGroup.add(flowerHead);
            
            // Position and add slight random rotation
            flowerGroup.position.set(x, 0, z);
            flowerGroup.rotation.y = Math.random() * Math.PI * 2;
            flowerGroup.userData.isFlower = true;
            flowerGroup.userData.flowerType = type;
            flowerGroup.userData.swayOffset = Math.random() * Math.PI * 2; // For animation
            flowerGroup.userData.templateObject = true;
            
            this.addTrackedObject(flowerGroup, 'flower');
            return flowerGroup;
            
        } catch (error) {
            console.error('🌸 Error creating flower:', error);
        }
    };
    
    FlowerWonderlandWorldTemplate.prototype.createDaisy = function() {
        const daisyGroup = new this.THREE.Group();
        
        // Yellow center
        const centerGeometry = new this.THREE.SphereGeometry(0.15, 8, 8);
        const centerMaterial = new this.THREE.MeshLambertMaterial({ color: 0xFFFF00 });
        const center = new this.THREE.Mesh(centerGeometry, centerMaterial);
        daisyGroup.add(center);
        
        // White petals
        const petalCount = 8;
        for (let i = 0; i < petalCount; i++) {
            const angle = (i / petalCount) * Math.PI * 2;
            const petalGeometry = new this.THREE.SphereGeometry(0.2, 6, 6);
            const petalMaterial = new this.THREE.MeshLambertMaterial({ color: 0xFFFFFF });
            const petal = new this.THREE.Mesh(petalGeometry, petalMaterial);
            petal.scale.set(0.5, 0.3, 1);
            petal.position.x = Math.cos(angle) * 0.25;
            petal.position.z = Math.sin(angle) * 0.25;
            daisyGroup.add(petal);
        }
        
        return daisyGroup;
    };
    
    FlowerWonderlandWorldTemplate.prototype.createRose = function() {
        const roseGeometry = new this.THREE.SphereGeometry(0.25, 12, 12);
        const roseColors = [0xFF0000, 0xFF1493, 0xFF69B4]; // Red, deep pink, hot pink
        const roseMaterial = new this.THREE.MeshLambertMaterial({ 
            color: roseColors[Math.floor(Math.random() * roseColors.length)]
        });
        return new this.THREE.Mesh(roseGeometry, roseMaterial);
    };
    
    FlowerWonderlandWorldTemplate.prototype.createSunflower = function() {
        const sunflowerGroup = new this.THREE.Group();
        
        // Dark center
        const centerGeometry = new this.THREE.SphereGeometry(0.25, 12, 12);
        const centerMaterial = new this.THREE.MeshLambertMaterial({ color: 0x4B3621 });
        const center = new this.THREE.Mesh(centerGeometry, centerMaterial);
        sunflowerGroup.add(center);
        
        // Yellow petals (larger than daisy)
        const petalCount = 12;
        for (let i = 0; i < petalCount; i++) {
            const angle = (i / petalCount) * Math.PI * 2;
            const petalGeometry = new this.THREE.SphereGeometry(0.3, 8, 8);
            const petalMaterial = new this.THREE.MeshLambertMaterial({ color: 0xFFD700 });
            const petal = new this.THREE.Mesh(petalGeometry, petalMaterial);
            petal.scale.set(0.4, 0.3, 1);
            petal.position.x = Math.cos(angle) * 0.4;
            petal.position.z = Math.sin(angle) * 0.4;
            sunflowerGroup.add(petal);
        }
        
        sunflowerGroup.scale.set(1.5, 1.5, 1.5); // Larger flower
        return sunflowerGroup;
    };
    
    FlowerWonderlandWorldTemplate.prototype.createTulip = function() {
        const tulipGeometry = new this.THREE.ConeGeometry(0.25, 0.6, 6);
        const tulipColors = [0xFF0000, 0xFF69B4, 0xFFFF00, 0xFF4500, 0x9370DB];
        const tulipMaterial = new this.THREE.MeshLambertMaterial({ 
            color: tulipColors[Math.floor(Math.random() * tulipColors.length)]
        });
        const tulip = new this.THREE.Mesh(tulipGeometry, tulipMaterial);
        tulip.rotation.x = Math.PI; // Point upward
        tulip.position.y = 0.3;
        return tulip;
    };
    
    FlowerWonderlandWorldTemplate.prototype.createPansy = function() {
        const pansyGroup = new this.THREE.Group();
        
        // Center
        const centerGeometry = new this.THREE.SphereGeometry(0.1, 8, 8);
        const centerMaterial = new this.THREE.MeshLambertMaterial({ color: 0xFFFF00 });
        const center = new this.THREE.Mesh(centerGeometry, centerMaterial);
        pansyGroup.add(center);
        
        // Petals - different colors
        const petalColors = [0x9370DB, 0xFF69B4, 0xFFFFFF, 0xFFD700, 0xFF4500];
        const petalCount = 5;
        for (let i = 0; i < petalCount; i++) {
            const angle = (i / petalCount) * Math.PI * 2;
            const petalGeometry = new this.THREE.SphereGeometry(0.15, 8, 8);
            const petalMaterial = new this.THREE.MeshLambertMaterial({ 
                color: petalColors[i % petalColors.length]
            });
            const petal = new this.THREE.Mesh(petalGeometry, petalMaterial);
            petal.scale.set(0.6, 0.4, 1);
            petal.position.x = Math.cos(angle) * 0.2;
            petal.position.z = Math.sin(angle) * 0.2;
            pansyGroup.add(petal);
        }
        
        return pansyGroup;
    };
    
    FlowerWonderlandWorldTemplate.prototype.createHedges = function() {
        try {
            console.log('🌸 Creating hedges...');
            
            // Initialize hedges array if not exists
            if (!this.hedges) this.hedges = [];
            
            const hedgePositions = [
                { x: -60, z: 40, width: 15, height: 3, depth: 3 },
                { x: 50, z: -45, width: 12, height: 2.5, depth: 3 },
                { x: -40, z: -50, width: 18, height: 3.5, depth: 3 },
                { x: 65, z: 30, width: 10, height: 2.8, depth: 3 },
                { x: -70, z: -20, width: 14, height: 3, depth: 3 },
                { x: 45, z: 60, width: 16, height: 3.2, depth: 3 }
            ];
            
            hedgePositions.forEach(pos => {
                const hedgeGeometry = new this.THREE.BoxGeometry(pos.width, pos.height, pos.depth);
                const hedgeMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x2F4F2F // Dark green
                });
                const hedge = new this.THREE.Mesh(hedgeGeometry, hedgeMaterial);
                
                hedge.position.set(pos.x, pos.height / 2, pos.z);
                hedge.userData.isHedge = true;
                hedge.userData.templateObject = true;
                
                this.addTrackedObject(hedge, 'hedge');
                this.hedges.push(hedge);
            });
            
            console.log(`🌸 Created ${this.hedges.length} hedges`);
            
        } catch (error) {
            console.error('� Error creating hedges:', error);
        }
    };
    
    FlowerWonderlandWorldTemplate.prototype.createTreeGroves = function() {
        try {
            console.log('🌸 Creating tree groves...');
            
            // Initialize treeGroves array if not exists
            if (!this.treeGroves) this.treeGroves = [];
            
            const grovePositions = [
                { x: -75, z: 70, treeCount: 4 },
                { x: 80, z: -65, treeCount: 3 },
                { x: 70, z: 75, treeCount: 3 }
            ];
            
            grovePositions.forEach(grove => {
                for (let i = 0; i < grove.treeCount; i++) {
                    const offsetX = (Math.random() - 0.5) * 15;
                    const offsetZ = (Math.random() - 0.5) * 15;
                    const tree = this.createSimpleTree(grove.x + offsetX, grove.z + offsetZ);
                    this.treeGroves.push(tree);
                }
            });
            
            console.log(`� Created ${this.treeGroves.length} trees in groves`);
            
        } catch (error) {
            console.error('� Error creating tree groves:', error);
        }
    };
    
    FlowerWonderlandWorldTemplate.prototype.createSimpleTree = function(x, z) {
        try {
            const treeGroup = new this.THREE.Group();
            
            // Trunk
            const trunkHeight = 5 + Math.random() * 2;
            const trunkGeometry = new this.THREE.CylinderGeometry(0.4, 0.5, trunkHeight, 8);
            const trunkMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = trunkHeight / 2;
            treeGroup.add(trunk);
            
            // Canopy - sphere of leaves
            const canopyGeometry = new this.THREE.SphereGeometry(3, 12, 12);
            const canopyMaterial = new this.THREE.MeshLambertMaterial({ color: 0x228B22 });
            const canopy = new this.THREE.Mesh(canopyGeometry, canopyMaterial);
            canopy.position.y = trunkHeight + 2;
            treeGroup.add(canopy);
            
            treeGroup.position.set(x, 0, z);
            treeGroup.userData.isTree = true;
            treeGroup.userData.templateObject = true;
            
            this.addTrackedObject(treeGroup, 'tree');
            return treeGroup;
            
        } catch (error) {
            console.error('� Error creating simple tree:', error);
        }
    };
    
    FlowerWonderlandWorldTemplate.prototype.createClouds = function() {
        try {
            console.log('🌸 Creating clouds...');
            
            // Initialize clouds array if not exists
            if (!this.clouds) this.clouds = [];
            
            // White puffy clouds
            const whiteCloudPositions = [
                { x: -80, y: 80, z: -60 },
                { x: 70, y: 90, z: 50 },
                { x: 0, y: 85, z: -80 }
            ];
            
            whiteCloudPositions.forEach(pos => {
                const cloud = this.createCloud(0xFFFFFF, 12);
                cloud.position.set(pos.x, pos.y, pos.z);
                this.clouds.push(cloud);
            });
            
            // Dark rain clouds
            const darkCloudPositions = [
                { x: 90, y: 75, z: -40 },
                { x: -70, y: 70, z: 80 }
            ];
            
            darkCloudPositions.forEach(pos => {
                const cloud = this.createCloud(0x696969, 15);
                cloud.position.set(pos.x, pos.y, pos.z);
                this.clouds.push(cloud);
            });
            
            console.log(`� Created ${this.clouds.length} clouds`);
            
        } catch (error) {
            console.error('� Error creating clouds:', error);
        }
    };
    
    FlowerWonderlandWorldTemplate.prototype.createCloud = function(color, size) {
        try {
            const cloudGroup = new this.THREE.Group();
            
            // Create cloud from multiple spheres
            const sphereCount = 5 + Math.floor(Math.random() * 3);
            for (let i = 0; i < sphereCount; i++) {
                const sphereGeometry = new this.THREE.SphereGeometry(size * (0.6 + Math.random() * 0.4), 8, 8);
                const sphereMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: color,
                    transparent: true,
                    opacity: 0.8
                });
                const sphere = new this.THREE.Mesh(sphereGeometry, sphereMaterial);
                
                sphere.position.x = (Math.random() - 0.5) * size * 2;
                sphere.position.y = (Math.random() - 0.5) * size * 0.5;
                sphere.position.z = (Math.random() - 0.5) * size;
                
                cloudGroup.add(sphere);
            }
            
            cloudGroup.userData.isCloud = true;
            cloudGroup.userData.templateObject = true;
            this.addTrackedObject(cloudGroup, 'cloud');
            return cloudGroup;
            
        } catch (error) {
            console.error('� Error creating cloud:', error);
        }
    };
    

    

    

    

    


    FlowerWonderlandWorldTemplate.prototype.applyPositionConstraints = function(object, newPosition, allObjects = []) {
        const constraints = this.getPositioningConstraints();
        
        // Define ground level (same as Green Plane and Desert Oasis)
        const groundLevelY = 0;
        
        let constrainedX = Math.max(constraints.worldBoundaries.x.min, 
            Math.min(constraints.worldBoundaries.x.max, newPosition.x));
        let constrainedZ = Math.max(constraints.worldBoundaries.z.min, 
            Math.min(constraints.worldBoundaries.z.max, newPosition.z));
        
        const objectHeight = object.userData?.objectHeight || 
            object.geometry?.parameters?.height || 1;
        let constrainedY = groundLevelY + objectHeight / 2;
        
        // Check for support from other objects
        if (constraints.requiresSupport && allObjects.length > 0) {
            const otherObjects = allObjects.filter(obj => obj !== object);
            let maxSupportHeight = groundLevelY + objectHeight / 2;
            
            for (const otherObj of otherObjects) {
                const otherWidth = otherObj.userData?.objectWidth || 
                    otherObj.geometry?.parameters?.width || 
                    (otherObj.geometry?.parameters?.radius * 2) || 1;
                const otherDepth = otherObj.userData?.objectDepth || 
                    otherObj.geometry?.parameters?.depth || 
                    (otherObj.geometry?.parameters?.radius * 2) || 1;
                const otherHeight = otherObj.userData?.objectHeight || 
                    otherObj.geometry?.parameters?.height || 1;
                
                const otherTop = otherObj.position.y + otherHeight / 2;
                const otherLeft = otherObj.position.x - otherWidth / 2;
                const otherRight = otherObj.position.x + otherWidth / 2;
                const otherFront = otherObj.position.z - otherDepth / 2;
                const otherBack = otherObj.position.z + otherDepth / 2;
                
                if (constrainedX >= otherLeft && constrainedX <= otherRight &&
                    constrainedZ >= otherFront && constrainedZ <= otherBack &&
                    otherTop > maxSupportHeight) {
                    maxSupportHeight = otherTop + objectHeight / 2;
                }
            }
            
            constrainedY = maxSupportHeight;
        }
        
        return { x: constrainedX, y: constrainedY, z: constrainedZ };
    };

    FlowerWonderlandWorldTemplate.prototype.update = function(deltaTime) {
        try {
            // Animate flowers with gentle swaying motion
            const time = Date.now() * 0.001; // Convert to seconds
            
            this.flowers.forEach(flower => {
                if (flower.userData.swayOffset !== undefined) {
                    // Gentle swaying motion
                    const swayAmount = 0.05; // Small sway angle
                    const swaySpeed = 1.5;
                    const offset = flower.userData.swayOffset;
                    
                    flower.rotation.z = Math.sin(time * swaySpeed + offset) * swayAmount;
                }
            });
            
            // Animate magical sky shimmer and sparkles
            if (this.wonderlandElements) {
                this.wonderlandElements.forEach(element => {
                    if (element.userData.isMagicalSky && element.material && element.material.uniforms) {
                        element.material.uniforms.time.value = time;
                    }
                });
            }
            
        } catch (error) {
            console.error('🌸 Error updating Flower Wonderland:', error);
        }
    };
    
    FlowerWonderlandWorldTemplate.prototype.cleanupEnvironment = function() {
        console.log('🌸 Cleaning up Flower Wonderland environment...');
        
        // Clean up tracked objects
        this.trackedObjects.forEach(obj => {
            if (obj && this.scene && obj.parent === this.scene) {
                this.scene.remove(obj);
                
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(mat => {
                            if (mat.uniforms) {
                                // Clean up shader uniforms
                                Object.keys(mat.uniforms).forEach(key => {
                                    if (mat.uniforms[key].value && mat.uniforms[key].value.dispose) {
                                        mat.uniforms[key].value.dispose();
                                    }
                                });
                            }
                            mat.dispose();
                        });
                    } else {
                        if (obj.material.uniforms) {
                            // Clean up shader uniforms
                            Object.keys(obj.material.uniforms).forEach(key => {
                                if (obj.material.uniforms[key].value && obj.material.uniforms[key].value.dispose) {
                                    obj.material.uniforms[key].value.dispose();
                                }
                            });
                        }
                        obj.material.dispose();
                    }
                }
            }
        });
        
        this.flowers = [];
        this.hedges = [];
        this.treeGroves = [];
        this.clouds = [];
        this.wonderlandElements = [];
        this.trackedObjects.clear();
        
        console.log('🌸 Flower Wonderland cleanup complete');
    };

    FlowerWonderlandWorldTemplate.prototype.dispose = function() {
        console.log('🌸 Disposing Flower Wonderland world template');
        this.cleanupEnvironment();
    };

    // Add static getConfig method for registry helper
    FlowerWonderlandWorldTemplate.getConfig = function() {
        return FlowerWonderlandConfig;
    };
    
    // Override getType to ensure proper identification
    FlowerWonderlandWorldTemplate.prototype.getType = function() {
        return 'flower-wonderland';
    };

    FlowerWonderlandWorldTemplate.prototype.getDisplayName = function() {
        return 'Flower Wonderland';
    };

    // Export to global scope
    window.FlowerWonderlandWorldTemplate = FlowerWonderlandWorldTemplate;
    
    console.log('🌸 FlowerWonderlandWorldTemplate module loaded');
    console.log('🌸 window.worldTemplateRegistryHelper available:', !!window.worldTemplateRegistryHelper);
    console.log('🌸 window.worldTemplateAutoIntegration available:', !!window.worldTemplateAutoIntegration);
    console.log('🌸 window.dynamicPremiumDetection available:', !!window.dynamicPremiumDetection);
    
    // Auto-register with helper system if available
    if (window.worldTemplateRegistryHelper) {
        try {
            console.log('🌸 Attempting to register Flower Wonderland...');
            window.worldTemplateRegistryHelper.registerNewTemplate(
                FlowerWonderlandWorldTemplate,
                {
                    autoIntegrate: {
                        mainApplication: true,
                        worldManagement: true,
                        sortingManager: true,
                        flutterMenu: true
                    },
                    fileZones: {
                        inherits: 'green-plane',
                        type: 'ground-level'
                    }
                }
            );
            console.log('🌸 ✅ Flower Wonderland auto-registered successfully');
        } catch (error) {
            console.error('� ❌ Failed to auto-register Flower Wonderland:', error);
        }
    } else {
        console.warn('� WorldTemplateRegistryHelper not available - registration deferred');
        
        // Fallback: Try to register when helper becomes available
        const registerWhenReady = () => {
            if (window.worldTemplateRegistryHelper) {
                window.worldTemplateRegistryHelper.registerNewTemplate(FlowerWonderlandWorldTemplate);
                console.log('� Flower Wonderland registered (deferred)');
            } else {
                setTimeout(registerWhenReady, 100);
            }
        };
        setTimeout(registerWhenReady, 100);
    }
    
    console.log('� Flower Wonderland World Template loaded successfully!');
    
})();

// ============================================================================
// MODULE: modules\premium\forestMovementMenu.js
// ============================================================================
/**
 * FOREST MOVEMENT MENU MODULE
 * Provides menu-based upward movement capability for Forest Realm world
 * Menu options: Move, Move Up, Delete, Cancel
 */

(function() {
    'use strict';
    
    console.log('🌲 Loading Forest Movement Menu module...');

    // ============================================================================
    // FOREST MOVEMENT MENU CLASS
    // ============================================================================
    
    class ForestMovementMenu {
        constructor() {
            this.menuElement = null;
            this.currentObject = null;
            this.currentPosition = null;
            this.allObjects = [];
            this.moveCallback = null;
            this.deleteCallback = null;
            this.isVisible = false;
            
            // Create menu DOM structure
            this.createMenuHTML();
            this.attachEventListeners();
        }

        createMenuHTML() {
            // Create menu container
            this.menuElement = document.createElement('div');
            this.menuElement.id = 'forest-movement-menu';
            this.menuElement.style.cssText = `
                position: fixed;
                background: rgba(47, 79, 47, 0.95);
                color: #FFFACD;
                border: 2px solid #228B22;
                border-radius: 8px;
                padding: 12px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                display: none;
                min-width: 180px;
                backdrop-filter: blur(4px);
            `;

            // Create menu title
            const title = document.createElement('div');
            title.textContent = 'Forest Movement';
            title.style.cssText = `
                font-weight: bold;
                margin-bottom: 8px;
                text-align: center;
                color: #90EE90;
                border-bottom: 1px solid #228B22;
                padding-bottom: 4px;
            `;
            this.menuElement.appendChild(title);

            // Create menu buttons
            const buttons = [
                { id: 'move-btn', text: '📱 Move', action: 'move' },
                { id: 'move-up-btn', text: '⬆️ Move Up', action: 'moveUp' },
                { id: 'delete-btn', text: '🗑️ Delete', action: 'delete' },
                { id: 'cancel-btn', text: '❌ Cancel', action: 'cancel' }
            ];

            buttons.forEach(btn => {
                const button = document.createElement('button');
                button.id = btn.id;
                button.textContent = btn.text;
                button.style.cssText = `
                    display: block;
                    width: 100%;
                    margin: 4px 0;
                    padding: 8px 12px;
                    background: rgba(34, 139, 34, 0.8);
                    color: #FFFACD;
                    border: 1px solid #228B22;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    font-size: 13px;
                `;
                
                // Add hover effects
                button.addEventListener('mouseenter', () => {
                    button.style.backgroundColor = 'rgba(34, 139, 34, 1)';
                });
                button.addEventListener('mouseleave', () => {
                    button.style.backgroundColor = 'rgba(34, 139, 34, 0.8)';
                });

                // Add click handler
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleMenuAction(btn.action);
                });

                this.menuElement.appendChild(button);
            });

            // Add to document body
            document.body.appendChild(this.menuElement);
        }

        attachEventListeners() {
            // Hide menu when clicking outside
            document.addEventListener('click', (e) => {
                if (this.isVisible && !this.menuElement.contains(e.target)) {
                    this.hideMenu();
                }
            });

            // Hide menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible) {
                    this.hideMenu();
                }
            });
        }

        showMenu(x, y, object, currentPosition, allObjects, moveCallback, deleteCallback) {
            console.log('🌲 Showing Forest Movement Menu for:', object.userData.fileName || 'unknown object');
            
            this.currentObject = object;
            this.currentPosition = { ...currentPosition };
            this.allObjects = allObjects || [];
            this.moveCallback = moveCallback;
            this.deleteCallback = deleteCallback;

            // Position menu at click location
            this.menuElement.style.left = `${x}px`;
            this.menuElement.style.top = `${y}px`;
            
            // Ensure menu stays within viewport
            this.adjustMenuPosition();
            
            // Show menu
            this.menuElement.style.display = 'block';
            this.isVisible = true;

            // Update button states based on object position
            this.updateButtonStates();
        }

        adjustMenuPosition() {
            const rect = this.menuElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Adjust horizontal position
            if (rect.right > viewportWidth) {
                this.menuElement.style.left = `${viewportWidth - rect.width - 10}px`;
            }
            if (rect.left < 0) {
                this.menuElement.style.left = '10px';
            }

            // Adjust vertical position
            if (rect.bottom > viewportHeight) {
                this.menuElement.style.top = `${viewportHeight - rect.height - 10}px`;
            }
            if (rect.top < 0) {
                this.menuElement.style.top = '10px';
            }
        }

        updateButtonStates() {
            const moveUpBtn = this.menuElement.querySelector('#move-up-btn');
            const objectHeight = this.currentObject.userData?.objectHeight || this.currentObject.geometry?.parameters?.height || 1;
            const currentY = this.currentPosition.y;
            const groundLevel = objectHeight / 2;

            // Enable/disable Move Up button based on current position and constraints
            if (currentY > groundLevel + 10) { // Already elevated significantly
                moveUpBtn.style.opacity = '0.6';
                moveUpBtn.style.cursor = 'not-allowed';
                moveUpBtn.title = 'Object is already elevated';
            } else {
                moveUpBtn.style.opacity = '1';
                moveUpBtn.style.cursor = 'pointer';
                moveUpBtn.title = 'Move object up with tree trunk support';
            }
        }

        hideMenu() {
            if (this.isVisible) {
                this.menuElement.style.display = 'none';
                this.isVisible = false;
                this.currentObject = null;
                this.currentPosition = null;
                this.allObjects = [];
                this.moveCallback = null;
                this.deleteCallback = null;
                console.log('🌲 Forest Movement Menu hidden');
            }
        }

        handleMenuAction(action) {
            console.log(`🌲 Forest Movement Menu action: ${action}`);

            switch (action) {
                case 'move':
                    this.handleMove();
                    break;
                case 'moveUp':
                    this.handleMoveUp();
                    break;
                case 'delete':
                    this.handleDelete();
                    break;
                case 'cancel':
                    this.hideMenu();
                    break;
                default:
                    console.warn(`🌲 Unknown menu action: ${action}`);
            }
        }

        handleMove() {
            console.log('🌲 Initiating regular move for object');
            
            // Enable regular movement mode - this will use existing drag/move mechanics
            if (this.moveCallback) {
                // Call with current position to maintain current location
                this.moveCallback(this.currentObject, this.currentPosition, 'move');
            }
            
            this.hideMenu();
        }

        handleMoveUp() {
            console.log('🌲 Initiating move up for object');
            
            const objectHeight = this.currentObject.userData?.objectHeight || this.currentObject.geometry?.parameters?.height || 1;
            const currentY = this.currentPosition.y;
            const groundLevel = objectHeight / 2;
            
            // Check if object is already elevated
            if (currentY > groundLevel + 10) {
                console.log('🌲 Object is already elevated, no further action needed');
                this.hideMenu();
                return;
            }

            // Calculate new elevated position
            const elevationHeight = this.calculateOptimalElevation();
            const newPosition = {
                x: this.currentPosition.x,
                y: elevationHeight,
                z: this.currentPosition.z
            };

            console.log(`🌲 Moving object up from Y=${currentY} to Y=${elevationHeight}`);

            // Create tree trunk support at the new position
            this.createTreeTrunkSupport(newPosition);

            // Apply the move
            if (this.moveCallback) {
                this.moveCallback(this.currentObject, newPosition, 'moveUp');
            }

            this.hideMenu();
        }

        calculateOptimalElevation() {
            // Calculate a good elevation height
            const objectHeight = this.currentObject.userData?.objectHeight || this.currentObject.geometry?.parameters?.height || 1;
            const baseElevation = 15; // Standard tree trunk height
            const objectCenterHeight = objectHeight / 2;
            
            // Check for other objects at similar position to avoid collisions
            let finalElevation = baseElevation + objectCenterHeight;
            
            const checkRadius = 5; // Area to check for conflicts
            for (const otherObj of this.allObjects) {
                if (otherObj === this.currentObject) continue;
                
                const distance = Math.sqrt(
                    Math.pow(otherObj.position.x - this.currentPosition.x, 2) +
                    Math.pow(otherObj.position.z - this.currentPosition.z, 2)
                );
                
                if (distance < checkRadius && otherObj.position.y > baseElevation) {
                    // Adjust elevation to avoid collision
                    const otherHeight = otherObj.userData?.objectHeight || otherObj.geometry?.parameters?.height || 1;
                    const potentialHeight = otherObj.position.y + otherHeight / 2 + objectCenterHeight + 2;
                    if (potentialHeight > finalElevation) {
                        finalElevation = potentialHeight;
                    }
                }
            }

            return Math.min(finalElevation, 50); // Cap at reasonable height
        }

        createTreeTrunkSupport(position) {
            // Create a visual tree trunk to support the elevated object
            console.log(`🌲 Creating tree trunk support at position (${position.x}, ${position.z})`);
            
            // Check if a tree trunk already exists at this position
            const existingTrunk = this.findExistingTreeTrunk(position.x, position.z);
            if (existingTrunk) {
                console.log('🌲 Tree trunk already exists at this position');
                return existingTrunk;
            }

            // Check if current world template has a createTreeTrunk method (for Cave Explorer stalagmites)
            const worldTemplate = window.app?.worldTemplate;
            if (worldTemplate && typeof worldTemplate.createTreeTrunk === 'function') {
                console.log(`🗿 Using world template's createTreeTrunk method for support creation`);
                const trunkHeight = position.y; // Trunk height to reach the object
                return worldTemplate.createTreeTrunk(this.currentObject, trunkHeight);
            }

            // Fallback: Create new tree trunk support (Forest Realm style)
            const trunkHeight = position.y; // Trunk height to reach the object
            const trunkGeometry = new THREE.CylinderGeometry(0.8, 1.2, trunkHeight, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513, // Brown trunk color
                roughness: 0.8,
                metalness: 0.1
            });
            
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(position.x, trunkHeight / 2, position.z);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            trunk.userData.isTreeTrunkSupport = true;
            trunk.userData.supportHeight = trunkHeight;
            trunk.userData.createdForObject = this.currentObject.userData.fileName || 'unknown';

            // Add to scene through the current world template
            if (window.app && window.app.worldTemplate && window.app.worldTemplate.scene) {
                window.app.worldTemplate.scene.add(trunk);
                window.app.worldTemplate.objects.push(trunk);
                console.log('🌲 Tree trunk support created and added to scene');
            } else {
                console.error('🌲 Could not add tree trunk to scene - no world template found');
            }

            return trunk;
        }

        findExistingTreeTrunk(x, z) {
            const checkRadius = 2; // How close to consider "same position"
            
            if (window.app && window.app.worldTemplate && window.app.worldTemplate.objects) {
                for (const obj of window.app.worldTemplate.objects) {
                    if (obj.userData.isTreeTrunkSupport || obj.userData.isTreeTrunk) {
                        const distance = Math.sqrt(
                            Math.pow(obj.position.x - x, 2) +
                            Math.pow(obj.position.z - z, 2)
                        );
                        if (distance < checkRadius) {
                            return obj;
                        }
                    }
                }
            }
            
            return null;
        }

        handleDelete() {
            console.log('🌲 Initiating delete for object');
            
            if (this.deleteCallback) {
                this.deleteCallback(this.currentObject);
            }
            
            this.hideMenu();
        }

        cleanup() {
            if (this.menuElement && this.menuElement.parentNode) {
                this.menuElement.parentNode.removeChild(this.menuElement);
            }
            this.hideMenu();
        }
    }

    // ============================================================================
    // FOREST MOVEMENT INTEGRATION HELPER
    // ============================================================================
    
    class ForestMovementIntegration {
        constructor() {
            this.menu = null;
            this.originalHandleObjectClick = null;
            this.isIntegrated = false;
        }

        initialize() {
            console.log('🌲 Initializing Forest Movement Integration');
            this.menu = new ForestMovementMenu();
            this.integrateWithInteractionManager();
        }

        integrateWithInteractionManager() {
            if (this.isIntegrated) {
                console.log('🌲 Forest movement already integrated');
                return;
            }

            // Wait for interaction manager to be available
            if (!window.app || !window.app.interactionManager) {
                console.log('🌲 Interaction manager not ready, retrying in 1 second...');
                setTimeout(() => this.integrateWithInteractionManager(), 1000);
                return;
            }

            console.log('🌲 Integrating forest movement with interaction manager');

            // Store original method
            this.originalHandleObjectClick = window.app.interactionManager.handleObjectClick.bind(window.app.interactionManager);

            // Override handleObjectClick to intercept forest realm clicks
            window.app.interactionManager.handleObjectClick = (object, event) => {
                if (this.shouldShowForestMenu(object, event)) {
                    this.showForestMovementMenu(object, event);
                } else {
                    // Use original handler for non-forest realm or normal clicks
                    this.originalHandleObjectClick(object, event);
                }
            };

            this.isIntegrated = true;
            console.log('🌲 Forest movement integration complete');
        }

        shouldShowForestMenu(object, event) {
            // Only show menu in forest realm
            if (!this.isForestRealm()) {
                return false;
            }

            // Only show for user objects (not template objects)
            if (!object || !object.userData || object.userData.templateObject) {
                return false;
            }

            // Check if this is a right-click or long press (we'll use Ctrl+Click for now)
            if (event && (event.ctrlKey || event.button === 2)) {
                return true;
            }

            // For now, show menu on any forest realm object click for testing
            return true;
        }

        showForestMovementMenu(object, event) {
            console.log('🌲 Showing forest movement menu for:', object.userData.fileName);

            const currentPosition = {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z
            };

            const allObjects = window.app.worldTemplate ? window.app.worldTemplate.objects : [];

            // Movement callback
            const moveCallback = (obj, newPosition, moveType) => {
                console.log(`🌲 Forest move callback: ${moveType}`, newPosition);
                
                // Apply enhanced constraints
                const constrainedPosition = this.applyEnhancedConstraints(obj, newPosition, allObjects, moveType);
                
                // Update object position
                obj.position.set(constrainedPosition.x, constrainedPosition.y, constrainedPosition.z);
                
                // Log event
                if (window.ForestMovementBridge) {
                    window.ForestMovementBridge.handleForestEvent('objectMoved', {
                        objectName: obj.userData.fileName,
                        moveType: moveType,
                        x: constrainedPosition.x,
                        y: constrainedPosition.y,
                        z: constrainedPosition.z
                    });
                }
            };

            // Delete callback
            const deleteCallback = (obj) => {
                console.log('🌲 Forest delete callback for:', obj.userData.fileName);
                
                // Remove object from scene
                if (obj.parent) {
                    obj.parent.remove(obj);
                }
                
                // Remove from world template objects
                if (window.app.worldTemplate && window.app.worldTemplate.objects) {
                    const index = window.app.worldTemplate.objects.indexOf(obj);
                    if (index > -1) {
                        window.app.worldTemplate.objects.splice(index, 1);
                    }
                }
                
                // Log event
                if (window.ForestMovementBridge) {
                    window.ForestMovementBridge.handleForestEvent('objectDeleted', {
                        objectName: obj.userData.fileName
                    });
                }
            };

            // Show menu
            this.menu.showMenu(
                event.clientX || window.innerWidth / 2,
                event.clientY || window.innerHeight / 2,
                object,
                currentPosition,
                allObjects,
                moveCallback,
                deleteCallback
            );
        }

        // Check if current world supports forest-style movement (forest realm AND cave explorer)
        isForestRealm() {
            if (!window.app || !window.app.worldTemplate || !window.app.worldTemplate.getType) {
                return false;
            }
            
            const worldType = window.app.worldTemplate.getType();
            // Include both forest and cave worlds since Cave Explorer extends Forest Realm
            return worldType === 'forest' || worldType === 'cave';
        }

        // Enhanced constraint method that supports menu-initiated moves
        applyEnhancedConstraints(object, newPosition, allObjects, moveType = 'normal') {
            if (!this.isForestRealm()) {
                // Not forest realm, use default constraints
                if (window.app && window.app.worldTemplate && window.app.worldTemplate.applyPositionConstraints) {
                    return window.app.worldTemplate.applyPositionConstraints(object, newPosition, allObjects);
                }
                return newPosition;
            }

            const worldType = window.app.worldTemplate.getType();
            
            if (worldType === 'cave') {
                console.log(`🕳️ Applying enhanced cave constraints for ${moveType} move`);
            } else {
                console.log(`🌲 Applying enhanced forest constraints for ${moveType} move`);
            }

            const constraints = window.app.worldTemplate.getPositioningConstraints();
            
            // Apply X and Z boundary constraints
            let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            // Get object height
            const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
            
            // Handle Y constraint based on move type
            let constrainedY;
            
            if (moveType === 'moveUp') {
                // Menu-initiated upward movement - allow elevation with support
                constrainedY = Math.max(0, newPosition.y);
                constrainedY = Math.min(constraints.worldBoundaries.y.max, constrainedY);
                
                if (worldType === 'cave') {
                    console.log(`🕳️ Move Up - allowing elevated position Y=${constrainedY} with stalagmite support`);
                } else {
                    console.log(`🌲 Move Up - allowing elevated position Y=${constrainedY} with tree trunk support`);
                }
            } else {
                // Regular movement - use world-specific constraints
                constrainedY = Math.max(0, newPosition.y);
                constrainedY = Math.min(constraints.worldBoundaries.y.max, constrainedY);
                
                // Apply support logic for regular moves
                if (constrainedY <= objectHeight / 2 + 0.1) {
                    // Object is at ground level
                    constrainedY = objectHeight / 2;
                    
                    if (worldType === 'cave') {
                        console.log(`🕳️ Regular move - ground level positioning Y=${constrainedY}`);
                    } else {
                        console.log(`🌲 Regular move - ground level positioning Y=${constrainedY}`);
                    }
                } else {
                    // Object is elevated - maintain position with appropriate support
                    if (worldType === 'cave') {
                        // Cave Explorer: Allow elevated positions with stalagmite support
                        console.log(`🕳️ Regular move - maintaining elevated position Y=${constrainedY} with stalagmite support`);
                    } else {
                        // Forest Realm: Check for tree trunk support
                        const hasTrunkSupport = this.menu.findExistingTreeTrunk(constrainedX, constrainedZ);
                        if (hasTrunkSupport) {
                            console.log(`🌲 Regular move - maintaining elevated position Y=${constrainedY} with existing trunk support`);
                        } else {
                            // No trunk support - move to ground
                            constrainedY = objectHeight / 2;
                            console.log(`🌲 Regular move - no trunk support, moving to ground Y=${constrainedY}`);
                        }
                    }
                }
            }

            const finalPosition = {
                x: constrainedX,
                y: constrainedY,
                z: constrainedZ
            };

            if (worldType === 'cave') {
                console.log(`🕳️ Enhanced cave constraints result: (${finalPosition.x}, ${finalPosition.y}, ${finalPosition.z})`);
            } else {
                console.log(`🌲 Enhanced forest constraints result: (${finalPosition.x}, ${finalPosition.y}, ${finalPosition.z})`);
            }
            return finalPosition;
        }

        cleanup() {
            if (this.isIntegrated && this.originalHandleObjectClick) {
                // Restore original handler
                if (window.app && window.app.interactionManager) {
                    window.app.interactionManager.handleObjectClick = this.originalHandleObjectClick;
                }
                this.isIntegrated = false;
            }

            if (this.menu) {
                this.menu.cleanup();
                this.menu = null;
            }
        }
    }

    // ============================================================================
    // GLOBAL INTEGRATION
    // ============================================================================
    
    // Create global instance
    window.ForestMovementIntegration = new ForestMovementIntegration();
    
    // Auto-initialize when document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.ForestMovementIntegration.initialize();
        });
    } else {
        window.ForestMovementIntegration.initialize();
    }
    
    console.log('🌲 Forest Movement Menu module loaded successfully!');
})();


// ============================================================================
// MODULE: modules\premium\gamingHelpers.js
// ============================================================================
/**
 * PREMIUM GAMING HELPERS MODULE
 * Pet helpers that assist with treasure hunting and entity collection
 * - Pet Dog: Loyal companion that hunts treasure boxes and entities
 * - Pet Cat: Agile hunter that chases entities for points
 * Each helper can only tap each entity once, user must tap for remaining points
 */

(function() {
    'use strict';
    
    // console.log('🐕 Loading Premium Gaming Helpers module...');

    // ============================================================================
    // HELPER CONFIGURATIONS
    // ============================================================================
    
    const helperConfigs = {
        pet_dog: {
            name: 'Pet Dog',
            type: 'pet',
            breeds: {
                golden_retriever: {
                    name: 'Golden Retriever',
                    color: 0xDAA520,
                    size: 1.0,
                    speed: 0.8,
                    personality: 'loyal'
                },
                labrador: {
                    name: 'Labrador',
                    color: 0x8B4513,
                    size: 0.9,
                    speed: 0.9,
                    personality: 'energetic'
                },
                husky: {
                    name: 'Husky',
                    color: 0x708090,
                    size: 1.1,
                    speed: 1.0,
                    personality: 'adventurous'
                },
                beagle: {
                    name: 'Beagle',
                    color: 0xD2691E,
                    size: 0.7,
                    speed: 0.7,
                    personality: 'curious'
                },
                corgi: {
                    name: 'Corgi',
                    color: 0xFF8C00,
                    size: 0.6,
                    speed: 0.6,
                    personality: 'playful'
                }
            },
            abilities: {
                huntRange: 8.0,
                huntSpeed: 2.0,
                huntInterval: 3000, // 3 seconds between hunts
                tapDelay: 1000 // 1 second to "tap" after reaching target
            }
        },
        
        pet_cat: {
            name: 'Pet Cat',
            type: 'pet',
            breeds: {
                persian: {
                    name: 'Persian',
                    color: 0xF5F5DC,
                    size: 0.8,
                    speed: 1.2,
                    personality: 'elegant'
                },
                siamese: {
                    name: 'Siamese',
                    color: 0xF5DEB3,
                    size: 0.7,
                    speed: 1.4,
                    personality: 'agile'
                },
                maine_coon: {
                    name: 'Maine Coon',
                    color: 0x8B4513,
                    size: 1.0,
                    speed: 1.0,
                    personality: 'majestic'
                },
                british_shorthair: {
                    name: 'British Shorthair',
                    color: 0x708090,
                    size: 0.9,
                    speed: 0.9,
                    personality: 'calm'
                },
                ragdoll: {
                    name: 'Ragdoll',
                    color: 0xF0F8FF,
                    size: 0.9,
                    speed: 0.8,
                    personality: 'gentle'
                }
            },
            abilities: {
                huntRange: 10.0,
                huntSpeed: 2.5,
                huntInterval: 2500, // 2.5 seconds between hunts
                tapDelay: 800 // 0.8 seconds to "tap" after reaching target
            }
        }
    };

    // ============================================================================
    // GAMING HELPER CLASS
    // ============================================================================
    
    class GamingHelper {
        constructor(type, breed, app) {
            this.type = type;
            this.breed = breed;
            this.app = app;
            this.config = helperConfigs[type];
            this.breedConfig = this.config.breeds[breed];
            
            this.mesh = null;
            this.isActive = false;
            this.currentTarget = null;
            this.huntTimer = null;
            this.position = { x: 0, y: 0.5, z: 0 };
            this.rotation = 0;
            
            // Track tapped entities to ensure one-tap-only rule
            this.tappedEntities = new Set();
            
            // Animation state
            this.animationState = 'idle'; // idle, moving, tapping
            this.moveStartTime = 0;
            this.moveStartPos = null;
            this.moveTargetPos = null;
            this.moveDuration = 0;
            
            // console.log(`🐕 Created ${this.config.name} helper: ${this.breedConfig.name}`);
        }
        
        /**
         * Initialize the helper in the scene
         */
        initialize() {
            this.createMesh();
            this.startHunting();
            this.isActive = true;
            
            // console.log(`🐕 ${this.breedConfig.name} helper initialized and hunting!`);
        }
        
        /**
         * Create the visual representation of the helper
         */
        createMesh() {
            // Create a simple geometric representation for now
            // TODO: Replace with proper 3D models
            
            const size = this.breedConfig.size;
            let geometry, material;
            
            if (this.type === 'pet_dog') {
                // Dog: elongated cube for body + smaller cube for head
                const bodyGeometry = new THREE.BoxGeometry(size * 1.2, size * 0.6, size * 0.8);
                const headGeometry = new THREE.BoxGeometry(size * 0.7, size * 0.7, size * 0.7);
                
                geometry = new THREE.BufferGeometry();
                // Combine geometries (simplified for now)
                geometry = bodyGeometry;
            } else {
                // Cat: more compact and agile looking
                geometry = new THREE.BoxGeometry(size * 0.8, size * 0.5, size * 1.0);
            }
            
            material = new THREE.MeshLambertMaterial({
                color: this.breedConfig.color,
                transparent: true,
                opacity: 0.9
            });
            
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.set(this.position.x, this.position.y, this.position.z);
            this.mesh.userData.isHelper = true;
            this.mesh.userData.helperType = this.type;
            this.mesh.userData.helperBreed = this.breed;
            this.mesh.userData.helperInstance = this;
            
            // Add to scene
            this.app.scene.add(this.mesh);
            
            // console.log(`🐕 Created mesh for ${this.breedConfig.name}`);
        }
        
        /**
         * Start the hunting behavior
         */
        startHunting() {
            if (!this.isActive) return;
            
            this.huntTimer = setInterval(() => {
                this.searchForTargets();
            }, this.config.abilities.huntInterval);
            
            console.log(`🎯 ${this.breedConfig.name} started hunting with ${this.config.abilities.huntInterval}ms interval`);
        }
        
        /**
         * Search for treasure boxes and entities to tap
         */
        searchForTargets() {
            if (!this.isActive || this.currentTarget) return;
            
            const targets = this.findNearbyTargets();
            if (targets.length > 0) {
                // Choose the closest target
                const target = targets[0];
                this.setTarget(target);
            }
        }
        
        /**
         * Find nearby treasure boxes and entities
         */
        findNearbyTargets() {
            const targets = [];
            const huntRange = this.config.abilities.huntRange;
            const helperPos = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
            
            // Search for treasure boxes
            if (this.app.treasureBoxManager && this.app.treasureBoxManager.activeTreasureBoxes) {
                this.app.treasureBoxManager.activeTreasureBoxes.forEach((treasureBox, id) => {
                    // Skip if already tapped by this helper
                    if (this.tappedEntities.has(id)) return;
                    
                    // Skip if treasure is found or escaping
                    if (treasureBox.found || treasureBox.instance?.escaping) return;
                    
                    const distance = helperPos.distanceTo(treasureBox.mesh.position);
                    if (distance <= huntRange) {
                        targets.push({
                            id: id,
                            type: 'treasure',
                            mesh: treasureBox.mesh,
                            position: treasureBox.mesh.position.clone(),
                            distance: distance,
                            entity: treasureBox
                        });
                    }
                });
            }
            
            // Search for other entities (if SVG Entity Manager is available)
            if (this.app.svgEntityManager && this.app.svgEntityManager.activeEntities) {
                this.app.svgEntityManager.activeEntities.forEach((entity, id) => {
                    // Skip if already tapped by this helper
                    if (this.tappedEntities.has(id)) return;
                    
                    // Skip if not clickable or is a treasure (handled above)
                    if (!entity.clickable || entity.type === 'treasure') return;
                    
                    const distance = helperPos.distanceTo(entity.mesh.position);
                    if (distance <= huntRange) {
                        targets.push({
                            id: id,
                            type: entity.type,
                            mesh: entity.mesh,
                            position: entity.mesh.position.clone(),
                            distance: distance,
                            entity: entity
                        });
                    }
                });
            }
            
            // Sort by distance (closest first)
            targets.sort((a, b) => a.distance - b.distance);
            
            return targets;
        }
        
        /**
         * Set a target to hunt
         */
        setTarget(target) {
            this.currentTarget = target;
            
            console.log(`🎯 ${this.breedConfig.name} targeting ${target.type}: ${target.id} at distance ${target.distance.toFixed(2)}`);
            
            // Start moving to target
            this.moveToTarget(target.position);
        }
        
        /**
         * Move to a target position
         */
        moveToTarget(targetPosition) {
            const startPos = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
            const endPos = targetPosition.clone();
            endPos.y = this.position.y; // Keep helper at ground level
            
            const distance = startPos.distanceTo(endPos);
            const speed = this.config.abilities.huntSpeed;
            const duration = (distance / speed) * 1000; // Convert to milliseconds
            
            this.animationState = 'moving';
            this.moveStartTime = Date.now();
            this.moveStartPos = startPos;
            this.moveTargetPos = endPos;
            this.moveDuration = duration;
            
            // Calculate rotation to face target
            const direction = endPos.clone().sub(startPos).normalize();
            this.rotation = Math.atan2(direction.x, direction.z);
            
            console.log(`🏃 ${this.breedConfig.name} moving to target (${duration.toFixed(0)}ms)`);
        }
        
        /**
         * Update helper animation and movement
         */
        update() {
            if (!this.isActive || !this.mesh) return;
            
            const currentTime = Date.now();
            
            // Handle movement animation
            if (this.animationState === 'moving' && this.moveStartPos && this.moveTargetPos) {
                const elapsed = currentTime - this.moveStartTime;
                const progress = Math.min(elapsed / this.moveDuration, 1.0);
                
                // Interpolate position
                const currentPos = this.moveStartPos.clone().lerp(this.moveTargetPos, progress);
                this.position.x = currentPos.x;
                this.position.y = currentPos.y;
                this.position.z = currentPos.z;
                
                // Update mesh position and rotation
                this.mesh.position.copy(currentPos);
                this.mesh.rotation.y = this.rotation;
                
                // Add bouncing animation while moving
                const bounceHeight = 0.2 * Math.sin(elapsed * 0.01);
                this.mesh.position.y += bounceHeight;
                
                // Check if reached target
                if (progress >= 1.0) {
                    this.animationState = 'tapping';
                    this.reachedTarget();
                }
            }
            
            // Idle animation when not moving
            if (this.animationState === 'idle') {
                const idleBob = 0.1 * Math.sin(currentTime * 0.003);
                this.mesh.position.y = this.position.y + idleBob;
            }
        }
        
        /**
         * Called when helper reaches the target
         */
        reachedTarget() {
            if (!this.currentTarget) return;
            
            console.log(`🎯 ${this.breedConfig.name} reached target: ${this.currentTarget.id}`);
            
            // Wait a moment before "tapping"
            setTimeout(() => {
                this.tapTarget();
            }, this.config.abilities.tapDelay);
        }
        
        /**
         * Tap the target entity
         */
        tapTarget() {
            if (!this.currentTarget) return;
            
            const target = this.currentTarget;
            
            // Mark as tapped by this helper
            this.tappedEntities.add(target.id);
            
            // Show visual feedback
            this.showTapFeedback();
            
            // Trigger the entity's click behavior
            if (target.type === 'treasure' && target.entity.instance) {
                // Tap treasure box
                target.entity.instance.animateClick();
                console.log(`💎 ${this.breedConfig.name} tapped treasure box: ${target.id}`);
            } else if (target.entity.entityInstance && target.entity.entityInstance.animateClick) {
                // Tap other entity
                target.entity.entityInstance.animateClick();
                console.log(`🎯 ${this.breedConfig.name} tapped entity: ${target.id}`);
            }
            
            // Clear target and return to idle
            this.currentTarget = null;
            this.animationState = 'idle';
            
            // Brief pause before hunting again
            setTimeout(() => {
                if (this.isActive) {
                    this.searchForTargets();
                }
            }, 1000);
        }
        
        /**
         * Show visual feedback when tapping
         */
        showTapFeedback() {
            // Temporary scale animation
            const originalScale = this.mesh.scale.clone();
            
            // Scale up briefly
            this.mesh.scale.multiplyScalar(1.3);
            
            setTimeout(() => {
                if (this.mesh) {
                    this.mesh.scale.copy(originalScale);
                }
            }, 200);
            
            // TODO: Add particle effect or other visual feedback
        }
        
        /**
         * Deactivate the helper
         */
        deactivate() {
            this.isActive = false;
            
            if (this.huntTimer) {
                clearInterval(this.huntTimer);
                this.huntTimer = null;
            }
            
            this.currentTarget = null;
            this.animationState = 'idle';
            
            // console.log(`🐕 ${this.breedConfig.name} helper deactivated`);
        }
        
        /**
         * Remove the helper from the scene
         */
        cleanup() {
            this.deactivate();
            
            if (this.mesh && this.app.scene) {
                this.app.scene.remove(this.mesh);
                
                // Dispose of geometry and materials
                if (this.mesh.geometry) this.mesh.geometry.dispose();
                if (this.mesh.material) this.mesh.material.dispose();
            }
            
            // console.log(`🐕 ${this.breedConfig.name} helper cleaned up`);
        }
        
        /**
         * Get helper status for UI
         */
        getStatus() {
            return {
                type: this.type,
                breed: this.breed,
                name: this.breedConfig.name,
                isActive: this.isActive,
                tappedCount: this.tappedEntities.size,
                currentTarget: this.currentTarget ? this.currentTarget.id : null,
                state: this.animationState
            };
        }
    }

    // ============================================================================
    // GAMING HELPER MANAGER
    // ============================================================================
    
    class GamingHelperManager {
        constructor(app) {
            this.app = app;
            this.activeHelpers = new Map();
            this.helperConfigs = helperConfigs;
            
            // console.log('🐕 Gaming Helper Manager initialized');
        }
        
        /**
         * Spawn a gaming helper
         */
        spawnHelper(type, breed) {
            if (!this.helperConfigs[type]) {
                console.warn(`🐕 Unknown helper type: ${type}`);
                return null;
            }
            
            if (!this.helperConfigs[type].breeds[breed]) {
                console.warn(`🐕 Unknown breed for ${type}: ${breed}`);
                return null;
            }
            
            // Remove existing helper of same type
            this.removeHelper(type);
            
            // Create new helper
            const helper = new GamingHelper(type, breed, this.app);
            helper.initialize();
            
            this.activeHelpers.set(type, helper);
            
            // console.log(`🐕 Spawned ${helper.breedConfig.name} (${type})`);
            return helper;
        }
        
        /**
         * Remove a gaming helper
         */
        removeHelper(type) {
            const helper = this.activeHelpers.get(type);
            if (helper) {
                helper.cleanup();
                this.activeHelpers.delete(type);
                // console.log(`🐕 Removed helper: ${type}`);
            }
        }
        
        /**
         * Update all active helpers
         */
        update() {
            this.activeHelpers.forEach(helper => {
                helper.update();
            });
        }
        
        /**
         * Get all active helpers
         */
        getActiveHelpers() {
            return Array.from(this.activeHelpers.values());
        }
        
        /**
         * Get helper status for UI
         */
        getHelperStatus() {
            const status = {};
            this.activeHelpers.forEach((helper, type) => {
                status[type] = helper.getStatus();
            });
            return status;
        }
        
        /**
         * Clear tapped entities for all helpers (when starting new game session)
         */
        clearTappedEntities() {
            this.activeHelpers.forEach(helper => {
                helper.tappedEntities.clear();
            });
            // console.log('🐕 Cleared tapped entities for all helpers');
        }
        
        /**
         * Cleanup all helpers
         */
        cleanup() {
            this.activeHelpers.forEach(helper => {
                helper.cleanup();
            });
            this.activeHelpers.clear();
            // console.log('🐕 All gaming helpers cleaned up');
        }
    }

    // ============================================================================
    // GLOBAL INTEGRATION
    // ============================================================================
    
    // Make classes available globally
    window.GamingHelper = GamingHelper;
    window.GamingHelperManager = GamingHelperManager;
    
    // Initialize manager if app is available
    if (window.app) {
        window.app.gamingHelperManager = new GamingHelperManager(window.app);
        // console.log('🐕 Gaming Helper Manager attached to app');
        
        // Add update loop integration
        if (window.app.registerUpdateCallback) {
            window.app.registerUpdateCallback(() => {
                window.app.gamingHelperManager.update();
            });
        }
    } else {
        // Wait for app to be available
        document.addEventListener('DOMContentLoaded', () => {
            const waitForApp = () => {
                if (window.app) {
                    window.app.gamingHelperManager = new GamingHelperManager(window.app);
                    // console.log('🐕 Gaming Helper Manager attached to app (deferred)');
                    
                    // Add update loop integration
                    if (window.app.registerUpdateCallback) {
                        window.app.registerUpdateCallback(() => {
                            window.app.gamingHelperManager.update();
                        });
                    }
                } else {
                    setTimeout(waitForApp, 100);
                }
            };
            waitForApp();
        });
    }
    
    // console.log('🐕 Premium Gaming Helpers module loaded successfully!');
})();


// ============================================================================
// MODULE: modules\premium\premiumIntegration.js
// ============================================================================
/**
 * PREMIUM FEATURES INTEGRATION
 * Connects premium features with the existing app systems
 * Provides communication bridge between Flutter and JavaScript premium features
 */

(function() {
    'use strict';
    
    console.log('🎯 Loading Premium Features Integration...');

    // ============================================================================
    // PREMIUM INTEGRATION MANAGER
    // ============================================================================
    
    class PremiumIntegration {
        constructor(app) {
            this.app = app;
            this.premiumWorldThemes = null;
            this.gamingHelperManager = null;
            this.currentTheme = 'greenplane'; // Default theme
            
            this.lastGamingLevelCheck = {
            level4: false,
            level5: false
        };

        // Periodically check for gaming level unlocks
        this.startGamingLevelMonitoring();
        
        console.log('🎯 Premium Integration Manager initialized');
        }
        
        /**
         * Initialize premium features
         */
        initialize() {
            // Wait for premium modules to load
            const checkModules = () => {
                if (window.PremiumWorldThemes && window.GamingHelperManager) {
                    this.premiumWorldThemes = this.app.premiumWorldThemes || new window.PremiumWorldThemes();
                    this.gamingHelperManager = this.app.gamingHelperManager || new window.GamingHelperManager(this.app);
                    
                    // Store references in app
                    this.app.premiumWorldThemes = this.premiumWorldThemes;
                    this.app.gamingHelperManager = this.gamingHelperManager;
                    
                    this.setupMessageHandlers();
                    console.log('🎯 Premium features initialized successfully');
                    return true;
                } else {
                    console.log('🎯 Waiting for premium modules to load...');
                    setTimeout(checkModules, 100);
                    return false;
                }
            };
            
            return checkModules();
        }
        
        /**
         * Setup message handlers for Flutter communication
         */
        setupMessageHandlers() {
            // Create premium feature channel for Flutter communication
            window.premiumFeatureChannel = {
                switchWorldTheme: (themeId) => this.switchWorldTheme(themeId),
                spawnHelper: (type, breed) => this.spawnHelper(type, breed),
                removeHelper: (type) => this.removeHelper(type),
                clearAllHelpers: () => this.clearAllHelpers(),
                getHelperStatus: () => this.getHelperStatus(),
                testHelper: () => this.testHelper(),
                isPremiumTheme: (themeId) => this.isPremiumTheme(themeId),
                getAvailableThemes: () => this.getAvailableThemes(),
                isPremiumFeatureUnlocked: (featureKey) => this.isPremiumFeatureUnlocked(featureKey),
            };
            
            console.log('🎯 Premium feature message handlers setup complete');
        }
        
        // ========================================================================
        // WORLD THEME METHODS
        // ========================================================================
        
        /**
         * Switch to a world theme (free or premium)
         */
        switchWorldTheme(themeId) {
            console.log(`🎨 Switching to theme: ${themeId}`);
            
            try {
                // Check if it's a premium theme
                if (this.premiumWorldThemes.isPremiumTheme(themeId)) {
                    console.log(`🎨 Applying premium theme: ${themeId}`);
                    
                    // Clean up previous premium theme effects
                    this.premiumWorldThemes.cleanup(this.app);
                    
                    // Apply the premium theme
                    const success = this.premiumWorldThemes.applyPremiumTheme(themeId, this.app);
                    
                    if (success) {
                        this.currentTheme = themeId;
                        console.log(`🎨 Successfully switched to premium theme: ${themeId}`);
                        return { success: true, theme: themeId, isPremium: true };
                    } else {
                        console.error(`🎨 Failed to apply premium theme: ${themeId}`);
                        return { success: false, error: 'Failed to apply premium theme' };
                    }
                } else {
                    // Use existing world switching for free themes
                    if (this.app.worldManager && this.app.worldManager.switchToWorld) {
                        // Clean up premium theme effects first
                        this.premiumWorldThemes.cleanup(this.app);
                        
                        // Switch to free theme
                        this.app.worldManager.switchToWorld(themeId);
                        this.currentTheme = themeId;
                        
                        console.log(`🎨 Successfully switched to free theme: ${themeId}`);
                        return { success: true, theme: themeId, isPremium: false };
                    } else {
                        console.error('🎨 World manager not available for free theme switching');
                        return { success: false, error: 'World manager not available' };
                    }
                }
            } catch (error) {
                console.error(`🎨 Error switching theme to ${themeId}:`, error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Check if a theme is premium
         */
        isPremiumTheme(themeId) {
            return this.premiumWorldThemes ? this.premiumWorldThemes.isPremiumTheme(themeId) : false;
        }
        
        /**
         * Get all available themes
         */
        getAvailableThemes() {
            const freeThemes = ['greenplane', 'ocean', 'space'];
            const premiumThemes = ['dazzle', 'forest', 'cave', 'christmas'];
            
            return {
                free: freeThemes,
                premium: premiumThemes,
                current: this.currentTheme
            };
        }
        
        /**
         * Check if a premium feature is unlocked
         * This is a placeholder that assumes features are unlocked for testing
         * In production, this should check with Flutter's premium service
         */
        isPremiumFeatureUnlocked(featureKey) {
            console.log(`🎯 Checking premium feature: ${featureKey}`);
            
            // For now, assume premium gaming levels are unlocked for testing
            // This should eventually communicate with Flutter's PremiumService
            if (featureKey === 'gaming_level_4' || featureKey === 'gaming_level_5') {
                // Check localStorage for development testing first
                const testKey = featureKey === 'gaming_level_4' ? 'test_premium_level_4' : 'test_premium_level_5';
                const isTestUnlocked = localStorage.getItem(testKey) === 'true';
                
                if (isTestUnlocked) {
                    console.log(`🎯 Premium feature ${featureKey} unlocked via localStorage test key`);
                    return true;
                }
                
                // TODO: Add proper Flutter bridge communication here
                // For now, default to unlocked for testing
                console.log(`🎯 Premium feature ${featureKey} defaulting to unlocked for testing`);
                return true;
            }
            
            // For other features, assume unlocked
            return true;
        }
        
        // ========================================================================
        // GAMING HELPER METHODS
        // ========================================================================
        
        /**
         * Spawn a gaming helper
         */
        spawnHelper(type, breed) {
            console.log(`🐕 Spawning helper: ${type} (${breed})`);
            
            if (!this.gamingHelperManager) {
                console.error('🐕 Gaming helper manager not available');
                return { success: false, error: 'Gaming helper manager not available' };
            }
            
            try {
                const helper = this.gamingHelperManager.spawnHelper(type, breed);
                
                if (helper) {
                    console.log(`🐕 Successfully spawned ${type} helper: ${breed}`);
                    return { 
                        success: true, 
                        helper: {
                            type: type,
                            breed: breed,
                            name: helper.breedConfig.name
                        }
                    };
                } else {
                    console.error(`🐕 Failed to spawn helper: ${type} (${breed})`);
                    return { success: false, error: 'Failed to spawn helper' };
                }
            } catch (error) {
                console.error(`🐕 Error spawning helper:`, error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Remove a specific helper type
         */
        removeHelper(type) {
            console.log(`🐕 Removing helper: ${type}`);
            
            if (!this.gamingHelperManager) {
                console.error('🐕 Gaming helper manager not available');
                return { success: false, error: 'Gaming helper manager not available' };
            }
            
            try {
                this.gamingHelperManager.removeHelper(type);
                console.log(`🐕 Successfully removed helper: ${type}`);
                return { success: true, removed: type };
            } catch (error) {
                console.error(`🐕 Error removing helper:`, error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Clear all helpers
         */
        clearAllHelpers() {
            console.log('🐕 Clearing all helpers');
            
            if (!this.gamingHelperManager) {
                console.error('🐕 Gaming helper manager not available');
                return { success: false, error: 'Gaming helper manager not available' };
            }
            
            try {
                this.gamingHelperManager.cleanup();
                console.log('🐕 Successfully cleared all helpers');
                return { success: true };
            } catch (error) {
                console.error('🐕 Error clearing helpers:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Get helper status for UI
         */
        getHelperStatus() {
            if (!this.gamingHelperManager) {
                return { active: false, helpers: [] };
            }
            
            try {
                const status = this.gamingHelperManager.getHelperStatus();
                const helpers = this.gamingHelperManager.getActiveHelpers();
                
                return {
                    active: helpers.length > 0,
                    count: helpers.length,
                    helpers: Object.values(status),
                    detailed: status
                };
            } catch (error) {
                console.error('🐕 Error getting helper status:', error);
                return { active: false, helpers: [], error: error.message };
            }
        }
        
        /**
         * Test helper functionality
         */
        testHelper() {
            console.log('🐕 Testing helper functionality');
            
            if (!this.gamingHelperManager) {
                return { success: false, error: 'Gaming helper manager not available' };
            }
            
            try {
                // Clear tapped entities to allow retapping
                this.gamingHelperManager.clearTappedEntities();
                
                // Get treasure stats if available
                let treasureStats = {};
                if (this.app.treasureBoxManager) {
                    treasureStats = this.app.treasureBoxManager.getTreasureStats();
                }
                
                return {
                    success: true,
                    message: 'Helper test completed - tapped entities cleared',
                    treasureStats: treasureStats,
                    helperStatus: this.getHelperStatus()
                };
            } catch (error) {
                console.error('🐕 Error testing helpers:', error);
                return { success: false, error: error.message };
            }
        }
        
        // ========================================================================
        // INTEGRATION WITH EXISTING SYSTEMS
        // ========================================================================
        
        /**
         * Integrate with existing object position updates for tree trunks
         */
        onObjectPositionChanged(object) {
            // Update tree trunk for forest theme
            if (this.currentTheme === 'forest' && this.premiumWorldThemes) {
                this.premiumWorldThemes.updateTreeTrunkForObject(object, this.app);
            }
        }
        
        /**
         * Get current premium features status
         */
        getStatus() {
            return {
                initialized: !!(this.premiumWorldThemes && this.gamingHelperManager),
                currentTheme: this.currentTheme,
                helperStatus: this.getHelperStatus(),
                availableThemes: this.getAvailableThemes()
            };
        }
    }

    // ============================================================================
    // GLOBAL INTEGRATION
    // ============================================================================
    
    // Make available globally
    window.PremiumIntegration = PremiumIntegration;
    
    // Initialize when app is available
    const initializePremiumIntegration = () => {
        if (window.app) {
            window.app.premiumIntegration = new PremiumIntegration(window.app);
            
            // Initialize after a brief delay to ensure all modules are loaded
            setTimeout(() => {
                window.app.premiumIntegration.initialize();
            }, 500);
            
            console.log('🎯 Premium Integration attached to app');
        } else {
            console.log('🎯 Waiting for app to be available...');
            setTimeout(initializePremiumIntegration, 100);
        }
    };
    
    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePremiumIntegration);
    } else {
        initializePremiumIntegration();
    }
    
    console.log('🎯 Premium Features Integration module loaded successfully!');
})();


// ============================================================================
// PREMIUM BUNDLE COMPLETE - 18 modules loaded
// ============================================================================
console.log("Three.js File Viewer - PREMIUM BUNDLE loaded successfully! (18 modules)");

