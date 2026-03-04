import 'package:flutter/material.dart';

/// Constants used in the ThreeJS screen for timeouts, durations, colors, and other configuration values
class ThreeJsConstants {
  // ============================================================================
  // TIMING CONSTANTS
  // ============================================================================

  /// Duration for showing snack bar messages
  static const Duration snackBarDuration = Duration(seconds: 2);

  /// Duration for showing axis menu timeout before auto-hide
  static const Duration axisMenuTimeout = Duration(seconds: 3);

  /// Short delay for various operations (100ms)
  static const Duration shortDelay = Duration(milliseconds: 100);

  /// Medium delay for operations (200ms)
  static const Duration mediumDelay = Duration(milliseconds: 200);

  /// Long delay for operations (500ms)
  static const Duration longDelay = Duration(milliseconds: 500);

  /// Extra long delay for operations (800ms)
  static const Duration extraLongDelay = Duration(milliseconds: 800);

  /// Maximum delay for operations (1200ms)
  static const Duration maxDelay = Duration(milliseconds: 1200);

  // ============================================================================
  // COLOR CONSTANTS
  // ============================================================================

  /// Background color for the WebView (transparent)
  static const Color webViewBackgroundColor = Color(0x00000000);

  /// Primary blue color for UI elements
  static const Color primaryBlue = Colors.blue;

  /// Success green color for UI elements
  static const Color successGreen = Colors.green;

  /// White color for icons and text
  static const Color iconWhite = Colors.white;

  /// Selected state color (blue)
  static const Color selectedColor = Colors.blue;

  /// Unselected state color (grey)
  static const Color unselectedColor = Colors.grey;

  /// Selected background color (light blue)
  static Color selectedBackgroundColor = Colors.blue.shade50;

  /// Selected text color (dark blue)
  static Color selectedTextColor = Colors.blue.shade800;

  /// Unselected icon color (grey shade)
  static Color unselectedIconColor = Colors.grey.shade300;

  /// Unselected text color (dark grey)
  static Color unselectedTextColor = Colors.grey.shade600;

  // ============================================================================
  // WORLD TYPE CONSTANTS
  // ============================================================================

  /// Green plane world type identifier
  static const String worldTypeGreenPlane = 'green-plane';

  /// Space world type identifier
  static const String worldTypeSpace = 'space';

  /// Ocean world type identifier
  static const String worldTypeOcean = 'ocean';

  // ============================================================================
  // AXIS CONSTANTS
  // ============================================================================

  /// Horizontal axis identifier
  static const String axisHorizontal = 'Horizontal';

  /// Vertical axis identifier
  static const String axisVertical = 'Vertical';

  // ============================================================================
  // DISPLAY NAME MAPPINGS
  // ============================================================================

  /// Map of world types to their display names
  static const Map<String, String> worldDisplayNames = {
    worldTypeGreenPlane: 'Green Plane',
    worldTypeSpace: 'Space',
    worldTypeOcean: 'Ocean',
  };

  /// Map of axis types to their display names
  static const Map<String, String> axisDisplayNames = {
    axisHorizontal: 'Horizontal Movement',
    axisVertical: 'Vertical Movement',
  };

  /// Map of axis types to their icons
  static const Map<String, IconData> axisIcons = {
    axisHorizontal: Icons.open_with,
    axisVertical: Icons.height,
  };

  /// Map of world types to their icons
  static const Map<String, IconData> worldIcons = {
    worldTypeGreenPlane: Icons.grass,
    worldTypeSpace: Icons.star,
    worldTypeOcean: Icons.waves,
  };

  // ============================================================================
  // DEFAULT VALUES
  // ============================================================================

  /// Default icon for unknown axis
  static const IconData defaultAxisIcon = Icons.control_camera;

  /// Default display name for unknown axis
  static const String defaultAxisDisplayName = 'Unknown Axis';

  /// Default display name for unknown world
  static const String defaultWorldDisplayName = 'Unknown World';

  /// Default search icon
  static const IconData searchIcon = Icons.search;

  /// Default check icon
  static const IconData checkIcon = Icons.check_circle;

  /// Default home icon
  static const IconData homeIcon = Icons.home;
}
