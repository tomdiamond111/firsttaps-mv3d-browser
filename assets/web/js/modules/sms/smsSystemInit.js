/**
 * SMS System Initialization
 * Sets up the complete SMS integration system by connecting:
 * - SmsChannelManager (Flutter communication)
 * - SmsIntegrationManager (Bridge between systems)
 * - Existing SmsInteractionManager (UI and camera controls)
 */

(function() {
    'use strict';

    // Global SMS system references
    let smsChannelManager = null;
    let smsIntegrationManager = null;
    let isInitialized = false;

    /**
     * Initialize the complete SMS system
     */
    function initializeSmsSystem() {
        console.log('📱 SMS System: initializeSmsSystem() called');
        
        if (isInitialized) {
            console.log('📱 SMS system already initialized');
            return;
        }

        console.log('📱 Initializing SMS system...');
        console.log('📱 DEBUG: window.app available:', !!window.app);
        console.log('📱 DEBUG: window.app.interactionManager available:', !!(window.app && window.app.interactionManager));
        console.log('📱 DEBUG: window.app.interactionManager.smsInteractionManager available:', !!(window.app && window.app.interactionManager && window.app.interactionManager.smsInteractionManager));
        console.log('📱 DEBUG: window.SmsChannelManager available:', !!window.SmsChannelManager);
        console.log('📱 DEBUG: window.SmsIntegrationManager available:', !!window.SmsIntegrationManager);

        try {
            // Step 1: Initialize SMS Channel Manager
            console.log('📱 Step 1: Creating SMS Channel Manager...');
            
            if (!window.SmsChannelManager) {
                console.error('📱 CRITICAL: window.SmsChannelManager is not available!');
                throw new Error('SmsChannelManager not available');
            }
            
            smsChannelManager = new window.SmsChannelManager();
            console.log('📱 SMS Channel Manager created successfully:', !!smsChannelManager);
            
            // Step 1.5: Initialize SMS Event Router and connect it to the Channel Manager
            console.log('📱 Step 1.5: Creating SMS Event Router...');
            
            if (!window.SmsEventRouter) {
                console.error('📱 CRITICAL: window.SmsEventRouter is not available!');
                throw new Error('SmsEventRouter not available');
            }
            
            const smsEventRouter = new window.SmsEventRouter(smsChannelManager, {
                debugMode: false
            });
            console.log('📱 SMS Event Router created successfully:', !!smsEventRouter);
            
            // Connect the event router to the channel manager
            smsChannelManager.eventRouter = smsEventRouter;
            console.log('📱 Event Router connected to Channel Manager');
            
            // Step 2: Wait for existing SMS interaction manager to be available
            const checkForSmsInteractionManager = () => {
                console.log('📱 Step 2: Checking for SMS interaction manager...');
                console.log('📱 DEBUG: window.app:', !!window.app);
                console.log('📱 DEBUG: window.app.interactionManager:', !!(window.app && window.app.interactionManager));
                console.log('📱 DEBUG: window.app.interactionManager.smsInteractionManager:', !!(window.app && window.app.interactionManager && window.app.interactionManager.smsInteractionManager));
                console.log('📱 DEBUG: window.SmsIntegrationManager:', !!window.SmsIntegrationManager);
                
                if (window.app && window.app.interactionManager && 
                    window.app.interactionManager.smsInteractionManager) {
                    
                    console.log('📱 Step 3: Using global SMS Integration Manager...');
                    
                    if (!window.smsIntegrationManager) {
                        console.error('📱 CRITICAL: window.smsIntegrationManager is not available!');
                        setTimeout(checkForSmsInteractionManager, 100);
                        return;
                    }
                    
                    // Step 3: Use the global SMS Integration Manager instance
                    try {
                        smsIntegrationManager = window.smsIntegrationManager;
                        
                        // Initialize it now that the system is ready
                        smsIntegrationManager.initialize();
                        
                        console.log('📱 SMS Integration Manager initialized successfully:', !!smsIntegrationManager);
                    } catch (error) {
                        console.error('📱 CRITICAL ERROR creating SMS Integration Manager:', error);
                        setTimeout(checkForSmsInteractionManager, 100);
                        return;
                    }
                    
                    // Step 4: Set up global references
                    if (window.app) {
                        window.app.smsChannelManager = smsChannelManager;
                        window.app.smsIntegrationManager = smsIntegrationManager;
                        console.log('📱 Step 4: Global references set up');
                        console.log('📱 DEBUG: window.app.smsChannelManager:', !!window.app.smsChannelManager);
                        console.log('📱 DEBUG: window.app.smsIntegrationManager:', !!window.app.smsIntegrationManager);
                    }
                    
                    // Step 5: Test SMS channel manager initialization
                    console.log('📱 Testing SMS channel manager initialization...');
                    if (window.app.interactionManager.smsInteractionManager) {
                        // Test the SMS channel manager - disable fallback mode by default
                        window.app.interactionManager.smsInteractionManager.forceFallbackMode = false;
                        console.log('📱 SMS real mode enabled by default');
                        
                        // Test connection in background without forcing fallback
                        try {
                            if (smsChannelManager && typeof smsChannelManager.testConnection === 'function') {
                                const testResult = smsChannelManager.testConnection();
                                console.log('📱 SMS channel manager connection test result:', testResult);
                            }
                        } catch (error) {
                            console.log('📱 SMS channel manager test error (non-critical):', error);
                        }
                    }
                    
                    isInitialized = true;
                    console.log('📱 SMS system initialization complete');
                    console.log('📱 FINAL STATUS:');
                    console.log('  - smsChannelManager:', !!smsChannelManager);
                    console.log('  - smsIntegrationManager:', !!smsIntegrationManager);
                    console.log('  - window.app.smsChannelManager:', !!(window.app && window.app.smsChannelManager));
                    console.log('  - window.app.smsIntegrationManager:', !!(window.app && window.app.smsIntegrationManager));
                    console.log('  - isInitialized:', isInitialized);
                    
                    // Optional: Test the connection
                    testSmsSystemConnection();
                    
                } else {
                    // SMS interaction manager not ready yet, try again
                    console.log('📱 SMS interaction manager not ready, retrying in 100ms...');
                    console.log('📱 WAITING FOR:');
                    console.log('  - window.app:', !!window.app);
                    console.log('  - window.app.interactionManager:', !!(window.app && window.app.interactionManager));
                    console.log('  - window.app.interactionManager.smsInteractionManager:', !!(window.app && window.app.interactionManager && window.app.interactionManager.smsInteractionManager));
                    console.log('  - window.SmsIntegrationManager:', !!window.SmsIntegrationManager);
                    setTimeout(checkForSmsInteractionManager, 100);
                }
            };
            
            checkForSmsInteractionManager();
            
        } catch (error) {
            console.error('📱 Error initializing SMS system:', error);
            console.error('📱 ERROR DETAILS:');
            console.error('  - window.SmsChannelManager:', !!window.SmsChannelManager);
            console.error('  - window.SmsIntegrationManager:', !!window.SmsIntegrationManager);
            console.error('  - window.app:', !!window.app);
            console.error('  - window.app.interactionManager:', !!(window.app && window.app.interactionManager));
            console.error('  - window.app.interactionManager.smsInteractionManager:', !!(window.app && window.app.interactionManager && window.app.interactionManager.smsInteractionManager));
            
            // Even if initialization fails, try to enable fallback mode
            setTimeout(() => {
                if (window.app && window.app.interactionManager && 
                    window.app.interactionManager.smsInteractionManager) {
                    window.app.interactionManager.smsInteractionManager.forceFallbackMode = true;
                    console.log('📱 Emergency SMS fallback mode enabled');
                }
            }, 1000);
        }
    }

    /**
     * Test SMS system connection
     */
    function testSmsSystemConnection() {
        if (!smsIntegrationManager) {
            console.log('📱 SMS integration manager not available for testing');
            return;
        }

        console.log('📱 Testing SMS system connection...');
        
        setTimeout(() => {
            const isRealSmsAvailable = smsIntegrationManager.isRealSmsAvailable();
            console.log('📱 SMS system status:');
            console.log('  - Channel Manager:', !!smsChannelManager);
            console.log('  - Integration Manager:', !!smsIntegrationManager);
            console.log('  - Real SMS Available:', isRealSmsAvailable);
            console.log('  - Fallback Mode:', !isRealSmsAvailable);
        }, 1000);
    }

    /**
     * Get SMS system status
     */
    function getSmsSystemStatus() {
        return {
            initialized: isInitialized,
            channelManager: !!smsChannelManager,
            integrationManager: !!smsIntegrationManager,
            realSmsAvailable: smsIntegrationManager ? smsIntegrationManager.isRealSmsAvailable() : false
        };
    }

    /**
     * Send SMS message through the system
     */
    function sendSmsMessage(contactId, messageText) {
        if (!smsIntegrationManager) {
            console.error('📱 SMS system not initialized');
            return false;
        }

        return smsIntegrationManager.sendMessage(contactId, messageText);
    }

    /**
     * Get conversation for a contact
     */
    function getConversation(contactId) {
        if (!smsIntegrationManager) {
            console.log('📱 SMS system not initialized, returning empty conversation');
            return [];
        }

        return smsIntegrationManager.getConversation(contactId);
    }

    /**
     * Manual SMS system reinitialization (for debugging)
     */
    function reinitializeSmsSystem() {
        console.log('📱 Manually reinitializing SMS system...');
        
        if (smsIntegrationManager) {
            smsIntegrationManager.destroy();
        }
        
        if (smsChannelManager) {
            smsChannelManager.destroy();
        }
        
        isInitialized = false;
        smsChannelManager = null;
        smsIntegrationManager = null;
        
        initializeSmsSystem();
    }

    /**
     * Global SMS system readiness check
     */
    function isSmsSystemReady() {
        const ready = isInitialized && 
                     !!smsChannelManager && 
                     !!smsIntegrationManager && 
                     !!window.app && 
                     !!window.app.smsChannelManager && 
                     !!window.app.smsIntegrationManager;
        
        console.log('📱 SMS System Ready Check:');
        console.log('  - isInitialized:', isInitialized);
        console.log('  - smsChannelManager:', !!smsChannelManager);
        console.log('  - smsIntegrationManager:', !!smsIntegrationManager);
        console.log('  - window.app:', !!window.app);
        console.log('  - window.app.smsChannelManager:', !!window.app.smsChannelManager);
        console.log('  - window.app.smsIntegrationManager:', !!window.app.smsIntegrationManager);
        console.log('  - OVERALL READY:', ready);
        
        return ready;
    }

    /**
     * Wait for SMS system to be ready
     */
    function waitForSmsSystem(callback, maxAttempts = 10, delay = 200) {
        let attempts = 0;
        
        const checkReady = () => {
            attempts++;
            
            if (isSmsSystemReady()) {
                console.log('📱 SMS System ready after', attempts, 'attempts');
                callback(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.log('📱 SMS System not ready after', maxAttempts, 'attempts');
                callback(false);
                return;
            }
            
            console.log('📱 Waiting for SMS system... attempt', attempts, '/', maxAttempts);
            setTimeout(checkReady, delay);
        };
        
        checkReady();
    }

    // Export functions to global scope for debugging and external access
    window.SmsSystem = {
        initialize: initializeSmsSystem,
        getStatus: getSmsSystemStatus,
        sendMessage: sendSmsMessage,
        getConversation: getConversation,
        reinitialize: reinitializeSmsSystem,
        test: testSmsSystemConnection,
        isReady: isSmsSystemReady,
        waitForReady: waitForSmsSystem
    };

    // IMMEDIATE INITIALIZATION - Start SMS system right away
    // The SMS system needs to be ready before contact objects try to use it
    console.log('📱 SMS System: Starting immediate initialization...');
    
    // Start initialization immediately
    initializeSmsSystem();
    
    // Auto-initialize when DOM is ready (backup)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!isInitialized) {
                console.log('📱 SMS System: DOM ready, initializing if not already done...');
                initializeSmsSystem();
            }
        });
    } else {
        // DOM already loaded - ensure initialization happens quickly
        setTimeout(() => {
            if (!isInitialized) {
                console.log('📱 SMS System: DOM loaded, ensuring initialization...');
                initializeSmsSystem();
            }
        }, 50);
    }
    
    // Additional retry mechanism - keep trying every 500ms for up to 10 seconds
    let retryCount = 0;
    const maxRetries = 20; // 10 seconds
    const retryInterval = setInterval(() => {
        retryCount++;
        
        if (isInitialized) {
            console.log('📱 SMS System: Initialization successful, stopping retry mechanism');
            clearInterval(retryInterval);
            return;
        }
        
        if (retryCount >= maxRetries) {
            console.log('📱 SMS System: Max retries reached, stopping retry mechanism');
            console.log('📱 FINAL FAILED STATE:');
            console.log('  - window.SmsChannelManager:', !!window.SmsChannelManager);
            console.log('  - window.SmsIntegrationManager:', !!window.SmsIntegrationManager);
            console.log('  - window.app:', !!window.app);
            console.log('  - window.app.interactionManager:', !!(window.app && window.app.interactionManager));
            console.log('  - window.app.interactionManager.smsInteractionManager:', !!(window.app && window.app.interactionManager && window.app.interactionManager.smsInteractionManager));
            console.log('  - isInitialized:', isInitialized);
            clearInterval(retryInterval);
            return;
        }
        
        console.log('📱 SMS System: Retry attempt', retryCount, 'of', maxRetries);
        console.log('📱 RETRY STATUS:');
        console.log('  - window.SmsChannelManager:', !!window.SmsChannelManager);
        console.log('  - window.SmsIntegrationManager:', !!window.SmsIntegrationManager);
        console.log('  - window.app:', !!window.app);
        console.log('  - window.app.interactionManager:', !!(window.app && window.app.interactionManager));
        console.log('  - window.app.interactionManager.smsInteractionManager:', !!(window.app && window.app.interactionManager && window.app.interactionManager.smsInteractionManager));
        initializeSmsSystem();
    }, 500);

    // EMERGENCY FALLBACK DISABLED - Always use real SMS mode
    // The emergency fallback was causing connection instability
    // Now the system will always attempt to use real SMS functionality
    setTimeout(() => {
        console.log('📱 SMS System: Fallback mode permanently disabled');
        console.log('📱 SMS System: Real SMS mode is always active');
        
        if (window.app && window.app.interactionManager && 
            window.app.interactionManager.smsInteractionManager) {
            
            // Force real SMS mode - never enable fallback
            window.app.interactionManager.smsInteractionManager.forceFallbackMode = false;
            console.log('📱 SMS System: Real SMS mode enforced');
            
            // Log SMS system status for debugging
            if (window.app.smsChannelManager && window.app.smsIntegrationManager) {
                console.log('📱 SMS System Status:');
                console.log('  - Channel Manager: Available');
                console.log('  - Integration Manager: Available');
                console.log('  - Fallback Mode: Disabled');
                console.log('  - Real SMS Mode: Active');
            } else {
                console.log('📱 SMS System Warning: Integration managers not yet available');
                console.log('  - Channel Manager:', !!window.app.smsChannelManager);
                console.log('  - Integration Manager:', !!window.app.smsIntegrationManager);
            }
        }
    }, 500); // Faster check to ensure SMS system is properly configured

    console.log('📱 SMS System initialization script loaded');

})();
