/**
 * @file smsTextInputLoader.js
 * @description Loader script to ensure SMS Text Input Bridge is available
 * This script should be loaded before the main SMS Integration Manager
 */

(function() {
    console.log("📝 Loading SMS Text Input Bridge...");
    
    // Check if the bridge is already loaded
    if (window.smsTextInputBridge) {
        console.log("📝 ✅ SMS Text Input Bridge already loaded");
        return;
    }
    
    // Try to load the bridge from the expected location
    const bridgeScript = document.createElement('script');
    bridgeScript.src = './js/modules/sms/smsTextInputBridge.js';
    bridgeScript.onload = function() {
        console.log("📝 ✅ SMS Text Input Bridge loaded successfully");
        
        // Verify the bridge is available
        if (window.smsTextInputBridge) {
            console.log("📝 ✅ Bridge instance created and ready");
        } else {
            console.error("📝 ❌ Bridge script loaded but instance not found");
        }
    };
    bridgeScript.onerror = function() {
        console.error("📝 ❌ Failed to load SMS Text Input Bridge");
    };
    
    document.head.appendChild(bridgeScript);
    
    console.log("📝 Bridge loading initiated...");
})();
