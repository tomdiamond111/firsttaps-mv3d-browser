import 'package:flutter/material.dart';
import '../constants/three_js_constants.dart';

/// Utility methods for the ThreeJS screen that don't depend on state
class ThreeJsUtils {
  // ============================================================================
  // WORLD TYPE UTILITIES
  // ============================================================================

  /// Get display name for a world type
  static String getWorldDisplayName(String worldType) {
    return ThreeJsConstants.worldDisplayNames[worldType] ??
        ThreeJsConstants.defaultWorldDisplayName;
  }

  /// Get icon for a world type
  static IconData getWorldIcon(String worldType) {
    return ThreeJsConstants.worldIcons[worldType] ?? Icons.help_outline;
  }

  // ============================================================================
  // AXIS TYPE UTILITIES
  // ============================================================================

  /// Get display name for an axis
  static String getAxisDisplayName(String axis) {
    return ThreeJsConstants.axisDisplayNames[axis] ??
        ThreeJsConstants.defaultAxisDisplayName;
  }

  /// Get icon for an axis
  static IconData getAxisIcon(String axis) {
    return ThreeJsConstants.axisIcons[axis] ?? ThreeJsConstants.defaultAxisIcon;
  }

  // ============================================================================
  // COLOR UTILITIES
  // ============================================================================

  /// Get selected state color for UI elements
  static Color getSelectedColor(bool isSelected) {
    return isSelected
        ? ThreeJsConstants.selectedColor
        : ThreeJsConstants.unselectedColor;
  }

  /// Get selected background color for UI elements
  static Color? getSelectedBackgroundColor(bool isSelected) {
    return isSelected ? ThreeJsConstants.selectedBackgroundColor : null;
  }

  /// Get selected text color for UI elements
  static Color? getSelectedTextColor(bool isSelected) {
    return isSelected ? ThreeJsConstants.selectedTextColor : null;
  }

  /// Get selected icon color for UI elements
  static Color getSelectedIconColor(bool isSelected) {
    return isSelected
        ? ThreeJsConstants.selectedColor
        : ThreeJsConstants.unselectedIconColor;
  }

  /// Get selected text color for display
  static Color getSelectedDisplayTextColor(bool isSelected) {
    return isSelected
        ? ThreeJsConstants.selectedColor
        : ThreeJsConstants.unselectedTextColor;
  }

  // ============================================================================
  // VALIDATION UTILITIES
  // ============================================================================

  /// Check if a world type is valid
  static bool isValidWorldType(String worldType) {
    return ThreeJsConstants.worldDisplayNames.containsKey(worldType);
  }

  /// Check if an axis type is valid
  static bool isValidAxisType(String axis) {
    return ThreeJsConstants.axisDisplayNames.containsKey(axis);
  }

  // ============================================================================
  // FORMAT UTILITIES
  // ============================================================================

  /// Format a search results message
  static String formatSearchResultsMessage(int resultsCount, String query) {
    return 'Found $resultsCount result${resultsCount == 1 ? '' : 's'} for "$query"';
  }

  /// Format a world switching message
  static String formatWorldSwitchingMessage(String worldType) {
    return 'Switching to ${getWorldDisplayName(worldType)}...';
  }

  /// Format a world switched message
  static String formatWorldSwitchedMessage(String worldType) {
    return 'Switched to ${getWorldDisplayName(worldType)}';
  }

  /// Format movement mode display text
  static String formatMovementModeText(String axis) {
    return 'Movement Mode: ${getAxisDisplayName(axis)}';
  }
}
