/**
 * SMS Interaction Manager
 * Handles enhanced SMS screen interactions:
 * - Tap ON SMS screen = interact with content (typing, buttons)
 * - Tap OUTSIDE SMS screen = close and restore camera
 * - Text input integration with mobile keyboard
 * - Real SMS sending/receiving through Flutter channels
 */

(function() {
    'use strict';

    class SmsInteractionManager {
        constructor(THREE, scene, camera, renderer, interactionManager) {
            this.THREE = THREE;
            this.scene = scene;
            this.camera = camera;
            this.renderer = renderer;
            this.interactionManager = interactionManager;
            this.boundHandleSmsInteraction = this.handleSmsInteraction.bind(this);
            
            // SMS interaction state
            this.activeSmsScreen = null;
            this.activeSmsContactId = null;
            this.isInSmsMode = false;
            this.isExitingSmsMode = false; // Flag to prevent keyboard protection interference
            this.smsContentBounds = null;
            
            // Text input state
            this.textInputActive = false;
            this.currentInputElement = null;
            
            // SMART DEBOUNCING: Prevent keyboard flicker
            this.lastKeyboardRequest = 0;
            this.keyboardRequestDebounce = 500; // 500ms between requests
            this.keyboardShown = false;
            
            // Use real SMS mode instead of fallback
            this.forceFallbackMode = false; // REAL MODE ENABLED FOR SMS CONVERSATIONS
            console.log('📱 [REAL] Real SMS mode enabled for conversation loading');
            
            // Raycaster for precise hit detection
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
            
            // Emergency escape mechanism - count taps for double-tap exit
            this.tapCount = 0;
            this.lastTapTime = 0;
            this.doubleTapThreshold = 500; // 500ms
            
            // Touch interaction state for scrolling - IMPROVED for smooth drag
            this.touchState = 'idle'; // idle, touching, dragging
            this.touchStartTime = 0;
            this.touchStartPoint = new this.THREE.Vector2();
            this.lastTouchPoint = new this.THREE.Vector2();
            this.touchMoveThreshold = 3; // Reduced from 5 to 3 pixels for more responsive drag
            this.tapMaxDuration = 200; // Reduced from 250ms for quicker tap detection
            
            console.log('<<<<< SMS MANAGER V4 - REAL MODE - LOADED >>>>>');
            console.log('🔧 SmsInteractionManager initialized');
            
            // ENHANCED: Start Flutter input channel monitoring immediately
            setTimeout(() => {
                this.monitorFlutterInputChannel();
            }, 1000); // Give channels time to initialize
        }

        /**
         * Enter SMS interaction mode when double-clicking SMS screen
         */
        enterSmsMode(smsScreen, contactId) {
            console.log('📱 ENTERING SMS MODE for contact:', contactId);
            
            this.activeSmsScreen = smsScreen;
            this.activeSmsContactId = contactId;
            this.isInSmsMode = true;

            // Add event listeners to handle all interactions within SMS mode
            this.renderer.domElement.addEventListener('mousedown', this.boundHandleSmsInteraction, true);
            this.renderer.domElement.addEventListener('mousemove', this.boundHandleSmsInteraction, true);
            this.renderer.domElement.addEventListener('mouseup', this.boundHandleSmsInteraction, true);
            this.renderer.domElement.addEventListener('touchstart', this.boundHandleSmsInteraction, true);
            this.renderer.domElement.addEventListener('touchmove', this.boundHandleSmsInteraction, true);
            this.renderer.domElement.addEventListener('touchend', this.boundHandleSmsInteraction, true);
            
            // Calculate SMS screen content bounds for hit detection
            this.calculateSmsContentBounds(smsScreen);
            
            // ENHANCED KEYBOARD PROTECTION: Monitor for viewport changes during SMS mode
            this.startKeyboardProtection();
            
            // REFRESH SMS MESSAGES: Request latest conversation data
            this.refreshSmsConversation(contactId);
            
            // AUTO-SCROLL TO BOTTOM: Show newest messages first
            setTimeout(() => {
                this.scrollToNewestMessages();
            }, 500); // Small delay to allow content to load
            
            // Notify Flutter about entering SMS mode
            this.notifyFlutterSmsMode(contactId, true);
            
            // CRITICAL: Dispatch event to clear SMS alerts when entering interactive mode
            window.dispatchEvent(new CustomEvent('sms-screen-interactive-mode', {
                detail: {
                    contactId: contactId,
                    reason: 'double-tap-sms-screen',
                    timestamp: Date.now()
                }
            }));
            
            console.log('📱 SMS mode active - content bounds calculated, alerts cleared');
        }

        /**
         * Exit SMS interaction mode and restore camera
         */
        exitSmsMode() {
            console.log('📱 EXITING SMS MODE for contact:', this.activeSmsContactId);

            // CRITICAL: Set exit flag immediately to prevent keyboard protection interference
            this.isExitingSmsMode = true;

            // Remove event listeners when exiting SMS mode
            this.renderer.domElement.removeEventListener('mousedown', this.boundHandleSmsInteraction, true);
            this.renderer.domElement.removeEventListener('mousemove', this.boundHandleSmsInteraction, true);
            this.renderer.domElement.removeEventListener('mouseup', this.boundHandleSmsInteraction, true);
            this.renderer.domElement.removeEventListener('touchstart', this.boundHandleSmsInteraction, true);
            this.renderer.domElement.removeEventListener('touchmove', this.boundHandleSmsInteraction, true);
            this.renderer.domElement.removeEventListener('touchend', this.boundHandleSmsInteraction, true);
            
            // IMMEDIATE CAMERA CONTROL RESTORATION: Always re-enable camera controls first
            if (this.interactionManager && this.interactionManager.cameraControls) {
                console.log('🎯 FORCE re-enabling camera controls');
                this.interactionManager.cameraControls.enabled = true;
                this.interactionManager.cameraControls.enableRotate = true;
                this.interactionManager.cameraControls.enablePan = true;
                this.interactionManager.cameraControls.enableZoom = true;
                
                // Also restore touch/mouse controls
                if (this.interactionManager.cameraControls.mouseButtons) {
                    this.interactionManager.cameraControls.mouseButtons.left = 1; // Re-enable left mouse rotation
                }
                if (this.interactionManager.cameraControls.touches) {
                    this.interactionManager.cameraControls.touches.one = 32; // Re-enable single touch rotation
                }
                
                // Force immediate camera controls update to prevent freeze
                this.interactionManager.cameraControls.update(0);
                console.log('🎯 Camera controls fully restored and updated');
            }
            
            if (this.activeSmsContactId) {
            // Hide text input if active
            this.hideTextInput();
            
            // STOP KEYBOARD PROTECTION: Remove viewport change monitoring
            this.stopKeyboardProtection();
            
            // Notify Flutter about exiting SMS mode
            this.notifyFlutterSmsMode(this.activeSmsContactId, false);                // DIRECT CAMERA RESTORATION: Don't call handleSmsScreenTap to avoid recursion
                // Instead, directly restore camera position via contact manager
                if (window.app && window.app.contactManager) {
                    const contactId = this.activeSmsContactId;
                    
                    // RESTORE CAMERA POSITION: If we have a stored pre-teleport state, restore it
                    if (window.app.contactManager.preTeleportStates && 
                        window.app.contactManager.preTeleportStates[contactId]) {
                        
                        const preTeleportState = window.app.contactManager.preTeleportStates[contactId];
                        console.log('🎯 RESTORING pre-teleport camera position from exitSmsMode:', preTeleportState.position);
                        
                        // Restore camera position
                        if (this.camera && isFinite(preTeleportState.position.x) && 
                            isFinite(preTeleportState.position.y) && isFinite(preTeleportState.position.z)) {
                            
                            this.camera.position.set(
                                preTeleportState.position.x, 
                                preTeleportState.position.y, 
                                preTeleportState.position.z
                            );
                            
                            // Restore camera controls target if available
                            if (this.interactionManager && this.interactionManager.cameraControls && 
                                this.interactionManager.cameraControls.target && preTeleportState.target) {
                                if (isFinite(preTeleportState.target.x) && 
                                    isFinite(preTeleportState.target.y) && 
                                    isFinite(preTeleportState.target.z)) {
                                    
                                    this.interactionManager.cameraControls.target.set(
                                        preTeleportState.target.x,
                                        preTeleportState.target.y,
                                        preTeleportState.target.z
                                    );
                                }
                            }
                            
                            // Update camera matrix
                            this.camera.updateMatrixWorld();
                            
                            console.log(`🎯 Camera position restored to: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
                            
                            // Clean up stored state
                            delete window.app.contactManager.preTeleportStates[contactId];
                            console.log('🎯 Pre-teleport state cleaned up');
                            
                            // RESTORE CONTACT OBJECT: Show contact again when SMS screen closes
                            if (this.interactionManager && this.interactionManager.showContactObjectAfterSmsView) {
                                this.interactionManager.showContactObjectAfterSmsView(contactId);
                            }
                        }
                    }
                    
                    // Hide SMS screen via contact manager
                    console.log('💬 Hiding SMS screen via contact manager');
                    window.app.contactManager.handleContactInteraction(contactId);
                    
                    // FAILSAFE: Ensure contact is visible after SMS interaction
                    setTimeout(() => {
                        const contactObject = window.app.contactManager.contacts.get(contactId);
                        if (contactObject && contactObject.mesh && !contactObject.mesh.visible) {
                            console.log('🚨 FAILSAFE: Force-showing contact after SMS exit:', contactId);
                            contactObject.mesh.visible = true;
                        }
                    }, 100); // Small delay to allow normal restoration to complete first
                }
            }
            
            // CRITICAL: Delay state reset to allow keyboard protection handler to finish
            // The keyboard protection handler needs to see these flags during keyboard closure
            console.log('📱 SMS exit started - keeping flags active until keyboard protection completes');
            setTimeout(() => {
                // Reset state only after keyboard protection has finished
                this.activeSmsScreen = null;
                this.activeSmsContactId = null;
                this.isInSmsMode = false;
                this.isExitingSmsMode = false; // Reset exit flag
                this.smsContentBounds = null;
                
                // Reset emergency exit counters
                this.tapCount = 0;
                this.lastTapTime = 0;
                
                console.log('📱 SMS mode deactivated - states reset after keyboard protection cleanup');
            }, 1000); // 1 second delay to ensure all viewport changes and keyboard events complete
        }

        isInSmsInteractionMode() {
            return this.isInSmsMode;
        }
        handleSmsInteraction(event) {
            // This handler is only active during SMS mode. Stop other handlers.
            event.stopPropagation();
            
            // FIXED: Only prevent default if the event is actually cancelable to avoid browser intervention warnings
            if (this.touchState === 'dragging' && (event.type === 'touchmove' || event.type === 'mousemove') && event.cancelable) {
                event.preventDefault();
            }

            if (!this.isInSmsMode || !this.activeSmsScreen) {
                return false;
            }

            const rect = this.renderer.domElement.getBoundingClientRect();
            let clientX, clientY;

            if (event.type === 'touchstart' || event.type === 'touchmove') {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else if (event.type === 'touchend') {
                clientX = event.changedTouches[0].clientX;
                clientY = event.changedTouches[0].clientY;
            } else { // Mouse events
                clientX = event.clientX;
                clientY = event.clientY;
            }

            const currentPoint = new this.THREE.Vector2(clientX, clientY);

            switch (event.type) {
                case 'mousedown':
                case 'touchstart':
                    this.touchState = 'touching';
                    this.touchStartTime = Date.now();
                    this.touchStartPoint.copy(currentPoint);
                    this.lastTouchPoint.copy(currentPoint);
                    break;

                case 'mousemove':
                case 'touchmove':
                    if (this.touchState === 'touching' || this.touchState === 'dragging') {
                        const distance = this.touchStartPoint.distanceTo(currentPoint);
                        if (distance > this.touchMoveThreshold) {
                            this.touchState = 'dragging';
                        }

                        if (this.touchState === 'dragging') {
                            const dy = currentPoint.y - this.lastTouchPoint.y;
                            
                            // ENHANCED SCROLLING: Multiple fallback methods for SMS screen scrolling
                            // FIXED DIRECTION: Positive dy (drag down) = scroll down (older messages), negative dy (drag up) = scroll up (newer messages)
                            if (this.activeSmsScreen) {
                                let scrollSuccess = false;
                                const scrollAmount = dy * 12; // FIXED: Removed negative sign to correct scroll direction
                                
                                // Method 1: Direct scroll function
                                if (typeof this.activeSmsScreen.scroll === 'function') {
                                    try {
                                        this.activeSmsScreen.scroll(scrollAmount);
                                        scrollSuccess = true;
                                        console.log('📱 ✅ Direct scroll applied:', scrollAmount);
                                    } catch (error) {
                                        console.warn('📱 Direct scroll failed:', error);
                                    }
                                }
                                
                                // Method 2: Try via contactManager if direct scroll failed
                                if (!scrollSuccess && window.app && window.app.contactManager) {
                                    try {
                                        const contact = window.app.contactManager.contacts.get(this.activeSmsContactId);
                                        if (contact && contact.smsScreen && typeof contact.smsScreen.scroll === 'function') {
                                            contact.smsScreen.scroll(scrollAmount);
                                            scrollSuccess = true;
                                            console.log('📱 ✅ Contact manager scroll applied:', scrollAmount);
                                        }
                                    } catch (error) {
                                        console.warn('📱 Contact manager scroll failed:', error);
                                    }
                                }
                                
                                // Method 3: Try global SMS screen scroll
                                if (!scrollSuccess && window.app && window.app.smsScreen) {
                                    try {
                                        if (typeof window.app.smsScreen.scroll === 'function') {
                                            window.app.smsScreen.scroll(scrollAmount);
                                            scrollSuccess = true;
                                            console.log('📱 ✅ Global SMS screen scroll applied:', scrollAmount);
                                        }
                                    } catch (error) {
                                        console.warn('📱 Global SMS screen scroll failed:', error);
                                    }
                                }
                                
                                // Method 4: Direct property manipulation fallback
                                if (!scrollSuccess) {
                                    try {
                                        if (this.activeSmsScreen.scrollOffset !== undefined) {
                                            this.activeSmsScreen.scrollOffset += scrollAmount;
                                            console.log('📱 ✅ Direct scrollOffset applied:', this.activeSmsScreen.scrollOffset);
                                            scrollSuccess = true;
                                        }
                                    } catch (error) {
                                        console.warn('📱 Direct scrollOffset failed:', error);
                                    }
                                }
                                
                                if (!scrollSuccess) {
                                    console.warn('📱 ⚠️ All scroll methods failed - SMS screen may not support scrolling');
                                    console.log('📱 📋 SMS screen object:', this.activeSmsScreen);
                                    console.log('📱 📋 Available methods:', Object.getOwnPropertyNames(this.activeSmsScreen));
                                }
                            }
                            
                            this.lastTouchPoint.copy(currentPoint);
                        }
                    }
                    break;

                case 'mouseup':
                case 'touchend':
                    const duration = Date.now() - this.touchStartTime;
                    if (this.touchState === 'touching' && duration < this.tapMaxDuration) {
                        // This is a tap, process it.
                        this.processSmsTap(clientX, clientY, rect);
                    } else if (this.touchState === 'dragging') {
                        // Drag ended, do nothing special for now
                        console.log('📱 Drag interaction ended.');
                    }
                    this.touchState = 'idle';
                    break;
            }
            return true; // Event handled
        }

        processSmsTap(clientX, clientY, rect) {
            this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.activeSmsScreen, true);

            if (intersects.length > 0) {
                const hitPoint = intersects[0].point;
                const smsInteraction = this.determineSmsInteraction(hitPoint);
                this.handleSmsContentInteraction(smsInteraction);
            } else {
                this.exitSmsMode();
            }
        }

        /**
         * Calculate precise bounds of SMS screen content areas
         */
        calculateSmsContentBounds(smsScreen) {
            if (!smsScreen || !smsScreen.geometry) {
                console.warn('📱 Cannot calculate SMS bounds - invalid screen object');
                return;
            }

            // Get SMS screen dimensions and position
            const bbox = new this.THREE.Box3().setFromObject(smsScreen);
            const size = bbox.getSize(new this.THREE.Vector3());
            const center = bbox.getCenter(new this.THREE.Vector3());

            // Define interactive areas based on SMS screen layout
            this.smsContentBounds = {
                // Message display area (center area, avoiding close button and input areas)
                messageArea: {
                    minX: center.x - size.x * 0.4,
                    maxX: center.x + size.x * 0.3, // Reduced to avoid close button overlap
                    minY: center.y - size.y * 0.1, // Extended down slightly 
                    maxY: center.y + size.y * 0.3, // Reduced to avoid close button
                    minZ: center.z - size.z * 0.1,
                    maxZ: center.z + size.z * 0.1
                },
                // Close button area (top right corner) - SMALLER to avoid message area overlap
                closeArea: {
                    minX: center.x + size.x * 0.3,  // Moved further right to avoid message area
                    maxX: center.x + size.x * 0.45,  // Keep right edge
                    minY: center.y + size.y * 0.25,  // Moved up to avoid message area
                    maxY: center.y + size.y * 0.45,  // Keep top edge
                    minZ: center.z - size.z * 0.2,
                    maxZ: center.z + size.z * 0.2
                },
                // Text input area (bottom 20% of screen) - LARGER AREA for easier tapping  
                inputArea: {
                    minX: center.x - size.x * 0.4,
                    maxX: center.x + size.x * 0.2, // Leave space for send button
                    minY: center.y - size.y * 0.45,
                    maxY: center.y - size.y * 0.15, // Moved up to avoid message area overlap
                    minZ: center.z - size.z * 0.1,
                    maxZ: center.z + size.z * 0.1
                },
                // Send button area (bottom right)
                sendArea: {
                    minX: center.x + size.x * 0.2,
                    maxX: center.x + size.x * 0.4,
                    minY: center.y - size.y * 0.35,
                    maxY: center.y - size.y * 0.15,
                    minZ: center.z - size.z * 0.1,
                    maxZ: center.z + size.z * 0.1
                }
            };

            console.log('📱 SMS content bounds calculated:', this.smsContentBounds);
        }

        /**
         * Determine what type of SMS interaction based on hit point
         */
        determineSmsInteraction(hitPoint) {
            if (!this.smsContentBounds) {
                return { type: 'general', point: hitPoint };
            }

            console.log('📱 Hit point coordinates:', hitPoint.x.toFixed(2), hitPoint.y.toFixed(2), hitPoint.z.toFixed(2));
            console.log('📱 Close area bounds:', this.smsContentBounds.closeArea);
            console.log('📱 Message area bounds:', this.smsContentBounds.messageArea);
            console.log('📱 Input area bounds:', this.smsContentBounds.inputArea);

            // Check if hit point is in close button area (highest priority)
            const closeArea = this.smsContentBounds.closeArea;
            if (this.isPointInBounds(hitPoint, closeArea)) {
                console.log('📱 HIT: Close button area detected!');
                return { type: 'closeButton', point: hitPoint, area: 'close' };
            }

            // Check if hit point is in input area
            const inputArea = this.smsContentBounds.inputArea;
            if (this.isPointInBounds(hitPoint, inputArea)) {
                console.log('📱 HIT: Text input area detected!');
                return { type: 'textInput', point: hitPoint, area: 'input' };
            }

            // Check if hit point is in send button area
            const sendArea = this.smsContentBounds.sendArea;
            if (this.isPointInBounds(hitPoint, sendArea)) {
                console.log('📱 HIT: Send button area detected!');
                return { type: 'sendButton', point: hitPoint, area: 'send' };
            }

            // Check if hit point is in message area
            const messageArea = this.smsContentBounds.messageArea;
            if (this.isPointInBounds(hitPoint, messageArea)) {
                console.log('📱 HIT: Message area detected!');
                return { type: 'messageArea', point: hitPoint, area: 'messages' };
            }

            // Default to general interaction
            console.log('📱 HIT: General area (no specific zone detected)');
            return { type: 'general', point: hitPoint, area: 'unknown' };
        }

        /**
         * Check if point is within bounds
         */
        isPointInBounds(point, bounds) {
            return point.x >= bounds.minX && point.x <= bounds.maxX &&
                   point.y >= bounds.minY && point.y <= bounds.maxY &&
                   point.z >= bounds.minZ && point.z <= bounds.maxZ;
        }

        /**
         * Handle specific SMS content interactions
         */
        handleSmsContentInteraction(interaction) {
            switch (interaction.type) {
                case 'closeButton':
                    console.log('📱 Close button (X) tapped - exiting SMS mode');
                    // Close both the SMS screen and exit SMS mode completely
                    if (this.activeSmsScreen && typeof this.activeSmsScreen.close === 'function') {
                        this.activeSmsScreen.close();
                    }
                    this.exitSmsMode();
                    break;
                    
                case 'textInput':
                    console.log('📱 Text input area tapped - showing keyboard');
                    this.showTextInput();
                    break;
                    
                case 'sendButton':
                    console.log('📱 Send button tapped - sending message');
                    this.sendCurrentMessage();
                    break;
                    
                case 'messageArea':
                    console.log('📱 Message area detected - drag to scroll (no tap scrolling)');
                    // NO ACTION: Message area scrolling is now handled entirely by drag gestures
                    // in the touchmove handler. No more tap-to-scroll jumps.
                    break;
                    
                case 'general':
                default:
                    console.log('📱 General SMS area tapped - showing text input for typing');
                    console.log('📱 💡 TIP: Use the large X button, or tap outside SMS screen to cancel/exit');
                    
                    // EMERGENCY EXIT: If user has tapped general area multiple times rapidly, exit SMS mode
                    const now = Date.now();
                    if (now - this.lastTapTime < 1000) { // Less than 1 second between taps
                        this.tapCount++;
                        if (this.tapCount >= 5) {
                            console.log('🚨 EMERGENCY EXIT: 5 rapid taps detected - forcing SMS exit!');
                            this.exitSmsMode();
                            return;
                        }
                    } else {
                        this.tapCount = 1;
                    }
                    this.lastTapTime = now;
                    
                    // CRITICAL FIX: Also activate SMS Integration Manager for direct SMS screen interaction
                    if (window.smsIntegrationManager && this.activeSmsContactId) {
                        console.log('📱 Attempting to activate SMS Integration Manager for screen interaction');
                        const activated = window.smsIntegrationManager.forceActivateForSmsScreenInteraction(this.activeSmsContactId);
                        if (!activated) {
                            console.log('📱 SMS Integration Manager activation failed - user may need to zoom in closer');
                        }
                    }
                    
                    // Show text input if not already active
                    if (!this.textInputActive) {
                        this.showTextInput();
                    } else {
                        console.log('📱 Text input already active');
                    }
                    break;
            }
        }

        /**
         * Show text input for typing SMS messages.
         * SIMPLIFIED: Focus on event-driven updates, not polling
         */
        showTextInput() {
            if (!this.isInSmsMode || !this.activeSmsScreen || !this.activeSmsContactId) {
                console.log('📱 Text input blocked - not in full SMS interaction mode');
                return;
            }
            
            if (this.textInputActive) {
                console.log('📱 Text input already active');
                return;
            }

            console.log('📱 Requesting mobile keyboard via Flutter for full SMS mode');
            
            this.setTextInputViewportMeta();
            document.body.classList.add('sms-input-active');
            
            if (this.forceFallbackMode) {
                console.log('📱 Using forced fallback mode for reliable text input');
                this.fallbackTextInput();
                return;
            }
            
            this.requestKeyboard();
            
            // SIMPLIFIED: Just activate event monitoring, no polling
            this.activateEventDrivenTextUpdates();
        }

        /**
         * SIMPLIFIED: Activate event-driven text updates without polling
         */
        activateEventDrivenTextUpdates() {
            console.log('📱 [SIMPLIFIED] Activating event-driven text updates...');
            
            // Set up primary event listener for Flutter text input
            if (!this.textInputListener) {
                this.textInputListener = (event) => {
                    if (!this.isInSmsMode || !this.activeSmsContactId) return;
                    
                    console.log('📱 [SIMPLIFIED] ✅ Flutter text event received:', event.detail);
                    
                    if (event.detail && typeof event.detail.text === 'string') {
                        let text = event.detail.text;
                        
                        // Decode URI-encoded text from Flutter
                        try {
                            text = decodeURIComponent(text);
                            console.log('📱 [SIMPLIFIED] ✅ Decoded text:', `"${text}"`);
                        } catch (e) {
                            console.log('📱 [SIMPLIFIED] Using original text:', `"${text}"`);
                        }
                        
                        this.updateTextInput(text, event.detail.contactId);
                    }
                };
                
                // Listen for the primary Flutter text input event
                window.addEventListener('flutter-text-input', this.textInputListener);
                console.log('📱 [SIMPLIFIED] ✅ Event listener activated for flutter-text-input');
                console.log('📱 [SIMPLIFIED] 🎯 WAITING for Flutter to send text events...');
            }
        }

        /**
         * SIMPLIFIED: Clean up event listeners
         */
        deactivateEventDrivenTextUpdates() {
            if (this.textInputListener) {
                window.removeEventListener('flutter-text-input', this.textInputListener);
                this.textInputListener = null;
                console.log('📱 [SIMPLIFIED] Event-driven text updates deactivated');
            }
        }

        /**
         * Sends the definitive request to Flutter to show the keyboard.
         * SMART DEBOUNCING: Prevent rapid keyboard requests that cause flicker
         */
        requestKeyboard() {
            // DEBOUNCE: Ignore rapid requests to prevent keyboard flicker
            const now = Date.now();
            if (this.keyboardShown && (now - this.lastKeyboardRequest < this.keyboardRequestDebounce)) {
                console.log('📱 DEBOUNCED: Ignoring rapid keyboard request to prevent flicker');
                return;
            }
            
            if (window.SmsInputChannel) {
                try {
                    const inputRequest = {
                        action: 'show_keyboard',
                        contactId: this.activeSmsContactId,
                        inputType: 'sms'
                    };
                    window.SmsInputChannel.postMessage(JSON.stringify(inputRequest));
                    this.textInputActive = true;
                    this.lastKeyboardRequest = now;
                    this.keyboardShown = true;
                    console.log('📱 Keyboard request sent to Flutter for SMS mode.');
                } catch (error) {
                    console.error('📱 Failed to request keyboard:', error);
                    this.fallbackTextInput();
                }
            } else {
                console.warn('📱 SmsInputChannel not available, using fallback for keyboard request.');
                this.fallbackTextInput();
            }
        }

        /**
         * Fallback text input using HTML input overlay
         * REFINED: Apply targeted protection for fallback input too
         */
        fallbackTextInput() {
            console.log('📱 Creating fallback text input overlay with targeted protection');
            
            // Remove any existing input overlay first
            const existingOverlay = document.getElementById('sms-input-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
                console.log('📱 Removed existing input overlay');
            }
            
            // APPLY TARGETED PROTECTION: For fallback input as well
            this.setTextInputViewportMeta();
            document.body.classList.add('sms-input-active');
            
            // Create overlay input element with higher z-index
            const inputOverlay = document.createElement('div');
            inputOverlay.id = 'sms-input-overlay';
            inputOverlay.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #007AFF;
                border-radius: 10px;
                padding: 15px;
                z-index: 999999;
                display: flex;
                gap: 10px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            `;

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.placeholder = 'Type SMS message... (tap X to cancel)';
            textInput.style.cssText = `
                flex: 1;
                padding: 12px;
                border: 1px solid #ccc;
                border-radius: 5px;
                font-size: 16px;
                outline: none;
            `;

            const sendButton = document.createElement('button');
            sendButton.textContent = 'Send';
            sendButton.style.cssText = `
                background: #007AFF;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 12px 20px;
                font-size: 16px;
                cursor: pointer;
                min-width: 70px;
            `;

            // Close button for the overlay
            const closeButton = document.createElement('button');
            closeButton.textContent = '✕';
            closeButton.style.cssText = `
                background: #ff4444;
                color: white;
                border: none;
                border-radius: 50%;
                width: 45px;
                height: 45px;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            `;

            // Event handlers
            const sendMessage = () => {
                const message = textInput.value.trim();
                if (message) {
                    this.sendMessage(message);
                    textInput.value = '';
                    this.hideTextInput();
                }
            };

            const closeTextInput = () => {
                console.log('📱 Text input overlay close button tapped - exiting SMS mode completely');
                // Exit SMS mode which will handle both text input and SMS screen cleanup
                this.exitSmsMode();
                
                // Also close the SMS screen itself for completeness
                if (this.activeSmsScreen && typeof this.activeSmsScreen.close === 'function') {
                    this.activeSmsScreen.close();
                }
            };

            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });

            // Add escape key support for canceling text input
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    console.log('📱 Escape key pressed - canceling text input');
                    this.hideTextInput();
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            sendButton.addEventListener('click', sendMessage);
            closeButton.addEventListener('click', closeTextInput);

            // Assembly and show
            inputOverlay.appendChild(textInput);
            inputOverlay.appendChild(sendButton);
            inputOverlay.appendChild(closeButton);
            
            // Force append to body and ensure visibility
            try {
                document.body.appendChild(inputOverlay);
                console.log('📱 Input overlay appended to document body');
                
                // Force show and focus
                inputOverlay.style.display = 'flex';
                inputOverlay.style.visibility = 'visible';
                inputOverlay.style.opacity = '1';
                
                // Focus input with multiple attempts
                const focusInput = () => {
                    try {
                        textInput.focus();
                        textInput.click();
                        console.log('📱 Text input focused successfully');
                    } catch (error) {
                        console.warn('📱 Focus attempt failed:', error);
                    }
                };
                
                setTimeout(focusInput, 50);
                setTimeout(focusInput, 150);
                setTimeout(focusInput, 300);
                
            } catch (error) {
                console.error('📱 Failed to create input overlay:', error);
            }
            
            this.currentInputElement = inputOverlay;
            this.textInputActive = true;
            
            console.log('📱 Fallback text input created, displayed, and focused');
            console.log('📱 💡 TIP: Use the large X button, or tap outside SMS screen to cancel/exit');
            
            // Dispatch flutter-text-input event on input change
            textInput.autofocus = true;
            textInput.autocorrect = 'off';
            textInput.spellcheck = false;
            textInput.addEventListener('input', (e) => {
                const event = new CustomEvent('flutter-text-input', {
                    detail: { text: textInput.value, contactId: this.activeSmsContactId }
                });
                window.dispatchEvent(event);
            });
        }

        /**
         * Hide text input
         * SIMPLIFIED: Remove targeted protection when text input is closed
         */
        hideTextInput() {
            if (!this.textInputActive) {
                return;
            }

            console.log('📱 Hiding text input');

            // REMOVE TARGETED PROTECTION: Restore normal viewport behavior
            this.restoreNormalViewportMeta();
            document.body.classList.remove('sms-input-active');

            // Hide Flutter keyboard
            if (window.SmsInputChannel) {
                try {
                    const hideRequest = {
                        action: 'hide_keyboard',
                        contactId: this.activeSmsContactId
                    };
                    window.SmsInputChannel.postMessage(JSON.stringify(hideRequest));
                } catch (error) {
                    console.error('📱 Failed to hide keyboard:', error);
                }
            }

            // Remove fallback input overlay
            if (this.currentInputElement && this.currentInputElement.parentNode) {
                this.currentInputElement.parentNode.removeChild(this.currentInputElement);
                this.currentInputElement = null;
            }

            // SIMPLIFIED: Clean up event listeners instead of polling
            this.deactivateEventDrivenTextUpdates();

            this.textInputActive = false;
            this.keyboardShown = false; // RESET: Allow keyboard requests again
            console.log('📱 Text input hidden - pinch-to-zoom restored');
        }

        /**
         * Send SMS message
         */
        sendMessage(messageText) {
            if (!messageText || !this.activeSmsContactId) {
                console.warn('📱 Cannot send message - missing text or contact ID');
                return;
            }

            console.log('📱 Sending SMS message:', messageText);

            // Send via ContactActionChannel
            if (window.ContactActionChannel) {
                try {
                    const smsData = {
                        action: 'sendSMS',
                        contactId: this.activeSmsContactId,
                        message: messageText,
                        timestamp: Date.now()
                    };
                    console.log('📱 Sending SMS via ContactActionChannel:', smsData);
                    window.ContactActionChannel.postMessage(JSON.stringify(smsData));
                    
                    // Update SMS screen with sent message
                    this.updateSmsScreenWithMessage(messageText, 'sent');
                    
                    // ENHANCED: Immediate scroll and delayed refresh with scroll
                    console.log('📱 Applying immediate scroll after sending message');
                    this.scrollToNewestMessages();
                    
                    // Refresh conversation and scroll again after delay
                    setTimeout(() => {
                        console.log('📱 Refreshing conversation after sending message');
                        this.refreshSmsConversation(this.activeSmsContactId);
                        
                        // Double scroll to ensure visibility of the sent message
                        setTimeout(() => {
                            this.scrollToNewestMessages();
                            console.log('📱 ✅ Double-scroll applied to ensure newest message visibility');
                        }, 300); // Wait for refresh to complete
                    }, 100);
                    
                } catch (error) {
                    console.error('📱 Failed to send SMS:', error);
                }
            } else {
                console.warn('📱 ContactActionChannel not available for SMS sending');
            }
        }

        /**
         * Send current message from text input
         */
        sendCurrentMessage() {
            if (this.currentInputElement) {
                const textInput = this.currentInputElement.querySelector('input');
                if (textInput && textInput.value.trim()) {
                    this.sendMessage(textInput.value.trim());
                    textInput.value = '';
                }
            } else {
                // Request current text from Flutter keyboard
                if (window.SmsInputChannel) {
                    try {
                        const textRequest = {
                            action: 'getCurrentText',
                            contactId: this.activeSmsContactId
                        };
                        window.SmsInputChannel.postMessage(JSON.stringify(textRequest));
                    } catch (error) {
                        console.error('📱 Failed to get current text:', error);
                    }
                }
            }
        }

        /**
         * Handle message area scrolling - REMOVED tap-to-scroll, now drag-only
         */
        handleMessageScroll(hitPoint) {
            // TAP-TO-SCROLL REMOVED: This method is no longer used for tap scrolling
            // All scrolling now happens via drag gestures in touchmove handler
            console.log('📱 Message area tapped - no action (drag-to-scroll only)');
        }

        /**
         * Update SMS screen visual with new message
         */
        updateSmsScreenWithMessage(messageText, type) {
            console.log(`📱 Updating SMS screen with ${type} message:`, messageText);
            
            // This would integrate with the existing SMS screen rendering system
            // For now, just log the update
            
            // Could trigger SMS screen re-render with new message
            if (window.app && window.app.contactManager && window.app.contactManager.updateSmsContent) {
                window.app.contactManager.updateSmsContent(this.activeSmsContactId, messageText, type);
            }
        }

        /**
         * Scroll SMS screen to show newest messages at the bottom
         * SIMPLIFIED: Uses a reliable, direct approach with proper bounds calculation
         */
        scrollToNewestMessages() {
            if (!this.activeSmsScreen || !this.isInSmsMode) {
                return;
            }

            console.log('📱 Scrolling to newest messages');

            try {
                const contact = window.app.contactManager.contacts.get(this.activeSmsContactId);
                if (contact && contact.smsScreen) {
                    // Recalculate scroll bounds to get the correct maxScrollOffset
                    if (typeof contact.smsScreen.calculateScrollBounds === 'function') {
                        contact.smsScreen.calculateScrollBounds();
                    }

                    // Simply scroll to the maximum offset (which now includes bottom buffer)
                    const maxScroll = contact.smsScreen.maxScrollOffset || 0;
                    contact.smsScreen.scrollOffset = maxScroll;

                    console.log(`📱 Scrolled to bottom: ${maxScroll}`);

                    // Re-render to apply the scroll
                    if (typeof contact.smsScreen.render === 'function') {
                        contact.smsScreen.render();
                    }
                }
            } catch (error) {
                console.warn('📱 Scrolling failed:', error);
            }
        }

        /**
         * Refresh SMS conversation with latest messages
         * ENHANCED: Uses a timed sequence to ensure UI updates after data fetch.
         */
        refreshSmsConversation(contactId) {
            console.log('📱 Refreshing SMS conversation for contact:', contactId);
            
            // Request latest conversation data from Flutter
            if (window.SmsDataChannel) {
                try {
                    const refreshRequest = {
                        action: 'loadConversation',
                        contactId: contactId,
                        limit: 100, // Get a good number of recent messages
                        sortOrder: 'newest_last',
                        includeRecent: true,
                        forceFresh: true,
                        timestamp: Date.now()
                    };
                    window.SmsDataChannel.postMessage(JSON.stringify(refreshRequest));
                    console.log('📱 Latest conversation data requested from Flutter.');
                } catch (error) {
                    console.error('📱 Failed to request conversation refresh:', error);
                }
            }

            // After requesting data, schedule a robust refresh and scroll sequence.
            // This delay allows time for the async data to arrive from Flutter and be processed.
            setTimeout(() => {
                console.log('📱 Starting post-refresh UI update sequence...');
                if (window.app && window.app.contactManager) {
                    const contact = window.app.contactManager.contacts.get(contactId);
                    if (contact && contact.smsScreen) {
                        try {
                            // Step 1: Force the screen to re-process its messages and content.
                            console.log('📱 Refresh sequence: Step 1 - Refreshing content');
                            if (typeof contact.smsScreen.forceRefresh === 'function') {
                                contact.smsScreen.forceRefresh();
                                console.log('📱 ✅ SMS screen forceRefreshed');
                            } else if (typeof contact.smsScreen.refresh === 'function') {
                                contact.smsScreen.refresh();
                                console.log('📱 ✅ SMS screen refreshed via refresh()');
                            }

                            // Step 2: Explicitly update content to ensure bounds are recalculated
                            if (typeof contact.smsScreen.updateContent === 'function') {
                                contact.smsScreen.updateContent();
                                console.log('📱 ✅ SMS screen content updated via updateContent()');
                            }

                            // Step 3: Force a re-render, which should apply geometry and scroll bounds.
                            console.log('📱 Refresh sequence: Step 2 - Re-rendering');
                            if (typeof contact.smsScreen.render === 'function') {
                                contact.smsScreen.render();
                                console.log('📱 ✅ SMS screen re-rendered');
                            }

                            // Step 4: Scroll to the bottom with our aggressive multi-attempt function.
                            // This needs a slight delay to ensure the render pass is complete.
                            console.log('📱 Refresh sequence: Step 3 - Scrolling to newest');
                            setTimeout(() => {
                                this.scrollToNewestMessages();
                            }, 250); // A little more delay for render to complete.

                        } catch (error) {
                            console.warn('📱 SMS screen refresh sequence failed:', error);
                            // Fallback: just try to scroll anyway as a last resort.
                            this.scrollToNewestMessages();
                        }
                    }
                }
            }, 750); // Increased wait for Flutter data to arrive.
        }

        /**
         * Notify Flutter about SMS mode changes
         */
        notifyFlutterSmsMode(contactId, entering) {
            if (window.ContactActionChannel) {
                try {
                    const modeData = {
                        action: 'smsMode',
                        contactId: contactId,
                        entering: entering,
                        timestamp: Date.now()
                    };
                    console.log('📱 Notifying Flutter of SMS mode change:', modeData);
                    window.ContactActionChannel.postMessage(JSON.stringify(modeData));
                } catch (error) {
                    console.error('📱 Failed to notify Flutter of SMS mode:', error);
                }
            }
        }

        /**
         * Check if currently in SMS interaction mode
         */
        isInSmsInteractionMode() {
            return this.isInSmsMode;
        }

        /**
         * Get active SMS contact ID
         */
        getActiveSmsContactId() {
            return this.activeSmsContactId;
        }

        /**
         * Start keyboard protection to prevent camera movement during text input
         * REFINED APPROACH: Preserve pinch-to-zoom while preventing auto-zoom on text input
         */
        startKeyboardProtection() {
            // Store original viewport height to detect keyboard appearance
            this.originalViewportHeight = window.innerHeight;
            
            // TARGETED VIEWPORT PROTECTION: Only apply anti-zoom during active text input
            this.originalViewportMeta = this.getViewportMeta();
            
            // Apply targeted CSS-based input zoom prevention (not blanket zoom prevention)
            this.applyTargetedInputProtection();
            
            // Store original camera position to force restore if needed
            if (this.camera) {
                this.smsModeCameraPosition = {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                };
            }
            
            // Viewport resize handler with SMS mode protection
            this.keyboardProtectionHandler = () => {
                // Don't interfere if we're in the process of exiting SMS mode
                if (this.isExitingSmsMode) {
                    console.log('📱 SKIPPING keyboard protection - SMS mode is exiting');
                    return;
                }
                
                if (this.isInSmsMode) {
                    const currentHeight = window.innerHeight;
                    const heightDifference = Math.abs(currentHeight - this.originalViewportHeight);
                    
                    // CHECK FOR ORIENTATION CHANGE: Update camera position if orientation changed
                    this.updateSmsPositionForOrientation();
                    
                    if (heightDifference > 50) { // Significant height change indicates keyboard
                        console.log('📱 KEYBOARD DETECTED: Viewport height changed from', this.originalViewportHeight, 'to', currentHeight);
                        console.log('📱 Forcing camera controls to stay disabled during keyboard interaction');
                        
                        // Double-ensure camera controls stay disabled
                        if (this.interactionManager && this.interactionManager.cameraControls) {
                            this.interactionManager.cameraControls.enabled = false;
                            this.interactionManager.cameraControls.enableRotate = false;
                            this.interactionManager.cameraControls.enablePan = false;
                            this.interactionManager.cameraControls.enableZoom = false;
                        }
                        
                        // FORCE CAMERA POSITION RESTORATION: If camera moved due to viewport changes
                        if (this.camera && this.smsModeCameraPosition) {
                            const currentPos = this.camera.position;
                            const storedPos = this.smsModeCameraPosition;
                            const positionDrift = Math.abs(currentPos.x - storedPos.x) + 
                                                Math.abs(currentPos.y - storedPos.y) + 
                                                Math.abs(currentPos.z - storedPos.z);
                            
                            if (positionDrift > 0.1) {
                                console.log('📱 CAMERA DRIFT DETECTED: Forcing position restoration');
                                console.log('📱 Current:', currentPos.x.toFixed(2), currentPos.y.toFixed(2), currentPos.z.toFixed(2));
                                console.log('📱 Stored:', storedPos.x.toFixed(2), storedPos.y.toFixed(2), storedPos.z.toFixed(2));
                                
                                this.camera.position.set(storedPos.x, storedPos.y, storedPos.z);
                                this.camera.updateMatrixWorld();
                                console.log('📱 Camera position forcibly restored');
                            }
                        }
                    }
                }
            };
            
            // Add event listeners with SMS protection
            window.addEventListener('resize', this.keyboardProtectionHandler);
            window.addEventListener('orientationchange', this.keyboardProtectionHandler);
            
            // REFINED PROTECTION: Only prevent camera interference, allow pinch-to-zoom on SMS screen
            this.smartTouchHandler = (event) => {
                if (this.isInSmsMode && event.touches && event.touches.length > 1) {
                    // Check if the multi-touch is happening on the SMS screen area
                    const isOnSmsScreen = this.isMultiTouchOnSmsScreen(event);
                    
                    if (!isOnSmsScreen) {
                        // Multi-touch outside SMS screen could interfere with camera - allow it but monitor
                        console.log('📱 Multi-touch detected outside SMS screen - allowing for pinch-to-zoom');
                    } else {
                        // Multi-touch on SMS screen - allow pinch-to-zoom for accessibility
                        console.log('📱 Multi-touch on SMS screen - allowing for user zoom accessibility');
                    }
                }
            };
            
            if (this.renderer && this.renderer.domElement) {
                this.renderer.domElement.addEventListener('touchstart', this.smartTouchHandler, { passive: true });
                this.renderer.domElement.addEventListener('touchmove', this.smartTouchHandler, { passive: true });
            }
            
            console.log('📱 REFINED keyboard protection active - preventing auto-zoom while preserving pinch-to-zoom');
        }

        /**
         * Stop keyboard protection monitoring
         * REFINED APPROACH: Clean up targeted protections while preserving normal zoom
         */
        stopKeyboardProtection() {
            if (this.keyboardProtectionHandler) {
                window.removeEventListener('resize', this.keyboardProtectionHandler);
                window.removeEventListener('orientationchange', this.keyboardProtectionHandler);
                this.keyboardProtectionHandler = null;
                console.log('📱 Keyboard protection stopped');
            }
            
            // Remove smart touch handling
            if (this.smartTouchHandler && this.renderer && this.renderer.domElement) {
                this.renderer.domElement.removeEventListener('touchstart', this.smartTouchHandler);
                this.renderer.domElement.removeEventListener('touchmove', this.smartTouchHandler);
                this.smartTouchHandler = null;
                console.log('📱 Smart touch handling removed');
            }
            
            // Remove targeted input protection
            this.removeTargetedInputProtection();
            
            // Clear stored camera position
            this.smsModeCameraPosition = null;
        }

        /**
         * Get current viewport meta tag content
         */
        getViewportMeta() {
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            return viewportMeta ? viewportMeta.getAttribute('content') : null;
        }

        /**
         * Set viewport meta tag to prevent zoom ONLY during active text input
         */
        setTextInputViewportMeta() {
            let viewportMeta = document.querySelector('meta[name="viewport"]');
            if (!viewportMeta) {
                viewportMeta = document.createElement('meta');
                viewportMeta.name = 'viewport';
                document.head.appendChild(viewportMeta);
            }
            
            // Set strict no-zoom viewport only for text input
            viewportMeta.setAttribute('content', 
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover'
            );
            console.log('📱 Text input anti-zoom viewport meta applied');
        }

        /**
         * Update SMS camera position when orientation changes
         */
        updateSmsPositionForOrientation() {
            if (!this.isInSmsMode || !this.activeSmsScreen || !this.camera) {
                return;
            }

            // Get the SMS screen camera manager from interaction manager
            const smsScreenCameraManager = this.interactionManager?.smsScreenCameraManager;
            if (!smsScreenCameraManager) {
                console.log('📱 No SMS camera manager available for orientation update');
                return;
            }

            console.log('📱 Updating SMS camera position for orientation change');

            // Recalculate optimal camera position for current orientation
            const optimalCameraData = smsScreenCameraManager.calculateOptimalCameraPosition(this.activeSmsScreen);
            
            if (optimalCameraData) {
                // Apply the new camera positioning
                const positioningSuccess = smsScreenCameraManager.applyCameraPositioning(optimalCameraData);
                
                if (positioningSuccess) {
                    // Update stored SMS mode camera position
                    this.smsModeCameraPosition = {
                        x: this.camera.position.x,
                        y: this.camera.position.y,
                        z: this.camera.position.z
                    };
                    console.log('📱 SMS camera position updated for orientation change');
                } else {
                    console.warn('📱 Failed to apply new camera positioning for orientation');
                }
            }
        }

        /**
         * Restore normal viewport that allows pinch-to-zoom
         */
        restoreNormalViewportMeta() {
            if (this.originalViewportMeta) {
                this.setViewportMeta(this.originalViewportMeta);
                console.log('📱 Normal viewport meta restored - pinch-to-zoom available');
            } else {
                // Set a default viewport that allows zoom
                let viewportMeta = document.querySelector('meta[name="viewport"]');
                if (viewportMeta) {
                    viewportMeta.setAttribute('content', 
                        'width=device-width, initial-scale=1.0, user-scalable=yes, viewport-fit=cover'
                    );
                    console.log('📱 Default zoom-enabled viewport meta applied');
                }
            }
        }

        /**
         * Set specific viewport meta content
         */
        setViewportMeta(content) {
            let viewportMeta = document.querySelector('meta[name="viewport"]');
            if (viewportMeta && content) {
                viewportMeta.setAttribute('content', content);
            }
        }

        /**
         * Apply targeted CSS styles to prevent auto-zoom on input focus only
         * PRESERVES pinch-to-zoom functionality while preventing iOS auto-zoom
         */
        applyTargetedInputProtection() {
            // Create or update targeted protection styles
            let styleElement = document.getElementById('sms-input-protection');
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = 'sms-input-protection';
                document.head.appendChild(styleElement);
            }
            
            styleElement.textContent = `
                /* Targeted Input Zoom Protection - Preserves Pinch-to-Zoom */
                body.sms-input-active {
                    /* Only prevent auto-zoom on text input focus, allow manual zoom */
                    touch-action: manipulation !important;
                }
                
                /* Prevent iOS auto-zoom on input focus specifically */
                body.sms-input-active input,
                body.sms-input-active textarea {
                    font-size: 16px !important;
                    transform: scale(1) !important;
                    transform-origin: 0 0 !important;
                    zoom: 1 !important;
                    -webkit-text-size-adjust: 100% !important;
                }
                
                /* Allow normal interaction on SMS screen for pinch-to-zoom */
                canvas {
                    touch-action: pan-x pan-y pinch-zoom !important;
                }
                
                /* Preserve text scaling for accessibility */
                body.sms-input-active * {
                    -webkit-text-size-adjust: 100% !important;
                    text-size-adjust: 100% !important;
                }
            `;
            
            console.log('📱 Targeted input protection applied - preserves pinch-to-zoom');
        }

        /**
         * Remove targeted input protection styles
         */
        removeTargetedInputProtection() {
            document.body.classList.remove('sms-input-active');
            
            const styleElement = document.getElementById('sms-input-protection');
            if (styleElement) {
                styleElement.remove();
            }
            
            console.log('📱 Targeted input protection removed - normal behavior restored');
        }

        /**
         * Check if multi-touch gesture is happening on SMS screen area
         */
        isMultiTouchOnSmsScreen(event) {
            if (!event.touches || event.touches.length < 2 || !this.activeSmsScreen) {
                return false;
            }
            
            const rect = this.renderer.domElement.getBoundingClientRect();
            
            // Check if both touch points are within SMS screen bounds
            for (let i = 0; i < event.touches.length; i++) {
                const touch = event.touches[i];
                const mouse = {
                    x: ((touch.clientX - rect.left) / rect.width) * 2 - 1,
                    y: -((touch.clientY - rect.top) / rect.height) * 2 + 1
                };
                
                this.raycaster.setFromCamera(mouse, this.camera);
                const intersects = this.raycaster.intersectObject(this.activeSmsScreen, true);
                
                if (intersects.length === 0) {
                    // At least one touch is outside SMS screen
                    return false;
                }
            }
            
            return true; // All touches are on SMS screen
        }
        
        /**
         * Update text input from Flutter keyboard using a global event bus.
         * @param {string} text - The text input from user
         * @param {string} contactId - The contact ID for the conversation
         */
        updateTextInput(text, contactId) {
            if (!this.isInSmsMode || !this.activeSmsContactId) {
                // Silently return if not in a state to process text
                return;
            }
            if (contactId && contactId !== this.activeSmsContactId) {
                console.log(`📱 [DIAG] Ignoring text update for wrong contact. Expected: ${this.activeSmsContactId}, Got: ${contactId}`);
                return;
            }
            
            console.log(`📱 [EVENT] Dispatching 'sms-text-input' for contact ${this.activeSmsContactId} with text: "${text}"`);
            
            // Use the robust event bus pattern to avoid minification issues
            window.dispatchEvent(new CustomEvent('sms-text-input', {
                detail: {
                    contactId: this.activeSmsContactId,
                    text: text
                }
            }));
        }

        /**
         * ENHANCED: Monitor Flutter's SmsInputChannel for text updates
         * This captures text from Flutter's input response channel as fallback
         */
        monitorFlutterInputChannel() {
            console.log('📱 [ENHANCED] Setting up Flutter input channel monitoring...');
            
            // Monitor for existing SMS input response events that might contain text
            window.addEventListener('flutter-sms-input-response', (event) => {
                if (!this.isInSmsMode || !this.activeSmsContactId) return;
                
                try {
                    const data = event.detail;
                    console.log('📱 [ENHANCED] Flutter input response intercepted:', data);
                    
                    // Check if this response contains text content
                    if (data && typeof data.text === 'string') {
                        console.log('📱 [ENHANCED] Found text in Flutter response:', data.text);
                        this.updateTextInput(data.text, data.contactId || this.activeSmsContactId);
                    }
                    
                    // Also check for currentText field
                    if (data && typeof data.currentText === 'string') {
                        console.log('📱 [ENHANCED] Found currentText in Flutter response:', data.currentText);
                        this.updateTextInput(data.currentText, data.contactId || this.activeSmsContactId);
                    }
                    
                    // 🔧 NEW: Handle get_current_text response specifically
                    if (data && data.success && data.contactId === this.activeSmsContactId) {
                        if (typeof data.text === 'string') {
                            console.log('📱 [ENHANCED] get_current_text response received:', data.text);
                            this.updateTextInput(data.text, data.contactId);
                        }
                    }
                } catch (error) {
                    console.warn('📱 [ENHANCED] Error processing Flutter input response:', error);
                }
            });
            
            // Also monitor the main SMS input channel for any text data
            if (window.SmsInputChannel) {
                console.log('📱 [ENHANCED] Adding SmsInputChannel monitor...');
                
                // Create a wrapper to intercept messages
                const originalPostMessage = window.SmsInputChannel.postMessage;
                window.SmsInputChannel.postMessage = function(message) {
                    try {
                        const data = JSON.parse(message);
                        if (data.action === 'get_current_text') {
                            console.log('📱 [ENHANCED] Intercepted get_current_text request');
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                    return originalPostMessage.call(this, message);
                };
            }
            
            console.log('📱 [ENHANCED] Flutter input channel monitoring activated');
            
            // UNIVERSAL: Also monitor DOM for any text input changes
            this.setupUniversalTextCapture();
        }

        /**
         * UNIVERSAL: Set up comprehensive text capture from all possible sources
         */
        setupUniversalTextCapture() {
            console.log('📱 [UNIVERSAL] Setting up comprehensive text capture...');
            
            // Monitor ALL custom events that might contain text
            const textEventTypes = [
                'flutter-text-input',      // 📤 PRIMARY: Real-time text from Flutter TextEditingController
                'flutter-text-change',     // 📤 ALTERNATIVE: Text change events
                'flutter-input-update',    // 📤 ALTERNATIVE: Input update events
                // REMOVED 'sms-text-input' to prevent infinite recursion - this event is OUTPUT, not INPUT
                'keyboard-input',          // 📤 FALLBACK: Keyboard events
                'input-change'             // 📤 FALLBACK: Generic input events
            ];
            
            textEventTypes.forEach(eventType => {
                window.addEventListener(eventType, (event) => {
                    if (!this.isInSmsMode || !this.activeSmsContactId) return;
                    
                    console.log(`📱 [UNIVERSAL] Captured ${eventType} event:`, event.detail);
                    
                    // Handle Flutter's encoded text (as suggested by expert)
                    if (event.detail && typeof event.detail.text === 'string') {
                        let text = event.detail.text;
                        
                        // 🔧 NEW: Decode URI-encoded text from Flutter
                        try {
                            text = decodeURIComponent(text);
                            console.log(`📱 [UNIVERSAL] Decoded text from ${eventType}:`, text);
                        } catch (e) {
                            // If decode fails, use original text
                            console.log(`📱 [UNIVERSAL] Using original text from ${eventType}:`, text);
                        }
                        
                        this.updateTextInput(text, event.detail.contactId);
                    }
                });
            });
            
            // Monitor for any input/textarea elements that might be created dynamically
            const observer = new MutationObserver((mutations) => {
                if (!this.isInSmsMode) return;
                
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            const inputs = node.querySelectorAll ? node.querySelectorAll('input, textarea') : [];
                            inputs.forEach(input => {
                                input.addEventListener('input', (e) => {
                                    if (this.isInSmsMode && this.activeSmsContactId) {
                                        console.log('📱 [UNIVERSAL] DOM input detected:', e.target.value);
                                        this.updateTextInput(e.target.value, this.activeSmsContactId);
                                    }
                                });
                            });
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            this.textCaptureObserver = observer;
            
            console.log('📱 [UNIVERSAL] Comprehensive text capture activated');
        }

        /**
         * DIRECT REQUEST: Ask Flutter for current text content
         */
        requestCurrentTextFromFlutter() {
            if (!this.isInSmsMode || !this.activeSmsContactId) return;
            
            console.log('📱 [DIRECT] Requesting current text from Flutter...');
            
            if (window.SmsInputChannel) {
                try {
                    const request = {
                        action: 'get_current_text',
                        contactId: this.activeSmsContactId,
                        timestamp: Date.now()
                    };
                    console.log('📱 [DIRECT] Sending text request:', request);
                    window.SmsInputChannel.postMessage(JSON.stringify(request));
                    
                    // 🔧 NEW: Set up one-time response listener for this specific request
                    const responseHandler = (event) => {
                        try {
                            const data = event.detail;
                            if (data && data.contactId === this.activeSmsContactId && data.success) {
                                console.log('📱 [DIRECT] get_current_text response received:', data.text);
                                if (typeof data.text === 'string') {
                                    this.updateTextInput(data.text, data.contactId);
                                }
                                // Remove this one-time listener
                                window.removeEventListener('flutter-sms-input-response', responseHandler);
                            }
                        } catch (error) {
                            console.warn('📱 [DIRECT] Error processing get_current_text response:', error);
                        }
                    };
                    
                    // Add temporary response listener
                    window.addEventListener('flutter-sms-input-response', responseHandler);
                    
                    // Remove listener after 2 seconds to prevent memory leaks
                    setTimeout(() => {
                        window.removeEventListener('flutter-sms-input-response', responseHandler);
                    }, 2000);
                    
                } catch (error) {
                    console.error('📱 [DIRECT] Failed to request current text:', error);
                }
            }
        }

        /**
         * Process text input for validation or special commands
         * @param {string} text - The text input from user
         * @param {string} contactId - The contact ID for the conversation
         */
        processTextInput(text, contactId) {
            if (!text || typeof text !== 'string') {
                return;
            }
            
            // Handle special commands or validation
            if (text.trim().toLowerCase() === '/exit' || text.trim().toLowerCase() === '/quit') {
                this.exitSmsMode();
                return;
            }
            
            // Additional text processing could go here
            console.log('📱 Text input processed for contact:', contactId);
        }

        /**
         * 🔧 NEW: Test Flutter-JS communication
         * Call this from browser console to verify the connection
         */
        testFlutterConnection() {
            console.log('📱 [TEST] Testing Flutter-JS communication...');
            
            // Test 1: Send a test event from JS to Flutter
            if (window.SmsInputChannel) {
                try {
                    const testRequest = {
                        action: 'test_connection',
                        contactId: this.activeSmsContactId || 'test-contact',
                        timestamp: Date.now(),
                        testData: 'JavaScript calling Flutter'
                    };
                    console.log('📱 [TEST] Sending test message to Flutter:', testRequest);
                    window.SmsInputChannel.postMessage(JSON.stringify(testRequest));
                } catch (error) {
                    console.error('📱 [TEST] Failed to send test message:', error);
                }
            } else {
                console.warn('📱 [TEST] SmsInputChannel not available');
            }
            
            // Test 2: Simulate Flutter sending text to JS
            console.log('📱 [TEST] Simulating Flutter text input event...');
            const testEvent = new CustomEvent('flutter-text-input', {
                detail: {
                    contactId: this.activeSmsContactId || 'test-contact',
                    text: 'Test message from simulated Flutter'
                }
            });
            window.dispatchEvent(testEvent);
            
            // Test 3: Test get_current_text request
            if (this.isInSmsMode && this.activeSmsContactId) {
                console.log('📱 [TEST] Testing get_current_text request...');
                this.requestCurrentTextFromFlutter();
            }
            
            console.log('📱 [TEST] Test completed. Check logs above for results.');
        }

    }

    // Add SMS Interaction Manager to the global app scope
    window.SmsInteractionManager = SmsInteractionManager;

})();

// --- ENHANCED SMS DIAGNOSTICS ---
// This block will wait for the app to initialize and then wrap key functions
// to provide detailed logging for debugging the SMS input issue.
(function() {
    let attempts = 0;
    const maxAttempts = 10; // Try for 20 seconds
    const interval = 2000; // 2 seconds

    function initSmsDiagnostics() {
        attempts++;
        if (window.app && window.app.interactionManager && window.app.interactionManager.smsInteractionManager) {
            const manager = window.app.interactionManager.smsInteractionManager;
            
            console.log('[DIAGNOSTICS] Activating SMS Interaction Manager diagnostics...');

            // CATCH-ALL listener for text events from Flutter.
            const handleTextEvent = (evt) => {
                console.log(`[DIAGNOSTICS] Received event: ${evt.type}`, evt.detail);
                // Also try to update the text input display directly from here as a failsafe
                if (evt.detail && typeof evt.detail.text !== 'undefined' && manager.updateTextInput) {
                     console.log(`[DIAGNOSTICS] Failsafe: Forcing text update with: "${evt.detail.text}"`);
                     manager.updateTextInput(evt.detail.text, evt.detail.contactId);
                }
            };

            window.addEventListener('flutter-text-input', handleTextEvent);
            window.addEventListener('flutter-text-change', handleTextEvent);

            console.log('[DIAGNOSTICS] SMS diagnostics are now active. Listening for text events.');

        } else if (attempts < maxAttempts) {
            console.log(`[DIAGNOSTICS] smsInteractionManager not found. Retrying in ${interval/1000}s... (Attempt ${attempts}/${maxAttempts})`);
            setTimeout(initSmsDiagnostics, interval);
        } else {
            console.error(`[DIAGNOSTICS] Failed to initialize after ${maxAttempts} attempts: smsInteractionManager not found on window.app.interactionManager.`);
        }
    }

    // Start the initialization process after a short delay
    setTimeout(initSmsDiagnostics, 500);
})();
