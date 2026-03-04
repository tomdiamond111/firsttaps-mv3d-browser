// worldManagement.js - Move History Management
class AppWorldManager {
    constructor(app) {
        this.app = app;
        console.log('AppWorldManager initialized');
        
        // CRITICAL FIX: Track if this is the initial world switch (to handle premium world initialization)
        this.isInitialSwitch = true;
        this.hasObjectsBeenCreated = false;
    }

    getCurrentWorldType() {
        const result = this.app.currentWorldTemplate ? this.app.currentWorldTemplate.getType() : 'unknown';
        console.log('AppWorldManager.getCurrentWorldType() called - Bundle version: v1704744000');
        console.log('this.app.currentWorldTemplate:', this.app.currentWorldTemplate);
        console.log('Returning world type:', result);
        return result;
    }

    /**
     * ENHANCED: Mark that objects have been created (used for initial switch detection)
     */
    markObjectsCreated() {
        this.hasObjectsBeenCreated = true;
        console.log('🔧 Objects created - future world switches will be normal switches');
    }

    async switchWorldTemplate(newWorldType) {
        console.log('=== SWITCHING WORLD TEMPLATE ===');
        console.log('From:', this.app.currentWorldTemplate ? this.app.currentWorldTemplate.getType() : 'none');
        console.log('To:', newWorldType);
        
        const previousWorldType = this.app.currentWorldTemplate ? this.app.currentWorldTemplate.getType() : null;
        
        // ENHANCED: Use dynamic premium detection system
        console.log(`🔍 DEBUG isPremiumWorld check for "${newWorldType}":`, {
            hasDynamicDetection: !!window.dynamicPremiumDetection,
            hasIsPremiumWorldMethod: !!(window.dynamicPremiumDetection && window.dynamicPremiumDetection.isPremiumWorld),
            fallbackCheck: ['forest', 'dazzle', 'cave', 'christmas', 'desert-oasis', 'tropical-paradise', 'flower-wonderland'].includes(newWorldType)
        });
        
        const isPremiumWorld = window.dynamicPremiumDetection 
            ? window.dynamicPremiumDetection.isPremiumWorld(newWorldType)
            : ['forest', 'dazzle', 'cave', 'christmas', 'desert-oasis', 'tropical-paradise', 'flower-wonderland'].includes(newWorldType); // Fallback
        
        console.log(`🔍 DEBUG isPremiumWorld result for "${newWorldType}": ${isPremiumWorld}`);
        
        const isInitialPremiumSwitch = this.isInitialSwitch && isPremiumWorld && 
                                     (previousWorldType === null || previousWorldType === 'green-plane');
        
        if (isInitialPremiumSwitch) {
            console.log('🔧 INITIAL PREMIUM WORLD SWITCH DETECTED');
            console.log('🔧 This is the app startup switch - face texture preservation will be handled');
        }
        
        // PREMIUM BUNDLE LOADING: Ensure premium bundle is loaded for premium worlds
        if (isPremiumWorld) {
            console.log(`Loading premium bundle for ${newWorldType} world...`);
            if (typeof window.ensurePremiumBundle === 'function') {
                try {
                    await window.ensurePremiumBundle(newWorldType);
                    console.log(`Premium bundle loaded successfully for ${newWorldType}`);
                } catch (error) {
                    console.error(`Failed to load premium bundle for ${newWorldType}:`, error);
                    throw new Error(`Cannot switch to ${newWorldType} world: Premium bundle loading failed`);
                }
            } else {
                console.error('ensurePremiumBundle function not available');
                throw new Error(`Cannot switch to ${newWorldType} world: Premium bundle loader not available`);
            }
        }
        
        // Initialize new world template (now premium bundle is loaded if needed)
        this.app.initializeWorldTemplate(newWorldType);
        
        // CRITICAL FIX: Ensure poster creation is triggered after world template initialization
        // This fixes the issue where initial app load doesn't show poster textures
        console.log(`🖼️ [WORLD-SWITCH] Starting poster creation check for ${newWorldType} world...`);
        console.log(`🐛 [DEBUG] switchWorldTemplate - About to check poster creation for: ${newWorldType}`);
        console.log(`🐛 [DEBUG] switchWorldTemplate - currentWorldTemplate exists:`, !!this.app.currentWorldTemplate);
        console.log(`🐛 [DEBUG] switchWorldTemplate - is poster world:`, ['dazzle', 'christmas'].includes(newWorldType));
        
        if (this.app.currentWorldTemplate && ['dazzle', 'christmas'].includes(newWorldType)) {
            console.log(`🖼️ [WORLD-SWITCH] World template exists, triggering poster creation for ${newWorldType} world...`);
            console.log(`🐛 [DEBUG] switchWorldTemplate - Inside poster creation block for ${newWorldType}`);
            
            // Small delay to ensure world template is fully initialized
            setTimeout(() => {
                console.log(`🐛 [DEBUG] switchWorldTemplate - setTimeout callback executing for ${newWorldType}`);
                console.log(`🐛 [DEBUG] switchWorldTemplate - currentWorldTemplate still exists:`, !!this.app.currentWorldTemplate);
                
                // UNIQUE TEST LOG - should not be filtered
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO WORLD SWITCH POSTER CREATION 🔥🔥🔥');
                
                try {
                    if (newWorldType === 'dazzle' && typeof this.app.currentWorldTemplate.createBedroomPosters === 'function') {
                        console.log('🖼️ [WORLD-SWITCH] Calling createBedroomPosters for dazzle world');
                        console.log('🐛 [DEBUG] switchWorldTemplate - About to call createBedroomPosters()');
                        this.app.currentWorldTemplate.createBedroomPosters();
                        console.log('🐛 [DEBUG] switchWorldTemplate - createBedroomPosters() call completed');
                    } else if (newWorldType === 'christmas' && typeof this.app.currentWorldTemplate.createChristmasPosters === 'function') {
                        console.log('🖼️ [WORLD-SWITCH] Calling createChristmasPosters for christmas world');
                        console.log('🐛 [DEBUG] switchWorldTemplate - About to call createChristmasPosters()');
                        this.app.currentWorldTemplate.createChristmasPosters();
                        console.log('🐛 [DEBUG] switchWorldTemplate - createChristmasPosters() call completed');
                    } else {
                        console.warn(`🖼️ [WORLD-SWITCH] No poster creation method found for ${newWorldType} world template`);
                        console.log(`🖼️ [WORLD-SWITCH] Available methods:`, Object.getOwnPropertyNames(this.app.currentWorldTemplate));
                        console.log(`🐛 [DEBUG] switchWorldTemplate - Method check failed - worldType: ${newWorldType}, createBedroomPosters exists:`, typeof this.app.currentWorldTemplate.createBedroomPosters === 'function', ', createChristmasPosters exists:', typeof this.app.currentWorldTemplate.createChristmasPosters === 'function');
                    }
                } catch (posterError) {
                    console.error(`❌ [WORLD-SWITCH] Error creating posters for ${newWorldType}:`, posterError);
                    console.error(`🐛 [DEBUG] switchWorldTemplate - Poster creation error details:`, posterError.stack);
                }
            }, 100); // Short delay to ensure proper timing
        } else {
            console.warn(`🖼️ [WORLD-SWITCH] No world template or not a poster world: ${newWorldType}`);
            console.log(`🖼️ [WORLD-SWITCH] currentWorldTemplate exists:`, !!this.app.currentWorldTemplate);
            console.log(`🖼️ [WORLD-SWITCH] is poster world:`, ['dazzle', 'christmas'].includes(newWorldType));
            console.log(`🐛 [DEBUG] switchWorldTemplate - Skipping poster creation - template exists: ${!!this.app.currentWorldTemplate}, is poster world: ${['dazzle', 'christmas'].includes(newWorldType)}`);
        }
        
        // Update InteractionManager with new world template reference
        if (this.app.interactionManager) {
            this.app.interactionManager.setWorldTemplate(this.app.currentWorldTemplate);
        }
        
        // Update MoveManager with new world template reference directly
        if (this.app.moveManager) {
            this.app.moveManager.setWorldTemplate(this.app.currentWorldTemplate);
            console.log('MainApplication: Updated moveManager world template directly to:', this.app.currentWorldTemplate.getType());
        }
        
        // Update SortingManager with new world template reference
        if (this.app.sortingManager) {
            this.app.sortingManager.setWorldTemplate(this.app.currentWorldTemplate);
            console.log('MainApplication: Updated sortingManager world template to:', this.app.currentWorldTemplate.getType());
        }
        
        // Update FileObjectManager with new world template reference
        if (this.app.fileObjectManager) {
            this.app.fileObjectManager.setWorldTemplate(this.app.currentWorldTemplate);
        }
        
        // Update state manager with new world type
        if (this.app.stateManager) {
            this.app.stateManager.setCurrentWorldType(newWorldType);
            // Explicitly preserve display options (including sortFileObjects) across world switch
            this.app.stateManager.preserveDisplayOptionsAcrossWorlds();
        }
        
        // PRESERVE SORTING STATE: Ensure sorting setting persists across world switches
        if (this.app.sortingManager && this.app.stateManager) {
            const currentSortingState = this.app.stateManager.currentDisplayOptions.sortFileObjects;
            console.log('WorldManager: Preserving sorting state across world switch:', currentSortingState);
            
            // Update sorting manager config to match current state
            this.app.sortingManager.updateConfig({ enabled: currentSortingState });
            
            // Apply the sorting state to the new world
            if (currentSortingState) {
                console.log('WorldManager: Sorting is enabled - will create zones and sort objects');
                this.app.sortingManager.createZoneVisualIndicators();
            } else {
                console.log('WorldManager: Sorting is disabled - will hide zones');
                this.app.sortingManager.removeZoneVisualIndicators();
            }
        }
        
        // WORLD STATE SYSTEM: Transform existing objects to new world
        if (this.app.stateManager && this.app.stateManager.fileObjects.length > 0) {
            console.log(`Transforming ${this.app.stateManager.fileObjects.length} objects to world: ${newWorldType}`);
            
            // Detect transition from non-gravity worlds to green-plane (for stacking preservation)
            const isEnteringStackingFromOcean = (previousWorldType === 'ocean' && newWorldType === 'green-plane');
            const isEnteringStackingFromSpace = (previousWorldType === 'space' && newWorldType === 'green-plane');
            
            // Detect transition from green-plane to non-gravity worlds (for preserving stacked Y positions)
            const isEnteringOceanFromStacking = (previousWorldType === 'green-plane' && newWorldType === 'ocean');
            const isEnteringSpaceFromStacking = (previousWorldType === 'green-plane' && newWorldType === 'space');
            
            // Process all objects with face texture restoration
            const objectTransformPromises = this.app.stateManager.fileObjects.map(async (object) => {
                console.log(`Processing object: ${object.userData.fileName || 'unknown'} for world ${newWorldType}`);
                
                // FURNITURE PRESERVATION: For furniture-seated objects, preserve their elevated Y position
                // when transitioning between any worlds (not just ocean/space)
                const isFurnitureSeated = object.userData.furnitureSlotId || object.userData.preservePosition;
                if (isFurnitureSeated && previousWorldType) {
                    console.log(`🪑 Furniture-seated object detected: ${object.userData.fileName}, preserving Y=${object.position.y.toFixed(2)}`);
                    object.userData.preserveFurnitureYAcrossWorlds = true;
                    object.userData.furniturePreservedY = object.position.y;
                }
                
                // Store current state before switching (if not already stored)
                if (previousWorldType) {
                    console.log(`📦 Storing current state for ${object.userData.fileName} in world ${previousWorldType} before switch`);
                    console.log(`📦 Current thumbnailDataUrl exists: ${!!(object.userData.fileData && object.userData.fileData.thumbnailDataUrl)}`);
                    this.app.stateManager.storeCurrentObjectState(object, previousWorldType);
                }
                
                // Set transition flags to skip circular support checking when entering from non-gravity worlds
                if (isEnteringStackingFromOcean) {
                    object.userData.isEnteringStackingFromOcean = true;
                    console.log(`🌊 Set isEnteringStackingFromOcean flag for ${object.userData.fileName}`);
                }
                if (isEnteringStackingFromSpace) {
                    object.userData.isEnteringStackingFromSpace = true;
                    console.log(`🚀 Set isEnteringStackingFromSpace flag for ${object.userData.fileName}`);
                }
                
                // Set reverse flags to preserve stacked Y positions when entering ocean/space from green-plane
                if (isEnteringOceanFromStacking) {
                    object.userData.isEnteringOceanFromStacking = true;
                    // Store the current Y position from green-plane for preservation
                    object.userData.stackedYFromGreenPlane = object.position.y;
                    console.log(`🟢→🌊 Set isEnteringOceanFromStacking flag for ${object.userData.fileName}, preserving Y=${object.position.y}`);
                }
                if (isEnteringSpaceFromStacking) {
                    object.userData.isEnteringSpaceFromStacking = true;
                    // Store the current Y position from green-plane for preservation
                    object.userData.stackedYFromGreenPlane = object.position.y;
                    console.log(`🟢→🚀 Set isEnteringSpaceFromStacking flag for ${object.userData.fileName}, preserving Y=${object.position.y}`);
                }
                
                // Get position from GlobalPositionManager (hybrid XZ global + world Y)
                let targetPosition = { x: object.position.x, y: object.position.y, z: object.position.z };
                
                if (window.globalPositionManager) {
                    const globalPos = window.globalPositionManager.getPosition(object.uuid, newWorldType);
                    if (globalPos) {
                        targetPosition = globalPos;
                        console.log(`📍 Retrieved global position for ${object.userData.fileName} in ${newWorldType}:`, targetPosition);
                    } else {
                        // First time in this world - initialize with current position
                        window.globalPositionManager.initializeObject(object.uuid, targetPosition, newWorldType);
                        console.log(`📍 Initialized new position for ${object.userData.fileName} in ${newWorldType}`);
                    }
                }
                
                // Override Y position if transitioning from green-plane with stacked objects to preserve stacking
                if ((isEnteringOceanFromStacking || isEnteringSpaceFromStacking) && object.userData.stackedYFromGreenPlane !== undefined) {
                    targetPosition.y = object.userData.stackedYFromGreenPlane;
                    console.log(`🟢→🌊 Preserving stacked Y position for ${object.userData.fileName}: Y=${targetPosition.y.toFixed(2)}`);
                }
                
                // Try to restore saved state for new world first (visual properties, NOT position)
                const restored = this.app.stateManager.restoreObjectState(object, newWorldType);
                
                // ALWAYS apply world-specific position constraints after restoration
                // This ensures objects conform to new world's physics (e.g., ground plane constraints)
                let constrainedPosition;
                
                if (this.app.currentWorldTemplate) {
                    console.log(`Applying world constraints for ${object.userData.fileName || 'unknown'} - Target position:`, targetPosition);
                    
                    // Get all objects INCLUDING furniture slot markers for stacking support detection
                    const allObjects = this.getAllObjectsIncludingFurnitureMarkers();
                    
                    // Special handling for green-plane world to ensure stacking is preserved
                    if (newWorldType === 'green-plane') {
                        // For green plane, use full stacking logic that considers other objects AND furniture markers
                        try {
                            constrainedPosition = this.app.currentWorldTemplate.applyPositionConstraints(
                                object, 
                                targetPosition, 
                                allObjects  // Pass all objects + furniture markers for stacking calculations
                            );
                            if (constrainedPosition) {
                                console.log(`Green plane: Applied stacking-aware constraints Y=${constrainedPosition.y.toFixed(2)}`);
                            } else {
                                console.warn(`⚠️ applyPositionConstraints returned undefined for ${object.userData.fileName}`);
                            }
                        } catch (error) {
                            console.error(`❌ Error applying constraints:`, error);
                            constrainedPosition = null;
                        }
                    } else {
                        // Apply world transition constraints to handle Y-position boundary enforcement
                        if (window.BackupRestoreManager && window.BackupRestoreManager.applyWorldTransitionConstraints) {
                            constrainedPosition = window.BackupRestoreManager.applyWorldTransitionConstraints(
                                targetPosition, 
                                newWorldType, 
                                object.userData.fileName || 'unknown'
                            );
                            console.log(`World transition constraints result:`, constrainedPosition);
                        } else {
                            // Fallback to basic world constraints
                            try {
                                constrainedPosition = this.app.currentWorldTemplate.applyPositionConstraints(
                                    object, 
                                    targetPosition, 
                                    allObjects  // Use combined array with furniture markers
                                );
                                console.log(`Basic world constraints result:`, constrainedPosition);
                            } catch (error) {
                                console.error(`❌ Error applying constraints:`, error);
                                constrainedPosition = null;
                            }
                        }
                    }
                }
                
                // If no constrainedPosition yet, apply fallback logic
                if (!constrainedPosition) {
                    console.warn(`⚠️ No constrained position available, using fallback for ${object.userData.fileName}`);
                    // Fallback: Use BackupRestoreManager constraints or just clamp position
                    if (window.BackupRestoreManager && window.BackupRestoreManager.applyWorldTransitionConstraints) {
                        constrainedPosition = window.BackupRestoreManager.applyWorldTransitionConstraints(
                            targetPosition, 
                            newWorldType, 
                            object.userData.fileName || 'unknown'
                        );
                    } else {
                        // Ultimate fallback - just ensure Y >= 0.01 for green-plane
                        constrainedPosition = { ...targetPosition };
                        if (newWorldType === 'green-plane' && constrainedPosition.y < 0.01) {
                            constrainedPosition.y = 1.265625; // Default object height
                            console.log(`Fallback: Adjusted Y from ${targetPosition.y} to ${constrainedPosition.y} for green-plane`);
                        }
                    }
                }
                
                if (constrainedPosition) {
                    // Apply the constrained position to the object
                    object.position.set(constrainedPosition.x, constrainedPosition.y, constrainedPosition.z);
                    
                    // Clear transition flags after constraints are applied
                    if (object.userData.isEnteringStackingFromOcean) {
                        delete object.userData.isEnteringStackingFromOcean;
                        console.log(`🌊 Cleared isEnteringStackingFromOcean flag for ${object.userData.fileName}`);
                    }
                    if (object.userData.isEnteringStackingFromSpace) {
                        delete object.userData.isEnteringStackingFromSpace;
                        console.log(`🚀 Cleared isEnteringStackingFromSpace flag for ${object.userData.fileName}`);
                    }
                    
                    // Clear reverse transition flags after constraints are applied
                    if (object.userData.isEnteringOceanFromStacking) {
                        delete object.userData.isEnteringOceanFromStacking;
                        delete object.userData.stackedYFromGreenPlane;  // Also clear the preserved Y value
                        console.log(`🟢→🌊 Cleared isEnteringOceanFromStacking flag for ${object.userData.fileName}`);
                    }
                    if (object.userData.isEnteringSpaceFromStacking) {
                        delete object.userData.isEnteringSpaceFromStacking;
                        delete object.userData.stackedYFromGreenPlane;  // Also clear the preserved Y value
                        console.log(`🟢→🚀 Cleared isEnteringSpaceFromStacking flag for ${object.userData.fileName}`);
                    }
                    
                    // Update GlobalPositionManager with the constrained Y for this world
                    // This preserves the world-specific Y (e.g., ground level in Green Plane)
                    if (window.globalPositionManager) {
                        window.globalPositionManager.updateWorldY(object.uuid, constrainedPosition.y, newWorldType);
                        console.log(`📍 Updated world Y for ${object.userData.fileName} in ${newWorldType}: Y=${constrainedPosition.y.toFixed(2)}`);
                    }
                    
                    // Store the transformed state for future use (after constraints applied)
                    this.app.stateManager.storeCurrentObjectState(object, newWorldType);
                }
                
                // CRITICAL: Restore face textures and visual properties after world switch
                const fileData = object.userData.fileData;
                if (fileData) {
                    // Update file data position to match object position
                    fileData.x = object.position.x;
                    fileData.y = object.position.y;
                    fileData.z = object.position.z;
                    
                    // FACE TEXTURE PRESERVATION: Ensure thumbnailDataUrl is preserved in fileData
                    // Check if we have saved thumbnail data from the visual state
                    // console.log(`🔍 FACE TEXTURE DEBUG: Checking saved state for ${object.userData.fileName}`);
                    // console.log(`🔍 Current fileData thumbnailDataUrl exists: ${!!(fileData.thumbnailDataUrl)}`);
                    // console.log(`🔍 Current fileData thumbnailDataUrl length: ${fileData.thumbnailDataUrl ? fileData.thumbnailDataUrl.length : 0}`);
                    const objectStates = this.app.stateManager.worldObjectStates.get(object.uuid);
                    // console.log(`🔍 Object states exist: ${!!objectStates}`);
                    if (objectStates) {
                        // console.log(`🔍 Available worlds in state:`, Array.from(objectStates.keys()));
                        // console.log(`🔍 Looking for world: ${newWorldType}`);
                    }
                    
                    if (objectStates && objectStates.has(newWorldType)) {
                        const savedState = objectStates.get(newWorldType);
                        // console.log(`🔍 Found saved state for ${newWorldType}:`, {
                        //     hasThumbnailDataUrl: !!savedState.thumbnailDataUrl,
                        //     hasFileData: !!savedState.fileData,
                        //     fileDataHasThumbnail: !!(savedState.fileData && savedState.fileData.thumbnailDataUrl)
                        // });
                        
                        if (savedState.thumbnailDataUrl && !fileData.thumbnailDataUrl) {
                            console.log(`✅ Restoring thumbnailDataUrl to fileData for ${object.userData.fileName}`);
                            fileData.thumbnailDataUrl = savedState.thumbnailDataUrl;
                        }
                        if (savedState.fileData && savedState.fileData.thumbnailDataUrl && !fileData.thumbnailDataUrl) {
                            console.log(`✅ Restoring thumbnailDataUrl from saved fileData for ${object.userData.fileName}`);
                            fileData.thumbnailDataUrl = savedState.fileData.thumbnailDataUrl;
                        }
                    } else {
                        console.log(`❌ No saved state found for ${object.userData.fileName} in world ${newWorldType}`);
                    }
                    
                    // Face textures persist independently of world transitions - no restoration needed
                    console.log(`Face textures preserved during world switch for ${object.userData.fileName}`);
                    
                    // Re-apply proper color if no face texture is used
                    if (!this.app.stateManager.currentDisplayOptions.useFaceTextures && window.getColorByExtensionForCanvas) {
                        const fileExtension = fileData.name ? fileData.name.split('.').pop().toLowerCase() : 'unknown';
                        const color = window.getColorByExtensionForCanvas(fileExtension);
                        if (object.material && color) {
                            object.material.color.setHex(parseInt(color.replace('#', ''), 16));
                        }
                    }
                }
            });
            
            // Wait for all object transformations to complete
            await Promise.all(objectTransformPromises);
            
            // APPLY SORTING AFTER WORLD SWITCH: If sorting is enabled, sort objects into zones
            // CRITICAL: Skip sorting when returning from non-gravity worlds to preserve stacked positions
            if (this.app.sortingManager && this.app.stateManager) {
                const sortingEnabled = this.app.stateManager.currentDisplayOptions.sortFileObjects;
                const nonGravityWorlds = ['ocean', 'space'];
                const hasGravity = !nonGravityWorlds.includes(newWorldType);
                const comingFromNonGravityWorld = previousWorldType && nonGravityWorlds.includes(previousWorldType);
                
                console.log('WorldManager: Post-world-switch sorting check - enabled:', sortingEnabled, 'hasGravity:', hasGravity, 'fromNonGravity:', comingFromNonGravityWorld);
                
                if (sortingEnabled && hasGravity && !comingFromNonGravityWorld) {
                    console.log('WorldManager: Applying sorting to objects in new world');
                    // Small delay to ensure all transformations are visually complete
                    setTimeout(() => {
                        this.app.sortingManager.sortObjectsIntoZones();
                    }, 100);
                } else if (sortingEnabled && hasGravity && comingFromNonGravityWorld) {
                    console.log('🌊→🟢 WorldManager: Skipping re-sort when returning from ocean/space - preserving object positions/stacks');
                }
            }
        }
        
        // APPLY GRAVITY FOR GRAVITY-BASED WORLDS: Ensure objects are properly grounded when re-entering from home screen
        // Skip gravity for non-gravity worlds (ocean/space) to allow free floating
        const nonGravityWorlds = ['ocean', 'space', 'forest'];
        const shouldApplyGravity = !nonGravityWorlds.includes(newWorldType);
        
        if (shouldApplyGravity && this.app.stateManager && this.app.stateManager.fileObjects.length > 0) {
            console.log(`WorldManager: Applying gravity to ${this.app.stateManager.fileObjects.length} objects in ${newWorldType} world`);
            
            // Clear preservePosition flags for contact objects BEFORE applying gravity
            // This allows contacts to obey gravity in the new world while preserving positions within the same world
            console.log(`WorldManager: Clearing preservePosition flags for world switch to ${newWorldType}`);
            this.clearPreservePositionForWorldSwitch(this.app.stateManager.fileObjects);
            
            if (typeof window.applyGravityToFloatingObjects === 'function') {
                window.applyGravityToFloatingObjects();
            } else {
                console.warn('WorldManager: applyGravityToFloatingObjects function not available');
            }
        } else if (!shouldApplyGravity) {
            console.log(`WorldManager: Skipping gravity application for non-gravity world: ${newWorldType}`);
        }
        
        // Notify PathManager about world switch
        if (this.app.pathManager && typeof this.app.pathManager.onWorldSwitch === 'function') {
            console.log(`WorldManager: Notifying PathManager of world switch to ${newWorldType}`);
            await this.app.pathManager.onWorldSwitch(newWorldType);
        }
        
        // Notify FurnitureManager about world switch
        if (this.app.furnitureManager && typeof this.app.furnitureManager.onWorldSwitch === 'function') {
            console.log(`WorldManager: Notifying FurnitureManager of world switch to ${newWorldType}`);
            await this.app.furnitureManager.onWorldSwitch(newWorldType);
        }
        
        // Apply new world's camera constraints
        if (this.app.cameraControls) {
            this.app.currentWorldTemplate.applyCameraConstraints(this.app.cameraControls);
            // Re-apply landscape-aware camera controls after world switch
            this.app.applyLandscapeAwareCameraControls();
        }
        
        // Reset to new world's home view
        this.app.resetHomeView();
        
        // Force re-render to show changes
        if (this.app.renderer && this.app.scene && this.app.camera) {
            this.app.renderer.render(this.app.scene, this.app.camera);
        }
        
        // Display any world transition warnings to the user
        if (window.BackupRestoreManager && window.BackupRestoreManager.displayWorldTransitionWarnings) {
            setTimeout(() => {
                window.BackupRestoreManager.displayWorldTransitionWarnings();
            }, 500); // Brief delay to let the render complete
        }
        
        // Update Forest World Integration System for new world type
        if (window.forestIntegration) {
            window.forestIntegration.setWorldType(newWorldType);
        }
        
        // CRITICAL FIX: Mark initial switch as complete
        if (this.isInitialSwitch) {
            this.isInitialSwitch = false;
            console.log('🔧 Initial world switch completed - future switches will be normal');
        }

        console.log('World template switched successfully');
    }

    /**
     * Get all objects including furniture slot markers for stacking support detection
     * @returns {Array} Combined array of file objects and furniture markers
     */
    getAllObjectsIncludingFurnitureMarkers() {
        const objects = [...this.app.stateManager.fileObjects];
        if (window.shouldLog && window.shouldLog('furnitureSlots')) {
            console.log(`📐 getAllObjectsIncludingFurnitureMarkers called - starting with ${objects.length} file objects`);
        }
        
        // Add furniture slot markers if furniture manager exists
        if (this.app.furnitureManager && this.app.furnitureManager.visualManager) {
            const furnitureMarkers = this.app.furnitureManager.visualManager.getAllSlotMarkers();
            if (furnitureMarkers.length > 0) {
                objects.push(...furnitureMarkers);
                if (window.shouldLog && window.shouldLog('furnitureSlots')) {
                    console.log(`📐 Added ${furnitureMarkers.length} furniture slot markers for stacking support`);
                }
            } else {
                if (window.shouldLog && window.shouldLog('furnitureSlots')) {
                    console.log(`📐 No furniture markers found (furniture exists but no slots)`);
                }
            }
        } else {
            console.log(`📐 Furniture manager not available:`, {
                hasFurnitureManager: !!this.app.furnitureManager,
                hasVisualManager: !!(this.app.furnitureManager && this.app.furnitureManager.visualManager)
            });
        }
        
        // ALSO collect world template markers (e.g., panel nooks, columns, platforms)
        const worldTemplateMarkers = [];
        this.app.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSlotMarker === true && obj.userData.templateObject === true) {
                worldTemplateMarkers.push(obj);
            }
        });
        
        if (worldTemplateMarkers.length > 0) {
            objects.push(...worldTemplateMarkers);
            console.log(`📐 Added ${worldTemplateMarkers.length} world template markers (panel nooks, columns, etc.)`);
        }
        
        console.log(`📐 Returning ${objects.length} total objects for constraint checking`);
        return objects;
    }

    // ============================================================================
    // MOVE HISTORY SYSTEM - Visual state capture for undo functionality
    // ============================================================================

    // Capture complete visual state of an object for backup/restore
    captureObjectVisualState(object) {
        console.log('Capturing visual state for object:', object.userData.fileName);
        console.log('Current object position:', {x: object.position.x, y: object.position.y, z: object.position.z});
        
        // Check if this is a path group or other object without geometry/material
        const isPathGroup = object.userData && object.userData.isPath && !object.geometry;
        
        const state = {
            // Basic properties - capture CURRENT position (may be moved position)
            position: {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z
            },
            // Geometry information - handle Groups without geometry
            geometry: {
                type: object.geometry ? object.geometry.type : 'Group',
                parameters: object.geometry?.parameters ? { ...object.geometry.parameters } : {}
            },
            // Material information - handle both single material and multi-material arrays
            material: {
                isArray: object.material ? Array.isArray(object.material) : false,
                materials: []
            },
            // User data
            userData: { ...object.userData },
            // Visual attachments from billboard manager
            attachments: null
        };

        // Capture material(s) - handle both single and multi-material, and objects without materials
        if (!object.material) {
            console.log('Object has no material property (Group object)');
        } else if (Array.isArray(object.material)) {
            // Multi-material array (with face textures)
            state.material.materials = object.material.map(mat => ({
                type: mat.type,
                color: mat.color ? mat.color.getHex() : 0x888888,
                transparent: mat.transparent,
                opacity: mat.opacity,
                metalness: mat.metalness,
                roughness: mat.roughness,
                hasTexture: !!mat.map,
                textureDataUrl: mat.map && mat.map.image ? mat.map.image.src : null
            }));
        } else {
            // Single material
            state.material.materials.push({
                type: object.material.type,
                color: object.material.color ? object.material.color.getHex() : 0x888888,
                transparent: object.material.transparent,
                opacity: object.material.opacity,
                metalness: object.material.metalness,
                roughness: object.material.roughness,
                hasTexture: !!object.material.map,
                textureDataUrl: object.material.map && object.material.map.image ? object.material.map.image.src : null
            });
        }

        // Capture face texture attachment info
        const attachments = this.app.stateManager.labelObjectsMap.get(object.uuid);
        if (attachments) {
            state.attachments = {
                hasInfoLabel: !!attachments.infoLabel,
                hasFaceTexture: !!attachments.faceTexture && attachments.faceTexture !== 'PROCESSING',
                // Store the actual face texture data for restoration
                faceTextureInfo: attachments.faceTexture && attachments.faceTexture !== 'PROCESSING' ? {
                    type: 'face_texture',
                    hasTexture: true
                } : null
            };
        }

        // CRITICAL: Capture ALL necessary data for face texture restoration
        state.thumbnailDataUrl = object.userData.thumbnailDataUrl;
        state.fileData = object.userData.fileData;
        state.originalBaseColor = object.userData.originalBaseColor; // Preserve stored base color
        
        // Normalize extension to ensure it has dot prefix for color matching
        let rawExtension = object.userData.extension || (object.userData.fileData && object.userData.fileData.extension);
        if (rawExtension && !rawExtension.startsWith('.')) {
            rawExtension = '.' + rawExtension;
        }
        state.extension = rawExtension;
        
        console.log('Visual state captured:', state);
        console.log('Visual state captured with thumbnail data:', !!state.thumbnailDataUrl);
        console.log('Visual state captured with fileData:', !!state.fileData);
        console.log('Visual state captured with originalBaseColor:', state.originalBaseColor ? state.originalBaseColor.toString(16) : 'none');
        console.log('Visual state captured with extension:', state.extension);
        
        return state;
    }

    // Find all objects that depend on (are stacked on) the given object
    findStackedDependencies(baseObject) {
        const dependencies = [];
        const basePos = baseObject.position;
        const tolerance = 0.1; // Position tolerance for stacking detection
        
        // Check all objects to see if they're stacked on top of the base object
        this.app.stateManager.fileObjects.forEach(obj => {
            if (obj === baseObject) return; // Skip the base object itself
            
            // Check if object is directly above the base object
            if (Math.abs(obj.position.x - basePos.x) < tolerance &&
                Math.abs(obj.position.z - basePos.z) < tolerance &&
                obj.position.y > basePos.y) {
                dependencies.push(obj);
                console.log(`Found stacked dependency: ${obj.userData.fileName} on ${baseObject.userData.fileName}`);
            }
        });
        
        return dependencies;
    }

    // Capture complete move state before a move operation begins
    captureMoveHistoryState(primaryObject) {
        console.log('=== CAPTURING MOVE HISTORY STATE ===');
        console.log('Primary object:', primaryObject.userData.fileName);
        
        // Generate unique move ID
        const moveId = `move_${this.app.stateManager.currentMoveId++}`;
        
        // Find all objects that will be affected by this move (stacked dependencies)
        const affectedObjects = this.findStackedDependencies(primaryObject);
        affectedObjects.unshift(primaryObject); // Add primary object at the beginning
        
        console.log('Objects affected by move:', affectedObjects.length);
        affectedObjects.forEach((obj, index) => {
            console.log(`  ${index}: ${obj.userData.fileName} at position (${obj.position.x}, ${obj.position.y}, ${obj.position.z})`);
        });
        
        // Capture state of all affected objects
        const moveState = {
            moveId: moveId,
            timestamp: Date.now(),
            primaryObjectId: primaryObject.userData.id,
            affectedObjects: affectedObjects.map(obj => ({
                objectId: obj.userData.id,
                visualState: this.captureObjectVisualState(obj),
                fileData: obj.userData.fileData
            }))
        };
        
        // Store in move history with limit
        this.app.stateManager.moveHistoryBackup.set(moveId, moveState);
        this.app.stateManager.moveOrder.push(moveId);
        
        // Limit to maximum stored moves
        if (this.app.stateManager.moveHistoryBackup.size > this.app.stateManager.maxStoredMoves) {
            const oldestMoveId = this.app.stateManager.moveOrder.shift();
            this.app.stateManager.moveHistoryBackup.delete(oldestMoveId);
        }
        
        console.log('Move history captured for move ID:', moveId);
        console.log('Total stored moves:', this.app.stateManager.moveHistoryBackup.size);
        console.log('=== MOVE HISTORY CAPTURE COMPLETE ===');
        
        return moveId;
    }
    
    /**
     * Clear preservePosition flags for contact objects when switching between world types
     * This allows contacts to obey gravity in the new world while preserving positions within the same world
     */
    clearPreservePositionForWorldSwitch(allObjects) {
        if (!Array.isArray(allObjects)) return;
        
        const currentWorldType = this.app?.currentWorldTemplate?.getType();
        
        allObjects.forEach(obj => {
            if (obj.userData && obj.userData.preservePosition && 
                (obj.userData.subType === 'contact' || obj.userData.isContact || 
                 (obj.userData.id && obj.userData.id.startsWith('contact://')))) {
                
                // Only clear preservePosition if it was set in a different world type
                const preservedWorldType = obj.userData.preservePositionWorldType;
                if (!preservedWorldType || preservedWorldType !== currentWorldType) {
                    console.log(`WorldManager: Clearing preservePosition for contact object (world changed from ${preservedWorldType} to ${currentWorldType}): ${obj.userData?.fileName || obj.userData?.name}`);
                    obj.userData.preservePosition = false;
                    
                    // Update the world type to current
                    obj.userData.preservePositionWorldType = currentWorldType;
                    
                    // Also clear the lastManualPosition timestamp to indicate this is a world change
                    if (obj.userData.lastManualPosition) {
                        obj.userData.lastManualPosition.worldChangeTimestamp = Date.now();
                    }
                } else {
                    console.log(`WorldManager: Preserving position for contact object (same world type ${currentWorldType}): ${obj.userData?.fileName || obj.userData?.name}`);
                }
            }
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppWorldManager };
} else {
    window.AppWorldManager = AppWorldManager;
}
