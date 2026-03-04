// modules/sorting/sortingManager.js
// Dependencies: THREE (global), window.SharedStateManager
// Exports: window.SortingManager

(function() {
    'use strict';
    
    console.log("Loading SortingManager module...");
    
    // ============================================================================
    // 3D WORLD SORTING SYSTEM - Home Area Protection & Zone-based Organization
    // ============================================================================
    class SortingManager {
        constructor(THREE, scene, stateManager, worldTemplate) {
            this.THREE = THREE;
            this.scene = scene;
            this.stateManager = stateManager;
            this.worldTemplate = worldTemplate;
            
            // Initialization tracking
            this.isInitialized = false;
            
            // Sorting configuration
            this.config = {
                enabled: true,
                mode: 'smart-auto', // 'chronological', 'size-based', 'newest-first'
                autoSort: true, // Auto-sort new objects
                preserveHomeArea: true,
                animateTransitions: true,
                respectUserStacks: true // Don't unstack user-created stacks
            };
            
            // Home Area configuration (30 grid units diameter = 15 unit radius)
            this.homeArea = {
                center: { x: 0, y: 0, z: 0 },
                radius: 15,
                visualIndicator: null, // Will hold the visual circle
                protected: true // Objects here are never auto-sorted
            };
            
            // Sorting zones (will be populated based on world type)
            this.sortingZones = new Map();
            
            // File type categories
            this.fileCategories = {
                'images': {
                    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'],
                    color: 0x4CAF50, // Green
                    priority: 1
                },
                'videos': {
                    extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'],
                    color: 0x2196F3, // Blue
                    priority: 2
                },
                'music': {
                    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
                    color: 0xFF9800, // Orange
                    priority: 3
                },
                'documents': {
                    extensions: [
                        'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages', // Traditional documents
                        'xls', 'xlsx', 'csv', 'ods', 'numbers', // Spreadsheets (merged)
                        'ppt', 'pptx', 'key', 'odp' // Presentations (merged)
                    ],
                    color: 0x9C27B0, // Purple
                    priority: 4
                },
                'apps': {
                    extensions: [], // App objects don't use file extensions
                    color: 0xFF0000, // Red
                    priority: 5
                },
                'links': {
                    extensions: [], // Link objects don't use file extensions
                    color: 0xFFFF00, // Yellow
                    priority: 6
                },
                'contacts': {
                    extensions: ['contact'], // Contact objects
                    color: 0x4A90E2, // Blue for contacts
                    priority: 7
                },
                'other': {
                    extensions: [], // Catch-all for unrecognized file types
                    color: 0x607D8B, // Blue Grey
                    priority: 8
                }
            };
            
            // Initialize the stacking engine
            this.stackingEngine = new window.StackingEngine(THREE, scene, stateManager, worldTemplate);
            
            // Initialize visual indicators module (optional enhancement)
            this.visualIndicators = null;
            
            console.log('SortingManager initialized with StackingEngine');
        }
        
        // ============================================================================
        // PHASE 1: FOUNDATION - HOME AREA & BASIC DETECTION
        // ============================================================================
        
        /**
         * Initialize the sorting system for the current world
         */
        initialize() {
            console.log('=== INITIALIZING SORTING SYSTEM ===');
            console.log('World type:', this.worldTemplate ? this.worldTemplate.getType() : 'unknown');
            console.log('Sorting enabled:', this.config.enabled);
            
            if (!this.config.enabled) {
                console.log('Sorting is disabled');
                return;
            }
            
            this.createHomeAreaVisual();
            this.initializeSortingZones();
            this.initializeSearchArea();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // After initialization, create visual indicators and sort objects if enabled
            this.createZoneVisualIndicators();
            this.sortObjectsIntoZones();
            
            console.log('=== SORTING SYSTEM INITIALIZATION COMPLETE ===');
        }
        
        /**
         * Create the visual indicator for the Home Area
         */
        createHomeAreaVisual() {
            console.log('Creating Home Area visual indicator...');
            
            // Remove existing indicator if it exists
            if (this.homeArea.visualIndicator) {
                this.scene.remove(this.homeArea.visualIndicator);
                this.homeArea.visualIndicator = null;
            }
            
            // Get world type to determine appropriate Y position
            const worldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
            let yPosition = 0.01; // Default slightly above ground
            
            // Adjust Y position based on world type
            if (worldType === 'ocean') {
                yPosition = -0.1; // Below ocean surface (Y=0) to be visible underwater
            } else if (worldType === 'space') {
                yPosition = 0; // At origin level in space
            } else {
                yPosition = 0.01; // Slightly above ground for green-plane
            }
            
            // Create a subtle circle to mark the Home Area
            const circleGeometry = new this.THREE.RingGeometry(
                this.homeArea.radius - 0.5, // Inner radius (slightly smaller for ring effect)
                this.homeArea.radius, // Outer radius
                32 // Segments for smooth circle
            );
            
            const circleMaterial = new this.THREE.MeshBasicMaterial({
                color: 0x00ffff, // Cyan for better visibility
                opacity: 0.4,
                transparent: true,
                side: this.THREE.DoubleSide
            });
            
            this.homeArea.visualIndicator = new this.THREE.Mesh(circleGeometry, circleMaterial);
            this.homeArea.visualIndicator.rotation.x = -Math.PI / 2; // Lay flat on XZ plane
            this.homeArea.visualIndicator.position.set(
                this.homeArea.center.x,
                this.homeArea.center.y + yPosition,
                this.homeArea.center.z
            );
            
            // Mark as template object so it doesn't interfere with other systems
            this.homeArea.visualIndicator.userData.templateObject = true;
            this.homeArea.visualIndicator.userData.isHomeAreaIndicator = true;
            
            this.scene.add(this.homeArea.visualIndicator);
            console.log(`Home Area visual indicator created for ${worldType} world at Y=${yPosition}, radius: ${this.homeArea.radius}`);
        }
        
        /**
         * Initialize sorting zones based on current world constraints
         */
        initializeSortingZones() {
            console.log('Initializing sorting zones...');
            
            if (!this.worldTemplate) {
                console.warn('No world template available for zone initialization');
                return;
            }
            
            const worldType = this.worldTemplate.getType();
            const constraints = this.worldTemplate.getPositioningConstraints();
            
            console.log('World constraints:', constraints);
            
            // Clear existing zones
            this.sortingZones.clear();
            
            // Create zones based on world type
            switch (worldType) {
                case 'green-plane':
                    this.createGreenPlaneZones(constraints);
                    break;
                case 'ocean':
                    this.createOceanZones(constraints);
                    break;
                case 'space':
                    this.createSpaceZones(constraints);
                    break;
                // Premium world themes
                case 'dazzle':
                    // Dazzle bedroom uses same zone layout as green-plane
                    this.createGreenPlaneZones(constraints);
                    break;
                case 'forest':
                    // Forest realm uses same zone layout as ocean world
                    this.createOceanZones(constraints);
                    break;
                case 'cave':
                    // Cave Explorer world uses same zone layout as green-plane
                    this.createGreenPlaneZones(constraints);
                    break;
                case 'christmas':
                    // Christmas world uses same zone layout as green-plane
                    this.createGreenPlaneZones(constraints);
                    break;
                case 'desert-oasis':
                    // Desert Oasis world uses same zone layout as green-plane
                    this.createGreenPlaneZones(constraints);
                    break;
                default:
                    console.warn('Unknown world type for zone creation:', worldType);
                    
                    // NEW: Check if this is a new template registered with the helper system
                    if (window.worldTemplateRegistryHelper && 
                        window.worldTemplateRegistryHelper.isNewTemplate(worldType)) {
                        console.log('🆕 Creating Green Plane-style zones for new template:', worldType);
                        this.createGreenPlaneZones(constraints);
                    } else {
                        console.warn('No zone configuration available for unknown world type:', worldType);
                    }
                    break;
            }
            
            console.log(`Created ${this.sortingZones.size} sorting zones for ${worldType} world`);
        }
        
        /**
         * Create sorting zones for Green Plane world (ground level only)
         * UPDATED: Media-centric layout with larger zones for music/video content
         */
        createGreenPlaneZones(constraints) {
            // MEDIA-CENTRIC LAYOUT: Larger zones for primary media content
            const mediaZone_largeSize = 40; // Music, Videos, Links get 40-unit zones (reduced from 50)
            const standardZoneSize = 25; // Other categories get 25-unit zones (background)
            
            // Home Area is at origin (0,0) with 15-unit radius
            // Position media zones far back and spread across X axis
            
            const zoneConfigs = [
                // ROW 1: Far behind home area at Z=-50 (3 zones)
                { category: 'links', x: -50, z: -50, size: mediaZone_largeSize },
                { category: 'music', x: 0, z: -50, size: mediaZone_largeSize },
                { category: 'videos', x: 50, z: -50, size: mediaZone_largeSize },
                
                // ROW 2: Very far back at Z=-85 (4 zones)
                { category: 'images', x: -60, z: -85, size: standardZoneSize },
                { category: 'documents', x: -20, z: -85, size: standardZoneSize },
                { category: 'apps', x: 20, z: -85, size: standardZoneSize },
                { category: 'contacts', x: 60, z: -85, size: standardZoneSize }
            ];
            
            zoneConfigs.forEach(config => {
                this.sortingZones.set(config.category, {
                    category: config.category,
                    center: { x: config.x, y: 0, z: config.z }, // Ground level (Y=0)
                    size: config.size,
                    worldType: 'green-plane',
                    yConstraints: { min: 0, max: 0 }, // Ground level only
                    color: this.fileCategories[config.category].color,
                    label: config.category.toUpperCase()
                });
                
                console.log(`Created ${config.size}-unit zone for ${config.category} at (${config.x}, 0, ${config.z})`);
            });
        }
        
        /**
         * Create sorting zones for Ocean world (surface and below)
         * UPDATED: Media-centric layout with larger zones for music/video content
         */
        createOceanZones(constraints) {
            // MEDIA-CENTRIC LAYOUT: Larger zones for primary media content
            const mediaZone_largeSize = 40; // Music, Videos, Links get 40-unit zones (reduced from 50)
            const standardZoneSize = 25; // Other categories get 25-unit zones
            
            const zoneConfigs = [
                // ROW 1: Far behind home area at Z=-50 (3 zones)
                { category: 'links', x: -50, z: -50, size: mediaZone_largeSize },
                { category: 'music', x: 0, z: -50, size: mediaZone_largeSize },
                { category: 'videos', x: 50, z: -50, size: mediaZone_largeSize },
                
                // ROW 2: Very far back at Z=-85 (4 zones)
                { category: 'images', x: -60, z: -85, size: standardZoneSize },
                { category: 'documents', x: -20, z: -85, size: standardZoneSize },
                { category: 'apps', x: 20, z: -85, size: standardZoneSize },
                { category: 'contacts', x: 60, z: -85, size: standardZoneSize }
            ];
            
            zoneConfigs.forEach(config => {
                this.sortingZones.set(config.category, {
                    category: config.category,
                    center: { x: config.x, y: 0, z: config.z }, // Same level as Home Area
                    size: config.size,
                    worldType: 'ocean',
                    yConstraints: { min: -200, max: 100 }, // Allow objects above ocean surface for stacking
                    color: this.fileCategories[config.category].color,
                    label: config.category.toUpperCase()
                });
                
                console.log(`Created ${config.size}-unit ocean zone for ${config.category} at (${config.x}, 0, ${config.z})`);
            });
        }
        
        /**
         * Create sorting zones for Space world (full 3D)
         * UPDATED: Media-centric layout with larger zones for music/video content
         */
        createSpaceZones(constraints) {
            // MEDIA-CENTRIC LAYOUT: Larger zones for primary media content
            const mediaZone_largeSize = 40; // Music, Videos, Links get 40-unit zones (reduced from 50)
            const standardZoneSize = 25; // Other categories get 25-unit zones
            
            const zoneConfigs = [
                // ROW 1: Far behind home area at Z=-50 (3 zones)
                { category: 'links', x: -50, z: -50, size: mediaZone_largeSize },
                { category: 'music', x: 0, z: -50, size: mediaZone_largeSize },
                { category: 'videos', x: 50, z: -50, size: mediaZone_largeSize },
                
                // ROW 2: Very far back at Z=-85 (4 zones)
                { category: 'images', x: -60, z: -85, size: standardZoneSize },
                { category: 'documents', x: -20, z: -85, size: standardZoneSize },
                { category: 'apps', x: 20, z: -85, size: standardZoneSize },
                { category: 'contacts', x: 60, z: -85, size: standardZoneSize }
            ];
            
            zoneConfigs.forEach(config => {
                this.sortingZones.set(config.category, {
                    category: config.category,
                    center: { x: config.x, y: 0, z: config.z }, // Same level as Home Area
                    size: config.size,
                    worldType: 'space',
                    yConstraints: { min: -1000, max: 1000 }, // Full 3D range
                    color: this.fileCategories[config.category].color,
                    label: config.category.toUpperCase()
                });
                
                console.log(`Created ${config.size}-unit space zone for ${config.category} at (${config.x}, 0, ${config.z})`);
            });
        }
        
        /**
         * Check if an object is within the Home Area
         */
        isInHomeArea(object) {
            if (!object || !object.position) return false;
            
            const distance = Math.sqrt(
                Math.pow(object.position.x - this.homeArea.center.x, 2) +
                Math.pow(object.position.z - this.homeArea.center.z, 2)
            );
            
            return distance <= this.homeArea.radius;
        }
        
        /**
         * Get the file category for an object based on its extension
         */
        getFileCategory(object) {
            if (!object || !object.userData) {
                return 'other';
            }
            
            // CONTACT OBJECT FIX: Check for contact objects first
            if (object.userData.subType === 'contact' || 
                object.userData.isContact ||
                (object.userData.id && object.userData.id.startsWith('contact://'))) {
                return 'contacts';  // Create a contacts category
            }
            
            // Check object ID for link patterns first (more specific)
            const objectId = object.userData.id || object.userData.objectId || '';
            if (objectId.includes('com.link.') || objectId.includes('link://')) {
                return 'links';
            }
            
            // Check for link objects by type and properties
            if (object.userData.objectType === 'link' || 
                object.userData.type === 'link' ||
                object.userData.isLink ||
                object.userData.isWebLink) {
                return 'links';
            }
            
            // Check object ID for app patterns
            if (objectId.includes('app://') || objectId.includes('.app.')) {
                return 'apps';
            }
            
            // Check for app objects (by type, not extension)
            if (object.userData.objectType === 'app' || 
                object.userData.type === 'app' ||
                object.userData.isApp) {
                return 'apps';
            }
            
            // For file objects, check by extension
            if (!object.userData.fileData) {
                return 'other';
            }
            
            const fileName = object.userData.fileData.name || object.userData.fileName || '';
            const extension = fileName.split('.').pop()?.toLowerCase() || '';
            
            // Find matching category
            for (const [category, config] of Object.entries(this.fileCategories)) {
                if (config.extensions.includes(extension)) {
                    return category;
                }
            }
            
            return 'other'; // Default fallback
        }
        
        /**
         * Get file category based on filename or extension string
         * @param {string} filename - File name or extension
         * @returns {string} File category
         */
        getFileCategoryFromString(filename) {
            if (!filename) return 'other';
            
            const extension = filename.toLowerCase().split('.').pop() || '';
            
            // Find matching category
            for (const [category, config] of Object.entries(this.fileCategories)) {
                if (config.extensions.includes(extension)) {
                    return category;
                }
            }
            
            return 'other'; // Default fallback
        }
        
        /**
         * Update world template reference when switching worlds
         */
        setWorldTemplate(worldTemplate) {
            console.log(`SortingManager: Updating world template from ${this.worldTemplate ? this.worldTemplate.getType() : 'none'} to ${worldTemplate.getType()}`);
            this.worldTemplate = worldTemplate;
            
            // Update stacking engine world template reference
            if (this.stackingEngine) {
                this.stackingEngine.worldTemplate = worldTemplate;
            }
            
            // Recreate Home Area visual for the new world type
            this.createHomeAreaVisual();
            
            // Reinitialize zones for new world
            this.initializeSortingZones();
            
            console.log(`SortingManager: World template updated successfully to: ${this.worldTemplate.getType()}`);
        }
        
        /**
         * Clean up sorting system resources
         */
        dispose() {
            console.log('Disposing SortingManager...');
            
            // Remove Home Area visual indicator
            if (this.homeArea.visualIndicator) {
                this.scene.remove(this.homeArea.visualIndicator);
                this.homeArea.visualIndicator = null;
            }
            
            // Remove zone visual indicators
            this.removeZoneVisualIndicators();
            
            // Remove search pedestals
            this.removeSearchPedestals();
            
            // Clear zones
            this.sortingZones.clear();
            
            // Reset initialization flag
            this.isInitialized = false;
            
            console.log('SortingManager disposed');
        }
        
        /**
         * Get current sorting configuration
         */
        getConfig() {
            return { ...this.config };
        }
        
        /**
         * Update sorting configuration
         */
        updateConfig(newConfig) {
            console.log('Updating sorting configuration:', newConfig);
            this.config = { ...this.config, ...newConfig };
            
            // Handle enabled state changes properly
            if (newConfig.hasOwnProperty('enabled')) {
                if (newConfig.enabled) {
                    // If being enabled, ensure sorting system is initialized
                    if (!this.isInitialized) {
                        this.initialize();
                    } else {
                        // Already initialized, just show zones and sort objects
                        this.createZoneVisualIndicators();
                        this.sortObjectsIntoZones();
                    }
                } else {
                    // If being disabled, just hide zones but keep system intact
                    console.log('SortingManager: Disabling sorting - hiding zones only');
                    this.removeZoneVisualIndicators();
                    // Don't dispose - keep the system ready for re-enabling
                }
            }
        }
        
        /**
         * Get debug information about current state
         */
        getDebugInfo() {
            return {
                config: this.config,
                homeArea: {
                    center: this.homeArea.center,
                    radius: this.homeArea.radius,
                    hasVisual: !!this.homeArea.visualIndicator
                },
                zones: Array.from(this.sortingZones.entries()).map(([category, zone]) => ({
                    category,
                    center: zone.center,
                    size: zone.size,
                    worldType: zone.worldType
                })),
                worldType: this.worldTemplate ? this.worldTemplate.getType() : 'none'
            };
        }
        
        // ============================================================================
        // PHASE 2: OBJECT MOVEMENT & ZONE VISUALIZATION
        // ============================================================================
        
        /**
         * Create visual indicators for all sorting zones
         */
        createZoneVisualIndicators() {
            console.log('Creating zone visual indicators...');
            
            // Remove existing zone indicators
            this.removeZoneVisualIndicators();
            
            // Create indicators for each zone
            this.sortingZones.forEach((zone, category) => {
                this.createSingleZoneIndicator(zone, category);
            });
            
            console.log(`Created ${this.sortingZones.size} zone visual indicators`);
        }
        
        /**
         * Create visual indicator for a single zone
         */
        createSingleZoneIndicator(zone, category) {
            const worldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
            
            // All zone indicators at same level as Home Area for consistency
            const yPosition = 0.02; // Slightly above ground for all worlds
            
            // Create zone boundary circle
            const zoneRadius = zone.size / 2;
            const circleGeometry = new this.THREE.RingGeometry(
                zoneRadius - 1, // Inner radius 
                zoneRadius, // Outer radius
                32 // Segments for smooth circle
            );
            
            const circleMaterial = new this.THREE.MeshBasicMaterial({
                color: zone.color || this.fileCategories[category]?.color || 0x888888,
                opacity: 0.3,
                transparent: true,
                side: this.THREE.DoubleSide
            });
            
            const zoneIndicator = new this.THREE.Mesh(circleGeometry, circleMaterial);
            zoneIndicator.rotation.x = -Math.PI / 2; // Lay flat on XZ plane
            zoneIndicator.position.set(zone.center.x, yPosition, zone.center.z);
            
            // Mark as template object
            zoneIndicator.userData.templateObject = true;
            zoneIndicator.userData.isZoneIndicator = true;
            zoneIndicator.userData.zoneCategory = category;
            
            // Store reference for cleanup
            zone.visualIndicator = zoneIndicator;
            
            this.scene.add(zoneIndicator);
            
            // Add text label creation
            this.createZoneTextLabel(zone, category);
            
            console.log(`Created zone indicator with label for ${category} at (${zone.center.x}, ${yPosition}, ${zone.center.z})`);
        }
        
        /**
         * Create painted ground text label for a zone (like helicopter landing pad markings)
         */
        createZoneTextLabel(zone, category) {
            const worldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
            
            // Define label abbreviations for each category
            const labelTexts = {
                'images': 'IMAGES',
                'videos': 'VIDEO', 
                'music': 'MUSIC',
                'documents': 'DOCS',
                'contacts': 'CONTACTS',
                'links': 'LINKS',
                'apps': 'APPS'
            };
            
            const labelText = labelTexts[category] || category.toUpperCase();
            
            console.log(`Creating ground text label "${labelText}" for ${category} zone`);
            
            // Create canvas for text texture
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set canvas size for crisp text - square for better scaling
            canvas.width = 1024;
            canvas.height = 1024;
            
            // Clear canvas with transparent background
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Configure text style for ground markings - 50% larger font
            context.fillStyle = '#f0f0f0'; // Light gray/white
            context.font = 'bold 210px Arial, sans-serif'; // 50% larger than 140px
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            // Add subtle outline for better visibility
            context.strokeStyle = '#cccccc';
            context.lineWidth = 6; // Proportionally larger stroke
            context.strokeText(labelText, canvas.width / 2, canvas.height / 2);
            
            // Draw filled text
            context.fillText(labelText, canvas.width / 2, canvas.height / 2);
            
            // Create texture from canvas
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.flipY = false; // Important for ground placement
            
            // Create material for ground text
            const textMaterial = new this.THREE.MeshBasicMaterial({ 
                map: texture,
                transparent: true,
                opacity: 0.8,
                alphaTest: 0.1,
                side: this.THREE.DoubleSide // Visible from both sides
            });
            
            // Create plane geometry for ground text - larger to accommodate bigger text
            const textGeometry = new this.THREE.PlaneGeometry(28, 28); // Slightly larger for bigger text
            const textMesh = new this.THREE.Mesh(textGeometry, textMaterial);
            
            // All text labels at same level as Home Area for consistency
            const yPosition = 0.1; // Just above ground level for all worlds
            
            textMesh.position.set(
                zone.center.x,  // Center X
                yPosition,      // Ground level
                zone.center.z   // Center Z
            );
            
            // Fix text orientation - rotate to lay flat and face upward for aerial view
            textMesh.rotation.x = -Math.PI / 2 + Math.PI; // Lay flat on ground + flip 180 degrees
            textMesh.rotation.y = 0;                       // No Y rotation - keep text facing correct direction
            
            // Mark as template object
            textMesh.userData.templateObject = true;
            textMesh.userData.isZoneLabel = true;
            textMesh.userData.zoneCategory = category;
            
            // Store reference
            zone.textLabel = textMesh;
            
            this.scene.add(textMesh);
            console.log(`Created ground text label "${labelText}" for ${category} zone at position (${textMesh.position.x.toFixed(1)}, ${textMesh.position.y.toFixed(1)}, ${textMesh.position.z.toFixed(1)})`);
        }

        /**
         * Remove all zone visual indicators
         */
        removeZoneVisualIndicators() {
            this.sortingZones.forEach((zone) => {
                // Remove circle indicator
                if (zone.visualIndicator) {
                    this.scene.remove(zone.visualIndicator);
                    zone.visualIndicator = null;
                }
                
                // Remove text label
                if (zone.textLabel) {
                    this.scene.remove(zone.textLabel);
                    zone.textLabel = null;
                }
            });
        }
        
        /**
         * Sort all objects outside the Home Area into their appropriate zones
         */
        sortObjectsIntoZones() {
            console.log('=== SORTING OBJECTS INTO ZONES ===');
            
            if (!this.config.enabled) {
                console.log('Sorting is disabled');
                return;
            }
            
            if (!this.stateManager.fileObjects || this.stateManager.fileObjects.length === 0) {
                console.log('No objects to sort');
                return;
            }
            
            const objectsToSort = [];
            const objectsInHomeArea = [];
            
            // Categorize objects
            this.stateManager.fileObjects.forEach(object => {
                // Skip objects with preserved positions (manually placed by user)
                if (object.userData && object.userData.preservePosition) {
                    // Reduced logging - see summary count at end of sorting
                    // console.log('⏭️ POSITION PERSISTENCE: Excluding positioned object from sorting:', object.userData.fileName || object.userData.id);
                    return; // Skip this object entirely
                }
                
                // Standard logic for all objects (including contacts)
                if (this.isInHomeArea(object)) {
                    objectsInHomeArea.push(object);
                } else {
                    objectsToSort.push(object);
                }
            });
            
            console.log(`Objects in Home Area: ${objectsInHomeArea.length} (protected from sorting)`);
            console.log(`Objects to sort: ${objectsToSort.length}`);
            
            if (objectsToSort.length === 0) {
                console.log('No objects outside Home Area to sort');
                return;
            }
            
            // Group objects by category
            const categorizedObjects = this.categorizeObjects(objectsToSort);
            
            // Move objects to their zones
            this.moveObjectsToZones(categorizedObjects);
            
            console.log('=== OBJECT SORTING COMPLETE ===');
        }
        
        /**
         * Categorize objects by file type
         */
        categorizeObjects(objects) {
            const categorized = {};
            
            // Initialize categories
            Object.keys(this.fileCategories).forEach(category => {
                categorized[category] = [];
            });
            
            objects.forEach(object => {
                const category = this.getFileCategory(object);
                
                // Ensure the category exists, fallback to 'other' if not
                if (!categorized[category]) {
                    console.warn(`Unknown category '${category}' for object, using 'other'`);
                    categorized['other'].push(object);
                } else {
                    categorized[category].push(object);
                }
            });
            
            // Log categorization results
            Object.keys(categorized).forEach(category => {
                if (categorized[category].length > 0) {
                    console.log(`${category}: ${categorized[category].length} objects`);
                }
            });
            
            return categorized;
        }
        
        /**
         * Move categorized objects to their respective zones
         */
        moveObjectsToZones(categorizedObjects) {
            Object.keys(categorizedObjects).forEach(category => {
                const objects = categorizedObjects[category];
                if (objects.length === 0) return;
                
                const zone = this.sortingZones.get(category);
                if (!zone) {
                    console.warn(`No zone found for category: ${category}`);
                    return;
                }
                
                console.log(`Moving ${objects.length} objects to ${category} zone`);
                this.arrangeObjectsInZone(objects, zone, category);
            });
        }
        
        /**
         * Arrange objects within a zone - uses stacking if enabled, otherwise grid
         */
        arrangeObjectsInZone(objects, zone, category) {
            // Delegate to stacking engine first
            const stackingApplied = this.stackingEngine.applyStackingToZone(objects, zone, category);
            
            if (stackingApplied) {
                console.log(`📊 Stacking applied for ${objects.length} objects in ${category} zone`);
                return; // Stacking was successful, we're done
            }

            // Fallback to grid arrangement when stacking is disabled or failed
            console.log(`📊 Arranging ${objects.length} objects in grid pattern (stacking disabled)`);
            
            // PRIORITY 1 FIX: Increased minimum grid spacing to prevent overlap
            // Base spacing increased from 4 to 7 units for better object separation
            const baseGridSpacing = this.stateManager.gridSize || 7;
            
            // Calculate dynamic spacing based on object sizes to prevent overlap
            const dynamicSpacing = this.calculateDynamicSpacing(objects, baseGridSpacing);
            
            const objectsPerRow = Math.ceil(Math.sqrt(objects.length));
            
            // Track used positions to prevent overlap
            const usedPositions = [];
            
            objects.forEach((object, index) => {
                const row = Math.floor(index / objectsPerRow);
                const col = index % objectsPerRow;
                
                // Calculate position within zone with improved spacing
                let offsetX = (col - (objectsPerRow - 1) / 2) * dynamicSpacing;
                let offsetZ = (row - (Math.ceil(objects.length / objectsPerRow) - 1) / 2) * dynamicSpacing;
                
                // Add slight randomization to prevent perfect alignment and improve visual appeal
                const randomOffset = 0.3; // Small random offset for natural positioning
                offsetX += (Math.random() - 0.5) * randomOffset;
                offsetZ += (Math.random() - 0.5) * randomOffset;
                
                let candidatePosition = {
                    x: zone.center.x + offsetX,
                    y: this.calculateObjectYPosition(zone, object),
                    z: zone.center.z + offsetZ
                };
                
                // Ensure minimum distance from other objects to prevent overlap
                candidatePosition = this.ensureMinimumDistance(candidatePosition, usedPositions, object);
                usedPositions.push({x: candidatePosition.x, z: candidatePosition.z});
                
                // Log positioning for debugging
                console.log(`Positioning ${object.userData.fileName || 'object'} at (${candidatePosition.x.toFixed(2)}, ${candidatePosition.y.toFixed(2)}, ${candidatePosition.z.toFixed(2)}) with spacing: ${dynamicSpacing}`);
                
                // Animate object to new position if enabled
                if (this.config.animateTransitions) {
                    this.animateObjectToPosition(object, candidatePosition);
                } else {
                    this.moveObjectToPosition(object, candidatePosition);
                }
            });
        }
        
        /**
         * Calculate appropriate Y position for object in zone
         */
        calculateObjectYPosition(zone, object) {
            const worldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
            
            console.log(`🎯 calculateObjectYPosition: worldType=${worldType}, object=${object.userData.fileName || 'unknown'}`);
            
            if (worldType === 'green-plane') {
                // For green plane, bottom should be at Y=0, so center is at height/2
                const objectHeight = object.userData.fileData?.height || 
                                   object.userData.objectHeight ||  // Contact objects use this field
                                   (object.geometry?.parameters?.height) ||  // Box/cylinder geometry
                                   (object.geometry?.boundingBox ? 
                                    object.geometry.boundingBox.max.y - object.geometry.boundingBox.min.y : 
                                    2.5); // Default contact height (matches contact object standard)
                
                const groundY = objectHeight / 2; // Center position for object sitting on ground
                console.log(`🎯 Green plane Y calculation: height=${objectHeight}, groundY=${groundY}`);
                return groundY;
            } else if (worldType === 'ocean') {
                // Use zone's Y level, but ensure object is positioned properly
                console.log(`🎯 Ocean Y calculation: zone.center.y=${zone.center.y}`);
                return zone.center.y;
            } else if (worldType === 'space') {
                // Use zone's Y level for floating in space
                console.log(`🎯 Space Y calculation: zone.center.y=${zone.center.y}`);
                return zone.center.y;
            }
            
            console.log(`🎯 Fallback Y calculation: zone.center.y=${zone.center.y}`);
            return zone.center.y;
        }
        
        /**
         * Animate object to target position
         */
        animateObjectToPosition(object, targetPosition, skipWorldConstraints = false) {
            if (!object || !targetPosition) return;
            
            const startPosition = {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z
            };
            
            const duration = 1000; // 1 second animation
            const startTime = Date.now();
            
            const animateStep = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function (ease-out)
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                // Interpolate position
                object.position.x = startPosition.x + (targetPosition.x - startPosition.x) * easedProgress;
                object.position.y = startPosition.y + (targetPosition.y - startPosition.y) * easedProgress;
                object.position.z = startPosition.z + (targetPosition.z - startPosition.z) * easedProgress;
                
                // Update object's file data
                if (object.userData.fileData) {
                    object.userData.fileData.x = object.position.x;
                    object.userData.fileData.y = object.position.y;
                    object.userData.fileData.z = object.position.z;
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animateStep);
                } else {
                    // Ensure final position is exact
                    this.moveObjectToPosition(object, targetPosition, skipWorldConstraints);
                    console.log(`Animation complete for ${object.userData.fileName || 'object'}`);
                }
            };
            
            animateStep();
        }
        
        /**
         * Move object to position immediately (no animation)
         */
        moveObjectToPosition(object, position, skipWorldConstraints = false) {
            if (!object || !position) return;
            
            // POSITION PERSISTENCE FIX: Skip contacts that should preserve their position
            if (object.userData && (
                object.userData.subType === 'contact' ||
                object.userData.isContact ||
                object.userData.preservePosition ||
                (object.userData.id && object.userData.id.startsWith('contact://'))
            )) {
                console.log('⏭️ POSITION PERSISTENCE: Skipping auto-sort for positioned contact:', object.userData.fileName || object.userData.id);
                return; // Don't auto-sort this object
            }
            
            object.position.set(position.x, position.y, position.z);
            
            // Update object's file data
            if (object.userData.fileData) {
                object.userData.fileData.x = position.x;
                object.userData.fileData.y = position.y;
                object.userData.fileData.z = position.z;
            }
            
            // Apply world constraints if needed and not explicitly skipped
            // CRITICAL FIX: Skip world constraints when positioning objects in stacks
            // because stack positioning already handles proper Y calculation per world
            if (this.worldTemplate && !skipWorldConstraints) {
                const constrainedPosition = this.worldTemplate.applyPositionConstraints(
                    object,
                    object.position,
                    this.stateManager.fileObjects
                );
                object.position.set(constrainedPosition.x, constrainedPosition.y, constrainedPosition.z);
                
                // Update file data again after constraints
                if (object.userData.fileData) {
                    object.userData.fileData.x = constrainedPosition.x;
                    object.userData.fileData.y = constrainedPosition.y;
                    object.userData.fileData.z = constrainedPosition.z;
                }
            }
            
            // Update SMS screen position if this is a contact object
            this.updateContactSMSScreenPosition(object);
        }
        
        /**
         * Update SMS screen position for contact objects when they move
         */
        updateContactSMSScreenPosition(object) {
            console.log('🔧 sortingManager.updateContactSMSScreenPosition called for:', object?.userData?.fileName || 'unknown object');
            
            // Check if this is a contact object
            if (!object || !object.userData) {
                console.log('🔧 No object or userData, skipping SMS update');
                return;
            }
            
            const isContact = object.userData.subType === 'contact' || 
                             object.userData.isContact ||
                             (object.userData.id && object.userData.id.startsWith('contact://'));
            
            console.log('🔧 Contact check result in sortingManager:', {
                isContact,
                subType: object.userData.subType,
                isContactFlag: object.userData.isContact,
                id: object.userData.id,
                hasContactObject: !!object.userData.contactObject,
                hasUpdateMethod: !!(object.userData.contactObject && object.userData.contactObject.updateSMSScreenPosition)
            });
            
            if (isContact && object.userData.contactObject && object.userData.contactObject.updateSMSScreenPosition) {
                console.log('📱 Calling updateSMSScreenPosition for contact:', object.userData.fileName);
                object.userData.contactObject.updateSMSScreenPosition();
                console.log(`📱 Updated SMS screen position for contact: ${object.userData.fileName || object.userData.id}`);
            } else if (isContact) {
                console.log('⚠️ Contact object found but no updateSMSScreenPosition method available:', object.userData.fileName);
            }
        }
        
        /**
         * Toggle zone visual indicators on/off
         */
        toggleZoneIndicators() {
            const anyVisible = Array.from(this.sortingZones.values()).some(zone => 
                zone.visualIndicator && zone.visualIndicator.visible
            );
            
            this.sortingZones.forEach((zone) => {
                if (zone.visualIndicator) {
                    zone.visualIndicator.visible = !anyVisible;
                }
            });
            
            console.log(`Zone indicators ${anyVisible ? 'hidden' : 'shown'}`);
            return !anyVisible;
        }
        
        /**
         * Get zone for a specific category
         */
        getZoneForCategory(category) {
            return this.sortingZones.get(category);
        }
        
        /**
         * Get all objects in a specific zone
         */
        getObjectsInZone(category) {
            const zone = this.sortingZones.get(category);
            if (!zone) return [];
            
            return this.stateManager.fileObjects.filter(object => {
                if (this.isInHomeArea(object)) return false;
                
                const distance = Math.sqrt(
                    Math.pow(object.position.x - zone.center.x, 2) +
                    Math.pow(object.position.z - zone.center.z, 2)
                );
                
                return distance <= zone.size / 2;
            });
        }
        
        /**
         * Calculate dynamic spacing based on object sizes to prevent overlap
         */
        calculateDynamicSpacing(objects, baseSpacing) {
            if (!objects || objects.length === 0) return baseSpacing;
            
            // Calculate average object size for better spacing
            let totalSize = 0;
            let validObjects = 0;
            
            objects.forEach(object => {
                const width = object.userData.fileData?.width || 
                             (object.geometry?.boundingBox ? 
                              object.geometry.boundingBox.max.x - object.geometry.boundingBox.min.x : 
                              2.0);
                const depth = object.userData.fileData?.depth || 
                             (object.geometry?.boundingBox ? 
                              object.geometry.boundingBox.max.z - object.geometry.boundingBox.min.z : 
                              2.0);
                
                // Use the larger dimension for spacing calculation
                const objectSize = Math.max(width, depth);
                totalSize += objectSize;
                validObjects++;
            });
            
            if (validObjects === 0) return baseSpacing;
            
            const averageObjectSize = totalSize / validObjects;
            
            // Dynamic spacing should be at least the average object size + minimum clearance
            const minClearance = 1.5; // Minimum space between objects
            const calculatedSpacing = averageObjectSize + minClearance;
            
            // Use the larger of base spacing or calculated spacing
            const finalSpacing = Math.max(baseSpacing, calculatedSpacing);
            
            console.log(`Dynamic spacing calculated: baseSpacing=${baseSpacing}, averageObjectSize=${averageObjectSize.toFixed(2)}, finalSpacing=${finalSpacing.toFixed(2)}`);
            
            return finalSpacing;
        }
        
        /**
         * Ensure minimum distance between objects to prevent overlap
         */
        ensureMinimumDistance(candidatePosition, usedPositions, object) {
            const minDistance = 3.0; // Minimum distance between object centers
            let finalPosition = { ...candidatePosition };
            let attempts = 0;
            const maxAttempts = 20;
            
            while (attempts < maxAttempts) {
                let tooClose = false;
                
                for (const usedPos of usedPositions) {
                    const distance = Math.sqrt(
                        Math.pow(finalPosition.x - usedPos.x, 2) + 
                        Math.pow(finalPosition.z - usedPos.z, 2)
                    );
                    
                    if (distance < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                
                if (!tooClose) {
                    break; // Position is valid
                }
                
                // Adjust position by moving in a spiral pattern
                const angle = (attempts * 0.5) * Math.PI; // Spiral outward
                const radius = 1.0 + (attempts * 0.3);
                finalPosition.x = candidatePosition.x + Math.cos(angle) * radius;
                finalPosition.z = candidatePosition.z + Math.sin(angle) * radius;
                
                attempts++;
            }
            
            if (attempts >= maxAttempts) {
                console.warn(`Could not find non-overlapping position for ${object.userData.fileName || 'object'} after ${maxAttempts} attempts`);
            }
            
            return finalPosition;
        }

        // ============================================================================
        // STACKING CONFIGURATION MANAGEMENT
        // ============================================================================

        /**
         * Get the current stacking configuration
         * @returns {Object} Current stacking configuration
         */
        getStackingConfig() {
            console.log('Getting stacking configuration:', this.stackingConfig);
            return { ...this.stackingConfig }; // Return a copy to prevent external modification
        }

        /**
         * Update the stacking configuration
         * @param {Object} newConfig - New configuration to apply
         * @returns {boolean} True if update was successful
         */
        updateStackingConfig(newConfig) {
            try {
                console.log('Updating stacking configuration:', newConfig);
                
                // Validate the configuration before applying
                if (!this.isValidStackingConfig(newConfig)) {
                    console.error('Invalid stacking configuration provided');
                    return false;
                }

                // Merge with existing config, preserving any unspecified values
                this.stackingConfig = {
                    ...this.stackingConfig,
                    ...newConfig
                };

                console.log('Stacking configuration updated successfully:', this.stackingConfig);
                return true;
            } catch (error) {
                console.error('Error updating stacking configuration:', error);
                return false;
            }
        }

        /**
         * Apply the current stacking configuration to objects in the scene
         * @returns {boolean} True if application was successful
         */
        applyStackingConfiguration() {
            try {
                console.log('Applying stacking configuration...');
                
                if (!this.stackingConfig.enabled) {
                    console.log('Stacking is disabled, skipping application');
                    return true;
                }

                // For now, this will trigger a re-sort of objects using the new criteria
                // In future phases, this will handle actual stacking logic
                if (this.config.enabled) {
                    this.sortObjectsIntoZones();
                    console.log('Stacking configuration applied successfully');
                }

                return true;
            } catch (error) {
                console.error('Error applying stacking configuration:', error);
                return false;
            }
        }

        /**
         * Validate stacking configuration object
         * @param {Object} config - Configuration to validate
         * @returns {boolean} True if configuration is valid
         */
        isValidStackingConfig(config) {
            if (!config || typeof config !== 'object') {
                return false;
            }

            const validSortCriteria = ['fileType', 'fileName', 'fileSize', 'dateModified', 'dateCreated', 
                                       'filename8CharPrefix', 'filenameExact', 'filenameNumericAlpha',
                                       'advancedContextual', 'smartImageDate', 'smartAudioMeta', 'smartFilePrefix',
                                       'smartAppPrefix', 'smartLinkSession'];

            // Check primarySort if provided
            if (config.primarySort !== undefined && !validSortCriteria.includes(config.primarySort)) {
                console.error('Invalid primarySort criteria:', config.primarySort);
                return false;
            }

            // Check secondarySort if provided
            if (config.secondarySort !== undefined && !validSortCriteria.includes(config.secondarySort)) {
                console.error('Invalid secondarySort criteria:', config.secondarySort);
                return false;
            }

            // Check stackHeightLimit if provided
            if (config.stackHeightLimit !== undefined) {
                const limit = Number(config.stackHeightLimit);
                if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
                    console.error('Invalid stackHeightLimit, must be integer between 1-20:', config.stackHeightLimit);
                    return false;
                }
            }

            // Check spacingBetweenStacks if provided
            if (config.spacingBetweenStacks !== undefined) {
                const spacing = Number(config.spacingBetweenStacks);
                if (isNaN(spacing) || spacing < 0.5 || spacing > 20) {
                    console.error('Invalid spacingBetweenStacks, must be number between 0.5-20:', config.spacingBetweenStacks);
                    return false;
                }
            }

            // Check boolean flags if provided
            if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
                console.error('Invalid enabled flag, must be boolean:', config.enabled);
                return false;
            }

            if (config.autoApplyOnLoad !== undefined && typeof config.autoApplyOnLoad !== 'boolean') {
                console.error('Invalid autoApplyOnLoad flag, must be boolean:', config.autoApplyOnLoad);
                return false;
            }

            if (config.preserveUserStacks !== undefined && typeof config.preserveUserStacks !== 'boolean') {
                console.error('Invalid preserveUserStacks flag, must be boolean:', config.preserveUserStacks);
                return false;
            }

            return true;
        }

        // ============================================================================
        // PHASE 2: ACTUAL STACKING LOGIC IMPLEMENTATION
        // ============================================================================

        /**
         * Apply stacking to objects within a zone based on stacking configuration
         * @param {Array} objects - Objects to stack
         * @param {Object} zone - Zone information
         * @param {String} category - File category
         */
        applyStackingToZone(objects, zone, category) {
            if (!this.stackingConfig.enabled || objects.length === 0) {
                // If stacking is disabled, fall back to grid arrangement
                return this.arrangeObjectsInZone(objects, zone, category);
            }

            console.log(`🏗️ Applying stacking to ${objects.length} objects in ${category} zone`);
            console.log('Stacking config:', this.stackingConfig);

            // Step 1: Sort objects based on primary and secondary criteria
            const sortedObjects = this.sortObjectsForStacking(objects);

            // Step 2: Group objects into stacks based on criteria and height limits
            const stacks = this.createStackGroups(sortedObjects);

            // Step 3: Position stacks within the zone
            this.positionStacksInZone(stacks, zone, category);

            console.log(`✅ Created ${stacks.length} stacks in ${category} zone`);
        }

        /**
         * Sort objects according to stacking configuration criteria
         * @param {Array} objects - Objects to sort
         * @returns {Array} Sorted objects
         */
        sortObjectsForStacking(objects) {
            const primarySort = this.stackingConfig.primarySort;
            const secondarySort = this.stackingConfig.secondarySort;

            console.log(`Sorting objects by ${primarySort} (primary) and ${secondarySort} (secondary)`);

            return objects.sort((a, b) => {
                // Primary sort comparison
                const primaryComparison = this.compareObjectsByCriteria(a, b, primarySort);
                if (primaryComparison !== 0) {
                    return primaryComparison;
                }

                // If primary criteria are equal, use secondary sort
                return this.compareObjectsByCriteria(a, b, secondarySort);
            });
        }

        /**
         * Compare two objects based on a specific criteria
         * @param {Object} objA - First object
         * @param {Object} objB - Second object
         * @param {String} criteria - Sort criteria
         * @returns {Number} Comparison result (-1, 0, 1)
         */
        compareObjectsByCriteria(objA, objB, criteria) {
            let valueA, valueB;

            switch (criteria) {
                case 'fileType':
                    valueA = this.getFileCategory(objA);
                    valueB = this.getFileCategory(objB);
                    break;

                case 'fileName':
                    valueA = (objA.userData.fileData?.name || objA.userData.fileName || '').toLowerCase();
                    valueB = (objB.userData.fileData?.name || objB.userData.fileName || '').toLowerCase();
                    break;

                case 'fileSize':
                    valueA = objA.userData.fileData?.fileSize || 0;
                    valueB = objB.userData.fileData?.fileSize || 0;
                    break;

                case 'dateModified':
                    valueA = objA.userData.fileData?.lastModified || 0;
                    valueB = objB.userData.fileData?.lastModified || 0;
                    break;

                case 'dateCreated':
                    valueA = objA.userData.fileData?.dateCreated || objA.userData.fileData?.lastModified || 0;
                    valueB = objB.userData.fileData?.dateCreated || objB.userData.fileData?.lastModified || 0;
                    break;

                case 'filename8CharPrefix':
                    if (window.FilenameStackingCriteria) {
                        const criteriaHandler = new window.FilenameStackingCriteria();
                        const criteriaA = criteriaHandler.getFilenameStackingCriteria(objA, 'filename8CharPrefix');
                        const criteriaB = criteriaHandler.getFilenameStackingCriteria(objB, 'filename8CharPrefix');
                        valueA = criteriaA.value;
                        valueB = criteriaB.value;
                    } else {
                        valueA = (objA.userData.fileData?.name || '').substring(0, 8).toLowerCase();
                        valueB = (objB.userData.fileData?.name || '').substring(0, 8).toLowerCase();
                    }
                    break;

                case 'filenameExact':
                    if (window.FilenameStackingCriteria) {
                        const criteriaHandler = new window.FilenameStackingCriteria();
                        const criteriaA = criteriaHandler.getFilenameStackingCriteria(objA, 'filenameExact');
                        const criteriaB = criteriaHandler.getFilenameStackingCriteria(objB, 'filenameExact');
                        valueA = criteriaA.value;
                        valueB = criteriaB.value;
                    } else {
                        valueA = (objA.userData.fileData?.name || '').replace(/\.[^/.]+$/, '').toLowerCase();
                        valueB = (objB.userData.fileData?.name || '').replace(/\.[^/.]+$/, '').toLowerCase();
                    }
                    break;

                case 'filenameNumericAlpha':
                    if (window.FilenameStackingCriteria) {
                        const criteriaHandler = new window.FilenameStackingCriteria();
                        const criteriaA = criteriaHandler.getFilenameStackingCriteria(objA, 'filenameNumericAlpha');
                        const criteriaB = criteriaHandler.getFilenameStackingCriteria(objB, 'filenameNumericAlpha');
                        valueA = criteriaA.sortValue;
                        valueB = criteriaB.sortValue;
                    } else {
                        valueA = (objA.userData.fileData?.name || '').toLowerCase();
                        valueB = (objB.userData.fileData?.name || '').toLowerCase();
                    }
                    break;

                case 'advancedContextual':
                case 'smartImageDate':
                case 'smartAudioMeta':
                case 'smartFilePrefix':
                case 'smartAppPrefix':
                case 'smartLinkSession':
                    if (window.AdvancedStackingCriteria) {
                        const advancedHandler = new window.AdvancedStackingCriteria();
                        const criteriaA = advancedHandler.getAdvancedStackingCriteria(objA, objB, criteria);
                        const criteriaB = advancedHandler.getAdvancedStackingCriteria(objB, objA, criteria);
                        valueA = criteriaA.sortValue || criteriaA.value || 0;
                        valueB = criteriaB.sortValue || criteriaB.value || 0;
                    } else {
                        // Fallback to filename if advanced criteria not available
                        valueA = (objA.userData.fileData?.name || '').toLowerCase();
                        valueB = (objB.userData.fileData?.name || '').toLowerCase();
                    }
                    break;

                default:
                    return 0;
            }

            // Perform comparison
            if (valueA < valueB) return -1;
            if (valueA > valueB) return 1;
            return 0;
        }

        /**
         * Create stack groups from sorted objects based on configuration
         * @param {Array} sortedObjects - Pre-sorted objects
         * @returns {Array} Array of stack groups
         */
        createStackGroups(sortedObjects) {
            const stacks = [];
            const maxStackHeight = this.stackingConfig.stackHeightLimit;
            
            let currentStack = [];
            let currentStackCriteria = null;

            for (const object of sortedObjects) {
                const objectCriteria = this.getObjectStackingCriteria(object);
                
                // Check if we should start a new stack
                const shouldStartNewStack = 
                    currentStack.length === 0 || // First object
                    currentStack.length >= maxStackHeight || // Stack height limit reached
                    !this.shouldObjectsBeInSameStack(currentStackCriteria, objectCriteria); // Different criteria

                if (shouldStartNewStack) {
                    // Save previous stack if it exists
                    if (currentStack.length > 0) {
                        stacks.push({
                            objects: [...currentStack],
                            criteria: currentStackCriteria,
                            height: currentStack.length
                        });
                    }
                    
                    // Start new stack
                    currentStack = [object];
                    currentStackCriteria = objectCriteria;
                } else {
                    // Add to current stack
                    currentStack.push(object);
                }
            }

            // Don't forget the last stack
            if (currentStack.length > 0) {
                stacks.push({
                    objects: [...currentStack],
                    criteria: currentStackCriteria,
                    height: currentStack.length
                });
            }

            console.log(`Created ${stacks.length} stacks:`, stacks.map(s => `${s.height} objects`));
            return stacks;
        }

        /**
         * Get stacking criteria for an object (used for grouping)
         * @param {Object} object - Object to analyze
         * @returns {Object} Criteria object
         */
        getObjectStackingCriteria(object) {
            const primarySort = this.stackingConfig.primarySort;
            
            // For now, we'll group by primary sort criteria only
            // This can be expanded to include multiple criteria in the future
            switch (primarySort) {
                case 'fileType':
                    return { fileType: this.getFileCategory(object) };
                
                case 'fileName':
                    // Group by first letter for alphabetical stacking
                    const name = (object.userData.fileData?.name || '').toLowerCase();
                    return { firstLetter: name.charAt(0) };
                
                case 'fileSize':
                    // Group by size ranges
                    const size = object.userData.fileData?.fileSize || 0;
                    return { sizeRange: this.getFileSizeRange(size) };
                
                case 'dateModified':
                case 'dateCreated':
                    // Group by date ranges (same day, week, etc.)
                    const date = object.userData.fileData?.lastModified || 0;
                    return { dateRange: this.getDateRange(date) };
                
                default:
                    return { default: true };
            }
        }

        /**
         * Determine if two objects should be in the same stack
         * @param {Object} criteriaA - First object's criteria
         * @param {Object} criteriaB - Second object's criteria
         * @returns {Boolean} True if they should be stacked together
         */
        shouldObjectsBeInSameStack(criteriaA, criteriaB) {
            if (!criteriaA || !criteriaB) return false;
            
            // Deep comparison of criteria objects
            return JSON.stringify(criteriaA) === JSON.stringify(criteriaB);
        }

        /**
         * Get file size range for grouping
         * @param {Number} sizeInBytes - File size in bytes
         * @returns {String} Size range category
         */
        getFileSizeRange(sizeInBytes) {
            if (sizeInBytes < 1024) return 'tiny'; // < 1KB
            if (sizeInBytes < 1024 * 1024) return 'small'; // < 1MB
            if (sizeInBytes < 10 * 1024 * 1024) return 'medium'; // < 10MB
            if (sizeInBytes < 100 * 1024 * 1024) return 'large'; // < 100MB
            return 'huge'; // >= 100MB
        }

        /**
         * Get date range for grouping
         * @param {Number} timestamp - Date timestamp
         * @returns {String} Date range category
         */
        getDateRange(timestamp) {
            if (!timestamp) return 'unknown';
            
            const date = new Date(timestamp);
            const now = new Date();
            const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 0) return 'today';
            if (daysDiff === 1) return 'yesterday';
            if (daysDiff <= 7) return 'thisWeek';
            if (daysDiff <= 30) return 'thisMonth';
            if (daysDiff <= 365) return 'thisYear';
            return 'older';
        }

        /**
         * Position stacks within a zone with proper spacing
         * @param {Array} stacks - Array of stack objects
         * @param {Object} zone - Zone information
         * @param {String} category - File category
         */
        positionStacksInZone(stacks, zone, category) {
            if (stacks.length === 0) return;

            const spacing = this.stackingConfig.spacingBetweenStacks;
            const stacksPerRow = Math.ceil(Math.sqrt(stacks.length));
            
            // Track used positions to prevent overlap
            const usedPositions = [];

            stacks.forEach((stack, stackIndex) => {
                const row = Math.floor(stackIndex / stacksPerRow);
                const col = stackIndex % stacksPerRow;

                // Calculate base position for this stack
                const offsetX = (col - (stacksPerRow - 1) / 2) * spacing;
                const offsetZ = (row - (Math.ceil(stacks.length / stacksPerRow) - 1) / 2) * spacing;

                const basePosition = {
                    x: zone.center.x + offsetX,
                    z: zone.center.z + offsetZ
                };

                // Ensure minimum distance from other stacks
                const finalBasePosition = this.ensureMinimumDistance(
                    basePosition, 
                    usedPositions, 
                    { userData: { fileName: `stack-${stackIndex}` } }
                );
                
                usedPositions.push({ x: finalBasePosition.x, z: finalBasePosition.z });

                // Position objects within the stack
                this.positionObjectsInStack(stack, finalBasePosition, zone);

                console.log(`Positioned stack ${stackIndex + 1}/${stacks.length} with ${stack.height} objects at (${finalBasePosition.x.toFixed(2)}, ${finalBasePosition.z.toFixed(2)})`);
            });
        }

        /**
         * Position individual objects within a stack (vertical arrangement)
         * @param {Object} stack - Stack object containing objects and metadata
         * @param {Object} basePosition - Base position for the stack
         * @param {Object} zone - Zone information
         */
        positionObjectsInStack(stack, basePosition, zone) {
            const worldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
            
            // Start Y positioning - for green-plane, ensure bottom object sits on ground
            let currentY;
            if (worldType === 'green-plane') {
                // First object should have bottom at Y=0, just like any new object in green-plane
                // So if center is at height/2, and we calculate objectY = currentY + (height/2)
                // We want objectY = height/2, so currentY = 0
                currentY = 0;
            } else {
                currentY = this.calculateStackBaseY(zone, stack.objects[0]);
            }

            stack.objects.forEach((object, index) => {
                // Calculate Y position for this object in the stack
                const objectHeight = this.getObjectHeight(object);
                
                // For green-plane, this ensures the first object's bottom is at Y=0
                // and subsequent objects stack properly on top
                const objectY = currentY + (objectHeight / 2); // Center the object at this Y level

                const position = {
                    x: basePosition.x,
                    y: objectY,
                    z: basePosition.z
                };

                // Add slight random offset to prevent perfect alignment
                const randomOffset = 0.1;
                position.x += (Math.random() - 0.5) * randomOffset;
                position.z += (Math.random() - 0.5) * randomOffset;

                // Animate or move object to position
                // CRITICAL FIX: Skip world constraints when positioning in stacks
                // because we've already calculated proper Y based on world type
                if (this.config.animateTransitions) {
                    this.animateObjectToPosition(object, position, true); // Skip world constraints
                } else {
                    this.moveObjectToPosition(object, position, true); // Skip world constraints
                }

                // Prepare Y position for next object (top of current object)
                currentY += objectHeight; // Objects are flush - no gap between stacked objects

                console.log(`  Stacked object ${index + 1}/${stack.height}: ${object.userData.fileName || 'object'} at Y=${objectY.toFixed(2)}`);
            });
        }

        /**
         * Calculate the base Y position for a stack
         * @param {Object} zone - Zone information
         * @param {Object} firstObject - First object in the stack (for reference)
         * @returns {Number} Base Y position
         */
        calculateStackBaseY(zone, firstObject) {
            const worldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
            
            console.log(`Calculating stack base Y for ${worldType} world, zone center Y: ${zone.center.y}`);
            
            if (worldType === 'green-plane') {
                // GREEN PLANE: Objects sit on ground (Y=0), so bottom object center should be at height/2
                // Since objectY = currentY + (objectHeight/2), and we want objectY = height/2,
                // we need: currentY = height/2 - height/2 = 0
                return 0;
            } else if (worldType === 'ocean') {
                // OCEAN: Bottom object should sit on seafloor like green-plane
                // Bottom object center should be at height/2 above seafloor (Y=0)
                // Since objectY = currentY + (objectHeight/2), and we want objectY = height/2,
                // we need: currentY = height/2 - height/2 = 0
                console.log('Ocean: Bottom object will sit on seafloor, stacking upward from Y=0');
                return 0;
            } else if (worldType === 'space') {
                // SPACE: Objects float at origin level (center at Y=0)
                // Since objectY = currentY + (objectHeight/2), and we want objectY = 0,
                // we need: currentY = 0 - (objectHeight/2)
                const firstObjectHeight = this.getObjectHeight(firstObject);
                console.log(`Space: First object center at Y=0, currentY = ${0 - (firstObjectHeight / 2)}`);
                return 0 - (firstObjectHeight / 2);
            }
            
            // Fallback to zone center
            return zone.center.y;
        }

        /**
         * Get the height of an object for stacking calculations
         * @param {Object} object - Three.js object
         * @returns {Number} Object height
         */
        getObjectHeight(object) {
            // PRIORITY 1: Check userData.objectHeight first (for contact and link objects)
            if (object.userData && object.userData.objectHeight !== undefined) {
                return object.userData.objectHeight;
            }
            
            // PRIORITY 2: For cylinder geometries, get height from geometry parameters
            if (object.geometry?.parameters?.height) {
                return object.geometry.parameters.height;
            }

            // PRIORITY 3: Calculate from bounding box if available
            if (object.geometry?.boundingBox) {
                // Ensure bounding box is computed
                if (!object.geometry.boundingBox) {
                    object.geometry.computeBoundingBox();
                }
                if (object.geometry.boundingBox) {
                    return object.geometry.boundingBox.max.y - object.geometry.boundingBox.min.y;
                }
            }

            // PRIORITY 4: Try to get height from userData.fileData as fallback
            if (object.userData.fileData?.height) {
                return object.userData.fileData.height;
            }

            // Default height
            return 2.0;
        }

        /**
         * Check if an object is part of a user-created stack
         * @param {Object} object - Object to check
         * @returns {Boolean} True if part of user stack
         */
        isPartOfUserStack(object) {
            // This would check if the object was manually stacked by the user
            // For now, we'll use a simple heuristic based on position
            return object.userData.userStacked === true;
        }

        // ============================================================================
        // STACKING CONFIGURATION DELEGATION TO STACKING ENGINE
        // ============================================================================

        /**
         * Get the current stacking configuration (delegates to StackingEngine)
         * @returns {Object} Current stacking configuration
         */
        getStackingConfig() {
            return this.stackingEngine.getStackingConfig();
        }

        /**
         * Update the stacking configuration (delegates to StackingEngine)
         * @param {Object} newConfig - New configuration to apply
         * @returns {boolean} True if update was successful
         */
        updateStackingConfig(newConfig) {
            return this.stackingEngine.updateStackingConfig(newConfig);
        }

        /**
         * Apply the current stacking configuration (delegates to StackingEngine and triggers re-sort)
         * @returns {boolean} True if application was successful
         */
        applyStackingConfiguration() {
            const success = this.stackingEngine.applyStackingConfiguration();
            if (success && this.config.enabled) {
                // Trigger re-sorting with the new stacking configuration
                this.sortObjectsIntoZones();
            }
            return success;
        }

        /**
         * Initialize search area for organizing search results
         */
        initializeSearchArea() {
            console.log('Initializing search area...');
            // Search area is initialized on-demand when search is performed
            // This method is called during sorting system initialization
        }

        /**
         * Arrange search results on pedestals
         * @param {Array} searchResults - Array of search result objects
         * @param {Object} stackingConfig - Optional stacking configuration
         * @returns {boolean} True if arrangement was successful
         */
        arrangeSearchResultsOnPedestals(searchResults, stackingConfig = null) {
            console.log('🗿 SortingManager: arrangeSearchResultsOnPedestals called with', searchResults.length, 'results');
            
            if (!searchResults || searchResults.length === 0) {
                console.log('❌ No search results to arrange');
                return false;
            }

            try {
                // First, group search results by metadata for intelligent stacking
                const groupedResults = this.groupSearchResultsByMetadata(searchResults);
                console.log('📊 Grouped search results for stacking:', Object.keys(groupedResults).length, 'groups');
                
                // Define pedestal area parameters
                const pedestalHeight = 6; // Height of pedestals above ground (3x taller)
                const homeAreaRadius = 15; // Home Area radius
                const distanceFromHome = 18; // Distance from Home Area center to semicircle center (closer to Home)
                const semicircleRadius = 4; // Radius of the semicircle formation (smaller for tighter grouping)
                
                // Calculate pedestal positions in semicircle formation - ALWAYS calculate 5 positions
                const pedestalPositions = [];
                const pedestalCount = 5; // Always create 5 pedestals
                
                // Create straight line of pedestals in front of Home Area facing the camera
                for (let i = 0; i < pedestalCount; i++) {
                    // Distribute pedestals evenly in a straight line
                    const spacing = 3; // Space between pedestals
                    const totalWidth = (pedestalCount - 1) * spacing;
                    
                    const x = -totalWidth / 2 + (i * spacing); // Center the line at X=0
                    const z = distanceFromHome; // Fixed distance from Home Area
                    
                    pedestalPositions.push({
                        x: x,
                        y: pedestalHeight, // Top of pedestal (object height will be added per object)
                        z: z
                    });
                }
                
                // Create visual pedestals - ALWAYS create exactly 5 pedestals
                this.searchArea = { pedestals: [] };
                
                console.log(`🗿 Creating 5 pedestals for ${searchResults.length} results`);
                
                for (let i = 0; i < 5; i++) { // Always create exactly 5 pedestals
                    const pos = pedestalPositions[i];
                    
                    console.log(`🗿 Creating pedestal ${i + 1} at position:`, pos);
                    
                    // Create Roman column-style pedestal with base, shaft, and capital
                    const pedestalGroup = this.createRomanColumnPedestal(pedestalHeight);
                    pedestalGroup.position.set(pos.x, pedestalHeight / 2, pos.z); // Bottom at ground
                    
                    // Mark as template object
                    pedestalGroup.userData.templateObject = true;
                    pedestalGroup.userData.isPedestal = true;
                    
                    console.log(`🗿 Adding pedestal mesh to scene at (${pos.x}, ${pedestalHeight / 2}, ${pos.z})`);
                    this.scene.add(pedestalGroup);
                    this.searchArea.pedestals.push({ mesh: pedestalGroup, position: pos });
                    
                    console.log(`🗿 Created pedestal ${i + 1} at (${pos.x}, ${pedestalHeight / 2}, ${pos.z})`);
                }
                
                // Position search result objects on pedestals (group by group)
                const groupKeys = Object.keys(groupedResults);
                let pedestalIndex = 0;
                
                // Get current stacking configuration
                const currentStackingConfig = stackingConfig || this.getStackingConfig();
                
                for (const groupKey of groupKeys) {
                    if (pedestalIndex >= pedestalPositions.length) break;
                    
                    const group = groupedResults[groupKey];
                    const pos = pedestalPositions[pedestalIndex];
                    
                    console.log(`🗿 Positioning group "${groupKey}" with ${group.items.length} items on pedestal ${pedestalIndex + 1}`);
                    
                    // Apply proper vertical stacking for items in this group
                    this.stackItemsOnPedestal(group.items, pos, currentStackingConfig);
                    
                    pedestalIndex++;
                }
                
                // Add visual indicators if module is available
                this.initializeVisualIndicators();
                if (this.visualIndicators) {
                    // Create indicator data for each pedestal with grouped results
                    pedestalIndex = 0;
                    for (const groupKey of groupKeys) {
                        if (pedestalIndex >= this.searchArea.pedestals.length) break;
                        
                        const group = groupedResults[groupKey];
                        const pedestal = this.searchArea.pedestals[pedestalIndex];
                        
                        console.log(`🎨 Adding indicators for group "${groupKey}" with ${group.items.length} items`);
                        
                        this.visualIndicators.addIndicatorsToPedestal(
                            pedestal.mesh, 
                            group.items, 
                            group.items.length, 
                            {
                                ...stackingConfig,
                                groupKey: groupKey,
                                category: group.category,
                                dateGroup: group.dateGroup
                            }
                        );
                        
                        pedestalIndex++;
                    }
                }
                
                console.log('✅ Search results arranged on pedestals successfully');
                return true;
                
            } catch (error) {
                console.error('❌ Error arranging search results on pedestals:', error);
                return false;
            }
        }

        /**
         * Create a Roman column-style pedestal with base, shaft, and capital
         * @param {number} totalHeight - Total height of the pedestal
         * @returns {THREE.Group} - Group containing the complete pedestal
         */
        createRomanColumnPedestal(totalHeight) {
            const pedestalGroup = new this.THREE.Group();
            
            // Classical proportions: base (20%), shaft (60%), capital (20%)
            const baseHeight = totalHeight * 0.2;
            const shaftHeight = totalHeight * 0.6;
            const capitalHeight = totalHeight * 0.2;
            
            // Base dimensions - reduced by another 10% for better proportions (total 19% reduction from original)
            const baseRadius = 1.62;   // Was 1.8, now 10% smaller (originally 2.0)
            const shaftRadius = 1.215; // Was 1.35, now 10% smaller (originally 1.5)  
            const capitalRadius = 1.458; // Was 1.62, now 10% smaller (originally 1.8)
            
            // Create marble-like material
            const marbleMaterial = this.createMarbleMaterial();
            
            // Create base (wider, shorter cylinder)
            const baseGeometry = new this.THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 16);
            const baseMesh = new this.THREE.Mesh(baseGeometry, marbleMaterial);
            baseMesh.position.y = -totalHeight/2 + baseHeight/2;
            pedestalGroup.add(baseMesh);
            
            // Create shaft (main column)
            const shaftGeometry = new this.THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftHeight, 16);
            const shaftMesh = new this.THREE.Mesh(shaftGeometry, marbleMaterial);
            shaftMesh.position.y = -totalHeight/2 + baseHeight + shaftHeight/2;
            pedestalGroup.add(shaftMesh);
            
            // Create capital (decorative top)
            const capitalGeometry = new this.THREE.CylinderGeometry(capitalRadius, shaftRadius, capitalHeight, 16);
            const capitalMesh = new this.THREE.Mesh(capitalGeometry, marbleMaterial);
            capitalMesh.position.y = -totalHeight/2 + baseHeight + shaftHeight + capitalHeight/2;
            pedestalGroup.add(capitalMesh);
            
            // Add subtle decorative rings on the shaft
            const ringHeight = 0.1;
            const ringRadius = shaftRadius + 0.04; // Adjusted for smaller shaft (was 0.045)
            
            // Add rings at 1/3 and 2/3 of shaft height
            for (let i = 1; i <= 2; i++) {
                const ringGeometry = new this.THREE.CylinderGeometry(ringRadius, ringRadius, ringHeight, 16);
                const ringMesh = new this.THREE.Mesh(ringGeometry, marbleMaterial);
                ringMesh.position.y = -totalHeight/2 + baseHeight + (shaftHeight * i / 3);
                pedestalGroup.add(ringMesh);
            }
            
            return pedestalGroup;
        }

        /**
         * Create a marble-like material for pedestals
         * @returns {THREE.Material} - Marble material
         */
        createMarbleMaterial() {
            // Create a procedural marble texture
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Base marble color (darker cream marble tone for better visibility)
            const gradient = ctx.createLinearGradient(0, 0, 512, 512);
            gradient.addColorStop(0, '#f0ebe0');    // Darker warm cream
            gradient.addColorStop(0.3, '#f4efe4');  // Medium cream
            gradient.addColorStop(0.7, '#ebe6db');  // Darker cream
            gradient.addColorStop(1, '#ede8dd');    // Rich cream
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 512, 512);
            
            // Add marble veining - much more visible for better appearance at distance
            ctx.strokeStyle = 'rgba(160, 150, 135, 0.6)'; // Much more visible darker beige veins
            ctx.lineWidth = 3; // Thicker lines for visibility
            
            // Create organic vein patterns
            for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                const startX = Math.random() * 512;
                const startY = Math.random() * 512;
                ctx.moveTo(startX, startY);
                
                // Create wavy vein lines
                let x = startX;
                let y = startY;
                for (let j = 0; j < 20; j++) {
                    x += (Math.random() - 0.5) * 50;
                    y += (Math.random() - 0.5) * 50;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            
            // Add secondary darker veins for depth
            ctx.strokeStyle = 'rgba(140, 130, 115, 0.45)'; // Much more visible secondary veins
            ctx.lineWidth = 2; // Thicker secondary veins
            
            for (let i = 0; i < 12; i++) {
                ctx.beginPath();
                const startX = Math.random() * 512;
                const startY = Math.random() * 512;
                ctx.moveTo(startX, startY);
                
                let x = startX;
                let y = startY;
                for (let j = 0; j < 15; j++) {
                    x += (Math.random() - 0.5) * 30;
                    y += (Math.random() - 0.5) * 30;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            
            // Create texture
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.wrapS = this.THREE.RepeatWrapping;
            texture.wrapT = this.THREE.RepeatWrapping;
            texture.repeat.set(2, 2); // Tile the texture for variation
            
            // Create material with marble properties - reduced brightness
            return new this.THREE.MeshLambertMaterial({
                map: texture,
                transparent: false,  // Solid, not transparent
                opacity: 1.0,
                color: 0xd4c8b8,     // Much darker cream base color to reduce brightness
                emissive: 0x000000   // No emissive light to prevent glowing
            });
        }

        /**
         * Start a search session by creating search area
         * @returns {boolean} True if session started successfully
         */
        startSearchSession() {
            console.log('🗿 SortingManager: Starting search session...');
            try {
                // Search session started - search area is created on demand
                console.log('✅ Search session started successfully');
                return true;
            } catch (error) {
                console.error('❌ Error starting search session:', error);
                return false;
            }
        }

        /**
         * End a search session by cleaning up search area and pedestals
         * @returns {boolean} True if session ended successfully
         */
        endSearchSession() {
            console.log('🗿 SortingManager: Ending search session...');
            try {
                // Clean up visual indicators first
                if (this.visualIndicators) {
                    this.visualIndicators.removeAllIndicators();
                }
                
                // Remove search area pedestals if they exist
                if (this.searchArea && this.searchArea.pedestals) {
                    this.searchArea.pedestals.forEach(pedestal => {
                        if (pedestal.mesh && pedestal.mesh.parent) {
                            pedestal.mesh.parent.remove(pedestal.mesh);
                        }
                    });
                    this.searchArea.pedestals = [];
                    console.log('✅ Search area pedestals removed');
                }
                
                // Clear search area reference
                this.searchArea = null;
                
                console.log('✅ Search session ended successfully');
                return true;
            } catch (error) {
                console.error('❌ Error ending search session:', error);
                return false;
            }
        }

        /**
         * Initialize visual indicators module (safe to call multiple times)
         */
        initializeVisualIndicators() {
            if (!this.visualIndicators && window.VisualStackIndicators) {
                this.visualIndicators = new VisualStackIndicators(this.scene, this.THREE);
                console.log('🎨 Visual stack indicators initialized');
            }
        }

        /**
         * Group search results by metadata for intelligent stacking
         * @param {Array} searchResults - Array of search result objects
         * @returns {Object} Grouped results by metadata categories
         */
        groupSearchResultsByMetadata(searchResults) {
            const groups = {};
            
            searchResults.forEach(result => {
                let fileType = 'unknown';
                let dateGroup = 'unknown-date';
                let itemName = 'unknown';
                
                // Handle contact objects
                if (result.type === 'contact' && result.contactData) {
                    fileType = 'contacts';
                    itemName = result.contactData.name || 'unnamed-contact';
                    
                    // Use current date as group for contacts (could be enhanced later)
                    const currentDate = new Date();
                    dateGroup = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                } else if (result.fileObject) {
                    // Handle file objects AND link/app objects
                    const userData = result.fileObject.userData;
                    const fileData = userData?.fileData;
                    
                    // Check if this is a link or app object without fileData
                    if (!fileData) {
                        // Try to extract metadata from link/app objects
                        const youtubeMetadata = userData?.youtubeMetadata;
                        const spotifyMetadata = userData?.spotifyMetadata;
                        const deezerMetadata = userData?.deezerMetadata;
                        const tiktokMetadata = userData?.tiktokMetadata;
                        const instagramMetadata = userData?.instagramMetadata;
                        
                        if (youtubeMetadata) {
                            fileType = 'videos';
                            itemName = youtubeMetadata.title || 'unnamed-video';
                            // YouTube videos don't have reliable dates in metadata
                            dateGroup = 'unknown-date';
                        } else if (spotifyMetadata) {
                            fileType = 'music';
                            itemName = spotifyMetadata.title || spotifyMetadata.trackName || 'unnamed-track';
                            // Spotify tracks don't have dates in basic metadata
                            dateGroup = 'unknown-date';
                        } else if (deezerMetadata) {
                            fileType = 'music';
                            itemName = deezerMetadata.title || 'unnamed-track';
                            dateGroup = 'unknown-date';
                        } else if (tiktokMetadata) {
                            fileType = 'videos';
                            itemName = tiktokMetadata.title || 'unnamed-video';
                            dateGroup = 'unknown-date';
                        } else if (instagramMetadata) {
                            fileType = 'videos';
                            itemName = instagramMetadata.title || 'unnamed-reel';
                            dateGroup = 'unknown-date';
                        } else {
                            // Generic link/app object without specific metadata
                            const objectId = userData?.id || userData?.objectId || '';
                            if (objectId.includes('link://') || objectId.includes('com.link.')) {
                                fileType = 'links';
                                itemName = userData?.fileName || 'unnamed-link';
                            } else if (objectId.includes('app://') || objectId.includes('.app.')) {
                                fileType = 'apps';
                                itemName = userData?.fileName || 'unnamed-app';
                            } else {
                                fileType = 'other';
                                itemName = userData?.fileName || 'unnamed-object';
                            }
                            dateGroup = 'unknown-date';
                        }
                    } else {
                        // Standard file object with fileData
                        fileType = this.getFileCategoryFromString(fileData.extension || fileData.name);
                        itemName = fileData.name || 'unnamed-file';
                        
                        // Then by date if available (group by month/year)
                        if (fileData.lastModified) {
                            const date = new Date(fileData.lastModified);
                            dateGroup = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        } else if (fileData.dateModified) {
                            const date = new Date(fileData.dateModified);
                            dateGroup = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        }
                    }
                } else {
                    // No valid object, skip
                    return;
                }
                
                // Create group key
                const groupKey = `${fileType}-${dateGroup}`;
                
                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        category: fileType,
                        dateGroup: dateGroup,
                        items: []
                    };
                }
                
                groups[groupKey].items.push(result);
            });
            
            // Sort items within each group by name
            Object.values(groups).forEach(group => {
                group.items.sort((a, b) => {
                    let nameA = '';
                    let nameB = '';
                    
                    // Handle contact objects
                    if (a.type === 'contact' && a.contactData) {
                        nameA = a.contactData.name || '';
                    } else if (a.fileObject?.userData) {
                        const userData = a.fileObject.userData;
                        // Check fileData first, then link/app metadata
                        nameA = userData.fileData?.name || 
                                userData.youtubeMetadata?.title || 
                                userData.spotifyMetadata?.title || 
                                userData.spotifyMetadata?.trackName ||
                                userData.deezerMetadata?.title ||
                                userData.tiktokMetadata?.title ||
                                userData.instagramMetadata?.title ||
                                userData.fileName || '';
                    }
                    
                    if (b.type === 'contact' && b.contactData) {
                        nameB = b.contactData.name || '';
                    } else if (b.fileObject?.userData) {
                        const userData = b.fileObject.userData;
                        // Check fileData first, then link/app metadata
                        nameB = userData.fileData?.name || 
                                userData.youtubeMetadata?.title || 
                                userData.spotifyMetadata?.title || 
                                userData.spotifyMetadata?.trackName ||
                                userData.deezerMetadata?.title ||
                                userData.tiktokMetadata?.title ||
                                userData.instagramMetadata?.title ||
                                userData.fileName || '';
                    }
                    
                    return nameA.localeCompare(nameB);
                });
            });
            
            return groups;
        }

        /**
         * Stack items vertically on a pedestal according to stacking criteria
         * @param {Array} items - Array of search result items to stack
         * @param {Object} pedestalPosition - Position of the pedestal
         * @param {Object} stackingConfig - Stacking configuration
         */
        stackItemsOnPedestal(items, pedestalPosition, stackingConfig) {
            if (!items || items.length === 0) return;
            
            // Sort items within the group according to stacking criteria
            const sortedItems = this.sortItemsForPedestal(items, stackingConfig);
            
            // Apply stacking height limit
            const stackHeightLimit = stackingConfig.stackHeightLimit || 20;
            const itemsToStack = sortedItems.slice(0, stackHeightLimit);
            
            // Start at pedestal top (pedestalPosition.y is the top of the pedestal)
            // currentY tracks the bottom position where the next object's bottom should be placed
            let currentY = pedestalPosition.y;
            
            console.log(`🗿 Stacking ${itemsToStack.length} items on pedestal at (${pedestalPosition.x}, ${pedestalPosition.z})`);
            
            itemsToStack.forEach((item, index) => {
                if (item && item.fileObject) {
                    const object = item.fileObject;
                    
                    // CRITICAL FIX: Detach object from furniture parent before positioning
                    // Objects on furniture are parented to the furniture group, so their position is relative
                    // We need to re-parent them to the scene for world coordinates to work correctly
                    if (object.parent && object.parent !== this.scene) {
                        console.log(`🪑 Detaching object from furniture parent: ${object.userData.fileData?.name || object.userData.fileName || 'unknown'}`);
                        // Adding to scene automatically removes from current parent
                        this.scene.add(object);
                    }
                    
                    // Get the actual object height
                    const objectHeight = this.getObjectHeight(object);
                    
                    // Calculate object center position: 
                    // currentY is the bottom position, so center is at currentY + (objectHeight / 2)
                    const objectY = currentY + (objectHeight / 2);
                    
                    // Position the object (now in world coordinates)
                    object.position.set(pedestalPosition.x, objectY, pedestalPosition.z);
                    
                    // Update SMS screen position if this is a contact object
                    this.updateContactSMSScreenPosition(object);
                    
                    // Get object name for logging (works for both file and link/app objects)
                    const objectName = object.userData.fileData?.name || 
                                      object.userData.youtubeMetadata?.title ||
                                      object.userData.spotifyMetadata?.title ||
                                      object.userData.spotifyMetadata?.trackName ||
                                      object.userData.deezerMetadata?.title ||
                                      object.userData.fileName || 
                                      'unknown';
                    
                    console.log(`🗿 Stacked item ${index + 1}/${itemsToStack.length}: ${objectName} at Y=${objectY.toFixed(2)} (height=${objectHeight.toFixed(2)})`);
                    
                    // Move currentY up for next item (to the top of this object)
                    // The top of this object is at: objectY + (objectHeight / 2)
                    // Which simplifies to: currentY + objectHeight
                    currentY += objectHeight;
                }
            });
            
            // Log if any items were excluded due to height limit
            if (sortedItems.length > stackHeightLimit) {
                console.log(`⚠️ ${sortedItems.length - stackHeightLimit} items excluded due to stack height limit of ${stackHeightLimit}`);
            }
        }

        /**
         * Sort items for pedestal stacking according to stacking criteria
         * @param {Array} items - Array of search result items
         * @param {Object} stackingConfig - Stacking configuration
         * @returns {Array} Sorted items
         */
        sortItemsForPedestal(items, stackingConfig) {
            const primarySort = stackingConfig.primarySort || 'fileName';
            const secondarySort = stackingConfig.secondarySort || 'fileSize';
            
            console.log(`🗿 Sorting ${items.length} items by ${primarySort} (primary) and ${secondarySort} (secondary)`);
            
            return items.sort((a, b) => {
                // Extract file objects for comparison
                const objA = a.fileObject;
                const objB = b.fileObject;
                
                if (!objA || !objB) return 0;
                
                // Primary sort comparison
                const primaryComparison = this.compareObjectsByCriteria(objA, objB, primarySort);
                if (primaryComparison !== 0) {
                    return primaryComparison;
                }
                
                // If primary criteria are equal, use secondary sort
                return this.compareObjectsByCriteria(objA, objB, secondarySort);
            });
        }
        


        /**
         * Initialize search area for organizing search results
         */
    }
    
    // Make globally accessible
    window.SortingManager = SortingManager;
    
    // Add global testing methods for easy browser console access
    window.testSorting = {
        showZones: () => {
            if (window.app && window.app.sortingManager) {
                window.app.sortingManager.createZoneVisualIndicators();
                console.log('✅ Zone indicators created - you should see colored circles!');
            } else {
                console.log('❌ Sorting manager not available');
            }
        },
        
        hideZones: () => {
            if (window.app && window.app.sortingManager) {
                window.app.sortingManager.removeZoneVisualIndicators();
                console.log('✅ Zone indicators removed');
            } else {
                console.log('❌ Sorting manager not available');
            }
        },
        
        toggleZones: () => {
            if (window.app && window.app.sortingManager) {
                const visible = window.app.sortingManager.toggleZoneIndicators();
                console.log(`✅ Zone indicators ${visible ? 'shown' : 'hidden'}`);
            } else {
                console.log('❌ Sorting manager not available');
            }
        },
        
        sortObjects: () => {
            if (window.app && window.app.sortingManager) {
                window.app.sortingManager.sortObjectsIntoZones();
                console.log('✅ Objects sorted into zones');
            } else {
                console.log('❌ Sorting manager not available');
            }
        },
        
        getInfo: () => {
            if (window.app && window.app.sortingManager) {
                const info = window.app.sortingManager.getDebugInfo();
                console.log('📊 Sorting System Info:', info);
                return info;
            } else {
                console.log('❌ Sorting manager not available');
            }
        },

        // Phase 2: Stacking test methods
        testStacking: () => {
            if (window.app && window.app.sortingManager) {
                const results = window.app.sortingManager.testStackingSystem();
                console.log('🏗️ Stacking test results:', results);
                return results;
            } else {
                console.log('❌ Sorting manager not available');
            }
        },

        getStackingInfo: () => {
            if (window.app && window.app.sortingManager) {
                const info = window.app.sortingManager.getStackingDebugInfo();
                console.log('🔍 Detailed stacking info:', info);
                return info;
            } else {
                console.log('❌ Sorting manager not available');
            }
        },

        enableStacking: () => {
            if (window.app && window.app.sortingManager) {
                const success = window.app.sortingManager.updateStackingConfig({ enabled: true });
                console.log(`🏗️ Stacking ${success ? 'enabled' : 'failed to enable'}`);
                return success;
            } else {
                console.log('❌ Sorting manager not available');
            }
        },

        disableStacking: () => {
            if (window.app && window.app.sortingManager) {
                const success = window.app.sortingManager.updateStackingConfig({ enabled: false });
                console.log(`📊 Stacking ${success ? 'disabled' : 'failed to disable'} - using grid layout`);
                return success;
            } else {
                console.log('❌ Sorting manager not available');
            }
        }
    };
    
    console.log("🎯 Sorting test methods available:");
    console.log("  Basic: window.testSorting.showZones(), .hideZones(), .toggleZones(), .sortObjects(), .getInfo()");
    console.log("  Stacking: window.testSorting.testStacking(), .getStackingInfo(), .enableStacking(), .disableStacking()");

    // ============================================================================
    // GLOBAL FLUTTER INTEROP FUNCTIONS FOR STACKING CONFIGURATION
    // ============================================================================

    /**
     * Global function to get stacking configuration (Flutter interop)
     * @returns {Object|null} Current stacking configuration or null if not available
     */
    window.getStackingConfigJS = function() {
        try {
            if (window.app && window.app.sortingManager) {
                const config = window.app.sortingManager.getStackingConfig();
                console.log('✅ getStackingConfigJS: Retrieved configuration', config);
                return config;
            } else {
                console.log('❌ getStackingConfigJS: Sorting manager not available');
                return null;
            }
        } catch (error) {
            console.error('❌ getStackingConfigJS: Error retrieving configuration', error);
            return null;
        }
    };

    /**
     * Global function to update stacking configuration (Flutter interop)
     * @param {Object} config - New stacking configuration
     * @returns {boolean} True if update was successful
     */
    window.updateStackingConfigJS = function(config) {
        try {
            if (window.app && window.app.sortingManager) {
                const success = window.app.sortingManager.updateStackingConfig(config);
                if (success) {
                    console.log('✅ updateStackingConfigJS: Configuration updated successfully', config);
                } else {
                    console.log('❌ updateStackingConfigJS: Failed to update configuration');
                }
                return success;
            } else {
                console.log('❌ updateStackingConfigJS: Sorting manager not available');
                return false;
            }
        } catch (error) {
            console.error('❌ updateStackingConfigJS: Error updating configuration', error);
            return false;
        }
    };

    /**
     * Global function to apply stacking configuration (Flutter interop)
     * @returns {boolean} True if application was successful
     */
    window.applyStackingConfigJS = function() {
        try {
            if (window.app && window.app.sortingManager) {
                const success = window.app.sortingManager.applyStackingConfiguration();
                if (success) {
                    console.log('✅ applyStackingConfigJS: Configuration applied successfully');
                } else {
                    console.log('❌ applyStackingConfigJS: Failed to apply configuration');
                }
                return success;
            } else {
                console.log('❌ applyStackingConfigJS: Sorting manager not available');
                return false;
            }
        } catch (error) {
            console.error('❌ applyStackingConfigJS: Error applying configuration', error);
            return false;
        }
    };

    console.log("🔧 Stacking configuration functions available: window.getStackingConfigJS(), window.updateStackingConfigJS(config), window.applyStackingConfigJS()");
    
    console.log("SortingManager module loaded successfully");
})();
