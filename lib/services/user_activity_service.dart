/// Stub for user_activity_service (browser version)
/// Tracks user activity for analytics purposes

import 'package:shared_preferences/shared_preferences.dart';

class UserActivityService {
  static const String _keyLastActive = 'user_last_active';
  static const String _keySessionCount = 'user_session_count';
  static const String _keyTotalTime = 'user_total_time';

  // Singleton instance
  static final UserActivityService instance = UserActivityService._();

  UserActivityService._();

  static Future<void> recordActivity(String activityType) async {
    // No-op for web - can implement analytics later
    print('UserActivityService: $activityType');
  }

  static Future<void> startSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyLastActive, DateTime.now().toIso8601String());
    final sessionCount = prefs.getInt(_keySessionCount) ?? 0;
    await prefs.setInt(_keySessionCount, sessionCount + 1);
  }

  static Future<void> endSession() async {
    // No-op for web
  }

  static Future<int> getSessionCount() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_keySessionCount) ?? 0;
  }

  static Future<DateTime?> getLastActive() async {
    final prefs = await SharedPreferences.getInstance();
    final lastActive = prefs.getString(_keyLastActive);
    if (lastActive != null) {
      return DateTime.parse(lastActive);
    }
    return null;
  }

  Future<List<String>> getHiddenLinkUrls() async {
    // Return empty list for web
    return [];
  }
}
