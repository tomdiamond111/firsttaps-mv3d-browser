/// Stub for webview_flutter package (browser version)
/// WebViewController is not needed on web since we use iframe directly

class WebViewController {
  // Stub constructor
  WebViewController();

  static WebViewController fromPlatform(dynamic platform) {
    return WebViewController();
  }

  Future<void> loadRequest(Uri uri) async {
    // No-op for web
  }

  Future<void> runJavaScript(String javaScript) async {
    // No-op for web - use postMessage instead
  }

  Future<dynamic> runJavaScriptReturningResult(String javaScript) async {
    // No-op for web - use postMessage instead
    // Return null for stub to avoid type errors
    return null;
  }

  Future<void> setJavaScriptMode(JavaScriptMode mode) async {
    // No-op for web
  }
}

enum JavaScriptMode { disabled, unrestricted }
