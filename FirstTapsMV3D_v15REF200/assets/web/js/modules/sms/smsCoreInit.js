/**
 * SMS Core System Initialization
 * 
 * This script initializes the new robust SMS Core architecture while
 * maintaining compatibility with the existing 3D world SMS functionality.
 * 
 * Load order:
 * 1. SMS Core Manager (data management)
 * 2. SMS Screen Integration (3D world bridge)
 * 3. Contact integration and auto-discovery
 */

(function() {
    'use strict';

    // Wait for all dependencies to be loaded
    const waitForDependencies = () => {
        return new Promise((resolve) => {
            const checkDependencies = () => {
                // Check if required global objects are available
                const hasThreeJS = typeof THREE !== 'undefined';
                const hasApp = typeof window.app !== 'undefined';
                const hasSmsCoreManager = typeof window.SmsCoreManager !== 'undefined';
                const hasSmsScreenIntegration = typeof window.SmsScreenIntegration !== 'undefined';
                
                if (hasThreeJS && hasApp && hasSmsCoreManager && hasSmsScreenIntegration) {
                    resolve();
                } else {
                    // Log what we're waiting for
                    const waiting = [];
                    if (!hasThreeJS) waiting.push('THREE.js');
                    if (!hasApp) waiting.push('window.app');
                    if (!hasSmsCoreManager) waiting.push('SmsCoreManager');
                    if (!hasSmsScreenIntegration) waiting.push('SmsScreenIntegration');
                    
                    console.log(`📱 Waiting for dependencies: ${waiting.join(', ')}`);
                    setTimeout(checkDependencies, 100);
                }
            };
            
            checkDependencies();
        });
    };

    // Initialize the SMS Core system
    const initializeSmsCore = async () => {
        try {
            console.log('📱 Starting SMS Core System initialization...');
            
            // Wait for dependencies
            await waitForDependencies();
            console.log('✅ All dependencies loaded');
            
            // Initialize SMS Core Manager
            if (window.smsCoreManager) {
                const coreInitialized = await window.smsCoreManager.initialize();
                if (coreInitialized) {
                    console.log('✅ SMS Core Manager initialized');
                } else {
                    throw new Error('Failed to initialize SMS Core Manager');
                }
            }
            
            // Initialize SMS Screen Integration
            if (window.smsScreenIntegration) {
                const integrationInitialized = await window.smsScreenIntegration.initialize();
                if (integrationInitialized) {
                    console.log('✅ SMS Screen Integration initialized');
                } else {
                    throw new Error('Failed to initialize SMS Screen Integration');
                }
            }
            
            // Set up auto-discovery of existing contacts
            setupContactAutoDiscovery();
            
            // Set up global testing interface
            setupGlobalTestInterface();
            
            // Set up system monitoring
            setupSystemMonitoring();
            
            console.log('🎉 SMS Core System initialization complete!');
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('sms-core-system-ready', {
                detail: {
                    timestamp: Date.now(),
                    version: '1.0.0',
                    features: ['core-manager', 'screen-integration', 'auto-discovery']
                }
            }));
            
        } catch (error) {
            console.error('❌ SMS Core System initialization failed:', error);
        }
    };

    // Set up automatic discovery of existing contacts
    const setupContactAutoDiscovery = () => {
        console.log('🔍 Setting up contact auto-discovery...');
        
        // Discover existing contacts immediately
        discoverExistingContacts();
        
        // Set up periodic discovery for dynamically created contacts
        setInterval(discoverExistingContacts, 2000);
        
        // Set up contact manager listener
        if (window.app?.contactManager) {
            setupContactManagerIntegration();
        } else {
            // Wait for contact manager to be available
            const waitForContactManager = setInterval(() => {
                if (window.app?.contactManager) {
                    setupContactManagerIntegration();
                    clearInterval(waitForContactManager);
                }
            }, 500);
        }
        
        console.log('✅ Contact auto-discovery set up');
    };

    // Discover existing contacts in the scene
    const discoverExistingContacts = () => {
        try {
            if (!window.app?.contactManager?.contacts) {
                return;
            }
            
            const contacts = window.app.contactManager.contacts;
            let newContactsFound = 0;
            
            for (const [contactId, contact] of contacts) {
                if (contact.contactData?.phoneNumber && window.smsCoreManager) {
                    // Check if contact is already registered
                    const debugInfo = window.smsCoreManager.getDebugInfo();
                    
                    if (!debugInfo.contactMappings[contactId]) {
                        // Register new contact
                        window.smsCoreManager.registerContact(
                            contactId,
                            contact.contactData.name || contactId,
                            contact.contactData.phoneNumber,
                            contact.contactData.avatar
                        );
                        
                        newContactsFound++;
                        console.log(`📱 Auto-discovered contact: ${contact.contactData.name} (${contactId})`);
                    }
                }
            }
            
            if (newContactsFound > 0) {
                console.log(`🔍 Auto-discovered ${newContactsFound} new contacts`);
            }
            
        } catch (error) {
            console.error('Error in contact auto-discovery:', error);
        }
    };

    // Set up integration with contact manager
    const setupContactManagerIntegration = () => {
        console.log('🤝 Setting up contact manager integration...');
        
        const contactManager = window.app.contactManager;
        
        // Hook into contact creation if possible
        if (contactManager.addContact) {
            const originalAddContact = contactManager.addContact.bind(contactManager);
            
            contactManager.addContact = function(...args) {
                const result = originalAddContact(...args);
                
                // Schedule auto-discovery after contact is added
                setTimeout(discoverExistingContacts, 100);
                
                return result;
            };
            
            console.log('✅ Contact manager addContact method hooked');
        }
        
        // Monitor contacts map changes
        if (contactManager.contacts) {
            const originalSet = contactManager.contacts.set.bind(contactManager.contacts);
            
            contactManager.contacts.set = function(key, value) {
                const result = originalSet(key, value);
                
                // Auto-register new contact
                if (value?.contactData?.phoneNumber && window.smsCoreManager) {
                    setTimeout(() => {
                        window.smsCoreManager.registerContact(
                            key,
                            value.contactData.name || key,
                            value.contactData.phoneNumber,
                            value.contactData.avatar
                        );
                    }, 100);
                }
                
                return result;
            };
            
            console.log('✅ Contact manager contacts.set method hooked');
        }
        
        console.log('✅ Contact manager integration complete');
    };

    // Set up global testing interface
    const setupGlobalTestInterface = () => {
        // Enhance existing smsTest object
        window.smsTest = window.smsTest || {};
        
        // Add system-level test functions
        Object.assign(window.smsTest, {
            // System status
            systemStatus: () => {
                return {
                    coreManager: window.smsCoreManager?.getDebugInfo(),
                    screenIntegration: window.smsScreenIntegration?.getIntegrationStatus(),
                    timestamp: Date.now(),
                };
            },
            
            // Auto-discover contacts
            discoverContacts: () => {
                discoverExistingContacts();
                return 'Contact discovery triggered';
            },
            
            // Test complete flow for a contact
            testContactFlow: (contactId, testMessage = 'Test message from SMS Core system') => {
                console.log(`🧪 Testing complete SMS flow for contact: ${contactId}`);
                
                // 1. Open SMS screen
                if (window.smsTest.openSmsScreen) {
                    window.smsTest.openSmsScreen(contactId);
                }
                
                // 2. Send a message
                setTimeout(() => {
                    if (window.smsTest.sendMessage) {
                        window.smsTest.sendMessage(contactId, testMessage);
                    }
                }, 500);
                
                // 3. Simulate incoming response
                setTimeout(() => {
                    if (window.smsTest.receiveMessage) {
                        window.smsTest.receiveMessage(contactId, 'Auto-reply: Message received!');
                    }
                }, 1500);
                
                return `Complete SMS flow test started for ${contactId}`;
            },
            
            // Force refresh all systems
            refreshAll: () => {
                console.log('🔄 Refreshing all SMS systems...');
                
                // Refresh contact discovery
                discoverExistingContacts();
                
                // Refresh all visible screens
                if (window.smsScreenIntegration?.refreshAllVisibleScreens) {
                    window.smsScreenIntegration.refreshAllVisibleScreens();
                }
                
                return 'All systems refreshed';
            },
            
            // Emergency reset
            emergencyReset: () => {
                console.log('🚨 Emergency reset of SMS systems...');
                
                // Clear caches
                if (window.smsCoreManager) {
                    window.smsCoreManager.messageCache?.clear();
                }
                
                // Refresh everything
                setTimeout(() => {
                    window.smsTest.refreshAll();
                }, 500);
                
                return 'Emergency reset completed';
            }
        });
        
        console.log('✅ Global testing interface set up');
        console.log('📱 Available test functions:');
        console.log('   - smsTest.systemStatus()');
        console.log('   - smsTest.testContactFlow(contactId)');
        console.log('   - smsTest.refreshAll()');
        console.log('   - smsTest.emergencyReset()');
    };

    // Set up system monitoring for health checks
    const setupSystemMonitoring = () => {
        console.log('📊 Setting up system monitoring...');
        
        // Monitor system health every 30 seconds
        setInterval(() => {
            const status = window.smsTest?.systemStatus();
            
            if (status) {
                const coreHealth = status.coreManager?.isInitialized;
                const integrationHealth = status.screenIntegration?.isInitialized;
                
                if (!coreHealth || !integrationHealth) {
                    console.warn('⚠️ SMS System health check failed:', {
                        coreHealth,
                        integrationHealth,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }, 30000);
        
        console.log('✅ System monitoring active');
    };

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSmsCore);
    } else {
        // DOM is already ready, start immediately
        initializeSmsCore();
    }

    console.log('📱 SMS Core System initialization script loaded');

})();
