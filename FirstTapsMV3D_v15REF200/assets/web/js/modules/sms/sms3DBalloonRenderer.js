/**
 * SMS 3D Balloon Renderer
 * Handles text rendering and material creation for message balloons
 */

(function() {
    'use strict';

    /**
     * Balloon Renderer
     */
    class Sms3DBalloonRenderer {
        constructor(settings) {
            this.settings = settings || window.Sms3DSettings;
            this.canvasCache = new Map(); // Cache for text canvases
            
            console.log('🎨 SMS 3D Balloon Renderer initialized');
        }

        /**
         * Wrap text to fit within max width
         */
        wrapText(ctx, text, maxWidth) {
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';

            for (let word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            
            if (currentLine) {
                lines.push(currentLine);
            }

            return lines;
        }

        /**
         * Calculate balloon dimensions based on text content
         */
        calculateDimensions(text, isOutgoing) {
            const textConfig = this.settings.getTextSize();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            ctx.font = `${textConfig.fontSize}px Arial`;
            
            const maxWidth = 400; // Max balloon width (smaller for better text fit)
            const lines = this.wrapText(ctx, text, maxWidth);
            
            // Find longest line
            let longestWidth = 0;
            lines.forEach(line => {
                const width = ctx.measureText(line).width;
                if (width > longestWidth) longestWidth = width;
            });

            const width = Math.max(longestWidth + (textConfig.padding * 2), 100);
            const height = (lines.length * textConfig.lineHeight) + (textConfig.padding * 2);
            const depth = 0.5; // Balloon depth

            return {
                width: width / 80, // Smaller divisor for proper sizing in 3D space
                height: height / 80,
                depth: depth,
                lines: lines,
                textConfig: textConfig
            };
        }

        /**
         * Create text canvas texture
         */
        createTextCanvas(text, isOutgoing, dimensions) {
            const textConfig = dimensions.textConfig;
            const colorScheme = this.settings.getColorScheme();
            const colors = isOutgoing ? colorScheme.outgoing : colorScheme.incoming;
            
            // Canvas size in pixels
            const canvasWidth = Math.ceil(dimensions.width * 100);
            const canvasHeight = Math.ceil(dimensions.height * 100);
            
            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');

            // Background
            if (colors.glitter) {
                this.drawGlitterBackground(ctx, canvasWidth, canvasHeight, colors.base);
            } else {
                ctx.fillStyle = colors.base;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }

            // Draw text
            ctx.fillStyle = colors.text;
            ctx.font = `${textConfig.fontSize}px Arial`;
            ctx.textBaseline = 'top';

            let yOffset = textConfig.padding;
            dimensions.lines.forEach(line => {
                ctx.fillText(line, textConfig.padding, yOffset);
                yOffset += textConfig.lineHeight;
            });

            return canvas;
        }

        /**
         * Draw glitter background
         */
        drawGlitterBackground(ctx, width, height, baseColor) {
            // Fill base color
            ctx.fillStyle = baseColor;
            ctx.fillRect(0, 0, width, height);

            // Add glitter particles
            const particleCount = Math.floor((width * height) / 1000);
            
            for (let i = 0; i < particleCount; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 3 + 1;
                const brightness = Math.random() * 100 + 155;
                
                ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        /**
         * Create balloon material
         */
        createMaterial(textCanvas) {
            const texture = new THREE.CanvasTexture(textCanvas);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            const opacity = this.settings.getSetting('opacity');
            
            // Shiny rubber balloon material
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                opacity: opacity,
                side: THREE.DoubleSide,
                metalness: 0.85,      // High metalness for shiny reflections
                roughness: 0.15,      // Low roughness for smooth surface
                envMapIntensity: 1.5, // Boost environment reflections
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0
            });
            
            // Add environment map if available
            if (window.scene && window.scene.environment) {
                material.envMap = window.scene.environment;
            }

            return material;
        }

        /**
         * Create capsule geometry for balloon
         */
        createCapsuleGeometry(dimensions) {
            // Try to use CapsuleGeometry if available (THREE.js r128+)
            if (THREE.CapsuleGeometry) {
                // CapsuleGeometry(radius, length, capSegments, radialSegments)
                const radius = dimensions.depth / 2;
                const length = dimensions.height - (radius * 2); // Subtract hemisphere caps
                
                const geometry = new THREE.CapsuleGeometry(
                    radius,
                    length,
                    8,  // cap segments
                    16  // radial segments
                );
                
                // Scale to match width
                geometry.scale(dimensions.width / (radius * 2), 1, 1);
                
                return geometry;
            }
            
            // Fallback: Create rounded cylinder using SphereGeometry + CylinderGeometry
            const radius = dimensions.depth / 2;
            const cylinderHeight = dimensions.height - (radius * 2);
            
            // Create cylinder body
            const cylinder = new THREE.CylinderGeometry(
                radius,
                radius,
                cylinderHeight,
                16,  // radial segments
                1    // height segments
            );
            
            // Create top hemisphere
            const topSphere = new THREE.SphereGeometry(
                radius,
                16,  // width segments
                8,   // height segments
                0,   // phiStart
                Math.PI * 2, // phiLength (full circle)
                0,   // thetaStart (top)
                Math.PI / 2  // thetaLength (hemisphere)
            );
            topSphere.translate(0, cylinderHeight / 2, 0);
            
            // Create bottom hemisphere
            const bottomSphere = new THREE.SphereGeometry(
                radius,
                16,
                8,
                0,
                Math.PI * 2,
                Math.PI / 2, // Start at bottom
                Math.PI / 2
            );
            bottomSphere.translate(0, -cylinderHeight / 2, 0);
            
            // Merge geometries
            const geometry = new THREE.BufferGeometry();
            const geometries = [cylinder, topSphere, bottomSphere];
            
            // Simple merge (THREE.js r125+ uses mergeGeometries utility)
            if (THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeGeometries) {
                const merged = THREE.BufferGeometryUtils.mergeGeometries(geometries);
                geometry.copy(merged);
            } else {
                // Fallback to cylinder only if merging not available
                geometry.copy(cylinder);
            }
            
            // Scale width to match desired dimensions
            geometry.scale(dimensions.width / (radius * 2), 1, 1);
            
            return geometry;
        }

        /**
         * Create capsule-shaped message bubble using Canvas (for crisp text rendering)
         */
        createCanvasBalloon(text, isOutgoing, timestamp) {
            const colorScheme = this.settings.getColorScheme();
            const colors = isOutgoing ? colorScheme.outgoing : colorScheme.incoming;
            
            // Use consistent font size (16px) for all balloons
            const fontSize = 16;
            
            // Wrap text for display
            const maxCharsPerLine = 40;
            const lines = this.wrapTextToLines(text, maxCharsPerLine);
            
            // Create high-resolution canvas for crisp rendering
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { alpha: true });
            const scale = 2; // High DPI scaling for crisp text
            
            // Calculate dimensions
            ctx.font = `500 ${fontSize * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`;
            
            // Measure actual text width
            let maxTextWidth = 0;
            lines.forEach(line => {
                const metrics = ctx.measureText(line);
                maxTextWidth = Math.max(maxTextWidth, metrics.width);
            });
            
            const paddingX = 16 * scale;
            const paddingY = 10 * scale; // Padding for vertical centering
            const lineHeight = fontSize * scale * 1.15; // Tighter line height
            const timestampSize = 8 * scale; // 25% smaller than original 11px
            const timestampGap = 45 * scale; // Gap before timestamp (~5 character spaces)
            
            // Reserve space for timestamp (approximate width: 8 chars at ~60% of font size)
            const timestampWidth = timestamp ? (timestampSize * 8 * 0.6 + timestampGap) : 0;
            const bubbleWidth = maxTextWidth + (paddingX * 2) + timestampWidth;
            const textBlockHeight = lines.length * lineHeight;
            // Height: just text + padding (timestamp will be inline)
            const bubbleHeight = paddingY + textBlockHeight + paddingY;
            const cornerRadius = Math.min(bubbleHeight / 2, 30 * scale);
            
            // Set canvas size
            canvas.width = bubbleWidth + (20 * scale);
            canvas.height = bubbleHeight + (20 * scale);
            
            // Re-set font after canvas resize
            ctx.font = `500 ${fontSize * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`;
            ctx.textBaseline = 'top';
            
            const offsetX = 10 * scale;
            const offsetY = 10 * scale;
            
            // Draw shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 6 * scale;
            ctx.shadowOffsetX = 2 * scale;
            ctx.shadowOffsetY = 3 * scale;
            
            // Draw capsule background
            ctx.fillStyle = colors.base;
            this.drawRoundedRect(ctx, offsetX, offsetY, bubbleWidth, bubbleHeight, cornerRadius);
            ctx.fill();
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // Draw gradient overlay for 3D effect
            const gradient = ctx.createLinearGradient(offsetX, offsetY, offsetX + bubbleWidth, offsetY + bubbleHeight);
            gradient.addColorStop(0, this.lightenColor(colors.base, 0.15));
            gradient.addColorStop(0.5, colors.base);
            gradient.addColorStop(1, this.darkenColor(colors.base, 0.1));
            ctx.fillStyle = gradient;
            this.drawRoundedRect(ctx, offsetX, offsetY, bubbleWidth, bubbleHeight, cornerRadius);
            ctx.fill();
            
            // Draw subtle shine
            const shine = ctx.createRadialGradient(
                offsetX + bubbleWidth * 0.3, offsetY + bubbleHeight * 0.2, 0,
                offsetX + bubbleWidth * 0.3, offsetY + bubbleHeight * 0.2, bubbleWidth * 0.5
            );
            shine.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            shine.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = shine;
            ctx.fillRect(offsetX, offsetY, bubbleWidth, bubbleHeight * 0.4);
            
            // Draw border
            ctx.strokeStyle = this.darkenColor(colors.base, 0.25);
            ctx.lineWidth = 2 * scale;
            this.drawRoundedRect(ctx, offsetX, offsetY, bubbleWidth, bubbleHeight, cornerRadius);
            ctx.stroke();
            
            // Draw text with high quality
            ctx.fillStyle = colors.text;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 2 * scale;
            ctx.shadowOffsetY = 1 * scale;
            
            lines.forEach((line, i) => {
                ctx.fillText(line, offsetX + paddingX, offsetY + paddingY + (i * lineHeight));
            });
            
            // Draw timestamp inline with last line of text
            if (timestamp) {
                ctx.font = `400 ${timestampSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`;
                ctx.globalAlpha = 0.65;
                
                // Calculate position: after last line of text with small gap
                const lastLineY = offsetY + paddingY + ((lines.length - 1) * lineHeight);
                const lastLineText = lines[lines.length - 1];
                // Re-measure with correct font for accurate width
                ctx.font = `500 ${fontSize * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`;
                const lastLineWidth = ctx.measureText(lastLineText).width;
                ctx.font = `400 ${timestampSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`;
                
                // Position timestamp inline after last line
                ctx.fillText(timestamp, offsetX + paddingX + lastLineWidth + timestampGap, lastLineY + (lineHeight - timestampSize));
                
                ctx.globalAlpha = 1.0;
            }
            
            return canvas;
        }
        
        /**
         * Draw rounded rectangle path
         */
        drawRoundedRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }

        /**
         * Wrap text into lines
         */
        wrapTextToLines(text, maxChars) {
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            
            for (let word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                if (testLine.length > maxChars && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
            
            return lines.slice(0, 3); // Max 3 lines
        }

        /**
         * Darken a color by percentage
         */
        darkenColor(hex, percent) {
            const num = parseInt(hex.replace('#', ''), 16);
            const r = Math.max(0, Math.floor((num >> 16) * (1 - percent)));
            const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - percent)));
            const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - percent)));
            return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        }

        /**
         * Lighten a color by percentage
         */
        lightenColor(hex, percent) {
            const num = parseInt(hex.replace('#', ''), 16);
            const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * percent));
            const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * percent));
            const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * percent));
            return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        }

        /**
         * Create sprite from Canvas texture
         */
        createBalloon(text, isOutgoing, timestamp) {
            // Format timestamp if provided
            let formattedTime = '';
            if (timestamp) {
                const date = new Date(timestamp);
                let hours = date.getHours();
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12; // Convert to 12-hour format
                formattedTime = `${hours}:${minutes} ${ampm}`;
            }
            
            // Create high-quality canvas texture
            const canvas = this.createCanvasBalloon(text, isOutgoing, formattedTime);
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = 16; // Maximum anisotropic filtering for crisp text
            texture.needsUpdate = true;
            
            // Create sprite with the canvas texture
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: true,
                depthWrite: false,
                sizeAttenuation: true
            });
            
            const sprite = new THREE.Sprite(spriteMaterial);
            
            // Calculate dynamic scale based on text size setting
            const textSize = this.settings.getTextSize();
            const baseScale = 1.5; // Reduced from 3.0 (50% smaller)
            
            // Scale multiplier based on fontSize (small=14, medium=18, large=24)
            const sizeMultiplier = textSize.fontSize / 18;
            
            // Calculate text length factor
            const maxCharsPerLine = textSize.fontSize <= 14 ? 45 : (textSize.fontSize <= 18 ? 38 : 30);
            const lines = this.wrapTextToLines(text, maxCharsPerLine);
            const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '');
            
            // Calculate aspect ratio from canvas
            const aspectRatio = canvas.width / canvas.height;
            const heightMultiplier = Math.min(1.3, 0.6 + (lines.length * 0.25));
            
            // Apply uniform scaling based on canvas aspect ratio (no horizontal stretching)
            sprite.scale.set(
                baseScale * heightMultiplier * sizeMultiplier * aspectRatio,
                baseScale * heightMultiplier * sizeMultiplier,
                1
            );
            
            // Store metadata including dimensions for spacing
            sprite.userData.isOutgoing = isOutgoing;
            sprite.userData.messageText = text;
            sprite.userData.isBalloonSprite = true;
            sprite.userData.lineCount = lines.length;
            sprite.userData.heightMultiplier = heightMultiplier * sizeMultiplier;
            
            return sprite;
        }

        /**
         * Update settings and clear cache
         */
        updateSettings(settings) {
            this.settings = settings;
            this.canvasCache.clear();
            console.log('🎨 Renderer settings updated, cache cleared');
        }
    }

    // Export globally
    window.Sms3DBalloonRenderer = Sms3DBalloonRenderer;

    console.log('🎨 SMS 3D Balloon Renderer module loaded');

})();
