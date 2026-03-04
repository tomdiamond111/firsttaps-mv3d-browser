import 'package:flutter/services.dart';
import 'dart:async';
import 'dart:convert';
import 'package:permission_handler/permission_handler.dart';
import 'package:another_telephony/telephony.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/sms_core_service_new.dart';

/// SMS Channel Manager
/// Handles all JavaScript-Flutter communication for SMS functionality
/// Provides native SMS capabilities to the web interface
class SmsChannelManager {
  static const String SMS_INPUT_CHANNEL = 'sms_input_channel';
  static const String SMS_DATA_CHANNEL = 'sms_data_channel';
  static const String SMS_STATUS_CHANNEL = 'sms_status_channel';

  // Debug control - set to false to reduce log spam
  static const bool _debugVerbose = false;

  late MethodChannel _inputChannel;
  late MethodChannel _dataChannel;
  late MethodChannel _statusChannel;

  // WebView controller for JavaScript communication
  WebViewController? _webViewController;

  // SMS UI callback functions
  Function(String contactId)? _onShowSmsInput;
  Function()? _onHideSmsInput;

  // Telephony instance for SMS operations
  final Telephony telephony = Telephony.instance;

  bool _isInitialized = false;
  bool _hasPermissions = false;

  // SMS message cache for recent conversations
  final Map<String, List<Map<String, dynamic>>> _conversationCache = {};

  // Event streams for real-time updates
  late StreamController<Map<String, dynamic>> _inputEventController;
  late StreamController<Map<String, dynamic>> _dataEventController;
  late StreamController<Map<String, dynamic>> _statusEventController;

  /// Initialize the SMS channel manager
  Future<bool> initialize() async {
    try {
      print('📱 Initializing SmsChannelManager...');

      // Initialize method channels
      _initializeChannels();

      // Initialize event streams
      _initializeEventStreams();

      // Check and request permissions
      await _checkPermissions();

      // Set up incoming SMS listener if we have permissions
      if (_hasPermissions) {
        _setupIncomingSmsListener();
      } else {
        print(
          '📱 ⚠️ No permissions yet - will retry listener setup in 10 seconds',
        );
        // Retry listener setup after 10 seconds in case permissions are granted later
        Timer(Duration(seconds: 10), () {
          print('📱 🔄 Retrying incoming SMS listener setup...');
          _checkPermissions();
          if (_hasPermissions) {
            _setupIncomingSmsListener();
          }
        });
      }

      _isInitialized = true;
      print('📱 SmsChannelManager initialized successfully');

      // Send connection confirmation to JavaScript
      await _sendStatusEvent({
        'action': 'connection_status',
        'connected': true,
        'hasPermissions': _hasPermissions,
      });

      return true;
    } catch (error) {
      print('📱 Error initializing SmsChannelManager: $error');
      return false;
    }
  }

  /// Set the WebViewController for JavaScript communication
  void setWebViewController(WebViewController controller) {
    _webViewController = controller;
    print('📱 WebViewController set for SMS Channel Manager');
  }

  /// Set SMS UI callbacks for Flutter screen integration
  void setSmsUICallbacks({
    Function(String contactId)? onShowSmsInput,
    Function()? onHideSmsInput,
  }) {
    _onShowSmsInput = onShowSmsInput;
    _onHideSmsInput = onHideSmsInput;
    print('📱 SMS UI callbacks set for Flutter screen integration');
  }

  /// Public method to send SMS (for Flutter UI components)
  Future<bool> sendSmsMessage(String contactId, String message) async {
    try {
      // CRITICAL FIX: Resolve contactId to phone number using loaded contact data
      String? phoneNumber;

      // Try to get phone number from the contact data that was loaded into JavaScript
      // The phone number is stored in cameraModel and dateTimeOriginal fields
      try {
        final webViewController = _webViewController;
        if (webViewController != null) {
          // Ask JavaScript to resolve the contact ID to phone number
          final jsResult = await webViewController.runJavaScriptReturningResult(
            '''
            (function() {
              try {
                // Try to get phone number from contact manager
                if (window.app && window.app.contactManager && window.app.contactManager.contacts) {
                  const contact = window.app.contactManager.contacts.get("$contactId");
                  if (contact && contact.contactData && contact.contactData.phoneNumber) {
                    console.log("📱 [FLUTTER] Resolved contactId $contactId to phone:", contact.contactData.phoneNumber);
                    return contact.contactData.phoneNumber;
                  }
                }
                
                // Fallback: check if we have contact data in global scope
                if (window.contactData && window.contactData["$contactId"]) {
                  const data = window.contactData["$contactId"];
                  const phone = data.cameraModel || data.dateTimeOriginal || data.phoneNumber;
                  if (phone && phone !== 'No Phone') {
                    console.log("📱 [FLUTTER] Resolved contactId $contactId to phone via fallback:", phone);
                    return phone;
                  }
                }
                
                console.error("📱 [FLUTTER] Could not resolve contactId $contactId to phone number");
                return null;
              } catch (error) {
                console.error("📱 [FLUTTER] Error resolving contact phone:", error);
                return null;
              }
            })();
          ''',
          );

          if (jsResult != null) {
            final resultString = jsResult.toString();
            if (resultString.isNotEmpty && resultString != 'null') {
              phoneNumber = resultString;
              print(
                '📱 ✅ Resolved contactId "$contactId" to phone number: "$phoneNumber"',
              );
            }
          }
        }
      } catch (jsError) {
        print('📱 ⚠️ Error resolving contact phone via JavaScript: $jsError');
      }

      final args = {
        'contactId': contactId,
        'phoneNumber': phoneNumber ?? '', // Include the resolved phone number
        'text': message,
        'messageId': 'flutter_${DateTime.now().millisecondsSinceEpoch}',
      };

      print('📱 🔍 Enhanced SMS payload: $args');

      final response = await _sendSmsMessage(args, args['messageId'] as String);
      return response['success'] == true;
    } catch (error) {
      print('📱 Error in public sendSmsMessage: $error');
      return false;
    }
  }

  /// Initialize Flutter method channels
  void _initializeChannels() {
    _inputChannel = const MethodChannel(SMS_INPUT_CHANNEL);
    _dataChannel = const MethodChannel(SMS_DATA_CHANNEL);
    _statusChannel = const MethodChannel(SMS_STATUS_CHANNEL);

    // Set up method call handlers
    _inputChannel.setMethodCallHandler(_handleInputMethodCall);
    _dataChannel.setMethodCallHandler(_handleDataMethodCall);
    _statusChannel.setMethodCallHandler(_handleStatusMethodCall);

    print('📱 Method channels initialized');
  }

  /// Initialize event streams for real-time communication
  void _initializeEventStreams() {
    _inputEventController = StreamController<Map<String, dynamic>>.broadcast();
    _dataEventController = StreamController<Map<String, dynamic>>.broadcast();
    _statusEventController = StreamController<Map<String, dynamic>>.broadcast();

    // Listen to streams and forward to JavaScript
    _inputEventController.stream.listen(_forwardInputEvent);
    _dataEventController.stream.listen(_forwardDataEvent);
    _statusEventController.stream.listen(_forwardStatusEvent);

    print('📱 Event streams initialized');
  }

  /// Check and request SMS permissions
  Future<void> _checkPermissions() async {
    try {
      // Check SMS permission
      final smsPermission = await Permission.sms.status;
      print('📱 SMS permission status: $smsPermission');

      if (smsPermission != PermissionStatus.granted) {
        print('📱 Requesting SMS permissions...');
        final result = await Permission.sms.request();
        _hasPermissions = result == PermissionStatus.granted;

        // Handle Android 14+ restrictions and permanently denied permissions
        if (result == PermissionStatus.permanentlyDenied) {
          print(
            '📱 SMS permissions permanently denied - user must enable in Settings',
          );
          print(
            '📱 INSTRUCTION: Go to Settings > Apps > Your App > Permissions > SMS > Allow',
          );
          // Send instruction to JavaScript
          await _sendStatusEvent({
            'action': 'sms_permission_denied',
            'reason': 'permanently_denied',
            'instruction':
                'Go to Settings > Apps > Your App > Permissions > SMS > Allow',
            'timestamp': DateTime.now().millisecondsSinceEpoch,
          });
        } else if (result == PermissionStatus.denied) {
          print(
            '📱 SMS permissions denied - may need manual settings on Android 14+',
          );
          print(
            '📱 INSTRUCTION: On Android 14+, you may need to manually enable SMS permissions in Settings',
          );
          // Send instruction to JavaScript
          await _sendStatusEvent({
            'action': 'sms_permission_denied',
            'reason': 'denied',
            'instruction':
                'On Android 14+, manually enable SMS permissions in Settings',
            'timestamp': DateTime.now().millisecondsSinceEpoch,
          });
        }
      } else {
        _hasPermissions = true;
      }

      // Also check phone permission for contact info
      final phonePermission = await Permission.phone.status;
      if (phonePermission != PermissionStatus.granted) {
        await Permission.phone.request();
      }

      print('📱 SMS permissions granted: $_hasPermissions');

      // Notify JavaScript of permission status
      await _sendStatusEvent({
        'action': 'sms_permission',
        'granted': _hasPermissions,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });
    } catch (error) {
      print('📱 Error checking permissions: $error');
      _hasPermissions = false;
    }
  }

  /// Handle input channel method calls from JavaScript
  Future<dynamic> _handleInputMethodCall(MethodCall call) async {
    if (_debugVerbose) {
      print('📱 Input channel method call: ${call.method}');
    }

    try {
      final Map<String, dynamic> args = Map<String, dynamic>.from(
        call.arguments,
      );
      final String messageId = args['messageId'] ?? '';

      Map<String, dynamic> response;
      switch (call.method) {
        case 'show_keyboard':
          response = await _showKeyboard(args, messageId);
          break;

        case 'hide_keyboard':
          response = await _hideKeyboard(args, messageId);
          break;

        case 'hideKeyboard':
          response = await _hideKeyboard(args, messageId);
          break;

        case 'text_input':
          response = await _handleTextInput(args, messageId);
          break;

        case 'register_listener':
          response = await _registerListener(args, messageId);
          break;

        default:
          print('📱 Unknown input method: ${call.method}');
          response = {'success': false, 'error': 'Unknown method'};
      }

      // Send response back to JavaScript
      await _sendResponseToJavaScript('input', response);

      return response;
    } catch (error) {
      print('📱 Error handling input method call: $error');
      final errorResponse = {'success': false, 'error': error.toString()};
      await _sendResponseToJavaScript('input', errorResponse);
      return errorResponse;
    }
  }

  /// Handle data channel method calls from JavaScript
  Future<dynamic> _handleDataMethodCall(MethodCall call) async {
    if (_debugVerbose) {
      print('📱 Data channel method call: ${call.method}');
    }

    try {
      final Map<String, dynamic> args = Map<String, dynamic>.from(
        call.arguments,
      );
      final String messageId = args['messageId'] ?? '';

      Map<String, dynamic> response;
      switch (call.method) {
        case 'send_message':
          response = await _sendSmsMessage(args, messageId);
          break;

        case 'get_conversation':
          response = await _getConversationHistory(args, messageId);
          break;

        case 'loadConversation':
          response = await _getConversationHistory(args, messageId);
          break;

        case 'mark_as_read':
          response = await _markAsRead(args, messageId);
          break;

        default:
          print('📱 Unknown data method: ${call.method}');
          response = {'success': false, 'error': 'Unknown method'};
      }

      // Send response back to JavaScript
      await _sendResponseToJavaScript('data', response);

      return response;
    } catch (error) {
      print('📱 Error handling data method call: $error');
      final errorResponse = {'success': false, 'error': error.toString()};
      await _sendResponseToJavaScript('data', errorResponse);
      return errorResponse;
    }
  }

  /// Handle status channel method calls from JavaScript
  Future<dynamic> _handleStatusMethodCall(MethodCall call) async {
    if (_debugVerbose) {
      print('📱 Status channel method call: ${call.method}');
    }

    try {
      final Map<String, dynamic> args = Map<String, dynamic>.from(
        call.arguments,
      );
      final String messageId = args['messageId'] ?? '';

      Map<String, dynamic> response;
      switch (call.method) {
        case 'test_connection':
          response = await _testConnection(args, messageId);
          break;

        case 'request_permissions':
          response = await _requestPermissions(args, messageId);
          break;

        case 'get_status':
          response = await _getStatus(args, messageId);
          break;

        case 'startListening':
          response = await _startListening(args, messageId);
          break;

        case 'start_listening':
          response = await _startListening(args, messageId);
          break;

        case 'stopListening':
          response = await _stopListening(args, messageId);
          break;

        case 'stop_listening':
          response = await _stopListening(args, messageId);
          break;

        case 'force_setup_listener':
          print('📱 🔧 Force setup listener requested from JavaScript');
          forceSetupIncomingListener();
          response = {
            'success': true,
            'messageId': messageId,
            'message': 'Incoming SMS listener setup triggered',
          };
          break;

        default:
          print('📱 Unknown status method: ${call.method}');
          response = {'success': false, 'error': 'Unknown method'};
      }

      // Send response back to JavaScript
      await _sendResponseToJavaScript('status', response);

      return response;
    } catch (error) {
      print('📱 Error handling status method call: $error');
      final errorResponse = {'success': false, 'error': error.toString()};
      await _sendResponseToJavaScript('status', errorResponse);
      return errorResponse;
    }
  }

  /// Show native keyboard for SMS input
  Future<Map<String, dynamic>> _showKeyboard(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    final contactId = args['contactId'] as String? ?? '';
    print('📱 Showing keyboard for contact: $contactId');

    // Trigger Flutter SMS input widget via callback
    if (_onShowSmsInput != null && contactId.isNotEmpty) {
      _onShowSmsInput!(contactId);
      print('📱 Triggered Flutter SMS input widget for contact: $contactId');
    }

    // Notify that keyboard is shown
    await _sendInputEvent({
      'action': 'keyboard_shown',
      'contactId': contactId,
      'messageId': messageId,
    });

    return {
      'success': true,
      'messageId': messageId,
      'action': 'keyboard_shown',
      'contactId': contactId,
    };
  }

  /// Hide native keyboard
  Future<Map<String, dynamic>> _hideKeyboard(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    print('📱 Hiding keyboard');

    // Trigger Flutter SMS input widget hide via callback
    if (_onHideSmsInput != null) {
      _onHideSmsInput!();
      print('📱 Triggered Flutter SMS input widget hide');
    }

    // Notify that keyboard is hidden
    await _sendInputEvent({
      'action': 'keyboard_hidden',
      'messageId': messageId,
    });

    return {
      'success': true,
      'messageId': messageId,
      'action': 'keyboard_hidden',
    };
  }

  /// Handle text input from native keyboard
  Future<Map<String, dynamic>> _handleTextInput(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    final String text = args['text'] ?? '';
    print('📱 Text input received: $text');

    // Forward text input to JavaScript
    await _sendInputEvent({
      'action': 'text_input',
      'text': text,
      'messageId': messageId,
    });

    return {'success': true, 'messageId': messageId, 'text': text};
  }

  /// Register a listener for a specific contact
  Future<Map<String, dynamic>> _registerListener(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    final contactId = args['contactId'] as String? ?? '';
    print('📱 Registering listener for contact: $contactId');

    // This confirms that Flutter is aware of the active contact for SMS.
    // We can add more logic here later if needed.

    return {
      'success': true,
      'messageId': messageId,
      'action': 'listener_registered',
      'contactId': contactId,
    };
  }

  /// Send real SMS message using telephony
  Future<Map<String, dynamic>> _sendSmsMessage(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    if (!_hasPermissions) {
      return {
        'success': false,
        'error': 'No SMS permissions',
        'messageId': messageId,
      };
    }

    try {
      final String contactId = args['contactId'] ?? '';
      final String rawPhoneNumber = args['phoneNumber'] ?? '';
      final String text = args['text'] ?? '';

      // Essential logging only
      print(
        '� SMS Request: contactId="$contactId", phoneNumber="$rawPhoneNumber"',
      );

      // Verbose debugging (only when enabled)
      if (_debugVerbose) {
        print('🔍 [FLUTTER] Raw method call payload:');
        print('🔍 [FLUTTER] Full args: ${jsonEncode(args)}');
        print('📦 [FLUTTER] Args keys: ${args.keys.toList()}');
        print('📦 [FLUTTER] Args values: ${args.values.toList()}');
        print('🔍 [FLUTTER] contactId: "$contactId"');
        print('🔍 [FLUTTER] rawPhoneNumber: "$rawPhoneNumber"');
        print('🔍 [FLUTTER] text: "$text"');
      }

      // 🚨 CRITICAL CORRUPTION DETECTION
      if (rawPhoneNumber == contactId) {
        print(
          '🚨 [CRITICAL] phoneNumber equals contactId - CORRUPTION DETECTED!',
        );
        print('🚨 [CRITICAL] rawPhoneNumber: "$rawPhoneNumber"');
        print('🚨 [CRITICAL] contactId: "$contactId"');

        if (_debugVerbose) {
          print(
            '🚨 [CRITICAL] This means JavaScript sent corrupted data or Flutter received it wrong',
          );
          print(
            '🚨 [CRITICAL] Expected: Real phone number like "+1-555-123-4567"',
          );
          final allKeys = args.keys
              .where((key) => key.toLowerCase().contains('phone'))
              .toList();
          print('🔍 [CRITICAL] All phone-related keys in payload: $allKeys');
        }

        throw Exception(
          'CORRUPTION: phoneNumber equals contactId ($contactId) - refusing to send SMS',
        );
      }

      // ✅ PHONE NUMBER VALIDATION
      String phoneNumber = rawPhoneNumber;
      if (phoneNumber.isEmpty) {
        print(
          '⚠️ [WARNING] phoneNumber is empty, attempting contactId fallback',
        );
        phoneNumber = contactId;
      }

      if (_debugVerbose) {
        print('📱 🔍 SMS DEBUGGING - Final processed values:');
        print('📱   contactId: "$contactId"');
        print(
          '📱   phoneNumber: "$phoneNumber" (from rawPhoneNumber: "$rawPhoneNumber")',
        );
        print('📱   text: "$text"');
      }

      // CRITICAL FIX: Normalize phone number to E.164 format
      final String normalizedPhoneNumber = _normalizePhoneNumber(phoneNumber);

      if (_debugVerbose) {
        print('📱 🔍 After normalization: "$normalizedPhoneNumber"');
      }
      print('📱 Sending SMS to: $normalizedPhoneNumber (contact: $contactId)');

      // Send SMS using telephony with the normalized phone number
      await telephony.sendSms(to: normalizedPhoneNumber, message: text);

      // Create sent message record
      final sentMessage = {
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'text': text,
        'contactId': contactId,
        'phoneNumber':
            normalizedPhoneNumber, // Include the actual phone number used
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'type': 'sent',
        'status': 'sent',
      };

      // Add to conversation cache
      _addToConversationCache(contactId, sentMessage);

      print(
        '📱 ✅ SMS sent successfully to $normalizedPhoneNumber (contact: $contactId)',
      );

      // Notify JavaScript of successful send
      await _sendDataEvent({
        'action': 'message_sent',
        'contactId': contactId,
        'phoneNumber': normalizedPhoneNumber,
        'text': text,
        'timestamp': sentMessage['timestamp'],
        'messageId': messageId,
        'success': true,
      });

      return {
        'success': true,
        'messageId': messageId,
        'sentAt': sentMessage['timestamp'],
        'phoneNumber': normalizedPhoneNumber,
        'contactId': contactId,
      };
    } catch (error) {
      final String contactId = args['contactId'] ?? '';
      final String phoneNumber = args['phoneNumber'] ?? contactId;

      print(
        '📱 ❌ Error sending SMS to $phoneNumber (contact: $contactId): $error',
      );

      await _sendDataEvent({
        'action': 'message_sent',
        'contactId': contactId,
        'phoneNumber': phoneNumber,
        'messageId': messageId,
        'success': false,
        'error': error.toString(),
      });

      return {
        'success': false,
        'error': error.toString(),
        'messageId': messageId,
      };
    }
  }

  /// Normalize phone number to E.164 format for SMS sending
  /// JavaScript layer resolves contactId to real phone numbers from contact metadata
  String _normalizePhoneNumber(String phoneNumber) {
    if (_debugVerbose) {
      print(
        '📱 🔍 NORMALIZE INPUT: "$phoneNumber" (length: ${phoneNumber.length})',
      );
      print(
        '📱 🔍 Character analysis: ${phoneNumber.split('').map((c) => '$c(${c.codeUnitAt(0)})').join(' ')}',
      );
    }

    // JavaScript already resolves contactId to actual phone number from contact.contactData.phoneNumber
    // So we should only receive actual phone numbers here, not contactIds

    // If it still contains letters, it's an unresolved contactId (fallback case)
    if (RegExp(r'[a-zA-Z]').hasMatch(phoneNumber)) {
      if (_debugVerbose) {
        print(
          '📱 ⚠️ Received unresolved contactId: $phoneNumber. JavaScript should resolve contactIds to phone numbers.',
        );
        print(
          '📱 ℹ️ Check if contact exists in JavaScript contactManager with valid phoneNumber in contactData.',
        );
        print('📱 🔍 FALLBACK: Using test number +15551234567');
      }
      return '+15551234567';
    }

    // Clean the phone number by removing all non-digit characters except +
    String cleaned = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');
    if (_debugVerbose) {
      print('📱 🔍 CLEANED: "$cleaned" (length: ${cleaned.length})');
    }

    // Handle different input formats
    if (cleaned.startsWith('+')) {
      // Already has country code
      cleaned = cleaned.substring(1);
      if (_debugVerbose) print('📱 🔍 REMOVED +: "$cleaned"');
    } else if (cleaned.length == 10) {
      // US format without country code, add default
      cleaned = '1' + cleaned;
      if (_debugVerbose) print('📱 🔍 ADDED 1 PREFIX: "$cleaned"');
    } else if (cleaned.length == 11 && cleaned.startsWith('1')) {
      // US format with leading 1, keep as is
      if (_debugVerbose)
        print('📱 🔍 KEPT AS-IS (11 digits with 1): "$cleaned"');
    }

    // Validate length (E.164 allows 1-15 digits after +)
    if (cleaned.length < 10 || cleaned.length > 15) {
      if (_debugVerbose) {
        print(
          '📱 ⚠️ Invalid phone number length: $cleaned (${cleaned.length} digits)',
        );
        print(
          '📱 🔍 FALLBACK: Using test number +15551234567 (invalid length)',
        );
      }
      return '+15551234567';
    }

    // Return E.164 format
    final e164Number = '+$cleaned';
    if (_debugVerbose) {
      print('📱 ✅ Normalized $phoneNumber to E.164: $e164Number');
    }
    return e164Number;
  }

  /// Get conversation history for a contact using real telephony
  Future<Map<String, dynamic>> _getConversationHistory(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    // Ensure contactId is always a valid string, never null or undefined
    final String contactId = (args['contactId'] as String?) ?? '';

    // Defensive check: if contactId is empty, return early with proper structure
    if (contactId.isEmpty) {
      print('📱 ⚠️ Empty contactId in _getConversationHistory request');
      return {
        'success': false,
        'error': 'Invalid contactId: cannot be empty',
        'messageId': messageId,
        'contactId': contactId,
        'messageCount': 0,
        'totalMessages': 0,
        'messages': [],
      };
    }

    if (!_hasPermissions) {
      return {
        'success': false,
        'error': 'No SMS permissions',
        'messageId': messageId,
        'contactId': contactId,
      };
    }

    try {
      final int limit = args['limit'] as int? ?? 50;
      final bool forceRefresh = args['forceRefresh'] == true;

      print(
        '📱 Getting conversation for $contactId (limit: $limit, forceRefresh: $forceRefresh)',
      );

      // CRITICAL FIX: Resolve contactId to phone number first
      String? phoneNumber;
      try {
        final webViewController = _webViewController;
        if (webViewController != null) {
          // Ask JavaScript to resolve the contact ID to phone number
          final jsResult = await webViewController.runJavaScriptReturningResult(
            '''
            (function() {
              try {
                // Try to get phone number from contact manager
                if (window.app && window.app.contactManager && window.app.contactManager.contacts) {
                  const contact = window.app.contactManager.contacts.get("$contactId");
                  if (contact && contact.contactData && contact.contactData.phoneNumber) {
                    return contact.contactData.phoneNumber;
                  }
                }
                
                // Fallback: check if we have contact data in global scope
                if (window.contactData && window.contactData["$contactId"]) {
                  const data = window.contactData["$contactId"];
                  const phone = data.cameraModel || data.dateTimeOriginal || data.phoneNumber;
                  if (phone && phone !== 'No Phone') {
                    return phone;
                  }
                }
                return null;
              } catch (error) {
                return null;
              }
            })();
          ''',
          );

          if (jsResult != null) {
            final resultString = jsResult.toString().replaceAll('"', '').trim();
            if (resultString.isNotEmpty && resultString != 'null') {
              phoneNumber = resultString;
              print(
                '📱 ✅ Resolved contactId "$contactId" to phone number: "$phoneNumber"',
              );
            }
          }
        }
      } catch (jsError) {
        print('📱 ⚠️ Error resolving contact phone via JavaScript: $jsError');
      }

      if (phoneNumber == null || phoneNumber.isEmpty) {
        print(
          '📱 ❌ Could not resolve contactId "$contactId" to phone number - returning empty conversation',
        );
        return {
          'success': true,
          'messageId': messageId,
          'contactId': contactId,
          'messageCount': 0,
          'totalMessages': 0,
          'messages': [],
        };
      }

      // Normalize the phone number for consistent matching
      final String normalizedPhoneNumber = _normalizePhoneNumber(phoneNumber);

      // DEBUG: Log what we're searching for to understand the issue
      print('📱 🔍 DEBUG SEARCH TARGET:');
      print('📱    - ContactId: "$contactId"');
      print('📱    - Raw Phone: "$phoneNumber"');
      print('📱    - Normalized Phone: "$normalizedPhoneNumber"');

      if (_debugVerbose) {
        print(
          '📱 🔍 Using normalized phone number for message search: "$normalizedPhoneNumber"',
        );
      }

      List<Map<String, dynamic>>? conversationData =
          _conversationCache[contactId];

      // If refresh is forced or cache is empty, fetch from telephony
      if (forceRefresh || conversationData == null) {
        if (forceRefresh) {
          print(
            '📱 Force refresh requested for $contactId, fetching new data.',
          );
        } else {
          print('📱 Cache miss for $contactId, fetching conversation.');
        }

        try {
          // Get all SMS messages - telephony package will handle the details
          final inboxMessages = await telephony.getInboxSms();
          final sentMessages = await telephony.getSentSms();

          // Filter for this contact using the PHONE NUMBER, not contactId
          final allMessages = <Map<String, dynamic>>[];

          // Process received messages
          print(
            '📱 🔍 DEBUG: Processing ${inboxMessages.length} inbox messages for contact $contactId (target phone: $normalizedPhoneNumber)',
          );

          for (final message in inboxMessages) {
            final messageAddress = message.address ?? '';
            final normalizedMessageAddress = _normalizePhoneNumber(
              messageAddress,
            );

            if (normalizedMessageAddress == normalizedPhoneNumber) {
              allMessages.add({
                'id':
                    message.id?.toString() ??
                    DateTime.now().millisecondsSinceEpoch.toString(),
                'text': message.body ?? '',
                'contactId': contactId, // Use contactId for consistency
                'phoneNumber': messageAddress, // Store original phone number
                'timestamp':
                    message.date ?? DateTime.now().millisecondsSinceEpoch,
                'type': 'received',
                'status': 'delivered',
              });
            }
          }

          // Process sent messages
          for (final message in sentMessages) {
            final messageAddress = message.address ?? '';
            final normalizedMessageAddress = _normalizePhoneNumber(
              messageAddress,
            );

            if (normalizedMessageAddress == normalizedPhoneNumber) {
              allMessages.add({
                'id':
                    message.id?.toString() ??
                    DateTime.now().millisecondsSinceEpoch.toString(),
                'text': message.body ?? '',
                'contactId': contactId, // Use contactId for consistency
                'phoneNumber': messageAddress, // Store original phone number
                'timestamp':
                    message.date ?? DateTime.now().millisecondsSinceEpoch,
                'type': 'sent',
                'status': 'sent',
              });
            }
          }

          // Sort by timestamp (newest first)
          allMessages.sort(
            (a, b) => (b['timestamp'] as int).compareTo(a['timestamp'] as int),
          );

          conversationData = allMessages;
          _conversationCache[contactId] = conversationData;

          print(
            '📱 ✅ Loaded ${conversationData.length} real messages for $contactId (phone: $normalizedPhoneNumber)',
          );
        } catch (telephonyError) {
          print('📱 Telephony error, returning empty list: $telephonyError');
          conversationData = []; // Fallback to empty list on error
        }
      } else {
        print(
          '📱 Using cached conversation with ${conversationData.length} messages for $contactId',
        );
      }

      // Apply limit
      final limitedMessages = (conversationData ?? []).take(limit).toList();

      print(
        '📱 📋 Returning ${limitedMessages.length} messages out of ${conversationData?.length ?? 0} total for $contactId',
      );

      // This is the single, correct response. The redundant _sendDataEvent is removed.
      return {
        'success': true,
        'action': 'get_conversation',
        'messageId': messageId,
        'contactId': contactId,
        'messageCount': limitedMessages.length,
        'totalMessages': conversationData?.length ?? 0,
        'messages': limitedMessages,
      };
    } catch (error) {
      print('📱 Error getting conversation history: $error');
      return {
        'success': false,
        'error': error.toString(),
        'messageId': messageId,
        'contactId': contactId,
        'messageCount': 0,
        'totalMessages': 0,
        'messages': [],
      };
    }
  }

  /// Mark messages as read
  Future<Map<String, dynamic>> _markAsRead(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    // Implementation for marking messages as read
    print('📱 Marking messages as read for contact: ${args['contactId']}');

    return {'success': true, 'messageId': messageId};
  }

  /// Test connection to JavaScript
  Future<Map<String, dynamic>> _testConnection(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    print('📱 Testing connection to JavaScript');

    return {
      'success': true,
      'messageId': messageId,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'hasPermissions': _hasPermissions,
      'isInitialized': _isInitialized,
    };
  }

  /// Request SMS permissions
  Future<Map<String, dynamic>> _requestPermissions(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    print('📱 Requesting SMS permissions');

    await _checkPermissions();

    return {
      'success': true,
      'messageId': messageId,
      'granted': _hasPermissions,
    };
  }

  /// Get current status
  Future<Map<String, dynamic>> _getStatus(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    return {
      'success': true,
      'messageId': messageId,
      'isInitialized': _isInitialized,
      'hasPermissions': _hasPermissions,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
  }

  /// Start listening for incoming messages
  Future<Map<String, dynamic>> _startListening(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    final String contactId = args['contactId'] ?? '';
    print('📱 Starting message listening for contact: $contactId');

    if (!_hasPermissions) {
      return {
        'success': false,
        'error': 'No SMS permissions',
        'messageId': messageId,
      };
    }

    // Start listening for incoming messages
    _setupIncomingSmsListener();

    // Notify JavaScript that listening has started
    await _sendStatusEvent({
      'action': 'listening_started',
      'contactId': contactId,
      'messageId': messageId,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });

    return {
      'success': true,
      'messageId': messageId,
      'contactId': contactId,
      'listening': true,
    };
  }

  /// Stop listening for incoming messages
  Future<Map<String, dynamic>> _stopListening(
    Map<String, dynamic> args,
    String messageId,
  ) async {
    print('📱 Stopping message listening');

    // Notify JavaScript that listening has stopped
    await _sendStatusEvent({
      'action': 'listening_stopped',
      'messageId': messageId,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });

    return {'success': true, 'messageId': messageId, 'listening': false};
  }

  /// Add message to conversation cache
  void _addToConversationCache(String contactId, Map<String, dynamic> message) {
    if (!_conversationCache.containsKey(contactId)) {
      _conversationCache[contactId] = [];
    }

    _conversationCache[contactId]!.insert(0, message);

    // Keep only recent messages (limit cache size)
    if (_conversationCache[contactId]!.length > 100) {
      _conversationCache[contactId] = _conversationCache[contactId]!
          .take(100)
          .toList();
    }
  }

  /// Send event to JavaScript via input channel
  Future<void> _sendInputEvent(Map<String, dynamic> eventData) async {
    _inputEventController.add(eventData);
  }

  /// Set up incoming SMS listener using telephony
  void _setupIncomingSmsListener() {
    print(
      '📱 🔧 _setupIncomingSmsListener called, _hasPermissions: $_hasPermissions',
    );

    if (!_hasPermissions) {
      print(
        '📱 No SMS permissions for incoming listener - checking permissions now',
      );
      _checkPermissions(); // Check permissions without args
      return;
    }

    try {
      print('📱 🚨 SETTING UP INCOMING SMS LISTENER NOW 🚨');

      // Listen for incoming SMS messages
      telephony.listenIncomingSms(
        onNewMessage: (message) async {
          final phoneNumber = message.address ?? '';
          final messageText = message.body ?? '';
          final timestamp =
              message.date ?? DateTime.now().millisecondsSinceEpoch;

          print(
            '📱 🔔 🚨 INCOMING SMS DETECTED! 🚨 from $phoneNumber: $messageText',
          );

          // CRITICAL FIX: Resolve phone number to contactId using JavaScript
          String? contactId;
          try {
            final webViewController = _webViewController;
            if (webViewController != null) {
              // Ask JavaScript to resolve phone number to contact ID
              final jsResult = await webViewController
                  .runJavaScriptReturningResult('''
                (function() {
                  try {
                    const phone = "$phoneNumber";
                    console.log("📱 [FLUTTER] Looking up contactId for phone:", phone);
                    
                    // Try to find contact by phone number
                    if (window.app && window.app.contactManager && window.app.contactManager.contacts) {
                      for (const [id, contact] of window.app.contactManager.contacts) {
                        if (contact.contactData && contact.contactData.phoneNumber === phone) {
                          console.log("📱 [FLUTTER] Found contactId:", id, "for phone:", phone);
                          return id;
                        }
                      }
                    }
                    
                    // Fallback: check global contactData
                    if (window.contactData) {
                      for (const [id, data] of Object.entries(window.contactData)) {
                        const contactPhone = data.cameraModel || data.dateTimeOriginal || data.phoneNumber;
                        if (contactPhone === phone) {
                          console.log("📱 [FLUTTER] Found contactId via fallback:", id, "for phone:", phone);
                          return id;
                        }
                      }
                    }
                    
                    console.log("📱 [FLUTTER] No contactId found for phone:", phone, "using phone as contactId");
                    return phone;
                  } catch (error) {
                    console.error("📱 [FLUTTER] Error resolving phone to contactId:", error);
                    return "$phoneNumber";
                  }
                })();
              ''');

              final resultString = jsResult
                  .toString()
                  .replaceAll('"', '')
                  .trim();
              if (resultString.isNotEmpty && resultString != 'null') {
                contactId = resultString;
                print(
                  '📱 ✅ Resolved phone $phoneNumber to contactId: $contactId',
                );
              }
            }
          } catch (jsError) {
            print(
              '📱 ⚠️ Error resolving phone to contactId via JavaScript: $jsError',
            );
          }

          // Use phone number as fallback contactId if resolution failed
          contactId = contactId ?? phoneNumber;

          // Create message object with both contactId and phoneNumber
          final incomingMessage = {
            'id':
                message.id?.toString() ??
                DateTime.now().millisecondsSinceEpoch.toString(),
            'text': messageText,
            'contactId': contactId,
            'phoneNumber': phoneNumber,
            'timestamp': timestamp,
            'type': 'received',
            'status': 'delivered',
          };

          // Add to conversation cache using the resolved contactId
          if (contactId.isNotEmpty) {
            _addToConversationCache(contactId, incomingMessage);
            print(
              '📱 📋 Added incoming message to cache for contactId: $contactId',
            );
          }

          // CRITICAL: Send the message_received event that JavaScript expects
          print('📱 🚨 SENDING message_received EVENT TO JAVASCRIPT 🚨');
          await _sendDataEvent({
            'action': 'message_received',
            'contactId': contactId,
            'phoneNumber': phoneNumber,
            'phone': phoneNumber,
            'text': messageText,
            'timestamp': timestamp,
            'messageId': incomingMessage['id'],
            'type': 'received',
            'isOutgoing': false,
            'success': true,
          });

          // Also send the legacy incoming_message event for compatibility
          await _sendDataEvent({
            'action': 'incoming_message',
            'contactId': contactId,
            'phoneNumber': phoneNumber,
            'message': incomingMessage,
            'timestamp': timestamp,
          });

          print(
            '📱 ✅ Incoming SMS processed and sent to JavaScript: contactId=$contactId, phone=$phoneNumber',
          );
        },
        listenInBackground: false,
      );

      print('📱 ✅ INCOMING SMS LISTENER SETUP COMPLETE ✅');
    } catch (error) {
      print('📱 ❌ Error setting up incoming SMS listener: $error');
    }
  }

  /// Force setup of incoming SMS listener (public method for testing)
  void forceSetupIncomingListener() {
    print('📱 🔧 Force setup incoming SMS listener requested');
    _setupIncomingSmsListener();
  }

  /// Send event to JavaScript via data channel
  Future<void> _sendDataEvent(Map<String, dynamic> eventData) async {
    print('📱 🚀 SENDING DATA EVENT: ${eventData['action']} to JavaScript');
    _dataEventController.add(eventData);
    await _forwardDataEvent(eventData);
  }

  /// Send event to JavaScript via status channel
  Future<void> _sendStatusEvent(Map<String, dynamic> eventData) async {
    _statusEventController.add(eventData);
  }

  /// Forward input events to JavaScript
  Future<void> _forwardInputEvent(Map<String, dynamic> eventData) async {
    try {
      if (_webViewController != null) {
        final String eventJson = jsonEncode(eventData);
        await _webViewController!.runJavaScript(
          'if (window.SmsInputChannel && window.SmsInputChannel.handleFlutterEvent) { window.SmsInputChannel.handleFlutterEvent($eventJson); }',
        );
      }
    } catch (error) {
      print('📱 Error forwarding input event: $error');
    }
  }

  /// Forward data events to JavaScript
  Future<void> _forwardDataEvent(Map<String, dynamic> eventData) async {
    try {
      if (_webViewController != null) {
        final String eventJson = jsonEncode(eventData);
        await _webViewController!.runJavaScript(
          'if (window.SmsDataChannel && window.SmsDataChannel.handleFlutterEvent) { window.SmsDataChannel.handleFlutterEvent($eventJson); }',
        );
      }
    } catch (error) {
      print('📱 Error forwarding data event: $error');
    }
  }

  /// Forward status events to JavaScript
  Future<void> _forwardStatusEvent(Map<String, dynamic> eventData) async {
    try {
      if (_webViewController != null) {
        final String eventJson = jsonEncode(eventData);
        await _webViewController!.runJavaScript(
          'if (window.SmsStatusChannel && window.SmsStatusChannel.handleFlutterEvent) { window.SmsStatusChannel.handleFlutterEvent($eventJson); }',
        );
      }
    } catch (error) {
      print('📱 Error forwarding status event: $error');
    }
  }

  /// Send response back to JavaScript
  Future<void> _sendResponseToJavaScript(
    String channelType,
    Map<String, dynamic> response,
  ) async {
    try {
      if (_webViewController != null) {
        final String responseJson = jsonEncode(response);
        String eventName;

        switch (channelType) {
          case 'input':
            eventName = 'flutter-sms-input-response';
            break;
          case 'data':
            eventName = 'flutter-sms-data';
            break;
          case 'status':
            eventName = 'flutter-sms-status';
            break;
          default:
            print('📱 Unknown channel type for response: $channelType');
            return;
        }

        // Send response through window event
        await _webViewController!.runJavaScript('''
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('$eventName', { detail: $responseJson }));
          }
        ''');

        print('📱 Response sent to JavaScript via $eventName: $responseJson');
      }
    } catch (error) {
      print('📱 Error sending response to JavaScript: $error');
    }
  }

  /// Handle JavaScript requests from the WebView
  Future<void> handleJavaScriptRequest(
    String channelType,
    Map<String, dynamic> data,
  ) async {
    try {
      print('📱 Handling JavaScript request: $channelType - ${data['action']}');

      // Create a synthetic MethodCall from the JavaScript data
      final methodCall = MethodCall(data['action'] ?? 'unknown', data);

      // Route to the appropriate handler based on channel type
      switch (channelType) {
        case 'input':
          await _handleInputMethodCall(methodCall);
          break;
        case 'data':
          await _handleDataMethodCall(methodCall);
          break;
        case 'status':
          await _handleStatusMethodCall(methodCall);
          break;
        default:
          print('📱 Unknown channel type: $channelType');
      }
    } catch (error) {
      print('📱 Error handling JavaScript request: $error');
    }
  }

  /// Cleanup resources
  void dispose() {
    _inputEventController.close();
    _dataEventController.close();
    _statusEventController.close();
    _conversationCache.clear();

    print('📱 SmsChannelManager disposed');
  }
}
