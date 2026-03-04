import 'dart:convert';
import 'dart:developer' as developer;
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../widgets/premium_gaming_popup.dart';
import '../config/app_config.dart';
import '../services/premium_service.dart';

/// PREMIUM GAMING WEBVIEW HANDLER
/// Handles WebView JavaScript calls for premium gaming popups and store interactions
/// Bridges the gap between JavaScript popup triggers and Flutter premium system
class PremiumGamingWebViewHandler {
  static PremiumGamingWebViewHandler? _instance;
  static PremiumGamingWebViewHandler get instance =>
      _instance ??= PremiumGamingWebViewHandler._();
  PremiumGamingWebViewHandler._();

  BuildContext? _context;
  WebViewController? _webViewController;

  /// Initialize the handler with context and web controller
  void initialize(BuildContext context, WebViewController webViewController) {
    _context = context;
    _webViewController = webViewController;

    _registerJavaScriptChannels();

    developer.log(
      '🎮 Premium Gaming WebView Handler initialized',
      name: 'PremiumGaming',
    );
  }

  /// Register JavaScript channels for premium gaming communication
  void _registerJavaScriptChannels() {
    if (_webViewController == null) return;

    // Register the premium gaming popup handler
    _webViewController!.addJavaScriptChannel(
      'handlePremiumGamingPopup',
      onMessageReceived: (JavaScriptMessage message) {
        _handlePremiumGamingPopupRequest(message.message);
      },
    );

    // NOTE: openPremiumStore channel is registered in three_js_javascript_channels.dart
    // (must be registered BEFORE page loads, not in onPageFinished callback)

    developer.log(
      '🎮 JavaScript channels registered for premium gaming',
      name: 'PremiumGaming',
    );
  }

  /// Handle premium gaming popup requests from JavaScript
  Future<void> _handlePremiumGamingPopupRequest(String message) async {
    try {
      developer.log(
        '🎮 Received premium gaming popup request: $message',
        name: 'PremiumGaming',
      );

      final data = jsonDecode(message) as Map<String, dynamic>;

      // Extract popup data
      final trigger = data['trigger'] as String? ?? 'unknown';
      final currentLevel = data['currentLevel'] as int? ?? 3;
      final currentScore = data['currentScore'] as int? ?? 0;
      final unlockedLevels =
          (data['unlockedLevels'] as List?)?.cast<int>() ?? [4, 5];

      developer.log(
        '🎮 Popup trigger: $trigger, Level: $currentLevel, Score: $currentScore',
        name: 'PremiumGaming',
      );

      if (_context == null) {
        developer.log(
          '❌ No context available for premium popup',
          name: 'PremiumGaming',
        );
        return;
      }

      // Special handling for bridge test
      if (trigger == 'bridge_test') {
        developer.log(
          '✅ Premium gaming bridge test successful!',
          name: 'PremiumGaming',
        );
        _sendBridgeTestResponse(true);
        return;
      }

      // Show the premium gaming popup
      await _showPremiumGamingPopup(
        trigger: trigger,
        currentLevel: currentLevel,
        currentScore: currentScore,
        unlockedLevels: unlockedLevels,
      );
    } catch (error) {
      developer.log(
        '❌ Error handling premium gaming popup: $error',
        name: 'PremiumGaming',
      );
      _sendBridgeTestResponse(false);
    }
  }

  /// Show the premium gaming popup widget
  Future<void> _showPremiumGamingPopup({
    required String trigger,
    required int currentLevel,
    required int currentScore,
    required List<int> unlockedLevels,
  }) async {
    if (_context == null) return;

    developer.log(
      '🎮 Showing premium gaming popup dialog',
      name: 'PremiumGaming',
    );

    await showPremiumGamingPopup(
      _context!,
      showTestingToggle: AppConfig.showPremiumGamingTestToggle,
      onUnlocked: () {
        developer.log(
          '🎮 Premium gaming levels unlocked from popup',
          name: 'PremiumGaming',
        );
        _notifyJavaScriptLevelRefresh();
      },
      onDismissed: () {
        developer.log(
          '🎮 Premium gaming popup dismissed',
          name: 'PremiumGaming',
        );
      },
      onJavaScriptRefresh: () {
        developer.log(
          '🎮 JavaScript refresh requested from popup',
          name: 'PremiumGaming',
        );
        _notifyJavaScriptLevelRefresh();
      },
    );
  }

  // NOTE: openPremiumStore channel handler moved to three_js_javascript_channels.dart
  // (must be registered BEFORE page loads for JavaScript to access it)

  /// Notify JavaScript to refresh gaming level progression
  void _notifyJavaScriptLevelRefresh() {
    if (_webViewController == null) return;

    try {
      final premiumService = PremiumService.instance;
      final level4Unlocked = premiumService.isLevel4Unlocked;
      final level5Unlocked = premiumService.isLevel5Unlocked;

      developer.log(
        '🎮 Notifying JavaScript: Level 4: $level4Unlocked, Level 5: $level5Unlocked',
        name: 'PremiumGaming',
      );

      final jsCode =
          '''
        console.log('🎮 FLUTTER → JS: Gaming level refresh notification');
        
        if (window.app && window.app.svgEntityManager) {
          // Update premium levels state
          window.app.svgEntityManager.setPremiumLevelsEnabled({
            level4: $level4Unlocked,
            level5: $level5Unlocked
          });
          
          // Refresh level progression
          if (typeof window.app.svgEntityManager.refreshLevelProgression === 'function') {
            window.app.svgEntityManager.refreshLevelProgression();
            console.log('🎮 Level progression refreshed');
          }
          
          // Reset premium popup flag so it can show again if needed
          window.app.svgEntityManager.hasShownPremiumPopup = false;
          
        } else {
          console.warn('🎮 Entity manager not available for refresh');
        }
      ''';

      _webViewController!.runJavaScript(jsCode);

      developer.log(
        '🎮 JavaScript level refresh notification sent',
        name: 'PremiumGaming',
      );
    } catch (error) {
      developer.log(
        '❌ Error notifying JavaScript refresh: $error',
        name: 'PremiumGaming',
      );
    }
  }

  /// Send bridge test response to JavaScript
  void _sendBridgeTestResponse(bool success) {
    if (_webViewController == null) return;

    try {
      final jsCode =
          '''
        console.log('🎮 Bridge test response: ${success ? 'SUCCESS' : 'FAILED'}');
        
        if (window.premiumGamingBridge) {
          window.premiumGamingBridge.bridgeTestResult = $success;
          console.log('🎮 Bridge test result stored');
        }
      ''';

      _webViewController!.runJavaScript(jsCode);
    } catch (error) {
      developer.log(
        '❌ Error sending bridge test response: $error',
        name: 'PremiumGaming',
      );
    }
  }

  /// Test the bridge connection from Flutter side
  Future<void> testBridgeConnection() async {
    if (_webViewController == null) {
      developer.log(
        '❌ WebView controller not available for bridge test',
        name: 'PremiumGaming',
      );
      return;
    }

    try {
      developer.log(
        '🎮 Testing bridge connection from Flutter...',
        name: 'PremiumGaming',
      );

      final jsCode = '''
        console.log('🎮 Testing bridge from Flutter side...');
        
        if (window.premiumGamingBridge) {
          window.premiumGamingBridge.testConnection();
          'Bridge test initiated';
        } else {
          'Bridge not available';
        }
      ''';

      final result = await _webViewController!.runJavaScriptReturningResult(
        jsCode,
      );

      developer.log('🎮 Bridge test result: $result', name: 'PremiumGaming');
    } catch (error) {
      developer.log(
        '❌ Error testing bridge connection: $error',
        name: 'PremiumGaming',
      );
    }
  }

  /// Force trigger premium popup for testing
  Future<void> forceTriggerPremiumPopup() async {
    if (_webViewController == null) return;

    try {
      developer.log(
        '🎮 Force triggering premium popup for testing...',
        name: 'PremiumGaming',
      );

      final jsCode = '''
        console.log('🎮 Force triggering premium popup...');
        
        if (window.triggerPremiumPopup) {
          window.triggerPremiumPopup();
          'Premium popup triggered';
        } else {
          'Premium popup trigger not available';
        }
      ''';

      final result = await _webViewController!.runJavaScriptReturningResult(
        jsCode,
      );

      developer.log('🎮 Force trigger result: $result', name: 'PremiumGaming');
    } catch (error) {
      developer.log(
        '❌ Error force triggering popup: $error',
        name: 'PremiumGaming',
      );
    }
  }

  /// Cleanup resources
  void dispose() {
    _context = null;
    _webViewController = null;
    developer.log(
      '🎮 Premium Gaming WebView Handler disposed',
      name: 'PremiumGaming',
    );
  }
}
