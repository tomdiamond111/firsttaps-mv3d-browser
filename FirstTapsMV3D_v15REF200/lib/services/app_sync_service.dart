import 'dart:developer' as developer;
import 'package:firsttaps_mv3d/services/app_service.dart';
import 'package:firsttaps_mv3d/services/three_js_interop_service.dart';

/// Service for synchronizing app selection state between Flutter menu and 3D world
///
/// This service provides:
/// - Real-time sync of app favorites with 3D world state
/// - Detection of apps deleted/restored in 3D world
/// - Menu state validation and correction
///
/// Mirrors the contact sync system architecture
class AppSyncService {
  final AppService _appService;
  ThreeJsInteropService? _threeJsInteropService;

  AppSyncService({required AppService appService}) : _appService = appService;

  /// Set the Three.js interop service for communication with JavaScript
  void setThreeJsInteropService(ThreeJsInteropService service) {
    _threeJsInteropService = service;
    developer.log(
      'App sync service connected to Three.js',
      name: 'AppSyncService',
    );
  }

  /// Get list of apps currently active in the 3D world
  /// Returns synchronized list that matches what's actually in the 3D world
  Future<List<AppInfo>> getCurrentlyActiveApps() async {
    if (_threeJsInteropService == null) {
      developer.log(
        'Three.js service not available, using cached favorites',
        name: 'AppSyncService',
      );
      return await _appService.loadFavoriteApps();
    }

    try {
      // Get active app package names from 3D world
      final result = await _threeJsInteropService!.evaluateJavaScript(
        'window.getActiveAppPackageNames ? window.getActiveAppPackageNames() : []',
      );

      List<String> activePackageNames = [];
      if (result is List) {
        activePackageNames = result.cast<String>();
      }

      developer.log(
        'Found ${activePackageNames.length} active apps in 3D world: $activePackageNames',
        name: 'AppSyncService',
      );

      // Get current favorites and filter to only those active in 3D world
      final currentFavorites = await _appService.loadFavoriteApps();

      final syncedApps = currentFavorites
          .where((app) => activePackageNames.contains(app.packageName))
          .toList();

      developer.log(
        'Synchronized ${syncedApps.length} apps from ${currentFavorites.length} favorites',
        name: 'AppSyncService',
      );

      return syncedApps;
    } catch (e) {
      developer.log(
        'Error getting currently active apps: $e',
        name: 'AppSyncService',
      );
      // Fallback to cached favorites
      return await _appService.loadFavoriteApps();
    }
  }

  /// Check if a specific app is active in the 3D world
  Future<bool> isAppActiveInWorld(String packageName) async {
    if (_threeJsInteropService == null) return false;

    try {
      final result = await _threeJsInteropService!.evaluateJavaScript(
        'window.isAppActive ? window.isAppActive("$packageName") : false',
      );

      return result == true;
    } catch (e) {
      developer.log(
        'Error checking if app is active: $e',
        name: 'AppSyncService',
      );
      return false;
    }
  }

  /// Synchronize favorites list with 3D world state
  /// Removes apps from favorites that are no longer in 3D world
  Future<void> syncFavoritesWithWorld() async {
    try {
      final currentlyActiveApps = await getCurrentlyActiveApps();
      final allFavorites = await _appService.loadFavoriteApps();

      // Check if sync is needed
      if (currentlyActiveApps.length == allFavorites.length) {
        // Verify all favorites are still active
        final allActive = await Future.wait(
          allFavorites.map((app) => isAppActiveInWorld(app.packageName)),
        );

        if (allActive.every((active) => active)) {
          developer.log(
            'App favorites already in sync',
            name: 'AppSyncService',
          );
          return;
        }
      }

      // Update favorites to match 3D world state
      await _appService.saveFavoriteApps(currentlyActiveApps);

      developer.log(
        'Synchronized app favorites: removed ${allFavorites.length - currentlyActiveApps.length} inactive apps',
        name: 'AppSyncService',
      );
    } catch (e) {
      developer.log(
        'Error synchronizing favorites with world: $e',
        name: 'AppSyncService',
      );
    }
  }

  /// Check for pending app deletions from 3D world and process them
  Future<void> processPendingDeletions() async {
    if (_threeJsInteropService == null) return;

    try {
      // Check for pending deletion flag set by JavaScript
      final result = await _threeJsInteropService!.evaluateJavaScript(
        'window.lastDeletedAppForMenuSync || null',
      );

      if (result != null && result is Map) {
        final packageName = result['packageName'] as String?;
        final appName = result['name'] as String?;

        if (packageName != null) {
          developer.log(
            'Processing pending app deletion: $packageName ($appName)',
            name: 'AppSyncService',
          );

          // Remove from favorites
          await removeAppFromFavorites(packageName);

          // Clear the pending flag
          await _threeJsInteropService!.evaluateJavaScript(
            'window.lastDeletedAppForMenuSync = null',
          );

          developer.log(
            '✅ Processed app deletion sync: $packageName',
            name: 'AppSyncService',
          );
        }
      }
    } catch (e) {
      developer.log(
        'Error processing pending deletions: $e',
        name: 'AppSyncService',
      );
    }
  }

  /// Check for pending app restorations from 3D world and process them
  Future<void> processPendingRestorations() async {
    if (_threeJsInteropService == null) return;

    try {
      // Check for pending restoration flag set by JavaScript
      final result = await _threeJsInteropService!.evaluateJavaScript(
        'window.lastRestoredAppForMenuSync || null',
      );

      if (result != null && result is Map) {
        final packageName = result['packageName'] as String?;
        final appName = result['name'] as String?;

        if (packageName != null && appName != null) {
          developer.log(
            'Processing pending app restoration: $packageName ($appName)',
            name: 'AppSyncService',
          );

          // Add to favorites
          await addAppToFavorites(packageName, appName);

          // Clear the pending flag
          await _threeJsInteropService!.evaluateJavaScript(
            'window.lastRestoredAppForMenuSync = null',
          );

          developer.log(
            '✅ Processed app restoration sync: $packageName',
            name: 'AppSyncService',
          );
        }
      }
    } catch (e) {
      developer.log(
        'Error processing pending restorations: $e',
        name: 'AppSyncService',
      );
    }
  }

  /// Remove an app from favorites list
  Future<void> removeAppFromFavorites(String packageName) async {
    try {
      final currentFavorites = await _appService.loadFavoriteApps();
      final updatedFavorites = currentFavorites
          .where((app) => app.packageName != packageName)
          .toList();

      if (updatedFavorites.length != currentFavorites.length) {
        await _appService.saveFavoriteApps(updatedFavorites);
        developer.log(
          'Removed app $packageName from favorites. ${currentFavorites.length - updatedFavorites.length} apps removed.',
          name: 'AppSyncService',
        );
      }
    } catch (e) {
      developer.log(
        'Error removing app from favorites: $e',
        name: 'AppSyncService',
      );
    }
  }

  /// Add an app to favorites list
  Future<void> addAppToFavorites(String packageName, String appName) async {
    try {
      final currentFavorites = await _appService.loadFavoriteApps();

      // Check if already in favorites
      final isAlreadyFavorite = currentFavorites.any(
        (app) => app.packageName == packageName,
      );

      if (isAlreadyFavorite) {
        developer.log(
          'App $packageName already in favorites',
          name: 'AppSyncService',
        );
        return;
      }

      // Add to favorites
      currentFavorites.add(
        AppInfo(
          id: packageName,
          name: appName,
          packageName: packageName,
          iconPath: null,
          isSystemApp: false,
        ),
      );

      await _appService.saveFavoriteApps(currentFavorites);
      developer.log(
        'Added app $packageName to favorites',
        name: 'AppSyncService',
      );
    } catch (e) {
      developer.log(
        'Error adding app to favorites: $e',
        name: 'AppSyncService',
      );
    }
  }

  /// Process all pending sync operations
  /// Call this periodically or when opening the Add Apps menu
  Future<void> processPendingSyncOperations() async {
    developer.log(
      'Processing pending app sync operations...',
      name: 'AppSyncService',
    );

    await processPendingDeletions();
    await processPendingRestorations();

    developer.log(
      'Finished processing pending app sync operations',
      name: 'AppSyncService',
    );
  }

  /// Get detailed sync status for debugging
  Future<Map<String, dynamic>> getSyncStatus() async {
    if (_threeJsInteropService == null) {
      return {
        'status': 'Three.js service not available',
        'activeApps': 0,
        'favoriteApps': (await _appService.loadFavoriteApps()).length,
        'isSynced': false,
      };
    }

    try {
      final result = await _threeJsInteropService!.evaluateJavaScript(
        'window.debugAppMenuSync ? window.debugAppMenuSync() : null',
      );

      final currentlyActiveApps = await getCurrentlyActiveApps();
      final allFavorites = await _appService.loadFavoriteApps();

      return {
        'status': 'Available',
        'activeApps': currentlyActiveApps.length,
        'favoriteApps': allFavorites.length,
        'isSynced': currentlyActiveApps.length == allFavorites.length,
        'jsDebugInfo': result,
        'activeAppPackages': currentlyActiveApps
            .map((app) => app.packageName)
            .toList(),
        'favoriteAppPackages': allFavorites
            .map((app) => app.packageName)
            .toList(),
      };
    } catch (e) {
      return {
        'status': 'Error: $e',
        'activeApps': 0,
        'favoriteApps': (await _appService.loadFavoriteApps()).length,
        'isSynced': false,
      };
    }
  }

  /// Validate and fix sync issues
  /// Returns true if fixes were applied
  Future<bool> validateAndFixSync() async {
    try {
      final syncStatus = await getSyncStatus();
      final isSynced = syncStatus['isSynced'] as bool;

      if (!isSynced) {
        developer.log(
          'App sync issues detected, fixing...',
          name: 'AppSyncService',
        );
        await syncFavoritesWithWorld();
        await processPendingSyncOperations();
        return true;
      }

      return false;
    } catch (e) {
      developer.log('Error validating sync: $e', name: 'AppSyncService');
      return false;
    }
  }
}
