/**
 * SmsMessageHandler - Handles SMS message sending, receiving, and conversation management
 * Extracted from smsChannelManager.js for better maintainability
 */
(function() {
    'use strict';

    class SmsMessageHandler {
        constructor(channelSetup, contactResolver, throttleManager) {
            this.channelSetup = channelSetup;
            this.contactResolver = contactResolver;
            this.throttleManager = throttleManager;
            this.currentContactId = null;
            
            console.log('📱 SmsMessageHandler initialized');
        }

        /**
         * Send SMS message - OPTIMIZED VERSION to prevent freezing
         */
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
            
            try {
                // Resolve and normalize phone number
                const normalizedPhoneNumber = this.contactResolver.resolveAndNormalizePhone(contactId);
                console.log(`📱 Sending SMS via Flutter with phone number: ${normalizedPhoneNumber}`);
                
                // CRITICAL FIX: Use the real Flutter bridge instead of mock channels
                if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                    console.log('📱 Using real Flutter bridge for SMS');
                    
                    // Create the payload in the format Flutter expects
                    const flutterPayload = {
                        contactId: contactId,
                        phoneNumber: normalizedPhoneNumber,
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
                    console.warn('📱 Flutter bridge not available, falling back to channel manager');
                    
                    // Fallback to channel manager
                    const message = {
                        action: 'send_message',
                        contactId: contactId,
                        phoneNumber: normalizedPhoneNumber,
                        text: messageText,
                        timestamp: Date.now()
                    };
                    
                    return this.channelSetup.sendMessageToFlutter('data', message, callback);
                }
                
            } catch (error) {
                console.error(`📱 ❌ Error during SMS sending:`, error);
                if (callback) {
                    callback({ success: false, error: error.message });
                }
                return false;
            }
        }

        /**
         * Get conversation history with throttling
         */
        getConversationHistory(contactId, limit = 50, callback = null, forceRefresh = false) {
            // Check throttling
            if (this.throttleManager.shouldThrottleConversation(contactId, forceRefresh)) {
                if (callback) {
                    callback({ success: false, error: 'Request throttled' });
                }
                return false;
            }
            
            console.log(`📱 Getting conversation history for contact ${contactId} (limit: ${limit}, forceRefresh: ${forceRefresh})`);
            
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
            
            // Wrap the callback to clear the pending flag when done
            const wrappedCallback = (response) => {
                console.log(`📱 Clearing pending request flag for contact ${contactId}`);
                this.throttleManager.clearPendingRequest(contactId);
                
                if (callback) {
                    callback(response);
                }
            };
            
            return this.channelSetup.sendMessageToFlutter('data', message, wrappedCallback);
        }

        /**
         * Load conversation with Promise-based interface
         */
        loadConversationAsync(contactId, phoneNumber = null, limit = 50, forceRefresh = false) {
            return new Promise((resolve, reject) => {
                if (!this.channelSetup.isFlutterConnected) {
                    reject(new Error('Flutter not connected'));
                    return;
                }

                this.loadConversation(contactId, phoneNumber, limit, forceRefresh, (response) => {
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
         * Load conversation with throttling protection
         */
        loadConversation(contactId, phoneNumber = null, limit = 50, forceRefresh = false, callback = null) {
            if (!this.channelSetup.isFlutterConnected) {
                console.warn('📱 Flutter is not connected, cannot load conversation');
                if (callback) {
                    callback({ success: false, error: 'Flutter not connected' });
                }
                return;
            }

            // PERFORMANCE FIX: Throttle requests to prevent spamming Flutter
            if (this.throttleManager.shouldThrottleRefresh(contactId)) {
                if (callback) {
                    callback({ success: false, error: 'Request throttled' });
                }
                return;
            }

            console.log(`📱 Loading conversation for contact ${contactId} (forceRefresh: ${forceRefresh})`);

            const wrappedCallback = (response) => {
                this.throttleManager.clearPendingRefresh(contactId);
                if (callback) {
                    callback(response);
                }
            };

            this.channelSetup.sendMessageToFlutter('data', {
                action: 'get_conversation',
                contactId: contactId,
                phoneNumber: phoneNumber,
                limit: limit
            }, wrappedCallback);
        }

        /**
         * Request SMS permissions
         */
        requestSmsPermissions(callback = null) {
            const message = {
                action: 'request_permissions'
            };
            
            return this.channelSetup.sendMessageToFlutter('status', message, callback);
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

            this.channelSetup.sendMessageToFlutter('status', messageData, (response) => {
                if (response && response.success) {
                    console.log('📱 Message listening started successfully');
                } else {
                    console.warn('📱 Failed to start message listening:', response?.error || 'Unknown error');
                }
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

            this.channelSetup.sendMessageToFlutter('status', messageData, (response) => {
                if (response && response.success) {
                    console.log('📱 Message listening stopped successfully');
                } else {
                    console.warn('📱 Failed to stop message listening:', response?.error || 'Unknown error');
                }
            });
        }

        /**
         * Show native keyboard for contact
         */
        showKeyboard(contactId, callback = null) {
            const message = {
                action: 'show_keyboard',
                contactId: contactId,
                inputType: 'sms'
            };
            
            return this.channelSetup.sendMessageToFlutter('input', message, callback);
        }

        /**
         * Hide native keyboard
         */
        hideKeyboard(callback = null) {
            const message = {
                action: 'hide_keyboard'
            };
            
            return this.channelSetup.sendMessageToFlutter('input', message, callback);
        }

        /**
         * Register SMS input listener with Flutter
         */
        registerSmsInputListener(contactId, callback = null) {
            console.log(`📱 Registering SMS input listener for contact: ${contactId}`);
            const message = {
                action: 'register_listener',
                contactId: contactId,
                timestamp: Date.now()
            };
            
            return this.channelSetup.sendMessageToFlutter('input', message, callback);
        }

        /**
         * Force setup of incoming SMS listener
         */
        forceSetupListener() {
            console.log('📱 🔧 Forcing SMS listener setup from JavaScript');
            
            if (this.channelSetup.isFlutterConnected) {
                return this.channelSetup.sendMessageToFlutter('status', {
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
         * Test incoming message processing
         */
        testIncomingMessage() {
            console.log('📱 🧪 Testing incoming message processing from JavaScript');
            
            if (this.channelSetup.isFlutterConnected) {
                return this.channelSetup.sendMessageToFlutter('status', {
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

        /**
         * Clear pending operations
         */
        clearPendingOperations() {
            console.log('📱 Clearing pending message operations');
            this.throttleManager.clearAllPending();
        }

        /**
         * Get current contact ID
         */
        getCurrentContactId() {
            return this.currentContactId;
        }

        /**
         * Set current contact ID
         */
        setCurrentContactId(contactId) {
            this.currentContactId = contactId;
            console.log(`📱 Current contact ID set to: ${contactId}`);
        }
    }

    // Export to global scope
    window.SmsMessageHandler = SmsMessageHandler;
    console.log('📱 SmsMessageHandler class exported to window');

})();
