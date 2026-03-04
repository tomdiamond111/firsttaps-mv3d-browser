// three_js_world_initializer.dart
// Dart service for safe JS interop with protected 3D world/camera functions (Android/iOS)

import 'package:webview_flutter/webview_flutter.dart';

class ThreeJsWorldInitializer {
  final WebViewController webViewController;

  ThreeJsWorldInitializer(this.webViewController);

  Future<void> initializeScene([Map<String, dynamic>? options]) async {
    if (options != null) {
      final optionsJson = _mapToJson(options);
      await webViewController.runJavaScript('initializeScene($optionsJson);');
    } else {
      await webViewController.runJavaScript('initializeScene();');
    }
  }

  Future<void> resetCamera() async {
    await webViewController.runJavaScript('resetCamera();');
  }

  Future<void> switchWorld(String worldType) async {
    await webViewController.runJavaScript("switchWorld('$worldType');");
  }

  String _mapToJson(Map<String, dynamic> map) {
    return map.entries
        .map((e) => '\"${e.key}\":${_valueToJson(e.value)}')
        .join(',');
  }

  String _valueToJson(dynamic value) {
    if (value is String) return '"$value"';
    if (value is Map)
      return '{${_mapToJson(Map<String, dynamic>.from(value))}}';
    if (value is List) return '[${value.map(_valueToJson).join(',')}]';
    return value.toString();
  }
}
