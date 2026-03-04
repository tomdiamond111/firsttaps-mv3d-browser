// assets/web/js/objectInteraction.js
// Global script version - assumes all dependencies are available globally

const longPressDuration = 700;
const doubleTapThreshold = 300;
const moveThreshold = 0.05;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const initialPointerPosition = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const dragOffset = new THREE.Vector3();

/**
 * Update SMS screen position for contact objects when they move
 */
function updateContactSMSScreenPosition(object) {
    console.log('🔧 updateContactSMSScreenPosition called for:', object?.userData?.fileName || 'unknown object');
    
    // Check if this is a contact object
    if (!object || !object.userData) {
        console.log('🔧 No object or userData, skipping SMS update');
        return;
    }
    
    const isContact = object.userData.subType === 'contact' || 
                     object.userData.isContact ||
                     (object.userData.id && object.userData.id.startsWith('contact://'));
    
    console.log('🔧 Contact check result:', {
        isContact,
        subType: object.userData.subType,
        isContactFlag: object.userData.isContact,
        id: object.userData.id,
        hasContactObject: !!object.userData.contactObject,
        hasUpdateMethod: !!(object.userData.contactObject && object.userData.contactObject.updateSMSScreenPosition)
    });
    
    if (isContact && object.userData.contactObject && object.userData.contactObject.updateSMSScreenPosition) {
        console.log('📱 Calling updateSMSScreenPosition for contact:', object.userData.fileName);
        object.userData.contactObject.updateSMSScreenPosition();
        console.log(`📱 Updated SMS screen position for contact: ${object.userData.fileName || object.userData.id}`);
    } else if (isContact) {
        console.log('⚠️ Contact object found but no updateSMSScreenPosition method available:', object.userData.fileName);
    }
}

function updatePointer(event) {
    if (event.touches && event.touches.length > 0) {
        pointer.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    } else {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
}

function onPointerDown(event) {
    event.preventDefault();
    sharedState.pointerDownStart = Date.now();
    sharedState.isLongPress = false;

    updatePointer(event);
    initialPointerPosition.copy(pointer);

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(sharedState.fileObjects, true);
    const intersectedObject = intersects.length > 0 ? intersects[0].object : null;

    if (sharedState.movingObject) {
        if (intersectedObject === sharedState.movingObject) {
            sharedState.isDragging = true;
            cameraControls.enabled = false;
            dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), sharedState.movingObject.position);
            const intersectionPoint = new THREE.Vector3();
            if(raycaster.ray.intersectPlane(dragPlane, intersectionPoint)){
                dragOffset.copy(intersectionPoint).sub(sharedState.movingObject.position);
            }
            console.log("JS: Started dragging selected object:", sharedState.movingObject.userData.id);
        }
        return;
    }

    if (intersectedObject && (intersectedObject.userData.type === 'fileObject' || 
                                intersectedObject.userData.type === 'app' || 
                                intersectedObject.userData.type === 'poster')) {
        if (sharedState.longPressTimeout) clearTimeout(sharedState.longPressTimeout);
        sharedState.longPressTimeout = setTimeout(() => {
            if (sharedState.isDragging || sharedState.movingObject) return;
            sharedState.isLongPress = true;
            cameraControls.enabled = false;
            cameraControls.enableRotate = false;
            
            // Special handling for poster long press
            if (intersectedObject.userData.type === 'poster' && window.PosterInteraction) {
                console.log('🖼️ Poster long press detected - opening URL input menu');
                try {
                    // Create poster interaction instance if not available
                    if (!window.posterInteractionInstance) {
                        window.posterInteractionInstance = new window.PosterInteraction(THREE, scene, objects);
                    }
                    // Handle poster long press for URL input menu
                    window.posterInteractionInstance.handlePosterLongPress(intersectedObject);
                    return; // Exit early for poster handling
                } catch (error) {
                    console.error('❌ Error handling poster long press:', error);
                    // Continue to normal long press handling as fallback
                }
            }
            
            if (window.ObjectActionChannel && window.ObjectActionChannel.postMessage) {
                window.ObjectActionChannel.postMessage(JSON.stringify({
                    id: intersectedObject.userData.id,
                    name: intersectedObject.userData.fileName
                }));
            } else {
                cameraControls.enabled = true; cameraControls.enableRotate = true;
            }
        }, longPressDuration);
    } else {
        if (sharedState.selectedObject) {
            revertVisualsForSelectedObject();
            sharedState.selectedObject = null;
            if (!sharedState.movingObject) { cameraControls.enabled = true; cameraControls.enableRotate = true; }
        }
    }
}

function onPointerMove(event) {
    event.preventDefault();
    if (sharedState.longPressTimeout) {
        const currentPointer = new THREE.Vector2();
        if (event.touches && event.touches.length > 0) {
            currentPointer.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
            currentPointer.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
        } else {
            currentPointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            currentPointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        }
        if (initialPointerPosition.distanceTo(currentPointer) > moveThreshold) {
            clearTimeout(sharedState.longPressTimeout);
            sharedState.longPressTimeout = null;
            if (!sharedState.isDragging && !sharedState.movingObject && !sharedState.isLongPress) {
                cameraControls.enabled = true; cameraControls.enableRotate = true;
            }
        }
    }

    if (sharedState.isDragging && sharedState.movingObject) {
        console.log('🔧 onPointerMove: Dragging object:', sharedState.movingObject?.userData?.fileName || 'unknown object');
        updatePointer(event);
        raycaster.setFromCamera(pointer, camera);
        const groundLevelYVal = getGroundLevelY();
        const intersectionPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
            let newX = intersectionPoint.x - dragOffset.x;
            let newZ = intersectionPoint.z - dragOffset.z;
            let snappedX = Math.round(newX / sharedState.gridSize) * sharedState.gridSize;
            let snappedZ = Math.round(newZ / sharedState.gridSize) * sharedState.gridSize;
            let snappedYBase = groundLevelYVal;

            const downRaycaster = new THREE.Raycaster(new THREE.Vector3(snappedX, camera.position.y, snappedZ), new THREE.Vector3(0, -1, 0));
            const stackIntersects = downRaycaster.intersectObjects(sharedState.fileObjects.filter(obj => obj !== sharedState.movingObject), true);
            let onTopOfObject = null;
            if (stackIntersects.length > 0) {
                for (const intersect of stackIntersects) {
                    const targetObj = intersect.object;
                    const targetHalfWidth = (targetObj.geometry.parameters.width || targetObj.geometry.parameters.radius * 2 || sharedState.gridSize) / 2;
                    const targetHalfDepth = (targetObj.geometry.parameters.depth || targetObj.geometry.parameters.radius * 2 || sharedState.gridSize) / 2;
                    if (Math.abs(snappedX - targetObj.position.x) < targetHalfWidth && Math.abs(snappedZ - targetObj.position.z) < targetHalfDepth) {
                        onTopOfObject = targetObj; break;
                    }
                }
            }
            if (onTopOfObject) {
                snappedX = onTopOfObject.position.x;
                snappedZ = onTopOfObject.position.z;
                const targetHeight = onTopOfObject.geometry.parameters.height;
                snappedYBase = onTopOfObject.position.y - targetHeight / 2 + targetHeight;
            }
            const movingObjectHeight = sharedState.movingObject.geometry.parameters.height;
            sharedState.movingObject.position.set(snappedX, snappedYBase + movingObjectHeight / 2, snappedZ);
            
            // Update link title label position
            if (window.linkTitleManager) {
                window.linkTitleManager.updateLabelPosition(sharedState.movingObject);
            }
            
            console.log('🔧 onPointerMove: Object position updated for:', sharedState.movingObject?.userData?.fileName || 'unknown object');
            
            // Update SMS screen position if this is a contact object
            updateContactSMSScreenPosition(sharedState.movingObject);
        }
    }
}

function onPointerUp(event) {
    console.log('🔥🔥🔥 OLD objectInteraction.onPointerUp() CALLED - THIS SHOULD NOT RUN!');
    event.preventDefault();
    const upTime = Date.now();
    const pressDuration = upTime - sharedState.pointerDownStart;
    const wasLongPressPending = !!sharedState.longPressTimeout;
    if (sharedState.longPressTimeout) clearTimeout(sharedState.longPressTimeout);
    sharedState.longPressTimeout = null;

    if (sharedState.isLongPress) {
        sharedState.isLongPress = false; return;
    }

    if (sharedState.isDragging && sharedState.movingObject) {
        sharedState.isDragging = false;
        cameraControls.enabled = true; cameraControls.enableRotate = true; // Ensure rotation is re-enabled
        
        // Update link title label position after drop
        if (sharedState.movingObject && window.linkTitleManager) {
            window.linkTitleManager.updateLabelPosition(sharedState.movingObject);
        }
        
        if (window.ObjectMovedChannel && window.ObjectMovedChannel.postMessage) {
            window.ObjectMovedChannel.postMessage(JSON.stringify({
                id: sharedState.movingObject.userData.id,
                x: sharedState.movingObject.position.x,
                y: sharedState.movingObject.position.y - sharedState.movingObject.geometry.parameters.height / 2,
                z: sharedState.movingObject.position.z
            }));
        }
        return;
    }
    
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    
    // Build complete list of interactables including furniture for rotation icon detection
    const allInteractables = [...sharedState.fileObjects];
    if (window.app?.furnitureManager) {
        const furnitureIds = window.app.furnitureManager.visualManager.getAllFurnitureIds();
        furnitureIds.forEach(furnitureId => {
            const furnitureGroup = window.app.furnitureManager.visualManager.getFurnitureGroup(furnitureId);
            if (furnitureGroup) {
                allInteractables.push(furnitureGroup);
            }
        });
    }
    
    const intersects = raycaster.intersectObjects(sharedState.fileObjects, true);
    const upIntersectedObject = intersects.length > 0 ? intersects[0].object : null;

    if (pressDuration < longPressDuration && wasLongPressPending && initialPointerPosition.distanceTo(pointer) > moveThreshold) {
        if (!sharedState.movingObject) { cameraControls.enabled = true; cameraControls.enableRotate = true; }
        return;
    }

    if (pressDuration < doubleTapThreshold) {
        if (sharedState.movingObject) {
            revertVisualsForMovingObject();
            if (window.ObjectMovedChannel && window.ObjectMovedChannel.postMessage) {
                window.ObjectMovedChannel.postMessage(JSON.stringify({
                    id: sharedState.movingObject.userData.id,
                    x: sharedState.movingObject.position.x,
                    y: sharedState.movingObject.position.y - sharedState.movingObject.geometry.parameters.height / 2,
                    z: sharedState.movingObject.position.z
                }));
            }
            sharedState.movingObject = null;
            cameraControls.enabled = true; cameraControls.enableRotate = true;
        } else if (upIntersectedObject) {
            const currentTime = Date.now();
            if (sharedState.lastTapTarget === upIntersectedObject && (currentTime - sharedState.lastTapTime) < doubleTapThreshold) {
                
                console.log('🔥 DOUBLE-TAP DETECTED on object:', upIntersectedObject.userData?.type, upIntersectedObject.userData);
                
                // CHECK FOR FURNITURE DOUBLE-TAP - Now handled by LinkInteractionManager (file zone pattern)
                // This legacy code path is kept for backwards compatibility but should not be reached
                if (upIntersectedObject.userData && (upIntersectedObject.userData.isFurniture || upIntersectedObject.userData.type === 'furniture')) {
                    console.log('🪑 Furniture double-tap detected (legacy path - should use LinkInteractionManager instead)');
                    
                    // Find the furniture group (might be tapping a child mesh)
                    let furnitureGroup = upIntersectedObject;
                    while (furnitureGroup && !(furnitureGroup.userData.isFurniture || furnitureGroup.userData.type === 'furniture')) {
                        furnitureGroup = furnitureGroup.parent;
                    }
                    
                    if (furnitureGroup && window.app) {
                        // Delegate to LinkInteractionManager if available (preferred)
                        if (window.app.linkInteractionManager && window.app.linkInteractionManager.handleFurnitureDoubleClick) {
                            console.log('🪑 Delegating to LinkInteractionManager (file zone pattern)');
                            window.app.linkInteractionManager.handleFurnitureDoubleClick(furnitureGroup);
                        } else {
                            // Legacy fallback: use rotationInteraction
                            console.warn('🪑 LinkInteractionManager not available - using legacy rotation fallback');
                            if (window.app.rotationInteraction) {
                                window.app.rotationInteraction.rotateFurniture(furnitureGroup, 15);
                            }
                        }
                    }
                    
                    sharedState.lastTapTime = 0; 
                    sharedState.lastTapTarget = null;
                    return;
                }
                
                // CHECK FOR POSTER DOUBLE-TAP INTERACTION
                if (upIntersectedObject.userData && upIntersectedObject.userData.isPoster && 
                    upIntersectedObject.userData.hasDoubleTabInteraction && 
                    upIntersectedObject.userData.interactionHandler) {
                    
                    console.log('🖼️ Poster double-tap detected - handling with interaction system');
                    console.log('🖼️ Poster userData:', upIntersectedObject.userData);
                    upIntersectedObject.userData.interactionHandler.handlePosterDoubleTap(upIntersectedObject);
                    sharedState.lastTapTime = 0; 
                    sharedState.lastTapTarget = null;
                    return; // Exit early for poster interaction
                } else if (upIntersectedObject.userData && upIntersectedObject.userData.isPoster) {
                    console.log('🖼️ Poster tapped but missing interaction setup:', {
                        isPoster: upIntersectedObject.userData.isPoster,
                        hasDoubleTabInteraction: upIntersectedObject.userData.hasDoubleTabInteraction,
                        hasInteractionHandler: !!upIntersectedObject.userData.interactionHandler,
                        type: upIntersectedObject.userData.type
                    });
                }
                
                // EXISTING DOUBLE-TAP BEHAVIOR FOR FILES
                const originalProperties = {
                    color: upIntersectedObject.material.color.getHex(),
                    emissive: upIntersectedObject.material.emissive ? upIntersectedObject.material.emissive.getHex() : 0x000000,
                    metalness: upIntersectedObject.material.metalness,
                    roughness: upIntersectedObject.material.roughness
                };
                upIntersectedObject.material.color.setHex(0xffffff);
                upIntersectedObject.material.emissive.setHex(0x888888);
                upIntersectedObject.material.needsUpdate = true;
                
                // CHECK IF THIS IS A DEMO MEDIA FILE - these are bundled assets that can't open in native apps
                // Check by ID prefix (demo_furniture_) or path (assets/demomedia/)
                const objectId = upIntersectedObject.userData.id || upIntersectedObject.userData.fileId || '';
                const objectPath = upIntersectedObject.userData.path || upIntersectedObject.userData.url || '';
                const isDemoFile = objectId.startsWith('demo_furniture_') || objectPath.startsWith('assets/demomedia/');
                
                if (isDemoFile) {
                    console.log('🎵 Demo file double-tapped - opening media preview (bundled assets cannot open in native app)');
                    console.log('🎵 Demo file ID:', objectId, 'Path:', objectPath);
                    
                    // Open media preview (since demo files are bundled assets, not device files)
                    if (window.app && window.app.interactionManager && window.app.interactionManager.handleMediaPreview) {
                        window.app.interactionManager.handleMediaPreview(upIntersectedObject);
                    } else {
                        console.error('❌ Cannot open demo file - interactionManager.handleMediaPreview not available');
                    }
                } else if (window.OpenFileChannel && window.OpenFileChannel.postMessage) {
                    // Only send non-demo files to Dart for native app opening
                    window.OpenFileChannel.postMessage(JSON.stringify({ 
                        id: upIntersectedObject.userData.id, name: upIntersectedObject.userData.fileName 
                    }));
                }
                
                setTimeout(() => {
                    if(upIntersectedObject && upIntersectedObject.material) {
                        const currentEmissiveHex = upIntersectedObject.material.emissive ? upIntersectedObject.material.emissive.getHex() : 0x000000;
                        if (upIntersectedObject.material.color.getHex() === 0xffffff && currentEmissiveHex === 0x888888) {
                            upIntersectedObject.material.color.setHex(originalProperties.color);
                            upIntersectedObject.material.emissive.setHex(originalProperties.emissive);
                            upIntersectedObject.material.metalness = originalProperties.metalness;
                            upIntersectedObject.material.roughness = originalProperties.roughness;
                            upIntersectedObject.material.needsUpdate = true;
                        }
                    }
                }, 1000);
                sharedState.lastTapTime = 0; sharedState.lastTapTarget = null;
            } else {
                console.log('🔍 SINGLE TAP on object:', upIntersectedObject.userData?.type, 'isPoster:', upIntersectedObject.userData?.isPoster);
                
                // CHECK FOR FURNITURE SLOT MARKER TAP - START/JUMP PLAYBACK
                if (upIntersectedObject.userData && upIntersectedObject.userData.isFurnitureSlot) {
                    const furnitureId = upIntersectedObject.userData.furnitureId;
                    const slotIndex = upIntersectedObject.userData.slotIndex;
                    console.log(`🪑 Furniture slot marker tapped: furniture ${furnitureId}, slot ${slotIndex}`);
                    
                    if (window.app && window.app.furnitureManager) {
                        // Jump to this slot in the playback
                        window.app.furnitureManager.jumpToSlot(furnitureId, slotIndex);
                    }
                    
                    sharedState.lastTapTime = 0; 
                    sharedState.lastTapTarget = null;
                    return;
                }
                
                sharedState.lastTapTime = currentTime; sharedState.lastTapTarget = upIntersectedObject;
                if (!sharedState.movingObject && !sharedState.isLongPress) { cameraControls.enabled = true; cameraControls.enableRotate = true; }
            }
        } else {
            // Tapped empty space or tapped away from moving/selected object - complete move/deselect
            if (sharedState.selectedObject) { 
                console.log('👆 Tap-away detected - deselecting:', sharedState.selectedObject.userData?.id);
                revertVisualsForSelectedObject(); 
                sharedState.selectedObject = null; 
            }
            if (sharedState.movingObject) {
                 console.log('👆 Tap-away detected - completing move for:', sharedState.movingObject.userData?.id);
                 revertVisualsForMovingObject();
                 
                 // Send final position to Flutter
                 if (window.ObjectMovedChannel && window.ObjectMovedChannel.postMessage) {
                     // Calculate proper Y position based on object type (path vs regular object)
                     const isPath = sharedState.movingObject.userData && sharedState.movingObject.userData.isPath;
                     const objectHeight = isPath ? 1 : (sharedState.movingObject.geometry?.parameters?.height || 1);
                     
                     window.ObjectMovedChannel.postMessage(JSON.stringify({
                         id: sharedState.movingObject.userData.id,
                         x: sharedState.movingObject.position.x,
                         y: sharedState.movingObject.position.y - objectHeight / 2,
                         z: sharedState.movingObject.position.z
                     }));
                     console.log('📤 Sent final position to Flutter for:', sharedState.movingObject.userData.id);
                 }
                 
                 sharedState.movingObject = null;
                 cameraControls.enabled = true; cameraControls.enableRotate = true;
            }
        }
    } else {
        if (!sharedState.movingObject && !sharedState.isLongPress && wasLongPressPending) { cameraControls.enabled = true; cameraControls.enableRotate = true; }
        if (sharedState.movingObject && initialPointerPosition.distanceTo(pointer) > moveThreshold) {
            console.log('👆 Drag-away detected - completing move for:', sharedState.movingObject.userData?.id);
            revertVisualsForMovingObject();
            
            // Send final position to Flutter  
            if (window.ObjectMovedChannel && window.ObjectMovedChannel.postMessage) {
                // Calculate proper Y position based on object type (path vs regular object)
                const isPath = sharedState.movingObject.userData && sharedState.movingObject.userData.isPath;
                const objectHeight = isPath ? 1 : (sharedState.movingObject.geometry?.parameters?.height || 1);
                
                window.ObjectMovedChannel.postMessage(JSON.stringify({
                    id: sharedState.movingObject.userData.id,
                    x: sharedState.movingObject.position.x,
                    y: sharedState.movingObject.position.y - objectHeight / 2,
                    z: sharedState.movingObject.position.z
                }));
                console.log('📤 Sent final position to Flutter for:', sharedState.movingObject.userData.id);
            }
            
            sharedState.movingObject = null;
            cameraControls.enabled = true; cameraControls.enableRotate = true;
        }
    }
}

// Helper function to revert visuals when object move is completed/cancelled
function revertVisualsForMovingObject() {
    if (!sharedState.movingObject) return;
    
    // Restore original material if it was saved (only for objects with material property)
    if (sharedState.originalMoveMaterial && sharedState.movingObject.material) {
        sharedState.movingObject.material = sharedState.originalMoveMaterial;
        sharedState.originalMoveMaterial = null;
    }
    
    console.log('✅ Reverted visuals for moving object:', sharedState.movingObject.userData?.id || 'unknown');
}

// Helper function to check if an object is a child of another
function isChildOf(child, parent) {
    if (!child || !parent) return false;
    let current = child;
    while (current.parent) {
        if (current.parent === parent) return true;
        current = current.parent;
    }
    return false;
}

// Helper function to revert visuals for selected object
function revertVisualsForSelectedObject() {
    if (!sharedState.selectedObject) return;
    
    const uuid = sharedState.selectedObject.uuid;
    if (sharedState.originalMaterial && sharedState.originalMaterial[uuid] && sharedState.selectedObject.material) {
        sharedState.selectedObject.material = sharedState.originalMaterial[uuid];
        delete sharedState.originalMaterial[uuid];
    }
    
    console.log('✅ Reverted visuals for selected object:', sharedState.selectedObject.userData?.id || 'unknown');
}

function initializeEventListeners(rendererDomElement) {
    // DISABLED: Old event listeners replaced by InputManager class
    // These legacy handlers don't have furniture detection logic
    // rendererDomElement.addEventListener('pointerdown', onPointerDown, false);
    // rendererDomElement.addEventListener('pointermove', onPointerMove, false);
    // rendererDomElement.addEventListener('pointerup', onPointerUp, false);
    console.log('⚠️ initializeEventListeners called but listeners disabled - using InputManager instead');
}

function selectObjectForMoveCommand(objectId) {
    const objectToMove = sharedState.fileObjects.find(obj => obj.userData.id === objectId);
    if (objectToMove) {
        if (sharedState.movingObject && sharedState.movingObject !== objectToMove) {
            revertVisualsForMovingObject();
        }
        sharedState.movingObject = objectToMove;
        sharedState.originalMoveMaterial = objectToMove.material.clone();
        objectToMove.material = new THREE.MeshStandardMaterial({
            color: 0xffffff, opacity: 0.9, transparent: true,
            metalness: 0.1, roughness: 0.5,
        });
        cameraControls.enabled = true; cameraControls.enableRotate = false;
        sharedState.isDragging = false;
        if (sharedState.selectedObject) { revertVisualsForSelectedObject(); sharedState.selectedObject = null; }
    }
}

function highlightObjectForDeleteConfirmation(objectId) {
    const objectToHighlight = sharedState.fileObjects.find(obj => obj.userData.id === objectId);
    if (objectToHighlight) {
        if (sharedState.selectedObject && sharedState.selectedObject !== objectToHighlight) {
            revertVisualsForSelectedObject();
        }
        sharedState.selectedObject = objectToHighlight;
        sharedState.originalMaterial[objectToHighlight.uuid] = objectToHighlight.material.clone();
        sharedState.originalEmissive[objectToHighlight.uuid] = objectToHighlight.material.emissive ? objectToHighlight.material.emissive.getHex() : 0x000000;
        objectToHighlight.material = new THREE.MeshStandardMaterial({
            color: objectToHighlight.material.color.getHex(),
            emissive: 0xff0000,
            metalness: sharedState.originalMaterial[objectToHighlight.uuid].metalness,
            roughness: sharedState.originalMaterial[objectToHighlight.uuid].roughness,
        });
    }
}

// New functions based on the change description
let currentMode = 'select'; // Assuming currentMode is a variable within this file's scope.

function selectObjectForMoveCommandJS(fileId) {
    logToFlutter(`selectObjectForMoveCommandJS: called for ${fileId}`);
    const object = scene.getObjectByProperty('userData_id', fileId);
    if (object) {
        if (sharedState.selectedObject && sharedState.selectedObject !== object) {
            setObjectOpacity(sharedState.selectedObject, 1.0); // Reset opacity of previously selected
        }
        sharedState.selectedObject = object;
        setObjectOpacity(sharedState.selectedObject, 0.7); // Highlight new selected object
        currentMode = 'move';
        sharedState.selectedObjectForMoveId = fileId; // SET THE FLAG
        logToFlutter(`selectObjectForMoveCommandJS: Object ${fileId} selected for move. currentMode: ${currentMode}, sharedState.selectedObjectForMoveId: ${sharedState.selectedObjectForMoveId}`);

        if (cameraControls) {
            logToFlutter("selectObjectForMoveCommandJS: Disabling camera rotation for move mode.");
            cameraControls.enableRotate = false;
        }
        if (typeof requestRender === 'function') requestRender();
    } else {
        logToFlutter(`selectObjectForMoveCommandJS: Object not found for ID ${fileId}`);
    }
}

function getIntersectionWithGroundPlane(event) {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const intersection = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (raycaster.ray.intersectPlane(plane, intersection)) {
        return intersection;
    }
    return null;
}

function snapToGrid(position) {
    const gridSize = sharedState.gridSize || 1;
    return {
        x: Math.round(position.x / gridSize) * gridSize,
        y: position.y,
        z: Math.round(position.z / gridSize) * gridSize
    };
}

function updateObjectPositionInState(objectId, position) {
    const object = sharedState.fileObjects.find(obj => obj.userData.id === objectId);
    if (object) {
        object.position.copy(position);
        // Update SMS screen position if this is a contact object
        updateContactSMSScreenPosition(object);
    }
}

function sendObjectMovedToFlutter(objectId, position) {
    if (window.ObjectMovedChannel && window.ObjectMovedChannel.postMessage) {
        window.ObjectMovedChannel.postMessage(JSON.stringify({
            id: objectId,
            x: position.x,
            y: position.y - (sharedState.movingObject.geometry.parameters.height / 2),
            z: position.z
        }));
    }
}

function logToFlutter(message) {
    if (window.flutter && window.flutter.log) {
        window.flutter.log(message);
    }
}

function setObjectOpacity(object, opacity) {
    if (object.material) {
        object.material.transparent = true;
        object.material.opacity = opacity;
        object.material.needsUpdate = true;
    }
}

function deselectObjectJS(sendToFlutter = true) {
    logToFlutter(`deselectObjectJS called. sendToFlutter: ${sendToFlutter}, current selected: ${sharedState.selectedObject ? sharedState.selectedObject.userData.id : 'null'}, currentMode: ${currentMode}, sharedState.selectedObjectForMoveId: ${sharedState.selectedObjectForMoveId}`);
    if (sharedState.selectedObject) {
        setObjectOpacity(sharedState.selectedObject, 1.0);
        const deselectedObjectId = sharedState.selectedObject.userData.id;

        if (sendToFlutter && window.ObjectActionChannel) {
            ObjectActionChannel.postMessage(JSON.stringify({ action: 'deselected', id: deselectedObjectId, name: sharedState.selectedObject.userData.name }));
        }
        sharedState.selectedObject = null; // Clear selectedObject *before* checking selectedObjectForMoveId related to it.
        
        // If the deselected object was the one marked for move, or if any move was active, cancel it.
        if (sharedState.selectedObjectForMoveId === deselectedObjectId || currentMode === 'move') {
            logToFlutter(`deselectObjectJS: Cancelling active move for ${sharedState.selectedObjectForMoveId || deselectedObjectId}.`);
            sharedState.selectedObjectForMoveId = null;
            currentMode = 'select'; 
            if (cameraControls) {
                logToFlutter("deselectObjectJS: Re-enabling camera rotation as move is cancelled by deselect.");
                cameraControls.enableRotate = true;
            }
        }
    } else if (currentMode === 'move' && sharedState.selectedObjectForMoveId) {
        // Case: deselectObjectJS called while a move was active but selectedObject was already null (should not happen often)
        logToFlutter(`deselectObjectJS: Move was active for ${sharedState.selectedObjectForMoveId} but selectedObject was null. Cancelling move.`);
        const objToReset = scene.getObjectByProperty('userData_id', sharedState.selectedObjectForMoveId);
        if (objToReset) setObjectOpacity(objToReset, 1.0);
        sharedState.selectedObjectForMoveId = null;
        currentMode = 'select';
        if (cameraControls) {
            cameraControls.enableRotate = true;
        }
    }
    if (typeof requestRender === 'function') requestRender();
}

// Make functions globally accessible
window.initializeEventListeners = initializeEventListeners;
window.selectObjectForMoveCommand = selectObjectForMoveCommand;
window.highlightObjectForDeleteConfirmation = highlightObjectForDeleteConfirmation;
window.selectObjectForMoveCommandJS = selectObjectForMoveCommandJS;
window.deselectObjectJS = deselectObjectJS;
