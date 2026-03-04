import 'dart:developer' as developer;

import 'premium_service.dart';
import 'revenue_cat_service.dart';
import '../models/premium_product_models.dart';

/// Enhanced Premium Service that wraps the existing PremiumService
/// Integrates with the new product catalog and placeholder RevenueCat service
/// Maintains compatibility with existing premium world functionality
class EnhancedPremiumService {
  late RevenueCatService _revenueCatService;
  late PremiumService _premiumService;
  bool _isInitialized = false;

  // Singleton instance
  static EnhancedPremiumService? _instance;
  static EnhancedPremiumService get instance =>
      _instance ??= EnhancedPremiumService._();
  EnhancedPremiumService._();

  /// Initialize the enhanced premium service
  Future<void> initialize() async {
    if (_isInitialized) return;

    // Initialize base premium service first
    _premiumService = PremiumService.instance;
    await _premiumService.initialize();

    // Initialize RevenueCat service in placeholder mode
    _revenueCatService = RevenueCatService();
    await _revenueCatService.initialize();

    _isInitialized = true;
    developer.log(
      'Enhanced Premium Service initialized',
      name: 'EnhancedPremium',
    );
  }

  /// Enhanced world unlock checking with RevenueCat integration
  Future<bool> isWorldThemeUnlocked(String themeId) async {
    if (!_isInitialized) await initialize();

    // First check RevenueCat entitlements if available
    final worldProduct = PremiumProductCatalog.worldUnlocks
        .cast<WorldUnlockProduct?>()
        .firstWhere((w) => w?.worldType == themeId, orElse: () => null);

    if (worldProduct != null) {
      try {
        final hasEntitlement = await _revenueCatService.hasEntitlement(
          worldProduct.entitlementName,
        );
        if (hasEntitlement) return true;
      } catch (e) {
        developer.log(
          'Error checking entitlement for $themeId: $e',
          name: 'EnhancedPremium',
        );
      }
    }

    // Fall back to existing logic
    return _premiumService.isWorldThemeUnlocked(themeId);
  }

  /// Enhanced premium world checking that includes all new worlds
  bool isPremiumWorld(String worldType) {
    // Updated list including all new worlds from your app
    const premiumWorlds = [
      'dazzle',
      'forest',
      'cave',
      'christmas',
      'tropical-paradise',
      'flower-wonderland',
      'desert-oasis',
    ];

    return premiumWorlds.contains(worldType);
  }

  /// Get world theme icon with new worlds included
  String getWorldThemeIcon(String worldType) {
    switch (worldType) {
      case 'tropical-paradise':
        return '🏝️';
      case 'flower-wonderland':
        return '🌸';
      case 'desert-oasis':
        return '🏜️';
      case 'dazzle':
        return '✨';
      case 'forest':
        return '🌲';
      case 'cave':
        return '🗻';
      case 'christmas':
        return '🎄';
      case 'green-plane':
        return '🌱';
      case 'ocean':
        return '🌊';
      case 'space':
        return '🚀';
      default:
        return '🌍'; // Default world icon
    }
  }

  /// Get world theme display name with new worlds included
  String getWorldThemeDisplayName(String worldType) {
    switch (worldType) {
      case 'tropical-paradise':
        return 'Tropical Paradise';
      case 'flower-wonderland':
        return 'Flower Wonderland';
      case 'desert-oasis':
        return 'Desert Oasis';
      case 'dazzle':
        return 'Dazzle Bedroom';
      case 'forest':
        return 'Forest Realm';
      case 'cave':
        return 'Crystal Caves';
      case 'christmas':
        return 'Christmasland';
      case 'green-plane':
        return 'Green Plane';
      case 'ocean':
        return 'Ocean World';
      case 'space':
        return 'Space World';
      default:
        return worldType; // Return as-is if not found
    }
  }

  /// Purchase a premium product through the store
  Future<bool> purchaseProduct(String googlePlayProductId) async {
    if (!_isInitialized) await initialize();

    try {
      developer.log(
        'Attempting to purchase: $googlePlayProductId',
        name: 'EnhancedPremium',
      );

      final success = await _revenueCatService.purchaseProduct(
        googlePlayProductId,
      );

      if (success) {
        // Find the product and handle post-purchase logic
        final product = PremiumProductCatalog.getAllProducts()
            .cast<PremiumProduct?>()
            .firstWhere(
              (p) => p?.googlePlayProductId == googlePlayProductId,
              orElse: () => null,
            );

        if (product != null) {
          await _handleSuccessfulPurchase(product);
        }
      }

      return success;
    } catch (e) {
      developer.log('Purchase failed: $e', name: 'EnhancedPremium');
      return false;
    }
  }

  /// Handle successful purchase and update local state if needed
  Future<void> _handleSuccessfulPurchase(PremiumProduct product) async {
    developer.log(
      'Processing successful purchase: ${product.entitlementName}',
      name: 'EnhancedPremium',
    );

    // For world unlocks, also update the legacy system for compatibility
    if (product is WorldUnlockProduct) {
      await _premiumService.unlockWorldTheme(product.worldType);
    }

    // For level unlocks, update gaming access using the testing method
    if (product is LevelUnlockProduct) {
      for (final level in product.levelNumbers) {
        if (level == 4 || level == 5) {
          // Use the enablePremiumGamingLevelsForTesting method
          await _premiumService.enablePremiumGamingLevelsForTesting();
          break; // No need to call it multiple times
        }
      }
    }

    // For subscriptions, update subscription status
    if (product is SubscriptionProduct) {
      await _premiumService.setPremiumSubscription(true);
    }
  }

  /// Restore previous purchases
  Future<void> restorePurchases() async {
    if (!_isInitialized) await initialize();

    try {
      await _revenueCatService.restorePurchases();

      // Update local state based on restored purchases
      await _syncWithRevenueCatEntitlements();

      developer.log('Purchases restored successfully', name: 'EnhancedPremium');
    } catch (e) {
      developer.log('Failed to restore purchases: $e', name: 'EnhancedPremium');
      rethrow;
    }
  }

  /// Sync local state with RevenueCat entitlements
  Future<void> _syncWithRevenueCatEntitlements() async {
    // Get all products and check their entitlement status
    final products = PremiumProductCatalog.getAllProducts();

    for (final product in products) {
      try {
        final hasAccess = await _revenueCatService.hasEntitlement(
          product.entitlementName,
        );

        if (hasAccess) {
          // Update local state to match RevenueCat
          if (product is WorldUnlockProduct) {
            await _premiumService.unlockWorldTheme(product.worldType);
          } else if (product is LevelUnlockProduct) {
            // Use the existing testing method for gaming levels
            await _premiumService.enablePremiumGamingLevelsForTesting();
          } else if (product is SubscriptionProduct) {
            await _premiumService.setPremiumSubscription(true);
          }
        }
      } catch (e) {
        developer.log(
          'Error syncing entitlement ${product.entitlementName}: $e',
          name: 'EnhancedPremium',
        );
      }
    }
  }

  /// Get all available products for the store UI
  Future<List<PremiumProduct>> getAvailableProducts() async {
    if (!_isInitialized) await initialize();
    return await _revenueCatService.getAvailableProducts();
  }

  /// Get products by type for store tabs
  Future<List<T>> getProductsByType<T extends PremiumProduct>() async {
    final allProducts = await getAvailableProducts();
    return allProducts.whereType<T>().toList();
  }

  /// Check if user has active subscription
  Future<bool> hasActiveSubscription() async {
    if (!_isInitialized) await initialize();

    // Check RevenueCat first, then fall back to legacy
    final hasRevenueCatSub = await _revenueCatService.hasActiveSubscription();
    return hasRevenueCatSub || _premiumService.isPremiumSubscriber;
  }

  /// Get subscription status for UI display
  Future<Map<String, dynamic>> getSubscriptionStatus() async {
    if (!_isInitialized) await initialize();
    return await _revenueCatService.getSubscriptionStatus();
  }

  /// Check if specific level is unlocked
  Future<bool> isLevelUnlocked(int levelNumber) async {
    if (!_isInitialized) await initialize();

    // Check subscription first
    if (await hasActiveSubscription()) {
      return true;
    }

    // Check specific entitlements
    return await _revenueCatService.isLevelUnlocked(levelNumber);
  }

  /// Get all unlocked worlds (both legacy and new system)
  Future<List<String>> getUnlockedWorlds() async {
    if (!_isInitialized) await initialize();

    final unlockedWorlds = <String>[];

    // Check subscription first
    if (await hasActiveSubscription()) {
      return PremiumProductCatalog.getAvailableWorldTypes();
    }

    // Check individual world unlocks
    for (final worldType in PremiumProductCatalog.getAvailableWorldTypes()) {
      if (await isWorldThemeUnlocked(worldType)) {
        unlockedWorlds.add(worldType);
      }
    }

    return unlockedWorlds;
  }

  /// Check if bundle is fully owned
  Future<bool> isBundleOwned(BundleProduct bundle) async {
    if (!_isInitialized) await initialize();

    // Check if bundle itself is owned
    final bundleOwned = await _revenueCatService.hasEntitlement(
      bundle.entitlementName,
    );
    if (bundleOwned) return true;

    // Check if all individual items in bundle are owned
    for (final productEntitlement in bundle.includedProducts) {
      final hasIndividual = await _revenueCatService.hasEntitlement(
        productEntitlement,
      );
      if (!hasIndividual) return false;
    }

    return true; // All individual items owned
  }

  /// Get bundle ownership percentage (for partial ownership display)
  Future<double> getBundleOwnershipPercentage(BundleProduct bundle) async {
    if (!_isInitialized) await initialize();

    // Check if bundle itself is owned
    final bundleOwned = await _revenueCatService.hasEntitlement(
      bundle.entitlementName,
    );
    if (bundleOwned) return 1.0;

    // Calculate percentage based on owned individual items
    int ownedCount = 0;
    for (final productEntitlement in bundle.includedProducts) {
      final hasIndividual = await _revenueCatService.hasEntitlement(
        productEntitlement,
      );
      if (hasIndividual) ownedCount++;
    }

    return ownedCount / bundle.includedProducts.length;
  }

  /// For testing: Grant access to specific entitlement
  void grantTestingAccess(String entitlementName) {
    if (_revenueCatService.isPlaceholderMode) {
      _revenueCatService.grantTestingAccess(entitlementName);
    }
  }

  /// For testing: Remove access to specific entitlement
  void revokeTestingAccess(String entitlementName) {
    if (_revenueCatService.isPlaceholderMode) {
      _revenueCatService.revokeTestingAccess(entitlementName);
    }
  }

  /// For testing: Reset all entitlements
  void resetTestingEntitlements() {
    if (_revenueCatService.isPlaceholderMode) {
      _revenueCatService.resetTestingEntitlements();
    }
  }

  /// Get debug information for development
  Map<String, dynamic> getDebugInfo() {
    return {
      'isInitialized': _isInitialized,
      'isPlaceholderMode': _revenueCatService.isPlaceholderMode,
      'isTestingMode': _revenueCatService.isTestingMode,
      'purchaseHistory': _revenueCatService.getPurchaseHistory(),
      'legacyPremiumStatus': {
        'isPremiumSubscriber': _premiumService.isPremiumSubscriber,
        'isDazzleUnlocked': _premiumService.isDazzleThemeUnlocked,
        'isForestUnlocked': _premiumService.isForestThemeUnlocked,
        'isCaveUnlocked': _premiumService.isCaveThemeUnlocked,
        'isLevel4Unlocked': _premiumService.isLevel4Unlocked,
        'isLevel5Unlocked': _premiumService.isLevel5Unlocked,
      },
    };
  }

  /// Check if RevenueCat service is in placeholder mode
  bool get isPlaceholderMode => _revenueCatService.isPlaceholderMode;

  /// Check if service is initialized
  bool get isInitialized => _isInitialized;

  /// Access to the underlying PremiumService for compatibility
  PremiumService get legacyService => _premiumService;

  /// Access to the RevenueCat service for direct access if needed
  RevenueCatService get revenueCatService => _revenueCatService;
}
