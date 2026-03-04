// assets/web/js/modules/camera/cameraFocusManager.js
// Dependencies: THREE (global), CameraControls (global)
// Exports: window.CameraFocusManager

(function() {
    'use strict';

    console.log("Loading CameraFocusManager module...");

    const CLOSE_DISTANCE_THRESHOLD = 15; // Distance to be considered "close" to an object

    class CameraFocusManager {
        constructor(camera, cameraControls) {
            this.camera = camera;
            this.cameraControls = cameraControls;
            console.log("CameraFocusManager initialized");
        }

        /**
         * Checks if the camera is already close to a target object.
         * @param {THREE.Object3D} object - The target object.
         * @returns {boolean} - True if the camera is close, false otherwise.
         */
        isCameraCloseToObject(object) {
            if (!object) return false;
            
            // CRITICAL FIX: Use world position, not local position
            const objectWorldPosition = new THREE.Vector3();
            object.getWorldPosition(objectWorldPosition);
            
            const distance = this.camera.position.distanceTo(objectWorldPosition);
            console.log(`CameraFocusManager: Distance to object: ${distance.toFixed(2)}, Close threshold: ${CLOSE_DISTANCE_THRESHOLD.toFixed(2)}`);
            return distance < CLOSE_DISTANCE_THRESHOLD;
        }

        /**
         * Smoothly moves the camera to focus on a target object.
         * @param {THREE.Object3D} object - The object to focus on.
         * @param {function} [onComplete] - Optional callback to run after the transition.
         */
        focusOnObject(object, onComplete) {
            if (!object) {
                console.error("CameraFocusManager: Missing object.");
                return;
            }
            
            if (!this.cameraControls) {
                console.warn("CameraFocusManager: No camera controls available, using direct camera positioning only.");
            }
            
            console.log(`CameraFocusManager: Focusing camera on object: ${object.userData.fileName || object.uuid}`);

            // CRITICAL FIX: Temporarily enable controls if they exist
            let wasEnabled = false;
            if (this.cameraControls) {
                wasEnabled = this.cameraControls.enabled;
                this.cameraControls.enabled = true;
                console.log(`CameraFocusManager: Temporarily enabled camera controls (was: ${wasEnabled})`);
            }

            const objectPosition = new THREE.Vector3();
            object.getWorldPosition(objectPosition);

            const boundingBox = new THREE.Box3().setFromObject(object);
            const objectSize = boundingBox.getSize(new THREE.Vector3());
            const objectCenter = boundingBox.getCenter(new THREE.Vector3());

            const maxDim = Math.max(objectSize.x, objectSize.y, objectSize.z);
            // CRITICAL FIX: Position camera much closer to ensure we get well below the 15-unit threshold
            // We need to account for the Y offset, so target total distance should be around 10-12 units
            const baseDistance = Math.max(maxDim * 0.8, 6); // Much closer base distance
            const yOffset = objectSize.y * 0.3; // Reduced Y offset
            
            const offset = new THREE.Vector3(0, yOffset, baseDistance);
            const newCameraPosition = objectCenter.clone().add(offset);
            
            // Calculate actual distance for verification
            const actualDistance = newCameraPosition.distanceTo(objectCenter);

            console.log(`CameraFocusManager: Object size: ${objectSize.x.toFixed(2)}x${objectSize.y.toFixed(2)}x${objectSize.z.toFixed(2)}, maxDim: ${maxDim.toFixed(2)}`);
            console.log(`CameraFocusManager: Base distance: ${baseDistance.toFixed(2)}, Y offset: ${yOffset.toFixed(2)}, Actual distance: ${actualDistance.toFixed(2)}, threshold: ${CLOSE_DISTANCE_THRESHOLD}`);
            console.log(`CameraFocusManager: Moving camera to focus on object. Target:`, objectCenter, `New Position:`, newCameraPosition);

            // ULTIMATE FIX: Force immediate positioning using multiple methods
            console.log(`CameraFocusManager: FORCING camera position update with multiple methods`);
            
            // Method 1: Direct camera position
            this.camera.position.set(newCameraPosition.x, newCameraPosition.y, newCameraPosition.z);
            
            // Method 2: Update camera matrix
            this.camera.updateMatrix();
            this.camera.updateMatrixWorld(true);
            
            // Method 3: Force camera controls to accept new position (if available)
            if (this.cameraControls && this.cameraControls.object) {
                console.log(`CameraFocusManager: Updating camera controls position`);
                this.cameraControls.object.position.copy(newCameraPosition);
                this.cameraControls.setTarget(objectCenter.x, objectCenter.y, objectCenter.z);
                
                // Method 4: Force update camera controls internal state
                if (this.cameraControls.saveState) {
                    this.cameraControls.saveState();
                }
                this.cameraControls.update();
                
                // Method 5: Disable auto-rotation and other interference
                this.cameraControls.autoRotate = false;
                this.cameraControls.enableDamping = false;
                
                console.log(`CameraFocusManager: Camera controls position:`, this.cameraControls.object.position);
            } else {
                console.log(`CameraFocusManager: No camera controls available, using direct camera positioning only`);
            }
            
            console.log(`CameraFocusManager: Multi-method camera positioning applied`);
            console.log(`CameraFocusManager: New camera position:`, this.camera.position);
            
            // Restore original state
            if (this.cameraControls) {
                this.cameraControls.enabled = wasEnabled;
                console.log(`CameraFocusManager: Direct camera positioning complete. Controls restored to: ${wasEnabled}`);
            }
            
            // Call completion callback immediately since we're not using animation
            if (onComplete) {
                setTimeout(() => {
                    onComplete();
                }, 100); // Small delay to ensure rendering update
            }
        }

        /**
         * Smoothly moves the camera to focus on an SMS screen.
         * @param {THREE.Object3D} smsScreenMesh - The SMS screen mesh to focus on.
         * @param {function} [onComplete] - Optional callback to run after the transition.
         */
        focusOnSmsScreen(smsScreenMesh, onComplete) {
            if (!smsScreenMesh || !this.cameraControls) {
                console.error("CameraFocusManager: Missing SMS screen mesh or cameraControls.");
                return;
            }
            console.log(`CameraFocusManager: Focusing on SMS screen for contact: ${smsScreenMesh.userData.contactId}`);

            // CRITICAL FIX: Temporarily enable controls for smooth movement
            const wasEnabled = this.cameraControls.enabled;
            this.cameraControls.enabled = true;
            console.log(`CameraFocusManager: Temporarily enabled camera controls for SMS screen (was: ${wasEnabled})`);

            const screenCenter = new THREE.Vector3();
            smsScreenMesh.getWorldPosition(screenCenter);

            const screenWidth = smsScreenMesh.geometry.parameters.width;
            // Make the SMS screen focus much more dramatic - closer distance
            const distance = Math.max(screenWidth * 0.6, 1.5); // Much closer than before
            
            const normal = new THREE.Vector3(0, 0, 1);
            normal.applyQuaternion(smsScreenMesh.quaternion);

            const newCameraPosition = screenCenter.clone().add(normal.multiplyScalar(distance));
            // Adjust camera height to be more centered on the screen
            newCameraPosition.y = screenCenter.y;

            console.log(`🎯 DRAMATIC SMS FOCUS: Moving camera MUCH closer to SMS screen`);
            console.log(`🎯 Screen center:`, screenCenter);
            console.log(`🎯 New camera position:`, newCameraPosition);
            console.log(`🎯 Distance from screen: ${distance}`);

            this.cameraControls.setLookAt(
                newCameraPosition.x, newCameraPosition.y, newCameraPosition.z,
                screenCenter.x, screenCenter.y, screenCenter.z,
                true // Enable transition
            ).then(() => {
                // Restore original state
                this.cameraControls.enabled = wasEnabled;
                console.log(`CameraFocusManager: SMS screen focus transition complete. Controls restored to: ${wasEnabled}`);
                if (onComplete) {
                    onComplete();
                }
            });
        }
    }

    window.CameraFocusManager = CameraFocusManager;
    console.log("CameraFocusManager module loaded successfully.");
})();
