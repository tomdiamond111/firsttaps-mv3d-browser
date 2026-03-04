// ============================================================================
// ISLAND GENERATOR MODULE
// ============================================================================
// Creates tropical islands for ocean world environments

(function() {
    'use strict';

    console.log("Loading IslandGenerator module...");

    /**
     * IslandGenerator - Creates tropical islands of various sizes
     */
    class IslandGenerator {
        constructor(THREE, scene) {
            this.THREE = THREE;
            this.scene = scene;
            this.islands = [];
        }

        /**
         * Create multiple islands around the ocean area
         * @param {Object} config - Island configuration
         * @param {number} config.count - Number of islands (default: 12)
         * @param {number} config.minDistance - Minimum distance from origin (default: 300)
         * @param {number} config.maxDistance - Maximum distance from origin (default: 600)
         * @param {Array} config.sizes - Island size categories with radius ranges
         */
        createIslands(config = {}) {
            console.log('🏝️ Creating tropical islands...');
            
            const islandConfig = {
                count: config.count || 12,
                minDistance: config.minDistance || 300,
                maxDistance: config.maxDistance || 600,
                sizes: config.sizes || [
                    { type: 'small', minRadius: 15, maxRadius: 25, weight: 0.5 },
                    { type: 'medium', minRadius: 30, maxRadius: 45, weight: 0.3 },
                    { type: 'large', minRadius: 50, maxRadius: 75, weight: 0.2 }
                ],
                ...config
            };

            const islands = [];
            const positions = this.generateIslandPositions(islandConfig);

            positions.forEach((position, index) => {
                const island = this.createSingleIsland(position, islandConfig, index);
                if (island) {
                    islands.push(island);
                    this.islands.push(island);
                }
            });

            console.log(`✅ Created ${islands.length} tropical islands`);
            return islands;
        }

        /**
         * Generate well-distributed island positions
         */
        generateIslandPositions(config) {
            const positions = [];
            const attempts = config.count * 3; // Multiple attempts for good distribution
            const minSeparation = 100; // Minimum distance between islands

            for (let attempt = 0; attempt < attempts && positions.length < config.count; attempt++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = config.minDistance + Math.random() * (config.maxDistance - config.minDistance);
                
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;
                
                // Check if position is far enough from existing islands
                const tooClose = positions.some(pos => {
                    const dx = pos.x - x;
                    const dz = pos.z - z;
                    return Math.sqrt(dx * dx + dz * dz) < minSeparation;
                });

                if (!tooClose) {
                    // Select island size based on weights
                    const sizeType = this.selectIslandSize(config.sizes);
                    positions.push({ x, z, sizeType });
                }
            }

            return positions;
        }

        /**
         * Select island size based on weighted probability
         */
        selectIslandSize(sizes) {
            const totalWeight = sizes.reduce((sum, size) => sum + size.weight, 0);
            let random = Math.random() * totalWeight;
            
            for (const size of sizes) {
                random -= size.weight;
                if (random <= 0) return size;
            }
            
            return sizes[0]; // Fallback
        }

        /**
         * Create a single island
         */
        createSingleIsland(position, config, index) {
            const sizeConfig = position.sizeType;
            const radius = sizeConfig.minRadius + Math.random() * (sizeConfig.maxRadius - sizeConfig.minRadius);
            
            const islandGroup = new this.THREE.Group();
            
            // Create island base (slightly irregular circle)
            const island = this.createIslandBase(radius, sizeConfig.type);
            islandGroup.add(island);
            
            // Add some variation in height for larger islands 0.3 was 0.6
            if (sizeConfig.type !== 'small') {
                const hill = this.createIslandHill(radius * 0.3);
                hill.position.y = 0.5;
                // Slightly offset hill center for more natural look
                hill.position.x = (Math.random() - 0.5) * radius * 0.3;
                hill.position.z = (Math.random() - 0.5) * radius * 0.3;
                islandGroup.add(hill);
            }
            
            // Position island
            islandGroup.position.set(position.x, -2, position.z); // Slightly below water surface
            islandGroup.userData.templateObject = true;
            islandGroup.userData.environmentType = 'island';
            islandGroup.userData.islandData = {
                radius: radius,
                size: sizeConfig.type,
                center: { x: position.x, z: position.z }
            };
            
            this.scene.add(islandGroup);
            return islandGroup;
        }

        /**
         * Create the main island base
         */
        createIslandBase(radius, sizeType) {
            // Create slightly irregular circular island
            const segments = 16;
            const islandGeometry = new this.THREE.CylinderGeometry(
                radius, radius * 1.1, // Slightly wider at bottom
                0.8, // Height - flatter islands for better proportions was 1.2
                segments
            );
            
            // Add some irregularity to the vertices
            const positions = islandGeometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const z = positions.getZ(i);
                const distance = Math.sqrt(x * x + z * z);
                
                if (distance > 0) {
                    // Add random variation to outer edges
                    const variation = 1 + (Math.random() - 0.5) * 0.3;
                    positions.setX(i, x * variation);
                    positions.setZ(i, z * variation);
                }
            }
            positions.needsUpdate = true;
            
            // Sandy/rocky island material
            const islandMaterial = new this.THREE.MeshLambertMaterial({
                color: sizeType === 'large' ? 0x8b7355 : 0xc2b280, // Darker for larger islands
                roughness: 0.8
            });
            
            const island = new this.THREE.Mesh(islandGeometry, islandMaterial);
            return island;
        }

        /**
         * Create a small hill for larger islands
         */
        createIslandHill(radius) {
            // 50% chance for cone vs sphere hills for variety
            if (Math.random() < 0.5) {
                // Cone-shaped hill
                const hillGeometry = new this.THREE.ConeGeometry(
                    radius, 
                    radius * 1.2, // Reasonable height
                    8
                );
                const hillMaterial = new this.THREE.MeshLambertMaterial({
                    color: 0x654321, // Darker brown for hills
                    roughness: 0.9
                });
                return new this.THREE.Mesh(hillGeometry, hillMaterial);
            } else {
                // Original rounded hill
                const hillGeometry = new this.THREE.SphereGeometry(radius, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
                const hillMaterial = new this.THREE.MeshLambertMaterial({
                    color: 0x654321, // Darker brown for hills
                    roughness: 0.9
                });
                return new this.THREE.Mesh(hillGeometry, hillMaterial);
            }
        }

        /**
         * Get island data for tree placement
         */
        getIslandData() {
            return this.islands.map(island => island.userData.islandData);
        }

        /**
         * Clean up all islands
         */
        cleanup() {
            this.islands.forEach(island => {
                if (island.parent) {
                    island.parent.remove(island);
                }
                // Dispose geometries and materials
                island.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            });
            this.islands = [];
        }
    }

    // Export to global scope
    window.IslandGenerator = IslandGenerator;
    console.log("IslandGenerator module loaded and available globally");

})();
