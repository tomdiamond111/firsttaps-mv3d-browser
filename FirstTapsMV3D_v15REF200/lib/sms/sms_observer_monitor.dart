import 'dart:async';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Monitors SMS ContentObserver health and provides recovery mechanisms
/// This ensures reliable SMS receiving even after app backgrounding/foregrounding
class SmsObserverMonitor {
  static const MethodChannel _channel = MethodChannel(
    'com.firsttaps.firsttaps3D/sms_observer',
  );

  WebViewController? _webViewController;
  Timer? _heartbeatTimer;
  DateTime? _lastHeartbeat;
  bool _isMonitoring = false;

  static const Duration _heartbeatTimeout = Duration(seconds: 45);
  static const Duration _monitorInterval = Duration(seconds: 15);

  SmsObserverMonitor();

  /// Set WebViewController for JavaScript notifications
  void setWebViewController(WebViewController controller) {
    _webViewController = controller;
    print('📱 🏥 SmsObserverMonitor: WebViewController set');
  }

  /// Start monitoring observer health
  void startMonitoring() {
    if (_isMonitoring) {
      print('📱 🏥 Observer monitoring already active');
      return;
    }

    _isMonitoring = true;
    print('📱 🏥 Starting SMS observer health monitoring');

    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(_monitorInterval, (_) => _checkHealth());
  }

  /// Stop monitoring
  void stopMonitoring() {
    _isMonitoring = false;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    print('📱 🏥 Stopped SMS observer monitoring');
  }

  /// Called when heartbeat is received from native code
  void onHeartbeat(int timestamp, bool active) {
    _lastHeartbeat = DateTime.now();
    print(
      '📱 💓 Observer heartbeat received - timestamp: $timestamp, active: $active',
    );
  }

  /// Called when observer has been recovered
  Future<void> onObserverRecovered(String? message) async {
    print('📱 ✅ Observer recovered: $message');
    _lastHeartbeat = DateTime.now(); // Reset heartbeat on recovery
    await _notifyJavaScript({
      'event': 'observer_recovered',
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'message': message ?? 'Observer re-registered successfully',
    });
  }

  /// Check observer health and trigger recovery if needed
  Future<void> _checkHealth() async {
    if (_lastHeartbeat == null) {
      print(
        '📱 ⚠️ No heartbeat received yet - observer may need initialization',
      );
      return;
    }

    final timeSinceLastHeartbeat = DateTime.now().difference(_lastHeartbeat!);

    if (timeSinceLastHeartbeat > _heartbeatTimeout) {
      print(
        '📱 🚨 Observer heartbeat timeout! Last: ${timeSinceLastHeartbeat.inSeconds}s ago',
      );
      await _triggerRecovery();
    } else {
      print(
        '📱 ✅ Observer health OK (last heartbeat ${timeSinceLastHeartbeat.inSeconds}s ago)',
      );
    }
  }

  /// Trigger observer recovery
  Future<void> _triggerRecovery() async {
    try {
      print('📱 🔄 Triggering SMS observer recovery...');

      // Call native method to force re-registration
      final result = await _channel.invokeMethod('forceReregister');
      print('📱 Recovery result: $result');

      // Notify JavaScript
      await _notifyJavaScript({
        'event': 'observer_recovery_triggered',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });
    } catch (e) {
      print('📱 ❌ Error triggering recovery: $e');
    }
  }

  /// Notify JavaScript of observer status changes
  Future<void> _notifyJavaScript(Map<String, dynamic> data) async {
    if (_webViewController == null) return;

    try {
      final jsCode =
          '''
        if (window.SmsSystem && window.SmsSystem.handleObserverEvent) {
          window.SmsSystem.handleObserverEvent(${_mapToJson(data)});
        }
      ''';

      await _webViewController!.runJavaScript(jsCode);
    } catch (e) {
      print('📱 ❌ Error notifying JavaScript: $e');
    }
  }

  /// Convert map to JSON string for JavaScript
  String _mapToJson(Map<String, dynamic> map) {
    return '{${map.entries.map((e) => '"${e.key}":${_valueToJson(e.value)}').join(',')}}';
  }

  String _valueToJson(dynamic value) {
    if (value is String) return '"$value"';
    if (value is num || value is bool) return value.toString();
    if (value == null) return 'null';
    return '"$value"';
  }

  /// Manual health check trigger
  Future<void> performHealthCheck() async {
    print('📱 🏥 Performing manual health check...');
    await _checkHealth();
  }

  /// Force observer re-initialization
  Future<bool> forceReInitialize() async {
    try {
      print('📱 🔄 Forcing observer re-initialization...');
      final result = await _channel.invokeMethod<bool>('forceReinitialize');
      print('📱 Re-initialization result: $result');
      return result ?? false;
    } catch (e) {
      print('📱 ❌ Error forcing re-initialization: $e');
      return false;
    }
  }

  /// Cleanup
  void dispose() {
    stopMonitoring();
    _webViewController = null;
  }
}
