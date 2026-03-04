/// Product types matching your entitlements table structure
enum PremiumProductType {
  subscription,
  worldUnlock,
  levelUnlock,
  avatarUnlock,
  seasonalBundle,
  worldBundle,
  levelBundle,
  starterBundle,
  badge,
}

/// Subscription tier levels
enum SubscriptionTier { monthly, yearly }

/// Base product model for all premium content
abstract class PremiumProduct {
  final String entitlementName;
  final String googlePlayProductId;
  final PremiumProductType productType;
  final String displayName;
  final String description;
  final double priceUSD;
  final List<String> metadataTags;
  final bool isOwned;
  final bool isAvailable; // For unimplemented features

  const PremiumProduct({
    required this.entitlementName,
    required this.googlePlayProductId,
    required this.productType,
    required this.displayName,
    required this.description,
    required this.priceUSD,
    required this.metadataTags,
    this.isOwned = false,
    this.isAvailable = true,
  });

  bool get isEvergreen => metadataTags.contains('evergreen');
  bool get isLimited => metadataTags.contains('limited');
  bool get isSeasonal => metadataTags.contains('seasonal');
  bool get isBundle => metadataTags.contains('bundle');
  bool get isOneTime => metadataTags.contains('one_time');
  bool get isSubscription => metadataTags.contains('subscription');

  // Convenience getters for compatibility
  String get id => entitlementName;
  double get price => priceUSD;

  String get formattedPrice => '\$${priceUSD.toStringAsFixed(2)}';
}

/// Subscription products (monthly/yearly)
class SubscriptionProduct extends PremiumProduct {
  final SubscriptionTier tier;
  final String billingPeriod;
  final List<String> includedFeatures;

  const SubscriptionProduct({
    required super.entitlementName,
    required super.googlePlayProductId,
    required super.displayName,
    required super.description,
    required super.priceUSD,
    required super.metadataTags,
    required this.tier,
    required this.billingPeriod,
    required this.includedFeatures,
    super.isOwned = false,
  }) : super(productType: PremiumProductType.subscription);

  double get monthlySavings =>
      tier == SubscriptionTier.yearly ? (9.99 * 12) - priceUSD : 0.0;
  String get savingsText => tier == SubscriptionTier.yearly
      ? 'Save \$${monthlySavings.toStringAsFixed(0)}/year!'
      : '';
}

/// World template unlock products
class WorldUnlockProduct extends PremiumProduct {
  final String worldType; // matches your world identifiers
  final String previewImagePath;
  final List<String> features;

  const WorldUnlockProduct({
    required super.entitlementName,
    required super.googlePlayProductId,
    required super.displayName,
    required super.description,
    required super.priceUSD,
    required super.metadataTags,
    required this.worldType,
    required this.previewImagePath,
    required this.features,
    super.isOwned = false,
    super.isAvailable = true,
  }) : super(productType: PremiumProductType.worldUnlock);
}

/// Gaming level unlock products
class LevelUnlockProduct extends PremiumProduct {
  final List<int> levelNumbers;
  final String gameType; // 'standard', 'alienattack', 'colorcatch'
  final String difficultyLevel;

  const LevelUnlockProduct({
    required super.entitlementName,
    required super.googlePlayProductId,
    required super.displayName,
    required super.description,
    required super.priceUSD,
    required super.metadataTags,
    required this.levelNumbers,
    required this.gameType,
    required this.difficultyLevel,
    super.isOwned = false,
    super.isAvailable = true,
  }) : super(productType: PremiumProductType.levelUnlock);

  String get levelRange => levelNumbers.length == 1
      ? 'Level ${levelNumbers.first}'
      : 'Levels ${levelNumbers.first}-${levelNumbers.last}';

  // Convenience getter for compatibility
  List<String> get levelsIncluded =>
      levelNumbers.map((level) => 'Level $level').toList();
}

/// Avatar unlock products
class AvatarUnlockProduct extends PremiumProduct {
  final String avatarType; // 'dog', 'cat', etc.
  final String previewImagePath;
  final List<String> customizationOptions;

  const AvatarUnlockProduct({
    required super.entitlementName,
    required super.googlePlayProductId,
    required super.displayName,
    required super.description,
    required super.priceUSD,
    required super.metadataTags,
    required this.avatarType,
    required this.previewImagePath,
    required this.customizationOptions,
    super.isOwned = false,
    super.isAvailable = true,
  }) : super(productType: PremiumProductType.avatarUnlock);
}

/// Bundle products (seasonal, world bundles, etc.)
class BundleProduct extends PremiumProduct {
  final List<String> includedProducts; // List of entitlement names included
  final double individualPrice; // Total price if bought separately
  final String bundleType; // 'seasonal', 'world', 'level', 'starter'

  const BundleProduct({
    required super.entitlementName,
    required super.googlePlayProductId,
    required super.displayName,
    required super.description,
    required super.priceUSD,
    required super.metadataTags,
    required this.includedProducts,
    required this.individualPrice,
    required this.bundleType,
    super.isOwned = false,
    super.isAvailable = true,
  }) : super(productType: PremiumProductType.seasonalBundle);

  double get savings => individualPrice - priceUSD;
  int get savingsPercent => ((savings / individualPrice) * 100).round();
  String get savingsText =>
      'Save \$${savings.toStringAsFixed(2)} (${savingsPercent}% off)';

  // Convenience getters for compatibility
  double get originalPrice => individualPrice;
  List<String> get includedItems => includedProducts;
}

/// Badge/cosmetic products
class BadgeProduct extends PremiumProduct {
  final String badgeIconPath;
  final String unlockCondition;

  const BadgeProduct({
    required super.entitlementName,
    required super.googlePlayProductId,
    required super.displayName,
    required super.description,
    required super.priceUSD,
    required super.metadataTags,
    required this.badgeIconPath,
    required this.unlockCondition,
    super.isOwned = false,
  }) : super(productType: PremiumProductType.badge);
}

/// Static catalog of all premium products based on your entitlements table
class PremiumProductCatalog {
  /// Subscription products
  static const List<SubscriptionProduct> subscriptions = [
    SubscriptionProduct(
      entitlementName: 'sub_full_premium',
      googlePlayProductId: 'sub_full_premium_monthly',
      displayName: 'Premium Monthly',
      description: 'All premium features (worlds, levels, avatars)',
      priceUSD: 9.99,
      metadataTags: ['subscription', 'all_access', 'evergreen'],
      tier: SubscriptionTier.monthly,
      billingPeriod: 'monthly',
      includedFeatures: [
        'All World Templates',
        'All Premium Levels',
        'All Avatars',
        'Priority Support',
      ],
    ),
    SubscriptionProduct(
      entitlementName: 'sub_full_premium_yearly',
      googlePlayProductId: 'sub_full_premium_yearly',
      displayName: 'Premium Yearly',
      description: 'All premium features - Best Value!',
      priceUSD: 99.00,
      metadataTags: ['subscription', 'all_access', 'evergreen'],
      tier: SubscriptionTier.yearly,
      billingPeriod: 'yearly',
      includedFeatures: [
        'All World Templates',
        'All Premium Levels',
        'All Avatars',
        'Priority Support',
      ],
    ),
  ];

  /// World unlock products (matching RevenueCat configuration)
  static const List<WorldUnlockProduct> worldUnlocks = [
    WorldUnlockProduct(
      entitlementName: 'world_dazzle',
      googlePlayProductId: 'world_dazzle',
      displayName: 'Dazzle World',
      description: 'Sparkling magical realm with rainbow aesthetics',
      priceUSD: 1.99,
      metadataTags: ['world', 'one_time', 'evergreen'],
      worldType: 'dazzle',
      previewImagePath: 'assets/images/worlds/dazzle_preview.jpg',
      features: ['Rainbow Lighting', 'Magical Particles', 'Sparkle Effects'],
    ),
    WorldUnlockProduct(
      entitlementName: 'world_forest',
      googlePlayProductId: 'world_forest',
      displayName: 'Forest Realm',
      description:
          'Enchanted forest with ancient trees and mystical atmosphere',
      priceUSD: 1.99,
      metadataTags: ['world', 'one_time', 'evergreen'],
      worldType: 'forest',
      previewImagePath: 'assets/images/worlds/forest_preview.jpg',
      features: ['Dynamic Weather', 'Tree Animations', 'Nature Sounds'],
    ),
    WorldUnlockProduct(
      entitlementName: 'world_cave',
      googlePlayProductId: 'world_cave',
      displayName: 'Cave Explorer',
      description: 'Underground adventure with stalagmites and crystal streams',
      priceUSD: 1.99,
      metadataTags: ['world', 'one_time', 'evergreen'],
      worldType: 'cave',
      previewImagePath: 'assets/images/worlds/cave_preview.jpg',
      features: ['Cave Formations', 'Underground Streams', 'Crystal Lighting'],
    ),
    WorldUnlockProduct(
      entitlementName: 'world_christmas',
      googlePlayProductId: 'world_christmas',
      displayName: 'Christmasland',
      description: 'Festive winter wonderland with holiday magic',
      priceUSD: 1.99,
      metadataTags: ['world', 'one_time', 'seasonal'],
      worldType: 'christmas',
      previewImagePath: 'assets/images/worlds/christmas_preview.jpg',
      features: ['Snow Effects', 'Holiday Decorations', 'Festive Music'],
    ),
    WorldUnlockProduct(
      entitlementName: 'world_tropical',
      googlePlayProductId: 'world_tropical',
      displayName: 'Tropical Paradise',
      description: 'Beach paradise with animated water and swaying palms',
      priceUSD: 1.99,
      metadataTags: ['world', 'one_time', 'evergreen'],
      worldType: 'tropical-paradise',
      previewImagePath: 'assets/images/worlds/tropical_preview.jpg',
      features: ['Animated Water', 'Palm Tree Animations', 'Beach Ambiance'],
    ),
    WorldUnlockProduct(
      entitlementName: 'world_flower',
      googlePlayProductId: 'world_flower',
      displayName: 'Flower Wonderland',
      description: 'Vibrant flower field with individually animated flowers',
      priceUSD: 1.99,
      metadataTags: ['world', 'one_time', 'evergreen'],
      worldType: 'flower-wonderland',
      previewImagePath: 'assets/images/worlds/flower_preview.jpg',
      features: [
        'Animated Flowers',
        'Gradient Effects',
        'Butterfly Animations',
      ],
    ),
    WorldUnlockProduct(
      entitlementName: 'world_desert',
      googlePlayProductId: 'world_desert',
      displayName: 'Desert Oasis',
      description: 'Mystical desert with hidden oasis and ancient ruins',
      priceUSD: 1.99,
      metadataTags: ['world', 'one_time', 'evergreen'],
      worldType: 'desert-oasis',
      previewImagePath: 'assets/images/worlds/desert_preview.jpg',
      features: ['Sand Dunes', 'Oasis Waters', 'Ancient Architecture'],
    ),
  ];

  /// Level unlock products (matching RevenueCat configuration)
  static const List<LevelUnlockProduct> levelUnlocks = [
    LevelUnlockProduct(
      entitlementName: 'game_l4_l5',
      googlePlayProductId: 'game_l4_l5',
      displayName: 'Levels 4 & 5',
      description: 'Advanced gaming levels with increased difficulty',
      priceUSD: 2.99,
      metadataTags: ['level', 'one_time', 'evergreen'],
      levelNumbers: [4, 5],
      gameType: 'standard',
      difficultyLevel: 'Advanced',
    ),
    LevelUnlockProduct(
      entitlementName: 'game_l6_l7',
      googlePlayProductId: 'game_l6_l7',
      displayName: 'Levels 6 & 7',
      description: 'Expert gaming levels for master players',
      priceUSD: 2.99,
      metadataTags: ['level', 'one_time', 'evergreen'],
      levelNumbers: [6, 7],
      gameType: 'standard',
      difficultyLevel: 'Expert',
      isAvailable: true, // ✅ Now available - Level 6/7 implemented and tested
    ),
  ];

  /// Avatar unlock products (not yet configured in RevenueCat - removed for now)
  static const List<AvatarUnlockProduct> avatarUnlocks = [];

  /// Bundle products (matching RevenueCat configuration)
  static const List<BundleProduct> bundles = [
    BundleProduct(
      entitlementName: 'bundle_worlds_all',
      googlePlayProductId: 'bundle_worlds_all',
      displayName: 'All Worlds Bundle',
      description: 'Complete collection of world templates',
      priceUSD: 9.99,
      metadataTags: ['world', 'bundle', 'evergreen'],
      includedProducts: [
        'world_dazzle',
        'world_forest',
        'world_cave',
        'world_christmas',
        'world_tropical',
        'world_flower',
        'world_desert',
      ],
      individualPrice: 13.93, // 7 worlds × $1.99
      bundleType: 'world',
    ),
    BundleProduct(
      entitlementName: 'bundle_gaming_all',
      googlePlayProductId: 'bundle_gaming_all',
      displayName: 'All Gaming Levels Bundle',
      description: 'Complete collection of premium gaming levels',
      priceUSD: 4.99,
      metadataTags: ['level', 'bundle', 'evergreen'],
      includedProducts: ['game_l4_l5', 'game_l6_l7'],
      individualPrice: 5.98, // 2 level packs × $2.99
      bundleType: 'level',
    ),
  ];

  /// Badge products (not yet configured in RevenueCat - removed for now)
  static const List<BadgeProduct> badges = [];

  /// Get all products by type
  static List<PremiumProduct> getAllProducts() {
    return [
      ...subscriptions,
      ...worldUnlocks,
      ...levelUnlocks,
      ...avatarUnlocks,
      ...bundles,
      ...badges,
    ];
  }

  /// Get products by type
  static List<T> getProductsByType<T extends PremiumProduct>() {
    if (T == SubscriptionProduct) return subscriptions.cast<T>();
    if (T == WorldUnlockProduct) return worldUnlocks.cast<T>();
    if (T == LevelUnlockProduct) return levelUnlocks.cast<T>();
    if (T == AvatarUnlockProduct) return avatarUnlocks.cast<T>();
    if (T == BundleProduct) return bundles.cast<T>();
    if (T == BadgeProduct) return badges.cast<T>();
    return [];
  }

  /// Find product by entitlement name
  static PremiumProduct? findByEntitlement(String entitlementName) {
    return getAllProducts().cast<PremiumProduct?>().firstWhere(
      (product) => product?.entitlementName == entitlementName,
      orElse: () => null,
    );
  }

  /// Get available world types for your existing premium service
  static List<String> getAvailableWorldTypes() {
    return worldUnlocks.map((w) => w.worldType).toList();
  }

  /// Check if a world is premium (for compatibility with existing system)
  static bool isWorldPremium(String worldType) {
    return worldUnlocks.any((w) => w.worldType == worldType);
  }
}
