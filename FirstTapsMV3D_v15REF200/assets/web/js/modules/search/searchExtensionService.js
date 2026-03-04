/**
 * Search Extension Service
 * 
 * This service extends the existing SearchManager to include Contact Objects
 * without modifying the core SearchManager code. It acts as a bridge between
 * the main search system and the ContactSearchManager.
 */

(function() {
    'use strict';
    
    const DEBUG_SEARCH_EXTENSION = true;
    
    console.log("Loading SearchExtensionService module...");
    
    // ============================================================================
    // SEARCH EXTENSION SERVICE CLASS
    // ============================================================================
    
    class SearchExtensionService {
        constructor() {
            this.originalSearchManager = null;
            this.contactSearchManager = null;
            this.isExtensionActive = false;
            
            if (DEBUG_SEARCH_EXTENSION) {
                console.log('🔍 SearchExtensionService initialized');
            }
        }
        
        // ============================================================================
        // INITIALIZATION
        // ============================================================================
        
        /**
         * Initialize the extension service
         * @param {Object} searchManager - Reference to existing SearchManager
         */
        initialize(searchManager) {
            if (!searchManager) {
                console.error('❌ SearchExtensionService: No SearchManager provided');
                return false;
            }
            
            // Prevent double initialization
            if (this.isExtensionActive && this.originalSearchManager === searchManager) {
                if (DEBUG_SEARCH_EXTENSION) {
                    console.log('⚠️ SearchExtensionService: Already initialized, skipping');
                }
                return true;
            }
            
            this.originalSearchManager = searchManager;
            
            // Store the original performSearch method BEFORE any modifications
            // Only store if we haven't already stored it
            if (!this.originalPerformSearchMethod) {
                this.originalPerformSearchMethod = searchManager.performSearch.bind(searchManager);
                
                if (DEBUG_SEARCH_EXTENSION) {
                    console.log('📝 SearchExtensionService: Stored original performSearch method');
                }
            }
            
            // Get ContactSearchManager instance
            if (window.contactSearchManager) {
                this.contactSearchManager = window.contactSearchManager;
            } else {
                console.warn('⚠️ ContactSearchManager not available');
            }
            
            // Extend the search manager's performSearch method
            this.extendSearchManager();
            
            this.isExtensionActive = true;
            
            if (DEBUG_SEARCH_EXTENSION) {
                console.log('✅ SearchExtensionService: Extension activated');
            }
            
            return true;
        }
        
        // ============================================================================
        // SEARCH MANAGER EXTENSION
        // ============================================================================
        
        /**
         * Extend the SearchManager's performSearch method to include contacts
         */
        extendSearchManager() {
            if (!this.originalSearchManager) {
                console.error('❌ No SearchManager to extend');
                return;
            }
            
            // Check if already extended to prevent double wrapping
            if (this.originalSearchManager.performSearch._isExtended) {
                if (DEBUG_SEARCH_EXTENSION) {
                    console.log('⚠️ SearchManager already extended, skipping');
                }
                return;
            }
            
            // Use the stored original method to avoid recursive calls
            const originalPerformSearch = this.originalPerformSearchMethod;
            
            // Create enhanced performSearch method
            this.originalSearchManager.performSearch = (query) => {
                if (DEBUG_SEARCH_EXTENSION) {
                    console.log(`🔍 SearchExtensionService: Enhanced search for "${query}"`);
                }
                
                // Get original file object results using the truly original method
                const fileResults = originalPerformSearch(query);
                
                if (DEBUG_SEARCH_EXTENSION) {
                    console.log(`🔍 File results: ${fileResults.length}`);
                }
                
                // Get contact results if ContactSearchManager is available
                let contactResults = [];
                if (this.contactSearchManager) {
                    contactResults = this.contactSearchManager.searchContacts(query);
                    
                    if (DEBUG_SEARCH_EXTENSION) {
                        console.log(`📱 Contact results: ${contactResults.length}`);
                    }
                }
                
                // Combine results
                const combinedResults = [...fileResults, ...contactResults];
                
                // Sort by score (highest first)
                combinedResults.sort((a, b) => b.score - a.score);
                
                // Apply max results limit
                const maxResults = this.originalSearchManager.config?.maxResults || 5;
                const finalResults = combinedResults.slice(0, maxResults);
                
                if (DEBUG_SEARCH_EXTENSION) {
                    console.log(`🔍 Combined results: ${finalResults.length} (${fileResults.length} files + ${contactResults.length} contacts)`);
                    
                    // Log result breakdown
                    const fileCount = finalResults.filter(r => r.type !== 'contact').length;
                    const contactCount = finalResults.filter(r => r.type === 'contact').length;
                    console.log(`📊 Final breakdown: ${fileCount} files, ${contactCount} contacts`);
                }
                
                // Update searchState with the combined results
                this.originalSearchManager.searchState.results = finalResults;
                this.originalSearchManager.searchState.isActive = true;
                this.originalSearchManager.searchState.currentQuery = query;
                
                if (DEBUG_SEARCH_EXTENSION) {
                    console.log(`📊 SearchState updated: ${this.originalSearchManager.searchState.results.length} results stored`);
                }
                
                return finalResults;
            };
            
            // Mark as extended to prevent double wrapping
            this.originalSearchManager.performSearch._isExtended = true;
            
            if (DEBUG_SEARCH_EXTENSION) {
                console.log('✅ SearchManager.performSearch method extended');
            }
        }
        
        // ============================================================================
        // SEARCH LIFECYCLE HOOKS
        // ============================================================================
        
        /**
         * Hook called before search activation
         * @param {string} query - Search query
         */
        beforeSearchActivation(query) {
            if (DEBUG_SEARCH_EXTENSION) {
                console.log(`🔍 SearchExtensionService: Before search activation for "${query}"`);
            }
            
            // Store contact SMS states before search
            if (this.contactSearchManager) {
                this.contactSearchManager.storeAllContactSMSStates();
            }
        }
        
        /**
         * Hook called after search activation
         * @param {Array} results - Search results
         */
        afterSearchActivation(results) {
            if (DEBUG_SEARCH_EXTENSION) {
                console.log(`🔍 SearchExtensionService: After search activation with ${results.length} results`);
            }
            
            // Store original positions for contact results
            if (this.contactSearchManager) {
                const contactResults = results.filter(r => r.type === 'contact');
                this.contactSearchManager.storeOriginalContactPositions(contactResults);
            }
        }
        
        /**
         * Hook called before search deactivation
         */
        beforeSearchDeactivation() {
            if (DEBUG_SEARCH_EXTENSION) {
                console.log('🔍 SearchExtensionService: Before search deactivation');
            }
            
            // Restore contact SMS states
            if (this.contactSearchManager) {
                this.contactSearchManager.restoreAllContactSMSStates();
            }
        }
        
        /**
         * Hook called after search deactivation
         */
        afterSearchDeactivation() {
            if (DEBUG_SEARCH_EXTENSION) {
                console.log('🔍 SearchExtensionService: After search deactivation');
            }
            
            // Cleanup contact search manager
            if (this.contactSearchManager) {
                this.contactSearchManager.cleanup();
            }
        }
        
        // ============================================================================
        // RESULT IDENTIFICATION
        // ============================================================================
        
        /**
         * Identify if a search result is a contact
         * @param {Object} result - Search result object
         * @returns {boolean} True if result is a contact
         */
        isContactResult(result) {
            return result.type === 'contact' && result.contactData;
        }
        
        /**
         * Get contact object from search result
         * @param {Object} result - Search result object
         * @returns {Object|null} Contact object or null
         */
        getContactFromResult(result) {
            if (this.isContactResult(result)) {
                return result.contactObject;
            }
            return null;
        }
        
        // ============================================================================
        // STATUS & DEBUGGING
        // ============================================================================
        
        /**
         * Get extension status
         * @returns {Object} Status information
         */
        getStatus() {
            return {
                isActive: this.isExtensionActive,
                hasSearchManager: !!this.originalSearchManager,
                hasContactSearchManager: !!this.contactSearchManager,
                storedSMSStates: this.contactSearchManager?.contactSMSStates?.size || 0,
                storedPositions: this.contactSearchManager?.originalContactPositions?.size || 0
            };
        }
        
        /**
         * Debug information
         */
        debug() {
            const status = this.getStatus();
            console.log('🔍 SearchExtensionService Debug Info:');
            console.log('  Extension Active:', status.isActive);
            console.log('  Has SearchManager:', status.hasSearchManager);
            console.log('  Has ContactSearchManager:', status.hasContactSearchManager);
            console.log('  Stored SMS States:', status.storedSMSStates);
            console.log('  Stored Positions:', status.storedPositions);
            
            if (this.contactSearchManager) {
                console.log('  Contact Search Manager Available:', true);
                if (window.app?.contactManager) {
                    const contactCount = window.app.contactManager.getAllContacts().length;
                    console.log('  Total Contacts Available:', contactCount);
                }
            }
        }
    }
    
    // ============================================================================
    // GLOBAL EXPORT & INITIALIZATION
    // ============================================================================
    
    // Make SearchExtensionService globally available
    window.SearchExtensionService = SearchExtensionService;
    
    // Create global instance
    if (!window.searchExtensionService) {
        window.searchExtensionService = new SearchExtensionService();
    }
    
    // Function to initialize the extension with existing SearchManager
    window.initializeSearchExtension = function(searchManager) {
        if (window.searchExtensionService) {
            return window.searchExtensionService.initialize(searchManager);
        }
        return false;
    };
    
    // Function to check if extension is active
    window.isSearchExtensionActive = function() {
        return window.searchExtensionService?.isExtensionActive || false;
    };
    
    console.log("✅ SearchExtensionService module loaded successfully");
    
})();
