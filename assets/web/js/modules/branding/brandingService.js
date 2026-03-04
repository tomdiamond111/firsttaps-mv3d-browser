// modules/branding/brandingService.js
// Branding Service for App Object Integration
// Dependencies: window.BrandManager, window.app
// Exports: window.BrandingService

(function() {
    'use strict';
    // Debug flag - set to false to disable verbose logging
    const DEBUG = false;
    
    if (DEBUG) console.log("Loading BrandingService module...");

    // ============================================================================
    // BRANDING SERVICE - INTEGRATION WITH EXISTING SYSTEMS
    // ============================================================================
    
    class BrandingService {
        constructor(app) {
            this.app = app;
            this.brandManager = null;
            this.enabled = true;
            
            // Initialize when THREE.js is available
            if (window.THREE) {
                this.initialize();
            } else {
                // Wait for THREE.js to be available
                const checkThree = setInterval(() => {
                    if (window.THREE) {
                        clearInterval(checkThree);
                        this.initialize();
                    }
                }, 100);
            }
            
            if (DEBUG) console.log('BrandingService constructed');
        }

        /**
         * Initialize the branding service
         */
        initialize() {
            try {
                // Wait for BrandManager to be available
                if (window.BrandManager) {
                    this.brandManager = new window.BrandManager(window.THREE);
                    if (DEBUG) console.log('✅ BrandingService initialized successfully');
                } else {
                    console.warn('⚠️ BrandManager not available, will retry...');
                    setTimeout(() => this.initialize(), 500);
                }
            } catch (error) {
                console.error('❌ Error initializing BrandingService:', error);
            }
        }

        /**
         * Apply branding to an app object (main entry point)
         * @param {Object} appObject - THREE.js mesh object
         * @param {Object} appData - App data with name, packageName, etc.
         * @returns {boolean} - Success status
         */
        applyBranding(appObject, appData) {
            if (!this.enabled || !this.brandManager) {
                if (DEBUG) console.log('🚫 Branding disabled or not ready');
                return false;
            }

            // Check if branding has already been applied to prevent duplicates
            if (appObject.userData.isBranded) {
                if (DEBUG) console.log('✅ Branding already applied to:', appData.name || appData.packageName, '- skipping duplicate call');
                return true;
            }

            try {
                // Reduced logging to reduce console spam
                // console.log('🎨 BrandingService applying branding to:', appData.name || appData.packageName);
                
                // Extract app name for branding lookup
                const appName = this.extractAppName(appData);
                
                // Create enhanced app data
                const enhancedAppData = {
                    ...appData,
                    name: appName
                };
                
                // Apply branding via BrandManager
                const success = this.brandManager.applyBrandingToObject(appObject, enhancedAppData);
                
                if (success) {
                    // Mark object as branded in userData
                    appObject.userData.isBranded = true;
                    appObject.userData.brandingApplied = Date.now();
                    
                    if (DEBUG) console.log('✅ Branding applied successfully via service');
                    return true;
                } else {
                    console.warn('⚠️ BrandManager failed to apply branding');
                    return false;
                }
                
            } catch (error) {
                console.error('❌ Error in BrandingService.applyBranding:', error);
                return false;
            }
        }

        /**
         * Extract clean app name from various app data formats
         * @param {Object} appData - App data
         * @returns {string} - Clean app name
         */
        extractAppName(appData) {
            // CRITICAL FIX: For link objects, prioritize serviceName and linkType
            // This ensures Instagram, YouTube, Vimeo, etc. get correct branding
            // even when the name is generic like "Link (instagram.com)"
            if (appData.url) {
                // This is a link object - use serviceName or linkType for branding
                if (appData.serviceName && appData.serviceName !== 'Web') {
                    if (DEBUG) console.log('📝 Using serviceName for link branding:', appData.serviceName);
                    return appData.serviceName; // Already capitalized (e.g., "Instagram", "YouTube")
                }
                if (appData.linkType && appData.linkType !== 'web') {
                    // Capitalize linkType (e.g., "instagram" -> "Instagram")
                    const capitalizedType = appData.linkType.charAt(0).toUpperCase() + appData.linkType.slice(1).toLowerCase();
                    if (DEBUG) console.log('📝 Using linkType for link branding:', capitalizedType);
                    return capitalizedType;
                }
            }
            
            // Try multiple name sources for non-link objects
            let appName = appData.name || 
                         appData.appName || 
                         appData.packageName || 
                         appData.title ||
                         'Unknown App';
            
            // Clean up the name
            appName = appName.trim();
            
            // Remove package name prefixes (e.g., "com.spotify.music" -> "spotify")
            if (appName.includes('.') && appName.length > 20) {
                const parts = appName.split('.');
                if (parts.length >= 3) {
                    // Take the company name (usually second part)
                    appName = parts[1];
                }
            }
            
            // Capitalize first letter
            appName = appName.charAt(0).toUpperCase() + appName.slice(1).toLowerCase();
            
            if (DEBUG) console.log('📝 Extracted app name:', appName);
            return appName;
        }

        /**
         * Check if an object has branding applied
         * @param {Object} appObject - THREE.js mesh object
         * @returns {boolean} - True if object is branded
         */
        isBranded(appObject) {
            return appObject.userData && appObject.userData.isBranded === true;
        }

        /**
         * Remove branding from an object
         * @param {Object} appObject - THREE.js mesh object
         * @returns {boolean} - Success status
         */
        removeBranding(appObject) {
            if (!this.brandManager) {
                return false;
            }

            try {
                const success = this.brandManager.removeBranding(appObject);
                
                if (success) {
                    // Clear branding flags
                    if (appObject.userData) {
                        delete appObject.userData.isBranded;
                        delete appObject.userData.brandingApplied;
                    }
                }
                
                return success;
                
            } catch (error) {
                console.error('❌ Error removing branding:', error);
                return false;
            }
        }

        /**
         * Enable or disable branding system
         * @param {boolean} enabled - Enable/disable branding
         */
        setEnabled(enabled) {
            this.enabled = enabled;
            if (DEBUG) console.log('🎨 Branding service', enabled ? 'enabled' : 'disabled');
        }

        /**
         * Check if branding service is ready
         * @returns {boolean} - True if ready
         */
        isReady() {
            return this.brandManager !== null && this.enabled;
        }

        /**
         * Get branding statistics
         * @returns {Object} - Stats about branding usage
         */
        getStats() {
            const stats = {
                enabled: this.enabled,
                ready: this.isReady(),
                brandCount: 0,
                brandedObjects: 0
            };

            if (this.brandManager && this.brandManager.brandDatabase) {
                stats.brandCount = this.brandManager.brandDatabase.getBrandCount();
            }

            // Count branded objects in scene
            if (this.app && this.app.stateManager && this.app.stateManager.fileObjects) {
                stats.brandedObjects = this.app.stateManager.fileObjects.filter(obj => 
                    this.isBranded(obj)
                ).length;
            }

            return stats;
        }

        /**
         * Refresh branding on all app objects
         * @returns {number} - Number of objects re-branded
         */
        refreshAllBranding() {
            if (!this.isReady()) {
                console.warn('⚠️ BrandingService not ready for refresh');
                return 0;
            }

            let refreshCount = 0;

            try {
                // Get all file objects that are app objects
                if (this.app && this.app.stateManager && this.app.stateManager.fileObjects) {
                    this.app.stateManager.fileObjects.forEach(obj => {
                        // Check if it's an app object
                        if (obj.userData && obj.userData.fileData && 
                            (obj.userData.fileData.extension === 'app' || 
                             obj.userData.fileData.id?.startsWith('app://'))) {
                            
                            // Re-apply branding
                            if (this.applyBranding(obj, obj.userData.fileData)) {
                                refreshCount++;
                            }
                        }
                    });
                }

                if (DEBUG) console.log(`🔄 Refreshed branding on ${refreshCount} objects`);
                return refreshCount;

            } catch (error) {
                console.error('❌ Error refreshing branding:', error);
                return 0;
            }
        }
    }

    // Export the class
    window.BrandingService = BrandingService;
    if (DEBUG) console.log("BrandingService module loaded successfully");
})();
