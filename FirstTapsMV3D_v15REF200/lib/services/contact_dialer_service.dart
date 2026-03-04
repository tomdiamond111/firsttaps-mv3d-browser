import 'package:flutter/services.dart';
import 'package:another_telephony/telephony.dart';

/// Service for handling contact dialing functionality
/// Provides methods to initiate phone calls through the native dialer
class ContactDialerService {
  static const String _channelName = 'contact_dialer_channel';
  static const MethodChannel _channel = MethodChannel(_channelName);
  static final Telephony _telephony = Telephony.instance;

  /// Initialize the contact dialer service and set up method call handlers
  static Future<void> initialize() async {
    _channel.setMethodCallHandler(_handleMethodCall);
    print('📞 ContactDialerService initialized');
  }

  /// Handle method calls from JavaScript
  static Future<dynamic> _handleMethodCall(MethodCall call) async {
    try {
      switch (call.method) {
        case 'dialContact':
          return await _dialContact(call.arguments);
        case 'canDialContacts':
          return await _canDialContacts();
        default:
          throw PlatformException(
            code: 'UNIMPLEMENTED',
            message: 'Method ${call.method} not implemented',
          );
      }
    } catch (e) {
      print('📞 Error handling method call ${call.method}: $e');
      rethrow;
    }
  }

  /// Dial a contact using the native phone dialer
  /// [arguments] should contain a Map with 'phoneNumber', 'contactName', and optionally 'contactId'
  static Future<bool> _dialContact(dynamic arguments) async {
    try {
      if (arguments is! Map) {
        throw ArgumentError('dialContact arguments must be a Map');
      }

      final String? phoneNumber = arguments['phoneNumber'] as String?;
      final String? contactName = arguments['contactName'] as String?;
      final String? contactId = arguments['contactId'] as String?;

      if (phoneNumber == null || phoneNumber.isEmpty) {
        throw ArgumentError('Phone number is required');
      }

      // Clean the phone number (remove non-digit characters except +)
      final cleanedNumber = _cleanPhoneNumber(phoneNumber);

      print('📞 Attempting to dial contact:');
      print('📞   Name: $contactName');
      print('📞   Phone: $phoneNumber');
      print('📞   Cleaned: $cleanedNumber');
      print('📞   Contact ID: $contactId');

      // Use another_telephony to open the native dialer with the phone number pre-populated
      try {
        // According to the documentation, this should open the dialer with the number
        await _telephony.openDialer(cleanedNumber);
        print('📞 ✅ Successfully opened native dialer for $contactName');
        return true;
      } catch (e) {
        print('📞 ❌ Failed to open native dialer: $e');
        return false;
      }
    } catch (e) {
      print('📞 Error dialing contact: $e');
      return false;
    }
  }

  /// Check if the device can dial contacts
  static Future<bool> _canDialContacts() async {
    try {
      // For another_telephony, we can assume dialing is supported on mobile devices
      // The openDialer method will handle any platform-specific limitations
      return true;
    } catch (e) {
      print('📞 Error checking dial capability: $e');
      return false;
    }
  }

  /// Clean phone number for dialing
  /// Removes formatting characters but preserves + for international numbers
  static String _cleanPhoneNumber(String phoneNumber) {
    // Remove spaces, dashes, parentheses, and dots
    String cleaned = phoneNumber.replaceAll(RegExp(r'[\s\-\(\)\.]'), '');

    // Keep only digits and + sign
    cleaned = cleaned.replaceAll(RegExp(r'[^\d\+]'), '');

    return cleaned;
  }

  /// Public method for manual dialing (can be called from other Dart code)
  static Future<bool> dialContact({
    required String phoneNumber,
    String? contactName,
    String? contactId,
  }) async {
    return await _dialContact({
      'phoneNumber': phoneNumber,
      'contactName': contactName,
      'contactId': contactId,
    });
  }

  /// Public method to check dial capability (can be called from other Dart code)
  static Future<bool> canDialContacts() async {
    return await _canDialContacts();
  }
}
