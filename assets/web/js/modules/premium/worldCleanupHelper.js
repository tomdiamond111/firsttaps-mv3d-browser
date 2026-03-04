/**
 * WORLD CLEANUP HELPER (Conservative Approach)
 * Provides safe cleanup functionality for new world templates
 * WITHOUT modifying existing world template cleanup methods
 * 
 * SAFETY GUARANTEE: Only manages objects from NEW templates, preserves all existing cleanup
 */

(function() {
    'use strict';
    
    console.log('🧹 Loading WorldCleanupHelper (Conservative)...');

    /**
     * Conservative World Cleanup Helper
     * Only tracks and cleans up objects from NEW world templates
     * Preserves all existing world cleanup functionality
     */
    class WorldCleanupHelper {
        constructor() {
            this.trackedObjects = new Map(); // Only track NEW objects we add
            this.originalCleanupMethods = new Map(); // Preserve original cleanup methods
            this.objectMetadata = new Map(); // Store metadata about tracked objects
            
            console.log('🧹 WorldCleanupHelper initialized (conservative mode)');
            console.log('🧹 Existing cleanup methods preserved for all existing worlds');
        }
        
        /**
         * CONSERVATIVE: Only track objects from NEW world templates
         * Does not interfere with existing world template object management
         */
        trackObjectForNewTemplate(worldTemplate, object, objectType = 'decoration', metadata = {}) {
            try {
                const worldId = worldTemplate.constructor.name;
                
                // Only track if this is a new template (safety check)
                if (!this.isNewTemplate(worldTemplate)) {
                    console.warn(`🧹 Skipping tracking for existing world template: ${worldId}`);
                    return false;
                }
                
                if (!this.trackedObjects.has(worldId)) {
                    this.trackedObjects.set(worldId, new Set());
                }
                
                this.trackedObjects.get(worldId).add(object);
                
                // Store metadata about the object
                this.objectMetadata.set(object, {
                    worldId: worldId,
                    objectType: objectType,
                    createdAt: Date.now(),
                    ...metadata
                });
                
                console.log(`🧹 Tracking object for new template ${worldId}: ${objectType}`);
                return true;
                
            } catch (error) {
                console.error('🧹 Error tracking object:', error);
                return false;
            }
        }
        
        /**
         * CONSERVATIVE: Only clean up objects we specifically tracked
         * Does not interfere with existing world cleanup methods
         */
        cleanupNewTemplateObjects(worldTemplate) {
            try {
                const worldId = worldTemplate.constructor.name;
                const objects = this.trackedObjects.get(worldId);
                
                if (!objects || objects.size === 0) {
                    console.log(`🧹 No tracked objects to clean up for ${worldId}`);
                    return;
                }
                
                console.log(`🧹 Helper cleaning up ${objects.size} tracked objects for ${worldId}`);
                
                let cleanedCount = 0;
                let errorCount = 0;
                
                objects.forEach(object => {
                    try {
                        const metadata = this.objectMetadata.get(object);
                        
                        // Remove from scene if it has a parent
                        if (object.parent) {
                            object.parent.remove(object);
                        }
                        
                        // Safe disposal
                        this.safeDisposeObject(object);
                        
                        // Clean up metadata
                        this.objectMetadata.delete(object);
                        
                        cleanedCount++;
                        
                        if (metadata) {
                            console.log(`🧹 Cleaned ${metadata.objectType} object (age: ${Date.now() - metadata.createdAt}ms)`);
                        }
                        
                    } catch (error) {
                        console.warn(`🧹 Error cleaning individual object (non-critical):`, error);
                        errorCount++;
                    }
                });
                
                // Clear the tracked objects set
                objects.clear();
                
                console.log(`🧹 Cleanup complete for ${worldId}: ${cleanedCount} objects cleaned, ${errorCount} errors`);
                
            } catch (error) {
                console.error('🧹 Error during new template cleanup:', error);
            }
        }
        
        /**
         * Safe object disposal that handles various Three.js object types
         */
        safeDisposeObject(object) {
            try {
                // Dispose geometry
                if (object.geometry) {
                    object.geometry.dispose();
                }
                
                // Dispose material(s)
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => {
                            this.disposeMaterial(material);
                        });
                    } else {
                        this.disposeMaterial(object.material);
                    }
                }
                
                // Dispose texture(s) if directly attached
                if (object.texture) {
                    if (Array.isArray(object.texture)) {
                        object.texture.forEach(texture => texture.dispose());
                    } else {
                        object.texture.dispose();
                    }
                }
                
                // Handle children recursively
                if (object.children && object.children.length > 0) {
                    [...object.children].forEach(child => {
                        this.safeDisposeObject(child);
                    });
                }
                
            } catch (error) {
                console.warn('🧹 Safe disposal warning (non-critical):', error);
            }
        }
        
        /**
         * Safely dispose of a Three.js material and its textures
         */
        disposeMaterial(material) {
            try {
                // Dispose textures in material
                Object.keys(material).forEach(key => {
                    const value = material[key];
                    if (value && typeof value.dispose === 'function' && value.isTexture) {
                        value.dispose();
                    }
                });
                
                // Dispose the material itself
                material.dispose();
                
            } catch (error) {
                console.warn('🧹 Material disposal warning (non-critical):', error);
            }
        }
        
        /**
         * Check if a world template is a new template (uses helper system)
         */
        isNewTemplate(worldTemplate) {
            return worldTemplate && worldTemplate.isSimpleTemplate === true;
        }
        
        /**
         * Get statistics about tracked objects
         */
        getStatistics() {
            const stats = {
                totalWorlds: this.trackedObjects.size,
                totalObjects: 0,
                worldDetails: {}
            };
            
            this.trackedObjects.forEach((objects, worldId) => {
                stats.totalObjects += objects.size;
                stats.worldDetails[worldId] = {
                    objectCount: objects.size,
                    objectTypes: {}
                };
                
                // Count object types
                objects.forEach(object => {
                    const metadata = this.objectMetadata.get(object);
                    const type = metadata ? metadata.objectType : 'unknown';
                    stats.worldDetails[worldId].objectTypes[type] = 
                        (stats.worldDetails[worldId].objectTypes[type] || 0) + 1;
                });
            });
            
            return stats;
        }
        
        /**
         * Emergency cleanup for all tracked objects (debug/recovery)
         */
        emergencyCleanupAll() {
            console.warn('🚨 Emergency cleanup of all tracked objects!');
            
            this.trackedObjects.forEach((objects, worldId) => {
                console.warn(`🚨 Emergency cleanup for ${worldId}: ${objects.size} objects`);
                
                objects.forEach(object => {
                    try {
                        if (object.parent) {
                            object.parent.remove(object);
                        }
                        this.safeDisposeObject(object);
                    } catch (error) {
                        console.error('🚨 Emergency cleanup error:', error);
                    }
                });
                
                objects.clear();
            });
            
            this.objectMetadata.clear();
            console.warn('🚨 Emergency cleanup complete');
        }
        
        /**
         * Debug method to verify system integrity
         */
        verifySystemIntegrity() {
            const stats = this.getStatistics();
            
            console.log('🔍 WorldCleanupHelper System Status:');
            console.log(`   Total worlds with tracked objects: ${stats.totalWorlds}`);
            console.log(`   Total tracked objects: ${stats.totalObjects}`);
            console.log(`   World details:`, stats.worldDetails);
            
            return stats;
        }
    }
    
    // Create global instance
    window.WorldCleanupHelper = WorldCleanupHelper;
    window.worldCleanupHelper = new WorldCleanupHelper();
    
    // Debug functions
    window.checkWorldCleanup = function() {
        if (window.worldCleanupHelper) {
            return window.worldCleanupHelper.verifySystemIntegrity();
        }
        return { error: 'Cleanup helper not available' };
    };
    
    window.emergencyCleanupAllWorldObjects = function() {
        if (window.worldCleanupHelper) {
            window.worldCleanupHelper.emergencyCleanupAll();
        } else {
            console.error('Cleanup helper not available');
        }
    };
    
    console.log('🧹 WorldCleanupHelper loaded successfully!');
    console.log('🧹 Use window.checkWorldCleanup() to verify system status');
    console.log('🧹 Use window.emergencyCleanupAllWorldObjects() for emergency cleanup');
    
})();