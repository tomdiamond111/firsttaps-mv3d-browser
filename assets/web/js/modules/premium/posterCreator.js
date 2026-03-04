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
