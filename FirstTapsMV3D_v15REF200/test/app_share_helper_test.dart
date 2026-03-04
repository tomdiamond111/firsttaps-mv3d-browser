import 'package:flutter_test/flutter_test.dart';
import '../lib/helpers/app_share_helper.dart';

void main() {
  group('AppShareHelper Tests', () {
    test('should provide correct share content', () {
      final content = AppShareHelper.getShareContent();

      expect(
        content['subject'],
        'Amazing FirstTaps3D App - The World Inside Your Phone',
      );
      expect(
        content['message'],
        'Check out FirstTaps3D, the world that lives inside your phone!',
      );
      expect(content['storeUrl'], contains('play.google.com'));
      expect(content['fullMessage'], contains('Check out FirstTaps3D'));
      expect(content['fullMessage'], contains('play.google.com'));
    });

    test('should create share options', () {
      final options = AppShareHelper.getShareOptions();

      expect(options, isNotEmpty);
      expect(options.first.label, 'Share with Friends');
      expect(options.first.icon, '👥');
    });

    test('should handle share app call', () async {
      // This is just a basic test since we're logging for now
      final result = await AppShareHelper.shareApp();
      expect(result, isTrue);
    });

    test('should handle custom message sharing', () async {
      final result = await AppShareHelper.shareAppWithCustomMessage(
        customMessage: 'Test custom message',
        customSubject: 'Test Subject',
      );
      expect(result, isTrue);
    });

    test('should handle JavaScript sharing', () async {
      final result = await AppShareHelper.shareViaJavaScript();
      expect(result, isTrue);
    });

    test('should get share stats', () async {
      final stats = await AppShareHelper.getShareStats();
      expect(stats.totalShares, 0);
      expect(stats.bonusPointsEarned, 0);
      expect(stats.lastSharedDate, isNull);
    });

    test('should check recent shares', () async {
      final hasShared = await AppShareHelper.hasSharedRecently();
      expect(hasShared, isFalse); // Always false for now
    });
  });
}
