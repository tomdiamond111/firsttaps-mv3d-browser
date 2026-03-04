/**
 * DEEZER THUMBNAIL DIAGNOSTIC
 * 
 * Run this script in the browser console to debug Deezer face texture issues
 * 
 * Usage:
 * 1. Open app in browser
 * 2. Open DevTools Console (F12)
 * 3. Copy/paste this entire script and press Enter
 * 4. Review the diagnostic report
 */

(function() {
    console.log('====================================');
    console.log('DEEZER THUMBNAIL DIAGNOSTIC');
    console.log('====================================\n');

    // Get all file objects from state manager
    const stateManager = window.app?.stateManager || window.stateManager;
    if (!stateManager) {
        console.error('❌ StateManager not available');
        return;
    }

    const fileObjects = stateManager.fileObjects || [];
    const deezerObjects = fileObjects.filter(obj => {
        const url = obj.userData?.url || obj.userData?.fileData?.url || '';
        return url.includes('deezer.com');
    });

    console.log(`Found ${deezerObjects.length} Deezer objects\n`);

    if (deezerObjects.length === 0) {
        console.log('ℹ️ No Deezer objects found in scene');
        return;
    }

    // Check each Deezer object in detail
    deezerObjects.forEach((obj, index) => {
        const userData = obj.userData;
        const fileData = userData.fileData || {};
        const url = userData.url || fileData.url || 'No URL';
        const fileName = userData.fileName || fileData.fileName || fileData.name || 'Unknown';
        const linkData = userData.linkData || {};
        
        console.log(`\n--- Deezer Object ${index + 1} ---`);
        console.log(`Name: ${fileName}`);
        console.log(`URL: ${url}`);
        console.log(`Position: (${obj.position.x.toFixed(1)}, ${obj.position.y.toFixed(1)}, ${obj.position.z.toFixed(1)})`);
        
        // Check userData for thumbnail
        console.log('\n📊 UserData Check:');
        console.log(`  - thumbnailDataUrl: ${userData.thumbnailDataUrl ? 'YES (' + Math.floor(userData.thumbnailDataUrl.length / 1024) + ' KB)' : 'NO'}`);
        console.log(`  - brandingApplied: ${userData.brandingApplied || 'NO'}`);
        
        // Check linkData
        console.log('\n🔗 LinkData Check:');
        console.log(`  - linkData exists: ${!!linkData}`);
        console.log(`  - linkData.thumbnailUrl: ${linkData.thumbnailUrl || 'NO'}`);
        console.log(`  - linkData.title: ${linkData.title || 'NO'}`);
        
        // Check material structure
        console.log('\n🎨 Material Check:');
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                console.log(`  - Material array length: ${obj.material.length}`);
                
                // Check each face material
                obj.material.forEach((mat, i) => {
                    const hasMap = !!mat.map;
                    const mapIsImage = mat.map?.image ? 'YES' : 'NO';
                    const mapSize = mat.map?.image ? `${mat.map.image.width}x${mat.map.image.height}` : 'N/A';
                    
                    console.log(`  - Face ${i}: hasTexture=${hasMap}, hasImage=${mapIsImage}, size=${mapSize}`);
                    
                    // Face 4 is the front face where thumbnails should appear
                    if (i === 4) {
                        if (hasMap && mat.map.image) {
                            console.log(`    ✅ Front face (4) HAS texture applied!`);
                            console.log(`    Texture source: ${mat.map.image.src ? mat.map.image.src.substring(0, 100) + '...' : 'unknown'}`);
                        } else {
                            console.warn(`    ⚠️ Front face (4) MISSING texture!`);
                        }
                    }
                });
            } else {
                console.log(`  - Single material (not array)`);
                console.log(`  - Has map: ${!!obj.material.map}`);
            }
        } else {
            console.log(`  - No material found`);
        }
        
        // Check if thumbnail fetch was attempted
        console.log('\n🔍 Recommendation:');
        if (!linkData.thumbnailUrl) {
            console.log('  ⚠️ linkData.thumbnailUrl is missing');
            console.log('  → This means metadata fetch may have failed');
            console.log('  → Check console for Deezer metadata fetch errors');
        } else if (!obj.material[4]?.map) {
            console.log('  ⚠️ linkData has thumbnailUrl but face 4 has no texture');
            console.log('  → This means texture application failed');
            console.log('  → Check console for texture loading errors');
        } else {
            console.log('  ✅ Deezer thumbnail appears to be working correctly');
        }
    });

    // Summary
    console.log('\n====================================');
    console.log('DIAGNOSTIC SUMMARY');
    console.log('====================================');
    console.log(`Total Deezer objects: ${deezerObjects.length}`);
    
    const objectsWithThumbnails = deezerObjects.filter(obj => 
        obj.material && Array.isArray(obj.material) && obj.material[4]?.map?.image
    ).length;
    
    console.log(`Objects with face texture: ${objectsWithThumbnails}/${deezerObjects.length}`);
    
    if (objectsWithThumbnails < deezerObjects.length) {
        console.log('\n⚠️ ISSUE DETECTED: Some Deezer objects missing face textures');
        console.log('\n💡 SOLUTIONS:');
        console.log('1. Check if Deezer metadata fetch is working:');
        console.log('   - Look for "🎵 [DEEZER FLUTTER]" logs in console');
        console.log('   - Look for "✅ Deezer thumbnail applied" logs');
        console.log('');
        console.log('2. Try manually triggering thumbnail fetch:');
        console.log('   - Select a Deezer object and create a new one (see if new ones work)');
        console.log('');
        console.log('3. Check network tab for failed Deezer API requests');
        console.log('   - Should see requests to https://api.deezer.com/track/...');
        console.log('');
        console.log('4. Try reloading the app after clearing cache:');
        console.log('   - localStorage.clear()');
        console.log('   - location.reload()');
    } else {
        console.log('\n✅ All Deezer objects have face textures applied!');
    }

})();
