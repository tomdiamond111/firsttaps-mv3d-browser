import 'dart:async';
import 'dart:convert';
import 'sms_core_service_new.dart';

/// **SMS Bridge Service**
///
/// Bridges the isolated SMS Core with the 3D contact objects.
/// Maintains the 3D world interaction patterns while providing
/// robust, isolated SMS data management.
///
/// **Responsibilities:**
/// 1. Connect contact objects to phone numbers
/// 2. Forward SMS events to appropriate 3D screens
/// 3. Handle contact object lifecycle events
/// 4. Provide fallback mechanisms when contact objects are unavailable
class SmsBridgeService {
  // Bridge state
  static bool _isInitialized = false;
  static StreamSubscription<SmsEvent>? _smsEventSubscription;

  // Contact mappings (contactId -> phoneNumber)
  static final Map<String, String> _contactToPhone = {};
  static final Map<String, String> _phoneToContact = {};

  // Active SMS screens tracking
  static final Set<String> _activeSmsScreens = {};

  /// Initialize the SMS Bridge
  static Future<bool> initialize() async {
    if (_isInitialized) {
      _log('SMS Bridge already initialized');
      return true;
    }

    try {
      _log('Initializing SMS Bridge Service...');

      // Initialize SMS Core first
      final coreInitialized = await SmsCoreService.initialize();
      if (!coreInitialized) {
        _logError('Failed to initialize SMS Core');
        return false;
      }

      // Listen to SMS Core events
      _smsEventSubscription = SmsCoreService.eventStream.listen(
        _handleSmsEvent,
      );

      _isInitialized = true;
      _log('✅ SMS Bridge Service initialized successfully');

      return true;
    } catch (e) {
      _logError('❌ SMS Bridge initialization error: $e');
      return false;
    }
  }

  /// Register a contact with the bridge
  static void registerContact({
    required String contactId,
    required String name,
    required String phoneNumber,
    String? avatarPath,
  }) {
    try {
      final normalizedPhone = _normalizePhoneNumber(phoneNumber);

      // Register with SMS Core
      SmsCoreService.registerContactMetadata(
        normalizedPhone,
        ContactMetadata(
          contactId: contactId,
          name: name,
          phoneNumber: normalizedPhone,
          avatarPath: avatarPath,
        ),
      );

      // Update bridge mappings
      _contactToPhone[contactId] = normalizedPhone;
      _phoneToContact[normalizedPhone] = contactId;

      _log('Registered contact: $name ($contactId) -> $normalizedPhone');
    } catch (e) {
      _logError('Error registering contact $contactId: $e');
    }
  }

  /// Get conversation for a contact ID
  static Future<SmsConversation?> getConversationByContactId(
    String contactId,
  ) async {
    try {
      final phoneNumber = _contactToPhone[contactId];
      if (phoneNumber == null) {
        _logError('No phone number found for contact: $contactId');
        return null;
      }

      return await SmsCoreService.getConversationByPhone(phoneNumber);
    } catch (e) {
      _logError('Error getting conversation for contact $contactId: $e');
      return null;
    }
  }

  /// Send message from contact
  static Future<bool> sendMessageFromContact(
    String contactId,
    String messageText,
  ) async {
    try {
      final phoneNumber = _contactToPhone[contactId];
      if (phoneNumber == null) {
        _logError('No phone number found for contact: $contactId');
        return false;
      }

      final success = await SmsCoreService.sendMessage(
        phoneNumber,
        messageText,
      );

      if (success) {
        _log('✅ Message sent from contact $contactId');
      }

      return success;
    } catch (e) {
      _logError('Error sending message from contact $contactId: $e');
      return false;
    }
  }

  /// Mark SMS screen as active (for 3D world integration)
  static void markSmsScreenActive(String contactId) {
    _activeSmsScreens.add(contactId);
    _log('SMS screen activated for contact: $contactId');
  }

  /// Mark SMS screen as inactive
  static void markSmsScreenInactive(String contactId) {
    _activeSmsScreens.remove(contactId);
    _log('SMS screen deactivated for contact: $contactId');
  }

  /// Check if SMS screen is active
  static bool isSmsScreenActive(String contactId) {
    return _activeSmsScreens.contains(contactId);
  }

  /// Get all active SMS screen contact IDs
  static Set<String> getActiveSmsScreens() {
    return Set.from(_activeSmsScreens);
  }

  /// Simulate incoming message for testing
  static Future<void> simulateIncomingMessage({
    required String contactId,
    required String messageText,
  }) async {
    try {
      final phoneNumber = _contactToPhone[contactId];
      if (phoneNumber == null) {
        _logError(
          'Cannot simulate message: No phone number for contact $contactId',
        );
        return;
      }

      await SmsCoreService.simulateIncomingMessage(phoneNumber, messageText);
      _log('📥 Simulated incoming message for contact $contactId');
    } catch (e) {
      _logError('Error simulating incoming message for $contactId: $e');
    }
  }

  /// Handle SMS events from Core and forward to 3D world
  static void _handleSmsEvent(SmsEvent event) {
    try {
      final contactId = _phoneToContact[event.phoneNumber];

      if (contactId == null) {
        _log('SMS event for unregistered phone: ${event.phoneNumber}');
        return;
      }

      _log('📱 SMS Event: ${event.type} for contact $contactId');

      switch (event.type) {
        case SmsEventType.messageReceived:
          _handleIncomingMessage(contactId, event);
          break;

        case SmsEventType.messageSent:
          _handleSentMessage(contactId, event);
          break;

        case SmsEventType.conversationUpdate:
          _handleConversationUpdate(contactId, event);
          break;

        case SmsEventType.messageStatusUpdate:
          _handleMessageStatusUpdate(contactId, event);
          break;
      }
    } catch (e) {
      _logError('Error handling SMS event: $e');
    }
  }

  /// Handle incoming message event
  static void _handleIncomingMessage(String contactId, SmsEvent event) {
    _log(
      '📥 Incoming message for contact $contactId: "${event.message?.text}"',
    );

    // Send to JavaScript bridge for 3D world integration
    _sendToJavaScript({
      'type': 'sms_message_received',
      'contactId': contactId,
      'phoneNumber': event.phoneNumber,
      'message': event.message?.toMap(),
      'timestamp': event.timestamp.millisecondsSinceEpoch,
    });

    // If SMS screen is active, also send immediate update
    if (_activeSmsScreens.contains(contactId)) {
      _sendToJavaScript({
        'type': 'sms_screen_update',
        'contactId': contactId,
        'action': 'new_message',
        'message': event.message?.toMap(),
      });
    }
  }

  /// Handle sent message event
  static void _handleSentMessage(String contactId, SmsEvent event) {
    _log('📤 Sent message for contact $contactId: "${event.message?.text}"');

    _sendToJavaScript({
      'type': 'sms_message_sent',
      'contactId': contactId,
      'phoneNumber': event.phoneNumber,
      'message': event.message?.toMap(),
      'timestamp': event.timestamp.millisecondsSinceEpoch,
    });

    // If SMS screen is active, send immediate update
    if (_activeSmsScreens.contains(contactId)) {
      _sendToJavaScript({
        'type': 'sms_screen_update',
        'contactId': contactId,
        'action': 'message_sent',
        'message': event.message?.toMap(),
      });
    }
  }

  /// Handle conversation update event
  static void _handleConversationUpdate(String contactId, SmsEvent event) {
    _log('🔄 Conversation update for contact $contactId');

    _sendToJavaScript({
      'type': 'sms_conversation_update',
      'contactId': contactId,
      'phoneNumber': event.phoneNumber,
      'conversation': {
        'phoneNumber': event.conversation?.phoneNumber,
        'messages': event.conversation?.messages.map((m) => m.toMap()).toList(),
        'lastUpdate': event.conversation?.lastUpdate.millisecondsSinceEpoch,
      },
      'timestamp': event.timestamp.millisecondsSinceEpoch,
    });
  }

  /// Handle message status update event
  static void _handleMessageStatusUpdate(String contactId, SmsEvent event) {
    _log('📊 Message status update for contact $contactId');

    _sendToJavaScript({
      'type': 'sms_message_status_update',
      'contactId': contactId,
      'phoneNumber': event.phoneNumber,
      'message': event.message?.toMap(),
      'timestamp': event.timestamp.millisecondsSinceEpoch,
    });
  }

  /// Send data to JavaScript bridge (placeholder - will be implemented with actual bridge)
  static void _sendToJavaScript(Map<String, dynamic> data) {
    // This will be implemented with the actual Flutter-JavaScript bridge
    final jsonData = jsonEncode(data);
    _log('📨 Sending to JavaScript: ${data['type']} for ${data['contactId']}');

    // For now, just log the data structure
    print('JS_BRIDGE_DATA: $jsonData');
  }

  /// Normalize phone number
  static String _normalizePhoneNumber(String phoneNumber) {
    // Remove all non-digit characters
    final digitsOnly = phoneNumber.replaceAll(RegExp(r'[^\d]'), '');

    // For US numbers, ensure consistent formatting
    if (digitsOnly.length == 10) {
      return '+1$digitsOnly';
    } else if (digitsOnly.length == 11 && digitsOnly.startsWith('1')) {
      return '+$digitsOnly';
    } else {
      return digitsOnly.isEmpty ? phoneNumber : '+$digitsOnly';
    }
  }

  /// Get contact mapping info (for debugging)
  static Map<String, dynamic> getDebugInfo() {
    return {
      'isInitialized': _isInitialized,
      'registeredContacts': _contactToPhone.length,
      'activeSmsScreens': _activeSmsScreens.length,
      'contactMappings': Map.from(_contactToPhone),
      'activeSmsScreenIds': List.from(_activeSmsScreens),
    };
  }

  /// Logging utilities
  static void _log(String message) {
    print('🌉 [SmsBridge] $message');
  }

  static void _logError(String message) {
    print('❌ [SmsBridge] $message');
  }

  /// Cleanup resources
  static Future<void> dispose() async {
    _smsEventSubscription?.cancel();
    _smsEventSubscription = null;

    _contactToPhone.clear();
    _phoneToContact.clear();
    _activeSmsScreens.clear();

    _isInitialized = false;

    await SmsCoreService.dispose();

    _log('SMS Bridge Service disposed');
  }
}
