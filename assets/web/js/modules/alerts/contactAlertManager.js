/**
 * Contact Alert Manager
 * 
 * Manages SMS unread alert states for contact objects using the existing
 * ContactCustomizationManager persistence architecture for within-session persistence.
 * 
 * Features:
 * - Binary unread flag (not message count)
 * - Within-session persistence (home ↔ 3D world navigation)
 * - No cross-restart persistence (prevents stale alerts)
 * - Non-intrusive SMS event observation
 * - Isolated from SMS send/receive pipeline
 */

class ContactAlertManager {
    constructor() {
        this.debugMode = false;
        this.isInitialized = false;
        this.eventListenersActive = false;
        
        // Alert state tracking (in memory for immediate access)
        this.activeAlerts = new Map(); // contactId -> alertData
        
        // Performance tracking
        this.alertStats = {
            alertsCreated: 0,
            alertsCleared: 0,
            persistenceOperations: 0,
            lastActivity: null
        };
        
        console.log('📢 ContactAlertManager: Initializing SMS alert system...');
        this.initialize();
    }

    /**
     * Initialize the alert manager
     */
    async initialize() {
        try {
            // ⚠️ CHECK FEATURE FLAG FIRST
            if (window.SMS_FEATURE_FLAGS && !window.SMS_FEATURE_FLAGS.ENABLE_SMS_ALERTS) {
                console.log('📢 ⚠️ ContactAlertManager: DISABLED by feature flag');
                this.isInitialized = false;
                return;
            }
            
            // Wait for ContactCustomizationManager to be ready
            await this.waitForContactCustomizationManager();
            
            // Load any existing alert states from ContactCustomizationManager
            this.loadAlertStates();
            
            // Set up SMS event listeners (non-intrusive observers)
            this.setupSmsEventListeners();
            
            // Set up contact interaction listeners
            this.setupContactInteractionListeners();
            
            this.isInitialized = true;
            console.log('📢 ✅ ContactAlertManager: Initialization complete');
            
            // Global access for debugging
            window.contactAlertManager = this;
            
            // Add debug test function for manual testing
            window.testSmsAlert = (contactId = '357') => {
                console.log(`📢 🧪 MANUAL ALERT TEST: Triggering alert for contact ${contactId}`);
                this.handleNewMessage(contactId, 'manual-test');
                
                // Also test the visual ring directly
                if (window.contactNotificationRing) {
                    console.log(`📢 🧪 MANUAL RING TEST: Showing ring for contact ${contactId}`);
                    window.contactNotificationRing.showAlert(contactId);
                } else {
                    console.warn('📢 🧪 WARNING: contactNotificationRing not available for test');
                }
            };
            
            // Add debug function to clear alerts
            window.clearSmsAlert = (contactId = '357') => {
                console.log(`📢 🧹 CLEARING ALERT for contact ${contactId}`);
                this.clearAlert(contactId, 'manual-clear');
                
                // Also clear visual ring
                if (window.contactNotificationRing) {
                    console.log(`📢 🧹 CLEARING VISUAL RING for contact ${contactId}`);
                    window.contactNotificationRing.hideAlert(contactId);
                }
            };
            
            // Add debug function to check contact notification ring availability
            window.checkAlertSystem = () => {
                console.log('📢 🔍 ALERT SYSTEM STATUS:');
                console.log('  - ContactNotificationRing available:', !!window.contactNotificationRing);
                if (window.contactNotificationRing) {
                    console.log('  - ContactNotificationRing methods:', Object.getOwnPropertyNames(window.contactNotificationRing));
                }
                console.log('  - Active alerts:', this.activeAlerts.size);
                for (let [contactId, alert] of this.activeAlerts) {
                    console.log(`    - Contact ${contactId}:`, alert);
                }
                console.log('  - Alert stats:', this.alertStats);
            };
            
            console.log('📢 🧪 Debug: Use testSmsAlert("357") to manually test alert system');
            console.log('📢 🧹 Debug: Use clearSmsAlert("357") to clear existing alert');
            console.log('📢 🔍 Debug: Use checkAlertSystem() to check system status');
            
        } catch (error) {
            console.error('📢 ❌ ContactAlertManager initialization failed:', error);
        }
    }

    /**
     * Wait for ContactCustomizationManager to be available
     */
    async waitForContactCustomizationManager() {
        return new Promise((resolve) => {
            const checkManager = () => {
                if (window.ContactCustomizationManager?.instance) {
                    console.log('📢 ContactCustomizationManager found - alert persistence ready');
                    resolve();
                } else {
                    setTimeout(checkManager, 100);
                }
            };
            checkManager();
        });
    }

    /**
     * Load existing alert states from ContactCustomizationManager
     */
    loadAlertStates() {
        try {
            const customizationManager = window.ContactCustomizationManager.instance;
            if (!customizationManager) return;

            const loadedCount = [];
            
            // Iterate through all contact customizations to find alert data
            customizationManager.customizationData.forEach((customization, contactId) => {
                if (customization.smsUnreadAlert === true) {
                    const alertData = {
                        hasUnread: true,
                        alertCreated: customization.alertLastUpdated || Date.now(),
                        source: 'loaded'
                    };
                    
                    this.activeAlerts.set(contactId, alertData);
                    loadedCount.push(contactId);
                }
            });

            if (loadedCount.length > 0) {
                console.log(`📢 Loaded ${loadedCount.length} existing alert states:`, loadedCount);
            }
            
        } catch (error) {
            console.error('📢 Error loading alert states:', error);
        }
    }

    /**
     * Set up SMS event listeners (read-only observers)
     */
    setupSmsEventListeners() {
        if (this.eventListenersActive) return;

        try {
            // Listen for new message events (multiple event types for reliability)
            window.addEventListener('sms-message-received', (event) => {
                const { contactId, phoneNumber } = event.detail || {};
                const resolvedId = contactId || phoneNumber;
                if (resolvedId) {
                    this.handleNewMessage(resolvedId, 'sms-message-received');
                }
            });

            window.addEventListener('sms-new-message', (event) => {
                const { contactId, phoneNumber } = event.detail || {};
                const resolvedId = contactId || phoneNumber;
                if (resolvedId) {
                    this.handleNewMessage(resolvedId, 'sms-new-message');
                }
            });

            window.addEventListener('message_received', (event) => {
                const { contactId, phoneNumber } = event.detail || {};
                const resolvedId = contactId || phoneNumber;
                if (resolvedId) {
                    this.handleNewMessage(resolvedId, 'message_received');
                }
            });

            // Listen for Flutter SMS bridge events
            window.addEventListener('flutter-sms-bridge-data', (event) => {
                const data = event.detail;
                if (data?.type === 'message_received') {
                    const resolvedId = data.contactId || data.phoneNumber;
                    if (resolvedId) {
                        this.handleNewMessage(resolvedId, 'flutter-sms-bridge-data');
                    }
                }
            });

            // Listen for SMS Core Manager events (phone number based)
            window.addEventListener('sms-core-message-received', (event) => {
                const { phoneNumber, contactId } = event.detail || {};
                const resolvedId = contactId || phoneNumber;
                if (resolvedId) {
                    this.handleNewMessage(resolvedId, 'sms-core-message-received');
                }
            });

            // INTEGRATION: Listen for Flutter SMS events that SMS Simple Core handles
            // These are the same events that trigger real-time SMS functionality
            window.addEventListener('flutter-sms-data', (event) => {
                const data = event.detail;
                if (data && data.contactId) {
                    console.log(`📢 Alert System: Processing flutter-sms-data for ${data.contactId}, action: ${data.action}`);
                    
                    // Handle conversation data updates - check for new received messages
                    if (data.action === 'get_conversation' && data.messages && Array.isArray(data.messages)) {
                        this.analyzeConversationForNewMessages(data.contactId, data.messages, 'flutter-sms-data-conversation');
                    }
                    
                    // Handle direct message events
                    else if (data.action === 'incoming_message' && data.contactId) {
                        console.log(`📢 Alert System: Detected incoming message via flutter-sms-data for ${data.contactId}`);
                        this.handleNewMessage(data.contactId, 'flutter-sms-data-incoming');
                    }
                }
            });

            window.addEventListener('flutter-sms-input-response', (event) => {
                const data = event.detail;
                if (data && data.contactId) {
                    console.log(`📢 Alert System: Processing flutter-sms-input-response for ${data.contactId}, action: ${data.action}`);
                    
                    if (data.action === 'message_received') {
                        console.log(`📢 Alert System: Detected received message via flutter-sms-input-response for ${data.contactId}`);
                        this.handleNewMessage(data.contactId, 'flutter-sms-input-response');
                    }
                }
            });

            window.addEventListener('incoming_message', (event) => {
                const data = event.detail;
                if (data && data.contactId) {
                    console.log(`📢 Alert System: Detected incoming message event for ${data.contactId}`);
                    this.handleNewMessage(data.contactId, 'incoming_message');
                }
            });

            window.addEventListener('sms-content-observer', (event) => {
                const data = event.detail;
                if (data && data.contactId) {
                    console.log(`📢 Alert System: Detected SMS content observer event for ${data.contactId}`);
                    this.handleNewMessage(data.contactId, 'sms-content-observer');
                }
            });

            // CRITICAL: Listen for the NEW real-time events that we added for instant messaging
            window.addEventListener('flutter-incoming-message', (event) => {
                const data = event.detail;
                if (data && data.contactId) {
                    console.log(`📢 Alert System: 🚨 REAL-TIME incoming message detected for ${data.contactId}`);
                    this.handleNewMessage(data.contactId, 'flutter-incoming-message-realtime');
                }
            });

            window.addEventListener('flutter-message-sent', (event) => {
                const data = event.detail;
                if (data && data.contactId) {
                    console.log(`📢 Alert System: Real-time sent message detected for ${data.contactId} - clearing any alerts`);
                    // When user sends a message, clear any unread alerts for that contact
                    this.clearAlert(data.contactId, 'user-sent-message');
                }
            });

            window.addEventListener('flutter-outgoing-message', (event) => {
                const data = event.detail;
                if (data && data.contactId) {
                    console.log(`📢 Alert System: Real-time outgoing message detected for ${data.contactId} - clearing any alerts`);
                    // When user sends a message, clear any unread alerts for that contact
                    this.clearAlert(data.contactId, 'user-outgoing-message');
                }
            });

            this.eventListenersActive = true;
            console.log('📢 SMS event listeners established (read-only observers) - supports both contactId and phoneNumber');
            console.log('📢 🔗 Alert System integrated with SMS Simple Core events');
            
        } catch (error) {
            console.error('📢 Error setting up SMS event listeners:', error);
        }
    }

    /**
     * Analyze conversation data for new received messages
     * This detects incoming messages from conversation updates
     */
    analyzeConversationForNewMessages(contactId, messages, eventSource) {
        try {
            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                console.log(`📢 Alert System: No messages to analyze for ${contactId}`);
                return;
            }

            console.log(`📢 Alert System: Analyzing ${messages.length} messages for new received messages (contact: ${contactId})`);
            
            // Debug: Log the first few messages to see what we're working with
            console.log(`📢 Alert System: 🔍 First 3 messages:`, messages.slice(0, 3).map(m => ({
                id: m.id,
                text: m.text,
                type: m.type,
                timestamp: m.timestamp,
                timeAgo: `${Math.round((Date.now() - m.timestamp) / 1000 / 60)}min ago`
            })));

            // Get the most recent message
            const latestMessage = messages[0]; // Messages are typically sorted newest first
            
            // Check if it's a received message (not sent by user)
            if (latestMessage && latestMessage.type === 'received') {
                console.log(`📢 Alert System: Found received message from ${eventSource}: "${latestMessage.text}" (contact: ${contactId})`);
                
                // Check if this is a new message we haven't seen before
                const messageAge = Date.now() - latestMessage.timestamp;
                const isRecentMessage = messageAge < (5 * 60 * 1000); // Within last 5 minutes (more generous)
                
                if (isRecentMessage) {
                    console.log(`📢 Alert System: Recent received message detected (${messageAge}ms ago) - triggering alert for ${contactId}`);
                    this.handleNewMessage(contactId, `${eventSource}-recent-received`);
                } else {
                    console.log(`📢 Alert System: Message is older (${messageAge}ms ago) - but checking if it needs alert anyway`);
                    
                    // FORCE ALERT FOR TESTING - Remove this condition to make it always trigger for received messages
                    console.log(`📢 Alert System: 🧪 TESTING MODE - Triggering alert regardless of age for received message`);
                    this.handleNewMessage(contactId, `${eventSource}-force-test`);
                }
            } else {
                console.log(`📢 Alert System: Latest message is not received type: ${latestMessage?.type} for ${contactId}`);
                if (latestMessage) {
                    console.log(`📢 Alert System: Latest message details:`, {
                        text: latestMessage.text,
                        type: latestMessage.type,
                        timestamp: latestMessage.timestamp,
                        id: latestMessage.id
                    });
                }
            }
            
        } catch (error) {
            console.error('📢 Error analyzing conversation for new messages:', error);
        }
    }

    /**
     * Set up contact interaction listeners to clear alerts
     * INTEGRATED WITH SMS SIMPLE CORE - Clear alerts when users interact with SMS
     */
    setupContactInteractionListeners() {
        try {
            // Listen for SMS screen interactive mode entry (double-tap)
            window.addEventListener('sms-screen-interactive-mode', (event) => {
                const { contactId } = event.detail || {};
                if (contactId) {
                    this.clearAlert(contactId, 'interactive-mode-entry');
                }
            });

            // Listen for SMS screen visibility changes
            window.addEventListener('sms-screen-visibility-changed', (event) => {
                const { contactId, visible, interactive } = event.detail || {};
                if (contactId && visible && interactive) {
                    this.clearAlert(contactId, 'interactive-visibility');
                }
            });

            // INTEGRATION: Listen for SMS screen registration (when user opens SMS screen)
            // MODIFIED: Don't clear alerts just for opening SMS screen
            // Instead, clear only when user actually interacts with messages
            const originalRegisterSmsScreen = window.smsSimpleCore?.registerSmsScreen;
            if (originalRegisterSmsScreen && window.smsSimpleCore) {
                window.smsSimpleCore.registerSmsScreen = (contactId, smsScreen) => {
                    // Call the original function first
                    const result = originalRegisterSmsScreen.call(window.smsSimpleCore, contactId, smsScreen);
                    
                    // DON'T clear alert immediately when SMS screen opens
                    // Alert should persist until user actually scrolls or interacts with messages
                    console.log(`📢 Alert System: SMS screen registered for ${contactId} - keeping alert until user interaction`);
                    
                    return result;
                };
                console.log('📢 🔗 Alert System: Hooked into SMS screen registration (alerts persist until user interaction)');
            }

            // INTEGRATION: Monitor for SMS screen interactions via DOM events
            document.addEventListener('click', (event) => {
                // Check if click is on or within an SMS screen element
                const smsElement = event.target.closest('[data-contact-id]');
                if (smsElement) {
                    const contactId = smsElement.getAttribute('data-contact-id');
                    if (contactId) {
                        // Small delay to ensure this is a deliberate interaction
                        setTimeout(() => {
                            this.clearAlert(contactId, 'sms-element-interaction');
                        }, 100);
                    }
                }
            });

            console.log('📢 Contact interaction listeners established - automatic alert clearing enabled');

            console.log('📢 Contact interaction listeners established');
            
        } catch (error) {
            console.error('📢 Error setting up contact interaction listeners:', error);
        }
    }

    /**
     * Handle new message arrival (create alert)
     */
    handleNewMessage(contactId, eventSource) {
        try {
            if (!contactId) return;

            // Resolve contact ID from phone number if needed
            const resolvedContactId = this.resolveContactId(contactId);
            if (!resolvedContactId) {
                console.warn(`📢 Could not resolve contact ID: ${contactId} from ${eventSource}`);
                return;
            }

            // Normalize contact ID
            const normalizedContactId = this.normalizeContactId(resolvedContactId);
            
            console.log(`📢 New message for contact ${normalizedContactId} (resolved from ${contactId}, source: ${eventSource})`);
            
            // Check if alert already exists
            if (this.activeAlerts.has(normalizedContactId)) {
                const existingAlert = this.activeAlerts.get(normalizedContactId);
                const alertAge = Date.now() - existingAlert.alertCreated;
                
                console.log(`📢 ⚠️ Alert already exists for contact ${normalizedContactId} - age: ${alertAge}ms, source: ${existingAlert.source}`);
                
                // If existing alert is older than 10 minutes, replace it with new one
                if (alertAge > (10 * 60 * 1000)) {
                    console.log(`📢 🔄 Replacing old alert (${alertAge}ms) with new one for contact ${normalizedContactId}`);
                    this.activeAlerts.delete(normalizedContactId);
                    // Continue to create new alert
                } else {
                    // Fresh alert exists, just trigger visual alert to ensure it's visible
                    console.log(`📢 ♻️ Existing alert is fresh, re-triggering visual alert for contact ${normalizedContactId}`);
                    this.triggerVisualAlert(normalizedContactId);
                    
                    // Also force refresh to ensure new messages are visible
                    this.forceConversationRefresh(normalizedContactId);
                    return;
                }
            }

            // Create new alert
            const alertData = {
                hasUnread: true,
                alertCreated: Date.now(),
                source: eventSource
            };

            this.activeAlerts.set(normalizedContactId, alertData);
            this.alertStats.alertsCreated++;
            this.alertStats.lastActivity = Date.now();

            // Persist to ContactCustomizationManager
            this.persistAlertState(normalizedContactId, alertData);

            // Trigger visual alert
            this.triggerVisualAlert(normalizedContactId);

            // Force refresh conversation data to ensure new messages are visible
            this.forceConversationRefresh(normalizedContactId);

            console.log(`📢 🔔 New SMS alert created for contact ${normalizedContactId} (source: ${eventSource})`);
            
        } catch (error) {
            console.error('📢 Error handling new message:', error);
        }
    }

    /**
     * Clear alert for a contact (user engaged with SMS)
     */
    clearAlert(contactId, reason) {
        try {
            if (!contactId) return;

            const normalizedContactId = this.normalizeContactId(contactId);
            
            if (!this.activeAlerts.has(normalizedContactId)) {
                if (this.debugMode) {
                    console.log(`📢 No alert to clear for contact ${normalizedContactId}`);
                }
                return;
            }

            // Remove from active alerts
            this.activeAlerts.delete(normalizedContactId);
            this.alertStats.alertsCleared++;
            this.alertStats.lastActivity = Date.now();

            // Remove from ContactCustomizationManager persistence
            this.clearPersistedAlertState(normalizedContactId);

            // Clear visual alert
            this.clearVisualAlert(normalizedContactId);

            console.log(`📢 ✅ SMS alert cleared for contact ${normalizedContactId} (reason: ${reason})`);
            
        } catch (error) {
            console.error('📢 Error clearing alert:', error);
        }
    }

    /**
     * Persist alert state to ContactCustomizationManager
     */
    persistAlertState(contactId, alertData) {
        try {
            const customizationManager = window.ContactCustomizationManager.instance;
            if (!customizationManager) {
                console.warn('📢 ContactCustomizationManager not available for alert persistence');
                return;
            }

            // Get existing customization or create new one
            let customization = customizationManager.customizationData.get(contactId) || {};
            
            // Add alert data
            customization.smsUnreadAlert = true;
            customization.alertLastUpdated = alertData.alertCreated;

            // Save to customization manager
            customizationManager.customizationData.set(contactId, customization);
            customizationManager.saveCustomizations();

            this.alertStats.persistenceOperations++;
            
            if (this.debugMode) {
                console.log(`📢 Alert state persisted for contact ${contactId}`);
            }
            
        } catch (error) {
            console.error('📢 Error persisting alert state:', error);
        }
    }

    /**
     * Clear persisted alert state from ContactCustomizationManager
     */
    clearPersistedAlertState(contactId) {
        try {
            const customizationManager = window.ContactCustomizationManager.instance;
            if (!customizationManager) return;

            const customization = customizationManager.customizationData.get(contactId);
            if (customization) {
                // Remove alert data while preserving other customization data
                delete customization.smsUnreadAlert;
                delete customization.alertLastUpdated;
                
                customizationManager.customizationData.set(contactId, customization);
                customizationManager.saveCustomizations();

                this.alertStats.persistenceOperations++;
            }
            
        } catch (error) {
            console.error('📢 Error clearing persisted alert state:', error);
        }
    }

    /**
     * Trigger visual alert for a contact
     */
    triggerVisualAlert(contactId) {
        try {
            console.log(`📢 💫 TRIGGERING VISUAL ALERT for contact: ${contactId}`);
            
            // Check if ContactNotificationRing is available
            if (window.contactNotificationRing) {
                console.log(`📢 💫 ContactNotificationRing available - calling showAlert(${contactId})`);
                
                // Try to show the alert
                window.contactNotificationRing.showAlert(contactId);
                
                // Verify the ring was created
                setTimeout(() => {
                    const ringExists = window.contactNotificationRing.activeRings?.has(contactId);
                    console.log(`📢 💫 Ring verification for ${contactId}: exists=${ringExists}`);
                    
                    if (!ringExists) {
                        console.warn(`📢 💫 Ring failed to appear for ${contactId} - will retry in 1 second`);
                        setTimeout(() => {
                            console.log(`📢 💫 RETRYING visual alert for contact: ${contactId}`);
                            window.contactNotificationRing.showAlert(contactId);
                        }, 1000);
                    }
                }, 100);
                
            } else {
                console.warn(`📢 💫 ContactNotificationRing NOT AVAILABLE! Attempting to initialize...`);
                
                // Try to initialize ContactNotificationRing if it doesn't exist
                if (typeof ContactNotificationRing !== 'undefined') {
                    console.log(`📢 💫 Attempting to create ContactNotificationRing instance`);
                    window.contactNotificationRing = new ContactNotificationRing();
                    
                    // Retry after initialization
                    setTimeout(() => {
                        if (window.contactNotificationRing) {
                            console.log(`📢 💫 ContactNotificationRing initialized - retrying showAlert(${contactId})`);
                            window.contactNotificationRing.showAlert(contactId);
                        }
                    }, 500);
                } else {
                    console.error(`📢 💫 ContactNotificationRing class not available!`);
                }
            }
            
            // Dispatch event for other systems
            window.dispatchEvent(new CustomEvent('contact-alert-created', {
                detail: { contactId, timestamp: Date.now() }
            }));
            
            console.log(`📢 💫 Visual alert trigger complete for contact: ${contactId}`);
            
        } catch (error) {
            console.error('📢 Error triggering visual alert:', error);
        }
    }

    /**
     * Clear visual alert for a contact
     */
    clearVisualAlert(contactId) {
        try {
            // Request visual ring removal
            if (window.contactNotificationRing) {
                window.contactNotificationRing.hideAlert(contactId);
            }
            
            // Dispatch event for other systems
            window.dispatchEvent(new CustomEvent('contact-alert-cleared', {
                detail: { contactId, timestamp: Date.now() }
            }));
            
        } catch (error) {
            console.error('📢 Error clearing visual alert:', error);
        }
    }

    /**
     * Normalize contact ID for consistent indexing
     */
    normalizeContactId(contactId) {
        if (!contactId) return 'unknown';
        
        // Remove contact:// prefix if present
        if (contactId.startsWith('contact://')) {
            return contactId.substring(10);
        }
        
        return String(contactId);
    }

    /**
     * Check if contact has active alert
     */
    hasAlert(contactId) {
        const normalizedContactId = this.normalizeContactId(contactId);
        return this.activeAlerts.has(normalizedContactId);
    }

    /**
     * Get alert data for contact
     */
    getAlertData(contactId) {
        const normalizedContactId = this.normalizeContactId(contactId);
        return this.activeAlerts.get(normalizedContactId);
    }

    /**
     * Get all active alerts
     */
    getAllAlerts() {
        return Array.from(this.activeAlerts.entries()).map(([contactId, alertData]) => ({
            contactId,
            ...alertData
        }));
    }

    /**
     * Manual alert creation (for testing)
     */
    createAlert(contactId, reason = 'manual') {
        this.handleNewMessage(contactId, reason);
    }

    /**
     * Manual alert clearing (for testing)
     */
    manualClearAlert(contactId, reason = 'manual') {
        this.clearAlert(contactId, reason);
    }

    /**
     * Clear all alerts (for cleanup)
     */
    clearAllAlerts(reason = 'bulk-clear') {
        try {
            const alertIds = Array.from(this.activeAlerts.keys());
            alertIds.forEach(contactId => {
                this.clearAlert(contactId, reason);
            });
            
            console.log(`📢 Cleared ${alertIds.length} alerts (reason: ${reason})`);
            
        } catch (error) {
            console.error('📢 Error clearing all alerts:', error);
        }
    }

    /**
     * Get alert statistics
     */
    getStats() {
        return {
            ...this.alertStats,
            activeAlertCount: this.activeAlerts.size,
            isInitialized: this.isInitialized,
            eventListenersActive: this.eventListenersActive
        };
    }

    /**
     * Resolve contact ID from phone number using SMS core mapping
     * INTEGRATED WITH SMS SIMPLE CORE - Uses working contact ID resolution
     */
    resolveContactId(identifier) {
        if (!identifier) return null;

        // If it's already a known contact ID, return it
        if (this.isKnownContactId(identifier)) {
            return identifier;
        }

        // INTEGRATION: Use SMS Simple Core resolution (the working system)
        if (window.smsSimpleCore && window.smsSimpleCore.resolveContactId) {
            try {
                const resolvedId = window.smsSimpleCore.resolveContactId(identifier);
                if (resolvedId && resolvedId !== identifier) {
                    console.log(`📢 Alert System: Resolved ${identifier} -> ${resolvedId} via SMS Simple Core`);
                    return resolvedId;
                }
            } catch (error) {
                console.warn(`📢 Alert System: SMS Simple Core resolution failed for ${identifier}:`, error);
            }
        }

        // FALLBACK: Use SMS Contact Resolver directly
        if (window.smsContactResolver) {
            try {
                // Check if it's a phone number and try to map it
                if (identifier.startsWith('+')) {
                    const contactId = window.smsContactResolver.mapPhoneToContactId(identifier);
                    if (contactId) {
                        console.log(`📢 Alert System: Resolved phone ${identifier} -> contact ${contactId} via resolver`);
                        return contactId;
                    }
                }
            } catch (error) {
                console.warn(`📢 Alert System: Contact resolver failed for ${identifier}:`, error);
            }
        }

        // LEGACY: Check if it's a phone number that can be mapped to a contact ID
        if (window.smsCoreManager && window.smsCoreManager.phoneToContact) {
            // Try direct phone number lookup
            let contactId = window.smsCoreManager.phoneToContact.get(identifier);
            if (contactId) {
                console.log(`📢 Alert System: Resolved phone ${identifier} -> contact ${contactId} via legacy core`);
                return contactId;
            }

            // Try normalized phone number lookup
            if (window.smsCoreManager.normalizePhoneNumber) {
                const normalizedPhone = window.smsCoreManager.normalizePhoneNumber(identifier);
                contactId = window.smsCoreManager.phoneToContact.get(normalizedPhone);
                if (contactId) {
                    console.log(`📢 Alert System: Resolved normalized phone ${normalizedPhone} -> contact ${contactId} via legacy core`);
                    return contactId;
                }
            }
        }

        // If we can't resolve it, treat it as a contact ID directly
        console.log(`📢 Alert System: Using identifier as contact ID: ${identifier}`);
        return identifier;
    }

    /**
     * Check if an identifier is a known contact ID
     * INTEGRATED WITH SMS SIMPLE CORE - Uses working contact system
     */
    isKnownContactId(identifier) {
        // Check if it's in our active alerts
        if (this.activeAlerts.has(identifier)) {
            return true;
        }

        // INTEGRATION: Check if it's in SMS Simple Core active screens (the working system)
        if (window.smsSimpleCore && window.smsSimpleCore.activeSmsScreens) {
            if (window.smsSimpleCore.activeSmsScreens.has(identifier)) {
                return true;
            }
        }

        // INTEGRATION: Check SMS Simple Core contact ID mapping
        if (window.smsSimpleCore && window.smsSimpleCore.contactIdMapping) {
            // Check if the identifier maps to a known contact
            const mappedContactId = window.smsSimpleCore.contactIdMapping.get(identifier);
            if (mappedContactId && window.smsSimpleCore.activeSmsScreens.has(mappedContactId)) {
                return true;
            }
        }

        // LEGACY: Check if it's in SMS core contact mappings
        if (window.smsCoreManager && window.smsCoreManager.contactMappings) {
            return window.smsCoreManager.contactMappings.has(identifier);
        }

        // Check if it looks like a contact ID (not a phone number)
        const phonePattern = /^\+?[\d\s\-\(\)\.]{10,}$/;
        return !phonePattern.test(identifier);
    }

    /**
     * Force refresh conversation data to ensure new messages are visible
     */
    forceConversationRefresh(contactId) {
        try {
            console.log(`📢 🔄 Force refreshing conversation data for contact ${contactId}`);
            
            // Try multiple methods to force refresh conversation data
            
            // Method 1: Use SMS Integration Manager if available
            if (window.app?.smsIntegrationManager) {
                console.log(`📢 🔄 Triggering SMS Integration Manager refresh for ${contactId}`);
                
                // Force refresh via channel manager
                if (window.app.smsChannelManager) {
                    const payload = {
                        action: 'get_conversation',
                        contactId: contactId,
                        limit: 100,
                        forceRefresh: true,
                        messageId: `alert_refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    };
                    
                    console.log(`📢 🔄 Sending force refresh request:`, payload);
                    window.app.smsChannelManager.sendRequest('data', payload);
                }
            }
            
            // Method 2: Use SMS Simple Core if available
            if (window.smsSimpleCore) {
                console.log(`📢 🔄 Triggering SMS Simple Core refresh for ${contactId}`);
                
                // Force update conversation cache
                if (window.smsSimpleCore.forceRefreshConversation) {
                    window.smsSimpleCore.forceRefreshConversation(contactId);
                } else {
                    // Clear cache to force fresh fetch
                    if (window.smsSimpleCore.conversationCache) {
                        window.smsSimpleCore.conversationCache.delete(contactId);
                        console.log(`📢 🔄 Cleared conversation cache for ${contactId}`);
                    }
                }
            }
            
            // Method 3: Dispatch custom event for other systems to handle
            window.dispatchEvent(new CustomEvent('alert-force-refresh-conversation', {
                detail: { 
                    contactId: contactId, 
                    timestamp: Date.now(),
                    reason: 'new-alert-created'
                }
            }));
            
        } catch (error) {
            console.error('📢 Error forcing conversation refresh:', error);
        }
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
        this.debugMode = true;
        console.log('📢 Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disableDebug() {
        this.debugMode = false;
        console.log('📢 Debug mode disabled');
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            initialized: this.isInitialized,
            eventListeners: this.eventListenersActive,
            activeAlerts: this.getAllAlerts(),
            stats: this.getStats(),
            customizationManager: !!window.ContactCustomizationManager?.instance,
            notificationRing: !!window.contactNotificationRing
        };
    }
}

// Global functions for debugging and console access
window.debugContactAlerts = () => {
    if (window.contactAlertManager) {
        console.log('📢 CONTACT ALERT DEBUG INFO:');
        console.log(window.contactAlertManager.getDebugInfo());
    } else {
        console.log('📢 ContactAlertManager not initialized');
    }
};

window.createTestAlert = (contactId) => {
    if (window.contactAlertManager) {
        window.contactAlertManager.createAlert(contactId, 'test');
        console.log(`📢 Test alert created for contact ${contactId}`);
    }
};

window.clearTestAlert = (contactId) => {
    if (window.contactAlertManager) {
        window.contactAlertManager.manualClearAlert(contactId, 'test');
        console.log(`📢 Test alert cleared for contact ${contactId}`);
    }
};

window.clearAllAlerts = () => {
    if (window.contactAlertManager) {
        window.contactAlertManager.clearAllAlerts('manual');
    }
};

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContactAlertManager;
}
