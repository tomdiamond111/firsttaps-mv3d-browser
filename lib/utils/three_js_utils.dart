/// Utility methods for the ThreeJS screen that don't depend on state
class ThreeJsUtils {
  // ============================================================================
  // WORLD TYPE UTILITIES
  // ============================================================================

  /// Get display name for a world type
  static String getWorldDisplayName(String worldType) {
    // Basic world type display names
    const worldDisplayNames = {
      'green-plane': 'Green Plane',
      'beach': 'Beach',
      'desert': 'Desert',
      'forest': 'Forest',
      'snow': 'Snow',
      'cave': 'Cave',
      'space': 'Space',
      'underwater': 'Underwater',
    };
    return worldDisplayNames[worldType] ?? 'Unknown World';
  }
}
