(function() {
    class SmsScreenCameraManager {
        constructor(THREE, camera, renderer) {
            this.THREE = THREE;
            this.camera = camera;
            this.renderer = renderer;
        }

        /**
         * Calculate optimal camera position for SMS screen viewing
         * @param {Object} smsScreen - The SMS screen mesh object
         * @returns {Object} - Camera positioning data { position, lookAt, distance }
         */
        calculateOptimalCameraPosition(smsScreen) {
            if (!smsScreen || !smsScreen.position) {
                console.error('📱 Invalid SMS screen object for camera positioning');
                return null;
            }

            const smsPosition = smsScreen.position.clone();
            
            // Get SMS screen dimensions
            const smsDimensions = this.getSmsScreenDimensions(smsScreen);
            console.log('📱 SMS screen dimensions:', smsDimensions);

            // Get viewport dimensions
            const viewport = this.getViewportInfo();
            console.log('📱 Viewport info:', viewport);
            console.log(`📱 Device orientation: ${viewport.isLandscape ? 'LANDSCAPE' : 'PORTRAIT'} (aspect ratio: ${viewport.aspectRatio.toFixed(2)})`);

            // Calculate optimal distance and position
            const cameraData = this.calculateCameraPositioning(smsPosition, smsDimensions, viewport);
            
            console.log('📱 🎯 OPTIMAL CAMERA POSITIONING CALCULATED:');
            console.log(`📱   → Distance: ${cameraData.distance.toFixed(2)} units`);
            console.log(`📱   → Camera position: (${cameraData.position.x.toFixed(2)}, ${cameraData.position.y.toFixed(2)}, ${cameraData.position.z.toFixed(2)})`);
            console.log(`📱   → Looking at SMS: (${cameraData.lookAt.x.toFixed(2)}, ${cameraData.lookAt.y.toFixed(2)}, ${cameraData.lookAt.z.toFixed(2)})`);
            if (viewport.isLandscape) {
                console.log(`📱   → LANDSCAPE: SMS positioned in RIGHT HALF, Flutter text input on LEFT HALF`);
            } else {
                console.log(`📱   → PORTRAIT: SMS fills screen normally`);
            }
            
            return cameraData;
        }

        /**
         * Get SMS screen dimensions from geometry
         * @param {Object} smsScreen - The SMS screen mesh object
         * @returns {Object} - Dimensions { width, height, depth }
         */
        getSmsScreenDimensions(smsScreen) {
            let dimensions = { width: 2, height: 3, depth: 0.1 }; // Default SMS screen proportions

            try {
                if (smsScreen.geometry && smsScreen.geometry.parameters) {
                    const params = smsScreen.geometry.parameters;
                    dimensions.width = params.width || 2;
                    dimensions.height = params.height || 3;
                    dimensions.depth = params.depth || 0.1;
                } else if (smsScreen.geometry) {
                    // Use bounding box for custom geometries
                    const bbox = new this.THREE.Box3().setFromObject(smsScreen);
                    const size = bbox.getSize(new this.THREE.Vector3());
                    dimensions.width = size.x;
                    dimensions.height = size.y;
                    dimensions.depth = size.z;
                }

                console.log('📱 SMS screen geometry dimensions:', dimensions);
            } catch (error) {
                console.warn('📱 Could not get SMS geometry dimensions, using defaults:', error);
            }

            return dimensions;
        }

        /**
         * Get viewport and orientation information
         * @returns {Object} - Viewport data { width, height, aspectRatio, isLandscape }
         */
        getViewportInfo() {
            const width = this.renderer ? this.renderer.domElement.clientWidth : (window.innerWidth || 800);
            const height = this.renderer ? this.renderer.domElement.clientHeight : (window.innerHeight || 600);
            const aspectRatio = width / height;
            const isLandscape = aspectRatio > 1.2;

            return {
                width,
                height,
                aspectRatio,
                isLandscape
            };
        }

        /**
         * Calculate optimal camera positioning based on SMS dimensions and viewport
         * @param {Vector3} smsPosition - SMS screen world position
         * @param {Object} smsDimensions - SMS screen dimensions
         * @param {Object} viewport - Viewport information
         * @returns {Object} - Camera positioning data
         */
        calculateCameraPositioning(smsPosition, smsDimensions, viewport) {
            // Simple logic: If landscape mode, position SMS in upper right for Flutter text input on left
            const isLandscape = viewport.aspectRatio > 1.2;
            const camera = this.camera;
            const fov = camera.fov || 75;
            const fovRadians = (fov * Math.PI) / 180;

            // Calculate base distance for good SMS viewing
            let targetDistance = smsDimensions.height / (2 * Math.tan(fovRadians / 2)) * 0.8;
            const minDistance = Math.max(smsDimensions.width, smsDimensions.height) * 0.5;
            targetDistance = Math.max(targetDistance, minDistance);

            let cameraOffset = new this.THREE.Vector3(0, 0, targetDistance);
            
            if (isLandscape) {
                // LANDSCAPE + SMS TEXT INPUT: 
                // 1. Zoom in 2x closer (reduce distance by half)
                // 2. Position camera directly in front of SMS (head-on view)
                // 3. Then translate camera 2 units left (pure translation, no rotation)
                targetDistance = targetDistance * 0.5; // 2x closer zoom
                
                // First: Position camera directly in front of SMS screen (head-on)
                cameraOffset = new this.THREE.Vector3(0, 0, targetDistance);
                
                // Then: Translate the camera 4 units to the left (2 + 2 more units)
                const leftTranslation = 4.0; // Increased from 2.0 to 4.0 units left translation
                cameraOffset.x -= leftTranslation;
                
                console.log('📱 LANDSCAPE MODE: 2x zoom + head-on view + 4 units left translation');
                console.log(`📱 Distance: ${targetDistance.toFixed(2)} (2x closer), Left translation: ${leftTranslation} units`);
            } else {
                console.log('📱 Portrait mode: Normal SMS positioning');
            }

            const cameraPosition = smsPosition.clone().add(cameraOffset);

            return {
                position: cameraPosition,
                lookAt: smsPosition,
                distance: targetDistance,
                smsDimensions: smsDimensions,
                viewport: viewport,
                fov: fov,
                isLandscapePositioned: isLandscape
            };
        }

        /**
         * Apply optimal camera positioning with validation
         * @param {Object} cameraData - Camera positioning data from calculateOptimalCameraPosition
         * @returns {boolean} - Success status
         */
        applyCameraPositioning(cameraData) {
            if (!cameraData || !cameraData.position || !cameraData.lookAt) {
                console.error('📱 Invalid camera positioning data');
                return false;
            }

            try {
                // Validate positions
                if (!this.isValidPosition(cameraData.position) || !this.isValidPosition(cameraData.lookAt)) {
                    console.error('📱 Invalid camera or lookAt position');
                    return false;
                }

                console.log(`📱 Applying optimal camera position: ${cameraData.position.x.toFixed(2)}, ${cameraData.position.y.toFixed(2)}, ${cameraData.position.z.toFixed(2)}`);
                console.log(`📱 Looking at SMS position: ${cameraData.lookAt.x.toFixed(2)}, ${cameraData.lookAt.y.toFixed(2)}, ${cameraData.lookAt.z.toFixed(2)}`);
                console.log(`📱 Optimal distance: ${cameraData.distance.toFixed(2)} units`);
                if (cameraData.isLandscapePositioned) {
                    console.log(`📱 LANDSCAPE MODE: Camera positioned to show SMS in RIGHT HALF of screen (Flutter text input on left)`);
                }

                // Apply camera position
                this.camera.position.set(cameraData.position.x, cameraData.position.y, cameraData.position.z);
                
                // Apply camera look direction
                if (cameraData.isLandscapePositioned) {
                    // LANDSCAPE: Camera looks straight ahead from translated position (not angled toward original center)
                    const straightAheadTarget = new this.THREE.Vector3(
                        cameraData.position.x, // Same X as camera (straight ahead)
                        cameraData.position.y, // Same Y as camera (straight ahead)
                        cameraData.lookAt.z     // Look toward the SMS Z position
                    );
                    this.camera.lookAt(straightAheadTarget.x, straightAheadTarget.y, straightAheadTarget.z);
                    console.log(`📱 LANDSCAPE: Camera looking straight ahead from translated position`);
                } else {
                    // PORTRAIT: Normal lookAt behavior (camera looks at SMS center)
                    this.camera.lookAt(cameraData.lookAt.x, cameraData.lookAt.y, cameraData.lookAt.z);
                }
                
                // Update camera matrix
                this.camera.updateMatrixWorld();

                // Log final verification
                console.log(`📱 Camera positioned successfully at: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
                
                return true;
            } catch (error) {
                console.error('📱 Failed to apply camera positioning:', error);
                return false;
            }
        }

        /**
         * Validate if a position has finite values
         * @param {Vector3} position - Position to validate
         * @returns {boolean} - Is valid
         */
        isValidPosition(position) {
            return position && 
                   isFinite(position.x) && 
                   isFinite(position.y) && 
                   isFinite(position.z);
        }

        /**
         * Get debug information about current camera positioning
         * @param {Object} smsScreen - SMS screen object
         * @returns {Object} - Debug information
         */
        getDebugInfo(smsScreen) {
            const smsDimensions = this.getSmsScreenDimensions(smsScreen);
            const viewport = this.getViewportInfo();
            const currentCameraPos = this.camera.position.clone();
            const smsPosition = smsScreen.position.clone();
            const distance = currentCameraPos.distanceTo(smsPosition);

            return {
                smsDimensions,
                viewport,
                currentCameraPosition: currentCameraPos,
                smsPosition,
                distance,
                isOptimal: this.isOptimalDistance(distance, smsDimensions, viewport)
            };
        }

        /**
         * Check if current distance is optimal for SMS viewing
         * @param {number} distance - Current distance to SMS
         * @param {Object} smsDimensions - SMS dimensions
         * @param {Object} viewport - Viewport info
         * @returns {boolean} - Is optimal
         */
        isOptimalDistance(distance, smsDimensions, viewport) {
            const optimalData = this.calculateCameraPositioning(
                new this.THREE.Vector3(0, 0, 0), // dummy position for calculation
                smsDimensions, 
                viewport
            );
            
            const tolerance = 0.5; // 0.5 unit tolerance
            return Math.abs(distance - optimalData.distance) <= tolerance;
        }
    }

    // Export the class
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SmsScreenCameraManager;
    } else {
        window.SmsScreenCameraManager = SmsScreenCameraManager;
    }
})();
