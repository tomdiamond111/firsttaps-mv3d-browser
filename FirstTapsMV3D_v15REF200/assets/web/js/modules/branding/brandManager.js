// modules/branding/brandManager.js
// Core Brand Manager for App Object Branding System
// Dependencies: THREE, window.BrandDatabase
// Exports: window.BrandManager

(function() {
    'use strict';
    console.log("Loading BrandManager module...");

    // ============================================================================
    // BRAND MANAGER - CORE BRANDING LOGIC
    // ============================================================================
    
    class BrandManager {
        constructor(THREE) {
            this.THREE = THREE;
            this.brandDatabase = new window.BrandDatabase();
            
            // Canvas settings for high-quality text rendering
            this.canvasWidth = 512;
            this.canvasHeight = 512;
            this.textPadding = 40;
            
            console.log('BrandManager initialized with enhanced text rendering');
        }

        /**
         * Apply comprehensive branding to an app object
         * @param {Object} appObject - THREE.js mesh object
         * @param {Object} appData - App data with name, etc.
         * @returns {boolean} - Success status
         */
        applyBrandingToObject(appObject, appData) {
            try {
                // Get brand data
                const brandData = this.getBrandData(appData.name);
                
                // Create branded materials for all faces
                const brandedMaterials = this.createBrandedMaterials(brandData);
                
                // Apply materials to object
                appObject.material = brandedMaterials;
                
                // Store brand info in userData for persistence
                appObject.userData.brandData = brandData;
                appObject.userData.originalBaseColor = parseInt(brandData.primaryColor.replace('#', '0x'));
                
                // console.log('✅ Branding applied successfully to:', appData.name);
                return true;
                
            } catch (error) {
                console.error('❌ Error applying branding:', error);
                return false;
            }
        }

        /**
         * Get brand data with fallback to default
         * @param {string} appName - Name of the app
         * @returns {Object} - Brand data
         */
        getBrandData(appName) {
            // Try exact match first
            let brandData = this.brandDatabase.getBrandByName(appName);
            
            // Try partial match if no exact match
            if (!brandData) {
                brandData = this.brandDatabase.findBrandByPartialMatch(appName);
            }
            
            // Fallback to default if still no match
            if (!brandData) {
                brandData = this.brandDatabase.getDefaultBrand();
                brandData.name = appName || 'Unknown App';
            }
            
            return brandData;
        }

        /**
         * Create branded materials for all 6 faces of a cube
         * @param {Object} brandData - Brand styling data
         * @returns {Array} - Array of 6 materials
         */
        createBrandedMaterials(brandData) {
            // console.log('🔨 Creating branded materials for:', brandData.name);
            
            // Create front face texture with large app name
            const frontTexture = this.createFrontFaceTexture(brandData);
            
            // Create back face texture with large app name
            const backTexture = this.createBackFaceTexture(brandData);
            
            // Convert colors
            const primaryColorHex = parseInt(brandData.primaryColor.replace('#', '0x'));
            const secondaryColorHex = parseInt(brandData.secondaryColor.replace('#', '0x'));
            
            // Create materials array [right, left, top, bottom, front, back]
            const materials = [
                // Right face - secondary color with gloss
                this.createGlossyMaterial(secondaryColorHex),
                // Left face - secondary color with gloss  
                this.createGlossyMaterial(secondaryColorHex),
                // Top face - primary color with gloss
                this.createGlossyMaterial(primaryColorHex),
                // Bottom face - primary color with gloss
                this.createGlossyMaterial(primaryColorHex),
                // Front face - branded texture
                this.createTexturedMaterial(frontTexture),
                // Back face - branded texture
                this.createTexturedMaterial(backTexture)
            ];
            
            // console.log('✅ Created 6 branded materials');
            return materials;
        }

        /**
         * Create front face texture with large app name
         * @param {Object} brandData - Brand styling data
         * @returns {THREE.Texture} - Canvas texture
         */
        createFrontFaceTexture(brandData) {
            const canvas = document.createElement('canvas');
            canvas.width = this.canvasWidth;
            canvas.height = this.canvasHeight;
            const ctx = canvas.getContext('2d');
            
            // Create gradient background
            const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
            gradient.addColorStop(0, brandData.gradientColors[0]);
            gradient.addColorStop(1, brandData.gradientColors[1] || brandData.gradientColors[0]);
            
            // Fill background
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Add glossy overlay effect
            this.addGlossyOverlay(ctx);
            
            // Render large app name
            this.renderLargeText(ctx, brandData.name, brandData);
            
            // Create texture
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // console.log('📱 Created front face texture for:', brandData.name);
            return texture;
        }

        /**
         * Create back face texture with large app name
         * @param {Object} brandData - Brand styling data
         * @returns {THREE.Texture} - Canvas texture
         */
        createBackFaceTexture(brandData) {
            const canvas = document.createElement('canvas');
            canvas.width = this.canvasWidth;
            canvas.height = this.canvasHeight;
            const ctx = canvas.getContext('2d');
            
            // Use secondary color for back face
            const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
            gradient.addColorStop(0, brandData.secondaryColor);
            gradient.addColorStop(1, brandData.primaryColor);
            
            // Fill background
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Add glossy overlay effect
            this.addGlossyOverlay(ctx);
            
            // Render large app name
            this.renderLargeText(ctx, brandData.name, brandData);
            
            // Create texture
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // console.log('📱 Created back face texture for:', brandData.name);
            return texture;
        }

        /**
         * Add glossy overlay effect to canvas
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         */
        addGlossyOverlay(ctx) {
            // Create radial highlight for glassy effect
            const centerX = this.canvasWidth / 2;
            const centerY = this.canvasHeight / 4; // Upper portion
            const radius = this.canvasWidth * 0.6;
            
            const glossGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            glossGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = glossGradient;
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        }

        /**
         * Render large text that fills the available space
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {string} text - Text to render
         * @param {Object} brandData - Brand styling data
         */
        renderLargeText(ctx, text, brandData) {
            const maxWidth = this.canvasWidth - (this.textPadding * 2);
            const maxHeight = this.canvasHeight - (this.textPadding * 2);
            
            // Start with a large font size and scale down if needed
            let fontSize = 120;
            let fontFamily = 'Arial, sans-serif'; // Fallback to Arial for reliability
            
            ctx.fillStyle = brandData.textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${fontSize}px ${fontFamily}`;
            
            // Measure text and scale down if too wide
            let textMetrics = ctx.measureText(text);
            let textWidth = textMetrics.width;
            
            // Scale font size to fit width
            if (textWidth > maxWidth) {
                fontSize = Math.floor((maxWidth / textWidth) * fontSize);
                ctx.font = `bold ${fontSize}px ${fontFamily}`;
                textMetrics = ctx.measureText(text);
            }
            
            // Check if text fits in height (approximate)
            const textHeight = fontSize * 1.2; // Rough estimate
            if (textHeight > maxHeight) {
                fontSize = Math.floor((maxHeight / textHeight) * fontSize);
                ctx.font = `bold ${fontSize}px ${fontFamily}`;
            }
            
            // Add text shadow for better visibility
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.shadowBlur = 4;
            
            // Draw the text in center
            const centerX = this.canvasWidth / 2;
            const centerY = this.canvasHeight / 2;
            
            // Handle multi-word text by splitting if necessary
            const words = text.split(' ');
            if (words.length > 1 && ctx.measureText(text).width > maxWidth * 0.9) {
                // Draw words on separate lines
                const lineHeight = fontSize * 1.2;
                const totalHeight = words.length * lineHeight;
                const startY = centerY - (totalHeight / 2) + (lineHeight / 2);
                
                words.forEach((word, index) => {
                    ctx.fillText(word, centerX, startY + (index * lineHeight));
                });
            } else {
                // Draw as single line
                ctx.fillText(text, centerX, centerY);
            }
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
        }

        /**
         * Create glossy material without texture
         * @param {number} colorHex - Color in hex format
         * @returns {THREE.Material} - Glossy material
         */
        createGlossyMaterial(colorHex) {
            return new this.THREE.MeshStandardMaterial({
                color: colorHex,
                metalness: 0.3,
                roughness: 0.1, // Low roughness for glossy effect
                transparent: true,
                opacity: 0.95
            });
        }

        /**
         * Create material with texture
         * @param {THREE.Texture} texture - Texture to apply
         * @returns {THREE.Material} - Textured material
         */
        createTexturedMaterial(texture) {
            return new this.THREE.MeshStandardMaterial({
                map: texture,
                metalness: 0.2,
                roughness: 0.15, // Slightly less glossy for text readability
                transparent: true,
                opacity: 0.98
            });
        }

        /**
         * Check if an object has branding applied
         * @param {Object} appObject - THREE.js mesh object
         * @returns {boolean} - True if object has branding
         */
        hasBranding(appObject) {
            return appObject.userData && appObject.userData.brandData;
        }

        /**
         * Remove branding from an object
         * @param {Object} appObject - THREE.js mesh object
         * @returns {boolean} - Success status
         */
        removeBranding(appObject) {
            try {
                if (appObject.userData.brandData) {
                    delete appObject.userData.brandData;
                }
                
                // Dispose of current materials if they're textures
                if (Array.isArray(appObject.material)) {
                    appObject.material.forEach(material => {
                        if (material.map) {
                            material.map.dispose();
                        }
                        material.dispose();
                    });
                }
                
                console.log('✅ Branding removed from object');
                return true;
                
            } catch (error) {
                console.error('❌ Error removing branding:', error);
                return false;
            }
        }
    }

    // Export the class
    window.BrandManager = BrandManager;
    console.log("BrandManager module loaded successfully");
})();
