import 'dart:convert';
import 'package:http/http.dart' as http;

/// Test GitHub Gist API for furniture sharing
Future<void> main() async {
  print('🧪 Testing GitHub Gist API\n');

  // Test with a large furniture data payload (simulate 90KB)
  final testData =
      'TEST_FURNITURE_DATA_${'X' * 89800}_${DateTime.now().millisecondsSinceEpoch}';

  print('📤 Creating anonymous GitHub Gist...');
  print(
    '   Data size: ${testData.length} bytes (~${(testData.length / 1024).toStringAsFixed(1)}KB)',
  );
  print('   URL: https://api.github.com/gists\n');

  try {
    final response = await http
        .post(
          Uri.parse('https://api.github.com/gists'),
          headers: {
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'description': 'FirstTaps MV3D Furniture Share Test',
            'public': false, // Unlisted gist
            'files': {
              'furniture_data.txt': {'content': testData},
            },
          }),
        )
        .timeout(const Duration(seconds: 20));

    print('✅ Status: ${response.statusCode}');

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = jsonDecode(response.body);
      final gistId = data['id'] as String;
      final gistUrl = data['html_url'] as String;

      print('\n📎 Gist created successfully!');
      print('   Gist ID: $gistId');
      print('   View URL: $gistUrl');
      print('   API URL: https://api.github.com/gists/$gistId');

      // Verify we can fetch it back
      print('\n🔍 Verifying by fetching...');
      final verifyResponse = await http
          .get(
            Uri.parse('https://api.github.com/gists/$gistId'),
            headers: {'Accept': 'application/vnd.github+json'},
          )
          .timeout(const Duration(seconds: 15));

      print('✅ Verify Status: ${verifyResponse.statusCode}');

      if (verifyResponse.statusCode == 200) {
        final fetchData = jsonDecode(verifyResponse.body);
        final files = fetchData['files'] as Map<String, dynamic>;
        final firstFile = files.values.first as Map<String, dynamic>;
        final content = firstFile['content'] as String;

        print('📄 Fetched Data Length: ${content.length} bytes');

        if (content.trim() == testData) {
          print('\n✅ SUCCESS! GitHub Gist works perfectly for large files!');
          print('   ✓ Data uploaded: ${testData.length} bytes');
          print('   ✓ Data retrieved: ${content.length} bytes');
          print('   ✓ Data matches: TRUE');
          print('\n📊 Rate Limits:');
          print('   Anonymous: 60 requests/hour');
          print('   With token: 5000 requests/hour');
          print('\n🎉 GitHub Gist is ready for furniture sharing!');
        } else {
          print('\n❌ DATA MISMATCH!');
          print('   Expected length: ${testData.length}');
          print('   Got length: ${content.length}');
        }
      }
    } else {
      print('\n❌ Failed to create gist');
      print('Response body: ${response.body}');
    }
  } catch (e) {
    print('❌ Error: $e');
  }
}
