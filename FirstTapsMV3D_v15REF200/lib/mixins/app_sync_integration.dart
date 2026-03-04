import 'package:firsttaps_mv3d/services/app_service.dart';
import 'package:firsttaps_mv3d/helpers/app_sync_helper.dart';
import 'package:firsttaps_mv3d/services/three_js_interop_service.dart';
import 'dart:developer' as developer;

/// Extension methods for HomePageController to use app synchronization
///
/// This provides clean integration without modifying the large controller file.
/// Add these methods to HomePageController by including this mixin.
mixin AppSyncIntegration {
  // Abstract getter that must be implemented by the class using this mixin
  AppService get appService;
  ThreeJsInteropService? get threeJsInteropService;

  // Lazy-initialized app sync helper
  AppSyncHelper? _appSyncHelper;

  /// Get or create the app sync helper
  AppSyncHelper get appSyncHelper {
    _appSyncHelper ??= AppSyncHelper(appService: appService);

    // Initialize sync if Three.js service is available
    if (threeJsInteropService != null) {
      _appSyncHelper!.initializeSync(threeJsInteropService!);
    }

    return _appSyncHelper!;
  }

  /// Get synchronized list of favorite apps for the Add Apps menu
  /// Use this instead of direct AppService.loadFavoriteApps() calls
  Future<List<AppInfo>> getSynchronizedFavoriteApps() async {
    try {
      developer.log(
        'Getting synchronized favorite apps for menu',
        name: 'AppSyncIntegration',
      );
      return await appSyncHelper.getSynchronizedFavoriteApps();
    } catch (e) {
      developer.log(
        'Error getting synchronized apps: $e',
        name: 'AppSyncIntegration',
      );
      // Fallback to regular favorites
      return await appService.loadFavoriteApps();
    }
  }

  /// Initialize app sync when Three.js service becomes available
  /// Call this from setThreeJsInteropService method
  void initializeAppSync(ThreeJsInteropService service) {
    appSyncHelper.initializeSync(service);
    developer.log(
      'App sync initialized with Three.js service',
      name: 'AppSyncIntegration',
    );
  }

  /// Process pending app sync operations
  /// Call this before opening Add Apps menu for best sync
  Future<void> processPendingAppSyncOperations() async {
    try {
      await appSyncHelper.processPendingOperations();
      developer.log(
        'Processed pending app sync operations',
        name: 'AppSyncIntegration',
      );
    } catch (e) {
      developer.log(
        'Error processing pending app sync operations: $e',
        name: 'AppSyncIntegration',
      );
    }
  }

  /// Get app sync status for debugging
  Future<Map<String, dynamic>> getAppSyncStatus() async {
    return await appSyncHelper.getSyncStatus();
  }

  /// Validate and fix app sync issues
  Future<bool> validateAndFixAppSync() async {
    return await appSyncHelper.validateAndFixSync();
  }
}
