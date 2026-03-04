// modules/core/globalPositionManager.js
// Global Position Manager - Hybrid XZ (global) + Y (per-world) position system
// Dependencies: None (Core module)
// Exports: window.GlobalPositionManager

(function() {
    'use strict';
    
    console.log("Loading GlobalPositionManager module...");
    
    /**
     * Global Position Manager
     * Manages hybrid position storage:
     * - Global XZ: Synchronized across all worlds (horizontal position)
     * - Per-World Y: World-specific vertical position (preserves elevation intent)
     */
    class GlobalPositionManager {
        constructor() {
            // Storage: Map of object UUID to position data
            this.objectPositions = new Map();
            
            // Default Y positions for each world type when object first appears
            this.defaultWorldY = {
                'green-plane': 1.0,      // Above ground level (was 0.5)
                'space': 1.0,            // Visible floating (was 0)
                'ocean': 1.0,            // Above water (was -5)
                'forest': 1.0,           // Above ground (was 0.5)
                'dazzle': 1.0,           // Above floor (was 0.5)
                'cave': 1.0,             // Above cave floor (was 0.5)
                'christmas': 1.0,        // Above snow (was 0.5)
                'desert-oasis': 1.0,     // Above sand (was 0.5)
                'tropical-paradise': 1.0,// Above beach (was 0.5)
                'flower-wonderland': 1.0 // Above garden (was 0.5)
            };
            
            console.log('GlobalPositionManager initialized');
        }

        /**
         * Initialize position storage for a new object
         */
        initializeObject(objectUuid, initialPosition, currentWorldType) {
            if (!objectUuid) return;
            
            const positionData = {
                // Global XZ coordinates (shared across all worlds)
                globalX: initialPosition.x,
                globalZ: initialPosition.z,
                
                // Per-world Y coordinates (world-specific elevation)
                worldY: {
                    [currentWorldType]: initialPosition.y
                },
                
                // Track last update time for debugging
                lastUpdated: Date.now(),
                createdInWorld: currentWorldType
            };
            
            this.objectPositions.set(objectUuid, positionData);
            
            console.log(`📍 Initialized position for object ${objectUuid}:`, {
                globalXZ: { x: positionData.globalX, z: positionData.globalZ },
                worldY: positionData.worldY,
                world: currentWorldType
            });
            
            return positionData;
        }

        /**
         * Get the full position for an object in a specific world
         * Combines global XZ with world-specific Y
         */
        getPosition(objectUuid, worldType) {
            const positionData = this.objectPositions.get(objectUuid);
            
            if (!positionData) {
                console.warn(`No position data found for object ${objectUuid}`);
                return null;
            }
            
            // Get world-specific Y, or use default if not set
            let y = positionData.worldY[worldType];
            if (y === undefined) {
                // CRITICAL FIX: For furniture-seated objects, use preserved Y from world transition
                // This ensures objects maintain furniture elevation when switching to new/unseen worlds
                const fileObject = window.app?.stateManager?.fileObjects?.find(obj => 
                    obj.userData?.id === objectUuid || obj.uuid === objectUuid
                );
                
                // DEBUG: Log what we found
                if (fileObject) {
                    console.log(`🔍 Found fileObject for ${objectUuid}, furnitureSlotId: ${fileObject.userData?.furnitureSlotId}, preservePosition: ${fileObject.userData?.preservePosition}, preserveFurnitureYAcrossWorlds: ${fileObject.userData?.preserveFurnitureYAcrossWorlds}`);
                } else {
                    console.log(`🔍 No fileObject found for ${objectUuid}`);
                }
                
                // Check if object has furniture preservation flag set during world transition
                if (fileObject && fileObject.userData?.preserveFurnitureYAcrossWorlds && fileObject.userData?.furniturePreservedY !== undefined) {
                    y = fileObject.userData.furniturePreservedY;
                    console.log(`🪑 Using preserved furniture Y=${y.toFixed(2)} for ${worldType} world`);
                    // Keep the preservation flag active
                    fileObject.userData.preservePosition = true;
                    fileObject.userData.preservePositionWorldType = worldType;
                } else if (fileObject && fileObject.userData?.furnitureSlotId) {
                    // Object is on furniture - check if we have Y from ANY other world
                    const storedWorlds = Object.keys(positionData.worldY);
                    if (storedWorlds.length > 0) {
                        // Use Y from any stored world (furniture elevation should be consistent)
                        const sourceWorld = storedWorlds[0];
                        y = positionData.worldY[sourceWorld];
                        console.log(`🪑 Furniture-seated object: using Y=${y.toFixed(2)} from ${sourceWorld} for ${worldType} world (furniture: ${fileObject.userData.furnitureSlotId})`);
                        
                        // Set preservePosition to prevent gravity from moving it
                        fileObject.userData.preservePosition = true;
                        fileObject.userData.preservePositionWorldType = worldType;
                    } else {
                        // Fallback: Try to get furniture marker position
                        const furnitureManager = window.app?.furnitureManager;
                        if (furnitureManager) {
                            const visualElements = furnitureManager.visualManager?.furnitureMeshes?.get(fileObject.userData.furnitureSlotId);
                            const slotMarker = visualElements?.slots?.[fileObject.userData.slotIndex];
                            
                            if (slotMarker) {
                                const markerWorldPos = new THREE.Vector3();
                                slotMarker.getWorldPosition(markerWorldPos);
                                y = markerWorldPos.y + 1.0;
                                console.log(`🪑 Using live furniture marker Y=${y.toFixed(2)} for object in ${worldType} world`);
                                fileObject.userData.preservePosition = true;
                            } else {
                                y = this.defaultWorldY[worldType] || 0.5;
                                console.log(`⚠️ No stored Y and marker not found, using default Y=${y}`);
                            }
                        } else {
                            y = this.defaultWorldY[worldType] || 0.5;
                            console.log(`⚠️ FurnitureManager not available, using default Y=${y}`);
                        }
                    }
                } else {
                    y = this.defaultWorldY[worldType] || 0.5;
                    console.log(`Using default Y=${y} for object in ${worldType} world`);
                }
            }
            
            const position = {
                x: positionData.globalX,
                y: y,
                z: positionData.globalZ
            };
            
            console.log(`📍 Retrieved position for ${objectUuid} in ${worldType}:`, position);
            
            return position;
        }

        /**
         * Update object position when user moves it
         * Updates global XZ and current world's Y
         */
        updatePosition(objectUuid, newPosition, currentWorldType) {
            let positionData = this.objectPositions.get(objectUuid);
            
            if (!positionData) {
                console.log(`Creating new position data for ${objectUuid}`);
                positionData = this.initializeObject(objectUuid, newPosition, currentWorldType);
                return positionData;
            }
            
            // Store previous values for logging
            const prevX = positionData.globalX;
            const prevZ = positionData.globalZ;
            const prevY = positionData.worldY[currentWorldType];
            
            // Update global XZ (affects all worlds)
            positionData.globalX = newPosition.x;
            positionData.globalZ = newPosition.z;
            
            // Update ONLY current world's Y (doesn't affect other worlds)
            positionData.worldY[currentWorldType] = newPosition.y;
            
            positionData.lastUpdated = Date.now();
            
            this.objectPositions.set(objectUuid, positionData);
            
            console.log(`📍 Updated position for ${objectUuid} in ${currentWorldType}:`, {
                globalXZ: `(${prevX.toFixed(1)}, ${prevZ.toFixed(1)}) → (${newPosition.x.toFixed(1)}, ${newPosition.z.toFixed(1)})`,
                worldY: `${prevY?.toFixed(1) || 'new'} → ${newPosition.y.toFixed(1)}`,
                otherWorldsPreserved: Object.keys(positionData.worldY).filter(w => w !== currentWorldType)
            });
            
            return positionData;
        }

        /**
         * Update only the Y position for current world (used during world switch constraints)
         * Does NOT change global XZ
         */
        updateWorldY(objectUuid, newY, worldType) {
            const positionData = this.objectPositions.get(objectUuid);
            
            if (!positionData) {
                console.warn(`Cannot update Y - no position data for ${objectUuid}`);
                return false;
            }
            
            const prevY = positionData.worldY[worldType];
            positionData.worldY[worldType] = newY;
            positionData.lastUpdated = Date.now();
            
            this.objectPositions.set(objectUuid, positionData);
            
            // console.log(`📍 Updated Y for ${objectUuid} in ${worldType}: ${prevY?.toFixed(1) || 'new'} → ${newY.toFixed(1)}`);
            
            return true;
        }

        /**
         * Get global XZ position (same for all worlds)
         */
        getGlobalXZ(objectUuid) {
            const positionData = this.objectPositions.get(objectUuid);
            
            if (!positionData) {
                return null;
            }
            
            return {
                x: positionData.globalX,
                z: positionData.globalZ
            };
        }

        /**
         * Get world-specific Y position
         */
        getWorldY(objectUuid, worldType) {
            const positionData = this.objectPositions.get(objectUuid);
            
            if (!positionData) {
                return this.defaultWorldY[worldType] || 0.5;
            }
            
            return positionData.worldY[worldType] || this.defaultWorldY[worldType] || 0.5;
        }

        /**
         * Check if object has position data for a specific world
         */
        hasWorldY(objectUuid, worldType) {
            const positionData = this.objectPositions.get(objectUuid);
            return positionData && positionData.worldY[worldType] !== undefined;
        }

        /**
         * Copy Y position from one world to another
         * Useful for initializing similar worlds
         */
        copyWorldY(objectUuid, fromWorld, toWorld) {
            const positionData = this.objectPositions.get(objectUuid);
            
            if (!positionData || positionData.worldY[fromWorld] === undefined) {
                console.warn(`Cannot copy Y - no data for ${objectUuid} in ${fromWorld}`);
                return false;
            }
            
            positionData.worldY[toWorld] = positionData.worldY[fromWorld];
            console.log(`📍 Copied Y for ${objectUuid}: ${fromWorld} → ${toWorld} (Y=${positionData.worldY[toWorld]})`);
            
            return true;
        }

        /**
         * Delete all position data for an object
         */
        deleteObject(objectUuid) {
            if (this.objectPositions.has(objectUuid)) {
                this.objectPositions.delete(objectUuid);
                console.log(`📍 Deleted position data for ${objectUuid}`);
                return true;
            }
            return false;
        }

        /**
         * Get debug information for an object
         */
        getDebugInfo(objectUuid) {
            const positionData = this.objectPositions.get(objectUuid);
            
            if (!positionData) {
                return { exists: false };
            }
            
            return {
                exists: true,
                globalXZ: { x: positionData.globalX, z: positionData.globalZ },
                worldYPositions: { ...positionData.worldY },
                worldCount: Object.keys(positionData.worldY).length,
                createdInWorld: positionData.createdInWorld,
                lastUpdated: new Date(positionData.lastUpdated).toLocaleTimeString()
            };
        }

        /**
         * Get all position data (for debugging/backup)
         */
        getAllPositions() {
            const allData = {};
            this.objectPositions.forEach((data, uuid) => {
                allData[uuid] = this.getDebugInfo(uuid);
            });
            return allData;
        }

        /**
         * Clear all position data
         */
        clearAll() {
            const count = this.objectPositions.size;
            this.objectPositions.clear();
            console.log(`📍 Cleared all position data (${count} objects)`);
        }

        /**
         * Export position data for persistence
         */
        exportData() {
            const exportData = {};
            this.objectPositions.forEach((data, uuid) => {
                exportData[uuid] = {
                    globalX: data.globalX,
                    globalZ: data.globalZ,
                    worldY: { ...data.worldY },
                    createdInWorld: data.createdInWorld
                };
            });
            return exportData;
        }

        /**
         * Import position data from persistence
         */
        importData(importData) {
            if (!importData || typeof importData !== 'object') {
                console.error('Invalid import data');
                return false;
            }
            
            let importCount = 0;
            Object.entries(importData).forEach(([uuid, data]) => {
                if (data.globalX !== undefined && data.globalZ !== undefined && data.worldY) {
                    this.objectPositions.set(uuid, {
                        globalX: data.globalX,
                        globalZ: data.globalZ,
                        worldY: { ...data.worldY },
                        createdInWorld: data.createdInWorld || 'unknown',
                        lastUpdated: Date.now()
                    });
                    importCount++;
                }
            });
            
            console.log(`📍 Imported position data for ${importCount} objects`);
            return true;
        }
    }

    // Make globally accessible
    window.GlobalPositionManager = GlobalPositionManager;
    
    // Create global instance
    window.globalPositionManager = new GlobalPositionManager();
    
    console.log("GlobalPositionManager module loaded successfully");
})();
