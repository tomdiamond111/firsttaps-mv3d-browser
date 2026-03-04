/**
 * Default Link Initializer Module
 * Handles creation of preloaded default link objects for new users
 * Creates example links on first launch to demonstrate the 3D world
 */

(function() {
    'use strict';
    
    console.log("Loading DefaultLinkInitializer module...");
    
    class DefaultLinkInitializer {
        constructor(app) {
            this.app = app;
            this.storageKey = 'firstTaps_defaultLinksCreated';
            
            // Define default link objects to create
            this.defaultLinks = [
                {
                    id: 'default_link_firsttaps',
                    url: 'https://firsttaps.com',
                    name: 'FirstTaps.com',
                    position: { x: 0, y: 1, z: 0 }, // Center of Home Area
                    description: 'FirstTaps - Your 3D File Explorer'
                }
            ];
            
            console.log('🎬 DefaultLinkInitializer constructed');
        }
        
        /**
         * Initialize default links if this is first launch
         * @returns {Promise<boolean>} - True if links were created
         */
        async initialize() {
            console.log('🎬 DefaultLinkInitializer: Checking if default links should be created...');
            console.log(`🔍 Current objects in scene: ${this.app.stateManager?.fileObjects?.length || 0}`);
            
            // CRITICAL FIX: Verify dependencies are ready before proceeding
            if (!this.app.urlManager) {
                console.warn('⚠️ URLManager not ready, deferring default link initialization...');
                // Retry after a delay
                setTimeout(() => this.initialize(), 2000);
                return false;
            }
            
            if (!this.app.stateManager) {
                console.warn('⚠️ StateManager not ready, deferring default link initialization...');
                setTimeout(() => this.initialize(), 2000);
                return false;
            }
            
            // Check if default links already exist in the scene FIRST (most reliable check)
            // This prevents checking persistence flag before scene is fully loaded
            if (this.defaultLinksExistInScene()) {
                console.log('✓ Default links already exist in scene (loaded from persistence)');
                await this.markDefaultLinksAsCreated();
                return false;
            }
            
            // IMPORTANT: Check persistence flag AFTER checking scene
            // This prevents recreation if user deleted the links
            const alreadyCreated = await this.hasCreatedDefaultLinks();
            if (alreadyCreated) {
                console.log('✓ Default links already created in a previous session (persistence flag set)');
                console.log('  → User may have deleted them - respecting that choice');
                return false;
            }
            
            console.log('🆕 First launch detected - creating default link objects...');
            
            try {
                const success = await this.createDefaultLinks();
                if (success) {
                    // CRITICAL FIX: Only mark as created if we successfully created links
                    await this.markDefaultLinksAsCreated();
                    console.log('✅ Default links created successfully');
                    return true;
                } else {
                    console.warn('⚠️ Default link creation failed, will retry on next app start');
                    return false;
                }
            } catch (error) {
                console.error('❌ Error creating default links:', error);
                // Don't mark as created if there was an error
                return false;
            }
        }
        
        /**
         * Check if default links have been created before (using Dart SharedPreferences)
         * @returns {Promise<boolean>}
         */
        async hasCreatedDefaultLinks() {
            try {
                // Try Dart SharedPreferences first (most reliable)
                if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                    try {
                        const result = await window.flutter_inappwebview.callHandler(
                            'getStringPreference',
                            this.storageKey
                        );
                        console.log(`📝 Checked Dart SharedPreferences for ${this.storageKey}: ${result}`);
                        return result === 'true';
                    } catch (dartError) {
                        console.warn('Could not check Dart SharedPreferences:', dartError);
                    }
                }
                
                // Fallback to localStorage
                const created = localStorage.getItem(this.storageKey);
                console.log(`📝 Checked localStorage for ${this.storageKey}: ${created}`);
                return created === 'true';
            } catch (e) {
                console.warn('Could not access persistence:', e);
                return false;
            }
        }
        
        /**
         * Mark default links as created (using both Dart SharedPreferences and localStorage)
         */
        async markDefaultLinksAsCreated() {
            try {
                // Save to Dart SharedPreferences (persistent across app restarts)
                if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                    try {
                        await window.flutter_inappwebview.callHandler(
                            'setStringPreference',
                            this.storageKey,
                            'true'
                        );
                        console.log('📝 Default links marked as created in Dart SharedPreferences');
                    } catch (dartError) {
                        console.warn('Could not save to Dart SharedPreferences:', dartError);
                    }
                }
                
                // Also save to localStorage as backup
                localStorage.setItem(this.storageKey, 'true');
                console.log('📝 Default links marked as created in localStorage (backup)');
            } catch (e) {
                console.warn('Could not write to persistence:', e);
            }
        }
        
        /**
         * Check if default links already exist in the scene
         * @returns {boolean}
         */
        defaultLinksExistInScene() {
            if (!this.app.stateManager || !this.app.stateManager.fileObjects) {
                console.log('⚠️ State manager or fileObjects not available for scene check');
                return false;
            }
            
            const fileObjects = this.app.stateManager.fileObjects;
            console.log(`🔍 Checking ${fileObjects.length} objects for default links...`);
            
            // Check if any of our default link IDs or URLs exist
            for (const defaultLink of this.defaultLinks) {
                const exists = fileObjects.some(obj => {
                    if (!obj.userData) return false;
                    
                    // Check by default link ID
                    if (obj.userData.defaultLinkId === defaultLink.id) {
                        return true;
                    }
                    
                    // Check by object ID (might be persisted with this ID)
                    if (obj.userData.id && obj.userData.id.includes(defaultLink.id)) {
                        return true;
                    }
                    
                    // Check by URL match (most reliable for persisted links)
                    if (obj.userData.fileData && obj.userData.fileData.url === defaultLink.url) {
                        return true;
                    }
                    
                    // Check linkData structure
                    if (obj.userData.linkData && obj.userData.linkData.url === defaultLink.url) {
                        return true;
                    }
                    
                    return false;
                });
                
                if (exists) {
                    console.log(`✓ Found existing default link in scene: ${defaultLink.name} (${defaultLink.url})`);
                    return true;
                }
            }
            
            console.log('❌ No default links found in scene');
            return false;
        }
        
        /**
         * Create all default link objects
         * @returns {Promise<boolean>} - True if at least one link was created successfully
         */
        async createDefaultLinks() {
            console.log(`🔗 Creating ${this.defaultLinks.length} default link objects...`);
            
            // Verify URLManager is available
            if (!this.app.urlManager) {
                console.error('❌ URLManager not available - cannot create default links');
                return false;
            }
            
            let successCount = 0;
            
            // Create each default link with a small delay between them
            for (let i = 0; i < this.defaultLinks.length; i++) {
                const linkDef = this.defaultLinks[i];
                
                try {
                    console.log(`🔗 Creating default link ${i + 1}/${this.defaultLinks.length}: ${linkDef.name}`);
                    
                    // Check if position is occupied
                    const adjustedPosition = this.getAvailablePosition(linkDef.position);
                    
                    let linkCreated = false;
                    
                    // Create the link object using URLManager
                    const linkObject = await this.app.urlManager.createLinkFromURL(linkDef.url, {
                        position: adjustedPosition,
                        onLoadingStart: () => {
                            console.log(`⏳ Loading metadata for ${linkDef.name}...`);
                        },
                        onLoadingEnd: () => {
                            console.log(`✓ Finished loading ${linkDef.name}`);
                        },
                        onSuccess: (linkObj, linkData) => {
                            // Mark this as a default object
                            if (linkObj && linkObj.userData) {
                                linkObj.userData.isDefaultObject = true;
                                linkObj.userData.defaultLinkId = linkDef.id;
                                linkCreated = true;
                                successCount++;
                            }
                            console.log(`✅ Default link created: ${linkDef.name}`);
                        },
                        onError: (error) => {
                            console.error(`❌ Failed to create ${linkDef.name}:`, error);
                        }
                    });
                    
                    // Wait a moment to ensure the link is created and callbacks fire
                    await this.delay(300);
                    
                    // Verify the link was actually created in the scene
                    if (linkObject || linkCreated) {
                        console.log(`✓ Verified ${linkDef.name} was created`);
                    } else {
                        console.warn(`⚠️ ${linkDef.name} creation may have failed`);
                    }
                    
                    // Small delay before creating next link
                    if (i < this.defaultLinks.length - 1) {
                        await this.delay(500);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error creating default link ${linkDef.name}:`, error);
                    // Continue with next link even if one fails
                }
            }
            
            console.log(`✅ Default links creation completed: ${successCount}/${this.defaultLinks.length} successful`);
            return successCount > 0;
        }
        
        /**
         * Get an available position, adjusting if the requested position is occupied
         * @param {Object} requestedPosition - Desired position {x, y, z}
         * @returns {Object} - Available position
         */
        getAvailablePosition(requestedPosition) {
            if (!this.app.stateManager || !this.app.stateManager.fileObjects) {
                return requestedPosition;
            }
            
            const fileObjects = this.app.stateManager.fileObjects;
            const checkRadius = 2; // Consider position occupied if object within 2 units
            
            // Check if requested position is free
            const isOccupied = fileObjects.some(obj => {
                if (!obj.position) return false;
                
                const dx = obj.position.x - requestedPosition.x;
                const dz = obj.position.z - requestedPosition.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                return distance < checkRadius;
            });
            
            if (!isOccupied) {
                console.log(`✓ Position (${requestedPosition.x}, ${requestedPosition.z}) is available`);
                return requestedPosition;
            }
            
            // Position is occupied, try to find nearby alternative
            console.log(`⚠️ Position (${requestedPosition.x}, ${requestedPosition.z}) is occupied, finding alternative...`);
            
            for (let angle = 0; angle < 360; angle += 30) {
                const radians = (angle * Math.PI) / 180;
                const offset = 3;
                
                const candidatePosition = {
                    x: Math.round(requestedPosition.x + offset * Math.cos(radians)),
                    y: requestedPosition.y,
                    z: Math.round(requestedPosition.z + offset * Math.sin(radians))
                };
                
                const candidateOccupied = fileObjects.some(obj => {
                    if (!obj.position) return false;
                    
                    const dx = obj.position.x - candidatePosition.x;
                    const dz = obj.position.z - candidatePosition.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    
                    return distance < checkRadius;
                });
                
                if (!candidateOccupied) {
                    console.log(`✓ Found alternative position: (${candidatePosition.x}, ${candidatePosition.z})`);
                    return candidatePosition;
                }
            }
            
            // If all nearby positions are occupied, return original (better than failing)
            console.log(`⚠️ No alternative position found, using original position`);
            return requestedPosition;
        }
        
        /**
         * Utility delay function
         * @param {number} ms - Milliseconds to delay
         * @returns {Promise}
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        /**
         * Reset default links flag (for testing or after clearing app data)
         * Call this from console: DefaultLinkInitializer.resetDefaultLinksFlag()
         */
        static async resetDefaultLinksFlag() {
            try {
                const storageKey = 'firstTaps_defaultLinksCreated';
                
                // Clear from Dart SharedPreferences
                if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                    try {
                        await window.flutter_inappwebview.callHandler(
                            'setStringPreference',
                            storageKey,
                            ''
                        );
                        console.log('🔄 Cleared Dart SharedPreferences flag');
                    } catch (dartError) {
                        console.warn('Could not clear Dart SharedPreferences:', dartError);
                    }
                }
                
                // Clear from localStorage
                localStorage.removeItem(storageKey);
                console.log('🔄 Default links flag reset - will recreate on next initialization');
                console.log('💡 Restart the app or reload to see default links recreated');
            } catch (e) {
                console.warn('Could not reset flag:', e);
            }
        }
        
        /**
         * Check if a specific default link has been deleted by the user
         * @param {string} defaultLinkId - ID of the default link
         * @returns {boolean}
         */
        isDefaultLinkDeleted(defaultLinkId) {
            try {
                const deletedKey = `defaultLink_${defaultLinkId}_deleted`;
                return localStorage.getItem(deletedKey) === 'true';
            } catch (e) {
                return false;
            }
        }
        
        /**
         * Mark a default link as deleted by the user
         * @param {string} defaultLinkId - ID of the default link
         */
        static markDefaultLinkDeleted(defaultLinkId) {
            try {
                const deletedKey = `defaultLink_${defaultLinkId}_deleted`;
                localStorage.setItem(deletedKey, 'true');
                console.log(`📝 Default link ${defaultLinkId} marked as deleted`);
            } catch (e) {
                console.warn('Could not mark link as deleted:', e);
            }
        }
    }
    
    // Export to global scope
    window.DefaultLinkInitializer = DefaultLinkInitializer;
    
    console.log('✅ DefaultLinkInitializer module loaded');
    
})();
