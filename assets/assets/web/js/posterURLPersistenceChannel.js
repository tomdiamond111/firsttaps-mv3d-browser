/**
 * PosterURLPersistenceChannel - JavaScript module for communicating with Flutter
 * to persist poster URLs across app restarts and world switches
 */

class PosterURLPersistenceChannel {
    constructor() {
        this.isFlutterInitialized = false;
        this.pendingOperations = [];
        
        // Initialize Flutter communication when available
        this.initializeFlutterChannel();
    }

    /**
     * Initialize Flutter channel communication
     */
    initializeFlutterChannel() {
        // Check if we're running in Flutter WebView with JavaScript channels
        if (typeof window.posterURLPersistence !== 'undefined') {
            this.isFlutterInitialized = true;
            console.log('[PosterURLPersistence] Flutter channel initialized');
            
            // Process any pending operations
            this.processPendingOperations();
        } else {
            // Retry after a short delay if Flutter isn't ready yet
            setTimeout(() => this.initializeFlutterChannel(), 100);
        }
    }

    /**
     * Process operations that were queued before Flutter was available
     */
    processPendingOperations() {
        while (this.pendingOperations.length > 0) {
            const operation = this.pendingOperations.shift();
            operation();
        }
    }

    /**
     * Send message to Flutter with retry logic
     */
    sendToFlutter(message) {
        if (this.isFlutterInitialized && window.posterURLPersistence) {
            try {
                console.log('[PosterURLPersistence] Sending to Flutter:', message);
                window.posterURLPersistence.postMessage(JSON.stringify(message));
                return true;
            } catch (error) {
                console.error('[PosterURLPersistence] Error sending to Flutter:', error);
                return false;
            }
        } else {
            // Queue the operation if Flutter isn't ready
            this.pendingOperations.push(() => this.sendToFlutter(message));
            console.log('[PosterURLPersistence] Flutter not ready, queuing operation');
            return false;
        }
    }

    /**
     * Save poster URLs for a specific world
     * @param {string} worldType - The world type (e.g., 'dazzle', 'green-plane', 'space', 'ocean')
     * @param {Object} posterData - Object containing poster URLs keyed by posterType
     */
    savePosterURLsForWorld(worldType, posterData) {
        const message = {
            action: 'savePosterURLsForWorld',
            worldType: worldType,
            posterData: posterData,
            timestamp: Date.now()
        };

        console.log(`[PosterURLPersistence] Saving poster URLs for ${worldType}:`, posterData);
        return this.sendToFlutter(message);
    }

    /**
     * Load poster URLs for a specific world
     * @param {string} worldType - The world type to load URLs for
     * @param {Function} callback - Callback function to receive the loaded data
     */
    loadPosterURLsForWorld(worldType, callback) {
        const message = {
            action: 'loadPosterURLsForWorld',
            worldType: worldType,
            timestamp: Date.now()
        };

        console.log(`[PosterURLPersistence] Loading poster URLs for ${worldType}`);
        
        // Store callback for when Flutter responds
        const callbackId = 'poster_load_' + Date.now() + '_' + Math.random();
        this.pendingCallbacks = this.pendingCallbacks || {};
        this.pendingCallbacks[callbackId] = callback;
        
        message.callbackId = callbackId;
        this.sendToFlutter(message);
    }

    /**
     * Save a single poster URL
     * @param {string} worldType - The world type
     * @param {string} posterType - The poster identifier (e.g., 'poster1', 'poster2')
     * @param {string} url - The URL to save
     */
    saveSinglePosterURL(worldType, posterType, url) {
        const message = {
            action: 'saveSinglePosterURL',
            worldType: worldType,
            posterType: posterType,
            url: url,
            timestamp: Date.now()
        };

        console.log(`[PosterURLPersistence] Saving single poster URL for ${worldType}.${posterType}:`, url);
        return this.sendToFlutter(message);
    }

    /**
     * Clear all poster URLs for a specific world
     * @param {string} worldType - The world type to clear
     */
    clearPosterURLsForWorld(worldType) {
        const message = {
            action: 'clearPosterURLsForWorld',
            worldType: worldType,
            timestamp: Date.now()
        };

        console.log(`[PosterURLPersistence] Clearing poster URLs for ${worldType}`);
        return this.sendToFlutter(message);
    }

    /**
     * Clear all poster URLs across all worlds
     */
    clearAllPosterURLs() {
        const message = {
            action: 'clearAllPosterURLs',
            timestamp: Date.now()
        };

        console.log('[PosterURLPersistence] Clearing all poster URLs');
        return this.sendToFlutter(message);
    }

    /**
     * Handle response from Flutter
     * @param {Object} response - Response from Flutter
     */
    handleFlutterResponse(response) {
        console.log('[PosterURLPersistence] Received Flutter response:', response);
        
        if (response.callbackId && this.pendingCallbacks && this.pendingCallbacks[response.callbackId]) {
            const callback = this.pendingCallbacks[response.callbackId];
            delete this.pendingCallbacks[response.callbackId];
            
            if (callback && typeof callback === 'function') {
                callback(response.success, response.data, response.error);
            }
        }
    }

    /**
     * Get debug information about the current state
     */
    getDebugInfo() {
        return {
            isFlutterInitialized: this.isFlutterInitialized,
            pendingOperationsCount: this.pendingOperations.length,
            pendingCallbacksCount: this.pendingCallbacks ? Object.keys(this.pendingCallbacks).length : 0,
            hasPosterURLPersistenceChannel: typeof window.posterURLPersistence !== 'undefined'
        };
    }
}

// Create global instance
window.posterURLPersistenceChannel = new PosterURLPersistenceChannel();

// Expose handleFlutterResponse globally for Flutter to call
window.handlePosterURLPersistenceResponse = function(response) {
    window.posterURLPersistenceChannel.handleFlutterResponse(response);
};

console.log('[PosterURLPersistence] Channel initialized and ready');