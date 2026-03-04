/**
 * FURNITURE DATA MODEL
 * Defines the data structure and storage for display furniture (shelves, risers, stages, etc.)
 * 
 * Features:
 * - Auto-sorting by metadata (title, artist, genre, etc.)
 * - Style customization (woodgrain, marble, metal, glass, neon)
 * - Dynamic behaviors (glow on playback, expand on add)
 * - Y-axis rotation support
 * - Move/Delete menu integration
 * 
 * Constraints:
 * - Capacity varies by furniture type (5-100 objects)
 * - Furniture persists across world switches
 * - Objects stay seated during furniture movement
 */

(function() {
    'use strict';
    
    console.log('🟢🟢🟢 FURNITURE DATA MODEL IIFE STARTED 🟢🟢🟢');
    console.log('🪑 Loading Furniture Data Model...');

    // ============================================================================
    // FURNITURE TYPE CONSTANTS
    // ============================================================================
    
    const FURNITURE_TYPES = {
        BOOKSHELF: 'bookshelf',           // 10 objects, 2 rows x 5 columns
        RISER: 'riser',                   // 20 objects, elevated platform grid
        GALLERY_WALL: 'gallery_wall',     // 15 objects, wall-mounted display
        STAGE_SMALL: 'stage_small',       // 30 objects, small performance area
        STAGE_LARGE: 'stage_large',       // 50 objects, large performance area
        AMPHITHEATRE: 'amphitheatre'      // 100 objects, tiered seating
    };

    const SORTING_CRITERIA = {
        TITLE: 'title',
        ARTIST: 'artist',
        GENRE: 'genre',
        DATE: 'date',
        TYPE: 'type',
        CUSTOM: 'custom'
    };

    const FURNITURE_STYLES = {
        woodgrain: {
            name: 'Woodgrain',
            color: 0x8B4513,
            metalness: 0.1,
            roughness: 0.8,
            emissive: 0x000000,
            emissiveIntensity: 0
        },
        marble: {
            name: 'Marble',
            color: 0xFFFFFF,
            metalness: 0.2,
            roughness: 0.3,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.05
        },
        metal: {
            name: 'Metal',
            color: 0x000000,
            metalness: 0.9,
            roughness: 0.3,
            emissive: 0x000000,
            emissiveIntensity: 0
        },
        silver: {
            name: 'Silver',
            color: 0xC0C0C0,
            metalness: 0.95,
            roughness: 0.15,
            emissive: 0x000000,
            emissiveIntensity: 0
        },
        glass: {
            name: 'Glass',
            color: 0xCCFFFF,
            metalness: 0.1,
            roughness: 0.1,
            transparent: true,
            opacity: 0.6,
            emissive: 0x000000,
            emissiveIntensity: 0
        },
        neon: {
            name: 'Neon',
            color: 0xFF00FF,
            metalness: 0.5,
            roughness: 0.2,
            emissive: 0xFF00FF,
            emissiveIntensity: 0.5
        }
    };

    // ============================================================================
    // FURNITURE CLASS
    // ============================================================================
    
    class Furniture {
        /**
         * Create a new furniture piece
         * @param {Object} config - Furniture configuration
         * @param {string} config.id - Unique furniture identifier (auto-generated if not provided)
         * @param {string} config.type - Furniture type (from FURNITURE_TYPES)
         * @param {string} config.worldType - World type this furniture belongs to
         * @param {Object} config.position - Position {x, y, z}
         * @param {number} config.rotation - Y-axis rotation in radians
         * @param {string} config.style - Style name (from FURNITURE_STYLES)
         * @param {string} config.sortingCriteria - Metadata field to sort by
         * @param {Object} config.geometryParams - Type-specific geometry parameters
         */
        constructor(config = {}) {
            this.id = config.id || `furniture_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            this.type = config.type || FURNITURE_TYPES.BOOKSHELF;
            this.name = config.name || this.getDefaultName();
            this.worldType = config.worldType || 'green-plane';
            this.createdAt = config.createdAt || Date.now();
            this.lastModified = config.lastModified || Date.now();
            
            // Position and rotation
            this.position = config.position || { x: 0, y: 0, z: 0 };
            this.rotation = config.rotation || 0; // Y-axis rotation in radians
            
            // Style and appearance
            this.style = config.style || 'marble'; // Default to marble (white)
            
            // Sorting configuration (legacy - kept for compatibility)
            this.sortingCriteria = config.sortingCriteria || SORTING_CRITERIA.TITLE;
            
            // Auto-sort configuration (NEW)
            this.autoSort = config.autoSort !== undefined ? config.autoSort : true; // Default ON
            this.sortCriteria = config.sortCriteria || 'fileName'; // What to sort by: fileName, fileType, artist, title, date
            this.sortDirection = config.sortDirection || 'ascending'; // ascending or descending
            
            // Manual positions (when autoSort is OFF) - stores { objectId: slotIndex }
            this.manualPositions = config.manualPositions || {};
            
            // Capacity and geometry
            this.capacity = config.capacity || this.getDefaultCapacity();
            this.geometryParams = config.geometryParams || this.getDefaultGeometryParams();
            
            // Object placement data
            this.positions = config.positions || []; // Array of {x, y, z} for each slot (local coordinates)
            this.objectIds = config.objectIds || []; // Array of file IDs placed on furniture
            
            // Visual state
            this.isVisible = config.isVisible !== false; // Default visible
            this.isHighlighted = config.isHighlighted || false; // For playback highlighting
            
            // Playback state (for marker-based navigation)
            this.isPlaying = config.isPlaying || false;
            this.currentIndex = config.currentIndex || 0;
            this.playedIndices = config.playedIndices || []; // Track which slots have been played
            this.autoLoop = config.autoLoop || false; // Default: stop at end (no loop)
            
            // Demo furniture tracking (for copy-on-modify feature)
            this.isDemoFurniture = config.isDemoFurniture || false; // True if this is original demo furniture
            this.isModified = config.isModified || false; // True if user added/removed objects
            this.originalDemoType = config.originalDemoType || null; // Tracks which demo type (for spawning fresh copies)
            
            // Generate slot positions if not provided
            if (this.positions.length === 0) {
                console.log(`🪑 Generating slot positions for ${this.type} - none provided in config`);
                this.generateSlotPositions();
            } else {
                console.log(`🪑 Using provided slot positions for ${this.type}: ${this.positions.length} positions`);
                // CRITICAL: Verify positions have proper Y values (especially for Gallery Wall)
                if (this.type === FURNITURE_TYPES.GALLERY_WALL && this.positions.length > 0) {
                    // Gallery wall should have EXACTLY 10 positions (2 rows × 5 columns) with 2 distinct Y values
                    // Bottom row ~3.5, top row ~8.5 (with height=10) - minimum 4.5 units spacing
                    const yValues = [...new Set(this.positions.map(p => p.y))].sort((a, b) => a - b);
                    const hasProperRowCount = this.positions.length === this.capacity; // Should be 10
                    const hasProperRows = yValues.length === 2 && (yValues[1] - yValues[0]) >= 4.5;
                    
                    console.log(`🪑 Gallery Wall validation: ${this.positions.length}/${this.capacity} positions, ${yValues.length} unique Y values`, yValues.map(y => y.toFixed(1)));
                    console.log(`🪑 Gallery Wall spacing: ${yValues.length > 1 ? (yValues[1] - yValues[0]).toFixed(1) : 'N/A'} units between rows`);
                    
                    if (!hasProperRowCount || !hasProperRows) {
                        console.warn(`🪑 ⚠️ Gallery Wall invalid layout (count: ${this.positions.length}/${this.capacity}, rows: ${yValues.length}, spacing: ${yValues.length > 1 ? (yValues[1] - yValues[0]).toFixed(1) : 'N/A'}) - regenerating positions`);
                        // CRITICAL: Clear existing positions before regenerating to avoid duplicates
                        this.positions = [];
                        this.generateSlotPositions();
                        // Mark as needing persistence update
                        this._needsPersistenceUpdate = true;
                    }
                }
            }
            
            // CRITICAL FIX: Ensure objectIds array matches the number of positions
            // For newly created furniture, objectIds may be empty while positions exist
            if (this.objectIds.length < this.positions.length) {
                const neededSlots = this.positions.length - this.objectIds.length;
                console.log(`🪑 Initializing ${neededSlots} empty slots in objectIds array (total: ${this.positions.length} positions)`);
                // Fill with nulls to match position count
                for (let i = 0; i < neededSlots; i++) {
                    this.objectIds.push(null);
                }
            }
        }

        /**
         * Get default name for furniture type
         */
        getDefaultName() {
            const typeNames = {
                [FURNITURE_TYPES.BOOKSHELF]: 'Bookshelf',
                [FURNITURE_TYPES.RISER]: 'Riser',
                [FURNITURE_TYPES.GALLERY_WALL]: 'Gallery Wall',
                [FURNITURE_TYPES.STAGE_SMALL]: 'Small Stage',
                [FURNITURE_TYPES.STAGE_LARGE]: 'Large Stage',
                [FURNITURE_TYPES.AMPHITHEATRE]: 'Amphitheatre'
            };
            return typeNames[this.type] || 'Furniture';
        }

        /**
         * Get default capacity for furniture type
         */
        getDefaultCapacity() {
            const capacities = {
                [FURNITURE_TYPES.BOOKSHELF]: 6,  // 2 rows x 3 columns (more spacing between objects)
                [FURNITURE_TYPES.RISER]: 15,  // 3 tiers with 5 slots each
                [FURNITURE_TYPES.GALLERY_WALL]: 10,  // 2 rows x 5 columns (reduced from 15)
                [FURNITURE_TYPES.STAGE_SMALL]: 13,  // 1 featured + 12 back row (reduced from 30)
                [FURNITURE_TYPES.STAGE_LARGE]: 50,
                [FURNITURE_TYPES.AMPHITHEATRE]: 80  // 16 seats × 5 tiers (reduced from 100)
            };
            return capacities[this.type] || 10;
        }

        /**
         * Get default geometry parameters for furniture type
         */
        getDefaultGeometryParams() {
            switch (this.type) {
                case FURNITURE_TYPES.BOOKSHELF:
                    return {
                        width: 18,          // Overall width (increased from 15 for wider spacing)
                        height: 7,          // Overall height (increased for more vertical space)
                        depth: 2,           // Shelf depth
                        rows: 2,            // Number of rows
                        columns: 3,         // Number of columns
                        shelfThickness: 0.3 // Thickness of shelves
                    };
                
                case FURNITURE_TYPES.RISER:
                    return {
                        width: 24,          // Platform width (increased from 20)
                        height: 2,          // Platform elevation
                        depth: 24,          // Platform depth (increased from 20)
                        rows: 4,            // Grid rows
                        columns: 5          // Grid columns
                    };
                
                case FURNITURE_TYPES.GALLERY_WALL:
                    return {
                        width: 30,          // Wall width (increased from 25)
                        height: 10,         // Wall height (increased from 8)
                        thickness: 0.5,     // Wall thickness
                        rows: 2,            // Display rows
                        columns: 5          // Display columns
                    };
                
                case FURNITURE_TYPES.STAGE_SMALL:
                    return {
                        width: 30,          // Stage width (increased from 25)
                        height: 1.5,        // Stage elevation
                        depth: 18,          // Stage depth (increased from 15)
                        rows: 5,            // Grid rows
                        columns: 6          // Grid columns
                    };
                
                case FURNITURE_TYPES.STAGE_LARGE:
                    return {
                        width: 40,          // Stage width
                        height: 2,          // Stage elevation
                        depth: 25,          // Stage depth
                        rows: 7,            // Grid rows
                        columns: 7          // Grid columns (7x7 = 49, close to 50)
                    };
                
                case FURNITURE_TYPES.AMPHITHEATRE:
                    return {
                        radius: 30,         // Outer radius
                        tiers: 5,           // Number of tiers
                        seatsPerTier: 16,   // Seats per tier (reduced from 20)
                        tierHeight: 2,      // Height difference per tier
                        tierDepth: 4        // Depth of each tier
                    };
                
                default:
                    return {};
            }
        }

        /**
         * Generate slot positions for object placement (local coordinates)
         */
        generateSlotPositions() {
            this.positions = [];

            switch (this.type) {
                case FURNITURE_TYPES.BOOKSHELF:
                    this.generateBookshelfSlots();
                    break;
                
                case FURNITURE_TYPES.RISER:
                    this.generateRiserSlots();
                    break;
                
                case FURNITURE_TYPES.GALLERY_WALL:
                    this.generateGalleryWallSlots();
                    break;
                
                case FURNITURE_TYPES.STAGE_SMALL:
                case FURNITURE_TYPES.STAGE_LARGE:
                    this.generateStageSlots();
                    break;
                
                case FURNITURE_TYPES.AMPHITHEATRE:
                    this.generateAmphitheatreSlots();
                    break;
            }

            console.log(`🪑 Generated ${this.positions.length} slots for ${this.type}`);
        }

        /**
         * Generate bookshelf slot positions (2 rows x 5 columns)
         */
        generateBookshelfSlots() {
            const { width, height, depth, rows, columns, shelfThickness } = this.geometryParams;
            const slotWidth = width / (columns + 0.23); // 5% spacing increase to prevent overlap (was 0.5)
            
            // CRITICAL: Position markers ON the shelf surface (not midway between shelves)
            // Shelves are positioned at: y = i * (height / rows) where i = 0, 1, 2...
            // For 2 rows: shelf 0 at y=0 (bottom), shelf 1 at y=3 (middle), shelf 2 at y=6 (top)
            // We want markers on the BOTTOM and MIDDLE shelves (not top)
            for (let row = 0; row < rows; row++) {
                const shelfY = row * (height / rows); // Position of shelf surface
                
                for (let col = 0; col < columns; col++) {
                    const x = (col - (columns - 1) / 2) * slotWidth;
                    // Position marker ON TOP of the shelf surface
                    const y = shelfY + shelfThickness / 2;
                    const z = 0; // Objects sit on shelf surface
                    
                    this.positions.push({ x, y, z });
                }
            }
        }

        /**
         * Generate riser slot positions (3 tiers, one row per tier)
         */
        generateRiserSlots() {
            const { width, depth } = this.geometryParams;
            const tiers = 3; // 3 stepped rows
            const tierHeight = 1.0; // 2x higher (was 0.5)
            const tierDepth = depth / tiers / 2; // Half width for narrower steps
            const curvature = 0.2; // Match the curvature from visual manager
            
            // Calculate objects per tier - use 5 per tier for better spacing
            const objectsPerTier = 5;
            
            // Calculate spacing to ensure markers fit within structure width
            // Use 85% of width to provide margin and prevent edge floating
            const usableWidth = width * 0.85;
            const spacingX = usableWidth / (objectsPerTier - 1); // Evenly distribute across usable width
            
            // One row of slots per tier, positioned on top of each step
            for (let tier = 0; tier < tiers; tier++) {
                const currentHeight = (tiers - tier - 1) * tierHeight; // Top of each step
                const zOffset = (tier - (tiers - 1) / 2) * tierDepth; // Adjacent steps, no gaps
                
                for (let col = 0; col < objectsPerTier; col++) {
                    if (this.positions.length >= this.capacity) break;
                    
                    const x = (col - (objectsPerTier - 1) / 2) * spacingX;
                    
                    // Apply same curve as structure to match surface
                    const normalizedX = x / (width / 2);
                    const curveOffset = curvature * (1 - normalizedX * normalizedX); // Parabolic curve
                    
                    const y = currentHeight + curveOffset + 0.5; // Elevated slightly above curved surface
                    const z = zOffset;
                    
                    this.positions.push({ x, y, z });
                }
            }
        }

        /**
         * Generate gallery wall slot positions (wall-mounted grid)
         */
        generateGalleryWallSlots() {
            const { width, height, rows, columns } = this.geometryParams;
            const spacingX = width / (columns + 1.19); // 10% spacing increase to prevent overlap (was 1.8)
            
            // CRITICAL: Use exactly 2 rows with LARGER vertical separation to prevent overlap
            // With height=10, we want bottom row at y=3.5 and top row at y=8.5 (5 units apart)
            // This gives ample space for objects (typically 1-1.5 units tall) to avoid overlap
            const verticalSpacing = height * 0.5; // 5 units apart for height=10
            const bottomRowY = height * 0.35; // Bottom row at ~3.5 for height=10
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < columns; col++) {
                    const x = (col - (columns - 1) / 2) * spacingX;
                    const y = bottomRowY + row * verticalSpacing;
                    const z = 1.0; // Further in front of wall to ensure visibility (was 0.5)
                    
                    this.positions.push({ x, y, z });
                }
            }
            
            console.log(`🪑 Gallery Wall: Generated ${this.positions.length} markers (${rows} rows x ${columns} cols) with ${verticalSpacing.toFixed(1)} unit spacing`);
        }

        /**
         * Generate stage slot positions (platform grid)
         */
        generateStageSlots() {
            const { width, height, depth, columns } = this.geometryParams;
            // 12.5% spacing increase: Small Stage (0.67), Large Stage (0.55) to prevent overlap (was 1.5)
            const spacingPadding = (width === 30) ? 0.67 : 0.55; // Small=30, Large=40
            const spacingX = width / (columns + spacingPadding);
            const backRows = 2; // Only 2 back rows
            const rowSpacing = depth / 3.5; // Increased row spacing (was /4)
            
            // ADD FEATURED MARKER FIRST (slot[0] - first in playlist)
            this.positions.push({
                x: 0,                    // Front center
                y: height + 0.5,        // On platform surface
                z: depth / 2 - 1        // Near front edge (featured position)
            });
            
            // Then add back row markers (slots 1-12)
            for (let row = 0; row < backRows; row++) {
                for (let col = 0; col < columns; col++) {
                    const x = (col - (columns - 1) / 2) * spacingX;
                    const y = height + 0.5; // On top of stage platform surface
                    const z = -depth / 2 + row * rowSpacing + rowSpacing; // Back area
                    
                    this.positions.push({ x, y, z });
                }
            }
            
            // Total: 13 markers (1 featured + 12 back row)
        }

        /**
         * Generate amphitheatre slot positions (tiered semicircle)
         */
        generateAmphitheatreSlots() {
            const { radius, tiers, seatsPerTier, tierHeight, tierDepth } = this.geometryParams;
            
            // Start from tier 1 (skip bottom tier 0) and go through tier 5 (add top tier)
            for (let tier = 1; tier <= tiers; tier++) {
                // Position markers near outer edge: add offset to move toward front edge
                const tierRadius = radius - (tier * tierDepth) + (tierDepth - 1);
                const angleStep = Math.PI / (seatsPerTier - 1); // Semicircle
                
                for (let seat = 0; seat < seatsPerTier; seat++) {
                    const angle = seat * angleStep - Math.PI / 2; // -90° to +90°
                    const x = tierRadius * Math.cos(angle);
                    const y = tier * tierHeight;
                    const z = tierRadius * Math.sin(angle);
                    
                    // Calculate rotation so objects face radially OUTWARD toward the front (lowest tier)
                    // For link objects with face textures, they need to face outward toward audience
                    // angle is position angle from center (polar coordinates)
                    // rotation.y = angle - π/2 makes object face outward (away from center)
                    const rotation = angle - Math.PI / 2;
                    
                    this.positions.push({ x, y, z, rotation });
                }
            }
        }

        /**
         * Add object to furniture
         * @param {string} objectId - File object ID
         * @returns {number} Slot index where object was placed, or -1 if full
         */
        addObject(objectId) {
            // Find first available (null) slot
            let slotIndex = -1;
            for (let i = 0; i < this.capacity; i++) {
                // Ensure array is long enough
                if (i >= this.objectIds.length) {
                    this.objectIds.push(null);
                }
                
                if (this.objectIds[i] === null || this.objectIds[i] === '') {
                    slotIndex = i;
                    break;
                }
            }
            
            if (slotIndex === -1) {
                console.warn(`🪑 Furniture ${this.id} is full (${this.capacity} capacity)`);
                return -1;
            }
            
            this.objectIds[slotIndex] = objectId;
            this.lastModified = Date.now();
            
            const currentCount = this.objectIds.filter(id => id !== null && id !== '').length;
            console.log(`🪑 Added object ${objectId} to furniture ${this.id} at slot ${slotIndex} (${currentCount}/${this.capacity})`);
            return slotIndex;
        }

        /**
         * Set object at specific slot index (for restoration from persistence)
         * @param {string} objectId - File object ID
         * @param {number} slotIndex - Target slot index
         * @returns {boolean} True if successful, false if slot is occupied or invalid
         */
        setObjectAtSlot(objectId, slotIndex) {
            // Ensure objectIds array is initialized to capacity with nulls
            if (this.objectIds.length < this.capacity) {
                const neededSlots = this.capacity - this.objectIds.length;
                this.objectIds.push(...new Array(neededSlots).fill(null));
            }

            if (slotIndex < 0 || slotIndex >= this.capacity) {
                console.warn(`🪑 Invalid slot index ${slotIndex} for furniture ${this.id} (capacity: ${this.capacity})`);
                return false;
            }

            // DEDUPLICATION: Remove objectId from any other slot first
            for (let i = 0; i < this.objectIds.length; i++) {
                if (i !== slotIndex && this.objectIds[i] === objectId) {
                    console.log(`🪑🔧 Removing duplicate: ${objectId} from slot ${i} (moving to slot ${slotIndex})`);
                    this.objectIds[i] = null;
                }
            }

            // Allow overwriting null slots or the same object ID (for updates)
            if (this.objectIds[slotIndex] !== null && this.objectIds[slotIndex] !== objectId) {
                console.warn(`🪑 Slot ${slotIndex} on furniture ${this.id} is already occupied by ${this.objectIds[slotIndex]}`);
                return false;
            }

            this.objectIds[slotIndex] = objectId;
            this.lastModified = Date.now();
            
            const occupiedCount = this.objectIds.filter(id => id !== null).length;
            console.log(`🪑 Set object ${objectId} at slot ${slotIndex} on furniture ${this.id} (${occupiedCount}/${this.capacity})`);
            return true;
        }

        /**
         * Remove duplicate objectIds from this furniture's slots
         * Keeps only the first occurrence of each objectId
         * @returns {number} Number of duplicates removed
         */
        removeDuplicateSlots() {
            const seen = new Set();
            let duplicatesRemoved = 0;

            for (let i = 0; i < this.objectIds.length; i++) {
                const objectId = this.objectIds[i];
                if (objectId !== null) {
                    if (seen.has(objectId)) {
                        console.log(`🪑🧹 Removing duplicate: ${objectId} from slot ${i}`);
                        this.objectIds[i] = null;
                        duplicatesRemoved++;
                    } else {
                        seen.add(objectId);
                    }
                }
            }

            if (duplicatesRemoved > 0) {
                this.lastModified = Date.now();
                console.log(`🪑🧹 Removed ${duplicatesRemoved} duplicate(s) from furniture ${this.id} (${this.typeName})`);
            }

            return duplicatesRemoved;
        }

        /**
         * Remove object from furniture
         * @param {string} objectId - File object ID
         * @returns {number} Slot index if object was removed, -1 if not found
         */
        removeObject(objectId) {
            const index = this.objectIds.indexOf(objectId);
            if (index === -1) {
                console.warn(`🪑 Object ${objectId} not found on furniture ${this.id}`);
                return -1;
            }
            
            // CRITICAL: Set to null instead of splice to preserve slot indices
            this.objectIds[index] = null;
            this.lastModified = Date.now();
            
            const occupiedCount = this.objectIds.filter(id => id).length;
            // console.log(`🪑 Removed object ${objectId} from furniture ${this.id} slot ${index} (${occupiedCount}/${this.capacity})`);
            return index;
        }

        /**
         * Get slot position for object (local coordinates)
         * @param {number} slotIndex - Slot index
         * @returns {Object} Position {x, y, z} or null if invalid
         */
        getSlotPosition(slotIndex) {
            if (slotIndex < 0 || slotIndex >= this.positions.length) {
                console.warn(`🪑 Invalid slot index ${slotIndex} for furniture ${this.id}`);
                return null;
            }
            return { ...this.positions[slotIndex] }; // Return copy
        }

        /**
         * Check if furniture has available slots
         * @returns {boolean} True if slots available
         */
        hasAvailableSlots() {
            return this.objectIds.length < this.capacity;
        }

        /**
         * Get available slot count
         * @returns {number} Number of available slots
         */
        getAvailableSlotCount() {
            return this.capacity - this.objectIds.length;
        }

        /**
         * Get next object in playback sequence
         * @returns {Object} { hasNext: boolean, nextIndex: number, nextId: string }
         */
        getNextObject() {
            // Filter to only slots with objects
            const occupiedSlots = this.objectIds
                .map((id, index) => ({ id, index }))
                .filter(slot => slot.id);

            if (occupiedSlots.length === 0) {
                return { hasNext: false, nextIndex: null, nextId: null };
            }

            // Mark current as played before moving
            if (!this.playedIndices.includes(this.currentIndex)) {
                this.playedIndices.push(this.currentIndex);
            }

            // Check if all videos have been played
            if (this.playedIndices.length >= occupiedSlots.length) {
                // All videos played, stop playlist
                return { hasNext: false, nextIndex: null, nextId: null };
            }

            // Find current position in occupied slots
            const currentPosition = occupiedSlots.findIndex(slot => slot.index === this.currentIndex);
            
            // Calculate next position with wraparound
            let nextPosition = currentPosition + 1;
            if (nextPosition >= occupiedSlots.length) {
                // Wrap around to beginning
                nextPosition = 0;
            }

            // Get next slot
            const nextSlot = occupiedSlots[nextPosition];
            return { hasNext: true, nextIndex: nextSlot.index, nextId: nextSlot.id };
        }

        /**
         * Peek at next object without modifying playedIndices (for marker preview)
         * @returns {Object} { hasNext: boolean, nextIndex: number, nextId: string }
         */
        peekNextObject() {
            // Filter to only slots with objects
            const occupiedSlots = this.objectIds
                .map((id, index) => ({ id, index }))
                .filter(slot => slot.id);

            if (occupiedSlots.length === 0) {
                return { hasNext: false, nextIndex: null, nextId: null };
            }

            // Check if all videos have been played (using current count + 1 for current video)
            const wouldBePlayedCount = this.playedIndices.includes(this.currentIndex) 
                ? this.playedIndices.length 
                : this.playedIndices.length + 1;
            
            if (wouldBePlayedCount >= occupiedSlots.length) {
                // All videos would be played after current, no next
                return { hasNext: false, nextIndex: null, nextId: null };
            }

            // Find current position in occupied slots
            const currentPosition = occupiedSlots.findIndex(slot => slot.index === this.currentIndex);
            
            // Calculate next position with wraparound
            let nextPosition = currentPosition + 1;
            if (nextPosition >= occupiedSlots.length) {
                // Wrap around to beginning
                nextPosition = 0;
            }

            // Get next slot
            const nextSlot = occupiedSlots[nextPosition];
            return { hasNext: true, nextIndex: nextSlot.index, nextId: nextSlot.id };
        }

        /**
         * Get previous object in playback sequence
         * @returns {Object} { hasPrevious: boolean, previousIndex: number, previousId: string }
         */
        getPreviousObject() {
            // Filter to only slots with objects
            const occupiedSlots = this.objectIds
                .map((id, index) => ({ id, index }))
                .filter(slot => slot.id);

            if (occupiedSlots.length === 0) {
                return { hasPrevious: false, previousIndex: null, previousId: null };
            }

            // Find current position in occupied slots
            const currentPosition = occupiedSlots.findIndex(slot => slot.index === this.currentIndex);
            
            if (currentPosition <= 0) {
                // At start, loop to end if auto-loop enabled
                if (this.autoLoop) {
                    const lastSlot = occupiedSlots[occupiedSlots.length - 1];
                    return { hasPrevious: true, previousIndex: lastSlot.index, previousId: lastSlot.id };
                } else {
                    return { hasPrevious: false, previousIndex: null, previousId: null };
                }
            }

            // Move to previous occupied slot
            const prevSlot = occupiedSlots[currentPosition - 1];
            // Remove current from played indices when going backward
            const playedIndex = this.playedIndices.indexOf(this.currentIndex);
            if (playedIndex > -1) {
                this.playedIndices.splice(playedIndex, 1);
            }
            return { hasPrevious: true, previousIndex: prevSlot.index, previousId: prevSlot.id };
        }

        /**
         * Export furniture data for storage
         * @returns {Object} Serializable furniture data
         */
        toJSON() {
            return {
                id: this.id,
                type: this.type,
                name: this.name,
                worldType: this.worldType,
                createdAt: this.createdAt,
                lastModified: this.lastModified,
                position: this.position,
                rotation: this.rotation,
                style: this.style,
                sortingCriteria: this.sortingCriteria,
                capacity: this.capacity,
                geometryParams: this.geometryParams,
                positions: this.positions,
                objectIds: this.objectIds,
                isVisible: this.isVisible,
                // Auto-sort configuration
                autoSort: this.autoSort,
                sortCriteria: this.sortCriteria,
                sortDirection: this.sortDirection,
                manualPositions: this.manualPositions,
                // Playback state
                isPlaying: this.isPlaying,
                currentIndex: this.currentIndex,
                playedIndices: this.playedIndices,
                autoLoop: this.autoLoop,
                // Demo furniture tracking
                isDemoFurniture: this.isDemoFurniture,
                isModified: this.isModified,
                originalDemoType: this.originalDemoType
            };
        }

        /**
         * Create furniture from stored data
         * @param {Object} data - Stored furniture data
         * @returns {Furniture} Furniture instance
         */
        static fromJSON(data) {
            return new Furniture(data);
        }
    }

    // ============================================================================
    // FURNITURE STORAGE MANAGER
    // ============================================================================
    
    class FurnitureStorageManager {
        constructor() {
            this.storageKey = 'mv3d_furniture';
            this.furniture = new Map(); // furnitureId -> Furniture
            this.worldFurniture = new Map(); // worldType -> Set<furnitureId>
        }

        /**
         * Initialize storage - load all furniture
         */
        async initialize() {
            console.log('🪑 Initializing Furniture Storage Manager...');
            await this.loadAllFurniture();
            console.log(`🪑 Loaded ${this.furniture.size} furniture pieces from storage`);
        }

        /**
         * Load all furniture from storage (via Flutter bridge)
         */
        async loadAllFurniture() {
            try {
                console.log('🪑 Starting furniture load from Flutter...');
                
                // Try loading from Flutter first
                const furnitureData = await this.loadFromFlutter();
                
                if (furnitureData) {
                    console.log('🪑 Furniture data received:', furnitureData);
                    
                    // Load furniture data from Flutter
                    if (furnitureData.furniture && Array.isArray(furnitureData.furniture)) {
                        console.log(`🪑 Processing ${furnitureData.furniture.length} furniture pieces...`);
                        
                        furnitureData.furniture.forEach((furnitureItem, index) => {
                            try {
                                const furniture = Furniture.fromJSON(furnitureItem);
                                this.furniture.set(furniture.id, furniture);
                                
                                // Index by world type
                                if (!this.worldFurniture.has(furniture.worldType)) {
                                    this.worldFurniture.set(furniture.worldType, new Set());
                                }
                                this.worldFurniture.get(furniture.worldType).add(furniture.id);
                                
                                console.log(`🪑 Loaded furniture ${index + 1}/${furnitureData.furniture.length}: ${furniture.id} (${furniture.type})`);
                            } catch (e) {
                                console.error(`🪑 Error loading furniture item ${index}:`, e, furnitureItem);
                            }
                        });
                        console.log(`🪑 Successfully loaded ${this.furniture.size} furniture pieces from Flutter`);
                    } else {
                        console.log('🪑 No furniture array found in data:', furnitureData);
                    }
                } else {
                    console.log('🪑 No furniture data found in Flutter storage (null returned)');
                }
            } catch (error) {
                console.error('🪑 Error loading furniture:', error);
            }
        }
        
        /**
         * Load furniture data from Flutter bridge
         */
        async loadFromFlutter() {
            return new Promise((resolve) => {
                let resolved = false;
                
                // Set up callback for Flutter to respond
                window.furnitureLoadCallback = (data) => {
                    if (resolved) {
                        console.warn('🪑 Furniture callback called after timeout');
                        return;
                    }
                    resolved = true;
                    
                    if (data) {
                        try {
                            const parsed = JSON.parse(data);
                            console.log('🪑 Successfully loaded furniture data from Flutter');
                            resolve(parsed);
                        } catch (e) {
                            console.error('🪑 Error parsing furniture data from Flutter:', e);
                            resolve(null);
                        }
                    } else {
                        console.log('🪑 No furniture data returned from Flutter');
                        resolve(null);
                    }
                };
                
                // Request data from Flutter
                if (window.FurniturePersistenceChannel) {
                    console.log('🪑 Requesting furniture data from Flutter...');
                    window.FurniturePersistenceChannel.postMessage(JSON.stringify({
                        action: 'loadFurnitureData'
                    }));
                } else {
                    console.warn('🪑 Flutter bridge not available, furniture persistence disabled');
                    resolved = true;
                    resolve(null);
                }
                
                // Timeout after 5 seconds (increased from 2)
                setTimeout(() => {
                    if (!resolved) {
                        console.warn('🪑 Furniture load timeout - Flutter did not respond within 5 seconds');
                        resolved = true;
                        resolve(null);
                    }
                }, 5000);
            });
        }

        /**
         * Save all furniture to storage (via Flutter bridge)
         */
        async saveAllFurniture() {
            try {
                const data = {
                    furniture: Array.from(this.furniture.values()).map(f => f.toJSON()),
                    version: 1,
                    lastSaved: Date.now()
                };
                
                // Save to Flutter
                await this.saveToFlutter(data);
                console.log(`🪑 Saved ${this.furniture.size} furniture pieces to storage`);
                return true;
            } catch (error) {
                console.error('🪑 Error saving furniture:', error);
                return false;
            }
        }
        
        /**
         * Save furniture data to Flutter bridge
         */
        async saveToFlutter(data) {
            return new Promise((resolve) => {
                // Set up callback for Flutter to confirm save
                window.furnitureSaveCallback = (success) => {
                    resolve(success);
                };
                
                // Send data to Flutter
                if (window.FurniturePersistenceChannel) {
                    window.FurniturePersistenceChannel.postMessage(JSON.stringify({
                        action: 'saveFurnitureData',
                        data: JSON.stringify(data)
                    }));
                } else {
                    console.warn('🪑 Flutter bridge not available, furniture persistence disabled');
                    resolve(false);
                }
                
                // Timeout after 2 seconds (reduced logging)
                setTimeout(() => {
                    // console.warn('🪑 Furniture save timeout'); // Reduced - this is expected behavior
                    resolve(false);
                }, 2000);
            });
        }

        /**
         * Add a new furniture piece
         */
        async addFurniture(furniture) {
            const worldType = furniture.worldType;
            
            this.furniture.set(furniture.id, furniture);
            
            if (!this.worldFurniture.has(worldType)) {
                this.worldFurniture.set(worldType, new Set());
            }
            this.worldFurniture.get(worldType).add(furniture.id);

            await this.saveAllFurniture();
            console.log(`🪑 Added furniture ${furniture.id} to ${worldType}`);
            return true;
        }

        /**
         * Remove a furniture piece
         */
        async removeFurniture(furnitureId) {
            const furniture = this.furniture.get(furnitureId);
            if (!furniture) return false;

            this.furniture.delete(furnitureId);
            
            const worldFurnitureSet = this.worldFurniture.get(furniture.worldType);
            if (worldFurnitureSet) {
                worldFurnitureSet.delete(furnitureId);
            }

            await this.saveAllFurniture();
            console.log(`🪑 Removed furniture ${furnitureId}`);
            return true;
        }

        /**
         * Get furniture by ID
         */
        getFurniture(furnitureId) {
            return this.furniture.get(furnitureId);
        }

        /**
         * Get all furniture for a world
         */
        getFurnitureForWorld(worldType) {
            const furnitureIds = this.worldFurniture.get(worldType);
            if (!furnitureIds) return [];

            return Array.from(furnitureIds)
                .map(id => this.furniture.get(id))
                .filter(f => f !== undefined);
        }

        /**
         * Update furniture (and save)
         */
        async updateFurniture(furniture) {
            if (!this.furniture.has(furniture.id)) {
                console.warn(`🪑 Furniture ${furniture.id} not found`);
                return false;
            }

            furniture.lastModified = Date.now();
            this.furniture.set(furniture.id, furniture);
            await this.saveAllFurniture();
            return true;
        }

        /**
         * Rebuild furniture objectIds from scene objects
         * Used to repair furniture that has objects but missing objectIds
         */
        async rebuildAllFurnitureObjectIds() {
            // Check if scene is available
            if (!window.app?.sceneManager?.scene) {
                console.log('🔧 Scene not ready, skipping furniture repair');
                return 0;
            }
            
            console.log('🔧 Checking furniture objectIds consistency...');
            const allFurniture = Array.from(this.furniture.values());
            let repairedCount = 0;

            for (const furniture of allFurniture) {
                const oldLength = furniture.objectIds.filter(id => id !== null).length;
                
                // Scan scene for objects belonging to this furniture
                const sceneObjects = new Map(); // slotIndex -> objectId
                window.app.sceneManager.scene.traverse((obj) => {
                    if (obj.userData?.furnitureId === furniture.id && 
                        obj.userData?.furnitureSlotIndex !== undefined) {
                        const slotIndex = obj.userData.furnitureSlotIndex;
                        if (slotIndex >= 0 && slotIndex < furniture.objectIds.length) {
                            sceneObjects.set(slotIndex, obj.userData.id);
                        }
                    }
                });

                // Check if repair is needed (objects exist in scene but not in objectIds)
                const needsRepair = sceneObjects.size > 0 && oldLength === 0;
                
                if (needsRepair) {
                    // Rebuild objectIds array from scene
                    furniture.objectIds = new Array(furniture.objectIds.length).fill(null);
                    for (const [slotIndex, objectId] of sceneObjects) {
                        furniture.objectIds[slotIndex] = objectId;
                    }
                    
                    await this.updateFurniture(furniture);
                    repairedCount++;
                    console.log(`🔧 Repaired ${furniture.name}: ${oldLength} → ${sceneObjects.size} objects`);
                }
            }

            console.log(`🔧 ✅ Repaired ${repairedCount} furniture pieces`);
            return repairedCount;
        }

        /**
         * Get furniture count for world
         */
        getFurnitureCountForWorld(worldType) {
            const furnitureIds = this.worldFurniture.get(worldType);
            return furnitureIds ? furnitureIds.size : 0;
        }

        /**
         * Get ALL furniture across all worlds
         * Used when furniture persists across world switches
         */
        getAllFurnitureAcrossWorlds() {
            return Array.from(this.furniture.values());
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    
    window.Furniture = Furniture;
    window.FurnitureStorageManager = FurnitureStorageManager;
    window.FURNITURE_TYPES = FURNITURE_TYPES;
    window.SORTING_CRITERIA = SORTING_CRITERIA;
    window.FURNITURE_STYLES = FURNITURE_STYLES;
    
    // Global helper function for console debugging
    window.repairAllFurniture = async function() {
        if (window.app?.furnitureManager?.storageManager) {
            return await window.app.furnitureManager.storageManager.rebuildAllFurnitureObjectIds();
        } else {
            console.error('❌ Furniture manager not available');
            return 0;
        }
    };
    
    console.log('✅ Furniture Data Model loaded');
})();
