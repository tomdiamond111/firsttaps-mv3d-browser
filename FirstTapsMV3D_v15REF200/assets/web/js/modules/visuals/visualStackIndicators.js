/**
 * Visual Stack Indicators Module
 * Provides visual feedback for stacked objects on pedestals during search operations
 * This is a standalone module that can be safely added/removed without affecting core functionality
 */
(function() {
    class VisualStackIndicators {
        constructor(scene, THREE) {
            this.scene = scene;
            this.THREE = THREE;
            this.activeIndicators = [];
            this.canvasCache = new Map(); // Cache textures for performance
            this.enabled = true; // Feature flag to easily enable/disable
            
            console.log('🎨 VisualStackIndicators module initialized');
        }

        /**
         * Enable or disable the visual indicators
         * @param {boolean} enabled - Whether to show indicators
         */
        setEnabled(enabled) {
            this.enabled = enabled;
            if (!enabled) {
                this.removeAllIndicators();
            }
        }

        /**
         * Create a stack count billboard (square, clear background, black bold text)
         * @param {number} count - Number of items in the stack
         * @param {THREE.Vector3} position - Position to place the billboard
         * @returns {THREE.Object3D} Billboard object
         */
        createStackCountBillboard(count, position) {
            if (!this.enabled || count <= 1) return null;

            // Check cache first
            const cacheKey = `count_${count}`;
            let texture = this.canvasCache.get(cacheKey);
            
            if (!texture) {
                // Create canvas for text rendering
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = 128;
                canvas.height = 128;
                
                // Clear background (transparent)
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                // Add subtle background circle for better visibility
                context.fillStyle = 'rgba(255, 255, 255, 0.9)';
                context.beginPath();
                context.arc(canvas.width / 2, canvas.height / 2, 50, 0, 2 * Math.PI);
                context.fill();
                
                // Add border
                context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                context.lineWidth = 2;
                context.stroke();
                
                // Set font (black, bold)
                context.font = 'bold 48px Arial';
                context.fillStyle = 'black';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                
                // Draw the count number
                context.fillText(count.toString(), canvas.width / 2, canvas.height / 2);
                
                // Create and cache texture
                texture = new this.THREE.CanvasTexture(canvas);
                this.canvasCache.set(cacheKey, texture);
            }

            // Create material and sprite
            const material = new this.THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true,
                alphaTest: 0.1
            });
            
            // Create sprite billboard
            const billboard = new this.THREE.Sprite(material);
            billboard.scale.set(2, 2, 1); // Square shape
            billboard.position.copy(position);
            billboard.userData.type = 'stackCountBillboard';
            billboard.userData.count = count;
            
            return billboard;
        }

        /**
         * Create a group label billboard showing the primary grouping attribute
         * @param {Array} stackObjects - Objects in the stack
         * @param {string} primaryCriteria - The primary stacking criteria
         * @param {THREE.Vector3} position - Position to place the billboard
         * @returns {THREE.Object3D} Billboard object
         */
        createGroupLabelBillboard(stackObjects, primaryCriteria, position) {
            if (!this.enabled || !stackObjects || stackObjects.length === 0) return null;
            
            // Generate label text based on criteria
            const labelText = this.generateGroupLabelText(stackObjects, primaryCriteria);
            
            // Check cache first
            const cacheKey = `label_${labelText}`;
            let texture = this.canvasCache.get(cacheKey);
            
            if (!texture) {
                // Create canvas for text rendering
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = 400;
                canvas.height = 80;
                
                // Clear background (transparent)
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                // Add subtle background for better visibility
                context.fillStyle = 'rgba(255, 255, 255, 0.8)';
                context.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
                
                // Add border
                context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                context.lineWidth = 1;
                context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
                
                // Set font (black, bold)
                context.font = 'bold 24px Arial';
                context.fillStyle = 'black';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                
                // Draw the label text
                context.fillText(labelText, canvas.width / 2, canvas.height / 2);
                
                // Create and cache texture
                texture = new this.THREE.CanvasTexture(canvas);
                this.canvasCache.set(cacheKey, texture);
            }

            // Create material and sprite
            const material = new this.THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true,
                alphaTest: 0.1
            });
            
            // Create sprite billboard
            const billboard = new this.THREE.Sprite(material);
            billboard.scale.set(6, 1.2, 1); // Rectangular shape
            billboard.position.copy(position);
            billboard.userData.type = 'groupLabelBillboard';
            billboard.userData.labelText = labelText;
            
            return billboard;
        }

        /**
         * Generate appropriate label text based on stacking criteria
         * @param {Array} stackObjects - Objects in the stack
         * @param {string} primaryCriteria - The primary stacking criteria
         * @returns {string} Label text
         */
        generateGroupLabelText(stackObjects, primaryCriteria) {
            if (!stackObjects || stackObjects.length === 0) return 'Empty';
            
            const firstObject = stackObjects[0];
            // Handle both search results (with fileObject) and direct objects
            const fileData = firstObject.fileObject?.userData?.fileData || firstObject.userData?.fileData;
            
            if (!fileData) return 'Unknown';
            
            switch (primaryCriteria) {
                case 'fileType':
                    const extension = fileData.name ? fileData.name.split('.').pop()?.toUpperCase() : 'Unknown';
                    return `Type: ${extension}`;
                    
                case 'fileName':
                    const fileName = fileData.name || 'Unknown';
                    const firstChar = fileName.charAt(0).toUpperCase();
                    return `Name: ${firstChar}*`;
                    
                case 'dateCreated':
                case 'dateModified':
                    const dateField = primaryCriteria === 'dateCreated' ? 'dateCreated' : 'lastModified';
                    const date = fileData[dateField];
                    if (date) {
                        const dateObj = new Date(date);
                        const formattedDate = dateObj.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric'
                        });
                        return `${primaryCriteria === 'dateCreated' ? 'Created' : 'Modified'}: ${formattedDate}`;
                    }
                    return `${primaryCriteria === 'dateCreated' ? 'Created' : 'Modified'}: Unknown`;
                    
                case 'fileSize':
                    const size = fileData.fileSize;
                    if (size !== undefined) {
                        const sizeCategory = this.getSizeCategory(size);
                        return `Size: ${sizeCategory}`;
                    }
                    return 'Size: Unknown';
                    
                default:
                    return `Grouped by: ${primaryCriteria}`;
            }
        }

        /**
         * Get size category for file size grouping
         * @param {number} bytes - File size in bytes
         * @returns {string} Size category
         */
        getSizeCategory(bytes) {
            if (bytes < 1024) return 'Tiny';
            if (bytes < 1024 * 1024) return 'Small';
            if (bytes < 1024 * 1024 * 10) return 'Medium';
            if (bytes < 1024 * 1024 * 100) return 'Large';
            return 'Huge';
        }

        /**
         * Add visual indicators to a pedestal with stacked objects
         * @param {THREE.Object3D} pedestal - The pedestal object
         * @param {Array} stackObjects - Objects placed on this pedestal
         * @param {number} totalCount - Total number of objects in this group
         * @param {Object} stackingConfig - Current stacking configuration
         */
        addIndicatorsToPedestal(pedestal, stackObjects, totalCount, stackingConfig = null) {
            if (!this.enabled || !pedestal || !stackObjects || stackObjects.length === 0) return;
            
            // Get primary criteria from config
            const primaryCriteria = stackingConfig?.primarySort || 'fileType';
            
            // Calculate positions for billboards
            const pedestalPosition = pedestal.position.clone();
            
            // Position count billboard on the front surface of the pedestal, at midpoint height
            const countPosition = pedestalPosition.clone();
            countPosition.z += 1.6; // In front of pedestal (radius is 1.5, so 1.6 is just in front)
            countPosition.y = 3.0; // Midpoint of 6-unit tall pedestal (center at y=3)
            
            // Position group label billboard also on the front surface, but lower
            const labelPosition = pedestalPosition.clone();
            labelPosition.z += 1.6; // Same Z position as count billboard (front surface)
            labelPosition.y = 1.5; // Lower on the pedestal (25% up from bottom)
            
            // Create and add count billboard (only if more than 1 object)
            if (totalCount > 1) {
                const countBillboard = this.createStackCountBillboard(totalCount, countPosition);
                if (countBillboard) {
                    this.scene.add(countBillboard);
                    this.activeIndicators.push(countBillboard);
                    console.log(`🎨 Added count billboard: ${totalCount} items`);
                }
            }
            
            // Create and add group label billboard with enhanced group info
            const labelBillboard = this.createGroupLabelBillboardWithConfig(stackObjects, primaryCriteria, labelPosition, stackingConfig);
            if (labelBillboard) {
                this.scene.add(labelBillboard);
                this.activeIndicators.push(labelBillboard);
                console.log(`🎨 Added label billboard: "${labelBillboard.userData.labelText}"`);
            }
        }

        /**
         * Create a group label billboard with enhanced configuration data
         * @param {Array} stackObjects - Objects in the stack
         * @param {string} primaryCriteria - The primary stacking criteria
         * @param {THREE.Vector3} position - Position to place the billboard
         * @param {Object} stackingConfig - Configuration containing group metadata
         * @returns {THREE.Object3D} Billboard object
         */
        createGroupLabelBillboardWithConfig(stackObjects, primaryCriteria, position, stackingConfig = null) {
            if (!this.enabled || !stackObjects || stackObjects.length === 0) return null;
            
            // Generate label text using enhanced configuration
            let labelText = 'Unknown';
            
            if (stackingConfig && stackingConfig.groupKey) {
                // Use the group key (e.g., "images-2024-01")
                const parts = stackingConfig.groupKey.split('-');
                if (parts.length >= 2) {
                    const category = parts[0];
                    const date = parts.slice(1).join('-');
                    labelText = `${category.charAt(0).toUpperCase() + category.slice(1)} (${date})`;
                } else {
                    labelText = stackingConfig.groupKey;
                }
            } else if (stackingConfig && stackingConfig.category) {
                // Use just the category
                labelText = stackingConfig.category.charAt(0).toUpperCase() + stackingConfig.category.slice(1);
            } else {
                // Fallback to standard label generation
                labelText = this.generateGroupLabelText(stackObjects, primaryCriteria);
            }
            
            // Check cache first
            const cacheKey = `label_${labelText}`;
            let texture = this.canvasCache.get(cacheKey);
            
            if (!texture) {
                // Create canvas for text rendering
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = 400;
                canvas.height = 80;
                
                // Clear background (transparent)
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                // Add white background to match count billboard design
                context.fillStyle = 'rgba(255, 255, 255, 0.95)'; // White background
                context.fillRect(5, 5, canvas.width - 10, canvas.height - 10);
                
                // Add black border to match count billboard
                context.strokeStyle = 'rgba(0, 0, 0, 0.8)'; // Black border
                context.lineWidth = 2;
                context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
                
                // Set font (black text to match count billboard, smaller for better fit)
                context.font = 'bold 20px Arial'; // Smaller font for better fit across pedestal
                context.fillStyle = 'black';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                
                // Draw the label text
                context.fillText(labelText, canvas.width / 2, canvas.height / 2);
                
                // Create and cache texture
                texture = new this.THREE.CanvasTexture(canvas);
                this.canvasCache.set(cacheKey, texture);
            }

            // Create material and sprite
            const material = new this.THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true,
                alphaTest: 0.1
            });
            
            // Create sprite billboard
            const billboard = new this.THREE.Sprite(material);
            billboard.scale.set(3, 0.8, 1); // Rectangular shape that fits well on pedestal surface
            billboard.position.copy(position);
            billboard.userData.type = 'groupLabelBillboard';
            billboard.userData.labelText = labelText;
            
            return billboard;
        }

        /**
         * Remove all active visual indicators from the scene
         */
        removeAllIndicators() {
            console.log(`🎨 Removing ${this.activeIndicators.length} visual indicators`);
            
            this.activeIndicators.forEach(indicator => {
                if (indicator.parent) {
                    indicator.parent.remove(indicator);
                }
                
                // Dispose of materials (but keep cached textures)
                if (indicator.material && !this.canvasCache.has(indicator.userData.cacheKey)) {
                    indicator.material.dispose();
                }
            });
            
            this.activeIndicators = [];
        }

        /**
         * Update indicators for new pedestal data
         * @param {Array} pedestalData - Array of pedestal information with stack data
         */
        updateIndicators(pedestalData) {
            // Remove existing indicators
            this.removeAllIndicators();
            
            // Add new indicators
            pedestalData.forEach(data => {
                if (data.pedestal && data.stackObjects) {
                    this.addIndicatorsToPedestal(
                        data.pedestal, 
                        data.stackObjects, 
                        data.totalCount || data.stackObjects.length, 
                        data.stackingConfig
                    );
                }
            });
        }

        /**
         * Get debug information about current state
         * @returns {Object} Debug information
         */
        getDebugInfo() {
            return {
                enabled: this.enabled,
                activeIndicators: this.activeIndicators.length,
                cachedTextures: this.canvasCache.size,
                indicators: this.activeIndicators.map(indicator => ({
                    type: indicator.userData.type,
                    position: {
                        x: indicator.position.x.toFixed(2),
                        y: indicator.position.y.toFixed(2),
                        z: indicator.position.z.toFixed(2)
                    },
                    data: indicator.userData.count || indicator.userData.labelText
                }))
            };
        }

        /**
         * Clean up all resources
         */
        dispose() {
            console.log('🎨 Disposing VisualStackIndicators');
            
            // Remove all indicators
            this.removeAllIndicators();
            
            // Clear texture cache
            this.canvasCache.forEach(texture => {
                texture.dispose();
            });
            this.canvasCache.clear();
            
            // Clear references
            this.scene = null;
            this.THREE = null;
        }
    }

    // Export to global scope for easy access
    window.VisualStackIndicators = VisualStackIndicators;
    
    console.log('📦 VisualStackIndicators module loaded');
})();
