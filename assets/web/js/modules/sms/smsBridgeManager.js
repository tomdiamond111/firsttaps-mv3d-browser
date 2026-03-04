// ============================================================================
// SMS BRIDGE MANAGER - Flutter ↔ JavaScript Communication
// ============================================================================

/**
 * SmsBridgeManager - Handles communication between Flutter and JavaScript
 * 
 * This service provides:
 * - Simple, direct Flutter ↔ JavaScript bridge for SMS
 * - Robust error handling for platform communication
 * - Fallback mechanisms when Flutter bridge is unavailable
 * - Event-driven communication with SmsCore
 */
class SmsBridgeManager {
    constructor() {
        this.isFlutterBridgeAvailable = false;
        this.pendingMessages = [];
        this.bridgeCheckInterval = null;
        this.maxPendingMessages = 100;
        this.bridgeTimeout = 5000;
        
        this.initializeBridge();
        console.log('SmsBridgeManager initialized');
    }

    /**
     * Initialize the Flutter bridge connection
     */
    async initializeBridge() {
        try {
            // Check if Flutter bridge is available
            this.checkFlutterBridge();
            
            // Set up bridge check interval
            this.bridgeCheckInterval = setInterval(() => {
                this.checkFlutterBridge();
            }, 2000);

            // Set up Flutter message listener
            this.setupFlutterMessageListener();
            
            console.log('SMS Bridge initialization started');

        } catch (error) {
            console.error('Failed to initialize SMS bridge:', error);
            this.handleBridgeError(error);
        }
    }

    /**
     * Check if Flutter bridge is available
     */
    checkFlutterBridge() {
        const wasAvailable = this.isFlutterBridgeAvailable;
        
        this.isFlutterBridgeAvailable = (
            typeof window !== 'undefined' &&
            window.flutter_inappwebview &&
            window.flutter_inappwebview.callHandler
        );

        if (this.isFlutterBridgeAvailable && !wasAvailable) {
            console.log('Flutter bridge became available');
            this.processPendingMessages();
            
            // Notify SMS Core
            if (window.smsCore) {
                window.smsCore.dispatchEvent('bridge_connected', {
                    timestamp: Date.now()
                });
            }
        } else if (!this.isFlutterBridgeAvailable && wasAvailable) {
            console.warn('Flutter bridge became unavailable');
            
            // Notify SMS Core
            if (window.smsCore) {
                window.smsCore.dispatchEvent('bridge_disconnected', {
                    timestamp: Date.now()
                });
            }
        }
    }

    /**
     * Set up Flutter message listener
     */
    setupFlutterMessageListener() {
        // Listen for incoming SMS messages from Flutter
        window.addEventListener('flutter_sms_message', (event) => {
            this.handleIncomingMessage(event.detail);
        });

        // Listen for SMS status updates from Flutter
        window.addEventListener('flutter_sms_status', (event) => {
            this.handleStatusUpdate(event.detail);
        });

        // Listen for Flutter bridge ready signal
        window.addEventListener('flutter_bridge_ready', () => {
            console.log('Flutter bridge ready signal received');
            this.checkFlutterBridge();
        });
    }

    /**
     * Handle incoming SMS message from Flutter
     */
    handleIncomingMessage(messageData) {
        try {
            console.log('Received SMS message from Flutter:', messageData);

            if (!messageData || !messageData.phoneNumber) {
                console.warn('Invalid message data received from Flutter');
                return;
            }

            // Create standardized message object
            const message = {
                id: messageData.id || this.generateMessageId(),
                phoneNumber: messageData.phoneNumber,
                text: messageData.message || messageData.text || '',
                timestamp: messageData.timestamp || Date.now(),
                isOutgoing: messageData.isOutgoing || false,
                isRead: messageData.isRead || false,
                status: messageData.status || 'received',
                source: 'flutter_bridge'
            };

            // Store in SMS Core
            if (window.smsCore) {
                const success = window.smsCore.storeMessage(message);
                
                if (success) {
                    console.log('Message stored successfully in SMS Core');
                    
                    // Notify any listening components
                    this.dispatchMessageEvent('sms_message_received', message);
                } else {
                    console.error('Failed to store message in SMS Core');
                }
            } else {
                console.error('SMS Core not available, cannot store message');
            }

        } catch (error) {
            console.error('Error handling incoming SMS message:', error);
            this.handleBridgeError(error);
        }
    }

    /**
     * Handle SMS status update from Flutter
     */
    handleStatusUpdate(statusData) {
        try {
            console.log('Received SMS status update from Flutter:', statusData);

            if (window.smsCore) {
                window.smsCore.dispatchEvent('message_status_update', statusData);
            }

            this.dispatchMessageEvent('sms_status_update', statusData);

        } catch (error) {
            console.error('Error handling SMS status update:', error);
        }
    }

    /**
     * Send SMS message through Flutter bridge
     */
    async sendMessage(phoneNumber, message) {
        if (!phoneNumber || !message) {
            throw new Error('Phone number and message are required');
        }

        if (!this.isFlutterBridgeAvailable) {
            console.warn('Flutter bridge not available, queueing message');
            this.queuePendingMessage('send', { phoneNumber, message });
            return { success: false, error: 'Bridge not available' };
        }

        try {
            console.log(`Sending SMS to ${phoneNumber}: ${message}`);

            const result = await this.callFlutterHandler('sendSMS', {
                phoneNumber: phoneNumber,
                message: message,
                timestamp: Date.now()
            });

            if (result && result.success) {
                // Create outgoing message record
                const outgoingMessage = {
                    id: result.messageId || this.generateMessageId(),
                    phoneNumber: phoneNumber,
                    text: message,
                    timestamp: Date.now(),
                    isOutgoing: true,
                    isRead: true,
                    status: 'sent',
                    source: 'user_input'
                };

                // Store in SMS Core
                if (window.smsCore) {
                    window.smsCore.storeMessage(outgoingMessage);
                }

                console.log('SMS sent successfully');
                return { success: true, messageId: result.messageId };
            } else {
                throw new Error(result.error || 'Unknown error sending SMS');
            }

        } catch (error) {
            console.error('Error sending SMS:', error);
            this.handleBridgeError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Request SMS history from Flutter
     */
    async requestSmsHistory(phoneNumber = null) {
        if (!this.isFlutterBridgeAvailable) {
            console.warn('Flutter bridge not available for SMS history request');
            return { success: false, error: 'Bridge not available' };
        }

        try {
            console.log('Requesting SMS history from Flutter');

            const result = await this.callFlutterHandler('getSMSHistory', {
                phoneNumber: phoneNumber,
                timestamp: Date.now()
            });

            if (result && result.success && result.messages) {
                console.log(`Received ${result.messages.length} SMS messages from Flutter`);

                // Store messages in SMS Core
                if (window.smsCore) {
                    result.messages.forEach(messageData => {
                        const message = {
                            id: messageData.id || this.generateMessageId(),
                            phoneNumber: messageData.phoneNumber,
                            text: messageData.message || messageData.text || '',
                            timestamp: messageData.timestamp || Date.now(),
                            isOutgoing: messageData.isOutgoing || false,
                            isRead: messageData.isRead || true, // Assume history messages are read
                            status: 'received',
                            source: 'history_sync'
                        };

                        window.smsCore.storeMessage(message);
                    });
                }

                return { success: true, messageCount: result.messages.length };
            } else {
                throw new Error(result.error || 'Failed to get SMS history');
            }

        } catch (error) {
            console.error('Error requesting SMS history:', error);
            this.handleBridgeError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Call Flutter handler with timeout
     */
    async callFlutterHandler(handlerName, data) {
        return new Promise((resolve, reject) => {
            if (!this.isFlutterBridgeAvailable) {
                reject(new Error('Flutter bridge not available'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error(`Flutter handler ${handlerName} timed out`));
            }, this.bridgeTimeout);

            try {
                window.flutter_inappwebview.callHandler(handlerName, data)
                    .then(result => {
                        clearTimeout(timeout);
                        resolve(result);
                    })
                    .catch(error => {
                        clearTimeout(timeout);
                        reject(error);
                    });
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Queue message for when bridge becomes available
     */
    queuePendingMessage(operation, data) {
        if (this.pendingMessages.length >= this.maxPendingMessages) {
            console.warn('Pending message queue is full, removing oldest message');
            this.pendingMessages.shift();
        }

        this.pendingMessages.push({
            operation: operation,
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Process pending messages when bridge becomes available
     */
    async processPendingMessages() {
        if (this.pendingMessages.length === 0) {
            return;
        }

        console.log(`Processing ${this.pendingMessages.length} pending messages`);

        const messages = this.pendingMessages.splice(0);
        
        for (const pending of messages) {
            try {
                if (pending.operation === 'send') {
                    await this.sendMessage(pending.data.phoneNumber, pending.data.message);
                }
            } catch (error) {
                console.error('Error processing pending message:', error);
            }
        }
    }

    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Dispatch SMS-related events
     */
    dispatchMessageEvent(eventType, data) {
        try {
            const event = new CustomEvent(eventType, {
                detail: data,
                bubbles: true
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Error dispatching message event:', error);
        }
    }

    /**
     * Handle bridge errors
     */
    handleBridgeError(error) {
        console.error('SMS Bridge Error:', error);
        
        if (window.smsCore) {
            window.smsCore.recordFailure('flutter_bridge', error);
        }
    }

    /**
     * Get bridge status
     */
    getBridgeStatus() {
        return {
            isAvailable: this.isFlutterBridgeAvailable,
            pendingMessages: this.pendingMessages.length,
            lastCheck: Date.now()
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.bridgeCheckInterval) {
            clearInterval(this.bridgeCheckInterval);
            this.bridgeCheckInterval = null;
        }

        this.pendingMessages = [];
        console.log('SMS Bridge Manager cleaned up');
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.smsBridgeManager = new SmsBridgeManager();
    console.log('Global SmsBridgeManager instance created');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmsBridgeManager;
}
