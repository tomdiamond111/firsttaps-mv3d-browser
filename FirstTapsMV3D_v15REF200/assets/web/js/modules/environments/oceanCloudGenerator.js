// ============================================================================
// OCEAN CLOUD GENERATOR MODULE
// ============================================================================
// Creates stratocumulus and stratus cloud formations for ocean environments

(function() {
    'use strict';

    console.log("Loading OceanCloudGenerator module...");

    /**
     * OceanCloudGenerator - Creates realistic ocean cloud formations
     */
    class OceanCloudGenerator {
        constructor(THREE, scene) {
            this.THREE = THREE;
            this.scene = scene;
            this.cloudFormations = [];
        }

        /**
         * Create ocean cloud system with stratocumulus formations
         * @param {Object} config - Cloud configuration
         */
        createOceanClouds(config = {}) {
            console.log('☁️ Creating ocean cloud formations...');
            
            const cloudConfig = {
                formationCount: config.formationCount || 4, // Number of cloud formations
                layerHeight: config.layerHeight || 60,
                horizonSpread: config.horizonSpread || 800,
                layerThickness: config.layerThickness || 15,
                cloudsPerFormation: config.cloudsPerFormation || 6,
                ...config
            };

            const formations = [];

            // Create multiple cloud formations at different heights and positions
            for (let i = 0; i < cloudConfig.formationCount; i++) {
                const formation = this.createCloudFormation(cloudConfig, i);
                if (formation) {
                    formations.push(formation);
                    this.cloudFormations.push(formation);
                }
            }

            console.log(`✅ Created ${formations.length} cloud formations with stratocumulus appearance`);
            return formations;
        }

        /**
         * Create a single cloud formation
         */
        createCloudFormation(config, formationIndex) {
            const formationGroup = new this.THREE.Group();
            
            // Position formation around the horizon
            const angle = (formationIndex / config.formationCount) * Math.PI * 2;
            const distance = config.horizonSpread * (0.7 + Math.random() * 0.3);
            
            const formationX = Math.cos(angle) * distance;
            const formationZ = Math.sin(angle) * distance;
            const formationY = config.layerHeight + (Math.random() - 0.5) * config.layerThickness;
            
            // Create cloud layer within this formation
            const clouds = this.createStratocumulusLayer(config);
            clouds.forEach(cloud => formationGroup.add(cloud));
            
            formationGroup.position.set(formationX, formationY, formationZ);
            formationGroup.userData.templateObject = true;
            formationGroup.userData.environmentType = 'oceanClouds';
            
            this.scene.add(formationGroup);
            return formationGroup;
        }

        /**
         * Create a stratocumulus layer (broad, flat clouds)
         */
        createStratocumulusLayer(config) {
            const clouds = [];
            const layerWidth = 200; // Width of cloud layer
            const layerDepth = 150; // Depth of cloud layer
            
            for (let i = 0; i < config.cloudsPerFormation; i++) {
                const cloud = this.createStratocumulusCloud(config);
                
                // Position clouds in a broad layer formation
                const x = (Math.random() - 0.5) * layerWidth;
                const z = (Math.random() - 0.5) * layerDepth;
                const y = (Math.random() - 0.5) * config.layerThickness * 0.5;
                
                cloud.position.set(x, y, z);
                clouds.push(cloud);
            }
            
            return clouds;
        }

        /**
         * Create a single stratocumulus cloud (broad and flat)
         */
        createStratocumulusCloud(config) {
            const cloudGroup = new this.THREE.Group();
            
            // Create base cloud shape - broad and flat
            const baseWidth = 40 + Math.random() * 30; // 40-70 units wide
            const baseHeight = 8 + Math.random() * 6;  // 8-14 units tall
            const baseDepth = 25 + Math.random() * 20;  // 25-45 units deep
            
            // Main cloud body - use ellipsoid instead of box for more natural shape
            const mainCloudGeometry = new this.THREE.SphereGeometry(1, 16, 12);
            mainCloudGeometry.scale(baseWidth * 0.5, baseHeight * 0.5, baseDepth * 0.5);
            const mainCloudMaterial = this.createCloudMaterial(0.6);
            const mainCloud = new this.THREE.Mesh(mainCloudGeometry, mainCloudMaterial);
            cloudGroup.add(mainCloud);
            
            // Add secondary cloud masses for layered effect
            const secondaryCount = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < secondaryCount; i++) {
                const secondary = this.createSecondaryCloudMass(baseWidth, baseHeight, baseDepth);
                cloudGroup.add(secondary);
            }
            
            // Add wispy edges for more realistic appearance
            const wispyCount = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < wispyCount; i++) {
                const wispy = this.createWispyCloudEdge(baseWidth, baseHeight);
                cloudGroup.add(wispy);
            }
            
            return cloudGroup;
        }

        /**
         * Create secondary cloud mass for layered effect
         */
        createSecondaryCloudMass(baseWidth, baseHeight, baseDepth) {
            const width = baseWidth * (0.4 + Math.random() * 0.4);
            const height = baseHeight * (0.6 + Math.random() * 0.4);
            const depth = baseDepth * (0.5 + Math.random() * 0.4);
            
            const geometry = new this.THREE.SphereGeometry(1, 12, 8);
            geometry.scale(width * 0.5, height * 0.5, depth * 0.5);
            const material = this.createCloudMaterial(0.4 + Math.random() * 0.3);
            const cloud = new this.THREE.Mesh(geometry, material);
            
            // Position relative to main cloud
            cloud.position.x = (Math.random() - 0.5) * baseWidth * 0.6;
            cloud.position.y = (Math.random() - 0.5) * baseHeight * 0.4;
            cloud.position.z = (Math.random() - 0.5) * baseDepth * 0.6;
            
            return cloud;
        }

        /**
         * Create wispy cloud edges
         */
        createWispyCloudEdge(baseWidth, baseHeight) {
            const width = 15 + Math.random() * 15;
            const height = baseHeight * 0.3;
            const depth = 8 + Math.random() * 8;
            
            const geometry = new this.THREE.SphereGeometry(1, 8, 6);
            geometry.scale(width * 0.5, height * 0.5, depth * 0.5);
            const material = this.createCloudMaterial(0.2 + Math.random() * 0.2);
            const wisp = new this.THREE.Mesh(geometry, material);
            
            // Position at edges of main cloud
            const edge = Math.random() < 0.5 ? 1 : -1;
            wisp.position.x = edge * (baseWidth * 0.4 + width * 0.3);
            wisp.position.y = (Math.random() - 0.5) * baseHeight * 0.5;
            wisp.position.z = (Math.random() - 0.5) * 20;
            
            return wisp;
        }

        /**
         * Create cloud material with ocean-appropriate coloring
         */
        createCloudMaterial(opacity) {
            return new this.THREE.MeshLambertMaterial({
                color: 0xf5f5f5, // Slightly off-white for more realistic clouds
                transparent: true,
                opacity: opacity,
                fog: true // Affected by scene fog for distance effect
            });
        }

        /**
         * Animate clouds with gentle movement
         */
        animateClouds(time) {
            this.cloudFormations.forEach((formation, index) => {
                // Gentle horizontal drift
                const driftSpeed = 0.00005;
                const driftX = Math.sin(time * driftSpeed + index) * 0.1;
                const driftZ = Math.cos(time * driftSpeed + index * 0.7) * 0.1;
                
                formation.position.x += driftX;
                formation.position.z += driftZ;
                
                // Subtle vertical bobbing
                const bobAmount = Math.sin(time * 0.0001 + index * 2) * 2;
                formation.position.y += bobAmount * 0.01;
            });
        }

        /**
         * Clean up all cloud formations
         */
        cleanup() {
            this.cloudFormations.forEach(formation => {
                if (formation.parent) {
                    formation.parent.remove(formation);
                }
                // Dispose geometries and materials
                formation.traverse(child => {
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
            this.cloudFormations = [];
        }
    }

    // Export to global scope
    window.OceanCloudGenerator = OceanCloudGenerator;
    console.log("OceanCloudGenerator module loaded and available globally");

})();
