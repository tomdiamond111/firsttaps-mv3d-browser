/**
 * SMS Alert System Initializer
 * 
 * Coordinates initialization and integration of all SMS alert components:
 * - ContactAlertManager (alert state management)
 * - ContactNotificationRing (visual effects)
 * - SmsInteractionDetector (interaction detection)
 * 
 * Ensures proper startup order and integration with existing systems.
 */

class SmsAlertInitializer {
    constructor() {
        this.isInitialized = false;
        this.components = {
            alertManager: null,
            notificationRing: null,
            interactionDetector: null
        };
        
        this.initializationOrder = [
            'notificationRing',    // Visual system first
            'interactionDetector', // Interaction detection second
            'alertManager'         // Alert management last (coordinates others)
        ];

        console.log('🚀 SmsAlertInitializer: Starting SMS alert system initialization...');
        this.initialize();
    }

    /**
     * Initialize all SMS alert components
     */
    async initialize() {
        try {
            // ⚠️ CHECK FEATURE FLAG FIRST
            if (window.SMS_FEATURE_FLAGS && !window.SMS_FEATURE_FLAGS.ENABLE_SMS_ALERTS) {
                console.log('🚀 ⚠️ SMS Alert System: DISABLED by feature flag');
                console.log('🚀 ℹ️ Messages will still be detected and displayed - alerts are just turned off');
                this.isInitialized = false;
                return;
            }
            
            // Wait for required dependencies
            await this.waitForDependencies();
            
            // Initialize components in proper order
            await this.initializeComponents();
            
            // Set up integration between components
            this.setupComponentIntegration();
            
            // Set up global debugging
            this.setupGlobalDebugging();
            
            this.isInitialized = true;
            console.log('🚀 ✅ SMS Alert System: All components initialized successfully');
            
            // Global access
            window.smsAlertSystem = this;
            
        } catch (error) {
            console.error('🚀 ❌ SMS Alert System initialization failed:', error);
        }
    }

    /**
     * Wait for required dependencies
     */
    async waitForDependencies() {
        console.log('🚀 Waiting for dependencies...');
        
        // Wait for THREE.js
        await this.waitFor(() => window.THREE, 'THREE.js');
        
        // Wait for basic app structure
        await this.waitFor(() => window.app, 'App object');
        
        // Wait for SMS Core Manager (critical for contact ID resolution)
        let hasSmsCore = false;
        try {
            // First check if SMS Core Manager exists and has basic functionality
            await this.waitFor(() => {
                const exists = !!(window.smsCoreManager || window.SmsCoreManager);
                if (exists) {
                    console.log('🚀 SMS Core Manager found:', {
                        hasInstance: !!window.smsCoreManager,
                        hasClass: !!window.SmsCoreManager,
                        isInitialized: window.smsCoreManager?.isInitialized
                    });
                }
                return exists;
            }, 'SMS Core Manager (basic check)', 5000);
            
            // If basic check passes, wait for it to be initialized
            if (window.smsCoreManager && !window.smsCoreManager.isInitialized) {
                console.log('🚀 SMS Core Manager found but not initialized, waiting...');
                await this.waitFor(() => window.smsCoreManager?.isInitialized, 'SMS Core Manager initialization', 10000);
            }
            
            hasSmsCore = true;
            console.log('🚀 ✅ SMS Core Manager available for contact ID resolution');
        } catch (error) {
            console.warn('🚀 ⚠️ SMS Core Manager not available, contact ID resolution may be limited');
            console.warn('🚀 Available SMS objects:', {
                smsCoreManager: !!window.smsCoreManager,
                SmsCoreManager: !!window.SmsCoreManager,
                smsInitializer: !!window.smsInitializer,
                isInitialized: window.smsCoreManager?.isInitialized
            });
        }
        
        // Wait for ContactCustomizationManager (critical for persistence)
        // Try multiple approaches to ensure it's available
        let hasCustomizationManager = false;
        try {
            await this.waitFor(() => {
                // Method 1: Check if instance exists
                if (window.ContactCustomizationManager?.instance) {
                    return true;
                }
                
                // Method 2: Check if class exists and try to create instance
                if (window.ContactCustomizationManager && !window.ContactCustomizationManager.instance) {
                    console.log('🚀 Attempting to initialize ContactCustomizationManager...');
                    try {
                        if (window.app) {
                            window.ContactCustomizationManager.instance = new window.ContactCustomizationManager(window.app);
                            console.log('🚀 ✅ ContactCustomizationManager created successfully');
                            return true;
                        }
                    } catch (error) {
                        console.log('🚀 Could not create ContactCustomizationManager:', error);
                    }
                }
                
                return false;
            }, 'ContactCustomizationManager', 15000); // Extended timeout
            
            hasCustomizationManager = true;
            
        } catch (error) {
            console.warn('🚀 ⚠️ ContactCustomizationManager not available, alert persistence may be limited');
            console.warn('🚀 Proceeding with reduced functionality...');
        }
        
        console.log(`🚀 ✅ Dependencies ready (SMS Core: ${hasSmsCore}, customization manager: ${hasCustomizationManager})`);
        
        // FALLBACK: Even if SMS Core Manager is not available, continue with limited functionality
        if (!hasSmsCore) {
            console.log('🚀 💡 Continuing with fallback SMS functionality (limited contact ID resolution)');
        }
    }

    /**
     * Wait for a condition to be true
     */
    waitFor(condition, name, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const check = () => {
                if (condition()) {
                    console.log(`🚀 ✅ ${name} ready`);
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    console.error(`🚀 ❌ Timeout waiting for ${name}`);
                    reject(new Error(`Timeout waiting for ${name}`));
                } else {
                    setTimeout(check, 100);
                }
            };
            
            check();
        });
    }

    /**
     * Initialize components in proper order
     */
    async initializeComponents() {
        console.log('🚀 Initializing SMS alert components...');
        
        for (const componentName of this.initializationOrder) {
            try {
                await this.initializeComponent(componentName);
            } catch (error) {
                console.error(`🚀 ❌ Failed to initialize ${componentName}:`, error);
                throw error;
            }
        }
        
        console.log('🚀 ✅ All components initialized');
    }

    /**
     * Initialize a specific component
     */
    async initializeComponent(componentName) {
        console.log(`🚀 Initializing ${componentName}...`);
        
        switch (componentName) {
            case 'notificationRing':
                this.components.notificationRing = new ContactNotificationRing();
                break;
                
            case 'interactionDetector':
                this.components.interactionDetector = new SmsInteractionDetector();
                break;
                
            case 'alertManager':
                this.components.alertManager = new ContactAlertManager();
                break;
                
            default:
                throw new Error(`Unknown component: ${componentName}`);
        }
        
        // Wait a moment for component to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log(`🚀 ✅ ${componentName} initialized`);
    }

    /**
     * Set up integration between components
     */
    setupComponentIntegration() {
        try {
            console.log('🚀 Setting up component integration...');
            
            // Ensure components can find each other
            this.verifyComponentIntegration();
            
            // Set up cross-component event handling
            this.setupCrossComponentEvents();
            
            console.log('🚀 ✅ Component integration complete');
            
        } catch (error) {
            console.error('🚀 Error setting up component integration:', error);
        }
    }

    /**
     * Verify components can communicate
     */
    verifyComponentIntegration() {
        const requiredGlobals = [
            'contactNotificationRing',
            'smsInteractionDetector', 
            'contactAlertManager'
        ];
        
        const missing = requiredGlobals.filter(global => !window[global]);
        
        if (missing.length > 0) {
            console.warn('🚀 ⚠️ Missing global references:', missing);
        } else {
            console.log('🚀 ✅ All component globals available');
        }
    }

    /**
     * Set up cross-component event handling
     */
    setupCrossComponentEvents() {
        // Additional event coordination can be added here if needed
        // Currently, components communicate through global window events
        console.log('🚀 Cross-component events configured');
    }

    /**
     * Set up global debugging functions
     */
    setupGlobalDebugging() {
        // Comprehensive debug function
        window.debugSmsAlertSystem = () => {
            console.log('🚀 SMS ALERT SYSTEM DEBUG INFO:');
            console.log('='.repeat(50));
            
            console.log('\n📢 ALERT MANAGER:');
            if (window.contactAlertManager) {
                console.log(window.contactAlertManager.getDebugInfo());
            } else {
                console.log('❌ Not initialized');
            }
            
            console.log('\n💍 NOTIFICATION RING:');
            if (window.contactNotificationRing) {
                console.log(window.contactNotificationRing.getDebugInfo());
            } else {
                console.log('❌ Not initialized');
            }
            
            console.log('\n👆 INTERACTION DETECTOR:');
            if (window.smsInteractionDetector) {
                console.log(window.smsInteractionDetector.getDebugInfo());
            } else {
                console.log('❌ Not initialized');
            }
            
            console.log('\n🚀 SYSTEM STATUS:');
            console.log(this.getSystemStatus());
            
            console.log('\n🔧 AVAILABLE COMMANDS:');
            console.log('- debugSmsAlertSystem() - This debug info');
            console.log('- createTestAlert("contactId") - Create test alert');
            console.log('- clearTestAlert("contactId") - Clear test alert'); 
            console.log('- showTestRing("contactId") - Show test ring');
            console.log('- hideTestRing("contactId") - Hide test ring');
            console.log('- triggerTestInteraction("contactId") - Test interaction');
            console.log('- clearAllAlerts() - Clear all alerts');
            console.log('- hideAllRings() - Hide all rings');
        };
        
        // Quick test function
        window.testSmsAlert = (contactId = 'test123') => {
            console.log(`🚀 Running SMS alert test for contact ${contactId}...`);
            
            // Create alert
            if (window.contactAlertManager) {
                window.contactAlertManager.createAlert(contactId, 'test');
                console.log('✅ Alert created');
            }
            
            // Show ring
            if (window.contactNotificationRing) {
                setTimeout(() => {
                    window.contactNotificationRing.showAlert(contactId);
                    console.log('✅ Ring shown');
                }, 500);
            }
            
            // Clear after delay
            setTimeout(() => {
                if (window.contactAlertManager) {
                    window.contactAlertManager.manualClearAlert(contactId, 'test-complete');
                    console.log('✅ Alert cleared');
                }
                if (window.contactNotificationRing) {
                    window.contactNotificationRing.hideAlert(contactId);
                    console.log('✅ Ring hidden');
                }
                console.log('🚀 SMS alert test complete');
            }, 3000);
        };
        
        console.log('🚀 Global debugging functions available');
    }

    /**
     * Get system status
     */
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            components: {
                alertManager: !!this.components.alertManager,
                notificationRing: !!this.components.notificationRing,
                interactionDetector: !!this.components.interactionDetector
            },
            globals: {
                contactAlertManager: !!window.contactAlertManager,
                contactNotificationRing: !!window.contactNotificationRing,
                smsInteractionDetector: !!window.smsInteractionDetector
            },
            dependencies: {
                THREE: !!window.THREE,
                app: !!window.app,
                scene: !!window.app?.scene,
                contactManager: !!window.app?.contactManager,
                customizationManager: !!window.ContactCustomizationManager?.instance
            }
        };
    }

    /**
     * Enable debug mode for all components
     */
    enableDebugMode() {
        Object.values(this.components).forEach(component => {
            if (component && component.enableDebug) {
                component.enableDebug();
            }
        });
        console.log('🚀 Debug mode enabled for all components');
    }

    /**
     * Disable debug mode for all components
     */
    disableDebugMode() {
        Object.values(this.components).forEach(component => {
            if (component && component.disableDebug) {
                component.disableDebug();
            }
        });
        console.log('🚀 Debug mode disabled for all components');
    }

    /**
     * Get component references
     */
    getComponents() {
        return { ...this.components };
    }

    /**
     * Cleanup and dispose all components
     */
    dispose() {
        try {
            Object.values(this.components).forEach(component => {
                if (component && component.dispose) {
                    component.dispose();
                }
            });
            
            this.components = {
                alertManager: null,
                notificationRing: null,
                interactionDetector: null
            };
            
            this.isInitialized = false;
            
            console.log('🚀 SMS Alert System disposed');
            
        } catch (error) {
            console.error('🚀 Error disposing SMS Alert System:', error);
        }
    }
}

// Auto-initialize when dependencies are ready
if (typeof window !== 'undefined') {
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                window.smsAlertInitializer = new SmsAlertInitializer();
            }, 1000); // Small delay to ensure other systems are ready
        });
    } else {
        // DOM already ready
        setTimeout(() => {
            window.smsAlertInitializer = new SmsAlertInitializer();
        }, 1000);
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmsAlertInitializer;
}
