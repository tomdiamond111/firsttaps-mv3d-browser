import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;

/// Test script to verify Vimeo category API connectivity
/// Run with: dart test_vimeo_api.dart
void main() async {
  print('🎬 Testing Vimeo Category API Connection...\n');

  const accessToken = '0fa39fb74f07bfe8453358466360d387';
  const apiBaseUrl = 'https://api.vimeo.com';
  const musicCategory = 'music';
  const maxResults = 10;

  print('📝 Configuration:');
  print('   API Base URL: $apiBaseUrl');
  print('   Category: $musicCategory');
  print('   Max Results: $maxResults');
  print('   Token: ${accessToken.substring(0, 10)}...\n');

  try {
    final url = Uri.parse(
      '$apiBaseUrl/categories/$musicCategory/videos?'
      'sort=plays&'
      'per_page=$maxResults',
    );

    print('🌐 Request URL: $url\n');
    print('⏱️  Making request with 15-second timeout...\n');

    final startTime = DateTime.now();

    final response = await http
        .get(
          url,
          headers: {
            'Authorization': 'Bearer $accessToken',
            'Accept': 'application/vnd.vimeo.*+json;version=3.4',
          },
        )
        .timeout(
          const Duration(seconds: 15),
          onTimeout: () {
            print('❌ REQUEST TIMED OUT after 15 seconds');
            print('   This suggests the endpoint is too slow or unavailable');
            throw TimeoutException('Request timed out');
          },
        );

    final duration = DateTime.now().difference(startTime);
    print('✅ Response received in ${duration.inMilliseconds}ms\n');

    print('📊 Response Details:');
    print('   Status Code: ${response.statusCode}');
    print('   Content Length: ${response.body.length} bytes');
    print('   Headers: ${response.headers}\n');

    if (response.statusCode == 200) {
      print('✅ SUCCESS! API is working\n');

      final data = json.decode(response.body);
      final videos = data['data'] as List?;

      if (videos != null && videos.isNotEmpty) {
        print('📹 Found ${videos.length} videos:');
        for (var i = 0; i < videos.length && i < 3; i++) {
          final video = videos[i];
          print('   ${i + 1}. ${video['name']}');
          print('      URL: ${video['link']}');
          print('      Duration: ${video['duration']}s');
          print('      Created: ${video['created_time']}\n');
        }

        print('✅ Vimeo category API is fully functional!');
        print('   You can safely re-enable it in recommendations_config.dart');
      } else {
        print('⚠️  API returned success but no videos found');
        print('   This might be a permissions or category issue');
      }
    } else if (response.statusCode == 401) {
      print('❌ AUTHENTICATION FAILED (401)');
      print('   The access token may be invalid or expired');
      print('   Response: ${response.body}');
    } else if (response.statusCode == 403) {
      print('❌ PERMISSION DENIED (403)');
      print('   The token lacks permissions for category browsing');
      print('   Response: ${response.body}');
    } else if (response.statusCode == 404) {
      print('❌ NOT FOUND (404)');
      print('   The endpoint or category may not exist');
      print('   Response: ${response.body}');
    } else if (response.statusCode == 429) {
      print('❌ RATE LIMITED (429)');
      print('   Too many requests - API quota exceeded');
      print('   Response: ${response.body}');
    } else if (response.statusCode == 500 ||
        response.statusCode == 502 ||
        response.statusCode == 503 ||
        response.statusCode == 504) {
      print('❌ SERVER ERROR (${response.statusCode})');
      print('   Vimeo\'s servers are having issues');
      print('   This is temporary - try again later');
      print('   Response: ${response.body}');
    } else {
      print('❌ UNEXPECTED STATUS CODE: ${response.statusCode}');
      print('   Response: ${response.body}');
    }
  } on TimeoutException catch (e) {
    print('\n💥 CONNECTION TIMEOUT');
    print('   The API is too slow or unreachable');
    print('   Recommendation: Use manual curation instead');
  } catch (e, stackTrace) {
    print('\n💥 ERROR: $e');
    print('   Stack trace: $stackTrace');
  }

  print('\n' + '=' * 60);
  print('Test complete!');
  print('=' * 60);
}
