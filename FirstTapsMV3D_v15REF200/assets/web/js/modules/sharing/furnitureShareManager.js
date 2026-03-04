/**
 * FURNITURE SHARE MANAGER
 * Handles serialization and URL generation for sharing furniture playlists
 * 
 * Features:
 * - Serializes furniture data, positions, objects
 * - Compresses using LZ-String
 * - Generates shareable URLs with encoded data
 * - Filters out local media files (MP3/MP4) that can't be shared
 * - Preserves YouTube/Vimeo/web links with thumbnails
 */

(function() {
    'use strict';

    console.log('🔗 Loading Furniture Share Manager...');

    class FurnitureShareManager {
        constructor(app) {
            this.app = app;
            this.scene = app.scene;
            this.furnitureManager = app.furnitureManager;
            
            // Base URL for the viewer - deployed on GitHub Pages
            this.viewerBaseUrl = 'https://tomdiamond111.github.io/furniture-playlist-viewer/';
            
            console.log(`🔗 FurnitureShareManager created - viewer URL: ${this.viewerBaseUrl}`);
        }

        /**
         * Generate shareable URL for a specific furniture piece
         * @param {string} furnitureId - ID of furniture to share
         * @returns {Object} - {url, warning, stats} or {error}
         */
        shareFurniture(furnitureId) {
            try {
                const furniture = this.furnitureManager.storageManager.getFurniture(furnitureId);
                if (!furniture) {
                    return { error: 'Furniture not found' };
                }

                console.log(`🔗 Generating share link for furniture: ${furniture.name}`);

                // Serialize furniture data
                const shareData = this.serializeFurniture(furniture);
                
                // Generate statistics
                const stats = {
                    totalObjects: shareData.objects.length,
                    youtubeObjects: shareData.objects.filter(o => o.domain === 'youtube.com').length,
                    vimeoObjects: shareData.objects.filter(o => o.domain === 'vimeo.com').length,
                    webLinkObjects: shareData.objects.filter(o => o.isWebLink && o.domain !== 'youtube.com' && o.domain !== 'vimeo.com').length,
                    excludedLocalMedia: shareData.excludedCount
                };

                console.log('📊 Share statistics:', stats);

                // Compress data
                const compressed = this.compressData(shareData);
                console.log(`🗜️ Compression: ${JSON.stringify(shareData).length} → ${compressed.length} bytes`);

                // Return just the compressed base64 data (Flutter will upload to GitHub Gist or Hastebin)
                // The viewer will receive this base64 directly from the paste service
                const shareUrl = compressed; // Just the base64, not the full URL
                
                // Warning if local media was excluded
                const warning = shareData.excludedCount > 0 
                    ? `${shareData.excludedCount} local media file(s) excluded (recipients cannot access local MP3/MP4 files)`
                    : null;

                return {
                    url: shareUrl,
                    warning,
                    stats,
                    furnitureName: furniture.name,
                    furnitureType: furniture.type
                };

            } catch (error) {
                console.error('❌ Error generating share link:', error);
                return { error: error.message };
            }
        }

        /**
         * Serialize furniture and its objects into shareable format
         * @param {Furniture} furniture - Furniture object to serialize
         * @returns {Object} - Serialized data
         */
        serializeFurniture(furniture) {
            const objects = [];
            let excludedCount = 0;

            console.log(`🔗 Serializing furniture: ${furniture.name} (ID: ${furniture.id})`);
            console.log(`🔗 Furniture has ${furniture.objectIds.length} object slots`);
            console.log(`🔗 Object IDs:`, furniture.objectIds);

            // Get furniture visual group for object data
            const furnitureGroup = this.furnitureManager.visualManager.getFurnitureGroup(furniture.id);

            // Process each object on the furniture
            for (let slotIndex = 0; slotIndex < furniture.objectIds.length; slotIndex++) {
                const objectId = furniture.objectIds[slotIndex];
                if (!objectId) {
                    console.log(`🔗 Slot ${slotIndex}: Empty`);
                    continue; // Empty slot
                }

                console.log(`🔗 Slot ${slotIndex}: Looking for object ${objectId}...`);
                const objectMesh = this.findObjectById(objectId);
                if (!objectMesh) {
                    console.warn(`⚠️ Object ${objectId} not found in scene`);
                    continue;
                }

                console.log(`✅ Slot ${slotIndex}: Found object ${objectId}`);
                const userData = objectMesh.userData;
                
                // Check if this is a local media file (can't be shared)
                if (this.isLocalMediaFile(userData)) {
                    console.log(`🚫 Excluding local media: ${userData.fileName}`);
                    excludedCount++;
                    
                    // Include as placeholder with thumbnail only
                    objects.push({
                        slotIndex,
                        isLocalMedia: true,
                        name: userData.fileName || 'Local Media',
                        thumbnailDataUrl: this.extractThumbnail(objectMesh) // Try to get thumbnail for preview
                    });
                    continue;
                }

                // Serialize shareable object data
                const objectData = this.serializeObject(objectMesh, slotIndex);
                if (objectData) {
                    console.log(`✅ Serialized object at slot ${slotIndex}:`, objectData.name);
                    objects.push(objectData);
                }
            }

            console.log(`🔗 Serialization complete: ${objects.length} objects, ${excludedCount} excluded`);

            // Build share data structure
            const shareData = {
                version: '1.0',
                furniture: {
                    id: furniture.id,
                    type: furniture.type,
                    name: furniture.name,
                    style: furniture.style,
                    position: furniture.position,
                    rotation: furniture.rotation,
                    capacity: furniture.capacity,
                    autoSort: furniture.autoSort,
                    sortCriteria: furniture.sortCriteria,
                    sortDirection: furniture.sortDirection
                },
                world: {
                    type: this.app.currentWorldTemplate ? this.app.currentWorldTemplate.getType() : 'green-plane',
                    name: this.getWorldDisplayName()
                },
                objects,
                excludedCount,
                createdAt: new Date().toISOString()
            };

            return shareData;
        }

        /**
         * Serialize an object for sharing
         * @param {THREE.Object3D} objectMesh - Object mesh
         * @param {number} slotIndex - Slot index on furniture
         * @returns {Object|null} - Serialized object data
         */
        serializeObject(objectMesh, slotIndex) {
            const userData = objectMesh.userData;
            const linkData = userData.linkData || {};
            const fileData = userData.fileData || {};

            // Extract URL from various possible locations (include path for demo files)
            const path = userData.path || linkData.path || fileData.path || '';
            const url = linkData.url || fileData.url || userData.url || path;
            if (!url) {
                console.warn(`⚠️ No URL found for object ${userData.id}`);
                return null;
            }

            // Determine if this is a web link
            const isWebLink = url.startsWith('http://') || url.startsWith('https://');
            
            // Check if this is a demo file
            const isDemoFile = url.startsWith('assets/demomedia/') || userData.isDemoContent === true;
            
            // Extract domain
            const domain = this.extractDomain(url);

            // Get original thumbnail URL first
            const thumbnailUrl = linkData.thumbnailUrl || fileData.thumbnailUrl;
            
            // Only extract base64 thumbnail if no URL is available (saves space)
            // For YouTube/Vimeo, we already have the thumbnail URL, no need for base64
            const thumbnailDataUrl = thumbnailUrl ? null : this.extractThumbnail(objectMesh);

            // Extract and truncate title for viewer labels (14 chars like app)
            const displayTitle = this.extractObjectTitle(objectMesh);

            return {
                slotIndex,
                url,
                isWebLink,
                isDemoFile, // Flag demo files
                domain,
                name: linkData.name || fileData.fileName || userData.fileName || 'Untitled',
                title: linkData.title || fileData.title,
                displayTitle, // NEW: Truncated title for viewer text labels (14 chars)
                description: linkData.description || fileData.description,
                thumbnailUrl, // Original URL (preferred - small)
                thumbnailDataUrl, // Extracted base64 (fallback - large, only if no URL)
                serviceName: linkData.serviceName || fileData.serviceName,
                linkType: linkData.linkType,
                // YouTube-specific data
                youTubeVideoId: userData.youTubeThumbnail?.videoId,
                // Demo file data
                path: isDemoFile ? path : undefined,
                // Metadata for display
                metadata: {
                    createdAt: userData.createdAt,
                    objectHeight: userData.objectHeight
                }
            };
        }

        /**
         * Extract and truncate object title for viewer labels
         * @param {THREE.Object3D} objectMesh - Object mesh
         * @returns {string|null} - Truncated title (14 chars) or null
         */
        extractObjectTitle(objectMesh) {
            const userData = objectMesh.userData;
            const linkData = userData.linkData || {};
            const fileData = userData.fileData || {};
            
            // Extract title from various possible locations (same priority as LinkTitleManager)
            let title = linkData.title || 
                       fileData.title || 
                       fileData.name || 
                       userData.fileName || 
                       userData.displayName || 
                       userData.title;
            
            // Return null if no valid title found
            if (!title || title === 'undefined' || title.trim() === '') {
                return null;
            }
            
            title = title.trim();
            
            // Extract domain from "Link (domain.com)" format
            if (title.startsWith('Link (') && title.endsWith(')')) {
                const domain = title.substring(6, title.length - 1);
                if (domain) {
                    title = domain;
                }
            }
            
            // Truncate to 14 characters (matching app's LinkTitleManager)
            if (title.length > 14) {
                return title.substring(0, 13) + '…';
            }
            
            return title;
        }

        /**
         * Check if object is a local media file (MP3/MP4)
         * @param {Object} userData - Object userData
         * @returns {boolean}
         */
        isLocalMediaFile(userData) {
            const fileName = userData.fileName || '';
            const extension = fileName.split('.').pop().toLowerCase();
            
            // Check if file is local media
            const isMedia = ['mp3', 'mp4', 'wav', 'flac', 'm4a', 'aac', 'mov', 'avi'].includes(extension);
            
            // Check if URL is NOT a web link (local file)
            const fileData = userData.fileData || {};
            const linkData = userData.linkData || {};
            const path = userData.path || linkData.path || fileData.path || '';
            const url = linkData.url || fileData.url || userData.url || path || '';
            
            // CRITICAL FIX: Demo files (assets/demomedia/) should NOT be excluded
            // They work via data URLs and can be shared
            const isDemoFile = url.startsWith('assets/demomedia/') || userData.isDemoContent === true;
            if (isDemoFile) {
                console.log(`✅ Including demo file in share: ${fileName}`);
                return false; // Demo files are shareable
            }
            
            const isLocalFile = !url.startsWith('http://') && !url.startsWith('https://');
            
            return isMedia && isLocalFile;
        }

        /**
         * Extract domain from URL
         * @param {string} url - URL string
         * @returns {string} - Domain name
         */
        extractDomain(url) {
            try {
                const urlObj = new URL(url);
                return urlObj.hostname.replace('www.', '');
            } catch (e) {
                return '';
            }
        }

        /**
         * Extract thumbnail from object's face texture
         * @param {THREE.Object3D} objectMesh - Object mesh
         * @returns {string|null} - Data URL of thumbnail
         */
        extractThumbnail(objectMesh) {
            try {
                // Check if object has multi-material array
                if (!Array.isArray(objectMesh.material)) {
                    return null;
                }

                // Check front face (material[4]) for texture map
                const frontMaterial = objectMesh.material[4];
                if (!frontMaterial || !frontMaterial.map) {
                    return null;
                }

                const texture = frontMaterial.map;
                
                // If texture has an image source, convert to data URL
                if (texture.image) {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas size (compress to reasonable size)
                    const maxSize = 256;
                    const scale = Math.min(maxSize / texture.image.width, maxSize / texture.image.height);
                    canvas.width = texture.image.width * scale;
                    canvas.height = texture.image.height * scale;
                    
                    // Draw texture to canvas
                    ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
                    
                    // Convert to data URL (JPEG for better compression)
                    return canvas.toDataURL('image/jpeg', 0.7);
                }

                return null;
            } catch (error) {
                console.warn('⚠️ Failed to extract thumbnail:', error);
                return null;
            }
        }

        /**
         * Find object in scene by ID
         * @param {string} objectId - Object ID
         * @returns {THREE.Object3D|null}
         */
        findObjectById(objectId) {
            // Search fileObjects (regular files and demo media)
            let found = this.app.stateManager.fileObjects.find(obj => obj.userData.id === objectId);
            if (found) return found;
            
            // Search appObjects (link objects, including demo links)
            if (this.app.virtualObjectManager && this.app.virtualObjectManager.appObjects) {
                found = this.app.virtualObjectManager.appObjects.find(obj => obj.userData.id === objectId);
                if (found) return found;
            }
            
            // Last resort: search entire scene
            console.warn(`⚠️ Object ${objectId} not found in main arrays, searching scene...`);
            this.scene.traverse((obj) => {
                if (obj.userData && obj.userData.id === objectId) {
                    found = obj;
                }
            });
            
            return found || null;
        }

        /**
         * Compress data using LZ-String
         * @param {Object} data - Data to compress
         * @returns {string} - Compressed Base64 string
         */
        compressData(data) {
            const jsonString = JSON.stringify(data);
            
            // Use LZ-String if available, otherwise use Base64 encoding
            if (window.LZString) {
                return window.LZString.compressToEncodedURIComponent(jsonString);
            } else {
                console.warn('⚠️ LZ-String not available, using Base64 encoding');
                return btoa(encodeURIComponent(jsonString));
            }
        }

        /**
         * Decompress data from URL parameter
         * @param {string} compressed - Compressed data string
         * @returns {Object} - Decompressed data
         */
        static decompressData(compressed) {
            try {
                // Try LZ-String first
                if (window.LZString) {
                    const decompressed = window.LZString.decompressFromEncodedURIComponent(compressed);
                    if (decompressed) {
                        return JSON.parse(decompressed);
                    }
                }
                
                // Fallback to Base64
                const decompressed = decodeURIComponent(atob(compressed));
                return JSON.parse(decompressed);
            } catch (error) {
                console.error('❌ Failed to decompress data:', error);
                throw new Error('Invalid share link data');
            }
        }

        /**
         * Copy share URL to clipboard
         * @param {string} url - URL to copy
         * @returns {Promise<boolean>}
         */
        async copyToClipboard(url) {
            try {
                await navigator.clipboard.writeText(url);
                console.log('✅ Share URL copied to clipboard');
                return true;
            } catch (error) {
                console.error('❌ Failed to copy to clipboard:', error);
                return false;
            }
        }

        /**
         * Configure viewer base URL (after GitHub Pages deployment)
         * @param {string} baseUrl - Base URL for viewer page
         */
        setViewerBaseUrl(baseUrl) {
            this.viewerBaseUrl = baseUrl;
            console.log(`🔗 Viewer base URL set to: ${baseUrl}`);
        }

        /**
         * Get display name for current world
         * @returns {string} - Human-readable world name
         */
        getWorldDisplayName() {
            if (!this.app.currentWorldTemplate) return 'Green Plane World';
            
            const worldNames = {
                // Free worlds
                'green-plane': 'Green Plane World',
                'space': 'Space World',
                'ocean': 'Ocean World',
                'record-store': 'Record Store',
                'music-festival': 'Music Festival',
                'modern-gallery-clean': 'Modern Gallery (Clean)',
                'modern-gallery-dark': 'Modern Gallery (Dark)',
                'modern-gallery-warm': 'Modern Gallery (Warm)',
                'future-car-gallery': 'Car Gallery',
                // Premium worlds
                'forest': 'Forest Realm',
                'dazzle': 'Dazzle Bedroom',
                'cave': 'Cave World',
                'christmas': 'Christmas World',
                'desert-oasis': 'Desert Oasis',
                'tropical-paradise': 'Tropical Paradise',
                'flower-wonderland': 'Flower Wonderland'
            };
            
            const worldType = this.app.currentWorldTemplate.getType();
            return worldNames[worldType] || worldType.replace(/-./g, x => ' ' + x[1].toUpperCase());
        }
    }

    // Expose to global scope
    window.FurnitureShareManager = FurnitureShareManager;
    console.log('✅ FurnitureShareManager loaded successfully');

})();
