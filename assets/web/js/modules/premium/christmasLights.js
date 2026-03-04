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