// ============================================================================
// EXPLORE MANAGER - MAIN INTEGRATION MODULE
// ============================================================================
// Coordinates all explore mode components and integrates with main app

(function() {
    'use strict';

    class ExploreManager {
        constructor(app) {
            console.log('🌍 ExploreManager: Initializing...');
            this.app = app;
            
            // Explore mode components
            this.exploreMode = null;
            this.exploreUI = null;
            this.exploreControls = null;
            
            // EasyNav mode components
            this.easyNavManager = null;
            
            // Mode tracking (0=default, 1=easynav, 2=explore)
            this.currentMode = 0;
            
            // Integration state
            this.isInitialized = false;
            this.isIntegratedWithMainLoop = false;
            
            console.log('🌍 ExploreManager: Initialized successfully');
        }

        /**
         * Initialize all explore mode components
         */
        async initialize() {
            if (this.isInitialized) {
                console.log('🌍 ExploreManager already initialized');
                return;
            }

            try {
                console.log('🌍 Setting up explore mode components...');
                
                // Create explore mode components
                this.exploreMode = new window.ExploreMode(this.app);
                this.exploreUI = new window.ExploreUI(this.app);
                this.exploreControls = new window.ExploreControls(this.app);
                
                // Connect ExploreMode with ExploreControls for movement input
                this.exploreMode.setExploreControls(this.exploreControls);
                
                // Initialize UI with explore mode reference
                this.exploreUI.initialize(this.exploreMode);
                
                // Hide the JavaScript button since Flutter is managing the explore button UI
                this.exploreUI.setVisible(false);
                console.log('🌍 JavaScript explore button hidden - Flutter managing UI');
                
                // Initialize EasyNav system
                await this.initializeEasyNav();
                
                // Integrate with main application loop
                this.integrateWithMainLoop();
                
                // Set up window resize handler
                this.setupResizeHandler();
                
                this.isInitialized = true;
                console.log('🌍 ExploreManager initialization complete');
                
                // Make functions available globally for testing/debugging
                this.exposeGlobalFunctions();
                
            } catch (error) {
                console.error('🌍 Error initializing ExploreManager:', error);
                this.cleanup();
            }
        }
        
        /**
         * Initialize EasyNav system
         */
        async initializeEasyNav() {
            try {
                if (window.EasyNavManager) {
                    this.easyNavManager = new window.EasyNavManager(this.app);
                    await this.easyNavManager.initialize();
                    console.log('🌍 EasyNavManager initialized successfully');
                } else {
                    console.warn('🌍 EasyNavManager not available');
                }
            } catch (error) {
                console.error('🌍 Error initializing EasyNav:', error);
            }
        }

        /**
         * Integrate explore mode with the main application animation loop
         */
        integrateWithMainLoop() {
            if (this.isIntegratedWithMainLoop) {
                return;
            }

            // Store original animate function if it exists
            if (this.app.animate && typeof this.app.animate === 'function') {
                this.originalAnimate = this.app.animate.bind(this.app);
                
                // Replace with wrapped version
                this.app.animate = this.wrappedAnimate.bind(this);
                
                console.log('🌍 Integrated with main animation loop');
            } else if (window.animate && typeof window.animate === 'function') {
                // If animate is global function
                this.originalAnimate = window.animate.bind(window);
                window.animate = this.wrappedAnimate.bind(this);
                
                console.log('🌍 Integrated with global animation loop');
            } else {
                // Create our own animation loop
                this.startExploreAnimationLoop();
                console.log('🌍 Started independent animation loop');
            }

            this.isIntegratedWithMainLoop = true;
        }

        /**
         * Wrapped animation function that includes explore mode updates
         */
        wrappedAnimate() {
            // Update explore mode components
            this.updateExploreComponents();
            
            // Call original animate function
            if (this.originalAnimate) {
                this.originalAnimate();
            }
        }

        /**
         * Start independent animation loop for explore mode
         */
        startExploreAnimationLoop() {
            const animate = () => {
                requestAnimationFrame(animate);
                this.updateExploreComponents();
                
                // Render the scene if renderer is available
                if (this.app.renderer && this.app.scene && this.app.camera) {
                    this.app.renderer.render(this.app.scene, this.app.camera);
                }
            };
            
            animate();
        }

        /**
         * Update all explore mode components
         */
        updateExploreComponents() {
            if (!this.isInitialized) return;
            
            try {
                // Update explore controls
                if (this.exploreControls && this.exploreControls.isActive) {
                    this.exploreControls.update();
                }
                
                // Update explore mode (movement, camera follow)
                if (this.exploreMode && this.exploreMode.isActive) {
                    // Note: ExploreMode will get movement from ExploreControls directly
                    // No need to apply movement here - ExploreMode handles it internally
                    this.exploreMode.update();
                }
                
                // Update EasyNav mode
                if (this.easyNavManager) {
                    this.easyNavManager.update();
                }
                
            } catch (error) {
                console.error('🌍 Error updating explore components:', error);
            }
        }

        /**
         * Main update method for external animation loop
         */
        update() {
            this.updateExploreComponents();
        }

        /**
         * Apply movement input to explore mode
         */
        applyMovementToExploreMode(movement) {
            if (!this.exploreMode || !this.exploreMode.isActive || !this.exploreMode.avatar) {
                return;
            }

            const avatar = this.exploreMode.avatar;
            const moveSpeed = this.exploreMode.moveSpeed;
            const rotateSpeed = this.exploreMode.rotateSpeed;

            // Apply rotation (left/right)
            if (movement.rotation !== 0) {
                avatar.rotateY(movement.rotation * rotateSpeed);
            }

            // Apply forward/backward movement
            if (movement.y !== 0) {
                const direction = new THREE.Vector3(0, 0, -movement.y * moveSpeed);
                direction.applyQuaternion(avatar.quaternion);
                avatar.position.add(direction);
            }

            // Apply strafe movement (if needed in future)
            if (movement.x !== 0) {
                const strafeDirection = new THREE.Vector3(movement.x * moveSpeed, 0, 0);
                strafeDirection.applyQuaternion(avatar.quaternion);
                avatar.position.add(strafeDirection);
            }
        }

        /**
         * Set up window resize handler
         */
        setupResizeHandler() {
            this.boundResizeHandler = this.handleResize.bind(this);
            window.addEventListener('resize', this.boundResizeHandler);
            console.log('🌍 Resize handler set up');
        }

        /**
         * Handle window resize events
         */
        handleResize() {
            if (this.exploreUI) {
                this.exploreUI.handleResize();
            }
        }

        /**
         * Enter explore mode
         */
        enterExploreMode() {
            if (!this.isInitialized) {
                console.warn('🌍 ExploreManager not initialized');
                return false;
            }

            try {
                // Enable explore controls
                this.exploreControls.enable();
                
                // Enter explore mode
                this.exploreMode.enter();
                
                // Update UI state
                this.exploreUI.updateButtonState();
                
                console.log('🌍 Entered explore mode successfully');
                return true;
                
            } catch (error) {
                console.error('🌍 Error entering explore mode:', error);
                return false;
            }
        }

        /**
         * Exit explore mode
         */
        exitExploreMode() {
            if (!this.isInitialized) {
                console.warn('🌍 ExploreManager not initialized');
                return false;
            }

            try {
                // Disable explore controls
                this.exploreControls.disable();
                
                // Exit explore mode
                this.exploreMode.exit();
                
                // Update UI state
                this.exploreUI.updateButtonState();
                
                console.log('🌍 Exited explore mode successfully');
                return true;
                
            } catch (error) {
                console.error('🌍 Error exiting explore mode:', error);
                return false;
            }
        }

        /**
         * Toggle explore mode (legacy - for compatibility)
         */
        toggleExploreMode() {
            // This now cycles through all 3 modes
            return this.cycleNavigationMode();
        }
        
        /**
         * Cycle through navigation modes: Default → EasyNav → Explore → Default
         */
        cycleNavigationMode() {
            if (!this.isInitialized) {
                console.warn('🌍 ExploreManager not initialized');
                return false;
            }
            
            try {
                // Exit current mode
                this.exitAllModes();
                
                // Increment mode (0=default, 1=easynav, 2=explore)
                this.currentMode = (this.currentMode + 1) % 3;
                
                console.log(`🌍 Cycling to mode: ${this.currentMode} (0=default, 1=easynav, 2=explore)`);
                
                // Enter new mode
                switch (this.currentMode) {
                    case 0: // Default mode
                        console.log('🌍 Switched to Default mode');
                        this.notifyFlutterModeChange('default');
                        break;
                    case 1: // EasyNav mode
                        if (this.easyNavManager) {
                            this.easyNavManager.enterEasyNavMode();
                            this.notifyFlutterModeChange('easynav');
                        } else {
                            console.warn('🌍 EasyNavManager not available, skipping to next mode');
                            return this.cycleNavigationMode();
                        }
                        break;
                    case 2: // Explore mode
                        this.enterExploreMode();
                        this.notifyFlutterModeChange('explore');
                        break;
                }
                
                return true;
                
            } catch (error) {
                console.error('🌍 Error cycling navigation mode:', error);
                return false;
            }
        }
        
        /**
         * Exit all navigation modes (return to default)
         */
        exitAllModes() {
            // Exit explore mode
            if (this.exploreMode && this.exploreMode.isActive) {
                this.exitExploreMode();
            }
            
            // Exit EasyNav mode
            if (this.easyNavManager && this.easyNavManager.easyNavMode && this.easyNavManager.easyNavMode.isActive) {
                this.easyNavManager.exitEasyNavMode();
            }
        }
        
        /**
         * Notify Flutter about mode change
         */
        notifyFlutterModeChange(mode) {
            if (window.NavigationModeChannel && window.NavigationModeChannel.postMessage) {
                const message = JSON.stringify({
                    action: 'navigationModeChanged',
                    mode: mode
                });
                window.NavigationModeChannel.postMessage(message);
                console.log(`🌍 Notified Flutter about mode change: ${mode}`);
            }
        }

        /**
         * Expose global functions for testing and Flutter integration
         */
        exposeGlobalFunctions() {
            // Mode cycling (primary function for Flutter button)
            window.toggleExploreMode = this.toggleExploreMode.bind(this);
            window.cycleNavigationMode = this.cycleNavigationMode.bind(this);
            
            // Individual mode functions
            window.enterExploreMode = this.enterExploreMode.bind(this);
            window.exitExploreMode = this.exitExploreMode.bind(this);
            window.exitAllModes = this.exitAllModes.bind(this);
            
            // Expose explore manager for debugging
            window.exploreManager = this;
            
            console.log('🌍 Global explore functions exposed (with 3-mode cycling)');
        }

        /**
         * Get current state of all explore components
         */
        getState() {
            return {
                isInitialized: this.isInitialized,
                isIntegratedWithMainLoop: this.isIntegratedWithMainLoop,
                exploreMode: this.exploreMode ? this.exploreMode.getState() : null,
                exploreUI: this.exploreUI ? this.exploreUI.getState() : null,
                exploreControls: this.exploreControls ? this.exploreControls.getState() : null
            };
        }

        /**
         * Clean up all explore mode components
         */
        cleanup() {
            console.log('🌍 ExploreManager cleanup...');
            
            try {
                // Exit explore mode if active
                if (this.exploreMode && this.exploreMode.isActive) {
                    this.exploreMode.exit();
                }
                
                // Disable controls
                if (this.exploreControls && this.exploreControls.isActive) {
                    this.exploreControls.disable();
                }
                
                // Clean up UI
                if (this.exploreUI) {
                    this.exploreUI.cleanup();
                }
                
                // Remove resize handler
                if (this.boundResizeHandler) {
                    window.removeEventListener('resize', this.boundResizeHandler);
                    this.boundResizeHandler = null;
                }
                
                // Restore original animation function
                if (this.originalAnimate) {
                    if (this.app.animate) {
                        this.app.animate = this.originalAnimate;
                    } else if (window.animate) {
                        window.animate = this.originalAnimate;
                    }
                }
                
                // Clean up EasyNav
                if (this.easyNavManager) {
                    this.easyNavManager.cleanup();
                }
                
                // Clear references
                this.exploreMode = null;
                this.exploreUI = null;
                this.exploreControls = null;
                this.easyNavManager = null;
                
                this.isInitialized = false;
                this.isIntegratedWithMainLoop = false;
                this.currentMode = 0;
                
                console.log('🌍 ExploreManager cleanup complete');
                
            } catch (error) {
                console.error('🌍 Error during cleanup:', error);
            }
        }
    }

    // ============================================================================
    // EXPORTS AND AUTO-INITIALIZATION
    // ============================================================================
    window.ExploreManager = ExploreManager;
    
    // Auto-initialize when main app is ready
    function initializeExploreManager() {
        // Wait for main app to be available
        if (window.app && window.app.scene && window.app.camera && window.app.renderer) {
            console.log('🌍 Main app detected - initializing ExploreManager...');
            
            // Create and initialize explore manager
            window.exploreManager = new ExploreManager(window.app);
            window.exploreManager.initialize();
            
            console.log('🌍 ExploreManager auto-initialization complete');
        } else {
            // Retry after a short delay
            setTimeout(initializeExploreManager, 500);
        }
    }
    
    // Start auto-initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeExploreManager);
    } else {
        // DOM is already loaded
        setTimeout(initializeExploreManager, 100);
    }
    
    console.log("🌍 ExploreManager module loaded - auto-initialization started");
})();
