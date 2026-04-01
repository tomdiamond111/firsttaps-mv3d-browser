// modules/core/initialization.js
// Dependencies: THREE (global), window.WindowWorldApp
// Exports: window.initializeThreeGlobal and various utility functions

(function() {
    'use strict';
    
    console.log("Loading Initialization module... Bundle version: v1704744000");
    console.log("JS Bundle timestamp check: new build with updated menu logic");
    
    // ============================================================================
    // GLOBAL VARIABLES
    // ============================================================================
    let windowWorldApp;
    let currentWorldType = 'greenPlane'; // Default to green plane
    const shadowState = new Map(); // Store shadow properties
    
    // ============================================================================
    // MAIN INITIALIZATION FUNCTION
    // ============================================================================
    function initializeThreeGlobal(THREE_CDN) {
        if (windowWorldApp) {
            console.log('WindowWorldApp already initialized, skipping...');
            return;
        }
        
        console.log('Initializing WindowWorldApp...');
        windowWorldApp = new WindowWorldApp();
        windowWorldApp.initialize(THREE_CDN);
        
        // Export the app instance globally
        window.app = windowWorldApp;
        
        console.log('WindowWorldApp initialized and exported to window.app');
    }

    // ============================================================================
    // FACE TEXTURE RESTORATION FUNCTIONS
    // ============================================================================
    function restoreFaceTexture(object, fileData) {
        console.log('=== RESTORING FACE TEXTURE ===');
        console.log('Object:', object);
        console.log('File data:', fileData);
        
        if (!object || !fileData) {
            console.log('Missing object or file data for texture restoration');
            return;
        }
        
        try {
            // CRITICAL FIX: For demo files, look up thumbnail data URL from Flutter injection
            let previewData = fileData.thumbnailDataUrl || fileData.previewData;
            
            if (!previewData && fileData.isDemoContent && fileData.path) {
                console.log('🎨 [DEMO] Demo file detected during restoration, looking up thumbnail URL...');
                console.log('🎨 [DEMO] File path:', fileData.path);
                
                if (window.DEMO_THUMBNAIL_DATA_URLS && window.DEMO_THUMBNAIL_DATA_URLS[fileData.path]) {
                    previewData = window.DEMO_THUMBNAIL_DATA_URLS[fileData.path];
                    console.log('🎨 [DEMO] ✅ Found demo thumbnail data URL for restoration');
                    console.log('🎨 [DEMO] Data URL length:', previewData.length);
                    
                    // Update fileData so other systems can use it
                    fileData.thumbnailDataUrl = previewData;
                    fileData.url = fileData.path; // Ensure url is set for media preview (will lookup from DEMO_ASSET_DATA_URLS)
                } else {
                    console.warn('🎨 [DEMO] ⚠️ Demo thumbnail not found for:', fileData.path, '(will use colored fallback)');
                    console.warn('🎨 [DEMO] Available keys:', Object.keys(window.DEMO_THUMBNAIL_DATA_URLS || {}));
                }
            }
            
            // Check if we have actual preview data (use thumbnailDataUrl which is the correct property)
            if (previewData && previewData.length > 0) {
                console.log('Found preview data, applying texture...');
                console.log('Preview data length:', previewData.length);
                
                // Create texture from preview data
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const texture = new THREE.CanvasTexture(canvas);
                    texture.needsUpdate = true;
                    
                    // Apply to front face only
                    const frontFaceMaterial = new THREE.MeshStandardMaterial({ map: texture });
                    // CRITICAL FIX: Use object's original base color instead of hardcoded grey
                    const baseColor = object.userData.originalBaseColor || 0x888888;
                    const materials = [
                        new THREE.MeshStandardMaterial({ color: baseColor }), // right
                        new THREE.MeshStandardMaterial({ color: baseColor }), // left
                        new THREE.MeshStandardMaterial({ color: baseColor }), // top
                        new THREE.MeshStandardMaterial({ color: baseColor }), // bottom
                        frontFaceMaterial, // front
                        new THREE.MeshStandardMaterial({ color: baseColor })  // back
                    ];
                    
                    object.material = materials;
                    console.log('Face texture applied successfully from thumbnailDataUrl');
                };
                img.onerror = function() {
                    console.log('Failed to load image, applying fallback texture');
                    applyFallbackTexture(object, fileData);
                };
                img.src = previewData;
            } else {
                console.log('No preview data found (thumbnailDataUrl or previewData)');
                
                // CONTACT FIX: Skip texture restoration for contacts - they already have proper avatar textures
                if (object.userData.subType === 'contact' || 
                    object.userData.type === 'fileObject' && object.userData.isContact ||
                    fileData.mimeType && fileData.mimeType.startsWith('contact:')) {
                    console.log('👤 CONTACT OBJECT DETECTED: Preserving existing avatar face texture (no restoration needed)');
                    return; // Exit early, don't overwrite contact face texture
                }
                
                // ENHANCED FIX: Handle app objects differently - preserve original branded materials
                if (fileData.isApp || object.userData.type === 'app' || fileData.extension === 'app') {
                    console.log('🎯 APP OBJECT DETECTED: Preserving original branded material instead of fallback texture');
                    
                    // Try to preserve/recreate the original app material using VirtualObjectCreator
                    if (window.app && window.app.virtualObjectManager && window.app.virtualObjectManager.virtualObjectCreator) {
                        try {
                            const virtualObjectCreator = window.app.virtualObjectManager.virtualObjectCreator;
                            const appData = object.userData.appData || {
                                name: fileData.name || object.userData.fileName || 'App',
                                packageName: fileData.packageName || object.userData.packageName || 'unknown',
                                url: fileData.url,
                                thumbnailDataUrl: fileData.thumbnailDataUrl,
                                linkType: fileData.linkType,
                                title: fileData.title
                            };
                            
                            // Recreate the proper branded app material
                            const brandedMaterial = virtualObjectCreator.createAppMaterial(appData);
                            object.material = brandedMaterial;
                            
                            console.log('✅ Successfully restored original branded app material for:', appData.name);
                        } catch (error) {
                            console.warn('Failed to recreate branded app material, using fallback:', error);
                            applyFallbackTexture(object, fileData);
                        }
                    } else {
                        console.warn('VirtualObjectCreator not available, using fallback texture');
                        applyFallbackTexture(object, fileData);
                    }
                } else {
                    console.log('Non-app object: applying standard fallback texture');
                    applyFallbackTexture(object, fileData);
                }
            }
        } catch (error) {
            console.error('Error in restoreFaceTexture:', error);
            
            // CONTACT FIX: Skip texture restoration for contacts even in error case
            if (object.userData.subType === 'contact' || 
                object.userData.type === 'fileObject' && object.userData.isContact ||
                fileData.mimeType && fileData.mimeType.startsWith('contact:')) {
                console.log('👤 CONTACT OBJECT DETECTED (error path): Preserving existing avatar texture');
                return; // Exit early
            }
            
            // ENHANCED FIX: Handle app objects in error case too
            if (fileData.isApp || object.userData.type === 'app' || fileData.extension === 'app') {
                console.log('🎯 APP OBJECT DETECTED (error path): Trying branded material instead of fallback texture');
                if (window.app && window.app.virtualObjectManager && window.app.virtualObjectManager.virtualObjectCreator) {
                    try {
                        const virtualObjectCreator = window.app.virtualObjectManager.virtualObjectCreator;
                        const appData = object.userData.appData || {
                            name: fileData.name || object.userData.fileName || 'App',
                            packageName: fileData.packageName || object.userData.packageName || 'unknown'
                        };
                        const brandedMaterial = virtualObjectCreator.createAppMaterial(appData);
                        object.material = brandedMaterial;
                        console.log('✅ Successfully applied branded app material (error recovery)');
                        return;
                    } catch (appError) {
                        console.warn('App material recreation failed, using fallback:', appError);
                    }
                }
            }
            
            applyFallbackTexture(object, fileData);
        }
    }

    function applyFallbackTexture(object, fileData) {
        console.log('=== APPLYING FALLBACK TEXTURE ===');
        
        try {
            const extension = fileData.extension || getFileExtension(fileData.name);
            const fileType = extension.toUpperCase().replace('.', '');
            
            // Create canvas with file type text
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Background color based on file type
            const bgColor = getColorByExtensionForCanvas(extension);
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, 256, 256);
            
            // Add file type text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(fileType, 128, 128);
            
            // Create texture
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // Apply to front face
            const frontFaceMaterial = new THREE.MeshStandardMaterial({ map: texture });
            // CRITICAL FIX: Use object's original base color instead of hardcoded grey
            const baseColor = object.userData.originalBaseColor || 0x888888;
            const materials = [
                new THREE.MeshStandardMaterial({ color: baseColor }), // right
                new THREE.MeshStandardMaterial({ color: baseColor }), // left
                new THREE.MeshStandardMaterial({ color: baseColor }), // top
                new THREE.MeshStandardMaterial({ color: baseColor }), // bottom
                frontFaceMaterial, // front
                new THREE.MeshStandardMaterial({ color: baseColor })  // back
            ];
            
            object.material = materials;
            console.log('Fallback texture applied for file type:', fileType);
        } catch (error) {
            console.error('Error applying fallback texture:', error);
        }
    }

    function getColorByExtensionForCanvas(extension) {
        switch (extension.toLowerCase()) {
            case '.pdf': return '#FF0000';
            case '.jpg': case '.jpeg': case '.png': case '.gif': return '#00FF00';
            case '.mp4': case '.mov': return '#0000FF';
            case '.mp3': case '.wav': return '#FF00FF';
            case '.doc': case '.docx': return '#0066CC';
            default: return '#666666';
        }
    }

    function getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    }

    // ============================================================================
    // OBJECT POSITIONING FUNCTIONS
    // ============================================================================
    function adjustObjectPositionY(object, checkForStacking = true, forceAdjust = false) {
        console.log('=== ADJUSTING OBJECT POSITION ===');
        console.log('Object position before adjustment:', object.position);
        console.log('Force adjust:', forceAdjust);

        if (!object || !object.geometry) {
            console.log('Invalid object for position adjustment');
            return;
        }

        // Robust world type detection
        let worldType = null;
        if (window.sharedStateManager && window.sharedStateManager.currentWorldType) {
            worldType = window.sharedStateManager.currentWorldType;
        } else if (window.currentWorldType) {
            worldType = window.currentWorldType;
        } else if (window.app && window.app.currentWorldTemplate && window.app.currentWorldTemplate.getType) {
            worldType = window.app.currentWorldTemplate.getType();
        }

        console.log('Detected world type:', worldType);

        // CRITICAL FIX: Do NOT adjust Y position for 3D worlds that support vertical movement
        // These worlds allow free floating in 3D space
        const supportsVerticalMovement = window.app?.currentWorldTemplate && typeof window.app.currentWorldTemplate.supportsVerticalMovement === 'function' 
            ? window.app.currentWorldTemplate.supportsVerticalMovement() 
            : (worldType === 'space' || worldType === 'ocean' || worldType === 'forest');
            
        if (supportsVerticalMovement) {
            console.log('3D world detected - skipping Y position adjustment to preserve 3D movement');
            return;
        }

        try {
            // Calculate object height using ONLY the main object's geometry
            let objectHeight;
            
            if (object.geometry && object.geometry.parameters) {
                objectHeight = object.geometry.parameters.height || object.geometry.parameters.depth || 2;
                console.log('Using geometry parameters directly, height:', objectHeight);
            } else {
                // Fallback: use only the main object geometry for bounding box calculation
                const bbox = new THREE.Box3().setFromBufferAttribute(object.geometry.attributes.position);
                bbox.applyMatrix4(object.matrixWorld);
                objectHeight = bbox.max.y - bbox.min.y;
                console.log('Using main object geometry bounding box, height:', objectHeight);
            }

            // Check if object is newly created and already properly positioned OR if it's stacked
            const expectedGroundY = objectHeight / 2;
            const isAlreadyProperlyPositioned = Math.abs(object.position.y - expectedGroundY) < 0.1;
            
            // Check if this object was originally stacked (saved Y position > ground level)
            const originalY = object.userData?.fileData?.y;
            const wasOriginallyStacked = originalY && originalY > (expectedGroundY + 0.1);
            
            console.log('Expected ground Y:', expectedGroundY, 'Current Y:', object.position.y, 'Original Y:', originalY);
            console.log('Already positioned:', isAlreadyProperlyPositioned, 'Was originally stacked:', wasOriginallyStacked);
            
            // Skip adjustment for newly created objects that are already properly positioned
            // BUT allow adjustment for originally stacked objects
            if (!forceAdjust && isAlreadyProperlyPositioned && !wasOriginallyStacked && worldType === 'greenPlane') {
                console.log('Object already properly positioned on ground, skipping adjustment for:', object.userData?.fileName);
                return;
            }

            let finalY = objectHeight / 2; // Default: sit on ground (y = 0)

            if (worldType === 'greenPlane') {
                // Place base of object on ground (y = objectHeight / 2) unless stacking
                if (checkForStacking && window.scene && window.stateManager) {
                    const stacking = findObjectToStackOn(object);
                    if (stacking.shouldStack) {
                        finalY = stacking.stackY;
                        console.log('Stacking on object, stackY:', stacking.stackY, 'for', object.userData && object.userData.fileName);
                    } else {
                        finalY = objectHeight / 2;
                        console.log('Placing object on ground, y=objectHeight/2:', finalY, 'for', object.userData && object.userData.fileName);
                    }
                } else {
                    finalY = objectHeight / 2;
                    console.log('Placing object on ground, y=objectHeight/2:', finalY, 'for', object.userData && object.userData.fileName);
                }
            } else if (checkForStacking && window.scene && window.stateManager) {
                // Check if object should stack on top of another object
                const stacking = findObjectToStackOn(object);
                if (stacking.shouldStack) {
                    finalY = stacking.stackY;
                    console.log('(Other world) Stacking on object, stackY:', stacking.stackY, 'for', object.userData && object.userData.fileName);
                }
            }

            // Position object
            object.position.y = finalY;

            console.log('Object positioned - Height:', objectHeight, 'Final Y:', finalY);
        } catch (error) {
            console.error('Error adjusting object position:', error);
        }
    }

    function findObjectToStackOn(object) {
        if (!window.scene || !window.stateManager) {
            return { shouldStack: false, stackY: 0 };
        }
        
        try {
            // Get all other objects (exclude current object)
            const otherObjects = window.stateManager.fileObjects.filter(obj => obj !== object && obj.uuid !== object.uuid);
            
            if (otherObjects.length === 0) {
                return { shouldStack: false, stackY: object.geometry.parameters.height / 2 };
            }

            // Enhanced logic for originally stacked objects
            const originalY = object.userData?.fileData?.y;
            const objectHeight = object.geometry.parameters.height || 2;
            const expectedGroundY = objectHeight / 2;
            
            console.log('Object:', object.userData?.fileName, 'Original Y:', originalY, 'Expected ground Y:', expectedGroundY);
            
            // If this object was originally stacked, find what it should stack on
            if (originalY && originalY > (expectedGroundY + 0.1)) {
                console.log('Object was originally stacked, finding target...');
                
                // Find objects at the same X,Z location
                const tolerance = 1.0;
                const candidateTargets = [];
                
                otherObjects.forEach(targetObj => {
                    const xDistance = Math.abs(object.position.x - targetObj.position.x);
                    const zDistance = Math.abs(object.position.z - targetObj.position.z);
                    
                    if (xDistance < tolerance && zDistance < tolerance) {
                        const targetOriginalY = targetObj.userData?.fileData?.y || targetObj.position.y;
                        candidateTargets.push({
                            object: targetObj,
                            originalY: targetOriginalY,
                            currentY: targetObj.position.y
                        });
                        console.log('Found candidate target:', targetObj.userData?.fileName, 'at original Y:', targetOriginalY);
                    }
                });
                
                if (candidateTargets.length > 0) {
                    // Sort by original Y position (lowest first)
                    candidateTargets.sort((a, b) => a.originalY - b.originalY);
                    
                    // Find the highest target that this object should stack on top of
                    let bestTarget = null;
                    for (const candidate of candidateTargets) {
                        if (candidate.originalY < originalY) {
                            bestTarget = candidate;
                        }
                    }
                    
                    if (bestTarget) {
                        const targetHeight = bestTarget.object.geometry.parameters.height || 2;
                        const targetTop = bestTarget.currentY + targetHeight / 2;
                        const stackY = targetTop + objectHeight / 2;
                        
                        console.log('Stacking on target:', bestTarget.object.userData?.fileName, 'Stack Y:', stackY);
                        return { shouldStack: true, stackY: stackY };
                    }
                }
            }

            // Fallback: Use raycaster method
            const raycaster = new THREE.Raycaster(
                new THREE.Vector3(object.position.x, object.position.y + 10, object.position.z),
                new THREE.Vector3(0, -1, 0)
            );
            
            const intersects = raycaster.intersectObjects(otherObjects, false);
            
            if (intersects.length > 0) {
                const targetObject = intersects[0].object;
                
                // Check if object is actually above the target
                const targetHalfWidth = (targetObject.geometry.parameters.width || 
                                       targetObject.geometry.parameters.radius * 2 || 2) / 2;
                const targetHalfDepth = (targetObject.geometry.parameters.depth || 
                                       targetObject.geometry.parameters.radius * 2 || 2) / 2;
                
                const xWithinBounds = Math.abs(object.position.x - targetObject.position.x) < targetHalfWidth + 0.5;
                const zWithinBounds = Math.abs(object.position.z - targetObject.position.z) < targetHalfDepth + 0.5;
                
                if (xWithinBounds && zWithinBounds) {
                    const targetHeight = targetObject.geometry.parameters.height || 2;
                    const targetTop = targetObject.position.y + targetHeight / 2;
                    const stackY = targetTop + objectHeight / 2;
                    
                    console.log('Raycaster found object to stack on:', {
                        targetObject: targetObject.userData.fileName,
                        targetTop: targetTop,
                        stackY: stackY
                    });
                    
                    return { shouldStack: true, stackY: stackY };
                }
            }
            
            // No object to stack on, sit on ground
            return { shouldStack: false, stackY: objectHeight / 2 };
            
        } catch (error) {
            console.error('Error in findObjectToStackOn:', error);
            const objectHeight = object.geometry.parameters.height || 2;
            return { shouldStack: false, stackY: objectHeight / 2 };
        }
    }

    function snapObjectToContact(movingObject, stateManager) {
        console.log('=== SNAP OBJECT TO CONTACT ===');
        
        if (!stateManager || !stateManager.fileObjects) {
            console.error('snapObjectToContact: stateManager or fileObjects not available');
            return;
        }
        
        if (!movingObject || !movingObject.geometry) {
            console.error('snapObjectToContact: invalid movingObject');
            return;
        }
        
        try {
            // Get all other objects (exclude current object)
            const otherObjects = stateManager.fileObjects.filter(obj => 
                obj !== movingObject && obj.uuid !== movingObject.uuid
            );
            
            if (otherObjects.length === 0) {
                console.log('No other objects to snap to - placing on ground');
                // Place on ground
                const movingObjectHeight = movingObject.geometry.parameters.height || 2;
                movingObject.position.y = movingObjectHeight / 2;
                return;
            }

            // Find objects that are horizontally aligned with the moving object
            const stackingTolerance = 2.5;
            const alignedObjects = [];
            
            console.log('Checking', otherObjects.length, 'potential targets for stacking');
            console.log('Moving object position:', movingObject.position);
            console.log('Stacking tolerance:', stackingTolerance);
            
            otherObjects.forEach(targetObject => {
                // Check horizontal proximity
                const xDistance = Math.abs(movingObject.position.x - targetObject.position.x);
                const zDistance = Math.abs(movingObject.position.z - targetObject.position.z);
                
                // Get target object dimensions
                const targetWidth = targetObject.geometry.parameters.width || 
                                   targetObject.geometry.parameters.radius * 2 || 2;
                const targetDepth = targetObject.geometry.parameters.depth || 
                                   targetObject.geometry.parameters.radius * 2 || 2;
                const targetHeight = targetObject.geometry.parameters.height || 2;
                
                // Check if objects are horizontally aligned for potential stacking
                const xInRange = xDistance <= (targetWidth / 2 + stackingTolerance);
                const zInRange = zDistance <= (targetDepth / 2 + stackingTolerance);
                
                if (xInRange && zInRange) {
                    alignedObjects.push({
                        object: targetObject,
                        targetTop: targetObject.position.y + targetHeight / 2,
                        originalY: targetObject.userData.fileData?.y || targetObject.position.y,
                        xDistance: xDistance,
                        zDistance: zDistance
                    });
                }
            });
            
            if (alignedObjects.length > 0) {
                // Sort aligned objects by their original Y position
                alignedObjects.sort((a, b) => {
                    const aOriginalY = a.originalY || a.object.position.y;
                    const bOriginalY = b.originalY || b.object.position.y;
                    return aOriginalY - bOriginalY;
                });
                
                // Get the moving object's original Y position
                const movingObjectOriginalY = movingObject.userData.fileData?.y || movingObject.position.y;
                
                // Find the object this should stack on top of
                let bestTarget = null;
                let bestTargetTop = -Infinity;
                
                for (const alignedObj of alignedObjects) {
                    const alignedOriginalY = alignedObj.originalY || alignedObj.object.position.y;
                    
                    if (alignedObj.targetTop > bestTargetTop) {
                        const shouldStackOnThis = movingObjectOriginalY > alignedOriginalY + 0.1;
                        
                        if (shouldStackOnThis) {
                            bestTarget = alignedObj;
                            bestTargetTop = alignedObj.targetTop;
                        }
                    }
                }
                
                if (bestTarget) {
                    // Stack on the best target found
                    const movingObjectHeight = movingObject.geometry.parameters.height || 2;
                    const newY = bestTarget.targetTop + movingObjectHeight / 2;
                    
                    console.log('Snapping object to contact:', {
                        targetObject: bestTarget.object.userData?.fileName || 'unknown',
                        targetTop: bestTarget.targetTop,
                        movingObjectHeight: movingObjectHeight,
                        newY: newY,
                        oldY: movingObject.position.y
                    });
                    
                    movingObject.position.y = newY;
                } else {
                    // No suitable stacking target, place on ground
                    console.log('No suitable stacking target - placing on ground');
                    const movingObjectHeight = movingObject.geometry.parameters.height || 2;
                    const groundY = movingObjectHeight / 2;
                    movingObject.position.y = groundY;
                }
            } else {
                // No horizontally aligned objects, place on ground
                console.log('No horizontally aligned objects found - placing on ground');
                const movingObjectHeight = movingObject.geometry.parameters.height || 2;
                const groundY = movingObjectHeight / 2;
                movingObject.position.y = groundY;
            }
            
        } catch (error) {
            console.error('Error in snapObjectToContact:', error);
        }
    }

    // ============================================================================
    // STACKING AND POSITIONING UTILITIES
    // ============================================================================
    function fixStackedObjectPositions(fileObjects) {
        if (!Array.isArray(fileObjects) || fileObjects.length === 0) {
            console.log('[StackingFix] No file objects to process.');
            return;
        }
        
        // Filter out contact objects from automatic stacking in green-plane world
        // Contact objects should sit on the ground individually, not be auto-stacked
        // ALSO filter out objects with furniture metadata (preservePosition flag)
        const worldType = window.getCurrentWorldType ? window.getCurrentWorldType() : 'unknown';
        const objectsToStack = fileObjects.filter(obj => {
            // Skip objects on furniture - they're already positioned correctly
            if (obj.userData?.preservePosition || obj.userData?.furnitureId) {
                console.log(`[StackingFix] Excluding furniture object from auto-stacking: ${obj.userData?.fileName || obj.uuid}`);
                return false;
            }
            
            const isContact = obj.userData?.isContact || obj.userData?.subType === 'contact';
            if (isContact && worldType === 'green-plane') {
                console.log(`[StackingFix] Excluding contact object from auto-stacking: ${obj.userData?.fileName || obj.uuid}`);
                return false;
            }
            return true;
        });
        
        if (objectsToStack.length === 0) {
            console.log('[StackingFix] No non-contact objects to process for stacking.');
            return;
        }
        
        // Group objects by XZ (rounded to 2 decimals for tolerance)
        const groupMap = new Map();
        objectsToStack.forEach(obj => {
            const x = Math.round(obj.position.x * 100) / 100;
            const z = Math.round(obj.position.z * 100) / 100;
            const key = `${x},${z}`;
            if (!groupMap.has(key)) groupMap.set(key, []);
            groupMap.get(key).push(obj);
        });
        
        // For each group, sort by original Y, then stack
        groupMap.forEach((objs, key) => {
            objs.sort((a, b) => {
                const ay = a.userData?.fileData?.y ?? 0;
                const by = b.userData?.fileData?.y ?? 0;
                if (ay !== by) return ay - by;
                return (a.userData?.fileName || '').localeCompare(b.userData?.fileName || '');
            });
            
            let currentY = 0;
            for (let i = 0; i < objs.length; i++) {
                const obj = objs[i];
                const height = obj.geometry?.parameters?.height || 1;
                if (i === 0) {
                    currentY = height / 2;
                } else {
                    const prev = objs[i - 1];
                    const prevHeight = prev.geometry?.parameters?.height || 1;
                    currentY += (prevHeight / 2) + (height / 2);
                }
                
                const beforeY = obj.position.y;
                obj.position.y = currentY;
                if (obj.userData && obj.userData.fileData) {
                    obj.userData.fileData.y = currentY;
                }
                console.log(`[StackingFix] ${obj.userData?.fileName || obj.uuid} at XZ ${key}: Y ${beforeY} -> ${currentY}`);
            }
        });
        console.log('[StackingFix] Completed stacking pass for all objects.');
    }

    function applyAllFixesToObject(object, fileData, mode = false) {
        console.log('=== APPLYING ALL FIXES TO OBJECT ===');
        
        try {
            // CRITICAL FIX: Apply saved X and Z coordinates for ALL positioning modes if available
            // Check for both undefined AND null (new objects have null coordinates)
            const hasSavedPosition = (fileData && fileData.x != null && fileData.z != null);
            
            if (hasSavedPosition) {
                console.log('POSITION PERSISTENCE: Applying saved X and Z coordinates');
                console.log('Before position update:', {x: object.position.x, y: object.position.y, z: object.position.z});
                console.log('Applying saved position:', {x: fileData.x, y: fileData.y, z: fileData.z});
                
                object.position.x = fileData.x;
                object.position.z = fileData.z;
                
                console.log('After X/Z position update:', {x: object.position.x, y: object.position.y, z: object.position.z});
            } else {
                console.log('POSITION PERSISTENCE: No saved X/Z coordinates found - assigning smart position');
                
                // NEW OBJECT POSITIONING: Use ObjectPositioner to find a good spot
                if (window.ObjectPositioner && window.app && window.app.stateManager) {
                    const positioner = new window.ObjectPositioner();
                    const existingObjects = window.app.stateManager.fileObjects || [];
                    const newPosition = positioner.calculateOptimalPosition(existingObjects, object);
                    
                    object.position.x = newPosition.x;
                    object.position.z = newPosition.z;
                    
                    console.log('📍 Assigned smart position for new object:', {x: newPosition.x, z: newPosition.z});
                } else {
                    // Fallback: Random position in front of camera
                    const randomAngle = Math.random() * Math.PI * 2;
                    const randomRadius = 5 + Math.random() * 5; // 5-10 units away
                    object.position.x = Math.cos(randomAngle) * randomRadius;
                    object.position.z = Math.sin(randomAngle) * randomRadius;
                    
                    console.log('📍 Assigned random position for new object:', {x: object.position.x, z: object.position.z});
                }
            }
            
            // Handle different Y positioning modes
            if (mode === 'snap-to-contact') {
                console.log('Applying snap-to-contact positioning for persisted object');
                snapObjectToContact(object, window.stateManager);
            } else if (mode === 'restore-stacked') {
                console.log('Restoring originally stacked object to exact original Y position');
                // PERSISTENCE FIX: Use fileData.y directly since that's where the persisted Y coordinate is stored
                const originalY = fileData?.y || object.userData?.fileData?.y;
                if (originalY) {
                    object.position.y = originalY;
                    console.log('Set object Y to original stacked position:', originalY);
                } else {
                    console.log('No original Y found in fileData or userData, falling back to stacking calculation');
                    adjustObjectPositionY(object, true, true);
                }
            } else if (mode === 'restore-free-y') {
                console.log('Restoring free Y position for 3D world object');
                // FREE Y-POSITION PERSISTENCE: For 3D worlds (space/ocean/forest), restore exact Y coordinate
                const originalY = fileData?.y;
                if (originalY !== undefined) {
                    object.position.y = originalY;
                    console.log('Set object Y to original free position:', originalY);
                } else {
                    console.log('No Y coordinate found in fileData, using default positioning');
                    // For 3D worlds, default to floating at a reasonable height
                    object.position.y = 2;
                }
            } else if (mode === 'recalculate-y') {
                console.log('Recalculating Y position for object with persisted XZ coordinates');
                adjustObjectPositionY(object, true, true);
            } else if (!mode) {
                console.log('Applying positioning check for new object');
                adjustObjectPositionY(object, true, false);
            }

            // Apply world template boundary constraints
            if (window.app && window.app.currentWorldTemplate && window.app.currentWorldTemplate.applyCameraConstraints) {
                const currentPosition = { x: object.position.x, y: object.position.y, z: object.position.z };
                // Note: This would need proper boundary constraint implementation
                console.log('World template boundary constraints would be applied here');
            }
            
            // Ensure shadows
            object.castShadow = true;
            object.receiveShadow = true;

            // Apply face texture if enabled
            if (fileData && window.stateManager && window.stateManager.currentDisplayOptions.useFaceTextures) {
                restoreFaceTexture(object, fileData);
            }
            
            // Update userData.fileData with final position
            if (object.userData.fileData) {
                object.userData.fileData.x = object.position.x;
                object.userData.fileData.y = object.position.y;
                object.userData.fileData.z = object.position.z;
                console.log('Updated userData.fileData with final position:', {
                    x: object.position.x,
                    y: object.position.y,
                    z: object.position.z
                });
            }
            
            console.log('All fixes applied to object:', object.userData?.id);
            
        } catch (error) {
            console.error('Error applying fixes to object:', error);
        }
    }

    // ============================================================================
    // SHADOW PRESERVATION SYSTEM
    // ============================================================================
    function recordShadowProperties(object) {
        console.log('=== RECORDING SHADOW PROPERTIES ===');
        
        if (!object || !object.userData || !object.userData.id) {
            console.log('Invalid object for shadow recording');
            return;
        }
        
        try {
            const shadowProps = {
                castShadow: object.castShadow,
                receiveShadow: object.receiveShadow
            };
            
            shadowState.set(object.userData.id, shadowProps);
            console.log('Shadow properties recorded for object:', object.userData.id, shadowProps);
        } catch (error) {
            console.error('Error recording shadow properties:', error);
        }
    }

    function restoreShadowProperties(object) {
        console.log('=== RESTORING SHADOW PROPERTIES ===');
        
        if (!object || !object.userData || !object.userData.id) {
            console.log('Invalid object for shadow restoration');
            return;
        }
        
        try {
            const shadowProps = shadowState.get(object.userData.id);
            if (shadowProps) {
                object.castShadow = shadowProps.castShadow;
                object.receiveShadow = shadowProps.receiveShadow;
                console.log('Shadow properties restored for object:', object.userData.id, shadowProps);
            } else {
                // Apply default shadow properties
                object.castShadow = true;
                object.receiveShadow = true;
                console.log('Applied default shadow properties for object:', object.userData.id);
            }
        } catch (error) {
            console.error('Error restoring shadow properties:', error);
        }
    }

    // ============================================================================
    // SPACE WORLD TEST FUNCTIONS
    // ============================================================================
    function testSpaceAnimations() {
        console.log('=== TESTING SPACE ANIMATIONS ===');
        console.log('Checking if space world is active...');
        
        if (window.app && window.app.currentWorldTemplate) {
            const worldType = window.app.currentWorldTemplate.getType();
            console.log('Current world type:', worldType);
            
            if (worldType === 'space') {
                console.log('Space world is active - testing animations...');
                
                // Test star field animation
                if (window.app.currentWorldTemplate.starField) {
                    console.log('Star field found - testing rotation animation');
                    window.app.currentWorldTemplate.starField.rotation.y += 0.001;
                    console.log('Star field rotation applied');
                } else {
                    console.log('No star field found in space world');
                }
                
                // Test nebula animation if available
                if (window.app.currentWorldTemplate.nebula) {
                    console.log('Nebula found - testing animation');
                    window.app.currentWorldTemplate.nebula.rotation.z += 0.0005;
                    console.log('Nebula rotation applied');
                } else {
                    console.log('No nebula found in space world');
                }
                
                console.log('Space animation test completed');
            } else {
                console.log('Space world is not active. Switch to space world first.');
                console.log('Use: window.switchWorldTemplate("space")');
            }
        } else {
            console.error('App or world template not available');
        }
        
        console.log('=== SPACE ANIMATION TEST COMPLETE ===');
    }

    function demoSpaceWorld() {
        console.log('=== SPACE WORLD DEMO ===');
        console.log('Starting space world demonstration...');
        
        try {
            if (!window.app) {
                console.error('App not available - cannot demo space world');
                return;
            }
            
            // Step 1: Switch to space world
            console.log('Step 1: Switching to space world...');
            window.switchWorldTemplate('space');
            
            setTimeout(() => {
                console.log('Step 2: Testing space animations...');
                testSpaceAnimations();
                
                setTimeout(() => {
                    console.log('Step 3: Demonstrating camera movement in space...');
                    
                    // Test zoom in space
                    if (window.zoomOut) {
                        console.log('Testing zoom out in space...');
                        window.zoomOut();
                        
                        setTimeout(() => {
                            console.log('Testing zoom in in space...');
                            window.zoomIn();
                        }, 1000);
                    }
                    
                    setTimeout(() => {
                        console.log('Step 4: Testing world state debug...');
                        if (window.debugWorldStates) {
                            window.debugWorldStates();
                        }
                        
                        console.log('=== SPACE WORLD DEMO COMPLETE ===');
                        console.log('Demo completed successfully!');
                        
                    }, 2000);
                }, 1500);
            }, 1000);
            
        } catch (error) {
            console.error('Space world demo failed:', error);
        }
    }

    // ============================================================================
    // LINK NAME HANDLER SETUP
    // ============================================================================
    function initializeLinkNameHandler() {
        console.log('🔗 Initializing Link Name Handler...');
        
        // Create the linkNameHandler object that the dialog expects
        window.linkNameHandler = {
            /**
             * Update the name of a link object in the scene.
             * This is called by the Dart dialog and bridges to LinkNameManager.
             */
            updateLinkName: (objectId, newName) => {
                console.log(`🔗 linkNameHandler: Attempting to update name for ${objectId} to "${newName}"`);
                
                // Use the LinkNameManager from the bundle
                if (window.LinkNameManager) {
                    try {
                        const linkNameManager = new window.LinkNameManager();
                        const success = linkNameManager.updateLinkName(objectId, newName);
                        
                        if (success) {
                            console.log(`✅ linkNameHandler: Successfully updated link name using LinkNameManager`);
                        } else {
                            console.error(`❌ linkNameHandler: Failed to update link name using LinkNameManager`);
                        }
                        
                        return success;
                    } catch (error) {
                        console.error('❌ linkNameHandler: Error using LinkNameManager:', error);
                        return false;
                    }
                } else {
                    console.error('❌ linkNameHandler: LinkNameManager not available');
                    return false;
                }
            }
        };
        
        console.log('✅ Link Name Handler initialized');
    }

    // ============================================================================
    // GLOBAL EVENT LISTENERS AND INITIALIZATION
    // ============================================================================
    
    // Global initialization trigger
    window.addEventListener('load', () => {
        if (typeof THREE !== 'undefined') {
            // Check if app initialization is blocked by version manager
            if (window.appLoadBlocked) {
                console.log('🔒 App initialization blocked pending version update');
                console.log('   Waiting for versionCheckPassed event...');
                
                // Listen for the event that signals it's safe to initialize
                window.addEventListener('versionCheckPassed', () => {
                    console.log('✅ Version check passed, initializing app...');
                    initializeThreeGlobal(THREE);
                    
                    // Initialize link name handler
                    initializeLinkNameHandler();
                    
                    // Initialize critical fixes
                    console.log('🔧 Initializing critical bug fixes...');
                }, { once: true });
            } else {
                // No blocking, initialize normally
                initializeThreeGlobal(THREE);
                
                // Initialize link name handler
                initializeLinkNameHandler();
                
                // Initialize critical fixes
                console.log('🔧 Initializing critical bug fixes...');
            }
            
            // Set up global scene reference for helper functions
            window.scene = null;
            window.camera = null;
            window.controls = null;
            
            // Enhanced initialization callback
            window.initializeScene = function() {
                console.log('🚀 Scene initialization callback triggered');
                
                // Wait for scene to be available
                setTimeout(() => {
                    if (window.scene && window.camera && window.controls) {
                        console.log('✅ Scene components available, applying fixes...');
                        console.log('✅ All critical fixes initialized');
                    } else {
                        console.log('⏳ Scene components not ready yet, retrying...');
                        setTimeout(window.initializeScene, 100);
                    }
                }, 100);
            };
            
        } else {
            console.error('THREE.js not loaded');
        }
    });

    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.initializeThreeGlobal = initializeThreeGlobal;
    window.restoreFaceTexture = restoreFaceTexture;
    window.applyFallbackTexture = applyFallbackTexture;
    window.adjustObjectPositionY = adjustObjectPositionY;
    window.findObjectToStackOn = findObjectToStackOn;
    window.snapObjectToContact = snapObjectToContact;
    window.fixStackedObjectPositions = fixStackedObjectPositions;
    window.applyAllFixesToObject = applyAllFixesToObject;
    window.recordShadowProperties = recordShadowProperties;
    window.restoreShadowProperties = restoreShadowProperties;
    window.testSpaceAnimations = testSpaceAnimations;
    window.demoSpaceWorld = demoSpaceWorld;
    
    // Export stacking dependency functions
    window.getObjectsStackedOnTop = getObjectsStackedOnTop;
    window.moveStackedDependents = moveStackedDependents;
    window.calculateDropPosition = calculateDropPosition;
    window.applyGravityToFloatingObjects = applyGravityToFloatingObjects;
    window.findSupportingObject = findSupportingObject;
    
    /**
     * Apply gravity to a specific object with world-specific rules
     */
    window.applyGravityToSpecificObject = function(object, worldType) {
        const currentY = object.position.y;
        
        // Check forest world preservation rules first
        if (window.forestIntegration && window.forestIntegration.shouldPreserveElevation(object, currentY)) {
            return; // Forest world rules preserve this object
        }
        
        // Apply standard gravity
        const allObjects = window.app?.stateManager?.fileObjects || [];
        const correctY = calculateDropPosition(object, allObjects);
        
        if (currentY > correctY + 0.1) {
            console.log(`[WORLD-GRAVITY] Applying gravity to ${object.userData?.fileName} in ${worldType} world: Y=${currentY} -> Y=${correctY}`);
            object.position.y = correctY;
            
            if (object.userData && object.userData.fileData) {
                object.userData.fileData.y = correctY;
            }
        }
    };
    
    // ============================================================================
    // WORLD TYPE UTILITY FUNCTIONS
    // ============================================================================
    
    /**
     * Get the current world type from the app
     * @returns {string} Current world type ('green-plane', 'ocean', 'space')
     */
    window.getCurrentWorldType = function() {
        try {
            if (window.app && window.app.currentWorldTemplate && window.app.currentWorldTemplate.getType) {
                return window.app.currentWorldTemplate.getType();
            } else if (window.sharedStateManager && window.sharedStateManager.currentWorldType) {
                return window.sharedStateManager.currentWorldType;
            } else if (window.currentWorldType) {
                return window.currentWorldType;
            } else {
                console.warn('getCurrentWorldType: No world type available, defaulting to green-plane');
                return 'green-plane';
            }
        } catch (error) {
            console.error('getCurrentWorldType error:', error);
            return 'green-plane';
        }
    };
    
    // Export reference for external access
    window.WindowWorldApp = WindowWorldApp;
    
    console.log("Initialization module loaded with utility functions available globally");
    console.log('🚀 CRITICAL BUG FIXES LOADED - Modular Version');
    console.log('✅ Face texture restoration available');
    console.log('✅ Object positioning fixes available');
    console.log('✅ Shadow preservation system available');
    console.log('✅ Stacking/floating object fix applied');
    console.log('✅ Debug functions available: testSpaceAnimations(), demoSpaceWorld()');
    
    // AUTO-INITIALIZE: Start the app automatically when THREE.js is available
    if (typeof THREE !== 'undefined') {
        console.log('🚀 Auto-initializing WindowWorldApp...');
        initializeThreeGlobal(THREE);
    } else {
        console.log('⏳ Waiting for THREE.js to load...');
        // Wait for THREE.js to be available
        const checkTHREE = setInterval(() => {
            if (typeof THREE !== 'undefined') {
                clearInterval(checkTHREE);
                console.log('🚀 THREE.js detected, initializing WindowWorldApp...');
                initializeThreeGlobal(THREE);
            }
        }, 100);
    }
    
    // ============================================================================
    // STACKING DEPENDENCY FUNCTIONS - Handle object movement and dependencies
    // ============================================================================
    
    /**
     * Find all objects that are stacked on top of a given object
     * @param {Object3D} baseObject - The object to check for stacked objects
     * @param {Array} allObjects - Array of all objects to check (usually stateManager.fileObjects)
     * @returns {Array} Array of objects stacked on top of the base object
     */
    function getObjectsStackedOnTop(baseObject, allObjects) {
        if (!baseObject || !Array.isArray(allObjects)) {
            return [];
        }
        
        const stackedObjects = [];
        const baseX = Math.round(baseObject.position.x * 100) / 100;
        const baseZ = Math.round(baseObject.position.z * 100) / 100;
        const baseHeight = baseObject.geometry?.parameters?.height || 1;
        const baseTopY = baseObject.position.y + (baseHeight / 2);
        
        // Tolerance for position matching
        const positionTolerance = 0.5;
        const yTolerance = 0.1;
        
        for (const obj of allObjects) {
            if (obj === baseObject) continue;
            
            const objX = Math.round(obj.position.x * 100) / 100;
            const objZ = Math.round(obj.position.z * 100) / 100;
            const objHeight = obj.geometry?.parameters?.height || 1;
            const objBottomY = obj.position.y - (objHeight / 2);
            
            // Check if object is at same XZ position and resting on top
            if (Math.abs(objX - baseX) <= positionTolerance && 
                Math.abs(objZ - baseZ) <= positionTolerance &&
                Math.abs(objBottomY - baseTopY) <= yTolerance) {
                stackedObjects.push(obj);
            }
        }
        
        // console.log(`[STACKING] Found ${stackedObjects.length} objects stacked on top of ${baseObject.userData?.fileName || baseObject.userData?.name || 'Unknown'}`);
        return stackedObjects;
    }
    
    /**
     * Move all objects stacked on top of a moved object
     * @param {Object3D} movedObject - The object that was moved
     * @param {Object} originalPosition - Original position before move {x, y, z}
     * @param {Array} allObjects - Array of all objects to check (usually stateManager.fileObjects)
     */
    function moveStackedDependents(movedObject, originalPosition, allObjects = null) {
        if (!movedObject || !originalPosition) {
            // console.log('[STACKING] Missing parameters for moveStackedDependents');
            return;
        }
        
        // Use global fileObjects if not provided
        if (!allObjects && window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
            allObjects = window.app.stateManager.fileObjects;
        }
        
        if (!Array.isArray(allObjects)) {
            // console.log('[STACKING] No objects array available for dependency movement');
            return;
        }
        
        // console.log(`[STACKING] Checking for dependent objects on moved object: ${movedObject.userData?.fileName || movedObject.userData?.name}`);
        // console.log(`[STACKING] Original position: (${originalPosition.x}, ${originalPosition.y}, ${originalPosition.z})`);
        // console.log(`[STACKING] New position: (${movedObject.position.x}, ${movedObject.position.y}, ${movedObject.position.z})`);
        
        // Find objects that were stacked on top of the moved object at its original position
        const dependentObjects = [];
        const origX = Math.round(originalPosition.x * 100) / 100;
        const origZ = Math.round(originalPosition.z * 100) / 100;
        const movedHeight = movedObject.geometry?.parameters?.height || 1;
        const originalTopY = originalPosition.y + (movedHeight / 2);
        
        // Tolerance for position matching
        const positionTolerance = 0.5;
        const yTolerance = 0.1;
        
        for (const obj of allObjects) {
            if (obj === movedObject) continue;
            
            // Skip objects that are snapped to furniture or paths - they have their own positioning logic
            if (obj.userData?.furnitureId || obj.userData?.pathId) {
                continue;
            }
            
            const objX = Math.round(obj.position.x * 100) / 100;
            const objZ = Math.round(obj.position.z * 100) / 100;
            const objHeight = obj.geometry?.parameters?.height || 1;
            const objBottomY = obj.position.y - (objHeight / 2);
            
            // Check if object was stacked on the moved object
            if (Math.abs(objX - origX) <= positionTolerance && 
                Math.abs(objZ - origZ) <= positionTolerance &&
                Math.abs(objBottomY - originalTopY) <= yTolerance) {
                dependentObjects.push(obj);
            }
        }
        
        if (dependentObjects.length === 0) {
            // console.log('[STACKING] No dependent objects found');
            return;
        }
        
        // Calculate movement delta
        const deltaX = movedObject.position.x - originalPosition.x;
        const deltaY = movedObject.position.y - originalPosition.y;
        const deltaZ = movedObject.position.z - originalPosition.z;
        
        // console.log(`[STACKING] Moving ${dependentObjects.length} dependent objects by delta: (${deltaX}, ${deltaY}, ${deltaZ})`);
        
        // Move all dependent objects
        for (const depObj of dependentObjects) {
            const oldPos = { x: depObj.position.x, y: depObj.position.y, z: depObj.position.z };
            
            depObj.position.x += deltaX;
            depObj.position.y += deltaY;
            depObj.position.z += deltaZ;
            
            // Update userData if available
            if (depObj.userData && depObj.userData.fileData) {
                depObj.userData.fileData.x = depObj.position.x;
                depObj.userData.fileData.y = depObj.position.y;
                depObj.userData.fileData.z = depObj.position.z;
            }
            
            // console.log(`[STACKING] Moved dependent object ${depObj.userData?.fileName || depObj.userData?.name || 'Unknown'} from (${oldPos.x}, ${oldPos.y}, ${oldPos.z}) to (${depObj.position.x}, ${depObj.position.y}, ${depObj.position.z})`);
            
            // Recursively move any objects stacked on top of this dependent object
            moveStackedDependents(depObj, oldPos, allObjects);
        }
    }
    
    /**
     * Find the object that is supporting a given object (if any)
     * @param {Object3D} object - The object to check for support
     * @param {Array} allObjects - Array of all objects to check
     * @returns {Object3D|null} Supporting object or null if on ground
     */
    function findSupportingObject(object, allObjects = null) {
        if (!object) return null;
        
        // Use global fileObjects if not provided
        if (!allObjects && window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
            allObjects = window.app.stateManager.fileObjects;
        }
        
        if (!Array.isArray(allObjects)) {
            return null;
        }
        
        const objX = Math.round(object.position.x * 100) / 100;
        const objZ = Math.round(object.position.z * 100) / 100;
        const objHeight = object.geometry?.parameters?.height || 1;
        const objBottomY = object.position.y - (objHeight / 2);
        
        // Tolerance for position matching
        const positionTolerance = 0.5;
        const yTolerance = 0.1;
        
        for (const supportObj of allObjects) {
            if (supportObj === object) continue;
            
            const supportX = Math.round(supportObj.position.x * 100) / 100;
            const supportZ = Math.round(supportObj.position.z * 100) / 100;
            const supportHeight = supportObj.geometry?.parameters?.height || 1;
            const supportTopY = supportObj.position.y + (supportHeight / 2);
            
            // Check if support object is directly underneath
            if (Math.abs(supportX - objX) <= positionTolerance && 
                Math.abs(supportZ - objZ) <= positionTolerance &&
                Math.abs(objBottomY - supportTopY) <= yTolerance) {
                return supportObj;
            }
        }
        
        return null; // No supporting object found (object is on ground)
    }
    
    /**
     * Check if an object should drop down when moved to a new position
     * @param {Object3D} object - The object to check
     * @param {Array} allObjects - Array of all objects to check for support
     * @returns {number} New Y position for the object
     */
    function calculateDropPosition(object, allObjects = null) {
        if (!object) return 0;
        
        // Use global fileObjects + furniture markers if not provided
        if (!allObjects && window.app) {
            if (window.app.worldManager && window.app.worldManager.getAllObjectsIncludingFurnitureMarkers) {
                allObjects = window.app.worldManager.getAllObjectsIncludingFurnitureMarkers();
            } else if (window.app.stateManager && window.app.stateManager.fileObjects) {
                allObjects = window.app.stateManager.fileObjects;
            }
        }
        
        if (!Array.isArray(allObjects)) {
            // console.log('[STACKING] No objects array available for drop calculation');
            return 0;
        }
        
        const objHeight = object.geometry?.parameters?.height || 1;
        const objWidth = object.userData?.objectWidth || 1.2;
        const objDepth = object.userData?.objectDepth || 1.2;
        const objX = object.position.x;
        const objZ = object.position.z;
        
        // console.log(`[GRAVITY] Checking gravity for object at (${objX.toFixed(2)}, ${objZ.toFixed(2)}), dimensions: ${objWidth.toFixed(2)} x ${objDepth.toFixed(2)}, checking ${allObjects.length} objects`);
        
        // Check for supporting objects using overlap detection (same as applyPositionConstraints)
        let highestSupportY = 0; // Ground level
        let markerCount = 0;
        
        for (const supportObj of allObjects) {
            if (supportObj === object) continue;
            
            // Use overlap detection with object dimensions (matches worldTemplates.js logic)
            const supportWidth = supportObj.userData?.objectWidth || 1.2;
            const supportDepth = supportObj.userData?.objectDepth || 1.2;
            const supportHeight = supportObj.userData?.objectHeight || 
                                 supportObj.geometry?.parameters?.height || 1;
            
            if (supportObj.userData?.isSlotMarker) markerCount++;
            
            const xDist = Math.abs(objX - supportObj.position.x);
            const zDist = Math.abs(objZ - supportObj.position.z);
            
            // Check for overlap (object footprint intersects support footprint)
            const halfWidthSum = (objWidth + supportWidth) / 2;
            const halfDepthSum = (objDepth + supportDepth) / 2;
            
            if (supportObj.userData?.isSlotMarker && markerCount <= 3) {
                // console.log(`[GRAVITY] Marker at (${supportObj.position.x.toFixed(1)}, ${supportObj.position.z.toFixed(1)}): xDist=${xDist.toFixed(2)} < ${halfWidthSum.toFixed(2)}? ${xDist < halfWidthSum}, zDist=${zDist.toFixed(2)} < ${halfDepthSum.toFixed(2)}? ${zDist < halfDepthSum}, supportWidth=${supportWidth.toFixed(1)}, supportDepth=${supportDepth.toFixed(1)}`);
            }
            
            if (xDist < halfWidthSum && zDist < halfDepthSum) {
                const supportTopY = supportObj.position.y + (supportHeight / 2);
                
                if (supportTopY > highestSupportY) {
                    highestSupportY = supportTopY;
                    // console.log(`[STACKING] Found support: ${supportObj.userData?.name || 'object'} at Y=${supportTopY.toFixed(2)}, overlap: xDist=${xDist.toFixed(2)} < ${halfWidthSum.toFixed(2)}, zDist=${zDist.toFixed(2)} < ${halfDepthSum.toFixed(2)}`);
                }
            }
        }
        
        // Return the Y position where the bottom of the object touches the support
        const newY = highestSupportY + (objHeight / 2);
        // console.log(`[STACKING] Drop calculation for ${object.userData?.fileName || object.userData?.name}: supportY=${highestSupportY}, newY=${newY}, checked ${markerCount} markers`);
        return newY;
    }
    
    /**
     * Apply gravity/drop logic to objects that are floating
     * @param {Array} allObjects - Array of all objects to check
     */
    function applyGravityToFloatingObjects(allObjects = null) {
        if (window.shouldLog && window.shouldLog('gravity')) {
            console.log('[GRAVITY-DEBUG] applyGravityToFloatingObjects START, allObjects param:', allObjects ? allObjects.length : 'null');
        }
        
        // Use global fileObjects + furniture markers if not provided
        if (!allObjects && window.app) {
            if (window.shouldLog && window.shouldLog('gravity')) {
                console.log('[GRAVITY-DEBUG] Fetching objects, worldManager exists:', !!window.app.worldManager);
                console.log('[GRAVITY-DEBUG] getAllObjectsIncludingFurnitureMarkers exists:', !!(window.app.worldManager && window.app.worldManager.getAllObjectsIncludingFurnitureMarkers));
            }
            
            if (window.app.worldManager && window.app.worldManager.getAllObjectsIncludingFurnitureMarkers) {
                allObjects = window.app.worldManager.getAllObjectsIncludingFurnitureMarkers();
                if (window.shouldLog && window.shouldLog('gravity')) {
                    console.log('[GRAVITY-DEBUG] Got objects from getAllObjectsIncludingFurnitureMarkers:', allObjects.length);
                }
            } else if (window.app.stateManager && window.app.stateManager.fileObjects) {
                allObjects = window.app.stateManager.fileObjects;
                if (window.shouldLog && window.shouldLog('gravity')) {
                    console.log('[GRAVITY-DEBUG] FALLBACK: Got objects from fileObjects:', allObjects.length);
                }
            }
        }
        
        if (!Array.isArray(allObjects)) {
            // console.log('[STACKING] No objects array available for gravity application');
            return;
        }

        if (window.shouldLog && window.shouldLog('gravity')) {
            console.log('[GRAVITY-DEBUG] Final allObjects count before gravity loop:', allObjects.length);
        }

        // WORLD TEMPLATE CHECK: Respect world template's gravity rules
        // If the current world template doesn't require support, skip gravity
        if (window.app && window.app.currentWorldTemplate && window.app.currentWorldTemplate.getPositioningConstraints) {
            const constraints = window.app.currentWorldTemplate.getPositioningConstraints();
            if (constraints && constraints.requiresSupport === false) {
                // console.log(`[STACKING] Skipping gravity - current world allows free floating (requiresSupport: false)`);
                return;
            }
        }
        
        // console.log('[STACKING] Applying gravity to floating objects...');
        
        for (const obj of allObjects) {
            const currentY = obj.position.y;
            
            // POSITION PERSISTENCE: Skip objects with preserved positions (unless world type changed)
            if (obj.userData && obj.userData.preservePosition) {
                // console.log(`[STACKING] Skipping object with preserved position: ${obj.userData?.fileName || obj.userData?.name}`);
                continue;
            }
            
            // POSTER/WALL-MOUNTED PROTECTION: Skip posters and wall-mounted objects
            if (obj.userData && (obj.userData.isPoster || obj.userData.isWallMounted)) {
                // console.log(`[STACKING] Skipping wall-mounted/poster object: ${obj.userData?.fileName || obj.userData?.name || obj.userData?.posterText}`);
                continue;
            }
            
            // FURNITURE STRUCTURE PROTECTION: Skip furniture child pieces (they move with the parent group)
            if (obj.userData && obj.userData.isFurnitureStructure) {
                // console.log(`[STACKING] Skipping furniture structure piece (part of group): ${obj.userData?.furnitureId}`);
                continue;
            }
            
            // SLOT MARKER PROTECTION: Skip slot markers (children of furniture groups)
            if (obj.userData && obj.userData.isSlotMarker) {
                // console.log(`[STACKING] Skipping slot marker (furniture child): ${obj.userData?.furnitureId}`);
                continue;
            }
            
            // FOREST WORLD INTEGRATION: Check if object should be preserved at current elevation
            if (window.forestIntegration && window.forestIntegration.shouldPreserveElevation(obj, currentY)) {
                continue; // Skip gravity for forest-style world elevated objects (forest and cave)
            }
            
            const correctY = calculateDropPosition(obj, allObjects);
            
            // Only drop objects that are floating (with some tolerance)
            if (currentY > correctY + 0.1) {
                // console.log(`[STACKING] Dropping floating object ${obj.userData?.fileName || obj.userData?.name} from Y=${currentY} to Y=${correctY}`);
                obj.position.y = correctY;
                
                // Update userData if available
                if (obj.userData && obj.userData.fileData) {
                    obj.userData.fileData.y = correctY;
                }
            }
        }
    }

    // ============================================================================
    // DEBUG AND TEST FUNCTIONS
    // ============================================================================
    
    /**
     * Debug function to list all objects in the scene with their positions
     */
    window.debugListObjects = function() {
        if (!window.app || !window.app.stateManager || !window.app.stateManager.fileObjects) {
            console.log('No objects to display');
            return;
        }
        
        const objects = window.app.stateManager.fileObjects;
        console.log('=== DEBUG: Listing all objects in the scene ===');
        objects.forEach(obj => {
            console.log(`Object: ${obj.userData?.fileName || obj.uuid}, Position: (${obj.position.x}, ${obj.position.y}, ${obj.position.z})`);
        });
        console.log('=== DEBUG: Object listing complete ===');
    };
    
    /**
     * Debug function to test object stacking and positioning
     */
    window.debugTestStacking = function() {
        if (!window.app || !window.app.stateManager || !window.app.stateManager.fileObjects) {
            console.log('No objects to test stacking');
            return;
        }
        
        const objects = window.app.stateManager.fileObjects;
        console.log('=== DEBUG: Testing object stacking ===');
        
        // Reset positions
        objects.forEach(obj => {
            obj.position.y = 0;
            if (obj.userData && obj.userData.fileData) {
                obj.userData.fileData.y = 0;
            }
        });
        
        // Apply stacking fix
        fixStackedObjectPositions(objects);
        
        // Log results
        objects.forEach(obj => {
            console.log(`Object: ${obj.userData?.fileName || obj.uuid}, New Position: (${obj.position.x}, ${obj.position.y}, ${obj.position.z})`);
        });
        console.log('=== DEBUG: Stacking test complete ===');
    };

    // ============================================================================
    // FLUTTER BRIDGE EMULATOR: For webview_flutter compatibility
    // ============================================================================
    
    /**
     * Emulates flutter_inappwebview.callHandler for webview_flutter compatibility
     * This integrates contact loading into the existing module system
     */
    if (typeof window.flutter_inappwebview === 'undefined') {
        console.log('🔗 Setting up Flutter bridge emulator for contact loading...');
        
        window.flutter_inappwebview = {
            callHandler: function(handlerName, ...args) {
                console.log(`📞 Flutter bridge call: ${handlerName}`, args);
                
                return new Promise((resolve, reject) => {
                    try {
                        switch (handlerName) {
                            case 'ContactsChannel':
                                const action = args[0];
                                console.log(`📇 Contact request: ${action}`);
                                
                                // Set up callback to resolve promise when Flutter responds
                                const timeoutId = setTimeout(() => {
                                    console.warn(`📇 Timeout waiting for ${action} response`);
                                    resolve([]);
                                }, 10000); // 10 second timeout
                                
                                // Flutter sends data to contactsLoadCallback for getDeviceContacts
                                if (action === 'getDeviceContacts') {
                                    window.contactsLoadCallback = function(data, error) {
                                        clearTimeout(timeoutId);
                                        delete window.contactsLoadCallback; // Clean up callback
                                        
                                        if (error) {
                                            console.error(`📇 ${action} error:`, error);
                                            reject(new Error(error));
                                        } else {
                                            console.log(`📇 ${action} success:`, data ? data.length : 0, 'contacts');
                                            resolve(data || []);
                                        }
                                    };
                                } else {
                                    // For other actions, use generic callback
                                    const callbackName = `${action}Callback`;
                                    window[callbackName] = function(data, error) {
                                        clearTimeout(timeoutId);
                                        delete window[callbackName]; // Clean up callback
                                        
                                        if (error) {
                                            console.error(`📇 ${action} error:`, error);
                                            reject(new Error(error));
                                        } else {
                                            console.log(`📇 ${action} success:`, data ? data.length : 0, 'items');
                                            resolve(data || []);
                                        }
                                    };
                                }
                                
                                // Send request to Flutter via ContactsChannel
                                if (window.ContactsChannel && window.ContactsChannel.postMessage) {
                                    window.ContactsChannel.postMessage(JSON.stringify({ action: action }));
                                } else {
                                    console.warn('📇 ContactsChannel not available');
                                    resolve([]);
                                }
                                break;
                                
                            default:
                                console.warn(`📞 Unknown handler: ${handlerName}`);
                                resolve(null);
                        }
                    } catch (error) {
                        console.error(`📞 Flutter bridge error in ${handlerName}:`, error);
                        reject(error);
                    }
                });
            }
        };
        
        // Add debugging functions for contact loading
        window.testContactLoading = function() {
            console.log('📇 Manual contact loading test...');
            console.log('📇 ContactsChannel available:', !!window.ContactsChannel);
            console.log('📇 Flutter bridge available:', !!window.flutter_inappwebview);
            
            if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                console.log('📇 Testing contact bridge...');
                return window.flutter_inappwebview.callHandler('ContactsChannel', 'getDeviceContacts');
            } else {
                console.error('📇 Flutter bridge not available');
                return Promise.resolve([]);
            }
        };
        
        window.debugContactSystem = function() {
            console.log('📇 Contact System Debug:');
            console.log('  - ContactsChannel:', !!window.ContactsChannel);
            console.log('  - flutter_inappwebview:', !!window.flutter_inappwebview);
            console.log('  - contactManager:', !!window.contactManager);
            console.log('  - ContactManagerClass:', !!window.ContactManagerClass);
            
            if (window.contactManager) {
                console.log('  - contactManager.contacts.size:', window.contactManager.contacts.size);
                console.log('  - contactManager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.contactManager)));
            }
        };
        
        // Register contact bridge availability and trigger sync
        window.addEventListener('load', () => {
            setTimeout(() => {
                console.log('📇 Initial contact sync check...');
                
                // Test the bridge directly
                if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                    console.log('📇 Testing Flutter bridge with getDeviceContacts...');
                    window.flutter_inappwebview.callHandler('ContactsChannel', 'getDeviceContacts')
                        .then(contacts => {
                            console.log('📇 Bridge test result:', contacts ? contacts.length : 0, 'contacts');
                        })
                        .catch(error => {
                            console.error('📇 Bridge test failed:', error);
                        });
                }
                
                if (window.contactManager && typeof window.contactManager.syncContactsWithFlutter === 'function') {
                    console.log('📇 Triggering contact sync with Flutter bridge...');
                    window.contactManager.syncContactsWithFlutter();
                    
                    // Note: Avatar restoration is handled later in fileObjectManager.js after contacts are fully positioned
                    console.log('� Contact sync initiated - avatar restoration will happen after contacts are positioned');
                } else {
                    console.warn('📇 ContactManager not available for sync');
                }
            }, 2000); // Increased delay to ensure everything is loaded
        });
        
        console.log('✅ Flutter bridge emulator ready for contact loading');
    }

    // ============================================================================
    // WORLD READY NOTIFICATION: Called by Flutter when world is fully loaded
    // ============================================================================
    window.notifyWorldReady = function() {
        console.log('🚀🚀🚀 notifyWorldReady() called by Flutter at timestamp: ' + Date.now());
        console.log('🔍 DEBUG: window.globalPosterManager exists:', !!window.globalPosterManager);
        
        if (window.globalPosterManager) {
            console.log('🚀 Dispatching world-ready event to GlobalPosterManager');
            console.log('🔍 DEBUG: globalPosterManager.isWorldReady before dispatch:', window.globalPosterManager.isWorldReady);
            console.log('🔍 DEBUG: globalPosterManager.queuedRestorationTask exists:', !!window.globalPosterManager.queuedRestorationTask);
            
            window.globalPosterManager.dispatchEvent('world-ready', {
                source: 'flutter',
                timestamp: Date.now()
            });
            
            console.log('🔍 DEBUG: world-ready event dispatched successfully');
        } else {
            console.warn('⚠️ GlobalPosterManager not available when world-ready was called');
            console.warn('🔍 DEBUG: Available window properties:', Object.keys(window).filter(k => k.includes('poster') || k.includes('Poster')));
        }
        
        // DEFERRED GAMING SYSTEM INITIALIZATION: Load gaming features after world is ready
        // This improves startup performance by moving non-critical features to background
        if (window.app) {
            console.log('🎮 Initializing background gaming systems...');
            
            // Initialize SVG Entity Manager for interactive entities (immediate, no setTimeout)
            // Conservative approach: Initialize now since user confirmed gaming features are important
            if (typeof window.initializeSVGEntities === 'function' && !window.app.svgEntityManager) {
                try {
                    window.app.svgEntityManager = window.initializeSVGEntities(window.app);
                    if (window.app.svgEntityManager) {
                        console.log('🎮 SVG Entity Manager initialized (background)');
                    } else {
                        console.warn('🎮 SVG Entity Manager initialization returned null');
                    }
                } catch (e) {
                    console.error('🎮 Error initializing SVG Entity Manager:', e);
                }
            }
            
            // Initialize Treasure Box Manager for treasure hunting (immediate, no setTimeout)
            if (typeof window.initializeTreasureBoxes === 'function' && !window.app.treasureBoxManager) {
                try {
                    window.app.treasureBoxManager = window.initializeTreasureBoxes(window.app);
                    if (window.app.treasureBoxManager) {
                        console.log('💎 Treasure Box Manager initialized (background)');
                    } else {
                        console.warn('💎 Treasure Box Manager initialization returned null');
                    }
                } catch (e) {
                    console.error('💎 Error initializing Treasure Box Manager:', e);
                }
            }
        } else {
            console.warn('🎮 window.app not available for background gaming initialization');
        }
        
        // BROWSER-ONLY: Restore link objects from localStorage
        console.log('🌐 [BROWSER] DEBUG: IS_BROWSER_MODE =', window.IS_BROWSER_MODE, ', browserObjectStorage =', !!window.browserObjectStorage);
        
        if (window.IS_BROWSER_MODE && window.browserObjectStorage) {
            console.log('🌐 [BROWSER] Checking for saved link objects to restore...');
            
            // Delay restoration to ensure all managers are initialized
            setTimeout(() => {
                try {
                    // Set restoration flag to suppress notifications
                    window._worldRestorationInProgress = true;
                    
                    const linkObjects = window.browserObjectStorage.loadAllLinkObjects();
                    const objectIds = Object.keys(linkObjects);
                    
                    console.log('🌐 [BROWSER] DEBUG: linkObjects =', linkObjects, ', objectIds =', objectIds);
                    
                    if (objectIds.length > 0) {
                        console.log(`🌐 [BROWSER] Found ${objectIds.length} link objects to restore`);
                        
                        // Check if fileObjectManager is available
                        console.log('🌐 [BROWSER] DEBUG: window.app =', !!window.app, ', fileObjectManager =', !!window.app?.fileObjectManager);
                        
                        if (window.app && window.app.fileObjectManager) {
                            // Convert link objects to format expected by createFileObjects
                            const fileObjectsArray = objectIds.map(id => linkObjects[id]);
                            console.log('🌐 [BROWSER] DEBUG: Calling createFileObjects with', fileObjectsArray.length, 'objects:', fileObjectsArray);
                            window.app.fileObjectManager.createFileObjects(fileObjectsArray);
                            console.log(`✅ [BROWSER] Restored ${objectIds.length} link objects from localStorage`);
                        } else {
                            console.warn('⚠️ [BROWSER] fileObjectManager not available, cannot restore link objects');
                            console.warn('🌐 [BROWSER] DEBUG: Available app managers:', window.app ? Object.keys(window.app) : 'window.app is null');
                        }
                    } else {
                        console.log('🌐 [BROWSER] No saved link objects found in localStorage');
                    }
                    
                    // Clear restoration flag after delay
                    setTimeout(() => {
                        window._worldRestorationInProgress = false;
                        console.log('🌐 [BROWSER] Link object restoration complete');
                    }, 2000);
                    
                } catch (error) {
                    console.error('❌ [BROWSER] Error restoring link objects:', error);
                    window._worldRestorationInProgress = false;
                }
            }, 1000); // 1 second delay to ensure managers are ready
        } else {
            console.warn('⚠️ [BROWSER] Skipping link object restoration - IS_BROWSER_MODE or browserObjectStorage not available');
        }
    };
    console.log('✅ window.notifyWorldReady() function registered and ready');

    // ============================================================================
    // AUTO-INITIALIZE: Start the app automatically when THREE.js is available
    // ============================================================================
    if (typeof THREE !== 'undefined') {
        // Check if app initialization is blocked by version manager
        if (window.appLoadBlocked) {
            console.log('🔒 Auto-initialize blocked pending version update');
            console.log('   Waiting for versionCheckPassed event...');
            
            // Listen for the event that signals it's safe to initialize
            window.addEventListener('versionCheckPassed', () => {
                console.log('✅ Version check passed, auto-initializing WindowWorldApp...');
                initializeThreeGlobal(THREE);
            }, { once: true });
        } else {
            console.log('🚀 Auto-initializing WindowWorldApp...');
            initializeThreeGlobal(THREE);
        }
    } else {
        console.log('⏳ Waiting for THREE.js to load...');
        // Wait for THREE.js to be available
        const checkTHREE = setInterval(() => {
            if (typeof THREE !== 'undefined') {
                clearInterval(checkTHREE);
                
                // Check blocking before initializing
                if (window.appLoadBlocked) {
                    console.log('🔒 Delayed initialize blocked pending version update');
                    console.log('   Waiting for versionCheckPassed event...');
                    
                    window.addEventListener('versionCheckPassed', () => {
                        console.log('✅ Version check passed, initializing WindowWorldApp...');
                        initializeThreeGlobal(THREE);
                    }, { once: true });
                } else {
                    console.log('🚀 THREE.js detected, initializing WindowWorldApp...');
                    initializeThreeGlobal(THREE);
                }
            }
        }, 100);
    }
})();
