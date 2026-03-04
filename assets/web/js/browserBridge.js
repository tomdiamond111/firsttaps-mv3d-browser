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
                            break;
                        }
                        
                        // Trigger default furniture creation
                        if (typeof window.triggerFurnitureCreation === 'function') {
                            console.log('🪑 Calling triggerFurnitureCreation()');
                            window.triggerFurnitureCreation();
                        } else {
                            console.warn('⚠️ triggerFurnitureCreation not found');
                        }
                    } else {
                        console.warn('⚠️ FurnitureManager not available yet');
                    }
                    break;
                
                case 'setGenrePreferences':
                    console.log('🎵 [BRIDGE] Setting genre preferences');
                    if (window.ContentPreferencesService && event.data.genres) {
                        window.ContentPreferencesService.setMusicGenres(event.data.genres);
                        console.log('✅ Genre preferences updated:', event.data.genres);
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
                
                default:
                    console.warn('[BRIDGE] Unknown command from Flutter:', event.data.type);
            }
        }
    });

    // Notify Flutter that iframe is ready
    window.addEventListener('load', function() {
        setTimeout(function() {
            sendToFlutter('worldReady', { ready: true });
            console.log('🌐 Browser Bridge initialized, iframe ready');
            
            // Call notifyWorldReady if it exists (triggers demo content injection)
            if (typeof window.notifyWorldReady === 'function') {
                console.log('🚀 Calling notifyWorldReady() to trigger world initialization');
                window.notifyWorldReady();
            } else {
                console.warn('⚠️ window.notifyWorldReady not found');
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
            }, 2000);
        }, 1000);
    });

    console.log('🌐 Browser Bridge loaded successfully');
})();
