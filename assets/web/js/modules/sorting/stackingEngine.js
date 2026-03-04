// modules/sorting/stackingEngine.js
// Dependencies: THREE (global)
// Exports: window.StackingEngine

(function() {
    'use strict';
    
    console.log("Loading StackingEngine module...");
    
    // ============================================================================
    // STACKING ENGINE - Advanced Object Stacking System
    // ============================================================================
    class StackingEngine {
        constructor(THREE, scene, stateManager, worldTemplate) {
            this.THREE = THREE;
            this.scene = scene;
            this.stateManager = stateManager;
            this.worldTemplate = worldTemplate;
            
            // Optimal default stacking configuration
            const defaultConfig = {
                enabled: true,
                primarySort: 'fileName', // File Name (Primary)
                secondarySort: 'smartImageDate', // Smart Image Date (Secondary)
                stackHeightLimit: 10,
                spacingBetweenStacks: 8,
                autoApplyOnLoad: true,
                preserveUserStacks: true
            };
            
            // Load persisted configuration or use defaults
            const savedConfig = this.loadStackingConfigFromStorage();
            this.stackingConfig = savedConfig ? { ...defaultConfig, ...savedConfig } : defaultConfig;
            
            console.log('StackingEngine initialized with configuration:', this.stackingConfig);
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
         * Update the stacking configuration with persistence
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

                // Persist configuration to localStorage
                this.saveStackingConfigToStorage();

                console.log('Stacking configuration updated successfully:', this.stackingConfig);
                return true;
            } catch (error) {
                console.error('Error updating stacking configuration:', error);
                return false;
            }
        }

        /**
         * Save stacking configuration to localStorage for persistence
         */
        saveStackingConfigToStorage() {
            try {
                const configToSave = {
                    enabled: this.stackingConfig.enabled,
                    primarySort: this.stackingConfig.primarySort,
                    secondarySort: this.stackingConfig.secondarySort,
                    stackHeightLimit: this.stackingConfig.stackHeightLimit,
                    spacingBetweenStacks: this.stackingConfig.spacingBetweenStacks,
                    autoApplyOnLoad: this.stackingConfig.autoApplyOnLoad,
                    preserveUserStacks: this.stackingConfig.preserveUserStacks
                };
                localStorage.setItem('stackingConfiguration', JSON.stringify(configToSave));
                console.log('✅ Stacking configuration saved to localStorage');
            } catch (error) {
                console.error('❌ Error saving stacking configuration to localStorage:', error);
            }
        }

        /**
         * Load stacking configuration from localStorage
         * @returns {Object|null} Saved configuration or null if not found
         */
        loadStackingConfigFromStorage() {
            try {
                const saved = localStorage.getItem('stackingConfiguration');
                if (saved) {
                    const config = JSON.parse(saved);
                    console.log('✅ Loaded stacking configuration from localStorage:', config);
                    return config;
                }
            } catch (error) {
                console.error('❌ Error loading stacking configuration from localStorage:', error);
            }
            return null;
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

                // This will be called by the SortingManager to trigger re-arrangement
                console.log('Stacking configuration applied successfully');
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
        // CORE STACKING LOGIC IMPLEMENTATION
        // ============================================================================

        /**
         * Apply stacking to objects within a zone based on stacking configuration
         * @param {Array} objects - Objects to stack
         * @param {Object} zone - Zone information
         * @param {String} category - File category
         */
        applyStackingToZone(objects, zone, category) {
            if (!this.stackingConfig.enabled || objects.length === 0) {
                console.log('Stacking disabled or no objects, skipping stacking for zone:', category);
                return false; // Indicate stacking was not applied
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
            return true; // Indicate stacking was applied successfully
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
                case 'advancedContextual':
                    return this.compareAdvancedContextual(objA, objB);
                
                case 'smartImageDate':
                    return this.compareSmartImageDate(objA, objB);
                
                case 'smartAudioMeta':
                    return this.compareSmartAudioMeta(objA, objB);
                
                case 'smartFilePrefix':
                    return this.compareSmartFilePrefix(objA, objB);
                
                case 'smartAppPrefix':
                    return this.compareSmartAppPrefix(objA, objB);
                
                case 'smartLinkSession':
                    return this.compareSmartLinkSession(objA, objB);
                
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
                    const nameA = (objA.userData.fileData?.name || '').toLowerCase();
                    const nameB = (objB.userData.fileData?.name || '').toLowerCase();
                    valueA = nameA.substring(0, 8);
                    valueB = nameB.substring(0, 8);
                    break;

                case 'filenameExact':
                    const fullNameA = (objA.userData.fileData?.name || '').replace(/\.[^/.]+$/, '').toLowerCase();
                    const fullNameB = (objB.userData.fileData?.name || '').replace(/\.[^/.]+$/, '').toLowerCase();
                    valueA = fullNameA;
                    valueB = fullNameB;
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
            
            switch (primarySort) {
                case 'advancedContextual':
                    return this.getAdvancedContextualCriteria(object);
                
                case 'smartImageDate':
                    return this.getSmartImageDateCriteria(object);
                
                case 'smartAudioMeta':
                    return this.getSmartAudioMetaCriteria(object);
                
                case 'smartFilePrefix':
                    return this.getSmartFilePrefixCriteria(object);
                
                case 'smartAppPrefix':
                    return this.getSmartAppPrefixCriteria(object);
                
                case 'smartLinkSession':
                    return this.getSmartLinkSessionCriteria(object);
                
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
                
                case 'filename8CharPrefix':
                    // Group by first 8 characters of filename
                    const fileName = (object.userData.fileData?.name || '').toLowerCase();
                    return { prefix8: fileName.substring(0, 8) };
                
                case 'filenameExact':
                    // Group by exact filename without extension
                    const fullName = object.userData.fileData?.name || '';
                    const nameWithoutExt = fullName.replace(/\.[^/.]+$/, '');
                    return { exactName: nameWithoutExt.toLowerCase() };
                
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
            
            // Handle different types of stacking criteria
            if (criteriaA.type !== criteriaB.type) return false;
            
            switch (criteriaA.type) {
                case 'imageDate':
                    // Same capture date (year-month-day)
                    return criteriaA.dateKey === criteriaB.dateKey;
                
                case 'imagePrefix':
                    // Same filename prefix for images without date
                    return criteriaA.prefix === criteriaB.prefix;
                
                case 'audioArtist':
                    // Same artist or same song
                    return criteriaA.artist === criteriaB.artist || 
                           criteriaA.song === criteriaB.song;
                
                case 'audioSong':
                    // Same song name
                    return criteriaA.song === criteriaB.song;
                
                case 'filePrefix':
                    // Same 8-character filename prefix
                    return criteriaA.prefix === criteriaB.prefix;
                
                case 'appPrefix':
                    // Same 6-character app name prefix
                    return criteriaA.prefix === criteriaB.prefix;
                
                case 'linkSession':
                    // Same session window OR same 8-character prefix
                    return criteriaA.sessionKey === criteriaB.sessionKey ||
                           criteriaA.prefix === criteriaB.prefix;
                
                default:
                    // Fallback to deep comparison for simple criteria
                    return JSON.stringify(criteriaA) === JSON.stringify(criteriaB);
            }
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
         * ADVANCED CONTEXTUAL STACKING CRITERIA
         * Intelligent stacking based on object type with sophisticated rules
         */
        
        /**
         * Get advanced contextual stacking criteria based on object type
         * @param {Object} object - Object to analyze
         * @returns {Object} Stacking criteria
         */
        getAdvancedContextualCriteria(object) {
            const fileName = object.userData.fileData?.name || '';
            const fileCategory = this.getFileCategory(object);
            
            // Determine object type and apply appropriate stacking logic
            if (object.userData.objectType === 'app') {
                return this.getSmartAppPrefixCriteria(object);
            } else if (object.userData.objectType === 'link') {
                return this.getSmartLinkSessionCriteria(object);
            } else if (fileCategory === 'images') {
                return this.getSmartImageDateCriteria(object);
            } else if (fileCategory === 'music') {
                return this.getSmartAudioMetaCriteria(object);
            } else {
                // For documents and other files, use filename prefix
                return this.getSmartFilePrefixCriteria(object);
            }
        }

        /**
         * Stack images by capture date (same year, month, day)
         * @param {Object} object - Image object
         * @returns {Object} Stacking criteria
         */
        getSmartImageDateCriteria(object) {
            const fileName = object.userData.fileData?.name || '';
            
            // Try to extract date from EXIF data first
            let captureDate = null;
            if (object.userData.fileData?.dateTimeOriginal) {
                captureDate = new Date(object.userData.fileData.dateTimeOriginal);
            } else if (object.userData.fileData?.created) {
                captureDate = new Date(object.userData.fileData.created);
            } else if (object.userData.fileData?.lastModified) {
                captureDate = new Date(object.userData.fileData.lastModified);
            }
            
            if (captureDate && !isNaN(captureDate.getTime())) {
                // Group by year-month-day only
                const dateKey = `${captureDate.getFullYear()}-${String(captureDate.getMonth() + 1).padStart(2, '0')}-${String(captureDate.getDate()).padStart(2, '0')}`;
                return {
                    type: 'imageDate',
                    dateKey: dateKey,
                    timestamp: captureDate.getTime() // For sorting within stack (newest on top)
                };
            }
            
            // Fallback to filename prefix if no date available
            return {
                type: 'imagePrefix',
                prefix: fileName.substring(0, 8).toLowerCase()
            };
        }

        /**
         * Stack audio files by artist name or song name
         * @param {Object} object - Audio object
         * @returns {Object} Stacking criteria
         */
        getSmartAudioMetaCriteria(object) {
            const fileName = object.userData.fileData?.name || '';
            
            // Try to extract artist and song from filename
            // Common patterns: "Artist - Song", "Artist_Song", "Song by Artist"
            let artist = '';
            let song = '';
            
            if (fileName.includes(' - ')) {
                const parts = fileName.split(' - ');
                artist = parts[0].trim();
                song = parts[1].replace(/\.[^/.]+$/, '').trim(); // Remove extension
            } else if (fileName.includes(' by ')) {
                const parts = fileName.split(' by ');
                song = parts[0].trim();
                artist = parts[1].replace(/\.[^/.]+$/, '').trim();
            } else if (fileName.includes('_')) {
                const parts = fileName.split('_');
                artist = parts[0].trim();
                song = parts.slice(1).join('_').replace(/\.[^/.]+$/, '').trim();
            } else {
                // Use whole filename as song if no pattern detected
                song = fileName.replace(/\.[^/.]+$/, '').trim();
            }
            
            // Stack by artist first (if available), then by song
            if (artist) {
                return {
                    type: 'audioArtist',
                    artist: artist.toLowerCase(),
                    song: song.toLowerCase()
                };
            } else {
                return {
                    type: 'audioSong',
                    song: song.toLowerCase()
                };
            }
        }

        /**
         * Stack files by first 8 characters of filename
         * @param {Object} object - File object
         * @returns {Object} Stacking criteria
         */
        getSmartFilePrefixCriteria(object) {
            const fileName = object.userData.fileData?.name || '';
            const prefix8 = fileName.substring(0, 8).toLowerCase();
            
            return {
                type: 'filePrefix',
                prefix: prefix8,
                fullName: fileName.toLowerCase() // For sorting within stack
            };
        }

        /**
         * Stack apps by first 6 characters of app name
         * @param {Object} object - App object
         * @returns {Object} Stacking criteria
         */
        getSmartAppPrefixCriteria(object) {
            const appName = object.userData.fileData?.name || '';
            const prefix6 = appName.substring(0, 6).toLowerCase();
            
            return {
                type: 'appPrefix',
                prefix: prefix6,
                fullName: appName.toLowerCase()
            };
        }

        /**
         * Stack links by first 8 characters or same session
         * @param {Object} object - Link object
         * @returns {Object} Stacking criteria
         */
        getSmartLinkSessionCriteria(object) {
            const linkName = object.userData.fileData?.name || '';
            const prefix8 = linkName.substring(0, 8).toLowerCase();
            
            // Try to determine session based on creation time
            const createdTime = object.userData.fileData?.lastModified || Date.now();
            const sessionWindow = 30 * 60 * 1000; // 30 minutes
            const sessionKey = Math.floor(createdTime / sessionWindow);
            
            return {
                type: 'linkSession',
                prefix: prefix8,
                sessionKey: sessionKey,
                createdTime: createdTime,
                fullName: linkName.toLowerCase()
            };
        }

        /**
         * ADVANCED COMPARISON METHODS FOR SMART STACKING
         * These methods handle sophisticated sorting within stacks
         */

        /**
         * Compare objects using advanced contextual logic
         */
        compareAdvancedContextual(objA, objB) {
            const criteriaA = this.getAdvancedContextualCriteria(objA);
            const criteriaB = this.getAdvancedContextualCriteria(objB);
            
            // First sort by type of criteria
            if (criteriaA.type !== criteriaB.type) {
                return criteriaA.type.localeCompare(criteriaB.type);
            }
            
            // Then use specific comparison for that type
            switch (criteriaA.type) {
                case 'imageDate':
                    return this.compareSmartImageDate(objA, objB);
                case 'audioArtist':
                case 'audioSong':
                    return this.compareSmartAudioMeta(objA, objB);
                case 'filePrefix':
                    return this.compareSmartFilePrefix(objA, objB);
                case 'appPrefix':
                    return this.compareSmartAppPrefix(objA, objB);
                case 'linkSession':
                    return this.compareSmartLinkSession(objA, objB);
                default:
                    return 0;
            }
        }

        /**
         * Compare images by date (newest first within same date)
         */
        compareSmartImageDate(objA, objB) {
            const criteriaA = this.getSmartImageDateCriteria(objA);
            const criteriaB = this.getSmartImageDateCriteria(objB);
            
            // First by date key (same day groups together)
            if (criteriaA.dateKey !== criteriaB.dateKey) {
                return criteriaA.dateKey.localeCompare(criteriaB.dateKey);
            }
            
            // Within same day, sort by timestamp (newest first - reverse order)
            if (criteriaA.timestamp && criteriaB.timestamp) {
                return criteriaB.timestamp - criteriaA.timestamp;
            }
            
            return 0;
        }

        /**
         * Compare audio files by artist, then by song
         */
        compareSmartAudioMeta(objA, objB) {
            const criteriaA = this.getSmartAudioMetaCriteria(objA);
            const criteriaB = this.getSmartAudioMetaCriteria(objB);
            
            // Sort by artist first (if available)
            if (criteriaA.artist && criteriaB.artist && criteriaA.artist !== criteriaB.artist) {
                return criteriaA.artist.localeCompare(criteriaB.artist);
            }
            
            // Then by song
            return criteriaA.song.localeCompare(criteriaB.song);
        }

        /**
         * Compare files by prefix, then numerically/alphabetically
         */
        compareSmartFilePrefix(objA, objB) {
            const criteriaA = this.getSmartFilePrefixCriteria(objA);
            const criteriaB = this.getSmartFilePrefixCriteria(objB);
            
            // First by prefix
            if (criteriaA.prefix !== criteriaB.prefix) {
                return criteriaA.prefix.localeCompare(criteriaB.prefix);
            }
            
            // Within same prefix, try numeric sorting first
            const nameA = criteriaA.fullName;
            const nameB = criteriaB.fullName;
            
            // Extract numbers from filename for numeric sorting
            const numA = this.extractNumber(nameA);
            const numB = this.extractNumber(nameB);
            
            if (numA !== null && numB !== null) {
                return numA - numB; // Numeric sort (0 on bottom)
            }
            
            // Fallback to alphabetical (A on bottom to Z on top means reverse)
            return nameB.localeCompare(nameA);
        }

        /**
         * Compare apps by prefix, then by full name
         */
        compareSmartAppPrefix(objA, objB) {
            const criteriaA = this.getSmartAppPrefixCriteria(objA);
            const criteriaB = this.getSmartAppPrefixCriteria(objB);
            
            // First by prefix
            if (criteriaA.prefix !== criteriaB.prefix) {
                return criteriaA.prefix.localeCompare(criteriaB.prefix);
            }
            
            // Then by full name
            return criteriaA.fullName.localeCompare(criteriaB.fullName);
        }

        /**
         * Compare links by session and prefix
         */
        compareSmartLinkSession(objA, objB) {
            const criteriaA = this.getSmartLinkSessionCriteria(objA);
            const criteriaB = this.getSmartLinkSessionCriteria(objB);
            
            // First by session
            if (criteriaA.sessionKey !== criteriaB.sessionKey) {
                return criteriaA.sessionKey - criteriaB.sessionKey;
            }
            
            // Then by prefix
            if (criteriaA.prefix !== criteriaB.prefix) {
                return criteriaA.prefix.localeCompare(criteriaB.prefix);
            }
            
            // Finally by creation time (newest first)
            return criteriaB.createdTime - criteriaA.createdTime;
        }

        /**
         * Extract number from filename for numeric sorting
         */
        extractNumber(filename) {
            const match = filename.match(/(\d+)/);
            return match ? parseInt(match[1], 10) : null;
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

                console.log(`Positioned group ${stackIndex + 1}/${stacks.length} with ${stack.height} objects at center (${finalBasePosition.x.toFixed(2)}, ${finalBasePosition.z.toFixed(2)})`);
            });
        }

        /**
         * Position individual objects within a stack (TRUE VERTICAL STACKING)
         * @param {Object} stack - Stack object containing objects and metadata
         * @param {Object} basePosition - Base position for the stack
         * @param {Object} zone - Zone information
         */
        positionObjectsInStack(stack, basePosition, zone) {
            const worldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
            
            // Reduced logging to reduce console spam
            // console.log(`🔥 TRUE VERTICAL STACKING: Positioning ${stack.objects.length} objects at SAME X,Z (${basePosition.x.toFixed(2)}, ${basePosition.z.toFixed(2)})`);
            
            // CRITICAL: All objects get IDENTICAL X and Z coordinates for true stacking
            // Only Y coordinates differ to create vertical stack
            let currentY = this.calculateStackBaseY(zone, stack.objects[0]);
            
            stack.objects.forEach((object, index) => {
                const objectHeight = this.getObjectHeight(object);
                
                // CONTACT OBJECTS FIX: Check if this is a contact object
                const isContact = object.userData && (
                    object.userData.subType === 'contact' || 
                    object.userData.isContact ||
                    object.userData.objectHeight === 2.5  // Contacts have objectHeight = 2.5
                );
                
                // Calculate Y position for this object in the vertical stack
                let objectCenterY;
                
                if (isContact && worldType === 'green-plane') {
                    // CONTACT OBJECTS: Always position at proper ground level (Y = 1.25 for height 2.5)
                    objectCenterY = objectHeight / 2;  // Center at height/2 above ground (Y=0)
                    console.log(`  📱 CONTACT POSITIONING: ${object.userData.fileName || 'contact'} positioned at ground level Y=${objectCenterY.toFixed(2)}`);
                } else if (index === 0) {
                    // First object: center at base position + height/2
                    objectCenterY = currentY + (objectHeight / 2);
                } else {
                    // Subsequent objects: stack on top with small gap
                    const stackGap = 0.1; // Small gap between stacked objects
                    objectCenterY = currentY + stackGap + (objectHeight / 2);
                }
                
                // CRITICAL: All objects use SAME X and Z from basePosition - NO GRID POSITIONING!
                const position = {
                    x: basePosition.x,  // IDENTICAL X for all objects in stack
                    y: objectCenterY,   // DIFFERENT Y for each object (stacking)
                    z: basePosition.z   // IDENTICAL Z for all objects in stack
                };

                // Move object to position (skip world constraints as we've calculated proper Y)
                this.moveObjectToPosition(object, position, true);

                console.log(`  ⬆️ VERTICAL STACK object ${index + 1}/${stack.objects.length}: ${object.userData.fileName || 'object'} at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
                
                // Update currentY for next object (top of current object) - only for non-contact objects
                if (!isContact) {
                    currentY = objectCenterY + (objectHeight / 2);
                }
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
         * Calculate appropriate Y position for individual objects (not stacked)
         * @param {Object} zone - Zone information
         * @param {Object} object - Object to position
         * @returns {Number} Y position
         */
        calculateObjectYPosition(zone, object) {
            const worldType = this.worldTemplate ? this.worldTemplate.getType() : 'unknown';
            const objectHeight = this.getObjectHeight(object);
            
            console.log(`📏 calculateObjectYPosition for ${object.userData.fileName || 'unknown'}: height=${objectHeight}, worldType=${worldType}`);
            
            if (worldType === 'green-plane') {
                // Objects sit on ground with bottom at Y=0, center at height/2
                const yPosition = objectHeight / 2;
                console.log(`📏 Green plane Y calculation: ${objectHeight}/2 = ${yPosition}`);
                return yPosition;
            } else if (worldType === 'ocean') {
                // Objects sit on seafloor with bottom at Y=0, center at height/2  
                const yPosition = objectHeight / 2;
                console.log(`📏 Ocean Y calculation: ${objectHeight}/2 = ${yPosition}`);
                return yPosition;
            } else if (worldType === 'space') {
                // Objects float at origin level (center at Y=0)
                console.log(`📏 Space Y calculation: 0`);
                return 0;
            }
            
            // Fallback to zone center
            console.log(`📏 Fallback Y calculation: zone.center.y = ${zone.center.y}`);
            return zone.center.y;
        }

        // ============================================================================
        // UTILITY METHODS
        // ============================================================================

        /**
         * Get the file category for an object based on its extension
         */
        getFileCategory(object) {
            if (!object || !object.userData || !object.userData.fileData) {
                return 'other';
            }
            
            const fileName = object.userData.fileData.name || object.userData.fileName || '';
            const extension = fileName.split('.').pop()?.toLowerCase() || '';
            
            // File type categories matching SortingManager
            const fileCategories = {
                'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'],
                'videos': ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'],
                'music': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
                'documents': [
                    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages', // Traditional documents
                    'xls', 'xlsx', 'csv', 'ods', 'numbers', // Spreadsheets (merged)
                    'ppt', 'pptx', 'key', 'odp' // Presentations (merged)
                ]
            };
            
            // Find matching category
            for (const [category, extensions] of Object.entries(fileCategories)) {
                if (extensions.includes(extension)) {
                    return category;
                }
            }
            
            return 'other'; // Default fallback
        }

        /**
         * Get the height of an object for stacking calculations
         * @param {Object} object - Three.js object
         * @returns {Number} Object height
         */
        getObjectHeight(object) {
            // HIGHEST PRIORITY: Check userData.objectHeight first (for contact objects)
            if (object.userData && object.userData.objectHeight !== undefined) {
                console.log(`📏 getObjectHeight from userData.objectHeight: ${object.userData.objectHeight} for ${object.userData.fileName || 'unknown'}`);
                return object.userData.objectHeight;
            }

            // PRIORITY FIX: Use geometry-based calculation first (most accurate)
            // Calculate from bounding box if available, compute if missing
            if (object.geometry) {
                if (!object.geometry.boundingBox) {
                    object.geometry.computeBoundingBox();
                }
                if (object.geometry.boundingBox) {
                    const height = object.geometry.boundingBox.max.y - object.geometry.boundingBox.min.y;
                    console.log(`📏 getObjectHeight from boundingBox: ${height} for ${object.userData.fileName || 'unknown'}`);
                    return height;
                }
            }

            // Try geometry parameters as secondary option
            if (object.geometry?.parameters?.height) {
                const height = object.geometry.parameters.height;
                console.log(`📏 getObjectHeight from geometry.parameters: ${height} for ${object.userData.fileName || 'unknown'}`);
                return height;
            }

            // Use userData as fallback only (may be incorrect)
            if (object.userData.fileData?.height) {
                console.log(`📏 getObjectHeight from userData (fallback): ${object.userData.fileData.height} for ${object.userData.fileName || 'unknown'}`);
                return object.userData.fileData.height;
            }

            // Default height as last resort
            console.log(`📏 getObjectHeight using default: 2.0 for ${object.userData.fileName || 'unknown'}`);
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

        /**
         * Move object to position immediately (no animation)
         */
        moveObjectToPosition(object, position, skipWorldConstraints = false) {
            if (!object || !position) return;
            
            console.log(`Moving ${object.userData.fileName || 'object'} to (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), skipConstraints: ${skipWorldConstraints}`);
            
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
                console.log(`Applying world constraints to ${object.userData.fileName || 'object'}`);
                const constrainedPosition = this.worldTemplate.applyPositionConstraints(
                    object,
                    object.position,
                    this.stateManager.fileObjects
                );
                console.log(`World constraints changed position from (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) to (${constrainedPosition.x.toFixed(2)}, ${constrainedPosition.y.toFixed(2)}, ${constrainedPosition.z.toFixed(2)})`);
                object.position.set(constrainedPosition.x, constrainedPosition.y, constrainedPosition.z);
                
                // Update file data again after constraints
                if (object.userData.fileData) {
                    object.userData.fileData.x = constrainedPosition.x;
                    object.userData.fileData.y = constrainedPosition.y;
                    object.userData.fileData.z = constrainedPosition.z;
                }
            } else if (skipWorldConstraints) {
                console.log(`✅ Skipping world constraints for ${object.userData.fileName || 'object'} - using stacking engine Y position`);
            }
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
    }
    
    // Export to window for global access
    window.StackingEngine = StackingEngine;
    console.log("StackingEngine module loaded successfully");
    
})();
