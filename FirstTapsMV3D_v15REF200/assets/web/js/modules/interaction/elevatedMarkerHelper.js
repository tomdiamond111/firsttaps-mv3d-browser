/**
 * ELEVATED MARKER HELPER
 * Handles real-time Y-axis adjustment during drag operations
 * Enables natural "climbing" behavior when dragging objects near furniture/paths
 */

(function() {
    'use strict';

    console.log('🔧 Loading Elevated Marker Helper...');

    class ElevatedMarkerHelper {
        constructor(app) {
            this.app = app;
            this.THREE = window.THREE;
            this.currentHighlightedMarker = null;
            
            console.log('🔧 ElevatedMarkerHelper created');
        }

        /**
         * Find nearest elevated marker (furniture slot or path step) considering 3D position
         * @param {Object} objectPosition - Current object position {x, y, z}
         * @param {number} horizontalRange - Max 2D distance to consider (X/Z)
         * @param {number} verticalRange - Max Y distance to consider
         * @returns {Object|null} Marker info with worldY, type, id, index
         */
        findNearestElevatedMarker(objectPosition, horizontalRange = 2.0, verticalRange = 10.0) {
            let nearestMarker = null;
            let nearestDistance = Infinity;

            // Check furniture markers
            const furnitureMarker = this.findNearestFurnitureMarker(objectPosition, horizontalRange, verticalRange);
            if (furnitureMarker) {
                nearestMarker = furnitureMarker;
                nearestDistance = furnitureMarker.distance3D;
            }

            // Check path markers
            const pathMarker = this.findNearestPathMarker(objectPosition, horizontalRange, verticalRange);
            if (pathMarker && pathMarker.distance3D < nearestDistance) {
                nearestMarker = pathMarker;
            }

            return nearestMarker;
        }

        /**
         * Find nearest furniture marker considering 3D position
         */
        findNearestFurnitureMarker(objectPosition, horizontalRange, verticalRange) {
            if (!this.app.furnitureManager) return null;

            let nearestMarker = null;
            let nearestDistance = Infinity;

            const allFurniture = this.app.furnitureManager.getAllFurniture();
            
            allFurniture.forEach(furniture => {
                const visualElements = this.app.furnitureManager.visualManager.furnitureMeshes.get(furniture.id);
                if (!visualElements || !visualElements.slots) return;

                visualElements.slots.forEach((slot, index) => {
                    // Skip occupied slots
                    if (furniture.objectIds[index]) return;

                    // Get slot world position
                    const worldPos = new this.THREE.Vector3();
                    slot.getWorldPosition(worldPos);

                    // Calculate 2D horizontal distance (X/Z)
                    const dx = objectPosition.x - worldPos.x;
                    const dz = objectPosition.z - worldPos.z;
                    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

                    // Only consider markers within horizontal range
                    if (horizontalDist > horizontalRange) return;

                    // Calculate vertical distance
                    const dy = objectPosition.y - worldPos.y;
                    const verticalDist = Math.abs(dy);

                    // Only consider markers within vertical range
                    if (verticalDist > verticalRange) return;

                    // Calculate 3D distance (weighted toward horizontal proximity)
                    // Horizontal distance matters more than vertical for natural feel
                    const distance3D = Math.sqrt(
                        (dx * dx * 2.0) + // Weight horizontal X more
                        (dy * dy) +       // Vertical distance
                        (dz * dz * 2.0)   // Weight horizontal Z more
                    );

                    if (distance3D < nearestDistance) {
                        nearestDistance = distance3D;
                        nearestMarker = {
                            type: 'furniture',
                            furnitureId: furniture.id,
                            slotIndex: index,
                            worldX: worldPos.x,
                            worldY: worldPos.y,
                            worldZ: worldPos.z,
                            horizontalDistance: horizontalDist,
                            verticalDistance: verticalDist,
                            distance3D: distance3D,
                            slot: slot,
                            furniture: furniture
                        };
                    }
                });
            });

            return nearestMarker;
        }

        /**
         * Find nearest path marker considering 3D position
         */
        findNearestPathMarker(objectPosition, horizontalRange, verticalRange) {
            if (!this.app.pathManager) return null;

            let nearestMarker = null;
            let nearestDistance = Infinity;

            const allPaths = this.app.pathManager.storageManager.getPathsForWorld(
                this.app.pathManager.currentWorldType
            );

            allPaths.forEach(path => {
                const visualElements = this.app.pathManager.visualManager.pathMeshes.get(path.id);
                if (!visualElements || !visualElements.markers) return;

                visualElements.markers.forEach((marker, index) => {
                    // Skip occupied markers
                    if (path.objectIds[index]) return;

                    // Get marker world position
                    const worldPos = new this.THREE.Vector3();
                    marker.getWorldPosition(worldPos);

                    // Calculate 2D horizontal distance (X/Z)
                    const dx = objectPosition.x - worldPos.x;
                    const dz = objectPosition.z - worldPos.z;
                    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

                    // Only consider markers within horizontal range
                    if (horizontalDist > horizontalRange) return;

                    // Calculate vertical distance
                    const dy = objectPosition.y - worldPos.y;
                    const verticalDist = Math.abs(dy);

                    // Only consider markers within vertical range
                    if (verticalDist > verticalRange) return;

                    // Calculate 3D distance (weighted toward horizontal proximity)
                    const distance3D = Math.sqrt(
                        (dx * dx * 2.0) + // Weight horizontal X more
                        (dy * dy) +       // Vertical distance
                        (dz * dz * 2.0)   // Weight horizontal Z more
                    );

                    if (distance3D < nearestDistance) {
                        nearestDistance = distance3D;
                        nearestMarker = {
                            type: 'path',
                            pathId: path.id,
                            stepIndex: index,
                            worldX: worldPos.x,
                            worldY: worldPos.y,
                            worldZ: worldPos.z,
                            horizontalDistance: horizontalDist,
                            verticalDistance: verticalDist,
                            distance3D: distance3D,
                            marker: marker,
                            path: path
                        };
                    }
                });
            });

            return nearestMarker;
        }

        /**
         * Smooth linear interpolation for gradual Y-position adjustment
         * @param {number} current - Current Y position
         * @param {number} target - Target Y position
         * @param {number} factor - Lerp factor (0.0 to 1.0, higher = faster)
         * @returns {number} New Y position
         */
        smoothLerp(current, target, factor = 0.3) {
            return current + (target - current) * factor;
        }

        /**
         * Calculate target Y position for object based on marker height and object dimensions
         * @param {number} markerY - Marker world Y position
         * @param {Object} objectMesh - Object mesh to position
         * @returns {number} Target Y position (object center)
         */
        calculateTargetY(markerY, objectMesh) {
            // Get object height
            const objectHeight = objectMesh.geometry?.boundingBox 
                ? (objectMesh.geometry.boundingBox.max.y - objectMesh.geometry.boundingBox.min.y) * objectMesh.scale.y
                : 2.5; // Default height

            // Position object so it sits on marker surface
            // Marker Y is at the surface, so object center = markerY + (objectHeight / 2)
            return markerY + (objectHeight / 2);
        }

        /**
         * Highlight target marker to show user where object will snap
         * @param {Object} markerInfo - Marker information from findNearestElevatedMarker
         */
        highlightTargetMarker(markerInfo) {
            // Clear previous highlight
            this.clearHighlight();

            if (!markerInfo) return;

            // Store reference to highlighted marker
            this.currentHighlightedMarker = markerInfo;

            // Get the actual mesh to highlight
            const mesh = markerInfo.type === 'furniture' ? markerInfo.slot : markerInfo.marker;
            if (!mesh || !mesh.material) return;

            // Store original material
            if (!mesh.userData.originalMaterial) {
                mesh.userData.originalMaterial = mesh.material;
            }

            // Create highlighted material with pulsing glow
            const highlightMaterial = mesh.material.clone();
            highlightMaterial.emissive.setHex(0x00ff00); // Green glow
            highlightMaterial.emissiveIntensity = 0.8;
            mesh.material = highlightMaterial;

            // Add pulsing animation
            this.startPulseAnimation(mesh);
        }

        /**
         * Start pulsing animation on highlighted marker
         */
        startPulseAnimation(mesh) {
            if (!mesh.userData) mesh.userData = {};
            
            mesh.userData.pulseTime = 0;
            mesh.userData.isPulsing = true;

            // Animation will be handled in update loop
        }

        /**
         * Update pulse animation (call from animation loop)
         */
        updatePulseAnimation(deltaTime = 0.016) {
            if (!this.currentHighlightedMarker) return;

            const mesh = this.currentHighlightedMarker.type === 'furniture' 
                ? this.currentHighlightedMarker.slot 
                : this.currentHighlightedMarker.marker;

            if (!mesh || !mesh.userData.isPulsing || !mesh.material) return;

            // Update pulse time
            mesh.userData.pulseTime = (mesh.userData.pulseTime || 0) + deltaTime * 4; // 4x speed

            // Calculate pulse intensity (0.4 to 1.0)
            const intensity = 0.4 + 0.6 * (Math.sin(mesh.userData.pulseTime) * 0.5 + 0.5);
            mesh.material.emissiveIntensity = intensity;
        }

        /**
         * Clear marker highlight
         */
        clearHighlight() {
            if (!this.currentHighlightedMarker) return;

            const mesh = this.currentHighlightedMarker.type === 'furniture' 
                ? this.currentHighlightedMarker.slot 
                : this.currentHighlightedMarker.marker;

            if (mesh && mesh.userData.originalMaterial) {
                mesh.material = mesh.userData.originalMaterial;
                delete mesh.userData.originalMaterial;
                mesh.userData.isPulsing = false;
            }

            this.currentHighlightedMarker = null;
        }

        /**
         * Check if object should use elevated marker adjustment
         * @param {Object} objectMesh - Object being dragged
         * @param {boolean} is3DWorld - Whether in 3D world (space/ocean)
         * @param {boolean} isVerticalMoveMode - Whether in manual vertical move mode
         * @returns {boolean} True if should adjust Y to markers
         */
        shouldAdjustToMarkers(objectMesh, is3DWorld, isVerticalMoveMode) {
            // Don't adjust in 3D worlds (they have their own Y control)
            if (is3DWorld) return false;

            // Don't adjust in manual vertical move mode (user is controlling Y)
            if (isVerticalMoveMode) return false;

            // Don't adjust furniture or paths themselves
            if (objectMesh.userData.isFurniture || objectMesh.userData.isPath) return false;

            // Only adjust snappable objects
            const isApp = objectMesh.userData.type === 'app';
            const extension = (objectMesh.userData.extension || '').toLowerCase();
            const isVideo = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'].includes(extension);
            const isAudio = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(extension);
            const isDocument = ['.pdf', '.doc', '.docx', '.txt'].includes(extension);

            return isApp || isVideo || isAudio || isDocument;
        }
    }

    // Export to global scope
    window.ElevatedMarkerHelper = ElevatedMarkerHelper;

    console.log('🔧 Elevated Marker Helper loaded successfully');
})();
