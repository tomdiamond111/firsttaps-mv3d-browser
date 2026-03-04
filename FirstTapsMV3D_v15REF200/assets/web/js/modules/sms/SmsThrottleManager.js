/**
 * SmsThrottleManager - Handles request throttling and performance optimization
 * Extracted from smsChannelManager.js for better maintainability
 */
(function() {
    'use strict';

    class SmsThrottleManager {
        constructor() {
            // Throttling maps to prevent infinite refresh loops
            this.lastRequestTime = new Map();
            this.lastRefreshTime = new Map();
            this.pendingRequests = new Set();
            this.pendingRefreshes = new Set();
            this.newMessageActivity = new Map();
            
            console.log('📱 SmsThrottleManager initialized');
        }

        /**
         * Check if a request should be throttled
         */
        shouldThrottleRequest(requestKey, throttleTime = 1000, forceRefresh = false) {
            const now = Date.now();
            const lastRequest = this.lastRequestTime.get(requestKey) || 0;
            const isNewMessageContext = this.isNewMessageContext(requestKey.split('_')[1]); // Extract contactId
            const shouldBypass = forceRefresh || isNewMessageContext;
            
            if (!shouldBypass && now - lastRequest < throttleTime) {
                console.log(`📱 [Throttle] Blocking request ${requestKey} (${now - lastRequest}ms ago)`);
                return true;
            }
            
            this.lastRequestTime.set(requestKey, now);
            return false;
        }

        /**
         * Check if a conversation request should be throttled
         */
        shouldThrottleConversation(contactId, forceRefresh = false) {
            if (this.pendingRequests.has(contactId) && !forceRefresh) {
                console.log(`📱 [Throttle] Request already pending for contact ${contactId}`);
                return true;
            }
            
            const requestKey = `getConversation_${contactId}`;
            const isNewMessageContext = this.isNewMessageContext(contactId);
            const shouldBypass = forceRefresh || isNewMessageContext;
            const throttleTime = shouldBypass ? 100 : 500;
            
            if (this.shouldThrottleRequest(requestKey, throttleTime, shouldBypass)) {
                return true;
            }
            
            if (shouldBypass && this.pendingRequests.has(contactId)) {
                console.log(`📱 [Throttle] Clearing stale pending request for critical update`);
                this.pendingRequests.delete(contactId);
            }
            
            this.pendingRequests.add(contactId);
            return false;
        }

        /**
         * Check if a refresh should be throttled
         */
        shouldThrottleRefresh(contactId) {
            if (this.pendingRefreshes.has(contactId)) {
                console.log(`📱 [Throttle] Refresh already pending for contact ${contactId}`);
                return true;
            }
            
            const refreshKey = `refresh_${contactId}`;
            const now = Date.now();
            const lastRefresh = this.lastRefreshTime.get(refreshKey) || 0;
            
            if (now - lastRefresh < 2000) { // 2 second throttle for refreshes
                console.log(`📱 [Throttle] Blocking refresh for ${contactId} (${now - lastRefresh}ms ago)`);
                return true;
            }
            
            this.pendingRefreshes.add(contactId);
            this.lastRefreshTime.set(refreshKey, now);
            return false;
        }

        /**
         * Clear pending request for a contact
         */
        clearPendingRequest(contactId) {
            this.pendingRequests.delete(contactId);
        }

        /**
         * Clear pending refresh for a contact
         */
        clearPendingRefresh(contactId) {
            this.pendingRefreshes.delete(contactId);
        }

        /**
         * Check if a contact has recent new message activity
         */
        isNewMessageContext(contactId) {
            if (!this.newMessageActivity) return false;
            const activity = this.newMessageActivity.get(contactId);
            // Activity is valid for 5 seconds
            return activity && (Date.now() - activity.timestamp < 5000);
        }

        /**
         * Mark a contact as having new message activity to bypass throttling
         */
        markNewMessageActivity(contactId, type = 'received') {
            if (!this.newMessageActivity) {
                this.newMessageActivity = new Map();
            }
            console.log(`📱 [Activity] Marking new message activity for contact ${contactId} of type: ${type}`);
            this.newMessageActivity.set(contactId, { type, timestamp: Date.now() });
        }

        /**
         * Clear all pending operations and reset state
         */
        clearAllPending() {
            console.log('📱 [Throttle] Clearing all pending operations');
            this.pendingRequests.clear();
            this.pendingRefreshes.clear();
            this.newMessageActivity.clear();
            this.lastRequestTime.clear();
            this.lastRefreshTime.clear();
        }

        /**
         * Get throttle statistics for debugging
         */
        getStats() {
            return {
                pendingRequests: Array.from(this.pendingRequests),
                pendingRefreshes: Array.from(this.pendingRefreshes),
                activeMessageActivity: Array.from(this.newMessageActivity.keys()),
                totalRequests: this.lastRequestTime.size,
                totalRefreshes: this.lastRefreshTime.size
            };
        }
    }

    // Export to global scope
    window.SmsThrottleManager = SmsThrottleManager;
    console.log('📱 SmsThrottleManager class exported to window');

})();
