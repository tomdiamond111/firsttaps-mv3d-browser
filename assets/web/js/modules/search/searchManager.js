// modules/search/searchManager.js
// Dependencies: THREE (global), window.SharedStateManager
// Exports: window.SearchManager

(function() {
    'use strict';
    
    // DEBUG FLAG FOR DETAILED SEARCH LOGGING
    const DEBUG_SEARCH = true; // Add this flag for detailed logging
    
    console.log("Loading SearchManager module...");
    
    // ============================================================================
    // 3D SEARCH SYSTEM - File Metadata Search with Visual Result Display
    // ============================================================================
    class SearchManager {
        constructor(THREE, scene, stateManager) {
            this.THREE = THREE;
            this.scene = scene;
            this.stateManager = stateManager;
            
            // Search configuration - updated for pedestal system
            this.config = {
                enabled: true,
                maxResults: 5, // Reduced to 5 to match pedestal count
                animationDuration: 800, // Animation duration in milliseconds
                usePedestals: true, // Enable pedestal system
                useStacking: true, // Enable stacking on pedestals
                cameraAnimation: {
                    enabled: true,
                    duration: 1000, // Camera animation duration in milliseconds
                    delay: 200 // Delay after pedestals created before camera moves
                }
            };
            
            // Search state
            this.searchState = {
                isActive: false,
                currentQuery: '',
                results: [], // Array of {fileObject, score, originalPosition}
            };
            
            // Original positions storage for restoration
            this.originalPositions = new Map(); // fileId -> {x, y, z}
            
            // Camera state storage for search mode
            this.originalCameraState = null; // Will store {position, target, controls state}
            
            console.log('SearchManager initialized with pedestal support');
        }
        
        // ============================================================================
        // SEARCH ALGORITHM & RELEVANCE SCORING
        // ============================================================================
        
        /**
         * Perform search across all file objects
         * @param {string} query - Search query string
         * @returns {Array} Array of search results with scores
         */
        performSearch(query) {
            console.log(`🔍 SearchManager: Performing search for "${query}"`);
            
            if (!query || query.trim().length === 0) {
                console.log('❌ Empty query provided');
                return [];
            }
            
            const trimmedQuery = query.trim().toLowerCase();
            const results = [];
            const fileObjects = this.stateManager.fileObjects;
            
            console.log(`📁 Searching through ${fileObjects.length} file objects`);
            
            // Search through all file objects (includes both regular files and link/app objects)
            fileObjects.forEach((fileObject, index) => {
                if (!fileObject.userData) {
                    console.log(`⚠️  Object ${index} missing userData`);
                    return;
                }
                
                // Skip contact objects - they are handled by ContactSearchManager
                if (fileObject.userData.subType === 'contact' || fileObject.userData.isContact) {
                    console.log(`📱 Skipping contact object ${index}: ${fileObject.userData.fileName || 'unnamed'} (handled by ContactSearchManager)`);
                    return;
                }
                
                let score = 0;
                let objectName = 'unnamed';
                
                // Check if this is a regular file object or a link/app object
                if (fileObject.userData.fileData) {
                    // Regular file object - use original scoring
                    const fileData = fileObject.userData.fileData;
                    objectName = fileData.name || 'unnamed';
                    console.log(`🔍 Checking file object ${index}: ${objectName}`);
                    score = this.calculateRelevanceScore(fileData, trimmedQuery);
                } else if (fileObject.userData.isApp || fileObject.userData.url) {
                    // Link/App object (YouTube, Spotify, etc.) - use link scoring
                    objectName = this.getLinkObjectName(fileObject.userData);
                    console.log(`🔍 Checking link/app object ${index}: ${objectName}`);
                    score = this.calculateLinkObjectRelevanceScore(fileObject.userData, trimmedQuery);
                } else {
                    console.log(`⚠️  Object ${index} has no fileData or link metadata - skipping`);
                    return;
                }
                
                if (score > 0) {
                    console.log(`✅ Match found! Object: ${objectName}, Score: ${score}`);
                    results.push({
                        fileObject: fileObject,
                        score: score,
                        originalPosition: {
                            x: fileObject.position.x,
                            y: fileObject.position.y,
                            z: fileObject.position.z
                        }
                    });
                } else {
                    console.log(`❌ No match for ${objectName} (score: ${score})`);
                }
            });
            
            // Sort by relevance score (highest first)
            results.sort((a, b) => b.score - a.score);
            
            // Limit results
            const limitedResults = results.slice(0, this.config.maxResults);
            
            console.log(`🎯 Search completed: ${results.length} total matches, showing top ${limitedResults.length}`);
            if (limitedResults.length > 0) {
                console.log('📋 Search results:', limitedResults.map(r => ({
                    name: r.fileObject.userData.fileData?.name || 'unnamed',
                    score: r.score
                })));
            }
            
            return limitedResults;
        }
        
        /**
         * Get display name for link/app objects
         * @param {Object} userData - Object userData
         * @returns {string} Display name
         */
        getLinkObjectName(userData) {
            // Check various metadata sources for title/name
            if (userData.youtubeMetadata && userData.youtubeMetadata.title) {
                return userData.youtubeMetadata.title;
            }
            if (userData.spotifyMetadata && userData.spotifyMetadata.title) {
                return userData.spotifyMetadata.title;
            }
            if (userData.deezerMetadata && userData.deezerMetadata.title) {
                return userData.deezerMetadata.title;
            }
            if (userData.title) {
                return userData.title;
            }
            if (userData.appName) {
                return userData.appName;
            }
            if (userData.fileName) {
                return userData.fileName;
            }
            if (userData.name) {
                return userData.name;
            }
            return 'unnamed';
        }
        
        /**
         * Calculate relevance score for link/app objects based on search query
         * @param {Object} userData - Object userData containing link/app metadata
         * @param {string} query - Search query (lowercase)
         * @returns {number} Relevance score (0 = no match, higher = more relevant)
         */
        calculateLinkObjectRelevanceScore(userData, query) {
            let score = 0;
            
            const objectName = this.getLinkObjectName(userData);
            console.log(`🔍 Scoring link object: ${objectName} against query: "${query}"`);
            
            // Title matching (highest weight)
            const title = userData.youtubeMetadata?.title || 
                         userData.spotifyMetadata?.title || 
                         userData.deezerMetadata?.title || 
                         userData.title || 
                         userData.appName || 
                         userData.fileName || 
                         userData.name || '';
            
            if (title && title.toLowerCase().includes(query)) {
                score += 100;
                console.log(`   ✅ Title match: "${title}" contains "${query}" (+100 points)`);
                // Exact match bonus
                if (title.toLowerCase() === query) {
                    score += 50;
                    console.log(`   ✅ Exact title match bonus (+50 points)`);
                }
                // Starts with query bonus
                if (title.toLowerCase().startsWith(query)) {
                    score += 25;
                    console.log(`   ✅ Title starts with query bonus (+25 points)`);
                }
            }
            
            // Artist/Channel matching
            const artist = userData.youtubeMetadata?.channelTitle || 
                          userData.spotifyMetadata?.artist || 
                          userData.deezerMetadata?.artist || 
                          userData.artist || '';
            
            if (artist && artist.toLowerCase().includes(query)) {
                score += 60;
                console.log(`   ✅ Artist/Channel match: "${artist}" contains "${query}" (+60 points)`);
            }
            
            // Album matching (Spotify/Deezer)
            const album = userData.spotifyMetadata?.album || 
                         userData.deezerMetadata?.album || 
                         userData.album || '';
            
            if (album && album.toLowerCase().includes(query)) {
                score += 40;
                console.log(`   ✅ Album match: "${album}" contains "${query}" (+40 points)`);
            }
            
            // URL matching (for platform-specific searches)
            if (userData.url && userData.url.toLowerCase().includes(query)) {
                score += 20;
                console.log(`   ✅ URL match: contains "${query}" (+20 points)`);
            }
            
            // Platform matching (youtube, spotify, deezer, etc.)
            if (query === 'youtube' && (userData.youtubeMetadata || (userData.url && userData.url.includes('youtube')))) {
                score += 30;
                console.log(`   ✅ YouTube platform match (+30 points)`);
            }
            if (query === 'spotify' && (userData.spotifyMetadata || (userData.url && userData.url.includes('spotify')))) {
                score += 30;
                console.log(`   ✅ Spotify platform match (+30 points)`);
            }
            if (query === 'deezer' && (userData.deezerMetadata || (userData.url && userData.url.includes('deezer')))) {
                score += 30;
                console.log(`   ✅ Deezer platform match (+30 points)`);
            }
            
            // Description matching (lower weight)
            const description = userData.youtubeMetadata?.description || 
                               userData.spotifyMetadata?.description || 
                               userData.description || '';
            
            if (description && description.toLowerCase().includes(query)) {
                score += 15;
                console.log(`   ✅ Description match (+15 points)`);
            }
            
            console.log(`   📊 Final score for link object "${objectName}": ${score}`);
            return score;
        }
        
        /**
         * Calculate relevance score for a file based on search query
         * @param {Object} fileData - File metadata object
         * @param {string} query - Search query (lowercase)
         * @returns {number} Relevance score (0 = no match, higher = more relevant)
         */
        calculateRelevanceScore(fileData, query) {
            let score = 0;
            
            console.log(`🔍 Scoring file: ${fileData.name || 'unnamed'} against query: "${query}"`);
            
            // File name matching (highest weight)
            if (fileData.name && fileData.name.toLowerCase().includes(query)) {
                score += 100;
                console.log(`   ✅ Name match: ${fileData.name} contains "${query}" (+100 points)`);
                // Exact match bonus
                if (fileData.name.toLowerCase() === query) {
                    score += 50;
                    console.log(`   ✅ Exact name match bonus (+50 points)`);
                }
                // Starts with query bonus
                if (fileData.name.toLowerCase().startsWith(query)) {
                    score += 25;
                    console.log(`   ✅ Name starts with query bonus (+25 points)`);
                }
            }
            
            // File extension matching
            if (fileData.extension && fileData.extension.toLowerCase().includes(query)) {
                score += 30;
                console.log(`   ✅ Extension match: ${fileData.extension} contains "${query}" (+30 points)`);
            }
            
            // File type matching
            if (fileData.type && fileData.type.toLowerCase().includes(query)) {
                score += 20;
                console.log(`   ✅ Type match: ${fileData.type} contains "${query}" (+20 points)`);
            }
            
            // Date-based matching (if query looks like a date)
            if (this.isDateQuery(query)) {
                if (fileData.dateModified && this.matchesDateQuery(fileData.dateModified, query)) {
                    score += 40;
                    console.log(`   ✅ Date modified match (+40 points)`);
                }
                if (fileData.captureDate && this.matchesDateQuery(fileData.captureDate, query)) {
                    score += 40;
                    console.log(`   ✅ Capture date match (+40 points)`);
                }
            }
            
            // Size-based matching (if query looks like a size)
            if (this.isSizeQuery(query) && fileData.size) {
                if (this.matchesSizeQuery(fileData.size, query)) {
                    score += 15;
                    console.log(`   ✅ Size match (+15 points)`);
                }
            }
            
            console.log(`   📊 Final score for ${fileData.name}: ${score}`);
            return score;
        }
        
        /**
         * Check if query looks like a date
         */
        isDateQuery(query) {
            // Simple date pattern matching
            return /\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(query);
        }
        
        /**
         * Check if a date matches the query
         */
        matchesDateQuery(dateString, query) {
            if (!dateString) return false;
            return dateString.toLowerCase().includes(query);
        }
        
        /**
         * Check if query looks like a file size
         */
        isSizeQuery(query) {
            return /\d+\s*(kb|mb|gb|byte)/i.test(query) || /small|large|big|tiny/i.test(query);
        }
        
        /**
         * Check if file size matches the query
         */
        matchesSizeQuery(size, query) {
            // This would need more sophisticated size comparison logic
            return false; // Placeholder for now
        }
        
        // ============================================================================
        // SEARCH RESULT DISPLAY & POSITIONING
        // ============================================================================
        
        /**
         * Activate search mode and display results on pedestals
         * @param {string} query - Search query
         */
        async activateSearch(query) {
            if (DEBUG_SEARCH) console.log(`🔍 SearchManager: STARTING activateSearch for "${query}"`);
            
            // Perform search
            const results = this.performSearch(query);
            if (DEBUG_SEARCH) console.log(`🔍 Search completed: found ${results.length} results`, results);
            
            // Always activate search mode - even with 0 results (shows empty pedestals)
            if (DEBUG_SEARCH) {
                if (results.length === 0) {
                    console.log('📭 SearchManager: No results found - will show empty pedestals');
                } else {
                    console.log('✅ SearchManager: Results found - will show pedestals with objects');
                }
            }
            
            // Store search state
            this.searchState.isActive = true;
            this.searchState.currentQuery = query;
            this.searchState.results = results;
            if (DEBUG_SEARCH) console.log(`📊 Search state updated: ${this.searchState.results.length} results stored`);
            if (DEBUG_SEARCH) console.log(`📊 Search state isActive: ${this.searchState.isActive}`);
            
            // Store original positions for restoration (only if we have results)
            if (results.length > 0) {
                results.forEach(result => {
                    const fileId = result.fileObject.userData.fileData?.path || result.fileObject.userData.fileName || 'unknown';
                    this.originalPositions.set(fileId, result.originalPosition);
                });
                if (DEBUG_SEARCH) console.log(`💾 Stored ${this.originalPositions.size} original positions`);
            } else {
                if (DEBUG_SEARCH) console.log(`📭 No objects to store positions for - empty search results`);
            }
            
            // Store camera state for restoration later, but don't disable camera controls yet
            if (this.config.cameraAnimation.enabled) {
                if (DEBUG_SEARCH) console.log('📷 Storing camera state for later restoration');
                this.storeCameraStateOnly();
                
                // Move camera to search view
                if (DEBUG_SEARCH) console.log('📷 Moving camera to search view');
                this.positionCameraForSearchView();
            }
            
            // Use pedestal system if available and enabled, otherwise fall back to grid
            if (this.config.usePedestals && this.getSortingManager()) {
                if (DEBUG_SEARCH) console.log('🏗️  Using pedestal system for search results');
                await this.arrangeSearchResultsOnPedestalsWithoutCameraMove();
            } else {
                if (DEBUG_SEARCH) console.log('📊 Using grid system for search results (pedestal system not available)');
                // Only arrange in grid if we have results (grid doesn't show empty state)
                if (results.length > 0) {
                    await this.arrangeSearchResultsInGrid();
                } else {
                    if (DEBUG_SEARCH) console.log('📭 No grid arrangement needed for empty results');
                }
            }
            
            // Re-enable camera controls after search setup is complete so user can interact with results
            if (DEBUG_SEARCH) console.log('🎮 Re-enabling camera controls for search result interaction');
            this.enableCameraControlsForInteraction();
            
            if (DEBUG_SEARCH) console.log('✅ SearchManager: Search activation completed successfully - returning TRUE');
            return true;
        }
        
        /**
         * Get reference to SortingManager from SharedStateManager
         */
        getSortingManager() {
            // Primary: Access SortingManager through global app instance
            if (window.app && window.app.sortingManager) {
                return window.app.sortingManager;
            }
            
            // Fallback: Access SortingManager through SharedStateManager
            if (this.stateManager && this.stateManager.sortingManager) {
                return this.stateManager.sortingManager;
            }
            
            // Fallback: try to access through global scope
            if (window.SharedStateManager && window.SharedStateManager.sortingManager) {
                return window.SharedStateManager.sortingManager;
            }
            
            console.warn('SearchManager: SortingManager not accessible via any method');
            return null;
        }
        
        /**
         * Get reference to CameraManager for camera positioning
         */
        getCameraManager() {
            if (DEBUG_SEARCH) console.log('🔍 Looking for CameraManager...');
            
            // Primary: Access CameraManager through global app instance
            if (window.app && window.app.cameraManager) {
                if (DEBUG_SEARCH) console.log('✅ Found CameraManager via window.app.cameraManager');
                return window.app.cameraManager;
            }
            
            // Fallback: Access CameraManager through SharedStateManager
            if (this.stateManager && this.stateManager.cameraManager) {
                if (DEBUG_SEARCH) console.log('✅ Found CameraManager via stateManager.cameraManager');
                return this.stateManager.cameraManager;
            }
            
            // Fallback: try to access through global scope
            if (window.SharedStateManager && window.SharedStateManager.cameraManager) {
                if (DEBUG_SEARCH) console.log('✅ Found CameraManager via SharedStateManager.cameraManager');
                return window.SharedStateManager.cameraManager;
            }
            
            // Debug: Log available properties
            if (DEBUG_SEARCH) {
                console.log('❌ CameraManager not found. Available properties:');
                console.log('window.app keys:', window.app ? Object.keys(window.app) : 'window.app is null');
                console.log('this.stateManager keys:', this.stateManager ? Object.keys(this.stateManager) : 'stateManager is null');
                console.log('window.SharedStateManager keys:', window.SharedStateManager ? Object.keys(window.SharedStateManager) : 'SharedStateManager is null');
            }
            
            console.warn('SearchManager: CameraManager not accessible via any method');
            return null;
        }
        
        /**
         * Arrange search results on pedestals using SortingManager (without camera movement)
         */
        async arrangeSearchResultsOnPedestalsWithoutCameraMove() {
            console.log('🔍 SearchManager: Arranging search results on pedestals (no camera move)');
            
            const sortingManager = this.getSortingManager();
            if (!sortingManager) {
                console.warn('⚠️  SortingManager not available, falling back to grid arrangement');
                return this.arrangeSearchResultsInGrid();
            }
            console.log('✅ SortingManager found:', typeof sortingManager);
            
            // Start search session (create pedestals) - always create pedestals
            console.log('🏗️  Starting search session...');
            const success = sortingManager.startSearchSession();
            if (!success) {
                console.warn('❌ Failed to start search session, falling back to grid arrangement');
                return this.arrangeSearchResultsInGrid();
            }
            console.log('✅ Search session started successfully');
            
            // Arrange results on pedestals with stacking (only if we have results)
            if (this.searchState.results.length > 0) {
                console.log(`📦 Arranging ${this.searchState.results.length} results on pedestals...`);
                const arranged = sortingManager.arrangeSearchResultsOnPedestals(this.searchState.results);
                if (!arranged) {
                    console.warn('❌ Failed to arrange on pedestals, falling back to grid arrangement');
                    return this.arrangeSearchResultsInGrid();
                }
                console.log('✅ SearchManager: Search results arranged on pedestals');
            } else {
                console.log('📭 SearchManager: No results to arrange - pedestals remain empty');
            }
            
            // No camera movement here - it was done before
            if (DEBUG_SEARCH) console.log('📷 Camera was already moved before pedestals - no additional camera movement');
        }
        
        /**
         * Arrange search results on pedestals using SortingManager
         */
        async arrangeSearchResultsOnPedestals() {
            console.log('🔍 SearchManager: Arranging search results on pedestals');
            
            const sortingManager = this.getSortingManager();
            if (!sortingManager) {
                console.warn('⚠️  SortingManager not available, falling back to grid arrangement');
                return this.arrangeSearchResultsInGrid();
            }
            console.log('✅ SortingManager found:', typeof sortingManager);
            
            // Start search session (create pedestals) - always create pedestals
            console.log('🏗️  Starting search session...');
            const success = sortingManager.startSearchSession();
            if (!success) {
                console.warn('❌ Failed to start search session, falling back to grid arrangement');
                return this.arrangeSearchResultsInGrid();
            }
            console.log('✅ Search session started successfully');
            
            // Arrange results on pedestals with stacking (only if we have results)
            if (this.searchState.results.length > 0) {
                console.log(`📦 Arranging ${this.searchState.results.length} results on pedestals...`);
                
                // Get current stacking configuration from SortingManager (unified with Advanced Options)
                const stackingConfig = sortingManager.getStackingConfig();
                console.log('📊 Using unified stacking configuration for search:', {
                    primarySort: stackingConfig.primarySort,
                    secondarySort: stackingConfig.secondarySort,
                    stackHeightLimit: stackingConfig.stackHeightLimit,
                    enabled: stackingConfig.enabled
                });
                
                // Use the same stacking criteria as the Advanced Options
                const arranged = sortingManager.arrangeSearchResultsOnPedestals(this.searchState.results, stackingConfig);
                if (!arranged) {
                    console.warn('❌ Failed to arrange on pedestals, falling back to grid arrangement');
                    return this.arrangeSearchResultsInGrid();
                }
                console.log('✅ SearchManager: Search results arranged on pedestals');
            } else {
                console.log('📭 SearchManager: No results to arrange - pedestals remain empty');
            }
            
            // Move camera to optimal viewing position after a short delay
            if (this.config.cameraAnimation.enabled) {
                setTimeout(() => {
                    this.positionCameraForSearchView();
                }, this.config.cameraAnimation.delay);
            }
        }
        
        /**
         * Fallback: Arrange search results in a grid layout (original method)
         */
        async arrangeSearchResultsInGrid() {
            console.log('SearchManager: Arranging search results in grid (fallback)');
            
            const results = this.searchState.results;
            const gridCols = Math.ceil(Math.sqrt(results.length));
            const gridRows = Math.ceil(results.length / gridCols);
            const gridSpacing = 3;
            
            // Position in front of Home Area
            const searchArea = { x: 0, y: 0, z: 8 }; // 8 units in front of Home Area
            const startX = searchArea.x - (gridCols * gridSpacing) / 2;
            const startZ = searchArea.z - (gridRows * gridSpacing) / 2;
            
            // Animate objects to search positions
            const animationPromises = results.map((result, index) => {
                const row = Math.floor(index / gridCols);
                const col = index % gridCols;
                
                const targetX = startX + (col * gridSpacing);
                const targetZ = startZ + (row * gridSpacing);
                const targetY = 1; // Slightly elevated for visibility
                
                return this.animateObjectToPosition(result.fileObject, targetX, targetY, targetZ);
            });
            
            await Promise.all(animationPromises);
            console.log('SearchManager: Search results arranged in grid');
        }
        
        /**
         * Animate an object to a target position
         */
        animateObjectToPosition(object, targetX, targetY, targetZ) {
            return new Promise((resolve) => {
                const startPos = object.position.clone();
                const targetPos = new this.THREE.Vector3(targetX, targetY, targetZ);
                const startTime = Date.now();
                
                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / this.config.animationDuration, 1);
                    
                    // Smooth easing
                    const eased = 1 - Math.pow(1 - progress, 3);
                    
                    object.position.lerpVectors(startPos, targetPos, eased);
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        resolve();
                    }
                };
                
                animate();
            });
        }
        
        /**
         * Disable camera resets during search mode
         */
        disableCameraResets() {
            if (DEBUG_SEARCH) console.log('🔒 Disabling camera controls and resets during search mode...');
            
            // Set flag to prevent mobile camera resets on the camera manager
            if (window.app && window.app.cameraManager) {
                window.app.cameraManager.cameraResetsDisabled = true;
                window.app.cameraManager.searchModeActive = true;
                if (DEBUG_SEARCH) console.log('✅ Set cameraResetsDisabled and searchModeActive flags on cameraManager');
            }
            
            // Set global flags to prevent camera resets and control updates
            window.searchCameraResetsDisabled = true;
            window.SEARCH_MODE_ACTIVE = true;
            if (DEBUG_SEARCH) console.log('✅ Set global searchCameraResetsDisabled and SEARCH_MODE_ACTIVE flags');
        }
        
        /**
         * Re-enable camera resets after search mode
         */
        enableCameraResets() {
            if (DEBUG_SEARCH) console.log('🔓 Re-enabling camera controls and resets after search mode...');
            
            // Clear flags to allow mobile camera resets and control updates
            if (window.app && window.app.cameraManager) {
                window.app.cameraManager.cameraResetsDisabled = false;
                window.app.cameraManager.searchModeActive = false;
                if (DEBUG_SEARCH) console.log('✅ Cleared cameraResetsDisabled and searchModeActive flags on cameraManager');
            }
            
            // Clear global flags to allow camera resets and control updates
            window.searchCameraResetsDisabled = false;
            window.SEARCH_MODE_ACTIVE = false;
            if (DEBUG_SEARCH) console.log('✅ Cleared global searchCameraResetsDisabled and SEARCH_MODE_ACTIVE flags');
            
            // Force camera controls to be responsive again
            if (window.app && window.app.cameraControls) {
                if (DEBUG_SEARCH) console.log('🔄 Forcing camera controls update to ensure they are responsive');
                
                // Ensure controls are enabled
                window.app.cameraControls.enabled = true;
                
                // Reset control state to ensure they're fully functional
                if (window.app.cameraControls.reset) {
                    window.app.cameraControls.reset();
                }
                
                // Use optimized state sync instead of forced update
                if (window.CameraStateManager) {
                    window.CameraStateManager.syncCurrentState();
                } else {
                    // Fallback: Force a small update to "wake up" the controls
                    window.app.cameraControls.update(0.001);
                }
                
                // Additional step: force the controls to acknowledge current camera position
                if (DEBUG_SEARCH) console.log('📷 Camera controls re-enabled and reset. Current position:', 
                    window.app.camera ? {
                        x: window.app.camera.position.x,
                        y: window.app.camera.position.y,
                        z: window.app.camera.position.z
                    } : 'No camera found');
            }
        }
        
        /**
         * Store current camera state for restoration later (without disabling controls)
         */
        storeCameraStateOnly() {
            if (DEBUG_SEARCH) console.log('📷 Storing camera state (without disabling controls)...');
            
            const cameraManager = this.getCameraManager();
            
            // Try to get camera and controls from various possible locations
            let camera = null;
            let controls = null;
            
            // Method 1: Through CameraManager
            if (cameraManager) {
                if (cameraManager.camera) {
                    camera = cameraManager.camera;
                    if (DEBUG_SEARCH) console.log('✅ Camera found via cameraManager.camera');
                }
                if (cameraManager.controls) {
                    controls = cameraManager.controls;
                    if (DEBUG_SEARCH) console.log('✅ Controls found via cameraManager.controls');
                }
            }
            
            // Method 2: Direct access through app
            if (!camera && window.app && window.app.camera) {
                camera = window.app.camera;
                if (DEBUG_SEARCH) console.log('✅ Camera found via window.app.camera');
            }
            if (!controls && window.app && window.app.controls) {
                controls = window.app.controls;
                if (DEBUG_SEARCH) console.log('✅ Controls found via window.app.controls');
            }
            
            if (camera) {
                this.originalCameraState = {
                    position: camera.position.clone(),
                    target: controls ? controls.target.clone() : new this.THREE.Vector3(0, 0, 0),
                    hasControls: !!controls
                };
                if (DEBUG_SEARCH) console.log('📷 Camera state stored for later restoration:', {
                    position: this.originalCameraState.position,
                    target: this.originalCameraState.target,
                    hasControls: this.originalCameraState.hasControls
                });
            } else {
                console.warn('⚠️  Could not access camera for state storage');
            }
        }
        
        /**
         * Enable camera controls for search result interaction
         */
        enableCameraControlsForInteraction() {
            if (DEBUG_SEARCH) console.log('🎮 Enabling camera controls for search result interaction...');
            
            // Ensure camera controls are fully enabled and responsive
            if (window.app && window.app.cameraControls) {
                window.app.cameraControls.enabled = true;
                
                // Use optimized state sync instead of forced update
                if (window.CameraStateManager) {
                    window.CameraStateManager.syncCurrentState();
                } else {
                    // Fallback: Force update to ensure controls are active
                    if (window.app.cameraControls.update) {
                        window.app.cameraControls.update(0.001);
                    }
                }
                
                if (DEBUG_SEARCH) console.log('✅ Camera controls enabled for interaction');
            }
            
            // Clear any blocking flags
            if (window.app && window.app.cameraManager) {
                window.app.cameraManager.cameraResetsDisabled = false;
                window.app.cameraManager.searchModeActive = false;
            }
            
            window.searchCameraResetsDisabled = false;
            window.SEARCH_MODE_ACTIVE = false;
            
            if (DEBUG_SEARCH) console.log('✅ Camera reset flags cleared for normal operation during search');
        }
        
        /**
         * Store current camera state for restoration later
         */
        storeCameraState() {
            if (DEBUG_SEARCH) console.log('📷 Attempting to store camera state...');
            
            // Disable camera resets during search
            this.disableCameraResets();
            
            const cameraManager = this.getCameraManager();
            
            // Try to get camera and controls from various possible locations
            let camera = null;
            let controls = null;
            
            // Method 1: Through CameraManager
            if (cameraManager) {
                if (cameraManager.camera) {
                    camera = cameraManager.camera;
                    if (DEBUG_SEARCH) console.log('✅ Camera found via cameraManager.camera');
                }
                if (cameraManager.controls) {
                    controls = cameraManager.controls;
                    if (DEBUG_SEARCH) console.log('✅ Controls found via cameraManager.controls');
                }
            }
            
            // Method 2: Direct access through app
            if (!camera && window.app && window.app.camera) {
                camera = window.app.camera;
                if (DEBUG_SEARCH) console.log('✅ Camera found via window.app.camera');
            }
            if (!controls && window.app && window.app.controls) {
                controls = window.app.controls;
                if (DEBUG_SEARCH) console.log('✅ Controls found via window.app.controls');
            }
            
            // Method 3: Through stateManager
            if (!camera && this.stateManager && this.stateManager.camera) {
                camera = this.stateManager.camera;
                if (DEBUG_SEARCH) console.log('✅ Camera found via stateManager.camera');
            }
            if (!controls && this.stateManager && this.stateManager.controls) {
                controls = this.stateManager.controls;
                if (DEBUG_SEARCH) console.log('✅ Controls found via stateManager.controls');
            }
            
            // Method 4: Direct global access
            if (!camera && window.camera) {
                camera = window.camera;
                if (DEBUG_SEARCH) console.log('✅ Camera found via window.camera');
            }
            if (!controls && window.controls) {
                controls = window.controls;
                if (DEBUG_SEARCH) console.log('✅ Controls found via window.controls');
            }
            
            if (camera) {
                this.originalCameraState = {
                    position: camera.position.clone(),
                    target: controls ? controls.target.clone() : new this.THREE.Vector3(0, 0, 0),
                    hasControls: !!controls
                };
                if (DEBUG_SEARCH) console.log('📷 Camera state stored successfully:', {
                    position: this.originalCameraState.position,
                    target: this.originalCameraState.target,
                    hasControls: this.originalCameraState.hasControls
                });
            } else {
                console.warn('⚠️  Could not access camera for state storage');
                if (DEBUG_SEARCH) {
                    console.log('Debug: Available window properties:', Object.keys(window).filter(key => key.toLowerCase().includes('camera') || key.toLowerCase().includes('control')));
                }
            }
        }
        
        /**
         * Animate camera to target position and look-at point
         */
        animateCameraToPosition(targetPos, targetLookAt) {
            if (DEBUG_SEARCH) console.log('📷 Attempting to animate camera to position:', targetPos, 'looking at:', targetLookAt);
            
            const cameraManager = this.getCameraManager();
            
            // Try to get camera and controls using the same logic as storeCameraState
            let camera = null;
            let controls = null;
            
            // Method 1: Through CameraManager
            if (cameraManager) {
                if (cameraManager.camera) {
                    camera = cameraManager.camera;
                }
                if (cameraManager.controls) {
                    controls = cameraManager.controls;
                }
            }
            
            // Method 2: Direct access through app
            if (!camera && window.app && window.app.camera) {
                camera = window.app.camera;
            }
            if (!controls && window.app && window.app.controls) {
                controls = window.app.controls;
            }
            
            // Method 3: Through stateManager
            if (!camera && this.stateManager && this.stateManager.camera) {
                camera = this.stateManager.camera;
            }
            if (!controls && this.stateManager && this.stateManager.controls) {
                controls = this.stateManager.controls;
            }
            
            // Method 4: Direct global access
            if (!camera && window.camera) {
                camera = window.camera;
            }
            if (!controls && window.controls) {
                controls = window.controls;
            }
            
            if (!camera) {
                console.warn('⚠️  Could not access camera for animation');
                return;
            }
            
            if (DEBUG_SEARCH) {
                console.log('📷 Camera found for animation. Current position:', camera.position);
                console.log('📷 Controls available:', !!controls);
                if (controls) {
                    console.log('📷 Current controls target:', controls.target);
                }
            }
            
            const startPos = camera.position.clone();
            const startTarget = controls ? controls.target.clone() : new this.THREE.Vector3(0, 0, 0);
            const endPos = new this.THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
            const endTarget = new this.THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z);
            const startTime = Date.now();
            
            if (DEBUG_SEARCH) {
                console.log('📷 Animation started from:', startPos, 'to:', endPos);
                console.log('📷 Target animation from:', startTarget, 'to:', endTarget);
                console.log('📷 Controls available for target animation:', !!controls);
            }
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / this.config.cameraAnimation.duration, 1);
                
                // Smooth easing
                const eased = 1 - Math.pow(1 - progress, 3);
                
                // Interpolate camera position - set directly
                camera.position.lerpVectors(startPos, endPos, eased);
                
                // Force camera position update to ensure it takes effect
                camera.updateMatrixWorld();
                
                // If no controls available, make camera look at target directly
                if (!controls) {
                    // Use camera.lookAt instead of controls
                    const currentTarget = new this.THREE.Vector3();
                    currentTarget.lerpVectors(startTarget, endTarget, eased);
                    camera.lookAt(currentTarget);
                    camera.updateMatrixWorld(); // Force update after lookAt
                    if (DEBUG_SEARCH && progress === 1) {
                        console.log('📷 Camera lookAt applied directly (no controls):', currentTarget);
                        console.log('📷 Final camera position set to:', camera.position.x, camera.position.y, camera.position.z);
                    }
                } else {
                    // Use controls if available
                    controls.target.lerpVectors(startTarget, endTarget, eased);
                    controls.update();
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    if (DEBUG_SEARCH) {
                        console.log('📷 Camera animation completed. Final position:', {x: camera.position.x, y: camera.position.y, z: camera.position.z});
                        if (controls) {
                            console.log('📷 Final target:', controls.target);
                        } else {
                            console.log('📷 Final lookAt target applied directly');
                        }
                    }
                }
            };
            
            animate();
        }
        
        /**
         * Restore camera to its original position and target
         */
        restoreCameraState() {
            if (DEBUG_SEARCH) console.log('📷 Starting camera state restoration...');
            
            // Re-enable camera resets when exiting search mode
            this.enableCameraResets();
            
            if (!this.originalCameraState) {
                if (DEBUG_SEARCH) console.log('📷 No camera state to restore - will just re-enable controls');
                return;
            }
            
            if (DEBUG_SEARCH) console.log('📷 Restoring camera to original state:', this.originalCameraState);
            
            const cameraManager = this.getCameraManager();
            if (!cameraManager) {
                if (DEBUG_SEARCH) console.log('⚠️  CameraManager not found for restoration');
                return;
            }
            
            // Get camera and controls
            let camera = null;
            let controls = null;
            
            if (cameraManager.camera) {
                camera = cameraManager.camera;
            } else if (window.app && window.app.camera) {
                camera = window.app.camera;
            } else if (this.stateManager && this.stateManager.camera) {
                camera = this.stateManager.camera;
            }
            
            if (cameraManager.controls) {
                controls = cameraManager.controls;
            } else if (window.app && window.app.controls) {
                controls = window.app.controls;
            } else if (this.stateManager && this.stateManager.controls) {
                controls = this.stateManager.controls;
            }
            
            if (camera && this.originalCameraState) {
                if (DEBUG_SEARCH) console.log('📷 Animating camera back to original position');
                this.animateCameraToPosition(
                    this.originalCameraState.position,
                    this.originalCameraState.target
                );
                
                // Clear stored state
                this.originalCameraState = null;
                if (DEBUG_SEARCH) console.log('📷 Camera state restoration initiated');
            } else {
                if (DEBUG_SEARCH) console.log('⚠️  Could not restore camera - missing camera or state');
            }
        }
        
        /**
         * Position camera for optimal viewing of search results on pedestals
         */
        positionCameraForSearchView() {
            console.log('� ===== SEARCH CAMERA POSITIONING STARTED =====');
            console.log('�📷 Positioning camera for search view');
            
            // Force DEBUG_SEARCH to true for troubleshooting
            const DEBUG_SEARCH = true;
            
            // Get sorting manager to determine pedestal positions
            const sortingManager = this.getSortingManager();
            if (!sortingManager) {
                console.warn('⚠️  Cannot position camera - SortingManager not available');
                return;
            }
            
            // Get actual pedestal positions from SortingManager if available
            let pedestalPositions = [];
            if (sortingManager.getPedestalPositions && typeof sortingManager.getPedestalPositions === 'function') {
                pedestalPositions = sortingManager.getPedestalPositions();
                if (DEBUG_SEARCH) console.log('📷 Got actual pedestal positions:', pedestalPositions);
            }
            
            // Calculate camera position based on actual or estimated pedestal layout
            let centerX = 0;
            let centerZ = 18; // Default based on observed positions
            let minX = -8;
            let maxX = 8;
            let minZ = 17;
            let maxZ = 21;
            
            if (pedestalPositions.length > 0) {
                // Use actual pedestal positions
                const xPositions = pedestalPositions.map(p => p.x);
                const zPositions = pedestalPositions.map(p => p.z);
                
                minX = Math.min(...xPositions);
                maxX = Math.max(...xPositions);
                minZ = Math.min(...zPositions);
                maxZ = Math.max(...zPositions);
                
                centerX = (minX + maxX) / 2;
                centerZ = (minZ + maxZ) / 2;
                
                if (DEBUG_SEARCH) {
                    console.log(`📷 Calculated bounds: X(${minX} to ${maxX}), Z(${minZ} to ${maxZ})`);
                    console.log(`📷 Center point: (${centerX}, ${centerZ})`);
                }
            } else {
                // Use semicircle positioning parameters that match SortingManager
                const homeAreaRadius = 15;
                const distanceFromHome = 18; // Updated to match SortingManager
                const semicircleRadius = 4; // Updated to match SortingManager
                
                // Calculate semicircle bounds
                minX = -semicircleRadius;
                maxX = semicircleRadius;
                minZ = distanceFromHome - semicircleRadius;
                maxZ = distanceFromHome + semicircleRadius;
                
                centerX = 0; // Semicircle is centered on X=0
                centerZ = distanceFromHome; // Center Z of the semicircle
                
                if (DEBUG_SEARCH) {
                    console.log('📷 Using semicircle pedestal positioning');
                    console.log(`📷 Semicircle center: (${centerX}, ${centerZ}), radius: ${semicircleRadius}`);
                }
            }
            
            // Calculate optimal camera position for semicircle viewing
            const totalWidth = maxX - minX;
            const totalDepth = maxZ - minZ;
            const pedestalHeight = 6; // Height of pedestals (matches SortingManager)
            
            // PRECISION POSITIONING: Align camera with DOCS and VIDEO file zone circles
            // DOCS zone center: (-16, 28), VIDEO zone center: (16, 28), Zone radius: 15
            // Center between zones: (0, 27.71), Outer edge at Z ≈ 43
            
            // Detect orientation for adaptive positioning
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2;
            
            const cameraX = 0; // Centered between DOCS and VIDEO zones
            const cameraY = 5; // Set to Y=5 as requested for both orientations
            
            // Landscape: Camera aligned with center of DOCS and VIDEO zone circles
            // Portrait: Camera aligned with outer edge of DOCS and VIDEO zone circles
            const docsVideoZoneCenterZ = 27.71; // Center between DOCS and VIDEO zones
            const docsVideoZoneOuterZ = 43; // Outer edge of zone circles
            
            const cameraZ = isLandscape ? docsVideoZoneCenterZ : docsVideoZoneOuterZ;
            
            // Target point is center of semicircle at same height as camera
            const targetX = centerX;
            const targetY = 5; // Look at Y=5 as requested
            const targetZ = centerZ;
            
            if (DEBUG_SEARCH) {
                console.log(`📷 Semicircle bounds: X(${minX} to ${maxX}), Z(${minZ} to ${maxZ})`);
                console.log(`📷 Semicircle dimensions: ${totalWidth} x ${totalDepth}`);
                console.log(`📷 DOCS/VIDEO ZONE ALIGNMENT: DOCS(-16,28), VIDEO(16,28), Center(0,27.71)`);
                console.log(`📷 ADAPTIVE POSITIONING: ${isLandscape ? 'Landscape' : 'Portrait'} mode detected`);
                console.log(`📷 Camera at Y=${cameraY}, looking at Y=${targetY} for optimal pedestal view`);
                console.log(`📷 Camera Z=${cameraZ} (${isLandscape ? 'center of' : 'outer edge of'} DOCS/VIDEO zones)`);
            }
            
            // Get camera for direct manipulation
            const cameraManager = this.getCameraManager();
            let camera = null;
            if (cameraManager && cameraManager.camera) {
                camera = cameraManager.camera;
            } else if (window.app && window.app.camera) {
                camera = window.app.camera;
            } else if (window.camera) {
                camera = window.camera;
            }
            
            if (!camera) {
                console.warn('⚠️  Could not access camera for direct positioning');
                return;
            }
            
            if (DEBUG_SEARCH) {
                const startPos = `${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`;
                const endPos = `${cameraX}, ${cameraY}, ${cameraZ}`;
                const distance = Math.sqrt(
                    Math.pow(cameraX - camera.position.x, 2) + 
                    Math.pow(cameraY - camera.position.y, 2) + 
                    Math.pow(cameraZ - camera.position.z, 2)
                );
                console.log(`📷 SEARCH VIEW CAMERA MOVE: From (${startPos}) to (${endPos})`);
                console.log(`📷 Total distance to travel: ${distance.toFixed(2)} units - Moving to front of pedestals`);
            }
            
            console.log(`📷 SEARCH CAMERA SET: Moving to (${cameraX}, ${cameraY}, ${cameraZ})`);
            console.log(`📷 SEARCH CAMERA SET: Looking at (${targetX}, ${targetY}, ${targetZ})`);
            console.log(`🔍 CALCULATION VERIFICATION: aspectRatio=${aspectRatio.toFixed(2)}, isLandscape=${isLandscape}`);
            console.log(`🔍 CALCULATION VERIFICATION: docsVideoZoneCenterZ=${docsVideoZoneCenterZ}, docsVideoZoneOuterZ=${docsVideoZoneOuterZ}`);
            
            // CRITICAL FIX: Set camera controls target FIRST to prevent override
            if (window.app && window.app.cameraControls) {
                console.log('🔍 FIXING CAMERA CONTROLS: Setting target to prevent override');
                console.log(`🎯 Setting camera controls target to: (${targetX}, ${targetY}, ${targetZ})`);
                
                // Set the target first so controls don't fight our positioning
                if (window.app.cameraControls.setTarget) {
                    window.app.cameraControls.setTarget(targetX, targetY, targetZ, false);
                    console.log('✅ Camera controls target set via setTarget()');
                } else if (window.app.cameraControls.target) {
                    window.app.cameraControls.target.set(targetX, targetY, targetZ);
                    console.log('✅ Camera controls target set via target property');
                }
                
                // Also set camera position directly (this should now stick)
                if (window.app.cameraControls.setPosition) {
                    window.app.cameraControls.setPosition(cameraX, cameraY, cameraZ, false);
                    console.log(`✅ Camera controls position set to: (${cameraX}, ${cameraY}, ${cameraZ})`);
                } else {
                    // Fallback to direct camera positioning
                    camera.position.set(cameraX, cameraY, cameraZ);
                    camera.lookAt(targetX, targetY, targetZ);
                    camera.updateMatrixWorld(true);
                    console.log(`✅ Direct camera position set to: (${cameraX}, ${cameraY}, ${cameraZ})`);
                }
                
                // Use optimized state sync instead of forced controls update
                if (window.CameraStateManager) {
                    window.CameraStateManager.syncCurrentState();
                    console.log('✅ Camera state synchronized - position should now be stable');
                } else {
                    // Fallback: Force controls update to apply changes
                    window.app.cameraControls.update(0);
                    console.log('✅ Camera controls updated - position should now be stable');
                }
            } else {
                // Fallback for direct camera manipulation
                console.log('⚠️ No camera controls found, using direct camera positioning');
                camera.position.set(cameraX, cameraY, cameraZ);
                camera.lookAt(targetX, targetY, targetZ);
                camera.updateMatrixWorld(true);
                camera.updateProjectionMatrix();
            }
            
            // IMMEDIATE VERIFICATION
            console.log(`🔍 IMMEDIATE CHECK: Camera position right after controls setup: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`);
            
            // Additional verification for camera controls state
            if (window.app && window.app.cameraControls) {
                if (window.app.cameraControls.target) {
                    console.log(`🎯 Camera controls target is now: (${window.app.cameraControls.target.x}, ${window.app.cameraControls.target.y}, ${window.app.cameraControls.target.z})`);
                }
                if (window.app.cameraControls.getTarget) {
                    const target = window.app.cameraControls.getTarget();
                    console.log(`🎯 Camera controls getTarget(): (${target.x}, ${target.y}, ${target.z})`);
                }
            }
            
            // Force renderer update if available
            if (window.app && window.app.renderer) {
                window.app.renderer.render(this.scene, camera);
                if (DEBUG_SEARCH) console.log('📷 Forced renderer update');
            }
            
            // Check if position was actually set
            if (DEBUG_SEARCH) {
                console.log(`📷 VERIFICATION: Camera position after search set: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`);
                console.log(`📷 VERIFICATION: Camera rotation: (${camera.rotation.x}, ${camera.rotation.y}, ${camera.rotation.z})`);
            }
            
            // Delayed check to see if something overrides our positioning
            setTimeout(() => {
                console.log(`🔍 DELAYED CHECK (500ms): Camera position: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`);
                if (camera.position.z !== cameraZ) {
                    console.warn(`⚠️ CAMERA POSITION OVERRIDE DETECTED! Expected Z=${cameraZ}, but got Z=${camera.position.z}`);
                    console.warn('⚠️ Something is overriding our camera positioning after we set it');
                    
                    // Try to set it again
                    console.log('� Attempting to restore camera position...');
                    camera.position.set(cameraX, cameraY, cameraZ);
                    camera.lookAt(targetX, targetY, targetZ);
                    camera.updateMatrixWorld(true);
                }
            }, 500);
            
            console.log('�📷 SEARCH CAMERA POSITIONING COMPLETED - controls remain active for interaction');
            console.log('🔍 ===== SEARCH CAMERA POSITIONING ENDED =====');
        }
        
        // ============================================================================
        // SEARCH DEACTIVATION & RESTORATION
        // ============================================================================
        
        /**
         * Deactivate search mode and restore object positions
         */
        async deactivateSearch() {
            console.log('🔚 SearchManager: Deactivating search');
            if (DEBUG_SEARCH) console.log('🔚 Search state before deactivation:', {
                isActive: this.searchState.isActive,
                query: this.searchState.currentQuery,
                resultsCount: this.searchState.results.length,
                originalPositionsCount: this.originalPositions.size
            });
            
            if (!this.searchState.isActive) {
                if (DEBUG_SEARCH) console.log('⚠️  Search not active - nothing to deactivate');
                return;
            }
            
            // Restore camera to original position first
            if (DEBUG_SEARCH) console.log('📷 Restoring camera to original position...');
            this.restoreCameraState();
            
            // End search session (remove pedestals) if using pedestal system
            if (DEBUG_SEARCH) console.log('🏗️  Ending search session and removing pedestals...');
            const sortingManager = this.getSortingManager();
            if (sortingManager && this.config.usePedestals) {
                if (DEBUG_SEARCH) console.log('✅ SortingManager found - calling endSearchSession()');
                sortingManager.endSearchSession();
            } else {
                if (DEBUG_SEARCH) console.log('⚠️  SortingManager not found or pedestals disabled');
            }
            
            // Only restore objects that are still in their search positions (not moved to Home Area)
            if (DEBUG_SEARCH) console.log(`📦 Checking ${this.searchState.results.length} objects for restoration...`);
            if (this.searchState.results.length > 0) {
                const restorationPromises = [];
                
                this.searchState.results.forEach(result => {
                    const fileObject = result.fileObject;
                    const fileId = fileObject.userData.fileData?.path || fileObject.userData.fileName || 'unknown';
                    const originalPos = this.originalPositions.get(fileId);
                    
                    if (originalPos) {
                        // Check if object is still in search area (not moved to Home Area)
                        const currentPos = fileObject.position;
                        const isInHomeArea = this.isObjectInHomeArea(currentPos);
                        
                        if (isInHomeArea) {
                            // Object was moved to Home Area during search - keep it there
                            const objectName = fileObject.userData.fileData?.name || 
                                             fileObject.userData.youtubeMetadata?.title ||
                                             fileObject.userData.spotifyMetadata?.title ||
                                             fileObject.userData.fileName || 'unnamed';
                            if (DEBUG_SEARCH) console.log(`🏠 Object ${objectName} is in Home Area - keeping there`);
                            // Remove from original positions so it stays in Home Area
                            this.originalPositions.delete(fileId);
                        } else {
                            // Object is still on pedestal - restore to original position
                            const objectName = fileObject.userData.fileData?.name || 
                                             fileObject.userData.youtubeMetadata?.title ||
                                             fileObject.userData.spotifyMetadata?.title ||
                                             fileObject.userData.fileName || 'unnamed';
                            if (DEBUG_SEARCH) console.log(`📍 Restoring ${objectName} to position:`, originalPos);
                            
                            // CRITICAL: Check if object was on furniture before search
                            const furnitureId = fileObject.userData.furnitureId;
                            const furnitureSlotIndex = fileObject.userData.furnitureSlotIndex;
                            
                            if (furnitureId && furnitureSlotIndex !== undefined && window.app?.furnitureManager) {
                                // Object was on furniture - need to re-parent it back to furniture group
                                if (DEBUG_SEARCH) console.log(`🪑 Object was on furniture ${furnitureId} slot ${furnitureSlotIndex} - re-parenting...`);
                                
                                const furnitureGroup = window.app.furnitureManager.visualManager?.getFurnitureGroup(furnitureId);
                                if (furnitureGroup) {
                                    // Re-parent object to furniture group
                                    furnitureGroup.add(fileObject);
                                    if (DEBUG_SEARCH) console.log(`🪑 Re-parented ${objectName} to furniture group`);
                                    
                                    // originalPos is already in LOCAL coordinates (stored before detaching)
                                    // so we can directly set the local position
                                    fileObject.position.set(originalPos.x, originalPos.y, originalPos.z);
                                    if (DEBUG_SEARCH) console.log(`🪑 Set LOCAL position to (${originalPos.x.toFixed(2)}, ${originalPos.y.toFixed(2)}, ${originalPos.z.toFixed(2)})`);
                                } else {
                                    console.warn(`⚠️  Furniture group ${furnitureId} not found - cannot re-parent object`);
                                    // Fall back to animating to world position
                                    restorationPromises.push(
                                        this.animateObjectToPosition(fileObject, originalPos.x, originalPos.y, originalPos.z)
                                    );
                                }
                            } else {
                                // Object was not on furniture - just animate to position
                                restorationPromises.push(
                                    this.animateObjectToPosition(fileObject, originalPos.x, originalPos.y, originalPos.z)
                                );
                            }
                        }
                    } else {
                        const objectName = fileObject.userData.fileData?.name || 
                                         fileObject.userData.youtubeMetadata?.title ||
                                         fileObject.userData.spotifyMetadata?.title ||
                                         fileObject.userData.fileName || 'unnamed';
                        if (DEBUG_SEARCH) console.log(`⚠️  No original position found for ${objectName}`);
                    }
                });
                
                if (restorationPromises.length > 0) {
                    if (DEBUG_SEARCH) console.log(`⏳ Waiting for ${restorationPromises.length} object animations to complete...`);
                    await Promise.all(restorationPromises);
                    if (DEBUG_SEARCH) console.log('✅ All object restorations completed');
                } else {
                    if (DEBUG_SEARCH) console.log('🏠 All objects were moved to Home Area or have no restoration needed');
                }
            } else {
                if (DEBUG_SEARCH) console.log('📭 No search results to restore');
            }
            
            // Clear search state
            if (DEBUG_SEARCH) console.log('🧹 Clearing search state...');
            this.searchState.isActive = false;
            this.searchState.currentQuery = '';
            this.searchState.results = [];
            this.originalPositions.clear();
            
            console.log('✅ SearchManager: Search deactivated successfully');
            if (DEBUG_SEARCH) console.log('🔚 Final search state:', {
                isActive: this.searchState.isActive,
                query: this.searchState.currentQuery,
                resultsCount: this.searchState.results.length,
                originalPositionsCount: this.originalPositions.size
            });
        }
        
        /**
         * Check if an object is in the Home Area
         * @param {Object} position - Object position {x, y, z}
         * @returns {boolean} True if object is in Home Area
         */
        isObjectInHomeArea(position) {
            // Home Area is roughly centered around (0, 0, 0) with same radius as SortingManager
            const homeAreaRadius = 15; // Match SortingManager's Home Area radius
            const distance = Math.sqrt(position.x * position.x + position.z * position.z);
            return distance <= homeAreaRadius;
        }
        
        // ============================================================================
        // PUBLIC API METHODS
        // ============================================================================
        
        /**
         * Check if search is currently active
         */
        isSearchActive() {
            return this.searchState.isActive;
        }
        
        /**
         * Get current search query
         */
        getCurrentQuery() {
            return this.searchState.currentQuery;
        }
        
        /**
         * Get current search results count
         */
        getResultsCount() {
            const count = this.searchState.results.length;
            if (DEBUG_SEARCH) console.log(`📊 getResultsCount() called - returning: ${count}`);
            if (DEBUG_SEARCH) console.log(`📊 Search state isActive: ${this.searchState.isActive}`);
            if (DEBUG_SEARCH) console.log(`📊 Current query: "${this.searchState.currentQuery}"`);
            return count;
        }
        
        /**
         * Check if search is currently active
         */
        isSearchActive() {
            const active = this.searchState.isActive;
            if (DEBUG_SEARCH) console.log(`📊 isSearchActive() called - returning: ${active}`);
            return active;
        }
        
        /**
         * Move a search result object to home area
         * @param {Object} fileObject - The file object to move
         */
        async moveResultToHomeArea(fileObject) {
            if (!this.searchState.isActive) return;
            
            // Find an open position in home area using spiral pattern
            const homeAreaPosition = this.findOpenPositionInHomeArea(fileObject);
            
            // Move to home area
            await this.animateObjectToPosition(fileObject, homeAreaPosition.x, homeAreaPosition.y, homeAreaPosition.z);
            
            // Remove from original positions so it won't be restored when search ends
            const fileId = fileObject.userData.fileData?.path || fileObject.userData.fileName || 'unknown';
            this.originalPositions.delete(fileId);
            
            console.log('SearchManager: Moved search result to home area:', fileObject.userData.fileData?.name || 'unnamed', 'at position:', homeAreaPosition);
        }
        
        /**
         * Find an open position in home area using spiral pattern
         * @param {Object} objectToMove - The object being moved (to exclude from collision check)
         * @returns {Object} Position {x, y, z}
         */
        findOpenPositionInHomeArea(objectToMove) {
            const homeAreaRadius = 15; // Match SortingManager's home area radius
            const objectSpacing = 3.0; // Standard spacing between objects
            const yPosition = 1; // Standard Y position for objects
            
            // Get all file objects in the scene
            const allObjects = this.stateManager ? this.stateManager.fileObjects : [];
            
            // Build list of occupied positions (excluding the object being moved)
            const occupiedPositions = allObjects
                .filter(obj => obj !== objectToMove && obj.position)
                .map(obj => ({
                    x: obj.position.x,
                    y: obj.position.y,
                    z: obj.position.z
                }));
            
            // Try center position first
            const centerPos = { x: 0, y: yPosition, z: 0 };
            if (!this.isPositionOccupiedInHomeArea(centerPos, occupiedPositions, objectSpacing)) {
                return centerPos;
            }
            
            // Try spiral pattern outward from center, staying within home area
            for (let radius = 1; radius <= Math.floor(homeAreaRadius / objectSpacing); radius++) {
                for (let angle = 0; angle < 360; angle += 45) {
                    const radians = (angle * Math.PI) / 180;
                    const x = radius * objectSpacing * Math.cos(radians);
                    const z = radius * objectSpacing * Math.sin(radians);
                    
                    // Check if position is within home area
                    const distance = Math.sqrt(x * x + z * z);
                    if (distance > homeAreaRadius) continue;
                    
                    const candidate = { x, y: yPosition, z };
                    
                    if (!this.isPositionOccupiedInHomeArea(candidate, occupiedPositions, objectSpacing)) {
                        return candidate;
                    }
                }
            }
            
            // Fallback to center if no open position found (rare case)
            console.warn('SearchManager: No open position found in home area, using center');
            return centerPos;
        }
        
        /**
         * Check if a position is occupied by another object
         * @param {Object} candidate - Position to check {x, y, z}
         * @param {Array} occupiedPositions - Array of occupied positions
         * @param {number} spacing - Minimum spacing between objects
         * @returns {boolean} True if position is occupied
         */
        isPositionOccupiedInHomeArea(candidate, occupiedPositions, spacing) {
            const tolerance = spacing * 0.8;
            
            return occupiedPositions.some(pos =>
                Math.abs(pos.x - candidate.x) < tolerance &&
                Math.abs(pos.z - candidate.z) < tolerance
            );
        }
        
        /**
         * Move object out of home area (will be automatically sorted if sorting is enabled)
         * @param {Object} fileObject - The file object to move
         */
        async moveResultOutOfHomeArea(fileObject) {
            if (!this.searchState.isActive) return;
            
            // Find a suitable position outside home area
            const sortingManager = this.getSortingManager();
            if (sortingManager && window.app && window.app.sortFileObjects) {
                // Let sorting manager handle positioning
                console.log('SearchManager: Moving object out of home area for auto-sorting:', fileObject.userData.fileData?.name || 'unnamed');
                // The sorting system will automatically place it in the appropriate zone
                // This would typically be triggered by the MoveManager when user drags the object
            } else {
                // Move to a neutral position outside home area
                await this.animateObjectToPosition(fileObject, 10, 1, 10);
                console.log('SearchManager: Moved object to neutral position:', fileObject.userData.fileData?.name || 'unnamed');
            }
        }
        
        /**
         * Enhanced arrange search results with metadata-based stacking
         */
        async arrangeSearchResultsOnPedestalsWithMetadataStacking() {
            console.log('🔍 SearchManager: Arranging search results with metadata-based stacking');
            
            const sortingManager = this.getSortingManager();
            if (!sortingManager) {
                console.warn('⚠️  SortingManager not available, falling back to grid arrangement');
                return this.arrangeSearchResultsInGrid();
            }
            
            // Group results by metadata for intelligent stacking
            const groupedResults = this.groupResultsByMetadata(this.searchState.results);
            if (DEBUG_SEARCH) console.log('📊 Results grouped by metadata:', groupedResults);
            
            // Start search session (create pedestals)
            console.log('🏗️  Starting search session with metadata stacking...');
            const success = sortingManager.startSearchSession();
            if (!success) {
                console.warn('❌ Failed to start search session, falling back to grid arrangement');
                return this.arrangeSearchResultsInGrid();
            }
            
            // Arrange grouped results on pedestals
            if (Object.keys(groupedResults).length > 0) {
                console.log(`📦 Arranging ${Object.keys(groupedResults).length} groups on pedestals...`);
                const arranged = sortingManager.arrangeGroupedSearchResultsOnPedestals(groupedResults);
                if (!arranged) {
                    console.warn('❌ Failed to arrange grouped results, falling back to standard arrangement');
                    return sortingManager.arrangeSearchResultsOnPedestals(this.searchState.results);
                }
                console.log('✅ SearchManager: Grouped search results arranged on pedestals');
            } else {
                console.log('📭 SearchManager: No grouped results to arrange - pedestals remain empty');
            }
        }
        
        /**
         * Group search results by metadata for intelligent stacking
         * @param {Array} results - Search results array
         * @returns {Object} Grouped results by metadata categories
         */
        groupResultsByMetadata(results) {
            const groups = {};
            
            results.forEach(result => {
                const fileData = result.fileObject.userData.fileData;
                if (!fileData) return;
                
                // Group by file type first
                const fileType = this.getFileCategory(fileData.extension || fileData.name);
                
                // Then by date if available (group by month/year)
                let dateGroup = 'unknown-date';
                if (fileData.lastModified) {
                    const date = new Date(fileData.lastModified);
                    dateGroup = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                } else if (fileData.dateModified) {
                    const date = new Date(fileData.dateModified);
                    dateGroup = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
                    const nameA = a.fileObject.userData.fileData?.name || '';
                    const nameB = b.fileObject.userData.fileData?.name || '';
                    return nameA.localeCompare(nameB);
                });
            });
            
            return groups;
        }
        
        /**
         * Get file category for grouping
         * @param {string} extensionOrName - File extension or name
         * @returns {string} Category name
         */
        getFileCategory(extensionOrName) {
            if (!extensionOrName) return 'unknown';
            
            const ext = extensionOrName.toLowerCase();
            
            // Image files
            if (/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/.test(ext)) {
                return 'images';
            }
            
            // Audio files
            if (/\.(mp3|wav|flac|aac|ogg|m4a)$/.test(ext)) {
                return 'music';
            }
            
            // Video files
            if (/\.(mp4|avi|mkv|mov|wmv|flv|webm)$/.test(ext)) {
                return 'videos';
            }
            
            // Document files
            if (/\.(pdf|doc|docx|txt|rtf|odt)$/.test(ext)) {
                return 'documents';
            }
            
            // Spreadsheet files
            if (/\.(xls|xlsx|csv|ods)$/.test(ext)) {
                return 'spreadsheets';
            }
            
            // Presentation files
            if (/\.(ppt|pptx|odp)$/.test(ext)) {
                return 'presentations';
            }
            
            return 'other';
        }
        
        /**
         * Clear search without animation (for emergency cleanup)
         */
        clearSearch() {
            this.searchState.isActive = false;
            this.searchState.currentQuery = '';
            this.searchState.results = [];
            this.originalPositions.clear();
        }
        
        // ============================================================================
        // UNIFIED STACKING CONFIGURATION - Links Advanced Options to Search Results
        // ============================================================================
        
        /**
         * Update unified stacking configuration (applies to both sorting and searching)
         * @param {Object} newConfig - New stacking configuration
         * @returns {boolean} True if successful
         */
        updateUnifiedStackingConfig(newConfig) {
            if (DEBUG_SEARCH) console.log('🔧 SearchManager: Updating unified stacking configuration:', newConfig);
            
            const sortingManager = this.getSortingManager();
            if (!sortingManager) {
                console.warn('⚠️  SortingManager not available for configuration update');
                return false;
            }
            
            // Update the SortingManager configuration (this is the source of truth)
            const success = sortingManager.updateStackingConfig(newConfig);
            if (success) {
                console.log('✅ Unified stacking configuration updated - applies to both sorting and searching');
                
                // If search is currently active, re-arrange results with new configuration
                if (this.searchState.isActive && this.searchState.results.length > 0) {
                    if (DEBUG_SEARCH) console.log('🔄 Re-arranging active search results with new stacking configuration...');
                    this.arrangeSearchResultsOnPedestals();
                }
            } else {
                console.error('❌ Failed to update unified stacking configuration');
            }
            
            return success;
        }
        
        /**
         * Get current unified stacking configuration
         * @returns {Object} Current stacking configuration
         */
        getUnifiedStackingConfig() {
            const sortingManager = this.getSortingManager();
            if (!sortingManager) {
                console.warn('⚠️  SortingManager not available for configuration retrieval');
                return null;
            }
            
            return sortingManager.getStackingConfig();
        }
        
        /**
         * Apply unified stacking configuration (triggers re-arrangement for both sorting and searching)
         * @returns {boolean} True if successful
         */
        applyUnifiedStackingConfig() {
            if (DEBUG_SEARCH) console.log('🔄 Applying unified stacking configuration to all systems...');
            
            const sortingManager = this.getSortingManager();
            if (!sortingManager) {
                console.warn('⚠️  SortingManager not available for configuration application');
                return false;
            }
            
            // Apply to sorting system
            const sortingSuccess = sortingManager.applyStackingConfiguration();
            
            // Apply to search system if active
            let searchSuccess = true;
            if (this.searchState.isActive && this.searchState.results.length > 0) {
                if (DEBUG_SEARCH) console.log('🔍 Re-arranging search results with updated configuration...');
                searchSuccess = this.arrangeSearchResultsOnPedestals();
            }
            
            const success = sortingSuccess && searchSuccess;
            if (success) {
                console.log('✅ Unified stacking configuration applied to all systems');
            } else {
                console.error('❌ Failed to apply unified stacking configuration to all systems');
            }
            
            return success;
        }
    }
    
    // ============================================================================
    // MODULE INITIALIZATION
    // ============================================================================
    
    // Wait for dependencies
    if (typeof window.SharedStateManager === 'undefined') {
        console.error('SearchManager: SharedStateManager not found');
        return;
    }
    
    // Export SearchManager
    window.SearchManager = SearchManager;
    console.log("SearchManager module loaded successfully");
    
})();
