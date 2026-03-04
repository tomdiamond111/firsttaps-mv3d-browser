// modules/interaction/moveManager.js
// Dependencies: THREE (global), window.SharedStateManager
// Exports: window.MoveManager

(function() {
    'use strict';
    
    console.log("Loading MoveManager module...");
    
    // ============================================================================
    // OBJECT MOVEMENT MANAGEMENT - Dragging, Grid Snapping, Stacking
    // ============================================================================
    class MoveManager {
        constructor(THREE, scene, camera, renderer, stateManager, cameraControls, worldTemplate, app) {
            this.THREE = THREE;
            this.scene = scene;
            this.camera = camera;
            this.renderer = renderer;
            this.stateManager = stateManager;
            this.cameraControls = cameraControls;
            this.worldTemplate = worldTemplate;
            this.app = app;
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
            
            // Reference to InputManager (set later)
            this.inputManager = null;
            
            // Elevated marker helper for Y-axis adjustment during drag
            this.elevatedMarkerHelper = null; // Will be initialized after app is ready
            
            // Movement mechanics
            this.dragPlane = new THREE.Plane();
            this.dragOffset = new THREE.Vector3();
            this.lastMouseY = null; // For vertical movement tracking
            
            // Add throttling for move events to prevent infinite loops
            this.lastMoveTime = 0;
            this.moveThrottleDelay = 16; // ~60fps throttling
            this.lastMousePosition = { x: 0, y: 0 };
            
            // Furniture snap fix: Track drag operations to reset flag properly
            this.hashandledFirstMove = false;
            this.lastMovingObjectId = null;
            this.lastDragStartTime = null;
        }
        
        /**
         * Initialize elevated marker helper (called after app is fully initialized)
         */
        initializeElevatedMarkerHelper() {
            if (window.ElevatedMarkerHelper && !this.elevatedMarkerHelper) {
                this.elevatedMarkerHelper = new window.ElevatedMarkerHelper(this.app);
                console.log('🔧 MoveManager: Elevated marker helper initialized');
            }
        }

        // Set reference to InputManager after it's created
        setInputManager(inputManager) {
            this.inputManager = inputManager;
            console.log('MoveManager: InputManager reference set');
        }

        // Update world template reference when switching worlds
        setWorldTemplate(worldTemplate) {
            console.log(`MoveManager: Updating world template from ${this.worldTemplate ? this.worldTemplate.getType() : 'none'} to ${worldTemplate.getType()}`);
            this.worldTemplate = worldTemplate;
            console.log(`MoveManager: World template updated successfully to: ${this.worldTemplate.getType()}`);
        }

        // Update SMS screen position for contact objects during manual moves
        updateContactSMSPosition(object) {
            if (!object || !object.userData) return;
            
            // Check if this is a contact object
            if (object.userData.subType === 'contact' || object.userData.isContact) {
                console.log('🔧 MoveManager: Updating SMS position for contact:', object.userData.fileName || 'unknown contact');
                
                // Get contact manager and update SMS position
                const contactManager = window.getContactManager ? window.getContactManager() : null;
                if (contactManager) {
                    const contactId = object.userData.contactId || object.userData.fileId || object.userData.id;
                    const contact = contactManager.getContactById(contactId);
                    if (contact && contact.smsScreen && contact.smsScreen.isVisible) {
                        console.log('🔧 MoveManager: Contact has visible SMS screen, updating position');
                        contact.updateSMSScreenPosition();
                    }
                }
                
                // Also call sortingManager update if available
                if (window.app && window.app.sortingManager && window.app.sortingManager.updateContactSMSScreenPosition) {
                    window.app.sortingManager.updateContactSMSScreenPosition(object);
                }
            }
        }

        startMovingObject(object) {
            console.log(`🚀 startMovingObject called for: ${object.userData.fileName || 'UNNAMED'}`);
            console.log(`🚀 Object userData keys:`, Object.keys(object.userData || {}));
            console.log(`🚀 Snap properties - furnitureId: ${object.userData.furnitureId}, furnitureSlotIndex: ${object.userData.furnitureSlotIndex}`);
            console.log(`🚀 Constraint properties - furnitureSlotId: ${object.userData.furnitureSlotId}, slotIndex: ${object.userData.slotIndex}`);
            
            // FURNITURE SNAP: Reset first-move flag for new drag operation
            this.hashandledFirstMove = false;
            
            // CLEAR FROM FURNITURE SLOT: Remove object from its previous furniture slot if it was seated
            // Check BOTH property name patterns (snap sets furnitureId/furnitureSlotIndex, constraint sets furnitureSlotId/slotIndex)
            const snapFurnitureId = object.userData.furnitureId;
            const snapSlotIndex = object.userData.furnitureSlotIndex;
            const constraintFurnitureId = object.userData.furnitureSlotId;
            const constraintSlotIndex = object.userData.slotIndex;
            
            // Use snap properties if available (object was snapped), otherwise use constraint properties (object is hovering)
            const activeFurnitureId = snapFurnitureId || constraintFurnitureId;
            const activeSlotIndex = snapSlotIndex !== undefined ? snapSlotIndex : constraintSlotIndex;
            
            if (activeFurnitureId && activeSlotIndex !== undefined) {
                console.log(`🪑 Clearing object from furniture slot: ${activeFurnitureId}, slot ${activeSlotIndex}`);
                if (window.app?.furnitureManager) {
                    window.app.furnitureManager.clearObjectFromSlot(activeFurnitureId, activeSlotIndex);
                    console.log(`🪑 ✅ Cleared slot ${activeSlotIndex} in furniture ${activeFurnitureId}`);
                } else {
                    console.warn(`🪑 WARNING: window.app.furnitureManager not available!`);
                }
                
                // Delete ALL property name variants
                delete object.userData.furnitureId;
                delete object.userData.furnitureSlotIndex;
                delete object.userData.furnitureSlotId;
                delete object.userData.slotIndex;
                console.log(`🪑 ✅ Cleared all furniture metadata from object`);
            } else {
                console.log(`🪑 No furniture slot to clear - no metadata found`);
            }
            
            // CLEAR PATH/FURNITURE POSITION PRESERVATION: Allow object to use stacking system during move
            // When user manually moves an object, it should no longer preserve its path/furniture position
            if (object.userData.preservePosition) {
                console.log(`🛤️ Clearing preservePosition flag - object will use stacking system during move`);
                delete object.userData.preservePosition;
            }
            
            // MOVE HISTORY: Capture complete state before move begins (including dependent objects)
            this.app.captureMoveHistoryState(object);
            
            // STACKED OBJECT DEPENDENCY: Store original position before move starts
            this.stateManager.originalPosition = {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z
            };
            console.log('Stored original position for dependency tracking:', this.stateManager.originalPosition);
            
            // Store the original material before we start moving (handle both single material and material arrays)
            // Skip for path groups and furniture groups which don't have materials (materials are on their children)
            const isPathGroup = object.userData && object.userData.isPath && !object.material;
            const isFurnitureGroup = object.userData && object.userData.isFurniture && !object.material;
            
            let originalMaterial = null;
            if (!isPathGroup && !isFurnitureGroup && object.material) {
                try {
                    if (Array.isArray(object.material)) {
                        // Clone each material in the array
                        originalMaterial = object.material.map(mat => mat ? mat.clone() : null).filter(mat => mat !== null);
                    } else {
                        // Clone single material
                        originalMaterial = object.material.clone();
                    }
                } catch (error) {
                    console.warn('Failed to clone material:', error);
                    originalMaterial = null;
                }
            }
            this.stateManager.setMovingObject(object, originalMaterial);

            // Set up drag mechanics immediately
            this.stateManager.isDragging = true;
            this.lastMouseY = null; // Reset for vertical movement

            // Enable camera controls for pan/zoom but keep rotation disabled
            // (rotation was already disabled when object was selected for move)
            if (this.cameraControls) {
                this.cameraControls.enabled = true;
                // Ensure rotation stays disabled during move
                this.cameraControls.enableRotate = false;
                // Also disable rotation via mouse and touch
                if (this.cameraControls.mouseButtons) {
                    this.cameraControls.mouseButtons.left = 0; // Disable left mouse rotation
                }
                if (this.cameraControls.touches) {
                    this.cameraControls.touches.one = 0; // Disable single touch rotation
                }
                console.log('Camera enabled for pan/zoom, rotation remains disabled for move');
                console.log('Camera controls state - enabled:', this.cameraControls.enabled, 'enableRotate:', this.cameraControls.enableRotate);
            }

            // Set up drag plane and offset based on world type
            const constraints = this.worldTemplate ? this.worldTemplate.getPositioningConstraints() : null;
            const is3DWorld = constraints && !constraints.requiresSupport; // Space/Ocean worlds don't require support
            
            // Calculate drag offset based on world type
            this.raycaster.setFromCamera(this.inputManager ? this.inputManager.mouse : this.mouse, this.camera);
            const intersectionPoint = new this.THREE.Vector3();
            
            if (is3DWorld) {
                // 3D WORLD: Use camera-facing plane for true 3D movement
                // This allows movement in all directions that follow the camera view
                const cameraDirection = new this.THREE.Vector3();
                this.camera.getWorldDirection(cameraDirection);
                
                // Create a plane perpendicular to the camera direction, passing through the object
                const movementPlane = new this.THREE.Plane();
                movementPlane.setFromNormalAndCoplanarPoint(cameraDirection, object.position);
                
                if (this.raycaster.ray.intersectPlane(movementPlane, intersectionPoint)) {
                    this.dragOffset.copy(intersectionPoint).sub(object.position);
                } else {
                    this.dragOffset.set(0, 0, 0); // Fallback
                }
                console.log('[3D MOVEMENT SETUP] Camera-facing plane - Drag offset:', this.dragOffset);
            } else {
                // GROUND-BASED WORLD: Use horizontal plane for drag setup
                this.dragPlane.setFromNormalAndCoplanarPoint(
                    new this.THREE.Vector3(0, 1, 0), 
                    object.position
                );
                
                if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint)) {
                    this.dragOffset.copy(intersectionPoint).sub(object.position);
                } else {
                    this.dragOffset.set(0, 0, 0); // Fallback
                }
            }
            
            // Apply visual changes immediately for better feedback
            // Skip for groups without materials (paths, furniture) - they use white highlighting on children instead
            const isGroupWithoutMaterial = isPathGroup || isFurnitureGroup;
            if (!isGroupWithoutMaterial && object.material) {
                if (Array.isArray(object.material)) {
                    object.material = object.material.map(mat => mat.clone());
                    object.material[0].color.setHex(0xffffcc); // Light yellow
                    object.material[0].emissive.setHex(0x444400); // Dark yellow emission
                } else {
                    object.material = object.material.clone();
                    object.material.color.setHex(0xffffcc); // Light yellow
                    object.material.emissive.setHex(0x444400); // Dark yellow emission
                }
                
                // Keep the wireframe border but make it more visible during dragging
                const wireframe = object.children.find(child => child.userData.isWireframe);
                if (wireframe) {
                    wireframe.material.color.setHex(0x888800); // Darker yellow for border
                    wireframe.material.opacity = 1.0;
                }
            }
            
            console.log(`Object ready to drag: ${object.userData.fileName}`);
        }

        handleObjectMove(event) {
            if (!this.stateManager.movingObject) return;

            // FURNITURE SNAP FIX: Clear furniture slot on FIRST move event (handles all drag types)
            // This catches cases where movingObject was set directly without calling setMovingObject()
            
            // CRITICAL FIX: Reset flag if this is a NEW drag operation (different object OR first move of current drag)
            // Check if object UUID changed OR if this is the first move event for current object
            const currentObjectId = this.stateManager.movingObject.uuid;
            const isDifferentObject = this.lastMovingObjectId !== currentObjectId;
            const isFirstMoveOfDrag = !this.hashandledFirstMove || isDifferentObject;
            
            if (isDifferentObject) {
                console.log(`🪑 [MOVE-DEBUG] Different object detected, resetting flag`);
                this.hashandledFirstMove = false;
                this.lastMovingObjectId = currentObjectId;
            } else if (!this.lastDragStartTime || (Date.now() - this.lastDragStartTime > 500)) {
                // If more than 500ms since last drag start, this is a new drag of same object
                console.log(`🪑 [MOVE-DEBUG] New drag of same object detected (time gap), resetting flag`);
                this.hashandledFirstMove = false;
                this.lastDragStartTime = Date.now();
            }
            
            console.log(`🪑 [MOVE-DEBUG] handleObjectMove called, hashandledFirstMove=${this.hashandledFirstMove}`);
            if (!this.hashandledFirstMove) {
                const object = this.stateManager.movingObject;
                console.log(`🪑 [MOVE-DEBUG] First move check: object exists=${!!object}, userData exists=${!!(object && object.userData)}`);
                if (object && object.userData) {
                    // Check BOTH property name patterns (snap vs constraint)
                    console.log(`🪑 [MOVE-DEBUG] Snap properties - furnitureId=${object.userData.furnitureId}, furnitureSlotIndex=${object.userData.furnitureSlotIndex}`);
                    console.log(`🪑 [MOVE-DEBUG] Constraint properties - furnitureSlotId=${object.userData.furnitureSlotId}, slotIndex=${object.userData.slotIndex}`);
                    
                    const snapFurnitureId = object.userData.furnitureId;
                    const snapSlotIndex = object.userData.furnitureSlotIndex;
                    const constraintFurnitureId = object.userData.furnitureSlotId;
                    const constraintSlotIndex = object.userData.slotIndex;
                    
                    // Use snap properties if available, otherwise use constraint properties
                    const activeFurnitureId = snapFurnitureId || constraintFurnitureId;
                    const activeSlotIndex = snapSlotIndex !== undefined ? snapSlotIndex : constraintSlotIndex;
                    
                    if (activeFurnitureId && activeSlotIndex !== undefined) {
                        console.log(`🪑 [MOVE] Clearing furniture slot on first move: ${activeFurnitureId}, slot ${activeSlotIndex}`);
                        if (window.app && window.app.furnitureManager) {
                            window.app.furnitureManager.clearObjectFromSlot(activeFurnitureId, activeSlotIndex);
                            
                            // Delete ALL property name variants
                            delete object.userData.furnitureId;
                            delete object.userData.furnitureSlotIndex;
                            delete object.userData.furnitureSlotId;
                            delete object.userData.slotIndex;
                            
                            console.log(`🪑 [MOVE] ✅ Slot cleared and all metadata deleted`);
                        } else {
                            console.log(`🪑 [MOVE-ERROR] furnitureManager not available!`);
                        }
                    } else {
                        console.log(`🪑 [MOVE-DEBUG] No furniture slot data to clear`);
                    }
                    
                    // Clear path metadata on first move
                    const pathId = object.userData.pathId;
                    const pathStepIndex = object.userData.pathStepIndex;
                    
                    if (pathId && pathStepIndex !== undefined) {
                        console.log(`🛤️ [MOVE] Clearing path step on first move: ${pathId}, step ${pathStepIndex}`);
                        if (window.app && window.app.pathManager) {
                            // Fire-and-forget: don't await, just clear the path in background
                            window.app.pathManager.removeObjectFromPath(pathId, object.userData.id);
                            
                            // Delete path metadata immediately
                            delete object.userData.pathId;
                            delete object.userData.pathStepIndex;
                            
                            console.log(`🛤️ [MOVE] ✅ Path step cleared and metadata deleted`);
                        } else {
                            console.log(`🛤️ [MOVE-ERROR] pathManager not available!`);
                        }
                    } else {
                        console.log(`🛤️ [MOVE-DEBUG] No path step data to clear`);
                    }
                    
                    if (object.userData.preservePosition) {
                        delete object.userData.preservePosition;
                        console.log(`🪑 [MOVE-DEBUG] Cleared preservePosition flag`);
                    }
                }
                this.hashandledFirstMove = true;
                console.log(`🪑 [MOVE-DEBUG] Set hashandledFirstMove to true`);
            } else {
                console.log(`🪑 [MOVE-DEBUG] Skipping first-move check (already handled)`);
            }

            // Throttle move events to prevent infinite loops and improve performance
            const now = performance.now();
            if (now - this.lastMoveTime < this.moveThrottleDelay) {
                return; // Skip this move event due to throttling
            }
            this.lastMoveTime = now;

            // Update mouse position from InputManager
            if (this.inputManager) {
                this.inputManager.updateMouse(event);
                
                // Check if mouse actually moved significantly to prevent infinite loops
                const currentMouse = { x: this.inputManager.mouse.x, y: this.inputManager.mouse.y };
                const mouseMoved = Math.abs(this.lastMousePosition.x - currentMouse.x) > 0.005 || 
                                 Math.abs(this.lastMousePosition.y - currentMouse.y) > 0.005;
                
                if (!mouseMoved) {
                    // Mouse didn't move significantly, skip processing to prevent infinite loops
                    return;
                }
                
                // Update stored mouse position and current mouse
                this.lastMousePosition = { ...currentMouse };
                this.mouse.copy(this.inputManager.mouse);
            }

            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            // Get world positioning constraints to determine movement behavior
            const constraints = this.worldTemplate ? this.worldTemplate.getPositioningConstraints() : null;
            const is3DWorld = constraints && !constraints.requiresSupport; // Space/Ocean worlds don't require support
            
            // DISABLED: Vertical movement auto-detection interferes with furniture snap
            // Furniture snap now handles elevated placement automatically during drag
            // if (!this.stateManager.isVerticalMoveMode && !is3DWorld) {
            //     const nearVerticalStructure = this.detectNearbyVerticalStructures(this.stateManager.movingObject);
            //     if (nearVerticalStructure) {
            //         console.log(`🔧 [Y-AXIS AUTO] Detected nearby vertical structure: ${nearVerticalStructure.type} - enabling Y-axis drag mode`);
            //         this.stateManager.isVerticalMoveMode = true;
            //         this.lastMouseY = this.mouse.y; // Initialize for smooth transition
            //     }
            // }
            
            // DEBUG: Log world template information (reduced for performance)
            // console.log('[MOVE DEBUG] World template info:', {
            //     hasWorldTemplate: !!this.worldTemplate,
            //     worldType: this.worldTemplate ? this.worldTemplate.getType() : 'no-template',
            //     hasConstraints: !!constraints,
            //     requiresSupport: constraints ? constraints.requiresSupport : 'no-constraints',
            //     is3DWorld: is3DWorld
            // });
            
            let newPosition;
            
            // Check if we're in vertical-only movement mode
            if (this.stateManager.isVerticalMoveMode) {
                console.log('[VERTICAL MOVEMENT] In vertical move mode - processing Y-only movement');
                
                // Check if current world supports vertical movement
                const currentWorldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
                
                // CRITICAL: Allow vertical movement in green-plane when near furniture with elevated markers
                // This enables users to place objects on different shelf heights
                const supportsVerticalMovement = this.worldTemplate && typeof this.worldTemplate.supportsVerticalMovement === 'function' 
                    ? this.worldTemplate.supportsVerticalMovement() 
                    : (currentWorldType === 'space' || currentWorldType === 'ocean' || currentWorldType === 'forest' 
                       || (currentWorldType === 'green-plane' && this.stateManager.verticalStructureNearby === 'furniture'));
                
                if (!supportsVerticalMovement) {
                    console.warn(`[VERTICAL MOVEMENT] Vertical movement not supported in '${currentWorldType}' world (no vertical furniture nearby). Switch to a world that supports vertical movement.`);
                    // Continue with regular movement logic instead
                    this.stateManager.isVerticalMoveMode = false;
                } else {
                    console.log(`[VERTICAL MOVEMENT] Confirmed in '${currentWorldType}' world - vertical movement supported`);
                }
            }
            
            if (this.stateManager.isVerticalMoveMode) {
                // VERTICAL MOVEMENT ONLY: Simple up/down movement based on mouse Y
                // Keep object in same XZ position, only change Y based on mouse movement
                const currentMouseY = this.mouse.y;
                
                // Initialize lastMouseY if this is the first movement
                if (this.lastMouseY === null) {
                    this.lastMouseY = currentMouseY;
                    console.log('[VERTICAL MOVEMENT] Initializing lastMouseY:', this.lastMouseY);
                    // Return current position without any change for first frame
                    newPosition = {
                        x: this.stateManager.movingObject.position.x,
                        y: this.stateManager.movingObject.position.y,
                        z: this.stateManager.movingObject.position.z
                    };
                } else {
                    // Calculate movement delta and apply it
                    const mouseDelta = (currentMouseY - this.lastMouseY) * 50; // Positive value: swipe up = move up Y
                    const currentY = this.stateManager.movingObject.position.y;
                    
                    // Determine Y movement constraints based on world type
                    const currentWorldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
                    let newY;
                    
                    if (currentWorldType === 'space') {
                        // Space world: Allow both positive and negative Y movement within world boundaries
                        const constraints = this.worldTemplate.getPositioningConstraints();
                        const targetY = currentY + mouseDelta;
                        newY = Math.max(constraints.worldBoundaries.y.min, Math.min(constraints.worldBoundaries.y.max, targetY));
                        console.log(`[SPACE VERTICAL] Y movement: ${currentY} → ${targetY} → ${newY} (bounds: ${constraints.worldBoundaries.y.min} to ${constraints.worldBoundaries.y.max})`);
                    } else if (currentWorldType === 'ocean') {
                        // Ocean world: Allow movement within underwater boundaries (Y=-200 to Y=0)
                        const constraints = this.worldTemplate.getPositioningConstraints();
                        const targetY = currentY + mouseDelta;
                        newY = Math.max(constraints.worldBoundaries.y.min, Math.min(constraints.worldBoundaries.y.max, targetY));
                        console.log(`[OCEAN VERTICAL] Underwater movement: ${currentY} → ${targetY} → ${newY} (bounds: ${constraints.worldBoundaries.y.min} to ${constraints.worldBoundaries.y.max})`);
                    } else {
                        // Other worlds (forest, green-plane): Ground-based minimum Y = 0
                        const targetY = currentY + mouseDelta;
                        newY = Math.max(0, targetY); // Ground level minimum
                        console.log(`[${currentWorldType.toUpperCase()} VERTICAL] Ground-based movement: ${currentY} → ${targetY} → ${newY} (ground limit: 0)`);
                    }
                    
                    newPosition = {
                        x: this.stateManager.movingObject.position.x, // Keep X unchanged
                        y: newY, // Apply new Y with world-specific constraints
                        z: this.stateManager.movingObject.position.z  // Keep Z unchanged
                    };
                    
                    // Store mouse Y for next frame
                    this.lastMouseY = currentMouseY;
                    
                    console.log('[VERTICAL MOVEMENT DEBUG] Current mouse Y:', currentMouseY, 'Previous mouse Y:', this.lastMouseY + mouseDelta / 50, 'Raw delta:', (currentMouseY - (this.lastMouseY + mouseDelta / 50)), 'Scaled delta:', mouseDelta);
                    console.log('[VERTICAL MOVEMENT DEBUG] Current object Y:', currentY, 'New Y:', newY, 'Y change:', newY - currentY);
                }
            } else if (is3DWorld) {
                // 3D WORLD MOVEMENT (Space/Ocean): Allow full 3D movement
                // Use camera-facing plane for true 3D movement that follows mouse in all directions
                
                // Safety checks to prevent undefined errors
                if (!this.camera || !this.camera.position || !this.stateManager.movingObject || !this.stateManager.movingObject.position) {
                    console.error('[3D MOVEMENT ERROR] Missing required objects:', {
                        hasCamera: !!this.camera,
                        hasCameraPosition: !!this.camera?.position,
                        hasMovingObject: !!this.stateManager.movingObject,
                        hasMovingObjectPosition: !!this.stateManager.movingObject?.position
                    });
                    return;
                }
                
                const cameraPosition = this.camera.position.clone();
                const objectPosition = this.stateManager.movingObject.position.clone();
                
                // Create a plane perpendicular to the camera direction, passing through the object
                const cameraDirection = new this.THREE.Vector3();
                this.camera.getWorldDirection(cameraDirection);
                
                const movementPlane = new this.THREE.Plane();
                movementPlane.setFromNormalAndCoplanarPoint(cameraDirection, objectPosition);
                
                const intersectionPoint = new this.THREE.Vector3();
                if (this.raycaster.ray.intersectPlane(movementPlane, intersectionPoint)) {
                    // Calculate movement relative to the drag start
                    newPosition = {
                        x: intersectionPoint.x - this.dragOffset.x,
                        y: intersectionPoint.y - this.dragOffset.y,
                        z: intersectionPoint.z - this.dragOffset.z
                    };
                    
                    // Apply light grid snapping in 3D (but allow free Y movement)
                    newPosition.x = Math.round(newPosition.x / this.stateManager.gridSize) * this.stateManager.gridSize;
                    newPosition.z = Math.round(newPosition.z / this.stateManager.gridSize) * this.stateManager.gridSize;
                    // NO GRID SNAPPING FOR Y in 3D worlds - allow free floating
                    
                    // Ocean world Y-constraints are handled by world boundaries in applyPositionConstraints
                    const currentWorldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
                    console.log(`[${currentWorldType.toUpperCase()} MOVEMENT] Position before world constraints: Y=${newPosition.y}`);
                    
                    console.log('[3D MOVEMENT] Camera-facing plane - Calculated position:', newPosition);
                    console.log('[3D MOVEMENT] Y component allowed:', newPosition.y);
                    console.log('[3D MOVEMENT] Intersection point:', intersectionPoint);
                    console.log('[3D MOVEMENT] Drag offset:', this.dragOffset);
                } else {
                    // Fallback: keep current position if intersection fails
                    newPosition = {
                        x: this.stateManager.movingObject.position.x,
                        y: this.stateManager.movingObject.position.y,
                        z: this.stateManager.movingObject.position.z
                    };
                    console.log('[3D MOVEMENT] Intersection failed, keeping current position');
                }
            } else {
                // GROUND-BASED WORLD MOVEMENT (Green Plane): Use traditional XY plane + stacking logic
                const intersectionPoint = new this.THREE.Vector3();
                if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint)) {
                    let newX = intersectionPoint.x - this.dragOffset.x;
                    let newZ = intersectionPoint.z - this.dragOffset.z;
                    
                    // Grid snapping - snap to grid based on gridSize
                    let snappedX = Math.round(newX / this.stateManager.gridSize) * this.stateManager.gridSize;
                    let snappedZ = Math.round(newZ / this.stateManager.gridSize) * this.stateManager.gridSize;
                    let snappedYBase = 0; // Ground level
                    
                    // Check if object should be stacked on top of another object
                    const downRaycaster = new this.THREE.Raycaster(
                        new this.THREE.Vector3(snappedX, this.camera.position.y, snappedZ), 
                        new this.THREE.Vector3(0, -1, 0)
                    );
                    const stackIntersects = downRaycaster.intersectObjects(
                        this.stateManager.fileObjects.filter(obj => obj !== this.stateManager.movingObject), 
                        false
                    );
                    
                    let onTopOfObject = null;
                    if (stackIntersects.length > 0) {
                        for (const intersect of stackIntersects) {
                            const targetObj = intersect.object;
                            const targetHalfWidth = (targetObj.geometry.parameters.width || 
                                                   targetObj.geometry.parameters.radius * 2 || 
                                                   this.stateManager.gridSize) / 2;
                            const targetHalfDepth = (targetObj.geometry.parameters.depth || 
                                                   targetObj.geometry.parameters.radius * 2 || 
                                                   this.stateManager.gridSize) / 2;
                            
                            if (Math.abs(snappedX - targetObj.position.x) < targetHalfWidth && 
                                Math.abs(snappedZ - targetObj.position.z) < targetHalfDepth) {
                                onTopOfObject = targetObj;
                                break;
                            }
                        }
                    }
                    
                    if (onTopOfObject) {
                        // Stack on top of the object
                        snappedX = onTopOfObject.position.x;
                        snappedZ = onTopOfObject.position.z;
                        const targetHeight = onTopOfObject.geometry?.parameters?.height || 1;
                        snappedYBase = onTopOfObject.position.y + targetHeight / 2; // Top of supporting object
                    }
                    
                    // Position the moving object (traditional ground-based positioning)
                    // Handle path Groups which don't have geometry
                    const isMovingPath = this.stateManager.movingObject.userData && this.stateManager.movingObject.userData.isPath;
                    const movingObjectHeight = isMovingPath ? 1 : (this.stateManager.movingObject.geometry?.parameters?.height || 1);
                    
                    // GREEN PLANE STACKING FIX: Use normal stacking logic, but ensure no floating
                    // If object is being stacked (onTopOfObject exists), allow stacking
                    // If object is being placed on empty ground, snap to ground level
                    if (onTopOfObject) {
                        // STACKING: Place on top of the supporting object (works in all worlds)
                        newPosition = {
                            x: snappedX,
                            y: snappedYBase + movingObjectHeight / 2, 
                            z: snappedZ
                        };
                        // console.log(`[STACKING] Object placed on top of ${onTopOfObject.userData.fileName} at Y=${snappedYBase + movingObjectHeight / 2}`);
                    } else {
                        // GROUND PLACEMENT: Snap to ground level (Y=0 for green-plane, normal for others)
                        const currentWorldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
                        if (currentWorldType === 'green-plane') {
                            // Green plane: snap to ground level when not stacking
                            newPosition = {
                                x: snappedX,
                                y: movingObjectHeight / 2, // Place object so its bottom touches ground (Y=0)
                                z: snappedZ
                            };
                            console.log(`[GREEN PLANE GROUND] Object placed on ground with bottom at Y=0, center at Y=${movingObjectHeight / 2}`);
                        } else {
                            // Other worlds: use calculated ground/stacking position
                            newPosition = {
                                x: snappedX,
                                y: snappedYBase + movingObjectHeight / 2, 
                                z: snappedZ
                            };
                            console.log(`[GROUND PLACEMENT] Object placed at calculated position Y=${snappedYBase + movingObjectHeight / 2}`);
                        }
                    }
                } else {
                    // Fallback: keep current position if intersection fails
                    newPosition = {
                        x: this.stateManager.movingObject.position.x,
                        y: this.stateManager.movingObject.position.y,
                        z: this.stateManager.movingObject.position.z
                    };
                }
            }
            
            // ELEVATED MARKER Y-ADJUSTMENT: Smoothly adjust Y to follow nearby elevated markers
            // This enables natural "climbing" behavior when dragging near furniture/paths
            if (this.elevatedMarkerHelper && !is3DWorld && !this.stateManager.isVerticalMoveMode) {
                const shouldAdjust = this.elevatedMarkerHelper.shouldAdjustToMarkers(
                    this.stateManager.movingObject, 
                    is3DWorld, 
                    this.stateManager.isVerticalMoveMode
                );
                
                if (shouldAdjust) {
                    const nearbyMarker = this.elevatedMarkerHelper.findNearestElevatedMarker(newPosition, 2.0, 10.0);
                    
                    if (nearbyMarker) {
                        // Calculate target Y based on marker height
                        const targetY = this.elevatedMarkerHelper.calculateTargetY(
                            nearbyMarker.worldY, 
                            this.stateManager.movingObject
                        );
                        
                        // Smoothly lerp current Y toward target Y
                        const currentY = this.stateManager.movingObject.position.y;
                        newPosition.y = this.elevatedMarkerHelper.smoothLerp(currentY, targetY, 0.3);
                        
                        // Highlight the target marker
                        this.elevatedMarkerHelper.highlightTargetMarker(nearbyMarker);
                        
                        console.log(`🔧 [Y-ADJUST] Climbing to ${nearbyMarker.type} marker at Y=${nearbyMarker.worldY.toFixed(2)}, target object Y=${targetY.toFixed(2)}`);
                    } else {
                        // No nearby marker - clear highlight
                        this.elevatedMarkerHelper.clearHighlight();
                    }
                }
            }
            
            // Apply world-specific position constraints BEFORE setting position
            // CRITICAL: Skip constraints for objects with preservePosition flag (path-seated objects)
            if (this.worldTemplate && !this.stateManager.movingObject.userData.preservePosition) {
                // FURNITURE SNAP DURING DRAG: Check if object is near furniture slot and set preservePosition flag
                // This prevents constraints from dropping the object back to ground
                if (window.app?.furnitureManager) {
                    const isApp = this.stateManager.movingObject.userData.type === 'app';
                    const extension = (this.stateManager.movingObject.userData.extension || '').toLowerCase();
                    const isVideo = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'].includes(extension);
                    const isAudio = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(extension);
                    const isDocument = ['.pdf', '.doc', '.docx', '.txt'].includes(extension);
                    
                    if (isApp || isVideo || isAudio || isDocument) {
                        // Check if we're near a furniture slot (use newPosition, not current position)
                        const furnitureSnapInfo = window.app.furnitureManager.findNearestFurnitureSlot(newPosition, 2.0);
                        if (furnitureSnapInfo && furnitureSnapInfo.furniture.visualElements?.slotMeshes) {
                            // Get the slot's world position
                            const slotMesh = furnitureSnapInfo.furniture.visualElements.slotMeshes[furnitureSnapInfo.slotIndex];
                            const slotWorldPos = new this.THREE.Vector3();
                            slotMesh.getWorldPosition(slotWorldPos);
                            
                            // Calculate the Y position where the object should sit on the furniture
                            const objectHeight = this.stateManager.movingObject.userData?.objectHeight || 
                                               this.stateManager.movingObject.geometry?.parameters?.height || 1;
                            const targetY = slotWorldPos.y + (objectHeight / 2);
                            
                            // Update newPosition to snap to furniture slot
                            newPosition.x = slotWorldPos.x;
                            newPosition.y = targetY;
                            newPosition.z = slotWorldPos.z;
                            
                            // Set preservePosition flag to prevent constraints from dropping it
                            this.stateManager.movingObject.userData.preservePosition = true;
                            
                            console.log(`🪑 DURING-DRAG SNAP: Object at furniture slot (${furnitureSnapInfo.slotIndex}), preserving position at Y=${targetY.toFixed(2)}`);
                        } else {
                            // Not near any furniture slot - clear preservePosition flag if it was set
                            if (this.stateManager.movingObject.userData.preservePosition) {
                                console.log(`🪑 DURING-DRAG: Object moved away from furniture, clearing preservePosition`);
                                delete this.stateManager.movingObject.userData.preservePosition;
                            }
                        }
                    }
                }
                
                // Only apply constraints if preservePosition wasn't just set
                if (!this.stateManager.movingObject.userData.preservePosition) {
                    // Reduced debug logging for better performance
                    // console.log('[MOVE DEBUG] World type:', this.worldTemplate.getType());
                    
                    // FURNITURE STACKING SUPPORT: Include furniture markers in constraint checking
                    const allObjects = (this.app.worldManager && this.app.worldManager.getAllObjectsIncludingFurnitureMarkers)
                        ? this.app.worldManager.getAllObjectsIncludingFurnitureMarkers() 
                        : this.stateManager.fileObjects;
                    
                    const constrainedPosition = this.worldTemplate.applyPositionConstraints(
                        this.stateManager.movingObject,
                        newPosition, // Use the calculated newPosition, not the object's current position
                        allObjects
                    );
                    // console.log('[MOVE DEBUG] Constrained position:', constrainedPosition);
                    newPosition = constrainedPosition; // Update newPosition with constraints
                }
            } else if (this.stateManager.movingObject.userData.preservePosition) {
                // Object has preservePosition flag - check if still near furniture during drag
                if (window.app?.furnitureManager) {
                    const isApp = this.stateManager.movingObject.userData.type === 'app';
                    const extension = (this.stateManager.movingObject.userData.extension || '').toLowerCase();
                    const isVideo = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'].includes(extension);
                    const isAudio = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(extension);
                    const isDocument = ['.pdf', '.doc', '.docx', '.txt'].includes(extension);
                    
                    if (isApp || isVideo || isAudio || isDocument) {
                        // Check if we're still near a furniture slot or moved to a different one
                        const furnitureSnapInfo = window.app.furnitureManager.findNearestFurnitureSlot(newPosition, 2.0);
                        if (furnitureSnapInfo && furnitureSnapInfo.furniture.visualElements?.slotMeshes) {
                            // Still near furniture (possibly different slot) - update position
                            const slotMesh = furnitureSnapInfo.furniture.visualElements.slotMeshes[furnitureSnapInfo.slotIndex];
                            const slotWorldPos = new this.THREE.Vector3();
                            slotMesh.getWorldPosition(slotWorldPos);
                            
                            const objectHeight = this.stateManager.movingObject.userData?.objectHeight || 
                                               this.stateManager.movingObject.geometry?.parameters?.height || 1;
                            const targetY = slotWorldPos.y + (objectHeight / 2);
                            
                            // Snap to the new slot position
                            newPosition.x = slotWorldPos.x;
                            newPosition.y = targetY;
                            newPosition.z = slotWorldPos.z;
                            
                            console.log(`🪑 SLOT TRANSITION: Snapping to slot ${furnitureSnapInfo.slotIndex} at Y=${targetY.toFixed(2)}`);
                        } else {
                            // Moved away from furniture during drag - DON'T clear flag yet
                            // Flag will be re-evaluated by constraint system at end of drag
                            console.log(`🪑 Furniture snap info is null during drag - keeping preservePosition for now`);
                            
                            // Still apply constraints in case we're moving to ground
                            const allObjects = (this.app.worldManager && this.app.worldManager.getAllObjectsIncludingFurnitureMarkers)
                                ? this.app.worldManager.getAllObjectsIncludingFurnitureMarkers() 
                                : this.stateManager.fileObjects;
                            
                            const constrainedPosition = this.worldTemplate.applyPositionConstraints(
                                this.stateManager.movingObject,
                                newPosition,
                                allObjects
                            );
                            newPosition = constrainedPosition;
                        }
                    }
                } else {
                    console.log(`🛤️ SKIPPING world constraints for furniture-seated object: ${this.stateManager.movingObject.userData.fileName}`);
                }
            }
            
            // Only set position if it actually changed to prevent infinite loops
            const currentPosition = {
                x: this.stateManager.movingObject.position.x, 
                y: this.stateManager.movingObject.position.y, 
                z: this.stateManager.movingObject.position.z
            };
            
            const positionChanged = Math.abs(currentPosition.x - newPosition.x) > 0.001 ||
                                   Math.abs(currentPosition.y - newPosition.y) > 0.001 ||
                                   Math.abs(currentPosition.z - newPosition.z) > 0.001;
            
            if (positionChanged) {
                // Only log significant movements to reduce console spam
                console.log('[MOVE DEBUG] Setting object position to:', newPosition);
                this.stateManager.movingObject.position.set(newPosition.x, newPosition.y, newPosition.z);
                
                // Update GlobalPositionManager with new position
                if (window.globalPositionManager && this.stateManager.currentWorldType) {
                    window.globalPositionManager.updatePosition(
                        this.stateManager.movingObject.uuid,
                        newPosition,
                        this.stateManager.currentWorldType
                    );
                    console.log(`📍 Updated global position for ${this.stateManager.movingObject.userData.fileName}`);
                }
                
                // CRITICAL: Force immediate matrix update for Groups (furniture, paths)
                // This ensures children maintain correct world positions during rapid position changes
                if (this.stateManager.movingObject.isGroup || this.stateManager.movingObject.type === 'Group') {
                    this.stateManager.movingObject.updateMatrixWorld(true);
                }
                
                console.log('[MOVE DEBUG] Position actually changed: true');
                
                // Update SMS screen position for contact objects during manual moves
                this.updateContactSMSPosition(this.stateManager.movingObject);
            } else {
                // Position didn't change significantly, skip update to prevent infinite loops
                // Uncomment for debugging: console.log('[MOVE DEBUG] Position actually changed: false');
            }
        }

        async handleObjectMoveEnd() {
            console.log(`🔍 handleObjectMoveEnd() called, movingObject exists=${!!this.stateManager.movingObject}`);
            
            if (!this.stateManager.movingObject) return;

            const object = this.stateManager.movingObject;
            
            console.log(`Stopping move for: ${object.userData.fileName}, isFurniture=${!!object.userData.isFurniture}`);
            
            // Check if object should snap to a path step
            console.log(`🛤️ DEBUG snap check: pathManager exists=${!!window.app?.pathManager}`);
            if (window.app?.pathManager) {
                // Check if it's a media object (app/link, video, or audio)
                const isApp = object.userData.type === 'app';
                const extension = (object.userData.extension || '').toLowerCase();
                const isVideo = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'].includes(extension);
                const isAudio = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(extension);
                
                console.log(`🛤️ DEBUG object type: isApp=${isApp}, extension=${extension}, isVideo=${isVideo}, isAudio=${isAudio}`);
                console.log(`🛤️ DEBUG object position: (${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)})`);
                
                if (isApp || isVideo || isAudio) {
                    console.log(`🛤️ DEBUG calling findNearestPathStep...`);
                    const snapInfo = window.app.pathManager.findNearestPathStep(object.position);
                    console.log(`🛤️ DEBUG snap result:`, snapInfo ? `distance=${snapInfo.distance.toFixed(2)}, stepIndex=${snapInfo.stepIndex}` : 'null');
                    if (snapInfo) {
                        console.log(`🛤️ ${isVideo ? 'Video' : isAudio ? 'Audio' : 'Link'} object near path step (distance: ${snapInfo.distance.toFixed(2)}), snapping...`);
                        window.app.pathManager.snapObjectToPath(object, snapInfo);
                    } else {
                        console.log(`🛤️ No nearby path step found for object at (${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)})`);
                    }
                } else {
                    console.log(`🛤️ Object type ${object.userData.type} with extension ${extension} is not snappable to path`);
                }
            }
            
            // Check if object should snap to furniture slot
            console.log(`🪑 DEBUG snap check: furnitureManager exists=${!!window.app?.furnitureManager}`);
            console.log(`🪑 DEBUG preservePosition flag: ${!!object.userData.preservePosition}`);
            
            // ALWAYS check for furniture snap on drop (removed preservePosition guard to allow manual placement)
            if (window.app?.furnitureManager) {
                // Check if it's a snappable object (app/link, video, audio, or document)
                const isApp = object.userData.type === 'app';
                const extension = (object.userData.extension || '').toLowerCase();
                const isVideo = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'].includes(extension);
                const isAudio = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(extension);
                const isDocument = ['.pdf', '.doc', '.docx', '.txt'].includes(extension);
                
                // CRITICAL: Use WORLD position for snap check, not local position
                // If object is parented to furniture, object.position is local coordinates
                const worldPosition = new window.THREE.Vector3();
                object.getWorldPosition(worldPosition);
                
                console.log(`🪑 DEBUG object type: isApp=${isApp}, extension=${extension}, isVideo=${isVideo}, isAudio=${isAudio}, isDocument=${isDocument}`);
                console.log(`🪑 DEBUG object WORLD position: (${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)}, ${worldPosition.z.toFixed(2)})`);
                console.log(`🪑 DEBUG object LOCAL position: (${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)})`);
                
                if (isApp || isVideo || isAudio || isDocument) {
                    console.log(`🪑 DEBUG calling findNearestFurnitureSlot with WORLD position and radius 4.0...`);
                    const furnitureSnapInfo = window.app.furnitureManager.findNearestFurnitureSlot(worldPosition, 4.0);
                    console.log(`🪑 DEBUG snap result:`, furnitureSnapInfo ? `distance=${furnitureSnapInfo.distance.toFixed(2)}, slotIndex=${furnitureSnapInfo.slotIndex}` : 'null');
                    if (furnitureSnapInfo) {
                        console.log(`🪑 ${isVideo ? 'Video' : isAudio ? 'Audio' : isApp ? 'Link' : 'Document'} object near furniture slot (distance: ${furnitureSnapInfo.distance.toFixed(2)}), snapping...`);
                        // CRITICAL: Pass manualPlacement=true to prevent auto-sorting when user drags object to marker
                        const snapped = await window.app.furnitureManager.snapObjectToFurnitureSlot(object, furnitureSnapInfo, true);
                        if (!snapped) {
                            console.log(`🪑 Snap failed (slot occupied) - object stays at current position`);
                        } else {
                            // Mark object as manually snapped to prevent duplicate auto-detection
                            object.userData._justManuallySnapped = true;
                            console.log(`🪑 ✅ Manual snap successful - set _justManuallySnapped flag to prevent duplicate auto-detection`);
                        }
                    } else {
                        console.log(`🪑 No nearby furniture slot found for object`);
                    }
                } else {
                    console.log(`🪑 Object type ${object.userData.type} with extension ${extension} is not snappable to furniture`);
                }
            } else if (object.userData.preservePosition) {
                console.log(`🪑 Object already furniture-snapped during drag, skipping end-of-move snap check`);
            }
            
            // Clear elevated marker highlight when movement ends
            if (this.elevatedMarkerHelper) {
                this.elevatedMarkerHelper.clearHighlight();
            }
            
            // Start transition for smooth state change
            this.stateManager.startTransition();

            // Store move completion time and object ID to prevent immediate re-selection
            this.stateManager.lastMovedObjectId = object.userData.id;
            this.stateManager.lastMoveEndTime = Date.now();

            // Smooth transition back to normal state
            setTimeout(() => {
                // FURNITURE/PATH GROUP FIX: Check if this is a group without material (furniture or path)
                console.log(`🛤️ [RESTORE DEBUG] Starting material restoration for object:`, {
                    type: object.type,
                    isFurniture: object.userData?.isFurniture,
                    isPath: object.userData?.isPath,
                    hasMaterial: !!object.material,
                    materialType: typeof object.material,
                    childCount: object.children?.length || 0
                });
                
                const isPathGroup = object.userData && object.userData.isPath && !object.material;
                const isFurnitureGroup = object.userData && object.userData.isFurniture && !object.material;
                const isGroupWithoutMaterial = isPathGroup || isFurnitureGroup;
                
                console.log(`🛤️ [RESTORE DEBUG] Group detection:`, {
                    isPathGroup,
                    isFurnitureGroup,
                    isGroupWithoutMaterial
                });
                
                if (isGroupWithoutMaterial) {
                    // Group (path/furniture): Restore child materials from originalMaterial storage
                    const groupType = isPathGroup ? 'path' : 'furniture';
                    console.log(`🛤️ Restoring ${groupType} children materials after move`);
                    console.log(`🛤️ Stored materials count:`, Object.keys(this.stateManager.originalMaterial || {}).length);
                    
                    let restoredCount = 0;
                    object.traverse((child) => {
                        if (child.isMesh) {
                            const hasStoredMaterial = this.stateManager.originalMaterial && this.stateManager.originalMaterial[child.uuid];
                            console.log(`🛤️ [CHILD DEBUG] Mesh ${child.uuid}: stored=${!!hasStoredMaterial}, material=${!!child.material}`);
                            
                            if (hasStoredMaterial) {
                                child.material = this.stateManager.originalMaterial[child.uuid];
                                delete this.stateManager.originalMaterial[child.uuid];
                                restoredCount++;
                            }
                        }
                    });
                    console.log(`🛤️ Restored ${restoredCount} child materials for ${groupType} group`);
                } else {
                    console.log(`🛤️ [RESTORE DEBUG] Not a group - using single material restoration`);
                    // Regular object: Restore single material
                    if (this.stateManager.originalMaterial[object.uuid]) {
                        object.material = this.stateManager.originalMaterial[object.uuid];
                        delete this.stateManager.originalMaterial[object.uuid];
                        console.log(`🛤️ [RESTORE DEBUG] Restored material from originalMaterial[uuid]`);
                    } else if (this.stateManager.originalMoveMaterial) {
                        object.material = this.stateManager.originalMoveMaterial;
                        console.log(`🛤️ [RESTORE DEBUG] Restored material from originalMoveMaterial`);
                    } else {
                        console.log(`🛤️ [RESTORE DEBUG] No stored material found to restore`);
                    }
                }
                
                // Hide the wireframe border since we're done moving
                const wireframe = object.children.find(child => child.userData.isWireframe);
                if (wireframe) {
                    wireframe.visible = false;
                }

                // Force clear all dragging states
                this.stateManager.isDragging = false;
                
                // Re-enable camera rotation with forced reset
                if (this.cameraControls) {
                    // First disable completely
                    this.cameraControls.enabled = false;
                    
                    // Small delay to ensure state is cleared
                    setTimeout(() => {
                        // Re-enable everything
                        this.cameraControls.enabled = true;
                        this.cameraControls.enableRotate = true;
                        this.cameraControls.enablePan = true;
                        this.cameraControls.enableZoom = true;
                        
                        // Restore mouse and touch controls for rotation
                        if (this.cameraControls.mouseButtons) {
                            this.cameraControls.mouseButtons.left = 1; // Re-enable left mouse rotation
                        }
                        if (this.cameraControls.touches) {
                            this.cameraControls.touches.one = 1; // Re-enable single touch rotation
                        }
                        
                        // Force update the controls to ensure they're responsive
                        this.cameraControls.update(0);
                        
                        console.log('Camera controls fully reset and re-enabled after move completion');
                    }, 10); // Very short delay to break any timing issues
                }

                // Clear the move-ready state since we've completed the move
                this.stateManager.selectedObjectForMoveId = null;

                console.log(`🔍 [MOVE END DEBUG] About to process furniture detection for object: ${object.userData.id || object.userData.fileName}`);
                console.log(`🔍 [MOVE END DEBUG] object.userData.isFurniture=${!!object.userData.isFurniture}, isPath=${!!object.userData.isPath}, furnitureManager=${!!window.app?.furnitureManager}`);

                // Notify Flutter about the move
                if (window.ObjectMovedChannel) {
                    // CONTACT POSITION PERSISTENCE FIX: Use correct ID format for Flutter
                    const isContact = object.userData.type === 'fileObject' && object.userData.subType === 'contact';
                    const moveData = {
                        id: isContact ? `contact://${object.userData.id}` : object.userData.id,
                        x: object.position.x,
                        y: object.position.y,
                        z: object.position.z,
                        rotation: object.rotation.y  // ROTATION FIX: Always include rotation
                    };
                    
                    // FURNITURE PLACEMENT FIX: Include furniture metadata if object was snapped to furniture
                    if (object.userData.furnitureId && object.userData.furnitureSlotIndex !== undefined) {
                        moveData.furnitureId = object.userData.furnitureId;
                        moveData.slotIndex = object.userData.furnitureSlotIndex;
                        console.log(`🪑 Including furniture metadata: furnitureId=${moveData.furnitureId}, slotIndex=${moveData.slotIndex}`);
                    }
                    
                    // ENHANCED CONTACT DEBUG LOGGING
                    if (isContact) {
                        console.log('🔍 CONTACT POSITION PERSISTENCE DEBUG:');
                        console.log(`   📱 Contact Name: ${object.userData.fileName}`);
                        console.log(`   📱 userData.id: ${object.userData.id}`);
                        console.log(`   📱 userData.contactId: ${object.userData.contactId}`);
                        console.log(`   📱 userData.fileId: ${object.userData.fileId}`);
                        console.log(`   📱 Position: (${moveData.x}, ${moveData.y}, ${moveData.z})`);
                        console.log(`   📱 ObjectMovedChannel message:`, JSON.stringify(moveData));
                        
                        // Additional validation checks
                        console.log('📱 CONTACT ID VALIDATION:');
                        console.log(`   ✓ All IDs match: ${object.userData.id === object.userData.contactId && object.userData.id === object.userData.fileId}`);
                        console.log(`   ✓ ID format valid: ${object.userData.id && !object.userData.id.includes('contact://')}`);
                        console.log(`   ✓ ContactManager has this contact: ${window.app?.contactManager?.contacts?.has(object.userData.id) || 'ContactManager not available'}`);
                        console.log(`   ✓ Flutter ID format: ${isContact ? `contact://${object.userData.id}` : object.userData.id}`);
                    }
                    
                    console.log(`DEBUG: Sending ObjectMovedChannel for object: ${object.userData.fileName} with ID: ${object.userData.id} at position: (${moveData.x}, ${moveData.y}, ${moveData.z})`);
                    window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                    console.log(`🔍 [MOVE END DEBUG] Sent position to Flutter BEFORE furniture detection`);
                }

                // 🎯 NEW: Show furniture controls after moving furniture
                if (object.userData.isFurniture && window.furnitureUI) {
                    console.log('🎮 Showing furniture controls after move');
                    // Show controls with tutorial hint for first-time users
                    window.furnitureUI.showControls(object, true);
                }

                console.log(`🔍 [MOVE END DEBUG] Checking furniture auto-detection condition...`);
                console.log(`🔍 [MOVE END DEBUG] !isFurniture=${!object.userData.isFurniture}, !isPath=${!object.userData.isPath}, furnitureManager exists=${!!window.app?.furnitureManager}`);
                
                // AUTO-SEAT DETECTION: Check if a regular object was dropped near furniture markers
                // IMPORTANT: This check runs for ALL objects to detect both seating AND unseating
                if (!object.userData.isFurniture && !object.userData.isPath && window.app?.furnitureManager) {
                    console.log(`🔍 [MOVE END DEBUG] ✅ ENTERED furniture auto-detection code block!`);
                    console.log(`🔍 [MOVE END DEBUG] Object userData:`, JSON.stringify({id: object.userData.id, fileName: object.userData.fileName, isFurniture: object.userData.isFurniture, isPath: object.userData.isPath, furnitureId: object.userData.furnitureId}));
                    const objectId = object.userData.id || object.userData.fileName;
                    
                    // CRITICAL: Use WORLD position, not local position!
                    // If object is parented to furniture, object.position is local to the furniture group
                    // and will always appear "close" to the furniture markers even after moving away
                    const objectPos = new window.THREE.Vector3();
                    object.getWorldPosition(objectPos);
                    
                    const wasOnFurniture = !!object.userData.furnitureId;
                    
                    console.log(`🪑 FURNITURE CHECK: Object ${objectId} at WORLD (${objectPos.x.toFixed(2)}, ${objectPos.y.toFixed(2)}, ${objectPos.z.toFixed(2)}), wasOnFurniture=${wasOnFurniture}, currentFurnitureId=${object.userData.furnitureId}`);
                    
                    // Check all furniture to find the closest marker
                    let closestFurniture = null;
                    let closestSlotIndex = -1;
                    let closestDistance = Infinity;
                    const SNAP_THRESHOLD = 3.0; // Maximum distance to auto-seat (adjust as needed)
                    
                    const allFurniture = window.app.furnitureManager.getAllFurniture();
                    for (const furniture of allFurniture) {
                        const furnitureGroup = window.app.furnitureManager.visualManager.getFurnitureGroup(furniture.id);
                        if (!furnitureGroup) continue;
                        
                        // Check each slot position - use positions.length, not capacity
                        // capacity is the max, but positions.length is the actual number of defined slots
                        for (let i = 0; i < furniture.positions.length; i++) {
                            const slotPos = furniture.getSlotPosition(i);
                            if (!slotPos) continue;
                            
                            // Convert slot position to world coordinates
                            const worldPos = new window.THREE.Vector3(slotPos.x, slotPos.y, slotPos.z);
                            furnitureGroup.localToWorld(worldPos);
                            
                            // Calculate distance to object
                            const distance = objectPos.distanceTo(worldPos);
                            
                            if (distance < closestDistance && distance < SNAP_THRESHOLD) {
                                closestDistance = distance;
                                closestFurniture = furniture;
                                closestSlotIndex = i;
                            }
                        }
                    }
                    
                    console.log(`🪑 FURNITURE SEARCH RESULT: closestFurniture=${closestFurniture?.id || 'none'}, closestDistance=${closestDistance.toFixed(2)}, threshold=${SNAP_THRESHOLD}`);
                    
                    console.log(`🪑 DECISION TREE:`);
                    console.log(`🪑   - closestFurniture exists? ${!!closestFurniture}`);
                    console.log(`🪑   - closestSlotIndex valid? ${closestSlotIndex >= 0}`);
                    console.log(`🪑   - object.userData.furnitureId exists? ${!!object.userData.furnitureId}`);
                    console.log(`🪑   - object.userData.furnitureId value: ${object.userData.furnitureId}`);
                    console.log(`🪑   - object.parent type: ${object.parent?.type}, isFurniture: ${!!object.parent?.userData?.isFurniture}`);
                    console.log(`🪑   - object.parent name: ${object.parent?.userData?.id || object.parent?.name || 'unnamed'}`);
                    
                    // If object is close enough to a furniture marker, seat it there
                    if (closestFurniture && closestSlotIndex >= 0) {
                        // DUPLICATE PREVENTION: Skip auto-seat if object was just manually snapped
                        if (object.userData._justManuallySnapped) {
                            console.log(`🪑 ⏭️ BRANCH A SKIP: Object ${objectId} was just manually snapped - skipping auto-detection to prevent duplicate entry`);
                            delete object.userData._justManuallySnapped; // Clear flag for next move
                        } else {
                            console.log(`🪑 ✅ BRANCH A: AUTO-SEAT - Object ${objectId} dropped near furniture ${closestFurniture.id} slot ${closestSlotIndex} (distance: ${closestDistance.toFixed(2)})`);
                            
                            // Remove from old furniture if it was seated elsewhere
                            if (object.userData.furnitureId && object.userData.furnitureId !== closestFurniture.id) {
                                console.log(`🪑 ✅ BRANCH A.1: Removing object from old furniture ${object.userData.furnitureId}`);
                                window.app.furnitureManager.removeObjectFromFurniture(object.userData.furnitureId, objectId);
                            }
                            
                            // Add to new furniture (this will persist the furniture metadata)
                            window.app.furnitureManager.addObjectToFurniture(closestFurniture.id, objectId);
                            console.log(`🪑 ✅ BRANCH A COMPLETE: Object ${objectId} now seated on furniture ${closestFurniture.id}`);
                        }
                    } else if (object.userData.furnitureId) {
                        // Object was moved away from furniture - remove it from furniture
                        console.log(`🪑 ✅ BRANCH B: UNSEATING - Object ${objectId} moved away from furniture ${object.userData.furnitureId} (no close markers found)`);
                        console.log(`🪑 ✅ BRANCH B: CALLING removeObjectFromFurniture(${object.userData.furnitureId}, ${objectId})`);
                        window.app.furnitureManager.removeObjectFromFurniture(object.userData.furnitureId, objectId);
                        // Check results after brief delay to allow re-parenting to complete
                        setTimeout(() => {
                            console.log(`🪑 ✅ BRANCH B: After removal - object.parent type: ${object.parent?.type}, name: ${object.parent?.userData?.id || object.parent?.name || 'unnamed'}`);
                            console.log(`🪑 ✅ BRANCH B: After removal - object.userData.furnitureId: ${object.userData.furnitureId}`);
                        }, 10);
                    } else if (object.parent && object.parent.userData && object.parent.userData.isFurniture) {
                        // CRITICAL FIX: Object is parented to furniture but has NO metadata
                        // This happens when objects are manually placed on furniture without proper seating
                        // We must un-parent it from the furniture group and add to scene
                        const furnitureGroupId = object.parent.userData.id || object.parent.userData.furnitureId;
                        const furniture = window.app.furnitureManager.storageManager.getFurniture(furnitureGroupId);
                        console.log(`🪑 ✅ BRANCH D: ORPHAN FIX - Object ${objectId} is child of furniture ${furnitureGroupId} but has NO metadata - un-parenting`);
                        
                        // Find orphaned "occupied" markers - markers showing occupied but with no object on them
                        // When object is moved off furniture, it's FAR AWAY, so we look for occupied markers
                        // that have NO object within 0.5 units (abandoned markers)
                        const slotsToClean = [];
                        if (window.app.furnitureManager.visualManager) {
                            const visualElements = window.app.furnitureManager.visualManager.furnitureMeshes.get(furnitureGroupId);
                            const occupiedMaterial = window.app.furnitureManager.visualManager.slotMaterials.occupied;
                            
                            console.log(`🪑 BRANCH D: Starting orphaned marker cleanup - slots: ${visualElements?.slots?.length || 0}`);
                            
                            if (visualElements && visualElements.slots && occupiedMaterial) {
                                const furnitureGroup = object.parent;
                                
                                // Check each occupied marker to see if any object is actually on it
                                for (let i = 0; i < visualElements.slots.length; i++) {
                                    const slotMaterial = visualElements.slots[i].material;
                                    
                                    // Compare materials by color since reference comparison might fail
                                    const isOccupied = slotMaterial && occupiedMaterial && 
                                                      slotMaterial.color && occupiedMaterial.color &&
                                                      slotMaterial.color.equals(occupiedMaterial.color);
                                    
                                    if (isOccupied) {
                                        const slotWorldPos = new window.THREE.Vector3();
                                        visualElements.slots[i].getWorldPosition(slotWorldPos);
                                        
                                        // Check if ANY object in furniture children is on this marker
                                        // IMPORTANT: Exclude the object being moved from this check
                                        let hasObjectOnMarker = false;
                                        let debugChildInfo = null;
                                        
                                        console.log(`🪑 BRANCH D DEBUG: Checking slot ${i} at (${slotWorldPos.x.toFixed(2)}, ${slotWorldPos.z.toFixed(2)}), furniture has ${furnitureGroup.children.length} children`);
                                        
                                        furnitureGroup.children.forEach(child => {
                                            // Skip slot markers - they shouldn't count as objects
                                            const isSlotMarker = child.userData && (child.userData.isSlotMarker || child.userData.slotIndex !== undefined);
                                            
                                            // Skip the object being moved
                                            const isObjectBeingMoved = child === object;
                                            
                                            // Only check actual file objects with IDs
                                            if (!isSlotMarker && !isObjectBeingMoved && child.userData && child.userData.id) {
                                                const childWorldPos = new window.THREE.Vector3();
                                                child.getWorldPosition(childWorldPos);
                                                
                                                const distance = Math.sqrt(
                                                    Math.pow(slotWorldPos.x - childWorldPos.x, 2) +
                                                    Math.pow(slotWorldPos.z - childWorldPos.z, 2)
                                                );
                                                
                                                console.log(`🪑 BRANCH D DEBUG:   Child "${child.userData.fileName || child.userData.id}" at (${childWorldPos.x.toFixed(2)}, ${childWorldPos.z.toFixed(2)}), distance=${distance.toFixed(2)}`);
                                                
                                                if (distance < 0.5) {
                                                    hasObjectOnMarker = true;
                                                    debugChildInfo = `${child.userData.fileName || child.userData.id} at dist ${distance.toFixed(2)}`;
                                                }
                                            }
                                        });
                                        
                                        if (!hasObjectOnMarker) {
                                            console.log(`🪑 BRANCH D: ✅ Found orphaned occupied marker at slot ${i} (no object within 0.5 units)`);
                                            slotsToClean.push(i);
                                        } else {
                                            console.log(`🪑 BRANCH D: Slot ${i} has occupied material, object on it: ${debugChildInfo} - keeping`);
                                        }
                                    }
                                }
                                
                                console.log(`🪑 BRANCH D: Found ${slotsToClean.length} orphaned markers to clean`);
                            }
                        }
                        
                        // Get world position before re-parenting
                        const worldPos = new window.THREE.Vector3();
                        object.getWorldPosition(worldPos);
                        console.log(`🪑 BRANCH D: Object world position: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
                        
                        // Remove from furniture group
                        object.parent.remove(object);
                        console.log(`🪑 BRANCH D: Removed from furniture group`);
                        
                        // Add to scene
                        window.app.scene.add(object);
                        console.log(`🪑 BRANCH D: Added to scene`);
                        
                        // Set world position
                        object.position.copy(worldPos);
                        console.log(`🪑 BRANCH D: Set position to (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
                        
                        // Clear orphaned slot markers
                        if (slotsToClean.length > 0 && window.app.furnitureManager.visualManager) {
                            const visualElements = window.app.furnitureManager.visualManager.furnitureMeshes.get(furnitureGroupId);
                            if (visualElements && visualElements.slots) {
                                slotsToClean.forEach(slotIndex => {
                                    if (visualElements.slots[slotIndex]) {
                                        visualElements.slots[slotIndex].material = window.app.furnitureManager.visualManager.slotMaterials.default;
                                        console.log(`🪑 BRANCH D: ✅ Cleared orphaned marker at slot ${slotIndex}`);
                                        
                                        // Also clear the objectIds array slot
                                        if (furniture && furniture.objectIds) {
                                            furniture.objectIds[slotIndex] = null;
                                        }
                                    }
                                });
                                console.log(`🪑 BRANCH D: Cleaned ${slotsToClean.length} orphaned markers`);
                            }
                        }
                        
                        // Persist cleared state to Flutter
                        if (window.ObjectMovedChannel) {
                            const isContact = object.userData.type === 'fileObject' && 
                                              object.userData.subType === 'contact';
                            const moveData = {
                                id: isContact ? `contact://${object.userData.id}` : object.userData.id,
                                x: object.position.x,
                                y: object.position.y,
                                z: object.position.z,
                                furnitureId: null,
                                slotIndex: null
                            };
                            window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                            console.log(`🪑 BRANCH D: Persisted cleared furniture state to Flutter`);
                        }
                        
                        setTimeout(() => {
                            console.log(`🪑 ✅ BRANCH D: After fix - object.parent type: ${object.parent?.type}, name: ${object.parent?.userData?.id || object.parent?.name || 'unnamed'}`);
                            console.log(`🪑 ✅ BRANCH D: After fix - object.parent === scene? ${object.parent === window.app.scene}`);
                        }, 10);
                    } else {
                        console.log(`🪑 ✅ BRANCH C: NO ACTION - Object ${objectId} is not on furniture and no nearby furniture found`);
                    }
                }

                console.log(`🔍 [FURNITURE CHECK] isFurniture=${!!object.userData.isFurniture}, furnitureManager exists=${!!window.app?.furnitureManager}`);
                
                // FURNITURE DEPENDENCY: If moving furniture, update its position and save
                if (object.userData && object.userData.isFurniture && window.app?.furnitureManager) {
                    const furnitureId = object.userData.furnitureId || object.userData.id;
                    console.log(`🪑 Furniture moved, updating position for: ${furnitureId}`);
                    
                    // Calculate how much the furniture moved
                    const oldPosition = this.stateManager.originalPosition;
                    const newPosition = {
                        x: object.position.x,
                        y: object.position.y,
                        z: object.position.z
                    };
                    const delta = {
                        x: newPosition.x - oldPosition.x,
                        y: newPosition.y - oldPosition.y,
                        z: newPosition.z - oldPosition.z
                    };
                    console.log(`🪑 Furniture delta: (${delta.x.toFixed(2)}, ${delta.y.toFixed(2)}, ${delta.z.toFixed(2)})`);
                    
                    // Move all objects seated on this furniture
                    const furniture = window.app.furnitureManager.storageManager.getFurniture(furnitureId);
                    console.log(`🔍 [FURNITURE DATA] furniture=${!!furniture}, objectIds=${furniture?.objectIds?.length || 0}, filtered=${furniture?.objectIds?.filter(id => id).length || 0}`);
                    
                    if (furniture && furniture.objectIds && furniture.objectIds.length > 0) {
                        console.log(`🪑 Moving ${furniture.objectIds.filter(id => id).length} seated objects with furniture...`);
                        
                        furniture.objectIds.forEach((objectId, slotIndex) => {
                            if (!objectId) return;
                            
                            // Find the object mesh
                            const seatedObject = this.app.stateManager.fileObjects?.find(obj => 
                                obj.userData.id === objectId || obj.userData.fileName === objectId
                            );
                            
                            if (seatedObject) {
                                // Move object by the same delta
                                seatedObject.position.x += delta.x;
                                seatedObject.position.y += delta.y;
                                seatedObject.position.z += delta.z;
                                console.log(`🪑 Moved seated object ${objectId} from slot ${slotIndex} by delta (${delta.x.toFixed(2)}, ${delta.y.toFixed(2)}, ${delta.z.toFixed(2)})`);
                                
                                // CRITICAL: Re-confirm furniture flags to prevent gravity from dropping objects
                                seatedObject.userData.preservePosition = true;
                                seatedObject.userData.furnitureId = furnitureId;
                                seatedObject.userData.furnitureSlotIndex = slotIndex;
                                console.log(`🪑 Re-confirmed furniture flags for ${objectId}: preservePosition=true, furnitureId=${furnitureId}, slot=${slotIndex}`);
                                
                                // Update global position tracking
                                if (window.app?.globalPositionManager) {
                                    window.app.globalPositionManager.updateObjectPosition(
                                        seatedObject.userData.fileName || seatedObject.userData.id,
                                        this.app.currentWorldTemplate.getType(),
                                        {
                                            x: seatedObject.position.x,
                                            y: seatedObject.position.y,
                                            z: seatedObject.position.z
                                        }
                                    );
                                }
                            }
                        });
                    }
                    
                    window.app.furnitureManager.updateFurniturePosition(furnitureId, newPosition);
                    console.log(`🪑 Furniture position updated and saved: (${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${newPosition.z.toFixed(2)})`);
                }

                // PATH DEPENDENCY: If moving a path, move all seated objects with it
                console.log(`🛤️ PATH MOVE CHECK: userData=${!!object.userData}, isPath=${object.userData?.isPath}, pathManager=${!!window.app?.pathManager}`);
                console.log(`🛤️ PATH MOVE OBJECT DETAILS: name=${object.name}, type=${object.type}, fileName=${object.userData?.fileName}`);
                console.log(`🛤️ PATH MOVE USERDATA KEYS:`, Object.keys(object.userData || {}));
                if (object.userData?.isPath) {
                    console.log(`🛤️ Path userData: type=${object.userData.type}, fileName=${object.userData.fileName}, id=${object.userData.id}`);
                } else {
                    console.log(`🛤️ NOT A PATH - checking parent...`);
                    if (object.parent && object.parent.userData?.isPath) {
                        console.log(`🛤️ PARENT IS A PATH! parent.name=${object.parent.name}, parent.id=${object.parent.userData.id}`);
                        console.log(`🛤️ ERROR: We're moving a child marker instead of the path group!`);
                    }
                }
                
                if (object.userData && object.userData.isPath && window.app?.pathManager) {
                    console.log('🛤️ DEBUG: Moving path, checking for seated objects...');
                    const pathId = object.userData.id;
                    const path = window.app.pathManager.storageManager.getPath(pathId);
                    console.log(`🛤️ Retrieved path from storage: ${!!path}, objectIds=${path?.objectIds?.length || 0}`);
                    console.log(`🛤️ Retrieved path from storage: ${!!path}, objectIds=${path?.objectIds?.length || 0}`);
                    
                    if (path && path.objectIds && path.objectIds.length > 0) {
                        console.log(`🛤️ DEBUG: Found path with ${path.objectIds.filter(id => id).length} seated objects`);
                        
                        // CRITICAL FIX: Don't calculate delta - the path GROUP position is unreliable due to constraints
                        // Instead, directly update stored positions to match where visual markers currently are
                        const visualElements = window.app.pathManager.visualManager.pathMeshes.get(pathId);
                        console.log(`🛤️ DEBUG: Visual elements found: ${!!visualElements}, markers count: ${visualElements?.markers?.length || 0}`);
                        
                        if (visualElements && visualElements.markers) {
                            console.log(`🛤️ DEBUG: Syncing stored path data with current visual marker WORLD positions...`);
                            const oldFirstPos = { ...path.positions[0] };
                            
                            // CRITICAL: Get WORLD positions, not local positions
                            // The markers are children of the path group, so their local positions don't change during drag
                            // We need to get their actual world space positions
                            const worldPos = new THREE.Vector3();
                            path.positions = visualElements.markers.map((marker, index) => {
                                marker.getWorldPosition(worldPos);
                                console.log(`🛤️ Marker ${index} world position: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
                                return {
                                    x: worldPos.x,
                                    y: worldPos.y - 0.15, // Markers are elevated 0.15 above stored position
                                    z: worldPos.z
                                };
                            });
                            console.log(`🛤️ DEBUG: First position updated from (${oldFirstPos.x.toFixed(2)}, ${oldFirstPos.y.toFixed(2)}, ${oldFirstPos.z.toFixed(2)}) to (${path.positions[0].x.toFixed(2)}, ${path.positions[0].y.toFixed(2)}, ${path.positions[0].z.toFixed(2)})`);
                            
                            
                            // CRITICAL: Regenerate guideline geometry with new positions
                            console.log(`🛤️ REGENERATING GUIDELINE after path move`);
                            if (window.app.pathManager.visualManager && typeof window.app.pathManager.visualManager.updateGuideLine === 'function') {
                                window.app.pathManager.visualManager.updateGuideLine(pathId);
                                console.log(`🛤️ ✅ Guideline regenerated successfully`);
                            } else {
                                console.warn(`🛤️ ⚠️ updateGuideLine method not available`);
                            }
                            
                            // Re-snap each seated object to its marker's CURRENT position
                            console.log(`🛤️ DEBUG: Re-snapping ${path.objectIds.filter(id => id).length} seated objects to current marker WORLD positions...`);
                            const markerWorldPos = new THREE.Vector3();
                            path.objectIds.forEach((objectId, stepIndex) => {
                                if (!objectId) return; // Skip empty steps
                                
                                // Find the seated object in the scene
                                const seatedObj = this.stateManager.fileObjects.find(obj => 
                                    obj.userData.id === objectId || obj.userData.fileId === objectId
                                );
                                
                                if (seatedObj && visualElements.markers[stepIndex]) {
                                    const marker = visualElements.markers[stepIndex];
                                    const oldPos = { x: seatedObj.position.x, y: seatedObj.position.y, z: seatedObj.position.z };
                                    
                                    // Get marker's world position
                                    marker.getWorldPosition(markerWorldPos);
                                    
                                    // Re-snap to marker world position (marker.y + 1.0 elevation)
                                    seatedObj.position.x = markerWorldPos.x;
                                    seatedObj.position.y = markerWorldPos.y + 1.0;
                                    seatedObj.position.z = markerWorldPos.z;
                                    
                                    console.log(`🛤️ Re-snapped seated object ${seatedObj.userData.fileName || objectId} from (${oldPos.x.toFixed(2)}, ${oldPos.y.toFixed(2)}, ${oldPos.z.toFixed(2)}) to (${seatedObj.position.x.toFixed(2)}, ${seatedObj.position.y.toFixed(2)}, ${seatedObj.position.z.toFixed(2)})`);
                                    
                                    // CRITICAL: Set preservePosition flag to prevent gravity from dropping this object
                                    seatedObj.userData.preservePosition = true;
                                    
                                    // Update fileData position for persistence
                                    if (seatedObj.userData.fileData) {
                                        seatedObj.userData.fileData.x = seatedObj.position.x;
                                        seatedObj.userData.fileData.y = seatedObj.position.y;
                                        seatedObj.userData.fileData.z = seatedObj.position.z;
                                    }
                                } else if (seatedObj) {
                                    console.log(`🛤️ WARNING: Could not find marker ${stepIndex} for seated object ${objectId}`);
                                } else {
                                    console.log(`🛤️ WARNING: Could not find seated object with ID ${objectId}`);
                                }
                            });
                        } else {
                            console.log(`🛤️ WARNING: Could not find visual elements or markers for path ${pathId}`);
                        }
                        
                        // Save updated path
                        window.app.pathManager.storageManager.updatePath(path);
                        console.log(`🛤️ Updated path data and visual markers after move`);
                        
                        // CRITICAL: Notify Flutter about seated object positions AFTER path move
                        // We delay this until after stacking/gravity runs to prevent interference
                        setTimeout(() => {
                            path.objectIds.forEach((objectId, stepIndex) => {
                                if (!objectId) return;
                                
                                const seatedObj = this.stateManager.fileObjects.find(obj => 
                                    obj.userData.id === objectId || obj.userData.fileId === objectId
                                );
                                
                                if (seatedObj && window.ObjectMovedChannel) {
                                    const moveData = {
                                        id: seatedObj.userData.fileId || seatedObj.userData.id,
                                        x: seatedObj.position.x,
                                        y: seatedObj.position.y,
                                        z: seatedObj.position.z
                                    };
                                    console.log(`🛤️ Notifying Flutter of seated object position: ${seatedObj.userData.fileName} at (${moveData.x.toFixed(2)}, ${moveData.y.toFixed(2)}, ${moveData.z.toFixed(2)})`);
                                    ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                                }
                            });
                        }, 150); // Delay to ensure stacking/gravity completes first
                    }
                }

                // STACKED OBJECT DEPENDENCY: Move any objects stacked on top of this one
                const originalPositionForAutoSort = this.stateManager.originalPosition; // Store before clearing
                if (this.stateManager.originalPosition) {                // Calculate the movement delta
                const deltaMovement = new this.THREE.Vector3(
                    object.position.x - this.stateManager.originalPosition.x,
                    object.position.y - this.stateManager.originalPosition.y,
                    object.position.z - this.stateManager.originalPosition.z
                );
                
                // Move any objects stacked on top of this one
                if (window.moveStackedDependents && typeof window.moveStackedDependents === 'function') {
                    // FIXED: Pass original position, not delta movement
                    window.moveStackedDependents(object, this.stateManager.originalPosition, this.stateManager.fileObjects);
                    // console.log('[STACKING] Moved dependent objects with delta:', deltaMovement);
                }
                    this.stateManager.originalPosition = null; // Clear after use
                }
                
                // FLOATING OBJECT FIX: Apply gravity to any objects that might now be floating
                // This happens when an object is moved away and leaves other objects unsupported
                setTimeout(() => {
                    if (window.applyGravityToFloatingObjects && typeof window.applyGravityToFloatingObjects === 'function') {
                        window.applyGravityToFloatingObjects();
                        // console.log('[STACKING] Applied gravity check after object movement');
                    }
                    
                    // FOREST INTEGRATION: Update tree trunk support for moved object
                    if (window.forestIntegration) {
                        window.forestIntegration.onObjectMoved(object);
                    }
                }, 100); // Small delay to ensure all movements are complete

                this.stateManager.clearMovingObject();
                console.log(`Move completed for: ${object.userData.fileName}`);
                
                // AUTO-SORTING: Check if object was moved from Home Area to outside and sort if needed
                this.checkAndApplyAutoSorting(object, originalPositionForAutoSort);
                
            }, 50); // 50ms delay for more responsive stacked object movement
        }

        getGroundIntersection() {
            // Create a large invisible plane for ground intersection
            const groundGeometry = new this.THREE.PlaneGeometry(1000, 1000);
            const groundMaterial = new this.THREE.MeshBasicMaterial({ 
                visible: false 
            });
            const ground = new this.THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = 0;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            return this.raycaster.intersectObject(ground);
        }

        // Check if there are any moves that can be undone
        hasRecentMoves() {
            return this.stateManager.moveOrder.length > 0;
        }

        // Get info about the most recent move for UI display
        getRecentMoveInfo() {
            if (this.stateManager.moveOrder.length === 0) {
                return null;
            }
            
            const recentMoveId = this.stateManager.moveOrder[this.stateManager.moveOrder.length - 1];
            const moveState = this.stateManager.moveHistoryBackup.get(recentMoveId);
            
            if (!moveState) {
                return null;
            }
            
            return {
                objectId: recentMoveId,
                fileName: moveState.fileName || 'Unknown',
                from: moveState.position,
                to: moveState.currentPosition || 'Current'
            };
        }

        // Undo the most recent move operation
        async undoRecentMove() {
            console.log('=== UNDO RECENT MOVE ===');
            
            if (this.stateManager.moveOrder.length === 0) {
                console.log('No moves to undo');
                return false;
            }
            
            // Get the most recent move
            const recentMoveId = this.stateManager.moveOrder[this.stateManager.moveOrder.length - 1];
            const moveState = this.stateManager.moveHistoryBackup.get(recentMoveId);
            
            if (!moveState) {
                console.error('Move state not found for ID:', recentMoveId);
                return false;
            }
            
            console.log('Undoing move:', recentMoveId);
            console.log('Affected objects:', moveState.affectedObjects ? moveState.affectedObjects.length : 'single object');
            
            try {
                // Handle both new multi-object format and legacy single-object format
                if (moveState.affectedObjects && Array.isArray(moveState.affectedObjects)) {
                    // NEW FORMAT: Restore all affected objects to their previous states
                    for (const objState of moveState.affectedObjects) {
                        const currentObject = this.stateManager.fileObjects.find(obj => obj.userData.id === objState.objectId);
                        
                        if (currentObject) {
                            // Restore position
                            const originalPos = objState.visualState.position;
                            currentObject.position.set(originalPos.x, originalPos.y, originalPos.z);
                            
                            // Restore material properties if needed
                            this.restoreObjectMaterial(currentObject, objState.visualState);
                            
                            // CRITICAL: Restore face textures and visual properties after undo
                            this.restoreObjectVisualState(currentObject, objState.visualState);
                            
                            // Update object's userData
                            if (currentObject.userData.fileData) {
                                currentObject.userData.fileData.x = originalPos.x;
                                currentObject.userData.fileData.y = originalPos.y;
                                currentObject.userData.fileData.z = originalPos.z;
                            }
                            
                            console.log(`Restored ${currentObject.userData.fileName} to position (${originalPos.x}, ${originalPos.y}, ${originalPos.z})`);
                        } else {
                            console.warn('Object not found for restoration:', objState.objectId);
                        }
                    }
                } else {
                    // LEGACY FORMAT: Single object move (backward compatibility)
                    const object = this.stateManager.fileObjects.find(obj => obj.userData.id === recentMoveId);
                    if (!object) {
                        console.error('Object not found for undo:', recentMoveId);
                        return false;
                    }
                    
                    // Restore the original position
                    object.position.copy(moveState.position);
                    
                    // CRITICAL: Restore visual state including face textures
                    if (moveState.visualState) {
                        this.restoreObjectVisualState(object, moveState.visualState);
                    }
                    
                    // Update object's userData
                    if (object.userData.fileData) {
                        object.userData.fileData.x = moveState.position.x;
                        object.userData.fileData.y = moveState.position.y;
                        object.userData.fileData.z = moveState.position.z;
                    }
                    
                    console.log(`Restored ${moveState.fileName} to position (${moveState.position.x}, ${moveState.position.y}, ${moveState.position.z})`);
                }
                
                // Remove this move from history
                this.stateManager.moveOrder.pop();
                this.stateManager.moveHistoryBackup.delete(recentMoveId);
                
                console.log('Move undo completed successfully');
                console.log('Remaining stored moves:', this.stateManager.moveHistoryBackup.size);
                console.log('=== UNDO RECENT MOVE COMPLETE ===');
                
                return true;
                
            } catch (error) {
                console.error('Error during move undo:', error);
                return false;
            }
        }
        
        // Restore object material from visual state
        restoreObjectMaterial(object, visualState) {
            // Only restore basic material properties if needed
            // Face textures and other complex materials are handled separately
            if (!visualState.material) {
                return;
            }
            
            if (visualState.material.isArray) {
                // Multi-material case - more complex, but for basic undo we mainly need position
                // The material restoration can be enhanced later if needed
                console.log('Skipping complex material restoration for multi-material object');
            } else {
                // Single material case
                const matState = visualState.material.materials && visualState.material.materials[0];
                if (object.material && object.material.color && matState && matState.color) {
                    object.material.color.setHex(matState.color);
                }
            }
        }
        
        // Restore complete visual state including face textures after undo
        restoreObjectVisualState(object, visualState) {
            console.log(`Restoring visual state for ${object.userData.fileName}`);
            
            try {
                const fileData = object.userData.fileData;
                if (!fileData) {
                    console.warn('No fileData found for visual state restoration');
                    return;
                }
                
                // Get current state manager reference
                const stateManager = this.stateManager || window.app?.stateManager;
                
                // Restore face texture if face textures are enabled and available
                if (stateManager?.useFaceTextures && window.restoreFaceTexture) {
                    console.log(`Restoring face texture for ${object.userData.fileName} after undo`);
                    try {
                        window.restoreFaceTexture(object, fileData);
                    } catch (error) {
                        console.warn('Error restoring face texture after undo:', error);
                        // Fallback to color restoration
                        this.restoreObjectColor(object, fileData);
                    }
                } else {
                    // Restore proper color if no face texture is used
                    this.restoreObjectColor(object, fileData);
                }
                
                // Restore visibility and shadow properties if available
                if (visualState.visible !== undefined) {
                    object.visible = visualState.visible;
                }
                if (visualState.castShadow !== undefined) {
                    object.castShadow = visualState.castShadow;
                }
                if (visualState.receiveShadow !== undefined) {
                    object.receiveShadow = visualState.receiveShadow;
                }
                
                console.log(`Visual state restoration completed for ${object.userData.fileName}`);
                
            } catch (error) {
                console.error('Error in restoreObjectVisualState:', error);
            }
        }
        
        // Helper to restore object color based on file extension
        restoreObjectColor(object, fileData) {
            if (!fileData.name || !object.material) {
                return;
            }
            
            try {
                const fileExtension = fileData.name.split('.').pop().toLowerCase();
                if (window.getColorByExtensionForCanvas) {
                    const color = window.getColorByExtensionForCanvas(fileExtension);
                    if (color) {
                        object.material.color.setHex(parseInt(color.replace('#', ''), 16));
                        console.log(`Restored color ${color} for ${fileData.name}`);
                    }
                }
            } catch (error) {
                console.warn('Error restoring object color:', error);
            }
        }
        
        /**
         * Check if an object was moved from Home Area to outside and auto-sort if sorting is enabled
         */
        checkAndApplyAutoSorting(object, originalPosition) {
            // Only proceed if sorting is enabled
            if (!this.app || !this.app.sortingManager || !this.app.sortingManager.config.enabled) {
                return;
            }
            
            // Check if we have original position data
            if (!originalPosition) {
                console.log(`Auto-sort check skipped for ${object.userData.fileName}: No original position data`);
                return;
            }
            
            // Check if object was originally inside Home Area
            const wasInHomeArea = this.app.sortingManager.isInHomeArea({
                position: originalPosition
            });
            
            // Skip auto-sort if object is seated on furniture/template marker
            if (object.userData.preservePosition || object.userData.furnitureSlotId) {
                console.log(`🪑 Skipping auto-sort for ${object.userData.fileName} - object is on furniture/template marker (slot: ${object.userData.furnitureSlotId || 'N/A'})`);
                return;
            }
            
            // Check if object is now outside Home Area
            const isNowInHomeArea = this.app.sortingManager.isInHomeArea(object);
            
            console.log(`Auto-sort check for ${object.userData.fileName}:`);
            console.log(`  Was in Home Area: ${wasInHomeArea}`);
            console.log(`  Is now in Home Area: ${isNowInHomeArea}`);
            console.log(`  Original position: (${originalPosition.x}, ${originalPosition.y}, ${originalPosition.z})`);
            console.log(`  Current position: (${object.position.x}, ${object.position.y}, ${object.position.z})`);
            
            // If object was moved FROM Home Area TO outside, auto-sort it
            if (wasInHomeArea && !isNowInHomeArea) {
                console.log(`Auto-sorting ${object.userData.fileName} to appropriate zone`);
                
                // Get the category for this object
                const category = this.app.sortingManager.getFileCategory(object);
                const zone = this.app.sortingManager.getZoneForCategory(category);
                
                if (zone) {
                    console.log(`Moving ${object.userData.fileName} to ${category} zone`);
                    
                    // Calculate target position in the zone
                    // Find existing objects in this zone to position correctly
                    const objectsInZone = this.app.sortingManager.getObjectsInZone(category);
                    const gridSpacing = this.stateManager.gridSize || 4;
                    
                    // Calculate grid position for this object (append to existing objects)
                    const objectsPerRow = Math.ceil(Math.sqrt(objectsInZone.length + 1));
                    const index = objectsInZone.length; // This object will be the next one
                    const row = Math.floor(index / objectsPerRow);
                    const col = index % objectsPerRow;
                    
                    const offsetX = (col - (objectsPerRow - 1) / 2) * gridSpacing;
                    const offsetZ = (row - (Math.ceil((objectsInZone.length + 1) / objectsPerRow) - 1) / 2) * gridSpacing;
                    
                    const targetPosition = {
                        x: zone.center.x + offsetX,
                        y: this.app.sortingManager.calculateObjectYPosition(zone, object),
                        z: zone.center.z + offsetZ
                    };
                    
                    console.log(`Target zone position: (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z})`);
                    
                    // Special handling for contact objects
                    const isContact = object.userData.subType === 'contact' || 
                                    object.userData.isContact || 
                                    (object.userData.id && object.userData.id.startsWith('contact://')) ||
                                    (object.userData.fileName && object.userData.fileName.includes('.contact'));
                    
                    if (isContact) {
                        console.log(`📱 Auto-sorting contact ${object.userData.fileName} to ${category} zone`);
                        
                        // For contacts, move them directly and then persist the position
                        object.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
                        
                        // Update object's file data
                        if (object.userData.fileData) {
                            object.userData.fileData.x = targetPosition.x;
                            object.userData.fileData.y = targetPosition.y;
                            object.userData.fileData.z = targetPosition.z;
                        }
                        
                        // Apply world constraints if needed
                        if (this.app.sortingManager.worldTemplate) {
                            const constrainedPosition = this.app.sortingManager.worldTemplate.applyPositionConstraints(
                                object,
                                object.position,
                                this.app.stateManager.fileObjects
                            );
                            object.position.set(constrainedPosition.x, constrainedPosition.y, constrainedPosition.z);
                            
                            // Update target position to constrained position
                            targetPosition.x = constrainedPosition.x;
                            targetPosition.y = constrainedPosition.y;
                            targetPosition.z = constrainedPosition.z;
                        }
                        
                        // Persist the contact's new position to file system
                        if (this.app.contactManager) {
                            const contactId = object.userData.contactId || object.userData.id || object.userData.fileName?.replace('.contact', '');
                            if (contactId) {
                                this.app.contactManager.handleContactAutoSort(contactId, targetPosition, category);
                            }
                        }
                        
                        // Update SMS screen position
                        if (this.app.sortingManager.updateContactSMSScreenPosition) {
                            this.app.sortingManager.updateContactSMSScreenPosition(object);
                        }
                        
                        console.log(`📱 Contact auto-sorted and position persisted: ${object.userData.fileName}`);
                    } else {
                        // Regular objects - use normal auto-sorting
                        // Animate the object to its zone position
                        if (this.app.sortingManager.config.animateTransitions) {
                            this.app.sortingManager.animateObjectToPosition(object, targetPosition);
                        } else {
                            this.app.sortingManager.moveObjectToPosition(object, targetPosition);
                        }
                    }
                    
                    console.log(`Auto-sorted ${object.userData.fileName} to ${category} zone at (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z})`);
                } else {
                    console.warn(`No zone found for category: ${category}`);
                }
            } else if (!wasInHomeArea && !isNowInHomeArea) {
                console.log(`${object.userData.fileName} was moved outside Home Area but didn't come from Home Area - no auto-sort needed`);
            } else if (wasInHomeArea && isNowInHomeArea) {
                console.log(`${object.userData.fileName} was moved within Home Area - no auto-sort needed`);
            } else {
                console.log(`${object.userData.fileName} was moved from outside to inside Home Area - no auto-sort needed`);
            }
        }
        
        /**
         * Detect if object is near furniture or vertical path structures
         * Returns structure info if found, null otherwise
         */
        detectNearbyVerticalStructures(object, maxDistance = 5.0) {
            if (!object || !object.position) return null;
            
            const objectPos = object.position;
            
            // Check for nearby furniture with elevated markers (bookshelves, gallery walls)
            const nearbyFurniture = this.findNearbyFurniture(objectPos, maxDistance);
            if (nearbyFurniture && nearbyFurniture.furniture) {
                // Check if furniture has elevated positions (Y > 1.0)
                const hasElevatedSlots = nearbyFurniture.furniture.positions.some(pos => pos.y > 1.0);
                if (hasElevatedSlots) {
                    console.log(`🔧 [Y-AXIS] Detected nearby vertical furniture: ${nearbyFurniture.furniture.type}`);
                    return {
                        type: 'furniture',
                        id: nearbyFurniture.id,
                        distance: nearbyFurniture.distance,
                        furnitureType: nearbyFurniture.furniture.type
                    };
                }
            }
            
            // Check for nearby elevated path markers (spiral staircases, etc.)
            const nearbyElevatedPath = this.findNearbyElevatedPathMarkers(objectPos, maxDistance);
            if (nearbyElevatedPath) {
                return {
                    type: 'path',
                    id: nearbyElevatedPath.id,
                    distance: nearbyElevatedPath.distance
                };
            }
            
            return null;
        }
        
        /**
         * Find nearby furniture within maxDistance
         */
        findNearbyFurniture(position, maxDistance) {
            if (!this.app.furnitureManager) return null;
            
            const allFurniture = this.app.furnitureManager.getAllFurniture();
            let nearest = null;
            let nearestDistance = maxDistance;
            
            allFurniture.forEach(furniture => {
                // Calculate 2D distance (X/Z only) to furniture center
                const dx = position.x - furniture.position.x;
                const dz = position.z - furniture.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearest = {
                        id: furniture.id,
                        distance: distance,
                        furniture: furniture
                    };
                }
            });
            
            return nearest;
        }
        
        /**
         * Find nearby elevated path markers (Y > 1.0)
         */
        findNearbyElevatedPathMarkers(position, maxDistance) {
            if (!this.app.pathManager) return null;
            
            const allPaths = this.app.pathManager.getPathsForCurrentWorld();
            let nearest = null;
            let nearestDistance = maxDistance;
            
            allPaths.forEach(path => {
                // Check if path has elevated positions (e.g., spiral staircase)
                const hasElevation = path.positions.some(pos => pos.y > 1.0);
                
                if (hasElevation) {
                    // Check distance to any marker in the path
                    path.positions.forEach(pos => {
                        const dx = position.x - pos.x;
                        const dz = position.z - pos.z;
                        const distance = Math.sqrt(dx * dx + dz * dz);
                        
                        if (distance < nearestDistance) {
                            nearestDistance = distance;
                            nearest = {
                                id: path.id,
                                distance: distance,
                                path: path
                            };
                        }
                    });
                }
            });
            
            return nearest;
        }
    }

    // Make globally accessible
    window.MoveManager = MoveManager;
    
    // Export individual move functions globally for direct access
    // These will be bound to the actual instance in the initialization module
    window.hasRecentMovesJS = function() {
        if (window.app && window.app.moveManager) {
            return window.app.moveManager.hasRecentMoves();
        }
        return false;
    };
    
    window.getRecentMoveInfoJS = function() {
        if (window.app && window.app.moveManager) {
            return window.app.moveManager.getRecentMoveInfo();
        }
        return null;
    };
    
    window.undoRecentMoveJS = function() {
        if (window.app && window.app.moveManager) {
            return window.app.moveManager.undoRecentMove();
        }
        return Promise.resolve(false);
    };
    
    console.log("MoveManager module loaded successfully with global function exports");
})();
