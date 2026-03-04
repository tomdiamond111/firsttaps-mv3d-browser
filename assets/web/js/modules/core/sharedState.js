// modules/core/sharedState.js
// Dependencies: None (Core module)
// Exports: window.SharedStateManager

(function() {
    'use strict';
    
    console.log("Loading SharedStateManager module...");
    
    // ============================================================================
    // SHARED STATE MANAGEMENT
    // ============================================================================
    class SharedStateManager {
        constructor() {
            this.fileObjects = [];
            this.labelObjectsMap = new Map();
            this.selectedObject = null;
            this.originalMaterial = {};
            this.originalEmissive = {};
            this.movingObject = null;
            this.originalMoveMaterial = null;
            this.isDragging = false;
            this.longPressTimeout = null;
            this.isLongPress = false;
            this.pointerDownStart = 0;
            this.lastTapTime = 0;
            this.lastTapTarget = null;
            this.gridSize = 1.0;
            this.showInfo = true;
            this.showPreview = true;
            this.currentDisplayOptions = { 
                showFileInfo: true, 
                useFaceTextures: true, // Re-enabled to test color assignment
                sortFileObjects: true // Sort File Objects option (default enabled)
            };
            this.selectedObjectForMoveId = null;
            this.isVerticalMoveMode = false; // Flag for vertical-only movement mode
            
            // Touch/mobile specific settings
            this.isTransitioning = false; // Prevents rapid state changes
            this.transitionDelay = 200; // 200ms delay for state transitions
            this.touchStartTime = 0;
            this.touchStartPosition = { x: 0, y: 0 };
            this.touchMoveThreshold = 10; // pixels to consider a drag
            
            // CRITICAL: Loop prevention flags
            this.isProcessingVisuals = false;
            this.processedTextureObjects = new Set(); // Track which objects have been processed for textures
            this.lastVisualsUpdate = 0; // Throttle visuals updates
            this.visualsUpdateInterval = 100; // Only update visuals every 100ms when face textures are active
            
            // Deletion backup system - stores complete object state for restoration
            this.deletedObjectsBackup = new Map(); // Map of object ID to complete state
            this.deletionOrder = []; // Track deletion order for "most recent" functionality
            this.maxDeletedObjects = 10; // Store up to 10 recently deleted objects
            
            // MOVE HISTORY SYSTEM - stores object states before moves for undo functionality
            this.moveHistoryBackup = new Map(); // Map of move ID to complete move state
            this.moveOrder = []; // Track move order for "most recent" functionality
            this.maxStoredMoves = 10; // Store up to 10 most recent moves
            this.currentMoveId = 0; // Incrementing ID for each move operation
            
            // WORLD STATE STORAGE SYSTEM - stores object visual states per world
            this.worldObjectStates = new Map(); // Map of object UUID to world states
            this.currentWorldType = 'green-plane'; // Track current world for state management
        }

        clearSelection() {
            this.selectedObject = null;
            this.selectedObjectForMoveId = null;
            this.isVerticalMoveMode = false; // Reset vertical move mode
            this.isTransitioning = false;
        }

        setMovingObject(object, material) {
            console.log('🔥🔥🔥 setMovingObject() CALLED for:', object?.userData?.fileName || object?.userData?.id);
            console.log('🔥 Has furnitureId?', !!object?.userData?.furnitureId, 'Value:', object?.userData?.furnitureId);
            console.log('🔥 Has slotIndex?', object?.userData?.furnitureSlotIndex !== undefined, 'Value:', object?.userData?.furnitureSlotIndex);
            
            this.movingObject = object;
            this.originalMoveMaterial = material;
            
            // FURNITURE TIMING FIX: Do NOT remove object from furniture at drag start
            // Keep it parented during the drag, let handleObjectMoveEnd() un-parent if needed
            // Only clear the preservePosition flag so object can use stacking/gravity system
            if (object && object.userData) {
                if (object.userData.furnitureId && object.userData.furnitureSlotIndex !== undefined) {
                    console.log(`🪑 [STATE] Object on furniture: ${object.userData.furnitureId}, slot ${object.userData.furnitureSlotIndex} - keeping parented during drag`);
                }
                
                // POSITION PRESERVATION FIX: Clear preservePosition flag so object uses stacking system
                if (object.userData.preservePosition) {
                    console.log(`🛤️ [STATE] Clearing preservePosition flag for movement`);
                    delete object.userData.preservePosition;
                }
            }
        }

        clearMovingObject() {
            this.movingObject = null;
            this.originalMoveMaterial = null;
            this.isDragging = false; // Ensure dragging state is cleared
            this.isVerticalMoveMode = false; // Reset vertical move mode
        }

        startTransition() {
            this.isTransitioning = true;
            setTimeout(() => {
                this.isTransitioning = false;
            }, this.transitionDelay);
        }

        updateDisplayOptions(options) {
            console.log('StateManager: Updating display options:', options);
            console.log('Previous options:', this.currentDisplayOptions);
            
            const previousOptions = { ...this.currentDisplayOptions };
            this.currentDisplayOptions = { ...this.currentDisplayOptions, ...options };
            
            console.log('New options:', this.currentDisplayOptions);
            
            // Check if we have references to apply the changes to existing objects
            if (window.app && window.app.billboardManager) {
                console.log('StateManager: Applying display option changes to existing objects');
                
                // Check if showFileInfo setting changed
                if (previousOptions.showFileInfo !== this.currentDisplayOptions.showFileInfo) {
                    console.log('StateManager: showFileInfo changed to:', this.currentDisplayOptions.showFileInfo);
                    this.refreshAllBillboards();
                }
                
                // Check if useFaceTextures setting changed
                if (previousOptions.useFaceTextures !== this.currentDisplayOptions.useFaceTextures) {
                    console.log('StateManager: useFaceTextures changed to:', this.currentDisplayOptions.useFaceTextures);
                    this.refreshAllFaceTextures();
                }
                
                // Check if sortFileObjects setting changed
                if (previousOptions.sortFileObjects !== this.currentDisplayOptions.sortFileObjects) {
                    console.log('StateManager: sortFileObjects changed to:', this.currentDisplayOptions.sortFileObjects);
                    this.applySortingSettingChange();
                }
            } else {
                console.warn('StateManager: Cannot apply display option changes - window.app.billboardManager not available');
            }
        }
        
        // Refresh all billboards based on current showFileInfo setting
        refreshAllBillboards() {
            console.log('StateManager: Refreshing all billboards, showFileInfo:', this.currentDisplayOptions.showFileInfo);
            
            let billboardCount = 0;
            if (this.currentDisplayOptions.showFileInfo) {
                // Show all billboards (infoLabel)
                this.labelObjectsMap.forEach((attachments, objectUuid) => {
                    if (attachments.infoLabel) {
                        attachments.infoLabel.visible = true;
                        billboardCount++;
                        console.log('StateManager: Showing billboard for object:', objectUuid);
                    }
                });
                console.log(`StateManager: Showed ${billboardCount} billboards`);
            } else {
                // Hide all billboards (infoLabel)
                this.labelObjectsMap.forEach((attachments, objectUuid) => {
                    if (attachments.infoLabel) {
                        attachments.infoLabel.visible = false;
                        billboardCount++;
                        console.log('StateManager: Hiding billboard for object:', objectUuid);
                    }
                });
                console.log(`StateManager: Hid ${billboardCount} billboards`);
            }
            
            // Force a render to make sure changes are visible
            if (window.app && window.app.renderer) {
                window.app.renderer.render(window.app.scene, window.app.camera);
                console.log('StateManager: Forced render after billboard visibility change');
            }
        }
        
        // Refresh all face textures based on current useFaceTextures setting
        refreshAllFaceTextures() {
            console.log('StateManager: Refreshing all face textures, useFaceTextures:', this.currentDisplayOptions.useFaceTextures);
            
            if (!window.app || !window.app.billboardManager) {
                console.warn('StateManager: Cannot refresh face textures - billboardManager not available');
                return;
            }
            
            // Get all file objects
            this.fileObjects.forEach(object => {
                if (!object || !object.userData || !object.userData.fileData) return;
                
                const objectId = object.userData.id || object.userData.fileData.id || object.userData.fileData.path;
                console.log('StateManager: Processing face texture for object:', object.userData.fileData.name);
                
                if (this.currentDisplayOptions.useFaceTextures) {
                    // Apply face textures if enabled
                    console.log('StateManager: Applying face texture to:', object.userData.fileData.name);
                    window.app.billboardManager.updateObjectVisuals(object, object.userData.fileData);
                } else {
                    // Remove face textures if disabled
                    console.log('StateManager: Removing face texture from:', object.userData.fileData.name);
                    this.removeFaceTexture(object);
                }
            });
        }
        
        // Helper method to remove face texture from an object
        removeFaceTexture(object) {
            if (!object || !object.material) return;
            
            console.log('StateManager: Removing face texture from object');
            
            // Get the original base color for this object
            const originalColor = object.userData.originalBaseColor || 
                (window.app && window.app.objectCreator ? 
                    window.app.objectCreator.getColorByExtension(object.userData.fileData?.extension) : 
                    0x888888);
            
            // If object has multi-material (array), restore all materials to base color
            if (Array.isArray(object.material)) {
                console.log('StateManager: Restoring multi-material array to base colors');
                object.material.forEach((mat, index) => {
                    if (mat.map) {
                        mat.map = null;
                        mat.color.setHex(originalColor);
                        mat.needsUpdate = true;
                        console.log(`StateManager: Restored material ${index} to base color:`, originalColor.toString(16));
                    }
                });
            } else {
                // Single material
                console.log('StateManager: Restoring single material to base color');
                if (object.material.map) {
                    object.material.map = null;
                    object.material.color.setHex(originalColor);
                    object.material.needsUpdate = true;
                    console.log('StateManager: Restored single material to base color:', originalColor.toString(16));
                }
            }
            
            // Clear face texture from attachments
            const attachments = this.labelObjectsMap.get(object.uuid);
            if (attachments && attachments.faceTexture) {
                delete attachments.faceTexture;
                this.labelObjectsMap.set(object.uuid, attachments);
                console.log('StateManager: Cleared face texture from attachments');
            }
            
            // Remove from processed objects to allow reprocessing when re-enabled
            this.processedTextureObjects.delete(object.uuid);
            if (object.userData.id) this.processedTextureObjects.delete(object.userData.id);
            if (object.userData.fileData?.id) this.processedTextureObjects.delete(object.userData.fileData.id);
            if (object.userData.fileData?.path) this.processedTextureObjects.delete(object.userData.fileData.path);
            if (object.userData.fileData?.name) this.processedTextureObjects.delete(object.userData.fileData.name);
        }

        // Apply sorting setting change (enable/disable sorting)
        applySortingSettingChange() {
            console.log('StateManager: Applying sorting setting change');
            
            // Check if sorting manager is available
            if (!window.app || !window.app.sortingManager) {
                console.warn('StateManager: Cannot apply sorting setting - sortingManager not available');
                return;
            }
            
            const sortingEnabled = this.currentDisplayOptions.sortFileObjects;
            console.log('StateManager: Sorting enabled:', sortingEnabled);
            
            // Update sorting manager configuration - it handles everything internally
            window.app.sortingManager.updateConfig({ enabled: sortingEnabled });
        }

        // ============================================================================
        // WORLD STATE MANAGEMENT - stores object visual states per world
        // ============================================================================

        // Initialize world state storage for an object
        initializeObjectWorldState(object) {
            if (!object || !object.uuid) return;
            
            // Initialize world states map for this object if it doesn't exist
            if (!this.worldObjectStates.has(object.uuid)) {
                this.worldObjectStates.set(object.uuid, new Map());
            }
            
            // Store current state for current world if not already stored
            const objectStates = this.worldObjectStates.get(object.uuid);
            if (!objectStates.has(this.currentWorldType)) {
                this.storeCurrentObjectState(object, this.currentWorldType);
            }
        }

        // Store current visual state of an object for a specific world
        storeCurrentObjectState(object, worldType) {
            if (!object || !object.uuid) return;
            
            // Update global position manager (XZ global + world Y)
            if (window.globalPositionManager) {
                const currentPosition = {
                    x: object.position.x,
                    y: object.position.y,
                    z: object.position.z
                };
                
                // Check if this is first time seeing this object
                if (!window.globalPositionManager.objectPositions.has(object.uuid)) {
                    window.globalPositionManager.initializeObject(object.uuid, currentPosition, worldType);
                } else {
                    // Update only the Y for this specific world (XZ remains global)
                    window.globalPositionManager.updateWorldY(object.uuid, currentPosition.y, worldType);
                }
            }
            
            const objectStates = this.worldObjectStates.get(object.uuid) || new Map();
            
            // Capture complete visual state (conservative - preserve all existing properties)
            // NOTE: Position is now managed by GlobalPositionManager, but we keep rotation/scale here
            const state = {
                // Material state (handle both single material and material arrays)
                material: Array.isArray(object.material) ? 
                    object.material.map(mat => mat.clone()) : 
                    object.material.clone(),
                
                // Store rotation and scale (position handled by GlobalPositionManager)
                rotation: object.rotation.clone(),
                scale: object.scale.clone(),
                
                // Visual properties
                visible: object.visible,
                castShadow: object.castShadow,
                receiveShadow: object.receiveShadow,
                
                // Preserve existing userData with deep copy for fileData (critical for face textures and file data)
                userData: { 
                    ...object.userData,
                    // Deep copy fileData to preserve thumbnailDataUrl
                    fileData: object.userData.fileData ? { ...object.userData.fileData } : undefined
                },
                
                // Timestamp for debugging
                savedAt: Date.now()
            };
            
            objectStates.set(worldType, state);
            this.worldObjectStates.set(object.uuid, objectStates);
            
            // Get position from GlobalPositionManager for logging (position no longer stored in state)
            const loggedPosition = window.globalPositionManager ? 
                window.globalPositionManager.getPosition(object.uuid, worldType) : 
                { x: object.position.x, y: object.position.y, z: object.position.z };
            
            console.log(`💾 STORE: Stored state for object ${object.userData.fileName} in world ${worldType}:`, {
                hasFileData: !!state.userData.fileData,
                hasThumbnailDataUrl: !!(state.userData.fileData && state.userData.fileData.thumbnailDataUrl),
                thumbnailDataUrlLength: state.userData.fileData && state.userData.fileData.thumbnailDataUrl ? state.userData.fileData.thumbnailDataUrl.length : 0,
                position: { x: loggedPosition.x, y: loggedPosition.y, z: loggedPosition.z },
                originalFileDataThumbnail: !!(object.userData.fileData && object.userData.fileData.thumbnailDataUrl),
                originalThumbnailLength: object.userData.fileData && object.userData.fileData.thumbnailDataUrl ? object.userData.fileData.thumbnailDataUrl.length : 0
            });
        }

        // Restore visual state of an object for a specific world
        restoreObjectState(object, worldType) {
            if (!object || !object.uuid) return false;
            
            // Restore position from GlobalPositionManager (hybrid XZ global + world Y)
            if (window.globalPositionManager) {
                const restoredPosition = window.globalPositionManager.getPosition(object.uuid, worldType);
                if (restoredPosition) {
                    console.log(`🔄 RESTORE POSITION: ${object.userData.fileName} in ${worldType}:`, restoredPosition);
                    // Don't set position yet - let world constraints be applied first
                    // This is handled by worldManagement.js
                }
            }
            
            const objectStates = this.worldObjectStates.get(object.uuid);
            if (!objectStates || !objectStates.has(worldType)) {
                console.log(`❌ RESTORE: No saved visual state found for object ${object.userData.fileName} in world ${worldType}`);
                return false;
            }
            
            const state = objectStates.get(worldType);
            console.log(`🔄 RESTORE: Found saved visual state for ${object.userData.fileName} in world ${worldType}:`, {
                hasFileData: !!state.userData.fileData,
                hasThumbnailDataUrl: !!(state.userData.fileData && state.userData.fileData.thumbnailDataUrl),
                savedAt: state.savedAt
            });
            
            // Restore visual state carefully (preserve critical properties)
            const originalUserData = { ...object.userData };
            
            // Restore material
            object.material = Array.isArray(state.material) ? 
                state.material.map(mat => mat.clone()) : 
                state.material.clone();
            
            // Restore rotation and scale (position handled by GlobalPositionManager)
            object.rotation.copy(state.rotation);
            object.scale.copy(state.scale);
            
            // Restore visual properties
            object.visible = state.visible;
            object.castShadow = state.castShadow;
            object.receiveShadow = state.receiveShadow;
            
            // Carefully merge userData (preserve current file data, restore world-specific data)
            object.userData = {
                ...state.userData,
                ...originalUserData, // Keep current file data and IDs
                // Explicitly preserve critical properties that shouldn't change between worlds
                fileName: originalUserData.fileName,
                id: originalUserData.id,
                // Smart fileData merge: preserve saved thumbnailDataUrl if available
                fileData: {
                    ...originalUserData.fileData,
                    ...(state.userData.fileData && state.userData.fileData.thumbnailDataUrl ? 
                        { thumbnailDataUrl: state.userData.fileData.thumbnailDataUrl } : {})
                }
            };
            
            console.log(`Restored state for object ${object.userData.fileName} to world ${worldType}`);
            return true;
        }

        // Update current world type and handle transitions
        setCurrentWorldType(worldType) {
            if (this.currentWorldType !== worldType) {
                console.log(`World type changing from ${this.currentWorldType} to ${worldType}`);
                this.currentWorldType = worldType;
                
                // Check if this is a premium world and load premium bundle if needed
                const premiumWorlds = ['forest', 'dazzle', 'cave', 'christmas', 'tropical-paradise', 'flower-wonderland'];
                if (premiumWorlds.includes(worldType)) {
                    console.log(`Switching to premium world: ${worldType} - checking premium bundle...`);
                    if (typeof window.ensurePremiumBundle === 'function') {
                        window.ensurePremiumBundle(worldType).then(() => {
                            console.log(`Premium bundle loaded for ${worldType} world`);
                        }).catch(error => {
                            console.error(`Failed to load premium bundle for ${worldType}:`, error);
                        });
                    } else {
                        console.warn('ensurePremiumBundle function not available');
                    }
                }
            }
        }

        // Clean up world states for deleted objects
        cleanupObjectWorldStates(objectUuid) {
            if (this.worldObjectStates.has(objectUuid)) {
                this.worldObjectStates.delete(objectUuid);
                console.log(`Cleaned up world states for object ${objectUuid}`);
            }
        }
        
        // Ensure display options persist across world switches
        preserveDisplayOptionsAcrossWorlds() {
            console.log('StateManager: Preserving display options across world switch');
            console.log('Current display options:', this.currentDisplayOptions);
            
            // The display options should already be preserved since they are stored in this.currentDisplayOptions
            // This method exists to explicitly log the preservation and can be called during world switches
            return this.currentDisplayOptions;
        }


    }

    // Make globally accessible
    window.SharedStateManager = SharedStateManager;
    
    console.log("SharedStateManager module loaded successfully");
})();
