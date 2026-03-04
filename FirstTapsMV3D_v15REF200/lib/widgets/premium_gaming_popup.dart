import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/premium_service.dart';
import '../screens/premium_store_screen.dart';

/// Premium Gaming Levels Unlock Popup
/// Shows when user reaches Level 3, offering access to premium gaming levels
class PremiumGamingPopup extends StatefulWidget {
  final VoidCallback? onUnlocked;
  final VoidCallback? onDismissed;
  final VoidCallback?
  onJavaScriptRefresh; // Add callback for JavaScript execution
  final bool showTestingToggle;

  const PremiumGamingPopup({
    Key? key,
    this.onUnlocked,
    this.onDismissed,
    this.onJavaScriptRefresh, // Add the callback parameter
    this.showTestingToggle = false,
  }) : super(key: key);

  @override
  State<PremiumGamingPopup> createState() => _PremiumGamingPopupState();
}

class _PremiumGamingPopupState extends State<PremiumGamingPopup>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  bool _isTestModeEnabled = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();

    _animationController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.elasticOut),
    );

    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );

    _animationController.forward();

    // Check current premium status
    _checkPremiumStatus();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _checkPremiumStatus() async {
    final premiumService = PremiumService.instance;
    setState(() {
      _isTestModeEnabled =
          premiumService.isLevel4Unlocked && premiumService.isLevel5Unlocked;
    });
  }

  /// Notifies JavaScript to refresh gaming level progression after premium unlock
  void _notifyJavaScriptLevelRefresh() {
    debugPrint(
      '📡 PremiumGamingPopup: Notifying JavaScript to refresh gaming levels',
    );

    // Use the callback if provided
    if (widget.onJavaScriptRefresh != null) {
      widget.onJavaScriptRefresh!();
    }
  }

  Future<void> _handleUnlockToggle(bool value) async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final premiumService = PremiumService.instance;

      if (value) {
        // Enable premium gaming levels
        if (widget.showTestingToggle) {
          // Testing mode - unlock directly
          await premiumService.enablePremiumGamingLevelsForTesting();
          HapticFeedback.lightImpact();

          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🎮 Premium Gaming Levels Unlocked for Testing!'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );

          // Notify JavaScript to refresh gaming levels after unlock
          _notifyJavaScriptLevelRefresh();
        } else {
          // Production mode - initiate purchase/subscription flow
          await _initiatePremiumPurchase();
        }
      } else {
        // Disable premium gaming levels (for testing)
        await premiumService.disablePremiumGamingLevelsForTesting();

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🔒 Premium Gaming Levels Locked'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 2),
          ),
        );

        // Notify JavaScript to refresh gaming levels after disable
        _notifyJavaScriptLevelRefresh();
      }

      setState(() {
        _isTestModeEnabled = value;
      });

      if (value && widget.onUnlocked != null) {
        widget.onUnlocked!();
      }
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Error: $error'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 3),
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _initiatePremiumPurchase() async {
    // TODO: Integrate with your actual subscription/purchase system
    // This is where you'd show subscription plans, in-app purchases, etc.

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('🚀 Unlock Premium Gaming'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Get access to premium gaming levels:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 12),
            Text('🐛 Level 4: Insect Safari'),
            Text('   • Hunt spiders, mantis, flies, butterflies'),
            Text('   • 300-800 points per catch'),
            SizedBox(height: 8),
            Text('✨ Level 5: Glowing Objects'),
            Text('   • Capture luminous orbs and effects'),
            Text('   • 500-1200 points per catch'),
            SizedBox(height: 16),
            Text(
              'Premium subscription includes all gaming levels plus world themes, helpers, and more!',
              style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Maybe Later'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _visitPremiumStore();
            },
            child: const Text(
              'Visit Store',
              style: TextStyle(color: Colors.blue),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              // TODO: Launch subscription flow
              _launchSubscriptionFlow();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple,
              foregroundColor: Colors.white,
            ),
            child: const Text('Subscribe Now'),
          ),
        ],
      ),
    );
  }

  Future<void> _launchSubscriptionFlow() async {
    // Placeholder for actual subscription implementation
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('🚧 Subscription flow coming soon!'),
        backgroundColor: Colors.blue,
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _visitPremiumStore() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (context) => const PremiumStoreScreen()));
  }

  void _dismiss() {
    _animationController.reverse().then((_) {
      if (widget.onDismissed != null) {
        widget.onDismissed!();
      }
      if (mounted) {
        Navigator.of(context).pop();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animationController,
      builder: (context, child) {
        return Opacity(
          opacity: _opacityAnimation.value,
          child: Transform.scale(
            scale: _scaleAnimation.value,
            child: Dialog(
              backgroundColor: Colors.transparent,
              child: Container(
                width: MediaQuery.of(context).size.width * 0.9,
                constraints: const BoxConstraints(maxWidth: 400),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF2D1B69),
                      Color(0xFF11998E),
                      Color(0xFF38EF7D),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header
                    Container(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                '🎮 Level 3 Complete!',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              IconButton(
                                onPressed: _dismiss,
                                icon: const Icon(
                                  Icons.close,
                                  color: Colors.white70,
                                ),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Continue to Premium Gaming Levels?',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Content - Make this scrollable to prevent overflow
                    Flexible(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 20),
                        constraints: const BoxConstraints(
                          maxHeight: 400, // Limit height to prevent overflow
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.95),
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Level 4 Preview
                              _buildLevelPreview(
                                '🐛 Level 4: Insect Safari',
                                'Hunt insects through the file zone',
                                [
                                  'Spider',
                                  'Mantis',
                                  'Housefly',
                                  'Butterfly',
                                  'Ladybug',
                                ],
                                '300-800 pts',
                              ),

                              const SizedBox(height: 12),

                              // Level 5 Preview
                              _buildLevelPreview(
                                '✨ Level 5: Glowing Objects',
                                'Capture luminous entities with spectacular effects',
                                [
                                  'Pulsing Orb',
                                  'Spinning Disc',
                                  'Red Siren',
                                  'Dancing Orbs',
                                  'Flashing Cube',
                                ],
                                '500-1200 pts',
                              ),

                              const SizedBox(height: 16),

                              // Unlock Toggle Section
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: widget.showTestingToggle
                                      ? Colors.orange.withOpacity(0.1)
                                      : Colors.purple.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: widget.showTestingToggle
                                        ? Colors.orange
                                        : Colors.purple,
                                    width: 1,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    if (widget.showTestingToggle) ...[
                                      // Testing Mode
                                      Row(
                                        children: [
                                          const Icon(
                                            Icons.developer_mode,
                                            color: Colors.orange,
                                            size: 18,
                                          ),
                                          const SizedBox(width: 8),
                                          const Expanded(
                                            child: Text(
                                              'Testing Mode - Toggle Premium Access',
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: Colors.orange,
                                                fontSize: 13,
                                              ),
                                            ),
                                          ),
                                          if (_isLoading)
                                            const SizedBox(
                                              width: 20,
                                              height: 20,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: Colors.orange,
                                              ),
                                            )
                                          else
                                            Switch(
                                              value: _isTestModeEnabled,
                                              onChanged: _handleUnlockToggle,
                                              activeColor: Colors.green,
                                            ),
                                        ],
                                      ),

                                      // Show Continue button when toggle is enabled
                                      if (_isTestModeEnabled) ...[
                                        const SizedBox(height: 12),
                                        SizedBox(
                                          width: double.infinity,
                                          child: ElevatedButton(
                                            onPressed: _isLoading
                                                ? null
                                                : () {
                                                    // Notify JavaScript to refresh gaming levels
                                                    _notifyJavaScriptLevelRefresh();

                                                    // Close popup and continue with premium levels
                                                    if (widget.onUnlocked !=
                                                        null) {
                                                      widget.onUnlocked!();
                                                    }
                                                    _dismiss();
                                                  },
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.green,
                                              foregroundColor: Colors.white,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    vertical: 12,
                                                  ),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(10),
                                              ),
                                              elevation: 2,
                                            ),
                                            child: const Text(
                                              '🚀 Continue with Premium Levels',
                                              style: TextStyle(
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ] else ...[
                                      // Production Mode
                                      const Row(
                                        children: [
                                          Icon(
                                            Icons.star,
                                            color: Colors.purple,
                                            size: 18,
                                          ),
                                          SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              'Unlock Premium Gaming Levels',
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: Colors.purple,
                                                fontSize: 13,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      SizedBox(
                                        width: double.infinity,
                                        child: ElevatedButton(
                                          onPressed: _isLoading
                                              ? null
                                              : () => _handleUnlockToggle(true),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.green,
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(
                                              vertical: 12,
                                            ),
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                            ),
                                            elevation: 2,
                                          ),
                                          child: _isLoading
                                              ? const SizedBox(
                                                  width: 20,
                                                  height: 20,
                                                  child:
                                                      CircularProgressIndicator(
                                                        strokeWidth: 2,
                                                        color: Colors.white,
                                                      ),
                                                )
                                              : const Text(
                                                  '🚀 Unlock Premium Levels',
                                                  style: TextStyle(
                                                    fontSize: 15,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // Footer
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                      child: TextButton(
                        onPressed: _dismiss,
                        child: const Text(
                          'Go back to current levels',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildLevelPreview(
    String title,
    String description,
    List<String> entities,
    String points,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          description,
          style: const TextStyle(fontSize: 11, color: Colors.black54),
        ),
        const SizedBox(height: 6),
        // Show first 3 entities in a more compact way
        Row(
          children: [
            Expanded(
              child: Wrap(
                spacing: 4,
                runSpacing: 2,
                children: entities.take(3).map((entity) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue.withOpacity(0.3)),
                    ),
                    child: Text(
                      entity,
                      style: const TextStyle(
                        fontSize: 9,
                        color: Colors.blue,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            if (entities.length > 3)
              Text(
                '+${entities.length - 3} more',
                style: const TextStyle(
                  fontSize: 9,
                  color: Colors.black54,
                  fontStyle: FontStyle.italic,
                ),
              ),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          'Points: $points',
          style: const TextStyle(
            fontSize: 10,
            color: Colors.green,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}

/// Helper function to show the premium gaming popup
Future<void> showPremiumGamingPopup(
  BuildContext context, {
  VoidCallback? onUnlocked,
  VoidCallback? onDismissed,
  bool showTestingToggle = false,
  VoidCallback? onJavaScriptRefresh,
}) {
  return showDialog(
    context: context,
    barrierDismissible: false,
    builder: (context) => PremiumGamingPopup(
      onUnlocked: onUnlocked,
      onDismissed: onDismissed,
      showTestingToggle: showTestingToggle,
      onJavaScriptRefresh: onJavaScriptRefresh,
    ),
  );
}
