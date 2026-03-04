/**
 * SMS Bridge - JavaScript interface for native SMS app
 * Connects the contact options menu with Flutter's SMS service
 * 
 * Features:
 * - Opens native SMS app with pre-filled phone number
 * - Validates phone numbers before opening SMS
 * - Integrates with ContactInfoScreen for seamless UX
 */

class SMSBridge {
    constructor() {
        this.isInitialized = false;
        this.smsSupported = false;
        this.initialize();
    }

    /**
     * Initialize the SMS bridge
     */
    async initialize() {
        try {
            console.log('💬 Initializing SMSBridge...');
            
            // Check if SMS channel is available
            if (typeof window.SMSChannel === 'undefined') {
                console.warn('💬 SMSChannel not available, SMS functionality limited');
                this.isInitialized = true;
                return;
            }

            this.smsSupported = true;
            this.isInitialized = true;
            
            console.log(`💬 SMSBridge initialized (SMS supported: ${this.smsSupported})`);
        } catch (error) {
            console.error('💬 Error initializing SMSBridge:', error);
            this.isInitialized = true; // Still mark as initialized to prevent hanging
        }
    }

    /**
     * Open SMS app with contact
     * @param {Object} contactData - Contact information
     * @param {string} contactData.phoneNumber - The phone number for SMS
     * @param {string} contactData.contactName - The contact's name
     * @param {string} [contactData.contactId] - The contact's ID
     * @returns {Promise<boolean>} Whether the SMS attempt was successful
     */
    async openSMS(contactData) {
        try {
            console.log('💬 Attempting to open SMS for contact:', contactData);

            // Validate input
            if (!contactData || !contactData.phoneNumber) {
                console.error('💬 Cannot open SMS: Missing phone number');
                this.showError('No phone number available for this contact');
                return false;
            }

            // Ensure bridge is initialized
            if (!this.isInitialized) {
                console.warn('💬 Bridge not initialized, attempting to open SMS anyway...');
            }

            // Check if SMS is supported
            if (!this.smsSupported) {
                console.error('💬 SMS not supported - SMSChannel not available');
                this.showError('SMS functionality not available');
                return false;
            }

            // Clean and validate phone number
            const cleanedNumber = this.cleanPhoneNumber(contactData.phoneNumber);
            if (!cleanedNumber) {
                console.error('💬 Invalid phone number:', contactData.phoneNumber);
                this.showError('Invalid phone number format');
                return false;
            }

            console.log('💬 Calling Flutter SMS service with cleaned number:', cleanedNumber);

            // Post message to Flutter using the same pattern as ContactDialerChannel
            try {
                const message = {
                    action: 'openSMS',
                    phoneNumber: cleanedNumber,
                    contactName: contactData.contactName || 'Unknown Contact',
                    contactId: contactData.contactId || null
                };
                
                console.log('💬 Posting message to SMSChannel:', message);
                
                if (window.SMSChannel && window.SMSChannel.postMessage) {
                    window.SMSChannel.postMessage(JSON.stringify(message));
                } else {
                    console.error('💬 SMSChannel not available');
                    this.showError('SMS service not available');
                    return false;
                }
                
                // Assume success since we don't have a callback mechanism
                console.log('💬 ✅ SMS request sent to Flutter');
                return true;
                
            } catch (error) {
                console.error('💬 Error calling Flutter SMS service:', error);
                this.showError('Failed to open SMS app');
                return false;
            }

        } catch (error) {
            console.error('💬 Error opening SMS:', error);
            this.showError('Error opening SMS app');
            return false;
        }
    }

    /**
     * Clean and validate phone number
     * @param {string} phoneNumber - Raw phone number
     * @returns {string|null} Cleaned phone number or null if invalid
     */
    cleanPhoneNumber(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return null;
        }

        // Remove common formatting characters but preserve + for international
        let cleaned = phoneNumber.replace(/[\s\-\(\)\.\s]/g, '');
        
        // Keep only digits and + sign
        cleaned = cleaned.replace(/[^\d\+]/g, '');
        
        // Basic validation: must have at least 3 digits
        if (cleaned.replace(/\+/g, '').length < 3) {
            return null;
        }
        
        return cleaned;
    }

    /**
     * Show error message to user
     * @param {string} message - Error message
     */
    showError(message) {
        console.error('💬 SMSBridge error:', message);
        // Could show UI notification here if needed
    }
}

// Create global instance
console.log('💬 Creating global SMSBridge instance...');
window.SMSBridge = new SMSBridge();
console.log('💬 SMSBridge available at window.SMSBridge');
