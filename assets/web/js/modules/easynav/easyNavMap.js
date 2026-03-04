// ============================================================================
// EASYNAV 2D MAP RENDERER
// ============================================================================
// Canvas-based 2D overhead map showing zones, objects, and navigation grid

(function() {
    'use strict';

    class EasyNavMap {
        constructor(app) {
            console.log('🗺️ EasyNavMap: Initializing...');
            this.app = app;
            this.isVisible = false;
            
            // Canvas elements
            this.container = null;
            this.canvas = null;
            this.ctx = null;
            
            // Map configuration
            this.mapSize = 0; // Will be calculated based on screen size
            this.worldScale = 1; // Scale factor: map pixels to world units
            this.gridCellSize = 30; // World units per grid cell (larger for touch)
            
            // Map viewport (for panning with arrows)
            this.viewOffsetX = 0;
            this.viewOffsetZ = 0;
            
            // Opacity states
            this.activeOpacity = 0.9;
            this.idleOpacity = 0.4;
            this.interactionOpacity = 0.25;
            this.currentOpacity = this.activeOpacity;
            
            // Camera position tracking
            this.cameraX = 0;
            this.cameraZ = 0;
            
            // Zone definitions (matches your world zones)
            this.zoneNames = ['Home', 'Files', 'Music', 'Videos', 'Images', 'Links', 'Apps'];
            
            // File type colors (matching your existing system)
            this.fileTypeColors = {
                // Audio
                'mp3': '#4CAF50',
                'wav': '#4CAF50',
                'flac': '#4CAF50',
                'aac': '#4CAF50',
                'ogg': '#4CAF50',
                'm4a': '#4CAF50',
                // Documents
                'doc': '#2196F3',
                'docx': '#2196F3',
                'txt': '#2196F3',
                // PDFs
                'pdf': '#F44336',
                // Links
                'link': '#03A9F4',
                'url': '#03A9F4',
                // Videos
                'mp4': '#9C27B0',
                'mov': '#9C27B0',
                'avi': '#9C27B0',
                'webm': '#9C27B0',
                // Images
                'jpg': '#FF9800',
                'jpeg': '#FF9800',
                'png': '#FF9800',
                'gif': '#FF9800',
                // Apps (will use brand colors where available)
                'app': '#00BCD4',
                // Furniture
                'furniture': '#FFEB3B',
                // Default
                'default': '#9E9E9E'
            };
            
            // Interaction state
            this.lastInteractionTime = Date.now();
            this.idleTimeout = 2000; // ms before fading to idle opacity
            
            console.log('🗺️ EasyNavMap: Initialized successfully');
        }

        /**
         * Initialize map - create canvas and set up UI
         */
        initialize() {
            console.log('🗺️ Creating map canvas...');
            
            // Calculate map size (reduced by 30% from original 1/3)
            const smallerDimension = Math.min(window.innerWidth, window.innerHeight);
            this.mapSize = Math.floor(smallerDimension / 4.3);
            
            // Create container
            this.container = document.createElement('div');
            this.container.id = 'easyNavMapContainer';
            this.container.style.cssText = `
                position: fixed;
                top: 120px;
                left: 50px;
                width: ${this.mapSize}px;
                height: ${this.mapSize}px;
                z-index: 1000;
                display: none;
                border: 2px solid rgba(255, 255, 255, 0.5);
                border-radius: 8px;
                overflow: visible;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                opacity: 1;
            `;
            
            // Create canvas
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.mapSize;
            this.canvas.height = this.mapSize;
            this.canvas.style.cssText = `
                width: 100%;
                height: 100%;
                cursor: pointer;
            `;
            
            this.ctx = this.canvas.getContext('2d');
            this.container.appendChild(this.canvas);
            
            // Add click handler
            this.canvas.addEventListener('click', this.handleMapClick.bind(this));
            
            // Add navigation arrows
            this.createNavigationArrows();
            
            // Add to page
            document.body.appendChild(this.container);
            
            // Calculate world scale
            this.calculateWorldScale();
            
            console.log('🗺️ Map canvas created successfully');
        }

        /**
         * Calculate scale factor to fit entire world in map
         */
        calculateWorldScale() {
            // Assume world extends approximately ±100 units from origin
            // This should show all file zones
            const worldSize = 200; // Total world size to display
            this.worldScale = this.mapSize / worldSize;
            
            console.log(`🗺️ World scale: ${this.worldScale} (${worldSize} world units -> ${this.mapSize} pixels)`);
        }

        /**
         * Create navigation arrow buttons (positioned outside the map)
         */
        createNavigationArrows() {
            const arrowSize = 30;
            const arrowStyle = `
                position: absolute;
                width: ${arrowSize}px;
                height: ${arrowSize}px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.5);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 18px;
                user-select: none;
                z-index: 1001;
            `;
            
            // Top arrow - positioned above map
            const topArrow = document.createElement('div');
            topArrow.innerHTML = '▲';
            topArrow.style.cssText = arrowStyle + `top: -35px; left: 50%; transform: translateX(-50%);`;
            topArrow.addEventListener('click', (e) => { e.stopPropagation(); this.panMap(0, -1); });
            
            // Bottom arrow - positioned below map
            const bottomArrow = document.createElement('div');
            bottomArrow.innerHTML = '▼';
            bottomArrow.style.cssText = arrowStyle + `bottom: -35px; left: 50%; transform: translateX(-50%);`;
            bottomArrow.addEventListener('click', (e) => { e.stopPropagation(); this.panMap(0, 1); });
            
            // Left arrow - positioned left of map
            const leftArrow = document.createElement('div');
            leftArrow.innerHTML = '◀';
            leftArrow.style.cssText = arrowStyle + `top: 50%; left: -35px; transform: translateY(-50%);`;
            leftArrow.addEventListener('click', (e) => { e.stopPropagation(); this.panMap(-1, 0); });
            
            // Right arrow - positioned right of map
            const rightArrow = document.createElement('div');
            rightArrow.innerHTML = '▶';
            rightArrow.style.cssText = arrowStyle + `top: 50%; right: -35px; transform: translateY(-50%);`;
            rightArrow.addEventListener('click', (e) => { e.stopPropagation(); this.panMap(1, 0); });
            
            this.container.appendChild(topArrow);
            this.container.appendChild(bottomArrow);
            this.container.appendChild(leftArrow);
            this.container.appendChild(rightArrow);
        }

        /**
         * Pan map view (not camera) with boundaries
         */
        panMap(deltaX, deltaZ) {
            const panAmount = 20; // World units to pan
            const maxOffset = 80; // Maximum pan offset to keep within XZ plane boundaries
            
            // Apply pan with boundary limits
            this.viewOffsetX = Math.max(-maxOffset, Math.min(maxOffset, this.viewOffsetX + deltaX * panAmount));
            this.viewOffsetZ = Math.max(-maxOffset, Math.min(maxOffset, this.viewOffsetZ + deltaZ * panAmount));
            
            this.render();
        }

        /**
         * Show map
         */
        show() {
            if (!this.container) {
                this.initialize();
            }
            
            this.container.style.display = 'block';
            this.isVisible = true;
            this.container.style.opacity = '1';
            this.render();
            
            console.log('🗺️ Map shown');
        }

        /**
         * Hide map
         */
        hide() {
            if (this.container) {
                this.container.style.display = 'none';
            }
            this.isVisible = false;
            
            console.log('🗺️ Map hidden');
        }

        /**
         * Set map opacity
         */
        setOpacity(opacity) {
            if (this.container) {
                this.container.style.opacity = opacity;
                this.currentOpacity = opacity;
            }
        }

        /**
         * Start opacity management (fade to idle when not interacting)
         */
        startOpacityManagement() {
            this.opacityInterval = setInterval(() => {
                const timeSinceInteraction = Date.now() - this.lastInteractionTime;
                
                if (timeSinceInteraction > this.idleTimeout) {
                    // Fade to idle opacity
                    if (this.currentOpacity !== this.idleOpacity) {
                        this.setOpacity(this.idleOpacity);
                    }
                }
            }, 500);
        }

        /**
         * Stop opacity management
         */
        stopOpacityManagement() {
            if (this.opacityInterval) {
                clearInterval(this.opacityInterval);
                this.opacityInterval = null;
            }
        }

        /**
         * Mark interaction (resets idle timer and increases opacity)
         */
        markInteraction() {
            this.lastInteractionTime = Date.now();
            if (this.currentOpacity !== this.activeOpacity) {
                this.setOpacity(this.activeOpacity);
            }
        }

        /**
         * Render the map
         */
        render() {
            if (!this.ctx) return;
            
            // Clear canvas
            this.ctx.clearRect(0, 0, this.mapSize, this.mapSize);
            
            // Draw background (world-themed)
            this.drawBackground();
            
            // Draw zones
            this.drawZones();
            
            // Draw grid overlay
            this.drawGrid();
            
            // Draw objects as colored dots
            this.drawObjects();
            
            // Draw camera position indicator
            this.drawCameraIndicator();
        }

        /**
         * Draw background
         */
        drawBackground() {
            // Create gradient background (world-themed)
            const gradient = this.ctx.createRadialGradient(
                this.mapSize / 2, this.mapSize / 2, 0,
                this.mapSize / 2, this.mapSize / 2, this.mapSize / 2
            );
            gradient.addColorStop(0, '#2a2a2a');
            gradient.addColorStop(1, '#1a1a1a');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.mapSize, this.mapSize);
        }

        /**
         * Draw zone boundaries and labels (prominent and easy to see)
         */
        drawZones() {
            if (!this.app.focusZones || this.app.focusZones.length === 0) {
                // Log only once to avoid console spam
                if (!this._loggedNoZones) {
                    console.log('🗺️ drawZones: No focusZones available');
                    this._loggedNoZones = true;
                }
                return;
            }

            for (const zoneData of this.app.focusZones) {
                if (!zoneData.zone) continue;

                const zone = zoneData.zone;
                const name = zoneData.name || 'Zone';
                
                // Get zone center in world coordinates
                const center = zone.center ? zone.center : new THREE.Vector3();
                
                // Convert to map coordinates
                const mapCoords = this.worldToMap(center.x, center.z);
                
                if (mapCoords) {
                    // Draw zone circle with prominent border
                    const radius = 20; // Larger radius for visibility
                    
                    // Draw filled circle background
                    this.ctx.fillStyle = 'rgba(100, 150, 255, 0.15)';
                    this.ctx.beginPath();
                    this.ctx.arc(mapCoords.x, mapCoords.y, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Draw bright border
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(mapCoords.x, mapCoords.y, radius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    // Draw zone label with background for readability
                    this.ctx.font = 'bold 11px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'top';
                    
                    const labelY = mapCoords.y + radius + 4;
                    const textWidth = this.ctx.measureText(name).width;
                    
                    // Draw text background
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    this.ctx.fillRect(mapCoords.x - textWidth/2 - 3, labelY - 1, textWidth + 6, 14);
                    
                    // Draw text
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                    this.ctx.fillText(name, mapCoords.x, labelY);
                }
            }
        }

        /**
         * Draw grid overlay
         */
        drawGrid() {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.lineWidth = 0.5;

            const cellSizePixels = this.gridCellSize * this.worldScale;
            const centerOffset = this.mapSize / 2;

            // Draw vertical lines
            for (let x = 0; x < this.mapSize; x += cellSizePixels) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.mapSize);
                this.ctx.stroke();
            }

            // Draw horizontal lines
            for (let y = 0; y < this.mapSize; y += cellSizePixels) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.mapSize, y);
                this.ctx.stroke();
            }
        }

        /**
         * Draw objects (files as colored dots, furniture as white shapes)
         */
        drawObjects() {
            // Get all file objects from the app
            const objects = this.getAllFileObjects();
            
            if (!objects || objects.length === 0) {
                return;
            }

            let furnitureCount = 0;
            let fileCount = 0;

            // Draw each object
            for (const obj of objects) {
                if (!obj.position) continue;
                
                const mapCoords = this.worldToMap(obj.position.x, obj.position.z);
                if (!mapCoords) continue;
                
                // Check if it's furniture
                const isFurniture = obj.userData && (obj.userData.type === 'furniture' || obj.userData.furnitureId);
                
                if (isFurniture) {
                    // Draw furniture as white shapes based on their actual dimensions
                    furnitureCount++;
                    this.drawFurnitureShape(obj, mapCoords);
                } else {
                    // Draw file objects as colored dots
                    fileCount++;
                    const color = this.getObjectColor(obj);
                    
                    // Log first 5 file objects for debugging
                    // if (fileCount <= 5) {
                    //     const name = (obj.userData?.fileData?.name || obj.userData?.fileName || 'unknown');
                    //     const mimeType = obj.userData?.fileData?.mimeType || 'none';
                    //     console.log(`🎨 File ${fileCount} [${name}]: color=${color}, mimeType=${mimeType}`);
                    // }
                    
                    // Draw dot
                    this.ctx.fillStyle = color;
                    this.ctx.beginPath();
                    this.ctx.arc(mapCoords.x, mapCoords.y, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
            
            // console.log(`🗺️ Rendered ${fileCount} files and ${furnitureCount} furniture`);
        }

        /**
         * Draw furniture as white shapes based on their type and dimensions
         */
        drawFurnitureShape(obj, mapCoords) {
            // Get furniture dimensions from bounding box
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            
            // Convert world size to map size
            const mapWidth = size.x * this.worldScale;
            const mapDepth = size.z * this.worldScale;
            
            // Set white color for all furniture
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            this.ctx.lineWidth = 1;
            
            // Get furniture type from userData
            const furnitureType = obj.userData?.furnitureType || obj.userData?.type || 'default';
            
            // Draw shape based on furniture type
            const halfWidth = mapWidth / 2;
            const halfDepth = mapDepth / 2;
            const centerX = mapCoords.x;
            const centerY = mapCoords.y;
            
            this.ctx.save();
            
            switch(furnitureType) {
                case 'stage_small':
                case 'stage_large':
                    // Draw trapezoid (wider at front/bottom)
                    this.ctx.beginPath();
                    const trapezoidFrontWidth = mapWidth * 1.2;
                    const trapezoidBackWidth = mapWidth * 0.6;
                    this.ctx.moveTo(centerX - trapezoidBackWidth/2, centerY - halfDepth);  // Top left
                    this.ctx.lineTo(centerX + trapezoidBackWidth/2, centerY - halfDepth);  // Top right
                    this.ctx.lineTo(centerX + trapezoidFrontWidth/2, centerY + halfDepth); // Bottom right
                    this.ctx.lineTo(centerX - trapezoidFrontWidth/2, centerY + halfDepth); // Bottom left
                    this.ctx.closePath();
                    this.ctx.fill();
                    this.ctx.stroke();
                    break;
                    
                case 'riser':
                    // Draw 3 stepped tiers
                    const tierHeight = mapDepth / 3;
                    const tierWidthStep = mapWidth / 6;
                    
                    // Bottom tier (widest)
                    this.ctx.fillRect(
                        centerX - halfWidth,
                        centerY + halfDepth - tierHeight,
                        mapWidth,
                        tierHeight
                    );
                    this.ctx.strokeRect(
                        centerX - halfWidth,
                        centerY + halfDepth - tierHeight,
                        mapWidth,
                        tierHeight
                    );
                    
                    // Middle tier
                    this.ctx.fillRect(
                        centerX - halfWidth + tierWidthStep,
                        centerY + halfDepth - tierHeight * 2,
                        mapWidth - tierWidthStep * 2,
                        tierHeight
                    );
                    this.ctx.strokeRect(
                        centerX - halfWidth + tierWidthStep,
                        centerY + halfDepth - tierHeight * 2,
                        mapWidth - tierWidthStep * 2,
                        tierHeight
                    );
                    
                    // Top tier (narrowest)
                    this.ctx.fillRect(
                        centerX - halfWidth + tierWidthStep * 2,
                        centerY - halfDepth,
                        mapWidth - tierWidthStep * 4,
                        tierHeight
                    );
                    this.ctx.strokeRect(
                        centerX - halfWidth + tierWidthStep * 2,
                        centerY - halfDepth,
                        mapWidth - tierWidthStep * 4,
                        tierHeight
                    );
                    break;
                    
                case 'bookshelf':
                    // Draw rectangle with vertical dividers
                    this.ctx.fillRect(
                        centerX - halfWidth,
                        centerY - halfDepth,
                        mapWidth,
                        mapDepth
                    );
                    this.ctx.strokeRect(
                        centerX - halfWidth,
                        centerY - halfDepth,
                        mapWidth,
                        mapDepth
                    );
                    
                    // Add 3 vertical dividers for shelf sections
                    const shelfDividerSpacing = mapWidth / 4;
                    for(let i = 1; i <= 3; i++) {
                        const dividerX = centerX - halfWidth + (shelfDividerSpacing * i);
                        this.ctx.beginPath();
                        this.ctx.moveTo(dividerX, centerY - halfDepth);
                        this.ctx.lineTo(dividerX, centerY + halfDepth);
                        this.ctx.stroke();
                    }
                    break;
                    
                case 'gallery_wall':
                case 'default':
                default:
                    // Draw default rectangle
                    this.ctx.fillRect(
                        centerX - halfWidth,
                        centerY - halfDepth,
                        mapWidth,
                        mapDepth
                    );
                    this.ctx.strokeRect(
                        centerX - halfWidth,
                        centerY - halfDepth,
                        mapWidth,
                        mapDepth
                    );
                    break;
            }
            
            this.ctx.restore();
        }

        /**
         * Get all file objects from scene (includes furniture)
         */
        getAllFileObjects() {
            const objects = [];
            
            if (this.app.scene) {
                this.app.scene.traverse((child) => {
                    // Skip world template objects and slot markers
                    if (child.userData && (child.userData.templateObject || child.userData.isSlotMarker)) {
                        return;
                    }
                    
                    // Identify file objects
                    if (child.userData && (child.userData.type === 'file' || child.userData.fileData)) {
                        objects.push(child);
                    }
                    // FURNITURE: Only include the furniture GROUP, not individual structure meshes
                    // Check that it's a furniture object but NOT a structure mesh part
                    else if (child.userData && (child.userData.type === 'furniture' || child.userData.furnitureId)) {
                        // Skip furniture structure meshes (these are children of the furniture group)
                        if (child.userData.isFurnitureStructure) {
                            return;
                        }
                        
                        // Only add THREE.Group objects (the furniture container)
                        // This filters out individual meshes that are part of furniture
                        if (child.type === 'Group' || child.isGroup) {
                            objects.push(child);
                        }
                    }
                });
            }
            
            return objects;
        }

        /**
         * Get color for object based on file type
         */
        getObjectColor(obj) {
            // Check if it's furniture (shouldn't reach here but handle anyway)
            if (obj.userData && (obj.userData.type === 'furniture' || obj.userData.furnitureId)) {
                return '#FFFFFF'; // White for furniture
            }
            
            // Check for link/app by examining mimeType or URL
            if (obj.userData && obj.userData.fileData) {
                const fileData = obj.userData.fileData;
                const mimeType = fileData.mimeType || fileData.type || '';
                
                // Link objects have 'link:' prefix in mimeType
                if (mimeType.startsWith('link:') || fileData.url || fileData.link) {
                    return this.fileTypeColors['link'];
                }
                
                // Try to get extension from name
                if (fileData.name) {
                    const parts = fileData.name.split('.');
                    if (parts.length > 1) {
                        const extension = parts[parts.length - 1].toLowerCase();
                        const color = this.fileTypeColors[extension];
                        if (color) return color;
                    }
                }
            }
            
            // Check userData.fileName
            if (obj.userData && obj.userData.fileName) {
                const parts = obj.userData.fileName.split('.');
                if (parts.length > 1) {
                    const extension = parts[parts.length - 1].toLowerCase();
                    const color = this.fileTypeColors[extension];
                    if (color) return color;
                }
            }
            
            // Default gray for unknown types
            return this.fileTypeColors['default'];
        }

        /**
         * Draw camera position indicator (blue crosshair)
         */
        drawCameraIndicator() {
            const mapCoords = this.worldToMap(this.cameraX, this.cameraZ);
            if (!mapCoords) return;
            
            this.ctx.strokeStyle = '#2196F3'; // Blue
            this.ctx.lineWidth = 2;
            const size = 8;
            
            // Draw crosshair
            this.ctx.beginPath();
            this.ctx.moveTo(mapCoords.x - size, mapCoords.y);
            this.ctx.lineTo(mapCoords.x + size, mapCoords.y);
            this.ctx.moveTo(mapCoords.x, mapCoords.y - size);
            this.ctx.lineTo(mapCoords.x, mapCoords.y + size);
            this.ctx.stroke();
            
            // Draw circle
            this.ctx.beginPath();
            this.ctx.arc(mapCoords.x, mapCoords.y, size, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        /**
         * Convert world coordinates to map coordinates
         */
        worldToMap(worldX, worldZ) {
            // Apply view offset
            const adjustedX = worldX - this.viewOffsetX;
            const adjustedZ = worldZ - this.viewOffsetZ;
            
            // Convert to map coordinates (centered at origin)
            const mapX = (adjustedX * this.worldScale) + (this.mapSize / 2);
            const mapY = (adjustedZ * this.worldScale) + (this.mapSize / 2);
            
            // Check if in bounds
            if (mapX < 0 || mapX > this.mapSize || mapY < 0 || mapY > this.mapSize) {
                return null;
            }
            
            return { x: mapX, y: mapY };
        }

        /**
         * Convert map coordinates to world coordinates
         */
        mapToWorld(mapX, mapY) {
            // Convert from map to world
            const worldX = ((mapX - (this.mapSize / 2)) / this.worldScale) + this.viewOffsetX;
            const worldZ = ((mapY - (this.mapSize / 2)) / this.worldScale) + this.viewOffsetZ;
            
            return { x: worldX, z: worldZ };
        }

        /**
         * Handle map click - navigate to clicked grid cell
         */
        handleMapClick(event) {
            const rect = this.canvas.getBoundingClientRect();
            const mapX = event.clientX - rect.left;
            const mapY = event.clientY - rect.top;
            
            // Convert to world coordinates
            const worldCoords = this.mapToWorld(mapX, mapY);
            
            // Convert to grid cell coordinates
            const gridX = Math.floor(worldCoords.x / this.gridCellSize);
            const gridZ = Math.floor(worldCoords.z / this.gridCellSize);
            
            console.log(`🗺️ Map clicked at [${mapX}, ${mapY}] -> World [${worldCoords.x}, ${worldCoords.z}] -> Grid [${gridX}, ${gridZ}]`);
            
            // Notify EasyNavMode to navigate
            if (window.easyNavManager && window.easyNavManager.easyNavMode) {
                window.easyNavManager.easyNavMode.navigateToGridCell(gridX, gridZ);
            }
        }

        /**
         * Update camera position (called by EasyNavMode)
         */
        updateCameraPosition(x, z) {
            this.cameraX = x;
            this.cameraZ = z;
            
            // Re-render to update camera indicator
            if (this.isVisible) {
                this.render();
            }
        }

        /**
         * Handle window resize
         */
        handleResize() {
            // Recalculate map size
            const smallerDimension = Math.min(window.innerWidth, window.innerHeight);
            const newSize = Math.floor(smallerDimension / 3);
            
            if (newSize !== this.mapSize) {
                this.mapSize = newSize;
                
                if (this.container) {
                    this.container.style.width = `${this.mapSize}px`;
                    this.container.style.height = `${this.mapSize}px`;
                }
                
                if (this.canvas) {
                    this.canvas.width = this.mapSize;
                    this.canvas.height = this.mapSize;
                }
                
                this.calculateWorldScale();
                this.render();
            }
        }

        /**
         * Cleanup
         */
        cleanup() {
            this.stopOpacityManagement();
            
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            
            this.container = null;
            this.canvas = null;
            this.ctx = null;
            
            console.log('🗺️ EasyNavMap cleanup complete');
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.EasyNavMap = EasyNavMap;
    
    console.log("🗺️ EasyNavMap module loaded - EasyNavMap class available globally");
})();
