/**
 * LINK TITLE LABELS
 * Displays truncated titles above link objects for easier identification
 */

(function() {
    'use strict';

    /**
     * Link Title Label Manager
     */
    class LinkTitleManager {
        constructor() {
            this.THREE = window.THREE;
            this.labels = new Map(); // linkObjectUUID -> labelSprite
            this.enabled = true; // Toggle labels on/off
            this.maxTitleLength = 14; // Truncate to 14 characters
        }

        /**
         * Check if a link object is still valid and in the scene
         * @param {THREE.Object3D} linkObject - The link object to check
         * @returns {boolean} True if object is valid and in scene
         */
        isObjectStillInScene(linkObject) {
            if (!linkObject || !linkObject.userData || !linkObject.userData.id) {
                return false;
            }
            
            // Check if object still exists in the stateManager's fileObjects array
            const app = window.app;
            if (!app || !app.stateManager || !Array.isArray(app.stateManager.fileObjects)) {
                return false;
            }
            
            // Verify object is still tracked in the scene
            const stillExists = app.stateManager.fileObjects.some(obj => obj.uuid === linkObject.uuid);
            return stillExists && linkObject.parent !== null; // Must have a parent (be in scene hierarchy)
        }

        /**
         * Create or update title label for a link object
         * @param {THREE.Object3D} linkObject - The link object mesh
         * @returns {THREE.Sprite} The label sprite
         */
        createOrUpdateLabel(linkObject) {
            if (!this.enabled || !linkObject) {
                return null;
            }
            
            // CRITICAL FIX: Verify object is still in scene before creating label
            // This prevents orphaned labels when async operations complete after object removal
            if (!this.isObjectStillInScene(linkObject)) {
                return null;
            }

            try {
                // Get title from linkData or metadata
                const title = this.extractTitle(linkObject);
                
                if (!title || title === 'undefined') {
                    return null;
                }

                // Truncate title
                const truncatedTitle = this.truncateTitle(title);

                // Check if label already exists
                const existingLabel = this.labels.get(linkObject.uuid);
                if (existingLabel) {
                    this.updateLabelText(existingLabel, truncatedTitle);
                    return existingLabel;
                }

                // Create new label
                const labelSprite = this.createLabelSprite(truncatedTitle);
                
                // Position label above object
                this.positionLabel(labelSprite, linkObject);
                
                // Find scene - check multiple sources
                let scene = window.scene || window.app?.scene;
                
                // If still no scene, try to find it from the link object's parent hierarchy
                if (!scene && linkObject.parent) {
                    let parent = linkObject.parent;
                    while (parent && !scene) {
                        if (parent.type === 'Scene') {
                            scene = parent;
                            break;
                        }
                        parent = parent.parent;
                    }
                }
                
                // Add directly to scene (not parented to object, uses world position)
                if (scene) {
                    scene.add(labelSprite);
                    
                    // Set initial visibility based on distance
                    const camera = window.app?.camera || window.camera;
                    if (camera) {
                        const distance = camera.position.distanceTo(labelSprite.position);
                        labelSprite.visible = this.enabled && distance <= 40;
                    } else {
                        labelSprite.visible = this.enabled;
                    }
                } else {
                    console.warn('📝 Scene not available, cannot add label');
                    return null;
                }
                
                // Store reference - keep direct reference to link object for efficient updates
                this.labels.set(linkObject.uuid, labelSprite);
                labelSprite.userData.linkObject = linkObject; // Direct reference - no UUID search needed!
                
                return labelSprite;
            } catch (error) {
                console.error('📝 Error creating label:', error);
                console.error('📝 Link object:', linkObject);
                console.error('📝 userData:', linkObject.userData);
                return null;
            }
        }

        /**
         * Extract title from link object
         */
        extractTitle(linkObject) {
            // Check for platform-specific metadata first (Spotify, YouTube, Deezer, etc.)
            if (linkObject.userData.spotifyMetadata?.title) {
                return linkObject.userData.spotifyMetadata.title;
            }
            
            if (linkObject.userData.youtubeMetadata?.title) {
                return linkObject.userData.youtubeMetadata.title;
            }
            
            if (linkObject.userData.deezerMetadata?.title) {
                return linkObject.userData.deezerMetadata.title;
            }
            
            if (linkObject.userData.vimeoMetadata?.title) {
                return linkObject.userData.vimeoMetadata.title;
            }
            
            if (linkObject.userData.instagramMetadata?.title) {
                return linkObject.userData.instagramMetadata.title;
            }
            
            // Priority order for title sources
            const sources = [
                linkObject.userData.linkData?.title,
                linkObject.userData.linkData?.name,
                linkObject.userData.fileName,
                linkObject.userData.fileData?.name,
                linkObject.name
            ];

            for (const source of sources) {
                if (source && typeof source === 'string' && source.trim()) {
                    const trimmed = source.trim();
                    
                    // Extract domain from "Link (domain.com)" format
                    if (trimmed.startsWith('Link (') && trimmed.endsWith(')')) {
                        const domain = trimmed.substring(6, trimmed.length - 1); // Extract text between "Link (" and ")"
                        if (domain) {
                            return domain;
                        }
                    }
                    
                    // Skip generic titles like "Spotify Track" or "Instagram Link"
                    if (!trimmed.endsWith(' Track') && !trimmed.endsWith(' Link')) {
                        return trimmed;
                    }
                }
            }

            // Fallback: Try to extract from URL
            if (linkObject.userData.linkData?.url) {
                const url = linkObject.userData.linkData.url;
                
                // Instagram link -> "Instagram"
                if (url.includes('instagram.com')) {
                    return 'Instagram';
                }
                
                // Extract from platform
                const platform = linkObject.userData.linkData.platform;
                if (platform) {
                    const title = platform.charAt(0).toUpperCase() + platform.slice(1);
                    return title;
                }
            }

            return 'Link';
        }

        /**
         * Truncate title to max length
         */
        truncateTitle(title) {
            if (!title) return '';
            
            if (title.length <= this.maxTitleLength) {
                return title;
            }
            
            // Truncate and add ellipsis
            return title.substring(0, this.maxTitleLength - 1) + '…';
        }

        /**
         * Create label sprite with text
         */
        createLabelSprite(text) {
            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size
            const fontSize = 32;
            const padding = 8;
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            
            canvas.width = textWidth + padding * 2;
            canvas.height = fontSize + padding * 2;
            
            // Draw background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw text
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'top';
            ctx.fillText(text, padding, padding);
            
            // Create texture from canvas
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.minFilter = this.THREE.LinearFilter;
            texture.magFilter = this.THREE.LinearFilter;
            
            // Create sprite material
            const material = new this.THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9,
                depthTest: true, // Respect depth buffer so labels hide behind objects
                depthWrite: false
            });
            
            // Create sprite
            const sprite = new this.THREE.Sprite(material);
            
            // Scale sprite based on text width (adjust size for readability)
            const aspectRatio = canvas.width / canvas.height;
            const spriteHeight = 0.8; // Height in world units
            sprite.scale.set(spriteHeight * aspectRatio, spriteHeight, 1);
            
            sprite.userData.isLinkTitleLabel = true;
            sprite.userData.labelText = text;
            
            return sprite;
        }

        /**
         * Update label text
         */
        updateLabelText(labelSprite, newText) {
            if (!labelSprite || !labelSprite.material || !labelSprite.material.map) return;
            
            // Create new canvas with updated text
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const fontSize = 32;
            const padding = 8;
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            const textMetrics = ctx.measureText(newText);
            const textWidth = textMetrics.width;
            
            canvas.width = textWidth + padding * 2;
            canvas.height = fontSize + padding * 2;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'top';
            ctx.fillText(newText, padding, padding);
            
            // Update texture
            const newTexture = new this.THREE.CanvasTexture(canvas);
            newTexture.minFilter = this.THREE.LinearFilter;
            newTexture.magFilter = this.THREE.LinearFilter;
            
            labelSprite.material.map.dispose();
            labelSprite.material.map = newTexture;
            labelSprite.material.needsUpdate = true;
            
            // Update scale
            const aspectRatio = canvas.width / canvas.height;
            const spriteHeight = 0.8;
            labelSprite.scale.set(spriteHeight * aspectRatio, spriteHeight, 1);
            
            labelSprite.userData.labelText = newText;
        }

        /**
         * Position label above link object
         */
        positionLabel(labelSprite, linkObject) {
            // Get object height
            const objectHeight = linkObject.userData.objectHeight || 
                               linkObject.geometry?.parameters?.height || 2.5;
            
            // Force matrix world update to ensure position is current
            if (linkObject.parent) {
                linkObject.updateMatrixWorld(true);
            }
            
            // Always use world position for labels
            const worldPos = new this.THREE.Vector3();
            linkObject.getWorldPosition(worldPos);
            worldPos.y += (objectHeight / 2 + 0.6);
            labelSprite.position.copy(worldPos);
        }

        /**
         * Update label position for a specific link object
         */
        updateLabelPosition(linkObject) {
            if (!linkObject || !linkObject.uuid) return;
            
            const labelSprite = this.labels.get(linkObject.uuid);
            if (labelSprite) {
                this.positionLabel(labelSprite, linkObject);
                
                // Update visibility based on distance
                const camera = window.app?.camera || window.camera;
                if (camera) {
                    const distance = camera.position.distanceTo(labelSprite.position);
                    labelSprite.visible = this.enabled && distance <= 40;
                }
            }
        }

        /**
         * Update label positions (call this in animation loop if needed)
         * Also handles distance culling and rotation
         */
        updateLabelPositions() {
            // Get camera for distance culling
            const camera = window.app?.camera || window.camera;
            if (!camera) return;
            
            // Track labels to remove (objects no longer in scene)
            const labelsToRemove = [];
            
            // Simply iterate labels and update based on their stored linkObject reference
            this.labels.forEach((labelSprite, uuid) => {
                const linkObject = labelSprite.userData.linkObject;
                
                // CRITICAL FIX: Remove labels for objects that no longer exist in scene
                if (!linkObject || !this.isObjectStillInScene(linkObject)) {
                    labelsToRemove.push(uuid);
                    return;
                }
                
                if (linkObject && linkObject.parent) { // Check if still in scene
                    // Update position
                    this.positionLabel(labelSprite, linkObject);
                    
                    // Distance culling: show labels only when camera is within 40 units
                    const distance = camera.position.distanceTo(labelSprite.position);
                    labelSprite.visible = this.enabled && distance <= 40;
                    
                    // Make label face camera
                    labelSprite.lookAt(camera.position);
                }
            });
            
            // Remove orphaned labels
            if (labelsToRemove.length > 0) {
                console.log(`🧹 Cleaning up ${labelsToRemove.length} orphaned labels`);
                labelsToRemove.forEach(uuid => this.removeLabel(uuid));
            }
        }

        /**
         * Remove label for a link object
         */
        removeLabel(linkObjectUUID) {
            const labelSprite = this.labels.get(linkObjectUUID);
            if (labelSprite) {
                // CRITICAL FIX: Multi-approach removal to prevent orphaned labels
                // Try removing via parent reference first
                if (labelSprite.parent) {
                    labelSprite.parent.remove(labelSprite);
                } else {
                    // Fallback: try to find scene and remove directly
                    const scene = window.scene || window.app?.scene;
                    if (scene) {
                        scene.remove(labelSprite);
                    } else {
                        console.warn('📝 Label removal failed - no parent and no scene found for:', labelSprite.userData?.text);
                    }
                }
                
                // Dispose of resources
                if (labelSprite.material) {
                    if (labelSprite.material.map) {
                        labelSprite.material.map.dispose();
                    }
                    labelSprite.material.dispose();
                }
                if (labelSprite.geometry) {
                    labelSprite.geometry.dispose();
                }
                this.labels.delete(linkObjectUUID);
            }
        }

        /**
         * Remove all labels
         */
        removeAllLabels() {
            this.labels.forEach((labelSprite, uuid) => {
                this.removeLabel(uuid);
            });
            this.labels.clear();
        }

        /**
         * Enable/disable labels
         */
        setEnabled(enabled) {
            this.enabled = enabled;
            
            if (!enabled) {
                // Hide all labels
                this.labels.forEach(sprite => {
                    sprite.visible = false;
                });
            } else {
                // Show all labels
                this.labels.forEach(sprite => {
                    sprite.visible = true;
                });
            }
        }

        /**
         * Set max title length
         */
        setMaxTitleLength(length) {
            this.maxTitleLength = Math.max(5, Math.min(20, length));
        }
    }

    // Export to global scope
    window.LinkTitleManager = LinkTitleManager;
    
    // Create global instance
    try {
        window.linkTitleManager = new LinkTitleManager();
        console.log('✅ Link Title Labels module loaded');
    } catch (error) {
        console.error('❌ ERROR creating linkTitleManager:', error);
    }
})();
