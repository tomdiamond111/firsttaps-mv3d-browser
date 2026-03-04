/**
 * FURNITURE VIEW MANAGER
 * Handles closeup view and rotation mode for furniture interaction
 * - Double-tap from far: Zoom to closeup view
 * - Double-tap when close / drag in closeup: Rotate furniture
 */

(function() {
    'use strict';

    console.log('🪑 Loading FurnitureViewManager module...');

    class FurnitureViewManager {
        constructor(app, camera, cameraControls, scene) {
            this.app = app;
            this.camera = camera;
            this.cameraControls = cameraControls;
            this.scene = scene;
            
            // Closeup view state
            this.isInCloseupView = false;
            this.currentFurniture = null;
            this.isRotationEnabled = false;
            
            // Touch/drag state for rotation
            this.isDragging = false;
            this.dragStartX = 0;
            this.lastDragX = 0;
            
            // Camera state backup (to restore when exiting)
            this.previousCameraState = null;
            
            // Drag event listeners (for cleanup)
            this.dragListeners = null;
            
            console.log('🪑 FurnitureViewManager initialized');
        }
        
        /**
         * Enter closeup view: Camera zooms to furniture front face
         * @param {THREE.Group} furnitureGroup - The furniture group to focus on
         */
        async enterCloseupView(furnitureGroup) {
            if (this.isInCloseupView) {
                console.log('🪑 Already in closeup view - forcing reset');
                // Force exit first to reset state
                this.exitCloseupView();
                // Small delay to let exit complete
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            this.isInCloseupView = true;
            this.currentFurniture = furnitureGroup;
            
            // Save current camera state
            const currentTarget = new THREE.Vector3();
            this.cameraControls.getTarget(currentTarget); // CameraControls stores target internally
            
            this.previousCameraState = {
                position: this.camera.position.clone(),
                target: currentTarget.clone(),
                enabled: this.cameraControls.enabled
            };
            
            console.log('🪑 Saved camera state:', {
                position: this.previousCameraState.position,
                target: this.previousCameraState.target
            });
            
            // Calculate optimal camera position
            const furniturePos = furnitureGroup.position.clone();
            const furnitureRotation = furnitureGroup.rotation.y;
            
            // Position camera in front of furniture, centered on front face
            const distance = 12; // Close distance for clear view of objects
            const height = furniturePos.y; // Same height as furniture center
            
            // Camera faces furniture from its "front" (accounting for rotation)
            const cameraOffset = new THREE.Vector3(
                Math.sin(furnitureRotation) * distance,
                0,
                Math.cos(furnitureRotation) * distance
            );
            
            const newCameraPos = furniturePos.clone().add(cameraOffset);
            newCameraPos.y = height + 2; // Slightly above center for better viewing angle
            
            // Look slightly higher to see top tier objects and center riser vertically on screen
            const targetLookAt = furniturePos.clone();
            targetLookAt.y = height + 3; // Look higher to show top tier and center riser on screen
            
            console.log('🪑 Zooming to closeup:', {
                furniturePos,
                furnitureRotation: (furnitureRotation * 180 / Math.PI).toFixed(1) + '°',
                newCameraPos,
                targetLookAt,
                distance: distance.toFixed(1)
            });
            
            try {
                // Animate camera to closeup position
                console.log('🪑 Animating to closeup view...');
                await this.animateCameraTo(newCameraPos, targetLookAt, 800);
                
                // DON'T disable controls immediately - let the animation complete first
                // The animation needs enabled controls to work properly
                // Controls will be restricted for rotation only in enterRotationMode
                
                console.log('🪑 Entered closeup view - ready for rotation');
                this.showCloseupUI();
                
                // Auto-enable rotation mode (this will set appropriate control restrictions)
                this.enterRotationMode(furnitureGroup);
            } catch (error) {
                console.error('🪑 Failed to enter closeup view:', error);
                // Reset state on failure
                this.isInCloseupView = false;
                this.currentFurniture = null;
                this.cameraControls.enabled = true;
            }
        }
        
        /**
         * Enter rotation mode: User can drag to spin furniture
         * @param {THREE.Group} furnitureGroup - The furniture group to rotate
         */
        enterRotationMode(furnitureGroup) {
            if (!this.isInCloseupView) {
                console.log('🪑 Not in closeup view, entering it first');
                this.enterCloseupView(furnitureGroup);
                return;
            }
            
            if (this.currentFurniture !== furnitureGroup) {
                console.warn('🪑 Different furniture - switching focus');
                this.exitCloseupView();
                this.enterCloseupView(furnitureGroup);
                return;
            }
            
            this.isRotationEnabled = true;
            // Restrict controls to prevent accidental navigation during rotation
            this.cameraControls.enablePan = false;
            this.cameraControls.enableZoom = false;
            this.cameraControls.enableRotate = false;
            
            console.log('🪑 Rotation mode enabled - drag to spin furniture');
            
            this.setupDragRotation();
            this.showRotationUI();
        }
        
        /**
         * Setup drag-to-rotate functionality
         */
        setupDragRotation() {
            if (this.dragListeners) {
                console.log('🪑 Drag rotation already setup');
                return;
            }
            
            const canvas = this.app.renderer.domElement;
            
            // Mouse/touch start
            const onStart = (e) => {
                if (!this.isRotationEnabled) return;
                
                // Prevent default to avoid interference
                e.preventDefault();
                
                this.isDragging = true;
                this.dragStartX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
                this.lastDragX = this.dragStartX;
                console.log('🪑 Drag start:', this.dragStartX);
            };
            
            // Mouse/touch move - rotate furniture
            const onMove = (e) => {
                if (!this.isDragging || !this.isRotationEnabled) return;
                
                e.preventDefault();
                
                const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
                const deltaX = currentX - this.lastDragX;
                
                // Convert horizontal drag to rotation
                const rotationSpeed = 0.01; // Adjust sensitivity
                const rotationDelta = deltaX * rotationSpeed;
                
                this.currentFurniture.rotation.y += rotationDelta;
                this.lastDragX = currentX;
                
                // Update objects on furniture
                this.updateFurnitureObjectPositions();
            };
            
            // Mouse/touch end
            const onEnd = () => {
                if (this.isDragging) {
                    console.log('🪑 Drag end - saving rotation');
                    this.isDragging = false;
                    
                    // Save new rotation to persistence
                    if (this.app.furnitureManager && this.currentFurniture) {
                        this.app.furnitureManager.updateFurnitureRotation(
                            this.currentFurniture.userData.furnitureId,
                            this.currentFurniture.rotation.y
                        );
                    }
                }
            };
            
            // Attach listeners
            canvas.addEventListener('mousedown', onStart, { passive: false });
            canvas.addEventListener('mousemove', onMove, { passive: false });
            canvas.addEventListener('mouseup', onEnd);
            canvas.addEventListener('touchstart', onStart, { passive: false });
            canvas.addEventListener('touchmove', onMove, { passive: false });
            canvas.addEventListener('touchend', onEnd);
            
            // Store for cleanup
            this.dragListeners = { onStart, onMove, onEnd, canvas };
            console.log('🪑 Drag rotation listeners attached');
        }
        
        /**
         * Exit closeup view and return to normal navigation
         */
        async exitCloseupView() {
            if (!this.isInCloseupView) {
                console.log('🪑 Not in closeup view');
                return;
            }
            
            console.log('🪑 Exiting closeup view...');
            
            // Cleanup drag listeners
            if (this.dragListeners) {
                const { canvas, onStart, onMove, onEnd } = this.dragListeners;
                canvas.removeEventListener('mousedown', onStart);
                canvas.removeEventListener('mousemove', onMove);
                canvas.removeEventListener('mouseup', onEnd);
                canvas.removeEventListener('touchstart', onStart);
                canvas.removeEventListener('touchmove', onMove);
                canvas.removeEventListener('touchend', onEnd);
                this.dragListeners = null;
                console.log('🪑 Drag listeners removed');
            }
            
            // Restore camera
            if (this.previousCameraState) {
                console.log('🪑 Restoring camera to:', this.previousCameraState.position);
                try {
                    await this.animateCameraTo(
                        this.previousCameraState.position,
                        this.previousCameraState.target,
                        600
                    );
                    this.cameraControls.enabled = this.previousCameraState.enabled;
                } catch (error) {
                    console.error('🪑 Failed to animate camera back:', error);
                    this.cameraControls.enabled = true;
                }
            }
            
            // Restore full camera controls
            this.cameraControls.enablePan = true;
            this.cameraControls.enableZoom = true;
            this.cameraControls.enableRotate = true;
            
            this.isInCloseupView = false;
            this.isRotationEnabled = false;
            this.currentFurniture = null;
            this.previousCameraState = null;
            
            this.hideCloseupUI();
            console.log('🪑 Exited closeup view');
        }
        
        /**
         * Animate camera to target position smoothly
         * @param {THREE.Vector3} targetPos - Target camera position
         * @param {THREE.Vector3} targetLookAt - Target look-at point
         * @param {number} duration - Animation duration in ms
         * @returns {Promise} - Resolves after animation completes
         */
        async animateCameraTo(targetPos, targetLookAt, duration = 800) {
            console.log('🪑 [ANIM] Starting camera animation...');
            
            // Disable controls before animation
            this.cameraControls.enabled = false;
            
            // Use CameraControls' built-in animation
            this.cameraControls.setLookAt(
                targetPos.x, targetPos.y, targetPos.z,
                targetLookAt.x, targetLookAt.y, targetLookAt.z,
                true  // Enable smooth animation
            );
            
            // Re-enable controls immediately (matches Home button)
            this.cameraControls.enabled = true;
            
            // CRITICAL: Explicitly enable rotation, pan, and zoom for animation (matches Home button)
            this.cameraControls.enableRotate = true;
            this.cameraControls.enablePan = true;
            this.cameraControls.enableZoom = true;
            
            // CRITICAL: Call update(0) to start the animation (matches Home button)
            this.cameraControls.update(0);
            
            console.log('🪑 [ANIM] Animation started, waiting for completion...');
            
            // Wait for animation to complete (~1 second)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('🪑 [ANIM] Camera animation complete');
        }
        
        /**
         * Update positions of objects seated on furniture after rotation
         */
        updateFurnitureObjectPositions() {
            if (!this.currentFurniture || !this.app.furnitureManager) return;
            
            const furnitureId = this.currentFurniture.userData.furnitureId;
            const furniture = this.app.furnitureManager.storageManager.furniture.get(furnitureId);
            
            if (!furniture) return;
            
            furniture.rotation = this.currentFurniture.rotation.y;
            
            furniture.objectIds.forEach((objectId, index) => {
                const slotIndex = furniture.objectIds.indexOf(objectId);
                if (slotIndex < 0 || slotIndex >= furniture.positions.length) return;
                
                const localPos = furniture.positions[slotIndex];
                
                // Rotate local position around furniture center
                const rotatedX = localPos.x * Math.cos(furniture.rotation) - localPos.z * Math.sin(furniture.rotation);
                const rotatedZ = localPos.x * Math.sin(furniture.rotation) + localPos.z * Math.cos(furniture.rotation);
                
                const worldX = furniture.position.x + rotatedX;
                const worldY = furniture.position.y + localPos.y;
                const worldZ = furniture.position.z + rotatedZ;
                
                // Find object in scene and update position
                const objectMesh = this.scene.children.find(child =>
                    child.userData && child.userData.id === objectId
                );
                
                if (objectMesh) {
                    objectMesh.position.set(worldX, worldY, worldZ);
                    objectMesh.rotation.y = furniture.rotation;
                }
            });
        }
        
        /**
         * Show UI overlay for closeup view (exit button, instructions)
         */
        showCloseupUI() {
            // Remove existing overlay if present
            this.hideCloseupUI();
            
            // Create instructions overlay (top-left info text)
            const instructionsOverlay = document.createElement('div');
            instructionsOverlay.id = 'furniture-closeup-instructions-overlay';
            instructionsOverlay.style.cssText = `
                position: fixed;
                top: 80px;
                left: 20px;
                z-index: 1000;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 16px;
                border-radius: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                max-width: 280px;
                pointer-events: none;
            `;
            instructionsOverlay.innerHTML = `
                <div id="furniture-closeup-instructions" style="font-size: 14px; line-height: 1.5;">
                    📱 <strong>Closeup View Active</strong><br>
                    <span style="opacity: 0.9;">Drag to rotate furniture. Press Done to exit.</span>
                </div>
            `;
            document.body.appendChild(instructionsOverlay);
            
            // Create Done button overlay (bottom-right, positioned above Refresh button)
            const buttonOverlay = document.createElement('div');
            buttonOverlay.id = 'furniture-closeup-overlay';
            buttonOverlay.style.cssText = `
                position: fixed;
                bottom: 172px;
                right: 20px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 12px;
            `;
            buttonOverlay.innerHTML = `
                <button id="exit-closeup-btn" style="
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    background: rgba(255, 68, 68, 0.9);
                    backdrop-filter: blur(10px);
                    color: white;
                    cursor: pointer;
                    font-size: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                    transition: all 0.2s;
                    font-weight: bold;
                ">✓</button>
            `;
            document.body.appendChild(buttonOverlay);
            
            const exitBtn = document.getElementById('exit-closeup-btn');
            exitBtn.addEventListener('click', () => {
                this.exitCloseupView();
            });
            
            // Hover effect
            exitBtn.addEventListener('mouseenter', () => {
                exitBtn.style.background = 'rgba(230, 57, 57, 0.9)';
                exitBtn.style.transform = 'scale(1.1)';
            });
            exitBtn.addEventListener('mouseleave', () => {
                exitBtn.style.background = 'rgba(255, 68, 68, 0.9)';
                exitBtn.style.transform = 'scale(1)';
            });
            
            console.log('🪑 Closeup UI shown');
        }
        
        /**
         * Update UI for rotation mode
         */
        showRotationUI() {
            const instructions = document.getElementById('furniture-closeup-instructions');
            if (instructions) {
                instructions.innerHTML = `
                    🔄 <strong>Rotation Mode</strong><br>
                    <span style="opacity: 0.9;">Drag left/right to spin. Press ✓ to exit.</span>
                `;
            }
        }
        
        /**
         * Hide closeup UI overlay
         */
        hideCloseupUI() {
            const overlay = document.getElementById('furniture-closeup-overlay');
            if (overlay) {
                overlay.remove();
            }
            const instructions = document.getElementById('furniture-closeup-instructions-overlay');
            if (instructions) {
                instructions.remove();
            }
            console.log('🪑 Closeup UI hidden');
        }
        
        /**
         * Check if currently in closeup view
         * @returns {boolean}
         */
        isInCloseup() {
            return this.isInCloseupView;
        }
        
        /**
         * Get current furniture being viewed
         * @returns {THREE.Group|null}
         */
        getCurrentFurniture() {
            return this.currentFurniture;
        }
    }

    // Export to window
    if (typeof window !== 'undefined') {
        window.FurnitureViewManager = FurnitureViewManager;
        console.log('✅ FurnitureViewManager exported to window');
    }

})();
