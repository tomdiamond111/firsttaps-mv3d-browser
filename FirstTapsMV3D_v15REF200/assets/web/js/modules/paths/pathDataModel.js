/**
 * PATH DATA MODEL
 * Defines the data structure and storage for path-based playlists
 * 
 * Constraints:
 * - Max 30 objects per path
 * - Up to 3 concurrent paths per world
 * - Paths persist across sessions/world switches
 * - Paths are furniture objects with Move/Delete menu
 */

(function() {
    'use strict';

    console.log('🛤️ Loading Path Data Model...');

    // ============================================================================
    // PATH TYPE CONSTANTS
    // ============================================================================
    
    const PATH_TYPES = {
        SPIRAL_STAIRCASE: 'spiral_staircase',    // 3D spiral stairs going up
        STEPPING_STONES: 'stepping_stones',       // Ground markers in stepping stone pattern
        GALLERY_WALK: 'gallery_walk',             // Rectangular gallery-style path
        MOUNTAIN_TRAIL: 'mountain_trail'          // Winding trail with elevation changes
    };

    const MAX_OBJECTS_PER_PATH = 30;
    const MAX_PATHS_PER_WORLD = 3;

    // ============================================================================
    // PATH CLASS
    // ============================================================================
    
    class Path {
        /**
         * Create a new path
         * @param {Object} config - Path configuration
         * @param {string} config.id - Unique path identifier (auto-generated if not provided)
         * @param {string} config.type - Path type (from PATH_TYPES)
         * @param {string} config.worldType - World type this path belongs to
         * @param {Object} config.position - Center position {x, y, z}
         * @param {number} config.stepCount - Number of steps (5-30)
         * @param {Object} config.geometryParams - Type-specific geometry parameters
         */
        constructor(config = {}) {
            this.id = config.id || `path_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            this.type = config.type || PATH_TYPES.STEPPING_STONES;
            this.name = config.name || `Path: ${this.type.replace(/_/g, ' ')}`; // Human-readable name
            this.worldType = config.worldType || 'green-plane';
            this.createdAt = config.createdAt || Date.now();
            this.lastModified = config.lastModified || Date.now();
            
            // Position data
            this.position = config.position || { x: 0, y: 0, z: 0 };
            
            // Path configuration
            this.stepCount = Math.min(Math.max(config.stepCount || 10, 5), MAX_OBJECTS_PER_PATH);
            this.geometryParams = config.geometryParams || this.getDefaultGeometryParams();
            
            // Auto-sort configuration (NEW)
            this.autoSort = config.autoSort !== undefined ? config.autoSort : true; // Default ON
            this.sortCriteria = config.sortCriteria || 'fileName'; // What to sort by: fileName, fileType, artist, title, date
            this.sortDirection = config.sortDirection || 'ascending'; // ascending or descending
            
            // Manual positions (when autoSort is OFF) - stores { objectId: stepIndex }
            this.manualPositions = config.manualPositions || {};
            
            // Object placement data
            this.positions = config.positions || []; // Array of {x, y, z} for each step
            this.objectIds = config.objectIds || []; // Array of file IDs placed on path
            this.currentIndex = config.currentIndex || 0; // Current playback position
            
            // Visual state
            this.isPlaying = config.isPlaying || false;
            this.isVisible = config.isVisible !== false; // Default visible
            
            // Generate positions if not provided
            if (this.positions.length === 0) {
                this.generatePositions();
            }
        }

        /**
         * Get default geometry parameters for current path type
         */
        getDefaultGeometryParams() {
            switch (this.type) {
                case PATH_TYPES.SPIRAL_STAIRCASE:
                    return {
                        radius: 15,        // Radius of spiral
                        height: 20,        // Total height
                        turns: 2,          // Number of complete rotations
                        stepHeight: 0.8    // Height per step
                    };
                
                case PATH_TYPES.STEPPING_STONES:
                    return {
                        spacing: 3,        // Distance between stones
                        pattern: 'curved', // 'curved', 'zigzag', 'straight'
                        curvature: 0.3     // How much path curves (0-1)
                    };
                
                case PATH_TYPES.GALLERY_WALK:
                    return {
                        width: 30,         // Gallery width
                        length: 40,        // Gallery length
                        wallHeight: 5,     // Height of gallery walls
                        layout: 'U'        // 'U', 'rectangle', 'L'
                    };
                
                case PATH_TYPES.MOUNTAIN_TRAIL:
                    return {
                        totalDistance: 50,  // Total path distance
                        elevationGain: 10,  // Total elevation gain
                        windiness: 0.5,     // How winding (0-1)
                        steepness: 0.3      // Average steepness (0-1)
                    };
                
                default:
                    return {};
            }
        }

        /**
         * Generate positions for path steps based on geometry
         */
        generatePositions() {
            this.positions = [];
            const centerX = this.position.x;
            const centerZ = this.position.z;
            const baseY = this.position.y;

            switch (this.type) {
                case PATH_TYPES.SPIRAL_STAIRCASE:
                    this.generateSpiralPositions(centerX, baseY, centerZ);
                    break;
                
                case PATH_TYPES.STEPPING_STONES:
                    this.generateSteppingStonePositions(centerX, baseY, centerZ);
                    break;
                
                case PATH_TYPES.GALLERY_WALK:
                    this.generateGalleryPositions(centerX, baseY, centerZ);
                    break;
                
                case PATH_TYPES.MOUNTAIN_TRAIL:
                    this.generateMountainTrailPositions(centerX, baseY, centerZ);
                    break;
            }

            console.log(`🛤️ Generated ${this.positions.length} positions for ${this.type} path`);
        }

        /**
         * Generate spiral staircase positions
         */
        generateSpiralPositions(centerX, baseY, centerZ) {
            const { radius, height, turns } = this.geometryParams;
            const angleStep = (Math.PI * 2 * turns) / this.stepCount;
            const heightStep = height / this.stepCount;

            for (let i = 0; i < this.stepCount; i++) {
                const angle = angleStep * i;
                const x = centerX + radius * Math.cos(angle);
                const y = baseY + heightStep * i;
                const z = centerZ + radius * Math.sin(angle);
                
                this.positions.push({ x, y, z });
            }
        }

        /**
         * Generate stepping stone positions
         */
        generateSteppingStonePositions(centerX, baseY, centerZ) {
            const { spacing, pattern, curvature } = this.geometryParams;
            
            for (let i = 0; i < this.stepCount; i++) {
                const t = i / (this.stepCount - 1); // 0 to 1
                let x, z;

                if (pattern === 'straight') {
                    x = centerX;
                    z = centerZ + (t - 0.5) * spacing * this.stepCount;
                } else if (pattern === 'zigzag') {
                    x = centerX + (i % 2 === 0 ? -spacing : spacing);
                    z = centerZ + (t - 0.5) * spacing * this.stepCount;
                } else { // curved
                    const angle = (t - 0.5) * Math.PI * curvature;
                    const distance = spacing * this.stepCount;
                    x = centerX + distance * 0.3 * Math.sin(angle);
                    z = centerZ + distance * (t - 0.5);
                }

                this.positions.push({ x, y: baseY, z });
            }
        }

        /**
         * Generate gallery walk positions
         */
        generateGalleryPositions(centerX, baseY, centerZ) {
            const { width, length, layout } = this.geometryParams;
            const perimeter = layout === 'U' ? 
                (width + length * 2) : 
                (width * 2 + length * 2);
            
            const stepDistance = perimeter / this.stepCount;

            for (let i = 0; i < this.stepCount; i++) {
                const distance = stepDistance * i;
                let x, z;

                if (layout === 'U') {
                    // Bottom wall
                    if (distance < width) {
                        x = centerX - width/2 + distance;
                        z = centerZ + length/2;
                    }
                    // Right wall
                    else if (distance < width + length) {
                        x = centerX + width/2;
                        z = centerZ + length/2 - (distance - width);
                    }
                    // Top wall
                    else {
                        x = centerX + width/2 - (distance - width - length);
                        z = centerZ - length/2;
                    }
                } else { // Rectangle
                    const side = Math.floor(distance / (perimeter / 4));
                    const sideProgress = (distance % (perimeter / 4)) / (perimeter / 4);

                    switch (side) {
                        case 0: // Bottom
                            x = centerX - width/2 + sideProgress * width;
                            z = centerZ + length/2;
                            break;
                        case 1: // Right
                            x = centerX + width/2;
                            z = centerZ + length/2 - sideProgress * length;
                            break;
                        case 2: // Top
                            x = centerX + width/2 - sideProgress * width;
                            z = centerZ - length/2;
                            break;
                        default: // Left
                            x = centerX - width/2;
                            z = centerZ - length/2 + sideProgress * length;
                    }
                }

                this.positions.push({ x, y: baseY, z });
            }
        }

        /**
         * Generate mountain trail positions
         */
        generateMountainTrailPositions(centerX, baseY, centerZ) {
            const { totalDistance, elevationGain, windiness, steepness } = this.geometryParams;
            const stepDistance = totalDistance / this.stepCount;

            let currentX = centerX - totalDistance / 2;
            let currentZ = centerZ;
            let currentY = baseY;

            for (let i = 0; i < this.stepCount; i++) {
                const t = i / (this.stepCount - 1);
                
                // Forward progress
                currentX += stepDistance;
                
                // Winding side-to-side
                const windPhase = t * Math.PI * 4 * windiness;
                currentZ = centerZ + Math.sin(windPhase) * totalDistance * 0.2;
                
                // Elevation change (gradual climb)
                currentY = baseY + elevationGain * Math.pow(t, 1 + steepness);

                this.positions.push({ 
                    x: currentX, 
                    y: currentY, 
                    z: currentZ 
                });
            }
        }

        /**
         * Add object to path
         */
        addObject(objectId, index = null) {
            if (this.objectIds.length >= MAX_OBJECTS_PER_PATH) {
                console.warn('🛤️ Path is full, cannot add more objects');
                return false;
            }

            if (index !== null && index >= 0 && index < this.positions.length) {
                // Insert at specific index
                this.objectIds[index] = objectId;
            } else {
                // Add to next available position
                this.objectIds.push(objectId);
            }

            this.lastModified = Date.now();
            return true;
        }

        /**
         * Remove object from path
         */
        removeObject(objectId) {
            const index = this.objectIds.indexOf(objectId);
            if (index !== -1) {
                this.objectIds.splice(index, 1);
                this.lastModified = Date.now();
                return true;
            }
            return false;
        }

        /**
         * Clear all objects from path
         */
        clearObjects() {
            this.objectIds = [];
            this.currentIndex = 0;
            this.isPlaying = false;
            this.lastModified = Date.now();
        }

        /**
         * Get next object in playback sequence
         */
        getNextObject() {
            if (this.currentIndex < this.objectIds.length - 1) {
                this.currentIndex++;
                return this.objectIds[this.currentIndex];
            }
            return null;
        }

        /**
         * Get previous object in playback sequence
         */
        getPreviousObject() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                return this.objectIds[this.currentIndex];
            }
            return null;
        }

        /**
         * Reset playback to start
         */
        resetPlayback() {
            this.currentIndex = 0;
            this.isPlaying = false;
        }

        /**
         * Serialize path to JSON
         */
        toJSON() {
            return {
                id: this.id,
                type: this.type,
                name: this.name, // Include name for persistence
                worldType: this.worldType,
                createdAt: this.createdAt,
                lastModified: this.lastModified,
                position: this.position,
                stepCount: this.stepCount,
                geometryParams: this.geometryParams,
                positions: this.positions,
                objectIds: this.objectIds,
                currentIndex: this.currentIndex,
                isPlaying: this.isPlaying,
                isVisible: this.isVisible,
                // Auto-sort configuration
                autoSort: this.autoSort,
                sortCriteria: this.sortCriteria,
                sortDirection: this.sortDirection,
                manualPositions: this.manualPositions
            };
        }

        /**
         * Create path from JSON
         */
        static fromJSON(data) {
            return new Path(data);
        }
    }

    // ============================================================================
    // PATH STORAGE MANAGER
    // ============================================================================
    
    class PathStorageManager {
        constructor() {
            this.storageKey = 'mv3d_paths';
            this.paths = new Map(); // pathId -> Path
            this.worldPaths = new Map(); // worldType -> Set<pathId>
        }

        /**
         * Initialize storage - load all paths
         */
        async initialize() {
            console.log('🛤️ Initializing Path Storage Manager...');
            await this.loadAllPaths();
            console.log(`🛤️ Loaded ${this.paths.size} paths from storage`);
        }

        /**
         * Load all paths from storage
         */
        async loadAllPaths() {
            try {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    const data = JSON.parse(stored);
                    
                    // Load paths
                    if (data.paths && Array.isArray(data.paths)) {
                        data.paths.forEach(pathData => {
                            const path = Path.fromJSON(pathData);
                            this.paths.set(path.id, path);
                            
                            // Index by world type
                            if (!this.worldPaths.has(path.worldType)) {
                                this.worldPaths.set(path.worldType, new Set());
                            }
                            this.worldPaths.get(path.worldType).add(path.id);
                        });
                    }
                }
            } catch (error) {
                console.error('🛤️ Error loading paths:', error);
            }
        }

        /**
         * Save all paths to storage
         */
        async saveAllPaths() {
            try {
                const data = {
                    paths: Array.from(this.paths.values()).map(path => path.toJSON()),
                    version: 1,
                    lastSaved: Date.now()
                };
                
                localStorage.setItem(this.storageKey, JSON.stringify(data));
                console.log(`🛤️ Saved ${this.paths.size} paths to storage`);
                return true;
            } catch (error) {
                console.error('🛤️ Error saving paths:', error);
                return false;
            }
        }

        /**
         * Add a new path
         */
        async addPath(path) {
            // Check world path limit
            const worldType = path.worldType;
            const worldPathSet = this.worldPaths.get(worldType) || new Set();
            
            if (worldPathSet.size >= MAX_PATHS_PER_WORLD) {
                console.warn(`🛤️ Cannot add path: ${worldType} already has ${MAX_PATHS_PER_WORLD} paths`);
                return false;
            }

            this.paths.set(path.id, path);
            
            if (!this.worldPaths.has(worldType)) {
                this.worldPaths.set(worldType, new Set());
            }
            this.worldPaths.get(worldType).add(path.id);

            await this.saveAllPaths();
            console.log(`🛤️ Added path ${path.id} to ${worldType}`);
            return true;
        }

        /**
         * Remove a path
         */
        async removePath(pathId) {
            const path = this.paths.get(pathId);
            if (!path) return false;

            this.paths.delete(pathId);
            
            const worldPathSet = this.worldPaths.get(path.worldType);
            if (worldPathSet) {
                worldPathSet.delete(pathId);
            }

            await this.saveAllPaths();
            console.log(`🛤️ Removed path ${pathId}`);
            return true;
        }

        /**
         * Get path by ID
         */
        getPath(pathId) {
            return this.paths.get(pathId);
        }

        /**
         * Get all paths for a world
         */
        getPathsForWorld(worldType) {
            const pathIds = this.worldPaths.get(worldType);
            if (!pathIds) return [];

            return Array.from(pathIds)
                .map(id => this.paths.get(id))
                .filter(path => path !== undefined);
        }

        /**
         * Update path (and save)
         */
        async updatePath(path) {
            if (!this.paths.has(path.id)) {
                console.warn(`🛤️ Path ${path.id} not found`);
                return false;
            }

            path.lastModified = Date.now();
            this.paths.set(path.id, path);
            await this.saveAllPaths();
            return true;
        }

        /**
         * Get path count for world
         */
        getPathCountForWorld(worldType) {
            const pathIds = this.worldPaths.get(worldType);
            return pathIds ? pathIds.size : 0;
        }

        /**
         * Can add path to world?
         */
        canAddPathToWorld(worldType) {
            return this.getPathCountForWorld(worldType) < MAX_PATHS_PER_WORLD;
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    
    window.Path = Path;
    window.PathStorageManager = PathStorageManager;
    window.PATH_TYPES = PATH_TYPES;
    window.MAX_OBJECTS_PER_PATH = MAX_OBJECTS_PER_PATH;
    window.MAX_PATHS_PER_WORLD = MAX_PATHS_PER_WORLD;

    console.log('🛤️ Path Data Model loaded successfully');

})();
