// ============================================================================
// EXPLORE MODE CONTROLLER
// ============================================================================
// Main controller for third-person exploration mode
// Provides immersive walking/flying experience in the 3D world

(function() {
    'use strict';

    class ExploreMode {
        constructor(app) {
            console.log('🚶 ExploreMode: Initializing...');
            this.app = app;
            this.isActive = false;
            
            // Avatar and camera configuration
            this.avatar = null;
            this.avatarDistance = 2; // Distance behind avatar - reduced for closer camera
            this.avatarHeight = 2; // Eye level height
            
            // ExploreControls reference (set by ExploreManager)
            this.exploreControls = null;
            
            // Movement configuration
            this.moveSpeed = 0.1; // Movement speed (units per frame)
            this.rotateSpeed = 0.02; // Rotation speed (radians per frame)
            this.edgeThreshold = 80; // Pixels from edge to trigger movement
            
            // Delta-time for smooth movement
            this.lastUpdateTime = null;
            
            // Stored camera state for restoration
            this.previousCameraState = {
                position: null,
                target: null,
                controlsEnabled: null
            };
            
            // Touch/mouse tracking
            this.isMoving = false;
            this.currentMovement = {
                forward: false,
                backward: false,
                left: false,
                right: false,
                rotateUp: false,
                rotateDown: false
            };
            
            console.log('🚶 ExploreMode: Initialized successfully');
        }

        /**
         * Set reference to ExploreControls for movement input
         */
        setExploreControls(exploreControls) {
            this.exploreControls = exploreControls;
            console.log('🚶 ExploreControls reference set');
        }

        /**
         * Wait for AvatarStyles to be loaded (needed for customization menu)
         */
        async waitForAvatarStyles() {
            return new Promise((resolve) => {
                if (window.AvatarStyles) {
                    resolve();
                    return;
                }
                
                console.log('🚶 Waiting for AvatarStyles to load...');
                const checkInterval = setInterval(() => {
                    if (window.AvatarStyles) {
                        clearInterval(checkInterval);
                        console.log('🚶 AvatarStyles loaded successfully');
                        resolve();
                    }
                }, 100);
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    console.warn('🚶 AvatarStyles loading timeout - proceeding anyway');
                    resolve();
                }, 10000);
            });
        }

        /**
         * Enter explore mode - set up third-person view with avatar
         */
        enter() {
            if (this.isActive) {
                console.log('🚶 Already in explore mode');
                return;
            }

            console.log('🚶 Entering explore mode...');

            try {
                // Store current camera state
                this.storeCameraState();
                
                // Create avatar
                this.createAvatar();
                
                // Position avatar in Home Area
                this.positionAvatarInHomeArea();
                
                // Set up third-person camera
                this.setupThirdPersonCamera();
                
                // Enable explore controls
                this.enableExploreControls();
                
                this.isActive = true;
                console.log('🚶 Explore mode activated successfully');
                
                // Notify Flutter about mode change
                this.notifyModeChange(true);
                
            } catch (error) {
                console.error('🚶 Error entering explore mode:', error);
                this.exit(); // Cleanup on error
            }
        }

        /**
         * Exit explore mode - restore normal camera view
         */
        exit() {
            if (!this.isActive) {
                console.log('🚶 Not in explore mode');
                return;
            }

            console.log('🚶 Exiting explore mode...');

            try {
                // Disable explore controls
                this.disableExploreControls();
                
                // Remove avatar
                this.removeAvatar();
                
                // Restore camera state
                this.restoreCameraState();
                
                this.isActive = false;
                console.log('🚶 Explore mode deactivated successfully');
                
                // Notify Flutter about mode change
                this.notifyModeChange(false);
                
            } catch (error) {
                console.error('🚶 Error exiting explore mode:', error);
            }
        }

        /**
         * Toggle explore mode on/off
         */
        toggle() {
            if (this.isActive) {
                this.exit();
            } else {
                this.enter();
            }
        }

        /**
         * Reset explore mode to default home view
         */
        resetToHomeView() {
            if (!this.isActive) {
                console.log('🚶 ❌ Not in explore mode, cannot reset to home view');
                return;
            }

            console.log('🚶 ✅ EXPLORE MODE HOME RESET INITIATED - Resetting explore mode to default home view...');
            
            // Position avatar back in Home Area
            this.positionAvatarInHomeArea();
            
            // Reset third-person camera
            this.setupThirdPersonCamera();
            
            console.log('🚶 ✅ EXPLORE MODE HOME RESET COMPLETE - Explore mode reset to default home view');
        }

        /**
         * Move avatar to focus zone (used for zone navigation)
         * This is the explore mode equivalent of camera focusing
         */
        moveAvatarToFocusZone(targetPosition, zoneName = 'unknown') {
            if (!this.avatar || !this.isActive) {
                console.warn('🚶 Cannot move avatar to focus zone - avatar not available or not in explore mode');
                return false;
            }

            // Calculate optimal position for avatar in the zone
            const newPosition = new THREE.Vector3(
                targetPosition.x,
                Math.max(targetPosition.y, 0.6), // Keep avatar at ground level or higher
                targetPosition.z + 8 // Position avatar at back of zone, facing inward
            );

            // Move avatar to focus zone position
            this.avatar.position.copy(newPosition);
            
            // Make avatar look toward the center of the zone
            const lookTarget = new THREE.Vector3(targetPosition.x, newPosition.y, targetPosition.z);
            this.avatar.lookAt(lookTarget);
            
            // Update camera to follow avatar to new position
            this.setupThirdPersonCamera();
            
            console.log('🚶 Avatar moved to focus zone:', zoneName, 'at position:', newPosition.x.toFixed(2), newPosition.y.toFixed(2), newPosition.z.toFixed(2));
            return true;
        }

        /**
         * Store current camera state for restoration
         */
        storeCameraState() {
            if (!this.app.camera || !this.app.cameraControls) {
                console.warn('🚶 Camera or controls not available for state storage');
                return;
            }

            try {
                // Get target using the proper method
                const target = new THREE.Vector3();
                if (this.app.cameraControls.getTarget) {
                    this.app.cameraControls.getTarget(target);
                } else if (this.app.cameraControls.target) {
                    target.copy(this.app.cameraControls.target);
                } else {
                    target.set(0, 0, 0);
                }

                this.previousCameraState = {
                    position: this.app.camera.position.clone(),
                    target: target,
                    controlsEnabled: {
                        enabled: this.app.cameraControls.enabled,
                        enableRotate: this.app.cameraControls.enableRotate || true,
                        enablePan: this.app.cameraControls.enablePan || true,
                        enableZoom: this.app.cameraControls.enableZoom || true
                    }
                };

                console.log('🚶 Camera state stored for restoration');
            } catch (error) {
                console.error('🚶 Error storing camera state:', error);
                // Set safe defaults
                this.previousCameraState = {
                    position: new THREE.Vector3(0, 10, 20),
                    target: new THREE.Vector3(0, 0, 0),
                    controlsEnabled: {
                        enabled: true,
                        enableRotate: true,
                        enablePan: true,
                        enableZoom: true
                    }
                };
            }
        }

        /**
         * Restore previous camera state when exiting explore mode
         */
        restoreCameraState() {
            if (!this.previousCameraState || !this.previousCameraState.position || !this.app.camera || !this.app.cameraControls) {
                console.warn('🚶 Cannot restore camera state - using home view instead');
                // Fallback to home view
                if (this.app.resetHomeView) {
                    this.app.resetHomeView();
                }
                return;
            }

            // Restore camera position
            this.app.camera.position.copy(this.previousCameraState.position);
            
            // Restore camera target using proper method
            if (this.app.cameraControls.setTarget) {
                this.app.cameraControls.setTarget(
                    this.previousCameraState.target.x,
                    this.previousCameraState.target.y,
                    this.previousCameraState.target.z,
                    false  // Do not animate
                );
            } else if (this.app.cameraControls.target) {
                this.app.cameraControls.target.copy(this.previousCameraState.target);
            }
            
            // Restore camera controls state
            const controls = this.previousCameraState.controlsEnabled;
            this.app.cameraControls.enabled = controls.enabled;
            this.app.cameraControls.enableRotate = controls.enableRotate;
            this.app.cameraControls.enablePan = controls.enablePan;
            this.app.cameraControls.enableZoom = controls.enableZoom;
            
            // Update camera controls
            this.app.cameraControls.update(0);
            
            console.log('🚶 Camera state restored successfully');
        }

        /**
         * Create avatar model using customization system
         */
        createAvatar() {
            if (this.avatar) {
                this.removeAvatar();
            }
            
            // Use avatar generator with customization or farmer default
            this.createCustomizedAvatar();
        }        /**
         * Create customized avatar using AvatarGenerator (same system as contact avatars)
         */
        createCustomizedAvatar() {
            console.log('🚶 Creating customized explore avatar...');
            
            // Get customization configuration from ContactCustomizationManager
            let config;
            if (window.ContactCustomizationManager && window.ContactCustomizationManager.instance) {
                // Try to get saved configuration for explore avatar
                config = window.ContactCustomizationManager.instance.getContactCustomization('EXPLORE_AVATAR');
                console.log('🚶 Loaded explore avatar config from ContactCustomizationManager:', config);
            }
            
            // Fallback to ExploreAvatarCustomizationManager if ContactCustomizationManager doesn't have config
            if (!config && window.ExploreAvatarCustomizationManager && window.ExploreAvatarCustomizationManager.instance) {
                config = window.ExploreAvatarCustomizationManager.instance.getExploreAvatarCustomization();
                console.log('🚶 Fallback: Loaded explore avatar config from ExploreAvatarCustomizationManager:', config);
            }
            
            // Final fallback to farmer default if no customization managers are available
            if (!config) {
                config = {
                    hair: 'short',
                    hairColor: 'brown',
                    skinTone: 'medium',
                    age: 'youngAdult',
                    gender: 'male',
                    clothing: 'farmer'
                };
                console.log('🚶 Final fallback: Using default farmer configuration:', config);
            }
            
            console.log('🚶 Using avatar configuration:', config);
            
            // Create avatar using AvatarGenerator (same as contact avatars)
            if (window.AvatarGenerator) {
                const avatarGenerator = new window.AvatarGenerator();
                
                // Add contactId to config for proper SVG generation
                const configWithId = {
                    ...config,
                    contactId: 'EXPLORE_AVATAR',
                    parentContactId: 'EXPLORE_AVATAR'
                };
                
                this.avatar = avatarGenerator.generateAvatar(configWithId);
                
                // Set up avatar properties for explore mode
                this.avatar.name = 'ExploreAvatar';
                this.avatar.userData = {
                    ...this.avatar.userData,
                    type: 'exploreAvatar',
                    isExploreAvatar: true,
                    isWireframe: false,
                    customizable: true
                };
                
                // Scale avatar appropriately for explore mode (same as contact avatars)
                const scale = 0.8;
                this.avatar.scale.set(scale, scale, scale);
                
                // NOTE: Position and rotation will be set by positionAvatarInHomeArea()
                // Don't set position or rotation here as they will be handled by proper positioning
                
                // Add collision sphere for double-tap detection
                this.addAvatarCollisionSphere();
                
                // Add to scene
                if (this.app.scene) {
                    this.app.scene.add(this.avatar);
                    console.log('🚶 ✅ Customized explore avatar created successfully');
                } else {
                    console.error('🚶 Cannot add avatar - scene not available');
                }
                
            } else {
                console.warn('🚶 AvatarGenerator not available, falling back to simple SVG avatar');
                this.createSVGAvatar();
            }
        }
        
        /**
         * Add collision sphere for avatar double-tap detection
         */
        addAvatarCollisionSphere() {
            if (!this.avatar) {
                console.warn('🚶 Cannot add collision sphere - no avatar');
                return;
            }
            
            // Initialize collision manager if needed
            if (!window.ExploreAvatarCollisionManager.instance) {
                window.ExploreAvatarCollisionManager.initialize(this.app);
                window.ExploreAvatarCollisionManager.instance.setExploreMode(this);
            }
            
            // Note: ExploreAvatarCustomizationManager is now initialized globally in mainApplication.js
            // No need to initialize it here anymore
            
            // Create collision sphere around avatar
            const collisionSphere = window.ExploreAvatarCollisionManager.instance.createCollisionSphere(this.avatar);
            
            if (collisionSphere) {
                console.log('🚶 Collision sphere added to explore avatar');
            }
        }

        /**
         * Create SVG-style farmer avatar for all platforms (unified approach)
         */
        createSVGAvatar() {
            console.log('🚶 Creating SVG-style farmer avatar...');
            
            // Create avatar group
            this.avatar = new THREE.Group();
            this.avatar.name = 'ExploreAvatar';
            this.avatar.userData.isWireframe = false;
            this.avatar.userData.isSVGBased = true;
            
            // SVG-style farmer avatar materials
            const skinColor = new THREE.MeshLambertMaterial({ color: 0xffdbac });
            const shirtColor = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Forest green farmer shirt
            const pantsColor = new THREE.MeshLambertMaterial({ color: 0x4169E1 }); // Royal blue overalls
            const hatColor = new THREE.MeshLambertMaterial({ color: 0xDAA520 }); // Golden straw hat
            const eyeColor = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const bootColor = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Brown leather boots

            // Head
            const headGeometry = new THREE.SphereGeometry(0.18, 12, 8);
            const head = new THREE.Mesh(headGeometry, skinColor);
            head.position.set(0, 0.85, 0);
            this.avatar.add(head);
            
            // Eyes
            const eyeGeometry = new THREE.SphereGeometry(0.025, 6, 4);
            const leftEye = new THREE.Mesh(eyeGeometry, eyeColor);
            leftEye.position.set(-0.06, 0.88, 0.14);
            this.avatar.add(leftEye);
            
            const rightEye = new THREE.Mesh(eyeGeometry, eyeColor);
            rightEye.position.set(0.06, 0.88, 0.14);
            this.avatar.add(rightEye);
            
            // Body (torso with farmer shirt)
            const bodyGeometry = new THREE.CylinderGeometry(0.22, 0.28, 0.7, 8);
            const body = new THREE.Mesh(bodyGeometry, shirtColor);
            body.position.set(0, 0.35, 0);
            this.avatar.add(body);
            
            // Arms
            const armGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.55, 6);
            
            const leftArm = new THREE.Mesh(armGeometry, skinColor);
            leftArm.position.set(-0.35, 0.3, 0);
            leftArm.rotation.z = 0.15;
            this.avatar.add(leftArm);
            
            const rightArm = new THREE.Mesh(armGeometry, skinColor);
            rightArm.position.set(0.35, 0.3, 0);
            rightArm.rotation.z = -0.15;
            this.avatar.add(rightArm);
            
            // Legs (overalls/pants)
            const legGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 6);
            
            const leftLeg = new THREE.Mesh(legGeometry, pantsColor);
            leftLeg.position.set(-0.12, -0.3, 0);
            this.avatar.add(leftLeg);
            
            const rightLeg = new THREE.Mesh(legGeometry, pantsColor);
            rightLeg.position.set(0.12, -0.3, 0);
            this.avatar.add(rightLeg);
            
            // Iconic farmer straw hat
            const hatGeometry = new THREE.CylinderGeometry(0.2, 0.18, 0.08, 8);
            const hat = new THREE.Mesh(hatGeometry, hatColor);
            hat.position.set(0, 0.98, 0);
            this.avatar.add(hat);
            
            // Hat brim (wide for sun protection)
            const brimGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.015, 16);
            const brim = new THREE.Mesh(brimGeometry, hatColor);
            brim.position.set(0, 0.94, 0);
            this.avatar.add(brim);
            
            // Work boots
            const bootGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.18);
            const leftBoot = new THREE.Mesh(bootGeometry, bootColor);
            leftBoot.position.set(-0.08, -0.57, 0.02);
            this.avatar.add(leftBoot);
            
            const rightBoot = new THREE.Mesh(bootGeometry, bootColor);
            rightBoot.position.set(0.08, -0.57, 0.02);
            this.avatar.add(rightBoot);
            
            // Scale the avatar appropriately
            const scale = 0.8;
            this.avatar.scale.set(scale, scale, scale);
            
            // NOTE: Position and rotation will be set by positionAvatarInHomeArea()
            // Don't set position or rotation here as they will be handled by proper positioning
            
            // Add to scene
            if (this.app.scene) {
                this.app.scene.add(this.avatar);
                console.log('🚶 ✅ SVG-style farmer avatar created successfully (facing toward Home Area objects)');
            } else {
                console.error('🚶 Cannot add avatar - scene not available');
            }
        }

        /**
         * Remove avatar from scene (handles both customized and SVG avatars)
         */
        removeAvatar() {
            if (this.avatar && this.app.scene) {
                // Clean up collision sphere first
                if (window.ExploreAvatarCollisionManager && window.ExploreAvatarCollisionManager.instance) {
                    window.ExploreAvatarCollisionManager.instance.removeCollisionSphere();
                }
                
                this.app.scene.remove(this.avatar);
                
                // Clean up avatar resources (works for both SVG and generated avatars)
                this.avatar.traverse((child) => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
                
                this.avatar = null;
                console.log('🚶 Explore avatar removed from scene');
            }
        }

        /**
         * Position avatar in Home Area looking toward origin
         */
        positionAvatarInHomeArea() {
            if (!this.avatar) {
                console.warn('🚶 Cannot position avatar - avatar not created');
                return;
            }

            // Position avatar at the back of the Home Area, facing toward the objects
            this.avatar.position.set(0, 0.6, 18); // Behind Home Area
            
            // Face avatar toward Home Area objects (rotate 180 degrees from current orientation)
            this.avatar.rotation.y = 0; // Face toward Home Area objects
            
            console.log('🚶 Avatar positioned in Home Area, facing toward Home Area objects');
        }

        /**
         * Move avatar to a specific position with camera following
         * Used for double-tap navigation in explore mode
         */
        moveAvatarToPosition(targetPosition, lookAtTarget = null) {
            if (!this.avatar || !this.isActive) {
                console.warn('🚶 Cannot move avatar - avatar not available or not in explore mode');
                return;
            }

            // Ensure target position has proper Y coordinate (ground level)
            const newPosition = new THREE.Vector3(
                targetPosition.x,
                Math.max(targetPosition.y, 0.6), // Keep avatar at ground level or higher
                targetPosition.z
            );

            // Move avatar to target position
            this.avatar.position.copy(newPosition);
            
            // If lookAtTarget is provided, make avatar face that direction
            if (lookAtTarget) {
                this.avatar.lookAt(lookAtTarget);
            }
            
            // Update camera to follow avatar to new position - maintains distance behind avatar
            this.setupThirdPersonCamera();
            
            console.log('🚶 Avatar moved to position:', newPosition.x.toFixed(2), newPosition.y.toFixed(2), newPosition.z.toFixed(2));
        }

        /**
         * Set up third-person camera behind avatar
         */
        setupThirdPersonCamera() {
            if (!this.avatar || !this.app.camera || !this.app.cameraControls) {
                console.warn('🚶 Cannot setup third-person camera - components missing');
                return;
            }

            // Forcibly disable standard camera controls to prevent separation
            this.app.cameraControls.enabled = false;
            
            // Position camera behind avatar at eye level (traditional third-person view)
            const avatarPos = this.avatar.position;
            const cameraPos = new THREE.Vector3(
                avatarPos.x,
                avatarPos.y + this.avatarHeight,
                avatarPos.z + this.avatarDistance  // Behind avatar
            );
            
            // Set camera position and look at avatar's back
            this.app.camera.position.copy(cameraPos);
            this.app.camera.lookAt(avatarPos.x, avatarPos.y + this.avatarHeight, avatarPos.z);
            
            // Camera should already be facing the correct direction after lookAt()
            // Removed the 180-degree rotation that was causing wrong orientation
            
            // Additional safety check - if camera controls try to re-enable, disable them
            if (this.app.cameraControls.enabled) {
                this.app.cameraControls.enabled = false;
                console.warn('🚶 Camera controls were re-enabled - forcibly disabled for explore mode');
            }
            
            console.log('🚶 Third-person camera positioned behind avatar - controls locked');
        }

        /**
         * Update camera to follow avatar (call this in animation loop)
         */
        updateCameraFollow() {
            if (!this.isActive || !this.avatar || !this.app.camera) {
                return;
            }

            // Ensure camera controls are always disabled in explore mode
            if (this.app.cameraControls && this.app.cameraControls.enabled) {
                console.warn('🚶 Camera controls were enabled in explore mode - disabling');
                this.app.cameraControls.enabled = false;
            }

            // Get avatar position and rotation
            const avatarPos = this.avatar.position;
            const avatarRotation = this.avatar.rotation;
            
            // Calculate camera position behind avatar (traditional third-person)
            const offset = new THREE.Vector3(0, this.avatarHeight, this.avatarDistance); // Behind avatar
            offset.applyQuaternion(this.avatar.quaternion);
            
            const cameraPos = avatarPos.clone().add(offset);
            
            // Smoothly move camera to follow position
            this.app.camera.position.lerp(cameraPos, 0.1);
            
            // Make camera look at avatar's back
            const lookTarget = avatarPos.clone();
            lookTarget.y += this.avatarHeight;
            
            this.app.camera.lookAt(lookTarget);
        }

        /**
         * Enable explore-specific controls (edge-based movement)
         */
        enableExploreControls() {
            // Use ExploreControls instance if available
            if (this.exploreControls) {
                this.exploreControls.enable();
                console.log('🚶 Explore controls enabled via ExploreControls');
            } else {
                // Fallback to old method if ExploreControls not available
                if (this.app.renderer && this.app.renderer.domElement) {
                    this.boundHandlePointerDown = this.handlePointerDown.bind(this);
                    this.boundHandlePointerMove = this.handlePointerMove.bind(this);
                    this.boundHandlePointerUp = this.handlePointerUp.bind(this);
                    
                    const element = this.app.renderer.domElement;
                    element.addEventListener('pointerdown', this.boundHandlePointerDown);
                    element.addEventListener('pointermove', this.boundHandlePointerMove);
                    element.addEventListener('pointerup', this.boundHandlePointerUp);
                    
                    console.log('🚶 Explore controls enabled (fallback mode)');
                } else {
                    console.warn('🚶 Cannot enable controls - renderer element not available');
                }
            }
        }

        /**
         * Disable explore controls
         */
        disableExploreControls() {
            // Use ExploreControls instance if available
            if (this.exploreControls) {
                this.exploreControls.disable();
                console.log('🚶 Explore controls disabled via ExploreControls');
            } else {
                // Fallback to old method if ExploreControls not available
                if (this.app.renderer && this.app.renderer.domElement) {
                    const element = this.app.renderer.domElement;
                    
                    if (this.boundHandlePointerDown) {
                        element.removeEventListener('pointerdown', this.boundHandlePointerDown);
                    }
                    if (this.boundHandlePointerMove) {
                        element.removeEventListener('pointermove', this.boundHandlePointerMove);
                    }
                    if (this.boundHandlePointerUp) {
                        element.removeEventListener('pointerup', this.boundHandlePointerUp);
                    }
                }
            }
            
            // Clear movement state regardless of method used
            this.isMoving = false;
            this.currentMovement = {
                forward: false,
                backward: false,
                left: false,
                right: false,
                rotateUp: false,
                rotateDown: false
            };
            
            console.log('🚶 Explore controls disabled');
        }

        /**
         * Handle pointer down events for movement start
         */
        handlePointerDown(event) {
            if (!this.isActive) return;
            
            this.isMoving = true;
            this.updateMovementFromPointer(event);
        }

        /**
         * Handle pointer move events for continuous movement
         */
        handlePointerMove(event) {
            if (!this.isActive || !this.isMoving) return;
            
            this.updateMovementFromPointer(event);
        }

        /**
         * Handle pointer up events for movement stop
         */
        handlePointerUp(event) {
            if (!this.isActive) return;
            
            this.isMoving = false;
            // Stop all movement
            this.currentMovement = {
                forward: false,
                backward: false,
                left: false,
                right: false,
                rotateUp: false,
                rotateDown: false
            };
        }

        /**
         * Update movement state based on pointer position
         */
        updateMovementFromPointer(event) {
            if (!this.app.renderer) return;
            
            const rect = this.app.renderer.domElement.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const width = rect.width;
            const height = rect.height;
            
            // Reset movement state
            this.currentMovement = {
                forward: false,
                backward: false,
                left: false,
                right: false,
                rotateUp: false,
                rotateDown: false
            };
            
            // Check edges for movement
            if (x < this.edgeThreshold) {
                this.currentMovement.left = true;
            } else if (x > width - this.edgeThreshold) {
                this.currentMovement.right = true;
            }
            
            if (y < this.edgeThreshold) {
                this.currentMovement.rotateUp = true;
            } else if (y > height - this.edgeThreshold) {
                this.currentMovement.rotateDown = true;
            }
            
            // Center area for forward/backward
            const centerThreshold = Math.min(width, height) * 0.3;
            const centerX = width / 2;
            const centerY = height / 2;
            const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            
            if (distanceFromCenter < centerThreshold) {
                if (y < centerY) {
                    this.currentMovement.forward = true;
                } else {
                    this.currentMovement.backward = true;
                }
            }
        }

        /**
         * Update avatar movement (call this in animation loop)
         */
        updateMovement() {
            if (!this.isActive || !this.avatar) {
                return;
            }

            // Get current time for delta calculation
            const currentTime = performance.now();
            if (!this.lastUpdateTime) {
                this.lastUpdateTime = currentTime;
                return;
            }
            
            const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
            this.lastUpdateTime = currentTime;
            
            let movement = this.currentMovement;
            
            // Smart logging counter for reduced spam
            if (!this.movementLogCounter) this.movementLogCounter = 0;
            
            // If using ExploreControls, get movement from there
            if (this.exploreControls && this.exploreControls.isActive) {
                const controlsMovement = this.exploreControls.getMovementVector();
                if (controlsMovement) {
                    // Smart logging - only log every 60th movement to reduce spam
                    if (this.movementLogCounter % 60 === 0) {
                        console.log('🚶 Controls movement:', controlsMovement);
                    }
                    this.movementLogCounter++;
                    
                    // Convert ExploreControls movement to our format with improved thresholds
                    movement = {
                        forward: controlsMovement.y > 0.05,  // Lower threshold for better responsiveness
                        backward: controlsMovement.y < -0.05,  // Lower threshold for better responsiveness
                        left: controlsMovement.rotation < -0.01,  // Left rotation (negative rotation)
                        right: controlsMovement.rotation > 0.01, // Right rotation (positive rotation)
                        rotateUp: false, // Not implemented yet
                        rotateDown: false // Not implemented yet
                    };
                    
                    // Set moving state based on controls input
                    this.isMoving = Math.abs(controlsMovement.x) > 0.01 || 
                                   Math.abs(controlsMovement.y) > 0.05 || 
                                   Math.abs(controlsMovement.rotation) > 0.01;
                                   
                    // Only log movement detection occasionally
                    if (this.isMoving && this.movementLogCounter % 60 === 0) {
                        console.log('🚶 Movement detected:', movement);
                    }
                }
            }
            
            // Only apply movement if we're actually moving
            if (!this.isMoving) {
                return;
            }

            // Apply delta-time based movement speeds with improved speed
            const baseMoveSpeed = 0.2; // Increased from 0.1 for better responsiveness
            const baseRotateSpeed = 0.03; // Slightly increased rotation speed
            const adjustedMoveSpeed = baseMoveSpeed * deltaTime * 60; // Normalize to 60fps
            const adjustedRotateSpeed = baseRotateSpeed * deltaTime * 60;
            
            // Forward/backward movement
            if (movement.forward || movement.backward) {
                const direction = movement.forward ? -1 : 1; // Negative Z is forward in Three.js
                const moveVector = new THREE.Vector3(0, 0, direction * adjustedMoveSpeed);
                moveVector.applyQuaternion(this.avatar.quaternion);
                this.avatar.position.add(moveVector);
            }
            
            // Left/right rotation
            if (movement.left || movement.right) {
                const rotationDirection = movement.left ? 1 : -1;
                this.avatar.rotateY(rotationDirection * adjustedRotateSpeed);
            }
            
            // Vertical rotation (pitch) - rotate camera up/down
            if (movement.rotateUp || movement.rotateDown) {
                // This would adjust camera angle relative to avatar
                // For now, keep it simple and just note the intent
                console.log('🚶 Vertical rotation:', movement.rotateUp ? 'up' : 'down');
            }
        }

        /**
         * Main update method - call this in the animation loop
         */
        update() {
            if (!this.isActive) {
                return;
            }
            
            this.updateMovement();
            this.updateCameraFollow();
        }

        /**
         * Notify Flutter about mode change
         */
        notifyModeChange(isActive) {
            if (window.ExploreChannel && window.ExploreChannel.postMessage) {
                const message = JSON.stringify({
                    action: 'exploreModeChanged',
                    isActive: isActive
                });
                window.ExploreChannel.postMessage(message);
                console.log('🚶 Notified Flutter about explore mode change:', isActive);
            }
        }

        /**
         * Get current explore mode state
         */
        getState() {
            return {
                isActive: this.isActive,
                hasAvatar: !!this.avatar,
                avatarPosition: this.avatar ? this.avatar.position.clone() : null
            };
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.ExploreMode = ExploreMode;
    
    console.log("🚶 ExploreMode module loaded - ExploreMode class available globally");
})();
