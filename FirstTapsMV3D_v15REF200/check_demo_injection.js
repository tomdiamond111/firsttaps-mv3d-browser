// Diagnostic script to check if demo asset injection happened
// Paste this into browser console while app is running

console.log("========== DEMO INJECTION DIAGNOSTIC ==========");

if (typeof window.DEMO_ASSET_DATA_URLS === 'undefined') {
    console.error("❌ window.DEMO_ASSET_DATA_URLS is UNDEFINED");
    console.log("This means Flutter injection did NOT run");
} else if (window.DEMO_ASSET_DATA_URLS === null) {
    console.warn("⚠️ window.DEMO_ASSET_DATA_URLS is NULL");
} else {
    console.log("✅ window.DEMO_ASSET_DATA_URLS exists!");
    console.log("Type:", typeof window.DEMO_ASSET_DATA_URLS);
    console.log("Is Object:", window.DEMO_ASSET_DATA_URLS instanceof Object);
    
    const keys = Object.keys(window.DEMO_ASSET_DATA_URLS);
    console.log(`📦 Contains ${keys.length} demo assets:`);
    
    keys.forEach(key => {
        const value = window.DEMO_ASSET_DATA_URLS[key];
        const prefix = value ? value.substring(0, 30) : 'null';
        console.log(`  - ${key}: ${prefix}...`);
    });
}

console.log("===============================================");
