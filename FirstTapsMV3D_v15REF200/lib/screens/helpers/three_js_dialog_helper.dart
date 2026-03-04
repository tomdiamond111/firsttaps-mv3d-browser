import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/premium_service.dart';
import '../widgets/cancel_button_widget.dart';
import '../widgets/white_divider_widget.dart';
import '../constants/app_text_styles.dart';

/// Delegate interface for dialog operations
abstract class DialogHelperDelegate {
  BuildContext get context;
  bool get mounted;
  void deleteAllObjects();
  void deleteAllObjectsAndFiles();
  void restoreFromBackup();
  void setState(VoidCallback fn);
}

/// Helper class for advanced delete and premium dialogs
/// This restores the missing dialog functionality from the refactoring
class ThreeJsDialogHelper {
  final DialogHelperDelegate delegate;

  ThreeJsDialogHelper(this.delegate);

  /// Show advanced delete options dialog
  /// This method was lost in the refactoring and provides better delete options
  void showDeleteOptionsDialog() {
    showDialog(
      context: delegate.context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: Colors.grey[900],
          title: const Row(
            children: [
              Icon(Icons.warning, color: Colors.orange),
              SizedBox(width: 8),
              Text('Delete Options', style: AppTextStyles.whiteText),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.delete, color: Colors.white),
                title: const Text(
                  'Delete Objects Only',
                  style: AppTextStyles.whiteText,
                ),
                subtitle: const Text(
                  'Remove objects from 3D world (files remain)',
                  style: AppTextStyles.white70Text,
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  showDeleteObjectsConfirmation();
                },
              ),
            ],
          ),
          actions: const [CancelButtonWidget(useWhiteText: true)],
        );
      },
    );
  }

  /// Show delete objects only confirmation dialog
  void showDeleteObjectsConfirmation() {
    showDialog(
      context: delegate.context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: Colors.grey[900],
          title: const Text(
            'Confirm Deletion',
            style: TextStyle(color: Colors.white),
          ),
          content: const Text(
            'Are you sure you want to delete all objects from your world?',
            style: TextStyle(color: Colors.white),
          ),
          actions: [
            const CancelButtonWidget(useWhiteText: true),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                delegate.deleteAllObjects();
              },
              child: const Text('Yes', style: TextStyle(color: Colors.red)),
            ),
          ],
        );
      },
    );
  }

  /// Show delete objects and files confirmation dialog
  void showDeleteObjectsAndFilesConfirmation() {
    showDialog(
      context: delegate.context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: Colors.grey[900],
          title: const Text(
            'Confirm Deletion',
            style: TextStyle(color: Colors.white),
          ),
          content: const Text(
            'Are you sure you want to delete all objects and files from your world?',
            style: TextStyle(color: Colors.white),
          ),
          actions: [
            const CancelButtonWidget(useWhiteText: true),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                delegate.deleteAllObjectsAndFiles();
              },
              child: const Text('Yes', style: TextStyle(color: Colors.red)),
            ),
          ],
        );
      },
    );
  }

  /// Show undo confirmation dialog
  void showUndoConfirmationDialog() {
    showDialog(
      context: delegate.context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: Colors.grey[900],
          title: const Text(
            'Confirm Restore',
            style: TextStyle(color: Colors.white),
          ),
          content: const Text(
            'Are you sure you want to restore the recently deleted objects?',
            style: TextStyle(color: Colors.white),
          ),
          actions: [
            const CancelButtonWidget(useWhiteText: true),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                delegate.restoreFromBackup();
                delegate.setState(() {}); // Refresh the menu state
              },
              child: const Text(
                'Restore',
                style: TextStyle(color: Colors.green),
              ),
            ),
          ],
        );
      },
    );
  }

  /// Show premium upgrade dialog for locked features
  void showPremiumUpgradeDialog(String featureName) {
    showDialog(
      context: delegate.context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.star, color: Colors.amber),
              SizedBox(width: 8),
              Text('Premium Feature'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$featureName is a premium feature.',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'For testing purposes, you can enable premium features in the premium control panel.',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                // For testing, we can show the premium control panel
                showPremiumControlPanel();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.amber,
                foregroundColor: Colors.white,
              ),
              child: const Text('Enable for Testing'),
            ),
          ],
        );
      },
    );
  }

  /// Show premium control panel for testing purposes
  void showPremiumControlPanel() {
    showDialog(
      context: delegate.context,
      builder: (BuildContext context) {
        return Consumer<PremiumService>(
          builder: (context, premiumService, child) {
            return AlertDialog(
              title: const Text('Premium Features (Testing)'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SwitchListTile(
                      title: const Text('Dazzle Bedroom World'),
                      subtitle: const Text('Cozy pink bedroom theme'),
                      value: premiumService.isWorldThemeUnlocked('dazzle'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockWorldTheme('dazzle');
                        } else {
                          premiumService.lockWorldTheme('dazzle');
                        }
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Forest Realm World'),
                      subtitle: const Text('Mystical forest theme'),
                      value: premiumService.isWorldThemeUnlocked('forest'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockWorldTheme('forest');
                        } else {
                          premiumService.lockWorldTheme('forest');
                        }
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Cave Explorer World'),
                      subtitle: const Text(
                        'Underground adventure with stalagmites',
                      ),
                      value: premiumService.isWorldThemeUnlocked('cave'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockWorldTheme('cave');
                        } else {
                          premiumService.lockWorldTheme('cave');
                        }
                      },
                    ),
                    SwitchListTile(
                      title: const Text('ChristmasLand World'),
                      subtitle: const Text(
                        'Festive log cabin with Christmas theme',
                      ),
                      value: premiumService.isWorldThemeUnlocked('christmas'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockWorldTheme('christmas');
                        } else {
                          premiumService.lockWorldTheme('christmas');
                        }
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Tropical Paradise World'),
                      subtitle: const Text(
                        'Beautiful tropical beach with palm trees and rippling water',
                      ),
                      value: premiumService.isWorldThemeUnlocked(
                        'tropical-paradise',
                      ),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockWorldTheme('tropical-paradise');
                        } else {
                          premiumService.lockWorldTheme('tropical-paradise');
                        }
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Flower Wonderland World'),
                      subtitle: const Text(
                        'Field of colorful flowers with hedges and tree groves',
                      ),
                      value: premiumService.isWorldThemeUnlocked(
                        'flower-wonderland',
                      ),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockWorldTheme('flower-wonderland');
                        } else {
                          premiumService.lockWorldTheme('flower-wonderland');
                        }
                      },
                    ),
                    const Divider(),
                    const Text(
                      'Gaming Levels',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue,
                      ),
                    ),
                    SwitchListTile(
                      title: const Text('Gaming Level 4'),
                      subtitle: const Text(
                        'Insect Safari creatures (15k+ points)',
                      ),
                      value: premiumService.isFeatureUnlocked('gaming_level_4'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockFeature('gaming_level_4');
                        } else {
                          premiumService.lockFeature('gaming_level_4');
                        }
                        // Notify JavaScript to refresh level progression
                        _notifyJavaScriptLevelRefresh(premiumService);
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Gaming Level 5'),
                      subtitle: const Text(
                        'Glowing Objects creatures (25k+ points)',
                      ),
                      value: premiumService.isFeatureUnlocked('gaming_level_5'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockFeature('gaming_level_5');
                        } else {
                          premiumService.lockFeature('gaming_level_5');
                        }
                        // Notify JavaScript to refresh level progression
                        _notifyJavaScriptLevelRefresh(premiumService);
                      },
                    ),
                    const Divider(),
                    SwitchListTile(
                      title: const Text('Premium Subscription (Test)'),
                      subtitle: const Text('Enable all premium features'),
                      value: premiumService.isPremiumSubscriber,
                      onChanged: (value) {
                        premiumService.setPremiumSubscription(value);
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Done'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  /// Show confirmation dialog with custom content
  void showConfirmationDialog({
    required String title,
    required String content,
    required String confirmLabel,
    required VoidCallback onConfirm,
    Color confirmColor = Colors.red,
    bool useWhiteText = true,
  }) {
    showDialog(
      context: delegate.context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: useWhiteText ? Colors.grey[900] : null,
          title: Text(
            title,
            style: useWhiteText ? const TextStyle(color: Colors.white) : null,
          ),
          content: Text(
            content,
            style: useWhiteText ? const TextStyle(color: Colors.white) : null,
          ),
          actions: [
            if (useWhiteText)
              const CancelButtonWidget(useWhiteText: true)
            else
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Cancel'),
              ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                onConfirm();
              },
              child: Text(confirmLabel, style: TextStyle(color: confirmColor)),
            ),
          ],
        );
      },
    );
  }

  /// Notify JavaScript about gaming level changes
  /// This method was missing from the refactored version
  void _notifyJavaScriptLevelRefresh(PremiumService premiumService) {
    // Check current state of gaming levels
    final level4Unlocked = premiumService.isFeatureUnlocked('gaming_level_4');
    final level5Unlocked = premiumService.isFeatureUnlocked('gaming_level_5');

    print(
      '🎮 FLUTTER → JS: Level 4 unlocked: $level4Unlocked, Level 5 unlocked: $level5Unlocked',
    );

    // This would need to be called on the main screen's WebViewController
    // For now, we'll just log the action - the main screen will handle the actual JS call
    print('🎮 Gaming level refresh notification prepared');
  }

  /// Show loading dialog for async operations
  void showLoadingDialog(String message) {
    showDialog(
      context: delegate.context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          content: Row(
            children: [
              const CircularProgressIndicator(),
              const SizedBox(width: 16),
              Expanded(child: Text(message)),
            ],
          ),
        );
      },
    );
  }

  /// Hide loading dialog
  void hideLoadingDialog() {
    Navigator.of(delegate.context).pop();
  }

  /// Show success message dialog
  void showSuccessDialog(String message) {
    showDialog(
      context: delegate.context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green),
              SizedBox(width: 8),
              Text('Success'),
            ],
          ),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        );
      },
    );
  }

  /// Show error message dialog
  void showErrorDialog(String message) {
    showDialog(
      context: delegate.context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.error, color: Colors.red),
              SizedBox(width: 8),
              Text('Error'),
            ],
          ),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        );
      },
    );
  }
}
