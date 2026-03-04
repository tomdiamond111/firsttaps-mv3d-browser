/**
 * LINK AND APP OBJECT FACE TEXTURE DIAGNOSTIC SCRIPT
 * 
 * This script specifically diagnoses why link and app objects lose their face textures
 * during world switches while image objects preserve them correctly.
 * 
 * USAGE:
 * 1. Open any world with link objects (YouTube links) and app objects
 * 2. Open browser console (F12)
 * 3. Paste this entire script and press Enter
 * 4. Switch worlds and compare link/app vs image object behavior
 */

(function() {
    'use strict';
    
    console.log('🔗 ========================================');
    console.log('🔗 LINK & APP OBJECT TEXTURE DIAGNOSTIC');
    console.log('🔗 ========================================');
    
    // Check current state of different object types
    function analyzeObjectTypes() {
        console.log('\n🔍 ANALYZING OBJECT TYPES:');
        
        if (!window.app || !window.app.stateManager) {
            console.error('❌ App or stateManager not available');
            return false;
        }
        
        const fileObjects = window.app.stateManager.fileObjects;
        console.log(`✓ Found ${fileObjects.length} file objects`);
        
        const analysis = {
            images: { count: 0, withThumbnails: 0, withoutThumbnails: 0 },
            videos: { count: 0, withThumbnails: 0, withoutThumbnails: 0 },
            links: { count: 0, withThumbnails: 0, withoutThumbnails: 0 },
            apps: { count: 0, withThumbnails: 0, withoutThumbnails: 0 },
            documents: { count: 0, withThumbnails: 0, withoutThumbnails: 0 },
            music: { count: 0, withThumbnails: 0, withoutThumbnails: 0 },
            contacts: { count: 0, withThumbnails: 0, withoutThumbnails: 0 },
            other: { count: 0, withThumbnails: 0, withoutThumbnails: 0 }
        };
        
        fileObjects.forEach((object, index) => {
            const fileName = object.userData.fileName;
            const fileData = object.userData.fileData;
            const hasThumbnail = !!(fileData && fileData.thumbnailDataUrl);
            const thumbnailLength = hasThumbnail ? fileData.thumbnailDataUrl.length : 0;
            const extension = fileData?.extension || '';
            const type = fileData?.type || '';
            
            // Categorize object
            let category = 'other';
            if (type === 'link' || fileName.includes('http')) {
                category = 'links';
            } else if (type === 'app' || fileName.endsWith('.app') || 
                      (fileData && fileData.id && fileData.id.startsWith('app_'))) {
                category = 'apps';
            } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(extension.toLowerCase())) {
                category = 'images';
            } else if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(extension.toLowerCase())) {
                category = 'videos';
            } else if (['.pdf', '.doc', '.docx', '.txt'].includes(extension.toLowerCase())) {
                category = 'documents';
            } else if (['.mp3', '.wav', '.flac', '.m4a'].includes(extension.toLowerCase())) {
                category = 'music';
            } else if (type === 'contact' || extension === '.contact') {
                category = 'contacts';
            }
            
            analysis[category].count++;
            if (hasThumbnail) {
                analysis[category].withThumbnails++;
            } else {
                analysis[category].withoutThumbnails++;
            }
            
            // Detailed logging for link and app objects
            if (category === 'links' || category === 'apps') {
                console.log(`\n🎯 ${category.toUpperCase()} OBJECT: ${fileName}`);
                console.log(`   📊 Type: ${type}, Extension: ${extension}`);
                console.log(`   📊 Has thumbnailDataUrl: ${hasThumbnail} (${thumbnailLength} chars)`);
                console.log(`   📊 FileData ID: ${fileData?.id}`);
                console.log(`   📊 FileData object:`, fileData);
                
                // Check if object has visual face texture
                const hasVisualTexture = object.material && Array.isArray(object.material) && 
                                       object.material[4] && object.material[4].map;
                console.log(`   🎨 Visual face texture applied: ${hasVisualTexture}`);
                
                // Check attachments
                if (object.attachments) {
                    console.log(`   📎 Attachments exist: true`);
                    console.log(`   📎 Face texture in attachments: ${!!object.attachments.faceTexture}`);
                    if (object.attachments.faceTexture) {
                        console.log(`   📎 Face texture type: ${typeof object.attachments.faceTexture}`);
                        console.log(`   📎 Face texture preview:`, 
                                   typeof object.attachments.faceTexture === 'string' ? 
                                   object.attachments.faceTexture.substring(0, 100) : 
                                   object.attachments.faceTexture);
                    }
                } else {
                    console.log(`   📎 No attachments found`);
                }
            }
        });
        
        console.log('\n📊 OBJECT TYPE ANALYSIS:');
        Object.entries(analysis).forEach(([type, data]) => {
            if (data.count > 0) {
                const successRate = ((data.withThumbnails / data.count) * 100).toFixed(1);
                console.log(`   ${type.toUpperCase()}: ${data.count} total, ${data.withThumbnails} with thumbnails (${successRate}%)`);
            }
        });
        
        return analysis;
    }
    
    // Check how objects are being processed during face texture application
    function interceptFaceTextureProcessing() {
        console.log('\n🔍 INTERCEPTING FACE TEXTURE PROCESSING:');
        
        if (!window.app.billboardManager || !window.app.billboardManager.updateObjectVisuals) {
            console.error('❌ BillboardManager or updateObjectVisuals not found');
            return false;
        }
        
        const originalUpdateObjectVisuals = window.app.billboardManager.updateObjectVisuals.bind(window.app.billboardManager);
        
        window.app.billboardManager.updateObjectVisuals = function(object, fileData) {
            const fileName = object.userData.fileName;
            const type = fileData?.type || 'unknown';
            const extension = fileData?.extension || '';
            const hasThumbnail = !!(fileData && fileData.thumbnailDataUrl);
            
            // Log processing for link and app objects
            if (type === 'link' || type === 'app' || fileName.includes('http') || 
                (fileData && fileData.id && fileData.id.startsWith('app_'))) {
                console.log(`\n🎨 FACE TEXTURE PROCESSING: ${fileName}`);
                console.log(`   Type: ${type}, Extension: ${extension}`);
                console.log(`   Has thumbnailDataUrl: ${hasThumbnail}`);
                console.log(`   ThumbnailDataUrl length: ${fileData && fileData.thumbnailDataUrl ? fileData.thumbnailDataUrl.length : 0}`);
                console.log(`   FileData:`, fileData);
            }
            
            // Call original method
            const result = originalUpdateObjectVisuals.call(this, object, fileData);
            
            // Check result for link and app objects
            if (type === 'link' || type === 'app' || fileName.includes('http') || 
                (fileData && fileData.id && fileData.id.startsWith('app_'))) {
                const hasVisualTexture = object.material && Array.isArray(object.material) && 
                                       object.material[4] && object.material[4].map;
                console.log(`   ✅ Processing complete. Visual texture applied: ${hasVisualTexture}`);
            }
            
            return result;
        };
        
        console.log('✓ Face texture processing intercepted');
        return true;
    }
    
    // Check specific issues with link object creation
    function checkLinkObjectCreation() {
        console.log('\n🔍 CHECKING LINK OBJECT CREATION:');
        
        const fileObjects = window.app.stateManager.fileObjects;
        const linkObjects = fileObjects.filter(obj => {
            const fileData = obj.userData.fileData;
            return fileData?.type === 'link' || 
                   obj.userData.fileName.includes('http') ||
                   (fileData && fileData.id && fileData.id.includes('link'));
        });
        
        console.log(`Found ${linkObjects.length} link objects`);
        
        linkObjects.forEach((object, index) => {
            const fileName = object.userData.fileName;
            const fileData = object.userData.fileData;
            
            console.log(`\n🔗 LINK OBJECT ${index + 1}: ${fileName}`);
            console.log(`   ID: ${fileData?.id}`);
            console.log(`   Extension: ${fileData?.extension}`);
            console.log(`   Type: ${fileData?.type}`);
            console.log(`   MIME Type: ${fileData?.mimeType}`);
            console.log(`   Has thumbnailDataUrl: ${!!(fileData && fileData.thumbnailDataUrl)}`);
            console.log(`   ThumbnailDataUrl length: ${fileData && fileData.thumbnailDataUrl ? fileData.thumbnailDataUrl.length : 0}`);
            
            // Check if this object was created with proper data
            if (fileData && fileData.thumbnailDataUrl) {
                console.log(`   ✅ Link has thumbnail data - checking if it's valid`);
                const dataUrl = fileData.thumbnailDataUrl;
                if (dataUrl.startsWith('data:')) {
                    console.log(`   ✅ Valid data URL format`);
                } else {
                    console.log(`   ⚠️ Invalid data URL format: ${dataUrl.substring(0, 50)}...`);
                }
            } else {
                console.log(`   ❌ Link missing thumbnail data`);
                
                // Check if we can find the data elsewhere
                if (object.attachments && object.attachments.faceTexture) {
                    console.log(`   🔍 Found face texture in attachments: ${typeof object.attachments.faceTexture}`);
                } else {
                    console.log(`   🔍 No face texture found in attachments either`);
                }
            }
        });
        
        return linkObjects;
    }
    
    // Instructions
    function printInstructions() {
        console.log('\n📋 ANALYSIS COMPLETE - KEY FINDINGS:');
        console.log('1. Check the object type analysis above');
        console.log('2. Look for differences between image objects (should have thumbnails) and link/app objects');
        console.log('3. Switch worlds and run this script again to see if thumbnails are preserved');
        console.log('4. Look for any processing differences in the face texture logs');
        console.log('\n💡 RECOMMENDED ACTIONS:');
        console.log('• If link/app objects have 0% thumbnail success rate → Issue is in Flutter data generation');
        console.log('• If link/app objects lose thumbnails after world switch → Issue is in preservation logic');
        console.log('• If processing logs show different behavior → Issue is in face texture application');
    }
    
    // Main function
    function runAnalysis() {
        console.log('Starting link & app object texture analysis...\n');
        
        const analysis = analyzeObjectTypes();
        if (!analysis) return false;
        
        checkLinkObjectCreation();
        interceptFaceTextureProcessing();
        
        printInstructions();
        
        console.log('\n✅ ANALYSIS SETUP COMPLETE');
        console.log('🔗 Link & app object diagnostic is now active');
        
        return true;
    }
    
    // Provide access to re-run analysis
    window.analyzeLinkAppTextures = runAnalysis;
    
    // Run the analysis
    return runAnalysis();
})();