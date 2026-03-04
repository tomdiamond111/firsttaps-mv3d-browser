/**
 * SMS Channel Manager
 * Handles all Flutter-JavaScript communication for SMS functionality
 * Provides a clean interface for SMS operations between JS and Flutter
 * 
 * PERFORMANCE FIXES APPLIED:
 * - Optimized phone number resolution to prevent freezing during message sending
 * - Simplified refresh logic to avoid cascading UI updates
 * - Added timeout protection to Flutter bridge calls (5 second timeout)
 * - Reduced verbose logging and contact structure debugging
 * - Streamlined text input processing to prevent excessive refresh operations
 */

(function() {
    'use strict';

    class SmsChannelManager {
        constructor(options = {}) {
            this.isFlutterConnected = true; // Start optimistic - assume Flutter is available
            this.pendingMessages = [];
            this.messageCallbacks = new Map();
            this.messageIdCounter = 0;
            
            // PERFORMANCE FIX: Add throttling maps to prevent infinite refresh loops
            this.lastRefreshTime = new Map();
            this.lastUIUpdate = new Map();
            
            // DEDUPLICATION FIX: Track in-flight conversation requests to prevent duplicates
            this.inflightConversationRequests = new Map();
            
            // PERFORMANCE OPTIMIZATION: Add contact caching for faster lookups
            this.contactCache = new Map();
            this.contactCacheTimestamp = 0;
            this.contactCacheExpiry = 30000; // 30 second cache
            
            // Debug mode control for verbose logging
            this.debugMode = options.debug || false;
            this.hasLoggedDataReceived = false;
            this.lastMessageCount = 0;
            
            // Initialize event router for clean event handling
            this.eventRouter = null; // Will be initialized after channels
            
            // Initialize Flutter channel connections
            this.initializeChannels();
            
            // Initialize event router with this channel manager
            if (window.SmsEventRouter) {
                this.eventRouter = new window.SmsEventRouter(this, {
                    debugMode: options.debugMode || false
                });
            } else {
                console.warn('📱 SmsEventRouter not available - using fallback event handling');
            }
            
            console.log('📱 SmsChannelManager initialized with optimistic connection and throttling protection');
        }

        /**
         * Initialize Flutter communication channels
         */
        initializeChannels() {
            // SMS Input Channel - for keyboard and text input
            this.setupSmsInputChannel();
            
            // SMS Data Channel - for sending/receiving messages and conversation data
            this.setupSmsDataChannel();
            
            // SMS Status Channel - for delivery status and connection state
            this.setupSmsStatusChannel();
            
            // Test Flutter connection
            this.testFlutterConnection();
        }

        /**
         * Setup SMS Input Channel for keyboard and text input operations
         */
        setupSmsInputChannel() {
            if (window.SmsInputChannel) {
                console.log('📱 SmsInputChannel already available');
                this.isFlutterConnected = true;
            } else {
                console.log('📱 Creating SmsInputChannel interface');
                
                // Create channel interface that Flutter can connect to
                window.SmsInputChannel = {
                    postMessage: (message) => {
                        console.log('📱 SmsInputChannel message to Flutter:', message);
                        this.handleFlutterMessage('input', message);
                    }
                };
            }

            // Listen for responses from Flutter
            window.addEventListener('flutter-sms-input-response', (event) => {
                this.handleSmsInputResponse(event.detail);
            });
            
            // Listen for real-time text input from Flutter
            window.addEventListener('flutter-text-input', (event) => {
                if (event.detail && event.detail.text !== undefined) {
                    console.log('📱 Real-time text input from Flutter:', event.detail.text);
                    this.notifyTextInput(event.detail.text, event.detail.contactId);
                }
            });
            
            // Global function for Flutter to call directly
            window.notifyJavaScriptTextInput = (text, contactId) => {
                console.log('📱 Direct Flutter text input call:', text);
                this.notifyTextInput(text, contactId);
            };
        }

        /**
         * Setup SMS Data Channel for message content and conversations
         */
        setupSmsDataChannel() {
            if (window.SmsDataChannel) {
                console.log('📱 SmsDataChannel already available');
            } else {
                console.log('📱 Creating SmsDataChannel interface');
                
                window.SmsDataChannel = {
                    postMessage: (message) => {
                        console.log('📱 SmsDataChannel message to Flutter:', message);
                        this.handleFlutterMessage('data', message);
                    },
                    
                    // CRITICAL: Handle events from Flutter via JavaScript execution
                    handleFlutterEvent: (eventData) => {
                        console.log('📱 🚀 SmsDataChannel.handleFlutterEvent received:', eventData);
                        
                        // Forward to SMS Event Router for processing
                        if (window.smsEventRouter) {
                            window.smsEventRouter.handleFlutterDataEvent(eventData);
                        } else {
                            console.error('📱 ❌ SMS Event Router not available!');
                            
                            // Fallback: try to dispatch as window event
                            const eventType = `flutter-sms-${eventData.action || 'data'}`;
                            console.log(`📱 🔄 Fallback: dispatching as ${eventType}`);
                            window.dispatchEvent(new CustomEvent(eventType, { detail: eventData }));
                        }
                    }
                };
            }

            // DISABLED: SMS Event Router now handles flutter-sms-data events directly
            // This prevents duplicate processing and competing event handlers
            /*
            window.addEventListener('flutter-sms-data', (event) => {
                // Reduced logging for frequent data updates - only log when debug enabled
                if (this.debugMode || !this.hasLoggedDataReceived) {
                    console.log('📱 [DIRECT] flutter-sms-data event received');
                    this.hasLoggedDataReceived = true;
                }
                this.handleSmsDataDirectly(event.detail);
            });
            */
            
            // 🔍 CRITICAL DEBUG: Listen for real-time message received events
            window.addEventListener('flutter-message-received', (event) => {
                console.log('📱 [CRITICAL DEBUG] 🚨 REAL-TIME MESSAGE RECEIVED EVENT 🚨');
                console.log('📱 [CRITICAL DEBUG] Event data:', event.detail);
                
                // This should trigger when a new SMS arrives in real-time
                if (event.detail) {
                    this.notifyMessageReceived(event.detail);
                }
            });
            
            // 🔍 ADDITIONAL: Listen for any SMS-related events we might be missing
            const smsEventTypes = [
                'flutter-sms-received',
                'flutter-new-message', 
                'flutter-incoming-sms',
                'flutter-message-notification'
            ];
            
            smsEventTypes.forEach(eventType => {
                window.addEventListener(eventType, (event) => {
                    console.log(`📱 [CRITICAL DEBUG] 🚨 CAUGHT ${eventType} EVENT 🚨`);
                    console.log('📱 [CRITICAL DEBUG] Event data:', event.detail);
                });
            });
            
            console.log('📱 [CRITICAL DEBUG] 👂 Added listeners for real-time SMS events');
        }

        /**
         * Setup SMS Status Channel for delivery status and connection state
         */
        setupSmsStatusChannel() {
            if (window.SmsStatusChannel) {
                console.log('📱 SmsStatusChannel already available');
            } else {
                console.log('📱 Creating SmsStatusChannel interface');
                
                window.SmsStatusChannel = {
                    postMessage: (message) => {
                        console.log('📱 SmsStatusChannel message to Flutter:', message);
                        this.handleFlutterMessage('status', message);
                    }
                };
            }

            // Listen for status updates from Flutter
            window.addEventListener('flutter-sms-status', (event) => {
                this.handleSmsStatusResponse(event.detail);
            });
        }

        /**
         * Test Flutter connection and capabilities
         */
        testFlutterConnection() {
            console.log('📱 OPTIMISTIC CONNECTION: Always assuming Flutter is connected');
            console.log('📱 SMS Channel Manager operating in optimistic mode');
            
            // Always assume Flutter is connected - no actual testing needed
            this.isFlutterConnected = true;
            
            // Process any pending messages immediately
            this.processPendingMessages();
            
            // Optional: Send a test message in background but don't act on the result
            const testMessage = {
                messageId: this.generateMessageId(),
                action: 'test_connection',
                timestamp: Date.now()
            };
            
            try {
                window.SmsStatusChannel?.postMessage(JSON.stringify(testMessage));
                console.log('📱 Background test message sent to Flutter');
            } catch (error) {
                console.log('📱 Background test failed, but staying optimistic:', error);
            }
        }

        /**
         * Test connection status (used by SMS system)
         */
        testConnection() {
            return this.isFlutterConnected;
        }

        /**
         * Verify payload integrity before sending to Flutter
         */
        verifyPayloadIntegrity(payload) {
            const errors = [];
            
            if (payload.action === 'send_message') {
                // Check required fields
                if (!payload.contactId) {
                    errors.push('Missing contactId');
                }
                if (!payload.phoneNumber) {
                    errors.push('Missing phoneNumber');
                } else if (payload.phoneNumber === payload.contactId) {
                    errors.push(`phoneNumber equals contactId (${payload.phoneNumber}) - this indicates phone number resolution failed`);
                }
                if (!payload.text) {
                    errors.push('Missing text');
                }
                
                // Validate phone number format (accept both 10-digit local and international format)
                if (payload.phoneNumber) {
                    const isLocal10Digit = /^\d{10}$/.test(payload.phoneNumber);
                    const isLocal11Digit = /^\d{11}$/.test(payload.phoneNumber); // Allow 11-digit with country code
                    const isInternational = payload.phoneNumber.startsWith('+');
                    if (!isLocal10Digit && !isLocal11Digit && !isInternational) {
                        errors.push(`phoneNumber should be 10-digit local (e.g., 8472122890), 11-digit with country code (e.g., 18472122890), or international format (e.g., +18472122890), got: ${payload.phoneNumber}`);
                    }
                }
                
                console.log('📱 PAYLOAD VERIFICATION for send_message:', {
                    contactId: payload.contactId,
                    phoneNumber: payload.phoneNumber,
                    phoneNumberEqualsContactId: payload.phoneNumber === payload.contactId,
                    hasText: !!payload.text,
                    errors: errors
                });
            }
            
            return {
                isValid: errors.length === 0,
                errors: errors
            };
        }

        /**
         * Send a message to Flutter with optional callback (internal method)
         */
        sendMessageToFlutter(channelType, messageData, callback = null) {
            const messageId = messageData.messageId || this.generateMessageId();
            messageData.messageId = messageId;

            if (callback) {
                this.messageCallbacks.set(messageId, callback);
            }

            // PAYLOAD INTEGRITY CHECK: Log full payload structure for debugging
            console.log('[SEND PAYLOAD]', JSON.stringify(messageData, null, 2));
            
            // PAYLOAD VERIFICATION: Ensure critical fields are present
            if (messageData.action === 'send_message') {
                const verification = this.verifyPayloadIntegrity(messageData);
                if (!verification.isValid) {
                    console.error('📱 PAYLOAD VERIFICATION FAILED:', verification.errors);
                    if (callback) {
                        callback({ success: false, error: 'Payload verification failed: ' + verification.errors.join(', ') });
                    }
                    return false;
                }
            }
            
            // OPTIMISTIC MODE: Always attempt to send messages directly
            // No connection checking - assume Flutter is always available
            console.log('📱 Sending message to Flutter (optimistic mode):', messageData);

            try {
                switch (channelType) {
                    case 'input':
                        window.SmsInputChannel?.postMessage(JSON.stringify(messageData));
                        break;
                    case 'data':
                        window.SmsDataChannel?.postMessage(JSON.stringify(messageData));
                        break;
                    case 'status':
                        window.SmsStatusChannel?.postMessage(JSON.stringify(messageData));
                        break;
                    default:
                        console.error('📱 Unknown channel type:', channelType);
                        return false;
                }
                
                console.log(`📱 Message sent via ${channelType} channel:`, messageData);
                return true;
            } catch (error) {
                console.error('📱 Failed to send message to Flutter:', error);
                return false;
            }
        }

        /**
         * Process queued messages when Flutter becomes available
         */
        processPendingMessages() {
            console.log(`📱 Processing ${this.pendingMessages.length} pending messages`);
            
            const messages = [...this.pendingMessages];
            this.pendingMessages = [];
            
            messages.forEach(({ channelType, messageData, callback }) => {
                this.sendMessageToFlutter(channelType, messageData, callback);
            });
        }

        /**
         * Handle messages being sent to Flutter (for logging/debugging)
         */
        handleFlutterMessage(channelType, message) {
            console.log(`📱 Flutter message [${channelType}]:`, message);
            // This method can be extended for message preprocessing or validation
        }

        /**
         * Handle SMS input responses from Flutter
         */
        handleSmsInputResponse(data) {
            console.log('📱 SMS Input Response:', data);
            
            try {
                const response = typeof data === 'string' ? JSON.parse(data) : data;
                
                if (response.messageId && this.messageCallbacks.has(response.messageId)) {
                    const callback = this.messageCallbacks.get(response.messageId);
                    callback(response);
                    this.messageCallbacks.delete(response.messageId);
                }

                // Handle specific input events
                this.handleInputEvent(response);
                
            } catch (error) {
                console.error('📱 Error processing SMS input response:', error);
            }
        }

        /**
         * Handle SMS data responses from Flutter
         */
        handleSmsDataResponse(data) {
            console.log('📱 SMS Data Response:', data);
            
            try {
                const response = typeof data === 'string' ? JSON.parse(data) : data;
                console.log('📱 [DEBUG] Parsed SMS Data Response:', response);
                
                // 🚀 CRITICAL FIX: Handle phone-to-contactId mapping for standard responses
                let contactId = response.contactId;
                
                // Use the helper function to find contact by ID or phone number
                const foundContact = this.findContactByIdOrPhone(contactId);
                if (foundContact) {
                    // Get the actual contact ID from the found contact
                    for (const [id, existingContact] of window.app.contactManager.contacts) {
                        if (existingContact === foundContact) {
                            if (id !== contactId) {
                                console.log(`📱 ✅ STANDARD FIX: Resolved phone ${contactId} → contactId ${id}`);
                                contactId = id;
                            }
                            break;
                        }
                    }
                } else {
                    console.log(`📱 ⚠️ STANDARD FIX: Could not resolve ${contactId} to a contact`);
                }
                
                // Update the response object for downstream processing
                response.contactId = contactId;
                
                // Process callback first if available
                if (response.messageId && this.messageCallbacks.has(response.messageId)) {
                    const callback = this.messageCallbacks.get(response.messageId);
                    callback(response);
                    this.messageCallbacks.delete(response.messageId);
                }
                
                // 🔍 CRITICAL DEBUG: Check if this response contains messages
                if (response.messages && Array.isArray(response.messages)) {
                    console.log(`📱 [CRITICAL DEBUG] 📋 Response contains ${response.messages.length} messages for contact ${contactId} (original: ${data?.contactId || 'N/A'})`);
                    
                    // PERFORMANCE FIX: Only trigger UI update if we have a valid contactId and messages
                    if (contactId && response.messages.length > 0) {
                        // FIXED: Throttle UI updates to prevent cascading refreshes
                        const updateKey = `ui_update_${contactId}`;
                        const now = Date.now();
                        
                        if (!this.lastUIUpdate) {
                            this.lastUIUpdate = new Map();
                        }
                        
                        const lastUpdate = this.lastUIUpdate.get(updateKey) || 0;
                        if (now - lastUpdate >= 500) { // Throttle UI updates to max 2 per second per contact
                            this.lastUIUpdate.set(updateKey, now);
                            
                            console.log(`📱 [CRITICAL DEBUG] 🔄 Triggering UI update for contact ${contactId} with ${response.messages.length} messages`);
                            
                            // Direct SMS screen update
                            this.updateSmsScreenIfVisible(contactId, response.messages);
                            
                            // Event router update (lightweight)
                            if (this.eventRouter?.routeDataEvent) {
                                this.eventRouter.routeDataEvent({
                                    action: 'conversation_updated',
                                    contactId: contactId,
                                    messages: response.messages,
                                    totalMessages: response.messages.length
                                });
                            }
                        } else {
                            console.log(`📱 [CRITICAL DEBUG] 🚫 Throttling UI update for contact ${contactId} (too soon)`);
                        }
                    }
                }

                // Handle specific data events (non-UI related)
                this.handleDataEvent(response);
                
            } catch (error) {
                console.error('📱 Error processing SMS data response:', error);
            }
        }

        /**
         * DIRECT: Handle flutter-sms-data events with immediate UI updates
         * This bypasses the complex routing and directly updates SMS screens
         */
        handleSmsDataDirectly(data) {
            // Reduced logging for frequent operations
            if (this.debugMode) {
                console.log('📱 [DIRECT] Processing flutter-sms-data directly');
            }
            
            try {
                const response = typeof data === 'string' ? JSON.parse(data) : data;
                
                // Validate data structure
                if (!response || !response.contactId || !Array.isArray(response.messages)) {
                    if (this.debugMode) {
                        console.log('📱 [DIRECT] Invalid data structure, delegating to standard handler');
                    }
                    return this.handleSmsDataResponse(data);
                }
                
                // 🚀 CRITICAL FIX: Handle phone-to-contactId mapping for real-time events
                let contactId = response.contactId;
                
                // Use the helper function to find contact by ID or phone number
                const foundContact = this.findContactByIdOrPhone(contactId);
                if (foundContact) {
                    // Get the actual contact ID from the found contact
                    for (const [id, existingContact] of window.app.contactManager.contacts) {
                        if (existingContact === foundContact) {
                            if (id !== contactId) {
                                console.log(`📱 ✅ REAL-TIME FIX: Resolved phone ${contactId} → contactId ${id}`);
                                contactId = id;
                            }
                            break;
                        }
                    }
                } else {
                    console.log(`📱 ⚠️ REAL-TIME FIX: Could not resolve ${contactId} to a contact`);
                }
                
                // Only log message count for debugging or when count changes significantly
                if (this.debugMode || !this.lastMessageCount || Math.abs(response.messages.length - this.lastMessageCount) > 5) {
                    console.log(`📱 [DIRECT] Processing ${response.messages.length} messages for contact ${contactId} (original: ${response.contactId})`);
                    this.lastMessageCount = response.messages.length;
                }
                
                // Find and update SMS screen directly using resolved contactId
                const contact = window.app?.contactManager?.contacts?.get(contactId);
                if (!contact?.smsScreen) {
                    if (this.debugMode) {
                        console.log(`📱 [DIRECT] No SMS screen found for contact ${contactId} (original: ${response.contactId})`);
                    }
                    return this.handleSmsDataResponse(data);
                }
                
                const smsScreen = contact.smsScreen;
                if (!smsScreen.isVisible) {
                    if (this.debugMode) {
                        console.log(`📱 [DIRECT] SMS screen not visible for contact ${contactId} (original: ${response.contactId})`);
                    }
                    return this.handleSmsDataResponse(data);
                }
                
                // Only log screen updates when in debug mode
                if (this.debugMode) {
                    console.log(`📱 [DIRECT] Updating SMS screen with fresh data`);
                }
                
                // Mark messages as fresh and sort them
                const freshMessages = [...response.messages].sort((a, b) => {
                    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return timeA - timeB;
                }).map(msg => ({
                    ...msg,
                    _freshDataTimestamp: Date.now()
                }));
                
                // Direct update - bypass all routing
                smsScreen.messages = freshMessages;
                smsScreen._lastFreshUpdate = Date.now();
                
                // Force immediate UI refresh
                if (smsScreen.renderInterface) {
                    smsScreen.renderInterface();
                }
                
                // Force texture update
                if (smsScreen.texture) {
                    smsScreen.texture.needsUpdate = true;
                }
                
                // Only log success when in debug mode
                if (this.debugMode) {
                    console.log(`📱 [DIRECT] Successfully updated SMS screen with ${freshMessages.length} messages`);
                }
                
                // Process callbacks for API responses
                if (response.messageId && this.messageCallbacks.has(response.messageId)) {
                    const callback = this.messageCallbacks.get(response.messageId);
                    callback(response);
                    this.messageCallbacks.delete(response.messageId);
                }
                
            } catch (error) {
                console.error('📱 [DIRECT] Error in direct handler, falling back to standard handler:', error);
                this.handleSmsDataResponse(data);
            }
        }

        /**
         * Handle SMS status responses from Flutter
         */
        handleSmsStatusResponse(data) {
            console.log('📱 SMS Status Response:', data);
            
            try {
                const response = typeof data === 'string' ? JSON.parse(data) : data;
                
                if (response.messageId && this.messageCallbacks.has(response.messageId)) {
                    const callback = this.messageCallbacks.get(response.messageId);
                    callback(response);
                    this.messageCallbacks.delete(response.messageId);
                }

                // Handle specific status events
                this.handleStatusEvent(response);
                
            } catch (error) {
                console.error('📱 Error processing SMS status response:', error);
            }
        }

        /**
         * Handle input-specific events (with event router support)
         */
        handleInputEvent(response) {
            if (this.eventRouter) {
                // Use the event router for clean handling
                this.eventRouter.routeInputEvent(response);
            } else {
                // Fallback to original switch-based handling
                switch (response.action) {
                    case 'keyboard_shown':
                        this.notifyKeyboardState(true);
                        break;
                    case 'keyboard_hidden':
                        this.notifyKeyboardState(false);
                        break;
                    case 'text_input':
                        this.notifyTextInput(response.text);
                        break;
                    default:
                        if (!response.action) {
                            console.warn('📱 Unhandled input event: missing action field', response);
                        } else {
                            console.log('📱 Unhandled input event:', response.action, response);
                        }
                }
            }
        }

        /**
         * Handle data-specific events (with event router support)
         */
        handleDataEvent(response) {
            console.log('📱 [CRITICAL DEBUG] handleDataEvent called with action:', response.action);
            console.log('📱 [CRITICAL DEBUG] Full response object:', JSON.stringify(response, null, 2));
            
            if (this.eventRouter) {
                // Use the event router for clean handling
                this.eventRouter.routeDataEvent(response);
            } else {
                // Fallback to original switch-based handling
                switch (response.action) {
                    case 'message_sent':
                        console.log('📱 [CRITICAL DEBUG] Handling message_sent event');
                        this.notifyMessageSent(response);
                        break;
                    case 'message_received':
                        console.log('📱 [CRITICAL DEBUG] ⭐ INCOMING MESSAGE RECEIVED EVENT ⭐');
                        console.log('📱 [CRITICAL DEBUG] Message details:', {
                            contactId: response.contactId,
                            text: response.text,
                            phoneNumber: response.phoneNumber,
                            timestamp: response.timestamp
                        });
                        this.notifyMessageReceived(response);
                        break;
                    case 'conversation_history':
                        console.log('📱 [CRITICAL DEBUG] Handling conversation_history event');
                        this.notifyConversationHistory(response);
                        break;
                    case 'loadConversation':
                        console.log('📱 [CRITICAL DEBUG] Handling loadConversation response');
                        // Handle loadConversation response (similar to conversation_history)
                        this.notifyConversationHistory(response);
                        break;
                    case 'get_conversation':
                        console.log('📱 [CRITICAL DEBUG] Handling get_conversation response - message count:', response.messageCount);
                        // Handle get_conversation response
                        this.notifyConversationHistory(response);
                        break;
                    default:
                        if (!response.action) {
                            console.warn('📱 [CRITICAL DEBUG] ❌ Unhandled data event: missing action field', response);
                        } else {
                            console.warn('📱 [CRITICAL DEBUG] ❌ Unhandled data event with action:', response.action, response);
                        }
                }
            }
        }

        /**
         * Handle status-specific events (with event router support)
         */
        handleStatusEvent(response) {
            if (this.eventRouter) {
                // Use the event router for clean handling
                this.eventRouter.routeStatusEvent(response);
            } else {
                // Fallback to original switch-based handling
                switch (response.action) {
                    case 'connection_status':
                        this.isFlutterConnected = response.connected;
                        break;
                    case 'sms_permission':
                        this.notifyPermissionStatus(response);
                        break;
                    case 'sms_permission_denied':
                        console.log('📱 SMS permissions denied:', response.reason);
                        console.log('📱 INSTRUCTION:', response.instruction);
                        // Show user-friendly instruction
                        this.showPermissionInstructions(response.reason, response.instruction);
                        break;
                    case 'startListening':
                        // Handle startListening response
                        console.log('📱 Message listening status:', response.listening ? 'started' : 'failed');
                        break;
                    case 'stopListening':
                        // Handle stopListening response
                        console.log('📱 Message listening status:', response.listening ? 'still active' : 'stopped');
                        break;
                    case 'test_connection':
                        // Handle test_connection response
                        console.log('📱 Connection test result:', response.success ? 'connected' : 'failed');
                        break;
                    default:
                        if (!response.action) {
                            console.warn('📱 Unhandled status event: missing action field', response);
                        } else {
                            console.log('📱 Unhandled status event:', response.action, response);
                        }
                }
            }
        }

        /**
         * Trigger conversation refresh in the UI when new messages are detected
         */
        triggerConversationRefresh(response) {
            console.log('📱 [CRITICAL DEBUG] 🔄 Triggering conversation refresh in UI');
            
            // Method 1: Notify via event router if available
            if (this.eventRouter && this.eventRouter.routeDataEvent) {
                console.log('📱 [CRITICAL DEBUG] 🔄 Using event router for refresh');
                this.eventRouter.routeDataEvent({
                    action: 'conversation_refresh',
                    response: response,
                    timestamp: Date.now()
                });
            }
            
            // Method 2: Direct notification to any registered listeners
            this.notifyConversationHistory(response);
            
            // Method 3: Dispatch custom event for UI components to listen to
            try {
                const refreshEvent = new CustomEvent('sms-conversation-refresh', {
                    detail: {
                        response: response,
                        timestamp: Date.now(),
                        contactId: response.contactId || response.contact?.id
                    }
                });
                window.dispatchEvent(refreshEvent);
                console.log('📱 [CRITICAL DEBUG] 🔄 Dispatched sms-conversation-refresh event');
            } catch (error) {
                console.error('📱 [CRITICAL DEBUG] ❌ Failed to dispatch refresh event:', error);
            }
            
            // Method 4: Check if there's a global SMS system to notify
            if (window.app?.smsSystem?.refreshConversation) {
                console.log('📱 [CRITICAL DEBUG] 🔄 Calling global SMS system refresh');
                window.app.smsSystem.refreshConversation(response.contactId || response.contact?.id);
            }
        }

        /**
         * Show permission instructions to user
         */
        showPermissionInstructions(reason, instruction) {
            const message = reason === 'permanently_denied' 
                ? '📱 SMS permissions are required for messaging. Please enable them in Settings.'
                : '📱 SMS permissions needed. On Android 14+, you may need to enable them manually in Settings.';
            
            console.log('📱 PERMISSION INSTRUCTION:', message);
            console.log('📱 STEPS:', instruction);
            
            // You can add UI notification here if needed
            // For now, just log the instructions clearly
        }

        /**
         * Generate unique message ID
         */
        generateMessageId() {
            return `sms_${Date.now()}_${++this.messageIdCounter}`;
        }

        /**
         * API Methods for SMS operations
         */

        // Show native keyboard for SMS input
        showKeyboard(contactId, callback = null) {
            const message = {
                action: 'show_keyboard',
                contactId: contactId,
                inputType: 'sms'
            };
            
            return this.sendMessageToFlutter('input', message, callback);
        }

        // Hide native keyboard
        hideKeyboard(callback = null) {
            const message = {
                action: 'hide_keyboard'
            };
            
            return this.sendMessageToFlutter('input', message, callback);
        }

        /**
         * Register the SMS input listener with Flutter
         * This tells Flutter which contact is currently active for messaging
         */
        registerSmsInputListener(contactId, callback = null) {
            console.log(`📱 Registering SMS input listener for contact: ${contactId}`);
            const message = {
                action: 'register_listener',
                contactId: contactId,
                timestamp: Date.now()
            };
            
            return this.sendMessageToFlutter('input', message, callback);
        }

        // Send SMS message - OPTIMIZED VERSION to prevent freezing
        sendSmsMessage(contactId, messageText, callback = null) {
            console.log(`📱 Sending SMS to contact: ${contactId}, message: ${messageText}`);
            
            // Quick validation first
            if (!contactId || !messageText?.trim()) {
                console.error(`📱 ❌ Invalid parameters: contactId=${contactId}, messageText=${messageText}`);
                if (callback) {
                    callback({ success: false, error: 'Invalid contactId or message text' });
                }
                return false;
            }
            
            // PERFORMANCE FIX: Use enhanced contact resolver with caching
            let phoneNumber = null;
            
            try {
                // Use the global contact resolver if available (provides caching)
                if (window.smsContactResolver) {
                    phoneNumber = window.smsContactResolver.resolvePhoneNumber(contactId);
                    console.log(`📱 ✅ Phone resolved via cached resolver: ${phoneNumber}`);
                } else {
                    // Fallback to original resolution logic
                    // CRITICAL FIX: Try contactId as phone number first (for E.164 format like +12244405082)
                    if (contactId && (contactId.startsWith('+') || /^\d{10,15}$/.test(contactId))) {
                        phoneNumber = contactId;
                        console.log(`📱 ✅ Using contactId as phone number: ${phoneNumber}`);
                    } else if (window.app?.contactManager?.contacts) {
                        const contact = window.app.contactManager.contacts.get(contactId);
                        
                        if (contact?.contactData?.phoneNumber && contact.contactData.phoneNumber !== 'No Phone') {
                            phoneNumber = contact.contactData.phoneNumber;
                            console.log(`📱 ✅ Phone resolved: ${phoneNumber}`);
                        } else if (contact?.contactData) {
                            // OPTIMIZED: Check only essential phone fields, exit on first success
                            const phoneFields = ['phone', 'primaryPhone', 'cellPhone', 'mobilePhone'];
                            for (const field of phoneFields) {
                                if (contact.contactData[field] && contact.contactData[field] !== 'No Phone') {
                                    phoneNumber = contact.contactData[field];
                                    console.log(`📱 ✅ Phone found in ${field}: ${phoneNumber}`);
                                    break;
                                }
                            }
                        }
                        
                        if (!phoneNumber) {
                            console.error(`📱 ❌ NO PHONE NUMBER FOUND for contact: ${contactId}`);
                            if (callback) {
                                callback({ success: false, error: `No phone number found for contact: ${contactId}` });
                            }
                            return false;
                        }
                    } else {
                        console.error(`📱 ❌ Contact manager not available`);
                        if (callback) {
                            callback({ success: false, error: `Contact manager not available` });
                        }
                        return false;
                    }
                }
            } catch (error) {
                console.error(`📱 ❌ Error during contact resolution:`, error);
                if (callback) {
                    callback({ success: false, error: `Contact resolution failed: ${error.message}` });
                }
                return false;
            }

            // CRITICAL FIX: Use enhanced normalizer if available, otherwise fallback
            let normalizedPhoneNumber = null;
            
            try {
                if (window.smsContactResolver) {
                    normalizedPhoneNumber = window.smsContactResolver.normalizePhoneNumber(phoneNumber);
                    console.log(`📱 ✅ Phone normalized via enhanced resolver: ${normalizedPhoneNumber}`);
                } else {
                    // Fallback to original normalization logic
                    // First, handle E.164 format directly (e.g., +12244405082)
                    if (phoneNumber.startsWith('+') && phoneNumber.length >= 11) {
                        // For US numbers starting with +1, extract the 10-digit local part
                        if (phoneNumber.startsWith('+1') && phoneNumber.length === 12) {
                            normalizedPhoneNumber = phoneNumber.substring(2); // Remove +1
                            console.log(`📱 ✅ Extracted 10-digit from E.164: ${normalizedPhoneNumber}`);
                        } else {
                            // For other international numbers, use as-is but without the +
                            normalizedPhoneNumber = phoneNumber.substring(1);
                            console.log(`📱 ✅ Using international number without +: ${normalizedPhoneNumber}`);
                        }
                    } else if (window.PhoneUtils) {
                        normalizedPhoneNumber = window.PhoneUtils.normalizeToLocal10Digit(phoneNumber);
                        if (!normalizedPhoneNumber) {
                            console.error(`📱 ❌ Failed to normalize phone number to 10-digit format: ${phoneNumber}`);
                            if (callback) {
                                callback({ success: false, error: `Invalid phone number format: ${phoneNumber}` });
                            }
                            return false;
                        }
                        console.log(`📱 ✅ Normalized to 10-digit local: ${normalizedPhoneNumber}`);
                    } else {
                        console.warn('📱 ⚠️ PhoneUtils not available, using phone number as-is');
                        normalizedPhoneNumber = phoneNumber;
                    }

                    // Validate format (allow both 10-digit and 11-digit with country code)
                    if (normalizedPhoneNumber && !/^\d{10,11}$/.test(normalizedPhoneNumber)) {
                        console.error(`📱 ❌ Invalid phone number format: ${normalizedPhoneNumber}`);
                        if (callback) {
                            callback({ success: false, error: `Invalid phone number format: ${normalizedPhoneNumber}` });
                        }
                        return false;
                    }
                }
            } catch (normalizationError) {
                console.error(`📱 ❌ Error during phone number normalization:`, normalizationError);
                if (callback) {
                    callback({ success: false, error: `Phone normalization failed: ${normalizationError.message}` });
                }
                return false;
            }
            
            console.log(`📱 Sending SMS via Flutter with phone number: ${normalizedPhoneNumber}`);
            
            // CRITICAL FIX: Use the real Flutter bridge instead of mock channels
            try {
                if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                    console.log('📱 Using real Flutter bridge for SMS');
                    
                    // Create the payload in the format Flutter expects
                    const flutterPayload = {
                        contactId: contactId,
                        phoneNumber: normalizedPhoneNumber, // Send the resolved phone number
                        message: messageText, // Flutter expects "message" not "text"
                        timestamp: Date.now()
                    };
                    
                    console.log('📱 Flutter SMS payload:', JSON.stringify(flutterPayload, null, 2));
                    
                    // PERFORMANCE FIX: Add timeout protection to prevent freezing
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Flutter call timeout')), 5000); // 5 second timeout
                    });
                    
                    Promise.race([
                        window.flutter_inappwebview.callHandler('sendSMS', flutterPayload),
                        timeoutPromise
                    ])
                        .then(response => {
                            console.log('📱 Flutter SMS response:', response);
                            if (callback) {
                                callback(response);
                            }
                        })
                        .catch(error => {
                            console.error('📱 Flutter SMS error:', error);
                            if (callback) {
                                callback({ success: false, error: error.message || 'SMS sending failed' });
                            }
                        });
                    
                    return true;
                } else {
                    console.warn('📱 Flutter bridge not available, falling back to mock channels');
                    // Fall through to original mock channel code below
                }
            } catch (error) {
                console.error('📱 Error using Flutter bridge:', error);
                // Fall through to original mock channel code below
            }
            
            // Original mock channel fallback
            const message = {
                action: 'send_message',
                contactId: contactId,
                phoneNumber: normalizedPhoneNumber, // Send 10-digit local number to Flutter
                text: messageText,
                timestamp: Date.now()
            };
            
            console.log(`📱 [DEBUG] Final message payload before verification: phoneNumber=${normalizedPhoneNumber}, original=${phoneNumber}`);
            
            return this.sendMessageToFlutter('data', message, callback);
        }

        // Request conversation history
        getConversationHistory(contactId, limit = 50, callback = null, forceRefresh = false) {
            // DEDUPLICATION FIX: Check if there's already an identical in-flight request
            const requestKey = `${contactId}_${limit}_${forceRefresh}`;
            
            if (this.inflightConversationRequests.has(requestKey)) {
                console.log(`📱 [DEDUP] Reusing in-flight request for ${contactId} (${limit} messages, forceRefresh: ${forceRefresh})`);
                const inflightPromise = this.inflightConversationRequests.get(requestKey);
                
                // Attach callback to existing promise if provided
                if (callback) {
                    inflightPromise.then(callback).catch(err => {
                        console.error(`📱 [DEDUP] Error in deduplicated callback:`, err);
                        callback({ success: false, error: err.message });
                    });
                }
                
                return inflightPromise;
            }
            
            // CRITICAL FIX: Add throttling to prevent duplicate rapid-fire requests
            const throttleKey = `getConversation_${contactId}`;
            const now = Date.now();
            
            if (!this.lastRequestTime) {
                this.lastRequestTime = new Map();
            }
            if (!this.pendingRequests) {
                this.pendingRequests = new Set();
            }
            
            // ENHANCED: Check for new message contexts that should bypass throttling
            const isNewMessageContext = this.isNewMessageContext(contactId);
            const shouldBypassThrottle = forceRefresh || isNewMessageContext;
            
            // Check if there's already a pending request for this contact
            if (this.pendingRequests.has(contactId) && !shouldBypassThrottle) {
                console.warn(`📱 [THROTTLE] Request already pending for contact ${contactId} - preventing duplicate`);
                // CRITICAL FIX: Still call the callback with cached data if available
                if (callback && this.conversationCache && this.conversationCache.has(contactId)) {
                    console.log(`📱 [THROTTLE] Using cached conversation data for ${contactId}`);
                    const cached = this.conversationCache.get(contactId);
                    callback({ success: true, messages: cached.messages, fromCache: true });
                }
                return false;
            }
            
            const lastRequest = this.lastRequestTime.get(throttleKey) || 0;
            // CRITICAL FIX: Reduce throttle time and allow bypassing for new messages
            const throttleTime = shouldBypassThrottle ? 100 : 500; // Further reduced for real-time performance
            if (!shouldBypassThrottle && now - lastRequest < throttleTime) {
                console.log(`📱 [CRITICAL DEBUG] 🚫 Throttling conversation request for contact ${contactId} (too soon - ${now - lastRequest}ms ago)`);
                if (callback) {
                    console.log(`📱 [CRITICAL DEBUG] 🚫 Suppressing callback for throttled request`);
                }
                return false;
            }
            
            // ENHANCED: Clear any stale pending requests
            if (this.pendingRequests.has(contactId) && shouldBypassThrottle) {
                console.log(`📱 [CRITICAL DEBUG] ⚡ Clearing stale pending request for critical update`);
                this.pendingRequests.delete(contactId);
            }
            
            // Mark this contact as having a pending request
            this.pendingRequests.add(contactId);
            this.lastRequestTime.set(throttleKey, now);
            
            console.log(`📱 [CRITICAL DEBUG] ✅ Allowing conversation request for contact ${contactId} (forceRefresh: ${forceRefresh}, isNewMessageContext: ${isNewMessageContext}, bypassThrottle: ${shouldBypassThrottle})`);
            
            const message = {
                action: 'get_conversation',
                contactId: contactId,
                limit: limit
            };
            
            // Add timestamp for force refresh to ensure backend returns fresh data
            if (forceRefresh) {
                message.forceRefresh = true;
                message.timestamp = Date.now();
                console.log(`🔄 FORCE REFRESH: Requesting fresh conversation data for ${contactId} with timestamp ${message.timestamp}`);
            }
            
            // Create promise for this request and track it
            const requestPromise = new Promise((resolve, reject) => {
                // Wrap the callback to clear flags and resolve promise
                const wrappedCallback = (response) => {
                    console.log(`📱 [DEDUP] Request completed for ${contactId}, clearing in-flight tracking`);
                    this.pendingRequests.delete(contactId);
                    this.inflightConversationRequests.delete(requestKey);
                    
                    if (callback) {
                        callback(response);
                    }
                    resolve(response);
                };
                
                // Send the actual request
                this.sendMessageToFlutter('data', message, wrappedCallback);
            });
            
            // Track this in-flight request
            this.inflightConversationRequests.set(requestKey, requestPromise);
            
            // CRITICAL FIX: Auto-clear flags after timeout to prevent stuck requests
            setTimeout(() => {
                if (this.pendingRequests.has(contactId)) {
                    console.warn(`📱 [THROTTLE] Timeout reached - force clearing stuck pending flag for ${contactId}`);
                    this.pendingRequests.delete(contactId);
                }
                if (this.inflightConversationRequests.has(requestKey)) {
                    console.warn(`📱 [DEDUP] Timeout reached - clearing in-flight request for ${contactId}`);
                    this.inflightConversationRequests.delete(requestKey);
                }
            }, 5000); // 5 second timeout
            
            return requestPromise;
        }

        // Request SMS permissions
        requestSmsPermissions(callback = null) {
            const message = {
                action: 'request_permissions'
            };
            
            return this.sendMessageToFlutter('status', message, callback);
        }

        /**
         * Event notification methods (to be overridden by clients)
         */
        notifyKeyboardState(isShown) {
            // Override this method to handle keyboard state changes
            console.log('📱 Keyboard state changed:', isShown ? 'shown' : 'hidden');
        }

        notifyTextInput(text, contactId = null) {
            console.log('📱 Text input received:', text?.length || 0, 'characters');
            
            // Store current contact for context
            if (contactId) {
                this.currentContactId = contactId;
            }
            
            // PERFORMANCE FIX: Simplified SMS screen update - no cascading refreshes
            const activeContactId = this.currentContactId || contactId;
            if (activeContactId && window.app?.contactManager?.contacts) {
                const contact = window.app.contactManager.contacts.get(activeContactId);
                if (contact?.smsScreen?.isVisible && typeof contact.smsScreen.updateInputText === 'function') {
                    contact.smsScreen.updateInputText(text);
                    console.log(`[UI] ✅ SMS screen input updated for contact: ${activeContactId}`);
                }
            }
            
            // Pass text input to SMS integration system (lightweight operation only)
            if (window.app?.smsIntegrationManager?.handleChannelTextInput) {
                window.app.smsIntegrationManager.handleChannelTextInput(text, activeContactId);
            }
        }

        notifyMessageSent(response) {
            // Override this method to handle sent message confirmation
            console.log('📱 Message sent:', response);
        }

        notifyMessageReceived(response) {
            // Enhanced implementation to properly handle incoming messages
            console.log('📱 [CRITICAL DEBUG] ⭐⭐⭐ notifyMessageReceived called ⭐⭐⭐');
            console.log('📱 [CRITICAL DEBUG] Response object:', JSON.stringify(response, null, 2));
            
            const contactId = response.contactId;
            const messageText = response.text || 'N/A';
            const phoneNumber = response.phoneNumber || response.phone || response.from || 'N/A';
            
            if (!contactId) {
                console.warn('📱 [CRITICAL DEBUG] ❌ notifyMessageReceived: No contactId provided', response);
                return;
            }
            
            console.log(`📱 [CRITICAL DEBUG] Processing received message for contact ${contactId}: "${messageText}"`);
            console.log(`📱 [CRITICAL DEBUG] Phone number: ${phoneNumber}`);
            
            // Check if SMS screen is currently visible for this contact
            if (window.app?.contactManager?.contacts) {
                const contact = window.app.contactManager.contacts.get(contactId);
                console.log(`📱 [CRITICAL DEBUG] Contact found: ${!!contact}`);
                console.log(`📱 [CRITICAL DEBUG] SMS screen exists: ${!!contact?.smsScreen}`);
                console.log(`📱 [CRITICAL DEBUG] SMS screen visible: ${contact?.smsScreen?.isVisible}`);
            }
            
            // ENHANCED: Add comprehensive throttling to prevent infinite refresh loops and duplicate requests
            const refreshKey = `refresh_${contactId}`;
            const now = Date.now();
            
            if (!this.lastRefreshTime) {
                this.lastRefreshTime = new Map();
            }
            if (!this.pendingRefreshes) {
                this.pendingRefreshes = new Set();
            }
            
            // Check if there's already a pending refresh for this contact
            if (this.pendingRefreshes.has(contactId)) {
                console.log(`📱 [CRITICAL DEBUG] 🚫 Refresh already pending for contact ${contactId} - skipping duplicate`);
                return;
            }
            
            const lastRefresh = this.lastRefreshTime.get(refreshKey) || 0;
            if (now - lastRefresh < 2000) { // Increased throttle to 2 seconds to prevent rapid-fire requests
                console.log(`📱 [CRITICAL DEBUG] 🚫 Throttling refresh for contact ${contactId} (too soon - ${now - lastRefresh}ms ago)`);
                return;
            }
            
            // Mark this contact as having a pending refresh
            this.pendingRefreshes.add(contactId);
            this.lastRefreshTime.set(refreshKey, now);
            
            // Primary approach: Use SMS Integration Manager for conversation refresh
            if (window.app?.smsIntegrationManager) {
                console.log(`📱 [CRITICAL DEBUG] Triggering conversation refresh via SMS Integration Manager for contact ${contactId}`);
                
                // Force refresh to ensure the new message is included
                window.app.smsIntegrationManager.getConversation(contactId, true)
                    .then((messages) => {
                        console.log(`📱 [CRITICAL DEBUG] Conversation refreshed for ${contactId}, found ${messages.length} messages`);
                        
                        // Clear the pending refresh flag
                        this.pendingRefreshes.delete(contactId);
                        
                        // Additionally update SMS screen directly if it's visible
                        this.updateSmsScreenIfVisible(contactId, messages);
                    })
                    .catch((error) => {
                        console.error(`📱 [CRITICAL DEBUG] Failed to refresh conversation for ${contactId}:`, error);
                        
                        // Clear the pending refresh flag even on error
                        this.pendingRefreshes.delete(contactId);
                    });
            } else if (window.app?.smsChannelManager) {
                // Fallback: Use channel manager directly
                console.log(`📱 [CRITICAL DEBUG] FALLBACK: Using channel manager to refresh conversation for contact ${contactId}`);
                this.loadConversation(contactId);
                
                // Clear the pending refresh flag for fallback as well
                this.pendingRefreshes.delete(contactId);
            } else {
                console.error('📱 [CRITICAL DEBUG] ❌ No SMS managers available for handling received message!', {
                    contactId,
                    phoneNumber,
                    hasApp: !!window.app,
                    hasIntegrationManager: !!window.app?.smsIntegrationManager,
                    hasChannelManager: !!window.app?.smsChannelManager
                });
                
                // Clear the pending refresh flag even if no managers available
                this.pendingRefreshes.delete(contactId);
            }
        }
        
        /**
         * Helper method to find a contact by ID or phone number
         * @param {string} contactIdOrPhone - The contact ID or phone number
         * @returns {Object|null} - The contact object or null if not found
         */
        findContactByIdOrPhone(contactIdOrPhone) {
            if (!window.app?.contactManager?.contacts) {
                return null;
            }
            
            // First try to find by ID
            let contact = window.app.contactManager.contacts.get(contactIdOrPhone);
            
            // If not found by ID and looks like a phone number, search by phone number
            if (!contact && typeof contactIdOrPhone === 'string' && contactIdOrPhone.match(/^[\+\-\(\)\s\d]+$/)) {
                // Normalize the search phone number for comparison
                const normalizedSearch = this.normalizePhoneNumber(contactIdOrPhone);
                
                for (const [id, potentialContact] of window.app.contactManager.contacts) {
                    // Normalize the stored phone number for comparison
                    const normalizedStored = this.normalizePhoneNumber(potentialContact.phoneNumber);
                    
                    if (normalizedStored === normalizedSearch) {
                        contact = potentialContact;
                        console.log(`📱 [FIND CONTACT] Found contact by phone number: ${contactIdOrPhone} (normalized: ${normalizedSearch}) -> stored: ${potentialContact.phoneNumber} (normalized: ${normalizedStored}) -> ID: ${id}`);
                        break;
                    }
                }
            }
            
            return contact;
        }

        /**
         * Normalize phone number for comparison - strips formatting and standardizes to +1XXXXXXXXXX
         */
        normalizePhoneNumber(phoneNumber) {
            if (!phoneNumber) return '';
            
            // Remove all non-digits
            const digits = phoneNumber.replace(/\D/g, '');
            
            // Handle different formats
            if (digits.length === 10) {
                // US number without country code: 2244405082 -> +12244405082
                return `+1${digits}`;
            } else if (digits.length === 11 && digits.startsWith('1')) {
                // US number with country code: 12244405082 -> +12244405082
                return `+${digits}`;
            } else if (phoneNumber.startsWith('+')) {
                // Already E.164 format: +12244405082
                return phoneNumber;
            }
            
            // Return as-is if we can't normalize it
            return phoneNumber;
        }
        
        /**
         * Helper method to update SMS screen if it's currently visible
         * @param {string} contactId - The contact ID
         * @param {Array} messages - The updated message list
         */
        updateSmsScreenIfVisible(contactId, messages) {
            try {
                console.log(`📱 [CRITICAL DEBUG] 🔄 updateSmsScreenIfVisible called for contact ${contactId} with ${messages.length} messages`);
                
                const contact = this.findContactByIdOrPhone(contactId);
                console.log(`📱 [CRITICAL DEBUG] Contact ${contactId} found:`, !!contact);
                
                if (contact) {
                    if (contact?.smsScreen) {
                        console.log(`📱 [CRITICAL DEBUG] SMS screen exists for contact ${contactId}`);
                        console.log(`📱 [CRITICAL DEBUG] SMS screen visible:`, contact.smsScreen.isVisible);
                        console.log(`📱 [CRITICAL DEBUG] SMS screen has updateMessages method:`, typeof contact.smsScreen.updateMessages);
                        
                        if (contact.smsScreen.isVisible) {
                            // Method 1: Direct updateMessages call
                            if (typeof contact.smsScreen.updateMessages === 'function') {
                                console.log(`📱 [CRITICAL DEBUG] 🎯 Calling updateMessages with ${messages.length} messages`);
                                
                                // CRITICAL FIX: Force fresh data by adding timestamp
                                const freshMessages = messages.map(msg => ({
                                    ...msg,
                                    _freshDataTimestamp: Date.now()
                                }));
                                
                                contact.smsScreen.updateMessages(freshMessages);
                                
                                // CRITICAL FIX: Force immediate re-render after a short delay
                                setTimeout(() => {
                                    if (contact.smsScreen.renderInterface) {
                                        console.log(`📱 [CRITICAL DEBUG] 🎯 Force re-render after fresh data`);
                                        contact.smsScreen.renderInterface();
                                    }
                                }, 50);
                            }
                            
                            // Method 2: Alternative update methods
                            if (typeof contact.smsScreen.refreshMessages === 'function') {
                                console.log(`📱 [CRITICAL DEBUG] 🎯 Calling refreshMessages as alternative`);
                                contact.smsScreen.refreshMessages(messages);
                            }
                            
                            // Method 3: Force render/update
                            if (typeof contact.smsScreen.render === 'function') {
                                console.log(`📱 [CRITICAL DEBUG] 🎯 Calling render to force update`);
                                contact.smsScreen.render();
                            }
                            
                            // Method 4: Dispatch custom event for the SMS screen to listen to
                            try {
                                const updateEvent = new CustomEvent('sms-messages-updated', {
                                    detail: {
                                        contactId: contactId,
                                        messages: messages,
                                        timestamp: Date.now()
                                    }
                                });
                                window.dispatchEvent(updateEvent);
                                console.log(`📱 [CRITICAL DEBUG] 🎯 Dispatched sms-messages-updated event`);
                            } catch (eventError) {
                                console.error('📱 [CRITICAL DEBUG] Failed to dispatch update event:', eventError);
                            }
                            
                            console.log(`📱 [CRITICAL DEBUG] ✅ SMS screen update attempted for contact ${contactId}`);
                        } else {
                            console.log(`📱 [CRITICAL DEBUG] SMS screen exists for contact ${contactId} but is not visible`);
                        }
                    } else {
                        console.log(`📱 [CRITICAL DEBUG] No SMS screen found for contact ${contactId}`);
                        
                        // Alternative: Try to find and update any active SMS UI
                        if (window.app?.smsSystem) {
                            console.log(`📱 [CRITICAL DEBUG] 🎯 Trying to update via global SMS system`);
                            if (typeof window.app.smsSystem.updateMessages === 'function') {
                                window.app.smsSystem.updateMessages(contactId, messages);
                            }
                            if (typeof window.app.smsSystem.refreshConversation === 'function') {
                                window.app.smsSystem.refreshConversation(contactId);
                            }
                        }
                    }
                } else {
                    console.log(`📱 [CRITICAL DEBUG] No contact found for ${contactId}`);
                    
                    // Global fallback: Try to find any SMS UI components
                    console.log(`📱 [CRITICAL DEBUG] 🎯 Trying global SMS UI update methods`);
                    
                    // Check for global SMS functions
                    if (typeof window.updateSmsConversation === 'function') {
                        console.log(`📱 [CRITICAL DEBUG] 🎯 Calling global updateSmsConversation`);
                        window.updateSmsConversation(contactId, messages);
                    }
                    
                    if (typeof window.refreshSmsScreen === 'function') {
                        console.log(`📱 [CRITICAL DEBUG] 🎯 Calling global refreshSmsScreen`);
                        window.refreshSmsScreen(contactId);
                    }
                }
            } catch (error) {
                console.error(`📱 [CRITICAL DEBUG] ❌ Error updating SMS screen for contact ${contactId}:`, error);
            }
        }

        notifyConversationHistory(response) {
            // CRITICAL FIX: Dispatch event to smsEventRouter for proper conversation history handling
            console.log('📱 [CRITICAL FIX] Conversation history received, dispatching event:', response);
            
            // Dispatch the conversation_history event to the smsEventRouter
            if (window.app?.smsEventRouter) {
                console.log('📱 [CRITICAL FIX] Dispatching conversation_history to smsEventRouter');
                window.app.smsEventRouter.handleDataEvent('conversation_history', response);
            } else {
                console.error('📱 [CRITICAL FIX] ❌ smsEventRouter not available for conversation_history dispatch!');
            }
            
            // Also dispatch as a global event for other potential listeners
            window.dispatchEvent(new CustomEvent('sms-conversation-history', { 
                detail: response 
            }));
        }

        notifyPermissionStatus(response) {
            // Override this method to handle permission status
            console.log('📱 Permission status:', response);
        }

        /**
         * Promise-based API methods for SMS Channel Integration
         */

        /**
         * Send SMS message (Promise-based for SMS Channel Integration)
         */
        sendMessage(messageText, contactId) {
            return new Promise((resolve, reject) => {
                // Use the enhanced sendSmsMessage with phone number resolution
                this.sendSmsMessage(contactId, messageText, (response) => {
                    if (response && response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response?.error || 'Failed to send message'));
                    }
                });
            });
        }

        /**
         * Load conversation (Promise-based for SMS Channel Integration)
         */
        loadConversation(contactId) {
            return new Promise((resolve, reject) => {
                console.log('📱 Loading conversation for contact:', contactId);
                
                const messageData = {
                    action: 'loadConversation',
                    contactId: contactId,
                    timestamp: Date.now()
                };

                this.sendMessageToFlutter('data', messageData, (response) => {
                    if (response && response.success) {
                        console.log('📱 Conversation loaded successfully');
                        // Defensive handling: ensure messages is always an array
                        const messages = Array.isArray(response.messages) ? response.messages : [];
                        resolve(messages);
                    } else {
                        console.warn('📱 Failed to load conversation:', response?.error || 'Unknown error');
                        resolve([]); // Resolve with empty array rather than reject
                    }
                });
            });
        }

        /**
         * Stop listening for incoming messages
         */
        stopMessageListening() {
            console.log('📱 Stopping message listening');
            
            const messageData = {
                action: 'stopListening',
                timestamp: Date.now()
            };

            this.sendMessageToFlutter('status', messageData, (response) => {
                if (response && response.success) {
                    console.log('📱 Message listening stopped successfully');
                } else {
                    console.warn('📱 Failed to stop message listening:', response?.error || 'Unknown error');
                }
            });
        }

        /**
         * Start listening for incoming messages
         */
        startMessageListening(contactId = null) {
            console.log('📱 Starting message listening for contact:', contactId || 'all');
            
            const messageData = {
                action: 'startListening',
                contactId: contactId,
                timestamp: Date.now()
            };

            this.sendMessageToFlutter('status', messageData, (response) => {
                if (response && response.success) {
                    console.log('📱 Message listening started successfully');
                } else {
                    console.warn('📱 Failed to start message listening:', response?.error || 'Unknown error');
                }
            });
        }

        /**
         * Clear pending operations and reset state
         */
        clearPendingOperations() {
            console.log('📱 Clearing pending operations');
            
            // Clear pending messages
            this.pendingMessages = [];
            
            // Clear all pending callbacks
            this.messageCallbacks.clear();
            
            // Reset connection state if needed
            this.isFlutterConnected = false;
            
            console.log('📱 Pending operations cleared');
        }

        /**
         * Check if a contact has recent new message activity
         */
        isNewMessageContext(contactId) {
            if (!this.newMessageActivity) return false;
            const activity = this.newMessageActivity.get(contactId);
            // Activity is valid for 5 seconds
            return activity && (Date.now() - activity.timestamp < 5000);
        }

        /**
         * Mark a contact as having new message activity to bypass throttling
         */
        markNewMessageActivity(contactId, type = 'received') {
            if (!this.newMessageActivity) {
                this.newMessageActivity = new Map();
            }
            console.warn(`[Activity] Marking new message activity for contact ${contactId} of type: ${type}`);
            this.newMessageActivity.set(contactId, { type, timestamp: Date.now() });
        }

        /**
         * Load conversation history for a contact from Flutter
         */
        loadConversation(contactId, phoneNumber = null, limit = 50, forceRefresh = false, callback = null) {
            if (this.isFlutterConnected) {
                // PERFORMANCE FIX: Throttle requests to prevent spamming Flutter
                const throttleKey = `get_conversation_${contactId}`;
                const now = Date.now();

                if (!this.lastRefreshTime) {
                    this.lastRefreshTime = new Map();
                }

                const lastRequest = this.lastRefreshTime.get(throttleKey) || 0;
                const isNew = this.isNewMessageContext(contactId);
                const throttleInterval = isNew ? 250 : 1000; // 250ms for new messages, 1s otherwise

                if (forceRefresh || isNew || (now - lastRequest >= throttleInterval)) {
                    this.lastRefreshTime.set(throttleKey, now);

                    // Consume the new message flag
                    if (isNew) {
                        this.markNewMessageActivity(contactId, 'consumed');
                    }

                    console.log(`[Throttle] Permitting getConversation() for contact ${contactId} (Forced: ${!!forceRefresh}, NewMsg: ${isNew})`);

                    this.sendMessageToFlutter('data', {
                        action: 'get_conversation',
                        contactId: contactId,
                        phoneNumber: phoneNumber,
                        limit: limit
                    }, callback);
                } else {
                    console.log(`[Throttle] Blocking repeated getConversation() request for contact ${contactId}`);
                    if (callback) {
                        callback({ success: false, error: 'Request throttled' });
                    }
                }
            } else {
                console.warn('📱 Flutter is not connected, cannot load conversation');
                if (callback) {
                    callback({ success: false, error: 'Flutter not connected' });
                }
            }
        }
        
        /**
         * Force setup of incoming SMS listener - useful for debugging
         * This triggers the Flutter side to re-initialize the telephony listener
         */
        forceSetupListener() {
            console.log('📱 🔧 Forcing SMS listener setup from JavaScript');
            
            if (this.isFlutterConnected) {
                return this.sendMessageToFlutter('status', {
                    action: 'force_setup_listener'
                }, (response) => {
                    if (response && response.success) {
                        console.log('📱 ✅ SMS listener setup triggered successfully');
                    } else {
                        console.error('📱 ❌ Failed to trigger SMS listener setup:', response);
                    }
                });
            } else {
                console.warn('📱 Cannot force setup - Flutter not connected');
                return Promise.reject(new Error('Flutter not connected'));
            }
        }
        
        /**
         * Test incoming message processing - useful for debugging
         * This triggers a simulated incoming SMS to test the processing pipeline
         */
        testIncomingMessage() {
            console.log('📱 🧪 Testing incoming message processing from JavaScript');
            
            if (this.isFlutterConnected) {
                return this.sendMessageToFlutter('status', {
                    action: 'test_incoming_message'
                }, (response) => {
                    if (response && response.success) {
                        console.log('📱 ✅ Test incoming message processed successfully');
                    } else {
                        console.error('📱 ❌ Failed to process test incoming message:', response);
                    }
                });
            } else {
                console.warn('📱 Cannot test incoming message - Flutter not connected');
                return Promise.reject(new Error('Flutter not connected'));
            }
        }
    }

    // Export to global scope
    window.SmsChannelManager = SmsChannelManager;
    console.log('📱 SmsChannelManager class exported to window');

})();
