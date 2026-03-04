/// Application Configuration
/// Central configuration for production vs development modes
class AppConfig {
  /// **PRODUCTION FLAG**
  /// Set to `false` to enable all testing features (scoreboard controls, premium toggles, etc.)
  /// Set to `true` to disable all testing features for public release
  ///
  /// This flag controls:
  /// - Premium gaming popup test toggle
  /// - Premium world test panel
  /// - Premium control panel visibility
  static const bool isProduction =
      false; // Change to false for development testing

  /// Whether to show testing toggles in premium gaming popup
  static bool get showPremiumGamingTestToggle => !isProduction;

  /// Whether to show premium control panel for testing
  static bool get showPremiumControlPanel => !isProduction;
}
