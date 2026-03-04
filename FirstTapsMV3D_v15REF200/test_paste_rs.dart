import 'dart:convert';
import 'package:http/http.dart' as http;

/// Test paste.rs - A simple, reliable paste service
Future<void> main() async {
  print('🧪 Testing paste.rs\n');

  final testData = 'TEST_DATA_${DateTime.now().millisecondsSinceEpoch}';

  print('📤 Uploading to paste.rs...');
  print('   Data: $testData\n');

  try {
    // paste.rs is simple: POST to https://paste.rs/
    final response = await http
        .post(Uri.parse('https://paste.rs/'), body: testData)
        .timeout(const Duration(seconds: 10));

    print('✅ Status: ${response.statusCode}');
    print('📄 Response Body: ${response.body}');

    if (response.statusCode == 201 || response.statusCode == 200) {
      // paste.rs returns the URL directly
      final pasteUrl = response.body.trim();
      print('\n📎 Paste URL: $pasteUrl');

      // Try to fetch it
      print('\n🔍 Verifying by fetching...');
      final verifyResponse = await http
          .get(Uri.parse(pasteUrl))
          .timeout(const Duration(seconds: 10));

      print('✅ Verify Status: ${verifyResponse.statusCode}');
      print('📄 Fetched Data: ${verifyResponse.body}');

      if (verifyResponse.body.trim() == testData) {
        print('\n✅ SUCCESS! paste.rs is working perfectly!');
        print('   This is a great paste service to use!');
      } else {
        print('\n❌ DATA MISMATCH!');
      }
    }
  } catch (e) {
    print('❌ Error: $e');
  }
}
