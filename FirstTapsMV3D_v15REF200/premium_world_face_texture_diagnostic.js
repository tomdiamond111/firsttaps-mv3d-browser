/**
 * PREMIUM WORLD FACE TEXTURE INITIALIZATION DIAGNOSTIC SCRIPT
 * 
 * This script diagnoses why link and app object thumbnails fail to load
 * when the app opens directly into premium worlds (Cave Explorer, Christmas)
 * but work fine when opening into Green Plane.
 * 
 * USAGE:
 * 1. Switch to Cave Explorer or Christmas world
 * 2. Open browser console (F12)
 * 3. Paste this entire script and press Enter
 * 4. Compare results with Green Plane world
 */

(function() {
    'use strict';
    
    console.log('🏰 ========================================');
    console.log('🏰 PREMIUM WORLD FACE TEXTURE DIAGNOSTIC');
    console.log('🏰 ========================================');
    
    // 1. Check current world and initialization state
    function checkWorldInitialization() {
        console.log('\n🔍 1. WORLD INITIALIZATION CHECK:');
        
        if (!window.app) {
            console.error('❌ window.app not available');
            return false;
        }
        
        const currentWorld = window.app.currentWorldTemplate?.getType?.() || 'unknown';
        console.log(`✓ Current world: ${currentWorld}`);
        
        // Check if this is a premium world
        const isPremiumWorld = ['cave', 'christmas'].includes(currentWorld);
        console.log(`✓ Is premium world: ${isPremiumWorld}`);
        
        // Check world loading sequence
        console.log(`✓ World template available: ${!!window.app.currentWorldTemplate}`);
        console.log(`✓ State manager available: ${!!window.app.stateManager}`);
        console.log(`✓ Billboard manager available: ${!!window.app.billboardManager}`);
        console.log(`✓ World manager available: ${!!window.app.worldManager}`);
        
        return { currentWorld, isPremiumWorld };
    }
    
    // 2. Check face texture system initialization
    function checkFaceTextureSystem() {
        console.log('\n🔍 2. FACE TEXTURE SYSTEM CHECK:');
        
        const stateManager = window.app.stateManager;
        if (!stateManager) {
            console.error('❌ State manager not available');
            return false;
        }
        
        // Check face texture options
        const faceTextureEnabled = stateManager.currentDisplayOptions?.useFaceTextures;
        console.log(`✓ Face textures enabled: ${faceTextureEnabled}`);
        
        // Check billboard manager state
        const billboardManager = window.app.billboardManager;
        if (billboardManager) {
            console.log(`✓ Billboard manager exists: true`);
            console.log(`✓ updateObjectVisuals method: ${typeof billboardManager.updateObjectVisuals}`);
            console.log(`✓ createImageFaceTexture method: ${typeof billboardManager.createImageFaceTexture}`);
        } else {
            console.error('❌ Billboard manager not available');
        }
        
        return true;
    }
    
    // 3. Analyze link and app objects specifically
    function analyzeLinkAppObjects() {
        console.log('\n🔍 3. LINK & APP OBJECT ANALYSIS:');
        
        const fileObjects = window.app.stateManager.fileObjects;
        const linkObjects = [];
        const appObjects = [];
        
        fileObjects.forEach(object => {
            const fileName = object.userData.fileName;
            const fileData = object.userData.fileData;
            const type = fileData?.type || '';
            const id = fileData?.id || '';
            
            // Identify link objects
            if (type === 'link' || fileName.includes('http') || fileName.includes('youtube') || fileName.includes('youtu.be')) {
                linkObjects.push({
                    object,
                    fileName,
                    fileData,
                    hasThumbnail: !!(fileData && fileData.thumbnailDataUrl),
                    thumbnailLength: fileData && fileData.thumbnailDataUrl ? fileData.thumbnailDataUrl.length : 0,
                    hasVisualTexture: object.material && Array.isArray(object.material) && 
                                    object.material[4] && object.material[4].map
                });
            }
            
            // Identify app objects
            if (type === 'app' || id.startsWith('app_') || fileName.endsWith('.app')) {
                appObjects.push({
                    object,
                    fileName,
                    fileData,
                    hasThumbnail: !!(fileData && fileData.thumbnailDataUrl),
                    thumbnailLength: fileData && fileData.thumbnailDataUrl ? fileData.thumbnailDataUrl.length : 0,
                    hasVisualTexture: object.material && Array.isArray(object.material) && 
                                    object.material[4] && object.material[4].map
                });
            }
        });
        
        console.log(`📊 Found ${linkObjects.length} link objects, ${appObjects.length} app objects`);
        
        // Analyze link objects
        console.log('\n🔗 LINK OBJECTS:');
        linkObjects.forEach((linkObj, index) => {
            console.log(`   ${index + 1}. ${linkObj.fileName}:`);
            console.log(`      📊 Has thumbnailDataUrl: ${linkObj.hasThumbnail} (${linkObj.thumbnailLength} chars)`);
            console.log(`      🎨 Visual texture applied: ${linkObj.hasVisualTexture}`);
            console.log(`      📝 Type: ${linkObj.fileData?.type}, ID: ${linkObj.fileData?.id}`);
            
            // Check if thumbnail exists but is invalid
            if (linkObj.hasThumbnail && linkObj.thumbnailLength < 100) {
                console.warn(`      ⚠️ Thumbnail too short - likely invalid: "${linkObj.fileData.thumbnailDataUrl}"`);
            }
            
            // Check attachments
            if (linkObj.object.attachments && linkObj.object.attachments.faceTexture) {
                console.log(`      📎 Face texture in attachments: ${typeof linkObj.object.attachments.faceTexture}`);
            }
        });
        
        // Analyze app objects
        console.log('\n📱 APP OBJECTS:');
        appObjects.forEach((appObj, index) => {
            console.log(`   ${index + 1}. ${appObj.fileName}:`);
            console.log(`      📊 Has thumbnailDataUrl: ${appObj.hasThumbnail} (${appObj.thumbnailLength} chars)`);
            console.log(`      🎨 Visual texture applied: ${appObj.hasVisualTexture}`);
            console.log(`      📝 Type: ${appObj.fileData?.type}, ID: ${appObj.fileData?.id}`);
            
            // Check attachments
            if (appObj.object.attachments && appObj.object.attachments.faceTexture) {
                console.log(`      📎 Face texture in attachments: ${typeof appObj.object.attachments.faceTexture}`);
            }
        });
        
        return { linkObjects, appObjects };
    }
    
    // 4. Check initialization timing
    function checkInitializationTiming() {
        console.log('\n🔍 4. INITIALIZATION TIMING CHECK:');
        
        // Check if objects were processed for face textures
        const processedObjects = window.app.stateManager.fileObjects.filter(obj => {
            return obj.attachments && obj.attachments.faceTexture;
        });
        
        console.log(`📊 Objects with face texture attachments: ${processedObjects.length}`);
        
        // Check if face texture processing happened
        const billboardManager = window.app.billboardManager;
        if (billboardManager) {
            // Look for any signs of face texture processing
            console.log(`📊 Billboard manager state:`, {
                hasUpdateObjectVisuals: typeof billboardManager.updateObjectVisuals === 'function',
                hasCreateImageFaceTexture: typeof billboardManager.createImageFaceTexture === 'function'
            });
        }
        
        return true;
    }
    
    // 5. Test face texture system functionality
    function testFaceTextureSystem() {
        console.log('\n🔍 5. FACE TEXTURE SYSTEM TEST:');
        
        const fileObjects = window.app.stateManager.fileObjects;
        const testObject = fileObjects.find(obj => {
            const fileData = obj.userData.fileData;
            return fileData && (fileData.type === 'link' || fileData.type === 'app' || 
                              (fileData.id && fileData.id.startsWith('app_')));
        });
        
        if (!testObject) {
            console.warn('⚠️ No link or app objects found for testing');
            return false;
        }
        
        console.log(`🧪 Testing with object: ${testObject.userData.fileName}`);
        
        const billboardManager = window.app.billboardManager;
        if (!billboardManager || !billboardManager.updateObjectVisuals) {
            console.error('❌ Billboard manager or updateObjectVisuals not available');
            return false;
        }
        
        try {
            // Test if face texture processing works
            console.log('🧪 Calling updateObjectVisuals...');
            billboardManager.updateObjectVisuals(testObject, testObject.userData.fileData);
            console.log('✅ updateObjectVisuals completed without error');
            
            // Check result
            const hasVisualTexture = testObject.material && Array.isArray(testObject.material) && 
                                   testObject.material[4] && testObject.material[4].map;
            console.log(`🎨 Visual texture applied after test: ${hasVisualTexture}`);
            
        } catch (error) {
            console.error('❌ updateObjectVisuals failed:', error);
        }
        
        return true;
    }
    
    // 6. Compare with expected Green Plane behavior
    function compareWithGreenPlane() {
        console.log('\n🔍 6. GREEN PLANE COMPARISON:');
        
        console.log('📋 EXPECTED BEHAVIOR IN GREEN PLANE:');
        console.log('   • Link objects should have thumbnailDataUrl with YouTube preview images');
        console.log('   • App objects should have thumbnailDataUrl with app icons');
        console.log('   • Visual textures should be applied to material[4]');
        console.log('   • Face texture attachments should exist');
        
        console.log('\n📋 CURRENT BEHAVIOR IN PREMIUM WORLD:');
        const { linkObjects, appObjects } = analyzeLinkAppObjects();
        
        const linkThumbnailSuccess = linkObjects.filter(obj => obj.hasThumbnail && obj.thumbnailLength > 100).length;
        const appThumbnailSuccess = appObjects.filter(obj => obj.hasThumbnail && obj.thumbnailLength > 100).length;
        
        console.log(`   • Link thumbnail success: ${linkThumbnailSuccess}/${linkObjects.length}`);
        console.log(`   • App thumbnail success: ${appThumbnailSuccess}/${appObjects.length}`);
        
        if (linkThumbnailSuccess === 0 && appThumbnailSuccess === 0) {
            console.error('❌ CRITICAL: No link or app thumbnails loaded - this confirms the premium world issue');
        } else if (linkThumbnailSuccess < linkObjects.length || appThumbnailSuccess < appObjects.length) {
            console.warn('⚠️ PARTIAL FAILURE: Some thumbnails missing');
        } else {
            console.log('✅ All thumbnails loaded correctly');
        }
    }
    
    // 7. Provide diagnostic recommendations
    function provideDiagnosticRecommendations() {
        console.log('\n💡 DIAGNOSTIC RECOMMENDATIONS:');
        
        const worldInfo = checkWorldInitialization();
        if (!worldInfo) return;
        
        if (worldInfo.isPremiumWorld) {
            console.log('🏰 PREMIUM WORLD DETECTED - Potential issues:');
            console.log('   1. Face texture system may not initialize properly in premium worlds');
            console.log('   2. Thumbnail loading may be skipped during premium world startup');
            console.log('   3. World template differences may affect face texture processing');
            console.log('\n🔧 RECOMMENDED FIXES:');
            console.log('   • Check world template initialization order');
            console.log('   • Ensure face texture system runs after premium world setup');
            console.log('   • Verify thumbnail data is preserved during world template creation');
            console.log('   • Add premium world support to face texture initialization');
        } else {
            console.log('🌱 NON-PREMIUM WORLD - Expected to work normally');
        }
        
        console.log('\n🧪 TO TEST THE FIX:');
        console.log('   1. Switch to Green Plane and verify thumbnails work');
        console.log('   2. Switch to Cave Explorer and run this diagnostic');
        console.log('   3. Compare the results to identify the exact failure point');
    }
    
    // Main diagnostic function
    function runPremiumWorldDiagnostic() {
        console.log('Starting premium world face texture diagnostic...\n');
        
        const worldInfo = checkWorldInitialization();
        if (!worldInfo) return false;
        
        checkFaceTextureSystem();
        analyzeLinkAppObjects();
        checkInitializationTiming();
        testFaceTextureSystem();
        compareWithGreenPlane();
        provideDiagnosticRecommendations();
        
        console.log('\n✅ PREMIUM WORLD DIAGNOSTIC COMPLETE');
        console.log('🏰 Check the analysis above to identify the root cause');
        
        return true;
    }
    
    // Run the diagnostic
    return runPremiumWorldDiagnostic();
})();