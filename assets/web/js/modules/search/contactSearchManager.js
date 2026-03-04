/**
 * Contact Search Manager Module
 * 
 * Handles search functionality specifically for Contact Objects
 * This module extends the existing search system to include contacts
 * without modifying the core SearchManager
 */

(function() {
    'use strict';
    
    const DEBUG_CONTACT_SEARCH = true;
    
    console.log("Loading ContactSearchManager module...");
    
    // ============================================================================
    // CONTACT SEARCH MANAGER CLASS
    // ============================================================================
    
    class ContactSearchManager {
        constructor() {
            this.contactSMSStates = new Map(); // Store SMS states during search
            this.originalContactPositions = new Map(); // Store original positions
            
            if (DEBUG_CONTACT_SEARCH) {
                console.log('📱 ContactSearchManager initialized');
            }
        }
        
        // ============================================================================
        // CONTACT SEARCH ALGORITHM
        // ============================================================================
        
        /**
         * Search through all contact objects
         * @param {string} query - Search query string
         * @returns {Array} Array of contact search results with scores
         */
        searchContacts(query) {
            if (DEBUG_CONTACT_SEARCH) {
                console.log(`📱 ContactSearchManager: Searching contacts for "${query}"`);
            }
            
            if (!query || query.trim().length === 0) {
                if (DEBUG_CONTACT_SEARCH) console.log('❌ Empty query provided');
                return [];
            }
            
            // Get contact manager
            if (!window.app?.contactManager) {
                if (DEBUG_CONTACT_SEARCH) console.log('❌ ContactManager not available');
                return [];
            }
            
            const contactManager = window.app.contactManager;
            const allContacts = contactManager.getAllContacts();
            
            if (DEBUG_CONTACT_SEARCH) {
                console.log(`📱 Found ${allContacts.length} contacts to search`);
            }
            
            const results = [];
            const trimmedQuery = query.trim().toLowerCase();
            
            allContacts.forEach((contact, index) => {
                if (contact.mesh && contact.contactData) {
                    const score = this.calculateContactScore(contact, trimmedQuery);
                    
                    if (score > 0) {
                        results.push({
                            fileObject: contact.mesh, // Use contact mesh as fileObject for compatibility
                            score: score,
                            originalPosition: {
                                x: contact.mesh.position.x,
                                y: contact.mesh.position.y,
                                z: contact.mesh.position.z
                            },
                            type: 'contact',
                            contactData: contact.contactData,
                            contactObject: contact // Store full contact object
                        });
                        
                        if (DEBUG_CONTACT_SEARCH) {
                            console.log(`📱 Contact match: ${contact.contactData.name} (score: ${score})`);
                        }
                    }
                }
            });
            
            // Sort by score (highest first)
            results.sort((a, b) => b.score - a.score);
            
            if (DEBUG_CONTACT_SEARCH) {
                console.log(`📱 ContactSearchManager: Found ${results.length} matching contacts`);
            }
            
            return results;
        }
        
        /**
         * Calculate relevance score for a contact based on query
         * @param {Object} contact - Contact object
         * @param {string} query - Lowercase search query
         * @returns {number} Relevance score (0 = no match, higher = better match)
         */
        calculateContactScore(contact, query) {
            let score = 0;
            const contactData = contact.contactData;
            
            // Search in contact name (highest priority)
            if (contactData.name && contactData.name.toLowerCase().includes(query)) {
                score += 100;
                
                // Bonus for exact match
                if (contactData.name.toLowerCase() === query) {
                    score += 50;
                }
                
                // Bonus for match at beginning
                if (contactData.name.toLowerCase().startsWith(query)) {
                    score += 25;
                }
            }
            
            // Search in phone number (medium priority)
            if (contactData.phoneNumber && 
                contactData.phoneNumber.toLowerCase().includes(query)) {
                score += 50;
            }
            
            // Search in contact ID (low priority)
            if (contactData.id && 
                contactData.id.toLowerCase().includes(query)) {
                score += 30;
            }
            
            // Search in any other contact properties
            if (contactData.email && 
                contactData.email.toLowerCase().includes(query)) {
                score += 40;
            }
            
            return score;
        }
        
        // ============================================================================
        // SMS SCREEN STATE MANAGEMENT
        // ============================================================================
        
        /**
         * Store SMS screen state before search operations
         * @param {Object} contact - Contact object
         */
        storeContactSMSState(contact) {
            if (!contact || !contact.contactData) return;
            
            const contactId = contact.contactData.id;
            const isVisible = contact.smsScreen && contact.smsScreen.isVisible;
            
            if (isVisible) {
                this.contactSMSStates.set(contactId, {
                    wasVisible: true,
                    contactId: contactId,
                    contactName: contact.contactData.name,
                    timestamp: Date.now()
                });
                
                if (DEBUG_CONTACT_SEARCH) {
                    console.log(`📱 Stored SMS state for ${contact.contactData.name}: visible`);
                }
            }
        }
        
        /**
         * Restore SMS screen state after search operations
         * @param {Object} contact - Contact object
         */
        restoreContactSMSState(contact) {
            if (!contact || !contact.contactData) return;
            
            const contactId = contact.contactData.id;
            const storedState = this.contactSMSStates.get(contactId);
            
            if (storedState && storedState.wasVisible) {
                // Delay restoration to ensure contact is properly positioned
                setTimeout(() => {
                    if (window.app?.contactManager) {
                        window.app.contactManager.restoreContactSMSScreen(contactId, true);
                    }
                    
                    if (DEBUG_CONTACT_SEARCH) {
                        console.log(`📱 Restored SMS state for ${contact.contactData.name}`);
                    }
                }, 100);
            }
            
            // Clean up stored state
            this.contactSMSStates.delete(contactId);
        }
        
        /**
         * Store SMS states for all contacts before search
         */
        storeAllContactSMSStates() {
            if (!window.app?.contactManager) return;
            
            const allContacts = window.app.contactManager.getAllContacts();
            
            allContacts.forEach(contact => {
                this.storeContactSMSState(contact);
            });
            
            if (DEBUG_CONTACT_SEARCH) {
                console.log(`📱 Stored SMS states for ${this.contactSMSStates.size} contacts`);
            }
        }
        
        /**
         * Restore SMS states for all contacts after search
         */
        restoreAllContactSMSStates() {
            if (!window.app?.contactManager) return;
            
            const allContacts = window.app.contactManager.getAllContacts();
            
            allContacts.forEach(contact => {
                this.restoreContactSMSState(contact);
            });
            
            if (DEBUG_CONTACT_SEARCH) {
                console.log(`📱 Restored SMS states for contacts`);
            }
        }
        
        // ============================================================================
        // POSITION MANAGEMENT
        // ============================================================================
        
        /**
         * Store original contact positions before search
         * @param {Array} contactResults - Array of contact search results
         */
        storeOriginalContactPositions(contactResults) {
            contactResults.forEach(result => {
                if (result.type === 'contact' && result.contactObject) {
                    const contactId = result.contactObject.contactData.id;
                    const position = result.contactObject.mesh.position;
                    
                    this.originalContactPositions.set(contactId, {
                        x: position.x,
                        y: position.y,
                        z: position.z
                    });
                    
                    if (DEBUG_CONTACT_SEARCH) {
                        console.log(`📱 Stored original position for ${result.contactObject.contactData.name}`);
                    }
                }
            });
        }
        
        /**
         * Get contact from mesh object
         * @param {Object} mesh - Three.js mesh object
         * @returns {Object|null} Contact object or null if not found
         */
        getContactFromMesh(mesh) {
            if (!window.app?.contactManager) return null;
            
            const allContacts = window.app.contactManager.getAllContacts();
            return allContacts.find(contact => contact.mesh === mesh);
        }
        
        /**
         * Check if an object is a contact
         * @param {Object} object - Three.js object
         * @returns {boolean} True if object is a contact
         */
        isContactObject(object) {
            return this.getContactFromMesh(object) !== null;
        }
        
        // ============================================================================
        // CLEANUP
        // ============================================================================
        
        /**
         * Clean up stored states
         */
        cleanup() {
            this.contactSMSStates.clear();
            this.originalContactPositions.clear();
            
            if (DEBUG_CONTACT_SEARCH) {
                console.log('📱 ContactSearchManager: Cleanup completed');
            }
        }
    }
    
    // ============================================================================
    // GLOBAL EXPORT
    // ============================================================================
    
    // Make ContactSearchManager globally available
    window.ContactSearchManager = ContactSearchManager;
    
    // Create global instance
    if (!window.contactSearchManager) {
        window.contactSearchManager = new ContactSearchManager();
    }
    
    console.log("✅ ContactSearchManager module loaded successfully");
    
})();
