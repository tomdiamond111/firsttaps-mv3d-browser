import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../widgets/sms_text_input_widget.dart';

/// Delegate interface for SMS positioning operations
abstract class SmsPositioningDelegate {
  BuildContext get context;
  bool get mounted;
  String? get currentSmsContactId;
  bool get isSmsInputVisible;
  bool get isWebViewInitialized;
  WebViewController get webViewController;
  void Function() get closeSmsInput;
  void Function(String message) get sendSmsMessage;
}

/// Helper class for enhanced SMS text input positioning
/// This restores the missing landscape mode positioning from the refactoring
class ThreeJsSmsPositioningHelper {
  final SmsPositioningDelegate delegate;

  ThreeJsSmsPositioningHelper(this.delegate);

  /// Build enhanced SMS text input widget with landscape mode support
  /// This method was lost in the refactoring and provides better positioning
  Widget buildEnhancedSmsInput() {
    if (!delegate.isSmsInputVisible) {
      return const SizedBox.shrink();
    }

    return Builder(
      builder: (context) {
        final screenSize = MediaQuery.of(context).size;
        final isLandscape =
            MediaQuery.of(context).orientation == Orientation.landscape;
        final screenWidth = screenSize.width;

        // Enhanced landscape mode positioning that was missing in refactored version
        if (isLandscape && delegate.isSmsInputVisible) {
          return _buildLandscapeSmsInput(screenWidth);
        } else {
          return _buildPortraitSmsInput();
        }
      },
    );
  }

  /// Build landscape mode SMS input with optimized positioning
  /// This ensures better text input visibility in landscape mode
  Widget _buildLandscapeSmsInput(double screenWidth) {
    return Positioned(
      bottom: 20,
      left: 20,
      width: screenWidth * 0.40, // Optimized width for landscape - was missing
      child: SmsTextInputWidget(
        contactId: delegate.currentSmsContactId,
        webViewController: delegate.isWebViewInitialized
            ? delegate.webViewController
            : null,
        isVisible: delegate.isSmsInputVisible,
        onClose: delegate.closeSmsInput,
        onSend: delegate.sendSmsMessage,
        isLandscapeMode: true, // Enhanced landscape mode support
      ),
    );
  }

  /// Build portrait mode SMS input with full width
  Widget _buildPortraitSmsInput() {
    return Positioned(
      bottom: 20,
      left: 20,
      right: 20,
      child: SmsTextInputWidget(
        contactId: delegate.currentSmsContactId,
        webViewController: delegate.isWebViewInitialized
            ? delegate.webViewController
            : null,
        isVisible: delegate.isSmsInputVisible,
        onClose: delegate.closeSmsInput,
        onSend: delegate.sendSmsMessage,
        isLandscapeMode: false,
      ),
    );
  }

  /// Get optimal SMS input width based on screen orientation
  double getOptimalSmsWidth(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;

    if (isLandscape) {
      return screenSize.width * 0.40; // 40% width in landscape
    } else {
      return screenSize.width - 40; // Full width minus margins in portrait
    }
  }

  /// Get optimal SMS input positioning based on orientation
  EdgeInsets getOptimalSmsMargins(BuildContext context) {
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;

    if (isLandscape) {
      return const EdgeInsets.only(
        bottom: 20,
        left: 20,
        right: 0, // No right margin in landscape to maximize space
      );
    } else {
      return const EdgeInsets.only(bottom: 20, left: 20, right: 20);
    }
  }

  /// Check if SMS input should use landscape optimizations
  bool shouldUseLandscapeOptimizations(BuildContext context) {
    final orientation = MediaQuery.of(context).orientation;
    final screenSize = MediaQuery.of(context).size;

    return orientation == Orientation.landscape &&
        screenSize.width > 600; // Only for larger landscape screens
  }

  /// Get SMS input container decoration based on mode
  BoxDecoration getSmsInputDecoration({bool isLandscapeMode = false}) {
    return BoxDecoration(
      color: Colors.black.withOpacity(isLandscapeMode ? 0.9 : 0.8),
      borderRadius: BorderRadius.circular(12),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.3),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }

  /// Calculate SMS input height based on content and orientation
  double calculateSmsInputHeight(BuildContext context, {String text = ''}) {
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;
    final baseHeight = 56.0;
    final textLines = text.split('\n').length;

    if (isLandscape) {
      // More compact in landscape
      return baseHeight + (textLines > 1 ? (textLines - 1) * 20 : 0);
    } else {
      // More spacious in portrait
      return baseHeight + (textLines > 1 ? (textLines - 1) * 24 : 0);
    }
  }

  /// Check if SMS input is positioned optimally
  bool isSmsInputOptimallyPositioned(BuildContext context) {
    final orientation = MediaQuery.of(context).orientation;
    final screenSize = MediaQuery.of(context).size;

    // Optimal positioning criteria
    if (orientation == Orientation.landscape) {
      return screenSize.width > 600; // Landscape with sufficient width
    } else {
      return screenSize.height > 400; // Portrait with sufficient height
    }
  }

  /// Get keyboard avoidance configuration for SMS input
  Widget buildKeyboardAvoidingSmsInput(Widget child) {
    return Builder(
      builder: (context) {
        final bottomInset = MediaQuery.of(context).viewInsets.bottom;
        final isLandscape =
            MediaQuery.of(context).orientation == Orientation.landscape;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: EdgeInsets.only(
            bottom: bottomInset > 0 ? bottomInset + 10 : 20,
            left: 20,
            right: isLandscape ? 20 : 20,
          ),
          child: child,
        );
      },
    );
  }
}
