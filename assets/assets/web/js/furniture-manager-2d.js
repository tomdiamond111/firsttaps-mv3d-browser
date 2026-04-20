/**
 * FURNITURE MANAGER 2D
 * Manages the 2D view of furniture and media content
 */

(function() {
    'use strict';

    console.log('🪑 Loading Furniture Manager 2D...');

    class FurnitureManager2D {
        constructor() {
            this.furnitureData = [];
            this.fileObjectsData = [];
            this.init();
        }

        /**
         * Initialize the manager
         */
        async init() {
            console.log('🪑 Initializing 2D Furniture Manager...');
            await this.loadFurniture();
            await this.loadFileObjects();
            this.render();
        }

        /**
         * Load furniture data from parent window or localStorage
         */
        async loadFurniture() {
            console.log('🪑 Loading furniture data...');
            
            // Try to get from parent window first
            if (window.opener && window.opener.app && window.opener.app.furnitureManager) {
                try {
                    const manager = window.opener.app.furnitureManager;
                    if (manager.storageManager) {
                        this.furnitureData = manager.storageManager.getAllFurniture();
                        console.log(`🪑 Loaded ${this.furnitureData.length} furniture from parent window`);
                        return;
                    }
                } catch (error) {
                    console.warn('🪑 Could not access parent window furniture:', error);
                }
            }
            
            // Fallback to localStorage
            try {
                const stored = localStorage.getItem('mv3d_furniture_data');
                if (stored) {
                    this.furnitureData = JSON.parse(stored);
                    console.log(`🪑 Loaded ${this.furnitureData.length} furniture from localStorage`);
                } else {
                    console.log('🪑 No furniture data found in localStorage');
                    this.furnitureData = [];
                }
            } catch (error) {
                console.error('🪑 Error loading furniture from localStorage:', error);
                this.furnitureData = [];
            }
        }

        /**
         * Load file objects data from parent window
         */
        async loadFileObjects() {
            console.log('🪑 Loading file objects...');
            
            if (window.opener && window.opener.app && window.opener.app.stateManager) {
                try {
                    this.fileObjectsData = window.opener.app.stateManager.fileObjects || [];
                    console.log(`🪑 Loaded ${this.fileObjectsData.length} file objects from parent window`);
                } catch (error) {
                    console.warn('🪑 Could not access parent window file objects:', error);
                }
            }
        }

        /**
         * Get metadata for a specific object
         */
        async getObjectMetadata(objectId) {
            if (!objectId) return this.getEmptyMetadata();

            // Try to find in file objects from parent window
            const obj = this.fileObjectsData.find(o => 
                o.userData?.id === objectId || 
                o.userData?.fileId === objectId ||
                o.id === objectId
            );

            if (obj && obj.userData) {
                return this.extractMetadataFromUserData(obj.userData);
            }

            // Fallback: extract from object ID pattern
            return this.extractMetadataFromId(objectId);
        }

        /**
         * Extract metadata from userData object
         */
        extractMetadataFromUserData(userData) {
            const linkData = userData.linkData || {};
            
            // Get platform-specific metadata
            const youtubeMeta = userData.youtubeMetadata || {};
            const vimeoMeta = userData.vimeoMetadata || {};
            const tiktokMeta = userData.tiktokMetadata || {};
            const spotifyMeta = userData.spotifyMetadata || {};
            const instagramMeta = userData.instagramMetadata || {};
            
            return {
                name: userData.customName || 
                      youtubeMeta.title || 
                      vimeoMeta.title || 
                      tiktokMeta.title || 
                      spotifyMeta.title || 
                      instagramMeta.title ||
                      linkData.title || 
                      userData.fileName ||
                      'Unknown',
                thumbnail: youtubeMeta.thumbnail_url || 
                          vimeoMeta.thumbnailUrl || 
                          tiktokMeta.thumbnailUrl || 
                          spotifyMeta.thumbnailUrl || 
                          instagramMeta.thumbnailUrl ||
                          linkData.thumbnailUrl || 
                          null,
                artist: youtubeMeta.author_name || 
                       vimeoMeta.author || 
                       spotifyMeta.artist || 
                       tiktokMeta.author ||
                       instagramMeta.username ||
                       'Unknown',
                platform: this.detectPlatform(userData),
                url: linkData.url || userData.url || null,
                duration: youtubeMeta.duration || vimeoMeta.duration || null,
                views: youtubeMeta.viewCount || vimeoMeta.stats_number_of_plays || null
            };
        }

        /**
         * Detect platform from userData
         */
        detectPlatform(userData) {
            if (userData.youtubeMetadata?.videoId) return 'youtube';
            if (userData.vimeoMetadata?.video_id) return 'vimeo';
            if (userData.tiktokMetadata) return 'tiktok';
            if (userData.spotifyMetadata) return 'spotify';
            if (userData.instagramMetadata) return 'instagram';
            if (userData.linkData?.linkType) return userData.linkData.linkType;
            if (userData.fileType === 'audio') return 'audio';
            if (userData.fileType === 'video') return 'video';
            return 'link';
        }

        /**
         * Extract metadata from object ID pattern
         */
        extractMetadataFromId(objectId) {
            // Parse pattern: app_com.link.{platform}com.{timestamp}_{random}
            const match = objectId.match(/app_com\.link\.(\w+)com\./);
            if (match) {
                const platform = match[1];
                const displayNames = {
                    'youtube': 'YouTube Video',
                    'vimeo': 'Vimeo Video',
                    'tiktok': 'TikTok Video',
                    'spotify': 'Spotify Track',
                    'instagram': 'Instagram Reel'
                };
                
                return {
                    name: displayNames[platform] || 'Media',
                    thumbnail: null,
                    artist: 'Unknown',
                    platform: platform,
                    url: null
                };
            }
            
            return this.getEmptyMetadata();
        }

        /**
         * Get empty metadata object
         */
        getEmptyMetadata() {
            return {
                name: 'Unknown',
                thumbnail: null,
                artist: 'Unknown',
                platform: 'unknown',
                url: null
            };
        }

        /**
         * Render all furniture
         */
        async render() {
            const grid = document.getElementById('furniture-grid');
            if (!grid) {
                console.error('🪑 Furniture grid element not found');
                return;
            }

            grid.innerHTML = '';

            if (this.furnitureData.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🏗️</div>
                        <div class="empty-state-title">No Furniture Found</div>
                        <div class="empty-state-subtitle">Create furniture in 3D view to organize your media</div>
                    </div>
                `;
                return;
            }

            console.log(`🪑 Rendering ${this.furnitureData.length} furniture pieces`);
            
            for (const furniture of this.furnitureData) {
                const card = await this.createFurnitureCard(furniture);
                grid.appendChild(card);
            }
        }

        /**
         * Create a furniture card element
         */
        async createFurnitureCard(furniture) {
            const card = document.createElement('div');
            card.className = 'furniture-card';

            const objectCount = furniture.objectIds?.filter(id => id).length || 0;
            const capacity = furniture.capacity || 10;

            const header = document.createElement('div');
            header.className = 'furniture-header';
            header.innerHTML = `
                <div class="furniture-title">${this.escapeHtml(furniture.name)}</div>
                <div class="furniture-capacity">${objectCount}/${capacity}</div>
            `;

            const objectsList = document.createElement('div');
            objectsList.className = 'objects-list';

            // Load metadata for each object
            if (furniture.objectIds && furniture.objectIds.length > 0) {
                for (const objectId of furniture.objectIds) {
                    if (objectId) {
                        const metadata = await this.getObjectMetadata(objectId);
                        const objectCard = this.createObjectCard(metadata);
                        objectsList.appendChild(objectCard);
                    }
                }
            }

            if (objectCount === 0) {
                objectsList.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #666;">
                        Empty furniture - drag objects here in 3D view
                    </div>
                `;
            }

            card.appendChild(header);
            card.appendChild(objectsList);
            return card;
        }

        /**
         * Create an object card element
         */
        createObjectCard(metadata) {
            const card = document.createElement('div');
            card.className = 'object-card';

            const platformClass = metadata.platform.toLowerCase();
            
            card.innerHTML = `
                <img 
                    class="object-thumbnail" 
                    src="${metadata.thumbnail || this.getPlaceholderImage()}" 
                    alt="${this.escapeHtml(metadata.name)}"
                    onerror="this.src='${this.getPlaceholderImage()}'"
                >
                <div class="object-info">
                    <div class="object-name" title="${this.escapeHtml(metadata.name)}">
                        ${this.escapeHtml(metadata.name)}
                    </div>
                    <div class="object-artist">${this.escapeHtml(metadata.artist)}</div>
                    <span class="object-platform ${platformClass}">
                        ${this.getPlatformDisplayName(metadata.platform)}
                    </span>
                </div>
                <button class="play-button" onclick="openMedia('${this.escapeHtml(metadata.url)}', '${this.escapeHtml(metadata.platform)}')">
                    ▶️ Play
                </button>
            `;

            return card;
        }

        /**
         * Get platform display name
         */
        getPlatformDisplayName(platform) {
            const names = {
                'youtube': 'YouTube',
                'spotify': 'Spotify',
                'vimeo': 'Vimeo',
                'tiktok': 'TikTok',
                'instagram': 'Instagram',
                'soundcloud': 'SoundCloud',
                'audio': 'Audio',
                'video': 'Video',
                'link': 'Link'
            };
            
            return names[platform.toLowerCase()] || platform;
        }

        /**
         * Get placeholder image as data URL
         */
        getPlaceholderImage() {
            return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2240%22%3E🎵%3C/text%3E%3C/svg%3E';
        }

        /**
         * Escape HTML to prevent XSS
         */
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // ============================================================================
    // GLOBAL FUNCTIONS
    // ============================================================================

    /**
     * Switch to 3D view
     */
    window.switchTo3D = function() {
        console.log('🌍 Switching to 3D view');
        if (window.opener) {
            window.close();
        } else {
            window.location.href = 'index2.html';
        }
    };

    /**
     * Refresh furniture data
     */
    window.refreshFurniture = function() {
        console.log('🔄 Refreshing furniture...');
        if (window.manager) {
            window.manager.init();
        }
    };

    /**
     * Open media URL
     */
    window.openMedia = function(url, platform) {
        console.log(`📱 Opening ${platform}: ${url}`);
        
        if (!url || url === 'null' || url === 'undefined') {
            alert('No URL available for this item');
            return;
        }

        // Use platform URL handler if available
        if (window.PlatformURLHandler) {
            window.PlatformURLHandler.open(url, platform);
        } else {
            window.open(url, '_blank');
        }
    };

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    // Initialize manager when page loads
    window.addEventListener('DOMContentLoaded', () => {
        console.log('🪑 DOM loaded, creating FurnitureManager2D');
        window.manager = new FurnitureManager2D();
    });

    console.log('🪑 Furniture Manager 2D script loaded');

})();
