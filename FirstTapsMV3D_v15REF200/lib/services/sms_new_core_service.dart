import 'dart:async';
import 'dart:convert';

/// SMS Core Service - New Isolated Architecture
///
/// This service provides robust, isolated SMS functionality that operates
/// independently of contact object lifecycles and fragile event routing.
///
/// **Key Design Principles:**
/// 1. **Phone Number Primary Key**: Uses phone numbers as primary identifiers
/// 2. **Independent of Contact Objects**: SMS data exists separately from contact lifecycle
/// 3. **Simple Event Flow**: Direct Flutter ↔ JavaScript bridge, no complex routing
/// 4. **Robust Error Handling**: Graceful degradation and circuit breakers
/// 5. **Real-time Message Delivery**: Immediate updates for incoming messages
class SmsNewCoreService {
  static final SmsNewCoreService _instance = SmsNewCoreService._internal();
  factory SmsNewCoreService() => _instance;
  SmsNewCoreService._internal();

  // Core state
  bool _isInitialized = false;
  final Map<String, List<SmsMessageNew>> _messages = {};
  final Map<String, ConversationStateNew> _conversations = {};

  // Event handling
  final StreamController<SmsEventNew> _eventController =
      StreamController<SmsEventNew>.broadcast();
  Stream<SmsEventNew> get events => _eventController.stream;

  // JavaScript bridge
  JavaScriptBridgeNew? _jsBridge;
  Timer? _bridgeHealthCheck;

  // Circuit breaker state
  final Map<String, CircuitBreakerNew> _circuitBreakers = {};
  final List<PendingOperationNew> _retryQueue = [];
  Timer? _retryProcessor;

  // Configuration
  static const int maxRetries = 3;
  static const Duration retryDelay = Duration(seconds: 1);
  static const Duration bridgeTimeout = Duration(seconds: 5);

  /// Initialize the SMS Core service
  Future<bool> initialize() async {
    if (_isInitialized) {
      print('SMS New Core Service already initialized');
      return true;
    }

    try {
      print('Initializing SMS New Core Service...');

      // Initialize circuit breakers
      _initializeCircuitBreakers();

      // Set up JavaScript bridge
      await _setupJavaScriptBridge();

      // Start health monitoring
      _startHealthMonitoring();

      // Start retry processor
      _startRetryProcessor();

      _isInitialized = true;
      print('SMS New Core Service initialized successfully');

      _dispatchEvent(SmsEventNew.coreInitialized(timestamp: DateTime.now()));
      return true;
    } catch (error) {
      print('Failed to initialize SMS New Core Service: $error');
      return false;
    }
  }

  /// Initialize circuit breakers for critical operations
  void _initializeCircuitBreakers() {
    const operations = ['js_bridge', 'message_store', 'message_send'];

    for (final op in operations) {
      _circuitBreakers[op] = CircuitBreakerNew(
        operation: op,
        maxFailures: 3,
        timeout: const Duration(seconds: 5),
      );
    }
  }

  /// Set up JavaScript bridge communication
  Future<void> _setupJavaScriptBridge() async {
    try {
      _jsBridge = JavaScriptBridgeNew();

      // Set up message listeners
      _jsBridge!.setMessageListener(_handleJavaScriptMessage);

      // Notify JavaScript that Flutter bridge is ready
      await _jsBridge!.sendMessage({
        'type': 'flutter_bridge_ready',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });

      debugPrint('JavaScript bridge established');
    } catch (error) {
      debugPrint('Error setting up JavaScript bridge: $error');
      rethrow;
    }
  }

  /// Handle messages from JavaScript
  void _handleJavaScriptMessage(Map<String, dynamic> message) {
    try {
      final messageType = message['type'] as String?;

      switch (messageType) {
        case 'send_sms':
          _handleSendSmsRequest(message);
          break;

        case 'get_sms_history':
          _handleHistoryRequest(message);
          break;

        case 'mark_message_read':
          _handleMarkMessageRead(message);
          break;

        default:
          debugPrint('Unknown JavaScript message type: $messageType');
      }
    } catch (error) {
      debugPrint('Error handling JavaScript message: $error');
    }
  }

  /// Handle SMS send request from JavaScript
  Future<void> _handleSendSmsRequest(Map<String, dynamic> request) async {
    try {
      final phoneNumber = request['phoneNumber'] as String?;
      final message = request['message'] as String?;
      final requestId = request['requestId'] as String?;

      if (phoneNumber == null || message == null) {
        _sendJavaScriptResponse(requestId, {
          'success': false,
          'error': 'Phone number and message are required',
        });
        return;
      }

      final result = await sendMessage(phoneNumber, message);

      _sendJavaScriptResponse(requestId, result);
    } catch (error) {
      debugPrint('Error handling send SMS request: $error');
      _sendJavaScriptResponse(request['requestId'], {
        'success': false,
        'error': error.toString(),
      });
    }
  }

  /// Handle SMS history request from JavaScript
  Future<void> _handleHistoryRequest(Map<String, dynamic> request) async {
    try {
      final phoneNumber = request['phoneNumber'] as String?;
      final requestId = request['requestId'] as String?;

      final messages = phoneNumber != null
          ? getMessages(phoneNumber)
          : getAllMessages();

      _sendJavaScriptResponse(requestId, {
        'success': true,
        'messages': messages.map((m) => m.toJson()).toList(),
      });
    } catch (error) {
      debugPrint('Error handling history request: $error');
      _sendJavaScriptResponse(request['requestId'], {
        'success': false,
        'error': error.toString(),
      });
    }
  }

  /// Handle mark message as read request
  void _handleMarkMessageRead(Map<String, dynamic> request) {
    try {
      final phoneNumber = request['phoneNumber'] as String?;
      final messageId = request['messageId'] as String?;

      if (phoneNumber != null && messageId != null) {
        markMessageAsRead(phoneNumber, messageId);
      }
    } catch (error) {
      debugPrint('Error handling mark message read: $error');
    }
  }

  /// Send response back to JavaScript
  void _sendJavaScriptResponse(
    String? requestId,
    Map<String, dynamic> response,
  ) {
    if (requestId == null || _jsBridge == null) return;

    _jsBridge!.sendMessage({
      'type': 'response',
      'requestId': requestId,
      'data': response,
    });
  }

  /// Send an SMS message
  Future<Map<String, dynamic>> sendMessage(
    String phoneNumber,
    String message,
  ) async {
    if (_isCircuitOpen('message_send')) {
      return {
        'success': false,
        'error': 'Message send circuit breaker is open',
      };
    }

    try {
      // Normalize phone number
      final normalizedNumber = _normalizePhoneNumber(phoneNumber);

      // Create message object
      final smsMessage = SmsMessageNew(
        id: _generateMessageId(normalizedNumber),
        phoneNumber: normalizedNumber,
        text: message,
        timestamp: DateTime.now(),
        isOutgoing: true,
        isRead: true,
        status: SmsStatusNew.sending,
      );

      // Store outgoing message
      _storeMessage(smsMessage);

      // Send via platform (this would integrate with your SMS plugin)
      final result = await _sendViaPlatform(normalizedNumber, message);

      if (result['success'] == true) {
        // Update message status
        smsMessage.status = SmsStatusNew.sent;
        _recordSuccess('message_send');

        // Notify JavaScript
        _notifyJavaScriptOfMessage(smsMessage);

        return {'success': true, 'messageId': smsMessage.id};
      } else {
        smsMessage.status = SmsStatusNew.failed;
        throw Exception(result['error'] ?? 'Unknown error');
      }
    } catch (error) {
      _recordFailure('message_send', error);
      return {'success': false, 'error': error.toString()};
    }
  }

  /// Store a message with robust error handling
  bool _storeMessage(SmsMessageNew message) {
    if (_isCircuitOpen('message_store')) {
      _queueForRetry('store_message', {'message': message});
      return false;
    }

    try {
      final phoneNumber = message.phoneNumber;

      if (!_messages.containsKey(phoneNumber)) {
        _messages[phoneNumber] = [];
      }

      final messages = _messages[phoneNumber]!;

      // Check for duplicates
      final existingMessage = messages
          .where(
            (m) =>
                m.id == message.id ||
                (m.text == message.text &&
                    m.timestamp
                            .difference(message.timestamp)
                            .inMilliseconds
                            .abs() <
                        1000),
          )
          .firstOrNull;

      if (existingMessage != null) {
        debugPrint('Duplicate message detected for $phoneNumber, skipping');
        return false;
      }

      // Add and sort messages
      messages.add(message);
      messages.sort((a, b) => a.timestamp.compareTo(b.timestamp));

      // Update conversation state
      _updateConversationState(phoneNumber);

      _recordSuccess('message_store');

      // Dispatch event
      _dispatchEvent(
        SmsEventNew.messageStored(phoneNumber: phoneNumber, message: message),
      );

      return true;
    } catch (error) {
      _recordFailure('message_store', error);
      _queueForRetry('store_message', {'message': message});
      return false;
    }
  }

  /// Get messages for a phone number
  List<SmsMessageNew> getMessages(String phoneNumber) {
    try {
      final normalized = _normalizePhoneNumber(phoneNumber);
      return _messages[normalized] ?? [];
    } catch (error) {
      debugPrint('Error getting messages: $error');
      return [];
    }
  }

  /// Get all messages across all conversations
  List<SmsMessageNew> getAllMessages() {
    try {
      final allMessages = <SmsMessageNew>[];
      for (final messages in _messages.values) {
        allMessages.addAll(messages);
      }
      allMessages.sort((a, b) => a.timestamp.compareTo(b.timestamp));
      return allMessages;
    } catch (error) {
      debugPrint('Error getting all messages: $error');
      return [];
    }
  }

  /// Get conversation state for a phone number
  ConversationStateNew? getConversationState(String phoneNumber) {
    try {
      final normalized = _normalizePhoneNumber(phoneNumber);
      return _conversations[normalized];
    } catch (error) {
      debugPrint('Error getting conversation state: $error');
      return null;
    }
  }

  /// Update conversation state
  void _updateConversationState(String phoneNumber) {
    try {
      final messages = _messages[phoneNumber] ?? [];
      final lastMessage = messages.isNotEmpty ? messages.last : null;
      final hasUnread = messages.any((m) => !m.isRead && !m.isOutgoing);

      _conversations[phoneNumber] = ConversationStateNew(
        phoneNumber: phoneNumber,
        messageCount: messages.length,
        lastMessage: lastMessage,
        lastActivity: lastMessage?.timestamp,
        hasUnread: hasUnread,
      );
    } catch (error) {
      debugPrint('Error updating conversation state: $error');
    }
  }

  /// Mark message as read
  void markMessageAsRead(String phoneNumber, String messageId) {
    try {
      final normalized = _normalizePhoneNumber(phoneNumber);
      final messages = _messages[normalized];

      if (messages != null) {
        final message = messages.where((m) => m.id == messageId).firstOrNull;
        if (message != null) {
          message.isRead = true;
          _updateConversationState(normalized);

          _dispatchEvent(
            SmsEventNew.messageRead(
              phoneNumber: normalized,
              messageId: messageId,
            ),
          );
        }
      }
    } catch (error) {
      debugPrint('Error marking message as read: $error');
    }
  }

  /// Handle incoming SMS message (called by SMS receiver)
  void handleIncomingSms(
    String phoneNumber,
    String message, {
    DateTime? timestamp,
  }) {
    try {
      final normalizedNumber = _normalizePhoneNumber(phoneNumber);

      final smsMessage = SmsMessageNew(
        id: _generateMessageId(normalizedNumber),
        phoneNumber: normalizedNumber,
        text: message,
        timestamp: timestamp ?? DateTime.now(),
        isOutgoing: false,
        isRead: false,
        status: SmsStatusNew.received,
      );

      final success = _storeMessage(smsMessage);

      if (success) {
        // Notify JavaScript immediately
        _notifyJavaScriptOfMessage(smsMessage);
        debugPrint('Incoming SMS processed: $normalizedNumber');
      }
    } catch (error) {
      debugPrint('Error handling incoming SMS: $error');
    }
  }

  /// Notify JavaScript of new message
  void _notifyJavaScriptOfMessage(SmsMessageNew message) {
    if (_jsBridge == null) return;

    try {
      _jsBridge!.sendMessage({
        'type': 'flutter_sms_message',
        'data': message.toJson(),
      });
    } catch (error) {
      debugPrint('Error notifying JavaScript of message: $error');
    }
  }

  /// Send message via platform SMS service
  Future<Map<String, dynamic>> _sendViaPlatform(
    String phoneNumber,
    String message,
  ) async {
    // This would integrate with your SMS plugin (e.g., flutter_sms)
    // For now, return a mock success
    await Future.delayed(const Duration(milliseconds: 500));
    return {'success': true};
  }

  /// Normalize phone number for consistent indexing
  String _normalizePhoneNumber(String phoneNumber) {
    final digits = phoneNumber.replaceAll(RegExp(r'\D'), '');

    if (digits.length == 11 && digits.startsWith('1')) {
      return '+1${digits.substring(1)}';
    } else if (digits.length == 10) {
      return '+1$digits';
    } else if (digits.length > 10) {
      return '+$digits';
    } else {
      return phoneNumber;
    }
  }

  /// Generate unique message ID
  String _generateMessageId(String phoneNumber) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = (DateTime.now().microsecond % 1000).toString().padLeft(
      3,
      '0',
    );
    return '${phoneNumber}_${timestamp}_$random';
  }

  /// Circuit breaker management
  bool _isCircuitOpen(String operation) {
    final breaker = _circuitBreakers[operation];
    return breaker?.isOpen ?? false;
  }

  void _recordSuccess(String operation) {
    _circuitBreakers[operation]?.recordSuccess();
  }

  void _recordFailure(String operation, dynamic error) {
    _circuitBreakers[operation]?.recordFailure(error);
  }

  /// Retry queue management
  void _queueForRetry(String operation, Map<String, dynamic> data) {
    _retryQueue.add(
      PendingOperationNew(
        operation: operation,
        data: data,
        timestamp: DateTime.now(),
        retryCount: 0,
      ),
    );
  }

  /// Start retry processor
  void _startRetryProcessor() {
    _retryProcessor = Timer.periodic(retryDelay, (_) {
      _processRetryQueue();
    });
  }

  /// Process retry queue
  void _processRetryQueue() {
    final itemsToRetry = _retryQueue
        .where(
          (item) =>
              DateTime.now().difference(item.timestamp) >= retryDelay &&
              item.retryCount < maxRetries,
        )
        .toList();

    for (final item in itemsToRetry) {
      _retryQueue.remove(item);

      try {
        if (item.operation == 'store_message') {
          final message = item.data['message'] as SmsMessageNew;
          if (!_storeMessage(message)) {
            item.retryCount++;
            if (item.retryCount < maxRetries) {
              _retryQueue.add(item);
            }
          }
        }
      } catch (error) {
        debugPrint('Error retrying operation ${item.operation}: $error');
      }
    }
  }

  /// Start health monitoring
  void _startHealthMonitoring() {
    _bridgeHealthCheck = Timer.periodic(const Duration(seconds: 5), (_) {
      _checkBridgeHealth();
    });
  }

  /// Check JavaScript bridge health
  void _checkBridgeHealth() {
    if (_jsBridge == null) return;

    try {
      _jsBridge!.sendMessage({
        'type': 'health_check',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });
    } catch (error) {
      debugPrint('Bridge health check failed: $error');
    }
  }

  /// Dispatch SMS event
  void _dispatchEvent(SmsEventNew event) {
    try {
      _eventController.add(event);
    } catch (error) {
      debugPrint('Error dispatching SMS event: $error');
    }
  }

  /// Get system status for debugging
  Map<String, dynamic> getSystemStatus() {
    return {
      'isInitialized': _isInitialized,
      'messageCount': _messages.values.fold<int>(
        0,
        (sum, msgs) => sum + msgs.length,
      ),
      'conversationCount': _conversations.length,
      'bridgeStatus': _jsBridge?.isConnected ?? false,
      'circuitBreakerStatus': _circuitBreakers.map(
        (key, value) => MapEntry(key, value.status),
      ),
      'retryQueueLength': _retryQueue.length,
    };
  }

  /// Cleanup resources
  void dispose() {
    _eventController.close();
    _retryProcessor?.cancel();
    _bridgeHealthCheck?.cancel();
    _jsBridge?.dispose();
    _messages.clear();
    _conversations.clear();
    _retryQueue.clear();
    _isInitialized = false;

    debugPrint('SMS New Core Service disposed');
  }
}

/// SMS Message data model
class SmsMessageNew {
  String id;
  String phoneNumber;
  String text;
  DateTime timestamp;
  bool isOutgoing;
  bool isRead;
  SmsStatusNew status;

  SmsMessageNew({
    required this.id,
    required this.phoneNumber,
    required this.text,
    required this.timestamp,
    required this.isOutgoing,
    required this.isRead,
    required this.status,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'phoneNumber': phoneNumber,
    'text': text,
    'timestamp': timestamp.millisecondsSinceEpoch,
    'isOutgoing': isOutgoing,
    'isRead': isRead,
    'status': status.name,
  };

  factory SmsMessageNew.fromJson(Map<String, dynamic> json) => SmsMessageNew(
    id: json['id'],
    phoneNumber: json['phoneNumber'],
    text: json['text'],
    timestamp: DateTime.fromMillisecondsSinceEpoch(json['timestamp']),
    isOutgoing: json['isOutgoing'],
    isRead: json['isRead'],
    status: SmsStatusNew.values.byName(json['status']),
  );
}

/// SMS message status enumeration
enum SmsStatusNew { sending, sent, delivered, failed, received }

/// Conversation state data model
class ConversationStateNew {
  String phoneNumber;
  int messageCount;
  SmsMessageNew? lastMessage;
  DateTime? lastActivity;
  bool hasUnread;

  ConversationStateNew({
    required this.phoneNumber,
    required this.messageCount,
    this.lastMessage,
    this.lastActivity,
    required this.hasUnread,
  });
}

/// SMS event data model
class SmsEventNew {
  String type;
  Map<String, dynamic> data;

  SmsEventNew({required this.type, required this.data});

  factory SmsEventNew.coreInitialized({required DateTime timestamp}) =>
      SmsEventNew(
        type: 'core_initialized',
        data: {'timestamp': timestamp.millisecondsSinceEpoch},
      );

  factory SmsEventNew.messageStored({
    required String phoneNumber,
    required SmsMessageNew message,
  }) => SmsEventNew(
    type: 'message_stored',
    data: {'phoneNumber': phoneNumber, 'message': message.toJson()},
  );

  factory SmsEventNew.messageRead({
    required String phoneNumber,
    required String messageId,
  }) => SmsEventNew(
    type: 'message_read',
    data: {'phoneNumber': phoneNumber, 'messageId': messageId},
  );
}

/// Circuit breaker for fault tolerance
class CircuitBreakerNew {
  String operation;
  int maxFailures;
  Duration timeout;

  int _failures = 0;
  DateTime? _lastFailure;
  CircuitStateNew _state = CircuitStateNew.closed;

  CircuitBreakerNew({
    required this.operation,
    required this.maxFailures,
    required this.timeout,
  });

  bool get isOpen => _state == CircuitStateNew.open;

  Map<String, dynamic> get status => {
    'state': _state.name,
    'failures': _failures,
    'lastFailure': _lastFailure?.millisecondsSinceEpoch,
  };

  void recordSuccess() {
    _failures = 0;
    _state = CircuitStateNew.closed;
  }

  void recordFailure(dynamic error) {
    _failures++;
    _lastFailure = DateTime.now();

    if (_failures >= maxFailures) {
      _state = CircuitStateNew.open;
    }
  }
}

/// Circuit breaker state enumeration
enum CircuitStateNew { closed, open, halfOpen }

/// Pending operation for retry queue
class PendingOperationNew {
  String operation;
  Map<String, dynamic> data;
  DateTime timestamp;
  int retryCount;

  PendingOperationNew({
    required this.operation,
    required this.data,
    required this.timestamp,
    required this.retryCount,
  });
}

/// JavaScript bridge for communication
class JavaScriptBridgeNew {
  bool _isConnected = false;
  void Function(Map<String, dynamic>)? _messageListener;

  bool get isConnected => _isConnected;

  void setMessageListener(void Function(Map<String, dynamic>) listener) {
    _messageListener = listener;
  }

  Future<void> sendMessage(Map<String, dynamic> message) async {
    // This would integrate with your Flutter WebView JavaScript bridge
    // For now, just log the message
    debugPrint('JS Bridge Send: $message');
  }

  void dispose() {
    _isConnected = false;
    _messageListener = null;
  }
}
