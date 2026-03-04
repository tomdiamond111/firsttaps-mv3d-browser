import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class ExploreButtonWidget extends StatefulWidget {
  final WebViewController? webViewController;
  final bool isVisible;

  const ExploreButtonWidget({
    super.key,
    required this.webViewController,
    this.isVisible = true,
  });

  @override
  State<ExploreButtonWidget> createState() => _ExploreButtonWidgetState();
}

class _ExploreButtonWidgetState extends State<ExploreButtonWidget> {
  bool _isExploreMode = false;

  @override
  void initState() {
    super.initState();
    _setupExploreChannel();
  }

  /// Set up JavaScript channel to listen for explore mode changes
  void _setupExploreChannel() {
    // This will be handled by the main ThreeJsScreen
    // JavaScript will send explore mode state changes via ExploreChannel
  }

  /// Toggle explore mode via JavaScript
  Future<void> _toggleExploreMode() async {
    if (widget.webViewController == null) {
      print('🚶 ExploreButton: WebViewController not available');
      return;
    }

    try {
      await widget.webViewController!.runJavaScript('''
        if (window.toggleExploreMode) {
          window.toggleExploreMode();
        } else {
          console.warn("toggleExploreMode function not available");
        }
      ''');

      print('🚶 ExploreButton: Toggle explore mode requested');
    } catch (e) {
      print('🚶 ExploreButton: Error toggling explore mode: $e');
    }
  }

  /// Update explore mode state from JavaScript
  void updateExploreMode(bool isActive) {
    if (mounted) {
      setState(() {
        _isExploreMode = isActive;
      });
      print('🚶 ExploreButton: Mode updated to: $isActive');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isVisible) {
      return const SizedBox.shrink();
    }

    return FloatingActionButton(
      mini: true,
      backgroundColor: _isExploreMode
          ? Colors.blue.withOpacity(0.8)
          : Colors.black.withOpacity(0.7),
      foregroundColor: Colors.white,
      onPressed: _toggleExploreMode,
      child: const Icon(Icons.directions_walk),
      // Use walking icon instead of emoji for better consistency
    );
  }
}
