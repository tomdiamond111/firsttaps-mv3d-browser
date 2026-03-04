/**
 * Initial World Preference Module
 * Allows Flutter to set the initial world type before the app initializes
 */

// Global variable to store initial world preference
window.initialWorldPreference = 'green-plane';

// Function for Flutter to call to set initial world preference
window.setInitialWorldPreference = function(worldType) {
    console.log(`🌍 [INITIAL-WORLD] Flutter set initial world preference: ${worldType}`);
    window.initialWorldPreference = worldType;
    
    // Also store in localStorage for persistence
    try {
        localStorage.setItem('last_world_template', worldType);
        console.log(`🌍 [INITIAL-WORLD] Stored world preference in localStorage: ${worldType}`);
    } catch (e) {
        console.warn('🌍 [INITIAL-WORLD] Could not store in localStorage:', e);
    }
    
    // If app is already initialized, switch immediately
    if (window.app && window.app.worldManager && typeof window.app.worldManager.switchWorldTemplate === 'function') {
        console.log(`🌍 [INITIAL-WORLD] App already initialized, switching to: ${worldType}`);
        setTimeout(() => {
            window.app.worldManager.switchWorldTemplate(worldType);
        }, 100);
    }
};

// Function for Flutter to get current world preference
window.getInitialWorldPreference = function() {
    return window.initialWorldPreference;
};

console.log('🌍 Initial World Preference module loaded');