import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/recommendations_config.dart';

/// Service for sharing furniture playlists via paste services
///
/// Handles:
/// - Uploading compressed furniture data to GitHub Gist
/// - Fallback to Hastebin if GitHub Gist fails
/// - Generating shareable URLs with paste IDs
class FurnitureShareService {
  /// Base URL for the furniture viewer page (can be customized for GitHub Pages)
  static const String viewerBaseUrl = 'https://mv3d.firsttaps.com/';

  /// Upload furniture data to GitHub Gist
  /// Returns a map with success status, URL, and service name
  Future<Map<String, dynamic>> uploadToGitHubGist(String content) async {
    try {
      print('📤 [SHARE] Trying GitHub Gist (authenticated)...');
      print('📤 [SHARE] Data size: ${content.length} bytes');

      // Check if token is configured
      final token = RecommendationsConfig.githubToken;
      if (token.isEmpty || token == 'your_github_token_here') {
        print('⚠️ [SHARE] GitHub token not configured, skipping...');
        return {
          'success': false,
          'error': 'GitHub token not configured',
          'service': 'GitHub Gist',
        };
      }

      final response = await http
          .post(
            Uri.parse('https://api.github.com/gists'),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github+json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'description': 'FirstTaps MV3D Furniture Share',
              'public': true,
              'files': {
                'furniture.txt': {'content': content},
              },
            }),
          )
          .timeout(const Duration(seconds: 20));

      print('📤 [SHARE] GitHub Gist response: ${response.statusCode}');

      if (response.statusCode == 201) {
        print('📤 [SHARE] Response body: ${response.body}');
        final data = jsonDecode(response.body);
        final gistId = data['id'] as String;
        final shareUrl = '$viewerBaseUrl?gist=$gistId';

        print('✅ [SHARE] GitHub Gist succeeded: $shareUrl');
        print('✅ [SHARE] Gist ID: $gistId');
        print('✅ [SHARE] Verify at: https://gist.github.com/$gistId');
        return {'success': true, 'url': shareUrl, 'service': 'GitHub Gist'};
      }

      print('⚠️ [SHARE] GitHub Gist failed: HTTP ${response.statusCode}');
      print('⚠️ [SHARE] Response body: ${response.body}');
      return {
        'success': false,
        'error': 'HTTP ${response.statusCode}: ${response.body}',
        'service': 'GitHub Gist',
      };
    } catch (e) {
      print('⚠️ [SHARE] GitHub Gist error: $e');
      return {
        'success': false,
        'error': e.toString(),
        'service': 'GitHub Gist',
      };
    }
  }

  /// Upload furniture data to Hastebin (simple, reliable backup)
  /// Returns a map with success status, URL, and service name
  Future<Map<String, dynamic>> uploadToHastebin(String content) async {
    try {
      print('📤 [SHARE] Trying Hastebin...');
      print('📤 [SHARE] Data size: ${content.length} bytes');

      final response = await http
          .post(
            Uri.parse('https://hastebin.com/documents'),
            headers: {'Content-Type': 'text/plain'},
            body: content,
          )
          .timeout(const Duration(seconds: 15));

      print('📤 [SHARE] Hastebin response: ${response.statusCode}');

      if (response.statusCode == 200) {
        print('📤 [SHARE] Response body: ${response.body}');
        final data = jsonDecode(response.body);
        final pasteKey = data['key'] as String;
        final shareUrl = '$viewerBaseUrl?hastebin=$pasteKey';

        print('✅ [SHARE] Hastebin succeeded: $shareUrl');
        print('✅ [SHARE] Paste key: $pasteKey');
        print('✅ [SHARE] Verify at: https://hastebin.com/raw/$pasteKey');
        return {'success': true, 'url': shareUrl, 'service': 'Hastebin'};
      }

      print('⚠️ [SHARE] Hastebin failed: HTTP ${response.statusCode}');
      print('⚠️ [SHARE] Response body: ${response.body}');
      return {
        'success': false,
        'error': 'HTTP ${response.statusCode}: ${response.body}',
        'service': 'Hastebin',
      };
    } catch (e) {
      print('⚠️ [SHARE] Hastebin error: $e');
      return {'success': false, 'error': e.toString(), 'service': 'Hastebin'};
    }
  }

  /// Upload furniture data with automatic fallback
  /// Tries GitHub Gist first, then Hastebin as backup
  /// Returns a map with the successful upload result
  Future<Map<String, dynamic>> uploadWithFallback(String content) async {
    print('📤 [SHARE] Starting upload with fallback...');
    print('📤 [SHARE] Data size: ${content.length} bytes');

    // Try GitHub Gist first
    final gistResult = await uploadToGitHubGist(content);

    if (gistResult['success'] == true && gistResult['url'] != null) {
      return gistResult;
    }

    // If GitHub Gist failed, try Hastebin
    print('📤 [SHARE] GitHub Gist failed, trying Hastebin as fallback...');
    final hastebinResult = await uploadToHastebin(content);

    if (hastebinResult['success'] == true && hastebinResult['url'] != null) {
      return hastebinResult;
    }

    // Both failed
    final errors = [gistResult, hastebinResult]
        .where((r) => r['error'] != null)
        .map((r) => '${r["service"]}: ${r["error"]}')
        .join(', ');

    print('❌ [SHARE] All paste services failed: $errors');
    return {
      'success': false,
      'error': 'All paste services failed. $errors',
      'service': 'None',
    };
  }
}
