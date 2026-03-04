// Browser version: RevenueCat not available in web
// import 'package:purchases_flutter/purchases_flutter.dart';

// Stubs for browser compatibility
class Package {
  final StoreProduct storeProduct;
  final String packageType;

  const Package({required this.storeProduct, required this.packageType});
}

class StoreProduct {
  final String identifier;
  final String title;
  final String description;
  final String priceString;

  const StoreProduct({
    required this.identifier,
    required this.title,
    required this.description,
    required this.priceString,
  });
}

class PackageType {
  static const String monthly = 'monthly';
  static const String annual = 'annual';
  static const String weekly = 'weekly';
  static const String lifetime = 'lifetime';
}

class CustomerInfo {
  final EntitlementsInfo entitlements;
  final String originalAppUserId;

  const CustomerInfo({
    required this.entitlements,
    this.originalAppUserId = 'web-user',
  });
}

class EntitlementsInfo {
  final Map<String, EntitlementInfo> active;

  const EntitlementsInfo({this.active = const {}});

  bool get isNotEmpty => active.isNotEmpty;
  bool get isEmpty => active.isEmpty;
  Iterable<EntitlementInfo> get values => active.values;
}

class EntitlementInfo {
  final String? expirationDate;

  const EntitlementInfo({this.expirationDate});
}

/// Model representing different premium subscription tiers
enum PremiumTier {
  none,
  worlds, // Premium world templates only
  gaming, // Premium gaming levels only
  full, // All premium features
}

/// Model representing a premium feature category
class PremiumFeature {
  final String id;
  final String name;
  final String description;
  final List<String> items;
  final bool isUnlocked;

  const PremiumFeature({
    required this.id,
    required this.name,
    required this.description,
    required this.items,
    required this.isUnlocked,
  });

  /// Create premium worlds feature
  static PremiumFeature worlds({required bool isUnlocked}) {
    return PremiumFeature(
      id: 'premium_worlds',
      name: 'Premium World Templates',
      description: 'Unlock stunning new environments for your 3D experiences',
      items: [
        'Dazzle Bedroom - Sparkling bedroom with dynamic lighting',
        'Forest Realm - Mystical forest with animated nature elements',
      ],
      isUnlocked: isUnlocked,
    );
  }

  /// Create premium gaming feature
  static PremiumFeature gaming({required bool isUnlocked}) {
    return PremiumFeature(
      id: 'premium_gaming',
      name: 'Premium Gaming Levels',
      description: 'Challenge yourself with advanced gaming experiences',
      items: [
        'Level 4 - Advanced puzzle challenges',
        'Level 5 - Master-level gaming experience',
      ],
      isUnlocked: isUnlocked,
    );
  }
}

/// Model representing subscription offering details
class SubscriptionOffer {
  final String productId;
  final String title;
  final String description;
  final String price;
  final String period;
  final Package package;
  final bool isPopular;

  const SubscriptionOffer({
    required this.productId,
    required this.title,
    required this.description,
    required this.price,
    required this.period,
    required this.package,
    this.isPopular = false,
  });

  /// Create subscription offer from RevenueCat package
  static SubscriptionOffer fromPackage(
    Package package, {
    bool isPopular = false,
  }) {
    return SubscriptionOffer(
      productId: package.storeProduct.identifier,
      title: package.storeProduct.title,
      description: package.storeProduct.description,
      price: package.storeProduct.priceString,
      period: _getPeriodFromPackage(package),
      package: package,
      isPopular: isPopular,
    );
  }

  static String _getPeriodFromPackage(Package package) {
    switch (package.packageType) {
      case PackageType.monthly:
        return 'Monthly';
      case PackageType.annual:
        return 'Yearly';
      case PackageType.weekly:
        return 'Weekly';
      case PackageType.lifetime:
        return 'Lifetime';
      default:
        return 'Subscription';
    }
  }
}

/// Model representing user's current subscription status
class UserSubscriptionStatus {
  final bool isSubscribed;
  final PremiumTier currentTier;
  final List<PremiumFeature> availableFeatures;
  final List<PremiumFeature> unlockedFeatures;
  final DateTime? subscriptionExpiryDate;
  final String? customerId;

  const UserSubscriptionStatus({
    required this.isSubscribed,
    required this.currentTier,
    required this.availableFeatures,
    required this.unlockedFeatures,
    this.subscriptionExpiryDate,
    this.customerId,
  });

  /// Create subscription status from RevenueCat customer info
  static UserSubscriptionStatus fromCustomerInfo(CustomerInfo? customerInfo) {
    if (customerInfo == null) {
      return const UserSubscriptionStatus(
        isSubscribed: false,
        currentTier: PremiumTier.none,
        availableFeatures: [],
        unlockedFeatures: [],
      );
    }

    // Determine premium tier based on active entitlements
    PremiumTier tier = PremiumTier.none;
    bool hasWorlds = customerInfo.entitlements.active.containsKey(
      'premium_worlds',
    );
    bool hasGaming = customerInfo.entitlements.active.containsKey(
      'premium_gaming',
    );
    bool hasFull = customerInfo.entitlements.active.containsKey('full_premium');

    if (hasFull) {
      tier = PremiumTier.full;
    } else if (hasWorlds && hasGaming) {
      tier = PremiumTier.full;
    } else if (hasWorlds) {
      tier = PremiumTier.worlds;
    } else if (hasGaming) {
      tier = PremiumTier.gaming;
    }

    // Create feature lists
    final worldsFeature = PremiumFeature.worlds(
      isUnlocked: hasWorlds || hasFull,
    );
    final gamingFeature = PremiumFeature.gaming(
      isUnlocked: hasGaming || hasFull,
    );

    final availableFeatures = [worldsFeature, gamingFeature];
    final unlockedFeatures = availableFeatures
        .where((f) => f.isUnlocked)
        .toList();

    // Get subscription expiry date
    DateTime? expiryDate;
    if (customerInfo.entitlements.active.isNotEmpty) {
      final activeEntitlement = customerInfo.entitlements.active.values.first;
      final expiryString = activeEntitlement.expirationDate;
      if (expiryString != null) {
        try {
          expiryDate = DateTime.parse(expiryString);
        } catch (e) {
          // Handle parsing error gracefully
          expiryDate = null;
        }
      }
    }

    return UserSubscriptionStatus(
      isSubscribed: customerInfo.entitlements.active.isNotEmpty,
      currentTier: tier,
      availableFeatures: availableFeatures,
      unlockedFeatures: unlockedFeatures,
      subscriptionExpiryDate: expiryDate,
      customerId: customerInfo.originalAppUserId,
    );
  }

  /// Get summary for UI display
  Map<String, dynamic> toDisplayMap() {
    return {
      'isSubscribed': isSubscribed,
      'tier': currentTier.name,
      'unlockedFeatures': unlockedFeatures.map((f) => f.name).toList(),
      'totalFeatures': availableFeatures.length,
      'unlockedCount': unlockedFeatures.length,
      'customerId': customerId,
      'expiryDate': subscriptionExpiryDate?.toIso8601String(),
    };
  }
}

/// Model for premium feature unlock requests
class PremiumFeatureRequest {
  final String featureId;
  final String featureName;
  final String
  context; // Where the request came from (e.g., 'world_selection', 'gaming_level')

  const PremiumFeatureRequest({
    required this.featureId,
    required this.featureName,
    required this.context,
  });

  /// Create request for premium worlds
  static PremiumFeatureRequest worlds({String context = 'unknown'}) {
    return PremiumFeatureRequest(
      featureId: 'premium_worlds',
      featureName: 'Premium World Templates',
      context: context,
    );
  }

  /// Create request for premium gaming
  static PremiumFeatureRequest gaming({String context = 'unknown'}) {
    return PremiumFeatureRequest(
      featureId: 'premium_gaming',
      featureName: 'Premium Gaming Levels',
      context: context,
    );
  }
}
