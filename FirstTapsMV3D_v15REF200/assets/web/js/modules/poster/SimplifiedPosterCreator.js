/**
 * SimplifiedPosterCreator - World Template Helper
 * 
 * Simple helper for world templates to create poster geometry and notify
 * the GlobalPosterManager. World templates no longer need to handle poster
 * interactions, URL management, or persistence - just geometry creation.
 * 
 * Usage in world templates:
 * const posterCreator = new SimplifiedPosterCreator(THREE, scene, objects);
 * posterCreator.createWorldPosters(worldType, posterConfigs);
 */

class SimplifiedPosterCreator {
    constructor(THREE, scene, objects) {
        this.THREE = THREE;
        this.scene = scene;
        this.objects = objects;
    }
    
    /**
     * Create posters for a world and notify GlobalPosterManager
     * @param {string} worldType - The world type (e.g., 'dazzle', 'christmas')
     * @param {Array} posterConfigs - Array of poster configuration objects
     */
    createWorldPosters(worldType, posterConfigs) {
        console.log(`🖼️ Creating ${posterConfigs.length} posters for ${worldType} world...`);
        
        const createdPosters = [];
        
        posterConfigs.forEach((config, index) => {
            const poster = this.createSinglePoster(config, index, worldType);
            if (poster) {
                createdPosters.push(poster);
            }
        });
        
        console.log(`✅ Created ${createdPosters.length} posters for ${worldType}`);
        
        // Notify GlobalPosterManager that posters are ready
        if (window.globalPosterManager) {
            window.globalPosterManager.notifyPostersCreated(worldType, createdPosters);
        } else {
            console.warn('⚠️ GlobalPosterManager not available - posters created but not managed');
        }
        
        return createdPosters;
    }
    
    /**
     * Create a single poster mesh
     * @param {Object} config - Poster configuration
     * @param {number} index - Poster index
     * @param {string} worldType - The world type for naming
     */
    createSinglePoster(config, index, worldType) {
        try {
            // Use 16:9 aspect ratio for all posters (YouTube standard)
            const aspectRatio = 16/9;
            const width = config.width || 80;
            const height = width / aspectRatio;
            
            // Create geometry
            const geometry = new this.THREE.PlaneGeometry(width, height);
            
            // Create material with default texture (will be replaced by GlobalPosterManager if needed)
            const material = new this.THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                transparent: false
            });
            
            // Create default texture with "Press & Hold to Add Website URL"
            const defaultTexture = this.createDefaultTexture();
            material.map = defaultTexture;
            
            // Create mesh
            const poster = new this.THREE.Mesh(geometry, material);
            
            // Set position and rotation
            poster.position.copy(config.position);
            if (config.rotation !== undefined) {
                poster.rotation.y = config.rotation;
            }
            
            // Set userData (required for poster system)
            poster.userData = {
                templateObject: true,
                isPoster: true,
                type: 'poster', // Required for raycaster detection
                interactable: true,
                preservePosition: true,
                posterConfig: config, // Store original config
                posterIndex: index,
                // Generate poster type from config or position
                posterType: config.posterType || this.generatePosterType(config.position, index, worldType),
                // World-specific flags
                isWallMounted: config.isWallMounted !== false, // Default true
                roomElement: true,
                // Mark that this poster has a default texture from SimplifiedPosterCreator
                hasDefaultTexture: true
            };
            
            // Add to scene and objects array
            this.scene.add(poster);
            
            // UNIQUE DEBUG LOG - Track when poster mesh is actually added to scene
            console.log(`🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO POSTER MESH ADDED TO SCENE: ${poster.userData.posterType} 🔥🔥🔥`);
            
            this.objects.push(poster);
            
            // Add to raycaster detection system
            this.addToRaycasterSystem(poster);
            
            console.log(`🖼️ Created poster ${index + 1}: ${poster.userData.posterType} at (${config.position.x}, ${config.position.y}, ${config.position.z})`);
            
            return poster;
            
        } catch (error) {
            console.error(`❌ Error creating poster ${index}:`, error);
            return null;
        }
    }
    
    /**
     * Generate poster type identifier from position
     */
    generatePosterType(position, index, worldType) {
        const x = Math.round(position.x);
        const z = Math.round(position.z);
        const y = Math.round(position.y);
        
        let posterType = `${worldType}_poster_${x}_${z}`;
        if (y !== 50) { // Only add Y if it's not the standard poster height
            posterType += `_${y}`;
        }
        
        return posterType;
    }
    
    /**
     * Add poster to raycaster detection system
     */
    addToRaycasterSystem(poster) {
        // Critical: Add to stateManager.fileObjects for raycaster detection (from backup)
        if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
            window.app.stateManager.fileObjects.push(poster);
            console.log('🎯 Poster added to raycaster detection system');
        } else {
            // Fallback: Try to add to window.stateManager if app not available
            if (window.stateManager && window.stateManager.fileObjects) {
                window.stateManager.fileObjects.push(poster);
                console.log('🎯 Poster added to raycaster detection system (fallback)');
            } else {
                console.warn('⚠️ Could not add poster to raycaster system - stateManager not available');
                
                // Set up delayed retry for poster detection integration
                setTimeout(() => {
                    if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
                        if (!window.app.stateManager.fileObjects.includes(poster)) {
                            window.app.stateManager.fileObjects.push(poster);
                            console.log('🎯 Poster added to raycaster detection system (delayed)');
                        }
                    }
                }, 500);
            }
        }
    }
    
    /**
     * Standard poster configurations for different world types
     * Returns configs with THREE.Vector3 objects for positions
     */
    static getStandardConfigs(worldType, THREE) {
        if (!THREE) {
            console.error('❌ THREE.js not available for standard configs');
            return [];
        }
        
        const configs = {
            'dazzle': [
                {
                    position: new THREE.Vector3(0, 50, -149),
                    rotation: 0,
                    width: 80
                },
                {
                    position: new THREE.Vector3(-40, 50, 149),
                    rotation: Math.PI,
                    width: 80
                },
                {
                    position: new THREE.Vector3(-149, 50, 0),
                    rotation: Math.PI / 2,
                    width: 80
                },
                {
                    position: new THREE.Vector3(149, 50, -50),
                    rotation: -Math.PI / 2,
                    width: 80
                }
            ],
            
            'christmas': [
                {
                    position: new THREE.Vector3(0, 50, -147),
                    rotation: 0,
                    width: 80
                },
                {
                    position: new THREE.Vector3(-40, 50, 147),
                    rotation: Math.PI,
                    width: 80
                },
                {
                    position: new THREE.Vector3(-147, 50, 0),
                    rotation: Math.PI / 2,
                    width: 80
                },
                {
                    position: new THREE.Vector3(147, 50, -50),
                    rotation: -Math.PI / 2,
                    width: 80
                }
            ],
            
            'cave': [
                {
                    position: new THREE.Vector3(0, 40, -100),
                    rotation: 0,
                    posterType: 'cave_art',
                    width: 60
                },
                {
                    position: new THREE.Vector3(-80, 40, 0),
                    rotation: Math.PI / 2,
                    posterType: 'crystals',
                    width: 60
                }
            ],
            
            'forest': [
                {
                    position: new THREE.Vector3(0, 40, -120),
                    rotation: 0,
                    posterType: 'nature',
                    width: 70
                },
                {
                    position: new THREE.Vector3(100, 40, 0),
                    rotation: -Math.PI / 2,
                    posterType: 'wildlife',
                    width: 70
                }
            ],
            
            'green-plane': [
                {
                    position: new THREE.Vector3(0, 20, -100),
                    rotation: 0,
                    posterType: 'nature',
                    width: 60
                },
                {
                    position: new THREE.Vector3(-100, 20, 0),
                    rotation: Math.PI / 2,
                    posterType: 'landscape',
                    width: 60
                }
            ],
            
            'space': [
                {
                    position: new THREE.Vector3(0, 0, -120),
                    rotation: 0,
                    posterType: 'galaxy',
                    width: 100
                },
                {
                    position: new THREE.Vector3(-120, 0, 0),
                    rotation: Math.PI / 2,
                    posterType: 'nebula',
                    width: 100
                }
            ],
            
            'ocean': [
                {
                    position: new THREE.Vector3(0, 30, -100),
                    rotation: 0,
                    posterType: 'marine',
                    width: 80
                },
                {
                    position: new THREE.Vector3(-100, 30, 0),
                    rotation: Math.PI / 2,
                    posterType: 'coral',
                    width: 80
                }
            ]
        };
        
        return configs[worldType] || [];
    }
    
    /**
     * Quick setup method for standard world poster layouts
     */
    static quickSetup(THREE, scene, objects, worldType) {
        const creator = new SimplifiedPosterCreator(THREE, scene, objects);
        const configs = SimplifiedPosterCreator.getStandardConfigs(worldType, THREE);
        
        if (configs.length > 0) {
            console.log(`🚀 Quick setup: Creating ${configs.length} standard posters for ${worldType}`);
            return creator.createWorldPosters(worldType, configs);
        } else {
            console.warn(`⚠️ No standard poster configuration found for world type: ${worldType}`);
            return [];
        }
    }
    
    /**
     * Convert Three.js Vector3 objects to plain objects for configs
     */
    static vec3ToConfig(vector3) {
        return {
            x: vector3.x,
            y: vector3.y,
            z: vector3.z
        };
    }
    
    /**
     * Create default "Press & Hold to Add Website URL" texture
     */
    createDefaultTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 288; // 16:9 aspect ratio
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Border
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Main text
        ctx.fillStyle = '#666666';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🖼️', canvas.width/2, canvas.height/3 - 20);
        
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Press & Hold', canvas.width/2, canvas.height/2);
        
        ctx.font = '20px Arial';
        ctx.fillText('to Add Website URL', canvas.width/2, canvas.height/2 + 40);
        
        const texture = new this.THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    /**
     * Helper to create poster config from existing Three.js objects
     */
    static configFromVector3(position, rotation = 0, posterType = null, width = 80) {
        return {
            position: SimplifiedPosterCreator.vec3ToConfig(position),
            rotation: rotation,
            posterType: posterType,
            width: width
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimplifiedPosterCreator;
} else if (typeof window !== 'undefined') {
    window.SimplifiedPosterCreator = SimplifiedPosterCreator;
}

console.log('🛠️ SimplifiedPosterCreator class loaded successfully');