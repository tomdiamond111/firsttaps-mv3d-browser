import 'package:flutter/foundation.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/file_model.dart';
import '../services/contact_sms_service.dart';

/// Service for managing device contacts integration
/// Handles contact permissions, fetching, and conversion to FileModel
class DeviceContactService {
  static const String _contactExtension = '.contact';

  /// Check if contacts permission is granted
  static Future<bool> hasContactsPermission() async {
    try {
      final status = await Permission.contacts.status;
      return status.isGranted;
    } catch (e) {
      if (kDebugMode) {
        print('❌ Error checking contacts permission: $e');
      }
      return false;
    }
  }

  /// Request contacts permission
  static Future<bool> requestContactsPermission() async {
    try {
      final status = await Permission.contacts.request();
      return status.isGranted;
    } catch (e) {
      if (kDebugMode) {
        print('❌ Error requesting contacts permission: $e');
      }
      return false;
    }
  }

  /// Get all contacts with phone numbers
  static Future<List<Contact>> getAllContactsWithPhones() async {
    try {
      // Check permissions first
      if (!await hasContactsPermission()) {
        final granted = await requestContactsPermission();
        if (!granted) {
          if (kDebugMode) {
            print('❌ Contacts permission not granted');
          }
          return [];
        }
      }

      // Get contacts with full properties
      final contacts = await FlutterContacts.getContacts(
        withProperties: true,
        withThumbnail: true,
        withPhoto: false, // We'll use thumbnail for performance
        deduplicateProperties: true,
      );

      // Filter to only contacts with phone numbers
      final contactsWithPhones = contacts.where((contact) {
        return contact.phones.isNotEmpty &&
            contact.phones.any((phone) => phone.number.trim().isNotEmpty);
      }).toList();

      if (kDebugMode) {
        print(
          '📱 Found ${contactsWithPhones.length} contacts with phone numbers',
        );
      }

      return contactsWithPhones;
    } catch (e) {
      if (kDebugMode) {
        print('❌ Error getting contacts: $e');
      }
      return [];
    }
  }

  /// Search contacts by name or phone number
  static Future<List<Contact>> searchContacts(String query) async {
    try {
      if (query.trim().isEmpty) {
        return [];
      }

      // Check permissions first
      if (!await hasContactsPermission()) {
        final granted = await requestContactsPermission();
        if (!granted) {
          if (kDebugMode) {
            print('❌ Contacts permission not granted');
          }
          return [];
        }
      }

      final searchQuery = query.toLowerCase().trim();

      // Get contacts with properties but without thumbnails for speed
      final contacts = await FlutterContacts.getContacts(
        withProperties: true,
        withThumbnail: false, // Load thumbnails later for performance
        withPhoto: false,
      );

      // Filter contacts by search query
      final matchingContacts = contacts.where((contact) {
        // Must have phone numbers
        if (contact.phones.isEmpty) return false;

        // Search in display name
        if (contact.displayName.toLowerCase().contains(searchQuery)) {
          return true;
        }

        // Search in phone numbers (only if query contains digits)
        final queryDigits = searchQuery.replaceAll(RegExp(r'[^0-9]'), '');
        if (queryDigits.isNotEmpty) {
          for (final phone in contact.phones) {
            final phoneDigits = phone.number.replaceAll(RegExp(r'[^0-9]'), '');
            if (phoneDigits.contains(queryDigits)) {
              return true;
            }
          }
        }

        return false;
      }).toList();

      // Load thumbnails only for matching contacts
      final contactsWithThumbnails = <Contact>[];
      for (final contact in matchingContacts) {
        final fullContact = await FlutterContacts.getContact(
          contact.id,
          withThumbnail: true,
        );
        if (fullContact != null) {
          contactsWithThumbnails.add(fullContact);
        }
      }

      if (kDebugMode) {
        print(
          '🔍 Found ${contactsWithThumbnails.length} contacts matching "$query"',
        );
      }

      return contactsWithThumbnails;
    } catch (e) {
      if (kDebugMode) {
        print('❌ Error searching contacts: $e');
      }
      return [];
    }
  }

  /// Convert Contact to FileModel for 3D world integration
  static FileModel contactToFileModel(Contact contact) {
    // Get primary phone number
    final primaryPhone = contact.phones.isNotEmpty
        ? contact.phones.first.number
        : 'No phone';

    // Create display name
    final displayName = contact.displayName.isNotEmpty
        ? contact.displayName
        : 'Unknown Contact';

    // Create unique contact file model
    return FileModel(
      name: '${displayName}$_contactExtension',
      path: 'contact://${contact.id}',
      extension: 'contact',
      type: FileType.other, // We'll handle contacts as special "other" files
      height: 2.5, // Standard contact object height
      // Use mimeType to identify contacts (following link pattern)
      mimeType: 'contact:${contact.id}',

      // Store contact info in available fields
      fileSize: contact.phones.length, // Number of phone numbers
      lastModified: DateTime.now().millisecondsSinceEpoch,
      created: DateTime.now().millisecondsSinceEpoch,

      // Store contact data in EXIF fields (repurposed for contact info)
      cameraMake: displayName, // Contact name
      cameraModel: primaryPhone, // Primary phone number
      dateTimeOriginal: primaryPhone, // Primary phone (backup)
      imageWidth: contact.phones.length, // Phone count
      imageHeight: contact.emails.length, // Email count
      iso: contact.organizations.isNotEmpty
          ? contact.organizations.first.company
          : null,

      // Store thumbnail data if available
      thumbnailDataUrl: contact.thumbnail != null
          ? 'data:image/png;base64,${contact.thumbnail}'
          : null,
    );
  }

  /// Convert FileModel back to ContactData for 3D world
  static ContactData? fileModelToContactData(FileModel fileModel) {
    if (!fileModel.name.endsWith(_contactExtension) ||
        fileModel.mimeType == null ||
        !fileModel.mimeType!.startsWith('contact:')) {
      return null;
    }

    final contactId = fileModel.mimeType!.substring('contact:'.length);

    return ContactData(
      id: contactId,
      name:
          fileModel.cameraMake ??
          fileModel.name.replaceAll(_contactExtension, ''),
      phoneNumber: fileModel.cameraModel ?? 'Unknown',
      avatar: fileModel.thumbnailDataUrl,
      position: const ContactPosition(
        x: 0,
        y: 0,
        z: 0,
      ), // Position will be set by 3D world
    );
  }

  /// Check if a FileModel represents a contact
  static bool isContactFile(FileModel fileModel) {
    return fileModel.name.endsWith(_contactExtension) &&
        fileModel.mimeType != null &&
        fileModel.mimeType!.startsWith('contact:');
  }

  /// Get contact display info for UI
  static String getContactDisplayInfo(FileModel contactFile) {
    if (!isContactFile(contactFile)) return 'Invalid Contact';

    final name = contactFile.cameraMake ?? 'Unknown';
    final phone = contactFile.cameraModel ?? 'No phone';

    return '$name\n$phone';
  }
}
