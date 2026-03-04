/**
 * @file smsTextInputBridge.js
 * @description Minimal bridge to handle Flutter text input events for SMS functionality.
 * This file focuses ONLY on text input bridging - no other SMS features.
 * 
 * Phase 1: Text Input Event Handling
 * - Listen for flutter-text-input events
 * - Provide debugging and validation
 * - Forward to SMS Integration Manager
 */

class SmsTextInputBridge {
    constructor() {
        this.isActive = false;
        this.currentContactId = null;
        this.debugMode = true; // Enable for testing phase
        
        console.log("📝 SMS Text Input Bridge initialized");
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for Flutter text input
     */
    setupEventListeners() {
        // Listen for Flutter text input events
        window.addEventListener('flutter-text-input', (event) => {
            this.handleFlutterTextInput(event);
        });

        // Also listen for any SMS input responses that might contain text
        window.addEventListener('flutter-sms-input-response', (event) => {
            this.handleSmsInputResponse(event);
        });

        console.log("📝 Text input event listeners registered");
    }

    /**
     * Handle optimized Flutter text input events
     * PERFORMANCE OPTIMIZATION: Now processes complete messages instead of character-by-character updates
     * @param {CustomEvent} event - The Flutter text input event
     */
    handleFlutterTextInput(event) {
        if (this.debugMode) {
            console.log("📝 🔍 OPTIMIZED FLUTTER TEXT INPUT EVENT:");
            console.log("📝 Event type:", event.type);
            console.log("📝 Event detail:", event.detail);
            console.log("📝 Bridge active:", this.isActive);
            console.log("📝 Current contact:", this.currentContactId);
            console.log("📝 Optimized flag:", event.detail?.optimized);
        }

        // Validate event structure
        if (!event.detail) {
            console.warn("📝 ⚠️ Text input event missing detail object");
            return;
        }

        // Extract text from event
        const text = event.detail.text || '';
        const contactId = event.detail.contactId || this.currentContactId;
        const isOptimized = event.detail.optimized || false;

        if (this.debugMode) {
            console.log(`📝 ✅ Processing ${isOptimized ? 'OPTIMIZED COMPLETE MESSAGE' : 'text input'}: "${text}" for contact: ${contactId}`);
        }

        // Forward to SMS Integration Manager if available
        if (window.smsIntegrationManager && typeof window.smsIntegrationManager.handleChannelTextInput === 'function') {
            window.smsIntegrationManager.handleChannelTextInput(text, contactId);
            console.log(`📝 ✅ ${isOptimized ? 'Complete message' : 'Text'} forwarded to SMS Integration Manager`);
        } else {
            console.warn("📝 ⚠️ SMS Integration Manager not available for text forwarding");
        }

        // Dispatch custom event for other listeners
        window.dispatchEvent(new CustomEvent('sms-text-updated', {
            detail: { text, contactId, optimized: isOptimized }
        }));
    }

    /**
     * Handle SMS input response events that might contain text
     * @param {CustomEvent} event - The SMS input response event
     */
    handleSmsInputResponse(event) {
        if (!event.detail) return;

        // Check if this response contains text content
        if (event.detail.text !== undefined) {
            if (this.debugMode) {
                console.log("📝 🔍 SMS INPUT RESPONSE WITH TEXT:");
                console.log("📝 Text:", event.detail.text);
                console.log("📝 Action:", event.detail.action);
                console.log("📝 Contact:", event.detail.contactId);
            }

            // Treat this as a text input event
            this.handleFlutterTextInput({
                type: 'flutter-text-input',
                detail: {
                    text: event.detail.text,
                    contactId: event.detail.contactId || this.currentContactId
                }
            });
        }
    }

    /**
     * Activate text input bridging for a specific contact
     * @param {string} contactId - The contact ID
     */
    activate(contactId) {
        this.isActive = true;
        this.currentContactId = contactId;
        console.log(`📝 ✅ Text input bridge activated for contact: ${contactId}`);
    }

    /**
     * Deactivate text input bridging
     */
    deactivate() {
        this.isActive = false;
        this.currentContactId = null;
        console.log("📝 ❌ Text input bridge deactivated");
    }

    /**
     * Toggle debug mode for testing
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`📝 Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get current state for debugging
     * @returns {object} Current state
     */
    getState() {
        return {
            isActive: this.isActive,
            currentContactId: this.currentContactId,
            debugMode: this.debugMode
        };
    }
}

// Create global instance
window.smsTextInputBridge = new SmsTextInputBridge();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmsTextInputBridge;
}

console.log("📝 SMS Text Input Bridge loaded and ready for testing");
