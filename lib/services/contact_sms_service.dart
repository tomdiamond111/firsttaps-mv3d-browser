/// Stub for contact_sms_service (browser version)
/// SMS and contact functionality not available on web

import 'dart:async';

class ContactSmsService {
  static Future<List<ContactData>> getContacts() async {
    // No contacts on web
    return [];
  }

  static Future<void> sendSms(String phoneNumber, String message) async {
    // No-op for web
    print('SMS not supported on web: $phoneNumber - $message');
  }

  static Future<List<Map<String, dynamic>>> getRecentSms() async {
    // No SMS on web
    return [];
  }
}

/// Contact data model (copied from mobile app)
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

/// 3D position for contact object (copied from mobile app)
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
