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