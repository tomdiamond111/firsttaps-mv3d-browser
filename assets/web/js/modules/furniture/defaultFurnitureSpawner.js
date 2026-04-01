/**
 * DEFAULT FURNITURE SPAWNER
 * Creates default furniture pieces during onboarding (first app launch)
 * - 1 Bookshelf (left side)
 * - 1 Riser (left of center)
 * - 1 Gallery Wall (CENTER - FOCAL POINT)
 * - 1 Small Stage (right of center)
 * - 1 Amphitheatre (behind camera)
 * 
 * Gallery Wall is positioned directly in front of camera for maximum visibility
 * Demo content is automatically populated on each furniture piece
 */

(function() {
    'use strict';

    console.log('🪑 Loading Default Furniture Spawner...');

    class DefaultFurnitureSpawner {
        constructor(furnitureManager, app = null) {
            this.furnitureManager = furnitureManager;
            this.app = app || window.app; // Store app reference for URLManager access
            this.homeAreaRadius = 15; // Home area radius (protected zone)
            // New optimized positions for Gallery Wall focus
        }

        /**
         * Check if this is the first app install (no furniture exists yet)
         * @returns {boolean} True if this is first install
         */
        async isFirstInstall() {
            if (!this.furnitureManager || !this.furnitureManager.storageManager) {
                return true; // If manager not ready, assume first install
            }
            
            const allFurniture = this.furnitureManager.storageManager.furniture;
            const furnitureCount = allFurniture.size;
            
            // Check for marker that tracks if we've done first install
            const hasCompletedFirstInstall = localStorage.getItem('mv3d_default_furniture_created') === 'true';
            
            console.log(`🪑 First install check: marker=${hasCompletedFirstInstall}, furniture count=${furnitureCount}`);
            
            // It's first install if we have no marker AND no furniture
            return !hasCompletedFirstInstall && furnitureCount === 0;
        }
        
        /**
         * Check if default furniture has already been created
         * @returns {Promise<boolean>} True if default furniture exists
         */
        async hasDefaultFurniture() {
            const firstInstall = await this.isFirstInstall();
            return !firstInstall; // Has furniture if NOT first install
        }
        
        /**
         * Check if furniture has any objects seated on it
         * @returns {Promise<boolean>} True if no objects are seated
         */
        async isFurnitureEmpty() {
            // Check if any link objects exist in the scene with furniture metadata
            const fileObjectManager = this.app?.fileObjectManager;
            if (!fileObjectManager) {
                console.log('🪑 FileObjectManager not available for empty check');
                return true; // Assume empty if can't check
            }
            
            const fileObjects = fileObjectManager.fileObjects || [];
            console.log(`🪑 Checking ${fileObjects.length} objects for furniture seating`);
            
            // Count objects that are seated on furniture
            let seatedCount = 0;
            for (const obj of fileObjects) {
                if (obj.userData?.furnitureId || obj.userData?.slotIndex !== undefined) {
                    seatedCount++;
                    console.log(`🪑 Found seated object: ${obj.userData.fileName || 'unknown'} on furniture ${obj.userData.furnitureId}`);
                }
            }
            
            console.log(`🪑 Furniture seating check: ${seatedCount} objects seated`);
            return seatedCount === 0;
        }
        
        /**
         * Check if any demo files exist in the scene
         * @returns {Promise<boolean>} True if demo files found
         */
        async hasDemoFiles() {
            const stateManager = this.app?.stateManager || window.app?.stateManager;
            if (!stateManager) {
                console.log('🪑 StateManager not available for demo file check');
                return false;
            }
            
            // Check fileObjects (links AND media) for demo content
            const fileObjects = stateManager.fileObjects || [];
            const demoFileCount = fileObjects.filter(obj => 
                obj.userData?.isDemoContent === true
            ).length;
            
            // ALSO check media objects (mp3/mp4) by path
            const mediaObjects = this.app?.fileObjectManager?.fileObjects || [];
            const demoMediaCount = mediaObjects.filter(obj => {
                const path = obj.userData?.path || '';
                const isDemo = path.startsWith('assets/demomedia/') || obj.userData?.isDemoContent === true;
                return isDemo;
            }).length;
            
            const totalDemoCount = demoFileCount + demoMediaCount;
            console.log(`🪑 Demo file check: found ${demoFileCount} demo links + ${demoMediaCount} demo media = ${totalDemoCount} total`);
            return totalDemoCount > 0;
        }

        /**
         * Merge API-based recommendations with hardcoded content for platform diversity
         * @param {Object} dartRecs - API recommendations (YouTube, Dailymotion from Dart)
         * @param {Object} demoPlaylists - Hardcoded playlists (Vimeo, TikTok, Instagram, Spotify)
         * @returns {Object} Merged playlists
         */
        _mergePlaylists(dartRecs, demoPlaylists) {
            console.log('🔀 Merging playlists...');
            
            if (!demoPlaylists) {
                console.warn('⚠️ No DEMO_PLAYLISTS available, using only Dart recommendations');
                return dartRecs || {};
            }
            
            const merged = {};
            
            // Process each furniture type
            Object.entries(demoPlaylists).forEach(([playlistKey, demoPlaylist]) => {
                const furnitureType = demoPlaylist.furnitureType;
                console.log(`   Processing ${furnitureType}...`);
                
                // Find matching Dart recommendations for this furniture type
                const dartPlaylist = dartRecs && Object.values(dartRecs).find(
                    p => p.furnitureType === furnitureType
                );
                
                // PRIORITY: Use Dart recommendations if available (contains mixed platform distribution)
                // Dart now provides: YouTube, TikTok, Instagram, Vimeo, Dailymotion, Spotify, Deezer
                let finalLinks = [];
                
                if (dartPlaylist && dartPlaylist.links && dartPlaylist.links.length > 0) {
                    // Use Dart recommendations as-is (already has controlled platform distribution)
                    finalLinks = dartPlaylist.links;
                    console.log(`     ✅ Using ${finalLinks.length} links from Dart (mixed platforms)`);
                } else {
                    // Fallback: Use hardcoded content if Dart recommendations not available
                    const hardcodedLinks = demoPlaylist.links || [];
                    finalLinks = hardcodedLinks;
                    console.log(`     ⚠️ Dart unavailable - using ${finalLinks.length} hardcoded links`);
                }
                
                // Limit to reasonable count per furniture type
                const maxLinks = furnitureType === 'gallery_wall' ? 10 : 
                                furnitureType === 'stage_small' ? 30 :  // Increased from 13 to 30
                                furnitureType === 'riser' ? 40 :        // Increased from 18 to 40
                                furnitureType === 'amphitheatre' ? 15 : // Limited for performance
                                10;
                finalLinks = finalLinks.slice(0, maxLinks);
                
                merged[playlistKey] = {
                    ...demoPlaylist,
                    links: finalLinks
                };
            });
            
            console.log(`✅ Merge complete: ${Object.keys(merged).length} playlists ready`);
            return merged;
        }

        /**
         * Wait for Dart recommendations to be injected into window.DART_RECOMMENDATIONS
         * Polls every 100ms for up to maxWait milliseconds
         * @param {number} maxWait - Maximum time to wait in milliseconds (default 3000)
         * @returns {Promise<boolean>} True if recommendations found, false if timeout
         */
        async waitForDartRecommendations(maxWait = 3000) {
            const startTime = Date.now();
            const pollInterval = 100; // Check every 100ms
            
            while (Date.now() - startTime < maxWait) {
                // Check if Dart recommendations are available
                if (window.DART_RECOMMENDATIONS && Object.keys(window.DART_RECOMMENDATIONS).length > 0) {
                    const elapsed = Date.now() - startTime;
                    console.log(`✅ Dart recommendations found after ${elapsed}ms`);
                    return true;
                }
                
                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
            
            // Timeout - no recommendations found
            console.log(`⏱️ Timeout after ${maxWait}ms - no Dart recommendations available`);
            return false;
        }

        /**
         * FIRST INSTALL: Create default furniture pieces with demo content
         * Called ONLY on first app launch when no furniture exists
         * @returns {Promise<boolean>} Success
         */
        async runFirstInstallSetup() {
            if (!this.furnitureManager) {
                console.error('🪑 [FIRST INSTALL] FurnitureManager not available');
                return false;
            }

            console.log('🪑 [FIRST INSTALL] Creating default furniture + demo content...');
            
            // DEFERRED METADATA: Skip metadata fetching during first install for fast loading
            // Objects will be created with minimal data, then enriched in background
            console.log('⚡ [DEFERRED] Enabling fast mode - metadata will load in background');
            window.skipMetadataFetching = true;
            
            // SUPPRESS NOTIFICATIONS: Set flag to prevent snackbar spam during first install
            window._firstInstallInProgress = true;
            
            // CRITICAL: Disable interactions during furniture creation to prevent menu dialogs
            const originalInteractionsDisabled = window.interactionsDisabled;
            window.interactionsDisabled = true;

            try {
                // Define furniture configs with optimized positions
                const furnitureConfigs = this.getDefaultFurnitureConfigs();
                
                // Create each furniture piece and store references
                const createdFurniture = [];
                for (const config of furnitureConfigs) {
                    const furniture = await this.furnitureManager.createFurniture(config);
                    if (furniture) {
                        // CRITICAL: Mark furniture as demo furniture for copy-on-modify feature
                        furniture.isDemoFurniture = true;
                        furniture.originalDemoType = config.type;
                        furniture.isModified = false;
                        
                        // Save the updated furniture with demo flags
                        await this.furnitureManager.storageManager.updateFurniture(furniture);
                        
                        console.log(`🪑 [FIRST INSTALL] Created ${config.type}: ${furniture.id} (marked as demo)`);
                        createdFurniture.push(furniture);
                    } else {
                        console.warn(`🪑 [FIRST INSTALL] Failed to create ${config.type}`);
                    }
                }
                
                // Wait for furniture to fully settle
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Populate furniture with demo content
                console.log('🪑 [FIRST INSTALL] Populating furniture with demo media...');
                await this.populateFurnitureWithDemoContent(createdFurniture);
                
                // Set marker in localStorage to track that first install is complete
                localStorage.setItem('mv3d_default_furniture_created', 'true');
                
                // DEFERRED METADATA: Re-enable metadata fetching and start background enrichment
                console.log('⚡ [DEFERRED] First install complete, starting background metadata enrichment...');
                window.skipMetadataFetching = false;
                
                // SUPPRESS NOTIFICATIONS: Wait for all async notifications to complete before re-enabling
                console.log('⏸️ Waiting for pending notifications to complete...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // SUPPRESS NOTIFICATIONS: Re-enable notifications
                window._firstInstallInProgress = false;
                console.log('✅ Notifications re-enabled');
                
                // Start background metadata enrichment after a short delay
                setTimeout(() => {
                    this.enrichAllLinkMetadata();
                }, 2000); // Wait 2 seconds for world to stabilize
                
                // Re-enable interactions after a short delay
                setTimeout(() => {
                    window.interactionsDisabled = originalInteractionsDisabled || false;
                }, 500);
                
                console.log('🪑 [FIRST INSTALL] ✅ Complete - furniture + demo content created');
                return true;
            } catch (error) {
                console.error('🪑 [FIRST INSTALL] Error:', error);
                window.skipMetadataFetching = false;
                window._firstInstallInProgress = false;
                window.interactionsDisabled = originalInteractionsDisabled || false;
                return false;
            }
        }
        
        /**
         * SECOND LOAD+: Demo content is first-install-only
         * Called on every app load AFTER first install
         * DISABLED: Demo files no longer recreated on subsequent loads (by design)
         * @returns {Promise<boolean>} Success
         */
        async runSubsequentLoadSetup() {
            console.log('🪑 [SUBSEQUENT LOAD] Demo content is first-install-only - skipping recreation');
            console.log('🪑 [SUBSEQUENT LOAD] User-added media files persist normally across loads');
            
            // DESIGN DECISION: Demo files are intentionally NOT recreated on subsequent loads
            // Reasons:
            // 1. Gives users a clean preview on first install only
            // 2. Avoids ID mismatch issues with media preview system
            // 3. Doesn't clutter user's library with unwanted content
            // 4. User-added MP3/MP4 files persist correctly
            
            return true; // Success - nothing to do
        }
        
        /**
         * CHECK FOR MODIFIED DEMO FURNITURE and spawn fresh copies
         * This implements the "copy-on-modify" feature:
         * - If user modifies demo furniture (adds/removes objects), mark it as modified
         * - Spawn fresh demo furniture with new recommendations alongside modified version
         * - User keeps both their customized furniture AND fresh demo content
         * 
         * @returns {Promise<void>}
         */
        async checkAndSpawnFreshDemoFurniture() {
            if (!this.furnitureManager || !this.furnitureManager.storageManager) {
                console.warn('🪑 [COPY-ON-MODIFY] FurnitureManager not available');
                return;
            }
            
            const allFurniture = Array.from(this.furnitureManager.storageManager.furniture.values());
            const modifiedDemoFurniture = allFurniture.filter(f => 
                f.isDemoFurniture && f.isModified
            );
            
            if (modifiedDemoFurniture.length === 0) {
                console.log('🪑 [COPY-ON-MODIFY] No modified demo furniture found - all good!');
                return;
            }
            
            console.log(`🪑 [COPY-ON-MODIFY] Found ${modifiedDemoFurniture.length} modified demo furniture pieces`);
            console.log('🪑 [COPY-ON-MODIFY] Spawning fresh demo furniture with new recommendations...');
            
            // CRITICAL: Disable interactions during furniture creation
            const originalInteractionsDisabled = window.interactionsDisabled;
            window.interactionsDisabled = true;
            
            try {
                const furnitureConfigs = this.getDefaultFurnitureConfigs();
                const createdFreshFurniture = [];
                
                for (const modifiedFurniture of modifiedDemoFurniture) {
                    // Find matching config for this demo type
                    const matchingConfig = furnitureConfigs.find(
                        config => config.type === modifiedFurniture.originalDemoType
                    );
                    
                    if (!matchingConfig) {
                        console.warn(`🪑 [COPY-ON-MODIFY] No config found for type: ${modifiedFurniture.originalDemoType}`);
                        continue;
                    }
                    
                    // Offset position so fresh furniture doesn't overlap modified version
                    // Place fresh furniture 40 units to the right
                    const freshConfig = {
                        ...matchingConfig,
                        position: {
                            x: matchingConfig.position.x + 40,
                            y: matchingConfig.position.y,
                            z: matchingConfig.position.z
                        }
                    };
                    
                    // Create fresh demo furniture
                    const freshFurniture = await this.furnitureManager.createFurniture(freshConfig);
                    if (freshFurniture) {
                        // Mark as demo furniture
                        freshFurniture.isDemoFurniture = true;
                        freshFurniture.originalDemoType = freshConfig.type;
                        freshFurniture.isModified = false;
                        
                        await this.furnitureManager.storageManager.updateFurniture(freshFurniture);
                        
                        console.log(`🪑 [COPY-ON-MODIFY] Created fresh ${freshConfig.type}: ${freshFurniture.id}`);
                        createdFreshFurniture.push(freshFurniture);
                        
                        // CRITICAL: Unmark the modified furniture as demo (it's now user furniture)
                        modifiedFurniture.isDemoFurniture = false;
                        await this.furnitureManager.storageManager.updateFurniture(modifiedFurniture);
                        console.log(`🪑 [COPY-ON-MODIFY] Unmarked modified ${modifiedFurniture.type} as demo (now user furniture)`);
                    }
                }
                
                // Wait for furniture to settle
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Populate fresh furniture with demo content
                if (createdFreshFurniture.length > 0) {
                    console.log(`🪑 [COPY-ON-MODIFY] Populating ${createdFreshFurniture.length} fresh furniture pieces...`);
                    await this.populateFurnitureWithDemoContent(createdFreshFurniture);
                }
                
                // Re-enable interactions
                setTimeout(() => {
                    window.interactionsDisabled = originalInteractionsDisabled || false;
                }, 500);
                
                console.log('🪑 [COPY-ON-MODIFY] ✅ Fresh demo furniture spawned successfully');
            } catch (error) {
                console.error('🪑 [COPY-ON-MODIFY] Error:', error);
                window.interactionsDisabled = originalInteractionsDisabled || false;
            }
        }
        
        /**
         * Get default furniture configuration with optimized layout
         * 
         * OPTIMIZED LAYOUT for Gallery Wall focus:
         * - Gallery Wall: CENTER (x:0, z:5) - FOCAL POINT facing camera
         * - Choir Riser: LEFT (x:-10, z:6) - Supporting content
         * - Small Stage: RIGHT (x:10, z:6) - Supporting content
         * - Amphitheatre: BACK (x:0, z:-20) - Behind camera view
         * - Bookshelf: LEFT SIDE (x:-15, z:10) - Additional content
         */
        getDefaultFurnitureConfigs() {
            const configs = [
                // GALLERY WALL - BEHIND HOME ZONE (FOCAL POINT)
                {
                    type: window.FURNITURE_TYPES.GALLERY_WALL,
                    position: { x: 0, y: 0, z: -15 }, // Slightly inside home area for immediate visibility
                    rotation: 0, // Face camera directly
                    style: 'metal',
                    sortingCriteria: window.SORTING_CRITERIA.TITLE,
                    playlistName: 'topHitsMix' // Link to demo playlist
                },
                
                // CHOIR RISER - FAR LEFT
                {
                    type: window.FURNITURE_TYPES.RISER,
                    position: { x: -35, y: 0, z: 15 }, // 35+ units spacing (was x:-25, z:10)
                    rotation: Math.PI / 6, // Angle toward camera
                    style: 'marble',
                    sortingCriteria: window.SORTING_CRITERIA.TITLE,
                    playlistName: 'chillVibes' // Link to demo playlist
                },
                
                // SMALL STAGE - FAR RIGHT
                {
                    type: window.FURNITURE_TYPES.STAGE_SMALL,
                    position: { x: 35, y: 0, z: 15 }, // 35+ units spacing (was x:25, z:10)
                    rotation: -Math.PI / 6, // Angle toward camera
                    style: 'woodgrain',
                    sortingCriteria: window.SORTING_CRITERIA.TITLE,
                    playlistName: 'shortsAndReels' // Link to demo playlist
                },
                
                // AMPHITHEATRE - FAR BACK
                {
                    type: window.FURNITURE_TYPES.AMPHITHEATRE,
                    position: { x: 0, y: 0, z: -60 }, // Very far back, maximum separation from home area
                    rotation: Math.PI, // Face forward (away from camera)
                    style: 'marble',
                    sortingCriteria: window.SORTING_CRITERIA.TITLE
                    // No demo content - empty for user's own content
                },
                
                // BOOKSHELF - LEFT FORWARD
                {
                    type: window.FURNITURE_TYPES.BOOKSHELF,
                    position: { x: -30, y: 0, z: 35 }, // More spacing (was x:-20, z:30)
                    rotation: Math.PI / 4, // Angle toward center
                    style: 'modern',
                    sortingCriteria: window.SORTING_CRITERIA.TITLE
                    // No demo content - empty for user's own content
                }
            ];
            
            return configs;
        }
        
        /**
         * Populate furniture with demo content from DEMO_PLAYLISTS config
         * Creates link objects using urlManager (like DefaultLinkInitializer does)
         * Then assigns them to furniture slots
         * 
         * CRITICAL FIX: Batch create ALL demo files at once to avoid clearFileObjects() wiping them
         * 
         * ✨ ENHANCEMENT: Uses Dart recommendations if available, falls back to hardcoded playlists
         * 
         * @param {Array} createdFurniture - Optional array of furniture. If not provided, uses existing furniture from storage
         */
        async populateFurnitureWithDemoContent(createdFurniture = null) {
            // CRITICAL: Prevent multiple simultaneous calls (Dart may trigger multiple times)
            if (window._populatingDemoContent) {
                console.warn('🪑 ⚠️ Demo content population already in progress - ignoring duplicate call');
                return;
            }
            
            window._populatingDemoContent = true;
            
            try {
                console.log('🎵 Populating furniture with demo content...');
                
                // If no furniture provided, get existing furniture from storage
                if (!createdFurniture || createdFurniture.length === 0) {
                    console.log('🎵 No furniture array provided - fetching from storage...');
                    const allFurniture = Array.from(this.furnitureManager.storageManager.furniture.values());
                    createdFurniture = allFurniture;
                    console.log(`🎵 Found ${createdFurniture.length} furniture pieces in storage`);
                }
                
                if (!createdFurniture || createdFurniture.length === 0) {
                    console.warn('🎵 No furniture available - cannot populate demo content');
                    return;
                }
                
                // SMART MERGE: Combine API content (YouTube) with hardcoded content (Vimeo, TikTok, Instagram, Spotify)
                console.log('🎨 Merging API recommendations with hardcoded platform content...');
            
            // Wait for Dart recommendations (should be pre-loaded by browserRecommendationsFetcher)
            // Check if already available, otherwise wait up to 1 second
            if (!window.DART_RECOMMENDATIONS || Object.keys(window.DART_RECOMMENDATIONS).length === 0) {
                console.log('⏳ DART_RECOMMENDATIONS not yet available, waiting...');
                const waited = await this.waitForDartRecommendations(1000);
                if (!waited) {
                    console.warn('⚠️ DART_RECOMMENDATIONS not available after wait - using hardcoded only');
                }
            } else {
                console.log('✅ DART_RECOMMENDATIONS already available');
            }
            
            const playlistSource = this._mergePlaylists(
                window.DART_RECOMMENDATIONS,
                window.DEMO_PLAYLISTS
            );
            
            if (!playlistSource || Object.keys(playlistSource).length === 0) {
                console.error('❌ No playlist source available - cannot populate demo content');
                return;
            }
            
            console.log(`📋 Using merged playlists with ${Object.keys(playlistSource).length} furniture types`);
            console.log(`   Available playlists: ${Object.keys(playlistSource).join(', ')}`);
            
            // Verify urlManager is available
            const urlManager = this.app?.urlManager || window.app?.urlManager;
            if (!urlManager) {
                console.error('🎵 URLManager not available - cannot create demo links');
                console.error('🎵 this.app:', this.app);
                console.error('🎵 window.app:', window.app);
                console.error('🎵 window.app.urlManager:', window.app?.urlManager);
                return;
            }
            
            console.log('✅ URLManager found, proceeding with demo content creation');
            
            // PHASE 1: Collect ALL demo files data from all furniture
            const allDemoFilesData = [];
            const demoFileMetadata = []; // Store metadata for positioning after batch creation
            
            for (const furniture of createdFurniture) {
                // SKIP MODIFIED FURNITURE: Don't repopulate furniture that user has modified
                if (furniture.isModified === true) {
                    console.log(`🪑 Skipping furniture ${furniture.id} - marked as modified by user`);
                    continue;
                }
                
                // Find matching playlist for this furniture
                const playlist = Object.values(playlistSource).find(
                    p => p.furnitureType === furniture.type
                );
                
                if (!playlist || !playlist.links || playlist.links.length === 0) {
                    continue;
                }
                
                const slotPositions = furniture.positions || [];
                if (slotPositions.length === 0) {
                    console.warn(`🎵 Furniture ${furniture.id} has no slot positions available`);
                    continue;
                }
                
                const linksToCreate = Math.min(playlist.links.length, slotPositions.length);
                
                for (let i = 0; i < linksToCreate; i++) {
                    // SKIP OCCUPIED SLOTS: Don't overwrite slots that already have objects
                    if (furniture.objectIds && furniture.objectIds[i] && furniture.objectIds[i] !== null && furniture.objectIds[i] !== '') {
                        console.log(`🪑 Skipping slot ${i} on furniture ${furniture.id} - already occupied by ${furniture.objectIds[i]}`);
                        continue;
                    }
                    
                    const link = playlist.links[i];
                    const slotPos = slotPositions[i];
                    
                    if (link.startsWith('assets/demomedia/')) {
                        // Prepare file data for batch creation
                        const filename = link.split('/').pop();
                        const extension = filename.split('.').pop().toLowerCase();
                        const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];
                        const videoExts = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
                        const isAudio = audioExts.includes(extension);
                        const isVideo = videoExts.includes(extension);
                        const fileType = isAudio ? 'audio' : isVideo ? 'video' : 'file';
                        
                        // CRITICAL DIAGNOSTIC: Check if Flutter injection succeeded
                        console.log(`🔍 [DEMO] window.DEMO_THUMBNAIL_DATA_URLS exists: ${!!window.DEMO_THUMBNAIL_DATA_URLS}`);
                        console.log(`🔍 [DEMO] window.DEMO_ASSET_DATA_URLS exists: ${!!window.DEMO_ASSET_DATA_URLS}`);
                        if (window.DEMO_THUMBNAIL_DATA_URLS) {
                            console.log(`🔍 [DEMO] Available thumbnail keys:`, Object.keys(window.DEMO_THUMBNAIL_DATA_URLS));
                            console.log(`🔍 [DEMO] Looking for key: ${link}`);
                        }
                        
                        // CRITICAL: Get thumbnail data URL for face texture (image/jpeg)
                        const thumbnailDataUrl = window.DEMO_THUMBNAIL_DATA_URLS?.[link] || null;
                        
                        console.log(`🔍🔍🔍 [DEMO CREATE] Creating demo file: ${filename}`);
                        console.log(`🔍🔍🔍 [DEMO CREATE] window.DEMO_THUMBNAIL_DATA_URLS exists:`, !!window.DEMO_THUMBNAIL_DATA_URLS);
                        console.log(`🔍🔍🔍 [DEMO CREATE] thumbnailDataUrl value:`, thumbnailDataUrl ? `YES (${(thumbnailDataUrl.length / 1024).toFixed(2)} KB)` : 'NULL/UNDEFINED');
                        
                        if (!thumbnailDataUrl) {
                            console.warn(`⚠️ [DEMO CREATE] NO THUMBNAIL for: ${link} (will use colored fallback)`);
                        }
                        
                        // CRITICAL: Use STABLE IDs for demo files so furniture can find them across app restarts
                        // Don't use Date.now() or any timestamp - use furniture ID + slot index for stability
                        const uniqueId = `demo_${furniture.id}_slot${i}_${filename.replace(/[^a-zA-Z0-9]/g, '_')}`;
                        const fileData = {
                            id: uniqueId,
                            path: link,
                            name: filename,
                            extension: '.' + extension,
                            size: 0,
                            lastModified: Date.now(),
                            type: fileType,
                            mimeType: `${fileType}/${extension}`,
                            isDemoContent: true,
                            // ✅ CRITICAL: Use thumbnail data URL for face texture system (image/jpeg)
                            // Media playback will look up full media from DEMO_ASSET_DATA_URLS using the path
                            thumbnailDataUrl: thumbnailDataUrl,
                            url: link, // Ensure URL is set for media preview
                            x: 0,
                            y: 1.5,
                            z: 0,
                            furnitureId: furniture.id,
                            furnitureSlotIndex: i
                        };
                        
                        allDemoFilesData.push(fileData);
                        demoFileMetadata.push({
                            fileData,
                            furniture,
                            slotPosition: slotPos,
                            slotIndex: i
                        });
                        
                        console.log(`📦 Prepared demo file data: ${filename} for ${furniture.type} slot ${i}`);
                    }
                }
            }
            
            // PHASE 2: Create ALL demo files in ONE batch (prevents clearFileObjects() from wiping them)
            if (allDemoFilesData.length > 0) {
                console.log(`🎵 Creating ${allDemoFilesData.length} demo files in SINGLE BATCH...`);
                console.log(`🔍 [BATCH] window.DEMO_ASSET_DATA_URLS exists: ${!!window.DEMO_ASSET_DATA_URLS}`);
                
                // DIAGNOSTIC: Check each file's thumbnailDataUrl before batch creation
                allDemoFilesData.forEach((fileData, index) => {
                    const hasThumb = !!fileData.thumbnailDataUrl;
                    const thumbSize = fileData.thumbnailDataUrl ? `${(fileData.thumbnailDataUrl.length / 1024).toFixed(0)} KB` : 'NULL';
                    console.log(`🔍 [BATCH ${index}] ${fileData.name}: thumbnailDataUrl = ${hasThumb ? thumbSize : 'NULL'}`);
                });
                
                const fileObjectManager = this.app?.fileObjectManager || window.app?.fileObjectManager;
                if (!fileObjectManager) {
                    console.error('❌ FileObjectManager not available');
                    return;
                }
                
                // Create all demo files at once
                fileObjectManager.createFileObjects(allDemoFilesData);
                console.log(`✅ Batch creation complete for ${allDemoFilesData.length} demo files`);
                
                // PHASE 3: Position and parent each file to its furniture
                const stateManager = this.app?.stateManager || window.app?.stateManager;
                
                for (const metadata of demoFileMetadata) {
                    try {
                        const { fileData, furniture, slotPosition, slotIndex } = metadata;
                        
                        // Find the created object in stateManager
                        let fileObject = stateManager.fileObjects.find(obj => obj.userData.id === fileData.id);
                        
                        // FALLBACK: Try finding by path if ID search fails
                        if (!fileObject) {
                            console.warn(`⚠️ Could not find by ID ${fileData.id}, trying by path: ${fileData.path}`);
                            fileObject = stateManager.fileObjects.find(obj => obj.userData.path === fileData.path);
                            
                            if (fileObject) {
                                console.log(`✅ Found by path! Object has ID: ${fileObject.userData.id}`);
                                // CRITICAL: Update BOTH fileData.id AND furniture.objectIds to match actual created object
                                const actualId = fileObject.userData.id;
                                fileData.id = actualId;
                                furniture.objectIds[slotIndex] = actualId;
                                console.log(`🔧 Updated furniture.objectIds[${slotIndex}] to actual ID: ${actualId}`);
                            }
                        }
                        
                        if (!fileObject) {
                            console.error(`❌ Could not find created demo file: ${fileData.name} by ID or path`);
                            continue;
                        }
                        
                        console.log(`📍 Positioning demo file: ${fileData.name} on ${furniture.type} slot ${slotIndex}`);
                        
                        // Get furniture visual group
                        const furnitureGroup = this.furnitureManager.visualManager?.getFurnitureGroup(furniture.id);
                        if (!furnitureGroup) {
                            console.error(`❌ Could not find furniture group for ${furniture.id}`);
                            continue;
                        }
                        
                        // Remove from current parent (scene)
                        if (fileObject.parent) {
                            fileObject.parent.remove(fileObject);
                        }
                        
                        // Parent to furniture
                        furnitureGroup.add(fileObject);
                        
                        // Position on furniture slot
                        const objectHeight = fileObject.geometry?.parameters?.height || 1.5;
                        const targetY = slotPosition.y + (objectHeight / 2);
                        
                        fileObject.position.set(slotPosition.x, targetY, slotPosition.z);
                        fileObject.rotation.y = slotPosition.rotation || 0;
                        fileObject.userData.preservePosition = true;
                        fileObject.userData.furnitureId = furniture.id;
                        fileObject.userData.furnitureSlotIndex = slotIndex;
                        fileObject.userData.isDemoContent = true;
                        
                        console.log(`✅ Positioned ${fileData.name} at LOCAL (${slotPosition.x.toFixed(2)}, ${targetY.toFixed(2)}, ${slotPosition.z.toFixed(2)})`);
                        
                        // CRITICAL: Register object ID in furniture.objectIds array for sharing/persistence
                        // ALWAYS update the slot to ensure proper playlist functionality
                        furniture.objectIds[slotIndex] = fileData.id;
                        console.log(`🪑 ✅ Registered demo file ${fileData.id} in furniture.objectIds[${slotIndex}]`);
                        
                        // NOTE: Demo files were already added to fileObjects array by fileObjectManager.createFileObjects()
                        // No need to manually add them again - they're already in the array
                        
                        await this.delay(100); // Small delay between positioning
                    } catch (error) {
                        console.error(`❌ Failed to position demo file:`, error);
                    }
                }
            }
            
            // PHASE 4: Create link objects (one at a time, as before)
            // CRITICAL: Only create external URL links here - demo media files (mp3/mp4) were created in PHASE 2
            let totalLinksCreated = 0;
            let totalLinksFailed = 0;
            
            for (const furniture of createdFurniture) {
                // SKIP MODIFIED FURNITURE: Don't repopulate furniture that user has modified
                if (furniture.isModified === true) {
                    console.log(`🪑 Skipping furniture ${furniture.id} - marked as modified by user`);
                    continue;
                }
                
                const playlist = Object.values(playlistSource).find(
                    p => p.furnitureType === furniture.type
                );
                
                if (!playlist || !playlist.links || playlist.links.length === 0) {
                    continue;
                }
                
                const slotPositions = furniture.positions || [];
                const linksToCreate = Math.min(playlist.links.length, slotPositions.length);
                console.log(`🔗 [${furniture.type}] Creating ${linksToCreate} links from ${playlist.links.length} available, ${slotPositions.length} slots`);
                
                let createdCount = 0;
                let skippedCount = 0;
                let failedCount = 0;
                
                for (let i = 0; i < linksToCreate; i++) {
                    // SKIP OCCUPIED SLOTS: Don't overwrite slots that already have objects
                    if (furniture.objectIds && furniture.objectIds[i] && furniture.objectIds[i] !== null && furniture.objectIds[i] !== '') {
                        skippedCount++;
                        console.log(`🪑 Skipping slot ${i} on furniture ${furniture.id} - already occupied by ${furniture.objectIds[i]}`);
                        continue;
                    }
                    
                    const link = playlist.links[i];
                    const slotPos = slotPositions[i];
                    
                    try {
                        // CRITICAL FIX: Skip demo media files - they were already created in PHASE 2
                        if (link.startsWith('assets/demomedia/')) {
                            skippedCount++;
                            console.log(`⏭️ [${furniture.type} slot ${i}] Skipped demo media file: ${link}`);
                            continue;
                        }
                        
                        // Create external URL link object using URLManager
                        console.log(`🔗 [${furniture.type} slot ${i}] Creating link: ${link}`);
                        const linkObject = await this.createAndAssignDemoLink(furniture, slotPos, link, i, urlManager);
                        
                        if (linkObject) {
                            createdCount++;
                            totalLinksCreated++;
                            console.log(`✅ [${furniture.type} slot ${i}] Successfully created: ${link}`);
                        } else {
                            failedCount++;
                            totalLinksFailed++;
                            console.error(`❌ [${furniture.type} slot ${i}] Failed to create (returned null): ${link}`);
                        }
                        
                        await this.delay(300);
                    } catch (error) {
                        failedCount++;
                        totalLinksFailed++;
                        console.error(`❌ [${furniture.type} slot ${i}] Failed to add demo link ${link}:`, error);
                    }
                }
                
                console.log(`📊 [${furniture.type}] Link creation summary: ${createdCount} created, ${skippedCount} skipped, ${failedCount} failed (${failedCount + skippedCount} empty slots)`);
            }
            
            console.log(`📊 TOTAL: ${totalLinksCreated} links created, ${totalLinksFailed} failed`);
            
            // PHASE 5: Save ALL furniture pieces to persist objectIds arrays
            console.log(`💾 Saving ${createdFurniture.length} furniture pieces after demo content population...`);
            for (const furniture of createdFurniture) {
                await this.furnitureManager.storageManager.updateFurniture(furniture);
                console.log(`💾 Saved furniture ${furniture.id} (${furniture.type})`);
            }
            
            } catch (error) {
                console.error('🎵 Error populating furniture with demo content:', error);
            } finally {
                // CRITICAL: Always clear the flag, even if there was an error
                window._populatingDemoContent = false;
                console.log('✅ Demo content population completed');
            }
        }
        
        /**
         * Create demo link object and assign it to furniture slot
         * Uses urlManager.createLinkFromURL() like DefaultLinkInitializer does
         * Then properly seats the object on the furniture marker
         */
        async createAndAssignDemoLink(furniture, slotPosition, url, slotIndex, urlManager) {
            // FIRST: Create object at origin temporarily (we'll move it after parenting)
            const tempPosition = {
                x: 0,
                y: 1.5,  // Safe height above ground
                z: 0
            };
            
            // Create link object using URLManager
            // During first install, skipMetadata is true (set globally by runFirstInstallSetup)
            // This creates minimal objects immediately, then enriches metadata in background
            const linkObject = await urlManager.createLinkFromURL(url, {
                position: tempPosition,
                skipMetadata: window.skipMetadataFetching || false, // Explicit flag for deferred metadata
                furnitureId: furniture.id,
                furnitureSlotIndex: slotIndex,
                isDemoContent: true, // CRITICAL: Mark as demo content BEFORE notification
                onSuccess: (linkObj, linkData) => {
                    // isDemoContent is already set in createLinkObject, no need to set here
                    // console.log(`✅ Demo link created: ${linkData.name}`);
                },
                onError: (error) => {
                    console.error(`❌ Failed to create demo link ${url}:`, error);
                }
            });
            
            if (!linkObject) {
                console.error(`🎵 Failed to create link object for ${url}`);
                return null;
            }
            
            // SECOND: Get furniture visual group
            const furnitureGroup = this.furnitureManager.visualManager?.getFurnitureGroup(furniture.id);
            if (!furnitureGroup) {
                console.error(`🎵 Could not find furniture group for ${furniture.id}`);
                return linkObject; // Return unparented object (fallback)
            }
            
            // THIRD: Reparent object to furniture group (makes it move with furniture)
            if (linkObject.parent) {
                linkObject.parent.remove(linkObject);
            }
            furnitureGroup.add(linkObject);
            
            // FOURTH: Set LOCAL position on furniture marker
            // Adjust Y so object's BOTTOM sits on marker, not center
            const objectHeight = linkObject.userData?.objectHeight || 
                               linkObject.geometry?.parameters?.height || 2.5;
            const targetY = slotPosition.y + (objectHeight / 2); // Center = surface + half height
            
            linkObject.position.set(slotPosition.x, targetY, slotPosition.z);
            linkObject.rotation.y = slotPosition.rotation || 0;
            linkObject.userData.preservePosition = true; // Prevent sorting/gravity
            
            // Update title label position now that object is in scene with correct position
            if (window.linkTitleManager) {
                window.linkTitleManager.updateLabelPosition(linkObject);
            }
            
            // CRITICAL: Add object ID to furniture.objectIds array so it appears in share dialog
            // ALWAYS update the slot, not just when empty, because refresh may have cleared it
            furniture.objectIds[slotIndex] = linkObject.userData.id;
            // console.log(`🪑 ✅ Registered link ${linkObject.userData.id} in furniture.objectIds[${slotIndex}]`);
            
            // FIFTH: Persist WORLD position to Flutter
            if (window.ObjectMovedChannel) {
                const worldPos = new window.THREE.Vector3();
                linkObject.getWorldPosition(worldPos);
                
                const moveData = {
                    id: linkObject.userData.id,
                    x: worldPos.x,
                    y: worldPos.y,
                    z: worldPos.z,
                    furnitureId: furniture.id,
                    slotIndex: slotIndex
                };
                window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
            }
            
            return linkObject;
        }
        
        /**
         * Create demo media file and place it on furniture
         * Uses the SAME system as link objects - create in JS, notify Dart
         * @param {Object} furniture - Furniture data object
         * @param {Object} slotPosition - Slot position {x, y, z, rotation}
         * @param {String} filePath - File path (e.g., 'assets/demomedia/video.mp4')
         * @param {Number} slotIndex - Slot index number
         * @returns {Object|null} - The created file object, or null on failure
         */
        findAndPlaceFileOnFurniture(furniture, slotPosition, filePath, slotIndex) {
            try {
                console.log(`🎵 Creating demo media file: ${filePath} for slot ${slotIndex}`);
                
                // Extract filename and extension
                const filename = filePath.split('/').pop(); // e.g., "Bach Prelude BWV933 piano.mp3"
                const extension = filename.split('.').pop().toLowerCase(); // e.g., "mp3"
                
                // Determine file type
                const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];
                const videoExts = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
                const isAudio = audioExts.includes(extension);
                const isVideo = videoExts.includes(extension);
                const fileType = isAudio ? 'audio' : isVideo ? 'video' : 'file';
                
                console.log(`🎵 File type: ${fileType}, extension: ${extension}`);
                
                // CRITICAL: Get thumbnail data URL for face texture (image/jpeg)
                const thumbnailDataUrl = window.DEMO_THUMBNAIL_DATA_URLS?.[filePath] || null;
                
                if (!thumbnailDataUrl) {
                    console.warn(`⚠️ No thumbnail available for demo file: ${filePath} (will use colored fallback)`);
                } else {
                    console.log(`✅ Got thumbnail for ${filename} (${(thumbnailDataUrl.length / 1024).toFixed(2)} KB)`);
                }
                
                // ✅ CRITICAL: Use STABLE IDs matching the format from PHASE 2 (line 340)
                // Format: demo_${furniture.id}_slot${slotIndex}_${filename}
                // This ensures furniture.objectIds array has the correct IDs
                const uniqueId = `demo_${furniture.id}_slot${slotIndex}_${filename.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const fileData = {
                    id: uniqueId,
                    path: filePath,              // Asset path for future loading
                    name: filename,
                    extension: '.' + extension,  // ObjectCreator expects dot prefix
                    size: 0,
                    lastModified: Date.now(),
                    type: fileType,
                    mimeType: `${fileType}/${extension}`,
                    isDemoContent: true,
                    // ✅ CRITICAL: Use thumbnail data URL for face texture (image/jpeg)
                    // Media playback will look up full media from DEMO_ASSET_DATA_URLS using the path
                    thumbnailDataUrl: thumbnailDataUrl,
                    url: filePath,               // For media preview (uses path to lookup in DEMO_ASSET_DATA_URLS)
                    x: 0,
                    y: 1.5,
                    z: 0,
                    furnitureId: furniture.id,
                    furnitureSlotIndex: slotIndex
                };
                
                console.log(`📦 Creating file object with FileObjectManager (thumbnailDataUrl: ${!!thumbnailDataUrl}):`, fileData);
                
                // Use FileObjectManager to create the object (same system as regular files)
                const fileObjectManager = this.app?.fileObjectManager || window.app?.fileObjectManager;
                if (!fileObjectManager) {
                    throw new Error('FileObjectManager not available');
                }
                
                // Call createFileObjects with array of one file (this adds to scene & state automatically)
                fileObjectManager.createFileObjects([fileData]);
                
                console.log(`✅ FileObjectManager.createFileObjects called for: ${filename}`);
                
                // Get the created object from stateManager (it was just added by createFileObjects)
                const stateManager = this.app?.stateManager || window.app?.stateManager;
                const fileObject = stateManager.fileObjects.find(obj => obj.userData.id === uniqueId);
                
                if (!fileObject) {
                    throw new Error('File object not found in stateManager after creation');
                }
                
                // Add to scene and state manager
                if (!fileObject) {
                    throw new Error('File object not found in stateManager after creation');
                }
                
                console.log(`✅ Found created file object: ${filename}`);
                
                // FileObjectManager already added it to scene & state, so just notify Dart
                // Skip notification during restoration/first install to avoid snackbar spam
                if (window._worldRestorationInProgress || window._firstInstallInProgress) {
                    console.log(`⏸️ Skipping Dart notification during restoration/first install for: ${filename}`);
                } else if (window.LinkObjectAddedChannel) {
                    const notifyData = {
                        id: uniqueId,
                        path: filePath,
                        name: filename,
                        extension: '.' + extension,
                        size: 0,
                        type: fileType,
                        mimeType: `${fileType}/${extension}`,
                        lastModified: Date.now(),
                        x: 0,
                        y: 1.5,
                        z: 0,
                        isDemoContent: true,
                        furnitureId: furniture.id,
                        furnitureSlotIndex: slotIndex
                    };
                    
                    window.LinkObjectAddedChannel.postMessage(JSON.stringify(notifyData));
                    console.log(`📤 Notified Dart of demo file: ${filename}`);
                }
                
                // Get furniture visual group for parenting
                const furnitureGroup = this.furnitureManager.visualManager?.getFurnitureGroup(furniture.id);
                if (!furnitureGroup) {
                    throw new Error(`Could not find furniture group for ${furniture.id}`);
                }
                
                // Remove from current parent and add to furniture group
                if (fileObject.parent) {
                    fileObject.parent.remove(fileObject);
                }
                furnitureGroup.add(fileObject);
                console.log(`🪑 Parented to furniture group ${furniture.type}`);
                
                // Position at slot location (LOCAL coordinates)
                const objectHeight = fileObject.geometry?.parameters?.height || 1.5;
                const targetY = slotPosition.y + (objectHeight / 2);
                
                fileObject.position.set(slotPosition.x, targetY, slotPosition.z);
                fileObject.rotation.y = slotPosition.rotation || 0;
                fileObject.userData.preservePosition = true;
                fileObject.userData.furnitureId = furniture.id;
                fileObject.userData.furnitureSlotIndex = slotIndex;
                fileObject.userData.isDemoContent = true;
                
                console.log(`✅ Positioned at (${slotPosition.x.toFixed(2)}, ${targetY.toFixed(2)}, ${slotPosition.z.toFixed(2)})`);
                console.log(`🪑 Seated demo file on furniture ${furniture.type} slot ${slotIndex}`);
                
                // CRITICAL: Register object ID in furniture.objectIds array for playback
                if (!furniture.objectIds[slotIndex]) {
                    furniture.objectIds[slotIndex] = uniqueId;
                    console.log(`🪑 ✅ Registered demo file ${uniqueId} in furniture.objectIds[${slotIndex}]`);
                }
                
                // Persist WORLD position to Dart
                if (window.ObjectMovedChannel) {
                    const worldPos = new window.THREE.Vector3();
                    fileObject.getWorldPosition(worldPos);
                    
                    const moveData = {
                        id: filePath,
                        x: worldPos.x,
                        y: worldPos.y,
                        z: worldPos.z,
                        rotation: fileObject.rotation.y,
                        furnitureId: furniture.id,
                        slotIndex: slotIndex
                    };
                    
                    window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                    console.log(`📤 Persisted WORLD position: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
                }
                
                return fileObject;
                
            } catch (error) {
                console.error(`❌ ERROR creating demo file ${filePath}:`, error);
                console.error(`❌ Error message: ${error.message}`);
                console.error(`❌ Error stack:`, error.stack);
                return null;
            }
        }
        
        /**
         * [DEPRECATED] This method is no longer used - demo files now use existing FileModel objects
         * Old method that manually created demo file objects
         * Replaced by findAndPlaceFileOnFurniture() which uses Dart-created FileModel objects
         */
        async createAndAssignDemoFile(furniture, slotPosition, filename, slotIndex) {
            console.warn(`⚠️ createAndAssignDemoFile() is deprecated - use findAndPlaceFileOnFurniture() instead`);
            console.warn(`   This method created parallel demo files instead of using Dart FileModel objects`);
            throw new Error('createAndAssignDemoFile() is deprecated - demo files should be created by Dart');
        }
        
        /**
         * Generate a placeholder thumbnail for video files
         * [DEPRECATED] No longer needed - Dart generates proper thumbnails via DemoContentHelper
         */
        generateVideoPlaceholderThumbnail(filename) {
            console.warn(`⚠️ generateVideoPlaceholderThumbnail() is deprecated`);
            return null;
        }
        
        /**
         * Utility delay function
         */
        async delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        /**
         * DEPRECATED - Old method that tried to use Flutter channels
         * Kept for reference but no longer used
         */
        async addExternalLinkToFurniture(furniture, url, slotIndex) {
            console.log(`🎵 Adding external link to furniture: ${url}`);
            
            // Determine link type and metadata
            const linkData = this.parseLinkUrl(url);
            
            // Call global function to add link to furniture
            if (window.addDemoLinkToFurniture) {
                await window.addDemoLinkToFurniture(
                    furniture.id,
                    url,
                    linkData.title,
                    linkData.type,
                    slotIndex
                );
            } else {
                console.warn('🎵 addDemoLinkToFurniture function not available');
            }
        }
        
        /**
         * Parse link URL to extract metadata
         */
        parseLinkUrl(url) {
            // YouTube
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                return {
                    type: 'youtube',
                    title: 'YouTube Video',
                    platform: 'YouTube'
                };
            }
            
            // Spotify
            if (url.includes('spotify.com')) {
                return {
                    type: 'spotify',
                    title: 'Spotify Track',
                    platform: 'Spotify'
                };
            }
            
            // TikTok
            if (url.includes('tiktok.com')) {
                return {
                    type: 'tiktok',
                    title: 'TikTok Video',
                    platform: 'TikTok'
                };
            }
            
            // Instagram
            if (url.includes('instagram.com')) {
                return {
                    type: 'instagram',
                    title: 'Instagram Reel',
                    platform: 'Instagram'
                };
            }
            
            // Generic link
            return {
                type: 'link',
                title: 'Web Link',
                platform: 'Web'
            };
        }

        /**
         *          style: 'woodgrain',
                    sortingCriteria: window.SORTING_CRITERIA.TITLE
                    // No demo content - empty for user's own content
                }
            ]  
                configs.push({
                    type: type,
                    position: { x, y: 0, z },
                    rotation: rotationY,
                    style: styles[index],
                    sortingCriteria: window.SORTING_CRITERIA.TITLE // Default sorting by title
                });
            });
            
            return configs;
        }

        /**
         * BACKGROUND METADATA ENRICHMENT
         * Enriches all link objects that have minimal metadata (isMinimal: true)
         * Runs in background after first install to avoid blocking world loading
         * Processes links one at a time with delays to avoid overwhelming APIs
         */
        async enrichAllLinkMetadata() {
            console.log('🔄 [ENRICH] Starting background metadata enrichment...');
            
            const fileObjectManager = this.app?.fileObjectManager || window.app?.fileObjectManager;
            if (!fileObjectManager) {
                console.warn('🔄 [ENRICH] FileObjectManager not available');
                return;
            }
            
            const urlManager = this.app?.urlManager || window.app?.urlManager;
            if (!urlManager || !urlManager.urlProcessor) {
                console.warn('🔄 [ENRICH] URLManager not available');
                return;
            }
            
            // Find all link objects that need enrichment
            const fileObjects = fileObjectManager.fileObjects || [];
            const linksToEnrich = fileObjects.filter(obj => 
                obj.userData?.isLink && 
                obj.userData?.linkData?.isMinimal === true
            );
            
            console.log(`🔄 [ENRICH] Found ${linksToEnrich.length} links to enrich`);
            
            if (linksToEnrich.length === 0) {
                console.log('🔄 [ENRICH] No links need enrichment');
                return;
            }
            
            // Process each link with a delay between each to avoid API rate limits
            let enrichedCount = 0;
            let failedCount = 0;
            
            for (const linkObject of linksToEnrich) {
                try {
                    const url = linkObject.userData.linkData.url;
                    console.log(`🔄 [ENRICH] Fetching metadata for: ${url}`);
                    
                    // Fetch full metadata (skipMetadata = false)
                    const fullMetadata = await urlManager.urlProcessor.processURL(url, { skipMetadata: false });
                    
                    if (fullMetadata && !fullMetadata.isMinimal) {
                        // Update the link object with full metadata
                        linkObject.userData.linkData = fullMetadata;
                        
                        // Update visual representation if link visual manager is available
                        if (this.app?.linkVisualManager) {
                            try {
                                await this.app.linkVisualManager.enhanceLinkObject(linkObject, fullMetadata);
                                console.log(`🔄 [ENRICH] ✅ Enriched: ${fullMetadata.title}`);
                            } catch (error) {
                                console.warn(`🔄 [ENRICH] Could not enhance visuals for ${url}:`, error);
                            }
                        }
                        
                        enrichedCount++;
                    } else {
                        console.warn(`🔄 [ENRICH] Failed to get full metadata for ${url}`);
                        failedCount++;
                    }
                    
                } catch (error) {
                    console.error(`🔄 [ENRICH] Error enriching link:`, error);
                    failedCount++;
                }
                
                // Wait between requests to avoid overwhelming APIs (500ms delay)
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            console.log(`🔄 [ENRICH] ✅ Complete: ${enrichedCount} enriched, ${failedCount} failed`);
        }

        /**
         * Reset default furniture (for testing/debugging)
         */
        async resetDefaultFurniture() {
            console.log('🪑 Resetting default furniture...');
            
            // Remove marker
            localStorage.removeItem('mv3d_default_furniture_created');
            
            // Optionally remove all furniture
            if (this.furnitureManager && this.furnitureManager.storageManager) {
                const allFurniture = Array.from(this.furnitureManager.storageManager.furniture.values());
                for (const furniture of allFurniture) {
                    await this.furnitureManager.deleteFurniture(furniture.id);
                }
            }
            
            console.log('🪑 Default furniture reset complete');
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    
    window.DefaultFurnitureSpawner = DefaultFurnitureSpawner;
    
    console.log('✅ Default Furniture Spawner loaded');
})();
