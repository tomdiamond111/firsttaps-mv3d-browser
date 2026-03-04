/**
 * SMS Event Coordinator - Centralized SMS Event Management
 * 
 * PURPOSE: Eliminate race conditions and timing issues in SMS system
 * APPROACH: Single event handler that coordinates all SMS subsystems
 * 
 * ELIMINATES:
 * - Multiple event listeners competing for same events
 * - Race conditions between alert and display systems
 * - Timing dependencies between initialization
 * 
 * COORDINATES:
 * - SmsSimpleCore (message display)
 * - ContactAlertManager (blue circle alerts)
 * - SmsAlertSystem (experimental alerts)
 * - Real-time message updates
 */

class SmsEventCoordinator {
    constructor() {
        this.isInitialized = false;
        this.debugMode = true; // Set to false to reduce logging
        
        // Subsystem references
        this.subsystems = {
            simpleCore: null,
            alertManager: null,
            alertSystem: null,
            notificationRing: null
        };
        
        // Event queue for handling events before subsystems are ready
        this.eventQueue = [];
        this.maxQueueSize = 50;
        
        // Event processing state
        this.isProcessingEvent = false;
        this.lastProcessedEventId = null;
        
        console.log('🎯 SMS Event Coordinator: Initializing centralized event management...');
        this.initialize();
    }
    
    /**
     * Initialize the coordinator and set up centralized event handling
     */
    async initialize() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Set up centralized event listeners
            this.setupEventListeners();
            
            // Wait for subsystems to be available
            await this.waitForSubsystems();
            
            // Process any queued events
            this.processEventQueue();
            
            this.isInitialized = true;
            console.log('🎯 SMS Event Coordinator: ✅ Initialization complete');
            
            // Set up global debugging
            this.setupGlobalDebugging();
            
        } catch (error) {
            console.error('🎯 SMS Event Coordinator: ❌ Initialization failed:', error);
        }
    }
    
    /**
     * Set up centralized event listeners - SINGLE SOURCE OF TRUTH
     */
    setupEventListeners() {
        // Primary SMS data event listener
        window.addEventListener('flutter-sms-data', (event) => {
            this.handleSmsEvent(event.detail, 'flutter-sms-data');
        });
        
        // SMS input events
        window.addEventListener('flutter-sms-input-response', (event) => {
            this.handleSmsEvent(event.detail, 'flutter-sms-input-response');
        });
        
        // Real-time SMS events
        window.addEventListener('sms-new-message', (event) => {
            this.handleSmsEvent(event.detail, 'sms-new-message');
        });
        
        // SMS screen events
        window.addEventListener('sms-screen-opened', (event) => {
            this.handleSmsEvent(event.detail, 'sms-screen-opened');
        });
        
        window.addEventListener('sms-screen-closed', (event) => {
            this.handleSmsEvent(event.detail, 'sms-screen-closed');
        });
        
        console.log('🎯 SMS Event Coordinator: Event listeners established');
    }
    
    /**
     * Handle all SMS events through single coordination point
     */
    handleSmsEvent(eventData, eventType) {
        try {
            // Prevent duplicate event processing
            const eventId = `${eventType}_${JSON.stringify(eventData)}_${Date.now()}`;
            if (this.lastProcessedEventId === eventId) {
                if (this.debugMode) {
                    console.log(`🎯 Skipping duplicate event: ${eventType}`);
                }
                return;
            }
            this.lastProcessedEventId = eventId;
            
            if (this.debugMode) {
                console.log(`🎯 SMS Event Coordinator: Processing ${eventType}`, eventData);
            }
            
            // Queue event if subsystems not ready
            if (!this.isInitialized) {
                this.queueEvent(eventData, eventType);
                return;
            }
            
            // Process event immediately if not already processing
            if (!this.isProcessingEvent) {
                this.isProcessingEvent = true;
                this.processEvent(eventData, eventType);
                this.isProcessingEvent = false;
            } else {
                // Queue for later processing
                this.queueEvent(eventData, eventType);
            }
            
        } catch (error) {
            console.error('🎯 SMS Event Coordinator: Error handling event:', error);
            this.isProcessingEvent = false;
        }
    }
    
    /**
     * Process a single SMS event by coordinating subsystems
     */
    processEvent(eventData, eventType) {
        switch (eventType) {
            case 'flutter-sms-data':
                this.handleSmsDataEvent(eventData);
                break;
                
            case 'flutter-sms-input-response':
                this.handleSmsInputEvent(eventData);
                break;
                
            case 'sms-new-message':
                this.handleNewMessageEvent(eventData);
                break;
                
            case 'sms-screen-opened':
                this.handleScreenOpenedEvent(eventData);
                break;
                
            case 'sms-screen-closed':
                this.handleScreenClosedEvent(eventData);
                break;
                
            default:
                if (this.debugMode) {
                    console.log(`🎯 Unknown event type: ${eventType}`);
                }
        }
    }
    
    /**
     * Handle flutter-sms-data events (message updates)
     */
    handleSmsDataEvent(eventData) {
        if (!eventData) return;
        
        // 1. Update message display (SmsSimpleCore) - HIGH PRIORITY
        if (this.subsystems.simpleCore) {
            // Use the correct method for updating conversation
            if (eventData.messages && Array.isArray(eventData.messages)) {
                this.subsystems.simpleCore.updateConversation(eventData.contactId, eventData.messages);
            } else {
                // Delegate to the simple core's existing event handling
                this.subsystems.simpleCore.handleFlutterData(eventData);
            }
        }
        
        // 2. Handle incoming message alerts - SECONDARY PRIORITY
        if (eventData.action === 'incoming_message' && eventData.contactId) {
            this.triggerIncomingMessageAlert(eventData);
        }
        
        if (this.debugMode) {
            console.log(`🎯 Processed SMS data event: ${eventData.action} for contact ${eventData.contactId}`);
        }
    }
    
    /**
     * Handle new incoming messages with coordinated alert system
     */
    handleNewMessageEvent(eventData) {
        const { contactId, message } = eventData;
        
        // Check if in-app contact alerts are enabled (Google Play compliance)
        const alertsEnabled = window.isSmsFeatureEnabled && 
                            window.isSmsFeatureEnabled('ENABLE_IN_APP_CONTACT_ALERTS');
        
        if (!alertsEnabled) {
            if (this.debugMode) {
                console.log(`🎯 In-app contact alerts disabled - skipping visual indicators`);
            }
            return;
        }
        
        // 1. Trigger blue circle alert (ContactAlertManager)
        if (this.subsystems.alertManager) {
            this.subsystems.alertManager.createAlert(contactId, 'sms');
        }
        
        // 2. Show notification ring
        if (this.subsystems.notificationRing) {
            this.subsystems.notificationRing.showAlert(contactId);
        }
        
        // 3. Experimental alert system
        if (this.subsystems.alertSystem) {
            this.subsystems.alertSystem.triggerTestAlert(contactId, message?.text || 'New message');
        }
        
        if (this.debugMode) {
            console.log(`🎯 Processed new message event for contact ${contactId}`);
        }
    }
    
    /**
     * Handle SMS screen opened events
     */
    handleScreenOpenedEvent(eventData) {
        // Don't immediately clear alerts - wait for user interaction
        if (this.debugMode) {
            console.log(`🎯 SMS screen opened for contact ${eventData.contactId} - alerts preserved`);
        }
    }
    
    /**
     * Handle SMS screen closed events
     */
    handleScreenClosedEvent(eventData) {
        if (this.debugMode) {
            console.log(`🎯 SMS screen closed for contact ${eventData.contactId}`);
        }
    }
    
    /**
     * Handle SMS input response events
     */
    handleSmsInputEvent(eventData) {
        if (this.debugMode) {
            console.log(`🎯 SMS input event: ${eventData.action} for contact ${eventData.contactId}`);
        }
    }
    
    /**
     * Trigger incoming message alert through coordination
     */
    triggerIncomingMessageAlert(eventData) {
        const alertData = {
            contactId: eventData.contactId,
            messageText: eventData.message?.text || 'New message',
            timestamp: Date.now(),
            phoneNumber: eventData.message?.phoneNumber
        };
        
        // Dispatch coordinated alert event
        const alertEvent = new CustomEvent('sms-new-message', {
            detail: alertData
        });
        window.dispatchEvent(alertEvent);
    }
    
    /**
     * Queue events for later processing
     */
    queueEvent(eventData, eventType) {
        if (this.eventQueue.length >= this.maxQueueSize) {
            this.eventQueue.shift(); // Remove oldest event
        }
        
        this.eventQueue.push({
            data: eventData,
            type: eventType,
            timestamp: Date.now()
        });
        
        if (this.debugMode) {
            console.log(`🎯 Queued event: ${eventType} (queue size: ${this.eventQueue.length})`);
        }
    }
    
    /**
     * Process queued events
     */
    processEventQueue() {
        if (this.eventQueue.length === 0) return;
        
        console.log(`🎯 Processing ${this.eventQueue.length} queued events...`);
        
        while (this.eventQueue.length > 0) {
            const queuedEvent = this.eventQueue.shift();
            this.processEvent(queuedEvent.data, queuedEvent.type);
        }
        
        console.log('🎯 Event queue processing complete');
    }
    
    /**
     * Wait for subsystems to become available
     */
    async waitForSubsystems() {
        const maxWaitTime = 10000; // 10 seconds
        const checkInterval = 100; // 100ms
        let waited = 0;
        
        console.log('🎯 Waiting for SMS subsystems...');
        
        while (waited < maxWaitTime) {
            // Check for SmsSimpleCore
            if (window.smsSimpleCore) {
                this.subsystems.simpleCore = window.smsSimpleCore;
            }
            
            // Check for ContactAlertManager
            if (window.contactAlertManager) {
                this.subsystems.alertManager = window.contactAlertManager;
            }
            
            // Check for SmsAlertSystem
            if (window.smsAlertSystem) {
                this.subsystems.alertSystem = window.smsAlertSystem;
            }
            
            // Check for ContactNotificationRing
            if (window.contactNotificationRing) {
                this.subsystems.notificationRing = window.contactNotificationRing;
            }
            
            // Check if we have core subsystems
            if (this.subsystems.simpleCore && this.subsystems.alertManager) {
                console.log('🎯 Core SMS subsystems ready');
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        console.log('🎯 Subsystem availability:', {
            simpleCore: !!this.subsystems.simpleCore,
            alertManager: !!this.subsystems.alertManager,
            alertSystem: !!this.subsystems.alertSystem,
            notificationRing: !!this.subsystems.notificationRing
        });
    }
    
    /**
     * Subscribe to events by category
     */
    subscribe(category, callback) {
        // For now, we'll use a simpler approach - register callbacks directly
        if (category === 'messageDisplay') {
            // For message display, register the callback to be called on SMS data events
            const originalHandler = this.handleSmsDataEvent.bind(this);
            this.handleSmsDataEvent = (eventData) => {
                originalHandler(eventData);
                if (callback && typeof callback === 'function') {
                    try {
                        callback({
                            type: 'sms-data',
                            action: eventData.action,
                            contactId: eventData.contactId,
                            data: eventData
                        });
                    } catch (error) {
                        console.error('🎯 Error in message display callback:', error);
                    }
                }
            };
            console.log('🎯 SMS Event Coordinator: Message display subscriber registered');
        } else if (category === 'alerts') {
            // For alerts, register the callback to be called on new message events
            const originalHandler = this.handleNewMessageEvent.bind(this);
            this.handleNewMessageEvent = (eventData) => {
                originalHandler(eventData);
                if (callback && typeof callback === 'function') {
                    try {
                        callback({
                            type: 'sms-new-message',
                            action: 'incoming_message',
                            contactId: eventData.contactId,
                            data: eventData
                        });
                    } catch (error) {
                        console.error('🎯 Error in alert callback:', error);
                    }
                }
            };
            console.log('🎯 SMS Event Coordinator: Alert subscriber registered');
        }
    }
    
    /**
     * Manual alert clearing for user interactions
     */
    clearAlertsForContact(contactId, reason = 'user-interaction') {
        if (this.subsystems.alertManager) {
            this.subsystems.alertManager.manualClearAlert(contactId, reason);
        }
        
        if (this.subsystems.notificationRing) {
            this.subsystems.notificationRing.hideAlert(contactId);
        }
        
        if (this.debugMode) {
            console.log(`🎯 Cleared alerts for contact ${contactId} (${reason})`);
        }
    }
    
    /**
     * Setup global debugging functions
     */
    setupGlobalDebugging() {
        window.smsEventCoordinator = this;
        
        window.debugSmsEvents = () => {
            this.debugMode = !this.debugMode;
            console.log(`🎯 SMS Event debugging: ${this.debugMode ? 'ON' : 'OFF'}`);
        };
        
        window.showSmsSystemStatus = () => {
            console.log('🎯 SMS System Status:', {
                coordinator: !!this,
                initialized: this.isInitialized,
                processing: this.isProcessingEvent,
                queueSize: this.eventQueue.length,
                subsystems: this.subsystems
            });
        };
        
        window.testSmsCoordination = (contactId = 'test123') => {
            console.log(`🎯 Testing SMS coordination for contact ${contactId}...`);
            
            // Simulate new message
            this.handleNewMessageEvent({
                contactId: contactId,
                message: { text: 'Test coordination message', phoneNumber: '+1234567890' }
            });
            
            console.log('🎯 Test complete - check for coordinated alerts');
        };
        
        console.log('🎯 SMS Event Coordinator debugging functions available:');
        console.log('- debugSmsEvents() - Toggle debug logging');
        console.log('- showSmsSystemStatus() - Show system status');
        console.log('- testSmsCoordination(contactId) - Test coordination');
    }
}

// Initialize the coordinator
console.log('🎯 SMS Event Coordinator: Starting initialization...');
window.smsEventCoordinator = new SmsEventCoordinator();
