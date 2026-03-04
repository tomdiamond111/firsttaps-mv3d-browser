/**
 * PATH MANAGER
 * Main coordinator for path system - manages creation, visualization, and interaction
 */

(function() {
    'use strict';

    console.log('🛤️ Loading Path Manager...');

    // ============================================================================
    // PATH MANAGER CLASS
    // ============================================================================
    
    class PathManager {
        constructor(app) {
            this.app = app;
            this.scene = app.scene;
            this.camera = app.camera;
            this.THREE = window.THREE; // Add THREE reference for Vector3 operations
            
            // Sub-managers
            this.storageManager = new window.PathStorageManager();
            this.visualManager = new window.PathVisualManager(this.scene, this.camera);
            
            // State
            this.initialized = false;
            this.currentWorldType = null;
            
            console.log('🛤️ PathManager created');
        }

        /**
         * Initialize path manager
         */
        async initialize() {
            if (this.initialized) {
                console.log('🛤️ PathManager already initialized');
                return;
            }

            console.log('🛤️ Initializing PathManager...');
            
            try {
                // Initialize storage
                await this.storageManager.initialize();
                console.log('🛤️ Storage manager initialized');
                
                // Load paths for current world
                this.currentWorldType = this.app.currentWorldTemplate?.getType() || 'green-plane';
                console.log(`🛤️ Current world type: ${this.currentWorldType}`);
                
                await this.loadPathsForCurrentWorld();
                
                this.initialized = true;
                console.log('🛤️ PathManager initialized successfully');
            } catch (error) {
                console.error('🛤️ ERROR initializing PathManager:', error);
                throw error;
            }
        }

        /**
         * Load and display paths for current world
         */
        async loadPathsForCurrentWorld() {
            const paths = this.storageManager.getPathsForWorld(this.currentWorldType);
            
            console.log(`🛤️ Loading ${paths.length} paths for ${this.currentWorldType}`);
            
            for (const path of paths) {
                await this.visualManager.addPath(path);
                
                // CRITICAL: Notify Flutter about loaded path so it can track it in state
                // This prevents paths from appearing as "Unknown Object" on app startup
                if (window.ObjectActionChannel) {
                    const messageData = {
                        action: 'pathCreated',
                        id: path.id,
                        name: path.name || `Path: ${path.type.replace(/_/g, ' ')}`,
                        type: 'path',
                        worldType: path.worldType
                    };
                    console.log('🛤️ Sending loaded path notification to Flutter:', messageData);
                    window.ObjectActionChannel.postMessage(JSON.stringify(messageData));
                }
                
                // Restore objects on path
                await this.restorePathObjects(path);
            }
        }
        
        /**
         * Restore objects to their path steps after loading
         */
        async restorePathObjects(path) {
            if (!path.objectIds || path.objectIds.length === 0) return;
            
            const visualElements = this.visualManager.pathMeshes.get(path.id);
            if (!visualElements || !visualElements.markers) return;
            
            console.log(`🛤️ Restoring ${path.objectIds.length} objects to path ${path.id}`);
            
            path.objectIds.forEach((objectId, stepIndex) => {
                if (!objectId) return;
                
                // Find object mesh
                const objectMesh = this.findObjectById(objectId);
                if (!objectMesh) {
                    console.warn(`🛤️ Object ${objectId} not found for path restoration`);
                    return;
                }
                
                // Get step marker position
                const marker = visualElements.markers[stepIndex];
                if (!marker) return;
                
                const worldPos = new window.THREE.Vector3();
                marker.getWorldPosition(worldPos);
                
                // Place object on path step
                objectMesh.position.set(worldPos.x, worldPos.y + 1.0, worldPos.z);
                objectMesh.userData.pathId = path.id;
                objectMesh.userData.pathStepIndex = stepIndex;
                objectMesh.userData.preservePosition = true;
                
                console.log(`🛤️ Restored object ${objectId} to step ${stepIndex}`);
                
                // CRITICAL: Persist position to Flutter so it survives next restart
                if (window.ObjectMovedChannel) {
                    const isContact = objectMesh.userData.type === 'fileObject' && 
                                      objectMesh.userData.subType === 'contact';
                    const moveData = {
                        id: isContact ? `contact://${objectMesh.userData.id}` : objectMesh.userData.id,
                        x: objectMesh.position.x,
                        y: objectMesh.position.y,
                        z: objectMesh.position.z
                    };
                    window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                    console.log(`🛤️ Persisted restored position: ${objectId} at (${moveData.x.toFixed(2)}, ${moveData.y.toFixed(2)}, ${moveData.z.toFixed(2)})`);
                }
            });
        }

        /**
         * Create a new path
         */
        async createPath(config) {
            // Add current world type
            config.worldType = this.currentWorldType;
            
            // Create path object
            const path = new window.Path(config);
            
            // Add to storage
            const added = await this.storageManager.addPath(path);
            if (!added) {
                console.error('🛤️ Failed to add path to storage');
                return null;
            }
            
            // Add visualization
            await this.visualManager.addPath(path);
            
            console.log(`🛤️ Created path: ${path.id}`);
            
            // CRITICAL: Notify Flutter about path creation so it can track it in state
            if (window.ObjectActionChannel) {
                const messageData = {
                    action: 'pathCreated',
                    id: path.id,
                    name: `Path: ${path.type.replace(/_/g, ' ')}`, // Format: "Path: stepping stones"
                    type: 'path',
                    worldType: path.worldType
                };
                console.log('🛤️ Sending path creation notification to Flutter:', messageData);
                window.ObjectActionChannel.postMessage(JSON.stringify(messageData));
            }
            
            return path;
        }

        /**
         * Delete a path
         */
        async deletePath(pathId) {
            console.log(`🛤️ PathManager deletePath called for: ${pathId}`);
            
            // Remove visualization (from scene)
            this.visualManager.removePath(pathId);
            
            // CRITICAL: Also remove from fileObjects array if present
            if (this.app && this.app.stateManager && this.app.stateManager.fileObjects) {
                const index = this.app.stateManager.fileObjects.findIndex(obj => obj.userData.id === pathId);
                if (index !== -1) {
                    const pathGroup = this.app.stateManager.fileObjects[index];
                    // Remove from scene if not already removed
                    if (pathGroup.parent) {
                        pathGroup.parent.remove(pathGroup);
                    }
                    // Remove from tracking array
                    this.app.stateManager.fileObjects.splice(index, 1);
                    console.log(`🛤️ Removed path from fileObjects and scene: ${pathId}`);
                }
            }
            
            // Remove from storage
            await this.storageManager.removePath(pathId);
            
            console.log(`🛤️ Deleted path: ${pathId}`);
        }

        /**
         * Add object to path with smart auto-sort
         */
        async addObjectToPath(pathId, objectId, index = null) {
            const path = this.storageManager.getPath(pathId);
            if (!path) {
                console.error('🛤️ Path not found:', pathId);
                return false;
            }

            // Get object mesh to check if it's being rearranged
            const objectMesh = this.findObjectById(objectId);
            const wasOnThisPath = objectMesh?.userData?.pathId === pathId;

            const success = path.addObject(objectId, index);
            if (!success) return false;

            // Smart auto-sort: Only sort NEW objects, not manual rearrangements
            if (path.autoSort && !wasOnThisPath) {
                console.log(`🛤️ Auto-sorting NEW object ${objectId} into path ${pathId}`);
                await this.sortPathObjects(pathId);
            } else if (wasOnThisPath) {
                console.log(`🛤️ Object ${objectId} being rearranged manually - skipping auto-sort`);
            }

            // Update object position to path step
            if (objectMesh) {
                const finalStepIndex = path.objectIds.indexOf(objectId);
                const visualElements = this.visualManager.pathMeshes.get(pathId);
                
                if (finalStepIndex !== -1 && visualElements?.markers[finalStepIndex]) {
                    const marker = visualElements.markers[finalStepIndex];
                    const worldPos = new window.THREE.Vector3();
                    marker.getWorldPosition(worldPos);
                    
                    objectMesh.position.set(worldPos.x, worldPos.y + 1.0, worldPos.z);
                    objectMesh.userData.pathId = pathId;
                    objectMesh.userData.pathStepIndex = finalStepIndex;
                    objectMesh.userData.preservePosition = true;
                    
                    console.log(`🛤️ Placed object ${objectId} at step ${finalStepIndex}`);
                    
                    // CRITICAL: Persist position to Flutter so it survives app restart
                    if (window.ObjectMovedChannel) {
                        const isContact = objectMesh.userData.type === 'fileObject' && 
                                          objectMesh.userData.subType === 'contact';
                        const moveData = {
                            id: isContact ? `contact://${objectMesh.userData.id}` : objectMesh.userData.id,
                            x: objectMesh.position.x,
                            y: objectMesh.position.y,
                            z: objectMesh.position.z
                        };
                        window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                        console.log(`🛤️ Persisted path object position: ${objectId} at (${moveData.x.toFixed(2)}, ${moveData.y.toFixed(2)}, ${moveData.z.toFixed(2)})`);
                    }
                }
            }

            await this.storageManager.updatePath(path);
            console.log(`🛤️ Added object ${objectId} to path ${pathId}`);
            
            return success;
        }

        /**
         * Remove object from path
         */
        async removeObjectFromPath(pathId, objectId) {
            const path = this.storageManager.getPath(pathId);
            if (!path) return false;

            const success = path.removeObject(objectId);
            if (success) {
                // Find the object and clear its preservePosition flag so it can fall normally
                const objectMesh = this.findObjectById(objectId);
                if (objectMesh && objectMesh.userData) {
                    objectMesh.userData.preservePosition = false;
                    console.log(`🛤️ Cleared preservePosition flag for ${objectId} (removed from path)`);
                }
                
                await this.storageManager.updatePath(path);
                console.log(`🛤️ Removed object ${objectId} from path ${pathId}`);
            }
            
            return success;
        }

        /**
         * Fill path with objects from array
         */
        async fillPathWithObjects(pathId, objectIds) {
            const path = this.storageManager.getPath(pathId);
            if (!path) return false;

            // Clear existing objects
            path.clearObjects();
            
            // Add new objects (up to max)
            const maxObjects = Math.min(objectIds.length, window.MAX_OBJECTS_PER_PATH);
            for (let i = 0; i < maxObjects; i++) {
                path.addObject(objectIds[i], i);
                
                // Move object to path position
                const objectMesh = this.findObjectById(objectIds[i]);
                if (objectMesh && path.positions[i]) {
                    const pos = path.positions[i];
                    objectMesh.position.set(pos.x, pos.y + 1, pos.z); // +1 to elevate above marker
                }
            }
            
            await this.storageManager.updatePath(path);
            
            // Auto-sort if enabled
            if (path.autoSort) {
                await this.sortPathObjects(pathId);
            }
            
            console.log(`🛤️ Filled path ${pathId} with ${maxObjects} objects`);
            return true;
        }
        
        /**
         * Auto-sort path objects based on configured criteria
         */
        async sortPathObjects(pathId) {
            const path = this.storageManager.getPath(pathId);
            if (!path || path.objectIds.length === 0) return;
            
            // Check if auto-sort is enabled
            if (!path.autoSort) {
                console.log(`🛤️ Auto-sort disabled for ${pathId} - using manual positions`);
                return;
            }
            
            console.log(`🛤️ Auto-sorting path ${pathId} by ${path.sortCriteria} (${path.sortDirection})`);
            
            // Get full object data for sorting
            const objects = path.objectIds
                .map((id, stepIndex) => {
                    const mesh = this.findObjectById(id);
                    return mesh ? { id, stepIndex, userData: mesh.userData } : null;
                })
                .filter(obj => obj !== null);
            
            // Sort by criteria
            const sortedObjects = this.sortObjectsByCriteria(objects, path.sortCriteria, path.sortDirection);
            
            // Update path with sorted order
            path.objectIds = new Array(path.stepCount).fill(null);
            sortedObjects.forEach((obj, index) => {
                if (index < path.stepCount) {
                    path.objectIds[index] = obj.id;
                }
            });
            
            await this.storageManager.updatePath(path);
            
            // Animate objects to new positions
            this.animatePathRearrange(path);
            
            console.log(`🛤️ Auto-sorted ${sortedObjects.length} objects on path`);
        }
        
        /**
         * Sort objects based on criteria and direction
         */
        sortObjectsByCriteria(objects, criteria, direction) {
            const sorted = [...objects].sort((a, b) => {
                let aValue, bValue;
                
                switch (criteria) {
                    case 'fileName':
                        aValue = (a.userData.fileName || a.userData.name || '').toLowerCase();
                        bValue = (b.userData.fileName || b.userData.name || '').toLowerCase();
                        break;
                    case 'fileType':
                        aValue = a.userData.fileType || a.userData.type || '';
                        bValue = b.userData.fileType || b.userData.type || '';
                        break;
                    case 'artist':
                        aValue = (a.userData.artist || '').toLowerCase();
                        bValue = (b.userData.artist || '').toLowerCase();
                        break;
                    case 'title':
                        aValue = (a.userData.title || a.userData.fileName || '').toLowerCase();
                        bValue = (b.userData.title || b.userData.fileName || '').toLowerCase();
                        break;
                    case 'date':
                        aValue = a.userData.date || a.userData.createdAt || 0;
                        bValue = b.userData.date || b.userData.createdAt || 0;
                        break;
                    default:
                        aValue = (a.userData.fileName || a.userData.name || '').toLowerCase();
                        bValue = (b.userData.fileName || b.userData.name || '').toLowerCase();
                }
                
                const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                return direction === 'ascending' ? comparison : -comparison;
            });
            
            return sorted;
        }
        
        /**
         * Animate path rearrange (smooth transitions)
         */
        animatePathRearrange(path) {
            const visualElements = this.visualManager.pathMeshes.get(path.id);
            if (!visualElements) return;
            
            path.objectIds.forEach((objectId, stepIndex) => {
                if (!objectId) return;
                
                const objectMesh = this.findObjectById(objectId);
                if (!objectMesh) return;
                
                const marker = visualElements.markers[stepIndex];
                if (!marker) return;
                
                const worldPos = new this.THREE.Vector3();
                marker.getWorldPosition(worldPos);
                
                // Smooth transition to new position (marker world position + 1.0 elevation)
                objectMesh.position.set(worldPos.x, worldPos.y + 1.0, worldPos.z);
                objectMesh.userData.pathStepIndex = stepIndex;
            });
            
            console.log(`🛤️ Rearranged ${path.objectIds.length} objects on path`);
        }
        
        /**
         * Find object mesh by ID (helper method for path operations)
         */
        findObjectById(objectId) {
            if (!this.app || !this.app.stateManager || !this.app.stateManager.fileObjects) {
                return null;
            }
            
            return this.app.stateManager.fileObjects.find(obj => 
                obj.userData.id === objectId || obj.userData.fileId === objectId
            );
        }

        /**
         * Start path playback
         */
        async startPathPlayback(pathId) {
            const path = this.storageManager.getPath(pathId);
            if (!path) return false;

            if (path.objectIds.length === 0) {
                console.warn('🛤️ Path has no objects to play');
                return false;
            }

            path.isPlaying = true;
            path.currentIndex = 0;
            
            // YELLOW FLASH on START marker when playback begins
            this.flashStartMarker(pathId);
            
            this.visualManager.updateMarkerStates(pathId, 0);
            
            // Play first object
            await this.playNext(pathId);
            
            console.log(`🛤️ Started playback for path ${pathId}`);
            return true;
        }

        /**
         * Toggle path playback (for double-tap)
         */
        async togglePathPlayback(pathId) {
            const path = this.storageManager.getPath(pathId);
            if (!path) {
                console.error('🛤️ Path not found:', pathId);
                return false;
            }

            if (path.isPlaying) {
                console.log('🛤️ Stopping path playback');
                this.stopPathPlayback(pathId);
                return false;
            } else {
                console.log('🛤️ Starting path playback');
                await this.startPathPlayback(pathId);
                return true;
            }
        }

        /**
         * Stop path playback
         */
        stopPathPlayback(pathId) {
            const path = this.storageManager.getPath(pathId);
            if (!path) return false;

            path.isPlaying = false;
            path.currentIndex = 0;
            
            // Reset all markers to default state (not active)
            this.visualManager.resetMarkerStates(pathId);
            console.log(`🛤️ Stopped playback for path ${pathId}`);
            return true;
        }

        /**
         * Play next object in path
         */
        async playNext(pathId) {
            const path = this.storageManager.getPath(pathId);
            if (!path || !path.isPlaying) return null;

            const nextObjectId = path.getNextObject();
            if (nextObjectId) {
                this.visualManager.updateMarkerStates(pathId, path.currentIndex);
                
                // Open the object
                const objectMesh = this.findObjectById(nextObjectId);
                if (objectMesh) {
                    await this.openObject(objectMesh, pathId); // Pass pathId for auto-advance
                }
                
                console.log(`🛤️ Playing object ${path.currentIndex + 1}/${path.objectIds.length}`);
                return nextObjectId;
            } else {
                // LOOP: Restart from beginning at end
                console.log('🛤️ Path playback completed - looping to start');
                path.currentIndex = 0;
                path.isPlaying = true;
                this.visualManager.updateMarkerStates(pathId, 0);
                await this.playNext(pathId);
                return null;
            }
        }

        /**
         * Handle world switch
         */
        async onWorldSwitch(newWorldType) {
            console.log(`🛤️ World switched to: ${newWorldType}`);
            
            // Clear current world paths
            this.visualManager.pathMeshes.forEach((visualElements, pathId) => {
                this.visualManager.removePath(pathId);
            });
            
            // Load new world paths
            this.currentWorldType = newWorldType;
            await this.loadPathsForCurrentWorld();
        }

        /**
         * Get all paths for current world
         */
        getPathsForCurrentWorld() {
            return this.storageManager.getPathsForWorld(this.currentWorldType);
        }

        /**
         * Get path group by ID (for interaction system)
         */
        getPathGroupById(pathId) {
            const visualElements = this.visualManager.pathMeshes.get(pathId);
            return visualElements ? visualElements.group : null;
        }

        /**
         * Get all path groups (for raycasting)
         */
        getAllPathGroups() {
            const groups = [];
            this.visualManager.pathMeshes.forEach((visualElements) => {
                if (visualElements.group) {
                    groups.push(visualElements.group);
                }
            });
            return groups;
        }

        /**
         * Check if can add more paths
         */
        canAddPath() {
            return this.storageManager.canAddPathToWorld(this.currentWorldType);
        }

        /**
         * Animate (called from render loop)
         */
        animate(delta) {
            if (this.visualManager) {
                this.visualManager.animate(delta);
            }
        }

        /**
         * Check if object is near a path step (for snapping)
         * CRITICAL: Uses marker WORLD positions, not stored positions, to handle path moves correctly
         */
        findNearestPathStep(objectPosition, maxDistance = 3.0) {
            console.log(`🛤️ DEBUG findNearestPathStep: checking position (${objectPosition.x.toFixed(2)}, ${objectPosition.z.toFixed(2)}), maxDistance=${maxDistance}`);
            console.log(`🛤️ DEBUG pathMeshes.size=${this.visualManager.pathMeshes.size}`);
            
            let nearestPath = null;
            let nearestStepIndex = -1;
            let nearestDistance = maxDistance;

            this.visualManager.pathMeshes.forEach((visualElements, pathId) => {
                const path = this.storageManager.getPath(pathId);
                console.log(`🛤️ DEBUG checking path ${pathId}: path exists=${!!path}, markers=${visualElements?.markers?.length}`);
                if (!path || !visualElements?.markers) return;

                // CRITICAL FIX: Use marker CURRENT world positions, not stored positions
                // After path moves, stored positions are stale (they're old world coords)
                // Markers always have accurate positions via getWorldPosition()
                const worldPos = new THREE.Vector3();
                
                visualElements.markers.forEach((marker, index) => {
                    // IMPORTANT RULE: Only one object per step
                    // Check if this step already has an object
                    const objectOnStep = path.objectIds[index];
                    if (objectOnStep) {
                        console.log(`🛤️ DEBUG step ${index} occupied by ${objectOnStep}`);
                        return; // Skip this step, it's occupied
                    }

                    // Get marker's CURRENT world position (accounts for path moves)
                    marker.getWorldPosition(worldPos);
                    const stepPos = {
                        x: worldPos.x,
                        z: worldPos.z
                    };

                    const dx = objectPosition.x - stepPos.x;
                    const dz = objectPosition.z - stepPos.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);

                    console.log(`🛤️ DEBUG step ${index} at (${stepPos.x.toFixed(2)}, ${stepPos.z.toFixed(2)}): distance=${distance.toFixed(2)}`);

                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestPath = path;
                        nearestStepIndex = index;
                        console.log(`🛤️ DEBUG new nearest: step ${index}, distance=${distance.toFixed(2)}`);
                    }
                });
            });

            console.log(`🛤️ DEBUG findNearestPathStep result: nearestPath=${nearestPath?.id}, stepIndex=${nearestStepIndex}, distance=${nearestDistance.toFixed(2)}`);
            return nearestPath ? { path: nearestPath, stepIndex: nearestStepIndex, distance: nearestDistance } : null;
        }

        /**
         * Snap object to path step with visual and audio feedback
         * CRITICAL: Uses marker WORLD position, not stored position, to handle path moves correctly
         */
        async snapObjectToPath(objectMesh, snapInfo) {
            const { path, stepIndex } = snapInfo;

            console.log(`🛤️ DEBUG snap: pathId=${path.id}, stepIndex=${stepIndex}, totalSteps=${path.stepCount}`);

            // CRITICAL: Get marker's CURRENT world position instead of using stale stored position
            const visualElements = this.visualManager.pathMeshes.get(path.id);
            console.log(`🛤️ DEBUG visual: found visualElements=${!!visualElements}, markerCount=${visualElements?.markers?.length}`);
            
            if (!visualElements || !visualElements.markers[stepIndex]) {
                console.error(`🛤️ ERROR: Cannot snap - marker not found for path ${path.id} step ${stepIndex}`);
                return;
            }

            const marker = visualElements.markers[stepIndex];
            const worldPos = new THREE.Vector3();
            marker.getWorldPosition(worldPos);
            
            // Animate object to snap position (marker world position + 1.0 elevation)
            const targetY = worldPos.y + 1.0; // Marker is at world Y, elevate object 1 unit above it
            objectMesh.position.set(worldPos.x, targetY, worldPos.z);
            
            console.log(`🛤️ DEBUG snap position: (${worldPos.x.toFixed(2)}, ${targetY.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
            
            // CRITICAL: Mark object as path-seated to prevent gravity from dropping it
            // This flag tells the stacking system to preserve this object's elevated position
            objectMesh.userData.preservePosition = true;
            
            // Update fileData for persistence
            if (objectMesh.userData.fileData) {
                objectMesh.userData.fileData.x = worldPos.x;
                objectMesh.userData.fileData.y = targetY;
                objectMesh.userData.fileData.z = worldPos.z;
            }

            // Visual feedback: flash the marker bright BLUE then fade back (blue = object placement)
            console.log(`🛤️ DEBUG flash: targeting marker ${stepIndex} at position (${marker.position.x.toFixed(1)}, ${marker.position.y.toFixed(1)}, ${marker.position.z.toFixed(1)})`);
            
            // Store original material
            const originalMaterial = marker.material;
            
            // Create bright BLUE flash material (placement feedback)
            const flashMaterial = originalMaterial.clone();
            flashMaterial.emissive.setHex(0x3498db); // Bright blue
            flashMaterial.emissiveIntensity = 2.0;
            marker.material = flashMaterial;
            
            // Fade back to normal over 0.5 seconds
            setTimeout(() => {
                let intensity = 2.0;
                const fadeInterval = setInterval(() => {
                    intensity -= 0.1;
                    if (intensity <= 0) {
                        marker.material = originalMaterial;
                        clearInterval(fadeInterval);
                    } else {
                        flashMaterial.emissiveIntensity = intensity;
                    }
                }, 25); // 20 steps of 25ms = 500ms total
            }, 50);
            
            // Also add pulse effect for ongoing animation
            this.visualManager.addPulseEffect(marker);

            // Audio feedback: play snap sound
            this.playSnapSound();

            // Add object to path
            await this.addObjectToPath(path.id, objectMesh.userData.id || objectMesh.userData.fileId, stepIndex);

            console.log(`🛤️ Snapped object to path ${path.id}, step ${stepIndex}`);
        }

        /**
         * Play snap sound feedback
         */
        playSnapSound() {
            // Create a brief "snap" sound using Web Audio API
            if (!window.AudioContext && !window.webkitAudioContext) return;

            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 800; // High pitch "click"
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            } catch (error) {
                console.warn('🔇 Could not play snap sound:', error);
            }
        }

        /**
         * Helper: Find object mesh by ID
         */
        findObjectById(objectId) {
            if (!this.app.stateManager?.fileObjects) return null;
            
            return this.app.stateManager.fileObjects.find(obj => 
                obj.userData?.fileId === objectId || 
                obj.userData?.id === objectId
            );
        }

        /**
         * Check if URL is a YouTube link
         */
        isYouTubeUrl(url) {
            if (!url) return false;
            return url.includes('youtube.com') || url.includes('youtu.be');
        }

        /**
         * Check if URL/file is playable media (YouTube, MP3, MP4, Spotify, etc.)
         */
        isMediaPlayable(url) {
            if (!url) return false;
            
            // Check if it's a supported URL or file type
            const urlLower = url.toLowerCase();
            
            // YouTube
            if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
                return true;
            }
            
            // Spotify
            if (urlLower.includes('spotify.com')) {
                return true;
            }
            
            // Audio files (expanded)
            if (urlLower.match(/\.(mp3|wav|ogg|m4a|aac|flac|wma|opus|amr|aiff)$/)) {
                return true;
            }
            
            // Video files (expanded)
            if (urlLower.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|mpg|mpeg|3gp)$/)) {
                return true;
            }
            
            return false;
        }

        /**
         * Extract YouTube video ID from URL
         */
        extractYouTubeVideoId(url) {
            if (!url) return null;
            
            const patterns = [
                /(?:youtube\.com\/watch\?v=)([^&]+)/,
                /(?:youtu\.be\/)([^?]+)/,
                /(?:youtube\.com\/embed\/)([^?]+)/,
                /(?:youtube\.com\/shorts\/)([^?]+)/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }
            
            return null;
        }

        /**
         * Build playlist array from path objects for YouTube player
         */
        buildPathPlaylist(pathId) {
            const path = this.storageManager.getPath(pathId);
            if (!path) {
                console.warn('🛤️ Cannot build playlist - path not found:', pathId);
                return [];
            }
            
            const playlist = [];
            
            path.objectIds.forEach((objectId, index) => {
                if (!objectId) return;
                
                const object = this.findObjectById(objectId);
                if (!object) return;
                
                // Get URL from various possible locations
                const url = object.userData.linkData?.url || 
                           object.userData.fileData?.url || 
                           object.userData.url ||
                           object.userData.fileData?.path; // For local files
                
                if (this.isMediaPlayable(url)) {
                    const title = object.userData.linkData?.title ||
                                object.userData.fileData?.name ||
                                object.userData.fileName ||
                                object.userData.title ||
                                'Unknown Track';
                    
                    playlist.push({
                        mediaUrl: url,
                        videoId: url, // Backward compatibility for YouTube
                        title: title,
                        stepIndex: index,
                        objectId: objectId
                    });
                }
            });
            
            console.log(`🛤️🎵 Built media playlist with ${playlist.length} tracks from path ${pathId}`);
            return playlist;
        }

        /**
         * Helper: Open object (launch app/play media)
         */
        async openObject(objectMesh, pathId = null) {
            if (!objectMesh) return;

            // Store pathId in userData for auto-advance callback
            if (pathId) {
                objectMesh.userData.activePathPlayback = pathId;
            }

            // All media (including local files) should open in media preview screen
            // PiP player should only be used when user clicks minimize button
            if (window.app?.interactionManager) {
                window.app.interactionManager.handleObjectTap(objectMesh);
            }
        }

        /**
         * Flash START marker yellow when playback begins
         */
        flashStartMarker(pathId) {
            const visualElements = this.visualManager.pathMeshes.get(pathId);
            if (!visualElements || !visualElements.markers[0]) return;

            const startMarker = visualElements.markers[0];
            const originalMaterial = startMarker.material;
            
            // Create YELLOW flash material (playback start indicator)
            const flashMaterial = originalMaterial.clone();
            flashMaterial.emissive.setHex(0xFFD700); // Bright yellow/gold
            flashMaterial.emissiveIntensity = 2.5;
            startMarker.material = flashMaterial;
            
            // Quick flash (faster than snap flash)
            setTimeout(() => {
                let intensity = 2.5;
                const fadeInterval = setInterval(() => {
                    intensity -= 0.2;
                    if (intensity <= 0) {
                        startMarker.material = originalMaterial;
                        clearInterval(fadeInterval);
                    } else {
                        flashMaterial.emissiveIntensity = intensity;
                    }
                }, 20); // Faster fade: 12 steps x 20ms = 240ms total
            }, 30);

            console.log('🛤️ Yellow flash on START marker for playback begin');
        }

        /**
         * Start playback from specific step (single-tap marker)
         */
        async startFromStep(pathId, stepIndex) {
            const path = this.storageManager.getPath(pathId);
            if (!path) return false;

            // Validate step index
            if (stepIndex < 0 || stepIndex >= path.objectIds.length) {
                console.warn('🛤️ Invalid step index:', stepIndex);
                return false;
            }

            // Check if step has an object
            if (!path.objectIds[stepIndex]) {
                console.warn('🛤️ No object on step:', stepIndex);
                return false;
            }

            console.log(`🛤️ Starting playback from step ${stepIndex}`);
            path.isPlaying = true;
            path.currentIndex = stepIndex;
            
            this.visualManager.updateMarkerStates(pathId, stepIndex);
            
            // Play from this position
            await this.playNext(pathId);
            return true;
        }

        /**
         * Get path group object for interaction system
         */
        getPathGroup(pathId) {
            const visualElements = this.visualManager.pathMeshes.get(pathId);
            return visualElements ? visualElements.group : null;
        }

        /**
         * Store path state for undo
         */
        storePathStateForUndo(pathId) {
            const path = this.storageManager.getPath(pathId);
            if (!path) {
                console.warn('🛤️ Path not found for undo backup:', pathId);
                return null;
            }

            // Return path data that can be used for restoration
            const state = {
                id: path.id,
                name: path.name, // Include name for restoration
                type: path.type,
                worldType: path.worldType,
                stepCount: path.stepCount,
                geometryParams: path.geometryParams,
                positions: path.positions,
                objectIds: [...path.objectIds],
                currentIndex: path.currentIndex
            };

            console.log('🛤️ Stored path state for undo:', pathId);
            return state;
        }

        /**
         * Restore path from undo state
         */
        async restorePathFromUndo(pathState) {
            if (!pathState) {
                console.error('🛤️ Invalid path state for restoration');
                return false;
            }

            console.log('🛤️ Restoring path from undo:', pathState.id);

            // Recreate the path
            const path = new window.Path(pathState);
            
            // Add to storage
            const added = await this.storageManager.addPath(path);
            if (!added) {
                console.error('🛤️ Failed to restore path to storage');
                return false;
            }

            // Add visualization
            await this.visualManager.addPath(path);

            // CRITICAL: Notify Flutter about restored path so it can track it in state
            if (window.ObjectActionChannel) {
                const messageData = {
                    action: 'pathCreated',
                    id: path.id,
                    name: path.name || `Path: ${path.type.replace(/_/g, ' ')}`,
                    type: 'path',
                    worldType: path.worldType
                };
                console.log('🛤️ Sending restored path notification to Flutter:', messageData);
                window.ObjectActionChannel.postMessage(JSON.stringify(messageData));
            }

            console.log('🛤️ Path restored successfully:', path.id);
            return true;
        }

        /**
         * Dispose
         */
        dispose() {
            if (this.visualManager) {
                this.visualManager.dispose();
            }
            console.log('🛤️ PathManager disposed');
        }
    }

    // ============================================================================
    // GLOBAL INTEGRATION
    // ============================================================================
    
    window.PathManager = PathManager;

    // Auto-initialize when app is ready
    const initializePathManager = () => {
        if (window.app && !window.app.pathManager) {
            window.app.pathManager = new PathManager(window.app);
            window.app.pathManager.initialize();
            console.log('🛤️ PathManager attached to app');
            
            // Hook into global deletion/restoration system
            setupPathDeletionHandlers();
        } else if (!window.app) {
            setTimeout(initializePathManager, 100);
        }
    };

    // Setup global handlers for path deletion and restoration
    function setupPathDeletionHandlers() {
        // Extend selectObjectForMoveCommand to support paths
        const originalSelectForMove = window.selectObjectForMoveCommand;
        
        window.selectObjectForMoveCommand = function(objectId) {
            // Check if this is a path ID
            if (objectId && objectId.startsWith('path_')) {
                console.log('🛤️ Path move requested:', objectId);
                
                if (window.app?.pathManager && window.app?.interactionManager) {
                    const pathGroup = window.app.pathManager.getPathGroup(objectId);
                    if (pathGroup) {
                        // Temporarily add path to fileObjects for move system
                        const stateManager = window.app.stateManager;
                        if (!stateManager.fileObjects.includes(pathGroup)) {
                            stateManager.fileObjects.push(pathGroup);
                        }
                        
                        // Now call original move handler
                        window.app.interactionManager.selectObjectForMove(objectId);
                    }
                }
                
                return;
            }
            
            // Call original handler for non-path objects
            if (originalSelectForMove) {
                return originalSelectForMove(objectId);
            }
        };

        // Extend highlightObjectForDeleteConfirmation to support paths
        const originalHighlightForDelete = window.highlightObjectForDeleteConfirmation;
        
        window.highlightObjectForDeleteConfirmation = function(objectId) {
            // Check if this is a path ID
            if (objectId && objectId.startsWith('path_')) {
                console.log('🛤️ Path delete highlight requested:', objectId);
                
                if (window.app?.pathManager && window.app?.interactionManager) {
                    const pathGroup = window.app.pathManager.getPathGroup(objectId);
                    if (pathGroup) {
                        // Temporarily add path to fileObjects for highlight system
                        const stateManager = window.app.stateManager;
                        if (!stateManager.fileObjects.includes(pathGroup)) {
                            stateManager.fileObjects.push(pathGroup);
                        }
                        
                        // Now call original highlight handler
                        window.app.interactionManager.highlightObjectForDelete(objectId);
                    }
                }
                
                return;
            }
            
            // Call original handler for non-path objects
            if (originalHighlightForDelete) {
                return originalHighlightForDelete(objectId);
            }
        };
        
        // Extend removeObjectByIdJS to support paths
        const originalRemoveObjectById = window.removeObjectByIdJS;
        
        window.removeObjectByIdJS = function(objectId) {
            // Check if this is a path ID
            if (objectId && objectId.startsWith('path_')) {
                console.log('🛤️ Path deletion requested via removeObjectByIdJS:', objectId);
                
                if (window.app?.pathManager) {
                    // Find the path object in scene for handleObjectDeletion
                    const visualElements = window.app.pathManager.visualManager.pathMeshes.get(objectId);
                    const path = window.app.pathManager.storageManager.getPath(objectId);
                    
                    if (visualElements && visualElements.group) {
                        // Call deletion handler first (stores undo state)
                        if (window.handleObjectDeletion) {
                            window.handleObjectDeletion(objectId, visualElements.group);
                        }
                    }
                    
                    // Delete the path
                    window.app.pathManager.deletePath(objectId);
                    
                    // Notify Flutter about deletion for undo snackbar
                    if (window.ObjectActionChannel) {
                        const pathName = path ? path.name : 'Path';
                        const messageData = {
                            action: 'objectDeleted',
                            id: objectId,
                            name: pathName
                        };
                        console.log('🛤️ Sending path deletion notification to Flutter:', messageData);
                        window.ObjectActionChannel.postMessage(JSON.stringify(messageData));
                    }
                }
                
                return;
            }
            
            // Call original handler for non-path objects
            if (originalRemoveObjectById) {
                return originalRemoveObjectById(objectId);
            }
        };
        
        // Extend global deletion handler to support paths
        const originalHandleObjectDeletion = window.handleObjectDeletion;
        
        window.handleObjectDeletion = function(objectId, objectData) {
            // Check if this is a path object
            if (objectData && objectData.userData && objectData.userData.isPath) {
                const pathId = objectData.userData.pathId || objectData.userData.id;
                console.log('🛤️ Path deletion detected:', pathId);
                
                // Store state for undo
                if (window.app?.pathManager) {
                    const pathState = window.app.pathManager.storePathStateForUndo(pathId);
                    // Store in a global undo map for paths
                    if (!window._pathUndoStates) window._pathUndoStates = new Map();
                    window._pathUndoStates.set(pathId, pathState);
                }
                
                return; // Path deletion is handled by pathManager.deletePath()
            }
            
            // Call original handler for non-path objects
            if (originalHandleObjectDeletion) {
                return originalHandleObjectDeletion(objectId, objectData);
            }
        };

        // Extend global restoration handler to support paths
        const originalRestoreObjectById = window.restoreObjectById;
        
        window.restoreObjectById = async function(fileData) {
            // Check if this is a path restoration
            if (fileData && (fileData.isPath || fileData.type === 'path')) {
                const pathId = fileData.id;
                console.log('🛤️ Path restoration requested:', pathId);
                
                // Try to restore from undo states
                if (window._pathUndoStates && window._pathUndoStates.has(pathId)) {
                    const pathState = window._pathUndoStates.get(pathId);
                    if (window.app?.pathManager) {
                        const success = await window.app.pathManager.restorePathFromUndo(pathState);
                        if (success) {
                            window._pathUndoStates.delete(pathId);
                            return true;
                        }
                    }
                }
                
                return false;
            }
            
            // Call original handler for non-path objects
            if (originalRestoreObjectById) {
                return originalRestoreObjectById(fileData);
            }
            
            return false;
        };

        console.log('🛤️ Path deletion/restoration handlers registered');
    }

    // Start initialization after a brief delay
    setTimeout(initializePathManager, 500);

    console.log('🛤️ Path Manager loaded successfully');

})();
