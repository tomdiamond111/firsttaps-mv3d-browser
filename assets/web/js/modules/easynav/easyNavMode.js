// ============================================================================
// EASYNAV MODE CONTROLLER
// ============================================================================
// Simplified navigation mode with 2D overhead map for easy object location

(function() {
    'use strict';

    class EasyNavMode {
        constructor(app) {
            console.log('🗺️ EasyNavMode: Initializing...');
            this.app = app;
            this.isActive = false;
            
            // Map reference (set by EasyNavManager)
            this.easyNavMap = null;
            
            // Grid configuration
            this.gridCellSize = 30; // World units per grid cell (larger for easier touch)
            
            // Camera state storage for restoration
            this.previousCameraState = {
                position: null,
                target: null,
                controlsEnabled: null
            };
            
            console.log('🗺️ EasyNavMode: Initialized successfully');
        }

        /**
         * Set reference to EasyNavMap
         */
        setEasyNavMap(easyNavMap) {
            this.easyNavMap = easyNavMap;
            console.log('🗺️ EasyNavMap reference set');
        }

        /**
         * Enter EasyNav mode - show map and enable simplified controls
         */
        enter() {
            if (this.isActive) {
                console.log('🗺️ Already in EasyNav mode');
                return;
            }

            console.log('🗺️ Entering EasyNav mode...');

            try {
                // Store current camera state for restoration
                this.storeCameraState();
                
                // Show the 2D map
                if (this.easyNavMap) {
                    this.easyNavMap.show();
                }
                
                // Enable simplified camera controls
                this.enableSimplifiedControls();
                
                this.isActive = true;
                console.log('🗺️ EasyNav mode activated successfully');
                
                // Notify Flutter about mode change
                this.notifyModeChange(true);
                
            } catch (error) {
                console.error('🗺️ Error entering EasyNav mode:', error);
            }
        }

        /**
         * Exit EasyNav mode - hide map and restore normal controls
         */
        exit() {
            if (!this.isActive) {
                console.log('🗺️ Not in EasyNav mode');
                return;
            }

            console.log('🗺️ Exiting EasyNav mode...');

            try {
                // Hide the 2D map
                if (this.easyNavMap) {
                    this.easyNavMap.hide();
                }
                
                // Restore camera state
                this.restoreCameraState();
                
                this.isActive = false;
                console.log('🗺️ EasyNav mode deactivated successfully');
                
                // Notify Flutter about mode change
                this.notifyModeChange(false);
                
            } catch (error) {
                console.error('🗺️ Error exiting EasyNav mode:', error);
            }
        }

        /**
         * Toggle EasyNav mode on/off
         */
        toggle() {
            if (this.isActive) {
                this.exit();
            } else {
                this.enter();
            }
        }

        /**
         * Store current camera state for restoration
         */
        storeCameraState() {
            if (!this.app.camera || !this.app.cameraControls) {
                console.warn('🗺️ Camera or controls not available for state storage');
                return;
            }

            try {
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

                console.log('🗺️ Camera state stored for restoration');
            } catch (error) {
                console.error('🗺️ Error storing camera state:', error);
            }
        }

        /**
         * Restore previous camera state when exiting EasyNav mode
         */
        restoreCameraState() {
            if (!this.previousCameraState || !this.previousCameraState.position || !this.app.camera || !this.app.cameraControls) {
                console.warn('🗺️ Cannot restore camera state - using home view instead');
                if (this.app.resetHomeView) {
                    this.app.resetHomeView();
                }
                return;
            }

            // Restore camera position
            this.app.camera.position.copy(this.previousCameraState.position);
            
            // Restore camera target
            if (this.app.cameraControls.setTarget) {
                this.app.cameraControls.setTarget(
                    this.previousCameraState.target.x,
                    this.previousCameraState.target.y,
                    this.previousCameraState.target.z,
                    false
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
            
            this.app.cameraControls.update(0);
            
            console.log('🗺️ Camera state restored successfully');
        }

        /**
         * Enable simplified camera controls for EasyNav mode
         */
        enableSimplifiedControls() {
            if (!this.app.cameraControls) {
                console.warn('🗺️ Camera controls not available');
                return;
            }

            // Keep controls enabled but user primarily navigates via map
            this.app.cameraControls.enabled = true;
            this.app.cameraControls.enableRotate = true;
            this.app.cameraControls.enablePan = true;
            this.app.cameraControls.enableZoom = true;
            
            console.log('🗺️ Simplified controls enabled');
        }

        /**
         * Navigate camera to a grid cell position
         * @param {number} gridX - Grid cell X coordinate
         * @param {number} gridZ - Grid cell Z coordinate
         */
        navigateToGridCell(gridX, gridZ) {
            console.log(`🗺️ Navigating to grid cell: [${gridX}, ${gridZ}]`);
            
            // Convert grid coordinates to world coordinates (center of cell)
            const worldX = gridX * this.gridCellSize + (this.gridCellSize / 2);
            const worldZ = gridZ * this.gridCellSize + (this.gridCellSize / 2);
            
            console.log(`🗺️ World coordinates: [${worldX}, ${worldZ}]`);
            
            // Find the zone that contains this position
            const zone = this.findZoneAtPosition(worldX, worldZ);
            
            if (zone) {
                console.log(`🗺️ Found zone: ${zone.name}`);
                // Use zone's typical viewing angle (like double-tap behavior)
                this.focusOnZoneArea(zone, worldX, worldZ);
            } else {
                console.log('🗺️ No zone found, using default view');
                // No specific zone, just move camera to look at this position
                this.focusOnPosition(worldX, worldZ);
            }
        }

        /**
         * Find zone at given world position
         */
        findZoneAtPosition(x, z) {
            if (!this.app.focusZones || this.app.focusZones.length === 0) {
                return null;
            }

            // Check each zone to see if position is within its bounds
            for (const zone of this.app.focusZones) {
                if (zone.zone && zone.zone.containsPoint) {
                    const point = new THREE.Vector3(x, 0, z);
                    if (zone.zone.containsPoint(point)) {
                        return zone;
                    }
                }
            }

            return null;
        }

        /**
         * Focus camera on a zone area with typical viewing angle
         */
        focusOnZoneArea(zone, targetX, targetZ) {
            if (!this.app.cameraControls || !this.app.camera) {
                console.warn('🗺️ Camera controls not available');
                return;
            }

            // Use the zone's camera position if available
            let cameraPos = zone.cameraPosition ? zone.cameraPosition.clone() : null;
            
            // If no specific camera position, calculate a good viewing angle
            if (!cameraPos) {
                // Position camera at an angle above and in front of target
                const height = 15;
                const distance = 25;
                cameraPos = new THREE.Vector3(targetX, height, targetZ + distance);
            }

            // Target is the specified position
            const target = new THREE.Vector3(targetX, 0, targetZ);

            // Animate camera to position
            this.animateCameraToPosition(cameraPos, target);
        }

        /**
         * Focus camera on a specific world position
         */
        focusOnPosition(x, z) {
            if (!this.app.cameraControls || !this.app.camera) {
                console.warn('🗺️ Camera controls not available');
                return;
            }

            // Default viewing angle: above and slightly in front
            const height = 15;
            const distance = 25;
            const cameraPos = new THREE.Vector3(x, height, z + distance);
            const target = new THREE.Vector3(x, 0, z);

            this.animateCameraToPosition(cameraPos, target);
        }

        /**
         * Animate camera to target position smoothly
         */
        animateCameraToPosition(position, target) {
            if (!this.app.cameraControls) {
                console.warn('🗺️ Camera controls not available');
                return;
            }

            try {
                // Set target first
                if (this.app.cameraControls.setLookAt) {
                    this.app.cameraControls.setLookAt(
                        position.x, position.y, position.z,
                        target.x, target.y, target.z,
                        true // Animate
                    );
                } else {
                    // Fallback method
                    if (this.app.cameraControls.setTarget) {
                        this.app.cameraControls.setTarget(target.x, target.y, target.z, true);
                    }
                    
                    this.app.camera.position.copy(position);
                    this.app.cameraControls.update(0);
                }

                console.log('🗺️ Camera animation started');
            } catch (error) {
                console.error('🗺️ Error animating camera:', error);
            }
        }

        /**
         * Update method - call this in main animation loop
         */
        update() {
            if (!this.isActive) {
                return;
            }

            // Update map with current camera position
            if (this.easyNavMap && this.app.camera) {
                const cameraX = this.app.camera.position.x;
                const cameraZ = this.app.camera.position.z;
                this.easyNavMap.updateCameraPosition(cameraX, cameraZ);
            }
        }

        /**
         * Notify Flutter about mode change
         */
        notifyModeChange(isActive) {
            if (window.EasyNavChannel && window.EasyNavChannel.postMessage) {
                const message = JSON.stringify({
                    action: 'easyNavModeChanged',
                    isActive: isActive
                });
                window.EasyNavChannel.postMessage(message);
                console.log('🗺️ Notified Flutter about EasyNav mode change:', isActive);
            }
        }

        /**
         * Get current EasyNav mode state
         */
        getState() {
            return {
                isActive: this.isActive,
                hasMap: !!this.easyNavMap
            };
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.EasyNavMode = EasyNavMode;
    
    console.log("🗺️ EasyNavMode module loaded - EasyNavMode class available globally");
})();
