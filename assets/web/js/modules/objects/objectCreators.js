// modules/objects/objectCreators.js
// Dependencies: THREE (global), window.SharedStateManager (for material management)
// Exports: window.ObjectCreator

(function() {
    'use strict';
    
    console.log("Loading ObjectCreator module...");
    
    // ============================================================================
    // OBJECT CREATION AND MANAGEMENT
    // ============================================================================
    class ObjectCreator {
        constructor(THREE) {
            this.THREE = THREE;
            this.initializeElegantMaterials();
        }

        // Initialize reusable materials for elegant containers
        initializeElegantMaterials() {
            // Create realistic grip texture for top surfaces
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // Create realistic brushed metal background
            const gradient = ctx.createLinearGradient(0, 0, 64, 64);
            gradient.addColorStop(0, '#C0C0C0');
            gradient.addColorStop(0.5, '#A0A0A0');
            gradient.addColorStop(1, '#C0C0C0');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 64, 64);
            
            // Add subtle grip dots with shadow effect
            ctx.fillStyle = '#909090';
            for (let x = 8; x < 64; x += 12) {
                for (let y = 8; y < 64; y += 12) {
                    // Shadow
                    ctx.beginPath();
                    ctx.arc(x + 0.5, y + 0.5, 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Highlight
                    ctx.fillStyle = '#D0D0D0';
                    ctx.beginPath();
                    ctx.arc(x - 0.5, y - 0.5, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#909090';
                }
            }
            
            this.gripTexture = new this.THREE.CanvasTexture(canvas);
            this.gripTexture.wrapS = this.gripTexture.wrapT = this.THREE.RepeatWrapping;
            this.gripTexture.repeat.set(2, 2);

            // Base metallic material for tops and edges with enhanced realism
            this.baseMetal = {
                metalness: 0.95, // Very metallic
                roughness: 0.05, // Very shiny
                color: 0xAAAAAA,
                emissive: 0x333333,
                emissiveIntensity: 0.03,
                envMapIntensity: 1.0 // Enhance reflections if environment map is available
            };
            
            // Special metallic finishes with enhanced realism
            this.specialMetals = {
                silver: { // For images
                    color: 0xD3D3D3,
                    metalness: 0.98,
                    roughness: 0.02,
                    emissive: 0x505050,
                    emissiveIntensity: 0.04,
                    envMapIntensity: 1.2
                },
                gold: { // For movies
                    color: 0xFFD900,
                    metalness: 0.95,
                    roughness: 0.05,
                    emissive: 0x554400,
                    emissiveIntensity: 0.05,
                    envMapIntensity: 1.1
                }
            };
        }

        createCubeMesh(pos, width, height, depth, colorHex, fileName, fileId, extension = null, fileData = null) {
            // Ensure minimum size for touch targets - increased for larger media objects
            const minSize = 4.0;
            width = Math.max(width, minSize);
            height = Math.max(height, minSize * 0.8);
            // Keep original depth for thin media objects - don't enforce thick minimum
            depth = Math.max(depth, 0.2); // Allow thin objects like images/videos
            
            // Extract extension if not provided
            if (!extension && fileName) {
                const dotIndex = fileName.lastIndexOf('.');
                if (dotIndex !== -1) {
                    extension = fileName.substring(dotIndex).toLowerCase();
                }
            }

            // ELEGANT CONTAINER DESIGN: Main body with rounded edges
            const mainHeight = height * 0.8;
            const baseGeometry = new this.THREE.BoxGeometry(width, mainHeight, depth);

            // Colorful side panels with subtle metallic sheen - vibrant but elegant
            const sideMaterial = new this.THREE.MeshStandardMaterial({ 
                color: colorHex, 
                metalness: 0.3, // More metallic than before
                roughness: 0.2, // Shinier surface
                emissive: colorHex,
                emissiveIntensity: 0.05 // Subtle glow
            });

            // Use Dart-provided y if present, otherwise default to height/2
            const y = (pos.y !== undefined && pos.y !== null) ? pos.y : height / 2;
            const finalY = (y <= 0) ? height / 2 : y;
            
            console.log('Placing elegant container', fileName, 'at X:', pos.x, 'Y:', pos.y, 'Z:', pos.z, 'using final Y:', finalY);
            const base = new this.THREE.Mesh(baseGeometry, sideMaterial);
            base.position.set(pos.x, finalY, pos.z);
            base.castShadow = true;
            base.receiveShadow = true;

            // ROUNDED METALLIC TOP: Get appropriate metal finish
            const fileExtension = fileName.split('.').pop().toLowerCase();
            let topMetal = this.baseMetal;
            
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(fileExtension)) {
                topMetal = this.specialMetals.silver; // Silver for images
            } else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(fileExtension)) {
                topMetal = this.specialMetals.gold; // Gold for movies
            }

            // Elegant rounded top surface
            const topWidth = width * 0.9;
            const topDepth = depth * 0.9;
            const topHeight = height * 0.15;
            const topGeometry = new this.THREE.BoxGeometry(topWidth, topHeight, topDepth);
            
            const topMaterial = new this.THREE.MeshStandardMaterial({
                map: this.gripTexture,
                color: topMetal.color,
                metalness: topMetal.metalness,
                roughness: topMetal.roughness + 0.1, // Slightly rougher due to grip texture
                emissive: topMetal.emissive,
                emissiveIntensity: topMetal.emissiveIntensity
            });
            
            const top = new this.THREE.Mesh(topGeometry, topMaterial);
            top.position.set(0, mainHeight / 2 + topHeight / 2, 0);
            top.castShadow = true;
            top.receiveShadow = true;
            base.add(top);

            // ELEGANT METALLIC FRAME: Create visible metallic edges around the colorful body
            const frameThickness = 0.04;
            const frameMaterial = new this.THREE.MeshStandardMaterial({
                color: topMetal.color,
                metalness: topMetal.metalness,
                roughness: topMetal.roughness * 0.7, // Shinier than top
                emissive: topMetal.emissive,
                emissiveIntensity: topMetal.emissiveIntensity * 1.5
            });

            // Create thin metallic frame strips around the edges
            const frameGeometries = [
                // Top horizontal edges
                new this.THREE.BoxGeometry(width + frameThickness, frameThickness, frameThickness),
                new this.THREE.BoxGeometry(width + frameThickness, frameThickness, frameThickness),
                new this.THREE.BoxGeometry(frameThickness, frameThickness, depth + frameThickness),
                new this.THREE.BoxGeometry(frameThickness, frameThickness, depth + frameThickness),
                
                // Vertical edges
                new this.THREE.BoxGeometry(frameThickness, mainHeight, frameThickness),
                new this.THREE.BoxGeometry(frameThickness, mainHeight, frameThickness),
                new this.THREE.BoxGeometry(frameThickness, mainHeight, frameThickness),
                new this.THREE.BoxGeometry(frameThickness, mainHeight, frameThickness)
            ];

            const framePositions = [
                // Top horizontal edges
                [0, mainHeight/2 + frameThickness/2, depth/2 + frameThickness/2],
                [0, mainHeight/2 + frameThickness/2, -depth/2 - frameThickness/2],
                [width/2 + frameThickness/2, mainHeight/2 + frameThickness/2, 0],
                [-width/2 - frameThickness/2, mainHeight/2 + frameThickness/2, 0],
                
                // Vertical edges
                [width/2 + frameThickness/2, 0, depth/2 + frameThickness/2],
                [width/2 + frameThickness/2, 0, -depth/2 - frameThickness/2],
                [-width/2 - frameThickness/2, 0, depth/2 + frameThickness/2],
                [-width/2 - frameThickness/2, 0, -depth/2 - frameThickness/2]
            ];

            frameGeometries.forEach((geometry, index) => {
                const frame = new this.THREE.Mesh(geometry, frameMaterial);
                frame.position.set(...framePositions[index]);
                base.add(frame);
            });

            // Check if this is a media file for play button
            const mediaExtension = fileName.split('.').pop().toLowerCase();
            const isAudio = ['.mp3', '.wav', '.flac', '.aac', '.ogg'].includes('.' + mediaExtension);
            const isVideo = ['.mp4', '.mov', '.avi', '.webm', '.mkv'].includes('.' + mediaExtension);
            
            if (isAudio || isVideo) {
                // ELEGANT PLAY BUTTON: Small button on the textured top
                const playButtonRadius = Math.min(topWidth, topDepth) * 0.15;
                const playButtonGeometry = new this.THREE.CylinderGeometry(playButtonRadius, playButtonRadius, 0.06, 16);
                const playButtonMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x333333,
                    metalness: 0.5,
                    roughness: 0.4,
                    emissive: 0x111111,
                    emissiveIntensity: 0.1
                });
                const playButton = new this.THREE.Mesh(playButtonGeometry, playButtonMaterial);
                playButton.position.set(0, topHeight / 2 + 0.03, 0);
                top.add(playButton);
                
                // PLAY TRIANGLE: Create proper triangle shape
                const triangleSize = playButtonRadius * 0.6;
                const triangleVertices = new Float32Array([
                    -triangleSize * 0.3, -triangleSize * 0.5, 0,
                    -triangleSize * 0.3,  triangleSize * 0.5, 0,
                    triangleSize * 0.7,   0, 0
                ]);
                
                const triangleGeometry = new this.THREE.BufferGeometry();
                triangleGeometry.setAttribute('position', new this.THREE.BufferAttribute(triangleVertices, 3));
                triangleGeometry.computeVertexNormals();
                
                const triangleMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    metalness: 0.1,
                    roughness: 0.4,
                    side: this.THREE.DoubleSide
                });
                
                const triangle = new this.THREE.Mesh(triangleGeometry, triangleMaterial);
                triangle.position.set(0, 0.03, 0);
                playButton.add(triangle);
            }

            // IMPORTANT: Keep all existing functionality intact
            // Subtle glow outline - CRITICAL for existing functionality
            const outlineGeometry = new this.THREE.BoxGeometry(width * 1.03, height * 1.03, depth * 1.03);
            const outlineMaterial = new this.THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 0.08,
                depthWrite: false
            });
            const outline = new this.THREE.Mesh(outlineGeometry, outlineMaterial);
            outline.position.set(0, 0, 0);
            base.add(outline);

            // Enhanced hitbox for easier selection - CRITICAL for touch/click functionality
            const hitboxGeometry = new this.THREE.BoxGeometry(
                Math.max(width, 3.0 * 1.2),
                Math.max(height + topHeight, 3.0 * 1.2),
                Math.max(depth, 3.0 * 1.2)
            );
            const hitboxMaterial = new this.THREE.MeshBasicMaterial({ visible: false });
            const hitbox = new this.THREE.Mesh(hitboxGeometry, hitboxMaterial);
            hitbox.position.set(0, 0, 0);
            hitbox.userData.isHitbox = true;
            base.add(hitbox);

            // Store userData on the base mesh - CRITICAL for all functionality
            base.userData = { 
                fileName: fileName, 
                type: 'fileObject', 
                id: fileId,
                extension: extension, // Store extension for path snap detection
                originalBaseColor: colorHex,
                // DEMO FIX: Add demo file properties for media preview
                path: fileData?.path || null,
                isDemoContent: fileData?.isDemoContent || false,
                // For demo files, url should be the path (asset path to look up in DEMO_ASSET_DATA_URLS)
                url: fileData?.isDemoContent ? fileData?.path : (fileData?.url || null),
                thumbnailDataUrl: fileData?.thumbnailDataUrl || null
            };
            base.userData.hitbox = hitbox;
            return base;
        }

        createCylinderMesh(pos, radius, height, colorHex, fileName, fileId, segments = 24, extension = null, fileData = null) {
            // Ensure minimum size for touch targets
            const minRadius = 1.5;
            radius = Math.max(radius, minRadius);
            height = Math.max(height, minRadius * 1.4);
            
            // Extract extension if not provided
            if (!extension && fileName) {
                const dotIndex = fileName.lastIndexOf('.');
                if (dotIndex !== -1) {
                    extension = fileName.substring(dotIndex).toLowerCase();
                }
            }

            // ELEGANT CYLINDRICAL CONTAINER: Main body
            const mainHeight = height * 0.85;
            const baseGeometry = new this.THREE.CylinderGeometry(radius, radius, mainHeight, segments, 1, false);

            // Colorful cylindrical body with subtle metallic sheen - vibrant but elegant
            const sideMaterial = new this.THREE.MeshStandardMaterial({ 
                color: colorHex, 
                metalness: 0.3, // More metallic than before
                roughness: 0.2, // Shinier surface
                emissive: colorHex,
                emissiveIntensity: 0.05 // Subtle glow
            });
            
            // Use Dart-provided y if present, otherwise default to height/2
            const y = (pos.y !== undefined && pos.y !== null) ? pos.y : height / 2;
            const base = new this.THREE.Mesh(baseGeometry, sideMaterial);
            base.position.set(pos.x, y, pos.z);
            base.castShadow = true;
            base.receiveShadow = true;

            // METALLIC CAPS: Get appropriate metal finish
            const fileExtension = fileName.split('.').pop().toLowerCase();
            let capMetal = this.baseMetal;
            
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(fileExtension)) {
                capMetal = this.specialMetals.silver; // Silver for images
            } else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(fileExtension)) {
                capMetal = this.specialMetals.gold; // Gold for movies
            }

            // Top cap with grip texture
            const capRadius = radius * 0.95;
            const capHeight = height * 0.1;
            const topCapGeometry = new this.THREE.CylinderGeometry(capRadius, capRadius, capHeight, segments);
            const topCapMaterial = new this.THREE.MeshStandardMaterial({
                map: this.gripTexture,
                color: capMetal.color,
                metalness: capMetal.metalness,
                roughness: capMetal.roughness + 0.1, // Slightly rougher due to grip texture
                emissive: capMetal.emissive,
                emissiveIntensity: capMetal.emissiveIntensity
            });
            
            const topCap = new this.THREE.Mesh(topCapGeometry, topCapMaterial);
            topCap.position.set(0, mainHeight / 2 + capHeight / 2, 0);
            topCap.castShadow = true;
            topCap.receiveShadow = true;
            base.add(topCap);

            // Bottom cap - smooth metallic
            const bottomCapMaterial = new this.THREE.MeshStandardMaterial({
                color: capMetal.color,
                metalness: capMetal.metalness,
                roughness: capMetal.roughness,
                emissive: capMetal.emissive,
                emissiveIntensity: capMetal.emissiveIntensity
            });

            const bottomCap = new this.THREE.Mesh(topCapGeometry, bottomCapMaterial);
            bottomCap.position.set(0, -mainHeight / 2 - capHeight / 2, 0);
            bottomCap.castShadow = true;
            bottomCap.receiveShadow = true;
            base.add(bottomCap);

            // Check if this is a media file for play button
            const mediaExtension = fileName.split('.').pop().toLowerCase();
            const isAudio = ['.mp3', '.wav', '.flac', '.aac', '.ogg'].includes('.' + mediaExtension);
            const isVideo = ['.mp4', '.mov', '.avi', '.webm', '.mkv'].includes('.' + mediaExtension);

            if (isAudio || isVideo) {
                // ELEGANT PLAY BUTTON: Refined button on the textured top cap
                const playButtonRadius = radius * 0.25;
                const playButtonGeometry = new this.THREE.CylinderGeometry(playButtonRadius, playButtonRadius, 0.06, 16);
                const playButtonMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0x333333,
                    metalness: 0.5,
                    roughness: 0.4,
                    emissive: 0x111111,
                    emissiveIntensity: 0.1
                });
                const playButton = new this.THREE.Mesh(playButtonGeometry, playButtonMaterial);
                playButton.position.set(0, capHeight / 2 + 0.03, 0);
                topCap.add(playButton);
                
                // PLAY TRIANGLE: Elegant triangle shape
                const triangleSize = playButtonRadius * 0.6;
                const triangleVertices = new Float32Array([
                    -triangleSize * 0.3, -triangleSize * 0.5, 0,
                    -triangleSize * 0.3,  triangleSize * 0.5, 0,
                    triangleSize * 0.7,   0, 0
                ]);
                
                const triangleGeometry = new this.THREE.BufferGeometry();
                triangleGeometry.setAttribute('position', new this.THREE.BufferAttribute(triangleVertices, 3));
                triangleGeometry.computeVertexNormals();
                
                const triangleMaterial = new this.THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    metalness: 0.1,
                    roughness: 0.4,
                    side: this.THREE.DoubleSide
                });
                
                const triangle = new this.THREE.Mesh(triangleGeometry, triangleMaterial);
                triangle.position.set(0, 0.03, 0);
                playButton.add(triangle);
            }

            // ELEGANT GLOW OUTLINE: Subtle glow for visual feedback - CRITICAL for existing functionality
            const outlineGeometry = new this.THREE.CylinderGeometry(radius * 1.05, radius * 1.05, height * 1.05, segments, 1, false);
            const outlineMaterial = new this.THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 0.08,
                depthWrite: false
            });
            const outline = new this.THREE.Mesh(outlineGeometry, outlineMaterial);
            outline.position.set(0, 0, 0);
            base.add(outline);

            // Enhanced hitbox for easier selection
            const hitboxGeometry = new this.THREE.CylinderGeometry(
                radius * 1.25,
                radius * 1.25,
                height * 1.25,
                segments, 1, false
            );
            const hitboxMaterial = new this.THREE.MeshBasicMaterial({ visible: false });
            const hitbox = new this.THREE.Mesh(hitboxGeometry, hitboxMaterial);
            hitbox.position.set(0, 0, 0);
            hitbox.userData.isHitbox = true;
            base.add(hitbox);

            // Store userData on the base mesh
            base.userData = { 
                fileName: fileName, 
                type: 'fileObject', 
                id: fileId,
                extension: extension, // Store extension for path snap detection
                originalBaseColor: colorHex,
                // DEMO FIX: Add demo file properties for media preview
                path: fileData?.path || null,
                isDemoContent: fileData?.isDemoContent || false,
                // For demo files, url should be the path (asset path to look up in DEMO_ASSET_DATA_URLS)
                url: fileData?.isDemoContent ? fileData?.path : (fileData?.url || null),
                thumbnailDataUrl: fileData?.thumbnailDataUrl || null
            };
            base.userData.hitbox = hitbox;
            return base;
        }

        createObjectByType(extension, pos, fileName, fileId, fileData = null) {
            console.log('=== createObjectByType ===');
            console.log('Extension:', extension, 'Type:', typeof extension);
            console.log('Position:', pos);
            console.log('File name:', fileName);
            console.log('File ID:', fileId);
            console.log('File Data available:', !!fileData);
            
            // NORMALIZE EXTENSION: Ensure consistent dot-prefix format
            let normalizedExtension = extension;
            if (normalizedExtension && !normalizedExtension.startsWith('.')) {
                normalizedExtension = '.' + normalizedExtension;
            }
            if (normalizedExtension) {
                normalizedExtension = normalizedExtension.toLowerCase();
            }
            console.log('Normalized extension:', normalizedExtension);
            
            let object;
            const colorHex = this.getColorByExtension(normalizedExtension);
            
            // Debug logging for GIF files
            if (normalizedExtension && normalizedExtension.includes('gif')) {
                console.log('Creating GIF object:', {extension, normalizedExtension, fileName, fileId, colorHex});
            }
            
            console.log('Switch case - normalizedExtension:', normalizedExtension || 'undefined');
            
            switch (normalizedExtension || '') {
                case '.pdf':
                case '.doc':
                case '.docx':
                    console.log('Creating document object');
                    object = this.createCubeMesh(pos, 2, 3, 0.3, colorHex, fileName, fileId, normalizedExtension, fileData);
                    break;
                case '.ppt':
                case '.pptx':
                    console.log('Creating presentation object');
                    object = this.createCubeMesh(pos, 2.5, 2, 0.3, colorHex, fileName, fileId, normalizedExtension, fileData);
                    break;
                case '.mp3':
                    console.log('Creating audio object');
                    object = this.createCylinderMesh(pos, 0.8, 1.5, colorHex, fileName, fileId, 16, normalizedExtension, fileData);
                    break;
                // Video files - rectangles of different sizes
                case '.webm':
                    // Small rectangle for WebM
                    console.log('Creating WebM video object');
                    object = this.createCubeMesh(pos, 2.0, 1.2, 0.4, colorHex, fileName, fileId, normalizedExtension, fileData);
                    break;
                case '.mov':
                    // Medium rectangle for Apple videos
                    console.log('Creating MOV video object');
                    object = this.createCubeMesh(pos, 2.5, 1.5, 0.4, colorHex, fileName, fileId, normalizedExtension, fileData);
                    break;
                case '.mp4':
                    // Large rectangle for MP4
                    console.log('Creating MP4 video object');
                    object = this.createCubeMesh(pos, 3.0, 1.8, 0.4, colorHex, fileName, fileId, normalizedExtension, fileData);
                    break;
                case '.avi':
                    // AVI gets medium rectangle like MOV
                    console.log('Creating AVI video object');
                    object = this.createCubeMesh(pos, 2.5, 1.5, 0.4, colorHex, fileName, fileId, normalizedExtension, fileData);
                    break;
                // Image files - squares of different sizes
                case '.jpg':
                case '.jpeg':
                    // Small square for JPG/JPEG
                    console.log('Creating JPG/JPEG image object');
                    object = this.createCubeMesh(pos, 1.5, 1.5, 0.3, colorHex, fileName, fileId, normalizedExtension, fileData);
                    break;
                case '.png':
                    // Medium square for PNG
                    console.log('Creating PNG image object');
                    object = this.createCubeMesh(pos, 2.0, 2.0, 0.3, colorHex, fileName, fileId, normalizedExtension, fileData);
                    break;
                case '.gif':
                    // Large square for GIF
                    console.log('*** CREATING GIF CUBE ***');
                    console.log('Creating GIF cube with dimensions 2.5x2.5x0.3, color:', colorHex.toString(16));
                    object = this.createCubeMesh(pos, 2.5, 2.5, 0.3, colorHex, fileName, fileId, normalizedExtension, fileData);
                    break;
                case '.bmp':
                    // BMP gets small square like JPG
                    console.log('Creating BMP image object');
                    object = this.createCubeMesh(pos, 1.5, 1.5, 0.3, colorHex, fileName, fileId, normalizedExtension, fileData);
                    break;
                case '.contact':
                    console.log('Creating contact object via ContactManager');
                    console.log('📱 FileData available for contact creation:', !!fileData);
                    console.log('📱 ContactManager availability check:', !!window.app?.contactManager);
                    
                    // Try to use ContactManager if available
                    if (window.app && window.app.contactManager) {
                        console.log('✅ ContactManager available - creating proper contact object');
                        // Extract contact data from fileData (from Flutter DeviceContactService)
                        const contactData = {
                            id: fileId || fileName.replace('.contact', ''),
                            name: fileName.replace('.contact', ''),
                            phoneNumber: 'Unknown',
                            position: pos,
                            avatar: null
                        };
                        
                        // Extract real contact data from fileData if available
                        if (fileData) {
                            console.log('📱 Processing fileData for contact:', fileData);
                            
                            // Contact name stored in cameraMake
                            if (fileData.cameraMake) {
                                contactData.name = fileData.cameraMake;
                                console.log('📱 Extracted contact name:', fileData.cameraMake);
                            }
                            
                            // Primary phone stored in cameraModel  
                            if (fileData.cameraModel) {
                                contactData.phoneNumber = fileData.cameraModel;
                                console.log('📱 Extracted phone number:', fileData.cameraModel);
                            }
                            
                            // Contact ID from mimeType format: 'contact:${id}'
                            if (fileData.mimeType && fileData.mimeType.startsWith('contact:')) {
                                contactData.id = fileData.mimeType.replace('contact:', '');
                                console.log('📱 Extracted contact ID:', contactData.id);
                            }
                            
                            // Avatar thumbnail from thumbnailDataUrl
                            if (fileData.thumbnailDataUrl) {
                                contactData.avatar = fileData.thumbnailDataUrl;
                                console.log('📱 Extracted avatar data');
                            }
                            
                            console.log('📱 Extracted contact data from FileModel:', {
                                name: contactData.name,
                                phone: contactData.phoneNumber,
                                hasAvatar: !!contactData.avatar
                            });
                        } else {
                            console.warn('📱 ❌ No fileData available for contact creation - phone will be Unknown');
                        }
                        
                        console.log('📱 Creating contact via ContactManager:', contactData);
                        const contactObject = window.app.contactManager.addContact(contactData);
                        
                        if (contactObject && contactObject.mesh) {
                            object = contactObject.mesh;
                            console.log('✅ Contact created successfully via ContactManager:', contactData.name);
                        } else {
                            console.error('❌ ContactManager failed to create contact object');
                            // Fallback to basic contact-colored cube
                            object = this.createCubeMesh(pos, 1.5, 2.5, 1.5, 0x4a90e2, fileName, fileId, normalizedExtension);
                        }
                    } else {
                        console.warn('❌ ContactManager not available during object creation - this will cause double-creation');
                        console.warn('📱 TIMING ISSUE: Contact will be created as basic cube first, then replaced later');
                        // Fallback contact object with contact blue color
                        object = this.createCubeMesh(pos, 1.5, 2.5, 1.5, 0x4a90e2, fileName, fileId, normalizedExtension);
                    }
                    break;
                default:
                    console.log('Creating default object for extension:', extension);
                    object = this.createCubeMesh(pos, 1.5, 1.5, 1.5, colorHex, fileName, fileId, normalizedExtension);
            }
            
            if (object) {
                console.log('Object created successfully:', fileName, 'at position:', pos);
            } else {
                console.error('Failed to create object for:', fileName, 'extension:', extension);
            }
            
            return object;
        }

        getColorByExtension(extension) {
            console.log('*** getColorByExtension called with:', extension, 'type:', typeof extension);
            
            // NORMALIZE EXTENSION: Ensure consistent dot-prefix format
            let normalizedExtension = extension;
            if (normalizedExtension && !normalizedExtension.startsWith('.')) {
                normalizedExtension = '.' + normalizedExtension;
            }
            if (normalizedExtension) {
                normalizedExtension = normalizedExtension.toLowerCase();
            }
            
            const colors = {
                // Documents - Red for PDF, Blue for DOC
                '.pdf': 0xff4444,    // Red for PDF
                '.doc': 0x4444ff,    // Blue for DOC
                '.docx': 0x4444ff,   // Blue for DOCX
                '.ppt': 0xff8800,    // Orange for presentations
                '.pptx': 0xff8800,   // Orange for presentations
                
                // Audio - Green
                '.mp3': 0x44ff44,    // Green for audio
                '.wav': 0x44ff44,    // Green for audio
                '.flac': 0x44ff44,   // Green for audio
                '.aac': 0x44ff44,    // Green for audio
                '.ogg': 0x44ff44,    // Green for audio
                
                // Videos - Purple
                '.mp4': 0x8844ff,    // Purple for videos
                '.mov': 0x8844ff,    // Purple for videos
                '.avi': 0x8844ff,    // Purple for videos
                '.webm': 0x8844ff,   // Purple for videos
                '.mkv': 0x8844ff,    // Purple for videos
                
                // Images - Yellow
                '.jpg': 0xffff44,    // Yellow for images
                '.jpeg': 0xffff44,   // Yellow for images
                '.png': 0xffff44,    // Yellow for images
                '.gif': 0xffff44,    // Yellow for images
                '.bmp': 0xffff44,    // Yellow for images
                '.tiff': 0xffff44,   // Yellow for images
                '.tif': 0xffff44,    // Yellow for images
                
                // Contacts - Blue
                '.contact': 0x4a90e2,  // Blue for contacts
            };
            const resultColor = colors[normalizedExtension] || 0x888888;
            console.log('*** Color result for extension', normalizedExtension, ':', resultColor.toString(16));
            if (resultColor === 0x888888) {
                console.log('*** WARNING: Using default grey color - extension not found in colors map!');
                console.log('*** Available extensions:', Object.keys(colors));
            }
            return resultColor;
        }
    }

    // Make globally accessible
    window.ObjectCreator = ObjectCreator;
    
    console.log("ObjectCreator module loaded successfully");
})();
