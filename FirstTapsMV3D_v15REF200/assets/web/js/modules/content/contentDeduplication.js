/**
 * CONTENT DEDUPLICATION TRACKER
 * Tracks recently shown URLs to prevent immediate repetition
 * Uses localStorage for persistence across sessions
 */

(function() {
    'use strict';

    class ContentDeduplicationTracker {
        constructor() {
            this.storageKey = 'mv3d_content_history';
            this.maxHistoryDays = 7; // Don't show same URL within 7 days
            this.maxHistorySize = 500; // Keep max 500 entries
            
            // Initialize from localStorage
            this.loadHistory();
        }

        /**
         * Load history from localStorage
         */
        loadHistory() {
            try {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    this.history = JSON.parse(stored);
                    // Clean old entries on load
                    this.cleanOldEntries();
                } else {
                    this.history = {};
                }
            } catch (e) {
                console.warn('⚠️ Failed to load content history:', e);
                this.history = {};
            }
        }

        /**
         * Save history to localStorage
         */
        saveHistory() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.history));
            } catch (e) {
                console.warn('⚠️ Failed to save content history:', e);
            }
        }

        /**
         * Remove entries older than maxHistoryDays
         */
        cleanOldEntries() {
            const now = Date.now();
            const maxAge = this.maxHistoryDays * 24 * 60 * 60 * 1000; // days to ms
            let cleaned = 0;

            for (const url in this.history) {
                const lastShown = this.history[url];
                if (now - lastShown > maxAge) {
                    delete this.history[url];
                    cleaned++;
                }
            }

            if (cleaned > 0) {
                console.log(`🧹 Cleaned ${cleaned} old entries from content history`);
                this.saveHistory();
            }
        }

        /**
         * Mark a URL as shown
         * @param {string} url - The content URL
         */
        markAsShown(url) {
            if (!url) return;

            this.history[url] = Date.now();
            
            // Limit history size
            const entries = Object.entries(this.history);
            if (entries.length > this.maxHistorySize) {
                // Sort by timestamp and keep newest entries
                entries.sort((a, b) => b[1] - a[1]);
                this.history = {};
                entries.slice(0, this.maxHistorySize).forEach(([url, timestamp]) => {
                    this.history[url] = timestamp;
                });
            }

            this.saveHistory();
        }

        /**
         * Mark multiple URLs as shown
         * @param {Array<string>} urls - Array of URLs
         */
        markMultipleAsShown(urls) {
            if (!Array.isArray(urls)) return;

            urls.forEach(url => {
                if (url) {
                    this.history[url] = Date.now();
                }
            });

            this.saveHistory();
        }

        /**
         * Check if a URL was shown recently
         * @param {string} url - The content URL
         * @param {number} withinDays - Check if shown within this many days (default: maxHistoryDays)
         * @returns {boolean}
         */
        wasShownRecently(url, withinDays = null) {
            if (!url || !this.history[url]) return false;

            const days = withinDays !== null ? withinDays : this.maxHistoryDays;
            const maxAge = days * 24 * 60 * 60 * 1000;
            const age = Date.now() - this.history[url];

            return age < maxAge;
        }

        /**
         * Filter out recently shown URLs from a list
         * @param {Array<string>} urls - Array of URLs to filter
         * @param {number} withinDays - Exclude URLs shown within this many days
         * @returns {Array<string>} - Filtered URLs
         */
        filterRecentlyShown(urls, withinDays = null) {
            if (!Array.isArray(urls)) return [];

            const filtered = urls.filter(url => !this.wasShownRecently(url, withinDays));

            const removedCount = urls.length - filtered.length;
            if (removedCount > 0) {
                console.log(`🔄 Deduplication: Filtered out ${removedCount} recently shown URLs`);
            }

            return filtered;
        }

        /**
         * Get recently shown URLs
         * @param {number} withinDays - Get URLs shown within this many days
         * @returns {Array<string>} - Array of URLs
         */
        getRecentlyShown(withinDays = null) {
            const days = withinDays !== null ? withinDays : this.maxHistoryDays;
            const maxAge = days * 24 * 60 * 60 * 1000;
            const now = Date.now();

            return Object.entries(this.history)
                .filter(([url, timestamp]) => (now - timestamp) < maxAge)
                .map(([url]) => url);
        }

        /**
         * Get statistics about content history
         * @returns {Object} - Stats object
         */
        getStats() {
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

            const entries = Object.entries(this.history);
            const last24h = entries.filter(([_, ts]) => ts > oneDayAgo).length;
            const last7d = entries.filter(([_, ts]) => ts > sevenDaysAgo).length;

            return {
                total: entries.length,
                last24Hours: last24h,
                last7Days: last7d,
                oldestEntry: entries.length > 0 ? Math.min(...entries.map(([_, ts]) => ts)) : null
            };
        }

        /**
         * Clear all history
         */
        clearHistory() {
            this.history = {};
            this.saveHistory();
            console.log('🗑️ Content history cleared');
        }

        /**
         * Clear specific URLs from history
         * Used when furniture slots are removed to allow those URLs to be re-used
         * @param {Array<string>} urls - Array of URLs to remove from history
         */
        clearUrls(urls) {
            if (!Array.isArray(urls) || urls.length === 0) return;

            let clearCount = 0;
            urls.forEach(url => {
                if (url && this.history[url]) {
                    delete this.history[url];
                    clearCount++;
                }
            });

            if (clearCount > 0) {
                this.saveHistory();
                console.log(`🧹 Cleared ${clearCount} URLs from deduplication history`);
            }
        }

        /**
         * Log current state for debugging
         */
        debugLog() {
            const stats = this.getStats();
            console.log('📊 Content Deduplication Stats:', stats);
            console.log('📋 Recent URLs (last 24h):', this.getRecentlyShown(1));
        }
    }

    // Export for module systems and global access
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ContentDeduplicationTracker;
    }

    // Create global instance
    window.ContentDeduplicationTracker = ContentDeduplicationTracker;
    window.contentDeduplication = new ContentDeduplicationTracker();

    console.log('✅ ContentDeduplicationTracker module loaded');

})();
