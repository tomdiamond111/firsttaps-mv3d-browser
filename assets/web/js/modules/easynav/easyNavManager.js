// ============================================================================
// EASYNAV MANAGER
// ============================================================================
// Central coordinator for EasyNav mode and 2D map

(function() {
    'use strict';

    class EasyNavManager {
        constructor(app) {
            console.log('🌍 EasyNavManager: Initializing...');
            this.app = app;
            this.isInitialized = false;
            
            // Components
            this.easyNavMode = null;
            this.easyNavMap = null;
            
            console.log('🌍 EasyNavManager: Initialized successfully');
        }

        /**
         * Initialize EasyNav system - create mode and map
         */
        async initialize() {
            if (this.isInitialized) {
                console.log('🌍 EasyNavManager already initialized');
                return true;
            }

            console.log('🌍 Initializing EasyNav system...');

            try {
                // Wait for required dependencies
                await this.waitForDependencies();

                // Create EasyNavMode
                if (window.EasyNavMode) {
                    this.easyNavMode = new window.EasyNavMode(this.app);
                    console.log('🌍 EasyNavMode created');
                } else {
                    console.error('🌍 EasyNavMode class not available');
                    return false;
                }

                // Create EasyNavMap
                if (window.EasyNavMap) {
                    this.easyNavMap = new window.EasyNavMap(this.app);
                    console.log('🌍 EasyNavMap created');
                } else {
                    console.error('🌍 EasyNavMap class not available');
                    return false;
                }

                // Link components
                this.easyNavMode.setEasyNavMap(this.easyNavMap);

                // Set up window resize handler
                window.addEventListener('resize', this.handleResize.bind(this));

                this.isInitialized = true;
                console.log('🌍 EasyNav system initialized successfully');

                // Expose global functions
                this.exposeGlobalFunctions();

                return true;

            } catch (error) {
                console.error('🌍 Error initializing EasyNav system:', error);
                return false;
            }
        }

        /**
         * Wait for required dependencies to load
         */
        async waitForDependencies() {
            return new Promise((resolve) => {
                const checkDependencies = () => {
                    if (window.EasyNavMode && window.EasyNavMap) {
                        console.log('🌍 All EasyNav dependencies loaded');
                        resolve();
                        return true;
                    }
                    return false;
                };

                // Check immediately
                if (checkDependencies()) {
                    return;
                }

                // Poll for dependencies
                console.log('🌍 Waiting for EasyNav dependencies...');
                const interval = setInterval(() => {
                    if (checkDependencies()) {
                        clearInterval(interval);
                    }
                }, 100);

                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(interval);
                    console.warn('🌍 EasyNav dependency loading timeout');
                    resolve();
                }, 10000);
            });
        }

        /**
         * Enter EasyNav mode
         */
        enterEasyNavMode() {
            if (!this.isInitialized) {
                console.warn('🌍 EasyNavManager not initialized');
                return false;
            }

            try {
                this.easyNavMode.enter();
                console.log('🌍 Entered EasyNav mode successfully');
                return true;

            } catch (error) {
                console.error('🌍 Error entering EasyNav mode:', error);
                return false;
            }
        }

        /**
         * Exit EasyNav mode
         */
        exitEasyNavMode() {
            if (!this.isInitialized) {
                console.warn('🌍 EasyNavManager not initialized');
                return false;
            }

            try {
                this.easyNavMode.exit();
                console.log('🌍 Exited EasyNav mode successfully');
                return true;

            } catch (error) {
                console.error('🌍 Error exiting EasyNav mode:', error);
                return false;
            }
        }

        /**
         * Toggle EasyNav mode
         */
        toggleEasyNavMode() {
            if (!this.isInitialized) {
                console.warn('🌍 EasyNavManager not initialized');
                return false;
            }

            const isActive = this.easyNavMode && this.easyNavMode.isActive;

            if (isActive) {
                return this.exitEasyNavMode();
            } else {
                return this.enterEasyNavMode();
            }
        }

        /**
         * Update method - call this in main animation loop
         */
        update() {
            if (!this.isInitialized) {
                return;
            }

            // Update EasyNavMode (which updates camera position in map)
            if (this.easyNavMode) {
                this.easyNavMode.update();
            }
        }

        /**
         * Handle window resize
         */
        handleResize() {
            if (this.easyNavMap) {
                this.easyNavMap.handleResize();
            }
        }

        /**
         * Get current mode state
         */
        getState() {
            return {
                isInitialized: this.isInitialized,
                isActive: this.easyNavMode ? this.easyNavMode.isActive : false
            };
        }

        /**
         * Expose global functions for testing and Flutter integration
         */
        exposeGlobalFunctions() {
            // Make functions available globally
            window.toggleEasyNavMode = this.toggleEasyNavMode.bind(this);
            window.enterEasyNavMode = this.enterEasyNavMode.bind(this);
            window.exitEasyNavMode = this.exitEasyNavMode.bind(this);

            // Expose manager for debugging
            window.easyNavManager = this;

            console.log('🌍 Global EasyNav functions exposed');
        }

        /**
         * Cleanup
         */
        cleanup() {
            if (this.easyNavMap) {
                this.easyNavMap.cleanup();
            }

            this.easyNavMode = null;
            this.easyNavMap = null;
            this.isInitialized = false;

            console.log('🌍 EasyNavManager cleanup complete');
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.EasyNavManager = EasyNavManager;

    console.log("🌍 EasyNavManager module loaded - EasyNavManager class available globally");
})();
