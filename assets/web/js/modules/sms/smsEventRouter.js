/**
 * SMS Event Router
 * Handles event routing and dispatching for SMS functionality
 * Provides clean, map-based event handling with debugging support
 */

(function() {
    'use strict';

    class SmsEventRouter {
        constructor(channelManager, options = {}) {
            this.channelManager = channelManager;
            this.debugMode = options.debugMode || false;
            
            // Event handler maps for clean routing
            this.inputEventHandlers = new Map();
            this.dataEventHandlers = new Map();
            this.statusEventHandlers = new Map();
            
            // Conversation state tracking for detecting new messages
            this.lastConversationState = new Map();
            
            // Track last screen update times for aggressive new message detection
            this.lastScreenUpdate = new Map();
            
            // Track real-time update context for throttling bypass
            this.realtimeUpdateContext = new Map();
            
            // Initialize default event handlers
            this.initializeDefaultHandlers();
            
            // Initialize ContactAlertManager integration (restored from backup)
            this.initializeContactAlertManager();
            
            // CRITICAL FIX: Disable aggressive monitoring by default to prevent infinite loops
            // Only enable if explicitly needed for debugging
            if (options.enableAggressiveMonitoring === true) {
                this.startConversationMonitoring();
            } else {
                console.log('📱 SmsEventRouter: Aggressive monitoring DISABLED (prevents infinite loops)');
            }
            
            this.log('📱 SmsEventRouter initialized', { debugMode: this.debugMode });
            
            // ENHANCED: Set up real-time event listeners (per expert recommendation)
            this.setupRealTimeEventListeners();
            
            // CRITICAL FIX: Add direct UI update methods (based on working debug script)
            this.addDirectUpdateMethods();
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
                        console.log(`📱 [EVENT ROUTER] Found contact by phone number: ${contactIdOrPhone} (normalized: ${normalizedSearch}) -> stored: ${potentialContact.phoneNumber} (normalized: ${normalizedStored}) -> ID: ${id}`);
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
         * Resolve contact ID - handle both contact IDs and phone numbers
         * Maps Flutter phone numbers to JavaScript contact IDs
         */
        resolveContactId(inputId) {
            console.log(`🔥 SMS Event Router: Resolving contact ID for: ${inputId}`);
            
            // If it's already a contact ID (numeric), return it
            if (inputId && /^\d+$/.test(inputId.toString())) {
                console.log(`🔥 SMS Event Router: ${inputId} is already a contact ID`);
                return inputId;
            }

            // If it's a phone number, try to find the corresponding contact
            if (inputId && (inputId.startsWith('+') || inputId.includes('('))) {
                console.log(`🔥 SMS Event Router: Processing phone number ${inputId}`);
                const normalizedPhone = this.normalizePhoneNumber(inputId);
                
                // Search through contacts to find matching phone number
                if (window.app?.contactManager?.contacts) {
                    for (const [contactId, contact] of window.app.contactManager.contacts) {
                        if (contact.phoneNumber) {
                            const contactNormalizedPhone = this.normalizePhoneNumber(contact.phoneNumber);
                            if (contactNormalizedPhone === normalizedPhone) {
                                console.log(`🔥 SMS Event Router: Mapped ${inputId} to contact ${contactId}`);
                                return contactId;
                            }
                        }
                    }
                }
                
                // If no contact found, try the SMS Simple Core mapping
                if (window.app?.smsSimpleCore?.contactIdMapping) {
                    const mappedContactId = window.app.smsSimpleCore.contactIdMapping.get(normalizedPhone);
                    if (mappedContactId) {
                        console.log(`🔥 SMS Event Router: Found mapping ${inputId} -> ${mappedContactId} in Simple Core`);
                        return mappedContactId;
                    }
                }
            }

            console.log(`🔥 SMS Event Router: No mapping found for ${inputId}, returning as-is`);
            return inputId;
        }

        /**
         * Set up real-time event listeners for push-style updates (per expert recommendation)
         */
        setupRealTimeEventListeners() {
            console.log('🔄 Setting up real-time SMS event listeners...');
            
            // Listen for SMS screen refresh events
            window.addEventListener('sms-screen-refresh', (event) => {
                const { contactId, reason, messageText } = event.detail;
                console.log(`🚨 SMS SCREEN REFRESH EVENT: Contact ${contactId}, Reason: ${reason}`);
                
                if (messageText) {
                    console.log(`📱 Message content: "${messageText}"`);
                }
                
                // Force fresh conversation load with bypassed throttling
                if (window.app?.smsIntegrationManager) {
                    console.log(`🔄 Force refreshing conversation for contact ${contactId}`);
                    window.app.smsIntegrationManager.getConversation(contactId, true);
                } else if (window.app?.smsChannelManager) {
                    console.log(`🔄 Fallback: Using channel manager for contact ${contactId}`);
                    window.app.smsChannelManager.loadConversation(contactId, null, null, true);
                }
            });
            
            // Listen for custom message events that might trigger updates
            window.addEventListener('sms-message-sent', (event) => {
                const { contactId } = event.detail;
                console.log(`📤 SMS MESSAGE SENT EVENT: Contact ${contactId}`);
                
                // Dispatch refresh event
                window.dispatchEvent(new CustomEvent('sms-screen-refresh', { 
                    detail: { contactId, reason: 'custom_message_sent' } 
                }));
            });
            
            window.addEventListener('sms-message-received', (event) => {
                const { contactId, messageText } = event.detail;
                console.log(`📥 SMS MESSAGE RECEIVED EVENT: Contact ${contactId}`);
                
                // Dispatch refresh event
                window.dispatchEvent(new CustomEvent('sms-screen-refresh', { 
                    detail: { contactId, reason: 'custom_message_received', messageText } 
                }));
            });
            
            // EXPERT FIX #3: Add listener for sms-new-message events as recommended
            window.addEventListener('sms-new-message', (event) => {
                const { contactId, message } = event.detail;
                console.log(`📥 EXPERT FIX #3: SMS NEW MESSAGE EVENT: Contact ${contactId}`);
                console.log(`📱 EXPERT FIX #3: Real-time message injected: ${message?.text || 'N/A'}`);
                
                if (window.app?.contactManager?.contacts) {
                    const contact = this.findContactByIdOrPhone(contactId);
                    if (contact?.smsScreen?.isVisible) {
                        console.log(`📱 EXPERT FIX #3: Appending message to visible SMS screen`);
                        
                        // EXPERT FIX #3: Direct message injection as recommended
                        if (contact.smsScreen.appendMessage && message) {
                            contact.smsScreen.appendMessage(message);
                            console.log(`✅ EXPERT FIX #3: Message appended directly`);
                        }
                        
                        // EXPERT FIX #3: Scroll to bottom
                        if (contact.smsScreen.scrollToBottom) {
                            contact.smsScreen.scrollToBottom();
                            console.log(`✅ EXPERT FIX #3: Scrolled to bottom`);
                        }
                        
                        // EXPERT FIX #3: Force render bypass
                        if (typeof window.smsForceRenderNow === 'function') {
                            window.smsForceRenderNow(contactId);
                            console.log(`✅ EXPERT FIX #3: Forced render bypass`);
                        }
                    }
                }
            });

            // CRITICAL: Listen for ContentObserver events from Flutter
            window.addEventListener('flutter-sms-data', (event) => {
                const data = event.detail;
                console.log('🔥 SMS Event Router: flutter-sms-data event received:', data);
                
                // Handle real-time message events (incoming/outgoing)
                if (data.action === 'outgoing_message' || data.action === 'incoming_message') {
                    console.log(`🔥 SMS Event Router: ${data.action} event for contact ${data.contactId}`);
                    
                    // Resolve contact ID (phone number to contact ID mapping)
                    const resolvedContactId = this.resolveContactId(data.contactId);
                    console.log(`🔥 SMS Event Router: Resolved ${data.contactId} to ${resolvedContactId}`);
                    
                    // Trigger real-time update
                    if (data.message) {
                        this.handleRealtimeMessageUpdate(resolvedContactId, [data.message], data.action);
                    }
                    
                    // Force conversation refresh
                    setTimeout(() => {
                        if (window.app?.smsIntegrationManager) {
                            console.log(`🔄 Force refreshing conversation for ${resolvedContactId} after ${data.action}`);
                            window.app.smsIntegrationManager.getConversation(resolvedContactId, true);
                        }
                    }, 100);
                    
                    // Trigger alert for incoming messages
                    if (data.action === 'incoming_message' && window.ContactAlertManager) {
                        window.ContactAlertManager.addAlert(resolvedContactId, {
                            type: 'sms',
                            message: data.message?.text || 'New message',
                            timestamp: Date.now()
                        });
                    }
                }
            });
            
            console.log('✅ Real-time SMS event listeners ready');
        }

        /**
         * Initialize ContactAlertManager integration for real-time SMS notifications
         * This was lost during file recovery - adding it back
         */
        initializeContactAlertManager() {
            console.log('📱 Initializing ContactAlertManager integration...');
            
            // Create ContactAlertManager if it doesn't exist
            if (!window.ContactAlertManager) {
                window.ContactAlertManager = {
                    alerts: new Map(),
                    addAlert: function(contactId, alertData) {
                        this.alerts.set(contactId, alertData);
                        console.log(`📱 ContactAlert added for ${contactId}:`, alertData);
                    },
                    removeAlert: function(contactId) {
                        this.alerts.delete(contactId);
                        console.log(`📱 ContactAlert removed for ${contactId}`);
                    },
                    getAlert: function(contactId) {
                        return this.alerts.get(contactId);
                    }
                };
            }
            
            // Set up real-time event listeners for ContactAlertManager
            window.addEventListener('sms-new-message', (event) => {
                const { contactId, message } = event.detail;
                console.log(`📱 ContactAlertManager: New message event for ${contactId}`, message);
                
                // Add alert for new message
                window.ContactAlertManager.addAlert(contactId, {
                    type: 'new_message',
                    message: message,
                    timestamp: Date.now()
                });
                
                // Trigger real-time message update
                const contact = window.app?.contactManager?.contacts?.get(contactId);
                if (contact?.smsScreen?.isVisible) {
                    console.log(`📱 ContactAlertManager: Triggering real-time update for visible screen`);
                    this.handleRealtimeMessageUpdate(contactId, [message], 'incoming_message');
                }
            });
            
            window.addEventListener('sms-message-sent', (event) => {
                const { contactId, message } = event.detail;
                console.log(`📱 ContactAlertManager: Message sent event for ${contactId}`, message);
                
                // Trigger real-time message update for sent messages
                const contact = window.app?.contactManager?.contacts?.get(contactId);
                if (contact?.smsScreen?.isVisible) {
                    console.log(`📱 ContactAlertManager: Triggering real-time update for sent message`);
                    this.handleRealtimeMessageUpdate(contactId, [message], 'message_sent');
                }
            });
            
            console.log('✅ ContactAlertManager integration initialized');
        }

        /**
         * Add direct update methods to bypass complex event routing
         */
        addDirectUpdateMethods() {
            console.log('📱 Adding direct SMS update methods...');
            
            // ULTRA-MINIMAL SMS DIRECT UPDATE - Based on working debug script
            window.smsDirectUpdate = () => {
                console.log('🎯 DIRECT UI UPDATE - Bypassing all event systems');
                
                // Find the current SMS contact and screen
                let smsContact = null;
                let smsScreen = null;
                
                if (window.app?.contactManager?.contacts) {
                    for (const [contactId, contact] of window.app.contactManager.contacts) {
                        if (contact?.smsScreen?.isVisible) {
                            smsContact = contactId;
                            smsScreen = contact.smsScreen;
                            console.log(`📱 Found SMS screen for contact: ${contactId}`);
                            break;
                        }
                    }
                }
                
                if (!smsScreen) {
                    console.log('❌ No visible SMS screen found');
                    return;
                }
                
                // Get messages directly from Flutter backend
                if (window.app?.smsIntegrationManager) {
                    console.log('📞 Getting fresh messages from Flutter...');
                    window.app.smsIntegrationManager.getConversation(smsContact, true);
                }
                
                // Wait for Flutter response, then force UI update
                setTimeout(() => {
                    const eventRouter = window.app?.smsChannelManager?.eventRouter;
                    const storedMessages = eventRouter?.lastConversationState?.get(smsContact) || [];
                    
                    console.log(`💾 Found ${storedMessages.length} stored messages`);
                    
                    if (storedMessages.length > 0) {
                        console.log('🔄 Force updating SMS screen...');
                        
                        // Direct UI updates
                        if (smsScreen.updateMessages) {
                            smsScreen.updateMessages(storedMessages);
                            console.log('✅ updateMessages called');
                        }
                        
                        if (smsScreen.renderInterface) {
                            smsScreen.renderInterface();
                            console.log('✅ renderInterface called');
                        }
                        
                        if (smsScreen.render) {
                            smsScreen.render();
                            console.log('✅ render called');
                        }
                        
                        // Force Three.js texture update
                        if (smsScreen.texture) {
                            smsScreen.texture.needsUpdate = true;
                            console.log('✅ texture update forced');
                        }
                        
                        console.log('🎉 Direct UI update complete!');
                    } else {
                        console.log('⚠️ No messages in stored state, trying emergency bypass...');
                        
                        // Emergency: Force conversation state reset and try again
                        if (eventRouter?.lastConversationState) {
                            eventRouter.lastConversationState.delete(smsContact);
                            console.log('🗑️ Cleared conversation state, retrying...');
                            
                            setTimeout(() => {
                                window.app.smsIntegrationManager.getConversation(smsContact, true);
                            }, 100);
                        }
                    }
                }, 1000);
            };
            
            window.smsKillAllListeners = () => {
                console.log('☠️ KILLING ALL EXCESSIVE LISTENERS...');
                this.stopAllMonitoring();
                
                // Turn off debug mode
                this.debugMode = false;
                console.log('✅ Debug mode OFF');
                
                // Clear all excessive state tracking
                if (this.lastScreenUpdate) {
                    this.lastScreenUpdate.clear();
                    console.log('✅ Cleared screen update tracking');
                }
                
                // Stop auto-refresh monitoring
                if (this.autoRefreshInterval) {
                    clearInterval(this.autoRefreshInterval);
                    this.autoRefreshInterval = null;
                    console.log('✅ Auto-refresh monitoring stopped');
                }
                
                console.log('💀 All excessive listeners killed');
            };
            
            // Add method to stop auto-refresh
            window.smsStopAutoRefresh = () => {
                if (this.autoRefreshInterval) {
                    clearInterval(this.autoRefreshInterval);
                    this.autoRefreshInterval = null;
                    console.log('🛑 Auto-refresh monitoring stopped');
                } else {
                    console.log('ℹ️ Auto-refresh monitoring was not running');
                }
            };
            
            window.smsQuickFix = () => {
                console.log('⚡ QUICK FIX - Kill listeners then direct update');
                window.smsKillAllListeners();
                setTimeout(() => {
                    window.smsDirectUpdate();
                }, 500);
            };
            
            // DISABLED AUTO-FIX - it was interfering with normal operation
            // setTimeout(() => {
            //     console.log('🚀 Auto-running SMS quick fix...');
            //     window.smsQuickFix();
            // }, 2000);
            
            // Create an enhanced manual SMS refresh that works immediately
            window.smsForceRefresh = () => {
                console.log('🔄 SMS FORCE REFRESH - Manual override');
                
                // Find active SMS contact
                let activeContactId = null;
                let smsScreen = null;
                
                if (window.app?.contactManager?.contacts) {
                    for (const [contactId, contact] of window.app.contactManager.contacts) {
                        if (contact?.smsScreen?.isVisible) {
                            activeContactId = contactId;
                            smsScreen = contact.smsScreen;
                            console.log(`📱 Found active SMS screen for contact: ${contactId}`);
                            break;
                        }
                    }
                }
                
                if (!activeContactId) {
                    console.log('❌ No active SMS screen found');
                    return;
                }
                
                // Clear any stale conversation state
                if (this.lastConversationState) {
                    this.lastConversationState.delete(activeContactId);
                    console.log('🗑️ Cleared stale conversation state');
                }
                
                // Force fresh data fetch from Flutter
                if (window.app?.smsIntegrationManager) {
                    console.log('📞 Forcing fresh conversation fetch...');
                    window.app.smsIntegrationManager.getConversation(activeContactId, true);
                    
                    // Wait briefly then check for fresh data
                    setTimeout(() => {
                        const freshMessages = this.lastConversationState?.get(activeContactId) || [];
                        console.log(`💾 Fresh messages retrieved: ${freshMessages.length}`);
                        
                        if (freshMessages.length > 0 && smsScreen) {
                            console.log('✅ Updating SMS screen with fresh messages');
                            smsScreen.updateMessages(freshMessages);
                            smsScreen.renderInterface();
                            if (smsScreen.texture) {
                                smsScreen.texture.needsUpdate = true;
                            }
                        }
                    }, 500);
                }
            };
            
            // CRITICAL: Add real-time message monitoring that triggers immediate conversation refresh
            window.smsAutoRefresh = () => {
                console.log('🔄 AUTO SMS REFRESH - Monitoring for real-time updates');
                
                if (this.autoRefreshInterval) {
                    clearInterval(this.autoRefreshInterval);
                }
                
                this.autoRefreshInterval = setInterval(() => {
                    // Find active SMS contact
                    let activeContactId = null;
                    let smsScreen = null;
                    
                    if (window.app?.contactManager?.contacts) {
                        for (const [contactId, contact] of window.app.contactManager.contacts) {
                            if (contact?.smsScreen?.isVisible) {
                                activeContactId = contactId;
                                smsScreen = contact.smsScreen;
                                break;
                            }
                        }
                    }
                    
                    if (activeContactId && window.app?.smsIntegrationManager) {
                        console.log(`🔄 Auto-refreshing conversation for contact ${activeContactId}`);
                        
                        // Get current messages for detailed comparison
                        const currentMessages = this.lastConversationState?.get(activeContactId) || [];
                        const currentCount = currentMessages.length;
                        
                        // ENHANCED: Create comprehensive fingerprint of ALL messages (per expert recommendation)
                        const currentFingerprint = this.createMessagesFingerprint(currentMessages);
                        
                        // Clear conversation state to force fresh data from Flutter
                        this.lastConversationState?.delete(activeContactId);
                        
                        // Force fresh fetch
                        window.app.smsIntegrationManager.getConversation(activeContactId, true);
                        
                        // Check for changes after a brief delay
                        setTimeout(() => {
                            const newMessages = this.lastConversationState?.get(activeContactId) || [];
                            const newCount = newMessages.length;
                            
                            // ENHANCED: Create comprehensive fingerprint of new messages
                            const newFingerprint = this.createMessagesFingerprint(newMessages);
                            
                            // ENHANCED: Check for content changes, not just counts (per expert recommendation)
                            if (this.hasNewMessages(newMessages, currentMessages)) {
                                console.log(`🚨 DETECTED MESSAGE CHANGES!`);
                                console.log(`📊 Count: ${currentCount} → ${newCount}`);
                                console.log(`🔍 Fingerprint: ${currentFingerprint.substring(0, 50)}... → ${newFingerprint.substring(0, 50)}...`);
                                
                                if (smsScreen && newMessages.length > 0) {
                                    console.log(`📱 Updating SMS screen with ${newMessages.length} fresh messages`);
                                    smsScreen.updateMessages(newMessages);
                                    smsScreen.renderInterface();
                                    if (smsScreen.texture) {
                                        smsScreen.texture.needsUpdate = true;
                                    }
                                    
                                    // Log the newest message for debugging
                                    if (newMessages[0]) {
                                        console.log(`📱 Newest message: "${newMessages[0].text}" at ${new Date(newMessages[0].timestamp).toLocaleTimeString()}`);
                                    }
                                }
                            } else {
                                console.log(`✅ No changes detected - fingerprint remains: ${currentFingerprint.substring(0, 50)}...`);
                            }
                        }, 500);
                    }
                }, 1500); // Check every 1.5 seconds for faster detection - DISABLED TO PREVENT INFINITE LOOP
                
                console.log('✅ Auto-refresh monitoring configured but DISABLED to prevent infinite loop');
            };
            
            // Auto-start real-time monitoring - DISABLED TO PREVENT INFINITE LOOP
            // setTimeout(() => {
            //     console.log('🚀 Auto-starting real-time SMS monitoring...');
            //     window.smsAutoRefresh();
            // }, 3000);
            
            console.log('📱 SMS Event Router initialized with manual refresh: window.smsForceRefresh()');
            // EXPERT FIX #2: Ultra-aggressive render bypass for throttled renderInterface
            window.smsForceRenderNow = (contactId) => {
                console.error('🚨 EXPERT FIX #2: FORCE RENDER NOW - Bypassing ALL throttling');
                
                if (!contactId) {
                    // Find active contact
                    if (window.app?.contactManager?.contacts) {
                        for (const [id, contact] of window.app.contactManager.contacts) {
                            if (contact?.smsScreen?.isVisible) {
                                contactId = id;
                                break;
                            }
                        }
                    }
                }
                
                if (contactId && window.app?.contactManager?.contacts) {
                    const contact = window.app.contactManager.contacts.get(contactId);
                    if (contact?.smsScreen) {
                        console.error(`🚨 EXPERT FIX #2: Clearing ALL throttling for contact ${contactId}`);
                        
                        // EXPERT FIX #2: Completely disable ALL throttling mechanisms
                        contact.smsScreen.lastRenderTime = 0;
                        contact.smsScreen.renderThrottleMs = 0;  // Set to 0 to disable
                        contact.smsScreen.renderThrottleDelay = 0;
                        contact.smsScreen.isRendering = false;  // Reset rendering flag
                        
                        if (contact.smsScreen.renderThrottleTimeout) {
                            clearTimeout(contact.smsScreen.renderThrottleTimeout);
                            contact.smsScreen.renderThrottleTimeout = null;
                        }
                        
                        // EXPERT FIX #2: Force immediate render multiple times if needed
                        console.error(`🚨 EXPERT FIX #2: Forcing immediate render with bypass flag`);
                        contact.smsScreen.renderInterface(true);
                        
                        // EXPERT FIX #2: Try again after a tiny delay to ensure it takes
                        setTimeout(() => {
                            contact.smsScreen.renderInterface(true);
                            console.error(`🚨 EXPERT FIX #2: Secondary render completed`);
                        }, 10);
                        
                        // Update texture
                        if (contact.smsScreen.texture) {
                            contact.smsScreen.texture.needsUpdate = true;
                        }
                        
                        console.error(`🚨 EXPERT FIX #2: All throttling bypassed for contact ${contactId}`);
                    }
                }
            };
            
            console.log('📱 Available SMS functions: smsForceRefresh(), smsAutoRefresh(), smsStopAutoRefresh(), smsDirectUpdate(), smsKillAllListeners(), smsDebugMessages(), smsForceRenderNow(), smsExpertTest()');
            
            // EXPERT RECOMMENDED: Consolidated test function
            window.smsExpertTest = (contactId) => {
                console.error('🧪 EXPERT TEST: Running comprehensive SMS fix validation');
                
                if (!contactId) {
                    // Find active contact
                    if (window.app?.contactManager?.contacts) {
                        for (const [id, contact] of window.app.contactManager.contacts) {
                            if (contact?.smsScreen?.isVisible) {
                                contactId = id;
                                break;
                            }
                        }
                    }
                }
                
                if (!contactId) {
                    console.error('❌ EXPERT TEST: No active SMS contact found');
                    return;
                }
                
                console.error(`🧪 EXPERT TEST: Testing fixes for contact ${contactId}`);
                
                // Test 1: Fingerprint system
                console.error('🧪 TEST 1: Fingerprint system validation');
                const testMessages = [
                    { id: 1, text: 'Test message 1', timestamp: Date.now() },
                    { id: 2, text: 'Test message 2', timestamp: Date.now() + 1000 }
                ];
                const fp1 = this.createMessagesFingerprint(testMessages);
                const fp2 = this.createMessagesFingerprint([...testMessages, { id: 3, text: 'New message', timestamp: Date.now() + 2000 }]);
                console.error(`🔍 Fingerprint 1: ${fp1.substring(0, 50)}...`);
                console.error(`🔍 Fingerprint 2: ${fp2.substring(0, 50)}...`);
                console.error(`✅ Fingerprints different: ${fp1 !== fp2}`);
                
                // Test 2: Throttling bypass
                console.error('🧪 TEST 2: Throttling bypass validation');
                if (typeof window.smsForceRenderNow === 'function') {
                    window.smsForceRenderNow(contactId);
                    console.error('✅ smsForceRenderNow executed');
                } else {
                    console.error('❌ smsForceRenderNow not available');
                }
                
                // Test 3: Event listener verification
                console.error('🧪 TEST 3: Event listener verification');
                window.dispatchEvent(new CustomEvent('sms-new-message', { 
                    detail: { 
                        contactId, 
                        message: {
                            id: Date.now(),
                            text: 'Expert test message',
                            timestamp: Date.now(),
                            type: 'received'
                        }
                    } 
                }));
                console.error('✅ sms-new-message event dispatched');
                
                // Test 4: Direct conversation refresh
                console.error('🧪 TEST 4: Direct conversation refresh');
                if (window.app?.smsIntegrationManager) {
                    window.app.smsIntegrationManager.getConversation(contactId, true);
                    console.error('✅ Direct conversation refresh triggered');
                } else {
                    console.error('❌ SMS integration manager not available');
                }
                
                console.error('🧪 EXPERT TEST: All tests completed - check console for results');
            };
            
            // ENHANCED: Add debug function to see what's happening with your messages
            window.smsDebugMessages = () => {
                console.log('🔍 ===== SMS MESSAGE DEBUG =====');
                
                // Find active SMS contact
                let activeContactId = null;
                let smsScreen = null;
                
                if (window.app?.contactManager?.contacts) {
                    for (const [contactId, contact] of window.app.contactManager.contacts) {
                        if (contact?.smsScreen?.isVisible) {
                            activeContactId = contactId;
                            smsScreen = contact.smsScreen;
                            break;
                        }
                    }
                }
                
                if (!activeContactId) {
                    console.log('❌ No active SMS screen found');
                    return;
                }
                
                console.log(`📱 Active SMS contact: ${activeContactId}`);
                
                // Check conversation state
                const storedMessages = this.lastConversationState?.get(activeContactId) || [];
                console.log(`💾 Stored messages: ${storedMessages.length}`);
                
                if (storedMessages.length > 0) {
                    console.log('📄 Recent messages:');
                    storedMessages.slice(0, 5).forEach((msg, index) => {
                        const timeStr = new Date(msg.timestamp).toLocaleTimeString();
                        console.log(`  ${index + 1}. [${timeStr}] ${msg.type}: "${msg.text}"`);
                    });
                    
                    // Check for your specific test messages
                    const testMessages = storedMessages.filter(msg => 
                        msg.text && (msg.text.includes('1122') || msg.text.includes('test'))
                    );
                    
                    if (testMessages.length > 0) {
                        console.log(`🎯 Found ${testMessages.length} test messages:`, testMessages);
                    } else {
                        console.log('⚠️ No test messages found in stored data');
                    }
                    
                    // Show fingerprint
                    const fingerprint = this.createMessagesFingerprint(storedMessages);
                    console.log(`🔍 Current fingerprint: ${fingerprint.substring(0, 100)}...`);
                } else {
                    console.log('💾 No stored messages found');
                }
                
                // Force fresh fetch to see if backend has different data
                console.log('🔄 Forcing fresh fetch from Flutter...');
                if (window.app?.smsIntegrationManager) {
                    window.app.smsIntegrationManager.getConversation(activeContactId, true);
                    
                    setTimeout(() => {
                        const freshMessages = this.lastConversationState?.get(activeContactId) || [];
                        console.log(`📡 Fresh from Flutter: ${freshMessages.length} messages`);
                        
                        if (freshMessages.length > 0) {
                            const freshTestMessages = freshMessages.filter(msg => 
                                msg.text && (msg.text.includes('1122') || msg.text.includes('test'))
                            );
                            
                            if (freshTestMessages.length > 0) {
                                console.log(`🎯 Fresh test messages found:`, freshTestMessages);
                            } else {
                                console.log('⚠️ No test messages in fresh data either');
                            }
                        }
                        
                        console.log('🔍 ===== DEBUG COMPLETE =====');
                    }, 1000);
                }
            };
        }

        /**
         * Create a comprehensive fingerprint for message arrays (per expert recommendation)
         * This catches content changes even when array length stays the same
         */
        createMessagesFingerprint(messages) {
            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                return 'empty';
            }
            
            // EXPERT FIX #1: Create robust individual fingerprints for each message
            const fingerprints = messages.map(msg => {
                if (!msg) return 'null-message';
                
                // Use multiple fallback approaches for robust fingerprint creation
                const id = msg.id || msg.messageId || msg._id || 'no-id';
                const timestamp = msg.timestamp || msg.time || msg.date || msg.created || Date.now();
                const body = (msg.text || msg.body || msg.message || msg.content || 'no-body').substring(0, 50);
                const type = msg.type || msg.messageType || 'no-type';
                const direction = msg.direction || msg.isFromUser || 'no-direction';
                
                return `${id}_${timestamp}_${body}_${type}_${direction}`;
            });
            
            // EXPERT FIX #1: Include array length to detect additions/removals
            const combinedFingerprint = `${messages.length}:${fingerprints.join('|')}`;
            
            // EXPERT DEBUG: Log when we're creating fingerprints
            if (messages.length > 0) {
                console.log(`🔍 EXPERT DEBUG: Created fingerprint for ${messages.length} messages: ${combinedFingerprint.substring(0, 100)}...`);
            }
            
            return combinedFingerprint;
        }
        
        /**
         * Create a fingerprint for a single message
         */
        createMessageFingerprint(msg) {
            if (!msg) return 'null';
            
            // Include messageId, timestamp, and body content for complete detection
            const id = msg.id || msg.messageId || 'no-id';
            const timestamp = msg.timestamp || msg.time || 'no-time';
            const body = msg.text || msg.body || msg.message || 'no-body';
            const type = msg.type || 'no-type';
            
            return `${id}_${timestamp}_${body.substring(0, 50)}_${type}`;
        }
        
        /**
         * Enhanced message comparison using fingerprints (per expert recommendation)
         * Detects changes even in fixed-size arrays
         */
        hasNewMessages(currentMessages, previousMessages) {
            // EXPERT FIX #1: Handle undefined/null fingerprints correctly
            if (!currentMessages && !previousMessages) {
                console.log(`📱 Both message arrays are empty/null - no changes`);
                return false;
            }
            
            if (!previousMessages || previousMessages.length === 0) {
                console.error(`🔍 EXPERT FIX: No previous messages, treating as NEW MESSAGES`);
                return currentMessages && currentMessages.length > 0;
            }
            
            if (!currentMessages || currentMessages.length === 0) {
                console.error(`🔍 EXPERT FIX: Current messages empty but previous had ${previousMessages.length} - treating as change`);
                return true;
            }
            
            const currentFingerprint = this.createMessagesFingerprint(currentMessages);
            const previousFingerprint = this.createMessagesFingerprint(previousMessages);
            
            // EXPERT FIX #1: Never allow "empty" fingerprints to pass as no-change
            if (currentFingerprint === 'empty' && previousFingerprint === 'empty') {
                console.error(`🚨 EXPERT FIX: Both fingerprints are 'empty' but messages exist - FORCING CHANGE DETECTION`);
                console.error(`📱 Current messages count: ${currentMessages.length}`);
                console.error(`📱 Previous messages count: ${previousMessages.length}`);
                // Force change detection if we have actual messages but empty fingerprints
                return currentMessages.length > 0 || previousMessages.length > 0;
            }
            
            const hasChanges = currentFingerprint !== previousFingerprint;
            
            if (hasChanges) {
                console.error(`🔍 FINGERPRINT CHANGE DETECTED:`);
                console.error(`📱 Previous: ${previousFingerprint.substring(0, 100)}...`);
                console.error(`📱 Current:  ${currentFingerprint.substring(0, 100)}...`);
            } else {
                console.error(`❌ NO FINGERPRINT CHANGES - Previous: ${previousFingerprint.substring(0, 50)}... Current: ${currentFingerprint.substring(0, 50)}...`);
                // EXPERT FIX #1: Add verbose logging when fingerprints don't match
                if (currentMessages.length !== previousMessages.length) {
                    console.error(`🚨 EXPERT DEBUG: Message count changed (${previousMessages.length} → ${currentMessages.length}) but fingerprints identical!`);
                }
            }
            
            return hasChanges;
        }

        /**
         * Stop all monitoring to prevent infinite loops
         */
        stopAllMonitoring() {
            // Kill conversation monitoring
            if (this.conversationMonitorInterval) {
                clearInterval(this.conversationMonitorInterval);
                this.conversationMonitorInterval = null;
                console.log('🔪 Conversation monitoring stopped');
            }
            
            // Clear any other intervals/timeouts
            if (this.updateTimeout) {
                clearTimeout(this.updateTimeout);
                this.updateTimeout = null;
            }
            
            // Stop text input monitoring via integrationManager
            if (this.integrationManager && this.integrationManager.inputManager) {
                const inputManager = this.integrationManager.inputManager;
                if (inputManager.textMonitoringInterval) {
                    clearInterval(inputManager.textMonitoringInterval);
                    inputManager.textMonitoringInterval = null;
                    console.log('🔪 Text input monitoring stopped');
                }
                // Disable renderInputActive to prevent restart
                inputManager.renderInputActive = false;
                console.log('🔪 Input rendering disabled');
            }
            
            // Also try to find and stop any global text monitoring intervals
            if (window.smsIntegrationManager) {
                const integrationManager = window.smsIntegrationManager;
                if (integrationManager.inputManager && integrationManager.inputManager.textMonitoringInterval) {
                    clearInterval(integrationManager.inputManager.textMonitoringInterval);
                    integrationManager.inputManager.textMonitoringInterval = null;
                    integrationManager.inputManager.renderInputActive = false;
                    console.log('🔪 Global text input monitoring stopped');
                }
            }
            
            // Reset state tracking
            this.lastScreenUpdate = 0;
            this.isMonitoring = false;
        }

        /**
         * Initialize default event handlers
         */
        initializeDefaultHandlers() {
            // Input event handlers
            this.inputEventHandlers.set('keyboard_shown', (response) => {
                this.log('📱 Keyboard shown event');
                this.channelManager.notifyKeyboardState(true);
            });

            this.inputEventHandlers.set('keyboard_hidden', (response) => {
                this.log('📱 Keyboard hidden event');
                this.channelManager.notifyKeyboardState(false);
            });

            this.inputEventHandlers.set('text_input', (response) => {
                this.log('📱 Text input event', { textLength: response.text?.length || 0 });
                this.channelManager.notifyTextInput(response.text, response.contactId);
            });

            // Data event handlers
            this.dataEventHandlers.set('message_sent', (response) => {
                console.warn('🚨 MESSAGE_SENT DATA EVENT HANDLER TRIGGERED! 🚨', response);
                this.log('📱 Message sent event');
                this.channelManager.notifyMessageSent(response);
                
                // CRITICAL: Mark this as a real-time sent message update for throttle bypass
                const contactId = response.contactId;
                if (contactId) {
                    if (!this.realtimeUpdateContext) {
                        this.realtimeUpdateContext = new Map();
                    }
                    this.realtimeUpdateContext.set(contactId, {
                        type: 'message_sent',
                        timestamp: Date.now(),
                        reason: 'message_sent_data_event'
                    });
                    console.log(`🚨 MARKED REAL-TIME CONTEXT for contact ${contactId}: message_sent (DATA event)`);
                    
                    // Force conversation refresh to get updated data including the sent message
                    if (window.app?.smsIntegrationManager) {
                        console.log(`🔄 Triggering conversation refresh for contact ${contactId} after message sent`);
                        window.app.smsIntegrationManager.getConversation(contactId, true);
                    }
                }
            });

            this.dataEventHandlers.set('message_received', (response) => {
                // HIGH VISIBILITY: This handler is being called
                console.warn('🚨 MESSAGE_RECEIVED EVENT HANDLER TRIGGERED! 🚨', response);
                this.log('📱 🔔 INCOMING MESSAGE EVENT RECEIVED!', response, 'warn');
                
                const contactId = response.contactId;
                const messageText = response.text || 'N/A';
                const messageType = response.type || 'N/A';
                const phoneNumber = response.phoneNumber || response.phone || response.from || 'N/A';
                
                console.warn(`📱 🔔 Message Details: Contact=${contactId}, Phone=${phoneNumber}, Text="${messageText}", Type=${messageType}`);
                
                // CRITICAL: Mark this contact as having new message activity to bypass throttling
                if (contactId && window.app?.smsChannelManager) {
                    window.app.smsChannelManager.markNewMessageActivity(contactId, 'received');
                }
                
                // CRITICAL FIX: Clear conversation state to force fingerprint change detection
                if (contactId && this.lastConversationState) {
                    console.error(`🚨 CRITICAL: Clearing conversation state for contact ${contactId} to force fresh detection`);
                    this.lastConversationState.delete(contactId);
                }
                
                // ENHANCED DARCIE TEST DEBUGGING
                const isDarcieMessage = (phoneNumber && phoneNumber.includes('224') && (phoneNumber.includes('440') || phoneNumber.includes('5082'))) ||
                                       (contactId && contactId.toString().toLowerCase().includes('darcie'));
                
                if (isDarcieMessage) {
                    console.error('🎯🎯🎯 DARCIE TEST MESSAGE_RECEIVED HANDLER TRIGGERED! 🎯🎯🎯');
                    console.error('📱 DARCIE Full Response Object:', JSON.stringify(response, null, 2));
                    console.error('📱 DARCIE Contact ID Type:', typeof contactId);
                    console.error('📱 DARCIE Phone Number Type:', typeof phoneNumber);
                    console.error('📱 DARCIE Message Text:', messageText);
                    
                    // Check if this contact exists in our contact manager
                    if (window.app?.contactManager?.contacts) {
                        const contact = window.app.contactManager.contacts.get(contactId);
                        console.error('📱 DARCIE Contact Found in Manager:', !!contact);
                        if (contact) {
                            console.error('📱 DARCIE Contact Data:', contact.contactData);
                            console.error('📱 DARCIE SMS Screen Exists:', !!contact.smsScreen);
                            console.error('📱 DARCIE SMS Screen Visible:', contact.smsScreen?.isVisible);
                        }
                    }
                }
                
                if (contactId && window.app?.smsIntegrationManager) {
                    this.log(`📱 🔔 Triggering conversation refresh for contact ${contactId} after receiving message: "${messageText}"`, null, 'warn');
                    
                    if (isDarcieMessage) {
                        console.error('🎯 DARCIE: About to call getConversation for contactId:', contactId);
                    }
                    
                    // ENHANCED: Dispatch real-time refresh event (per expert recommendation)
                    console.log(`🔄 Dispatching sms-screen-refresh event for contact ${contactId}`);
                    window.dispatchEvent(new CustomEvent('sms-screen-refresh', { 
                        detail: { contactId, reason: 'message_received', messageText } 
                    }));
                    
                    // EXPERT FIX #3: Dispatch sms-new-message event for direct UI listener
                    console.log(`📥 EXPERT FIX #3: Dispatching sms-new-message event for contact ${contactId}`);
                    window.dispatchEvent(new CustomEvent('sms-new-message', { 
                        detail: { 
                            contactId, 
                            message: {
                                id: response.id || response.messageId || Date.now(),
                                text: messageText,
                                timestamp: response.timestamp || Date.now(),
                                type: messageType,
                                phoneNumber: phoneNumber
                            }
                        } 
                    }));
                    
                    // ENHANCED: Force refresh with bypassed throttling
                    window.app.smsIntegrationManager.getConversation(contactId, true);
                    
                    // CRITICAL: Mark this as a real-time incoming message update for throttle bypass
                    if (!this.realtimeUpdateContext) {
                        this.realtimeUpdateContext = new Map();
                    }
                    this.realtimeUpdateContext.set(contactId, {
                        type: 'incoming_message',
                        timestamp: Date.now(),
                        reason: 'message_received_event'
                    });
                    console.log(`🚨 MARKED REAL-TIME CONTEXT for contact ${contactId}: incoming_message`);
                    
                    // CRITICAL: Also force immediate render to bypass throttling
                    setTimeout(() => {
                        if (typeof window.smsForceRenderNow === 'function') {
                            window.smsForceRenderNow(contactId);
                        }
                    }, 200);
                    
                    // CRITICAL: Force direct UI update after a short delay to ensure real-time display
                    setTimeout(() => {
                        this.forceDirectUIUpdate(contactId);
                        
                        // ADDITIONAL FIX: Force bypass throttling for received messages
                        if (window.app?.contactManager?.contacts) {
                            const contact = window.app.contactManager.contacts.get(contactId);
                            if (contact?.smsScreen) {
                                console.error(`🚨 RECEIVED MESSAGE: Forcing immediate UI update bypass for contact ${contactId}`);
                                
                                // Clear throttling timers to force immediate update
                                if (contact.smsScreen.renderThrottleTimeout) {
                                    clearTimeout(contact.smsScreen.renderThrottleTimeout);
                                    contact.smsScreen.renderThrottleTimeout = null;
                                }
                                if (contact.smsScreen.lastRenderTime) {
                                    contact.smsScreen.lastRenderTime = 0; // Reset to allow immediate render
                                }
                                
                                // Force immediate render with critical priority
                                contact.smsScreen.renderInterface(true, 'critical'); // Critical update for incoming message
                                
                                console.error(`🚨 RECEIVED MESSAGE: Forced immediate render for contact ${contactId}`);
                            }
                        }
                    }, 100); // Reduced delay for faster response
                } else if (contactId && window.app?.smsChannelManager) {
                    // Fallback if integration manager is not available
                    this.log(`📱 🔔 FALLBACK: Triggering conversation refresh via channel manager for contact ${contactId}`, null, 'warn');
                    window.app.smsChannelManager.loadConversation(contactId, null, null, true);
                    
                    // CRITICAL: Force direct UI update after a short delay
                    setTimeout(() => {
                        this.forceDirectUIUpdate(contactId);
                    }, 500);
                } else {
                    console.error('📱 🚨 MESSAGE_RECEIVED: No SMS manager available or no contactId!', { 
                        contactId, 
                        phoneNumber,
                        hasIntegrationManager: !!window.app?.smsIntegrationManager,
                        hasChannelManager: !!window.app?.smsChannelManager
                    });
                    
                    if (isDarcieMessage) {
                        console.error('🎯 DARCIE: MESSAGE_RECEIVED FAILED - No SMS manager or contactId!');
                        console.error('📱 DARCIE: Available managers:', {
                            smsIntegrationManager: !!window.app?.smsIntegrationManager,
                            smsChannelManager: !!window.app?.smsChannelManager,
                            app: !!window.app
                        });
                    }
                }
                
                // CRITICAL: Forward to SMS Core for new architecture
                try {
                    if (window.smsCore && phoneNumber && messageText) {
                        const message = {
                            id: response.messageId || response.id || Date.now().toString(),
                            phoneNumber: phoneNumber,
                            text: messageText,
                            timestamp: response.timestamp || Date.now(),
                            isOutgoing: false,
                            isRead: false,
                            status: 'received',
                            source: 'event_router'
                        };
                        
                        const success = window.smsCore.storeMessage(message);
                        console.log('📱 SMS Core message storage:', success ? '✅ Success' : '❌ Failed');
                        
                        // Update the UI if screen adapter is available
                        if (success && window.smsScreenAdapter) {
                            window.smsScreenAdapter.updateContactMessages(phoneNumber);
                        }
                    }
                } catch (error) {
                    console.error('📱 Error forwarding to SMS Core:', error);
                }
            });

            // CRITICAL FIX: Add handler for incoming_message events from Flutter
            this.dataEventHandlers.set('incoming_message', (response) => {
                console.warn('🚨 INCOMING_MESSAGE EVENT HANDLER TRIGGERED! 🚨', response);
                this.log('📱 🔔 INCOMING MESSAGE EVENT RECEIVED (Flutter format)!', response, 'warn');
                
                // Forward to message_received handler for consistent processing
                if (this.dataEventHandlers.has('message_received')) {
                    this.dataEventHandlers.get('message_received')(response);
                } else {
                    console.error('📱 ERROR: message_received handler not found!');
                }
            });

            // CRITICAL FIX: Add handler for outgoing_message events from Flutter ContentObserver
            this.dataEventHandlers.set('outgoing_message', (response) => {
                console.warn('🚨 OUTGOING_MESSAGE EVENT HANDLER TRIGGERED! 🚨', response);
                this.log('📱 📤 OUTGOING MESSAGE EVENT RECEIVED (ContentObserver)!', response, 'warn');
                
                // Forward to message_sent handler for consistent processing
                if (this.dataEventHandlers.has('message_sent')) {
                    this.dataEventHandlers.get('message_sent')(response);
                } else {
                    console.error('📱 ERROR: message_sent handler not found!');
                }
            });

            this.dataEventHandlers.set('conversation_history', (response) => {
                this.log('📱 Conversation history event');
                this.channelManager.notifyConversationHistory(response);
                
                // CRITICAL FIX: Update the SMS screen with new conversation data
                if (response.messages && Array.isArray(response.messages) && response.messages.length > 0) {
                    // Find the contact ID from the response
                    const contactId = response.contactId || response.messages[0]?.contactId;
                    
                    // CRITICAL: Store messages in conversation state for direct updates
                    if (contactId && this.lastConversationState) {
                        this.lastConversationState.set(contactId, response.messages);
                    }
                    
                    if (contactId && window.app?.contactManager?.contacts) {
                        const contact = window.app.contactManager.contacts.get(contactId);
                        if (contact?.smsScreen && contact.smsScreen.isVisible) {
                            this.log(`📱 Updating SMS screen with ${response.messages.length} messages for contact ${contactId}`);
                            
                            // CRITICAL: Check if this is a real-time update to bypass throttling
                            let updateType = 'background'; // Default
                            if (this.realtimeUpdateContext && this.realtimeUpdateContext.has(contactId)) {
                                const context = this.realtimeUpdateContext.get(contactId);
                                const timeSinceMarked = Date.now() - context.timestamp;
                                
                                // Use real-time context if marked within last 5 seconds
                                if (timeSinceMarked < 5000) {
                                    updateType = context.type; // 'incoming_message' or 'message_sent'
                                    console.log(`🚨 USING REAL-TIME CONTEXT: ${updateType} for contact ${contactId} (${timeSinceMarked}ms ago)`);
                                    
                                    // Clear the context after using it
                                    this.realtimeUpdateContext.delete(contactId);
                                } else {
                                    console.log(`⏰ Real-time context expired for contact ${contactId} (${timeSinceMarked}ms old), using background`);
                                }
                            }
                            
                            contact.smsScreen.updateMessages(response.messages, updateType);
                            
                            // CRITICAL: Force direct UI update to ensure real-time display
                            setTimeout(() => {
                                this.forceDirectUIUpdate(contactId);
                            }, 100);
                        }
                    }
                }
            });

            // Add handlers for additional conversation actions
            this.dataEventHandlers.set('loadConversation', (response) => {
                this.log('📱 Load conversation event');
                // Same logic as conversation_history
                if (response.messages && Array.isArray(response.messages) && response.messages.length > 0) {
                    const contactId = response.contactId || response.messages[0]?.contactId;
                    
                    // CRITICAL: Store messages in conversation state for direct updates
                    if (contactId && this.lastConversationState) {
                        this.lastConversationState.set(contactId, response.messages);
                    }
                    
                    if (contactId && window.app?.contactManager?.contacts) {
                        const contact = window.app.contactManager.contacts.get(contactId);
                        if (contact?.smsScreen && contact.smsScreen.isVisible) {
                            this.log(`📱 Updating SMS screen with ${response.messages.length} messages for contact ${contactId}`);
                            contact.smsScreen.updateMessages(response.messages);
                            
                            // CRITICAL: Force direct UI update to ensure real-time display
                            setTimeout(() => {
                                this.forceDirectUIUpdate(contactId);
                            }, 100);
                        }
                    }
                }
            });

            this.dataEventHandlers.set('get_conversation', (response) => {
                console.error('📱 🚨 GET_CONVERSATION HANDLER TRIGGERED (REVISED LOGIC)!');
                this.log('📱 Get conversation event', response);

                const contactId = response.contactId || response.messages?.[0]?.contactId;
                if (!contactId) {
                    console.error('📱 🚨 GET_CONVERSATION: No contactId found in response. Aborting.');
                    return;
                }

                // Step 1: Get the previous state BEFORE overwriting it.
                const lastKnownMessages = this.lastConversationState.get(contactId) || [];

                // Step 2: Check for new messages by comparing the new response with the old state.
                const hasChanges = this.hasNewMessages(response.messages, lastKnownMessages);

                // Step 3: ALWAYS update the state with the latest data from Flutter.
                this.lastConversationState.set(contactId, response.messages);
                console.log(`📱 Stored ${response.messages?.length || 0} messages in conversation state for contact ${contactId}`);

                // Step 4: ALWAYS update the UI with the fresh data.
                const contact = window.app?.contactManager?.contacts.get(contactId);
                if (contact?.smsScreen) {
                    console.log(`📱 Forcing UI update for contact ${contactId} with ${response.messages?.length || 0} messages.`);
                    if (contact.smsScreen.updateMessages) {
                        // CRITICAL: Check if this is a real-time update to bypass throttling
                        let updateType = 'background'; // Default
                        if (this.realtimeUpdateContext && this.realtimeUpdateContext.has(contactId)) {
                            const context = this.realtimeUpdateContext.get(contactId);
                            const timeSinceMarked = Date.now() - context.timestamp;
                            
                            // Use real-time context if marked within last 5 seconds
                            if (timeSinceMarked < 5000) {
                                updateType = context.type; // 'incoming_message' or 'message_sent'
                                console.log(`🚨 GET_CONVERSATION USING REAL-TIME CONTEXT: ${updateType} for contact ${contactId} (${timeSinceMarked}ms ago)`);
                                
                                // Clear the context after using it
                                this.realtimeUpdateContext.delete(contactId);
                            } else {
                                console.log(`⏰ GET_CONVERSATION Real-time context expired for contact ${contactId} (${timeSinceMarked}ms old), using background`);
                            }
                        }
                        
                        contact.smsScreen.updateMessages(response.messages, updateType);
                    }
                    // Force immediate render to bypass any throttling.
                    if (typeof window.smsForceRenderNow === 'function') {
                        window.smsForceRenderNow(contactId);
                    }
                } else {
                    this.log(`📱 No active SMS screen found for contact ${contactId} to update.`, null, 'warn');
                }

                // Step 5: If there were changes, broadcast a global event for other potential listeners.
                if (hasChanges) {
                    this.log(`📱 Broadcasting conversation update for contact ${response.contactId}`);
                    window.dispatchEvent(new CustomEvent('sms-conversation-updated', {
                        detail: { contactId: response.contactId, messages: response.messages }
                    }));
                }
            });

            // Add handler for single message events
            this.dataEventHandlers.set('new_message', (response) => {
                // HIGH VISIBILITY: This handler is being called
                console.warn('� NEW_MESSAGE EVENT HANDLER TRIGGERED! 🚨', response);
                this.log('📱 🔔 NEW MESSAGE EVENT RECEIVED!', response, 'warn');
                
                const contactId = response.contactId;
                const messageText = response.text || 'N/A';
                const messageType = response.type || 'N/A';
                
                console.warn(`📱 🔔 New Message Details: Contact=${contactId}, Text="${messageText}", Type=${messageType}`);
                
                if (contactId && window.app?.smsIntegrationManager) {
                    this.log(`📱 🔔 Triggering conversation refresh for contact ${contactId} after new message: "${messageText}"`, null, 'warn');
                    window.app.smsIntegrationManager.getConversation(contactId);
                    
                    // CRITICAL: Force direct UI update after new message
                    setTimeout(() => {
                        this.forceDirectUIUpdate(contactId);
                    }, 500);
                } else {
                    console.error('📱 🚨 NEW_MESSAGE: No SMS manager available or no contactId!', { contactId, hasIntegrationManager: !!window.app?.smsIntegrationManager });
                }
            });

            this.dataEventHandlers.set('message_update', (response) => {
                this.log('📱 Message update event', response);
                const contactId = response.contactId;
                if (contactId && window.app?.smsIntegrationManager) {
                    this.log(`📱 Triggering conversation refresh for contact ${contactId} after message update.`);
                    window.app.smsIntegrationManager.getConversation(contactId);
                }
            });

            // Status event handlers
            this.statusEventHandlers.set('connection_status', (response) => {
                this.log('📱 Connection status event', { connected: response.connected });
                this.channelManager.isFlutterConnected = response.connected;
            });

            this.statusEventHandlers.set('sms_permission', (response) => {
                this.log('📱 SMS permission event');
                this.channelManager.notifyPermissionStatus(response);
            });

            this.statusEventHandlers.set('sms_permission_denied', (response) => {
                this.log('📱 SMS permission denied event', { reason: response.reason });
                console.log('📱 SMS permissions denied:', response.reason);
                console.log('📱 INSTRUCTION:', response.instruction);
                this.channelManager.showPermissionInstructions(response.reason, response.instruction);
            });

            this.statusEventHandlers.set('message_sent_successfully', (response) => {
                this.log('📱 Message sent successfully event', response);
                const contactId = response.contactId;
                if (contactId && window.app?.smsIntegrationManager) {
                    this.log(`📱 Triggering conversation refresh for contact ${contactId} after successful send.`);
                    
                    // CRITICAL: Clear conversation state to force fresh fetch
                    if (this.lastConversationState) {
                        this.lastConversationState.delete(contactId);
                        console.log(`🗑️ Cleared conversation state for contact ${contactId} after message sent`);
                    }
                    
                    // ENHANCED: Dispatch real-time refresh event (per expert recommendation)
                    console.log(`🔄 Dispatching sms-screen-refresh event for contact ${contactId}`);
                    window.dispatchEvent(new CustomEvent('sms-screen-refresh', { 
                        detail: { contactId, reason: 'message_sent' } 
                    }));
                    
                    // Force immediate refresh
                    window.app.smsIntegrationManager.getConversation(contactId, true);
                    
                    // CRITICAL: Mark this as a real-time sent message update for throttle bypass
                    if (!this.realtimeUpdateContext) {
                        this.realtimeUpdateContext = new Map();
                    }
                    this.realtimeUpdateContext.set(contactId, {
                        type: 'message_sent',
                        timestamp: Date.now(),
                        reason: 'message_sent_successfully'
                    });
                    console.log(`🚨 MARKED REAL-TIME CONTEXT for contact ${contactId}: message_sent`);
                    
                    // Also trigger UI update after a brief delay
                    setTimeout(() => {
                        const contact = window.app?.contactManager?.contacts?.get(contactId);
                        if (contact?.smsScreen) {
                            const freshMessages = this.lastConversationState?.get(contactId) || [];
                            if (freshMessages.length > 0) {
                                console.log(`✅ Updating SMS screen with ${freshMessages.length} messages after send`);
                                contact.smsScreen.updateMessages(freshMessages, 'message_sent');
                                contact.smsScreen.renderInterface(true, 'critical');
                                if (contact.smsScreen.texture) {
                                    contact.smsScreen.texture.needsUpdate = true;
                                }
                            }
                        }
                    }, 500);
                } else {
                    // Fallback: try to detect current SMS contact
                    const currentContact = this.getCurrentSmsContact();
                    if (currentContact && window.app?.smsIntegrationManager) {
                        this.log(`📱 FALLBACK: Triggering conversation refresh for detected contact ${currentContact} after successful send.`);
                        
                        // CRITICAL: Clear conversation state for fallback too
                        if (this.lastConversationState) {
                            this.lastConversationState.delete(currentContact);
                            console.log(`🗑️ Cleared conversation state for detected contact ${currentContact}`);
                        }
                        
                        // ENHANCED: Dispatch real-time refresh event for fallback too
                        window.dispatchEvent(new CustomEvent('sms-screen-refresh', { 
                            detail: { contactId: currentContact, reason: 'message_sent_fallback' } 
                        }));
                        
                        window.app.smsIntegrationManager.getConversation(currentContact, true);
                    }
                }
            });

            this.statusEventHandlers.set('listening_started', (response) => {
                this.log('📱 Message listening started successfully', response);
            });

            this.statusEventHandlers.set('listening_stopped', (response) => {
                this.log('📱 Message listening stopped', response);
            });

            // Add a catch-all handler for any success events that might be message confirmations
            this.statusEventHandlers.set('message_confirmation', (response) => {
                this.log('📱 Message confirmation event', response);
                const contactId = response.contactId || this.getCurrentSmsContact();
                if (contactId && window.app?.smsIntegrationManager) {
                    this.log(`📱 Triggering conversation refresh for contact ${contactId} after message confirmation.`);
                    window.app.smsIntegrationManager.getConversation(contactId);
                }
            });
        }

        /**
         * Route input events using the handler map
         */
        routeInputEvent(response) {
            const action = response.action;
            
            if (this.inputEventHandlers.has(action)) {
                this.log('📱 Routing input event', { action });
                this.inputEventHandlers.get(action)(response);
            } else {
                this.log('📱 Unhandled input event', { action }, 'warn');
            }
        }

        /**
         * CRITICAL FIX: Handle data events directly from smsChannelManager
         * This method allows direct event dispatch from notifyConversationHistory
         */
        handleDataEvent(action, response) {
            console.log(`📱 [CRITICAL FIX] Direct data event handler called - action: ${action}`, response);
            
            // Create a properly formatted response object for routing
            const formattedResponse = {
                ...response,
                action: action
            };
            
            // Route through the existing data event handling system
            this.routeDataEvent(formattedResponse);
        }

        /**
         * Route data events using the handler map
         */
        routeDataEvent(response) {
            console.error('📱 🚨 ROUTE DATA EVENT CALLED!');
            console.error('📱 🚨 Response received:', response);
            
            // EMERGENCY: Try to update ANY SMS screen with ANY messages, regardless of routing
            if (response.messages && Array.isArray(response.messages) && response.messages.length > 0) {
                console.error(`📱 🚨 DATA EVENT EMERGENCY: Found ${response.messages.length} messages, trying to update ANY visible SMS screen`);
                
                const contactId = response.contactId || response.messages[0]?.contactId;
                
                // Try to find ANY contact with a visible SMS screen
                if (window.app?.contactManager?.contacts) {
                    let updatedAnyScreen = false;
                    
                    // First try the specific contact
                    if (contactId) {
                        const contact = window.app.contactManager.contacts.get(contactId);
                        if (contact?.smsScreen) {
                            console.error(`📱 🚨 DATA EVENT: Updating specific contact ${contactId} SMS screen`);
                            if (contact.smsScreen.updateMessages) {
                                contact.smsScreen.updateMessages(response.messages);
                                updatedAnyScreen = true;
                            }
                        }
                    }
                    
                    // If that didn't work, try ANY visible SMS screen
                    if (!updatedAnyScreen) {
                        console.error('📱 🚨 DATA EVENT: Trying to update ANY visible SMS screen');
                        for (const [id, contact] of window.app.contactManager.contacts) {
                            if (contact?.smsScreen?.isVisible && contact.smsScreen.updateMessages) {
                                console.error(`📱 🚨 DATA EVENT: Force updating visible SMS screen for contact ${id}`);
                                contact.smsScreen.updateMessages(response.messages);
                                updatedAnyScreen = true;
                                break;
                            }
                        }
                    }
                    
                    if (!updatedAnyScreen) {
                        console.error('📱 🚨 DATA EVENT: Could not find any SMS screen to update!');
                        console.error('📱 🚨 Available contacts:', Array.from(window.app.contactManager.contacts.keys()));
                    }
                }
            }
            
            let action = response.action;

            // Enhanced debugging for data events
            this.log('📱 [DATA DEBUG] Raw data event received:', response, 'warn');
            this.log('📱 🔍 ROUTE DEBUG: messages exist?', response.messages ? 'YES' : 'NO', 'warn');
            this.log('📱 🔍 ROUTE DEBUG: messages is array?', Array.isArray(response.messages), 'warn');
            this.log('📱 🔍 ROUTE DEBUG: messages length:', response.messages?.length || 'N/A', 'warn');

            // DARCIE TEST SPECIFIC DEBUGGING FOR DATA EVENTS
            const responseString = JSON.stringify(response).toLowerCase();
            const isDarcieEvent = responseString.includes('224') && (responseString.includes('440') || responseString.includes('5082') || responseString.includes('darcie'));
            
            if (isDarcieEvent) {
                console.error('🎯🎯🎯 DARCIE TEST DATA EVENT DETECTED! 🎯🎯🎯');
                console.error('📱 DARCIE Data Event Action:', action);
                console.error('📱 DARCIE Data Event Full Object:', JSON.stringify(response, null, 2));
                
                // Check for messages related to Darcie
                if (response.messages && Array.isArray(response.messages)) {
                    const darcieMessages = response.messages.filter(msg => {
                        const msgString = JSON.stringify(msg).toLowerCase();
                        return msgString.includes('224') && (msgString.includes('440') || msgString.includes('5082'));
                    });
                    
                    if (darcieMessages.length > 0) {
                        console.error(`📱 DARCIE: Found ${darcieMessages.length} messages in data event:`, darcieMessages);
                    }
                }
            }

            // CRITICAL FIX: If action is missing, infer it BEFORE any processing
            if (!action || action === undefined || action === null) {
                this.log('📱 🚨 ACTION MISSING - attempting to infer from payload', response, 'warn');
                
                if (response.hasOwnProperty('totalMessages') && response.hasOwnProperty('messages')) {
                    // This structure is characteristic of conversation history responses
                    this.log('📱 ✅ Inferred "get_conversation" action from response payload');
                    action = 'get_conversation';
                } else if (response.hasOwnProperty('text') && response.hasOwnProperty('contactId')) {
                    // This might be a message event
                    if (response.hasOwnProperty('type')) {
                        action = response.type === 'sent' ? 'message_sent' : 'message_received';
                        this.log(`📱 ✅ Inferred "${action}" from message structure`);
                    }
                } else if (response.hasOwnProperty('messages') && Array.isArray(response.messages)) {
                    // Generic conversation data - treat as get_conversation
                    this.log('📱 ✅ Inferred "get_conversation" action from messages array');
                    action = 'get_conversation';
                } else if (response.hasOwnProperty('success') && response.hasOwnProperty('messageCount')) {
                    // Likely a conversation response with success status
                    this.log('📱 ✅ Inferred "get_conversation" action from success/messageCount structure');
                    action = 'get_conversation';
                }
                
                if (isDarcieEvent && action) {
                    console.error('🎯 DARCIE: Inferred action for data event:', action);
                }
                
                // FALLBACK: If still no action but we have messages, default to get_conversation
                if (!action && response.messages && Array.isArray(response.messages)) {
                    this.log('📱 🚨 FALLBACK: Defaulting to get_conversation for messages array');
                    action = 'get_conversation';
                }
            }

            // CRITICAL: ALWAYS check for new messages FIRST, regardless of action or routing
            if (response.messages && Array.isArray(response.messages)) {
                this.log('📱 🚨 FORCING checkForNewMessages before any other processing', null, 'warn');
                this.checkForNewMessages(response);
            } else if (response.text && response.contactId && (action === 'message_received' || action === 'new_message')) {
                // This handles single message payloads that don't come in an array
                this.log('📱 🚨 Single message payload detected, creating pseudo-response for checkForNewMessages', null, 'warn');
                this.checkForNewMessages({
                    contactId: response.contactId,
                    messages: [response]
                });
            } else {
                this.log('📱 ⚠️ SKIPPING checkForNewMessages - no valid messages array or single message payload', null, 'warn');
            }
            
            // ENHANCED ACTION VALIDATION AND ROUTING
            if (!action || action === undefined || action === null) {
                console.error('📱 🚨 CRITICAL: Unable to determine action for data event!', response);
                
                // EMERGENCY FALLBACK: Force UI update if we have messages
                if (response.messages && Array.isArray(response.messages) && response.messages.length > 0) {
                    console.error('📱 🚨 EMERGENCY FALLBACK: Forcing UI update for unrouted messages');
                    this.forceEmergencyUIUpdate(response);
                } else if (response.text && response.contactId) {
                    console.error('📱 🚨 EMERGENCY FALLBACK: Forcing UI update for single unrouted message');
                    this.forceEmergencyUIUpdate({ contactId: response.contactId, messages: [response] });
                }
                return;
            }
            
            if (this.dataEventHandlers.has(action)) {
                this.log('📱 ✅ Routing data event', { action });
                
                if (isDarcieEvent) {
                    console.error(`🎯 DARCIE: Routing to handler for action: ${action}`);
                }
                
                this.dataEventHandlers.get(action)(response);
            } else {
                this.log('📱 ❌ Unhandled data event', { originalAction: response.action, inferredAction: action, response }, 'warn');
                
                if (isDarcieEvent) {
                    console.error('🎯 DARCIE: UNHANDLED DATA EVENT!', { originalAction: response.action, inferredAction: action });
                }
                
                // ENHANCED FALLBACK: If we can't identify the action but have messages, treat as conversation update
                if (response.messages && Array.isArray(response.messages) && response.messages.length > 0) {
                    this.log('📱 🚨 ENHANCED FALLBACK: Treating unhandled event with messages as get_conversation');
                    this.dataEventHandlers.get('get_conversation')(response);
                    
                    if (isDarcieEvent) {
                        console.error('🎯 DARCIE: Using FALLBACK get_conversation handler');
                    }
                    
                    this.dataEventHandlers.get('get_conversation')(response);
                }
            }
        }

        /**
         * Route status events using the handler map
         */
        routeStatusEvent(response) {
            let action = response.action;

            // Enhanced debugging for status events
            this.log('📱 [STATUS DEBUG] Raw status event received:', response, 'warn');

            // If action is missing, try to infer it from the payload structure
            if (!action) {
                if (response.hasOwnProperty('listening')) {
                    action = response.listening ? 'listening_started' : 'listening_stopped';
                    this.log(`📱 Inferred "${action}" from listening status`);
                } else if (response.hasOwnProperty('messageSent') && response.messageSent) {
                    action = 'message_sent_successfully';
                    this.log(`📱 Inferred "${action}" from messageSent status`);
                } else if (response.hasOwnProperty('success') && response.success) {
                    // Check if this might be a message sent confirmation
                    if (response.hasOwnProperty('contactId') || response.hasOwnProperty('phoneNumber')) {
                        action = 'message_sent_successfully';
                        this.log(`📱 Inferred "${action}" from success + contact info`);
                    } else {
                        // Generic success, could be anything, but let's check for new messages just in case
                        action = 'generic_success';
                    }
                }
            }
            
            // AGGRESSIVE FIX: Force conversation refresh on ANY successful status with contactId
            // This covers cases where Flutter sends success responses but no specific events
            if (response.success && response.contactId && window.app?.smsIntegrationManager) {
                this.log(`📱 AGGRESSIVE REFRESH: Detected successful status for contact ${response.contactId}, forcing conversation refresh`);
                // Minimal delay to allow Flutter to persist the message
                setTimeout(() => {
                    // Use forceRefresh to bypass throttling
                    window.app.smsIntegrationManager.getConversation(response.contactId, true);
                }, 50);
            }
            
            if (this.statusEventHandlers.has(action)) {
                this.log('📱 Routing status event', { action });
                this.statusEventHandlers.get(action)(response);
            } else {
                this.log('📱 Unhandled status event', { originalAction: response.action, inferredAction: action, response }, 'warn');
            }
        }

        /**
         * Register a custom event handler
         */
        registerEventHandler(eventType, action, handler) {
            const handlerMap = this.getHandlerMap(eventType);
            if (handlerMap) {
                handlerMap.set(action, handler);
                this.log('📱 Registered custom event handler', { eventType, action });
            } else {
                this.log('📱 Unknown event type for handler registration', { eventType }, 'error');
            }
        }

        /**
         * Unregister an event handler
         */
        unregisterEventHandler(eventType, action) {
            const handlerMap = this.getHandlerMap(eventType);
            if (handlerMap && handlerMap.has(action)) {
                handlerMap.delete(action);
                this.log('📱 Unregistered event handler', { eventType, action });
            }
        }

        /**
         * Get the appropriate handler map for an event type
         */
        getHandlerMap(eventType) {
            switch (eventType) {
                case 'input':
                    return this.inputEventHandlers;
                case 'data':
                    return this.dataEventHandlers;
                case 'status':
                    return this.statusEventHandlers;
                default:
                    return null;
            }
        }

        /**
         * Quick detection for new messages to bypass throttling
         */
        detectNewMessagesQuick(response) {
            if (!response.messages || !Array.isArray(response.messages) || response.messages.length === 0) {
                return false;
            }
            
            const contactId = response.contactId || response.messages[0]?.contactId;
            if (!contactId) {
                return false;
            }
            
            const lastKnownMessages = this.lastConversationState?.get(contactId) || [];
            const currentMessages = response.messages;
            
            // Quick check: if message counts are different, likely new messages
            if (currentMessages.length !== lastKnownMessages.length) {
                console.error(`📱 🚨 QUICK DETECT: Message count changed from ${lastKnownMessages.length} to ${currentMessages.length}`);
                return true;
            }
            
            // Quick check: compare first message ID (newest message)
            if (currentMessages.length > 0 && lastKnownMessages.length > 0) {
                const currentNewest = currentMessages[0]?.id;
                const lastKnownNewest = lastKnownMessages[0]?.id;
                
                if (currentNewest !== lastKnownNewest) {
                    console.error(`📱 🚨 QUICK DETECT: Newest message ID changed from ${lastKnownNewest} to ${currentNewest}`);
                    return true;
                }
            }
            
            // Check for very recent messages (last 30 seconds) - reduced from 60 for faster detection
            const now = Date.now();
            const veryRecentMessages = currentMessages.filter(msg => (now - msg.timestamp) < 30000);
            if (veryRecentMessages.length > 0) {
                console.error(`📱 🚨 QUICK DETECT: Found ${veryRecentMessages.length} very recent messages`);
                
                // If we haven't seen any messages for this contact before, treat recent ones as new
                if (lastKnownMessages.length === 0) {
                    console.error(`📱 🚨 QUICK DETECT: First time seeing messages for contact ${contactId}`);
                    return true;
                }
                
                // Check if any recent messages have different IDs than what we knew about
                const lastKnownIds = new Set(lastKnownMessages.map(msg => msg.id));
                const hasNewRecentMessage = veryRecentMessages.some(msg => !lastKnownIds.has(msg.id));
                if (hasNewRecentMessage) {
                    console.error(`📱 🚨 QUICK DETECT: Found new recent messages that weren't in last known state`);
                    return true;
                }
                
                // ENHANCED: Also check if current batch has MORE recent messages than last known
                const lastKnownRecentMessages = lastKnownMessages.filter(msg => (now - msg.timestamp) < 30000);
                if (veryRecentMessages.length > lastKnownRecentMessages.length) {
                    console.error(`📱 🚨 QUICK DETECT: Recent message count increased from ${lastKnownRecentMessages.length} to ${veryRecentMessages.length}`);
                    return true;
                }
            }
            
            return false;
        }

        /**
         * Check for new messages by comparing with last known state
         */
        checkForNewMessages(response) {
            console.error('📱 🔍 ===== checkForNewMessages CALLED =====');
            console.error('📱 🔍 Response object:', response);
            
            // EMERGENCY DEBUG: Always try to update SMS screen regardless of detection logic
            const emergencyContactId = response.contactId || response.messages?.[0]?.contactId;
            if (emergencyContactId && response.messages && Array.isArray(response.messages)) {
                console.error(`📱 🚨 EMERGENCY SMS SCREEN UPDATE: Forcing update for contact ${emergencyContactId} with ${response.messages.length} messages`);
                
                // CRITICAL: Smart throttling - always update for new messages, throttle only for redundant scrolling
                const now = Date.now();
                const lastUpdate = this.lastScreenUpdate?.get(emergencyContactId) || 0;
                const timeSinceLastUpdate = now - lastUpdate;
                
                // Check if this is a new message update (different message count or IDs)
                const hasNewMessages = this.detectNewMessagesQuick(response);
                
                // Always update for new messages, only throttle redundant scroll updates
                const shouldForceUpdate = hasNewMessages || timeSinceLastUpdate > 200; // Reduced from 500ms to 200ms for faster response
                
                if (shouldForceUpdate) {
                    const contact = this.findContactByIdOrPhone(emergencyContactId);
                    if (contact?.smsScreen) {
                        console.error(`📱 🚨 Contact found, SMS screen exists: ${!!contact.smsScreen}`);
                        console.error(`📱 🚨 SMS screen visible: ${contact.smsScreen.isVisible}`);
                        console.error(`📱 🚨 Has new messages: ${hasNewMessages}`);
                        console.error(`📱 🚨 Time since last update: ${timeSinceLastUpdate}ms`);
                        
                        if (contact.smsScreen.updateMessages) {
                            console.error(`📱 🚨 CALLING updateMessages with ${response.messages.length} messages`);
                            console.error(`📱 🚨 First 3 messages:`, response.messages.slice(0, 3).map(m => `${m.type}: "${m.text}" (ID: ${m.id})`));
                            contact.smsScreen.updateMessages(response.messages);
                            console.error(`📱 🚨 updateMessages call completed`);
                            
                            // Track the update time only after successful update
                            if (!this.lastScreenUpdate) {
                                this.lastScreenUpdate = new Map();
                            }
                            this.lastScreenUpdate.set(emergencyContactId, now);
                        }
                        
                        // Always call renderInterface for new messages
                        if (contact.smsScreen.renderInterface) {
                            console.error(`📱 🚨 CALLING renderInterface`);
                            contact.smsScreen.renderInterface();
                            console.error(`📱 🚨 renderInterface call completed`);
                        }
                    } else {
                        console.error(`📱 🚨 No contact or SMS screen found for contactId: ${emergencyContactId}`);
                        console.error(`📱 🚨 Contact exists: ${!!contact}`);
                        console.error(`📱 🚨 All contacts:`, window.app?.contactManager?.contacts);
                    }
                } else {
                    console.error(`📱 🚨 THROTTLED: Skipping redundant update (${timeSinceLastUpdate}ms since last, no new messages)`);
                }
            }
            
            this.log('📱 🔍 ===== checkForNewMessages CALLED =====', null, 'warn');
            this.log('📱 🔍 Response object:', response, 'warn');
            
            if (!response.messages || !Array.isArray(response.messages)) {
                this.log('📱 🔍 checkForNewMessages: No messages array found', null, 'warn');
                return;
            }
            
            const contactId = response.contactId || response.messages[0]?.contactId;
            if (!contactId) {
                this.log('📱 🔍 checkForNewMessages: No contactId found', null, 'warn');
                return;
            }
            
            this.log('📱 🔍 checkForNewMessages: Processing ' + response.messages.length + ' messages for contact ' + contactId, null, 'warn');
            
            // Initialize conversation state tracking
            if (!this.lastConversationState) {
                this.lastConversationState = new Map();
                this.log('📱 🔍 Initialized conversation state tracking');
            }
            
            const currentMessages = response.messages;
            const lastKnownMessages = this.lastConversationState.get(contactId) || [];
            
            // ENHANCED DEBUG: Show exactly what we're comparing
            this.log(`📱 🔍 ===== MESSAGE COMPARISON DEBUG for contact ${contactId} =====`, null, 'warn');
            this.log(`📱 🔍 Current messages count: ${currentMessages.length}`, null, 'warn');
            this.log(`📱 🔍 Last known messages count: ${lastKnownMessages.length}`, null, 'warn');
            
            // Show the newest 3 messages from current batch
            const newest3Current = currentMessages.slice(0, 3);
            this.log(`📱 🔍 NEWEST 3 CURRENT MESSAGES:`, newest3Current.map(m => `${m.type}: "${m.text}" (ID: ${m.id})`), 'warn');
            
            // Show the newest 3 messages from last known batch
            const newest3LastKnown = lastKnownMessages.slice(0, 3);
            this.log(`📱 🔍 NEWEST 3 LAST KNOWN MESSAGES:`, newest3LastKnown.map(m => `${m.type}: "${m.text}" (ID: ${m.id})`), 'warn');
            
            // CRITICAL FIX: Check for new messages by comparing message IDs, not just count
            // Messages are sorted newest first, so we check the first few messages for new IDs
            const lastKnownIds = new Set(lastKnownMessages.map(msg => msg.id));
            const currentIds = new Set(currentMessages.map(msg => msg.id));
            let newMessages = currentMessages.filter(msg => !lastKnownIds.has(msg.id));
            
            this.log(`📱 🔍 Last known IDs (${lastKnownIds.size}):`, Array.from(lastKnownIds), 'warn');
            this.log(`📱 🔍 All current IDs (${currentMessages.length}):`, currentMessages.map(m => m.id), 'warn');
            this.log(`📱 🔍 NEW MESSAGE IDs (${newMessages.length}):`, newMessages.map(m => m.id), 'warn');
            
            // CRITICAL: Check for recent messages (last 5 minutes)
            const now = Date.now();
            const recentMessages = currentMessages.filter(msg => (now - msg.timestamp) < 300000); // 5 minutes
            this.log(`📱 ⏰ RECENT MESSAGES (last 5 min, ${recentMessages.length}):`, recentMessages.map(m => `${m.type}: "${m.text}" (ID: ${m.id}) ${Math.floor((now - m.timestamp)/1000)}s ago`), 'warn');
            
            // OPTIMIZED FIX: Quick detection for recent received messages
            if (newMessages.length === 0 && recentMessages.length > 0) {
                const recentReceivedMessages = recentMessages.filter(msg => msg.type === 'received');
                if (recentReceivedMessages.length > 0) {
                    const lastScreenUpdate = this.lastScreenUpdate?.get(contactId) || 0;
                    const timeSinceLastUpdate = now - lastScreenUpdate;
                    
                    // Reduced threshold from 10 seconds to 2 seconds for faster response
                    if (timeSinceLastUpdate > 2000) {
                        this.log(`📱 ⚡ FAST DETECTION: Treating ${recentReceivedMessages.length} recent received messages as new`, null, 'info');
                        newMessages = [...recentReceivedMessages];
                        this.lastConversationState.delete(contactId);
                    }
                }
            }
            
            // Check if there are any differences in message sets
            const missingFromCurrent = lastKnownMessages.filter(msg => !currentIds.has(msg.id));
            const addedToCurrent = currentMessages.filter(msg => !lastKnownIds.has(msg.id));
            
            this.log(`📱 🔍 Messages removed since last check: ${missingFromCurrent.length}`);
            this.log(`📱 🔍 Messages added since last check: ${addedToCurrent.length}`);
            
            // OPTIMIZED: Force detection of very recent messages (last 10 seconds) for faster response
            const veryRecentMessages = currentMessages.filter(msg => (now - msg.timestamp) < 10000);
            if (veryRecentMessages.length > 0) {
                this.log(`📱 ⚡ VERY RECENT MESSAGES detected (${veryRecentMessages.length}):`, veryRecentMessages.map(m => `${m.type}: "${m.text}" (ID: ${m.id}) ${Math.floor((now - m.timestamp)/1000)}s ago`), 'info');
                
                // If we have very recent messages and no stored state, treat as new
                if (lastKnownMessages.length === 0) {
                    this.log(`📱 ⚡ FORCING NEW MESSAGE DETECTION for very recent messages (no previous state)`, null, 'info');
                    newMessages.push(...veryRecentMessages);
                }
            }
            
            if (newMessages.length > 0) {
                this.log(`📱 🔔 DETECTED ${newMessages.length} NEW MESSAGES for contact ${contactId}:`, newMessages.map(m => `${m.type}: "${m.text}" (ID: ${m.id})`));
                
                // Check if any are received messages (not sent by us)
                const newReceivedMessages = newMessages.filter(msg => msg.type === 'received');
                if (newReceivedMessages.length > 0) {
                    this.log(`📱 🔔 NEW RECEIVED MESSAGES: ${newReceivedMessages.length} messages from contact ${contactId}`, newReceivedMessages);
                    
                    // IMMEDIATE UI update for received messages
                    const contact = window.app?.contactManager?.contacts?.get(contactId);
                    if (contact?.smsScreen && (contact.smsScreen.isVisible || contact.smsScreen.updateMessages)) {
                        this.log(`📱 🔔 IMMEDIATE SMS SCREEN UPDATE for new received messages`);
                        contact.smsScreen.updateMessages(currentMessages);
                        
                        // Track the screen update time
                        if (!this.lastScreenUpdate) {
                            this.lastScreenUpdate = new Map();
                        }
                        this.lastScreenUpdate.set(contactId, Date.now());
                        
                        // Force re-render and scroll
                        if (contact.smsScreen.render) {
                            contact.smsScreen.render();
                        }
                        if (contact.smsScreen.scrollToBottom) {
                            contact.smsScreen.scrollToBottom();
                        }
                    }
                    
                    // Also trigger additional refresh with minimal delay
                    setTimeout(() => {
                        if (window.app?.smsIntegrationManager) {
                            this.log(`📱 🔔 SECONDARY REFRESH due to new received messages`);
                            window.app.smsIntegrationManager.getConversation(contactId);
                        }
                    }, 50);
                }
                
                // Check if any are sent messages that just got confirmed
                const newSentMessages = newMessages.filter(msg => msg.type === 'sent');
                if (newSentMessages.length > 0) {
                    this.log(`📱 ✅ NEW SENT MESSAGES confirmed: ${newSentMessages.length} messages`);
                }
            } else if (currentMessages.length === lastKnownMessages.length && lastKnownMessages.length > 0) {
                this.log(`📱 🔍 Same message count (${currentMessages.length}) - checking for status updates`);
                // Same count and same IDs - check for status updates
                for (let i = 0; i < Math.min(currentMessages.length, lastKnownMessages.length); i++) {
                    const current = currentMessages[i];
                    const last = lastKnownMessages.find(msg => msg.id === current.id);
                    
                    if (last && current.status !== last.status) {
                        this.log(`📱 📊 MESSAGE STATUS UPDATE: ${current.id} changed from ${last.status} to ${current.status}`);
                    }
                }
            } else if (lastKnownMessages.length === 0) {
                this.log(`📱 🔍 First time seeing messages for contact ${contactId} - treating all as new`);
            } else {
                this.log(`📱 🔍 No new messages detected - current: ${currentMessages.length}, last known: ${lastKnownMessages.length}`);
            }
            
            // Update our state tracking
            this.lastConversationState.set(contactId, [...currentMessages]);
            this.log(`📱 🔍 Updated conversation state for contact ${contactId} with ${currentMessages.length} messages`);
        }

        /**
         * Helper method to detect the current SMS contact
         */
        getCurrentSmsContact() {
            try {
                // Try to get from SMS integration manager
                if (window.app?.smsIntegrationManager?.currentContactId) {
                    return window.app.smsIntegrationManager.currentContactId;
                }
                
                // Try to find any visible SMS screen
                if (window.app?.contactManager?.contacts) {
                    for (const [contactId, contact] of window.app.contactManager.contacts) {
                        if (contact?.smsScreen?.isVisible) {
                            return contactId;
                        }
                    }
                }
                
                return null;
            } catch (error) {
                this.log('📱 Error detecting current SMS contact:', error, 'error');
                return null;
            }
        }

        /**
         * Start aggressive conversation monitoring to catch missed message updates
         */
        startConversationMonitoring() {
            // DISABLED: This was causing infinite conversation refresh loop every 2 seconds
            // this.conversationMonitorInterval = setInterval(() => {
            //     const currentContact = this.getCurrentSmsContact();
            //     if (currentContact && window.app?.smsIntegrationManager) {
            //         // Only refresh if we're in SMS mode and it's been a while since last update
            //         const now = Date.now();
            //         // Reduced threshold for faster detection
            //         if (!this.lastConversationRefresh || (now - this.lastConversationRefresh) > 3000) {
            //             this.log(`📱 MONITOR: Periodic conversation refresh for contact ${currentContact}`);
            //             // Force a fresh conversation fetch to detect new messages
            //             window.app.smsIntegrationManager.getConversation(currentContact, true);
            //             this.lastConversationRefresh = now;
            //         }
            //     }
            // }, 2000); // Check every 2 seconds for faster detection
            
            this.log('📱 Conversation monitoring DISABLED to prevent infinite refresh loop - using event-driven updates instead');
        }

        /**
         * Enable or disable debug mode
         */
        setDebugMode(enabled) {
            this.debugMode = enabled;
            this.log('📱 Debug mode', { enabled: enabled ? 'ON' : 'OFF' });
        }

        /**
         * Get event handler statistics
         */
        getStats() {
            return {
                inputHandlers: this.inputEventHandlers.size,
                dataHandlers: this.dataEventHandlers.size,
                statusHandlers: this.statusEventHandlers.size,
                total: this.inputEventHandlers.size + this.dataEventHandlers.size + this.statusEventHandlers.size
            };
        }

        /**
         * Logging utility with debug mode support
         */
        log(message, data = null, level = 'log') {
            // Only log warn/error messages and explicit debug mode logs
            // This significantly reduces console noise
            if (level === 'warn' || level === 'error' || (this.debugMode && level === 'log')) {
                const timestamp = new Date().toISOString().substr(11, 12);
                const logMessage = `[${timestamp}] ${message}`;
                
                if (data) {
                    console[level](logMessage, data);
                } else {
                    console[level](logMessage);
                }
            }
        }

        /**
         * Reset conversation state for a specific contact
         * This can be called when SMS screen opens to ensure fresh message detection
         */
        resetConversationState(contactId) {
            if (this.lastConversationState && contactId) {
                this.lastConversationState.delete(contactId);
                this.log(`📱 🔄 RESET conversation state for contact ${contactId}`, null, 'warn');
            }
            
            if (this.lastScreenUpdate && contactId) {
                this.lastScreenUpdate.delete(contactId);
                this.log(`📱 🔄 RESET screen update tracking for contact ${contactId}`, null, 'warn');
            }
        }

        /**
         * Reset all conversation states (useful for debugging)
         */
        resetAllConversationStates() {
            if (this.lastConversationState) {
                this.lastConversationState.clear();
                this.log(`📱 🔄 RESET ALL conversation states`, null, 'warn');
            }
            
            if (this.lastScreenUpdate) {
                this.lastScreenUpdate.clear();
                this.log(`📱 🔄 RESET ALL screen update tracking`, null, 'warn');
            }
        }

        /**
         * Force emergency reset when system is overwhelmed
         */
        forceEmergencyReset(contactId) {
            console.error(`📱 🚨 EMERGENCY RESET for contact ${contactId}`);
            
            // Reset all state tracking
            this.resetConversationState(contactId);
            
            // Force fresh conversation fetch
            if (window.app?.smsIntegrationManager) {
                console.error(`📱 🚨 EMERGENCY: Forcing fresh conversation fetch`);
                setTimeout(() => {
                    window.app.smsIntegrationManager.getConversation(contactId, true);
                }, 1000);
            }
        }

        /**
         * EMERGENCY FALLBACK: Force UI update when normal routing fails
         */
        forceEmergencyUIUpdate(response) {
            const contactId = response.contactId || response.messages?.[0]?.contactId;
            const messages = response.messages;

            if (contactId && messages) {
                console.error(`📱 EMERGENCY UPDATE: Forcing UI update for contact ${contactId} with ${messages.length} messages.`);
                
                // Dispatch a global event that the SMS screen can listen for
                window.dispatchEvent(new CustomEvent('sms-emergency-update', {
                    detail: { contactId, messages }
                }));

                // Also try direct update if possible
                const contact = window.app?.contactManager?.contacts?.get(contactId);
                if (contact?.smsScreen?.updateMessages) {
                    console.error('📱 EMERGENCY UPDATE: Calling updateMessages directly.');
                    contact.smsScreen.updateMessages(messages);
                }
            }
        }

        /**
         * Force direct UI update - bypass all event routing
         * This method ensures real-time SMS updates work correctly
         */
        forceDirectUIUpdate(contactId = null) {
            // Find the current SMS contact and screen
            let smsContact = contactId;
            let smsScreen = null;
            
            if (!smsContact && window.app?.contactManager?.contacts) {
                for (const [id, contact] of window.app.contactManager.contacts) {
                    if (contact?.smsScreen?.isVisible) {
                        smsContact = id;
                        smsScreen = contact.smsScreen;
                        break;
                    }
                }
            } else if (smsContact && window.app?.contactManager?.contacts) {
                const contact = window.app.contactManager.contacts.get(smsContact);
                smsScreen = contact?.smsScreen;
            }
            
            if (!smsScreen || !smsContact) {
                this.log('📱 Direct update: No visible SMS screen found', null, 'warn');
                return false;
            }
            
            // Get messages directly from stored state
            const storedMessages = this.lastConversationState?.get(smsContact) || [];
            
            if (storedMessages.length > 0) {
                this.log(`📱 Direct update: Force updating SMS screen with ${storedMessages.length} messages`, null, 'warn');
                
                // Direct UI updates
                if (smsScreen.updateMessages) {
                    smsScreen.updateMessages(storedMessages);
                }
                
                if (smsScreen.renderInterface) {
                    smsScreen.renderInterface();
                }
                
                if (smsScreen.render) {
                    smsScreen.render();
                }
                
                // Force Three.js texture update
                if (smsScreen.texture) {
                    smsScreen.texture.needsUpdate = true;
                }
                
                this.log(`📱 Direct update: UI update complete for contact ${smsContact}`, null, 'warn');
                return true;
            }
            
            return false;
        }

        /**
         * Cleanup method
         */
        destroy() {
            // Stop conversation monitoring
            if (this.conversationMonitorInterval) {
                clearInterval(this.conversationMonitorInterval);
                this.conversationMonitorInterval = null;
            }
            
            this.inputEventHandlers.clear();
            this.dataEventHandlers.clear();
            this.statusEventHandlers.clear();
            this.log('📱 SmsEventRouter destroyed');
        }
        
        /**
         * Handle real-time message updates - this was lost during file recovery
         * This method bypasses throttling for immediate SMS message display
         */
        handleRealtimeMessageUpdate(contactId, messages, updateType = 'background') {
            console.error('🚨 REAL-TIME MESSAGE UPDATE HANDLER - Bypassing throttling for immediate display');
            console.error(`📱 Contact: ${contactId}, Messages: ${messages.length}, Type: ${updateType}`);
            
            if (!contactId || !messages || !Array.isArray(messages)) {
                console.error('❌ Invalid parameters for real-time update');
                return;
            }
            
            // Find the contact and SMS screen
            const contact = window.app?.contactManager?.contacts?.get(contactId);
            if (!contact?.smsScreen) {
                console.error(`❌ No SMS screen found for contact ${contactId}`);
                return;
            }
            
            // CRITICAL: Bypass all throttling for real-time updates
            const smsScreen = contact.smsScreen;
            
            // Clear any existing throttling timers
            if (smsScreen.renderThrottleTimeout) {
                clearTimeout(smsScreen.renderThrottleTimeout);
                smsScreen.renderThrottleTimeout = null;
            }
            
            // Reset throttling timestamps to allow immediate render
            smsScreen.lastRenderTime = 0;
            smsScreen.isRendering = false;
            
            // Update messages with priority context
            if (smsScreen.updateMessages) {
                console.error('📱 REAL-TIME: Calling updateMessages with bypass');
                smsScreen.updateMessages(messages, updateType);
            }
            
            // Force immediate render with critical priority
            if (smsScreen.renderInterface) {
                console.error('📱 REAL-TIME: Forcing immediate renderInterface');
                smsScreen.renderInterface(true, 'critical');
            }
            
            // Update texture immediately
            if (smsScreen.texture) {
                smsScreen.texture.needsUpdate = true;
            }
            
            console.error('✅ REAL-TIME MESSAGE UPDATE COMPLETE');
        }

        /**
         * Handle data events from Flutter via JavaScript execution
         * This is the critical entry point for real-time SMS events
         */
        handleFlutterDataEvent(eventData) {
            console.log('📱 🎯 SmsEventRouter.handleFlutterDataEvent received:', eventData);
            
            if (!eventData || !eventData.action) {
                console.error('📱 ❌ Invalid event data received from Flutter:', eventData);
                return;
            }
            
            const action = eventData.action;
            
            // Check if we have a handler for this action
            if (this.dataEventHandlers.has(action)) {
                console.log(`📱 ✅ Processing ${action} with registered handler`);
                const handler = this.dataEventHandlers.get(action);
                try {
                    handler(eventData);
                } catch (error) {
                    console.error(`📱 ❌ Error in ${action} handler:`, error);
                }
            } else {
                console.warn(`📱 ⚠️ No handler registered for action: ${action}`);
                console.log('📱 📋 Available handlers:', Array.from(this.dataEventHandlers.keys()));
                
                // Fallback: try to handle as generic event
                this.handleGenericFlutterEvent(eventData);
            }
        }
        
        /**
         * Generic fallback handler for unregistered Flutter events
         */
        handleGenericFlutterEvent(eventData) {
            console.log('📱 🔄 Handling as generic Flutter event:', eventData);
            
            // Dispatch as window event for other listeners
            const eventType = `flutter-${eventData.action || 'sms'}`;
            window.dispatchEvent(new CustomEvent(eventType, { detail: eventData }));
            
            // Try to forward to SMS Core if available
            if (window.smsCore && eventData.action === 'message_received') {
                console.log('📱 🚀 Forwarding to SMS Core');
                try {
                    const message = {
                        id: eventData.messageId || Date.now().toString(),
                        phoneNumber: eventData.phoneNumber || eventData.contactId,
                        text: eventData.text || '',
                        timestamp: eventData.timestamp || Date.now(),
                        isOutgoing: eventData.isOutgoing || false,
                        isRead: false,
                        status: 'received',
                        source: 'flutter_direct'
                    };
                    
                    const success = window.smsCore.storeMessage(message);
                    if (success) {
                        console.log('📱 ✅ Message forwarded to SMS Core successfully');
                    } else {
                        console.error('📱 ❌ Failed to store message in SMS Core');
                    }
                } catch (error) {
                    console.error('📱 ❌ Error forwarding to SMS Core:', error);
                }
            }
        }
    }

    // Export to global scope
    window.SmsEventRouter = SmsEventRouter;
    console.log('📱 SmsEventRouter class exported to window');

    // ============================================================================
    // GLOBAL SMS EVENT DEBUGGING - Independent Event Canary
    // ============================================================================
    // SMS event listeners for tracking message flow
    // ============================================================================



})();
