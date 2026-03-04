/**
 * FOREST MOVEMENT MENU MODULE
 * Provides menu-based upward movement capability for Forest Realm world
 * Menu options: Move, Move Up, Delete, Cancel
 */

(function() {
    'use strict';
    
    console.log('🌲 Loading Forest Movement Menu module...');

    // ============================================================================
    // FOREST MOVEMENT MENU CLASS
    // ============================================================================
    
    class ForestMovementMenu {
        constructor() {
            this.menuElement = null;
            this.currentObject = null;
            this.currentPosition = null;
            this.allObjects = [];
            this.moveCallback = null;
            this.deleteCallback = null;
            this.isVisible = false;
            
            // Create menu DOM structure
            this.createMenuHTML();
            this.attachEventListeners();
        }

        createMenuHTML() {
            // Create menu container
            this.menuElement = document.createElement('div');
            this.menuElement.id = 'forest-movement-menu';
            this.menuElement.style.cssText = `
                position: fixed;
                background: rgba(47, 79, 47, 0.95);
                color: #FFFACD;
                border: 2px solid #228B22;
                border-radius: 8px;
                padding: 12px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                display: none;
                min-width: 180px;
                backdrop-filter: blur(4px);
            `;

            // Create menu title
            const title = document.createElement('div');
            title.textContent = 'Forest Movement';
            title.style.cssText = `
                font-weight: bold;
                margin-bottom: 8px;
                text-align: center;
                color: #90EE90;
                border-bottom: 1px solid #228B22;
                padding-bottom: 4px;
            `;
            this.menuElement.appendChild(title);

            // Create menu buttons
            const buttons = [
                { id: 'move-btn', text: '📱 Move', action: 'move' },
                { id: 'move-up-btn', text: '⬆️ Move Up', action: 'moveUp' },
                { id: 'delete-btn', text: '🗑️ Delete', action: 'delete' },
                { id: 'cancel-btn', text: '❌ Cancel', action: 'cancel' }
            ];

            buttons.forEach(btn => {
                const button = document.createElement('button');
                button.id = btn.id;
                button.textContent = btn.text;
                button.style.cssText = `
                    display: block;
                    width: 100%;
                    margin: 4px 0;
                    padding: 8px 12px;
                    background: rgba(34, 139, 34, 0.8);
                    color: #FFFACD;
                    border: 1px solid #228B22;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    font-size: 13px;
                `;
                
                // Add hover effects
                button.addEventListener('mouseenter', () => {
                    button.style.backgroundColor = 'rgba(34, 139, 34, 1)';
                });
                button.addEventListener('mouseleave', () => {
                    button.style.backgroundColor = 'rgba(34, 139, 34, 0.8)';
                });

                // Add click handler
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleMenuAction(btn.action);
                });

                this.menuElement.appendChild(button);
            });

            // Add to document body
            document.body.appendChild(this.menuElement);
        }

        attachEventListeners() {
            // Hide menu when clicking outside
            document.addEventListener('click', (e) => {
                if (this.isVisible && !this.menuElement.contains(e.target)) {
                    this.hideMenu();
                }
            });

            // Hide menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible) {
                    this.hideMenu();
                }
            });
        }

        showMenu(x, y, object, currentPosition, allObjects, moveCallback, deleteCallback) {
            console.log('🌲 Showing Forest Movement Menu for:', object.userData.fileName || 'unknown object');
            
            this.currentObject = object;
            this.currentPosition = { ...currentPosition };
            this.allObjects = allObjects || [];
            this.moveCallback = moveCallback;
            this.deleteCallback = deleteCallback;

            // Position menu at click location
            this.menuElement.style.left = `${x}px`;
            this.menuElement.style.top = `${y}px`;
            
            // Ensure menu stays within viewport
            this.adjustMenuPosition();
            
            // Show menu
            this.menuElement.style.display = 'block';
            this.isVisible = true;

            // Update button states based on object position
            this.updateButtonStates();
        }

        adjustMenuPosition() {
            const rect = this.menuElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Adjust horizontal position
            if (rect.right > viewportWidth) {
                this.menuElement.style.left = `${viewportWidth - rect.width - 10}px`;
            }
            if (rect.left < 0) {
                this.menuElement.style.left = '10px';
            }

            // Adjust vertical position
            if (rect.bottom > viewportHeight) {
                this.menuElement.style.top = `${viewportHeight - rect.height - 10}px`;
            }
            if (rect.top < 0) {
                this.menuElement.style.top = '10px';
            }
        }

        updateButtonStates() {
            const moveUpBtn = this.menuElement.querySelector('#move-up-btn');
            const objectHeight = this.currentObject.userData?.objectHeight || this.currentObject.geometry?.parameters?.height || 1;
            const currentY = this.currentPosition.y;
            const groundLevel = objectHeight / 2;

            // Enable/disable Move Up button based on current position and constraints
            if (currentY > groundLevel + 10) { // Already elevated significantly
                moveUpBtn.style.opacity = '0.6';
                moveUpBtn.style.cursor = 'not-allowed';
                moveUpBtn.title = 'Object is already elevated';
            } else {
                moveUpBtn.style.opacity = '1';
                moveUpBtn.style.cursor = 'pointer';
                moveUpBtn.title = 'Move object up with tree trunk support';
            }
        }

        hideMenu() {
            if (this.isVisible) {
                this.menuElement.style.display = 'none';
                this.isVisible = false;
                this.currentObject = null;
                this.currentPosition = null;
                this.allObjects = [];
                this.moveCallback = null;
                this.deleteCallback = null;
                console.log('🌲 Forest Movement Menu hidden');
            }
        }

        handleMenuAction(action) {
            console.log(`🌲 Forest Movement Menu action: ${action}`);

            switch (action) {
                case 'move':
                    this.handleMove();
                    break;
                case 'moveUp':
                    this.handleMoveUp();
                    break;
                case 'delete':
                    this.handleDelete();
                    break;
                case 'cancel':
                    this.hideMenu();
                    break;
                default:
                    console.warn(`🌲 Unknown menu action: ${action}`);
            }
        }

        handleMove() {
            console.log('🌲 Initiating regular move for object');
            
            // Enable regular movement mode - this will use existing drag/move mechanics
            if (this.moveCallback) {
                // Call with current position to maintain current location
                this.moveCallback(this.currentObject, this.currentPosition, 'move');
            }
            
            this.hideMenu();
        }

        handleMoveUp() {
            console.log('🌲 Initiating move up for object');
            
            const objectHeight = this.currentObject.userData?.objectHeight || this.currentObject.geometry?.parameters?.height || 1;
            const currentY = this.currentPosition.y;
            const groundLevel = objectHeight / 2;
            
            // Check if object is already elevated
            if (currentY > groundLevel + 10) {
                console.log('🌲 Object is already elevated, no further action needed');
                this.hideMenu();
                return;
            }

            // Calculate new elevated position
            const elevationHeight = this.calculateOptimalElevation();
            const newPosition = {
                x: this.currentPosition.x,
                y: elevationHeight,
                z: this.currentPosition.z
            };

            console.log(`🌲 Moving object up from Y=${currentY} to Y=${elevationHeight}`);

            // Create tree trunk support at the new position
            this.createTreeTrunkSupport(newPosition);

            // Apply the move
            if (this.moveCallback) {
                this.moveCallback(this.currentObject, newPosition, 'moveUp');
            }

            this.hideMenu();
        }

        calculateOptimalElevation() {
            // Calculate a good elevation height
            const objectHeight = this.currentObject.userData?.objectHeight || this.currentObject.geometry?.parameters?.height || 1;
            const baseElevation = 15; // Standard tree trunk height
            const objectCenterHeight = objectHeight / 2;
            
            // Check for other objects at similar position to avoid collisions
            let finalElevation = baseElevation + objectCenterHeight;
            
            const checkRadius = 5; // Area to check for conflicts
            for (const otherObj of this.allObjects) {
                if (otherObj === this.currentObject) continue;
                
                const distance = Math.sqrt(
                    Math.pow(otherObj.position.x - this.currentPosition.x, 2) +
                    Math.pow(otherObj.position.z - this.currentPosition.z, 2)
                );
                
                if (distance < checkRadius && otherObj.position.y > baseElevation) {
                    // Adjust elevation to avoid collision
                    const otherHeight = otherObj.userData?.objectHeight || otherObj.geometry?.parameters?.height || 1;
                    const potentialHeight = otherObj.position.y + otherHeight / 2 + objectCenterHeight + 2;
                    if (potentialHeight > finalElevation) {
                        finalElevation = potentialHeight;
                    }
                }
            }

            return Math.min(finalElevation, 50); // Cap at reasonable height
        }

        createTreeTrunkSupport(position) {
            // Create a visual tree trunk to support the elevated object
            console.log(`🌲 Creating tree trunk support at position (${position.x}, ${position.z})`);
            
            // Check if a tree trunk already exists at this position
            const existingTrunk = this.findExistingTreeTrunk(position.x, position.z);
            if (existingTrunk) {
                console.log('🌲 Tree trunk already exists at this position');
                return existingTrunk;
            }

            // Check if current world template has a createTreeTrunk method (for Cave Explorer stalagmites)
            const worldTemplate = window.app?.worldTemplate;
            if (worldTemplate && typeof worldTemplate.createTreeTrunk === 'function') {
                console.log(`🗿 Using world template's createTreeTrunk method for support creation`);
                const trunkHeight = position.y; // Trunk height to reach the object
                return worldTemplate.createTreeTrunk(this.currentObject, trunkHeight);
            }

            // Fallback: Create new tree trunk support (Forest Realm style)
            const trunkHeight = position.y; // Trunk height to reach the object
            const trunkGeometry = new THREE.CylinderGeometry(0.8, 1.2, trunkHeight, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513, // Brown trunk color
                roughness: 0.8,
                metalness: 0.1
            });
            
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(position.x, trunkHeight / 2, position.z);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            trunk.userData.isTreeTrunkSupport = true;
            trunk.userData.supportHeight = trunkHeight;
            trunk.userData.createdForObject = this.currentObject.userData.fileName || 'unknown';

            // Add to scene through the current world template
            if (window.app && window.app.worldTemplate && window.app.worldTemplate.scene) {
                window.app.worldTemplate.scene.add(trunk);
                window.app.worldTemplate.objects.push(trunk);
                console.log('🌲 Tree trunk support created and added to scene');
            } else {
                console.error('🌲 Could not add tree trunk to scene - no world template found');
            }

            return trunk;
        }

        findExistingTreeTrunk(x, z) {
            const checkRadius = 2; // How close to consider "same position"
            
            if (window.app && window.app.worldTemplate && window.app.worldTemplate.objects) {
                for (const obj of window.app.worldTemplate.objects) {
                    if (obj.userData.isTreeTrunkSupport || obj.userData.isTreeTrunk) {
                        const distance = Math.sqrt(
                            Math.pow(obj.position.x - x, 2) +
                            Math.pow(obj.position.z - z, 2)
                        );
                        if (distance < checkRadius) {
                            return obj;
                        }
                    }
                }
            }
            
            return null;
        }

        handleDelete() {
            console.log('🌲 Initiating delete for object');
            
            if (this.deleteCallback) {
                this.deleteCallback(this.currentObject);
            }
            
            this.hideMenu();
        }

        cleanup() {
            if (this.menuElement && this.menuElement.parentNode) {
                this.menuElement.parentNode.removeChild(this.menuElement);
            }
            this.hideMenu();
        }
    }

    // ============================================================================
    // FOREST MOVEMENT INTEGRATION HELPER
    // ============================================================================
    
    class ForestMovementIntegration {
        constructor() {
            this.menu = null;
            this.originalHandleObjectClick = null;
            this.isIntegrated = false;
        }

        initialize() {
            console.log('🌲 Initializing Forest Movement Integration');
            this.menu = new ForestMovementMenu();
            this.integrateWithInteractionManager();
        }

        integrateWithInteractionManager() {
            if (this.isIntegrated) {
                console.log('🌲 Forest movement already integrated');
                return;
            }

            // Wait for interaction manager to be available
            if (!window.app || !window.app.interactionManager) {
                console.log('🌲 Interaction manager not ready, retrying in 1 second...');
                setTimeout(() => this.integrateWithInteractionManager(), 1000);
                return;
            }

            console.log('🌲 Integrating forest movement with interaction manager');

            // Store original method
            this.originalHandleObjectClick = window.app.interactionManager.handleObjectClick.bind(window.app.interactionManager);

            // Override handleObjectClick to intercept forest realm clicks
            window.app.interactionManager.handleObjectClick = (object, event) => {
                if (this.shouldShowForestMenu(object, event)) {
                    this.showForestMovementMenu(object, event);
                } else {
                    // Use original handler for non-forest realm or normal clicks
                    this.originalHandleObjectClick(object, event);
                }
            };

            this.isIntegrated = true;
            console.log('🌲 Forest movement integration complete');
        }

        shouldShowForestMenu(object, event) {
            // Only show menu in forest realm
            if (!this.isForestRealm()) {
                return false;
            }

            // Only show for user objects (not template objects)
            if (!object || !object.userData || object.userData.templateObject) {
                return false;
            }

            // Check if this is a right-click or long press (we'll use Ctrl+Click for now)
            if (event && (event.ctrlKey || event.button === 2)) {
                return true;
            }

            // For now, show menu on any forest realm object click for testing
            return true;
        }

        showForestMovementMenu(object, event) {
            console.log('🌲 Showing forest movement menu for:', object.userData.fileName);

            const currentPosition = {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z
            };

            const allObjects = window.app.worldTemplate ? window.app.worldTemplate.objects : [];

            // Movement callback
            const moveCallback = (obj, newPosition, moveType) => {
                console.log(`🌲 Forest move callback: ${moveType}`, newPosition);
                
                // Apply enhanced constraints
                const constrainedPosition = this.applyEnhancedConstraints(obj, newPosition, allObjects, moveType);
                
                // Update object position
                obj.position.set(constrainedPosition.x, constrainedPosition.y, constrainedPosition.z);
                
                // Log event
                if (window.ForestMovementBridge) {
                    window.ForestMovementBridge.handleForestEvent('objectMoved', {
                        objectName: obj.userData.fileName,
                        moveType: moveType,
                        x: constrainedPosition.x,
                        y: constrainedPosition.y,
                        z: constrainedPosition.z
                    });
                }
            };

            // Delete callback
            const deleteCallback = (obj) => {
                console.log('🌲 Forest delete callback for:', obj.userData.fileName);
                
                // Remove object from scene
                if (obj.parent) {
                    obj.parent.remove(obj);
                }
                
                // Remove from world template objects
                if (window.app.worldTemplate && window.app.worldTemplate.objects) {
                    const index = window.app.worldTemplate.objects.indexOf(obj);
                    if (index > -1) {
                        window.app.worldTemplate.objects.splice(index, 1);
                    }
                }
                
                // Log event
                if (window.ForestMovementBridge) {
                    window.ForestMovementBridge.handleForestEvent('objectDeleted', {
                        objectName: obj.userData.fileName
                    });
                }
            };

            // Show menu
            this.menu.showMenu(
                event.clientX || window.innerWidth / 2,
                event.clientY || window.innerHeight / 2,
                object,
                currentPosition,
                allObjects,
                moveCallback,
                deleteCallback
            );
        }

        // Check if current world supports forest-style movement (forest realm AND cave explorer)
        isForestRealm() {
            if (!window.app || !window.app.worldTemplate || !window.app.worldTemplate.getType) {
                return false;
            }
            
            const worldType = window.app.worldTemplate.getType();
            // Include both forest and cave worlds since Cave Explorer extends Forest Realm
            return worldType === 'forest' || worldType === 'cave';
        }

        // Enhanced constraint method that supports menu-initiated moves
        applyEnhancedConstraints(object, newPosition, allObjects, moveType = 'normal') {
            if (!this.isForestRealm()) {
                // Not forest realm, use default constraints
                if (window.app && window.app.worldTemplate && window.app.worldTemplate.applyPositionConstraints) {
                    return window.app.worldTemplate.applyPositionConstraints(object, newPosition, allObjects);
                }
                return newPosition;
            }

            const worldType = window.app.worldTemplate.getType();
            
            if (worldType === 'cave') {
                console.log(`🕳️ Applying enhanced cave constraints for ${moveType} move`);
            } else {
                console.log(`🌲 Applying enhanced forest constraints for ${moveType} move`);
            }

            const constraints = window.app.worldTemplate.getPositioningConstraints();
            
            // Apply X and Z boundary constraints
            let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            // Get object height
            const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
            
            // Handle Y constraint based on move type
            let constrainedY;
            
            if (moveType === 'moveUp') {
                // Menu-initiated upward movement - allow elevation with support
                constrainedY = Math.max(0, newPosition.y);
                constrainedY = Math.min(constraints.worldBoundaries.y.max, constrainedY);
                
                if (worldType === 'cave') {
                    console.log(`🕳️ Move Up - allowing elevated position Y=${constrainedY} with stalagmite support`);
                } else {
                    console.log(`🌲 Move Up - allowing elevated position Y=${constrainedY} with tree trunk support`);
                }
            } else {
                // Regular movement - use world-specific constraints
                constrainedY = Math.max(0, newPosition.y);
                constrainedY = Math.min(constraints.worldBoundaries.y.max, constrainedY);
                
                // Apply support logic for regular moves
                if (constrainedY <= objectHeight / 2 + 0.1) {
                    // Object is at ground level
                    constrainedY = objectHeight / 2;
                    
                    if (worldType === 'cave') {
                        console.log(`🕳️ Regular move - ground level positioning Y=${constrainedY}`);
                    } else {
                        console.log(`🌲 Regular move - ground level positioning Y=${constrainedY}`);
                    }
                } else {
                    // Object is elevated - maintain position with appropriate support
                    if (worldType === 'cave') {
                        // Cave Explorer: Allow elevated positions with stalagmite support
                        console.log(`🕳️ Regular move - maintaining elevated position Y=${constrainedY} with stalagmite support`);
                    } else {
                        // Forest Realm: Check for tree trunk support
                        const hasTrunkSupport = this.menu.findExistingTreeTrunk(constrainedX, constrainedZ);
                        if (hasTrunkSupport) {
                            console.log(`🌲 Regular move - maintaining elevated position Y=${constrainedY} with existing trunk support`);
                        } else {
                            // No trunk support - move to ground
                            constrainedY = objectHeight / 2;
                            console.log(`🌲 Regular move - no trunk support, moving to ground Y=${constrainedY}`);
                        }
                    }
                }
            }

            const finalPosition = {
                x: constrainedX,
                y: constrainedY,
                z: constrainedZ
            };

            if (worldType === 'cave') {
                console.log(`🕳️ Enhanced cave constraints result: (${finalPosition.x}, ${finalPosition.y}, ${finalPosition.z})`);
            } else {
                console.log(`🌲 Enhanced forest constraints result: (${finalPosition.x}, ${finalPosition.y}, ${finalPosition.z})`);
            }
            return finalPosition;
        }

        cleanup() {
            if (this.isIntegrated && this.originalHandleObjectClick) {
                // Restore original handler
                if (window.app && window.app.interactionManager) {
                    window.app.interactionManager.handleObjectClick = this.originalHandleObjectClick;
                }
                this.isIntegrated = false;
            }

            if (this.menu) {
                this.menu.cleanup();
                this.menu = null;
            }
        }
    }

    // ============================================================================
    // GLOBAL INTEGRATION
    // ============================================================================
    
    // Create global instance
    window.ForestMovementIntegration = new ForestMovementIntegration();
    
    // Auto-initialize when document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.ForestMovementIntegration.initialize();
        });
    } else {
        window.ForestMovementIntegration.initialize();
    }
    
    console.log('🌲 Forest Movement Menu module loaded successfully!');
})();
