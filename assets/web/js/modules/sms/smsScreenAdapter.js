// ============================================================================
// SMS SCREEN ADAPTER - 3D World Integration
// ============================================================================

/**
 * SmsScreenAdapter - Connects SMS Core to existing 3D SMS screens
 * 
 * This service provides:
 * - Bridge between isolated SMS Core and 3D world SMS screens
 * - Maintains existing 3D interaction patterns (tap, double-tap, movement)
 * - Robust error handling for 3D world integration
 * - Event-driven updates without tight coupling
 */
class SmsScreenAdapter {
    constructor() {
        this.screenSubscriptions = new Map(); // phoneNumber -> subscription info
        this.activeScreens = new Map(); // phoneNumber -> screen object reference
        this.updateQueue = [];
        this.isProcessingUpdates = false;
        this.maxUpdateQueueSize = 50;
        
        this.initializeAdapter();
        console.log('SmsScreenAdapter initialized - 3D world integration active');
    }

    /**
     * Initialize the adapter system
     */
    initializeAdapter() {
        try {
            // Listen to SMS Core events
            if (window.smsCore) {
                this.setupSMSCoreListeners();
            } else {
                // Wait for SMS Core to be available
                const checkInterval = setInterval(() => {
                    if (window.smsCore) {
                        clearInterval(checkInterval);
                        this.setupSMSCoreListeners();
                    }
                }, 100);
            }

            // Start update queue processor
            this.startUpdateProcessor();

            console.log('SMS Screen Adapter initialized successfully');

        } catch (error) {
            console.error('Failed to initialize SMS Screen Adapter:', error);
        }
    }

    /**
     * Set up SMS Core event listeners
     */
    setupSMSCoreListeners() {
        // Listen for new messages
        window.smsCore.addEventListener('message_stored', (data) => {
            this.handleNewMessage(data);
        });

        // Listen for message status updates
        window.smsCore.addEventListener('message_status_update', (data) => {
            this.handleStatusUpdate(data);
        });

        // Listen for conversation updates
        window.smsCore.addEventListener('messages_cleared', (data) => {
            this.handleMessagesCleared(data);
        });

        console.log('SMS Core event listeners established');
    }

    /**
     * Register an SMS screen with the adapter
     */
    registerSmsScreen(phoneNumber, screenObject) {
        try {
            if (!phoneNumber || !screenObject) {
                console.warn('Invalid parameters for SMS screen registration');
                return false;
            }

            const normalizedNumber = this.normalizePhoneNumber(phoneNumber);
            
            // Store screen reference
            this.activeScreens.set(normalizedNumber, {
                screenObject: screenObject,
                phoneNumber: normalizedNumber,
                lastUpdate: Date.now(),
                isVisible: true,
                isInteractive: true
            });

            // Subscribe to updates for this number
            this.screenSubscriptions.set(normalizedNumber, {
                phoneNumber: normalizedNumber,
                registeredAt: Date.now(),
                updateCount: 0
            });

            console.log(`SMS screen registered for ${normalizedNumber}`);

            // Initial data load
            this.loadInitialMessages(normalizedNumber);

            return true;

        } catch (error) {
            console.error('Error registering SMS screen:', error);
            return false;
        }
    }

    /**
     * Unregister an SMS screen
     */
    unregisterSmsScreen(phoneNumber) {
        try {
            const normalizedNumber = this.normalizePhoneNumber(phoneNumber);
            
            this.activeScreens.delete(normalizedNumber);
            this.screenSubscriptions.delete(normalizedNumber);

            console.log(`SMS screen unregistered for ${normalizedNumber}`);
            return true;

        } catch (error) {
            console.error('Error unregistering SMS screen:', error);
            return false;
        }
    }

    /**
     * Load initial messages for a screen
     */
    loadInitialMessages(phoneNumber) {
        try {
            if (!window.smsCore) {
                console.warn('SMS Core not available for initial message load');
                return;
            }

            const messages = window.smsCore.getMessages(phoneNumber);
            const screenInfo = this.activeScreens.get(phoneNumber);

            if (screenInfo && messages.length > 0) {
                this.queueScreenUpdate(phoneNumber, 'initial_load', {
                    messages: messages,
                    conversationState: window.smsCore.getConversationState(phoneNumber)
                });
            }

        } catch (error) {
            console.error('Error loading initial messages:', error);
        }
    }

    /**
     * Handle new message from SMS Core
     */
    handleNewMessage(data) {
        try {
            const { phoneNumber, message } = data;
            
            if (this.activeScreens.has(phoneNumber)) {
                this.queueScreenUpdate(phoneNumber, 'new_message', {
                    message: message,
                    conversationState: window.smsCore.getConversationState(phoneNumber)
                });
            }

        } catch (error) {
            console.error('Error handling new message:', error);
        }
    }

    /**
     * Handle message status update
     */
    handleStatusUpdate(data) {
        try {
            const phoneNumber = data.phoneNumber;
            
            if (phoneNumber && this.activeScreens.has(phoneNumber)) {
                this.queueScreenUpdate(phoneNumber, 'status_update', data);
            }

        } catch (error) {
            console.error('Error handling status update:', error);
        }
    }

    /**
     * Handle messages cleared
     */
    handleMessagesCleared(data) {
        try {
            const { phoneNumber } = data;
            
            if (this.activeScreens.has(phoneNumber)) {
                this.queueScreenUpdate(phoneNumber, 'messages_cleared', {
                    conversationState: window.smsCore.getConversationState(phoneNumber)
                });
            }

        } catch (error) {
            console.error('Error handling messages cleared:', error);
        }
    }

    /**
     * Queue screen update to prevent rendering conflicts
     */
    queueScreenUpdate(phoneNumber, updateType, data) {
        try {
            if (this.updateQueue.length >= this.maxUpdateQueueSize) {
                console.warn('Update queue is full, removing oldest update');
                this.updateQueue.shift();
            }

            this.updateQueue.push({
                phoneNumber: phoneNumber,
                updateType: updateType,
                data: data,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error queueing screen update:', error);
        }
    }

    /**
     * Start update queue processor
     */
    startUpdateProcessor() {
        setInterval(() => {
            this.processUpdateQueue();
        }, 100); // Process updates every 100ms
    }

    /**
     * Process queued screen updates
     */
    processUpdateQueue() {
        if (this.isProcessingUpdates || this.updateQueue.length === 0) {
            return;
        }

        this.isProcessingUpdates = true;

        try {
            const updates = this.updateQueue.splice(0, 5); // Process up to 5 updates at once

            updates.forEach(update => {
                this.applyScreenUpdate(update);
            });

        } catch (error) {
            console.error('Error processing update queue:', error);
        } finally {
            this.isProcessingUpdates = false;
        }
    }

    /**
     * Apply update to specific screen
     */
    applyScreenUpdate(update) {
        try {
            const screenInfo = this.activeScreens.get(update.phoneNumber);
            
            if (!screenInfo || !screenInfo.screenObject) {
                console.warn(`Screen not found for ${update.phoneNumber}`);
                return;
            }

            const screenObject = screenInfo.screenObject;

            // Use existing screen update methods if available
            switch (update.updateType) {
                case 'initial_load':
                    this.updateScreenMessages(screenObject, update.data.messages);
                    break;

                case 'new_message':
                    this.addMessageToScreen(screenObject, update.data.message);
                    break;

                case 'status_update':
                    this.updateMessageStatus(screenObject, update.data);
                    break;

                case 'messages_cleared':
                    this.clearScreenMessages(screenObject);
                    break;

                default:
                    console.warn(`Unknown update type: ${update.updateType}`);
            }

            // Update last update timestamp
            screenInfo.lastUpdate = Date.now();

            // Update subscription counter
            const subscription = this.screenSubscriptions.get(update.phoneNumber);
            if (subscription) {
                subscription.updateCount++;
            }

        } catch (error) {
            console.error('Error applying screen update:', error);
        }
    }

    /**
     * Update screen with full message list
     */
    updateScreenMessages(screenObject, messages) {
        try {
            // Use existing screen render method if available
            if (typeof screenObject.renderMessages === 'function') {
                screenObject.renderMessages(messages);
            } else if (typeof screenObject.updateMessages === 'function') {
                screenObject.updateMessages(messages);
            } else {
                // Fallback to generic update
                this.genericScreenUpdate(screenObject, { messages: messages });
            }

        } catch (error) {
            console.error('Error updating screen messages:', error);
        }
    }

    /**
     * Add single message to screen
     */
    addMessageToScreen(screenObject, message) {
        try {
            // Use existing screen method if available
            if (typeof screenObject.addMessage === 'function') {
                screenObject.addMessage(message);
            } else if (typeof screenObject.appendMessage === 'function') {
                screenObject.appendMessage(message);
            } else {
                // Fallback to full refresh
                const phoneNumber = message.phoneNumber;
                const allMessages = window.smsCore ? window.smsCore.getMessages(phoneNumber) : [];
                this.updateScreenMessages(screenObject, allMessages);
            }

        } catch (error) {
            console.error('Error adding message to screen:', error);
        }
    }

    /**
     * Update message status on screen
     */
    updateMessageStatus(screenObject, statusData) {
        try {
            if (typeof screenObject.updateMessageStatus === 'function') {
                screenObject.updateMessageStatus(statusData);
            } else {
                // Fallback to generic update
                this.genericScreenUpdate(screenObject, { statusUpdate: statusData });
            }

        } catch (error) {
            console.error('Error updating message status:', error);
        }
    }

    /**
     * Clear all messages from screen
     */
    clearScreenMessages(screenObject) {
        try {
            if (typeof screenObject.clearMessages === 'function') {
                screenObject.clearMessages();
            } else if (typeof screenObject.renderMessages === 'function') {
                screenObject.renderMessages([]);
            } else {
                this.genericScreenUpdate(screenObject, { messages: [] });
            }

        } catch (error) {
            console.error('Error clearing screen messages:', error);
        }
    }

    /**
     * Generic screen update for fallback
     */
    genericScreenUpdate(screenObject, data) {
        try {
            // Dispatch custom event to the screen object
            if (screenObject.dispatchEvent) {
                const event = new CustomEvent('sms_update', {
                    detail: data
                });
                screenObject.dispatchEvent(event);
            } else {
                console.warn('Screen object does not support generic updates');
            }

        } catch (error) {
            console.error('Error in generic screen update:', error);
        }
    }

    /**
     * Send message through existing screen interface
     */
    async sendMessageFromScreen(phoneNumber, message) {
        try {
            // Use SMS Bridge Manager to send
            if (window.smsBridgeManager) {
                const result = await window.smsBridgeManager.sendMessage(phoneNumber, message);
                return result;
            } else {
                console.error('SMS Bridge Manager not available');
                return { success: false, error: 'Bridge not available' };
            }

        } catch (error) {
            console.error('Error sending message from screen:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Normalize phone number for consistency
     */
    normalizePhoneNumber(phoneNumber) {
        if (window.smsCore && typeof window.smsCore.normalizePhoneNumber === 'function') {
            return window.smsCore.normalizePhoneNumber(phoneNumber);
        }
        
        // Fallback normalization
        return phoneNumber ? phoneNumber.replace(/\D/g, '') : 'unknown';
    }

    /**
     * Get adapter status for debugging
     */
    getAdapterStatus() {
        return {
            activeScreens: this.activeScreens.size,
            subscriptions: this.screenSubscriptions.size,
            updateQueueSize: this.updateQueue.length,
            isProcessingUpdates: this.isProcessingUpdates,
            screenList: Array.from(this.activeScreens.keys())
        };
    }

    /**
     * Cleanup adapter resources
     */
    cleanup() {
        this.activeScreens.clear();
        this.screenSubscriptions.clear();
        this.updateQueue = [];
        this.isProcessingUpdates = false;
        
        console.log('SMS Screen Adapter cleaned up');
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.smsScreenAdapter = new SmsScreenAdapter();
    console.log('Global SmsScreenAdapter instance created');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmsScreenAdapter;
}
