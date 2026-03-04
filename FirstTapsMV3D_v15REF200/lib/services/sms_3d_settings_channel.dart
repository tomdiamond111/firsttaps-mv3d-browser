import 'package:flutter/foundation.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'sms_3d_mode_service.dart';

/// Channel for communicating 3D balloon settings to JavaScript
class Sms3DSettingsChannel {
  WebViewController? _webViewController;
  final Sms3DModeService _settingsService;

  Sms3DSettingsChannel(this._settingsService);

  /// Set the WebView controller
  void setWebViewController(WebViewController controller) {
    _webViewController = controller;
    if (kDebugMode) {
      print('🎈 3D Settings Channel: WebView controller set');
    }
  }

  /// Send all current settings to JavaScript
  Future<void> syncAllSettings() async {
    if (_webViewController == null) {
      if (kDebugMode) {
        print('⚠️ 3D Settings Channel: WebView not available');
      }
      return;
    }

    final settings = await _settingsService.getAllSettings();
    await _sendToJavaScript('sync_all_settings', settings);

    if (kDebugMode) {
      print('🎈 Synced all 3D settings to JavaScript: $settings');
    }
  }

  /// Send a single setting update to JavaScript
  Future<void> updateSetting(String key, dynamic value) async {
    if (_webViewController == null) {
      if (kDebugMode) {
        print('⚠️ 3D Settings Channel: WebView not available for $key update');
      }
      return;
    }

    await _sendToJavaScript('setting_changed', {'key': key, 'value': value});

    if (kDebugMode) {
      print('🎈 Sent 3D setting update: $key = $value');
    }
  }

  /// Internal method to send data to JavaScript
  Future<void> _sendToJavaScript(String action, dynamic data) async {
    if (_webViewController == null) return;

    final timestamp = DateTime.now().millisecondsSinceEpoch;

    try {
      await _webViewController!.runJavaScript('''
        (function() {
          if (window.Sms3DSettings) {
            const event = new CustomEvent('flutter-3d-settings', {
              detail: {
                type: '3d-settings',
                action: '$action',
                data: ${_encodeForJs(data)},
                timestamp: $timestamp
              }
            });
            window.dispatchEvent(event);
            console.log('🎈 Dispatched flutter-3d-settings event:', '$action');
          } else {
            console.warn('⚠️ Sms3DSettings not available yet');
          }
        })();
      ''');
    } catch (e) {
      if (kDebugMode) {
        print('⚠️ Failed to send 3D settings to JavaScript: $e');
      }
    }
  }

  /// Helper to safely encode data for JavaScript
  String _encodeForJs(dynamic data) {
    if (data is Map) {
      final entries = data.entries
          .map((e) {
            final key = e.key.toString();
            final value = _encodeValue(e.value);
            return '"$key": $value';
          })
          .join(', ');
      return '{$entries}';
    } else if (data is bool) {
      return data.toString();
    } else if (data is num) {
      return data.toString();
    } else {
      return '"${data.toString()}"';
    }
  }

  /// Encode individual value
  String _encodeValue(dynamic value) {
    if (value is Map || value is List) {
      return _encodeForJs(value);
    } else if (value is bool || value is num) {
      return value.toString();
    } else {
      return '"${value.toString()}"';
    }
  }

  /// Dispose
  void dispose() {
    _webViewController = null;
    if (kDebugMode) {
      print('🎈 3D Settings Channel disposed');
    }
  }
}
