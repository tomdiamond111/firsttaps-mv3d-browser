/**
 * Media Preview Screen Module (MV3D)
 * Displays embedded media players for YouTube, Spotify, local files
 * Core feature for FirstTaps MV3D media organization
 */

window.MediaPreviewScreenClass = class MediaPreviewScreen {
    constructor(mediaData, scene) {
        this.mediaData = mediaData;
        this.scene = scene;
        this.isVisible = false;
        
        // Screen properties - same size as contact screens
        this.screenWidth = 12;  // Larger for video content
        this.screenHeight = 16;
        this.canvasWidth = 1200;
        this.canvasHeight = 1600;
        
        // Media player state
        this.mediaType = this.detectMediaType(mediaData);
        this.player = null;
        this.isPlaying = false;
        this.isMuted = false;
        
        // HTML overlay for actual media playback
        this.mediaOverlay = null;
        this.mediaElement = null;
        this.mediaElementReady = false;
        
        // UI state
        this.hoveredButton = null;
        this.buttons = [];
        
        // Store furniture/path playback context for playlist controls
        // This ensures controls persist across media element recreation
        // Check BOTH mediaData.activeFurniturePlayback (from PiP expansion) AND window.app.activeFurniturePlayback
        const furniturePlayback = mediaData?.activeFurniturePlayback || window.app?.activeFurniturePlayback;
        this.furniturePlaybackContext = furniturePlayback ? {
            furnitureId: furniturePlayback.furnitureId,
            slotIndex: furniturePlayback.slotIndex,
            objectId: furniturePlayback.objectId
        } : null;
        this.pathPlaybackContext = mediaData?.activePathPlayback || null;
        
        console.log('🎵 Preview context initialized:', {
            furnitureContext: this.furniturePlaybackContext,
            pathContext: this.pathPlaybackContext
        });
        
        this.createScreen();
        this.setupInputHandling();
        this.createMediaOverlay(); // Create HTML overlay container
        
        console.log(`🎵 Media Preview Screen initialized for ${this.mediaData.name || this.mediaData.fileName}`);
    }
    
    /**
     * Detect media type from media data
     */
    detectMediaType(mediaData) {
        // Check ALL possible URL sources
        const url = mediaData.url || mediaData.path || mediaData.id || '';
        const extension = mediaData.extension || '';
        
        console.log('🎵 Detecting media type for:', {url, extension, mediaData});
        console.log('🎵 URL value:', url);
        console.log('🎵 Extension value:', extension);
        
        // URL-based detection
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            console.log('🎵 Detected YouTube URL');
            return 'youtube';
        }
        if (url.includes('spotify.com')) {
            return 'spotify';
        }
        if (url.includes('soundcloud.com')) {
            return 'soundcloud';
        }
        if (url.includes('vimeo.com')) {
            return 'vimeo';
        }
        if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
            return 'dailymotion';
        }
        if (url.includes('deezer.com')) {
            return 'deezer';
        }
        if (url.includes('twitch.tv')) {
            return 'twitch';
        }
        if (url.includes('music.apple.com')) {
            return 'apple_music';
        }
        if (url.includes('pandora.com')) {
            return 'pandora';
        }
        if (url.includes('music.amazon.com') || url.includes('amazon.com/music')) {
            return 'amazon_music';
        }
        if (url.includes('tiktok.com')) {
            return 'tiktok';
        }
        if (url.includes('instagram.com/reel') || url.includes('instagram.com/p/')) {
            return 'instagram';
        }
        if (url.includes('snapchat.com/spotlight')) {
            return 'snapchat';
        }
        
        // File extension detection
        const lowerExt = extension.toLowerCase();
        if (['.mp4', '.mov', '.avi', '.webm', '.mkv'].includes(lowerExt)) {
            return 'video';
        }
        if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(lowerExt)) {
            return 'audio';
        }
        
        console.log('🎵 Media type: unknown (defaulting)');
        return 'unknown';
    }
    
    /**
     * Create the 3D screen mesh with canvas texture
     */
    createScreen() {
        // Create canvas for rendering media preview
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.ctx = this.canvas.getContext('2d');
        
        // Create screen geometry
        const geometry = new THREE.PlaneGeometry(this.screenWidth, this.screenHeight);
        
        // Create texture from canvas
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.magFilter = THREE.LinearFilter;
        this.texture.minFilter = THREE.LinearFilter;
        
        // Create material
        this.material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.visible = false;
        
        // Add user data for interaction
        this.mesh.userData.isMediaPreviewScreen = true;
        this.mesh.userData.mediaPreviewScreen = this;
        this.mesh.userData.isInteractive = true;
        
        // Render initial content
        this.render();
        
        console.log(`🎵 Media preview screen mesh created for type: ${this.mediaType}`);
    }
    
    /**
     * Define interactive button areas
     */
    defineButtons() {
        this.buttons = [
            {
                id: 'play_pause',
                label: this.isPlaying ? '⏸️ Pause' : '▶️ Play',
                x: 100,
                y: 1200,
                width: 500,
                height: 100,
                action: () => this.togglePlayPause()
            },
            {
                id: 'mute',
                label: this.isMuted ? '🔊 Unmute' : '🔇 Mute',
                x: 650,
                y: 1200,
                width: 450,
                height: 100,
                action: () => this.toggleMute()
            },
            {
                id: 'like',
                label: '👍 Like',
                x: 100,
                y: 1325,
                width: 475,
                height: 90,
                action: () => this.recordFeedback('liked')
            },
            {
                id: 'dislike',
                label: '👎 Dislike',
                x: 625,
                y: 1325,
                width: 475,
                height: 90,
                action: () => this.recordFeedback('disliked')
            },
            {
                id: 'open_native',
                label: '🚀 Open in App',
                x: 100,
                y: 1440,
                width: 1000,
                height: 90,
                action: () => this.openInNativeApp()
            },
            {
                id: 'close',
                label: '✕ Close',
                x: 100,
                y: 1545,
                width: 1000,
                height: 90,
                action: () => this.hide()
            }
        ];
    }
    
    /**
     * Render media preview on canvas
     */
    render() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Header bar
        ctx.fillStyle = '#0f1419';
        ctx.fillRect(0, 0, this.canvasWidth, 120);
        
        // Header text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Media Preview', this.canvasWidth / 2, 75);
        
        // Media type indicator
        ctx.font = '32px Arial';
        ctx.fillStyle = '#95a5a6';
        const typeLabel = this.getTypeLabel();
        ctx.fillText(typeLabel, this.canvasWidth / 2, 105);
        
        // Media content area
        this.renderMediaContent();
        
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        const title = this.mediaData.name || this.mediaData.fileName || 'Media';
        ctx.fillText(this.truncateText(title, 28), this.canvasWidth / 2, 1100);
        
        // Define and render buttons
        this.defineButtons();
        this.renderButtons();
        
        // Update texture
        this.texture.needsUpdate = true;
    }
    
    /**
     * Get friendly type label
     */
    getTypeLabel() {
        const labels = {
            'youtube': '📺 YouTube Video',
            'spotify': '🎵 Spotify Track',
            'soundcloud': '🎵 SoundCloud',
            'vimeo': '🎬 Vimeo Video',
            'deezer': '🎵 Deezer Track',
            'apple_music': '🎵 Apple Music',
            'pandora': '🎵 Pandora',
            'amazon_music': '🎵 Amazon Music',
            'twitch': '🎮 Twitch Stream',
            'video': '🎬 Video File',
            'audio': '🎵 Audio File',
            'unknown': '📎 Media'
        };
        return labels[this.mediaType] || labels['unknown'];
    }
    
    /**
     * Render media content area
     */
    renderMediaContent() {
        const ctx = this.ctx;
        
        // Content area background
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(50, 180, this.canvasWidth - 100, 850);
        
        // Border
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 4;
        ctx.strokeRect(50, 180, this.canvasWidth - 100, 850);
        
        // Media player placeholder
        ctx.fillStyle = '#34495e';
        ctx.fillRect(100, 230, this.canvasWidth - 200, 700);
        
        // Platform icon/text
        ctx.fillStyle = '#95a5a6';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.getPlatformIcon(), this.canvasWidth / 2, 550);
        
        // Status text
        ctx.font = '36px Arial';
        const statusText = this.isPlaying ? 'Playing...' : 'Ready to Play';
        ctx.fillText(statusText, this.canvasWidth / 2, 650);
        
        // URL/Path info
        if (this.mediaData.url || this.mediaData.path) {
            ctx.font = '24px monospace';
            ctx.fillStyle = '#7f8c8d';
            const urlText = this.truncateText(this.mediaData.url || this.mediaData.path, 50);
            ctx.fillText(urlText, this.canvasWidth / 2, 850);
        }
    }
    
    /**
     * Get platform-specific icon
     */
    getPlatformIcon() {
        const icons = {
            'youtube': '▶️',
            'spotify': '🎵',
            'soundcloud': '☁️',
            'vimeo': '🎬',
            'deezer': '🎵',
            'apple_music': '🎵',
            'pandora': '🎵',
            'amazon_music': '🎵',
            'twitch': '🎮',
            'tiktok': '🎵',
            'instagram': '📸',
            'snapchat': '👻',
            'video': '🎬',
            'audio': '🎵',
            'unknown': '📎'
        };
        return icons[this.mediaType] || icons['unknown'];
    }
    
    /**
     * Record user feedback (like/dislike) for this content
     * @param {string} sentiment - 'liked' or 'disliked'
     */
    recordFeedback(sentiment) {
        if (!window.mediaFeedback) {
            console.warn('⚠️ MediaFeedbackManager not available');
            return;
        }
        
        const url = this.mediaData.url || this.mediaData.path;
        if (!url) {
            console.warn('⚠️ No URL available for feedback');
            return;
        }
        
        // Determine platform from URL
        let platform = 'unknown';
        if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
        else if (url.includes('spotify.com')) platform = 'spotify';
        else if (url.includes('vimeo.com')) platform = 'vimeo';
        else if (url.includes('soundcloud.com')) platform = 'soundcloud';
        else if (url.includes('deezer.com')) platform = 'deezer';
        else if (url.includes('tiktok.com')) platform = 'tiktok';
        else if (url.includes('instagram.com')) platform = 'instagram';
        else if (url.includes('dailymotion.com')) platform = 'dailymotion';
        
        // Extract genre from URL if it has a genre prefix
        let genre = null;
        if (window.genreParser) {
            const parsed = window.genreParser.parseUrl(url);
            genre = parsed.genre;
        }
        
        // Record feedback
        window.mediaFeedback.recordFeedback(url, sentiment, {
            platform: platform,
            title: this.mediaData.name || this.mediaData.fileName || 'Untitled',
            genre: genre
        });
        
        // Show visual feedback
        const emoji = sentiment === 'liked' ? '👍' : '👎';
        console.log(`${emoji} Feedback recorded: ${sentiment} for ${platform}`);
        
        // Update button label temporarily
        const button = this.buttons.find(b => b.id === sentiment.replace('d', ''));
        if (button) {
            const originalLabel = button.label;
            button.label = `${emoji} Saved!`;
            this.render();
            
            // Restore original label after 1 second
            setTimeout(() => {
                button.label = originalLabel;
                this.render();
            }, 1000);
        }
    }
    
    /**
     * Render interactive buttons
     */
    renderButtons() {
        const ctx = this.ctx;
        
        this.buttons.forEach(button => {
            const isHovered = this.hoveredButton === button.id;
            
            // Button background
            ctx.fillStyle = isHovered ? '#e74c3c' : '#2c3e50';
            ctx.fillRect(button.x, button.y, button.width, button.height);
            
            // Button border
            ctx.strokeStyle = isHovered ? '#c0392b' : '#34495e';
            ctx.lineWidth = 3;
            ctx.strokeRect(button.x, button.y, button.width, button.height);
            
            // Button text
            ctx.fillStyle = '#ffffff';
            ctx.font = isHovered ? 'bold 38px Arial' : 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                button.label,
                button.x + button.width / 2,
                button.y + button.height / 2 + 12
            );
        });
    }
    
    /**
     * Truncate text to max length
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    /**
     * Setup input handling
     */
    setupInputHandling() {
        // Button interactions will be handled by the main interaction system
    }
    
    /**
     * Handle button click at canvas coordinates
     */
    handleClick(canvasX, canvasY) {
        for (const button of this.buttons) {
            if (canvasX >= button.x && canvasX <= button.x + button.width &&
                canvasY >= button.y && canvasY <= button.y + button.height) {
                console.log(`🎵 Button clicked: ${button.id}`);
                button.action();
                return true;
            }
        }
        return false;
    }
    
    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        console.log(`🎵 ${this.isPlaying ? 'Playing' : 'Paused'} media`);
        
        // TODO: Implement actual media player controls
        // For now, just update UI
        this.render();
    }
    
    /**
     * Toggle mute
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        console.log(`🎵 ${this.isMuted ? 'Muted' : 'Unmuted'} media`);
        
        // TODO: Implement actual media player controls
        this.render();
    }
    
    /**
     * Open media in native app
     */
    openInNativeApp() {
        console.log(`🚀 Opening media in native app: ${this.mediaData.url || this.mediaData.path}`);
        
        // CRITICAL FIX: Don't try to open demo files in external app
        if (this.mediaData.isDemoFile || this.mediaData.userData?.isDemoFile) {
            console.log('⚠️ Cannot open demo file in external app - demo files are for preview only');
            return;
        }
        
        const url = this.mediaData.url || this.mediaData.path;
        if (url) {
            // Use existing URL launcher functionality
            if (window.app && window.app.openURL) {
                window.app.openURL(url);
            } else if (window.open) {
                window.open(url, '_blank');
            }
        }
    }
    
    /**
     * Create HTML overlay for actual media playback
     */
    createMediaOverlay() {
        // Create overlay container (transparent so 3D world shows through)
        this.mediaOverlay = document.createElement('div');
        
        // Apply responsive sizing based on orientation
        this.applyOverlaySizing();
        
        document.body.appendChild(this.mediaOverlay);
        
        // Listen for orientation changes to adjust sizing and recreate content
        let resizeTimeout;
        window.addEventListener('resize', () => {
            // Debounce resize events (orientation changes fire multiple times)
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.mediaOverlay && this.mediaOverlay.style.display === 'block' && !document.fullscreenElement) {
                    // Only reapply sizing - don't recreate media element
                    this.applyOverlaySizing();
                }
            }, 300); // Wait 300ms for orientation change to complete
        });
        
        // Media element will be created when show() is called
    }
    
    /**
     * Apply appropriate sizing based on screen orientation
     * OPTIMIZED: Account for AdMob banner row at bottom (50-60px) and top UI buttons
     */
    applyOverlaySizing() {
        if (!this.mediaOverlay) return;
        
        // Save current display state before reapplying CSS
        const currentDisplay = this.mediaOverlay.style.display;
        
        const isLandscape = window.innerWidth > window.innerHeight;
        
        // UI clearance: Top UI buttons + AdMob banner at bottom + margins
        // OPTIMIZED: Move preview higher in landscape, increase padding to prevent button overlap
        const topUIClearance = isLandscape ? 50 : 90; // Landscape: move up, Portrait: more space
        const bottomUIClearance = 70; // Space for Home button + AdMob banner + safety margin
        const totalVerticalClearance = topUIClearance + bottomUIClearance + 30;
        
        if (isLandscape) {
            // Landscape mode: Maximize vertical space at top of screen
            const availableHeight = `calc(100vh - ${totalVerticalClearance}px)`;
            
            this.mediaOverlay.style.cssText = `
                position: fixed;
                top: ${topUIClearance}px;
                left: 50%;
                transform: translateX(-50%);
                width: 75vw;
                max-width: 800px;
                height: ${availableHeight};
                max-height: ${availableHeight};
                background: #1a1a2e;
                border-radius: 12px;
                padding: 6px 20px 80px 20px;
                z-index: 2000;
                display: none;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
                overflow-y: auto;
                display: flex;
                flex-direction: column;
            `;
        } else {
            // Portrait mode: Position lower to avoid top UI overlap
            const availableHeight = `calc(100vh - ${totalVerticalClearance}px)`;
            
            this.mediaOverlay.style.cssText = `
                position: fixed;
                top: ${topUIClearance + 10}px;
                left: 50%;
                transform: translateX(-50%);
                width: 85vw;
                max-width: 500px;
                height: ${availableHeight};
                max-height: ${availableHeight};
                background: #1a1a2e;
                border-radius: 12px;
                padding: 18px 20px 80px 20px;
                z-index: 2000;
                display: none;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
                overflow-y: auto;
            `;
        }
        
        // Restore display state (prevent hiding during rotation)
        if (currentDisplay) {
            this.mediaOverlay.style.display = currentDisplay;
        }
    }
    
    /**
     * Create appropriate media element (video, audio, iframe)
     */
    async createMediaElement() {
        // For local files, use the actual file path from fileData
        let url = this.mediaData.url || this.mediaData.path;
        
        // DEMO CONTENT DETECTION: Check if this is a demo file (asset bundle path)
        // CRITICAL: Only check asset paths, NOT external URLs
        const isDemoFile = url && url.startsWith('assets/demomedia/');
        
        if (isDemoFile) {
            console.log('🎵 ✅ DEMO FILE DETECTED:', url);
            console.log('🎵 Looking up data URL from window.DEMO_ASSET_DATA_URLS...');
            
            // Look up the data URL from Flutter injection
            if (typeof window.DEMO_ASSET_DATA_URLS !== 'undefined' && window.DEMO_ASSET_DATA_URLS[url]) {
                const dataUrl = window.DEMO_ASSET_DATA_URLS[url];
                console.log('🎵 ✅ Found demo asset data URL for:', url);
                console.log('🎵 Data URL preview:', dataUrl.substring(0, 100) + '...');
                url = dataUrl; // Replace url with the data URL from Flutter
            } else {
                console.error('🎵 ❌ Demo asset data URL not found for:', url);
                console.error('🎵 Available assets:', Object.keys(window.DEMO_ASSET_DATA_URLS || {}));
                
                // Show informative error message
                this.showMediaError(
                    'Demo file not loaded.\n\n' +
                    'The demo asset "' + (this.mediaData.name || url) + '" could not be loaded. ' +
                    'Flutter asset injection may not have completed.'
                );
                return;
            }
        }
        
        // If it's a local file (has fileData.id), request data URL from Flutter
        const isLocalFile = !url && this.mediaData.id && this.mediaData.id.startsWith('/');
        if (isLocalFile) {
            const filePath = this.mediaData.id;
            const extension = this.mediaData.extension || '';
            
            console.log('🎵 Requesting media data URL from Flutter for:', filePath);
            
            // Request file data from Flutter bridge
            url = await this.requestMediaDataUrl(filePath, extension);
            
            // Check if file was opened externally (>50MB)
            if (url === 'OPEN_EXTERNAL') {
                console.log('🎵 File opened in external app - hiding preview screen');
                // Hide this preview since file is playing externally
                this.hide();
                return;
            }
            
            if (!url) {
                console.error('🎵 Failed to get media data URL from Flutter');
                // Show error message in overlay
                this.showMediaError('Failed to load media file');
                return;
            }
            
            console.log('🎵 Received data URL from Flutter (length:', url.length, ')');
        }
        
        // CRITICAL: Completely clear and reset the overlay to prevent button conflicts
        // This removes all old buttons and event listeners
        while (this.mediaOverlay.firstChild) {
            this.mediaOverlay.removeChild(this.mediaOverlay.firstChild);
        }
        
        // Header with close and fullscreen buttons
        const header = document.createElement('div');
        header.id = 'mediaControlsHeader';
        header.style.cssText = 'margin-bottom: 15px; color: white; font-family: Arial; transition: opacity 0.3s; pointer-events: auto;';
        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button id="closeMediaBtn" style="
                        background: #e74c3c;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">✕ Close</button>
                    <h3 style="margin: 0; font-size: 18px; flex-shrink: 0;">${this.mediaData.name || this.mediaData.fileName || 'Media'}</h3>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${this.mediaType === 'youtube' ? `<button id="viewOnYouTubeBtn" style="
                        background: #FF0000;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">▶ View on YouTube</button>` : ''}
                    ${this.mediaType === 'spotify' ? `<button id="viewOnSpotifyBtn" style="
                        background: #1DB954;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">▶ Play on Spotify</button>` : ''}
                    ${this.mediaType === 'soundcloud' ? `<button id="viewOnSoundCloudBtn" style="
                        background: #FF5500;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">☁️ Play on SoundCloud</button>` : ''}
                    ${this.mediaType === 'vimeo' ? `<button id="viewOnVimeoBtn" style="
                        background: #1AB7EA;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">▶ Watch on Vimeo</button>` : ''}
                    ${this.mediaType === 'dailymotion' ? `<button id="viewOnDailymotionBtn" style="
                        background: #0066DC;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">▶ Watch on Dailymotion</button>` : ''}
                    ${this.mediaType === 'deezer' ? `<button id="viewOnDeezerBtn" style="
                        background: #FF0000;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">▶ Listen on Deezer</button>` : ''}
                    ${this.mediaType === 'apple_music' ? `<button id="viewOnAppleMusicBtn" style="
                        background: #FA243C;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">🎵 Play on Apple Music</button>` : ''}
                    ${this.mediaType === 'pandora' ? `<button id="viewOnPandoraBtn" style="
                        background: #3668FF;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">▶ Play on Pandora</button>` : ''}
                    ${this.mediaType === 'amazon_music' ? `<button id="viewOnAmazonMusicBtn" style="
                        background: #FF9900;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">▶ Play on Amazon Music</button>` : ''}
                    ${(this.mediaType === 'audio' || this.mediaType === 'video') ? `<button id="minimizeToPiPBtn" style="
                        background: #9b59b6;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">⊟ Minimize</button>` : ''}
                    <button id="fullscreenMediaBtn" style="
                        background: #3498db;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 11px;
                        pointer-events: auto;
                        touch-action: manipulation;
                    ">⛶ Fullscreen</button>
                </div>
            </div>
        `;
        this.mediaOverlay.appendChild(header);
        
        // Add Spotify background playback indicator (only for Spotify tracks)
        if (this.mediaType === 'spotify') {
            const spotifyIndicator = document.createElement('div');
            spotifyIndicator.id = 'spotifyBackgroundIndicator';
            spotifyIndicator.style.cssText = `
                background: linear-gradient(135deg, #1DB954 0%, #1ed760 100%);
                color: white;
                padding: 10px 15px;
                margin-bottom: 12px;
                border-radius: 6px;
                font-size: 13px;
                font-family: Arial, sans-serif;
                display: flex;
                align-items: center;
                gap: 8px;
                pointer-events: auto;
            `;
            spotifyIndicator.innerHTML = `
                <span style="font-size: 16px;">🎵</span>
                <span style="flex: 1;">Spotify playing in background.</span>
                <span id="openSpotifyLink" style="
                    text-decoration: underline;
                    cursor: pointer;
                    font-weight: bold;
                    white-space: nowrap;
                    pointer-events: auto;
                    touch-action: manipulation;
                ">Open Spotify to stop playback</span>
            `;
            this.mediaOverlay.appendChild(spotifyIndicator);
        }
        
        // Media container
        const mediaContainer = document.createElement('div');
        mediaContainer.style.cssText = 'background: #000; border-radius: 8px; overflow: hidden;';
        
        if (this.mediaType === 'youtube') {
            // Extract YouTube video ID
            const videoId = this.extractYouTubeId(url || this.mediaData.url || '');
            if (videoId) {
                // Store the video URL for the "View on YouTube" button
                this.currentYouTubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
                
                // Create thumbnail container with play button overlay
                // Optimized sizing to fit entire image without scrolling
                const isLandscape = window.innerWidth > window.innerHeight;
                const thumbnailHeight = isLandscape ? '250px' : '320px';
                const thumbnailContainer = document.createElement('div');
                thumbnailContainer.style.cssText = `position: relative; width: 100%; height: ${thumbnailHeight}; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #000; pointer-events: auto;`;
                
                // Use hqdefault.jpg (480x360) - most reliable quality that matches link object thumbnails
                // This is the same thumbnail shown on the link object's face texture
                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                
                // Create thumbnail image
                const thumbnail = document.createElement('img');
                thumbnail.src = thumbnailUrl;
                thumbnail.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
                thumbnail.alt = 'YouTube Video Thumbnail';
                
                // Add error handler to fall back to medium quality if hq fails
                thumbnail.onerror = () => {
                    thumbnail.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                };
                
                // Create play button overlay
                const playButton = document.createElement('div');
                playButton.style.cssText = `
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    background: rgba(255, 0, 0, 0.9);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.2s;
                `;
                
                playButton.innerHTML = `
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                `;
                
                // Hover effect for play button
                playButton.onmouseenter = () => {
                    playButton.style.transform = 'scale(1.1)';
                };
                playButton.onmouseleave = () => {
                    playButton.style.transform = 'scale(1)';
                };
                
                // Click handler - opens in YouTube app/browser
                thumbnailContainer.onclick = (e) => {
                    e.stopPropagation();
                    this.openExternalURL(this.currentYouTubeUrl);
                };
                
                thumbnailContainer.appendChild(thumbnail);
                thumbnailContainer.appendChild(playButton);
                
                this.mediaElement = thumbnailContainer;
                
                // Add helpful message
                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; color: #fff; font-size: 12px; text-align: center;';
                infoDiv.innerHTML = '▶️ Tap thumbnail or use "View on YouTube" button to watch';
                
                mediaContainer.appendChild(thumbnailContainer);
                mediaContainer.appendChild(infoDiv);
                console.log('🎵 YouTube thumbnail preview created successfully');
                console.log('🎵   Video ID:', videoId);
                console.log('🎵   Thumbnail URL:', thumbnailUrl);
            } else {
                console.error('🎵 Failed to extract YouTube video ID from:', url || this.mediaData.url);
                this.showMediaError('Invalid YouTube URL - could not extract video ID');
            }
        } else if (this.mediaType === 'tiktok') {
            // TikTok preview with thumbnail and title from oEmbed metadata
            console.log('🎵 Creating TikTok preview for:', url);
            console.log('🎵 [DEBUG] Full mediaData:', this.mediaData);
            console.log('🎵 [DEBUG] mediaData.name:', this.mediaData.name);
            console.log('🎵 [DEBUG] mediaData.tiktokMetadata:', this.mediaData.tiktokMetadata);
            console.log('🎵 [DEBUG] mediaData.userData:', this.mediaData.userData);
            console.log('🎵 [DEBUG] mediaData.userData?.tiktokMetadata:', this.mediaData.userData?.tiktokMetadata);
            this.currentTikTokUrl = url;
            
            // Try to get TikTok metadata from object userData
            const tiktokMetadata = this.mediaData.tiktokMetadata || this.mediaData.userData?.tiktokMetadata;
            const thumbnailUrl = tiktokMetadata?.thumbnail_url;
            
            // CRITICAL FIX: Use mediaData.name (which includes renamed title from linkData.title)
            // Only fall back to tiktokMetadata.title if mediaData.name is generic
            const title = (this.mediaData.name && !this.mediaData.name.includes('TikTok Video')) 
                ? this.mediaData.name 
                : (tiktokMetadata?.title || 'TikTok Video');
            const authorName = tiktokMetadata?.author_name;
            
            console.log('🎵 [DEBUG] Extracted tiktokMetadata:', tiktokMetadata);
            console.log('🎵 [DEBUG] Extracted thumbnailUrl:', thumbnailUrl);
            console.log('🎵 [DEBUG] Final display title:', title);
            console.log('🎵 [DEBUG] Extracted authorName:', authorName);
            
            // Create branded container with thumbnail background
            const isLandscape = window.innerWidth > window.innerHeight;
            const containerHeight = isLandscape ? '250px' : '280px';
            const brandedContainer = document.createElement('div');
            brandedContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-end;
                padding: 20px;
                background: ${thumbnailUrl ? 
                    `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%), url('${thumbnailUrl}') center/cover` : 
                    'linear-gradient(135deg, #000000 0%, #ee1d52 100%)'};
                border-radius: 10px;
                min-height: ${containerHeight};
                position: relative;
            `;
            
            // Build content HTML with title and author
            let contentHtml = '';
            if (title) {
                contentHtml += `
                    <div style="
                        color: white;
                        font-size: 20px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        text-align: center;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                        max-width: 90%;
                    ">${title}</div>
                `;
            }
            if (authorName) {
                contentHtml += `
                    <div style="
                        color: white;
                        font-size: 16px;
                        margin-bottom: 20px;
                        text-align: center;
                        text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
                    ">@${authorName}</div>
                `;
            }
            if (!title && !thumbnailUrl) {
                contentHtml += `
                    <div style="
                        font-size: 80px;
                        margin-bottom: 20px;
                    ">🎵</div>
                    <div style="
                        color: white;
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 30px;
                        text-align: center;
                    ">TikTok Video</div>
                `;
            }
            contentHtml += `
                <button id="tiktokOpenBtn" style="
                    background: #ee1d52;
                    color: white;
                    border: none;
                    padding: 15px 40px;
                    border-radius: 25px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s;
                    pointer-events: auto;
                    touch-action: manipulation;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                ">▶ Open in TikTok</button>
            `;
            
            brandedContainer.innerHTML = contentHtml;
            
            this.mediaElement = brandedContainer;
            mediaContainer.appendChild(brandedContainer);
            
            // Store URL for button click
            this.currentPlatformUrl = url;
            
        } else if (this.mediaType === 'instagram') {
            // Instagram Reels preview - show logo and generic text (no oEmbed due to CORS)
            console.log('📸 Creating Instagram preview for:', url);
            this.currentInstagramUrl = url;
            
            // Create branded container with Instagram gradient
            const isLandscape = window.innerWidth > window.innerHeight;
            const containerHeight = isLandscape ? '250px' : '280px';
            const brandedContainer = document.createElement('div');
            brandedContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
                border-radius: 10px;
                min-height: ${containerHeight};
            `;
            
            brandedContainer.innerHTML = `
                <div style="
                    font-size: 80px;
                    margin-bottom: 20px;
                ">📸</div>
                <div style="
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 30px;
                    text-align: center;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                ">Instagram Post</div>
                <button id="instagramOpenBtn" style="
                    background: #e4405f;
                    color: white;
                    border: none;
                    padding: 15px 40px;
                    border-radius: 25px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s;
                    pointer-events: auto;
                    touch-action: manipulation;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                ">▶ Open in Instagram</button>
            `;
            
            this.mediaElement = brandedContainer;
            mediaContainer.appendChild(brandedContainer);
            
            // Store URL for button click
            this.currentPlatformUrl = url;
            
        } else if (this.mediaType === 'snapchat') {
            // Snapchat Spotlight preview with branded thumbnail and external launch
            console.log('🎵 Creating Snapchat preview for:', url);
            this.currentSnapchatUrl = url;
            
            // Create branded container
            const isLandscape = window.innerWidth > window.innerHeight;
            const containerHeight = isLandscape ? '250px' : '280px';
            const brandedContainer = document.createElement('div');
            brandedContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: linear-gradient(135deg, #FFFC00 0%, #FFFC00 100%);
                border-radius: 10px;
                min-height: ${containerHeight};
            `;
            
            brandedContainer.innerHTML = `
                <div style="
                    font-size: 80px;
                    margin-bottom: 20px;
                ">👻</div>
                <div style="
                    color: black;
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 30px;
                    text-align: center;
                ">Snapchat Spotlight</div>
                <button id="snapchatOpenBtn" style="
                    background: #000000;
                    color: #FFFC00;
                    border: none;
                    padding: 15px 40px;
                    border-radius: 25px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s;
                    pointer-events: auto;
                    touch-action: manipulation;
                ">▶ Open in Snapchat</button>
            `;
            
            this.mediaElement = brandedContainer;
            mediaContainer.appendChild(brandedContainer);
            
            // Store URL for button click
            this.currentPlatformUrl = url;
            
        } else if (this.mediaType === 'video') {
            const video = document.createElement('video');
            video.style.cssText = 'width: 100%; max-height: 500px;';
            video.controls = true;
            video.autoplay = true;
            video.src = url;
            
            // Add ended event listener for auto-advance
            this.videoEndedHandler = () => {
                console.log('🪑 Video ended - triggering auto-advance');
                this.hide(true); // Pass true to trigger auto-advance
            };
            video.addEventListener('ended', this.videoEndedHandler);
            
            this.mediaElement = video;
            mediaContainer.appendChild(video);
        } else if (this.mediaType === 'audio') {
            const audio = document.createElement('audio');
            audio.style.cssText = 'width: 100%;';
            audio.controls = true;
            audio.autoplay = true;
            audio.src = url;
            
            // Add ended event listener for auto-advance
            this.audioEndedHandler = () => {
                console.log('🪑 Audio ended - triggering auto-advance');
                this.hide(true); // Pass true to trigger auto-advance
            };
            audio.addEventListener('ended', this.audioEndedHandler);
            
            this.mediaElement = audio;
            mediaContainer.appendChild(audio);
        } else if (this.mediaType === 'spotify') {
            const trackId = this.extractSpotifyId(url);
            if (trackId) {
                // Store the Spotify URL for the button
                this.currentSpotifyUrl = `https://open.spotify.com/track/${trackId}`;
                
                // Try to get Spotify metadata from object userData or linkData (fetched via Flutter bridge)
                const spotifyMetadata = this.mediaData.spotifyMetadata || 
                                       this.mediaData.userData?.spotifyMetadata ||
                                       this.mediaData.linkData?.spotifyMetadata;
                
                const thumbnailUrl = spotifyMetadata?.thumbnail_url || spotifyMetadata?.thumbnailUrl;
                const title = spotifyMetadata?.title || this.mediaData.name || 'Spotify Track';
                const artistName = spotifyMetadata?.artist_name || spotifyMetadata?.artist;
                
                console.log('🎵 Spotify metadata available:', {thumbnailUrl, title, artistName});
                
                if (thumbnailUrl) {
                    // We have thumbnail from Flutter bridge - create thumbnail preview
                    console.log('🎵 Using Spotify thumbnail from metadata:', thumbnailUrl);
                    
                    // Create thumbnail container with play button overlay
                    // Optimized height matching YouTube layout for consistency
                    const isLandscape = window.innerWidth > window.innerHeight;
                    const thumbnailHeight = isLandscape ? '300px' : '350px';
                    const thumbnailContainer = document.createElement('div');
                    thumbnailContainer.style.cssText = `position: relative; width: 100%; height: ${thumbnailHeight}; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #000; pointer-events: auto;`;
                    
                    // Create thumbnail image
                    const thumbnail = document.createElement('img');
                    thumbnail.src = thumbnailUrl;
                    thumbnail.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
                    thumbnail.alt = 'Spotify Track Artwork';
                    
                    // Create play button overlay (Spotify green)
                    const playButton = document.createElement('div');
                    playButton.style.cssText = `
                        position: absolute;
                        width: 80px;
                        height: 80px;
                        background: rgba(29, 185, 84, 0.9);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: transform 0.2s;
                    `;
                    
                    playButton.innerHTML = `
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    `;
                    
                    // Hover effect
                    playButton.onmouseenter = () => {
                        playButton.style.transform = 'scale(1.1)';
                    };
                    playButton.onmouseleave = () => {
                        playButton.style.transform = 'scale(1)';
                    };
                    
                    // Click handler - opens in Spotify
                    thumbnailContainer.onclick = (e) => {
                        e.stopPropagation();
                        this.openExternalURL(this.currentSpotifyUrl);
                    };
                    
                    thumbnailContainer.appendChild(thumbnail);
                    thumbnailContainer.appendChild(playButton);
                    
                    this.mediaElement = thumbnailContainer;
                    
                    // Add compact track info - condensed to save vertical space
                    const infoDiv = document.createElement('div');
                    infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; color: #fff; font-size: 12px; text-align: center;';
                    infoDiv.innerHTML = '▶️ Tap thumbnail or use "Play on Spotify" button to listen';
                    
                    mediaContainer.appendChild(thumbnailContainer);
                    mediaContainer.appendChild(infoDiv);
                    console.log('🎵 Spotify thumbnail preview created successfully with metadata:', {title, artistName});
                } else {
                    // No thumbnail available - create branded container (avoid CORS fetch)
                    console.log('🎵 No Spotify thumbnail available - creating branded container');
                    
                    const spotifyContainer = document.createElement('div');
                    spotifyContainer.style.cssText = 'width: 100%; height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #1db954 0%, #1ed760 100%); border-radius: 8px;';
                    
                    // Spotify icon
                    const icon = document.createElement('div');
                    icon.style.cssText = 'font-size: 80px; margin-bottom: 20px;';
                    icon.textContent = '🎵';
                    
                    // Platform name
                    const platformName = document.createElement('div');
                    platformName.style.cssText = 'font-size: 32px; font-weight: bold; color: white; margin-bottom: 10px; font-family: Arial;';
                    platformName.textContent = 'Spotify';
                    
                    // Track title
                    const trackTitle = document.createElement('div');
                    trackTitle.style.cssText = 'font-size: 18px; color: rgba(255,255,255,0.9); margin-bottom: 30px; text-align: center; padding: 0 20px; font-family: Arial;';
                    trackTitle.textContent = title;
                    
                    // Open button
                    const openButton = document.createElement('button');
                    openButton.style.cssText = 'background: white; color: #1db954; border: none; border-radius: 25px; padding: 15px 40px; font-size: 16px; font-weight: bold; cursor: pointer; transition: transform 0.2s; font-family: Arial;';
                    openButton.textContent = '▶ Play on Spotify';
                    openButton.onmouseenter = () => {
                        openButton.style.transform = 'scale(1.05)';
                    };
                    openButton.onmouseleave = () => {
                        openButton.style.transform = 'scale(1)';
                    };
                    openButton.onclick = (e) => {
                        e.stopPropagation();
                        this.openExternalURL(this.currentSpotifyUrl);
                    };
                    
                    spotifyContainer.appendChild(icon);
                    spotifyContainer.appendChild(platformName);
                    spotifyContainer.appendChild(trackTitle);
                    spotifyContainer.appendChild(openButton);
                    
                    this.mediaElement = spotifyContainer;
                    
                    // Add helpful message
                    const infoDiv = document.createElement('div');
                    infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; color: #fff; font-size: 12px; text-align: center;';
                    infoDiv.innerHTML = '🎵 Tap button above or use "Play on Spotify" to listen';
                    
                    mediaContainer.appendChild(spotifyContainer);
                    mediaContainer.appendChild(infoDiv);
                    console.log('🎵 Spotify branded container created successfully (no API call)');
                }
            }
        } else if (this.mediaType === 'soundcloud') {
            // Extract SoundCloud URL
            const soundcloudUrl = encodeURIComponent(url);
            
            // Store the SoundCloud URL for the button
            this.currentSoundCloudUrl = url;
            
            // Fetch thumbnail from SoundCloud oEmbed API
            try {
                const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${soundcloudUrl}`;
                const response = await fetch(oembedUrl);
                const data = await response.json();
                
                // Update header with actual track title from SoundCloud
                const headerTitle = this.mediaOverlay.querySelector('h3');
                if (headerTitle && data.title) {
                    headerTitle.textContent = data.author_name ? 
                        `${data.author_name} - ${data.title}` : 
                        data.title;
                }
                
                // Create thumbnail container with play button overlay
                // Optimized height for better vertical space usage
                const isLandscape = window.innerWidth > window.innerHeight;
                const thumbnailHeight = isLandscape ? '300px' : '350px';
                const thumbnailContainer = document.createElement('div');
                thumbnailContainer.style.cssText = `position: relative; width: 100%; height: ${thumbnailHeight}; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #000; pointer-events: auto;`;
                
                // Create thumbnail image
                const thumbnail = document.createElement('img');
                thumbnail.src = data.thumbnail_url || 'https://via.placeholder.com/400x400?text=SoundCloud';
                thumbnail.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
                thumbnail.alt = 'SoundCloud Track Artwork';
                
                // Create play button overlay (SoundCloud orange)
                const playButton = document.createElement('div');
                playButton.style.cssText = `
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    background: rgba(255, 85, 0, 0.9);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.2s;
                `;
                
                playButton.innerHTML = `
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                `;
                
                // Hover effect
                playButton.onmouseenter = () => {
                    playButton.style.transform = 'scale(1.1)';
                };
                playButton.onmouseleave = () => {
                    playButton.style.transform = 'scale(1)';
                };
                
                // Click handler - opens in SoundCloud
                thumbnailContainer.onclick = (e) => {
                    e.stopPropagation();
                    this.openExternalURL(this.currentSoundCloudUrl);
                };
                
                thumbnailContainer.appendChild(thumbnail);
                thumbnailContainer.appendChild(playButton);
                
                this.mediaElement = thumbnailContainer;
                
                // Add helpful message
                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; color: #fff; font-size: 12px; text-align: center;';
                infoDiv.innerHTML = '▶️ Tap thumbnail or use "Play on SoundCloud" button to listen';
                
                mediaContainer.appendChild(thumbnailContainer);
                mediaContainer.appendChild(infoDiv);
                console.log('🎵 SoundCloud thumbnail preview created successfully');
            } catch (error) {
                console.error('🎵 Failed to fetch SoundCloud metadata:', error);
                this.showMediaError('Unable to load SoundCloud track preview');
            }
        } else if (this.mediaType === 'vimeo') {
            // Extract Vimeo video ID
            const videoId = this.extractVimeoId(url);
            if (videoId) {
                // Store the Vimeo URL for the button
                this.currentVimeoUrl = url;
                
                // Fetch thumbnail from Vimeo oEmbed API via Flutter bridge (bypasses CORS)
                try {
                    // Use Flutter bridge to get metadata (bypasses CORS)
                    const metadata = await new Promise((resolve) => {
                        console.log('🎬 [FLUTTER BRIDGE] Requesting Vimeo metadata for preview...');
                        
                        if (!window.VimeoMetadataChannel) {
                            console.warn('⚠️ VimeoMetadataChannel not available');
                            resolve(null);
                            return;
                        }
                        
                        window.vimeoMetadataCallback = (data) => {
                            console.log('🎬 [FLUTTER BRIDGE] Received metadata:', data);
                            delete window.vimeoMetadataCallback;
                            resolve(data);
                        };
                        
                        const requestData = {
                            action: 'getVimeoMetadata',
                            url: url
                        };
                        
                        try {
                            window.VimeoMetadataChannel.postMessage(JSON.stringify(requestData));
                        } catch (error) {
                            console.error('❌ Error requesting metadata:', error);
                            delete window.vimeoMetadataCallback;
                            resolve(null);
                        }
                        
                        setTimeout(() => {
                            if (window.vimeoMetadataCallback) {
                                console.warn('⏱️ Metadata request timed out');
                                delete window.vimeoMetadataCallback;
                                resolve(null);
                            }
                        }, 5000);
                    });
                    
                    // Use metadata or fallback
                    const data = metadata || {};
                    
                    // Update header with actual video title from metadata
                    const headerTitle = this.mediaOverlay.querySelector('h3');
                    if (headerTitle && (data.title || metadata?.title)) {
                        const title = data.title || metadata?.title;
                        const author = data.author_name || data.author || metadata?.author;
                        headerTitle.textContent = author ? 
                            `${author} - ${title}` : 
                            title;
                    }
                    
                    // Create thumbnail container with play button overlay
                    // Optimized height for better vertical space usage
                    const isLandscape = window.innerWidth > window.innerHeight;
                    const thumbnailHeight = isLandscape ? '300px' : '350px';
                    const thumbnailContainer = document.createElement('div');
                    thumbnailContainer.style.cssText = `position: relative; width: 100%; height: ${thumbnailHeight}; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #000; pointer-events: auto;`;
                    
                    // Create thumbnail image
                    const thumbnail = document.createElement('img');
                    const thumbnailUrl = data.thumbnail_url || data.thumbnailUrl || metadata?.thumbnailUrl || metadata?.thumbnail_url || 'https://via.placeholder.com/640x360?text=Vimeo';
                    thumbnail.src = thumbnailUrl;
                    thumbnail.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
                    thumbnail.alt = 'Vimeo Video Thumbnail';
                    
                    // Create play button overlay (Vimeo blue)
                    const playButton = document.createElement('div');
                    playButton.style.cssText = `
                        position: absolute;
                        width: 80px;
                        height: 80px;
                        background: rgba(26, 183, 234, 0.9);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: transform 0.2s;
                    `;
                    
                    playButton.innerHTML = `
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    `;
                    
                    // Hover effect
                    playButton.onmouseenter = () => {
                        playButton.style.transform = 'scale(1.1)';
                    };
                    playButton.onmouseleave = () => {
                        playButton.style.transform = 'scale(1)';
                    };
                    
                    // Click handler - opens in Vimeo
                    thumbnailContainer.onclick = (e) => {
                        e.stopPropagation();
                        this.openExternalURL(this.currentVimeoUrl);
                    };
                    
                    thumbnailContainer.appendChild(thumbnail);
                    thumbnailContainer.appendChild(playButton);
                    
                    this.mediaElement = thumbnailContainer;
                    
                    // Add helpful message
                    const infoDiv = document.createElement('div');
                    infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; color: #fff; font-size: 12px; text-align: center;';
                    infoDiv.innerHTML = '▶️ Tap thumbnail or use "Watch on Vimeo" button to watch';
                    
                    mediaContainer.appendChild(thumbnailContainer);
                    mediaContainer.appendChild(infoDiv);
                    console.log('🎵 Vimeo thumbnail preview created successfully');
                } catch (error) {
                    console.error('🎵 Failed to fetch Vimeo metadata:', error);
                    this.showMediaError('Unable to load Vimeo video preview');
                }
            }
        } else if (this.mediaType === 'dailymotion') {
            // Dailymotion - fetch thumbnail via Flutter bridge (bypasses CORS) and display with play button
            const videoId = this.extractDailymotionId(url);
            if (videoId) {
                // Store the Dailymotion URL for the button
                this.currentDailymotionUrl = url;
                
                // Fetch thumbnail from Dailymotion oEmbed API via Flutter bridge
                try {
                    // Use Flutter bridge to get metadata (bypasses CORS)
                    const metadata = await new Promise((resolve) => {
                        console.log('🎬 [FLUTTER BRIDGE] Requesting Dailymotion metadata for preview...');
                        
                        if (!window.DailymotionMetadataChannel) {
                            console.warn('⚠️ DailymotionMetadataChannel not available');
                            resolve(null);
                            return;
                        }
                        
                        // Generate unique callback name to avoid collisions
                        const callbackId = 'previewCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        const callbackName = 'dailymotionMetadataCallback_' + callbackId;
                        
                        // Set up uniquely-named callback for Flutter response
                        window[callbackName] = (data) => {
                            console.log(`🎬 [FLUTTER BRIDGE] Received metadata for preview:`, data);
                            delete window[callbackName];
                            resolve(data);
                        };
                        
                        // Request metadata from Flutter (include callback name)
                        const requestData = {
                            action: 'getDailymotionMetadata',
                            url: url,
                            callbackName: callbackName // Tell Flutter which callback to use
                        };
                        
                        try {
                            window.DailymotionMetadataChannel.postMessage(JSON.stringify(requestData));
                            console.log(`🎬 [FLUTTER BRIDGE] Metadata request sent (callback: ${callbackName})`);
                        } catch (error) {
                            console.error('❌ Error requesting metadata:', error);
                            delete window[callbackName];
                            resolve(null);
                        }
                        
                        // Timeout after 8 seconds (increased from 5s to allow more time)
                        setTimeout(() => {
                            if (window[callbackName]) {
                                console.warn(`⏱️ Metadata request timed out (preview, callback: ${callbackName})`);
                                delete window[callbackName];
                                resolve(null);
                            }
                        }, 8000);
                    });
                    
                    // Update header with actual video title from metadata
                    const headerTitle = this.mediaOverlay.querySelector('h3');
                    if (headerTitle && metadata && metadata.title) {
                        headerTitle.textContent = metadata.author_name ? 
                            `${metadata.author_name} - ${metadata.title}` : 
                            metadata.title;
                    }
                    
                    // Create thumbnail container with play button overlay
                    const isLandscape = window.innerWidth > window.innerHeight;
                    const thumbnailHeight = isLandscape ? '300px' : '350px';
                    const thumbnailContainer = document.createElement('div');
                    thumbnailContainer.style.cssText = `position: relative; width: 100%; height: ${thumbnailHeight}; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #000; pointer-events: auto;`;
                    
                    // Create thumbnail image
                    const thumbnail = document.createElement('img');
                    const thumbnailUrl = metadata?.thumbnail_url || metadata?.thumbnailUrl || `https://www.dailymotion.com/thumbnail/video/${videoId}`;
                    thumbnail.src = thumbnailUrl;
                    thumbnail.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
                    thumbnail.alt = 'Dailymotion Video Thumbnail';
                    
                    // Create play button overlay (Dailymotion blue)
                    const playButton = document.createElement('div');
                    playButton.style.cssText = `
                        position: absolute;
                        width: 80px;
                        height: 80px;
                        background: rgba(0, 102, 220, 0.9);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: transform 0.2s;
                    `;
                    
                    playButton.innerHTML = `
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    `;
                    
                    // Hover effect
                    playButton.onmouseenter = () => {
                        playButton.style.transform = 'scale(1.1)';
                    };
                    playButton.onmouseleave = () => {
                        playButton.style.transform = 'scale(1)';
                    };
                    
                    // Click handler - opens in Dailymotion
                    thumbnailContainer.onclick = (e) => {
                        e.stopPropagation();
                        this.openExternalURL(this.currentDailymotionUrl);
                    };
                    
                    thumbnailContainer.appendChild(thumbnail);
                    thumbnailContainer.appendChild(playButton);
                    
                    this.mediaElement = thumbnailContainer;
                    
                    // Add helpful message
                    const infoDiv = document.createElement('div');
                    infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; color: #fff; font-size: 12px; text-align: center;';
                    infoDiv.innerHTML = '▶️ Tap thumbnail or use "Watch on Dailymotion" button to watch';
                    
                    mediaContainer.appendChild(thumbnailContainer);
                    mediaContainer.appendChild(infoDiv);
                    console.log('🎵 Dailymotion thumbnail preview created successfully');
                } catch (error) {
                    console.error('🎵 Failed to fetch Dailymotion metadata:', error);
                    this.showMediaError('Unable to load Dailymotion video preview');
                }
            }
        } else if (this.mediaType === 'deezer') {
            // Deezer - use thumbnail from linkData (fetched via Flutter bridge)
            this.currentDeezerUrl = url;
            
            // Check if thumbnail was provided in linkData or metadata
            const linkData = this.mediaData.linkData;
            const thumbnailUrl = linkData?.thumbnailUrl || 
                                this.mediaData.deezerMetadata?.thumbnailUrl ||
                                this.mediaData.userData?.deezerMetadata?.thumbnailUrl;
            
            console.log('🎵 Deezer preview - checking for thumbnail:', {
                haslinkData: !!linkData,
                thumbnailUrl: thumbnailUrl,
                linkDataKeys: linkData ? Object.keys(linkData) : []
            });
            
            if (thumbnailUrl) {
                // Update header with track info if available
                const headerTitle = this.mediaOverlay.querySelector('h3');
                if (headerTitle && linkData?.title) {
                    headerTitle.textContent = linkData.description ? 
                        `${linkData.title} - ${linkData.description}` : 
                        linkData.title;
                }
                
                // Create thumbnail container with play button overlay
                // Reduce height in landscape for better vertical space usage
                const isLandscape = window.innerWidth > window.innerHeight;
                const thumbnailHeight = isLandscape ? '350px' : '450px';
                const thumbnailContainer = document.createElement('div');
                thumbnailContainer.style.cssText = `position: relative; width: 100%; height: ${thumbnailHeight}; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #000; pointer-events: auto;`;
                
                // Create thumbnail image
                const thumbnail = document.createElement('img');
                thumbnail.src = thumbnailUrl;
                thumbnail.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
                thumbnail.alt = 'Deezer Track Artwork';
                
                // Add error handler for failed thumbnail loads
                thumbnail.onerror = () => {
                    console.warn('🎵 Deezer thumbnail failed to load:', thumbnailUrl);
                    thumbnail.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect fill="%23FF0000" width="300" height="300"/><text x="150" y="150" font-size="60" text-anchor="middle" fill="white">DZ</text></svg>';
                };
                
                // Create play button overlay (Deezer orange/red)
                const playButton = document.createElement('div');
                playButton.style.cssText = `
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    background: rgba(255, 0, 0, 0.9);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.2s;
                `;
                
                playButton.innerHTML = `
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                `;
                
                // Hover effect
                playButton.onmouseenter = () => {
                    playButton.style.transform = 'scale(1.1)';
                };
                playButton.onmouseleave = () => {
                    playButton.style.transform = 'scale(1)';
                };
                
                // Click handler - opens in Deezer
                thumbnailContainer.onclick = (e) => {
                    e.stopPropagation();
                    this.openExternalURL(this.currentDeezerUrl);
                };
                
                thumbnailContainer.appendChild(thumbnail);
                thumbnailContainer.appendChild(playButton);
                
                this.mediaElement = thumbnailContainer;
                
                // Add helpful message
                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; color: #fff; font-size: 12px; text-align: center;';
                infoDiv.innerHTML = '▶️ Tap thumbnail or use "Listen on Deezer" button to listen';
                
                mediaContainer.appendChild(thumbnailContainer);
                mediaContainer.appendChild(infoDiv);
                console.log('🎵 Deezer thumbnail preview created successfully');
            } else {
                // No thumbnail available - show branded container
                console.warn('🎵 No Deezer thumbnail available - creating branded container');
                
                const deezerContainer = document.createElement('div');
                deezerContainer.style.cssText = 'width: 100%; height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #FF0000 0%, #FF4500 100%); border-radius: 8px;';
                
                // Deezer icon
                const icon = document.createElement('div');
                icon.style.cssText = 'font-size: 80px; margin-bottom: 20px;';
                icon.textContent = '🎵';
                
                // Platform name
                const platformName = document.createElement('div');
                platformName.style.cssText = 'font-size: 32px; font-weight: bold; color: white; margin-bottom: 10px; font-family: Arial;';
                platformName.textContent = 'Deezer';
                
                // Track title
                const trackTitle = document.createElement('div');
                trackTitle.style.cssText = 'font-size: 18px; color: rgba(255,255,255,0.9); margin-bottom: 30px; text-align: center; padding: 0 20px; font-family: Arial;';
                trackTitle.textContent = linkData?.title || this.mediaData.name || 'Music Track';
                
                // Open button
                const openButton = document.createElement('button');
                openButton.style.cssText = 'background: white; color: #FF0000; border: none; border-radius: 25px; padding: 15px 40px; font-size: 16px; font-weight: bold; cursor: pointer; transition: transform 0.2s; font-family: Arial;';
                openButton.textContent = '▶ Listen on Deezer';
                openButton.onmouseenter = () => {
                    openButton.style.transform = 'scale(1.05)';
                };
                openButton.onmouseleave = () => {
                    openButton.style.transform = 'scale(1)';
                };
                openButton.onclick = (e) => {
                    e.stopPropagation();
                    this.openExternalURL(this.currentDeezerUrl);
                };
                
                deezerContainer.appendChild(icon);
                deezerContainer.appendChild(platformName);
                deezerContainer.appendChild(trackTitle);
                deezerContainer.appendChild(openButton);
                
                this.mediaElement = deezerContainer;
                
                // Add helpful message
                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; color: #fff; font-size: 12px; text-align: center;';
                infoDiv.innerHTML = '🎵 Tap button above or use "Listen on Deezer" to listen';
                
                mediaContainer.appendChild(deezerContainer);
                mediaContainer.appendChild(infoDiv);
                console.log('🎵 Deezer branded container created (no thumbnail available)');
            }
        } else if (this.mediaType === 'apple_music') {
            // Apple Music - button only (no thumbnail without authentication)
            this.currentAppleMusicUrl = url;
            
            // Create branded container with Apple Music branding
            const isLandscape = window.innerWidth > window.innerHeight;
            const containerHeight = isLandscape ? '300px' : '350px';
            const appleMusicContainer = document.createElement('div');
            appleMusicContainer.style.cssText = `width: 100%; height: ${containerHeight}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #FA243C 0%, #FC3D4C 100%); border-radius: 8px;`;
            
            // Apple Music icon
            const icon = document.createElement('div');
            icon.style.cssText = 'font-size: 80px; margin-bottom: 20px;';
            icon.textContent = '🎵';
            
            // Platform name
            const platformName = document.createElement('div');
            platformName.style.cssText = 'font-size: 32px; font-weight: bold; color: white; margin-bottom: 10px; font-family: Arial;';
            platformName.textContent = 'Apple Music';
            
            // Track title
            const trackTitle = document.createElement('div');
            trackTitle.style.cssText = 'font-size: 18px; color: rgba(255,255,255,0.9); margin-bottom: 30px; text-align: center; padding: 0 20px; font-family: Arial;';
            trackTitle.textContent = this.mediaData.name || 'Music Track';
            
            // Open button
            const openButton = document.createElement('button');
            openButton.style.cssText = 'background: white; color: #FA243C; border: none; border-radius: 25px; padding: 15px 40px; font-size: 16px; font-weight: bold; cursor: pointer; transition: transform 0.2s; font-family: Arial;';
            openButton.textContent = '▶ Open in Apple Music';
            openButton.onmouseenter = () => {
                openButton.style.transform = 'scale(1.05)';
            };
            openButton.onmouseleave = () => {
                openButton.style.transform = 'scale(1)';
            };
            openButton.onclick = (e) => {
                e.stopPropagation();
                this.openExternalURL(this.currentAppleMusicUrl);
            };
            
            appleMusicContainer.appendChild(icon);
            appleMusicContainer.appendChild(platformName);
            appleMusicContainer.appendChild(trackTitle);
            appleMusicContainer.appendChild(openButton);
            
            this.mediaElement = appleMusicContainer;
            
            // Add helpful message
            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; color: #fff; font-size: 12px; text-align: center;';
            infoDiv.innerHTML = '🎵 Tap button above or use "Play on Apple Music" to listen';
            
            mediaContainer.appendChild(appleMusicContainer);
            mediaContainer.appendChild(infoDiv);
            console.log('🎵 Apple Music preview created successfully (button-only mode)');
        } else if (this.mediaType === 'pandora') {
            // Pandora - button only (basic support)
            this.currentPandoraUrl = url;
            
            // Create branded container with Pandora branding
            const isLandscape = window.innerWidth > window.innerHeight;
            const containerHeight = isLandscape ? '300px' : '350px';
            const pandoraContainer = document.createElement('div');
            pandoraContainer.style.cssText = `width: 100%; height: ${containerHeight}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #3668FF 0%, #5080FF 100%); border-radius: 8px;`;
            
            // Pandora icon
            const icon = document.createElement('div');
            icon.style.cssText = 'font-size: 80px; margin-bottom: 20px;';
            icon.textContent = '🎵';
            
            // Platform name
            const platformName = document.createElement('div');
            platformName.style.cssText = 'font-size: 32px; font-weight: bold; color: white; margin-bottom: 10px; font-family: Arial;';
            platformName.textContent = 'Pandora';
            
            // Track title
            const trackTitle = document.createElement('div');
            trackTitle.style.cssText = 'font-size: 18px; color: rgba(255,255,255,0.9); margin-bottom: 30px; text-align: center; padding: 0 20px; font-family: Arial;';
            trackTitle.textContent = this.mediaData.name || 'Music Station';
            
            // Open button
            const openButton = document.createElement('button');
            openButton.style.cssText = 'background: white; color: #3668FF; border: none; border-radius: 25px; padding: 15px 40px; font-size: 16px; font-weight: bold; cursor: pointer; transition: transform 0.2s; font-family: Arial;';
            openButton.textContent = '▶ Open in Pandora';
            openButton.onmouseenter = () => {
                openButton.style.transform = 'scale(1.05)';
            };
            openButton.onmouseleave = () => {
                openButton.style.transform = 'scale(1)';
            };
            openButton.onclick = (e) => {
                e.stopPropagation();
                this.openExternalURL(this.currentPandoraUrl);
            };
            
            pandoraContainer.appendChild(icon);
            pandoraContainer.appendChild(platformName);
            pandoraContainer.appendChild(trackTitle);
            pandoraContainer.appendChild(openButton);
            
            this.mediaElement = pandoraContainer;
            
            // Add helpful message
            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; color: #fff; font-size: 12px; text-align: center;';
            infoDiv.innerHTML = '🎵 Tap button above or use "Play on Pandora" to listen';
            
            mediaContainer.appendChild(pandoraContainer);
            mediaContainer.appendChild(infoDiv);
            console.log('🎵 Pandora preview created successfully (button-only mode)');
        } else if (this.mediaType === 'amazon_music') {
            // Amazon Music - button only (basic support)
            this.currentAmazonMusicUrl = url;
            
            // Create branded container with Amazon Music branding
            const isLandscape = window.innerWidth > window.innerHeight;
            const containerHeight = isLandscape ? '300px' : '350px';
            const amazonContainer = document.createElement('div');
            amazonContainer.style.cssText = `width: 100%; height: ${containerHeight}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #FF9900 0%, #FFB340 100%); border-radius: 8px;`;
            
            // Amazon Music icon
            const icon = document.createElement('div');
            icon.style.cssText = 'font-size: 80px; margin-bottom: 20px;';
            icon.textContent = '🎵';
            
            // Platform name
            const platformName = document.createElement('div');
            platformName.style.cssText = 'font-size: 32px; font-weight: bold; color: white; margin-bottom: 10px; font-family: Arial;';
            platformName.textContent = 'Amazon Music';
            
            // Track title
            const trackTitle = document.createElement('div');
            trackTitle.style.cssText = 'font-size: 18px; color: rgba(255,255,255,0.9); margin-bottom: 30px; text-align: center; padding: 0 20px; font-family: Arial;';
            trackTitle.textContent = this.mediaData.name || 'Music Track';
            
            // Open button
            const openButton = document.createElement('button');
            openButton.style.cssText = 'background: white; color: #FF9900; border: none; border-radius: 25px; padding: 15px 40px; font-size: 16px; font-weight: bold; cursor: pointer; transition: transform 0.2s; font-family: Arial;';
            openButton.textContent = '▶ Open in Amazon Music';
            openButton.onmouseenter = () => {
                openButton.style.transform = 'scale(1.05)';
            };
            openButton.onmouseleave = () => {
                openButton.style.transform = 'scale(1)';
            };
            openButton.onclick = (e) => {
                e.stopPropagation();
                this.openExternalURL(this.currentAmazonMusicUrl);
            };
            
            amazonContainer.appendChild(icon);
            amazonContainer.appendChild(platformName);
            amazonContainer.appendChild(trackTitle);
            amazonContainer.appendChild(openButton);
            
            this.mediaElement = amazonContainer;
            
            // Add helpful message
            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; color: #fff; font-size: 12px; text-align: center;';
            infoDiv.innerHTML = '🎵 Tap button above or use "Play on Amazon Music" to listen';
            
            mediaContainer.appendChild(amazonContainer);
            mediaContainer.appendChild(infoDiv);
            console.log('🎵 Amazon Music preview created successfully (button-only mode)');
        }
        
        this.mediaOverlay.appendChild(mediaContainer);
        
        // Add like/dislike feedback buttons
        this.addFeedbackButtons();
        
        // Add playlist controls if in furniture or path playback mode
        this.addPlaylistControls();
        
        // Use setTimeout to ensure DOM is fully rendered before attaching event listeners
        setTimeout(() => {
            this.attachButtonListeners();
        }, 0);
    }
    
    /**
     * Add playlist controls bar at bottom if in furniture/path playback mode
     */
    addPlaylistControls() {
        // Use stored playback context (survives media element recreation)
        const isFurniturePlayback = this.furniturePlaybackContext || window.app?.activeFurniturePlayback;
        const isPathPlayback = this.pathPlaybackContext || this.mediaData?.activePathPlayback;
        
        // console.log('🎵 addPlaylistControls called - checking contexts:', {
        //     furniturePlaybackContext: this.furniturePlaybackContext,
        //     windowActiveFurniturePlayback: window.app?.activeFurniturePlayback,
        //     pathPlaybackContext: this.pathPlaybackContext,
        //     mediaDataActivePathPlayback: this.mediaData?.activePathPlayback,
        //     isFurniturePlayback: !!isFurniturePlayback,
        //     isPathPlayback: !!isPathPlayback
        // });
        
        if (!isFurniturePlayback && !isPathPlayback) {
            console.log('🎵 No playlist context - skipping controls');
            return; // Not in playlist mode
        }
        
        console.log('🎵 Adding playlist controls with context:', {isFurniturePlayback, isPathPlayback});
        
        let playlistName = '';
        let currentPosition = 0;
        let totalItems = 0;
        let canGoPrevious = false;
        let canGoNext = false;
        
        if (isFurniturePlayback) {
            // Get furniture data from stored context
            const furnitureId = this.furniturePlaybackContext?.furnitureId || window.app.activeFurniturePlayback?.furnitureId;
            // console.log('🎵 Looking up furniture with ID:', furnitureId, 'from context:', this.furniturePlaybackContext);
            const furniture = window.app.furnitureManager?.storageManager?.getFurniture(furnitureId);
            // console.log('🎵 Retrieved furniture object:', furniture);
            
            if (furniture) {
                // Capitalize first letter of furniture name
                const rawName = furniture.name || 'Furniture Playlist';
                playlistName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                currentPosition = furniture.currentIndex + 1; // Convert to 1-based slot number
                totalItems = furniture.capacity; // Total slot capacity, not just occupied
                
                // Check if we can navigate
                const result = furniture.getNextObject();
                canGoNext = result.hasNext;
                const prevResult = furniture.getPreviousObject();
                canGoPrevious = prevResult.hasPrevious;
                // console.log('🎵 Navigation check: canGoNext=', canGoNext, 'canGoPrevious=', canGoPrevious);
            } else {
                console.error('🎵 FURNITURE NOT FOUND! FurnitureId:', furnitureId);
            }
        } else if (isPathPlayback) {
            const pathId = this.mediaData.activePathPlayback;
            const path = window.app.pathManager?.getPath(pathId);
            
            if (path) {
                playlistName = path.name || 'Path Playlist';
                currentPosition = path.currentStep + 1; // Convert to 1-based
                totalItems = path.steps.length;
                
                // Check if we can navigate (paths may have different logic)
                canGoNext = path.currentStep < path.steps.length - 1;
                canGoPrevious = path.currentStep > 0;
            }
        }
        
        // Create playlist controls bar
        const playlistBar = document.createElement('div');
        playlistBar.id = 'playlistControlsBar';
        playlistBar.style.cssText = `
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 8px 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-family: Arial, sans-serif;
            font-size: 13px;
            margin-top: 10px;
            border-radius: 6px;
            pointer-events: auto;
        `;
        
        // Left side: Playlist name and position
        const playlistInfo = document.createElement('div');
        playlistInfo.style.cssText = 'flex: 1; font-weight: 500;';
        playlistInfo.textContent = `${playlistName}  [${currentPosition}/${totalItems}]`;
        
        // Right side: Navigation controls
        const controls = document.createElement('div');
        controls.style.cssText = 'display: flex; gap: 8px; align-items: center;';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.id = 'playlistPrevBtn';
        prevBtn.textContent = '◄ Prev';
        prevBtn.style.cssText = `
            background: ${canGoPrevious ? '#3498db' : '#555'};
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 12px;
            cursor: ${canGoPrevious ? 'pointer' : 'not-allowed'};
            font-size: 12px;
            font-weight: bold;
            pointer-events: auto;
            touch-action: manipulation;
            opacity: ${canGoPrevious ? '1' : '0.5'};
        `;
        prevBtn.disabled = !canGoPrevious;
        console.log('🎵 Previous button created, disabled:', prevBtn.disabled);
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.id = 'playlistNextBtn';
        nextBtn.textContent = 'Next ►';
        nextBtn.style.cssText = `
            background: ${canGoNext ? '#3498db' : '#555'};
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 12px;
            cursor: ${canGoNext ? 'pointer' : 'not-allowed'};
            font-size: 12px;
            font-weight: bold;
            pointer-events: auto;
            touch-action: manipulation;
            opacity: ${canGoNext ? '1' : '0.5'};
        `;
        nextBtn.disabled = !canGoNext;
        console.log('🎵 Next button created, disabled:', nextBtn.disabled);
        
        // Stop button
        const stopBtn = document.createElement('button');
        stopBtn.id = 'playlistStopBtn';
        stopBtn.textContent = '✕';
        stopBtn.style.cssText = `
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            pointer-events: auto;
            touch-action: manipulation;
        `;
        
        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);
        controls.appendChild(stopBtn);
        
        playlistBar.appendChild(playlistInfo);
        playlistBar.appendChild(controls);
        
        this.mediaOverlay.appendChild(playlistBar);
        
        console.log('🎵 Added playlist controls:', { playlistName, currentPosition, totalItems });
    }
    
    /**
     * Add like/dislike feedback buttons at bottom of preview
     */
    addFeedbackButtons() {
        // Get current URL for feedback tracking
        const url = this.mediaData.url || this.mediaData.path || '';
        if (!url) {
            console.log('👍 No URL for feedback buttons - skipping');
            return;
        }
        
        // Get current feedback state (if any)
        const feedbackManager = window.mediaFeedback;
        const currentFeedbackObj = feedbackManager?.getFeedback(url);
        const currentFeedback = currentFeedbackObj?.sentiment; // Extract sentiment string
        
        console.log('👍 Creating feedback buttons for:', url, 'current state:', currentFeedback);
        
        // Create feedback bar container
        const feedbackBar = document.createElement('div');
        feedbackBar.id = 'mediaFeedbackBar';
        feedbackBar.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            padding: 15px;
            margin-top: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            pointer-events: auto;
        `;
        
        // Like button (thumbs up) - normalize 'liked' to 'like' for comparison
        const likeBtn = document.createElement('button');
        likeBtn.id = 'mediaLikeBtn';
        const isLiked = currentFeedback === 'liked' || currentFeedback === 'like';
        likeBtn.innerHTML = '👍';
        likeBtn.title = isLiked ? 'You liked this' : 'Like this content';
        likeBtn.style.cssText = `
            background: ${isLiked ? '#27ae60' : 'rgba(255, 255, 255, 0.1)'};
            color: white;
            border: 2px solid ${isLiked ? '#27ae60' : 'rgba(255, 255, 255, 0.3)'};
            border-radius: 50%;
            width: 50px;
            height: 50px;
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            touch-action: manipulation;
            transition: all 0.3s ease;
            transform: ${isLiked ? 'scale(1.1)' : 'scale(1)'};
        `;
        
        // Dislike button (thumbs down) - normalize 'disliked' to 'dislike' for comparison
        const dislikeBtn = document.createElement('button');
        dislikeBtn.id = 'mediaDislikeBtn';
        const isDisliked = currentFeedback === 'disliked' || currentFeedback === 'dislike';
        dislikeBtn.innerHTML = '👎';
        dislikeBtn.title = isDisliked ? 'You disliked this' : 'Dislike this content';
        dislikeBtn.style.cssText = `
            background: ${isDisliked ? '#e74c3c' : 'rgba(255, 255, 255, 0.1)'};
            color: white;
            border: 2px solid ${isDisliked ? '#e74c3c' : 'rgba(255, 255, 255, 0.3)'};
            border-radius: 50%;
            width: 50px;
            height: 50px;
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            touch-action: manipulation;
            transition: all 0.3s ease;
            transform: ${isDisliked ? 'scale(1.1)' : 'scale(1)'};
        `;
        
        // Add hover effects
        const addHoverEffect = (btn, isActive) => {
            btn.addEventListener('mouseenter', () => {
                if (!isActive) {
                    btn.style.transform = 'scale(1.15)';
                    btn.style.background = 'rgba(255, 255, 255, 0.2)';
                }
            });
            btn.addEventListener('mouseleave', () => {
                if (!isActive) {
                    btn.style.transform = 'scale(1)';
                    btn.style.background = 'rgba(255, 255, 255, 0.1)';
                }
            });
        };
        
        addHoverEffect(likeBtn, isLiked);
        addHoverEffect(dislikeBtn, isDisliked);
        
        // Add click handlers
        likeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleFeedback('like', url);
        });
        
        dislikeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleFeedback('dislike', url);
        });
        
        // Add touch event handlers for mobile
        likeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleFeedback('like', url);
        });
        
        dislikeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleFeedback('dislike', url);
        });
        
        feedbackBar.appendChild(likeBtn);
        feedbackBar.appendChild(dislikeBtn);
        
        this.mediaOverlay.appendChild(feedbackBar);
        
        console.log('👍 Feedback buttons added with state:', currentFeedback || 'neutral');
    }
    
    /**
     * Handle like/dislike feedback
     */
    handleFeedback(type, url) {
        console.log(`👍 Handling ${type} feedback for:`, url);
        
        const feedbackManager = window.mediaFeedback;
        if (!feedbackManager) {
            console.error('👍 MediaFeedbackManager not available!');
            return;
        }
        
        // Get current state (extract sentiment string from feedback object)
        const currentFeedbackObj = feedbackManager.getFeedback(url);
        const currentFeedback = currentFeedbackObj?.sentiment;
        
        // Normalize comparison: 'like' matches 'liked', 'dislike' matches 'disliked'
        const normalizedCurrent = currentFeedback === 'liked' ? 'like' : currentFeedback === 'disliked' ? 'dislike' : currentFeedback;
        
        // Toggle behavior: if clicking the same button, remove feedback
        const newFeedback = normalizedCurrent === type ? null : type;
        
        // Record feedback in JavaScript
        feedbackManager.recordFeedback(url, newFeedback, {
            title: this.mediaData.name || this.mediaData.fileName,
            platform: this.mediaType,
            timestamp: Date.now()
        });
        
        console.log(`👍 Feedback recorded: ${currentFeedback} → ${newFeedback}`);
        
        // Send to Flutter for persistence
        this.sendFeedbackToFlutter(url, newFeedback);
        
        // Update button visuals
        this.updateFeedbackButtons(newFeedback);
        
        // Show brief confirmation
        this.showFeedbackConfirmation(newFeedback);
    }
    
    /**
     * Send feedback to Flutter via ContentFeedbackChannel
     */
    sendFeedbackToFlutter(url, feedback) {
        if (typeof ContentFeedbackChannel === 'undefined') {
            console.warn('👍 ContentFeedbackChannel not available - feedback not persisted to Flutter');
            return;
        }
        
        const message = JSON.stringify({
            action: 'recordFeedback',
            url: url,
            feedback: feedback,
            metadata: {
                title: this.mediaData.name || this.mediaData.fileName,
                platform: this.mediaType,
                timestamp: Date.now()
            }
        });
        
        console.log('👍 Sending feedback to Flutter:', message);
        ContentFeedbackChannel.postMessage(message);
    }
    
    /**
     * Update feedback button visuals
     */
    updateFeedbackButtons(newFeedback) {
        const likeBtn = document.getElementById('mediaLikeBtn');
        const dislikeBtn = document.getElementById('mediaDislikeBtn');
        
        if (!likeBtn || !dislikeBtn) return;
        
        // Normalize sentiment values for comparison (accept both 'like'/'liked' forms)
        const isLiked = newFeedback === 'like' || newFeedback === 'liked';
        const isDisliked = newFeedback === 'dislike' || newFeedback === 'disliked';
        
        // Update like button
        likeBtn.style.background = isLiked ? '#27ae60' : 'rgba(255, 255, 255, 0.1)';
        likeBtn.style.borderColor = isLiked ? '#27ae60' : 'rgba(255, 255, 255, 0.3)';
        likeBtn.style.transform = isLiked ? 'scale(1.1)' : 'scale(1)';
        likeBtn.title = isLiked ? 'You liked this' : 'Like this content';
        
        // Update dislike button
        dislikeBtn.style.background = isDisliked ? '#e74c3c' : 'rgba(255, 255, 255, 0.1)';
        dislikeBtn.style.borderColor = isDisliked ? '#e74c3c' : 'rgba(255, 255, 255, 0.3)';
        dislikeBtn.style.transform = isDisliked ? 'scale(1.1)' : 'scale(1)';
        dislikeBtn.title = isDisliked ? 'You disliked this' : 'Dislike this content';
    }
    
    /**
     * Show brief feedback confirmation
     */
    showFeedbackConfirmation(feedback) {
        // Create temporary confirmation message
        const confirmation = document.createElement('div');
        confirmation.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: fadeInOut 1.5s ease;
        `;
        
        // Normalize feedback values for display
        const normalizedFeedback = feedback === 'liked' ? 'like' : feedback === 'disliked' ? 'dislike' : feedback;
        
        if (normalizedFeedback === 'like') {
            confirmation.innerHTML = '👍 Liked!';
        } else if (normalizedFeedback === 'dislike') {
            confirmation.innerHTML = '👎 Disliked';
        } else {
            confirmation.innerHTML = '↩️ Feedback removed';
        }
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(confirmation);
        
        // Remove after animation
        setTimeout(() => {
            confirmation.remove();
            style.remove();
        }, 1500);
    }
    
    /**
     * Attach event listeners to header buttons
     */
    attachButtonListeners() {
        // console.log('🎵 Attaching button event listeners...');
        
        // Setup close button (with touch support for mobile)
        const closeBtn = document.getElementById('closeMediaBtn');
        if (closeBtn) {
            console.log('🎵 Close button found, attaching event listeners');
            closeBtn.addEventListener('click', (e) => {
                console.log('🎵 Close button CLICKED');
                e.preventDefault();
                e.stopPropagation();
                this.hide();
            });
            closeBtn.addEventListener('touchend', (e) => {
                console.log('🎵 Close button TOUCHEND');
                e.preventDefault();
                e.stopPropagation();
                this.hide();
            });
        } else {
            console.error('🎵 Close button NOT FOUND in DOM!');
        }
        
        // Setup 'View on YouTube' button (only for YouTube videos)
        if (this.mediaType === 'youtube') {
            const viewOnYouTubeBtn = document.getElementById('viewOnYouTubeBtn');
            if (viewOnYouTubeBtn) {
                console.log('🎵 View on YouTube button found, attaching event listeners');
                const openYouTube = (e) => {
                    console.log('🎵 Opening YouTube URL externally:', this.currentYouTubeUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentYouTubeUrl, 'youtube');
                };
                viewOnYouTubeBtn.addEventListener('click', openYouTube);
                viewOnYouTubeBtn.addEventListener('touchend', openYouTube);
            } else {
                console.error('🎵 View on YouTube button NOT FOUND in DOM!');
            }
        }
        
        // Setup 'Play on Spotify' button (only for Spotify tracks)
        if (this.mediaType === 'spotify') {
            const viewOnSpotifyBtn = document.getElementById('viewOnSpotifyBtn');
            if (viewOnSpotifyBtn) {
                console.log('🎵 Play on Spotify button found, attaching event listeners');
                const openSpotify = (e) => {
                    console.log('🎵 Opening Spotify URL externally:', this.currentSpotifyUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentSpotifyUrl, 'spotify');
                };
                viewOnSpotifyBtn.addEventListener('click', openSpotify);
                viewOnSpotifyBtn.addEventListener('touchend', openSpotify);
            } else {
                console.error('🎵 Play on Spotify button NOT FOUND in DOM!');
            }
            
            // Setup clickable link in Spotify background indicator
            const openSpotifyLink = document.getElementById('openSpotifyLink');
            if (openSpotifyLink) {
                console.log('🎵 Spotify indicator link found, attaching event listeners');
                const openSpotifyFromIndicator = (e) => {
                    console.log('🎵 Opening Spotify from background indicator:', this.currentSpotifyUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentSpotifyUrl, 'spotify');
                };
                openSpotifyLink.addEventListener('click', openSpotifyFromIndicator);
                openSpotifyLink.addEventListener('touchend', openSpotifyFromIndicator);
            }
        }
        
        // Setup 'Play on SoundCloud' button (only for SoundCloud tracks)
        if (this.mediaType === 'soundcloud') {
            const viewOnSoundCloudBtn = document.getElementById('viewOnSoundCloudBtn');
            if (viewOnSoundCloudBtn) {
                console.log('🎵 Play on SoundCloud button found, attaching event listeners');
                const openSoundCloud = (e) => {
                    console.log('🎵 Opening SoundCloud URL externally:', this.currentSoundCloudUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentSoundCloudUrl, 'soundcloud');
                };
                viewOnSoundCloudBtn.addEventListener('click', openSoundCloud);
                viewOnSoundCloudBtn.addEventListener('touchend', openSoundCloud);
            } else {
                console.error('🎵 Play on SoundCloud button NOT FOUND in DOM!');
            }
        }
        
        // Setup 'Watch on Vimeo' button (only for Vimeo videos)
        if (this.mediaType === 'vimeo') {
            const viewOnVimeoBtn = document.getElementById('viewOnVimeoBtn');
            if (viewOnVimeoBtn) {
                console.log('🎵 Watch on Vimeo button found, attaching event listeners');
                const openVimeo = (e) => {
                    console.log('🎵 Opening Vimeo URL externally:', this.currentVimeoUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentVimeoUrl, 'vimeo');
                };
                viewOnVimeoBtn.addEventListener('click', openVimeo);
                viewOnVimeoBtn.addEventListener('touchend', openVimeo);
            } else {
                console.error('🎵 Watch on Vimeo button NOT FOUND in DOM!');
            }
        }
        
        // Setup 'Watch on Dailymotion' button (only for Dailymotion videos)
        if (this.mediaType === 'dailymotion') {
            const viewOnDailymotionBtn = document.getElementById('viewOnDailymotionBtn');
            if (viewOnDailymotionBtn) {
                console.log('🎵 Watch on Dailymotion button found, attaching event listeners');
                const openDailymotion = (e) => {
                    console.log('🎵 Opening Dailymotion URL externally:', this.currentDailymotionUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentDailymotionUrl, 'dailymotion');
                };
                viewOnDailymotionBtn.addEventListener('click', openDailymotion);
                viewOnDailymotionBtn.addEventListener('touchend', openDailymotion);
            } else {
                console.error('🎵 Watch on Dailymotion button NOT FOUND in DOM!');
            }
        }
        
        // Setup 'Listen on Deezer' button (only for Deezer tracks)
        if (this.mediaType === 'deezer') {
            const viewOnDeezerBtn = document.getElementById('viewOnDeezerBtn');
            if (viewOnDeezerBtn) {
                console.log('🎵 Listen on Deezer button found, attaching event listeners');
                const openDeezer = (e) => {
                    console.log('🎵 Opening Deezer URL externally:', this.currentDeezerUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentDeezerUrl, 'deezer');
                };
                viewOnDeezerBtn.addEventListener('click', openDeezer);
                viewOnDeezerBtn.addEventListener('touchend', openDeezer);
            } else {
                console.error('🎵 Listen on Deezer button NOT FOUND in DOM!');
            }
        }
        
        // Setup 'Play on Apple Music' button (only for Apple Music tracks)
        if (this.mediaType === 'apple_music') {
            const viewOnAppleMusicBtn = document.getElementById('viewOnAppleMusicBtn');
            if (viewOnAppleMusicBtn) {
                console.log('🎵 Play on Apple Music button found, attaching event listeners');
                const openAppleMusic = (e) => {
                    console.log('🎵 Opening Apple Music URL externally:', this.currentAppleMusicUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentAppleMusicUrl, 'apple_music');
                };
                viewOnAppleMusicBtn.addEventListener('click', openAppleMusic);
                viewOnAppleMusicBtn.addEventListener('touchend', openAppleMusic);
            } else {
                console.error('🎵 Play on Apple Music button NOT FOUND in DOM!');
            }
        }
        
        // Setup 'Play on Pandora' button (only for Pandora stations)
        if (this.mediaType === 'pandora') {
            const viewOnPandoraBtn = document.getElementById('viewOnPandoraBtn');
            if (viewOnPandoraBtn) {
                console.log('🎵 Play on Pandora button found, attaching event listeners');
                const openPandora = (e) => {
                    console.log('🎵 Opening Pandora URL externally:', this.currentPandoraUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentPandoraUrl, 'pandora');
                };
                viewOnPandoraBtn.addEventListener('click', openPandora);
                viewOnPandoraBtn.addEventListener('touchend', openPandora);
            } else {
                console.error('🎵 Play on Pandora button NOT FOUND in DOM!');
            }
        }
        
        // Setup 'Play on Amazon Music' button (only for Amazon Music tracks)
        if (this.mediaType === 'amazon_music') {
            const viewOnAmazonMusicBtn = document.getElementById('viewOnAmazonMusicBtn');
            if (viewOnAmazonMusicBtn) {
                console.log('🎵 Play on Amazon Music button found, attaching event listeners');
                const openAmazonMusic = (e) => {
                    console.log('🎵 Opening Amazon Music URL externally:', this.currentAmazonMusicUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentAmazonMusicUrl, 'amazon_music');
                };
                viewOnAmazonMusicBtn.addEventListener('click', openAmazonMusic);
                viewOnAmazonMusicBtn.addEventListener('touchend', openAmazonMusic);
            } else {
                console.error('🎵 Play on Amazon Music button NOT FOUND in DOM!');
            }
        }
        
        // Setup 'Open in TikTok' button
        if (this.mediaType === 'tiktok') {
            const tiktokOpenBtn = document.getElementById('tiktokOpenBtn');
            if (tiktokOpenBtn) {
                console.log('🎵 Open in TikTok button found, attaching event listeners');
                const openTikTok = (e) => {
                    console.log('🎵 Opening TikTok URL externally:', this.currentTikTokUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentTikTokUrl, 'tiktok');
                };
                tiktokOpenBtn.addEventListener('click', openTikTok);
                tiktokOpenBtn.addEventListener('touchend', openTikTok);
            }
        }
        
        // Setup 'Open in Instagram' button
        if (this.mediaType === 'instagram') {
            const instagramOpenBtn = document.getElementById('instagramOpenBtn');
            if (instagramOpenBtn) {
                console.log('🎵 Open in Instagram button found, attaching event listeners');
                const openInstagram = (e) => {
                    console.log('🎵 Opening Instagram URL externally:', this.currentInstagramUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentInstagramUrl, 'instagram');
                };
                instagramOpenBtn.addEventListener('click', openInstagram);
                instagramOpenBtn.addEventListener('touchend', openInstagram);
            }
        }
        
        // Setup 'Open in Snapchat' button
        if (this.mediaType === 'snapchat') {
            const snapchatOpenBtn = document.getElementById('snapchatOpenBtn');
            if (snapchatOpenBtn) {
                console.log('🎵 Open in Snapchat button found, attaching event listeners');
                const openSnapchat = (e) => {
                    console.log('🎵 Opening Snapchat URL externally:', this.currentSnapchatUrl);
                    e.preventDefault();
                    e.stopPropagation();
                    this.openExternalURL(this.currentSnapchatUrl, 'snapchat');
                };
                snapchatOpenBtn.addEventListener('click', openSnapchat);
                snapchatOpenBtn.addEventListener('touchend', openSnapchat);
            }
        }
        
        // Setup playlist controls (Previous, Next, Stop)
        const playlistPrevBtn = document.getElementById('playlistPrevBtn');
        // console.log('🎵 Previous button found:', !!playlistPrevBtn, 'disabled:', playlistPrevBtn?.disabled);
        if (playlistPrevBtn && !playlistPrevBtn.disabled) {
            console.log('🎵 Attaching event listeners to Previous button');
            const handlePrev = (e) => {
                console.log('🎵🎵🎵 PREVIOUS BUTTON CLICKED/TOUCHED!');
                console.log('🎵 Context check - activeFurniturePlayback:', !!window.app?.activeFurniturePlayback);
                console.log('🎵 Context check - activePathPlayback:', !!this.mediaData?.activePathPlayback);
                console.log('🎵 Context check - furniturePlaybackContext:', this.furniturePlaybackContext);
                e.preventDefault();
                e.stopPropagation();
                
                // Check stored context first, then fall back to global state
                if (this.furniturePlaybackContext?.furnitureId) {
                    const furnitureId = this.furniturePlaybackContext.furnitureId;
                    console.log('🎵 Playlist Previous button - calling furnitureManager.playPrevious with furnitureId:', furnitureId);
                    window.app.furnitureManager?.playPrevious(furnitureId);
                } else if (this.mediaData?.activePathPlayback) {
                    const pathId = this.mediaData.activePathPlayback;
                    console.log('🎵 Playlist Previous button - calling pathManager.playPrevious');
                    window.app.pathManager?.playPrevious(pathId);
                } else {
                    console.error('🎵 ERROR: No active playback context found!');
                }
            };
            playlistPrevBtn.addEventListener('click', handlePrev);
            playlistPrevBtn.addEventListener('touchend', handlePrev);
        }
        
        const playlistNextBtn = document.getElementById('playlistNextBtn');
        // console.log('🎵 Next button found:', !!playlistNextBtn, 'disabled:', playlistNextBtn?.disabled);
        if (playlistNextBtn && !playlistNextBtn.disabled) {
            console.log('🎵 Attaching event listeners to Next button');
            const handleNext = (e) => {
                console.log('🎵🎵🎵 NEXT BUTTON CLICKED/TOUCHED!');
                console.log('🎵 Context check - activeFurniturePlayback:', !!window.app?.activeFurniturePlayback);
                console.log('🎵 Context check - activePathPlayback:', !!this.mediaData?.activePathPlayback);
                console.log('🎵 Context check - furniturePlaybackContext:', this.furniturePlaybackContext);
                e.preventDefault();
                e.stopPropagation();
                
                // Check stored context first, then fall back to global state
                if (this.furniturePlaybackContext?.furnitureId) {
                    const furnitureId = this.furniturePlaybackContext.furnitureId;
                    console.log('🎵 Playlist Next button - calling furnitureManager.playNext with furnitureId:', furnitureId);
                    window.app.furnitureManager?.playNext(furnitureId);
                } else if (this.mediaData?.activePathPlayback) {
                    const pathId = this.mediaData.activePathPlayback;
                    console.log('🎵 Playlist Next button - calling pathManager.playNext');
                    window.app.pathManager?.playNext(pathId);
                } else {
                    console.error('🎵 ERROR: No active playback context found!');
                }
            };
            playlistNextBtn.addEventListener('click', handleNext);
            playlistNextBtn.addEventListener('touchend', handleNext);
        }
        
        const playlistStopBtn = document.getElementById('playlistStopBtn');
        if (playlistStopBtn) {
            const handleStop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎵 Playlist Stop button - closing preview and stopping playback');
                this.hide(); // This will stop playback since shouldAutoAdvance defaults to false
            };
            playlistStopBtn.addEventListener('click', handleStop);
            playlistStopBtn.addEventListener('touchend', handleStop);
        }
        
        // Setup fullscreen button (with touch support for mobile)
        const fullscreenBtn = document.getElementById('fullscreenMediaBtn');
        if (fullscreenBtn) {
            console.log('🎵 Fullscreen button found, attaching event listeners');
            fullscreenBtn.addEventListener('click', (e) => {
                console.log('🎵 Fullscreen button CLICKED');
                e.preventDefault();
                e.stopPropagation();
                this.toggleFullscreen();
            });
            fullscreenBtn.addEventListener('touchend', (e) => {
                console.log('🎵 Fullscreen button TOUCHEND');
                e.preventDefault();
                e.stopPropagation();
                this.toggleFullscreen();
            });
        } else {
            console.error('🎵 Fullscreen button NOT FOUND in DOM!');
        }
        
        // Setup minimize to PiP button (only for local audio/video files)
        const minimizeToPiPBtn = document.getElementById('minimizeToPiPBtn');
        if (minimizeToPiPBtn) {
            console.log('🎵 Minimize to PiP button found, attaching event listeners');
            const handleMinimize = (e) => {
                console.log('🎵 Minimize to PiP button clicked');
                e.preventDefault();
                e.stopPropagation();
                this.minimizeToPiP();
            };
            minimizeToPiPBtn.addEventListener('click', handleMinimize);
            minimizeToPiPBtn.addEventListener('touchend', handleMinimize);
        }
        
        // Setup fullscreen controls auto-hide
        this.setupFullscreenControlsAutoHide();
    }
    
    /**
     * Request media data URL from Flutter bridge
     */
    async requestMediaDataUrl(filePath, extension) {
        return new Promise((resolve) => {
            // Set up callback for Flutter response
            window.mediaFileDataCallback = (receivedPath, dataUrl) => {
                if (receivedPath === filePath) {
                    // Check if Flutter is opening file externally (for files >50MB)
                    if (dataUrl === 'OPEN_EXTERNAL') {
                        console.log('🎵 Large file opened in external app:', receivedPath);
                        // Return special marker so createMediaElement can handle it
                        resolve('OPEN_EXTERNAL');
                    } else {
                        console.log('🎵 Received media data URL for:', receivedPath);
                        resolve(dataUrl);
                    }
                    // Clean up callback
                    delete window.mediaFileDataCallback;
                }
            };
            
            // Send request to Flutter
            try {
                if (window.MediaFileDataChannel) {
                    window.MediaFileDataChannel.postMessage(JSON.stringify({
                        action: 'getMediaDataUrl',
                        filePath: filePath,
                        extension: extension
                    }));
                } else {
                    console.error('🎵 MediaFileDataChannel not available');
                    resolve(null);
                }
            } catch (error) {
                console.error('🎵 Error requesting media data URL:', error);
                resolve(null);
            }
            
            // Timeout after 10 seconds
            setTimeout(() => {
                console.error('🎵 Timeout waiting for media data URL');
                resolve(null);
                delete window.mediaFileDataCallback;
            }, 10000);
        });
    }
    
    /**
     * Show error message in media overlay
     */
    showMediaError(message) {
        this.mediaOverlay.innerHTML = `
            <div style="padding: 40px; text-align: center; color: white; font-family: Arial;">
                <h3 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Error</h3>
                <p>${message}</p>
                <button id="closeMediaBtn" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 10px 20px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-top: 20px;
                ">Close</button>
            </div>
        `;
        
        document.getElementById('closeMediaBtn').addEventListener('click', () => {
            this.hide();
        });
    }
    
    /**
     * Setup fullscreen controls auto-hide behavior
     */
    setupFullscreenControlsAutoHide() {
        const header = document.getElementById('mediaControlsHeader');
        if (!header) return;
        
        let hideTimeout = null;
        
        // Function to hide controls
        const hideControls = () => {
            if (document.fullscreenElement) {
                header.style.opacity = '0';
                header.style.pointerEvents = 'none';
            }
        };
        
        // Function to show controls
        const showControls = () => {
            header.style.opacity = '1';
            header.style.pointerEvents = 'auto';
            
            // Clear existing timeout
            if (hideTimeout) clearTimeout(hideTimeout);
            
            // Hide after 3 seconds if in fullscreen
            if (document.fullscreenElement) {
                hideTimeout = setTimeout(hideControls, 3000);
            }
        };
        
        // Show controls on touch/click anywhere in overlay (mobile-friendly)
        this.mediaOverlay.addEventListener('click', showControls);
        this.mediaOverlay.addEventListener('touchstart', showControls);
        this.mediaOverlay.addEventListener('touchend', (e) => {
            // Only show controls if not clicking a button
            if (!e.target.closest('button')) {
                showControls();
            }
        });
        
        // Listen for fullscreen changes
        const fullscreenHandler = () => {
            if (document.fullscreenElement) {
                // Entered fullscreen - start auto-hide timer
                hideTimeout = setTimeout(hideControls, 3000);
            } else {
                // Exited fullscreen - show controls
                showControls();
                if (hideTimeout) clearTimeout(hideTimeout);
            }
        };
        
        document.addEventListener('fullscreenchange', fullscreenHandler);
        document.addEventListener('webkitfullscreenchange', fullscreenHandler);
        
        // Store for cleanup
        this.fullscreenHandler = fullscreenHandler;
    }
    
    /**
     * Toggle fullscreen mode for media overlay
     */
    toggleFullscreen() {
        if (!this.mediaOverlay) return;
        
        if (!document.fullscreenElement) {
            // Enter fullscreen - make overlay fill entire screen
            this.mediaOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100vw;
                height: 100vh;
                max-width: none;
                background: #000;
                border-radius: 0;
                padding: 20px;
                z-index: 2000;
                display: block;
                overflow-y: auto;
            `;
            
            // Ensure controls are visible initially in fullscreen
            const header = document.getElementById('mediaControlsHeader');
            if (header) {
                header.style.opacity = '1';
                header.style.pointerEvents = 'auto';
            }
            
            if (this.mediaOverlay.requestFullscreen) {
                this.mediaOverlay.requestFullscreen().then(() => {
                    console.log('🎵 Entered fullscreen mode');
                }).catch(err => {
                    console.error('🎵 Error entering fullscreen:', err);
                    // Restore normal sizing on error
                    this.restoreNormalSize();
                });
            } else if (this.mediaOverlay.webkitRequestFullscreen) {
                // Safari/iOS support
                this.mediaOverlay.webkitRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
            this.restoreNormalSize();
        }
    }
    
    /**
     * Restore normal (non-fullscreen) sizing
     */
    restoreNormalSize() {
        if (this.mediaOverlay) {
            this.applyOverlaySizing();
            this.mediaOverlay.style.display = 'block';
        }
    }
    
    /**
     * Extract YouTube video ID from URL
     */
    extractYouTubeId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^?&\s]+)/,  // Stop at ? or & or whitespace
            /youtube\.com\/embed\/([^?&\s]+)/,
            /youtube\.com\/shorts\/([^?&\s]+)/  // YouTube Shorts
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                // Clean the video ID - remove any remaining query parameters
                let videoId = match[1];
                // Remove everything after ? if present (e.g., ?si=xxx)
                if (videoId.includes('?')) {
                    videoId = videoId.split('?')[0];
                }
                console.log('🎥 Extracted YouTube video ID:', videoId, 'from URL:', url);
                return videoId;
            }
        }
        console.error('🎥 Failed to extract video ID from URL:', url);
        return null;
    }
    
    /**
     * Extract Spotify track ID from URL
     */
    extractSpotifyId(url) {
        const match = url.match(/track\/([^?\s]+)/);
        return match ? match[1] : null;
    }
    
    /**
     * Extract Vimeo video ID from URL
     */
    extractVimeoId(url) {
        const match = url.match(/vimeo\.com\/(\d+)/);
        return match ? match[1] : null;
    }
    
    /**
     * Extract Dailymotion video ID from URL
     */
    extractDailymotionId(url) {
        // Dailymotion URLs: https://www.dailymotion.com/video/x8abc123
        // Short URLs: https://dai.ly/x8abc123
        const standardMatch = url.match(/dailymotion\.com\/video\/([^?\s_]+)/);
        if (standardMatch) return standardMatch[1];
        
        const shortMatch = url.match(/dai\.ly\/([^?\s]+)/);
        return shortMatch ? shortMatch[1] : null;
    }
    
    /**
     * Extract TikTok video ID from URL (for future API use)
     */
    extractTikTokId(url) {
        // TikTok URLs: https://www.tiktok.com/@username/video/1234567890
        const match = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
        return match ? match[1] : null;
    }
    
    /**
     * Extract Instagram Reel ID from URL
     */
    extractInstagramId(url) {
        // Instagram URLs: https://www.instagram.com/reel/ABC123DEF/
        const reelMatch = url.match(/instagram\.com\/reel\/([^\/\?]+)/);
        if (reelMatch) return reelMatch[1];
        
        // Instagram post URLs: https://www.instagram.com/p/ABC123DEF/
        const postMatch = url.match(/instagram\.com\/p\/([^\/\?]+)/);
        return postMatch ? postMatch[1] : null;
    }
    
    /**
     * Show the media preview screen
     */
    async show() {
        this.isVisible = true;
        this.showTimestamp = Date.now(); // Track when preview was shown
        this.mesh.visible = false; // Hide 3D mesh since we're using HTML overlay
        
        // Recreate overlay if it was removed
        if (!this.mediaOverlay || !this.mediaOverlay.parentNode) {
            this.createMediaOverlay();
        }
        
        this.mediaOverlay.style.display = 'block';
        
        // Create media element if not already created
        if (!this.mediaElementReady) {
            console.log('🎵 Creating media element...');
            await this.createMediaElement();
            
            // Check if hide() was called during createMediaElement (e.g., for external app launch)
            if (!this.isVisible) {
                console.log('🎵 Preview was hidden during creation - aborting show()');
                return;
            }
            
            this.mediaElementReady = true;
        }
        
        // Auto-play if media element exists
        if (this.mediaElement && this.mediaElement.play) {
            this.mediaElement.play().catch(err => {
                console.log('🎵 Autoplay blocked:', err);
            });
        }
        
        this.render();
        console.log(`🎵 Media preview screen shown with overlay (${this.mediaType} - ${this.mediaData?.url || this.mediaData?.fileName})`);
    }
    
    /**
     * Minimize media preview to PiP player (only for local audio/video files)
     */
    minimizeToPiP() {
        console.log('🎵 Minimizing to PiP...');
        
        // Only works for local audio/video files
        if (this.mediaType !== 'audio' && this.mediaType !== 'video') {
            console.warn('🎵 PiP only available for local audio/video files');
            return;
        }
        
        // Check if YouTube player manager is available
        const playerManager = window.youtubePlayerManager || window.UnifiedMediaPlayer;
        if (!playerManager) {
            console.error('🎵 Media player not available');
            return;
        }
        
        // Get the current media element and its state
        if (!this.mediaElement) {
            console.error('🎵 No media element to minimize');
            return;
        }
        
        // Transfer playback to PiP player
        const mediaUrl = this.mediaData.url || this.mediaData.path || this.mediaData.id;
        const trackInfo = {
            title: this.mediaData.name || this.mediaData.fileName || 'Media',
            artist: '',
            albumArt: ''
        };
        
        // Get current playback position
        const currentTime = this.mediaElement.currentTime || 0;
        const isPaused = this.mediaElement.paused;
        
        console.log('🎵 Transferring to PiP:', {mediaUrl, currentTime, isPaused});
        
        // Play in PiP player
        playerManager.playMedia(mediaUrl, trackInfo).then(() => {
            // Seek to current position
            if (currentTime > 0) {
                setTimeout(() => {
                    if (playerManager.audioPlayer) {
                        playerManager.audioPlayer.currentTime = currentTime;
                    } else if (playerManager.videoPlayer) {
                        playerManager.videoPlayer.currentTime = currentTime;
                    }
                    
                    // Match pause state
                    if (isPaused) {
                        playerManager.pause();
                    }
                }, 100);
            }
        });
        
        // Hide the media preview screen
        this.hide();
    }
    
    /**
     * Hide the media preview screen
     * @param {boolean} shouldAutoAdvance - If true, video ended and should auto-advance to next
     */
    hide(shouldAutoAdvance = false) {
        // DIAGNOSTIC: Track timing and detect rapid close
        const hideTimestamp = Date.now();
        const timeSinceShow = this.showTimestamp ? hideTimestamp - this.showTimestamp : -1;
        
        // Log hide() call with timing info
        console.log(`🎵 ⚠️ hide() called - mediaType: ${this.mediaType}, shouldAutoAdvance: ${shouldAutoAdvance}, timeSinceShow: ${timeSinceShow}ms`);
        
        // WARNING: If hide() is called very soon after show(), flag it
        if (timeSinceShow >= 0 && timeSinceShow < 1000) {
            console.warn(`⚠️⚠️ RAPID CLOSE DETECTED! Preview was visible for only ${timeSinceShow}ms!`);
            console.warn(`⚠️ Media: ${this.mediaType} - ${this.mediaData?.url || this.mediaData?.fileName}`);
            // Try to get call stack
            try {
                console.warn('⚠️ Call stack:', new Error().stack);
            } catch (e) {
                // Ignore if stack trace fails
            }
        }
        
        this.isVisible = false;
        this.mesh.visible = false;
        
        // CRITICAL: Remove the overlay from DOM entirely to prevent interference
        // with other media previews' buttons
        if (this.mediaOverlay && this.mediaOverlay.parentNode) {
            this.mediaOverlay.parentNode.removeChild(this.mediaOverlay);
            console.log('🎵 Removed media overlay from DOM');
        }
        
        // Reset media element ready flag so overlay is recreated on next show
        this.mediaElementReady = false;
        
        // Exit fullscreen if active
        if (document.fullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
        
        // Stop media playback
        if (this.mediaElement) {
            console.log('🎵 Stopping media element playback...');
            try {
                // CRITICAL: Remove event listeners FIRST to prevent 'ended' events
                if (this.videoEndedHandler && this.mediaElement.tagName === 'VIDEO') {
                    this.mediaElement.removeEventListener('ended', this.videoEndedHandler);
                    this.videoEndedHandler = null;
                    console.log('🎵 Removed video ended handler');
                }
                if (this.audioEndedHandler && this.mediaElement.tagName === 'AUDIO') {
                    this.mediaElement.removeEventListener('ended', this.audioEndedHandler);
                    this.audioEndedHandler = null;
                    console.log('🎵 Removed audio ended handler');
                }
                
                if (this.mediaElement.pause) {
                    this.mediaElement.pause();
                    console.log('🎵 Media element paused');
                }
                // Also remove the src to fully stop loading
                if (this.mediaElement.src) {
                    this.mediaElement.src = '';
                }
                if (this.mediaElement.contentWindow) {
                    // For iframes, try to stop
                    this.mediaElement.src = 'about:blank'; // Stop iframe content
                }
            } catch (err) {
                console.warn('🎵 Error stopping media element:', err);
            }
        }
        
        // Also stop any audio/video elements within the overlay
        if (this.mediaOverlay) {
            const audioElements = this.mediaOverlay.querySelectorAll('audio, video');
            audioElements.forEach(el => {
                try {
                    el.pause();
                    el.src = '';
                    console.log('🎵 Stopped overlay media element');
                } catch (err) {
                    console.warn('🎵 Error stopping overlay media:', err);
                }
            });
        }
        
        this.isPlaying = false;
        this.render();
        
        // Re-enable camera controls after closing media preview
        if (window.app && window.app.cameraControls) {
            window.app.cameraControls.enabled = true;
            console.log('🎵 Camera controls re-enabled after closing media preview');
        }
        
        // AUTO-ADVANCE: Only advance if shouldAutoAdvance is true (video ended naturally)
        if (shouldAutoAdvance) {
            // If preview was opened from path playback, advance to next
            if (this.mediaData && this.mediaData.activePathPlayback) {
                const pathId = this.mediaData.activePathPlayback;
                console.log(`🛤️ Media ended - auto-advancing path ${pathId}`);
                if (window.app?.pathManager) {
                    // Small delay to ensure preview cleanup is complete
                    setTimeout(() => {
                        window.app.pathManager.playNext(pathId);
                    }, 100);
                }
            }
            
            // If preview was opened from furniture playback, advance to next
            if (window.app?.activeFurniturePlayback) {
                // Get furniture data from stored context
            const furnitureId = this.furniturePlaybackContext?.furnitureId || window.app.activeFurniturePlayback?.furnitureId;
                console.log(`🪑 Media ended - auto-advancing furniture ${furnitureId}`);
                if (window.app.furnitureManager) {
                    // Small delay to ensure preview cleanup is complete
                    setTimeout(() => {
                        window.app.furnitureManager.playNext(furnitureId);
                    }, 100);
                }
            }
        } else {
            // User manually closed - stop playback
            console.log('🪑 User closed media preview - stopping playback');
        }
        
        // CRITICAL: Only clear activeFurniturePlayback if NOT in the middle of navigation
        // Check if activeFurniturePlayback points to THIS preview's object or a DIFFERENT object
        // If it points to a different object, we're navigating - preserve the context!
        if (window.app?.activeFurniturePlayback) {
            const currentPlaybackObjectId = window.app.activeFurniturePlayback.objectId;
            const thisObjectId = this.mediaData?.id || this.mediaData?.fileId || this.mediaData?.fileName;
            
            const isNavigating = currentPlaybackObjectId !== thisObjectId;
            
            if (!isNavigating) {
                // This preview matches the active playback - clear it since we're stopping
                window.app.activeFurniturePlayback = null;
                console.log('🪑 Cleared activeFurniturePlayback - stopping playback');
            } else {
                // Active playback points to a DIFFERENT object - we're navigating!
                console.log(`🪑 PRESERVING activeFurniturePlayback during navigation (current: ${currentPlaybackObjectId}, this: ${thisObjectId})`);
            }
        }
        
        console.log(`🎵 Media preview screen hidden`);
    }
    
    /**
     * Toggle visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Get the mesh for this screen
     */
    getMesh() {
        return this.mesh;
    }
    
    /**
     * Update screen position to follow object
     */
    updatePosition(objectMesh) {
        if (!this.mesh || !objectMesh) return;
        
        // Position screen floating above and behind object (just like contact info screen)
        const screenPosition = objectMesh.position.clone();
        screenPosition.z -= 3; // Behind object (negative Z)
        screenPosition.y += 10; // Well above ground level - floating higher for larger screen
        
        this.mesh.position.copy(screenPosition);
        
        // Make screen straight up (no angle) - same as contact info screen
        this.mesh.rotation.set(0, 0, 0);
    }
    
    /**
     * Open URL in external app (YouTube app, browser, etc.)
     * Uses the same method as link objects for consistency
     */
    openExternalURL(url, linkType = 'website') {
        try {
            console.log(`🎵 Opening external URL: ${url} (type: ${linkType})`);
            
            // Use Flutter channel for external browser/app opening
            if (window.ExternalUrlHandler) {
                console.log('🎵 Using Flutter ExternalUrlHandler');
                const message = JSON.stringify({
                    url: url,
                    linkType: linkType
                });
                window.ExternalUrlHandler.postMessage(message);
                console.log('🎵 URL sent to Flutter for external opening');
            } else if (window.linkInteractionManager && typeof window.linkInteractionManager.openURL === 'function') {
                // Fallback to link interaction manager if available
                console.log('🎵 Using LinkInteractionManager.openURL');
                window.linkInteractionManager.openURL(url, linkType);
            } else {
                // Last resort fallback to window.open
                console.warn('🎵 ExternalUrlHandler not available, using window.open fallback');
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.error('🎵 Error opening external URL:', error);
        }
    }
    
    /**
     * Cleanup when screen is destroyed
     */
    dispose() {
        // Stop any playing media
        if (this.mediaElement) {
            if (this.mediaElement.pause) {
                this.mediaElement.pause();
            }
            this.mediaElement = null;
        }
        
        // Remove HTML overlay
        if (this.mediaOverlay && this.mediaOverlay.parentNode) {
            this.mediaOverlay.parentNode.removeChild(this.mediaOverlay);
            this.mediaOverlay = null;
        }
        
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.texture.dispose();
        }
        
        console.log(`🎵 Media preview screen disposed`);
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MediaPreviewScreenClass;
}
