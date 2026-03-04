import 'package:flutter/material.dart';
import 'dart:developer' as developer;

import '../models/premium_product_models.dart';
import '../services/enhanced_premium_service.dart';
import '../services/revenue_cat_service.dart';
import '../services/premium_content_service.dart';
import '../services/premium_service.dart';

/// Premium Content Store with multi-tab interface
/// Displays all products from the entitlement table
class PremiumStoreScreen extends StatefulWidget {
  const PremiumStoreScreen({super.key});

  @override
  State<PremiumStoreScreen> createState() => _PremiumStoreScreenState();
}

class _PremiumStoreScreenState extends State<PremiumStoreScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  final EnhancedPremiumService _premiumService =
      EnhancedPremiumService.instance;
  final RevenueCatService _revenueCatService = RevenueCatService();
  final PremiumContentService _contentService = PremiumContentService();

  bool _isLoading = false;
  Map<String, bool> _purchaseStates = {};

  @override
  void initState() {
    super.initState();
    developer.log(
      '💎 💎 💎 PremiumStoreScreen initState called',
      name: 'PremiumStore',
    );
    _tabController = TabController(length: 5, vsync: this);
    _initializeServices();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _initializeServices() async {
    setState(() => _isLoading = true);

    try {
      await _contentService.initialize();
      await _premiumService.initialize();
      await _loadPurchaseStates();
    } catch (e) {
      developer.log('❌ Error initializing store: $e', name: 'PremiumStore');
    }

    setState(() => _isLoading = false);
  }

  Future<void> _loadPurchaseStates() async {
    final states = <String, bool>{};

    // Load subscription status
    states['premium_monthly'] = await _revenueCatService.hasEntitlement(
      'sub_full_premium',
    );
    states['premium_yearly'] = await _revenueCatService.hasEntitlement(
      'sub_full_premium_yearly',
    );

    // Load world unlock states
    for (final world in PremiumProductCatalog.worldUnlocks) {
      states[world.googlePlayProductId] = await _revenueCatService
          .hasEntitlement(world.entitlementName);
    }

    // Load level unlock states
    for (final level in PremiumProductCatalog.levelUnlocks) {
      states[level.googlePlayProductId] = await _revenueCatService
          .hasEntitlement(level.entitlementName);
    }

    // Load avatar unlock states
    for (final avatar in PremiumProductCatalog.avatarUnlocks) {
      states[avatar.googlePlayProductId] = await _revenueCatService
          .hasEntitlement(avatar.entitlementName);
    }

    // Load bundle states
    for (final bundle in PremiumProductCatalog.bundles) {
      states[bundle.googlePlayProductId] = await _revenueCatService
          .hasEntitlement(bundle.entitlementName);
    }

    setState(() => _purchaseStates = states);
  }

  Future<void> _purchaseProduct(PremiumProduct product) async {
    print('🛒🛒🛒 PURCHASE METHOD CALLED: ${product.googlePlayProductId}');
    developer.log(
      '🛒 🛒 🛒 _purchaseProduct called for: ${product.googlePlayProductId}',
      name: 'PremiumStore',
    );

    setState(() => _isLoading = true);

    try {
      print('🛒 TRYING TO PURCHASE: ${product.googlePlayProductId}');
      developer.log(
        '🛒 Purchasing product: ${product.googlePlayProductId}',
        name: 'PremiumStore',
      );

      final success = await _revenueCatService.purchaseProduct(
        product.googlePlayProductId,
      );

      developer.log(
        '🛒 Purchase result: $success for ${product.googlePlayProductId}',
        name: 'PremiumStore',
      );

      if (success) {
        // Purchase successful - update states
        developer.log(
          '🛒 Purchase successful, loading states',
          name: 'PremiumStore',
        );

        // Unlock the purchased content in PremiumService
        if (product is WorldUnlockProduct) {
          await PremiumService.instance.unlockWorldTheme(product.worldType);
          developer.log(
            '🛒 ✅ Unlocked world ${product.worldType} in PremiumService',
            name: 'PremiumStore',
          );
        } else if (product is LevelUnlockProduct) {
          await PremiumService.instance.unlockGamingLevels(
            product.levelNumbers,
          );
          developer.log(
            '🛒 ✅ Unlocked gaming levels ${product.levelNumbers} in PremiumService',
            name: 'PremiumStore',
          );
        }

        await _loadPurchaseStates();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Successfully purchased ${product.displayName}!'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      } else {
        developer.log(
          '🛒 ❌ Purchase failed (returned false)',
          name: 'PremiumStore',
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Purchase failed. Please try again.'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (e) {
      developer.log('❌ Purchase error: $e', name: 'PremiumStore');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }

    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Premium Store'),
        backgroundColor: const Color(0xFF1A1A1A),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: false,
          indicatorColor: const Color(0xFF4CAF50),
          labelColor: Colors.white,
          unselectedLabelColor: Colors.grey,
          labelStyle: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
          tabs: const [
            Tab(text: 'Subscriptions'),
            Tab(text: 'Worlds'),
            Tab(text: 'Levels'),
            Tab(text: 'Avatars'),
            Tab(text: 'Bundles'),
          ],
        ),
      ),
      backgroundColor: const Color(0xFF2D2D2D),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF4CAF50)),
              ),
            )
          : TabBarView(
              controller: _tabController,
              children: [
                _buildSubscriptionsTab(),
                _buildWorldsTab(),
                _buildLevelsTab(),
                _buildAvatarsTab(),
                _buildBundlesTab(),
              ],
            ),
    );
  }

  Widget _buildSubscriptionsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Premium Subscriptions',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Unlock all premium features, worlds, and content',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
          const SizedBox(height: 24),

          // Monthly Subscription
          _buildSubscriptionCard(PremiumProductCatalog.subscriptions[0]),
          const SizedBox(height: 16),

          // Yearly Subscription
          _buildSubscriptionCard(PremiumProductCatalog.subscriptions[1]),

          const SizedBox(height: 32),
          _buildSubscriptionBenefits(),
        ],
      ),
    );
  }

  Widget _buildSubscriptionCard(SubscriptionProduct subscription) {
    final isPurchased =
        _purchaseStates[subscription.googlePlayProductId] ?? false;
    final isYearly = subscription.id == 'premium_yearly';

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isYearly
              ? [const Color(0xFF4CAF50), const Color(0xFF45a049)]
              : [const Color(0xFF3F3F3F), const Color(0xFF4A4A4A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: isYearly
            ? Border.all(color: const Color(0xFF4CAF50), width: 2)
            : null,
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        subscription.displayName,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      if (isYearly) ...[
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.orange,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'BEST VALUE',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '\$${subscription.price.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      '/${subscription.billingPeriod}',
                      style: const TextStyle(color: Colors.grey, fontSize: 14),
                    ),
                  ],
                ),
              ],
            ),

            if (isYearly) ...[
              const SizedBox(height: 12),
              const Text(
                'Save \$20.88 compared to monthly',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],

            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isPurchased
                    ? null
                    : () => _purchaseProduct(subscription),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isPurchased
                      ? Colors.grey
                      : (isYearly ? Colors.white : const Color(0xFF4CAF50)),
                  foregroundColor: isPurchased
                      ? Colors.white
                      : (isYearly ? const Color(0xFF4CAF50) : Colors.white),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  isPurchased ? 'ACTIVE' : 'SUBSCRIBE',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubscriptionBenefits() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF3F3F3F),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Premium Benefits',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 16),

          _buildBenefit('Access to all premium worlds'),
          _buildBenefit('Unlock advanced gaming levels'),
          _buildBenefit('Premium avatar collections'),
          _buildBenefit('Exclusive world bundles'),
          _buildBenefit('Priority customer support'),
          _buildBenefit('Early access to new features'),
        ],
      ),
    );
  }

  Widget _buildBenefit(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          const Icon(Icons.check_circle, color: Color(0xFF4CAF50), size: 20),
          const SizedBox(width: 12),
          Text(text, style: const TextStyle(color: Colors.white, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildWorldsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Premium Worlds',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Unlock beautiful world templates for your creations',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
          const SizedBox(height: 24),

          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.75,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),
            itemCount: PremiumProductCatalog.worldUnlocks.length,
            itemBuilder: (context, index) {
              return _buildWorldCard(PremiumProductCatalog.worldUnlocks[index]);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildWorldCard(WorldUnlockProduct world) {
    final isPurchased = _purchaseStates[world.googlePlayProductId] ?? false;

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF3F3F3F),
        borderRadius: BorderRadius.circular(16),
        border: isPurchased
            ? Border.all(color: const Color(0xFF4CAF50), width: 2)
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // World preview image placeholder
          Expanded(
            flex: 3,
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: _getWorldGradient(world.worldType),
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
              ),
              child: Stack(
                children: [
                  Center(
                    child: Icon(
                      _getWorldIcon(world.worldType),
                      size: 48,
                      color: Colors.white.withOpacity(0.8),
                    ),
                  ),
                  if (isPurchased)
                    const Positioned(
                      top: 8,
                      right: 8,
                      child: Icon(
                        Icons.check_circle,
                        color: Color(0xFF4CAF50),
                        size: 24,
                      ),
                    ),
                ],
              ),
            ),
          ),

          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    world.displayName,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const Spacer(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '\$${world.price.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF4CAF50),
                        ),
                      ),
                      SizedBox(
                        width: 60,
                        height: 28,
                        child: ElevatedButton(
                          onPressed: isPurchased
                              ? null
                              : () => _purchaseProduct(world),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isPurchased
                                ? Colors.grey
                                : const Color(0xFF4CAF50),
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.zero,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: Text(
                            isPurchased ? 'OWNED' : 'BUY',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLevelsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Premium Gaming Levels',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Unlock advanced gaming challenges and features',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
          const SizedBox(height: 24),

          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: PremiumProductCatalog.levelUnlocks.length,
            itemBuilder: (context, index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _buildLevelCard(
                  PremiumProductCatalog.levelUnlocks[index],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildLevelCard(LevelUnlockProduct level) {
    final isPurchased = _purchaseStates[level.id] ?? false;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF3F3F3F),
        borderRadius: BorderRadius.circular(16),
        border: isPurchased
            ? Border.all(color: const Color(0xFF4CAF50), width: 2)
            : null,
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF6A1B9A), Color(0xFF8E24AA)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.videogame_asset,
              color: Colors.white,
              size: 30,
            ),
          ),
          const SizedBox(width: 16),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  level.displayName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  level.levelsIncluded.join(', '),
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),

          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\$${level.price.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF4CAF50),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: 80,
                height: 32,
                child: ElevatedButton(
                  onPressed: isPurchased ? null : () => _purchaseProduct(level),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isPurchased
                        ? Colors.grey
                        : const Color(0xFF4CAF50),
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: Text(
                    isPurchased ? 'OWNED' : 'UNLOCK',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAvatarsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Premium Avatars',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Unlock exclusive avatar collections and customizations',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
          const SizedBox(height: 24),

          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 1.2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),
            itemCount: PremiumProductCatalog.avatarUnlocks.length,
            itemBuilder: (context, index) {
              return _buildAvatarCard(
                PremiumProductCatalog.avatarUnlocks[index],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAvatarCard(AvatarUnlockProduct avatar) {
    final isPurchased = _purchaseStates[avatar.id] ?? false;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF3F3F3F),
        borderRadius: BorderRadius.circular(16),
        border: isPurchased
            ? Border.all(color: const Color(0xFF4CAF50), width: 2)
            : null,
      ),
      child: Column(
        children: [
          Expanded(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: avatar.avatarType == 'dog'
                      ? [const Color(0xFFFF7043), const Color(0xFFFF5722)]
                      : [const Color(0xFF42A5F5), const Color(0xFF2196F3)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.circular(40),
              ),
              child: Icon(
                avatar.avatarType == 'dog' ? Icons.pets : Icons.emoji_nature,
                color: Colors.white,
                size: 40,
              ),
            ),
          ),

          const SizedBox(height: 12),
          Text(
            avatar.displayName,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '\$${avatar.price.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF4CAF50),
                ),
              ),
              SizedBox(
                width: 60,
                height: 28,
                child: ElevatedButton(
                  onPressed: isPurchased
                      ? null
                      : () => _purchaseProduct(avatar),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isPurchased
                        ? Colors.grey
                        : const Color(0xFF4CAF50),
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: Text(
                    isPurchased ? 'OWNED' : 'BUY',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBundlesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Premium Bundles',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Save money with bundled premium content packages',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
          const SizedBox(height: 24),

          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: PremiumProductCatalog.bundles.length,
            itemBuilder: (context, index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _buildBundleCard(PremiumProductCatalog.bundles[index]),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildBundleCard(BundleProduct bundle) {
    final isPurchased = _purchaseStates[bundle.id] ?? false;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF4A148C), Color(0xFF6A1B9A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: isPurchased
            ? Border.all(color: const Color(0xFF4CAF50), width: 2)
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      bundle.displayName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'SAVE \$${bundle.savings.toStringAsFixed(2)}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '\$${bundle.price.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    'was \$${bundle.originalPrice.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Colors.grey,
                      fontSize: 12,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 16),
          Text(
            'Includes: ${bundle.includedItems.join(', ')}',
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),

          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: isPurchased ? null : () => _purchaseProduct(bundle),
              style: ElevatedButton.styleFrom(
                backgroundColor: isPurchased ? Colors.grey : Colors.white,
                foregroundColor: isPurchased
                    ? Colors.white
                    : const Color(0xFF4A148C),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                isPurchased ? 'OWNED' : 'BUY BUNDLE',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Color> _getWorldGradient(String worldType) {
    switch (worldType) {
      case 'tropical-paradise':
        return [const Color(0xFF00BCD4), const Color(0xFF4CAF50)];
      case 'flower-wonderland':
        return [const Color(0xFFE91E63), const Color(0xFF9C27B0)];
      case 'dazzle':
        return [const Color(0xFFFFD700), const Color(0xFFFF6B35)];
      case 'forest':
        return [const Color(0xFF4CAF50), const Color(0xFF2E7D32)];
      case 'cave':
        return [const Color(0xFF795548), const Color(0xFF5D4037)];
      case 'christmas':
        return [const Color(0xFFD32F2F), const Color(0xFF4CAF50)];
      case 'desert-oasis':
        return [const Color(0xFFFF9800), const Color(0xFFFFC107)];
      default:
        return [const Color(0xFF9E9E9E), const Color(0xFF616161)];
    }
  }

  IconData _getWorldIcon(String worldType) {
    switch (worldType) {
      case 'tropical-paradise':
        return Icons.beach_access;
      case 'flower-wonderland':
        return Icons.local_florist;
      case 'dazzle':
        return Icons.star;
      case 'forest':
        return Icons.park;
      case 'cave':
        return Icons.terrain;
      case 'christmas':
        return Icons.celebration;
      case 'desert-oasis':
        return Icons.wb_sunny;
      default:
        return Icons.public;
    }
  }
}
