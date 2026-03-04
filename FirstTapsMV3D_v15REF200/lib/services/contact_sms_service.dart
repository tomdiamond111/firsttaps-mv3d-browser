import 'package:flutter/foundation.dart';

/// SMS Service for handling contact-specific messaging
/// Provides functionality to read and send SMS messages for specific contacts
class ContactSMSService {
  /// Initialize the SMS service
  static Future<void> initialize() async {
    if (kDebugMode) {
      print('📱 ContactSMSService: Initializing...');
    }

    // For now, just simulate initialization
    // In future versions, we'll add actual SMS permissions and setup
    await Future.delayed(const Duration(milliseconds: 100));

    if (kDebugMode) {
      print('✅ ContactSMSService initialized successfully (mock mode)');
    }
  }

  /// Check if SMS permissions are granted (mock implementation)
  static Future<bool> checkSMSPermissions() async {
    // For development, always return true
    // In production, this would check actual SMS permissions
    if (kDebugMode) {
      print('📱 SMS permissions check (mock): granted');
    }
    return true;
  }

  /// Request SMS permissions (mock implementation)
  static Future<bool> requestSMSPermissions() async {
    // For development, always return true
    // In production, this would request actual SMS permissions
    if (kDebugMode) {
      print('📱 SMS permission request (mock): granted');
    }
    return true;
  }

  /// Get conversation history for a specific contact
  static Future<List<SMSMessage>> getContactConversation(
    String contactId,
    String phoneNumber,
  ) async {
    try {
      if (kDebugMode) {
        print('📱 Getting conversation for contact: $contactId ($phoneNumber)');
      }

      // For now, return mock data - will implement actual SMS reading later
      return _getMockConversation(contactId, phoneNumber);

      /* Future implementation:
      final result = await _channel.invokeMethod(_methodGetConversation, {
        'contactId': contactId,
        'phoneNumber': phoneNumber,
        'limit': 50, // Last 50 messages
      });
      
      if (result != null && result is List) {
        return result.map((msgData) => SMSMessage.fromMap(msgData)).toList();
      }
      
      return [];
      */
    } catch (e) {
      if (kDebugMode) {
        print('❌ Error getting contact conversation: $e');
      }
      return [];
    }
  }

  /// Send SMS to a specific contact
  static Future<bool> sendSMSToContact(
    String contactId,
    String phoneNumber,
    String message,
  ) async {
    try {
      if (kDebugMode) {
        print('📱 Sending SMS to contact: $contactId');
        print('   Phone: $phoneNumber');
        print('   Message: $message');
      }

      // For now, simulate sending - will implement actual SMS sending later
      await Future.delayed(const Duration(milliseconds: 500));

      if (kDebugMode) {
        print('✅ SMS sent successfully (simulated)');
      }

      return true;

      /* Future implementation:
      final result = await _channel.invokeMethod(_methodSendSMS, {
        'contactId': contactId,
        'phoneNumber': phoneNumber,
        'message': message,
      });
      
      return result == true;
      */
    } catch (e) {
      if (kDebugMode) {
        print('❌ Error sending SMS: $e');
      }
      return false;
    }
  }

  /// Get mock conversation data for testing
  static List<SMSMessage> _getMockConversation(
    String contactId,
    String phoneNumber,
  ) {
    final now = DateTime.now();

    // Generate different mock conversations based on contact ID
    switch (contactId) {
      case 'darcie-diamond':
        return [
          SMSMessage(
            id: '1',
            text: 'Hey! Just testing out this new 3D messaging system 🚀',
            timestamp: now.subtract(const Duration(hours: 3)),
            isOutgoing: true,
            sender: 'me',
            contactId: contactId,
          ),
          SMSMessage(
            id: '2',
            text: 'Whoa that sounds so cool! How does it work?',
            timestamp: now.subtract(const Duration(hours: 2, minutes: 45)),
            isOutgoing: false,
            sender: phoneNumber,
            contactId: contactId,
          ),
          SMSMessage(
            id: '3',
            text:
                'I can see your contact as a 3D avatar and chat with you on a floating screen! 😎',
            timestamp: now.subtract(const Duration(hours: 2, minutes: 30)),
            isOutgoing: true,
            sender: 'me',
            contactId: contactId,
          ),
          SMSMessage(
            id: '4',
            text: 'That is absolutely amazing! The future is here! ✨',
            timestamp: now.subtract(const Duration(hours: 2, minutes: 15)),
            isOutgoing: false,
            sender: phoneNumber,
            contactId: contactId,
          ),
          SMSMessage(
            id: '5',
            text:
                'Want to test it out? I can send you messages from the 3D world!',
            timestamp: now.subtract(const Duration(hours: 1, minutes: 30)),
            isOutgoing: true,
            sender: 'me',
            contactId: contactId,
          ),
          SMSMessage(
            id: '6',
            text: 'Yes! Send me a message, this is so exciting! 🎉',
            timestamp: now.subtract(const Duration(minutes: 45)),
            isOutgoing: false,
            sender: phoneNumber,
            contactId: contactId,
          ),
        ];

      case 'test-contact-001':
        return [
          SMSMessage(
            id: '1',
            text: 'Hey! How are you doing today?',
            timestamp: now.subtract(const Duration(hours: 2)),
            isOutgoing: false,
            sender: phoneNumber,
            contactId: contactId,
          ),
          SMSMessage(
            id: '2',
            text: "I'm doing great! Thanks for asking 😊",
            timestamp: now.subtract(const Duration(hours: 1, minutes: 55)),
            isOutgoing: true,
            sender: 'me',
            contactId: contactId,
          ),
          SMSMessage(
            id: '3',
            text: 'That\'s awesome! Want to grab coffee later?',
            timestamp: now.subtract(const Duration(hours: 1, minutes: 30)),
            isOutgoing: false,
            sender: phoneNumber,
            contactId: contactId,
          ),
          SMSMessage(
            id: '4',
            text: 'Sure! What time works for you?',
            timestamp: now.subtract(const Duration(hours: 1, minutes: 25)),
            isOutgoing: true,
            sender: 'me',
            contactId: contactId,
          ),
          SMSMessage(
            id: '5',
            text: 'How about 3 PM at the usual place?',
            timestamp: now.subtract(const Duration(minutes: 45)),
            isOutgoing: false,
            sender: phoneNumber,
            contactId: contactId,
          ),
        ];

      default:
        return [
          SMSMessage(
            id: '1',
            text: 'Hello from the 3D world!',
            timestamp: now.subtract(const Duration(minutes: 30)),
            isOutgoing: true,
            sender: 'me',
            contactId: contactId,
          ),
        ];
    }
  }

  /// Format phone number for display
  static String formatPhoneNumber(String phoneNumber) {
    // Remove any non-digit characters
    final digitsOnly = phoneNumber.replaceAll(RegExp(r'[^\d]'), '');

    // Format as (XXX) XXX-XXXX for US numbers
    if (digitsOnly.length == 10) {
      return '(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6)}';
    } else if (digitsOnly.length == 11 && digitsOnly.startsWith('1')) {
      return '+1 (${digitsOnly.substring(1, 4)}) ${digitsOnly.substring(4, 7)}-${digitsOnly.substring(7)}';
    }

    // Return original if can't format
    return phoneNumber;
  }

  /// Validate phone number format
  static bool isValidPhoneNumber(String phoneNumber) {
    final digitsOnly = phoneNumber.replaceAll(RegExp(r'[^\d]'), '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 11;
  }
}

/// SMS Message data class
class SMSMessage {
  final String id;
  final String text;
  final DateTime timestamp;
  final bool isOutgoing;
  final String sender;
  final String contactId;
  final SMSStatus status;

  const SMSMessage({
    required this.id,
    required this.text,
    required this.timestamp,
    required this.isOutgoing,
    required this.sender,
    required this.contactId,
    this.status = SMSStatus.delivered,
  });

  /// Create from map (for native platform communication)
  factory SMSMessage.fromMap(Map<String, dynamic> map) {
    return SMSMessage(
      id: map['id']?.toString() ?? '',
      text: map['text']?.toString() ?? '',
      timestamp: DateTime.fromMillisecondsSinceEpoch(map['timestamp'] ?? 0),
      isOutgoing: map['isOutgoing'] == true,
      sender: map['sender']?.toString() ?? '',
      contactId: map['contactId']?.toString() ?? '',
      status: SMSStatus.values.firstWhere(
        (status) => status.name == map['status'],
        orElse: () => SMSStatus.delivered,
      ),
    );
  }

  /// Convert to map (for native platform communication)
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'text': text,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'isOutgoing': isOutgoing,
      'sender': sender,
      'contactId': contactId,
      'status': status.name,
    };
  }

  /// Convert to JSON for WebView
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'isOutgoing': isOutgoing,
      'sender': sender,
      'contactId': contactId,
      'status': status.name,
    };
  }

  @override
  String toString() {
    return 'SMSMessage(id: $id, text: $text, isOutgoing: $isOutgoing, sender: $sender)';
  }
}

/// SMS message status
enum SMSStatus { sending, sent, delivered, read, failed }

/// Contact data class
class ContactData {
  final String id;
  final String name;
  final String phoneNumber;
  final String? avatar;
  final ContactPosition position;

  const ContactData({
    required this.id,
    required this.name,
    required this.phoneNumber,
    this.avatar,
    required this.position,
  });

  /// Convert to JSON for WebView
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phoneNumber': phoneNumber,
      'avatar': avatar,
      'position': position.toJson(),
    };
  }

  @override
  String toString() {
    return 'ContactData(id: $id, name: $name, phone: $phoneNumber)';
  }
}

/// 3D position for contact object
class ContactPosition {
  final double x;
  final double y;
  final double z;

  const ContactPosition({required this.x, required this.y, required this.z});

  Map<String, dynamic> toJson() {
    return {'x': x, 'y': y, 'z': z};
  }

  @override
  String toString() {
    return 'ContactPosition(x: $x, y: $y, z: $z)';
  }
}
