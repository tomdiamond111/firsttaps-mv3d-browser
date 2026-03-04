import 'package:workmanager/workmanager.dart';
import '../managers/recommendation_furniture_manager.dart';
import '../database/recommendation_preferences_dao.dart';
import '../config/recommendations_config.dart';

/// Background task scheduler for recommendation updates
class RecommendationScheduler {
  static final RecommendationScheduler instance =
      RecommendationScheduler._init();

  RecommendationScheduler._init();

  /// Initialize background task scheduling
  Future<void> initialize() async {
    try {
      await Workmanager().initialize(
        callbackDispatcher,
        isInDebugMode: RecommendationsConfig.enableDebugLogging,
      );

      _logDebug('WorkManager initialized');

      // Schedule tasks
      await scheduleDailyUpdate();
      await scheduleWeeklyUpdate();

      _logDebug('Background tasks scheduled');
    } catch (e) {
      _logError('Error initializing scheduler: $e');
    }
  }

  /// Schedule daily content update (Gallery Wall shorts + Favorites)
  Future<void> scheduleDailyUpdate() async {
    try {
      await Workmanager().registerPeriodicTask(
        RecommendationsConfig.dailyUpdateTaskName,
        RecommendationsConfig.dailyUpdateTaskName,
        frequency: const Duration(hours: 24),
        initialDelay: const Duration(hours: 1),
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresBatteryNotLow: true,
        ),
        existingWorkPolicy: ExistingWorkPolicy.replace,
      );

      _logDebug('Daily update task scheduled');
    } catch (e) {
      _logError('Error scheduling daily update: $e');
    }
  }

  /// Schedule weekly content update (Music, Videos, Amphitheatre)
  Future<void> scheduleWeeklyUpdate() async {
    try {
      await Workmanager().registerPeriodicTask(
        RecommendationsConfig.weeklyUpdateTaskName,
        RecommendationsConfig.weeklyUpdateTaskName,
        frequency: const Duration(days: 7),
        initialDelay: const Duration(hours: 2),
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresBatteryNotLow: true,
        ),
        existingWorkPolicy: ExistingWorkPolicy.replace,
      );

      _logDebug('Weekly update task scheduled');
    } catch (e) {
      _logError('Error scheduling weekly update: $e');
    }
  }

  /// Cancel all scheduled tasks
  Future<void> cancelAllTasks() async {
    try {
      await Workmanager().cancelAll();
      _logDebug('All scheduled tasks cancelled');
    } catch (e) {
      _logError('Error cancelling tasks: $e');
    }
  }

  /// Cancel specific task
  Future<void> cancelTask(String taskName) async {
    try {
      await Workmanager().cancelByUniqueName(taskName);
      _logDebug('Task cancelled: $taskName');
    } catch (e) {
      _logError('Error cancelling task $taskName: $e');
    }
  }

  /// Check if tasks are enabled based on preferences
  Future<bool> shouldRunTasks() async {
    try {
      final preferencesDao = RecommendationPreferencesDao();
      final prefs = await preferencesDao.get();
      return prefs.enabled && RecommendationsConfig.enableRecommendations;
    } catch (e) {
      _logError('Error checking if tasks should run: $e');
      return false;
    }
  }

  void _logDebug(String message) {
    if (RecommendationsConfig.enableDebugLogging) {
      print('[RecommendationScheduler] $message');
    }
  }

  void _logError(String message) {
    print('[RecommendationScheduler ERROR] $message');
  }
}

/// Background task callback dispatcher
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      print('[Background] Executing task: $task');

      final scheduler = RecommendationScheduler.instance;

      // Check if recommendations are enabled
      if (!await scheduler.shouldRunTasks()) {
        print('[Background] Recommendations disabled, skipping task');
        return Future.value(true);
      }

      final furnitureManager = RecommendationFurnitureManager();

      switch (task) {
        case RecommendationsConfig.dailyUpdateTaskName:
          print('[Background] Running daily update...');
          await furnitureManager.executeDailyUpdate();
          print('[Background] Daily update complete');
          break;

        case RecommendationsConfig.weeklyUpdateTaskName:
          print('[Background] Running weekly update...');
          await furnitureManager.executeWeeklyUpdate();
          print('[Background] Weekly update complete');
          break;

        default:
          print('[Background] Unknown task: $task');
      }

      return Future.value(true);
    } catch (e) {
      print('[Background ERROR] Task failed: $e');
      return Future.value(false);
    }
  });
}
