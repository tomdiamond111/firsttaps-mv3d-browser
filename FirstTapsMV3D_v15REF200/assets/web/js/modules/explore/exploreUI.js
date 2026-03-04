// ============================================================================
// EXPLORE UI CONTROLLER
// ============================================================================
// Manages the explore mode button and UI integration

(function() {
    'use strict';

    class ExploreUI {
        constructor(app) {
            console.log('🎯 ExploreUI: Initializing...');
            this.app = app;
            this.exploreMode = null;
            this.button = null;
            this.isInitialized = false;
            
            console.log('🎯 ExploreUI: Initialized successfully');
        }

        /**
         * Initialize explore UI - create button and set up event handlers
         */
        initialize(exploreMode) {
            if (this.isInitialized) {
                console.log('🎯 ExploreUI already initialized');
                return;
            }

            this.exploreMode = exploreMode;
            this.createExploreButton();
            this.isInitialized = true;
            
            console.log('🎯 ExploreUI initialization complete');
        }

        /**
         * Create the explore mode toggle button
         */
        createExploreButton() {
            // Remove existing button if present
            this.removeExploreButton();

            // Create button element
            this.button = document.createElement('button');
            this.button.id = 'exploreButton';
            this.button.title = 'Toggle Explore Mode';
            
            // Set button styles to match existing UI buttons
            this.styleButton();
            
            // Add walking man icon (using Unicode character or CSS)
            this.addButtonIcon();
            
            // Add click handler
            this.button.addEventListener('click', this.handleButtonClick.bind(this));
            
            // Position button next to options menu (3 dots)
            this.positionButton();
            
            // Add to page
            document.body.appendChild(this.button);
            
            console.log('🎯 Explore button created and positioned');
        }

        /**
         * Style the explore button to match existing UI
         */
        styleButton() {
            if (!this.button) return;
            
            // Match the style of MiniFloatingActionButtonWidget from Flutter
            const styles = {
                position: 'fixed',
                top: '60px', // Position below options button (which is at top + 10)
                left: '130px', // Position next to options button (back:10, options:70, explore:130)
                width: '48px',
                height: '48px',
                borderRadius: '24px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                zIndex: '1000',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease'
            };
            
            Object.assign(this.button.style, styles);
            
            // Add hover effects
            this.button.addEventListener('mouseenter', () => {
                this.button.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                this.button.style.transform = 'scale(1.05)';
            });
            
            this.button.addEventListener('mouseleave', () => {
                this.button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                this.button.style.transform = 'scale(1.0)';
            });
        }

        /**
         * Add walking man icon to button
         */
        addButtonIcon() {
            if (!this.button) return;
            
            // Use Unicode walking person symbol
            this.button.innerHTML = '🚶';
            
            // Alternative: Use CSS to create a simple walking icon
            // For now, the emoji works well and is simple
        }

        /**
         * Position button dynamically based on viewport
         */
        positionButton() {
            if (!this.button) return;
            
            // Get viewport info for responsive positioning
            const isLandscape = window.innerWidth > window.innerHeight;
            const topOffset = isLandscape ? '50px' : '60px';
            
            // Position relative to existing buttons
            // Back button: left: 10px
            // Options button: left: 70px  
            // Explore button: left: 130px
            this.button.style.top = topOffset;
            this.button.style.left = '130px';
        }

        /**
         * Handle button click - toggle explore mode
         */
        handleButtonClick() {
            if (!this.exploreMode) {
                console.warn('🎯 ExploreMode not available for toggle');
                return;
            }

            // Toggle explore mode
            this.exploreMode.toggle();
            
            // Update button appearance based on mode state
            this.updateButtonState();
            
            console.log('🎯 Explore button clicked - mode toggled');
        }

        /**
         * Update button appearance based on explore mode state
         */
        updateButtonState() {
            if (!this.button || !this.exploreMode) return;
            
            const isActive = this.exploreMode.isActive;
            
            if (isActive) {
                // Active state - highlighted
                this.button.style.backgroundColor = 'rgba(33, 150, 243, 0.8)'; // Blue
                this.button.style.boxShadow = '0 0 15px rgba(33, 150, 243, 0.5)';
                this.button.title = 'Exit Explore Mode';
            } else {
                // Inactive state - normal
                this.button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                this.button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
                this.button.title = 'Enter Explore Mode';
            }
        }

        /**
         * Remove explore button from page
         */
        removeExploreButton() {
            if (this.button && this.button.parentNode) {
                this.button.parentNode.removeChild(this.button);
                this.button = null;
                console.log('🎯 Explore button removed');
            }
        }

        /**
         * Show/hide button
         */
        setVisible(visible) {
            if (!this.button) return;
            
            this.button.style.display = visible ? 'flex' : 'none';
            console.log('🎯 Explore button visibility:', visible);
        }

        /**
         * Update button position on window resize
         */
        handleResize() {
            this.positionButton();
        }

        /**
         * Clean up - remove button and event listeners
         */
        cleanup() {
            this.removeExploreButton();
            this.exploreMode = null;
            this.isInitialized = false;
            console.log('🎯 ExploreUI cleanup complete');
        }

        /**
         * External API for toggling from other code
         */
        toggle() {
            this.handleButtonClick();
        }

        /**
         * External API for setting mode state from other code
         */
        setExploreMode(isActive) {
            if (!this.exploreMode) return;
            
            if (isActive && !this.exploreMode.isActive) {
                this.exploreMode.enter();
            } else if (!isActive && this.exploreMode.isActive) {
                this.exploreMode.exit();
            }
            
            this.updateButtonState();
        }

        /**
         * Get current button state
         */
        getState() {
            return {
                isInitialized: this.isInitialized,
                hasButton: !!this.button,
                isVisible: this.button ? this.button.style.display !== 'none' : false,
                isActive: this.exploreMode ? this.exploreMode.isActive : false
            };
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.ExploreUI = ExploreUI;
    
    console.log("🎯 ExploreUI module loaded - ExploreUI class available globally");
})();
