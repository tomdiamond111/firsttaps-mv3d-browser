// ============================================================================
// OCEAN ENVIRONMENT COORDINATOR MODULE
// ============================================================================
// Coordinates the creation of complete ocean environments with islands, palm trees, and clouds

(function() {
    'use strict';

    console.log("Loading OceanEnvironmentCoordinator module...");

    /**
     * OceanEnvironmentCoordinator - Creates and manages complete ocean environments
     */
    class OceanEnvironmentCoordinator {
        constructor(THREE, scene) {
            this.THREE = THREE;
            this.scene = scene;
            this.islandGenerator = null;
            this.palmTreeGenerator = null;
            this.cloudGenerator = null;
            this.environmentObjects = [];
        }

        /**
         * Create complete ocean environment
         * @param {Object} config - Environment configuration
         */
        createOceanEnvironment(config = {}) {
            console.log('🌊 Creating complete ocean environment...');
            
            const environmentConfig = {
                islands: {
                    count: 12,
                    minDistance: 300,
                    maxDistance: 600,
                    ...config.islands
                },
                palmTrees: {
                    minTreesPerIsland: 2,
                    maxTreesPerIsland: 6,
                    trunkHeight: 8,
                    trunkCurve: 0.3,
                    frondCount: 4,
                    ...config.palmTrees
                },
                clouds: {
                    formationCount: 5,
                    layerHeight: 50,
                    horizonSpread: 700,
                    layerThickness: 20,
                    cloudsPerFormation: 8,
                    ...config.clouds
                },
                ships: config.ships || null,
                ...config
            };

            // Create all environment components
            const environment = this.createEnvironmentComponents(environmentConfig);
            
            console.log('✅ Ocean environment creation complete');
            return environment;
        }

        /**
         * Create all environment components in proper order
         */
        createEnvironmentComponents(config) {
            const environment = {};

            try {
                // 1. Create islands first (foundation for everything else)
                environment.islands = this.createIslands(config.islands);
                
                // 2. Create palm trees on islands
                environment.palmTrees = this.createPalmTrees(config.palmTrees);
                
                // 3. Create ocean clouds
                environment.clouds = this.createOceanClouds(config.clouds);
                
                // 4. Create ships if specified
                if (config.ships) {
                    environment.ships = this.createShips(config.ships);
                }

                console.log('🌊 Ocean environment components created successfully');
                
            } catch (error) {
                console.error('❌ Error creating ocean environment:', error);
                this.cleanup();
                return null;
            }

            return environment;
        }

        /**
         * Create islands using IslandGenerator
         */
        createIslands(config) {
            if (typeof window.IslandGenerator === 'undefined') {
                console.warn('IslandGenerator not available');
                return null;
            }

            this.islandGenerator = new window.IslandGenerator(this.THREE, this.scene);
            const islands = this.islandGenerator.createIslands(config);
            
            if (islands && islands.length > 0) {
                this.environmentObjects.push(...islands);
                console.log(`🏝️ Created ${islands.length} islands`);
            }
            
            return islands;
        }

        /**
         * Create palm trees using PalmTreeGenerator
         */
        createPalmTrees(config) {
            if (typeof window.PalmTreeGenerator === 'undefined' || !this.islandGenerator) {
                console.warn('PalmTreeGenerator not available or no islands to place trees on');
                return null;
            }

            this.palmTreeGenerator = new window.PalmTreeGenerator(this.THREE, this.scene);
            const islandData = this.islandGenerator.getIslandData();
            const palmTrees = this.palmTreeGenerator.createPalmTreesOnIslands(islandData, config);
            
            if (palmTrees && palmTrees.length > 0) {
                this.environmentObjects.push(...palmTrees);
                console.log(`🌴 Created ${palmTrees.length} palm trees`);
            }
            
            return palmTrees;
        }

        /**
         * Create ocean clouds using OceanCloudGenerator
         */
        createOceanClouds(config) {
            if (typeof window.OceanCloudGenerator === 'undefined') {
                console.warn('OceanCloudGenerator not available');
                return null;
            }

            this.cloudGenerator = new window.OceanCloudGenerator(this.THREE, this.scene);
            const clouds = this.cloudGenerator.createOceanClouds(config);
            
            if (clouds && clouds.length > 0) {
                this.environmentObjects.push(...clouds);
                console.log(`☁️ Created ${clouds.length} cloud formations`);
            }
            
            return clouds;
        }

        /**
         * Create ships (fallback to existing ship system)
         */
        createShips(config) {
            // This will use the existing ship creation from SharedEnvironmentSystem
            console.log('🚢 Ships will be created by SharedEnvironmentSystem');
            return null;
        }

        /**
         * Animate environment components
         */
        animate(time) {
            if (this.cloudGenerator) {
                this.cloudGenerator.animateClouds(time);
            }
            
            // Add gentle palm tree swaying
            if (this.palmTreeGenerator && this.palmTreeGenerator.palmTrees) {
                this.palmTreeGenerator.palmTrees.forEach((tree, index) => {
                    const sway = Math.sin(time * 0.001 + index) * 0.02;
                    tree.rotation.z = sway;
                });
            }
        }

        /**
         * Get all environment objects for external management
         */
        getEnvironmentObjects() {
            return this.environmentObjects;
        }

        /**
         * Clean up all environment components
         */
        cleanup() {
            console.log('🧹 Cleaning up ocean environment...');
            
            if (this.islandGenerator) {
                this.islandGenerator.cleanup();
                this.islandGenerator = null;
            }
            
            if (this.palmTreeGenerator) {
                this.palmTreeGenerator.cleanup();
                this.palmTreeGenerator = null;
            }
            
            if (this.cloudGenerator) {
                this.cloudGenerator.cleanup();
                this.cloudGenerator = null;
            }
            
            this.environmentObjects = [];
            console.log('✅ Ocean environment cleanup complete');
        }
    }

    // Export to global scope
    window.OceanEnvironmentCoordinator = OceanEnvironmentCoordinator;
    console.log("OceanEnvironmentCoordinator module loaded and available globally");

})();
