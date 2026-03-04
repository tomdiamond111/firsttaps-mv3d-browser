/**
 * ====================================================================
 * CAMERA TRANSITION CONTROLLER
 * ====================================================================
 * 
 * Handles smooth lerp-based camera transitions with:
 * - Frame-synced interpolation using proven lerp patterns
 * - Easing functions for natural movement
 * - Proper state synchronization during transitions
 * - Cleanup between operations
 * 
 * This module provides the smooth interpolation system that extends
 * the proven lerp patterns from the search system to all camera operations.
 */

(function() {
    'use strict';

    // ====================================================================
    // CONSTANTS
    // ====================================================================
    
    const DEFAULT_DURATION = 1000; // 1 second default
    const MIN_DURATION = 100;
    const MAX_DURATION = 5000;
    const FRAME_TARGET = 60; // Target 60fps
    const DEBUG_TRANSITIONS = false;

    // ====================================================================
    // EASING FUNCTIONS
    // ====================================================================

    const EasingFunctions = {
        // Cubic ease-out (same as search system)
        easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
        
        // Smooth ease-in-out
        easeInOut: (t) => t * t * (3 - 2 * t),
        
        // Linear (no easing)
        linear: (t) => t,
        
        // Gentle ease-out
        easeOut: (t) => 1 - Math.pow(1 - t, 2),
        
        // Gentle ease-in
        easeIn: (t) => t * t
    };

    // ====================================================================
    // CAMERA TRANSITION CONTROLLER CLASS
    // ====================================================================

    class CameraTransitionController {
        constructor() {
            this.activeTransitions = new Map();
            this.transitionCounter = 0;
            
            // References (set when available)
            this.camera = null;
            this.controls = null;
            this.stateManager = null;

            // Initialize when dependencies are ready
            this.initializeWhenReady();
        }

        // ================================================================
        // INITIALIZATION
        // ================================================================

        initializeWhenReady() {
            const checkDependencies = () => {
                if (window.THREE && 
                    window.app && 
                    window.app.camera && 
                    window.app.cameraControls &&
                    window.CameraStateManager) {
                    this.initialize();
                } else {
                    setTimeout(checkDependencies, 100);
                }
            };
            checkDependencies();
        }

        initialize() {
            this.camera = window.app.camera;
            this.controls = window.app.cameraControls;
            this.stateManager = window.CameraStateManager;

            if (DEBUG_TRANSITIONS) {
                console.log('🎬 CameraTransitionController initialized');
            }
        }

        // ================================================================
        // TRANSITION EXECUTION
        // ================================================================

        /**
         * Execute a smooth camera transition
         * @param {Object} changeRequest - The transition parameters
         * @param {Function} onComplete - Callback when transition completes
         * @returns {string} - Transition ID for tracking/cancellation
         */
        executeTransition(changeRequest, onComplete) {
            if (!this.camera || !this.controls) {
                if (onComplete) onComplete();
                return null;
            }

            const transitionId = `transition_${++this.transitionCounter}`;
            
            // Setup transition data
            const transition = {
                id: transitionId,
                startTime: performance.now(),
                duration: Math.max(MIN_DURATION, Math.min(MAX_DURATION, changeRequest.duration || DEFAULT_DURATION)),
                easing: EasingFunctions[changeRequest.easing] || EasingFunctions.easeOutCubic,
                
                // Start positions
                startPosition: this.camera.position.clone(),
                startTarget: this.controls.target.clone(),
                
                // End positions
                endPosition: changeRequest.position ? changeRequest.position.clone() : this.camera.position.clone(),
                endTarget: changeRequest.target ? changeRequest.target.clone() : this.controls.target.clone(),
                
                // Callbacks
                onComplete: onComplete,
                onUpdate: changeRequest.onUpdate,
                
                // State
                isActive: true,
                progress: 0
            };

            // Store transition
            this.activeTransitions.set(transitionId, transition);

            // Disable controls during transition
            const wasEnabled = this.controls.enabled;
            this.controls.enabled = false;

            // Start animation loop
            this.animateTransition(transitionId, wasEnabled);

            if (DEBUG_TRANSITIONS) {
                console.log(`🎬 Started transition ${transitionId}`, {
                    duration: transition.duration,
                    startPos: transition.startPosition,
                    endPos: transition.endPosition
                });
            }

            return transitionId;
        }

        // ================================================================
        // ANIMATION LOOP
        // ================================================================

        animateTransition(transitionId, wasControlsEnabled) {
            const transition = this.activeTransitions.get(transitionId);
            if (!transition || !transition.isActive) {
                return;
            }

            const now = performance.now();
            const elapsed = now - transition.startTime;
            const rawProgress = elapsed / transition.duration;
            
            // Check if transition is complete
            if (rawProgress >= 1) {
                this.completeTransition(transitionId, wasControlsEnabled);
                return;
            }

            // Apply easing
            const easedProgress = transition.easing(rawProgress);
            transition.progress = easedProgress;

            // Interpolate positions (using proven lerp pattern from search system)
            if (transition.endPosition) {
                this.camera.position.lerpVectors(
                    transition.startPosition, 
                    transition.endPosition, 
                    easedProgress
                );
            }

            if (transition.endTarget) {
                this.controls.target.lerpVectors(
                    transition.startTarget, 
                    transition.endTarget, 
                    easedProgress
                );
            }

            // Force camera matrix update (same pattern as search system)
            this.camera.updateMatrixWorld();

            // Call update callback if provided
            if (transition.onUpdate) {
                try {
                    transition.onUpdate(easedProgress, transition);
                } catch (error) {
                    console.error('🎬 Transition update callback error:', error);
                }
            }

            // Continue animation
            requestAnimationFrame(() => {
                this.animateTransition(transitionId, wasControlsEnabled);
            });
        }

        completeTransition(transitionId, wasControlsEnabled) {
            const transition = this.activeTransitions.get(transitionId);
            if (!transition) return;

            // Ensure final positions are set exactly
            if (transition.endPosition) {
                this.camera.position.copy(transition.endPosition);
            }
            if (transition.endTarget) {
                this.controls.target.copy(transition.endTarget);
            }

            // Final matrix update
            this.camera.updateMatrixWorld();

            // Re-enable controls after a short delay for state sync
            setTimeout(() => {
                this.controls.enabled = wasControlsEnabled;
                
                // Sync state manager
                if (this.stateManager) {
                    this.stateManager.syncCurrentState();
                }

                // Call completion callback
                if (transition.onComplete) {
                    try {
                        transition.onComplete();
                    } catch (error) {
                        console.error('🎬 Transition completion callback error:', error);
                    }
                }

                if (DEBUG_TRANSITIONS) {
                    console.log(`🎬 Completed transition ${transitionId}`);
                }
            }, 50); // Small delay for state synchronization

            // Remove from active transitions
            this.activeTransitions.delete(transitionId);
        }

        // ================================================================
        // TRANSITION MANAGEMENT
        // ================================================================

        /**
         * Cancel a specific transition
         */
        cancelTransition(transitionId) {
            const transition = this.activeTransitions.get(transitionId);
            if (transition) {
                transition.isActive = false;
                this.activeTransitions.delete(transitionId);
                
                if (DEBUG_TRANSITIONS) {
                    console.log(`🎬 Cancelled transition ${transitionId}`);
                }
                return true;
            }
            return false;
        }

        /**
         * Cancel all active transitions
         */
        cancelAllTransitions() {
            const transitionIds = Array.from(this.activeTransitions.keys());
            transitionIds.forEach(id => this.cancelTransition(id));
            
            // Re-enable controls
            if (this.controls) {
                this.controls.enabled = true;
            }

            if (DEBUG_TRANSITIONS && transitionIds.length > 0) {
                console.log(`🎬 Cancelled ${transitionIds.length} transitions`);
            }
        }

        /**
         * Get active transition count
         */
        getActiveTransitionCount() {
            return this.activeTransitions.size;
        }

        /**
         * Check if any transitions are active
         */
        hasActiveTransitions() {
            return this.activeTransitions.size > 0;
        }

        // ================================================================
        // CONVENIENCE METHODS
        // ================================================================

        /**
         * Quick smooth move to position
         */
        moveTo(position, options = {}) {
            return this.executeTransition({
                position: position,
                duration: options.duration || DEFAULT_DURATION,
                easing: options.easing || 'easeOutCubic',
                onUpdate: options.onUpdate,
                callback: options.onComplete
            }, options.onComplete);
        }

        /**
         * Quick smooth look at target
         */
        lookAt(target, options = {}) {
            return this.executeTransition({
                target: target,
                duration: options.duration || DEFAULT_DURATION,
                easing: options.easing || 'easeOutCubic',
                onUpdate: options.onUpdate,
                callback: options.onComplete
            }, options.onComplete);
        }

        /**
         * Smooth move and look (combined)
         */
        moveAndLookAt(position, target, options = {}) {
            return this.executeTransition({
                position: position,
                target: target,
                duration: options.duration || DEFAULT_DURATION,
                easing: options.easing || 'easeOutCubic',
                onUpdate: options.onUpdate,
                callback: options.onComplete
            }, options.onComplete);
        }

        // ================================================================
        // CLEANUP
        // ================================================================

        cleanup() {
            this.cancelAllTransitions();
            
            if (DEBUG_TRANSITIONS) {
                console.log('🎬 CameraTransitionController cleaned up');
            }
        }
    }

    // ====================================================================
    // GLOBAL INITIALIZATION
    // ====================================================================

    // Create global instance
    window.CameraTransitionController = new CameraTransitionController();

    // Export convenience functions
    window.smoothMoveCameraTo = function(position, options) {
        return window.CameraTransitionController.moveTo(position, options);
    };

    window.smoothLookAt = function(target, options) {
        return window.CameraTransitionController.lookAt(target, options);
    };

    window.smoothMoveAndLookAt = function(position, target, options) {
        return window.CameraTransitionController.moveAndLookAt(position, target, options);
    };

    window.cancelCameraTransitions = function() {
        return window.CameraTransitionController.cancelAllTransitions();
    };

    console.log("🎬 CameraTransitionController module loaded - smooth camera transitions active");

})();