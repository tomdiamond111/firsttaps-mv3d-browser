/// YouTube API Diagnostic Tool
/// Run this to test your YouTube API key and diagnose 403 errors
///
/// Usage: dart youtube_api_test.dart

import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

// ⚠️ Replace with your API key
const String apiKey = 'AIzaSyCCG_qmLjFhFbQ2YysRaFJF-g27qrd_qG8';
const String testQuery = 'music';

void main() async {
  print('🔍 YouTube Data API v3 Diagnostic Tool');
  print('=' * 60);
  print('API Key: ${apiKey.substring(0, 10)}...');
  print('Test Query: "$testQuery"');
  print('=' * 60);
  print('');

  try {
    // Build test request
    final uri = Uri.parse('https://www.googleapis.com/youtube/v3/search')
        .replace(
          queryParameters: {
            'part': 'snippet',
            'q': testQuery,
            'type': 'video',
            'maxResults': '5',
            'key': apiKey,
            'videoCategoryId': '10',
            'order': 'relevance',
          },
        );

    print('📡 Making API request...');
    print('URL: ${uri.toString().replaceAll(apiKey, 'HIDDEN_KEY')}');
    print('');

    final response = await http.get(uri);

    print('📊 Response Status: ${response.statusCode}');
    print('');

    if (response.statusCode == 200) {
      // Success!
      print('✅ SUCCESS! YouTube API is working correctly.');
      print('');

      final data = jsonDecode(response.body);
      final items = data['items'] as List<dynamic>? ?? [];

      print('Found ${items.length} results:');
      for (var i = 0; i < items.length && i < 3; i++) {
        final item = items[i];
        final snippet = item['snippet'];
        print('  ${i + 1}. ${snippet['title']}');
      }
      print('');
      print('🎉 Your API key is configured correctly!');
    } else {
      // Error occurred
      print('❌ ERROR: Request failed with status ${response.statusCode}');
      print('');

      try {
        final errorData = jsonDecode(response.body);
        final error = errorData['error'];

        if (error != null) {
          print('Error Message: ${error['message']}');
          print('');

          final errors = error['errors'] as List<dynamic>? ?? [];
          if (errors.isNotEmpty) {
            print('Error Details:');
            for (var err in errors) {
              print('  - Reason: ${err['reason']}');
              print('    Domain: ${err['domain']}');
              print('    Message: ${err['message']}');
            }
            print('');
          }
        }
      } catch (e) {
        print('Raw response: ${response.body}');
        print('');
      }

      // Provide specific troubleshooting
      print('🔧 TROUBLESHOOTING:');
      print('');

      if (response.statusCode == 403) {
        print('403 Forbidden - Common causes:');
        print('');
        print('1. YouTube Data API v3 is NOT ENABLED');
        print(
          '   → Visit: https://console.cloud.google.com/apis/library/youtube.googleapis.com',
        );
        print('   → Click "ENABLE" button');
        print('');
        print('2. Invalid or Restricted API Key');
        print('   → Visit: https://console.cloud.google.com/apis/credentials');
        print('   → Check your API key restrictions');
        print('   → Ensure "YouTube Data API v3" is allowed');
        print('');
        print('3. API Key Restrictions');
        print(
          '   → Check "Application restrictions" (None, HTTP referrers, IP addresses, etc.)',
        );
        print(
          '   → Check "API restrictions" - must include YouTube Data API v3',
        );
        print('');
        print('4. Quota Exceeded');
        print(
          '   → Visit: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas',
        );
        print('   → Check if daily quota (10,000 units) is exceeded');
      } else if (response.statusCode == 400) {
        print('400 Bad Request - Invalid parameters');
        print('   → Check API key format');
        print('   → Verify request parameters');
      } else if (response.statusCode == 401) {
        print('401 Unauthorized - Authentication failed');
        print('   → API key may be invalid or deleted');
        print('   → Generate a new key in Google Cloud Console');
      }

      print('');
      print('📚 Documentation:');
      print(
        '   → API Overview: https://developers.google.com/youtube/v3/getting-started',
      );
      print(
        '   → API Console: https://console.cloud.google.com/apis/dashboard',
      );
      print(
        '   → Credentials: https://console.cloud.google.com/apis/credentials',
      );

      exit(1);
    }
  } catch (e, stackTrace) {
    print('💥 EXCEPTION OCCURRED:');
    print(e);
    print('');
    print('Stack trace:');
    print(stackTrace);
    exit(1);
  }
}
