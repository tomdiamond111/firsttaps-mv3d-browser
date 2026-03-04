/**
 * LinkNameManager - Handles link object name changes with comprehensive texture updates
 */

class LinkNameManager {
    constructor() {
        console.log('📗 LinkNameManager initialized');
    }

    /**
     * Update a link object's name - data only, no camera movement
     * @param {string} linkId - The link object ID
     * @param {string} newName - The new name to set
     */
    updateLinkName(linkId, newName) {
        try {
            console.log(`📗 LinkNameManager: Updating name for ${linkId} to "${newName}"`);

            const object = this.findLinkObject(linkId);
            if (!object) {
                console.error(`❌ LinkNameManager: Could not find object for ${linkId}`);
                return false;
            }

            console.log(`📗 LinkNameManager: Found object with UUID: ${object.uuid}`);

            // Store custom name persistently
            this.storeCustomName(object.uuid, newName);

            // Update all object data structures
            this.updateLinkData(object, newName);

            // Refresh visual display using LinkVisualManager
            this.refreshObjectDisplay(object, newName);

            // Notify Dart layer of the change
            this.notifyDartLayer(linkId, newName);

            // CRITICAL FIX: Trigger immediate backup to Flutter so rename persists
            this.triggerBackupSave(object);

            console.log(`✅ LinkNameManager: Successfully updated link name for ${object.uuid}`);
            return true;

        } catch (error) {
            console.error('❌ LinkNameManager: Error updating link name:', error);
            return false;
        }
    }

    /**
     * Trigger an immediate backup save to Flutter to persist the rename
     * @param {Object} linkObject - The link object that was renamed
     */
    triggerBackupSave(linkObject) {
        try {
            console.log('💾 LinkNameManager: Triggering immediate backup save to Flutter...');
            
            // Approach 1: Use BackupManagerChannel if available
            if (window.BackupManagerChannel && window.BackupManagerChannel.postMessage) {
                const backupData = {
                    action: 'saveFileData',
                    objectId: linkObject.userData.id || linkObject.userData.fileId,
                    fileData: linkObject.userData.fileData
                };
                window.BackupManagerChannel.postMessage(JSON.stringify(backupData));
                console.log('💾 Sent backup via BackupManagerChannel');
                return;
            }

            // Approach 2: Use BackupRestoreManager if available
            if (window.app && window.app.backupRestoreManager && window.app.backupRestoreManager.backupFileDataToFlutter) {
                window.app.backupRestoreManager.backupFileDataToFlutter();
                console.log('💾 Triggered backup via BackupRestoreManager');
                return;
            }

            // Approach 3: Directly trigger periodic backup
            if (window.app && window.app.fileObjectManager) {
                // Try to get all file objects and trigger their backup
                const fileObjects = window.app.fileObjectManager.stateManager?.fileObjects || [];
                if (fileObjects.length > 0 && window.FilePersistenceChannel) {
                    console.log('💾 Triggering full file persistence via FilePersistenceChannel');
                    // The FilePersistenceChannel should pick up the updated fileData
                    const allFileData = fileObjects.map(obj => obj.userData.fileData).filter(Boolean);
                    if (window.FilePersistenceChannel.postMessage) {
                        window.FilePersistenceChannel.postMessage(JSON.stringify({
                            action: 'saveAll',
                            files: allFileData
                        }));
                        console.log('💾 Sent full file data backup');
                        return;
                    }
                }
            }

            console.warn('⚠️ No backup mechanism available - rename may not persist');
            
        } catch (error) {
            console.error('❌ LinkNameManager: Error triggering backup:', error);
        }
    }

    /**
     * Find link object by various ID formats
     * @param {string} linkId - The link ID to search for
     * @returns {Object|null} The found object or null
     */
    findLinkObject(linkId) {
        if (!window.app || !window.app.scene) {
            console.error('❌ LinkNameManager: Scene not available');
            return null;
        }

        const scene = window.app.scene;

        // Method 1: Try direct UUID lookup
        const byUUID = scene.getObjectByProperty('uuid', linkId);
        if (byUUID) {
            console.log('📍 Found object by UUID');
            return byUUID;
        }

        // Method 2: Try by userData.id
        const byUserDataId = scene.children.find(obj => 
            obj.userData && obj.userData.id === linkId
        );
        if (byUserDataId) {
            console.log('📍 Found object by userData.id');
            return byUserDataId;
        }

        // Method 3: Try by object name
        const byName = scene.getObjectByName(linkId);
        if (byName) {
            console.log('📍 Found object by name');
            return byName;
        }

        // Method 4: Search all scene objects for matching properties
        let foundObject = null;
        scene.traverse((obj) => {
            if (foundObject) return; // Already found
            
            if (obj.userData && (
                obj.userData.id === linkId ||
                obj.userData.fileName === linkId ||
                obj.uuid === linkId ||
                obj.name === linkId
            )) {
                foundObject = obj;
                console.log('📍 Found object by traverse search');
            }
        });

        return foundObject;
    }

    /**
     * Store custom name in fallback storage
     * @param {string} uuid - Object UUID
     * @param {string} name - Custom name
     */
    storeCustomName(uuid, name) {
        try {
            if (!window.linkNameStorage) {
                window.linkNameStorage = {};
            }
            window.linkNameStorage[uuid] = name;
            console.log(`💾 LinkNameManager: Stored custom name (fallback) for ${uuid}: ${name}`);
        } catch (error) {
            console.error('❌ LinkNameManager: Error storing custom name:', error);
        }
    }

    /**
     * Update the object's internal data with the new name
     * This is the key method - updates what the object displays
     * @param {Object} linkObject - The link object to update
     * @param {string} newName - The new name
     */
    updateLinkData(linkObject, newName) {
        try {
            console.log('📗 LinkNameManager: Updating stored name data for visual display');
            
            // CRITICAL FIX: Create linkData structure if it doesn't exist!
            if (!linkObject.userData.linkData) {
                console.log('🔧 LinkNameManager: Creating missing linkData structure');
                linkObject.userData.linkData = {
                    title: newName,
                    url: linkObject.userData.fileData?.url || '',
                    domain: linkObject.userData.fileData?.domain || '',
                    description: linkObject.userData.fileData?.description || ''
                };
            } else {
                linkObject.userData.linkData.title = newName;
            }
            console.log(`📝 LinkNameManager: Updated linkData.title to "${newName}" (this controls visual display)`);
            
            // CRITICAL: Also create root level linkData if it doesn't exist
            if (!linkObject.linkData) {
                console.log('🔧 LinkNameManager: Creating missing root linkData structure');
                linkObject.linkData = {
                    title: newName,
                    url: linkObject.userData.fileData?.url || '',
                    domain: linkObject.userData.fileData?.domain || '',
                    description: linkObject.userData.fileData?.description || ''
                };
            } else {
                linkObject.linkData.title = newName;
            }
            console.log(`📝 LinkNameManager: Updated root linkData.title to "${newName}"`);
            
            // Update fileData.name if it exists (secondary storage)
            if (linkObject.userData && linkObject.userData.fileData) {
                linkObject.userData.fileData.name = newName;
                linkObject.userData.fileData.title = newName; // Also update title here
                console.log(`📝 LinkNameManager: Updated fileData.name and title to "${newName}"`);
            }
            
            // Update all possible name/title properties
            if (linkObject.userData) {
                linkObject.userData.fileName = newName;
                linkObject.userData.title = newName; // Add this too
                linkObject.userData.displayName = newName; // And this
                console.log(`📝 LinkNameManager: Updated userData properties to "${newName}"`);
            }
            
            // Update the object's name property as well
            linkObject.name = newName;
            console.log(`📝 LinkNameManager: Updated object.name to "${newName}"`);
            
            console.log(`✅ LinkNameManager: Successfully updated ALL name/title references including linkData to "${newName}"`);
            
        } catch (error) {
            console.error('❌ LinkNameManager: Error updating link name in object data:', error);
        }
    }

    /**
     * Notify Dart layer of the name change
     * @param {string} linkId - The link ID that was updated
     * @param {string} newName - The new name
     */
    notifyDartLayer(linkId, newName) {
        try {
            // PRIMARY: Use new LinkNamePersistenceChannel for proper Flutter persistence
            if (window.linkNamePersistenceChannel) {
                window.linkNamePersistenceChannel.saveLinkName(linkId, newName);
                console.log('📞 LinkNameManager: Saved via LinkNamePersistenceChannel');
            } else {
                console.warn('⚠️ LinkNameManager: LinkNamePersistenceChannel not available');
            }

            // FALLBACK: Try legacy channels for backwards compatibility
            if (window.LinkNameChangeChannel && window.LinkNameChangeChannel.invokeMethod) {
                const persistenceData = {
                    linkId: linkId,
                    newName: newName,
                    customDisplayName: newName // Explicitly set customDisplayName
                };
                window.LinkNameChangeChannel.invokeMethod('onLinkNameChanged', persistenceData);
                console.log('📞 LinkNameManager: Notified Dart of name change via LinkNameChangeChannel');
                console.log('📞 LinkNameManager: Persistence data sent:', persistenceData);
            }

            // SECONDARY: Also try general file channel for additional persistence
            if (window.FileChannel && window.FileChannel.invokeMethod) {
                const fileUpdateData = {
                    id: linkId,
                    customDisplayName: newName,
                    action: 'updateCustomName'
                };
                window.FileChannel.invokeMethod('updateFileData', fileUpdateData);
                console.log('📞 LinkNameManager: Also notified via FileChannel for additional persistence');
            }

            // TERTIARY: Try direct StateManager update
            if (window.stateManager && typeof window.stateManager.updateFileCustomName === 'function') {
                window.stateManager.updateFileCustomName(linkId, newName);
                console.log('📞 LinkNameManager: Updated StateManager directly');
            }

        } catch (error) {
            console.error('❌ LinkNameManager: Error notifying Dart layer:', error);
        }
    }

    /**
     * Refresh the object's visual display using proper texture update
     * @param {Object} object - The Three.js object to refresh
     * @param {string} newName - The new name to display
     */
    refreshObjectDisplay(object, newName) {
        try {
            console.log(`🔄 LinkNameManager: Refreshing visual display for object ${object.uuid}`);

            // DIAGNOSTIC: Log all the properties to verify data updates
            console.log(`🔍 DIAGNOSTIC - Object properties for ${object.uuid}:`);
            console.log(`   object.name: "${object.name}"`);
            console.log(`   object.userData:`, object.userData ? 'exists' : 'missing');
            if (object.userData) {
                console.log(`   object.userData.fileName: "${object.userData.fileName}"`);
                console.log(`   object.userData.title: "${object.userData.title}"`);
                console.log(`   object.userData.displayName: "${object.userData.displayName}"`);
                console.log(`   object.userData.linkData:`, object.userData.linkData ? 'exists' : 'missing');
                if (object.userData.linkData) {
                    console.log(`   object.userData.linkData.title: "${object.userData.linkData.title}"`);
                }
                console.log(`   object.userData.fileData:`, object.userData.fileData ? 'exists' : 'missing');
                if (object.userData.fileData) {
                    console.log(`   object.userData.fileData.name: "${object.userData.fileData.name}"`);
                    console.log(`   object.userData.fileData.title: "${object.userData.fileData.title}"`);
                }
            }
            console.log(`   object.linkData:`, object.linkData ? 'exists' : 'missing');
            if (object.linkData) {
                console.log(`   object.linkData.title: "${object.linkData.title}"`);
            }

            // PRIMARY METHOD: Use LinkVisualManager.forceUpdateLinkTexture
            console.log(`🎨 LinkNameManager: Attempting to use LinkVisualManager.forceUpdateLinkTexture...`);
            
            // Check multiple ways the LinkVisualManager might be available
            let visualManager = null;
            if (window.linkVisualManager) {
                visualManager = window.linkVisualManager;
                console.log(`🎨 LinkNameManager: Found LinkVisualManager at window.linkVisualManager`);
            } else if (window.LinkVisualManager) {
                visualManager = window.LinkVisualManager;
                console.log(`🎨 LinkNameManager: Found LinkVisualManager at window.LinkVisualManager`);
            } else if (window.app && window.app.linkVisualManager) {
                visualManager = window.app.linkVisualManager;
                console.log(`🎨 LinkNameManager: Found LinkVisualManager at window.app.linkVisualManager`);
            }

            if (visualManager && typeof visualManager.forceUpdateLinkTexture === 'function') {
                console.log(`🎨 LinkNameManager: Calling LinkVisualManager.forceUpdateLinkTexture("${newName}")...`);
                visualManager.forceUpdateLinkTexture(object, newName);
                console.log(`✅ LinkNameManager: LinkVisualManager texture update completed successfully!`);
            } else {
                console.log(`⚠️ LinkNameManager: LinkVisualManager.forceUpdateLinkTexture not available, trying manual texture creation...`);
                
                // FALLBACK METHOD: Manual texture creation
                this.createCustomLinkTexture(object, newName);
            }

            console.log(`✅ LinkNameManager: Visual display refreshed for object ${object.uuid}`);
        } catch (error) {
            console.error('❌ LinkNameManager: Error refreshing display:', error);
        }
    }

    /**
     * Create a custom texture for the link object with the new name
     * SMART: Preserves front face thumbnails for YouTube/image links
     * @param {Object} object - The Three.js object
     * @param {string} newName - The new name to display
     */
    createCustomLinkTexture(object, newName) {
        try {
            console.log(`🎨 LinkNameManager: Creating custom texture for "${newName}"`);

            // 🔍 DETECTION: Check if this object should preserve front face
            let preserveFrontFace = false;
            
            // Try to use LinkVisualManager's detection if available
            if (window.LinkVisualManager && typeof window.LinkVisualManager.prototype.shouldPreserveFrontFace === 'function') {
                const visualManager = new window.LinkVisualManager();
                preserveFrontFace = visualManager.shouldPreserveFrontFace(object);
            } else {
                // Fallback detection logic
                preserveFrontFace = this.shouldPreserveFrontFaceFallback(object);
            }
            
            if (preserveFrontFace) {
                console.log(`🛡️ LinkNameManager: Preserving front face thumbnail for: ${newName} (YouTube/Image detected)`);
            } else {
                console.log(`📝 LinkNameManager: Updating both faces for text-only link: ${newName}`);
            }

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
                    console.log(`🎨 LinkNameManager: Using existing material color: ${backgroundColor}`);
                }
            } else if (object.material && object.material.color) {
                backgroundColor = `#${object.material.color.getHexString()}`;
                console.log(`🎨 LinkNameManager: Using single material color: ${backgroundColor}`);
            }
            
            // Clear canvas with background color (matching original)
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // NO border - original doesn't have one on text faces
            
            // Draw text with LARGER font size to match original (60px not 32px)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 60px Arial, sans-serif'; // Match original size
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Position text in center like original (no wrapping for simplicity)
            const urlText = newName.substring(0, 12); // Truncate like original
            ctx.fillText(urlText, canvas.width / 2, canvas.height / 2);
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.flipY = true; // Fix for upside down text like original
            texture.needsUpdate = true;
            
            // 🎯 SELECTIVE FACE UPDATES: Determine which faces to update
            const facesToUpdate = preserveFrontFace ? [5] : [4, 5]; // Back-only vs Both faces
            
            console.log(`🎨 LinkNameManager: Updating faces: ${facesToUpdate.join(', ')} ${preserveFrontFace ? '(preserving front thumbnail)' : '(text-only link)'}`);
            
            // Apply texture to object faces (SELECTIVE based on detection)
            if (Array.isArray(object.material)) {
                // Update existing multi-material selectively
                facesToUpdate.forEach(index => {
                    if (object.material[index]) {
                        // Dispose of old texture
                        if (object.material[index].map) {
                            object.material[index].map.dispose();
                        }
                        object.material[index].map = texture.clone();
                        object.material[index].needsUpdate = true;
                    }
                });
                console.log(`🎨 LinkNameManager: Updated faces ${facesToUpdate.join(',')} with new texture`);
            } else {
                // Convert to multi-material and apply texture selectively
                const originalMaterial = object.material;
                const materials = [];
                
                for (let i = 0; i < 6; i++) {
                    if (facesToUpdate.includes(i)) {
                        materials.push(new THREE.MeshLambertMaterial({
                            map: texture.clone(),
                            transparent: false
                        }));
                    } else {
                        materials.push(originalMaterial.clone());
                    }
                }
                
                object.material = materials;
                console.log(`🎨 LinkNameManager: Converted to multi-material with selective face updates`);
            }
            
            console.log(`🎨 LinkNameManager: Custom texture created and applied for "${newName}" ${preserveFrontFace ? '(front face preserved)' : '(both faces updated)'}`);
            
        } catch (error) {
            console.error('❌ LinkNameManager: Error creating custom texture:', error);
        }
    }

    /**
     * Fallback detection logic for preserving front face (when LinkVisualManager unavailable)
     * @param {Object} object - The Three.js object
     * @returns {boolean} True if front face should be preserved
     */
    shouldPreserveFrontFaceFallback(object) {
        try {
            // Check for YouTube URL
            const url = object.userData?.fileData?.url || 
                       object.userData?.linkData?.url || 
                       object.linkData?.url || '';
            
            if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
                return true;
            }
            
            // Check for image texture on front face
            if (Array.isArray(object.material) && object.material[4] && object.material[4].map) {
                const texture = object.material[4].map;
                if (texture.image && texture.image.src) {
                    const src = texture.image.src.toLowerCase();
                    if (src.includes('.jpg') || src.includes('.jpeg') || 
                        src.includes('.png') || src.includes('.gif') ||
                        src.includes('youtube.com/vi/')) {
                        return true;
                    }
                }
            }
            
            // Check for YouTube thumbnail metadata
            if (object.userData?.youTubeThumbnail) {
                return true;
            }
            
            return false;
        } catch (error) {
            console.warn('Error in fallback front face detection:', error);
            return false;
        }
    }

    /**
     * Camera reset disabled - we don't want camera movement on name changes
     */
    performCameraReset() {
        // Disabled to prevent unwanted camera movement during name changes
        console.log(`📷 LinkNameManager: Camera reset disabled - no movement on name change`);
    }

    /**
     * Restore all saved link names from persistence
     * Uses the same object finding logic as updateLinkName for consistency
     */
    async restoreAllSavedLinkNames() {
        try {
            console.log('🔄 LinkNameManager: Starting restoration of saved link names...');

            // Load all saved names from Flutter
            const savedNames = await this.loadAllSavedNames();
            
            if (!savedNames || Object.keys(savedNames).length === 0) {
                console.log('📋 LinkNameManager: No saved link names to restore');
                return;
            }

            console.log(`📋 LinkNameManager: Found ${Object.keys(savedNames).length} saved link names`);

            // Apply each saved name using our proven update logic
            for (const [linkId, customName] of Object.entries(savedNames)) {
                console.log(`🔄 LinkNameManager: Restoring "${customName}" for ${linkId}`);
                
                // Find the object using our proven method
                const object = this.findLinkObject(linkId);
                if (!object) {
                    console.warn(`⚠️ LinkNameManager: Could not find object for ${linkId}, skipping`);
                    continue;
                }

                // Update the object data (but skip Dart notification since this IS from Dart)
                this.updateLinkData(object, customName);
                
                // Refresh the visual display
                this.refreshObjectDisplay(object, customName);
                
                console.log(`✅ LinkNameManager: Restored "${customName}" for ${object.uuid}`);
            }

            console.log('✅ LinkNameManager: Restoration complete');
        } catch (error) {
            console.error('❌ LinkNameManager: Error during restoration:', error);
        }
    }

    /**
     * Load all saved names using the persistence channel
     */
    async loadAllSavedNames() {
        try {
            // Use the global linkNameLoad function that's proven to work
            if (typeof window.linkNameLoad === 'function') {
                console.log('🔗 Global linkNameLoad called - loading all saved link names...');
                return await window.linkNameLoad();
            }
            
            // Fallback: use persistence channel directly
            if (window.linkNamePersistenceChannel) {
                return await window.linkNamePersistenceChannel.loadAllLinkNames();
            }
            
            console.warn('⚠️ LinkNameManager: No persistence mechanism available');
            return {};
        } catch (error) {
            console.error('❌ LinkNameManager: Error loading saved names:', error);
            return {};
        }
    }
}

// Make it globally available
window.LinkNameManager = LinkNameManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkNameManager;
}