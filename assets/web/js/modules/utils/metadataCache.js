// modules/utils/metadataCache.js
// Long-duration localStorage-based caching for platform metadata and thumbnails
// Reduces API calls and improves performance

(function() {
    'use strict';
    
    const DEBUG = false;
    
    /**
     * MetadataCache - localStorage-based caching for platform metadata
     * 
     * Cache Structure:
     * {
     *   url: string,
     *   thumbnailUrl: string,
     *   metadata: object,
     *   cachedAt: timestamp,
     *   expiresAt: timestamp
     * }
     */
    class MetadataCache {
        constructor() {
            this.storagePrefix = 'mv3d_metadata_';
            this.defaultTTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            
            if (DEBUG) console.log('MetadataCache initialized');
        }

        /**
         * Generate cache key from URL
         * @param {string} url - Content URL
         * @returns {string} - Cache key
         */
        _getCacheKey(url) {
            // Use URL as key (no hashing needed for localStorage)
            return this.storagePrefix + encodeURIComponent(url);
        }

        /**
         * Get cached metadata for URL
         * @param {string} url - Content URL
         * @returns {object|null} - Cached data or null if not found/expired
         */
        get(url) {
            try {
                const cacheKey = this._getCacheKey(url);
                const cachedItem = localStorage.getItem(cacheKey);
                
                if (!cachedItem) {
                    if (DEBUG) console.log('💾 [CACHE MISS]', url);
                    return null;
                }
                
                const data = JSON.parse(cachedItem);
                
                // Check expiration
                if (Date.now() > data.expiresAt) {
                    if (DEBUG) console.log('💾 [CACHE EXPIRED]', url);
                    // Remove expired cache
                    localStorage.removeItem(cacheKey);
                    return null;
                }
                
                if (DEBUG) console.log('💾 [CACHE HIT]', url, '- Age:', Math.floor((Date.now() - data.cachedAt) / 1000 / 60), 'minutes');
                return data;
                
            } catch (error) {
                console.error('❌ Error reading from cache:', error);
                return null;
            }
        }

        /**
         * Set cache for URL
         * @param {string} url - Content URL
         * @param {string} thumbnailUrl - Thumbnail URL
         * @param {object} metadata - Additional metadata
         * @param {number} ttl - Time to live in milliseconds (optional)
         */
        set(url, thumbnailUrl, metadata = {}, ttl = this.defaultTTL) {
            try {
                const cacheKey = this._getCacheKey(url);
                const now = Date.now();
                
                const cacheData = {
                    url: url,
                    thumbnailUrl: thumbnailUrl,
                    metadata: metadata,
                    cachedAt: now,
                    expiresAt: now + ttl
                };
                
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                
                if (DEBUG) console.log('💾 [CACHE SET]', url, '- TTL:', Math.floor(ttl / 1000 / 60 / 60), 'hours');
                
            } catch (error) {
                // Handle quota exceeded errors gracefully
                if (error.name === 'QuotaExceededError') {
                    console.warn('⚠️ localStorage quota exceeded, clearing old cache entries');
                    this.clearOldEntries();
                    
                    // Try again after clearing
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                    } catch (retryError) {
                        console.error('❌ Still failed to cache after cleanup:', retryError);
                    }
                } else {
                    console.error('❌ Error writing to cache:', error);
                }
            }
        }

        /**
         * Remove specific cache entry
         * @param {string} url - Content URL
         */
        remove(url) {
            try {
                const cacheKey = this._getCacheKey(url);
                localStorage.removeItem(cacheKey);
                if (DEBUG) console.log('💾 [CACHE REMOVE]', url);
            } catch (error) {
                console.error('❌ Error removing from cache:', error);
            }
        }

        /**
         * Clear all expired cache entries
         */
        clearExpired() {
            try {
                const now = Date.now();
                const keysToRemove = [];
                
                // Find expired entries
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.storagePrefix)) {
                        const item = localStorage.getItem(key);
                        if (item) {
                            const data = JSON.parse(item);
                            if (now > data.expiresAt) {
                                keysToRemove.push(key);
                            }
                        }
                    }
                }
                
                // Remove expired entries
                keysToRemove.forEach(key => localStorage.removeItem(key));
                
                if (keysToRemove.length > 0) {
                    console.log(`💾 Cleared ${keysToRemove.length} expired cache entries`);
                }
                
            } catch (error) {
                console.error('❌ Error clearing expired cache:', error);
            }
        }

        /**
         * Clear old cache entries when quota is exceeded
         * Removes oldest 25% of entries
         */
        clearOldEntries() {
            try {
                const entries = [];
                
                // Collect all cache entries with timestamps
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.storagePrefix)) {
                        const item = localStorage.getItem(key);
                        if (item) {
                            const data = JSON.parse(item);
                            entries.push({
                                key: key,
                                cachedAt: data.cachedAt
                            });
                        }
                    }
                }
                
                // Sort by age (oldest first)
                entries.sort((a, b) => a.cachedAt - b.cachedAt);
                
                // Remove oldest 25%
                const countToRemove = Math.floor(entries.length * 0.25);
                for (let i = 0; i < countToRemove; i++) {
                    localStorage.removeItem(entries[i].key);
                }
                
                console.log(`💾 Cleared ${countToRemove} old cache entries (oldest 25%)`);
                
            } catch (error) {
                console.error('❌ Error clearing old cache entries:', error);
            }
        }

        /**
         * Get cache statistics
         * @returns {object} - Stats object
         */
        getStats() {
            try {
                let count = 0;
                let totalSize = 0;
                let expiredCount = 0;
                const now = Date.now();
                
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.storagePrefix)) {
                        const item = localStorage.getItem(key);
                        if (item) {
                            count++;
                            totalSize += item.length;
                            
                            const data = JSON.parse(item);
                            if (now > data.expiresAt) {
                                expiredCount++;
                            }
                        }
                    }
                }
                
                return {
                    count: count,
                    size: totalSize,
                    sizeKB: Math.round(totalSize / 1024),
                    expiredCount: expiredCount
                };
                
            } catch (error) {
                console.error('❌ Error getting cache stats:', error);
                return { count: 0, size: 0, sizeKB: 0, expiredCount: 0 };
            }
        }

        /**
         * Clear all cache entries
         */
        clearAll() {
            try {
                const keysToRemove = [];
                
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.storagePrefix)) {
                        keysToRemove.push(key);
                    }
                }
                
                keysToRemove.forEach(key => localStorage.removeItem(key));
                
                console.log(`💾 Cleared all ${keysToRemove.length} cache entries`);
                
            } catch (error) {
                console.error('❌ Error clearing all cache:', error);
            }
        }
    }

    // Export for module system
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MetadataCache;
    }

    // Global export for browser
    if (typeof window !== 'undefined') {
        window.MetadataCache = MetadataCache;
        
        // Create global cache instance
        window.metadataCache = new MetadataCache();
        
        // Clear expired entries on page load
        setTimeout(() => {
            window.metadataCache.clearExpired();
        }, 1000);
    }
})();
