// ============================================================================
// SMS CORE SERVICE - Isolated SMS Message Management
// ============================================================================

/**
 * SmsCore - Independent SMS message management system
 * 
 * This service provides:
 * - Isolated message storage and retrieval
 * - Phone number-based indexing (independent of contact objects)
 * - Robust error handling and fallback mechanisms
 * - Simple event-driven communication
 * - Circuit breakers for cascading failures
 */
class SmsCore {
    constructor() {
        this.messages = new Map(); // phoneNumber -> Array<SmsMessage>
        this.conversations = new Map(); // phoneNumber -> ConversationState
        this.listeners = new Map(); // eventType -> Array<Function>
        this.isInitialized = false;
        this.circuitBreakers = new Map(); // operation -> CircuitBreaker
        this.retryQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 1000;
        
        this.initializeCircuitBreakers();
        console.log('SmsCore initialized - Independent message management system');
    }

    /**
     * Initialize circuit breakers for critical operations
     */
    initializeCircuitBreakers() {
        const operations = ['flutter_bridge', 'message_store', 'event_dispatch'];
        
        operations.forEach(op => {
            this.circuitBreakers.set(op, {
                failures: 0,
                maxFailures: 3,
                timeout: 5000,
                state: 'closed', // closed, open, half-open
                lastFailure: null
            });
        });
    }

    /**
     * Check if circuit breaker allows operation
     */
    isCircuitOpen(operation) {
        const breaker = this.circuitBreakers.get(operation);
        if (!breaker) return false;
        
        if (breaker.state === 'open') {
            if (Date.now() - breaker.lastFailure > breaker.timeout) {
                breaker.state = 'half-open';
                return false;
            }
            return true;
        }
        
        return false;
    }

    /**
     * Record successful operation
     */
    recordSuccess(operation) {
        const breaker = this.circuitBreakers.get(operation);
        if (breaker) {
            breaker.failures = 0;
            breaker.state = 'closed';
        }
    }

    /**
     * Record failed operation
     */
    recordFailure(operation, error) {
        const breaker = this.circuitBreakers.get(operation);
        if (breaker) {
            breaker.failures++;
            breaker.lastFailure = Date.now();
            
            if (breaker.failures >= breaker.maxFailures) {
                breaker.state = 'open';
                console.warn(`Circuit breaker opened for ${operation}:`, error);
            }
        }
    }

    /**
     * Add event listener
     */
    addEventListener(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }

    /**
     * Remove event listener
     */
    removeEventListener(eventType, callback) {
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Dispatch event with error handling
     */
    dispatchEvent(eventType, data) {
        if (this.isCircuitOpen('event_dispatch')) {
            console.warn(`Event dispatch circuit breaker is open for ${eventType}`);
            return;
        }

        try {
            const listeners = this.listeners.get(eventType);
            if (listeners) {
                listeners.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Error in event listener for ${eventType}:`, error);
                    }
                });
            }
            this.recordSuccess('event_dispatch');
        } catch (error) {
            this.recordFailure('event_dispatch', error);
            console.error(`Failed to dispatch event ${eventType}:`, error);
        }
    }

    /**
     * Store a message with robust error handling
     */
    storeMessage(message) {
        if (this.isCircuitOpen('message_store')) {
            console.warn('Message store circuit breaker is open, queueing message');
            this.retryQueue.push({ operation: 'store', data: message });
            return false;
        }

        try {
            const phoneNumber = this.normalizePhoneNumber(message.phoneNumber);
            
            if (!this.messages.has(phoneNumber)) {
                this.messages.set(phoneNumber, []);
            }

            const messages = this.messages.get(phoneNumber);
            
            // Check for duplicate messages
            const existingMessage = messages.find(m => 
                m.id === message.id || 
                (m.text === message.text && Math.abs(m.timestamp - message.timestamp) < 1000)
            );

            if (existingMessage) {
                console.log(`Duplicate message detected for ${phoneNumber}, skipping`);
                return false;
            }

            // Add message
            messages.push({
                ...message,
                phoneNumber,
                timestamp: message.timestamp || Date.now(),
                id: message.id || this.generateMessageId(phoneNumber, message.timestamp)
            });

            // Sort by timestamp
            messages.sort((a, b) => a.timestamp - b.timestamp);

            // Update conversation state
            this.updateConversationState(phoneNumber);

            this.recordSuccess('message_store');
            
            // Dispatch event
            this.dispatchEvent('message_stored', {
                phoneNumber,
                message: messages[messages.length - 1]
            });

            return true;

        } catch (error) {
            this.recordFailure('message_store', error);
            console.error('Failed to store message:', error);
            
            // Queue for retry
            this.retryQueue.push({ operation: 'store', data: message });
            return false;
        }
    }

    /**
     * Get messages for a phone number
     */
    getMessages(phoneNumber) {
        try {
            const normalized = this.normalizePhoneNumber(phoneNumber);
            return this.messages.get(normalized) || [];
        } catch (error) {
            console.error('Failed to get messages:', error);
            return [];
        }
    }

    /**
     * Get conversation state for a phone number
     */
    getConversationState(phoneNumber) {
        try {
            const normalized = this.normalizePhoneNumber(phoneNumber);
            return this.conversations.get(normalized) || {
                phoneNumber: normalized,
                messageCount: 0,
                lastMessage: null,
                lastActivity: null,
                hasUnread: false
            };
        } catch (error) {
            console.error('Failed to get conversation state:', error);
            return null;
        }
    }

    /**
     * Update conversation state
     */
    updateConversationState(phoneNumber) {
        try {
            const normalized = this.normalizePhoneNumber(phoneNumber);
            const messages = this.messages.get(normalized) || [];
            
            const lastMessage = messages[messages.length - 1];
            const hasUnread = messages.some(m => !m.isRead && !m.isOutgoing);

            this.conversations.set(normalized, {
                phoneNumber: normalized,
                messageCount: messages.length,
                lastMessage: lastMessage,
                lastActivity: lastMessage ? lastMessage.timestamp : null,
                hasUnread: hasUnread
            });

        } catch (error) {
            console.error('Failed to update conversation state:', error);
        }
    }

    /**
     * Normalize phone number for consistent indexing
     */
    normalizePhoneNumber(phoneNumber) {
        if (!phoneNumber) return 'unknown';
        
        // Remove all non-digit characters
        const digits = phoneNumber.replace(/\D/g, '');
        
        // Handle different formats
        if (digits.length === 11 && digits.startsWith('1')) {
            // US number with country code
            return `+1${digits.slice(1)}`;
        } else if (digits.length === 10) {
            // US number without country code
            return `+1${digits}`;
        } else if (digits.length > 10) {
            // International number
            return `+${digits}`;
        } else {
            // Short code or incomplete number
            return phoneNumber;
        }
    }

    /**
     * Generate unique message ID
     */
    generateMessageId(phoneNumber, timestamp) {
        const normalized = this.normalizePhoneNumber(phoneNumber);
        return `${normalized}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Mark message as read
     */
    markMessageAsRead(phoneNumber, messageId) {
        try {
            const normalized = this.normalizePhoneNumber(phoneNumber);
            const messages = this.messages.get(normalized);
            
            if (messages) {
                const message = messages.find(m => m.id === messageId);
                if (message) {
                    message.isRead = true;
                    this.updateConversationState(normalized);
                    
                    this.dispatchEvent('message_read', {
                        phoneNumber: normalized,
                        messageId: messageId
                    });
                }
            }
        } catch (error) {
            console.error('Failed to mark message as read:', error);
        }
    }

    /**
     * Get all conversations (for overview)
     */
    getAllConversations() {
        try {
            return Array.from(this.conversations.values());
        } catch (error) {
            console.error('Failed to get all conversations:', error);
            return [];
        }
    }

    /**
     * Clear messages for a phone number
     */
    clearMessages(phoneNumber) {
        try {
            const normalized = this.normalizePhoneNumber(phoneNumber);
            this.messages.delete(normalized);
            this.conversations.delete(normalized);
            
            this.dispatchEvent('messages_cleared', {
                phoneNumber: normalized
            });
            
            return true;
        } catch (error) {
            console.error('Failed to clear messages:', error);
            return false;
        }
    }

    /**
     * Process retry queue
     */
    processRetryQueue() {
        const retryableItems = this.retryQueue.splice(0);
        
        retryableItems.forEach(item => {
            if (item.retries >= this.maxRetries) {
                console.error('Max retries exceeded for operation:', item.operation);
                return;
            }

            item.retries = (item.retries || 0) + 1;

            setTimeout(() => {
                if (item.operation === 'store') {
                    if (!this.storeMessage(item.data)) {
                        this.retryQueue.push(item);
                    }
                }
            }, this.retryDelay * item.retries);
        });
    }

    /**
     * Initialize SMS Core
     */
    initialize() {
        if (this.isInitialized) {
            console.log('SmsCore already initialized');
            return;
        }

        try {
            // Start retry queue processor
            setInterval(() => {
                this.processRetryQueue();
            }, this.retryDelay);

            this.isInitialized = true;
            console.log('SmsCore initialized successfully');
            
            this.dispatchEvent('core_initialized', {
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Failed to initialize SmsCore:', error);
            throw error;
        }
    }

    /**
     * Get system status for debugging
     */
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            messageCount: Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0),
            conversationCount: this.conversations.size,
            circuitBreakers: Object.fromEntries(this.circuitBreakers),
            retryQueueLength: this.retryQueue.length,
            listeners: Object.fromEntries(
                Array.from(this.listeners.entries()).map(([key, value]) => [key, value.length])
            )
        };
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.smsCore = new SmsCore();
    console.log('Global SmsCore instance created');
} else if (typeof global !== 'undefined') {
    global.smsCore = new SmsCore();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmsCore;
}
