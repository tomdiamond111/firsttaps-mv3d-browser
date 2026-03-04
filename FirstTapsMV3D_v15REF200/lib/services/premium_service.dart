import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:developer' as developer;
import '../widgets/premium_gaming_popup.dart';
import '../config/app_config.dart';
import 'revenue_cat_service.dart';

/// Premium Features Service
/// Manages premium feature flags, subscriptions, and in-app purchases
/// Phase 1: Local feature flags (for development and testing)
/// Phase 2: RevenueCat integration (planned)
class PremiumService extends ChangeNotifier {
  static const String _prefsPrefix = 'premium_';

  // Feature flag keys
  static const String _worldThemeDazzleKey =
      '${_prefsPrefix}world_theme_dazzle';
  static const String _worldThemeForestKey =
      '${_prefsPrefix}world_theme_forest';
  static const String _worldThemeCaveKey = '${_prefsPrefix}world_theme_cave';
  static const String _worldThemeChristmasKey =
      '${_prefsPrefix}world_theme_christmas';
  static const String _worldThemeTropicalParadiseKey =
      '${_prefsPrefix}world_theme_tropical_paradise';
  static const String _worldThemeFlowerWonderlandKey =
      '${_prefsPrefix}world_theme_flower_wonderland';
  static const String _worldThemeDesertOasisKey =
      '${_prefsPrefix}world_theme_desert_oasis';
  static const String _avatarGamerPackKey = '${_prefsPrefix}avatar_gamer_pack';
  static const String _avatarProfessionalPackKey =
      '${_prefsPrefix}avatar_professional_pack';
  static const String _avatarElegancePackKey =
      '${_prefsPrefix}avatar_elegance_pack';
  static const String _helperPetDogKey = '${_prefsPrefix}helper_pet_dog';
  static const String _helperPetCatKey = '${_prefsPrefix}helper_pet_cat';
  static const String _gamingLevel4Key = '${_prefsPrefix}gaming_level_4';
  static const String _gamingLevel5Key = '${_prefsPrefix}gaming_level_5';
  static const String _premiumSubscriptionKey =
      '${_prefsPrefix}subscription_active';

  // Feature states (Phase 1: Local flags)
  Map<String, bool> _featureFlags = {};

  // Subscription state (Phase 2: RevenueCat integration)
  bool _isPremiumSubscriber = false;
  Set<String> _purchasedItems = {};

  // Singleton instance
  static PremiumService? _instance;
  static PremiumService get instance => _instance ??= PremiumService._();
  PremiumService._();

  /// Initialize the premium service
  Future<void> initialize() async {
    developer.log('Initializing Premium Service...', name: 'PremiumService');

    try {
      // First initialize RevenueCat service
      await RevenueCatService().initialize();

      await _loadFeatureFlags();
      developer.log(
        'Premium Service initialized successfully',
        name: 'PremiumService',
      );
    } catch (e) {
      developer.log(
        'Error initializing Premium Service: $e',
        name: 'PremiumService',
      );
    }
  }

  /// Load feature flags from SharedPreferences
  Future<void> _loadFeatureFlags() async {
    final prefs = await SharedPreferences.getInstance();

    _featureFlags = {
      // World Themes (Premium)
      _worldThemeDazzleKey: prefs.getBool(_worldThemeDazzleKey) ?? false,
      _worldThemeForestKey: prefs.getBool(_worldThemeForestKey) ?? false,
      _worldThemeCaveKey: prefs.getBool(_worldThemeCaveKey) ?? false,
      _worldThemeChristmasKey: prefs.getBool(_worldThemeChristmasKey) ?? false,
      _worldThemeTropicalParadiseKey:
          prefs.getBool(_worldThemeTropicalParadiseKey) ?? false,
      _worldThemeFlowerWonderlandKey:
          prefs.getBool(_worldThemeFlowerWonderlandKey) ?? false,
      _worldThemeDesertOasisKey:
          prefs.getBool(_worldThemeDesertOasisKey) ?? false,

      // Avatar Style Packs (Premium)
      _avatarGamerPackKey: prefs.getBool(_avatarGamerPackKey) ?? false,
      _avatarProfessionalPackKey:
          prefs.getBool(_avatarProfessionalPackKey) ?? false,
      _avatarElegancePackKey: prefs.getBool(_avatarElegancePackKey) ?? false,

      // Gaming Helpers (Premium)
      _helperPetDogKey: prefs.getBool(_helperPetDogKey) ?? false,
      _helperPetCatKey: prefs.getBool(_helperPetCatKey) ?? false,

      // Gaming Levels (Premium)
      _gamingLevel4Key: prefs.getBool(_gamingLevel4Key) ?? false,
      _gamingLevel5Key: prefs.getBool(_gamingLevel5Key) ?? false,

      // Subscription
      _premiumSubscriptionKey: prefs.getBool(_premiumSubscriptionKey) ?? false,
    };

    _isPremiumSubscriber = _featureFlags[_premiumSubscriptionKey] ?? false;

    developer.log(
      'Loaded feature flags: $_featureFlags',
      name: 'PremiumService',
    );
  }

  /// Save feature flags to SharedPreferences
  Future<void> _saveFeatureFlags() async {
    final prefs = await SharedPreferences.getInstance();

    for (final entry in _featureFlags.entries) {
      await prefs.setBool(entry.key, entry.value);
    }

    notifyListeners();
  }

  // ============================================================================
  // WORLD THEMES
  // ============================================================================

  /// Check if Dazzle world theme is unlocked
  bool get isDazzleThemeUnlocked =>
      isPremiumSubscriber || (_featureFlags[_worldThemeDazzleKey] ?? false);

  /// Check if Forest Realm world theme is unlocked
  bool get isForestThemeUnlocked =>
      isPremiumSubscriber || (_featureFlags[_worldThemeForestKey] ?? false);

  /// Check if Cave Explorer world theme is unlocked
  bool get isCaveThemeUnlocked =>
      isPremiumSubscriber || (_featureFlags[_worldThemeCaveKey] ?? false);

  /// Check if ChristmasLand world theme is unlocked
  bool get isChristmasThemeUnlocked =>
      isPremiumSubscriber || (_featureFlags[_worldThemeChristmasKey] ?? false);

  /// Check if Tropical Paradise world theme is unlocked
  bool get isTropicalParadiseThemeUnlocked =>
      isPremiumSubscriber ||
      (_featureFlags[_worldThemeTropicalParadiseKey] ?? false);

  /// Check if Flower Wonderland world theme is unlocked
  bool get isFlowerWonderlandThemeUnlocked =>
      isPremiumSubscriber ||
      (_featureFlags[_worldThemeFlowerWonderlandKey] ?? false);

  /// Check if Desert Oasis world theme is unlocked
  bool get isDesertOasisThemeUnlocked =>
      isPremiumSubscriber ||
      (_featureFlags[_worldThemeDesertOasisKey] ?? false);

  /// Check if a specific world theme is unlocked
  bool isWorldThemeUnlocked(String themeId) {
    switch (themeId) {
      case 'dazzle':
        return isPremiumSubscriber || isDazzleThemeUnlocked;
      case 'forest':
        return isPremiumSubscriber || isForestThemeUnlocked;
      case 'cave':
        return isPremiumSubscriber || isCaveThemeUnlocked;
      case 'christmas':
        return isPremiumSubscriber || isChristmasThemeUnlocked;
      case 'tropical-paradise':
        return isPremiumSubscriber || isTropicalParadiseThemeUnlocked;
      case 'flower-wonderland':
        return isPremiumSubscriber || isFlowerWonderlandThemeUnlocked;
      case 'desert-oasis':
        return isPremiumSubscriber || isDesertOasisThemeUnlocked;
      default:
        // Free themes are always unlocked
        return true;
    }
  }

  /// Unlock a specific world theme
  Future<void> unlockWorldTheme(String themeId) async {
    switch (themeId) {
      case 'dazzle':
        await unlockFeature(_worldThemeDazzleKey);
        break;
      case 'forest':
        await unlockFeature(_worldThemeForestKey);
        break;
      case 'cave':
        await unlockFeature(_worldThemeCaveKey);
        break;
      case 'christmas':
        await unlockFeature(_worldThemeChristmasKey);
        break;
      case 'tropical-paradise':
        await unlockFeature(_worldThemeTropicalParadiseKey);
        break;
      case 'flower-wonderland':
        await unlockFeature(_worldThemeFlowerWonderlandKey);
        break;
      case 'desert-oasis':
        await unlockFeature(_worldThemeDesertOasisKey);
        break;
    }
  }

  /// Lock a specific world theme
  Future<void> lockWorldTheme(String themeId) async {
    switch (themeId) {
      case 'dazzle':
        await lockFeature(_worldThemeDazzleKey);
        break;
      case 'forest':
        await lockFeature(_worldThemeForestKey);
        break;
      case 'cave':
        await lockFeature(_worldThemeCaveKey);
        break;
      case 'christmas':
        await lockFeature(_worldThemeChristmasKey);
        break;
      case 'tropical-paradise':
        await lockFeature(_worldThemeTropicalParadiseKey);
        break;
      case 'flower-wonderland':
        await lockFeature(_worldThemeFlowerWonderlandKey);
        break;
      case 'desert-oasis':
        await lockFeature(_worldThemeDesertOasisKey);
        break;
    }
  }

  /// Unlock gaming levels based on level numbers
  Future<void> unlockGamingLevels(List<int> levelNumbers) async {
    for (final levelNum in levelNumbers) {
      switch (levelNum) {
        case 4:
          await unlockFeature(_gamingLevel4Key);
          break;
        case 5:
          await unlockFeature(_gamingLevel5Key);
          break;
        // Levels 6 and 7 not yet implemented in PremiumService
        // Add them when ready
      }
    }
  }

  /// Get all available world themes (free + premium)
  List<WorldTheme> get availableWorldThemes => [
    // Free themes
    const WorldTheme(
      id: 'greenplane',
      name: 'Green Plane',
      description: 'Classic landscape with trees and mountains',
      isPremium: false,
      isUnlocked: true,
    ),
    const WorldTheme(
      id: 'ocean',
      name: 'Ocean World',
      description: 'Underwater adventure with islands',
      isPremium: false,
      isUnlocked: true,
    ),
    const WorldTheme(
      id: 'space',
      name: 'Space World',
      description: 'Zero gravity cosmic environment',
      isPremium: false,
      isUnlocked: true,
    ),
    // Premium themes
    WorldTheme(
      id: 'dazzle',
      name: 'Dazzle Bedroom',
      description: 'Pink & purple girl\'s bedroom with sparkles',
      isPremium: true,
      isUnlocked: isDazzleThemeUnlocked,
    ),
    WorldTheme(
      id: 'forest',
      name: 'Forest Realm',
      description: 'Enhanced nature with tree trunk connections',
      isPremium: true,
      isUnlocked: isForestThemeUnlocked,
    ),
    WorldTheme(
      id: 'cave',
      name: 'Cave Explorer',
      description: 'Underground adventure with stalagmites and streams',
      isPremium: true,
      isUnlocked: isCaveThemeUnlocked,
    ),
    WorldTheme(
      id: 'christmas',
      name: 'ChristmasLand',
      description: 'Festive log cabin with Christmas tree and fireplace',
      isPremium: true,
      isUnlocked: isChristmasThemeUnlocked,
    ),
    WorldTheme(
      id: 'tropical-paradise',
      name: 'Tropical Paradise',
      description:
          'Beautiful tropical beach with palm trees and rippling water',
      isPremium: true,
      isUnlocked: isTropicalParadiseThemeUnlocked,
    ),
    WorldTheme(
      id: 'flower-wonderland',
      name: 'Flower Wonderland',
      description: 'Field of colorful flowers with hedges and tree groves',
      isPremium: true,
      isUnlocked: isFlowerWonderlandThemeUnlocked,
    ),
    WorldTheme(
      id: 'desert-oasis',
      name: 'Desert Oasis',
      description: 'Sandy dunes with palm trees and oasis pools',
      isPremium: true,
      isUnlocked: isDesertOasisThemeUnlocked,
    ),
  ];

  // ============================================================================
  // AVATAR STYLE PACKS
  // ============================================================================

  /// Check if Gamer Pack is unlocked
  bool get isGamerPackUnlocked =>
      isPremiumSubscriber || (_featureFlags[_avatarGamerPackKey] ?? false);

  /// Check if Professional Pack is unlocked
  bool get isProfessionalPackUnlocked =>
      isPremiumSubscriber ||
      (_featureFlags[_avatarProfessionalPackKey] ?? false);

  /// Check if Elegance Pack is unlocked
  bool get isElegancePackUnlocked =>
      isPremiumSubscriber || (_featureFlags[_avatarElegancePackKey] ?? false);

  /// Get all available avatar style packs
  List<AvatarStylePack> get availableStylePacks => [
    // Free themes (existing ones)
    const AvatarStylePack(
      id: 'basic',
      name: 'Basic Styles',
      description: 'Default hairstyles and clothing',
      isPremium: false,
      isUnlocked: true,
      themes: ['hawaiian', 'businessCasual', 'workout', 'doctor'],
    ),
    // Premium packs
    AvatarStylePack(
      id: 'gamer',
      name: 'Gamer Pack',
      description: 'Gaming headsets, RGB clothing, tech accessories',
      isPremium: true,
      isUnlocked: isGamerPackUnlocked,
      themes: ['gamer', 'esports', 'streamer'],
    ),
    AvatarStylePack(
      id: 'professional',
      name: 'Professional Pack',
      description: 'Business suits, formal hair, phones, briefcases',
      isPremium: true,
      isUnlocked: isProfessionalPackUnlocked,
      themes: ['executive', 'formal', 'corporate'],
    ),
    AvatarStylePack(
      id: 'elegance',
      name: 'Elegance Pack',
      description: 'Fancy dresses, elegant hair, makeup, jewelry',
      isPremium: true,
      isUnlocked: isElegancePackUnlocked,
      themes: ['elegance', 'gala', 'redCarpet'],
    ),
  ];

  // ============================================================================
  // GAMING HELPERS
  // ============================================================================

  /// Check if Pet Dog helper is unlocked
  bool get isPetDogUnlocked =>
      isPremiumSubscriber || (_featureFlags[_helperPetDogKey] ?? false);

  /// Check if Pet Cat helper is unlocked
  bool get isPetCatUnlocked =>
      isPremiumSubscriber || (_featureFlags[_helperPetCatKey] ?? false);

  /// Get all available gaming helpers
  List<GamingHelper> get availableHelpers => [
    GamingHelper(
      id: 'pet_dog',
      name: 'Pet Dog',
      description: 'Loyal companion that hunts treasure boxes and entities',
      type: HelperType.pet,
      isPremium: true,
      isUnlocked: isPetDogUnlocked,
      breeds: ['golden_retriever', 'labrador', 'husky', 'beagle', 'corgi'],
    ),
    GamingHelper(
      id: 'pet_cat',
      name: 'Pet Cat',
      description: 'Agile hunter that chases entities for points',
      type: HelperType.pet,
      isPremium: true,
      isUnlocked: isPetCatUnlocked,
      breeds: [
        'persian',
        'siamese',
        'maine_coon',
        'british_shorthair',
        'ragdoll',
      ],
    ),
  ];

  // ============================================================================
  // GAMING LEVELS
  // ============================================================================

  /// Check if Gaming Level 4 is unlocked
  bool get isLevel4Unlocked =>
      isPremiumSubscriber || (_featureFlags[_gamingLevel4Key] ?? false);

  /// Check if Gaming Level 5 is unlocked
  bool get isLevel5Unlocked =>
      isPremiumSubscriber || (_featureFlags[_gamingLevel5Key] ?? false);

  /// Get all available gaming levels
  List<GamingLevel> get availableLevels => [
    // Free levels
    const GamingLevel(
      id: 'level_1',
      name: 'Level 1',
      description: 'Basic treasure hunting',
      isPremium: false,
      isUnlocked: true,
      entityTypes: ['treasure_box'],
    ),
    const GamingLevel(
      id: 'level_2',
      name: 'Level 2',
      description: 'Enhanced treasures with behaviors',
      isPremium: false,
      isUnlocked: true,
      entityTypes: ['treasure_box', 'rare_treasure'],
    ),
    const GamingLevel(
      id: 'level_3',
      name: 'Level 3',
      description: 'Legendary treasures and effects',
      isPremium: false,
      isUnlocked: true,
      entityTypes: ['treasure_box', 'rare_treasure', 'legendary_treasure'],
    ),
    // Premium levels
    GamingLevel(
      id: 'level_4',
      name: 'Insect Safari',
      description:
          'Hunt insects through the file zone - spider, mantis, housefly, butterfly, ladybug',
      isPremium: true,
      isUnlocked: isLevel4Unlocked,
      entityTypes: ['spider', 'mantis', 'housefly', 'butterfly', 'ladybug'],
    ),
    GamingLevel(
      id: 'level_5',
      name: 'Glowing Objects',
      description:
          'Capture luminous entities with spectacular effects - orbs, discs, sirens, cubes',
      isPremium: true,
      isUnlocked: isLevel5Unlocked,
      entityTypes: [
        'blue_orb',
        'yellow_disc',
        'red_siren',
        'dancing_orbs',
        'flashing_cube',
      ],
    ),
  ];

  // ============================================================================
  // SUBSCRIPTION & PURCHASES
  // ============================================================================

  /// Check if user has premium subscription
  bool get isPremiumSubscriber => _isPremiumSubscriber;

  /// Check if a specific feature is unlocked (subscription or individual purchase)
  bool isFeatureUnlocked(String featureKey) {
    // Premium subscribers get everything
    if (_isPremiumSubscriber) return true;

    // Check individual purchase
    return _featureFlags[featureKey] ?? false;
  }

  /// Unlock a feature (for testing in Phase 1)
  Future<void> unlockFeature(String featureKey) async {
    _featureFlags[featureKey] = true;
    await _saveFeatureFlags();

    developer.log('Feature unlocked: $featureKey', name: 'PremiumService');
  }

  /// Lock a feature (for testing in Phase 1)
  Future<void> lockFeature(String featureKey) async {
    _featureFlags[featureKey] = false;
    await _saveFeatureFlags();

    developer.log('Feature locked: $featureKey', name: 'PremiumService');
  }

  /// Set premium subscription status (for testing in Phase 1)
  Future<void> setPremiumSubscription(bool isActive) async {
    _isPremiumSubscriber = isActive;
    _featureFlags[_premiumSubscriptionKey] = isActive;
    await _saveFeatureFlags();

    developer.log(
      'Premium subscription set to: $isActive',
      name: 'PremiumService',
    );
  }

  /// Reset all premium features (for testing)
  Future<void> resetAllFeatures() async {
    final prefs = await SharedPreferences.getInstance();

    // Remove all premium preferences
    for (final key in _featureFlags.keys) {
      await prefs.remove(key);
    }

    // Reset local state
    _featureFlags.clear();
    _isPremiumSubscriber = false;
    _purchasedItems.clear();

    await _loadFeatureFlags();

    developer.log('All premium features reset', name: 'PremiumService');
  }

  /// Enable premium gaming levels for testing
  Future<void> enablePremiumGamingLevelsForTesting() async {
    await unlockFeature(_gamingLevel4Key);
    await unlockFeature(_gamingLevel5Key);
    await setPremiumSubscription(true);

    developer.log(
      'Premium gaming levels enabled for testing',
      name: 'PremiumService',
    );
  }

  /// Disable premium gaming levels for testing
  Future<void> disablePremiumGamingLevelsForTesting() async {
    await lockFeature(_gamingLevel4Key);
    await lockFeature(_gamingLevel5Key);
    await setPremiumSubscription(false);

    developer.log(
      'Premium gaming levels disabled for testing',
      name: 'PremiumService',
    );
  }

  /// Show premium gaming popup (called from JavaScript)
  Future<void> showPremiumGamingPopup(BuildContext? context) async {
    if (context == null) return;

    developer.log(
      'Showing premium gaming popup from JavaScript',
      name: 'PremiumService',
    );

    // Import the popup widget dynamically to avoid dependency issues
    try {
      // Show the premium gaming popup
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => PremiumGamingPopup(
          showTestingToggle: AppConfig.showPremiumGamingTestToggle,
        ),
      );
    } catch (error) {
      developer.log(
        'Error showing premium gaming popup: $error',
        name: 'PremiumService',
      );
    }
  }

  // ============================================================================
  // FEATURE CATEGORIES
  // ============================================================================

  /// Get premium features by category
  Map<String, List<PremiumFeature>> get featuresByCategory => {
    'World Themes': availableWorldThemes
        .where((t) => t.isPremium)
        .map(
          (t) => PremiumFeature(
            id: t.id,
            name: t.name,
            description: t.description,
            type: PremiumFeatureType.worldTheme,
            price: '\$2.99',
            isUnlocked: t.isUnlocked,
          ),
        )
        .toList(),

    'Avatar Styles': availableStylePacks
        .where((p) => p.isPremium)
        .map(
          (p) => PremiumFeature(
            id: p.id,
            name: p.name,
            description: p.description,
            type: PremiumFeatureType.avatarPack,
            price: '\$1.99',
            isUnlocked: p.isUnlocked,
          ),
        )
        .toList(),

    'Gaming Helpers': availableHelpers
        .where((h) => h.isPremium)
        .map(
          (h) => PremiumFeature(
            id: h.id,
            name: h.name,
            description: h.description,
            type: PremiumFeatureType.gamingHelper,
            price: '\$3.99',
            isUnlocked: h.isUnlocked,
          ),
        )
        .toList(),

    'Gaming Levels': availableLevels
        .where((l) => l.isPremium)
        .map(
          (l) => PremiumFeature(
            id: l.id,
            name: l.name,
            description: l.description,
            type: PremiumFeatureType.gamingLevel,
            price: '\$3.99',
            isUnlocked: l.isUnlocked,
          ),
        )
        .toList(),
  };
}

// ============================================================================
// DATA CLASSES
// ============================================================================

class WorldTheme {
  final String id;
  final String name;
  final String description;
  final bool isPremium;
  final bool isUnlocked;

  const WorldTheme({
    required this.id,
    required this.name,
    required this.description,
    required this.isPremium,
    required this.isUnlocked,
  });
}

class AvatarStylePack {
  final String id;
  final String name;
  final String description;
  final bool isPremium;
  final bool isUnlocked;
  final List<String> themes;

  const AvatarStylePack({
    required this.id,
    required this.name,
    required this.description,
    required this.isPremium,
    required this.isUnlocked,
    required this.themes,
  });
}

enum HelperType { pet, robot, tool }

class GamingHelper {
  final String id;
  final String name;
  final String description;
  final HelperType type;
  final bool isPremium;
  final bool isUnlocked;
  final List<String>? breeds; // For pets

  const GamingHelper({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.isPremium,
    required this.isUnlocked,
    this.breeds,
  });
}

class GamingLevel {
  final String id;
  final String name;
  final String description;
  final bool isPremium;
  final bool isUnlocked;
  final List<String> entityTypes;

  const GamingLevel({
    required this.id,
    required this.name,
    required this.description,
    required this.isPremium,
    required this.isUnlocked,
    required this.entityTypes,
  });
}

enum PremiumFeatureType { worldTheme, avatarPack, gamingHelper, gamingLevel }

class PremiumFeature {
  final String id;
  final String name;
  final String description;
  final PremiumFeatureType type;
  final String price;
  final bool isUnlocked;

  const PremiumFeature({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.price,
    required this.isUnlocked,
  });
}
