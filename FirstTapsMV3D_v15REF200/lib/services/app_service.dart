import 'package:appcheck/appcheck.dart';
import 'package:external_app_launcher/external_app_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:developer' as developer;

class AppInfo {
  final String id;
  final String name;
  final String packageName;
  final String? iconPath;
  final bool isSystemApp;

  AppInfo({
    required this.id,
    required this.name,
    required this.packageName,
    this.iconPath,
    this.isSystemApp = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'packageName': packageName,
      'iconPath': iconPath,
      'isSystemApp': isSystemApp,
    };
  }

  factory AppInfo.fromMap(Map<String, dynamic> map) {
    return AppInfo(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      packageName: map['packageName'] ?? '',
      iconPath: map['iconPath'],
      isSystemApp: map['isSystemApp'] ?? false,
    );
  }

  String toJson() => json.encode(toMap());

  factory AppInfo.fromJson(String source) =>
      AppInfo.fromMap(json.decode(source));
}

class AppService {
  static const String _favoriteAppsKey = 'favorite_apps';
  static const String _lastAppCheckKey = 'last_app_check';

  List<AppInfo> _installedApps = [];
  List<AppInfo> _favoriteApps = [];

  // Cache duration - longer cache for better UX (apps don't change frequently)
  static const Duration _cacheExpiration = Duration(hours: 6);

  List<AppInfo> get installedApps => _installedApps;
  List<AppInfo> get favoriteApps => _favoriteApps;

  /// Get installed apps from the device
  Future<List<AppInfo>> getInstalledApps() async {
    try {
      final startTime = DateTime.now();
      developer.log('Getting installed apps', name: 'AppService');

      // Check cache first
      final prefs = await SharedPreferences.getInstance();
      final lastCheck = prefs.getInt(_lastAppCheckKey) ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;

      if (_installedApps.isNotEmpty &&
          (now - lastCheck) < _cacheExpiration.inMilliseconds) {
        final cacheTime = DateTime.now().difference(startTime).inMilliseconds;
        developer.log('Using cached apps (${cacheTime}ms)', name: 'AppService');
        return _installedApps;
      }

      developer.log('Cache miss, fetching fresh app list', name: 'AppService');
      // Get fresh app list using AppCheck instance
      final appCheck = AppCheck();
      final apps = await appCheck.getInstalledApps();

      if (apps != null) {
        _installedApps = apps
            .map(
              (app) => AppInfo(
                id: app.packageName,
                name: app.appName ?? 'Unknown App',
                packageName: app.packageName,
                iconPath: null, // AppCheck doesn't provide icon path
                isSystemApp: app.isSystemApp ?? false,
              ),
            )
            .toList();

        // Filter out system apps and apps with no names
        _installedApps = _installedApps
            .where(
              (app) =>
                  !app.isSystemApp &&
                  app.name.isNotEmpty &&
                  app.name.trim().isNotEmpty &&
                  app.name != 'Unknown App',
            )
            .toList();

        // Sort by name
        _installedApps.sort(
          (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
        );

        // Update cache timestamp
        await prefs.setInt(_lastAppCheckKey, now);

        final totalTime = DateTime.now().difference(startTime).inMilliseconds;
        developer.log(
          'Found ${_installedApps.length} user apps in ${totalTime}ms',
          name: 'AppService',
        );
        return _installedApps;
      }
    } catch (e) {
      developer.log('Error getting installed apps: $e', name: 'AppService');
    }

    // Return default apps for iOS or when there's an error
    return _getDefaultApps();
  }

  /// Get default apps for iOS or fallback
  List<AppInfo> _getDefaultApps() {
    _installedApps = [
      AppInfo(
        id: 'com.apple.mobilemail',
        name: 'Mail',
        packageName: 'com.apple.mobilemail',
      ),
      AppInfo(
        id: 'com.apple.mobilesafari',
        name: 'Safari',
        packageName: 'com.apple.mobilesafari',
      ),
      AppInfo(
        id: 'com.apple.camera',
        name: 'Camera',
        packageName: 'com.apple.camera',
      ),
      AppInfo(
        id: 'com.apple.photos',
        name: 'Photos',
        packageName: 'com.apple.photos',
      ),
      AppInfo(
        id: 'com.apple.mobilephone',
        name: 'Phone',
        packageName: 'com.apple.mobilephone',
      ),
      AppInfo(
        id: 'com.apple.MobileSMS',
        name: 'Messages',
        packageName: 'com.apple.MobileSMS',
      ),
      AppInfo(
        id: 'com.apple.Music',
        name: 'Music',
        packageName: 'com.apple.Music',
      ),
      AppInfo(
        id: 'com.apple.Maps',
        name: 'Maps',
        packageName: 'com.apple.Maps',
      ),
    ];
    return _installedApps;
  }

  /// Save favorite apps to local storage
  Future<void> saveFavoriteApps(List<AppInfo> apps) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final List<String> appsJson = apps.map((app) => app.toJson()).toList();
      await prefs.setStringList(_favoriteAppsKey, appsJson);
      _favoriteApps = apps;
      developer.log('Saved ${apps.length} favorite apps', name: 'AppService');
    } catch (e) {
      developer.log('Error saving favorite apps: $e', name: 'AppService');
    }
  }

  /// Load favorite apps from local storage
  Future<List<AppInfo>> loadFavoriteApps() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final List<String>? appsJson = prefs.getStringList(_favoriteAppsKey);

      if (appsJson != null) {
        _favoriteApps = appsJson.map((json) => AppInfo.fromJson(json)).toList();
        developer.log(
          'Loaded ${_favoriteApps.length} favorite apps',
          name: 'AppService',
        );
        return _favoriteApps;
      }
    } catch (e) {
      developer.log('Error loading favorite apps: $e', name: 'AppService');
    }

    _favoriteApps = [];
    return _favoriteApps;
  }

  /// Launch an app
  Future<bool> launchApp(String packageName) async {
    try {
      developer.log('Launching app: $packageName', name: 'AppService');

      // Try using AppCheck first
      final appCheck = AppCheck();
      try {
        await appCheck.launchApp(packageName);
        developer.log(
          'App launched successfully with AppCheck',
          name: 'AppService',
        );
        return true;
      } catch (e) {
        developer.log('AppCheck launch failed: $e', name: 'AppService');
      }

      // Fallback to external_app_launcher
      try {
        await LaunchApp.openApp(
          androidPackageName: packageName,
          iosUrlScheme: packageName,
          appStoreLink: '', // Empty for now
        );

        // Assume success if no exception was thrown
        developer.log(
          'App launched successfully with external_app_launcher',
          name: 'AppService',
        );
        return true;
      } catch (e) {
        developer.log('External app launcher failed: $e', name: 'AppService');
        return false;
      }
    } catch (e) {
      developer.log('Error launching app: $e', name: 'AppService');
      return false;
    }
  }

  /// Check if an app can be launched
  Future<bool> canLaunchApp(String packageName) async {
    try {
      // This is a simple check - in a real app you might want to be more sophisticated
      return packageName.isNotEmpty;
    } catch (e) {
      developer.log(
        'Error checking if app can be launched: $e',
        name: 'AppService',
      );
      return false;
    }
  }

  /// Clear app cache
  Future<void> clearCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_lastAppCheckKey);
      _installedApps.clear();
      developer.log('App cache cleared', name: 'AppService');
    } catch (e) {
      developer.log('Error clearing app cache: $e', name: 'AppService');
    }
  }

  /// Force refresh the installed apps list (bypass cache)
  Future<List<AppInfo>> refreshInstalledApps() async {
    try {
      developer.log('Force refreshing installed apps', name: 'AppService');

      // Clear cache
      await clearCache();

      // Get fresh app list
      return await getInstalledApps();
    } catch (e) {
      developer.log('Error refreshing installed apps: $e', name: 'AppService');
      return _installedApps;
    }
  }

  /// Preload apps in the background to improve user experience
  Future<void> preloadApps() async {
    try {
      developer.log('Preloading apps in background', name: 'AppService');

      // Check if we have a recent cache
      final prefs = await SharedPreferences.getInstance();
      final lastCheck = prefs.getInt(_lastAppCheckKey) ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;

      // If cache is older than 1 hour, preload fresh data
      if ((now - lastCheck) > _cacheExpiration.inMilliseconds) {
        await getInstalledApps();
      }
    } catch (e) {
      developer.log('Error preloading apps: $e', name: 'AppService');
    }
  }
}
