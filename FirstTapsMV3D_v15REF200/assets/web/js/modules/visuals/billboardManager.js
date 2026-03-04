// modules/visuals/billboardManager.js
// Dependencies: THREE (global), window.SharedStateManager
// Exports: window.BillboardManager

(function() {
    'use strict';
    
    console.log("Loading BillboardManager module...");
    
    class BillboardManager {
        constructor(THREE, scene, camera, stateManager) {
            this.THREE = THREE;
            this.scene = scene;
            this.camera = camera;
            this.stateManager = stateManager;
        }

        createTextTexture(text, fontSize = 44, color = '#000000', backgroundColor = 'transparent', fileSize = '', dateModified = '') {
            // Create a new canvas for each texture to avoid sharing issues
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Larger canvas to accommodate multiple lines of text
            const canvasWidth = 500;
            const canvasHeight = 180;
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // No frame - clean printed-on-object look
            
            // Black text for printed look - bold friendly font
            context.fillStyle = color;
            context.font = `bold ${fontSize}px "Comic Sans MS", "Trebuchet MS", Arial, sans-serif`; // Bold friendly font
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            // Main file name - centered vertically if no additional info
            let mainTextY = canvas.height / 2;
            let hasExtraInfo = fileSize || dateModified;
            
            if (hasExtraInfo) {
                // Adjust positions for multiple lines
                mainTextY = canvas.height * 0.35; // Move main text up
            }
            
            // Draw main file name
            context.fillText(text, canvas.width / 2, mainTextY);
            
            // Add file size and date if provided
            if (hasExtraInfo) {
                const smallerFont = Math.round(fontSize * 0.6); // 60% of main font size
                context.font = `bold ${smallerFont}px "Comic Sans MS", "Trebuchet MS", Arial, sans-serif`;
                
                if (fileSize) {
                    context.fillText(fileSize, canvas.width / 2, canvas.height * 0.58);
                }
                
                if (dateModified) {
                    context.fillText(dateModified, canvas.width / 2, canvas.height * 0.78);
                }
            }
            
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        }

        createInfoLabel(object) {
            // Get the file name from various possible sources
            const originalFileName = object.userData.fileName || 
                                    object.userData.fileData?.fileName ||
                                    object.userData.fileData?.name ||
                                    'Unknown';
            
            // Truncate file name to ~10 characters for readability
            const truncatedName = originalFileName.length > 10 ? 
                originalFileName.substring(0, 10) + '...' : 
                originalFileName;

            // Get file size and format it
            let fileSizeText = '';
            const fileSize = object.userData.fileData?.fileSize || 
                            object.userData.fileData?.size || 
                            object.userData.fileData?.length || 
                            object.userData.fileSize ||
                            object.userData.size;

            console.log('Billboard file size check:', fileSize, 'from object:', object.userData.fileName);
            if (fileSize && fileSize > 0) {
                if (fileSize < 1024 * 1024) {
                    // Files under 1MB show in KB
                    fileSizeText = `${Math.round(fileSize / 1024)} KB`;
                } else if (fileSize < 1024 * 1024 * 1024) {
                    // Files 1MB and above show in MB
                    fileSizeText = `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
                } else {
                    // Files 1GB and above show in GB
                    fileSizeText = `${(fileSize / (1024 * 1024 * 1024)).toFixed(1)} GB`;
                }
            }
            console.log('Formatted file size text:', fileSizeText);

            // Get date modified and format it with fallback logic
            let dateText = '';
            const now = Date.now();
            const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            
            let dateModified = object.userData.fileData?.lastModified || 
                              object.userData.fileData?.dateModified ||
                              object.userData.fileData?.modified ||
                              object.userData.dateModified ||
                              object.userData.lastModified;
            
            const dateCreated = object.userData.fileData?.created;
            
            // If lastModified is very recent (likely a copy) and we have an older created date, use created instead
            if (dateModified && dateCreated && 
                (now - dateModified) < recentThreshold && 
                dateCreated < dateModified) {
                console.log('Billboard date - using created date instead of lastModified (file appears to be recently copied)');
                console.log('Billboard date - lastModified:', dateModified, 'created:', dateCreated);
                dateModified = dateCreated;
            } else if (!dateModified && dateCreated) {
                // No lastModified, use created as fallback
                console.log('Billboard date - no lastModified, using created date');
                dateModified = dateCreated;
            }

            // NEW: Enhanced date processing with better capture date detection
            const fileExtension = object.userData.fileName ? 
                object.userData.fileName.split('.').pop()?.toLowerCase() : '';
            const isImageFile = fileExtension && 
                ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'dng', 'cr2', 'nef', 'arw', 'orf', 'rw2']
                .includes(fileExtension);
            
            console.log('=== BILLBOARD DATE ANALYSIS ===');
            console.log('File:', object.userData.fileName);
            console.log('Extension:', fileExtension, '| Is Image:', isImageFile);
            console.log('Available date fields in fileData:');
            if (object.userData.fileData) {
                console.log('  - lastModified:', object.userData.fileData.lastModified, typeof object.userData.fileData.lastModified);
                console.log('  - dateTimeOriginal:', object.userData.fileData.dateTimeOriginal, typeof object.userData.fileData.dateTimeOriginal);
                console.log('  - dateModified:', object.userData.fileData.dateModified, typeof object.userData.fileData.dateModified);
                // Check for other potential date fields
                Object.keys(object.userData.fileData).forEach(key => {
                    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
                        console.log(`  - ${key}:`, object.userData.fileData[key]);
                    }
                });
            }
            console.log('Direct dateModified parameter:', dateModified, typeof dateModified);
            
            let dateSource = 'unknown';
            
            // PRIORITY 1: For image files, try EXIF capture time (dateTimeOriginal)
            if (isImageFile && object.userData.fileData?.dateTimeOriginal && 
                object.userData.fileData.dateTimeOriginal !== null && 
                object.userData.fileData.dateTimeOriginal !== 'null' &&
                object.userData.fileData.dateTimeOriginal.trim() !== '') {
                try {
                    console.log('Using EXIF capture date:', object.userData.fileData.dateTimeOriginal);
                    // Parse EXIF date format: "YYYY:MM:DD HH:MM:SS"
                    const exifDateStr = object.userData.fileData.dateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                    console.log('Parsed EXIF date string:', exifDateStr);
                    const captureDate = new Date(exifDateStr);
                    console.log('Capture date object:', captureDate);

                    if (!isNaN(captureDate.getTime()) && captureDate.getFullYear() > 1990) { // Sanity check
                        // Format as "June 7, 2025 3:40pm (Captured)"
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                           'July', 'August', 'September', 'October', 'November', 'December'];
                        const month = monthNames[captureDate.getMonth()];
                        const day = captureDate.getDate();
                        const year = captureDate.getFullYear();
                        let hour = captureDate.getHours();
                        const minute = captureDate.getMinutes().toString().padStart(2, '0');
                        const ampm = hour >= 12 ? 'pm' : 'am';
                        hour = hour % 12;
                        hour = hour ? hour : 12; // 0 should be 12
                        dateText = `${month} ${day}, ${year} ${hour}:${minute}${ampm}`;
                        dateSource = 'EXIF capture';
                        console.log('✓ Successfully formatted EXIF capture date:', dateText);
                    } else {
                        console.log('✗ Invalid EXIF capture date, falling back');
                    }
                } catch (e) {
                    console.log('✗ Error parsing EXIF date:', e);
                }
            }

            // PRIORITY 2: Fall back to file modification date
            if (!dateText && dateModified) {
                try {
                    console.log('Using file modification date:', dateModified);
                    const fileDate = new Date(dateModified);
                    console.log('File modification date object:', fileDate);

                    if (!isNaN(fileDate.getTime())) {
                        // Format as "June 7, 2025 3:40pm"
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                           'July', 'August', 'September', 'October', 'November', 'December'];
                        const month = monthNames[fileDate.getMonth()];
                        const day = fileDate.getDate();
                        const year = fileDate.getFullYear();
                        let hour = fileDate.getHours();
                        const minute = fileDate.getMinutes().toString().padStart(2, '0');
                        const ampm = hour >= 12 ? 'pm' : 'am';
                        hour = hour % 12;
                        hour = hour ? hour : 12; // 0 should be 12
                        dateText = `${month} ${day}, ${year} ${hour}:${minute}${ampm}`;
                        dateSource = isImageFile ? 'file modified (no EXIF)' : 'file modified';
                        console.log('✓ Successfully formatted file modification date:', dateText);
                    } else {
                        console.log('✗ Invalid file modification date');
                    }
                } catch (e) {
                    console.log('✗ Error parsing file modification date:', e);
                }
            }

            // PRIORITY 3: Final fallback - current timestamp if no valid date found
            if (!dateText) {
                console.log('No valid dates found, using current timestamp');
                const now = new Date();
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                   'July', 'August', 'September', 'October', 'November', 'December'];
                const month = monthNames[now.getMonth()];
                const day = now.getDate();
                const year = now.getFullYear();
                let hour = now.getHours();
                const minute = now.getMinutes().toString().padStart(2, '0');
                const ampm = hour >= 12 ? 'pm' : 'am';
                hour = hour % 12;
                hour = hour ? hour : 12;
                dateText = `${month} ${day}, ${year} ${hour}:${minute}${ampm}`;
                dateSource = 'current time (fallback)';
                console.log('✓ Using fallback current date:', dateText);
            }

            console.log(`=== DATE RESULT: "${dateText}" (source: ${dateSource}) ===`);
            console.log('Formatted date text:', dateText);
            
            console.log('Final billboard data - File:', truncatedName, 'Size:', fileSizeText, 'Date:', dateText);
            
            const texture = this.createTextTexture(truncatedName, 44, '#000000', 'transparent', fileSizeText, dateText); // Slightly smaller font
            const material = new this.THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.7, // Higher alpha test for cleaner edges
                opacity: 1.0, // Full opacity for crisp text
                side: this.THREE.FrontSide, // Only show on the front side - no transparency through object
                depthTest: true, // Enable depth testing to prevent showing through other objects
                depthWrite: true, // Enable depth writing for proper occlusion
                blending: this.THREE.MultiplyBlending, // Blend text onto surface like printed ink
                polygonOffset: true, // Enable polygon offset to prevent z-fighting
                polygonOffsetFactor: -1, // Slight offset toward camera
                polygonOffsetUnits: -1
            });
            
            // Fixed size for side-attached panels - taller to accommodate multiple lines
            const panelWidth = 3.0;
            const panelHeight = 1.1;
            
            const geometry = new this.THREE.PlaneGeometry(panelWidth, panelHeight);
            
            // Handle different object geometries (box vs cylinder)
            const params = object.geometry.parameters;
            let objectWidth, objectHeight, isCylinder = false;
            
            if (params.radiusTop !== undefined || params.radius !== undefined) {
                // Cylinder geometry
                objectWidth = (params.radiusTop || params.radius) * 2;
                objectHeight = params.height || 1;
                isCylinder = true;
            } else {
                // Box geometry  
                objectWidth = params.width || 2;
                objectHeight = params.height || 1;
            }
            
            // Create a group to hold both side panels
            const labelGroup = new this.THREE.Group();
            
            // Create two labels - one for each side
            const rightLabel = new this.THREE.Mesh(geometry, material);
            const leftLabel = new this.THREE.Mesh(geometry, material.clone());

            // Position with better offset from object sides for proper depth testing
            const sideOffset = (objectWidth / 2) + 0.03; // Larger offset for better depth separation
            const heightOffset = 0; // Center vertically at the midpoint of the object
            
            // Right side panel
            rightLabel.position.set(sideOffset, heightOffset, 0);
            rightLabel.rotation.y = Math.PI / 2; // Face outward
            
            // Left side panel  
            leftLabel.position.set(-sideOffset, heightOffset, 0);
            leftLabel.rotation.y = -Math.PI / 2; // Face outward
            
            // For cylinders, add slight tilts for better visibility
            if (isCylinder) {
                rightLabel.rotation.x = -Math.PI / 12; // Slight downward tilt
                leftLabel.rotation.x = -Math.PI / 12; // Slight downward tilt
            }
            
            labelGroup.add(rightLabel);
            labelGroup.add(leftLabel);
            
            return labelGroup;
        }

        /**
         * Update only billboard info without processing face textures
         * Used for restored objects to preserve their visual state
         */
        updateBillboardOnly(object, fileData) {
            console.log('=== updateBillboardOnly called ===');
            console.log('Object:', fileData?.name || object.userData.fileName);
            console.log('Preserving existing face textures, updating billboard info only');
            
            const attachments = this.stateManager.labelObjectsMap.get(object.uuid) || {};

            // Handle info label only - don't touch face textures
            if (this.stateManager.currentDisplayOptions.showFileInfo) {
                if (!attachments.infoLabel) {
                    attachments.infoLabel = this.createInfoLabel(object);
                    object.add(attachments.infoLabel);
                }
                attachments.infoLabel.visible = true;
            } else if (attachments.infoLabel) {
                attachments.infoLabel.visible = false;
            }
            
            // Update the stored attachments (preserving existing face texture)
            this.stateManager.labelObjectsMap.set(object.uuid, attachments);
            
            console.log('Billboard-only update completed for:', fileData?.name || object.userData.fileName);
        }

        updateObjectVisuals(object, fileData) {
            const attachments = this.stateManager.labelObjectsMap.get(object.uuid) || {};
            
            // DEMO DEBUG: Log file data for demo files
            if (fileData?.isDemoContent) {
                if (window.shouldLog && window.shouldLog('thumbnails')) {
                    console.log('🎨 [DEMO] updateObjectVisuals called for demo file:', fileData.name);
                    console.log('🎨 [DEMO] fileData.thumbnailDataUrl exists:', !!fileData.thumbnailDataUrl);
                    console.log('🎨 [DEMO] thumbnailDataUrl length:', fileData.thumbnailDataUrl?.length || 0);
                }
            }

            // Handle info label
            if (this.stateManager.currentDisplayOptions.showFileInfo) {
                if (!attachments.infoLabel) {
                    attachments.infoLabel = this.createInfoLabel(object);
                    object.add(attachments.infoLabel);
                }
                attachments.infoLabel.visible = true;
                
                // Side-attached panels don't need to face the camera constantly
                // They maintain their side position and orientation for consistency
            } else if (attachments.infoLabel) {
                attachments.infoLabel.visible = false;
            }
            
            // Handle face textures (Phase 2 - real image/video textures) with CRITICAL loop prevention
            console.log('🎨 FACE TEXTURE DEBUG: Checking face texture setting - useFaceTextures:', this.stateManager.currentDisplayOptions.useFaceTextures);
            console.log('🎨 FACE TEXTURE DEBUG: Processing object:', fileData.fileName || fileData.name || object.userData.fileName);
            
            // Special handling for initial premium world switches - ensure face textures are processed correctly
            if (this.stateManager.currentDisplayOptions.useFaceTextures) {
                // CRITICAL: Check if object has already been processed to prevent infinite loops
                const objectId = object.uuid;
                const alreadyProcessed = this.stateManager.processedTextureObjects.has(objectId);
                const textureExists = attachments.faceTexture && attachments.faceTexture !== 'PROCESSING';
                
                console.log('🎨 FACE TEXTURE DEBUG: Object ID:', objectId);
                console.log('🎨 FACE TEXTURE DEBUG: Already processed:', alreadyProcessed);
                console.log('🎨 FACE TEXTURE DEBUG: Texture exists:', textureExists);
                console.log('🎨 FACE TEXTURE DEBUG: Current faceTexture value:', attachments.faceTexture);
                
                if (!textureExists && !alreadyProcessed) {
                    console.log('Face textures enabled, processing NEW object:', fileData.fileName || fileData.name || object.userData.fileName);
                    
                    // Mark as processed IMMEDIATELY to prevent re-processing
                    this.stateManager.processedTextureObjects.add(objectId);
                    
                    // Phase 2: Try to use actual thumbnail data for texture
                    if (fileData.thumbnailDataUrl) {
                        console.log('Creating face texture from thumbnail data for:', fileData.fileName || fileData.name || object.userData.fileName);
                        
                        // CRITICAL: Set a placeholder to prevent re-processing during async operation
                        attachments.faceTexture = 'PROCESSING';
                        this.stateManager.labelObjectsMap.set(object.uuid, attachments);
                        
                        // Handle async texture creation WITHOUT triggering updateAllObjectVisuals
                        this.createImageFaceTexture(object, fileData.thumbnailDataUrl).then(texture => {
                            // Get fresh attachments in case they changed
                            const currentAttachments = this.stateManager.labelObjectsMap.get(object.uuid) || attachments;
                            
                            if (texture) {
                                console.log('Successfully created image face texture, applying to object');
                                currentAttachments.faceTexture = texture;
                                this.applyFaceTexture(object, texture, 4);
                                // Update the stored attachments
                                this.stateManager.labelObjectsMap.set(object.uuid, currentAttachments);
                                
                                console.log('Face texture applied successfully for:', object.userData.fileName);
                                
                            } else {
                                console.warn('Failed to create image texture, falling back to colored texture');
                                // Fallback to Phase 1 colored textures
                                this.createAndApplyColoredFaceTexture(object, fileData, currentAttachments);
                            }
                        }).catch(error => {
                            console.error('Error in image texture creation:', error);
                            // Get fresh attachments and fallback
                            const currentAttachments = this.stateManager.labelObjectsMap.get(object.uuid) || attachments;
                            this.createAndApplyColoredFaceTexture(object, fileData, currentAttachments);
                        });
                        
                    } else {
                        console.log('🎨 FACE TEXTURE DEBUG: No thumbnail data available, checking for contact or audio face texture for:', fileData.fileName || fileData.name || object.userData.fileName);
                        
                        // CONTACT FACE TEXTURE SYSTEM: Check if this is a contact object first
                        if (this.isContactObject(object, fileData)) {
                            console.log('📱 Contact object detected, using ContactTextureCreator');
                            
                            try {
                                const contactData = this.extractContactDataFromObject(object, fileData);
                                
                                if (window.ContactTextureCreator) {
                                    const contactTexture = window.ContactTextureCreator.createContactFaceTexture(contactData);
                                    
                                    if (contactTexture) {
                                        console.log('📱 Successfully created contact face texture');
                                        attachments.faceTexture = contactTexture;
                                        this.applyFaceTexture(object, contactTexture, 4);
                                        this.stateManager.labelObjectsMap.set(object.uuid, attachments);
                                    } else {
                                        console.warn('📱 Failed to create contact texture, falling back to colored texture');
                                        this.createAndApplyColoredFaceTexture(object, fileData, attachments);
                                    }
                                } else {
                                    console.warn('📱 ContactTextureCreator not available, falling back to colored texture');
                                    this.createAndApplyColoredFaceTexture(object, fileData, attachments);
                                }
                                
                            } catch (error) {
                                console.error('📱 Error creating contact face texture:', error);
                                this.createAndApplyColoredFaceTexture(object, fileData, attachments);
                            }
                            
                        } 
                        // AUDIO FACE TEXTURE SYSTEM: Check if this is an audio file that supports face textures
                        else if (window.AudioFaceTextureManager && this.isAudioFileForFaceTexture(object, fileData)) {
                            console.log('Applying audio face texture for:', fileData.fileName || fileData.name);
                            
                            try {
                                // Initialize audio face texture manager if needed
                                if (!this.audioFaceTextureManager) {
                                    this.audioFaceTextureManager = new window.AudioFaceTextureManager(this.THREE);
                                    console.log('Initialized AudioFaceTextureManager');
                                }
                                
                                // Apply audio face texture to cylinder
                                const success = this.audioFaceTextureManager.applyFaceTextureToAudioCylinder(object, fileData);
                                
                                if (success) {
                                    console.log('✅ Successfully applied audio face texture to:', fileData.fileName || fileData.name);
                                    attachments.faceTexture = 'AUDIO_TEXTURE_APPLIED'; // Mark as having audio texture
                                } else {
                                    console.warn('⚠️ Failed to apply audio face texture, falling back to colored texture');
                                    this.createAndApplyColoredFaceTexture(object, fileData, attachments);
                                }
                                
                            } catch (error) {
                                console.error('❌ Error applying audio face texture:', error);
                                // Fallback to colored texture
                                this.createAndApplyColoredFaceTexture(object, fileData, attachments);
                            }
                            
                        } 
                        // DOCUMENT FACE TEXTURE SYSTEM: Check if this is a document file that supports face textures
                        else if (window.documentFaceTextureManager && window.documentFaceTextureManager.isDocumentFile) {
                            const fileName = fileData.fileName || fileData.name || object.userData.fileName;
                            
                            if (window.documentFaceTextureManager.isDocumentFile(fileName)) {
                                console.log('📄 Document file detected, applying document face texture for:', fileName);
                                
                                try {
                                    const success = window.documentFaceTextureManager.applyDocumentFaceTexture(object, fileName);
                                    
                                    if (success) {
                                        console.log('📄 ✅ Successfully applied document face texture');
                                        attachments.faceTexture = 'DOCUMENT_TEXTURE_APPLIED'; // Mark as having document texture
                                        this.stateManager.labelObjectsMap.set(object.uuid, attachments);
                                    } else {
                                        console.warn('📄 ⚠️ Failed to apply document face texture, falling back to colored texture');
                                        this.createAndApplyColoredFaceTexture(object, fileData, attachments);
                                    }
                                    
                                } catch (error) {
                                    console.error('📄 ❌ Error applying document face texture:', error);
                                    this.createAndApplyColoredFaceTexture(object, fileData, attachments);
                                }
                            } else {
                                console.log('🎨 FACE TEXTURE DEBUG: Not a document file, using colored texture for:', fileName);
                                this.createAndApplyColoredFaceTexture(object, fileData, attachments);
                            }
                            
                        } else {
                            console.log('🎨 FACE TEXTURE DEBUG: Not a contact/audio/document file, using colored texture for:', fileData.fileName || fileData.name || object.userData.fileName);
                            // Fallback to Phase 1 colored textures
                            this.createAndApplyColoredFaceTexture(object, fileData, attachments);
                        }
                    }
                } else {
                    // Object already processed or texture exists - SKIP to prevent loops
                    console.log('🎨 FACE TEXTURE DEBUG: Skipping object - already processed or texture exists');
                    if (alreadyProcessed) {
                        console.log('🎨 FACE TEXTURE DEBUG: Object already processed for face texture:', fileData.fileName, '- skipping');
                    }
                    if (textureExists) {
                        console.log('🎨 FACE TEXTURE DEBUG: Face texture already exists for:', fileData.fileName, '- skipping');
                    }
                }
            } else if (attachments.faceTexture && attachments.faceTexture !== 'PROCESSING') {
                // Remove face texture and restore original material
                console.log('🎨 FACE TEXTURE DEBUG: Face textures disabled, removing texture from:', fileData.fileName);
                this.removeFaceTexture(object);
                attachments.faceTexture = null;
                // Remove from processed set so it can be re-processed if enabled again
                this.stateManager.processedTextureObjects.delete(object.uuid);
            } else {
                console.log('🎨 FACE TEXTURE DEBUG: Face textures are DISABLED for:', fileData.fileName || fileData.name || object.userData.fileName);
            }
            
            this.stateManager.labelObjectsMap.set(object.uuid, attachments);
        }

        updateAllObjectVisuals() {
            // CRITICAL: Prevent infinite loops with processing flag
            if (this.stateManager.isProcessingVisuals) {
                console.warn('updateAllObjectVisuals already in progress - preventing infinite loop');
                return;
            }
            
            // CRITICAL: Throttle updates when face textures are enabled to prevent spam
            const now = Date.now();
            if (this.stateManager.currentDisplayOptions.useFaceTextures) {
                if (now - this.stateManager.lastVisualsUpdate < this.stateManager.visualsUpdateInterval) {
                    return; // Skip this update to throttle
                }
                this.stateManager.lastVisualsUpdate = now;
            }
            
            console.log('=== STARTING updateAllObjectVisuals ===');
            this.stateManager.isProcessingVisuals = true;

            try {
                this.stateManager.fileObjects.forEach(object => {
                    // Use the complete fileData stored in userData, fallback to partial data if needed
                    const fileData = object.userData.fileData || { 
                        fileName: object.userData.fileName,
                        name: object.userData.fileName,
                        extension: object.userData.extension,
                        thumbnailDataUrl: object.userData.thumbnailDataUrl 
                    };
                    
                    this.updateObjectVisuals(object, fileData);
                    
                    // Side-attached panels don't need to constantly face the camera
                    // They maintain their side position for consistent viewing
                });
            } catch (error) {
                console.error('Error in updateAllObjectVisuals:', error);
            } finally {
                this.stateManager.isProcessingVisuals = false;
                console.log('=== COMPLETED updateAllObjectVisuals ===');
            }
        }

        // ============================================================================
        // FACE TEXTURE SYSTEM - Phase 2: Real image/video textures with fallback
        // ============================================================================
        
        createImageFaceTexture(object, thumbnailDataUrl) {
            try {
                console.log('=== CREATING IMAGE FACE TEXTURE ===');
                console.log('Object:', object.userData.fileName);
                console.log('Thumbnail data URL length:', thumbnailDataUrl ? thumbnailDataUrl.length : 0);
                
                if (!thumbnailDataUrl) {
                    console.error('No thumbnail data URL provided');
                    return null;
                }
                
                // Create a canvas to load and process the image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                return new Promise((resolve) => {
                    img.onload = () => {
                        try {
                            console.log('Image loaded, dimensions:', img.width, 'x', img.height);
                            
                            // Set canvas size (square for consistent face texture)
                            const size = 256; // Fixed size for consistency
                            canvas.width = size;
                            canvas.height = size;
                            
                            // CRITICAL FIX: Draw image to cover entire canvas (full screen mode)
                            // This ensures face textures completely fill the object face without letterboxing
                            const aspectRatio = img.width / img.height;
                            let drawWidth = size;
                            let drawHeight = size;
                            let offsetX = 0;
                            let offsetY = 0;
                            
                            if (aspectRatio > 1) {
                                // Image is wider than tall - scale to height and crop sides
                                drawWidth = size * aspectRatio;
                                offsetX = -(drawWidth - size) / 2;
                            } else {
                                // Image is taller than wide - scale to width and crop top/bottom
                                drawHeight = size / aspectRatio;
                                offsetY = -(drawHeight - size) / 2;
                            }
                            
                            // No background needed since image will fill entire canvas
                            // Draw the image to completely fill the canvas (crop if necessary)
                            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                            
                            // Create Three.js texture from canvas
                            const texture = new this.THREE.CanvasTexture(canvas);
                            texture.needsUpdate = true;
                            texture.wrapS = this.THREE.ClampToEdgeWrapping;
                            texture.wrapT = this.THREE.ClampToEdgeWrapping;
                            
                            console.log('Successfully created image face texture');
                            resolve(texture);
                            
                        } catch (error) {
                            console.error('Error processing image for face texture:', error);
                            resolve(null);
                        }
                    };
                    
                    img.onerror = () => {
                        console.error('Failed to load image for face texture');
                        resolve(null);
                    };
                    
                    img.src = thumbnailDataUrl;
                });
                
            } catch (error) {
                console.error('Error creating image face texture:', error);
                return null;
            }
        }

        createAndApplyColoredFaceTexture(object, fileData, attachments) {
            // Extract file name using same logic as billboard system
            const originalFileName = object.userData.fileName || 
                                    object.userData.fileData?.fileName ||
                                    object.userData.fileData?.name ||
                                    fileData.fileName || 
                                    fileData.name || 
                                    'Unknown';
            
            console.log('🎨 FACE TEXTURE: Creating colored face texture for:', originalFileName);
            console.log('🎨 FACE TEXTURE: Object userData:', object.userData);
            console.log('🎨 FACE TEXTURE: FileData:', fileData);
            
            // CRITICAL: Mark as processing to prevent loops
            attachments.faceTexture = 'PROCESSING';
            this.stateManager.labelObjectsMap.set(object.uuid, attachments);

            // Create a simple colored texture based on file type (Phase 1 logic)
            const isImage = originalFileName && /\.(jpg|jpeg|png|gif|bmp)$/i.test(originalFileName);
            const isVideo = originalFileName && /\.(mp4|mov|webm|avi)$/i.test(originalFileName);
            
            // Enhanced color scheme for different file types
            let faceColor = 0x666666; // Default gray

            if (isImage) {
                faceColor = 0x4CAF50; // Green for images
                console.log('Detected image file, using green texture');
            } else if (isVideo) {
                faceColor = 0x2196F3; // Blue for videos  
                console.log('Detected video file, using blue texture');
            } else {
                // Specific colors for document types - try extension property first, then extract from filename
                const ext = fileData.extension || (originalFileName.includes('.') ? originalFileName.substring(originalFileName.lastIndexOf('.')).toLowerCase() : '');
                console.log('Processing document type - fileName:', originalFileName, 'extension:', ext);
                
                if (ext.includes('.pdf') || ext === '.pdf') {
                    faceColor = 0xff4444; // Red for PDF (same as base object color)
                    console.log('Setting PDF color to red:', faceColor.toString(16));
                } else if (ext.includes('.doc') || ext.includes('.docx')) {
                    faceColor = 0x2196F3; // Blue for Word docs
                } else if (ext.includes('.xls') || ext.includes('.xlsx')) {
                    faceColor = 0x4CAF50; // Green for Excel
                } else if (ext.includes('.ppt') || ext.includes('.pptx')) {
                    faceColor = 0xFF9800; // Orange for PowerPoint
                } else if (ext.includes('.txt')) {
                    faceColor = 0x9E9E9E; // Gray for text files
                } else if (ext.includes('.zip') || ext.includes('.rar')) {
                    faceColor = 0x795548; // Brown for archives
                } else if (ext.includes('.mp3') || ext.includes('.wav') || ext === '.mp3' || ext === '.wav') {
                    faceColor = 0x9C27B0; // Purple for audio
                } else {
                    console.log('Unknown document type, using default gray for:', ext);
                }
            }

            // Extract file extension for display
            const extension = fileData.extension ? 
                fileData.extension.replace('.', '').toUpperCase() :
                (originalFileName.includes('.') ? originalFileName.split('.').pop().toUpperCase() : 'FILE');
            
            console.log('🎨 FACE TEXTURE: Creating colored face texture for:', originalFileName, 'color:', faceColor.toString(16), 'extension:', extension);
            console.log('🎨 FACE TEXTURE: About to call createFaceTexture with fileName:', originalFileName);
            const colorTexture = this.createFaceTexture(object, {
                faceColor: faceColor,
                enabled: true,
                faceIndex: 4, // Front face
                fileExtension: extension, // Add file extension for display
                fileName: originalFileName // Add filename for display (same as billboard system)
            });
            
            if (colorTexture) {
                console.log('🎨 FACE TEXTURE: ✅ Colored face texture created, applying to object');
                attachments.faceTexture = colorTexture;
                this.applyFaceTexture(object, colorTexture, 4);
                // Update stored attachments
                this.stateManager.labelObjectsMap.set(object.uuid, attachments);
            } else {
                console.error('🎨 FACE TEXTURE: ❌ Failed to create colored face texture');
                // Clear the processing flag
                attachments.faceTexture = null;
                this.stateManager.labelObjectsMap.set(object.uuid, attachments);
            }
        }

        createFaceTexture(object, options = {}) {
            // Enhanced: Create texture with filename and extension for document files
            const { 
                faceColor = 0x444444, 
                enabled = false,
                faceIndex = 4, // Default to front face (positive Z)
                fileExtension = 'FILE', // File type to display
                fileName = null // File name to display (new parameter)
            } = options;
            
            if (!enabled) return null;
            
            console.log('🎨 FACE TEXTURE: Creating enhanced face texture with filename:', fileName, 'extension:', fileExtension, 'color:', faceColor.toString(16));
            
            // Create a larger, more visible texture
            const canvas = document.createElement('canvas');
            canvas.width = 512;  // Increased from 256
            canvas.height = 512; // Increased from 256
            const context = canvas.getContext('2d');
            
            // Fill with the specified color
            const color = `#${faceColor.toString(16).padStart(6, '0')}`;
            context.fillStyle = color;
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add a very visible thick border
            context.strokeStyle = '#000000'; // Black border
            context.lineWidth = 20; // Much thicker border
            context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
            
            // Add inner white border for contrast
            context.strokeStyle = '#ffffff';
            context.lineWidth = 10;
            context.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
            
            // Add text with shadow for better readability
            context.fillStyle = '#ffffff';
            context.textAlign = 'center';
            context.shadowColor = '#000000';
            context.shadowOffsetX = 3;
            context.shadowOffsetY = 3;
            context.shadowBlur = 6;
            
            // Define displayName outside the if block to avoid ReferenceError
            let displayName = null;
            
            if (fileName) {
                // Display filename (large) and extension (smaller) - like contact objects
                console.log('🎨 FACE TEXTURE: Processing filename for front face:', fileName);
                
                // Extract filename without extension and truncate to 11 characters
                displayName = fileName;
                if (displayName.includes('.')) {
                    displayName = displayName.substring(0, displayName.lastIndexOf('.'));
                }
                if (displayName.length > 11) {
                    displayName = displayName.substring(0, 11); // Truncate to 11 chars, no ellipsis
                }
                
                console.log('🎨 FACE TEXTURE: Final display name for front face:', displayName);
                
                // File name (large font)
                context.font = 'bold 65px Arial';
                const nameY = canvas.height / 2 - 30;
                context.fillText(displayName, canvas.width / 2, nameY);
                
                // File extension (smaller font, below name)
                context.font = 'bold 45px Arial';
                const extY = canvas.height / 2 + 40;
                context.fillText(fileExtension, canvas.width / 2, extY);
                
            } else {
                // Fallback: Just display extension (original behavior)
                context.font = 'bold 80px Arial'; // Large font for file type
                context.fillText(fileExtension, canvas.width / 2, canvas.height / 2);
                
                // Smaller "FILE" text below if it's a longer extension
                if (fileExtension.length > 4) {
                    context.font = 'bold 40px Arial';
                    context.fillText('FILE', canvas.width / 2, canvas.height / 2 + 60);
                }
            }
            
            // Create texture from canvas
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;

            console.log('🎨 FACE TEXTURE: ✅ Enhanced face texture created with filename:', displayName || 'none', 'extension:', fileExtension);
            return texture;
        }

        applyFaceTexture(object, texture, faceIndex = 4) {
            console.log('=== APPLY FACE TEXTURE ===');
            console.log('Object:', object ? object.userData.fileName : 'null');
            console.log('Texture:', texture);
            console.log('Face index:', faceIndex);
            
            if (!texture || !object.material) {
                console.error('Missing texture or object material');
                return;
            }

            console.log('Applying face texture to object:', object.userData.fileName, 'face index:', faceIndex);

            // CRITICAL FIX: Store original material properly and preserve base color info
            if (!object.userData.originalMaterial) {
                // Handle both single material and material array
                if (Array.isArray(object.material)) {
                    console.log('Storing original material array with', object.material.length, 'materials');
                    object.userData.originalMaterial = object.material.map(mat => mat.clone());
                    // Use the stored original base color from object creation, not the current material color
                    if (!object.userData.originalBaseColor && object.material[0].color) {
                        object.userData.originalBaseColor = object.material[0].color.getHex();
                    }
                } else {
                    console.log('Storing original single material');
                    object.userData.originalMaterial = object.material.clone();
                    // Use the stored original base color from object creation, not the current material color
                    if (!object.userData.originalBaseColor && object.material.color) {
                        object.userData.originalBaseColor = object.material.color.getHex();
                    }
                }
                console.log('Stored original material with base color:', object.userData.originalBaseColor ? object.userData.originalBaseColor.toString(16) : 'none');
            } else {
                // CRITICAL FIX: If original material is already stored but current material is array,
                // this might be a restored object - handle gracefully
                if (Array.isArray(object.material) && !Array.isArray(object.userData.originalMaterial)) {
                    console.log('Detected restored object with material array, using first material as base');
                    // For restored objects, if they already have a material array, we'll work with it
                }
            }
            
            // CRITICAL: Preserve all object properties before material change
            const originalUserData = { ...object.userData };
            const originalVisible = object.visible;
            const originalCastShadow = object.castShadow;
            const originalReceiveShadow = object.receiveShadow;

            // Create materials array for multi-material approach
            const materials = [];
            const originalMaterial = object.userData.originalMaterial;
            
            // Get base material properties (use first material if it's an array)
            const baseMaterial = Array.isArray(originalMaterial) ? originalMaterial[0] : originalMaterial;
            
            console.log('Creating materials array for 6 faces...');
            
            // Create 6 materials for each face of the cube
            for (let i = 0; i < 6; i++) {
                if (i === faceIndex) {
                    // Apply texture to specified face
                    const texturedMaterial = new this.THREE.MeshStandardMaterial({
                        map: texture,
                        metalness: baseMaterial.metalness || 0.3,
                        roughness: baseMaterial.roughness || 0.6,
                        // CRITICAL: Anti-flicker settings for stable face textures
                        transparent: false,  // Reduces flicker
                        opacity: 1.0,
                        side: this.THREE.FrontSide,  // Reduces artifacts
                        // CRITICAL: Enable proper depth handling with polygon offset to prevent z-fighting
                        depthTest: true,  // Must be true for proper rendering
                        depthWrite: true,  // Must be true for proper rendering
                        polygonOffset: true,  // Prevent z-fighting/flickering
                        polygonOffsetFactor: -1,  // Pull texture slightly towards camera
                        polygonOffsetUnits: -1   // Additional stability
                    });
                    materials.push(texturedMaterial);
                    console.log('Applied texture to face:', i);
                } else {
                    // Use original material for other faces - handle array vs single material
                    let clonedMaterial;
                    
                    try {
                        if (Array.isArray(originalMaterial)) {
                            // If original was an array, use the corresponding material or fall back to first
                            const sourceMaterial = originalMaterial[i] || originalMaterial[0];
                            if (sourceMaterial && typeof sourceMaterial.clone === 'function') {
                                clonedMaterial = sourceMaterial.clone();
                            } else {
                                console.warn(`Invalid source material at index ${i}, creating fallback with original color`);
                                // CRITICAL FIX: Use the stored original base color instead of trying to extract from baseMaterial
                                const fallbackColor = object.userData.originalBaseColor || 
                                                     (baseMaterial.color ? baseMaterial.color.getHex() : 0x888888);
                                clonedMaterial = new this.THREE.MeshLambertMaterial({ 
                                    color: fallbackColor 
                                });
                            }
                        } else {
                            // Single material case
                            if (originalMaterial && typeof originalMaterial.clone === 'function') {
                                clonedMaterial = originalMaterial.clone();
                            } else {
                                console.warn('Invalid original material, creating fallback with base color');
                                // CRITICAL FIX: Use the stored original base color instead of trying to extract from baseMaterial
                                const fallbackColor = object.userData.originalBaseColor || 
                                                     (baseMaterial.color ? baseMaterial.color.getHex() : 0x888888);
                                clonedMaterial = new this.THREE.MeshLambertMaterial({ 
                                    color: fallbackColor 
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error cloning material:', error);
                        console.log('originalMaterial type:', typeof originalMaterial, 'isArray:', Array.isArray(originalMaterial));
                        console.log('originalMaterial:', originalMaterial);
                        // CRITICAL FIX: Use the stored original base color instead of trying to extract from baseMaterial
                        const fallbackColor = object.userData.originalBaseColor || 
                                             (baseMaterial.color ? baseMaterial.color.getHex() : 0x888888);
                        clonedMaterial = new this.THREE.MeshLambertMaterial({ 
                            color: fallbackColor 
                        });
                    }
                    
                    // Ensure interaction properties are preserved
                    if (clonedMaterial) {
                        clonedMaterial.depthTest = true;
                        clonedMaterial.depthWrite = true;
                        materials.push(clonedMaterial);
                    } else {
                        // Ultimate fallback - use stored base color
                        const fallbackColor = object.userData.originalBaseColor || 
                                             (baseMaterial.color ? baseMaterial.color.getHex() : 0x888888);
                        materials.push(new this.THREE.MeshLambertMaterial({ 
                            color: fallbackColor 
                        }));
                    }
                }
            }
            
            // Apply multi-material to object
            object.material = materials;
            
            // CRITICAL: Restore all object properties after material change
            object.userData = originalUserData;
            object.visible = originalVisible;
            object.castShadow = originalCastShadow;
            object.receiveShadow = originalReceiveShadow;
            
            console.log('Multi-material applied to object - materials count:', materials.length);
            console.log('Object properties restored - userData.fileName:', object.userData.fileName);
            console.log('Object ID preserved:', object.userData.id);
            console.log('=== FACE TEXTURE APPLIED ===');
        }

        removeFaceTexture(object) {
            if (!object || !object.userData) return;
            
            console.log('Removing face texture from object:', object.userData.fileName);
            
            // Dispose of face textures if they exist
            if (Array.isArray(object.material)) {
                object.material.forEach((material, index) => {
                    if (material.map && material.map.dispose) {
                        console.log(`Disposing texture for face ${index} on:`, object.userData.fileName);
                        material.map.dispose();
                    }
                });
            } else if (object.material && object.material.map && object.material.map.dispose) {
                console.log('Disposing single material texture for:', object.userData.fileName);
                object.material.map.dispose();
            }
            
            // Restore original material if available
            if (object.userData.originalMaterial) {
                console.log('Restoring original material for:', object.userData.fileName);
                object.material = object.userData.originalMaterial;
                delete object.userData.originalMaterial;
            }

            console.log('Face texture cleanup completed for:', object.userData.fileName);
        }

        /**
         * Check if object is an audio file that supports face textures
         * @param {THREE.Mesh} object - The 3D object to check
         * @param {Object} fileData - File data containing name and extension info
         * @returns {boolean} - True if this is an audio file that can have face textures
         */
        isAudioFileForFaceTexture(object, fileData) {
            // Check if object has cylinder geometry (audio files are cylinders)
            const isCylinder = object.geometry && object.geometry.type === 'CylinderGeometry';
            
            if (!isCylinder) {
                return false;
            }
            
            // Check if file extension indicates audio file
            const filename = fileData.name || fileData.fileName || '';
            const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'];
            const extension = filename.split('.').pop()?.toLowerCase();
            
            const isAudioFile = audioExtensions.includes(extension);
            
            console.log(`Audio face texture check for ${filename}: isCylinder=${isCylinder}, isAudioFile=${isAudioFile}, extension=${extension}`);
            
            return isAudioFile;
        }

        /**
         * Check if an object is a contact object
         * @param {THREE.Object3D} object - The 3D object to check
         * @param {Object} fileData - The file data associated with the object
         * @returns {boolean} - True if this is a contact object
         */
        isContactObject(object, fileData) {
            // Method 1: Check userData for contact type
            if (object && object.userData) {
                if (object.userData.type === 'fileObject' && object.userData.subType === 'contact') {
                    console.log('📱 Contact detected via userData (fileObject/contact)');
                    return true;
                }
                if (object.userData.type === 'contact' || object.userData.isContact) {
                    console.log('📱 Contact detected via userData (legacy contact type)');
                    return true;
                }
            }
            
            // Method 2: Check fileData for contact indicators
            if (fileData) {
                if (fileData.extension === '.contact' || fileData.extension === 'contact') {
                    console.log('📱 Contact detected via extension (.contact)');
                    return true;
                }
                if (fileData.mimeType && fileData.mimeType.startsWith('contact:')) {
                    console.log('📱 Contact detected via mimeType (contact:)');
                    return true;
                }
                if (fileData.fileName && fileData.fileName.endsWith('.contact')) {
                    console.log('📱 Contact detected via fileName (.contact)');
                    return true;
                }
            }
            
            // Method 3: Check if object is in contact manager
            if (window.app && window.app.contactManager) {
                const contacts = window.app.contactManager.getAllContacts();
                const isInContactManager = contacts.some(contact => contact.mesh === object);
                if (isInContactManager) {
                    console.log('📱 Contact detected via ContactManager lookup');
                    return true;
                }
            }
            
            return false;
        }

        /**
         * Extract contact data from object and fileData
         * @param {THREE.Object3D} object - The 3D object
         * @param {Object} fileData - The file data
         * @returns {Object} - Contact data object
         */
        extractContactDataFromObject(object, fileData) {
            const contactData = {
                id: 'unknown',
                name: 'Unknown Contact',
                phoneNumber: 'No Phone',
                avatar: null
            };
            
            // Extract from userData
            if (object && object.userData) {
                contactData.id = object.userData.contactId || object.userData.id || contactData.id;
                contactData.name = object.userData.fileName || object.userData.contactName || contactData.name;
                contactData.phoneNumber = object.userData.phoneNumber || contactData.phoneNumber;
                contactData.avatar = object.userData.avatar || contactData.avatar;
            }
            
            // Extract from fileData
            if (fileData) {
                if (fileData.mimeType && fileData.mimeType.startsWith('contact:')) {
                    contactData.id = fileData.mimeType.replace('contact:', '');
                }
                contactData.name = fileData.cameraMake || fileData.name || contactData.name;
                contactData.phoneNumber = fileData.cameraModel || contactData.phoneNumber;
                contactData.avatar = fileData.thumbnailDataUrl || contactData.avatar;
            }
            
            console.log('📱 Extracted contact data:', contactData);
            return contactData;
        }

        // Update all billboards orientation (for side-attached panels, minimal updates needed)
        updateBillboardOrientations() {
            // Only update if we have all required components and file info is enabled
            if (!this.camera || !this.stateManager || !this.stateManager.currentDisplayOptions.showFileInfo) return;
            
            // Throttle updates to avoid performance issues
            const now = Date.now();
            if (!this.lastBillboardUpdate) this.lastBillboardUpdate = 0;
            if (now - this.lastBillboardUpdate < 200) return; // Reduced frequency for side panels
            this.lastBillboardUpdate = now;
            
            try {
                this.stateManager.labelObjectsMap.forEach((attachments, objectId) => {
                    if (attachments.infoLabel && attachments.infoLabel.visible) {
                        // Side-attached panels maintain their position and don't need constant reorientation
                        // They are designed to be readable from a side view
                        // No lookAt() call needed - keeps performance high and avoids visual jitter
                    }
                });
            } catch (error) {
                console.warn('Error updating billboard orientations:', error);
            }
        }
    }

    // Make globally accessible
    window.BillboardManager = BillboardManager;
    
    console.log("BillboardManager module loaded successfully");
})();
