// lib/config/ad_config.dart

/// Configuration for AdMob banner ads
/// Toggle showBannerAds to control ad visibility globally
class AdConfig {
  /// Master switch for banner ads
  /// Set to false to disable ads during promotions or special events
  static const bool showBannerAds = true; // ⬅️ Change to false to disable ads

  /// Test mode - uses AdMob test ad units
  /// Set to false before production release
  static const bool useTestAds = false; // ✅ Production mode enabled

  /// Ad Unit IDs - PRODUCTION
  static const String androidBannerAdUnitId =
      'ca-app-pub-1963756646352121/7704521467'; // Production Banner Ad Unit
  static const String iosBannerAdUnitId =
      'ca-app-pub-3940256099942544/2934735716'; // Test ID (update when iOS app is created)

  /// Get the appropriate ad unit ID for the current platform
  static String getBannerAdUnitId() {
    // In production, this would use Platform.isAndroid/Platform.isIOS
    // For now, using test ads for both platforms
    return androidBannerAdUnitId;
  }
}
