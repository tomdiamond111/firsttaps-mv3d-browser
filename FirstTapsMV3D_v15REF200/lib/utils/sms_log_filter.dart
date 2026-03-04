// VS Code Debug Console Filter for Flutter SMS Logs
// Add this to your main.dart or create as a separate debug utility

import 'dart:developer' as developer;

class SmsLogFilter {
  static const List<String> _smsKeywords = [
    'sms',
    'SMS',
    'message',
    'Message',
    'telephony',
    'Telephony',
    'permission',
    'Permission',
    'channel',
    'Channel',
    'bridge',
    'Bridge',
    'darcie',
    'Darcie',
    'DARCIE',
    'received',
    'incoming',
  ];

  static const List<String> _excludeKeywords = [
    'texture',
    'render',
    'animation',
    'frame',
    'camera',
    'scene',
    'webgl',
    'three.js',
  ];

  static bool _shouldShowLog(String message) {
    final lowerMessage = message.toLowerCase();

    // Exclude unwanted logs first
    if (_excludeKeywords.any(
      (keyword) => lowerMessage.contains(keyword.toLowerCase()),
    )) {
      return false;
    }

    // Include SMS-related logs
    return _smsKeywords.any(
      (keyword) => lowerMessage.contains(keyword.toLowerCase()),
    );
  }

  static void smsLog(String message, {String level = 'INFO'}) {
    if (_shouldShowLog(message)) {
      final timestamp = DateTime.now().toIso8601String().substring(11, 23);
      final formattedMessage = '[$timestamp] [$level] SMS: $message';

      switch (level.toUpperCase()) {
        case 'ERROR':
        case 'CRITICAL':
          developer.log(formattedMessage, name: 'SMS_ERROR', level: 1000);
          break;
        case 'WARN':
        case 'WARNING':
          developer.log(formattedMessage, name: 'SMS_WARN', level: 900);
          break;
        default:
          developer.log(formattedMessage, name: 'SMS_INFO', level: 800);
      }
    }
  }

  static void error(String message) => smsLog(message, level: 'ERROR');
  static void warn(String message) => smsLog(message, level: 'WARN');
  static void info(String message) => smsLog(message, level: 'INFO');
  static void critical(String message) => smsLog(message, level: 'CRITICAL');
}

// Usage in your SMS-related Dart files:
// SmsLogFilter.info('SMS channel manager initialized');
// SmsLogFilter.error('Failed to listen for incoming SMS');
// SmsLogFilter.critical('SMS permissions denied');
