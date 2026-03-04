// modules/interaction/interactionManager.js
// Dependencies: THREE (global), window.SharedStateManager, window.InputManager
// Exports: window.InteractionManager

(function() {
    'use strict';
    
    console.log("Loading InteractionManager module...");
    
    // ============================================================================
    // OBJECT INTERACTION MANAGEMENT - Selection, Long Press, Double Click
    // ============================================================================
    class InteractionManager {
        constructor(THREE, scene, camera, renderer, stateManager, cameraControls, worldTemplate, app) {
            this.THREE = THREE;
            this.scene = scene;
            this.camera = camera;
            this.renderer = renderer;
            this.stateManager = stateManager;
            this.cameraControls = cameraControls;
            this.worldTemplate = worldTemplate;
            this.app = app;
            this.cameraFocusManager = app.cameraFocusManager; // Get from app
            
            // MV3D: SMS Screen Camera Manager disabled (only needed for SMS functionality)
            // Initialize SMS Screen Camera Manager for optimal positioning
            this.smsScreenCameraManager = window.SmsScreenCameraManager 
                ? new window.SmsScreenCameraManager(THREE, camera, renderer)
                : null;
            
            // SMS Interaction Manager disabled - not needed for this app
            this.smsInteractionManager = null;
            // this.initializeSmsInteractionManager(THREE, scene, camera, renderer);
            
            // Interaction timing
            this.longPressDuration = 500;
            this.doubleTapThreshold = 300;
        }

        /**
         * Initialize SMS Interaction Manager with dependency checking
         * This handles the case where SmsInteractionManager might not be loaded yet
         */
        initializeSmsInteractionManager(THREE, scene, camera, renderer) {
            console.log('🔧 Attempting to initialize SMS Interaction Manager...');
            
            if (window.SmsInteractionManager) {
                console.log('✅ SmsInteractionManager class found, creating instance...');
                try {
                    this.smsInteractionManager = new window.SmsInteractionManager(THREE, scene, camera, renderer, this);
                    console.log('✅ SMS Interaction Manager initialized successfully');
                } catch (error) {
                    console.error('❌ Failed to create SMS Interaction Manager:', error);
                    this.smsInteractionManager = null;
                }
            } else {
                console.warn('⚠️ SmsInteractionManager class not yet available, will retry...');
                
                // Retry initialization with increasing delays
                let attempts = 0;
                const maxAttempts = 10;
                const retryInterval = 500; // Start with 500ms
                
                const retryInit = () => {
                    attempts++;
                    console.log(`🔄 SMS Interaction Manager retry attempt ${attempts}/${maxAttempts}...`);
                    
                    if (window.SmsInteractionManager) {
                        console.log('✅ SmsInteractionManager class now available!');
                        try {
                            this.smsInteractionManager = new window.SmsInteractionManager(THREE, scene, camera, renderer, this);
                            console.log('✅ SMS Interaction Manager initialized successfully on retry');
                        } catch (error) {
                            console.error('❌ Failed to create SMS Interaction Manager on retry:', error);
                            this.smsInteractionManager = null;
                        }
                    } else if (attempts < maxAttempts) {
                        setTimeout(retryInit, retryInterval * attempts); // Exponential backoff
                    } else {
                        console.error('❌ SMS Interaction Manager initialization failed after maximum retries');
                        this.smsInteractionManager = null;
                    }
                };
                
                setTimeout(retryInit, retryInterval);
            }
        }

        // Update world template reference when switching worlds
        setWorldTemplate(worldTemplate) {
            this.worldTemplate = worldTemplate;
            // Also update moveManager if it exists
            if (this.moveManager) {
                this.moveManager.setWorldTemplate(worldTemplate);
                console.log('InteractionManager: Updated moveManager world template to:', worldTemplate.getType());
            }
        }

        // Set MoveManager reference
        setMoveManager(moveManager) {
            this.moveManager = moveManager;
            console.log('InteractionManager: MoveManager reference set');
        }

        startObjectInteraction(object, event) {
            // CRITICAL: Check for undefined objects to prevent interaction errors
            if (!object) {
                console.warn('⚠️ startObjectInteraction called with undefined object, skipping...');
                return;
            }
            
            // Ensure object has userData
            if (!object.userData) {
                console.warn('⚠️ Object missing userData, skipping interaction:', object);
                return;
            }
            
            // FURNITURE FIX: If raycaster hit a furniture structure piece, interact with parent group instead
            if (object.userData.isFurnitureStructure && object.parent) {
                console.log('🪑 Furniture structure piece detected - using parent furniture group for interaction');
                object = object.parent; // Replace with parent group
            }
            
            console.log('startObjectInteraction for:', object.userData.fileName);
            
            // Special handling for contact objects
            if (object.userData.isContact) {
                console.log('📱 Contact object interaction detected:', object.userData.fileName);
            }
            
            // CRITICAL: Clear any existing long press timeout before setting new one
            // This prevents double-tap from triggering long-press menu
            if (this.stateManager.longPressTimeout) {
                console.log('🔄 Clearing previous long press timeout before setting new one');
                clearTimeout(this.stateManager.longPressTimeout);
                this.stateManager.longPressTimeout = null;
            }
            
            // Set up long press detection - always set this up for any object interaction
            this.stateManager.longPressTimeout = setTimeout(() => {
                // Only trigger long press if we're not already dragging or moving
                if (this.stateManager.isDragging || this.stateManager.movingObject) {
                    console.log('Long press cancelled: dragging or moving object');
                    return;
                }
                
                // CRITICAL: Check if double-tap was detected - if so, don't show long-press menu
                if (this.stateManager.isDoubleTab || !this.stateManager.longPressTimeout) {
                    console.log('Long press cancelled: double-tap detected or timeout already cleared');
                    return;
                }
                
                console.log(`Long press timeout triggered for: ${object.userData.fileName}`);
                this.stateManager.isLongPress = true;
                
                // Disable camera controls during long press menu
                if (this.cameraControls) {
                    this.cameraControls.enabled = false;
                    this.cameraControls.enableRotate = false;
                    console.log('Camera controls disabled for long press');
                }
                
                console.log(`Long press detected for: ${object.userData.fileName}`);
                this.handleLongPress(object);
            }, this.longPressDuration);
        }

        handleObjectInteractionStart(object, event) {
            // If object is selected for move, start moving immediately on pointer down
            if (this.stateManager.selectedObjectForMoveId === object.userData.id) {
                console.log('Starting move for selected object on touch/pointer down');
                
                // Check if this is a path marker - if so, move the parent pathGroup instead
                let objectToMove = object;
                if (object.userData && object.userData.isPathMarker && object.parent) {
                    console.log('🛤️ Path marker detected - moving parent pathGroup instead of individual marker');
                    objectToMove = object.parent; // Get the pathGroup
                }
                
                // FURNITURE FIX: Check if this is a furniture structure piece - if so, move the parent furniture group instead
                if (object.userData && object.userData.isFurnitureStructure && object.parent) {
                    console.log('🪑 Furniture structure piece detected - moving parent furniture group instead');
                    objectToMove = object.parent; // Get the furniture group
                }
                
                // Start moving object immediately using the app's moveManager
                if (this.app && this.app.moveManager) {
                    this.app.moveManager.startMovingObject(objectToMove);
                } else {
                    console.error('MoveManager not available through app reference');
                }
                
                return; // Skip long press detection for move-ready objects
            }
            
            this.startObjectInteraction(object, event);
        }

        handleObjectClick(object, event) {
            // --- SMS Integration Point ---
            // If the click is on the SMS screen, delegate to the SMS manager
            if (object && object.userData && object.userData.isSmsScreen) {
                if (window.smsIntegrationManager && typeof window.smsIntegrationManager.handleTap === 'function') {
                    console.log("📱 Click detected on SMS screen, delegating to smsIntegrationManager.");
                    window.smsIntegrationManager.handleTap(event);
                    return; // Stop further processing
                }
            }
            // --- End SMS Integration ---

            // Note: Contact info screen and media preview screen clicks are now handled
            // separately in handleContactInfoScreenTap and handleMediaPreviewScreenTap
            
            // DEBUG: Log all clicked objects with their userData
            if (object && object.userData) {
                console.log('🔍 CLICK DEBUG: Object clicked');
                console.log('  - id:', object.userData.id);
                console.log('  - fileName:', object.userData.fileName);
                console.log('  - extension:', object.userData.extension);
                console.log('  - type:', object.userData.type);
                console.log('  - subType:', object.userData.subType);
                console.log('  - isDemoContent:', object.userData.isDemoContent);
                console.log('  - url:', object.userData.url);
            }
            
            // MV3D: Check if object can have media preview - INCLUDES LINK OBJECTS
            if (this.canShowMediaPreview(object)) {
                console.log("🎵 Media object clicked, toggling preview");
                this.handleMediaPreview(object);
                return; // Stop further processing
            }
            // --- End MV3D Media Preview ---

            // ENHANCED SMS INTERACTION: Check if we're in SMS mode first
            if (this.smsInteractionManager && this.smsInteractionManager.isInSmsMode) {
                const handled = this.smsInteractionManager.handleSmsInteraction(event);
                if (handled) {
                    console.log('📱 SMS interaction handled by SmsInteractionManager');
                    return; // SMS interaction handled, don't process further
                }
            }
            
            // For move-ready objects, movement should have already started in onPointerDown
            if (this.stateManager.selectedObjectForMoveId === object.userData.id) {
                // Do nothing - movement already started in onPointerDown
                return;
            } 
            
            // DEBUG: Log complete userData structure for contact objects
            if (object.userData && (object.userData.subType === 'contact' || object.userData.type === 'contact' || 
                (object.userData.fileName && object.userData.fileName.includes('Diamond')))) {
                console.log('🔍 CONTACT CLICK DEBUG:');
                
                // Create safe copy of userData without circular references
                const safeUserData = { ...object.userData };
                delete safeUserData.contactObject; // Remove circular reference
                console.log('  Object userData:', JSON.stringify(safeUserData, null, 2));
                
                console.log('  Object type:', object.userData.type);
                console.log('  Object subType:', object.userData.subType);
                console.log('  Object contactId:', object.userData.contactId);
                console.log('  Object fileName:', object.userData.fileName);
                console.log('  Parent object:', object.parent);
                if (object.parent && object.parent.userData) {
                    const safeParentUserData = { ...object.parent.userData };
                    delete safeParentUserData.contactObject; // Remove circular reference
                    console.log('  Parent userData:', JSON.stringify(safeParentUserData, null, 2));
                }
            }
            
            // ENHANCED CONTACT DETECTION - Multiple approaches for robustness
            const contactInfo = this.detectContactObject(object);
            if (contactInfo.isContact) {
                console.log(`📱 Contact detected via ${contactInfo.method}: ${contactInfo.contactId} (${contactInfo.name})`);
                
                // RESTORED: Single-tap on contacts should open SMS (this is the expected behavior)
                // Double-tap will handle the 2-stage contact interaction (camera focus + menu)
                console.log('📱 Single-tap on contact - opening SMS interaction');
                
                // Dispatch contact interaction event with contact data
                this.dispatchContactInteraction(contactInfo.contactId, contactInfo.name, object);
                return;
            }
            
            // FIX: Don't auto-select objects on single tap - selection should only happen
            // when user explicitly requests move via Flutter menu (selectObjectForMoveCommand)
            // Auto-selecting was causing objects to stay highlighted after moves
            console.log('📍 Single tap on object - no action (selection only via move menu)');
        }

        /**
         * Dispatch contact interaction to open/close SMS screen
         * Uses the same ContactManager system as other interaction modes
         */
        dispatchContactInteraction(contactId, contactName, object) {
            console.log(`📱 Dispatching contact interaction for ${contactName} (${contactId})`);
            
            // Use the ContactManager to handle contact interaction (same as explore mode)
            if (window.app && window.app.contactManager && window.app.contactManager.handleContactInteraction) {
                console.log('📱 Using ContactManager.handleContactInteraction to toggle SMS screen');
                window.app.contactManager.handleContactInteraction(contactId, false);
            } else {
                console.error('📱 ContactManager not available for contact interaction');
                console.log('📱 Available data:', {
                    hasApp: !!window.app,
                    hasContactManager: !!(window.app && window.app.contactManager),
                    hasHandleContactInteraction: !!(window.app && window.app.contactManager && window.app.contactManager.handleContactInteraction)
                });
            }
        }

        handleSmsScreenTap(smsScreen, event) {
            console.log('💬 SMS screen single-tap detected');
            
            if (!smsScreen || !smsScreen.userData || !smsScreen.userData.contactId) {
                console.error('💬 Invalid SMS screen object or missing contactId');
                return;
            }
            
            const contactId = smsScreen.userData.contactId;
            
            // ENHANCED SMS INTERACTION: Check if we're in full SMS interaction mode
            if (this.smsInteractionManager && this.smsInteractionManager.isInSmsMode) {
                console.log('📱 SMS mode active - processing tap in full interaction mode');
                
                // We're in full SMS interaction mode, so use the SMS interaction manager to handle the tap
                if (event) {
                    const handled = this.smsInteractionManager.handleSmsInteraction(event);
                    if (handled) {
                        console.log('📱 SMS interaction handled by SmsInteractionManager');
                        return; // SMS interaction handled, don't process further
                    }
                }
                
                // If SMS manager didn't handle it, it means the tap was outside - exit SMS mode
                console.log('📱 Tap outside SMS screen while in full mode - exiting');
                if (this.smsInteractionManager) {
                    this.smsInteractionManager.exitSmsMode();
                }
                return;
            }
            
            console.log('💬 Not in SMS mode - toggling SMS screen');
            
            // RESTORE CAMERA POSITION: If we have a stored pre-teleport state, restore it before closing
            if (window.app && window.app.contactManager && 
                window.app.contactManager.preTeleportStates && 
                window.app.contactManager.preTeleportStates[contactId]) {
                
                const preTeleportState = window.app.contactManager.preTeleportStates[contactId];
                console.log('🎯 RESTORING pre-teleport camera position:', preTeleportState.position);
                
                // Restore camera position
                if (this.camera && isFinite(preTeleportState.position.x) && 
                    isFinite(preTeleportState.position.y) && isFinite(preTeleportState.position.z)) {
                    
                    this.camera.position.set(
                        preTeleportState.position.x, 
                        preTeleportState.position.y, 
                        preTeleportState.position.z
                    );
                    
                    // Restore camera controls target if available
                    if (this.cameraControls && this.cameraControls.target && preTeleportState.target) {
                        if (isFinite(preTeleportState.target.x) && 
                            isFinite(preTeleportState.target.y) && 
                            isFinite(preTeleportState.target.z)) {
                            
                            this.cameraControls.target.set(
                                preTeleportState.target.x,
                                preTeleportState.target.y,
                                preTeleportState.target.z
                            );
                        }
                    }
                    
                    // Update camera matrix
                    this.camera.updateMatrixWorld();
                    
                    console.log(`🎯 Camera position restored to: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
                    
                    // Re-enable camera controls now that position is restored
                    if (this.cameraControls) {
                        this.cameraControls.enabled = true;
                        this.cameraControls.enableRotate = true;
                        this.cameraControls.enablePan = true;
                        this.cameraControls.enableZoom = true;
                        console.log('🎯 Camera controls re-enabled after position restoration');
                    }
                    
                    // Clean up stored state
                    delete window.app.contactManager.preTeleportStates[contactId];
                    console.log('🎯 Pre-teleport state cleaned up');
                    
                    // RESTORE CONTACT OBJECT: Show contact again when SMS screen closes
                    this.showContactObjectAfterSmsView(contactId);
                }
            }
            
            // Single-tap should toggle the SMS screen (like contact objects)
            if (window.app && window.app.contactManager && window.app.contactManager.handleContactInteraction) {
                console.log('💬 Delegating to ContactManager.handleContactInteraction:', contactId);
                window.app.contactManager.handleContactInteraction(contactId);
            } else {
                console.warn('💬 ContactManager not available for SMS screen toggle');
            }
        }

        handleSmsScreenDoubleClick(smsScreen) {
            console.log('🎯 OPTIMIZED SMS TELEPORT: Using intelligent camera positioning');
            
            if (!smsScreen || !smsScreen.position || !this.camera) {
                console.warn('🎯 Cannot teleport: SMS screen or camera not available');
                return;
            }

            // VALIDATION: Check for invalid SMS position values
            const smsPosition = smsScreen.position.clone();
            if (!smsPosition || isNaN(smsPosition.x) || isNaN(smsPosition.y) || isNaN(smsPosition.z)) {
                console.error('🎯 Invalid SMS screen position detected, aborting teleport');
                return;
            }
            
            // STORE PRE-TELEPORT CAMERA STATE: Save current position BEFORE teleporting
            const contactId = smsScreen.userData.contactId;
            if (contactId && window.app && window.app.contactManager) {
                const preTeleportState = {
                    position: {
                        x: this.camera.position.x,
                        y: this.camera.position.y,
                        z: this.camera.position.z
                    },
                    target: this.cameraControls && this.cameraControls.target ? {
                        x: this.cameraControls.target.x,
                        y: this.cameraControls.target.y,
                        z: this.cameraControls.target.z
                    } : { x: 0, y: 0, z: 0 },
                    timestamp: Date.now()
                };
                
                // Store for restoration when SMS screen closes
                if (!window.app.contactManager.preTeleportStates) {
                    window.app.contactManager.preTeleportStates = {};
                }
                window.app.contactManager.preTeleportStates[contactId] = preTeleportState;
                console.log('🎯 Stored pre-teleport camera state for restoration:', preTeleportState);
            }

            // MV3D: SMS camera positioning disabled (only needed for SMS functionality)
            // OPTIMAL CAMERA POSITIONING: Use the new SMS camera manager
            if (!this.smsScreenCameraManager) {
                console.warn('🎵 MV3D: SMS camera manager not available (disabled for media focus)');
                return;
            }
            
            const optimalCameraData = this.smsScreenCameraManager.calculateOptimalCameraPosition(smsScreen);
            
            if (!optimalCameraData) {
                console.error('🎯 Failed to calculate optimal camera position, using fallback');
                // Fallback to old positioning logic
                this.handleSmsScreenDoubleClickFallback(smsScreen);
                return;
            }

            console.log(`🎯 Current camera position: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
            console.log(`🎯 SMS screen position: ${smsPosition.x.toFixed(2)}, ${smsPosition.y.toFixed(2)}, ${smsPosition.z.toFixed(2)}`);
            console.log(`🎯 Optimal camera position: ${optimalCameraData.position.x.toFixed(2)}, ${optimalCameraData.position.y.toFixed(2)}, ${optimalCameraData.position.z.toFixed(2)}`);
            console.log(`🎯 Optimal distance: ${optimalCameraData.distance.toFixed(2)} units for ${optimalCameraData.viewport.isLandscape ? 'landscape' : 'portrait'} mode`);
            
            // FORCE DISABLE any camera controls that might interfere
            if (this.cameraControls) {
                console.log('🎯 Disabling camera controls for optimal teleport');
                this.cameraControls.enabled = false;
                this.cameraControls.enableRotate = false;
                this.cameraControls.enablePan = false;
                this.cameraControls.enableZoom = false;
            }

            // APPLY OPTIMAL CAMERA POSITIONING: Use the specialized camera manager
            const positioningSuccess = this.smsScreenCameraManager.applyCameraPositioning(optimalCameraData);
            
            if (!positioningSuccess) {
                console.error('🎯 Failed to apply optimal camera positioning, using fallback');
                // Re-enable camera controls and use fallback
                if (this.cameraControls) {
                    this.cameraControls.enabled = true;
                    this.cameraControls.enableRotate = true;
                    this.cameraControls.enablePan = true;
                    this.cameraControls.enableZoom = true;
                }
                return;
            }

            // HIDE CONTACT OBJECT: Prevent contact from blocking SMS screen text
            this.hideContactObjectForSmsView(contactId);

            // UPDATE CAMERA CONTROLS: Sync controls with new position
            if (this.cameraControls) {
                try {
                    // Update camera controls internal state to prevent override (but skip update() call)
                    if (this.cameraControls.object && optimalCameraData.position) {
                        this.cameraControls.object.position.copy(optimalCameraData.position);
                        console.log(`🎯 Controls object position synced`);
                    }
                    
                    if (this.cameraControls.target && optimalCameraData.lookAt) {
                        this.cameraControls.target.copy(optimalCameraData.lookAt);
                        console.log(`🎯 Controls target synced`);
                    }
                    
                    // SKIP DANGEROUS OPERATIONS: Do not call controls.update() or saveState()
                    console.log('🎯 Skipping controls.update() and saveState() to prevent camera position corruption');
                    
                } catch (controlsError) {
                    console.error('🎯 Camera controls sync failed:', controlsError);
                }
            }
            
            console.log(`🎯 Final optimized camera position: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
            
            // PERSISTENT FOCUS: Camera controls stay disabled until SMS screen is closed
            console.log('🎯 Camera controls kept DISABLED - SMS screen focus will persist until manually closed');
            console.log('🎯 Use single-tap to close SMS screen and restore camera position');
            
            // Strong visual feedback to show the "jump" happened
            this.highlightObjectBriefly(smsScreen, 0x00ff00, 3000); // Extended to 3 seconds
            
            // ENTER SMS INTERACTION MODE: Enable enhanced SMS interactions
            if (this.smsInteractionManager) {
                this.smsInteractionManager.enterSmsMode(smsScreen, contactId);
                console.log('🎯 SMS interaction mode activated - tap ON screen to interact, OUTSIDE to close');
            }
            
            // SAFETY MECHANISM: Re-enable camera controls after timeout if something goes wrong
            setTimeout(() => {
                // CRITICAL: Only re-enable if we're no longer in SMS interaction mode
                if (this.cameraControls && !this.cameraControls.enabled) {
                    // Check if we're still in SMS interaction mode
                    if (this.smsInteractionManager && this.smsInteractionManager.isInSmsInteractionMode()) {
                        console.log('🎯 SAFETY: Still in SMS mode after 30 seconds - keeping camera controls disabled');
                        return; // Don't re-enable controls while still in SMS mode
                    }
                    
                    console.log('🎯 SAFETY: Re-enabling camera controls after 30 seconds');
                    this.cameraControls.enabled = true;
                    this.cameraControls.enableRotate = true;
                    this.cameraControls.enablePan = true;
                    this.cameraControls.enableZoom = true;
                    
                    // Also restore touch/mouse controls
                    if (this.cameraControls.mouseButtons) {
                        this.cameraControls.mouseButtons.left = 1;
                    }
                    if (this.cameraControls.touches) {
                        this.cameraControls.touches.one = 32;
                    }
                    console.log('🎯 Emergency camera controls restoration completed');
                }
            }, 30000); // 30 second safety timeout
            
            console.log('🎯 Optimized SMS screen teleport completed');
        }

        handleSmsScreenDoubleClickFallback(smsScreen) {
            console.log('🎯 FALLBACK SMS TELEPORT: Using basic positioning logic');
            
            if (!smsScreen || !smsScreen.position || !this.camera) {
                console.error('🎯 Fallback failed: SMS screen or camera not available');
                return;
            }

            const smsPosition = smsScreen.position.clone();
            
            // VALIDATION: Check for invalid SMS position values
            if (!smsPosition || isNaN(smsPosition.x) || isNaN(smsPosition.y) || isNaN(smsPosition.z)) {
                console.error('🎯 Invalid SMS screen position detected, aborting fallback teleport');
                return;
            }

            // SAFE POSITIONING: Use a more robust offset calculation
            let cameraOffset = new this.THREE.Vector3(0, 1, 3); // Default close viewing position
            
            // If SMS is very close to world origin, use a larger offset
            if (Math.abs(smsPosition.z) < 1) {
                cameraOffset = new this.THREE.Vector3(0, 2, 5); // Larger offset for edge cases
                console.log('🎯 Using larger camera offset for SMS near origin');
            }
            
            const newCameraPosition = smsPosition.clone().add(cameraOffset);
            
            // VALIDATION: Check calculated camera position
            if (!newCameraPosition || isNaN(newCameraPosition.x) || isNaN(newCameraPosition.y) || isNaN(newCameraPosition.z)) {
                console.error('🎯 Invalid camera position calculated, using emergency fallback');
                // Emergency fallback: position camera at a safe distance from SMS
                newCameraPosition.set(smsPosition.x, smsPosition.y + 2, smsPosition.z + 5);
            }
            
            console.log(`🎯 FALLBACK - Target camera position: ${newCameraPosition.x.toFixed(2)}, ${newCameraPosition.y.toFixed(2)}, ${newCameraPosition.z.toFixed(2)}`);
            
            // SAFE CAMERA POSITIONING: Apply basic positioning
            try {
                if (isFinite(newCameraPosition.x) && isFinite(newCameraPosition.y) && isFinite(newCameraPosition.z)) {
                    this.camera.position.set(newCameraPosition.x, newCameraPosition.y, newCameraPosition.z);
                    
                    if (isFinite(smsPosition.x) && isFinite(smsPosition.y) && isFinite(smsPosition.z)) {
                        this.camera.lookAt(smsPosition.x, smsPosition.y, smsPosition.z);
                    }
                    
                    this.camera.updateMatrixWorld();
                    console.log(`🎯 FALLBACK positioning completed: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
                }
            } catch (error) {
                console.error('🎯 Fallback positioning failed:', error);
            }
        }

        handleSmsScreenDoubleClickLegacy(smsScreen) {
            // This is the existing logic from handleObjectDoubleClick for SMS screens
            const contactId = smsScreen.userData.contactId;
            if (contactId) {
                // Try multiple Flutter communication channels for SMS opening
                let channelSuccess = false;
                
                // Method 1: Try OpenFileChannel with SMS mode
                if (window.OpenFileChannel) {
                    try {
                        const smsData = {
                            type: 'sms',
                            contactId: contactId,
                            action: 'open'
                        };
                        console.log('📱 Opening SMS app via OpenFileChannel:', smsData);
                        window.OpenFileChannel.postMessage(JSON.stringify(smsData));
                        channelSuccess = true;
                    } catch (error) {
                        console.error('📱 OpenFileChannel SMS failed:', error);
                    }
                }
                
                // Method 2: Try ContactActionChannel
                if (!channelSuccess && window.ContactActionChannel) {
                    try {
                        const smsData = {
                            action: 'openSMS',
                            contactId: contactId
                        };
                        console.log('📱 Opening SMS app via ContactActionChannel:', smsData);
                        window.ContactActionChannel.postMessage(JSON.stringify(smsData));
                        channelSuccess = true;
                    } catch (error) {
                        console.error('📱 ContactActionChannel SMS failed:', error);
                    }
                }
                
                // Method 3: Try SMS intent as fallback
                if (!channelSuccess) {
                    try {
                        console.log('📱 Opening SMS via sms: intent fallback');
                        const smsUrl = `sms:${contactId}`;
                        window.location.href = smsUrl;
                        channelSuccess = true;
                    } catch (error) {
                        console.error('📱 SMS intent failed:', error);
                    }
                }
                
                if (!channelSuccess) {
                    console.error('📱 All SMS opening methods failed');
                }
            }
        }

        handleObjectDoubleClick(object) {
            console.log('handleObjectDoubleClick called for object:', object?.userData?.fileName || object?.name || 'unknown object');
            
            // CRITICAL FIX: Clear any pending long press timeout when double-tap is detected
            // This prevents the long press menu from opening when user is double-tapping
            if (this.stateManager.longPressTimeout) {
                console.log('🔄 Double-tap detected - clearing long press timeout');
                clearTimeout(this.stateManager.longPressTimeout);
                this.stateManager.longPressTimeout = null;
                this.stateManager.isLongPress = false;
            }
            
            // Set double-tap flag to prevent any lingering timeouts from firing
            this.stateManager.isDoubleTap = true;
            setTimeout(() => {
                this.stateManager.isDoubleTap = false;
            }, 100);
            
            // DISPATCH CONTACT DOUBLE-TAP EVENT FOR SMS ALERT SYSTEM
            const contactId = this.extractContactId(object);
            if (contactId) {
                console.log('👆 Dispatching contact double-tap event for SMS alerts:', contactId);
                window.dispatchEvent(new CustomEvent('contact-double-tapped', {
                    detail: { 
                        contactId: contactId,
                        object: object,
                        timestamp: Date.now()
                    }
                }));
            }
            
            // SPECIAL HANDLING FOR SMS SCREENS AND CONTACTS
            // Check if this is an SMS screen double-click
            if (object && object.userData && (object.userData.type === 'smsScreen' || object.userData.isSmsScreen)) {
                console.log('💬 SMS screen double-clicked - opening SMS app');
                
                const smsContactId = object.userData.contactId;
                if (smsContactId) {
                    // DISPATCH SMS SCREEN DOUBLE-TAP EVENT FOR ALERT SYSTEM
                    window.dispatchEvent(new CustomEvent('sms-screen-tapped', {
                        detail: { 
                            contactId: smsContactId,
                            tapCount: 2,
                            interactive: true,
                            timestamp: Date.now()
                        }
                    }));
                    
                    // Try multiple Flutter communication channels for SMS opening
                    let channelSuccess = false;
                    
                    // Method 1: Try OpenFileChannel with SMS mode
                    if (window.OpenFileChannel) {
                        try {
                            const smsData = {
                                type: 'sms',
                                contactId: contactId,
                                action: 'open'
                            };
                            console.log('📱 Opening SMS app via OpenFileChannel:', smsData);
                            window.OpenFileChannel.postMessage(JSON.stringify(smsData));
                            channelSuccess = true;
                        } catch (error) {
                            console.error('📱 OpenFileChannel SMS failed:', error);
                        }
                    }
                    
                    // Method 2: Try ContactActionChannel
                    if (!channelSuccess && window.ContactActionChannel) {
                        try {
                            const smsData = {
                                action: 'openSMS',
                                contactId: contactId
                            };
                            console.log('📱 Opening SMS app via ContactActionChannel:', smsData);
                            window.ContactActionChannel.postMessage(JSON.stringify(smsData));
                            channelSuccess = true;
                        } catch (error) {
                            console.error('📱 ContactActionChannel SMS failed:', error);
                        }
                    }
                    
                    // Method 3: Try SMS intent as fallback
                    if (!channelSuccess) {
                        try {
                            console.log('📱 Opening SMS via sms: intent fallback');
                            const smsUrl = `sms:${contactId}`;
                            window.location.href = smsUrl;
                            channelSuccess = true;
                        } catch (error) {
                            console.error('📱 SMS intent failed:', error);
                        }
                    }
                    
                    if (!channelSuccess) {
                        console.warn('❌ No SMS channels available - SMS double-tap disabled');
                    }
                } else {
                    console.warn('💬 SMS screen missing contactId');
                }
                return;
            }
            
            // TWO-STAGE DOUBLE-CLICK INTERACTION FOR REGULAR FILES:
            // Stage 1: If camera is far from object → Focus on object (bring it close)
            // Stage 2: If camera is already close to object → Open the file
            // NOTE: Contact objects are handled by LinkInteractionManager unified system
            
            const distanceToObject = this.camera.position.distanceTo(object.position);
            const objectSize = this.calculateObjectSize(object);
            const closeDistance = Math.max(objectSize * 3.5, 12); // Slightly larger than focus distance
            
            console.log(`Distance to object: ${distanceToObject.toFixed(2)}, Close threshold: ${closeDistance.toFixed(2)}`);
            
            if (distanceToObject > closeDistance) {
                // STAGE 1: Camera is far - focus on object using proven method
                console.log('Stage 1: Focusing camera on distant object using proven camera controls');
                // Always use the proven cameraControls.setLookAt() method
                this.focusOnObject(object);
            } else {
                // STAGE 2: Camera is close - check for special poster handling
                if (object.userData && object.userData.type === 'poster' && window.GlobalPosterManager) {
                    console.log('🖼️ Poster close-range double-tap - opening URL via GlobalPosterManager');
                    try {
                        // Use GlobalPosterManager for poster handling
                        const posterManager = window.GlobalPosterManager.getInstance();
                        posterManager.handlePosterClick(object);
                    } catch (error) {
                        console.error('❌ Error handling poster interaction:', error);
                        // Fallback to regular file opening
                        this.openFile(object);
                    }
                } else {
                    // Regular file opening for non-poster objects
                    console.log('Stage 2: Camera is close, opening file');
                    this.openFile(object);
                }
            }
        }

        openFile(object) {
            console.log('Opening file for object:', object.userData.fileName);
            console.log('Object type:', object.userData.type);
            
            // Prevent furniture and paths from being opened as files
            if (object.userData.isFurniture || object.userData.type === 'furniture') {
                console.log('🪑 Furniture detected - skipping file open (use long-press for options)');
                return;
            }
            if (object.userData.isPath || object.userData.type === 'path') {
                console.log('🛤️ Path detected - skipping file open (use long-press for options)');
                return;
            }
            
            // Check if this is a contact object
            if (object.userData.isContact) {
                console.log('📱 Detected contact object, opening contact info...');
                
                // DISPATCH CONTACT TAP EVENT FOR SMS ALERT SYSTEM
                const contactId = this.extractContactId(object);
                if (contactId) {
                    console.log('👆 Dispatching contact tap event for SMS alerts:', contactId);
                    window.dispatchEvent(new CustomEvent('contact-tapped', {
                        detail: { 
                            contactId: contactId,
                            tapCount: 1,
                            object: object,
                            timestamp: Date.now()
                        }
                    }));
                }
                
                this.openContactInfo(object);
                return;
            }
            
            // Check if this is an app object
            if (object.userData.type === 'app') {
                console.log('Detected app object, launching app...');
                this.launchApp(object);
            } else {
                // Handle regular files
                console.log('Detected file object, opening file...');
                console.log('Checking OpenFileChannel availability:', !!window.OpenFileChannel);
                
                // Send open file request to Flutter
                if (window.OpenFileChannel) {
                    const messageData = {
                        id: object.userData.id,
                        name: object.userData.fileName
                    };
                    console.log('Sending OpenFileChannel message:', messageData);
                    window.OpenFileChannel.postMessage(JSON.stringify(messageData));
                    
                    // Brief highlight to show the file is being opened
                    this.highlightObjectBriefly(object, 0x00ff00); // Green highlight for file opening
                } else {
                    console.error('OpenFileChannel not available!');
                }
            }
        }

        launchApp(object) {
            console.log('Launching app:', object.userData.appName);
            console.log('Package name:', object.userData.packageName);
            
            // Check if this is a link object (has URL data)
            if (object.userData.appData && object.userData.appData.url) {
                console.log('Detected link object, opening URL:', object.userData.appData.url);
                this.openLinkUrl(object.userData.appData.url);
                
                // Brief highlight to show the link is being opened
                this.highlightObjectBriefly(object, 0x00ff00); // Green highlight for link opening
                return;
            }
            
            console.log('Checking AppLaunchHandler availability:', !!window.AppLaunchHandler);
            
            // Send app launch request to Flutter for regular apps
            if (window.AppLaunchHandler) {
                const messageData = {
                    packageName: object.userData.packageName,
                    appName: object.userData.appName
                };
                console.log('Sending AppLaunchHandler message:', messageData);
                window.AppLaunchHandler.postMessage(JSON.stringify(messageData));
                
                // Brief highlight to show the app is being launched
                this.highlightObjectBriefly(object, 0x00ff00); // Green highlight for app launching
            } else {
                console.error('AppLaunchHandler not available!');
            }
        }

        // Open URL in browser or appropriate app
        openLinkUrl(url) {
            console.log('Opening URL in browser/app:', url);
            
            // For mobile apps, try to send to Flutter first (in case there's a preferred app)
            if (window.UrlLaunchHandler) {
                console.log('Using UrlLaunchHandler to open URL');
                const messageData = { url: url };
                window.UrlLaunchHandler.postMessage(JSON.stringify(messageData));
            } else {
                // Fallback: open in browser directly
                console.log('Fallback: opening URL in browser window');
                window.open(url, '_blank');
            }
        }

        // Open contact info in phone's contacts app
        openContactInfo(object) {
            console.log('📱 Opening contact customization menu for:', object.userData.fileName);
            
            // Extract contact data from the object
            const contactName = object.userData.fileName ? object.userData.fileName.replace('.contact', '') : 'Unknown';
            const contactId = object.userData.fileId || object.userData.contactId;
            
            console.log('📱 Contact details:', {
                name: contactName,
                id: contactId,
                userData: object.userData
            });
            
            // NEW: Show contact options menu instead of directly opening customization
            if (window.ContactOptionsMenu) {
                try {
                    console.log('📱 Showing contact options menu for:', contactName);
                    window.ContactOptionsMenu.showOptionsMenu(contactId, {
                        object: object,
                        name: contactName,
                        id: contactId,
                        phone: object.userData.phoneNumber || object.userData.phone || 'Unknown'
                    });
                    return;
                } catch (error) {
                    console.error('📱 Contact options menu failed:', error);
                }
            }
            
            // FALLBACK: If options menu is not available, use existing customization menu
            if (window.ContactCustomizationManager) {
                try {
                    console.log('🎨 Fallback: Showing avatar customization menu for contact:', contactName);
                    window.ContactCustomizationManager.showCustomizationMenu(contactId, {
                        object: object,
                        name: contactName,
                        id: contactId
                    });
                    return;
                } catch (error) {
                    console.error('🎨 Avatar customization failed:', error);
                }
            }
            
            // FINAL FALLBACK: If no options or customization menu available, use original contact info
            console.log('📱 No contact options available, falling back to contact info');
            
            // Try multiple Flutter communication channels for opening contact info
            let channelSuccess = false;
            
            // Method 1: Try ContactActionChannel
            if (window.ContactActionChannel) {
                try {
                    const contactData = {
                        action: 'openContactInfo',
                        contactId: contactId,
                        contactName: contactName
                    };
                    console.log('📱 Opening contact info via ContactActionChannel:', contactData);
                    window.ContactActionChannel.postMessage(JSON.stringify(contactData));
                    channelSuccess = true;
                } catch (error) {
                    console.error('📱 ContactActionChannel contact info failed:', error);
                }
            }
            
            // Method 2: Try OpenFileChannel with contact mode
            if (!channelSuccess && window.OpenFileChannel) {
                try {
                    const contactData = {
                        type: 'contact',
                        id: contactId,
                        name: contactName,
                        action: 'open'
                    };
                    console.log('📱 Opening contact info via OpenFileChannel:', contactData);
                    window.OpenFileChannel.postMessage(JSON.stringify(contactData));
                    channelSuccess = true;
                } catch (error) {
                    console.error('📱 OpenFileChannel contact info failed:', error);
                }
            }
            
            // Method 3: Try contact intent as fallback
            if (!channelSuccess) {
                try {
                    console.log('📱 Opening contact via contact: intent fallback');
                    const contactUrl = `content://contacts/people/${contactId}`;
                    window.location.href = contactUrl;
                    channelSuccess = true;
                } catch (error) {
                    console.error('📱 Contact intent failed:', error);
                }
            }
            
            if (channelSuccess) {
                // Brief highlight to show the contact info is being opened
                this.highlightObjectBriefly(object, 0x4a90e2); // Blue highlight for contact opening
            } else {
                console.warn('❌ No contact channels available - contact info opening disabled');
            }
        }

        // Focus camera on a specific object for close-up viewing
        focusOnObject(object) {
            // Use this.cameraControls or fallback to global window.app.cameraControls
            const cameraControls = this.cameraControls || (window.app && window.app.cameraControls);
            
            if (!cameraControls || !object) {
                console.error('Cannot focus on object: camera controls or object not available');
                return;
            }

            console.log(`Focusing camera on object: ${object.userData.fileName}`);

            // Calculate optimal viewing position
            const objectPosition = object.position.clone();
            if (!objectPosition || objectPosition.x === undefined) {
                console.error('Invalid object position:', objectPosition);
                return;
            }
            
            const objectSize = this.calculateObjectSize(object);
            if (!objectSize || objectSize <= 0) {
                console.error('Invalid object size:', objectSize);
                return;
            }
            
            // Determine optimal distance based on object size and screen orientation
            let optimalDistance = Math.max(objectSize * 2.5, 8); // Base distance: at least 8 units away
            
            // Adjust for landscape mode - get closer for better viewing
            // Add null checks for window dimensions
            const windowWidth = window.innerWidth || 800;
            const windowHeight = window.innerHeight || 600;
            const aspectRatio = windowWidth / windowHeight;
            const isLandscape = aspectRatio > 1.2; // Consider landscape if width > 1.2x height
            
            let distanceMultiplier = 1.0;
            if (isLandscape) {
                distanceMultiplier = 0.5; // Get 2x closer in landscape
            } else {
                distanceMultiplier = 0.7; // Get moderately closer in portrait
            }
            
            const finalDistance = optimalDistance * distanceMultiplier;
            
            // Safe toFixed() calls with null checks
            const aspectRatioStr = (aspectRatio && !isNaN(aspectRatio) && isFinite(aspectRatio)) ? aspectRatio.toFixed(2) : 'unknown';
            const finalDistanceStr = (finalDistance && !isNaN(finalDistance) && isFinite(finalDistance)) ? finalDistance.toFixed(2) : 'unknown';
            
            console.log(`${isLandscape ? 'Landscape' : 'Portrait'} mode detected (aspect: ${aspectRatioStr}), final distance: ${finalDistanceStr}`);
            
            // Use the final distance for camera positioning
            optimalDistance = finalDistance;
            
            // Calculate camera position: offset from object towards current camera direction
            const currentCameraPos = this.camera.position.clone();
            const directionToCamera = currentCameraPos.sub(objectPosition.clone()).normalize();
            
            // If camera is too close to the object plane, use a default viewing angle
            if (directionToCamera.length() < 0.1) {
                directionToCamera.set(1, 0.5, 1).normalize(); // Default angle
            }
            
            const newCameraPosition = objectPosition.clone().add(
                directionToCamera.multiplyScalar(optimalDistance)
            );

            // Smoothly move camera to focus on the object
            // Using setLookAt for smooth transition
            const animationDuration = 1000; // 1 second
            
            // Safe console logging with null checks
            const currentPos = this.camera.position;
            const currentPosStr = (currentPos && currentPos.x !== undefined && currentPos.y !== undefined && currentPos.z !== undefined) ? 
                `${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)}` : 
                'unknown';
            
            const newPosStr = (newCameraPosition && newCameraPosition.x !== undefined && newCameraPosition.y !== undefined && newCameraPosition.z !== undefined) ? 
                `${newCameraPosition.x.toFixed(2)}, ${newCameraPosition.y.toFixed(2)}, ${newCameraPosition.z.toFixed(2)}` : 
                'unknown';
            
            console.log(`Moving camera from ${currentPosStr}`);
            console.log(`To position ${newPosStr}`);
            
            if (objectPosition && objectPosition.x !== undefined && objectPosition.y !== undefined && objectPosition.z !== undefined) {
                console.log(`Looking at object at ${objectPosition.x.toFixed(2)}, ${objectPosition.y.toFixed(2)}, ${objectPosition.z.toFixed(2)}`);
            } else {
                console.log(`Warning: objectPosition is invalid or has null components:`, objectPosition);
            }

            // Animate camera to new position
            if (objectPosition && objectPosition.x !== undefined && newCameraPosition && newCameraPosition.x !== undefined) {
                cameraControls.setLookAt(
                    newCameraPosition.x, newCameraPosition.y, newCameraPosition.z, // Camera position
                    objectPosition.x, objectPosition.y, objectPosition.z, // Look at target
                    true // Enable smooth transition
                );
            } else {
                console.error('Cannot animate camera: invalid objectPosition');
                return;
            }

            // Optionally highlight the object briefly to show it's focused
            this.highlightObjectBriefly(object);
        }

        // Calculate the bounding size of an object
        calculateObjectSize(object) {
            if (!object) {
                console.error('Cannot calculate object size: object is null');
                return 1; // Default size
            }
            
            // Get object dimensions from geometry
            if (object.geometry && object.geometry.parameters) {
                const params = object.geometry.parameters;
                const width = params.width || (params.radius ? params.radius * 2 : 1);
                const height = params.height || (params.radius ? params.radius * 2 : 1);
                const depth = params.depth || (params.radius ? params.radius * 2 : 1);
                
                // Return the largest dimension, ensure it's a valid number
                const maxSize = Math.max(width, height, depth);
                return (maxSize && !isNaN(maxSize) && isFinite(maxSize)) ? maxSize : 1;
            }
            
            // Fallback: use bounding box
            try {
                const bbox = new this.THREE.Box3().setFromObject(object);
                const size = bbox.getSize(new this.THREE.Vector3());
                const maxSize = Math.max(size.x, size.y, size.z);
                return (maxSize && !isNaN(maxSize) && isFinite(maxSize)) ? maxSize : 1;
            } catch (error) {
                console.error('Error calculating object size:', error);
                return 1; // Default size
            }
        }

        // Briefly highlight an object to show it's being focused on
        // ULTRA-SAFE APPROACH - Comprehensive error prevention for mobile
        highlightObjectBriefly(object, color = 0x0066ff, duration = 800) {
            try {
                // Ultra-strict validation
                if (!object) {
                    console.warn('highlightObjectBriefly: object is null/undefined');
                    return;
                }
                
                if (!object.material) {
                    console.warn('highlightObjectBriefly: object has no material');
                    return;
                }

                console.log('🔆 Applying ultra-safe highlight to object');

                // Store original material safely - only if not already stored
                if (!object.userData.originalMaterial) {
                    object.userData.originalMaterial = object.material;
                }

                // Ultra-safe material operations with comprehensive validation
                if (object.material.clone && typeof object.material.clone === 'function') {
                    try {
                        // Apply highlight with cloned material
                        if (Array.isArray(object.material)) {
                            const highlightMaterials = object.material.map(mat => {
                                if (mat && mat.clone && typeof mat.clone === 'function') {
                                    try {
                                        const highlightMat = mat.clone();
                                        if (highlightMat && highlightMat.emissive && highlightMat.emissive.setHex && typeof highlightMat.emissive.setHex === 'function') {
                                            highlightMat.emissive.setHex(color);
                                        }
                                        return highlightMat;
                                    } catch (cloneError) {
                                        console.warn('Individual material clone failed:', cloneError.message);
                                        return mat; // Return original on failure
                                    }
                                }
                                return mat;
                            });
                            object.material = highlightMaterials;
                        } else {
                            const highlightMaterial = object.material.clone();
                            if (highlightMaterial && highlightMaterial.emissive && highlightMaterial.emissive.setHex && typeof highlightMaterial.emissive.setHex === 'function') {
                                highlightMaterial.emissive.setHex(color);
                            }
                            object.material = highlightMaterial;
                        }

                        // Ultra-safe restore after duration
                        setTimeout(() => {
                            try {
                                if (object && object.userData && object.userData.originalMaterial) {
                                    object.material = object.userData.originalMaterial;
                                    console.log('🔆 Highlight removed, material restored');
                                }
                            } catch (restoreError) {
                                console.warn('Material restore failed:', restoreError.message);
                            }
                        }, duration);

                    } catch (error) {
                        console.warn('Material cloning failed, using fallback highlight:', error.message);
                        this.fallbackHighlight(object, color, duration);
                    }
                } else {
                    // Fallback for materials without clone method
                    console.warn('Material lacks clone method, using fallback');
                    this.fallbackHighlight(object, color, duration);
                }
            } catch (outerError) {
                console.error('highlightObjectBriefly failed completely:', outerError.message);
                // Complete fallback - just log and continue
            }
        }

        // Ultra-safe fallback highlighting method for problematic materials
        fallbackHighlight(object, color, duration) {
            try {
                if (!object) {
                    console.warn('fallbackHighlight: object is null/undefined');
                    return;
                }
                
                if (!object.material) {
                    console.warn('fallbackHighlight: object has no material');
                    return;
                }
                
                if (object.material.color && object.material.color.setHex && typeof object.material.color.setHex === 'function') {
                    try {
                        const originalColor = object.material.color.getHex();
                        object.material.color.setHex(color);

                        setTimeout(() => {
                            try {
                                if (object && object.material && object.material.color && object.material.color.setHex && typeof object.material.color.setHex === 'function') {
                                    object.material.color.setHex(originalColor);
                                }
                            } catch (restoreError) {
                                console.warn('Fallback highlight restore failed:', restoreError.message);
                            }
                        }, duration);
                    } catch (colorError) {
                        console.warn('Color manipulation failed in fallback:', colorError.message);
                    }
                } else {
                    console.warn('Cannot apply fallback highlight: material lacks proper color.setHex method');
                }
            } catch (error) {
                console.error('fallbackHighlight failed completely:', error.message);
            }
        }

        handleLongPress(object) {
            // CRITICAL: Check for undefined objects
            if (!object) {
                console.warn('⚠️ handleLongPress called with undefined object, skipping...');
                return;
            }
            
            // Ensure object has userData
            if (!object.userData) {
                console.warn('⚠️ Object missing userData in handleLongPress:', object);
                return;
            }
            
            console.log('handleLongPress called for object:', object.userData.fileName);
            
            // Check for furniture long press - show move/delete menu
            if (object.userData && (object.userData.isFurniture || object.userData.type === 'furniture')) {
                console.log('🪑 Furniture long press - showing move/delete menu:', object.userData.furnitureId || object.name);
                // Continue to show standard menu via ObjectActionChannel
            }
            
            // Check for poster long press - show URL input menu
            if (object.userData && object.userData.type === 'poster' && window.GlobalPosterManager) {
                console.log('🖼️ Poster long press - opening URL input menu via GlobalPosterManager');
                try {
                    // Use GlobalPosterManager for poster handling
                    const posterManager = window.GlobalPosterManager.getInstance();
                    const posterPosition = posterManager.generatePosterPosition(object);
                    const currentURL = posterManager.posterData.get(posterPosition) || '';
                    posterManager.showURLInputDialog(posterPosition, currentURL);
                    return; // Exit early for poster handling
                } catch (error) {
                    console.error('❌ Error handling poster long press:', error);
                    // Continue to normal long press handling as fallback
                }
            }
            
            // Contact objects should show the normal move/delete menu like other objects
            // Single tap handles SMS, long press handles move/delete
            if (object.userData.isContact) {
                console.log('📱 Contact long press - showing move/delete menu:', object.userData.fileName);
            }
            
            console.log('Checking ObjectActionChannel availability:', !!window.ObjectActionChannel);
            
            // Show context menu for all objects (including contacts, paths, furniture)
            if (window.ObjectActionChannel) {
                // Determine object name based on type
                let objectName = 'Unknown Object';
                let objectId = object.userData.id;
                
                if (object.userData.isFurniture || object.userData.type === 'furniture') {
                    // For furniture, use furniture name and ID
                    objectName = object.userData.furnitureName || object.name || 'Furniture';
                    objectId = object.userData.furnitureId || object.userData.id;
                } else if (object.userData.name) {
                    // For paths and other named objects
                    objectName = object.userData.name;
                } else {
                    // For file objects and contacts
                    objectName = object.userData.fileName || 'Unknown Object';
                }
                
                const messageData = {
                    id: objectId,
                    name: objectName,
                    type: object.userData.type || (object.userData.isFurniture ? 'furniture' : undefined)
                };
                console.log('Sending ObjectActionChannel message:', messageData);
                window.ObjectActionChannel.postMessage(JSON.stringify(messageData));
            } else {
                console.log('🌐 ObjectActionChannel not available - using comprehensive browser menu');
                // Use comprehensive browser-based context menu instead
                if (window.app && window.app.browserMenuHandler) {
                    window.app.browserMenuHandler.showContextMenu(object);
                } else {
                    console.error('BrowserMenuHandler not available!');
                }
            }
        }

        handleBackgroundClick() {
            // ENHANCED SMS INTERACTION: Check if we're in SMS mode and should exit
            if (this.smsInteractionManager && this.smsInteractionManager.isInSmsInteractionMode()) {
                console.log('📱 Background click detected while in SMS mode - exiting SMS interaction');
                this.smsInteractionManager.exitSmsMode();
                return; // SMS mode handled the background click
            }
            
            // EMERGENCY CAMERA RECOVERY: If camera controls are disabled for any reason, re-enable them
            if (this.cameraControls && !this.cameraControls.enabled) {
                console.log('🚨 EMERGENCY: Re-enabling disabled camera controls on background click');
                this.cameraControls.enabled = true;
                this.cameraControls.enableRotate = true;
                this.cameraControls.enablePan = true;
                this.cameraControls.enableZoom = true;
                
                // Also restore touch/mouse controls
                if (this.cameraControls.mouseButtons) {
                    this.cameraControls.mouseButtons.left = 1; // Re-enable left mouse rotation
                }
                if (this.cameraControls.touches) {
                    this.cameraControls.touches.one = 32; // Re-enable single touch rotation
                }
                console.log('🚨 EMERGENCY: Camera controls fully restored');
            }
            
            // EMERGENCY CONTACT RECOVERY: If any contacts are hidden, make them visible again
            if (window.app && window.app.contactManager && window.app.contactManager.contacts) {
                let hiddenContactsFound = false;
                window.app.contactManager.contacts.forEach((contactObject, contactId) => {
                    if (contactObject && contactObject.mesh && !contactObject.mesh.visible) {
                        console.log(`🚨 EMERGENCY: Re-showing hidden contact: ${contactId}`);
                        contactObject.mesh.visible = true;
                        hiddenContactsFound = true;
                    }
                });
                if (hiddenContactsFound) {
                    console.log('🚨 EMERGENCY: Hidden contacts have been restored');
                }
            }
            
            // Clear move-ready state when clicking away
            if (this.stateManager.selectedObjectForMoveId) {
                console.log('Cancelled move mode by clicking away');
            }
            
            // RESTORE CAMERA POSITION: If any SMS screens are open and we have stored states, restore them
            if (window.app && window.app.contactManager && window.app.contactManager.preTeleportStates) {
                const preTeleportStates = window.app.contactManager.preTeleportStates;
                const contactIds = Object.keys(preTeleportStates);
                
                if (contactIds.length > 0) {
                    console.log('🎯 Background click detected with open SMS screen(s), restoring camera position');
                    
                    // Use the most recent teleport state for restoration
                    let mostRecentState = null;
                    let mostRecentContactId = null;
                    let mostRecentTimestamp = 0;
                    
                    contactIds.forEach(contactId => {
                        const state = preTeleportStates[contactId];
                        if (state.timestamp > mostRecentTimestamp) {
                            mostRecentTimestamp = state.timestamp;
                            mostRecentState = state;
                            mostRecentContactId = contactId;
                        }
                    });
                    
                    if (mostRecentState && this.camera) {
                        console.log('🎯 RESTORING pre-teleport camera position from background click:', mostRecentState.position);
                        
                        // Restore camera position
                        if (isFinite(mostRecentState.position.x) && 
                            isFinite(mostRecentState.position.y) && 
                            isFinite(mostRecentState.position.z)) {
                            
                            this.camera.position.set(
                                mostRecentState.position.x, 
                                mostRecentState.position.y, 
                                mostRecentState.position.z
                            );
                            
                            // Restore camera controls target if available
                            if (this.cameraControls && this.cameraControls.target && mostRecentState.target) {
                                if (isFinite(mostRecentState.target.x) && 
                                    isFinite(mostRecentState.target.y) && 
                                    isFinite(mostRecentState.target.z)) {
                                    
                                    this.cameraControls.target.set(
                                        mostRecentState.target.x,
                                        mostRecentState.target.y,
                                        mostRecentState.target.z
                                    );
                                }
                            }
                            
                            // Update camera matrix
                            this.camera.updateMatrixWorld();
                            
                            console.log(`🎯 Camera position restored to: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
                            
                            // Re-enable camera controls now that position is restored
                            if (this.cameraControls) {
                                this.cameraControls.enabled = true;
                                this.cameraControls.enableRotate = true;
                                this.cameraControls.enablePan = true;
                                this.cameraControls.enableZoom = true;
                                console.log('🎯 Camera controls re-enabled after background click restoration');
                            }
                            
                            // Clear all stored states since we're returning to normal view
                            window.app.contactManager.preTeleportStates = {};
                            console.log('🎯 All pre-teleport states cleaned up after background click');
                        }
                    }
                }
            }
            
            this.deselectObject();
        }

        handleLongPressEnd() {
            // Re-enable camera controls after long press menu interaction
            if (this.cameraControls && !this.stateManager.movingObject) {
                this.cameraControls.enabled = true;
                this.cameraControls.enableRotate = true;
                console.log('Camera controls re-enabled after long press');
            }
        }

        selectObject(object) {
            try {
                // PATH FIX: Prevent immediate re-selection after move (cooldown period)
                if (this.stateManager.lastMovedObjectId && 
                    this.stateManager.lastMoveEndTime &&
                    object.userData && object.userData.id === this.stateManager.lastMovedObjectId) {
                    const timeSinceMove = Date.now() - this.stateManager.lastMoveEndTime;
                    if (timeSinceMove < 1000) { // 1000ms cooldown to prevent re-selection
                        console.log(`🛤️ Ignoring selection - object was just moved ${timeSinceMove}ms ago`);
                        return;
                    }
                }
                
                this.deselectObject(); // Clear previous selection safely
                
                if (!object) {
                    console.warn('selectObject: object is null/undefined');
                    return;
                }
                
                this.stateManager.selectedObject = object;
                
                // Ultra-safe material cloning with comprehensive validation
                if (object.material) {
                    try {
                        // Ensure originalMaterial storage exists
                        if (!this.stateManager.originalMaterial) {
                            this.stateManager.originalMaterial = {};
                        }
                        
                        if (object.material.clone && typeof object.material.clone === 'function') {
                            this.stateManager.originalMaterial[object.uuid] = object.material.clone();
                            
                            // Apply selection highlight safely
                            object.material = object.material.clone();
                            if (object.material.emissive && object.material.emissive.setHex && typeof object.material.emissive.setHex === 'function') {
                                object.material.emissive.setHex(0x444444);
                            } else {
                                console.warn('Selected material lacks emissive.setHex method');
                            }
                        } else {
                            console.warn('Object material lacks clone method, storing reference');
                            this.stateManager.originalMaterial[object.uuid] = object.material;
                        }
                    } catch (materialError) {
                        console.warn('Material handling failed in selectObject:', materialError.message);
                        // Store reference as fallback
                        this.stateManager.originalMaterial[object.uuid] = object.material;
                    }
                } else {
                    console.warn('Object has no material to select');
                }
                
                console.log(`Selected object: ${object.userData ? object.userData.fileName : 'unknown'}`);
                
            } catch (error) {
                console.error('selectObject failed:', error.message);
            }
        }

        deselectObject() {
            try {
                if (this.stateManager && this.stateManager.selectedObject) {
                    const object = this.stateManager.selectedObject;
                    
                    // Check if this is a path group
                    const isPathGroup = object.userData && object.userData.isPath;
                    
                    if (isPathGroup) {
                        // Path Group: Restore child marker materials
                        console.log('🛤️ Restoring path marker materials after move');
                        object.traverse((child) => {
                            if (child.isMesh && this.stateManager.originalMaterial && this.stateManager.originalMaterial[child.uuid]) {
                                try {
                                    child.material = this.stateManager.originalMaterial[child.uuid];
                                    delete this.stateManager.originalMaterial[child.uuid];
                                } catch (materialError) {
                                    console.warn('Path marker material restoration failed:', materialError.message);
                                }
                            }
                        });
                    } else {
                        // Regular object: Ultra-safe material restoration
                        if (this.stateManager.originalMaterial && this.stateManager.originalMaterial[object.uuid]) {
                            try {
                                object.material = this.stateManager.originalMaterial[object.uuid];
                                delete this.stateManager.originalMaterial[object.uuid];
                                console.log('Material restored successfully');
                            } catch (materialError) {
                                console.warn('Material restoration failed:', materialError.message);
                            }
                        }
                        
                        // Safely remove wireframe if it exists
                        try {
                            if (object.children && Array.isArray(object.children)) {
                                const wireframe = object.children.find(child => child.userData && child.userData.isWireframe);
                                if (wireframe) {
                                    wireframe.visible = false;
                                }
                            }
                        } catch (wireframeError) {
                            console.warn('Wireframe removal failed:', wireframeError.message);
                        }
                    }
                }
                
                // Safe state clearing
                if (this.stateManager && this.stateManager.clearSelection) {
                    this.stateManager.clearSelection();
                }

                // Ultra-safe camera controls re-enabling
                try {
                    if (this.cameraControls) {
                        this.cameraControls.enabled = true;
                        this.cameraControls.enableRotate = true;
                        
                        // Safely restore mouse and touch controls for rotation
                        if (this.cameraControls.mouseButtons) {
                            this.cameraControls.mouseButtons.left = 1; // Re-enable left mouse rotation
                        }
                        if (this.cameraControls.touches) {
                            this.cameraControls.touches.one = 1; // Re-enable single touch rotation
                        }
                        console.log('Camera controls re-enabled after deselection');
                    }
                } catch (cameraError) {
                    console.warn('Camera controls re-enabling failed:', cameraError.message);
                }
                
            } catch (error) {
                console.error('deselectObject failed:', error.message);
                // Emergency fallback - just clear selection state
                try {
                    if (this.stateManager && this.stateManager.clearSelection) {
                        this.stateManager.clearSelection();
                    }
                } catch (fallbackError) {
                    console.error('Emergency fallback failed:', fallbackError.message);
                }
            }
        }

        selectObjectForMove(objectId) {
            if (this.stateManager.isTransitioning) return;
            
            const object = this.stateManager.fileObjects.find(obj => obj.userData.id === objectId);
            if (object) {
                this.stateManager.startTransition();
                
                // Clear any existing selection first
                this.deselectObject();

                // Disable camera rotation as soon as object is selected for move
                // This makes it easier to position the object without camera interference
                if (this.cameraControls) {
                    // For camera-controls library, disable rotation completely
                    this.cameraControls.enableRotate = false;
                    // Also disable rotation via mouse and touch
                    if (this.cameraControls.mouseButtons) {
                        this.cameraControls.mouseButtons.left = 0; // Disable left mouse rotation
                    }
                    if (this.cameraControls.touches) {
                        this.cameraControls.touches.one = 0; // Disable single touch rotation
                    }
                    console.log('Camera rotation disabled for move selection');
                    console.log('Camera controls state after move selection - enabled:', this.cameraControls.enabled, 'enableRotate:', this.cameraControls.enableRotate);
                }

                // Set the object as selected for move
                this.stateManager.selectedObjectForMoveId = objectId;
                this.stateManager.selectedObject = object;
                
                // Check if this is a group without material (path or furniture)
                const isPathGroup = object.userData && object.userData.isPath && !object.material;
                const isFurnitureGroup = object.userData && object.userData.isFurniture && !object.material;
                const isGroupWithoutMaterial = isPathGroup || isFurnitureGroup;
                
                // Store original material (handle both single material and material arrays)
                // Skip for path groups and furniture groups which don't have materials (materials are on children)
                if (!isGroupWithoutMaterial) {
                    let originalMaterial;
                    if (Array.isArray(object.material)) {
                        // Clone each material in the array
                        originalMaterial = object.material.map(mat => mat.clone());
                    } else if (object.material) {
                        // Clone single material
                        originalMaterial = object.material.clone();
                    }
                    if (originalMaterial) {
                        this.stateManager.originalMaterial[object.uuid] = originalMaterial;
                    }
                }
                
                // Apply white material with black wireframe border for move mode
                // For path/furniture groups, highlight children instead
                if (isGroupWithoutMaterial) {
                    // Path/Furniture Group: Highlight child meshes with white glow
                    const groupType = isPathGroup ? 'path' : 'furniture';
                    console.log(`🛤️ Highlighting ${groupType} children for move selection`);
                    object.traverse((child) => {
                        if (child.isMesh && child.material && !child.userData.isWireframe) {
                            // Skip materials that can't be cloned (e.g., slot markers)
                            if (typeof child.material.clone !== 'function') {
                                return;
                            }
                            // Store original material for restoration
                            if (!this.stateManager.originalMaterial[child.uuid]) {
                                this.stateManager.originalMaterial[child.uuid] = child.material.clone();
                            }
                            // Apply white material with emissive glow
                            const highlightMaterial = child.material.clone();
                            highlightMaterial.color.setHex(0xffffff);
                            highlightMaterial.emissive.setHex(0x444444); // Slight glow
                            child.material = highlightMaterial;
                        }
                    });
                } else {
                    // Regular object: Apply white material with wireframe
                    let moveMaterial;
                    if (Array.isArray(object.material)) {
                        // Use the first material as base for move material
                        moveMaterial = object.material[0].clone();
                    } else {
                        moveMaterial = object.material.clone();
                    }
                    moveMaterial.color.setHex(0xffffff); // White color
                    moveMaterial.emissive.setHex(0x000000); // No emission
                    
                    // Create wireframe material for the border
                    const wireframeMaterial = new this.THREE.MeshBasicMaterial({
                        color: 0x000000,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.8
                    });
                    
                    // If object doesn't already have a wireframe child, add one
                    let wireframe = object.children.find(child => child.userData.isWireframe);
                    if (!wireframe) {
                        wireframe = new this.THREE.Mesh(object.geometry, wireframeMaterial);
                        wireframe.userData.isWireframe = true;
                        wireframe.scale.copy(object.scale);
                        wireframe.scale.multiplyScalar(1.01); // Slightly larger to show border
                        object.add(wireframe);
                    } else {
                        wireframe.material = wireframeMaterial;
                        wireframe.visible = true;
                    }
                
                    object.material = moveMaterial;
                }
                
                console.log(`Object selected for move with white highlight (ready for touch): ${objectId}`);
            }
        }

        selectObjectForVerticalMove(objectId) {
            if (this.stateManager.isTransitioning) return;
            
            const object = this.stateManager.fileObjects.find(obj => obj.userData.id === objectId);
            if (object) {
                this.stateManager.startTransition();
                
                // Clear any existing selection first
                this.deselectObject();

                // Disable camera rotation for vertical move mode
                if (this.cameraControls) {
                    this.cameraControls.enableRotate = false;
                    if (this.cameraControls.mouseButtons) {
                        this.cameraControls.mouseButtons.left = 0; // Disable left mouse rotation
                    }
                    if (this.cameraControls.touches) {
                        this.cameraControls.touches.one = 0; // Disable single touch rotation
                    }
                    console.log('Camera rotation disabled for vertical move selection');
                }

                // Set the object as selected for vertical move (different mode)
                this.stateManager.selectedObjectForMoveId = objectId;
                this.stateManager.selectedObject = object;
                this.stateManager.isVerticalMoveMode = true; // Flag for vertical-only movement
                
                // Store original material
                let originalMaterial;
                if (Array.isArray(object.material)) {
                    originalMaterial = object.material.map(mat => mat.clone());
                } else {
                    originalMaterial = object.material.clone();
                }
                this.stateManager.originalMaterial[object.uuid] = originalMaterial;
                
                // Apply distinct visual styling for vertical move mode (light blue)
                let moveMaterial;
                if (Array.isArray(object.material)) {
                    moveMaterial = object.material[0].clone();
                } else {
                    moveMaterial = object.material.clone();
                }
                moveMaterial.color.setHex(0xadd8e6); // Light blue for vertical mode
                moveMaterial.emissive.setHex(0x001122); // Subtle blue emission
                
                // Create blue wireframe for vertical mode
                const wireframeMaterial = new this.THREE.MeshBasicMaterial({
                    color: 0x0066cc,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.8
                });
                
                // Add or update wireframe
                let wireframe = object.children.find(child => child.userData.isWireframe);
                if (!wireframe) {
                    wireframe = new this.THREE.Mesh(object.geometry, wireframeMaterial);
                    wireframe.userData.isWireframe = true;
                    wireframe.scale.copy(object.scale);
                    wireframe.scale.multiplyScalar(1.01);
                    object.add(wireframe);
                } else {
                    wireframe.material = wireframeMaterial;
                    wireframe.visible = true;
                }
                
                object.material = moveMaterial;
                
                console.log(`Object selected for VERTICAL move with blue highlight: ${objectId}`);
            }
        }

        highlightObjectForDelete(objectId) {
            const object = this.stateManager.fileObjects.find(obj => obj.userData.id === objectId);
            if (object) {
                this.selectObject(object);
                object.material = object.material.clone();
                object.material.emissive.setHex(0x880000);
                console.log(`Object highlighted for deletion: ${objectId}`);
            }
        }

        /**
         * Enhanced contact object detection with multiple fallback methods
         * Returns object with isContact, contactId, name, method, and meshObject
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

            // Method 3: Child mesh of contact object (traverse up the hierarchy)
            let currentObject = object;
            while (currentObject.parent) {
                currentObject = currentObject.parent;
                if (currentObject.userData && currentObject.userData.subType === 'contact') {
                    result.isContact = true;
                    result.contactId = currentObject.userData.contactId || currentObject.userData.id;
                    result.name = currentObject.userData.fileName;
                    result.method = 'parent-hierarchy';
                    result.meshObject = currentObject;
                    return result;
                }
            }

            // Method 4: Check for contact-specific identifiers (like "Diamond" in filename)
            if (object.userData.fileName && 
                (object.userData.fileName.includes('Diamond') || 
                 object.userData.fileName.includes('Contact') ||
                 object.userData.contactId)) {
                result.isContact = true;
                result.contactId = object.userData.contactId || object.userData.id;
                result.name = object.userData.fileName;
                result.method = 'filename-identifier';
                return result;
            }

            // Method 5: Check if object is in contact manager's contact list
            if (window.app && window.app.contactManager) {
                const contacts = window.app.contactManager.getAllContacts();
                const matchingContact = contacts.find(contact => {
                    return contact.mesh === object || 
                           contact.mesh === object.parent ||
                           (contact.mesh && contact.mesh.children && contact.mesh.children.includes(object));
                });

                if (matchingContact) {
                    result.isContact = true;
                    result.contactId = matchingContact.contactData.id;
                    result.name = matchingContact.contactData.name;
                    result.method = 'contact-manager-lookup';
                    result.meshObject = matchingContact.mesh;
                    return result;
                }
            }

            return result;
        }

        /**
         * Hide contact object during SMS screen view to prevent blocking text
         * @param {string} contactId - The contact ID
         */
        hideContactObjectForSmsView(contactId) {
            if (!contactId || !window.app || !window.app.contactManager) {
                console.warn('🫥 Cannot hide contact: missing contactId or contactManager');
                return;
            }

            try {
                const contactObject = window.app.contactManager.contacts.get(contactId);
                if (contactObject && contactObject.mesh) {
                    // Store original visibility state before hiding
                    if (!window.app.contactManager.hiddenContactStates) {
                        window.app.contactManager.hiddenContactStates = {};
                    }
                    
                    // ENHANCED LOGGING: Track visibility states for debugging
                    const originalVisibility = contactObject.mesh.visible;
                    console.log(`🫥 Contact ${contactId} original visibility before hiding: ${originalVisibility}`);
                    
                    window.app.contactManager.hiddenContactStates[contactId] = {
                        wasVisible: originalVisibility,
                        timestamp: Date.now()
                    };
                    
                    // Hide the contact mesh
                    contactObject.mesh.visible = false;
                    console.log(`🫥 Contact object hidden for SMS view: ${contactId} (was: ${originalVisibility}, now: false)`);
                } else {
                    console.warn(`🫥 Contact object not found for hiding: ${contactId}`);
                    if (contactObject) {
                        console.warn(`🫥 Contact exists but missing mesh:`, contactObject);
                    }
                }
            } catch (error) {
                console.error('🫥 Failed to hide contact object:', error);
            }
        }

        /**
         * Show contact object after SMS screen closes
         * @param {string} contactId - The contact ID
         */
        showContactObjectAfterSmsView(contactId) {
            if (!contactId || !window.app || !window.app.contactManager) {
                console.warn('👁️ Cannot show contact: missing contactId or contactManager');
                return;
            }

            try {
                const contactObject = window.app.contactManager.contacts.get(contactId);
                if (contactObject && contactObject.mesh) {
                    // FORCE VISIBILITY: Always make contact visible when SMS screen closes
                    // We don't want to restore the original visibility state because contacts
                    // should always be visible after SMS interaction completes
                    contactObject.mesh.visible = true;
                    
                    // Clean up stored state if it exists
                    if (window.app.contactManager.hiddenContactStates && 
                        window.app.contactManager.hiddenContactStates[contactId]) {
                        delete window.app.contactManager.hiddenContactStates[contactId];
                    }
                    
                    // Force update visual state to ensure mesh is properly refreshed
                    if (contactObject.updateVisualState && typeof contactObject.updateVisualState === 'function') {
                        try {
                            contactObject.updateVisualState();
                            console.log(`👁️ Contact visual state updated: ${contactId}`);
                        } catch (updateError) {
                            console.warn(`👁️ Could not update visual state for ${contactId}:`, updateError.message);
                        }
                    }
                    
                    console.log(`👁️ Contact object FORCED visible: ${contactId} (visible: true)`);
                } else {
                    console.warn(`👁️ Contact object not found for showing: ${contactId}`);
                }
            } catch (error) {
                console.error('👁️ Failed to show contact object:', error);
            }
        }

        /**
         * Extract contact ID from various object types and formats
         * Used by SMS alert system to identify contacts consistently
         * @param {Object} object - The 3D object to extract contact ID from
         * @returns {string|null} - The contact ID or null if not found
         */
        extractContactId(object) {
            if (!object || !object.userData) return null;

            // Method 1: Direct contactId
            if (object.userData.contactId) {
                return this.normalizeContactId(object.userData.contactId);
            }

            // Method 2: fileId for contact objects
            if (object.userData.fileId && (object.userData.isContact || 
                object.userData.subType === 'contact' || 
                object.userData.type === 'contact')) {
                return this.normalizeContactId(object.userData.fileId);
            }

            // Method 3: id field for contact objects
            if (object.userData.id && (object.userData.isContact || 
                object.userData.subType === 'contact' || 
                object.userData.type === 'contact')) {
                return this.normalizeContactId(object.userData.id);
            }

            // Method 4: fileName-based extraction for contact files
            if (object.userData.fileName && object.userData.fileName.includes('.contact')) {
                const id = object.userData.fileName.replace('.contact', '');
                return this.normalizeContactId(id);
            }

            // Method 5: Check parent object (for child meshes)
            if (object.parent && object.parent.userData) {
                return this.extractContactId(object.parent);
            }

            return null;
        }

        /**
         * Normalize contact ID to remove prefixes and ensure consistency
         * @param {string} contactId - The raw contact ID
         * @returns {string} - The normalized contact ID
         */
        normalizeContactId(contactId) {
            if (!contactId) return contactId;
            
            // Remove contact:// prefix if present
            if (contactId.startsWith('contact://')) {
                return contactId.substring(10);
            }
            
            return String(contactId);
        }

        /**
         * MV3D: Check if object can show media preview
         * @param {Object} object - The 3D object
         * @returns {boolean} - True if object supports media preview
         */
        canShowMediaPreview(object) {
            if (!object || !object.userData) return false;

            // Check if it's a link object with URL - check multiple possible locations
            const url = object.userData.url || object.userData.fileData?.id || object.userData.fileData?.url || '';
            if (url) {
                const urlLower = url.toLowerCase();
                // Check for supported platforms (FIXED: Added TikTok, Instagram, Snapchat, Deezer, Dailymotion)
                if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') ||
                    urlLower.includes('spotify.com') || urlLower.includes('soundcloud.com') ||
                    urlLower.includes('vimeo.com') || urlLower.includes('deezer.com') ||
                    urlLower.includes('dailymotion.com') || urlLower.includes('dai.ly') ||
                    urlLower.includes('twitch.tv') ||
                    urlLower.includes('pandora.com') || urlLower.includes('music.apple.com') ||
                    urlLower.includes('tiktok.com') || 
                    urlLower.includes('instagram.com/reel') || urlLower.includes('instagram.com/p/') ||
                    urlLower.includes('snapchat.com/spotlight')) {
                    console.log('🎵 Media preview available for URL:', url);
                    return true;
                }
            }
            
            // ALSO check if it's an app object with a media URL (for link objects like YouTube)
            if (object.userData.type === 'app' || object.userData.subType === 'app') {
                const appUrl = object.userData.url || '';
                const appUrlLower = appUrl.toLowerCase();
                if (appUrlLower.includes('youtube.com') || appUrlLower.includes('youtu.be') ||
                    appUrlLower.includes('spotify.com') || appUrlLower.includes('soundcloud.com') ||
                    appUrlLower.includes('vimeo.com') || appUrlLower.includes('deezer.com') ||
                    appUrlLower.includes('dailymotion.com') || appUrlLower.includes('dai.ly') ||
                    appUrlLower.includes('tiktok.com') || 
                    appUrlLower.includes('instagram.com/reel') || appUrlLower.includes('instagram.com/p/') ||
                    appUrlLower.includes('snapchat.com/spotlight')) {
                    console.log('🎵 Media preview available for app URL:', appUrl);
                    return true;
                }
            }

            // Check if it's a video/audio file - check multiple extension sources
            let extension = (object.userData.extension || '').toLowerCase();
            
            // If no extension in userData, try to extract from fileName
            if (!extension && object.userData.fileName) {
                const fileName = object.userData.fileName;
                const dotIndex = fileName.lastIndexOf('.');
                if (dotIndex !== -1) {
                    extension = fileName.substring(dotIndex).toLowerCase();
                }
            }
            
            const mediaExtensions = [
                '.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v',  // Video
                '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'   // Audio
            ];
            
            const isMediaFile = mediaExtensions.includes(extension);
            if (isMediaFile) {
                console.log('🎵 Media preview available for file:', object.userData.fileName, 'extension:', extension);
            }
            
            return isMediaFile;
        }

        /**
         * MV3D: Handle media preview toggle
         * @param {Object} object - The 3D object
         */
        handleMediaPreview(object) {
            // Initialize media preview manager if needed
            if (!window.mediaPreviewManager) {
                if (window.MediaPreviewManagerClass && this.scene) {
                    window.mediaPreviewManager = new window.MediaPreviewManagerClass(this.scene);
                    console.log('🎵 Media Preview Manager initialized');
                } else {
                    console.error('❌ MediaPreviewManagerClass not available');
                    return;
                }
            }

            // CHECK IF OBJECT IS ON FURNITURE - if so, start furniture playback at this object
            if (object.userData.furnitureId && object.userData.furnitureSlotIndex !== undefined) {
                const furnitureId = object.userData.furnitureId;
                const slotIndex = object.userData.furnitureSlotIndex;
                
                console.log(`🪑 Object is on furniture ${furnitureId} slot ${slotIndex} - starting playback`);
                
                if (window.app && window.app.furnitureManager) {
                    window.app.furnitureManager.jumpToSlot(furnitureId, slotIndex);
                    return; // jumpToSlot will open the media with navigation buttons
                }
            }
            
            // FALLBACK: Try to find object in furniture.objectIds if slot index is missing
            if (object.userData.furnitureId) {
                const furnitureId = object.userData.furnitureId;
                
                console.log(`🪑 Object on furniture ${furnitureId} but no slot index - searching objectIds`);
                
                if (window.app && window.app.furnitureManager) {
                    const furniture = window.app.furnitureManager.storageManager.getFurniture(furnitureId);
                    if (furniture) {
                        const objectId = object.userData.id || object.userData.fileId;
                        const actualSlotIndex = furniture.objectIds.indexOf(objectId);
                        
                        if (actualSlotIndex !== -1) {
                            console.log(`🪑 Found object at slot ${actualSlotIndex} in objectIds`);
                            window.app.furnitureManager.jumpToSlot(furnitureId, actualSlotIndex);
                            return;
                        }
                    }
                    
                    console.warn(`🪑 Object on furniture but slot not found - falling through to normal preview`);
                }
            }

            // CHECK IF OBJECT IS ON PATH - if so, start path playback at this step
            if (object.userData.pathId && object.userData.pathStepIndex !== undefined) {
                const pathId = object.userData.pathId;
                const stepIndex = object.userData.pathStepIndex;
                
                console.log(`🛤️ Object is on path ${pathId} step ${stepIndex} - starting playback`);
                
                if (window.app && window.app.pathManager) {
                    // Start playback at this step
                    window.app.pathManager.startFromStep(pathId, stepIndex);
                    return; // startFromStep will open the media, so we're done
                } else {
                    console.warn('🛤️ PathManager not available');
                }
            }

            // Normal media preview for standalone objects
            console.log('🎵 [INTERACTION] About to call togglePreview with object.userData:', object.userData);
            console.log('🎵 [INTERACTION] object.userData.tiktokMetadata:', object.userData.tiktokMetadata);
            console.log('🎵 [INTERACTION] object.userData.instagramMetadata:', object.userData.instagramMetadata);
            window.mediaPreviewManager.togglePreview(object.userData, object);
        }
        
        /**
         * MV3D: Handle taps on contact info screen
         * @param {Object} screenObject - The contact info screen 3D object
         * @param {Object} intersection - The raycaster intersection with UV coords
         */
        handleContactInfoScreenTap(screenObject, intersection) {
            console.log('👤 Contact info screen tapped');
            
            // Get the screen reference from userData
            const screen = screenObject?.userData?.contactInfoScreen;
            if (!screen) {
                console.error('👤 ERROR: contactInfoScreen not found in userData');
                return;
            }
            
            // Check if we have UV coordinates (only available if screenMesh was hit, not overlay)
            if (!intersection || !intersection.uv) {
                console.log('👤 Contact info screen tapped but no UV coords - tapping center of screen as fallback');
                // Fallback: tap center of screen (close button area)
                screen.handleClick(screen.canvasWidth / 2, 600);
                return;
            }
            
            // Convert UV coordinates to canvas pixel coordinates
            const canvasX = intersection.uv.x * screen.canvasWidth;
            // Invert Y: UV Y=0 is bottom, canvas Y=0 is top
            const canvasY = (1 - intersection.uv.y) * screen.canvasHeight;
            console.log(`👤 Button click at canvas coords: (${canvasX.toFixed(0)}, ${canvasY.toFixed(0)})`);
            screen.handleClick(canvasX, canvasY);
        }
        
        /**
         * MV3D: Handle taps on media preview screen
         * @param {Object} screenObject - The preview screen 3D object
         * @param {Object} intersection - The raycaster intersection with UV coords
         */
        handleMediaPreviewScreenTap(screenObject, intersection) {
            console.log('🎵 Media preview screen tapped');
            
            if (screenObject && screenObject.userData && screenObject.userData.mediaPreviewScreen && intersection && intersection.uv) {
                const screen = screenObject.userData.mediaPreviewScreen;
                const canvasX = intersection.uv.x * screen.canvasWidth;
                // Invert Y: UV Y=0 is bottom, canvas Y=0 is top
                const canvasY = (1 - intersection.uv.y) * screen.canvasHeight;
                console.log(`🎵 Button click at canvas coords: (${canvasX.toFixed(0)}, ${canvasY.toFixed(0)})`);
                screen.handleClick(canvasX, canvasY);
            }
        }
    }

    // Make globally accessible
    window.InteractionManager = InteractionManager;
    
    console.log("InteractionManager module loaded successfully");
})();
