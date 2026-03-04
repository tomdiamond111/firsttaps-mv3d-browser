// Avatar Persistence Diagnostic Script
// This script tests the complete persistence chain to identify where avatar data is being lost

console.log('🔍 AVATAR PERSISTENCE DIAGNOSTIC STARTING...');

// Test 1: Check if we can create and immediately verify avatar data
function testAvatarCreation() {
    console.log('\n=== TEST 1: AVATAR CREATION ===');
    
    const testAvatarData = {
        'testContact': {
            hair: 'short',
            hairColor: '#8B4513',
            skinTone: '#FDBCB4',
            age: 'adult',
            gender: 'male',
            clothing: 'casual'
        }
    };
    
    console.log('1.1 Created test avatar data:', testAvatarData);
    
    // Test JavaScript localStorage directly
    try {
        const jsonData = JSON.stringify(testAvatarData);
        localStorage.setItem('contactAvatarCustomizations', jsonData);
        console.log('1.2 ✅ Successfully saved to localStorage');
        
        const retrieved = localStorage.getItem('contactAvatarCustomizations');
        console.log('1.3 Retrieved from localStorage:', retrieved);
        
        if (retrieved === jsonData) {
            console.log('1.4 ✅ localStorage round-trip successful');
        } else {
            console.log('1.4 ❌ localStorage round-trip failed');
        }
    } catch (error) {
        console.log('1.2 ❌ localStorage save failed:', error);
    }
}

// Test 2: Check Flutter bridge communication
function testFlutterBridge() {
    console.log('\n=== TEST 2: FLUTTER BRIDGE ===');
    
    const testData = JSON.stringify({
        'bridgeTest': {
            hair: 'long',
            hairColor: '#000000',
            skinTone: '#FDBCB4',
            age: 'adult',
            gender: 'female',
            clothing: 'formal'
        }
    });
    
    // Test save to Flutter
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        console.log('2.1 Flutter bridge detected, testing save...');
        
        window.flutter_inappwebview.callHandler('saveAvatarCustomizations', testData)
            .then(result => {
                console.log('2.2 ✅ Flutter save result:', result);
                
                // Test load from Flutter
                window.flutter_inappwebview.callHandler('loadAvatarCustomizations')
                    .then(loadResult => {
                        console.log('2.3 Flutter load result:', loadResult);
                        if (loadResult === testData) {
                            console.log('2.4 ✅ Flutter bridge round-trip successful');
                        } else {
                            console.log('2.4 ❌ Flutter bridge round-trip failed');
                            console.log('2.4   Expected:', testData);
                            console.log('2.4   Got:', loadResult);
                        }
                    })
                    .catch(error => {
                        console.log('2.3 ❌ Flutter load failed:', error);
                    });
            })
            .catch(error => {
                console.log('2.2 ❌ Flutter save failed:', error);
            });
    } else {
        console.log('2.1 ❌ Flutter bridge not available');
    }
}

// Test 3: Check ContactCustomizationManager integration
function testContactCustomizationManager() {
    console.log('\n=== TEST 3: CONTACT CUSTOMIZATION MANAGER ===');
    
    if (window.contactCustomizationManager) {
        console.log('3.1 ContactCustomizationManager found');
        
        const testContactId = 'diagnosticTestContact';
        const testConfig = {
            hair: 'curly',
            hairColor: '#FF6347',
            skinTone: '#F4C2A1',
            age: 'adult',
            gender: 'male',
            clothing: 'business'
        };
        
        console.log('3.2 Testing saveContactCustomization...');
        
        // Test the save method
        try {
            window.contactCustomizationManager.saveContactCustomization(testContactId, testConfig);
            console.log('3.3 ✅ saveContactCustomization called successfully');
            
            // Wait a moment then check if it was saved
            setTimeout(() => {
                const savedData = window.contactCustomizationManager.customizationData.get(testContactId);
                console.log('3.4 Retrieved from customizationData Map:', savedData);
                
                if (savedData && JSON.stringify(savedData) === JSON.stringify(testConfig)) {
                    console.log('3.5 ✅ Data correctly stored in Map');
                } else {
                    console.log('3.5 ❌ Data not correctly stored in Map');
                }
                
                // Check localStorage
                const localStorageData = localStorage.getItem('contactAvatarCustomizations');
                console.log('3.6 localStorage after save:', localStorageData);
                
                if (localStorageData) {
                    try {
                        const parsed = JSON.parse(localStorageData);
                        if (parsed[testContactId]) {
                            console.log('3.7 ✅ Data found in localStorage');
                        } else {
                            console.log('3.7 ❌ Data not found in localStorage');
                        }
                    } catch (e) {
                        console.log('3.7 ❌ localStorage data not valid JSON:', e);
                    }
                } else {
                    console.log('3.7 ❌ No data in localStorage');
                }
            }, 1000);
            
        } catch (error) {
            console.log('3.3 ❌ saveContactCustomization failed:', error);
        }
    } else {
        console.log('3.1 ❌ ContactCustomizationManager not found');
    }
}

// Test 4: Check current state of localStorage
function checkCurrentState() {
    console.log('\n=== TEST 4: CURRENT STATE ===');
    
    const currentData = localStorage.getItem('contactAvatarCustomizations');
    console.log('4.1 Current localStorage data:', currentData);
    
    if (currentData) {
        try {
            const parsed = JSON.parse(currentData);
            console.log('4.2 Parsed data:', parsed);
            console.log('4.3 Number of contacts with avatars:', Object.keys(parsed).length);
        } catch (e) {
            console.log('4.2 ❌ Data is not valid JSON:', e);
        }
    } else {
        console.log('4.2 No data found in localStorage');
    }
    
    // Check all localStorage keys
    console.log('4.4 All localStorage keys:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`    ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`);
    }
}

// Run all tests
function runDiagnostics() {
    testAvatarCreation();
    setTimeout(() => testFlutterBridge(), 500);
    setTimeout(() => testContactCustomizationManager(), 1000);
    setTimeout(() => checkCurrentState(), 2000);
    
    console.log('\n🔍 All diagnostic tests queued. Check results above.');
}

// Auto-run diagnostics when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDiagnostics);
} else {
    runDiagnostics();
}

// Export for manual running
window.runAvatarDiagnostics = runDiagnostics;

console.log('🔍 AVATAR PERSISTENCE DIAGNOSTIC LOADED');
console.log('🔍 Run manually with: window.runAvatarDiagnostics()');
