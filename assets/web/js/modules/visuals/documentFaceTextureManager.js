/**
 * Document Face Texture Manager
 * Handles front face texture creation for document files (PDF, DOCX, etc.)
 * Similar to how AudioFaceTextureManager handles MP3 files
 */

class DocumentFaceTextureManager {
    constructor() {
        this.documentExtensions = [
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.txt', '.rtf', '.odt', '.ods', '.odp', '.pages', '.numbers',
            '.keynote', '.csv', '.tsv'
        ];
        
        // Extension-specific colors for document types
        this.extensionColors = {
            '.pdf': '#FF4444',      // Red
            '.doc': '#4472C4',      // Blue
            '.docx': '#4472C4',     // Blue
            '.xls': '#70AD47',      // Green
            '.xlsx': '#70AD47',     // Green
            '.ppt': '#D04423',      // Orange
            '.pptx': '#D04423',     // Orange
            '.txt': '#7F7F7F',      // Gray
            '.rtf': '#7F7F7F',      // Gray
            '.odt': '#4472C4',      // Blue
            '.ods': '#70AD47',      // Green
            '.odp': '#D04423',      // Orange
            '.pages': '#4472C4',    // Blue
            '.numbers': '#70AD47',  // Green
            '.keynote': '#D04423',  // Orange
            '.csv': '#70AD47',      // Green
            '.tsv': '#70AD47'       // Green
        };
    }

    /**
     * Check if a file is a document file that should get a face texture
     */
    isDocumentFile(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return false;
        }
        
        const lowerFileName = fileName.toLowerCase();
        return this.documentExtensions.some(ext => lowerFileName.endsWith(ext));
    }

    /**
     * Get the file extension from a filename
     */
    getFileExtension(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return '';
        }
        
        const lastDot = fileName.lastIndexOf('.');
        return lastDot !== -1 ? fileName.substring(lastDot).toLowerCase() : '';
    }

    /**
     * Get display name (filename without extension, truncated if needed)
     */
    getDisplayName(fileName, maxLength = 20) {
        if (!fileName || typeof fileName !== 'string') {
            return 'Document';
        }
        
        // Remove extension
        const lastDot = fileName.lastIndexOf('.');
        const nameWithoutExt = lastDot !== -1 ? fileName.substring(0, lastDot) : fileName;
        
        // Truncate if too long
        if (nameWithoutExt.length > maxLength) {
            return nameWithoutExt.substring(0, maxLength - 3) + '...';
        }
        
        return nameWithoutExt;
    }

    /**
     * Get background color for extension
     */
    getExtensionColor(extension) {
        return this.extensionColors[extension] || '#7F7F7F'; // Default gray
    }

    /**
     * Create a face texture for document files
     * Shows filename on top, extension below
     */
    createDocumentFaceTexture(fileName) {
        console.log(`🎨 DOCUMENT FACE TEXTURE: Creating texture for: ${fileName}`);
        
        if (!fileName) {
            console.log('🎨 DOCUMENT FACE TEXTURE: No fileName provided');
            return null;
        }

        const extension = this.getFileExtension(fileName);
        const displayName = this.getDisplayName(fileName);
        const backgroundColor = this.getExtensionColor(extension);
        
        console.log(`🎨 DOCUMENT FACE TEXTURE: Extension: ${extension}, DisplayName: ${displayName}, Color: ${backgroundColor}`);

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Fill background with extension-specific color
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

        // Configure text styling
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Add text shadow for better readability
        const addTextShadow = (text, x, y, fontSize, color = 'white') => {
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.fillText(text, x + 2, y + 2);
            
            // Main text
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
        };

        // Draw filename (larger text, upper portion) - left-aligned with padding
        const fileNameY = canvas.height * 0.35;
        const textPadding = 20; // Left padding from edge
        addTextShadow(displayName, textPadding, fileNameY, 65);

        // Draw extension (smaller text, lower portion) - also left-aligned
        if (extension) {
            const extensionY = canvas.height * 0.65;
            addTextShadow(extension.toUpperCase(), textPadding, extensionY, 45, 'rgba(255, 255, 255, 0.9)');
        }

        console.log(`🎨 DOCUMENT FACE TEXTURE: Canvas created successfully for ${fileName}`);

        // Create Three.js texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        console.log(`🎨 DOCUMENT FACE TEXTURE: Three.js texture created for ${fileName}`);
        return texture;
    }

    /**
     * Apply document face texture to an object
     */
    applyDocumentFaceTexture(object, fileName) {
        console.log(`🎨 DOCUMENT FACE TEXTURE: Applying texture to object for file: ${fileName}`);
        
        if (!object || !fileName) {
            console.log('🎨 DOCUMENT FACE TEXTURE: Missing object or fileName');
            return false;
        }

        if (!this.isDocumentFile(fileName)) {
            console.log(`🎨 DOCUMENT FACE TEXTURE: ${fileName} is not a document file`);
            return false;
        }

        const texture = this.createDocumentFaceTexture(fileName);
        if (!texture) {
            console.log(`🎨 DOCUMENT FACE TEXTURE: Failed to create texture for ${fileName}`);
            return false;
        }

        try {
            // Store original materials if not already stored
            if (!object.userData.originalMaterials) {
                if (Array.isArray(object.material)) {
                    object.userData.originalMaterials = object.material.map(mat => {
                        if (mat.clone) {
                            return mat.clone();
                        }
                        return mat;
                    });
                } else {
                    object.userData.originalMaterials = object.material.clone ? object.material.clone() : object.material;
                }
                console.log(`🎨 DOCUMENT FACE TEXTURE: Stored original materials for ${fileName}`);
            }

            // Create new materials array
            const materials = [];
            const originalMaterials = Array.isArray(object.userData.originalMaterials) 
                ? object.userData.originalMaterials 
                : [object.userData.originalMaterials];

            // Copy original materials for all faces
            for (let i = 0; i < 6; i++) {
                if (i < originalMaterials.length) {
                    materials[i] = originalMaterials[i].clone ? originalMaterials[i].clone() : originalMaterials[i];
                } else {
                    // Fallback material
                    materials[i] = new THREE.MeshBasicMaterial({ color: this.getExtensionColor(this.getFileExtension(fileName)) });
                }
            }

            // Apply document texture to front face (index 4)
            materials[4] = new THREE.MeshBasicMaterial({ 
                map: texture,
                transparent: true
            });

            // Apply materials to object
            object.material = materials;
            
            console.log(`🎨 DOCUMENT FACE TEXTURE: Successfully applied texture to ${fileName}`);
            return true;

        } catch (error) {
            console.error(`🎨 DOCUMENT FACE TEXTURE: Error applying texture to ${fileName}:`, error);
            return false;
        }
    }

    /**
     * Check if object should get document face texture and apply it
     */
    processObjectForDocumentFaceTexture(object) {
        if (!object || !object.userData) {
            return false;
        }

        const fileName = object.userData.fileName || object.userData.name;
        if (!fileName) {
            return false;
        }

        if (this.isDocumentFile(fileName)) {
            console.log(`🎨 DOCUMENT FACE TEXTURE: Processing document object: ${fileName}`);
            return this.applyDocumentFaceTexture(object, fileName);
        }

        return false;
    }
}

// Export for use in other modules
window.DocumentFaceTextureManager = DocumentFaceTextureManager;

// Create global instance
if (!window.documentFaceTextureManager) {
    window.documentFaceTextureManager = new DocumentFaceTextureManager();
    console.log('🎨 DocumentFaceTextureManager initialized globally');
}
