import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Enhanced SMS Text Input Widget for Real-Time Communication with JavaScript
///
/// This widget implements the persistent TextField pattern recommended for
/// stable keyboard behavior and real-time text event dispatch to JavaScript.
///
/// Key Features:
/// - Persistent TextField that stays mounted during SMS mode
/// - Real-time text event dispatch via TextEditingController.addListener()
/// - Smart focus management to prevent keyboard flicker
/// - Proper cleanup when SMS mode ends
class SmsTextInputWidget extends StatefulWidget {
  final String? contactId;
  final WebViewController? webViewController;
  final bool isVisible;
  final VoidCallback? onClose;
  final Function(String)? onSend;
  final bool isLandscapeMode; // New parameter for landscape mode detection

  const SmsTextInputWidget({
    Key? key,
    this.contactId,
    this.webViewController,
    this.isVisible = false,
    this.onClose,
    this.onSend,
    this.isLandscapeMode = false, // Default to portrait mode
  }) : super(key: key);

  @override
  State<SmsTextInputWidget> createState() => _SmsTextInputWidgetState();
}

class _SmsTextInputWidgetState extends State<SmsTextInputWidget> {
  late TextEditingController _textController;
  late FocusNode _focusNode;
  bool _isListenerActive = false;
  bool _showSuccessFlash = false; // For green flash on send

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController();
    _focusNode = FocusNode();
    _setupRealTimeTextDispatch();

    print('📱 SmsTextInputWidget initialized for contact: ${widget.contactId}');
  }

  @override
  void didUpdateWidget(SmsTextInputWidget oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Handle visibility changes
    if (widget.isVisible != oldWidget.isVisible) {
      if (widget.isVisible) {
        _activateTextInput();
      } else {
        _deactivateTextInput();
      }
    }

    // Handle contact changes
    if (widget.contactId != oldWidget.contactId) {
      _textController.clear();
      if (widget.isVisible) {
        _activateTextInput();
      }
    }
  }

  @override
  void dispose() {
    _deactivateTextInput();
    _textController.dispose();
    _focusNode.dispose();
    print('📱 SmsTextInputWidget disposed');
    super.dispose();
  }

  /// Setup optimized text dispatch - only send complete messages, not individual characters
  void _setupRealTimeTextDispatch() {
    // PERFORMANCE OPTIMIZATION: Remove real-time character-by-character dispatch
    // Old approach: _textController.addListener() fired on every character change
    // New approach: Only dispatch complete message on send button press
    // This eliminates excessive Flutter bridge calls for better performance

    print(
      '📱 Optimized text dispatch setup complete - no real-time character sending',
    );
  }

  /// Activate text input for SMS mode
  void _activateTextInput() {
    if (!mounted || widget.contactId == null) return;

    _isListenerActive = true;

    // Focus with delay to prevent keyboard flicker
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted && widget.isVisible) {
        _focusNode.requestFocus();
      }
    });

    print('📱 Text input activated for contact: ${widget.contactId}');
  }

  /// Deactivate text input
  void _deactivateTextInput() {
    _isListenerActive = false;
    _focusNode.unfocus();
    print('📱 Text input deactivated');
  }

  /// Dispatch text input to JavaScript - OPTIMIZED for complete messages only
  void _dispatchTextToJavaScript(String text) {
    if (widget.webViewController == null || widget.contactId == null) {
      return;
    }

    try {
      // Encode text to handle special characters
      final encodedText = Uri.encodeComponent(text);

      // Dispatch flutter-text-input event with complete message (not character-by-character)
      final jsCode =
          '''
        (function() {
          try {
            const event = new CustomEvent('flutter-text-input', {
              detail: {
                text: decodeURIComponent('$encodedText'),
                contactId: '${widget.contactId}',
                timestamp: Date.now(),
                optimized: true  // Flag to indicate this is a complete message, not partial text
              }
            });
            window.dispatchEvent(event);
            console.log('📤 Sent COMPLETE MESSAGE to JS (optimized):', decodeURIComponent('$encodedText'));
            return 'success';
          } catch (error) {
            console.error('📱 Failed to dispatch flutter-text-input:', error);
            return 'error: ' + error.message;
          }
        })();
      ''';

      widget.webViewController!.runJavaScript(jsCode);

      // Debug logging
      print(
        '📤 Dispatched text to JS: "$text" for contact: ${widget.contactId}',
      );
    } catch (error) {
      print('❌ Error dispatching text to JavaScript: $error');
    }
  }

  /// Send current message with optimized approach
  void _sendMessage() {
    final message = _textController.text.trim();
    if (message.isEmpty) return;

    // PERFORMANCE OPTIMIZATION: Only dispatch to JavaScript on send, not per character
    // This eliminates character-by-character bridge calls for better performance
    _dispatchTextToJavaScript(message);

    if (widget.onSend != null) {
      widget.onSend!(message);
    }

    // Clear text after sending
    _textController.clear();

    // Trigger success flash animation (non-blocking)
    _triggerSuccessFlash();

    print('📤 Message sent with optimized dispatch: "$message"');
  }

  /// Trigger success flash animation and sound (non-blocking)
  void _triggerSuccessFlash() {
    if (!mounted) return;

    // Visual flash
    setState(() {
      _showSuccessFlash = true;
    });

    // Play success sound via JavaScript (Web Audio API)
    _playSuccessSound();

    // Reset flash after animation
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) {
        setState(() {
          _showSuccessFlash = false;
        });
      }
    });
  }

  /// Play success sound using Web Audio API via JavaScript
  void _playSuccessSound() {
    if (widget.webViewController == null) return;

    try {
      final jsCode = '''
        (function() {
          try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Pleasant "ding" sound - similar to gaming entities
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
            
            // Volume envelope
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
            console.log('📤 ✅ SMS send confirmation sound played');
          } catch (error) {
            console.log('⚠️ Could not play send confirmation sound:', error.message);
          }
        })();
      ''';

      widget.webViewController!.runJavaScript(jsCode);
    } catch (error) {
      // Silently fail - don't break SMS functionality
      print('⚠️ Could not trigger send sound: $error');
    }
  }

  /// Handle Enter key press
  void _handleSubmitted(String value) {
    _sendMessage();
  }

  @override
  Widget build(BuildContext context) {
    // Always build the widget but control visibility
    return Visibility(
      visible: widget.isVisible,
      child: Container(
        margin: const EdgeInsets.all(16.0),
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.9),
          borderRadius: BorderRadius.circular(25.0),
          border: Border.all(
            color: _showSuccessFlash ? Colors.green : Colors.blue,
            width: _showSuccessFlash ? 3.0 : 2.0,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 10.0,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Close button
            GestureDetector(
              onTap: widget.onClose,
              child: Container(
                padding: const EdgeInsets.all(8.0),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.8),
                  borderRadius: BorderRadius.circular(20.0),
                ),
                child: const Icon(Icons.close, color: Colors.white, size: 20.0),
              ),
            ),
            const SizedBox(width: 12.0),

            // Text input field
            Expanded(
              child: TextField(
                controller: _textController,
                focusNode: _focusNode,
                style: const TextStyle(color: Colors.white, fontSize: 16.0),
                decoration: const InputDecoration(
                  hintText: 'Type SMS message...',
                  hintStyle: TextStyle(color: Colors.grey),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(vertical: 8.0),
                ),
                textInputAction: TextInputAction.send,
                onSubmitted: _handleSubmitted,
                enabled: widget.isVisible && widget.contactId != null,
              ),
            ),

            const SizedBox(width: 12.0),

            // Send button
            GestureDetector(
              onTap: _sendMessage,
              child: Container(
                padding: const EdgeInsets.all(8.0),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.8),
                  borderRadius: BorderRadius.circular(20.0),
                ),
                child: const Icon(Icons.send, color: Colors.white, size: 20.0),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
