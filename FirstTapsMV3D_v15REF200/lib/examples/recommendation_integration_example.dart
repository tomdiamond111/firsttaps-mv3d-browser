// EXAMPLE: How to integrate recommendations into home_page_controller.dart
//
// This shows how to enable trending content recommendations in your app.
// Copy the relevant parts into your actual home_page_controller.dart

import 'package:firsttaps_mv3d/helpers/demo_content_with_recommendations_helper.dart';
import 'dart:developer' as developer;

class ExampleHomePageControllerIntegration {
  // STEP 1: Add this method to your HomePageController class
  /// Register demo content with recommendations (trending YouTube/Spotify content)
  /// Falls back to local demo files if recommendations are unavailable
  Future<void> _registerDemoContentWithRecommendations() async {
    print(
      '🎵 [RECOMMENDATIONS] Registering demo content with recommendations...',
    );

    try {
      // Check if recommendations are enabled (API keys configured)
      final recsEnabled =
          DemoContentWithRecommendationsHelper.areRecommendationsEnabled;
      print('🎵 [RECOMMENDATIONS] Enabled: $recsEnabled');

      developer.log(
        '🎵 Loading demo content (recommendations: $recsEnabled)...',
        name: 'HomePageController',
      );

      // Register demo content with recommendations
      // If useRecommendations=true and API keys set: Uses trending content
      // Otherwise: Falls back to local demo files
      await DemoContentWithRecommendationsHelper.registerRecommendedDemoContent(
        _stateManager, // Your StateManagerService instance
        useRecommendations: true, // Set to false to force local files only
        skipIfRegistered: true, // Skip if demo files already in memory
      );

      print(
        '🎵 [RECOMMENDATIONS] After registration, file count: ${_stateManager.files.length}',
      );

      // Notify listeners of changes
      notifyListeners();

      developer.log(
        '🎵 Demo content loaded successfully',
        name: 'HomePageController',
      );
      print('🎵 [RECOMMENDATIONS] Demo content registration complete');
    } catch (e) {
      print('❌ [RECOMMENDATIONS] Exception: $e');
      developer.log(
        '❌ Error loading demo content with recommendations: $e',
        name: 'HomePageController',
        error: e,
      );
    }
  }

  // STEP 2: Call this method from your existing initialization code
  //
  // Example places to call it:
  // - In your constructor or init() method
  // - In initState() of a StatefulWidget
  // - After loading persisted files
  // - On first app launch
  //
  // Example:
  /*
  @override
  void initState() {
    super.initState();
    _loadPersistedFiles();
    _registerDemoContentWithRecommendations(); // Add this line
  }
  */

  // STEP 3 (OPTIONAL): Track when users play/open content
  //
  // Add this wherever users click/play a furniture item:
  Future<void> _onFurnitureItemPlayed(FileModel file) async {
    // Your existing play logic here...

    // If this is a recommendation (streaming URL), track the interaction
    if (file.metadata?['recommendation'] == true) {
      final platform = file.metadata?['platform'] as String? ?? 'youtube';

      await DemoContentWithRecommendationsHelper.recordLinkOpen(
        url: file.path, // The streaming URL
        title: file.name, // The content title
        platform: platform, // 'youtube' or 'spotify'
      );

      print('📊 Tracked link open: ${file.name}');
    }
  }

  // STEP 4 (OPTIONAL): Add preferences UI to your settings screen
  //
  // In your settings/menu screen widget:
  /*
  import 'package:firsttaps_mv3d/screens/recommendation_preferences_screen.dart';
  
  ListTile(
    leading: Icon(Icons.tune),
    title: Text('Content Preferences'),
    subtitle: Text('Customize recommendations'),
    onTap: () {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => RecommendationPreferencesScreen(),
        ),
      );
    },
  )
  */

  // STEP 5 (OPTIONAL): Manual testing in debug mode
  //
  // Add this method for testing:
  Future<void> _testRecommendations() async {
    try {
      print('🧪 Testing recommendations system...');

      // Check if enabled
      final enabled =
          DemoContentWithRecommendationsHelper.areRecommendationsEnabled;
      print('Enabled: $enabled');

      // Fetch content
      final content =
          await DemoContentWithRecommendationsHelper.fetchRecommendedContent();
      print('Fetched ${content.length} categories:');

      for (final entry in content.entries) {
        print('  ${entry.key}: ${entry.value.length} files');
      }

      print('✅ Recommendations test complete');
    } catch (e) {
      print('❌ Test failed: $e');
    }
  }

  // ============================================================================
  // COMPLETE EXAMPLE: Minimal integration
  // ============================================================================

  /*
  // In your HomePageController:
  
  import 'package:firsttaps_mv3d/helpers/demo_content_with_recommendations_helper.dart';
  
  class HomePageController {
    final StateManagerService _stateManager;
    
    Future<void> init() async {
      // Load persisted files first
      await _loadPersistedFiles();
      
      // Register demo content with recommendations
      await _registerDemoContentWithRecommendations();
      
      // Rest of initialization...
    }
    
    Future<void> _registerDemoContentWithRecommendations() async {
      await DemoContentWithRecommendationsHelper.registerRecommendedDemoContent(
        _stateManager,
        useRecommendations: true,
        skipIfRegistered: true,
      );
      notifyListeners();
    }
  }
  */
}
