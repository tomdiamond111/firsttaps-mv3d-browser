/**
 * LinkNamePersistenceChannel - Communication bridge between JavaScript and Flutter for link name persistence
 * This ensures link names persist correctly through app reloads using Flutter's SharedPreferences
 */

class LinkNamePersistenceChannel {
    constructor() {
        this.channelName = 'LinkNameChangeChannel';
        this.loadCallbacks = new Map(); // For handling async load requests
        this.isReady = false;
        
        console.log('🔗 LinkNamePersistenceChannel created');
        this.initialize();
    }

    /**
     * Initialize the persistence channel
     */
    initialize() {
        try {
            // Set up message listener for responses from Flutter
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'flutter-link-name-response') {
                    this.handleFlutterResponse(event.data);
                }
            });

            this.isReady = true;
            console.log('✅ LinkNamePersistenceChannel: Ready for link name persistence');
        } catch (error) {
            console.error('❌ LinkNamePersistenceChannel: Error during initialization:', error);
        }
    }

    /**
     * Save a custom link name to Flutter SharedPreferences
     */
    async saveLinkName(objectId, customName) {
        try {
            console.log(`🔗 [SAVE] Saving link name: ${objectId} -> "${customName}"`);

            const message = {
                action: 'nameChanged',  // Must match what Dart's handleLinkNameChange() expects
                objectId: objectId,
                customName: customName,
                timestamp: Date.now()
            };

            // PRIMARY: Use postMessage to LinkNameChangeChannel (matches load pattern and exists in Dart)
            if (window.LinkNameChangeChannel && window.LinkNameChangeChannel.postMessage) {
                console.log(`🔗 [SAVE] Calling Flutter LinkNameChangeChannel via postMessage...`);
                window.LinkNameChangeChannel.postMessage(JSON.stringify(message));
                console.log(`✅ [SAVE] Link name save message sent to Flutter: ${objectId} -> "${customName}"`);
                return true;
            }

            // FALLBACK 1: Try flutter_inappwebview.callHandler
            if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                console.log(`🔗 [SAVE] Using flutter_inappwebview.callHandler fallback...`);
                await window.flutter_inappwebview.callHandler('LinkNameChangeChannel', message);
                console.log(`✅ [SAVE] Link name saved via callHandler: ${objectId} -> "${customName}"`);
                return true;
            }

            // FALLBACK 2: dispatch event that three_js_screen.dart can listen for
            console.log(`🔗 [SAVE] Using CustomEvent fallback...`);
            const event = new CustomEvent('linkNameChanged', { detail: message });
            document.dispatchEvent(event);
            console.log(`✅ [SAVE] Link name saved via event dispatch: ${objectId} -> "${customName}"`);

            return true;
        } catch (error) {
            console.error('❌ LinkNamePersistenceChannel: Error saving link name:', error);
            return false;
        }
    }

    /**
     * Load all saved link names from Flutter SharedPreferences
     */
    async loadAllLinkNames() {
        return new Promise((resolve, reject) => {
            console.log('🔗 Loading all saved link names from Flutter...');

            // Set up callback to receive data from Flutter (like avatar system)
            window.linkNameLoadCallback = (data) => {
                console.log('🔗 [LOAD] Received link names from Flutter:', data);
                resolve(data || {});
            };

            try {
                console.log('🔗 [LOAD] Calling Flutter LinkNameLoadChannel via postMessage...');
                
                // Use postMessage like the working avatar system
                window.LinkNameLoadChannel.postMessage(JSON.stringify({
                    action: 'loadAllLinkNames'
                }));
                
                console.log('🔗 [LOAD] Message sent to Flutter, waiting for response...');
                
                // Add timeout in case Flutter doesn't respond
                setTimeout(() => {
                    console.warn('🔗 [LOAD] Timeout waiting for Flutter response');
                    reject(new Error('Timeout waiting for Flutter response'));
                }, 5000);
                
            } catch (error) {
                console.error('🔗 [LOAD] Error calling Flutter:', error);
                reject(error);
            }
        });
    }

    /**
     * Load a specific link name from Flutter SharedPreferences
     */
    async loadLinkName(objectId) {
        try {
            const allNames = await this.loadAllLinkNames();
            return allNames[objectId] || null;
        } catch (error) {
            console.error('❌ LinkNamePersistenceChannel: Error loading specific link name:', error);
            return null;
        }
    }

    /**
     * Handle response from Flutter
     */
    handleFlutterResponse(data) {
        try {
            if (data.requestId && this.loadCallbacks.has(data.requestId)) {
                const callback = this.loadCallbacks.get(data.requestId);
                this.loadCallbacks.delete(data.requestId);

                if (data.success) {
                    callback.resolve(data.linkNames || {});
                    console.log(`✅ Loaded ${Object.keys(data.linkNames || {}).length} saved link names from Flutter`);
                } else {
                    callback.reject(new Error(data.error || 'Failed to load link names'));
                }
            }
        } catch (error) {
            console.error('❌ LinkNamePersistenceChannel: Error handling Flutter response:', error);
        }
    }

    /**
     * Check if a link name exists for the given object
     */
    async hasCustomName(objectId) {
        try {
            const name = await this.loadLinkName(objectId);
            return name !== null && name !== undefined && name !== '';
        } catch (error) {
            console.error('❌ LinkNamePersistenceChannel: Error checking for custom name:', error);
            return false;
        }
    }
}

// Create global instance
window.linkNamePersistenceChannel = new LinkNamePersistenceChannel();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkNamePersistenceChannel;
}

// Make class globally available
window.LinkNamePersistenceChannel = LinkNamePersistenceChannel;
