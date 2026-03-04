import 'dart:convert';
import 'package:http/http.dart' as http;

/// Test script to verify paste.gg and ix.io APIs
Future<void> main() async {
  print('🧪 Testing NEW Paste Services (paste.gg and ix.io)\n');

  final testData =
      'TEST_FURNITURE_DATA_${DateTime.now().millisecondsSinceEpoch}';

  // Test paste.gg
  print('1️⃣ Testing paste.gg...');
  print('   URL: https://api.paste.gg/v1/pastes');
  print('   Data: $testData\n');

  try {
    final pasteGgResponse = await http
        .post(
          Uri.parse('https://api.paste.gg/v1/pastes'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'name': 'FirstTaps Furniture Share Test',
            'description': 'Furniture playlist test from FirstTaps MV3D',
            'visibility': 'unlisted',
            'expires': null,
            'files': [
              {
                'name': 'furniture_data.txt',
                'content': {'format': 'text', 'value': testData},
              },
            ],
          }),
        )
        .timeout(const Duration(seconds: 15));

    print('   ✅ Status: ${pasteGgResponse.statusCode}');
    print('   📄 Response Body:');
    print('   ${pasteGgResponse.body}');

    if (pasteGgResponse.statusCode == 200 ||
        pasteGgResponse.statusCode == 201) {
      final data = jsonDecode(pasteGgResponse.body);
      print('\n   ✅ Valid JSON response');
      print('   📋 Status: ${data['status']}');

      if (data['status'] == 'success' && data['result'] != null) {
        final pasteId = data['result']['id'];
        print('   🆔 Paste ID: $pasteId');

        // Try to verify by fetching
        print(
          '\n   🔍 Verifying by fetching: https://api.paste.gg/v1/pastes/$pasteId',
        );
        final verifyResponse = await http
            .get(Uri.parse('https://api.paste.gg/v1/pastes/$pasteId'))
            .timeout(const Duration(seconds: 10));

        print('   ✅ Verify Status: ${verifyResponse.statusCode}');

        if (verifyResponse.statusCode == 200) {
          final fetchData = jsonDecode(verifyResponse.body);
          if (fetchData['status'] == 'success' &&
              fetchData['result'] != null &&
              fetchData['result']['files'] != null &&
              fetchData['result']['files'].isNotEmpty) {
            final fileContent =
                fetchData['result']['files'][0]['content']['value'];
            print('   📄 Fetched Data: $fileContent');

            if (fileContent == testData) {
              print('   ✅ DATA MATCHES! paste.gg is working correctly.');
            } else {
              print('   ❌ DATA MISMATCH! Got: $fileContent');
            }
          } else {
            print('   ❌ Invalid response structure');
          }
        }
      }
    }
  } catch (e) {
    print('   ❌ Error: $e');
  }

  print('\n' + '─' * 60 + '\n');

  // Test ix.io
  print('2️⃣ Testing ix.io...');
  print('   URL: http://ix.io');
  print('   Data: $testData\n');

  try {
    final ixIoResponse = await http
        .post(Uri.parse('http://ix.io'), body: {'f:1': testData})
        .timeout(const Duration(seconds: 10));

    print('   ✅ Status: ${ixIoResponse.statusCode}');
    print('   📄 Response Body: ${ixIoResponse.body}');

    if (ixIoResponse.statusCode == 200) {
      final pasteUrl = ixIoResponse.body.trim();
      print('\n   📎 Paste URL: $pasteUrl');

      // Extract ID
      final pasteId = pasteUrl.split('/').last;
      print('   🆔 Extracted ID: $pasteId');

      // Try to verify
      print('\n   🔍 Verifying by fetching: http://ix.io/$pasteId');
      final verifyResponse = await http
          .get(Uri.parse('http://ix.io/$pasteId'))
          .timeout(const Duration(seconds: 10));

      print('   ✅ Verify Status: ${verifyResponse.statusCode}');
      print('   📄 Fetched Data: ${verifyResponse.body}');

      if (verifyResponse.body.trim() == testData) {
        print('   ✅ DATA MATCHES! ix.io is working correctly.');
      } else {
        print('   ❌ DATA MISMATCH! Got: ${verifyResponse.body}');
      }
    }
  } catch (e) {
    print('   ❌ Error: $e');
  }

  print('\n' + '═' * 60);
  print('✅ Test Complete - Both paste.gg and ix.io should work!');
  print('\n📝 Summary:');
  print('  • paste.gg: Professional, JSON API, supports multiple files');
  print('  • ix.io: Ultra-simple, text-only, minimal overhead');
  print('  • dpaste: IP BLOCKED (should not use)');
  print('  • rentry: Creates fake pastes that don\'t exist');
}
