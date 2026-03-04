// modules/audio/audioFaceTextureManager.js
// Dependencies: THREE (global), window.AudioMetadataParser
// Exports: window.AudioFaceTextureManager

(function() {
    'use strict';
    
    console.log("Loading AudioFaceTextureManager module...");
    
    /**
     * AudioFaceTextureManager - Creates and applies face textures to audio file cylinders
     * Specializes in cylinder geometry texture mapping for MP3 and other audio files
     */
    class AudioFaceTextureManager {
        constructor(THREE) {
            this.THREE = THREE;
            this.metadataParser = new window.AudioMetadataParser();
            this.textureCache = new Map(); // Cache textures for performance
            
            console.log("AudioFaceTextureManager initialized");
        }
        
        /**
         * Create face texture for audio file cylinder
         * @param {Object} fileData - File data containing name and metadata
         * @returns {THREE.Texture} - Generated texture for cylinder
         */
        createAudioFaceTexture(fileData) {
            const filename = fileData.name || fileData.fileName || 'unknown.mp3';
            
            console.log(`🎵 Creating face texture for audio file: ${filename}`);
            
            // Check cache first
            const cacheKey = `audio_${filename}`;
            if (this.textureCache.has(cacheKey)) {
                console.log(`✅ Using cached texture for: ${filename}`);
                return this.textureCache.get(cacheKey);
            }
            
            // Parse metadata from filename
            const metadata = this.metadataParser.parseAudioFilename(filename);
            console.log(`📝 Parsed metadata:`, metadata);
            
            // Create canvas for texture
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Canvas dimensions for cylinder front face display
            // Make canvas wider to account for cylinder UV mapping - text will appear on front portion
            canvas.width = 1024;  // Wider canvas so text appears on front face of cylinder
            canvas.height = 256; // Height maps to cylinder height
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Create audio-themed background
            this.drawAudioBackground(ctx, canvas.width, canvas.height);
            
            // Draw text content - positioned to appear on front face
            this.drawAudioText(ctx, canvas.width, canvas.height, metadata);
            
            // Add audio visual elements
            this.drawAudioDecorations(ctx, canvas.width, canvas.height);
            
            // Create Three.js texture
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.wrapS = this.THREE.RepeatWrapping; // Allow texture to wrap around cylinder
            texture.wrapT = this.THREE.ClampToEdgeWrapping; // Clamp vertically
            
            // CRITICAL: Position texture to face the default camera view
            // Default camera is at (0, 4, 30) looking towards origin (0, 0, 0)
            // Rotate texture 180 degrees (0.5 offset) to move to opposite side
            texture.offset.x = 0.5; // 180 degree rotation - move text to opposite side of cylinder
            texture.needsUpdate = true;
            
            // Cache the texture
            this.textureCache.set(cacheKey, texture);
            
            console.log(`✅ Created face texture for: ${filename}`);
            return texture;
        }
        
        /**
         * Draw audio-themed background gradient
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {number} width - Canvas width
         * @param {number} height - Canvas height
         */
        drawAudioBackground(ctx, width, height) {
            // Create music-themed gradient background
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#1DB954'); // Spotify green top
            gradient.addColorStop(0.5, '#0d7c2d'); // Darker green middle
            gradient.addColorStop(1, '#044d17'); // Very dark green bottom
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            
            // Add subtle texture overlay
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            for (let i = 0; i < width; i += 20) {
                ctx.fillRect(i, 0, 1, height);
            }
        }
        
        /**
         * Draw song and artist text on canvas
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {number} width - Canvas width  
         * @param {number} height - Canvas height
         * @param {Object} metadata - Parsed metadata with artist and title
         */
        drawAudioText(ctx, width, height, metadata) {
            // Prepare text with 10-character truncation
            const artist10 = metadata.artist ? this.truncateTo10Chars(metadata.artist) : null;
            const title10 = metadata.title ? this.truncateTo10Chars(metadata.title) : null;
            const fallback10 = this.truncateTo10Chars(metadata.fallbackName || 'UNKNOWN');
            
            // Set text properties for maximum visibility with outline
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Position text in center portion of canvas (maps to front face of cylinder)
            const centerX = width / 2;
            
            // Use larger fonts - 50% bigger than previous: 48px->72px, 42px->63px
            const largeFont = 'bold 72px "Arial Black", "Arial", sans-serif';
            const mediumFont = 'bold 63px "Arial Black", "Arial", sans-serif';
            
            if (artist10 && title10) {
                // Two-line layout: Artist (top) + Song (bottom)
                
                // Draw artist name with white outline
                this.drawTextWithOutline(ctx, artist10, centerX, height * 0.35, largeFont);
                
                // Draw song title with white outline  
                this.drawTextWithOutline(ctx, title10, centerX, height * 0.65, mediumFont);
                
                console.log(`📝 Rendered two-line (10-char): "${artist10}" / "${title10}"`);
                
            } else {
                // Single line layout: Use title or fallback filename
                const displayText = title10 || fallback10;
                
                this.drawTextWithOutline(ctx, displayText, centerX, height / 2, largeFont);
                
                console.log(`📝 Rendered single-line (10-char): "${displayText}"`);
            }
        }
        
        /**
         * Truncate text to exactly 10 characters maximum
         * @param {string} text - Text to truncate
         * @returns {string} - Text truncated to 10 characters
         */
        truncateTo10Chars(text) {
            if (!text) return '';
            return text.substring(0, 10).toUpperCase(); // Use uppercase for better visibility
        }
        
        /**
         * Draw text with bright white fill and dark outline for maximum visibility
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {string} text - Text to draw
         * @param {number} x - X position
         * @param {number} y - Y position
         * @param {string} font - Font specification
         */
        drawTextWithOutline(ctx, text, x, y, font) {
            ctx.font = font;
            
            // Draw extra thick black outline for maximum contrast
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 8; // Increased from 4 to 8 for stronger outline
            ctx.lineJoin = 'round';
            ctx.strokeText(text, x, y);
            
            // Draw pure bright white fill - no transparency
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(text, x, y);
            
            // Add a second white layer for extra brightness
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(text, x, y);
        }
        
        /**
         * Draw audio-themed decorative elements
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {number} width - Canvas width
         * @param {number} height - Canvas height
         */
        drawAudioDecorations(ctx, width, height) {
            // Removed decorative music notes and waveform to keep texture clean
            // Just add a subtle border frame for better text readability
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.strokeRect(5, 5, width - 10, height - 10);
        }
        
        /**
         * Apply face texture to audio cylinder object
         * @param {THREE.Mesh} cylinderObject - The cylinder mesh (MP3 file object)
         * @param {Object} fileData - File data for texture generation
         */
        applyFaceTextureToAudioCylinder(cylinderObject, fileData) {
            try {
                console.log(`🎵 Applying face texture to audio cylinder: ${fileData.name}`);
                
                // Validate that this is a cylinder geometry
                if (!cylinderObject.geometry || cylinderObject.geometry.type !== 'CylinderGeometry') {
                    console.warn(`⚠️ Object is not a cylinder, skipping audio face texture: ${fileData.name}`);
                    return false;
                }
                
                // Create the face texture
                const faceTexture = this.createAudioFaceTexture(fileData);
                
                // Create new material with the face texture - NO color tinting for pure white text
                const texturedMaterial = new this.THREE.MeshLambertMaterial({
                    map: faceTexture,
                    color: 0xffffff, // Pure white - no green tinting to preserve text colors
                    transparent: false,
                    opacity: 1.0
                });
                
                // Apply the new material
                cylinderObject.material = texturedMaterial;
                
                // Store reference for cleanup
                cylinderObject.userData.audioFaceTexture = faceTexture;
                cylinderObject.userData.hasAudioFaceTexture = true;
                
                console.log(`✅ Successfully applied face texture to: ${fileData.name}`);
                return true;
                
            } catch (error) {
                console.error(`❌ Error applying face texture to audio cylinder:`, error);
                return false;
            }
        }
        
        /**
         * Remove face texture from audio cylinder and restore original material
         * @param {THREE.Mesh} cylinderObject - The cylinder mesh
         */
        removeFaceTextureFromAudioCylinder(cylinderObject) {
            try {
                if (!cylinderObject.userData.hasAudioFaceTexture) {
                    return false;
                }
                
                console.log(`🗑️ Removing audio face texture from: ${cylinderObject.userData.fileName}`);
                
                // Dispose of the texture
                if (cylinderObject.userData.audioFaceTexture) {
                    cylinderObject.userData.audioFaceTexture.dispose();
                    delete cylinderObject.userData.audioFaceTexture;
                }
                
                // Restore original material (simple colored material)
                const originalMaterial = new this.THREE.MeshLambertMaterial({
                    color: 0x44ff44, // Standard audio green color
                    transparent: false,
                    opacity: 1.0
                });
                
                cylinderObject.material = originalMaterial;
                cylinderObject.userData.hasAudioFaceTexture = false;
                
                console.log(`✅ Removed face texture and restored original material`);
                return true;
                
            } catch (error) {
                console.error(`❌ Error removing audio face texture:`, error);
                return false;
            }
        }
        
        /**
         * Check if object is an audio file that supports face textures
         * @param {THREE.Mesh} object - Object to check
         * @returns {boolean} - True if audio file supporting face textures
         */
        isAudioFileObject(object) {
            if (!object || !object.userData) return false;
            
            const fileData = object.userData.fileData;
            if (!fileData) return false;
            
            // Check if it's a cylinder (audio objects are cylinders)
            const isCylinder = object.geometry && object.geometry.type === 'CylinderGeometry';
            
            // Check if it's an audio file
            const isAudio = this.metadataParser.isAudioFile(fileData.name || fileData.fileName || '');
            
            return isCylinder && isAudio;
        }
        
        /**
         * Batch apply face textures to multiple audio objects
         * @param {Array} audioObjects - Array of audio cylinder objects
         */
        batchApplyAudioFaceTextures(audioObjects) {
            console.log(`🎵 Batch applying face textures to ${audioObjects.length} audio objects`);
            
            let successCount = 0;
            
            audioObjects.forEach(object => {
                if (this.isAudioFileObject(object)) {
                    const success = this.applyFaceTextureToAudioCylinder(object, object.userData.fileData);
                    if (success) successCount++;
                }
            });
            
            console.log(`✅ Successfully applied face textures to ${successCount}/${audioObjects.length} audio objects`);
            return successCount;
        }
        
        /**
         * Clear texture cache to free memory
         */
        clearTextureCache() {
            console.log(`🗑️ Clearing audio texture cache (${this.textureCache.size} textures)`);
            
            this.textureCache.forEach(texture => {
                if (texture.dispose) texture.dispose();
            });
            
            this.textureCache.clear();
            console.log(`✅ Audio texture cache cleared`);
        }
    }

    // Export the class
    window.AudioFaceTextureManager = AudioFaceTextureManager;
    console.log("AudioFaceTextureManager module loaded successfully");
})();
