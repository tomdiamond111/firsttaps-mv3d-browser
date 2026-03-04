/// Stub for external_app_launcher package (browser version)
/// This is a no-op implementation for web platform

class LaunchApp {
  static Future<void> openApp({
    String? androidPackageName,
    String? iosUrlScheme,
    String? appStoreLink,
  }) async {
    // No-op for web - cannot launch external apps from browser
    print('LaunchApp.openApp called but not supported on web');
  }

  static Future<bool> isAppInstalled({
    String? androidPackageName,
    String? iosUrlScheme,
  }) async {
    // Always return false on web
    return false;
  }
}
