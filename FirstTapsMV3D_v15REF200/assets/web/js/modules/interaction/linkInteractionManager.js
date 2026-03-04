/**
 * Link Interaction Manager
 * Handles interactions with link objects (double-tap to open, visual feedback, etc.)
 */

class LinkInteractionManager {
    constructor(app, cameraFocusManager) {
        this.app = app;
        this.cameraFocusManager = cameraFocusManager;
        this.isInitialized = false;
        
        console.log('🔗 LinkInteractionManager: Initializing...');
        this.initialize();
    }

    initialize() {
        if (this.isInitialized) {
            console.log('🔗 LinkInteractionManager: Already initialized');
            return;
        }

        // Hook into the existing interaction system
        this.setupLinkInteractions();
        this.isInitialized = true;
        
        console.log('🔗 LinkInteractionManager: Initialized successfully');
    }

    setupLinkInteractions() {
        // We'll extend the existing double-tap handler to detect link objects
        // The app already has a double-tap system, we just need to check for link objects
        console.log('🔗 LinkInteractionManager: Setting up link interactions');
        
        // Store reference to original double-click handler if it exists
        if (this.app.interactionManager && this.app.interactionManager.handleObjectDoubleClick) {
            this.originalDoubleClickHandler = this.app.interactionManager.handleObjectDoubleClick.bind(this.app.interactionManager);
            
            // Override the double-click handler
            this.app.interactionManager.handleObjectDoubleClick = (object, fromExploreControls = false) => {
                console.log('🔗 LinkInteractionManager: Double-click detected on:', object.userData?.fileName || object.name);
                
                // CRITICAL: Check if we're in explore mode first, BUT allow ExploreControls to bypass this check
                const exploreManager = this.app.exploreManager || window.exploreManager;
                if (exploreManager && exploreManager.exploreMode && exploreManager.exploreMode.isActive && !fromExploreControls) {
                    console.log('🔗 LinkInteractionManager: In explore mode - skipping standard handlers (ExploreControls will handle)');
                    return; // Let ExploreControls handle all interactions in explore mode
                }
                
                // Check if this is a furniture object - use FILE ZONE pattern (2-stage behavior)
                if (object.userData && (object.userData.isFurniture || object.userData.type === 'furniture')) {
                    console.log('🪑 LinkInteractionManager: Furniture double-tap detected (file zone pattern)');
                    console.log('🪑 Clicked object type:', object.type, 'name:', object.name);
                    
                    // Find the TOP-LEVEL furniture GROUP (not just userData match, must be a Group)
                    let furnitureGroup = object;
                    
                    // Walk up tree until we find a Group with furniture userData
                    while (furnitureGroup) {
                        const isFurnitureGroup = furnitureGroup.type === 'Group' && 
                                                (furnitureGroup.userData?.isFurniture || furnitureGroup.userData?.type === 'furniture');
                        if (isFurnitureGroup) {
                            break; // Found the furniture Group
                        }
                        furnitureGroup = furnitureGroup.parent;
                    }
                    
                    if (furnitureGroup) {
                        console.log('🪑 Found furniture GROUP:', furnitureGroup.type, furnitureGroup.name);
                        
                        // Use FILE ZONE pattern: Check distance and use focusOnObject or enable rotation
                        this.handleFurnitureDoubleClick(furnitureGroup);
                    } else {
                        console.warn('🪑 Could not find furniture GROUP');
                    }
                    return; // Don't pass to original handler
                }
                
                // Check if this is a link object
                if (this.isLinkObject(object)) {
                    console.log('🔗 LinkInteractionManager: Link object detected, handling URL opening');
                    this.handleLinkDoubleClick(object);
                } else if (this.isContactObject(object)) {
                    // Handle contact objects with proper 2-stage behavior
                    console.log('📱 LinkInteractionManager: Contact object detected for 2-stage interaction');
                    console.log('  - Contact ID:', object.userData.contactId);
                    console.log('  - Contact name:', object.userData.fileName);
                    
                    // STAGE 1 vs STAGE 2: Check current distance to determine behavior
                    this.handleContactDoubleClick(object);
                } else if (this.isAppObject(object)) {
                    // CRITICAL FIX: Handle regular app objects (non-link apps)
                    console.log('📱 LinkInteractionManager: Regular app object detected, launching app');
                    this.handleAppDoubleClick(object);
                } else {
                    // Call original handler for all other objects (but only in default mode)
                    console.log('🔗 LinkInteractionManager: Standard object, using original handler');
                    this.originalDoubleClickHandler(object);
                }
            };
            
            console.log('🔗 LinkInteractionManager: Double-click handler extended successfully');
        } else {
            console.warn('🔗 LinkInteractionManager: Could not find existing double-click handler');
        }
    }

    /**
     * Check if an object is a link object
     * Link objects are app objects that have URL data in any of the expected locations
     */
    isLinkObject(object) {
        if (!object || !object.userData || object.userData.type !== 'app') {
            return false;
        }
        
        // Check for URL in fileData
        const hasFileDataUrl = object.userData.fileData && 
                              (object.userData.fileData.url || object.userData.fileData.thumbnailUrl);
        
        // Check for URL directly in userData
        const hasDirectUrl = object.userData.url;
        
        // Check for link-type package name (contains 'link' identifier)
        const isLinkPackage = object.userData.id && object.userData.id.includes('link');
        
        const isLink = hasFileDataUrl || hasDirectUrl || isLinkPackage;
        
        if (isLink) {
            console.log('🔗 LinkInteractionManager: Link object detected');
            console.log('  - FileData URL:', object.userData.fileData?.url);
            console.log('  - FileData thumbnailUrl:', object.userData.fileData?.thumbnailUrl);
            console.log('  - Direct URL:', object.userData.url);
            console.log('  - Is link package:', isLinkPackage);
        }
        
        return isLink;
    }

    /**
     * Check if an object is a contact object
     */
    isContactObject(object) {
        if (!object || !object.userData) {
            return false;
        }
        
        // Enhanced contact detection - multiple approaches for robustness
        const isFileContact = object.userData.type === 'fileObject' && object.userData.subType === 'contact';
        const isDirectContact = object.userData.isContact === true;
        const hasContactId = object.userData.contactId && (object.userData.contactId !== 'unknown');
        const isContactFile = object.userData.fileName && object.userData.fileName.endsWith('.contact');
        
        const isContact = isFileContact || isDirectContact || hasContactId || isContactFile;
        
        if (isContact) {
            console.log('📱 LinkInteractionManager: Contact object detected');
            console.log('  - File contact:', isFileContact);
            console.log('  - Direct contact:', isDirectContact);
            console.log('  - Has contact ID:', hasContactId, object.userData.contactId);
            console.log('  - Contact file:', isContactFile, object.userData.fileName);
            console.log('  - Contact name:', object.userData.fileName);
        }
        
        return isContact;
    }

    /**
     * Check if an object is a regular app object (not a link-based app)
     * Regular apps have type='app' but no URL data
     */
    isAppObject(object) {
        if (!object || !object.userData || object.userData.type !== 'app') {
            return false;
        }
        
        // It's a regular app if it has packageName but no URL
        const hasPackageName = object.userData.packageName && !object.userData.packageName.includes('link');
        const hasNoUrl = !object.userData.url && !object.userData.fileData?.url;
        
        const isRegularApp = hasPackageName && hasNoUrl;
        
        if (isRegularApp) {
            console.log('📱 LinkInteractionManager: Regular app object detected');
            console.log('  - App name:', object.userData.appName);
            console.log('  - Package name:', object.userData.packageName);
        }
        
        return isRegularApp;
    }

    /**
     * Handle double-click on regular app objects
     */
    handleAppDoubleClick(object) {
        console.log('📱 Launching app:', object.userData.appName);
        
        // Use the interaction manager's launchApp functionality
        if (this.app.interactionManager && this.app.interactionManager.launchApp) {
            this.app.interactionManager.launchApp(object);
        } else {
            console.error('📱 LaunchApp functionality not available');
        }
    }

    /**
     * Open native contact app for contact objects
     */
    openNativeContactApp(object) {
        const contactData = {
            id: object.userData.contactId,
            name: object.userData.fileName,
            phoneNumber: object.userData.phoneNumber
        };
        
        console.log('📱 Opening native contact app:', contactData);
        
        // Try multiple channels for opening native contact app
        if (window.ContactActionChannel) {
            console.log('📱 Opening via ContactActionChannel');
            window.ContactActionChannel.postMessage(JSON.stringify(contactData));
            return;
        }
        
        if (window.OpenFileChannel) {
            console.log('📱 Opening via OpenFileChannel (contact mode)');
            const openData = {
                type: 'contact',
                contactId: contactData.id,
                action: 'open',
                phoneNumber: contactData.phoneNumber,
                name: contactData.name
            };
            window.OpenFileChannel.postMessage(JSON.stringify(openData));
            return;
        }
        
        if (window.ObjectActionChannel) {
            console.log('📱 Opening via ObjectActionChannel');
            window.ObjectActionChannel.postMessage(JSON.stringify(contactData));
            return;
        }
        
        // Last resort: try to open contact via intent URL
        if (contactData.phoneNumber) {
            console.log('📱 Opening via tel: intent for:', contactData.phoneNumber);
            try {
                window.open(`tel:${contactData.phoneNumber}`, '_blank');
                return;
            } catch (e) {
                console.warn('Tel intent failed:', e.message);
            }
        }
        
        console.warn('❌ No contact channels available - contact opening failed');
    }

    /**
     * Handle double-click on contact objects with proper 2-stage behavior
     * Stage 1: If far from contact -> move camera close
     * Stage 2: If close to contact -> show contact options menu
     */
    handleContactDoubleClick(object) {
        console.log('📱 LinkInteractionManager: Handling contact double-click with 2-stage behavior');
        
        // Calculate current distance to contact object
        const currentPos = this.app.camera.position.clone();
        const objectWorldPos = new THREE.Vector3();
        object.getWorldPosition(objectWorldPos);
        const distanceToObject = currentPos.distanceTo(objectWorldPos);
        
        // Use same distance threshold as other file objects (matching existing logic)
        const objectSize = this.calculateObjectSize(object);
        const closeDistance = Math.max(objectSize * 3.5, 12); // Same as interactionManager
        
        console.log(`📱 Contact distance: ${distanceToObject.toFixed(2)}, Close threshold: ${closeDistance.toFixed(2)}`);
        
        if (distanceToObject > closeDistance) {
            // STAGE 1: Camera is far - focus on contact object (WITHOUT triggering contact logic)
            console.log('📱 Stage 1: Moving camera close to contact object');
            this.focusOnContactObject(object); // Use our own focusing method that doesn't trigger contact opening
        } else {
            // STAGE 2: Camera is close - show contact options menu
            console.log('📱 Stage 2: Camera is close, showing contact options menu');
            this.showContactOptionsMenu(object);
        }
    }

    /**
     * Focus camera on contact object without triggering contact interaction
     * Use the SAME focusing system as regular objects to ensure consistency
     */
    focusOnContactObject(object) {
        console.log('📱 LinkInteractionManager: Focusing camera on contact object using standard focusing system');
        
        // PRIORITY 1: Use the proven interactionManager.focusOnObject method (same as regular files)
        if (this.app.interactionManager && this.app.interactionManager.focusOnObject) {
            console.log('📱 Using proven interactionManager.focusOnObject (same as file objects)');
            this.app.interactionManager.focusOnObject(object);
            return;
        }
        
        // PRIORITY 2: Use cameraFocusManager as backup
        if (this.cameraFocusManager) {
            console.log('📱 Using cameraFocusManager.focusOnObject as backup');
            this.cameraFocusManager.focusOnObject(object);
            return;
        }
        
        // FALLBACK: Direct camera controls (only if other methods unavailable)
        console.warn('📱 Using direct camera controls fallback for contact focusing');
        const cameraControls = this.app.cameraControls || (window.app && window.app.cameraControls);
        if (cameraControls && this.app.camera) {
            const objectPosition = object.position.clone();
            const objectSize = this.calculateObjectSize(object);
            const optimalDistance = Math.max(objectSize * 2.5, 8);
            
            const currentCameraPos = this.app.camera.position.clone();
            const directionToCamera = currentCameraPos.sub(objectPosition.clone()).normalize();
            
            if (directionToCamera.length() < 0.1) {
                directionToCamera.set(1, 0.5, 1).normalize();
            }
            
            const newCameraPosition = objectPosition.clone().add(
                directionToCamera.multiplyScalar(optimalDistance)
            );
            
            console.log('📱 Direct camera movement:', {
                from: `${this.app.camera.position.x.toFixed(2)}, ${this.app.camera.position.y.toFixed(2)}, ${this.app.camera.position.z.toFixed(2)}`,
                to: `${newCameraPosition.x.toFixed(2)}, ${newCameraPosition.y.toFixed(2)}, ${newCameraPosition.z.toFixed(2)}`,
                lookAt: `${objectPosition.x.toFixed(2)}, ${objectPosition.y.toFixed(2)}, ${objectPosition.z.toFixed(2)}`
            });
            
            cameraControls.setLookAt(
                newCameraPosition.x, newCameraPosition.y, newCameraPosition.z,
                objectPosition.x, objectPosition.y, objectPosition.z,
                true // animate
            );
        } else {
            console.error('📱 No camera controls available for contact focusing');
        }
    }

    /**
     * Show contact options menu (Call Contact, Customize Avatar, Cancel)
     */
    showContactOptionsMenu(object) {
        const contactId = object.userData.contactId || this.extractContactId(object);
        const contactName = object.userData.fileName ? 
            object.userData.fileName.replace('.contact', '') : 'Unknown Contact';
        
        console.log('📱 Showing contact options menu for:', contactName, 'ID:', contactId);
        
        // Use existing ContactOptionsMenu system
        if (window.ContactOptionsMenu) {
            try {
                const contactData = {
                    object: object,
                    name: contactName,
                    id: contactId,
                    phone: object.userData.phoneNumber || object.userData.phone || 'Unknown'
                };
                
                console.log('📱 Using ContactOptionsMenu.showOptionsMenu');
                window.ContactOptionsMenu.showOptionsMenu(contactId, contactData);
                return true;
            } catch (error) {
                console.error('📱 ContactOptionsMenu failed:', error);
            }
        }
        
        // Fallback to ContactCustomizationManager if available
        if (window.ContactCustomizationManager && window.ContactCustomizationManager.instance) {
            try {
                console.log('📱 Fallback: Using ContactCustomizationManager');
                const success = window.ContactCustomizationManager.instance.showCustomizationMenu(contactId, {
                    object: object,
                    name: contactName,
                    id: contactId
                });
                
                if (success !== false) {
                    return true;
                }
            } catch (error) {
                console.error('📱 ContactCustomizationManager fallback failed:', error);
            }
        }
        
        console.warn('📱 No contact options systems available - showing basic alert');
        alert(`Contact: ${contactName}\nOptions not available`);
        return false;
    }

    /**
     * Calculate object size for distance threshold (same logic as interactionManager)
     */
    calculateObjectSize(object) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        return Math.max(size.x, size.y, size.z);
    }

    /**
     * Extract contact ID from object (same logic as interactionManager)
     */
    extractContactId(object) {
        if (!object || !object.userData) return null;
        
        return object.userData.contactId || 
               object.userData.fileId || 
               object.userData.id ||
               null;
    }

    /**
     * Handle furniture double-click using FILE ZONE pattern (2-stage behavior)
     * STAGE 1 (far): Focus camera on furniture using proven focusOnObject
     * STAGE 2 (close): Enable rotation mode with drag listeners
     */
    handleFurnitureDoubleClick(furnitureGroup) {
        console.log('🪑 LinkInteractionManager: Handling furniture double-click (file zone pattern)');
        
        // Calculate current distance to furniture
        const camera = this.app.camera;
        const furniturePos = furnitureGroup.position.clone();
        const cameraDistance = camera.position.distanceTo(furniturePos);
        
        // Use FIXED distance threshold (not size-based) to work for all furniture
        // Large furniture (amphitheatre) was using huge thresholds that didn't work
        const closeDistance = 50; // Fixed threshold - more generous to make controls easier to access
        
        console.log(`🪑 Distance: ${cameraDistance.toFixed(1)} units, Threshold: ${closeDistance.toFixed(1)} units`);
        
        if (cameraDistance > closeDistance) {
            // STAGE 1: Far away - use proven focusOnObject method (clean setLookAt)
            console.log('🪑 STAGE 1: Far from furniture, focusing camera (file zone pattern)');
            this.focusOnFurniture(furnitureGroup);
        } else {
            // STAGE 2: Already close - enable rotation mode
            console.log('🪑 STAGE 2: Close to furniture, enabling rotation mode');
            this.enableFurnitureRotation(furnitureGroup);
        }
    }

    /**
     * Focus camera on furniture using the PROVEN file zone method
     * Uses cameraControls.setLookAt() directly - NO enabled manipulation
     */
    focusOnFurniture(furnitureGroup) {
        const cameraControls = this.app.cameraControls;
        
        if (!cameraControls) {
            console.error('🪑 Cannot focus: camera controls not available');
            return;
        }

        console.log('🪑 Focusing camera on furniture');

        // Get furniture type for specialized positioning
        const furnitureName = (furnitureGroup.userData.fileName || '').toLowerCase();
        const furniturePos = furnitureGroup.position.clone();
        const furnitureRotation = furnitureGroup.rotation.y;
        
        // Check device orientation for responsive positioning
        const aspectRatio = window.innerWidth / window.innerHeight;
        const isLandscape = aspectRatio > 1.2;
        
        // Furniture-type-specific camera positioning
        let distance = 15; // Default distance
        let heightOffset = 2; // Default height above furniture center
        let lookAtOffset = 0; // Vertical offset for look-at point
        
        // Customize based on furniture type
        if (furnitureName.includes('stage')) {
            // Small stage: higher and further back to see objects ON the stage
            distance = 18;
            heightOffset = 4; // Higher camera
            lookAtOffset = 1; // Look at stage surface, not center
        } else if (furnitureName.includes('amphitheatre')) {
            // Amphitheatre: look at lowest tier from further back to see full curve
            // Position camera on OPPOSITE side to face front textures/thumbnails
            distance = -35; // NEGATIVE = opposite side (face front textures)
            heightOffset = 10; // Higher camera for better curve view
            lookAtOffset = -5; // Look at lowest tier center (negative = lower)
        } else if (furnitureName.includes('gallery')) {
            // Gallery wall: centered view with orientation-specific positioning
            if (isLandscape) {
                distance = 11; // Closer in landscape (15 - 4 units)
                heightOffset = 2; // Higher to see top of gallery wall
                lookAtOffset = 3; // Look up at the wall
            } else {
                distance = 17; // Further back in portrait (15 + 2 units)
                heightOffset = 2; // Higher to see top of gallery wall
                lookAtOffset = 3; // Look up at the wall
            }
        } else if (furnitureName.includes('riser')) {
            // Riser: look at tiers with orientation-specific positioning
            if (isLandscape) {
                distance = 11; // Closer in landscape (15 - 4 units)
                heightOffset = 0; // Lower to center vertically
                lookAtOffset = -1; // Look at center tier
            } else {
                distance = 15;
                heightOffset = 0; // Lower to center vertically in portrait
                lookAtOffset = -1; // Look at center tier
            }
        } else if (furnitureName.includes('bookshelf')) {
            // Bookshelf: center on middle shelves with orientation-specific positioning
            if (isLandscape) {
                distance = 11; // Closer in landscape (15 - 4 units)
                heightOffset = 1; // Lower to center vertically
                lookAtOffset = 0;
            } else {
                distance = 15;
                heightOffset = 0; // Lower to center vertically in portrait
                lookAtOffset = 0;
            }
        }
        
        // Position camera in front of furniture (accounting for rotation)
        const cameraOffset = new THREE.Vector3(
            Math.sin(furnitureRotation) * distance,
            0,
            Math.cos(furnitureRotation) * distance
        );
        
        const newCameraPos = furniturePos.clone().add(cameraOffset);
        newCameraPos.y = furniturePos.y + heightOffset;
        
        // Calculate look-at point (with vertical offset for better framing)
        const lookAtPos = furniturePos.clone();
        lookAtPos.y += lookAtOffset;
        
        // THE PROVEN METHOD: Just call setLookAt with animation
        cameraControls.setLookAt(
            newCameraPos.x, newCameraPos.y, newCameraPos.z,
            lookAtPos.x, lookAtPos.y, lookAtPos.z,
            true // Enable smooth transition
        );
    }

    /**
     * Enable furniture rotation mode with drag listeners
     * Includes tap-away-to-exit and UI button
     */
    enableFurnitureRotation(furnitureGroup) {
        console.log('🪑 Enabling furniture rotation mode');
        
        // Clean up any existing rotation state
        if (this.furnitureRotationState) {
            this.disableFurnitureRotation();
        }
        
        // Show furniture UI controls (refresh, back, info buttons)
        if (window.furnitureUI) {
            console.log('🎮 Showing furniture UI controls');
            window.furnitureUI.showControls(furnitureGroup, false); // Don't show tutorial in rotation mode
        } else {
            console.warn('⚠️ furnitureUI not available');
        }
        
        // Disable camera controls to prevent world rotation during furniture rotation
        if (this.app.cameraControls) {
            this.app.cameraControls.enablePan = false;
            this.app.cameraControls.enableZoom = false;
            this.app.cameraControls.enableRotate = false;
            console.log('🪑 Camera controls frozen for rotation mode');
        }
        
        // Setup rotation state
        this.furnitureRotationState = {
            furniture: furnitureGroup,
            isDragging: false,
            lastX: 0,
            startX: 0,
            hasMoved: false
        };
        
        const canvas = this.app.renderer.domElement;
        const state = this.furnitureRotationState;
        
        // Mouse/touch start
        const onStart = (e) => {
            e.preventDefault();
            state.isDragging = true;
            state.startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            state.lastX = state.startX;
            state.hasMoved = false;
        };
        
        // Mouse/touch move - rotate furniture
        const onMove = (e) => {
            if (!state.isDragging) return;
            e.preventDefault();
            
            const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const deltaX = currentX - state.lastX;
            
            // Track if user has moved (for tap-away detection)
            if (Math.abs(currentX - state.startX) > 5) {
                state.hasMoved = true;
            }
            
            // Rotate furniture
            const rotationSpeed = 0.01;
            state.furniture.rotation.y += deltaX * rotationSpeed;
            state.lastX = currentX;
            
            // Update link title labels on furniture
            if (this.app.furnitureManager) {
                const furnitureData = this.app.furnitureManager.storageManager.furniture.get(
                    state.furniture.userData.furnitureId
                );
                if (furnitureData && furnitureData.objectIds) {
                    furnitureData.objectIds.forEach(objectId => {
                        const objectMesh = this.app.scene.children.find(child => 
                            child.userData && child.userData.id === objectId
                        );
                        if (objectMesh && window.linkTitleManager) {
                            window.linkTitleManager.updateLabelPosition(objectMesh);
                        }
                    });
                }
            }
        };
        
        // Mouse/touch end
        const onEnd = (e) => {
            if (state.isDragging) {
                state.isDragging = false;
                
                // Save rotation to persistence
                if (this.app.furnitureManager) {
                    this.app.furnitureManager.updateFurnitureRotation(
                        state.furniture.userData.furnitureId,
                        state.furniture.rotation.y
                    );
                }
                
                // If this was a tap (not drag) and NOT on furniture, exit rotation mode
                if (!state.hasMoved && e.target === canvas) {
                    // Check if tap was on furniture or away from it
                    const raycaster = new THREE.Raycaster();
                    const rect = canvas.getBoundingClientRect();
                    const x = ((e.clientX || (e.changedTouches && e.changedTouches[0].clientX) || 0) - rect.left) / rect.width * 2 - 1;
                    const y = -((e.clientY || (e.changedTouches && e.changedTouches[0].clientY) || 0) - rect.top) / rect.height * 2 + 1;
                    raycaster.setFromCamera({ x, y }, this.app.camera);
                    
                    const intersects = raycaster.intersectObject(state.furniture, true);
                    if (intersects.length === 0) {
                        // Tapped away from furniture - exit rotation mode
                        console.log('🪑 Tapped away - exiting rotation mode');
                        this.disableFurnitureRotation();
                    }
                }
            }
        };
        
        // Attach listeners
        canvas.addEventListener('mousedown', onStart, { passive: false });
        canvas.addEventListener('mousemove', onMove, { passive: false });
        canvas.addEventListener('mouseup', onEnd);
        canvas.addEventListener('touchstart', onStart, { passive: false });
        canvas.addEventListener('touchmove', onMove, { passive: false });
        canvas.addEventListener('touchend', onEnd);
        
        // Store listeners for cleanup
        state.listeners = { onStart, onMove, onEnd };
        
        console.log('🪑 Rotation mode enabled');
        this.showFurnitureRotationUI();
    }

    /**
     * Disable furniture rotation mode and cleanup
     */
    disableFurnitureRotation() {
        if (!this.furnitureRotationState) return;
        
        console.log('🪑 Disabling furniture rotation mode');
        
        const canvas = this.app.renderer.domElement;
        const { listeners } = this.furnitureRotationState;
        
        if (listeners) {
            canvas.removeEventListener('mousedown', listeners.onStart);
            canvas.removeEventListener('mousemove', listeners.onMove);
            canvas.removeEventListener('mouseup', listeners.onEnd);
            canvas.removeEventListener('touchstart', listeners.onStart);
            canvas.removeEventListener('touchmove', listeners.onMove);
            canvas.removeEventListener('touchend', listeners.onEnd);
        }
        
        // Restore camera controls for normal navigation
        if (this.app.cameraControls) {
            this.app.cameraControls.enablePan = true;
            this.app.cameraControls.enableZoom = true;
            this.app.cameraControls.enableRotate = true;
            console.log('🪑 Camera controls restored');
        }
        
        // Hide furniture UI controls
        if (window.furnitureUI) {
            console.log('🎮 Hiding furniture UI controls');
            window.furnitureUI.hideControls();
        }
        
        this.hideFurnitureRotationUI();
        this.furnitureRotationState = null;
        console.log('🪑 Rotation mode disabled');
    }

    /**
     * Show UI with instructions and Done button
     * Button positioned at bottom-right to match furniture refresh button location
     */
    showFurnitureRotationUI() {
        if (document.getElementById('furniture-rotation-ui')) return;
        
        // Instructions overlay at top (fades out)
        const instructionsOverlay = document.createElement('div');
        instructionsOverlay.id = 'furniture-rotation-instructions';
        instructionsOverlay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            transition: opacity 0.5s;
            pointer-events: none;
        `;
        instructionsOverlay.innerHTML = `
            <div style="font-size: 14px; line-height: 1.5;">
                📱 <strong>Rotation Mode Active</strong><br>
                <span style="opacity: 0.9;">Drag to rotate furniture. Press Done to exit.</span>
            </div>
        `;
        document.body.appendChild(instructionsOverlay);
        
        // Fade out instruction after 3 seconds
        setTimeout(() => {
            instructionsOverlay.style.opacity = '0';
            setTimeout(() => instructionsOverlay.remove(), 500);
        }, 3000);
        
        // Done button at bottom-right (stays visible, positioned right above refresh button)
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'furniture-rotation-ui';
        buttonContainer.style.cssText = `
            position: fixed;
            bottom: 172px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;
        
        // Round Done button with checkmark (matches furniture closeup style)
        const doneBtn = document.createElement('button');
        doneBtn.style.cssText = `
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.3);
            background: rgba(76, 175, 68, 0.9);
            backdrop-filter: blur(10px);
            color: white;
            cursor: pointer;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            transition: all 0.2s;
            font-weight: bold;
        `;
        doneBtn.textContent = '✓';
        doneBtn.onclick = () => {
            console.log('🪑 Done button clicked');
            this.disableFurnitureRotation();
        };
        doneBtn.onmouseenter = () => {
            doneBtn.style.background = 'rgba(69, 160, 73, 0.9)';
            doneBtn.style.transform = 'scale(1.05)';
        };
        doneBtn.onmouseleave = () => {
            doneBtn.style.background = 'rgba(76, 175, 68, 0.9)';
            doneBtn.style.transform = 'scale(1)';
        };
        buttonContainer.appendChild(doneBtn);
        
        document.body.appendChild(buttonContainer);
    }

    /**
     * Hide rotation UI
     */
    hideFurnitureRotationUI() {
        const ui = document.getElementById('furniture-rotation-ui');
        if (ui) ui.remove();
    }

    /**
     * Handle double-click on link objects
     */
    handleLinkDoubleClick(object) {
        console.log('🔗 LinkInteractionManager: Handling link double-click');
        
        // Extract URL from multiple possible locations
        let url = null;
        let linkType = 'website';
        let title = 'Untitled Link';
        let platform = 'website';
        let furnitureId = null;
        
        const fileData = object.userData.fileData;
        
        // Check fileData first
        if (fileData) {
            url = fileData.url || fileData.thumbnailUrl;
            linkType = fileData.linkType || 'website';
            title = fileData.title || fileData.name || title;
            platform = fileData.platform || this.detectPlatformFromUrl(url);
        }
        
        // Fallback to direct userData
        if (!url) {
            url = object.userData.url;
        }
        
        // Extract title from userData if not found
        if (title === 'Untitled Link' && object.userData.title) {
            title = object.userData.title;
        }
        
        // Get furniture ID if available
        if (object.userData.furnitureId) {
            furnitureId = object.userData.furnitureId;
        } else if (object.parent) {
            // Try to find furniture UUID from parent hierarchy
            let parent = object.parent;
            while (parent) {
                if (parent.userData && parent.userData.furnitureUUID) {
                    furnitureId = parent.userData.furnitureUUID;
                    break;
                }
                parent = parent.parent;
            }
        }
        
        // Last resort: try to extract from package name if it's a link type
        if (!url && object.userData.id && object.userData.id.includes('link')) {
            console.log('🔗 LinkInteractionManager: Attempting to extract URL from package name');
            // Could potentially extract domain from package name like 'com.link.walmartcom'
            const packageParts = object.userData.id.split('.');
            if (packageParts.length >= 3 && packageParts[1] === 'link') {
                const domain = packageParts[2].replace(/com$/, '.com');
                url = `https://${domain}`;
                console.log('🔗 LinkInteractionManager: Reconstructed URL from package:', url);
            }
        }
        
        if (!url) {
            console.warn('🔗 LinkInteractionManager: No URL found in link object');
            console.log('Available data:', {
                fileData: fileData,
                directUrl: object.userData.url,
                packageName: object.userData.id
            });
            return;
        }
        
        // Ensure platform is detected from URL if not already set
        if (platform === 'website') {
            platform = this.detectPlatformFromUrl(url);
        }
        
        console.log(`🔗 LinkInteractionManager: Opening ${linkType} URL: ${url}`);
        
        // Show visual feedback
        this.showLinkOpeningFeedback(object);
        
        // Open the URL and track activity
        this.openURL(url, linkType, {
            title: title,
            platform: platform,
            furnitureId: furnitureId
        });
    }

    /**
     * Open URL with appropriate method based on type and platform
     */
    openURL(url, linkType = 'website', metadata = {}) {
        try {
            console.log(`🔗 LinkInteractionManager: Opening URL: ${url}`);
            
            // Try to determine if we should use app schemes for better mobile experience
            const optimizedUrl = this.getOptimizedURL(url, linkType);
            
            // Use Flutter channel for external browser opening
            if (window.ExternalUrlHandler) {
                console.log('🔗 LinkInteractionManager: Using Flutter ExternalUrlHandler');
                
                const message = JSON.stringify({
                    url: optimizedUrl,
                    linkType: linkType
                });
                
                window.ExternalUrlHandler.postMessage(message);
                console.log('🔗 LinkInteractionManager: URL sent to Flutter for external opening');
                
                // Track successful sending with metadata
                this.trackLinkOpening(url, linkType, 'flutter_success', metadata);
            } else {
                console.warn('🔗 LinkInteractionManager: ExternalUrlHandler not available, falling back to window.open');
                
                // Fallback to window.open (may still open in WebView)
                const newWindow = window.open(optimizedUrl, '_blank', 'noopener,noreferrer');
                
                if (newWindow) {
                    console.log('🔗 LinkInteractionManager: URL opened with window.open fallback');
                    this.trackLinkOpening(url, linkType, 'window_open_success', metadata);
                } else {
                    console.warn('🔗 LinkInteractionManager: window.open failed, trying link element fallback');
                    this.fallbackURLOpening(optimizedUrl);
                    this.trackLinkOpening(url, linkType, 'fallback', metadata);
                }
            }
            
        } catch (error) {
            console.error('🔗 LinkInteractionManager: Error opening URL:', error);
            
            // Track error
            this.trackLinkOpening(url, linkType, 'error', metadata);
            
            // Show user-friendly error
            this.showLinkError(url);
        }
    }

    /**
     * Get optimized URL for mobile apps when possible
     */
    getOptimizedURL(url, linkType) {
        // For now, return the original URL
        // Later we can add app scheme detection (youtube://, tiktok://, etc.)
        
        if (linkType === 'youtube' && this.isMobile()) {
            // Could potentially use youtube:// scheme here
            console.log('🔗 LinkInteractionManager: YouTube link detected on mobile');
        }
        
        return url;
    }

    /**
     * Fallback URL opening method
     */
    fallbackURLOpening(url) {
        try {
            console.log('🔗 LinkInteractionManager: Attempting fallback URL opening');
            
            // Create a temporary link element and click it
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            // Add to DOM, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('🔗 LinkInteractionManager: Fallback URL opening completed');
            
        } catch (error) {
            console.error('🔗 LinkInteractionManager: Fallback URL opening failed:', error);
        }
    }

    /**
     * Show visual feedback when opening a link
     */
    showLinkOpeningFeedback(object) {
        console.log('🔗 LinkInteractionManager: Showing link opening feedback');
        
        // Store original material for restoration
        const originalMaterial = object.material;
        
        // Create temporary highlight material - handle both single and multi-material objects
        let highlightMaterial;
        
        if (Array.isArray(originalMaterial)) {
            // Multi-material object - clone each material
            highlightMaterial = originalMaterial.map(mat => {
                const clonedMat = mat.clone();
                if (clonedMat.color) {
                    clonedMat.color.setHex(0x00FF00); // Green highlight
                }
                return clonedMat;
            });
        } else {
            // Single material object
            highlightMaterial = originalMaterial.clone();
            if (highlightMaterial.color) {
                highlightMaterial.color.setHex(0x00FF00); // Green highlight
            }
        }
        
        // Apply highlight
        object.material = highlightMaterial;
        
        // Restore original material after delay
        setTimeout(() => {
            object.material = originalMaterial;
            console.log('🔗 LinkInteractionManager: Link opening feedback restored');
        }, 300);
    }

    /**
     * Show error message for failed link opening
     */
    showLinkError(url) {
        console.error(`🔗 LinkInteractionManager: Failed to open link: ${url}`);
        
        // For now, just log. Later we could show a user notification
        // Could integrate with existing snackbar system if available
    }

    /**
     * Track link opening events for analytics and user activity
     */
    trackLinkOpening(url, linkType, result, metadata = {}) {
        console.log(`🔗 LinkInteractionManager: Link tracking - URL: ${url}, Type: ${linkType}, Result: ${result}`);
        
        // Store basic statistics
        if (!this.linkStats) {
            this.linkStats = {
                totalOpened: 0,
                successful: 0,
                failed: 0,
                byType: {}
            };
        }
        
        this.linkStats.totalOpened++;
        
        if (result === 'success' || result.includes('success')) {
            this.linkStats.successful++;
        } else {
            this.linkStats.failed++;
        }
        
        if (!this.linkStats.byType[linkType]) {
            this.linkStats.byType[linkType] = 0;
        }
        this.linkStats.byType[linkType]++;
        
        // Send activity data to Flutter for persistence
        if (result.includes('success')) {
            this.recordUserActivity(url, metadata);
        }
    }
    
    /**
     * Send user activity data to Flutter for tracking favorites and recommendations
     */
    recordUserActivity(url, metadata = {}) {
        try {
            const activityData = {
                action: 'recordLinkActivity',
                url: url,
                title: metadata.title || 'Untitled Link',
                platform: metadata.platform || 'website',
                furnitureId: metadata.furnitureId || null,
                timestamp: Date.now()
            };
            
            console.log('📊 Recording user activity:', activityData);
            
            // Send to Flutter via UserActivityChannel
            if (window.UserActivityChannel) {
                window.UserActivityChannel.postMessage(JSON.stringify(activityData));
                console.log('📊 Activity data sent to Flutter');
            } else {
                console.warn('📊 UserActivityChannel not available - activity not recorded');
            }
        } catch (e) {
            console.error('📊 Error recording user activity:', e);
        }
    }
    
    /**
     * Detect platform from URL
     */
    detectPlatformFromUrl(url) {
        if (!url) return 'website';
        
        const urlLower = url.toLowerCase();
        
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
        if (urlLower.includes('spotify.com')) return 'spotify';
        if (urlLower.includes('deezer.com')) return 'deezer';
        if (urlLower.includes('soundcloud.com')) return 'soundcloud';
        if (urlLower.includes('tiktok.com')) return 'tiktok';
        if (urlLower.includes('instagram.com')) return 'instagram';
        if (urlLower.includes('vimeo.com')) return 'vimeo';
        if (urlLower.includes('dailymotion.com')) return 'dailymotion';
        if (urlLower.includes('twitch.tv')) return 'twitch';
        
        return 'website';
    }

    /**
     * Get link interaction statistics
     */
    getStats() {
        return this.linkStats || {
            totalOpened: 0,
            successful: 0,
            failed: 0,
            byType: {}
        };
    }

    /**
     * Detect if running on mobile device
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Reset/cleanup method
     */
    cleanup() {
        if (this.originalDoubleClickHandler && this.app.interactionManager) {
            // Restore original handler
            this.app.interactionManager.handleObjectDoubleClick = this.originalDoubleClickHandler;
        }
        
        this.isInitialized = false;
        console.log('🔗 LinkInteractionManager: Cleaned up');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkInteractionManager;
}

// Make available globally
window.LinkInteractionManager = LinkInteractionManager;

console.log('🔗 LinkInteractionManager module loaded');
