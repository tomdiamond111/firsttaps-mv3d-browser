/**
 * FileObjectManager Module
 * Handles creation, deletion, and management of file objects in the 3D scene
 */

(function() {
    'use strict';
    
    class FileObjectManager {
        constructor(dependencies = {}) {
            this.scene = dependencies.scene;
            this.stateManager = dependencies.stateManager;
            this.objectCreator = dependencies.objectCreator;
            this.objectPositioner = dependencies.objectPositioner;
            this.billboardManager = dependencies.billboardManager;
            this.interactionManager = dependencies.interactionManager;
            this.renderer = dependencies.renderer;
            this.camera = dependencies.camera;
            this.cameraControls = dependencies.cameraControls;
            this.virtualObjectManager = dependencies.virtualObjectManager;
            this.currentWorldTemplate = null;
            this.THREE = window.THREE;
            
            // Backup storage for deleted objects (for undo functionality)
            this.deletedObjectsBackup = new Map();
            
            console.log('FileObjectManager initialized');
        }
        
        /**
         * Set the current world template reference
         */
        setWorldTemplate(worldTemplate) {
            this.currentWorldTemplate = worldTemplate;
        }
        
        /**
         * Create file objects from JSON data
         */
        createFileObjects(filesJson) {
            console.log('Creating file objects:', filesJson);
            
            // SUPPRESS NOTIFICATIONS: Set flag during object restoration from Flutter persistence
            // This prevents snackbar spam when app reloads with link objects
            const wasRestoringInProgress = window._worldRestorationInProgress;
            window._worldRestorationInProgress = true;
            console.log('🔄 [RESTORE] Starting object restoration from Flutter - notifications suppressed');
            console.log('🔄 [RESTORE] Flag check: window._worldRestorationInProgress =', window._worldRestorationInProgress);
            console.log('🔄 [RESTORE] Flag check: window._firstInstallInProgress =', window._firstInstallInProgress);
            
            // Clear the flag after all async operations complete (with delay for safety)
            setTimeout(() => {
                window._worldRestorationInProgress = wasRestoringInProgress || false;
                console.log('🔄 [RESTORE] Object restoration complete - notifications re-enabled');
            }, 2000); // 2 second delay to ensure all link objects finish loading
            
            // FURNITURE SEATING DIAGNOSTIC: Log files with furniture metadata
            if (window.FileObjectDebugChannel) {
                const filesWithFurniture = filesJson.filter(f => f.furnitureId);
                if (filesWithFurniture.length > 0) {
                    filesWithFurniture.forEach(f => {
                        window.FileObjectDebugChannel.postMessage(`📥 createFileObjects received: "${f.name}" with furnitureId="${f.furnitureId}", slotIndex=${f.furnitureSlotIndex}`);
                    });
                }
            }
            
            // CONTACT DELETION PERSISTENCE: Ensure deletion tracking is initialized
            if (!window.deletedContactIds) {
                window.deletedContactIds = new Set();
                // Load from localStorage if available
                try {
                    const stored = localStorage.getItem('deletedContactIds');
                    if (stored) {
                        const deletedArray = JSON.parse(stored);
                        deletedArray.forEach(id => window.deletedContactIds.add(id));
                        console.log(`📱 DELETION FILTER: Loaded ${deletedArray.length} deleted contact IDs from storage`);
                    }
                } catch (error) {
                    console.error('📱 DELETION FILTER: Error loading deleted contacts from storage:', error);
                }
            }
            
            this.clearFileObjects();
            
            if (!Array.isArray(filesJson) || filesJson.length === 0) {
                console.log('No files to create objects for');
                return;
            }
            
            // Separate regular files from app objects
            const regularFiles = [];
            const appObjects = [];
            
            filesJson.forEach((fileData) => {
                if (fileData.extension === 'app' || fileData.type === 'app') {
                    appObjects.push(fileData);
                } else {
                    regularFiles.push(fileData);
                }
            });
            
            // Handle regular files
            regularFiles.forEach((fileData, index) => {
                try {
                    // CONTACT DELETION PERSISTENCE: Check if this is a deleted contact before creating
                    if (fileData.extension === '.contact') {
                        // Get contact manager for deletion check
                        const contactManager = window.app && window.app.contactManager;
                        const contactName = fileData.name ? fileData.name.replace('.contact', '') : 'Unknown';
                        const contactData = {
                            id: fileData.id,
                            name: contactName,
                            phoneNumber: fileData.cameraModel || fileData.dateTimeOriginal || 'Unknown'
                        };
                        
                        // Skip deletion checks during restoration
                        if (!window.isRestoringFromBackup) {
                            // Try using ContactManager's isContactDeleted method first
                            if (contactManager && typeof contactManager.isContactDeleted === 'function') {
                                if (contactManager.isContactDeleted(contactData)) {
                                    console.log(`📱 DELETION FILTER: Skipping deleted contact during file creation: ${contactName} (ID: ${fileData.id})`);
                                    return; // Skip creating this deleted contact
                                }
                            } 
                            // Fallback: Check global deletion state directly
                            else if (window.deletedContactIds) {
                                const isDeleted = window.deletedContactIds.has(contactData.id) ||
                                                window.deletedContactIds.has(contactData.phoneNumber) ||
                                                window.deletedContactIds.has(contactData.name);
                                if (isDeleted) {
                                    console.log(`📱 DELETION FILTER: Skipping deleted contact during file creation (fallback): ${contactName} (ID: ${fileData.id})`);
                                    return; // Skip creating this deleted contact
                                }
                            }
                        } else {
                            console.log(`📱 RESTORATION: Skipping deletion check for contact: ${contactName} (restoring from backup)`);
                        }
                    }
                    
                    const object = this.createSingleFileObject(fileData, index);
                    if (object) {
                        this.scene.add(object);
                        this.stateManager.fileObjects.push(object);
                        
                        // WORLD TEMPLATE: Notify world template about new object (for animations)
                        if (this.currentWorldTemplate && typeof this.currentWorldTemplate.onObjectAdded === 'function') {
                            this.currentWorldTemplate.onObjectAdded(object);
                        }
                        
                        // Apply all fixes to newly created object
                        console.log('Checking position data for object:', fileData.name);
                        console.log('fileData.x:', fileData.x, 'fileData.z:', fileData.z, 'fileData.y:', fileData.y);
                        
                        const hasPersistedPosition = (fileData.x !== undefined && fileData.z !== undefined);
                        console.log('Has persisted position:', hasPersistedPosition);
                        
                        if (hasPersistedPosition) {
                            // Determine how to handle Y position based on world type and object state
                            const currentWorldType = this.stateManager?.currentWorldType || 
                                                   (window.app?.currentWorldTemplate?.getType && window.app.currentWorldTemplate.getType()) ||
                                                   'green-plane';
                            
                            // Check if world supports 3D positioning (vertical movement)
                            const supportsVerticalMovement = window.app?.currentWorldTemplate && typeof window.app.currentWorldTemplate.supportsVerticalMovement === 'function' 
                                ? window.app.currentWorldTemplate.supportsVerticalMovement() 
                                : (currentWorldType === 'space' || currentWorldType === 'ocean' || currentWorldType === 'forest');
                            
                            // For 3D worlds (space/ocean/forest/cave), always restore exact Y position for free floating
                            if (supportsVerticalMovement) {
                                console.log('3D world detected - restoring exact Y position for free floating:', fileData.y);
                                window.applyAllFixesToObject(object, fileData, 'restore-free-y'); 
                            } else {
                                // For gravity worlds (green-plane, dazzle, forest), use existing stacking logic
                                const objectHeight = object.geometry.parameters.height || 2;
                                const expectedGroundY = objectHeight / 2;
                                const wasOriginallyStacked = fileData.y && fileData.y > (expectedGroundY + 0.1);
                                
                                if (wasOriginallyStacked) {
                                    console.log('Object was originally stacked at Y:', fileData.y, 'applying stacking restoration');
                                    window.applyAllFixesToObject(object, fileData, 'restore-stacked'); 
                                } else {
                                    console.log('Object has persisted XZ position, applying positioning with stacking check');
                                    window.applyAllFixesToObject(object, fileData, 'recalculate-y'); 
                                }
                            }
                        } else {
                            console.log('Object has no persisted position, applying full positioning');
                            window.applyAllFixesToObject(object, fileData, false); // Apply full positioning
                        }
                        
                        // CRITICAL: Apply face textures and billboards AFTER positioning is complete
                        console.log('Applying visual features to object:', fileData.name);
                        console.log('Object has thumbnailDataUrl:', !!fileData.thumbnailDataUrl);
                        console.log('Object isDemoContent:', fileData.isDemoContent);
                        console.log('Face textures enabled:', this.stateManager.currentDisplayOptions.useFaceTextures);
                        console.log('billboardManager exists:', !!this.billboardManager);
                        
                        // DEMO DEBUG: Extra logging for demo files
                        if (fileData.isDemoContent) {
                            console.log('🎨 [FILE MGR] Demo file detected:', fileData.name);
                            console.log('🎨 [FILE MGR] About to call updateObjectVisuals with fileData:', {
                                name: fileData.name,
                                isDemoContent: fileData.isDemoContent,
                                thumbnailDataUrl: fileData.thumbnailDataUrl ? `${fileData.thumbnailDataUrl.substring(0, 50)}...` : null,
                                hasThumbnail: !!fileData.thumbnailDataUrl
                            });
                        }
                        
                        // Always update object visuals (face textures, billboards, etc.)
                        this.billboardManager.updateObjectVisuals(object, fileData);
                        
                        // SIMPLIFIED FIX: Always try face texture for demo files (don't check useFaceTextures flag)
                        if (fileData.isDemoContent && fileData.thumbnailDataUrl) {
                            console.log('🎨🎨🎨 [FORCE] Applying face texture for demo file:', fileData.name);
                            console.log('🎨🎨🎨 [FORCE] thumbnailDataUrl length:', fileData.thumbnailDataUrl.length);
                            window.restoreFaceTexture(object, fileData);
                        } else if (fileData.thumbnailDataUrl && this.stateManager.currentDisplayOptions.useFaceTextures) {
                            console.log('Explicitly applying face texture for:', fileData.name);
                            window.restoreFaceTexture(object, fileData);
                        }
                    }
                } catch (error) {
                    console.error('Error creating object for file:', fileData, error);
                }
            });
            
            // Handle app objects using virtual object manager
            if (appObjects.length > 0) {
                console.log(`Found ${appObjects.length} app objects to create`);
                
                try {
                    // Convert app file data to app info format expected by virtual object manager
                    const appInfos = appObjects.map(fileData => {
                        console.log('Processing app object:', fileData);
                        console.log('DEBUG: fileData.path:', fileData.path);
                        console.log('DEBUG: fileData.id:', fileData.id);
                        console.log('DEBUG: fileData.name:', fileData.name);
                        
                        // Safe extraction of package name
                        let packageName = 'unknown.package';
                        
                        // First try fileData.path (expected format: app_packageName)
                        if (fileData.path && typeof fileData.path === 'string') {
                            // Handle both 'app_' prefix and 'app://' scheme
                            let cleanPath = fileData.path;
                            if (cleanPath.startsWith('app_')) {
                                packageName = cleanPath.substring(4); // Remove 'app_'
                            } else if (cleanPath.startsWith('app://')) {
                                packageName = cleanPath.substring(6); // Remove 'app://'
                            } else {
                                packageName = cleanPath;
                            }
                            console.log(`Extracted package name: "${packageName}" from path: "${fileData.path}"`);
                        } 
                        // Fallback to fileData.id (format: app_packageName)
                        else if (fileData.id && typeof fileData.id === 'string') {
                            if (fileData.id.startsWith('app_')) {
                                packageName = fileData.id.substring(4); // Remove 'app_'
                                console.log(`Extracted package name: "${packageName}" from id: "${fileData.id}"`);
                            } else if (fileData.id.startsWith('app://')) {
                                packageName = fileData.id.substring(6); // Remove 'app://'
                                console.log(`Extracted package name: "${packageName}" from id: "${fileData.id}"`);
                            }
                        }
                        // Last resort: use existing packageName field
                        else if (fileData.packageName) {
                            packageName = fileData.packageName;
                            console.log('DEBUG: Using existing packageName:', packageName);
                        }
                        console.log('DEBUG: Final packageName for', fileData.name, ':', packageName);
                        
                        // CRITICAL FIX: Extract URL from mimeType field for link objects
                        let extractedUrl = null;
                        let linkType = null;
                        if (fileData.mimeType && fileData.mimeType.startsWith('link:')) {
                            extractedUrl = fileData.mimeType.substring(5); // Remove 'link:' prefix
                            linkType = 'web';
                            console.log('=== EXTRACTED URL FROM MIMETYPE FOR APP OBJECT ===');
                            console.log('App name:', fileData.name);
                            console.log('MimeType field:', fileData.mimeType);
                            console.log('Extracted URL:', extractedUrl);
                        }
                        
                        return {
                            name: fileData.name || 'Unknown App',
                            packageName: packageName || 'unknown.package',
                            icon: null, // No icon data from file system
                            // Include position data directly on the object (not nested in position)
                            x: fileData.x,
                            y: fileData.y,
                            z: fileData.z,
                            // Include URL data for link objects
                            url: extractedUrl || fileData.url,
                            thumbnailUrl: fileData.thumbnailUrl,
                            thumbnailDataUrl: fileData.thumbnailDataUrl,
                            linkType: linkType || fileData.linkType,
                            title: fileData.title || fileData.name,
                            // DEMO FIX: Pass through path and isDemoContent for demo media files
                            path: fileData.path,
                            isDemoContent: fileData.isDemoContent || false,
                            // FURNITURE SEATING: Include furniture metadata for app objects
                            furnitureId: fileData.furnitureId,
                            furnitureSlotIndex: fileData.furnitureSlotIndex
                        };
                    });
                    
                    console.log('Converted app infos:', appInfos);
                    
                    // Use the virtual object manager if available
                    if (this.virtualObjectManager) {
                        console.log('Using virtual object manager to create app objects');
                        const addedObjects = this.virtualObjectManager.addAppObjects(appInfos);
                        console.log(`Virtual object manager created ${addedObjects.length} app objects`);
                    } else {
                        console.error('VirtualObjectManager not available for app objects');
                    }
                } catch (error) {
                    console.error('Error processing app objects:', error);
                    console.error('App objects data:', appObjects);
                }
            }
            
            console.log(`Created ${this.stateManager.fileObjects.length} file objects`);
            
            if (window.FileObjectDebugChannel) {
                window.FileObjectDebugChannel.postMessage(`📊 Post-creation: fileObjects.length = ${this.stateManager.fileObjects.length}`);
            }
            
            // FURNITURE SEATING RESTORATION: Restore furniture seating for objects with furniture metadata
            // This must happen AFTER all objects are created but BEFORE stacking fix
            console.log('=== RESTORING FURNITURE SEATING ===');
            
            if (window.FileObjectDebugChannel) {
                window.FileObjectDebugChannel.postMessage('🪑 === RESTORING FURNITURE SEATING ===');
            }
            const objectsWithFurniture = this.stateManager.fileObjects.filter(obj => obj.userData.furnitureId);
            
            if (window.FileObjectDebugChannel) {
                window.FileObjectDebugChannel.postMessage(`🔍 Filtered objects with furniture: ${objectsWithFurniture.length}`);
                window.FileObjectDebugChannel.postMessage(`🔍 window.app exists: ${!!window.app}`);
                window.FileObjectDebugChannel.postMessage(`🔍 furnitureManager exists: ${!!(window.app && window.app.furnitureManager)}`);
            }
            
            if (objectsWithFurniture.length > 0 && window.app && window.app.furnitureManager) {
                if (window.FileObjectDebugChannel) {
                    window.FileObjectDebugChannel.postMessage(`🔍 Entering furniture restoration loop with ${objectsWithFurniture.length} objects`);
                }
                console.log(`Found ${objectsWithFurniture.length} objects with furniture metadata`);
                
                // Parent objects to furniture groups and convert world positions to local positions
                objectsWithFurniture.forEach(obj => {
                    const furnitureId = obj.userData.furnitureId;
                    const slotIndex = obj.userData.furnitureSlotIndex;
                    
                    if (window.FileObjectDebugChannel) {
                        window.FileObjectDebugChannel.postMessage(`🪑 Furniture object: ${obj.userData.fileName} → furniture=${furnitureId}, slot=${slotIndex}`);
                        window.FileObjectDebugChannel.postMessage(`   📍 Saved world position: (${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`);
                    }
                    
                    // CRITICAL FIX: Register object in furniture's objectIds array at the correct slot
                    const furniture = window.app.furnitureManager.getFurniture(furnitureId);
                    if (furniture && slotIndex !== null && slotIndex !== undefined) {
                        const objectId = obj.userData.id || obj.userData.fileId;
                        const success = furniture.setObjectAtSlot(objectId, slotIndex);
                        if (success) {
                            if (window.FileObjectDebugChannel) {
                                window.FileObjectDebugChannel.postMessage(`   ✅ Registered in furniture objectIds array at slot ${slotIndex}`);
                            }
                        } else {
                            if (window.FileObjectDebugChannel) {
                                window.FileObjectDebugChannel.postMessage(`   ❌ Failed to register in furniture objectIds array at slot ${slotIndex}`);
                            }
                        }
                    }
                    
                    // Get the furniture group from visual manager
                    const furnitureGroup = window.app.furnitureManager.visualManager.getFurnitureGroup(furnitureId);
                    if (furnitureGroup) {
                        // FURNITURE SNAP FIX: If object has a slot index, snap it to the exact marker position
                        if (window.FileObjectDebugChannel) {
                            window.FileObjectDebugChannel.postMessage(`   🔍 SNAP CHECK: slotIndex=${slotIndex}, isNull=${slotIndex === null}, isUndefined=${slotIndex === undefined}`);
                        }
                        
                        if (slotIndex !== null && slotIndex !== undefined) {
                            if (window.FileObjectDebugChannel) {
                                window.FileObjectDebugChannel.postMessage(`   ✅ SLOT INDEX VALID, attempting snap...`);
                            }
                            
                            // Get furniture data to find the slot marker
                            const furniture = window.app.furnitureManager.getFurniture(furnitureId);
                            
                            if (window.FileObjectDebugChannel) {
                                window.FileObjectDebugChannel.postMessage(`   🔍 Furniture exists: ${!!furniture}, has slots: ${!!(furniture && furniture.slots)}, slot count: ${furniture?.slots?.length || 0}`);
                            }
                            
                            if (furniture && furniture.slots && furniture.slots[slotIndex]) {
                                const slot = furniture.slots[slotIndex];
                                
                                if (window.FileObjectDebugChannel) {
                                    window.FileObjectDebugChannel.postMessage(`   ✅ SLOT MARKER FOUND at index ${slotIndex}`);
                                }
                                
                                // Get slot marker's world position
                                const worldPos = new THREE.Vector3();
                                slot.getWorldPosition(worldPos);
                                
                                // Elevate object above marker surface
                                const objectHeight = obj.userData?.objectHeight || obj.geometry?.parameters?.height || 2.5;
                                const targetY = worldPos.y + (objectHeight / 2);
                                
                                // Set object to exact marker position in world coordinates
                                obj.position.set(worldPos.x, targetY, worldPos.z);
                                
                                // ROTATION FIX: Apply slot rotation so objects face outward
                                if (slot.userData && slot.userData.rotation !== undefined) {
                                    obj.rotation.y = slot.userData.rotation;
                                    if (window.FileObjectDebugChannel) {
                                        window.FileObjectDebugChannel.postMessage(`   🔄 Applied slot rotation: ${(slot.userData.rotation * 180 / Math.PI).toFixed(1)}°`);
                                    }
                                }
                                
                                if (window.FileObjectDebugChannel) {
                                    window.FileObjectDebugChannel.postMessage(`   🎯 SNAPPED to slot ${slotIndex} marker: (${worldPos.x.toFixed(2)}, ${targetY.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
                                }
                            } else {
                                if (window.FileObjectDebugChannel) {
                                    window.FileObjectDebugChannel.postMessage(`   ❌ SNAP FAILED: furniture or slot not found`);
                                }
                            }
                        } else {
                            if (window.FileObjectDebugChannel) {
                                window.FileObjectDebugChannel.postMessage(`   ⏭️ SKIPPING SNAP: slotIndex is null/undefined`);
                            }
                        }
                        
                        // Save the world position
                        const worldPos = obj.position.clone();
                        
                        // Convert world position to furniture-local position
                        const localPos = worldPos.clone();
                        furnitureGroup.worldToLocal(localPos);
                        
                        // Parent object to furniture group
                        furnitureGroup.add(obj);
                        
                        // Set local position
                        obj.position.copy(localPos);
                        
                        // Ensure metadata is set
                        obj.userData.furnitureId = furnitureId;
                        obj.userData.furnitureSlotIndex = slotIndex;
                        obj.userData.preservePosition = true; // Prevent sorting/gravity
                        
                        if (window.FileObjectDebugChannel) {
                            window.FileObjectDebugChannel.postMessage(`   🔗 Parented to furniture group`);
                            window.FileObjectDebugChannel.postMessage(`   📍 Local position: (${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`);
                            window.FileObjectDebugChannel.postMessage(`   ✅ Object will now move with furniture`);
                        }
                    } else {
                        if (window.FileObjectDebugChannel) {
                            window.FileObjectDebugChannel.postMessage(`   ❌ Furniture group ${furnitureId} not found - object will not move with furniture`);
                        }
                        console.warn(`Furniture group ${furnitureId} not found for object ${obj.userData.fileName}`);
                        
                        // Still set metadata even if furniture not found
                        obj.userData.furnitureId = furnitureId;
                        obj.userData.furnitureSlotIndex = slotIndex;
                        obj.userData.preservePosition = true;
                    }
                });
            } else {
                if (window.FileObjectDebugChannel) {
                    window.FileObjectDebugChannel.postMessage('🔍 Skipping furniture restoration - conditions not met');
                }
                console.log('No objects with furniture metadata to restore');
            }
            console.log('=== FURNITURE SEATING RESTORATION COMPLETE ===');
            
            // CRITICAL: Apply stacking fix after ALL objects are created
            // This ensures that objects that should be stacked get properly positioned
            if (this.stateManager.fileObjects.length > 0) {
                console.log('=== APPLYING POST-CREATION STACKING FIX ===');
                if (window.FileObjectDebugChannel) {
                    window.FileObjectDebugChannel.postMessage('📍 BEFORE STACKING FIX:');
                    this.stateManager.fileObjects.forEach(obj => {
                        if (obj.userData.furnitureId) {
                            window.FileObjectDebugChannel.postMessage(`   ${obj.userData.fileName}: y=${obj.position.y.toFixed(2)}, preservePosition=${obj.userData.preservePosition}`);
                        }
                    });
                }
                window.fixStackedObjectPositions(this.stateManager.fileObjects);
                if (window.FileObjectDebugChannel) {
                    window.FileObjectDebugChannel.postMessage('📍 AFTER STACKING FIX:');
                    this.stateManager.fileObjects.forEach(obj => {
                        if (obj.userData.furnitureId) {
                            window.FileObjectDebugChannel.postMessage(`   ${obj.userData.fileName}: y=${obj.position.y.toFixed(2)}, preservePosition=${obj.userData.preservePosition}`);
                        }
                    });
                }
                console.log('=== STACKING FIX COMPLETE ===');
                
                // Update focus zones after all objects are positioned
                console.log('=== UPDATING FOCUS ZONES ===');
                if (window.app && window.app.focusZoneManager) {
                    window.app.focusZoneManager.updateFocusZones();
                    console.log('Focus zones updated for navigation assistance');
                } else {
                    console.warn('FocusZoneManager not available for zone updates');
                }
                
                // TRIGGER SORTING: Apply sorting if enabled after all objects are created and positioned
                console.log('=== TRIGGERING INITIAL SORTING ===');
                if (window.app && window.app.sortingManager) {
                    // Check if sorting is enabled in the state manager
                    const sortingEnabled = this.stateManager.currentDisplayOptions.sortFileObjects;
                    console.log('Initial sorting check - sortFileObjects setting:', sortingEnabled);
                    
                    if (sortingEnabled) {
                        console.log('Sorting is enabled, triggering initial sort into zones...');
                        try {
                            // Ensure the sorting manager is properly configured and initialized
                            window.app.sortingManager.updateConfig({ enabled: true });
                            window.app.sortingManager.sortObjectsIntoZones();
                            console.log('Initial sorting completed successfully');
                        } catch (sortingError) {
                            console.warn('Initial sorting failed (non-critical):', sortingError);
                        }
                    } else {
                        console.log('Sorting is disabled, skipping initial sort');
                    }
                } else {
                    console.warn('SortingManager not available for initial sorting');
                }
            }
            
            // POSITION PERSISTENCE FIX: Restore contact positions after file creation
            if (window.contactPositionsBeforeSync) {
                this.restoreContactPositions(window.contactPositionsBeforeSync);
                delete window.contactPositionsBeforeSync; // Clean up
            }
            
            // CRITICAL FIX: Mark objects as created for world manager
            if (window.app && window.app.worldManager && typeof window.app.worldManager.markObjectsCreated === 'function') {
                window.app.worldManager.markObjectsCreated();
                console.log('🔧 Marked objects as created for premium world initialization tracking');
            }

            // CHILD ELEMENT PERSISTENCE: Restore SMS and avatar states after contact restoration
            this.restoreContactChildStates();
            
            // APPLY SAVED AVATARS: Ensure any saved customizations are applied to contacts
            // This is delayed to ensure the scene is fully loaded and ready.
            setTimeout(() => {
                if (window.ContactCustomizationManager) {
                    console.log('👤 Applying all saved avatars after initial load...');
                    window.ContactCustomizationManager.applyAllSavedAvatars();
                } else {
                    console.log('👤 ContactCustomizationManager not available for applying saved avatars.');
                }
            }, 3500); // A single, slightly longer delay to ensure all objects are loaded and positioned.
        }
        
        /**
         * Add a single file to the world (complete pipeline: create + add + update)
         * This is the method to call from Dart when adding new files to an existing world
         */
        addSingleFileToWorld(fileData) {
            console.log('=== addSingleFileToWorld ===');
            console.log('Adding file to world:', fileData.name);
            
            try {
                // Create the object
                const object = this.createSingleFileObject(fileData, 0);
                
                if (!object) {
                    console.error('Failed to create object for:', fileData.name);
                    return null;
                }
                
                console.log('✅ Object created, now adding to scene and state manager');
                
                // Add to scene
                this.scene.add(object);
                
                // Add to state manager
                this.stateManager.fileObjects.push(object);
                
                // Notify world template about new object (for animations)
                if (this.currentWorldTemplate && typeof this.currentWorldTemplate.onObjectAdded === 'function') {
                    this.currentWorldTemplate.onObjectAdded(object);
                }
                
                // Apply positioning fixes (check for both null and undefined)
                const hasPersistedPosition = (fileData.x != null && fileData.z != null);
                if (!hasPersistedPosition) {
                    // New object with no saved position - apply full positioning
                    console.log('New object with no persisted position, applying full positioning');
                    window.applyAllFixesToObject(object, fileData, false);
                } else {
                    console.log('Object has persisted position, skipping initial positioning');
                }
                
                // Apply visual features (face textures, billboards, etc.)
                this.billboardManager.updateObjectVisuals(object, fileData);
                
                // For demo content, force face texture application
                if (fileData.isDemoContent && fileData.thumbnailDataUrl) {
                    console.log('🎨 [addSingleFileToWorld] Applying face texture for demo file:', fileData.name);
                    this.billboardManager.applyFaceTexture(object, fileData.thumbnailDataUrl);
                }
                
                console.log('✅ Successfully added file to world:', fileData.name);
                return object;
                
            } catch (error) {
                console.error('Error in addSingleFileToWorld:', error);
                console.error('FileData:', fileData);
                return null;
            }
        }
        
        /**
         * Create a single file object
         */
        createSingleFileObject(fileData, index) {
            console.log('=== createSingleFileObject ===');
            console.log('File data:', fileData);
            console.log('Extension:', fileData.extension);
            console.log('Name:', fileData.name);
            console.log('Has thumbnail data:', !!fileData.thumbnailDataUrl, 'Length:', fileData.thumbnailDataUrl ? fileData.thumbnailDataUrl.length : 0);
            
            // Determine position
            let position = { x: 0, y: 0, z: 0 };
            
            if (fileData.x !== undefined && fileData.z !== undefined) {
                // Validate position - prevent objects from being positioned too far away
                const maxDistance = 100; // Maximum distance from origin
                let x = fileData.x;
                let z = fileData.z;
                
                // Clamp extreme positions to keep objects visible
                if (Math.abs(x) > maxDistance) {
                    console.log(`Clamping extreme X position from ${x} to ${Math.sign(x) * maxDistance}`);
                    x = Math.sign(x) * maxDistance;
                }
                if (Math.abs(z) > maxDistance) {
                    console.log(`Clamping extreme Z position from ${z} to ${Math.sign(z) * maxDistance}`);
                    z = Math.sign(z) * maxDistance;
                }
                
                position.x = x;
                position.z = z;
                
                // CRITICAL FIX: For stacked objects, preserve original Y temporarily for stacking logic
                // For ground objects, start at ground level
                const tempObjectHeight = 2; // Default height for estimation
                const expectedGroundY = tempObjectHeight / 2;
                const wasOriginallyStacked = fileData.y && fileData.y > (expectedGroundY + 0.1);
                
                if (wasOriginallyStacked) {
                    position.y = fileData.y; // Preserve original Y for stacking calculation
                    console.log('Preserving original Y position for stacked object:', fileData.y);
                } else {
                    position.y = 0; // Start at ground level, proper Y will be calculated by positioning logic
                    console.log('Starting at ground level, Y will be recalculated for ground object');
                }
                
                console.log('Using persisted position:', {x: position.x, y: position.y, z: position.z});
                console.log('Original fileData position was x:', fileData.x, 'y:', fileData.y, 'z:', fileData.z);
                if (x !== fileData.x || z !== fileData.z) {
                    console.log('Position was clamped for visibility');
                }
            } else {
                position = this.objectPositioner.calculateOptimalPosition(
                    this.stateManager.fileObjects, 
                    null
                );
                console.log('Calculated new position:', position);
            }

            // Create object
            console.log('Calling createObjectByType with extension:', fileData.extension);
            const object = this.objectCreator.createObjectByType(
                fileData.extension,
                position,
                fileData.name,
                fileData.id,
                fileData  // Pass full fileData object for contact phone number extraction
            );
            
            if (object) {
                console.log('Successfully created object for:', fileData.name, 'Type:', object.type, 'UUID:', object.uuid);
                
                // Store additional data
                object.userData.thumbnailDataUrl = fileData.thumbnailDataUrl;
                object.userData.fileData = fileData;
                
                // FURNITURE SEATING DIAGNOSTIC
                if (window.FileObjectDebugChannel) {
                    window.FileObjectDebugChannel.postMessage(`🔍 Checking furniture for "${fileData.name}": furnitureId="${fileData.furnitureId}", slotIndex="${fileData.furnitureSlotIndex}"`);
                }
                
                // FURNITURE SEATING: If object has furniture metadata, set preservePosition IMMEDIATELY
                // This prevents gravity from dropping the object before furniture restoration completes
                if (fileData.furnitureId) {
                    object.userData.furnitureId = fileData.furnitureId;
                    object.userData.furnitureSlotIndex = fileData.furnitureSlotIndex;
                    object.userData.preservePosition = true;
                    
                    if (window.FileObjectDebugChannel) {
                        window.FileObjectDebugChannel.postMessage(`✅ FURNITURE APPLIED: "${fileData.name}" → preservePosition=true, furnitureId="${fileData.furnitureId}", slot=${fileData.furnitureSlotIndex}`);
                    }
                    
                    console.log(`🪑 Object ${fileData.name} loaded with furniture seating: ${fileData.furnitureId} slot ${fileData.furnitureSlotIndex} - preservePosition set to prevent gravity`);
                }
                
                // WORLD STATE SYSTEM: Initialize world state storage for new object
                this.stateManager.initializeObjectWorldState(object);
                
                // GLOBAL POSITION SYSTEM: Initialize position in GlobalPositionManager
                if (window.globalPositionManager && this.stateManager.currentWorldType) {
                    window.globalPositionManager.initializeObject(
                        object.uuid,
                        position,
                        this.stateManager.currentWorldType
                    );
                    console.log(`📍 Initialized global position for new object ${fileData.name}`);
                }
                
                console.log('Object created with proper data for:', fileData.name);
            } else {
                console.error('FAILED to create object for:', fileData.name, 'with extension:', fileData.extension);
            }
            
            return object;
        }
        
        /**
         * Clear all file objects from the scene
         */
        clearFileObjects() {
            console.log('Clearing file objects - START');
            console.log('Current fileObjects count:', this.stateManager.fileObjects.length);
            
            this.deselectObject();
            
            // POSITION PERSISTENCE FIX: Store contact positions before clearing
            const contactPositions = new Map();
            
            // Clean up labels and face textures
            this.stateManager.labelObjectsMap.forEach((attachments, uuid) => {
                const object = this.stateManager.fileObjects.find(fo => fo.uuid === uuid);
                if (attachments.infoLabel) {
                    if (object) object.remove(attachments.infoLabel);
                    this.disposeObject(attachments.infoLabel);
                }
                if (attachments.faceTexture) {
                    // Clean up face texture using the correct method
                    if (object) this.billboardManager.removeFaceTexture(object);
                    if (attachments.faceTexture.dispose) attachments.faceTexture.dispose();
                }
            });
            this.stateManager.labelObjectsMap.clear();
            
            // Clear processed texture objects set
            this.stateManager.processedTextureObjects.clear();
            
            // WORLD STATE SYSTEM: Clear all world states for all objects
            this.stateManager.worldObjectStates.clear();
            
            // GLOBAL POSITION SYSTEM: Clear all positions from GlobalPositionManager
            if (window.globalPositionManager) {
                window.globalPositionManager.clearAll();
                console.log('📍 Cleared all global positions');
            }

            // WORLD TEMPLATE: Notify world template about all objects being removed (for animation cleanup)
            if (this.currentWorldTemplate && typeof this.currentWorldTemplate.onObjectRemoved === 'function') {
                this.stateManager.fileObjects.forEach(object => {
                    // Only notify about non-link objects being removed
                    if (!object.userData.isLink) {
                        this.currentWorldTemplate.onObjectRemoved(object);
                    }
                });
            }

            // POSITION PERSISTENCE FIX: Separate contacts, links, and regular file objects
            const contactObjects = [];
            const linkObjects = [];
            const demoObjects = []; // DEMO FIX: Preserve demo media files
            const regularObjects = [];
            
            // CHILD ELEMENT PERSISTENCE: Store SMS and avatar states before clearing contacts
            if (!window.contactSMSStates) window.contactSMSStates = new Map();
            if (!window.contactAvatarStates) window.contactAvatarStates = new Map();
            
            // COMPREHENSIVE AVATAR STORAGE: Store all active avatars from ContactCustomizationManager
            if (window.ContactCustomizationManager?.instance) {
                const customizationManager = window.ContactCustomizationManager.instance;
                if (customizationManager.activeAvatars && customizationManager.activeAvatars.size > 0) {
                    console.log(`👤 Storing all active avatars - found ${customizationManager.activeAvatars.size} avatars`);
                    
                    customizationManager.activeAvatars.forEach((avatar, contactId) => {
                        const config = customizationManager.getContactCustomization(contactId);
                        if (config) {
                            window.contactAvatarStates.set(contactId, { 
                                hadAvatar: true, 
                                config: config 
                            });
                            console.log(`👤 Comprehensive storage: avatar state for ${contactId}`);
                        }
                    });
                } else {
                    console.log('👤 No active avatars found in ContactCustomizationManager.activeAvatars');
                }
            } else {
                console.log('👤 ContactCustomizationManager not available for comprehensive avatar storage');
            }
            
            this.stateManager.fileObjects.forEach(obj => {
                // DEMO FIX: Preserve demo content objects
                if (obj.userData?.isDemoContent === true) {
                    demoObjects.push(obj);
                    console.log(`🎵 Preserving demo content: ${obj.userData.fileName}`);
                } else if (obj.userData && (
                    obj.userData.subType === 'contact' ||
                    obj.userData.isContact ||
                    obj.userData.contactId ||
                    (obj.userData.id && obj.userData.id.startsWith('contact://'))
                )) {
                    contactObjects.push(obj);
                    // Store contact position for persistence
                    const contactId = obj.userData.contactId || obj.userData.id || obj.userData.fileId;
                    if (contactId) {
                        contactPositions.set(contactId, {
                            x: obj.position.x,
                            y: obj.position.y,
                            z: obj.position.z
                        });
                        console.log(`📱 Stored position for contact ${contactId}:`, {
                            x: obj.position.x,
                            y: obj.position.y,
                            z: obj.position.z
                        });
                        
                        // CHILD ELEMENT PERSISTENCE: Store SMS and avatar states for contact
                        if (window.app?.contactManager) {
                            const contactManager = window.app.contactManager;
                            const contact = contactManager.contacts.get(contactId);
                            
                            if (contact) {
                                // Store SMS screen state
                                if (contact.smsScreen && contact.smsScreen.isVisible) {
                                    window.contactSMSStates.set(contactId, { wasVisible: true });
                                    console.log(`📱 Stored SMS state for ${contactId}: visible`);
                                }
                                
                                // Store avatar state
                                if (window.ContactCustomizationManager?.instance) {
                                    const customizationManager = window.ContactCustomizationManager.instance;
                                    const avatarExists = customizationManager.activeAvatars.has(contactId);
                                    const config = customizationManager.getContactCustomization(contactId);
                                    
                                    if (avatarExists && config) {
                                        console.log(`👤 Storing avatar state for individual contact ${contactId}: has avatar`);
                                        window.contactAvatarStates.set(contactId, { 
                                            hadAvatar: true, 
                                            config: config 
                                        });
                                        console.log(`👤 Stored avatar state for ${contactId}: has avatar`);
                                    }
                                }
                            }
                        }
                    }
                } else if (obj.userData.type === 'app' && 
                          obj.userData.fileData &&
                          (obj.userData.fileData.url || obj.userData.fileData.thumbnailUrl)) {
                    linkObjects.push(obj);
                } else {
                    regularObjects.push(obj);
                }
            });

            // Remove and dispose only regular file objects (preserve contacts, links, and demo content)
            console.log('About to remove', regularObjects.length, 'objects from scene');
            console.log('Preserving', linkObjects.length, 'link objects');
            console.log('Preserving', contactObjects.length, 'contact objects');
            console.log('Preserving', demoObjects.length, 'demo content objects');
            
            regularObjects.forEach((obj, index) => {
                console.log(`Removing object ${index + 1}:`, obj.userData.fileName || obj.uuid);
                this.scene.remove(obj);
                this.disposeObject(obj);
            });
            
            // Keep contacts, links, and demo content in the fileObjects array
            this.stateManager.fileObjects = [...contactObjects, ...linkObjects, ...demoObjects];
            
            // Store contact positions globally for restoration after file creation
            if (contactPositions.size > 0) {
                window.contactPositionsBeforeSync = contactPositions;
                console.log(`🔄 Stored ${contactPositions.size} contact positions for restoration`);
            }
            
            console.log(`File objects cleared, preserved ${linkObjects.length} link objects, ${contactObjects.length} contact objects, and ${demoObjects.length} demo objects`);
            
            // Force immediate render to show changes
            if (this.renderer && this.scene && this.camera) {
                // Force multiple renders to ensure changes are visible
                this.renderer.render(this.scene, this.camera);
                
                // Also force the camera controls to update
                if (this.cameraControls) {
                    this.cameraControls.update(0);
                }
                
                // Force another render after camera update
                this.renderer.render(this.scene, this.camera);
                console.log('Forced multiple renders after clearing objects');
            }
            
            console.log('File objects cleared - COMPLETE');
            console.log('Remaining scene children count:', this.scene.children.length);
        }
        
        /**
         * Clear ALL file objects from the scene INCLUDING contacts (for delete all functionality)
         */
        clearAllObjectsIncludingContacts() {
            console.log('Clearing ALL objects INCLUDING contacts - START');
            console.log('Current fileObjects count:', this.stateManager.fileObjects.length);
            
            this.deselectObject();
            
            // Clean up labels and face textures for ALL objects
            this.stateManager.labelObjectsMap.forEach((attachments, uuid) => {
                const object = this.stateManager.fileObjects.find(fo => fo.uuid === uuid);
                if (attachments.infoLabel) {
                    if (object) object.remove(attachments.infoLabel);
                    this.disposeObject(attachments.infoLabel);
                }
                if (attachments.faceTexture) {
                    // Clean up face texture using the correct method
                    if (object) this.billboardManager.removeFaceTexture(object);
                    if (attachments.faceTexture.dispose) attachments.faceTexture.dispose();
                }
            });
            this.stateManager.labelObjectsMap.clear();
            
            // CRITICAL FIX: Clean up ALL link title labels
            if (window.linkTitleManager) {
                console.log('📝 Removing all link title labels during clearAllObjectsIncludingContacts');
                window.linkTitleManager.removeAllLabels();
            }
            
            // Clear processed texture objects set
            this.stateManager.processedTextureObjects.clear();
            
            // WORLD STATE SYSTEM: Clear all world states for all objects
            this.stateManager.worldObjectStates.clear();

            // WORLD TEMPLATE: Notify world template about all objects being removed (for animation cleanup)
            if (this.currentWorldTemplate && typeof this.currentWorldTemplate.onObjectRemoved === 'function') {
                this.stateManager.fileObjects.forEach(object => {
                    // Notify about ALL objects being removed (including contacts)
                    this.currentWorldTemplate.onObjectRemoved(object);
                });
            }

            // Remove and dispose ALL file objects (do NOT preserve contacts or links)
            console.log('About to remove ALL', this.stateManager.fileObjects.length, 'objects from scene (including contacts)');
            
            this.stateManager.fileObjects.forEach((obj, index) => {
                console.log(`Removing object ${index + 1}:`, obj.userData.fileName || obj.userData.contactId || obj.uuid);
                this.scene.remove(obj);
                this.disposeObject(obj);
            });
            
            // Clear the fileObjects array completely
            this.stateManager.fileObjects = [];
            
            console.log('ALL objects cleared including contacts - fileObjects array is now empty');
            
            // Force immediate render to show changes
            if (this.renderer && this.scene && this.camera) {
                // Force multiple renders to ensure changes are visible
                this.renderer.render(this.scene, this.camera);
                
                // Also force the camera controls to update
                if (this.cameraControls) {
                    this.cameraControls.update(0);
                }
                
                // Force another render after camera update
                this.renderer.render(this.scene, this.camera);
                console.log('Forced multiple renders after clearing ALL objects');
            }
            
            console.log('ALL objects cleared INCLUDING contacts - COMPLETE');
            console.log('Remaining scene children count:', this.scene.children.length);
        }
        
        /**
         * Remove an object by its ID
         */
        removeObjectById(objectId) {
            console.log('Removing object:', objectId);
            
            const objectIndex = this.stateManager.fileObjects.findIndex(
                obj => obj.userData.id === objectId
            );
            
            if (objectIndex !== -1) {
                const object = this.stateManager.fileObjects[objectIndex];
                
                // IMPORTANT: Store visual state BEFORE removing the object from the scene
                this.storeObjectVisualStateForUndo(objectId);
                
                // Clean up attachments
                const attachments = this.stateManager.labelObjectsMap.get(object.uuid);
                if (attachments) {
                    if (attachments.infoLabel) this.disposeObject(attachments.infoLabel);
                    if (attachments.faceTexture) {
                        // Clean up face texture using the billboard manager
                        this.billboardManager.removeFaceTexture(object);
                        if (attachments.faceTexture.dispose) attachments.faceTexture.dispose();
                    }
                    this.stateManager.labelObjectsMap.delete(object.uuid);
                }
                
                // CRITICAL FIX: Clean up link title label if this is a link object
                if (window.linkTitleManager && object.uuid) {
                    window.linkTitleManager.removeLabel(object.uuid);
                    console.log('📝 Removed link title label for object:', object.uuid);
                }
                
                // Remove from processed texture objects set
                this.stateManager.processedTextureObjects.delete(object.userData.fileName);
                
                // WORLD STATE SYSTEM: Clean up world states for deleted object
                this.stateManager.cleanupObjectWorldStates(object.uuid);
                
                // WORLD TEMPLATE: Notify world template about object removal (for animation cleanup)
                if (this.currentWorldTemplate && typeof this.currentWorldTemplate.onObjectRemoved === 'function') {
                    this.currentWorldTemplate.onObjectRemoved(object);
                }
                
                // Remove from scene/parent and dispose
                // CRITICAL FIX: Objects may be parented to furniture groups, not directly to scene
                if (object.parent) {
                    const parentName = object.parent.name || 'scene'; // Capture name before removal
                    object.parent.remove(object);
                    console.log(`🗑️ Removed object from parent (${parentName})`);
                } else {
                    this.scene.remove(object);
                }
                this.disposeObject(object);
                
                // Remove from array
                this.stateManager.fileObjects.splice(objectIndex, 1);
                
                console.log(`Object ${objectId} removed`);
                
                // CRITICAL FIX: Enhanced camera control reset after deletion
                setTimeout(() => {
                    if (window.app?.cameraControls) {
                        const controls = window.app.cameraControls;
                        
                        // Force complete reset of camera controls
                        controls.enabled = false;
                        controls.enabled = true;
                        controls.enableRotate = true;
                        controls.enableZoom = true;
                        controls.enablePan = true;
                        
                        // Force update to clear internal state
                        controls.update(0);
                        
                        if (window.shouldLog && window.shouldLog('cameraControls')) {
                            console.log('🎥 Camera controls comprehensively re-enabled after deletion');
                        }
                    } else if (this.cameraControls) {
                        // Fallback to local reference
                        this.cameraControls.enabled = true;
                        this.cameraControls.enableRotate = true;
                        this.cameraControls.enableZoom = true;
                        this.cameraControls.enablePan = true;
                        console.log('🎥 Camera controls re-enabled via fallback after deletion');
                    }
                }, 100); // Small delay to ensure deletion state is clean
                
                // CRITICAL FIX: Clear any pending interaction states that might keep camera disabled
                if (this.stateManager) {
                    this.stateManager.isLongPress = false;
                    this.stateManager.selectedObjectForMoveId = null;
                    this.stateManager.movingObject = null;
                    this.stateManager.selectedObject = null;
                }
                
                // CRITICAL FIX: Notify Flutter about object deletion for undo snackbar
                // For contact objects, ensure we send the correct ID format
                let deletionId = objectId;
                let deletionName = object.userData.fileName || 'Object';
                
                // Check if this is a contact object and format ID correctly
                if (object.userData && (object.userData.subType === 'contact' || object.userData.isContact)) {
                    // Ensure contact ID has proper format for Flutter
                    if (deletionId && !deletionId.startsWith('contact://')) {
                        deletionId = `contact://${deletionId}`;
                    }
                    deletionName = object.userData.fileName || object.userData.contactId || 'Contact';
                    console.log(`📱 Contact deletion - formatting ID as: ${deletionId}`);
                }
                
                this.notifyFlutterObjectDeleted(deletionId, deletionName);
                
                // FLOATING OBJECT FIX: Apply gravity to any objects that might now be floating
                // This happens when a supporting object is deleted
                setTimeout(() => {
                    if (window.applyGravityToFloatingObjects && typeof window.applyGravityToFloatingObjects === 'function') {
                        window.applyGravityToFloatingObjects();
                        // console.log('[STACKING] Applied gravity check after object deletion');
                    }
                }, 150); // Delay to ensure deletion is complete
            }
        }
        
        /**
         * Dispose of an object and its resources
         */
        disposeObject(object) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => {
                        if (mat.map) mat.map.dispose();
                        mat.dispose();
                    });
                } else {
                    if (object.material.map) object.material.map.dispose();
                    object.material.dispose();
                }
            }
        }
        
        /**
         * Deselect currently selected object
         */
        deselectObject() {
            this.interactionManager.deselectObject();
            this.stateManager.selectedObjectForMoveId = null;
        }
        
        /**
         * Update display options and refresh object visuals
         */
        updateDisplayOptions(options) {
            console.log('Updating display options:', options);
            const oldUseFaceTextures = this.stateManager.currentDisplayOptions.useFaceTextures;
            this.stateManager.updateDisplayOptions(options);
            
            // Check if face texture setting changed
            if (options.useFaceTextures !== undefined && options.useFaceTextures !== oldUseFaceTextures) {
                console.log('=== FACE TEXTURE SETTING CHANGED ===');
                console.log('Face textures:', options.useFaceTextures ? 'ENABLED' : 'DISABLED');
                
                // CRITICAL: Clear processed objects set to allow re-processing
                this.stateManager.processedTextureObjects.clear();
                console.log('Cleared processed texture objects set');
            }
            
            // Always update visuals when any display option changes
            // This ensures info labels, image previews, and face textures all respond to changes
            this.billboardManager.updateAllObjectVisuals();
            console.log('Updated all object visuals due to display option change');
        }
        
        /**
         * Select an object for move operation
         */
        selectObjectForMove(objectId) {
            this.interactionManager.selectObjectForMove(objectId);
        }
        
        /**
         * Store object visual state before deletion for undo functionality
         */
        storeObjectVisualStateForUndo(objectId) {
            // console.log('=== STORING OBJECT VISUAL STATE FOR UNDO ===');
            // console.log('Object ID:', objectId);
            
            // Check if we already have a recent backup for this object (within last 5 seconds)
            const existingBackup = this.deletedObjectsBackup.get(objectId);
            if (existingBackup && existingBackup.deletionTime) {
                const timeSinceLastCapture = Date.now() - existingBackup.deletionTime;
                if (timeSinceLastCapture < 5000) { // 5 seconds
                    console.log('⏭️ Skipping duplicate visual state capture - recent backup exists (', timeSinceLastCapture, 'ms ago)');
                    return true;
                }
            }
            
            const object = this.stateManager.fileObjects.find(
                obj => (obj.userData.id === objectId || obj.userData.fileName === objectId)
            );
            
            if (!object) {
                console.error('Object not found for visual state storage:', objectId);
                return false;
            }
            
            // console.log('Found object to store state:', object.userData.fileName);
            // console.log('Object has thumbnail data:', !!object.userData.thumbnailDataUrl);
            // console.log('Object fileData has thumbnail:', !!(object.userData.fileData && object.userData.fileData.thumbnailDataUrl));
            
            // CONTACT UNDO FIX: Store contact SMS and avatar states for individual deletion
            if (object.userData.subType === 'contact' || object.userData.fileName?.includes('.contact')) {
                console.log('📱 Storing contact SMS and avatar states for undo deletion');
                
                // Initialize global state storage if needed
                if (!window.contactSMSStates) window.contactSMSStates = new Map();
                if (!window.contactAvatarStates) window.contactAvatarStates = new Map();
                
                const contactId = object.userData.contactId || object.userData.id || object.userData.fileName?.replace('.contact', '');
                
                if (contactId && window.app?.contactManager) {
                    const contact = window.app.contactManager.getContactById(contactId);
                    
                    // Store SMS screen state
                    if (contact && contact.smsScreen && contact.smsScreen.isVisible) {
                        window.contactSMSStates.set(contactId, { wasVisible: true });
                        console.log('📱 Stored SMS visible state for contact:', contactId);
                    }
                    
                    // Store avatar state
                    if (window.ContactCustomizationManager?.instance) {
                        const customizationManager = window.ContactCustomizationManager.instance;
                        const hasAvatar = customizationManager.activeAvatars?.has(contactId);
                        if (hasAvatar) {
                            const config = customizationManager.getContactCustomization(contactId);
                            window.contactAvatarStates.set(contactId, { hadAvatar: true, config: config });
                            console.log('👤 Stored avatar state for contact:', contactId);
                        }
                    }
                }
            }
            
            // Capture complete visual state
            const visualState = this.captureObjectVisualState(object);
            
            // Store in backup with a limit of 10 most recent
            this.deletedObjectsBackup.set(objectId, {
                visualState: visualState,
                deletionTime: Date.now(),
                fileData: object.userData.fileData // This should include thumbnailDataUrl
            });
            
            // Limit to 10 most recent deletions
            if (this.deletedObjectsBackup.size > 10) {
                const oldestKey = Array.from(this.deletedObjectsBackup.keys())[0];
                this.deletedObjectsBackup.delete(oldestKey);
            }
            
            // console.log('Visual state stored for:', objectId);
            // console.log('Stored fileData has thumbnail:', !!(this.deletedObjectsBackup.get(objectId).fileData && this.deletedObjectsBackup.get(objectId).fileData.thumbnailDataUrl));
            // console.log('Total stored states:', this.deletedObjectsBackup.size);
            return true;
        }
        
        /**
         * Capture complete visual state of object before deletion
         */
        captureObjectVisualState(object) {
            // console.log('Capturing visual state for object:', object.userData.fileName);
            // console.log('Current object position:', {x: object.position.x, y: object.position.y, z: object.position.z});
            // console.log('Object has children:', object.children.length);
            
            const state = {
                // Basic properties - capture CURRENT position (may be moved position)
                position: {
                    x: object.position.x,
                    y: object.position.y,
                    z: object.position.z
                },
                // Geometry information - handle THREE.Group objects (like contact objects)
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
                attachments: null,
                // COMPOSITE OBJECT FIX: Capture children for composite objects
                children: []
            };

            // Capture material(s) - handle both single and multi-material, and objects without materials (like Groups)
            if (object.material) {
                if (Array.isArray(object.material)) {
                // Multi-material array (with face textures)
                state.material.materials = object.material.map(mat => {
                    let textureDataUrl = null;
                    if (mat.map) {
                        // For CanvasTexture, get data URL from canvas
                        if (mat.map.image && mat.map.image.toDataURL) {
                            textureDataUrl = mat.map.image.toDataURL();
                            console.log('Captured canvas texture data URL, length:', textureDataUrl.length);
                        } else if (mat.map.image && mat.map.image.src) {
                            textureDataUrl = mat.map.image.src;
                            console.log('Captured image texture data URL, length:', textureDataUrl.length);
                        }
                    }
                    
                    return {
                        type: mat.type,
                        color: mat.color ? mat.color.getHex() : 0x888888,
                        transparent: mat.transparent,
                        opacity: mat.opacity,
                        metalness: mat.metalness,
                        roughness: mat.roughness,
                        hasTexture: !!mat.map,
                        textureDataUrl: textureDataUrl
                    };
                });
            } else {
                // Single material
                let textureDataUrl = null;
                if (object.material.map) {
                    // For CanvasTexture, get data URL from canvas
                    if (object.material.map.image && object.material.map.image.toDataURL) {
                        textureDataUrl = object.material.map.image.toDataURL();
                        console.log('Captured canvas texture data URL, length:', textureDataUrl.length);
                    } else if (object.material.map.image && object.material.map.image.src) {
                        textureDataUrl = object.material.map.image.src;
                        console.log('Captured image texture data URL, length:', textureDataUrl.length);
                    }
                }
                
                state.material.materials.push({
                    type: object.material.type,
                    color: object.material.color ? object.material.color.getHex() : 0x888888,
                    transparent: object.material.transparent,
                    opacity: object.material.opacity,
                    metalness: object.material.metalness,
                    roughness: object.material.roughness,
                    hasTexture: !!object.material.map,
                    textureDataUrl: textureDataUrl
                });
                }
            } else {
                // No material (e.g., THREE.Group objects like contact objects)
                console.log('Object has no material property (Group object)');
            }

            // Capture billboard manager attachments
            const attachments = this.stateManager.labelObjectsMap.get(object.uuid);
            if (attachments) {
                let faceTextureDataUrl = null;
                
                // CRITICAL FIX: Face texture backup - handle different texture storage formats
                if (attachments.faceTexture && attachments.faceTexture !== 'PROCESSING') {
                    console.log('Face texture found in attachments, type:', typeof attachments.faceTexture);
                    console.log('Face texture constructor:', attachments.faceTexture.constructor.name);
                    
                    // Method 0: Direct string data URL (most common case)
                    if (typeof attachments.faceTexture === 'string') {
                        // CRITICAL FIX: Reject processing flags and short strings, only accept valid data URLs
                        if (attachments.faceTexture.startsWith('data:')) {
                            faceTextureDataUrl = attachments.faceTexture;
                            console.log('Captured face texture string data URL (method 0a), length:', faceTextureDataUrl.length);
                        } else if (attachments.faceTexture.length > 100 && !attachments.faceTexture.includes('TEXTURE_APPLIED')) {
                            // Assume it's a data URL without proper prefix - add it
                            faceTextureDataUrl = attachments.faceTexture;
                            console.log('Captured face texture string without prefix (method 0b), length:', faceTextureDataUrl.length);
                        } else {
                            console.log('Face texture string too short or is a processing flag, content preview:', attachments.faceTexture.substring(0, 100));
                            console.warn('⚠️ BACKUP ISSUE: Face texture backup contains flag instead of data URL:', attachments.faceTexture);
                        }
                    }
                    // Method 1: Direct CanvasTexture with image canvas
                    else if (attachments.faceTexture.image && attachments.faceTexture.image.toDataURL) {
                        faceTextureDataUrl = attachments.faceTexture.image.toDataURL();
                        console.log('Captured face texture canvas data URL (method 1), length:', faceTextureDataUrl.length);
                    }
                    // Method 2: CanvasTexture with image src
                    else if (attachments.faceTexture.image && attachments.faceTexture.image.src) {
                        faceTextureDataUrl = attachments.faceTexture.image.src;
                        console.log('Captured face texture image data URL (method 2), length:', faceTextureDataUrl.length);
                    }
                    // Method 3: Check if it's stored as a data URL object
                    else if (attachments.faceTexture.dataUrl) {
                        faceTextureDataUrl = attachments.faceTexture.dataUrl;
                        console.log('Captured face texture from dataUrl property (method 3), length:', faceTextureDataUrl.length);
                    }
                    // Method 4: Try to extract from material textures
                    else if (object.material && Array.isArray(object.material)) {
                        // Look for face texture in material array (face index 4)
                        const faceMaterial = object.material[4];
                        if (faceMaterial && faceMaterial.map && faceMaterial.map.image) {
                            if (faceMaterial.map.image.toDataURL) {
                                faceTextureDataUrl = faceMaterial.map.image.toDataURL();
                                console.log('Captured face texture from material[4] canvas (method 4), length:', faceTextureDataUrl.length);
                            } else if (faceMaterial.map.image.src) {
                                faceTextureDataUrl = faceMaterial.map.image.src;
                                console.log('Captured face texture from material[4] src (method 4), length:', faceTextureDataUrl.length);
                            }
                        }
                    }
                    
                    if (!faceTextureDataUrl) {
                        console.warn('Could not extract face texture data URL from attachments, texture will need regeneration');
                    }
                } else {
                    console.log('No face texture found in attachments or still processing');
                }
                
                state.attachments = {
                    hasInfoLabel: !!attachments.infoLabel,
                    hasFaceTexture: !!attachments.faceTexture && attachments.faceTexture !== 'PROCESSING',
                    faceTexture: faceTextureDataUrl ? { dataUrl: faceTextureDataUrl } : null
                };
                
                // CRITICAL DEBUG: Also store backup data globally for restoration debugging
                if (!window.storedObjectVisualStates) {
                    window.storedObjectVisualStates = {};
                }
                
                console.log('Final attachments state:', {
                    hasInfoLabel: state.attachments.hasInfoLabel,
                    hasFaceTexture: state.attachments.hasFaceTexture,
                    hasFaceTextureData: !!state.attachments.faceTexture
                });
            }

            // COMPOSITE OBJECT FIX: Capture children for composite objects (e.g., MP3 cylinders with metallic caps)
            if (object.children && object.children.length > 0) {
                console.log('Capturing', object.children.length, 'child objects');
                for (let i = 0; i < object.children.length; i++) {
                    const child = object.children[i];
                    if (child.geometry && child.material) { // Only capture mesh children
                        const childState = {
                            position: { x: child.position.x, y: child.position.y, z: child.position.z },
                            rotation: { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z },
                            scale: { x: child.scale.x, y: child.scale.y, z: child.scale.z },
                            geometry: {
                                type: child.geometry.type,
                                parameters: child.geometry.parameters ? { ...child.geometry.parameters } : {}
                            },
                            material: {
                                type: child.material.type,
                                color: child.material.color ? child.material.color.getHex() : 0x888888,
                                metalness: child.material.metalness || 0,
                                roughness: child.material.roughness || 0,
                                transparent: child.material.transparent || false,
                                opacity: child.material.opacity || 1,
                                hasTexture: !!child.material.map,
                                // For metallic caps with grip texture
                                textureType: child.material.map ? 'grip' : null
                            },
                            castShadow: child.castShadow,
                            receiveShadow: child.receiveShadow
                        };
                        state.children.push(childState);
                        console.log('Captured child', i, 'type:', child.geometry.type, 'material:', child.material.type);
                    }
                }
            }

            console.log('Visual state captured:', {
                position: state.position,
                hasAttachments: !!state.attachments,
                materialCount: state.material.materials.length,
                childrenCount: state.children.length,
                userData: Object.keys(state.userData)
            });

            // CRITICAL DEBUG: Store the visual state globally for debugging backup issues
            if (object.userData.id || object.userData.fileName) {
                const objectId = object.userData.id || object.userData.fileName;
                // Ensure the global object exists before using it
                if (!window.storedObjectVisualStates) {
                    window.storedObjectVisualStates = {};
                }
                window.storedObjectVisualStates[objectId] = state;
                console.log('🔧 DEBUG: Stored visual state in global window for:', objectId);
            }

            return state;
        }
        
        /**
         * Load texture asynchronously
         */
        async loadTextureAsync(textureDataUrl) {
            console.log('Loading texture async from URL, length:', textureDataUrl ? textureDataUrl.length : 'null');
            return new Promise((resolve, reject) => {
                const loader = new this.THREE.TextureLoader();
                loader.load(
                    textureDataUrl,
                    texture => {
                        console.log('Texture loaded successfully');
                        resolve(texture);
                    },
                    progress => {
                        console.log('Texture loading progress:', progress);
                    },
                    error => {
                        console.error('Error loading texture:', error);
                        reject(error);
                    }
                );
            });
        }
        
        /**
         * Notify Flutter about object deletion for undo snackbar
         */
        notifyFlutterObjectDeleted(objectId, objectName) {
            console.log('Notifying Flutter about object deletion:', objectId, objectName);
            
            // Send via message channel if available
            if (window.ObjectActionChannel && window.ObjectActionChannel.postMessage) {
                try {
                    window.ObjectActionChannel.postMessage(JSON.stringify({
                        action: 'objectDeleted',
                        id: objectId,
                        name: objectName
                    }));
                    console.log('Flutter notified via ObjectActionChannel about object deletion');
                    return;
                } catch (e) {
                    console.warn('Error notifying Flutter via ObjectActionChannel:', e);
                }
            }
            
            // Fallback: Set window flag for Flutter to detect
            window.lastDeletedObject = {
                id: objectId,
                name: objectName,
                timestamp: Date.now()
            };
            console.log('Set window.lastDeletedObject for Flutter detection');
        }
        
        /**
         * POSITION PERSISTENCE FIX: Restore contact positions after file creation
         */
        restoreContactPositions(contactPositions) {
            console.log('🔄 POSITION PERSISTENCE: Restoring contact positions');
            
            if (!window.app?.contactManager) {
                console.warn('ContactManager not available for position restoration');
                return;
            }
            
            const contactManager = window.app.contactManager;
            let restoredCount = 0;
            
            contactPositions.forEach((position, contactId) => {
                console.log(`📱 Attempting to restore position for contact ${contactId}:`, position);
                
                // Try to find contact by various ID formats
                let contact = contactManager.getContactById(contactId);
                
                // If not found by direct ID, try other formats
                if (!contact) {
                    // Try with contact:// prefix
                    if (!contactId.startsWith('contact://')) {
                        contact = contactManager.getContactById(`contact://${contactId}`);
                    }
                    
                    // Try searching through all contacts by data ID
                    if (!contact) {
                        const allContacts = contactManager.getAllContacts();
                        contact = allContacts.find(c => 
                            c.contactData?.id === contactId || 
                            c.contactData?.id === `contact://${contactId}` ||
                            (c.mesh && c.mesh.userData && 
                             (c.mesh.userData.contactId === contactId || 
                              c.mesh.userData.fileId === contactId))
                        );
                    }
                }
                
                if (contact && contact.mesh) {
                    // Restore the position
                    contact.mesh.position.set(position.x, position.y, position.z);
                    
                    // Mark as manually positioned to prevent auto-sorting
                    if (!contact.mesh.userData) contact.mesh.userData = {};
                    contact.mesh.userData.preservePosition = true;
                    contact.mesh.userData.preservePositionWorldType = window.app?.currentWorldTemplate?.getType() || 'unknown';
                    contact.mesh.userData.lastManualPosition = {
                        x: position.x,
                        y: position.y,
                        z: position.z,
                        timestamp: Date.now()
                    };
                    
                    restoredCount++;
                    console.log(`✅ Successfully restored position for contact ${contact.contactData?.name || contactId}`);
                } else {
                    console.warn(`❌ Could not find contact ${contactId} for position restoration`);
                }
            });
            
            console.log(`🔄 POSITION PERSISTENCE: Restored positions for ${restoredCount}/${contactPositions.size} contacts`);
        }
        
        /**
         * CHILD ELEMENT PERSISTENCE: Restore SMS and avatar states for contacts
         */
        restoreContactChildStates() {
            console.log('🔄 CHILD ELEMENT PERSISTENCE: Restoring SMS screens and avatars for contacts');
            
            let smsRestored = 0;
            let avatarsRestored = 0;
            
            // Restore SMS screens
            if (window.contactSMSStates && window.contactSMSStates.size > 0) {
                console.log(`📱 Restoring SMS screens for ${window.contactSMSStates.size} contacts`);
                
                setTimeout(() => {
                    window.contactSMSStates.forEach((state, contactId) => {
                        if (state.wasVisible && window.app?.contactManager) {
                            console.log(`📱 Restoring SMS screen for contact: ${contactId}`);
                            window.app.contactManager.restoreContactSMSScreen(contactId, true);
                            smsRestored++;
                        }
                    });
                    
                    // Clean up after restoration
                    window.contactSMSStates.clear();
                    console.log(`📱 Restored SMS screens for ${smsRestored} contacts`);
                }, 1000); // Delay to ensure contacts are fully loaded
            }
            
            // ENHANCED AVATAR RESTORATION: Check both stored states AND localStorage
            let avatarSources = [];
            
            // Check temporary stored states (from current session)
            if (window.contactAvatarStates && window.contactAvatarStates.size > 0) {
                console.log(`👤 Found ${window.contactAvatarStates.size} stored avatar states from current session`);
                avatarSources.push({
                    source: 'stored',
                    data: window.contactAvatarStates
                });
            }
            
            // Check localStorage for saved customizations (from previous sessions)
            let savedCustomizations = null;
            try {
                const saved = localStorage.getItem('contactAvatarCustomizations');
                if (saved) {
                    const data = JSON.parse(saved);
                    savedCustomizations = new Map(Object.entries(data));
                    console.log(`👤 Found ${savedCustomizations.size} saved avatar customizations in localStorage`);
                    avatarSources.push({
                        source: 'localStorage', 
                        data: savedCustomizations
                    });
                }
            } catch (error) {
                console.error('👤 Error reading saved customizations:', error);
            }
            
            if (avatarSources.length > 0) {
                console.log(`👤 Total avatar sources found: ${avatarSources.length}`);
                
                setTimeout(() => {
                    // Process each avatar source
                    avatarSources.forEach(source => {
                        console.log(`👤 Processing ${source.source} avatar data with ${source.data.size} entries`);
                        
                        source.data.forEach((state, contactId) => {
                            if (window.app?.contactManager) {
                                console.log(`👤 Attempting to restore avatar for contact: ${contactId} from ${source.source}`);
                                
                                // Check if contact exists in scene before attempting restoration
                                const contactExists = checkContactExistsInScene(contactId);
                                
                                if (!contactExists) {
                                    console.log(`👤 ⏸️ Skipping avatar restoration for ${contactId} - contact not found in scene (data preserved)`);
                                    return; // Skip this contact but preserve the data
                                }
                                
                                // For localStorage data, we need to format it properly
                                if (source.source === 'localStorage') {
                                    // Apply the saved customization directly
                                    if (window.ContactCustomizationManager?.instance) {
                                        const customizationManager = window.ContactCustomizationManager.instance;
                                        
                                        // Save the customization to the manager
                                        customizationManager.saveContactCustomization(contactId, state);
                                        
                                        // Apply the avatar
                                        customizationManager.updateContactAvatar(contactId);
                                        avatarsRestored++;
                                        console.log(`👤 Applied saved avatar customization for contact: ${contactId}`);
                                    } else {
                                        console.warn(`👤 ContactCustomizationManager not available for contact: ${contactId}`);
                                    }
                                } else {
                                    // For stored states, use the restoration method
                                    if (state.hadAvatar) {
                                        window.app.contactManager.restoreContactAvatar(contactId, true);
                                        avatarsRestored++;
                                        console.log(`👤 Restored stored avatar for contact: ${contactId}`);
                                    }
                                }
                            }
                        });
                    });
                    
                    // Clean up stored states after restoration
                    if (window.contactAvatarStates) {
                        window.contactAvatarStates.clear();
                    }
                    console.log(`👤 Completed avatar restoration: ${avatarsRestored} avatars restored`);
                }, 1500); // Slightly longer delay for avatars to ensure contact meshes are ready
            } else {
                console.log('👤 No avatar states or saved customizations found');
            }
            
            if (avatarSources.length === 0 && smsRestored === 0) {
                console.log('🔄 No SMS screens or avatars to restore');
            }
        }
    }
    
    // Helper function to check if a contact exists in the current scene
    function checkContactExistsInScene(contactId) {
        // Handle special explore avatar cases
        if (contactId === 'exploreAvatar' || contactId === 'EXPLORE_AVATAR') {
            // Explore avatar has special handling and doesn't need a scene object
            return true;
        }
        
        // Check if any object in the scene has this contact ID
        let contactExists = false;
        if (window.app?.scene) {
            window.app.scene.traverse((child) => {
                if (child.userData && 
                    (child.userData.contactId === contactId || 
                     child.userData.fileId === contactId ||
                     child.userData.id === contactId)) {
                    contactExists = true;
                }
            });
        }
        
        return contactExists;
    }
    
    // Export to window for global access
    window.FileObjectManager = FileObjectManager;
    console.log('FileObjectManager module loaded and exported to window');
    
})();
