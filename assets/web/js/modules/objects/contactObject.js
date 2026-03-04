/**
 * Contact Object Module
 * Creates 3D contact objects with avatar-like appearance and SMS functionality
 */

// Contact front face texture creator - uses same system as MP3 files
window.ContactTextureCreator = {
    createContactFaceTexture: function(contactData) {
        // Create a canvas texture for contact info (like MP3 face textures)
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Fill with contact color background
        context.fillStyle = '#4A90E2'; // Nice blue color for contacts
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add border like MP3 files
        context.strokeStyle = '#000000';
        context.lineWidth = 20;
        context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        
        // Add inner white border for contrast
        context.strokeStyle = '#ffffff';
        context.lineWidth = 10;
        context.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
        
        // If contact has avatar, try to draw it
        if (contactData.avatar) {
            console.log('📱 Contact has avatar, creating enhanced texture for:', contactData.name);
            return this.createAvatarTexture(canvas, context, contactData);
        } else {
            console.log('📱 Contact has no avatar, creating text-based texture for:', contactData.name);
            return this.createTextTexture(canvas, context, contactData);
        }
    },
    
    createAvatarTexture: function(canvas, context, contactData) {
        // Create texture with avatar image
        const img = new Image();
        img.onload = function() {
            console.log('📱 Avatar image loaded for:', contactData.name);
            
            // Clear the blue background in the center area for avatar
            context.fillStyle = '#ffffff';
            context.fillRect(50, 50, canvas.width - 100, canvas.height - 150);
            
            // Draw avatar image in the center area (smaller to make room for larger text)
            const avatarSize = 250;
            const avatarX = (canvas.width - avatarSize) / 2;
            const avatarY = 80;
            
            // Make avatar circular
            context.save();
            context.beginPath();
            context.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
            context.clip();
            context.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
            context.restore();
            
            // Add contact name at bottom with larger font
            context.fillStyle = '#ffffff';
            context.textAlign = 'center';
            context.shadowColor = '#000000';
            context.shadowOffsetX = 3;
            context.shadowOffsetY = 3;
            context.shadowBlur = 6;
            context.font = 'bold 50px Arial';
            
            // Truncate name to 11 characters for avatar version too, no ellipsis
            let displayName = contactData.name || 'Unknown';
            if (displayName.length > 11) {
                displayName = displayName.substring(0, 11);
            }
            context.fillText(displayName, canvas.width / 2, canvas.height - 60);
            
            // Update texture
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
        };
        
        // Load the avatar image
        img.src = contactData.avatar;
        
        // Return a temporary texture while image loads
        return this.createTextTexture(canvas, context, contactData);
    },
    
    createTextTexture: function(canvas, context, contactData) {
        console.log('📱 Creating enhanced text texture for contact:', contactData);
        
        // Add contact text with enhanced shadow for better readability
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.shadowColor = '#000000';
        context.shadowOffsetX = 3;
        context.shadowOffsetY = 3;
        context.shadowBlur = 6;
        
        // Contact name (much larger) - truncated to 11 characters as requested
        context.font = 'bold 70px Arial';
        const nameY = canvas.height / 2 - 40;
        
        // Get name with 11-character truncation as requested, no ellipsis to save space
        let displayName = contactData.name || contactData.fileName || 'Unknown Contact';
        if (displayName.length > 11) {
            displayName = displayName.substring(0, 11);
        }
        console.log('📱 Contact display name (10 chars max):', displayName);
        context.fillText(displayName, canvas.width / 2, nameY);
        
        // Phone number (larger but smaller than name)
        context.font = 'bold 38px Arial';
        const phoneY = canvas.height / 2 + 40;
        let displayPhone = contactData.phoneNumber || contactData.cameraModel || 'No Phone';
        // Keep phone number length reasonable for display
        if (displayPhone.length > 18) {
            displayPhone = displayPhone.substring(0, 15) + '...';
        }
        console.log('📱 Contact display phone:', displayPhone);
        context.fillText(displayPhone, canvas.width / 2, phoneY);
        
        // Create and return the texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        console.log('📱 Enhanced contact face texture created with large, clear text:', displayName, displayPhone);
        return texture;
    }
};

// ContactObject class - will use global THREE and create simplified billboards
window.ContactObjectClass = class ContactObject {
    constructor(initialContactData, scene) {
        // DIAGNOSTIC: Log what we start with
        console.log('🔍 DIAGNOSTIC: ContactObject constructor - initialContactData:', JSON.stringify(initialContactData, null, 2));
        
        // CRITICAL PHONE NUMBER EXTRACTION DEBUG
        console.log('🔍 PHONE EXTRACTION DEBUG:');
        console.log('  - initialContactData.phoneNumber:', initialContactData.phoneNumber);
        console.log('  - initialContactData.cameraModel:', initialContactData.cameraModel);
        console.log('  - initialContactData.dateTimeOriginal:', initialContactData.dateTimeOriginal);
        console.log('  - initialContactData.id:', initialContactData.id);
        
        // Extract phone number from Flutter contact structure DIRECTLY from initialContactData
        // Don't try to fetch from contactManager as it may not exist yet during creation
        let phoneNumber = initialContactData.phoneNumber;
        console.log('🔍 Step 1 - phoneNumber from .phoneNumber field:', phoneNumber);
        
        // Flutter stores phone in cameraModel and dateTimeOriginal fields
        if (!phoneNumber && initialContactData.cameraModel && initialContactData.cameraModel !== 'No Phone') {
            phoneNumber = initialContactData.cameraModel;
            console.log('📱 ✅ Step 2 - Found phone in cameraModel:', phoneNumber);
        }
        if (!phoneNumber && initialContactData.dateTimeOriginal && initialContactData.dateTimeOriginal !== 'No Phone') {
            phoneNumber = initialContactData.dateTimeOriginal;
            console.log('📱 ✅ Step 3 - Found phone in dateTimeOriginal:', phoneNumber);
        }
        
        console.log('🔍 FINAL EXTRACTED PHONE NUMBER:', phoneNumber);

        this.contactData = {
            id: initialContactData.id,
            name: initialContactData.name || initialContactData.cameraMake || 'Unknown Contact',
            phoneNumber: phoneNumber || 'No Phone',
            avatar: initialContactData.avatar || initialContactData.thumbnailDataUrl || null,
            position: initialContactData.position || { x: initialContactData.x || 0, y: initialContactData.y || 0, z: initialContactData.z || 0 }
        };

        // COMPREHENSIVE TRACKING: Add phone number change detection
        this._originalPhoneNumber = this.contactData.phoneNumber;
        console.log('🔍 [TRACK] Contact created with phone number:', this.contactData.phoneNumber);
        
        // Add a setter to track any changes to phoneNumber
        let _phoneNumber = this.contactData.phoneNumber;
        Object.defineProperty(this.contactData, 'phoneNumber', {
            get: function() {
                return _phoneNumber;
            },
            set: function(newValue) {
                console.log('🔍 [TRACK] Phone number CHANGED from:', _phoneNumber, 'to:', newValue);
                console.trace('🔍 [TRACK] Phone number change stack trace:');
                _phoneNumber = newValue;
            },
            enumerable: true,
            configurable: true
        });

        // Debug important contacts
        if (this.contactData.name.includes('Mom') || this.contactData.id === '13' || this.contactData.id === 'contact://13') {
            console.log(`📱 DEBUG Contact: ${this.contactData.name} → ${this.contactData.phoneNumber}`);
        }

        // DIAGNOSTIC: Log final contactData for this object
        if (this.contactData.id === 'mom' || this.contactData.id === '13' || this.contactData.id === 'contact://13') {
            console.log('🔍 DIAGNOSTIC: Final contactData for contact:', JSON.stringify(this.contactData, null, 2));
        }

        this.scene = scene;
        this.mesh = null;
        this.billboard = null;
        this.smsScreen = null;
        this.contactInfoScreen = null; // MV3D: Contact Info Screen (replaces SMS when disabled)
        this.balloonManager = null; // Optional 3D balloon system (doesn't interfere with SMS)
        this.isSelected = false;
        
        this.createContactMesh();
        this.applyFaceTextureImmediate(); // Apply face texture immediately during creation
        this.setupInteraction();
        
        console.log(`📱 Contact object created: ${this.contactData.name} (${this.contactData.phoneNumber})`);
    }
    
    /**
     * Apply face texture immediately during creation (Phase 2 enhancement)
     */
    applyFaceTextureImmediate() {
        if (!this.mesh || !this.mesh.material) {
            console.warn('📱 Cannot apply face texture - mesh or material not ready');
            return;
        }
        
        // Ensure material is array format
        if (!Array.isArray(this.mesh.material)) {
            console.warn('📱 Contact material is not array format, converting...');
            return;
        }
        
        // Apply face texture to material[4] (face material slot)
        if (this.mesh.material[4]) {
            const faceTexture = this.generateFaceTexture();
            if (faceTexture) {
                this.mesh.material[4].map = faceTexture;
                this.mesh.material[4].needsUpdate = true;
                console.log(`📱 Face texture applied immediately for ${this.contactData.name}`);
            }
        }
    }
    
    /**
     * Generate face texture based on contact data (Phase 2 enhancement)
     */
    generateFaceTexture() {
        // Generate face texture based on contact name/phone
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Draw background
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(0, 0, 128, 128);
        
        // Draw initials
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const initials = this.contactData.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
        
        ctx.fillText(initials, 64, 64);
        
        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    /**
     * Create the 3D contact mesh (simplified single mesh like file objects)
     */
    createContactMesh() {
        // Create a single box geometry with 1.5x width for better text display
        const boxGeometry = new THREE.BoxGeometry(1.5, 2.5, 1.0);
        
        // Create materials array for 6 faces (like MP3 files)
        const materials = [];
        for (let i = 0; i < 6; i++) {
            const material = new THREE.MeshLambertMaterial({ 
                color: 0x4a90e2,
                transparent: true,
                opacity: 1.0,
                side: THREE.DoubleSide  // Ensure raycaster can hit from both front and back
            });
            
            // CRITICAL: Add emissive property for highlighting system
            material.emissive = new THREE.Color(0x000000);
            materials[i] = material;
        }
        
        // Create single mesh with material array (like file objects)
        const contactMesh = new THREE.Mesh(boxGeometry, materials);
        
        // CRITICAL: Ensure the mesh is raycastable
        contactMesh.raycast = THREE.Mesh.prototype.raycast;
        contactMesh.visible = true;
        contactMesh.layers.set(0); // Default layer
        
        // Set position directly on the mesh - FIXED: Sit on XZ plane (like file objects)
        const objectHeight = 2.5; // Contact object height
        
        // GROUND PLACEMENT FIX: Use world-specific ground positioning
        let yPosition = objectHeight / 2; // Default for non-green-plane worlds
        
        // For green-plane world, check if contact should be on ground or stacked
        if (window.getCurrentWorldType && window.getCurrentWorldType() === 'green-plane') {
            // Check if this contact has a persisted position that suggests stacking
            const persistedY = this.contactData.position.y;
            const groundY = 0; // Green-plane ground level
            const expectedGroundY = groundY + (objectHeight / 2); // Expected Y for objects on ground (1.25)
            const expectedStackY = objectHeight; // Stacking height for second level (2.5)
            
            // More precise stacking detection: only consider it stacked if Y is close to expected stack height
            // This fixes the issue where old hardcoded positions (1.28) were mistaken for stacking
            if (persistedY && Math.abs(persistedY - expectedStackY) < 0.3) {
                console.log(`📱 Contact ${this.contactData.name} appears to be properly stacked, using persisted Y: ${persistedY}`);
                yPosition = persistedY;
            } else if (persistedY && Math.abs(persistedY - expectedGroundY) < 0.2) {
                console.log(`📱 Contact ${this.contactData.name} appears to be properly grounded, using persisted Y: ${persistedY}`);
                yPosition = persistedY;
            } else {
                // Place on ground for green-plane world (fixes old hardcoded positions)
                yPosition = expectedGroundY;
                console.log(`📱 Contact ${this.contactData.name} placed on green-plane ground at Y: ${yPosition} (was ${persistedY})`);
            }
        }
        
        contactMesh.position.set(
            this.contactData.position.x,
            yPosition,
            this.contactData.position.z
        );
        
        // Add contact data to userData - FULL FILE OBJECT COMPATIBILITY
        const contactUserData = {
            // File object compatibility
            type: 'fileObject',          // Make it compatible with file object system
            subType: 'contact',          // Distinguish it as contact subtype
            id: this.contactData.id,     // Consistent ID structure
            fileId: this.contactData.id, // For interaction system compatibility
            fileName: this.contactData.name,  // For compatibility with file systems
            
            // Contact-specific data
            contactId: this.contactData.id,
            contactObject: this,
            isContact: true,             // Easy identification flag
            
            // File object features
            isInteractable: true,
            canMove: true,
            canDelete: true,
            canUndo: true,
            
            // Material properties for highlighting
            originalMaterial: materials,  // Store material array
            hasEmissive: true,
            
            // CRITICAL: Object dimensions for positioning constraints
            objectWidth: 1.0,     // Box width
            objectHeight: 2.5,    // Box height
            objectDepth: 1.0,     // Box depth
            
            // Position persistence
            originalPosition: {
                x: this.contactData.position.x,
                y: yPosition, // Use actual final Y position, not input position
                z: this.contactData.position.z
            },
            
            // Contact metadata
            phoneNumber: this.contactData.phoneNumber,
            avatar: this.contactData.avatar,
            
            // File system compatibility
            extension: '.contact',
            fileType: 'contact',
            mimeType: `contact:${this.contactData.id}`
        };
        
        // Set userData directly on the single mesh
        contactMesh.userData = contactUserData;
        
        // Store the single mesh (no group needed)
        this.mesh = contactMesh;
        this.scene.add(this.mesh);
        
        console.log(`📱 Contact mesh created with userData:`, {
            fileName: contactUserData.fileName,
            isContact: contactUserData.isContact,
            hasEmissive: contactUserData.hasEmissive
        });
    }
    
    /**
     * Apply front face texture showing contact info (like MP3 files)
     */
    createBillboard() {
        // Instead of creating a separate billboard object, apply front face texture like MP3 files
        const contactTexture = window.ContactTextureCreator.createContactFaceTexture(this.contactData);
        
        if (contactTexture && this.mesh) {
            // Apply the texture to the front face (face index 4) of the contact mesh
            this.applyFaceTexture(this.mesh, contactTexture, 4);
        }
    }
    
    /**
     * Apply face texture to contact mesh (uses same method as MP3 files)
     */
    applyFaceTexture(object, texture, faceIndex = 4) {
        if (!texture || !object.material) {
            console.error('Missing texture or object material for contact');
            return;
        }

        console.log('📱 Applying contact face texture to front face');

        // Handle material array (contact objects always use material arrays)
        if (Array.isArray(object.material)) {
            // Apply texture to specified face
            if (object.material[faceIndex]) {
                object.material[faceIndex].map = texture;
                object.material[faceIndex].needsUpdate = true;
                console.log(`📱 Applied texture to face ${faceIndex} of material array`);
            }
        } else {
            console.warn('Contact object should use material array, converting...');
            // Convert single material to array
            const materials = [];
            for (let i = 0; i < 6; i++) {
                const material = object.material.clone();
                material.side = THREE.DoubleSide;
                materials[i] = material;
            }
            
            // Apply texture to specified face
            materials[faceIndex].map = texture;
            materials[faceIndex].needsUpdate = true;
            
            object.material = materials;
        }
        
        console.log('✅ Contact face texture applied successfully');
    }
    
    /**
     * Setup interaction handling
     */
    setupInteraction() {
        // Contact mesh should be properly configured for interaction system
        if (this.mesh && this.mesh.userData) {
            console.log(`📱 Setting up interaction for contact: ${this.contactData.name}`);
            
            // Ensure the mesh is raycastable and visible for interactions
            this.mesh.raycast = THREE.Mesh.prototype.raycast;
            this.mesh.visible = true;
            this.mesh.layers.set(0); // Default layer for raycasting
            
            // Make sure userData is complete for interaction system
            this.mesh.userData.isInteractable = true;
            this.mesh.userData.canMove = true;
            this.mesh.userData.canDelete = true;
            this.mesh.userData.canUndo = true;
            
            console.log(`📱 Contact interaction setup complete: ${this.contactData.name}`);
        }
    }
    
    /**
     * Toggle SMS screen on/off
     */
    toggleSMSScreen() {
        if (this.smsScreen) {
            if (this.smsScreen.isVisible) {
                this.hideSMSScreen();
            } else {
                this.showSMSScreen();
            }
        } else {
            this.createSMSScreen();
            this.showSMSScreen();
        }
    }
    
    /**
     * Create SMS screen for this contact
     * ENHANCED WITH FALLBACK MECHANISMS
     */
    createSMSScreen() {
        try {
            // DIAGNOSTIC: Log the exact data being passed to SMS screen
            console.log('🔍 DIAGNOSTIC: Creating SMS screen with contactData:', JSON.stringify(this.contactData, null, 2));
            
            // Ensure SMSScreenClass is available
            if (!window.SMSScreenClass) {
                throw new Error('SMSScreenClass not available');
            }

            // Create the SMS screen, passing the already-verified contactData from this object.
            // This object's contactData is now the single source of truth.
            this.smsScreen = new window.SMSScreenClass(this.contactData, this.scene);

            // Position screen near the contact
            const screenPosition = this.mesh.position.clone();
            screenPosition.x += 3; // To the right of contact
            screenPosition.y += 2; // Above ground level
            
            this.smsScreen.setPosition(screenPosition);
            
            console.log(`💬 SMS screen created for ${this.contactData.name} with phone number ${this.contactData.phoneNumber}`);
            
            // Initialize optional 3D balloon manager (only if enabled in settings)
            this.initializeBalloonManagerIfEnabled();
            
        } catch (error) {
            console.error(`💬 SMS screen creation FAILED for ${this.contactData.name}:`, error);
            console.error('💬 Error details:', error.message);
            console.error('💬 Stack trace:', error.stack);
            console.error('💬 ContactData that caused the failure:', JSON.stringify(this.contactData, null, 2));
            
            // FALLBACK: Create simple color-based SMS screen
            this.createFallbackSMSScreen();
        }
    }
    
    /**
     * Create fallback SMS screen with minimal materials
     */
    createFallbackSMSScreen() {
        try {
            // Simple fallback SMS screen - just a colored plane
            const geometry = new THREE.PlaneGeometry(6, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0x333333,
                transparent: true,
                opacity: 0.8
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData = {
                type: 'smsScreen',
                isSmsScreen: true,
                contactId: this.contactData.id,
                isInteractable: true
            };
            
            // Create minimal SMS screen object
            this.smsScreen = {
                mesh: mesh,
                isVisible: false,
                show: function() {
                    this.mesh.visible = true;
                    this.isVisible = true;
                },
                hide: function() {
                    this.mesh.visible = false;
                    this.isVisible = false;
                },
                setPosition: function(position) {
                    this.mesh.position.copy(position);
                },
                getMesh: function() {
                    return this.mesh;
                },
                dispose: function() {
                    if (this.mesh && this.mesh.parent) {
                        this.mesh.parent.remove(this.mesh);
                    }
                }
            };
            
            mesh.visible = false;
            this.scene.add(mesh);
            
            // Position screen near the contact
            const screenPosition = this.mesh.position.clone();
            screenPosition.x += 3;
            screenPosition.y += 2;
            this.smsScreen.setPosition(screenPosition);
            
            console.log(`💬 Fallback SMS screen created for ${this.contactData.name}`);
            
        } catch (fallbackError) {
            console.error(`💬 Even fallback SMS screen failed for ${this.contactData.name}:`, fallbackError.message);
            this.smsScreen = null;
        }
    }
    
    /**
     * Show SMS screen (or 3D balloons if 3D mode is enabled)
     */
    showSMSScreen() {
        if (this.smsScreen) {
            // Check if 3D balloon mode is enabled
            const is3DMode = window.Sms3DSettings && window.Sms3DSettings.getSetting('enabled');
            
            if (is3DMode && this.balloonManager) {
                // 3D mode: Hide 2D screen, show 3D balloons
                this.smsScreen.hide();
                this.balloonManager.setEnabled(true);
                console.log('🎈 Showing 3D balloons (2D screen hidden)');
            } else {
                // 2D mode: Show 2D screen, hide 3D balloons
                this.smsScreen.show();
                if (this.balloonManager) {
                    this.balloonManager.setEnabled(false);
                }
            }
            
            this.isSelected = true;
            this.updateVisualState();
            
            // Request conversation history from Flutter with a small delay
            // to ensure SMS integration system is fully initialized
            setTimeout(() => {
                this.requestConversationHistory();
            }, 100);
        }
    }
    
    /**
     * Hide SMS screen (and 3D balloons)
     */
    hideSMSScreen() {
        if (this.smsScreen) {
            this.smsScreen.hide();
            
            // Also hide 3D balloons
            if (this.balloonManager) {
                this.balloonManager.setEnabled(false);
            }
            
            this.isSelected = false;
            this.updateVisualState();
        }
    }
    
    /**
     * Update visual state (selection highlight)
     * MINIMAL MATERIAL SAFETY APPROACH
     */
    updateVisualState() {
        // CRITICAL FIX: Ensure mesh and materials are valid before setting properties
        if (!this.mesh || !this.mesh.children || !this.mesh.children.length > 0) {
            console.warn('ContactObject: Cannot update visual state, mesh is not ready.');
            return;
        }

        const body = this.mesh.children[0];
        if (!body || !body.material) {
            console.warn('ContactObject: Cannot update visual state, body or material is missing.');
            return;
        }

        // MINIMAL APPROACH: Only modify emissive if it exists and is safe
        try {
            const materials = Array.isArray(body.material) ? body.material : [body.material];
            const newEmissive = this.isSelected ? 0x333333 : 0x000000;

            materials.forEach(material => {
                // Only modify if material has emissive property and setHex method
                if (material && material.emissive && material.emissive.setHex && typeof material.emissive.setHex === 'function') {
                    material.emissive.setHex(newEmissive);
                } else {
                    console.warn('ContactObject: Material lacks emissive property, skipping highlight');
                }
            });
        } catch (error) {
            console.warn('ContactObject: Error updating visual state:', error.message);
            // Graceful degradation - continue without highlighting
        }
    }
    
    /**
     * Request conversation history from Flutter
     */
    requestConversationHistory() {
        console.log('📱 Requesting conversation history for:', this.contactData.id);
        
        // Debug: Check what's available
        console.log('📱 DEBUG: window.app available:', !!window.app);
        console.log('📱 DEBUG: window.app.smsIntegrationManager available:', !!(window.app && window.app.smsIntegrationManager));
        console.log('📱 DEBUG: window.app.smsChannelManager available:', !!(window.app && window.app.smsChannelManager));
        
        // If we have the global SMS system wait function, use it
        if (window.SmsSystem && window.SmsSystem.waitForReady) {
            console.log('📱 Using global SMS system wait for ready...');
            window.SmsSystem.waitForReady(async (isReady) => {
                if (isReady) {
                    try {
                        console.log('📱 SMS system is ready, getting conversation');
                        const conversation = await window.app.smsIntegrationManager.getConversation(this.contactData.id);
                        console.log('📱 Loaded conversation:', conversation.length, 'messages');
                        
                        if (this.smsScreen) {
                            this.smsScreen.updateMessages(conversation);
                        }
                    } catch (error) {
                        console.error(`📱 Error loading conversation for ${this.contactData.id}:`, error);
                        if (this.smsScreen) {
                            this.smsScreen.updateMessages([]); // Show empty on error
                        }
                    }
                } else {
                    console.log('📱 SMS system not ready after waiting, falling back to mock data');
                    this.loadMockConversation();
                }
            });
            return;
        }
        
        // Fallback to manual retry system
        console.log('📱 Using manual retry system for SMS integration...');
        
        // Check if SMS integration system is available with improved retry mechanism
        const checkSmsIntegration = async (attempt = 0) => {
            // First check if we have the global SMS system ready check
            if (window.SmsSystem && window.SmsSystem.isReady && window.SmsSystem.isReady()) {
                console.log('📱 Using SMS integration system for conversation history (via global check)');
                
                try {
                    // Use the new SMS integration system
                    const conversation = await window.app.smsIntegrationManager.getConversation(this.contactData.id);
                    console.log('📱 Loaded conversation:', conversation.length, 'messages');
                    
                    if (this.smsScreen) {
                        this.smsScreen.updateMessages(conversation);
                    }
                } catch (error) {
                    console.error(`📱 Error loading conversation for ${this.contactData.id}:`, error);
                    if (this.smsScreen) {
                        this.smsScreen.updateMessages([]); // Show empty on error
                    }
                }
                
                return;
            }
            
            // Fallback to direct check
            if (window.app && window.app.smsIntegrationManager) {
                console.log('📱 Using SMS integration system for conversation history (direct check)');
                
                try {
                    // Use the new SMS integration system
                    const conversation = await window.app.smsIntegrationManager.getConversation(this.contactData.id);
                    console.log('📱 Loaded conversation:', conversation.length, 'messages');
                    
                    if (this.smsScreen) {
                        this.smsScreen.updateMessages(conversation);
                    }
                } catch (error) {
                    console.error(`📱 Error loading conversation for ${this.contactData.id}:`, error);
                    if (this.smsScreen) {
                        this.smsScreen.updateMessages([]); // Show empty on error
                    }
                }
                
                return;
            }
            
            // If SMS integration isn't ready yet, wait and retry (up to 5 attempts with shorter delays)
            if (attempt < 5) {
                const delay = attempt < 2 ? 200 : 500; // Shorter delays for first 2 attempts
                console.log('📱 SMS integration not ready, retrying in', delay + 'ms... (attempt', attempt + 1, '/ 5)');
                setTimeout(() => checkSmsIntegration(attempt + 1), delay);
                return;
            }
            
            // After 5 attempts, fall back to legacy methods
            console.log('📱 SMS integration not available after retries, trying legacy methods...');
            
            // Legacy fallback: Check for old Flutter channel
            if (window.flutter_inappwebview) {
                console.log('📱 Using legacy Flutter channel for conversation history');
                
                // CRITICAL FIX: Only pass contactId, let Flutter resolve the phone number
                // Do NOT pass phoneNumber directly as it may contain "mom" instead of "+1-555-0123"
                window.flutter_inappwebview.callHandler('getContactConversation', {
                    contactId: this.contactData.id
                });
            } else {
                // Final fallback: Use mock data only if no integration available
                console.log('📱 No SMS integration available - using mock data for testing');
                this.loadMockConversation();
            }
        };
        
        // Start the check
        checkSmsIntegration();
    }
    
    /**
     * Load mock conversation for testing
     */
    loadMockConversation() {
        const mockMessages = [
            {
                text: "Hey, how are you doing?",
                timestamp: Date.now() - 3600000,
                isOutgoing: false,
                sender: this.contactData.phoneNumber
            },
            {
                text: "I'm doing great! Thanks for asking 😊",
                timestamp: Date.now() - 3500000,
                isOutgoing: true,
                sender: "me"
            },
            {
                text: "That's awesome! Want to grab coffee later?",
                timestamp: Date.now() - 1800000,
                isOutgoing: false,
                sender: this.contactData.phoneNumber
            }
        ];
        
        // No longer add mock messages - SMS screen will load real conversations
        console.log(`📱 SMS screen will load real conversation data for ${this.contactData.name}`);
    }
    
    /**
     * Send SMS message
     */
    sendMessage(messageText) {
        // DIAGNOSTIC: Log phone number being used for SMS
        if (this.contactData.id === 'mom' || this.contactData.id === '13' || this.contactData.id === 'contact://13') {
            console.log('🔍 DIAGNOSTIC: Sending SMS for contact ID:', this.contactData.id);
            console.log('🔍 DIAGNOSTIC: Contact name:', this.contactData.name);
            console.log('🔍 DIAGNOSTIC: Phone number from contactData:', this.contactData.phoneNumber);
            console.log('🔍 DIAGNOSTIC: Full contactData:', JSON.stringify(this.contactData, null, 2));
        }

        // COMPREHENSIVE DEBUGGING: Track phone number throughout the entire process
        console.log('� [TRACK] sendMessage() called - Initial phone number:', this.contactData.phoneNumber);
        console.log('🔍 [TRACK] contactData at start of sendMessage:', JSON.stringify(this.contactData, null, 2));

        // Validate phone number before sending
        const phoneDigits = this.contactData.phoneNumber.replace(/\D/g, '');
        if (this.contactData.phoneNumber === this.contactData.id) {
            console.error('🚨 CRITICAL ERROR: phoneNumber equals contactId - this will cause SMS to fail!');
            console.error('  - contactId:', this.contactData.id);
            console.error('  - phoneNumber:', this.contactData.phoneNumber);
            console.error('  - This suggests phone number extraction failed during contact creation');
        }
        if (phoneDigits.length < 10) {
            console.error('🚨 PHONE VALIDATION FAILED: Phone number too short, SMS will NOT be sent');
            console.error('  - Raw phone:', this.contactData.phoneNumber);
            console.error('  - Digits only:', phoneDigits);
            console.error('  - Length:', phoneDigits.length);
            return; // Block SMS send if phone number is invalid
        } else {
            console.log('✅ Phone validation passed:', phoneDigits, '(', phoneDigits.length, 'digits)');
        }

        console.log('📱 Sending SMS message to:', this.contactData.id, 'Text:', messageText);

        // Check if SMS integration system is available
        if (window.app && window.app.smsIntegrationManager) {
            console.log('📱 Using SMS integration system for sending message');

            // The smsIntegrationManager is supposed to resolve the contactId, but it seems to be failing.
            // We will pass the phone number directly as well to ensure the correct number is used.
            console.log(`🔍 DIAGNOSTIC: Sending SMS. Contact ID: ${this.contactData.id}, Phone: ${this.contactData.phoneNumber}, Message: ${messageText}`);

            // COMPREHENSIVE TRACKING: Log phone number just before creating messageData
            console.log('🔍 [TRACK] About to create messageData with phone number:', this.contactData.phoneNumber);

            // FINAL CHECK: Verify what we're about to send
            const messageData = {
                contactId: this.contactData.id,
                text: messageText,
                phoneNumber: this.contactData.phoneNumber
            };
            
            // COMPREHENSIVE TRACKING: Log messageData immediately after creation
            console.log('🔍 [TRACK] messageData created:', JSON.stringify(messageData, null, 2));
            console.log('🔍 [TRACK] this.contactData after messageData creation:', JSON.stringify(this.contactData, null, 2));

            // COMPREHENSIVE TRACKING: Final verification before SMS send
            console.log('🔍 [TRACK] Just before SMS send - messageData:', JSON.stringify(messageData, null, 2));
            console.log('🔍 [TRACK] Just before SMS send - contactData:', JSON.stringify(this.contactData, null, 2));

            // CRITICAL DEBUGGING: Log the exact SMS integration manager call
            console.log('🔍 [SMS INTEGRATION] About to call window.app.smsIntegrationManager.sendMessage()');
            console.log('🔍 [SMS INTEGRATION] SMS Integration Manager exists:', !!window.app.smsIntegrationManager);
            console.log('🔍 [SMS INTEGRATION] sendMessage method exists:', typeof window.app.smsIntegrationManager.sendMessage);
            
            // FINAL SAFETY CHECK: Verify messageData has correct phone number
            if (messageData.phoneNumber === messageData.contactId) {
                console.error('🚨 [CRITICAL] messageData.phoneNumber equals contactId - this WILL cause SMS failure!');
                console.error('🚨 [CRITICAL] messageData.phoneNumber:', messageData.phoneNumber);
                console.error('🚨 [CRITICAL] messageData.contactId:', messageData.contactId);
                console.error('🚨 [CRITICAL] Expected phone number:', this.contactData.phoneNumber);
                console.error('🚨 [CRITICAL] Attempting to fix messageData before SMS send...');
                messageData.phoneNumber = this.contactData.phoneNumber;
                console.log('🔍 [CRITICAL FIX] Updated messageData.phoneNumber to:', messageData.phoneNumber);
            }

            // CRITICAL FIX: Use the correct sendMessage interface with a callback
            // The SMS integration manager expects (contactId, messageText, callback)
            console.log('🔍 [CRITICAL FIX] Calling sendMessage with contactId, text, and a callback');
            console.log('🔍 [CRITICAL FIX] contactId:', this.contactData.id);
            console.log('🔍 [CRITICAL FIX] messageText:', messageText);
            
            window.app.smsIntegrationManager.sendMessage(this.contactData.id, messageText, (success) => {
                console.log('� SMS send result from callback:', success);
                if (success) {
                    // Add the message to the local display immediately
                    const newMessage = {
                        text: messageText,
                        timestamp: Date.now(),
                        isOutgoing: true,
                        sender: "me"
                    };

                    if (this.smsScreen) {
                        this.smsScreen.addMessage(newMessage);
                    }
                }
            });

            // COMPREHENSIVE TRACKING: Log after SMS send attempt
            console.log('🔍 [TRACK] After SMS send attempt initiated');
            return;
        }
        
        // Legacy fallback: Check for old Flutter channel
        if (window.flutter_inappwebview) {
            console.log('📱 Using legacy Flutter channel for sending message');
            
            // Pass contactId and phoneNumber to let Flutter resolve the number.
            window.flutter_inappwebview.callHandler('sendSMS', {
                contactId: this.contactData.id,
                phoneNumber: this.contactData.phoneNumber,
                message: messageText
            });
        } else {
            // Final fallback: Mock message only if no integration available
            console.log('📱 No SMS integration available - using mock message for testing');
            console.log(`📤 Mock SMS to ${this.contactData.name}: ${messageText}`);
            this.addMockMessage(messageText, true);
        }
    }
    
    /**
     * Add mock message for testing
     */
    addMockMessage(text, isOutgoing) {
        // No longer add mock messages - real messages will be loaded from Flutter
        console.log(`📱 Message sent via real SMS channel for ${this.contactData.name}: "${text}"`);
        
        // Optionally refresh conversation to show the new message
        if (this.smsScreen && this.smsScreen.loadRealConversation) {
            setTimeout(() => {
                this.smsScreen.loadRealConversation();
            }, 1000); // Give Flutter time to process the sent message
        }
    }
    
    /**
     * Update messages from Flutter
     */
    updateMessages(messages) {
        if (this.smsScreen) {
            this.smsScreen.updateMessages(messages);
        }
    }
    
    /**
     * Update SMS screen position when contact object moves
     */
    updateSMSScreenPosition() {
        if (this.smsScreen && this.smsScreen.setPosition) {
            // Position screen near the contact at current position
            const screenPosition = this.mesh.position.clone();
            screenPosition.x += 3; // To the right of contact
            screenPosition.y += 2; // Above ground level
            
            this.smsScreen.setPosition(screenPosition);
            console.log(`📱 Updated SMS screen position for ${this.contactData.name} to:`, screenPosition);
        }
    }
    
    /**
     * MV3D: Toggle Contact Info Screen (replaces SMS screen)
     * Single tap shows contact info with native app action buttons
     */
    toggleContactInfoScreen() {
        // Check if SMS is disabled (MV3D mode)
        if (!window.isSmsFeatureEnabled || !window.isSmsFeatureEnabled('ENABLE_SMS_CORE')) {
            // MV3D mode - use Contact Info Screen
            if (this.contactInfoScreen) {
                this.contactInfoScreen.toggle();
            } else {
                this.createContactInfoScreen();
                this.contactInfoScreen.show();
            }
        } else {
            // FirstTaps3D mode - use SMS Screen
            this.toggleSMSScreen();
        }
    }
    
    /**
     * MV3D: Create Contact Info Screen
     */
    createContactInfoScreen() {
        try {
            if (!window.ContactInfoScreenClass) {
                console.error('❌ ContactInfoScreenClass not available');
                return;
            }
            
            this.contactInfoScreen = new window.ContactInfoScreenClass(this.contactData, this.scene);
            
            // Position screen floating above and behind the contact object
            const screenPosition = this.mesh.position.clone();
            screenPosition.z -= 3; // Behind contact (negative Z)
            screenPosition.y += 8; // Well above ground level - floating
            
            // Make screen face forward (straight up, not angled)
            this.contactInfoScreen.mesh.position.copy(screenPosition);
            this.contactInfoScreen.mesh.rotation.set(0, 0, 0); // Straight orientation
            
            this.scene.add(this.contactInfoScreen.getMesh());
            
            console.log(`👤 Contact Info Screen created for ${this.contactData.name}`);
        } catch (error) {
            console.error(`❌ Contact Info Screen creation failed for ${this.contactData.name}:`, error);
        }
    }
    
    /**
     * MV3D: Update Contact Info Screen position (similar to SMS screen)
     */
    updateContactInfoScreenPosition() {
        if (this.contactInfoScreen && this.contactInfoScreen.isVisible) {
            this.contactInfoScreen.updatePosition(this.mesh);
        }
    }
    
    /**
     * Cleanup
     */
    dispose() {
        // Dispose 3D balloon manager first (if exists)
        if (this.balloonManager) {
            this.balloonManager.dispose();
            this.balloonManager = null;
        }
        
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        if (this.billboard) {
            this.scene.remove(this.billboard);
        }
        if (this.smsScreen) {
            this.smsScreen.dispose();
        }
        if (this.contactInfoScreen) {
            this.contactInfoScreen.dispose();
        }
        
        console.log(`🗑️ Contact object disposed: ${this.contactData.name}`);
    }
    
    /**
     * Initialize 3D balloon manager (optional, non-interfering)
     * Only creates if user has enabled 3D mode in settings
     */
    initializeBalloonManagerIfEnabled() {
        try {
            // Check if 3D balloon system is available
            if (!window.Sms3DBalloonManager || !window.Sms3DSettings) {
                return; // System not loaded, skip silently
            }
            
            // Check if user has enabled 3D mode
            const settings = window.Sms3DSettings;
            if (!settings || !settings.getSetting('enabled')) {
                return; // Not enabled, skip silently
            }
            
            // Create balloon manager (doesn't interfere with existing SMS)
            // DON'T enable it yet - let showSMSScreen() handle that
            this.balloonManager = new window.Sms3DBalloonManager(this.scene, this);
            
            console.log(`🎈 3D balloon manager created (not enabled) for ${this.contactData.name}`);
        } catch (error) {
            // Fail silently - don't break SMS functionality
            console.warn('🎈 Could not initialize 3D balloons (non-critical):', error.message);
        }
    }
    
    /**
     * Add message to 3D balloons (called when new message arrives)
     * This is separate from SMS screen and won't interfere
     */
    addMessageToBalloons(message) {
        try {
            if (this.balloonManager && this.balloonManager.isEnabled()) {
                this.balloonManager.addMessage(message);
            }
        } catch (error) {
            // Fail silently - don't break SMS functionality
            console.warn('🎈 Could not add message to balloons (non-critical):', error.message);
        }
    }
    
    /**
     * Toggle 3D balloon mode on/off (doesn't affect SMS screen)
     */
    toggle3DBalloonMode(enabled) {
        try {
            if (!this.balloonManager && enabled) {
                // User wants to enable, create manager
                this.balloonManager = new window.Sms3DBalloonManager(this.scene, this);
            }
            
            if (this.balloonManager) {
                this.balloonManager.setEnabled(enabled);
                console.log(`🎈 3D balloon mode ${enabled ? 'enabled' : 'disabled'} for ${this.contactData.name}`);
            }
        } catch (error) {
            console.warn('🎈 Could not toggle 3D balloon mode:', error.message);
        }
    }
}

