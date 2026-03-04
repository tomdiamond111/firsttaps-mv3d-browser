import 'package:flutter/material.dart';
import 'dart:html' as html;

class PrivacyPolicyDialog extends StatelessWidget {
  const PrivacyPolicyDialog({super.key});

  static void show(BuildContext context) {
    // Disable pointer events on iframe to allow dialog interaction
    final iframe = html.document.querySelector('iframe');
    iframe?.style.pointerEvents = 'none';

    showDialog(
      context: context,
      builder: (context) => const PrivacyPolicyDialog(),
    ).then((_) {
      // Re-enable pointer events on iframe when dialog closes
      iframe?.style.pointerEvents = 'auto';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        constraints: const BoxConstraints(maxHeight: 600, maxWidth: 500),
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.privacy_tip,
                  color: Color(0xFF228B22),
                  size: 28,
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Privacy Policy',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF228B22),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSection(
                      'Privacy Policy for First Taps MV3D',
                      'Effective Date: December 1, 2025\n\n'
                          'Welcome to First Taps MV3D. We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our web app and related services.',
                      isHeader: true,
                    ),
                    _buildSection(
                      '1. Information We Collect',
                      'We collect the following types of information:\n\n'
                          '• Browser Data: Browser type, version, and usage patterns to improve performance.\n'
                          '• Usage Data: How you interact with the 3D world and media content.\n'
                          '• API Access: With your permission, we access third-party APIs (e.g., YouTube, Spotify) to search and display media.\n'
                          '• Local Storage: Settings and preferences stored locally in your browser.\n'
                          '• Diagnostic & Crash Reports: Automatically collected to help us troubleshoot and improve stability.',
                    ),
                    _buildSection(
                      '2. How We Use Your Information',
                      'We use your data to:\n\n'
                          '• Search and display music and video content from various platforms\n'
                          '• Enable browsing and playback in the 3D world\n'
                          '• Save your preferences and world configurations\n'
                          '• Improve app performance and fix bugs\n'
                          '• Communicate updates and support (only if you opt in)',
                    ),
                    _buildSection(
                      '3. Data Sharing & Storage',
                      'We do not sell your personal data. We may share limited information with:\n\n'
                          '• Service Providers: For hosting, analytics, and API access\n'
                          '• Legal Authorities: If required by law or to protect our users and platform\n\n'
                          'Your data is stored securely using industry-standard encryption and access controls. API credentials are encrypted and used only for the purpose of searching and displaying media.',
                    ),
                    _buildSection(
                      '4. Permissions & Browser Storage',
                      'First Taps MV3D uses browser local storage to save:\n\n'
                          '• World configurations and object placements\n'
                          '• User preferences and settings\n'
                          '• Furniture and playlist data\n\n'
                          'You can clear this data through your browser settings.',
                    ),
                    _buildSection(
                      '5. Your Rights & Choices',
                      'You can:\n\n'
                          '• Clear your browser data to remove all stored information\n'
                          '• Opt out of analytics tracking\n'
                          '• Request a copy of your data by contacting us',
                    ),
                    _buildSection(
                      '6. Updates to This Policy',
                      'We may update this Privacy Policy as our services evolve. Changes will be posted here and reflected in the app. Continued use of First Taps MV3D after updates means you accept the revised policy.',
                    ),
                    _buildSection(
                      '7. 📬 Contact Us',
                      'For questions or data requests, reach out to:\n\n'
                          '• Email: support@firsttapsmv3d.com\n'
                          '• Website: www.firsttapsmv3d.com',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF228B22),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: () => Navigator.pop(context),
                child: const Text('Close', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildSection(
    String title,
    String content, {
    bool isHeader = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: isHeader ? 18 : 16,
              fontWeight: FontWeight.bold,
              color: isHeader ? const Color(0xFF228B22) : Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            content,
            style: const TextStyle(
              fontSize: 14,
              color: Colors.black87,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}
