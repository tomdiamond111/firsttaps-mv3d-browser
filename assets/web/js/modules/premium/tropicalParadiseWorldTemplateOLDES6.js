/**
 * TROPICAL PARADISE WORLD TEMPLATE (Premium)
 * Beautiful tropical beach environment with palm trees, rippling water, cliffs, and sun
 * Features: Sandy beach, animated water, palm trees, rocky cliffs, lush hills, tropical sky
 * Extends SimpleWorldTemplate with ground-based gravity (no Y movement)
 */

(function() {
    'use strict';
    
    console.log('🌴 Loading Tropical Paradise World Template...');

    class TropicalParadiseWorldTemplate extends SimpleWorldTemplate {
        constructor(THREE, config = {}) {
            super(THREE, {
                id: 'tropical-paradise',
                displayName: 'Tropical Paradise',
                description: 'Beautiful tropical beach with palm trees, rippling water, and sunny skies',
                menuIcon: 'palm_tree',
                isPremium: true,
                bundle: 'premium',
                category: 'environment',
                
                // Lighting configuration - bright tropical sunlight
                ambientColor: 0xFFE4B5, // Warm moccasin
                ambientIntensity: 0.7,
                directionalColor: 0xFFF8DC, // Cornsilk - warm sunlight
                directionalIntensity: 0.9,
                
                // Ground plane configuration
                groundPlane: {
                    size: 300,
                    color: 0xE6D7A5, // Sandy beach color
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
                setupFunction: this.setupTropicalEnvironment.bind(this),
                
                ...config
            });
            
            // Tropical-specific properties
            this.palmTrees = [];
            this.waterPlane = null;
            this.animationMixers = [];
            this.tropicalElements = [];
            this.groundLevelY = 0;
            
            console.log('🌴 Tropical Paradise world template initialized');
        }

        /**
         * Get static configuration for registry
         */
        static getConfig() {
            return {
                id: 'tropical-paradise',
                displayName: 'Tropical Paradise',
                description: 'Beautiful tropical beach with palm trees, rippling water, and sunny skies',
                isPremium: true,
                bundle: 'premium',
                category: 'environment',
                menuIcon: 'palm_tree',
                version: '1.0.0'
            };
        }

        /**
         * Camera configuration for tropical paradise
         */
        getHomeViewPosition() {
            return { x: 0, y: 8, z: 25 }; // Elevated beach view
        }

        getHomeViewTarget() {
            return { x: 0, y: 0, z: 0 }; // Look at beach center
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
        setupTropicalEnvironment() {
            console.log('🌴 Setting up Tropical Paradise environment...');
            
            try {
                // Create tropical sky with gradient
                this.createTropicalSky();
                
                // Create animated water plane
                this.createAnimatedWater();
                
                // Create palm trees around the beach
                this.createPalmTrees();
                
                // Create rocky cliffs
                this.createRockyCliffs();
                
                // Create lush green hills
                this.createLushHills();
                
                // Create sun
                this.createSun();
                
                // Add some seashells and beach decorations
                this.createBeachDecorations();
                
                console.log('🌴 Tropical Paradise environment setup complete');
                
            } catch (error) {
                console.error('🌴 Error setting up Tropical Paradise:', error);
            }
        }

        /**
         * Create tropical sky dome with gradient
         */
        createTropicalSky() {
            console.log('🌴 Creating tropical sky dome...');
            
            const skyGeometry = new this.THREE.SphereGeometry(500, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
            
            const skyMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    topColor: { value: new this.THREE.Color(0x0077FF) },    // Bright sky blue
                    bottomColor: { value: new this.THREE.Color(0x89DCFF) }, // Light cyan at horizon
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
         * Create animated water plane with rippling effect
         */
        createAnimatedWater() {
            console.log('🌴 Creating animated water plane...');
            
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
            this.waterPlane.userData.animated = true;
            this.waterPlane.userData.waterMaterial = waterMaterial;
            
            this.addTrackedObject(this.waterPlane, 'water');
            this.tropicalElements.push(this.waterPlane);
        }

        /**
         * Create palm trees around the beach
         */
        createPalmTrees() {
            console.log('🌴 Creating palm trees...');
            
            const treePositions = [
                { x: -50, z: 40 }, { x: -30, z: 50 }, { x: 40, z: 45 },
                { x: 60, z: -20 }, { x: -60, z: -30 }, { x: 0, z: -65 },
                { x: 30, z: -50 }, { x: -40, z: 20 }, { x: 50, z: 10 },
                { x: -20, z: -40 }
            ];
            
            treePositions.forEach((pos, index) => {
                const palmTree = this.createPalmTree(pos.x, pos.z);
                this.palmTrees.push(palmTree);
            });
            
            console.log(`🌴 Created ${this.palmTrees.length} palm trees`);
        }

        /**
         * Create a single palm tree
         */
        createPalmTree(x, z) {
            const treeGroup = new this.THREE.Group();
            
            // Trunk - brown cylinder with slight taper
            const trunkHeight = 8 + Math.random() * 3;
            const trunkGeometry = new this.THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 8);
            const trunkMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x8B4513 // Saddle brown
            });
            const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = trunkHeight / 2;
            treeGroup.add(trunk);
            
            // Palm leaves - cone shapes arranged in a crown
            const leafCount = 6;
            const leafHeight = 4;
            const leafRadius = 1.5;
            
            for (let i = 0; i < leafCount; i++) {
                const angle = (i / leafCount) * Math.PI * 2;
                const leafGeometry = new this.THREE.ConeGeometry(leafRadius, leafHeight, 4);
                const leafMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x228B22, // Forest green
                    side: this.THREE.DoubleSide
                });
                const leaf = new this.THREE.Mesh(leafGeometry, leafMaterial);
                
                // Position and rotate leaf
                leaf.position.y = trunkHeight + 1;
                leaf.position.x = Math.cos(angle) * 2;
                leaf.position.z = Math.sin(angle) * 2;
                leaf.rotation.z = angle;
                leaf.rotation.x = Math.PI / 3; // Angle leaves outward
                
                treeGroup.add(leaf);
            }
            
            // Position tree group
            treeGroup.position.set(x, 0, z);
            treeGroup.userData.isPalmTree = true;
            
            this.addTrackedObject(treeGroup, 'palmTree');
            return treeGroup;
        }

        /**
         * Create rocky cliffs around the perimeter
         */
        createRockyCliffs() {
            console.log('🌴 Creating rocky cliffs...');
            
            const cliffPositions = [
                { x: -80, z: -80, width: 30, height: 15, depth: 20 },
                { x: 80, z: 70, width: 25, height: 20, depth: 25 },
                { x: -70, z: 80, width: 35, height: 18, depth: 20 },
                { x: 85, z: -60, width: 28, height: 16, depth: 22 }
            ];
            
            cliffPositions.forEach(pos => {
                const cliffGeometry = new this.THREE.BoxGeometry(pos.width, pos.height, pos.depth);
                const cliffMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x696969, // Dim gray
                    flatShading: true
                });
                const cliff = new this.THREE.Mesh(cliffGeometry, cliffMaterial);
                
                cliff.position.set(pos.x, pos.height / 2, pos.z);
                cliff.rotation.y = Math.random() * Math.PI / 4; // Slight random rotation
                cliff.userData.isCliff = true;
                
                this.addTrackedObject(cliff, 'cliff');
            });
        }

        /**
         * Create lush green hills
         */
        createLushHills() {
            console.log('🌴 Creating lush hills...');
            
            const hillPositions = [
                { x: 60, z: 50, radius: 25, height: 12 },
                { x: -65, z: 40, radius: 20, height: 10 },
                { x: 50, z: -70, radius: 22, height: 11 },
                { x: -50, z: -60, radius: 18, height: 9 }
            ];
            
            hillPositions.forEach(pos => {
                const hillGeometry = new this.THREE.SphereGeometry(pos.radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
                const hillMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x4A9F4A // Medium green
                });
                const hill = new this.THREE.Mesh(hillGeometry, hillMaterial);
                
                hill.position.set(pos.x, 0, pos.z);
                hill.scale.y = pos.height / pos.radius; // Flatten to create hill shape
                hill.userData.isHill = true;
                
                this.addTrackedObject(hill, 'hill');
            });
        }

        /**
         * Create sun in the sky
         */
        createSun() {
            console.log('🌴 Creating sun...');
            
            const sunGeometry = new this.THREE.SphereGeometry(15, 32, 32);
            const sunMaterial = new this.THREE.MeshBasicMaterial({ 
                color: 0xFFFF00, // Yellow
                emissive: 0xFFFF00,
                emissiveIntensity: 1.0
            });
            const sun = new this.THREE.Mesh(sunGeometry, sunMaterial);
            
            sun.position.set(-100, 120, -80);
            sun.userData.isSun = true;
            
            this.addTrackedObject(sun, 'sun');
        }

        /**
         * Create beach decorations (seashells, rocks)
         */
        createBeachDecorations() {
            console.log('🌴 Creating beach decorations...');
            
            // Add some small rocks/shells scattered on the beach
            for (let i = 0; i < 15; i++) {
                const size = 0.3 + Math.random() * 0.5;
                const shellGeometry = new this.THREE.SphereGeometry(size, 8, 8);
                const shellMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: Math.random() > 0.5 ? 0xFFE4B5 : 0xDEB887 // Moccasin or burlywood
                });
                const shell = new this.THREE.Mesh(shellGeometry, shellMaterial);
                
                const angle = Math.random() * Math.PI * 2;
                const distance = 20 + Math.random() * 40;
                shell.position.set(
                    Math.cos(angle) * distance,
                    size / 2,
                    Math.sin(angle) * distance
                );
                
                shell.userData.isDecoration = true;
                this.addTrackedObject(shell, 'decoration');
            }
        }

        /**
         * Update animation (called each frame)
         */
        update(deltaTime) {
            try {
                // Animate water ripples
                if (this.waterPlane && this.waterPlane.userData.waterMaterial) {
                    this.waterPlane.userData.waterMaterial.uniforms.time.value += deltaTime;
                }
                
            } catch (error) {
                console.error('🌴 Error updating Tropical Paradise:', error);
            }
        }

        /**
         * Clean up tropical paradise environment
         */
        cleanupEnvironment() {
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
            this.waterPlane = null;
            this.tropicalElements = [];
            this.trackedObjects.clear();
            
            console.log('🌴 Tropical Paradise cleanup complete');
        }

        /**
         * Dispose of the world template
         */
        dispose() {
            console.log('🌴 Disposing Tropical Paradise world template');
            this.cleanupEnvironment();
        }
    }

    // Export to global scope
    window.TropicalParadiseWorldTemplate = TropicalParadiseWorldTemplate;
    
    console.log('🌴 TropicalParadiseWorldTemplate module loaded');
    console.log('🌴 window.worldTemplateRegistryHelper available:', !!window.worldTemplateRegistryHelper);
    console.log('🌴 window.worldTemplateAutoIntegration available:', !!window.worldTemplateAutoIntegration);
    console.log('🌴 window.dynamicPremiumDetection available:', !!window.dynamicPremiumDetection);
    
    // Auto-register with helper system if available
    if (window.worldTemplateRegistryHelper) {
        try {
            console.log('🌴 Attempting to register Tropical Paradise...');
            window.worldTemplateRegistryHelper.registerNewTemplate(
                TropicalParadiseWorldTemplate,
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
            console.log('🌴 ✅ Tropical Paradise auto-registered successfully');
        } catch (error) {
            console.error('🌴 ❌ Failed to auto-register Tropical Paradise:', error);
        }
    } else {
        console.error('🌴 ❌ worldTemplateRegistryHelper NOT AVAILABLE - cannot register!');
    }
    
    // ============================================================================
    // GLOBAL INTEGRATION (Same as DazzleBedroomWorldTemplate and ForestRealmWorldTemplate)
    // ============================================================================
    
    // Make world template class available globally for the main application
    window.TropicalParadiseWorldTemplate = TropicalParadiseWorldTemplate;
    
    console.log('🌴 Tropical Paradise World Template class loaded successfully!');

})();
