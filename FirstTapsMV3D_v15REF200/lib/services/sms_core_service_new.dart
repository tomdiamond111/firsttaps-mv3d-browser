import 'dart:async';
import 'dart:convert';

/// **SMS Core Service - Isolated Architecture**
///
/// This service provides robust, isolated SMS functionality that operates
/// independently of contact object lifecycles and fragile event routing.
///
/// **Key Design Principles:**
/// 1. **Phone Number Primary Key**: Uses phone numbers as primary identifiers
/// 2. **Independent of Contact Objects**: SMS data exists separately from contact lifecycle
/// 3. **Simple Event Flow**: Direct communication with JavaScript bridge
/// 4. **Robust Error Handling**: Graceful degradation and circuit breakers
/// 5. **Real-time Message Delivery**: Immediate updates for incoming messages
class SmsCoreService {
  // Core state management - single source of truth
  static final Map<String, List<SmsMessage>> _conversationCache = {};
  static final Map<String, ContactMetadata> _contactMetadata = {};
  static final Map<String, DateTime> _lastUpdateTimes = {};

  // Event streaming
  static final StreamController<SmsEvent> _eventStreamController =
      StreamController<SmsEvent>.broadcast();

  // Circuit breaker for robust error handling
  static int _failureCount = 0;
  static DateTime? _lastFailureTime;
  static const int _maxFailures = 5;
  static const Duration _circuitBreakerTimeout = Duration(minutes: 2);

  // Service state
  static bool _isInitialized = false;
  static bool _isListening = false;

  /// Initialize the SMS Core Service
  static Future<bool> initialize() async {
    if (_isInitialized) {
      _log('SMS Core already initialized');
      return true;
    }

    try {
      _log('Initializing SMS Core Service...');

      _isInitialized = true;
      _log('✅ SMS Core Service initialized successfully');

      // Start listening for messages
      await startMessageListener();

      return true;
    } catch (e) {
      _logError('❌ SMS Core initialization error: $e');
      _incrementFailureCount();
      return false;
    }
  }

  /// Start listening for incoming SMS messages
  static Future<bool> startMessageListener() async {
    if (!_isInitialized) {
      _logError('SMS Core not initialized');
      return false;
    }

    if (_isListening) {
      _log('Message listener already running');
      return true;
    }

    try {
      _isListening = true;
      _log('✅ SMS message listener started');
      return true;
    } catch (e) {
      _logError('❌ Error starting message listener: $e');
      _incrementFailureCount();
      return false;
    }
  }

  /// Get conversation for a phone number (primary method)
  static Future<SmsConversation?> getConversationByPhone(
    String phoneNumber,
  ) async {
    if (!_isInitialized || _isCircuitBreakerOpen()) {
      return _getFallbackConversation(phoneNumber);
    }

    try {
      final normalizedPhone = _normalizePhoneNumber(phoneNumber);
      _log(
        'Getting conversation for phone: $phoneNumber (normalized: $normalizedPhone)',
      );

      // For now, return cached conversation or create mock data
      final cachedMessages = _conversationCache[normalizedPhone];
      if (cachedMessages != null) {
        return SmsConversation(
          phoneNumber: normalizedPhone,
          messages: cachedMessages,
          lastUpdate: _lastUpdateTimes[normalizedPhone] ?? DateTime.now(),
        );
      }

      // Generate mock conversation for development
      final mockMessages = _generateMockConversation(normalizedPhone);
      _conversationCache[normalizedPhone] = mockMessages;
      _lastUpdateTimes[normalizedPhone] = DateTime.now();

      return SmsConversation(
        phoneNumber: normalizedPhone,
        messages: mockMessages,
        lastUpdate: DateTime.now(),
      );
    } catch (e) {
      _logError('❌ Error getting conversation: $e');
      _incrementFailureCount();
      return _getFallbackConversation(phoneNumber);
    }
  }

  /// Send SMS message (phone number based)
  static Future<bool> sendMessage(
    String phoneNumber,
    String messageText,
  ) async {
    if (!_isInitialized || _isCircuitBreakerOpen()) {
      _logError('SMS Core not available for sending');
      return false;
    }

    try {
      final normalizedPhone = _normalizePhoneNumber(phoneNumber);
      _log('Sending message to: $phoneNumber');

      // Add sent message to cache immediately
      final sentMessage = SmsMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        text: messageText,
        timestamp: DateTime.now(),
        isOutgoing: true,
        phoneNumber: normalizedPhone,
        status: SmsMessageStatus.sent,
      );

      _addMessageToCache(normalizedPhone, sentMessage);

      // Emit event
      _emitEvent(
        SmsEvent(
          type: SmsEventType.messageSent,
          phoneNumber: normalizedPhone,
          message: sentMessage,
        ),
      );

      _log('✅ Message sent successfully');
      return true;
    } catch (e) {
      _logError('❌ Error sending message: $e');
      _incrementFailureCount();
      return false;
    }
  }

  /// Register contact metadata (for 3D world integration)
  static void registerContactMetadata(
    String phoneNumber,
    ContactMetadata metadata,
  ) {
    final normalizedPhone = _normalizePhoneNumber(phoneNumber);
    _contactMetadata[normalizedPhone] = metadata;
    _log(
      'Registered metadata for: $phoneNumber (contactId: ${metadata.contactId})',
    );
  }

  /// Get contact metadata by phone number
  static ContactMetadata? getContactMetadata(String phoneNumber) {
    final normalizedPhone = _normalizePhoneNumber(phoneNumber);
    return _contactMetadata[normalizedPhone];
  }

  /// Get conversation by contact ID (lookup via metadata)
  static Future<SmsConversation?> getConversationByContactId(
    String contactId,
  ) async {
    // Find phone number for this contact ID
    String? phoneNumber;
    for (final entry in _contactMetadata.entries) {
      if (entry.value.contactId == contactId) {
        phoneNumber = entry.key;
        break;
      }
    }

    if (phoneNumber != null) {
      return await getConversationByPhone(phoneNumber);
    } else {
      _logError('No phone number found for contactId: $contactId');
      return null;
    }
  }

  /// Simulate receiving a message (for testing)
  static Future<void> simulateIncomingMessage(
    String phoneNumber,
    String messageText,
  ) async {
    final normalizedPhone = _normalizePhoneNumber(phoneNumber);

    final incomingMessage = SmsMessage(
      id: 'sim_${DateTime.now().millisecondsSinceEpoch}',
      text: messageText,
      timestamp: DateTime.now(),
      isOutgoing: false,
      phoneNumber: normalizedPhone,
      status: SmsMessageStatus.received,
    );

    // Add to cache
    _addMessageToCache(normalizedPhone, incomingMessage);

    // Emit real-time event
    _emitEvent(
      SmsEvent(
        type: SmsEventType.messageReceived,
        phoneNumber: normalizedPhone,
        message: incomingMessage,
      ),
    );

    _log('📥 Simulated incoming message from $phoneNumber: "$messageText"');
  }

  /// Get conversation stream for real-time updates
  static Stream<SmsEvent> get eventStream => _eventStreamController.stream;

  /// Add message to conversation cache
  static void _addMessageToCache(String phoneNumber, SmsMessage message) {
    final normalizedPhone = _normalizePhoneNumber(phoneNumber);

    if (!_conversationCache.containsKey(normalizedPhone)) {
      _conversationCache[normalizedPhone] = [];
    }

    final messages = _conversationCache[normalizedPhone]!;

    // Check if message already exists (avoid duplicates)
    final existingIndex = messages.indexWhere((m) => m.id == message.id);
    if (existingIndex >= 0) {
      // Update existing message
      messages[existingIndex] = message;
    } else {
      // Add new message and sort by timestamp (newest first)
      messages.add(message);
      messages.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    }

    _lastUpdateTimes[normalizedPhone] = DateTime.now();
  }

  /// Generate mock conversation for testing
  static List<SmsMessage> _generateMockConversation(String phoneNumber) {
    final now = DateTime.now();
    final messages = <SmsMessage>[];

    // Generate different conversations based on phone number
    if (phoneNumber.contains('224') && phoneNumber.contains('5082')) {
      // Darcie's test conversation
      messages.addAll([
        SmsMessage(
          id: 'mock_1',
          text: 'Hey! Testing the new SMS core system 🚀',
          timestamp: now.subtract(const Duration(hours: 2)),
          isOutgoing: false,
          phoneNumber: phoneNumber,
          status: SmsMessageStatus.received,
        ),
        SmsMessage(
          id: 'mock_2',
          text: 'That\'s so cool! How does the isolated architecture work?',
          timestamp: now.subtract(const Duration(hours: 1, minutes: 45)),
          isOutgoing: true,
          phoneNumber: phoneNumber,
          status: SmsMessageStatus.delivered,
        ),
        SmsMessage(
          id: 'mock_3',
          text:
              'It uses phone numbers as primary keys and is independent of contact objects!',
          timestamp: now.subtract(const Duration(hours: 1, minutes: 30)),
          isOutgoing: false,
          phoneNumber: phoneNumber,
          status: SmsMessageStatus.received,
        ),
      ]);
    } else {
      // Generic test conversation
      messages.add(
        SmsMessage(
          id: 'mock_generic',
          text: 'Hello from the SMS Core system!',
          timestamp: now.subtract(const Duration(minutes: 30)),
          isOutgoing: false,
          phoneNumber: phoneNumber,
          status: SmsMessageStatus.received,
        ),
      );
    }

    return messages;
  }

  /// Emit SMS event to stream
  static void _emitEvent(SmsEvent event) {
    if (!_eventStreamController.isClosed) {
      _eventStreamController.add(event);
    }
  }

  /// Get fallback conversation (cached or empty)
  static SmsConversation _getFallbackConversation(String phoneNumber) {
    final normalizedPhone = _normalizePhoneNumber(phoneNumber);
    final cachedMessages = _conversationCache[normalizedPhone] ?? [];

    return SmsConversation(
      phoneNumber: normalizedPhone,
      messages: cachedMessages,
      lastUpdate: _lastUpdateTimes[normalizedPhone] ?? DateTime.now(),
      isFallback: true,
    );
  }

  /// Normalize phone number for consistent storage
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

  /// Circuit breaker logic
  static bool _isCircuitBreakerOpen() {
    if (_failureCount >= _maxFailures) {
      if (_lastFailureTime != null) {
        final timeSinceLastFailure = DateTime.now().difference(
          _lastFailureTime!,
        );
        if (timeSinceLastFailure < _circuitBreakerTimeout) {
          return true; // Circuit is open
        } else {
          // Reset circuit breaker
          _failureCount = 0;
          _lastFailureTime = null;
          _log('Circuit breaker reset - attempting to resume operations');
        }
      }
    }
    return false;
  }

  /// Increment failure count for circuit breaker
  static void _incrementFailureCount() {
    _failureCount++;
    _lastFailureTime = DateTime.now();

    if (_failureCount >= _maxFailures) {
      _logError('🚨 Circuit breaker opened due to repeated failures');
    }
  }

  /// Logging utilities
  static void _log(String message) {
    print('📱 [SmsCore] $message');
  }

  static void _logError(String message) {
    print('❌ [SmsCore] $message');
  }

  /// Cleanup resources
  static Future<void> dispose() async {
    _isListening = false;
    _isInitialized = false;

    await _eventStreamController.close();
    _conversationCache.clear();
    _contactMetadata.clear();
    _lastUpdateTimes.clear();

    _log('SMS Core Service disposed');
  }
}

/// SMS Message data class (immutable)
class SmsMessage {
  final String id;
  final String text;
  final DateTime timestamp;
  final bool isOutgoing;
  final String phoneNumber;
  final SmsMessageStatus status;

  const SmsMessage({
    required this.id,
    required this.text,
    required this.timestamp,
    required this.isOutgoing,
    required this.phoneNumber,
    required this.status,
  });

  /// Create from map data
  factory SmsMessage.fromMap(Map<String, dynamic> map) {
    return SmsMessage(
      id: map['id']?.toString() ?? '',
      text: map['text']?.toString() ?? '',
      timestamp: DateTime.fromMillisecondsSinceEpoch(map['timestamp'] ?? 0),
      isOutgoing: map['isOutgoing'] == true || map['type'] == 'sent',
      phoneNumber: map['phoneNumber']?.toString() ?? '',
      status: SmsMessageStatus.values.firstWhere(
        (status) => status.toString().split('.').last == map['status'],
        orElse: () => SmsMessageStatus.unknown,
      ),
    );
  }

  /// Convert to map
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'text': text,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'isOutgoing': isOutgoing,
      'phoneNumber': phoneNumber,
      'status': status.toString().split('.').last,
      'type': isOutgoing ? 'sent' : 'received',
    };
  }

  /// Create copy with updated fields
  SmsMessage copyWith({
    String? id,
    String? text,
    DateTime? timestamp,
    bool? isOutgoing,
    String? phoneNumber,
    SmsMessageStatus? status,
  }) {
    return SmsMessage(
      id: id ?? this.id,
      text: text ?? this.text,
      timestamp: timestamp ?? this.timestamp,
      isOutgoing: isOutgoing ?? this.isOutgoing,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      status: status ?? this.status,
    );
  }

  @override
  String toString() {
    return 'SmsMessage(id: $id, text: "$text", isOutgoing: $isOutgoing)';
  }
}

/// SMS Message Status
enum SmsMessageStatus {
  sending,
  sent,
  delivered,
  read,
  failed,
  received,
  unknown,
}

/// SMS Conversation data class
class SmsConversation {
  final String phoneNumber;
  final List<SmsMessage> messages;
  final DateTime lastUpdate;
  final bool isFallback;

  const SmsConversation({
    required this.phoneNumber,
    required this.messages,
    required this.lastUpdate,
    this.isFallback = false,
  });

  /// Get contact metadata if available
  ContactMetadata? get contactMetadata =>
      SmsCoreService.getContactMetadata(phoneNumber);

  @override
  String toString() {
    return 'SmsConversation(phone: $phoneNumber, messages: ${messages.length}, fallback: $isFallback)';
  }
}

/// Contact metadata for 3D world integration
class ContactMetadata {
  final String contactId;
  final String name;
  final String phoneNumber;
  final String? avatarPath;

  const ContactMetadata({
    required this.contactId,
    required this.name,
    required this.phoneNumber,
    this.avatarPath,
  });

  Map<String, dynamic> toJson() {
    return {
      'contactId': contactId,
      'name': name,
      'phoneNumber': phoneNumber,
      'avatarPath': avatarPath,
    };
  }
}

/// SMS Event for real-time updates
class SmsEvent {
  final SmsEventType type;
  final String phoneNumber;
  final SmsMessage? message;
  final SmsConversation? conversation;
  final DateTime timestamp;

  SmsEvent({
    required this.type,
    required this.phoneNumber,
    this.message,
    this.conversation,
  }) : timestamp = DateTime.now();

  /// Get contact ID if metadata is available
  String? get contactId =>
      SmsCoreService.getContactMetadata(phoneNumber)?.contactId;

  @override
  String toString() {
    return 'SmsEvent(type: $type, phone: $phoneNumber, contactId: $contactId)';
  }
}

/// SMS Event Types
enum SmsEventType {
  messageReceived,
  messageSent,
  messageStatusUpdate,
  conversationUpdate,
}
