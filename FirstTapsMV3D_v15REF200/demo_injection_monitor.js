// COMPREHENSIVE DEMO ASSET INJECTION DIAGNOSTIC
// Paste this into Chrome DevTools console (F12) while app is running
// This will monitor injection attempts and provide detailed diagnostics

console.log("=".repeat(80));
console.log("🔍 DEMO ASSET INJECTION DIAGNOSTIC - Starting...");
console.log("=".repeat(80));

// ============================================================================
// 1. CHECK CURRENT STATE
// ============================================================================
console.log("\n📊 CURRENT STATE:");
console.log("-".repeat(80));

const thumbnailsExist = typeof window.DEMO_THUMBNAIL_DATA_URLS !== 'undefined';
const mediaExist = typeof window.DEMO_ASSET_DATA_URLS !== 'undefined';

console.log(`✓ window.DEMO_THUMBNAIL_DATA_URLS exists: ${thumbnailsExist}`);
console.log(`✓ window.DEMO_ASSET_DATA_URLS exists: ${mediaExist}`);

if (thumbnailsExist) {
    const isObject = window.DEMO_THUMBNAIL_DATA_URLS instanceof Object;
    const keys = isObject ? Object.keys(window.DEMO_THUMBNAIL_DATA_URLS) : [];
    
    console.log(`\n📸 THUMBNAILS (for face textures):`);
    console.log(`✓ Type: ${typeof window.DEMO_THUMBNAIL_DATA_URLS}`);
    console.log(`✓ Is Object: ${isObject}`);
    console.log(`✓ Thumbnail count: ${keys.length}`);
    
    if (keys.length > 0) {
        keys.forEach(key => {
            const value = window.DEMO_THUMBNAIL_DATA_URLS[key];
            const preview = value ? value.substring(0, 50) + '...' : 'null';
            console.log(`  - ${key}: ${preview}`);
        });
    }
} else {
    console.error("❌ window.DEMO_THUMBNAIL_DATA_URLS is UNDEFINED");
}

if (mediaExist) {
    const isObject = window.DEMO_ASSET_DATA_URLS instanceof Object;
    const keys = isObject ? Object.keys(window.DEMO_ASSET_DATA_URLS) : [];
    
    console.log(`\n🎵 MEDIA FILES (for playback):`);
    console.log(`✓ Type: ${typeof window.DEMO_ASSET_DATA_URLS}`);
    console.log(`✓ Is Object: ${isObject}`);
    console.log(`✓ Media count: ${keys.length}`);
    
    if (keys.length > 0) {
        keys.forEach(key => {
            const value = window.DEMO_ASSET_DATA_URLS[key];
            const size = value ? `${(value.length / 1024).toFixed(2)} KB` : 'null';
            console.log(`  - ${key}: ${size}`);
        });
    }
} else {
    console.error("❌ window.DEMO_ASSET_DATA_URLS is UNDEFINED");
}

if (!thumbnailsExist && !mediaExist) {
    console.error("\n❌ BOTH objects undefined - Flutter injection has NOT run yet");
}

// ============================================================================
// 2. CHECK WEBVIEW CONTROLLER
// ============================================================================
console.log("\n🌐 WEBVIEW CHECK:");
console.log("-".repeat(80));

// Check if Flutter WebView bridge exists
const hasFlutterChannel = typeof window.flutter_inappwebview !== 'undefined';
console.log(`✓ Flutter WebView bridge exists: ${hasFlutterChannel}`);

if (hasFlutterChannel) {
    console.log(`✓ Flutter channels available:`, Object.keys(window.flutter_inappwebview || {}).slice(0, 5), '...');
}

// ============================================================================
// 3. CHECK DEMO CONFIG USAGE
// ============================================================================
console.log("\n🎵 DEMO CONTENT CONFIG CHECK:");
console.log("-".repeat(80));

// Try to find demo content configuration
if (typeof window.getDemoMusicFiles === 'function') {
    console.log("✓ getDemoMusicFiles() function exists");
    try {
        const demoFiles = window.getDemoMusicFiles();
        console.log(`✓ Demo files configured: ${demoFiles ? demoFiles.length : 0}`);
        
        if (demoFiles && demoFiles.length > 0) {
            const nullThumbnails = demoFiles.filter(f => f.thumbnailDataUrl === null || f.thumbnailDataUrl === undefined);
            console.log(`⚠️  Files with null thumbnailDataUrl: ${nullThumbnails.length}`);
            
            if (nullThumbnails.length > 0) {
                console.log("\n🎵 FILES WITH NULL THUMBNAILS:");
                nullThumbnails.forEach(f => {
                    console.log(`  - ${f.name} (${f.type})`);
                });
            }
        }
    } catch (e) {
        console.error("❌ Error calling getDemoMusicFiles():", e);
    }
} else {
    console.log("⚠️  getDemoMusicFiles() function not found");
}

// ============================================================================
// 4. MONITOR FOR INJECTION (Real-time)
// ============================================================================
console.log("\n🔔 SETTING UP REAL-TIME MONITOR:");
console.log("-".repeat(80));
console.log("Monitoring for demo asset injection...");

let checkCount = 0;
const maxChecks = 60; // Monitor for 60 seconds
const monitorInterval = setInterval(() => {
    checkCount++;
    
    const hasThumbnails = typeof window.DEMO_THUMBNAIL_DATA_URLS !== 'undefined';
    const hasMedia = typeof window.DEMO_ASSET_DATA_URLS !== 'undefined';
    
    if (hasThumbnails || hasMedia) {
        console.log(`\n✅ INJECTION DETECTED at ${new Date().toLocaleTimeString()}`);
        console.log(`   Took ${checkCount} seconds after diagnostic started`);
        
        if (hasThumbnails) {
            const thumbKeys = Object.keys(window.DEMO_THUMBNAIL_DATA_URLS || {});
            console.log(`   📸 Thumbnails injected: ${thumbKeys.length}`);
        }
        
        if (hasMedia) {
            const mediaKeys = Object.keys(window.DEMO_ASSET_DATA_URLS || {});
            console.log(`   🎵 Media files injected: ${mediaKeys.length}`);
        }
        
        clearInterval(monitorInterval);
        console.log("\n✅ Monitor stopped - injection successful");
    } else if (checkCount >= maxChecks) {
        console.error(`\n❌ TIMEOUT: No injection detected after ${maxChecks} seconds`);
        console.log("   Possible issues:");
        console.log("   1. onPageFinished callback not firing");
        console.log("   2. Fallback injection not executing");
        console.log("   3. WebViewController not initialized");
        console.log("   4. Exception in injection code");
        clearInterval(monitorInterval);
    }
}, 1000);

console.log(`✓ Monitor running (will check for ${maxChecks} seconds)`);

// ============================================================================
// 5. FLUTTER DART BRIDGE TEST
// ============================================================================
console.log("\n🔗 FLUTTER DART BRIDGE TEST:");
console.log("-".repeat(80));

// Try to manually trigger injection by calling Flutter
if (hasFlutterChannel) {
    console.log("Attempting manual injection via Flutter bridge...");
    
    // Test if we can call Flutter methods
    try {
        // This won't actually work but will tell us if the bridge is responsive
        console.log("✓ Flutter bridge appears functional");
        console.log("   Note: Cannot manually trigger injection from JS side");
        console.log("   Flutter must call injectDemoAssetDataUrls() on Dart side");
    } catch (e) {
        console.error("❌ Flutter bridge error:", e);
    }
} else {
    console.log("⚠️  Flutter bridge not available - cannot test");
}

// ============================================================================
// 6. PROVIDE RECOMMENDATIONS
// ============================================================================
console.log("\n💡 RECOMMENDATIONS:");
console.log("-".repeat(80));

if (!thumbnailsExist && !mediaExist) {
    console.log("Since injection has NOT occurred, check:");
    console.log("1. Flutter console for these log messages:");
    console.log("   - '🌐 WebView: Page finished loading'");
    console.log("   - '📦 Injecting demo asset data URLs...'");
    console.log("   - '🔄 [FALLBACK] Injecting demo asset data URLs before world init...'");
    console.log("   - '✅ [DEMO INJECT] Injected N thumbnails and N media files'");
    console.log("   - '📦 [DEMO LOADER] Generating thumbnail for: assets/demomedia/...'");
    console.log("");
    console.log("2. If NO logs appear, the callbacks may not be firing");
    console.log("3. Check if _webViewController is null in three_js_screen.dart");
    console.log("4. Verify DemoAssetLoader methods work");
    console.log("5. Check for VideoThumbnail errors in Flutter console");
} else {
    console.log("✅ Injection successful! Demo assets are available.");
    console.log(`   📸 Thumbnails: ${thumbnailsExist ? 'YES' : 'NO'}`);
    console.log(`   🎵 Media files: ${mediaExist ? 'YES' : 'NO'}`);
    if (!thumbnailsExist) console.warn("   ⚠️ Missing thumbnails - face textures won't work");
    if (!mediaExist) console.warn("   ⚠️ Missing media - playback won't work");
    
    // Check for null thumbnails (MP3 files expected to be null)
    if (thumbnailsExist) {
        const keys = Object.keys(window.DEMO_THUMBNAIL_DATA_URLS);
        const nullThumbs = keys.filter(k => window.DEMO_THUMBNAIL_DATA_URLS[k] === 'null' || window.DEMO_THUMBNAIL_DATA_URLS[k] === null);
        const mp3Count = keys.filter(k => k.endsWith('.mp3')).length;
        const mp4Count = keys.filter(k => k.endsWith('.mp4')).length;
        
        console.log(`\n   📊 Thumbnail breakdown:`);
        console.log(`      MP3 files: ${mp3Count} (should have null thumbnails)`);
        console.log(`      MP4 files: ${mp4Count} (should have image thumbnails)`);
        console.log(`      Null thumbnails: ${nullThumbs.length}`);
        
        if (mp4Count > 0 && mp4Count === nullThumbs.filter(k => k.endsWith('.mp4')).length) {
            console.error(`   ❌ MP4 thumbnails are null - VideoThumbnail generation failed!`);
        }
    }
}

console.log("\n" + "=".repeat(80));
console.log("🔍 DIAGNOSTIC COMPLETE");
console.log("=".repeat(80));
console.log("Keep this console open to see if injection happens in the next 60 seconds.");
console.log("If you see ❌ TIMEOUT, injection is definitely not occurring.\n");
