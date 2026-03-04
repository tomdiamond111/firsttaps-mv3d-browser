// ============================================================================
// SMS INTEGRATION HELPER - Connect New SMS Core with Existing 3D Systems
// ============================================================================

/**
 * SmsIntegrationHelper - Bridges new SMS Core with existing contact/SMS screen systems
 * 
 * This service provides:
 * - Integration with existing contact object lifecycle
 * - Connection of SMS screens to the new SMS Core system
 * - Maintains existing 3D interaction patterns
 * - Robust fallback when new system is unavailable
 */
class SmsIntegrationHelper {
    constructor() {
        this.integratedScreens = new Map(); // contactId -> integration info
        this.pendingIntegrations = [];
        this.isMonitoringContacts = false;
        
        this.initializeIntegration();
        console.log('SMS Integration Helper initialized');
    }

    /**
     * Initialize integration with existing systems
     */
    initializeIntegration() {
        try {
            // Wait for both old and new systems to be available
            this.waitForSystems().then(() => {
                this.setupContactMonitoring();
                this.processExistingScreens();
            });

        } catch (error) {
            console.error('Error initializing SMS integration:', error);
        }
    }

    /**
     * Wait for required systems to be available
     */
    async waitForSystems() {
        const maxWait = 30000; // 30 seconds
        const checkInterval = 500; // 500ms
        let elapsed = 0;

        while (elapsed < maxWait) {
            const systemsReady = this.checkSystemAvailability();
            
            if (systemsReady.core && systemsReady.adapter) {
                console.log('SMS Core systems are ready for integration');
                return true;
            }

            await this.delay(checkInterval);
            elapsed += checkInterval;
        }

        console.warn('Timeout waiting for SMS Core systems - proceeding with fallback mode');
        return false;
    }

    /**
     * Check if required systems are available
     */
    checkSystemAvailability() {
        return {
            core: !!(window.smsCore && window.smsCore.isInitialized),
            adapter: !!(window.smsScreenAdapter),
            bridge: !!(window.smsBridgeManager),
            contactManager: !!(window.contactManager),
            objectCreators: !!(window.objectCreators)
        };
    }

    /**
     * Set up monitoring of contact object lifecycle
     */
    setupContactMonitoring() {
        if (this.isMonitoringContacts) {
            return;
        }

        try {
            // Listen for contact creation events
            window.addEventListener('contact_created', (event) => {
                this.handleContactCreated(event.detail);
            });

            // Listen for contact deletion events  
            window.addEventListener('contact_deleted', (event) => {
                this.handleContactDeleted(event.detail);
            });

            // Listen for SMS screen creation events
            window.addEventListener('sms_screen_created', (event) => {
                this.handleSmsScreenCreated(event.detail);
            });

            // Listen for SMS screen destruction events
            window.addEventListener('sms_screen_destroyed', (event) => {
                this.handleSmsScreenDestroyed(event.detail);
            });

            this.isMonitoringContacts = true;
            console.log('Contact lifecycle monitoring established');

        } catch (error) {
            console.error('Error setting up contact monitoring:', error);
        }
    }

    /**
     * Process existing SMS screens for integration
     */
    processExistingScreens() {
        try {
            if (!window.contactManager || !window.contactManager.contacts) {
                console.log('Contact manager not available, skipping existing screen processing');
                return;
            }

            const contacts = window.contactManager.contacts;
            let processedCount = 0;

            contacts.forEach((contact, contactId) => {
                if (contact.smsScreen) {
                    this.integrateExistingSmsScreen(contactId, contact);
                    processedCount++;
                }
            });

            console.log(`Processed ${processedCount} existing SMS screens for integration`);

        } catch (error) {
            console.error('Error processing existing SMS screens:', error);
        }
    }

    /**
     * Handle new contact creation
     */
    handleContactCreated(contactData) {
        try {
            console.log('Contact created, monitoring for SMS screen:', contactData.contactId);
            
            // SMS screen may be created after contact, so we'll catch it in handleSmsScreenCreated

        } catch (error) {
            console.error('Error handling contact creation:', error);
        }
    }

    /**
     * Handle contact deletion
     */
    handleContactDeleted(contactData) {
        try {
            const contactId = contactData.contactId;
            
            if (this.integratedScreens.has(contactId)) {
                console.log('Contact deleted, cleaning up SMS screen integration:', contactId);
                this.cleanupScreenIntegration(contactId);
            }

        } catch (error) {
            console.error('Error handling contact deletion:', error);
        }
    }

    /**
     * Handle SMS screen creation
     */
    handleSmsScreenCreated(screenData) {
        try {
            const { contactId, screenObject, phoneNumber } = screenData;
            
            console.log('SMS screen created, integrating with SMS Core:', {
                contactId,
                phoneNumber
            });

            this.integrateSmsScreen(contactId, screenObject, phoneNumber);

        } catch (error) {
            console.error('Error handling SMS screen creation:', error);
        }
    }

    /**
     * Handle SMS screen destruction
     */
    handleSmsScreenDestroyed(screenData) {
        try {
            const { contactId } = screenData;
            
            if (this.integratedScreens.has(contactId)) {
                console.log('SMS screen destroyed, cleaning up integration:', contactId);
                this.cleanupScreenIntegration(contactId);
            }

        } catch (error) {
            console.error('Error handling SMS screen destruction:', error);
        }
    }

    /**
     * Integrate existing SMS screen with new SMS Core
     */
    integrateExistingSmsScreen(contactId, contact) {
        try {
            if (!contact.smsScreen || !contact.phoneNumber) {
                console.warn('Contact missing SMS screen or phone number:', contactId);
                return false;
            }

            return this.integrateSmsScreen(contactId, contact.smsScreen, contact.phoneNumber);

        } catch (error) {
            console.error('Error integrating existing SMS screen:', error);
            return false;
        }
    }

    /**
     * Integrate SMS screen with SMS Core system
     */
    integrateSmsScreen(contactId, screenObject, phoneNumber) {
        try {
            const systems = this.checkSystemAvailability();
            
            if (!systems.adapter) {
                console.warn('SMS Screen Adapter not available, queuing integration');
                this.pendingIntegrations.push({ contactId, screenObject, phoneNumber });
                return false;
            }

            // Register screen with adapter
            const success = window.smsScreenAdapter.registerSmsScreen(phoneNumber, screenObject);
            
            if (success) {
                // Store integration info
                this.integratedScreens.set(contactId, {
                    phoneNumber: phoneNumber,
                    screenObject: screenObject,
                    integratedAt: Date.now(),
                    isActive: true
                });

                // Enhance screen object with new functionality
                this.enhanceScreenObject(screenObject, phoneNumber);

                console.log(`SMS screen integrated successfully: ${contactId} -> ${phoneNumber}`);
                return true;
            } else {
                console.error('Failed to register SMS screen with adapter');
                return false;
            }

        } catch (error) {
            console.error('Error integrating SMS screen:', error);
            return false;
        }
    }

    /**
     * Enhance screen object with new SMS Core functionality
     */
    enhanceScreenObject(screenObject, phoneNumber) {
        try {
            // Add SMS Core send method if not present
            if (!screenObject.sendMessageViaCore) {
                screenObject.sendMessageViaCore = async (message) => {
                    if (window.smsScreenAdapter) {
                        return await window.smsScreenAdapter.sendMessageFromScreen(phoneNumber, message);
                    } else {
                        console.error('SMS Screen Adapter not available');
                        return { success: false, error: 'Adapter not available' };
                    }
                };
            }

            // Add message retrieval method
            if (!screenObject.getMessagesFromCore) {
                screenObject.getMessagesFromCore = () => {
                    if (window.smsCore) {
                        return window.smsCore.getMessages(phoneNumber);
                    } else {
                        console.error('SMS Core not available');
                        return [];
                    }
                };
            }

            // Add conversation state method
            if (!screenObject.getConversationState) {
                screenObject.getConversationState = () => {
                    if (window.smsCore) {
                        return window.smsCore.getConversationState(phoneNumber);
                    } else {
                        return null;
                    }
                };
            }

            // Add core status check method
            if (!screenObject.isCoreAvailable) {
                screenObject.isCoreAvailable = () => {
                    return !!(window.smsCore && window.smsCore.isInitialized);
                };
            }

            console.log('SMS screen object enhanced with SMS Core functionality');

        } catch (error) {
            console.error('Error enhancing screen object:', error);
        }
    }

    /**
     * Clean up screen integration
     */
    cleanupScreenIntegration(contactId) {
        try {
            const integration = this.integratedScreens.get(contactId);
            
            if (integration) {
                // Unregister from adapter
                if (window.smsScreenAdapter) {
                    window.smsScreenAdapter.unregisterSmsScreen(integration.phoneNumber);
                }

                // Remove integration record
                this.integratedScreens.delete(contactId);
                
                console.log(`SMS screen integration cleaned up: ${contactId}`);
            }

        } catch (error) {
            console.error('Error cleaning up screen integration:', error);
        }
    }

    /**
     * Process pending integrations
     */
    processPendingIntegrations() {
        if (this.pendingIntegrations.length === 0) {
            return;
        }

        console.log(`Processing ${this.pendingIntegrations.length} pending SMS integrations`);

        const pending = this.pendingIntegrations.splice(0);
        
        pending.forEach(integration => {
            this.integrateSmsScreen(
                integration.contactId,
                integration.screenObject,
                integration.phoneNumber
            );
        });
    }

    /**
     * Get integration status for debugging
     */
    getIntegrationStatus() {
        return {
            integratedScreens: this.integratedScreens.size,
            pendingIntegrations: this.pendingIntegrations.length,
            isMonitoringContacts: this.isMonitoringContacts,
            systemAvailability: this.checkSystemAvailability(),
            screenList: Array.from(this.integratedScreens.entries()).map(([contactId, info]) => ({
                contactId,
                phoneNumber: info.phoneNumber,
                integratedAt: info.integratedAt
            }))
        };
    }

    /**
     * Force integration of all current SMS screens
     */
    forceIntegrateAllScreens() {
        console.log('Force integrating all current SMS screens...');
        
        this.processExistingScreens();
        this.processPendingIntegrations();
        
        return this.getIntegrationStatus();
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup integration helper
     */
    cleanup() {
        this.integratedScreens.clear();
        this.pendingIntegrations = [];
        this.isMonitoringContacts = false;
        
        console.log('SMS Integration Helper cleaned up');
    }
}

// Create global instance and start monitoring
if (typeof window !== 'undefined') {
    // Wait a bit for SMS Core system to initialize
    setTimeout(() => {
        window.smsIntegrationHelper = new SmsIntegrationHelper();
        console.log('Global SMS Integration Helper created');
        
        // Process pending integrations periodically
        setInterval(() => {
            if (window.smsIntegrationHelper) {
                window.smsIntegrationHelper.processPendingIntegrations();
            }
        }, 5000);
        
    }, 2000);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmsIntegrationHelper;
}
