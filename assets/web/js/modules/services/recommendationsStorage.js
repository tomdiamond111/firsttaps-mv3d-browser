/**
 * Recommendations Storage Service (Browser Implementation)
 * Uses localStorage for caching recommendation data with expiration
 */

class RecommendationsStorage {
  constructor() {
    this.storagePrefix = 'mv3d_recommendation_';
  }

  /**
   * Get cached recommendation data
   * @param {string} contentType - Content type identifier (e.g., 'shorts', 'music')
   * @returns {Object|null} Cached data or null if not found/expired
   */
  async getCachedRecommendation(contentType) {
    try {
      const key = this.storagePrefix + contentType;
      const cached = localStorage.getItem(key);
      
      if (!cached) {
        console.log(`[RecommendationsStorage] No cache found for ${contentType}`);
        return null;
      }

      const data = JSON.parse(cached);
      
      // Check if expired
      const expiresAt = new Date(data.expiresAt);
      const now = new Date();
      
      if (now > expiresAt) {
        console.log(`[RecommendationsStorage] Cache expired for ${contentType}`);
        this.deleteCachedRecommendation(contentType);
        return null;
      }

      console.log(`[RecommendationsStorage] ✅ Valid cache found for ${contentType} (${data.contentJson ? JSON.parse(data.contentJson).length : 0} items)`);
      return data;
      
    } catch (e) {
      console.error(`[RecommendationsStorage] Error reading cache for ${contentType}:`, e);
      return null;
    }
  }

  /**
   * Save recommendation data to cache
   * @param {Object} cachedRecommendation - Data to cache
   */
  async saveCachedRecommendation(cachedRecommendation) {
    try {
      const key = this.storagePrefix + cachedRecommendation.contentType;
      localStorage.setItem(key, JSON.stringify(cachedRecommendation));
      
      const itemCount = cachedRecommendation.contentJson 
        ? JSON.parse(cachedRecommendation.contentJson).length 
        : 0;
      
      console.log(`[RecommendationsStorage] ✅ Saved ${itemCount} items to cache: ${cachedRecommendation.contentType}`);
    } catch (e) {
      console.error(`[RecommendationsStorage] Error saving cache:`, e);
    }
  }

  /**
   * Delete cached recommendation
   * @param {string} contentType - Content type to delete
   */
  async deleteCachedRecommendation(contentType) {
    try {
      const key = this.storagePrefix + contentType;
      localStorage.removeItem(key);
      console.log(`[RecommendationsStorage] 🗑️ Deleted cache: ${contentType}`);
    } catch (e) {
      console.error(`[RecommendationsStorage] Error deleting cache:`, e);
    }
  }

  /**
   * Clear all recommendation caches
   */
  async clearAllCaches() {
    try {
      const keys = Object.keys(localStorage);
      let cleared = 0;
      
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key);
          cleared++;
        }
      });
      
      console.log(`[RecommendationsStorage] 🗑️ Cleared ${cleared} recommendation caches`);
    } catch (e) {
      console.error(`[RecommendationsStorage] Error clearing caches:`, e);
    }
  }

  /**
   * Get all cached content types
   * @returns {Array<string>} List of cached content types
   */
  async getAllCachedTypes() {
    try {
      const keys = Object.keys(localStorage);
      const types = keys
        .filter(key => key.startsWith(this.storagePrefix))
        .map(key => key.replace(this.storagePrefix, ''));
      
      return types;
    } catch (e) {
      console.error(`[RecommendationsStorage] Error getting cached types:`, e);
      return [];
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  async getCacheStats() {
    try {
      const types = await this.getAllCachedTypes();
      const stats = {};
      
      for (const type of types) {
        const cached = await this.getCachedRecommendation(type);
        if (cached) {
          const items = JSON.parse(cached.contentJson);
          const expiresAt = new Date(cached.expiresAt);
          const fetchedAt = new Date(cached.fetchedAt);
          const now = new Date();
          const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
          
          stats[type] = {
            itemCount: items.length,
            fetchedAt: fetchedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            hoursUntilExpiry: Math.round(hoursUntilExpiry * 10) / 10,
            isValid: now < expiresAt
          };
        }
      }
      
      return stats;
    } catch (e) {
      console.error(`[RecommendationsStorage] Error getting cache stats:`, e);
      return {};
    }
  }
}

// Create singleton instance
const recommendationsStorage = new RecommendationsStorage();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = recommendationsStorage;
}

// Make available globally
window.RecommendationsStorage = RecommendationsStorage;
window.recommendationsStorage = recommendationsStorage;

console.log('✅ RecommendationsStorage loaded');
