/**
 * SmsContactResolver - Handles phone number normalization and contact resolution
 * Extracted from smsChannelManager.js for better maintainability
 */
(function() {
    'use strict';

    class SmsContactResolver {
        constructor() {
            // Initialize caching system for optimized contact resolution
            this.phoneNumberCache = new Map(); // contactId -> normalized phone number
            this.contactIdCache = new Map();   // normalized phone -> contactId
            this.resolutionTimestamps = new Map(); // Track cache freshness
            this.cacheTimeout = 30000; // 30 seconds cache timeout
            this.performanceStats = {
                cacheHits: 0,
                cacheMisses: 0,
                totalResolutions: 0
            };
            
            console.log('📱 SmsContactResolver initialized with caching system');
        }

        /**
         * Clear cache entry for a specific contact (useful when contact data changes)
         */
        clearContactCache(contactId) {
            const cachedPhone = this.phoneNumberCache.get(contactId);
            if (cachedPhone) {
                this.contactIdCache.delete(cachedPhone);
                this.phoneNumberCache.delete(contactId);
                this.resolutionTimestamps.delete(contactId);
                console.log(`📱 🗑️ Cleared cache for contact ${contactId}`);
            }
        }

        /**
         * Clear all cached contact resolutions
         */
        clearAllCache() {
            this.phoneNumberCache.clear();
            this.contactIdCache.clear();
            this.resolutionTimestamps.clear();
            this.performanceStats = { cacheHits: 0, cacheMisses: 0, totalResolutions: 0 };
            console.log('📱 🗑️ Cleared all contact resolution cache');
        }

        /**
         * Check if cache entry is still valid
         */
        isCacheValid(contactId) {
            const timestamp = this.resolutionTimestamps.get(contactId);
            if (!timestamp) return false;
            
            const age = Date.now() - timestamp;
            return age < this.cacheTimeout;
        }

        /**
         * Get performance statistics for cache efficiency
         */
        getPerformanceStats() {
            const hitRate = this.performanceStats.totalResolutions > 0 
                ? (this.performanceStats.cacheHits / this.performanceStats.totalResolutions * 100).toFixed(1)
                : '0.0';
                
            return {
                ...this.performanceStats,
                hitRate: `${hitRate}%`,
                cacheSize: this.phoneNumberCache.size
            };
        }

        /**
         * Resolve phone number from contact ID with caching
         */
        resolvePhoneNumber(contactId) {
            this.performanceStats.totalResolutions++;
            
            // Check cache first
            if (this.isCacheValid(contactId)) {
                const cachedPhone = this.phoneNumberCache.get(contactId);
                if (cachedPhone) {
                    this.performanceStats.cacheHits++;
                    console.log(`📱 💾 Cache hit: ${contactId} -> ${cachedPhone}`);
                    return cachedPhone;
                }
            }
            
            this.performanceStats.cacheMisses++;
            
            try {
                // CRITICAL FIX: Try contactId as phone number first (for E.164 format like +12244405082)
                if (contactId && (contactId.startsWith('+') || /^\d{10,15}$/.test(contactId))) {
                    console.log(`📱 ✅ Using contactId as phone number: ${contactId}`);
                    const normalizedPhone = this.normalizePhoneNumber(contactId);
                    this.cacheResolution(contactId, normalizedPhone);
                    return normalizedPhone;
                }
                
                if (!window.app?.contactManager?.contacts) {
                    throw new Error('Contact manager not available');
                }

                const contact = window.app.contactManager.contacts.get(contactId);
                
                if (contact?.contactData?.phoneNumber && contact.contactData.phoneNumber !== 'No Phone') {
                    console.log(`📱 ✅ Phone resolved: ${contact.contactData.phoneNumber}`);
                    const normalizedPhone = this.normalizePhoneNumber(contact.contactData.phoneNumber);
                    this.cacheResolution(contactId, normalizedPhone);
                    return contact.contactData.phoneNumber;
                }
                
                if (contact?.contactData) {
                    // OPTIMIZED: Check only essential phone fields, exit on first success
                    const phoneFields = ['phone', 'primaryPhone', 'cellPhone', 'mobilePhone'];
                    for (const field of phoneFields) {
                        if (contact.contactData[field] && contact.contactData[field] !== 'No Phone') {
                            console.log(`📱 ✅ Phone found in ${field}: ${contact.contactData[field]}`);
                            const normalizedPhone = this.normalizePhoneNumber(contact.contactData[field]);
                            this.cacheResolution(contactId, normalizedPhone);
                            return contact.contactData[field];
                        }
                    }
                }
                
                throw new Error(`No phone number found for contact: ${contactId}`);
                
            } catch (error) {
                console.error(`📱 ❌ Error during contact resolution:`, error);
                throw error;
            }
        }

        /**
         * Cache a successful contact resolution
         */
        cacheResolution(contactId, phoneNumber) {
            try {
                const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
                this.phoneNumberCache.set(contactId, normalizedPhone);
                this.contactIdCache.set(normalizedPhone, contactId);
                this.resolutionTimestamps.set(contactId, Date.now());
                console.log(`📱 💾 Cached resolution: ${contactId} -> ${normalizedPhone}`);
            } catch (error) {
                console.warn(`📱 ⚠️ Failed to cache resolution for ${contactId}:`, error.message);
            }
        }

        /**
         * Normalize phone number to proper format for Flutter
         */
        normalizePhoneNumber(phoneNumber) {
            if (!phoneNumber) {
                throw new Error('Phone number is required');
            }

            console.log(`📱 [DEBUG] SmsContactResolver normalizing: "${phoneNumber}"`);

            // CRITICAL FIX: Handle both E.164 format and normalize to 10-digit local format for Flutter
            let normalizedPhoneNumber = null;
            
            // First, handle E.164 format directly (e.g., +12244405082)
            if (phoneNumber.startsWith('+') && phoneNumber.length >= 11) {
                // For US numbers starting with +1, extract the 10-digit local part
                if (phoneNumber.startsWith('+1') && phoneNumber.length === 12) {
                    normalizedPhoneNumber = phoneNumber.substring(2); // Remove +1
                    console.log(`📱 ✅ Extracted 10-digit from E.164: ${normalizedPhoneNumber}`);
                } else {
                    // For other international numbers, use as-is but without the +
                    normalizedPhoneNumber = phoneNumber.substring(1);
                    console.log(`📱 ✅ Using international number without +: ${normalizedPhoneNumber}`);
                }
            } else if (window.PhoneUtils) {
                console.log(`📱 [DEBUG] Using PhoneUtils.normalizeToLocal10Digit for: "${phoneNumber}"`);
                normalizedPhoneNumber = window.PhoneUtils.normalizeToLocal10Digit(phoneNumber);
                if (!normalizedPhoneNumber) {
                    console.error(`📱 ❌ PhoneUtils failed to normalize: "${phoneNumber}"`);
                    throw new Error(`Failed to normalize phone number to 10-digit format: ${phoneNumber}`);
                }
                console.log(`📱 ✅ Normalized to 10-digit local: ${normalizedPhoneNumber}`);
            } else {
                console.warn('📱 ⚠️ PhoneUtils not available, using phone number as-is');
                normalizedPhoneNumber = phoneNumber;
            }

            // Validate format (allow both 10-digit and 11-digit with country code)
            if (normalizedPhoneNumber && !/^\d{10,11}$/.test(normalizedPhoneNumber)) {
                console.error(`📱 ❌ Final validation failed for normalized: "${normalizedPhoneNumber}" (from original: "${phoneNumber}")`);
                throw new Error(`Invalid phone number format: ${normalizedPhoneNumber}`);
            }
            
            console.log(`📱 [DEBUG] Successfully normalized "${phoneNumber}" to "${normalizedPhoneNumber}"`);
            return normalizedPhoneNumber;
        }

        /**
         * Resolve and normalize phone number for a contact
         */
        resolveAndNormalizePhone(contactId) {
            const phoneNumber = this.resolvePhoneNumber(contactId);
            return this.normalizePhoneNumber(phoneNumber);
        }

        /**
         * Handle phone-to-contactId mapping for responses with caching
         */
        mapPhoneToContactId(phoneNumber, existingContactId = null) {
            try {
                const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
                
                // Check cache first for fast lookup
                const cachedContactId = this.contactIdCache.get(normalizedPhone);
                if (cachedContactId && this.isCacheValid(cachedContactId)) {
                    console.log(`📱 💾 Cache hit for phone mapping: ${phoneNumber} -> ${cachedContactId}`);
                    return cachedContactId;
                }
                
                // If we already have a contactId and the phone matches, keep using it
                if (existingContactId) {
                    try {
                        const resolvedPhone = this.resolvePhoneNumber(existingContactId);
                        const normalizedExisting = this.normalizePhoneNumber(resolvedPhone);
                        const normalizedIncoming = normalizedPhone;
                        
                        if (normalizedExisting === normalizedIncoming) {
                            console.log(`📱 ✅ Phone ${phoneNumber} matches existing contactId ${existingContactId}`);
                            // Update cache with this confirmed mapping
                            this.cacheResolution(existingContactId, resolvedPhone);
                            return existingContactId;
                        }
                    } catch (error) {
                        console.warn(`📱 ⚠️ Could not verify existing contactId ${existingContactId}:`, error.message);
                    }
                }

                // Try to find contact by phone number
                if (window.app?.contactManager?.contacts) {
                    for (const [contactId, contact] of window.app.contactManager.contacts) {
                        try {
                            const contactPhone = this.resolvePhoneNumber(contactId);
                            const normalizedContactPhone = this.normalizePhoneNumber(contactPhone);
                            
                            if (normalizedContactPhone === normalizedPhone) {
                                console.log(`📱 ✅ Found contactId ${contactId} for phone ${phoneNumber}`);
                                // Cache this successful mapping
                                this.cacheResolution(contactId, contactPhone);
                                return contactId;
                            }
                        } catch (error) {
                            // Skip contacts that don't have valid phone numbers
                            continue;
                        }
                    }
                }

                // If no contact found, use the phone number as contactId and cache it
                console.log(`📱 ⚠️ No contact found for phone ${phoneNumber}, using phone as contactId`);
                this.contactIdCache.set(normalizedPhone, phoneNumber);
                this.resolutionTimestamps.set(phoneNumber, Date.now());
                return phoneNumber;
                
            } catch (error) {
                console.error(`📱 ❌ Error in phone-to-contact mapping:`, error);
                return phoneNumber; // Fallback to phone number
            }
        }

        /**
         * Validate contact ID and phone number combination
         */
        validateContactPhone(contactId, phoneNumber) {
            try {
                const resolvedPhone = this.resolvePhoneNumber(contactId);
                const normalizedResolved = this.normalizePhoneNumber(resolvedPhone);
                const normalizedProvided = this.normalizePhoneNumber(phoneNumber);
                
                const isValid = normalizedResolved === normalizedProvided;
                console.log(`📱 Contact validation: ${contactId} -> ${normalizedResolved} ${isValid ? '✅' : '❌'} ${normalizedProvided}`);
                
                return {
                    isValid,
                    resolvedPhone: normalizedResolved,
                    providedPhone: normalizedProvided
                };
            } catch (error) {
                console.error(`📱 ❌ Contact validation failed:`, error);
                return {
                    isValid: false,
                    error: error.message
                };
            }
        }

        /**
         * Warm up the cache by pre-resolving all available contacts
         */
        warmUpCache() {
            if (!window.app?.contactManager?.contacts) {
                console.warn('📱 ⚠️ Cannot warm up cache: ContactManager not available');
                return;
            }

            console.log('📱 🔥 Warming up contact resolution cache...');
            let warmedCount = 0;
            
            for (const [contactId] of window.app.contactManager.contacts) {
                try {
                    this.resolvePhoneNumber(contactId);
                    warmedCount++;
                } catch (error) {
                    // Skip contacts that can't be resolved
                    continue;
                }
            }
            
            console.log(`📱 ✅ Cache warmed: ${warmedCount} contacts pre-resolved`);
            return warmedCount;
        }

        /**
         * Periodic cache cleanup to remove expired entries
         */
        cleanupExpiredCache() {
            const now = Date.now();
            let cleanedCount = 0;
            
            for (const [contactId, timestamp] of this.resolutionTimestamps.entries()) {
                if (now - timestamp > this.cacheTimeout) {
                    this.clearContactCache(contactId);
                    cleanedCount++;
                }
            }
            
            if (cleanedCount > 0) {
                console.log(`📱 🧹 Cleaned up ${cleanedCount} expired cache entries`);
            }
            
            return cleanedCount;
        }

        /**
         * Log current cache performance and statistics
         */
        logCacheStats() {
            const stats = this.getPerformanceStats();
            console.log('📱 📊 Contact Resolution Cache Statistics:');
            console.log(`   Cache Hits: ${stats.cacheHits}`);
            console.log(`   Cache Misses: ${stats.cacheMisses}`);
            console.log(`   Hit Rate: ${stats.hitRate}`);
            console.log(`   Cache Size: ${stats.cacheSize} entries`);
            console.log(`   Total Resolutions: ${stats.totalResolutions}`);
        }
    }

    // Export to global scope
    window.SmsContactResolver = SmsContactResolver;
    
    // Create global instance for shared caching
    window.smsContactResolver = new SmsContactResolver();
    
    // Set up automatic cache cleanup every 5 minutes
    setInterval(() => {
        if (window.smsContactResolver) {
            window.smsContactResolver.cleanupExpiredCache();
        }
    }, 5 * 60 * 1000);
    
    // Expose cache management functions globally
    window.debugSmsContactCache = function() {
        if (window.smsContactResolver) {
            window.smsContactResolver.logCacheStats();
            return window.smsContactResolver.getPerformanceStats();
        }
        return null;
    };
    
    window.warmUpSmsContactCache = function() {
        if (window.smsContactResolver) {
            return window.smsContactResolver.warmUpCache();
        }
        return 0;
    };
    
    window.clearSmsContactCache = function() {
        if (window.smsContactResolver) {
            window.smsContactResolver.clearAllCache();
            console.log('📱 🗑️ SMS contact cache cleared via global function');
        }
    };
    
    console.log('📱 SmsContactResolver class exported to window with enhanced caching');
    console.log('📱 Global cache management functions available:');
    console.log('   - debugSmsContactCache() - Show cache statistics');
    console.log('   - warmUpSmsContactCache() - Pre-resolve all contacts');
    console.log('   - clearSmsContactCache() - Clear all cached data');

})();
