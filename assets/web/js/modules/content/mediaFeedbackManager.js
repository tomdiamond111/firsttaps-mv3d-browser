/**
 * MEDIA FEEDBACK MANAGER
 * Manages user likes/dislikes for content links
 * Stores feedback in localStorage and integrates with ContentPreferenceLearningService
 */

(function() {
    'use strict';

    class MediaFeedbackManager {
        constructor() {
            // Singleton pattern - return existing instance if it exists
            if (MediaFeedbackManager.instance) {
                return MediaFeedbackManager.instance;
            }
            
            MediaFeedbackManager.instance = this;
            this.storageKey = 'mv3d_content_feedback';
            this.feedback = {}; // {url: {sentiment, timestamp, platform, title, genre}}
            
            // Load existing feedback
            this.loadFeedback();
            
            console.log('📊 MediaFeedbackManager initialized');
        }

        /**
         * Get singleton instance
         * @returns {MediaFeedbackManager}
         */
        static getInstance() {
            if (!MediaFeedbackManager.instance) {
                MediaFeedbackManager.instance = new MediaFeedbackManager();
            }
            return MediaFeedbackManager.instance;
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
            } catch (e) {
                console.warn('⚠️ Failed to save feedback:', e);
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

            // Normalize sentiment values
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
            
            // Integrate with ContentPreferenceLearningService for dislike pattern learning
            if (sentiment === 'disliked' && window.contentPreferenceLearningService) {
                console.log('📝 Recording dislike for pattern learning...');
                window.contentPreferenceLearningService.recordDislike({
                    url: url,
                    title: metadata.title || 'Untitled',
                    platform: metadata.platform || 'unknown',
                    channelTitle: metadata.channelTitle || null,
                    language: metadata.language || null,
                    tags: metadata.tags || null,
                    genre: metadata.genre || null
                });
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
                console.log(`🗑️ Removed feedback for: ${url}`);
            }
        }

        /**
         * Get all liked URLs
         * @returns {Array<string>}
         */
        getLikedUrls() {
            return Object.keys(this.feedback).filter(url => 
                this.feedback[url].sentiment === 'liked'
            );
        }

        /**
         * Get all disliked URLs
         * @returns {Array<string>}
         */
        getDislikedUrls() {
            return Object.keys(this.feedback).filter(url => 
                this.feedback[url].sentiment === 'disliked'
            );
        }

        /**
         * Get feedback statistics
         * @returns {Object} - {total, liked, disliked}
         */
        getStats() {
            const liked = this.getLikedUrls().length;
            const disliked = this.getDislikedUrls().length;
            return {
                total: Object.keys(this.feedback).length,
                liked,
                disliked
            };
        }

        /**
         * Clear all feedback
         */
        clearAll() {
            this.feedback = {};
            this.saveFeedback();
            console.log('🗑️ Cleared all feedback');
        }
    }

    // Initialize global singleton instance
    window.mediaFeedback = MediaFeedbackManager.getInstance();
    console.log('✅ window.mediaFeedback singleton initialized');

})();
