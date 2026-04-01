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
    final hasShown = prefs.getBool(_prefsKey) ?? false;
    print('🔍 [WelcomeDialog] Checking shouldShow():');
    print('   Key: $_prefsKey');
    print('   Value in prefs: $hasShown');
    print('   Will show dialog: ${!hasShown}');
    // DEBUG: List all keys in localStorage to see actual storage
    final allKeys = html.window.localStorage.keys.toList();
    print('   All localStorage keys: $allKeys');
    return !(prefs.getBool(_prefsKey) ?? false);
  }

  /// Mark instructions as shown
  static Future<void> markAsShown() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefsKey, true);
    print('✅ [WelcomeDialog] Marked as shown: $_prefsKey = true');
    // DEBUG: Check what key it actually used in localStorage
    final allKeys = html.window.localStorage.keys.toList();
    final matchingKeys = allKeys.where((k) => k.contains('first')).toList();
    print('   localStorage keys containing "first": $matchingKeys');
  }

  /// Show the instructions dialog
  /// Note: Iframe pointer-events management should be handled by the calling screen
  static Future<void> show(BuildContext context) async {
    await showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) => WelcomeInstructionsDialog(
        onClose: () => Navigator.of(dialogContext).pop(),
      ),
    );
    await markAsShown();
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
                      // Navigation instructions - prominently at top
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF228B22).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF228B22),
                            width: 2,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(
                                  Icons.touch_app,
                                  color: Color(0xFF228B22),
                                  size: 24,
                                ),
                                SizedBox(width: 8),
                                Text(
                                  'How to Navigate:',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF228B22),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              '• Tap once on objects to preview\n'
                              '• Double tap to open and play content\n'
                              '• Long press to open menu for Share / Move / Delete',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey.shade800,
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      // Quick start guide
                      const Text(
                        'Quick Start:',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF228B22),
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildInstruction(
                        '1',
                        'Add Content',
                        'Use "Add Objects" to add media from YouTube, Spotify, TikTok, Instagram, and more',
                        Icons.add_circle_outline,
                      ),
                      _buildInstruction(
                        '2',
                        'Create Playlists',
                        'Add furniture to organize your media into beautiful 3D collections',
                        Icons.weekend,
                      ),
                      _buildInstruction(
                        '3',
                        'Share Playlists (Furniture)',
                        'Long press furniture to share your 3D playlists via link - works in any browser',
                        Icons.share,
                      ),
                      _buildInstruction(
                        '4',
                        'Get Recommendations',
                        'Tap refresh icon on furniture for AI-powered recommendations based on what you play',
                        Icons.refresh,
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
                    color: Colors.grey.shade800,
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
