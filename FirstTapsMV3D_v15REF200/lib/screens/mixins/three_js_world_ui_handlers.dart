import 'package:flutter/material.dart';
import '../../services/three_js_interop_service.dart';
import '../../services/world_persistence_service.dart';

/// Mixin containing all world UI and management functionality for ThreeJsScreen
///
/// This mixin provides:
/// - World selection dialog UI
/// - World option building
/// - World display name handling
/// - World switching functionality
///
/// CRITICAL: All methods preserved exactly as original - no functionality changes
mixin ThreeJsWorldUIHandlers<T extends StatefulWidget> on State<T> {
  // Required getters that the main class must provide
  ThreeJsInteropService get threeJsInteropService;
  String get currentWorldType;

  // Required callback methods that the main class must provide
  void setCurrentWorldType(String worldType);

  /// Helper method to get display name for world types
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  String getWorldDisplayName(String worldType) {
    switch (worldType) {
      case 'green-plane':
        return 'Green Plane';
      case 'space':
        return 'Space';
      case 'ocean':
        return 'Ocean';
      default:
        return 'Unknown World';
    }
  }

  /// Method to show world selection dialog
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  void showWorldSwitchDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Select World Template'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                buildWorldOption(
                  'green-plane',
                  'Green Plane',
                  'Simple flat green surface',
                  Icons.grass,
                ),
                buildWorldOption(
                  'space',
                  'Space',
                  'Cosmic environment with stars',
                  Icons.star,
                ),
                buildWorldOption(
                  'ocean',
                  'Ocean',
                  'Underwater environment',
                  Icons.waves,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }

  /// Helper method to build world selection options
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  Widget buildWorldOption(
    String worldType,
    String title,
    String description,
    IconData icon,
  ) {
    final bool isSelected = currentWorldType == worldType;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        border: Border.all(
          color: isSelected ? Colors.blue : Colors.grey.shade300,
          width: isSelected ? 2 : 1,
        ),
        borderRadius: BorderRadius.circular(8),
        color: isSelected ? Colors.blue.shade50 : null,
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isSelected ? Colors.blue : Colors.grey.shade600,
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? Colors.blue.shade800 : null,
          ),
        ),
        subtitle: Text(
          description,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12,
            color: isSelected ? Colors.blue.shade600 : Colors.grey.shade600,
          ),
        ),
        trailing: isSelected
            ? const Icon(Icons.check_circle, color: Colors.blue)
            : null,
        onTap: () async {
          if (worldType != currentWorldType) {
            Navigator.of(context).pop();
            await switchToWorld(worldType);
          }
        },
      ),
    );
  }

  /// Method to switch to a different world
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  Future<void> switchToWorld(String worldType) async {
    try {
      // Show loading indicator
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 12),
                Text('Switching to ${getWorldDisplayName(worldType)}...'),
              ],
            ),
            duration: const Duration(seconds: 2),
          ),
        );
      }

      // Call the JavaScript function to switch worlds
      await threeJsInteropService.switchWorldTemplate(worldType);

      // Update the current world type
      setCurrentWorldType(worldType);

      // Save the new world template to persistent storage for next app launch
      await WorldPersistenceService.saveLastWorldTemplate(worldType);
      print(
        'ThreeJsWorldUIHandlers: Saved world template to persistence: $worldType',
      );

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 12),
                Text('Switched to ${getWorldDisplayName(worldType)}'),
              ],
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error, color: Colors.white),
                const SizedBox(width: 12),
                Text('Failed to switch world: $e'),
              ],
            ),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }
}
