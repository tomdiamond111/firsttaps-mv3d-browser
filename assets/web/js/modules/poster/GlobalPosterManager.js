/**
 * GlobalPosterManager - Singleton Pattern
 * 
 * Single global manager that handles ALL poster operations across all worlds.
 * Initializes during app startup and maintains separate poster data for each world.
 * Uses event-driven architecture to eliminate timing dependencies.
 * 
 * Key Features:
 * - Singleton pattern ensures single source of truth
 * - World-agnostic storage structure
 * - Event-driven initialization (no setTimeout delays)
 * - Centralized interaction handling
 * - Persistent storage across app restarts
 */

class GlobalPosterManager {
    static instance = null;
    
    constructor() {
        if (GlobalPosterManager.instance) {
            return GlobalPosterManager.instance;
        }
        
        console.log('🖼️ Initializing GlobalPosterManager singleton...');
        
        // Core state management
        this.isInitialized = false;
        this.currentWorldType = null;
        this.hasSeenWorldSwitch = false; // Track if any world switches have occurred
        
        this.isWorldReady = false; // NEW: Flag to check if initial load is complete
        this.queuedRestorationTask = null; // NEW: To hold restoration task if world is not ready

        // World-agnostic poster storage: posterData[worldType][posterPosition] = {url, texture, etc}
        this.posterData = {
            christmas: {},
            dazzle: {},
            'green-plane': {},
            space: {},
            ocean: {},
            forest: {},
            cave: {},
            'desert-oasis': {}
        };
        
        // Active poster references for current world
        this.activePosters = new Map(); // posterPosition -> THREE.Mesh
        
        // Event system
        this.eventCallbacks = new Map();
        
        // Initialize core systems
        this.initializePersistence();
        this.initializeEventSystem();
        this.initializeInteractionSystem();
        
        // Set singleton reference
        GlobalPosterManager.instance = this;
        
        console.log('🖼️ GlobalPosterManager singleton created successfully');
    }
    
    /**
     * Get singleton instance (create if doesn't exist)
     */
    static getInstance() {
        if (!GlobalPosterManager.instance) {
            new GlobalPosterManager();
        }
        return GlobalPosterManager.instance;
    }
    
    /**
     * Initialize persistence system
     */
    initializePersistence() {
        console.log('🔄 Initializing GlobalPosterManager persistence...');
        
        // Wait for Flutter persistence channel
        this.waitForPersistenceChannel();
        
        // Don't load all poster data during initialization - load on-demand per world
        console.log('✅ Poster persistence ready - data will load on-demand per world');
    }
    
    /**
     * Wait for Flutter persistence channel to be available
     */
    waitForPersistenceChannel() {
        if (window.posterURLPersistenceChannel) {
            this.persistenceChannel = window.posterURLPersistenceChannel;
            console.log('🔗 Connected to Flutter persistence channel');
        } else {
            setTimeout(() => this.waitForPersistenceChannel(), 100);
        }
    }
    
    /**
     * Initialize event system for world communication
     */
    initializeEventSystem() {
        console.log('📡 Initializing GlobalPosterManager event system...');
        
        // Listen for world setup events
        this.addEventListener('world-setup-complete', (data) => {
            console.log('🌍 World setup complete event received:', data);
            this.handleWorldSetupComplete(data);
        });

        // NEW: Listen for world-ready signal from Flutter
        this.addEventListener('world-ready', (eventData) => {
            console.log('🚀 World is ready! Processing queued tasks.');
            console.log('🔍 DEBUG: world-ready event received with data:', eventData);
            console.log(`🔍 DEBUG: BEFORE - isWorldReady: ${this.isWorldReady}, queuedTask exists: ${this.queuedRestorationTask !== null}`);
            
            this.isWorldReady = true;
            
            console.log(`🔍 DEBUG: AFTER setting flag - isWorldReady: ${this.isWorldReady}`);
            
            if (this.queuedRestorationTask) {
                console.log('▶️ Executing queued poster restoration task.');
                console.log('🔍 DEBUG: About to call queuedRestorationTask()');
                this.queuedRestorationTask();
                this.queuedRestorationTask = null; // Clear the task after running
                console.log('🔍 DEBUG: Queued task executed and cleared');
            } else {
                console.warn('⚠️ DEBUG: world-ready fired but no queued task to execute!');
            }
        });
        
        // Listen for poster creation events
        this.addEventListener('posters-created', (data) => {
            console.log('🖼️ Posters created event received:', data);
            this.handlePostersCreated(data);
        });
        
        // Listen for world switch events
        this.addEventListener('world-switching', (data) => {
            console.log('🔄 World switching event received:', data);
            this.handleWorldSwitch(data);
        });
    }
    
    /**
     * Initialize interaction system
     */
    initializeInteractionSystem() {
        console.log('👆 Initializing GlobalPosterManager interaction system...');
        
        // Register global interaction handlers
        this.setupGlobalInteractionHandlers();
    }
    
    /**
     * Setup global interaction handlers for all poster interactions
     */
    setupGlobalInteractionHandlers() {
        // Override existing poster interaction handlers
        if (window.app && window.app.interactionManager) {
            const originalHandleLongPress = window.app.interactionManager.handleLongPress;
            
            window.app.interactionManager.handleLongPress = (object) => {
                if (this.isPosterObject(object)) {
                    return this.handlePosterLongPress(object);
                }
                return originalHandleLongPress.call(window.app.interactionManager, object);
            };
        }
    }
    
    /**
     * Check if object is a poster
     */
    isPosterObject(object) {
        return object && 
               object.userData && 
               (object.userData.type === 'poster' || object.userData.isPoster);
    }
    
    /**
     * Handle poster long press interaction
     */
    handlePosterLongPress(poster) {
        console.log('🖼️ GlobalPosterManager handling poster long press');
        
        if (!this.isPosterObject(poster)) {
            console.warn('⚠️ Object is not a poster');
            return false;
        }
        
        const posterPosition = this.generatePosterPosition(poster);
        const currentURL = this.getPosterURL(posterPosition);
        
        this.showURLInputDialog(posterPosition, currentURL);
        return true;
    }
    
    /**
     * Handle poster double-tap interaction
     */
    handlePosterDoubleTap(poster) {
        console.log('🖼️ GlobalPosterManager handling poster double-tap');
        
        if (!this.isPosterObject(poster)) {
            console.warn('⚠️ Object is not a poster');
            return false;
        }
        
        const posterPosition = this.generatePosterPosition(poster);
        const url = this.getPosterURL(posterPosition);
        
        if (url && url.trim() !== '') {
            this.openPosterURL(url);
            return true;
        } else {
            // No URL set, show input dialog
            this.showURLInputDialog(posterPosition, '');
            return true;
        }
    }
    
    /**
     * Generate consistent poster position identifier
     */
    generatePosterPosition(poster) {
        // Use existing posterType if available (this includes worldType prefix)
        if (poster.userData && poster.userData.posterType) {
            return poster.userData.posterType;
        }
        
        // Fallback: generate with worldType prefix if available
        const x = Math.round(poster.position.x);
        const z = Math.round(poster.position.z);
        const y = Math.round(poster.position.y);
        
        // Include worldType prefix if available
        const worldPrefix = this.currentWorldType ? `${this.currentWorldType}_` : '';
        let posterPosition = `${worldPrefix}poster_${x}_${z}`;
        if (y !== 50) { // Only add Y if it's not the standard poster height
            posterPosition += `_${y}`;
        }
        
        return posterPosition;
    }
    
    /**
     * Get URL for poster at position in current world
     */
    getPosterURL(posterPosition) {
        // Extract world type from posterPosition (e.g., "christmas_poster_147_-50" -> "christmas")
        let worldType = this.currentWorldType;
        
        if (posterPosition.includes('_poster_')) {
            const extractedWorld = posterPosition.split('_poster_')[0];
            if (extractedWorld && this.posterData[extractedWorld] !== undefined) {
                worldType = extractedWorld;
            }
        }
        
        if (!worldType) {
            console.warn('⚠️ No world type could be determined for poster:', posterPosition);
            return null;
        }
        
        const posterData = this.posterData[worldType][posterPosition];
        return posterData ? posterData.url : null;
    }
    
    /**
     * Set URL for poster at position in current world
     */
    async setPosterURL(posterPosition, url) {
        // Extract world type from posterPosition (e.g., "christmas_poster_147_-50" -> "christmas")
        // This handles cases where posters from multiple worlds are loaded simultaneously
        let worldType = this.currentWorldType;
        
        if (posterPosition.includes('_poster_')) {
            const extractedWorld = posterPosition.split('_poster_')[0];
            if (extractedWorld && this.posterData[extractedWorld] !== undefined) {
                worldType = extractedWorld;
            }
        }
        
        if (!worldType) {
            console.warn('⚠️ No world type could be determined');
            return false;
        }
        
        console.log(`🖼️ Setting URL for ${worldType}.${posterPosition}: ${url}`);
        
        // Update in-memory data
        if (!this.posterData[worldType]) {
            this.posterData[worldType] = {};
        }
        
        this.posterData[worldType][posterPosition] = {
            url: url,
            savedAt: Date.now(),
            worldType: worldType,
            posterPosition: posterPosition
        };
        
        // Save to persistence
        await this.savePosterData(worldType, posterPosition, url);
        
        // Update visual if poster is active
        const poster = this.activePosters.get(posterPosition);
        if (poster) {
            console.log(`🎨 Found active poster for ${posterPosition}, updating visual...`);
            await this.updatePosterVisual(poster, url);
        } else {
            console.warn(`⚠️ Poster ${posterPosition} not found in activePosters (${this.activePosters.size} active)`);
            console.log(`📋 Active poster keys:`, Array.from(this.activePosters.keys()));
            console.log(`💡 URL saved to persistence but visual won't update until you switch to ${worldType} world`);
        }
        
        return true;
    }
    
    /**
     * Clear URL for poster at position in current world
     */
    async clearPosterURL(posterPosition) {
        // Extract world type from posterPosition (e.g., "christmas_poster_147_-50" -> "christmas")
        let worldType = this.currentWorldType;
        
        if (posterPosition.includes('_poster_')) {
            const extractedWorld = posterPosition.split('_poster_')[0];
            if (extractedWorld && this.posterData[extractedWorld] !== undefined) {
                worldType = extractedWorld;
            }
        }
        
        if (!worldType) {
            console.warn('⚠️ No world type could be determined');
            return false;
        }
        
        console.log(`🗑️ Clearing URL for ${worldType}.${posterPosition}`);
        
        // Remove from in-memory data
        if (this.posterData[worldType]) {
            delete this.posterData[worldType][posterPosition];
        }
        
        // Save to persistence (empty URL)
        await this.savePosterData(worldType, posterPosition, '');
        
        // Update visual to default state
        const poster = this.activePosters.get(posterPosition);
        if (poster) {
            this.showDefaultState(poster);
        }
        
        return true;
    }
    
    /**
     * Handle poster click (double-tap) - open URL or show dialog
     */
    handlePosterClick(poster) {
        console.log('🖼️ Double-tap detected on poster - opening URL');
        
        // Check if poster has userData
        if (!poster.userData || poster.userData.type !== 'poster') {
            console.log('⚠️ Object is not a poster');
            return false;
        }

        // Get the poster position and stored URL (use proper object access, not Map.get)
        const posterPosition = this.generatePosterPosition(poster);
        const posterURL = this.getPosterURL(posterPosition);
        
        console.log(`🔍 Retrieved URL for ${posterPosition}: "${posterURL}"`);
        
        if (posterURL && posterURL.trim() !== '') {
            console.log(`🖼️ Opening poster URL: ${posterURL}`);
            this.openPosterURL(posterURL);
            return true;
        } else {
            console.log('🖼️ No URL set for this poster, showing input dialog');
            // Show URL input dialog if no URL is set
            const currentURL = posterURL || '';
            this.showURLInputDialog(posterPosition, currentURL);
            return true;
        }
    }
    
    /**
     * Open poster URL using the same method as Link Objects
     */
    openPosterURL(url) {
        try {
            console.log(`🖼️ Opening poster URL: ${url}`);
            
            // Use the same Flutter channel that Link Objects use
            if (typeof flutterBridge !== 'undefined' && flutterBridge.openURL) {
                flutterBridge.openURL(url);
            } else if (window.flutter_inappwebview) {
                window.flutter_inappwebview.callHandler('openURL', url);
            } else {
                // Fallback to window.open
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('❌ Error opening poster URL:', error);
        }
    }
    
    /**
     * Show URL input dialog
     */
    showURLInputDialog(posterPosition, currentURL = '') {
        console.log(`🔧 Showing URL input dialog for ${posterPosition}`);
        
        // Create custom modal dialog
        this.createCustomModal(currentURL, (url) => {
            if (url !== null) {
                if (url.trim() !== '') {
                    this.setPosterURL(posterPosition, url.trim());
                } else {
                    this.clearPosterURL(posterPosition);
                }
            }
        });
    }
    
    /**
     * Create custom modal dialog for URL input
     */
    createCustomModal(currentURL, callback) {
        // Remove existing modal if any
        const existingModal = document.getElementById('global-poster-url-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'global-poster-url-modal';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, #4A90E2, #50C878);
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
            max-width: 500px;
            width: 90%;
            text-align: center;
            border: 3px solid #2E86AB;
        `;
        
        // Title
        const title = document.createElement('h2');
        title.textContent = '🖼️ Poster URL Manager';
        title.style.cssText = `
            color: white;
            margin: 0 0 15px 0;
            font-size: 24px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
        `;
        
        // Instructions
        const instructions = document.createElement('p');
        instructions.textContent = 'Enter a URL to display on this poster:';
        instructions.style.cssText = `
            color: white;
            margin: 0 0 20px 0;
            font-size: 16px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
        `;
        
        // Input field
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentURL;
        input.placeholder = 'https://youtube.com/watch?v=... or image URL';
        input.style.cssText = `
            width: 100%;
            padding: 15px;
            border: 2px solid #2E86AB;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 20px;
            box-sizing: border-box;
            outline: none;
        `;
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
        `;
        
        // Set button
        const setButton = document.createElement('button');
        setButton.textContent = 'Set URL';
        setButton.style.cssText = `
            background: #2E86AB;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
            transition: background 0.3s;
        `;
        setButton.onmouseover = () => setButton.style.background = '#1B5E7B';
        setButton.onmouseout = () => setButton.style.background = '#2E86AB';
        
        // Clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear';
        clearButton.style.cssText = `
            background: #D32F2F;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
            transition: background 0.3s;
        `;
        clearButton.onmouseover = () => clearButton.style.background = '#B71C1C';
        clearButton.onmouseout = () => clearButton.style.background = '#D32F2F';
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            background: #757575;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
            transition: background 0.3s;
        `;
        cancelButton.onmouseover = () => cancelButton.style.background = '#424242';
        cancelButton.onmouseout = () => cancelButton.style.background = '#757575';
        
        // Event handlers
        setButton.onclick = () => {
            callback(input.value);
            overlay.remove();
        };
        
        clearButton.onclick = () => {
            callback('');
            overlay.remove();
        };
        
        cancelButton.onclick = () => {
            callback(null);
            overlay.remove();
        };
        
        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                callback(null);
                overlay.remove();
            }
        };
        
        // Enter key handling
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                callback(input.value);
                overlay.remove();
            }
        };
        
        // Escape key handling
        document.onkeydown = (e) => {
            if (e.key === 'Escape' && document.getElementById('global-poster-url-modal')) {
                callback(null);
                overlay.remove();
            }
        };
        
        // Assemble modal
        buttonContainer.appendChild(setButton);
        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(cancelButton);
        
        modal.appendChild(title);
        modal.appendChild(instructions);
        modal.appendChild(input);
        modal.appendChild(buttonContainer);
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Focus input
        setTimeout(() => input.focus(), 100);
    }
    
    /**
     * Open URL using the same method as other app components
     */
    openPosterURL(url) {
        try {
            console.log(`🔗 Opening poster URL: ${url}`);
            
            // Clean URL
            let cleanUrl = url;
            if (typeof url === 'object' && url.url) {
                cleanUrl = url.url;
            }
            
            // Try using LinkInteractionManager first
            if (window.linkInteractionManager && typeof window.linkInteractionManager.openURL === 'function') {
                console.log('🔗 Using LinkInteractionManager for poster URL');
                let linkType = 'website';
                if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
                    linkType = 'youtube';
                }
                window.linkInteractionManager.openURL(cleanUrl, linkType);
                return;
            }
            
            // Fallback to UrlLaunchHandler
            if (window.UrlLaunchHandler) {
                console.log('🔗 Using UrlLaunchHandler for poster URL');
                const messageData = { url: cleanUrl };
                window.UrlLaunchHandler.postMessage(JSON.stringify(messageData));
                return;
            }
            
            // Final fallback to ExternalUrlHandler
            if (window.ExternalUrlHandler) {
                console.log('🔗 Using ExternalUrlHandler for poster URL');
                let linkType = 'website';
                if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
                    linkType = 'youtube';
                }
                const message = JSON.stringify({ url: cleanUrl, linkType: linkType });
                window.ExternalUrlHandler.postMessage(message);
            } else {
                console.warn('🔗 No URL handlers available');
            }
        } catch (error) {
            console.error('❌ Error opening poster URL:', error);
        }
    }
    
    /**
     * Event system methods
     */
    addEventListener(eventType, callback) {
        if (!this.eventCallbacks.has(eventType)) {
            this.eventCallbacks.set(eventType, []);
        }
        this.eventCallbacks.get(eventType).push(callback);
    }
    
    dispatchEvent(eventType, data) {
        console.log(`📡 GlobalPosterManager dispatching event: ${eventType}`, data);
        if (this.eventCallbacks.has(eventType)) {
            this.eventCallbacks.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error in event callback for ${eventType}:`, error);
                }
            });
        }
    }
    
    /**
     * Handle world setup complete
     */
    handleWorldSetupComplete(data) {
        console.log(`🌍 World setup complete for: ${data.worldType}`);
        this.currentWorldType = data.worldType;
        
        // Load poster data for this world
        this.loadPosterDataForWorld(data.worldType);
    }
    
    /**
     * Handle posters created event from world templates
     */
    async handlePostersCreated(data) {
        console.log(`🖼️ Posters created for world: ${data.worldType}`, data);
        
        this.currentWorldType = data.worldType;
        this.activePosters.clear();
        
        // Ensure poster data is loaded first
        await this.loadPosterDataForWorld(data.worldType);
        
        // Register all posters and set up interaction
        data.posters.forEach(poster => {
            const posterPosition = this.generatePosterPosition(poster);
            this.activePosters.set(posterPosition, poster);
            
            // Store poster position in userData
            poster.userData.posterPosition = posterPosition;
            poster.userData.globalPosterManager = true;
            
            // Ensure proper interaction setup for all posters
            this.ensurePosterInteractionSetup(poster);
        });
        
        console.log(`🖼️ Registered ${data.posters.length} posters for ${data.worldType}`);
        
        // CRITICAL FIX: Restore poster URLs after posters are registered.
        // This ensures that saved poster textures appear immediately on initial world load.
        const restorationTask = async () => {
            console.log(`⏰ Poster restoration task triggered for ${data.worldType}`);
            await this.restorePosterURLs(data.worldType);
        };

        // If the world is not ready yet (initial load), queue the task. Otherwise, run it immediately.
        console.log(`🔍 DEBUG: Checking isWorldReady status: ${this.isWorldReady}`);
        console.log(`🔍 DEBUG: hasSeenWorldSwitch: ${this.hasSeenWorldSwitch}`);
        console.log(`🔍 DEBUG: queuedRestorationTask exists: ${this.queuedRestorationTask !== null}`);
        
        if (!this.isWorldReady) {
            console.log('⌛ World not ready yet, queuing poster restoration for when Flutter signals ready.');
            console.log(`🔍 DEBUG: Setting queuedRestorationTask for ${data.worldType}`);
            this.queuedRestorationTask = restorationTask;
        } else {
            console.log('✅ World is ready, restoring posters after brief delay.');
            console.log(`🔍 DEBUG: isWorldReady is TRUE, executing immediately with 300ms delay`);
            // Use a shorter delay for world switches since everything is already initialized
            setTimeout(restorationTask, 300);
        }
    }
    
    /**
     * Handle world switch
     */
    handleWorldSwitch(data) {
        console.log(`🔄 Switching worlds: ${data.from} -> ${data.to}`);
        
        // Mark that we've seen a world switch
        this.hasSeenWorldSwitch = true;
        
        // Clear active posters
        this.activePosters.clear();
        
        // Update current world
        this.currentWorldType = data.to;
    }
    
    /**
     * Update poster visual with URL content
     */
    async updatePosterVisual(poster, url) {
        // Extract URL string (handle both string and object formats)
        const urlString = typeof url === 'object' && url.url ? url.url : url;
        
        console.log(`🎨 Updating poster visual with URL: ${urlString}`);
        
        // Show loading state first
        this.showLoadingState(poster);
        
        try {
            // Get thumbnail data
            const thumbnailData = await this.getThumbnailForURL(urlString);
            
            if (thumbnailData && poster.material) {
                // Apply thumbnail texture
                const texture = new THREE.CanvasTexture(thumbnailData.data);
                texture.needsUpdate = true;
                
                if (poster.material.map) {
                    poster.material.map.dispose();
                }
                poster.material.map = texture;
                poster.material.needsUpdate = true;
                
                console.log(`✅ Applied thumbnail to poster: ${urlString}`);
            } else {
                // Fallback to URL text display
                this.showURLFallback(poster, urlString);
            }
        } catch (error) {
            console.error('❌ Error updating poster visual:', error);
            this.showURLFallback(poster, urlString);
        }
    }

    /**
     * Update poster texture immediately without loading state (for initial load)
     */
    async updatePosterTextureImmediate(poster, url) {
        // Extract URL string (handle both string and object formats)
        const urlString = typeof url === 'object' && url.url ? url.url : url;
        
        console.log(`🎨 Immediate poster texture update with URL: ${urlString}`);
        
        try {
            // Get thumbnail data
            const thumbnailData = await this.getThumbnailForURL(urlString);
            
            if (thumbnailData && poster.material) {
                // Apply thumbnail texture directly
                const texture = new THREE.CanvasTexture(thumbnailData.data);
                texture.needsUpdate = true;
                
                if (poster.material.map) {
                    poster.material.map.dispose();
                }
                poster.material.map = texture;
                poster.material.needsUpdate = true;
                
                // UNIQUE DEBUG LOG - Track when texture is actually applied
                console.log(`🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO TEXTURE APPLIED TO POSTER: ${poster.userData.posterType || 'unknown'} 🔥🔥🔥`);
                
                console.log(`✅ Applied immediate thumbnail to poster: ${urlString}`);
            } else {
                // Fallback to URL text display
                this.showURLFallback(poster, urlString);
            }
        } catch (error) {
            console.error('❌ Error in immediate poster texture update:', error);
            this.showURLFallback(poster, urlString);
        }
    }

    /**
     * Ensure poster has proper interaction setup without changing texture
     */
    ensurePosterInteractionSetup(poster) {
        // Verify poster userData is properly configured for interactions
        if (!poster.userData) {
            poster.userData = {};
        }
        
        poster.userData.hasDoubleTabInteraction = true;
        poster.userData.hasLongPressInteraction = true;
        poster.userData.isPoster = true;
        poster.userData.type = 'poster';
        poster.userData.interactable = true;
        poster.userData.globalPosterManager = true;
        
        console.log(`🔧 Ensured interaction setup for poster: ${poster.userData.posterPosition || 'unknown'}`);
    }
    
    /**
     * Show default "Press & Hold to Add Website URL" state
     */
    showDefaultState(poster) {
        if (!poster || !poster.material) return;
        
        // Check if poster already has a default texture (to avoid overwriting)
        if (poster.material.map && poster.userData.hasDefaultTexture) {
            console.log('🖼️ Poster already has default texture, not overwriting');
            return;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 288; // 16:9 aspect ratio
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Border
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Main text
        ctx.fillStyle = '#666666';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🖼️', canvas.width/2, canvas.height/3 - 20);
        
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Press & Hold', canvas.width/2, canvas.height/2);
        
        ctx.font = '20px Arial';
        ctx.fillText('to Add Website URL', canvas.width/2, canvas.height/2 + 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        
        if (poster.material.map) {
            poster.material.map.dispose();
        }
        poster.material.map = texture;
        poster.material.needsUpdate = true;
        
        // Mark as having default texture
        poster.userData.hasDefaultTexture = true;
        
        console.log('🖼️ Applied default poster state');
    }
    
    /**
     * Restore poster URLs after posters are created (based on backup implementation)
     * This is the key method missing from the current implementation
     */
    async restorePosterURLs(worldType) {
        console.log(`🖼️ Attempting to restore poster URLs for world: ${worldType}...`);
        console.log(`🔍 DEBUG: restorePosterURLs() called at ${Date.now()}`);
        
        // UNIQUE DEBUG LOG - Track when restoration attempts happen
        console.log(`🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO URL RESTORATION ATTEMPT FOR: ${worldType} 🔥🔥🔥`);
        
        try {
            // Ensure we have the latest data from persistence
            console.log(`🖼️ Loading poster URLs from persistence for ${worldType}...`);
            console.log(`🔍 DEBUG: About to call loadPosterDataForWorld(${worldType})`);
            await this.loadPosterDataForWorld(worldType);
            console.log(`🔍 DEBUG: loadPosterDataForWorld completed, posterData:`, this.posterData[worldType]);
            
            // Find all active posters
            const posters = Array.from(this.activePosters.values());
            console.log(`🖼️ Found ${posters.length} active posters to restore`);

            // NEW: Verify all posters have materials initialized
            const postersReady = posters.every(p => p.material && p.material.map !== undefined);
            if (!postersReady) {
                console.warn('⚠️ Some posters not fully initialized yet, delaying restoration...');
                setTimeout(() => this.restorePosterURLs(worldType), 500);
                return;
            }

            for (const poster of posters) {
                const posterPosition = poster.userData.posterPosition || this.generatePosterPosition(poster);
                
                // Get the saved data (might be string or object)
                const savedURL = this.posterData[worldType] && this.posterData[worldType][posterPosition];
                
                console.log(`🔧 Restoring ${posterPosition}: ${savedURL} (type: ${typeof savedURL})`);
                
                // Extract URL string (handle both formats)
                let urlString = null;
                if (typeof savedURL === 'string' && savedURL.trim() !== '') {
                    urlString = savedURL;
                } else if (savedURL && typeof savedURL === 'object' && savedURL.url) {
                    urlString = savedURL.url;
                }
                
                if (urlString && urlString.trim() !== '') {
                    console.log(`🖼️ Restoring URL for ${posterPosition}: ${urlString}`);
                    
                    try {
                        // Use immediate texture update for restoration (no loading state)
                        // CRITICAL: Pass urlString (not savedURL object) to updatePosterTextureImmediate
                        await this.updatePosterTextureImmediate(poster, urlString);
                        
                        // Store STRING in userData
                        poster.userData.posterURL = urlString;
                        poster.userData.posterType = posterPosition;
                        
                        console.log(`✅ Successfully restored poster ${posterPosition} with URL: ${urlString}`);
                        
                    } catch (error) {
                        console.warn(`⚠️ Could not load thumbnail for restored URL: ${urlString}`, error);
                        this.showURLFallback(poster, urlString);
                    }
                } else {
                    console.log(`🖼️ No saved URL found for ${posterPosition}, keeping default texture`);
                    // Ensure posterType is set even if no URL
                    poster.userData.posterType = posterPosition;
                }
            }
            
            console.log(`✅ Poster URL restoration completed for ${worldType}`);
            
        } catch (error) {
            console.error('❌ Error restoring poster URLs:', error);
        }
    }

    /**
     * Show loading state
     */
    showLoadingState(poster) {
        if (!poster || !poster.material) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 288;
        const ctx = canvas.getContext('2d');
        
        // Light blue background
        ctx.fillStyle = '#E3F2FD';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Loading text
        ctx.fillStyle = '#1976D2';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⏳ Loading...', canvas.width/2, canvas.height/2);
        
        const texture = new THREE.CanvasTexture(canvas);
        
        if (poster.material.map) {
            poster.material.map.dispose();
        }
        poster.material.map = texture;
        poster.material.needsUpdate = true;
    }
    
    /**
     * Show URL fallback text
     */
    showURLFallback(poster, url) {
        if (!poster || !poster.material) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 288;
        const ctx = canvas.getContext('2d');
        
        // Light green background
        ctx.fillStyle = '#E8F5E8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Success indicator
        ctx.fillStyle = '#2E7D32';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🔗 URL SET', canvas.width/2, canvas.height/3);
        
        // Truncated URL
        ctx.font = '18px Arial';
        const truncatedURL = url.length > 40 ? url.substring(0, 37) + '...' : url;
        ctx.fillText(truncatedURL, canvas.width/2, canvas.height/2 + 20);
        
        const texture = new THREE.CanvasTexture(canvas);
        
        if (poster.material.map) {
            poster.material.map.dispose();
        }
        poster.material.map = texture;
        poster.material.needsUpdate = true;
    }
    
    /**
     * Get thumbnail for URL
     */
    async getThumbnailForURL(url) {
        console.log(`🔍 Getting thumbnail for URL: ${url}`);
        
        // YouTube URL detection
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (youtubeMatch) {
            const videoId = youtubeMatch[1];
            return await this.getYouTubeThumbnail(videoId);
        }
        
        // Direct image URL detection
        if (this.isImageURL(url)) {
            return await this.loadDirectImage(url);
        }
        
        return null;
    }
    
    /**
     * Get YouTube thumbnail
     */
    async getYouTubeThumbnail(videoId) {
        try {
            const thumbnailUrls = [
                `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
               
                `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
                `https://img.youtube.com/vi/${videoId}/0.jpg`,
                `https://img.youtube.com/vi/${videoId}/default.jpg`
            ];
            
            for (const thumbUrl of thumbnailUrls) {
                const imageData = await this.loadImageFromURL(thumbUrl);
                if (imageData) {
                    console.log(`✅ Loaded YouTube thumbnail: ${thumbUrl}`);
                    return { type: 'youtube', data: imageData, videoId: videoId };
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error loading YouTube thumbnail:', error);
            return null;
        }
    }
    
    /**
     * Check if URL is likely an image
     */
    isImageURL(url) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const lowerURL = url.toLowerCase();
        return imageExtensions.some(ext => lowerURL.includes(ext));
    }
    
    /**
     * Load direct image
     */
    async loadDirectImage(url) {
        try {
            const imageData = await this.loadImageFromURL(url);
            if (imageData) {
                console.log(`✅ Loaded direct image: ${url}`);
                return { type: 'image', data: imageData };
            }
            return null;
        } catch (error) {
            console.error('❌ Error loading direct image:', error);
            return null;
        }
    }
    
    /**
     * Load image from URL using canvas
     */
    loadImageFromURL(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            const timeout = setTimeout(() => {
                console.log(`⏰ Timeout loading image: ${url}`);
                resolve(null);
            }, 8000);
            
            img.onload = () => {
                clearTimeout(timeout);
                
                if (img.width === 0 || img.height === 0) {
                    console.warn(`❌ Invalid image dimensions for ${url}`);
                    resolve(null);
                    return;
                }
                
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = 512;
                    canvas.height = 288; // 16:9 aspect ratio
                    
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas);
                } catch (error) {
                    console.error(`❌ Error processing image ${url}:`, error);
                    resolve(null);
                }
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                console.log(`❌ Failed to load image: ${url}`);
                resolve(null);
            };
            
            img.src = url;
        });
    }
    
    /**
     * Persistence methods
     */
    
    /**
     * Load all poster data from storage
     */
    async loadAllPosterData() {
        console.log('📥 Loading all poster data from storage...');
        
        try {
            // Try Flutter persistence first
            if (this.persistenceChannel) {
                for (const worldType of Object.keys(this.posterData)) {
                    await this.loadPosterDataForWorld(worldType);
                }
            }
            
            // Also load from localStorage as backup
            this.loadFromLocalStorage();
            
        } catch (error) {
            console.error('❌ Error loading poster data:', error);
            this.loadFromLocalStorage();
        }
    }
    
    /**
     * Load poster data for specific world
     */
    async loadPosterDataForWorld(worldType) {
        return new Promise((resolve) => {
            if (this.persistenceChannel) {
                this.persistenceChannel.loadPosterURLsForWorld(worldType, (success, data, error) => {
                    if (success && data) {
                        console.log(`📥 Loaded poster data for ${worldType}:`, data);
                        this.posterData[worldType] = this.processPersistenceData(data, worldType);
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
    
    /**
     * Process persistence data format
     */
    processPersistenceData(data, worldType) {
        const processedData = {};
        
        console.log(`🔧 Processing persistence data for ${worldType}:`, data);
        
        try {
            Object.entries(data).forEach(([posterPosition, urlData]) => {
                console.log(`🔧 Processing ${posterPosition}:`, urlData, `(type: ${typeof urlData})`);
                
                let url = null;

                // Handle string data (most common case)
                if (typeof urlData === 'string') {
                    // Try parsing as JSON first
                    try {
                        const parsed = JSON.parse(urlData);
                        url = parsed?.url || urlData; // Use url property if exists, otherwise use the string itself
                    } catch {
                        // Not JSON - check if it's a JavaScript object string representation
                        const urlMatch = urlData.match(/url:\s*['"]([^'"]+)['"]/);
                        if (urlMatch) {
                            url = urlMatch[1];
                        } else {
                            // Assume it's a plain URL string
                            url = urlData;
                        }
                    }
                } 
                // Handle object data
                else if (urlData && typeof urlData === 'object' && urlData.url) {
                    url = urlData.url;
                }
                
                // Store only valid URLs
                if (url && typeof url === 'string' && url.trim() !== '') {
                    processedData[posterPosition] = url;
                    console.log(`✅ Loaded ${posterPosition}: ${url}`);
                } else {
                    console.log(`⚠️ Skipped ${posterPosition} - invalid URL data`);
                }
            });
        } catch (error) {
            console.error('❌ Error processing persistence data:', error);
        }
        
        console.log(`🔧 Final processed data for ${worldType}:`, processedData);
        return processedData;
    }
    
    /**
     * Load from localStorage as fallback
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('globalPosterData');
            if (saved) {
                const data = JSON.parse(saved);
                
                // Merge with existing data
                Object.keys(data).forEach(worldType => {
                    if (this.posterData[worldType]) {
                        this.posterData[worldType] = { ...this.posterData[worldType], ...data[worldType] };
                    }
                });
                
                console.log('📥 Loaded poster data from localStorage');
            }
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error);
        }
    }
    
    /**
     * Save poster data
     */
    async savePosterData(worldType, posterPosition, url) {
        try {
            // Save to Flutter persistence
            if (this.persistenceChannel) {
                this.persistenceChannel.saveSinglePosterURL(worldType, posterPosition, url);
            }
            
            // Save to localStorage as backup
            this.saveToLocalStorage();
            
        } catch (error) {
            console.error('❌ Error saving poster data:', error);
        }
    }
    
    /**
     * Save to localStorage
     */
    saveToLocalStorage() {
        try {
            localStorage.setItem('globalPosterData', JSON.stringify(this.posterData));
            console.log('💾 Saved poster data to localStorage');
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    }
    
    /**
     * Notify that posters have been created (called by world templates)
     */
    notifyPostersCreated(worldType, posters) {
        console.log(`📢 World ${worldType} notified of ${posters.length} posters created`);
        
        this.dispatchEvent('posters-created', {
            worldType: worldType,
            posters: posters
        });
    }
    
    /**
     * Initialize app-level poster system (called during app startup)
     */
    static initialize() {
        console.log('🚀 Initializing global poster system...');
        
        const manager = GlobalPosterManager.getInstance();
        manager.isInitialized = true;
        
        // Make manager globally available
        window.globalPosterManager = manager;
        
        console.log('✅ Global poster system initialized successfully');
        return manager;
    }
    
    /**
     * Register a poster with the global manager (for fallback scenarios)
     */
    registerPoster(posterObject, worldType) {
        console.log(`📝 Registering poster for world ${worldType}`);
        
        if (!this.isPosterObject(posterObject)) {
            console.warn('⚠️ Attempted to register non-poster object');
            return;
        }
        
        // Ensure world data structure exists
        if (!this.posterData[worldType]) {
            this.posterData[worldType] = {};
        }
        
        // Generate position identifier
        const posterPosition = this.generatePosterPosition(posterObject);
        
        // Store reference
        this.activePosters.set(posterPosition, posterObject);
        
        // Set up interaction metadata
        posterObject.userData.hasDoubleTabInteraction = true;
        posterObject.userData.posterPosition = posterPosition;
        posterObject.userData.worldType = worldType;
        
        console.log(`✅ Poster registered: ${posterPosition} in ${worldType}`);
    }
    
    /**
     * Restore all posters for a specific world
     */
    restoreWorldPosters(worldType) {
        console.log(`🔄 Restoring posters for world: ${worldType}`);
        
        if (!this.posterData[worldType]) {
            console.log(`ℹ️ No saved data for world: ${worldType}`);
            return;
        }
        
        const worldData = this.posterData[worldType];
        let restoredCount = 0;
        
        // Iterate through all active posters
        for (const [posterPosition, posterObject] of this.activePosters.entries()) {
            if (posterObject.userData && posterObject.userData.worldType === worldType) {
                const savedURL = worldData[posterPosition];
                if (savedURL && savedURL.trim() !== '') {
                    this.updatePosterTexture(posterObject, savedURL);
                    restoredCount++;
                    console.log(`📷 Restored poster ${posterPosition}: ${savedURL}`);
                } else {
                    // Set default text
                    this.setDefaultPosterText(posterObject);
                }
            }
        }
        
        console.log(`✅ Restored ${restoredCount} posters for ${worldType}`);
    }
    
    /**
     * Set poster to default text state
     */
    setDefaultPosterText(poster) {
        console.log('🎨 Setting poster to default text state');
        this.showDefaultState(poster);
    }
    
    /**
     * Update poster texture with URL content
     */
    async updatePosterTexture(poster, url) {
        console.log(`🎨 Updating poster texture with URL: ${url}`);
        
        if (!url || url.trim() === '') {
            this.showDefaultState(poster);
            return;
        }
        
        try {
            // Try to get YouTube thumbnail
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const videoId = this.extractYouTubeVideoId(url);
                if (videoId) {
                    await this.loadYouTubeThumbnail(poster, url, videoId);
                    return;
                }
            }
            
            // Fallback to URL text display
            this.showURLText(poster, url);
            
        } catch (error) {
            console.error('❌ Error updating poster texture:', error);
            this.showURLText(poster, url);
        }
    }
    
    /**
     * Extract YouTube video ID from URL
     */
    extractYouTubeVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/live\/([^&\n?#]+)/,
            /youtube\.com\/shorts\/([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }
    
    /**
     * Load YouTube thumbnail for poster
     */
    async loadYouTubeThumbnail(poster, url, videoId) {
        return new Promise((resolve) => {
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 288; // 16:9 aspect ratio
                const ctx = canvas.getContext('2d');
                
                // Draw thumbnail
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Apply texture
                const texture = new THREE.CanvasTexture(canvas);
                texture.needsUpdate = true;
                
                if (poster.material.map) {
                    poster.material.map.dispose();
                }
                poster.material.map = texture;
                poster.material.needsUpdate = true;
                
                console.log(`✅ Loaded YouTube thumbnail: ${thumbnailUrl}`);
                console.log(`✅ Applied thumbnail to poster: ${JSON.stringify({url, savedAt: Date.now(), posterType: poster.userData.posterType})}`);
                resolve();
            };
            
            img.onerror = () => {
                console.warn('⚠️ Failed to load YouTube thumbnail, showing URL text');
                this.showURLText(poster, url);
                resolve();
            };
            
            img.src = thumbnailUrl;
        });
    }
    
    /**
     * Show URL as text on poster
     */
    showURLText(poster, url) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 288;
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Border
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // URL text (wrapped if too long)
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        
        const maxWidth = canvas.width - 40;
        const words = url.split('/');
        let lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? '/' : '') + word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
        
        // Draw lines
        const lineHeight = 25;
        const startY = (canvas.height - (lines.length * lineHeight)) / 2;
        
        lines.forEach((line, index) => {
            ctx.fillText(line, canvas.width/2, startY + (index * lineHeight));
        });
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        if (poster.material.map) {
            poster.material.map.dispose();
        }
        poster.material.map = texture;
        poster.material.needsUpdate = true;
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            currentWorldType: this.currentWorldType,
            totalActivePosters: this.activePosters.size,
            worldDataKeys: Object.keys(this.posterData),
            eventCallbacks: Array.from(this.eventCallbacks.keys()),
            hasPersistenceChannel: !!this.persistenceChannel
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalPosterManager;
} else if (typeof window !== 'undefined') {
    window.GlobalPosterManager = GlobalPosterManager;
}

console.log('🖼️ GlobalPosterManager class loaded successfully');