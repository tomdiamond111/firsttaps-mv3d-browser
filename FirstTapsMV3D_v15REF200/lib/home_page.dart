import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firsttaps_mv3d/controllers/home_page_controller.dart';
import 'package:firsttaps_mv3d/widgets/privacy_policy_dialog.dart';
import 'package:firsttaps_mv3d/widgets/welcome_instructions_dialog.dart';
import 'package:firsttaps_mv3d/widgets/music_preferences_dialog.dart';
import 'package:firsttaps_mv3d/services/revenue_cat_service.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    // Check and show welcome instructions on first launch
    _checkFirstLaunch();
  }

  Future<void> _checkFirstLaunch() async {
    final prefs = await SharedPreferences.getInstance();
    final shouldShowWelcome = await WelcomeInstructionsDialog.shouldShow();

    // Check if music preferences have been shown before
    const musicPrefsShownKey = 'music_prefs_first_shown';
    final musicPrefsShown = prefs.getBool(musicPrefsShownKey) ?? false;

    print('🔍 First launch check:');
    print('   shouldShowWelcome: $shouldShowWelcome');
    print('   musicPrefsShown: $musicPrefsShown');

    // Show dialogs if needed
    if ((shouldShowWelcome || !musicPrefsShown) && mounted) {
      print('🎵 First launch detected - will show dialog(s)...');

      // Use postFrameCallback to ensure UI is ready
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) {
          print('❌ Widget not mounted, canceling dialogs');
          return;
        }

        print('✅ Widget mounted, proceeding with dialogs...');

        // Show welcome instructions first (only if truly first time)
        if (shouldShowWelcome) {
          print('📖 Showing welcome instructions dialog...');
          try {
            await WelcomeInstructionsDialog.show(context);
            print('✅ Welcome instructions dialog closed');
          } catch (e) {
            print('❌ Error showing welcome dialog: $e');
          }
        }

        // ALWAYS show music preferences on first install (after welcome if shown)
        if (mounted && !musicPrefsShown) {
          print('🎵 Preparing to show music preferences dialog...');
          print('🎵 Context valid: ${mounted}');

          // Wait a bit to ensure context is stable
          await Future.delayed(const Duration(milliseconds: 800));

          if (!mounted) {
            print(
              '❌ Widget no longer mounted, aborting music preferences dialog',
            );
            return;
          }

          print('🎵 Showing music preferences dialog NOW...');
          try {
            await MusicPreferencesDialog.show(context);
            print('✅ Music preferences dialog closed by user');

            // Mark as shown AFTER dialog is dismissed (not before)
            await prefs.setBool(musicPrefsShownKey, true);
            print('✅ Music preferences marked as shown in storage');

            // Ensure at least one genre is selected, otherwise select all
            final selectedGenres =
                await MusicPreferencesDialog.loadSelectedGenres();
            if (selectedGenres.isEmpty) {
              print('⚠️ No genres selected, selecting all by default');
              // User closed without selecting - select all genres
              final allGenres = MusicPreferencesDialog.availableGenres
                  .map((g) => g.id)
                  .toList();
              await MusicPreferencesDialog.saveSelectedGenres(allGenres);
              print('✅ All genres selected as default');
            } else {
              print('✅ User selected ${selectedGenres.length} genres');
            }
          } catch (e) {
            print('❌ Error showing music preferences dialog: $e');
            // Mark as shown even on error to prevent infinite loop
            await prefs.setBool(musicPrefsShownKey, true);
          }
        } else if (!mounted) {
          print('❌ Widget unmounted before music prefs dialog');
        } else {
          print('ℹ️ Music preferences already shown previously');
        }
      });
    } else {
      print('ℹ️ Not first launch - skipping dialogs');
      print(
        '   (Welcome shown: ${!shouldShowWelcome}, Music prefs shown: $musicPrefsShown)',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // HomePageController is now provided by MultiProvider in main.dart
    // So, HomePage just needs to return the view that uses the controller.
    return const _HomePageView();
  }
}

class _HomePageView extends StatelessWidget {
  const _HomePageView(); // Method to show settings, can be called from AppBar
  void showSettings(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Options'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Help/Instructions option at the top
            ListTile(
              leading: const Icon(Icons.help_outline, color: Colors.blue),
              title: const Text('Help & Instructions'),
              onTap: () {
                Navigator.pop(context);
                WelcomeInstructionsDialog.show(context);
              },
            ),
            const Divider(),
            // Undo Delete option
            Consumer<HomePageController>(
              builder: (context, controller, child) {
                final hasDeleted = controller.hasDeletedObjects;
                final recentDeleted = controller.mostRecentlyDeletedObject;

                return ListTile(
                  leading: Icon(
                    Icons.undo,
                    color: hasDeleted ? Colors.blue : Colors.grey,
                  ),
                  title: Text(
                    hasDeleted && recentDeleted != null
                        ? 'Undo Delete "${recentDeleted.name}"'
                        : 'Undo Delete',
                    style: TextStyle(
                      color: hasDeleted ? Colors.black : Colors.grey,
                    ),
                  ),
                  enabled: hasDeleted,
                  onTap: hasDeleted && recentDeleted != null
                      ? () {
                          Navigator.pop(context); // Close dialog first
                          controller.undoDeleteObject(recentDeleted);
                        }
                      : null,
                );
              },
            ),
            const Divider(),
            // Device App ID option
            ListTile(
              leading: const Icon(Icons.fingerprint),
              title: const Text('Device App ID'),
              onTap: () {
                Navigator.pop(context); // Close dialog first
                _showDeviceAppId(context);
              },
            ),
            // Privacy Policy option
            ListTile(
              leading: const Icon(Icons.privacy_tip),
              title: const Text('View Privacy Policy'),
              onTap: () {
                Navigator.pop(context); // Close dialog first
                _showPrivacyPolicy(context);
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showPrivacyPolicy(BuildContext context) {
    PrivacyPolicyDialog.show(context);
  }

  void _showDeviceAppId(BuildContext context) async {
    final revenueCat = RevenueCatService();
    final appUserId = await revenueCat.getAppUserId();

    if (!context.mounted) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.fingerprint, color: Colors.blue),
            SizedBox(width: 8),
            Text('Device App ID'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your unique device identifier for in-app purchases:',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            SelectableText(
              appUserId ?? 'Loading...',
              style: const TextStyle(
                fontSize: 12,
                fontFamily: 'monospace',
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'This ID is used to track your purchases across app reinstalls. Keep it safe if you need to contact support.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              if (appUserId != null) {
                Clipboard.setData(ClipboardData(text: appUserId));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Device App ID copied to clipboard'),
                    duration: Duration(seconds: 2),
                  ),
                );
              }
              Navigator.pop(context);
            },
            child: const Text('Copy ID'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showObjectTypeSubmenu(BuildContext context) {
    final controller = Provider.of<HomePageController>(context, listen: false);

    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8,
          ),
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Add Objects to World',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF228B22),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildSubmenuButton(
                    context,
                    icon: Icons.search,
                    title: 'Search Music/Video',
                    subtitle: 'YouTube, Deezer, Vimeo & more',
                    onTap: () {
                      Navigator.pop(context);
                      controller.searchMusicAndNavigate(context);
                    },
                  ),
                  const SizedBox(height: 16),
                  _buildSubmenuButton(
                    context,
                    icon: Icons.link,
                    title: 'Add Link',
                    subtitle: 'Web, YouTube & other links',
                    onTap: () {
                      Navigator.pop(context);
                      controller.addLinkAndNavigate(context);
                    },
                  ),
                  const SizedBox(height: 16),
                  _buildSubmenuButton(
                    context,
                    icon: Icons.insert_drive_file,
                    title: 'Add Files',
                    subtitle: 'Music, videos, images, documents',
                    onTap: () {
                      Navigator.pop(context);
                      controller.addFilesAndNavigate(context);
                    },
                  ),
                  const SizedBox(height: 16),
                  _buildSubmenuButton(
                    context,
                    icon: Icons.apps,
                    title: 'Add Apps',
                    subtitle: 'Applications from your device',
                    onTap: () {
                      Navigator.pop(context);
                      controller.addAppsAndNavigate(context);
                    },
                  ),
                  const SizedBox(height: 16),
                  _buildSubmenuButton(
                    context,
                    icon: Icons.contacts,
                    title: 'Add Contacts',
                    subtitle: 'People from your contacts',
                    onTap: () {
                      Navigator.pop(context);
                      controller.addContactsAndNavigate(context);
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSubmenuButton(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Row(
            children: [
              Icon(icon, size: 24, color: const Color(0xFF228B22)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = Provider.of<HomePageController>(context);

    // Set the current context for snackbars
    WidgetsBinding.instance.addPostFrameCallback((_) {
      controller.setCurrentContext(context);
    });

    // Detect orientation for background image selection
    final orientation = MediaQuery.of(context).orientation;
    final isPortrait = orientation == Orientation.portrait;
    final backgroundImage = isPortrait
        ? 'assets/images/firsttaps_homescreen_portrait1.png'
        : 'assets/images/firsttaps_homescreen_landscape1.png';

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          image: DecorationImage(
            image: AssetImage(backgroundImage),
            fit: BoxFit.cover,
          ),
        ),
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            title: const Text(
              'Welcome to FirstTaps MV3D',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 22,
                shadows: [
                  Shadow(
                    offset: Offset(1.0, 1.0),
                    blurRadius: 3.0,
                    color: Color.fromARGB(255, 0, 0, 0),
                  ),
                  Shadow(
                    offset: Offset(-1.0, -1.0),
                    blurRadius: 3.0,
                    color: Color.fromARGB(255, 0, 0, 0),
                  ),
                ],
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.settings, color: Colors.white),
                onPressed: () =>
                    showSettings(context), // Call the local showSettings
                tooltip: 'Settings',
              ),
            ],
          ),
          body: SafeArea(
            child: Column(
              children: [
                // Responsive spacing based on orientation
                SizedBox(height: isPortrait ? 32 : 8),

                // Logo placement in landscape mode - ABOVE subtitle
                if (!isPortrait) ...[
                  Center(
                    child: Container(
                      height: 60,
                      decoration: BoxDecoration(
                        boxShadow: [
                          BoxShadow(
                            offset: const Offset(2.0, 2.0),
                            blurRadius: 6.0,
                            color: Colors.black.withOpacity(0.3),
                          ),
                          BoxShadow(
                            offset: const Offset(-1.0, -1.0),
                            blurRadius: 3.0,
                            color: Colors.black.withOpacity(0.2),
                          ),
                        ],
                      ),
                      child: Image.asset(
                        'assets/images/FirstTapsMV3D_logo1.jpg',
                        fit: BoxFit.contain,
                        filterQuality: FilterQuality.high,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Subtitle text
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 24.0),
                  child: Text(
                    "YouTube, Spotify, MP3s, MP4s—all your music and videos in one immersive 3D world.",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      shadows: [
                        Shadow(
                          offset: Offset(1.0, 1.0),
                          blurRadius: 3.0,
                          color: Color.fromARGB(255, 0, 0, 0),
                        ),
                        Shadow(
                          offset: Offset(-1.0, -1.0),
                          blurRadius: 3.0,
                          color: Color.fromARGB(255, 0, 0, 0),
                        ),
                      ],
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),

                // Logo placement in portrait mode
                if (isPortrait) ...[
                  const Spacer(),
                  const SizedBox(height: 24),
                  Center(
                    child: Container(
                      height: 120, // Larger logo in portrait
                      decoration: BoxDecoration(
                        boxShadow: [
                          BoxShadow(
                            offset: const Offset(2.0, 2.0),
                            blurRadius: 6.0,
                            color: Colors.black.withOpacity(0.3),
                          ),
                          BoxShadow(
                            offset: const Offset(-1.0, -1.0),
                            blurRadius: 3.0,
                            color: Colors.black.withOpacity(0.2),
                          ),
                        ],
                      ),
                      child: Image.asset(
                        'assets/images/FirstTapsMV3D_logo1.jpg',
                        fit: BoxFit.contain,
                        filterQuality: FilterQuality.high,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ] else ...[
                  // Reduced spacing for landscape to move buttons up (no transform needed)
                  const SizedBox(
                    height: 0,
                  ), // Minimal spacing to move buttons up by ~20px total
                ],

                // Button section with responsive layout
                Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: isPortrait ? 40.0 : 160.0,
                  ),
                  child: Column(
                    children: [
                      // Add Objects to World Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF228B22),
                            elevation: 6,
                            padding: EdgeInsets.symmetric(
                              vertical: isPortrait
                                  ? 20
                                  : 16, // Reduced for landscape
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(15),
                            ),
                          ),
                          onPressed: () => _showObjectTypeSubmenu(context),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_circle_outline, size: 28),
                              SizedBox(width: 12),
                              Text(
                                'Add Music, Videos & More!',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(
                        height: isPortrait
                            ? 21
                            : 16, // Further reduced for landscape
                      ),
                      // Go to World Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF228B22),
                            elevation: 8,
                            padding: EdgeInsets.symmetric(
                              vertical: isPortrait
                                  ? 22
                                  : 18, // Reduced for landscape
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(15),
                              side: const BorderSide(
                                color: Color(0xFF228B22),
                                width: 2,
                              ),
                            ),
                          ),
                          onPressed: () =>
                              controller.navigateToThreeJsScreen(context),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.public, size: 28),
                              SizedBox(width: 12),
                              Text(
                                'Go to World',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(
                        height: isPortrait
                            ? 45
                            : 40, // Further reduced for landscape
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // This helper can be removed if no file list is shown on the home page,
  // or adapted if you want to show a list based on controller.files
  // For now, it's not used to match the old UI.
  /* 
  Widget _buildFileListView(HomePageController controller) {
    return Column(
      children: [
        const Text(
          'Added Files:',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 150, // Constrain height
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: controller.files.length,
            itemBuilder: (context, index) {
              final file = controller.files[index];
              return Card(
                margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                child: ListTile(
                  leading: const Icon(Icons.insert_drive_file),
                  title: Text(file.name, overflow: TextOverflow.ellipsis),
                  subtitle: Text(file.path, overflow: TextOverflow.ellipsis),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
  */
}
