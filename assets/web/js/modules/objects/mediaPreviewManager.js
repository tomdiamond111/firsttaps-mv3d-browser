/**
 * Media Preview Manager (MV3D)
 * Coordinates media preview screens for links and file objects
 * Ensures only one preview is active at a time
 */

window.MediaPreviewManagerClass = class MediaPreviewManager {
    constructor(scene) {
        this.scene = scene;
        this.previewScreens = new Map(); // objectId -> MediaPreviewScreen
        this.activePreviewId = null;
        
        console.log('🎵 Media Preview Manager initialized');
    }
    
    /**
     * Create or toggle media preview for an object
     */
    togglePreview(objectData, objectMesh) {
        const objectId = objectData.id || objectData.fileId || objectData.fileName;
        
        if (!objectId) {
            console.error('❌ Cannot create preview - no object ID');
            return;
        }
        
        // If this object already has a preview screen
        if (this.previewScreens.has(objectId)) {
            const preview = this.previewScreens.get(objectId);
            
            if (preview.isVisible) {
                preview.hide();
                this.activePreviewId = null;
            } else {
                // Hide other previews first
                this.hideAllPreviews();
                preview.show();
                preview.updatePosition(objectMesh);
                this.activePreviewId = objectId;
            }
        } else {
            // Create new preview screen
            this.createPreview(objectData, objectMesh);
        }
    }
    
    /**
     * Create a new media preview screen
     */
    createPreview(objectData, objectMesh) {
        const objectId = objectData.id || objectData.fileId || objectData.fileName;
        
        try {
            if (!window.MediaPreviewScreenClass) {
                console.error('❌ MediaPreviewScreenClass not available');
                return;
            }
            
            // CRITICAL FIX: Detect if objectData is already userData (from interactionManager)
            // interactionManager.js passes object.userData, not the full object
            const isAlreadyUserData = !objectData.userData && (objectData.tiktokMetadata || objectData.linkData || objectData.fileData);
            
            // console.log('🎵 [PREVIEW MANAGER] objectData structure:', {
            //     isAlreadyUserData,
            //     hasTiktokMetadata: !!objectData.tiktokMetadata,
            //     hasUserData: !!objectData.userData,
            //     hasLinkData: !!objectData.linkData
            // });
            
            // Extract the actual userData reference
            const actualUserData = isAlreadyUserData ? objectData : objectData.userData;
            
            // CRITICAL FIX: Use linkData.title for renamed objects (takes priority)
            const displayName = actualUserData?.linkData?.title || 
                               actualUserData?.fileName || 
                               objectData.name || 
                               'Media';
            
            // console.log('🎵 [PREVIEW MANAGER] Resolved display name:', displayName);
            
            // Prepare media data - ensure proper properties for detection
            const mediaData = {
                name: displayName,  // Use linkData.title if available (renamed objects)
                url: actualUserData?.url || objectData.url || null,  // Check userData.url for link objects
                path: actualUserData?.path || objectData.path || objectData.filePath || null,
                extension: actualUserData?.extension || objectData.extension || '',
                fileName: actualUserData?.fileName || objectData.fileName || '',
                type: actualUserData?.fileType || actualUserData?.type || objectData.type,
                id: objectId,
                // CRITICAL FIX: Pass through social media metadata directly from actualUserData
                tiktokMetadata: actualUserData?.tiktokMetadata || null,
                spotifyMetadata: actualUserData?.spotifyMetadata || null,
                instagramMetadata: actualUserData?.instagramMetadata || null,
                linkData: actualUserData?.linkData || null,  // Pass linkData for Deezer/Vimeo thumbnails
                userData: actualUserData,
                // CRITICAL: Pass through furniture/path playback context for navigation controls
                activeFurniturePlayback: window.app?.activeFurniturePlayback || null,
                activePathPlayback: actualUserData?.activePathPlayback || null
            };
            
            // console.log('🎵 [PREVIEW MANAGER] Final mediaData:', {
            //     name: mediaData.name,
            //     tiktokMetadata: mediaData.tiktokMetadata,
            //     hasThumbnail: !!mediaData.tiktokMetadata?.thumbnail_url
            // });
            
            // Ensure extension is extracted from fileName if not already set
            if (!mediaData.extension && mediaData.fileName) {
                const dotIndex = mediaData.fileName.lastIndexOf('.');
                if (dotIndex !== -1) {
                    mediaData.extension = mediaData.fileName.substring(dotIndex).toLowerCase();
                }
            }
            
            // Create preview screen
            const preview = new window.MediaPreviewScreenClass(mediaData, this.scene);
            
            // Position screen near the object
            preview.updatePosition(objectMesh);
            
            // Add to scene
            this.scene.add(preview.getMesh());
            
            // Store preview
            this.previewScreens.set(objectId, preview);
            
            // Hide all other previews and show this one
            this.hideAllPreviews();
            preview.show();
            this.activePreviewId = objectId;
            
            console.log(`🎵 Media preview created for ${mediaData.name}`);
        } catch (error) {
            console.error(`❌ Failed to create media preview for ${objectId}:`, error);
        }
    }
    
    /**
     * Show preview for specific object
     */
    showPreview(objectId, objectMesh) {
        const preview = this.previewScreens.get(objectId);
        
        if (preview) {
            this.hideAllPreviews();
            preview.show();
            if (objectMesh) {
                preview.updatePosition(objectMesh);
            }
            this.activePreviewId = objectId;
        }
    }
    
    /**
     * Hide preview for specific object
     */
    hidePreview(objectId) {
        const preview = this.previewScreens.get(objectId);
        
        if (preview) {
            preview.hide();
            if (this.activePreviewId === objectId) {
                this.activePreviewId = null;
            }
        }
    }
    
    /**
     * Hide all preview screens
     */
    hideAllPreviews() {
        // console.log('🎵 Hiding all previews...');
        this.previewScreens.forEach((preview, objectId) => {
            // Always call hide() regardless of isVisible flag
            // This ensures media cleanup happens even if flag is out of sync
            // console.log(`🎵 Hiding preview for ${objectId}, isVisible: ${preview.isVisible}`);
            preview.hide();
        });
        this.activePreviewId = null;
    }
    
    /**
     * Remove preview for specific object
     */
    removePreview(objectId) {
        const preview = this.previewScreens.get(objectId);
        
        if (preview) {
            preview.dispose();
            this.previewScreens.delete(objectId);
            
            if (this.activePreviewId === objectId) {
                this.activePreviewId = null;
            }
            
            console.log(`🎵 Media preview removed for ${objectId}`);
        }
    }
    
    /**
     * Check if object has media preview capability
     */
    canPreview(objectData) {
        // Check for URL-based media
        const url = objectData.url || '';
        if (url.includes('youtube.com') || url.includes('youtu.be') ||
            url.includes('spotify.com') || url.includes('soundcloud.com') ||
            url.includes('vimeo.com') || url.includes('twitch.tv') ||
            url.includes('tiktok.com') || url.includes('instagram.com/reel') ||
            url.includes('instagram.com/p/') || url.includes('snapchat.com/spotlight')) {
            return true;
        }
        
        // Check for file-based media
        const extension = (objectData.extension || '').toLowerCase();
        const mediaExtensions = [
            '.mp4', '.mov', '.avi', '.webm', '.mkv',  // Video
            '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'  // Audio
        ];
        
        return mediaExtensions.includes(extension);
    }
    
    /**
     * Get active preview
     */
    getActivePreview() {
        if (this.activePreviewId) {
            return this.previewScreens.get(this.activePreviewId);
        }
        return null;
    }
    
    /**
     * Update preview positions (called during camera movement)
     */
    updatePreviewPositions() {
        this.previewScreens.forEach((preview, objectId) => {
            if (preview.isVisible && window.app && window.app.camera) {
                // Make preview face camera
                preview.mesh.lookAt(window.app.camera.position);
            }
        });
    }
    
    /**
     * Handle object deletion
     */
    handleObjectDeleted(objectId) {
        this.removePreview(objectId);
    }
    
    /**
     * Cleanup all previews
     */
    disposeAll() {
        this.previewScreens.forEach((preview, objectId) => {
            preview.dispose();
        });
        this.previewScreens.clear();
        this.activePreviewId = null;
        
        console.log('🎵 All media previews disposed');
    }
};

// Create global instance when manager is loaded
if (!window.mediaPreviewManager) {
    // Will be initialized when scene is available
    console.log('🎵 Media Preview Manager class loaded');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MediaPreviewManagerClass;
}
