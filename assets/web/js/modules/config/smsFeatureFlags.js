/**
 * SMS Feature Flags Configuration - MV3D VERSION
 * 
 * ALL SMS FEATURES DISABLED FOR FIRSTTAPS MV3D
 * Media-focused app - contacts use native apps for SMS/calls
 * 
 * MV3D CONTACT BEHAVIOR:
 * ======================
 * - Single tap: Opens Contact Info Screen (not SMS screen)
 * - Contact Info Screen shows: Name, Phone, Avatar
 * - Buttons: "Send SMS" (native app), "Open Dialer" (native app), "Close"
 * - Double tap: Move close / open contact in native app
 * - Long press: Menu for native call/SMS
 * 
 * SMS code is preserved (not deleted) for potential future re-enablement
 * To re-enable: Set ENABLE_SMS_CORE to true and uncomment main.dart initialization
 */

const SMS_FEATURE_FLAGS = {
    // MV3D: ALL SMS FEATURES DISABLED
    // Contact objects use Contact Info Screen instead
    ENABLE_SMS_MONITORING: false,
    ENABLE_SMS_ALERTS: false,
    ENABLE_IN_APP_CONTACT_ALERTS: false,
    ENABLE_3D_MESSAGE_BALLOONS: false,
    ENABLE_SMS_CORE: false, // DISABLED FOR MV3D - Media app focus
    
    // DEBUG MODE
    DEBUG_MODE: false
};

// Make globally available
window.SMS_FEATURE_FLAGS = SMS_FEATURE_FLAGS;

// Log MV3D configuration
console.log('🎵 🎛️ MV3D Feature Flags Configuration (MEDIA FOCUS):');
console.log('  - SMS Features: ALL DISABLED (preserved for future)');
console.log('  - Contact Info Screen: ENABLED (native app actions)');
console.log('  - Media Preview: ENABLED (YouTube, Spotify, local files)');
console.log('🎵 ✅ FIRSTTAPS MV3D: Media organization & playback focus');

// Helper function to check if a feature is enabled
window.isSmsFeatureEnabled = (featureName) => {
    return SMS_FEATURE_FLAGS[featureName] === true;
};

console.log('🎵 ✅ MV3D Feature Flags loaded');
