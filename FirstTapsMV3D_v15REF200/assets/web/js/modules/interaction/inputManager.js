// modules/interaction/inputManager.js
// Dependencies: THREE (global), window.SharedStateManager
// Exports: window.InputManager

(function() {
    'use strict';
    
    console.log("Loading InputManager module...");
    
    // ============================================================================
    // INPUT MANAGEMENT - Touch, Mouse, and Pointer Events
    // ============================================================================
    class InputManager {
        constructor(THREE, scene, camera, renderer, stateManager) {
            this.THREE = THREE;
            this.scene = scene;
            this.camera = camera;
            this.renderer = renderer;
            this.stateManager = stateManager;
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
            
            // References to other managers (set later via setManagerReferences)
            this.moveManager = null;
            this.interactionManager = null;
            this.focusZoneManager = null;
            
            // Event handling thresholds
            this.moveThreshold = 0.05; // Increased for better touch tolerance (5% of screen)
            this.longPressDuration = 500;
            this.doubleTapThreshold = 300;
            this.initialPointerPosition = new THREE.Vector2();
            
            this.setupEventListeners();
        }

        // Set references to other managers after they're all created
        setManagerReferences(moveManager, interactionManager) {
            this.moveManager = moveManager;
            this.interactionManager = interactionManager;
            console.log('InputManager: Manager references set', { 
                moveManager: !!this.moveManager, 
                interactionManager: !!this.interactionManager 
            });
        }

        // Set focus zone manager reference
        setFocusZoneManager(focusZoneManager) {
            this.focusZoneManager = focusZoneManager;
            console.log('InputManager: FocusZoneManager reference set', { 
                focusZoneManager: !!this.focusZoneManager 
            });
        }

        // Set focus zone manager reference
        setFocusZoneManager(focusZoneManager) {
            this.focusZoneManager = focusZoneManager;
            console.log('InputManager: FocusZoneManager reference set', { 
                focusZoneManager: !!this.focusZoneManager 
            });
        }

        setupEventListeners() {
            console.log('🔥🔥🔥 InputManager.setupEventListeners() CALLED');
            const canvas = this.renderer.domElement;
            
            // Detect if this is a touch device
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            if (isTouchDevice) {
                console.log('Setting up touch device event listeners');
                // For touch devices, use touch events primarily
                canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
                canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
                canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
                
                // Still listen to pointer events as backup but with lower priority
                canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
                canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
                canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
            } else {
                console.log('Setting up desktop device event listeners');
                // For desktop devices, use pointer events primarily
                canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
                canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
                canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
                
                // Desktop double-click event
                canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
            }
            
            // Always prevent context menu
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        updateMouse(event) {
            let clientX, clientY;
            
            if (event.touches && event.touches.length > 0) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else if (event.changedTouches && event.changedTouches.length > 0) {
                clientX = event.changedTouches[0].clientX;
                clientY = event.changedTouches[0].clientY;
            } else {
                clientX = event.clientX;
                clientY = event.clientY;
            }
            
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        }

        getIntersectedObjects(mouse = this.mouse) {
            this.raycaster.setFromCamera(mouse, this.camera);
            
            // Combine file objects and any visible SMS screens for raycasting
            let allInteractables = [...this.stateManager.fileObjects];
            
            // Add contact-specific debug logging
            const contactObjects = allInteractables.filter(obj => 
                obj.userData && obj.userData.subType === 'contact'
            );
            if (contactObjects.length > 0) {
                console.log(`🎯 Raycasting against ${contactObjects.length} contact objects`);
            }
            
            // Add ALL visible SMS screens to raycasting, not just active contact
            if (window.app && window.app.contactManager) {
                const contacts = window.app.contactManager.getAllContacts();
                // console.log(`🔍 DEBUG: getAllContacts returned ${contacts.length} contacts`); // Reduced logging
                contacts.forEach((contact, index) => {
                    // console.log(`🔍 DEBUG: Contact ${index}: name=${contact.name || contact.contactData?.name}, hasContactInfoScreen=${!!contact.contactInfoScreen}, isVisible=${contact.contactInfoScreen?.isVisible}`);
                    
                    if (contact.smsScreen && contact.smsScreen.isVisible) {
                        // Add the interaction overlay first (higher priority)
                        if (contact.smsScreen.interactionOverlay) {
                            const overlayMesh = contact.smsScreen.interactionOverlay;
                            
                            // Ensure interaction overlay has comprehensive userData
                            if (!overlayMesh.userData) {
                                overlayMesh.userData = {};
                            }
                            overlayMesh.userData.isSmsScreen = true;
                            overlayMesh.userData.isInteractionOverlay = true;
                            overlayMesh.userData.type = 'smsScreen';
                            
                            // Enhanced contact identification - try multiple approaches
                            let contactId = contact.contactId || contact.id || contact.fileId || contact.fileName || contact.name;
                            
                            // If still undefined, extract from contact data
                            if (!contactId && contact.contactData) {
                                contactId = contact.contactData.id || contact.contactData.name || contact.contactData.fileName;
                            }
                            
                            // If still undefined, try mesh userData as backup
                            if (!contactId && contact.mesh && contact.mesh.userData) {
                                contactId = contact.mesh.userData.contactId || contact.mesh.userData.id || contact.mesh.userData.fileId || contact.mesh.userData.fileName;
                            }
                            
                            overlayMesh.userData.contactId = contactId;
                            overlayMesh.userData.contactName = contact.name || contact.contactData?.name || contactId;
                            overlayMesh.userData.fileName = contact.fileName || contact.contactData?.name || contactId;
                            overlayMesh.userData.parentContact = contact;
                            overlayMesh.userData.smsScreen = contact.smsScreen;
                            
                            allInteractables.push(overlayMesh);
                            console.log(`💬 Added SMS screen interaction overlay to raycasting: ${contactId}`);
                        }
                        
                        // Also add the main SMS screen mesh as backup
                        const smsMesh = contact.smsScreen.getMesh();
                        if (smsMesh) {
                            // Debug contact properties with more detail
                            console.log('📞 Contact properties:', {
                                id: contact.id,
                                contactId: contact.contactId,
                                fileName: contact.fileName,
                                name: contact.name,
                                fileId: contact.fileId
                            });
                            
                            // Debug the entire contact object structure
                            console.log('📞 Full contact object:', contact);
                            
                            // Ensure SMS screen has proper userData for raycasting
                            if (!smsMesh.userData) {
                                smsMesh.userData = {};
                            }
                            smsMesh.userData.isSmsScreen = true;
                            
                            // Try multiple approaches to get contactId
                            let contactId = contact.contactId || contact.id || contact.fileId || contact.fileName;
                            
                            // If still undefined, try mesh userData as backup
                            if (!contactId && contact.mesh && contact.mesh.userData) {
                                contactId = contact.mesh.userData.contactId || contact.mesh.userData.id || contact.mesh.userData.fileId || contact.mesh.userData.fileName;
                            }
                            
                            smsMesh.userData.contactId = contactId;
                            smsMesh.userData.type = 'smsScreen';
                            allInteractables.push(smsMesh);
                            console.log(`💬 Added SMS screen mesh to raycasting: ${contactId}`);
                        }
                    }
                    
                    // CONTACT INFO SCREEN RAYCASTING: Add visible contact info screens to raycaster targets
                    // This is SEPARATE from SMS screen - moved outside smsScreen block
                    if (contact.contactInfoScreen && contact.contactInfoScreen.isVisible) {
                        console.log('📱 Adding visible contact info screen to raycaster for contact:', contact.id || contact.contactId);
                        
                        // Add interaction overlay mesh (for tap detection)
                        if (contact.contactInfoScreen.interactionOverlay) {
                            contact.contactInfoScreen.interactionOverlay.userData.isContactInfoScreen = true;
                            contact.contactInfoScreen.interactionOverlay.userData.contactId = contact.id || contact.contactId;
                            allInteractables.push(contact.contactInfoScreen.interactionOverlay);
                            console.log('📱 Added contact info screen overlay to raycasting');
                        }
                        
                        // Add main screen mesh (for visual feedback)
                        if (contact.contactInfoScreen.mesh) {
                            contact.contactInfoScreen.mesh.userData.isContactInfoScreen = true;
                            contact.contactInfoScreen.mesh.userData.contactId = contact.id || contact.contactId;
                            allInteractables.push(contact.contactInfoScreen.mesh);
                            console.log('📱 Added contact info screen mesh to raycasting');
                        }
                    }
                });
            }

            // Add explore mode avatar collision spheres to raycasting
            if (this.isExploreMode() && window.ExploreAvatarCollisionManager && window.ExploreAvatarCollisionManager.instance) {
                const collisionSphere = window.ExploreAvatarCollisionManager.instance.collisionSphere;
                if (collisionSphere) {
                    allInteractables.push(collisionSphere);
                    console.log('🎯 Added explore avatar collision sphere to raycasting');
                }
            }

            // Add path groups for interaction
            if (window.app?.pathManager) {
                const pathGroups = window.app.pathManager.getAllPathGroups();
                if (pathGroups.length > 0) {
                    allInteractables.push(...pathGroups);
                    console.log(`🛤️ Added ${pathGroups.length} path groups to raycasting`);
                }
            }

            // Add furniture groups for interaction (structure, slots, and rotation handles)
            if (window.app?.furnitureManager) {
                const furnitureIds = window.app.furnitureManager.visualManager.getAllFurnitureIds();
                furnitureIds.forEach(furnitureId => {
                    const furnitureGroup = window.app.furnitureManager.visualManager.getFurnitureGroup(furnitureId);
                    if (furnitureGroup) {
                        allInteractables.push(furnitureGroup);
                    }
                });
                // Reduced logging - only log if furniture exists
                // if (furnitureIds.length > 0) {
                //     console.log(`🪑 Added ${furnitureIds.length} furniture groups to raycasting`);
                // }
            }

            const intersects = this.raycaster.intersectObjects(allInteractables, true);
            
            // DIAGNOSTIC: Log what the raycaster actually found
            if (intersects.length > 0) {
                const furnitureIntersects = intersects.filter(i => i.object.userData && (i.object.userData.isFurniture || i.object.userData.isFurnitureTapArea || i.object.userData.isFurnitureStructure));
                const objectIntersects = intersects.filter(i => i.object.userData && (i.object.userData.type === 'app' || i.object.userData.type === 'fileObject'));
                if (furnitureIntersects.length > 0 || objectIntersects.length > 0) {
                    console.log(`📊 RAYCASTER RAW RESULTS: ${intersects.length} total, ${furnitureIntersects.length} furniture pieces, ${objectIntersects.length} objects`);
                    if (objectIntersects.length > 0) {
                        objectIntersects.slice(0, 3).forEach(i => {
                            console.log(`  🎯 Object detected: ${i.object.userData.fileName || i.object.userData.type} at distance ${i.distance.toFixed(2)}`);
                        });
                    }
                }
            }
            
            // Filter out invalid intersection objects and log issues
            let validIntersects = intersects.filter(intersection => {
                const obj = intersection.object;
                
                // Skip Three.js internal objects (like lines, helpers, etc.)
                if (obj.isLine || obj.isHelper || obj.isSprite || obj.isLOD) {
                    return false;
                }
                
                // Skip objects that are part of SMS screen geometry but don't need userData
                if (obj.parent && obj.parent.userData && obj.parent.userData.isSmsScreen) {
                    return false;
                }
                
                // Check if object has valid userData structure
                if (!obj.userData || !obj.userData.type) {
                    // Only warn for top-level objects without userData (not child meshes)
                    // Child meshes (faces, edges) inherit interaction from parent
                    const hasValidParent = obj.parent && obj.parent.userData && obj.parent.userData.type;
                    if (!hasValidParent && (obj.isMesh || obj.isGroup)) {
                        console.warn('⚠️ Raycaster hit object without proper userData:', {
                            objectType: obj.constructor.name,
                            hasUserData: !!obj.userData,
                            userDataType: obj.userData?.type,
                            uuid: obj.uuid,
                            parentType: obj.parent?.userData?.type
                        });
                    }
                    return false;
                }
                
                // Log contact object detection
                if (obj.userData.subType === 'contact') {
                    console.log('🎯 Contact raycaster hit:', obj.userData.fileName, 'type:', obj.userData.type);
                }
                
                // Log poster object detection
                if (obj.userData.isPoster) {
                    console.log('🖼️ Poster raycaster hit:', obj.userData.type, 'userData:', obj.userData);
                }
                
                // Log SMS screen detection
                if (obj.userData.isSmsScreen) {
                    console.log('💬 SMS screen raycaster hit:', obj.userData.contactId, 'type:', obj.userData.type);
                }
                
                // Log contact info screen detection
                if (obj.userData.isContactInfoScreen) {
                    console.log('👤 Contact info screen raycaster hit');
                }
                
                // Log avatar collision sphere detection
                if (obj.userData.isAvatarCollisionSphere) {
                    console.log('🚶 Avatar collision sphere hit:', obj.userData.type, 'interaction:', obj.userData.interactionType);
                }
                
                // Log furniture tap area detection
                if (obj.userData.isFurnitureTapArea) {
                    console.log('🪑 Furniture tap area hit:', obj.userData.furnitureType, 'id:', obj.userData.furnitureId);
                }
                
                return true;
            });
            
            // CRITICAL: Prioritize UI screens (contact info, SMS, media preview) over their parent objects
            // Sort so that screens appear first in the array
            validIntersects.sort((a, b) => {
                const aIsScreen = a.object.userData.isContactInfoScreen || a.object.userData.isSmsScreen || a.object.userData.isMediaPreviewScreen;
                const bIsScreen = b.object.userData.isContactInfoScreen || b.object.userData.isSmsScreen || b.object.userData.isMediaPreviewScreen;
                
                // Screens come first (return -1 to put 'a' before 'b')
                if (aIsScreen && !bIsScreen) return -1;
                if (!aIsScreen && bIsScreen) return 1;
                
                // Otherwise maintain distance order (closer first)
                return 0;
            });
            
            // FURNITURE PRIORITY: When camera is far away, prioritize furniture over objects ON furniture
            // This makes it easier to tap furniture from a distance for the focus interaction
            const cameraPos = this.camera.position;
            
            // Helper function to check if an object or its parents are furniture
            const checkIsFurniture = (obj) => {
                // Check object directly
                if (obj.userData && (
                    obj.userData.isFurniture || 
                    obj.userData.isFurnitureStructure || 
                    obj.userData.isFurnitureTapArea ||
                    obj.userData.isFurnitureSlot ||
                    obj.userData.type === 'furniture'
                )) {
                    return true;
                }
                // Check parent
                if (obj.parent && obj.parent.userData && (
                    obj.parent.userData.isFurniture ||
                    obj.parent.userData.isFurnitureStructure ||
                    obj.parent.userData.type === 'furniture'
                )) {
                    return true;
                }
                // Check grandparent
                if (obj.parent && obj.parent.parent && obj.parent.parent.userData && (
                    obj.parent.parent.userData.isFurniture ||
                    obj.parent.parent.userData.isFurnitureStructure ||
                    obj.parent.parent.userData.type === 'furniture'
                )) {
                    return true;
                }
                return false;
            };
            
            // Check if there are any furniture objects in the intersects
            const hasFurniture = validIntersects.some(intersect => checkIsFurniture(intersect.object));
            
            if (hasFurniture) {
                // Find the closest furniture piece  
                let closestFurnitureDist = Infinity;
                validIntersects.forEach(intersect => {
                    if (checkIsFurniture(intersect.object)) {
                        closestFurnitureDist = Math.min(closestFurnitureDist, intersect.distance);
                    }
                });
                
                // If camera is far from furniture (>35 units), prioritize furniture over regular objects
                // Set to 35 units to match file zone pattern - allows object tapping when close, furniture priority when far
                if (closestFurnitureDist > 35) {
                    // AGGRESSIVE SORT: Put ALL furniture first, regardless of distance
                    // This makes furniture always appear first in results when camera is far away
                    validIntersects.sort((a, b) => {
                        const aIsFurniture = checkIsFurniture(a.object);
                        const bIsFurniture = checkIsFurniture(b.object);
                        const aIsOnFurniture = a.object.userData && (a.object.userData.furnitureId || a.object.userData.furnitureSlotId);
                        const bIsOnFurniture = b.object.userData && (b.object.userData.furnitureId || b.object.userData.furnitureSlotId);
                        
                        // Priority 1: Furniture pieces come first
                        if (aIsFurniture && !bIsFurniture) return -1;
                        if (!aIsFurniture && bIsFurniture) return 1;
                        
                        // Priority 2: Objects NOT on furniture come before objects ON furniture
                        if (!aIsFurniture && !bIsFurniture) {
                            if (!aIsOnFurniture && bIsOnFurniture) return -1;
                            if (aIsOnFurniture && !bIsOnFurniture) return 1;
                        }
                        
                        // Same priority: maintain distance order (closer first)
                        return a.distance - b.distance;
                    });
                    
                    const furnitureCount = validIntersects.filter(i => checkIsFurniture(i.object)).length;
                    const firstIsFurniture = validIntersects.length > 0 && checkIsFurniture(validIntersects[0].object);
                    console.log(`🪑 FURNITURE PRIORITY ACTIVE: Distance ${closestFurnitureDist.toFixed(1)} units, ${furnitureCount} furniture, ${validIntersects.length} total, first=${firstIsFurniture ? 'FURNITURE ✓' : 'object ✗'}`);
                } else {
                    // FURNITURE OBJECT TAP FIX: When camera is CLOSE to furniture, prioritize objects ON furniture over the furniture tap area
                    // This allows objects to be tapped when up close, while keeping furniture tappable from a distance
                    console.log(`🪑 Camera is CLOSE to furniture (${closestFurnitureDist.toFixed(1)} units) - checking for object priority`);
                    
                    // Check if there are both furniture tap areas AND actual objects in the intersects
                    const hasTapArea = validIntersects.some(i => i.object.userData.isFurnitureTapArea);
                    const hasActualObjects = validIntersects.some(i => {
                        const obj = i.object;
                        // Check if it's a real object (not furniture parts)
                        return obj.userData && 
                               !obj.userData.isFurniture && 
                               !obj.userData.isFurnitureStructure && 
                               !obj.userData.isFurnitureTapArea &&
                               !obj.userData.isFurnitureSlot &&
                               (obj.userData.type === 'fileObject' || obj.userData.type === 'app');
                    });
                    
                    if (hasTapArea && hasActualObjects) {
                        console.log('🪑 CLOSE-RANGE FIX: Filtering out furniture tap area to prioritize objects');
                        // Filter out the tap area so objects can be tapped
                        validIntersects = validIntersects.filter(i => !i.object.userData.isFurnitureTapArea);
                        console.log(`🪑 After filtering: ${validIntersects.length} intersects remaining`);
                    }
                }
            }
            
            return validIntersects;
        }

        // Check if explore mode is currently active
        isExploreMode() {
            // Check multiple sources for explore mode state
            if (this.app.exploreManager && this.app.exploreManager.exploreMode) {
                return this.app.exploreManager.exploreMode.isActive;
            }
            if (window.exploreManager && window.exploreManager.exploreMode) {
                return window.exploreManager.exploreMode.isActive;
            }
            if (this.app.exploreMode) {
                return this.app.exploreMode.isActive;
            }
            return false;
        }

        // Check if explore controls are active and handling events
        isExploreControlsHandlingEvents() {
            // Check multiple sources for explore controls state
            if (this.app.exploreManager && this.app.exploreManager.exploreMode && this.app.exploreManager.exploreMode.exploreControls) {
                return this.app.exploreManager.exploreMode.exploreControls.isActive;
            }
            if (window.exploreManager && window.exploreManager.exploreMode && window.exploreManager.exploreMode.exploreControls) {
                return window.exploreManager.exploreMode.exploreControls.isActive;
            }
            return false;
        }

        // Get intersected focus zones (for navigation assistance)
        getIntersectedFocusZones(mouse = this.mouse) {
            if (!this.focusZoneManager) return [];
            
            this.raycaster.setFromCamera(mouse, this.camera);
            const zoneObjects = this.focusZoneManager.getZoneObjects();
            return this.raycaster.intersectObjects(zoneObjects, false);
        }

        getFocusZoneIntersections(mouse = this.mouse) {
            if (!this.focusZoneManager) return [];
            
            this.raycaster.setFromCamera(mouse, this.camera);
            const zoneObjects = this.focusZoneManager.getZoneObjects();
            return this.raycaster.intersectObjects(zoneObjects, false);
        }

        onPointerDown(event) {
            // Skip pointer events if this is a touch event (to prevent duplicates)
            if (event.pointerType === 'touch') {
                return;
            }
            
            event.preventDefault(); // Prevent browser default behaviors
            
            // Skip if we're in a transition
            if (this.stateManager.isTransitioning) return;
            
            // Record touch start time and position for mobile
            this.stateManager.touchStartTime = Date.now();
            this.stateManager.touchStartPosition = { x: event.clientX, y: event.clientY };
            
            this.updateMouse(event);
            this.initialPointerPosition.copy(this.mouse);
            this.stateManager.pointerDownStart = Date.now();
            this.stateManager.isLongPress = false;

            const intersects = this.getIntersectedObjects();
            if (intersects.length > 0) {
                const object = intersects[0].object;
                
                // DOUBLE-TAP FIX: Clear any pending long-press if this could be a double-tap
                // Check if this tap is within the double-tap window and on the same object
                const now = Date.now();
                const timeSinceLastTap = now - this.stateManager.lastTapTime;
                if (timeSinceLastTap < this.doubleTapThreshold && 
                    this.stateManager.lastTapTarget === object &&
                    this.stateManager.longPressTimeout) {
                    console.log('🔄 Potential double-tap detected - clearing long-press timer');
                    clearTimeout(this.stateManager.longPressTimeout);
                    this.stateManager.longPressTimeout = null;
                }
                
                // CRITICAL: Validate object before interaction - now includes SMS screens, posters, paths, and furniture
                if (object && object.userData && (object.userData.type === 'fileObject' || object.userData.type === 'app' || object.userData.type === 'smsScreen' || object.userData.type === 'poster' || object.userData.type === 'path' || object.userData.isFurniture)) {
                    console.log('📍 Valid object detected for interaction:', object.userData.fileName || object.userData.appName || object.userData.contactId || object.userData.furnitureName || `Path step ${object.userData.stepIndex + 1}`);
                    
                    // Special logging for contact objects
                    if (object.userData.isContact) {
                        console.log('📱 Contact object ready for interaction:', object.userData.fileName);
                    }
                    
                    // Special logging for furniture objects
                    if (object.userData.isFurniture) {
                        console.log('🪑 Furniture object ready for interaction:', object.userData.furnitureName || object.name);
                    }
                    
                    // Special logging for app objects
                    if (object.userData.type === 'app') {
                        console.log('📱 App object ready for interaction:', object.userData.appName);
                    }
                    
                    // Special logging for SMS screens
                    if (object.userData.type === 'smsScreen') {
                        console.log('💬 SMS screen ready for interaction:', object.userData.contactId);
                    }
                    
                    // Special logging for poster objects
                    if (object.userData.type === 'poster') {
                        console.log('🖼️ Poster ready for interaction:', object.userData.posterType);
                    }
                    
                    // Emit interaction event for other managers to handle
                    this.onObjectInteractionStart(object, event);
                } else {
                    console.warn('⚠️ Invalid object detected in raycasting:', object);
                }
            }
        }

        onPointerMove(event) {
            // Skip pointer events if this is a touch event (to prevent duplicates)
            if (event.pointerType === 'touch') {
                return;
            }
            
            // Check for movement threshold to cancel long press
            if (this.stateManager.longPressTimeout) {
                this.updateMouse(event);
                if (this.initialPointerPosition.distanceTo(this.mouse) > this.moveThreshold) {
                    clearTimeout(this.stateManager.longPressTimeout);
                    this.stateManager.longPressTimeout = null;
                }
            }
            
            if (this.stateManager.movingObject && this.stateManager.isDragging) {
                event.preventDefault(); // Prevent scrolling while dragging
                this.updateMouse(event);
                this.onObjectMove(event);
            }
        }

        onPointerUp(event) {
            // Reduced logging to reduce console spam
            // console.log('�🔥🔥 NEW InputManager.onPointerUp() CALLED');
            // console.log('�🔍 onPointerUp CALLED - pointerType:', event.pointerType, 'movingObject:', !!this.stateManager.movingObject, 'isDragging:', this.stateManager.isDragging);
            
            // Skip pointer events if this is a touch event (to prevent duplicates)
            if (event.pointerType === 'touch') {
                // console.log('⚠️ onPointerUp: Skipping touch event (pointerType === touch)'); // Reduced logging
                return;
            }
            
            // Reduced logging for pointer events
            // console.log('🔍 onPointerUp called');
            // console.log('🔍 State check: longPressTimeout=', !!this.stateManager.longPressTimeout, 'isLongPress=', this.stateManager.isLongPress);
            // console.log('🔍 Movement state: movingObject=', !!this.stateManager.movingObject, 'isDragging=', this.stateManager.isDragging);
            // console.log('onPointerUp called, longPressTimeout:', !!this.stateManager.longPressTimeout, 'isLongPress:', this.stateManager.isLongPress);
            
            // Clear long press timeout
            if (this.stateManager.longPressTimeout) {
                console.log('Clearing long press timeout');
                clearTimeout(this.stateManager.longPressTimeout);
                this.stateManager.longPressTimeout = null;
            }

            // If we had a long press, clean up and return (don't process other events)
            if (this.stateManager.isLongPress) {
                console.log('Long press cleanup - returning early');
                this.stateManager.isLongPress = false;
                this.onLongPressEnd();
                return;
            }

            // If we were moving an object, stop the movement
            // console.log('🔍 Checking if should call onObjectMoveEnd: movingObject=', !!this.stateManager.movingObject, 'isDragging=', this.stateManager.isDragging); // Reduced logging
            if (this.stateManager.movingObject) {
                console.log('✅ Calling onObjectMoveEnd');
                console.log('Stopping object movement');
                
                // CRITICAL FIX: Clear tap state to prevent single-tap from firing after move
                this.stateManager.lastTapTime = 0;
                this.stateManager.lastTapTarget = null;
                
                this.onObjectMoveEnd();
                return;
            }
            // Removed excessive "NOT calling" log
            // else {
            //     console.log('❌ NOT calling onObjectMoveEnd - condition not met');
            // }
            
            // Reset dragging state
            this.stateManager.isDragging = false;
        }

        // Touch event handlers for mobile devices
        onTouchStart(event) {
            if (event.touches.length === 1) {
                event.preventDefault();
                const touch = event.touches[0];
                this.onPointerDown({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => event.preventDefault()
                });
            }
        }

        onTouchMove(event) {
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                
                // Calculate movement distance since touch start
                const moveDistance = Math.sqrt(
                    Math.pow(touch.clientX - this.stateManager.touchStartPosition.x, 2) +
                    Math.pow(touch.clientY - this.stateManager.touchStartPosition.y, 2)
                );
                
                // Only prevent default and handle move if we're dragging an object or movement exceeds threshold
                if (this.stateManager.isDragging || moveDistance > this.stateManager.touchMoveThreshold) {
                    event.preventDefault();
                    this.onPointerMove({
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        preventDefault: () => event.preventDefault()
                    });
                }
            }
        }

        onTouchEnd(event) {
            event.preventDefault();
            
            // console.log('🔍 onTouchEnd() CALLED - movingObject:', !!this.stateManager.movingObject, 'isDragging:', this.stateManager.isDragging); // Reduced logging
            
            // CRITICAL: Skip input handling if explore mode is active and has already handled the event
            if (this.isExploreMode() && this.isExploreControlsHandlingEvents()) {
                console.log('💡 Skipping InputManager processing - ExploreControls is handling events');
                return;
            }
            
            // Calculate press duration for touch events
            const upTime = Date.now();
            const pressDuration = upTime - this.stateManager.pointerDownStart;
            
            // console.log('Touch end - press duration:', pressDuration); // Reduced logging
            
            // Handle touch-specific double-tap detection
            this.updateMouse(event.changedTouches ? event.changedTouches[0] : event);
            const intersects = this.getIntersectedObjects();
            
            if (intersects.length > 0 && pressDuration < this.longPressDuration) {
                const object = intersects[0].object;
                
                // CRITICAL: Validate object before processing touch events - now includes SMS screens
                if (!object || !object.userData || (!object.userData.type && !object.userData.isSmsScreen)) {
                    console.warn('⚠️ Invalid object in touch detection, skipping...');
                    return;
                }
                
                const now = Date.now();
                
                // Check for double-tap (touch-specific)
                if (now - this.stateManager.lastTapTime < this.doubleTapThreshold && 
                    this.stateManager.lastTapTarget === object) {
                    console.log('Touch double-tap detected for:', object.userData.fileName || object.userData.contactId || object.userData.appName || 'unknown');
                    
                    // PRIORITY 0: Handle path playback toggle
                    if (object.userData.isPath && window.app?.pathManager) {
                        console.log('🛤️ Path double-tap detected:', object.userData.pathId);
                        window.app.pathManager.togglePathPlayback(object.userData.pathId);
                        
                        // Clear any pending long press
                        if (this.stateManager.longPressTimeout) {
                            clearTimeout(this.stateManager.longPressTimeout);
                            this.stateManager.longPressTimeout = null;
                        }
                        
                        this.stateManager.lastTapTime = 0;
                        this.stateManager.lastTapTarget = null;
                        return;
                    }
                    
                    // PRIORITY 1: Special handling for SMS screens - delegate to contact interaction
                    if (object.userData.isSmsScreen) {
                        console.log('� SMS screen double-tap detected:', object.userData.contactId);
                        this.onSmsScreenDoubleClick(object);
                        
                        // Clear any pending long press
                        if (this.stateManager.longPressTimeout) {
                            clearTimeout(this.stateManager.longPressTimeout);
                            this.stateManager.longPressTimeout = null;
                        }
                        
                        this.stateManager.lastTapTime = 0;
                        this.stateManager.lastTapTarget = null;
                        return; // Prevent other handlers from running
                    }
                    
                    // PRIORITY 2: Special logging for contact objects (only if not SMS screen)
                    if (object.userData.isContact) {
                        console.log('� Contact double-tap detected:', object.userData.fileName);
                    }
                    
                    // Handle regular object double-tap (contact objects, files, etc.)
                    this.onObjectDoubleClick(object);
                    
                    // Clear any pending long press
                    if (this.stateManager.longPressTimeout) {
                        clearTimeout(this.stateManager.longPressTimeout);
                        this.stateManager.longPressTimeout = null;
                    }
                    
                    this.stateManager.lastTapTime = 0;
                    this.stateManager.lastTapTarget = null;
                    return;
                }
                
                // Set up for potential double-tap, but also handle single tap after delay
                this.stateManager.lastTapTime = now;
                this.stateManager.lastTapTarget = object;
                
                // CRITICAL FIX: Handle single tap with delay to allow for double-tap detection
                setTimeout(() => {
                    // Only trigger single tap if we haven't had a double-tap
                    if (this.stateManager.lastTapTarget === object && 
                        now === this.stateManager.lastTapTime) {
                        console.log('Touch single-tap detected for:', object.userData.fileName || object.userData.contactId || object.userData.appName || 'unknown');
                        
                        // PRIORITY: Handle single-tap on path MARKER to start playback from that step
                        if (object.userData.isPathMarker && window.app?.pathManager) {
                            const pathId = object.userData.pathId;
                            const stepIndex = object.userData.stepIndex;
                            console.log(`🛤️ Path marker single-tap: step ${stepIndex}`);
                            window.app.pathManager.startFromStep(pathId, stepIndex);
                            this.stateManager.lastTapTime = 0;
                            this.stateManager.lastTapTarget = null;
                            return;
                        }
                        
                        // Check if the tapped object is a contact info screen
                        if (object.userData.isContactInfoScreen) {
                            this.onContactInfoScreenTap(object, intersects[0]);
                        } else if (object.userData.isSmsScreen) {
                            this.onSmsScreenTap(object, event);
                        } else {
                            this.onObjectClick(object, event);
                        }

                        this.stateManager.lastTapTime = 0;
                        this.stateManager.lastTapTarget = null;
                    }
                }, this.doubleTapThreshold);
                
            } else if (pressDuration < this.longPressDuration) {
                // Check for focus zone double-tap when no object is tapped
                const zoneIntersects = this.getIntersectedFocusZones();
                if (zoneIntersects.length > 0) {
                    const zoneObject = zoneIntersects[0].object;
                    const now = Date.now();
                    
                    // Check for double-tap on zone
                    if (now - this.stateManager.lastTapTime < this.doubleTapThreshold && 
                        this.stateManager.lastTapTarget === zoneObject) {
                        console.log('Touch double-tap detected on focus zone');
                        
                        // Clear any pending long press
                        if (this.stateManager.longPressTimeout) {
                            clearTimeout(this.stateManager.longPressTimeout);
                            this.stateManager.longPressTimeout = null;
                        }
                        
                        this.onFocusZoneClick(zoneObject);
                        this.stateManager.lastTapTime = 0;
                        this.stateManager.lastTapTarget = null;
                        return;
                    }
                    
                    // Set up for potential double-tap on zone
                    this.stateManager.lastTapTime = now;
                    this.stateManager.lastTapTarget = zoneObject;
                }
            }
            
            console.log('🔍 onTouchEnd: About to call onPointerUp - movingObject:', !!this.stateManager.movingObject);
            
            // Call the regular pointer up handler
            this.onPointerUp({
                preventDefault: () => event.preventDefault()
            });
        }

        onDoubleClick(event) {
            console.log('onDoubleClick event triggered');
            
            // Clear any pending long press since we have a double-click
            if (this.stateManager.longPressTimeout) {
                clearTimeout(this.stateManager.longPressTimeout);
                this.stateManager.longPressTimeout = null;
                console.log('Cleared long press timeout due to double-click');
            }

            // Reset long press state if it was set
            if (this.stateManager.isLongPress) {
                this.stateManager.isLongPress = false;
                console.log('Reset long press state due to double-click');
            }

            this.updateMouse(event);
            const intersects = this.getIntersectedObjects();
            
            if (intersects.length > 0) {
                const object = intersects[0].object;
                console.log('Double-click detected on object:', object.userData.fileName);
                this.onObjectDoubleClick(object);
            } else {
                // Check for focus zone intersections
                const zoneIntersects = this.getIntersectedFocusZones();
                if (zoneIntersects.length > 0) {
                    const zoneObject = zoneIntersects[0].object;
                    console.log('Double-click detected on focus zone');
                    this.onFocusZoneClick(zoneObject);
                } else {
                    console.log('Double-click on background');
                }
            }
        }

        onClick(event) {
            console.log('onClick event triggered, isLongPress:', this.stateManager.isLongPress);
            
            if (this.stateManager.isLongPress) return;
            
            // If we're currently moving an object, don't process click events
            if (this.stateManager.movingObject && this.stateManager.isDragging) return;

            this.updateMouse(event);
            const intersects = this.getIntersectedObjects();
            
            if (intersects.length > 0) {
                const intersection = intersects[0];
                const object = intersection.object;
                console.log('Single click on object:', object.userData.fileName);
                
                // Check if the tapped object is an SMS screen
                if (object.userData.isSmsScreen) {
                    this.onSmsScreenTap(object, intersection);
                } else if (object.userData.isMediaPreviewScreen) {
                    // MV3D: Handle media preview screen taps
                    this.onMediaPreviewScreenTap(object, intersection);
                } else if (object.userData.isContactInfoScreen) {
                    // MV3D: Handle contact info screen taps with UV coords
                    this.onContactInfoScreenTap(object, intersection);
                } else {
                    this.onObjectClick(object, event);
                }

            } else {
                console.log('Single click on background');
                this.onBackgroundClick();
            }
        }

        // Event emitters - to be handled by other managers
        onObjectInteractionStart(object, event) {
            // Emit event for other managers to handle
            if (window.app && window.app.interactionManager) {
                window.app.interactionManager.handleObjectInteractionStart(object, event);
            }
        }

        onObjectClick(object, event) {
            if (window.app && window.app.interactionManager) {
                window.app.interactionManager.handleObjectClick(object, event);
            }
        }

        onSmsScreenTap(smsScreen, event) {
            if (window.app && window.app.interactionManager) {
                window.app.interactionManager.handleSmsScreenTap(smsScreen, event);
            }
        }

        onMediaPreviewScreenTap(mediaPreviewScreen, intersection) {
            // MV3D: Handle media preview screen interactions
            if (window.app && window.app.interactionManager) {
                window.app.interactionManager.handleMediaPreviewScreenTap(mediaPreviewScreen, intersection);
            }
        }
        
        onContactInfoScreenTap(contactInfoScreen, intersection) {
            // MV3D: Handle contact info screen interactions
            if (window.app && window.app.interactionManager) {
                window.app.interactionManager.handleContactInfoScreenTap(contactInfoScreen, intersection);
            }
        }

        onSmsScreenDoubleClick(smsScreen) {
            if (window.app && window.app.interactionManager) {
                window.app.interactionManager.handleSmsScreenDoubleClick(smsScreen);
            }
        }

        onObjectDoubleClick(object) {
            if (window.app && window.app.interactionManager) {
                window.app.interactionManager.handleObjectDoubleClick(object);
            }
        }

        onBackgroundClick() {
            if (window.app && window.app.interactionManager) {
                window.app.interactionManager.handleBackgroundClick();
            }
        }

        onObjectMove(event) {
            if (this.moveManager) {
                this.moveManager.handleObjectMove(event);
            } else {
                console.warn('InputManager: MoveManager reference not set');
            }
        }

        onObjectMoveEnd() {
            if (this.moveManager) {
                this.moveManager.handleObjectMoveEnd();
            } else {
                console.warn('InputManager: MoveManager reference not set');
            }
        }

        onLongPressEnd() {
            if (this.interactionManager) {
                this.interactionManager.handleLongPressEnd();
            } else {
                console.warn('InputManager: InteractionManager reference not set');
            }
        }

        onFocusZoneClick(zoneObject) {
            if (this.focusZoneManager) {
                this.focusZoneManager.handleZoneClick(zoneObject);
            } else {
                console.warn('InputManager: FocusZoneManager reference not set');
            }
        }

        /**
         * Check if explore mode is currently active
         */
        isExploreMode() {
            // Try multiple ways to check explore mode status
            if (window.app && window.app.exploreManager && window.app.exploreManager.exploreMode) {
                return window.app.exploreManager.exploreMode.isActive;
            }
            
            if (window.exploreManager && window.exploreManager.exploreMode) {
                return window.exploreManager.exploreMode.isActive;
            }
            
            if (this.app && this.app.exploreManager && this.app.exploreManager.exploreMode) {
                return this.app.exploreManager.exploreMode.isActive;
            }
            
            return false;
        }

        /**
         * Check if ExploreControls is currently handling events
         */
        isExploreControlsHandlingEvents() {
            // Try multiple ways to check ExploreControls status
            if (window.app && window.app.exploreManager && window.app.exploreManager.exploreControls) {
                return window.app.exploreManager.exploreControls.isActive;
            }
            
            if (window.exploreManager && window.exploreManager.exploreControls) {
                return window.exploreManager.exploreControls.isActive;
            }
            
            if (this.app && this.app.exploreManager && this.app.exploreManager.exploreControls) {
                return this.app.exploreManager.exploreControls.isActive;
            }
            
            return false;
        }
    }

    // Make globally accessible
    window.InputManager = InputManager;
    
    console.log("InputManager module loaded successfully");
})();
