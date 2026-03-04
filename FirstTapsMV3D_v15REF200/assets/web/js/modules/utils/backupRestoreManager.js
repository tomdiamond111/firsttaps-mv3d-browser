/**
 * BackupRestoreManager Module
 * Handles backup and restore functionality for file objects
 */

(function() {
    'use strict';
    
    class BackupRestoreManager {
        constructor(dependencies = {}) {
            this.stateManager = dependencies.stateManager;
            this.objectCreator = dependencies.objectCreator;
            this.scene = dependencies.scene;
            this.cameraControls = dependencies.cameraControls;
            this.billboardManager = dependencies.billboardManager;
            this.virtualObjectManager = dependencies.virtualObjectManager; // Add virtual object manager for app objects
            this.fileObjectManager = null; // Will be set by main application
            this.THREE = window.THREE;
            
            // Camera reset debounce mechanism
            this.cameraResetTimeout = null;
            this.cameraResetPending = false;
            
            console.log('BackupRestoreManager initialized');
        }
        
        /**
         * Set the file object manager reference
         */
        setFileObjectManager(fileObjectManager) {
            this.fileObjectManager = fileObjectManager;
        }
        
        /**
         * Restore objects from backup JSON data
         */
        restoreObjectsFromBackup(backupDataJson) {
            console.log('Restoring objects from backup');
            
            // CRITICAL FIX: Set restoration flag to prevent ContactManager from reloading deletion tracking
            window._worldRestorationInProgress = true;
            console.log('📱 WORLD RESTORATION STARTED - ContactManager will skip localStorage reload');
            
            // CRITICAL FIX: Clear ALL contact deletion tracking BEFORE world restoration
            // This prevents ContactManager initialization from reloading deleted IDs from localStorage
            try {
                if (window.deletedContactIds) {
                    const sizeBefore = window.deletedContactIds.size;
                    window.deletedContactIds.clear();
                    console.log('📱 CLEARED all contact deletion tracking for world restoration:', sizeBefore, '-> 0');
                }
                // CRITICAL: Also clear localStorage so ContactManager doesn't reload deleted IDs
                localStorage.removeItem('deletedContactIds');
                console.log('📱 CLEARED contact deletion tracking from localStorage for world restoration');
            } catch (error) {
                console.warn('📱 Failed to clear contact deletion tracking:', error);
            }
            
            try {
                const backupData = JSON.parse(backupDataJson);
                if (backupData.fileObjects && Array.isArray(backupData.fileObjects)) {
                    if (this.fileObjectManager) {
                        this.fileObjectManager.createFileObjects(backupData.fileObjects);
                    }
                }
            } catch (error) {
                console.error('Error restoring from backup:', error);
            } finally {
                // CRITICAL FIX: Clear restoration flag after restoration completes
                setTimeout(() => {
                    window._worldRestorationInProgress = false;
                    console.log('📱 WORLD RESTORATION COMPLETED - ContactManager can resume normal operations');
                }, 2000); // Give enough time for all objects to be created
            }
        }
        
        /**
         * Restore single object by ID with animation
         */
        async restoreObjectById(fileData) {
            console.log('=== RESTORING SINGLE OBJECT ===');
            console.log('File data:', fileData);
            console.log('restoreObjectById function called with:', JSON.stringify(fileData));
            
            try {
                // CRITICAL FIX: Merge backup data with minimal Flutter fileData
                const objectId = fileData.id || fileData.path;
                const backupData = this.fileObjectManager?.deletedObjectsBackup?.get(objectId);
                
                if (backupData && backupData.fileData) {
                    console.log('📦 Found backup data for object, merging with Flutter data...');
                    console.log('Original Flutter data:', JSON.stringify(fileData));
                    console.log('Backup fileData:', JSON.stringify(backupData.fileData));
                    
                    // Merge backup data with Flutter data, preferring backup for rich data and Flutter for position
                    fileData = {
                        ...backupData.fileData,  // Start with rich backup data
                        // Only override with specific Flutter data that we want to preserve
                        id: fileData.id || backupData.fileData.id,
                        name: fileData.name || backupData.fileData.name,
                        type: fileData.type || backupData.fileData.type,
                        // CRITICAL: Use Flutter's position (most recent) instead of backup position
                        x: fileData.x,
                        y: fileData.y, 
                        z: fileData.z,
                        // Preserve important backup fields that might be missing from Flutter
                        extension: backupData.fileData.extension || fileData.extension,
                        mimeType: backupData.fileData.mimeType || fileData.mimeType,
                        url: backupData.fileData.url || fileData.url,
                        thumbnailDataUrl: backupData.fileData.thumbnailDataUrl || fileData.thumbnailDataUrl,
                        linkType: backupData.fileData.linkType || fileData.linkType
                    };
                    
                    console.log('📦 Merged file data:', JSON.stringify(fileData));
                } else {
                    console.log('⚠️ No backup data found for object:', objectId);
                }
                
                // Check if object already exists
                const existingObject = this.stateManager.fileObjects.find(
                    obj => (obj.userData.id === fileData.id || obj.userData.id === fileData.path)
                );
                
                if (existingObject) {
                    console.log('Object already exists, skipping restore:', fileData.name);
                    return false;
                }
                
                // Ensure proper state before restoration
                this.stateManager.selectedObjectForMoveId = null;
                this.stateManager.movingObject = null;
                this.cameraControls.enabled = true;
                
                // WORLD TRANSITION CONSTRAINT SYSTEM: Check for Y-position conflicts
                const originalPosition = {
                    x: fileData.x || 0,
                    y: fileData.y || 0, 
                    z: fileData.z || 0
                };
                
                // UNDO DELETE FIX: Skip world constraints for undo restoration - restore exact position
                let targetPosition = originalPosition;
                console.log('UNDO DELETE: Bypassing world constraints, using exact original position:', originalPosition);
                
                console.log('Original position:', originalPosition);
                console.log('Target position (exact restoration):', targetPosition);
                
                // Create restored object
                const object = await this.createRestoredObject(fileData, targetPosition);
                
                if (object) {
                    console.log('Successfully restored object:', fileData.name);
                    
                    // Add to scene and state
                    this.scene.add(object);
                    this.stateManager.fileObjects.push(object);
                    
                    // Initialize world state
                    this.stateManager.initializeObjectWorldState(object);
                    
                    // Get backup data for face texture restoration
                    const objectId = fileData.id || fileData.path;
                    const backupData = this.fileObjectManager?.deletedObjectsBackup?.get(objectId);
                    const wasRestoredFromVisualState = backupData && backupData.visualState;
                    let hadFaceTextures = wasRestoredFromVisualState && 
                        backupData.visualState.attachments && 
                        backupData.visualState.attachments.hasFaceTexture;
                    
                    // CRITICAL FIX: App objects should preserve face textures if they are link objects with thumbnails
                    const isAppObject = fileData.extension === 'app' || 
                                       (fileData.id && fileData.id.startsWith('app_')) ||
                                       (fileData.path && fileData.path.startsWith('app_'));
                    
                    // Check if this is a link object (with or without thumbnail data) that should get visual enhancements
                    const isLinkObject = isAppObject && 
                        (fileData.thumbnailDataUrl || fileData.thumbnailUrl || fileData.url || 
                         fileData.id?.includes('link') || fileData.path?.includes('link') ||
                         (backupData && backupData.fileData && 
                          (backupData.fileData.thumbnailDataUrl || backupData.fileData.thumbnailUrl || 
                           backupData.fileData.url || backupData.fileData.id?.includes('link'))));
                    
                    // Legacy name for compatibility
                    const isLinkObjectWithThumbnail = isLinkObject;
                    
                    if (isAppObject && !isLinkObjectWithThumbnail) {
                        console.log('=== APP OBJECT DETECTED - DISABLING FACE TEXTURE PROCESSING ===');
                        hadFaceTextures = false; // Force disable face texture processing for regular app objects
                        console.log('App object will preserve its original blue material and app icon texture');
                    } else if (isLinkObjectWithThumbnail) {
                        console.log('=== LINK OBJECT WITH THUMBNAIL DETECTED - PRESERVING FACE TEXTURES ===');
                        console.log('Link object will keep its thumbnail image face texture');
                        // Keep hadFaceTextures as determined from backup data
                    }
                    
                    // Debug backup data structure
                    console.log('=== BACKUP DATA ANALYSIS ===');
                    console.log('Object ID:', objectId);
                    console.log('Is App Object:', isAppObject);
                    console.log('Is Link Object with Thumbnail:', isLinkObjectWithThumbnail);
                    console.log('Backup data exists:', !!backupData);
                    console.log('Visual state exists:', !!wasRestoredFromVisualState);
                    if (backupData && backupData.visualState && backupData.visualState.attachments) {
                        console.log('Attachments data:', backupData.visualState.attachments);
                        console.log('Has face texture flag:', backupData.visualState.attachments.hasFaceTexture);
                    }
                    console.log('Had face textures decision (after app object check):', hadFaceTextures);
                    
                    // CRITICAL: Clear any processed texture tracking for this object to allow fresh texture processing
                    console.log('=== UNDELETE: Clearing texture processing flags ===');
                    this.stateManager.processedTextureObjects.delete(object.uuid);
                    this.stateManager.processedTextureObjects.delete(objectId);
                    this.stateManager.processedTextureObjects.delete(fileData.name);
                    
                    // Clear any existing attachment data to force fresh processing
                    if (this.stateManager.labelObjectsMap.has(object.uuid)) {
                        const existingAttachments = this.stateManager.labelObjectsMap.get(object.uuid);
                        if (existingAttachments.faceTexture) {
                            console.log('Clearing existing face texture attachment for fresh processing');
                            delete existingAttachments.faceTexture;
                        }
                        this.stateManager.labelObjectsMap.set(object.uuid, existingAttachments);
                    }
                    
                    // CRITICAL FIX: For restored objects with face textures, ACTUALLY restore them from backup data
                    // For undo operations, ALWAYS restore from backup even for contacts
                    if (hadFaceTextures && backupData && backupData.visualState && backupData.visualState.attachments) {
                        // For undo operations, restore backup visual state even for contacts
                        if (fileData.isUndo && object.userData && object.userData.subType === 'contact') {
                            console.log('=== UNDO OPERATION: RESTORING BACKUP VISUAL STATE FOR CONTACT ===');
                            console.log('Undo delete - restoring contact face textures from backup');
                            
                            try {
                                // Actually restore face textures from the backup data for undo
                                await this.restoreFaceTexturesFromBackup(object, backupData.visualState.attachments, fileData);
                                
                                // Update billboard info after face texture restoration
                                console.log('=== UNDELETE: Updating billboard info after face texture restoration ===');
                                const normalizedFileData = { ...fileData };
                                if (normalizedFileData.extension && !normalizedFileData.extension.startsWith('.')) {
                                    normalizedFileData.extension = '.' + normalizedFileData.extension;
                                }
                                this.billboardManager.updateBillboardOnly(object, normalizedFileData);
                                
                            } catch (error) {
                                console.error('Failed to restore face textures from backup for undo, falling back to ContactManager:', error);
                                // If backup restoration fails, fall back to normal contact handling
                                console.log('=== UNDO FALLBACK: Using ContactManager for contact restoration ===');
                            }
                        } else if (object.userData && object.userData.subType === 'contact') {
                            console.log('=== NORMAL RESTORE: SKIPPING BACKUP FACE TEXTURE RESTORATION FOR CONTACT ===');
                            console.log('Contact already has proper face texture from ContactManager');
                        } else {
                            console.log('=== RESTORED OBJECT HAD FACE TEXTURES - RESTORING FROM BACKUP ===');
                            console.log('Restoring face textures from backup data');
                            
                            try {
                            // Actually restore face textures from the backup data
                            await this.restoreFaceTexturesFromBackup(object, backupData.visualState.attachments, fileData);
                            
                                // Update billboard info after face texture restoration
                                console.log('=== UNDELETE: Updating billboard info after face texture restoration ===');
                                const normalizedFileData = { ...fileData };
                                if (normalizedFileData.extension && !normalizedFileData.extension.startsWith('.')) {
                                    normalizedFileData.extension = '.' + normalizedFileData.extension;
                                }
                                this.billboardManager.updateBillboardOnly(object, normalizedFileData);
                                
                            } catch (error) {
                                console.error('Failed to restore face textures from backup, falling back to regeneration:', error);
                                // If face texture restoration fails, fall back to regeneration
                                console.log('=== UNDELETE: Falling back to fresh face texture generation ===');
                                
                                // CRITICAL FIX: Ensure normalizedFileData is defined for fallback
                                const normalizedFileData = { ...fileData };
                                if (normalizedFileData.extension && !normalizedFileData.extension.startsWith('.')) {
                                    normalizedFileData.extension = '.' + normalizedFileData.extension;
                                }
                                
                                await this.billboardManager.updateObjectVisuals(object, normalizedFileData);
                            }
                        }
                        
                        // CRITICAL: Additional camera reset after texture processing
                        setTimeout(() => {
                            this.resetCameraControlsAfterRestore();
                            console.log('Additional camera reset after texture processing completed');
                        }, 200);
                    } else {
                        console.log('=== UNDELETE: Updating object visuals (no previous face textures) ===');
                        console.log('File data for visuals:', {
                            name: fileData.name,
                            id: fileData.id,
                            hasThumbnail: !!fileData.thumbnailDataUrl,
                            thumbnailLength: fileData.thumbnailDataUrl ? fileData.thumbnailDataUrl.length : 0,
                            hadFaceTextures: hadFaceTextures
                        });
                        
                        // CRITICAL FIX: Skip visual updates for regular app objects, but allow for link objects with thumbnails
                        if (isAppObject && !isLinkObjectWithThumbnail) {
                            console.log('=== UNDELETE: Skipping visual updates for regular app object - preserving original app materials ===');
                            console.log('Regular app object already has proper blue material and app icon texture');
                        } else if (isLinkObjectWithThumbnail) {
                            console.log('=== UNDELETE: Link object with thumbnail - preserving face texture from createAppObject ===');
                            console.log('Link object should already have its thumbnail face texture applied during creation');
                            // For link objects, the createAppObject call should have already applied the thumbnail
                            // We don't need to update visuals again as it might override the thumbnail
                        } else {
                            // CRITICAL FIX: Ensure fileData extension is normalized for face texture color matching
                            const normalizedFileData = { ...fileData };
                            if (normalizedFileData.extension && !normalizedFileData.extension.startsWith('.')) {
                                normalizedFileData.extension = '.' + normalizedFileData.extension;
                                console.log('Normalized extension for face texture:', normalizedFileData.extension);
                            }
                            
                            // Update visuals through billboard manager (this handles face textures properly)
                            this.billboardManager.updateObjectVisuals(object, normalizedFileData);
                        }
                        
                        // CRITICAL: Single camera reset after texture processing (removed redundant call)
                        setTimeout(() => {
                            this.resetCameraControlsAfterRestore();
                            console.log('Single camera reset after texture processing completed');
                        }, 250); // Slightly longer delay to ensure all processing is complete
                    }
                    
                    // PHASE 5A: Restore link visual enhancements for link objects
                    if (isLinkObjectWithThumbnail && window.app && window.app.linkVisualManager) {
                        try {
                            console.log('🎨 Restoring link visual enhancements for restored link object...');
                            
                            // Extract link data from the restored object
                            // CRITICAL: Use original URL, not thumbnail URL for branding and enhancements
                            const originalUrl = (object.userData.fileData && object.userData.fileData.url) || 
                                               object.userData.url || 
                                               fileData.url;
                            
                            const linkData = {
                                url: originalUrl,
                                title: fileData.name || fileData.fileName,
                                name: fileData.name || fileData.fileName
                            };
                            
                            console.log('🔧 Restoration using original URL:', originalUrl);
                            
                            // Store the original enhancement state if it exists
                            const originalEnhancement = object.userData.visualEnhancement;
                            
                            // Apply visual enhancements asynchronously (non-blocking)
                            setTimeout(async () => {
                                try {
                                    // Reset enhancement flag to force re-enhancement
                                    if (object.userData.visualEnhancement) {
                                        object.userData.visualEnhancement.enhanced = false;
                                    }
                                    
                                    await window.app.linkVisualManager.enhanceLinkObject(object, linkData);
                                    console.log('✅ Link visual enhancements restored successfully');
                                } catch (enhancementError) {
                                    console.warn('⚠️ Error restoring link visual enhancements:', enhancementError);
                                    // Try to restore original enhancement state if restoration failed
                                    if (originalEnhancement) {
                                        object.userData.visualEnhancement = originalEnhancement;
                                    }
                                }
                            }, 50);
                            
                        } catch (error) {
                            console.warn('Error setting up link enhancement restoration:', error);
                        }
                    }
                    
                    // Clean up backup data for this object
                    if (this.fileObjectManager?.deletedObjectsBackup) {
                        this.fileObjectManager.deletedObjectsBackup.delete(objectId);                        console.log('Cleaned up backup data for restored object');
                    }
                    
                    // Flash animation disabled to prevent interference with texture restoration
                    console.log('Object restoration completed, flash animation disabled to prevent texture interference');
                    
                    // CRITICAL: Single camera controls reset after object restoration (removed redundant call)
                    this.resetCameraControlsAfterRestore();
                    
                    // CRITICAL FIX: Notify Flutter about the restored object's position
                    // This ensures the position gets saved to Flutter's persistence system
                    if (window.ObjectMovedChannel && window.ObjectMovedChannel.postMessage) {
                        const moveData = {
                            id: object.userData.id,
                            x: object.position.x,
                            y: object.position.y,
                            z: object.position.z
                        };
                        console.log('🔄 RESTORE POSITION FIX: Notifying Flutter of restored position:', moveData);
                        window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                    }
                    
                    // REMOVED: Post-restoration visual enhancement check as it causes duplicate enhancements
                    // Visual enhancements are already applied during object restoration above
                    
                    return true;
                } else {
                    console.error('Failed to create restored object');
                    return false;
                }
                
            } catch (error) {
                console.error('Error during object restoration:', error);
                return false;
            }
        }
        
        /**
         * Create restored object with preserved properties
         */
        async createRestoredObject(fileData, position) {
            console.log('Creating restored object with preserved properties');
            console.log('File data for restoration:', fileData);
            console.log('Thumbnail data URL available:', !!fileData.thumbnailDataUrl, 'length:', fileData.thumbnailDataUrl ? fileData.thumbnailDataUrl.length : 0);
            
            // Create object using the standard creation method to ensure consistency
            const objectId = fileData.id || fileData.path;
            const backupData = this.fileObjectManager?.deletedObjectsBackup?.get(objectId);
            
            let object;
            
            // CRITICAL FIX: Detect app objects first and handle them specially
            const isAppObject = fileData.extension === 'app' || 
                               (fileData.id && fileData.id.startsWith('app_')) ||
                               (fileData.path && fileData.path.startsWith('app_'));
            
            console.log('DEBUG: App object detection - extension:', fileData.extension, 'id:', fileData.id, 'isApp:', isAppObject);
            
            if (isAppObject) {
                console.log('=== APP OBJECT RESTORATION ===');
                console.log('App object detected - using virtual object creator for proper app material');
                
                // Extract package name for proper app creation
                const packageName = fileData.id ? fileData.id.replace('app_', '').replace('app://', '') : 
                                  (fileData.path ? fileData.path.replace('app_', '').replace('app://', '') : 'unknown');
                                  
                const appData = {
                    name: fileData.name,
                    packageName: packageName
                };
                
                // CRITICAL FIX: Extract URL from mimeType field for link objects
                let extractedUrl = null;
                if (fileData.mimeType && fileData.mimeType.startsWith('link:')) {
                    extractedUrl = fileData.mimeType.substring(5); // Remove 'link:' prefix
                    console.log('=== EXTRACTED URL FROM MIMETYPE ===');
                    console.log('MimeType field:', fileData.mimeType);
                    console.log('Extracted URL:', extractedUrl);
                }
                
                // Check if this is a link object with thumbnail data (check backup data too)
                const backupData = this.fileObjectManager?.deletedObjectsBackup?.get(fileData.id || fileData.path);
                const hasThumbnailData = fileData.thumbnailDataUrl || extractedUrl || fileData.url || fileData.thumbnailUrl ||
                    (backupData && backupData.fileData && 
                     (backupData.fileData.thumbnailDataUrl || backupData.fileData.url || backupData.fileData.thumbnailUrl));
                
                if (hasThumbnailData || extractedUrl) {
                    console.log('=== LINK OBJECT RESTORATION WITH URL DATA ===');
                    // Prioritize extracted URL from mimeType, then other sources
                    appData.url = extractedUrl || fileData.url || (backupData && backupData.fileData && backupData.fileData.url);
                    appData.thumbnailUrl = fileData.thumbnailDataUrl || fileData.thumbnailUrl ||
                        (backupData && backupData.fileData && (backupData.fileData.thumbnailDataUrl || backupData.fileData.thumbnailUrl));
                    appData.linkType = fileData.linkType || (backupData && backupData.fileData && backupData.fileData.linkType) || 'web';
                    appData.title = fileData.title || fileData.name;
                    console.log('Link object data:', appData);
                    console.log('Final URL:', appData.url);
                    console.log('Thumbnail URL:', appData.thumbnailUrl);
                }
                
                console.log('Creating app object with data:', appData, 'at position:', position);
                
                // Use the virtual object creator to get proper app styling
                const virtualObjectCreator = this.virtualObjectManager?.virtualObjectCreator;
                if (virtualObjectCreator) {
                    object = virtualObjectCreator.createAppObject(appData, position);
                    console.log('App object created with proper materials and styling');
                    
                    // CRITICAL: Ensure original URL is preserved in userData for later enhancement
                    if (appData.url && object) {
                        object.userData.url = appData.url;
                        object.userData.linkType = appData.linkType;
                        console.log('🔧 Set original URL in userData after creation:', appData.url);
                    }
                } else {
                    console.warn('Virtual object creator not available, falling back to basic creation');
                    // Fallback to basic creation if virtual object creator not available
                    object = this.objectCreator.createObjectByType(
                        fileData.extension,
                        position,
                        fileData.name,  
                        fileData.id || fileData.path
                    );
                }
            } else {
                // Handle non-app objects with existing logic
                // CRITICAL FIX: Complex objects (cylinders, composite meshes) must ALWAYS use the standard object creator
                // The visual state capture only records the main mesh, not all child components like caps, buttons, etc.
                const normalizedExtension = fileData.extension ? fileData.extension.toLowerCase() : '';
                // Handle both .mp3 and mp3 formats
                const extensionForCheck = normalizedExtension.startsWith('.') ? normalizedExtension : '.' + normalizedExtension;
                // CRITICAL FIX: Include image/GIF files as complex objects to ensure they get metallic caps
                const isComplexObject = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.mp4', '.mov', '.avi', '.webm', '.mkv', '.pdf', '.gif', '.jpg', '.jpeg', '.png', '.bmp', '.webp'].includes(extensionForCheck);
                
                console.log('DEBUG: Extension detection - original:', fileData.extension, 'normalized:', normalizedExtension, 'forCheck:', extensionForCheck, 'isComplex:', isComplexObject);
                
                if (extensionForCheck === '.pdf') {
                    console.log('=== PDF DETECTED FOR COMPLEX RESTORATION ===');
                    console.log('PDF will be restored using object creator to include metallic caps');
                }
                
                // For complex objects, ALWAYS use the object creator to get the full composite structure
                if (isComplexObject) {
                console.log('=== COMPLEX OBJECT RESTORATION ===');
                console.log('Complex object type detected:', normalizedExtension, '- using standard object creator to ensure full composite structure');
                console.log('Creating object with params:', {
                    extension: fileData.extension,
                    position: position,
                    name: fileData.name,
                    id: fileData.id || fileData.path
                });
                
                object = this.objectCreator.createObjectByType(
                    fileData.extension,
                    position,
                    fileData.name,  
                    fileData.id || fileData.path
                );
                
                console.log('Complex object created:', !!object);
                if (object) {
                    console.log('Object has children:', object.children.length);
                    object.children.forEach((child, index) => {
                        console.log(`Child ${index}:`, child.geometry?.type, child.material?.type);
                    });
                }
                
                // If we have backup visual state with face textures, we'll restore those separately
                if (backupData && backupData.visualState && backupData.visualState.attachments) {
                    console.log('Will restore face textures after object creation');
                    object.userData.needsFaceTextureRestore = true;
                    object.userData.backupAttachments = backupData.visualState.attachments;
                }
                
            } else if (backupData && backupData.visualState) {
                console.log('Simple object with stored visual state, restoring with original appearance');
                
                // CONTACT OBJECT FIX: Check if this is a contact object and restore it properly
                if (backupData.visualState.userData && backupData.visualState.userData.subType === 'contact') {
                    console.log('=== CONTACT OBJECT RESTORATION DETECTED ===');
                    console.log('Contact object data:', backupData.visualState.userData);
                    console.log('Visual state position:', backupData.visualState.position);
                    console.log('FileData position:', {x: fileData.x, y: fileData.y, z: fileData.z});
                    
                    // CRITICAL FIX: Use visual state position (last moved position) not fileData position (original position)
                    const lastPosition = backupData.visualState.position;
                    console.log('Using last moved position for contact restoration:', lastPosition);
                    
                    // CRITICAL FIX: Extract actual contact ID from contact:// prefix
                    let contactId = backupData.visualState.userData.contactId || fileData.id;
                    if (typeof contactId === 'string' && contactId.startsWith('contact://')) {
                        contactId = contactId.substring(10); // Remove 'contact://' prefix
                        console.log('📱 Extracted contact ID from contact:// prefix:', contactId);
                    }
                    
                    // Restore contact object using the contact manager
                    if (window.app && window.app.contactManager) {
                        console.log('Creating contact via ContactManager (for proper restoration)');
                        const contactData = {
                            id: contactId,
                            name: backupData.visualState.userData.fileName || fileData.name,
                            phoneNumber: backupData.visualState.userData.phoneNumber || fileData.cameraModel || '',
                            avatar: backupData.visualState.userData.avatar || null,
                            position: {
                                x: lastPosition.x,
                                y: lastPosition.y,
                                z: lastPosition.z
                            }
                        };
                        
                        // CRITICAL FIX: Remove existing contact first to avoid ID conflicts
                        if (window.app.contactManager.contacts.has(contactData.id)) {
                            console.log('📱 Removing existing contact before restoration:', contactData.id);
                            window.app.contactManager.contacts.delete(contactData.id);
                        }
                        
                        // CRITICAL FIX: Clear deletion tracking BEFORE attempting contact creation
                        if (window.deletedContactIds) {
                            // Log the current deleted IDs before removal
                            console.log('📱 Current deleted contact IDs:', Array.from(window.deletedContactIds));
                            console.log('📱 Contact data to restore:', {
                                id: contactData.id,
                                name: contactData.name,
                                phoneNumber: contactData.phoneNumber
                            });
                            
                            // CRITICAL: Clear ALL deletion tracking - aggressive approach for restoration
                            const sizeBefore = window.deletedContactIds.size;
                            
                            // Clear the exact contact data being restored
                            window.deletedContactIds.delete(contactData.id);
                            window.deletedContactIds.delete(contactData.name);
                            window.deletedContactIds.delete(contactData.phoneNumber);
                            window.deletedContactIds.delete(`contact://${contactData.id}`);
                            window.deletedContactIds.delete(`contact://${contactData.phoneNumber}`);
                            
                            // CRITICAL: Also try all possible file ID formats that might be in deletion tracking
                            if (fileData && fileData.id) {
                                window.deletedContactIds.delete(fileData.id);
                                window.deletedContactIds.delete(fileData.path);
                                window.deletedContactIds.delete(fileData.name);
                            }
                            
                            // AGGRESSIVE: Try numeric ID variations
                            const numericId = contactData.id.toString();
                            window.deletedContactIds.delete(numericId);
                            window.deletedContactIds.delete(parseInt(numericId));
                            
                            // SAVE TO LOCALSTORAGE for persistence
                            try {
                                const deletedArray = Array.from(window.deletedContactIds);
                                localStorage.setItem('deletedContactIds', JSON.stringify(deletedArray));
                                console.log('📱 Saved updated deletion tracking to localStorage');
                            } catch (error) {
                                console.warn('📱 Failed to save deletion tracking:', error);
                            }
                            
                            const sizeAfter = window.deletedContactIds.size;
                            
                            console.log('📱 Removed contact from deleted tracking for restoration:', contactData.id);
                            console.log('📱 Deleted IDs size changed from', sizeBefore, 'to', sizeAfter);
                            console.log('📱 Updated deleted contact IDs:', Array.from(window.deletedContactIds));
                        }
                        
                        // Use addContact (for proper visual state) instead of createContactObject
                        // to ensure SMS screens and avatars are properly restored
                        const contactObject = window.app.contactManager.addContact(contactData);
                        
                        if (contactObject && contactObject.mesh) {
                            object = contactObject.mesh; // Get the contact mesh
                            console.log('Contact object restored for undo:', object.userData.fileName);
                        } else {
                            console.error('❌ ContactManager failed to create contact object');
                            console.log('Contact data was:', contactData);
                            console.log('Deletion check should have passed after clearing tracking');
                            // Create fallback contact object
                            object = this.objectCreator.createObjectByType(
                                fileData.extension,
                                position,
                                fileData.name,  
                                fileData.id || fileData.path
                            );
                        }
                        
                        // NOTE: SMS and avatar restoration is now handled automatically by addContact method
                        console.log('📱 Contact visual state restoration delegated to ContactManager.addContact');
                        
                        // CRITICAL FIX: Skip face texture restoration from backup for contacts
                        // because ContactManager.addContact already applies the correct face texture
                        console.log('=== SKIPPING BACKUP FACE TEXTURE RESTORATION FOR CONTACT ===');
                        console.log('Contact already has proper face texture from ContactManager');
                        
                        // Skip any further face texture processing
                        object.userData.skipBackupFaceTexture = true;
                        
                        return object; // Return early to skip generic restoration logic
                    } else {
                        console.error('ContactManager not available, falling back to default object');
                        object = this.objectCreator.createObjectByType(
                            fileData.extension,
                            position,
                            fileData.name,  
                            fileData.id || fileData.path
                        );
                    }
                } else {
                    // Regular object restoration
                    object = await this.recreateObjectFromVisualState(backupData.visualState, position, fileData);
                }
            } else {
                console.log('Simple object, no stored visual state - creating new object by type');
                object = this.objectCreator.createObjectByType(
                    fileData.extension,
                    position,
                    fileData.name,  
                    fileData.id || fileData.path
                );
            }
            } // End of else block for non-app objects
            
            // CRITICAL: Store the proper base color for face texture restoration
            if (object && object.material) {
                if (isAppObject) {
                    // App objects use special blue color scheme
                    object.userData.originalBaseColor = 0x4A90E2; // Blue color for apps
                    console.log('Stored original base color for restored app object: 4A90E2 (blue)');
                } else {
                    // Ensure extension has dot prefix for proper color lookup
                    let normalizedExtension = fileData.extension;
                    if (normalizedExtension && !normalizedExtension.startsWith('.')) {
                        normalizedExtension = '.' + normalizedExtension;
                    }
                    const colorHex = this.objectCreator.getColorByExtension(normalizedExtension);
                    object.userData.originalBaseColor = colorHex;
                    console.log('Stored original base color for restored object:', colorHex.toString(16));
                }
            }
            
            if (object) {
                // CRITICAL FIX: For link objects, ensure URL is properly set in userData for interaction
                if (isAppObject) {
                    // Extract URL from mimeType field for link objects
                    let extractedUrl = null;
                    if (fileData.mimeType && fileData.mimeType.startsWith('link:')) {
                        extractedUrl = fileData.mimeType.substring(5); // Remove 'link:' prefix
                        console.log('=== SETTING URL IN USERDATA FOR INTERACTION ===');
                        console.log('Extracted URL:', extractedUrl);
                        
                        // Set URL in object userData so LinkInteractionManager can access it
                        object.userData.url = extractedUrl;
                        object.userData.linkType = fileData.linkType || 'web';
                        
                        // Also check for URL in backup data
                        const backupUrl = backupData && backupData.fileData && backupData.fileData.url;
                        if (backupUrl && !object.userData.url) {
                            object.userData.url = backupUrl;
                            console.log('Used backup URL:', backupUrl);
                        }
                        
                        console.log('Final object.userData.url:', object.userData.url);
                    }
                }
                
                // Ensure proper userData is set with thumbnail data - prefer captured data from backup
                const backupThumbnailData = backupData && backupData.visualState ? 
                    backupData.visualState.thumbnailDataUrl : null;
                const backupFileData = backupData && backupData.visualState ? 
                    backupData.visualState.fileData : null;
                
                // CRITICAL FIX: Always prefer complete backup fileData over simplified Flutter data
                // The backup contains the complete original metadata (file size, dates, etc.)
                const completeFileData = backupData && backupData.fileData ? backupData.fileData : null;
                
                object.userData.thumbnailDataUrl = backupThumbnailData || fileData.thumbnailDataUrl;
                object.userData.fileData = completeFileData || backupFileData || fileData;
                
                console.log('FILEDATA RESTORATION DEBUG:');
                console.log('  - Flutter fileData size:', fileData.size || 'undefined');
                console.log('  - Backup fileData size:', (completeFileData && completeFileData.size) || 'undefined');
                console.log('  - Final fileData size:', (object.userData.fileData && object.userData.fileData.size) || 'undefined');
                console.log('  - Final fileData lastModified:', (object.userData.fileData && object.userData.fileData.lastModified) || 'undefined');
                
                // CRITICAL: Ensure the fileData has the correct original Y position for stacking logic
                if (object.userData.fileData && !object.userData.fileData.y && fileData.y) {
                    object.userData.fileData.y = fileData.y;
                    console.log('Set original Y position in userData.fileData:', fileData.y);
                }
                
                console.log('Restored object userData set with backup thumbnail:', !!backupThumbnailData);
                console.log('Restored object userData set with fileData thumbnail:', !!fileData.thumbnailDataUrl);
                console.log('Final restored object thumbnail data:', !!object.userData.thumbnailDataUrl);
                console.log('Final userData.fileData.y:', object.userData.fileData?.y);
                console.log('Restored object created successfully:', fileData.name, 'at position:', position);
            }
            
            return object;
        }
        
        /**
         * Create texture from stored data
         */
        createTextureFromData(textureData) {
            if (textureData.dataUrl) {
                const loader = new this.THREE.TextureLoader();
                return loader.load(textureData.dataUrl);
            }
            return null;
        }
        
        /**
         * Recreate object from stored visual state
         */
        async recreateObjectFromVisualState(visualState, position, fileData) {
            console.log('Recreating object from visual state:', visualState);
            
            let object;
            
            // Recreate geometry
            let geometry;
            const geomParams = visualState.geometry.parameters;
            
            switch (visualState.geometry.type) {
                case 'BoxGeometry':
                    geometry = new this.THREE.BoxGeometry(
                        geomParams.width || 1,
                        geomParams.height || 1,
                        geomParams.depth || 1
                    );
                    break;
                case 'CylinderGeometry':
                    geometry = new this.THREE.CylinderGeometry(
                        geomParams.radiusTop || 0.5,
                        geomParams.radiusBottom || 0.5,
                        geomParams.height || 1,
                        geomParams.radialSegments || 8
                    );
                    break;
                case 'PlaneGeometry':
                    geometry = new this.THREE.PlaneGeometry(
                        geomParams.width || 1,
                        geomParams.height || 1
                    );
                    break;
                default:
                    // Fallback to default creation
                    console.log('Unknown geometry type, falling back to object creator');
                    return this.objectCreator.createObjectByType(
                        fileData.extension,
                        position,
                        fileData.name,
                        fileData.id || fileData.path
                    );
            }
            
            // Recreate material(s) - handle both single and multi-material arrays
            let material;
            console.log('Recreating materials, isArray:', visualState.material.isArray, 'materials count:', visualState.material.materials.length);
            
            // CRITICAL: Get the correct base color for this file type
            // Ensure extension has dot prefix
            let normalizedExtension = fileData.extension;
            if (normalizedExtension && !normalizedExtension.startsWith('.')) {
                normalizedExtension = '.' + normalizedExtension;
            }
            const correctBaseColor = this.objectCreator.getColorByExtension(normalizedExtension);
            console.log('Using correct base color for all materials:', correctBaseColor.toString(16));
            
            if (visualState.material.isArray && visualState.material.materials.length > 1) {
                console.log('Restoring multi-material array');
                // Restore multi-material array (with face textures)
                const materials = [];
                for (let i = 0; i < visualState.material.materials.length; i++) {
                    const matData = visualState.material.materials[i];
                    console.log(`Processing material ${i}:`, matData);
                    let restoredMaterial;
                    
                    if (matData.hasTexture && matData.textureDataUrl) {
                        console.log(`Material ${i} has texture, loading...`);
                        // Load texture async and wait for it
                        const texture = await this.loadTextureAsync(matData.textureDataUrl);
                        restoredMaterial = new this.THREE.MeshStandardMaterial({
                            map: texture, // texture will be null if loading failed
                            metalness: matData.metalness || 0.3,
                            roughness: matData.roughness || 0.6,
                            transparent: matData.transparent || false,
                            opacity: matData.opacity || 1,
                            depthTest: true,
                            depthWrite: true
                        });
                        console.log(`Material ${i} created with texture:`, texture ? 'loaded' : 'failed');
                    } else {
                        // Use correct base color instead of saved color which might be wrong  
                        console.log(`Material ${i} using correct base color:`, correctBaseColor);
                        // Restore material with CORRECT color from getColorByExtension
                        const MaterialType = matData.type === 'MeshStandardMaterial' ? 
                            this.THREE.MeshStandardMaterial : this.THREE.MeshLambertMaterial;
                        restoredMaterial = new MaterialType({
                            color: correctBaseColor, // Use correct color instead of saved color
                            metalness: matData.metalness || 0.3,
                            roughness: matData.roughness || 0.6,
                            transparent: matData.transparent || false,
                            opacity: matData.opacity || 1
                        });
                    }
                    
                    materials.push(restoredMaterial);
                }
                material = materials;
                console.log('Multi-material array restored with', materials.length, 'materials');
            } else {
                console.log('Restoring single material');
                // Restore single material  - use the correct base color from getColorByExtension
                console.log('Using correct base color for restored single material:', correctBaseColor.toString(16));
                
                // Create with proper base color instead of using saved color which might be wrong
                material = new this.THREE.MeshLambertMaterial({
                    color: correctBaseColor,
                    depthTest: true,
                    depthWrite: true
                });
                console.log('Single material restored with correct base color');
            }
            
            // Create mesh
            object = new this.THREE.Mesh(geometry, material);
            
            // Restore position
            object.position.set(position.x, position.y, position.z);
            
            // Restore userData with proper file info
            object.userData = { ...visualState.userData };
            object.userData.fileData = fileData; // Use the passed fileData which has all the correct properties
            object.userData.thumbnailDataUrl = fileData.thumbnailDataUrl;
            
            // CRITICAL: Store the correct base color for face texture application
            object.userData.originalBaseColor = correctBaseColor;
            console.log('Stored correct original base color for restored object:', correctBaseColor.toString(16));
            
            console.log('Object recreated from visual state successfully');
            return object;
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
         * Flash animation for restored objects
         */
        flashObjectRestored(object) {
            console.log('Starting flash animation for restored object:', object.userData.fileName || object.name);
            
            if (!object.material) {
                console.warn('Object has no material, cannot flash');
                return;
            }
            
            // Store the original material
            const originalMaterial = object.material;
            let flashCount = 0;
            const maxFlashes = 6;
            const flashDuration = 250;
            
            const flashMaterial = new this.THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.9
            });
            
            const flashCycle = () => {
                if (flashCount >= maxFlashes) {
                    object.material = originalMaterial;
                    console.log('Flash animation completed for restored object');
                    return;
                }
                
                object.material = (flashCount % 2 === 0) ? flashMaterial : originalMaterial;
                flashCount++;
                setTimeout(flashCycle, flashDuration);
            };
            
            setTimeout(flashCycle, 100);
        }
        
        /**
         * Reset camera controls after restore operation to prevent freezing
         * Uses camera-controls library v1.36.0 - full disposal and recreation approach
         */
        resetCameraControlsAfterRestore() {
            // Debounce multiple calls to prevent camera freeze
            if (this.cameraResetPending) {
                console.log('Camera reset already pending, skipping duplicate call');
                return;
            }
            
            this.cameraResetPending = true;
            
            // Clear any existing timeout
            if (this.cameraResetTimeout) {
                clearTimeout(this.cameraResetTimeout);
            }
            
            // Set a short delay to batch multiple reset requests
            this.cameraResetTimeout = setTimeout(() => {
                this.performCameraReset();
                this.cameraResetPending = false;
                this.cameraResetTimeout = null;
            }, 300); // Increased delay to prevent camera freezing and better batch resets
        }
        
        performCameraReset() {
            console.log('=== CAMERA CONTROLS RESET AFTER RESTORE ===');
            
            try {
                // Step 1: Clear all movement and interaction states immediately
                this.stateManager.selectedObjectForMoveId = null;
                this.stateManager.movingObject = null;
                this.stateManager.isObjectBeingMoved = false;
                this.stateManager.isDragging = false;
                this.stateManager.dragStartPosition = null;
                this.stateManager.dragObject = null;
                this.stateManager.selectedObject = null;
                this.stateManager.isLongPress = false;
                this.stateManager.longPressTimeout = null;
                console.log('State manager cleared');
                
                // Step 2: ENHANCED camera controls reset - comprehensive approach
                if (window.app?.cameraControls) {
                    const controls = window.app.cameraControls;
                    console.log('🎥 Performing enhanced camera controls reset after restore...');
                    
                    // Force complete reset cycle
                    controls.enabled = false;
                    controls.enabled = true;
                    controls.enableRotate = true;
                    controls.enableZoom = true;
                    controls.enablePan = true;
                    
                    // Clear internal states
                    if (controls._state) {
                        controls._state = 0; // Reset to ACTION.NONE
                    }
                    
                    // Force update to sync everything
                    controls.update(0);
                    
                    console.log('🎥 Enhanced camera controls reset completed after restore');
                } else if (this.cameraControls) {
                    // Fallback to local reference
                    console.log('🎥 Performing fallback camera controls reset...');
                    this.cameraControls.enabled = true;
                    this.cameraControls.enableRotate = true;
                    this.cameraControls.enableZoom = true;
                    this.cameraControls.enablePan = true;
                    this.cameraControls.update(0);
                    console.log('🎥 Fallback camera controls reset completed');
                }
                
                // Step 3: Clear input manager states if available
                if (this.inputManager) {
                    this.inputManager.isDragging = false;
                    this.inputManager.dragStart = null;
                    this.inputManager.dragObject = null;
                    this.inputManager.isObjectBeingMoved = false;
                    console.log('Input manager states cleared');
                }
                
            } catch (error) {
                console.error('Error during camera controls reset:', error);
                // Fallback: ensure controls are enabled
                if (window.app?.cameraControls) {
                    window.app.cameraControls.enabled = true;
                    window.app.cameraControls.update(0);
                } else if (this.cameraControls) {
                    this.cameraControls.enabled = true;
                    this.cameraControls.update(0);
                }
            }
        }
        
        /**
         * Apply world-specific Y-position constraints when restoring objects
         * Handles conflicts between original position and current world's boundaries
         */
        async applyWorldTransitionConstraints(originalPosition, fileData) {
            console.log('=== WORLD TRANSITION CONSTRAINT SYSTEM ===');
            
            // Get current world type and constraints
            const currentWorldType = this.getCurrentWorldType();
            const currentWorldConstraints = this.getCurrentWorldConstraints(currentWorldType);
            
            console.log(`Current world: ${currentWorldType}`);
            console.log('World Y boundaries:', currentWorldConstraints.y);
            console.log('Original Y position:', originalPosition.y);
            
            // Check if original Y position is within current world's boundaries
            const isYPositionValid = originalPosition.y >= currentWorldConstraints.y.min && 
                                   originalPosition.y <= currentWorldConstraints.y.max;
            
            if (isYPositionValid) {
                console.log('✅ Original Y position is valid for current world, preserving exactly');
                return { ...originalPosition };
            } else {
                console.log('⚠️ Y position conflict detected!');
                console.log(`Original Y: ${originalPosition.y} is outside current world bounds [${currentWorldConstraints.y.min}, ${currentWorldConstraints.y.max}]`);
                
                // Apply world-specific Y constraint logic
                const constrainedPosition = this.constrainPositionToWorld(originalPosition, fileData, currentWorldType, currentWorldConstraints);
                
                // Show user-friendly warning
                this.showWorldTransitionWarning(fileData.name, originalPosition.y, constrainedPosition.y, currentWorldType);
                
                return constrainedPosition;
            }
        }
        
        /**
         * Enhanced world transition constraint function for direct access
         * Can be called from world switching logic
         */
        static applyWorldTransitionConstraints(originalPosition, newWorldType, fileName = 'unknown') {
            console.log('=== WORLD TRANSITION CONSTRAINT SYSTEM (STATIC) ===');
            
            // Get world-specific constraints
            const constraints = {
                'green-plane': {
                    y: { min: 0, max: 150 },
                    requiresSupport: true,
                    groundLevel: 0
                },
                'space': {
                    y: { min: -150, max: 150 },
                    requiresSupport: false,
                    groundLevel: null
                },
                'ocean': {
                    y: { min: -200, max: 100 }, // Allow objects above ocean surface for stacking
                    requiresSupport: false,
                    groundLevel: null
                },
                'forest': {
                    y: { min: 0, max: 100 }, // Forest floor at Y=0, can go up to Y=100
                    requiresSupport: true,
                    groundLevel: 0
                },
                'dazzle': {
                    y: { min: 0, max: 150 }, // Dazzle bedroom ground level at Y=0
                    requiresSupport: true,
                    groundLevel: 0
                }
            };
            
            const currentWorldConstraints = constraints[newWorldType] || constraints['green-plane'];
            
            console.log(`Target world: ${newWorldType}`);
            console.log('World Y boundaries:', currentWorldConstraints.y);
            console.log('Original Y position:', originalPosition.y);
            
            // Check if original Y position is within current world's boundaries
            const isYPositionValid = originalPosition.y >= currentWorldConstraints.y.min && 
                                   originalPosition.y <= currentWorldConstraints.y.max;
            
            if (isYPositionValid) {
                console.log('✅ Original Y position is valid for target world, preserving exactly');
                return { ...originalPosition };
            } else {
                console.log('⚠️ Y position conflict detected!');
                console.log(`Original Y: ${originalPosition.y} is outside target world bounds [${currentWorldConstraints.y.min}, ${currentWorldConstraints.y.max}]`);
                
                // Apply world-specific Y constraint logic
                let constrainedY = originalPosition.y;
                
                switch (newWorldType) {
                    case 'green-plane':
                        // Green plane: objects must be on or above ground
                        // Let world template handle proper positioning - just ensure Y >= 0
                        if (originalPosition.y < currentWorldConstraints.y.min) {
                            // Object was below ground, let world template position it properly
                            constrainedY = 0.1; // Minimal Y to trigger world template ground positioning
                            console.log(`Green plane: Object was below ground (${originalPosition.y}), letting world template position at Y=${constrainedY}`);
                        } else if (originalPosition.y > currentWorldConstraints.y.max) {
                            // Object was too high, bring it to max height
                            constrainedY = currentWorldConstraints.y.max;
                            console.log(`Green plane: Object was too high (${originalPosition.y}), clamping to max Y=${constrainedY}`);
                        } else {
                            constrainedY = originalPosition.y; // Keep original if within bounds
                        }
                        break;
                        
                    case 'space':
                    case 'ocean':
                        // Space/Ocean: full 3D freedom, just clamp to boundaries
                        constrainedY = Math.max(currentWorldConstraints.y.min, Math.min(currentWorldConstraints.y.max, originalPosition.y));
                        if (constrainedY !== originalPosition.y) {
                            console.log(`${newWorldType}: Clamped Y from ${originalPosition.y} to ${constrainedY}`);
                        }
                        break;
                        
                    // Premium world themes
                    case 'dazzle':
                        // Dazzle bedroom - objects sit on ground like green-plane
                        // Let world template handle proper positioning
                        if (originalPosition.y < 0) {
                            constrainedY = 0.1; // Minimal Y to trigger world template ground positioning
                            console.log(`Dazzle: Object was below ground (${originalPosition.y}), letting world template position at Y=${constrainedY}`);
                        } else if (originalPosition.y > 150) {
                            constrainedY = 150; // Max height for dazzle world
                            console.log(`Dazzle: Object was too high (${originalPosition.y}), clamping to max Y=${constrainedY}`);
                        } else {
                            constrainedY = originalPosition.y; // Keep original if within bounds
                        }
                        break;
                        
                    case 'forest':
                        // Forest realm - objects must be on or above ground (Y >= 0), max Y=100
                        // Let world template handle proper positioning with objectHeight/2 calculations
                        if (originalPosition.y < 0) {
                            constrainedY = 0.1; // Minimal Y to trigger world template ground positioning
                            console.log(`Forest realm: Object was below ground (${originalPosition.y}), letting world template position at Y=${constrainedY}`);
                        } else if (originalPosition.y > 100) {
                            constrainedY = 100; // Max height for forest world
                            console.log(`Forest realm: Object was too high (${originalPosition.y}), clamping to max Y=${constrainedY}`);
                        } else {
                            constrainedY = originalPosition.y; // Keep original if within bounds
                        }
                        break;
                        
                    default:
                        console.warn(`Unknown world type: ${newWorldType}, using basic clamping`);
                        constrainedY = Math.max(currentWorldConstraints.y.min, Math.min(currentWorldConstraints.y.max, originalPosition.y));
                        break;
                }
                
                const constrainedPosition = {
                    x: originalPosition.x,
                    y: constrainedY,
                    z: originalPosition.z
                };
                
                // Show user-friendly warning
                BackupRestoreManager.showWorldTransitionWarning(fileName, originalPosition.y, constrainedY, newWorldType);
                
                return constrainedPosition;
            }
        }
        
        /**
         * Static version of world transition warning display
         */
        static showWorldTransitionWarning(fileName, originalY, adjustedY, worldType) {
            const worldDisplayNames = {
                'green-plane': 'Green Plane',
                'space': 'Space',
                'ocean': 'Ocean'
            };
            
            const worldDisplayName = worldDisplayNames[worldType] || worldType;
            const yDifference = Math.abs(adjustedY - originalY);
            
            if (yDifference > 0.1) { // Only show if significant change
                console.log(`📍 WORLD TRANSITION ADJUSTMENT:
                    File: ${fileName}
                    World: ${worldDisplayName}
                    Original Y: ${originalY.toFixed(1)}
                    Adjusted Y: ${adjustedY.toFixed(1)}
                    Reason: Position adjusted to fit ${worldDisplayName} world boundaries`);
                
                // Store the warning for potential UI display
                if (!window.worldTransitionWarnings) {
                    window.worldTransitionWarnings = [];
                }
                window.worldTransitionWarnings.push({
                    fileName: fileName,
                    world: worldDisplayName,
                    originalY: originalY,
                    adjustedY: adjustedY,
                    timestamp: Date.now()
                });
                
                // Keep only the last 10 warnings
                if (window.worldTransitionWarnings.length > 10) {
                    window.worldTransitionWarnings = window.worldTransitionWarnings.slice(-10);
                }
            }
        }
        
        /**
         * Get current world type from the application
         */
        getCurrentWorldType() {
            try {
                if (window.app && window.app.getCurrentWorldType) {
                    return window.app.getCurrentWorldType();
                } else if (window.getCurrentWorldType) {
                    return window.getCurrentWorldType();
                } else if (window.app && window.app.currentWorldTemplate) {
                    return window.app.currentWorldTemplate.getType();
                } else if (window.app && window.app.stateManager && window.app.stateManager.currentWorldType) {
                    return window.app.stateManager.currentWorldType;
                } else {
                    console.warn('Cannot determine current world type, defaulting to green-plane');
                    return 'green-plane';
                }
            } catch (error) {
                console.error('Error getting current world type:', error);
                return 'green-plane';
            }
        }
        
        /**
         * Get world-specific constraints based on world type
         */
        getCurrentWorldConstraints(worldType) {
            const constraints = {
                'green-plane': {
                    y: { min: 0, max: 150 },
                    requiresSupport: true,
                    groundLevel: 0
                },
                'space': {
                    y: { min: -150, max: 150 },
                    requiresSupport: false,
                    groundLevel: null
                },
                'ocean': {
                    y: { min: -200, max: 200 },
                    requiresSupport: false,
                    groundLevel: null
                }
            };
            
            return constraints[worldType] || constraints['green-plane'];
        }
        
        /**
         * Constrain position to fit within current world's boundaries
         */
        constrainPositionToWorld(originalPosition, fileData, worldType, constraints) {
            let constrainedY = originalPosition.y;
            
            console.log(`Applying ${worldType} world constraints...`);
            
            switch (worldType) {
                case 'green-plane':
                    // Green plane: objects must be on or above ground
                    if (originalPosition.y < constraints.y.min) {
                        // Object was below ground, place on ground with proper height
                        const objectHeight = this.getObjectHeightByType(fileData.extension);
                        constrainedY = objectHeight / 2; // Center the object on ground
                        console.log(`Green plane: Object was below ground (${originalPosition.y}), placing on ground at Y=${constrainedY}`);
                    } else if (originalPosition.y > constraints.y.max) {
                        // Object was too high, bring it to max height
                        constrainedY = constraints.y.max;
                        console.log(`Green plane: Object was too high (${originalPosition.y}), clamping to max Y=${constrainedY}`);
                    }
                    break;
                    
                case 'space':
                    // Space: full 3D freedom, just clamp to boundaries
                    constrainedY = Math.max(constraints.y.min, Math.min(constraints.y.max, originalPosition.y));
                    if (constrainedY !== originalPosition.y) {
                        console.log(`Space: Clamped Y from ${originalPosition.y} to ${constrainedY}`);
                    }
                    break;
                    
                case 'ocean':
                    // Ocean: full 3D underwater movement, just clamp to boundaries
                    constrainedY = Math.max(constraints.y.min, Math.min(constraints.y.max, originalPosition.y));
                    if (constrainedY !== originalPosition.y) {
                        console.log(`Ocean: Clamped Y from ${originalPosition.y} to ${constrainedY}`);
                    }
                    break;
                    
                // Premium world themes
                case 'dazzle':
                    // Dazzle bedroom: objects sit on ground like green-plane
                    if (originalPosition.y < 0) {
                        // Object was below ground, bring it to ground level
                        constrainedY = 0;
                        console.log(`Dazzle bedroom: Object was below ground (${originalPosition.y}), moving to ground level Y=${constrainedY}`);
                    } else if (originalPosition.y > constraints.y.max) {
                        // Object was too high, bring it to max height
                        constrainedY = constraints.y.max;
                        console.log(`Dazzle bedroom: Object was too high (${originalPosition.y}), clamping to max Y=${constrainedY}`);
                    } else {
                        // Object was in valid range
                        constrainedY = originalPosition.y;
                    }
                    break;
                    
                case 'forest':
                    // Forest realm: objects must be on or above ground (Y >= 0), with tree trunk support up to Y=100
                    if (originalPosition.y < 0) {
                        // Object was below ground, bring it to ground level
                        constrainedY = 0;
                        console.log(`Forest realm: Object was below ground (${originalPosition.y}), moving to ground level Y=${constrainedY}`);
                    } else if (originalPosition.y > 100) {
                        // Object was too high, bring it to max height
                        constrainedY = 100;
                        console.log(`Forest realm: Object was too high (${originalPosition.y}), clamping to max Y=${constrainedY}`);
                    } else {
                        // Object was in valid range
                        constrainedY = originalPosition.y;
                    }
                    break;
                    
                default:
                    console.warn(`Unknown world type: ${worldType}, using basic clamping`);
                    constrainedY = Math.max(constraints.y.min, Math.min(constraints.y.max, originalPosition.y));
                    break;
            }
            
            return {
                x: originalPosition.x,
                y: constrainedY,
                z: originalPosition.z
            };
        }
        
        /**
         * Get object height based on file type for proper ground placement
         */
        getObjectHeightByType(extension) {
            const ext = extension ? extension.toLowerCase() : '';
            
            switch (ext) {
                case '.mp3':
                case '.wav':
                case '.flac':
                case '.aac':
                case '.ogg':
                    return 1.5; // Audio cylinder height
                case '.mp4':
                case '.webm':
                case '.mov':
                case '.avi':
                case '.mkv':
                    return 2.0; // Video cube height
                case '.jpg':
                case '.jpeg':
                case '.png':
                case '.gif':
                case '.bmp':
                case '.webp':
                    return 2.0; // Image plane height
                case '.pdf':
                case '.txt':
                case '.md':
                case '.log':
                case '.json':
                case '.xml':
                case '.html':
                case '.css':
                case '.js':
                case '.ts':
                case '.py':
                case '.java':
                case '.cpp':
                case '.c':
                case '.h':
                case '.cs':
                case '.php':
                case '.rb':
                case '.go':
                case '.rs':
                case '.swift':
                case '.kt':
                case '.scala':
                case '.pl':
                case '.sh':
                case '.bat':
                case '.ps1':
                    return 2.0; // Document/PDF cube height
                default:
                    return 1.5; // Default box height
            }
        }
        
        /**
         * Show user-friendly warning when Y-position is adjusted due to world constraints
         */
        showWorldTransitionWarning(fileName, originalY, adjustedY, worldType) {
            const worldDisplayNames = {
                'green-plane': 'Green Plane',
                'space': 'Space',
                'ocean': 'Ocean'
            };
            
            const worldDisplayName = worldDisplayNames[worldType] || worldType;
            const yDifference = Math.abs(adjustedY - originalY);
            
            if (yDifference > 0.1) { // Only show if significant change
                console.log(`📍 WORLD TRANSITION ADJUSTMENT:
                    File: ${fileName}
                    World: ${worldDisplayName}
                    Original Y: ${originalY.toFixed(1)}
                    Adjusted Y: ${adjustedY.toFixed(1)}
                    Reason: Position adjusted to fit ${worldDisplayName} world boundaries`);
                
                // Store the warning for potential UI display
                if (!window.worldTransitionWarnings) {
                    window.worldTransitionWarnings = [];
                }
                window.worldTransitionWarnings.push({
                    fileName: fileName,
                    world: worldDisplayName,
                    originalY: originalY,
                    adjustedY: adjustedY,
                    timestamp: Date.now()
                });
                
                // Keep only the last 10 warnings
                if (window.worldTransitionWarnings.length > 10) {
                    window.worldTransitionWarnings = window.worldTransitionWarnings.slice(-10);
                }
            }
        }
        
        /**
         * Get accumulated world transition warnings for UI display
         */
        static getWorldTransitionWarnings() {
            return window.worldTransitionWarnings || [];
        }
        
        /**
         * Clear accumulated world transition warnings
         */
        static clearWorldTransitionWarnings() {
            window.worldTransitionWarnings = [];
        }
        
        /**
         * Display world transition warnings to the user (if any exist)
         */
        static displayWorldTransitionWarnings() {
            const warnings = window.worldTransitionWarnings || [];
            if (warnings.length === 0) {
                return;
            }
            
            console.log('=== WORLD TRANSITION WARNINGS ===');
            console.log(`Found ${warnings.length} objects with position adjustments:`);
            
            warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning.fileName}:`);
                console.log(`   World: ${warning.world}`);
                console.log(`   Y position adjusted from ${warning.originalY.toFixed(1)} to ${warning.adjustedY.toFixed(1)}`);
            });
            
            // Try to show a user-friendly notification if available
            if (typeof window.showNotification === 'function') {
                const message = `${warnings.length} object(s) had their positions adjusted for world compatibility. Check console for details.`;
                window.showNotification(message, 'info', 5000);
            } else if (window.app && window.app.showToast) {
                const message = `${warnings.length} object(s) repositioned for world compatibility`;
                window.app.showToast(message, 'info');
            }
            
            console.log('=== END WORLD TRANSITION WARNINGS ===');
        }
        
        /**
         * Restore face textures from backup data
         */
        async restoreFaceTexturesFromBackup(object, attachments, fileData) {
            console.log('=== STARTING FACE TEXTURE RESTORATION FROM BACKUP ===');
            console.log('Attachments data:', attachments);
            
            if (!attachments || !attachments.hasFaceTexture) {
                console.log('No face textures to restore');
                return;
            }
            
            // Handle face texture restoration - check multiple possible data sources
            let textureDataUrl = null;
            
            // Method 1: New structure with faceTexture.dataUrl
            if (attachments.faceTexture && attachments.faceTexture.dataUrl) {
                textureDataUrl = attachments.faceTexture.dataUrl;
                console.log('Found face texture data URL (new structure), length:', textureDataUrl.length);
            }
            // Method 2: Legacy structure with faceTextureDataUrl
            else if (attachments.faceTextureDataUrl) {
                textureDataUrl = attachments.faceTextureDataUrl;
                console.log('Found face texture data URL (legacy structure), length:', textureDataUrl.length);
            }
            
            if (textureDataUrl) {
                try {
                    // Load the texture from the backup data
                    const texture = await this.loadTextureAsync(textureDataUrl);
                    
                    if (texture) {
                        console.log('Face texture loaded successfully, applying to object');
                        
                        // Apply the texture using the billboard manager's method
                        this.billboardManager.applyFaceTexture(object, texture, 4);
                        
                        // Update the object's attachment state
                        if (!this.stateManager.labelObjectsMap.has(object.uuid)) {
                            this.stateManager.labelObjectsMap.set(object.uuid, {});
                        }
                        const objectAttachments = this.stateManager.labelObjectsMap.get(object.uuid);
                        objectAttachments.faceTexture = texture;
                        this.stateManager.labelObjectsMap.set(object.uuid, objectAttachments);
                        
                        // Mark object as processed
                        this.stateManager.processedTextureObjects.add(object.uuid);
                        this.stateManager.processedTextureObjects.add(fileData.id || fileData.path);
                        this.stateManager.processedTextureObjects.add(fileData.name);
                        
                        console.log('Face texture restoration completed successfully');
                        
                    } else {
                        throw new Error('Failed to load texture from backup data');
                    }
                    
                } catch (error) {
                    console.error('Error restoring face texture from backup:', error);
                    throw error; // Re-throw to trigger fallback
                }
            } else {
                console.log('No face texture data URL found in backup');
                throw new Error('No face texture data URL in backup');
            }
        }

        /**
         * Backup and restore manager initialization
         */
        static init(dependencies) {
            return new BackupRestoreManager(dependencies);
        }
    }
    
    // Export to window for global access
    window.BackupRestoreManager = BackupRestoreManager;
    console.log('BackupRestoreManager module loaded and exported to window');
    
})();
