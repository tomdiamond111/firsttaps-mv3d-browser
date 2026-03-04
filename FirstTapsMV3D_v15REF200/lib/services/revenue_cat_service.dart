import 'dart:async';
import 'dart:developer' as developer;
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/premium_product_models.dart';

/// RevenueCat service with real API integration
/// Now uses the actual RevenueCat SDK for production functionality
class RevenueCatService {
  static const bool _placeholderMode = false; // Switched to real integration
  static final bool _testingMode =
      kDebugMode; // Auto-disabled in release builds

  // RevenueCat API Keys - REPLACE WITH YOUR ACTUAL KEYS
  // Get these from: RevenueCat Dashboard → Project Settings → API Keys
  static const String _androidApiKey = 'goog_WkIIrLkJbGjOWRrGAYcyxByJZhj';
  // iOS support coming in future release
  // static const String _iosApiKey = 'appl_your_ios_api_key_here';

  // Singleton pattern
  static final RevenueCatService _instance = RevenueCatService._internal();
  factory RevenueCatService() => _instance;
  RevenueCatService._internal();

  bool _isInitialized = false;
  CustomerInfo? _customerInfo;
  String? _appUserId; // Stable device-based user ID
  static const String _appUserIdKey = 'revenuecat_app_user_id';

  // Placeholder mode fallback data
  final Map<String, bool> _ownedEntitlements = {};
  final Map<String, DateTime> _purchaseHistory = {};
  String? _activeSubscriptionTier;

  /// Get or create a stable app user ID for RevenueCat
  Future<String> _getStableAppUserId() async {
    if (_appUserId != null && _appUserId!.isNotEmpty) {
      return _appUserId!;
    }

    final prefs = await SharedPreferences.getInstance();
    String? storedId = prefs.getString(_appUserIdKey);

    if (storedId != null && storedId.isNotEmpty) {
      developer.log(
        '🔐 Using existing app user ID: $storedId',
        name: 'RevenueCat',
      );
      _appUserId = storedId;
      return storedId;
    }

    final deviceInfo = DeviceInfoPlugin();
    String deviceId;

    try {
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.id;
        if (deviceId.isEmpty) {
          deviceId =
              'android_${DateTime.now().millisecondsSinceEpoch}_${androidInfo.device}';
        } else {
          deviceId = 'android_$deviceId';
        }
        developer.log('🔐 Generated Android app user ID', name: 'RevenueCat');
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        deviceId =
            iosInfo.identifierForVendor ??
            'ios_${DateTime.now().millisecondsSinceEpoch}';
        if (!deviceId.startsWith('ios_')) {
          deviceId = 'ios_$deviceId';
        }
        developer.log('🔐 Generated iOS app user ID', name: 'RevenueCat');
      } else {
        deviceId = 'unknown_${DateTime.now().millisecondsSinceEpoch}';
      }
    } catch (e) {
      deviceId = 'fallback_${DateTime.now().millisecondsSinceEpoch}';
      developer.log('⚠️ Failed to get device info: $e', name: 'RevenueCat');
    }

    await prefs.setString(_appUserIdKey, deviceId);
    _appUserId = deviceId;
    developer.log('✅ Created new app user ID: $deviceId', name: 'RevenueCat');
    return deviceId;
  }

  /// Get the current app user ID
  Future<String?> getAppUserId() async {
    if (_appUserId == null) {
      await _getStableAppUserId();
    }
    return _appUserId;
  }

  /// Initialize the service with real RevenueCat SDK
  Future<void> initialize() async {
    developer.log(
      '🛒 RevenueCat.initialize() called - _isInitialized: $_isInitialized',
      name: 'RevenueCat',
    );

    if (_isInitialized) {
      developer.log(
        '🛒 RevenueCat already initialized - skipping',
        name: 'RevenueCat',
      );
      return;
    }

    developer.log(
      '🛒 RevenueCatService: Initializing with real RevenueCat SDK',
      name: 'RevenueCat',
    );

    if (_placeholderMode) {
      developer.log(
        '🛒 Using placeholder mode (placeholderMode = $_placeholderMode)',
        name: 'RevenueCat',
      );
      await _initializePlaceholderMode();
    } else {
      developer.log(
        '🛒 Using real RevenueCat mode (placeholderMode = $_placeholderMode)',
        name: 'RevenueCat',
      );
      await _initializeRealRevenueCat();
    }

    _isInitialized = true;
    developer.log(
      '🛒 RevenueCatService: Initialization complete',
      name: 'RevenueCat',
    );
  }

  /// Initialize real RevenueCat SDK
  Future<void> _initializeRealRevenueCat() async {
    try {
      developer.log('🛒 Configuring RevenueCat SDK...', name: 'RevenueCat');

      // Check if we're on a supported platform for now (Android only)
      if (!Platform.isAndroid) {
        developer.log(
          '🛒 iOS/other platforms not yet configured - falling back to placeholder mode',
          name: 'RevenueCat',
        );
        await _initializePlaceholderMode();
        return;
      }

      // Configure RevenueCat for Android only for now
      final apiKey = _androidApiKey;

      developer.log('🛒 API Key validation - Key: $apiKey', name: 'RevenueCat');

      // Validate API key
      if (apiKey == 'goog_your_android_api_key_here' || apiKey.isEmpty) {
        developer.log(
          '🛒 Android API key not configured - falling back to placeholder mode',
          name: 'RevenueCat',
        );
        await _initializePlaceholderMode();
        return;
      }

      developer.log(
        '🛒 API Key validation passed - proceeding with real RevenueCat',
        name: 'RevenueCat',
      );

      final appUserId = await _getStableAppUserId();
      developer.log(
        '🔐 Configuring RevenueCat with app user ID: $appUserId',
        name: 'RevenueCat',
      );

      final configuration = PurchasesConfiguration(apiKey)
        ..appUserID = appUserId;

      // Enable debug mode in development
      if (_testingMode) {
        await Purchases.setLogLevel(LogLevel.debug);
      }

      await Purchases.configure(configuration);

      // Set up customer info listener
      Purchases.addCustomerInfoUpdateListener(_onCustomerInfoUpdated);

      // Get initial customer info
      _customerInfo = await Purchases.getCustomerInfo();

      developer.log(
        '🛒 RevenueCat SDK initialized successfully for Android',
        name: 'RevenueCat',
      );
    } catch (e) {
      developer.log('🛒 Error initializing RevenueCat: $e', name: 'RevenueCat');

      // Fall back to placeholder mode if real initialization fails
      developer.log('🛒 Falling back to placeholder mode', name: 'RevenueCat');
      await _initializePlaceholderMode();
    }
  }

  /// Handle customer info updates
  void _onCustomerInfoUpdated(CustomerInfo customerInfo) {
    _customerInfo = customerInfo;
    developer.log(
      '🛒 Customer info updated: ${customerInfo.entitlements.active.length} active entitlements',
      name: 'RevenueCat',
    );
  }

  /// Initialize placeholder mode with simulated entitlements
  Future<void> _initializePlaceholderMode() async {
    developer.log(
      '🛒 Initializing placeholder mode with simulated entitlements',
      name: 'RevenueCat',
    );

    // Simulate some owned content for testing
    if (_testingMode) {
      // In testing mode, grant access to some content for UI testing
      _ownedEntitlements['world_dazzle'] = true;
      _ownedEntitlements['world_forest'] = true;
      _ownedEntitlements['game_l4_l5'] = true;
      _purchaseHistory['world_dazzle'] = DateTime.now().subtract(
        const Duration(days: 30),
      );
      _purchaseHistory['world_forest'] = DateTime.now().subtract(
        const Duration(days: 15),
      );

      developer.log(
        '🛒 Testing mode: Granted access to sample content',
        name: 'RevenueCat',
      );
    }

    // Simulate delay like real API call
    await Future.delayed(const Duration(milliseconds: 500));
  }

  /// Check if user owns a specific entitlement
  Future<bool> hasEntitlement(String entitlementName) async {
    if (!_isInitialized) await initialize();

    if (_placeholderMode) {
      return _hasEntitlementPlaceholder(entitlementName);
    }

    try {
      // Get fresh customer info
      final customerInfo = await Purchases.getCustomerInfo();
      _customerInfo = customerInfo;

      // Check if the specific entitlement is active
      final entitlementInfo = customerInfo.entitlements.active[entitlementName];
      final hasAccess = entitlementInfo != null && entitlementInfo.isActive;

      developer.log(
        '🛒 Entitlement check: $entitlementName = $hasAccess',
        name: 'RevenueCat',
      );

      return hasAccess;
    } catch (e) {
      developer.log(
        '🛒 Error checking entitlement $entitlementName: $e',
        name: 'RevenueCat',
      );

      // Fall back to placeholder mode on error
      return _hasEntitlementPlaceholder(entitlementName);
    }
  }

  /// Placeholder mode entitlement checking
  bool _hasEntitlementPlaceholder(String entitlementName) {
    if (_testingMode && _isTestingModeEntitlement(entitlementName)) {
      return true; // Grant access to all content in testing mode
    }

    // Check active subscription first
    if (_activeSubscriptionTier != null &&
        _isSubscriptionEntitlement(entitlementName)) {
      return true;
    }

    // Check individual purchases
    final hasAccess = _ownedEntitlements[entitlementName] ?? false;
    developer.log(
      '🛒 Placeholder entitlement check: $entitlementName = $hasAccess',
      name: 'RevenueCat',
    );
    return hasAccess;
  }

  /// Check if entitlement should be granted in testing mode
  bool _isTestingModeEntitlement(String entitlementName) {
    // Grant access to implemented features in testing mode (updated names)
    const implementedEntitlements = [
      'world_dazzle',
      'world_forest',
      'world_christmas',
      'world_tropical',
      'world_flower',
      'world_desert',
      'game_l4_l5',
      'game_l6_l7',
      'bundle_worlds_all',
      'bundle_gaming_all',
      'sub_full_premium',
      'sub_full_premium_yearly',
    ];

    return implementedEntitlements.contains(entitlementName);
  }

  /// Check if entitlement is covered by subscription
  bool _isSubscriptionEntitlement(String entitlementName) {
    // Subscription covers all premium content except badges
    return entitlementName != 'premium_legacy_badge';
  }

  /// Purchase a product using RevenueCat
  Future<bool> purchaseProduct(String googlePlayProductId) async {
    if (!_isInitialized) await initialize();

    developer.log(
      '🛒 Attempting purchase: $googlePlayProductId',
      name: 'RevenueCat',
    );

    if (_placeholderMode) {
      return await _simulatePurchase(googlePlayProductId);
    }

    try {
      print('🛒 GETTING OFFERINGS...');
      // Get available offerings first
      final offerings = await Purchases.getOfferings();

      print('🛒 FETCHED OFFERINGS: ${offerings.all.length}');
      developer.log(
        '🛒 Fetched offerings - Total: ${offerings.all.length}',
        name: 'RevenueCat',
      );

      // Log all available products for debugging
      print('🛒 OFFERINGS COUNT: ${offerings.all.length}');
      for (final offering in offerings.all.values) {
        print(
          '🛒 OFFERING: ${offering.identifier} - ${offering.availablePackages.length} packages',
        );
        developer.log(
          '🛒 Offering: ${offering.identifier} - ${offering.availablePackages.length} packages',
          name: 'RevenueCat',
        );
        for (final package in offering.availablePackages) {
          print(
            '🛒   PKG: ${package.identifier}, PRODUCT: ${package.storeProduct.identifier}',
          );
          developer.log(
            '🛒   - Package: ${package.identifier}, Product ID: ${package.storeProduct.identifier}',
            name: 'RevenueCat',
          );
        }
      }
      print('🛒 LOOKING FOR: $googlePlayProductId');

      // Find the product in offerings
      Package? targetPackage;
      for (final offering in offerings.all.values) {
        for (final package in offering.availablePackages) {
          print(
            '🛒 COMPARING: "${package.storeProduct.identifier}" == "$googlePlayProductId"',
          );
          print(
            '🛒 MATCH: ${package.storeProduct.identifier == googlePlayProductId}',
          );

          // Try both package.identifier and storeProduct.identifier
          if (package.storeProduct.identifier == googlePlayProductId ||
              package.identifier == googlePlayProductId) {
            targetPackage = package;
            print(
              '🛒 ✅ FOUND MATCH! Package: ${package.identifier}, Product: ${package.storeProduct.identifier}',
            );
            developer.log(
              '🛒 ✅ Found matching package: ${package.identifier}',
              name: 'RevenueCat',
            );
            break;
          }
        }
        if (targetPackage != null) break;
      }

      print(
        '🛒 TARGET PACKAGE RESULT: ${targetPackage != null ? "FOUND" : "NOT FOUND"}',
      );

      if (targetPackage == null) {
        print('🛒 ❌ PACKAGE NOT FOUND - RETURNING FALSE');
        developer.log(
          '🛒 ❌ Product not found in offerings: $googlePlayProductId',
          name: 'RevenueCat',
        );
        developer.log(
          '🛒 ❌ This product ID does not match any products in your RevenueCat dashboard',
          name: 'RevenueCat',
        );
        return false;
      }

      // Attempt the purchase
      print(
        '🛒 🎯 ABOUT TO CALL purchasePackage() for: ${targetPackage.identifier}',
      );
      print(
        '🛒 🎯 Package details - ID: ${targetPackage.identifier}, Product: ${targetPackage.storeProduct.identifier}',
      );

      final purchaserInfo = await Purchases.purchasePackage(targetPackage);

      print('🛒 ✅ purchasePackage() RETURNED SUCCESSFULLY');
      print(
        '🛒 ✅ Customer Info: ${purchaserInfo.customerInfo.activeSubscriptions}',
      );

      // Update local customer info
      _customerInfo = purchaserInfo.customerInfo;

      print('🛒 ✅ PURCHASE SUCCESSFUL - RETURNING TRUE');
      developer.log(
        '🛒 Purchase successful: $googlePlayProductId',
        name: 'RevenueCat',
      );

      return true;
    } catch (e, stackTrace) {
      print('🛒 ❌ EXCEPTION CAUGHT IN purchaseProduct()');
      print('🛒 ❌ Exception type: ${e.runtimeType}');
      print('🛒 ❌ Exception message: $e');
      print('🛒 ❌ Stack trace: $stackTrace');

      developer.log(
        '🛒 Purchase failed: $googlePlayProductId - Error: $e',
        name: 'RevenueCat',
      );

      // Handle specific purchase errors
      if (e is PlatformException) {
        print(
          '🛒 ❌ PlatformException detected - Code: ${e.code}, Message: ${e.message}',
        );
        final errorCode = e.code;
        switch (errorCode) {
          case '1': // User cancelled
            print('🛒 ❌ User cancelled purchase');
            developer.log('🛒 Purchase cancelled by user', name: 'RevenueCat');
            break;
          case '2': // Payment invalid
            print('🛒 ❌ Payment method invalid');
            developer.log('🛒 Payment method invalid', name: 'RevenueCat');
            break;
          case '3': // Product not available
            print('🛒 ❌ Product not available');
            developer.log('🛒 Product not available', name: 'RevenueCat');
            break;
          default:
            print('🛒 ❌ Unknown error code: $errorCode');
            developer.log(
              '🛒 Unknown purchase error: $errorCode',
              name: 'RevenueCat',
            );
        }
      }

      print('🛒 ❌ RETURNING FALSE DUE TO EXCEPTION');
      return false;
    }
  }

  /// Simulate a purchase with realistic behavior
  Future<bool> _simulatePurchase(String googlePlayProductId) async {
    // Simulate purchase flow delay
    await Future.delayed(const Duration(seconds: 2));

    // Find the corresponding entitlement name
    final product = PremiumProductCatalog.getAllProducts()
        .cast<PremiumProduct?>()
        .firstWhere(
          (p) => p?.googlePlayProductId == googlePlayProductId,
          orElse: () => null,
        );

    if (product == null) {
      developer.log(
        '🛒 Product not found: $googlePlayProductId',
        name: 'RevenueCat',
      );
      return false;
    }

    // Simulate purchase success (90% success rate for testing)
    final success = DateTime.now().millisecondsSinceEpoch % 10 != 0;

    if (success) {
      _ownedEntitlements[product.entitlementName] = true;
      _purchaseHistory[product.entitlementName] = DateTime.now();

      // Handle subscription purchases
      if (product is SubscriptionProduct) {
        _activeSubscriptionTier = product.entitlementName;
        developer.log(
          '🛒 Subscription activated: ${product.entitlementName}',
          name: 'RevenueCat',
        );
      }

      developer.log(
        '🛒 Purchase successful: ${product.entitlementName}',
        name: 'RevenueCat',
      );
      return true;
    } else {
      developer.log(
        '🛒 Purchase failed (simulated): $googlePlayProductId',
        name: 'RevenueCat',
      );
      return false;
    }
  }

  /// Restore previous purchases using RevenueCat
  Future<void> restorePurchases() async {
    if (!_isInitialized) await initialize();

    developer.log('🛒 Restoring purchases...', name: 'RevenueCat');

    if (_placeholderMode) {
      await _simulateRestore();
      return;
    }

    try {
      final customerInfo = await Purchases.restorePurchases();
      _customerInfo = customerInfo;

      final activeEntitlements = customerInfo.entitlements.active.length;
      developer.log(
        '🛒 Restore complete: $activeEntitlements entitlements restored',
        name: 'RevenueCat',
      );
    } catch (e) {
      developer.log('🛒 Error restoring purchases: $e', name: 'RevenueCat');

      // Fall back to placeholder restore on error
      await _simulateRestore();
    }
  }

  /// Simulate restore purchases
  Future<void> _simulateRestore() async {
    await Future.delayed(const Duration(seconds: 1));

    // In placeholder mode, restore any previously "purchased" items
    // This would typically restore from device receipt or RevenueCat

    developer.log(
      '🛒 Restore complete: ${_ownedEntitlements.length} items restored',
      name: 'RevenueCat',
    );
  }

  /// Get all available products for the store
  Future<List<PremiumProduct>> getAvailableProducts() async {
    if (!_isInitialized) await initialize();

    final allProducts = PremiumProductCatalog.getAllProducts();

    // Update ownership status for each product
    final updatedProducts = <PremiumProduct>[];

    for (final product in allProducts) {
      final isOwned = await hasEntitlement(product.entitlementName);
      updatedProducts.add(_updateProductOwnership(product, isOwned));
    }

    return updatedProducts;
  }

  /// Update product with current ownership status
  PremiumProduct _updateProductOwnership(PremiumProduct product, bool isOwned) {
    if (product is SubscriptionProduct) {
      return SubscriptionProduct(
        entitlementName: product.entitlementName,
        googlePlayProductId: product.googlePlayProductId,
        displayName: product.displayName,
        description: product.description,
        priceUSD: product.priceUSD,
        metadataTags: product.metadataTags,
        tier: product.tier,
        billingPeriod: product.billingPeriod,
        includedFeatures: product.includedFeatures,
        isOwned: isOwned,
      );
    } else if (product is WorldUnlockProduct) {
      return WorldUnlockProduct(
        entitlementName: product.entitlementName,
        googlePlayProductId: product.googlePlayProductId,
        displayName: product.displayName,
        description: product.description,
        priceUSD: product.priceUSD,
        metadataTags: product.metadataTags,
        worldType: product.worldType,
        previewImagePath: product.previewImagePath,
        features: product.features,
        isOwned: isOwned,
        isAvailable: product.isAvailable,
      );
    } else if (product is LevelUnlockProduct) {
      return LevelUnlockProduct(
        entitlementName: product.entitlementName,
        googlePlayProductId: product.googlePlayProductId,
        displayName: product.displayName,
        description: product.description,
        priceUSD: product.priceUSD,
        metadataTags: product.metadataTags,
        levelNumbers: product.levelNumbers,
        gameType: product.gameType,
        difficultyLevel: product.difficultyLevel,
        isOwned: isOwned,
        isAvailable: product.isAvailable,
      );
    } else if (product is AvatarUnlockProduct) {
      return AvatarUnlockProduct(
        entitlementName: product.entitlementName,
        googlePlayProductId: product.googlePlayProductId,
        displayName: product.displayName,
        description: product.description,
        priceUSD: product.priceUSD,
        metadataTags: product.metadataTags,
        avatarType: product.avatarType,
        previewImagePath: product.previewImagePath,
        customizationOptions: product.customizationOptions,
        isOwned: isOwned,
        isAvailable: product.isAvailable,
      );
    } else if (product is BundleProduct) {
      return BundleProduct(
        entitlementName: product.entitlementName,
        googlePlayProductId: product.googlePlayProductId,
        displayName: product.displayName,
        description: product.description,
        priceUSD: product.priceUSD,
        metadataTags: product.metadataTags,
        includedProducts: product.includedProducts,
        individualPrice: product.individualPrice,
        bundleType: product.bundleType,
        isOwned: isOwned,
        isAvailable: product.isAvailable,
      );
    } else if (product is BadgeProduct) {
      return BadgeProduct(
        entitlementName: product.entitlementName,
        googlePlayProductId: product.googlePlayProductId,
        displayName: product.displayName,
        description: product.description,
        priceUSD: product.priceUSD,
        metadataTags: product.metadataTags,
        badgeIconPath: product.badgeIconPath,
        unlockCondition: product.unlockCondition,
        isOwned: isOwned,
      );
    }

    return product;
  }

  /// Check if user has active subscription
  Future<bool> hasActiveSubscription() async {
    if (!_isInitialized) await initialize();

    if (_placeholderMode) {
      return _activeSubscriptionTier != null;
    }

    try {
      final customerInfo = await Purchases.getCustomerInfo();
      _customerInfo = customerInfo;

      // Check for any active subscription entitlements
      final hasActiveSub =
          customerInfo.entitlements.active.isNotEmpty &&
          (customerInfo.entitlements.active.containsKey('sub_full_premium') ||
              customerInfo.entitlements.active.containsKey(
                'sub_full_premium_yearly',
              ));

      return hasActiveSub;
    } catch (e) {
      developer.log(
        '🛒 Error checking subscription status: $e',
        name: 'RevenueCat',
      );
      return false;
    }
  }

  /// Get active subscription tier
  Future<String?> getActiveSubscriptionTier() async {
    if (!_isInitialized) await initialize();

    if (_placeholderMode) {
      return _activeSubscriptionTier;
    }

    try {
      final customerInfo = await Purchases.getCustomerInfo();
      _customerInfo = customerInfo;

      // Check which subscription is active
      if (customerInfo.entitlements.active.containsKey('sub_full_premium')) {
        return 'sub_full_premium';
      } else if (customerInfo.entitlements.active.containsKey(
        'sub_full_premium_yearly',
      )) {
        return 'sub_full_premium_yearly';
      }

      return null;
    } catch (e) {
      developer.log(
        '🛒 Error getting subscription tier: $e',
        name: 'RevenueCat',
      );
      return null;
    }
  }

  /// Get purchase history for debugging
  Map<String, DateTime> getPurchaseHistory() {
    return Map.from(_purchaseHistory);
  }

  /// Check if specific world is unlocked (for compatibility with existing system)
  Future<bool> isWorldUnlocked(String worldType) async {
    // Check subscription first
    if (await hasActiveSubscription()) {
      return true;
    }

    // Find the corresponding entitlement
    final worldProduct = PremiumProductCatalog.worldUnlocks
        .cast<WorldUnlockProduct?>()
        .firstWhere((w) => w?.worldType == worldType, orElse: () => null);

    if (worldProduct == null) return false;

    return await hasEntitlement(worldProduct.entitlementName);
  }

  /// Check if specific level is unlocked
  Future<bool> isLevelUnlocked(int levelNumber) async {
    // Check subscription first
    if (await hasActiveSubscription()) {
      return true;
    }

    // Find the level unlock product that includes this level
    final levelProduct = PremiumProductCatalog.levelUnlocks
        .cast<LevelUnlockProduct?>()
        .firstWhere(
          (l) => l?.levelNumbers.contains(levelNumber) ?? false,
          orElse: () => null,
        );

    if (levelProduct == null) return false;

    return await hasEntitlement(levelProduct.entitlementName);
  }

  /// Get all unlocked worlds
  Future<List<String>> getUnlockedWorlds() async {
    final unlockedWorlds = <String>[];

    for (final worldProduct in PremiumProductCatalog.worldUnlocks) {
      if (await hasEntitlement(worldProduct.entitlementName)) {
        unlockedWorlds.add(worldProduct.worldType);
      }
    }

    return unlockedWorlds;
  }

  /// Get current subscription status for UI display
  Future<Map<String, dynamic>> getSubscriptionStatus() async {
    final hasSubscription = await hasActiveSubscription();
    final tier = await getActiveSubscriptionTier();

    return {
      'hasSubscription': hasSubscription,
      'tier': tier,
      'isYearly': tier?.contains('yearly') ?? false,
      'renewalDate': hasSubscription
          ? DateTime.now().add(const Duration(days: 30))
          : null,
    };
  }

  /// For testing: Grant access to specific entitlement
  void grantTestingAccess(String entitlementName) {
    if (_placeholderMode && _testingMode) {
      _ownedEntitlements[entitlementName] = true;
      _purchaseHistory[entitlementName] = DateTime.now();
      developer.log(
        '🛒 Testing: Granted access to $entitlementName',
        name: 'RevenueCat',
      );
    }
  }

  /// For testing: Remove access to specific entitlement
  void revokeTestingAccess(String entitlementName) {
    if (_placeholderMode && _testingMode) {
      _ownedEntitlements.remove(entitlementName);
      _purchaseHistory.remove(entitlementName);
      developer.log(
        '🛒 Testing: Revoked access to $entitlementName',
        name: 'RevenueCat',
      );
    }
  }

  /// For testing: Reset all entitlements
  void resetTestingEntitlements() {
    if (_placeholderMode && _testingMode) {
      _ownedEntitlements.clear();
      _purchaseHistory.clear();
      _activeSubscriptionTier = null;
      developer.log('🛒 Testing: Reset all entitlements', name: 'RevenueCat');
    }
  }

  /// Get current customer info (for debugging and external usage)
  CustomerInfo? get customerInfo => _customerInfo;

  /// Diagnostic method for testing RevenueCat integration
  Future<Map<String, dynamic>> getDiagnosticInfo() async {
    if (!_isInitialized) await initialize();

    final diagnostics = <String, dynamic>{
      'isInitialized': _isInitialized,
      'isPlaceholderMode': _placeholderMode,
      'isTestingMode': _testingMode,
      'platform': Platform.isAndroid ? 'Android' : 'iOS',
      'hasCustomerInfo': _customerInfo != null,
    };

    if (!_placeholderMode) {
      try {
        final offerings = await Purchases.getOfferings();
        diagnostics['offeringsCount'] = offerings.all.length;
        diagnostics['currentOfferingId'] =
            offerings.current?.identifier ?? 'none';

        final customerInfo = await Purchases.getCustomerInfo();
        diagnostics['activeEntitlements'] = customerInfo
            .entitlements
            .active
            .keys
            .toList();
        diagnostics['allPurchases'] = customerInfo.allPurchaseDates.keys
            .toList();
      } catch (e) {
        diagnostics['revenueCatError'] = e.toString();
      }
    } else {
      diagnostics['placeholderEntitlements'] = _ownedEntitlements.keys.toList();
    }

    return diagnostics;
  }

  /// Check if service is in placeholder mode
  bool get isPlaceholderMode => _placeholderMode;

  /// Check if service is in testing mode
  bool get isTestingMode => _testingMode;

  /// Check if service is initialized
  bool get isInitialized => _isInitialized;
}
