/**
 * Search Extension Integration Script
 * 
 * This script provides minimal integration points to extend the existing
 * SearchManager with contact search functionality without modifying the core code.
 */

(function() {
    'use strict';
    
    const DEBUG_INTEGRATION = true;
    
    console.log("Loading SearchExtensionIntegration...");
    
    // ============================================================================
    // SEARCH MANAGER INTEGRATION
    // ============================================================================
    
    /**
     * Initialize search extension when SearchManager is available
     */
    function initializeSearchExtension() {
        // Wait for SearchManager to be available
        if (window.app?.searchManager) {
            if (DEBUG_INTEGRATION) {
                console.log('🔍 SearchManager found, initializing extension...');
            }
            
            // Initialize the extension
            if (window.initializeSearchExtension) {
                const success = window.initializeSearchExtension(window.app.searchManager);
                
                if (success) {
                    if (DEBUG_INTEGRATION) {
                        console.log('✅ Search extension initialized successfully');
                    }
                    
                    // Add hooks to existing SearchManager methods
                    addSearchHooks();
                } else {
                    console.error('❌ Failed to initialize search extension');
                }
            }
        } else {
            // Try again in 1 second
            setTimeout(initializeSearchExtension, 1000);
        }
    }
    
    /**
     * Add integration hooks to existing SearchManager methods
     */
    function addSearchHooks() {
        if (!window.app?.searchManager || !window.searchExtensionService) {
            return;
        }
        
        const searchManager = window.app.searchManager;
        const extensionService = window.searchExtensionService;
        
        // Hook into activateSearch method
        if (searchManager.activateSearch) {
            const originalActivateSearch = searchManager.activateSearch.bind(searchManager);
            
            searchManager.activateSearch = async function(query) {
                if (DEBUG_INTEGRATION) {
                    console.log(`🔍 Integration: activateSearch called with "${query}"`);
                }
                
                // Call before hook
                extensionService.beforeSearchActivation(query);
                
                // Call original method
                const result = await originalActivateSearch(query);
                
                // Call after hook with results
                if (result && searchManager.searchState?.results) {
                    extensionService.afterSearchActivation(searchManager.searchState.results);
                }
                
                return result;
            };
        }
        
        // Hook into deactivateSearch method
        if (searchManager.deactivateSearch) {
            const originalDeactivateSearch = searchManager.deactivateSearch.bind(searchManager);
            
            searchManager.deactivateSearch = async function() {
                if (DEBUG_INTEGRATION) {
                    console.log('🔍 Integration: deactivateSearch called');
                }
                
                // Call before hook
                extensionService.beforeSearchDeactivation();
                
                // Call original method
                const result = await originalDeactivateSearch();
                
                // Call after hook
                extensionService.afterSearchDeactivation();
                
                return result;
            };
        }
        
        if (DEBUG_INTEGRATION) {
            console.log('✅ Search hooks added successfully');
        }
    }
    
    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    
    /**
     * Check if search extension is working
     */
    window.testSearchExtension = function() {
        console.log('🔍 Testing Search Extension...');
        
        if (!window.searchExtensionService) {
            console.error('❌ SearchExtensionService not available');
            return false;
        }
        
        const status = window.searchExtensionService.getStatus();
        console.log('📊 Extension Status:', status);
        
        if (!status.isActive) {
            console.error('❌ Extension is not active');
            return false;
        }
        
        if (!status.hasSearchManager) {
            console.error('❌ SearchManager not connected');
            return false;
        }
        
        if (!status.hasContactSearchManager) {
            console.error('❌ ContactSearchManager not available');
            return false;
        }
        
        // Test contact search
        if (window.contactSearchManager) {
            const testResults = window.contactSearchManager.searchContacts('test');
            console.log(`📱 Contact search test returned ${testResults.length} results`);
        }
        
        console.log('✅ Search extension test completed');
        return true;
    };
    
    /**
     * Get extended search statistics
     */
    window.getSearchExtensionStats = function() {
        if (!window.searchExtensionService) {
            return null;
        }
        
        const status = window.searchExtensionService.getStatus();
        
        // Get contact count
        let contactCount = 0;
        if (window.app?.contactManager) {
            contactCount = window.app.contactManager.getAllContacts().length;
        }
        
        // Get search manager info
        let searchManagerInfo = null;
        if (window.app?.searchManager) {
            searchManagerInfo = {
                isActive: window.app.searchManager.isSearchActive(),
                currentQuery: window.app.searchManager.getCurrentQuery(),
                resultsCount: window.app.searchManager.getResultsCount()
            };
        }
        
        return {
            extension: status,
            contacts: {
                total: contactCount,
                hasContactManager: !!window.app?.contactManager
            },
            searchManager: searchManagerInfo
        };
    };
    
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    // Start initialization process
    setTimeout(initializeSearchExtension, 1000);
    
    // Also try when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeSearchExtension, 2000);
        });
    }
    
    console.log("✅ SearchExtensionIntegration loaded successfully");
    
})();
