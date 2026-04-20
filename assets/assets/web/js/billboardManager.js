// assets/web/js/billboardManager.js
// Global script version - assumes THREE, camera, and sharedState are available globally

const BILLBOARD_RENDER_ORDER = 999;
const INFO_LABEL_HEIGHT = 1.0; // Increased height to accommodate more information
const INFO_LABEL_WIDTH = 2.0; // Increased width for metadata
const IMAGE_PREVIEW_HEIGHT = 1.5;
const IMAGE_PREVIEW_WIDTH = 1.5;
const BILLBOARD_VERTICAL_OFFSET = 0.2; // Offset from top of object to bottom of billboards
const BILLBOARD_HORIZONTAL_SPACING = 0.1; // Spacing between info and preview when side-by-side

// Helper function to format file size
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// Helper function to format date with EXIF capture time priority for images
function formatDateForDisplay(fileData, fileExtension) {
    console.log('=== formatDateForDisplay DEBUG ===');
    console.log('fileExtension:', fileExtension);
    console.log('fileData keys:', Object.keys(fileData || {}));
    console.log('fileData.dateTimeOriginal:', fileData?.dateTimeOriginal);
    console.log('fileData.lastModified:', fileData?.lastModified);
    
    // For image files, prioritize EXIF capture time (dateTimeOriginal) over file modification time
    const isImageFile = fileExtension && 
        ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'dng', 'cr2', 'nef', 'arw', 'orf', 'rw2']
        .includes(fileExtension.toLowerCase().replace('.', ''));
    
    console.log('isImageFile:', isImageFile);
    
    if (isImageFile && fileData.dateTimeOriginal) {
        console.log('Using EXIF dateTimeOriginal:', fileData.dateTimeOriginal);
        try {
            // Parse EXIF date format: "YYYY:MM:DD HH:MM:SS"
            const exifDateStr = fileData.dateTimeOriginal.replace(/:/g, '-', 2); // Replace first two colons with dashes
            console.log('Parsed EXIF date string:', exifDateStr);
            const captureDate = new Date(exifDateStr);
            console.log('Capture date object:', captureDate);
            
            if (!isNaN(captureDate.getTime())) {
                const formattedDate = captureDate.toLocaleDateString() + ' ' + 
                       captureDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + 
                       ' (captured)';
                console.log('Formatted capture date:', formattedDate);
                return formattedDate;
            }
        } catch (e) {
            console.log('Error parsing EXIF date:', e);
        }
    }
    
    console.log('Falling back to lastModified date');
    // Fall back to standard date logic for non-images or when EXIF date is unavailable
    return formatLastModified(fileData.lastModified, fileData.created);
}

// Helper function to format date with smart fallback
function formatLastModified(timestamp, createdTimestamp) {
    if (!timestamp || timestamp === 0) return 'Unknown date';
    try {
        const date = new Date(timestamp);
        const now = Date.now();
        const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours
        
        // If the date is very recent (within last 24 hours) and we have a created timestamp that's older, use that instead
        if (createdTimestamp && (now - timestamp) < recentThreshold && createdTimestamp < timestamp) {
            const createdDate = new Date(createdTimestamp);
            if (!isNaN(createdDate.getTime())) {
                return createdDate.toLocaleDateString() + ' ' + createdDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' (orig)';
            }
        }
        
        // Check if this appears to be a very recent timestamp (likely a copied file)
        if ((now - timestamp) < recentThreshold) {
            return 'Recently added';
        }
        
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (e) {
        return 'Invalid date';
    }
}

function createTextCanvas(textLines, fontSize = 40, fontFace = 'Arial', textColor = 'black', backgroundColor = 'rgba(255,255,255,0.8)', canvasWidth = 256, baseCanvasHeightPerLine = 64, padding = 10) {
    if (!Array.isArray(textLines)) {
        textLines = [textLines];
    }
    const numLines = textLines.length;
    const canvasHeight = (baseCanvasHeightPerLine * numLines) + (padding * (numLines + 1));

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d');

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = `bold ${fontSize}px ${fontFace}`;
    context.fillStyle = textColor;
    context.textAlign = 'center';

    textLines.forEach((line, index) => {
        const yPos = padding + (index * (baseCanvasHeightPerLine + padding)) + (baseCanvasHeightPerLine / 2) + (fontSize / 3);
        context.fillText(line, canvas.width / 2, yPos);
    });
    return canvas;
}

function createLabelMeshFromCanvas(canvas, planeWidth, planeHeight) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
    });
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = BILLBOARD_RENDER_ORDER;
    return mesh;
}

function createImagePreviewMesh(imageDataUrl, planeWidth, planeHeight) {
    return new Promise((resolve, reject) => {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            imageDataUrl,
            (texture) => {
                texture.minFilter = THREE.LinearFilter;
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthTest: false,
                    depthWrite: false
                });
                const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
                const mesh = new THREE.Mesh(geometry, material);
                mesh.renderOrder = BILLBOARD_RENDER_ORDER;
                resolve(mesh);
            },
            undefined,
            (error) => {
                console.error('JS: Error loading image for preview:', error);
                reject(error);
            }
        );
    });
}

function updateObjectVisuals(fileObject) {
    const { fileName, extension: fileExtension, thumbnailDataUrl, fileData } = fileObject.userData;
    const currentDisplayOptions = sharedState.currentDisplayOptions; // Direct access
    const labelObjectsMap = sharedState.labelObjectsMap; // Direct access

    console.log(`JS: updateObjectVisuals for ${fileName}, showInfo: ${currentDisplayOptions.showFileInfo}, showPreview: ${currentDisplayOptions.showImagePreviews}, thumbURL available: ${!!thumbnailDataUrl}, ext: ${fileExtension}`);
    console.log('JS: fileData available:', fileData);

    let attachments = labelObjectsMap.get(fileObject.uuid);
    if (!attachments) {
        attachments = { infoLabel: null, imagePreview: null };
        labelObjectsMap.set(fileObject.uuid, attachments);
    }

    const objParams = fileObject.geometry.parameters;
    const objHeight = objParams.height;
    const baseBillboardY = objHeight / 2 + BILLBOARD_VERTICAL_OFFSET;

    // Cleanup previous billboards
    if (attachments.infoLabel) {
        fileObject.remove(attachments.infoLabel);
        if (attachments.infoLabel.material.map) attachments.infoLabel.material.map.dispose();
        attachments.infoLabel.material.dispose();
        attachments.infoLabel.geometry.dispose();
        attachments.infoLabel = null;
    }
    if (attachments.imagePreview) {
        fileObject.remove(attachments.imagePreview);
        if (attachments.imagePreview.material.map) attachments.imagePreview.material.map.dispose();
        attachments.imagePreview.material.dispose();
        attachments.imagePreview.geometry.dispose();
        attachments.imagePreview = null;
    }

    const showInfo = currentDisplayOptions.showFileInfo;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv'];
    const canShowPreview = currentDisplayOptions.showImagePreviews &&
                          thumbnailDataUrl &&
                          (imageExtensions.includes(fileExtension.toLowerCase()) || videoExtensions.includes(fileExtension.toLowerCase()));

    const effectiveInfoLabelHeight = INFO_LABEL_HEIGHT;
    const effectiveImagePreviewHeight = IMAGE_PREVIEW_HEIGHT;
    // Align to the taller of the two if both are shown, or individual height if only one.
    const commonCenterY = baseBillboardY + 
        ( (showInfo && canShowPreview) ? (Math.max(effectiveInfoLabelHeight, effectiveImagePreviewHeight) / 2) :
          (showInfo) ? (effectiveInfoLabelHeight / 2) :
          (canShowPreview) ? (effectiveImagePreviewHeight / 2) : 0 );    if (showInfo && canShowPreview) {
        // Create info label with metadata
        const ext = fileExtension ? fileExtension.substring(1).toUpperCase() : 'FILE';
        const nameForLabel = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName;
        
        // Build info lines with metadata
        const infoLines = [ext, nameForLabel];
        
        // Add file size if available
        if (fileData && fileData.fileSize !== undefined && fileData.fileSize !== null) {
            infoLines.push(formatFileSize(fileData.fileSize));
        }
          // Add date info with EXIF capture time priority for images
        if (fileData && (fileData.lastModified !== undefined && fileData.lastModified !== null) || fileData.dateTimeOriginal) {
            infoLines.push(formatDateForDisplay(fileData, fileExtension));
        }
        
        console.log(`JS: Creating billboard with info lines:`, infoLines);
        
        const infoCanvas = createTextCanvas(infoLines, 28, 'Arial', 'black', 'rgba(255,255,255,0.9)', 320, 40, 8);
        attachments.infoLabel = createLabelMeshFromCanvas(infoCanvas, INFO_LABEL_WIDTH, effectiveInfoLabelHeight);
        attachments.infoLabel.position.set(
            -(INFO_LABEL_WIDTH / 2) - (BILLBOARD_HORIZONTAL_SPACING / 2),
            commonCenterY,
            0
        );
        attachments.infoLabel.lookAt(camera.position);
        fileObject.add(attachments.infoLabel);

        const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5, depthTest: false, depthWrite: false });
        const placeholderGeometry = new THREE.PlaneGeometry(IMAGE_PREVIEW_WIDTH, effectiveImagePreviewHeight);
        attachments.imagePreview = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
        attachments.imagePreview.renderOrder = BILLBOARD_RENDER_ORDER;
        attachments.imagePreview.position.set(
            (IMAGE_PREVIEW_WIDTH / 2) + (BILLBOARD_HORIZONTAL_SPACING / 2),
            commonCenterY,
            0
        );
        attachments.imagePreview.lookAt(camera.position);
        fileObject.add(attachments.imagePreview);

        createImagePreviewMesh(thumbnailDataUrl, IMAGE_PREVIEW_WIDTH, effectiveImagePreviewHeight)
            .then(mesh => {
                if (fileObject.parent && attachments.imagePreview && attachments.imagePreview.parent === fileObject) {
                    fileObject.remove(attachments.imagePreview); 
                    attachments.imagePreview.geometry.dispose();
                    attachments.imagePreview.material.dispose();
                    
                    attachments.imagePreview = mesh;
                    attachments.imagePreview.position.set(
                        (IMAGE_PREVIEW_WIDTH / 2) + (BILLBOARD_HORIZONTAL_SPACING / 2),
                        commonCenterY,
                        0
                    );
                    attachments.imagePreview.lookAt(camera.position);
                    fileObject.add(attachments.imagePreview);
                } else {
                    mesh.geometry.dispose(); if(mesh.material.map) mesh.material.map.dispose(); mesh.material.dispose();
                }
            })
            .catch(err => {
                if (attachments.imagePreview && attachments.imagePreview.parent === fileObject) {
                    fileObject.remove(attachments.imagePreview);
                    attachments.imagePreview.geometry.dispose(); attachments.imagePreview.material.dispose();
                    attachments.imagePreview = null;
                }
            });    } else if (showInfo) {
        // Create info label with metadata (info only, no preview)
        const ext = fileExtension ? fileExtension.substring(1).toUpperCase() : 'FILE';
        const nameForLabel = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName;
        
        // Build info lines with metadata
        const infoLines = [ext, nameForLabel];
        
        // Add file size if available
        if (fileData && fileData.fileSize !== undefined && fileData.fileSize !== null) {
            infoLines.push(formatFileSize(fileData.fileSize));
        }
          // Add date info with EXIF capture time priority for images
        if (fileData && (fileData.lastModified !== undefined && fileData.lastModified !== null) || fileData.dateTimeOriginal) {
            infoLines.push(formatDateForDisplay(fileData, fileExtension));
        }
        
        console.log(`JS: Creating billboard with info lines:`, infoLines);
        
        const infoCanvas = createTextCanvas(infoLines, 28, 'Arial', 'black', 'rgba(255,255,255,0.9)', 320, 40, 8);
        attachments.infoLabel = createLabelMeshFromCanvas(infoCanvas, INFO_LABEL_WIDTH, effectiveInfoLabelHeight);
        attachments.infoLabel.position.set(0, commonCenterY, 0);
        attachments.infoLabel.lookAt(camera.position);
        fileObject.add(attachments.infoLabel);

    } else if (canShowPreview) {
        const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5, depthTest: false, depthWrite: false });
        const placeholderGeometry = new THREE.PlaneGeometry(IMAGE_PREVIEW_WIDTH, effectiveImagePreviewHeight);
        attachments.imagePreview = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
        attachments.imagePreview.renderOrder = BILLBOARD_RENDER_ORDER;
        attachments.imagePreview.position.set(0, commonCenterY, 0);
        attachments.imagePreview.lookAt(camera.position);
        fileObject.add(attachments.imagePreview);

        createImagePreviewMesh(thumbnailDataUrl, IMAGE_PREVIEW_WIDTH, effectiveImagePreviewHeight)
            .then(mesh => {
                 if (fileObject.parent && attachments.imagePreview && attachments.imagePreview.parent === fileObject) {
                    fileObject.remove(attachments.imagePreview);
                    attachments.imagePreview.geometry.dispose();
                    attachments.imagePreview.material.dispose();

                    attachments.imagePreview = mesh;
                    attachments.imagePreview.position.set(0, commonCenterY, 0);
                    attachments.imagePreview.lookAt(camera.position);
                    fileObject.add(attachments.imagePreview);
                } else {
                    mesh.geometry.dispose(); if(mesh.material.map) mesh.material.map.dispose(); mesh.material.dispose();
                }
            })
            .catch(err => {
                 if (attachments.imagePreview && attachments.imagePreview.parent === fileObject) {
                    fileObject.remove(attachments.imagePreview);
                    attachments.imagePreview.geometry.dispose(); attachments.imagePreview.material.dispose();
                    attachments.imagePreview = null;
                }
            });
    }
}

function refreshAllObjectVisuals() {
    console.log("JS: Refreshing all object visuals based on options.");
    sharedState.fileObjects.forEach(fileObject => {
        updateObjectVisuals(fileObject);
    });
}

// Make functions globally accessible
window.updateObjectVisuals = updateObjectVisuals;
window.refreshAllObjectVisuals = refreshAllObjectVisuals;
