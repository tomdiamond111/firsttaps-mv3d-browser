import 'package:flutter/material.dart';

class PrivacyPolicyDialog extends StatelessWidget {
  const PrivacyPolicyDialog({super.key});

  static void show(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const PrivacyPolicyDialog(),
    );
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
                      'Privacy Policy for Life Replayed',
                      'Effective Date: December 1, 2025\n\n'
                          'Welcome to Life Replayed. We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our mobile apps, website, and related services.',
                      isHeader: true,
                    ),
                    _buildSection(
                      '1. Information We Collect',
                      'We collect the following types of information:\n\n'
                          '• Account Information: Name, email address, and login credentials when you create an account.\n'
                          '• Device & Usage Data: Device type, operating system, app version, and usage patterns to improve performance.\n'
                          '• Cloud Access Credentials: With your permission, we access cloud storage accounts (e.g., Google Photos, iCloud) to locate and download your media.\n'
                          '• Local Drive Metadata: Information about your connected home drive (e.g., available storage, sync status).\n'
                          '• Subscription & Payment Info: If you purchase a subscription, we collect billing details via secure third-party processors (e.g., Google Play, Apple App Store).\n'
                          '• Diagnostic & Crash Reports: Automatically collected to help us troubleshoot and improve stability.',
                    ),
                    _buildSection(
                      '2. How We Use Your Information',
                      'We use your data to:\n\n'
                          '• Locate and retrieve your images and videos from cloud accounts\n'
                          '• Transfer media securely to your designated home drive\n'
                          '• Enable browsing and playback across devices\n'
                          '• Process payments and manage your account\n'
                          '• Improve app performance and fix bugs\n'
                          '• Communicate updates, support, and promotional offers (only if you opt in)',
                    ),
                    _buildSection(
                      '3. Data Sharing & Storage',
                      'We do not sell your personal data. We may share limited information with:\n\n'
                          '• Service Providers: For hosting, analytics, and payment processing\n'
                          '• Legal Authorities: If required by law or to protect our users and platform\n\n'
                          'Your data is stored securely using industry-standard encryption and access controls. Cloud access credentials are encrypted and used only for the purpose of locating and transferring your media.',
                    ),
                    _buildSection(
                      '4. Permissions & Sync',
                      'Life Replayed supports cross-device access and home drive sync. We may request permissions for:\n\n'
                          '• Cloud Storage Access: To locate and download your media\n'
                          '• Local Storage Access: To write files to your home drive\n'
                          '• Notifications: For sync status, updates, and reminders\n\n'
                          'You can manage these permissions in your device settings.',
                    ),
                    _buildSection(
                      '5. Your Rights & Choices',
                      'You can:\n\n'
                          '• Access and update your account information\n'
                          '• Delete your account and associated data\n'
                          '• Revoke cloud access permissions at any time\n'
                          '• Opt out of promotional communications\n'
                          '• Request a copy of your data by contacting us',
                    ),
                    _buildSection(
                      '6. Updates to This Policy',
                      'We may update this Privacy Policy as our services evolve. Changes will be posted here and reflected in the app\'s main menu. Continued use of Life Replayed after updates means you accept the revised policy.',
                    ),
                    _buildSection(
                      '7. 📬 Contact Us',
                      'This policy is maintained by Life Replayed, LLC, a registered business in Illinois.\n\n'
                          'For questions or data requests, reach out to:\n\n'
                          '• Email: support@lifereplayed.com\n'
                          '• Website: www.lifereplayed.com\n'
                          '• Mailing Address: [Insert business address – Coworking location or PO Box]',
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

  Widget _buildSection(String title, String content, {bool isHeader = false}) {
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
