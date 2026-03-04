/**
 * DEMO CONTENT THUMBNAIL DIAGNOSTIC
 * 
 * Run this script in the browser console to check all demo link thumbnails
 * and identify mismatched content (e.g., IG logo showing for TikTok link).
 * 
 * Usage:
 * 1. Open app in browser
 * 2. Open DevTools Console (F12)
 * 3. Copy/paste this entire script and press Enter
 * 4. Review the diagnostic report
 */

(function() {
    console.log('====================================');
    console.log('DEMO CONTENT THUMBNAIL DIAGNOSTIC');
    console.log('====================================\n');

    // Get all file objects from state manager
    const stateManager = window.app?.stateManager || window.stateManager;
    if (!stateManager) {
        console.error('❌ StateManager not available');
        return;
    }

    const fileObjects = stateManager.fileObjects || [];
    const demoObjects = fileObjects.filter(obj => obj.userData?.isDemoContent === true);

    console.log(`Found ${demoObjects.length} demo objects\n`);

    // Check each demo object
    const issues = [];
    
    demoObjects.forEach((obj, index) => {
        const userData = obj.userData;
        const fileData = userData.fileData || {};
        const url = userData.url || fileData.url || 'No URL';
        const fileName = userData.fileName || fileData.fileName || fileData.name || 'Unknown';
        const thumbnailDataUrl = userData.thumbnailDataUrl || fileData.thumbnailDataUrl;
        
        console.log(`\n--- Demo Object ${index + 1} ---`);
        console.log(`Name: ${fileName}`);
        console.log(`URL: ${url}`);
        console.log(`Has thumbnailDataUrl: ${!!thumbnailDataUrl}`);
        
        if (thumbnailDataUrl) {
            console.log(`Thumbnail length: ${thumbnailDataUrl.length} chars`);
            
            // Detect platform from URL
            let expectedPlatform = 'unknown';
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                expectedPlatform = 'YouTube';
            } else if (url.includes('tiktok.com')) {
                expectedPlatform = 'TikTok';
            } else if (url.includes('instagram.com')) {
                expectedPlatform = 'Instagram';
            } else if (url.includes('spotify.com')) {
                expectedPlatform = 'Spotify';
            }
            
            console.log(`Expected platform: ${expectedPlatform}`);
            
            // Check face texture/material
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    console.log(`Material: Array of ${obj.material.length} materials`);
                    // Check if any material has a texture map
                    const texturedFaces = obj.material.filter(mat => mat.map).length;
                    console.log(`Textured faces: ${texturedFaces}`);
                    
                    if (texturedFaces > 0) {
                        console.log('✅ Face texture applied');
                    } else {
                        console.warn('⚠️ No face texture found on materials');
                    }
                } else {
                    console.log('Material: Single material');
                    if (obj.material.map) {
                        console.log('✅ Face texture applied');
                    } else {
                        console.warn('⚠️ No face texture map');
                    }
                }
            }
            
            // Visual inspection prompt
            console.log(`\n🔍 VISUAL CHECK: Does the thumbnail match ${expectedPlatform}?`);
            console.log(`   Object position: (${obj.position.x.toFixed(1)}, ${obj.position.y.toFixed(1)}, ${obj.position.z.toFixed(1)})`);
            
        } else {
            console.warn('⚠️ No thumbnail data available');
            issues.push({
                name: fileName,
                url: url,
                issue: 'Missing thumbnail'
            });
        }
    });

    // Summary
    console.log('\n====================================');
    console.log('DIAGNOSTIC SUMMARY');
    console.log('====================================');
    console.log(`Total demo objects: ${demoObjects.length}`);
    console.log(`Issues found: ${issues.length}`);
    
    if (issues.length > 0) {
        console.log('\n⚠️ ISSUES DETECTED:');
        issues.forEach(issue => {
            console.log(`  - ${issue.name}: ${issue.issue}`);
            console.log(`    URL: ${issue.url}`);
        });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. If thumbnails are missing:');
    console.log('   - Check network tab for failed thumbnail requests');
    console.log('   - TikTok/Instagram may have CORS issues preventing thumbnail fetch');
    console.log('   - Try clearing cache: localStorage.removeItem("mv3d_default_furniture_created")');
    console.log('');
    console.log('2. If thumbnails show wrong platform logo:');
    console.log('   - This may be due to metadata caching');
    console.log('   - Check if background metadata enrichment is still pending');
    console.log('   - Look for "enrichAllLinkMetadata" logs in console');
    console.log('');
    console.log('3. To force refresh demo content:');
    console.log('   - Clear localStorage: localStorage.clear()');
    console.log('   - Reload app to recreate demo content with fresh thumbnails');

})();
