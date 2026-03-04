/**
 * LinkNameInitializer - Automatically applies saved custom names to link objects when they are created
 * This ensures persistence works correctly by hooking into the object creation process
 */

class LinkNameInitializer {
    constructor() {
        this.initialized = false;
        this.pendingObjects = [];
        console.log('📗 LinkNameInitializer created');
    }

    /**
     * Initialize the system by hooking into object creation
     */
    initialize() {
        if (this.initialized) {
            console.log('📗 LinkNameInitializer already initialized');
            return;
        }

        console.log('📗 LinkNameInitializer: Setting up hooks...');
        
        // Hook into the scene to monitor for new link objects
        this.startObjectMonitoring();
        
        // Hook into the file creation process
        this.hookFileCreation();
        
        this.initialized = true;
        console.log('✅ LinkNameInitializer: Initialization complete');
    }

    /**
     * Start monitoring the scene for new link objects
     */
    startObjectMonitoring() {
        // Trigger immediate restoration when LinkNameInitializer starts
        setTimeout(() => {
            this.triggerImmediateRestoration();
        }, 100); // Reduced delay to 100ms for faster restoration
        
        // Monitor scene changes every 5 seconds for any new objects
        setInterval(() => {
            this.checkForNewLinkObjects();
        }, 5000);
        
        console.log('📗 LinkNameInitializer: Scene monitoring started');
    }

    /**
     * Trigger immediate restoration using LinkNameManager
     */
    async triggerImmediateRestoration() {
        try {
            console.log('🚀 LinkNameInitializer: Triggering immediate restoration...');
            
            if (window.LinkNameManager) {
                const linkNameManager = new window.LinkNameManager();
                await linkNameManager.restoreAllSavedLinkNames();
                console.log('✅ LinkNameInitializer: Immediate restoration completed via LinkNameManager');
            } else {
                console.warn('⚠️ LinkNameInitializer: LinkNameManager not available, falling back to legacy method');
                this.legacyRestoration();
            }
        } catch (error) {
            console.error('❌ LinkNameInitializer: Error during immediate restoration:', error);
        }
    }

    /**
     * Legacy restoration method (fallback)
     */
    async legacyRestoration() {
        try {
            if (window.linkNameLoad) {
                const savedNames = await window.linkNameLoad();
                console.log('📋 LinkNameInitializer: Loaded saved names for legacy restoration:', savedNames);
                
                // Apply saved names using basic approach
                for (const [linkId, customName] of Object.entries(savedNames || {})) {
                    this.applyCustomNameToObject(linkId, customName);
                }
            }
        } catch (error) {
            console.error('❌ LinkNameInitializer: Error in legacy restoration:', error);
        }
    }

    /**
     * Hook into the file creation process
     */
    hookFileCreation() {
        try {
            // Wait for the main application to be available
            const checkApp = () => {
                if (window.app && window.app.fileObjectManager) {
                    this.enhanceFileObjectManager();
                } else {
                    setTimeout(checkApp, 1000);
                }
            };
            checkApp();
        } catch (error) {
            console.error('❌ LinkNameInitializer: Error hooking file creation:', error);
        }
    }

    /**
     * Enhance the FileObjectManager to auto-apply custom names
     */
    enhanceFileObjectManager() {
        try {
            const fileObjectManager = window.app.fileObjectManager;
            
            // Store original method
            const originalCreateLinkObjects = fileObjectManager.createLinkObjects;
            
            if (originalCreateLinkObjects) {
                // Override with our enhanced version
                fileObjectManager.createLinkObjects = (linkFiles) => {
                    console.log('📗 LinkNameInitializer: Intercepting createLinkObjects...');
                    
                    // Call original method first
                    const result = originalCreateLinkObjects.call(fileObjectManager, linkFiles);
                    
                    // Apply custom names after creation
                    setTimeout(() => {
                        this.applyCustomNamesToRecentObjects(linkFiles);
                    }, 50); // Reduced from 500ms to 50ms for faster restoration
                    
                    return result;
                };
                
                console.log('📗 LinkNameInitializer: Enhanced FileObjectManager.createLinkObjects');
            }
        } catch (error) {
            console.error('❌ LinkNameInitializer: Error enhancing FileObjectManager:', error);
        }
    }

    /**
     * Check for new link objects and apply custom names
     */
    async checkForNewLinkObjects() {
        if (!window.app || !window.app.scene) return;

        try {
            const scene = window.app.scene;
            const linkObjects = [];

            // Find all link objects in the scene
            scene.traverse((object) => {
                if (object.userData && object.userData.fileData && 
                    object.userData.fileData.mimeType && 
                    object.userData.fileData.mimeType.startsWith('link:')) {
                    linkObjects.push(object);
                }
            });

            // Check each link object for custom names
            for (const object of linkObjects) {
                await this.applyCustomNameIfExists(object);
            }

        } catch (error) {
            console.error('❌ LinkNameInitializer: Error checking for new objects:', error);
        }
    }

    /**
     * Apply custom names to recently created objects
     */
    applyCustomNamesToRecentObjects(linkFiles) {
        try {
            console.log(`📗 LinkNameInitializer: Applying custom names to ${linkFiles.length} link files`);
            
            linkFiles.forEach(fileData => {
                // Check if this file has a custom display name
                if (fileData.customDisplayName && fileData.customDisplayName !== fileData.name) {
                    console.log(`📗 LinkNameInitializer: Found custom name for ${fileData.path}: "${fileData.customDisplayName}"`);
                    
                    // Find the corresponding object in the scene
                    const object = this.findObjectByPath(fileData.path);
                    if (object) {
                        this.applyCustomNameToObject(object, fileData.customDisplayName);
                    } else {
                        // Store for later application
                        this.pendingObjects.push({
                            path: fileData.path,
                            customName: fileData.customDisplayName
                        });
                    }
                }
            });
        } catch (error) {
            console.error('❌ LinkNameInitializer: Error applying custom names:', error);
        }
    }

    /**
     * Apply custom name if it exists for this object
     */
    async applyCustomNameIfExists(object) {
        try {
            // Skip if already processed
            if (object.userData.customNameApplied) return;

            const fileData = object.userData.fileData;
            if (!fileData) return;

            // Check for custom display name
            let customName = null;
            
            // Method 1: Check fileData.customDisplayName
            if (fileData.customDisplayName && fileData.customDisplayName !== fileData.name) {
                customName = fileData.customDisplayName;
            }
            
            // Method 2: Check saved preferences
            if (!customName) {
                customName = await this.getStoredCustomName(fileData.path);
            }

            if (customName) {
                console.log(`📗 LinkNameInitializer: Applying custom name "${customName}" to object ${object.uuid}`);
                this.applyCustomNameToObject(object, customName);
                object.userData.customNameApplied = true;
            }

        } catch (error) {
            console.error('❌ LinkNameInitializer: Error applying custom name:', error);
        }
    }

    /**
     * Get stored custom name from preferences
     */
    async getStoredCustomName(objectPath) {
        try {
            // Use the new LinkNamePersistenceChannel for proper Flutter persistence
            if (window.linkNamePersistenceChannel) {
                const customName = await window.linkNamePersistenceChannel.loadLinkName(objectPath);
                return customName;
            }
            
            // Fallback: Try localStorage (legacy method)
            const savedNames = JSON.parse(localStorage.getItem('link_custom_names') || '{}');
            return savedNames[objectPath];
        } catch (error) {
            console.error('❌ LinkNameInitializer: Error getting stored custom name:', error);
            return null;
        }
    }

    /**
     * Apply custom name to a specific object
     */
    applyCustomNameToObject(object, customName) {
        try {
            console.log(`📗 LinkNameInitializer: Applying custom texture for "${customName}" to object ${object.uuid}`);

            // Use the LinkNameManager if available
            if (window.LinkNameManager) {
                const linkNameManager = new window.LinkNameManager();
                linkNameManager.createCustomLinkTexture(object, customName);
                console.log(`✅ LinkNameInitializer: Applied custom texture using LinkNameManager`);
            } else {
                // Fallback: Apply custom texture directly
                this.createCustomTextureForObject(object, customName);
                console.log(`✅ LinkNameInitializer: Applied custom texture using fallback method`);
            }

            // Update object data
            if (object.userData.fileData) {
                object.userData.fileData.customDisplayName = customName;
            }

        } catch (error) {
            console.error('❌ LinkNameInitializer: Error applying custom name to object:', error);
        }
    }

    /**
     * Fallback method to create custom texture
     */
    createCustomTextureForObject(object, customName) {
        try {
            // Create canvas for the texture
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to match original
            canvas.width = 512;
            canvas.height = 256;
            
            // Get the background color from the object's existing material
            let backgroundColor = '#2196F3'; // Default blue
            
            // Try to extract color from existing material
            if (Array.isArray(object.material)) {
                // Look at the side faces to get the original color
                const sideMaterial = object.material[0] || object.material[1] || object.material[3];
                if (sideMaterial && sideMaterial.color) {
                    backgroundColor = `#${sideMaterial.color.getHexString()}`;
                }
            } else if (object.material && object.material.color) {
                backgroundColor = `#${object.material.color.getHexString()}`;
            }
            
            // Clear canvas with background color (matching original)
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw text with proper font size to match original
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 60px Arial, sans-serif'; // Match original size
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Position text in center like original (truncate if too long)
            const urlText = customName.substring(0, 12);
            ctx.fillText(urlText, canvas.width / 2, canvas.height / 2);
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.flipY = true; // Fix for upside down text like original
            texture.needsUpdate = true;
            
            // Apply texture to object faces (ONLY front and back faces like original)
            if (Array.isArray(object.material)) {
                // Update existing multi-material (faces 4, 5 = front, back)
                [4, 5].forEach(index => {
                    if (object.material[index]) {
                        // Dispose of old texture
                        if (object.material[index].map) {
                            object.material[index].map.dispose();
                        }
                        object.material[index].map = texture.clone();
                        object.material[index].needsUpdate = true;
                    }
                });
            } else {
                // Convert to multi-material and apply texture
                const originalMaterial = object.material;
                const materials = [];
                
                for (let i = 0; i < 6; i++) {
                    if (i === 4 || i === 5) { // Front, back faces only
                        materials.push(new THREE.MeshLambertMaterial({
                            map: texture.clone(),
                            transparent: false
                        }));
                    } else {
                        materials.push(originalMaterial.clone());
                    }
                }
                
                object.material = materials;
            }
            
            console.log(`📗 LinkNameInitializer: Fallback texture applied for "${customName}"`);
            
        } catch (error) {
            console.error('❌ LinkNameInitializer: Error creating fallback texture:', error);
        }
    }

    /**
     * Apply custom name to a specific object (legacy method)
     */
    applyCustomNameToObject(linkId, customName) {
        try {
            console.log(`📗 LinkNameInitializer: Applying custom name "${customName}" to ${linkId}`);

            // Find object in scene
            if (!window.app || !window.app.scene) {
                console.warn('⚠️ LinkNameInitializer: Scene not available');
                return;
            }

            let foundObject = null;
            window.app.scene.traverse((obj) => {
                if (foundObject) return;
                
                if (obj.userData && (
                    obj.userData.id === linkId ||
                    obj.userData.fileName === linkId ||
                    obj.uuid === linkId ||
                    obj.name === linkId
                )) {
                    foundObject = obj;
                }
            });

            if (foundObject) {
                // Update object properties
                if (foundObject.userData) {
                    foundObject.userData.fileName = customName;
                    foundObject.userData.title = customName;
                    foundObject.userData.displayName = customName;
                    if (foundObject.userData.fileData) {
                        foundObject.userData.fileData.name = customName;
                        foundObject.userData.fileData.title = customName;
                    }
                    if (foundObject.userData.linkData) {
                        foundObject.userData.linkData.title = customName;
                    }
                }
                foundObject.name = customName;
                
                console.log(`✅ LinkNameInitializer: Applied custom name "${customName}" to object ${foundObject.uuid}`);
            } else {
                console.warn(`⚠️ LinkNameInitializer: Could not find object for ${linkId}`);
            }
        } catch (error) {
            console.error('❌ LinkNameInitializer: Error applying custom name:', error);
        }
    }

    /**
     * Find object by file path
     */
    findObjectByPath(filePath) {
        if (!window.app || !window.app.scene) return null;

        let foundObject = null;
        window.app.scene.traverse((object) => {
            if (foundObject) return;
            
            if (object.userData && object.userData.fileData && 
                object.userData.fileData.path === filePath) {
                foundObject = object;
            }
        });

        return foundObject;
    }
}

// Auto-initialize when the script loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!window.linkNameInitializer) {
            window.linkNameInitializer = new LinkNameInitializer();
            window.linkNameInitializer.initialize();
        }
    }, 3000); // Wait 3 seconds for other systems to initialize
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading
} else {
    // DOM is already loaded
    setTimeout(() => {
        if (!window.linkNameInitializer) {
            window.linkNameInitializer = new LinkNameInitializer();
            window.linkNameInitializer.initialize();
        }
    }, 3000);
}

// Make it globally available
window.LinkNameInitializer = LinkNameInitializer;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkNameInitializer;
}
