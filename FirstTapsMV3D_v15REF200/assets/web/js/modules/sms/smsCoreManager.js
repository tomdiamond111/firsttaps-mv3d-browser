/**
 * SMS Core Bridge - JavaScript Side
 * 
 * Provides a robust, isolated SMS system that connects with the new
 * SMS Core Service while maintaining existing 3D world interaction patterns.
 * 
 * Key Features:
 * - Independent of complex event routing systems
 * - Direct communication with SMS Core Service
 * - Robust error handling and fallback mechanisms
 * - Real-time message updates without throttling issues
 * - Maintains all existing 3D interaction patterns (tap, double-tap, etc.)
 */

(function() {
    'use strict';

    class SmsCoreManager {
        constructor() {
            this.isInitialized = false;
            this.debugMode = true;
            
            // Contact mappings
            this.contactMappings = new Map(); // contactId -> phone number
            this.phoneToContact = new Map(); // phone number -> contactId
            
            // Active SMS screens
            this.activeSmsScreens = new Set();
            
            // Message cache for immediate display
            this.messageCache = new Map(); // phone number -> messages array
            
            // Error handling
            this.failureCount = 0;
            this.lastFailureTime = null;
            this.maxFailures = 3;
            
            // 🔧 FAILSAFE: System health monitoring
            this.healthMonitor = {
                lastSuccessfulUpdate: Date.now(),
                consecutiveFailures: 0,
                systemHealthy: true,
                monitoringActive: false
            };
            
            this.log('SMS Core Manager initialized');
            
            // Start health monitoring
            this.startSystemHealthMonitoring();
        }

        /**
         * Initialize the SMS Core system
         */
        async initialize() {
            if (this.isInitialized) {
                this.log('SMS Core Manager already initialized');
                return true;
            }

            try {
                this.log('Initializing SMS Core Manager...');
                
                // Set up event listeners for Flutter bridge
                this.setupEventListeners();
                
                // Set up SMS screen integration
                this.setupSmsScreenIntegration();
                
                // CRITICAL FOR ALERT SYSTEM: Start continuous SMS listening
                this.startContinuousSmsListening();
                
                this.isInitialized = true;
                this.log('✅ SMS Core Manager initialized successfully');
                
                return true;
                
            } catch (error) {
                this.logError('❌ Failed to initialize SMS Core Manager:', error);
                return false;
            }
        }

        /**
         * Start continuous SMS listening for background alerts
         * This ensures the alert system can detect messages even when no screens are open
         */
        startContinuousSmsListening() {
            console.log('🚨 [ALERT SYSTEM] Starting continuous SMS listening for background message detection');
            
            // Tell Flutter to start SMS monitoring globally (not tied to specific screens)
            this.sendToFlutter({
                type: 'start_global_sms_monitoring',
                continuous: true,
                backgroundAlerts: true,
                reason: 'ContactAlertSystem'
            });
            
            console.log('🚨 [ALERT SYSTEM] Continuous SMS listening started - messages will be detected in background');
        }

        /**
         * Set up event listeners for Flutter SMS bridge
         */
        setupEventListeners() {
            // DISABLED: SMS Event Router now handles flutter-sms-data events directly
            // This prevents duplicate processing and competing event handlers
            /*
            window.addEventListener('flutter-sms-data', (event) => {
                console.log(`📨🚨 [SmsCoreManager] FLUTTER-SMS-DATA EVENT RECEIVED:`, event.detail);
                
                if (event.detail && event.detail.action === 'incoming_message') {
                    console.log(`📨🚨 [SmsCoreManager] INCOMING MESSAGE DETECTED in flutter-sms-data!`);
                    console.log(`📨🚨 [SmsCoreManager] Contact: ${event.detail.contactId}, Message: "${event.detail.message?.text}"`);
                    
                    // Process the incoming message through our handler
                    this.handleMessageReceived({
                        contactId: event.detail.contactId,
                        phoneNumber: event.detail.message?.phoneNumber || event.detail.contactId,
                        message: {
                            text: event.detail.message?.text,
                            timestamp: event.detail.message?.timestamp || Date.now(),
                            isIncoming: true
                        }
                    });
                } else {
                    console.log(`📨 [SmsCoreManager] flutter-sms-data event (not incoming_message):`, event.detail?.action);
                }
            });
            */
            
            // Listen for SMS data from Flutter bridge
            window.addEventListener('flutter-sms-bridge-data', (event) => {
                this.handleFlutterSmsData(event.detail);
            });
            
            // Listen for SMS Core events
            window.addEventListener('sms-core-event', (event) => {
                this.handleSmsCoreEvent(event.detail);
            });
            
            // Override the broken message_received handler with our robust version
            window.addEventListener('message_received', (event) => {
                this.handleIncomingMessage(event.detail);
            }, true); // Use capture phase for priority
            
            this.log('Event listeners set up');
        }

        /**
         * Set up SMS screen integration with existing 3D objects
         */
        setupSmsScreenIntegration() {
            // Override SMS screen update methods to use our robust system
            this.patchSmsScreenMethods();
            
            // Set up contact integration
            this.setupContactIntegration();
            
            this.log('SMS screen integration set up');
        }

        /**
         * Register a contact with the SMS Core system
         */
        registerContact(contactId, name, phoneNumber, avatarPath = null) {
            try {
                const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
                
                // Store mappings
                this.contactMappings.set(contactId, normalizedPhone);
                this.phoneToContact.set(normalizedPhone, contactId);
                
                // Send to Flutter bridge
                this.sendToFlutter({
                    type: 'register_contact',
                    contactId: contactId,
                    name: name,
                    phoneNumber: normalizedPhone,
                    avatarPath: avatarPath,
                });
                
                this.log(`Registered contact: ${name} (${contactId}) -> ${normalizedPhone}`);
                
            } catch (error) {
                this.logError(`Error registering contact ${contactId}:`, error);
            }
        }

        /**
         * Get conversation for a contact
         */
        async getConversationByContactId(contactId) {
            try {
                const phoneNumber = this.contactMappings.get(contactId);
                if (!phoneNumber) {
                    this.logError(`No phone number found for contact: ${contactId}`);
                    return null;
                }
                
                // Check cache first
                const cachedMessages = this.messageCache.get(phoneNumber);
                if (cachedMessages && cachedMessages.length > 0) {
                    this.log(`Using cached conversation for ${contactId}: ${cachedMessages.length} messages`);
                    return {
                        phoneNumber: phoneNumber,
                        messages: cachedMessages,
                        lastUpdate: Date.now(),
                        source: 'cache'
                    };
                }
                
                // Request from Flutter
                this.sendToFlutter({
                    type: 'get_conversation',
                    contactId: contactId,
                    phoneNumber: phoneNumber,
                });
                
                // Return cached data as fallback
                return {
                    phoneNumber: phoneNumber,
                    messages: cachedMessages || [],
                    lastUpdate: Date.now(),
                    source: 'fallback'
                };
                
            } catch (error) {
                this.logError(`Error getting conversation for ${contactId}:`, error);
                return null;
            }
        }

        /**
         * Send message from contact
         */
        async sendMessageFromContact(contactId, messageText) {
            try {
                const phoneNumber = this.contactMappings.get(contactId);
                if (!phoneNumber) {
                    this.logError(`No phone number found for contact: ${contactId}`);
                    return false;
                }
                
                // Send to Flutter
                this.sendToFlutter({
                    type: 'send_message',
                    contactId: contactId,
                    phoneNumber: phoneNumber,
                    text: messageText,
                });
                
                // Optimistically add to cache
                const sentMessage = {
                    id: `sent_${Date.now()}`,
                    text: messageText,
                    timestamp: Date.now(),
                    type: 'sent',
                    isOutgoing: true,
                    phoneNumber: phoneNumber,
                    status: 'sending'
                };
                
                this.addMessageToCache(phoneNumber, sentMessage);
                this.updateSmsScreen(contactId);
                
                this.log(`✅ Message sent from contact ${contactId}`);
                return true;
                
            } catch (error) {
                this.logError(`Error sending message from ${contactId}:`, error);
                return false;
            }
        }

        /**
         * Handle SMS data from Flutter bridge
         */
        handleFlutterSmsData(data) {
            try {
                this.log('📱 Received Flutter SMS data:', data);
                
                switch (data.type) {
                    case 'sms_conversation_update':
                        this.handleConversationUpdate(data);
                        break;
                        
                    case 'sms_message_received':
                        this.handleMessageReceived(data);
                        break;
                        
                    case 'sms_message_sent':
                        this.handleMessageSent(data);
                        break;
                        
                    case 'sms_screen_update':
                        this.handleSmsScreenUpdate(data);
                        break;
                        
                    default:
                        this.log('Unknown Flutter SMS data type:', data.type);
                }
                
            } catch (error) {
                this.logError('Error handling Flutter SMS data:', error);
            }
        }

        /**
         * Handle conversation update from Flutter
         */
        handleConversationUpdate(data) {
            try {
                const { contactId, phoneNumber, conversation } = data;
                
                if (conversation && conversation.messages) {
                    // Update cache
                    this.messageCache.set(phoneNumber, conversation.messages);
                    
                    // Update SMS screen if active
                    if (this.activeSmsScreens.has(contactId)) {
                        this.updateSmsScreen(contactId, conversation.messages);
                    }
                    
                    this.log(`🔄 Conversation updated for ${contactId}: ${conversation.messages.length} messages`);
                }
                
            } catch (error) {
                this.logError('Error handling conversation update:', error);
            }
        }

        /**
         * Handle incoming message
         */
        handleMessageReceived(data) {
            try {
                const { contactId, phoneNumber, message } = data;
                
                console.log(`🌉 [SmsCoreManager] handleMessageReceived for ${contactId}: "${message?.text}"`);
                console.log(`🌉 [SmsCoreManager] activeSmsScreens has ${contactId}:`, this.activeSmsScreens.has(contactId));
                console.log(`🌉 [SmsCoreManager] activeSmsScreens contents:`, Array.from(this.activeSmsScreens));
                
                this.log(`📥 Incoming message for ${contactId}: "${message?.text}"`);
                
                // Add to cache
                if (message) {
                    this.addMessageToCache(phoneNumber, message);
                }
                
                // CRITICAL FIX: Always trigger notification for new messages (not just when screen is inactive)
                this.triggerMessageNotification(contactId, message);
                
                // Update SMS screen immediately if active
                if (this.activeSmsScreens.has(contactId)) {
                    console.log(`🌉 [SmsCoreManager] SMS screen is active, calling updateSmsScreenImmediate`);
                    this.updateSmsScreenImmediate(contactId);
                } else {
                    console.log(`🌉 [SmsCoreManager] SMS screen is NOT active for ${contactId} - alert should trigger visual notification`);
                }
                
            } catch (error) {
                this.logError('Error handling incoming message:', error);
            }
        }

        /**
         * Handle sent message confirmation
         */
        handleMessageSent(data) {
            try {
                const { contactId, phoneNumber, message } = data;
                
                this.log(`📤 Sent message confirmed for ${contactId}`);
                
                // Update message status in cache
                if (message) {
                    this.updateMessageInCache(phoneNumber, message);
                }
                
                // Update SMS screen if active
                if (this.activeSmsScreens.has(contactId)) {
                    this.updateSmsScreen(contactId);
                }
                
            } catch (error) {
                this.logError('Error handling sent message:', error);
            }
        }

        /**
         * Handle incoming message from broken event system (fallback)
         */
        handleIncomingMessage(data) {
            try {
                this.log('📥 FALLBACK: Handling incoming message via broken event system');
                
                const phoneNumber = data.phoneNumber || data.phone || data.from;
                const messageText = data.text || data.message;
                const contactId = this.phoneToContact.get(this.normalizePhoneNumber(phoneNumber));
                
                if (contactId && messageText) {
                    const message = {
                        id: `received_${Date.now()}`,
                        text: messageText,
                        timestamp: data.timestamp || Date.now(),
                        type: 'received',
                        isOutgoing: false,
                        phoneNumber: this.normalizePhoneNumber(phoneNumber),
                        status: 'received'
                    };
                    
                    // Process as normal incoming message
                    this.handleMessageReceived({
                        contactId: contactId,
                        phoneNumber: phoneNumber,
                        message: message
                    });
                }
                
            } catch (error) {
                this.logError('Error in fallback incoming message handler:', error);
            }
        }

        /**
         * Mark SMS screen as active
         */
        markSmsScreenActive(contactId) {
            this.activeSmsScreens.add(contactId);
            console.log(`🌉 [SmsCoreManager] SMS screen activated for contact: ${contactId}`);
            console.log(`🌉 [SmsCoreManager] Active screens now:`, Array.from(this.activeSmsScreens));
            
            // Send to Flutter
            this.sendToFlutter({
                type: 'sms_screen_active',
                contactId: contactId,
            });
            
            // Load conversation immediately and update screen
            this.getConversationByContactId(contactId).then(() => {
                // Force immediate update after conversation loads
                this.updateSmsScreen(contactId);
            });
        }

        /**
         * Mark SMS screen as inactive
         */
        markSmsScreenInactive(contactId) {
            this.activeSmsScreens.delete(contactId);
            this.log(`SMS screen deactivated for contact: ${contactId}`);
            
            // CRITICAL FOR ALERT SYSTEM: Don't tell Flutter to stop listening!
            // The alert system needs continuous SMS monitoring even when screens are closed
            console.log(`🚨 [ALERT SYSTEM] Screen closed for ${contactId} but keeping SMS listening active for background alerts`);
            
            // DON'T send sms_screen_inactive to Flutter - this would stop SMS listening
            // which prevents background message detection for the alert system
            // this.sendToFlutter({
            //     type: 'sms_screen_inactive',
            //     contactId: contactId,
            // });
        }

        /**
         * Update SMS screen with current messages
         */
        updateSmsScreen(contactId, messages = null) {
            try {
                console.log(`🌉 [SmsCoreManager] updateSmsScreen called for contact: ${contactId}`);
                console.log(`🌉 [SmsCoreManager] messages param:`, messages?.length || 'null');
                
                // 🔧 CRITICAL FIX: If contactId looks like a phone number, resolve it to actual contactId
                let resolvedContactId = contactId;
                if (contactId && contactId.startsWith('+')) {
                    const actualContactId = this.phoneToContact.get(this.normalizePhoneNumber(contactId));
                    if (actualContactId) {
                        console.log(`🔧 [CONTACT RESOLUTION] Phone ${contactId} → Contact ${actualContactId}`);
                        resolvedContactId = actualContactId;
                    } else {
                        console.log(`🔧 [CONTACT RESOLUTION] ❌ No contact found for phone: ${contactId}`);
                        console.log(`🔧 [CONTACT RESOLUTION] Available mappings:`, Array.from(this.phoneToContact.entries()));
                        return; // Can't proceed without valid contact mapping
                    }
                }
                
                if (!window.app?.contactManager?.contacts) {
                    console.log(`🌉 [SmsCoreManager] No contact manager available`);
                    return;
                }
                
                const contact = window.app.contactManager.contacts.get(resolvedContactId);
                if (!contact?.smsScreen) {
                    console.log(`🌉 [SmsCoreManager] No contact or SMS screen found for contactId: ${resolvedContactId}`);
                    console.log(`🌉 [SmsCoreManager] Available contacts:`, Array.from(window.app.contactManager.contacts.keys()));
                    return;
                }
                
                const phoneNumber = this.contactMappings.get(resolvedContactId);
                if (!phoneNumber) {
                    console.log(`🌉 [SmsCoreManager] No phone number mapping found for contactId: ${resolvedContactId}`);
                    console.log(`🌉 [SmsCoreManager] Contact mappings:`, Array.from(this.contactMappings.entries()));
                    return;
                }
                
                // Get messages from cache or parameter
                const messagesToDisplay = messages || this.messageCache.get(phoneNumber) || [];
                
                console.log(`🌉 [SmsCoreManager] Updating SMS screen for ${resolvedContactId} (${phoneNumber}): ${messagesToDisplay.length} messages`);
                console.log(`🌉 [SmsCoreManager] Sample messages:`, messagesToDisplay.slice(0, 3));
                
                // 🔧 ROBUST FAILSAFE SYSTEM: Self-healing SMS display chain
                this.executeSmsDisplayFailsafe(contact, messagesToDisplay, resolvedContactId, phoneNumber);
                
            } catch (error) {
                this.logError(`Error updating SMS screen for ${contactId}:`, error);
                // Emergency fallback
                this.emergencyFallback(contactId, messages);
            }
        }

        /**
         * 🔧 ROBUST FAILSAFE: Self-healing SMS display system
         * This method implements automatic detection and recovery for SMS display failures
         */
        executeSmsDisplayFailsafe(contact, messagesToDisplay, contactId, phoneNumber) {
            console.log('🔧 [FAILSAFE] Starting SMS display failsafe system');
            
            // Step 1: Health check - verify all required methods exist
            const healthCheck = this.performSmsHealthCheck(contact);
            if (!healthCheck.healthy) {
                console.error('🔧 [FAILSAFE] ❌ SMS screen health check failed:', healthCheck.issues);
                return;
            }
            
            // Step 2: Clear any render locks that might be stuck
            this.clearStuckRenderLocks(contact);
            
            // Step 3: Force fresh data markers to bypass stale cache logic
            const freshMessages = this.markMessagesAsFresh(messagesToDisplay);
            
            // Step 4: Execute update with recovery monitoring
            this.executeUpdateWithRecovery(contact, freshMessages, contactId);
            
            // Step 5: Verify update success and retry if needed
            setTimeout(() => this.verifyAndRetryUpdate(contact, freshMessages, contactId), 100);
        }

        /**
         * 🔧 FAILSAFE: Perform SMS screen health check
         */
        performSmsHealthCheck(contact) {
            const issues = [];
            const checks = {
                updateMessages: !!contact.smsScreen.updateMessages,
                renderInterface: !!contact.smsScreen.renderInterface,
                scrollToBottom: !!contact.smsScreen.scrollToBottom,
                isVisible: contact.smsScreen.isVisible !== false,
                notStuckRendering: !contact.smsScreen.isRendering
            };
            
            Object.entries(checks).forEach(([check, passed]) => {
                if (!passed) issues.push(check);
            });
            
            const healthy = issues.length === 0;
            console.log(`🔧 [FAILSAFE] Health check: ${healthy ? '✅' : '❌'}`, checks);
            
            return { healthy, issues, checks };
        }

        /**
         * 🔧 FAILSAFE: Clear stuck render locks
         */
        clearStuckRenderLocks(contact) {
            if (contact.smsScreen.isRendering) {
                console.log('🔧 [FAILSAFE] Clearing stuck render lock');
                contact.smsScreen.isRendering = false;
            }
            
            // Reset render throttling if it's stuck
            if (contact.smsScreen.lastRenderTime) {
                const timeSinceLastRender = Date.now() - contact.smsScreen.lastRenderTime;
                if (timeSinceLastRender > 5000) { // 5 seconds is too long
                    console.log('🔧 [FAILSAFE] Resetting stale render timestamp');
                    contact.smsScreen.lastRenderTime = 0;
                }
            }
        }

        /**
         * 🔧 FAILSAFE: Mark messages as fresh to bypass cache logic
         */
        markMessagesAsFresh(messages) {
            const freshTimestamp = Date.now();
            return messages.map(msg => ({
                ...msg,
                _freshDataTimestamp: freshTimestamp,
                _failsafeForced: true
            }));
        }

        /**
         * 🔧 FAILSAFE: Execute update with recovery monitoring
         */
        executeUpdateWithRecovery(contact, freshMessages, contactId) {
            try {
                console.log(`🔧 [FAILSAFE] Executing update for ${contactId} with ${freshMessages.length} fresh messages`);
                
                // Update with fresh data
                contact.smsScreen.updateMessages(freshMessages, 'failsafe_critical');
                
                // Force render with maximum priority
                contact.smsScreen.renderInterface(true, 'failsafe_critical');
                
                // Ensure scroll position
                contact.smsScreen.scrollToBottom();
                
                // Update texture
                if (contact.smsScreen.texture) {
                    contact.smsScreen.texture.needsUpdate = true;
                }
                
                // Mark screen as active
                this.markSmsScreenActive(contactId);
                
                // Record successful operation
                this.recordSuccessfulOperation();
                
                console.log('🔧 [FAILSAFE] ✅ Update execution completed');
                
            } catch (error) {
                console.error('🔧 [FAILSAFE] ❌ Update execution failed:', error);
                // Record failed operation
                this.recordFailedOperation();
                // Try emergency recovery
                this.emergencyRecovery(contact, freshMessages, contactId);
            }
        }

        /**
         * 🔧 FAILSAFE: Verify update success and retry if needed
         */
        verifyAndRetryUpdate(contact, freshMessages, contactId) {
            const currentMessageCount = contact.smsScreen.messages?.length || 0;
            const expectedCount = freshMessages.length;
            
            console.log(`🔧 [FAILSAFE] Verification: Expected ${expectedCount} messages, found ${currentMessageCount}`);
            
            if (currentMessageCount !== expectedCount && expectedCount > 0) {
                console.log('🔧 [FAILSAFE] ⚠️ Message count mismatch - retrying update');
                this.emergencyRecovery(contact, freshMessages, contactId);
            } else {
                console.log('🔧 [FAILSAFE] ✅ Update verification passed');
            }
        }

        /**
         * 🔧 FAILSAFE: Emergency recovery for failed updates
         */
        emergencyRecovery(contact, freshMessages, contactId) {
            console.log('🔧 [FAILSAFE] 🚨 EMERGENCY RECOVERY ACTIVATED');
            
            // Clear all state
            contact.smsScreen.isRendering = false;
            contact.smsScreen.lastRenderTime = 0;
            contact.smsScreen.messages = [];
            
            // Force immediate update with no throttling
            setTimeout(() => {
                console.log('🔧 [FAILSAFE] 🚨 Emergency update attempt');
                contact.smsScreen.messages = [...freshMessages];
                contact.smsScreen.renderInterface(true, 'emergency');
                contact.smsScreen.scrollToBottom();
                if (contact.smsScreen.texture) {
                    contact.smsScreen.texture.needsUpdate = true;
                }
            }, 50);
            
            // Final verification
            setTimeout(() => {
                const finalCount = contact.smsScreen.messages?.length || 0;
                console.log(`🔧 [FAILSAFE] 🚨 Emergency recovery result: ${finalCount} messages`);
                if (finalCount === 0 && freshMessages.length > 0) {
                    console.error('🔧 [FAILSAFE] 🚨 CRITICAL: Emergency recovery failed - SMS system needs manual intervention');
                }
            }, 200);
        }

        /**
         * 🔧 FAILSAFE: Emergency fallback when everything else fails
         */
        emergencyFallback(contactId, messages) {
            console.log('🔧 [FAILSAFE] 🚨 EMERGENCY FALLBACK - Core updateSmsScreen failed');
            
            try {
                // Try to get contact and reset everything
                const contact = window.app?.contactManager?.contacts?.get(contactId);
                if (contact?.smsScreen) {
                    console.log('🔧 [FAILSAFE] 🚨 Attempting emergency SMS screen reset');
                    
                    // Reset all flags
                    contact.smsScreen.isRendering = false;
                    contact.smsScreen.lastRenderTime = 0;
                    
                    // Force messages if provided
                    if (messages && Array.isArray(messages)) {
                        contact.smsScreen.messages = [...messages];
                        contact.smsScreen.renderInterface(true, 'emergency_fallback');
                    }
                }
            } catch (fallbackError) {
                console.error('🔧 [FAILSAFE] 🚨 EMERGENCY FALLBACK ALSO FAILED:', fallbackError);
            }
        }

        /**
         * Update SMS screen immediately (for real-time messages)
         */
        updateSmsScreenImmediate(contactId) {
            // Clear any throttling and update immediately
            if (window.app?.contactManager?.contacts) {
                const contact = window.app.contactManager.contacts.get(contactId);
                if (contact?.smsScreen) {
                    // Clear throttling timers
                    if (contact.smsScreen.renderThrottleTimeout) {
                        clearTimeout(contact.smsScreen.renderThrottleTimeout);
                        contact.smsScreen.renderThrottleTimeout = null;
                    }
                    
                    // Reset throttling flags
                    contact.smsScreen.lastRenderTime = 0;
                    contact.smsScreen.isRendering = false;
                    
                    // Update immediately
                    this.updateSmsScreen(contactId);
                }
            }
        }

        /**
         * Add message to cache
         */
        addMessageToCache(phoneNumber, message) {
            const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
            
            if (!this.messageCache.has(normalizedPhone)) {
                this.messageCache.set(normalizedPhone, []);
            }
            
            const messages = this.messageCache.get(normalizedPhone);
            
            // Check for duplicates
            const existingIndex = messages.findIndex(m => m.id === message.id);
            if (existingIndex >= 0) {
                // Update existing message
                messages[existingIndex] = message;
            } else {
                // Add new message and sort by timestamp (newest first)
                messages.push(message);
                messages.sort((a, b) => b.timestamp - a.timestamp);
            }
        }

        /**
         * Update message in cache
         */
        updateMessageInCache(phoneNumber, updatedMessage) {
            const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
            const messages = this.messageCache.get(normalizedPhone);
            
            if (messages) {
                const messageIndex = messages.findIndex(m => m.id === updatedMessage.id);
                if (messageIndex >= 0) {
                    messages[messageIndex] = updatedMessage;
                }
            }
        }

        /**
         * Patch existing SMS screen methods for robustness
         */
        patchSmsScreenMethods() {
            // This will be called when SMS screens are created
            const originalSmsScreenMethods = {};
            
            // Store reference to patch SMS screens when they're created
            this.originalSmsScreenMethods = originalSmsScreenMethods;
            
            this.log('SMS screen methods patched for robustness');
        }

        /**
         * Set up contact integration
         */
        setupContactIntegration() {
            // Hook into contact manager when it's available
            if (window.app?.contactManager) {
                this.integrateWithContactManager();
            } else {
                // Wait for contact manager to be available
                const checkForContactManager = setInterval(() => {
                    if (window.app?.contactManager) {
                        this.integrateWithContactManager();
                        clearInterval(checkForContactManager);
                    }
                }, 100);
            }
        }

        /**
         * Integrate with existing contact manager
         */
        integrateWithContactManager() {
            this.log('Integrating with contact manager...');
            
            // Auto-register existing contacts
            if (window.app.contactManager.contacts) {
                for (const [contactId, contact] of window.app.contactManager.contacts) {
                    if (contact.contactData?.phoneNumber) {
                        this.registerContact(
                            contactId,
                            contact.contactData.name || contactId,
                            contact.contactData.phoneNumber,
                            contact.contactData.avatar
                        );
                    }
                }
            }
            
            this.log('✅ Contact manager integration complete');
        }

        /**
         * Trigger message notification
         */
        triggerMessageNotification(contactId, message) {
            // This can be extended to show visual notifications, play sounds, etc.
            this.log(`🔔 New message notification for ${contactId}: "${message?.text}"`);
            
            // Trigger SMS alert system for visual notifications
            try {
                // Get phone number for the contact
                const phoneNumber = this.contactMappings.get(contactId);
                
                // Dispatch events that the ContactAlertManager listens for
                window.dispatchEvent(new CustomEvent('sms-message-received', {
                    detail: { 
                        contactId: contactId, 
                        phoneNumber: phoneNumber,
                        message: message,
                        timestamp: Date.now()
                    }
                }));
                
                window.dispatchEvent(new CustomEvent('sms-core-message-received', {
                    detail: { 
                        contactId: contactId, 
                        phoneNumber: phoneNumber,
                        message: message,
                        timestamp: Date.now()
                    }
                }));
                
                this.log(`📢 SMS alert events dispatched for contact ${contactId}`);
                
            } catch (error) {
                this.logError('Error triggering SMS alert system:', error);
            }
        }

        /**
         * Send data to Flutter bridge
         */
        sendToFlutter(data) {
            try {
                // This will be implemented with the actual Flutter-JavaScript bridge
                this.log('📨 Sending to Flutter:', data.type);
                
                // For now, dispatch a custom event that the Flutter bridge can listen for
                window.dispatchEvent(new CustomEvent('sms-core-to-flutter', {
                    detail: data
                }));
                
            } catch (error) {
                this.logError('Error sending to Flutter:', error);
            }
        }

        /**
         * Normalize phone number
         */
        normalizePhoneNumber(phoneNumber) {
            if (!phoneNumber) return '';
            
            // Remove all non-digit characters
            const digitsOnly = phoneNumber.replace(/[^\d]/g, '');
            
            // For US numbers, ensure consistent formatting
            if (digitsOnly.length === 10) {
                return `+1${digitsOnly}`;
            } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
                return `+${digitsOnly}`;
            } else {
                return digitsOnly.length > 0 ? `+${digitsOnly}` : phoneNumber;
            }
        }

        /**
         * Get debug information
         */
        getDebugInfo() {
            return {
                isInitialized: this.isInitialized,
                registeredContacts: this.contactMappings.size,
                activeSmsScreens: this.activeSmsScreens.size,
                messageCache: this.messageCache.size,
                contactMappings: Object.fromEntries(this.contactMappings),
                activeSmsScreenIds: Array.from(this.activeSmsScreens),
                failureCount: this.failureCount,
                lastFailureTime: this.lastFailureTime,
            };
        }

        /**
         * Simulate incoming message for testing
         */
        simulateIncomingMessage(contactId, messageText) {
            const phoneNumber = this.contactMappings.get(contactId);
            if (!phoneNumber) {
                this.logError(`Cannot simulate: No phone number for contact ${contactId}`);
                return;
            }
            
            const message = {
                id: `sim_${Date.now()}`,
                text: messageText,
                timestamp: Date.now(),
                type: 'received',
                isOutgoing: false,
                phoneNumber: phoneNumber,
                status: 'received'
            };
            
            this.handleMessageReceived({
                contactId: contactId,
                phoneNumber: phoneNumber,
                message: message
            });
            
            this.log(`📥 Simulated incoming message for ${contactId}: "${messageText}"`);
        }

        /**
         * Logging utilities
         */
        log(message, ...args) {
            if (this.debugMode) {
                console.log(`🌉 [SmsCoreManager] ${message}`, ...args);
            }
        }

        logError(message, ...args) {
            console.error(`❌ [SmsCoreManager] ${message}`, ...args);
            this.failureCount++;
            this.lastFailureTime = Date.now();
        }

        /**
         * Cleanup resources
         */
        dispose() {
            this.activeSmsScreens.clear();
            this.contactMappings.clear();
            this.phoneToContact.clear();
            this.messageCache.clear();
            this.isInitialized = false;
            
            this.log('SMS Core Manager disposed');
        }

        /**
         * 🔧 FAILSAFE: Start system health monitoring
         */
        startSystemHealthMonitoring() {
            if (this.healthMonitor.monitoringActive) return;
            
            this.healthMonitor.monitoringActive = true;
            console.log('🔧 [HEALTH] Starting SMS system health monitoring');
            
            // Check system health every 30 seconds
            setInterval(() => {
                this.performSystemHealthCheck();
            }, 30000);
        }

        /**
         * 🔧 FAILSAFE: Perform comprehensive system health check
         */
        performSystemHealthCheck() {
            const timeSinceLastSuccess = Date.now() - this.healthMonitor.lastSuccessfulUpdate;
            const maxTimeBetweenUpdates = 5 * 60 * 1000; // 5 minutes
            
            // Check if system has been inactive too long
            if (timeSinceLastSuccess > maxTimeBetweenUpdates && this.activeSmsScreens.size > 0) {
                console.log('🔧 [HEALTH] ⚠️ System appears inactive - performing diagnostic');
                this.performSystemDiagnostic();
            }
            
            // Check for stuck render states
            this.checkForStuckRenderStates();
            
            // Verify contact mappings integrity
            this.verifyContactMappingsIntegrity();
        }

        /**
         * 🔧 FAILSAFE: Perform system diagnostic and repair
         */
        performSystemDiagnostic() {
            console.log('🔧 [HEALTH] 🔍 Performing SMS system diagnostic');
            
            const issues = [];
            
            // Check contact manager
            if (!window.app?.contactManager?.contacts) {
                issues.push('No contact manager available');
            }
            
            // Check active SMS screens
            for (const contactId of this.activeSmsScreens) {
                const contact = window.app?.contactManager?.contacts?.get(contactId);
                if (!contact?.smsScreen) {
                    issues.push(`Active SMS screen missing for contact: ${contactId}`);
                    this.activeSmsScreens.delete(contactId); // Clean up
                }
            }
            
            if (issues.length > 0) {
                console.log('🔧 [HEALTH] ❌ System issues detected:', issues);
                this.performSystemRepair(issues);
            } else {
                console.log('🔧 [HEALTH] ✅ System diagnostic passed');
            }
        }

        /**
         * 🔧 FAILSAFE: Check for stuck render states
         */
        checkForStuckRenderStates() {
            for (const contactId of this.activeSmsScreens) {
                const contact = window.app?.contactManager?.contacts?.get(contactId);
                if (contact?.smsScreen?.isRendering) {
                    const timeSinceRender = Date.now() - (contact.smsScreen.lastRenderTime || 0);
                    if (timeSinceRender > 10000) { // 10 seconds is too long
                        console.log(`🔧 [HEALTH] ⚠️ Stuck render state detected for ${contactId} - clearing`);
                        contact.smsScreen.isRendering = false;
                        contact.smsScreen.lastRenderTime = 0;
                    }
                }
            }
        }

        /**
         * 🔧 FAILSAFE: Verify contact mappings integrity
         */
        verifyContactMappingsIntegrity() {
            const forwardMappings = this.contactMappings.size;
            const reverseMappings = this.phoneToContact.size;
            
            if (forwardMappings !== reverseMappings) {
                console.log(`🔧 [HEALTH] ⚠️ Mapping inconsistency: ${forwardMappings} forward, ${reverseMappings} reverse`);
                this.repairMappingConsistency();
            }
        }

        /**
         * 🔧 FAILSAFE: Repair mapping consistency
         */
        repairMappingConsistency() {
            console.log('🔧 [HEALTH] 🔧 Repairing mapping consistency');
            
            // Rebuild reverse mappings from forward mappings (forward is source of truth)
            this.phoneToContact.clear();
            for (const [contactId, phoneNumber] of this.contactMappings) {
                this.phoneToContact.set(phoneNumber, contactId);
            }
            
            console.log('🔧 [HEALTH] ✅ Mapping consistency repaired');
        }

        /**
         * 🔧 FAILSAFE: Perform system repair
         */
        performSystemRepair(issues) {
            console.log('🔧 [HEALTH] 🔧 Performing SMS system repair for issues:', issues);
            
            // Reset health counters
            this.healthMonitor.consecutiveFailures = 0;
            this.healthMonitor.lastSuccessfulUpdate = Date.now();
            this.healthMonitor.systemHealthy = true;
            
            // Trigger refresh of all active SMS screens
            for (const contactId of this.activeSmsScreens) {
                console.log(`🔧 [HEALTH] 🔧 Refreshing SMS screen for ${contactId}`);
                setTimeout(() => {
                    this.updateSmsScreen(contactId);
                }, 100);
            }
        }

        /**
         * 🔧 FAILSAFE: Record successful operation
         */
        recordSuccessfulOperation() {
            this.healthMonitor.lastSuccessfulUpdate = Date.now();
            this.healthMonitor.consecutiveFailures = 0;
            this.healthMonitor.systemHealthy = true;
        }

        /**
         * 🔧 FAILSAFE: Record failed operation
         */
        recordFailedOperation() {
            this.healthMonitor.consecutiveFailures++;
            if (this.healthMonitor.consecutiveFailures >= 3) {
                this.healthMonitor.systemHealthy = false;
                console.log('🔧 [HEALTH] ❌ System marked as unhealthy after consecutive failures');
                this.performSystemDiagnostic();
            }
        }
    }

    // Create global instance
    window.SmsCoreManager = SmsCoreManager;
    window.smsCoreManager = new SmsCoreManager();

    // IMMEDIATE AVAILABILITY: Mark as available even before full initialization
    // This prevents timeout issues in alert systems that depend on it
    console.log('📱 SMS Core Manager created - setting up immediate availability');
    
    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📱 SMS Core Manager initializing on DOM ready');
            window.smsCoreManager.initialize();
        });
    } else {
        console.log('📱 SMS Core Manager initializing immediately');
        // Initialize immediately but don't block
        setTimeout(() => {
            window.smsCoreManager.initialize();
        }, 100);
    }

    // Global helper functions for easy testing
    window.smsTest = {
        // Test incoming message
        receiveMessage: (contactId, text) => {
            window.smsCoreManager.simulateIncomingMessage(contactId, text);
        },
        
        // Test sending message
        sendMessage: (contactId, text) => {
            return window.smsCoreManager.sendMessageFromContact(contactId, text);
        },
        
        // Get debug info
        debug: () => {
            return window.smsCoreManager.getDebugInfo();
        },
        
        // Register contact manually
        registerContact: (contactId, name, phoneNumber) => {
            window.smsCoreManager.registerContact(contactId, name, phoneNumber);
        },
        
        // Mark SMS screen active
        openSmsScreen: (contactId) => {
            window.smsCoreManager.markSmsScreenActive(contactId);
        },
        
        // Mark SMS screen inactive
        closeSmsScreen: (contactId) => {
            window.smsCoreManager.markSmsScreenInactive(contactId);
        }
    };

    console.log('📱 SMS Core Manager loaded. Use window.smsTest for testing.');
    console.log('📱 Available test functions: smsTest.receiveMessage(), smsTest.sendMessage(), smsTest.debug()');

})();
