// ============================================================================
// PALM TREE GENERATOR MODULE
// ============================================================================
// Creates tropical palm trees for ocean world environments

(function() {
    'use strict';

    console.log("Loading PalmTreeGenerator module...");

    /**
     * PalmTreeGenerator - Creates realistic palm trees with curved trunks and fronds
     */
    class PalmTreeGenerator {
        constructor(THREE, scene) {
            this.THREE = THREE;
            this.scene = scene;
            this.palmTrees = [];
        }

        /**
         * Create palm trees on islands
         * @param {Array} islandData - Array of island data objects with position and size info
         * @param {Object} config - Palm tree configuration
         */
        createPalmTreesOnIslands(islandData, config = {}) {
            console.log('🌴 Creating palm trees on islands...');
            
            const treeConfig = {
                minTreesPerIsland: config.minTreesPerIsland || 3, // Moderate increase
                maxTreesPerIsland: config.maxTreesPerIsland || 12, // Moderate increase
                trunkHeight: config.trunkHeight || 12, // Increased from 8 to 12
                trunkCurve: config.trunkCurve || 0.3,
                frondCount: config.frondCount || 4,
                ...config
            };

            let totalTrees = 0;

            islandData.forEach(island => {
                const treeCount = this.calculateTreeCount(island, treeConfig);
                const trees = this.createTreesOnIsland(island, treeCount, treeConfig);
                totalTrees += trees.length;
                this.palmTrees.push(...trees);
            });

            console.log(`✅ Created ${totalTrees} palm trees on ${islandData.length} islands`);
            return this.palmTrees;
        }

        /**
         * Calculate number of trees for an island based on its size
         */
        calculateTreeCount(island, config) {
            let baseCount;
            switch (island.size) {
                case 'small':
                    baseCount = 3 + Math.floor(Math.random() * 2); // 3-4 trees (was 2-3)
                    break;
                case 'medium':
                    baseCount = 4 + Math.floor(Math.random() * 3); // 4-6 trees (was 3-4)
                    break;
                case 'large':
                    baseCount = 6 + Math.floor(Math.random() * 3); // 6-8 trees (was 4-6)
                    break;
                default:
                    baseCount = 3; // Moderate increase
            }
            
            return Math.min(Math.max(baseCount, config.minTreesPerIsland), config.maxTreesPerIsland);
        }

        /**
         * Create trees on a specific island
         */
        createTreesOnIsland(island, treeCount, config) {
            const trees = [];
            const placementRadius = island.radius * 0.7; // Trees within 70% of island radius
            
            for (let i = 0; i < treeCount; i++) {
                const position = this.generateTreePosition(island, placementRadius, trees);
                if (position) {
                    const tree = this.createSinglePalmTree(position, config);
                    if (tree) {
                        trees.push(tree);
                    }
                }
            }
            
            return trees;
        }

        /**
         * Generate a valid position for a tree on an island
         */
        generateTreePosition(island, placementRadius, existingTrees) {
            const maxAttempts = 20;
            const minTreeSeparation = 8; // Minimum distance between trees
            
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * placementRadius;
                
                const localX = Math.cos(angle) * distance;
                const localZ = Math.sin(angle) * distance;
                
                const worldX = island.center.x + localX;
                const worldZ = island.center.z + localZ;
                
                // Check distance from existing trees
                const tooClose = existingTrees.some(tree => {
                    const dx = tree.position.x - worldX;
                    const dz = tree.position.z - worldZ;
                    return Math.sqrt(dx * dx + dz * dz) < minTreeSeparation;
                });
                
                if (!tooClose) {
                    return { x: worldX, z: worldZ };
                }
            }
            
            return null; // Couldn't find valid position
        }

        /**
         * Create a single palm tree
         */
        createSinglePalmTree(position, config) {
            const treeGroup = new this.THREE.Group();
            
            // Create curved trunk
            const trunk = this.createCurvedTrunk(config);
            treeGroup.add(trunk);
            
            // Create fronds
            const fronds = this.createPalmFronds(config);
            fronds.position.y = config.trunkHeight;
            treeGroup.add(fronds);
            
            // Position tree
            treeGroup.position.set(position.x, 1, position.z); // Slightly above island surface
            treeGroup.userData.templateObject = true;
            treeGroup.userData.environmentType = 'palmTree';
            
            // Add slight random rotation
            treeGroup.rotation.y = Math.random() * Math.PI * 2;
            
            this.scene.add(treeGroup);
            return treeGroup;
        }

        /**
         * Create a curved palm tree trunk
         */
        createCurvedTrunk(config) {
            const trunkGroup = new this.THREE.Group();
            const segments = 8;
            const segmentHeight = config.trunkHeight / segments;
            
            for (let i = 0; i < segments; i++) {
                const segmentGeometry = new this.THREE.CylinderGeometry(
                    0.6 - (i * 0.03), // Moderate increase in trunk radius
                    0.7 - (i * 0.03), // Gradually thinner towards top
                    segmentHeight,
                    8
                );
                
                const trunkMaterial = new this.THREE.MeshLambertMaterial({
                    color: 0x8b4513, // Brown trunk
                    roughness: 0.9
                });
                
                const segment = new this.THREE.Mesh(segmentGeometry, trunkMaterial);
                
                // Create curve by offsetting each segment
                const curveAmount = config.trunkCurve * (i / segments) * (i / segments); // Quadratic curve
                segment.position.x = curveAmount * Math.sin(i * 0.5);
                segment.position.y = i * segmentHeight + segmentHeight / 2;
                segment.position.z = curveAmount * Math.cos(i * 0.3);
                
                // Slight rotation for more natural look
                segment.rotation.x = curveAmount * 0.1;
                segment.rotation.z = curveAmount * 0.15;
                
                trunkGroup.add(segment);
            }
            
            return trunkGroup;
        }

        /**
         * Create palm fronds (leaves)
         */
        createPalmFronds(config) {
            const frondsGroup = new this.THREE.Group();
            const frondCount = config.frondCount + Math.floor(Math.random() * 2); // Some variation
            
            for (let i = 0; i < frondCount; i++) {
                const frond = this.createSingleFrond(config, i, frondCount);
                frondsGroup.add(frond);
            }
            
            return frondsGroup;
        }

        /**
         * Create a single palm frond
         */
        createSingleFrond(config, index, totalFronds) {
            const frondGroup = new this.THREE.Group();
            
            // Create frond blade - 1.5x larger for better proportions
            const frondGeometry = new this.THREE.PlaneGeometry(9, 2.25, 8, 2);
            
            // Create wavy frond shape
            const positions = frondGeometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                
                // Add curve and droop to frond
                const curveAmount = Math.sin((x + 3) / 6 * Math.PI) * 0.3;
                positions.setZ(i, curveAmount);
                
                // Taper frond towards tip
                const taper = 1 - Math.abs(x / 3) * 0.3;
                positions.setY(i, y * taper);
            }
            positions.needsUpdate = true;
            
            const frondMaterial = new this.THREE.MeshLambertMaterial({
                color: 0x228b22, // Dark green
                side: this.THREE.DoubleSide,
                transparent: true,
                opacity: 0.9
            });
            
            const frond = new this.THREE.Mesh(frondGeometry, frondMaterial);
            
            // Position frond
            const angle = (index / totalFronds) * Math.PI * 2;
            frond.position.x = Math.cos(angle) * 0.5;
            frond.position.z = Math.sin(angle) * 0.5;
            
            // Rotate frond to point outward and droop
            frond.rotation.y = angle;
            frond.rotation.x = -0.3 - Math.random() * 0.4; // Droop down
            frond.rotation.z = (Math.random() - 0.5) * 0.4; // Some random twist
            
            frondGroup.add(frond);
            return frondGroup;
        }

        /**
         * Clean up all palm trees
         */
        cleanup() {
            this.palmTrees.forEach(tree => {
                if (tree.parent) {
                    tree.parent.remove(tree);
                }
                // Dispose geometries and materials
                tree.traverse(child => {
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
            this.palmTrees = [];
        }
    }

    // Export to global scope
    window.PalmTreeGenerator = PalmTreeGenerator;
    console.log("PalmTreeGenerator module loaded and available globally");

})();
