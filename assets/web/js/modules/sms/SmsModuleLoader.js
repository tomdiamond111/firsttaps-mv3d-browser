/**
 * SMS Module Loader - Loads all SMS modules in the correct dependency order
 * This ensures all dependencies are available before the main SmsChannelManager is instantiated
 */
(function() {
    'use strict';

    class SmsModuleLoader {
        constructor() {
            this.loadedModules = new Set();
            this.pendingLoads = new Map();
            console.log('📱 SmsModuleLoader initialized');
        }

        /**
         * Load a script dynamically
         */
        loadScript(src) {
            return new Promise((resolve, reject) => {
                // Check if already loaded
                if (this.loadedModules.has(src)) {
                    resolve();
                    return;
                }

                // Check if already loading
                if (this.pendingLoads.has(src)) {
                    this.pendingLoads.get(src).then(resolve).catch(reject);
                    return;
                }

                // Create loading promise
                const loadPromise = new Promise((resolveLoad, rejectLoad) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.type = 'text/javascript';
                    
                    script.onload = () => {
                        console.log(`📱 ✅ Loaded: ${src}`);
                        this.loadedModules.add(src);
                        this.pendingLoads.delete(src);
                        resolveLoad();
                    };
                    
                    script.onerror = (error) => {
                        console.error(`📱 ❌ Failed to load: ${src}`, error);
                        this.pendingLoads.delete(src);
                        rejectLoad(new Error(`Failed to load ${src}`));
                    };
                    
                    document.head.appendChild(script);
                });

                this.pendingLoads.set(src, loadPromise);
                loadPromise.then(resolve).catch(reject);
            });
        }

        /**
         * Load all SMS modules in dependency order
         */
        async loadAllModules(basePath = 'assets/web/js/modules/sms/') {
            console.log('📱 Loading SMS modules...');
            
            try {
                // Define module loading order (dependencies first)
                const modules = [
                    'SmsThrottleManager.js',       // No dependencies
                    'SmsContactResolver.js',       // No dependencies  
                    'SmsChannelSetup.js',         // No dependencies
                    'SmsMessageHandler.js',       // Depends on: SmsChannelSetup, SmsContactResolver, SmsThrottleManager
                    'SmsEventNotifier.js',        // Depends on: SmsMessageHandler, SmsContactResolver, SmsThrottleManager
                    'smsChannelManager_refactored.js' // Depends on all above modules
                ];

                // Load modules sequentially to respect dependencies
                for (const module of modules) {
                    const fullPath = basePath + module;
                    await this.loadScript(fullPath);
                    
                    // Small delay to ensure script execution completes
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                console.log('📱 ✅ All SMS modules loaded successfully');
                
                // Verify all required classes are available
                this.verifyModulesLoaded();
                
                return true;
                
            } catch (error) {
                console.error('📱 ❌ Failed to load SMS modules:', error);
                throw error;
            }
        }

        /**
         * Verify all required modules are loaded and classes are available
         */
        verifyModulesLoaded() {
            const requiredClasses = [
                'SmsThrottleManager',
                'SmsContactResolver', 
                'SmsChannelSetup',
                'SmsMessageHandler',
                'SmsEventNotifier',
                'SmsChannelManager'
            ];

            const missing = requiredClasses.filter(className => !window[className]);
            
            if (missing.length > 0) {
                throw new Error(`Missing required SMS classes: ${missing.join(', ')}`);
            }

            console.log('📱 ✅ All required SMS classes are available:', requiredClasses);
        }

        /**
         * Initialize the SMS system with the refactored modules
         */
        async initializeSmsSystem(options = {}) {
            try {
                // Load all modules first
                await this.loadAllModules();
                
                // Create the main SMS manager instance
                const smsManager = new window.SmsChannelManager(options);
                
                // Initialize channels
                const initialized = smsManager.initializeChannels();
                
                if (initialized) {
                    console.log('📱 ✅ SMS system initialized successfully with refactored modules');
                    
                    // Setup event listeners
                    smsManager.eventNotifier.setupEventListeners();
                    
                    // Store reference globally for backward compatibility
                    window.smsChannelManager = smsManager;
                    
                    return smsManager;
                } else {
                    throw new Error('Failed to initialize SMS channels');
                }
                
            } catch (error) {
                console.error('📱 ❌ Failed to initialize SMS system:', error);
                throw error;
            }
        }

        /**
         * Replace the original SMS system with the refactored version
         */
        async replaceSmsSystem(options = {}) {
            console.log('📱 🔄 Replacing original SMS system with refactored version...');
            
            try {
                // Backup existing system if it exists
                if (window.smsChannelManager) {
                    window.smsChannelManager_backup = window.smsChannelManager;
                    console.log('📱 📦 Original SMS system backed up');
                }

                // Initialize new system
                const newSmsManager = await this.initializeSmsSystem(options);

                // Update global references
                if (window.app) {
                    window.app.smsChannelManager = newSmsManager;
                }

                console.log('📱 ✅ SMS system replacement completed successfully');
                console.log('📱 📊 New system stats:', newSmsManager.getStats());
                
                return newSmsManager;
                
            } catch (error) {
                console.error('📱 ❌ Failed to replace SMS system:', error);
                
                // Restore backup if replacement failed
                if (window.smsChannelManager_backup) {
                    window.smsChannelManager = window.smsChannelManager_backup;
                    if (window.app) {
                        window.app.smsChannelManager = window.smsChannelManager_backup;
                    }
                    console.log('📱 🔄 Original SMS system restored after failed replacement');
                }
                
                throw error;
            }
        }

        /**
         * Get loading status
         */
        getLoadingStatus() {
            return {
                loadedModules: Array.from(this.loadedModules),
                pendingLoads: Array.from(this.pendingLoads.keys()),
                isComplete: this.loadedModules.size > 0 && this.pendingLoads.size === 0
            };
        }
    }

    // Create global instance
    window.SmsModuleLoader = SmsModuleLoader;
    window.smsModuleLoader = new SmsModuleLoader();
    
    console.log('📱 SmsModuleLoader available globally as window.smsModuleLoader');

})();
