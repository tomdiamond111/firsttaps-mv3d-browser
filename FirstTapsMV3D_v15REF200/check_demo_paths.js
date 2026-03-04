// Check what path values the current demo file objects have
// This will tell us if they need to be deleted and regenerated

console.log("=".repeat(80));
console.log("🔍 CHECKING DEMO FILE PATHS");
console.log("=".repeat(80));

// Find all file objects in the scene
const fileObjects = window.stateManager?.fileObjects || [];
console.log(`\n📦 Total file objects: ${fileObjects.length}`);

// Filter to demo files only
const demoFiles = fileObjects.filter(obj => 
    obj.userData?.isDemoContent === true || 
    obj.name?.includes('demo_') ||
    obj.name?.includes('cuttyranks') ||
    obj.name?.includes('katyperry')
);

console.log(`🎵 Demo files found: ${demoFiles.length}\n`);

if (demoFiles.length === 0) {
    console.error("❌ No demo files found in scene!");
    console.log("   This might mean:");
    console.log("   1. Demo files haven't been created yet");
    console.log("   2. They're stored under a different key");
    console.log("   3. Scene hasn't fully loaded");
} else {
    console.log("🎵 DEMO FILE DETAILS:");
    console.log("-".repeat(80));
    
    demoFiles.forEach((obj, index) => {
        console.log(`\n[${index + 1}] ${obj.name}`);
        console.log(`   UUID: ${obj.uuid}`);
        console.log(`   Path: ${obj.userData?.path || 'NULL/MISSING'}`);
        console.log(`   URL: ${obj.userData?.url || 'NULL/MISSING'}`);
        console.log(`   isDemoContent: ${obj.userData?.isDemoContent || false}`);
        console.log(`   packageName: ${obj.userData?.packageName || 'N/A'}`);
    });
    
    // Count how many have null/missing paths
    const nullPaths = demoFiles.filter(obj => 
        !obj.userData?.path || 
        obj.userData?.path === null || 
        obj.userData?.path === 'null'
    );
    
    console.log("\n" + "=".repeat(80));
    console.log("📊 SUMMARY:");
    console.log("-".repeat(80));
    console.log(`Total demo files: ${demoFiles.length}`);
    console.log(`Files with NULL/missing path: ${nullPaths.length}`);
    console.log(`Files with valid path: ${demoFiles.length - nullPaths.length}`);
    
    if (nullPaths.length > 0) {
        console.error("\n❌ PROBLEM DETECTED:");
        console.log("   Some demo files have NULL paths - they were created BEFORE the fix.");
        console.log("   These files are persisted in Flutter storage with old metadata.");
        console.log("\n💡 SOLUTION:");
        console.log("   Delete all demo files and restart the app to regenerate them:");
        console.log("   1. Long-press each demo file and delete it");
        console.log("   2. Or clear all furniture (Settings > Reset World)");
        console.log("   3. Restart app - demo files will regenerate with correct paths");
    } else {
        console.log("\n✅ ALL DEMO FILES HAVE VALID PATHS!");
        console.log("   The path preservation fix is working correctly.");
        console.log("   If thumbnails still don't work, the issue is elsewhere.");
    }
}

console.log("\n" + "=".repeat(80));
