import 'package:shared_preferences/shared_preferences.dart';
import 'dart:developer' as developer;

/// Service for managing YouTube API quota with persistent storage
/// Ensures quota tracking survives app restarts and prevents quota bypass
class YouTubeQuotaService {
  // SharedPreferences keys
  static const String _quotaUsedKey = 'youtube_quota_used';
  static const String _lastResetDateKey = 'youtube_quota_last_reset';
  static const String _quotaLimitKey = 'youtube_quota_limit';

  // YouTube API quota limits
  static const int defaultDailyQuotaLimit = 10000; // YouTube free tier
  static const int searchCost = 100; // Cost per search operation

  // Singleton instance
  static final YouTubeQuotaService _instance = YouTubeQuotaService._internal();
  factory YouTubeQuotaService() => _instance;
  YouTubeQuotaService._internal();

  SharedPreferences? _prefs;

  /// Initialize the service and load persisted quota data
  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    await _checkAndResetQuotaIfNeeded();
    developer.log(
      'YouTubeQuotaService initialized. Current usage: ${await getQuotaUsed()}/${await getQuotaLimit()}',
      name: 'YouTubeQuotaService',
    );
  }

  /// Get current quota used
  Future<int> getQuotaUsed() async {
    await _ensureInitialized();
    return _prefs!.getInt(_quotaUsedKey) ?? 0;
  }

  /// Get quota limit
  Future<int> getQuotaLimit() async {
    await _ensureInitialized();
    return _prefs!.getInt(_quotaLimitKey) ?? defaultDailyQuotaLimit;
  }

  /// Get remaining quota
  Future<int> getRemainingQuota() async {
    final used = await getQuotaUsed();
    final limit = await getQuotaLimit();
    return limit - used;
  }

  /// Check if quota is available for an operation
  Future<bool> hasQuotaAvailable(int cost) async {
    final remaining = await getRemainingQuota();
    return remaining >= cost;
  }

  /// Consume quota for an operation
  /// Returns true if quota was consumed, false if quota exceeded
  Future<bool> consumeQuota(int cost) async {
    await _ensureInitialized();

    // Check and reset if needed
    await _checkAndResetQuotaIfNeeded();

    // Check if quota is available
    if (!await hasQuotaAvailable(cost)) {
      developer.log(
        'Quota exceeded! Requested: $cost, Remaining: ${await getRemainingQuota()}',
        name: 'YouTubeQuotaService',
      );
      return false;
    }

    // Consume quota
    final currentUsage = await getQuotaUsed();
    final newUsage = currentUsage + cost;
    await _prefs!.setInt(_quotaUsedKey, newUsage);

    developer.log(
      'Quota consumed: $cost units. Total: $newUsage/${await getQuotaLimit()}',
      name: 'YouTubeQuotaService',
    );

    return true;
  }

  /// Get last reset date
  Future<DateTime?> getLastResetDate() async {
    await _ensureInitialized();
    final timestamp = _prefs!.getInt(_lastResetDateKey);
    return timestamp != null
        ? DateTime.fromMillisecondsSinceEpoch(timestamp)
        : null;
  }

  /// Get time until next quota reset (midnight Pacific Time)
  Future<Duration> getTimeUntilReset() async {
    final now = DateTime.now();
    // Convert to Pacific Time (approximation: UTC-8 or UTC-7 for PDT)
    final pacificOffset = Duration(hours: -8);
    final nowPacific = now.toUtc().add(pacificOffset);

    // Calculate next midnight Pacific
    var nextMidnight = DateTime(
      nowPacific.year,
      nowPacific.month,
      nowPacific.day + 1,
    );

    // Convert back to local time
    final nextResetLocal = nextMidnight.subtract(pacificOffset).toLocal();
    return nextResetLocal.difference(now);
  }

  /// Check if quota should be reset (at midnight Pacific Time)
  Future<bool> _checkAndResetQuotaIfNeeded() async {
    await _ensureInitialized();

    final now = DateTime.now();
    final lastReset = await getLastResetDate();

    // Reset if:
    // 1. Never reset before
    // 2. Different day (midnight Pacific Time check)
    if (lastReset == null || !_isSameDay(lastReset, now)) {
      await _resetQuota();
      return true;
    }

    return false;
  }

  /// Reset quota to zero (called at midnight Pacific Time)
  Future<void> _resetQuota() async {
    await _ensureInitialized();

    await _prefs!.setInt(_quotaUsedKey, 0);
    await _prefs!.setInt(
      _lastResetDateKey,
      DateTime.now().millisecondsSinceEpoch,
    );

    developer.log('Quota reset for new day', name: 'YouTubeQuotaService');
  }

  /// Manually reset quota (for testing or admin purposes)
  Future<void> manualReset() async {
    await _resetQuota();
    developer.log('Manual quota reset performed', name: 'YouTubeQuotaService');
  }

  /// Update quota limit (for when quota increase is granted)
  Future<void> setQuotaLimit(int newLimit) async {
    await _ensureInitialized();
    await _prefs!.setInt(_quotaLimitKey, newLimit);
    developer.log(
      'Quota limit updated to: $newLimit',
      name: 'YouTubeQuotaService',
    );
  }

  /// Get detailed quota status
  Future<Map<String, dynamic>> getQuotaStatus() async {
    final used = await getQuotaUsed();
    final limit = await getQuotaLimit();
    final remaining = await getRemainingQuota();
    final lastReset = await getLastResetDate();
    final timeUntilReset = await getTimeUntilReset();

    return {
      'used': used,
      'limit': limit,
      'remaining': remaining,
      'percentUsed': (used / limit * 100).toStringAsFixed(1),
      'lastResetDate': lastReset?.toIso8601String(),
      'timeUntilReset': {
        'hours': timeUntilReset.inHours,
        'minutes': timeUntilReset.inMinutes % 60,
        'seconds': timeUntilReset.inSeconds % 60,
      },
      'searchesRemaining': (remaining / searchCost).floor(),
    };
  }

  /// Check if two dates are the same day
  bool _isSameDay(DateTime date1, DateTime date2) {
    return date1.year == date2.year &&
        date1.month == date2.month &&
        date1.day == date2.day;
  }

  /// Ensure SharedPreferences is initialized
  Future<void> _ensureInitialized() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  /// Clear all quota data (for debugging)
  Future<void> clearQuotaData() async {
    await _ensureInitialized();
    await _prefs!.remove(_quotaUsedKey);
    await _prefs!.remove(_lastResetDateKey);
    await _prefs!.remove(_quotaLimitKey);
    developer.log('All quota data cleared', name: 'YouTubeQuotaService');
  }
}
