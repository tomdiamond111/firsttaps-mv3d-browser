/**
 * SmsChannelManager - Refactored modular version
 * Coordinates between specialized SMS modules for better maintainability
 * 
 * This is the new streamlined version that delegates to focused modules:
 * - SmsChannelSetup: Flutter channel initialization
 * - SmsThrottleManager: Request throttling and performance optimization
 * - SmsContactResolver: Phone number normalization and contact resolution
 * - SmsMessageHandler: Message sending/receiving and conversation management
 * - SmsEventNotifier: Event notifications and UI updates
 */
(function() {
    'use strict';

    class SmsChannelManager {
        constructor(options = {}) {
            console.log('📱 Initializing SmsChannelManager (Refactored)...');
            
            // Initialize core modules
            this.throttleManager = new window.SmsThrottleManager();
            this.contactResolver = new window.SmsContactResolver();
            this.channelSetup = new window.SmsChannelSetup(options);
            this.messageHandler = new window.SmsMessageHandler(
                this.channelSetup, 
                this.contactResolver, 
                this.throttleManager
            );
            this.eventNotifier = new window.SmsEventNotifier(
                this.messageHandler, 
                this.contactResolver, 
                this.throttleManager
            );
            
            // Cache references for compatibility with existing code
            this.messageCallbacks = this.channelSetup.messageCallbacks;
            this.pendingMessages = this.channelSetup.pendingMessages;
            this.isFlutterConnected = false;
            
            // Setup response handlers
            this.setupResponseHandlers();
            
            console.log('📱 ✅ SmsChannelManager (Refactored) initialized successfully');
        }

        /**
         * Setup response handlers to maintain compatibility with original interface
         */
        setupResponseHandlers() {
            // Override the placeholder methods in channelSetup
            this.channelSetup.handleSmsInputResponse = (data) => this.handleSmsInputResponse(data);
            this.channelSetup.handleSmsDataResponse = (data) => this.handleSmsDataResponse(data);
            this.channelSetup.handleSmsDataDirectly = (data) => this.handleSmsDataDirectly(data);
            this.channelSetup.handleSmsStatusResponse = (data) => this.handleSmsStatusResponse(data);
        }

        /**
         * Initialize channels - delegates to channelSetup
         */
        initializeChannels() {
            const result = this.channelSetup.initializeChannels();
            this.isFlutterConnected = this.channelSetup.isFlutterConnected;
            return result;
        }

        /**
         * Test Flutter connection
         */
        testFlutterConnection() {
            return this.channelSetup.testFlutterConnection().then((result) => {
                this.isFlutterConnected = this.channelSetup.isFlutterConnected;
                return result;
            });
        }

        /**
         * Test connection (alias for compatibility)
         */
        testConnection() {
            return this.testFlutterConnection();
        }

        /**
         * Send message to Flutter - delegates to channelSetup
         */
        sendMessageToFlutter(channelType, messageData, callback = null) {
            return this.channelSetup.sendMessageToFlutter(channelType, messageData, callback);
        }

        /**
         * Verify payload integrity - delegates to channelSetup
         */
        verifyPayloadIntegrity(payload) {
            return this.channelSetup.verifyPayloadIntegrity(payload);
        }

        /**
         * Process pending messages - delegates to channelSetup
         */
        processPendingMessages() {
            this.channelSetup.processPendingMessages();
        }

        /**
         * Handle Flutter message - delegates to channelSetup
         */
        handleFlutterMessage(channelType, message) {
            this.channelSetup.handleFlutterMessage(channelType, message);
        }

        // =========================
        // SMS Input Response Handler
        // =========================
        handleSmsInputResponse(data) {
            console.log('📱 Processing SMS input response:', data);
            
            const messageId = data.id || data.messageId;
            if (messageId && this.messageCallbacks.has(messageId)) {
                const callback = this.messageCallbacks.get(messageId);
                this.messageCallbacks.delete(messageId);
                
                const response = {
                    success: data.success !== false,
                    data: data,
                    timestamp: Date.now()
                };
                
                try {
                    callback(response);
                } catch (error) {
                    console.error('📱 Error in input callback:', error);
                }
            }
            
            // Handle specific input events
            this.handleInputEvent(data);
        }

        // =========================
        // SMS Data Response Handler
        // =========================
        handleSmsDataResponse(data) {
            console.log('📱 Processing SMS data response:', data);
            
            const messageId = data.id || data.messageId;
            if (messageId && this.messageCallbacks.has(messageId)) {
                const callback = this.messageCallbacks.get(messageId);
                this.messageCallbacks.delete(messageId);
                
                // 🚀 CRITICAL FIX: Handle phone-to-contactId mapping for standard responses
                let contactId = data.contactId;
                const phoneNumber = data.phoneNumber || data.phone;
                
                if (phoneNumber && (!contactId || contactId === phoneNumber)) {
                    try {
                        contactId = this.contactResolver.mapPhoneToContactId(phoneNumber, contactId);
                        console.log(`📱 ✅ Mapped phone ${phoneNumber} to contactId ${contactId}`);
                    } catch (error) {
                        console.warn(`📱 ⚠️ Failed to map phone to contactId:`, error.message);
                    }
                }
                
                const response = {
                    success: data.success !== false,
                    contactId: contactId,
                    messages: data.messages || [],
                    data: data,
                    timestamp: Date.now()
                };
                
                try {
                    // PERFORMANCE FIX: Only trigger UI update if we have a valid contactId and messages
                    if (contactId && Array.isArray(response.messages) && response.messages.length > 0) {
                        console.log(`📱 ✅ SMS data received for contact ${contactId}: ${response.messages.length} messages`);
                        this.eventNotifier.updateSmsScreenIfVisible(contactId, response.messages);
                    }
                    
                    callback(response);
                } catch (error) {
                    console.error('📱 Error in data callback:', error);
                }
            } else {
                console.warn('📱 ⚠️ No callback found for SMS data response:', data);
            }
        }

        // =========================
        // SMS Data Direct Handler (Real-time events)
        // =========================
        handleSmsDataDirectly(data) {
            console.log('📱 ⚡ Processing real-time SMS event:', data);
            
            const messageId = data.id || data.messageId;
            if (messageId && this.messageCallbacks.has(messageId)) {
                const callback = this.messageCallbacks.get(messageId);
                this.messageCallbacks.delete(messageId);
                
                // 🚀 CRITICAL FIX: Handle phone-to-contactId mapping for real-time events
                let contactId = data.contactId;
                const phoneNumber = data.phoneNumber || data.phone || data.from;
                
                if (phoneNumber && (!contactId || contactId === phoneNumber)) {
                    try {
                        contactId = this.contactResolver.mapPhoneToContactId(phoneNumber, contactId);
                        console.log(`📱 ⚡ Real-time: Mapped phone ${phoneNumber} to contactId ${contactId}`);
                    } catch (error) {
                        console.warn(`📱 ⚠️ Real-time: Failed to map phone to contactId:`, error.message);
                    }
                }
                
                const response = {
                    success: data.success !== false,
                    contactId: contactId,
                    phoneNumber: phoneNumber,
                    text: data.text || data.message,
                    isIncoming: data.isIncoming || data.type === 'received',
                    timestamp: data.timestamp || Date.now(),
                    data: data
                };
                
                try {
                    callback(response);
                } catch (error) {
                    console.error('📱 Error in real-time callback:', error);
                }
            }
            
            // Always process real-time events through the notification system
            if (data.type === 'received' || data.isIncoming) {
                console.log('📱 ⚡ Triggering notifyMessageReceived for real-time event');
                this.eventNotifier.notifyMessageReceived({
                    contactId: data.contactId,
                    phoneNumber: phoneNumber,
                    text: data.text || data.message,
                    timestamp: data.timestamp || Date.now(),
                    isRealTime: true
                });
            } else if (data.type === 'sent' || data.isSent) {
                console.log('📱 ⚡ Triggering notifyMessageSent for real-time event');
                this.eventNotifier.notifyMessageSent({
                    contactId: data.contactId,
                    phoneNumber: phoneNumber,
                    text: data.text || data.message,
                    timestamp: data.timestamp || Date.now(),
                    isRealTime: true
                });
            }
        }

        // =========================
        // SMS Status Response Handler
        // =========================
        handleSmsStatusResponse(data) {
            console.log('📱 Processing SMS status response:', data);
            
            const messageId = data.id || data.messageId;
            if (messageId && this.messageCallbacks.has(messageId)) {
                const callback = this.messageCallbacks.get(messageId);
                this.messageCallbacks.delete(messageId);
                
                const response = {
                    success: data.success !== false,
                    status: data.status,
                    permissions: data.permissions,
                    data: data,
                    timestamp: Date.now()
                };
                
                try {
                    callback(response);
                } catch (error) {
                    console.error('📱 Error in status callback:', error);
                }
            }
            
            // Handle connection status changes
            if (data.connected !== undefined) {
                this.isFlutterConnected = data.connected;
                this.channelSetup.isFlutterConnected = data.connected;
                this.eventNotifier.notifyConnectionStatus(data.connected);
            }
            
            // Handle permission status changes
            if (data.permissions) {
                this.eventNotifier.notifyPermissionStatus(data.permissions.sms, data.permissions);
            }
        }

        // =========================
        // Input Event Handler
        // =========================
        handleInputEvent(response) {
            console.log('📱 Handling input event:', response);
            
            if (response.type === 'keyboard_shown') {
                this.eventNotifier.notifyKeyboardState(true);
            } else if (response.type === 'keyboard_hidden') {
                this.eventNotifier.notifyKeyboardState(false);
            } else if (response.type === 'text_input') {
                this.eventNotifier.notifyTextInput(response.text, response.contactId);
            } else if (response.type === 'message_sent') {
                this.eventNotifier.notifyMessageSent(response);
            }
        }

        // =========================
        // Public API Methods (delegate to appropriate modules)
        // =========================

        // Message operations
        sendSmsMessage(contactId, messageText, callback = null) {
            return this.messageHandler.sendSmsMessage(contactId, messageText, callback);
        }

        getConversationHistory(contactId, limit = 50, callback = null, forceRefresh = false) {
            return this.messageHandler.getConversationHistory(contactId, limit, callback, forceRefresh);
        }

        loadConversation(contactId, phoneNumber = null, limit = 50, forceRefresh = false, callback = null) {
            return this.messageHandler.loadConversation(contactId, phoneNumber, limit, forceRefresh, callback);
        }

        loadConversationAsync(contactId, phoneNumber = null, limit = 50, forceRefresh = false) {
            return this.messageHandler.loadConversationAsync(contactId, phoneNumber, limit, forceRefresh);
        }

        // Input operations
        showKeyboard(contactId, callback = null) {
            return this.messageHandler.showKeyboard(contactId, callback);
        }

        hideKeyboard(callback = null) {
            return this.messageHandler.hideKeyboard(callback);
        }

        registerSmsInputListener(contactId, callback = null) {
            return this.messageHandler.registerSmsInputListener(contactId, callback);
        }

        // Status operations
        requestSmsPermissions(callback = null) {
            return this.messageHandler.requestSmsPermissions(callback);
        }

        startMessageListening(contactId = null) {
            return this.messageHandler.startMessageListening(contactId);
        }

        stopMessageListening() {
            return this.messageHandler.stopMessageListening();
        }

        forceSetupListener() {
            return this.messageHandler.forceSetupListener();
        }

        testIncomingMessage() {
            return this.messageHandler.testIncomingMessage();
        }

        // Event notification methods (delegate to eventNotifier)
        notifyKeyboardState(isShown) {
            this.eventNotifier.notifyKeyboardState(isShown);
        }

        notifyTextInput(text, contactId = null) {
            this.eventNotifier.notifyTextInput(text, contactId);
        }

        notifyMessageSent(response) {
            this.eventNotifier.notifyMessageSent(response);
        }

        notifyMessageReceived(response) {
            this.eventNotifier.notifyMessageReceived(response);
        }

        // Utility methods
        clearPendingOperations() {
            this.messageHandler.clearPendingOperations();
            this.channelSetup.messageCallbacks.clear();
            this.channelSetup.pendingMessages = [];
        }

        isNewMessageContext(contactId) {
            return this.throttleManager.isNewMessageContext(contactId);
        }

        markNewMessageActivity(contactId, type = 'received') {
            this.throttleManager.markNewMessageActivity(contactId, type);
        }

        updateSmsScreenIfVisible(contactId, messages = null) {
            this.eventNotifier.updateSmsScreenIfVisible(contactId, messages);
        }

        // Status getters
        get currentContactId() {
            return this.messageHandler.getCurrentContactId();
        }

        set currentContactId(contactId) {
            this.messageHandler.setCurrentContactId(contactId);
        }

        getConnectionStatus() {
            return this.channelSetup.getConnectionStatus();
        }

        getStats() {
            return {
                ...this.channelSetup.getConnectionStatus(),
                ...this.eventNotifier.getNotificationStats()
            };
        }
    }

    // Export to global scope
    window.SmsChannelManager = SmsChannelManager;
    console.log('📱 SmsChannelManager (Refactored) class exported to window');

})();
