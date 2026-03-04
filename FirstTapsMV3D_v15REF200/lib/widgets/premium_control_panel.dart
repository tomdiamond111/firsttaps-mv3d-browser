import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/premium_service.dart';
import '../screens/premium_store_screen.dart';

/// Premium Features Control Panel
/// Development UI for testing premium features before RevenueCat integration
class PremiumControlPanel extends StatefulWidget {
  const PremiumControlPanel({super.key});

  @override
  State<PremiumControlPanel> createState() => _PremiumControlPanelState();
}

class _PremiumControlPanelState extends State<PremiumControlPanel> {
  String? selectedHelperType;
  String? selectedHelperBreed;

  @override
  Widget build(BuildContext context) {
    return Consumer<PremiumService>(
      builder: (context, premiumService, child) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.8),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.purple.withOpacity(0.5)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  const Icon(Icons.star, color: Colors.amber),
                  const SizedBox(width: 8),
                  const Text(
                    'Premium Features',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    premiumService.isPremiumSubscriber ? 'PREMIUM' : 'FREE',
                    style: TextStyle(
                      color: premiumService.isPremiumSubscriber
                          ? Colors.amber
                          : Colors.grey,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Premium Subscription Toggle (for testing)
              _buildSubscriptionToggle(premiumService),
              const SizedBox(height: 16),

              // Premium Store Access
              _buildStoreAccessButton(context),
              const SizedBox(height: 16),

              // World Themes Section
              _buildWorldThemesSection(premiumService),
              const SizedBox(height: 16),

              // Avatar Style Packs Section
              _buildAvatarPacksSection(premiumService),
              const SizedBox(height: 16),

              // Gaming Helpers Section
              _buildGamingHelpersSection(premiumService),
              const SizedBox(height: 16),

              // Gaming Levels Section
              _buildGamingLevelsSection(premiumService),
              const SizedBox(height: 16),

              // Testing Controls
              _buildTestingControls(premiumService),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSubscriptionToggle(PremiumService premiumService) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.purple.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.diamond, color: Colors.purple, size: 20),
          const SizedBox(width: 8),
          const Text(
            'Premium Subscription',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          const Spacer(),
          Switch(
            value: premiumService.isPremiumSubscriber,
            onChanged: (value) {
              premiumService.setPremiumSubscription(value);
            },
            activeColor: Colors.amber,
          ),
        ],
      ),
    );
  }

  Widget _buildStoreAccessButton(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF4CAF50), Color(0xFF45a049)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.store, color: Colors.white, size: 20),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Premium Store',
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => _navigateToStore(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFF4CAF50),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(6),
              ),
            ),
            child: const Text(
              'SHOP NOW',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  void _navigateToStore(BuildContext context) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (context) => const PremiumStoreScreen()));
  }

  Widget _buildWorldThemesSection(PremiumService premiumService) {
    return _buildSection(
      title: 'World Themes',
      icon: Icons.landscape,
      items: premiumService.availableWorldThemes
          .where((theme) => theme.isPremium)
          .map(
            (theme) => _buildFeatureItem(
              name: theme.name,
              description: theme.description,
              isUnlocked: theme.isUnlocked,
              onToggle: () => _toggleFeature(premiumService, theme.id),
            ),
          )
          .toList(),
    );
  }

  Widget _buildAvatarPacksSection(PremiumService premiumService) {
    return _buildSection(
      title: 'Avatar Style Packs',
      icon: Icons.person,
      items: premiumService.availableStylePacks
          .where((pack) => pack.isPremium)
          .map(
            (pack) => _buildFeatureItem(
              name: pack.name,
              description: pack.description,
              isUnlocked: pack.isUnlocked,
              onToggle: () => _toggleFeature(premiumService, pack.id),
            ),
          )
          .toList(),
    );
  }

  Widget _buildGamingHelpersSection(PremiumService premiumService) {
    return _buildSection(
      title: 'Gaming Helpers',
      icon: Icons.pets,
      items: [
        ...premiumService.availableHelpers
            .where((helper) => helper.isPremium)
            .map((helper) => _buildHelperItem(premiumService, helper))
            .toList(),

        // Helper spawning controls
        if (premiumService.availableHelpers.any((h) => h.isUnlocked))
          _buildHelperSpawner(premiumService),
      ],
    );
  }

  Widget _buildHelperItem(PremiumService premiumService, GamingHelper helper) {
    return Column(
      children: [
        _buildFeatureItem(
          name: helper.name,
          description: helper.description,
          isUnlocked: helper.isUnlocked,
          onToggle: () => _toggleFeature(premiumService, helper.id),
        ),

        // Breed selection if unlocked
        if (helper.isUnlocked && helper.breeds != null)
          Padding(
            padding: const EdgeInsets.only(left: 24, top: 8),
            child: _buildBreedSelector(helper),
          ),
      ],
    );
  }

  Widget _buildBreedSelector(GamingHelper helper) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Available Breeds:',
            style: TextStyle(
              color: Colors.green.shade300,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            children: helper.breeds!
                .map(
                  (breed) => Chip(
                    label: Text(
                      breed.replaceAll('_', ' ').toUpperCase(),
                      style: const TextStyle(fontSize: 10),
                    ),
                    backgroundColor: Colors.green.withOpacity(0.3),
                    onDeleted: () => _spawnHelper(helper.id, breed),
                    deleteIcon: const Icon(Icons.play_arrow, size: 16),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildHelperSpawner(PremiumService premiumService) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.blue.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Active Helpers:',
            style: TextStyle(
              color: Colors.blue,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              ElevatedButton.icon(
                onPressed: () => _clearAllHelpers(),
                icon: const Icon(Icons.clear_all, size: 16),
                label: const Text('Clear All', style: TextStyle(fontSize: 10)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.withOpacity(0.7),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: () => _testHelper(),
                icon: const Icon(Icons.bug_report, size: 16),
                label: const Text('Test Hunt', style: TextStyle(fontSize: 10)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green.withOpacity(0.7),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGamingLevelsSection(PremiumService premiumService) {
    return _buildSection(
      title: 'Gaming Levels',
      icon: Icons.videogame_asset,
      items: premiumService.availableLevels
          .where((level) => level.isPremium)
          .map(
            (level) => _buildFeatureItem(
              name: level.name,
              description: level.description,
              isUnlocked: level.isUnlocked,
              onToggle: () => _toggleFeature(premiumService, level.id),
              extra: level.isUnlocked
                  ? Text(
                      'Entities: ${level.entityTypes.join(', ')}',
                      style: TextStyle(
                        color: Colors.green.shade300,
                        fontSize: 10,
                      ),
                    )
                  : null,
            ),
          )
          .toList(),
    );
  }

  Widget _buildTestingControls(PremiumService premiumService) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.orange.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.build, color: Colors.orange, size: 16),
              SizedBox(width: 8),
              Text(
                'Testing Controls',
                style: TextStyle(
                  color: Colors.orange,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              ElevatedButton(
                onPressed: () => premiumService.unlockAllFeaturesForTesting(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                ),
                child: const Text('Unlock All', style: TextStyle(fontSize: 11)),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => premiumService.lockAllFeaturesForTesting(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                ),
                child: const Text('Lock All', style: TextStyle(fontSize: 11)),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => premiumService.resetAllFeatures(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.grey,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                ),
                child: const Text('Reset', style: TextStyle(fontSize: 11)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required IconData icon,
    required List<Widget> items,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.white70, size: 16),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white70,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...items,
        ],
      ),
    );
  }

  Widget _buildFeatureItem({
    required String name,
    required String description,
    required bool isUnlocked,
    required VoidCallback onToggle,
    Widget? extra,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 2),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isUnlocked
            ? Colors.green.withOpacity(0.2)
            : Colors.grey.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: isUnlocked
              ? Colors.green.withOpacity(0.5)
              : Colors.grey.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isUnlocked ? Icons.lock_open : Icons.lock,
            color: isUnlocked ? Colors.green : Colors.grey,
            size: 16,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: isUnlocked ? Colors.green : Colors.grey,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
                Text(
                  description,
                  style: TextStyle(
                    color: isUnlocked
                        ? Colors.green.shade300
                        : Colors.grey.shade400,
                    fontSize: 10,
                  ),
                ),
                if (extra != null) extra,
              ],
            ),
          ),
          Switch(
            value: isUnlocked,
            onChanged: (_) => onToggle(),
            activeColor: Colors.green,
          ),
        ],
      ),
    );
  }

  void _toggleFeature(PremiumService premiumService, String featureId) {
    // Convert display ID to internal key format
    String featureKey = '';

    switch (featureId) {
      case 'dazzle':
        featureKey = 'world_theme_dazzle';
        break;
      case 'forest':
        featureKey = 'world_theme_forest';
        break;
      case 'cave':
        featureKey = 'world_theme_cave';
        break;
      case 'christmas':
        featureKey = 'world_theme_christmas';
        break;
      case 'tropical-paradise':
        featureKey = 'world_theme_tropical_paradise';
        break;
      case 'flower-wonderland':
        featureKey = 'world_theme_flower_wonderland';
        break;
      case 'gamer':
        featureKey = 'avatar_gamer_pack';
        break;
      case 'professional':
        featureKey = 'avatar_professional_pack';
        break;
      case 'elegance':
        featureKey = 'avatar_elegance_pack';
        break;
      case 'pet_dog':
        featureKey = 'helper_pet_dog';
        break;
      case 'pet_cat':
        featureKey = 'helper_pet_cat';
        break;
      case 'level_4':
        featureKey = 'gaming_level_4';
        break;
      case 'level_5':
        featureKey = 'gaming_level_5';
        break;
    }

    if (featureKey.isNotEmpty) {
      if (premiumService.isFeatureUnlocked(featureKey)) {
        premiumService.lockFeature(featureKey);
      } else {
        premiumService.unlockFeature(featureKey);
      }
    }
  }

  void _spawnHelper(String helperType, String breed) {
    // Send message to JavaScript to spawn helper
    _sendToJavaScript({
      'action': 'spawnHelper',
      'helperType': helperType,
      'breed': breed,
    });
  }

  void _clearAllHelpers() {
    _sendToJavaScript({'action': 'clearHelpers'});
  }

  void _testHelper() {
    _sendToJavaScript({'action': 'testHelper'});
  }

  void _sendToJavaScript(Map<String, dynamic> message) {
    // TODO: Implement WebView communication to JavaScript
    print('📱 Sending to JavaScript: $message');
  }
}
