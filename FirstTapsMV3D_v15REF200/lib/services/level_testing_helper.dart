import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Level Testing Helper Service
/// Provides temporary testing functions for jumping to specific levels
/// and monitoring level progression during development
class LevelTestingHelper {
  static const bool _isTestingEnabled =
      kDebugMode; // Only enabled in debug mode

  // Singleton pattern
  static final LevelTestingHelper _instance = LevelTestingHelper._internal();
  factory LevelTestingHelper() => _instance;
  LevelTestingHelper._internal();

  /// JavaScript bridge for communicating with the game
  MethodChannel? _webViewChannel;

  /// Set the web view channel for JavaScript communication
  void setWebViewChannel(MethodChannel channel) {
    if (_isTestingEnabled) {
      _webViewChannel = channel;
      developer.log(
        '🧪 Level Testing Helper: WebView channel set',
        name: 'LevelTesting',
      );
    }
  }

  /// Jump to Level 5 (45,000 points) for testing Level 5->6 progression
  Future<void> jumpToLevel5() async {
    if (!_isTestingEnabled) {
      developer.log(
        '🧪 Level testing disabled in release mode',
        name: 'LevelTesting',
      );
      return;
    }

    developer.log(
      '🧪 Jumping to Level 5 (45,000 points)',
      name: 'LevelTesting',
    );

    try {
      await _executeJavaScript('''
        if (window.svgEntityManager) {
          // Set points to Level 5
          window.svgEntityManager.totalPoints = 45000;
          
          // Update the level calculation
          window.svgEntityManager.calculateLevel();
          
          // Update UI displays
          window.svgEntityManager.updateUIManagerData();
          window.svgEntityManager.uiManager.updateScoreUI();
          
          // Log the change
          console.log('🧪 Testing: Jumped to Level 5 - Points: 45,000');
          console.log('🧪 Current Level:', window.svgEntityManager.currentLevel);
          
          // Return success confirmation
          'Level 5 activated';
        } else {
          console.error('🧪 svgEntityManager not available');
          'Error: svgEntityManager not found';
        }
      ''');

      developer.log('🧪 Successfully jumped to Level 5', name: 'LevelTesting');
    } catch (e) {
      developer.log('🧪 Error jumping to Level 5: $e', name: 'LevelTesting');
    }
  }

  /// Jump to Level 6 threshold (50,000 points) for immediate Level 6 testing
  Future<void> jumpToLevel6Threshold() async {
    if (!_isTestingEnabled) return;

    developer.log(
      '🧪 Jumping to Level 6 threshold (50,000 points)',
      name: 'LevelTesting',
    );

    try {
      await _executeJavaScript('''
        if (window.svgEntityManager) {
          // Set points just at Level 6 threshold
          window.svgEntityManager.totalPoints = 50000;
          
          // Update the level calculation
          window.svgEntityManager.calculateLevel();
          
          // Update UI displays
          window.svgEntityManager.updateUIManagerData();
          window.svgEntityManager.uiManager.updateScoreUI();
          
          console.log('🧪 Testing: At Level 6 threshold - Points: 50,000');
          console.log('🧪 Current Level:', window.svgEntityManager.currentLevel);
          
          'Level 6 threshold reached';
        } else {
          'Error: svgEntityManager not found';
        }
      ''');

      developer.log(
        '🧪 Successfully reached Level 6 threshold',
        name: 'LevelTesting',
      );
    } catch (e) {
      developer.log(
        '🧪 Error reaching Level 6 threshold: $e',
        name: 'LevelTesting',
      );
    }
  }

  /// Jump to Level 7 threshold (60,000 points) for Level 7 testing
  Future<void> jumpToLevel7Threshold() async {
    if (!_isTestingEnabled) return;

    developer.log(
      '🧪 Jumping to Level 7 threshold (60,000 points)',
      name: 'LevelTesting',
    );

    try {
      await _executeJavaScript('''
        if (window.svgEntityManager) {
          window.svgEntityManager.totalPoints = 60000;
          window.svgEntityManager.calculateLevel();
          window.svgEntityManager.updateUIManagerData();
          window.svgEntityManager.uiManager.updateScoreUI();
          
          console.log('🧪 Testing: At Level 7 threshold - Points: 60,000');
          console.log('🧪 Current Level:', window.svgEntityManager.currentLevel);
          
          'Level 7 threshold reached';
        } else {
          'Error: svgEntityManager not found';
        }
      ''');

      developer.log(
        '🧪 Successfully reached Level 7 threshold',
        name: 'LevelTesting',
      );
    } catch (e) {
      developer.log(
        '🧪 Error reaching Level 7 threshold: $e',
        name: 'LevelTesting',
      );
    }
  }

  /// Add specific points to current total (for incremental testing)
  Future<void> addTestingPoints(int points) async {
    if (!_isTestingEnabled) return;

    developer.log('🧪 Adding $points points for testing', name: 'LevelTesting');

    try {
      await _executeJavaScript('''
        if (window.svgEntityManager) {
          const oldPoints = window.svgEntityManager.totalPoints;
          window.svgEntityManager.totalPoints += $points;
          
          window.svgEntityManager.calculateLevel();
          window.svgEntityManager.updateUIManagerData();
          window.svgEntityManager.uiManager.updateScoreUI();
          
          console.log('🧪 Testing: Added $points points');
          console.log('🧪 Points: ' + oldPoints + ' → ' + window.svgEntityManager.totalPoints);
          console.log('🧪 Current Level:', window.svgEntityManager.currentLevel);
          
          'Points added successfully';
        } else {
          'Error: svgEntityManager not found';
        }
      ''');

      developer.log(
        '🧪 Successfully added $points points',
        name: 'LevelTesting',
      );
    } catch (e) {
      developer.log('🧪 Error adding points: $e', name: 'LevelTesting');
    }
  }

  /// Get current game state for debugging
  Future<Map<String, dynamic>> getCurrentGameState() async {
    if (!_isTestingEnabled) {
      return {'error': 'Testing disabled'};
    }

    try {
      final result = await _executeJavaScript('''
        if (window.svgEntityManager) {
          JSON.stringify({
            totalPoints: window.svgEntityManager.totalPoints,
            currentLevel: window.svgEntityManager.currentLevel,
            activeSessions: window.svgEntityManager.activeSessions.size,
            activeEntities: window.svgEntityManager.activeEntities.size,
            gamePlayPaused: window.svgEntityManager.gamePlayPaused,
            premiumLevelsEnabled: window.svgEntityManager.premiumLevelsState,
            hasShownPremiumPopup: window.svgEntityManager.hasShownPremiumPopup
          });
        } else {
          JSON.stringify({error: 'svgEntityManager not found'});
        }
      ''');

      if (result is String) {
        // Parse the JSON result (this would depend on your WebView implementation)
        developer.log('🧪 Current game state: $result', name: 'LevelTesting');
        return {'raw': result};
      }

      return {'error': 'Invalid result type'};
    } catch (e) {
      developer.log('🧪 Error getting game state: $e', name: 'LevelTesting');
      return {'error': e.toString()};
    }
  }

  /// Reset game state for fresh testing
  Future<void> resetGameState() async {
    if (!_isTestingEnabled) return;

    developer.log('🧪 Resetting game state for testing', name: 'LevelTesting');

    try {
      await _executeJavaScript('''
        if (window.svgEntityManager) {
          // Reset to initial state
          window.svgEntityManager.totalPoints = 0;
          window.svgEntityManager.currentLevel = 1;
          window.svgEntityManager.hasShownPremiumPopup = false;
          
          // Clear active entities
          window.svgEntityManager.activeEntities.forEach(entity => {
            if (entity.cleanup) entity.cleanup();
          });
          window.svgEntityManager.activeEntities.clear();
          window.svgEntityManager.activeSessions.clear();
          
          // Update UI
          window.svgEntityManager.calculateLevel();
          window.svgEntityManager.updateUIManagerData();
          window.svgEntityManager.uiManager.updateScoreUI();
          
          console.log('🧪 Testing: Game state reset');
          'Game state reset successfully';
        } else {
          'Error: svgEntityManager not found';
        }
      ''');

      developer.log('🧪 Successfully reset game state', name: 'LevelTesting');
    } catch (e) {
      developer.log('🧪 Error resetting game state: $e', name: 'LevelTesting');
    }
  }

  /// Execute JavaScript in the WebView
  Future<dynamic> _executeJavaScript(String script) async {
    if (_webViewChannel != null) {
      // This would be the actual implementation depending on your WebView setup
      // For now, we'll use a placeholder that assumes a method channel
      try {
        return await _webViewChannel!.invokeMethod(
          'evaluateJavaScript',
          script,
        );
      } catch (e) {
        developer.log(
          '🧪 JavaScript execution error: $e',
          name: 'LevelTesting',
        );
        rethrow;
      }
    } else {
      developer.log(
        '🧪 WebView channel not set - cannot execute JavaScript',
        name: 'LevelTesting',
      );
      throw Exception('WebView channel not available');
    }
  }

  /// Check if testing is enabled
  bool get isTestingEnabled => _isTestingEnabled;

  /// Get testing helper status
  Map<String, dynamic> getStatus() {
    return {
      'isTestingEnabled': _isTestingEnabled,
      'hasWebViewChannel': _webViewChannel != null,
      'buildMode': kDebugMode ? 'debug' : 'release',
    };
  }

  /// Enable premium levels for testing (bypasses purchase requirement)
  Future<void> enablePremiumLevelsForTesting() async {
    if (!_isTestingEnabled) return;

    developer.log(
      '🧪 Enabling premium levels for testing',
      name: 'LevelTesting',
    );

    try {
      await _executeJavaScript('''
        if (window.svgEntityManager) {
          // Enable all premium levels
          window.svgEntityManager.premiumLevelsState.level4 = true;
          window.svgEntityManager.premiumLevelsState.level5 = true;
          window.svgEntityManager.premiumLevelsState.level6 = true;
          window.svgEntityManager.premiumLevelsState.level7 = true;
          
          console.log('🧪 Testing: Premium levels enabled');
          console.log('🧪 Premium state:', window.svgEntityManager.premiumLevelsState);
          
          'Premium levels enabled';
        } else {
          'Error: svgEntityManager not found';
        }
      ''');

      developer.log(
        '🧪 Successfully enabled premium levels',
        name: 'LevelTesting',
      );
    } catch (e) {
      developer.log(
        '🧪 Error enabling premium levels: $e',
        name: 'LevelTesting',
      );
    }
  }

  /// Trigger level progression popup for testing
  Future<void> triggerLevelProgressionPopup(int fromLevel, int toLevel) async {
    if (!_isTestingEnabled) return;

    developer.log(
      '🧪 Triggering level progression popup: $fromLevel → $toLevel',
      name: 'LevelTesting',
    );

    try {
      await _executeJavaScript('''
        if (window.svgEntityManager && window.svgEntityManager.uiManager) {
          // Force show the premium gaming popup
          window.svgEntityManager.uiManager.showPremiumGamingPopup();
          
          console.log('🧪 Testing: Level progression popup triggered');
          'Popup triggered successfully';
        } else {
          'Error: UI manager not found';
        }
      ''');

      developer.log(
        '🧪 Successfully triggered level progression popup',
        name: 'LevelTesting',
      );
    } catch (e) {
      developer.log('🧪 Error triggering popup: $e', name: 'LevelTesting');
    }
  }
}
