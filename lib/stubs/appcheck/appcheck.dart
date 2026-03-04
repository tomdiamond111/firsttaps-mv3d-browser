/// Stub for appcheck package (browser version)
/// This is a no-op implementation for web platform

class AppCheck {
  static Future<void> initialize() async {
    // No-op for web
  }

  static Future<String?> getToken([bool forceRefresh = false]) async {
    // No-op for web - return null
    return null;
  }

  // Instance methods (not static)
  Future<List<AppInfo>> getInstalledApps() async {
    // No-op for web - return empty list
    return [];
  }

  Future<void> launchApp(String packageName) async {
    // No-op for web
    print('AppCheck.launchApp called but not supported on web: $packageName');
  }
}

class AppInfo {
  final String packageName;
  final String? appName;
  final bool? isSystemApp;

  AppInfo({required this.packageName, this.appName, this.isSystemApp});
}
