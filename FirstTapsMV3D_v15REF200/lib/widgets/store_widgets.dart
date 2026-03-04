import 'package:flutter/material.dart';
import 'dart:developer' as developer;

import '../models/premium_product_models.dart';

/// Reusable Purchase Button Widget
/// Shows different states: available, purchasing, owned
class PurchaseButton extends StatelessWidget {
  final PremiumProduct product;
  final bool isPurchased;
  final bool isLoading;
  final VoidCallback? onPressed;
  final PurchaseButtonStyle style;

  const PurchaseButton({
    super.key,
    required this.product,
    required this.isPurchased,
    this.isLoading = false,
    this.onPressed,
    this.style = PurchaseButtonStyle.primary,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: _buildButton(),
    );
  }

  Widget _buildButton() {
    if (isLoading) {
      return _buildLoadingButton();
    }

    if (isPurchased) {
      return _buildOwnedButton();
    }

    return _buildAvailableButton();
  }

  Widget _buildLoadingButton() {
    return ElevatedButton(
      onPressed: null,
      style: _getButtonStyle().copyWith(
        backgroundColor: MaterialStateProperty.all(Colors.grey.shade600),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ),
          const SizedBox(width: 8),
          Text(_getLoadingText()),
        ],
      ),
    );
  }

  Widget _buildOwnedButton() {
    return ElevatedButton(
      onPressed: null,
      style: _getButtonStyle().copyWith(
        backgroundColor: MaterialStateProperty.all(Colors.grey.shade600),
        foregroundColor: MaterialStateProperty.all(Colors.white),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle, size: 16),
          const SizedBox(width: 8),
          Text(_getOwnedText()),
        ],
      ),
    );
  }

  Widget _buildAvailableButton() {
    return ElevatedButton(
      onPressed: onPressed,
      style: _getButtonStyle(),
      child: Text(_getPurchaseText()),
    );
  }

  ButtonStyle _getButtonStyle() {
    switch (style) {
      case PurchaseButtonStyle.primary:
        return ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF4CAF50),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        );
      case PurchaseButtonStyle.compact:
        return ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF4CAF50),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        );
      case PurchaseButtonStyle.minimal:
        return ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF4CAF50),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
        );
    }
  }

  String _getPurchaseText() {
    switch (style) {
      case PurchaseButtonStyle.primary:
        if (product is SubscriptionProduct) {
          return 'SUBSCRIBE';
        } else if (product is BundleProduct) {
          return 'BUY BUNDLE';
        } else {
          return 'PURCHASE';
        }
      case PurchaseButtonStyle.compact:
        return 'BUY';
      case PurchaseButtonStyle.minimal:
        return 'GET';
    }
  }

  String _getLoadingText() {
    switch (style) {
      case PurchaseButtonStyle.primary:
        return 'Processing...';
      case PurchaseButtonStyle.compact:
      case PurchaseButtonStyle.minimal:
        return 'Wait...';
    }
  }

  String _getOwnedText() {
    switch (style) {
      case PurchaseButtonStyle.primary:
        if (product is SubscriptionProduct) {
          return 'ACTIVE';
        } else {
          return 'OWNED';
        }
      case PurchaseButtonStyle.compact:
      case PurchaseButtonStyle.minimal:
        return 'OWNED';
    }
  }
}

enum PurchaseButtonStyle { primary, compact, minimal }

/// Premium Product Card Widget
/// Displays product information with consistent styling
class ProductCard extends StatelessWidget {
  final PremiumProduct product;
  final bool isPurchased;
  final bool isLoading;
  final VoidCallback? onPurchase;
  final ProductCardStyle style;

  const ProductCard({
    super.key,
    required this.product,
    required this.isPurchased,
    this.isLoading = false,
    this.onPurchase,
    this.style = ProductCardStyle.standard,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF3F3F3F),
        borderRadius: BorderRadius.circular(12),
        border: isPurchased
            ? Border.all(color: const Color(0xFF4CAF50), width: 2)
            : null,
      ),
      child: _buildCardContent(),
    );
  }

  Widget _buildCardContent() {
    switch (style) {
      case ProductCardStyle.standard:
        return _buildStandardCard();
      case ProductCardStyle.compact:
        return _buildCompactCard();
      case ProductCardStyle.detailed:
        return _buildDetailedCard();
    }
  }

  Widget _buildStandardCard() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _buildProductIcon(),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.displayName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      product.description,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          if (product is BundleProduct) ...[
            _buildBundleSavings(product as BundleProduct),
            const SizedBox(height: 12),
          ],

          Row(
            children: [
              Expanded(child: _buildPriceDisplay()),
              PurchaseButton(
                product: product,
                isPurchased: isPurchased,
                isLoading: isLoading,
                onPressed: onPurchase,
                style: PurchaseButtonStyle.compact,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCompactCard() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          _buildProductIcon(),
          const SizedBox(width: 12),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.displayName,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Text(
                  '\$${product.price.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF4CAF50),
                  ),
                ),
              ],
            ),
          ),

          PurchaseButton(
            product: product,
            isPurchased: isPurchased,
            isLoading: isLoading,
            onPressed: onPurchase,
            style: PurchaseButtonStyle.minimal,
          ),
        ],
      ),
    );
  }

  Widget _buildDetailedCard() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _buildProductIcon(),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.displayName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      product.description,
                      style: const TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          if (product is BundleProduct) ...[
            _buildBundleContents(product as BundleProduct),
            const SizedBox(height: 16),
            _buildBundleSavings(product as BundleProduct),
            const SizedBox(height: 20),
          ],

          Row(
            children: [
              Expanded(child: _buildPriceDisplay()),
              PurchaseButton(
                product: product,
                isPurchased: isPurchased,
                isLoading: isLoading,
                onPressed: onPurchase,
                style: PurchaseButtonStyle.primary,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProductIcon() {
    IconData iconData;
    Color iconColor;

    if (product is SubscriptionProduct) {
      iconData = Icons.diamond;
      iconColor = Colors.amber;
    } else if (product is WorldUnlockProduct) {
      iconData = _getWorldIcon((product as WorldUnlockProduct).worldType);
      iconColor = Colors.blue;
    } else if (product is LevelUnlockProduct) {
      iconData = Icons.videogame_asset;
      iconColor = Colors.purple;
    } else if (product is AvatarUnlockProduct) {
      iconData = Icons.person;
      iconColor = Colors.orange;
    } else if (product is BundleProduct) {
      iconData = Icons.inventory;
      iconColor = Colors.pink;
    } else {
      iconData = Icons.star;
      iconColor = Colors.grey;
    }

    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: iconColor.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(iconData, color: iconColor, size: 24),
    );
  }

  Widget _buildPriceDisplay() {
    if (product is SubscriptionProduct) {
      final subscription = product as SubscriptionProduct;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '\$${subscription.price.toStringAsFixed(2)}',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          Text(
            '/${subscription.billingPeriod}',
            style: const TextStyle(fontSize: 14, color: Colors.grey),
          ),
        ],
      );
    } else {
      return Text(
        '\$${product.price.toStringAsFixed(2)}',
        style: const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: Color(0xFF4CAF50),
        ),
      );
    }
  }

  Widget _buildBundleSavings(BundleProduct bundle) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.orange,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        'Save \$${bundle.savings.toStringAsFixed(2)}',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildBundleContents(BundleProduct bundle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Includes:',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 8),
        ...bundle.includedItems.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              children: [
                const Icon(
                  Icons.check_circle,
                  color: Color(0xFF4CAF50),
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(
                  item,
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ],
    );
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

enum ProductCardStyle { standard, compact, detailed }

/// Status Indicator Widget
/// Shows the status of premium features
class StatusIndicator extends StatelessWidget {
  final String label;
  final StatusType status;
  final IconData? customIcon;
  final Color? customColor;

  const StatusIndicator({
    super.key,
    required this.label,
    required this.status,
    this.customIcon,
    this.customColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _getStatusColor().withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _getStatusColor(), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_getStatusIcon(), color: _getStatusColor(), size: 14),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: _getStatusColor(),
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor() {
    if (customColor != null) return customColor!;

    switch (status) {
      case StatusType.active:
        return const Color(0xFF4CAF50);
      case StatusType.inactive:
        return Colors.grey;
      case StatusType.pending:
        return Colors.orange;
      case StatusType.error:
        return Colors.red;
      case StatusType.premium:
        return Colors.amber;
    }
  }

  IconData _getStatusIcon() {
    if (customIcon != null) return customIcon!;

    switch (status) {
      case StatusType.active:
        return Icons.check_circle;
      case StatusType.inactive:
        return Icons.circle_outlined;
      case StatusType.pending:
        return Icons.access_time;
      case StatusType.error:
        return Icons.error;
      case StatusType.premium:
        return Icons.star;
    }
  }
}

enum StatusType { active, inactive, pending, error, premium }

/// Purchase Confirmation Dialog
/// Shows confirmation and success messages
class PurchaseConfirmationDialog extends StatelessWidget {
  final PremiumProduct product;
  final VoidCallback onConfirm;
  final VoidCallback onCancel;

  const PurchaseConfirmationDialog({
    super.key,
    required this.product,
    required this.onConfirm,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF2D2D2D),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(Icons.shopping_cart, color: const Color(0xFF4CAF50), size: 24),
          const SizedBox(width: 8),
          const Text('Confirm Purchase', style: TextStyle(color: Colors.white)),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'You are about to purchase:',
            style: TextStyle(color: Colors.grey.shade300),
          ),
          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF3F3F3F),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  _getProductIcon(),
                  color: const Color(0xFF4CAF50),
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.displayName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        product.description,
                        style: TextStyle(
                          color: Colors.grey.shade400,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '\$${product.price.toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: Color(0xFF4CAF50),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          if (product is BundleProduct) ...[
            const Text(
              'Bundle includes:',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            ...(product as BundleProduct).includedItems.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle,
                      color: Color(0xFF4CAF50),
                      size: 14,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      item,
                      style: TextStyle(
                        color: Colors.grey.shade300,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: onCancel,
          child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
        ),
        ElevatedButton(
          onPressed: onConfirm,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF4CAF50),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: const Text('Confirm Purchase'),
        ),
      ],
    );
  }

  IconData _getProductIcon() {
    if (product is SubscriptionProduct) {
      return Icons.diamond;
    } else if (product is WorldUnlockProduct) {
      return Icons.public;
    } else if (product is LevelUnlockProduct) {
      return Icons.videogame_asset;
    } else if (product is AvatarUnlockProduct) {
      return Icons.person;
    } else if (product is BundleProduct) {
      return Icons.inventory;
    } else {
      return Icons.star;
    }
  }

  static Future<bool?> show(BuildContext context, PremiumProduct product) {
    return showDialog<bool>(
      context: context,
      builder: (context) => PurchaseConfirmationDialog(
        product: product,
        onConfirm: () => Navigator.of(context).pop(true),
        onCancel: () => Navigator.of(context).pop(false),
      ),
    );
  }
}

/// Loading State Widget
/// Shows various loading states for the store
class LoadingStateWidget extends StatelessWidget {
  final String message;
  final LoadingType type;

  const LoadingStateWidget({
    super.key,
    required this.message,
    this.type = LoadingType.circular,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildLoadingIndicator(),
          const SizedBox(height: 16),
          Text(
            message,
            style: const TextStyle(color: Colors.white, fontSize: 16),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingIndicator() {
    switch (type) {
      case LoadingType.circular:
        return const CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF4CAF50)),
        );
      case LoadingType.linear:
        return Container(
          width: 200,
          child: const LinearProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF4CAF50)),
            backgroundColor: Color(0xFF3F3F3F),
          ),
        );
      case LoadingType.dots:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(
            3,
            (index) => Container(
              width: 8,
              height: 8,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: const BoxDecoration(
                color: Color(0xFF4CAF50),
                shape: BoxShape.circle,
              ),
            ),
          ),
        );
    }
  }
}

enum LoadingType { circular, linear, dots }
