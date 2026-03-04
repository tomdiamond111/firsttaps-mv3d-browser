// modules/objects/virtualObjectManager.js
// Dependencies: THREE (global), window.VirtualObjectCreator
// Exports: window.VirtualObjectManager

(function() {
    'use strict';
    
    console.log("Loading VirtualObjectManager module...");
    
    // ============================================================================
    // VIRTUAL OBJECT LIFECYCLE MANAGEMENT
    // ============================================================================
    class VirtualObjectManager {
        constructor(THREE, scene, stateManager) {
            this.THREE = THREE;
            this.scene = scene;
            this.stateManager = stateManager;
            this.virtualObjectCreator = new window.VirtualObjectCreator(THREE);
            
            // Track virtual objects
            this.virtualObjects = new Map(); // packageName -> object
            this.appObjects = new Map(); // packageName -> object
            this.appStacks = new Map(); // stackId -> group
            
            console.log('VirtualObjectManager initialized');
        }

        // Add app objects to the scene
        addAppObjects(apps, startPosition = { x: 0, y: 0, z: 0 }) {
            console.log('Adding', apps.length, 'app objects to scene');
            
            const addedObjects = [];
            
            apps.forEach((appData, index) => {
                try {
                    // Look up persisted position like regular file objects do
                    let position = { x: 0, y: 0, z: 0 };
                    
                    // Check if app object has persisted position data (check for null, not just undefined)
                    const hasPersistedPosition = (appData.x != null && appData.z != null);
                    
                    if (hasPersistedPosition) {
                        // Use persisted position like regular file objects
                        position.x = appData.x;
                        position.z = appData.z;
                        
                        // For Y position, preserve stacked positions or start at ground level
                        // Calculate expected ground Y dynamically based on object geometry
                        let expectedGroundY = this.calculateExpectedGroundY(appData);
                        
                        const wasOriginallyStacked = appData.y && appData.y > (expectedGroundY + 0.1);
                        
                        if (wasOriginallyStacked) {
                            position.y = appData.y; // Preserve original Y for stacking calculation
                            console.log(`App ${appData.name}: Using persisted stacked position Y=${appData.y}`);
                        } else {
                            position.y = 0; // Start at ground level, proper Y will be calculated by positioning logic
                            console.log(`App ${appData.name}: Using persisted XZ position (${appData.x}, ${appData.z}), Y will be recalculated`);
                        }
                        
                        console.log(`App ${appData.name}: Using persisted position:`, {x: position.x, y: position.y, z: position.z});
                    } else {
                        // Use calculated position from app data or default spacing
                        position = appData.position || {
                            x: startPosition.x + (index * 3), // Space apps apart
                            y: startPosition.y,
                            z: startPosition.z
                        };
                        console.log(`App ${appData.name}: Using calculated position:`, position);
                    }
                    
                    // Create app object
                    const appObject = this.virtualObjectCreator.createAppObject(appData, position);
                    
                    // Apply positioning fixes for new apps without persisted positions
                    if (!hasPersistedPosition) {
                        console.log(`New app object with no persisted position, applying full positioning to: ${appData.name}`);
                        if (window.applyAllFixesToObject) {
                            window.applyAllFixesToObject(appObject, appData, false);
                        }
                    }
                    
                    // FURNITURE SEATING: If app object has furniture metadata, set preservePosition IMMEDIATELY
                    if (appData.furnitureId) {
                        appObject.userData.furnitureId = appData.furnitureId;
                        appObject.userData.furnitureSlotIndex = appData.furnitureSlotIndex;
                        appObject.userData.preservePosition = true;
                        
                        if (window.FileObjectDebugChannel) {
                            window.FileObjectDebugChannel.postMessage(`✅ APP FURNITURE APPLIED: "${appData.name}" → preservePosition=true, furnitureId="${appData.furnitureId}", slot=${appData.furnitureSlotIndex}`);
                        }
                        
                        console.log(`🪑 App object ${appData.name} loaded with furniture seating: ${appData.furnitureId} slot ${appData.furnitureSlotIndex} - preservePosition set to prevent gravity`);
                    }
                    
                    // Add to scene
                    this.scene.add(appObject);
                    
                    // Track the object
                    const packageName = appData.packageName || appData.id;
                    this.appObjects.set(packageName, appObject);
                    this.virtualObjects.set(packageName, appObject);
                    
                    // Add to state manager if available
                    if (this.stateManager && this.stateManager.fileObjects) {
                        this.stateManager.fileObjects.push(appObject);
                        console.log(`DEBUG: Added app object ${appData.name} to fileObjects with ID: ${appObject.userData.id}`);
                        console.log(`DEBUG: fileObjects array now has ${this.stateManager.fileObjects.length} objects`);
                    } else {
                        console.error(`DEBUG: Cannot add app object to fileObjects - stateManager: ${!!this.stateManager}, fileObjects: ${!!(this.stateManager && this.stateManager.fileObjects)}`);
                    }
                    
                    addedObjects.push(appObject);
                    
                    console.log('Added app object:', appData.name, 'at position:', position);
                } catch (error) {
                    console.error('Error adding app object:', appData.name, error);
                }
            });
            
            console.log('Successfully added', addedObjects.length, 'app objects');
            return addedObjects;
        }

        // Remove app object from scene
        removeAppObject(packageName) {
            const appObject = this.appObjects.get(packageName);
            if (appObject) {
                this.scene.remove(appObject);
                this.appObjects.delete(packageName);
                this.virtualObjects.delete(packageName);
                
                // Remove from state manager
                if (this.stateManager && this.stateManager.fileObjects) {
                    const index = this.stateManager.fileObjects.indexOf(appObject);
                    if (index !== -1) {
                        this.stateManager.fileObjects.splice(index, 1);
                    }
                }
                
                console.log('Removed app object:', packageName);
                return true;
            }
            return false;
        }

        // Get app object by package name
        getAppObject(packageName) {
            return this.appObjects.get(packageName);
        }

        // Get all app objects
        getAllAppObjects() {
            return Array.from(this.appObjects.values());
        }

        // Handle app object interaction (e.g., double-tap to launch)
        handleAppObjectInteraction(appObject, interactionType = 'tap') {
            if (!appObject || !appObject.userData || !appObject.userData.isApp) {
                return false;
            }
            
            const packageName = appObject.userData.packageName;
            const appName = appObject.userData.appName;
            
            console.log(`App object interaction: ${interactionType} on ${appName} (${packageName})`);
            
            switch (interactionType) {
                case 'tap':
                    this.highlightAppObject(appObject);
                    break;
                case 'double-tap':
                case 'launch':
                    this.launchApp(packageName, appName);
                    break;
                case 'long-press':
                    this.showAppContextMenu(appObject);
                    break;
                default:
                    console.log('Unknown interaction type:', interactionType);
                    break;
            }
            
            return true;
        }

        // Highlight app object
        highlightAppObject(appObject) {
            // Reset all app objects to normal state
            this.getAllAppObjects().forEach(obj => {
                this.virtualObjectCreator.updateAppObjectState(obj, 'normal');
            });
            
            // Highlight the selected app
            this.virtualObjectCreator.updateAppObjectState(appObject, 'highlighted');
            
            console.log('Highlighted app:', appObject.userData.appName);
        }

        // Launch app via communication with Dart
        launchApp(packageName, appName) {
            console.log('Launching app:', appName, packageName);
            
            // Update app object state to launching
            const appObject = this.appObjects.get(packageName);
            if (appObject) {
                this.virtualObjectCreator.updateAppObjectState(appObject, 'launching');
                
                // Reset state after animation
                setTimeout(() => {
                    this.virtualObjectCreator.updateAppObjectState(appObject, 'normal');
                }, 1000);
            }
            
            // Send launch request to Dart
            this.sendLaunchRequest(packageName, appName);
        }

        // Send launch request to Dart side
        sendLaunchRequest(packageName, appName) {
            try {
                // Use the communication channel established in the main app
                if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                    window.flutter_inappwebview.callHandler('launchApp', {
                        packageName: packageName,
                        appName: appName
                    });
                } else {
                    console.warn('Flutter communication channel not available');
                }
            } catch (error) {
                console.error('Error sending launch request:', error);
            }
        }

        // Show app context menu (for future expansion)
        showAppContextMenu(appObject) {
            console.log('Showing context menu for app:', appObject.userData.appName);
            // This could be expanded to show options like "Remove from favorites", "App info", etc.
        }

        // Group apps into stacks based on category
        createAppStacks(apps, groupByCategory = true) {
            if (!groupByCategory) {
                return this.addAppObjects(apps);
            }
            
            // Group apps by category
            const categories = {};
            apps.forEach(app => {
                const category = app.category || 'default';
                if (!categories[category]) {
                    categories[category] = [];
                }
                categories[category].push(app);
            });
            
            // Create stacks for each category
            const stacks = [];
            let positionOffset = 0;
            
            Object.keys(categories).forEach(category => {
                const categoryApps = categories[category];
                const stackPosition = { x: positionOffset, y: 0, z: 0 };
                
                if (categoryApps.length > 1) {
                    // Create stack for multiple apps
                    const stack = this.virtualObjectCreator.createAppStack(categoryApps, stackPosition);
                    this.scene.add(stack);
                    this.appStacks.set(`${category}-stack`, stack);
                    stacks.push(stack);
                } else {
                    // Single app
                    const appObject = this.virtualObjectCreator.createCategorizedAppObject(
                        categoryApps[0], 
                        category, 
                        stackPosition
                    );
                    this.scene.add(appObject);
                    this.appObjects.set(categoryApps[0].packageName, appObject);
                    stacks.push(appObject);
                }
                
                positionOffset += 4; // Space between categories
            });
            
            return stacks;
        }

        // Update virtual object positions (for sorting/arrangement)
        updateVirtualObjectPositions(objects, positions) {
            objects.forEach((obj, index) => {
                if (positions[index] && obj.userData && obj.userData.isApp) {
                    obj.position.set(positions[index].x, positions[index].y, positions[index].z);
                    
                    // Update user data
                    if (obj.userData.fileData) {
                        obj.userData.fileData.x = positions[index].x;
                        obj.userData.fileData.y = positions[index].y;
                        obj.userData.fileData.z = positions[index].z;
                    }
                }
            });
        }

        // Get virtual object statistics
        getStatistics() {
            return {
                totalVirtualObjects: this.virtualObjects.size,
                totalAppObjects: this.appObjects.size,
                totalAppStacks: this.appStacks.size,
                objectsByCategory: this.getObjectsByCategory()
            };
        }

        // Get objects grouped by category
        getObjectsByCategory() {
            const categories = {};
            this.appObjects.forEach(obj => {
                const category = obj.userData.category || 'default';
                if (!categories[category]) {
                    categories[category] = [];
                }
                categories[category].push(obj);
            });
            return categories;
        }

        // Clear all virtual objects
        clearAllVirtualObjects() {
            // Remove app objects
            this.appObjects.forEach(obj => {
                this.scene.remove(obj);
            });
            this.appObjects.clear();
            
            // Remove app stacks
            this.appStacks.forEach(stack => {
                this.scene.remove(stack);
            });
            this.appStacks.clear();
            
            // Clear virtual objects map
            this.virtualObjects.clear();
            
            console.log('Cleared all virtual objects');
        }

        // Update state manager reference
        setStateManager(stateManager) {
            this.stateManager = stateManager;
        }

        // Calculate expected ground Y position based on object geometry
        calculateExpectedGroundY(appData) {
            // Create a temporary object to get its actual geometry height
            try {
                const tempObject = this.virtualObjectCreator.createAppObject(appData, { x: 0, y: 0, z: 0 });
                
                // Calculate bounding box to get actual height
                const box = new this.THREE.Box3().setFromObject(tempObject);
                const height = box.max.y - box.min.y;
                
                // Clean up temporary object
                tempObject.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
                
                // Return center Y position (half the height)
                const centerY = height / 2;
                console.log(`Dynamic height calculation for ${appData.name || appData.id}: height=${height}, centerY=${centerY}`);
                return centerY;
                
            } catch (error) {
                console.warn(`Error calculating dynamic height for ${appData.name || appData.id}, using fallback:`, error);
                
                // Fallback logic based on object type with CORRECT heights
                if (appData.url) {
                    // Link objects: use 16:9 geometry height (2.53125 / 2)
                    return 2.53125 / 2; // ~1.266
                } else {
                    // Regular app objects: use app geometry height (3.796875 / 2)  
                    return 3.796875 / 2; // ~1.898
                }
            }
        }

        // Get debug info
        getDebugInfo() {
            return {
                statistics: this.getStatistics(),
                appObjects: Array.from(this.appObjects.entries()).map(([key, obj]) => ({
                    packageName: key,
                    name: obj.userData.appName,
                    position: obj.position,
                    visible: obj.visible
                }))
            };
        }
    }

    // Export the class
    window.VirtualObjectManager = VirtualObjectManager;
    console.log("VirtualObjectManager module loaded successfully");
})();
