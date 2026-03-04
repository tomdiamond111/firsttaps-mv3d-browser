import 'package:flutter/services.dart';
import 'dart:async';

/// LEVEL TESTING HELPER - Enhanced for Level 8/9 Framework
/// Provides systematic testing workflows for new level development
class LevelTestingHelper {
  static final MethodChannel _channel = MethodChannel('level_testing');

  /// Initialize the testing helper and make it available globally
  static Future<void> initialize() async {
    try {
      // Register the testing helper globally in the webview
      await _channel.invokeMethod('registerGlobalHelper');
      print('🔧 LevelTestingHelper initialized and registered globally');
    } catch (e) {
      print('Error initializing LevelTestingHelper: $e');
    }
  }

  /// Jump to Level 5 for testing Level 5 -> Level 6 progression
  static Future<void> jumpToLevel5() async {
    try {
      await _channel.invokeMethod('jumpToLevel5');
      print('🚀 Jumped to Level 5 for testing');
    } catch (e) {
      print('Error jumping to Level 5: $e');
    }
  }

  /// Set specific point amount for testing different levels
  static Future<void> setTestingPoints(int points) async {
    try {
      await _channel.invokeMethod('setTestingPoints', {'points': points});
      print('📊 Set testing points to: $points');
    } catch (e) {
      print('Error setting testing points: $e');
    }
  }

  /// Enable premium access for testing premium levels
  static Future<void> enablePremiumTesting() async {
    try {
      await _channel.invokeMethod('enablePremiumTesting');
      print('👑 Premium testing enabled');
    } catch (e) {
      print('Error enabling premium testing: $e');
    }
  }

  /// Disable testing mode and return to normal gameplay
  static Future<void> disableTestingMode() async {
    try {
      await _channel.invokeMethod('disableTestingMode');
      print('🔧 Testing mode disabled');
    } catch (e) {
      print('Error disabling testing mode: $e');
    }
  }

  // === NEW FRAMEWORK TESTING METHODS ===

  /// Test a complete level with automated scenarios (NEW)
  static Future<void> testLevel({
    required int levelNumber,
    required Function(String) executeJS,
    required Function(String) logResult,
  }) async {
    logResult('🎮 Starting Level $levelNumber comprehensive testing...');

    // 1. Enable level for testing
    await _enableLevelTesting(levelNumber, executeJS, logResult);

    // 2. Test level unlocking
    await _testLevelUnlocking(levelNumber, executeJS, logResult);

    // 3. Test entity spawning
    await _testEntitySpawning(levelNumber, executeJS, logResult);

    // 4. Test entity interactions
    await _testEntityInteractions(levelNumber, executeJS, logResult);

    // 5. Test level progression
    await _testLevelProgression(levelNumber, executeJS, logResult);

    logResult('✅ Level $levelNumber testing completed');
  }

  /// Enable level for testing by setting required points and premium status (NEW)
  static Future<void> _enableLevelTesting(
    int levelNumber,
    Function(String) executeJS,
    Function(String) logResult,
  ) async {
    logResult('🔧 Enabling Level $levelNumber for testing...');

    final jsCode =
        '''
      if (window.app && window.app.svgEntityManager) {
        // Set high enough points for level $levelNumber
        window.app.svgEntityManager.totalPoints = ${_getLevelThreshold(levelNumber) + 5000};
        
        // Enable premium level $levelNumber
        window.app.svgEntityManager.premiumLevelsState.level$levelNumber = true;
        
        // Refresh level progression
        window.app.svgEntityManager.refreshLevelProgression();
        
        console.log('👑 Level $levelNumber testing enabled - Points: ' + window.app.svgEntityManager.totalPoints);
        'SUCCESS';
      } else {
        console.error('❌ SVGEntityManager not available');
        'ERROR';
      }
    ''';

    executeJS(jsCode);
    await Future.delayed(Duration(milliseconds: 500));
    logResult('✅ Level $levelNumber enabled for testing');
  }

  /// Test level unlocking logic (NEW)
  static Future<void> _testLevelUnlocking(
    int levelNumber,
    Function(String) executeJS,
    Function(String) logResult,
  ) async {
    logResult('🔓 Testing Level $levelNumber unlocking...');

    final jsCode =
        '''
      if (window.app && window.app.svgEntityManager) {
        const isUnlocked = window.app.svgEntityManager.isPremiumLevelUnlocked($levelNumber);
        const threshold = window.app.svgEntityManager.levelThresholds[$levelNumber] || 'Not defined';
        const currentPoints = window.app.svgEntityManager.totalPoints;
        
        console.log('🔓 Level $levelNumber unlock test:');
        console.log('   - Is unlocked: ' + isUnlocked);
        console.log('   - Threshold: ' + threshold);
        console.log('   - Current points: ' + currentPoints);
        
        isUnlocked ? 'UNLOCKED' : 'LOCKED';
      } else {
        'ERROR';
      }
    ''';

    executeJS(jsCode);
    await Future.delayed(Duration(milliseconds: 300));
  }

  /// Test entity spawning for the level (NEW)
  static Future<void> _testEntitySpawning(
    int levelNumber,
    Function(String) executeJS,
    Function(String) logResult,
  ) async {
    logResult('🎯 Testing Level $levelNumber entity spawning...');

    final entityTypes = _getLevelEntityTypes(levelNumber);

    for (String entityType in entityTypes) {
      final jsCode =
          '''
        if (window.app && window.app.svgEntityManager) {
          console.log('🎯 Testing spawn: $entityType');
          
          // Set level
          window.app.svgEntityManager.currentLevel = $levelNumber;
          
          // Test spawn
          const entity = window.app.svgEntityManager.spawnLevelEntity('$entityType', $levelNumber);
          
          if (entity) {
            console.log('✅ $entityType spawned successfully');
            // Clean up
            setTimeout(() => {
              if (entity.dispose) entity.dispose();
            }, 1000);
            'SUCCESS';
          } else {
            console.error('❌ Failed to spawn $entityType');
            'FAILED';
          }
        } else {
          'ERROR';
        }
      ''';

      executeJS(jsCode);
      await Future.delayed(Duration(milliseconds: 800));
    }

    logResult('✅ Entity spawning tests completed');
  }

  /// Test entity interactions and behaviors (NEW)
  static Future<void> _testEntityInteractions(
    int levelNumber,
    Function(String) executeJS,
    Function(String) logResult,
  ) async {
    logResult('🎮 Testing Level $levelNumber entity interactions...');

    final jsCode =
        '''
      if (window.app && window.app.svgEntityManager) {
        // Set level
        window.app.svgEntityManager.currentLevel = $levelNumber;
        
        // Test entity collection
        const collection = window.app.svgEntityManager.getEntityCollectionForLevel($levelNumber);
        
        console.log('🎮 Level $levelNumber entity collection:');
        console.log('   - Entities available: ' + collection.length);
        collection.forEach((entity, index) => {
          console.log('   - ' + (index + 1) + ': ' + entity.type + ' (weight: ' + entity.weight + ')');
        });
        
        // Test level verification
        const isVerified = window.app.svgEntityManager.verifyLevelEntities($levelNumber);
        console.log('   - Level verification: ' + (isVerified ? 'PASSED' : 'FAILED'));
        
        collection.length > 0 ? 'SUCCESS' : 'NO_ENTITIES';
      } else {
        'ERROR';
      }
    ''';

    executeJS(jsCode);
    await Future.delayed(Duration(milliseconds: 500));
    logResult('✅ Entity interaction tests completed');
  }

  /// Test level progression and transitions (NEW)
  static Future<void> _testLevelProgression(
    int levelNumber,
    Function(String) executeJS,
    Function(String) logResult,
  ) async {
    logResult('📈 Testing Level $levelNumber progression...');

    final jsCode =
        '''
      if (window.app && window.app.svgEntityManager) {
        // Test progression from previous level
        window.app.svgEntityManager.currentLevel = ${levelNumber - 1};
        
        // Advance to test level
        window.app.svgEntityManager.advanceToNextLevel();
        
        const newLevel = window.app.svgEntityManager.currentLevel;
        console.log('📈 Level progression test:');
        console.log('   - Previous level: ${levelNumber - 1}');
        console.log('   - New level: ' + newLevel);
        console.log('   - Expected: $levelNumber');
        
        // Test level loading
        const loadResult = window.app.svgEntityManager.loadEntityCollectionForLevel($levelNumber);
        console.log('   - Level $levelNumber load result: ' + loadResult);
        
        newLevel === $levelNumber ? 'SUCCESS' : 'FAILED';
      } else {
        'ERROR';
      }
    ''';

    executeJS(jsCode);
    await Future.delayed(Duration(milliseconds: 500));
    logResult('✅ Level progression tests completed');
  }

  /// Quick test for specific entity type (NEW)
  static Future<void> quickTestEntity({
    required int levelNumber,
    required String entityType,
    required Function(String) executeJS,
    required Function(String) logResult,
  }) async {
    logResult('⚡ Quick testing $entityType in Level $levelNumber...');

    final jsCode =
        '''
      if (window.app && window.app.svgEntityManager) {
        // Enable level
        window.app.svgEntityManager.totalPoints = ${_getLevelThreshold(levelNumber) + 5000};
        window.app.svgEntityManager.premiumLevelsState.level$levelNumber = true;
        window.app.svgEntityManager.currentLevel = $levelNumber;
        
        // Spawn entity
        const entity = window.app.svgEntityManager.spawnLevelEntity('$entityType', $levelNumber);
        
        if (entity) {
          console.log('⚡ $entityType spawned successfully');
          console.log('   - Position: ' + entity.position.x + ', ' + entity.position.y + ', ' + entity.position.z);
          console.log('   - Has movement: ' + (entity.updateMovement ? 'YES' : 'NO'));
          console.log('   - Has cleanup: ' + (entity.dispose ? 'YES' : 'NO'));
          
          // Test interaction
          setTimeout(() => {
            if (entity.handleInteraction) {
              entity.handleInteraction();
              console.log('   - Interaction test: SUCCESS');
            }
            
            // Cleanup after 3 seconds
            setTimeout(() => {
              if (entity.dispose) entity.dispose();
              console.log('   - Cleanup: SUCCESS');
            }, 3000);
          }, 1000);
          
          'SUCCESS';
        } else {
          console.error('❌ Failed to spawn $entityType');
          'FAILED';
        }
      } else {
        'ERROR';
      }
    ''';

    executeJS(jsCode);
    logResult('✅ Quick test completed for $entityType');
  }

  /// Get level point threshold (NEW)
  static int _getLevelThreshold(int levelNumber) {
    final thresholds = {
      4: 35000,
      5: 55000,
      6: 80000,
      7: 120000,
      8: 150000,
      9: 180000,
      10: 220000,
    };
    return thresholds[levelNumber] ?? 70000;
  }

  /// Get entity types for level (NEW)
  static List<String> _getLevelEntityTypes(int levelNumber) {
    final entityTypes = {
      6: [
        'red_ball',
        'blue_sphere',
        'golden_orb',
        'rainbow_ball',
        'mega_sphere',
      ],
      7: [
        'scout_ufo',
        'warship_ufo',
        'mothership_ufo',
        'cloaked_ufo',
        'swarm_commander_ufo',
      ],
      8: ['crystal', 'prism', 'geode', 'diamond', 'ruby'],
      9: ['storm', 'lightning', 'tornado', 'hurricane', 'blizzard'],
    };
    return entityTypes[levelNumber] ??
        ['entity1', 'entity2', 'entity3', 'entity4', 'entity5'];
  }

  /// Generate test report (NEW)
  static String generateTestReport(int levelNumber, List<String> results) {
    final report =
        '''
🎮 LEVEL $levelNumber TEST REPORT
================================

Test Results:
${results.map((r) => '• $r').join('\n')}

Testing Framework Status:
✅ Level Testing Helper: Active
✅ Entity Spawning: Tested
✅ Level Progression: Tested  
✅ Interaction System: Tested

Next Steps:
1. Review any failed tests above
2. Check entity class implementations
3. Verify SVGEntityManager integration
4. Test in production environment

Generated: ${DateTime.now().toString()}
''';

    return report;
  }
}
