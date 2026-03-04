import 'package:flutter/material.dart';
import 'dart:developer' as developer;
import '../services/app_service.dart';
import '../widgets/app_picker_dialog.dart';

/// Service for handling the Add Apps menu with optimized loading
/// Pre-loads apps in background and provides instant popup display
class AppMenuService {
  final AppService _appService;

  /// Cache status to track if apps are pre-loaded
  bool _isPreloading = false;
  bool _isPreloaded = false;
  bool _isPaused = false;
  DateTime? _lastPreloadTime;

  AppMenuService(this._appService);

  /// Pre-load apps in background for instant menu display
  Future<void> preloadApps() async {
    if (_isPreloading || _isPreloaded || _isPaused) {
      developer.log(
        'Apps already preloading/preloaded/paused, skipping',
        name: 'AppMenuService',
      );
      return;
    }

    try {
      _isPreloading = true;
      developer.log(
        '🔄 Pre-loading apps for faster menu...',
        name: 'AppMenuService',
      );

      final stopwatch = Stopwatch()..start();
      final apps = await _appService.getInstalledApps();
      stopwatch.stop();

      _isPreloaded = true;
      _lastPreloadTime = DateTime.now();

      developer.log(
        '✅ Pre-loaded ${apps.length} apps in ${stopwatch.elapsedMilliseconds}ms',
        name: 'AppMenuService',
      );
    } catch (e) {
      developer.log('⚠️ App pre-loading failed: $e', name: 'AppMenuService');
    } finally {
      _isPreloading = false;
    }
  }

  /// Gradual app preloading that spreads the work over time to avoid freezing 3D world
  Future<void> preloadAppsGradually({int totalDurationSeconds = 30}) async {
    if (_isPreloading || _isPreloaded || _isPaused) {
      developer.log(
        'Apps already preloading/preloaded/paused, skipping gradual preload',
        name: 'AppMenuService',
      );
      return;
    }

    try {
      _isPreloading = true;
      developer.log(
        '🐌 Starting gradual app preloading over ${totalDurationSeconds}s...',
        name: 'AppMenuService',
      );

      final stopwatch = Stopwatch()..start();

      // Load apps with intentional delays to avoid blocking 3D world
      final apps = await _loadAppsWithDelays(totalDurationSeconds);

      stopwatch.stop();

      _isPreloaded = true;
      _lastPreloadTime = DateTime.now();

      developer.log(
        '✅ Gradually pre-loaded ${apps.length} apps in ${stopwatch.elapsedMilliseconds}ms (spread over ${totalDurationSeconds}s)',
        name: 'AppMenuService',
      );
    } catch (e) {
      developer.log(
        '⚠️ Gradual app pre-loading failed: $e',
        name: 'AppMenuService',
      );
    } finally {
      _isPreloading = false;
    }
  }

  /// Load apps with intentional delays to spread CPU usage over time
  Future<List<AppInfo>> _loadAppsWithDelays(int totalDurationSeconds) async {
    // First, try a very quick initial check to see if we have cached apps
    try {
      developer.log(
        '⚡ Checking for cached apps first...',
        name: 'AppMenuService',
      );

      // Quick cache check - if apps are already cached, this should be fast
      final quickApps = await _appService.getInstalledApps();

      developer.log(
        '⚡ Apps loaded from cache quickly (${quickApps.length} apps), no gradual loading needed',
        name: 'AppMenuService',
      );
      return quickApps;
    } catch (e) {
      // If quick load fails, fall back to gradual loading
      developer.log(
        '🔄 Cache miss or error, performing gradual app loading: $e',
        name: 'AppMenuService',
      );
    }

    // If we get here, we need to do the heavy app loading
    // We'll break this into phases with generous delays
    const int numberOfPhases = 10; // More phases = more granular
    final int delayBetweenPhases =
        (totalDurationSeconds * 1000) ~/ numberOfPhases;

    developer.log(
      '📊 Gradual loading: ${numberOfPhases} phases with ${delayBetweenPhases}ms delays',
      name: 'AppMenuService',
    );

    // Phase 1-8: Just waiting and yielding to UI thread
    for (int i = 0; i < numberOfPhases - 2; i++) {
      developer.log(
        '⏱️ Phase ${i + 1}/${numberOfPhases} - yielding to UI thread...',
        name: 'AppMenuService',
      );

      await Future.delayed(Duration(milliseconds: delayBetweenPhases));

      // Check if we've been paused or should stop
      if (_isPaused) {
        developer.log('⏸️ Gradual preloading paused', name: 'AppMenuService');
        throw Exception('Preloading paused');
      }
    }

    // Phase 9: Prepare for app loading
    developer.log(
      '🚀 Phase ${numberOfPhases - 1}/${numberOfPhases} - preparing for app loading...',
      name: 'AppMenuService',
    );
    await Future.delayed(Duration(milliseconds: delayBetweenPhases));

    if (_isPaused) {
      throw Exception('Preloading paused');
    }

    // Phase 10: Actually load the apps (this is the heavy operation)
    developer.log(
      '💪 Phase ${numberOfPhases}/${numberOfPhases} - loading apps from system...',
      name: 'AppMenuService',
    );

    final apps = await _loadAppsWithYieldPoints();
    return apps;
  }

  /// Load apps with yield points to prevent UI blocking
  Future<List<AppInfo>> _loadAppsWithYieldPoints() async {
    // This method will call the AppService but add yield points during processing
    developer.log(
      '🔄 Loading apps with UI yield points...',
      name: 'AppMenuService',
    );

    // Add a small delay before the heavy operation
    await Future.delayed(const Duration(milliseconds: 50));

    // Call the app service (this is still the bottleneck but now isolated)
    final apps = await _appService.getInstalledApps();

    // Add a small delay after the heavy operation to let UI catch up
    await Future.delayed(const Duration(milliseconds: 50));

    developer.log(
      '✅ Apps loaded with yield points: ${apps.length} apps',
      name: 'AppMenuService',
    );
    return apps;
  }

  /// Pause preloading (when 3D world is loading)
  void pausePreloading() {
    _isPaused = true;
    developer.log(
      '⏸️ App preloading paused for 3D world loading',
      name: 'AppMenuService',
    );
  }

  /// Resume preloading after a delay (when 3D world has loaded)
  Future<void> resumePreloadingAfterDelay([int delaySeconds = 5]) async {
    _isPaused = false;
    developer.log(
      '▶️ App preloading resumed after ${delaySeconds}s delay',
      name: 'AppMenuService',
    );

    // Wait the specified delay, then start gradual preloading if not already done
    await Future.delayed(Duration(seconds: delaySeconds));

    if (!_isPreloaded && !_isPreloading) {
      // Increased duration to 60 seconds for even more gradual loading
      await preloadAppsGradually(totalDurationSeconds: 60);
    }
  }

  /// Show the app picker dialog with optimized loading
  /// If apps are pre-loaded, shows instantly. Otherwise shows with minimal delay.
  Future<void> showAppMenu(
    BuildContext context,
    Function(List<AppInfo>) onAppsSelected,
  ) async {
    if (!context.mounted) return;

    try {
      developer.log('📱 Opening Add Apps menu...', name: 'AppMenuService');

      final stopwatch = Stopwatch()..start();

      // Load apps (should be fast if pre-loaded)
      final apps = await _appService.getInstalledApps();
      final favoriteApps = await _appService.loadFavoriteApps();

      stopwatch.stop();

      developer.log(
        'Apps loaded in ${stopwatch.elapsedMilliseconds}ms (preloaded: $_isPreloaded)',
        name: 'AppMenuService',
      );

      if (apps.isEmpty) {
        _showMessage(context, 'No apps found');
        return;
      }

      if (!context.mounted) {
        developer.log('Context no longer mounted', name: 'AppMenuService');
        return;
      }

      // Show app picker dialog immediately
      await showAppPickerDialog(context, apps, favoriteApps, onAppsSelected);
    } catch (e) {
      developer.log('Error showing app menu: $e', name: 'AppMenuService');
      _showMessage(context, 'Error loading apps: ${e.toString()}');
    }
  }

  /// Check if apps need to be refreshed (cache expiration)
  bool get needsRefresh {
    if (!_isPreloaded || _lastPreloadTime == null) return true;

    final timeSincePreload = DateTime.now().difference(_lastPreloadTime!);
    return timeSincePreload.inMinutes > 10; // Refresh after 10 minutes
  }

  /// Force refresh the app cache
  Future<void> refreshApps() async {
    _isPreloaded = false;
    _lastPreloadTime = null;
    await preloadApps();
  }

  /// Get preload status for debugging
  Map<String, dynamic> get status => {
    'isPreloading': _isPreloading,
    'isPreloaded': _isPreloaded,
    'isPaused': _isPaused,
    'lastPreloadTime': _lastPreloadTime?.toIso8601String(),
    'needsRefresh': needsRefresh,
  };

  /// Show a simple message to the user
  void _showMessage(BuildContext context, String message) {
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    }
  }
}
