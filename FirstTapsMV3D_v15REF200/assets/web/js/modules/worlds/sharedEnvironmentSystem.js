// ============================================================================
// SHARED ENVIRONMENT SYSTEM
// ============================================================================
// Provides modular environment components that can be shared across world templates
// Each world template can choose which components to use and customize them

(function() {
    'use strict';

    console.log("Loading SharedEnvironmentSystem module...");

    /**
     * SharedEnvironmentSystem - Modular environment components for world templates
     * Provides: sky systems, terrain features, atmospheric effects, vegetation
     */
    class SharedEnvironmentSystem {
        constructor(THREE, scene) {
            this.THREE = THREE;
            this.scene = scene;
            this.environmentObjects = [];
        }

        // ============================================================================
        // SKY SYSTEMS
        // ============================================================================

        /**
         * Create enhanced gradient sky dome
         * @param {Object} config - Sky configuration
         * @param {number} config.topColor - Sky color at zenith (default: 0x0077be)
         * @param {number} config.bottomColor - Sky color at horizon (default: 0x87ceeb)
         * @param {number} config.radius - Sky dome radius (default: 500)
         * @param {string} config.theme - Theme variant: 'default', 'ocean', 'space', 'sunset'
         */
        createEnhancedSky(config = {}) {
            console.log('🌅 Creating enhanced gradient sky dome...');
            
            const skyConfig = this.getSkyStyling(config.theme || 'default', config);
            
            // Create sky dome geometry
            const skyGeometry = new this.THREE.SphereGeometry(
                skyConfig.radius, 
                32, 16, 
                0, Math.PI * 2, 
                0, Math.PI * 0.5
            );
            
            // Create gradient material for sky
            const skyMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    topColor: { value: new this.THREE.Color(skyConfig.topColor) },
                    bottomColor: { value: new this.THREE.Color(skyConfig.bottomColor) },
                    offset: { value: skyConfig.offset },
                    exponent: { value: skyConfig.exponent }
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
                        float h = normalize(vWorldPosition + offset).y;
                        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                    }
                `,
                side: this.THREE.BackSide
            });
            
            // Create sky dome mesh
            const skyDome = new this.THREE.Mesh(skyGeometry, skyMaterial);
            skyDome.userData.templateObject = true;
            skyDome.userData.isSky = true;
            skyDome.userData.environmentType = 'sky';
            this.scene.add(skyDome);
            this.environmentObjects.push(skyDome);
            
            console.log(`✅ Enhanced ${config.theme || 'default'} gradient sky dome created`);
            return skyDome;
        }

        /**
         * Get sky styling based on theme
         */
        getSkyStyling(theme, overrides = {}) {
            const themes = {
                default: {
                    topColor: 0x0077be,    // Sky blue at zenith
                    bottomColor: 0x87ceeb, // Light blue at horizon
                    radius: 500,
                    offset: 0.33,
                    exponent: 0.6
                },
                ocean: {
                    topColor: 0x004d7a,    // Deeper blue for ocean
                    bottomColor: 0x66b3ff, // Lighter blue-white at horizon
                    radius: 500,
                    offset: 0.25,
                    exponent: 0.8
                },
                space: {
                    topColor: 0x000011,    // Deep space
                    bottomColor: 0x000033, // Slightly lighter at horizon
                    radius: 800,
                    offset: 0.1,
                    exponent: 1.2
                },
                sunset: {
                    topColor: 0x87ceeb,    // Blue at zenith
                    bottomColor: 0xff7f50, // Orange at horizon
                    radius: 500,
                    offset: 0.4,
                    exponent: 0.5
                }
            };

            return { ...themes[theme], ...overrides };
        }

        // ============================================================================
        // CLOUD SYSTEMS
        // ============================================================================

        /**
         * Create cloud system
         * @param {Object} config - Cloud configuration
         * @param {number} config.count - Number of clouds (default: 8)
         * @param {string} config.style - Cloud style: 'fluffy', 'wispy', 'storm'
         * @param {string} config.theme - Theme for cloud coloring
         */
        createClouds(config = {}) {
            console.log('☁️ Creating cloud system...');
            
            const cloudConfig = {
                count: config.count || 8,
                style: config.style || 'fluffy',
                theme: config.theme || 'default',
                height: config.height || 80,
                spread: config.spread || 600,  // Moved 2x further from origin (was 300)
                ...config
            };

            const clouds = [];
            
            for (let i = 0; i < cloudConfig.count; i++) {
                const cloud = this.createSingleCloud(cloudConfig, i);
                if (cloud) {
                    clouds.push(cloud);
                    this.environmentObjects.push(cloud);
                }
            }
            
            console.log(`✅ Created ${clouds.length} ${cloudConfig.style} clouds`);
            return clouds;
        }

        /**
         * Create a single cloud
         */
        createSingleCloud(config, index) {
            const cloudGroup = new this.THREE.Group();
            
            // Cloud positioning
            const angle = (index / config.count) * Math.PI * 2;
            const distance = config.spread * (0.7 + Math.random() * 0.6);
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            const y = config.height + (Math.random() - 0.5) * 20;
            
            cloudGroup.position.set(x, y, z);
            
            // Cloud style variations
            const styles = {
                fluffy: { spheres: 5, scale: [15, 20], opacity: 0.8 },
                wispy: { spheres: 3, scale: [25, 35], opacity: 0.6 },
                storm: { spheres: 7, scale: [12, 18], opacity: 0.9 }
            };
            
            const style = styles[config.style] || styles.fluffy;
            
            // Create cloud from multiple spheres
            for (let j = 0; j < style.spheres; j++) {
                const radius = style.scale[0] + Math.random() * (style.scale[1] - style.scale[0]);
                const sphereGeometry = new this.THREE.SphereGeometry(radius, 8, 6);
                
                // Cloud material based on theme
                const cloudMaterial = new this.THREE.MeshLambertMaterial({
                    color: this.getCloudColor(config.theme),
                    transparent: true,
                    opacity: style.opacity * (0.8 + Math.random() * 0.2)
                });
                
                const sphere = new this.THREE.Mesh(sphereGeometry, cloudMaterial);
                
                // Position spheres to form cloud shape
                sphere.position.set(
                    (Math.random() - 0.5) * radius * 1.5,
                    (Math.random() - 0.5) * radius * 0.8,
                    (Math.random() - 0.5) * radius * 1.5
                );
                
                cloudGroup.add(sphere);
            }
            
            cloudGroup.userData.templateObject = true;
            cloudGroup.userData.environmentType = 'cloud';
            cloudGroup.userData.animate = (time) => {
                // Gentle cloud movement
                cloudGroup.position.x += Math.sin(time * 0.0001 + index) * 0.02;
                cloudGroup.rotation.y += 0.0001;
            };
            
            this.scene.add(cloudGroup);
            return cloudGroup;
        }

        /**
         * Get cloud color based on theme
         */
        getCloudColor(theme) {
            const colors = {
                default: 0xffffff,  // White clouds
                ocean: 0xf0f8ff,    // Alice blue
                space: 0x4a4a4a,    // Gray (nebula-like)
                sunset: 0xffd700    // Golden clouds
            };
            return colors[theme] || colors.default;
        }

        // ============================================================================
        // VEGETATION SYSTEMS
        // ============================================================================

        /**
         * Create forest perimeter
         * @param {Object} config - Forest configuration
         */
        createForestPerimeter(config = {}) {
            console.log('🌲 Creating forest perimeter...');
            
            const forestConfig = {
                radius: config.radius || 400,  // Moved 2x further from origin (was 200)
                treeCount: config.treeCount || 60,  // Reduced by half again for tablet performance (was 120, originally 240)
                treeHeight: config.treeHeight || [15, 25],
                theme: config.theme || 'default',
                ...config
            };

            const trees = [];
            
            for (let i = 0; i < forestConfig.treeCount; i++) {
                const tree = this.createSingleTree(forestConfig, i);
                if (tree) {
                    trees.push(tree);
                    this.environmentObjects.push(tree);
                }
            }
            
            console.log(`✅ Created forest perimeter with ${trees.length} trees`);
            return trees;
        }

        /**
         * Create a single tree
         */
        createSingleTree(config, index) {
            const treeGroup = new this.THREE.Group();
            
            // Tree positioning around perimeter
            const angle = (index / config.treeCount) * Math.PI * 2;
            const radiusVariation = config.radius + (Math.random() - 0.5) * 40;
            const x = Math.cos(angle) * radiusVariation;
            const z = Math.sin(angle) * radiusVariation;
            
            treeGroup.position.set(x, 0, z);
            
            // Tree height variation
            const height = config.treeHeight[0] + Math.random() * (config.treeHeight[1] - config.treeHeight[0]);
            
            // Create trunk - shorter and less visible
            const trunkGeometry = new this.THREE.CylinderGeometry(0.6, 0.9, height * 0.25, 6); // Smaller radius, shorter height, fewer segments
            const trunkMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x654321, // Darker brown
                transparent: true,
                opacity: 0.7 // Less visible
            });
            const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = height * 0.125; // Lower position due to shorter trunk
            treeGroup.add(trunk);
            
            // Create foliage - positioned lower to hide more of trunk
            const foliageGeometry = new this.THREE.ConeGeometry(height * 0.35, height * 0.7, 8); // Slightly larger foliage
            const foliageColor = this.getTreeColor(config.theme);
            const foliageMaterial = new this.THREE.MeshLambertMaterial({ color: foliageColor });
            const foliage = new this.THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = height * 0.6; // Lower position to better hide trunk
            treeGroup.add(foliage);
            
            treeGroup.userData.templateObject = true;
            treeGroup.userData.environmentType = 'tree';
            
            this.scene.add(treeGroup);
            return treeGroup;
        }

        /**
         * Get tree color based on theme
         */
        getTreeColor(theme) {
            const colors = {
                default: 0x1a5555,  // Darker blue-green for trees
                ocean: 0x228b22,    // Bright green for palm fronds
                space: 0x556b2f,    // Dark olive green
                sunset: 0x9acd32    // Yellow green
            };
            return colors[theme] || colors.default;
        }

        // ============================================================================
        // TERRAIN SYSTEMS
        // ============================================================================

        /**
         * Create distant mountains
         * @param {Object} config - Mountain configuration
         */
        createMountains(config = {}) {
            console.log('🏔️ Creating distant mountains...');
            
            const mountainConfig = {
                count: config.count || 12,
                distance: config.distance || 600,  // Moved 2x further from origin (was 300)
                height: config.height || [30, 60],
                theme: config.theme || 'default',
                ...config
            };

            const mountains = [];
            
            for (let i = 0; i < mountainConfig.count; i++) {
                const mountain = this.createSingleMountain(mountainConfig, i);
                if (mountain) {
                    mountains.push(mountain);
                    this.environmentObjects.push(mountain);
                }
            }
            
            console.log(`✅ Created ${mountains.length} distant mountains`);
            return mountains;
        }

        /**
         * Create a single mountain
         */
        createSingleMountain(config, index) {
            const angle = (index / config.count) * Math.PI * 2;
            const distance = config.distance + (Math.random() - 0.5) * 50;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            const height = config.height[0] + Math.random() * (config.height[1] - config.height[0]);
            const width = height * (0.8 + Math.random() * 0.4);
            
            // Create mountain using cone geometry
            const mountainGeometry = new this.THREE.ConeGeometry(width, height, 6);
            const mountainColor = this.getMountainColor(config.theme);
            const mountainMaterial = new this.THREE.MeshLambertMaterial({ color: mountainColor });
            const mountain = new this.THREE.Mesh(mountainGeometry, mountainMaterial);
            
            mountain.position.set(x, height / 2, z);
            mountain.userData.templateObject = true;
            mountain.userData.environmentType = 'mountain';
            
            this.scene.add(mountain);
            return mountain;
        }

        /**
         * Get mountain color based on theme
         */
        getMountainColor(theme) {
            const colors = {
                default: 0x7a6d8f,  // Purplish gray for mountains
                ocean: 0x708090,    // Slate gray
                space: 0x2f4f4f,    // Dark slate gray
                sunset: 0x8b7355    // Burlywood
            };
            return colors[theme] || colors.default;
        }

        // ============================================================================
        // SHIP SYSTEMS (Ocean World)
        // ============================================================================

        /**
         * Create distant ships for ocean world
         * @param {Object} config - Ship configuration
         */
        createShips(config = {}) {
            console.log('🚢 Creating distant ships...');
            
            const shipConfig = {
                count: config.count || 6,
                distance: config.distance || 450,
                theme: config.theme || 'ocean',
                ...config
            };

            const ships = [];
            
            for (let i = 0; i < shipConfig.count; i++) {
                const ship = this.createSingleShip(shipConfig, i);
                if (ship) {
                    ships.push(ship);
                    this.environmentObjects.push(ship);
                }
            }
            
            console.log(`✅ Created ${ships.length} distant ships`);
            return ships;
        }

        /**
         * Create a single ship
         */
        createSingleShip(config, index) {
            const shipGroup = new this.THREE.Group();
            
            const angle = (index / config.count) * Math.PI * 2;
            const distance = config.distance + (Math.random() - 0.5) * 50;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Ship hull
            const hullGeometry = new this.THREE.BoxGeometry(8, 3, 2);
            const hullMaterial = new this.THREE.MeshLambertMaterial({ color: 0x654321 }); // Brown hull
            const hull = new this.THREE.Mesh(hullGeometry, hullMaterial);
            hull.position.y = 1.5;
            shipGroup.add(hull);
            
            // Ship mast
            const mastGeometry = new this.THREE.CylinderGeometry(0.2, 0.2, 6, 8);
            const mastMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8b4513 });
            const mast = new this.THREE.Mesh(mastGeometry, mastMaterial);
            mast.position.y = 6;
            shipGroup.add(mast);
            
            // Simple sail
            const sailGeometry = new this.THREE.PlaneGeometry(3, 4);
            const sailMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0xf5f5dc, // Beige sail
                transparent: true,
                opacity: 0.8,
                side: this.THREE.DoubleSide
            });
            const sail = new this.THREE.Mesh(sailGeometry, sailMaterial);
            sail.position.set(1.5, 5, 0);
            shipGroup.add(sail);
            
            shipGroup.position.set(x, 0, z);
            shipGroup.userData.templateObject = true;
            shipGroup.userData.environmentType = 'ship';
            
            this.scene.add(shipGroup);
            return shipGroup;
        }

        // ============================================================================
        // OCEAN ENVIRONMENT SYSTEM
        // ============================================================================

        /**
         * Create complete ocean environment using specialized modules
         * @param {Object} config - Ocean environment configuration
         */
        createOceanEnvironment(config = {}) {
            console.log('🌊 Creating ocean environment using specialized modules...');
            
            // Check if OceanEnvironmentCoordinator is available
            if (typeof window.OceanEnvironmentCoordinator === 'undefined') {
                console.warn('OceanEnvironmentCoordinator not available, falling back to standard components');
                return null;
            }
            
            try {
                const oceanCoordinator = new window.OceanEnvironmentCoordinator(this.THREE, this.scene);
                const oceanEnvironment = oceanCoordinator.createOceanEnvironment(config);
                
                if (oceanEnvironment) {
                    // Store coordinator for cleanup and animation
                    this.oceanCoordinator = oceanCoordinator;
                    
                    // Add environment objects to our tracking
                    const environmentObjects = oceanCoordinator.getEnvironmentObjects();
                    this.environmentObjects.push(...environmentObjects);
                    
                    console.log('✅ Ocean environment created successfully');
                    return oceanEnvironment;
                }
            } catch (error) {
                console.error('❌ Error creating ocean environment:', error);
            }
            
            return null;
        }

        // ============================================================================
        // ENVIRONMENT PRESETS
        // ============================================================================

        /**
         * Create complete environment preset for a world theme
         * @param {string} preset - Preset name: 'greenPlane', 'ocean', 'space'
         * @param {Object} customConfig - Override default configuration
         */
        createEnvironmentPreset(preset, customConfig = {}) {
            console.log(`🌍 Creating ${preset} environment preset...`);
            
            const presets = {
                greenPlane: {
                    sky: { theme: 'default' },
                    clouds: { count: 24, style: 'fluffy', theme: 'default' },  // 2x more clouds (was 12)
                    trees: { treeCount: 150, radius: 360, randomPlacement: true },  // Reduced by half for better performance (was 300)
                    mountains: { count: 10, distance: 500, theme: 'default' }  // Same distance as REF where they were visible
                },
                ocean: {
                    sky: { theme: 'ocean' },
                    // Use new ocean environment coordinator instead of individual components
                    oceanEnvironment: {
                        islands: { count: 12, minDistance: 300, maxDistance: 600 },
                        palmTrees: { minTreesPerIsland: 2, maxTreesPerIsland: 6 },
                        clouds: { formationCount: 5, layerHeight: 50, horizonSpread: 700 },
                        ships: { count: 6, distance: 450, theme: 'ocean' }
                    }
                },
                space: {
                    sky: { theme: 'space' },
                    clouds: { count: 4, style: 'wispy', theme: 'space', height: 120 }, // Nebula clouds
                    trees: { treeCount: 0 }, // No trees in space
                    mountains: { count: 8, distance: 800, theme: 'space' } // 2x distance (was 400) - Asteroid-like objects
                }
            };

            const config = presets[preset];
            if (!config) {
                console.warn(`Unknown preset: ${preset}`);
                return null;
            }

            // Merge custom configuration
            const finalConfig = {
                sky: { ...config.sky, ...customConfig.sky },
                clouds: { ...config.clouds, ...customConfig.clouds },
                trees: { ...config.trees, ...customConfig.trees },
                mountains: { ...config.mountains, ...customConfig.mountains },
                ships: { ...config.ships, ...customConfig.ships }
            };

            const environment = {
                sky: this.createEnhancedSky(finalConfig.sky),
                clouds: finalConfig.clouds && finalConfig.clouds.count > 0 ? this.createClouds(finalConfig.clouds) : null,
                trees: finalConfig.trees && finalConfig.trees.treeCount > 0 ? this.createForestPerimeter(finalConfig.trees) : null,
                mountains: finalConfig.mountains && finalConfig.mountains.count > 0 ? this.createMountains(finalConfig.mountains) : null,
                ships: finalConfig.ships && finalConfig.ships.count > 0 ? this.createShips(finalConfig.ships) : null,
                oceanEnvironment: finalConfig.oceanEnvironment ? this.createOceanEnvironment(finalConfig.oceanEnvironment) : null
            };

            console.log(`✅ ${preset} environment preset created successfully`);
            return environment;
        }

        // ============================================================================
        // ANIMATION AND CLEANUP
        // ============================================================================

        /**
         * Animate environment objects
         */
        animate(time) {
            // Animate ocean coordinator if it exists
            if (this.oceanCoordinator) {
                this.oceanCoordinator.animate(time);
            }
            
            // Animate other environment objects
            this.environmentObjects.forEach(obj => {
                if (obj.userData.animate) {
                    obj.userData.animate(time);
                }
            });
        }

        /**
         * Cleanup all environment objects
         */
        cleanup() {
            console.log('🧹 Cleaning up environment objects...');
            
            // Clean up ocean coordinator if it exists
            if (this.oceanCoordinator) {
                this.oceanCoordinator.cleanup();
                this.oceanCoordinator = null;
            }
            
            this.environmentObjects.forEach(obj => {
                if (obj.parent) {
                    obj.parent.remove(obj);
                }
                
                // Dispose geometry and materials
                if (obj.geometry) {
                    obj.geometry.dispose();
                }
                
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(mat => mat.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
                
                // Handle groups
                if (obj.children) {
                    obj.children.forEach(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }
            });
            
            this.environmentObjects = [];
            console.log('✅ Environment cleanup complete');
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.SharedEnvironmentSystem = SharedEnvironmentSystem;
    
    console.log("SharedEnvironmentSystem module loaded successfully");
})();
