import 'package:flutter/material.dart';
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;
import 'dart:js' as js;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'music_search_screen.dart';
import '../widgets/options_menu_widget.dart';
import '../widgets/add_content_menu_widget.dart';
import '../widgets/welcome_instructions_dialog.dart';
import '../widgets/music_preferences_dialog.dart';
import '../utils/three_js_utils.dart';
import '../helpers/demo_content_with_recommendations_helper.dart';
import '../services/remote_config_service.dart';
import '../services/recommendation_service.dart';

/// Three.js World View Screen for Browser
/// Uses iframe to host Three.js environment with HTML-based UI
/// All buttons and UI are now handled inside the iframe
class WorldViewScreen extends StatefulWidget {
  const WorldViewScreen({super.key});

  @override
  State<WorldViewScreen> createState() => _WorldViewScreenState();
}

class _WorldViewScreenState extends State<WorldViewScreen> {
  static const String _viewId = 'threejs-iframe-view';
  bool _isLoaded = false;
  html.IFrameElement? _iframeElement;

  // UI state variables
  int _navigationMode = 0; // 0=default, 1=easynav, 2=explore
  bool _isSearchActive = false;
  bool _searchInPlatforms = false;
  final TextEditingController _searchController = TextEditingController();
  int _currentLevel = 1;
  int _currentScore = 0;
  String _currentWorldType = 'green-plane';

  // Options menu state variables
  bool _sortFileObjects = false;
  bool _showFileInfo = false;
  bool _useFaceTextures = false;
  bool _hasDeletedObjects = false;
  bool _hasRecentMoves = false;
  bool _canUndoObjectDeletion = false;

  // World ready state
  bool _isWorldReady = false;

  @override
  void initState() {
    super.initState();
    _registerIframe();
    _setupMessageListener();
    _preloadRemoteConfig(); // Preload recommendation content URLs from GitHub Pages
  }

  /// Preload remote config in background
  /// Fetches content URLs from GitHub Pages and caches for 24 hours
  /// Non-blocking - runs asynchronously
  void _preloadRemoteConfig() {
    print('🔵 Preloading remote config...');
    RemoteConfigService.getConfig()
        .then((config) {
          print('✅ Remote config preloaded: version ${config['version']}');
          print('   Source: ${config['source'] ?? 'remote'}');
        })
        .catchError((error) {
          print('⚠️ Remote config preload failed (will use fallback): $error');
        });
  }

  /// Show a dialog with iframe pointer events disabled
  /// This allows mouse interaction with dialogs shown over the iframe
  Future<T?> _showDialogWithIframeDisabled<T>(
    Widget Function(BuildContext) builder, {
    bool barrierDismissible = true,
  }) async {
    // Disable pointer events on iframe
    _iframeElement?.style.pointerEvents = 'none';

    try {
      return await showDialog<T>(
        context: context,
        barrierDismissible: barrierDismissible,
        builder: builder,
      );
    } finally {
      // Re-enable pointer events on iframe
      _iframeElement?.style.pointerEvents = 'auto';
    }
  }

  /// Register the iframe element for Flutter web
  void _registerIframe() {
    // Create iframe element
    _iframeElement = html.IFrameElement()
      ..src = 'assets/web/index2.html'
      ..style.border = 'none'
      ..style.width = '100%'
      ..style.height = '100%'
      // DO NOT set pointer-events to none - it blocks all canvas interaction
      ..allowFullscreen = true;

    // Register view factory
    ui_web.platformViewRegistry.registerViewFactory(
      _viewId,
      (int viewId) => _iframeElement!,
    );

    // Listen for iframe load
    _iframeElement!.onLoad.listen((_) {
      print('✅ Three.js iframe loaded successfully');
      setState(() {
        _isLoaded = true;
      });

      // Initialize Three.js world after iframe is ready
      Future.delayed(const Duration(milliseconds: 500), () {
        _initializeThreeJsWorld();
      });
    });
  }

  /// Setup message listener for JavaScript communication
  void _setupMessageListener() {
    html.window.onMessage.listen((event) {
      print('📬 Raw message received: ${event.data}');
      final data = event.data;

      // Check if it's from our iframe
      if (data is Map && data['source'] == 'threejs-iframe') {
        print('✅ Message from iframe - type: ${data['type']}');
        _handleJavaScriptMessage(data);
      } else {
        print(
          '⚠️ Ignoring message from: ${data is Map ? data['source'] : 'unknown'}',
        );
      }
    });
  }

  /// Handle messages from JavaScript
  void _handleJavaScriptMessage(Map<dynamic, dynamic> data) {
    final type = data['type'] as String?;
    print('📨 Received message from JS: $type');

    switch (type) {
      case 'worldReady':
        print('🌍 Three.js world is ready');
        _onWorldReady();
        break;
      case 'objectClicked':
        _onObjectClicked(data);
        break;
      case 'objectMoved':
        _onObjectMoved(data);
        break;
      case 'objectDeleted':
        _onObjectDeleted(data);
        break;
      case 'furnitureCreated':
        _onFurnitureCreated(data);
        break;
      case 'linkOpened':
        _onLinkOpened(data);
        break;
      case 'contentFeedback':
        _onContentFeedback(data);
        break;
      case 'refreshRecommendations':
        _refreshRecommendations(forceRefresh: true);
        break;
      // UI Button events from HTML
      case 'optionsMenu':
        _showOptionsMenu();
        break;
      case 'exploreMode':
        _toggleExploreMode(data['enabled'] as bool? ?? false);
        break;
      case 'showListView':
        _navigateToListView();
        break;
      case 'showSearch':
        _navigateToSearch();
        break;
      case 'showFurnitureSelector':
        _showFurnitureSelector();
        break;
      case 'showWorldSelector':
        _showWorldSelector();
        break;
      case 'showScoreboard':
        _showScoreboard();
        break;
      case 'resetHomeView':
        _resetHomeView();
        break;
      default:
        print('⚠️ Unknown message type: $type');
    }
  }

  /// Send message to JavaScript in iframe
  void _sendToJavaScript(Map<String, dynamic> message) {
    if (_iframeElement?.contentWindow != null) {
      // Add source identifier so browserBridge knows it's from Flutter
      final messageWithSource = {'source': 'flutter', ...message};
      _iframeElement!.contentWindow!.postMessage(
        messageWithSource,
        html.window.origin!,
      );
      print('📤 Sent to iframe: ${message['type']}');
    } else {
      print('⚠️ Cannot send message - iframe not ready');
    }
  }

  /// Initialize Three.js world after iframe loads
  Future<void> _initializeThreeJsWorld() async {
    print('🎬 Initializing Three.js world...');

    // Send initialization message
    _sendToJavaScript({
      'type': 'initialize',
      'world': 'standard', // Default world
      'config': {
        'enableLighting': true,
        'enableShadows': false,
        'cameraPosition': {'x': 0, 'y': 50, 'z': 200},
      },
    });

    // TODO: Load saved furniture from storage
    // TODO: Create default furniture if first time
  }

  /// Handle world ready callback
  void _onWorldReady() {
    print('✅ World initialization complete');

    setState(() {
      _isWorldReady = true;
    });

    // JavaScript bundle handles loading screen - no Flutter overlay needed
    // The bundle's loading screen (black with rotating messages) will hide automatically

    // Load saved world preference and apply it
    _loadAndApplySavedWorld();

    // Schedule demo content creation after a delay to ensure everything is loaded
    Future.delayed(const Duration(seconds: 2), _initializeDemoContent);

    // Check and show welcome instructions and music preferences on first launch
    _checkAndShowWelcomeInstructions();
  }

  /// Load and apply saved world preference
  Future<void> _loadAndApplySavedWorld() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedWorld = prefs.getString('currentWorldType');

      if (savedWorld != null && savedWorld.isNotEmpty) {
        print('💾 Loading saved world preference: $savedWorld');

        // Wait a moment for the world to fully initialize
        await Future.delayed(const Duration(milliseconds: 1000));

        // Apply the saved world if it's different from default
        if (savedWorld != 'green-plane' && savedWorld != _currentWorldType) {
          setState(() {
            _currentWorldType = savedWorld;
          });

          // Switch to the saved world
          _sendToJavaScript({'type': 'switchWorld', 'worldType': savedWorld});
          print('✅ Restored world to: $savedWorld');
        } else {
          print('ℹ️ Already on default world: $savedWorld');
        }
      } else {
        print(
          'ℹ️ No saved world preference found, using default (green-plane)',
        );
      }
    } catch (e) {
      print('⚠️ Failed to load saved world preference: $e');
    }
  }

  /// Initialize demo furniture and recommendations for first-time users
  Future<void> _initializeDemoContent() async {
    print('🎬 Initializing demo content with recommendations...');

    try {
      // Wait for world to be ready
      if (!_isWorldReady) {
        print('⏳ World not ready yet, waiting...');
        await Future.delayed(const Duration(milliseconds: 500));
        if (!_isWorldReady) {
          print('❌ World still not ready, aborting demo creation');
          return;
        }
      }

      // Send message to iframe to check if user already has furniture
      print('🪑 Checking for existing furniture...');

      // Send message to trigger demo content creation in the iframe
      _sendToJavaScript({
        'type': 'createDemoContent',
        'config': {'checkExisting': true, 'forceCreate': false},
      });

      print('✅ Demo content creation request sent to iframe');
    } catch (e, stackTrace) {
      print('⚠️ Demo content initialization error: $e');
      print('Stack trace: $stackTrace');
    }
  }

  /// Refresh recommendations and re-inject into JavaScript
  /// Called when user updates music preferences or manually refreshes content
  Future<void> _refreshRecommendations({bool forceRefresh = true}) async {
    print('🔄 Refreshing recommendations...');

    try {
      // Send message to iframe to refresh content
      _sendToJavaScript({
        'type': 'refreshRecommendations',
        'forceRefresh': forceRefresh,
      });

      print('✅ Recommendations refresh requested');
    } catch (e, stackTrace) {
      print('⚠️ Refresh recommendations error: $e');
      print('Stack trace: $stackTrace');
    }
  }

  /// Check and show welcome instructions and music preferences on first launch
  /// Waits for 3D world to be ready, then shows instructions after 3-second buffer
  Future<void> _checkAndShowWelcomeInstructions() async {
    // Wait for world to be ready
    while (!_isWorldReady && mounted) {
      await Future.delayed(const Duration(milliseconds: 500));
    }

    // Add 3-second buffer after world is ready to let final animations settle
    await Future.delayed(const Duration(seconds: 3));

    if (!mounted) return;

    final shouldShowWelcome = await WelcomeInstructionsDialog.shouldShow();
    final prefs = await SharedPreferences.getInstance();
    const musicPrefsShownKey = 'music_prefs_first_shown';
    final musicPrefsShown = prefs.getBool(musicPrefsShownKey) ?? false;

    print('🔍 [WorldViewScreen] First launch check:');
    print('   shouldShowWelcome: $shouldShowWelcome');
    print('   musicPrefsShown: $musicPrefsShown');

    // Show welcome dialog first if needed
    if (shouldShowWelcome && mounted) {
      print('📖 [WorldViewScreen] Showing welcome instructions dialog...');
      try {
        await WelcomeInstructionsDialog.show(context);
        print('✅ [WorldViewScreen] Welcome instructions dialog closed');
      } catch (e) {
        print('❌ [WorldViewScreen] Error showing welcome dialog: $e');
      }
    }

    // Show music preferences dialog after welcome (if not shown before)
    if (mounted && !musicPrefsShown) {
      print(
        '🎵 [WorldViewScreen] Preparing to show music preferences dialog...',
      );

      // Wait a bit after welcome dialog
      await Future.delayed(const Duration(milliseconds: 800));

      if (!mounted) {
        print('❌ [WorldViewScreen] Widget no longer mounted');
        return;
      }

      print('🎵 [WorldViewScreen] Showing music preferences dialog NOW...');
      try {
        await MusicPreferencesDialog.show(context);
        print('✅ [WorldViewScreen] Music preferences dialog closed');

        // Mark as shown AFTER dialog is dismissed
        await prefs.setBool(musicPrefsShownKey, true);
        print('✅ [WorldViewScreen] Music preferences marked as shown');

        // Ensure at least one genre is selected
        final selectedGenres =
            await MusicPreferencesDialog.loadSelectedGenres();
        if (selectedGenres.isEmpty) {
          print(
            '⚠️ [WorldViewScreen] No genres selected, selecting all by default',
          );
          final allGenres = MusicPreferencesDialog.availableGenres
              .map((g) => g.id)
              .toList();
          await MusicPreferencesDialog.saveSelectedGenres(allGenres);
          print('✅ [WorldViewScreen] All genres selected as default');
        } else {
          print(
            '✅ [WorldViewScreen] User selected ${selectedGenres.length} genres',
          );
        }

        // Send genre preferences to iframe
        print('🔄 [FIRST INSTALL] Sending genre preferences to iframe...');
        await Future.delayed(const Duration(milliseconds: 1500));

        try {
          // Send genre preferences via message passing
          _sendToJavaScript({
            'type': 'setGenrePreferences',
            'genres': selectedGenres,
          });

          // Fetch fresh recommendations from Dart side
          await _refreshRecommendations(forceRefresh: true);
        } catch (e) {
          print('⚠️ [FIRST INSTALL] Failed to send genre preferences: $e');
        }
      } catch (e) {
        print('❌ [WorldViewScreen] Error showing music preferences dialog: $e');
      }
    }
  }

  /// Handle object click
  void _onObjectClicked(Map<dynamic, dynamic> data) {
    final objectId = data['objectId'] as String?;
    final objectType = data['objectType'] as String?;
    final isOnFurniture = data['isOnFurniture'] as bool? ?? false;

    print(
      '🖱️ Object clicked: $objectId (type: $objectType, onFurniture: $isOnFurniture)',
    );

    // If it's a link object on furniture, trigger media preview
    if (objectType == 'link' || objectType == 'file') {
      _sendToJavaScript({'type': 'openMediaPreview', 'objectId': objectId});
    }
  }

  /// Handle object moved
  void _onObjectMoved(Map<dynamic, dynamic> data) {
    final objectId = data['objectId'] as String?;
    final position = data['position'] as Map?;
    print('📍 Object moved: $objectId to $position');
    // TODO: Save position to storage
  }

  /// Handle object deleted
  void _onObjectDeleted(Map<dynamic, dynamic> data) {
    final objectId = data['objectId'] as String?;
    print('🗑️ Object deleted: $objectId');
    // TODO: Remove from storage
  }

  /// Handle furniture created
  void _onFurnitureCreated(Map<dynamic, dynamic> data) {
    final furnitureId = data['furnitureId'] as String?;
    final furnitureType = data['furnitureType'] as String?;
    print('🪑 Furniture created: $furnitureType ($furnitureId)');
    // TODO: Save to storage
  }

  /// Handle link opened (when user plays content)
  /// Records the interaction for recommendations algorithm
  void _onLinkOpened(Map<dynamic, dynamic> data) async {
    final url = data['url'] as String?;
    final title = data['title'] as String?;
    final platform = data['platform'] as String?;

    if (url == null || title == null || platform == null) {
      print('⚠️ Link opened event missing data');
      return;
    }

    print('🎵 Link opened: $title ($platform)');

    // Record the interaction for favorites algorithm
    DemoContentWithRecommendationsHelper.recordLinkOpen(
          url: url,
          title: title,
          platform: platform,
        )
        .then((_) {
          print('✅ Link interaction recorded');
        })
        .catchError((e) {
          print('⚠️ Failed to record link interaction: $e');
        });

    // Actually open the URL in a new browser tab
    await _openUrlInBrowser(url, title, platform);
  }

  /// Open URL in new browser tab
  Future<void> _openUrlInBrowser(
    String url,
    String title,
    String platform,
  ) async {
    try {
      print('🌐 Opening URL: $url');

      final uri = Uri.parse(url);

      // Try to launch URL
      if (await canLaunchUrl(uri)) {
        // Use platformDefault mode for browser - opens in new tab
        final success = await launchUrl(uri, mode: LaunchMode.platformDefault);

        if (success) {
          print('✅ Successfully opened: $url');

          // Show success feedback
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Opening $title...'),
                duration: const Duration(seconds: 2),
                backgroundColor: Colors.green,
              ),
            );
          }
        } else {
          throw Exception('Failed to launch URL');
        }
      } else {
        throw Exception('Cannot launch URL: $url');
      }
    } catch (e) {
      print('❌ Error opening URL: $e');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to open link: $url'),
            duration: const Duration(seconds: 3),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Handle content feedback (likes/dislikes) from JavaScript
  void _onContentFeedback(Map<dynamic, dynamic> data) {
    final url = data['url'] as String?;
    final sentiment = data['sentiment'] as String?;
    final title = data['title'] as String?;
    final platform = data['platform'] as String?;

    if (url == null || sentiment == null) {
      print('⚠️ Content feedback event missing data');
      return;
    }

    print('👍👎 Content feedback: $sentiment for $title ($platform)');

    // Record dislike with metadata for pattern learning
    if (sentiment == 'disliked') {
      recommendationService
          .recordDislikeWithMetadata(url, title ?? '')
          .then((_) {
            print('✅ Dislike recorded with metadata for pattern learning');
          })
          .catchError((e) {
            print('⚠️ Failed to record dislike: $e');
          });
    }

    // TODO: Also record likes if needed for positive feedback
  }

  /// Create furniture via JavaScript
  void _createFurniture(String furnitureType) {
    print('🪑 Creating furniture: $furnitureType');

    _sendToJavaScript({
      'type': 'createFurniture',
      'furnitureType': furnitureType,
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Creating $furnitureType...'),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  /// Add URL object to world
  void _addUrlObject(String url) {
    print('🔗 Adding URL to world: $url');

    _sendToJavaScript({'type': 'addLink', 'url': url});

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Adding link: $url'),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Three.js iframe (fullscreen - HTML buttons handle UI)
          HtmlElementView(viewType: _viewId),

          // No Flutter loading overlay - JavaScript bundle handles loading screen
          // (black screen with rotating messages and progress indicator)
        ],
      ),
    );
  }

  // Browser version: Buttons will be in HTML (iframe), not Flutter overlay
  // Flutter button methods kept for potential future use or reference

  /// Build mini floating action button (matches mobile style)
  Widget _buildMiniButton({
    required IconData icon,
    required VoidCallback onPressed,
  }) {
    return GestureDetector(
      onTap: () {
        print('🖱️ Button clicked: $icon');
        onPressed();
      },
      child: Material(
        color: Colors.black.withOpacity(0.7),
        borderRadius: BorderRadius.circular(12),
        elevation: 8,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.2)),
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      ),
    );
  }

  // Button actions
  void _showOptionsMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.grey[900],
      isScrollControlled: true, // Allow custom height control
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (BuildContext context) {
        return OptionsMenuWidget(
          hasDeletedObjects: _hasDeletedObjects,
          hasRecentMoves: _hasRecentMoves,
          sortFileObjects: _sortFileObjects,
          showFileInfo: _showFileInfo,
          useFaceTextures: _useFaceTextures,
          currentWorldType: _currentWorldType,
          canUndoObjectDeletion: _canUndoObjectDeletion,
          hasUndoObjectDeleteCallback:
              false, // Browser version doesn't have undo yet
          onUndoObjectDelete: () {
            print('Undo object delete');
          },
          onUndoRecentMove: () {
            print('Undo recent move');
          },
          onSortFileObjectsChanged: (value) {
            setState(() {
              _sortFileObjects = value;
            });
            _sendToJavaScript({'type': 'setSortFileObjects', 'enabled': value});
          },
          onShowFileInfoChanged: (value) {
            setState(() {
              _showFileInfo = value;
            });
            _sendToJavaScript({'type': 'setShowFileInfo', 'enabled': value});
          },
          onUseFaceTexturesChanged: (value) {
            setState(() {
              _useFaceTextures = value;
            });
            _sendToJavaScript({'type': 'setUseFaceTextures', 'enabled': value});
          },
          onShowWorldSwitchDialog: () => _showWorldSwitchDialog(),
          onShowUndoConfirmationDialog: () {
            print('Show undo confirmation dialog');
          },
          onShowAdvancedOptionsDialog: () {
            print('Show advanced options dialog');
          },
          onShowDeleteOptions: () {
            print('Show delete options');
          },
          onShowStackingCriteria: () {
            Navigator.pop(context);
            // TODO: Implement stacking criteria for browser version
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Stacking criteria coming soon for browser version',
                ),
                duration: Duration(seconds: 2),
              ),
            );
          },
          onShowPremiumStore: () {
            print('Show premium store');
          },
          onShareWithFriend: () {
            print('Share with friend');
          },
          onShow3DMessagingSettings: () {
            print('Show 3D messaging settings');
          },
          onShowCreatePath: () {
            print('Show create path dialog');
          },
          onShowCreateFurniture: () => _showFurnitureSelector(),
          onShowFurnitureManager: () => _navigateToListView(),
          onImportFurniture: () {
            print('Import furniture');
          },
          getWorldDisplayName: ThreeJsUtils.getWorldDisplayName,
        );
      },
    );
  }

  void _toggleExploreMode(bool enabled) {
    setState(() {
      _navigationMode = enabled ? 2 : 0; // 0=default, 2=explore
    });

    final modes = ['visibility', 'easynav', 'explore'];
    print('🚶 Explore mode: ${modes[_navigationMode]}');

    _sendToJavaScript({
      'type': 'setExploreMode',
      'mode': modes[_navigationMode],
    });
  }

  void _navigateToListView() {
    print('📋 Navigating to 2D list view...');
    _show2DListView();
  }

  void _navigateToSearch() {
    print('🔍 Navigating to search...');
    // Navigate to music search screen
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const MusicSearchScreen()),
    );
  }

  void _showFurnitureSelector() {
    print('➕ Showing Add Content menu...');
    _showDialogWithIframeDisabled(
      (BuildContext dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        alignment: Alignment.topRight,
        insetPadding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + 60,
          right: 10,
        ),
        child: AddContentMenuWidget(
          onSearchMusic: () {
            Navigator.pop(dialogContext);
            Future.delayed(const Duration(milliseconds: 100), () {
              _showSearchMusicVideos();
            });
          },
          onAddLink: () {
            Navigator.pop(dialogContext);
            Future.delayed(const Duration(milliseconds: 100), () {
              _showAddUrlDialog();
            });
          },
          onAddFurniture: () {
            Navigator.pop(dialogContext);
            Future.delayed(const Duration(milliseconds: 100), () {
              _showFurnitureTypeSelector();
            });
          },
          onOpenFurnitureManager: () {
            Navigator.pop(dialogContext);
            Future.delayed(const Duration(milliseconds: 100), () {
              _show2DListView();
            });
          },
        ),
      ),
      barrierDismissible: true,
    );
  }

  void _showWorldSelector() {
    print('🌍 Showing world selector...');
    _showWorldSwitchDialog();
  }

  void _show2DListView() {
    // TODO: Request furniture list from JavaScript and display
    _showDialogWithIframeDisabled(
      (BuildContext dialogContext) => AlertDialog(
        backgroundColor: Colors.grey[900],
        title: const Text(
          'Furniture Manager',
          style: TextStyle(color: Colors.white),
        ),
        content: SizedBox(
          width: 600,
          height: 500,
          child: Column(
            children: [
              const Text(
                '2D List View - Furniture Browser',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'This screen will show all your furniture pieces and their contents in a list format.',
                style: TextStyle(color: Colors.grey[400], fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              Expanded(
                child: ListView(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.weekend, color: Colors.blue),
                      title: const Text(
                        'Gallery Wall',
                        style: TextStyle(color: Colors.white),
                      ),
                      subtitle: Text(
                        '10 items',
                        style: TextStyle(color: Colors.grey[400]),
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.edit, color: Colors.blue),
                        onPressed: () => print('Edit gallery'),
                      ),
                    ),
                    ListTile(
                      leading: const Icon(Icons.bookmarks, color: Colors.green),
                      title: const Text(
                        'Bookshelf',
                        style: TextStyle(color: Colors.white),
                      ),
                      subtitle: Text(
                        '10 items',
                        style: TextStyle(color: Colors.grey[400]),
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.edit, color: Colors.blue),
                        onPressed: () => print('Edit bookshelf'),
                      ),
                    ),
                    ListTile(
                      leading: const Icon(
                        Icons.view_in_ar,
                        color: Colors.purple,
                      ),
                      title: const Text(
                        'Stage',
                        style: TextStyle(color: Colors.white),
                      ),
                      subtitle: Text(
                        '30 items',
                        style: TextStyle(color: Colors.grey[400]),
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.edit, color: Colors.blue),
                        onPressed: () => print('Edit stage'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              print('Furniture Manager close button pressed');
              Navigator.of(dialogContext).pop();
            },
            child: const Text('Close', style: TextStyle(color: Colors.blue)),
          ),
        ],
      ),
    );
  }

  void _toggleSearch() {
    setState(() {
      _isSearchActive = !_isSearchActive;
      if (!_isSearchActive) {
        _searchController.clear();
      }
    });
  }

  void _showScoreboard() {
    print('🎮 Opening scoreboard...');
    _sendToJavaScript({'type': 'showScoreboard'});
  }

  void _resetHomeView() {
    print('🏠 Resetting camera to home view...');
    _sendToJavaScript({'type': 'resetHomeView'});
  }

  void _showWorldSwitchDialog() {
    _showDialogWithIframeDisabled(
      (BuildContext dialogContext) => AlertDialog(
        backgroundColor: Colors.grey[900],
        title: const Text(
          'Select World Template',
          style: TextStyle(color: Colors.white),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.only(bottom: 8.0),
                child: Text(
                  'Free Worlds',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey,
                  ),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.grass, color: Colors.green),
                title: const Text(
                  'Green Plane',
                  style: TextStyle(color: Colors.white),
                ),
                subtitle: Text(
                  'Simple green ground plane with natural feel',
                  style: TextStyle(color: Colors.grey[400]),
                ),
                trailing: _currentWorldType == 'green-plane'
                    ? const Icon(Icons.check, color: Colors.green)
                    : null,
                onTap: () {
                  Navigator.pop(dialogContext);
                  _switchToWorld('green-plane');
                },
              ),
              ListTile(
                leading: const Icon(Icons.star, color: Colors.purple),
                title: const Text(
                  'Space',
                  style: TextStyle(color: Colors.white),
                ),
                subtitle: Text(
                  'Dark space environment with stars',
                  style: TextStyle(color: Colors.grey[400]),
                ),
                trailing: _currentWorldType == 'space'
                    ? const Icon(Icons.check, color: Colors.green)
                    : null,
                onTap: () {
                  Navigator.pop(dialogContext);
                  _switchToWorld('space');
                },
              ),
              ListTile(
                leading: const Icon(Icons.waves, color: Colors.blue),
                title: const Text(
                  'Ocean',
                  style: TextStyle(color: Colors.white),
                ),
                subtitle: Text(
                  'Ocean waves environment with water effects',
                  style: TextStyle(color: Colors.grey[400]),
                ),
                trailing: _currentWorldType == 'ocean'
                    ? const Icon(Icons.check, color: Colors.green)
                    : null,
                onTap: () {
                  Navigator.pop(dialogContext);
                  _switchToWorld('ocean');
                },
              ),
              ListTile(
                leading: const Icon(Icons.store, color: Colors.orange),
                title: const Text(
                  'Record Store',
                  style: TextStyle(color: Colors.white),
                ),
                subtitle: Text(
                  'Browse media like a vintage record shop',
                  style: TextStyle(color: Colors.grey[400]),
                ),
                trailing: _currentWorldType == 'record-store'
                    ? const Icon(Icons.check, color: Colors.green)
                    : null,
                onTap: () {
                  Navigator.pop(dialogContext);
                  _switchToWorld('record-store');
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              print('🌍 World selector cancel button pressed');
              Navigator.of(dialogContext).pop();
            },
            child: const Text('Cancel', style: TextStyle(color: Colors.blue)),
          ),
        ],
      ),
    );
  }

  void _showSearchMusicVideos() {
    final searchController = TextEditingController();
    _showDialogWithIframeDisabled(
      (BuildContext dialogContext) => AlertDialog(
        backgroundColor: Colors.grey[900],
        title: const Text(
          'Search Music/Videos',
          style: TextStyle(color: Colors.white),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: searchController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Search',
                labelStyle: TextStyle(color: Colors.grey[400]),
                hintText: 'Enter artist, song, or video title...',
                hintStyle: TextStyle(color: Colors.grey[600]),
                prefixIcon: Icon(Icons.search, color: Colors.grey[400]),
                enabledBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: Colors.grey[700]!),
                ),
                focusedBorder: const UnderlineInputBorder(
                  borderSide: BorderSide(color: Colors.blue),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Search across YouTube, Spotify, and other platforms to find media content.',
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              print('🔍 Search music/videos cancel pressed');
              Navigator.of(dialogContext).pop();
            },
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () {
              if (searchController.text.isNotEmpty) {
                final query = searchController.text;
                print('🔍 Searching for: $query');
                Navigator.pop(dialogContext);
                // Navigate to MusicSearchScreen with query
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const MusicSearchScreen(),
                  ),
                );
              }
            },
            child: const Text('Search', style: TextStyle(color: Colors.blue)),
          ),
        ],
      ),
    );
  }

  void _showFurnitureTypeSelector() {
    _showDialogWithIframeDisabled(
      (BuildContext dialogContext) => AlertDialog(
        backgroundColor: Colors.grey[900],
        title: const Text(
          'Select Furniture Type',
          style: TextStyle(color: Colors.white),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.collections, color: Colors.blue),
                title: const Text(
                  'Bookshelf',
                  style: TextStyle(color: Colors.white),
                ),
                subtitle: Text(
                  '10 items',
                  style: TextStyle(color: Colors.grey[400]),
                ),
                onTap: () {
                  Navigator.pop(dialogContext);
                  _createFurniture('bookshelf');
                },
              ),
              ListTile(
                leading: const Icon(Icons.view_in_ar, color: Colors.purple),
                title: const Text(
                  'Gallery Wall',
                  style: TextStyle(color: Colors.white),
                ),
                subtitle: Text(
                  '10 items',
                  style: TextStyle(color: Colors.grey[400]),
                ),
                onTap: () {
                  Navigator.pop(dialogContext);
                  _createFurniture('gallery_wall');
                },
              ),
              ListTile(
                leading: const Icon(Icons.stairs, color: Colors.orange),
                title: const Text(
                  'Riser',
                  style: TextStyle(color: Colors.white),
                ),
                subtitle: Text(
                  '20 items',
                  style: TextStyle(color: Colors.grey[400]),
                ),
                onTap: () {
                  Navigator.pop(dialogContext);
                  _createFurniture('riser');
                },
              ),
              ListTile(
                leading: const Icon(Icons.theaters, color: Colors.green),
                title: const Text(
                  'Stage Small',
                  style: TextStyle(color: Colors.white),
                ),
                subtitle: Text(
                  '30 items',
                  style: TextStyle(color: Colors.grey[400]),
                ),
                onTap: () {
                  Navigator.pop(dialogContext);
                  _createFurniture('stage_small');
                },
              ),
              ListTile(
                leading: const Icon(Icons.stadium, color: Colors.red),
                title: const Text(
                  'Stage Large',
                  style: TextStyle(color: Colors.white),
                ),
                subtitle: Text(
                  '50 items',
                  style: TextStyle(color: Colors.grey[400]),
                ),
                onTap: () {
                  Navigator.pop(dialogContext);
                  _createFurniture('stage_large');
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              print('🪑 Furniture type selector cancel pressed');
              Navigator.of(dialogContext).pop();
            },
            child: const Text('Cancel', style: TextStyle(color: Colors.blue)),
          ),
        ],
      ),
    );
  }

  void _showAddUrlDialog() {
    final urlController = TextEditingController();
    _showDialogWithIframeDisabled(
      (BuildContext dialogContext) => AlertDialog(
        backgroundColor: Colors.grey[900],
        title: const Text('Add URL', style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: urlController,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            labelText: 'Enter URL',
            labelStyle: TextStyle(color: Colors.grey[400]),
            hintText: 'https://youtube.com/...',
            hintStyle: TextStyle(color: Colors.grey[600]),
            enabledBorder: UnderlineInputBorder(
              borderSide: BorderSide(color: Colors.grey[700]!),
            ),
            focusedBorder: const UnderlineInputBorder(
              borderSide: BorderSide(color: Colors.blue),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              print('🔗 Add URL cancel pressed');
              Navigator.of(dialogContext).pop();
            },
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () {
              if (urlController.text.isNotEmpty) {
                _addUrlObject(urlController.text);
                Navigator.of(dialogContext).pop();
              }
            },
            child: const Text('Add', style: TextStyle(color: Colors.blue)),
          ),
        ],
      ),
    );
  }

  /// Build search field (embedded in search container)
  Widget _buildSearchField() {
    return Row(
      children: [
        const SizedBox(width: 12),
        Icon(Icons.search, color: Colors.white.withOpacity(0.8), size: 16),
        const SizedBox(width: 4),
        // Search text field
        Expanded(
          child: TextField(
            controller: _searchController,
            autofocus: true,
            style: const TextStyle(color: Colors.white, fontSize: 12),
            decoration: InputDecoration(
              hintText: _searchInPlatforms
                  ? 'Search platforms...'
                  : 'Search objects...',
              hintStyle: TextStyle(color: Colors.grey[500], fontSize: 11),
              border: InputBorder.none,
              contentPadding: EdgeInsets.zero,
            ),
            onSubmitted: (query) {
              _performSearch(query);
              setState(() {
                _isSearchActive = false;
                _searchController.clear();
              });
            },
            onChanged: (_) => setState(() {}),
          ),
        ),
        // Clear/Done button
        IconButton(
          icon: Icon(
            _searchController.text.isNotEmpty ? Icons.clear : Icons.done,
            color: Colors.white,
            size: 16,
          ),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          onPressed: () {
            setState(() {
              if (_searchController.text.isNotEmpty) {
                _searchController.clear();
              } else {
                _isSearchActive = false;
                _searchController.clear();
              }
            });
          },
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  /// Build score button (bottom left)
  Widget _buildScoreButton() {
    return Material(
      color: Colors.green.withOpacity(0.9),
      borderRadius: BorderRadius.circular(20),
      elevation: 8,
      child: InkWell(
        onTap: () {
          print('🖱️ Score button clicked');
          _showScoreboard();
        },
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.3), width: 2),
          ),
          child: Text(
            'Lv$_currentLevel | 🏆 $_currentScore pts',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  /// Build home button (bottom right)
  Widget _buildHomeButton() {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        shape: const CircleBorder(),
        padding: const EdgeInsets.all(16),
        backgroundColor: Colors.white,
        elevation: 8,
      ),
      onPressed: () {
        print('🖱️ Home button clicked');
        _resetHomeView();
      },
      child: const Icon(Icons.home, color: Colors.black, size: 24),
    );
  }

  void _performSearch(String query) {
    if (query.trim().isEmpty) return;

    print(
      '🔍 Searching: $query (${_searchInPlatforms ? "platforms" : "world"})',
    );

    _sendToJavaScript({
      'type': _searchInPlatforms ? 'searchPlatforms' : 'searchWorld',
      'query': query,
    });
  }

  /// Switch to a different world template
  Future<void> _switchToWorld(String worldType) async {
    try {
      if (!mounted) return;

      print('🌍 Starting world switch to: $worldType');

      // Show loading indicator
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  strokeWidth: 2,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  'Switching to ${ThreeJsUtils.getWorldDisplayName(worldType)}...',
                ),
              ),
            ],
          ),
          duration: const Duration(seconds: 3),
        ),
      );

      // Send world switch message to JavaScript
      _sendToJavaScript({'type': 'switchWorld', 'worldType': worldType});

      // Wait a moment for the world to initialize
      await Future.delayed(const Duration(milliseconds: 500));

      // Update the current world type
      setState(() {
        _currentWorldType = worldType;
      });

      // Save to SharedPreferences for persistence
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('currentWorldType', worldType);
        print('💾 Saved world preference: $worldType');
      } catch (e) {
        print('⚠️ Failed to save world preference: $e');
      }

      print('✅ World switched to: $worldType');

      // Show success message
      if (mounted) {
        // Wait for loading to be shown
        await Future.delayed(const Duration(milliseconds: 800));
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Switched to ${ThreeJsUtils.getWorldDisplayName(worldType)}',
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      print('❌ Error switching world: $e');

      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error, color: Colors.white),
                const SizedBox(width: 8),
                const Expanded(child: Text('Failed to switch world')),
              ],
            ),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    super.dispose();
  }
}
