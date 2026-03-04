/**
 * Poster Interaction Module
 * Handles double-tap interactions on posters to set URLs and display thumbnails
 */

class PosterInteraction {
    constructor(THREE, scene, objects) {
        this.THREE = THREE;
        this.scene = scene;
        this.objects = objects;
        
        // Track poster URLs and states
        this.posterURLs = new Map();
        this.loadingStates = new Map();
        
        // Current world type for persistence
        this.currentWorldType = this.detectCurrentWorldType();
        
        // Initialize persistence channel
        this.initializePersistenceChannel();
        
        // Load saved poster URLs (remove early cleanup that interferes with link objects)
        this.loadSavedURLs();
        
        console.log(`🖼️ Poster interaction system initialized for world: ${this.currentWorldType}`);
    }

    /**
     * Detect current world type from scene or global state
     */
    detectCurrentWorldType() {
        // Try to get world type from various sources
        if (window.currentWorldType) {
            return window.currentWorldType;
        }
        
        if (window.app && window.app.currentWorld) {
            return window.app.currentWorld;
        }
        
        // Analyze scene to detect world type based on objects
        if (this.scene) {
            const sceneChildren = this.scene.children;
            
            // Look for world-specific indicators
            const hasBedroomIndicators = sceneChildren.some(child => 
                child.userData && (
                    child.userData.name && child.userData.name.toLowerCase().includes('bedroom') ||
                    child.userData.fileName && child.userData.fileName.toLowerCase().includes('bedroom') ||
                    child.userData.isPoster // Posters are primarily in bedroom world
                )
            );
            
            if (hasBedroomIndicators) {
                return 'dazzle';
            }
        }
        
        // Default fallback
        return 'dazzle';
    }

    /**
     * Initialize persistence channel communication
     */
    initializePersistenceChannel() {
        // Wait for persistence channel to be available
        const waitForChannel = () => {
            if (window.posterURLPersistenceChannel) {
                this.persistenceChannel = window.posterURLPersistenceChannel;
                console.log('🖼️ Connected to poster URL persistence channel');
            } else {
                setTimeout(waitForChannel, 100);
            }
        };
        waitForChannel();
    }

    /**
                  console.log('🧹 TARGETED: Requested cleanup of "Poster_undefined" link objects from Flutter');
            }
            
        } catch (error) {
            console.error('❌ Error during targeted Poster_undefined cleanup:', error);
        }
    }

    /**
     * Handle long press on poster to show URL input menu
     */
    handlePosterLongPress(poster) {
        console.log('🖼️ Long press detected on poster');
        
        // Check if poster has userData
        if (!poster.userData || !poster.userData.isPoster) {
            console.log('⚠️ Object is not a poster');
            return false;
        }

        this.showURLInputDialog(poster);
        return true;
    }

    /**
     * Handle double-tap on poster to open URL (like Link Objects)
     */
    handlePosterDoubleTap(poster) {
        console.log('🖼️ Double-tap detected on poster - opening URL');
        
        // Check if poster has userData
        if (!poster.userData || !poster.userData.isPoster) {
            console.log('⚠️ Object is not a poster');
            return false;
        }

        // Get the stored URL for this poster
        let posterURL = poster.userData.posterURL;
        
        // Handle case where posterURL might be an object with url property
        if (typeof posterURL === 'object' && posterURL.url) {
            posterURL = posterURL.url;
        }
        
        if (posterURL && typeof posterURL === 'string' && posterURL.trim() !== '') {
            console.log(`🖼️ Opening poster URL: ${posterURL}`);
            this.openPosterURL(posterURL);
            return true;
        } else {
            console.log('🖼️ No URL set for this poster, showing input dialog');
            // Fallback to showing the URL input dialog if no URL is set
            this.showURLInputDialog(poster);
            return true;
        }
    }

    /**
     * Open poster URL using the same method as Link Objects
     */
    openPosterURL(url) {
        try {
            console.log(`🖼️ Opening poster URL: ${url}`);
            console.log(`🖼️ URL type: ${typeof url}`);
            
            // Additional safety check - if url is an object, extract the url property
            let cleanUrl = url;
            if (typeof url === 'object' && url.url) {
                console.log('🖼️ URL is object, extracting url property');
                cleanUrl = url.url;
            } else if (typeof url === 'string' && url.startsWith('{')) {
                console.log('🖼️ URL appears to be stringified object, attempting to parse');
                try {
                    // First try standard JSON parsing
                    const parsed = JSON.parse(url);
                    if (parsed.url) {
                        cleanUrl = parsed.url;
                    }
                } catch (e) {
                    console.log('🖼️ Standard JSON parsing failed, trying manual extraction');
                    // Handle malformed JSON like: {url: https://..., savedAt: 123, posterType: type}
                    const urlMatch = url.match(/url:\s*([^,}]+)/);
                    if (urlMatch && urlMatch[1]) {
                        cleanUrl = urlMatch[1].trim();
                        console.log(`🖼️ Extracted URL via regex: ${cleanUrl}`);
                    } else {
                        console.warn('🖼️ Could not extract URL from malformed object string');
                    }
                }
            }
            
            console.log(`🖼️ Clean URL: ${cleanUrl}`);
            
            // Try using LinkInteractionManager first (if available)
            if (window.linkInteractionManager && typeof window.linkInteractionManager.openURL === 'function') {
                console.log('🖼️ Using LinkInteractionManager for poster URL');
                let linkType = 'website';
                if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
                    linkType = 'youtube';
                }
                window.linkInteractionManager.openURL(cleanUrl, linkType);
                return;
            }
            
            // Try using UrlLaunchHandler (same as basic Link Objects)
            if (window.UrlLaunchHandler) {
                console.log('🖼️ Using UrlLaunchHandler for poster URL');
                const messageData = { url: cleanUrl };
                window.UrlLaunchHandler.postMessage(JSON.stringify(messageData));
                console.log('🖼️ Poster URL sent to Flutter UrlLaunchHandler');
                return;
            }
            
            // Fallback to ExternalUrlHandler
            if (window.ExternalUrlHandler) {
                console.log('🖼️ Using Flutter ExternalUrlHandler for poster URL');
                
                let linkType = 'website';
                if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
                    linkType = 'youtube';
                }
                
                const message = JSON.stringify({
                    url: cleanUrl,
                    linkType: linkType
                });
                
                window.ExternalUrlHandler.postMessage(message);
                console.log('🖼️ Poster URL sent to Flutter for external opening');
                
            } else {
                console.warn('🖼️ No Flutter handlers available, falling back to window.open');
                
                // Fallback to window.open (may still open in WebView)
                const newWindow = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
                
                if (newWindow) {
                    console.log('🖼️ Poster URL opened with window.open fallback');
                } else {
                    console.warn('🖼️ window.open failed, trying link element fallback');
                    this.fallbackURLOpening(url);
                }
            }
            
        } catch (error) {
            console.error('🖼️ Error opening poster URL:', error);
            // Show user-friendly error
            this.showURLError(url);
        }
    }

    /**
     * Fallback URL opening method (same as Link Objects)
     */
    fallbackURLOpening(url) {
        try {
            console.log('🖼️ Attempting fallback URL opening for poster');
            
            // Create a temporary link element and click it
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            // Add to DOM, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('🖼️ Fallback URL opening completed for poster');
            
        } catch (error) {
            console.error('🖼️ Fallback URL opening failed for poster:', error);
        }
    }

    /**
     * Show error message for failed URL opening
     */
    showURLError(url) {
        console.error(`🖼️ Failed to open poster URL: ${url}`);
        // Could implement user notification here
    }

    /**
     * Show URL input dialog with custom modal
     */
    showURLInputDialog(poster) {
        const currentURL = this.posterURLs.get(poster.uuid) || '';
        
        this.createCustomModal(currentURL, (url) => {
            if (url !== null && url.trim() !== '') {
                this.setPosterURL(poster, url.trim());
            } else if (url === '') {
                // Clear the poster
                this.clearPoster(poster);
            }
        });
    }

    /**
     * Create custom modal dialog for URL input
     */
    createCustomModal(currentURL, callback) {
        // Remove existing modal if any
        const existingModal = document.getElementById('poster-url-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'poster-url-modal';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, #FFB6C1, #FF69B4);
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 90%;
            text-align: center;
            border: 3px solid #FF1493;
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = '🖼️ Set Poster URL';
        title.style.cssText = `
            color: white;
            margin: 0 0 20px 0;
            font-size: 24px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        `;

        // Instructions
        const instructions = document.createElement('p');
        instructions.textContent = 'Enter a YouTube URL, image link, or any other URL:';
        instructions.style.cssText = `
            color: white;
            margin: 0 0 20px 0;
            font-size: 16px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        `;

        // Input field
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentURL;
        input.placeholder = 'https://youtube.com/watch?v=... or image URL';
        input.style.cssText = `
            width: 100%;
            padding: 15px;
            border: 2px solid #FF1493;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 20px;
            box-sizing: border-box;
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
            background: #FF1493;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        `;

        // Clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear';
        clearButton.style.cssText = `
            background: #8B0000;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        `;

        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            background: #666;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        `;

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
     * Set URL for poster and attempt to load thumbnail
     */
    async setPosterURL(poster, url) {
        console.log(`🖼️ Setting poster URL: ${url}`);
        
        this.posterURLs.set(poster.uuid, url);
        this.loadingStates.set(poster.uuid, true);
        
        // Show loading state
        this.showLoadingState(poster);
        
        try {
            // Get thumbnail and apply to poster texture (keep poster as poster, don't create link object)
            const thumbnailData = await this.getThumbnailForURL(url);
            
            if (thumbnailData) {
                this.applyThumbnailToPoster(poster, thumbnailData, url);
            } else {
                // Fallback to URL display
                this.showURLFallback(poster, url);
            }

            // Save URL for persistence using link system (but don't create actual link object)
            this.savePosterURL(poster, url);
            
        } catch (error) {
            console.error('❌ Error loading thumbnail:', error);
            this.showURLFallback(poster, url);
        } finally {
            this.loadingStates.set(poster.uuid, false);
        }
    }

    /**
     * Save poster URL data using new persistence system
     */
    savePosterURL(poster, url) {
        try {
            // Create unique poster identifier based on position and type
            const posterType = this.generatePosterType(poster);
            
            console.log(`🖼️ Saving poster URL for ${this.currentWorldType}.${posterType}: ${url}`);
            
            // Save using Flutter persistence channel
            if (this.persistenceChannel) {
                this.persistenceChannel.saveSinglePosterURL(this.currentWorldType, posterType, url);
            }
            
            // Also maintain localStorage for immediate access and fallback
            const savedPosters = JSON.parse(localStorage.getItem('posterURLs') || '{}');
            const worldKey = `${this.currentWorldType}_${posterType}`;
            
            savedPosters[worldKey] = {
                url: url,
                position: {
                    x: poster.position.x,
                    y: poster.position.y,
                    z: poster.position.z
                },
                posterType: posterType,
                worldType: this.currentWorldType,
                savedAt: Date.now(),
                isPosterURL: true,
                excludeFromLinkCreation: true
            };
            
            localStorage.setItem('posterURLs', JSON.stringify(savedPosters));
            
            console.log(`🖼️ Poster URL saved for ${this.currentWorldType}.${posterType}`);
            
        } catch (error) {
            console.error('❌ Error saving poster URL:', error);
        }
    }

    /**
     * Generate consistent posterType identifier for a poster
     */
    generatePosterType(poster) {
        // Use existing posterType if available
        if (poster.userData && poster.userData.posterType) {
            return poster.userData.posterType;
        }
        
        // Generate based on position (rounded to avoid floating point issues)
        const x = Math.round(poster.position.x);
        const z = Math.round(poster.position.z);
        const y = Math.round(poster.position.y);
        
        // Create a consistent identifier
        let posterType = `poster_${x}_${z}`;
        if (y !== 0) {
            posterType += `_${y}`;
        }
        
        // Store the generated type in userData for future use
        if (poster.userData) {
            poster.userData.posterType = posterType;
        }
        
        return posterType;
    }

    /**
     * Get thumbnail data for URL
     */
    async getThumbnailForURL(url) {
        console.log(`🔍 Attempting to get thumbnail for: ${url}`);
        
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
        
        // Other URL types could be added here
        // For now, return null for unsupported URLs
        return null;
    }

    /**
     * Get YouTube thumbnail with improved fallback strategy
     */
    async getYouTubeThumbnail(videoId) {
        try {
            // Comprehensive fallback order: Start with most reliable formats
            const thumbnailConfigs = [
                { url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, quality: 'hq', reliable: true },         // 480x360 (most reliable)
                { url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, quality: 'mq', reliable: true },         // 320x180 (very reliable)
                { url: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`, quality: 'sd', reliable: true },         // 640x480 (good fallback)
                { url: `https://img.youtube.com/vi/${videoId}/0.jpg`, quality: '0', reliable: true },                  // 480x360 (alternative format)
                { url: `https://img.youtube.com/vi/${videoId}/1.jpg`, quality: '1', reliable: true },                  // 120x90 (thumbnail 1)
                { url: `https://img.youtube.com/vi/${videoId}/2.jpg`, quality: '2', reliable: true },                  // 120x90 (thumbnail 2)
                { url: `https://img.youtube.com/vi/${videoId}/3.jpg`, quality: '3', reliable: true },                  // 120x90 (thumbnail 3)
                { url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, quality: 'maxres', reliable: false }, // 1280x720 (best quality but often missing)
                { url: `https://img.youtube.com/vi/${videoId}/default.jpg`, quality: 'default', reliable: true }       // 120x90 (always exists)
            ];
            
            console.log(`🔍 Trying ${thumbnailConfigs.length} YouTube thumbnail formats for video: ${videoId}`);
            
            for (let i = 0; i < thumbnailConfigs.length; i++) {
                const config = thumbnailConfigs[i];
                console.log(`🎬 Attempt ${i + 1}/${thumbnailConfigs.length}: Trying ${config.quality} quality (${config.reliable ? 'reliable' : 'unreliable'}): ${config.url}`);
                
                const imageData = await this.loadImageFromURL(config.url);
                if (imageData) {
                    console.log(`✅ YouTube thumbnail loaded: ${config.url}`);
                    console.log(`🖼️ Successfully loaded ${config.quality} quality thumbnail for video ${videoId}`);
                    return { type: 'youtube', data: imageData, videoId: videoId, quality: config.quality };
                } else {
                    console.log(`❌ Failed to load ${config.quality} quality thumbnail (${config.url})`);
                }
            }
            
            console.warn(`⚠️ All ${thumbnailConfigs.length} YouTube thumbnail attempts failed for video: ${videoId}`);
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
                console.log(`✅ Direct image loaded: ${url}`);
                return { type: 'image', data: imageData };
            }
            return null;
        } catch (error) {
            console.error('❌ Error loading direct image:', error);
            return null;
        }
    }

    /**
     * Load image from URL using canvas proxy with improved error handling
     */
    loadImageFromURL(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            // Set a timeout to prevent hanging on slow/dead URLs
            const timeout = setTimeout(() => {
                console.log(`⏰ Timeout loading image: ${url}`);
                resolve(null);
            }, 8000); // 8 second timeout (increased from implicit browser timeout)
            
            img.onload = () => {
                clearTimeout(timeout);
                
                // Additional validation: Check if image actually loaded with valid dimensions
                if (img.width === 0 || img.height === 0) {
                    console.warn(`❌ Invalid image dimensions: ${img.width}x${img.height} for ${url}`);
                    resolve(null);
                    return;
                }
                
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = 512;
                    canvas.height = 288; // 16:9 aspect ratio
                    
                    // Draw image to fit canvas
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    console.log(`✅ Successfully processed image: ${img.width}x${img.height} -> ${canvas.width}x${canvas.height}`);
                    resolve(canvas);
                } catch (error) {
                    console.error(`❌ Error processing image ${url}:`, error);
                    resolve(null);
                }
            };
            
            img.onerror = (event) => {
                clearTimeout(timeout);
                console.log(`❌ Failed to load image: ${url} (network error or 404)`);
                resolve(null);
            };
            
            // Additional error handling for CORS and other issues
            img.onabort = () => {
                clearTimeout(timeout);
                console.log(`⚠️ Image loading aborted: ${url}`);
                resolve(null);
            };
            
            try {
                img.src = url;
            } catch (error) {
                clearTimeout(timeout);
                console.error(`❌ Error setting image src for ${url}:`, error);
                resolve(null);
            }
        });
    }

    /**
     * Apply thumbnail to poster
     */
    applyThumbnailToPoster(poster, thumbnailData, url) {
        console.log('🖼️ Applying thumbnail to poster');
        
        const texture = new this.THREE.CanvasTexture(thumbnailData.data);
        texture.needsUpdate = true;
        
        // Update poster material
        if (poster.material.map) {
            poster.material.map.dispose();
        }
        poster.material.map = texture;
        poster.material.needsUpdate = true;
        
        // Store URL info in userData
        poster.userData.posterURL = url;
        poster.userData.thumbnailType = thumbnailData.type;
        
        console.log(`✅ Thumbnail applied to poster: ${url}`);
    }

    /**
     * Show URL as text fallback
     */
    showURLFallback(poster, url) {
        console.log('🖼️ Showing URL text fallback');
        
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 288; // 16:9 aspect ratio
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Text
        ctx.fillStyle = '#FF1493';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🔗 URL SET', canvas.width/2, canvas.height/3);
        
        // URL (truncated)
        ctx.font = '16px Arial';
        const truncatedURL = url.length > 40 ? url.substring(0, 37) + '...' : url;
        ctx.fillText(truncatedURL, canvas.width/2, canvas.height/2);
        
        const texture = new this.THREE.CanvasTexture(canvas);
        
        if (poster.material.map) {
            poster.material.map.dispose();
        }
        poster.material.map = texture;
        poster.material.needsUpdate = true;
        
        poster.userData.posterURL = url;
        poster.userData.thumbnailType = 'text';
    }

    /**
     * Show loading state
     */
    showLoadingState(poster) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 288;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#DDA0DD';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', canvas.width/2, canvas.height/2);
        
        const texture = new this.THREE.CanvasTexture(canvas);
        
        if (poster.material.map) {
            poster.material.map.dispose();
        }
        poster.material.map = texture;
        poster.material.needsUpdate = true;
    }

    /**
     * Clear poster back to default
     */
    clearPoster(poster) {
        console.log('🗑️ Clearing poster');
        
        const posterType = this.generatePosterType(poster);
        const key = `${this.currentWorldType}_${posterType}`;
        
        // Remove URL tracking
        this.posterURLs.delete(key);
        this.loadingStates.delete(poster.uuid);
        
        // Clear from persistence
        if (this.persistenceChannel) {
            this.persistenceChannel.saveSinglePosterURL(this.currentWorldType, posterType, '');
        }
        
        // Clear from localStorage
        try {
            const saved = JSON.parse(localStorage.getItem('posterURLs') || '{}');
            delete saved[key];
            localStorage.setItem('posterURLs', JSON.stringify(saved));
        } catch (error) {
            console.error('❌ Error clearing from localStorage:', error);
        }
        
        // Reset userData
        delete poster.userData.posterURL;
        delete poster.userData.thumbnailType;
        poster.userData.posterType = posterType; // Keep posterType for future use
        
        // Show cleared state
        this.showClearedState(poster);
        
        console.log(`🗑️ Cleared poster ${posterType} from ${this.currentWorldType}`);
    }

    /**
     * Show cleared/default state
     */
    showClearedState(poster) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 288;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FF1493';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🖼️ POSTER', canvas.width/2, canvas.height/3);
        ctx.font = '20px Arial';
        ctx.fillText('Long press to set URL', canvas.width/2, canvas.height * 2/3);
        
        const texture = new this.THREE.CanvasTexture(canvas);
        
        if (poster.material.map) {
            poster.material.map.dispose();
        }
        poster.material.map = texture;
        poster.material.needsUpdate = true;
    }

    /**
     * Clean up only the specific "Poster_undefined" link objects that were incorrectly created
     * This is a very targeted cleanup that only removes objects with names exactly matching "Poster_undefined"
     * IMPORTANT: This should only be called manually when specifically needed, not during normal initialization
     * Call this method only if you see unwanted "Poster_undefined" link objects in your scene
     */
    cleanupLegacyPosterLinkObjects() {
        try {
            console.log('🧹 TARGETED cleanup: Only removing "Poster_undefined" link objects...');
            
            // ULTRA-TARGETED: Only remove objects that are EXACTLY "Poster_undefined" 
            // AND are specifically poster-related link objects (not legitimate link objects)
            if (this.scene && this.scene.children) {
                const objectsToRemove = [];
                this.scene.children.forEach(child => {
                    if (child.userData && 
                        // Must be EXACTLY "Poster_undefined" (case sensitive)
                        (child.userData.fileName === 'Poster_undefined' || 
                         child.userData.name === 'Poster_undefined') &&
                        // Additional safety: Check that it's actually a poster-generated link object
                        (child.userData.isPosterGenerated === true ||
                         (child.userData.fileData && child.userData.fileData.name === 'Poster_undefined'))) {
                        
                        console.log('🧹 TARGETED: Found Poster_undefined object to remove:', child.userData);
                        objectsToRemove.push(child);
                    }
                });
                
                objectsToRemove.forEach(obj => {
                    console.log('🧹 TARGETED: Removing "Poster_undefined" object from scene:', obj.userData);
                    this.scene.remove(obj);
                    
                    // Also remove from file objects array if it exists
                    if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
                        const index = window.app.stateManager.fileObjects.indexOf(obj);
                        if (index > -1) {
                            window.app.stateManager.fileObjects.splice(index, 1);
                            console.log('🧹 TARGETED: Removed from stateManager.fileObjects');
                        }
                    }
                });
                
                if (objectsToRemove.length > 0) {
                    console.log(`🧹 TARGETED: Removed ${objectsToRemove.length} "Poster_undefined" objects from scene`);
                } else {
                    console.log('🧹 TARGETED: No "Poster_undefined" objects found to remove');
                }
            }
            
            // Only notify Flutter if we actually found objects to clean up
            if (window.PosterLinkCleanupChannel) {
                window.PosterLinkCleanupChannel.postMessage(JSON.stringify({
                    action: 'cleanup_poster_undefined_only',
                    targetName: 'Poster_undefined',  // Only remove objects with this exact name
                    timestamp: Date.now()
                }));
                console.log('🧹 TARGETED: Requested cleanup of "Poster_undefined" link objects from Flutter');
            }
            
        } catch (error) {
            console.error('❌ Error during targeted Poster_undefined cleanup:', error);
        }
    }

    /**
     * Manual cleanup method that can be called from console if needed
     * Usage: window.posterInteraction.manualCleanupPosterUndefined()
     */
    manualCleanupPosterUndefined() {
        console.log('🧹 MANUAL: Starting targeted cleanup of Poster_undefined objects...');
        this.cleanupLegacyPosterLinkObjects();
    }

    /**
     * Load saved poster URLs from storage for current world
     */
    loadSavedURLs() {
        try {
            // Load from Flutter persistence if available
            if (this.persistenceChannel) {
                this.persistenceChannel.loadPosterURLsForWorld(this.currentWorldType, (success, data, error) => {
                    if (success && data) {
                        console.log(`🖼️ Loaded poster URLs from Flutter persistence for ${this.currentWorldType}:`, data);
                        this.processPersistenceData(data);
                    } else {
                        console.log(`🖼️ No Flutter persistence data for ${this.currentWorldType}, checking localStorage`);
                        this.loadFromLocalStorage();
                    }
                });
            } else {
                // Fallback to localStorage
                this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('❌ Error loading saved poster URLs:', error);
            this.loadFromLocalStorage();
        }
    }

    /**
     * Load from localStorage as fallback
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('posterURLs');
            if (saved) {
                const urlData = JSON.parse(saved);
                
                // Filter for current world type
                const worldSpecificData = {};
                Object.entries(urlData).forEach(([key, data]) => {
                    if (data.worldType === this.currentWorldType || key.startsWith(`${this.currentWorldType}_`)) {
                        worldSpecificData[key] = data;
                        // Also load into memory map for immediate access
                        if (data.url) {
                            this.posterURLs.set(key, data.url);
                        }
                    }
                });
                
                console.log(`🖼️ Loaded ${Object.keys(worldSpecificData).length} poster URLs from localStorage for ${this.currentWorldType}`);
            }
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error);
        }
    }

    /**
     * Process data received from Flutter persistence
     */
    processPersistenceData(data) {
        try {
            Object.entries(data).forEach(([posterType, urlData]) => {
                // Handle both string URLs and object data from persistence
                let url = urlData;
                if (typeof urlData === 'object' && urlData.url) {
                    url = urlData.url;
                }
                
                if (url && typeof url === 'string') {
                    const key = `${this.currentWorldType}_${posterType}`;
                    this.posterURLs.set(key, url);
                    console.log(`🖼️ Loaded ${posterType}: ${urlData}`);
                }
            });
        } catch (error) {
            console.error('❌ Error processing persistence data:', error);
        }
    }

    /**
     * Restore poster URLs after posters are created
     */
    async restorePosterURLs() {
        console.log(`🖼️ Attempting to restore poster URLs for world: ${this.currentWorldType}...`);
        
        try {
            // First, reload URLs from persistence to ensure we have the latest data
            console.log(`🖼️ Loading poster URLs from persistence for ${this.currentWorldType}...`);
            await this.loadSavedURLsAsync();
            
            // Find posters in the scene
            const posters = this.scene.children.filter(child => 
                child.userData && child.userData.isPoster
            );

            console.log(`🖼️ Found ${posters.length} posters in scene`);

            for (const poster of posters) {
                const posterType = this.generatePosterType(poster);
                const key = `${this.currentWorldType}_${posterType}`;
                
                // Check if we have a saved URL for this poster
                const savedURL = this.posterURLs.get(key);
                
                if (savedURL) {
                    console.log(`🖼️ Restoring URL for ${posterType}: ${savedURL}`);
                    
                    try {
                        const thumbnailData = await this.getThumbnailForURL(savedURL);
                        if (thumbnailData) {
                            this.applyThumbnailToPoster(poster, thumbnailData, savedURL);
                        } else {
                            this.showURLFallback(poster, savedURL);
                        }
                        
                        // Update poster userData
                        poster.userData.posterURL = savedURL;
                        poster.userData.posterType = posterType;
                        
                    } catch (error) {
                        console.warn(`⚠️ Could not load thumbnail for restored URL: ${savedURL}`, error);
                        this.showURLFallback(poster, savedURL);
                    }
                } else {
                    console.log(`🖼️ No saved URL found for ${posterType}`);
                    // Ensure posterType is set even if no URL
                    poster.userData.posterType = posterType;
                }
            }
        } catch (error) {
            console.error('❌ Error restoring poster URLs:', error);
        }
    }

    /**
     * Asynchronous version of loadSavedURLs that returns a Promise
     */
    async loadSavedURLsAsync() {
        return new Promise((resolve) => {
            try {
                // Load from Flutter persistence if available
                if (this.persistenceChannel) {
                    console.log(`🖼️ Requesting poster URLs from Flutter for ${this.currentWorldType}`);
                    this.persistenceChannel.loadPosterURLsForWorld(this.currentWorldType, (success, data, error) => {
                        if (success && data) {
                            console.log(`🖼️ ✅ Loaded poster URLs from Flutter persistence for ${this.currentWorldType}:`, data);
                            this.processPersistenceData(data);
                            resolve();
                        } else {
                            console.log(`🖼️ ⚠️ Failed to load from Flutter persistence (success: ${success}, error: ${error}), checking localStorage`);
                            this.loadFromLocalStorage();
                            resolve();
                        }
                    });
                } else {
                    console.log(`🖼️ ⚠️ Persistence channel not available, using localStorage for ${this.currentWorldType}`);
                    // Fallback to localStorage
                    this.loadFromLocalStorage();
                    resolve();
                }
            } catch (error) {
                console.error('❌ Error loading saved poster URLs:', error);
                this.loadFromLocalStorage();
                resolve();
            }
        });
    }

    /**
     * Update world type (called when switching worlds)
     */
    updateWorldType(newWorldType) {
        console.log(`🖼️ Switching from ${this.currentWorldType} to ${newWorldType}`);
        this.currentWorldType = newWorldType;
        
        // Clear current in-memory URLs
        this.posterURLs.clear();
        
        // Load URLs for new world
        this.loadSavedURLs();
    }

    /**
     * Load poster URLs from localStorage as fallback
     */
    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('posterURLs');
            if (savedData) {
                const urlData = JSON.parse(savedData);
                console.log(`🖼️ Loading poster URLs from localStorage:`, urlData);
                
                // Load URLs into the map
                for (const [key, url] of Object.entries(urlData)) {
                    this.posterURLs.set(key, url);
                }
                
                console.log(`🖼️ Loaded ${Object.keys(urlData).length} poster URLs from localStorage`);
            } else {
                console.log('🖼️ No poster URLs found in localStorage');
            }
        } catch (error) {
            console.error('❌ Error loading poster URLs from localStorage:', error);
        }
    }

    /**
     * Save poster URLs to storage
     */
    saveURLs() {
        try {
            const urlData = {};
            this.posterURLs.forEach((url, uuid) => {
                urlData[uuid] = url;
            });
            localStorage.setItem('posterURLs', JSON.stringify(urlData));
            console.log('🖼️ Poster URLs saved');
        } catch (error) {
            console.error('❌ Error saving poster URLs:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PosterInteraction;
} else if (typeof window !== 'undefined') {
    window.PosterInteraction = PosterInteraction;
}
