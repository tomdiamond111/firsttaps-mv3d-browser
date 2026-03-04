// modules/playback/youtubePlayerManager.js
// Dependencies: YouTube IFrame Player API, HTML5 Audio/Video
// Exports: window.UnifiedMediaPlayer

(function() {
    'use strict';
    
    console.log("Loading UnifiedMediaPlayer module...");
    
    // ============================================================================
    // UNIFIED MEDIA PLAYER - YouTube, MP3, MP4, Spotify Support
    // ============================================================================
    class UnifiedMediaPlayer {
        constructor() {
            // Player instances
            this.youtubePlayer = null;
            this.audioPlayer = null;
            this.videoPlayer = null;
            this.spotifyPlayer = null;
            
            // Current media state
            this.currentMediaType = null; // 'youtube', 'mp3', 'mp4', 'spotify'
            this.currentMediaId = null;
            this.playlist = [];
            this.currentIndex = 0;
            this.isMinimized = false;
            this.isPiPMode = false; // Start in expanded mode, user can minimize later
            this.isPlaying = false;
            this.playlistSource = null; // 'furniture' or 'path'
            this.playlistSourceId = null; // ID of furniture/path
            
            // Error tracking for fallback handling
            this.consecutiveErrors = 0;
            this.maxConsecutiveErrors = 3; // After 3 errors in a row, stop trying
            this.erroredMediaIds = new Set(); // Track which media have failed
            this.openedNativePreview = false; // Track if we opened native app (don't auto-advance)
            
            // UI elements
            this.container = null;
            this.playerElement = null;
            this.controls = null;
            
            // API ready flags
            this.youtubeApiReady = false;
            this.spotifyApiReady = false;
            
            console.log('🎵 UnifiedMediaPlayer initialized');
        }
        
        // ============================================================================
        // INITIALIZATION
        // ============================================================================
        
        /**
         * Initialize Unified Media Player
         */
        async initialize() {
            console.log('🎵 Initializing Unified Media Player...');
            
            // Create mini-player HTML structure
            this.createMiniPlayerHTML();
            
            // DEFERRED: Don't load YouTube API during initialization - load on-demand when first needed
            // This prevents blocking app startup
            if (window.YT) {
                this.youtubeApiReady = true;
            }
            
            // YouTube API will be loaded on-demand when first YouTube video is played
            // This prevents blocking during app initialization
            
            // Initialize HTML5 audio/video players
            this.initializeHTML5Players();
            
            console.log('✅ Unified Media Player initialized (YouTube API deferred)');
        }
        
        /**
         * Detect media type from URL or file extension
         */
        detectMediaType(url) {
            if (!url) return { type: 'unknown', player: null };
            
            const urlLower = url.toLowerCase();
            
            // YouTube detection
            if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
                return { type: 'youtube', player: 'iframe' };
            }
            
            // Spotify detection
            if (urlLower.includes('spotify.com')) {
                return { type: 'spotify', player: 'sdk' };
            }
            
            // Audio file extensions (expanded)
            if (urlLower.match(/\.(mp3|wav|ogg|m4a|aac|flac|wma|opus|amr|aiff)$/)) {
                return { type: 'audio', player: 'html5', extension: urlLower.match(/\.(\w+)$/)[1] };
            }
            
            // Video file extensions (expanded)
            if (urlLower.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|mpg|mpeg|3gp)$/)) {
                return { type: 'video', player: 'html5', extension: urlLower.match(/\.(\w+)$/)[1] };
            }
            
            return { type: 'unknown', player: null };
        }
        
        /**
         * Initialize HTML5 audio and video players
         */
        initializeHTML5Players() {
            // Audio player will be created on-demand
            // Video player will be created on-demand
            console.log('🎵 HTML5 players ready for on-demand creation');
        }
        
        /**
         * Load YouTube IFrame API script (on-demand)
         */
        loadYouTubeAPI() {
            return new Promise((resolve) => {
                // Already loaded
                if (this.youtubeApiReady) {
                    resolve();
                    return;
                }
                
                // Check if already loading
                if (window.onYouTubeIframeAPIReady) {
                    console.log('🎵 YouTube API already loading, waiting...');
                    const checkInterval = setInterval(() => {
                        if (this.youtubeApiReady) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                    return;
                }
                
                console.log('🎵 Loading YouTube IFrame API on-demand...');
                
                // Set up callback for when API is ready
                window.onYouTubeIframeAPIReady = () => {
                    console.log('✅ YouTube IFrame API ready');
                    this.youtubeApiReady = true;
                    resolve();
                };
                
                // Load the API script
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            });
        }
        
        /**
         * Create mini-player HTML structure
         */
        createMiniPlayerHTML() {
            console.log('🎵 Creating mini-player HTML...');
            
            const html = `
                <div id="youtube-mini-player" class="youtube-mini-player">
                    <div class="pip-compact-display">
                        <div class="pip-thumbnail">
                            <div class="pip-play-icon">▶</div>
                            <div class="pip-pause-icon">⏸</div>
                        </div>
                    </div>
                    <div class="mini-player-header">
                        <div class="track-info">
                            <span class="track-title">No track playing</span>
                            <span class="playlist-info"></span>
                        </div>
                        <button class="expand-to-preview-btn" title="Open in Preview">
                            <span>⛶</span>
                        </button>
                    </div>
                    
                    <div class="player-container">
                        <div id="youtube-player-iframe"></div>
                    </div>
                    
                    <div class="mini-player-controls">
                        <button class="control-btn prev-btn" title="Previous">⏮</button>
                        <button class="control-btn play-pause-btn" title="Play/Pause">
                            <span class="play-icon">▶</span>
                            <span class="pause-icon">⏸</span>
                        </button>
                        <button class="control-btn next-btn" title="Next">⏭</button>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <div class="time-display">
                                <span class="current-time">0:00</span>
                                <span class="duration">0:00</span>
                            </div>
                        </div>
                        <button class="control-btn close-btn" title="Close">✕</button>
                    </div>
                    
                    <div class="playlist-queue">
                        <div class="queue-header">Up Next</div>
                        <div class="queue-list"></div>
                    </div>
                </div>
            `;
            
            // Add to DOM
            document.body.insertAdjacentHTML('beforeend', html);
            
            // Get references
            this.container = document.getElementById('youtube-mini-player');
            this.playerElement = document.getElementById('youtube-player-iframe');
            
            // Add CSS styles
            this.addStyles();
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('✅ Mini-player HTML created');
        }
        
        /**
         * Add CSS styles for mini-player
         */
        addStyles() {
            const styleId = 'youtube-mini-player-styles';
            if (document.getElementById(styleId)) return;
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .youtube-mini-player {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(0, 0, 0, 0.95);
                    color: white;
                    z-index: 9999;
                    transition: all 0.3s ease;
                    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.5);
                    display: none;
                }
                
                .youtube-mini-player.active {
                    display: block;
                }
                
                /* Picture-in-Picture mode - small corner window */
                .youtube-mini-player.pip-mode {
                    top: 20px;
                    bottom: auto;
                    left: auto;
                    right: 20px;
                    width: 140px;
                    height: 90px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
                    cursor: pointer;
                    overflow: hidden;
                }
                
                .youtube-mini-player.pip-mode .mini-player-header,
                .youtube-mini-player.pip-mode .player-container,
                .youtube-mini-player.pip-mode .mini-player-controls,
                .youtube-mini-player.pip-mode .playlist-queue {
                    display: none;
                }
                
                .pip-compact-display {
                    display: none;
                    width: 100%;
                    height: 100%;
                    position: relative;
                }
                
                .youtube-mini-player.pip-mode .pip-compact-display {
                    display: block;
                }
                
                .pip-thumbnail {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                
                .pip-play-icon,
                .pip-pause-icon {
                    font-size: 36px;
                    color: white;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                }
                
                .pip-pause-icon {
                    display: none;
                }
                
                .youtube-mini-player.playing.pip-mode .pip-play-icon {
                    display: none;
                }
                
                .youtube-mini-player.playing.pip-mode .pip-pause-icon {
                    display: block;
                }
                
                /* Minimized mode - full width bottom bar */
                .youtube-mini-player.minimized {
                    height: 80px;
                }
                
                /* Expanded mode - larger player with video */
                .youtube-mini-player.expanded {
                    height: 300px;
                }
                
                .mini-player-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                .track-info {
                    flex: 1;
                    overflow: hidden;
                }
                
                .track-title {
                    display: block;
                    font-weight: bold;
                    font-size: 14px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .playlist-info {
                    display: block;
                    font-size: 11px;
                    color: #aaa;
                }
                
                .toggle-size-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 4px 8px;
                }
                
                .youtube-mini-player.minimized .minimize-icon,
                .youtube-mini-player.expanded .expand-icon {
                    display: none;
                }
                
                .player-container {
                    height: 180px;
                    background: black;
                    display: none;
                    position: relative;
                }
                
                .youtube-mini-player.expanded .player-container {
                    display: block;
                }
                
                #youtube-player-iframe {
                    width: 100%;
                    height: 100%;
                }
                
                .mini-player-controls {
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    gap: 12px;
                }
                
                .control-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                
                .control-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .control-btn:active {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                .play-pause-btn .pause-icon {
                    display: none;
                }
                
                .youtube-mini-player.playing .play-pause-btn .play-icon {
                    display: none;
                }
                
                .youtube-mini-player.playing .play-pause-btn .pause-icon {
                    display: block;
                }
                
                .progress-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .progress-bar {
                    height: 4px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 2px;
                    cursor: pointer;
                    position: relative;
                }
                
                .progress-fill {
                    height: 100%;
                    background: #ff0000;
                    border-radius: 2px;
                    width: 0%;
                    transition: width 0.1s linear;
                }
                
                .time-display {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    color: #aaa;
                }
                
                .close-btn {
                    width: 32px;
                    height: 32px;
                    font-size: 16px;
                }
                
                .playlist-queue {
                    display: none;
                    max-height: 0;
                    overflow-y: auto;
                    background: rgba(0, 0, 0, 0.5);
                }
                
                .youtube-mini-player.expanded .playlist-queue {
                    display: block;
                    max-height: 120px;
                }
                
                .queue-header {
                    padding: 8px 12px;
                    font-size: 12px;
                    font-weight: bold;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .queue-list {
                    padding: 4px 0;
                }
                
                .queue-item {
                    padding: 8px 12px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .queue-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .queue-item.current {
                    background: rgba(255, 0, 0, 0.2);
                    font-weight: bold;
                }
            `;
            
            document.head.appendChild(style);
        }
        
        /**
         * Set up event listeners for controls
         */
        setupEventListeners() {
            // Expand to preview button
            const expandToPreviewBtn = this.container.querySelector('.expand-to-preview-btn');
            expandToPreviewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.expandToMediaPreview();
            });
            
            // Play/Pause
            const playPauseBtn = this.container.querySelector('.play-pause-btn');
            playPauseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePlayPause();
            });
            
            // Previous
            const prevBtn = this.container.querySelector('.prev-btn');
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playPrevious();
            });
            
            // Next
            const nextBtn = this.container.querySelector('.next-btn');
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playNext();
            });
            
            // Close
            const closeBtn = this.container.querySelector('.close-btn');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
            });
            
            // Progress bar seek
            const progressBar = this.container.querySelector('.progress-bar');
            progressBar.addEventListener('click', (e) => {
                e.stopPropagation();
                this.seek(e);
            });
            
            console.log('✅ Event listeners set up');
        }
        
        /**
         * Initialize YouTube player
         */
        initializeYouTubePlayer() {
            if (!this.youtubeApiReady) {
                console.error('❌ YouTube API not ready');
                return;
            }
            
            console.log('🎵 Initializing YouTube player iframe...');
            
            this.youtubePlayer = new YT.Player('youtube-player-iframe', {
                height: '180',
                width: '100%',
                playerVars: {
                    autoplay: 0,
                    controls: 0, // Hide default controls
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    iv_load_policy: 3,
                    fs: 0,
                    playsinline: 1
                },
                events: {
                    onReady: (event) => this.onPlayerReady(event),
                    onStateChange: (event) => this.onPlayerStateChange(event),
                    onError: (event) => this.onPlayerError(event)
                }
            });
            
            // Start progress update loop
            this.startProgressUpdates();
            
            console.log('✅ YouTube player initialized');
        }
        
        /**
         * Create HTML5 audio player for MP3/audio files
         */
        createAudioPlayer(mediaUrl, trackInfo = {}) {
            console.log('🎵 Creating HTML5 audio player for:', mediaUrl);
            
            // Remove existing audio player if any
            if (this.audioPlayer) {
                this.audioPlayer.pause();
                this.audioPlayer.src = '';
                this.audioPlayer = null;
            }
            
            // Create new audio element
            this.audioPlayer = new Audio();
            this.audioPlayer.src = mediaUrl;
            this.audioPlayer.preload = 'metadata';
            
            // Event listeners
            this.audioPlayer.addEventListener('playing', () => {
                this.isPlaying = true;
                this.container.classList.add('playing');
                this.consecutiveErrors = 0;
                console.log('🎵 Audio playing');
            });
            
            this.audioPlayer.addEventListener('pause', () => {
                this.isPlaying = false;
                this.container.classList.remove('playing');
                console.log('🎵 Audio paused');
            });
            
            this.audioPlayer.addEventListener('ended', () => {
                this.isPlaying = false;
                this.container.classList.remove('playing');
                console.log('🎵 Audio ended - playing next');
                this.playNext();
            });
            
            // Note: Error handling moved to playAudioMedia() method
            
            this.audioPlayer.addEventListener('timeupdate', () => {
                this.updateProgressBar();
            });
            
            this.audioPlayer.addEventListener('loadedmetadata', () => {
                console.log('🎵 Audio metadata loaded, duration:', this.audioPlayer.duration);
            });
            
            console.log('✅ HTML5 audio player created');
            return this.audioPlayer;
        }
        
        /**
         * Create HTML5 video player for MP4/video files
         */
        createVideoPlayer(mediaUrl, trackInfo = {}) {
            console.log('🎵 Creating HTML5 video player for:', mediaUrl);
            
            // Remove existing video player if any
            if (this.videoPlayer) {
                this.videoPlayer.pause();
                this.videoPlayer.src = '';
                this.videoPlayer.remove();
                this.videoPlayer = null;
            }
            
            // Get player container
            const playerContainer = this.container.querySelector('.player-container');
            
            // Create video element
            this.videoPlayer = document.createElement('video');
            this.videoPlayer.id = 'html5-video-player';
            this.videoPlayer.style.width = '100%';
            this.videoPlayer.style.height = '100%';
            this.videoPlayer.style.backgroundColor = '#000';
            this.videoPlayer.preload = 'metadata';
            this.videoPlayer.playsInline = true;
            this.videoPlayer.src = mediaUrl;
            
            // Event listeners
            this.videoPlayer.addEventListener('playing', () => {
                this.isPlaying = true;
                this.container.classList.add('playing');
                this.consecutiveErrors = 0;
                console.log('🎵 Video playing');
            });
            
            this.videoPlayer.addEventListener('pause', () => {
                this.isPlaying = false;
                this.container.classList.remove('playing');
                console.log('🎵 Video paused');
            });
            
            this.videoPlayer.addEventListener('ended', () => {
                this.isPlaying = false;
                this.container.classList.remove('playing');
                console.log('🎵 Video ended - playing next');
                this.playNext();
            });
            
            // Note: Error handling moved to playVideoMedia() method
            
            this.videoPlayer.addEventListener('timeupdate', () => {
                this.updateProgressBar();
            });
            
            this.videoPlayer.addEventListener('loadedmetadata', () => {
                console.log('🎵 Video metadata loaded, duration:', this.videoPlayer.duration);
            });
            
            // Append to player container
            playerContainer.appendChild(this.videoPlayer);
            
            console.log('✅ HTML5 video player created');
            return this.videoPlayer;
        }
        
        /**
         * Fix MIME type in data URL based on original file extension
         * Flutter sends application/octet-stream but browser needs correct MIME type
         */
        fixDataUrlMimeType(dataUrl, originalUrl) {
            if (!dataUrl || !dataUrl.startsWith('data:')) {
                return dataUrl;
            }
            
            // Extract file extension from original URL
            const ext = originalUrl.split('.').pop().toLowerCase();
            
            // Map extensions to correct MIME types
            const mimeTypes = {
                // Audio
                'mp3': 'audio/mpeg',
                'wav': 'audio/wav',
                'ogg': 'audio/ogg',
                'm4a': 'audio/mp4',
                'aac': 'audio/aac',
                'flac': 'audio/flac',
                'wma': 'audio/x-ms-wma',
                'opus': 'audio/opus',
                'amr': 'audio/amr',
                'aiff': 'audio/aiff',
                // Video
                'mp4': 'video/mp4',
                'webm': 'video/webm',
                'mov': 'video/quicktime',
                'avi': 'video/x-msvideo',
                'mkv': 'video/x-matroska',
                'flv': 'video/x-flv',
                'wmv': 'video/x-ms-wmv',
                'mpg': 'video/mpeg',
                'mpeg': 'video/mpeg',
                '3gp': 'video/3gpp'
            };
            
            const correctMimeType = mimeTypes[ext];
            if (correctMimeType) {
                // Replace the MIME type in the data URL
                const fixed = dataUrl.replace(/^data:[^;,]+/, `data:${correctMimeType}`);
                console.log(`🔧 Fixed MIME type: application/octet-stream → ${correctMimeType}`);
                return fixed;
            }
            
            console.warn('⚠️ Unknown file extension for MIME type fix:', ext);
            return dataUrl;
        }
        
        // ============================================================================
        // PLAYER EVENTS
        // ============================================================================
        
        /**
         * Handle player ready event
         */
        onPlayerReady(event) {
            console.log('✅ YouTube player ready');
        }
        
        /**
         * Handle player state change
         */
        onPlayerStateChange(event) {
            console.log('🎵 Player state changed:', event.data);
            
            // YT.PlayerState: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
            switch (event.data) {
                case YT.PlayerState.PLAYING:
                    this.isPlaying = true;
                    this.container.classList.add('playing');
                    // Reset error counter on successful playback
                    this.consecutiveErrors = 0;
                    this.openedNativePreview = false; // Reset flag
                    break;
                    
                case YT.PlayerState.PAUSED:
                    this.isPlaying = false;
                    this.container.classList.remove('playing');
                    break;
                    
                case YT.PlayerState.ENDED:
                    this.isPlaying = false;
                    this.container.classList.remove('playing');
                    // Auto-play next track
                    this.playNext();
                    break;
            }
        }
        
        /**
         * Handle player error
         */
        onPlayerError(event) {
            const errorCode = event.data;
            console.error('❌ YouTube player error:', errorCode);
            
            // Error codes:
            // 2 = Invalid video ID
            // 5 = HTML5 player error
            // 100 = Video not found / removed
            // 101/150 = Embedding not allowed by video owner
            
            this.consecutiveErrors++;
            this.erroredMediaIds.add(this.currentMediaId);
            
            // Check if this is an embedding restriction (most common issue)
            const isEmbeddingRestricted = (errorCode === 150 || errorCode === 101);
            
            if (isEmbeddingRestricted) {
                console.warn('🚫 Video embedding restricted by owner:', this.currentMediaId);
                
                // Open in full media preview screen (native YouTube app)
                this.openInNativeApp(this.currentMediaId);
                
                // Set flag to prevent auto-advance
                this.openedNativePreview = true;
                return;
            }
            
            // If too many consecutive errors, stop trying
            if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
                console.error('❌ Too many consecutive errors, stopping playback');
                this.showErrorMessage('Unable to play media files. Some may have restrictions.');
                this.close();
                return;
            }
            
            // Skip to next track after delay
            setTimeout(() => this.playNext(), 1500);
        }
        
        /**
         * Open video in native YouTube app (fallback for embedding restrictions)
         */
        openInNativeApp(videoId) {
            // Find the original object that this video came from
            const currentTrack = this.playlist[this.currentIndex];
            if (!currentTrack) return;
            
            // Get object ID from track
            const objectId = currentTrack.objectId;
            if (!objectId) return;
            
            // Find the object mesh in scene
            let objectMesh = null;
            if (window.app?.stateManager?.fileObjects) {
                objectMesh = window.app.stateManager.fileObjects.find(obj => 
                    obj.userData.id === objectId ||
                    obj.userData.fileId === objectId ||
                    obj.userData.fileInfo?.path === objectId
                );
            }
            
            if (!objectMesh) {
                console.warn('🚫 Cannot open native app - object not found:', objectId);
                return;
            }
            
            console.log('📱 Opening in native YouTube app:', objectMesh.userData.fileName || videoId);
            
            // Use media preview manager to open in native app
            if (window.mediaPreviewManager) {
                // Minimize mini-player but keep playlist active
                this.isExpanded = false;
                this.container.classList.remove('expanded');
                
                // Open media preview (which will launch native app)
                window.mediaPreviewManager.togglePreview(objectMesh.userData, objectMesh);
                
                // Note: User will return to 3D world when they close the native app
                // The mini-player will still be visible and can continue playlist
            } else {
                console.warn('🚫 mediaPreviewManager not available');
            }
        }
        
        /**
         * Show error message to user
         */
        showErrorMessage(message) {
            // Update track title to show error
            const titleEl = this.container.querySelector('.track-title');
            if (titleEl) {
                titleEl.textContent = '⚠️ ' + message;
                titleEl.style.color = '#ff6b6b';
                
                // Reset after 5 seconds
                setTimeout(() => {
                    titleEl.style.color = '';
                }, 5000);
            }
        }
        
        // ============================================================================
        // PLAYBACK CONTROL
        // ============================================================================
        
        /**
         * Open video in native YouTube app (fallback for embedding restrictions)
         */
        openInNativeApp(videoId) {
            // Find the original object that this video came from
            const currentTrack = this.playlist[this.currentIndex];
            if (!currentTrack) return;
            
            // Get object ID from track
            const objectId = currentTrack.objectId;
            if (!objectId) return;
            
            // Find the object mesh in scene
            let objectMesh = null;
            if (window.app?.stateManager?.fileObjects) {
                objectMesh = window.app.stateManager.fileObjects.find(obj => 
                    obj.userData.id === objectId ||
                    obj.userData.fileId === objectId ||
                    obj.userData.fileInfo?.path === objectId
                );
            }
            
            if (!objectMesh) {
                console.warn('🚫 Cannot open native app - object not found:', objectId);
                return;
            }
            
            console.log('📱 Opening in native YouTube app:', objectMesh.userData.fileName || videoId);
            
            // Use media preview manager to open in native app
            if (window.mediaPreviewManager) {
                // Hide mini-player completely since we're not playing embedded content
                this.hide();
                
                // Open media preview (which will launch native app)
                window.mediaPreviewManager.togglePreview(objectMesh.userData, objectMesh);
                
                // Note: User will return to 3D world when they close the native app
                // The mini-player will remain hidden until Next/Prev is pressed
            } else {
                console.warn('🚫 mediaPreviewManager not available');
            }
        }
        
        /**
         * Show error message to user
         */
        showErrorMessage(message) {
            // Update track title to show error
            const titleEl = this.container.querySelector('.track-title');
            if (titleEl) {
                titleEl.textContent = '⚠️ ' + message;
                titleEl.style.color = '#ff6b6b';
                
                // Reset after 5 seconds
                setTimeout(() => {
                    titleEl.style.color = '';
                }, 5000);
            }
        }
        
        /**
         * Play media (unified method for all media types)
         */
        async playMedia(mediaUrl, trackInfo = {}) {
            console.log('🎵 Playing media:', mediaUrl);
            
            // Detect media type
            const mediaInfo = this.detectMediaType(mediaUrl);
            console.log('🎵 Detected media type:', mediaInfo.type);
            
            // Note: Local files (starting with '/') will be handled by playAudioMedia/playVideoMedia
            // which request data URLs from Flutter via requestMediaDataUrl()
            
            this.currentMediaId = mediaUrl;
            this.currentMediaType = mediaInfo.type;
            
            // Update UI
            this.updateTrackInfo(trackInfo);
            this.show();
            
            // Route to appropriate player (YouTube only for PiP now)
            switch (mediaInfo.type) {
                case 'youtube':
                    await this.playYouTubeMedia(mediaUrl, trackInfo);
                    break;
                case 'audio':
                    await this.playAudioMedia(mediaUrl, trackInfo);
                    break;
                case 'video':
                    await this.playVideoMedia(mediaUrl, trackInfo);
                    break;
                case 'spotify':
                    // TODO: Implement Spotify playback when dev account ready
                    console.warn('⚠️ Spotify playback not yet implemented');
                    this.showErrorMessage('Spotify playback coming soon!');
                    break;
                default:
                    console.error('❌ Unknown media type:', mediaUrl);
                    this.showErrorMessage('Unsupported media type');
                    this.playNext();
            }
        }
        
        /**
         * Play YouTube video
         */
        async playYouTubeMedia(url, trackInfo = {}) {
            // Extract video ID from URL
            const videoId = this.extractYouTubeVideoId(url);
            if (!videoId) {
                console.error('❌ Could not extract YouTube video ID from:', url);
                this.playNext();
                return;
            }
            
            // Lazy initialization: Load YouTube API on-demand if not loaded yet
            if (!this.youtubeApiReady) {
                console.log('🎵 Loading YouTube API on-demand for playback...');
                try {
                    await this.loadYouTubeAPI();
                    console.log('✅ YouTube API loaded successfully');
                } catch (error) {
                    console.error('❌ Failed to load YouTube API:', error);
                    this.showErrorMessage('Failed to load YouTube player');
                    this.playNext();
                    return;
                }
            }
            
            // Initialize YouTube player if not already initialized
            if (!this.youtubePlayer) {
                console.log('🎵 Initializing YouTube player on-demand...');
                this.initializeYouTubePlayer();
                
                // Wait for player to be ready before playing
                await new Promise((resolve) => {
                    const checkReady = setInterval(() => {
                        if (this.youtubePlayer && this.youtubePlayer.loadVideoById) {
                            clearInterval(checkReady);
                            resolve();
                        }
                    }, 100);
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        clearInterval(checkReady);
                        resolve();
                    }, 5000);
                });
            }
            
            console.log('🎵 Playing YouTube video:', videoId);
            this.youtubePlayer.loadVideoById(videoId);
        }
        
        /**
         * Play audio file
         */
        async playAudioMedia(url, trackInfo = {}) {
            console.log('🎵 Playing audio file:', url);
            
            // For local files, request data URL from Flutter
            let playableUrl = url;
            if (url && url.startsWith('/')) {
                console.log('🎵 Requesting data URL from Flutter for:', url);
                playableUrl = await this.requestMediaDataUrl(url);
                console.log('🎵 Received data URL from Flutter:', playableUrl ? `(length: ${playableUrl.length})` : 'NULL');
                
                // Handle Flutter response
                if (!playableUrl || playableUrl === 'OPEN_EXTERNAL') {
                    console.log('🎵 File opened externally or failed to load, skipping to next');
                    this.consecutiveErrors++;
                    this.erroredMediaIds.add(url);
                    this.playNext();
                    return;
                }
                
                // Fix MIME type in data URL (Flutter sends application/octet-stream)
                playableUrl = this.fixDataUrlMimeType(playableUrl, url);
            }
            
            // Hide YouTube player during audio playback (prevent error display)
            const playerContainer = this.container.querySelector('.player-container');
            if (playerContainer) {
                playerContainer.style.display = 'none';
            }
            
            // Create audio player if needed
            if (!this.audioPlayer) {
                this.audioPlayer = this.createAudioPlayer(playableUrl, trackInfo);
            } else {
                // Update source
                this.audioPlayer.src = playableUrl;
                this.audioPlayer.load(); // Reload the audio with new source
            }
            
            // Wait for audio to be ready, then play
            try {
                // Log data URL details for debugging
                if (playableUrl.startsWith('data:')) {
                    const mimeMatch = playableUrl.match(/^data:([^;,]+)/);
                    console.log('🎵 Data URL MIME type:', mimeMatch ? mimeMatch[1] : 'unknown');
                    console.log('🎵 Data URL length:', playableUrl.length);
                }
                
                // Wait for the loadeddata event (fires when media can start playing)
                await new Promise((resolve, reject) => {
                    const playTimeout = setTimeout(() => {
                        console.error('❌ Timeout waiting for audio to load (10s)');
                        reject(new Error('Timeout waiting for audio to load'));
                    }, 10000); // Increased to 10s for large data URLs
                    
                    const onLoadedData = () => {
                        clearTimeout(playTimeout);
                        this.audioPlayer.removeEventListener('loadeddata', onLoadedData);
                        this.audioPlayer.removeEventListener('error', onError);
                        console.log('✅ Audio data loaded, ready to play');
                        resolve();
                    };
                    
                    const onError = (e) => {
                        clearTimeout(playTimeout);
                        this.audioPlayer.removeEventListener('loadeddata', onLoadedData);
                        this.audioPlayer.removeEventListener('error', onError);
                        
                        // Log detailed error info
                        if (this.audioPlayer.error) {
                            console.error('❌ Audio element error code:', this.audioPlayer.error.code);
                            console.error('❌ Audio element error message:', this.audioPlayer.error.message);
                        }
                        console.error('❌ Audio load error event:', e);
                        reject(e);
                    };
                    
                    this.audioPlayer.addEventListener('loadeddata', onLoadedData, { once: true });
                    this.audioPlayer.addEventListener('error', onError, { once: true });
                    
                    // Trigger load
                    this.audioPlayer.load();
                });
                
                // Now try to play
                await this.audioPlayer.play();
                console.log('✅ Audio playing');
            } catch (error) {
                console.error('❌ Error playing audio:', error);
                this.consecutiveErrors++;
                this.erroredMediaIds.add(url);
                this.playNext();
            }
        }
        
        /**
         * Play video file
         */
        async playVideoMedia(url, trackInfo = {}) {
            console.log('� Playing video file:', url);
            
            // For local files, request data URL from Flutter
            let playableUrl = url;
            if (url && url.startsWith('/')) {
                console.log('🎬 Requesting data URL from Flutter for:', url);
                playableUrl = await this.requestMediaDataUrl(url);
                console.log('🎬 Received data URL from Flutter:', playableUrl ? `(length: ${playableUrl.length})` : 'NULL');
                
                // Handle Flutter response
                if (!playableUrl || playableUrl === 'OPEN_EXTERNAL') {
                    console.log('🎬 File opened externally or failed to load, skipping to next');
                    this.consecutiveErrors++;
                    this.erroredMediaIds.add(url);
                    this.playNext();
                    return;
                }
                
                // Fix MIME type in data URL (Flutter sends application/octet-stream)
                playableUrl = this.fixDataUrlMimeType(playableUrl, url);
            }
            
            // Create video player if needed
            if (!this.videoPlayer) {
                this.videoPlayer = this.createVideoPlayer(playableUrl, trackInfo);
            } else {
                // Update source
                this.videoPlayer.src = playableUrl;
                this.videoPlayer.load(); // Reload the video with new source
            }
            
            // Wait for video to be ready, then play
            try {
                // Log data URL details for debugging
                if (playableUrl.startsWith('data:')) {
                    const mimeMatch = playableUrl.match(/^data:([^;,]+)/);
                    console.log('🎬 Data URL MIME type:', mimeMatch ? mimeMatch[1] : 'unknown');
                    console.log('🎬 Data URL length:', playableUrl.length);
                }
                
                // Wait for the loadeddata event (fires when media can start playing)
                await new Promise((resolve, reject) => {
                    const playTimeout = setTimeout(() => {
                        console.error('❌ Timeout waiting for video to load (15s)');
                        reject(new Error('Timeout waiting for video to load'));
                    }, 15000); // Increased to 15s for large video data URLs
                    
                    const onLoadedData = () => {
                        clearTimeout(playTimeout);
                        this.videoPlayer.removeEventListener('loadeddata', onLoadedData);
                        this.videoPlayer.removeEventListener('error', onError);
                        console.log('✅ Video data loaded, ready to play');
                        resolve();
                    };
                    
                    const onError = (e) => {
                        clearTimeout(playTimeout);
                        this.videoPlayer.removeEventListener('loadeddata', onLoadedData);
                        this.videoPlayer.removeEventListener('error', onError);
                        
                        // Log detailed error info
                        if (this.videoPlayer.error) {
                            console.error('❌ Video element error code:', this.videoPlayer.error.code);
                            console.error('❌ Video element error message:', this.videoPlayer.error.message);
                        }
                        console.error('❌ Video load error event:', e);
                        reject(e);
                    };
                    
                    this.videoPlayer.addEventListener('loadeddata', onLoadedData, { once: true });
                    this.videoPlayer.addEventListener('error', onError, { once: true });
                    
                    // Trigger load
                    this.videoPlayer.load();
                });
                
                // Now try to play
                await this.videoPlayer.play();
                console.log('✅ Video playing');
            } catch (error) {
                console.error('❌ Error playing video:', error);
                this.consecutiveErrors++;
                this.erroredMediaIds.add(url);
                this.playNext();
            }
        }
        
        /**
         * Request media data URL from Flutter for local files
         */
        async requestMediaDataUrl(filePath) {
            return new Promise((resolve) => {
                // Set up callback for Flutter response
                window.mediaFileDataCallback = (receivedPath, dataUrl) => {
                    if (receivedPath === filePath) {
                        // Check if Flutter is opening file externally (for files >50MB)
                        if (dataUrl === 'OPEN_EXTERNAL') {
                            console.log('🎵 Large file opened in external app:', receivedPath);
                            resolve('OPEN_EXTERNAL');
                        } else {
                            console.log('🎵 Received media data URL for:', receivedPath);
                            resolve(dataUrl);
                        }
                        // Clean up callback
                        delete window.mediaFileDataCallback;
                    }
                };
                
                // Determine extension from file path
                const extension = filePath.split('.').pop().toLowerCase();
                
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
         * Extract YouTube video ID from URL
         */
        extractYouTubeVideoId(url) {
            const patterns = [
                /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
                /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
                /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
                /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }
            
            return null;
        }
        
        /**
         * Play a video by ID (backward compatibility for YouTube)
         */
        async playVideo(videoId, trackInfo = {}) {
            if (!this.youtubePlayer) {
                console.error('❌ Player not initialized');
                return;
            }
            
            console.log('🎵 Playing video:', videoId);
            
            this.currentMediaId = videoId;
            this.currentMediaType = 'youtube';
            
            // Update UI
            this.updateTrackInfo(trackInfo);
            this.show();
            
            // Load and play video
            this.youtubePlayer.loadVideoById(videoId);
        }
        
        /**
         * Play playlist from furniture or path
         */
        async playPlaylist(playlist, source, sourceId, startIndex = 0) {
            console.log('🎵 Playing playlist:', { source, sourceId, tracks: playlist.length, startIndex });
            
            this.playlist = playlist;
            this.playlistSource = source;
            this.playlistSourceId = sourceId;
            this.currentIndex = startIndex;
            
            // Reset error tracking for new playlist
            this.consecutiveErrors = 0;
            this.erroredMediaIds.clear();
            this.openedNativePreview = false;
            
            // Update queue display
            this.updateQueueDisplay();
            
            // Play starting track
            if (playlist.length > 0) {
                const firstTrack = playlist[this.currentIndex];
                // Use mediaUrl (unified) or fallback to videoId (backward compat)
                const mediaUrl = firstTrack.mediaUrl || firstTrack.videoId;
                await this.playMedia(mediaUrl, firstTrack);
            }
        }
        
        /**
         * Toggle play/pause
         */
        togglePlayPause() {
            if (this.currentMediaType === 'youtube' && this.youtubePlayer) {
                if (this.isPlaying) {
                    this.youtubePlayer.pauseVideo();
                } else {
                    this.youtubePlayer.playVideo();
                }
            } else if (this.currentMediaType === 'audio' && this.audioPlayer) {
                if (this.isPlaying) {
                    this.audioPlayer.pause();
                } else {
                    this.audioPlayer.play();
                }
            } else if (this.currentMediaType === 'video' && this.videoPlayer) {
                if (this.isPlaying) {
                    this.videoPlayer.pause();
                } else {
                    this.videoPlayer.play();
                }
            }
        }
        
        /**
         * Play next track (skips already-errored videos)
         */
        playNext() {
            if (this.playlist.length === 0) return;
            
            const startIndex = this.currentIndex;
            let attempts = 0;
            
            // Find next track that hasn't errored
            do {
                this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
                attempts++;
                
                // If we've checked all tracks, stop
                if (attempts >= this.playlist.length) {
                    console.warn('⚠️ All tracks in playlist have errors or are restricted');
                    this.showErrorMessage('All media files have errors');
                    return;
                }
                
                // If back to start, we've looped through all
                if (this.currentIndex === startIndex && attempts > 1) {
                    console.warn('⚠️ Reached end of playlist');
                    // Reset error tracking for fresh attempt
                    this.erroredMediaIds.clear();
                    this.consecutiveErrors = 0;
                }
                
                const currentTrack = this.playlist[this.currentIndex];
                const mediaUrl = currentTrack.mediaUrl || currentTrack.videoId;
                
            } while (this.erroredMediaIds.has(this.playlist[this.currentIndex].mediaUrl || this.playlist[this.currentIndex].videoId));
            
            const nextTrack = this.playlist[this.currentIndex];
            const mediaUrl = nextTrack.mediaUrl || nextTrack.videoId;
            console.log('⏭️ Playing next track:', nextTrack.title);
            
            this.playMedia(mediaUrl, nextTrack);
            this.updateQueueDisplay();
        }
        
        /**
         * Play previous track
         */
        playPrevious() {
            if (this.playlist.length === 0) return;
            
            this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
            const prevTrack = this.playlist[this.currentIndex];
            const mediaUrl = prevTrack.mediaUrl || prevTrack.videoId;
            console.log('⏮️ Playing previous track:', prevTrack.title);
            
            this.playMedia(mediaUrl, prevTrack);
            this.updateQueueDisplay();
        }
        
        /**
         * Seek to position
         */
        seek(event) {
            const progressBar = event.currentTarget;
            const rect = progressBar.getBoundingClientRect();
            const percent = (event.clientX - rect.left) / rect.width;
            
            if (this.currentMediaType === 'youtube' && this.youtubePlayer) {
                const duration = this.youtubePlayer.getDuration();
                const seekTime = duration * percent;
                this.youtubePlayer.seekTo(seekTime, true);
            } else if (this.currentMediaType === 'audio' && this.audioPlayer) {
                const seekTime = this.audioPlayer.duration * percent;
                this.audioPlayer.currentTime = seekTime;
            } else if (this.currentMediaType === 'video' && this.videoPlayer) {
                const seekTime = this.videoPlayer.duration * percent;
                this.videoPlayer.currentTime = seekTime;
            }
        }
        
        // ============================================================================
        // UI UPDATES
        // ============================================================================
        
        /**
         * Update track info display
         */
        updateTrackInfo(trackInfo) {
            const titleEl = this.container.querySelector('.track-title');
            const playlistEl = this.container.querySelector('.playlist-info');
            
            titleEl.textContent = trackInfo.title || 'Unknown Track';
            
            let playlistText = '';
            if (this.playlistSource && this.playlistSourceId) {
                playlistText = `${this.playlistSource === 'furniture' ? '🪑' : '🛤️'} ${this.playlistSourceId}`;
                if (this.playlist.length > 0) {
                    playlistText += ` • ${this.currentIndex + 1}/${this.playlist.length}`;
                }
            }
            playlistEl.textContent = playlistText;
        }
        
        /**
         * Update queue display
         */
        updateQueueDisplay() {
            const queueList = this.container.querySelector('.queue-list');
            queueList.innerHTML = '';
            
            // Show next 5 tracks
            const upcomingTracks = this.playlist.slice(this.currentIndex + 1, this.currentIndex + 6);
            
            upcomingTracks.forEach((track, index) => {
                const item = document.createElement('div');
                item.className = 'queue-item';
                item.textContent = `${index + 1}. ${track.title}`;
                item.addEventListener('click', () => {
                    this.currentIndex = this.currentIndex + index + 1;
                    this.playVideo(track.videoId, track);
                    this.updateQueueDisplay();
                });
                queueList.appendChild(item);
            });
        }
        
        /**
         * Start progress bar updates
         */
        startProgressUpdates() {
            setInterval(() => {
                this.updateProgressBar();
            }, 500);
        }
        
        /**
         * Update progress bar for current media type
         */
        updateProgressBar() {
            if (!this.isPlaying) return;
            
            try {
                let currentTime = 0;
                let duration = 0;
                
                if (this.currentMediaType === 'youtube' && this.youtubePlayer) {
                    currentTime = this.youtubePlayer.getCurrentTime();
                    duration = this.youtubePlayer.getDuration();
                } else if (this.currentMediaType === 'audio' && this.audioPlayer) {
                    currentTime = this.audioPlayer.currentTime;
                    duration = this.audioPlayer.duration;
                } else if (this.currentMediaType === 'video' && this.videoPlayer) {
                    currentTime = this.videoPlayer.currentTime;
                    duration = this.videoPlayer.duration;
                } else {
                    return;
                }
                
                if (duration > 0) {
                    const percent = (currentTime / duration) * 100;
                    const progressFill = this.container.querySelector('.progress-fill');
                    progressFill.style.width = `${percent}%`;
                    
                    // Update time display
                    const currentTimeEl = this.container.querySelector('.current-time');
                    const durationEl = this.container.querySelector('.duration');
                    
                    currentTimeEl.textContent = this.formatTime(currentTime);
                    durationEl.textContent = this.formatTime(duration);
                }
            } catch (e) {
                // Player not ready or error
            }
        }
        
        /**
         * Format time in MM:SS
         */
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        
        /**
         * Toggle minimize/expand
         */
        toggleSize() {
            // If in PiP mode, exit to minimized mode
            if (this.isPiPMode) {
                this.exitPiPMode();
                return;
            }
            
            this.isMinimized = !this.isMinimized;
            
            if (this.isMinimized) {
                this.container.classList.remove('expanded');
                this.container.classList.add('minimized');
            } else {
                this.container.classList.remove('minimized');
                this.container.classList.add('expanded');
            }
        }
        
        /**
         * Enter Picture-in-Picture mode (small corner window)
         */
        enterPiPMode() {
            this.isPiPMode = true;
            this.container.classList.add('pip-mode');
            this.container.classList.remove('minimized', 'expanded');
            console.log('📱 Entered PiP mode');
        }
        
        /**
         * Exit Picture-in-Picture mode to minimized bar
         */
        exitPiPMode() {
            this.isPiPMode = false;
            this.isMinimized = true;
            this.container.classList.remove('pip-mode');
            this.container.classList.add('minimized');
            console.log('📱 Exited PiP mode to minimized');
        }
        
        /**
         * Expand PiP player to media preview screen
         */
        expandToMediaPreview() {
            console.log('🎵 Expanding PiP to media preview screen...');
            
            // Get current playback state
            const currentTime = this.audioPlayer?.currentTime || this.videoPlayer?.currentTime || 0;
            const isPaused = this.audioPlayer?.paused || this.videoPlayer?.paused || false;
            const mediaUrl = this.currentMediaId;
            const trackInfo = {
                title: this.container.querySelector('.track-title')?.textContent || 'Media',
                artist: '',
                albumArt: ''
            };
            
            // CRITICAL: Stop PiP media playback BEFORE hiding
            if (this.audioPlayer) {
                this.audioPlayer.pause();
                console.log('🎵 Paused PiP audio player before expansion');
            }
            if (this.videoPlayer) {
                this.videoPlayer.pause();
                console.log('🎵 Paused PiP video player before expansion');
            }
            
            // Hide PiP player
            this.hide();
            
            // Open in media preview manager
            if (window.mediaPreviewManager && mediaUrl) {
                console.log('🎵 Opening media preview with:', {mediaUrl, currentTime, isPaused});
                
                // Create media data object
                const mediaData = {
                    url: mediaUrl,
                    path: mediaUrl,
                    id: mediaUrl,
                    name: trackInfo.title,
                    fileName: trackInfo.title,
                    extension: this.currentMediaType === 'audio' ? '.mp3' : '.mp4',
                    // Preserve furniture/path playback context
                    activeFurniturePlayback: window.app?.activeFurniturePlayback,
                    activePathPlayback: this.playlistSource === 'path' ? this.playlistSourceId : null
                };
                
                // Create a dummy mesh object for the preview manager (with position to prevent clone errors)
                const dummyMesh = {
                    userData: mediaData,
                    position: {
                        x: 0,
                        y: 0,
                        z: 0,
                        clone: function() { return this; }
                    }
                };
                
                // Toggle preview (will create if doesn't exist)
                window.mediaPreviewManager.togglePreview(mediaData, dummyMesh);
                
                // Wait for media element to be created, then restore playback state
                setTimeout(() => {
                    const preview = window.mediaPreviewManager.getActivePreview();
                    if (preview && preview.mediaElement) {
                        if (currentTime > 0) {
                            preview.mediaElement.currentTime = currentTime;
                        }
                        if (!isPaused) {
                            preview.mediaElement.play().catch(err => console.log('🎵 Autoplay blocked:', err));
                        }
                        console.log('🎵 Restored playback state in media preview:', {currentTime, isPaused});
                    }
                }, 500);
            } else {
                console.warn('🎵 Cannot expand to preview - mediaPreviewManager not available');
            }
        }
        
        /**
         * Show mini-player (starts in PiP mode)
         */
        show() {
            this.container.classList.add('active');
            // Start in expanded mode by default - user can minimize if desired
            // Don't auto-enter PiP mode
        }
        
        /**
         * Hide mini-player
         */
        hide() {
            this.container.classList.remove('active');
        }
        
        /**
         * Close and stop playback
         */
        close() {
            // Stop all players
            if (this.youtubePlayer) {
                this.youtubePlayer.stopVideo();
            }
            if (this.audioPlayer) {
                this.audioPlayer.pause();
                this.audioPlayer.src = '';
            }
            if (this.videoPlayer) {
                this.videoPlayer.pause();
                this.videoPlayer.src = '';
            }
            
            this.hide();
            this.isPlaying = false;
            this.playlist = [];
            this.currentIndex = 0;
            this.currentMediaType = null;
            this.currentMediaId = null;
        }
    }
    
    // Create global instance
    window.UnifiedMediaPlayer = new UnifiedMediaPlayer();
    
    // Backward compatibility alias
    window.YouTubePlayerManager = window.UnifiedMediaPlayer;
    
    console.log("✅ UnifiedMediaPlayer module loaded");
})();
