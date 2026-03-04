import 'dart:convert';
import 'package:http/http.dart' as http;

/// Test script to verify dpaste and rentry APIs
Future<void> main() async {
  print('🧪 Testing Paste Services\n');

  final testData = 'TEST_DATA_${DateTime.now().millisecondsSinceEpoch}';

  // Test dpaste.com
  print('1️⃣ Testing dpaste.com...');
  print('   URL: https://dpaste.com/api/v2/');
  print('   Data: $testData\n');

  try {
    final dpasteResponse = await http
        .post(
          Uri.parse('https://dpaste.com/api/v2/'),
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: {'content': testData, 'syntax': 'text', 'expiry_days': '365'},
        )
        .timeout(const Duration(seconds: 10));

    print('   ✅ Status: ${dpasteResponse.statusCode}');
    print('   📄 Response Body:');
    print('   ${dpasteResponse.body}');
    print('   📋 Response Headers:');
    dpasteResponse.headers.forEach((key, value) {
      print('      $key: $value');
    });

    if (dpasteResponse.statusCode == 200 || dpasteResponse.statusCode == 201) {
      final pasteUrl = dpasteResponse.body.trim();
      print('\n   📎 Paste URL: $pasteUrl');

      // Try to extract ID
      final cleanUrl = pasteUrl.replaceAll(RegExp(r'/$'), '');
      final pasteId = cleanUrl.split('/').last;
      print('   🆔 Extracted ID: $pasteId');

      // Try to verify by fetching
      print('\n   🔍 Verifying by fetching: https://dpaste.com/$pasteId.txt');
      final verifyResponse = await http
          .get(Uri.parse('https://dpaste.com/$pasteId.txt'))
          .timeout(const Duration(seconds: 10));

      print('   ✅ Verify Status: ${verifyResponse.statusCode}');
      print('   📄 Fetched Data: ${verifyResponse.body}');

      if (verifyResponse.body.trim() == testData) {
        print('   ✅ DATA MATCHES! dpaste is working correctly.');
      } else {
        print('   ❌ DATA MISMATCH! Got: ${verifyResponse.body}');
      }
    }
  } catch (e) {
    print('   ❌ Error: $e');
  }

  print('\n' + '─' * 60 + '\n');

  // Test rentry.co
  print('2️⃣ Testing rentry.co...');
  print('   URL: https://rentry.co/api/new');
  print('   Data: $testData\n');

  try {
    final rentryResponse = await http
        .post(
          Uri.parse('https://rentry.co/api/new'),
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: {'text': testData},
        )
        .timeout(const Duration(seconds: 10));

    print('   ✅ Status: ${rentryResponse.statusCode}');
    print('   📄 Response Body (first 500 chars):');
    final body = rentryResponse.body;
    print('   ${body.substring(0, body.length < 500 ? body.length : 500)}');

    // Check if HTML
    if (body.trim().startsWith('<')) {
      print('\n   ⚠️ WARNING: Response is HTML, not JSON!');
      print(
        '   This means rentry.co API has changed or requires authentication.',
      );
    } else {
      try {
        final data = jsonDecode(body);
        print('\n   ✅ Valid JSON response');
        print('   📋 Keys: ${data.keys.toList()}');
        print('   📄 Full JSON: $data');

        if (data.containsKey('url')) {
          final rentryUrl = data['url'];
          print('\n   📎 Paste URL: $rentryUrl');

          final pasteId = rentryUrl.split('/').last;
          print('   🆔 Extracted ID: $pasteId');

          // Try to verify
          print(
            '\n   🔍 Verifying by fetching: https://rentry.co/$pasteId/raw',
          );
          final verifyResponse = await http
              .get(Uri.parse('https://rentry.co/$pasteId/raw'))
              .timeout(const Duration(seconds: 10));

          print('   ✅ Verify Status: ${verifyResponse.statusCode}');
          print('   📄 Fetched Data: ${verifyResponse.body}');

          if (verifyResponse.body.trim() == testData) {
            print('   ✅ DATA MATCHES! rentry is working correctly.');
          } else {
            print('   ❌ DATA MISMATCH! Got: ${verifyResponse.body}');
          }
        }
      } catch (e) {
        print('   ❌ JSON Parse Error: $e');
      }
    }
  } catch (e) {
    print('   ❌ Error: $e');
  }

  print('\n' + '═' * 60);
  print('Test Complete');
}
