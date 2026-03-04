/**
 * @file smsIntegrationManager.js
 * @description Manages the integration between the JavaScript frontend and the Flutter backend
 * for SMS functionality. It handles state transitions, user input, and data flow for
 * "real SMS mode" and a "fallback mode".
 *
 * Expert Recommendations Implemented:
 * 1.  **State Transition Logic**: Manages `realSmsReady` state, gated activation, and deferred mode selection.
 * 2.  **Input Activation Signal**: Differentiates gestures and triggers keyboard via Flutter channel.
 * 3.  **Connection Handshake**: Follows a clear sequence: test -> activate -> switch UI.
 * 4.  **Data Flow**: Implements listeners and handlers for text input, sending, and receiving.
 */

class SmsIntegrationManager {
    constructor() {
        // --- State Management ---
        this.smsMode = 'initializing'; // 'initializing', 'fallback', 'real'
        this.isRealSmsEnabled = false;
        this.realSmsReady = false;

        // --- Connection Management ---
        this.connectionEstablished = false;
        this.connectionTestInterval = null;

        // --- Input Management (NEW: Using dedicated input manager) ---
        this.inputManager = null; // Will be initialized after SmsInputManager is available
        // Legacy properties for backward compatibility during transition
        this.textInputBuffer = '';
        this.renderInputActive = false;
        this.lastTap = 0;
        this.doubleTapTimeout = 300; // ms
        this.lastRenderState = null; // For render optimization
        this.textMonitoringInterval = null; // For real-time text updates

        // --- Canvas & UI ---
        // These would be configured based on the actual SMS screen's canvas
        this.inputAreaCoordinates = { x: 50, y: 800, width: 800, height: 100 };
        
        // --- Current Contact ---
        this.currentContactId = null; // Will be set when SMS screen is accessed

        console.log("✅ SMS Integration Manager instantiated.");
    }

    /**
     * Creates a hidden textarea element to help with keyboard focus.
     * This is a more robust implementation based on expert feedback.
     */
    createHiddenInputElement() {
        if (this.hiddenInput) {
            this.hiddenInput.remove();
        }

        this.hiddenInput = document.createElement('textarea');
        this.hiddenInput.id = 'hidden-sms-input';
        
        // Apply foolproof styling to make it completely invisible but focusable
        Object.assign(this.hiddenInput.style, {
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: '0px',
            height: '0px',
            opacity: '0',
            pointerEvents: 'none',
            zIndex: '-1',
            fontSize: '0',
            border: 'none',
            background: 'transparent',
            resize: 'none',
            overflow: 'hidden',
            padding: '0',
            margin: '0'
        });

        document.body.appendChild(this.hiddenInput);
        console.log('⌨️ Created foolproof hidden textarea for keyboard focus.');
    }

    /**
     * Initializes the SMS system.
     * This is the main entry point.
     */
    initialize() {
        console.log("🚀 Initializing SMS Integration Manager...");
        this.initializeInputManager();
        this.setupEventListeners();
        this.testFlutterConnection();
    }

    /**
     * Initialize the input manager and set up callbacks
     */
    initializeInputManager() {
        console.log("🎯 Initializing SMS Input Manager integration...");
        
        // Wait for SmsInputManager to be available
        if (typeof window.SmsInputManager !== 'undefined') {
            this.inputManager = new window.SmsInputManager();
            
            // Set up callbacks from input manager to main manager
            this.inputManager.setOnInputTextUpdated((text) => {
                // Keep legacy property in sync for backward compatibility
                this.textInputBuffer = text;
                console.log(`📱 Input manager text updated: "${text}"`);
            });
            
            this.inputManager.setOnSendButtonPressed((text) => {
                console.log(`📤 Input manager send button pressed with text: "${text}"`);
                if (this.currentContactId && text.trim().length > 0) {
                    this.sendMessage(this.currentContactId, text);
                }
            });

            // Set up camera positioning callback for SMS view maximization
            this.inputManager.setCameraPositionCallback((contactId) => {
                console.log(`📱 Camera positioning requested for contact: ${contactId}`);
                // Ensure camera is positioned optimally for SMS viewing
                this.ensureOptimalSmsViewingPosition(contactId);
            });
            
            console.log("✅ SMS Input Manager initialized with callbacks");
        } else {
            console.warn("⚠️ SmsInputManager not available yet, will retry...");
            // Retry after a short delay
            setTimeout(() => {
                this.initializeInputManager();
            }, 100);
        }
    }

    /**
     * Sets up global event listeners for communication from Flutter.
     */
    setupEventListeners() {
        console.log("🎧 Setting up Flutter event listeners...");

        // PHASE 1: Use the new Text Input Bridge for better text handling
        // Activate the text input bridge when this manager is ready
        if (window.smsTextInputBridge) {
            console.log("🎧 SMS Text Input Bridge detected - using enhanced text input");
        }

        // Listen for enhanced text events from the bridge
        window.addEventListener('sms-text-updated', (event) => {
            console.log(`⌨️ Enhanced text input from bridge: "${event.detail.text}"`);
            this.handleChannelTextInput(event.detail.text, event.detail.contactId);
        });

        // Keep original listener for backward compatibility
        window.addEventListener('flutter-text-input', e => {
            console.log(`⌨️ Received text from Flutter: "${e.detail.text}"`);
            this.handleChannelTextInput(e.detail.text, e.detail.contactId);
        });

        // === DEBUG LISTENERS FOR KEYBOARD AND TEXT INPUT ISSUES ===
        
        // Listen for ALL window events for debugging
        const originalDispatchEvent = window.dispatchEvent;
        window.dispatchEvent = function(event) {
            if (event.type && (event.type.includes('flutter') || event.type.includes('sms') || event.type.includes('text') || event.type.includes('keyboard'))) {
                console.log(`🛠️ [DEBUG] Window event dispatched: ${event.type}`, event);
            }
            return originalDispatchEvent.call(this, event);
        };

        // Catch-all listener for any text-related events
        window.addEventListener('text-input', (event) => {
            console.log("🛠️ [DEBUG] Received 'text-input' event:", event);
        });

        window.addEventListener('keyboard-input', (event) => {
            console.log("🛠️ [DEBUG] Received 'keyboard-input' event:", event);
        });

        // Listen for native input events that might be sent instead
        window.addEventListener('input', (event) => {
            console.log("🛠️ [DEBUG] Received native 'input' event:", event);
        });

        // Listen for any Flutter WebView postMessage events
        window.addEventListener('message', (event) => {
            if (event.data && typeof event.data === 'string') {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'flutter-text' || data.action === 'text_input' || data.text !== undefined) {
                        console.log("🛠️ [DEBUG] Received postMessage with potential text data:", data);
                    }
                } catch (e) {
                    // Not JSON, ignore
                }
            }
        });

        // Debug: Monitor DOM for any hidden input elements that might be created
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA')) {
                        console.log("🛠️ [DEBUG] New input element added to DOM:", node);
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

        console.log("🛠️ [DEBUG] Enhanced debugging listeners installed for keyboard/text input issues");
        
        // DISABLED: SMS Event Router now handles flutter-sms-data events directly
        // This prevents duplicate processing and competing event handlers
        /*
        window.addEventListener('flutter-sms-data', (event) => {
            console.log("📨 [SmsIntegrationManager] Received flutter-sms-data event:", event.detail);
            
            if (event.detail && event.detail.action === 'incoming_message') {
                console.log("📨 [SmsIntegrationManager] Processing incoming message from flutter-sms-data");
                
                // Extract message data
                const messageData = {
                    phoneNumber: event.detail.message?.phoneNumber || event.detail.contactId,
                    message: event.detail.message?.text,
                    timestamp: event.detail.message?.timestamp || Date.now()
                };
                
                // Process through handleIncomingMessage
                this.handleIncomingMessage(messageData);
            }
        });
        */
        
        // ENHANCED: Also listen for Flutter SMS input responses that might contain text
        window.addEventListener('flutter-sms-input-response', (event) => {
            if (event.detail) {
                console.log("📱 SMS Input Response:", event.detail);
                
                // Check if this response contains text content
                if (event.detail.text !== undefined) {
                    console.log(`⌨️ Received text via SMS input response: "${event.detail.text}"`);
                    this.handleChannelTextInput(event.detail.text, event.detail.contactId || this.currentContactId);
                }
                
                // Handle keyboard state changes
                if (event.detail.action === 'keyboard_shown') {
                    console.log("📱 Keyboard state changed: shown");
                    if (this.inputManager) {
                        this.inputManager.setupRealTimeTextMonitoring();
                    } else {
                        console.warn("⚠️ Input manager not ready to set up real-time monitoring.");
                    }
                } else if (event.detail.action === 'keyboard_hidden') {
                    console.log("📱 Keyboard state changed: hidden");
                    if (this.textMonitoringInterval) {
                        clearInterval(this.textMonitoringInterval);
                        this.textMonitoringInterval = null;
                    }
                } else if (event.detail.action === 'text_changed' && event.detail.text !== undefined) {
                    // Handle text change events from Flutter
                    console.log(`⌨️ Text changed event: "${event.detail.text}"`);
                    this.handleChannelTextInput(event.detail.text, event.detail.contactId || this.currentContactId);
                } else if (!event.detail.success && event.detail.error === 'Unknown method') {
                    // Ignore the unknown method errors to reduce console spam
                    return;
                } else if (!event.detail.action && !event.detail.text && !event.detail.success) {
                    // Only log unhandled events that aren't empty responses
                    if (Object.keys(event.detail).length > 0) {
                        console.log("📱 Unhandled input event:", event.detail);
                    }
                }
            }
        });

        // Listener for incoming SMS messages from Flutter
        window.addEventListener('incomingSms', e => {
            console.log(`📥 Received new SMS from: ${e.detail.sender}`);
            this.handleIncomingMessage({
                phoneNumber: e.detail.sender,
                message: e.detail.body,
                timestamp: Date.now()
            });
        });

        console.log("👍 Event listeners ready.");
    }

    /**
     * Handle incoming SMS message from Flutter
     * This method was missing from the refactoring!
     */
    handleIncomingMessage(data) {
        try {
            console.log('📨 [SmsIntegrationManager] Raw incoming message data:', data);
            
            const { phoneNumber, message, timestamp } = data;
            
            if (!phoneNumber || !message) {
                console.error('❌ [SmsIntegrationManager] Invalid message data - missing phoneNumber or message');
                return;
            }

            // Clean the phone number
            const cleanedPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
            console.log(`📨 [SmsIntegrationManager] Cleaned phone number: ${cleanedPhoneNumber}`);
            
            // Find contact by phone number using the correct contact manager
            let contactId = null;
            
            if (window.app?.contactManager?.contacts) {
                // Search through contacts to find matching phone number
                for (const [cId, contact] of window.app.contactManager.contacts) {
                    if (contact.contactData && contact.contactData.phoneNumber === cleanedPhoneNumber) {
                        contactId = cId;
                        console.log(`📨 [SmsIntegrationManager] Found contact: ${cId} for phone: ${cleanedPhoneNumber}`);
                        break;
                    }
                }
            }
            
            if (!contactId) {
                console.log(`📨 [SmsIntegrationManager] No contact found for phone number: ${cleanedPhoneNumber}`);
                // Could still handle as unknown contact - use phone number as contact ID
                contactId = cleanedPhoneNumber;
            }
            
            console.log(`📨 [SmsIntegrationManager] Message mapped to contact: ${contactId}`);
            
            // Process the message through SMS Core Manager
            window.sms_core_manager.handleMessageReceived({
                contactId,
                phoneNumber,
                message: {
                    text: message,
                    timestamp: timestamp || Date.now(),
                    isIncoming: true
                }
            });
            
            // CRITICAL FIX: Also refresh conversation to ensure real-time display after incoming message
            console.log(`📨 [SmsIntegrationManager] Refreshing conversation for ${contactId} after incoming message`);
            setTimeout(() => {
                this.getConversation(contactId, true); // Force refresh to get updated conversation
            }, 100); // Small delay to ensure message is processed
            
        } catch (error) {
            console.error('❌ [SmsIntegrationManager] Error processing incoming message:', error);
        }
    }

    /**
     * Setup listener for Flutter SMS status responses
     */
    setupFlutterResponseListener() {
        console.log("🎧 Setting up Flutter SMS status response listener...");
        
        // Create a named function so we can remove it later
        const handleSmsStatus = (event) => {
            console.log("📱 Received SMS status response:", event.detail);
            
            if (event.detail && event.detail.success) {
                // Connection test successful
                this.handleFlutterConnectionResponse({ 
                    success: true, 
                    hasPermissions: event.detail.hasPermissions
                });
                
                // Remove the listener after successful connection
                if (this.connectionEstablished) {
                    window.removeEventListener('flutter-sms-status', handleSmsStatus);
                    console.log("🎧 Removed SMS status listener after successful connection");
                }
            } else {
                // Connection test failed
                this.handleFlutterConnectionResponse({ success: false });
            }
        };
        
        // Listen for SMS status responses from Flutter
        window.addEventListener('flutter-sms-status', handleSmsStatus);
    }

    /**
     * Step 1: Test the connection to the Flutter backend.
     */
    testFlutterConnection() {
        console.log("🤝 [1/3] Testing Flutter connection...");

        // Don't start testing if connection is already established
        if (this.connectionEstablished) {
            console.log("✅ Connection already established, skipping test");
            return;
        }

        // --- FLUTTER INTEGRATION POINT ---
        // Use the existing SMS channel system that's already working
        if (window.SmsStatusChannel) {
            console.log("📱 Found existing SMS Status Channel, testing connection...");
            
            // Set up listener for the response first
            this.setupFlutterResponseListener();
            
            // Start connection testing with interval
            this.connectionTestInterval = setInterval(() => {
                // Stop testing if connection is established
                if (this.connectionEstablished) {
                    console.log("✅ Connection established, stopping connection tests");
                    clearInterval(this.connectionTestInterval);
                    this.connectionTestInterval = null;
                    return;
                }
                
                // Use the existing channel to test connection
                const testMessage = {
                    messageId: `sms_${Date.now()}_test`,
                    action: 'test_connection',
                    timestamp: Date.now()
                };
                
                try {
                    console.log("📱 Sending connection test:", testMessage.messageId);
                    window.SmsStatusChannel.postMessage(JSON.stringify(testMessage));
                } catch (error) {
                    console.error("❌ Failed to send test message:", error);
                    this.activateFallbackMode();
                }
            }, 500); // Test every 500ms
            
            // Set a timeout for overall connection test
            setTimeout(() => {
                if (!this.connectionEstablished) {
                    console.warn("⚠️ Flutter connection test timeout. Activating fallback mode.");
                    if (this.connectionTestInterval) {
                        clearInterval(this.connectionTestInterval);
                        this.connectionTestInterval = null;
                    }
                    this.activateFallbackMode();
                }
            }, 3000);
                
        } else {
            console.warn("⚠️ SMS Status Channel not found. Activating fallback mode.");
            this.activateFallbackMode();
        }
    }

    /**
     * Step 2: Handle the response from the connection test.
     * @param {object} response - The response from Flutter. e.g., { success: true, permissions: 'granted' }
     */
    handleFlutterConnectionResponse(response) {
        console.log("🤝 [2/3] Received Flutter connection response:", response);
        
        // Check if we already processed a successful connection
        if (this.connectionEstablished) {
            console.log("✅ SMS connection already established, ignoring duplicate response");
            return;
        }
        
        if (response && response.success && response.hasPermissions) {
            this.connectionEstablished = true;
            this.isRealSmsEnabled = true;
            
            // Stop connection testing
            if (this.connectionTestInterval) {
                clearInterval(this.connectionTestInterval);
                this.connectionTestInterval = null;
                console.log("🛑 Stopped connection testing - connection established");
            }
            
            this.activateRealSmsMode();
        } else {
            console.error("❌ Flutter connection failed or permissions denied.");
            this.activateFallbackMode();
        }
    }

    /**
     * Step 3a: Activate "Real SMS Mode".
     */
    activateRealSmsMode() {
        console.log("✅ [3/3] Activating Real SMS Mode.");
        this.smsMode = 'real';
        this.realSmsReady = true;
        // Potentially hide fallback UI elements and show real ones
    }

    /**
     * Step 3b: Activate "Fallback Mode".
     */
    activateFallbackMode() {
        console.log("🔶 [3/3] Activating Fallback Mode.");
        this.smsMode = 'fallback';
        this.realSmsReady = false;
        // Show UI elements indicating fallback mode (e.g., a "No connection" message)
    }


    /**
     * Checks if the real SMS functionality is available and ready.
     * @returns {boolean}
     */
    isRealSmsAvailable() {
        console.log(`🤔 Checking if real SMS is available: ${this.realSmsReady}`);
        return this.realSmsReady;
    }


    /**
     * Handles tap events on the canvas to differentiate single vs. double taps.
     * @param {Event} event - The tap/click event.
     */
    handleTap(event) {
        console.log("📱 SMS Integration Manager handling tap event:", event);
        
        // Extract contact ID from the event if available
        if (event && event.target && event.target.closest) {
            const smsElement = event.target.closest('[data-contact-id]');
            if (smsElement) {
                this.currentContactId = smsElement.getAttribute('data-contact-id');
                console.log("📱 Set current contact ID:", this.currentContactId);
            }
        }
        
        const currentTime = new Date().getTime();
        const timeSinceLastTap = currentTime - this.lastTap;

        if (timeSinceLastTap < this.doubleTapTimeout) {
            // --- Double Tap Detected ---
            console.log("⚡ Double tap detected. Passing to zoom handler.");
            // This should be handled by the interaction manager for zooming.
            // e.g., window.interactionManager.handleDoubleClick(event);
            this.lastTap = 0; // Reset tap tracking
        } else {
            // --- Single Tap Detected ---
            this.lastTap = currentTime;
            console.log("💧 Single tap detected.");

            // We need to get coordinates relative to the canvas
            const canvas = event.target;
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Check if tap is on text input area
            if (this.isInputArea(x, y)) {
                this.handleTextInputTap();
            } else if (this.isOnSendButton(x, y)) {
                this.handleSendButtonTap();
            }
        }
    }

    /**
     * Check if tap is on the send button
     * Delegated to SMS input manager.
     * @param {number} x - The x-coordinate of the tap
     * @param {number} y - The y-coordinate of the tap
     * @returns {boolean}
     */
    isOnSendButton(x, y) {
        if (this.inputManager) {
            return this.inputManager.isOnSendButton(x, y);
        } else {
            console.warn("⚠️ Input manager not available for send button detection");
            return false;
        }
    }

    /**
     * Handle send button tap
     */
    handleSendButtonTap() {
        console.log("📤 Send button tapped!");
        
        if (!this.textInputBuffer || this.textInputBuffer.trim().length === 0) {
            console.warn("⚠️ Cannot send empty message");
            return;
        }

        if (!this.currentContactId) {
            console.warn("⚠️ No contact ID set for sending message");
            return;
        }

        // Send the message
        const success = this.sendMessage(this.currentContactId, this.textInputBuffer);
        if (success) {
            console.log("✅ Message sent successfully, clearing input");
            this.textInputBuffer = '';
            this.renderInputArea(); // Re-render to show empty input
        }
    }

    /**
     * Set the current contact ID for SMS interactions
     * SIMPLIFIED: If SMS is ready and screen is open, always activate input
     * @param {string} contactId - The contact ID
     * @param {boolean} wasUserAlreadyClose - True if user was already close before any camera movement
     */
    setCurrentContact(contactId, wasUserAlreadyClose = false) {
        this.currentContactId = contactId;
        console.log("📱 SMS Integration Manager: Set current contact to:", contactId);
        
        // Update input manager with current contact
        if (this.inputManager && contactId) {
            this.inputManager.setCurrentContact(contactId);
        }
        
        // PHASE 1: Activate the text input bridge for this contact
        if (window.smsTextInputBridge && contactId) {
            console.log("📱 Activating text input bridge for contact:", contactId);
            window.smsTextInputBridge.activate(contactId);
        }
        
        // SIMPLIFIED: If SMS is ready and contact is set, activate input
        // The SMS screen wouldn't be open if the user didn't want to use it
        if (this.realSmsReady && contactId) {
            console.log("📱 ✅ Auto-activating SMS input (simplified approach) for contact:", contactId);
            this.activateInput();
        }
    }

    /**
     * Force activate SMS input when user directly interacts with SMS screen
     * SIMPLIFIED: If SMS screen is open, always allow input regardless of distance
     * @param {string} contactId - The contact ID
     */
    forceActivateForSmsScreenInteraction(contactId) {
        if (!this.realSmsReady) {
            console.warn("🚫 Cannot activate SMS input: Real SMS mode is not ready.");
            return false;
        }

        if (!contactId) {
            console.warn("⚠️ Cannot activate SMS input: No contact ID provided");
            return false;
        }

        // SIMPLIFIED: Check if SMS screen exists and is open for this contact
        const hasSmsScreen = this.contactHasVisibleSmsScreen(contactId);
        
        if (hasSmsScreen) {
            console.log("📱 ✅ SMS screen is open - activating input (simplified approach):", contactId);
            this.currentContactId = contactId;
            this.activateInput();
            return true;
        } else {
            console.log("📱 ❌ No visible SMS screen found for contact:", contactId);
            return false;
        }
    }

    /**
     * Check if camera is close enough to contact for SMS activation
     * @param {string} contactId - The contact ID
     * @returns {boolean} - True if camera is close enough
     */
    isCameraCloseToContact(contactId) {
        const CLOSE_DISTANCE_THRESHOLD = 15; // Same threshold used by CameraFocusManager
        const SMS_MODE_THRESHOLD = 17.0; // More lenient threshold for SMS teleport mode (matches expanded range)
        
        try {
            // Get contact object from ContactManager
            if (!window.app?.contactManager) {
                console.warn("📱 ContactManager not available for distance check");
                return false;
            }
            
            const contact = window.app.contactManager.contacts.get(contactId);
            if (!contact?.mesh) {
                console.warn("📱 Contact mesh not found for distance check:", contactId);
                return false;
            }
            
            // Get camera position
            const camera = window.app?.camera;
            if (!camera) {
                console.warn("📱 Camera not available for distance check");
                return false;
            }
            
            // Get contact world position
            const contactWorldPosition = new THREE.Vector3();
            contact.mesh.getWorldPosition(contactWorldPosition);
            
            // Calculate distance
            const distance = camera.position.distanceTo(contactWorldPosition);
            
            // Check if user is in SMS teleport mode for more lenient threshold
            const isInSmsMode = this.isUserInSmsMode();
            const threshold = isInSmsMode ? SMS_MODE_THRESHOLD : CLOSE_DISTANCE_THRESHOLD;
            const isClose = distance < threshold;
            
            console.log(`📱 Camera distance check for ${contactId}: distance=${distance.toFixed(2)}, threshold=${threshold}, SMS_mode=${isInSmsMode}, close=${isClose}`);
            
            return isClose;
            
        } catch (error) {
            console.error("📱 Error checking camera distance to contact:", error);
            return false;
        }
    }

    /**
     * Check if user is in interactive mode (close to contact) BEFORE any camera movement
     * This prevents SMS input from activating when camera is moved automatically
     * @param {string} contactId - The contact ID
     * @returns {boolean} - True if user is already in interactive mode
     */
    isUserInInteractiveMode(contactId) {
        const wasAlreadyClose = this.isCameraCloseToContact(contactId);
        console.log(`📱 User interactive mode check for ${contactId}: ${wasAlreadyClose ? 'YES - user is in interactive mode' : 'NO - user needs to zoom in'}`);
        return wasAlreadyClose;
    }

    /**
     * Simple check if contact has a visible SMS screen
     * @param {string} contactId - The contact ID
     * @returns {boolean} - True if contact has visible SMS screen
     */
    contactHasVisibleSmsScreen(contactId) {
        try {
            if (window.app?.contactManager?.contacts) {
                const contact = window.app.contactManager.contacts.get(contactId);
                if (contact?.smsScreen) {
                    // Check if SMS screen exists and has a parent (is added to scene)
                    const hasParent = !!contact.smsScreen.parent;
                    console.log(`📱 SMS screen check for ${contactId}: exists=true, hasParent=${hasParent}`);
                    return hasParent;
                }
                console.log(`📱 SMS screen check for ${contactId}: exists=false`);
            }
            return false;
        } catch (error) {
            console.error("📱 Error checking SMS screen visibility:", error);
            return false;
        }
    }

    /**
     * Check if user is currently in SMS teleport mode (optimal SMS viewing position)
     * This indicates the user has double-tapped to enter SMS mode and should have access to input
     * @returns {boolean} - True if user is in SMS teleport mode
     */
    isUserInSmsMode() {
        try {
            // Check if any SMS screen is currently visible and in teleport mode
            if (window.app?.contactManager?.contacts) {
                for (const [contactId, contact] of window.app.contactManager.contacts) {
                    // Check if SMS screen exists and is properly visible
                    const hasVisibleSmsScreen = contact.smsScreen && 
                        (contact.smsScreen.visible === true || 
                         (contact.smsScreen.visible !== false && contact.smsScreen.parent)); // Handle undefined visible state
                    
                    if (hasVisibleSmsScreen) {
                        // Check if camera is in optimal SMS viewing position
                        const camera = window.app?.camera;
                        if (!camera) continue;
                        
                        // Get SMS screen position
                        const smsPosition = new THREE.Vector3();
                        contact.smsScreen.getWorldPosition(smsPosition);
                        
                        // Calculate distance
                        const distance = camera.position.distanceTo(smsPosition);
                        
                        // SMS teleport mode typically positions camera at ~15.23 units
                        // EXPANDED tolerance for floating point precision and slight camera movement
                        const isInTeleportMode = distance >= 14.0 && distance <= 17.0;
                        
                        console.log(`📱 SMS mode check for ${contactId}: distance=${distance.toFixed(2)}, visible=${contact.smsScreen.visible}, hasParent=${!!contact.smsScreen.parent}, inTeleportMode=${isInTeleportMode}`);
                        
                        if (isInTeleportMode) {
                            console.log(`📱 ✅ User in SMS teleport mode for ${contactId} at distance ${distance.toFixed(2)}`);
                            return true;
                        } else {
                            console.log(`📱 ❌ SMS screen visible but not in teleport mode for ${contactId} at distance ${distance.toFixed(2)} (needs 14.0-17.0)`);
                        }
                    } else {
                        console.log(`📱 SMS screen check for ${contactId}: screen exists=${!!contact.smsScreen}, visible=${contact.smsScreen ? contact.smsScreen.visible : 'N/A'}, hasParent=${contact.smsScreen ? !!contact.smsScreen.parent : 'N/A'}`);
                    }
                }
            }
            console.log("📱 SMS mode check result: false (no visible SMS screens in teleport range)");
            return false;
        } catch (error) {
            console.error("📱 Error checking SMS mode:", error);
            return false;
        }
    }

    /**
     * Activate the SMS input area
     */
    activateInput() {
        console.log("📱 Activating SMS input area");
        
        // Use input manager if available
        if (this.inputManager) {
            this.inputManager.activateInput();
            // Keep legacy properties in sync
            this.renderInputActive = this.inputManager.isInputActive();
            this.textInputBuffer = this.inputManager.getCurrentText();
            
            // Pass contact ID to keyboard request
            this.inputManager.requestKeyboardFromFlutter(this.currentContactId);
        } else {
            // Legacy behavior
            this.renderInputActive = true;
            this.textInputBuffer = '';
            this.renderInputArea();
            
            // Request keyboard focus
            this.requestKeyboardFromFlutter();
        }
    }

    /**
     * SIMPLIFIED: Always activate if SMS screen is open and we have a contact
     * This can be called periodically or when camera moves
     */
    checkAndActivateIfClose() {
        if (!this.currentContactId || this.renderInputActive) {
            return; // No contact set or already active
        }
        
        // SIMPLIFIED: If we have SMS ready and a contact, just activate
        // The screen wouldn't be open if the user didn't want SMS functionality
        if (this.realSmsReady) {
            console.log("📱 ✅ SMS ready and contact set, activating input (simplified)");
            this.activateInput();
        }
    }

    /**
     * Deactivate the SMS input area  
     */
    deactivateInput() {
        console.log("📱 Deactivating SMS input area");
        
        // Use input manager if available
        if (this.inputManager) {
            this.inputManager.deactivateInput();
            // Keep legacy properties in sync
            this.renderInputActive = this.inputManager.isInputActive();
            this.textInputBuffer = this.inputManager.getCurrentText();
        } else {
            // Legacy behavior
            this.renderInputActive = false;
            this.textInputBuffer = '';
            
            // PHASE 1: Deactivate the text input bridge
            if (window.smsTextInputBridge) {
                console.log("📱 Deactivating text input bridge");
                window.smsTextInputBridge.deactivate();
            }
            
            // PHASE 2: Clean up ALL hidden input elements (in case of duplicates)
            const hiddenInputs = document.querySelectorAll('#sms-hidden-input, input[id*="sms-hidden"], input[aria-hidden="true"]');
            hiddenInputs.forEach((input, index) => {
                console.log(`🛠️ [DEBUG] Removing hidden input element #${index + 1}`);
                input.remove();
            });
            
            // Additional cleanup - remove any lingering input elements that might be hidden
            const allInputs = document.querySelectorAll('input[type="text"]');
            allInputs.forEach(input => {
                const style = window.getComputedStyle(input);
                if (style.position === 'fixed' && 
                    (style.left === '-10000px' || parseInt(style.left) < -1000) && 
                    (style.visibility === 'hidden' || style.opacity === '0')) {
                    console.log(`🛠️ [DEBUG] Removing orphaned hidden input element`);
                    input.remove();
                }
            });
            
            // Clear overlay and disable pointer events
            const overlay2d = document.getElementById('sms-input-overlay');
            if (overlay2d) {
                const ctx = overlay2d.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, overlay2d.width, overlay2d.height);
                }
                // Disable pointer events to restore camera controls
                overlay2d.style.pointerEvents = 'none';
            }
        }
    }

    /**
     * Checks if the tap coordinates are within the defined input area.
     * Delegated to SMS input manager.
     * @param {number} x - The x-coordinate of the tap.
     * @param {number} y - The y-coordinate of the tap.
     * @returns {boolean}
     */
    isInputArea(x, y) {
        if (this.inputManager) {
            return this.inputManager.isInputArea(x, y);
        } else {
            console.warn("⚠️ Input manager not available for input area detection");
            return false;
        }
    }

    /**
     * Handles the logic when the text input area is tapped.
     * Delegated to SMS input manager.
     */
    handleTextInputTap() {
        if (this.inputManager) {
            this.inputManager.handleTextInputTap();
        } else {
            console.warn("⚠️ Input manager not available for text input tap handling");
        }
    }


    /**
     * Request current text content from Flutter keyboard
     * Instead of polling, we'll rely on Flutter to send us text updates
     */
    requestTextUpdateFromFlutter() {
        // Stop the problematic polling - Flutter will send text updates via events
        // when user types on the keyboard
        console.log("📱 Text sync: Relying on Flutter event-driven text updates");
    }

    /**
     * Sends a request to Flutter to show the native keyboard.
     * Delegated to SMS input manager
     */
    requestKeyboardFromFlutter() {
        if (this.inputManager) {
            this.inputManager.requestKeyboardFromFlutter();
        } else {
            console.warn("⚠️ Input manager not available for keyboard request");
        }
    }

    /**
     * Try alternative methods to show keyboard when Flutter channel fails
     * Delegated to SMS input manager
     */
    tryAlternativeKeyboardMethods() {
        if (this.inputManager) {
            this.inputManager.tryAlternativeKeyboardMethods();
        } else {
            console.warn("⚠️ Input manager not available for alternative keyboard methods");
        }
    }

    /**
     * Handles optimized text input received from the Flutter channel.
     * PERFORMANCE OPTIMIZATION: Now handles complete messages instead of character-by-character updates
     * @param {string} text - The complete message text typed by the user.
     */
    handleChannelTextInput(text) {
        // Performance optimization: Only process complete messages, not individual characters
        console.log(`📝 OPTIMIZED: Received complete message "${text}" (not character-by-character)`);
        
        // Delegate to input manager if available, otherwise use legacy behavior
        if (this.inputManager) {
            this.inputManager.handleChannelTextInput(text);
            // Keep legacy property in sync
            this.textInputBuffer = this.inputManager.getCurrentText();
        } else {
            // Legacy behavior for backward compatibility
            this.textInputBuffer = text;
        }
        
        // Always call renderInputArea for now to maintain compatibility
        this.renderInputArea();
    }

    /**
     * Sends an SMS message via the Flutter channel.
     * @param {string} recipient - The phone number to send the SMS to.
     */
    sendSms(recipient) {
        if (!this.realSmsReady) {
            console.error("❌ Cannot send SMS: Real SMS mode is not active.");
            return;
        }
        console.log(`📤 Sending SMS to ${recipient}: "${this.textInputBuffer}"`);
        // --- FLUTTER INTEGRATION POINT ---
        if (window.flutter_inappwebview) {
            // window.flutter_inappwebview.callHandler('sendSms', {
            //     recipient: recipient,
            //     message: this.textInputBuffer
            // });
            this.textInputBuffer = ''; // Clear buffer after sending
            this.renderInputArea(); // Re-render to show empty input field
        }
    }

    /**
     * Appends a received SMS message to the conversation view.
     * @param {string} sender - The sender's phone number.
     * @param {string} body - The content of the SMS.
     */
    appendSmsBubble(sender, body) {
        console.log(`💬 Appending message from ${sender}: "${body}"`);
        // This function would be responsible for creating and displaying
        // a new chat bubble in the Three.js scene.
    }

    /**
     * Renders the text input area on the canvas.
     * Delegated to SMS input manager.
     */
    renderInputArea() {
        if (this.inputManager) {
            this.inputManager.renderInputArea();
        } else {
            console.warn("⚠️ Input manager not available for rendering input area");
        }
    }

    /**
     * Handle keyboard input on the SMS input overlay as fallback
     * Delegated to SMS input manager.
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleOverlayKeydown(event) {
        if (this.inputManager) {
            this.inputManager.handleOverlayKeydown(event);
        } else {
            console.warn("⚠️ Input manager not available for overlay keydown handling");
        }
    }

    /**
     * Handle clicks on the SMS input overlay
     * Delegated to SMS input manager.
     * @param {Event} event - The click event
     */
    handleOverlayClick(event) {
        if (this.inputManager) {
            this.inputManager.handleOverlayClick(event);
        } else {
            console.warn("⚠️ Input manager not available for overlay click handling");
        }
    }

    /**
     * Determines if cursor should be visible (blinking effect)
     * Delegated to SMS input manager.
     * @returns {boolean}
     */
    shouldBlinkCursor() {
        if (this.inputManager) {
            return this.inputManager.shouldBlinkCursor();
        } else {
            console.warn("⚠️ Input manager not available for cursor blinking check");
            return false;
        }
    }

    /**
     * Gets conversation history for a contact
     * @param {string} contactId - The contact ID
     * @param {boolean} forceRefresh - Whether to force refresh from backend
     * @returns {Promise<Array>} - Promise that resolves to array of messages
     */
    getConversation(contactId, forceRefresh = false) {
        console.log(`📱 SMS Integration Manager: Getting conversation for ${contactId}, forceRefresh: ${forceRefresh}`);
        
        return new Promise((resolve, reject) => {
            if (!this.realSmsReady) {
                console.log("🚫 Real SMS mode not ready, returning empty conversation");
                resolve([]);
                return;
            }

            // If force refresh requested, add debugging to ensure fresh data
            if (forceRefresh) {
                console.log(`🔄 FORCE REFRESH: Requesting fresh conversation data for contact ${contactId}`);
            }

            // Use the SMS Channel Manager to get conversation history
            if (window.app && window.app.smsChannelManager) {
                window.app.smsChannelManager.getConversationHistory(contactId, 100, (response) => {
                    console.log(`📱 Conversation response for ${contactId}:`, response);
                    if (response && response.success) {
                        // Enhanced defensive handling as per expert recommendation
                        const messageList = Array.isArray(response.messages) ? response.messages : [];
                        console.log(`📱 Processing ${messageList.length} messages for ${contactId}`);
                        
                        // Log format info for debugging
                        if (response.messageCount !== undefined) {
                            console.log(`📱 Flutter reported messageCount: ${response.messageCount}, actual array length: ${messageList.length}`);
                        }
                        
                        // CRITICAL FIX: Dispatch events to update SMS screens in real-time
                        console.log(`📱 🔄 Dispatching conversation update events for ${contactId}`);
                        
                        // Dispatch flutter-sms-data event for direct listeners
                        window.dispatchEvent(new CustomEvent('flutter-sms-data', {
                            detail: {
                                contactId: contactId,
                                messages: messageList,
                                timestamp: Date.now(),
                                source: 'conversation_refresh'
                            }
                        }));
                        
                        // Dispatch sms-conversation-updated event for SMS screen listeners
                        window.dispatchEvent(new CustomEvent('sms-conversation-updated', {
                            detail: {
                                contactId: contactId,
                                messages: messageList,
                                timestamp: Date.now(),
                                source: 'conversation_refresh'
                            }
                        }));
                        
                        console.log(`📱 ✅ Dispatched conversation update events for ${contactId} with ${messageList.length} messages`);
                        
                        resolve(messageList);
                    } else {
                        console.warn(`⚠️ Failed to get conversation for ${contactId}:`, response);
                        resolve([]);
                    }
                }, forceRefresh);
            } else {
                console.warn("⚠️ SMS Channel Manager not available");
                resolve([]);
            }
        });
    }

    /**
     * Sends an SMS message
     * @param {string} phoneNumberOrContactId - Either a phone number or contact ID
     * @param {string} messageText - The message text
     * @param {function} callback - A callback function to be executed with the result.
     * @returns {void}
     */
    sendMessage(phoneNumberOrContactId, messageText, callback) {
        console.log(`📱 SMS Integration Manager: Sending message to ${phoneNumberOrContactId}: "${messageText}"`);
        
        if (!this.realSmsReady) {
            console.error("❌ Cannot send SMS: Real SMS mode is not active.");
            if (callback) callback({ success: false, error: "SMS mode not active" });
            return;
        }

        if (!messageText || messageText.trim().length === 0) {
            console.error("❌ Cannot send empty message");
            if (callback) callback({ success: false, error: "Empty message" });
            return;
        }

        // CRITICAL FIX: Determine if first parameter is a phone number or contact ID
        let contactId = null;
        let phoneNumber = null;
        
        // Check if first parameter looks like a phone number (starts with + or is all digits)
        const phonePattern = /^(\+\d+|\d+)$/;
        const isPhoneNumber = phonePattern.test(phoneNumberOrContactId);
        
        if (isPhoneNumber) {
            // First parameter is a phone number - need to find the contact ID
            phoneNumber = phoneNumberOrContactId;
            console.log(`📱 🔍 RECEIVED PHONE NUMBER: "${phoneNumber}" - looking up contact ID`);
            
            // Try to find contact by phone number
            if (window.app && window.app.contactManager) {
                for (const [cId, contact] of window.app.contactManager.contacts) {
                    if (contact.contactData && contact.contactData.phoneNumber === phoneNumber) {
                        contactId = cId;
                        console.log(`📱 🔍 FOUND CONTACT: "${phoneNumber}" → contactId "${contactId}"`);
                        break;
                    }
                }
                
                if (!contactId) {
                    console.warn(`📱 ⚠️ WARNING: Could not find contact for phone number "${phoneNumber}"`);
                    // Use phone number as contact ID fallback
                    contactId = phoneNumber;
                }
            } else {
                console.warn(`📱 ⚠️ WARNING: contactManager not available, using phone number as contact ID`);
                contactId = phoneNumber;
            }
        } else {
            // First parameter is a contact ID - need to resolve to phone number
            contactId = phoneNumberOrContactId;
            console.log(`📱 🔍 RECEIVED CONTACT ID: "${contactId}" - resolving to phone number`);
            
            // Try to get the phone number from the contact manager
            if (window.app && window.app.contactManager) {
                const contactData = window.app.contactManager.getContactById(contactId);
                if (contactData && contactData.contactData && contactData.contactData.phoneNumber) {
                    phoneNumber = contactData.contactData.phoneNumber;
                    console.log(`📱 🔍 RESOLVED: contactId "${contactId}" → phone number "${phoneNumber}"`);
                } else {
                    console.warn(`📱 ⚠️ WARNING: Could not resolve contactId "${contactId}" to phone number`);
                    phoneNumber = contactId; // Fallback
                }
            } else {
                console.warn(`📱 ⚠️ WARNING: contactManager not available, cannot resolve contactId "${contactId}"`);
                phoneNumber = contactId; // Fallback
            }
        }

        try {
            // Use the SMS Channel Manager to send the message
            if (window.app && window.app.smsChannelManager) {
                // CRITICAL FIX: Always pass contactId to sendSmsMessage (it expects contactId first, not phone number)
                window.app.smsChannelManager.sendSmsMessage(contactId, messageText.trim(), (response) => {
                    console.log(`📱 Send message response:`, response);
                    if (response && response.success) {
                        console.log(`✅ Message sent successfully to ${phoneNumber} (contact: ${contactId})`);
                        this.textInputBuffer = ''; // Clear buffer after sending
                        this.renderInputArea(); // Re-render to show empty input field
                        
                        // CRITICAL FIX: Refresh the conversation after sending to show the sent message
                        console.log(`📱 Refreshing conversation for ${contactId} after successful send`);
                        setTimeout(() => {
                            this.getConversation(contactId);
                        }, 100); // Small delay to ensure message is processed by Flutter
                        
                        if (callback) callback({ success: true, response: response });
                    } else {
                        console.error(`❌ Failed to send message to ${phoneNumber} (contact: ${contactId}):`, response);
                        if (callback) callback({ success: false, response: response });
                    }
                });
            } else {
                console.error("❌ SMS Channel Manager not available");
                if (callback) callback({ success: false, error: "SMS Channel Manager not available" });
            }
        } catch (error) {
            console.error("❌ Error sending SMS:", error);
            if (callback) callback({ success: false, error: error.message });
        }
    }



    /**
     * Callback for when input is focused
     * @param {string} phoneNumber - The phone number
     */
    onInputFocused(phoneNumber) {
        console.log(`📱 SMS Integration Manager: Input focused for ${phoneNumber}`);
        if (this.inputManager) {
            this.inputManager.activateInput();
            this.renderInputActive = this.inputManager.isInputActive();
        } else {
            this.renderInputActive = true;
        }
        this.renderInputArea();
    }

    /**
     * Callback for when a message is sent
     * @param {string} phoneNumber - The phone number
     * @param {string} messageText - The message text
     */
    onMessageSent(phoneNumber, messageText) {
        console.log(`📱 SMS Integration Manager: Message sent to ${phoneNumber}: "${messageText}"`);
        this.textInputBuffer = '';
        this.renderInputArea();
    }

    /**
     * Callback for when SMS screen is closed
     * @param {string} phoneNumber - The phone number
     */
    onScreenClosed(phoneNumber) {
        console.log(`📱 SMS Integration Manager: Screen closed for ${phoneNumber}`);
        if (this.inputManager) {
            this.inputManager.deactivateInput();
            this.renderInputActive = this.inputManager.isInputActive();
            this.textInputBuffer = this.inputManager.getCurrentText();
        } else {
            this.renderInputActive = false;
            this.textInputBuffer = '';
        }
        this.renderInputArea();
    }

    /**
     * Ensure optimal camera positioning for SMS viewing
     * @param {string} contactId - The contact ID to position camera for
     */
    ensureOptimalSmsViewingPosition(contactId) {
        console.log(`📱 Ensuring optimal SMS viewing position for contact: ${contactId}`);
        
        try {
            // Check if camera is already close to the contact
            if (this.isCameraCloseToContact(contactId)) {
                console.log(`📱 Camera already in optimal position for SMS viewing`);
                return;
            }

            // Get the contact object
            if (!window.app?.contactManager) {
                console.warn("📱 ContactManager not available for camera positioning");
                return;
            }
            
            const contact = window.app.contactManager.contacts.get(contactId);
            if (!contact?.mesh) {
                console.warn("📱 Contact mesh not found for camera positioning:", contactId);
                return;
            }

            // Get camera
            const camera = window.app?.camera;
            if (!camera) {
                console.warn("📱 Camera not available for positioning");
                return;
            }

            // Calculate optimal position for SMS viewing (closer than normal interaction)
            const contactWorldPosition = new THREE.Vector3();
            contact.mesh.getWorldPosition(contactWorldPosition);

            // Position camera for optimal SMS viewing (closer for better visibility)
            const SMS_OPTIMAL_DISTANCE = 12.0; // Closer than normal interaction distance
            const currentPosition = camera.position.clone();
            const direction = currentPosition.clone().sub(contactWorldPosition).normalize();
            const optimalPosition = contactWorldPosition.clone().add(direction.multiplyScalar(SMS_OPTIMAL_DISTANCE));

            // Smoothly move camera to optimal position
            if (window.app?.cameraManager) {
                console.log(`📱 Moving camera to optimal SMS viewing position`);
                // Use camera manager's smooth movement if available
                window.app.cameraManager.moveToPosition(optimalPosition, {
                    duration: 800, // Smooth animation
                    easing: 'easeInOutQuad'
                });
            } else {
                // Fallback: direct camera positioning
                console.log(`📱 Direct camera positioning to optimal SMS viewing position`);
                camera.position.copy(optimalPosition);
            }

        } catch (error) {
            console.error("📱 Error positioning camera for SMS viewing:", error);
        }
    }
}

// --- Global Instance ---
// This makes the manager accessible from other modules.
window.smsIntegrationManager = new SmsIntegrationManager();

// --- Global Class Constructor ---
// Also expose the class constructor for other code that might need it
window.SmsIntegrationManager = SmsIntegrationManager;

// --- Auto-Initialize SMS Integration ---
// Start the SMS integration when the module loads
setTimeout(() => {
    if (window.smsIntegrationManager && typeof window.smsIntegrationManager.initialize === 'function') {
        console.log("🚀 Auto-initializing SMS Integration Manager...");
        window.smsIntegrationManager.initialize();
        
        // PHASE 1: Check if text input bridge is available
        if (window.smsTextInputBridge) {
            console.log("🚀 SMS Text Input Bridge is ready");
        } else {
            console.warn("⚠️ SMS Text Input Bridge not found - text input may not work");
        }
    }
}, 1000); // Give other systems time to load

// --- Hook into SMS Screen Creation ---
// Listen for SMS screen creation events to activate visual input
window.addEventListener('sms-screen-opened', (event) => {
    console.log("📱 SMS screen opened event received:", event.detail);
    if (event.detail && event.detail.contactId && window.smsIntegrationManager) {
        const contactId = event.detail.contactId;
        
        // CRITICAL FIX: Check if user was already in interactive mode BEFORE any camera movement
        // This prevents SMS input from activating when camera auto-moves from far distance
        const wasUserAlreadyClose = event.detail.wasUserAlreadyClose || false;
        
        console.log("📱 Auto-activating SMS Integration Manager for contact:", contactId);
        console.log("📱 User was already close (interactive mode):", wasUserAlreadyClose);
        
        window.smsIntegrationManager.setCurrentContact(contactId, wasUserAlreadyClose);
    }
});

window.addEventListener('sms-screen-closed', (event) => {
    console.log("📱 SMS screen closed event received:", event.detail);
    if (window.smsIntegrationManager) {
        console.log("📱 Deactivating SMS Integration Manager");
        window.smsIntegrationManager.deactivateInput();
        window.smsIntegrationManager.currentContactId = null;
    }
});

// NEW: Handle Flutter keyboard close events
window.addEventListener('flutter-keyboard-closed', (event) => {
    console.log("📱 Flutter keyboard closed event received:", event.detail);
    
    if (event.detail && event.detail.contactId) {
        const contactId = event.detail.contactId;
        console.log(`📱 Attempting to close SMS screen for contact: ${contactId}`);
        
        // Use ContactManager to close the SMS screen for this specific contact
        if (window.app?.contactManager) {
            const contact = window.app.contactManager.getContactById(contactId);
            if (contact && contact.smsScreen) {
                console.log(`📱 Closing SMS screen for contact: ${contact.name}`);
                contact.smsScreen.close();
            } else {
                console.log(`📱 No active SMS screen found for contact: ${contactId}`);
            }
        } else {
            console.log("📱 ContactManager not available");
        }
    } else {
        console.log("📱 No contactId provided in flutter-keyboard-closed event");
    }
});

console.log("🏁 smsIntegrationManager.js loaded with auto-initialization and event hooks.");

// TEST FUNCTION: Manually trigger flutter-keyboard-closed event for testing
window.testFlutterKeyboardClose = function(contactId) {
    console.log(`🧪 TEST: Simulating Flutter keyboard close for contact: ${contactId}`);
    window.dispatchEvent(new CustomEvent('flutter-keyboard-closed', {
        detail: { contactId: contactId }
    }));
};
