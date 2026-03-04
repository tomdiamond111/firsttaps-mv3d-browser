import 'package:shared_preferences/shared_preferences.dart';

/// Service for persisting world template state across app sessions
/// Handles saving and loading the last used world template and ensures
/// the app always restores to the most recently used world on startup
class WorldPersistenceService {
  static const String _lastWorldTemplateKey = 'last_world_template';
  static const String _defaultWorldTemplate = 'green-plane';

  /// Available world templates in the app
  static const List<String> availableWorlds = [
    'green-plane',
    'space',
    'ocean',
    // New MV3D media-focused worlds (Free)
    'record-store',
    'music-festival',
    'modern-gallery-clean',
    'modern-gallery-dark',
    'modern-gallery-warm',
    'future-car-gallery',
    // Premium worlds
    'dazzle', // Premium world - Dazzle Bedroom
    'forest', // Premium world - Forest Realm
    'cave', // Premium world - Cave Explorer
    'christmas', // Premium world - ChristmasLand
    'desert-oasis', // Premium world - Desert Oasis
    'tropical-paradise', // Premium world - Tropical Paradise
    'flower-wonderland', // Premium world - Flower Wonderland
  ];

  /// Save the current world template to persistent storage
  /// This is called whenever the user switches to a new world
  static Future<bool> saveLastWorldTemplate(String worldTemplate) async {
    try {
      // Validate that the world template is supported
      if (!availableWorlds.contains(worldTemplate)) {
        print(
          'WorldPersistenceService: Invalid world template: $worldTemplate',
        );
        return false;
      }

      final prefs = await SharedPreferences.getInstance();
      final success = await prefs.setString(
        _lastWorldTemplateKey,
        worldTemplate,
      );

      if (success) {
        print('WorldPersistenceService: Saved world template: $worldTemplate');
      } else {
        print(
          'WorldPersistenceService: Failed to save world template: $worldTemplate',
        );
      }

      return success;
    } catch (e) {
      print('WorldPersistenceService: Error saving world template: $e');
      return false;
    }
  }

  /// Load the last used world template from persistent storage
  /// Returns the default world template if no saved template exists
  static Future<String> loadLastWorldTemplate() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedTemplate = prefs.getString(_lastWorldTemplateKey);

      if (savedTemplate != null && availableWorlds.contains(savedTemplate)) {
        print(
          'WorldPersistenceService: Loaded saved world template: $savedTemplate',
        );
        return savedTemplate;
      } else {
        print(
          'WorldPersistenceService: No valid saved template, using default: $_defaultWorldTemplate',
        );
        return _defaultWorldTemplate;
      }
    } catch (e) {
      print(
        'WorldPersistenceService: Error loading world template, using default: $e',
      );
      return _defaultWorldTemplate;
    }
  }

  /// Check if a world template is valid
  static bool isValidWorldTemplate(String? worldTemplate) {
    return worldTemplate != null && availableWorlds.contains(worldTemplate);
  }

  /// Get the default world template
  static String getDefaultWorldTemplate() {
    return _defaultWorldTemplate;
  }

  /// Clear the saved world template (useful for testing or reset)
  static Future<bool> clearSavedWorldTemplate() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final success = await prefs.remove(_lastWorldTemplateKey);

      if (success) {
        print('WorldPersistenceService: Cleared saved world template');
      } else {
        print('WorldPersistenceService: Failed to clear saved world template');
      }

      return success;
    } catch (e) {
      print('WorldPersistenceService: Error clearing world template: $e');
      return false;
    }
  }

  /// Get a user-friendly display name for a world template
  static String getWorldDisplayName(String worldTemplate) {
    switch (worldTemplate) {
      case 'green-plane':
        return 'Green Plane';
      case 'space':
        return 'Space';
      case 'ocean':
        return 'Ocean';
      // New MV3D worlds
      case 'record-store':
        return 'Record Store';
      case 'music-festival':
        return 'Music Festival';
      case 'modern-gallery-clean':
        return 'Modern Gallery (Clean)';
      case 'modern-gallery-dark':
        return 'Modern Gallery (Dark)';
      case 'modern-gallery-warm':
        return 'Modern Gallery (Warm)';
      case 'future-car-gallery':
        return 'Car Gallery';
      // Premium worlds
      case 'dazzle':
        return 'Dazzle Bedroom';
      case 'forest':
        return 'Forest Realm';
      case 'cave':
        return 'Cave Explorer';
      case 'christmas':
        return 'ChristmasLand';
      case 'desert-oasis':
        return 'Desert Oasis';
      case 'tropical-paradise':
        return 'Tropical Paradise';
      case 'flower-wonderland':
        return 'Flower Wonderland';
      default:
        return worldTemplate.replaceAll('-', ' ').toUpperCase();
    }
  }
}
