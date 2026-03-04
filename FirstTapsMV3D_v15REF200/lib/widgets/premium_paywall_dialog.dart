import 'package:flutter/material.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:firsttaps_mv3d/services/revenue_cat_service.dart';
import 'package:firsttaps_mv3d/models/subscription_model.dart';

/// Custom paywall dialog for FirstTaps3D premium features
/// Shows subscription options for world templates and gaming levels
class PremiumPaywallDialog extends StatefulWidget {
  final PremiumFeatureRequest? featureRequest;
  final VoidCallback? onPurchaseSuccess;
  final VoidCallback? onCancel;

  const PremiumPaywallDialog({
    super.key,
    this.featureRequest,
    this.onPurchaseSuccess,
    this.onCancel,
  });

  /// Show paywall for specific premium feature
  static Future<void> showForFeature(
    BuildContext context,
    PremiumFeatureRequest featureRequest, {
    VoidCallback? onPurchaseSuccess,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (context) => PremiumPaywallDialog(
        featureRequest: featureRequest,
        onPurchaseSuccess: onPurchaseSuccess,
      ),
    );
  }

  /// Show general premium paywall
  static Future<void> show(
    BuildContext context, {
    VoidCallback? onPurchaseSuccess,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (context) =>
          PremiumPaywallDialog(onPurchaseSuccess: onPurchaseSuccess),
    );
  }

  @override
  State<PremiumPaywallDialog> createState() => _PremiumPaywallDialogState();
}

class _PremiumPaywallDialogState extends State<PremiumPaywallDialog> {
  bool _isLoading = true;
  bool _isPurchasing = false;
  String? _errorMessage;
  List<SubscriptionOffer> _subscriptionOffers = [];

  @override
  void initState() {
    super.initState();
    _loadSubscriptionOffers();
  }

  Future<void> _loadSubscriptionOffers() async {
    try {
      final offerings = await RevenueCatService.getOfferings();

      if (offerings.current != null) {
        final offers = offerings.current!.availablePackages
            .map(
              (package) => SubscriptionOffer.fromPackage(
                package,
                isPopular: package.packageType == PackageType.annual,
              ),
            )
            .toList();

        setState(() {
          _subscriptionOffers = offers;
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = 'No subscription offers available';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load subscription options: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _purchaseSubscription(SubscriptionOffer offer) async {
    setState(() {
      _isPurchasing = true;
      _errorMessage = null;
    });

    try {
      await RevenueCatService.purchaseProduct(offer.package);

      // Purchase successful
      if (mounted) {
        Navigator.of(context).pop();
        widget.onPurchaseSuccess?.call();

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🎉 Welcome to FirstTaps3D Premium!'),
            backgroundColor: Color(0xFF228B22),
            duration: Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      // User-friendly error messages
      String friendlyMessage;
      if (e.toString().contains('cancelled') ||
          e.toString().contains('canceled')) {
        friendlyMessage = 'Purchase cancelled';
      } else if (e.toString().contains('network') ||
          e.toString().contains('internet')) {
        friendlyMessage =
            'Network error. Please check your connection and try again.';
      } else if (e.toString().contains('payment')) {
        friendlyMessage =
            'Payment method issue. Please check your payment details.';
      } else {
        friendlyMessage =
            'Purchase failed. Please try again or contact support.';
      }

      setState(() {
        _errorMessage = friendlyMessage;
        _isPurchasing = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ $friendlyMessage'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  Future<void> _restorePurchases() async {
    setState(() {
      _isPurchasing = true;
      _errorMessage = null;
    });

    try {
      final customerInfo = await RevenueCatService.restorePurchases();

      if (customerInfo.entitlements.active.isNotEmpty) {
        if (mounted) {
          Navigator.of(context).pop();
          widget.onPurchaseSuccess?.call();

          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✅ Purchases restored successfully!'),
              backgroundColor: Color(0xFF228B22),
              duration: Duration(seconds: 3),
            ),
          );
        }
      } else {
        setState(() {
          _errorMessage = 'No previous purchases found';
          _isPurchasing = false;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('ℹ️ No previous purchases found on this account'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (e) {
      String friendlyMessage;
      if (e.toString().contains('network') ||
          e.toString().contains('internet')) {
        friendlyMessage =
            'Network error. Please check your connection and try again.';
      } else {
        friendlyMessage =
            'Failed to restore purchases. Please try again or contact support.';
      }

      setState(() {
        _errorMessage = friendlyMessage;
        _isPurchasing = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ $friendlyMessage'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        constraints: const BoxConstraints(maxHeight: 700, maxWidth: 500),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [_buildHeader(), _buildContent(), _buildFooter()],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF228B22), Color(0xFF32CD32)],
        ),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.star, color: Colors.white, size: 32),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'FirstTaps3D Premium',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Text(
                  widget.featureRequest?.featureName ??
                      'Unlock all premium features',
                  style: const TextStyle(fontSize: 14, color: Colors.white70),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white),
            onPressed: () {
              Navigator.of(context).pop();
              widget.onCancel?.call();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildFeaturesList(),
            const SizedBox(height: 24),
            if (_isLoading) _buildLoadingState(),
            if (!_isLoading && _subscriptionOffers.isNotEmpty)
              _buildSubscriptionOffers(),
            if (_errorMessage != null) _buildErrorState(),
          ],
        ),
      ),
    );
  }

  Widget _buildFeaturesList() {
    final worldsFeature = PremiumFeature.worlds(isUnlocked: false);
    final gamingFeature = PremiumFeature.gaming(isUnlocked: false);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Unlock Premium Features:',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        _buildFeatureCard(worldsFeature, Icons.panorama),
        const SizedBox(height: 12),
        _buildFeatureCard(gamingFeature, Icons.sports_esports),
      ],
    );
  }

  Widget _buildFeatureCard(PremiumFeature feature, IconData icon) {
    final isRequested = widget.featureRequest?.featureId == feature.id;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isRequested ? const Color(0xFFF0FFF0) : Colors.grey[50],
        border: Border.all(
          color: isRequested ? const Color(0xFF228B22) : Colors.grey[300]!,
          width: isRequested ? 2 : 1,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: const Color(0xFF228B22), size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  feature.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ),
              if (isRequested)
                const Icon(
                  Icons.arrow_forward,
                  color: Color(0xFF228B22),
                  size: 20,
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            feature.description,
            style: const TextStyle(fontSize: 14, color: Colors.black54),
          ),
          const SizedBox(height: 8),
          ...feature.items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(left: 16, top: 4),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_circle,
                    color: Color(0xFF228B22),
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      item,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        children: [
          CircularProgressIndicator(color: Color(0xFF228B22)),
          SizedBox(height: 16),
          Text('Loading subscription options...'),
        ],
      ),
    );
  }

  Widget _buildSubscriptionOffers() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Choose Your Plan:',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        ..._subscriptionOffers.map((offer) => _buildSubscriptionCard(offer)),
      ],
    );
  }

  Widget _buildSubscriptionCard(SubscriptionOffer offer) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Material(
        borderRadius: BorderRadius.circular(12),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: _isPurchasing ? null : () => _purchaseSubscription(offer),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(
                color: offer.isPopular
                    ? const Color(0xFF228B22)
                    : Colors.grey[300]!,
                width: offer.isPopular ? 2 : 1,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            offer.period,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          if (offer.isPopular) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFF228B22),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                'POPULAR',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        offer.price,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF228B22),
                        ),
                      ),
                    ],
                  ),
                ),
                if (_isPurchasing)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Color(0xFF228B22),
                    ),
                  )
                else
                  const Icon(
                    Icons.arrow_forward_ios,
                    color: Color(0xFF228B22),
                    size: 16,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red[50],
        border: Border.all(color: Colors.red[300]!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.error, color: Colors.red),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _errorMessage!,
              style: const TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: _isPurchasing ? null : _restorePurchases,
              child: const Text(
                'Restore Previous Purchases',
                style: TextStyle(color: Color(0xFF228B22), fontSize: 14),
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Cancel anytime. Auto-renewal can be turned off in Account Settings.',
            style: TextStyle(fontSize: 12, color: Colors.grey),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
