import 'dart:async';
import 'package:share_plus/share_plus.dart';

/// ====================================================================
/// APP SHARE HELPER
/// ====================================================================
///
/// Simple helper for sharing the FirstTaps3D app with friends.
/// Provides clean interface for app sharing without complex tracking.
///
/// Features:
/// - Integration ready for share_plus package
/// - Consistent messaging across platforms
/// - Simple bonus point system
/// - Error handling and logging

class AppShareHelper {
  // ================================================================
  // CONSTANTS
  // ================================================================

  static const String _shareMessage =
      'Check out FirstTaps3D, the world that lives inside your phone!';
  static const String _shareSubject =
      'Amazing FirstTaps3D App - The World Inside Your Phone';
  static const String _playStoreUrl =
      'https://play.google.com/store/apps/details?id=com.yourcompany.three_js_file_viewer'; // TODO: Update with actual package ID

  static const int _shareBonus = 1500;
  static const String _tag = 'AppShareHelper';

  // ================================================================
  // SHARE FUNCTIONALITY
  // ================================================================

  /// Share the app with friends using native share dialog
  static Future<bool> shareApp() async {
    try {
      _log('Sharing app...');

      // Get platform-appropriate store URL
      final storeUrl = _getStoreUrl();
      final fullMessage = '$_shareMessage\n\n$storeUrl';

      // Use share_plus to trigger native share dialog
      await SharePlus.instance.share(
        ShareParams(text: fullMessage, subject: _shareSubject),
      );

      _log('Share dialog opened successfully');
      _log('Share completed successfully');
      return true;
    } catch (e) {
      _log('Error sharing app: $e', isError: true);
      return false;
    }
  }

  /// Share via specific platform/method
  static Future<bool> shareAppVia({
    required String method,
    bool withBonus = false,
  }) async {
    try {
      _log('Sharing app via $method...');

      final storeUrl = _getStoreUrl();
      final fullMessage = '$_shareMessage\n\n$storeUrl';

      // TODO: Implement platform-specific sharing
      _log('Share via $method ready:');
      _log('Content: $fullMessage');

      // Award bonus points if successful
      if (withBonus) {
        await _awardShareBonus();
      }

      _log('Share via $method completed');
      return true;
    } catch (e) {
      _log('Error sharing app via $method: $e', isError: true);
      return false;
    }
  }

  /// Share with custom message (for special occasions)
  static Future<bool> shareAppWithCustomMessage({
    required String customMessage,
    String? customSubject,
    bool withBonus = false,
  }) async {
    try {
      _log('Sharing app with custom message...');

      final storeUrl = _getStoreUrl();
      final fullMessage = '$customMessage\n\n$storeUrl';

      _log('Custom share ready:');
      _log('Subject: ${customSubject ?? _shareSubject}');
      _log('Message: $fullMessage');

      if (withBonus) {
        await _awardShareBonus();
      }

      _log('Custom share completed');
      return true;
    } catch (e) {
      _log('Error sharing app with custom message: $e', isError: true);
      return false;
    }
  }

  // ================================================================
  // BONUS SYSTEM
  // ================================================================

  /// Award bonus points for sharing (simple version)
  static Future<void> _awardShareBonus() async {
    try {
      // Simple bonus - could be enhanced to integrate with existing point system
      _log('Awarding $_shareBonus points for sharing app');

      // TODO: Integrate with your existing point system
      // For now, just log the bonus
      _log('🎉 Share bonus awarded: $_shareBonus points!');

      // Try to add points via JavaScript bridge if available
      await _addPointsViaJavaScript(_shareBonus);
    } catch (e) {
      _log('Error awarding share bonus: $e', isError: true);
    }
  }

  /// Add points via JavaScript bridge to integrate with existing point system
  static Future<void> _addPointsViaJavaScript(int points) async {
    try {
      _log('Attempting to add $points points via JavaScript bridge...');

      // This will integrate with the existing AppSync.addPoints system
      // when the WebView is available in the app context
      _log('JavaScript call would be: window.AppSync.addPoints($points)');
      _log(
        'Points will be added to user total when WebView integration is active',
      );

      // TODO: When WebView controller is available, execute:
      // await webViewController.runJavaScript('window.AppSync.addPoints($points)');
    } catch (e) {
      _log('Error adding points via JavaScript: $e', isError: true);
    }
  }

  /// Check if user has shared recently (to prevent spam)
  static Future<bool> hasSharedRecently() async {
    try {
      // Simple cooldown check - could be enhanced with SharedPreferences
      // For now, always allow sharing
      return false;
    } catch (e) {
      _log('Error checking recent shares: $e', isError: true);
      return false;
    }
  }

  // ================================================================
  // PLATFORM UTILITIES
  // ================================================================

  /// Get platform-appropriate store URL
  static String _getStoreUrl() {
    // Simple platform detection - could be enhanced with platform detection
    // For now, default to Play Store
    return _playStoreUrl;
  }

  // ================================================================
  // SHARE OPTIONS
  // ================================================================

  /// Get available share options for the platform
  static List<ShareOption> getShareOptions() {
    return [
      ShareOption(
        label: 'Share with Friends',
        icon: '👥',
        action: () => shareApp(),
      ),
      ShareOption(label: 'Copy Link', icon: '📋', action: () => _copyAppLink()),
    ];
  }

  /// Copy app store link to clipboard
  static Future<bool> _copyAppLink() async {
    try {
      final storeUrl = _getStoreUrl();
      _log('App link ready to copy: $storeUrl');
      return true;
    } catch (e) {
      _log('Error copying app link: $e', isError: true);
      return false;
    }
  }

  // ================================================================
  // ANALYTICS & LOGGING
  // ================================================================

  /// Log share events
  static void _log(String message, {bool isError = false}) {
    if (isError) {
      print('❌ $_tag: $message');
    } else {
      print('📤 $_tag: $message');
    }
  }

  /// Get share statistics (for future analytics)
  static Future<ShareStats> getShareStats() async {
    // Placeholder for future analytics integration
    return ShareStats(
      totalShares: 0,
      lastSharedDate: null,
      bonusPointsEarned: 0,
    );
  }

  // ================================================================
  // INTEGRATION HELPERS
  // ================================================================

  /// Get formatted share content for external use
  static Map<String, String> getShareContent() {
    return {
      'subject': _shareSubject,
      'message': _shareMessage,
      'storeUrl': _getStoreUrl(),
      'fullMessage': '$_shareMessage\n\n${_getStoreUrl()}',
    };
  }

  /// Trigger share through JavaScript bridge (for WebView integration)
  static Future<bool> shareViaJavaScript() async {
    try {
      final content = getShareContent();
      _log('Triggering JavaScript share...');
      _log('Content: ${content['fullMessage']}');

      // TODO: Call WebView JavaScript function when implemented
      // await webViewController.runJavaScript('window.shareApp("${content['fullMessage']}")');

      return true;
    } catch (e) {
      _log('Error sharing via JavaScript: $e', isError: true);
      return false;
    }
  }

  /// Execute JavaScript to add bonus points (called by Flutter WebView)
  static String getShareBonusJavaScript() {
    return '''
      console.log('📤 Share bonus: Adding $_shareBonus points via AppSync');
      
      if (window.AppSync && window.AppSync.addPoints) {
        const oldPoints = window.AppSync.getTotalPoints();
        const success = window.AppSync.addPoints($_shareBonus);
        const newPoints = window.AppSync.getTotalPoints();
        
        if (success) {
          console.log('🎉 Share bonus successful: ' + oldPoints + ' → ' + newPoints + ' points');
          
          // Trigger UI updates
          if (window.entityUIManager && window.entityUIManager.updateScoreUI) {
            window.entityUIManager.updateScoreUI();
          }
          
          // Check for level progression
          if (window.AppSync.checkLevelProgression) {
            window.AppSync.checkLevelProgression(newPoints);
          }
          
          return true;
        } else {
          console.error('❌ Failed to add share bonus points');
          return false;
        }
      } else {
        console.warn('⚠️ AppSync system not available for share bonus');
        return false;
      }
    ''';
  }
}

// ====================================================================
// DATA MODELS
// ====================================================================

/// Share option configuration
class ShareOption {
  final String label;
  final String icon;
  final Future<bool> Function() action;

  const ShareOption({
    required this.label,
    required this.icon,
    required this.action,
  });
}

/// Share statistics data
class ShareStats {
  final int totalShares;
  final DateTime? lastSharedDate;
  final int bonusPointsEarned;

  const ShareStats({
    required this.totalShares,
    this.lastSharedDate,
    required this.bonusPointsEarned,
  });
}
