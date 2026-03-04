/**
 * FACE TEXTURE PRESERVATION DIAGNOSTIC SCRIPT
 * 
 * This script diagnoses why face textures and image previews disappear during world switches.
 * It monitors the complete flow of thumbnailDataUrl preservation across world transitions.
 * 
 * USAGE:
 * 1. Open any world with objects that have face textures
 * 2. Open browser console (F12)
 * 3. Paste this entire script and press Enter
 * 4. Switch worlds and watch the detailed diagnostic output
 * 5. Look for where thumbnailDataUrl becomes null/undefined
 */

(function() {
    'use strict';
    
    console.log('🖼️ ========================================');
    console.log('🖼️ FACE TEXTURE PRESERVATION DIAGNOSTIC');
    console.log('🖼️ ========================================');
    
    // Store original methods for interception
    const originalMethods = {};
    
    // 1. Check current state of face textures
    function checkCurrentFaceTextures() {
        console.log('\n🔍 1. CURRENT FACE TEXTURE STATE:');
        
        if (!window.app || !window.app.stateManager) {
            console.error('❌ App or stateManager not available');
            return false;
        }
        
        const fileObjects = window.app.stateManager.fileObjects;
        console.log(`✓ Found ${fileObjects.length} file objects`);
        
        let texturedObjects = 0;
        let missingTextures = 0;
        
        fileObjects.forEach((object, index) => {
            const fileName = object.userData.fileName;
            const fileData = object.userData.fileData;
            const hasThumbnail = !!(fileData && fileData.thumbnailDataUrl);
            const thumbnailLength = hasThumbnail ? fileData.thumbnailDataUrl.length : 0;
            
            // Check if object has visual face texture applied
            const hasVisualTexture = object.material && Array.isArray(object.material) && 
                                   object.material[4] && object.material[4].map;
            
            console.log(`📄 ${index + 1}. ${fileName}:`);
            console.log(`   📊 fileData.thumbnailDataUrl: ${hasThumbnail ? 'EXISTS' : 'MISSING'} (${thumbnailLength} chars)`);
            console.log(`   🎨 Visual face texture: ${hasVisualTexture ? 'APPLIED' : 'MISSING'}`);
            
            if (hasThumbnail) texturedObjects++;
            else missingTextures++;
            
            // Check attachments if available
            if (object.attachments) {
                const hasAttachmentTexture = !!(object.attachments.faceTexture);
                console.log(`   📎 Attachments face texture: ${hasAttachmentTexture ? 'EXISTS' : 'MISSING'}`);
            }
        });
        
        console.log(`\n📈 SUMMARY: ${texturedObjects} objects with thumbnails, ${missingTextures} missing textures`);
        return true;
    }
    
    // 2. Check SharedStateManager storage system
    function checkStateManagerStorage() {
        console.log('\n🔍 2. SHARED STATE MANAGER CHECK:');
        
        if (!window.app.stateManager.worldObjectStates) {
            console.error('❌ worldObjectStates not available');
            return false;
        }
        
        const fileObjects = window.app.stateManager.fileObjects;
        let storedStates = 0;
        let statesWithThumbnails = 0;
        
        fileObjects.forEach(object => {
            const objectStates = window.app.stateManager.worldObjectStates.get(object.uuid);
            if (objectStates) {
                storedStates++;
                console.log(`\n📦 ${object.userData.fileName} (${object.uuid}):`);
                console.log(`   Worlds stored: ${Array.from(objectStates.keys()).join(', ')}`);
                
                objectStates.forEach((state, worldType) => {
                    const hasThumbnail = !!(state.userData && state.userData.fileData && state.userData.fileData.thumbnailDataUrl);
                    const thumbnailLength = hasThumbnail ? state.userData.fileData.thumbnailDataUrl.length : 0;
                    
                    console.log(`   🌍 ${worldType}: thumbnailDataUrl ${hasThumbnail ? 'EXISTS' : 'MISSING'} (${thumbnailLength} chars)`);
                    
                    if (hasThumbnail) statesWithThumbnails++;
                });
            } else {
                console.log(`❌ No stored states for ${object.userData.fileName}`);
            }
        });
        
        console.log(`\n📈 STORAGE SUMMARY: ${storedStates} objects with stored states, ${statesWithThumbnails} states with thumbnails`);
        return true;
    }
    
    // 3. Intercept storeCurrentObjectState method
    function interceptStoreMethod() {
        console.log('\n🔍 3. INTERCEPTING STORE METHOD:');
        
        const stateManager = window.app.stateManager;
        if (!stateManager.storeCurrentObjectState) {
            console.error('❌ storeCurrentObjectState method not found');
            return false;
        }
        
        originalMethods.storeCurrentObjectState = stateManager.storeCurrentObjectState.bind(stateManager);
        
        stateManager.storeCurrentObjectState = function(object, worldType) {
            console.log(`\n💾 INTERCEPTED STORE: ${object.userData.fileName} → ${worldType}`);
            
            const originalFileData = object.userData.fileData;
            const originalThumbnail = originalFileData ? originalFileData.thumbnailDataUrl : null;
            
            console.log(`   📊 BEFORE STORE:`);
            console.log(`      Original thumbnailDataUrl: ${originalThumbnail ? 'EXISTS' : 'MISSING'} (${originalThumbnail ? originalThumbnail.length : 0} chars)`);
            console.log(`      FileData object:`, originalFileData);
            
            // Call original method
            const result = originalMethods.storeCurrentObjectState.call(this, object, worldType);
            
            // Check what was actually stored
            const objectStates = this.worldObjectStates.get(object.uuid);
            if (objectStates && objectStates.has(worldType)) {
                const storedState = objectStates.get(worldType);
                const storedThumbnail = storedState.userData && storedState.userData.fileData ? 
                                      storedState.userData.fileData.thumbnailDataUrl : null;
                
                console.log(`   📊 AFTER STORE:`);
                console.log(`      Stored thumbnailDataUrl: ${storedThumbnail ? 'EXISTS' : 'MISSING'} (${storedThumbnail ? storedThumbnail.length : 0} chars)`);
                console.log(`      Stored fileData:`, storedState.userData.fileData);
                
                if (originalThumbnail && !storedThumbnail) {
                    console.error(`   ❌ CRITICAL: thumbnailDataUrl was LOST during storage!`);
                } else if (originalThumbnail && storedThumbnail && originalThumbnail !== storedThumbnail) {
                    console.warn(`   ⚠️ WARNING: thumbnailDataUrl was modified during storage!`);
                } else if (originalThumbnail && storedThumbnail) {
                    console.log(`   ✅ SUCCESS: thumbnailDataUrl preserved correctly`);
                }
            }
            
            return result;
        };
        
        console.log('✓ Store method intercepted');
        return true;
    }
    
    // 4. Intercept restoreObjectState method
    function interceptRestoreMethod() {
        console.log('\n🔍 4. INTERCEPTING RESTORE METHOD:');
        
        const stateManager = window.app.stateManager;
        if (!stateManager.restoreObjectState) {
            console.error('❌ restoreObjectState method not found');
            return false;
        }
        
        originalMethods.restoreObjectState = stateManager.restoreObjectState.bind(stateManager);
        
        stateManager.restoreObjectState = function(object, worldType) {
            console.log(`\n🔄 INTERCEPTED RESTORE: ${object.userData.fileName} ← ${worldType}`);
            
            const originalFileData = object.userData.fileData;
            const originalThumbnail = originalFileData ? originalFileData.thumbnailDataUrl : null;
            
            console.log(`   📊 BEFORE RESTORE:`);
            console.log(`      Current thumbnailDataUrl: ${originalThumbnail ? 'EXISTS' : 'MISSING'} (${originalThumbnail ? originalThumbnail.length : 0} chars)`);
            
            // Check what's available to restore
            const objectStates = this.worldObjectStates.get(object.uuid);
            if (objectStates && objectStates.has(worldType)) {
                const savedState = objectStates.get(worldType);
                const savedThumbnail = savedState.userData && savedState.userData.fileData ? 
                                     savedState.userData.fileData.thumbnailDataUrl : null;
                
                console.log(`   📊 AVAILABLE TO RESTORE:`);
                console.log(`      Saved thumbnailDataUrl: ${savedThumbnail ? 'EXISTS' : 'MISSING'} (${savedThumbnail ? savedThumbnail.length : 0} chars)`);
            } else {
                console.log(`   ❌ No saved state found for world ${worldType}`);
            }
            
            // Call original method
            const result = originalMethods.restoreObjectState.call(this, object, worldType);
            
            // Check what was actually restored
            const restoredFileData = object.userData.fileData;
            const restoredThumbnail = restoredFileData ? restoredFileData.thumbnailDataUrl : null;
            
            console.log(`   📊 AFTER RESTORE:`);
            console.log(`      Restored thumbnailDataUrl: ${restoredThumbnail ? 'EXISTS' : 'MISSING'} (${restoredThumbnail ? restoredThumbnail.length : 0} chars)`);
            console.log(`      Result: ${result}`);
            
            if (!originalThumbnail && restoredThumbnail) {
                console.log(`   ✅ SUCCESS: thumbnailDataUrl was restored`);
            } else if (originalThumbnail && !restoredThumbnail) {
                console.error(`   ❌ CRITICAL: thumbnailDataUrl was LOST during restore!`);
            } else if (originalThumbnail && restoredThumbnail && originalThumbnail !== restoredThumbnail) {
                console.warn(`   ⚠️ WARNING: thumbnailDataUrl was changed during restore!`);
            }
            
            return result;
        };
        
        console.log('✓ Restore method intercepted');
        return true;
    }
    
    // 5. Intercept world switch method
    function interceptWorldSwitch() {
        console.log('\n🔍 5. INTERCEPTING WORLD SWITCH:');
        
        if (!window.app.worldManager || !window.app.worldManager.switchWorldTemplate) {
            console.error('❌ World manager or switchWorldTemplate method not found');
            return false;
        }
        
        originalMethods.switchWorldTemplate = window.app.worldManager.switchWorldTemplate.bind(window.app.worldManager);
        
        window.app.worldManager.switchWorldTemplate = async function(newWorldType) {
            console.log(`\n🌍 INTERCEPTED WORLD SWITCH: → ${newWorldType}`);
            
            // Capture state before switch
            const fileObjects = window.app.stateManager.fileObjects;
            const preSwitch = {};
            
            fileObjects.forEach(object => {
                const fileData = object.userData.fileData;
                preSwitch[object.userData.fileName] = {
                    hasThumbnail: !!(fileData && fileData.thumbnailDataUrl),
                    thumbnailLength: fileData && fileData.thumbnailDataUrl ? fileData.thumbnailDataUrl.length : 0
                };
            });
            
            console.log(`   📊 PRE-SWITCH STATE: ${Object.keys(preSwitch).length} objects checked`);
            
            // Call original method
            const result = await originalMethods.switchWorldTemplate.call(this, newWorldType);
            
            // Check state after switch
            const postSwitch = {};
            fileObjects.forEach(object => {
                const fileData = object.userData.fileData;
                postSwitch[object.userData.fileName] = {
                    hasThumbnail: !!(fileData && fileData.thumbnailDataUrl),
                    thumbnailLength: fileData && fileData.thumbnailDataUrl ? fileData.thumbnailDataUrl.length : 0
                };
            });
            
            console.log(`\n   📊 POST-SWITCH COMPARISON:`);
            Object.keys(preSwitch).forEach(fileName => {
                const pre = preSwitch[fileName];
                const post = postSwitch[fileName];
                
                if (pre.hasThumbnail && !post.hasThumbnail) {
                    console.error(`   ❌ ${fileName}: LOST thumbnailDataUrl (was ${pre.thumbnailLength} chars)`);
                } else if (!pre.hasThumbnail && post.hasThumbnail) {
                    console.log(`   ✅ ${fileName}: GAINED thumbnailDataUrl (${post.thumbnailLength} chars)`);
                } else if (pre.hasThumbnail && post.hasThumbnail) {
                    if (pre.thumbnailLength !== post.thumbnailLength) {
                        console.warn(`   ⚠️ ${fileName}: thumbnailDataUrl LENGTH CHANGED (${pre.thumbnailLength} → ${post.thumbnailLength})`);
                    } else {
                        console.log(`   ✅ ${fileName}: thumbnailDataUrl preserved (${post.thumbnailLength} chars)`);
                    }
                } else {
                    console.log(`   ➖ ${fileName}: No thumbnailDataUrl (before or after)`);
                }
            });
            
            return result;
        };
        
        console.log('✓ World switch method intercepted');
        return true;
    }
    
    // 6. Monitor FileData changes
    function monitorFileDataChanges() {
        console.log('\n🔍 6. SETTING UP FILEDATA MONITORING:');
        
        // Create a proxy to monitor fileData changes
        const fileObjects = window.app.stateManager.fileObjects;
        
        fileObjects.forEach((object, index) => {
            const fileName = object.userData.fileName;
            const fileData = object.userData.fileData;
            
            if (fileData && !fileData._monitored) {
                // Create proxy to monitor thumbnailDataUrl changes
                const originalThumbnailDataUrl = fileData.thumbnailDataUrl;
                
                Object.defineProperty(fileData, 'thumbnailDataUrl', {
                    get() {
                        return this._thumbnailDataUrl;
                    },
                    set(value) {
                        const oldValue = this._thumbnailDataUrl;
                        const oldLength = oldValue ? oldValue.length : 0;
                        const newLength = value ? value.length : 0;
                        
                        if (oldValue !== value) {
                            console.log(`\n📄 ${fileName} thumbnailDataUrl CHANGED:`);
                            console.log(`   Old: ${oldValue ? 'EXISTS' : 'NULL'} (${oldLength} chars)`);
                            console.log(`   New: ${value ? 'EXISTS' : 'NULL'} (${newLength} chars)`);
                            console.trace('Change stack trace:');
                        }
                        
                        this._thumbnailDataUrl = value;
                    },
                    enumerable: true,
                    configurable: true
                });
                
                fileData._thumbnailDataUrl = originalThumbnailDataUrl;
                fileData._monitored = true;
            }
        });
        
        console.log(`✓ Monitoring set up for ${fileObjects.length} objects`);
        return true;
    }
    
    // 7. Provide restoration function
    function restoreOriginalMethods() {
        console.log('\n🔧 RESTORING ORIGINAL METHODS:');
        
        if (originalMethods.storeCurrentObjectState && window.app.stateManager) {
            window.app.stateManager.storeCurrentObjectState = originalMethods.storeCurrentObjectState;
            console.log('✓ Restored storeCurrentObjectState');
        }
        
        if (originalMethods.restoreObjectState && window.app.stateManager) {
            window.app.stateManager.restoreObjectState = originalMethods.restoreObjectState;
            console.log('✓ Restored restoreObjectState');
        }
        
        if (originalMethods.switchWorldTemplate && window.app.worldManager) {
            window.app.worldManager.switchWorldTemplate = originalMethods.switchWorldTemplate;
            console.log('✓ Restored switchWorldTemplate');
        }
        
        console.log('✓ All methods restored');
    }
    
    // 8. Instructions for testing
    function printInstructions() {
        console.log('\n📋 TESTING INSTRUCTIONS:');
        console.log('1. Switch to a different world (use world selection menu)');
        console.log('2. Watch console output for detailed face texture tracking');
        console.log('3. Look for any "LOST thumbnailDataUrl" or "CRITICAL" messages');
        console.log('4. Check if any objects lose their face textures visually');
        console.log('5. Note which step in the process causes the loss');
        console.log('\n💡 To restore original behavior, run: window.restoreFaceTextureDiagnostic()');
    }
    
    // Main diagnostic function
    function runDiagnostic() {
        console.log('Starting face texture preservation diagnostic...\n');
        
        if (!checkCurrentFaceTextures()) return false;
        if (!checkStateManagerStorage()) return false;
        if (!interceptStoreMethod()) return false;
        if (!interceptRestoreMethod()) return false;
        if (!interceptWorldSwitch()) return false;
        if (!monitorFileDataChanges()) return false;
        
        // Make restore function globally accessible
        window.restoreFaceTextureDiagnostic = restoreOriginalMethods;
        
        printInstructions();
        
        console.log('\n✅ DIAGNOSTIC SETUP COMPLETE');
        console.log('🖼️ Face texture preservation diagnostic is now active');
        console.log('🖼️ Switch worlds to see detailed tracking output');
        
        return true;
    }
    
    // Run the diagnostic
    return runDiagnostic();
})();