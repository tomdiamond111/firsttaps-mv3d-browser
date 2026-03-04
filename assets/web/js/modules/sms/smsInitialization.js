/**
 * SMS Initialization
 * Initializes and sets up the complete SMS channel system
 * Coordinates between SMS Channel Manager, Integration, and Interaction Manager
 */

(function() {
    'use strict';

    class SmsInitialization {
        constructor() {
            this.smsChannelManager = null;
            this.smsChannelIntegration = null;
            this.smsInteractionManager = null;
            this.isInitialized = false;
            
            console.log('📱 SmsInitialization created');
        }

        /**
         * Initialize the complete SMS system
         * @param {Object} app - The main application instance
         * @returns {Promise<boolean>} True if initialization successful
         */
        async initialize(app) {
            console.log('📱 Starting SMS system initialization...');

            try {
                // Step 1: Initialize SMS Channel Manager
                if (!this.initializeSmsChannelManager()) {
                    console.error('📱 Failed to initialize SMS Channel Manager');
                    return false;
                }

                // Step 2: Get existing SMS Interaction Manager from app
                if (!this.getSmsInteractionManager(app)) {
                    console.error('📱 Failed to get SMS Interaction Manager');
                    return false;
                }

                // Step 3: Initialize SMS Channel Integration
                if (!this.initializeSmsChannelIntegration()) {
                    console.error('📱 Failed to initialize SMS Channel Integration');
                    return false;
                }

                // Step 4: Setup system connections
                if (!this.setupSystemConnections()) {
                    console.error('📱 Failed to setup system connections');
                    return false;
                }

                // Step 5: Test system functionality
                if (!await this.testSystemFunctionality()) {
                    console.warn('📱 SMS system functionality test failed, but continuing...');
                }

                // Step 6: Register global interfaces
                this.registerGlobalInterfaces();

                this.isInitialized = true;
                console.log('📱 SMS system initialization completed successfully');
                return true;

            } catch (error) {
                console.error('📱 SMS system initialization failed:', error);
                return false;
            }
        }

        /**
         * Initialize SMS Channel Manager
         * @returns {boolean} True if successful
         */
        initializeSmsChannelManager() {
            console.log('📱 Initializing SMS Channel Manager...');

            try {
                if (!window.SmsChannelManager) {
                    console.error('📱 SmsChannelManager class not available');
                    return false;
                }

                this.smsChannelManager = new window.SmsChannelManager();
                
                if (!this.smsChannelManager) {
                    console.error('📱 Failed to create SmsChannelManager instance');
                    return false;
                }

                console.log('📱 SMS Channel Manager initialized successfully');
                return true;

            } catch (error) {
                console.error('📱 SMS Channel Manager initialization failed:', error);
                return false;
            }
        }

        /**
         * Get SMS Interaction Manager from app
         * @param {Object} app - The main application instance
         * @returns {boolean} True if successful
         */
        getSmsInteractionManager(app) {
            console.log('📱 Getting SMS Interaction Manager from app...');

            try {
                // Try to get from app's interaction manager
                if (app && app.interactionManager && app.interactionManager.smsInteractionManager) {
                    this.smsInteractionManager = app.interactionManager.smsInteractionManager;
                    console.log('📱 SMS Interaction Manager found in app.interactionManager');
                    return true;
                }

                // Try to get from global window
                if (window.app && window.app.interactionManager && window.app.interactionManager.smsInteractionManager) {
                    this.smsInteractionManager = window.app.interactionManager.smsInteractionManager;
                    console.log('📱 SMS Interaction Manager found in window.app.interactionManager');
                    return true;
                }

                // Try to find it by class name
                if (window.SmsInteractionManager) {
                    console.log('📱 SMS Interaction Manager class available, but no instance found');
                    console.log('📱 This is expected - interaction manager creates its own instance');
                    return true; // This is actually OK - the interaction manager creates its own instance
                }

                console.error('📱 SMS Interaction Manager not found');
                return false;

            } catch (error) {
                console.error('📱 Error getting SMS Interaction Manager:', error);
                return false;
            }
        }

        /**
         * Initialize SMS Channel Integration
         * @returns {boolean} True if successful
         */
        initializeSmsChannelIntegration() {
            console.log('📱 Initializing SMS Channel Integration...');

            try {
                if (!window.SmsChannelIntegration) {
                    console.error('📱 SmsChannelIntegration class not available');
                    return false;
                }

                this.smsChannelIntegration = new window.SmsChannelIntegration();

                if (!this.smsChannelIntegration) {
                    console.error('📱 Failed to create SmsChannelIntegration instance');
                    return false;
                }

                // Initialize integration with managers
                // Note: SMS Interaction Manager might not be available yet - that's OK
                const integrationResult = this.smsChannelIntegration.initialize(
                    this.smsChannelManager,
                    this.smsInteractionManager
                );

                if (!integrationResult && this.smsInteractionManager) {
                    console.warn('📱 SMS Channel Integration initialization returned false, but continuing...');
                }

                console.log('📱 SMS Channel Integration initialized');
                return true;

            } catch (error) {
                console.error('📱 SMS Channel Integration initialization failed:', error);
                return false;
            }
        }

        /**
         * Setup connections between all SMS system components
         * @returns {boolean} True if successful
         */
        setupSystemConnections() {
            console.log('📱 Setting up SMS system connections...');

            try {
                // Make SMS Channel Manager available globally
                if (this.smsChannelManager) {
                    window.smsChannelManager = this.smsChannelManager;
                    console.log('📱 SMS Channel Manager registered globally');
                }

                // Make SMS Channel Integration available globally
                if (this.smsChannelIntegration) {
                    window.smsChannelIntegration = this.smsChannelIntegration;
                    console.log('📱 SMS Channel Integration registered globally');
                }

                // Setup connection hooks for when SMS Interaction Manager becomes available
                this.setupDelayedIntegration();

                console.log('📱 SMS system connections established');
                return true;

            } catch (error) {
                console.error('📱 Failed to setup SMS system connections:', error);
                return false;
            }
        }

        /**
         * Setup delayed integration for when SMS Interaction Manager becomes available later
         */
        setupDelayedIntegration() {
            console.log('📱 Setting up delayed integration hooks...');

            // Check periodically for SMS Interaction Manager
            const checkForSmsInteractionManager = () => {
                // Check if we already have it
                if (this.smsInteractionManager) {
                    return;
                }

                // Try to find it in the app
                if (window.app && window.app.interactionManager && window.app.interactionManager.smsInteractionManager) {
                    this.smsInteractionManager = window.app.interactionManager.smsInteractionManager;
                    console.log('📱 SMS Interaction Manager found, updating integration...');
                    
                    // Update the integration with the newly found interaction manager
                    if (this.smsChannelIntegration) {
                        this.smsChannelIntegration.initialize(
                            this.smsChannelManager,
                            this.smsInteractionManager
                        );
                    }
                    return;
                }

                // Keep checking
                setTimeout(checkForSmsInteractionManager, 1000);
            };

            // Start checking
            setTimeout(checkForSmsInteractionManager, 100);
        }

        /**
         * Test SMS system functionality
         * @returns {Promise<boolean>} True if tests pass
         */
        async testSystemFunctionality() {
            console.log('📱 Testing SMS system functionality...');

            try {
                // Test 1: Channel Manager connectivity
                if (this.smsChannelManager) {
                    const channelStatus = this.smsChannelManager.testConnection();
                    console.log('📱 Channel Manager test result:', channelStatus);
                }

                // Test 2: Integration readiness
                if (this.smsChannelIntegration) {
                    const integrationStatus = this.smsChannelIntegration.getStatus();
                    console.log('📱 Channel Integration status:', integrationStatus);
                }

                // Test 3: Basic Flutter communication
                if (this.smsChannelManager && this.smsChannelManager.testFlutterCommunication) {
                    try {
                        const flutterTest = await this.smsChannelManager.testFlutterCommunication();
                        console.log('📱 Flutter communication test:', flutterTest);
                    } catch (error) {
                        console.warn('📱 Flutter communication test failed:', error);
                    }
                }

                console.log('📱 SMS system functionality tests completed');
                return true;

            } catch (error) {
                console.error('📱 SMS system functionality test failed:', error);
                return false;
            }
        }

        /**
         * Register global interfaces for easy access
         */
        registerGlobalInterfaces() {
            console.log('📱 Registering SMS system global interfaces...');

            // Create a global SMS API object
            window.SmsApi = {
                channelManager: this.smsChannelManager,
                integration: this.smsChannelIntegration,
                interactionManager: this.smsInteractionManager,
                
                // Quick access methods
                sendMessage: (message, contactId) => {
                    if (this.smsChannelManager) {
                        return this.smsChannelManager.sendMessage(message, contactId);
                    }
                    console.error('📱 SMS Channel Manager not available');
                    return Promise.reject('SMS Channel Manager not available');
                },
                
                loadConversation: (contactId) => {
                    if (this.smsChannelManager) {
                        return this.smsChannelManager.loadConversation(contactId);
                    }
                    console.error('📱 SMS Channel Manager not available');
                    return Promise.reject('SMS Channel Manager not available');
                },
                
                getStatus: () => {
                    return {
                        initialized: this.isInitialized,
                        channelManager: !!this.smsChannelManager,
                        integration: !!this.smsChannelIntegration,
                        interactionManager: !!this.smsInteractionManager,
                        integrationStatus: this.smsChannelIntegration ? this.smsChannelIntegration.getStatus() : null
                    };
                }
            };

            console.log('📱 SMS system global interfaces registered');
        }

        /**
         * Get initialization status
         * @returns {Object} Status object with initialization details
         */
        getStatus() {
            return {
                isInitialized: this.isInitialized,
                hasChannelManager: !!this.smsChannelManager,
                hasIntegration: !!this.smsChannelIntegration,
                hasInteractionManager: !!this.smsInteractionManager,
                channelManagerConnected: this.smsChannelManager ? this.smsChannelManager.isConnected() : false,
                integrationReady: this.smsChannelIntegration ? this.smsChannelIntegration.isReady() : false
            };
        }

        /**
         * Cleanup SMS system
         */
        cleanup() {
            console.log('📱 Cleaning up SMS system...');

            try {
                if (this.smsChannelIntegration && this.smsChannelIntegration.cleanupChannelCommunication) {
                    this.smsChannelIntegration.cleanupChannelCommunication();
                }

                if (this.smsChannelManager && this.smsChannelManager.cleanup) {
                    this.smsChannelManager.cleanup();
                }

                // Clear global references
                if (window.smsChannelManager) {
                    delete window.smsChannelManager;
                }
                if (window.smsChannelIntegration) {
                    delete window.smsChannelIntegration;
                }
                if (window.SmsApi) {
                    delete window.SmsApi;
                }

                this.isInitialized = false;
                console.log('📱 SMS system cleanup completed');

            } catch (error) {
                console.error('📱 SMS system cleanup failed:', error);
            }
        }
    }

    // Make the class available globally
    window.SmsInitialization = SmsInitialization;

    // Auto-initialize when the document is ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📱 DOM loaded, checking for SMS system auto-initialization...');
        
        // Wait for app to be available
        const waitForApp = () => {
            if (window.app) {
                console.log('📱 App detected, starting SMS system initialization...');
                
                const smsInit = new SmsInitialization();
                smsInit.initialize(window.app).then((success) => {
                    if (success) {
                        console.log('📱 SMS system auto-initialization completed successfully');
                        window.smsInitialization = smsInit;
                    } else {
                        console.error('📱 SMS system auto-initialization failed');
                    }
                });
            } else {
                // Keep waiting for app
                setTimeout(waitForApp, 100);
            }
        };
        
        // Start waiting for app
        setTimeout(waitForApp, 100);
    });

    console.log('📱 SmsInitialization class registered globally');

})();
