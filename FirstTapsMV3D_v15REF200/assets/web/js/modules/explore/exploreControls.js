// ============================================================================
// EXPLORE CONTROLS HANDLER  
// ============================================================================
// Advanced touch/mouse input handling for explore mode movement

(function() {
    'use strict';

    class ExploreControls {
        constructor(app) {
            console.log('🎮 ExploreControls: Initializing...');
            this.app = app;
            this.isActive = false;
            
            // Touch/pointer tracking
            this.pointers = new Map(); // Track multiple touch points
            this.currentGesture = null;
            
            // Movement configuration
            this.edgeThreshold = 80; // Pixels from edge to trigger movement
            this.centerDeadZone = 100; // Pixels around center for forward/back
            this.movementSensitivity = 1.0; // Movement speed multiplier
            
            // Movement state
            this.movementVector = { x: 0, y: 0, rotation: 0 };
            this.isMoving = false;
            
            // Double-tap detection
            this.lastTapTime = 0;
            this.doubleTapThreshold = 300; // ms
            this.lastTapPosition = { x: 0, y: 0 };
            this.tapPositionThreshold = 30; // pixels
            this.singleTapTimeout = null; // For single-tap detection
            
            // Smart logging - only log every Nth movement to reduce spam
            this.logCounter = 0;
            this.logInterval = 30; // Log every 30th movement event
            
            // Event bindings
            this.boundHandlers = {};
            
            console.log('🎮 ExploreControls: Initialized successfully');
        }

        /**
         * Handle double-tap detection for object interaction in explore mode
         * Implements two-stage behavior: 1) Move avatar close, 2) Open object
         */
        handleDoubleTap(event) {
            if (!this.app) {
                console.warn('🎮 App not available for double-tap');
                return false;
            }

            // CRITICAL: Aggressively prevent default camera behavior in explore mode
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            console.log('🎮 ExploreControls: Taking control of double-tap event in explore mode');
            
            // CRITICAL: Cancel any pending long press timeouts in other systems
            this.cancelOtherSystemTimeouts();

            // Try inputManager first for raycasting
            if (this.app.inputManager) {
                // Update mouse position for raycasting
                this.app.inputManager.updateMouse(event);
                
                // Get intersected objects using InputManager - CRITICAL: Use intersects format
                const intersects = this.app.inputManager.getIntersectedObjects();
                
                console.log('🎮 DEBUG: InputManager returned', intersects?.length || 0, 'intersections');
                if (intersects && intersects.length > 0) {
                    // Log all intersections to understand what we're getting
                    intersects.forEach((intersection, index) => {
                        const obj = intersection.object;
                        console.log(`🎮 Intersection ${index}:`, {
                            name: obj.name,
                            hasUserData: !!obj.userData,
                            type: obj.userData?.type,
                            fileName: obj.userData?.fileName,
                            distance: intersection.distance
                        });
                    });
                }
                
                if (intersects && intersects.length > 0) {
                    // CRITICAL: Use intersection.object, not the intersection itself
                    const object = intersects[0].object;
                    console.log('🎮 Double-tap on object:', object.userData?.fileName || object.name || 'unnamed object');
                    console.log('🎮 HIT OBJECT in explore mode:');
                    console.log('🎮   Object name:', object.name);
                    console.log('🎮   Object userData:', object.userData);
                    console.log('🎮   Object type:', object.userData?.type, 'subType:', object.userData?.subType);
                    console.log('🎮   Object fileName:', object.userData?.fileName);
                    console.log('🎮   Object position:', object.position);
                    
                    // Check if the double-tap is on the explore avatar's collision sphere
                    if (object.userData && (object.userData.interaction === 'exploreAvatarCustomization' || object.userData.interactionType === 'exploreAvatarCustomization')) {
                        console.log('🎨 Double-tap on explore avatar collision sphere - using ContactCustomizationManager');
                        
                        // Use the existing ContactCustomizationManager with special explore avatar ID
                        if (window.ContactCustomizationManager && window.ContactCustomizationManager.instance) {
                            try {
                                const contactData = {
                                    name: 'Explore Avatar',
                                    id: 'EXPLORE_AVATAR',
                                    object: null // No actual contact object for explore avatar
                                };
                                
                                console.log('🎨 Calling ContactCustomizationManager.showCustomizationMenu() for explore avatar');
                                window.ContactCustomizationManager.instance.showCustomizationMenu('EXPLORE_AVATAR', contactData);
                            } catch (error) {
                                console.error('🎨 Error opening explore avatar customization:', error);
                            }
                        } else {
                            console.error('🎨 ContactCustomizationManager not available');
                        }
                        return; // Stop further processing
                    }

                    // Check if this is a furniture object
                    if (object.userData && (object.userData.isFurniture || object.userData.type === 'furniture' || object.userData.furnitureId)) {
                        console.log('🪑 Double-tap on furniture in explore mode');
                        
                        // Find the furniture group
                        let furnitureGroup = object;
                        while (furnitureGroup && !(furnitureGroup.userData.isFurniture || furnitureGroup.userData.type === 'furniture')) {
                            furnitureGroup = furnitureGroup.parent;
                        }
                        
                        if (furnitureGroup && this.app.furnitureViewManager) {
                            console.log('🪑 Entering furniture closeup view');
                            this.app.furnitureViewManager.enterCloseupView(furnitureGroup);
                            return true; // Signal that we handled the event
                        }
                    }

                    // If not the explore avatar or furniture, proceed with other interactions
                    if (object.userData && (object.userData.type === 'fileObject' || object.userData.isContact)) {
                        // PRIORITY 2: Check if this is a valid file object, not a focus zone
                        if (object.userData && 
                            (object.userData.type === 'fileObject' || 
                             object.userData.type === 'app' || 
                             object.userData.subType === 'contact' ||
                             object.userData.fileName)) {
                        
                            console.log('🎮 ✅ CONFIRMED FILE OBJECT - implementing two-stage behavior');
                        
                            // Implement two-stage explore mode behavior
                            this.handleExploreObjectDoubleClick(object);
                        
                            // Prevent default behavior
                            return true; // Signal that we handled the event
                        } else {
                            console.log('🎮 ❌ Object is NOT a valid file object, checking for focus zones...');
                            console.log('🎮    Criteria failed - type:', object.userData?.type, 'subType:', object.userData?.subType, 'fileName:', object.userData?.fileName);
                        
                            // FALLBACK: Try to find a valid file object in the list (but check for avatar collision first)
                            const avatarCollisionIntersection = intersects.find(intersection => {
                                return window.ExploreAvatarCollisionManager && 
                                       window.ExploreAvatarCollisionManager.isAvatarCollisionSphere(intersection.object);
                            });
                        
                            if (avatarCollisionIntersection) {
                                console.log('🎮 ✅ FOUND AVATAR COLLISION SPHERE in list - using it');
                                const handled = window.ExploreAvatarCollisionManager.handleAvatarCollisionInteraction(avatarCollisionIntersection.object);
                                if (handled) {
                                    return true;
                                }
                            }
                        
                            const validIntersection = intersects.find(intersection => {
                                const obj = intersection.object;
                                return obj.userData && (
                                    obj.userData.type === 'fileObject' || 
                                    obj.userData.type === 'app' || 
                                    obj.userData.subType === 'contact' ||
                                    obj.userData.fileName
                                );
                            });
                        
                            if (validIntersection) {
                                const validObject = validIntersection.object;
                                console.log('🎮 ✅ FOUND VALID FILE OBJECT in list - using it:', validObject.userData?.fileName || validObject.name);
                                this.handleExploreObjectDoubleClick(validObject);
                                return true;
                            }
                        }
                    }
                
                    // Check for focus zone interaction - PRIORITIZE EXPLORE MODE HANDLING
                    if (this.app.inputManager.getIntersectedFocusZones) {
                        const intersectedZones = this.app.inputManager.getIntersectedFocusZones();
                        if (intersectedZones && intersectedZones.length > 0) {
                            const zone = intersectedZones[0];
                            console.log('🎮 Double-tap on focus zone in explore mode:', zone.userData?.zoneName || 'unknown');
                        
                            // In explore mode, move avatar to focus zone instead of just moving camera
                            const handled = this.moveAvatarToFocusZone(zone);
                        
                            // Always prevent default focus zone handling that moves only the camera
                            return true; // Signal that we handled the event (even if move failed)
                        }
                    }
                
                    // If no objects or zones hit, move avatar to ground plane
                    const groundHit = this.getGroundPlaneHit(event);
                    if (groundHit) {
                        console.log('🎮 Double-tap on ground plane');
                        this.moveAvatarToPosition(groundHit);
                        return true; // Signal that we handled the event
                    }
                
                } else {
                    console.log('🎮 No intersections found');
                }
                
            } else {
                console.warn('🎮 InputManager not available for double-tap');
            }

            // Always return true to prevent other handlers from processing this event
            return true;
        }

        /**
         * Handle single-tap on objects - specifically for contact objects
         * Uses the same ContactManager as default mode
         */
        handleSingleTap(event, position) {
            if (!this.app) {
                console.warn('🎮 App not available for single-tap');
                return false;
            }

            console.log('🎮 ExploreControls: Handling single-tap in explore mode');

            // Try inputManager for raycasting
            if (this.app.inputManager) {
                // Update mouse position for raycasting
                this.app.inputManager.updateMouse(event);
                
                // Get intersected objects
                const intersects = this.app.inputManager.getIntersectedObjects();
                
                if (intersects && intersects.length > 0) {
                    const object = intersects[0].object;
                    console.log('🎮 Single-tap on object:', object.userData?.fileName || object.name || 'unnamed object');
                    
                    // Check if this is an SMS screen object - handle SMS interactions first
                    if (object.userData && object.userData.type === 'smsScreen') {
                        console.log('📱 SMS screen detected - checking for close button interaction');
                        
                        // Cancel any pending long press timeouts to prevent conflicts
                        this.cancelOtherSystemTimeouts();
                        
                        // CRITICAL: Use the exact same process as default mode - ContactManager.handleContactInteraction
                        console.log('📱 SMS screen tapped in explore mode - using ContactManager like default mode');
                        
                        // Find the contact ID for the SMS screen to close it properly
                        let contactId = null;
                        
                        // Method 1: Get contact ID from SMS screen userData
                        if (object.userData && object.userData.contactId) {
                            contactId = object.userData.contactId;
                            console.log('📱 Found contact ID from SMS screen userData:', contactId);
                        }
                        
                        // Method 2: Get active contact ID from ContactManager
                        if (!contactId && window.app && window.app.contactManager && window.app.contactManager.activeContactId) {
                            contactId = window.app.contactManager.activeContactId;
                            console.log('📱 Found active contact ID from ContactManager:', contactId);
                        }
                        
                        // Method 3: Get contact ID from SMS interaction manager
                        if (!contactId && this.app.smsInteractionManager && this.app.smsInteractionManager.activeContactId) {
                            contactId = this.app.smsInteractionManager.activeContactId;
                            console.log('📱 Found contact ID from SMS interaction manager:', contactId);
                        }
                        
                        // Use ContactManager to close SMS screen (same as default mode)
                        if (contactId && window.app && window.app.contactManager && window.app.contactManager.handleContactInteraction) {
                            console.log('📱 Using ContactManager.handleContactInteraction to close SMS in explore mode (same as default mode)');
                            window.app.contactManager.handleContactInteraction(contactId, false);
                            return true;
                        } else {
                            console.warn('📱 Could not find contact ID or ContactManager for SMS close in explore mode');
                            console.log('📱 Available data:', {
                                contactId: contactId,
                                hasApp: !!window.app,
                                hasContactManager: !!(window.app && window.app.contactManager),
                                hasHandleContactInteraction: !!(window.app && window.app.contactManager && window.app.contactManager.handleContactInteraction),
                                smsScreenUserData: object.userData
                            });
                            
                            // Fallback to original method if ContactManager approach fails
                            if (this.app.smsInteractionManager && this.app.smsInteractionManager.exitSmsMode) {
                                console.log('📱 Fallback: Using direct exitSmsMode');
                                this.app.smsInteractionManager.exitSmsMode();
                                return true;
                            }
                        }
                    }
                    
                    // Check if this is a contact object (same logic as default mode)
                    const contactInfo = this.detectContactObject(object);
                    if (contactInfo.isContact) {
                        console.log(`📱 Contact detected on single-tap: ${contactInfo.contactId} (${contactInfo.name})`);
                        
                        // CRITICAL: Cancel any pending long press timeouts to prevent move/delete menu
                        this.cancelOtherSystemTimeouts();
                        
                        // Use the same ContactManager method as default mode
                        if (window.app && window.app.contactManager && window.app.contactManager.handleContactInteraction) {
                            console.log('📱 Calling ContactManager.handleContactInteraction for single-tap');
                            window.app.contactManager.handleContactInteraction(contactInfo.contactId, false);
                            return true;
                        } else {
                            console.error('ContactManager not available for single-tap');
                        }
                    }
                }
            }
            
            return false;
        }

        /**
         * Detect contact objects (same logic as InteractionManager)
         */
        detectContactObject(object) {
            const result = {
                isContact: false,
                contactId: null,
                name: null,
                method: null,
                meshObject: object
            };

            if (!object || !object.userData) {
                return result;
            }

            // Method 1: Standard file object with contact subType
            if (object.userData.type === 'fileObject' && object.userData.subType === 'contact') {
                result.isContact = true;
                result.contactId = object.userData.contactId || object.userData.id;
                result.name = object.userData.fileName;
                result.method = 'fileObject-subType';
                return result;
            }

            // Method 2: Legacy contact type
            if (object.userData.type === 'contact') {
                result.isContact = true;
                result.contactId = object.userData.contactId || object.userData.id;
                result.name = object.userData.fileName || object.userData.name;
                result.method = 'legacy-type';
                return result;
            }

            // Method 3: Check parent for contact data
            if (object.parent && object.parent.userData) {
                if (object.parent.userData.type === 'fileObject' && object.parent.userData.subType === 'contact') {
                    result.isContact = true;
                    result.contactId = object.parent.userData.contactId || object.parent.userData.id;
                    result.name = object.parent.userData.fileName;
                    result.method = 'parent-fileObject';
                    result.meshObject = object.parent;
                    return result;
                }
            }

            return result;
        }

        /**
         * Handle object double-click in explore mode with two-stage behavior
         * Uses the same logic as default mode but adapted for avatar movement
         * Stage 1: Move avatar close to object
         * Stage 2: Open/launch the object
         */
        handleExploreObjectDoubleClick(object) {
            // Try to get exploreMode from various sources
            let exploreMode = null;
            
            if (this.app.exploreManager && this.app.exploreManager.exploreMode) {
                exploreMode = this.app.exploreManager.exploreMode;
            } else if (window.exploreManager && window.exploreManager.exploreMode) {
                exploreMode = window.exploreManager.exploreMode;
            } else if (window.ExploreMode && this.app.exploreMode) {
                exploreMode = this.app.exploreMode;
            }

            if (!object || !exploreMode || !exploreMode.isActive) {
                console.warn('🎮 Cannot handle explore object interaction - missing components');
                console.log('🎮 Debug - object:', !!object, 'exploreMode:', !!exploreMode, 'isActive:', exploreMode?.isActive);
                return;
            }

            const avatar = exploreMode.avatar;
            
            if (!avatar) {
                console.warn('🎮 Cannot handle explore object interaction - avatar not available');
                return;
            }

            // Safety check for object position
            if (!object.position) {
                console.warn('🎮 Object has no position property:', object);
                return;
            }

            // Calculate distance from avatar to object - BUT account for camera being behind avatar
            const avatarPos = avatar.position;
            const objectPos = object.position;
            
            // Additional safety check for position properties
            if (typeof objectPos.x === 'undefined' || typeof objectPos.z === 'undefined') {
                console.warn('🎮 Object position is invalid:', objectPos);
                return;
            }
            
            const distance = avatarPos.distanceTo(objectPos);
            
            // In explore mode, camera is 5 units behind avatar, so we need to account for that
            // The camera needs to be close enough to detect the object, not just the avatar
            const avatarCameraDistance = 5; // Same as exploreMode.avatarDistance
            const cameraPos = this.app.camera ? this.app.camera.position : avatarPos;
            const cameraToObjectDistance = cameraPos.distanceTo(objectPos);
            
            // Use the same logic as InteractionManager for calculating close threshold
            const objectSize = this.calculateObjectSize(object);
            let closeThreshold = Math.max(objectSize * 3.5, 12); // Same as default mode
            
            // IMPORTANT: Add extra buffer for explore mode since camera is behind avatar
            // This ensures the camera is close enough to properly detect/interact with objects
            closeThreshold += avatarCameraDistance; // Add camera distance buffer
            
            console.log('🎮 Explore mode double-tap - Avatar distance to object:', distance.toFixed(2), 'threshold:', closeThreshold.toFixed(2));
            console.log('🎮 Camera distance to object:', cameraToObjectDistance.toFixed(2), 'camera buffer added:', avatarCameraDistance);
            console.log('🎮 Object size:', objectSize.toFixed(2), 'calculated threshold with camera buffer:', closeThreshold.toFixed(2));
            console.log('🎮 Avatar position:', avatarPos.x.toFixed(2), avatarPos.y.toFixed(2), avatarPos.z.toFixed(2));
            console.log('🎮 Object position:', objectPos.x.toFixed(2), objectPos.y.toFixed(2), objectPos.z.toFixed(2));
            console.log('🎮 Camera position:', cameraPos.x.toFixed(2), cameraPos.y.toFixed(2), cameraPos.z.toFixed(2));
            
            // Use camera distance for decision making since that's what matters for raycasting
            // But still move avatar based on avatar distance for smooth positioning
            if (cameraToObjectDistance > closeThreshold) {
                // Stage 1: Move avatar close to the object
                console.log('🎮 Stage 1: Moving avatar close to object (camera needs to get closer)');
                this.moveAvatarToObject(object, exploreMode);
            } else {
                // Stage 2: Camera is close enough to object, open it
                console.log('🎮 Stage 2: Camera is close enough to object, opening object');
                this.openObjectInExploreMode(object);
            }
        }

        /**
         * Calculate the bounding size of an object (same as InteractionManager)
         */
        calculateObjectSize(object) {
            if (!object || !object.geometry) {
                return 4; // Default size if no geometry
            }

            try {
                // Compute bounding box if not already computed
                if (!object.geometry.boundingBox) {
                    object.geometry.computeBoundingBox();
                }

                const boundingBox = object.geometry.boundingBox;
                if (!boundingBox) {
                    return 4; // Default size if boundingBox computation failed
                }

                // Calculate the maximum dimension of the bounding box
                const size = new THREE.Vector3();
                boundingBox.getSize(size);
                
                // Return the largest dimension (width, height, or depth)
                const maxDimension = Math.max(size.x, size.y, size.z);
                return Math.max(maxDimension, 2); // Minimum size of 2 for small objects
            } catch (error) {
                console.warn('🎮 Error calculating object size:', error);
                return 4; // Default size on error
            }
        }

        /**
         * Move avatar close to an object in explore mode
         */
        moveAvatarToObject(object, exploreMode) {
            if (!object || !exploreMode) {
                console.warn('🎮 Cannot move avatar - missing object or exploreMode');
                return;
            }

            const avatar = exploreMode.avatar;
            
            if (!avatar) {
                console.warn('🎮 Cannot move avatar - avatar not available');
                return;
            }

            // Safety check for object position
            if (!object.position) {
                console.warn('🎮 Object has no position property');
                return;
            }

            // Calculate optimal position for avatar (in front of object, facing it)
            const objectPos = object.position;
            const approachDistance = 6; // Distance in front of object
            
            // Position avatar IN FRONT of the object (positive Z direction), facing it
            const avatarTargetPos = new THREE.Vector3(
                objectPos.x,
                Math.max(objectPos.y, 0.6), // Keep avatar at ground level or higher
                objectPos.z + approachDistance  // POSITIVE Z: puts avatar in front of object
            );
            
            // Move avatar to target position
            avatar.position.copy(avatarTargetPos);
            
            // Make avatar look at the object (avatar is now in front, facing toward object)
            avatar.lookAt(objectPos);
            
            // CRITICAL: Rotate avatar 180 degrees to face the object properly
            avatar.rotateY(Math.PI); // 180 degrees rotation to face the object
            
            console.log('🎮 Avatar moved to object at position:', objectPos.x.toFixed(2), objectPos.y.toFixed(2), objectPos.z.toFixed(2), 'distance:', approachDistance);
            console.log('🎮 Avatar positioned in front of object and rotated to face it correctly');
            
            // Update camera to follow avatar to new position - camera stays behind avatar
            exploreMode.setupThirdPersonCamera();
        }

        /**
         * Open/launch an object in explore mode using the same system as default mode
         */
        openObjectInExploreMode(object) {
            console.log('🎮 Opening object in explore mode:', object.userData?.fileName || object.name || 'unnamed');
            
            // Use the exact same method as default mode - startObjectInteraction
            if (this.app.interactionManager && this.app.interactionManager.startObjectInteraction) {
                console.log('🎮 Using InteractionManager.startObjectInteraction (same as default mode)');
                this.app.interactionManager.startObjectInteraction(object, null);
                return;
            }
            
            // Fallback: Try other methods
            let opened = false;
            
            // Method 2: Use InputManager if available
            if (!opened && this.app.inputManager && this.app.inputManager.onObjectDoubleClick) {
                console.log('🎮 Using InputManager to open object');
                this.app.inputManager.onObjectDoubleClick(object);
                opened = true;
            }
            
            // Method 3: Use global app handler
            if (!opened && window.app && window.app.handleObjectDoubleClick) {
                console.log('🎮 Using global app handler to open object');
                window.app.handleObjectDoubleClick(object);
                opened = true;
            }
            
            if (!opened) {
                console.warn('🎮 No object opening handler available - trying direct file interaction');
                
                // Last resort - try to trigger object interaction directly
                if (object.userData && object.userData.fileName) {
                    console.log('🎮 Attempting direct file interaction for:', object.userData.fileName);
                    // Could add direct file opening logic here if needed
                }
            }
        }

        /**
         * Move avatar to a focus zone position in explore mode
         */
        moveAvatarToFocusZone(zone) {
            // Try to get exploreMode from various sources
            let exploreMode = null;
            
            if (this.app.exploreManager && this.app.exploreManager.exploreMode) {
                exploreMode = this.app.exploreManager.exploreMode;
            } else if (window.exploreManager && window.exploreManager.exploreMode) {
                exploreMode = window.exploreManager.exploreMode;
            }

            if (!exploreMode || !exploreMode.isActive) {
                console.warn('🎮 Cannot move avatar to focus zone - explore mode not active');
                return false;
            }

            if (!zone) {
                console.warn('🎮 Cannot move avatar to focus zone - invalid zone');
                return false;
            }

            // ENHANCED zone position detection with comprehensive fallbacks
            let zonePos = null;
            
            // Method 1: Direct position property
            if (zone.position && (zone.position.x !== 0 || zone.position.z !== 0)) {
                zonePos = zone.position.clone();
                console.log('🎮 Using direct zone position:', zonePos.x, zonePos.y, zonePos.z);
            }
            
            // Method 2: userData center
            if (!zonePos && zone.userData && zone.userData.center) {
                zonePos = zone.userData.center;
                console.log('🎮 Using zone userData.center:', zonePos.x, zonePos.y, zonePos.z);
            }
            
            // Method 3: userData position
            if (!zonePos && zone.userData && zone.userData.position) {
                zonePos = zone.userData.position;
                console.log('🎮 Using zone userData.position:', zonePos.x, zonePos.y, zonePos.z);
            }
            
            // Method 4: Zone coordinates from userData (common format)
            if (!zonePos && zone.userData && typeof zone.userData.zoneX !== 'undefined' && typeof zone.userData.zoneZ !== 'undefined') {
                zonePos = new THREE.Vector3(zone.userData.zoneX, 0, zone.userData.zoneZ);
                console.log('🎮 Using zone coordinates from userData:', zone.userData.zoneX, zone.userData.zoneZ);
            }
            
            // Method 5: Zone center coordinates from userData (alternative format)
            if (!zonePos && zone.userData && typeof zone.userData.zoneCenterX !== 'undefined' && typeof zone.userData.zoneCenterZ !== 'undefined') {
                zonePos = new THREE.Vector3(zone.userData.zoneCenterX, 0, zone.userData.zoneCenterZ);
                console.log('🎮 Using zone center coordinates from userData:', zone.userData.zoneCenterX, zone.userData.zoneCenterZ);
            }
            
            // Method 6: Geometry bounding sphere center
            if (!zonePos && zone.geometry && zone.geometry.boundingSphere) {
                zone.geometry.computeBoundingSphere(); // Ensure it's computed
                zonePos = zone.geometry.boundingSphere.center.clone();
                console.log('🎮 Using bounding sphere center:', zonePos.x, zonePos.y, zonePos.z);
            }
            
            // Method 7: Geometry bounding box center
            if (!zonePos && zone.geometry && zone.geometry.boundingBox) {
                zone.geometry.computeBoundingBox(); // Ensure it's computed
                const box = zone.geometry.boundingBox;
                zonePos = new THREE.Vector3();
                box.getCenter(zonePos);
                console.log('🎮 Using bounding box center:', zonePos.x, zonePos.y, zonePos.z);
            }
            
            // Method 8: World position fallback
            if (!zonePos && zone.getWorldPosition) {
                const worldPos = new THREE.Vector3();
                zone.getWorldPosition(worldPos);
                console.log('🎮 Trying world position fallback:', worldPos.x, worldPos.y, worldPos.z);
                if (worldPos.x !== 0 || worldPos.z !== 0) {
                    zonePos = worldPos;
                    console.log('🎮 Using world position as fallback');
                }
            }
            
            // Method 9: Object3D position with matrix update
            if (!zonePos && zone.position) {
                zone.updateMatrixWorld(true); // Force matrix update
                const worldPos = new THREE.Vector3();
                zone.getWorldPosition(worldPos);
                if (worldPos.x !== 0 || worldPos.z !== 0) {
                    zonePos = worldPos;
                    console.log('🎮 Using updated world position:', zonePos.x, zonePos.y, zonePos.z);
                }
            }
            
            // Method 10: Try raycasting intersection point as fallback
            if (!zonePos && this.app && this.app.inputManager) {
                const intersectedZones = this.app.inputManager.getIntersectedFocusZones();
                if (intersectedZones && intersectedZones.length > 0) {
                    const intersection = intersectedZones[0];
                    if (intersection.point) {
                        zonePos = intersection.point.clone();
                        console.log('🎮 Using raycasting intersection point:', zonePos.x, zonePos.y, zonePos.z);
                    }
                }
            }
            
            // Method 11: Default to known zone grid coordinates based on zone name/id
            if (!zonePos && zone.userData && (zone.userData.zoneName || zone.name)) {
                const zoneName = zone.userData.zoneName || zone.name;
                const gridMatch = zoneName.match(/(\d+),\s*(\d+)/); // Match "10, 10" format
                if (gridMatch) {
                    const gridX = parseInt(gridMatch[1]) * 2; // Convert grid to world coordinates
                    const gridZ = parseInt(gridMatch[2]) * 2;
                    zonePos = new THREE.Vector3(gridX, 0, gridZ);
                    console.log('🎮 Using grid coordinates from zone name:', gridX, gridZ);
                }
            }
            
            if (!zonePos) {
                console.warn('🎮 Cannot determine focus zone position - tried all methods');
                console.log('🎮 Zone debug info:', {
                    hasPosition: !!zone.position,
                    position: zone.position,
                    userData: zone.userData,
                    zoneKeys: zone.userData ? Object.keys(zone.userData) : 'no userData',
                    hasGeometry: !!zone.geometry,
                    geometryType: zone.geometry ? zone.geometry.type : 'no geometry',
                    hasBoundingSphere: !!(zone.geometry && zone.geometry.boundingSphere),
                    hasBoundingBox: !!(zone.geometry && zone.geometry.boundingBox),
                    zoneName: zone.name,
                    zoneId: zone.id,
                    zoneType: typeof zone,
                    zoneConstructor: zone.constructor.name
                });
                
                // LAST RESORT: Use a default position based on camera target or origin
                if (this.app.camera) {
                    const cameraTarget = new THREE.Vector3(0, 0, 0);
                    if (this.app.cameraControls && this.app.cameraControls.getTarget) {
                        this.app.cameraControls.getTarget(cameraTarget);
                    }
                    zonePos = cameraTarget.clone();
                    zonePos.y = 0; // Ground level
                    console.log('🎮 Using camera target as last resort position:', zonePos.x, zonePos.y, zonePos.z);
                }
                
                if (!zonePos) {
                    return false;
                }
            }

            // Move avatar to approach the focus zone from a good viewing distance
            const approachDistance = 8; // Distance to stay back from zone center
            const targetPosition = new THREE.Vector3(
                zonePos.x, 
                0.6, // Ground level
                zonePos.z + approachDistance // Behind the zone center
            );
            
            // Make avatar look at the zone center
            const lookAtTarget = new THREE.Vector3(zonePos.x, zonePos.y, zonePos.z);
            
            exploreMode.moveAvatarToPosition(targetPosition, lookAtTarget);
            console.log('🎮 Avatar moved to focus zone:', zone.userData?.zoneName || 'unknown', 
                       'at position:', targetPosition.x.toFixed(2), targetPosition.y.toFixed(2), targetPosition.z.toFixed(2));
            
            return true; // Successfully handled the zone movement
        }

        /**
         * Cancel long press timeouts in other input systems to prevent conflicts
         */
        cancelOtherSystemTimeouts() {
            console.log('🎮 Canceling other system timeouts to prevent conflicts');
            
            // Cancel InputManager long press timeout
            if (this.app.inputManager && this.app.inputManager.stateManager) {
                if (this.app.inputManager.stateManager.longPressTimeout) {
                    console.log('🎮 Canceling InputManager long press timeout');
                    clearTimeout(this.app.inputManager.stateManager.longPressTimeout);
                    this.app.inputManager.stateManager.longPressTimeout = null;
                    this.app.inputManager.stateManager.isLongPress = false;
                }
            }
            
            // Cancel any global long press timeouts
            if (window.app && window.app.inputManager && window.app.inputManager.stateManager) {
                if (window.app.inputManager.stateManager.longPressTimeout) {
                    console.log('🎮 Canceling global InputManager long press timeout');
                    clearTimeout(window.app.inputManager.stateManager.longPressTimeout);
                    window.app.inputManager.stateManager.longPressTimeout = null;
                    window.app.inputManager.stateManager.isLongPress = false;
                }
            }
            
            // Cancel InteractionManager timeouts if available
            if (this.app.interactionManager && this.app.interactionManager.longPressTimeout) {
                console.log('🎮 Canceling InteractionManager long press timeout');
                clearTimeout(this.app.interactionManager.longPressTimeout);
                this.app.interactionManager.longPressTimeout = null;
            }
            
            // Cancel any other known timeout systems
            if (window.longPressTimeout) {
                console.log('🎮 Canceling global long press timeout');
                clearTimeout(window.longPressTimeout);
                window.longPressTimeout = null;
            }
        }

        /**
         * Move avatar to a ground plane position in explore mode
         */
        moveAvatarToPosition(targetPosition) {
            // Try to get exploreMode from various sources
            let exploreMode = null;
            
            if (this.app.exploreManager && this.app.exploreManager.exploreMode) {
                exploreMode = this.app.exploreManager.exploreMode;
            } else if (window.exploreManager && window.exploreManager.exploreMode) {
                exploreMode = window.exploreManager.exploreMode;
            }

            if (!exploreMode || !exploreMode.isActive) {
                console.warn('🎮 Cannot move avatar to position - explore mode not active');
                return;
            }

            if (!targetPosition) {
                console.warn('🎮 Cannot move avatar - invalid target position');
                return;
            }

            exploreMode.moveAvatarToPosition(targetPosition);
            console.log('🎮 Avatar moved to ground position:', targetPosition.x.toFixed(2), targetPosition.y.toFixed(2), targetPosition.z.toFixed(2));
        }

        /**
         * Get ground plane intersection point from mouse/touch event
         */
        getGroundPlaneHit(event) {
            if (!this.app.camera || !this.app.renderer) {
                return null;
            }

            // Create raycaster from mouse position
            const rect = this.app.renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.app.camera);

            // Create ground plane at y = 0
            const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const intersection = new THREE.Vector3();
            
            if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
                return intersection;
            }
            
            return null;
        }

        /**
         * Open/launch an object in explore mode (Stage 2)
         */
        openObjectInExploreMode(object) {
            // For double-tap opening, we should use handleObjectDoubleClick, not startObjectInteraction
            // startObjectInteraction is for single-tap (sets up long press), handleObjectDoubleClick is for opening
            
            // First try the correct double-click handler
            if (this.app.interactionManager && this.app.interactionManager.handleObjectDoubleClick) {
                console.log('🎮 Using handleObjectDoubleClick for object opening in explore mode (correct method)');
                this.app.interactionManager.handleObjectDoubleClick(object, true); // Pass true to indicate this is from ExploreControls
                return;
            }
            
            // Fallback to openFile method directly
            if (this.app.interactionManager && this.app.interactionManager.openFile) {
                console.log('🎮 Using openFile directly for object opening in explore mode');
                this.app.interactionManager.openFile(object);
                return;
            }
            
            // Last resort fallback to inputManager
            if (this.app.inputManager && this.app.inputManager.handleObjectDoubleClick) {
                console.log('🎮 Using inputManager handleObjectDoubleClick for object opening in explore mode');
                this.app.inputManager.handleObjectDoubleClick(object);
                return;
            }
            
            console.warn('🎮 No handler available to open object in explore mode');
        }

        /**
         * Enable explore-specific touch/mouse controls
         */
        enable() {
            if (this.isActive) {
                console.log('🎮 ExploreControls already active');
                return;
            }

            this.setupEventListeners();
            this.isActive = true;
            console.log('🎮 ExploreControls enabled');
        }

        /**
         * Disable explore controls
         */
        disable() {
            if (!this.isActive) {
                console.log('🎮 ExploreControls already disabled');
                return;
            }

            this.removeEventListeners();
            this.clearMovementState();
            this.isActive = false;
            console.log('🎮 ExploreControls disabled');
        }

        /**
         * Set up event listeners for touch/mouse input
         */
        setupEventListeners() {
            if (!this.app.renderer || !this.app.renderer.domElement) {
                console.warn('🎮 Cannot setup listeners - renderer not available');
                return;
            }

            const element = this.app.renderer.domElement;
            
            // Bind event handlers
            this.boundHandlers = {
                pointerDown: this.handlePointerDown.bind(this),
                pointerMove: this.handlePointerMove.bind(this),
                pointerUp: this.handlePointerUp.bind(this),
                pointerCancel: this.handlePointerCancel.bind(this),
                wheel: this.handleWheel.bind(this),
                contextMenu: this.handleContextMenu.bind(this)
            };

            // Add event listeners with CAPTURE priority to intercept before other handlers
            element.addEventListener('pointerdown', this.boundHandlers.pointerDown, true);
            element.addEventListener('pointermove', this.boundHandlers.pointerMove, true);
            element.addEventListener('pointerup', this.boundHandlers.pointerUp, true);
            element.addEventListener('pointercancel', this.boundHandlers.pointerCancel, true);
            element.addEventListener('wheel', this.boundHandlers.wheel, { passive: false, capture: true });
            element.addEventListener('contextmenu', this.boundHandlers.contextMenu, true);

            console.log('🎮 Event listeners set up with capture priority');
        }

        /**
         * Remove event listeners
         */
        removeEventListeners() {
            if (!this.app.renderer || !this.app.renderer.domElement) {
                return;
            }

            const element = this.app.renderer.domElement;
            
            // Remove all event listeners with capture priority
            Object.entries(this.boundHandlers).forEach(([event, handler]) => {
                const eventName = event.replace(/([A-Z])/g, (match) => match.toLowerCase());
                element.removeEventListener(eventName, handler, true);
            });

            this.boundHandlers = {};
            console.log('🎮 Event listeners removed');
        }

        /**
         * Handle pointer down events
         */
        handlePointerDown(event) {
            if (!this.isActive) return;
            
            // Prevent default browser behavior
            event.preventDefault();
            
            // Cancel any existing timeouts to prevent conflicts
            this.cancelOtherSystemTimeouts();
            
            // Track pointer
            this.pointers.set(event.pointerId, {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                startX: event.clientX,
                startY: event.clientY,
                startTime: Date.now()
            });

            // Start movement processing
            this.updateMovementFromPointers();
            this.isMoving = true;
            
            console.log('🎮 Pointer down:', event.pointerId);
        }

        /**
         * Handle pointer move events
         */
        handlePointerMove(event) {
            if (!this.isActive || !this.isMoving) return;
            
            // Update pointer position
            if (this.pointers.has(event.pointerId)) {
                const pointer = this.pointers.get(event.pointerId);
                pointer.x = event.clientX;
                pointer.y = event.clientY;
                
                // Update movement
                this.updateMovementFromPointers();
            }
        }

        /**
         * Handle pointer up events
         */
        handlePointerUp(event) {
            if (!this.isActive) return;
            
            // Remove pointer from tracking
            this.pointers.delete(event.pointerId);
            
            // If no more pointers, stop movement
            if (this.pointers.size === 0) {
                this.clearMovementState();
                this.isMoving = false;
            } else {
                // Update movement with remaining pointers
                this.updateMovementFromPointers();
            }
            
            // Double-tap detection
            const currentTime = Date.now();
            const timeDiff = currentTime - this.lastTapTime;
            const currentPos = { x: event.clientX, y: event.clientY };
            const positionDiff = Math.sqrt(
                Math.pow(currentPos.x - this.lastTapPosition.x, 2) + 
                Math.pow(currentPos.y - this.lastTapPosition.y, 2)
            );
            
            if (timeDiff < this.doubleTapThreshold && positionDiff < this.tapPositionThreshold) {
                console.log('🎮 Double-tap detected in explore mode');
                
                // Cancel any pending single-tap timeout
                if (this.singleTapTimeout) {
                    clearTimeout(this.singleTapTimeout);
                    this.singleTapTimeout = null;
                }
                
                // CRITICAL: Prevent ALL default behaviors before handling
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                
                // CRITICAL: Cancel all conflicting timeouts BEFORE handling double-tap
                this.cancelOtherSystemTimeouts();
                
                const handled = this.handleDoubleTap(event);
                
                // CRITICAL: Force stop all further event processing if we handled it
                if (handled) {
                    console.log('🎮 ExploreControls: Successfully handled double-tap, blocking other handlers');
                    
                    // Additional aggressive prevention and timeout cancellation
                    this.cancelOtherSystemTimeouts();
                    
                    if (event.preventDefault) event.preventDefault();
                    if (event.stopPropagation) event.stopPropagation();
                    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                    
                    // Reset double-tap detection to prevent re-triggering
                    this.lastTapTime = 0;
                    this.lastTapPosition = { x: 0, y: 0 };
                    
                    return true; // Signal that event was fully handled
                }
                
                return false; // Allow other handlers if we didn't handle it
            } else {
                // Not a double-tap, start single-tap detection
                if (this.singleTapTimeout) {
                    clearTimeout(this.singleTapTimeout);
                }
                
                // Set timeout to detect single tap
                this.singleTapTimeout = setTimeout(() => {
                    console.log('🎮 Single-tap detected in explore mode');
                    this.handleSingleTap(event, currentPos);
                }, this.doubleTapThreshold);
            }
            
            this.lastTapTime = currentTime;
            this.lastTapPosition = currentPos;
            
            console.log('🎮 Pointer up:', event.pointerId);
        }

        /**
         * Handle pointer cancel events
         */
        handlePointerCancel(event) {
            this.handlePointerUp(event);
        }

        /**
         * Handle wheel events for forward/backward movement
         */
        handleWheel(event) {
            if (!this.isActive) return;
            
            event.preventDefault();
            
            // Use wheel for forward/backward movement
            const direction = event.deltaY > 0 ? -1 : 1; // Invert for natural feel
            this.movementVector.y = direction * 0.5;
            
            // Clear wheel movement after a short time
            clearTimeout(this.wheelTimeout);
            this.wheelTimeout = setTimeout(() => {
                this.movementVector.y = 0;
            }, 100);
        }

        /**
         * Prevent context menu in explore mode
         */
        handleContextMenu(event) {
            if (this.isActive) {
                event.preventDefault();
            }
        }

        /**
         * Update movement vector based on current pointer positions
         */
        updateMovementFromPointers() {
            if (!this.app.renderer) return;
            
            const rect = this.app.renderer.domElement.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            
            // Clear movement state
            this.movementVector = { x: 0, y: 0, rotation: 0 };
            
            // Process primary pointer (first touch)
            if (this.pointers.size > 0) {
                const primaryPointer = Array.from(this.pointers.values())[0];
                const x = primaryPointer.x - rect.left;
                const y = primaryPointer.y - rect.top;
                
                // Reduced logging - only log position processing occasionally
                if (this.logCounter % 120 === 0) {
                    console.log('🎮 Processing pointer position:', { x, y, width, height, pointerId: primaryPointer.id });
                }
                this.processMovementFromPosition(x, y, width, height);
                
                // Smart logging - only log movement vectors very occasionally
                if (this.movementVector.x !== 0 || this.movementVector.y !== 0 || this.movementVector.rotation !== 0) {
                    if (this.logCounter % 90 === 0) { // Reduced frequency from 30 to 90
                        console.log('🎮 Movement calculated:', this.movementVector);
                    }
                    this.logCounter++;
                }
            }
        }

        /**
         * Process movement based on pointer position relative to screen
         */
        processMovementFromPosition(x, y, width, height) {
            const centerX = width / 2;
            const centerY = height / 2;
            
            // Edge-based left/right movement (rotation)
            if (x < this.edgeThreshold) {
                this.movementVector.rotation = -1; // Turn left
            } else if (x > width - this.edgeThreshold) {
                this.movementVector.rotation = 1; // Turn right
            }
            
            // Top/bottom edge for pitch (looking up/down)
            // For now, we'll use this for forward/backward as alternative
            if (y < this.edgeThreshold) {
                this.movementVector.y = 1; // Move forward
            } else if (y > height - this.edgeThreshold) {
                this.movementVector.y = -1; // Move backward
            }
            
            // Center area for forward/backward movement with improved sensitivity
            const distanceFromCenterX = Math.abs(x - centerX);
            const distanceFromCenterY = Math.abs(y - centerY);
            
            if (distanceFromCenterX < this.centerDeadZone && distanceFromCenterY < this.centerDeadZone) {
                // In center area - use vertical position for forward/back
                const normalizedY = (y - centerY) / (height / 2);
                // Increased sensitivity by multiplying by 1.5
                this.movementVector.y = -normalizedY * 1.5; // Negative for forward up, positive for backward down
            }
        }

        /**
         * Clear all movement state
         */
        clearMovementState() {
            this.movementVector = { x: 0, y: 0, rotation: 0 };
            this.pointers.clear();
            
            if (this.wheelTimeout) {
                clearTimeout(this.wheelTimeout);
                this.wheelTimeout = null;
            }
        }

        /**
         * Get current movement vector for use by ExploreMode
         */
        getMovementVector() {
            const vector = {
                x: this.movementVector.x * this.movementSensitivity,
                y: this.movementVector.y * this.movementSensitivity,
                rotation: this.movementVector.rotation * this.movementSensitivity
            };
            
            // Smart logging - only log very occasionally to reduce spam
            if (vector.x !== 0 || vector.y !== 0 || vector.rotation !== 0) {
                if (this.logCounter % 120 === 0) { // Reduced frequency from 30 to 120
                    console.log('🎮 Movement vector:', vector, 'isMoving:', this.isMoving, 'pointers:', this.pointers.size);
                }
            }
            
            return vector;
        }

        /**
         * Set movement sensitivity
         */
        setSensitivity(sensitivity) {
            this.movementSensitivity = Math.max(0.1, Math.min(2.0, sensitivity));
            console.log('🎮 Movement sensitivity set to:', this.movementSensitivity);
        }

        /**
         * Set edge threshold for movement detection
         */
        setEdgeThreshold(threshold) {
            this.edgeThreshold = Math.max(20, Math.min(200, threshold));
            console.log('🎮 Edge threshold set to:', this.edgeThreshold);
        }

        /**
         * Get current control state
         */
        getState() {
            return {
                isActive: this.isActive,
                isMoving: this.isMoving,
                pointerCount: this.pointers.size,
                movementVector: { ...this.movementVector },
                edgeThreshold: this.edgeThreshold,
                sensitivity: this.movementSensitivity
            };
        }

        /**
         * Update method - call this in the main animation loop
         */
        update() {
            // Controls update any internal state here if needed
            // Movement vector is read by ExploreMode as needed
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.ExploreControls = ExploreControls;
    
    console.log("🎮 ExploreControls module loaded - ExploreControls class available globally");
})();
