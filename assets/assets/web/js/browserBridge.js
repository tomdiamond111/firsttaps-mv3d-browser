/**
 * Browser Bridge - Provides Flutter WebView bridge compatibility for browser environment
 * 
 * This replaces flutter_inappwebview.callHandler with postMessage communication
 * and stubs out mobile-specific features like file system access, contacts, SMS, etc.
 * 
 * IMPORTANT: For browser version, we want JavaScript to show its own UI
 */

(function() {
    'use strict';
    
    console.log('🌐 Loading Browser Bridge...');

    // BROWSER MODE FLAG: Tell JavaScript to use its own UI instead of hiding for Flutter
    window.IS_BROWSER_MODE = true;
    console.log('🌐 IS_BROWSER_MODE = true (JavaScript will show its own UI)');
    
    // ============================================================================
    // OBJECT PERSISTENCE FOR BROWSER-ONLY MODE
    // ============================================================================
    // In Flutter mode, ObjectMovedChannel sends position updates to Dart's WorldPersistenceService
    // In browser-only mode, we need to save object positions to localStorage directly
    
    const OBJECT_STORAGE_KEY = 'mv3d_browser_object_positions';
    const LINK_OBJECTS_STORAGE_KEY = 'mv3d_browser_link_objects';
    
    /**
     * Save object positions to localStorage
     * @param {Object} moveData - Object with id, x, y, z, rotation, furnitureId, slotIndex
     */
    function saveObjectPosition(moveData) {
        try {
            // Load existing positions
            const stored = localStorage.getItem(OBJECT_STORAGE_KEY);
            const positions = stored ? JSON.parse(stored) : {};
            
            // Update position for this object
            positions[moveData.id] = {
                x: moveData.x,
                y: moveData.y,
                z: moveData.z,
                rotation: moveData.rotation || 0,
                furnitureId: moveData.furnitureId || null,
                slotIndex: moveData.slotIndex !== undefined ? moveData.slotIndex : null,
                lastUpdated: Date.now()
            };
            
            // Save back to localStorage
            localStorage.setItem(OBJECT_STORAGE_KEY, JSON.stringify(positions));
            console.log(`💾 [BROWSER] Saved object position: ${moveData.id} at (${moveData.x.toFixed(2)}, ${moveData.y.toFixed(2)}, ${moveData.z.toFixed(2)})`);
            
        } catch (error) {
            console.error('💾 [BROWSER] Error saving object position:', error);
        }
    }
    
    /**
     * Load object position from localStorage
     * @param {string} objectId - The object ID to look up
     * @returns {Object|null} Position data or null if not found
     */
    function loadObjectPosition(objectId) {
        try {
            const stored = localStorage.getItem(OBJECT_STORAGE_KEY);
            if (!stored) return null;
            
            const positions = JSON.parse(stored);
            return positions[objectId] || null;
        } catch (error) {
            console.error('💾 [BROWSER] Error loading object position:', error);
            return null;
        }
    }
    
    /**
     * Load all object positions from localStorage
     * @returns {Object} All stored positions keyed by object ID
     */
    function loadAllObjectPositions() {
        try {
            const stored = localStorage.getItem(OBJECT_STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('💾 [BROWSER] Error loading all object positions:', error);
            return {};
        }
    }
    
    /**
     * Delete object position from localStorage
     * @param {string} objectId - The object ID to remove
     */
    function deleteObjectPosition(objectId) {
        try {
            const stored = localStorage.getItem(OBJECT_STORAGE_KEY);
            if (!stored) return;
            
            const positions = JSON.parse(stored);
            if (positions[objectId]) {
                delete positions[objectId];
                localStorage.setItem(OBJECT_STORAGE_KEY, JSON.stringify(positions));
                console.log(`💾 [BROWSER] Deleted object position: ${objectId}`);
            }
        } catch (error) {
            console.error('💾 [BROWSER] Error deleting object position:', error);
        }
    }
    
    /**
     * Save link object data to localStorage
     * @param {Object} linkData - Complete link object data (id, name, url, position, etc.)
     */
    function saveLinkObject(linkData) {
        try {
            // Load existing link objects
            const stored = localStorage.getItem(LINK_OBJECTS_STORAGE_KEY);
            const linkObjects = stored ? JSON.parse(stored) : {};
            
            // Save the complete link object data
            linkObjects[linkData.id] = {
                ...linkData,
                lastUpdated: Date.now()
            };
            
            // Save back to localStorage
            localStorage.setItem(LINK_OBJECTS_STORAGE_KEY, JSON.stringify(linkObjects));
            console.log(`💾 [BROWSER] Saved link object: ${linkData.id} (${linkData.name || linkData.url})`);
            
        } catch (error) {
            console.error('💾 [BROWSER] Error saving link object:', error);
        }
    }
    
    /**
     * Load link object from localStorage
     * @param {string} objectId - The link object ID to look up
     * @returns {Object|null} Link object data or null if not found
     */
    function loadLinkObject(objectId) {
        try {
            const stored = localStorage.getItem(LINK_OBJECTS_STORAGE_KEY);
            if (!stored) return null;
            
            const linkObjects = JSON.parse(stored);
            return linkObjects[objectId] || null;
        } catch (error) {
            console.error('💾 [BROWSER] Error loading link object:', error);
            return null;
        }
    }
    
    /**
     * Load all link objects from localStorage
     * @returns {Object} All stored link objects keyed by object ID
     */
    function loadAllLinkObjects() {
        try {
            const stored = localStorage.getItem(LINK_OBJECTS_STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('💾 [BROWSER] Error loading all link objects:', error);
            return {};
        }
    }
    
    /**
     * Delete link object from localStorage
     * @param {string} objectId - The link object ID to remove
     */
    function deleteLinkObject(objectId) {
        try {
            const stored = localStorage.getItem(LINK_OBJECTS_STORAGE_KEY);
            if (!stored) return;
            
            const linkObjects = JSON.parse(stored);
            if (linkObjects[objectId]) {
                delete linkObjects[objectId];
                localStorage.setItem(LINK_OBJECTS_STORAGE_KEY, JSON.stringify(linkObjects));
                console.log(`💾 [BROWSER] Deleted link object: ${objectId}`);
            }
        } catch (error) {
            console.error('💾 [BROWSER] Error deleting link object:', error);
        }
    }
    
    /**
     * Update link object metadata in localStorage
     * Merges new userData into existing link object without overwriting all fields
     * @param {string} objectId - The link object ID to update
     * @param {Object} userData - userData object with metadata (youtubeMetadata, spotifyMetadata, etc.)
     */
    function updateLinkObjectMetadata(objectId, userData) {
        try {
            const stored = localStorage.getItem(LINK_OBJECTS_STORAGE_KEY);
            if (!stored) {
                console.warn(`💾 [BROWSER] Cannot update metadata: ${objectId} not found in storage`);
                return;
            }
            
            const linkObjects = JSON.parse(stored);
            if (!linkObjects[objectId]) {
                console.warn(`💾 [BROWSER] Cannot update metadata: ${objectId} not found`);
                return;
            }
            
            // Merge userData into existing object
            linkObjects[objectId].userData = {
                ...(linkObjects[objectId].userData || {}),
                ...userData,
                lastUpdated: Date.now()
            };
            
            // Save back to localStorage
            localStorage.setItem(LINK_OBJECTS_STORAGE_KEY, JSON.stringify(linkObjects));
            console.log(`💾 [BROWSER] Updated metadata for: ${objectId}`);
            
        } catch (error) {
            console.error('💾 [BROWSER] Error updating link object metadata:', error);
        }
    }
    
    // Expose object position functions globally
    window.browserObjectStorage = {
        save: saveObjectPosition,
        load: loadObjectPosition,
        loadAll: loadAllObjectPositions,
        delete: deleteObjectPosition,
        saveLinkObject: saveLinkObject,
        loadLinkObject: loadLinkObject,
        loadAllLinkObjects: loadAllLinkObjects,
        deleteLinkObject: deleteLinkObject,
        updateMetadata: updateLinkObjectMetadata
    };

    // Create flutter_inappwebview compatibility layer
    window.flutter_inappwebview = {
        callHandler: function(handlerName, ...args) {
            console.log(`[BRIDGE] Call to ${handlerName}:`, args);
            
            // Handle browser-compatible methods
            switch(handlerName) {
                case 'SharedPreferencesChannel':
                case 'getStringPreference':
                case 'loadStringFromPrefs':
                case 'getUserPreference':
                    return Promise.resolve(handlePreferenceCall(handlerName, args));
                
                case 'readFileFromStorage':
                    return Promise.resolve(null); // No file system in browser
                
                case 'handlePremiumGamingPopup':
                    return Promise.resolve(false); // No premium features in browser
                
                case 'loadAvatarCustomizations':
                    return Promise.resolve(null); // Will use default avatar
                
                case 'saveToSharedPreferences':
                case 'saveStringPreference':
                    return Promise.resolve(handlePreferenceSave(handlerName, args));
                
                case 'objectCreated':
                case 'objectDeleted':
                case 'objectMoved':
                case 'furnitureCreated':
                    // Forward to Flutter via postMessage
                    sendToFlutter(handlerName, args);
                    return Promise.resolve(true);
                
                default:
                    console.warn(`[BRIDGE] Unknown handler: ${handlerName}`);
                    return Promise.resolve(null);
            }
        }
    };

    // Preference storage using localStorage
    function handlePreferenceCall(handlerName, args) {
        try {
            const key = args[0];
            const defaultValue = args[1];
            
            const stored = localStorage.getItem(`pref_${key}`);
            if (stored !== null) {
                return stored;
            }
            return defaultValue || null;
        } catch (e) {
            console.error(`[BRIDGE ERROR] ${handlerName}:`, e);
            return null;
        }
    }

    function handlePreferenceSave(handlerName, args) {
        try {
            const key = args[0];
            const value = args[1];
            
            if (key && value !== undefined) {
                localStorage.setItem(`pref_${key}`, String(value));
                return true;
            }
            return false;
        } catch (e) {
            console.error(`[BRIDGE ERROR] ${handlerName}:`, e);
            return false;
        }
    }

    // Send messages to Flutter parent window
    function sendToFlutter(type, data) {
        try {
            window.parent.postMessage({
                source: 'threejs-iframe',
                type: type,
                data: data
            }, '*');
            console.log(`[BRIDGE] Sent message to Flutter: ${type}`, data);
        } catch (e) {
            console.error('[BRIDGE ERROR] Failed to send message to Flutter:', e);
        }
    }

    // Expose browserBridge API for UI buttons
    window.browserBridge = {
        sendToFlutter: function(message) {
            if (message && message.type) {
                sendToFlutter(message.type, message);
            } else {
                console.error('[BRIDGE ERROR] Invalid message format:', message);
            }
        }
    };
    console.log('✅ window.browserBridge API exposed for UI buttons');

    // Listen for messages from Flutter parent window
    window.addEventListener('message', function(event) {
        if (event.data && event.data.source === 'flutter') {
            console.log('[BRIDGE] Message from Flutter:', event.data);
            console.log('[BRIDGE] Message type:', event.data.type);
            
            // Handle commands from Flutter
            switch(event.data.type) {
                case 'initialize':
                    console.log('🎬 [BRIDGE] Received initialize command from Flutter');
                    // The world is already initialized by the time Flutter sends this
                    // Just acknowledge it
                    console.log('✅ World already initialized, ready for use');
                    break;
                
                case 'createObject':
                    if (window.createObject) {
                        window.createObject(event.data.data);
                    }
                    break;
                
                case 'deleteObject':
                    if (window.deleteObject) {
                        window.deleteObject(event.data.data);
                    }
                    break;
                
                case 'loadFurniture':
                    if (window.loadFurniture) {
                        window.loadFurniture(event.data.data);
                    }
                    break;
                
                case 'switchWorld':
                    console.log('🌍 [BRIDGE] Switching world to:', event.data.worldType);
                    if (window.switchWorldTemplate) {
                        window.switchWorldTemplate(event.data.worldType);
                        console.log('✅ switchWorldTemplate() called successfully');
                    } else if (window.app && window.app.switchWorldTemplate) {
                        window.app.switchWorldTemplate(event.data.worldType);
                        console.log('✅ window.app.switchWorldTemplate() called successfully');
                    } else {
                        console.warn('⚠️ World switching not available');
                    }
                    break;
                
                case 'addLink':
                    console.log('🔗 [BRIDGE] Adding link/URL:', event.data.url);
                    if (window.addUrlToWorld) {
                        window.addUrlToWorld(event.data.url);
                        console.log('✅ addUrlToWorld() called successfully');
                    } else if (window.app && window.app.addAppObject) {
                        // Use app object creation for links
                        window.app.addAppObject({
                            url: event.data.url,
                            type: 'link',
                        });
                        console.log('✅ window.app.addAppObject() called successfully');
                    } else {
                        console.warn('⚠️ Add link functionality not available');
                    }
                    break;
                
                case 'createFurniture':
                    console.log('🪑 [BRIDGE] Creating furniture:', event.data.furnitureType);
                    if (window.createFurniture) {
                        window.createFurniture({
                            type: event.data.furnitureType,
                            material: 'marble', // Default material
                        });
                        console.log('✅ createFurniture() called successfully');
                    } else if (window.app && window.app.furnitureManager) {
                        // Use furniture manager
                        window.app.furnitureManager.createFurniture({
                            type: event.data.furnitureType,
                            material: 'marble',
                        });
                        console.log('✅ window.app.furnitureManager.createFurniture() called successfully');
                    } else {
                        console.warn('⚠️ Create furniture functionality not available');
                    }
                    break;
                
                case 'ensureFurnitureSaved':
                    console.log('🪑 [BRIDGE] Ensuring furniture data is saved before entering 2D view...');
                    (async () => {
                        try {
                            // Wait for FurnitureManager to be initialized (up to 2 seconds)
                            let attempts = 0;
                            while ((!window.app || !window.app.furnitureManager || !window.app.furnitureManager.initialized) && attempts < 20) {
                                console.log(`🪑 [BRIDGE] Waiting for FurnitureManager... attempt ${attempts + 1}`);
                                await new Promise(resolve => setTimeout(resolve, 100));
                                attempts++;
                            }
                            
                            if (window.app && window.app.furnitureManager && window.app.furnitureManager.storageManager) {
                                console.log('🪑 [BRIDGE] FurnitureManager ready, triggering save...');
                                await window.app.furnitureManager.storageManager.saveAllFurniture();
                                console.log('🪑 [BRIDGE] Furniture data saved successfully');
                            } else {
                                console.warn('🪑 [BRIDGE] FurnitureManager not available after waiting');
                            }
                        } catch (error) {
                            console.error('🪑 [BRIDGE] Error ensuring furniture save:', error);
                        }
                    })();
                    break;
                
                case 'showScoreboard':
                    console.log('🎮 [BRIDGE] Opening scoreboard...');
                    if (window.entityUIManager && window.entityUIManager.showFullScoreboard) {
                        window.entityUIManager.showFullScoreboard();
                    } else {
                        console.warn('⚠️ entityUIManager not available');
                    }
                    break;
                
                case 'resetHomeView':
                    console.log('🏠 [BRIDGE] Toggling home view (close-up ↔ aerial)...');
                    // Call the global resetHomeView function which toggles between close-up and aerial views
                    if (window.resetHomeView) {
                        window.resetHomeView();
                        console.log('✅ resetHomeView() called successfully');
                    } else if (window.app && window.app.resetHomeView) {
                        window.app.resetHomeView();
                        console.log('✅ window.app.resetHomeView() called successfully');
                    } else {
                        console.warn('⚠️ resetHomeView function not available');
                    }
                    break;
                
                case 'setExploreMode':
                    console.log('🚶 [BRIDGE] Cycling navigation mode (default → easynav → explore)...');
                    // Call the global cycleNavigationMode function to cycle through all 3 modes
                    if (window.cycleNavigationMode) {
                        window.cycleNavigationMode();
                        console.log('✅ cycleNavigationMode() called successfully');
                    } else if (window.toggleExploreMode) {
                        // Fallback for older implementations
                        window.toggleExploreMode();
                        console.log('✅ toggleExploreMode() called successfully (fallback)');
                    } else if (window.app && window.app.exploreManager && window.app.exploreManager.cycleNavigationMode) {
                        window.app.exploreManager.cycleNavigationMode();
                        console.log('✅ app.exploreManager.cycleNavigationMode() called successfully');
                    } else {
                        console.warn('⚠️ Navigation mode cycling not available');
                    }
                    break;
                
                case 'searchPlatforms':
                case 'searchWorld':
                    console.log('🔍 [BRIDGE] Performing search:', event.data.query);
                    // Call activateSearch - the mobile app uses unified search for everything
                    if (window.activateSearchJS) {
                        window.activateSearchJS(event.data.query);
                        console.log('✅ activateSearchJS() called successfully');
                    } else if (window.app && window.app.searchManager && window.app.searchManager.activateSearch) {
                        window.app.searchManager.activateSearch(event.data.query);
                        console.log('✅ app.searchManager.activateSearch() called successfully');
                    } else {
                        console.warn('⚠️ Search functionality not available');
                    }
                    break;
                
                case 'createDemoContent':
                    console.log('🎬 [BRIDGE] Received createDemoContent command from Flutter');
                    
                    // Check if user already has furniture
                    if (window.app && window.app.furnitureManager) {
                        const furnitureCount = window.app.furnitureManager.getAllFurniture().length;
                        console.log('🪑 Existing furniture count:', furnitureCount);
                        
                        if (event.data.config && event.data.config.checkExisting && furnitureCount > 0) {
                            console.log('ℹ️ User already has furniture, skipping demo content creation');
                            // Notify Flutter that content is ready (already exists)
                            if (window.sendToFlutter) {
                                window.sendToFlutter('demoContentReady', {
                                    furnitureCount: furnitureCount,
                                    existingUser: true,
                                    timestamp: Date.now()
                                });
                            }
                            break;
                        }
                        
                        // Trigger default furniture creation
                        if (typeof window.triggerFurnitureCreation === 'function') {
                            console.log('🪑 Calling triggerFurnitureCreation()');
                            window.triggerFurnitureCreation();
                            
                            // Show welcome hints after furniture is created (wait 3 seconds)
                            setTimeout(() => {
                                if (typeof window.showWelcomeHints === 'function') {
                                    window.showWelcomeHints();
                                } else {
                                    console.warn('⚠️ showWelcomeHints not available yet');
                                }
                            }, 3000);
                        } else {
                            console.warn('⚠️ triggerFurnitureCreation not found');
                            // Fallback: notify Flutter anyway to prevent stuck loading state
                            if (window.sendToFlutter) {
                                window.sendToFlutter('demoContentReady', {
                                    furnitureCount: 0,
                                    error: 'triggerFurnitureCreation not found',
                                    timestamp: Date.now()
                                });
                            }
                        }
                    } else {
                        console.warn('⚠️ FurnitureManager not available yet');
                        // Fallback: notify Flutter anyway to prevent stuck loading state
                        if (window.sendToFlutter) {
                            window.sendToFlutter('demoContentReady', {
                                furnitureCount: 0,
                                error: 'FurnitureManager not available',
                                timestamp: Date.now()
                            });
                        }
                    }
                    break;
                
                case 'setGenrePreferences':
                    console.log('🎵 [BRIDGE] Setting genre preferences');
                    if (window.ContentPreferencesService && event.data.genres) {
                        window.ContentPreferencesService.setMusicGenres(event.data.genres);
                        console.log('✅ Genre preferences updated:', event.data.genres);
                    }
                    break;
                
                case 'showHintsAfterPreferences':
                    console.log('💡 [BRIDGE] Received request to show hints after preferences');
                    // Show welcome hints after a brief delay
                    setTimeout(() => {
                        if (typeof window.showWelcomeHints === 'function') {
                            window.showWelcomeHints();
                        } else {
                            console.warn('⚠️ showWelcomeHints not available yet');
                        }
                    }, 1000);
                    break;
                
                case 'refreshRecommendations':
                    console.log('🔄 [BRIDGE] Refreshing recommendations');
                    if (window.dynamicContentGenerator && typeof window.dynamicContentGenerator.refreshAllFurniture === 'function') {
                        window.dynamicContentGenerator.refreshAllFurniture();
                        console.log('✅ Recommendations refresh initiated');
                    } else {
                        console.warn('⚠️ dynamicContentGenerator.refreshAllFurniture not available');
                    }
                    break;
                
                case 'openMediaPreview':
                    console.log('🎬 [BRIDGE] Opening media preview for:', event.data.objectId);
                    if (window.mediaPreviewManager && window.app && window.app.furnitureManager) {
                        const objectMesh = window.app.furnitureManager.findObjectById(event.data.objectId);
                        if (objectMesh) {
                            window.mediaPreviewManager.togglePreview(objectMesh.userData, objectMesh);
                            console.log('✅ Media preview toggled');
                        } else {
                            console.warn('⚠️ Object not found:', event.data.objectId);
                        }
                    } else {
                        console.warn('⚠️ mediaPreviewManager not available');
                    }
                    break;
                
                case 'showFurnitureSelector':
                    console.log('🪑 [BRIDGE] Showing furniture selector from 2D view');
                    // Call the furniture selector UI (if available via HTML UI manager)
                    if (window.uiManager && typeof window.uiManager.showFurnitureSelector === 'function') {
                        window.uiManager.showFurnitureSelector();
                        console.log('✅ Furniture selector shown');
                    } else if (window.showFurnitureCreationDialog) {
                        window.showFurnitureCreationDialog();
                        console.log('✅ showFurnitureCreationDialog() called');
                    } else {
                        console.warn('⚠️ Furniture selector not available');
                    }
                    break;
                
                case 'addLinkToFurniture':
                    console.log('🔗 [BRIDGE] Adding link to furniture:', event.data.furnitureId);
                    const url = event.data.url;
                    const furnitureId = event.data.furnitureId;
                    
                    if (!url || !furnitureId) {
                        console.error('❌ Missing url or furnitureId');
                        break;
                    }
                    
                    // Create link object and add to furniture
                    (async () => {
                        try {
                            console.log('[2D ADD LINK] Creating object from URL:', url);
                            
                            // Create link object
                            if (!window.app || !window.app.urlManager) {
                                throw new Error('URLManager not available');
                            }
                            
                            const newObject = await window.app.urlManager.createLinkFromURL(url);
                            
                            if (!newObject) {
                                throw new Error('Failed to create object from URL');
                            }
                            
                            console.log('[2D ADD LINK] Object created:', newObject.userData.id);
                            
                            // Wait for initialization
                            await new Promise(resolve => setTimeout(resolve, 200));
                            
                            // Add to furniture
                            if (!window.app.furnitureManager) {
                                throw new Error('FurnitureManager not available');
                            }
                            
                            const slotIndex = await window.app.furnitureManager.addObjectToFurniture(
                                furnitureId,
                                newObject.userData.id
                            );
                            
                            if (slotIndex !== -1) {
                                console.log('[2D ADD LINK] Object added at slot:', slotIndex);
                                
                                // Send success message back to Flutter
                                sendToFlutter('linkAddedToFurniture', {
                                    success: true,
                                    furnitureId: furnitureId,
                                    objectId: newObject.userData.id,
                                    slotIndex: slotIndex
                                });
                            } else {
                                throw new Error('Furniture full or failed to add object');
                            }
                        } catch (error) {
                            console.error('[2D ADD LINK] Error:', error);
                            
                            // Send error message back to Flutter
                            sendToFlutter('linkAddedToFurniture', {
                                success: false,
                                error: error.message
                            });
                        }
                    })();
                    break;
                
                case 'removeObjectFromFurniture':
                    console.log('🗑️ [BRIDGE] Removing object from furniture:', event.data.furnitureId, event.data.objectId);
                    const removeFurnitureId = event.data.furnitureId;
                    const removeObjectId = event.data.objectId;
                    
                    if (!removeFurnitureId || !removeObjectId) {
                        console.error('❌ Missing furnitureId or objectId');
                        break;
                    }
                    
                    // Remove object from furniture
                    (async () => {
                        try {
                            if (!window.app || !window.app.furnitureManager) {
                                throw new Error('FurnitureManager not available');
                            }
                            
                            await window.app.furnitureManager.removeObjectFromFurniture(
                                removeFurnitureId,
                                removeObjectId
                            );
                            
                            console.log('✅ [BRIDGE] Object removed from furniture');
                            
                            // Send success message back to Flutter
                            sendToFlutter('objectRemovedFromFurniture', {
                                success: true,
                                furnitureId: removeFurnitureId,
                                objectId: removeObjectId
                            });
                        } catch (error) {
                            console.error('❌ [BRIDGE] Error removing object:', error);
                            
                            // Send error message back to Flutter
                            sendToFlutter('objectRemovedFromFurniture', {
                                success: false,
                                error: error.message
                            });
                        }
                    })();
                    break;
                
                default:
                    console.warn('[BRIDGE] Unknown command from Flutter:', event.data.type);
            }
        }
    });

    // Notify Flutter that iframe is ready
    window.addEventListener('load', function() {
        console.log('🌐 [BROWSER BRIDGE] window.load event fired');
        setTimeout(function() {
            sendToFlutter('worldReady', { ready: true });
            console.log('🌐 Browser Bridge initialized, iframe ready');
            console.log('🌐 [DEBUG] Checking for notifyWorldReady function...');
            console.log('🌐 [DEBUG] typeof window.notifyWorldReady:', typeof window.notifyWorldReady);
            console.log('🌐 [DEBUG] window.notifyWorldReady exists:', !!window.notifyWorldReady);
            
            // Call notifyWorldReady if it exists (triggers demo content injection)
            if (typeof window.notifyWorldReady === 'function') {
                console.log('🚀 Calling notifyWorldReady() to trigger world initialization');
                window.notifyWorldReady();
            } else {
                console.warn('⚠️ window.notifyWorldReady not found - bundle may not have loaded');
                console.warn('🌐 [DEBUG] Available window properties:', Object.keys(window).filter(k => k.includes('notify') || k.includes('World') || k.includes('app')));
            }
            
            // Debug: Check if UI elements exist
            setTimeout(function() {
                console.log('🔍 UI DEBUG: Checking for UI elements...');
                console.log('  App object:', !!window.app);
                console.log('  Scene:', !!window.app?.scene);
                console.log('  Camera:', !!window.app?.camera);
                console.log('  Renderer:', !!window.app?.renderer);
                console.log('  DOM buttons:', document.querySelectorAll('button').length);
                console.log('  Canvas elements:', document.querySelectorAll('canvas').length);
                
                // CRITICAL FIX: HIDE JavaScript UI buttons - Flutter provides all UI
                console.log('🔧 BROWSER MODE: Removing JavaScript UI buttons (Flutter manages UI)...');
                
                // Remove JavaScript's explore button - Flutter provides its own
                if (window.app && window.app.exploreManager && window.app.exploreManager.exploreUI) {
                    const exploreButton = window.app.exploreManager.exploreUI.button;
                    if (exploreButton && exploreButton.remove) {
                        exploreButton.remove();
                        console.log('✅ JavaScript explore button removed (Flutter manages UI)');
                    }
                }
                
                // Remove JavaScript's score button - Flutter provides its own
                const scoreButtons = document.querySelectorAll('#svgEntityScoreDisplay, #gameScoreButton, .score-display');
                scoreButtons.forEach(button => {
                    if (button) {
                        button.remove();
                        console.log('✅ JavaScript score button removed (Flutter manages UI)');
                    }
                });
            }, 2000);
        }, 1000);
    });
    
    // ============================================================================
    // MOCK JAVASCRIPT CHANNELS FOR BROWSER-ONLY MODE
    // ============================================================================
    // In Flutter mode, these channels are created by Flutter's JavascriptChannel API
    // In browser-only mode, we create mock channels that handle persistence locally
    
    // Create ObjectMovedChannel mock if it doesn't exist (Flutter creates it in WebView)
    if (!window.ObjectMovedChannel) {
        window.ObjectMovedChannel = {
            postMessage: function(jsonString) {
                try {
                    const moveData = JSON.parse(jsonString);
                    console.log('💾 [BROWSER] ObjectMovedChannel.postMessage called:', moveData);
                    
                    // Save to localStorage for browser-only persistence
                    saveObjectPosition(moveData);
                    
                    // Also send to Flutter if it exists (hybrid mode)
                    sendToFlutter('objectMoved', moveData);
                } catch (error) {
                    console.error('💾 [BROWSER] Error handling ObjectMovedChannel message:', error);
                }
            }
        };
        console.log('✅ [BROWSER] Created ObjectMovedChannel mock for browser-only mode');
    }
    
    // Create FileObjectDeletedChannel mock if needed
    if (!window.FileObjectDeletedChannel) {
        window.FileObjectDeletedChannel = {
            postMessage: function(jsonString) {
                try {
                    const deleteData = JSON.parse(jsonString);
                    console.log('💾 [BROWSER] FileObjectDeletedChannel.postMessage called:', deleteData);
                    
                    // Remove from localStorage (both positions and link objects)
                    if (deleteData.id) {
                        deleteObjectPosition(deleteData.id);
                        deleteLinkObject(deleteData.id);
                    }
                    
                    // Also send to Flutter if it exists (hybrid mode)
                    sendToFlutter('objectDeleted', deleteData);
                } catch (error) {
                    console.error('💾 [BROWSER] Error handling FileObjectDeletedChannel message:', error);
                }
            }
        };
        console.log('✅ [BROWSER] Created FileObjectDeletedChannel mock for browser-only mode');
    }
    
    // Create LinkObjectAddedChannel mock if needed
    if (!window.LinkObjectAddedChannel) {
        window.LinkObjectAddedChannel = {
            postMessage: function(jsonString) {
                try {
                    const linkData = JSON.parse(jsonString);
                    console.log('💾 [BROWSER] LinkObjectAddedChannel.postMessage called:', linkData);
                    
                    // Save complete link object data to localStorage
                    saveLinkObject(linkData);
                    
                    // Also send to Flutter if it exists (hybrid mode)
                    sendToFlutter('linkObjectAdded', linkData);
                } catch (error) {
                    console.error('💾 [BROWSER] Error handling LinkObjectAddedChannel message:', error);
                }
            }
        };
        console.log('✅ [BROWSER] Created LinkObjectAddedChannel mock for browser-only mode');
    }

    console.log('🌐 Browser Bridge loaded successfully');
})();
