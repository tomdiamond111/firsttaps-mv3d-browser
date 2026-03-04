/**
 * SmsChannelSetup - Handles Flutter channel initialization and bridge connection
 * Extracted from smsChannelManager.js for better maintainability
 */
(function() {
    'use strict';

    class SmsChannelSetup {
        constructor(options = {}) {
            this.channels = {};
            this.messageCallbacks = new Map();
            this.pendingMessages = [];
            this.isFlutterConnected = false;
            this.connectionTimeout = options.connectionTimeout || 10000; // 10 seconds
            
            console.log('📱 SmsChannelSetup initialized');
        }

        /**
         * Initialize all SMS channels
         */
        initializeChannels() {
            console.log('📱 Initializing SMS channels...');
            
            try {
                this.setupSmsInputChannel();
                this.setupSmsDataChannel();
                this.setupSmsStatusChannel();
                
                // Test connection
                this.testFlutterConnection();
                
                console.log('📱 ✅ All SMS channels initialized successfully');
                return true;
            } catch (error) {
                console.error('📱 ❌ Failed to initialize SMS channels:', error);
                return false;
            }
        }

        /**
         * Setup SMS input channel for sending messages and managing keyboard
         */
        setupSmsInputChannel() {
            console.log('📱 Setting up SMS input channel...');
            
            if (window.flutter_inappwebview && window.flutter_inappwebview.addJavaScriptHandler) {
                this.channels.input = 'sms_input_channel';
                
                // Register handler for responses from Flutter
                window.flutter_inappwebview.addJavaScriptHandler('sms_input_response', (response) => {
                    console.log('📱 SMS input response received:', response);
                    this.handleFlutterMessage('input', response);
                });
                
                console.log('📱 ✅ SMS input channel setup complete');
            } else {
                console.warn('📱 ⚠️ Flutter bridge not available for input channel');
                // Create mock channel for development
                this.channels.input = 'mock_sms_input_channel';
            }
        }

        /**
         * Setup SMS data channel for retrieving conversations and messages
         */
        setupSmsDataChannel() {
            console.log('📱 Setting up SMS data channel...');
            
            if (window.flutter_inappwebview && window.flutter_inappwebview.addJavaScriptHandler) {
                this.channels.data = 'sms_data_channel';
                
                // Register handler for SMS data responses
                window.flutter_inappwebview.addJavaScriptHandler('sms_data_response', (response) => {
                    console.log('📱 SMS data response received:', response);
                    this.handleFlutterMessage('data', response);
                });
                
                // Register handler for real-time SMS events
                window.flutter_inappwebview.addJavaScriptHandler('sms_event', (eventData) => {
                    console.log('📱 Real-time SMS event received:', eventData);
                    this.handleSmsDataDirectly(eventData);
                });
                
                console.log('📱 ✅ SMS data channel setup complete');
            } else {
                console.warn('📱 ⚠️ Flutter bridge not available for data channel');
                // Create mock channel for development
                this.channels.data = 'mock_sms_data_channel';
            }
        }

        /**
         * Setup SMS status channel for permissions and connection status
         */
        setupSmsStatusChannel() {
            console.log('📱 Setting up SMS status channel...');
            
            if (window.flutter_inappwebview && window.flutter_inappwebview.addJavaScriptHandler) {
                this.channels.status = 'sms_status_channel';
                
                // Register handler for status responses
                window.flutter_inappwebview.addJavaScriptHandler('sms_status_response', (response) => {
                    console.log('📱 SMS status response received:', response);
                    this.handleFlutterMessage('status', response);
                });
                
                console.log('📱 ✅ SMS status channel setup complete');
            } else {
                console.warn('📱 ⚠️ Flutter bridge not available for status channel');
                // Create mock channel for development
                this.channels.status = 'mock_sms_status_channel';
            }
        }

        /**
         * Test Flutter connection
         */
        testFlutterConnection() {
            console.log('📱 Testing Flutter connection...');
            
            const testMessage = {
                action: 'test_connection',
                timestamp: Date.now()
            };
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    console.warn('📱 ⚠️ Flutter connection test timed out');
                    this.isFlutterConnected = false;
                    reject(new Error('Connection timeout'));
                }, this.connectionTimeout);
                
                this.sendMessageToFlutter('status', testMessage, (response) => {
                    clearTimeout(timeout);
                    
                    if (response && response.success) {
                        console.log('📱 ✅ Flutter connection test successful');
                        this.isFlutterConnected = true;
                        this.processPendingMessages();
                        resolve(response);
                    } else {
                        console.warn('📱 ⚠️ Flutter connection test failed:', response);
                        this.isFlutterConnected = false;
                        reject(new Error('Connection test failed'));
                    }
                });
            });
        }

        /**
         * Send message to Flutter with proper error handling
         */
        sendMessageToFlutter(channelType, messageData, callback = null) {
            const channel = this.channels[channelType];
            if (!channel) {
                console.error(`📱 ❌ Unknown channel type: ${channelType}`);
                if (callback) {
                    callback({ success: false, error: `Unknown channel type: ${channelType}` });
                }
                return false;
            }

            // Verify payload integrity
            const verification = this.verifyPayloadIntegrity(messageData);
            if (!verification.isValid) {
                console.error('📱 ❌ Payload verification failed:', verification.errors);
                if (callback) {
                    callback({ success: false, error: 'Payload verification failed: ' + verification.errors.join(', ') });
                }
                return false;
            }

            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const message = {
                id: messageId,
                channel: channel,
                data: messageData,
                timestamp: Date.now()
            };

            // Store callback for response handling
            if (callback) {
                this.messageCallbacks.set(messageId, callback);
            }

            // Send via Flutter bridge
            if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                try {
                    console.log(`📱 Sending message to Flutter via ${channelType}:`, message);
                    
                    // Use Promise.race for timeout protection
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Flutter call timeout')), 5000);
                    });
                    
                    Promise.race([
                        window.flutter_inappwebview.callHandler(channel, message),
                        timeoutPromise
                    ])
                        .then(response => {
                            console.log(`📱 Flutter response for ${channelType}:`, response);
                            if (callback && !this.messageCallbacks.has(messageId)) {
                                // Direct callback if not stored
                                callback(response);
                            }
                        })
                        .catch(error => {
                            console.error(`📱 Flutter call error for ${channelType}:`, error);
                            if (callback) {
                                callback({ success: false, error: error.message });
                            }
                        });
                    
                    return true;
                } catch (error) {
                    console.error('📱 Error calling Flutter handler:', error);
                    if (callback) {
                        callback({ success: false, error: error.message });
                    }
                    return false;
                }
            } else {
                console.warn('📱 ⚠️ Flutter bridge not available, queuing message');
                this.pendingMessages.push({ message, callback });
                return false;
            }
        }

        /**
         * Process pending messages when connection is restored
         */
        processPendingMessages() {
            if (this.pendingMessages.length === 0) return;
            
            console.log(`📱 Processing ${this.pendingMessages.length} pending messages`);
            
            const messages = this.pendingMessages.splice(0);
            messages.forEach(({ message, callback }) => {
                const channelType = Object.keys(this.channels).find(key => this.channels[key] === message.channel);
                if (channelType) {
                    this.sendMessageToFlutter(channelType, message.data, callback);
                }
            });
        }

        /**
         * Handle incoming messages from Flutter
         */
        handleFlutterMessage(channelType, message) {
            console.log(`📱 Handling Flutter message from ${channelType}:`, message);
            
            // Route to appropriate handler based on channel type
            switch (channelType) {
                case 'input':
                    this.handleSmsInputResponse(message);
                    break;
                case 'data':
                    this.handleSmsDataResponse(message);
                    break;
                case 'status':
                    this.handleSmsStatusResponse(message);
                    break;
                default:
                    console.warn(`📱 ⚠️ Unknown channel type: ${channelType}`);
            }
        }

        /**
         * Verify payload integrity
         */
        verifyPayloadIntegrity(payload) {
            const errors = [];
            
            if (!payload || typeof payload !== 'object') {
                errors.push('Payload must be an object');
                return { isValid: false, errors };
            }
            
            if (!payload.action) {
                errors.push('Payload must have an action');
            }
            
            // Additional validation can be added here
            
            return { isValid: errors.length === 0, errors };
        }

        /**
         * Get channel connection status
         */
        getConnectionStatus() {
            return {
                isConnected: this.isFlutterConnected,
                channels: Object.keys(this.channels),
                pendingMessages: this.pendingMessages.length,
                activeCallbacks: this.messageCallbacks.size
            };
        }

        /**
         * Reset connection and clear state
         */
        resetConnection() {
            console.log('📱 Resetting SMS channel connection');
            
            this.isFlutterConnected = false;
            this.messageCallbacks.clear();
            this.pendingMessages = [];
            
            // Re-initialize channels
            return this.initializeChannels();
        }

        // Placeholder methods for response handlers (to be implemented by subclass or mixed in)
        handleSmsInputResponse(data) {
            console.log('📱 SMS input response (placeholder):', data);
        }

        handleSmsDataResponse(data) {
            console.log('📱 SMS data response (placeholder):', data);
        }

        handleSmsDataDirectly(data) {
            console.log('📱 SMS data direct (placeholder):', data);
        }

        handleSmsStatusResponse(data) {
            console.log('📱 SMS status response (placeholder):', data);
        }
    }

    // Export to global scope
    window.SmsChannelSetup = SmsChannelSetup;
    console.log('📱 SmsChannelSetup class exported to window');

})();
