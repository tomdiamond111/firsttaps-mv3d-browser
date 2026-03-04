import 'package:firsttaps_mv3d/services/app_service.dart';
import 'package:firsttaps_mv3d/services/app_sync_service.dart';
import 'package:firsttaps_mv3d/services/three_js_interop_service.dart';
import 'dart:developer' as developer;

/// Helper class to integrate app synchronization with HomePageController
///
/// This helper provides clean integration without modifying the large controller file.
/// It manages the app sync service and provides synchronized app selection methods.
class AppSyncHelper {
  final AppSyncService _appSyncService;
  final AppService _appService;

  AppSyncHelper({required AppService appService})
    : _appService = appService,
      _appSyncService = AppSyncService(appService: appService);

  /// Initialize the sync service with Three.js interop
  void initializeSync(ThreeJsInteropService threeJsService) {
    _appSyncService.setThreeJsInteropService(threeJsService);
    developer.log('App sync helper initialized', name: 'AppSyncHelper');
  }

  /// Get synchronized list of favorite apps that match 3D world state
  /// This should be used instead of direct AppService.loadFavoriteApps()
  /// when opening the Add Apps menu
  Future<List<AppInfo>> getSynchronizedFavoriteApps() async {
    try {
      // Process any pending sync operations first
      await _appSyncService.processPendingSyncOperations();

      // Get currently active apps (synchronized with 3D world)
      final activeApps = await _appSyncService.getCurrentlyActiveApps();

      developer.log(
        'Retrieved ${activeApps.length} synchronized favorite apps',
        name: 'AppSyncHelper',
      );

      return activeApps;
    } catch (e) {
      developer.log(
        'Error getting synchronized apps, using fallback: $e',
        name: 'AppSyncHelper',
      );
      // Fallback to regular favorites if sync fails
      return await _appService.loadFavoriteApps();
    }
  }

  /// Validate and fix any sync issues
  /// Call this when there might be sync problems
  Future<bool> validateAndFixSync() async {
    try {
      return await _appSyncService.validateAndFixSync();
    } catch (e) {
      developer.log('Error validating sync: $e', name: 'AppSyncHelper');
      return false;
    }
  }

  /// Get detailed sync status for debugging
  Future<Map<String, dynamic>> getSyncStatus() async {
    return await _appSyncService.getSyncStatus();
  }

  /// Process pending sync operations manually
  /// Useful to call before opening Add Apps menu
  Future<void> processPendingOperations() async {
    await _appSyncService.processPendingSyncOperations();
  }

  /// Check if a specific app is active in the 3D world
  Future<bool> isAppActiveInWorld(String packageName) async {
    return await _appSyncService.isAppActiveInWorld(packageName);
  }

  /// Force synchronization of favorites with 3D world state
  Future<void> forceSyncWithWorld() async {
    await _appSyncService.syncFavoritesWithWorld();
  }

  /// Get the underlying app sync service for advanced operations
  AppSyncService get appSyncService => _appSyncService;
}
