import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/premium_gaming_webview_handler.dart';
import 'dart:developer' as developer;

/// WEBVIEW PREMIUM INTEGRATION MIXIN
/// Easy integration mixin for adding premium gaming functionality to WebView widgets
/// Just add this mixin to any StatefulWidget that has a WebViewController
mixin WebViewPremiumIntegration<T extends StatefulWidget> on State<T> {
  /// Initialize premium gaming integration
  /// Call this after your WebViewController is ready
  void initializePremiumGaming(WebViewController webViewController) {
    try {
      // Initialize the premium gaming handler
      PremiumGamingWebViewHandler.instance.initialize(
        context,
        webViewController,
      );

      // Load the premium gaming bridge JavaScript
      _loadPremiumGamingBridge(webViewController);

      developer.log(
        '✅ Premium gaming integration initialized',
        name: 'WebViewIntegration',
      );
    } catch (error) {
      developer.log(
        '❌ Error initializing premium gaming: $error',
        name: 'WebViewIntegration',
      );
    }
  }

  /// Load the premium gaming bridge JavaScript
  void _loadPremiumGamingBridge(WebViewController webViewController) {
    // Bridge is now bundled in Core Bundle - just verify it's available
    final jsCode = '''
      // Check if bridge is available (should be bundled in Core Bundle)
      if (window.premiumGamingBridge) {
        console.log('🎮 Premium gaming bridge available from Core Bundle');
      } else {
        console.warn('🎮 Premium gaming bridge not found - may need build script update');
        
        // Fallback: try to initialize bridge manually if code is available but not initialized
        if (typeof PremiumGamingPopupBridge !== 'undefined') {
          console.log('🎮 Manually initializing premium gaming bridge...');
          window.premiumGamingBridge = new PremiumGamingPopupBridge();
        }
      }
    ''';

    webViewController.runJavaScript(jsCode);
  }

  /// Test the premium gaming bridge connection
  Future<void> testPremiumGamingBridge(
    WebViewController webViewController,
  ) async {
    await PremiumGamingWebViewHandler.instance.testBridgeConnection();
  }

  /// Force trigger premium popup for testing
  Future<void> triggerPremiumPopupTest(
    WebViewController webViewController,
  ) async {
    await PremiumGamingWebViewHandler.instance.forceTriggerPremiumPopup();
  }

  /// Cleanup premium gaming integration
  void disposePremiumGaming() {
    PremiumGamingWebViewHandler.instance.dispose();
    developer.log(
      '🎮 Premium gaming integration disposed',
      name: 'WebViewIntegration',
    );
  }
}

/// PREMIUM GAMING WEBVIEW WIDGET
/// Drop-in widget that adds premium gaming testing controls to any screen
/// Useful for development and testing
class PremiumGamingTestControls extends StatelessWidget {
  final WebViewController? webViewController;
  final VoidCallback? onRefresh;

  const PremiumGamingTestControls({
    Key? key,
    this.webViewController,
    this.onRefresh,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (webViewController == null) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(8.0),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '🎮 Premium Gaming Test Controls',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: Colors.blue,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              _buildTestButton(
                '🔗 Test Bridge',
                () =>
                    PremiumGamingWebViewHandler.instance.testBridgeConnection(),
              ),
              _buildTestButton(
                '🎯 Trigger Popup',
                () => PremiumGamingWebViewHandler.instance
                    .forceTriggerPremiumPopup(),
              ),
              _buildTestButton('🔄 Refresh', onRefresh),
              _buildTestButton(
                '📊 Set 30k Points',
                () => _setTestingPoints(30000),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTestButton(String label, VoidCallback? onPressed) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.blue.shade100,
        foregroundColor: Colors.blue.shade800,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        minimumSize: const Size(0, 28),
        textStyle: const TextStyle(fontSize: 10),
      ),
      child: Text(label),
    );
  }

  void _setTestingPoints(int points) {
    if (webViewController == null) return;

    final jsCode =
        '''
      console.log('🎮 Setting testing points to $points');
      
      if (window.app && window.app.svgEntityManager) {
        window.app.svgEntityManager.totalPoints = $points;
        window.app.svgEntityManager.hasShownPremiumPopup = false;
        
        // Trigger level progression check
        window.app.svgEntityManager.checkLevelProgression();
        
        console.log('🎮 Points set and progression check triggered');
      } else {
        console.warn('🎮 Entity manager not available');
      }
    ''';

    webViewController!.runJavaScript(jsCode);
  }
}
