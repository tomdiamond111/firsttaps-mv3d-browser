/**
 * PREMIUM WORLD INITIALIZATION FIX
 * 
 * This script fixes the timing issue where link and app object thumbnails
 * are lost when the app opens directly into premium worlds (Cave Explorer, Christmas).
 * 
 * ROOT CAUSE: The initialization sequence creates objects in Green Plane first,
 * then switches to premium world, but the switch doesn't preserve thumbnailDataUrl
 * for link/app objects during this initial transition.
 * 
 * SOLUTION: Intercept and enhance the initial world switch to preserve face texture data.
 * 
 * APPLY THIS FIX:
 * 1. Add this script to your HTML file BEFORE the app initializes
 * 2. Or inject it into the world management system
 */

(function() {
    'use strict';
    
    console.log('🔧 ========================================');
    console.log('🔧 PREMIUM WORLD INITIALIZATION FIX');
    console.log('🔧 ========================================');
    
    // Track if this is the first world switch (initial startup)
    let isInitialWorldSwitch = true;
    let originalSwitchMethod = null;
    
    /**
     * Enhanced switchWorldTemplate method that preserves face texture data
     * during the initial Green Plane → Premium World transition
     */
    function enhancedSwitchWorldTemplate(newWorldType) {
        console.log(`🔧 Enhanced world switch called: ${newWorldType} (initial: ${isInitialWorldSwitch})`);
        
        // If this is the initial switch and we're going to a premium world
        const isPremiumWorld = ['cave', 'christmas', 'dazzle', 'forest'].includes(newWorldType);
        
        if (isInitialWorldSwitch && isPremiumWorld) {
            console.log('🔧 INITIAL PREMIUM WORLD SWITCH DETECTED - Applying face texture preservation');
            
            // Capture all link and app object thumbnail data BEFORE the switch
            const thumbnailBackup = {};
            
            if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
                window.app.stateManager.fileObjects.forEach(object => {
                    const fileData = object.userData.fileData;
                    const fileName = object.userData.fileName;
                    
                    if (fileData && fileName) {
                        const type = fileData.type || '';
                        const id = fileData.id || '';
                        const isLinkOrApp = type === 'link' || type === 'app' || 
                                          id.startsWith('app_') || 
                                          fileName.includes('http') || 
                                          fileName.includes('youtube') ||
                                          fileName.endsWith('.app');
                        
                        if (isLinkOrApp && fileData.thumbnailDataUrl) {
                            thumbnailBackup[object.uuid] = {
                                fileName: fileName,
                                thumbnailDataUrl: fileData.thumbnailDataUrl,
                                type: type,
                                id: id
                            };
                            console.log(`🔧 Backed up thumbnail for ${fileName} (${fileData.thumbnailDataUrl.length} chars)`);
                        }
                    }
                });
            }
            
            console.log(`🔧 Backed up ${Object.keys(thumbnailBackup).length} thumbnails`);
            
            // Call the original switch method
            const result = originalSwitchMethod.call(this, newWorldType);
            
            // After the switch, restore the thumbnail data
            if (result && typeof result.then === 'function') {
                // Async method - wait for completion
                return result.then(() => {
                    restoreThumbnailData(thumbnailBackup, newWorldType);
                    isInitialWorldSwitch = false;
                    return result;
                });
            } else {
                // Sync method - restore immediately
                setTimeout(() => {
                    restoreThumbnailData(thumbnailBackup, newWorldType);
                    isInitialWorldSwitch = false;
                }, 100);
                return result;
            }
        } else {
            // Normal world switch - just call original method
            const result = originalSwitchMethod.call(this, newWorldType);
            isInitialWorldSwitch = false;
            return result;
        }
    }
    
    /**
     * Restore thumbnail data to objects after world switch
     */
    function restoreThumbnailData(thumbnailBackup, worldType) {
        console.log(`🔧 Restoring thumbnail data after switch to ${worldType}`);
        
        if (!window.app || !window.app.stateManager) {
            console.error('🔧 App or state manager not available for restoration');
            return;
        }
        
        let restoredCount = 0;
        
        window.app.stateManager.fileObjects.forEach(object => {
            if (thumbnailBackup[object.uuid]) {
                const backup = thumbnailBackup[object.uuid];
                const fileData = object.userData.fileData;
                
                if (fileData && !fileData.thumbnailDataUrl) {
                    console.log(`🔧 Restoring thumbnail for ${backup.fileName}`);
                    fileData.thumbnailDataUrl = backup.thumbnailDataUrl;
                    restoredCount++;
                    
                    // Force face texture update if billboard manager is available
                    if (window.app.billboardManager && window.app.billboardManager.updateObjectVisuals) {
                        try {
                            // Clear processing flags to allow re-processing
                            if (window.app.stateManager.processedTextureObjects) {
                                window.app.stateManager.processedTextureObjects.delete(object.uuid);
                            }
                            
                            // Force face texture update
                            window.app.billboardManager.updateObjectVisuals(object, fileData);
                            console.log(`🔧 Updated face texture for ${backup.fileName}`);
                        } catch (error) {
                            console.warn(`🔧 Error updating face texture for ${backup.fileName}:`, error);
                        }
                    }
                }
            }
        });
        
        console.log(`🔧 Restored ${restoredCount} thumbnails after world switch`);
        
        // Update all object visuals to ensure face textures are applied
        if (window.app.billboardManager && window.app.billboardManager.updateAllObjectVisuals) {
            setTimeout(() => {
                console.log('🔧 Triggering updateAllObjectVisuals to refresh face textures');
                window.app.billboardManager.updateAllObjectVisuals();
            }, 200);
        }
    }
    
    /**
     * Install the fix by intercepting the switchWorldTemplate method
     */
    function installFix() {
        console.log('🔧 Installing premium world initialization fix...');
        
        // Wait for app to be available
        function waitForApp() {
            if (window.app && window.app.worldManager && window.app.worldManager.switchWorldTemplate) {
                console.log('🔧 App detected, installing fix...');
                
                // Store original method
                originalSwitchMethod = window.app.worldManager.switchWorldTemplate.bind(window.app.worldManager);
                
                // Replace with enhanced method
                window.app.worldManager.switchWorldTemplate = enhancedSwitchWorldTemplate.bind(window.app.worldManager);
                
                console.log('✅ Premium world initialization fix installed successfully');
                return true;
            }
            return false;
        }
        
        // Try to install immediately
        if (waitForApp()) {
            return;
        }
        
        // Poll for app availability
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds
        
        const pollInterval = setInterval(() => {
            attempts++;
            
            if (waitForApp()) {
                clearInterval(pollInterval);
            } else if (attempts >= maxAttempts) {
                console.error('🔧 Failed to install fix - app not available after 5 seconds');
                clearInterval(pollInterval);
            }
        }, 100);
    }
    
    /**
     * Provide manual installation method for debugging
     */
    window.installPremiumWorldFix = function() {
        console.log('🔧 Manual installation requested...');
        installFix();
    };
    
    /**
     * Provide method to check if fix is active
     */
    window.checkPremiumWorldFix = function() {
        const isInstalled = window.app && 
                          window.app.worldManager && 
                          window.app.worldManager.switchWorldTemplate && 
                          window.app.worldManager.switchWorldTemplate.toString().includes('Enhanced world switch');
        
        console.log(`🔧 Premium world fix active: ${isInstalled}`);
        console.log(`🔧 Is initial switch: ${isInitialWorldSwitch}`);
        
        return {
            installed: isInstalled,
            isInitialSwitch: isInitialWorldSwitch,
            hasApp: !!window.app,
            hasWorldManager: !!(window.app && window.app.worldManager),
            hasSwitchMethod: !!(window.app && window.app.worldManager && window.app.worldManager.switchWorldTemplate)
        };
    };
    
    // Auto-install when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installFix);
    } else {
        installFix();
    }
    
    console.log('🔧 Premium world initialization fix loaded');
    console.log('🔧 Use window.checkPremiumWorldFix() to verify installation');
    console.log('🔧 Use window.installPremiumWorldFix() for manual installation');
    
})();