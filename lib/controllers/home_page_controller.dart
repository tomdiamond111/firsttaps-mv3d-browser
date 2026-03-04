/// Browser stub for HomePageController
/// In mobile app, this manages state for the home page
/// For browser, music search is handled differently

import 'package:flutter/material.dart';
import '../models/music_search_result.dart';

class HomePageController {
  // Browser version: Minimal stub for compatibility
  // Music search screen will handle its own navigation

  Future<void> createLinkFromMusicSearchResult(
    BuildContext context,
    MusicSearchResult result,
  ) async {
    // Stub for browser version
    // In browser, we could navigate to world view and send postMessage
    // For now, just show a snackbar
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Link creation: ${result.title} - ${result.url}'),
        duration: const Duration(seconds: 2),
      ),
    );
    // TODO: Implement proper link creation for browser version
    // This would involve navigating to world_view_screen and using postMessage
  }
}
