import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// SMS Input Channel Handler
/// Manages keyboard input and SMS text interaction between Flutter and WebView
class SmsInputChannelHandler {
  static const String _channelName = 'SmsInputChannel';

  final BuildContext context;
  final Function(String contactId, String message)? onSmsMessageSent;
  final Function(String contactId)? onSmsKeyboardShow;
  final Function(String contactId)? onSmsKeyboardHide;

  // Current input state
  String? _activeContactId;
  TextEditingController? _textController;
  OverlayEntry? _keyboardOverlay;
  bool _isKeyboardVisible = false;

  SmsInputChannelHandler({
    required this.context,
    this.onSmsMessageSent,
    this.onSmsKeyboardShow,
    this.onSmsKeyboardHide,
  });

  /// Initialize the channel for WebView communication
  void initialize() {
    print('📱 SMS Input Channel Handler initialized');
  }

  /// Handle messages from WebView JavaScript
  Future<String?> handleWebViewMessage(String message) async {
    try {
      final Map<String, dynamic> data = jsonDecode(message);
      final String action = data['action'] ?? '';
      final String contactId = data['contactId'] ?? '';

      print('📱 SMS Input Channel received: $action for contact: $contactId');

      switch (action) {
        case 'showKeyboard':
          return await _showSmsKeyboard(contactId, data);

        case 'hideKeyboard':
          return await _hideSmsKeyboard(contactId);

        case 'getCurrentText':
          return await _getCurrentText(contactId);

        case 'sendMessage':
          return await _handleSendMessage(contactId, data);

        default:
          print('📱 Unknown SMS input action: $action');
          return jsonEncode({'status': 'error', 'message': 'Unknown action'});
      }
    } catch (e) {
      print('📱 Error handling SMS input message: $e');
      return jsonEncode({'status': 'error', 'message': e.toString()});
    }
  }

  /// Show SMS keyboard for text input
  Future<String> _showSmsKeyboard(
    String contactId,
    Map<String, dynamic> data,
  ) async {
    if (_isKeyboardVisible && _activeContactId == contactId) {
      print('📱 SMS keyboard already visible for contact: $contactId');
      return jsonEncode({
        'status': 'success',
        'message': 'Keyboard already visible',
      });
    }

    try {
      _activeContactId = contactId;
      _textController = TextEditingController();

      // Create overlay with SMS input UI
      _keyboardOverlay = _createSmsInputOverlay(contactId);

      // Insert overlay
      Overlay.of(context).insert(_keyboardOverlay!);
      _isKeyboardVisible = true;

      // Notify callback
      onSmsKeyboardShow?.call(contactId);

      print('📱 SMS keyboard shown for contact: $contactId');
      return jsonEncode({
        'status': 'success',
        'message': 'Keyboard shown',
        'contactId': contactId,
      });
    } catch (e) {
      print('📱 Error showing SMS keyboard: $e');
      return jsonEncode({'status': 'error', 'message': e.toString()});
    }
  }

  /// Hide SMS keyboard
  Future<String> _hideSmsKeyboard(String contactId) async {
    if (!_isKeyboardVisible) {
      return jsonEncode({
        'status': 'success',
        'message': 'Keyboard already hidden',
      });
    }

    try {
      // Remove overlay
      _keyboardOverlay?.remove();
      _keyboardOverlay = null;

      // Clear state
      _textController?.dispose();
      _textController = null;
      _activeContactId = null;
      _isKeyboardVisible = false;

      // Notify callback
      onSmsKeyboardHide?.call(contactId);

      print('📱 SMS keyboard hidden for contact: $contactId');
      return jsonEncode({
        'status': 'success',
        'message': 'Keyboard hidden',
        'contactId': contactId,
      });
    } catch (e) {
      print('📱 Error hiding SMS keyboard: $e');
      return jsonEncode({'status': 'error', 'message': e.toString()});
    }
  }

  /// Get current text from input field
  Future<String> _getCurrentText(String contactId) async {
    if (!_isKeyboardVisible || _activeContactId != contactId) {
      return jsonEncode({
        'status': 'error',
        'message': 'No active keyboard for contact',
      });
    }

    final String currentText = _textController?.text ?? '';
    return jsonEncode({
      'status': 'success',
      'text': currentText,
      'contactId': contactId,
    });
  }

  /// Handle send message request
  Future<String> _handleSendMessage(
    String contactId,
    Map<String, dynamic> data,
  ) async {
    try {
      String message = data['message'] ?? '';

      // If no message provided, get from current input
      if (message.isEmpty && _textController != null) {
        message = _textController!.text.trim();
      }

      if (message.isEmpty) {
        return jsonEncode({'status': 'error', 'message': 'No message to send'});
      }

      // Clear input field
      if (_textController != null) {
        _textController!.clear();
      }

      // Notify callback
      onSmsMessageSent?.call(contactId, message);

      print('📱 SMS message sent: $message to contact: $contactId');
      return jsonEncode({
        'status': 'success',
        'message': 'Message sent',
        'sentText': message,
        'contactId': contactId,
      });
    } catch (e) {
      print('📱 Error sending SMS message: $e');
      return jsonEncode({'status': 'error', 'message': e.toString()});
    }
  }

  /// Create SMS input overlay widget
  OverlayEntry _createSmsInputOverlay(String contactId) {
    return OverlayEntry(
      builder: (context) => Positioned(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        left: 20,
        right: 20,
        child: Material(
          elevation: 8,
          borderRadius: BorderRadius.circular(12),
          color: Colors.black87,
          child: Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Contact indicator
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.blue,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(
                    Icons.message,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),

                // Text input field
                Expanded(
                  child: TextField(
                    controller: _textController,
                    autofocus: true,
                    style: const TextStyle(color: Colors.white, fontSize: 16),
                    decoration: InputDecoration(
                      hintText: 'Type SMS message...',
                      hintStyle: TextStyle(
                        color: Colors.white.withOpacity(0.7),
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.1),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                    ),
                    onSubmitted: (_) => _sendCurrentMessage(contactId),
                    textInputAction: TextInputAction.send,
                  ),
                ),
                const SizedBox(width: 12),

                // Send button
                GestureDetector(
                  onTap: () => _sendCurrentMessage(contactId),
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.blue,
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Icon(
                      Icons.send,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Send current message from input field
  void _sendCurrentMessage(String contactId) {
    if (_textController != null) {
      final String message = _textController!.text.trim();
      if (message.isNotEmpty) {
        // Clear input
        _textController!.clear();

        // Notify callback
        onSmsMessageSent?.call(contactId, message);

        // Hide keyboard after sending
        _hideSmsKeyboard(contactId);

        print('📱 Message sent from overlay: $message');
      }
    }
  }

  /// Cleanup resources
  void dispose() {
    _keyboardOverlay?.remove();
    _textController?.dispose();
    _keyboardOverlay = null;
    _textController = null;
    _activeContactId = null;
    _isKeyboardVisible = false;

    print('📱 SMS Input Channel Handler disposed');
  }

  /// Check if keyboard is currently visible
  bool get isKeyboardVisible => _isKeyboardVisible;

  /// Get active contact ID
  String? get activeContactId => _activeContactId;
}
