/**
 * SMS Screen Integration Service
 * 
 * Integrates the new SMS Core system with existing SMS screens while
 * maintaining all 3D world interaction patterns (tap, double-tap, etc.)
 * 
 * This service acts as a bridge between:
 * - SMS Core Manager (new robust system)
 * - Existing SMS Screen objects (3D world integration)
 * - Contact objects (3D positioning and lifecycle)
 */

(function() {
    'use strict';

    class SmsScreenIntegration {
        constructor() {
            this.isInitialized = false;
            this.debugMode = true;
            
            // Track integrated SMS screens
            this.integratedScreens = new Map(); // contactId -> integration data
            
            // Screen state tracking
            this.screenStates = new Map(); // contactId -> state info
            
            this.log('SMS Screen Integration initialized');
        }

        /**
         * Initialize the integration service
         */
        async initialize() {
            if (this.isInitialized) {
                this.log('SMS Screen Integration already initialized');
                return true;
            }

            try {
                this.log('Initializing SMS Screen Integration...');
                
                // Wait for SMS Core Manager to be ready
                if (!window.smsCoreManager?.isInitialized) {
                    await this.waitForSmsCoreManager();
                }
                
                // Set up screen monitoring
                this.setupScreenMonitoring();
                
                // Set up event handlers
                this.setupEventHandlers();
                
                // Patch existing SMS screen methods
                this.patchSmsScreenMethods();
                
                this.isInitialized = true;
                this.log('✅ SMS Screen Integration initialized successfully');
                
                return true;
                
            } catch (error) {
                this.logError('❌ Failed to initialize SMS Screen Integration:', error);
                return false;
            }
        }

        /**
         * Wait for SMS Core Manager to be ready
         */
        async waitForSmsCoreManager() {
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (window.smsCoreManager?.isInitialized) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 50);
            });
        }

        /**
         * Set up monitoring for SMS screen creation and lifecycle
         */
        setupScreenMonitoring() {
            // Monitor contact manager for new contacts with SMS screens
            const checkForNewSmsScreens = () => {
                if (window.app?.contactManager?.contacts) {
                    for (const [contactId, contact] of window.app.contactManager.contacts) {
                        if (contact.smsScreen && !this.integratedScreens.has(contactId)) {
                            this.integrateWithSmsScreen(contactId, contact);
                        }
                    }
                }
            };
            
            // Check periodically for new SMS screens
            setInterval(checkForNewSmsScreens, 1000);
            
            // Also check immediately
            checkForNewSmsScreens();
            
            this.log('SMS screen monitoring set up');
        }

        /**
         * Set up event handlers for SMS Core events
         */
        setupEventHandlers() {
            // Listen for SMS screen visibility changes
            window.addEventListener('sms-screen-visibility-changed', (event) => {
                this.handleScreenVisibilityChange(event.detail);
            });
            
            // Listen for contact lifecycle events
            window.addEventListener('contact-created', (event) => {
                this.handleContactCreated(event.detail);
            });
            
            window.addEventListener('contact-deleted', (event) => {
                this.handleContactDeleted(event.detail);
            });
            
            this.log('Event handlers set up');
        }

        /**
         * Integrate with an existing SMS screen
         */
        integrateWithSmsScreen(contactId, contact) {
            try {
                this.log(`Integrating with SMS screen for contact: ${contactId}`);
                
                const smsScreen = contact.smsScreen;
                const contactData = contact.contactData;
                
                if (!smsScreen || !contactData) {
                    this.logError(`Missing SMS screen or contact data for ${contactId}`);
                    return;
                }
                
                // Register contact with SMS Core if not already done
                if (contactData.phoneNumber && window.smsCoreManager) {
                    window.smsCoreManager.registerContact(
                        contactId,
                        contactData.name || contactId,
                        contactData.phoneNumber,
                        contactData.avatar
                    );
                }
                
                // Create integration data
                const integrationData = {
                    contactId: contactId,
                    smsScreen: smsScreen,
                    contactData: contactData,
                    originalMethods: {},
                    isVisible: smsScreen.isVisible || false,
                    lastUpdate: Date.now(),
                };
                
                // Patch SMS screen methods for robustness
                this.patchScreenMethods(integrationData);
                
                // Set up screen event handlers
                this.setupScreenEventHandlers(integrationData);
                
                // Store integration data
                this.integratedScreens.set(contactId, integrationData);
                
                this.log(`✅ SMS screen integrated for contact: ${contactId}`);
                
                // If screen is already visible, mark as active
                if (smsScreen.isVisible) {
                    this.handleScreenShown(contactId);
                }
                
            } catch (error) {
                this.logError(`Error integrating SMS screen for ${contactId}:`, error);
            }
        }

        /**
         * Patch SMS screen methods for robustness
         */
        patchScreenMethods(integrationData) {
            const { contactId, smsScreen, originalMethods } = integrationData;
            
            // Store original methods
            originalMethods.show = smsScreen.show?.bind(smsScreen);
            originalMethods.hide = smsScreen.hide?.bind(smsScreen);
            originalMethods.updateMessages = smsScreen.updateMessages?.bind(smsScreen);
            originalMethods.renderInterface = smsScreen.renderInterface?.bind(smsScreen);
            
            // Patch show method
            if (smsScreen.show) {
                smsScreen.show = (...args) => {
                    this.log(`SMS screen show called for ${contactId}`);
                    this.handleScreenShown(contactId);
                    return originalMethods.show(...args);
                };
            }
            
            // Patch hide method
            if (smsScreen.hide) {
                smsScreen.hide = (...args) => {
                    this.log(`SMS screen hide called for ${contactId}`);
                    this.handleScreenHidden(contactId);
                    return originalMethods.hide(...args);
                };
            }
            
            // Patch updateMessages method for robustness
            if (smsScreen.updateMessages) {
                smsScreen.updateMessages = (messages) => {
                    this.log(`Robust updateMessages called for ${contactId}: ${messages?.length || 0} messages`);
                    
                    try {
                        // Validate messages array
                        if (!Array.isArray(messages)) {
                            this.logError(`Invalid messages array for ${contactId}:`, messages);
                            return;
                        }
                        
                        // Process messages to ensure consistent format
                        const processedMessages = this.processMessages(messages);
                        
                        // Call original method with processed messages
                        return originalMethods.updateMessages(processedMessages);
                        
                    } catch (error) {
                        this.logError(`Error in updateMessages for ${contactId}:`, error);
                        
                        // Fallback: try with empty array
                        try {
                            return originalMethods.updateMessages([]);
                        } catch (fallbackError) {
                            this.logError(`Fallback updateMessages also failed for ${contactId}:`, fallbackError);
                        }
                    }
                };
            }
            
            // Patch renderInterface method for throttling bypass
            if (smsScreen.renderInterface) {
                smsScreen.renderInterface = (bypassThrottle = true, updateType = 'integration') => {
                    try {
                        // Always bypass throttling for Core updates
                        if (updateType === 'core_update' || updateType === 'integration') {
                            bypassThrottle = true;
                        }
                        
                        // Clear any existing throttling
                        if (smsScreen.renderThrottleTimeout) {
                            clearTimeout(smsScreen.renderThrottleTimeout);
                            smsScreen.renderThrottleTimeout = null;
                        }
                        
                        // Reset throttling flags
                        smsScreen.isRendering = false;
                        smsScreen.lastRenderTime = 0;
                        
                        return originalMethods.renderInterface(bypassThrottle, updateType);
                        
                    } catch (error) {
                        this.logError(`Error in renderInterface for ${contactId}:`, error);
                    }
                };
            }
            
            this.log(`SMS screen methods patched for ${contactId}`);
        }

        /**
         * Set up event handlers for an SMS screen
         */
        setupScreenEventHandlers(integrationData) {
            const { contactId, smsScreen } = integrationData;
            
            // Monitor visibility changes
            const originalVisible = smsScreen.isVisible;
            
            Object.defineProperty(smsScreen, 'isVisible', {
                get: function() {
                    return this._isVisible !== undefined ? this._isVisible : originalVisible;
                },
                set: function(value) {
                    const previousValue = this._isVisible;
                    this._isVisible = value;
                    
                    // Trigger visibility change handler
                    if (previousValue !== value) {
                        setTimeout(() => {
                            if (value) {
                                window.smsScreenIntegration.handleScreenShown(contactId);
                            } else {
                                window.smsScreenIntegration.handleScreenHidden(contactId);
                            }
                        }, 0);
                    }
                }
            });
            
            this.log(`Event handlers set up for SMS screen: ${contactId}`);
        }

        /**
         * Handle SMS screen shown
         */
        handleScreenShown(contactId) {
            try {
                this.log(`📱 SMS screen shown for contact: ${contactId}`);
                
                // Mark as active in SMS Core
                if (window.smsCoreManager) {
                    window.smsCoreManager.markSmsScreenActive(contactId);
                }
                
                // Update screen state
                const integrationData = this.integratedScreens.get(contactId);
                if (integrationData) {
                    integrationData.isVisible = true;
                    integrationData.lastUpdate = Date.now();
                }
                
                // Load conversation immediately
                this.loadConversationForScreen(contactId);
                
                // Dispatch event
                window.dispatchEvent(new CustomEvent('sms-screen-shown', {
                    detail: { contactId }
                }));
                
            } catch (error) {
                this.logError(`Error handling screen shown for ${contactId}:`, error);
            }
        }

        /**
         * Handle SMS screen hidden
         */
        handleScreenHidden(contactId) {
            try {
                this.log(`📱 SMS screen hidden for contact: ${contactId}`);
                
                // Mark as inactive in SMS Core
                if (window.smsCoreManager) {
                    window.smsCoreManager.markSmsScreenInactive(contactId);
                }
                
                // Update screen state
                const integrationData = this.integratedScreens.get(contactId);
                if (integrationData) {
                    integrationData.isVisible = false;
                    integrationData.lastUpdate = Date.now();
                }
                
                // Dispatch event
                window.dispatchEvent(new CustomEvent('sms-screen-hidden', {
                    detail: { contactId }
                }));
                
            } catch (error) {
                this.logError(`Error handling screen hidden for ${contactId}:`, error);
            }
        }

        /**
         * Load conversation for a specific screen
         */
        async loadConversationForScreen(contactId) {
            try {
                this.log(`Loading conversation for screen: ${contactId}`);
                
                if (!window.smsCoreManager) {
                    this.logError('SMS Core Manager not available');
                    return;
                }
                
                const conversation = await window.smsCoreManager.getConversationByContactId(contactId);
                
                if (conversation && conversation.messages) {
                    this.updateScreenWithMessages(contactId, conversation.messages);
                } else {
                    this.log(`No conversation data for ${contactId}`);
                }
                
            } catch (error) {
                this.logError(`Error loading conversation for ${contactId}:`, error);
            }
        }

        /**
         * Update screen with messages
         */
        updateScreenWithMessages(contactId, messages) {
            try {
                const integrationData = this.integratedScreens.get(contactId);
                if (!integrationData || !integrationData.smsScreen) {
                    this.logError(`No integration data found for ${contactId}`);
                    return;
                }
                
                const smsScreen = integrationData.smsScreen;
                
                this.log(`Updating screen ${contactId} with ${messages.length} messages`);
                
                // Update messages using the patched method
                if (smsScreen.updateMessages) {
                    smsScreen.updateMessages(messages);
                }
                
                // Force render
                if (smsScreen.renderInterface) {
                    smsScreen.renderInterface(true, 'core_update');
                }
                
                // Update texture
                if (smsScreen.texture) {
                    smsScreen.texture.needsUpdate = true;
                }
                
            } catch (error) {
                this.logError(`Error updating screen ${contactId} with messages:`, error);
            }
        }

        /**
         * Process messages to ensure consistent format
         */
        processMessages(messages) {
            if (!Array.isArray(messages)) {
                return [];
            }
            
            return messages.map(msg => {
                // Ensure required fields
                return {
                    id: msg.id || `msg_${Date.now()}_${Math.random()}`,
                    text: msg.text || '',
                    timestamp: msg.timestamp || Date.now(),
                    type: msg.type || (msg.isOutgoing ? 'sent' : 'received'),
                    isOutgoing: msg.isOutgoing || false,
                    status: msg.status || 'unknown',
                    phoneNumber: msg.phoneNumber || '',
                    ...msg // Keep any additional fields
                };
            }).sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
        }

        /**
         * Patch existing SMS screen methods globally
         */
        patchSmsScreenMethods() {
            // This will be called for any SMS screens that already exist
            if (window.SMSScreenClass) {
                const originalConstructor = window.SMSScreenClass;
                
                // Wrap the constructor to auto-integrate new SMS screens
                window.SMSScreenClass = function(...args) {
                    const instance = new originalConstructor(...args);
                    
                    // Schedule integration after construction
                    setTimeout(() => {
                        if (instance.contactData?.id) {
                            window.smsScreenIntegration?.integrateWithSmsScreen(
                                instance.contactData.id,
                                { smsScreen: instance, contactData: instance.contactData }
                            );
                        }
                    }, 0);
                    
                    return instance;
                };
                
                // Copy static properties
                Object.setPrototypeOf(window.SMSScreenClass, originalConstructor);
                Object.setPrototypeOf(window.SMSScreenClass.prototype, originalConstructor.prototype);
                
                this.log('SMS Screen class patched for auto-integration');
            }
        }

        /**
         * Handle contact lifecycle events
         */
        handleContactCreated(contactData) {
            this.log(`Contact created: ${contactData.id}`);
            // Integration will happen automatically when SMS screen is detected
        }

        handleContactDeleted(contactData) {
            const contactId = contactData.id;
            this.log(`Contact deleted: ${contactId}`);
            
            // Clean up integration data
            this.integratedScreens.delete(contactId);
            
            // Notify SMS Core
            if (window.smsCoreManager) {
                window.smsCoreManager.markSmsScreenInactive(contactId);
            }
        }

        handleScreenVisibilityChange(data) {
            const { contactId, isVisible } = data;
            
            if (isVisible) {
                this.handleScreenShown(contactId);
            } else {
                this.handleScreenHidden(contactId);
            }
        }

        /**
         * Get integration status for debugging
         */
        getIntegrationStatus() {
            const status = {
                isInitialized: this.isInitialized,
                integratedScreens: this.integratedScreens.size,
                screenStates: {},
            };
            
            for (const [contactId, data] of this.integratedScreens) {
                status.screenStates[contactId] = {
                    isVisible: data.isVisible,
                    lastUpdate: data.lastUpdate,
                    hasPhoneNumber: !!data.contactData?.phoneNumber,
                };
            }
            
            return status;
        }

        /**
         * Force refresh all visible SMS screens
         */
        refreshAllVisibleScreens() {
            this.log('Refreshing all visible SMS screens...');
            
            for (const [contactId, data] of this.integratedScreens) {
                if (data.isVisible) {
                    this.loadConversationForScreen(contactId);
                }
            }
        }

        /**
         * Logging utilities
         */
        log(message, ...args) {
            if (this.debugMode) {
                console.log(`🔗 [SmsScreenIntegration] ${message}`, ...args);
            }
        }

        logError(message, ...args) {
            console.error(`❌ [SmsScreenIntegration] ${message}`, ...args);
        }

        /**
         * Cleanup resources
         */
        dispose() {
            this.integratedScreens.clear();
            this.screenStates.clear();
            this.isInitialized = false;
            
            this.log('SMS Screen Integration disposed');
        }
    }

    // Create global instance
    window.SmsScreenIntegration = SmsScreenIntegration;
    window.smsScreenIntegration = new SmsScreenIntegration();

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.smsScreenIntegration.initialize();
        });
    } else {
        window.smsScreenIntegration.initialize();
    }

    // Add to global test functions
    if (window.smsTest) {
        window.smsTest.integration = {
            status: () => window.smsScreenIntegration.getIntegrationStatus(),
            refresh: () => window.smsScreenIntegration.refreshAllVisibleScreens(),
            debug: () => window.smsScreenIntegration.getIntegrationStatus(),
        };
    }

    console.log('🔗 SMS Screen Integration loaded');

})();
