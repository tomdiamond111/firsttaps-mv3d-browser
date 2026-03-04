/**
 * SMS Simple Core - Ultra-Simplified, Robust SMS Message Display System
 * 
 * PURPOSE: Handle ONLY real-time message display for SMS screens
 * SCOPE: Send/Receive message display - NO alerts, NO complex routing
 * GOAL: Rock-solid reliability with minimal complexity
 * 
 * ARCHITECTURE:
 * - Single event listener for Flutter data
 * - Direct SMS screen updates only
 * - No complex event chains or multiple managers
 * - Isolated from alert system to prevent interference
 */

(function() {
    'use strict';

    console.log('*** SMS SIMPLE CORE: Module script starting to execute...');

    class SmsSimpleCore {
        constructor() {
            console.log('*** SMS SIMPLE CORE: Constructor starting...');
            this.activeSmsScreens = new Map(); // contactId -> array of screen instances (2D + 3D)
            this.conversationCache = new Map(); // contactId -> messages array
            this.contactIdMapping = new Map(); // phoneNumber -> contactId mapping
            
            console.log('*** SMS SIMPLE CORE initialized - focus on message display only');
            this.setupDirectFlutterListener();
        }

        /**
         * COORDINATOR-BASED FLUTTER LISTENERS - Centralized event management
         */
        setupDirectFlutterListener() {
            console.log('*** SMS SIMPLE CORE: Setting up coordinator-based event listeners...');
            
            // Subscribe to centralized event coordinator instead of direct listeners
            // This eliminates race conditions and ensures proper event ordering
            if (window.smsEventCoordinator) {
                this.subscribeToCoordinator();
            } else {
                // Wait for coordinator to be available
                const waitForCoordinator = setInterval(() => {
                    if (window.smsEventCoordinator) {
                        clearInterval(waitForCoordinator);
                        this.subscribeToCoordinator();
                    }
                }, 100);
                
                // Fallback timeout
                setTimeout(() => {
                    clearInterval(waitForCoordinator);
                    if (!window.smsEventCoordinator) {
                        console.warn('*** SMS SIMPLE CORE: Coordinator not available, using direct listeners');
                        this.setupDirectListeners();
                    }
                }, 5000);
            }
        }

        /**
         * Subscribe to the SMS Event Coordinator
         */
        subscribeToCoordinator() {
            console.log('*** SMS SIMPLE CORE: Subscribing to SMS Event Coordinator...');
            
            // Subscribe to message display events
            window.smsEventCoordinator.subscribe('messageDisplay', (event) => {
                this.handleCoordinatedEvent(event);
            });
            
            console.log('*** SMS SIMPLE CORE: Subscribed to coordinator for message display events');
        }

        /**
         * Handle events from the coordinator
         */
        handleCoordinatedEvent(event) {
            const { type, action, contactId, data } = event;
            
            console.log(`🔥 Simple Core: Received coordinated ${type} event: ${action} for ${contactId}`);
            
            if (type === 'sms-data') {
                this.handleFlutterData(data);
            } else if (type === 'sms-input') {
                this.handleRealTimeEvent(data);
            }
        }

        /**
         * Fallback direct listeners (if coordinator not available)
         */
        setupDirectListeners() {
            console.log('*** SMS SIMPLE CORE: Setting up fallback direct listeners...');
            
            // CRITICAL: Re-enable flutter-sms-data listener for emergency SMS fix
            window.addEventListener('flutter-sms-data', (event) => {
                console.log('🔥 Simple Core: Received flutter-sms-data event (direct)');
                this.handleFlutterData(event.detail);
            });

            // Listen for real-time message events (sent/received)
            window.addEventListener('flutter-sms-input-response', (event) => {
                this.handleRealTimeEvent(event.detail);
            });

            // Listen for immediate message sent confirmations
            window.addEventListener('message_sent', (event) => {
                this.handleMessageSent(event.detail);
            });

            // Listen for incoming message alerts
            window.addEventListener('incoming_message', (event) => {
                this.handleIncomingMessage(event.detail);
            });

            // Listen for received message alerts
            window.addEventListener('message_received', (event) => {
                this.handleIncomingMessage(event.detail);
            });

            // Listen for outgoing message events
            window.addEventListener('outgoing_message', (event) => {
                this.handleOutgoingMessage(event.detail);
            });

            // CRITICAL: Listen for all message-related events from Flutter
            window.addEventListener('flutter-message-event', (event) => {
                this.handleGenericMessageEvent(event.detail);
            });

            // CRITICAL: Listen for content observer events (real-time SMS detection)
            window.addEventListener('sms-content-observer', (event) => {
                this.handleContentObserverEvent(event.detail);
            });

            console.log('*** Simple Core: Comprehensive Flutter listeners established');
        }

        /**
         * Resolve contact ID - handle both contact IDs and phone numbers
         */
        resolveContactId(inputId) {
            console.log(`🔥 Simple Core: Resolving contact ID for: ${inputId}`);
            
            // If it's already a registered contact ID, return it
            if (this.activeSmsScreens.has(inputId)) {
                console.log(`🔥 Simple Core: Found direct match for ${inputId}`);
                return inputId;
            }

            // If it's a phone number, check if we have a mapping
            if (inputId && inputId.startsWith('+')) {
                console.log(`🔥 Simple Core: Processing phone number ${inputId}`);
                const mappedContactId = this.contactIdMapping.get(inputId);
                if (mappedContactId && this.activeSmsScreens.has(mappedContactId)) {
                    console.log(`🔥 Simple Core: Mapped ${inputId} to ${mappedContactId}`);
                    return mappedContactId;
                }
                
                // Try to establish mapping using contact resolver
                if (window.smsContactResolver) {
                    try {
                        const contactId = window.smsContactResolver.mapPhoneToContactId(inputId);
                        if (contactId && this.activeSmsScreens.has(contactId)) {
                            console.log(`🔥 Simple Core: Resolved ${inputId} to ${contactId} via resolver`);
                            this.contactIdMapping.set(inputId, contactId);
                            return contactId;
                        }
                    } catch (error) {
                        console.warn(`🔥 Simple Core: Could not resolve phone ${inputId}:`, error);
                    }
                }
            }

            // Check if any registered contact has this phone number in their data
            for (const [contactId, smsScreen] of this.activeSmsScreens) {
                if (smsScreen.phoneNumber === inputId) {
                    console.log(`🔥 Simple Core: Found phone match ${inputId} for contact ${contactId}`);
                    this.contactIdMapping.set(inputId, contactId);
                    return contactId;
                }
            }

            console.log(`🔥 Simple Core: No mapping found for ${inputId}, returning as-is`);
            return inputId; // Return as-is if no mapping found
        }

        /**
         * Process Flutter data - Simple and direct
         */
        handleFlutterData(data) {
            if (!data || !data.contactId) {
                return; // Ignore invalid data
            }

            console.log(`🔥 Simple Core: Processing Flutter data for contact ${data.contactId}, action: ${data.action}`);

            // Resolve the contact ID to handle phone number mappings
            const resolvedContactId = this.resolveContactId(data.contactId);
            console.log(`🔥 Simple Core: Resolved ${data.contactId} to ${resolvedContactId}`);

            // Handle conversation responses (full message lists)
            if (data.messages && Array.isArray(data.messages)) {
                console.log(`🔥 Simple Core: Processing conversation data for contact ${data.contactId} -> ${resolvedContactId} (${data.messages.length} messages)`);
                this.updateConversation(resolvedContactId, data.messages);
                return;
            }

            // Handle real-time message events
            if (data.action === 'outgoing_message' || data.action === 'incoming_message') {
                console.log(`🔥 Simple Core: Real-time ${data.action} for ${data.contactId} -> ${resolvedContactId} - forcing refresh`);
                
                // Force refresh the conversation to get the latest data
                setTimeout(() => {
                    this.refreshConversation(resolvedContactId);
                }, 50); // Small delay to ensure Flutter has processed the message
                return;
            }

            console.log(`🔥 Simple Core: Unhandled data type for ${data.contactId}:`, data.action);
        }

        /**
         * Handle real-time message events from flutter-sms-input-response
         */
        handleRealTimeEvent(data) {
            if (!data || !data.action) {
                console.log('🔥 Simple Core: Invalid real-time event data');
                return;
            }

            console.log('🔥 Simple Core: Real-time event:', data.action);

            if (data.action === 'conversation_updated') {
                // Treat as conversation refresh
                this.handleFlutterData(data);
            } else if (data.action === 'message_sent' || data.action === 'message_received') {
                // Force immediate conversation refresh for timing with contact ID resolution
                if (data.contactId) {
                    const resolvedContactId = this.resolveContactId(data.contactId);
                    console.log(`🔥 Simple Core: Resolved real-time event contact ${data.contactId} to ${resolvedContactId}`);
                    this.requestConversationRefresh(resolvedContactId);
                }
            }
        }

        /**
         * Handle immediate message sent confirmations
         */
        handleMessageSent(data) {
            console.log('🔥 Simple Core: Message sent confirmed - immediate refresh');
            
            // Extract contact ID and force immediate refresh
            if (data && data.contactId) {
                const resolvedContactId = this.resolveContactId(data.contactId);
                console.log(`🔥 Simple Core: Resolved sent message contact ${data.contactId} to ${resolvedContactId}`);
                this.requestConversationRefresh(resolvedContactId);
            }
        }

        /**
         * Handle incoming message alerts
         */
        handleIncomingMessage(data) {
            console.log('🔥 Simple Core: Incoming message detected - immediate refresh');
            
            // Extract contact ID and refresh conversation
            if (data && data.contactId) {
                const resolvedContactId = this.resolveContactId(data.contactId);
                console.log(`🔥 Simple Core: Resolved incoming message contact ${data.contactId} to ${resolvedContactId}`);
                this.requestConversationRefresh(resolvedContactId);
            }
        }

        /**
         * Handle outgoing message events
         */
        handleOutgoingMessage(data) {
            console.log('🔥 Simple Core: Outgoing message detected - immediate refresh');
            
            // Extract contact ID and force immediate refresh
            if (data && data.contactId) {
                const resolvedContactId = this.resolveContactId(data.contactId);
                console.log(`🔥 Simple Core: Resolved outgoing message contact ${data.contactId} to ${resolvedContactId}`);
                this.requestConversationRefresh(resolvedContactId);
            }
        }

        /**
         * Handle generic message events from Flutter
         */
        handleGenericMessageEvent(data) {
            console.log('🔥 Simple Core: Generic message event received:', data);
            
            if (data && data.contactId) {
                const resolvedContactId = this.resolveContactId(data.contactId);
                console.log(`🔥 Simple Core: Resolved generic event contact ${data.contactId} to ${resolvedContactId}`);
                
                // Handle different event types
                if (data.action === 'message_received' || data.action === 'incoming_message') {
                    this.requestConversationRefresh(resolvedContactId);
                } else if (data.action === 'message_sent' || data.action === 'outgoing_message') {
                    this.requestConversationRefresh(resolvedContactId);
                }
            }
        }

        /**
         * Handle content observer events (real-time SMS detection)
         */
        handleContentObserverEvent(data) {
            console.log('🔥 Simple Core: Content observer event received:', data);
            
            if (data && data.contactId) {
                const resolvedContactId = this.resolveContactId(data.contactId);
                console.log(`🔥 Simple Core: Resolved content observer contact ${data.contactId} to ${resolvedContactId}`);
                this.requestConversationRefresh(resolvedContactId);
            }
        }

        /**
         * Request immediate conversation refresh from Flutter
         */
        requestConversationRefresh(contactId) {
            if (!contactId) {
                console.log('🔥 Simple Core: No contact ID for refresh');
                return;
            }

            console.log(`🔥 Simple Core: Requesting immediate conversation refresh for ${contactId}`);
            
            // Use existing refresh logic
            this.refreshConversation(contactId);
        }

        /**
         * Update conversation with new message list
         */
        updateConversation(contactId, messages) {
            // Cache the conversation
            this.conversationCache.set(contactId, messages);

            // Update ALL active screens for this contact (2D + 3D)
            const screens = this.activeSmsScreens.get(contactId);
            if (screens && screens.length > 0) {
                console.log(`🔥 Simple Core: Updating ${screens.length} screen(s) for ${contactId} with ${messages.length} messages`);
                
                // Mark messages as fresh to bypass stale cache logic
                const freshMessages = messages.map(msg => ({
                    ...msg,
                    _freshDataTimestamp: Date.now(),
                    _simpleCore: true,
                    _emergencyRefresh: true
                }));

                // Update ALL screens (2D SMS screen + 3D balloon manager)
                screens.forEach((screen, index) => {
                    const screenType = screen.constructor?.name || 'unknown';
                    console.log(`🔥 Simple Core: Updating screen ${index + 1}/${screens.length} (${screenType})`);
                    
                    // Direct update - use critical priority for immediate display
                    if (screen.updateMessages) {
                        screen.updateMessages(freshMessages, 'critical');
                    } else {
                        console.warn(`🔥 Simple Core: Screen ${index + 1} has no updateMessages method`);
                    }
                });
            }
        }

        /**
         * Request fresh conversation data from Flutter
         */
        refreshConversation(contactId) {
            console.log(`🔥 Simple Core: Requesting conversation refresh for ${contactId}`);
            
            // Ask Flutter for latest conversation with force refresh
            if (window.app?.smsChannelManager) {
                window.app.smsChannelManager.getConversationHistory(contactId, 100, null, true); // force refresh = true
            }
        }

        /**
         * Register SMS screen for updates (supports multiple screens per contact)
         */
        registerSmsScreen(contactId, smsScreen) {
            const screenType = smsScreen.constructor?.name || 'unknown';
            console.log(`🔥 Simple Core: Registering ${screenType} screen for contact ${contactId}`);
            
            // Get existing screens or create new array
            let screens = this.activeSmsScreens.get(contactId);
            if (!screens) {
                screens = [];
                this.activeSmsScreens.set(contactId, screens);
            }
            
            // Add this screen to the array (if not already registered)
            if (!screens.includes(smsScreen)) {
                screens.push(smsScreen);
                console.log(`🔥 Simple Core: Now ${screens.length} screen(s) registered for ${contactId}`);
            } else {
                console.log(`🔥 Simple Core: Screen already registered for ${contactId}`);
            }

            // Establish phone number mapping for this contact
            this.establishPhoneMapping(contactId);

            // Immediately provide cached data if available
            const cachedMessages = this.conversationCache.get(contactId);
            if (cachedMessages && cachedMessages.length > 0) {
                console.log(`🔥 Simple Core: Providing cached data (${cachedMessages.length} messages)`);
                this.updateConversation(contactId, cachedMessages);
            } else {
                // Request fresh data
                this.refreshConversation(contactId);
            }
        }

        /**
         * Establish phone number mapping for a contact ID
         */
        establishPhoneMapping(contactId) {
            try {
                // Use the contact resolver to get the phone number
                if (window.smsContactResolver) {
                    const phoneNumber = window.smsContactResolver.resolvePhoneNumber(contactId);
                    if (phoneNumber) {
                        const normalizedPhone = window.smsContactResolver.normalizePhoneNumber(phoneNumber);
                        if (normalizedPhone) {
                            console.log(`🔥 Simple Core: Mapping ${normalizedPhone} -> ${contactId}`);
                            this.contactIdMapping.set(normalizedPhone, contactId);
                            
                            // Also cache the conversation with the phone number key
                            const cachedMessages = this.conversationCache.get(contactId);
                            if (cachedMessages) {
                                this.conversationCache.set(normalizedPhone, cachedMessages);
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(`🔥 Simple Core: Could not establish phone mapping for ${contactId}:`, error);
            }
        }

        /**
         * Unregister SMS screen (remove specific screen from array)
         */
        unregisterSmsScreen(contactId, smsScreen) {
            const screens = this.activeSmsScreens.get(contactId);
            if (screens) {
                const index = screens.indexOf(smsScreen);
                if (index > -1) {
                    screens.splice(index, 1);
                    console.log(`🔥 Simple Core: Unregistered screen for ${contactId}, ${screens.length} remaining`);
                    
                    // Remove contactId entry if no screens left
                    if (screens.length === 0) {
                        this.activeSmsScreens.delete(contactId);
                        console.log(`🔥 Simple Core: No screens left for ${contactId}, removed entry`);
                    }
                }
            }
        }

        /**
         * Force refresh all active screens (emergency recovery)
         */
        forceRefreshAll() {
            console.log('🔥 Simple Core: Force refresh all active screens');
            
            for (const [contactId, screens] of this.activeSmsScreens) {
                console.log(`🔥 Simple Core: Refreshing ${screens.length} screen(s) for ${contactId}`);
                this.refreshConversation(contactId);
            }
        }

        /**
         * Get conversation cache for debugging
         */
        getConversationCache(contactId) {
            return this.conversationCache.get(contactId) || [];
        }

        /**
         * Health check
         */
        healthCheck() {
            return {
                activeScreens: this.activeSmsScreens.size,
                cachedConversations: this.conversationCache.size,
                flutterConnected: !!(window.app?.smsChannelManager),
                healthy: true
            };
        }
    }

    // Create and export the simple core
    console.log('*** SMS SIMPLE CORE: About to create instance...');
    window.smsSimpleCore = new SmsSimpleCore();
    console.log('*** SMS SIMPLE CORE ready - dedicated to message display reliability');
    console.log('*** SMS SIMPLE CORE: Instance created and attached to window');

})();
