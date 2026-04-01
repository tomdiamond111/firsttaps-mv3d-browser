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
            
            // Base URL for the furniture viewer (share.firsttaps.com)
            this.viewerBaseUrl = 'https://share.firsttaps.com/';
            
            // Cloudflare Worker URL for paste service
            this.cloudflareWorkerUrl = 'https://firsttaps-paste.firsttaps.workers.dev';
            
            console.log(`🔗 FurnitureShareManager created - viewer URL: ${this.viewerBaseUrl}`);
            console.log(`📤 Using Cloudflare Workers KV for furniture sharing (reliable, fast CDN)`);
        }

        /**
         * Generate shareable URL for a specific furniture piece
         * @param {string} furnitureId - ID of furniture to share
         * @returns {Promise<Object>} - {url, warning, stats, service} or {error}
         */
        async shareFurniture(furnitureId) {
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

                // Upload to paste service and get shareable URL
                const uploadResult = await this.uploadWithFallback(compressed);
                
                if (!uploadResult.success) {
                    return { error: uploadResult.error || 'Failed to upload share data' };
                }
                
                // Warning if local media was excluded
                const warning = shareData.excludedCount > 0 
                    ? `${shareData.excludedCount} local media file(s) excluded (recipients cannot access local MP3/MP4 files)`
                    : null;

                return {
                    url: uploadResult.url,
                    warning,
                    stats,
                    service: uploadResult.service,
                    furnitureName: furniture.name,
                    furnitureType: furniture.type
                };

            } catch (error) {
                console.error('❌ Error generating share link:', error);
                return { error: error.message };
            }
        }

        /**
         * Upload furniture data to GitHub Gist
         * @param {string} content - Compressed furniture data
         * @returns {Promise<Object>} - {success, url, service, error}
         */
        async uploadToGitHubGist(content) {
            try {
                console.log('📤 [SHARE] Trying GitHub Gist (authenticated)...');
                console.log('📤 [SHARE] Data size:', content.length, 'bytes');

                // Check if token is configured
                if (!this.githubToken || this.githubToken === 'your_github_token_here' || this.githubToken.includes('%%')) {
                    console.log('⚠️ [SHARE] GitHub token not configured, skipping...');
                    return {
                        success: false,
                        error: 'GitHub token not configured',
                        service: 'GitHub Gist'
                    };
                }

                const response = await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github+json',
                        'Authorization': `Bearer ${this.githubToken}`
                    },
                    body: JSON.stringify({
                        description: 'FirstTaps MV3D Furniture Share',
                        public: true,
                        files: {
                            'furniture.txt': { content: content }
                        }
                    })
                });

                console.log('📤 [SHARE] GitHub Gist response:', response.status);

                if (response.status === 201) {
                    const data = await response.json();
                    const gistId = data.id;
                    const shareUrl = `${this.viewerBaseUrl}?gist=${gistId}`;

                    console.log('✅ [SHARE] GitHub Gist succeeded:', shareUrl);
                    console.log('✅ [SHARE] Gist ID:', gistId);
                    console.log('✅ [SHARE] Verify at: https://gist.github.com/' + gistId);
                    
                    return { 
                        success: true, 
                        url: shareUrl, 
                        service: 'GitHub Gist',
                        gistId: gistId 
                    };
                }

                const errorText = await response.text();
                console.log('⚠️ [SHARE] GitHub Gist failed: HTTP', response.status);
                console.log('⚠️ [SHARE] Response body:', errorText);
                
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${errorText}`,
                    service: 'GitHub Gist'
                };

            } catch (error) {
                console.log('⚠️ [SHARE] GitHub Gist error:', error.message);
                return {
                    success: false,
                    error: error.toString(),
                    service: 'GitHub Gist'
                };
            }
        }

        /**
         * Upload furniture data to paste.gg (anonymous, free paste service)
         * @param {string} content - Compressed furniture data
         * @returns {Promise<Object>} - {success, url, service, error}
         */
        async uploadToPasteGG(content) {
            try {
                console.log('📤 [SHARE] Trying paste.gg...');
                console.log('📤 [SHARE] Data size:', content.length, 'bytes');

                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.log('⏱️ [SHARE] Request timeout after 30 seconds');
                    controller.abort();
                }, 30000); // 30 second timeout

                try {
                    const response = await fetch('https://api.paste.gg/v1/pastes', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: 'FirstTaps Furniture Playlist',
                            description: 'Shared furniture playlist from FirstTaps MV3D',
                            visibility: 'unlisted',
                            expires: null, // Never expires
                            files: [{
                                name: 'furniture.txt',
                                content: {
                                    format: 'text',
                                    value: content
                                }
                            }]
                        }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);
                    console.log('📤 [SHARE] paste.gg response:', response.status);

                    if (response.status === 201) {
                        const data = await response.json();
                        const pasteId = data.result.id;
                        const shareUrl = `${this.viewerBaseUrl}?pastegg=${pasteId}`;

                        console.log('✅ [SHARE] paste.gg succeeded:', shareUrl);
                        console.log('✅ [SHARE] Paste ID:', pasteId);
                        console.log('✅ [SHARE] Verify at: https://paste.gg/' + pasteId);
                        
                        return { 
                            success: true, 
                            url: shareUrl, 
                            service: 'paste.gg',
                            pasteId: pasteId 
                        };
                    }

                    const errorText = await response.text();
                    console.log('⚠️ [SHARE] paste.gg failed: HTTP', response.status);
                    console.log('⚠️ [SHARE] Response body:', errorText);
                    
                    return {
                        success: false,
                        error: `HTTP ${response.status}: ${errorText}`,
                        service: 'paste.gg'
                    };
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    
                    if (fetchError.name === 'AbortError') {
                        console.log('⚠️ [SHARE] paste.gg timeout after 30 seconds');
                        return {
                            success: false,
                            error: 'Upload timeout - please try again',
                            service: 'paste.gg'
                        };
                    }
                    
                    throw fetchError; // Re-throw other errors to outer catch
                }

            } catch (error) {
                console.log('⚠️ [SHARE] paste.gg error:', error.message);
                console.error('⚠️ [SHARE] Full error:', error);
                return {
                    success: false,
                    error: error.toString(),
                    service: 'paste.gg'
                };
            }
        }

        /**
         * Upload furniture data to dpaste.com (fallback option)
         * @param {string} content - Compressed furniture data
         * @returns {Promise<Object>} - {success, url, service, error}
         */
        async uploadToDPaste(content) {
            try {
                console.log('📤 [SHARE] Trying dpaste.com...');
                console.log('📤 [SHARE] Data size:', content.length, 'bytes');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                try {
                    const formData = new FormData();
                    formData.append('content', content);
                    formData.append('syntax', 'text');
                    formData.append('expiry_days', '365'); // 1 year expiry

                    const response = await fetch('https://dpaste.com/api/', {
                        method: 'POST',
                        body: formData,
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const pasteUrl = (await response.text()).trim();
                        const pasteId = pasteUrl.split('/').pop().replace('.txt', '');
                        const shareUrl = `${this.viewerBaseUrl}?paste=${pasteId}`;

                        console.log('✅ [SHARE] dpaste.com succeeded:', shareUrl);
                        return { 
                            success: true, 
                            url: shareUrl, 
                            service: 'dpaste.com',
                            pasteId: pasteId 
                        };
                    }

                    return {
                        success: false,
                        error: `HTTP ${response.status}`,
                        service: 'dpaste.com'
                    };
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    if (fetchError.name === 'AbortError') {
                        return {
                            success: false,
                            error: 'Upload timeout',
                            service: 'dpaste.com'
                        };
                    }
                    throw fetchError;
                }
            } catch (error) {
                console.log('⚠️ [SHARE] dpaste.com error:', error.message);
                return {
                    success: false,
                    error: error.toString(),
                    service: 'dpaste.com'
                };
            }
        }

        /**
         * Upload furniture data to Cloudflare Workers KV (primary option)
         * @param {string} content - Compressed furniture data
         * @returns {Promise<Object>} - {success, url, service, error}
         */
        async uploadToCloudflare(content) {
            try {
                console.log('📤 [SHARE] Trying Cloudflare Workers KV...');
                console.log('📤 [SHARE] Data size:', content.length, 'bytes');

                // Check if worker URL is configured
                if (!this.cloudflareWorkerUrl || this.cloudflareWorkerUrl === 'YOUR_WORKER_URL_HERE') {
                    console.log('⚠️ [SHARE] Cloudflare Worker URL not configured, skipping...');
                    return {
                        success: false,
                        error: 'Cloudflare Worker URL not configured',
                        service: 'Cloudflare Workers'
                    };
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

                try {
                    const response = await fetch(`${this.cloudflareWorkerUrl}/api/paste`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'text/plain'
                        },
                        body: content,
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const result = await response.json();
                        console.log('📦 [SHARE] Cloudflare response:', result);
                        
                        if (result.success && result.id) {
                            const shareUrl = `${this.viewerBaseUrl}?cf=${result.id}`;

                            console.log('✅ [SHARE] Cloudflare succeeded:', shareUrl);
                            console.log('📋 [SHARE] Paste ID:', result.id);
                            console.log('📋 [SHARE] Data size:', result.size, 'bytes');
                            return { 
                                success: true, 
                                url: shareUrl, 
                                service: 'Cloudflare Workers',
                                pasteId: result.id 
                            };
                        }
                    }

                    const errorText = await response.text();
                    console.log('⚠️ [SHARE] Cloudflare failed: HTTP', response.status);
                    console.log('⚠️ [SHARE] Response:', errorText);

                    return {
                        success: false,
                        error: `HTTP ${response.status}`,
                        service: 'Cloudflare Workers'
                    };
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    if (fetchError.name === 'AbortError') {
                        return {
                            success: false,
                            error: 'Upload timeout',
                            service: 'Cloudflare Workers'
                        };
                    }
                    throw fetchError;
                }
            } catch (error) {
                console.log('⚠️ [SHARE] Cloudflare error:', error.message);
                return {
                    success: false,
                    error: error.toString(),
                    service: 'Cloudflare Workers'
                };
            }
        }

        /**
         * Upload furniture data to rentry.co (fallback option - DEPRECATED: requires access code)
         * @param {string} content - Compressed furniture data
         * @returns {Promise<Object>} - {success, url, service, error}
         */
        async uploadToRentry(content) {
            try {
                console.log('📤 [SHARE] Trying rentry.co...');
                console.log('📤 [SHARE] Data size:', content.length, 'bytes');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                try {
                    // rentry.co API requires URL-encoded form data, not FormData
                    const params = new URLSearchParams();
                    params.append('text', content);
                    
                    const response = await fetch('https://rentry.co/api/new', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: params.toString(),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const responseText = await response.text();
                        console.log('📦 [SHARE] rentry.co raw response:', responseText);
                        
                        try {
                            const result = JSON.parse(responseText);
                            console.log('📦 [SHARE] rentry.co parsed JSON:', JSON.stringify(result, null, 2));
                            
                            if (result.url || result.edit_code) {
                                const pasteId = result.url ? result.url.split('/').pop() : result.edit_code;
                                const shareUrl = `${this.viewerBaseUrl}?rentry=${pasteId}`;

                                console.log('✅ [SHARE] rentry.co succeeded:', shareUrl);
                                console.log('📋 [SHARE] Paste ID:', pasteId);
                                console.log('📋 [SHARE] Full result object:', result);
                                return { 
                                    success: true, 
                                    url: shareUrl, 
                                    service: 'rentry.co',
                                    pasteId: pasteId 
                                };
                            } else {
                                console.error('❌ [SHARE] rentry.co response missing url/edit_code:', result);
                            }
                        } catch (parseError) {
                            console.error('❌ [SHARE] rentry.co response not JSON:', parseError);
                            console.error('❌ [SHARE] Response was:', responseText.substring(0, 500));
                        }
                    }

                    return {
                        success: false,
                        error: `HTTP ${response.status}`,
                        service: 'rentry.co'
                    };
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    if (fetchError.name === 'AbortError') {
                        return {
                            success: false,
                            error: 'Upload timeout',
                            service: 'rentry.co'
                        };
                    }
                    throw fetchError;
                }
            } catch (error) {
                console.log('⚠️ [SHARE] rentry.co error:', error.message);
                return {
                    success: false,
                    error: error.toString(),
                    service: 'rentry.co'
                };
            }
        }

        /**
         * Upload furniture data with multi-service fallback
         * @param {string} content - Compressed furniture data
         * @returns {Promise<Object>} - {success, url, service, error}
         */
        async uploadWithFallback(content) {
            console.log('📤 [SHARE] Starting upload with multi-service fallback...');
            console.log('📤 [SHARE] Data size:', content.length, 'bytes');

            // Try services in priority order
            // 1. Cloudflare Workers KV (fast, reliable, free CDN)
            // 2. paste.gg (anonymous, free, but can be slow)
            // NOTE: rentry.co removed - requires access codes as of 2026
            const services = [
                { name: 'Cloudflare Workers', fn: () => this.uploadToCloudflare(content) },
                { name: 'paste.gg', fn: () => this.uploadToPasteGG(content) }
            ];

            let lastError = '';
            
            for (const service of services) {
                try {
                    console.log(`📤 [SHARE] Trying ${service.name}...`);
                    const result = await service.fn();
                    
                    if (result.success && result.url) {
                        console.log(`✅ [SHARE] ${service.name} succeeded!`);
                        return result;
                    }
                    
                    lastError = result.error || 'Unknown error';
                    console.log(`⚠️ [SHARE] ${service.name} failed: ${lastError}`);
                } catch (error) {
                    lastError = error.message;
                    console.log(`⚠️ [SHARE] ${service.name} exception: ${lastError}`);
                }
            }

            // All services failed
            console.error('❌ [SHARE] All paste services failed');
            return {
                success: false,
                error: `All paste services unavailable. Last error: ${lastError}`,
                service: 'None'
            };
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
