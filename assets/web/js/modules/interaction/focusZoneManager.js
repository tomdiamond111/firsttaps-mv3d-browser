// modules/interaction/focusZoneManager.js
// Dependencies: THREE (global), window.SharedStateManager
// Exports: window.FocusZoneManager

(function() {
    'use strict';
    
    console.log("Loading FocusZoneManager module...");
    
    // ============================================================================
    // FOCUS ZONE MANAGEMENT - Invisible clickable areas for camera navigation
    // ============================================================================
    class FocusZoneManager {
        constructor(THREE, scene, stateManager) {
            this.THREE = THREE;
            this.scene = scene;
            this.stateManager = stateManager;
            
            // Focus zone configuration
            this.zoneSize = 20; // 20x20 unit squares
            this.zoneHeight = 0.1; // Very thin planes
            this.zones = new Map(); // Map of zone coordinates to zone objects
            this.zoneMaterial = null;
            
            this.initializeZoneMaterial();
        }

        initializeZoneMaterial() {
            // Create invisible material for focus zones
            this.zoneMaterial = new this.THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.0, // Completely invisible
                side: this.THREE.DoubleSide,
                // Enable for debugging: opacity: 0.1
            });
        }

        // Create static focus zones in a grid pattern
        initializeFocusZones() {
            console.log('Initializing static focus zone grid...');
            
            // Clear existing zones first
            this.clearAllZones();
            
            // Create a grid of zones covering the world boundary area (±150 units)
            // This matches the world template boundaries used across all worlds
            const worldBoundary = 150; // Matches GREEN_PLANE_SIZE/2 from mainApplication.js
            const gridStart = -worldBoundary;
            const gridEnd = worldBoundary;
            
            let zoneCount = 0;
            
            // Create zones in a grid pattern
            for (let x = gridStart; x < gridEnd; x += this.zoneSize) {
                for (let z = gridStart; z < gridEnd; z += this.zoneSize) {
                    this.createFocusZone(x, z);
                    zoneCount++;
                }
            }
            
            console.log(`Created ${zoneCount} static focus zones in grid pattern`);
        }

        // Update focus zones (now just calls initialize since zones are static)
        updateFocusZones() {
            // For backwards compatibility, but zones are now static
            console.log('Focus zones are static - no update needed');
        }

        createFocusZone(centerX, centerZ) {
            const geometry = new this.THREE.PlaneGeometry(this.zoneSize, this.zoneSize);
            const zonePlane = new this.THREE.Mesh(geometry, this.zoneMaterial);
            
            // Position zone on XZ plane at ground level
            zonePlane.position.set(
                centerX + this.zoneSize / 2, // Center of zone
                this.zoneHeight / 2, // Just above ground
                centerZ + this.zoneSize / 2
            );
            zonePlane.rotation.x = -Math.PI / 2; // Lie flat on XZ plane
            
            // Mark as focus zone for interaction detection
            zonePlane.userData = {
                isFocusZone: true,
                zoneX: centerX,
                zoneZ: centerZ,
                zoneCenterX: centerX + this.zoneSize / 2,
                zoneCenterZ: centerZ + this.zoneSize / 2
            };

            // Add to scene and tracking
            this.scene.add(zonePlane);
            this.zones.set(`${centerX},${centerZ}`, zonePlane);
            
            console.log(`Created focus zone at (${centerX}, ${centerZ})`);
        }

        // Handle focus zone interaction
        handleZoneClick(zoneObject) {
            const userData = zoneObject.userData;
            console.log(`Focus zone clicked at (${userData.zoneX}, ${userData.zoneZ})`);
            
            // Calculate optimal camera position to view this zone
            // ENHANCEMENT: Target the center of objects in the zone, not just the geometric zone center
            const objectCenter = this.calculateObjectCenterInZone(userData);
            const targetX = objectCenter.x;
            const targetZ = objectCenter.z;
            const targetY = objectCenter.y;
            
            // Adjust camera positioning based on screen orientation
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2; // Consider landscape if width > 1.2x height
            
            // Position camera above and at an angle to the zone center
            let cameraHeight = 15;
            let cameraDistance = 25;
            
            // Adaptive positioning based on object distribution
            if (objectCenter.objectCount > 0) {
                // Adjust camera distance based on number of objects
                if (objectCenter.objectCount > 5) {
                    // Many objects: back up more to see the whole group
                    cameraDistance *= 1.3;
                    cameraHeight *= 1.2;
                } else if (objectCenter.objectCount === 1) {
                    // Single object: get closer for detail
                    cameraDistance *= 0.7;
                    cameraHeight *= 0.8;
                }
            }
            
            if (isLandscape) {
                // In landscape mode, get much closer for better viewing
                cameraHeight *= 0.25; // 25% of original height (closer to ground)
                cameraDistance *= 0.25; // 25% of original distance (much closer)
                console.log(`📱 Landscape mode: object-centered camera (aspect: ${aspectRatio.toFixed(2)}, objects: ${objectCenter.objectCount})`);
            } else {
                // Portrait mode gets moderately closer
                cameraHeight *= 0.5; // 50% of original height
                cameraDistance *= 0.5; // 50% of original distance
                console.log(`📱 Portrait mode: object-centered camera (aspect: ${aspectRatio.toFixed(2)}, objects: ${objectCenter.objectCount})`);
            }
            
            const cameraX = targetX + cameraDistance * 0.7;
            const cameraZ = targetZ + cameraDistance * 0.7;
            
            console.log(`📹 Moving camera to view zone area: target(${targetX.toFixed(2)}, ${targetY.toFixed(2)}, ${targetZ.toFixed(2)})`);
            console.log(`📹 Camera will move to position: (${cameraX.toFixed(2)}, ${cameraHeight.toFixed(2)}, ${cameraZ.toFixed(2)})`);
            
            // Try multiple ways to access camera controls
            let cameraControls = null;
            
            if (window.app && window.app.cameraControls) {
                cameraControls = window.app.cameraControls;
                console.log('Using camera controls from window.app.cameraControls');
            } else if (window.cameraControls) {
                cameraControls = window.cameraControls;
                console.log('Using camera controls from window.cameraControls');
            } else if (window.controls) {
                cameraControls = window.controls;
                console.log('Using camera controls from window.controls');
            }
            
            if (cameraControls) {
                console.log('Camera controls available, initiating movement...');
                try {
                    const result = cameraControls.setLookAt(
                        cameraX, cameraHeight, cameraZ, // Camera position
                        targetX, targetY, targetZ, // Look at zone center
                        true // Enable smooth transition
                    );
                    console.log('Camera movement initiated successfully');
                } catch (error) {
                    console.error('Error during camera movement:', error);
                }
            } else {
                console.warn('Camera controls not available for focus zone navigation');
                console.log('Available globals:', {
                    'window.app': !!window.app,
                    'window.app.cameraControls': !!(window.app && window.app.cameraControls),
                    'window.cameraControls': !!window.cameraControls,
                    'window.controls': !!window.controls
                });
            }
            
            // Brief visual feedback (optional - can be disabled)
            this.highlightZoneBriefly(zoneObject);
        }

        /**
         * Calculate the center of mass of objects within a zone
         * This provides better camera targeting than geometric zone center
         */
        calculateObjectCenterInZone(zoneUserData) {
            const minX = zoneUserData.zoneX;
            const maxX = zoneUserData.zoneX + this.zoneSize;
            const minZ = zoneUserData.zoneZ;
            const maxZ = zoneUserData.zoneZ + this.zoneSize;
            
            // Find all objects within this zone
            const objectsInZone = [];
            
            if (this.stateManager && this.stateManager.fileObjects) {
                for (const object of this.stateManager.fileObjects) {
                    if (object && object.position) {
                        const pos = object.position;
                        if (pos.x >= minX && pos.x <= maxX && pos.z >= minZ && pos.z <= maxZ) {
                            objectsInZone.push(object);
                        }
                    }
                }
            }
            
            if (objectsInZone.length > 0) {
                // Calculate center of mass of objects
                const centerX = objectsInZone.reduce((sum, obj) => sum + obj.position.x, 0) / objectsInZone.length;
                const centerZ = objectsInZone.reduce((sum, obj) => sum + obj.position.z, 0) / objectsInZone.length;
                const centerY = objectsInZone.reduce((sum, obj) => sum + obj.position.y, 0) / objectsInZone.length;
                
                console.log(`📍 Found ${objectsInZone.length} objects in zone - targeting object center: (${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)})`);
                
                return {
                    x: centerX,
                    y: centerY,
                    z: centerZ,
                    objectCount: objectsInZone.length
                };
            } else {
                // Fallback to geometric zone center if no objects found
                console.log(`📍 No objects found in zone - using geometric zone center: (${zoneUserData.zoneCenterX}, 0, ${zoneUserData.zoneCenterZ})`);
                
                return {
                    x: zoneUserData.zoneCenterX,
                    y: 0, // Ground level
                    z: zoneUserData.zoneCenterZ,
                    objectCount: 0
                };
            }
        }

        // Brief highlight for zone interaction feedback
        highlightZoneBriefly(zoneObject) {
            const originalOpacity = zoneObject.material.opacity;
            
            // Temporarily make zone visible
            zoneObject.material.opacity = 0.2;
            zoneObject.material.color.setHex(0x00ff00); // Green
            
            // Fade back to invisible after 500ms
            setTimeout(() => {
                zoneObject.material.opacity = originalOpacity;
            }, 500);
        }

        // Get zone object at position (for raycasting)
        getZoneAtPosition(intersectionPoint) {
            // Find which zone contains this point
            for (const [coordKey, zone] of this.zones) {
                const userData = zone.userData;
                const minX = userData.zoneX;
                const maxX = userData.zoneX + this.zoneSize;
                const minZ = userData.zoneZ;
                const maxZ = userData.zoneZ + this.zoneSize;
                
                if (intersectionPoint.x >= minX && intersectionPoint.x <= maxX &&
                    intersectionPoint.z >= minZ && intersectionPoint.z <= maxZ) {
                    return zone;
                }
            }
            return null;
        }

        clearAllZones() {
            this.zones.forEach(zone => {
                this.scene.remove(zone);
                zone.geometry.dispose();
            });
            this.zones.clear();
            console.log('Cleared all focus zones');
        }

        // Enable/disable zone visibility for debugging
        setZoneVisibility(visible) {
            const opacity = visible ? 0.1 : 0.0;
            this.zones.forEach(zone => {
                zone.material.opacity = opacity;
            });
            console.log(`Focus zones ${visible ? 'visible' : 'invisible'} (debug mode)`);
        }

        // Temporarily show all zones for debugging (5 seconds)
        showZonesTemporarily(duration = 5000) {
            console.log(`Showing focus zones for ${duration}ms for debugging...`);
            this.setZoneVisibility(true);
            setTimeout(() => {
                this.setZoneVisibility(false);
                console.log('Focus zones hidden again');
            }, duration);
        }

        // Get zones for raycasting (needed by InputManager)
        getZoneObjects() {
            return Array.from(this.zones.values());
        }
    }
    
    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.FocusZoneManager = FocusZoneManager;
    
    // Global debug functions for focus zones
    window.showFocusZones = function(duration = 5000) {
        if (window.app && window.app.focusZoneManager) {
            window.app.focusZoneManager.showZonesTemporarily(duration);
        } else {
            console.warn('Focus zone manager not available');
        }
    };
    
    window.toggleFocusZones = function() {
        if (window.app && window.app.focusZoneManager) {
            const zones = window.app.focusZoneManager.zones;
            if (zones.size > 0) {
                const firstZone = zones.values().next().value;
                const isVisible = firstZone.material.opacity > 0;
                window.app.focusZoneManager.setZoneVisibility(!isVisible);
            }
        } else {
            console.warn('Focus zone manager not available');
        }
    };
    
    console.log("FocusZoneManager module loaded - FocusZoneManager available globally");
    console.log("Debug functions available: showFocusZones(), toggleFocusZones()");
})();
