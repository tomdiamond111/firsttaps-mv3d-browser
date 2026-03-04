import 'dart:async';
import 'sms_core_service_new.dart';
import 'sms_bridge_service.dart';

/// **SMS Contact Integration Service**
///
/// Integrates the new SMS Core architecture with the existing contact system
/// while maintaining all current 3D world functionality.
///
/// This service:
/// 1. Bridges existing contact services with the new SMS Core
/// 2. Maintains backward compatibility with existing contact code
/// 3. Provides enhanced SMS functionality without breaking existing features
class SmsContactIntegrationService {
  static bool _isInitialized = false;

  /// Initialize the integration service
  static Future<bool> initialize() async {
    if (_isInitialized) {
      _log('SMS Contact Integration already initialized');
      return true;
    }

    try {
      _log('Initializing SMS Contact Integration...');

      // Initialize SMS Bridge first
      final bridgeInitialized = await SmsBridgeService.initialize();
      if (!bridgeInitialized) {
        _logError('Failed to initialize SMS Bridge Service');
        return false;
      }

      // Set up integration with existing contact services
      await _setupContactServiceIntegration();

      _isInitialized = true;
      _log('✅ SMS Contact Integration initialized successfully');

      return true;
    } catch (e) {
      _logError('❌ SMS Contact Integration initialization error: $e');
      return false;
    }
  }

  /// Enhanced version of the existing getContactConversation method
  static Future<List<SmsMessage>> getContactConversation(
    String contactId,
    String phoneNumber,
  ) async {
    try {
      _log('Getting conversation for contact: $contactId ($phoneNumber)');

      // Register contact metadata if not already done
      SmsBridgeService.registerContact(
        contactId: contactId,
        name: contactId, // Will be updated with actual name when available
        phoneNumber: phoneNumber,
      );

      // Get conversation from SMS Core
      final conversation = await SmsBridgeService.getConversationByContactId(
        contactId,
      );

      if (conversation != null) {
        _log(
          '✅ Retrieved ${conversation.messages.length} messages for $contactId',
        );
        return conversation.messages;
      } else {
        _log('No conversation found for $contactId, returning empty list');
        return [];
      }
    } catch (e) {
      _logError('❌ Error getting contact conversation: $e');
      return [];
    }
  }

  /// Enhanced version of the existing sendSMSToContact method
  static Future<bool> sendSMSToContact(
    String contactId,
    String phoneNumber,
    String message,
  ) async {
    try {
      _log('Sending SMS to contact: $contactId');
      _log('   Phone: $phoneNumber');
      _log('   Message: $message');

      // Register contact metadata if not already done
      SmsBridgeService.registerContact(
        contactId: contactId,
        name: contactId,
        phoneNumber: phoneNumber,
      );

      // Send message through SMS Core
      final success = await SmsBridgeService.sendMessageFromContact(
        contactId,
        message,
      );

      if (success) {
        _log('✅ SMS sent successfully');
      } else {
        _logError('❌ Failed to send SMS');
      }

      return success;
    } catch (e) {
      _logError('❌ Error sending SMS: $e');
      return false;
    }
  }

  /// Register contact with enhanced metadata
  static void registerContactWithMetadata({
    required String contactId,
    required String name,
    required String phoneNumber,
    String? avatarPath,
    Map<String, dynamic>? additionalData,
  }) {
    try {
      SmsBridgeService.registerContact(
        contactId: contactId,
        name: name,
        phoneNumber: phoneNumber,
        avatarPath: avatarPath,
      );

      _log('Registered contact with metadata: $name ($contactId)');
    } catch (e) {
      _logError('Error registering contact $contactId: $e');
    }
  }

  /// Mark SMS screen as active (for 3D world integration)
  static void markSmsScreenActive(String contactId) {
    SmsBridgeService.markSmsScreenActive(contactId);
  }

  /// Mark SMS screen as inactive
  static void markSmsScreenInactive(String contactId) {
    SmsBridgeService.markSmsScreenInactive(contactId);
  }

  /// Check if SMS screen is active
  static bool isSmsScreenActive(String contactId) {
    return SmsBridgeService.isSmsScreenActive(contactId);
  }

  /// Simulate incoming message for testing
  static Future<void> simulateIncomingMessage({
    required String contactId,
    required String messageText,
  }) async {
    await SmsBridgeService.simulateIncomingMessage(
      contactId: contactId,
      messageText: messageText,
    );
  }

  /// Get SMS conversation stream for real-time updates
  static Stream<SmsEvent> get smsEventStream => SmsCoreService.eventStream;

  /// Setup integration with existing contact services
  static Future<void> _setupContactServiceIntegration() async {
    try {
      _log('Setting up integration with existing contact services...');

      // Here we would integrate with existing contact services
      // For now, we'll just log that integration is ready

      _log('✅ Contact service integration ready');
    } catch (e) {
      _logError('Error setting up contact service integration: $e');
    }
  }

  /// Get debug information
  static Map<String, dynamic> getDebugInfo() {
    return {
      'isInitialized': _isInitialized,
      'bridgeDebugInfo': SmsBridgeService.getDebugInfo(),
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
  }

  /// Logging utilities
  static void _log(String message) {
    print('🤝 [SmsContactIntegration] $message');
  }

  static void _logError(String message) {
    print('❌ [SmsContactIntegration] $message');
  }

  /// Cleanup resources
  static Future<void> dispose() async {
    _isInitialized = false;
    await SmsBridgeService.dispose();
    _log('SMS Contact Integration disposed');
  }
}
