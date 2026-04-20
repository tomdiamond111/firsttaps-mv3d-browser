/**
 * App Sync Bridge - JavaScript module for synchronizing app state between 3D world and Flutter
 * 
 * This bridge provides:
 * - Real-time sync of app selection state with 3D world
 * - Communication with Flutter for menu state updates
 * - App deletion/restoration tracking for menu sync
 * 
 * Mirrors the contact sync system architecture
 */

(function() {
    'use strict';
    
    console.log('🔄 Loading App Sync Bridge module...');

    /**
     * App Sync Bridge Manager
     * Handles all app synchronization between JavaScript 3D world and Flutter menu
     */
    class AppSyncBridge {
        constructor() {
            this.pendingDeletions = new Map(); // Track pending app deletions
            this.pendingRestorations = new Map(); // Track pending app restorations
            this.isFlutterBridgeAvailable = false;
            
            this.initializeFlutterBridge();
            console.log('🔄 AppSyncBridge initialized');
        }

        /**
         * Initialize Flutter bridge communication
         */
        initializeFlutterBridge() {
            // Check if Flutter WebView bridge is available
            if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                this.isFlutterBridgeAvailable = true;
                console.log('🔄 Flutter bridge available for app sync');
            } else {
                // Retry after a short delay
                setTimeout(() => this.initializeFlutterBridge(), 500);
            }
        }

        /**
         * Get all app files currently active in 3D world
         * Called by Flutter to sync menu state
         */
        getAppFilesForMenuSync() {
            console.log('🔄 Flutter requesting app files for menu sync');
            
            const virtualObjectManager = this.getVirtualObjectManager();
            if (!virtualObjectManager) {
                console.warn('🔄 VirtualObjectManager not available');
                return [];
            }

            // Get all app objects from virtual object manager
            const appObjects = virtualObjectManager.getAppObjects ? 
                virtualObjectManager.getAppObjects() : 
                virtualObjectManager.appObjects || new Map();

            const activeApps = [];
            
            if (appObjects instanceof Map) {
                // Convert Map to array
                for (const [packageName, appObject] of appObjects) {
                    if (appObject && appObject.userData) {
                        activeApps.push({
                            packageName: packageName,
                            appName: appObject.userData.appName || appObject.userData.name || 'Unknown App',
                            filePath: `app_${packageName}`,
                            isActive: true
                        });
                    }
                }
            } else if (Array.isArray(appObjects)) {
                // Handle array format
                appObjects.forEach(appObject => {
                    if (appObject && appObject.userData && appObject.userData.packageName) {
                        activeApps.push({
                            packageName: appObject.userData.packageName,
                            appName: appObject.userData.appName || appObject.userData.name || 'Unknown App',
                            filePath: `app_${appObject.userData.packageName}`,
                            isActive: true
                        });
                    }
                });
            }

            console.log(`🔄 Found ${activeApps.length} active apps in 3D world:`, activeApps);
            return activeApps;
        }

        /**
         * Check if a specific app is active in 3D world
         */
        isAppActive(packageName) {
            if (!packageName) return false;

            const virtualObjectManager = this.getVirtualObjectManager();
            if (!virtualObjectManager) return false;

            const appObjects = virtualObjectManager.getAppObjects ? 
                virtualObjectManager.getAppObjects() : 
                virtualObjectManager.appObjects || new Map();

            if (appObjects instanceof Map) {
                return appObjects.has(packageName);
            } else if (Array.isArray(appObjects)) {
                return appObjects.some(obj => 
                    obj && obj.userData && obj.userData.packageName === packageName
                );
            }

            return false;
        }

        /**
         * Get list of active app package names
         */
        getActiveAppPackageNames() {
            const activeApps = this.getAppFilesForMenuSync();
            return activeApps.map(app => app.packageName);
        }

        /**
         * Notify Flutter about app deletion for menu sync
         */
        notifyFlutterAppDeleted(packageName, appName) {
            console.log('🔄 Notifying Flutter about app deletion for menu sync:', packageName, appName);
            
            const appFilePath = `app_${packageName}`;
            
            // Method 1: Direct Flutter call if available
            if (this.isFlutterBridgeAvailable) {
                try {
                    window.flutter_inappwebview.callHandler('removeAppFile', {
                        packageName: packageName,
                        appName: appName,
                        filePath: appFilePath,
                        action: 'removeFromFavorites'
                    }).then(() => {
                        console.log('🔄 Flutter notified about app deletion via callHandler');
                    }).catch(err => {
                        console.warn('🔄 Error notifying Flutter via callHandler:', err);
                        this.notifyFlutterAppDeletedFallback(packageName, appName);
                    });
                    return;
                } catch (e) {
                    console.warn('🔄 Error with Flutter callHandler:', e);
                }
            }
            
            // Fallback method
            this.notifyFlutterAppDeletedFallback(packageName, appName);
        }

        /**
         * Fallback method to notify Flutter about app deletion
         */
        notifyFlutterAppDeletedFallback(packageName, appName) {
            // Set window flags for Flutter to detect and process
            window.lastDeletedAppForMenuSync = {
                packageName: packageName,
                name: appName,
                filePath: `app_${packageName}`,
                action: 'removeFromFavorites',
                timestamp: Date.now()
            };
            
            console.log('🔄 Set window flag for app deletion sync:', window.lastDeletedAppForMenuSync);
        }

        /**
         * Notify Flutter about app restoration for menu sync
         */
        notifyFlutterAppRestored(packageName, appName) {
            console.log('🔄 Notifying Flutter about app restoration for menu sync:', packageName, appName);
            
            const appFilePath = `app_${packageName}`;
            
            // Method 1: Direct Flutter call if available
            if (this.isFlutterBridgeAvailable) {
                try {
                    window.flutter_inappwebview.callHandler('addAppFile', {
                        packageName: packageName,
                        appName: appName,
                        filePath: appFilePath,
                        action: 'addToFavorites'
                    }).then(() => {
                        console.log('🔄 Flutter notified about app restoration via callHandler');
                    }).catch(err => {
                        console.warn('🔄 Error notifying Flutter via callHandler:', err);
                        this.notifyFlutterAppRestoredFallback(packageName, appName);
                    });
                    return;
                } catch (e) {
                    console.warn('🔄 Error with Flutter callHandler:', e);
                }
            }
            
            // Fallback method
            this.notifyFlutterAppRestoredFallback(packageName, appName);
        }

        /**
         * Fallback method to notify Flutter about app restoration
         */
        notifyFlutterAppRestoredFallback(packageName, appName) {
            // Set window flags for Flutter to detect and process
            window.lastRestoredAppForMenuSync = {
                packageName: packageName,
                name: appName,
                filePath: `app_${packageName}`,
                action: 'addToFavorites',
                timestamp: Date.now()
            };
            
            console.log('🔄 Set window flag for app restoration sync:', window.lastRestoredAppForMenuSync);
        }

        /**
         * Get VirtualObjectManager instance
         */
        getVirtualObjectManager() {
            // Try multiple ways to get the manager
            if (window.getVirtualObjectManager) {
                return window.getVirtualObjectManager();
            }
            
            if (window.virtualObjectManager) {
                return window.virtualObjectManager;
            }
            
            // Try to get from app instance
            if (window.app && window.app.virtualObjectManager) {
                return window.app.virtualObjectManager;
            }
            
            console.warn('🔄 VirtualObjectManager not found');
            return null;
        }

        /**
         * Debug method to get sync status
         */
        getAppSyncStatus() {
            return {
                activeApps: this.getAppFilesForMenuSync(),
                pendingDeletion: window.lastDeletedAppForMenuSync || null,
                pendingRestoration: window.lastRestoredAppForMenuSync || null,
                isFlutterBridgeAvailable: this.isFlutterBridgeAvailable,
                syncStatus: 'Available for Flutter app menu sync'
            };
        }
    }

    // Create global instance
    window.appSyncBridge = new AppSyncBridge();

    // ============================================================================
    // GLOBAL FLUTTER BRIDGE FUNCTIONS
    // ============================================================================

    /**
     * Handler for Flutter to get current app files (mirrors contact system)
     */
    window.getAppFiles = function() {
        console.log('🔄 Flutter requesting app files for menu sync');
        return window.appSyncBridge.getAppFilesForMenuSync();
    };

    /**
     * Handler for Flutter to check if specific app is active in 3D world
     */
    window.isAppActive = function(packageName) {
        return window.appSyncBridge.isAppActive(packageName);
    };

    /**
     * Handler for Flutter to get active app package names for menu validation
     */
    window.getActiveAppPackageNames = function() {
        return window.appSyncBridge.getActiveAppPackageNames();
    };

    /**
     * Debug function for Flutter to analyze app menu synchronization
     */
    window.debugAppMenuSync = function() {
        console.log('🔍 DEBUG: App menu synchronization analysis...');
        return window.appSyncBridge.getAppSyncStatus();
    };

    console.log('🔄 App Sync Bridge module loaded successfully!');
    console.log('🔄 Available functions: getAppFiles, isAppActive, getActiveAppPackageNames, debugAppMenuSync');

    // ============================================================================
    // SCORE MANAGEMENT SYSTEM (AppSync)
    // ============================================================================
    
    /**
     * Create the AppSync object that handles score/points management
     * This is what the scoreboard buttons expect to exist
     */
    window.AppSync = {
        // Current stored points
        _totalPoints: 0,
        
        /**
         * Get the current total points
         */
        getTotalPoints: function() {
            // Try to get from entityUIManager first (most up-to-date)
            if (window.entityUIManager && typeof window.entityUIManager.totalPoints === 'number') {
                this._totalPoints = window.entityUIManager.totalPoints;
                return this._totalPoints;
            }
            
            // Try to get from svgEntityManager
            if (window.app && window.app.svgEntityManager && typeof window.app.svgEntityManager.totalPoints === 'number') {
                this._totalPoints = window.app.svgEntityManager.totalPoints;
                return this._totalPoints;
            }
            
            // Return stored value
            return this._totalPoints;
        },
        
        /**
         * Set the total points and update all relevant systems
         */
        setTotalPoints: function(points) {
            console.log(`📊 AppSync: Setting total points to ${points}`);
            
            // Validate input
            if (typeof points !== 'number' || points < 0) {
                console.warn('⚠️ Invalid points value:', points);
                return false;
            }
            
            // Store the value
            this._totalPoints = points;
            
            // Update entityUIManager
            if (window.entityUIManager) {
                window.entityUIManager.totalPoints = points;
                console.log('📊 Updated entityUIManager.totalPoints');
                
                // Trigger UI update if available
                if (typeof window.entityUIManager.updateScoreDisplay === 'function') {
                    window.entityUIManager.updateScoreDisplay();
                }
            }
            
            // Update svgEntityManager
            if (window.app && window.app.svgEntityManager) {
                window.app.svgEntityManager.totalPoints = points;
                console.log('📊 Updated svgEntityManager.totalPoints');
            }
            
            // Trigger any scoreboard updates
            this.triggerScoreboardUpdate();
            
            // Trigger level progression checks
            this.checkLevelProgression(points);
            
            return true;
        },
        
        /**
         * Add points to the current total
         */
        addPoints: function(points) {
            const currentPoints = this.getTotalPoints();
            const newTotal = currentPoints + points;
            return this.setTotalPoints(newTotal);
        },
        
        /**
         * Trigger scoreboard UI updates
         */
        triggerScoreboardUpdate: function() {
            console.log('📊 Triggering scoreboard updates...');
            
            // Update any visible scoreboards
            setTimeout(() => {
                const scoreboard = document.getElementById('full-scoreboard');
                if (scoreboard && scoreboard.style.display !== 'none') {
                    console.log('📊 Refreshing visible scoreboard...');
                    
                    // Try to refresh the scoreboard content directly
                    if (window.entityUIManager && window.entityUIManager.scoreBillboard) {
                        if (typeof window.entityUIManager.scoreBillboard.updateScoreboardContent === 'function') {
                            window.entityUIManager.scoreBillboard.updateScoreboardContent();
                            console.log('📊 Updated scoreboard via entityUIManager');
                        }
                    }
                    
                    // Also try the mobile responsive scoreboard
                    if (window.mobileResponsiveScoreBillboard) {
                        if (typeof window.mobileResponsiveScoreBillboard.updateScoreboardContent === 'function') {
                            window.mobileResponsiveScoreBillboard.updateScoreboardContent();
                            console.log('📊 Updated mobile responsive scoreboard');
                        }
                    }
                    
                    // Dispatch the refresh event
                    const event = new CustomEvent('scoreboardRefresh');
                    window.dispatchEvent(event);
                    scoreboard.dispatchEvent(event);
                }
                
                // Update simple mobile scoreboard if it exists
                if (window.simpleMobileScoreboard && typeof window.simpleMobileScoreboard.updateScoreboardContent === 'function') {
                    window.simpleMobileScoreboard.updateScoreboardContent();
                    console.log('📊 Updated simple mobile scoreboard');
                }
                
                // Force recreation of scoreboard content if needed
                const activeScoreboard = document.getElementById('full-scoreboard');
                if (activeScoreboard && activeScoreboard.style.display !== 'none') {
                    // Find the scoreboard instance and force content refresh
                    if (window.entityUIManager && window.entityUIManager.scoreBillboard && 
                        typeof window.entityUIManager.scoreBillboard.showFullScoreboard === 'function') {
                        // Hide and re-show to force content refresh
                        window.entityUIManager.scoreBillboard.hideFullScoreboard();
                        setTimeout(() => {
                            window.entityUIManager.scoreBillboard.showFullScoreboard();
                        }, 50);
                    }
                }
                
            }, 100);
        },
        
        /**
         * Check if points qualify for level progression
         */
        checkLevelProgression: function(points) {
            const level = this.getCurrentLevel(points);
            console.log(`📊 Current level: ${level} (${points} points)`);
            
            // Trigger level progression events if needed
            if (window.entityUIManager && window.entityUIManager.progressionNotifier) {
                // Trigger progression check
                setTimeout(() => {
                    window.entityUIManager.progressionNotifier.checkLevelProgression();
                }, 200);
            }
        },
        
        /**
         * Get current level based on points
         */
        getCurrentLevel: function(points = null) {
            if (points === null) {
                points = this.getTotalPoints();
            }
            
            if (points >= 120000) return 7;
            if (points >= 80000) return 6;
            if (points >= 55000) return 5;
            if (points >= 35000) return 4;
            if (points >= 20000) return 3;
            if (points >= 10000) return 2;
            return 1;
        },
        
        /**
         * Check if a specific level is unlocked
         */
        isLevelUnlocked: function(level) {
            const points = this.getTotalPoints();
            const thresholds = {
                1: 0,
                2: 10000,
                3: 20000,
                4: 35000,
                5: 55000,
                6: 80000,
                7: 120000
            };
            
            return points >= (thresholds[level] || 0);
        }
    };
    
    // Initialize the AppSync system
    window.AppSync.getTotalPoints(); // Load current points from existing systems
    console.log('📊 AppSync system initialized with score management');

})();