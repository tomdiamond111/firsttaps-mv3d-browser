/**
 * ROTATION INTERACTION MODULE
 * Handles Y-axis rotation for furniture and paths via golden rotation handles
 */

(function() {
    'use strict';

    console.log('🔄 Loading Rotation Interaction Module...');

    class RotationInteraction {
        constructor(THREE, scene, camera) {
            this.THREE = THREE;
            this.scene = scene;
            this.camera = camera;
            
            // Rotation mode state
            this.isRotationMode = false;        // True when in rotation mode
            this.rotatingObject = null;         // The object being rotated (furniture or path group)
            this.rotationIcon = null;           // The rotation icon that was tapped
            this.furnitureId = null;            // ID of furniture being rotated
            this.pathId = null;                 // ID of path being rotated
            this.originalMaterial = null;       // Store original material for unhighlight
            this.highlightedMeshes = [];        // Meshes that are highlighted
            this.lastPointerAngle = 0;          // Last pointer angle for rotation calculation
            this.objectCenter = null;           // Center position of object
            
            console.log('🔄 RotationInteraction initialized (tap-to-rotate mode)');
        }

        /**
         * Rotate furniture by specified degrees (used for double-tap rotation)
         * @param {THREE.Group} furnitureGroup - The furniture group to rotate
         * @param {number} degrees - Rotation angle in degrees
         */
        rotateFurniture(furnitureGroup, degrees = 30) {
            if (!furnitureGroup) {
                console.warn('🔄 Invalid furniture group for rotation');
                return;
            }

            const radians = (degrees * Math.PI) / 180;
            furnitureGroup.rotation.y += radians;

            const currentDegrees = (furnitureGroup.rotation.y * 180 / Math.PI) % 360;
            console.log(`🔄 Furniture rotated by ${degrees}° to ${currentDegrees.toFixed(1)}°`);
            console.log(`🔄 Rotated furniture ID: ${furnitureGroup.userData?.furnitureId}`);
            
            // Save rotation to persistence
            if (window.app && window.app.furnitureManager && furnitureGroup.userData?.furnitureId) {
                window.app.furnitureManager.updateFurnitureRotation(
                    furnitureGroup.userData.furnitureId, 
                    furnitureGroup.rotation.y
                );
            }
        }

        /**
         * Check if pointer is over a rotation icon
         * @param {THREE.Raycaster} raycaster - Raycaster with current pointer
         * @param {Array} interactables - Array of interactive objects
        checkRotationIcon(raycaster, interactables) {
            const intersects = raycaster.intersectObjects(interactables, true);
            
            for (const intersect of intersects) {
                const object = intersect.object;
                if (object.userData.isRotationIcon || object.userData.isRotationHandle) {
                    console.log('🔄 Rotation icon detected:', object.userData.furnitureId || object.userData.pathId);
                    return {
                        icon: object,
                        furnitureId: object.userData.furnitureId,
                        pathId: object.userData.pathId,
                        intersection: intersect
                    };
                }
            }
            
            return null;
        }
        
        // Alias for backward compatibility
        checkRotationHandle(raycaster, interactables) {
            return this.checkRotationIcon(raycaster, interactables);
        }

        /**
         * Toggle rotation mode on/off when rotation icon is tapped
         * @param {Object} iconData - Data from checkRotationIcon
         * @returns {boolean} True if rotation mode activated
         */
        toggleRotationMode(iconData) {
            if (!iconData) return false;
            
            const { icon, furnitureId, pathId } = iconData;
            
            // If already rotating this object, exit rotation mode
            if (this.isRotationMode && (this.furnitureId === furnitureId || this.pathId === pathId)) {
                this.exitRotationMode();
                return false;
            }
            
            // Exit previous rotation mode if rotating different object
            if (this.isRotationMode) {
                this.exitRotationMode();
            }
            
            // Find the parent group (furniture or path)
            let parentGroup = icon.parent;
            while (parentGroup && parentGroup.type !== 'Group') {
                parentGroup = parentGroup.parent;
            }
            
            if (!parentGroup) {
                console.warn('🔄 Could not find parent group for rotation icon');
                return false;
            }
            
            // Enter rotation mode
            this.isRotationMode = true;
            this.rotatingObject = parentGroup;
            this.rotationIcon = icon;
            this.furnitureId = furnitureId;
            this.pathId = pathId;
            this.objectCenter = parentGroup.position.clone();
            
            // Highlight the furniture/path
            this.highlightFurniture(parentGroup);
            
            console.log(`🔄 Entered rotation mode for ${furnitureId || pathId}`);
            console.log('🔄 Tap anywhere to rotate, tap away from furniture to exit');
            
            return true;
        }
        
        /**
         * Highlight furniture during rotation mode
         */
        highlightFurniture(furnitureGroup) {
            this.highlightedMeshes = [];
            
            furnitureGroup.traverse((child) => {
                if (child.isMesh && !child.userData.isRotationIcon) {
                    // Store original material
                    if (child.material) {
                        const highlightMaterial = child.material.clone();
                        highlightMaterial.emissive = new this.THREE.Color(0x00FFFF); // Cyan highlight
                        highlightMaterial.emissiveIntensity = 0.4;
                        
                        this.highlightedMeshes.push({
                            mesh: child,
                            originalMaterial: child.material
                        });
                        
                        child.material = highlightMaterial;
                    }
                }
            });
            
            console.log(`🔄 Highlighted ${this.highlightedMeshes.length} meshes`);
        }
        
        /**
         * Remove highlight from furniture
         */
        unhighlightFurniture() {
            this.highlightedMeshes.forEach(({ mesh, originalMaterial }) => {
                if (mesh && mesh.material) {
                    mesh.material.dispose();
                    mesh.material = originalMaterial;
                }
            });
            this.highlightedMeshes = [];
            console.log('🔄 Removed furniture highlight');
        }
        
        /**
         * Exit rotation mode
         */
        exitRotationMode() {
            if (!this.isRotationMode) return;
            
            console.log('🔄 Exiting rotation mode');
            
            // Save final rotation
            if (this.furnitureId && window.app && window.app.furnitureManager) {
                const furniture = window.app.furnitureManager.storageManager.furniture.get(this.furnitureId);
                if (furniture && this.rotatingObject) {
                    furniture.rotation = this.rotatingObject.rotation.y;
                    window.app.furnitureManager.storageManager.saveFurniture(furniture);
                    console.log('🔄 Saved furniture rotation:', furniture.rotation);
                }
            }
            
            // Remove highlight
            this.unhighlightFurniture();
            
            // Reset state
            this.isRotationMode = false;
            this.rotatingObject = null;
            this.rotationIcon = null;
            this.furnitureId = null;
            this.pathId = null;
            this.objectCenter = null;
        }

        /**
         * Rotate furniture by a small increment (tap-based rotation)
         * @param {number} direction - 1 for clockwise, -1 for counter-clockwise
         * @returns {boolean} Success
         */
        rotateFurnitureIncremental(direction = 1) {
            if (!this.isRotationMode || !this.rotatingObject) return false;
            
            // Rotate by 15 degrees (π/12 radians)
            const rotationIncrement = (Math.PI / 12) * direction;
            this.rotatingObject.rotation.y += rotationIncrement;
            
            // Update object positions on furniture
            if (this.furnitureId && window.app && window.app.furnitureManager) {
                const furniture = window.app.furnitureManager.storageManager.furniture.get(this.furnitureId);
                if (furniture) {
                    furniture.rotation = this.rotatingObject.rotation.y;
                    
                    // Update positions of objects on furniture
                    furniture.objectIds.forEach(objectId => {
                        const slotIndex = furniture.objectIds.indexOf(objectId);
                        if (slotIndex >= 0 && slotIndex < furniture.positions.length) {
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
                                
                                // Update link title label position
                                if (window.linkTitleManager) {
                                    window.linkTitleManager.updateLabelPosition(objectMesh);
                                }
                            }
                        }
                    });
                }
            }
            
            console.log(`🔄 Rotated furniture by ${rotationIncrement * (180 / Math.PI)}°`);
            return true;
        }
        
        /**
         * Handle tap during rotation mode
         * @param {THREE.Vector2} pointerPosition - Tap position in screen space
         * @param {THREE.Raycaster} raycaster - Raycaster for hit testing
         * @param {Array} interactables - Array of interactive objects
         * @returns {boolean} True if tap was handled
         */
        handleRotationTap(pointerPosition, raycaster, interactables) {
            if (!this.isRotationMode) return false;
            
            // Check if tapped on furniture (rotate clockwise)
            const intersects = raycaster.intersectObjects(interactables, true);
            let tappedFurniture = false;
            
            for (const intersect of intersects) {
                if (intersect.object.userData.furnitureId === this.furnitureId) {
                    tappedFurniture = true;
                    break;
                }
            }
            
            if (tappedFurniture) {
                // Rotate furniture clockwise
                this.rotateFurnitureIncremental(1);
                return true;
            } else {
                // Tapped away - exit rotation mode
                this.exitRotationMode();
                return true;
            }
        }

        /**
         * End rotation interaction
         * @returns {boolean} Success
         */
        async endRotation() {
            if (!this.rotatingObject) return false;
            
            const furnitureId = this.rotationHandle?.userData.furnitureId;
            const pathId = this.rotationHandle?.userData.pathId;
            
            console.log(`🔄 Ending rotation for ${furnitureId || pathId}: ${this.rotatingObject.rotation.y.toFixed(2)} rad`);
            
            // Notify managers to save final rotation
            if (furnitureId && window.app && window.app.furnitureManager) {
                await window.app.furnitureManager.endRotation();
            } else if (pathId && window.app && window.app.pathManager) {
                // Future: add path rotation support
            }
            
            // Clear state
            this.rotatingObject = null;
            this.rotationHandle = null;
            this.startRotation = 0;
            this.startPointerAngle = 0;
            this.objectCenter = null;
            
            return true;
        }

        /**
         * Check if currently rotating
         * @returns {boolean}
         */
        isRotating() {
            return this.rotatingObject !== null;
        }

        /**
         * Cancel rotation (reset to original rotation)
         */
        cancelRotation() {
            if (!this.rotatingObject) return;
            
            console.log('🔄 Canceling rotation');
            this.rotatingObject.rotation.y = this.startRotation;
            
            this.rotatingObject = null;
            this.rotationHandle = null;
            this.startRotation = 0;
            this.startPointerAngle = 0;
            this.objectCenter = null;
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    
    window.RotationInteraction = RotationInteraction;
    
    console.log('✅ Rotation Interaction Module loaded');
})();
