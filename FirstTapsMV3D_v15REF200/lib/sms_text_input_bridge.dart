import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// SMS Text Input Bridge for Flutter
///
/// Phase 1: Text Input Event Handling
/// This class handles TextField input and sends text events to JavaScript
///
/// Usage:
/// 1. Create an instance: final bridge = SmsTextInputBridge();
/// 2. Activate for contact: bridge.activateForContact(contactId);
/// 3. Use bridge.textController in your TextField
/// 4. Call bridge.deactivate() when done

class SmsTextInputBridge {
  static const String _jsChannelName = 'flutter-text-input';

  final TextEditingController textController = TextEditingController();
  String? currentContactId;
  bool isActive = false;
  bool debugMode = kDebugMode; // Auto-disabled in release builds

  SmsTextInputBridge() {
    _setupTextListener();
    _log("SMS Text Input Bridge initialized");
  }

  /// Setup text input listener
  void _setupTextListener() {
    textController.addListener(() {
      if (isActive && currentContactId != null) {
        final text = textController.text;
        _sendTextToJavaScript(text);
      }
    });
  }

  /// Activate text input bridging for a specific contact
  void activateForContact(String contactId) {
    currentContactId = contactId;
    isActive = true;
    textController.clear(); // Start with clean slate
    _log("Text input bridge activated for contact: $contactId");
  }

  /// Deactivate text input bridging
  void deactivate() {
    isActive = false;
    currentContactId = null;
    textController.clear();
    _log("Text input bridge deactivated");
  }

  /// Send text input to JavaScript
  void _sendTextToJavaScript(String text) {
    if (!isActive || currentContactId == null) return;

    try {
      final event = {
        'text': text,
        'contactId': currentContactId,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };

      _log("Sending text to JS: '$text' for contact: $currentContactId");

      // Send via JavaScript channel
      _dispatchJavaScriptEvent(_jsChannelName, event);
    } catch (e) {
      _log("Error sending text to JavaScript: $e");
    }
  }

  /// Dispatch JavaScript event
  void _dispatchJavaScriptEvent(String eventName, Map<String, dynamic> data) {
    // This would be implemented based on your specific Flutter-JS bridge
    // For now, this is a placeholder that shows the intended structure

    // Example for flutter_inappwebview:
    // webViewController?.evaluateJavascript(source: '''
    //   window.dispatchEvent(new CustomEvent('$eventName', {
    //     detail: ${jsonEncode(data)}
    //   }));
    // ''');

    _log("Would dispatch JS event: $eventName with data: $data");
  }

  /// Create a TextField widget that uses this bridge
  Widget createTextField({
    String? hintText,
    TextStyle? style,
    InputDecoration? decoration,
  }) {
    return TextField(
      controller: textController,
      style: style,
      decoration:
          decoration ??
          InputDecoration(
            hintText: hintText ?? 'Type your message...',
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
      onChanged: (text) {
        // Text changes are automatically handled by the controller listener
        _log("TextField onChanged: '$text'");
      },
      onSubmitted: (text) {
        _log("TextField onSubmitted: '$text'");
        // Optionally clear the field after submission
        // textController.clear();
      },
    );
  }

  /// Get current state for debugging
  Map<String, dynamic> getState() {
    return {
      'isActive': isActive,
      'currentContactId': currentContactId,
      'textLength': textController.text.length,
      'debugMode': debugMode,
    };
  }

  /// Toggle debug mode
  void setDebugMode(bool enabled) {
    debugMode = enabled;
    _log("Debug mode ${enabled ? 'enabled' : 'disabled'}");
  }

  /// Debug logging
  void _log(String message) {
    if (debugMode) {
      print("📝 [SmsTextInputBridge] $message");
    }
  }

  /// Dispose resources
  void dispose() {
    textController.dispose();
    _log("SMS Text Input Bridge disposed");
  }
}

/// Example usage widget for testing
class SmsTextInputTestWidget extends StatefulWidget {
  final String contactId;

  const SmsTextInputTestWidget({Key? key, required this.contactId})
    : super(key: key);

  @override
  _SmsTextInputTestWidgetState createState() => _SmsTextInputTestWidgetState();
}

class _SmsTextInputTestWidgetState extends State<SmsTextInputTestWidget> {
  late SmsTextInputBridge bridge;

  @override
  void initState() {
    super.initState();
    bridge = SmsTextInputBridge();
    bridge.activateForContact(widget.contactId);
  }

  @override
  void dispose() {
    bridge.deactivate();
    bridge.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          Text(
            'SMS Text Input Test',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          SizedBox(height: 16),
          bridge.createTextField(hintText: 'Type to test text input bridge...'),
          SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              final state = bridge.getState();
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(SnackBar(content: Text('Bridge state: $state')));
            },
            child: Text('Check Bridge State'),
          ),
        ],
      ),
    );
  }
}
