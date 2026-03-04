/**
 * CAVE EXPLORER MOVEMENT DIAGNOSTIC SCRIPT
 * 
 * This script diagnoses why Cave Explorer movement fails while vertical movement works.
 * 
 * USAGE:
 * 1. Open Cave Explorer world
 * 2. Open browser console (F12)
 * 3. Paste this entire script and press Enter
 * 4. Try to move an object horizontally (should fail with null Y)
 * 5. Try to move an object vertically (should work)
 * 6. Check the diagnostic output in console
 */

(function() {
    'use strict';
    
    console.log('🕳️ ========================================');
    console.log('🕳️ CAVE EXPLORER MOVEMENT DIAGNOSTIC');
    console.log('🕳️ ========================================');
    
    // Store original methods for comparison
    const originalMethods = {};
    
    // 1. Check current world type
    function checkWorldType() {
        console.log('\n🔍 1. WORLD TYPE CHECK:');
        
        if (!window.app) {
            console.error('❌ window.app not available');
            return false;
        }
        
        if (!window.app.worldTemplate) {
            console.error('❌ worldTemplate not available');
            return false;
        }
        
        const worldType = window.app.worldTemplate.getType();
        console.log(`✓ Current world type: ${worldType}`);
        
        if (worldType !== 'cave') {
            console.warn(`⚠️ Not in Cave Explorer world. Switch to cave world first.`);
            return false;
        }
        
        return true;
    }
    
    // 2. Check Cave Explorer class and methods
    function checkCaveExplorerClass() {
        console.log('\n🔍 2. CAVE EXPLORER CLASS CHECK:');
        
        const worldTemplate = window.app.worldTemplate;
        console.log('✓ WorldTemplate instance:', worldTemplate.constructor.name);
        
        // Check critical methods
        const criticalMethods = [
            'applyPositionConstraints',
            'getPositioningConstraints',
            'getType'
        ];
        
        criticalMethods.forEach(method => {
            if (typeof worldTemplate[method] === 'function') {
                console.log(`✓ ${method}: Available`);
            } else {
                console.error(`❌ ${method}: Missing or not a function`);
            }
        });
        
        // Test getPositioningConstraints
        try {
            const constraints = worldTemplate.getPositioningConstraints();
            console.log('✓ getPositioningConstraints result:', constraints);
        } catch (error) {
            console.error('❌ getPositioningConstraints failed:', error);
        }
        
        return true;
    }
    
    // 3. Test applyPositionConstraints directly
    function testPositionConstraints() {
        console.log('\n🔍 3. POSITION CONSTRAINTS TEST:');
        
        const worldTemplate = window.app.worldTemplate;
        
        // Find a test object
        const testObject = window.app.stateManager?.fileObjects?.[0];
        if (!testObject) {
            console.error('❌ No file objects available for testing');
            return false;
        }
        
        console.log(`✓ Using test object: ${testObject.userData.fileName}`);
        
        // Test position constraint with various inputs
        const testPositions = [
            { x: 10, y: 5, z: 15, name: 'Normal position' },
            { x: 10, y: null, z: 15, name: 'Null Y input' },
            { x: 10, y: undefined, z: 15, name: 'Undefined Y input' },
            { x: 10, y: 0, z: 15, name: 'Ground level Y' }
        ];
        
        testPositions.forEach(testPos => {
            try {
                console.log(`\n🧪 Testing ${testPos.name}: (${testPos.x}, ${testPos.y}, ${testPos.z})`);
                const result = worldTemplate.applyPositionConstraints(
                    testObject,
                    testPos,
                    window.app.stateManager.fileObjects
                );
                console.log(`   Result: (${result.x}, ${result.y}, ${result.z})`);
                
                if (result.y === null || result.y === undefined) {
                    console.error(`   ❌ PROBLEM: Y value became ${result.y}`);
                } else {
                    console.log(`   ✓ Y value preserved: ${result.y}`);
                }
            } catch (error) {
                console.error(`   ❌ Error testing ${testPos.name}:`, error);
            }
        });
        
        return true;
    }
    
    // 4. Check movement manager setup
    function checkMovementManager() {
        console.log('\n🔍 4. MOVEMENT MANAGER CHECK:');
        
        if (!window.app.interactionManager) {
            console.error('❌ interactionManager not available');
            return false;
        }
        
        if (!window.app.interactionManager.moveManager) {
            console.error('❌ moveManager not available');
            return false;
        }
        
        const moveManager = window.app.interactionManager.moveManager;
        console.log('✓ Move manager available');
        
        // Check if world template is properly set
        if (moveManager.worldTemplate) {
            console.log(`✓ Move manager world template: ${moveManager.worldTemplate.getType()}`);
        } else {
            console.error('❌ Move manager world template not set');
        }
        
        return true;
    }
    
    // 5. Check Forest Movement Menu integration
    function checkForestMovementMenu() {
        console.log('\n🔍 5. FOREST MOVEMENT MENU CHECK:');
        
        if (!window.ForestMovementMenu) {
            console.error('❌ ForestMovementMenu class not available');
            return false;
        }
        
        // Check if there's an active instance
        if (window.app.forestMovementMenu) {
            console.log('✓ Forest movement menu instance exists');
            
            // Test isForestRealm method
            try {
                const isForestRealm = window.app.forestMovementMenu.isForestRealm();
                console.log(`✓ isForestRealm() result: ${isForestRealm}`);
                
                if (!isForestRealm) {
                    console.warn('⚠️ Cave Explorer not recognized as Forest Realm by movement menu');
                }
            } catch (error) {
                console.error('❌ isForestRealm() failed:', error);
            }
        } else {
            console.warn('⚠️ No forest movement menu instance found');
        }
        
        return true;
    }
    
    // 6. Intercept movement operations
    function interceptMovement() {
        console.log('\n🔍 6. SETTING UP MOVEMENT INTERCEPTION:');
        
        const moveManager = window.app.interactionManager?.moveManager;
        if (!moveManager) {
            console.error('❌ Cannot intercept - moveManager not available');
            return false;
        }
        
        // Intercept handleObjectMove
        if (moveManager.handleObjectMove) {
            originalMethods.handleObjectMove = moveManager.handleObjectMove.bind(moveManager);
            
            moveManager.handleObjectMove = function(raycaster, mouse) {
                console.log('\n🚀 INTERCEPTED: handleObjectMove called');
                console.log('   Parameters:', { raycaster: !!raycaster, mouse });
                console.log('   Current object:', this.stateManager.movingObject?.userData?.fileName);
                console.log('   Vertical move mode:', this.stateManager.isVerticalMoveMode);
                
                try {
                    const result = originalMethods.handleObjectMove.call(this, raycaster, mouse);
                    console.log('   ✓ handleObjectMove completed successfully');
                    return result;
                } catch (error) {
                    console.error('   ❌ handleObjectMove failed:', error);
                    throw error;
                }
            };
            
            console.log('✓ Intercepted handleObjectMove');
        }
        
        // Intercept applyPositionConstraints
        const worldTemplate = window.app.worldTemplate;
        if (worldTemplate.applyPositionConstraints) {
            originalMethods.applyPositionConstraints = worldTemplate.applyPositionConstraints.bind(worldTemplate);
            
            worldTemplate.applyPositionConstraints = function(object, newPosition, allObjects) {
                console.log('\n🎯 INTERCEPTED: applyPositionConstraints called');
                console.log('   Object:', object?.userData?.fileName);
                console.log('   Input position:', newPosition);
                console.log('   Position Y type:', typeof newPosition?.y);
                console.log('   Position Y value:', newPosition?.y);
                
                try {
                    const result = originalMethods.applyPositionConstraints.call(this, object, newPosition, allObjects);
                    console.log('   Output position:', result);
                    console.log('   Output Y type:', typeof result?.y);
                    console.log('   Output Y value:', result?.y);
                    
                    if (result?.y === null || result?.y === undefined) {
                        console.error('   ❌ CRITICAL: applyPositionConstraints returned null/undefined Y!');
                        console.trace('Stack trace:');
                    }
                    
                    return result;
                } catch (error) {
                    console.error('   ❌ applyPositionConstraints failed:', error);
                    console.trace('Stack trace:');
                    throw error;
                }
            };
            
            console.log('✓ Intercepted applyPositionConstraints');
        }
        
        return true;
    }
    
    // 7. Provide restoration function
    function restoreOriginalMethods() {
        console.log('\n🔧 RESTORING ORIGINAL METHODS:');
        
        const moveManager = window.app.interactionManager?.moveManager;
        const worldTemplate = window.app.worldTemplate;
        
        if (originalMethods.handleObjectMove && moveManager) {
            moveManager.handleObjectMove = originalMethods.handleObjectMove;
            console.log('✓ Restored handleObjectMove');
        }
        
        if (originalMethods.applyPositionConstraints && worldTemplate) {
            worldTemplate.applyPositionConstraints = originalMethods.applyPositionConstraints;
            console.log('✓ Restored applyPositionConstraints');
        }
        
        console.log('✓ All methods restored');
    }
    
    // 8. Instructions for testing
    function printInstructions() {
        console.log('\n📋 TESTING INSTRUCTIONS:');
        console.log('1. Try moving an object horizontally (regular move)');
        console.log('2. Watch for "INTERCEPTED" messages in console');
        console.log('3. Look for any null Y values in the output');
        console.log('4. Try moving the same object vertically (Move Up)');
        console.log('5. Compare the console output between horizontal and vertical moves');
        console.log('\n💡 To restore original behavior, run: window.restoreCaveMovementDiagnostic()');
    }
    
    // Main diagnostic function
    function runDiagnostic() {
        console.log('Starting Cave Explorer movement diagnostic...\n');
        
        if (!checkWorldType()) return false;
        if (!checkCaveExplorerClass()) return false;
        if (!testPositionConstraints()) return false;
        if (!checkMovementManager()) return false;
        if (!checkForestMovementMenu()) return false;
        if (!interceptMovement()) return false;
        
        // Make restore function globally accessible
        window.restoreCaveMovementDiagnostic = restoreOriginalMethods;
        
        printInstructions();
        
        console.log('\n✅ DIAGNOSTIC SETUP COMPLETE');
        console.log('🕳️ Cave Explorer movement diagnostic is now active');
        console.log('🕳️ Try moving objects and watch the console output');
        
        return true;
    }
    
    // Run the diagnostic
    return runDiagnostic();
})();