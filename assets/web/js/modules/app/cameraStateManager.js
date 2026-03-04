/**
 * ====================================================================
 * CAMERA STATE MANAGER
 * ====================================================================
 * 
 * Centralized camera state management system providing:
 * - Single source of truth for camera position/target
 * - Debounced updates to prevent rapid-fire stuttering
 * - State synchronization across multiple control systems
 * - Proper cleanup between operations
 * 
 * This module eliminates conflicts between overlapping camera systems
 * by providing a unified interface for all camera operations.
 */

(function() {
    'use strict';

    // ====================================================================
    // CONSTANTS
    // ====================================================================
    
    const DEBOUNCE_MS = 16; // ~60fps debouncing
    const STATE_SYNC_DELAY = 50; // Allow time for control state changes
    const DEBUG_CAMERA_STATE = false;

    // ====================================================================
    // CAMERA STATE MANAGER CLASS
    // ====================================================================

    class CameraStateManager {
        constructor() {
            this.currentState = {
                position: new THREE.Vector3(),
                target: new THREE.Vector3(),
                isTransitioning: false,
                lastUpdateTime: 0,
                pendingUpdates: new Map()
            };

            // Reference to active camera and controls
            this.camera = null;
            this.controls = null;
            
            // Debouncing mechanism
            this.updateQueue = [];
            this.debounceTimer = null;
            this.isProcessingUpdates = false;

            // State tracking
            this.stateListeners = new Set();
            this.cleanupCallbacks = new Set();

            // Initialize once Three.js is available
            this.initializeWhenReady();
        }

        // ================================================================
        // INITIALIZATION
        // ================================================================

        initializeWhenReady() {
            const checkForThreeJS = () => {
                if (window.THREE && window.app && window.app.camera && window.app.cameraControls) {
                    this.initialize();
                } else {
                    setTimeout(checkForThreeJS, 100);
                }
            };
            checkForThreeJS();
        }

        initialize() {
            this.camera = window.app.camera;
            this.controls = window.app.cameraControls;

            // Set initial state
            this.syncCurrentState();

            // Set up frame-based update loop
            this.startUpdateLoop();

            if (DEBUG_CAMERA_STATE) {
                console.log('🎯 CameraStateManager initialized');
            }
        }

        // ================================================================
        // CORE STATE MANAGEMENT
        // ================================================================

        /**
         * Get current camera state (read-only)
         */
        getCurrentState() {
            return {
                position: this.currentState.position.clone(),
                target: this.currentState.target.clone(),
                isTransitioning: this.currentState.isTransitioning
            };
        }

        /**
         * Sync internal state with actual camera/controls
         */
        syncCurrentState() {
            if (!this.camera || !this.controls) return;

            // Ensure state objects exist (they might be undefined if THREE wasn't loaded during construction)
            if (!this.currentState.position || !this.currentState.position.copy) {
                this.currentState.position = new THREE.Vector3();
            }
            if (!this.currentState.target || !this.currentState.target.copy) {
                this.currentState.target = new THREE.Vector3();
            }

            // Defensive check: ensure camera.position exists before copying
            if (this.camera.position && this.camera.position.x !== undefined) {
                this.currentState.position.copy(this.camera.position);
            }
            
            // Defensive check: ensure controls.target exists before copying
            if (this.controls.target && this.controls.target.x !== undefined) {
                this.currentState.target.copy(this.controls.target);
            }
            
            this.currentState.lastUpdateTime = performance.now();
        }

        /**
         * Request a camera state change with debouncing
         */
        requestStateChange(newPosition, newTarget, options = {}) {
            const changeRequest = {
                position: newPosition ? newPosition.clone() : null,
                target: newTarget ? newTarget.clone() : null,
                immediate: options.immediate || false,
                smooth: options.smooth !== false, // Default to smooth
                duration: options.duration || 1000,
                callback: options.callback || null,
                timestamp: performance.now()
            };

            // Add to update queue
            this.updateQueue.push(changeRequest);

            // Debounce updates unless immediate
            if (changeRequest.immediate) {
                this.processUpdateQueue();
            } else {
                this.debounceUpdates();
            }
        }

        // ================================================================
        // DEBOUNCING & UPDATE PROCESSING
        // ================================================================

        debounceUpdates() {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(() => {
                this.processUpdateQueue();
            }, DEBOUNCE_MS);
        }

        processUpdateQueue() {
            if (this.isProcessingUpdates || this.updateQueue.length === 0) {
                return;
            }

            this.isProcessingUpdates = true;

            // Get the most recent update request
            const latestUpdate = this.updateQueue[this.updateQueue.length - 1];
            this.updateQueue.length = 0; // Clear queue

            this.executeStateChange(latestUpdate);
        }

        executeStateChange(changeRequest) {
            if (!this.camera || !this.controls) {
                this.isProcessingUpdates = false;
                return;
            }

            // Mark as transitioning
            this.currentState.isTransitioning = true;
            this.notifyStateListeners('transitionStart');

            if (changeRequest.smooth) {
                this.executeSmoothTransition(changeRequest);
            } else {
                this.executeImmediateChange(changeRequest);
            }
        }

        executeImmediateChange(changeRequest) {
            // Disable controls during state change
            const wasEnabled = this.controls.enabled;
            this.controls.enabled = false;

            try {
                if (changeRequest.position) {
                    this.camera.position.copy(changeRequest.position);
                    this.currentState.position.copy(changeRequest.position);
                }

                if (changeRequest.target) {
                    this.controls.target.copy(changeRequest.target);
                    this.currentState.target.copy(changeRequest.target);
                }

                // Force updates in correct sequence
                this.camera.updateMatrixWorld();
                
                // Re-enable controls with delay for state sync
                setTimeout(() => {
                    this.controls.enabled = wasEnabled;
                    this.currentState.isTransitioning = false;
                    this.isProcessingUpdates = false;
                    
                    this.notifyStateListeners('transitionComplete');
                    
                    if (changeRequest.callback) {
                        changeRequest.callback();
                    }
                }, STATE_SYNC_DELAY);

            } catch (error) {
                console.error('🎯 Camera state change failed:', error);
                this.controls.enabled = wasEnabled;
                this.currentState.isTransitioning = false;
                this.isProcessingUpdates = false;
            }
        }

        // ================================================================
        // SMOOTH TRANSITIONS (to be implemented by CameraTransitionController)
        // ================================================================

        executeSmoothTransition(changeRequest) {
            // This will be handled by the CameraTransitionController
            // For now, fall back to immediate change
            if (DEBUG_CAMERA_STATE) {
                console.log('🎯 Smooth transition requested - delegating to CameraTransitionController');
            }
            
            if (window.CameraTransitionController) {
                window.CameraTransitionController.executeTransition(changeRequest, () => {
                    this.currentState.isTransitioning = false;
                    this.isProcessingUpdates = false;
                    this.notifyStateListeners('transitionComplete');
                });
            } else {
                this.executeImmediateChange(changeRequest);
            }
        }

        // ================================================================
        // FRAME-SYNCED UPDATES
        // ================================================================

        startUpdateLoop() {
            const updateLoop = () => {
                this.frameUpdate();
                requestAnimationFrame(updateLoop);
            };
            requestAnimationFrame(updateLoop);
        }

        frameUpdate() {
            if (!this.camera || !this.controls || this.currentState.isTransitioning) {
                return;
            }

            // Check if camera state has changed externally
            const now = performance.now();
            if (now - this.currentState.lastUpdateTime > 100) { // Check every 100ms
                const posChanged = !this.currentState.position.equals(this.camera.position);
                const targetChanged = !this.currentState.target.equals(this.controls.target);
                
                if (posChanged || targetChanged) {
                    this.syncCurrentState();
                    this.notifyStateListeners('externalChange');
                }
            }
        }

        // ================================================================
        // STATE LISTENERS & CLEANUP
        // ================================================================

        addStateListener(callback) {
            this.stateListeners.add(callback);
        }

        removeStateListener(callback) {
            this.stateListeners.delete(callback);
        }

        notifyStateListeners(eventType) {
            this.stateListeners.forEach(callback => {
                try {
                    callback(eventType, this.getCurrentState());
                } catch (error) {
                    console.error('🎯 State listener error:', error);
                }
            });
        }

        addCleanupCallback(callback) {
            this.cleanupCallbacks.add(callback);
        }

        cleanup() {
            // Clear timers
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }

            // Clear queues
            this.updateQueue.length = 0;
            this.isProcessingUpdates = false;

            // Execute cleanup callbacks
            this.cleanupCallbacks.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.error('🎯 Cleanup callback error:', error);
                }
            });

            // Clear listeners
            this.stateListeners.clear();
            this.cleanupCallbacks.clear();

            // Reset transitioning state
            this.currentState.isTransitioning = false;

            if (DEBUG_CAMERA_STATE) {
                console.log('🎯 CameraStateManager cleaned up');
            }
        }

        // ================================================================
        // UTILITY METHODS
        // ================================================================

        isTransitioning() {
            return this.currentState.isTransitioning;
        }

        getLastUpdateTime() {
            return this.currentState.lastUpdateTime;
        }
    }

    // ====================================================================
    // GLOBAL INITIALIZATION
    // ====================================================================

    // Create global instance
    window.CameraStateManager = new CameraStateManager();

    // Export convenience functions
    window.setCameraState = function(position, target, options) {
        return window.CameraStateManager.requestStateChange(position, target, options);
    };

    window.getCameraState = function() {
        return window.CameraStateManager.getCurrentState();
    };

    window.isCameraTransitioning = function() {
        return window.CameraStateManager.isTransitioning();
    };

    console.log("🎯 CameraStateManager module loaded - centralized camera state management active");

})();