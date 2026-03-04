/**
 * FLOWER WONDERLAND WORLD TEMPLATE (Premium)
 * Beautiful flower field environment with swaying flowers, hedges, and clouds
 * Features: Colorful flowers (daisies, roses, sunflowers, tulips, pansies), hedges, tree groves, sky with clouds
 * Extends SimpleWorldTemplate with ground-based gravity (no Y movement)
 */

(function() {
    'use strict';
    
    console.log('🌸 Loading Flower Wonderland World Template...');

    class FlowerWonderlandWorldTemplate extends SimpleWorldTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                id: 'flower-wonderland',
                displayName: 'Flower Wonderland',
                description: 'Standing in a field of colorful flowers with hedges and tree groves',
                menuIcon: 'flower',
                isPremium: true,
                bundle: 'premium',
                category: 'environment',
                
                // Lighting configuration - bright cheerful daylight
                ambientColor: 0xFFFFE0, // Light yellow
                ambientIntensity: 0.8,
                directionalColor: 0xFFFFFF, // Pure white sunlight
                directionalIntensity: 0.9,
                
                // Ground plane configuration - lush grass
                groundPlane: {
                    size: 300,
                    color: 0x32CD32, // Lime green - vibrant grass
                    position: { x: 0, y: -0.01, z: 0 }
                },
                
                // Background and atmosphere
                backgroundColor: 0x87CEEB, // Sky blue fallback
                fog: {
                    color: 0xB0E0E6, // Powder blue
                    near: 150,
                    far: 500
                },
                
                // Setup function called during environment creation
                setupFunction: this.setupFlowerWonderlandEnvironment.bind(this),
                
                ...config
            });
            
            // Flower wonderland specific properties
            this.flowers = [];
            this.hedges = [];
            this.treeGroves = [];
            this.clouds = [];
            this.animationMixers = [];
            this.wonderlandElements = [];
            this.groundLevelY = 0;
            
            console.log('🌸 Flower Wonderland world template initialized');
        }

        /**
         * Get static configuration for registry
         */
        static getConfig() {
            return {
                id: 'flower-wonderland',
                displayName: 'Flower Wonderland',
                description: 'Standing in a field of colorful flowers with hedges and tree groves',
                isPremium: true,
                bundle: 'premium',
                category: 'environment',
                menuIcon: 'flower',
                version: '1.0.0'
            };
        }

        /**
         * Camera configuration for flower wonderland
         */
        getHomeViewPosition() {
            return { x: 0, y: 6, z: 20 }; // Elevated field view
        }

        getHomeViewTarget() {
            return { x: 0, y: 0, z: 0 }; // Look at field center
        }

        applyCameraConstraints(controls) {
            // Ground-based constraints similar to green plane
            controls.minDistance = 5.0;
            controls.maxDistance = 150.0;
            controls.maxPolarAngle = Math.PI * 0.45; // Prevent seeing underside
            controls.minPolarAngle = Math.PI * 0.05; // Allow overhead view
        }

        /**
         * Positioning constraints - ground-based with gravity
         */
        getPositioningConstraints() {
            return {
                requiresSupport: true,
                allowedStackingDirections: ['top'],
                worldBoundaries: {
                    x: { min: -150, max: 150 },
                    y: { min: 0, max: 150 },
                    z: { min: -150, max: 150 }
                }
            };
        }

        /**
         * Apply position constraints (ground-based like green plane)
         */
        applyPositionConstraints(object, newPosition, allObjects = []) {
            const constraints = this.getPositioningConstraints();
            
            let constrainedX = Math.max(constraints.worldBoundaries.x.min, 
                Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            let constrainedZ = Math.max(constraints.worldBoundaries.z.min, 
                Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            const objectHeight = object.userData?.objectHeight || 
                object.geometry?.parameters?.height || 1;
            let constrainedY = this.groundLevelY + objectHeight / 2;
            
            // Check for support from other objects
            if (constraints.requiresSupport && allObjects.length > 0) {
                const otherObjects = allObjects.filter(obj => obj !== object);
                let maxSupportHeight = this.groundLevelY + objectHeight / 2;
                
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
        }

        /**
         * Main environment setup function
         */
        setupFlowerWonderlandEnvironment() {
            console.log('🌸 Setting up Flower Wonderland environment...');
            
            try {
                // Create beautiful sky with clouds
                this.createFlowerWonderlandSky();
                
                // Create colorful flowers
                this.createFlowerField();
                
                // Create hedges
                this.createHedges();
                
                // Create tree groves
                this.createTreeGroves();
                
                // Create clouds (both white and dark rain clouds)
                this.createClouds();
                
                console.log('🌸 Flower Wonderland environment setup complete');
                
            } catch (error) {
                console.error('🌸 Error setting up Flower Wonderland:', error);
            }
        }

        /**
         * Create sky dome with beautiful blue gradient
         */
        createFlowerWonderlandSky() {
            console.log('🌸 Creating wonderland sky dome...');
            
            const skyGeometry = new this.THREE.SphereGeometry(500, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
            
            const skyMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    topColor: { value: new this.THREE.Color(0x0055FF) },    // Deep blue
                    bottomColor: { value: new this.THREE.Color(0x89DCFF) }, // Light cyan
                    offset: { value: 0.02 },
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
                    uniform vec3 bottomColor;
                    uniform float offset;
                    uniform float exponent;
                    varying vec3 vWorldPosition;
                    void main() {
                        float h = normalize(vWorldPosition).y;
                        float ramp = max(offset, pow(max(h, 0.0), exponent));
                        gl_FragColor = vec4(mix(bottomColor, topColor, ramp), 1.0);
                    }
                `,
                side: this.THREE.BackSide
            });
            
            const skyDome = new this.THREE.Mesh(skyGeometry, skyMaterial);
            skyDome.position.y = 0;
            this.addTrackedObject(skyDome, 'sky');
        }

        /**
         * Create field of colorful flowers
         */
        createFlowerField() {
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
            
            console.log(`🌸 Created ${this.flowers.length} flowers`);
        }

        /**
         * Create a single flower based on type
         */
        createFlower(type, x, z) {
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
            
            this.addTrackedObject(flowerGroup, 'flower');
            return flowerGroup;
        }

        /**
         * Create daisy flower (white petals, yellow center)
         */
        createDaisy() {
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
        }

        /**
         * Create rose flower (red spherical cluster)
         */
        createRose() {
            const roseGeometry = new this.THREE.SphereGeometry(0.25, 12, 12);
            const roseColors = [0xFF0000, 0xFF1493, 0xFF69B4]; // Red, deep pink, hot pink
            const roseMaterial = new this.THREE.MeshLambertMaterial({ 
                color: roseColors[Math.floor(Math.random() * roseColors.length)]
            });
            return new this.THREE.Mesh(roseGeometry, roseMaterial);
        }

        /**
         * Create sunflower (large yellow with dark center)
         */
        createSunflower() {
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
        }

        /**
         * Create tulip (cone-shaped colorful flower)
         */
        createTulip() {
            const tulipGeometry = new this.THREE.ConeGeometry(0.25, 0.6, 6);
            const tulipColors = [0xFF0000, 0xFF69B4, 0xFFFF00, 0xFF4500, 0x9370DB];
            const tulipMaterial = new this.THREE.MeshLambertMaterial({ 
                color: tulipColors[Math.floor(Math.random() * tulipColors.length)]
            });
            const tulip = new this.THREE.Mesh(tulipGeometry, tulipMaterial);
            tulip.rotation.x = Math.PI; // Point upward
            tulip.position.y = 0.3;
            return tulip;
        }

        /**
         * Create pansy (small multi-colored flower)
         */
        createPansy() {
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
        }

        /**
         * Create hedges around the field
         */
        createHedges() {
            console.log('🌸 Creating hedges...');
            
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
                
                this.addTrackedObject(hedge, 'hedge');
                this.hedges.push(hedge);
            });
            
            console.log(`🌸 Created ${this.hedges.length} hedges`);
        }

        /**
         * Create tree groves
         */
        createTreeGroves() {
            console.log('🌸 Creating tree groves...');
            
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
            
            console.log(`🌸 Created ${this.treeGroves.length} trees in groves`);
        }

        /**
         * Create a simple tree
         */
        createSimpleTree(x, z) {
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
            
            this.addTrackedObject(treeGroup, 'tree');
            return treeGroup;
        }

        /**
         * Create clouds in the sky
         */
        createClouds() {
            console.log('🌸 Creating clouds...');
            
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
            
            console.log(`🌸 Created ${this.clouds.length} clouds`);
        }

        /**
         * Create a single cloud
         */
        createCloud(color, size) {
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
            this.addTrackedObject(cloudGroup, 'cloud');
            return cloudGroup;
        }

        /**
         * Update animation (called each frame) - gentle flower swaying
         */
        update(deltaTime) {
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
                
            } catch (error) {
                console.error('🌸 Error updating Flower Wonderland:', error);
            }
        }

        /**
         * Clean up flower wonderland environment
         */
        cleanupEnvironment() {
            console.log('🌸 Cleaning up Flower Wonderland environment...');
            
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
            
            this.flowers = [];
            this.hedges = [];
            this.treeGroves = [];
            this.clouds = [];
            this.wonderlandElements = [];
            this.trackedObjects.clear();
            
            console.log('🌸 Flower Wonderland cleanup complete');
        }

        /**
         * Dispose of the world template
         */
        dispose() {
            console.log('🌸 Disposing Flower Wonderland world template');
            this.cleanupEnvironment();
        }
    }

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
            console.error('🌸 ❌ Failed to auto-register Flower Wonderland:', error);
        }
    } else {
        console.error('🌸 ❌ worldTemplateRegistryHelper NOT AVAILABLE - cannot register!');
    }
    
    // ============================================================================
    // GLOBAL INTEGRATION (Same as DazzleBedroomWorldTemplate and ForestRealmWorldTemplate)
    // ============================================================================
    
    // Make world template class available globally for the main application
    window.FlowerWonderlandWorldTemplate = FlowerWonderlandWorldTemplate;
    
    console.log('🌸 Flower Wonderland World Template class loaded successfully!');

})();
