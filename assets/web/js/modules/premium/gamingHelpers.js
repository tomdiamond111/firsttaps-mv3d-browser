/**
 * PREMIUM GAMING HELPERS MODULE
 * Pet helpers that assist with treasure hunting and entity collection
 * - Pet Dog: Loyal companion that hunts treasure boxes and entities
 * - Pet Cat: Agile hunter that chases entities for points
 * Each helper can only tap each entity once, user must tap for remaining points
 */

(function() {
    'use strict';
    
    // console.log('🐕 Loading Premium Gaming Helpers module...');

    // ============================================================================
    // HELPER CONFIGURATIONS
    // ============================================================================
    
    const helperConfigs = {
        pet_dog: {
            name: 'Pet Dog',
            type: 'pet',
            breeds: {
                golden_retriever: {
                    name: 'Golden Retriever',
                    color: 0xDAA520,
                    size: 1.0,
                    speed: 0.8,
                    personality: 'loyal'
                },
                labrador: {
                    name: 'Labrador',
                    color: 0x8B4513,
                    size: 0.9,
                    speed: 0.9,
                    personality: 'energetic'
                },
                husky: {
                    name: 'Husky',
                    color: 0x708090,
                    size: 1.1,
                    speed: 1.0,
                    personality: 'adventurous'
                },
                beagle: {
                    name: 'Beagle',
                    color: 0xD2691E,
                    size: 0.7,
                    speed: 0.7,
                    personality: 'curious'
                },
                corgi: {
                    name: 'Corgi',
                    color: 0xFF8C00,
                    size: 0.6,
                    speed: 0.6,
                    personality: 'playful'
                }
            },
            abilities: {
                huntRange: 8.0,
                huntSpeed: 2.0,
                huntInterval: 3000, // 3 seconds between hunts
                tapDelay: 1000 // 1 second to "tap" after reaching target
            }
        },
        
        pet_cat: {
            name: 'Pet Cat',
            type: 'pet',
            breeds: {
                persian: {
                    name: 'Persian',
                    color: 0xF5F5DC,
                    size: 0.8,
                    speed: 1.2,
                    personality: 'elegant'
                },
                siamese: {
                    name: 'Siamese',
                    color: 0xF5DEB3,
                    size: 0.7,
                    speed: 1.4,
                    personality: 'agile'
                },
                maine_coon: {
                    name: 'Maine Coon',
                    color: 0x8B4513,
                    size: 1.0,
                    speed: 1.0,
                    personality: 'majestic'
                },
                british_shorthair: {
                    name: 'British Shorthair',
                    color: 0x708090,
                    size: 0.9,
                    speed: 0.9,
                    personality: 'calm'
                },
                ragdoll: {
                    name: 'Ragdoll',
                    color: 0xF0F8FF,
                    size: 0.9,
                    speed: 0.8,
                    personality: 'gentle'
                }
            },
            abilities: {
                huntRange: 10.0,
                huntSpeed: 2.5,
                huntInterval: 2500, // 2.5 seconds between hunts
                tapDelay: 800 // 0.8 seconds to "tap" after reaching target
            }
        }
    };

    // ============================================================================
    // GAMING HELPER CLASS
    // ============================================================================
    
    class GamingHelper {
        constructor(type, breed, app) {
            this.type = type;
            this.breed = breed;
            this.app = app;
            this.config = helperConfigs[type];
            this.breedConfig = this.config.breeds[breed];
            
            this.mesh = null;
            this.isActive = false;
            this.currentTarget = null;
            this.huntTimer = null;
            this.position = { x: 0, y: 0.5, z: 0 };
            this.rotation = 0;
            
            // Track tapped entities to ensure one-tap-only rule
            this.tappedEntities = new Set();
            
            // Animation state
            this.animationState = 'idle'; // idle, moving, tapping
            this.moveStartTime = 0;
            this.moveStartPos = null;
            this.moveTargetPos = null;
            this.moveDuration = 0;
            
            // console.log(`🐕 Created ${this.config.name} helper: ${this.breedConfig.name}`);
        }
        
        /**
         * Initialize the helper in the scene
         */
        initialize() {
            this.createMesh();
            this.startHunting();
            this.isActive = true;
            
            // console.log(`🐕 ${this.breedConfig.name} helper initialized and hunting!`);
        }
        
        /**
         * Create the visual representation of the helper
         */
        createMesh() {
            // Create a simple geometric representation for now
            // TODO: Replace with proper 3D models
            
            const size = this.breedConfig.size;
            let geometry, material;
            
            if (this.type === 'pet_dog') {
                // Dog: elongated cube for body + smaller cube for head
                const bodyGeometry = new THREE.BoxGeometry(size * 1.2, size * 0.6, size * 0.8);
                const headGeometry = new THREE.BoxGeometry(size * 0.7, size * 0.7, size * 0.7);
                
                geometry = new THREE.BufferGeometry();
                // Combine geometries (simplified for now)
                geometry = bodyGeometry;
            } else {
                // Cat: more compact and agile looking
                geometry = new THREE.BoxGeometry(size * 0.8, size * 0.5, size * 1.0);
            }
            
            material = new THREE.MeshLambertMaterial({
                color: this.breedConfig.color,
                transparent: true,
                opacity: 0.9
            });
            
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.set(this.position.x, this.position.y, this.position.z);
            this.mesh.userData.isHelper = true;
            this.mesh.userData.helperType = this.type;
            this.mesh.userData.helperBreed = this.breed;
            this.mesh.userData.helperInstance = this;
            
            // Add to scene
            this.app.scene.add(this.mesh);
            
            // console.log(`🐕 Created mesh for ${this.breedConfig.name}`);
        }
        
        /**
         * Start the hunting behavior
         */
        startHunting() {
            if (!this.isActive) return;
            
            this.huntTimer = setInterval(() => {
                this.searchForTargets();
            }, this.config.abilities.huntInterval);
            
            console.log(`🎯 ${this.breedConfig.name} started hunting with ${this.config.abilities.huntInterval}ms interval`);
        }
        
        /**
         * Search for treasure boxes and entities to tap
         */
        searchForTargets() {
            if (!this.isActive || this.currentTarget) return;
            
            const targets = this.findNearbyTargets();
            if (targets.length > 0) {
                // Choose the closest target
                const target = targets[0];
                this.setTarget(target);
            }
        }
        
        /**
         * Find nearby treasure boxes and entities
         */
        findNearbyTargets() {
            const targets = [];
            const huntRange = this.config.abilities.huntRange;
            const helperPos = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
            
            // Search for treasure boxes
            if (this.app.treasureBoxManager && this.app.treasureBoxManager.activeTreasureBoxes) {
                this.app.treasureBoxManager.activeTreasureBoxes.forEach((treasureBox, id) => {
                    // Skip if already tapped by this helper
                    if (this.tappedEntities.has(id)) return;
                    
                    // Skip if treasure is found or escaping
                    if (treasureBox.found || treasureBox.instance?.escaping) return;
                    
                    const distance = helperPos.distanceTo(treasureBox.mesh.position);
                    if (distance <= huntRange) {
                        targets.push({
                            id: id,
                            type: 'treasure',
                            mesh: treasureBox.mesh,
                            position: treasureBox.mesh.position.clone(),
                            distance: distance,
                            entity: treasureBox
                        });
                    }
                });
            }
            
            // Search for other entities (if SVG Entity Manager is available)
            if (this.app.svgEntityManager && this.app.svgEntityManager.activeEntities) {
                this.app.svgEntityManager.activeEntities.forEach((entity, id) => {
                    // Skip if already tapped by this helper
                    if (this.tappedEntities.has(id)) return;
                    
                    // Skip if not clickable or is a treasure (handled above)
                    if (!entity.clickable || entity.type === 'treasure') return;
                    
                    const distance = helperPos.distanceTo(entity.mesh.position);
                    if (distance <= huntRange) {
                        targets.push({
                            id: id,
                            type: entity.type,
                            mesh: entity.mesh,
                            position: entity.mesh.position.clone(),
                            distance: distance,
                            entity: entity
                        });
                    }
                });
            }
            
            // Sort by distance (closest first)
            targets.sort((a, b) => a.distance - b.distance);
            
            return targets;
        }
        
        /**
         * Set a target to hunt
         */
        setTarget(target) {
            this.currentTarget = target;
            
            console.log(`🎯 ${this.breedConfig.name} targeting ${target.type}: ${target.id} at distance ${target.distance.toFixed(2)}`);
            
            // Start moving to target
            this.moveToTarget(target.position);
        }
        
        /**
         * Move to a target position
         */
        moveToTarget(targetPosition) {
            const startPos = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
            const endPos = targetPosition.clone();
            endPos.y = this.position.y; // Keep helper at ground level
            
            const distance = startPos.distanceTo(endPos);
            const speed = this.config.abilities.huntSpeed;
            const duration = (distance / speed) * 1000; // Convert to milliseconds
            
            this.animationState = 'moving';
            this.moveStartTime = Date.now();
            this.moveStartPos = startPos;
            this.moveTargetPos = endPos;
            this.moveDuration = duration;
            
            // Calculate rotation to face target
            const direction = endPos.clone().sub(startPos).normalize();
            this.rotation = Math.atan2(direction.x, direction.z);
            
            console.log(`🏃 ${this.breedConfig.name} moving to target (${duration.toFixed(0)}ms)`);
        }
        
        /**
         * Update helper animation and movement
         */
        update() {
            if (!this.isActive || !this.mesh) return;
            
            const currentTime = Date.now();
            
            // Handle movement animation
            if (this.animationState === 'moving' && this.moveStartPos && this.moveTargetPos) {
                const elapsed = currentTime - this.moveStartTime;
                const progress = Math.min(elapsed / this.moveDuration, 1.0);
                
                // Interpolate position
                const currentPos = this.moveStartPos.clone().lerp(this.moveTargetPos, progress);
                this.position.x = currentPos.x;
                this.position.y = currentPos.y;
                this.position.z = currentPos.z;
                
                // Update mesh position and rotation
                this.mesh.position.copy(currentPos);
                this.mesh.rotation.y = this.rotation;
                
                // Add bouncing animation while moving
                const bounceHeight = 0.2 * Math.sin(elapsed * 0.01);
                this.mesh.position.y += bounceHeight;
                
                // Check if reached target
                if (progress >= 1.0) {
                    this.animationState = 'tapping';
                    this.reachedTarget();
                }
            }
            
            // Idle animation when not moving
            if (this.animationState === 'idle') {
                const idleBob = 0.1 * Math.sin(currentTime * 0.003);
                this.mesh.position.y = this.position.y + idleBob;
            }
        }
        
        /**
         * Called when helper reaches the target
         */
        reachedTarget() {
            if (!this.currentTarget) return;
            
            console.log(`🎯 ${this.breedConfig.name} reached target: ${this.currentTarget.id}`);
            
            // Wait a moment before "tapping"
            setTimeout(() => {
                this.tapTarget();
            }, this.config.abilities.tapDelay);
        }
        
        /**
         * Tap the target entity
         */
        tapTarget() {
            if (!this.currentTarget) return;
            
            const target = this.currentTarget;
            
            // Mark as tapped by this helper
            this.tappedEntities.add(target.id);
            
            // Show visual feedback
            this.showTapFeedback();
            
            // Trigger the entity's click behavior
            if (target.type === 'treasure' && target.entity.instance) {
                // Tap treasure box
                target.entity.instance.animateClick();
                console.log(`💎 ${this.breedConfig.name} tapped treasure box: ${target.id}`);
            } else if (target.entity.entityInstance && target.entity.entityInstance.animateClick) {
                // Tap other entity
                target.entity.entityInstance.animateClick();
                console.log(`🎯 ${this.breedConfig.name} tapped entity: ${target.id}`);
            }
            
            // Clear target and return to idle
            this.currentTarget = null;
            this.animationState = 'idle';
            
            // Brief pause before hunting again
            setTimeout(() => {
                if (this.isActive) {
                    this.searchForTargets();
                }
            }, 1000);
        }
        
        /**
         * Show visual feedback when tapping
         */
        showTapFeedback() {
            // Temporary scale animation
            const originalScale = this.mesh.scale.clone();
            
            // Scale up briefly
            this.mesh.scale.multiplyScalar(1.3);
            
            setTimeout(() => {
                if (this.mesh) {
                    this.mesh.scale.copy(originalScale);
                }
            }, 200);
            
            // TODO: Add particle effect or other visual feedback
        }
        
        /**
         * Deactivate the helper
         */
        deactivate() {
            this.isActive = false;
            
            if (this.huntTimer) {
                clearInterval(this.huntTimer);
                this.huntTimer = null;
            }
            
            this.currentTarget = null;
            this.animationState = 'idle';
            
            // console.log(`🐕 ${this.breedConfig.name} helper deactivated`);
        }
        
        /**
         * Remove the helper from the scene
         */
        cleanup() {
            this.deactivate();
            
            if (this.mesh && this.app.scene) {
                this.app.scene.remove(this.mesh);
                
                // Dispose of geometry and materials
                if (this.mesh.geometry) this.mesh.geometry.dispose();
                if (this.mesh.material) this.mesh.material.dispose();
            }
            
            // console.log(`🐕 ${this.breedConfig.name} helper cleaned up`);
        }
        
        /**
         * Get helper status for UI
         */
        getStatus() {
            return {
                type: this.type,
                breed: this.breed,
                name: this.breedConfig.name,
                isActive: this.isActive,
                tappedCount: this.tappedEntities.size,
                currentTarget: this.currentTarget ? this.currentTarget.id : null,
                state: this.animationState
            };
        }
    }

    // ============================================================================
    // GAMING HELPER MANAGER
    // ============================================================================
    
    class GamingHelperManager {
        constructor(app) {
            this.app = app;
            this.activeHelpers = new Map();
            this.helperConfigs = helperConfigs;
            
            // console.log('🐕 Gaming Helper Manager initialized');
        }
        
        /**
         * Spawn a gaming helper
         */
        spawnHelper(type, breed) {
            if (!this.helperConfigs[type]) {
                console.warn(`🐕 Unknown helper type: ${type}`);
                return null;
            }
            
            if (!this.helperConfigs[type].breeds[breed]) {
                console.warn(`🐕 Unknown breed for ${type}: ${breed}`);
                return null;
            }
            
            // Remove existing helper of same type
            this.removeHelper(type);
            
            // Create new helper
            const helper = new GamingHelper(type, breed, this.app);
            helper.initialize();
            
            this.activeHelpers.set(type, helper);
            
            // console.log(`🐕 Spawned ${helper.breedConfig.name} (${type})`);
            return helper;
        }
        
        /**
         * Remove a gaming helper
         */
        removeHelper(type) {
            const helper = this.activeHelpers.get(type);
            if (helper) {
                helper.cleanup();
                this.activeHelpers.delete(type);
                // console.log(`🐕 Removed helper: ${type}`);
            }
        }
        
        /**
         * Update all active helpers
         */
        update() {
            this.activeHelpers.forEach(helper => {
                helper.update();
            });
        }
        
        /**
         * Get all active helpers
         */
        getActiveHelpers() {
            return Array.from(this.activeHelpers.values());
        }
        
        /**
         * Get helper status for UI
         */
        getHelperStatus() {
            const status = {};
            this.activeHelpers.forEach((helper, type) => {
                status[type] = helper.getStatus();
            });
            return status;
        }
        
        /**
         * Clear tapped entities for all helpers (when starting new game session)
         */
        clearTappedEntities() {
            this.activeHelpers.forEach(helper => {
                helper.tappedEntities.clear();
            });
            // console.log('🐕 Cleared tapped entities for all helpers');
        }
        
        /**
         * Cleanup all helpers
         */
        cleanup() {
            this.activeHelpers.forEach(helper => {
                helper.cleanup();
            });
            this.activeHelpers.clear();
            // console.log('🐕 All gaming helpers cleaned up');
        }
    }

    // ============================================================================
    // GLOBAL INTEGRATION
    // ============================================================================
    
    // Make classes available globally
    window.GamingHelper = GamingHelper;
    window.GamingHelperManager = GamingHelperManager;
    
    // Initialize manager if app is available
    if (window.app) {
        window.app.gamingHelperManager = new GamingHelperManager(window.app);
        // console.log('🐕 Gaming Helper Manager attached to app');
        
        // Add update loop integration
        if (window.app.registerUpdateCallback) {
            window.app.registerUpdateCallback(() => {
                window.app.gamingHelperManager.update();
            });
        }
    } else {
        // Wait for app to be available
        document.addEventListener('DOMContentLoaded', () => {
            const waitForApp = () => {
                if (window.app) {
                    window.app.gamingHelperManager = new GamingHelperManager(window.app);
                    // console.log('🐕 Gaming Helper Manager attached to app (deferred)');
                    
                    // Add update loop integration
                    if (window.app.registerUpdateCallback) {
                        window.app.registerUpdateCallback(() => {
                            window.app.gamingHelperManager.update();
                        });
                    }
                } else {
                    setTimeout(waitForApp, 100);
                }
            };
            waitForApp();
        });
    }
    
    // console.log('🐕 Premium Gaming Helpers module loaded successfully!');
})();
