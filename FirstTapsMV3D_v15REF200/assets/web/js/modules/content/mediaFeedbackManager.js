/**
 * MEDIA FEEDBACK MANAGER
 * Manages user likes/dislikes for content links
 * Stores feedback in localStorage and communicates with Flutter
 */

(function() {
    'use strict';

    class MediaFeedbackManager {
        constructor() {
            this.storageKey = 'mv3d_content_feedback';
            this.feedback = {}; // {url: {sentiment, timestamp, platform, title}}
            
            // Load existing feedback
            this.loadFeedback();
        }

        /**
         * Load feedback from localStorage
         */
        loadFeedback() {
            try {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    this.feedback = JSON.parse(stored);
                    console.log(`📊 Loaded ${Object.keys(this.feedback).length} feedback entries`);
                } else {
                    this.feedback = {};
                }
            } catch (e) {
                console.warn('⚠️ Failed to load feedback:', e);
                this.feedback = {};
            }
        }

        /**
         * Save feedback to localStorage
         */
        saveFeedback() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.feedback));
                
                // Also notify Flutter
                this.notifyFlutter();
            } catch (e) {
                console.warn('⚠️ Failed to save feedback:', e);
            }
        }

        /**
         * Notify Flutter about feedback changes
         */
        notifyFlutter() {
            if (window.ContentFeedbackChannel) {
                const feedbackData = JSON.stringify({
                    action: 'feedback_updated',
                    totalFeedback: Object.keys(this.feedback).length,
                    liked: this.getLikedUrls().length,
                    disliked: this.getDislikedUrls().length
                });
                
                window.ContentFeedbackChannel.postMessage(feedbackData);
            }
        }

        /**
         * Record user feedback for a URL
         * @param {string} url - Content URL
         * @param {string} sentiment - 'liked' or 'disliked'
         * @param {Object} metadata - {platform, title, genre}
         */
        recordFeedback(url, sentiment, metadata = {}) {
            if (!url || !sentiment) {
                console.warn('⚠️ Invalid feedback data');
                return;
            }

            // Normalize sentiment values: 'like' → 'liked', 'dislike' → 'disliked'
            let normalizedSentiment = sentiment;
            if (sentiment === 'like') normalizedSentiment = 'liked';
            else if (sentiment === 'dislike') normalizedSentiment = 'disliked';

            const validSentiments = ['liked', 'disliked'];
            if (!validSentiments.includes(normalizedSentiment)) {
                console.warn('⚠️ Invalid sentiment:', sentiment);
                return;
            }

            sentiment = normalizedSentiment;

            this.feedback[url] = {
                sentiment,
                timestamp: Date.now(),
                platform: metadata.platform || 'unknown',
                title: metadata.title || 'Untitled',
                genre: metadata.genre || null
            };

            console.log(`${sentiment === 'liked' ? '👍' : '👎'} Feedback recorded: ${metadata.title || url}`);
            
            this.saveFeedback();
            
            // Send individual feedback to Flutter
            if (window.ContentFeedbackChannel) {
                const feedbackData = JSON.stringify({
                    url,
                    sentiment,
                    platform: metadata.platform || 'unknown',
                    title: metadata.title || 'Untitled',
                    genre: metadata.genre || null
                });
                
                window.ContentFeedbackChannel.postMessage(feedbackData);
                console.log('📤 Sent feedback to Flutter:', feedbackData);
            }
        }

        /**
         * Get feedback for a specific URL
         * @param {string} url - Content URL
         * @returns {Object|null} - Feedback object or null
         */
        getFeedback(url) {
            return this.feedback[url] || null;
        }

        /**
         * Check if URL is liked
         * @param {string} url - Content URL
         * @returns {boolean}
         */
        isLiked(url) {
            const feedback = this.getFeedback(url);
            return feedback && feedback.sentiment === 'liked';
        }

        /**
         * Check if URL is disliked
         * @param {string} url - Content URL
         * @returns {boolean}
         */
        isDisliked(url) {
            const feedback = this.getFeedback(url);
            return feedback && feedback.sentiment === 'disliked';
        }

        /**
         * Remove feedback for a URL
         * @param {string} url - Content URL
         */
        removeFeedback(url) {
            if (this.feedback[url]) {
                delete this.feedback[url];
                this.saveFeedback();
                console.log('🗑️ Feedback removed for:', url);
            }
        }

        /**
         * Get all liked URLs
         * @returns {Array<string>}
         */
        getLikedUrls() {
            return Object.entries(this.feedback)
                .filter(([_, data]) => data.sentiment === 'liked')
                .map(([url]) => url);
        }

        /**
         * Get all disliked URLs
         * @returns {Array<string>}
         */
        getDislikedUrls() {
            return Object.entries(this.feedback)
                .filter(([_, data]) => data.sentiment === 'disliked')
                .map(([url]) => url);
        }

        /**
         * Filter out disliked URLs from a list
         * @param {Array<string>} urls - URLs to filter
         * @returns {Array<string>} - Filtered URLs
         */
        filterDisliked(urls) {
            if (!Array.isArray(urls)) return [];

            const disliked = new Set(this.getDislikedUrls());
            const filtered = urls.filter(url => !disliked.has(url));

            const removedCount = urls.length - filtered.length;
            if (removedCount > 0) {
                console.log(`👎 Filtered out ${removedCount} disliked URLs`);
            }

            return filtered;
        }

        /**
         * Get liked URLs by platform
         * @param {string} platform - Platform name (youtube, spotify, etc.)
         * @returns {Array<string>}
         */
        getLikedByPlatform(platform) {
            return Object.entries(this.feedback)
                .filter(([_, data]) => data.sentiment === 'liked' && data.platform === platform)
                .map(([url]) => url);
        }

        /**
         * Get liked URLs by genre
         * @param {string} genre - Genre name
         * @returns {Array<string>}
         */
        getLikedByGenre(genre) {
            return Object.entries(this.feedback)
                .filter(([_, data]) => data.sentiment === 'liked' && data.genre === genre)
                .map(([url]) => url);
        }

        /**
         * Get feedback statistics
         * @returns {Object} - Stats object
         */
        getStats() {
            const entries = Object.entries(this.feedback);
            const liked = entries.filter(([_, data]) => data.sentiment === 'liked');
            const disliked = entries.filter(([_, data]) => data.sentiment === 'disliked');

            // Platform distribution
            const byPlatform = {};
            liked.forEach(([_, data]) => {
                byPlatform[data.platform] = (byPlatform[data.platform] || 0) + 1;
            });

            // Genre distribution
            const byGenre = {};
            liked.forEach(([_, data]) => {
                if (data.genre) {
                    byGenre[data.genre] = (byGenre[data.genre] || 0) + 1;
                }
            });

            return {
                total: entries.length,
                liked: liked.length,
                disliked: disliked.length,
                platformDistribution: byPlatform,
                genreDistribution: byGenre
            };
        }

        /**
         * Clear all feedback
         */
        clearFeedback() {
            this.feedback = {};
            this.saveFeedback();
            console.log('🗑️ All feedback cleared');
        }

        /**
         * Export feedback as JSON
         * @returns {string} - JSON string
         */
        exportFeedback() {
            return JSON.stringify(this.feedback, null, 2);
        }

        /**
         * Import feedback from JSON
         * @param {string} jsonString - JSON string
         */
        importFeedback(jsonString) {
            try {
                const imported = JSON.parse(jsonString);
                this.feedback = { ...this.feedback, ...imported };
                this.saveFeedback();
                console.log('📥 Feedback imported successfully');
            } catch (e) {
                console.error('❌ Failed to import feedback:', e);
            }
        }

        /**
         * Debug log current state
         */
        debugLog() {
            const stats = this.getStats();
            console.log('📊 Feedback Stats:', stats);
            console.log('👍 Liked URLs:', this.getLikedUrls().length);
            console.log('👎 Disliked URLs:', this.getDislikedUrls().length);
        }
    }

    // Export for module systems and global access
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MediaFeedbackManager;
    }

    // Create global instance
    window.MediaFeedbackManager = MediaFeedbackManager;
    window.mediaFeedback = new MediaFeedbackManager();

    console.log('✅ MediaFeedbackManager module loaded');

})();
