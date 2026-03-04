import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:html' as html;

class WelcomeInstructionsDialog extends StatelessWidget {
  final VoidCallback? onClose;

  const WelcomeInstructionsDialog({super.key, this.onClose});

  static const String _prefsKey = 'firstLaunch_shown';

  /// Check if this is the first launch
  static Future<bool> shouldShow() async {
    final prefs = await SharedPreferences.getInstance();
    return !(prefs.getBool(_prefsKey) ?? false);
  }

  /// Mark instructions as shown
  static Future<void> markAsShown() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefsKey, true);
  }

  /// Show the instructions dialog
  static Future<void> show(BuildContext context) async {
    // Disable pointer events on iframe to allow dialog interaction
    final iframe = html.document.querySelector('iframe');
    iframe?.style.pointerEvents = 'none';

    try {
      await showDialog(
        context: context,
        barrierDismissible: true,
        builder: (dialogContext) => WelcomeInstructionsDialog(
          onClose: () => Navigator.of(dialogContext).pop(),
        ),
      );
      await markAsShown();
    } finally {
      // Re-enable pointer events on iframe
      iframe?.style.pointerEvents = 'auto';
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final screenWidth = MediaQuery.of(context).size.width;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        width: screenWidth > 500 ? 500 : screenWidth * 0.9,
        height: screenHeight * 0.85,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.max,
          children: [
            // Header with close button
            Container(
              padding: const EdgeInsets.fromLTRB(24, 20, 12, 16),
              decoration: const BoxDecoration(
                color: Color(0xFF228B22),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.help_outline, color: Colors.white, size: 28),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Welcome to FirstTaps MV3D',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: onClose ?? () => Navigator.of(context).pop(),
                    tooltip: 'Close',
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ],
              ),
            ),

            // Scrollable content
            Expanded(
              child: ScrollConfiguration(
                behavior: ScrollConfiguration.of(context).copyWith(
                  dragDevices: {
                    PointerDeviceKind.touch,
                    PointerDeviceKind.mouse,
                  },
                  scrollbars: true,
                ),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Introduction paragraph
                      Text(
                        'Your go-to place for discovering, playing, and sharing music & videos. The app learns your taste automatically - no setup needed.',
                        style: TextStyle(
                          fontSize: 15,
                          color: Colors.grey.shade800,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'How It Works:',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF228B22),
                        ),
                      ),
                      const SizedBox(height: 20),
                      _buildInstruction(
                        '1',
                        'Play & Discover',
                        'Double-tap any music/video to play. Tap refresh icon on furniture for AI-powered recommendations based on what you play',
                        Icons.play_circle_outline,
                      ),
                      _buildInstruction(
                        '2',
                        'Add Your Content',
                        'Tap "Add Objects" to add links from YouTube, Spotify, TikTok, Instagram, Deezer, Vimeo, or MP3/MP4 files from your device',
                        Icons.add_circle_outline,
                      ),
                      _buildInstruction(
                        '3',
                        'Search Any Platform',
                        'Tap the search toggle icon to switch between searching your world objects or searching music & videos across platforms like YouTube, Spotify, and more',
                        Icons.search,
                      ),
                      _buildInstruction(
                        '4',
                        'Create & Share Playlists',
                        'Create furniture (bookshelf, stage, gallery) and drag links onto them. Share your 3D playlists via link - works in any browser',
                        Icons.share,
                      ),
                      _buildInstruction(
                        '5',
                        'Navigate Your World',
                        'Tap map icon for 2D overhead view, or tap walking figure for first-person Explorer mode',
                        Icons.explore,
                      ),
                      _buildInstruction(
                        '6',
                        'Contacts & Apps',
                        'Add contacts and apps to your world. Tap contacts to call or text, tap apps to launch',
                        Icons.contacts,
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Footer with close button
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: Colors.grey.shade300)),
              ),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF228B22),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: onClose ?? () => Navigator.of(context).pop(),
                  child: const Text(
                    'Got It!',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInstruction(
    String number,
    String title,
    String description,
    IconData icon,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Number badge
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFF228B22),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Center(
              child: Text(
                number,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Icon
          Icon(icon, color: const Color(0xFF228B22), size: 24),
          const SizedBox(width: 12),
          // Text content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade700,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
