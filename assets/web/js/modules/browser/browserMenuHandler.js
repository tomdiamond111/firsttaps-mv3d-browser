/**
 * BROWSER MENU HANDLER
 * Comprehensive menu system for browser version (replaces Flutter ObjectActionChannel)
 * 
 * Features:
 * - Object actions: Move (H/V), Delete, Undo Delete, Add to Furniture, Move to Home
 * - Furniture actions: Move, Delete, Share, Rename, Add Content
 * - Undo/Redo system
 * - Toast notifications
 */

(function() {
    'use strict';

    console.log('🌐 Loading Browser Menu Handler...');

    class BrowserMenuHandler {
        constructor(app) {
            this.app = app;
            this.scene = app.scene;
            
            // Deletion history for undo
            this.deletionHistory = [];
            this.MAX_UNDO_HISTORY = 10;
            
            // Move history for undo
            this.moveHistory = [];
            this.MAX_MOVE_HISTORY = 10;
            
            console.log('🌐 BrowserMenuHandler initialized');
        }

        /**
         * Show context menu for any object (link, app, furniture, etc.)
         * @param {Object3D} object - The clicked object
         */
        showContextMenu(object) {
            const objectType = this.detectObjectType(object);
            const objectName = this.getObjectName(object);
            const objectId = this.getObjectId(object);
            
            console.log(`🌐 Showing menu for ${objectType}: ${objectName} (${objectId})`);
            
            if (objectType === 'furniture') {
                this.showFurnitureMenu(object, objectName, objectId);
            } else {
                this.showObjectMenu(object, objectName, objectId, objectType);
            }
        }

        /**
         * Show menu for regular objects (links, apps, files)
         */
        showObjectMenu(object, objectName, objectId, objectType) {
            const overlay = this.createOverlay();
            const menu = this.createMenuContainer();
            
            // Check if we support vertical movement (3D worlds)
            const supportsVerticalMovement = this.supportsVerticalMovement();
            
            menu.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 5px 0; color: #333; font-size: 18px;">${objectName}</h3>
                    <div style="color: #666; font-size: 12px; margin-bottom: 15px;">Type: ${objectType}</div>
                    
                    ${supportsVerticalMovement ? `
                        <button class="menu-btn" data-action="moveHorizontal">
                            <span class="menu-icon">⇔</span> Move Horizontally
                            <div class="menu-subtitle">Move on ground plane (X/Z)</div>
                        </button>
                        <button class="menu-btn" data-action="moveVertical">
                            <span class="menu-icon">⇕</span> Move Vertically
                            <div class="menu-subtitle">Move up/down (Y axis)</div>
                        </button>
                    ` : `
                        <button class="menu-btn" data-action="move">
                            <span class="menu-icon">⇔</span> Move Object
                        </button>
                    `}
                    
                    <button class="menu-btn" data-action="addToFurniture">
                        <span class="menu-icon">🪑</span> Add to Furniture
                        <div class="menu-subtitle">Place on existing furniture</div>
                    </button>
                    
                    <button class="menu-btn" data-action="moveToHome">
                        <span class="menu-icon">🏠</span> Move to Home Area
                        <div class="menu-subtitle">Return to center</div>
                    </button>
                    
                    <div style="height: 1px; background: #ddd; margin: 10px 0;"></div>
                    
                    <button class="menu-btn menu-btn-danger" data-action="delete">
                        <span class="menu-icon">🗑️</span> Delete Object
                    </button>
                    
                    <button class="menu-btn menu-btn-cancel" data-action="cancel">
                        <span class="menu-icon">✕</span> Cancel
                    </button>
                </div>
            `;
            
            this.addMenuStyles();
            overlay.appendChild(menu);
            document.body.appendChild(overlay);
            
            // Handle button clicks (async to properly await actions)
            menu.querySelectorAll('.menu-btn').forEach(btn => {
                btn.onclick = async () => {
                    const action = btn.dataset.action;
                    // Don't remove overlay immediately for async actions
                    if (action === 'moveToHome' || action === 'delete') {
                        document.body.removeChild(overlay);
                        await this.handleObjectAction(action, object, objectId, objectName);
                    } else {
                        this.handleObjectAction(action, object, objectId, objectName);
                        document.body.removeChild(overlay);
                    }
                };
            });
            
            overlay.onclick = (e) => {
                if (e.target === overlay) document.body.removeChild(overlay);
            };
        }

        /**
         * Show menu for furniture
         */
        showFurnitureMenu(object, objectName, objectId) {
            const overlay = this.createOverlay();
            const menu = this.createMenuContainer();
            
            const furniture = this.app.furnitureManager?.storageManager.getFurniture(objectId);
            const hasObjects = furniture && furniture.objectIds?.some(id => id);
            
            menu.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 5px 0; color: #333; font-size: 18px;">${objectName}</h3>
                    <div style="color: #666; font-size: 12px; margin-bottom: 15px;">Type: furniture</div>
                    
                    <button class="menu-btn" data-action="move">
                        <span class="menu-icon">⇔</span> Move Furniture
                    </button>
                    
                    <button class="menu-btn" data-action="addContent">
                        <span class="menu-icon">➕</span> Add Content
                        <div class="menu-subtitle">Add objects to furniture</div>
                    </button>
                    
                    ${hasObjects ? `
                        <button class="menu-btn" data-action="share">
                            <span class="menu-icon">🔗</span> Share Furniture
                            <div class="menu-subtitle">Generate shareable link</div>
                        </button>
                    ` : ''}
                    
                    <button class="menu-btn" data-action="rename">
                        <span class="menu-icon">✏️</span> Rename
                    </button>
                    
                    <div style="height: 1px; background: #ddd; margin: 10px 0;"></div>
                    
                    <button class="menu-btn menu-btn-danger" data-action="delete">
                        <span class="menu-icon">🗑️</span> Delete Furniture
                    </button>
                    
                    <button class="menu-btn menu-btn-cancel" data-action="cancel">
                        <span class="menu-icon">✕</span> Cancel
                    </button>
                </div>
            `;
            
            this.addMenuStyles();
            overlay.appendChild(menu);
            document.body.appendChild(overlay);
            
            // Handle button clicks
            menu.querySelectorAll('.menu-btn').forEach(btn => {
                btn.onclick = () => {
                    const action = btn.dataset.action;
                    this.handleFurnitureAction(action, object, objectId, objectName);
                    document.body.removeChild(overlay);
                };
            });
            
            overlay.onclick = (e) => {
                if (e.target === overlay) document.body.removeChild(overlay);
            };
        }

        /**
         * Handle object actions
         */
        async handleObjectAction(action, object, objectId, objectName) {
            console.log(`🌐 Handling object action: ${action} for ${objectName}`);
            console.log(`🌐 Object type: ${object?.type}, userData.type: ${object?.userData?.type}`);
            
            try {
                switch (action) {
                    case 'move':
                    case 'moveHorizontal':
                        // Use the object reference directly - it's already the correct mesh
                        if (object && this.app.moveManager) {
                            this.app.moveManager.startMovingObject(object);
                            this.showToast(`Move ${objectName} - drag to reposition`, 'info');
                        } else {
                            this.showToast(`Could not start move mode`, 'error');
                        }
                        break;
                        
                    case 'moveVertical':
                        // Vertical movement - same as horizontal for browser
                        if (object && this.app.moveManager) {
                            this.app.moveManager.startMovingObject(object);
                            this.showToast(`Move ${objectName} vertically - drag to adjust height`, 'info');
                        } else {
                            this.showToast(`Could not start move mode`, 'error');
                        }
                        break;
                        
                    case 'addToFurniture':
                        // Show furniture selection dialog
                        this.showFurnitureSelectionDialog(object, objectId, objectName);
                        break;
                        
                    case 'moveToHome':
                        // CRITICAL: If object is on furniture, remove it first
                        if (object?.userData?.furnitureId) {
                            const furnitureId = object.userData.furnitureId;
                            console.log(`🪑 Object is on furniture ${furnitureId}, removing before move to home`);
                            await this.app.furnitureManager?.removeObjectFromFurniture(furnitureId, objectId);
                        }
                        
                        // Use global function to move object to home area
                        if (window.moveSearchResultToHomeAreaJS) {
                            await window.moveSearchResultToHomeAreaJS(objectId);
                            this.showToast(`${objectName} moved to home area`, 'success');
                        } else {
                            this.showToast(`Move to home feature not available`, 'error');
                        }
                        break;
                        
                    case 'delete':
                        this.showDeleteConfirmation(objectId, objectName, false);
                        break;
                        
                    case 'cancel':
                        // Hide any active menu/selection
                        if (this.app.stateManager) {
                            this.app.stateManager.selectedObject = null;
                        }
                        break;
                }
            } catch (error) {
                console.error(`Error handling object action:`, error);
                this.showToast(`Error: ${error.message}`, 'error');
            }
        }

        /**
         * Handle furniture actions
         */
        async handleFurnitureAction(action, object, objectId, objectName) {
            console.log(`🌐 Handling furniture action: ${action} for ${objectName}`);
            console.log(`🌐 Furniture object type: ${object?.type}, isFurniture: ${object?.userData?.isFurniture}`);
            
            try {
                switch (action) {
                    case 'move':
                        // Use the furniture group directly if it's the parent group
                        // Otherwise get it from the furniture manager
                        let furnitureGroup = object;
                        
                        // If the object is a child mesh, traverse up to find the furniture group
                        if (object && object.userData?.furnitureId && !object.userData?.isFurniture) {
                            const parentGroup = object.parent;
                            if (parentGroup && parentGroup.userData?.isFurniture) {
                                furnitureGroup = parentGroup;
                            }
                        }
                        
                        // Fallback: look up by ID if we don't have the group
                        if (!furnitureGroup || !furnitureGroup.userData?.isFurniture) {
                            furnitureGroup = this.app.furnitureManager?.visualManager?.getFurnitureGroup(objectId);
                        }
                        
                        if (furnitureGroup && this.app.moveManager) {
                            this.app.moveManager.startMovingObject(furnitureGroup);
                            this.showToast(`Move ${objectName} - drag to reposition`, 'info');
                        } else {
                            this.showToast(`Could not find furniture to move`, 'error');
                        }
                        break;
                        
                    case 'addContent':
                        // Show add content menu for furniture
                        this.showToast(`Add content: Use the Add Content button (+) to add items`, 'info');
                        break;
                        
                    case 'share':
                        this.shareFurniture(objectId, objectName);
                        break;
                        
                    case 'rename':
                        this.showRenameDialog(objectId, objectName);
                        break;
                        
                    case 'delete':
                        this.showDeleteConfirmation(objectId, objectName, true);
                        break;
                        
                    case 'cancel':
                        // Hide any active menu/selection
                        if (this.app.stateManager) {
                            this.app.stateManager.selectedObject = null;
                        }
                        break;
                }
            } catch (error) {
                console.error(`Error handling furniture action:`, error);
                this.showToast(`Error: ${error.message}`, 'error');
            }
        }

        /**
         * Show delete confirmation dialog
         */
        showDeleteConfirmation(objectId, objectName, isFurniture) {
            const overlay = this.createOverlay();
            const menu = this.createMenuContainer();
            
            menu.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Delete "${objectName}"?</h3>
                    
                    <button class="menu-btn menu-btn-danger" data-action="confirm">
                        <span class="menu-icon">🗑️</span> Yes, Delete
                    </button>
                    
                    <button class="menu-btn menu-btn-cancel" data-action="cancel">
                        <span class="menu-icon">✕</span> Cancel
                    </button>
                </div>
            `;
            
            overlay.appendChild(menu);
            document.body.appendChild(overlay);
            
            menu.querySelector('[data-action="confirm"]').onclick = async () => {
                document.body.removeChild(overlay);
                await this.deleteObject(objectId, objectName, isFurniture);
            };
            
            menu.querySelector('[data-action="cancel"]').onclick = () => {
                document.body.removeChild(overlay);
            };
            
            overlay.onclick = (e) => {
                if (e.target === overlay) document.body.removeChild(overlay);
            };
        }

        /**
         * Delete object with undo support
         */
        async deleteObject(objectId, objectName, isFurniture) {
            try {
                // Store for undo
                const objectData = await this.captureObjectState(objectId);
                
                if (isFurniture) {
                    // Delete furniture using furnitureManager
                    if (this.app.furnitureManager) {
                        await this.app.furnitureManager.deleteFurniture(objectId);
                    } else {
                        throw new Error('Furniture manager not available');
                    }
                } else {
                    // CRITICAL: If object is on furniture, remove it first
                    const objectMesh = this.findObjectInScene(objectId);
                    if (objectMesh?.userData?.furnitureId) {
                        const furnitureId = objectMesh.userData.furnitureId;
                        console.log(`🪑 Object is on furniture ${furnitureId}, removing before delete`);
                        await this.app.furnitureManager?.removeObjectFromFurniture(furnitureId, objectId);
                    }
                    
                    // Delete object using global removeObjectByIdJS function
                    if (window.removeObjectByIdJS) {
                        window.removeObjectByIdJS(objectId);
                    } else {
                        throw new Error('Object deletion function not available');
                    }
                }
                
                // Add to undo history
                this.deletionHistory.push({
                    id: objectId,
                    name: objectName,
                    data: objectData,
                    timestamp: Date.now(),
                    isFurniture
                });
                
                if (this.deletionHistory.length > this.MAX_UNDO_HISTORY) {
                    this.deletionHistory.shift();
                }
                
                this.showToastWithUndo(`${objectName} deleted`, () => this.undoDelete());
                
            } catch (error) {
                console.error(`Error deleting object:`, error);
                this.showToast(`Error deleting: ${error.message}`, 'error');
            }
        }

        /**
         * Undo last deletion
         */
        async undoDelete() {
            if (this.deletionHistory.length === 0) {
                this.showToast('Nothing to undo', 'info');
                return;
            }
            
            const lastDeletion = this.deletionHistory.pop();
            
            try {
                // Restore object
                await this.restoreObject(lastDeletion);
                this.showToast(`Restored: ${lastDeletion.name}`, 'success');
            } catch (error) {
                console.error('Error undoing deletion:', error);
                this.showToast(`Error restoring: ${error.message}`, 'error');
            }
        }

        /**
         * Share furniture - generate shareable link
         */
        async shareFurniture(furnitureId, furnitureName) {
            try {
                if (!this.app.shareManager) {
                    this.showToast('Share feature not available', 'error');
                    return;
                }
                
                // Show uploading toast
                this.showToast('Uploading furniture data...', 'info');
                
                const result = await this.app.shareManager.shareFurniture(furnitureId);
                
                if (result.error) {
                    this.showToast(`Error: ${result.error}`, 'error');
                    return;
                }
                
                // Show share dialog with link
                this.showShareDialog(result, furnitureName);
                
            } catch (error) {
                console.error('Error sharing furniture:', error);
                this.showToast(`Error sharing: ${error.message}`, 'error');
            }
        }

        /**
         * Show share dialog with generated link
         */
        showShareDialog(shareResult, furnitureName) {
            const overlay = this.createOverlay();
            const menu = this.createMenuContainer();
            
            // Escape single quotes in URL for onclick handler
            const escapedUrl = shareResult.url.replace(/'/g, "\\'");
            
            menu.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Share ${furnitureName}</h3>
                    
                    <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Statistics:</div>
                        <div style="font-size: 14px; color: #333;">
                            ${shareResult.stats.totalObjects} objects<br>
                            ${shareResult.stats.youtubeObjects} YouTube<br>
                            ${shareResult.stats.vimeoObjects} Vimeo<br>
                            ${shareResult.stats.webLinkObjects} web links<br>
                            <span style="color: #4CAF50;">✓ Uploaded to ${shareResult.service}</span>
                        </div>
                        ${shareResult.warning ? `
                            <div style="color: #ff6b6b; font-size: 12px; margin-top: 5px;">⚠️ ${shareResult.warning}</div>
                        ` : ''}
                    </div>
                    
                    <div style="background: #e8f5e9; padding: 10px; border-radius: 4px; margin-bottom: 15px; word-break: break-all;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Share URL:</div>
                        <a href="${shareResult.url}" target="_blank" style="color: #2196F3; text-decoration: none; font-size: 13px;">${shareResult.url}</a>
                    </div>
                    
                    <button class="menu-btn" onclick="window.open('${escapedUrl}', '_blank')">
                        <span class="menu-icon">🔗</span> Open in New Tab
                    </button>
                    
                    <button class="menu-btn" onclick="navigator.clipboard.writeText('${escapedUrl}').then(() => alert('Copied to clipboard!'))">
                        <span class="menu-icon">📋</span> Copy to Clipboard
                    </button>
                    
                    <button class="menu-btn menu-btn-cancel" data-action="close">
                        <span class="menu-icon">✕</span> Close
                    </button>
                </div>
            `;
            
            overlay.appendChild(menu);
            document.body.appendChild(overlay);
            
            menu.querySelector('[data-action="close"]').onclick = () => {
                document.body.removeChild(overlay);
            };
            
            overlay.onclick = (e) => {
                if (e.target === overlay) document.body.removeChild(overlay);
            };
        }

        /**
         * Show rename dialog
         */
        showRenameDialog(objectId, currentName) {
            const overlay = this.createOverlay();
            const menu = this.createMenuContainer();
            
            menu.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Rename Furniture</h3>
                    
                    <input type="text" id="renameInput" value="${currentName}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; margin-bottom: 15px;" />
                    
                    <button class="menu-btn" data-action="confirm">
                        <span class="menu-icon">✓</span> Rename
                    </button>
                    
                    <button class="menu-btn menu-btn-cancel" data-action="cancel">
                        <span class="menu-icon">✕</span> Cancel
                    </button>
                </div>
            `;
            
            overlay.appendChild(menu);
            document.body.appendChild(overlay);
            
            const input = menu.querySelector('#renameInput');
            input.focus();
            input.select();
            
            const doRename = async () => {
                const newName = input.value.trim();
                if (newName && newName !== currentName) {
                    document.body.removeChild(overlay);
                    await this.renameFurniture(objectId, newName);
                } else {
                    document.body.removeChild(overlay);
                }
            };
            
            menu.querySelector('[data-action="confirm"]').onclick = doRename;
            menu.querySelector('[data-action="cancel"]').onclick = () => {
                document.body.removeChild(overlay);
            };
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') doRename();
            });
            
            overlay.onclick = (e) => {
                if (e.target === overlay) document.body.removeChild(overlay);
            };
        }

        /**
         * Rename furniture
         */
        async renameFurniture(furnitureId, newName) {
            try {
                const furniture = this.app.furnitureManager?.storageManager.getFurniture(furnitureId);
                if (furniture) {
                    furniture.name = newName;
                    await this.app.furnitureManager?.storageManager.updateFurniture(furniture);
                    
                    // Update the visual label (furnitureGroup.name and userData)
                    const furnitureGroup = this.app.furnitureManager?.visualManager?.getFurnitureGroup(furnitureId);
                    if (furnitureGroup) {
                        furnitureGroup.name = `Furniture: ${newName}`;
                        furnitureGroup.userData.name = newName;
                        console.log(`✅ Updated furniture label to: ${newName}`);
                    }
                    
                    this.showToast(`Renamed to: ${newName}`, 'success');
                }
            } catch (error) {
                console.error('Error renaming furniture:', error);
                this.showToast(`Error renaming: ${error.message}`, 'error');
            }
        }

        /**
         * Show add to furniture dialog
         */
        showAddToFurnitureDialog(objectId, objectName) {
            const furniture = this.app.furnitureManager?.storageManager.getAllFurniture() || [];
            
            if (furniture.length === 0) {
                this.showToast('No furniture available. Create furniture first.', 'info');
                return;
            }
            
            const overlay = this.createOverlay();
            const menu = this.createMenuContainer();
            
            menu.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Add to Furniture</h3>
                    <div style="color: #666; font-size: 12px; margin-bottom: 15px;">${objectName}</div>
                    
                    <div style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;">
                        ${furniture.map(f => `
                            <button class="menu-btn" data-furniture-id="${f.id}">
                                <span class="menu-icon">🪑</span> ${f.name}
                                <div class="menu-subtitle">${f.type}</div>
                            </button>
                        `).join('')}
                    </div>
                    
                    <button class="menu-btn menu-btn-cancel" data-action="cancel">
                        <span class="menu-icon">✕</span> Cancel
                    </button>
                </div>
            `;
            
            overlay.appendChild(menu);
            document.body.appendChild(overlay);
            
            menu.querySelectorAll('[data-furniture-id]').forEach(btn => {
                btn.onclick = async () => {
                    const furnitureId = btn.dataset.furnitureId;
                    document.body.removeChild(overlay);
                    await this.addObjectToFurniture(objectId, furnitureId);
                };
            });
            
            menu.querySelector('[data-action="cancel"]').onclick = () => {
                document.body.removeChild(overlay);
            };
            
            overlay.onclick = (e) => {
                if (e.target === overlay) document.body.removeChild(overlay);
            };
        }

        /**
         * Add object to furniture
         */
        async addObjectToFurniture(objectId, furnitureId) {
            try {
                console.log(`🪑 Adding object ${objectId} to furniture ${furnitureId}`);
                
                if (!this.app.furnitureManager) {
                    throw new Error('Furniture manager not available');
                }
                
                // Call the actual furniture manager method
                const slotIndex = await this.app.furnitureManager.addObjectToFurniture(
                    furnitureId,
                    objectId,
                    true  // skipAutoSort - don't rearrange existing objects
                );
                
                if (slotIndex >= 0) {
                    const furniture = this.app.furnitureManager.storageManager.getFurniture(furnitureId);
                    const furnitureName = furniture ? furniture.name : 'furniture';
                    this.showToast(`Added to ${furnitureName}`, 'success');
                } else {
                    this.showToast('Furniture is full', 'warning');
                }
            } catch (error) {
                console.error('Error adding to furniture:', error);
                this.showToast(`Error: ${error.message}`, 'error');
            }
        }

        /**
         * Helper: Detect object type
         */
        detectObjectType(object) {
            if (!object || !object.userData) return 'unknown';
            
            if (object.userData.isFurniture || object.userData.type === 'furniture') {
                return 'furniture';
            }
            
            return object.userData.type || 'object';
        }

        /**
         * Helper: Get object name
         */
        getObjectName(object) {
            if (!object || !object.userData) return 'Unknown';
            
            return object.userData.furnitureName || 
                   object.userData.fileName || 
                   object.userData.name || 
                   object.name || 
                   'Unknown Object';
        }

        /**
         * Helper: Get object ID
         */
        getObjectId(object) {
            if (!object || !object.userData) return null;
            
            // Return the object's own ID, NOT the furnitureId (which is just location metadata)
            return object.userData.id || object.uuid;
        }

        /**
         * Helper: Check if current world supports vertical movement
         */
        supportsVerticalMovement() {
            try {
                const worldType = (this.app.currentWorldTemplate && this.app.currentWorldTemplate.getType) 
                    ? this.app.currentWorldTemplate.getType() 
                    : 'green-plane';
                return ['space', 'ocean', 'forest', 'cave'].includes(worldType);
            } catch {
                return false;
            }
        }

        /**
         * Helper: Capture object state for undo
         */
        async captureObjectState(objectId) {
            // TODO: Implement state capture
            return { id: objectId };
        }

        /**
         * Helper: Restore object from undo
         */
        async restoreObject(deletionData) {
            // TODO: Implement object restoration
            console.log('Restoring object:', deletionData);
        }

        /**
         * Create overlay background
         */
        createOverlay() {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
            `;
            return overlay;
        }

        /**
         * Create menu container
         */
        createMenuContainer() {
            const menu = document.createElement('div');
            menu.style.cssText = `
                background: white;
                border-radius: 12px;
                min-width: 320px;
                max-width: 400px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                animation: slideUp 0.3s ease;
            `;
            return menu;
        }

        /**
         * Add menu styles to document
         */
        addMenuStyles() {
            if (document.getElementById('browser-menu-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'browser-menu-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .menu-btn {
                    width: 100%;
                    padding: 12px 15px;
                    margin: 5px 0;
                    background: #f8f9fa;
                    color: #333;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    text-align: left;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    flex-direction: column;
                }
                
                .menu-btn:hover {
                    background: #e9ecef;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .menu-btn-danger {
                    background: #fff5f5;
                    color: #dc3545;
                    border-color: #dc3545;
                }
                
                .menu-btn-danger:hover {
                    background: #ffe5e5;
                }
                
                .menu-btn-cancel {
                    background: #6c757d;
                    color: white;
                    border-color: #6c757d;
                }
                
                .menu-btn-cancel:hover {
                    background: #5a6268;
                }
                
                .menu-icon {
                    font-size: 18px;
                    margin-right: 8px;
                }
                
                .menu-subtitle {
                    font-size: 11px;
                    color: #666;
                    margin-top: 2px;
                }
            `;
            document.head.appendChild(style);
        }

        /**
         * Show toast notification
         */
        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            const colors = {
                info: '#3498db',
                success: '#2ecc71',
                error: '#e74c3c',
                warning: '#f39c12'
            };
            
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: ${colors[type]};
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10001;
                animation: slideUp 0.3s ease;
                font-size: 14px;
                max-width: 300px;
            `;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => document.body.removeChild(toast), 300);
            }, 3000);
        }

        /**
         * Find object in scene by ID
         */
        findObjectInScene(objectId) {
            // Try using furnitureManager's findObjectById method
            if (this.app.furnitureManager) {
                const object = this.app.furnitureManager.findObjectById(objectId);
                if (object) return object;
            }
            
            // Fallback: Search through stateManager fileObjects
            if (this.app.stateManager && this.app.stateManager.fileObjects) {
                const object = this.app.stateManager.fileObjects.find(obj => 
                    obj.userData.id === objectId || 
                    obj.userData.fileId === objectId
                );
                if (object) return object;
            }
            
            // Last resort: Traverse entire scene
            if (this.app.scene) {
                let foundObject = null;
                this.app.scene.traverse((child) => {
                    if (child.userData && (child.userData.id === objectId || child.userData.fileId === objectId)) {
                        foundObject = child;
                    }
                });
                return foundObject;
            }
            
            return null;
        }

        /**
         * Show Add Content Menu (main menu for adding content to world)
         */
        showAddContentMenu() {
            const overlay = this.createOverlay();
            const menu = this.createMenuContainer();
            
            menu.innerHTML = `
                <div style="padding: 20px;">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <div style="background: rgba(76, 175, 80, 0.15); padding: 8px; border-radius: 8px; margin-right: 12px;">
                            <span style="font-size: 20px;">➕</span>
                        </div>
                        <h3 style="margin: 0; color: #333; font-size: 18px;">Add Content</h3>
                    </div>
                    
                    <div style="color: #999; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin: 15px 0 8px 0;">ADD MEDIA</div>
                    
                    <button class="menu-btn" data-action="addLink">
                        <div style="display: flex; align-items: center; width: 100%;">
                            <span class="menu-icon">🔗</span>
                            <div style="flex: 1;">
                                <div>Paste Link/URL</div>
                                <div class="menu-subtitle">Add YouTube, Spotify, or any link</div>
                            </div>
                        </div>
                    </button>
                    
                    <div style="color: #999; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin: 15px 0 8px 0;">ADD/EDIT PLAYLISTS</div>
                    
                    <button class="menu-btn" data-action="addFurniture">
                        <div style="display: flex; align-items: center; width: 100%;">
                            <span class="menu-icon">🪑</span>
                            <div style="flex: 1;">
                                <div>Create Furniture</div>
                                <div class="menu-subtitle">Bookshelf, gallery wall, or stage</div>
                            </div>
                        </div>
                    </button>
                    
                    <div style="height: 1px; background: #ddd; margin: 15px 0;"></div>
                    
                    <button class="menu-btn menu-btn-cancel" data-action="cancel">
                        <span class="menu-icon">✕</span> Cancel
                    </button>
                </div>
            `;
            
            this.addMenuStyles();
            overlay.appendChild(menu);
            document.body.appendChild(overlay);
            
            menu.querySelector('[data-action="addLink"]').onclick = () => {
                document.body.removeChild(overlay);
                this.showAddLinkDialog();
            };
            
            menu.querySelector('[data-action="addFurniture"]').onclick = () => {
                document.body.removeChild(overlay);
                this.showAddFurnitureDialog();
            };
            
            menu.querySelector('[data-action="cancel"]').onclick = () => {
                document.body.removeChild(overlay);
            };
            
            overlay.onclick = (e) => {
                if (e.target === overlay) document.body.removeChild(overlay);
            };
        }
        
        /**
         * Show Add Furniture Dialog
         */
        showAddFurnitureDialog() {
            const overlay = this.createOverlay();
            const menu = this.createMenuContainer();
            
            const furnitureTypes = [
                { id: 'bookshelf', name: 'Bookshelf', icon: '📚', capacity: 10 },
                { id: 'gallery-wall', name: 'Gallery Wall', icon: '🖼️', capacity: 8 },
                { id: 'riser', name: 'Riser', icon: '📐', capacity: 6 },
                { id: 'stage-small', name: 'Small Stage', icon: '🎭', capacity: 4 },
                { id: 'stage-large', name: 'Large Stage', icon: '🎪', capacity: 8 }
            ];
            
            menu.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 5px 0; color: #333; font-size: 18px;">Create Furniture</h3>
                    <div style="color: #666; font-size: 12px; margin-bottom: 15px;">Select type and name your furniture</div>
                    
                    <label style="display: block; color: #666; font-size: 12px; margin-bottom: 5px;">Furniture Name</label>
                    <input type="text" id="furnitureName" placeholder="My Playlist" 
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; box-sizing: border-box; font-size: 14px;" />
                    
                    <label style="display: block; color: #666; font-size: 12px; margin-bottom: 8px;">Furniture Type</label>
                    <div style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;">
                        ${furnitureTypes.map(f => `
                            <button class="menu-btn furniture-type-btn" data-type="${f.id}">
                                <div style="display: flex; align-items: center; width: 100%;">
                                    <span style="font-size: 24px; margin-right: 12px;">${f.icon}</span>
                                    <div style="flex: 1; text-align: left;">
                                        <div style="font-weight: 600;">${f.name}</div>
                                        <div class="menu-subtitle">Capacity: ${f.capacity} items</div>
                                    </div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                    
                    <button class="menu-btn menu-btn-cancel" data-action="cancel">
                        <span class="menu-icon">✕</span> Cancel
                    </button>
                </div>
            `;
            
            this.addMenuStyles();
            overlay.appendChild(menu);
            document.body.appendChild(overlay);
            
            const nameInput = menu.querySelector('#furnitureName');
            
            menu.querySelectorAll('.furniture-type-btn').forEach(btn => {
                btn.onclick = async () => {
                    const type = btn.dataset.type;
                    const name = nameInput.value.trim() || `My ${btn.textContent.trim().split('\\n')[0]}`;
                    
                    document.body.removeChild(overlay);
                    await this.createFurniture(type, name);
                };
            });
            
            menu.querySelector('[data-action="cancel"]').onclick = () => {
                document.body.removeChild(overlay);
            };
            
            overlay.onclick = (e) => {
                if (e.target === overlay) document.body.removeChild(overlay);
            };
        }
        
        /**
         * Create furniture
         */
        async createFurniture(type, name) {
            try {
                if (!this.app.furnitureManager) {
                    throw new Error('Furniture manager not available');
                }
                
                // Get camera position to spawn near player
                let x = 0, y = 0, z = -5;
                if (this.app.cameraControls && this.app.cameraControls.camera) {
                    const cameraPos = this.app.cameraControls.camera.position;
                    const cameraDir = new THREE.Vector3();
                    this.app.cameraControls.camera.getWorldDirection(cameraDir);
                    
                    // Spawn 5 units in front of camera
                    x = cameraPos.x + cameraDir.x * 5;
                    y = 0;  // Ground level
                    z = cameraPos.z + cameraDir.z * 5;
                }
                
                const config = {
                    type: type,
                    name: name,
                    x: x,
                    y: y,
                    z: z
                };
                
                console.log('🪑 Creating furniture:', config);
                const furniture = await this.app.furnitureManager.createFurniture(config);
                
                if (furniture) {
                    this.showToast(`Created ${name}`, 'success');
                } else {
                    this.showToast('Failed to create furniture', 'error');
                }
            } catch (error) {
                console.error('Error creating furniture:', error);
                this.showToast(`Error: ${error.message}`, 'error');
            }
        }
        
        /**
         * Show Add Link Dialog
         */
        showAddLinkDialog() {
            const overlay = this.createOverlay();
            const menu = this.createMenuContainer();
            
            menu.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 5px 0; color: #333; font-size: 18px;">Add Link/URL</h3>
                    <div style="color: #666; font-size: 12px; margin-bottom: 15px;">Paste any link or URL</div>
                    
                    <label style="display: block; color: #666; font-size: 12px; margin-bottom: 5px;">URL</label>
                    <input type="text" id="linkUrl" placeholder="https://youtube.com/watch?v=..." 
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; box-sizing: border-box; font-size: 14px;" />
                    
                    <label style="display: block; color: #666; font-size: 12px; margin-bottom: 5px;">Title (optional)</label>
                    <input type="text" id="linkTitle" placeholder="My Video" 
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; box-sizing: border-box; font-size: 14px;" />
                    
                    <button class="menu-btn" data-action="add" style="background: #4CAF50; color: white; border-color: #4CAF50;">
                        <span class="menu-icon">➕</span> Add Link
                    </button>
                    
                    <button class="menu-btn menu-btn-cancel" data-action="cancel">
                        <span class="menu-icon">✕</span> Cancel
                    </button>
                </div>
            `;
            
            this.addMenuStyles();
            overlay.appendChild(menu);
            document.body.appendChild(overlay);
            
            const urlInput = menu.querySelector('#linkUrl');
            const titleInput = menu.querySelector('#linkTitle');
            
            menu.querySelector('[data-action="add"]').onclick = async () => {
                const url = urlInput.value.trim();
                const title = titleInput.value.trim();
                
                if (!url) {
                    this.showToast('Please enter a URL', 'warning');
                    return;
                }
                
                document.body.removeChild(overlay);
                await this.createLinkObject(url, title);
            };
            
            menu.querySelector('[data-action="cancel"]').onclick = () => {
                document.body.removeChild(overlay);
            };
            
            overlay.onclick = (e) => {
                if (e.target === overlay) document.body.removeChild(overlay);
            };
            
            // Auto-focus URL input
            setTimeout(() => urlInput.focus(), 100);
        }
        
        /**
         * Create link object
         */
        async createLinkObject(url, title) {
            try {
                // Detect platform from URL
                let type = 'link';
                let detectedTitle = title;
                
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    type = 'youtube';
                    if (!detectedTitle) detectedTitle = 'YouTube Video';
                } else if (url.includes('spotify.com')) {
                    type = 'spotify';
                    if (!detectedTitle) detectedTitle = 'Spotify Track';
                } else if (url.includes('deezer.com')) {
                    type = 'deezer';
                    if (!detectedTitle) detectedTitle = 'Deezer Track';
                } else if (url.includes('tiktok.com')) {
                    type = 'tiktok';
                    if (!detectedTitle) detectedTitle = 'TikTok Video';
                } else if (url.includes('instagram.com')) {
                    type = 'instagram';
                    if (!detectedTitle) detectedTitle = 'Instagram Post';
                } else {
                    if (!detectedTitle) detectedTitle = 'Link';
                }
                
                // Get camera position to spawn near player
                let x = 0, y = 1.5, z = -5;
                if (this.app.cameraControls && this.app.cameraControls.camera) {
                    const cameraPos = this.app.cameraControls.camera.position;
                    const cameraDir = new THREE.Vector3();
                    this.app.cameraControls.camera.getWorldDirection(cameraDir);
                    
                    // Spawn 3 units in front of camera at eye level
                    x = cameraPos.x + cameraDir.x * 3;
                    y = 1.5;  // Eye level
                    z = cameraPos.z + cameraDir.z * 3;
                }
                
                // Use search result system to create link object
                if (window.handleSearchResultSelectionJS) {
                    console.log('🔗 Creating link object:', { url, title: detectedTitle, type });
                    
                    // Create search result object
                    const searchResult = {
                        id: `link_${Date.now()}`,
                        title: detectedTitle,
                        url: url,
                        thumbnail: '',  // TODO: Could fetch thumbnails
                        platform: type,
                        duration: '',
                        views: ''
                    };
                    
                    // Add to world using existing system
                    await window.handleSearchResultSelectionJS(
                        JSON.stringify(searchResult),
                        x,
                        y,
                        z
                    );
                    
                    this.showToast(`Added ${detectedTitle}`, 'success');
                } else {
                    this.showToast('Link creation not available', 'error');
                }
            } catch (error) {
                console.error('Error creating link:', error);
                this.showToast(`Error: ${error.message}`, 'error');
            }
        }
        
        /**
         * Show World Selection Dialog
         */
        showWorldSelectionDialog() {
            const overlay = this.createOverlay();
            const menu = this.createMenuContainer();
            
            // Free world templates (no premium worlds in browser version)
            const worlds = [
                { id: 'green-plane', name: 'Green Plane', icon: '🌱', description: 'Classic outdoor landscape' },
                { id: 'space', name: 'Space', icon: '🌌', description: 'Zero gravity environment' },
                { id: 'ocean', name: 'Ocean', icon: '🌊', description: 'Underwater world' },
                { id: 'record-store', name: 'Record Store', icon: '💿', description: 'Cozy music shop' },
                { id: 'music-festival', name: 'Music Festival', icon: '🎵', description: 'Evening outdoor concert atmosphere' },
                { id: 'modern-gallery-clean', name: 'Gallery (Clean)', icon: '🖼️', description: 'Minimal white space with purple accents' },
                { id: 'modern-gallery-dark', name: 'Gallery (Dark)', icon: '🎨', description: 'Sophisticated charcoal with warm lighting' },
                { id: 'modern-gallery-warm', name: 'Gallery (Warm)', icon: '🌸', description: 'Elegant blush and warm neutrals' },
                { id: 'future-car-gallery', name: 'Car Gallery', icon: '🚗', description: 'Sleek automotive-inspired space' }
            ];
            
            // Get current world type from world template
            const currentWorld = (this.app.currentWorldTemplate && this.app.currentWorldTemplate.getType) 
                ? this.app.currentWorldTemplate.getType() 
                : 'green-plane';
            
            menu.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 5px 0; color: #333; font-size: 18px;">Switch World</h3>
                    <div style="color: #666; font-size: 12px; margin-bottom: 15px;">Choose your 3D environment</div>
                    
                    <div style="max-height: 400px; overflow-y: auto; margin-bottom: 15px;">
                        ${worlds.map(w => `
                            <button class="menu-btn world-btn" data-world="${w.id}" ${w.id === currentWorld ? 'disabled' : ''}>
                                <div style="display: flex; align-items: center; width: 100%;">
                                    <span style="font-size: 32px; margin-right: 12px;">${w.icon}</span>
                                    <div style="flex: 1; text-align: left;">
                                        <div style="font-weight: 600; font-size: 15px;">${w.name}</div>
                                        <div class="menu-subtitle">${w.description}</div>
                                        ${w.id === currentWorld ? '<div style="color: #4CAF50; font-size: 11px; margin-top: 2px;">✓ Current World</div>' : ''}
                                    </div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                    
                    <button class="menu-btn menu-btn-cancel" data-action="cancel">
                        <span class="menu-icon">✕</span> Cancel
                    </button>
                </div>
            `;
            
            this.addMenuStyles();
            overlay.appendChild(menu);
            document.body.appendChild(overlay);
            
            menu.querySelectorAll('.world-btn').forEach(btn => {
                if (!btn.disabled) {
                    btn.onclick = async () => {
                        const worldId = btn.dataset.world;
                        document.body.removeChild(overlay);
                        await this.switchWorld(worldId);
                    };
                }
            });
            
            menu.querySelector('[data-action="cancel"]').onclick = () => {
                document.body.removeChild(overlay);
            };
            
            overlay.onclick = (e) => {
                if (e.target === overlay) document.body.removeChild(overlay);
            };
        }
        
        /**
         * Switch to a different world
         */
        async switchWorld(worldId) {
            try {
                if (!window.switchWorldTemplate) {
                    this.showToast('World switching not available', 'error');
                    return;
                }
                
                console.log(`🌍 Switching to world: ${worldId}`);
                this.showToast('Switching world...', 'info');
                
                // Call global world switch function
                await window.switchWorldTemplate(worldId);
                
                // Success message
                const worldNames = {
                    'green-plane': 'Green Plane',
                    'space': 'Space',
                    'ocean': 'Ocean',
                    'record-store': 'Record Store'
                };
                
                this.showToast(`Switched to ${worldNames[worldId] || worldId}`, 'success');
                
            } catch (error) {
                console.error('Error switching world:', error);
                this.showToast(`Error: ${error.message}`, 'error');
            }
        }

        /**
         * Show toast with undo button
         */
        showToastWithUndo(message, undoCallback) {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #333;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10001;
                animation: slideUp 0.3s ease;
                font-size: 14px;
                max-width: 300px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;
            
            toast.innerHTML = `
                <span>${message}</span>
                <button style="background: #007AFF; color: white; border: none; padding: 5px 15px; border-radius: 4px; margin-left: 15px; cursor: pointer; font-size: 12px;">UNDO</button>
            `;
            
            document.body.appendChild(toast);
            
            toast.querySelector('button').onclick = () => {
                undoCallback();
                document.body.removeChild(toast);
            };
            
            setTimeout(() => {
                toast.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    if (toast.parentNode) document.body.removeChild(toast);
                }, 300);
            }, 5000);
        }
    }

    // Export to window
    window.BrowserMenuHandler = BrowserMenuHandler;
    console.log('✅ BrowserMenuHandler loaded successfully');

})();
