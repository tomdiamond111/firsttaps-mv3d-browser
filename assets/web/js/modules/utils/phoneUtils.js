/**
 * Phone Number Utilities Module
 * Handles phone number normalization and E.164 format conversion
 * 
 * E.164 Format Requirements:
 * - Must start with + followed by country code
 * - No spaces, dashes, or parentheses
 * - Maximum 15 digits total
 * - Examples: +13125557890, +442071234567
 */

window.PhoneUtils = class PhoneUtils {
    
    /**
     * Convert various phone number formats to E.164 international standard
     * @param {string} phoneNumber - Input phone number in any format
     * @param {string} defaultCountryCode - Default country code if none provided (default: "1" for US)
     * @returns {string|null} - E.164 formatted phone number or null if invalid
     */
    static normalizeToE164(phoneNumber, defaultCountryCode = "1") {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            console.warn('📱 Invalid phone number input:', phoneNumber);
            return null;
        }

        // Clean the phone number by removing all non-digit characters except +
        let cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        // If it's a contactId pattern (contains letters), it's not a real phone number
        if (/[a-zA-Z]/.test(phoneNumber)) {
            console.warn(`📱 ContactId detected, not a phone number: ${phoneNumber}`);
            return null;
        }

        // Handle different input formats
        if (cleaned.startsWith('+')) {
            // Already has country code
            cleaned = cleaned.substring(1);
        } else if (cleaned.length === 10 && defaultCountryCode) {
            // US format without country code, add default
            cleaned = defaultCountryCode + cleaned;
        } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
            // US format with leading 1, keep as is
        } else if (cleaned.length > 11) {
            // International number without +, assume it has country code
        } else {
            console.warn(`📱 Ambiguous phone number format: ${phoneNumber}`);
            return null;
        }

        // Validate length (E.164 allows 1-15 digits after +)
        if (cleaned.length < 10 || cleaned.length > 15) {
            console.warn(`📱 Invalid phone number length: ${cleaned} (${cleaned.length} digits)`);
            return null;
        }

        // Return E.164 format
        const e164Number = '+' + cleaned;
        console.log(`📱 ✅ Normalized ${phoneNumber} to E.164: ${e164Number}`);
        return e164Number;
    }

    /**
     * Validate if a phone number is in proper E.164 format
     * @param {string} phoneNumber - Phone number to validate
     * @returns {boolean} - True if valid E.164 format
     */
    static isValidE164(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return false;
        }

        // E.164 regex: + followed by 1-15 digits
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        return e164Regex.test(phoneNumber);
    }

    /**
     * Convert phone number to 10-digit local US format for Flutter SMS
     * Flutter SMS typically expects just the 10-digit local number without country code
     * @param {string} phoneNumber - Input phone number in any format
     * @returns {string|null} - 10-digit local US number or null if invalid
     */
    static normalizeToLocal10Digit(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            console.warn('📱 Invalid phone number input:', phoneNumber);
            return null;
        }

        // Clean the phone number by removing all non-digit characters
        let cleaned = phoneNumber.replace(/[^\d]/g, '');
        
        // Handle different formats
        if (cleaned.length === 10) {
            // Already 10 digits (area code + local number)
            console.log(`📱 ✅ Normalized ${phoneNumber} to 10-digit: ${cleaned}`);
            return cleaned;
        } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
            // 11 digits starting with 1 (US country code + 10-digit number)
            const local10 = cleaned.substring(1);
            console.log(`📱 ✅ Normalized ${phoneNumber} to 10-digit: ${local10}`);
            return local10;
        } else if (cleaned.length > 11 && cleaned.startsWith('1')) {
            // International format, try to extract 10 digits after country code
            const local10 = cleaned.substring(1, 11);
            if (local10.length === 10) {
                console.log(`📱 ✅ Normalized ${phoneNumber} to 10-digit: ${local10}`);
                return local10;
            }
        }

        console.warn(`📱 Could not normalize to 10-digit format: ${phoneNumber} (cleaned: ${cleaned}, length: ${cleaned.length})`);
        return null;
    }

    /**
     * Extract phone number from contact data with fallback strategies
     * @param {Object} contactData - Contact object with various phone fields
     * @returns {string|null} - E.164 formatted phone number or null
     */
    static extractPhoneFromContact(contactData) {
        if (!contactData) return null;

        // Try different phone number fields in order of preference
        const phoneFields = [
            'phoneNumber',
            'phone',
            'primaryPhone', 
            'mobilePhone',
            'cellPhone',
            'cameraModel', // Used in fileData format
            'dateTimeOriginal' // Backup field in fileData
        ];

        for (const field of phoneFields) {
            const phoneValue = contactData[field];
            if (phoneValue && typeof phoneValue === 'string') {
                const normalized = this.normalizeToE164(phoneValue);
                if (normalized) {
                    console.log(`📱 ✅ Found valid phone in ${field}: ${normalized}`);
                    return normalized;
                }
            }
        }

        console.warn('📱 ⚠️ No valid phone number found in contact data:', contactData);
        return null;
    }

    /**
     * Format E.164 phone number for display purposes
     * @param {string} e164Number - E.164 formatted phone number
     * @returns {string} - Human-readable format
     */
    static formatForDisplay(e164Number) {
        if (!this.isValidE164(e164Number)) {
            return e164Number; // Return as-is if not valid E.164
        }

        // Remove + and extract country code and number
        const digits = e164Number.substring(1);
        
        // US/Canada numbers (country code 1)
        if (digits.startsWith('1') && digits.length === 11) {
            const area = digits.substring(1, 4);
            const exchange = digits.substring(4, 7);
            const number = digits.substring(7);
            return `+1 (${area}) ${exchange}-${number}`;
        }
        
        // For other countries, show country code + number
        if (digits.length >= 10) {
            const countryCode = digits.substring(0, digits.length - 10);
            const localNumber = digits.substring(digits.length - 10);
            return `+${countryCode} ${localNumber}`;
        }

        // Fallback: just add spaces every 3-4 digits
        return e164Number.replace(/(\+\d{1,3})(\d{3,4})(\d{3,4})(\d+)/, '$1 $2 $3 $4');
    }

    /**
     * Test phone number normalization with various formats
     * @param {string} testNumber - Test phone number
     */
    static testNormalization(testNumber) {
        console.log(`🧪 Testing phone normalization for: "${testNumber}"`);
        
        const normalized = this.normalizeToE164(testNumber);
        const isValid = normalized ? this.isValidE164(normalized) : false;
        const formatted = normalized ? this.formatForDisplay(normalized) : 'N/A';
        
        console.log(`   Input: ${testNumber}`);
        console.log(`   E.164: ${normalized || 'INVALID'}`);
        console.log(`   Valid: ${isValid}`);
        console.log(`   Display: ${formatted}`);
        console.log('');
        
        return { normalized, isValid, formatted };
    }

    /**
     * Run comprehensive phone number format tests
     */
    static runTests() {
        console.log('🧪 === PHONE NUMBER UTILS TESTS ===');
        
        const testCases = [
            '+13125557890',           // Already E.164
            '(312) 555-7890',         // US format with parentheses
            '312-555-7890',           // US format with dashes
            '312.555.7890',           // US format with dots
            '13125557890',            // US with country code, no +
            '3125557890',             // US without country code
            '+44 20 7123 4567',       // UK format
            '44 20 7123 4567',        // UK without +
            'barry-duke-cell',        // Invalid contactId
            'Unknown',                // Invalid text
            '',                       // Empty
            null                      // Null
        ];

        testCases.forEach(testCase => {
            this.testNormalization(testCase);
        });

        console.log('🧪 === TESTS COMPLETE ===');
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhoneUtils;
}

console.log('📱 PhoneUtils module loaded');
