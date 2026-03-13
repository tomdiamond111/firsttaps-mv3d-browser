/**
 * Contact Dialer Bridge - JavaScript interface for native phone dialer
 * Connects the contact options menu with Flutter's ContactDialerService
 * 
 * Features:
 * - Initiates phone calls through native dialer
 * - Validates phone numbers before dialing
 * - Provides fallback handling for unsupported devices
 * - Integrates with ContactOptionsMenu for seamless UX
 */

class ContactDialerBridge {
    constructor() {
        this.isInitialized = false;
        this.dialerSupported = false;
        this.initialize();
    }

    /**
     * Initialize the contact dialer bridge
     */
    async initialize() {
        try {
            console.log('📞 Initializing ContactDialerBridge...');
            
            // Check if Flutter bridge is available
            if (typeof window.flutter_bridge === 'undefined') {
                console.warn('📞 Flutter bridge not available, dialer functionality limited');
                this.isInitialized = true;
                return;
            }

            // Test dialer capability
            this.dialerSupported = await this.checkDialerSupport();
            this.isInitialized = true;
            
            console.log(`📞 ContactDialerBridge initialized (dialer supported: ${this.dialerSupported})`);
        } catch (error) {
            console.error('📞 Error initializing ContactDialerBridge:', error);
            this.isInitialized = true; // Still mark as initialized to prevent hanging
        }
    }

    /**
     * Check if the device supports dialing
     * @returns {Promise<boolean>} Whether dialing is supported
     */
    async checkDialerSupport() {
        try {
            if (typeof window.flutter_bridge === 'undefined') {
                return false;
            }

            const result = await window.flutter_bridge.call('contact_dialer_channel', 'canDialContacts', []);
            return result === true;
        } catch (error) {
            console.warn('📞 Could not check dialer support:', error);
            return false;
        }
    }

    /**
     * Dial a contact using the native dialer
     * @param {Object} contactData - Contact information
     * @param {string} contactData.phoneNumber - The phone number to dial
     * @param {string} contactData.contactName - The contact's name
     * @param {string} [contactData.contactId] - The contact's ID
     * @returns {Promise<boolean>} Whether the dial attempt was successful
     */
    async dialContact(contactData) {
        try {
            console.log('📞 Attempting to dial contact:', contactData);

            // Validate input
            if (!contactData || !contactData.phoneNumber) {
                console.error('📞 Cannot dial: Missing phone number');
                this.showError('No phone number available for this contact');
                return false;
            }

            // Ensure bridge is initialized
            if (!this.isInitialized) {
                console.warn('📞 Bridge not initialized, attempting to dial anyway...');
            }

            // Check if dialer is supported
            if (!this.dialerSupported) {
                console.warn('📞 Dialer not supported on this device, but trying Flutter channel anyway...');
                // Don't use fallback - try Flutter channel instead
            }

            // Clean and validate phone number
            const cleanedNumber = this.cleanPhoneNumber(contactData.phoneNumber);
            if (!cleanedNumber) {
                console.error('📞 Invalid phone number:', contactData.phoneNumber);
                this.showError('Invalid phone number format');
                return false;
            }

            // Prepare dialer arguments
            const dialerArgs = [{
                phoneNumber: cleanedNumber,
                contactName: contactData.contactName || 'Unknown Contact',
                contactId: contactData.contactId || null
            }];

            console.log('📞 Calling Flutter dialer service with args:', dialerArgs);

            // Call Flutter dialer service using the same pattern as other channels
            try {
                // Post message to Flutter using the existing channel pattern
                const message = {
                    action: 'dialContact',
                    phoneNumber: cleanedNumber,
                    contactName: contactData.contactName || 'Unknown Contact',
                    contactId: contactData.contactId || null
                };
                
                console.log('📞 Posting message to ContactDialerChannel:', message);
                
                // Use the same channel pattern as AvatarPersistenceChannel and OpenFileChannel
                if (window.ContactDialerChannel && window.ContactDialerChannel.postMessage) {
                    window.ContactDialerChannel.postMessage(JSON.stringify(message));
                } else {
                    console.error('📞 ContactDialerChannel not available');
                    this.showError('Dialer service not available');
                    return false;
                }
                
                // For now, assume success since we don't have a callback mechanism
                console.log('📞 ✅ Dialer request sent to Flutter');
                return true;
                
            } catch (error) {
                console.error('📞 Error calling Flutter dialer service:', error);
                this.showError('Failed to open dialer');
                return false;
            }

        } catch (error) {
            console.error('📞 Error dialing contact:', error);
            this.showError('Error opening dialer');
            return false;
        }
    }

    /**
     * Fallback dialing method for unsupported devices
     * @param {Object} contactData - Contact information
     * @returns {Promise<boolean>} Whether the fallback was successful
     */
    async dialContactFallback(contactData) {
        try {
            console.log('📞 Attempting fallback dial for:', contactData.contactName);
            
            const cleanedNumber = this.cleanPhoneNumber(contactData.phoneNumber);
            if (!cleanedNumber) {
                this.showError('Invalid phone number format');
                return false;
            }

            // Try browser-based tel: link
            const telUri = `tel:${cleanedNumber}`;
            
            // Create temporary link and click it
            const link = document.createElement('a');
            link.href = telUri;
            link.style.display = 'none';
            document.body.appendChild(link);
            
            try {
                link.click();
                console.log('📞 ✅ Fallback dial attempted via tel: link');
                return true;
            } finally {
                document.body.removeChild(link);
            }
            
        } catch (error) {
            console.error('📞 Fallback dial failed:', error);
            this.showError('Unable to dial on this device');
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
        
        // Basic validation - should have at least some digits
        if (!/\d/.test(cleaned)) {
            return null;
        }

        return cleaned;
    }

    /**
     * Show error message to user
     * @param {string} message - Error message to display
     */
    showError(message) {
        console.error('📞 Dialer Error:', message);
        
        // Try to use any available notification system
        if (window.showToast) {
            window.showToast(message, 'error');
        } else if (window.alert) {
            alert(`Dialer Error: ${message}`);
        }
    }

    /**
     * Get dialer status information
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            supported: this.dialerSupported,
            bridgeAvailable: typeof window.flutter_bridge !== 'undefined'
        };
    }
}

// Create global instance with BOTH casings for compatibility
window.contactDialerBridge = new ContactDialerBridge();
window.ContactDialerBridge = window.contactDialerBridge; // Uppercase alias

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContactDialerBridge;
}

console.log('📞 ContactDialerBridge module loaded (available as window.ContactDialerBridge and window.contactDialerBridge)');
