/**
 * URL Manager Module
 * Coordinates URL processing and integration with the 3D world system
 */

class URLManager {
    constructor(app) {
        this.app = app;
        this.urlProcessor = new URLProcessor();
        this.pendingLinks = new Map(); // Store links being processed
        
        console.log('🌐 URLManager initialized');
    }

    /**
     * Process URL and create link object in 3D world
     * @param {string} url - URL to process
     * @param {Object} options - Creation options (can include skipMetadata: true)
     * @returns {Promise<Object>} - Created link object
     */
    async createLinkFromURL(url, options = {}) {
        // console.log('🔗 Creating link from URL:', url);

        try {
            // Show loading indicator if UI callback provided
            if (options.onLoadingStart) {
                options.onLoadingStart();
            }

            // Process URL and extract metadata (can skip if options.skipMetadata === true)
            const linkData = await this.urlProcessor.processURL(url, { skipMetadata: options.skipMetadata });
            
            // Determine position for the new object
            const position = options.position || this.getDefaultLinkPosition();
            
            // Create link object data
            const linkObjectData = this.urlProcessor.createLinkObjectData(linkData, position);
            
            // Create the actual 3D object (pass options for furniture metadata)
            const linkObject = await this.createLinkObject(linkObjectData, options);
            
            // Hide loading indicator
            if (options.onLoadingEnd) {
                options.onLoadingEnd();
            }

            // Success callback
            if (options.onSuccess) {
                options.onSuccess(linkObject, linkData);
            }

            // console.log('✅ Link object created successfully:', linkObject.userData.id);
            return linkObject;

        } catch (error) {
            console.error('❌ Error creating link from URL:', error);
            
            // Hide loading indicator
            if (options.onLoadingEnd) {
                options.onLoadingEnd();
            }

            // Error callback
            if (options.onError) {
                options.onError(error);
            }

            throw error;
        }
    }

    /**
     * Create the actual 3D link object
     * @param {Object} linkObjectData - Link object data
     * @param {Object} options - Optional parameters (furnitureId, slotIndex, etc.)
     * @returns {Promise<Object>} - Created 3D object
     */
    async createLinkObject(linkObjectData, options = {}) {
        if (!this.app.virtualObjectManager || !this.app.virtualObjectManager.virtualObjectCreator) {
            throw new Error('Virtual object manager not available');
        }

        // CRITICAL: Ensure position Y is never less than 1 (prevents buried objects)
        if (!linkObjectData.position) {
            linkObjectData.position = { x: 0, y: 1, z: 0 };
        } else if (linkObjectData.position.y < 1) {
            console.warn(`⚠️ Link object position Y was ${linkObjectData.position.y}, correcting to 1 (minimum safe height)`);
            linkObjectData.position.y = 1;
        }

        console.log('🎨 Creating 3D link object:', linkObjectData);

        // Create the app object using existing virtual object creator
        const linkObject = this.app.virtualObjectManager.virtualObjectCreator.createAppObject(
            linkObjectData,
            linkObjectData.position
        );

        if (!linkObject) {
            throw new Error('Failed to create link object');
        }

        // Add to scene and state
        this.app.scene.add(linkObject);
        this.app.stateManager.fileObjects.push(linkObject);

        // Store additional metadata
        linkObject.userData.isLink = true;
        linkObject.userData.linkData = linkObjectData;
        linkObject.userData.createdBy = 'url_manager';

        // CRITICAL: Mark as demo content BEFORE notification (if specified in options)
        if (options.isDemoContent === true) {
            linkObject.userData.isDemoContent = true;
        }

        // FURNITURE SEATING: Set furniture metadata if provided (BEFORE persistence)
        if (options.furnitureId) {
            linkObject.userData.furnitureId = options.furnitureId;
            linkObject.userData.furnitureSlotIndex = options.furnitureSlotIndex;
        }

        // CRITICAL: Apply world-specific position constraints to ensure object is above ground
        if (this.app.worldManager && this.app.worldManager.applyPositionConstraints) {
            const geometry = linkObject.geometry;
            const constrainedPosition = this.app.worldManager.applyPositionConstraints(
                linkObject.position,
                geometry,
                linkObject.userData
            );
            linkObject.position.set(constrainedPosition.x, constrainedPosition.y, constrainedPosition.z);
        }

        // PHASE 5A: Apply visual enhancements (logos, favicons, category styling)
        if (this.app.linkVisualManager) {
            try {
                await this.app.linkVisualManager.enhanceLinkObject(linkObject, linkObjectData);
            } catch (error) {
                console.warn('⚠️ Error applying link visual enhancements:', error);
                // Continue without visual enhancements - basic link object still works
            }
        } else {
            console.warn('LinkVisualManager not available - skipping visual enhancements');
        }

        // CRITICAL: Notify Dart about the new link object for persistence
        this.notifyDartOfNewLinkObject(linkObject);

        // After creating link object, also restore any existing link objects that may have lost visual state
        if (this.app.linkVisualManager) {
            setTimeout(() => {
                this.app.linkVisualManager.restoreAllLinkEnhancements();
            }, 500);
        }

        // console.log('✅ 3D link object created and added to scene');
        return linkObject;
    }

    /**
     * Get default position for new link objects
     * @returns {Object} - Default position {x, y, z}
     */
    getDefaultLinkPosition() {
        // Find an empty spot near the home area
        // CRITICAL: Y must be >= 1 to ensure object sits on ground properly (not buried)
        const homeCenter = { x: 0, y: 1, z: 0 };
        const radius = 3;
        
        // Get existing link objects and all objects to avoid collisions
        const existingLinks = this.getExistingLinkObjects();
        const allObjects = this.app.stateManager.fileObjects || [];
        
        // Create a more robust positioning system
        let attempt = 0;
        const maxAttempts = 12; // 12 positions around the circle
        
        while (attempt < maxAttempts) {
            const angle = (attempt * 30) % 360; // 30 degrees apart for more positions
            const radians = (angle * Math.PI) / 180;
            
            const candidatePosition = {
                x: Math.round(homeCenter.x + radius * Math.cos(radians)),
                y: homeCenter.y,
                z: Math.round(homeCenter.z + radius * Math.sin(radians))
            };
            
            // Check if this position is already occupied
            const isOccupied = allObjects.some(obj => {
                if (!obj.position) return false;
                const objX = Math.round(obj.position.x);
                const objZ = Math.round(obj.position.z);
                return objX === candidatePosition.x && objZ === candidatePosition.z;
            });
            
            if (!isOccupied) {
                console.log(`📍 Found free position after ${attempt + 1} attempts:`, candidatePosition);
                return candidatePosition;
            }
            
            attempt++;
        }
        
        // If all spiral positions are taken, use a fallback position with random offset
        const fallbackPosition = {
            x: Math.round(homeCenter.x + (Math.random() - 0.5) * 10), // Random within ±5 units
            y: homeCenter.y,
            z: Math.round(homeCenter.z + (Math.random() - 0.5) * 10)
        };
        
        console.log('📍 Using fallback position (spiral full):', fallbackPosition);
        return fallbackPosition;
    }

    /**
     * Get all existing link objects in the scene
     * @returns {Array} - Array of link objects
     */
    getExistingLinkObjects() {
        if (!this.app.stateManager || !this.app.stateManager.fileObjects) {
            return [];
        }

        return this.app.stateManager.fileObjects.filter(obj => 
            obj.userData && obj.userData.isLink
        );
    }

    /**
     * Validate URL before processing
     * @param {string} url - URL to validate
     * @returns {Object} - Validation result {isValid, error, normalizedUrl}
     */
    validateURL(url) {
        try {
            if (!url || typeof url !== 'string') {
                return {
                    isValid: false,
                    error: 'URL is required',
                    normalizedUrl: null
                };
            }

            // Basic URL validation
            const normalizedUrl = this.urlProcessor.normalizeURL(url);
            if (!normalizedUrl) {
                return {
                    isValid: false,
                    error: 'Invalid URL format',
                    normalizedUrl: null
                };
            }

            // Check for supported protocols
            const urlObj = new URL(normalizedUrl);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return {
                    isValid: false,
                    error: 'Only HTTP and HTTPS URLs are supported',
                    normalizedUrl: null
                };
            }

            return {
                isValid: true,
                error: null,
                normalizedUrl: normalizedUrl
            };

        } catch (error) {
            return {
                isValid: false,
                error: error.message,
                normalizedUrl: null
            };
        }
    }

    /**
     * Handle clipboard paste for URL creation
     * @param {Object} options - Options for handling paste
     * @returns {Promise<Object|null>} - Created link object or null
     */
    async handleClipboardPaste(options = {}) {
        try {
            // Check if clipboard API is available
            if (!navigator.clipboard || !navigator.clipboard.readText) {
                throw new Error('Clipboard API not available');
            }

            console.log('📋 Reading from clipboard...');
            const clipboardText = await navigator.clipboard.readText();
            
            if (!clipboardText || !clipboardText.trim()) {
                throw new Error('Clipboard is empty');
            }

            console.log('📋 Clipboard content:', clipboardText);

            // Validate the clipboard content as URL
            const validation = this.validateURL(clipboardText.trim());
            if (!validation.isValid) {
                throw new Error(`Invalid URL in clipboard: ${validation.error}`);
            }

            // Create link from clipboard URL
            return await this.createLinkFromURL(validation.normalizedUrl, options);

        } catch (error) {
            console.error('❌ Error handling clipboard paste:', error);
            if (options.onError) {
                options.onError(error);
            }
            throw error;
        }
    }

    /**
     * Get URL processing statistics
     * @returns {Object} - Processing statistics
     */
    getStats() {
        const linkObjects = this.getExistingLinkObjects();
        const stats = {
            totalLinks: linkObjects.length,
            byType: {},
            byDomain: {}
        };

        linkObjects.forEach(obj => {
            const linkData = obj.userData.linkData;
            if (linkData) {
                // Count by type
                const type = linkData.linkType || 'unknown';
                stats.byType[type] = (stats.byType[type] || 0) + 1;

                // Count by domain
                const domain = linkData.domain || 'unknown';
                stats.byDomain[domain] = (stats.byDomain[domain] || 0) + 1;
            }
        });

        return stats;
    }

    /**
     * Delete link object and clean up
     * @param {string} objectId - Object ID to delete
     * @returns {boolean} - Success status
     */
    deleteLinkObject(objectId) {
        try {
            // Use existing file object manager for deletion
            if (this.app.fileObjectManager && this.app.fileObjectManager.removeObjectById) {
                this.app.fileObjectManager.removeObjectById(objectId);
                if (window.shouldLog && window.shouldLog('objectDeletion')) {
                    console.log('🗑️ Link object deleted:', objectId);
                }
                return true;
            } else {
                console.error('File object manager not available for deletion');
                return false;
            }
        } catch (error) {
            console.error('❌ Error deleting link object:', error);
            return false;
        }
    }

    /**
     * Notify Dart about a new link object for persistence
     * @param {Object} linkObject - The created link object
     */
    notifyDartOfNewLinkObject(linkObject) {
        try {
            const userData = linkObject.userData;
            const fileData = userData.fileData;
            
            // Create a FileModel-compatible object for Dart persistence
            const linkFileData = {
                id: userData.id,                    // e.g., "app://com.link.walmart.12345"
                path: userData.id,                  // Use same as ID for app objects
                name: fileData.name,                // e.g., "Walmart"
                extension: 'app',                   // Mark as app type
                size: 0,                           // Links have no file size
                lastModified: Date.now(),          // Current timestamp
                x: linkObject.position.x,
                y: linkObject.position.y,
                z: linkObject.position.z,
                // Link-specific data
                url: fileData.url,
                // CRITICAL: Store URL in mimeType field so FileObjectManager can extract it on reload
                mimeType: fileData.url ? `link:${fileData.url}` : 'app/link',
                thumbnailUrl: fileData.thumbnailUrl,
                thumbnailDataUrl: fileData.thumbnailDataUrl,
                linkType: fileData.linkType,
                // Mark as demo content if applicable
                isDemoContent: userData.isDemoContent || false,
                // Furniture seating metadata (if seated on furniture)
                furnitureId: userData.furnitureId || null,
                furnitureSlotIndex: userData.slotIndex || null
            };

            // CRITICAL: Send ALL objects to Dart for persistence unless in restoration mode
            // Demo content now persists to avoid re-fetching metadata after reload
            // Objects only change if user explicitly moves/deletes or refreshes furniture
            if (window._worldRestorationInProgress === true) {
                // Skip during restoration to avoid duplicate notifications
            } else if (!window.LinkObjectAddedChannel) {
                console.error('❌ [NOTIFY] LinkObjectAddedChannel not available, link will NOT persist!');
                console.error('❌ [NOTIFY] Object ID:', linkFileData.id);
                console.error('❌ [NOTIFY] Object will exist in 3D scene but NOT in Dart/Flutter state');
            } else {
                // SEND TO DART
                try {
                    const jsonString = JSON.stringify(linkFileData);
                    // console.log('📤 [NOTIFY] Calling LinkObjectAddedChannel.postMessage for:', linkFileData.name);
                    // console.log('📤 [NOTIFY] JSON length:', jsonString.length, 'chars');
                    // console.log('📤 [NOTIFY] isDemoContent flag:', !!linkFileData.isDemoContent);
                    
                    window.LinkObjectAddedChannel.postMessage(jsonString);
                    
                    // console.log('✅ [NOTIFY] Successfully sent to Dart via LinkObjectAddedChannel');
                    // console.log('✅ [NOTIFY] Object ID:', linkFileData.id);
                    
                    // if (userData.isDemoContent === true) {
                    //     console.log('🎵 [NOTIFY] Demo/Refreshed content - UI snackbar should be suppressed by Dart');
                    // } else {
                    //     console.log('👤 [NOTIFY] User-added content - UI snackbar should be shown by Dart');
                    // }
                } catch (error) {
                    console.error('❌ [NOTIFY] Exception sending to Dart:', error);
                    console.error('❌ [NOTIFY] Object ID:', linkFileData.id);
                }
            }
        } catch (error) {
            console.error('❌ Error notifying Dart of new link object:', error);
        }
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = URLManager;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.URLManager = URLManager;
}

console.log('📦 URLManager module loaded successfully');
