/**
 * PATH VISUAL MANAGER
 * Handles rendering of paths in the 3D world with ground markers and visual effects
 */

(function() {
    'use strict';

    console.log('🛤️ Loading Path Visual Manager...');

    // ============================================================================
    // PATH VISUAL MANAGER CLASS
    // ============================================================================
    
    class PathVisualManager {
        constructor(scene, camera) {
            this.scene = scene;
            this.camera = camera;
            this.THREE = window.THREE;
            
            // Visual state
            this.pathMeshes = new Map(); // pathId -> { markers: [], geometry: [], highlights: [] }
            this.activePaths = new Map(); // pathId -> Path object
            
            // Materials (reusable)
            this.materials = this.createMaterials();
            
            console.log('🛤️ PathVisualManager initialized');
        }

        /**
         * Create reusable materials
         */
        createMaterials() {
            return {
                // Ground markers
                markerDefault: new this.THREE.MeshStandardMaterial({
                    color: 0x888888,
                    metalness: 0.3,
                    roughness: 0.7,
                    emissive: new window.THREE.Color(0x222222),
                    emissiveIntensity: 0.2
                }),
                
                markerActive: new this.THREE.MeshStandardMaterial({
                    color: 0x3498db,
                    metalness: 0.5,
                    roughness: 0.4,
                    emissive: new window.THREE.Color(0x2980b9),
                    emissiveIntensity: 0.8
                }),
                
                markerCompleted: new this.THREE.MeshStandardMaterial({
                    color: 0x444444,
                    metalness: 0.3,
                    roughness: 0.8,
                    emissive: new window.THREE.Color(0x111111),
                    emissiveIntensity: 0.1
                }),
                
                // Path geometry
                spiralStairs: new this.THREE.MeshStandardMaterial({
                    color: 0x8b7355,
                    metalness: 0.2,
                    roughness: 0.8
                }),
                
                galleryWall: new this.THREE.MeshStandardMaterial({
                    color: 0xf5f5dc,
                    metalness: 0.1,
                    roughness: 0.9
                }),
                
                pathLine: new this.THREE.LineBasicMaterial({
                    color: 0xffa500,
                    linewidth: 2,
                    opacity: 0.6,
                    transparent: true
                })
            };
        }

        /**
         * Add a path to the scene
         */
        async addPath(path) {
            if (this.activePaths.has(path.id)) {
                console.warn('🛤️ Path already exists:', path.id);
                return false;
            }

            console.log(`🛤️ Adding path to scene: ${path.type} (${path.stepCount} steps)`);
            
            // Create a Group to contain all path elements
            const pathGroup = new this.THREE.Group();
            pathGroup.name = `Path: ${path.type}`;
            pathGroup.raycast = () => {}; // Disable group raycasting - only markers are interactive
            
            // Set userData for interaction system (copied to markers)
            pathGroup.userData = {
                id: path.id,
                name: path.name, // Human-readable name with spaces (e.g., "Path: stepping stones")
                fileName: `Path: ${path.type}`, // Legacy field for compatibility
                type: 'path',
                pathId: path.id,
                pathType: path.type,
                isFurniture: true,
                isPath: true,
                stepCount: path.stepCount,
                objectIds: path.objectIds
            };
            
            const visualElements = {
                group: pathGroup,
                markers: [],
                geometry: [],
                highlights: [],
                guideLine: null
            };

            // Create ground markers
            this.createGroundMarkers(path, visualElements, pathGroup);
            
            // Create path-specific geometry
            switch (path.type) {
                case window.PATH_TYPES.SPIRAL_STAIRCASE:
                    this.createSpiralStaircase(path, visualElements, pathGroup);
                    break;
                
                case window.PATH_TYPES.GALLERY_WALK:
                    this.createGalleryWalls(path, visualElements, pathGroup);
                    break;
                
                case window.PATH_TYPES.MOUNTAIN_TRAIL:
                    this.createTrailMarkers(path, visualElements, pathGroup);
                    break;
            }
            
            // Create guide line
            this.createGuideLine(path, visualElements, pathGroup);

            // Add the group to the scene
            this.scene.add(pathGroup);

            // Store references
            this.pathMeshes.set(path.id, visualElements);
            this.activePaths.set(path.id, path);

            console.log(`🛤️ Path added successfully: ${path.id}`);
            return true;
        }

        /**
         * Create ground markers for path positions
         */
        createGroundMarkers(path, visualElements, pathGroup) {
            const markerGeometry = new this.THREE.CylinderGeometry(0.8, 1.0, 0.3, 16);
            
            path.positions.forEach((pos, index) => {
                const marker = new this.THREE.Mesh(
                    markerGeometry,
                    this.materials.markerDefault.clone()
                );
                
                marker.position.set(pos.x, pos.y + 0.15, pos.z);
                
                // Full userData for raycasting - copy from pathGroup
                marker.userData = {
                    id: pathGroup.userData.id,
                    name: pathGroup.userData.name, // Human-readable name
                    fileName: pathGroup.userData.fileName,
                    type: pathGroup.userData.type, // REQUIRED by raycaster
                    pathId: path.id,
                    stepIndex: index,
                    isPathMarker: true,
                    isPath: true,
                    pathType: path.pathType,
                    stepCount: path.positions.length
                };
                marker.name = `${pathGroup.name} (Step ${index + 1})`;
                
                pathGroup.add(marker);
                visualElements.markers.push(marker);
                
                // Add START indicator to first marker
                if (index === 0) {
                    this.addStartIndicator(marker, pathGroup);
                }
            });

            console.log(`🛤️ Created ${visualElements.markers.length} ground markers`);
        }

        /**
         * Add START text indicator above first marker
         */
        addStartIndicator(marker, pathGroup) {
            // Create text sprite for START label
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Draw background
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(0, 0, 256, 128);
            
            // Draw text
            ctx.font = 'bold 80px Arial';
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('START', 128, 64);
            
            // Create texture and sprite material
            const texture = new this.THREE.CanvasTexture(canvas);
            const spriteMaterial = new this.THREE.SpriteMaterial({ map: texture });
            const sprite = new this.THREE.Sprite(spriteMaterial);
            
            // Position above marker
            sprite.position.set(
                marker.position.x,
                marker.position.y + 2.0,
                marker.position.z
            );
            sprite.scale.set(3, 1.5, 1);
            sprite.raycast = () => {}; // Disable raycasting - only collision box should be hit
            
            pathGroup.add(sprite);
            console.log('🛤️ Added START indicator to first marker');
        }

        /**
         * Create spiral staircase 3D geometry
         */
        createSpiralStaircase(path, visualElements, pathGroup) {
            const stepGeometry = new this.THREE.BoxGeometry(3, 0.2, 1.5);
            
            path.positions.forEach((pos, index) => {
                const step = new this.THREE.Mesh(
                    stepGeometry,
                    this.materials.spiralStairs
                );
                
                // Calculate rotation based on spiral angle
                const angle = (index / path.stepCount) * Math.PI * 2 * path.geometryParams.turns;
                step.rotation.y = angle;
                
                step.position.set(pos.x, pos.y, pos.z);
                step.userData.pathId = path.id;
                step.userData.isPathGeometry = true;
                
                pathGroup.add(step);
                visualElements.geometry.push(step);
                
                // Add support pole
                if (index > 0) {
                    const prevPos = path.positions[index - 1];
                    const poleHeight = pos.y - prevPos.y;
                    const poleGeometry = new this.THREE.CylinderGeometry(0.15, 0.15, poleHeight, 8);
                    const pole = new this.THREE.Mesh(
                        poleGeometry,
                        this.materials.spiralStairs
                    );
                    pole.position.set(pos.x, prevPos.y + poleHeight / 2, pos.z);
                    pathGroup.add(pole);
                    visualElements.geometry.push(pole);
                }
            });

            console.log(`🛤️ Created spiral staircase with ${visualElements.geometry.length} elements`);
        }

        /**
         * Create gallery walk walls
         */
        createGalleryWalls(path, visualElements, pathGroup) {
            const wallHeight = path.geometryParams.wallHeight || 5;
            const wallThickness = 0.3;
            
            // Create walls along the path perimeter
            for (let i = 0; i < path.positions.length - 1; i++) {
                const start = path.positions[i];
                const end = path.positions[i + 1];
                
                const dx = end.x - start.x;
                const dz = end.z - start.z;
                const wallLength = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                
                const wallGeometry = new this.THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
                const wall = new this.THREE.Mesh(
                    wallGeometry,
                    this.materials.galleryWall
                );
                
                wall.position.set(
                    (start.x + end.x) / 2,
                    start.y + wallHeight / 2,
                    (start.z + end.z) / 2
                );
                wall.rotation.y = angle;
                wall.userData.pathId = path.id;
                wall.userData.isPathGeometry = true;
                
                pathGroup.add(wall);
                visualElements.geometry.push(wall);
            }

            console.log(`🛤️ Created gallery with ${visualElements.geometry.length} walls`);
        }

        /**
         * Create trail markers with elevation indicators
         */
        createTrailMarkers(path, visualElements, pathGroup) {
            // Trail markers are just enhanced ground markers with elevation poles
            path.positions.forEach((pos, index) => {
                if (index === 0) return; // Skip first
                
                const prevPos = path.positions[index - 1];
                const elevationChange = pos.y - prevPos.y;
                
                if (Math.abs(elevationChange) > 0.5) {
                    // Add elevation indicator pole
                    const poleHeight = Math.abs(elevationChange);
                    const poleGeometry = new this.THREE.CylinderGeometry(0.1, 0.1, poleHeight, 8);
                    const pole = new this.THREE.Mesh(
                        poleGeometry,
                        new this.THREE.MeshStandardMaterial({ color: 0x666666 })
                    );
                    pole.position.set(
                        pos.x,
                        Math.min(pos.y, prevPos.y) + poleHeight / 2,
                        pos.z
                    );
                    pathGroup.add(pole);
                    visualElements.geometry.push(pole);
                }
            });
        }

        /**
         * Create guide line connecting markers
         */
        createGuideLine(path, visualElements, pathGroup) {
            // CRITICAL: Use marker LOCAL positions, not stored positions
            // The guideline is a child of pathGroup, so it needs local coordinates
            // If we have markers, read their local positions directly
            // Otherwise fall back to stored positions (which should be local during initial creation)
            let points;
            if (visualElements.markers && visualElements.markers.length > 0) {
                // Use marker local positions - these are always correct
                points = visualElements.markers.map(marker => 
                    new this.THREE.Vector3(marker.position.x, marker.position.y + 0.15, marker.position.z)
                );
            } else {
                // Fallback to stored positions (used during initial path creation)
                points = path.positions.map(pos => 
                    new this.THREE.Vector3(pos.x, pos.y + 0.3, pos.z)
                );
            }
            
            const geometry = new this.THREE.BufferGeometry().setFromPoints(points);
            const line = new this.THREE.Line(geometry, this.materials.pathLine);
            
            line.userData.pathId = path.id;
            line.userData.isPathGuideLine = true;
            line.raycast = () => {}; // Disable raycasting - only collision box should be hit
            
            pathGroup.add(line);
            visualElements.guideLine = line;
        }

        /**
         * Update guideline geometry after path has been moved
         * Removes old guideline and creates new one with updated positions
         */
        updateGuideLine(pathId) {
            console.log('🛤️ UPDATING GUIDELINE for path:', pathId);
            
            const visualElements = this.pathMeshes.get(pathId);
            if (!visualElements) {
                console.warn('🛤️ No visual elements found for path:', pathId);
                return;
            }

            const path = this.activePaths.get(pathId);
            if (!path) {
                console.warn('🛤️ No path data found for path:', pathId);
                return;
            }

            // visualElements.group, not pathGroup!
            const pathGroup = visualElements.group;
            if (!pathGroup) {
                console.warn('🛤️ No path group found for path:', pathId);
                return;
            }

            // Remove old guideline
            if (visualElements.guideLine) {
                console.log('🛤️ Removing old guideline');
                pathGroup.remove(visualElements.guideLine);
                visualElements.guideLine.geometry.dispose();
                visualElements.guideLine = null;
            }

            // Create new guideline with updated positions
            console.log('🛤️ Creating new guideline with positions:', path.positions);
            this.createGuideLine(path, visualElements, pathGroup);
            
            console.log('🛤️ Guideline updated successfully');
        }

        /**
         * Update marker states based on playback progress
         */
        updateMarkerStates(pathId, currentIndex) {
            const visualElements = this.pathMeshes.get(pathId);
            if (!visualElements) return;

            visualElements.markers.forEach((marker, index) => {
                if (index < currentIndex) {
                    // Completed
                    marker.material = this.materials.markerCompleted;
                } else if (index === currentIndex) {
                    // Active
                    marker.material = this.materials.markerActive;
                    // Add pulsing animation
                    this.addPulseEffect(marker);
                } else {
                    // Upcoming
                    marker.material = this.materials.markerDefault;
                }
            });
        }

        /**
         * Reset all markers to default state (when playback stops)
         */
        resetMarkerStates(pathId) {
            const visualElements = this.pathMeshes.get(pathId);
            if (!visualElements) return;

            visualElements.markers.forEach((marker) => {
                marker.material = this.materials.markerDefault;
                marker.userData.isPulsing = false;
                marker.scale.set(1, 1, 1);
            });
        }

        /**
         * Add pulsing effect to marker
         */
        addPulseEffect(marker) {
            marker.userData.pulsePhase = 0;
            marker.userData.isPulsing = true;
        }

        /**
         * Create invisible collision box for tap detection
         * TIGHT FIT: Only covers steps and path line, minimal padding
         */
        createCollisionBox(path, pathGroup) {
            // Calculate bounding box of all positions
            let minX = Infinity, maxX = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            
            path.positions.forEach(pos => {
                minX = Math.min(minX, pos.x);
                maxX = Math.max(maxX, pos.x);
                minZ = Math.min(minZ, pos.z);
                maxZ = Math.max(maxZ, pos.z);
                minY = Math.min(minY, pos.y);
                maxY = Math.max(maxY, pos.y);
            });
            
            // MINIMAL padding - just enough to cover marker diameter (1.0) + small buffer
            const padding = 1.2; // Marker radius (1.0) + small buffer
            const width = Math.max((maxX - minX) + padding * 2, padding * 2); // At least covers one marker
            const depth = Math.max((maxZ - minZ) + padding * 2, padding * 2);
            const height = 2.5; // Low height - just above ground markers
            
            // Create invisible box
            const boxGeometry = new this.THREE.BoxGeometry(width, height, depth);
            const boxMaterial = new this.THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0,
                visible: true, // MUST be visible for raycasting to work
                depthWrite: false // Don't interfere with rendering
            });
            
            const collisionBox = new this.THREE.Mesh(boxGeometry, boxMaterial);
            collisionBox.position.set(
                (minX + maxX) / 2,
                0.15 + height / 2, // Centered on marker height (0.15) + half box height
                (minZ + maxZ) / 2
            );
            
            // Deep copy ALL userData from pathGroup to collision box
            // CRITICAL: Must copy type field for raycaster validation
            Object.assign(collisionBox.userData, {
                id: pathGroup.userData.id,
                name: pathGroup.userData.name, // Human-readable name
                fileName: pathGroup.userData.fileName,
                type: pathGroup.userData.type,  // REQUIRED by raycaster
                pathId: pathGroup.userData.pathId,
                pathType: pathGroup.userData.pathType,
                isFurniture: pathGroup.userData.isFurniture,
                isPath: pathGroup.userData.isPath,
                stepCount: pathGroup.userData.stepCount,
                objectIds: pathGroup.userData.objectIds,
                isPathCollisionBox: true
            });
            
            collisionBox.name = pathGroup.name + ' (Collision)';
            
            pathGroup.add(collisionBox);
            
            console.log(`🛤️ Created tight collision box: ${width.toFixed(1)}x${height.toFixed(1)}x${depth.toFixed(1)}`);
        }

        /**
         * Animate pulsing markers
         */
        animate(delta) {
            this.pathMeshes.forEach((visualElements, pathId) => {
                visualElements.markers.forEach(marker => {
                    if (marker.userData.isPulsing) {
                        marker.userData.pulsePhase += delta * 2;
                        const scale = 1 + Math.sin(marker.userData.pulsePhase) * 0.2;
                        marker.scale.set(scale, 1, scale);
                        
                        // Stop pulsing after 3 seconds
                        if (marker.userData.pulsePhase > Math.PI * 6) {
                            marker.userData.isPulsing = false;
                            marker.scale.set(1, 1, 1);
                        }
                    }
                });
            });
        }

        /**
         * Remove path from scene
         */
        removePath(pathId) {
            const visualElements = this.pathMeshes.get(pathId);
            if (!visualElements) return false;

            // Remove the entire group from scene
            if (visualElements.group) {
                this.scene.remove(visualElements.group);
                
                // Dispose of all geometries and materials in the group
                visualElements.group.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }

            this.pathMeshes.delete(pathId);
            this.activePaths.delete(pathId);

            console.log(`🛤️ Removed path: ${pathId}`);
            return true;
        }

        /**
         * Hide/show path
         */
        setPathVisibility(pathId, visible) {
            const visualElements = this.pathMeshes.get(pathId);
            if (!visualElements) return false;

            [...visualElements.markers, ...visualElements.geometry].forEach(mesh => {
                mesh.visible = visible;
            });

            if (visualElements.guideLine) {
                visualElements.guideLine.visible = visible;
            }

            return true;
        }

        /**
         * Get path marker at position (for raycasting/interaction)
         */
        getMarkerAtPosition(position, maxDistance = 2) {
            let closestMarker = null;
            let closestDistance = maxDistance;

            this.pathMeshes.forEach((visualElements, pathId) => {
                visualElements.markers.forEach(marker => {
                    const distance = marker.position.distanceTo(position);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestMarker = marker;
                    }
                });
            });

            return closestMarker;
        }

        /**
         * Dispose all resources
         */
        dispose() {
            this.pathMeshes.forEach((visualElements, pathId) => {
                this.removePath(pathId);
            });

            // Dispose materials
            Object.values(this.materials).forEach(material => {
                if (material.dispose) material.dispose();
            });

            console.log('🛤️ PathVisualManager disposed');
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    
    window.PathVisualManager = PathVisualManager;

    console.log('🛤️ Path Visual Manager loaded successfully');

})();
