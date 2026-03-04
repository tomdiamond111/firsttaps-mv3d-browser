/**
 * ====================================================================
 * CAMERA OPTIMIZATION UTILITIES
 * ====================================================================
 * 
 * Simple utility functions to replace problematic camera patterns
 * with optimized versions using the new camera system.
 * 
 * These are added to existing files as needed, not as a runtime layer.
 */

(function() {
    'use strict';

    // Helper function to replace camera.position.set() with smooth transitions
    function optimizedSetCameraPosition(camera, x, y, z, smooth = true, duration = 1000) {
        if (smooth && window.setCameraState) {
            const position = new THREE.Vector3(x, y, z);
            window.setCameraState(position, null, {
                immediate: false,
                smooth: true,
                duration: duration
            });
            return true;
        } else {
            // Fallback to direct setting
            camera.position.set(x, y, z);
            camera.updateMatrixWorld();
            return false;
        }
    }

    // Helper function to replace controls.target.set() with smooth transitions  
    function optimizedSetCameraTarget(controls, x, y, z, smooth = true, duration = 1000) {
        if (smooth && window.setCameraState) {
            const target = new THREE.Vector3(x, y, z);
            window.setCameraState(null, target, {
                immediate: false,
                smooth: true,
                duration: duration
            });
            return true;
        } else {
            // Fallback to direct setting
            controls.target.set(x, y, z);
            return false;
        }
    }

    // Helper function to replace forced controls.update(0) calls
    function optimizedSyncCameraState(controls) {
        if (window.CameraStateManager) {
            window.CameraStateManager.syncCurrentState();
            return true;
        } else {
            // Fallback to forced update
            if (controls && controls.update) {
                controls.update(0);
            }
            return false;
        }
    }

    // Helper function for smooth camera reset
    function optimizedCameraReset(camera, controls, position = null, target = null, duration = 1500) {
        if (window.smoothMoveAndLookAt) {
            const resetPos = position || new THREE.Vector3(0, 50, 100);
            const resetTarget = target || new THREE.Vector3(0, 0, 0);
            
            window.smoothMoveAndLookAt(resetPos, resetTarget, {
                duration: duration,
                easing: 'easeOutCubic'
            });
            return true;
        } else {
            // Fallback to existing force reset
            if (window.forceCameraReset) {
                window.forceCameraReset();
                return true;
            }
            return false;
        }
    }

    // Export utility functions to global scope
    window.optimizedSetCameraPosition = optimizedSetCameraPosition;
    window.optimizedSetCameraTarget = optimizedSetCameraTarget;
    window.optimizedSyncCameraState = optimizedSyncCameraState;
    window.optimizedCameraReset = optimizedCameraReset;

    console.log("🎯 Camera optimization utilities loaded");

})();