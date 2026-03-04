// modules/app/cameraManager.js
// Dependencies: THREE (global), CameraControls
// Exports: AppCameraManager class

(function() {
    'use strict';
    
    console.log("Loading CameraManager module...");
    
    // ============================================================================
    // CAMERA MANAGEMENT CLASS
    // ============================================================================
    class AppCameraManager {
        constructor(app) {
            console.log('CameraManager: Initializing...');
            this.app = app;
            this.orientationListenerAdded = false;
            
            // ============================================================================
            // HOME BUTTON TOGGLE STATE - New Feature Implementation
            // ============================================================================
            this.homeViewToggleState = 'close-up'; // 'close-up' or 'aerial'
            this.worldBoundary = 150; // World boundary size (matches focus zones)
            
            console.log('CameraManager: Initialized successfully with Home toggle functionality');
        }
        
        // Camera control methods will be moved here
        
        /**
         * Apply landscape-aware camera controls for mobile optimization
         * Completely native approach - no manual touch handling
         */
        applyLandscapeAwareCameraControls() {
            // Check if camera resets are disabled (during search mode)
            if (window.searchCameraResetsDisabled || (this.cameraResetsDisabled)) {
                console.log('📱 Camera resets are disabled (search mode) - skipping landscape-aware controls');
                return;
            }
            
            // CRITICAL SMS MODE PROTECTION: Don't re-enable camera controls during SMS interaction
            if (this.app.interactionManager && 
                this.app.interactionManager.smsInteractionManager && 
                this.app.interactionManager.smsInteractionManager.isInSmsInteractionMode()) {
                console.log('📱 SMS interaction mode active - skipping camera control changes to preserve SMS teleport position');
                return;
            }
            
            if (!this.app.cameraControls) {
                console.log('📱 applyLandscapeAwareCameraControls: Camera controls not available');
                return;
            }
            
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2;
            
            if (isLandscape) {
                // Landscape: slower rotation, moderate damping, native gestures only
                this.app.cameraControls.rotateSpeed = 0.05; // Moderate rotation speed
                this.app.cameraControls.dampingFactor = 0.2; // Moderate damping
                this.app.cameraControls.enableDamping = true;
                
                // Use completely native touch controls - no manual override
                if (this.app.cameraControls.touches) {
                    this.app.cameraControls.touches.one = CameraControls.ACTION.TOUCH_ROTATE || CameraControls.ACTION.ROTATE;
                    this.app.cameraControls.touches.two = CameraControls.ACTION.TOUCH_DOLLY_TRUCK || CameraControls.ACTION.DOLLY_TRUCK;
                    this.app.cameraControls.touches.three = CameraControls.ACTION.NONE;
                } else {
                    this.app.cameraControls.touches = {
                        one: CameraControls.ACTION.TOUCH_ROTATE || CameraControls.ACTION.ROTATE,
                        two: CameraControls.ACTION.TOUCH_DOLLY_TRUCK || CameraControls.ACTION.DOLLY_TRUCK,
                        three: CameraControls.ACTION.NONE
                    };
                }
                
                // Configure zoom and pan settings for landscape
                this.app.cameraControls.dollyToCursor = false;
                this.app.cameraControls.dollySpeed = 0.8;
                this.app.cameraControls.truckSpeed = 1.0;
                
                // Enable all controls
                this.app.cameraControls.enableZoom = true;
                this.app.cameraControls.enablePan = true;
                this.app.cameraControls.enableRotate = true;
                
            } else {
                // Portrait: standard settings with native gestures
                
                this.app.cameraControls.rotateSpeed = 0.12;
                this.app.cameraControls.dampingFactor = 0.18;
                this.app.cameraControls.enableDamping = true;
                
                // Use native gesture handling for portrait too
                if (this.app.cameraControls.touches) {
                    this.app.cameraControls.touches.one = CameraControls.ACTION.TOUCH_ROTATE || CameraControls.ACTION.ROTATE;
                    this.app.cameraControls.touches.two = CameraControls.ACTION.TOUCH_DOLLY_TRUCK || CameraControls.ACTION.DOLLY_TRUCK;
                    this.app.cameraControls.touches.three = CameraControls.ACTION.NONE;
                } else {
                    this.app.cameraControls.touches = {
                        one: CameraControls.ACTION.TOUCH_ROTATE || CameraControls.ACTION.ROTATE,
                        two: CameraControls.ACTION.TOUCH_DOLLY_TRUCK || CameraControls.ACTION.DOLLY_TRUCK,
                        three: CameraControls.ACTION.NONE
                    };
                }
                
                // Configure zoom and pan settings for portrait
                this.app.cameraControls.dollyToCursor = false;
                this.app.cameraControls.dollySpeed = 0.8;
                this.app.cameraControls.truckSpeed = 1.0;
                
                // Enable all controls
                this.app.cameraControls.enableZoom = true;
                this.app.cameraControls.enablePan = true;
                this.app.cameraControls.enableRotate = true;
            }
            
            // NO manual touch gesture setup - let the library handle everything
            
            // Force update to apply changes immediately
            this.app.cameraControls.update(0);
        }
        
        /**
         * Setup orientation listeners for dynamic camera control adjustment
         */
        setupOrientationListeners() {
            if (this.orientationListenerAdded) return; // Prevent duplicate listeners
            
            // Apply controls on orientation change
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.applyLandscapeAwareCameraControls();
                }, 100); // Small delay for orientation to settle
            });
            
            // Apply controls on window resize  
            window.addEventListener('resize', () => {
                this.applyLandscapeAwareCameraControls();
            });
            
            this.orientationListenerAdded = true;
            console.log('📱 Mobile orientation listeners added - no manual touch handling');
            
            // Initial application
            this.applyLandscapeAwareCameraControls();
        }
        
        /**
         * Mobile-friendly zoom in with progressive speed adjustment
         */
        zoomIn() {
            if (this.app.cameraControls) {
                // Mobile-friendly zoom: Use distance-based zoom curve for more natural feel
                const currentDistance = this.app.cameraControls.distance;
                const minDistance = this.app.currentWorldTemplate ? 
                    this.app.currentWorldTemplate.getPositioningConstraints().minZoomDistance || 5.0 : 5.0;
                
                // Progressive zoom: faster when far away, slower when close
                let zoomAmount;
                if (currentDistance > 30) {
                    zoomAmount = currentDistance * 0.15; // Fast zoom when far
                } else if (currentDistance > 15) {
                    zoomAmount = currentDistance * 0.12; // Medium zoom
                } else {
                    zoomAmount = currentDistance * 0.08; // Slow zoom when close (more precision)
                }
                
                // Ensure we don't zoom past minimum distance
                if (currentDistance - zoomAmount >= minDistance) {
                    this.app.cameraControls.zoom(zoomAmount, true);
                } else {
                    console.log(`Zoom in limited: would exceed minimum distance ${minDistance}`);
                }
            }
        }

        /**
         * Mobile-friendly zoom out with progressive speed adjustment
         */
        zoomOut() {
            if (this.app.cameraControls) {
                // Mobile-friendly zoom out with smart speed adjustment
                const currentDistance = this.app.cameraControls.distance;
                const maxDistance = this.app.currentWorldTemplate ? 
                    this.app.currentWorldTemplate.getMaxZoomDistance() : 150.0; // Reduced default max
                
                // Progressive zoom out: slower when close, faster when far
                let zoomAmount;
                if (currentDistance < 15) {
                    zoomAmount = currentDistance * 0.08; // Slow zoom when close
                } else if (currentDistance < 50) {
                    zoomAmount = currentDistance * 0.12; // Medium zoom
                } else {
                    zoomAmount = currentDistance * 0.15; // Fast zoom when far
                }
                
                const newDistance = currentDistance + zoomAmount;
                
                // Only zoom out if we haven't reached the maximum distance
                if (newDistance <= maxDistance) {
                    this.app.cameraControls.zoom(-zoomAmount, true);
                } else {
                    console.log(`Zoom out limited: current=${currentDistance.toFixed(1)}, max=${maxDistance}`);
                }
            }
        }
        
        /**
         * Debug method to log current camera control settings
         */
        debugCameraControlSettings() {
            console.log('=== CAMERA CONTROL SETTINGS DEBUG ===');
            if (this.app.cameraControls) {
                const aspectRatio = window.innerWidth / window.innerHeight;
                const isLandscape = aspectRatio > 1.2;
                
                console.log('Screen info:');
                console.log(`  Width: ${window.innerWidth}, Height: ${window.innerHeight}`);
                console.log(`  Aspect ratio: ${aspectRatio.toFixed(2)}`);
                console.log(`  Is landscape: ${isLandscape}`);
                console.log('');
                console.log('Current camera control settings:');
                console.log(`  rotateSpeed: ${this.app.cameraControls.rotateSpeed}`);
                console.log(`  dampingFactor: ${this.app.cameraControls.dampingFactor}`);
                console.log(`  enableDamping: ${this.app.cameraControls.enableDamping}`);
                console.log(`  enabled: ${this.app.cameraControls.enabled}`);
                console.log(`  enableRotate: ${this.app.cameraControls.enableRotate}`);
                
                if (this.app.cameraControls.touches) {
                    console.log('Touch controls:');
                    console.log(`  touches.one: ${this.app.cameraControls.touches.one}`);
                    console.log(`  touches.two: ${this.app.cameraControls.touches.two}`);
                }
                
                console.log('Expected settings for current orientation:');
                if (isLandscape) {
                    console.log('  Expected rotateSpeed: 0.05 (ultra-slow for landscape)');
                    console.log('  Expected dampingFactor: 0.25 (high damping for landscape)');
                } else {
                    console.log('  Expected rotateSpeed: 0.5 (standard for portrait)');
                    console.log('  Expected dampingFactor: 0.05 (standard damping for portrait)');
                }
            } else {
                console.log('Camera controls not available');
            }
            console.log('=== END CAMERA CONTROL DEBUG ===');
        }
        
        /**
         * Comprehensive mobile camera optimization with proper touch controls
         */
        optimizeCameraForMobile() {
            console.log('📱 Optimizing camera for mobile...');
            
            if (!this.app.cameraControls) {
                console.log('📱 Camera controls not available for mobile optimization');
                return;
            }
            
            // Base mobile settings that work for both orientations
            this.app.cameraControls.enableDamping = true;
            this.app.cameraControls.enableZoom = true;
            this.app.cameraControls.enablePan = true;
            this.app.cameraControls.enableRotate = true;
            
            // Set base speeds (will be adjusted by landscape-aware controls)
            this.app.cameraControls.dollySpeed = 1.0;
            this.app.cameraControls.truckSpeed = 2.0;
            
            // IMPORTANT: Apply landscape-aware controls after base settings
            this.applyLandscapeAwareCameraControls();
            
            console.log('📱 Mobile camera optimization completed');
        }
        
        /**
         * Test and debug camera controls for mobile touch gestures
         */
        testMobileCameraControls() {
            console.log('📱 === TESTING MOBILE CAMERA CONTROLS ===');
            
            if (!this.app.cameraControls) {
                console.log('❌ Camera controls not available');
                return;
            }
            
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2;
            
            console.log(`📱 Screen: ${window.innerWidth}x${window.innerHeight}`);
            console.log(`📱 Aspect ratio: ${aspectRatio.toFixed(2)}`);
            console.log(`📱 Is landscape: ${isLandscape}`);
            console.log('');
            
            console.log('📱 Current camera control settings:');
            console.log(`   rotateSpeed: ${this.app.cameraControls.rotateSpeed}`);
            console.log(`   dampingFactor: ${this.app.cameraControls.dampingFactor}`);
            console.log(`   enableDamping: ${this.app.cameraControls.enableDamping}`);
            console.log(`   dollySpeed: ${this.app.cameraControls.dollySpeed}`);
            console.log(`   truckSpeed: ${this.app.cameraControls.truckSpeed}`);
            console.log('');
            
            console.log('📱 Touch control configuration:');
            if (this.app.cameraControls.touches) {
                console.log(`   ONE finger: ${this.app.cameraControls.touches.one}`);
                console.log(`   TWO finger: ${this.app.cameraControls.touches.two}`);
            }
            
            console.log('📱 Enable flags:');
            console.log(`   enableRotate: ${this.app.cameraControls.enableRotate}`);
            console.log(`   enablePan: ${this.app.cameraControls.enablePan}`);
            console.log(`   enableZoom: ${this.app.cameraControls.enableZoom}`);
            
            console.log('📱 === TEST COMPLETE ===');
            
            // Force re-apply camera controls
            console.log('📱 Re-applying camera controls...');
            this.applyLandscapeAwareCameraControls();
        }
        
        /**
         * Debug function to verify CameraControls.ACTION constants
         * Based on reference material insights
         */
        debugCameraActionConstants() {
            console.log('📱 === CAMERA ACTION CONSTANTS DEBUG ===');
            
            if (typeof CameraControls !== 'undefined' && CameraControls.ACTION) {
                console.log('📱 CameraControls.ACTION available:', typeof CameraControls.ACTION);
                console.log('📱 All available actions:', Object.keys(CameraControls.ACTION));
                
                // Check for touch-specific constants
                const touchActions = Object.keys(CameraControls.ACTION).filter(key => key.includes('TOUCH'));
                console.log('📱 Touch-specific actions:', touchActions);
                
                // Log specific values we're interested in
                const actions = ['ROTATE', 'TOUCH_ROTATE', 'TRUCK', 'TOUCH_TRUCK', 'DOLLY', 'TOUCH_DOLLY', 'DOLLY_PAN', 'TOUCH_DOLLY_PAN', 'NONE'];
                actions.forEach(action => {
                    if (CameraControls.ACTION[action] !== undefined) {
                        console.log(`📱 ${action}: ${CameraControls.ACTION[action]}`);
                    } else {
                        console.log(`📱 ${action}: NOT AVAILABLE`);
                    }
                });
                
            } else {
                console.error('📱 CameraControls.ACTION not available!');
                console.log('📱 CameraControls type:', typeof CameraControls);
            }
            
            // Check current touch control settings
            if (this.app.cameraControls && this.app.cameraControls.touches) {
                console.log('📱 Current touch controls:', this.app.cameraControls.touches);
            } else {
                console.log('📱 Touch controls not set or not available');
            }
            
            console.log('📱 === DEBUG COMPLETE ===');
        }

        /**
         * NO MANUAL TOUCH HANDLING - Use native camera controls only
         * This prevents browser intervention issues on mobile WebView
         */
        setupManualTouchGestures() {
            if (this.manualTouchSetup) {
                console.log('📱 Manual touch gestures disabled - using native only');
                return;
            }
            
            console.log('📱 MOBILE NATIVE MODE: No manual touch handling, library handles all gestures');
            
            // Mark as setup but don't actually add any listeners
            this.manualTouchSetup = true;
            
            // No cleanup function needed since we're not adding any listeners
            this.cleanupManualTouch = () => {
                console.log('📱 No manual touch handlers to remove');
            };
        }
        
        /**
         * Ultra-simple camera control reset for mobile
         */
        simpleCameraControlReset() {
            // Check if camera resets are disabled (during search mode)
            if (window.searchCameraResetsDisabled || (this.cameraResetsDisabled)) {
                console.log('📱 Simple camera reset disabled (search mode) - skipping reset');
                return;
            }
            
            // CRITICAL SMS MODE PROTECTION: Don't reset camera controls during SMS interaction
            if (this.app.interactionManager && 
                this.app.interactionManager.smsInteractionManager && 
                this.app.interactionManager.smsInteractionManager.isInSmsInteractionMode()) {
                console.log('📱 SMS interaction mode active - skipping simple camera reset to preserve SMS positioning');
                return;
            }
            
            if (!this.app.cameraControls) {
                return;
            }
            
            // Reduced logging - this repeats frequently
            // console.log('📱 Mobile camera reset...');
            
            // Just a quick disable/enable cycle
            this.app.cameraControls.enabled = false;
            
            // Very short delay - mobile doesn't need long resets
            setTimeout(() => {
                this.app.cameraControls.enabled = true;
                this.app.cameraControls.enableRotate = true;
                this.app.cameraControls.enablePan = true;
                this.app.cameraControls.enableZoom = true;
                
                // Ensure mobile-optimized settings are applied
                this.applyLandscapeAwareCameraControls();
                
                console.log('📱 Mobile camera reset complete');
            }, 30); // Very short delay for mobile
        }

        /**
         * Enhanced camera control reset - simplified version
         */
        enhancedCameraControlReset() {
            // Check if camera resets are disabled (during search mode)
            if (window.searchCameraResetsDisabled || (this.cameraResetsDisabled)) {
                console.log('📱 Enhanced camera reset disabled (search mode) - skipping reset');
                return;
            }
            
            // CRITICAL SMS MODE PROTECTION: Don't reset camera controls during SMS interaction
            if (this.app.interactionManager && 
                this.app.interactionManager.smsInteractionManager && 
                this.app.interactionManager.smsInteractionManager.isInSmsInteractionMode()) {
                console.log('📱 SMS interaction mode active - skipping enhanced camera reset to preserve SMS positioning');
                return;
            }
            
            if (!this.app.cameraControls) {
                console.log('📱 enhancedCameraControlReset: Camera controls not available');
                return;
            }
            
            console.log('📱 Enhanced camera control reset initiated');
            
            // Use the simplified reset method
            this.simpleCameraControlReset();
        }

        /**
         * =========================================================================
         * HOME BUTTON TOGGLE FUNCTIONALITY - New Feature
         * ========================================================================
         */

        /**
         * Get close-up Home Area camera view position and target
         */
        getCloseUpHomeView() {
            // Get base world template position and adjust for better Home Area view
            const baseHomePosition = this.app.getHomeViewPosition();
            const homeTarget = this.app.getHomeViewTarget();
            
            // Check orientation for different positioning
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2;
            
            // Adjust position: move up and back 5-10 grid units from base position
            const adjustedPosition = {
                x: baseHomePosition.x,
                y: baseHomePosition.y + 8, // Move up 8 units
                z: baseHomePosition.z + 10 // Move back 10 units
            };
            
            console.log(`🏠 Close-up view positioning: landscape=${isLandscape}, position=(${adjustedPosition.x}, ${adjustedPosition.y}, ${adjustedPosition.z})`);
            
            return {
                position: adjustedPosition,
                target: homeTarget,
                label: 'Close-up Home Area'
            };
        }

        /**
         * Get aerial full XZ-plane camera view position and target
         * Shows category zones clearly without being too far away
         */
        getAerialFullView() {
            // Check orientation for different aerial heights
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2;
            
            // Calculate aerial view height based on orientation
            // Portrait: Much higher to show ~30 grid squares wide (all zones visible)
            // Landscape: 50% higher than previous to see all zones clearly
            let aerialHeight;
            if (isLandscape) {
                aerialHeight = 80; // High view for landscape - full zone visibility
            } else {
                aerialHeight = 140; // Maximum height for portrait - complete world overview
            }
            
            console.log(`🏠 Aerial view positioning: landscape=${isLandscape}, height=${aerialHeight}`);
            
            return {
                position: { x: 0, y: aerialHeight, z: 0 }, // Directly above center
                target: { x: 0, y: 0, z: 0 }, // Looking down at center
                label: 'Aerial Full XZ-Plane View'
            };
        }

        /**
         * Toggle between close-up Home Area view and aerial full XZ-plane view
         */
        toggleHomeView() {
            console.log('🏠 ========================================');
            console.log('🏠 HOME VIEW TOGGLE INITIATED');
            console.log('🏠 ========================================');
            
            if (!this.app.camera || !this.app.cameraControls) {
                console.error('🏠 Camera or camera controls not available for toggle');
                return;
            }

            // Get current view and determine next view
            const currentView = this.homeViewToggleState;
            const nextView = currentView === 'close-up' ? 'aerial' : 'close-up';
            
            console.log(`🏠 Current view: ${currentView}`);
            console.log(`🏠 Switching to: ${nextView}`);

            // Get camera settings for the next view
            let viewSettings;
            if (nextView === 'aerial') {
                viewSettings = this.getAerialFullView();
                console.log('🏠 Switching to AERIAL view - showing full XZ plane with all zones');
            } else {
                viewSettings = this.getCloseUpHomeView();
                console.log('🏠 Switching to CLOSE-UP view - focusing on Home Area');
            }

            // Update toggle state
            this.homeViewToggleState = nextView;

            console.log(`🏠 Target position: (${viewSettings.position.x}, ${viewSettings.position.y}, ${viewSettings.position.z})`);
            console.log(`🏠 Target look-at: (${viewSettings.target.x}, ${viewSettings.target.y}, ${viewSettings.target.z})`);

            // Apply the camera view with enhanced reset for orientation compatibility 
            this.applyCameraView(viewSettings);

            console.log(`🏠 Home view toggle completed: ${currentView} → ${nextView}`);
            console.log('🏠 ========================================');
        }

        /**
         * Apply a camera view with position and target, ensuring proper orientation handling
         */
        applyCameraView(viewSettings) {
            console.log(`🏠 Applying camera view: ${viewSettings.label}`);
            
            // CRITICAL SMS MODE PROTECTION: Don't apply camera views during SMS interaction
            if (this.app.interactionManager && 
                this.app.interactionManager.smsInteractionManager && 
                this.app.interactionManager.smsInteractionManager.isInSmsInteractionMode()) {
                console.log('📱 SMS interaction mode active - skipping camera view application to preserve SMS positioning');
                return;
            }
            
            try {
                // Force immediate camera positioning
                if (this.app.camera) {
                    console.log('🏠 Setting camera position directly...');
                    this.app.camera.position.set(
                        viewSettings.position.x, 
                        viewSettings.position.y, 
                        viewSettings.position.z
                    );
                    this.app.camera.lookAt(
                        viewSettings.target.x, 
                        viewSettings.target.y, 
                        viewSettings.target.z
                    );
                    this.app.camera.updateProjectionMatrix();
                }

                // Apply camera controls positioning
                if (this.app.cameraControls) {
                    console.log('🏠 Setting camera controls position...');
                    this.app.cameraControls.enabled = false;
                    
                    this.app.cameraControls.setLookAt(
                        viewSettings.position.x, viewSettings.position.y, viewSettings.position.z,
                        viewSettings.target.x, viewSettings.target.y, viewSettings.target.z,
                        true
                    );

                    // Re-enable camera controls
                    this.app.cameraControls.enabled = true;
                    this.app.cameraControls.enableRotate = true;
                    this.app.cameraControls.enablePan = true;
                    this.app.cameraControls.enableZoom = true;

                    // Re-apply world-specific camera constraints
                    if (this.app.currentWorldTemplate) {
                        this.app.currentWorldTemplate.applyCameraConstraints(this.app.cameraControls);
                    }

                    // CRITICAL: Apply enhanced camera control reset to fix orientation issues
                    console.log('🏠 Applying enhanced camera control reset for orientation compatibility...');
                    this.enhancedCameraControlReset();

                    this.app.cameraControls.update(0);
                }

                console.log(`🏠 Camera view "${viewSettings.label}" applied successfully`);

            } catch (error) {
                console.error('🏠 Error applying camera view:', error);
            }
        }

        /**
         * Get current toggle state for debugging
         */
        getToggleState() {
            return {
                currentView: this.homeViewToggleState,
                nextView: this.homeViewToggleState === 'close-up' ? 'aerial' : 'close-up'
            };
        }
        
        /**
         * Cleanup method to remove event listeners and reset state
         */
        cleanup() {
            console.log('📱 Cleaning up camera manager...');
            
            // Remove manual touch gesture handlers if they exist
            if (this.cleanupManualTouch) {
                this.cleanupManualTouch();
                this.cleanupManualTouch = null;
            }
            
            // Remove orientation listeners
            if (this.orientationListenerAdded) {
                window.removeEventListener('orientationchange', this.handleOrientationChange);
                window.removeEventListener('resize', this.handleResize);
                this.orientationListenerAdded = false;
            }
            
            // Reset flags
            this.manualTouchSetup = false;
            
            console.log('📱 Camera manager cleanup complete');
        }
    }

    // ============================================================================
    // GLOBAL UTILITY FUNCTIONS
    // ============================================================================
    
    /**
     * Global utility function for enhanced camera control reset
     * Can be called without creating a camera manager instance
     */
    window.enhancedCameraControlResetGlobal = function() {
        // Check if camera resets are disabled (during search mode)
        if (window.searchCameraResetsDisabled) {
            console.log('📱 Global enhanced camera reset disabled (search mode) - skipping reset');
            return;
        }
        
        if (!window.cameraControls) {
            console.log('📱 enhancedCameraControlResetGlobal: Camera controls not available');
            return;
        }
        
        const aspectRatio = window.innerWidth / window.innerHeight;
        const isLandscape = aspectRatio > 1.2;
        
        console.log(`📱 Enhanced camera control reset initiated (aspect: ${aspectRatio.toFixed(2)}, landscape: ${isLandscape})`);
        console.log(`📱 Screen dimensions: ${window.innerWidth}x${window.innerHeight}`);
        
        // Step 1: Disable all controls to clear state
        window.cameraControls.enabled = false;
        window.cameraControls.enableRotate = false;
        window.cameraControls.enablePan = false;
        window.cameraControls.enableZoom = false;
        
        // Step 2: Clear any lingering touch states
        if (window.cameraControls.touches) {
            window.cameraControls.touches.one = CameraControls.ACTION.NONE;
            window.cameraControls.touches.two = CameraControls.ACTION.NONE;
        }
        
        // Step 3: Force update to clear internal states
        window.cameraControls.update(0);
        
        // Step 4: Delayed re-enable with clean configuration
        setTimeout(() => {
            window.cameraControls.enabled = true;
            window.cameraControls.enableRotate = true;
            window.cameraControls.enablePan = true;
            window.cameraControls.enableZoom = true;
            
            // Re-apply orientation-specific settings with better logging
            if (isLandscape) {
                console.log('📱 Applying LANDSCAPE-specific camera reset parameters');
                // Landscape-specific reset parameters
                window.cameraControls.rotateSpeed = 0.02;
                window.cameraControls.dampingFactor = 0.3;
                window.cameraControls.enableDamping = true;
                
                // Re-configure touch controls for landscape
                if (window.cameraControls.touches) {
                    window.cameraControls.touches.one = CameraControls.ACTION.TOUCH_ROTATE || CameraControls.ACTION.ROTATE;
                    window.cameraControls.touches.two = CameraControls.ACTION.NONE;
                }
                
                console.log('📱 Landscape-specific camera reset applied');
            } else {
                console.log('📱 Applying PORTRAIT-specific camera reset parameters');
                // Portrait mode settings
                window.cameraControls.rotateSpeed = 0.15;
                window.cameraControls.dampingFactor = 0.15;
                window.cameraControls.enableDamping = true;
                
                // Re-configure touch controls for portrait (default settings)
                if (window.cameraControls.touches) {
                    window.cameraControls.touches.one = CameraControls.ACTION.TOUCH_ROTATE || CameraControls.ACTION.ROTATE;
                    window.cameraControls.touches.two = CameraControls.ACTION.TOUCH_DOLLY || CameraControls.ACTION.DOLLY;
                }
                
                console.log('📱 Portrait-specific camera reset applied');
            }
            
            // Final update to ensure all settings take effect
            window.cameraControls.update(0);
            
            console.log('📱 Enhanced camera control reset complete');
        }, 75); // Slightly longer delay to ensure clean state
    };

    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.AppCameraManager = AppCameraManager;
    
    /**
     * NEW: Global function for a hard camera reset.
     * This is designed to be called from Flutter to fix frozen controls.
     */
    window.forceCameraReset = function() {
        console.log('!!! FORCE CAMERA RESET TRIGGERED !!!');
        
        // Try multiple possible camera control references
        let cameraControls = null;
        if (window.app && window.app.cameraControls) {
            cameraControls = window.app.cameraControls;
            console.log('Using window.app.cameraControls');
        } else if (window.cameraControls) {
            cameraControls = window.cameraControls;
            console.log('Using window.cameraControls');
        } else {
            console.error('Cannot force reset: no cameraControls found. Available:', {
                'window.app': !!window.app,
                'window.app.cameraControls': !!(window.app && window.app.cameraControls),
                'window.cameraControls': !!window.cameraControls
            });
            return;
        }

        // 1. Disable controls
        cameraControls.enabled = false;
        console.log('Camera controls disabled.');

        // 2. Wait for a short period to ensure the state is cleared
        setTimeout(() => {
            // 3. Re-enable controls
            cameraControls.enabled = true;
            cameraControls.enableRotate = true;
            cameraControls.enablePan = true;
            cameraControls.enableZoom = true;
            console.log('Camera controls re-enabled.');

            // 4. Re-apply orientation-specific settings to ensure they are correct
            if (window.app && window.app.cameraManager) {
                window.app.cameraManager.applyLandscapeAwareCameraControls();
                console.log('Applied landscape-aware camera controls.');
            } else {
                console.warn('Could not re-apply landscape-aware controls: app.cameraManager not found.');
            }

            // 5. Use optimized state sync instead of forced update
            if (window.CameraStateManager) {
                window.CameraStateManager.syncCurrentState();
            } else {
                // Fallback: Force an update
                cameraControls.update(0);
            }
            console.log('!!! CAMERA RESET COMPLETE !!!');
        }, 100); // 100ms delay for a more reliable reset
    };
    
    console.log("CameraManager module loaded - AppCameraManager and forceCameraReset() are available globally");
})();
