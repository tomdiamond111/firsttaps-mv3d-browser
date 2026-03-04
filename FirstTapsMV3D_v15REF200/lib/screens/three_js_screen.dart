import 'dart:async'; // For Timer
import 'dart:convert'; // For jsonEncode
import 'dart:ui' as ui; // For UI types like AppExitResponse

import 'package:flutter/foundation.dart'; // For kDebugMode
import 'package:flutter/material.dart'; // Ensure Material is imported
import 'package:flutter/services.dart'; // For SystemChrome immersive mode
import 'package:provider/provider.dart'; // For Consumer and Provider.of
import 'package:webview_flutter/webview_flutter.dart';
// ignore: depend_on_referenced_packages
import 'package:webview_flutter_android/webview_flutter_android.dart';

import 'package:shared_preferences/shared_preferences.dart'; // For avatar persistence

import '../controllers/home_page_controller.dart'; // For accessing controller methods
import '../widgets/camera_controls.dart';
import '../widgets/sms_text_input_widget.dart'; // Add SMS text input widget
import '../widgets/sms_3d_settings_widget.dart'; // Add 3D messaging settings widget
import '../helpers/webview_premium_integration.dart'; // Add premium gaming integration
import '../helpers/app_share_helper.dart'; // Add app sharing helper
import '../widgets/stacking_criteria_dialog.dart'; // Add stacking criteria dialog
import '../models/file_model.dart' as fm;
import '../services/three_js_interop_service.dart';
import '../services/object_deletion_state_service.dart';
import '../services/world_persistence_service.dart';
import '../services/premium_service.dart'; // Add premium service
import '../services/sms_3d_mode_service.dart'; // Add 3D SMS service
import '../services/furniture_import_service.dart'; // Add furniture import service
import '../services/remote_config_service.dart'; // Add remote config service
import '../services/content_feedback_service.dart'; // Add content feedback service
import '../config/app_config.dart'; // Add app config
import 'premium_store_screen.dart'; // Premium Store Screen
import 'furniture_manager_screen.dart'; // Furniture Manager Screen

import '../sms/sms_channel_manager.dart'; // Add SMS Channel Manager import
import 'package:app_links/app_links.dart'; // Add app_links for deep linking
import 'constants/three_js_constants.dart'; // Add constants import

import 'widgets/world_option_widget.dart';
import 'widgets/premium_world_option_widget.dart'; // Add premium widget
import 'widgets/cancel_button_widget.dart';

import 'widgets/mini_floating_action_button_widget.dart';
import 'widgets/options_menu_widget.dart';
import 'widgets/furniture_menu_widget.dart'; // Add content menu widget (includes furniture)
import '../widgets/banner_ad_widget.dart'; // Add AdMob banner widget
import 'utils/three_js_utils.dart'; // Add utilities import
import 'mixins/three_js_modal_handlers.dart'; // Add mixin import
import 'mixins/three_js_world_ui_handlers.dart'; // Add world UI mixin import
import 'mixins/three_js_search_handlers.dart'; // Add search mixin import
import 'mixins/three_js_file_operation_handlers.dart'; // Add file operations mixin import
import 'mixins/three_js_undo_operations_mixin.dart'; // Add undo operations mixin import
import 'helpers/three_js_javascript_channels.dart'; // Add JavaScript channels helper
import 'helpers/three_js_undo_delete_handler.dart'; // Add undo delete handler
import '../widgets/welcome_instructions_dialog.dart'; // Add welcome instructions dialog
import '../widgets/music_preferences_dialog.dart'; // Add music preferences dialog
import '../widgets/loading_screen_overlay.dart'; // Add professional loading screen

// Callback type for when a file deletion is confirmed
typedef OnFileDeletedCallback = Future<void> Function(String fileId);

// Callback type for when a file's position is updated
typedef OnFileMovedCallback =
    Future<void> Function(
      String fileId,
      double x,
      double y,
      double z, {
      double? rotation, // ROTATION FIX: Add rotation parameter
      String? furnitureId,
      int? furnitureSlotIndex,
      bool updateFurniture,
    });

// Callback type for when a new link object is added
typedef OnLinkObjectAddedCallback =
    Future<void> Function(fm.FileModel linkFile);

// Callback type for setting the interop service on the controller
typedef SetInteropServiceCallback =
    void Function(ThreeJsInteropService service);

// Callback type for undoing a single object deletion
typedef OnUndoObjectDeleteCallback =
    Future<void> Function(fm.FileModel fileModel);

// Callback type for deleting all objects from both 3D scene and persistent storage
typedef OnDeleteAllObjectsCallback = Future<void> Function();

// Callback type for when a link object's name is changed
typedef OnLinkNameChangedCallback =
    Future<void> Function(String objectId, String customName);

// Callback type for when premium gaming popup is requested
typedef OnPremiumGamingPopupRequestedCallback =
    Future<void> Function(Map<String, dynamic> data);

// Callback type for getting current file state with latest position
typedef GetCurrentFileStateCallback = fm.FileModel? Function(String objectId);

// Callback type for adding a file to the state manager
typedef OnFileAddedCallback = void Function(fm.FileModel fileModel);

class ThreeJsScreen extends StatefulWidget {
  final List<fm.FileModel> filesToDisplay;
  final OnFileDeletedCallback onFileDeleted;
  final OnFileMovedCallback onFileMoved; // New callback
  final OnLinkObjectAddedCallback?
  onLinkObjectAdded; // New callback for link objects
  final SetInteropServiceCallback?
  onSetInteropService; // New callback for setting interop service
  final OnUndoObjectDeleteCallback?
  onUndoObjectDelete; // New callback for undo functionality
  final OnDeleteAllObjectsCallback?
  onDeleteAllObjects; // New callback for delete all functionality
  final OnLinkNameChangedCallback?
  onLinkNameChanged; // New callback for link name changes
  final OnPremiumGamingPopupRequestedCallback?
  onPremiumGamingPopupRequested; // New callback for premium gaming popup
  final GetCurrentFileStateCallback?
  onGetCurrentFileState; // New callback for getting current file state
  final OnFileAddedCallback?
  onFileAdded; // New callback for adding files to state
  final bool shouldResetCamera; // Optional parameter to force camera reset
  const ThreeJsScreen({
    super.key,
    required this.filesToDisplay,
    required this.onFileDeleted,
    required this.onFileMoved, // New callback
    this.onLinkObjectAdded, // Optional callback for link objects
    this.onSetInteropService, // Optional callback for setting interop service
    this.onUndoObjectDelete, // Optional callback for undo functionality
    this.onDeleteAllObjects, // Optional callback for delete all functionality
    this.onLinkNameChanged, // Optional callback for link name changes
    this.onPremiumGamingPopupRequested, // Optional callback for premium gaming popup
    this.onGetCurrentFileState, // Optional callback for getting current file state
    this.onFileAdded, // Optional callback for adding files to state
    this.shouldResetCamera = false, // Optional parameter to force camera reset
  });

  // Static reference for global JavaScript access
  static _ThreeJsScreenState? _currentInstance;

  /// Static method to refresh gaming levels from anywhere in the app
  static void refreshGamingLevelsGlobally() {
    print('🎮 STATIC METHOD: refreshGamingLevelsGlobally called');
    if (_currentInstance != null) {
      print(
        '🎮 STATIC METHOD: Current instance found, calling _notifyJavaScriptLevelRefresh',
      );
      _currentInstance!._notifyJavaScriptLevelRefresh();
      print('🎮 STATIC METHOD: ✅ _notifyJavaScriptLevelRefresh completed');
    } else {
      print(
        '⚠️ STATIC METHOD: No ThreeJsScreen instance available for JavaScript level refresh',
      );
    }
  }

  @override
  _ThreeJsScreenState createState() => _ThreeJsScreenState();
}

class _ThreeJsScreenState extends State<ThreeJsScreen>
    with
        ThreeJsModalHandlers,
        ThreeJsWorldUIHandlers,
        ThreeJsSearchHandlers,
        ThreeJsFileOperationHandlers,
        ThreeJsUndoOperationsMixin,
        WebViewPremiumIntegration,
        AutomaticKeepAliveClientMixin // CRITICAL: Preserve WebView state when backgrounded
    implements
        JavaScriptChannelDelegate,
        UndoDeleteDelegate,
        WidgetsBindingObserver {
  late WebViewController _webViewController; // Still needed for initialization
  bool _isWebViewInitialized = false;
  final ThreeJsInteropService _threeJsInteropService =
      ThreeJsInteropService(); // Instantiate
  final ObjectDeletionStateService _deletionStateService =
      ObjectDeletionStateService(); // Add deletion state service
  final SmsChannelManager _smsChannelManager =
      SmsChannelManager(); // Add SMS Channel Manager

  // Deep link subscription for furniture import
  late AppLinks _appLinks;
  StreamSubscription? _deepLinkSubscription;
  FurnitureImportService? _furnitureImportService;

  // Track last created furniture ID for playlist import
  String? _lastCreatedFurnitureId;

  // JavaScript channels helper
  late ThreeJsJavaScriptChannels _jsChannels;
  // Undo delete handler
  late ThreeJsUndoDeleteHandler _undoDeleteHandler;
  // bool _showFileNames = false; // Consolidated
  bool _showFileInfo =
      true; // Consolidated option (default enabled to match JS default)
  bool _useFaceTextures = true; // Face texture option (default enabled)
  bool _sortFileObjects = true; // Sort File Objects option (default enabled)

  // WORLD READY STATE - track when 3D world finishes loading
  bool _isWorldReady = false; // Show splash overlay until world is ready

  // MOVE HISTORY STATE - for "Undo Recent Move" functionality
  bool _hasRecentMoves = false; // Track if there are moves that can be undone

  // Avatar save debouncing

  // World template state
  String _currentWorldType =
      'green-plane'; // Default world type// PHASE 2: Axis Selection Menu State
  Timer? _axisMenuTimer; // Auto-timeout timer for axis menu
  Timer? _axisIndicatorTimer; // Auto-timeout timer for axis indicator overlay

  // POLISH PHASE: Visual Indicators State
  String? _currentSelectedAxis; // Currently selected axis (XY, X, Y, Z)
  bool _showAxisIndicators = false; // Show visual indicators in 3D view
  String _statusMessage = ''; // Status messages for user feedback

  // SEARCH FUNCTIONALITY STATE
  bool _isSearchActive = false; // Track if search mode is active
  String _searchMode =
      'world'; // 'world' or 'platform' - determines search type
  final TextEditingController _searchController =
      TextEditingController(); // Search input controller
  final FocusNode _searchFocusNode = FocusNode(); // Focus node for search input
  int _searchResultsCount = 0; // Number of search results

  // SMS TEXT INPUT STATE
  bool _isSmsInputVisible = false; // Track if SMS input is visible
  String? _currentSmsContactId; // Current contact ID for SMS

  // NAVIGATION MODE STATE (0=default, 1=easynav, 2=explore)
  int _navigationMode =
      0; // Track current navigation mode (default to standard mode)

  // Legacy compatibility
  bool get _isExploreMode => _navigationMode == 2;

  // AVATAR PERSISTENCE DEBOUNCE

  // =============================================================================
  // MIXIN INTERFACE STUBS - Required by ThreeJsModalHandlers
  // =============================================================================

  // Required getters for the mixin (also implementing JavaScriptChannelDelegate interface)
  @override
  ThreeJsInteropService get threeJsInteropService => _threeJsInteropService;

  @override
  ObjectDeletionStateService get deletionStateService => _deletionStateService;

  @override
  WebViewController get webViewController => _webViewController;

  @override
  SmsChannelManager get smsChannelManager => _smsChannelManager;

  @override
  bool get showFileInfo => _showFileInfo;

  @override
  bool get useFaceTextures => _useFaceTextures;

  // Additional JavaScriptChannelDelegate getters
  @override
  List<fm.FileModel> get filesToDisplay => widget.filesToDisplay;

  @override
  bool get isWorldReady => _isWorldReady;

  @override
  Future<void> Function(String fileId) get onFileDeleted =>
      widget.onFileDeleted;

  @override
  Future<void> Function(
    String fileId,
    double x,
    double y,
    double z, {
    double? rotation, // ROTATION FIX: Add rotation parameter
    String? furnitureId,
    int? furnitureSlotIndex,
    bool updateFurniture,
  })
  get onFileMoved => widget.onFileMoved;

  @override
  Future<void> Function(fm.FileModel linkFile)? get onLinkObjectAdded =>
      widget.onLinkObjectAdded;

  @override
  Future<void> Function(String objectId, String customName)?
  get onLinkNameChanged => widget.onLinkNameChanged;

  @override
  Future<void> Function(Map<String, dynamic> data)?
  get onPremiumGamingPopupRequested => widget.onPremiumGamingPopupRequested;

  // NEW: Missing undo delete delegate methods that were lost in refactoring
  @override
  void showUndoDeleteSnackbar(String objectId, String objectName) {
    // Delegate to the mixin's undo delete handler
    super.showUndoDeleteSnackbar(objectId, objectName);
  }

  @override
  Future<void> undoDeleteObject(String objectId, String objectName) {
    // Delegate to the mixin's undo delete handler
    return super.undoDeleteObject(objectId, objectName);
  }

  @override
  void handleObjectDeletionWithUndo(String objectId, String objectName) {
    // CRITICAL: Let the undo delete handler manage both state capture AND deletion
    // This prevents double-deletion and ensures proper timing
    _undoDeleteHandler.handleObjectDeletionWithUndo(objectId, objectName);
  }

  // NEW: Track last created furniture ID for playlist import
  @override
  void setLastCreatedFurnitureId(String? furnitureId) {
    setState(() {
      _lastCreatedFurnitureId = furnitureId;
    });
  }

  // Additional delegate methods required by new mixins

  @override
  String? get currentSmsContactId => _currentSmsContactId;

  @override
  bool get isSmsInputVisible => _isSmsInputVisible;

  @override
  void Function() get closeSmsInput => _closeSmsInput;

  @override
  void Function(String message) get sendSmsMessage => _sendSmsMessage;

  // Required methods for the mixin - implemented by delegating to existing methods
  @override
  Future<void> handleObjectDeletion(String objectId) async {
    print("handleObjectDeletion: Deleting object with ID: $objectId");

    // Skip paths - they're managed entirely by JavaScript PathManager
    if (objectId.startsWith('path_')) {
      print(
        "🛤️ Ignoring path deletion in handleObjectDeletion - paths managed by JavaScript PathManager",
      );
      return;
    }

    await widget.onFileDeleted(objectId);
    print("handleObjectDeletion: Object deleted.");
  }

  @override
  fm.FileModel? getCurrentFileStateFromManager(String objectId) {
    // Use the callback to get the current file state from the controller's state manager
    return widget.onGetCurrentFileState?.call(objectId);
  }

  @override
  void performUndoObjectDelete() {
    // Call mixin method directly
    super.performUndoObjectDelete();
  }

  @override
  void updateDisplayOptions() {
    _updateDisplayOptions();
  }

  // Method to add a file to Flutter state (called when paths are created in JS)
  void addFileToState(fm.FileModel fileModel) {
    print(
      "🛤️ ThreeJsScreen: Adding file to state: ${fileModel.name} (${fileModel.path})",
    );
    widget.onFileAdded?.call(fileModel);
  }

  /// Called by JavaScript when the 3D world finishes loading
  @override
  void onWorldReady() {
    print("🌍 Flutter: World is ready! Hiding splash overlay.");
    if (mounted) {
      setState(() {
        _isWorldReady = true;
      });

      // Re-enforce immersive mode after world loads (setState can trigger UI reset)
      Future.delayed(const Duration(milliseconds: 100), () {
        _enableImmersiveMode();
      });
    }
  }

  // =============================================================================
  // WORLD UI MIXIN INTERFACE - Required by ThreeJsWorldUIHandlers
  // =============================================================================

  // Required getters for the world UI mixin
  @override
  String get currentWorldType => _currentWorldType;

  // Required methods for the world UI mixin - implemented by delegating to existing methods
  @override
  void setCurrentWorldType(String worldType) {
    setState(() {
      _currentWorldType = worldType;
    });
  }

  // =============================================================================
  // SEARCH MIXIN INTERFACE - Required by ThreeJsSearchHandlers
  // =============================================================================

  // Required getters for the search mixin
  @override
  bool get isSearchActive => _isSearchActive;

  @override
  TextEditingController get searchController => _searchController;

  @override
  FocusNode get searchFocusNode => _searchFocusNode;

  @override
  int get searchResultsCount => _searchResultsCount;

  // Required methods for the search mixin - implemented by delegating to existing state management
  @override
  void setSearchActive(bool active) {
    setState(() {
      _isSearchActive = active;
    });
  }

  @override
  void setSearchResultsCount(int count) {
    setState(() {
      _searchResultsCount = count;
    });
  }

  @override
  void clearSearchController() {
    _searchController.clear();
  }

  // =============================================================================
  // FILE OPERATIONS MIXIN INTERFACE - Required by ThreeJsFileOperationHandlers
  // =============================================================================

  // Required getters for the file operations mixin
  @override
  bool get isWebViewInitialized => _isWebViewInitialized;

  @override
  bool get hasRecentMoves => _hasRecentMoves;

  @override
  Future<void> Function()? get onDeleteAllObjects => widget.onDeleteAllObjects;

  @override
  Future<void> Function(fm.FileModel fileModel)? get onUndoObjectDelete =>
      widget.onUndoObjectDelete;

  // Required methods for the file operations mixin - implemented by delegating to existing state management
  @override
  void setHasRecentMoves(bool value) {
    setState(() {
      _hasRecentMoves = value;
    });
  }

  @override
  Future<void> sendDisplayOptionsToJs() {
    return _sendDisplayOptionsToJs();
  }

  // CRITICAL: Keep WebView alive when backgrounded (prevents restart when returning from external apps)
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();

    // Preload remote config in background (fetches content URLs from GitHub Pages)
    // This runs asynchronously and caches for 24 hours
    _preloadRemoteConfig();

    // Add app lifecycle observer to re-enable immersive mode
    WidgetsBinding.instance.addObserver(this);

    // Enable immersive sticky mode - hides navigation buttons until user swipes
    _enableImmersiveMode();

    // Set static reference for global access
    ThreeJsScreen._currentInstance = this;

    // Initialize undo operations mixin
    initializeUndoOperations();

    _jsChannels = ThreeJsJavaScriptChannels(
      this,
    ); // Initialize JavaScript channels helper
    _undoDeleteHandler = ThreeJsUndoDeleteHandler(
      this,
    ); // Initialize undo delete handler
    _loadLastWorldTemplate(); // Load the last used world template
    _initializeWebViewAndInteropService(); // Renamed method

    // Initialize deep link listener for furniture import
    _initializeDeepLinkListener();

    // Initialize content feedback service for likes/dislikes tracking
    _initializeContentFeedbackService();

    // SMS functionality disabled - not used in this app
    // _initializeSmsChannelManager(); // Initialize SMS Channel Manager

    // CRITICAL FALLBACK: Inject demo assets after delay
    // This runs independently of onPageFinished to ensure injection happens
    _scheduleFallbackDemoAssetInjection();

    // Check and show welcome instructions on first launch (after objects load)
    _checkAndShowWelcomeInstructions();
  }

  /// Preload remote config in background
  /// Fetches content URLs from GitHub Pages and caches for 24 hours
  /// Non-blocking - runs asynchronously
  void _preloadRemoteConfig() {
    print('🔵 _preloadRemoteConfig() called - starting remote config fetch');
    RemoteConfigService.getConfig()
        .then((config) {
          print('✅ Remote config preloaded: version ${config['version']}');
          print('   Source: ${config['source'] ?? 'remote'}');
        })
        .catchError((error) {
          print('⚠️ Remote config preload failed (will use fallback): $error');
        });
  }

  /// Check and show welcome instructions and music preferences on first launch
  /// Waits for 3D world to be ready, then shows instructions after 3-second buffer
  Future<void> _checkAndShowWelcomeInstructions() async {
    // Wait for world to be ready (signaled by JavaScript notifyWorldReady() call)
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

    print('🔍 [ThreeJsScreen] First launch check:');
    print('   shouldShowWelcome: $shouldShowWelcome');
    print('   musicPrefsShown: $musicPrefsShown');

    // Show welcome dialog first if needed
    if (shouldShowWelcome && mounted) {
      print('📖 [ThreeJsScreen] Showing welcome instructions dialog...');
      try {
        await WelcomeInstructionsDialog.show(context);
        print('✅ [ThreeJsScreen] Welcome instructions dialog closed');
      } catch (e) {
        print('❌ [ThreeJsScreen] Error showing welcome dialog: $e');
      }
    }

    // Show music preferences dialog after welcome (if not shown before)
    if (mounted && !musicPrefsShown) {
      print('🎵 [ThreeJsScreen] Preparing to show music preferences dialog...');

      // Wait a bit after welcome dialog
      await Future.delayed(const Duration(milliseconds: 800));

      if (!mounted) {
        print('❌ [ThreeJsScreen] Widget no longer mounted');
        return;
      }

      print('🎵 [ThreeJsScreen] Showing music preferences dialog NOW...');
      try {
        await MusicPreferencesDialog.show(
          context,
          webViewController: _webViewController,
        );
        print('✅ [ThreeJsScreen] Music preferences dialog closed');

        // Mark as shown AFTER dialog is dismissed
        await prefs.setBool(musicPrefsShownKey, true);
        print('✅ [ThreeJsScreen] Music preferences marked as shown');

        // Ensure at least one genre is selected
        final selectedGenres =
            await MusicPreferencesDialog.loadSelectedGenres();
        if (selectedGenres.isEmpty) {
          print(
            '⚠️ [ThreeJsScreen] No genres selected, selecting all by default',
          );
          final allGenres = MusicPreferencesDialog.availableGenres
              .map((g) => g.id)
              .toList();
          await MusicPreferencesDialog.saveSelectedGenres(allGenres);
          print('✅ [ThreeJsScreen] All genres selected as default');
        } else {
          print(
            '✅ [ThreeJsScreen] User selected ${selectedGenres.length} genres',
          );
        }

        // CRITICAL FIX: Inject genre preferences into JavaScript BEFORE furniture creation
        // At first install, furniture hasn't been created yet, so we need to:
        // 1. Wait for JavaScript to fully load
        // 2. Inject genre preferences into JavaScript ContentPreferencesService
        // 3. Fetch fresh recommendations based on selected genres
        // 4. Trigger furniture creation/refresh with genre-specific content
        print(
          '🔄 [FIRST INSTALL] Injecting genre preferences into JavaScript...',
        );
        await Future.delayed(const Duration(milliseconds: 1500));

        try {
          // Step 1: Inject genre preferences into JavaScript
          if (_isWebViewInitialized) {
            print(
              '📢 [FIRST INSTALL] Sending genre preferences to JavaScript...',
            );

            // Prepare genre preferences JSON
            final genresJson = selectedGenres.map((g) => '"$g"').join(', ');

            await _webViewController?.runJavaScript('''
                console.log('🎵 [FLUTTER → JS] Injecting genre preferences at first install...');
                console.log('🎵 [FLUTTER → JS] Selected genres: [$genresJson]');
                
                // Inject into ContentPreferencesService
                if (window.contentPreferences) {
                  console.log('✅ [FLUTTER → JS] ContentPreferencesService found, updating genres...');
                  window.contentPreferences.setSelectedGenres([$genresJson]);
                  console.log('✅ [FLUTTER → JS] Genre preferences saved to JavaScript localStorage');
                } else {
                  console.warn('⚠️ [FLUTTER → JS] ContentPreferencesService not loaded yet, storing for later...');
                  window.FLUTTER_INITIAL_GENRES = [$genresJson];
                }
              ''');
            print(
              '✅ [FIRST INSTALL] Genre preferences injected into JavaScript',
            );
          }

          // NOTE: Furniture refresh is triggered by the Done button in the dialog
          // via _performFurnitureRefresh(), so we don't need to call it again here.
          // This avoids double-refresh issues while still ensuring content updates
          // with the new genre preferences.
          print(
            '✅ [FIRST INSTALL] Genre preferences set - furniture will refresh when Done button pressed',
          );
        } catch (e) {
          print(
            '⚠️ [FIRST INSTALL] Failed to refresh with genre preferences: $e',
          );
        }
      } catch (e) {
        print('❌ [ThreeJsScreen] Error showing music preferences dialog: $e');
        // Mark as shown even on error to prevent infinite loop
        await prefs.setBool(musicPrefsShownKey, true);
      }
    } else if (musicPrefsShown) {
      print('ℹ️ [ThreeJsScreen] Music preferences already shown previously');
    }
  }

  /// Schedules demo asset injection as fallback in case onPageFinished doesn't fire
  void _scheduleFallbackDemoAssetInjection() {
    // Increased delay to 8 seconds to ensure WebViewController is fully initialized
    Future.delayed(const Duration(seconds: 8), () async {
      print("=" * 80);
      print(
        "🚨 FALLBACK: Attempting demo asset injection (8 seconds after init)",
      );
      print("=" * 80);

      // Check if WebViewController is ready
      if (!_isWebViewInitialized) {
        print(
          "⚠️ [FALLBACK] WebView not initialized yet, retrying in 3 seconds...",
        );
        Future.delayed(const Duration(seconds: 3), () async {
          try {
            print("🔄 [FALLBACK RETRY] Injecting demo asset data URLs...");
            await _threeJsInteropService.injectDemoAssetDataUrls();
            print("✅ [FALLBACK RETRY] Demo asset injection complete");
          } catch (e, stackTrace) {
            print("❌ [FALLBACK RETRY] Failed to inject demo assets: $e");
            print("Stack trace: $stackTrace");
          }
        });
        return;
      }

      try {
        print("🔄 [FALLBACK] Injecting demo asset data URLs...");
        await _threeJsInteropService.injectDemoAssetDataUrls();
        print("✅ [FALLBACK] Demo asset injection complete");
      } catch (e, stackTrace) {
        print("❌ [FALLBACK] Failed to inject demo assets: $e");
        print("Stack trace: $stackTrace");
      }

      print("=" * 80);
      print("🚨 FALLBACK: Completed demo asset injection attempt");
      print("=" * 80);
    });
  }

  /// Enable sticky immersive mode to hide system navigation
  void _enableImmersiveMode() {
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.immersiveSticky,
      overlays: [], // Hide both status bar and navigation buttons
    );
  }

  /// Handle app lifecycle changes to re-enable immersive mode
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    print("🔄 App Lifecycle Changed: $state");
    if (state == AppLifecycleState.resumed) {
      print(
        "🔄 App resumed - WebView should be preserved by AutomaticKeepAliveClientMixin",
      );
      // Re-enable immersive mode when app resumes
      _enableImmersiveMode();
    } else if (state == AppLifecycleState.paused) {
      print("🔄 App paused - WebView state being preserved in memory");
    } else if (state == AppLifecycleState.inactive) {
      print(
        "🔄 App inactive - Transitioning to background or external app opened",
      );
    } else if (state == AppLifecycleState.detached) {
      print("🔄 App detached - Process ending");
    }
  }

  // Empty implementations for required WidgetsBindingObserver methods
  @override
  void didChangeAccessibilityFeatures() {}

  @override
  void didChangeLocales(List<Locale>? locales) {}

  @override
  void didChangeMetrics() {}

  @override
  void didChangePlatformBrightness() {}

  @override
  void didChangeTextScaleFactor() {}

  @override
  void didHaveMemoryPressure() {}

  @override
  Future<bool> didPopRoute() async => false;

  @override
  Future<bool> didPushRoute(String route) async => false;

  @override
  Future<bool> didPushRouteInformation(
    RouteInformation routeInformation,
  ) async => false;

  @override
  Future<ui.AppExitResponse> didRequestAppExit() async =>
      ui.AppExitResponse.exit;

  @override
  void didChangeViewFocus(ui.ViewFocusEvent event) {}

  @override
  void handleCancelBackGesture() {}

  @override
  void handleCommitBackGesture() {}

  @override
  bool handleStartBackGesture(dynamic backEvent) => false;

  @override
  void handleUpdateBackGestureProgress(dynamic event) {}

  /// Initialize SMS Channel Manager for real SMS functionality
  Future<void> _initializeSmsChannelManager() async {
    try {
      print('📱 Initializing SMS Channel Manager...');
      final success = await _smsChannelManager.initialize();
      if (success) {
        print('📱 SMS Channel Manager initialized successfully');
      } else {
        print('📱 Failed to initialize SMS Channel Manager');
      }
    } catch (e) {
      print('📱 Error initializing SMS Channel Manager: $e');
    }
  }

  /// Initialize deep link listener for furniture import
  void _initializeDeepLinkListener() {
    print('📥 [IMPORT] Initializing deep link listener...');

    // Initialize AppLinks instance
    _appLinks = AppLinks();

    // Check for initial deep link (app opened from deep link)
    _appLinks
        .getInitialLink()
        .then((uri) {
          if (uri != null) {
            print('📥 [IMPORT] Initial deep link detected: $uri');
            _handleDeepLink(uri);
          }
        })
        .catchError((e) {
          print('❌ [IMPORT] Error checking initial deep link: $e');
        });

    // Listen for incoming deep links (app already running)
    _deepLinkSubscription = _appLinks.uriLinkStream.listen(
      (uri) {
        print('📥 [IMPORT] Incoming deep link: $uri');
        _handleDeepLink(uri);
      },
      onError: (e) {
        print('❌ [IMPORT] Deep link stream error: $e');
      },
    );

    print('✅ [IMPORT] Deep link listener initialized');
  }

  /// Handle incoming deep link for furniture import
  Future<void> _handleDeepLink(Uri uri) async {
    try {
      print('📥 [IMPORT] Handling deep link: $uri');

      // Check if this is a furniture import link
      if (uri.scheme == 'firsttapsmv3d' && uri.host == 'import-furniture') {
        print('📥 [IMPORT] Valid furniture import link detected');

        // Wait for WebView to be initialized
        if (!_isWebViewInitialized) {
          print('⏳ [IMPORT] Waiting for WebView to initialize...');
          // Wait up to 10 seconds for WebView to be ready
          for (int i = 0; i < 20; i++) {
            await Future.delayed(const Duration(milliseconds: 500));
            if (_isWebViewInitialized) {
              break;
            }
          }

          if (!_isWebViewInitialized) {
            print('❌ [IMPORT] WebView initialization timeout');
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Please wait for the 3D world to load'),
                  backgroundColor: Colors.orange,
                ),
              );
            }
            return;
          }
        }

        // Initialize import service if not already done
        _furnitureImportService ??= FurnitureImportService(_webViewController);

        // Show loading dialog
        if (mounted) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) =>
                const Center(child: CircularProgressIndicator()),
          );
        }

        // Import the furniture
        final success = await _furnitureImportService!.importFromDeepLink(uri);

        // Dismiss loading
        if (mounted) {
          Navigator.pop(context);

          // Show result
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                success
                    ? '✓ Furniture imported successfully!'
                    : '✗ Failed to import furniture. Please check the link.',
              ),
              backgroundColor: success ? Colors.green : Colors.red,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      } else {
        print('ℹ️ [IMPORT] Not a furniture import link, ignoring');
      }
    } catch (e) {
      print('❌ [IMPORT] Error handling deep link: $e');
      if (mounted) {
        Navigator.pop(context); // Dismiss loading if still showing
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Import error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Initialize content feedback service for tracking likes/dislikes
  void _initializeContentFeedbackService() {
    print('👍 Initializing content feedback service...');
    contentFeedbackService
        .initialize()
        .then((_) {
          print('✅ Content feedback service initialized');
        })
        .catchError((e) {
          print('❌ Error initializing content feedback service: $e');
        });
  }

  /// Load the last used world template from persistent storage
  /// This ensures the app always restores to the most recently used world
  Future<void> _loadLastWorldTemplate() async {
    try {
      final lastWorldTemplate =
          await WorldPersistenceService.loadLastWorldTemplate();
      print('ThreeJsScreen: Loaded last world template: $lastWorldTemplate');

      // Update the current world type state
      if (mounted) {
        setState(() {
          _currentWorldType = lastWorldTemplate;
        });
      }
    } catch (e) {
      print('ThreeJsScreen: Error loading last world template: $e');
      // Keep the default world template if loading fails
    }
  }

  /// Initialize the world template in the WebView with the loaded world type
  /// This ensures the WebView starts with the correct world template
  Future<void> _initializeWorldTemplateInWebView() async {
    try {
      print(
        'ThreeJsScreen: Initializing WebView with world template: $_currentWorldType',
      );

      // Only initialize if we have a non-default world template
      // The WebView should start with green-plane by default, so only switch if different
      if (_currentWorldType != 'green-plane') {
        await _threeJsInteropService.switchWorldTemplate(_currentWorldType);
        print(
          'ThreeJsScreen: Initialized WebView with world template: $_currentWorldType',
        );
      }
    } catch (e) {
      print('ThreeJsScreen: Error initializing world template in WebView: $e');
      // Continue with default world if initialization fails
    }
  }

  @override
  void didUpdateWidget(covariant ThreeJsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.filesToDisplay != oldWidget.filesToDisplay &&
        _isWebViewInitialized) {
      print(
        "ThreeJsScreen: filesToDisplay updated. Checking deletion state...",
      );

      // Check if objects were deleted and should not be recreated
      if (_deletionStateService.all3DObjectsDeleted) {
        print(
          "ThreeJsScreen: Objects were deleted - not recreating via didUpdateWidget.",
        );
        // Don't recreate objects if they were intentionally deleted
      } else {
        // Normal case - update objects from file list
        print("ThreeJsScreen: Sending updated files to WebView via service.");
        _threeJsInteropService.sendFilesToWebView(widget.filesToDisplay);
      }
    }
  }

  Future<void> _initializeWebViewAndInteropService() async {
    // Renamed method
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      // Add aggressive cache clearing
      ..clearCache()
      ..clearLocalStorage()
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {},
          onPageStarted: (String url) {
            print("WebView: Page started loading: $url");
            // Clear cache again when page starts loading
            _webViewController.clearCache();
          },
          onPageFinished: (String url) async {
            print("=" * 80);
            print("🌐 WebView: Page finished loading: $url");
            print("=" * 80);

            // Removed dynamic bundle.js loader. The HTML file should statically reference the correct bundle (e.g., bundle_modular_20250625_113113.js).

            _threeJsInteropService.setWebViewController(_webViewController);

            // CRITICAL: Inject demo asset data URLs BEFORE world initialization
            // This ensures demo content is available when default furniture is created
            try {
              print("📦 Injecting demo asset data URLs...");
              await _threeJsInteropService.injectDemoAssetDataUrls();
              print("✅ Demo asset injection complete");

              // ENHANCEMENT: Inject Dart recommendations to replace hardcoded playlists
              print("📦 Injecting recommendation URLs...");
              await _threeJsInteropService.injectRecommendations();
              print("✅ Recommendation injection complete");
            } catch (e, stackTrace) {
              print("❌ Failed to inject demo assets/recommendations: $e");
              print("Stack trace: $stackTrace");
            }

            // Set WebViewController for SMS Channel Manager
            _smsChannelManager.setWebViewController(_webViewController);

            // Set SMS UI callbacks to integrate with Flutter widget
            _smsChannelManager.setSmsUICallbacks(
              onShowSmsInput: (contactId) => showSmsInput(contactId),
              onHideSmsInput: () => _closeSmsInput(),
            );

            // Initialize 3D balloon settings channel
            final sms3DService = await Sms3DModeService.getInstance();
            sms3DService.channel?.setWebViewController(_webViewController);
            await sms3DService.channel?.syncAllSettings();
            if (kDebugMode) {
              print('🎈 3D Balloon settings channel initialized');
            }

            // Initialize Premium Gaming Integration
            initializePremiumGaming(_webViewController);

            // Test premium gaming bridge connection
            Future.delayed(const Duration(milliseconds: 1000), () async {
              await testPremiumGamingBridge(_webViewController);
              print("🎮 Premium gaming bridge test completed");
            });

            // Set the interop service on the controller for undo functionality
            if (widget.onSetInteropService != null) {
              widget.onSetInteropService!(_threeJsInteropService);
            }

            // Reset camera IMMEDIATELY if requested (before loading files)
            if (widget.shouldResetCamera) {
              print("ThreeJsScreen: Resetting camera BEFORE loading files");
              await _threeJsInteropService.resetHomeView();
              // Also try emergency reset immediately
              await _threeJsInteropService.emergencyReset();
            }

            // CRITICAL FIX: Initialize world template BEFORE creating objects
            // This prevents the thumbnailDataUrl loss issue when opening directly into premium worlds
            print(
              "ThreeJsScreen: Initializing world template before creating objects",
            );
            await _initializeWorldTemplateInWebView();

            // CRITICAL FIX: Add delay to ensure world template is fully initialized
            await Future.delayed(const Duration(milliseconds: 200));

            // Check if objects were deleted and should not be recreated
            // Only skip recreation if ALL objects were deleted AND we have no files to display
            if (_deletionStateService.all3DObjectsDeleted &&
                widget.filesToDisplay.isEmpty) {
              print(
                "ThreeJsScreen: All objects were deleted and no files to display - not recreating. Use undo to restore.",
              );
              // Send empty array to ensure no objects are created
              await _threeJsInteropService.sendFilesToWebView([]);
            } else {
              // Normal case - create objects from file list (including restored objects)
              print(
                "ThreeJsScreen: Creating objects from ${widget.filesToDisplay.length} files",
              );
              await _threeJsInteropService.sendFilesToWebView(
                widget.filesToDisplay,
              );
            }
            // Send initial display options AFTER objects are created
            await _sendDisplayOptionsToJs();
            // Multiple camera resets after files are loaded if requested
            if (widget.shouldResetCamera) {
              print("ThreeJsScreen: Multiple camera resets after files loaded");

              // Wait a bit longer for scene to settle before resetting camera
              Future.delayed(ThreeJsConstants.mediumDelay, () {
                print("ThreeJsScreen: Reset #1 - Basic reset");
                _threeJsInteropService.resetHomeView();
              });

              // Emergency reset after more time
              Future.delayed(ThreeJsConstants.longDelay, () {
                print("ThreeJsScreen: Reset #2 - Emergency reset");
                _threeJsInteropService.emergencyReset();
              });

              // Final reset after even more time to ensure it takes effect
              Future.delayed(ThreeJsConstants.extraLongDelay, () {
                print("ThreeJsScreen: Reset #3 - Final reset");
                _threeJsInteropService.resetHomeView();
              });

              // One more reset to be absolutely sure
              Future.delayed(ThreeJsConstants.maxDelay, () {
                print("ThreeJsScreen: Reset #4 - Final final reset");
                _threeJsInteropService.resetHomeView();
              });

              // NEW: Notify JS that the world is ready after all resets
              Future.delayed(
                ThreeJsConstants.maxDelay + const Duration(milliseconds: 200),
                () async {
                  print("🚀 Notifying JavaScript that the world is ready.");
                  _webViewController.runJavaScript('notifyWorldReady();');

                  // Poster thumbnails now load correctly without double-switch workaround
                  // The GlobalPosterManager handles poster restoration automatically

                  // Activate EasyNav mode if it's the default
                  if (_navigationMode == 1) {
                    print("🗺️ Activating default EasyNav mode");
                    await _webViewController.runJavaScript('''
                      if (window.exploreManager && window.exploreManager.cycleNavigationMode) {
                        window.exploreManager.cycleNavigationMode();
                      }
                    ''');
                  }
                },
              );
            }
            if (mounted) {
              setState(() {
                _isWebViewInitialized = true;
              });

              // Initialize recent moves state after WebView is ready
              Future.delayed(ThreeJsConstants.mediumDelay, () {
                updateRecentMovesState();
              });

              // AUTO-REHYDRATE AVATAR DATA (Fix #3 from expert advice)
              // Use WidgetsBinding.instance.addPostFrameCallback to ensure Flutter engine is ready
              WidgetsBinding.instance.addPostFrameCallback((_) {
                Future.delayed(const Duration(milliseconds: 500), () async {
                  // Minimal logging for avatar rehydration
                  await _loadAvatarCustomizations();
                  // print("👤 Avatar rehydration completed");
                });
              });

              // Re-enforce immersive mode after WebView fully loads (focus changes can reset SystemUI)
              Future.delayed(const Duration(milliseconds: 800), () {
                _enableImmersiveMode();
              });
            }
          },
          onWebResourceError: (WebResourceError error) {
            print('WebView Error: ${error.description}');
            if (mounted) {
              setState(() {
                _isWebViewInitialized = false;
              });
            }
          },
          onNavigationRequest: (NavigationRequest request) {
            if (request.url.startsWith('https://www.youtube.com/')) {
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      );

    // Enable WebView debugging for console.log output
    if (_webViewController.platform is AndroidWebViewController) {
      AndroidWebViewController.enableDebugging(true);

      // CRITICAL FIX for YouTube embeds - configure Android WebView settings
      final androidController =
          _webViewController.platform as AndroidWebViewController;

      // Enable media playback without user gesture (allows YouTube autoplay)
      androidController.setMediaPlaybackRequiresUserGesture(false);

      print(
        "🔧 WebView debugging enabled - console.log will appear in flutter logs",
      );
      print("🎥 YouTube embed settings configured (media playback enabled)");
    }

    // Setup JavaScript channels using helper
    _jsChannels.setupJavaScriptChannels(_webViewController);

    // Load the Flutter asset after channel setup
    _webViewController.loadFlutterAsset('assets/web/index2.html');
  }

  Future<void> _sendDisplayOptionsToJs() async {
    if (!_isWebViewInitialized) return;
    final options = {
      // 'showFileNames': _showFileNames, // Consolidated
      'showFileInfo': _showFileInfo, // Consolidated option
      'useFaceTextures': _useFaceTextures, // Face texture option
      'sortFileObjects': _sortFileObjects, // Sort File Objects option
    };
    await _threeJsInteropService.updateDisplayOptions(options);
  }

  // Remove camera state recording and restoring

  // Method to update display options in the 3D scene
  void _updateDisplayOptions() {
    if (_isWebViewInitialized) {
      _threeJsInteropService.updateDisplayOptions({
        'showFileInfo': _showFileInfo,
        'useFaceTextures': _useFaceTextures,
        'sortFileObjects': _sortFileObjects,
      });
    }
  }

  // ============================================================================
  // EXPLORE MODE HANDLER
  // ============================================================================

  // ============================================================================
  // EXPLORE MODE METHODS
  // ============================================================================

  /// Cycle through navigation modes: Default -> EasyNav -> Explore -> Default
  void _toggleExploreMode() {
    // Cycle to next mode
    setState(() {
      _navigationMode = (_navigationMode + 1) % 3;
    });

    final modeNames = ['default', 'easynav', 'explore'];
    print("📍 Navigation mode cycled to: ${modeNames[_navigationMode]}");

    // Send command to JavaScript to cycle modes
    _webViewController.runJavaScript('''
      if (window.cycleNavigationMode) {
        window.cycleNavigationMode();
        console.log("📍 Navigation mode cycled from Flutter");
      } else if (window.toggleExploreMode) {
        // Fallback for older code
        window.toggleExploreMode();
        console.log("📍 Using legacy toggleExploreMode");
      } else {
        console.warn("📍 Navigation mode functions not found in JavaScript");
      }
    ''');
  }

  /// Load avatar customizations from SharedPreferences using AsyncAPI
  Future<void> _loadAvatarCustomizations() async {
    try {
      // Debug logging disabled to reduce console noise
      final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
      final String? avatarData = await asyncPrefs.getString(
        'contactAvatarCustomizations',
      );

      // Only log if there's an issue or first load
      if (avatarData != null && avatarData.isNotEmpty) {
        // Minimal logging: only show load success
        print("👤 Avatar data loaded: ${avatarData.length} characters");
      }

      // Use base64 encoding to safely pass data through JavaScript
      final String? safeData = avatarData != null
          ? base64Encode(utf8.encode(avatarData))
          : null;

      await _webViewController.runJavaScript('''
        console.log("👤 [FLUTTER LOAD] Sending avatar data to JS...");
        console.log("👤 [FLUTTER LOAD] Data available: ${avatarData != null}");
        console.log("👤 [FLUTTER LOAD] Data length: ${avatarData?.length ?? 0}");
        
        var avatarDataToPass = null;
        if ("$safeData" !== "null") {
          try {
            avatarDataToPass = atob("$safeData");
            console.log("👤 [FLUTTER LOAD] Decoded data length:", avatarDataToPass.length);
          } catch (decodeError) {
            console.error("👤 [FLUTTER LOAD] ❌ Decode error:", decodeError);
          }
        }
        
        if (window.avatarLoadCallback) {
          console.log("👤 [FLUTTER LOAD] ✅ Using avatarLoadCallback - calling now...");
          try {
            window.avatarLoadCallback(avatarDataToPass);
            console.log("👤 [FLUTTER LOAD] ✅ Callback executed successfully");
          } catch (error) {
            console.error("👤 [FLUTTER LOAD] ❌ Callback error:", error);
          }
        } else {
          console.log("👤 [FLUTTER LOAD] ❌ No avatarLoadCallback found!");
          console.log("👤 [FLUTTER LOAD] Available window properties:", Object.keys(window).filter(k => k.includes('avatar')));
          window.loadedAvatarData = avatarDataToPass;
        }
      ''');
    } catch (e) {
      print("👤 Error loading avatar customizations: $e");

      // Report error to JavaScript with proper escaping
      final errorMessage = e
          .toString()
          .replaceAll('"', '\\"')
          .replaceAll('\n', '\\n');
      await _webViewController.runJavaScript('''
        console.error("👤 [FLUTTER LOAD] ❌ Error loading avatar customizations: $errorMessage");
        if (window.avatarLoadCallback) {
          console.log("👤 [FLUTTER LOAD] Calling callback with null due to error");
          window.avatarLoadCallback(null);
        } else {
          console.log("👤 [FLUTTER LOAD] No callback available to report error");
        }
      ''');
    }
  }

  // ============================================================================
  // LINK OBJECT PERSISTENCE HANDLER
  // ============================================================================

  /// Handle link object added from JavaScript - add to persistence
  Future<void> handleLinkObjectAdded(Map<String, dynamic> linkData) async {
    try {
      final linkName = linkData['name'] as String;
      final isDemoContent = linkData['isDemoContent'] == true;
      print("🔗 Handling link object added from JS: $linkName");

      // CRITICAL: Block any "Poster_undefined" link objects from being persisted
      if (linkName == 'Poster_undefined' ||
          linkName.startsWith('Poster_undefined')) {
        print(
          "🚫 BLOCKED: Prevented Poster_undefined link object from being persisted",
        );
        print(
          "🚫 This prevents unwanted poster URLs from creating persistent link objects",
        );
        return; // Exit early - do not persist these objects
      }

      // Create a FileModel from the link data for persistence
      final linkFile = fm.FileModel(
        path: linkData['id'] as String, // e.g., "app_com.link.walmart.12345"
        name: linkData['name'] as String, // e.g., "Walmart"
        type: fm.FileType.app, // Mark as app type for link objects
        extension: 'app', // Use 'app' extension
        fileSize: 0, // Links have no file size
        lastModified: (linkData['lastModified'] as num).toInt(),
        // Position data
        x: (linkData['x'] as num).toDouble(),
        y: (linkData['y'] as num).toDouble(),
        z: (linkData['z'] as num).toDouble(),
        // Store link URL in thumbnailDataUrl field (for now, until we extend FileModel)
        thumbnailDataUrl: linkData['thumbnailDataUrl'] as String?,
        // Store the actual URL in the mimeType field as a workaround
        // Format: "link:<actual_url>" so we can extract it during restoration
        mimeType: linkData['url'] != null ? 'link:${linkData['url']}' : null,
        // Use extracted demo content flag
        isDemo: isDemoContent,
      );

      print("🔗 Created FileModel for link: ${linkFile.path}");
      print("🔗 Link URL stored in mimeType: ${linkFile.mimeType}");
      print(
        "🔗 Link thumbnail stored in thumbnailDataUrl: ${linkFile.thumbnailDataUrl != null ? 'Yes' : 'No'}",
      );

      // Add the link object to the parent's state manager using the new callback
      if (widget.onLinkObjectAdded != null) {
        await widget.onLinkObjectAdded!(linkFile);
        print(
          "✅ Link object added via onLinkObjectAdded callback: ${linkFile.name}",
        );
      } else {
        // Fallback: just update position for existing files
        widget.onFileMoved(
          linkFile.path,
          linkFile.x!,
          linkFile.y!,
          linkFile.z!,
        );
        print(
          "⚠️ Used fallback onFileMoved callback - link may not persist properly",
        );
      }

      // Show success feedback (only if world is ready, not during initialization, and not demo/refreshed content)
      if (mounted && _isWorldReady && !linkFile.isDemo) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Link "${linkFile.name}" added successfully'),
            duration: const Duration(seconds: 2),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      print("❌ Error handling link object added: $e");

      // Extract demo flag for error handling
      final isDemoContent = linkData['isDemoContent'] == true;

      // Show error feedback (only if world is ready and not demo/refreshed content)
      if (mounted && _isWorldReady && !isDemoContent) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error adding link: $e'),
            duration: const Duration(seconds: 3),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Handle link name change from JavaScript - update persistence
  Future<void> handleLinkNameChange(Map<String, dynamic> nameChangeData) async {
    try {
      final String action = nameChangeData['action'] ?? '';
      final String objectId = nameChangeData['objectId'] ?? '';
      final String customName = nameChangeData['customName'] ?? '';

      print(
        "🔗 Handling link name change from JS: $action for $objectId -> '$customName'",
      );

      if (action == 'nameChanged' &&
          objectId.isNotEmpty &&
          customName.isNotEmpty) {
        // Update the custom name in our persistence service
        // Note: The LinkNamePersistenceService will be integrated when dependencies are resolved
        // For now, we'll store it using SharedPreferences directly

        final prefs = await SharedPreferences.getInstance();
        final Map<String, String> customNames = {};

        // Get existing custom names
        final String? existingData = prefs.getString('link_custom_names');
        if (existingData != null) {
          try {
            final Map<String, dynamic> decoded = jsonDecode(existingData);
            decoded.forEach((key, value) {
              customNames[key] = value.toString();
            });
          } catch (e) {
            print("⚠️ Error reading existing custom names: $e");
          }
        }

        // Update with new custom name
        customNames[objectId] = customName;

        // Save back to preferences
        await prefs.setString('link_custom_names', jsonEncode(customNames));

        print("✅ Saved custom link name: $objectId -> '$customName'");

        // Update the FileModel if it's currently loaded
        if (widget.onLinkNameChanged != null) {
          widget.onLinkNameChanged!(objectId, customName);
        } else {
          print("⚠️ onLinkNameChanged callback not available");
        }

        // Show success feedback
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Link name changed to "$customName"'),
              duration: const Duration(seconds: 2),
              backgroundColor: Colors.blue,
            ),
          );
        }
      } else {
        print(
          "⚠️ Invalid name change data: action=$action, objectId=$objectId, customName=$customName",
        );
      }
    } catch (e) {
      print("❌ Error handling link name change: $e");

      // Show error feedback
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error changing link name: $e'),
            duration: const Duration(seconds: 3),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Handle link name load request from JavaScript - load all saved names
  Future<void> handleLinkNameLoad(Map<String, dynamic> loadRequest) async {
    try {
      final String action = loadRequest['action'] ?? '';

      print("🔗 Handling link name load request from JS: $action");

      if (action == 'loadAllLinkNames') {
        // Load all saved link names from SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        final String? existingData = prefs.getString('link_custom_names');

        Map<String, String> customNames = {};
        if (existingData != null) {
          try {
            final Map<String, dynamic> decoded = jsonDecode(existingData);
            decoded.forEach((key, value) {
              customNames[key] = value.toString();
            });
          } catch (e) {
            print("⚠️ Error reading existing custom names: $e");
          }
        }

        print(
          "✅ Loaded ${customNames.length} saved link names from SharedPreferences",
        );

        // Send response back to JavaScript using the same callback pattern as avatar system
        await _webViewController.runJavaScript('''
          console.log("🔗 [FLUTTER LOAD] Attempting to call linkNameLoadCallback...");
          if (window.linkNameLoadCallback) {
            console.log("🔗 [FLUTTER LOAD] ✅ Using linkNameLoadCallback - calling now...");
            try {
              window.linkNameLoadCallback(${jsonEncode(customNames)});
              console.log("🔗 [FLUTTER LOAD] ✅ Callback executed successfully");
            } catch (error) {
              console.error("🔗 [FLUTTER LOAD] ❌ Callback error:", error);
            }
          } else {
            console.log("� [FLUTTER LOAD] ❌ No linkNameLoadCallback found!");
            console.log("🔗 [FLUTTER LOAD] Available window properties:", Object.keys(window).filter(k => k.includes('link')));
          }
        ''');
      } else {
        print("⚠️ Invalid load request action: $action");
      }
    } catch (e) {
      print("❌ Error in handleLinkNameLoad: $e");

      // Send error response
      await _webViewController.runJavaScript('''
        if (window.linkNameLoadCallback) {
          window.linkNameLoadCallback({});
        }
      ''');
    }
  }

  // ============================================================================
  // SEARCH FUNCTIONALITY METHODS
  // ============================================================================

  /// Perform search with the given query
  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty) {
      print('Search query is empty, ignoring search request');
      return;
    }

    print('Performing search for: "${query.trim()}"');

    try {
      final success = await _threeJsInteropService.activateSearch(query.trim());

      if (success) {
        print('✅ Search activation successful, updating UI state...');

        // Update search state
        setState(() {
          _isSearchActive = true;
        });

        // Small delay to ensure JS state is stable
        await Future.delayed(const Duration(milliseconds: 100));

        // Get search results count
        final resultsCount = await _threeJsInteropService
            .getSearchResultsCount();
        setState(() {
          _searchResultsCount = resultsCount;
        });

        print('Search activated successfully. Found $resultsCount results.');
        print('UI State: _isSearchActive = $_isSearchActive');

        // Show feedback to user
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(
                    ThreeJsConstants.searchIcon,
                    color: ThreeJsConstants.iconWhite,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    ThreeJsUtils.formatSearchResultsMessage(
                      resultsCount,
                      query,
                    ),
                  ),
                ],
              ),
              backgroundColor: ThreeJsConstants.primaryBlue,
              duration: ThreeJsConstants.snackBarDuration,
            ),
          );
        }
      } else {
        print('Search activation failed or no results found');
        // Error message removed - search will simply not show results if none found
      }
    } catch (e) {
      print('Error performing search: $e');
      // Error messages removed - search will simply not show results if there's an error
    }
  }

  /// Handle search input submission (Enter key or search button)
  Future<void> _handleSearchSubmit() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;

    // Unfocus the search field
    _searchFocusNode.unfocus();

    if (_searchMode == 'platform') {
      // Platform search mode - open music search screen with pre-filled query
      final searchQuery = query; // Save query before clearing
      _searchController.clear();
      setState(() {
        _isSearchActive = false;
      });

      // Get controller and open music search with pre-filled query
      final controller = Provider.of<HomePageController>(
        context,
        listen: false,
      );
      await controller.searchMusicAndNavigate(
        context,
        initialQuery: searchQuery,
      );
    } else {
      // World object search mode - perform search in 3D world
      await _performSearch(query);
    }
  }

  /// Cancel/finish search mode
  Future<void> _finishSearch() async {
    print('🏁 Flutter: Starting _finishSearch() method');
    print(
      '🏁 Flutter: Current state - isSearchActive: $_isSearchActive, resultsCount: $_searchResultsCount',
    );

    // ALWAYS clear the UI state first, regardless of JS success
    print(
      '🏁 Flutter: BEFORE setState - isSearchActive: $_isSearchActive, resultsCount: $_searchResultsCount',
    );
    setState(() {
      _isSearchActive = false;
      _searchResultsCount = 0;
    });
    print(
      '🏁 Flutter: AFTER setState - isSearchActive: $_isSearchActive, resultsCount: $_searchResultsCount',
    );

    // Clear search input
    _searchController.clear();
    print('🏁 Flutter: Search controller cleared');

    try {
      final success = await _threeJsInteropService.deactivateSearch();
      print('🏁 Flutter: deactivateSearch() returned: $success');

      if (success) {
        print('🏁 Flutter: JS deactivation successful');

        // Show feedback to user
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white),
                  SizedBox(width: 8),
                  Text('All objects restored to original positions'),
                ],
              ),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }
      } else {
        print(
          '🏁 Flutter: JS deactivation failed, but UI state already cleared',
        );
      }
    } catch (e) {
      print('🏁 Flutter: Error calling deactivateSearch: $e');
      print('🏁 Flutter: UI state already cleared, continuing...');
    }

    print('🏁 Flutter: _finishSearch completed successfully');
  }

  // Method to show world selection dialog
  void _showWorldSwitchDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Consumer<PremiumService>(
          builder: (context, premiumService, child) {
            return AlertDialog(
              title: const Text('Select World Template'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Free World Templates
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
                    WorldOptionWidget(
                      worldType: 'green-plane',
                      title: 'Green Plane',
                      description:
                          'Simple green ground plane with natural feel',
                      icon: Icons.grass,
                      currentWorldType: _currentWorldType,
                      onTap: () async {
                        if ('green-plane' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('green-plane');
                        }
                      },
                    ),
                    WorldOptionWidget(
                      worldType: 'space',
                      title: 'Space',
                      description: 'Dark space environment with stars',
                      icon: Icons.star,
                      currentWorldType: _currentWorldType,
                      onTap: () async {
                        if ('space' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('space');
                        }
                      },
                    ),
                    WorldOptionWidget(
                      worldType: 'ocean',
                      title: 'Ocean',
                      description: 'Ocean waves environment with water effects',
                      icon: Icons.waves,
                      currentWorldType: _currentWorldType,
                      onTap: () async {
                        if ('ocean' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('ocean');
                        }
                      },
                    ),
                    WorldOptionWidget(
                      worldType: 'record-store',
                      title: 'Record Store',
                      description: 'Browse media like a vintage record shop',
                      icon: Icons.store,
                      currentWorldType: _currentWorldType,
                      onTap: () async {
                        if ('record-store' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('record-store');
                        }
                      },
                    ),
                    WorldOptionWidget(
                      worldType: 'music-festival',
                      title: 'Music Festival',
                      description: 'Evening concert atmosphere with stages',
                      icon: Icons.festival,
                      currentWorldType: _currentWorldType,
                      onTap: () async {
                        if ('music-festival' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('music-festival');
                        }
                      },
                    ),
                    WorldOptionWidget(
                      worldType: 'modern-gallery-clean',
                      title: 'Modern Gallery (Clean)',
                      description: 'Clean minimal gallery with soft ambience',
                      icon: Icons.museum,
                      currentWorldType: _currentWorldType,
                      onTap: () async {
                        if ('modern-gallery-clean' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('modern-gallery-clean');
                        }
                      },
                    ),
                    WorldOptionWidget(
                      worldType: 'modern-gallery-dark',
                      title: 'Modern Gallery (Dark)',
                      description:
                          'Sophisticated dark gallery with warm lighting',
                      icon: Icons.museum,
                      currentWorldType: _currentWorldType,
                      onTap: () async {
                        if ('modern-gallery-dark' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('modern-gallery-dark');
                        }
                      },
                    ),
                    WorldOptionWidget(
                      worldType: 'modern-gallery-warm',
                      title: 'Modern Gallery (Warm)',
                      description: 'Elegant gallery with soft blush ambience',
                      icon: Icons.museum,
                      currentWorldType: _currentWorldType,
                      onTap: () async {
                        if ('modern-gallery-warm' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('modern-gallery-warm');
                        }
                      },
                    ),
                    WorldOptionWidget(
                      worldType: 'future-car-gallery',
                      title: 'Car Gallery',
                      description: 'Sleek automotive-inspired media interface',
                      icon: Icons.directions_car,
                      currentWorldType: _currentWorldType,
                      onTap: () async {
                        if ('future-car-gallery' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('future-car-gallery');
                        }
                      },
                    ),

                    // Premium World Templates
                    Padding(
                      padding: const EdgeInsets.only(top: 16.0, bottom: 8.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Premium Worlds',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.amber,
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () {
                              Navigator.of(context).pop();
                              _showPremiumStore();
                            },
                            icon: const Icon(
                              Icons.store,
                              size: 16,
                              color: Colors.blue,
                            ),
                            label: const Text(
                              'Store',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.blue,
                              ),
                            ),
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                          ),
                        ],
                      ),
                    ),
                    PremiumWorldOptionWidget(
                      worldType: 'dazzle',
                      title: 'Dazzle Bedroom',
                      description:
                          'Cozy pink bedroom with sparkling atmosphere',
                      icon: Icons.bedroom_parent,
                      currentWorldType: _currentWorldType,
                      isUnlocked: premiumService.isWorldThemeUnlocked('dazzle'),
                      onTap: () async {
                        if (!premiumService.isWorldThemeUnlocked('dazzle')) {
                          Navigator.of(context).pop();
                          _showPremiumUpgradeDialog('Dazzle Bedroom');
                          return;
                        }
                        if ('dazzle' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('dazzle');
                        }
                      },
                    ),
                    PremiumWorldOptionWidget(
                      worldType: 'forest',
                      title: 'Forest Realm',
                      description:
                          'Mystical forest with tree trunk connections',
                      icon: Icons.forest,
                      currentWorldType: _currentWorldType,
                      isUnlocked: premiumService.isWorldThemeUnlocked('forest'),
                      onTap: () async {
                        if (!premiumService.isWorldThemeUnlocked('forest')) {
                          Navigator.of(context).pop();
                          _showPremiumUpgradeDialog('Forest Realm');
                          return;
                        }
                        if ('forest' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('forest');
                        }
                      },
                    ),
                    PremiumWorldOptionWidget(
                      worldType: 'cave',
                      title: 'Cave Explorer',
                      description:
                          'Underground adventure with stalagmites and streams',
                      icon: Icons.terrain,
                      currentWorldType: _currentWorldType,
                      isUnlocked: premiumService.isWorldThemeUnlocked('cave'),
                      onTap: () async {
                        if (!premiumService.isWorldThemeUnlocked('cave')) {
                          Navigator.of(context).pop();
                          _showPremiumUpgradeDialog('Cave Explorer');
                          return;
                        }
                        if ('cave' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('cave');
                        }
                      },
                    ),
                    PremiumWorldOptionWidget(
                      worldType: 'christmas',
                      title: 'ChristmasLand',
                      description:
                          'Festive log cabin with Christmas tree and fireplace',
                      icon: Icons.celebration,
                      currentWorldType: _currentWorldType,
                      isUnlocked: premiumService.isWorldThemeUnlocked(
                        'christmas',
                      ),
                      onTap: () async {
                        if (!premiumService.isWorldThemeUnlocked('christmas')) {
                          Navigator.of(context).pop();
                          _showPremiumUpgradeDialog('ChristmasLand');
                          return;
                        }
                        if ('christmas' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('christmas');
                        }
                      },
                    ),
                    PremiumWorldOptionWidget(
                      worldType: 'tropical-paradise',
                      title: 'Tropical Paradise',
                      description:
                          'Beautiful tropical beach with palm trees and rippling water',
                      icon: Icons.beach_access,
                      currentWorldType: _currentWorldType,
                      isUnlocked: premiumService.isWorldThemeUnlocked(
                        'tropical-paradise',
                      ),
                      onTap: () async {
                        if (!premiumService.isWorldThemeUnlocked(
                          'tropical-paradise',
                        )) {
                          Navigator.of(context).pop();
                          _showPremiumUpgradeDialog('Tropical Paradise');
                          return;
                        }
                        if ('tropical-paradise' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('tropical-paradise');
                        }
                      },
                    ),
                    PremiumWorldOptionWidget(
                      worldType: 'flower-wonderland',
                      title: 'Flower Wonderland',
                      description:
                          'Field of colorful flowers with hedges and tree groves',
                      icon: Icons.local_florist,
                      currentWorldType: _currentWorldType,
                      isUnlocked: premiumService.isWorldThemeUnlocked(
                        'flower-wonderland',
                      ),
                      onTap: () async {
                        if (!premiumService.isWorldThemeUnlocked(
                          'flower-wonderland',
                        )) {
                          Navigator.of(context).pop();
                          _showPremiumUpgradeDialog('Flower Wonderland');
                          return;
                        }
                        if ('flower-wonderland' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('flower-wonderland');
                        }
                      },
                    ),
                    PremiumWorldOptionWidget(
                      worldType: 'desert-oasis',
                      title: 'Desert Oasis',
                      description:
                          'Sandy desert with palm trees and oasis water',
                      icon: Icons.landscape,
                      currentWorldType: _currentWorldType,
                      isUnlocked: premiumService.isWorldThemeUnlocked(
                        'desert-oasis',
                      ),
                      onTap: () async {
                        if (!premiumService.isWorldThemeUnlocked(
                          'desert-oasis',
                        )) {
                          Navigator.of(context).pop();
                          _showPremiumUpgradeDialog('Desert Oasis');
                          return;
                        }
                        if ('desert-oasis' != _currentWorldType) {
                          Navigator.of(context).pop();
                          await _switchToWorld('desert-oasis');
                        }
                      },
                    ),
                  ],
                ),
              ),
              actions: [const CancelButtonWidget()],
            );
          },
        );
      },
    );
  }

  // Method to show premium upgrade dialog
  void _showPremiumUpgradeDialog(String featureName) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.star, color: Colors.amber),
              SizedBox(width: 8),
              Text('Premium Feature'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$featureName is a premium feature.',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
              ),
              SizedBox(height: 12),
              Text(
                'Visit our Premium Store to unlock this feature and more!',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
              ),
              SizedBox(height: 8),
              Text(
                'For testing: use the control panel to enable features.',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                _navigateToPremiumStore();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Color(0xFF4CAF50),
                foregroundColor: Colors.white,
              ),
              child: Text('Visit Store'),
            ),
            // Only show Testing Panel button in debug mode
            if (AppConfig.showPremiumControlPanel)
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  // For testing, we can show the premium control panel
                  _showPremiumControlPanel();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.amber,
                  foregroundColor: Colors.white,
                ),
                child: Text('Testing Panel'),
              ),
          ],
        );
      },
    );
  }

  // Method to show premium control panel for testing
  void _showPremiumControlPanel() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Consumer<PremiumService>(
          builder: (context, premiumService, child) {
            return AlertDialog(
              title: Text('Premium Features (Testing)'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SwitchListTile(
                      title: Text('Dazzle Bedroom World'),
                      subtitle: Text('Cozy pink bedroom theme'),
                      value: premiumService.isWorldThemeUnlocked('dazzle'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockWorldTheme('dazzle');
                        } else {
                          premiumService.lockWorldTheme('dazzle');
                        }
                      },
                    ),
                    SwitchListTile(
                      title: Text('Forest Realm World'),
                      subtitle: Text('Mystical forest theme'),
                      value: premiumService.isWorldThemeUnlocked('forest'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockWorldTheme('forest');
                        } else {
                          premiumService.lockWorldTheme('forest');
                        }
                      },
                    ),
                    SwitchListTile(
                      title: Text('Cave Explorer World'),
                      subtitle: Text('Underground adventure with stalagmites'),
                      value: premiumService.isWorldThemeUnlocked('cave'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockWorldTheme('cave');
                        } else {
                          premiumService.lockWorldTheme('cave');
                        }
                      },
                    ),
                    SwitchListTile(
                      title: Text('ChristmasLand World'),
                      subtitle: Text('Festive log cabin with Christmas theme'),
                      value: premiumService.isWorldThemeUnlocked('christmas'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockWorldTheme('christmas');
                        } else {
                          premiumService.lockWorldTheme('christmas');
                        }
                      },
                    ),
                    Divider(),
                    Text(
                      'Gaming Levels',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue,
                      ),
                    ),
                    SwitchListTile(
                      title: Text('Gaming Level 4'),
                      subtitle: Text('Insect Safari creatures (15k+ points)'),
                      value: premiumService.isFeatureUnlocked('gaming_level_4'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockFeature('gaming_level_4');
                        } else {
                          premiumService.lockFeature('gaming_level_4');
                        }
                        // Notify JavaScript to refresh level progression
                        _notifyJavaScriptLevelRefresh();
                      },
                    ),
                    SwitchListTile(
                      title: Text('Gaming Level 5'),
                      subtitle: Text('Glowing Objects creatures (25k+ points)'),
                      value: premiumService.isFeatureUnlocked('gaming_level_5'),
                      onChanged: (value) {
                        if (value) {
                          premiumService.unlockFeature('gaming_level_5');
                        } else {
                          premiumService.lockFeature('gaming_level_5');
                        }
                        // Notify JavaScript to refresh level progression
                        _notifyJavaScriptLevelRefresh();
                      },
                    ),
                    Divider(),
                    SwitchListTile(
                      title: Text('Premium Subscription (Test)'),
                      subtitle: Text('Enable all premium features'),
                      value: premiumService.isPremiumSubscriber,
                      onChanged: (value) {
                        premiumService.setPremiumSubscription(value);
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text('Done'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // Method to navigate to Premium Store
  void _navigateToPremiumStore() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (context) => const PremiumStoreScreen()));
  }

  // Method to switch to a different world
  Future<void> _switchToWorld(String worldType) async {
    try {
      // Show loading indicator
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  strokeWidth: 2,
                ),
                const SizedBox(width: 16),
                Text(
                  'Switching to ${ThreeJsConstants.worldDisplayNames[worldType] ?? ThreeJsConstants.defaultWorldDisplayName}...',
                ),
              ],
            ),
            duration: const Duration(seconds: 2),
          ),
        );
      }

      // Call the JavaScript function to switch worlds
      await _threeJsInteropService.switchWorldTemplate(worldType);

      // Update the current world type
      setState(() {
        _currentWorldType = worldType;
      });

      // Save the new world template to persistent storage for next app launch
      await WorldPersistenceService.saveLastWorldTemplate(worldType);
      print('ThreeJsScreen: Saved world template to persistence: $worldType');

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(
                  ThreeJsConstants.checkIcon,
                  color: ThreeJsConstants.iconWhite,
                ),
                const SizedBox(width: 8),
                Text(
                  'Switched to ${ThreeJsConstants.worldDisplayNames[worldType] ?? ThreeJsConstants.defaultWorldDisplayName}',
                ),
              ],
            ),
            backgroundColor: ThreeJsConstants.successGreen,
            duration: ThreeJsConstants.snackBarDuration,
          ),
        );
      }
    } catch (e) {
      print('Error switching world: $e');

      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error, color: Colors.white),
                const SizedBox(width: 8),
                Text('Error switching world: ${e.toString()}'),
              ],
            ),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _showUndoConfirmationDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: Colors.grey[900],
          title: const Text(
            'Confirm Restore',
            style: TextStyle(color: Colors.white),
          ),
          content: const Text(
            'Are you sure you want to restore the recently deleted objects?',
            style: TextStyle(color: Colors.white),
          ),
          actions: [
            const CancelButtonWidget(useWhiteText: true),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                super.restoreFromBackup();
                setState(() {}); // Refresh the menu state
              },
              child: const Text(
                'Restore',
                style: TextStyle(color: Colors.green),
              ),
            ),
          ],
        );
      },
    );
  }

  void _showStackingCriteriaDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StackingCriteriaDialog(threeJsService: threeJsInteropService);
      },
    );
  }

  // Method to show the main options menu using the OptionsMenuWidget
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
          webViewController: _webViewController,
          hasDeletedObjects: _deletionStateService.hasDeletedObjects,
          hasRecentMoves: _hasRecentMoves,
          sortFileObjects: _sortFileObjects,
          showFileInfo: _showFileInfo,
          useFaceTextures: _useFaceTextures,
          currentWorldType: _currentWorldType,
          canUndoObjectDeletion: _deletionStateService.canUndoObjectDeletion,
          hasUndoObjectDeleteCallback: widget.onUndoObjectDelete != null,
          onUndoObjectDelete: () => performUndoObjectDelete(),
          onUndoRecentMove: () => performUndoRecentMove(),
          onSortFileObjectsChanged: (value) {
            setState(() {
              _sortFileObjects = value;
            });
            _updateDisplayOptions();
          },
          onShowFileInfoChanged: (value) {
            setState(() {
              _showFileInfo = value;
            });
            _updateDisplayOptions();
          },
          onUseFaceTexturesChanged: (value) {
            setState(() {
              _useFaceTextures = value;
            });
            _updateDisplayOptions();
          },
          onShowWorldSwitchDialog: () => _showWorldSwitchDialog(),
          onShowUndoConfirmationDialog: () => _showUndoConfirmationDialog(),
          onShowAdvancedOptionsDialog: () => showAdvancedOptionsDialog(),
          onShowDeleteOptions: () => showDeleteOptionsDialog(),
          onShowStackingCriteria: () => _showStackingCriteriaDialog(),
          onShowPremiumStore: () => _showPremiumStore(),
          onShareWithFriend: () => _shareWithFriend(),
          onShow3DMessagingSettings: () => _show3DMessagingSettings(),
          onShowCreatePath: () => _showCreatePathDialog(),
          onShowCreateFurniture: () => _showCreateFurnitureDialog(),
          onShowFurnitureManager: () => _showFurnitureManager(),
          onImportFurniture: () => _showImportFurniture(),
          getWorldDisplayName: ThreeJsUtils.getWorldDisplayName,
        );
      },
    );
  }

  // Method to show the Premium Store screen
  void _showPremiumStore() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (context) => const PremiumStoreScreen()));
  }

  // Method to handle sharing with friends
  void _shareWithFriend() async {
    try {
      print('📤 Share with Friend initiated');
      final result = await AppShareHelper.shareApp();

      if (result) {
        print('📤 Share completed successfully');

        // Show success feedback
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🎉 Thanks for sharing FirstTaps3D!'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 3),
            ),
          );
        }
      } else {
        print('📤 Share was cancelled or failed');
      }
    } catch (e) {
      print('❌ Error sharing app: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Unable to share at this time. Please try again.'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  // Method to show 3D Messaging settings dialog
  void _show3DMessagingSettings() {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.grey[900],
        child: Container(
          constraints: const BoxConstraints(maxHeight: 600),
          child: const Sms3DSettingsWidget(),
        ),
      ),
    );
  }

  // Method to show Create Path dialog
  void _showCreatePathDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        String selectedPathType = 'stepping_stones';
        int stepCount = 10;

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              backgroundColor: Colors.grey[900],
              title: const Row(
                children: [
                  Icon(Icons.route, color: Colors.orange),
                  SizedBox(width: 8),
                  Text('Create Path', style: TextStyle(color: Colors.white)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Create a playlist path for your music and videos',
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                    const SizedBox(height: 24),

                    // Path Type Selector
                    const Text(
                      'Path Type',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButton<String>(
                      value: selectedPathType,
                      isExpanded: true,
                      dropdownColor: Colors.grey[800],
                      style: const TextStyle(color: Colors.white),
                      items: const [
                        DropdownMenuItem(
                          value: 'stepping_stones',
                          child: Text('🪨 Stepping Stones'),
                        ),
                        DropdownMenuItem(
                          value: 'gallery_walk',
                          child: Text('🖼️ Gallery Walk'),
                        ),
                        // Spiral and Mountain disabled - need vertical placement UI
                        // DropdownMenuItem(
                        //   value: 'spiral_staircase',
                        //   child: Text('🌀 Spiral Staircase'),
                        // ),
                        // DropdownMenuItem(
                        //   value: 'mountain_trail',
                        //   child: Text('⛰️ Mountain Trail'),
                        // ),
                      ],
                      onChanged: (value) {
                        setState(() {
                          selectedPathType = value!;
                        });
                      },
                    ),
                    const SizedBox(height: 24),

                    // Step Count Slider
                    const Text(
                      'Number of Steps',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Slider(
                            value: stepCount.toDouble(),
                            min: 5,
                            max: 30,
                            divisions: 25,
                            activeColor: Colors.orange,
                            label: stepCount.toString(),
                            onChanged: (value) {
                              setState(() {
                                stepCount = value.toInt();
                              });
                            },
                          ),
                        ),
                        SizedBox(
                          width: 40,
                          child: Text(
                            stepCount.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Max objects per path: 30',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text(
                    'Cancel',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange,
                  ),
                  onPressed: () async {
                    Navigator.pop(context);

                    // Call JavaScript to create the path
                    try {
                      await _webViewController.runJavaScript('''
                        (async function() {
                          if (window.app?.pathManager) {
                            // Check if we can add more paths
                            if (!window.app.pathManager.canAddPath()) {
                              alert('Maximum of 3 paths per world reached');
                              return;
                            }
                            
                            // Create new path using PathManager (includes visualization)
                            const path = await window.app.pathManager.createPath({
                              type: '$selectedPathType',
                              stepCount: $stepCount,
                              position: { x: 0, y: 0, z: 0 }
                            });
                            
                            if (path) {
                              console.log('🛤️ Path created with visualization:', path.id);
                              // Path created successfully - no alert needed
                            } else {
                              console.error('Failed to create path');
                            }
                          } else {
                            console.error('PathManager not available');
                            alert('Path system not ready yet. Please try again in a moment.');
                          }
                        })();
                      ''');

                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Path created successfully!'),
                            backgroundColor: Colors.green,
                            duration: Duration(seconds: 2),
                          ),
                        );
                      }
                    } catch (e) {
                      print('Error creating path: \$e');
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Error creating path: \$e'),
                            backgroundColor: Colors.red,
                            duration: const Duration(seconds: 3),
                          ),
                        );
                      }
                    }
                  },
                  child: const Text('Create Path'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // Method to show Furniture Manager screen
  void _showFurnitureManager() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => FurnitureManagerScreen(
          webViewController: _webViewController,
          threeJsInteropService: _threeJsInteropService,
        ),
      ),
    );
  }

  // Method to show Import Furniture dialog
  void _showImportFurniture() {
    // Initialize import service if not already done
    _furnitureImportService ??= FurnitureImportService(_webViewController);

    // Show the import dialog with manual paste code entry
    FurnitureImportService.showImportDialog(context, _furnitureImportService!);
  }

  // Method to show Add Content Menu popup (replaces old furniture-only menu)
  void _showFurnitureMenu() {
    // Get the controller from Provider
    final controller = Provider.of<HomePageController>(context, listen: false);

    showDialog(
      context: context,
      barrierDismissible: true, // Allow tapping outside to dismiss
      barrierColor: Colors.black26, // Semi-transparent dark background
      builder: (BuildContext context) {
        return Material(
          color: Colors.transparent,
          child: GestureDetector(
            onTap: () => Navigator.pop(context), // Dismiss on tap outside
            child: Stack(
              children: [
                // Positioned near the add button (top right area)
                Positioned(
                  top:
                      MediaQuery.of(context).padding.top +
                      60, // Below the button
                  right: 10, // Align with right edge for better visibility
                  child: GestureDetector(
                    onTap: () {}, // Prevent dismissal when tapping menu
                    child: AddContentMenuWidget(
                      onAddFiles: () => controller.addFilesAndNavigate(context),
                      onSearchMusic: () =>
                          controller.searchMusicAndNavigate(context),
                      onAddLink: () => controller.addLinkAndNavigate(context),
                      onAddApps: () => controller.addAppsAndNavigate(context),
                      onAddContacts: () =>
                          controller.addContactsAndNavigate(context),
                      onAddFurniture: _showCreateFurnitureDialog,
                      onAddPath: _showCreatePathDialog,
                      onOpenFurnitureManager: _showFurnitureManager,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // Method to show Create Furniture dialog
  void _showCreateFurnitureDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        String selectedFurnitureType = 'bookshelf';
        String selectedMaterial = 'marble'; // Default to marble
        bool importFromPlaylist = false; // Playlist import mode
        final TextEditingController playlistController =
            TextEditingController();

        // Get capacity for selected furniture type
        int getFurnitureCapacity(String type) {
          switch (type) {
            case 'bookshelf':
              return 10;
            case 'riser':
              return 20;
            case 'gallery_wall':
              return 10;
            case 'stage_small':
              return 30;
            case 'stage_large':
              return 50;
            case 'amphitheatre':
              return 80;
            default:
              return 10;
          }
        }

        return StatefulBuilder(
          builder: (context, setState) {
            final int capacity = getFurnitureCapacity(selectedFurnitureType);

            return AlertDialog(
              backgroundColor: Colors.grey[900],
              title: const Row(
                children: [
                  Icon(Icons.weekend, color: Colors.blue),
                  SizedBox(width: 8),
                  Text('Add Furniture', style: TextStyle(color: Colors.white)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Add furniture to organize your media collection',
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                    const SizedBox(height: 16),

                    // Playlist Import Checkbox
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Create from playlist',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      subtitle: const Text(
                        'Paste media links to populate furniture',
                        style: TextStyle(color: Colors.white60, fontSize: 12),
                      ),
                      value: importFromPlaylist,
                      activeColor: Colors.blue,
                      onChanged: (value) {
                        setState(() {
                          importFromPlaylist = value!;
                        });
                      },
                    ),
                    const SizedBox(height: 12),

                    // Furniture Type Selector
                    const Text(
                      'Furniture Type',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButton<String>(
                      value: selectedFurnitureType,
                      isExpanded: true,
                      dropdownColor: Colors.grey[800],
                      style: const TextStyle(color: Colors.white),
                      items: const [
                        DropdownMenuItem(
                          value: 'bookshelf',
                          child: Text('📚 Bookshelf (10 objects)'),
                        ),
                        DropdownMenuItem(
                          value: 'riser',
                          child: Text('📊 Riser (20 objects)'),
                        ),
                        DropdownMenuItem(
                          value: 'gallery_wall',
                          child: Text('🖼️ Gallery Wall (10 objects)'),
                        ),
                        DropdownMenuItem(
                          value: 'stage_small',
                          child: Text('🎭 Small Stage (30 objects)'),
                        ),
                        DropdownMenuItem(
                          value: 'stage_large',
                          child: Text('🎪 Large Stage (50 objects)'),
                        ),
                        DropdownMenuItem(
                          value: 'amphitheatre',
                          child: Text('🏛️ Amphitheatre (80 objects)'),
                        ),
                      ],
                      onChanged: (value) {
                        setState(() {
                          selectedFurnitureType = value!;
                        });
                      },
                    ),
                    const SizedBox(height: 12),

                    // Material Selector
                    const Text(
                      'Material',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 6),
                    DropdownButton<String>(
                      value: selectedMaterial,
                      isExpanded: true,
                      dropdownColor: Colors.grey[800],
                      style: const TextStyle(color: Colors.white, fontSize: 14),
                      isDense: true,
                      items: const [
                        DropdownMenuItem(
                          value: 'marble',
                          child: Text('⚪ Marble (White)'),
                        ),
                        DropdownMenuItem(
                          value: 'woodgrain',
                          child: Text('🟤 Woodgrain (Brown)'),
                        ),
                        DropdownMenuItem(
                          value: 'metal',
                          child: Text('⚫ Metal (Black)'),
                        ),
                        DropdownMenuItem(
                          value: 'silver',
                          child: Text('⚪ Metal (Silver)'),
                        ),
                      ],
                      onChanged: (value) {
                        setState(() {
                          selectedMaterial = value!;
                        });
                      },
                    ),
                    const SizedBox(height: 12),

                    // Playlist URL Input (shown only when importFromPlaylist is enabled)
                    if (importFromPlaylist) ...[
                      const Text(
                        'Playlist URLs',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: playlistController,
                        maxLines: 8,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText:
                              'Paste URLs (one per line):\nhttps://youtube.com/watch?v=...\nhttps://open.spotify.com/track/...',
                          hintStyle: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12,
                          ),
                          border: OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.grey[700]!),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.grey[700]!),
                          ),
                          focusedBorder: const OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.blue),
                          ),
                          filled: true,
                          fillColor: Colors.grey[850],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Will import up to $capacity URLs (furniture capacity)',
                        style: TextStyle(color: Colors.grey[500], fontSize: 11),
                      ),
                      const SizedBox(height: 12),
                    ],

                    Text(
                      'Furniture will be placed at the center of the world',
                      style: TextStyle(color: Colors.grey[500], fontSize: 11),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text(
                    'Cancel',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                  onPressed: () async {
                    print('🔍 [CREATE BTN] Button pressed!');
                    print(
                      '🔍 [CREATE BTN] importFromPlaylist = $importFromPlaylist',
                    );

                    Navigator.pop(context);
                    print('🔍 [CREATE BTN] Dialog closed');

                    // Parse playlist URLs if in playlist mode
                    List<String> playlistUrls = [];
                    if (importFromPlaylist) {
                      print('🔍 [CREATE BTN] Entering playlist mode');
                      final urlText = playlistController.text.trim();
                      print('🔍 [CREATE BTN] URL text: "$urlText"');

                      if (urlText.isEmpty) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Please enter at least one URL'),
                              backgroundColor: Colors.orange,
                              duration: Duration(seconds: 2),
                            ),
                          );
                        }
                        return;
                      }

                      // Parse URLs (one per line)
                      playlistUrls = urlText
                          .split('\n')
                          .map((line) => line.trim())
                          .where(
                            (line) =>
                                line.isNotEmpty &&
                                (line.startsWith('http://') ||
                                    line.startsWith('https://')),
                          )
                          .take(capacity)
                          .toList();

                      if (playlistUrls.isEmpty) {
                        print(
                          '🔍 [CREATE BTN] No valid URLs found, showing error',
                        );
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('No valid URLs found'),
                              backgroundColor: Colors.orange,
                              duration: Duration(seconds: 2),
                            ),
                          );
                        }
                        return;
                      }

                      print(
                        '🔍 [CREATE BTN] Parsed ${playlistUrls.length} URLs:',
                      );
                      for (int i = 0; i < playlistUrls.length; i++) {
                        print('🔍 [CREATE BTN]   [$i]: ${playlistUrls[i]}');
                      }
                    } else {
                      print('🔍 [CREATE BTN] NOT in playlist mode');
                    }

                    print(
                      '🔍 [CREATE BTN] About to create furniture: $selectedFurnitureType',
                    );

                    // Clear last furniture ID before creating new one
                    _lastCreatedFurnitureId = null;
                    print('🔍 [CREATE BTN] Cleared last furniture ID');

                    // Set up a completer to wait for furniture creation
                    String? furnitureId;

                    // Call JavaScript to create the furniture
                    try {
                      print(
                        '🔍 [CREATE BTN] Calling JS to create furniture...',
                      );

                      // Trigger furniture creation (fire-and-forget, will get ID from event)
                      await _webViewController.runJavaScript('''
                        (async function() {
                          if (window.app?.furnitureManager) {
                            await window.app.furnitureManager.createFurniture({
                              type: '$selectedFurnitureType',
                              position: { x: 0, y: 0, z: 0 },
                              style: '$selectedMaterial'
                            });
                          } else {
                            console.error('❌ FurnitureManager not available');
                          }
                        })();
                      ''');

                      print(
                        '🔍 [CREATE BTN] Furniture creation triggered, waiting for ID...',
                      );

                      // Wait for furniture creation event (with 5 second timeout)
                      await Future.delayed(const Duration(milliseconds: 500));

                      // Get the most recently created furniture ID from _lastCreatedFurnitureId
                      if (_lastCreatedFurnitureId != null) {
                        furnitureId = _lastCreatedFurnitureId;
                        print('🔍 [CREATE BTN] Got furniture ID: $furnitureId');
                      } else {
                        throw Exception('Furniture creation timed out');
                      }

                      print(
                        '🔍 [CREATE BTN] Furniture created successfully: $furnitureId',
                      );

                      // CRITICAL DEBUG: Log variables before condition check
                      print('🔍 [DEBUG] Before playlist check:');
                      print('🔍 importFromPlaylist = $importFromPlaylist');
                      print(
                        '🔍 playlistUrls.isEmpty = ${playlistUrls.isEmpty}',
                      );
                      print('🔍 playlistUrls.length = ${playlistUrls.length}');
                      print('🔍 playlistUrls = $playlistUrls');

                      // If in playlist mode, populate with URLs
                      if (importFromPlaylist && playlistUrls.isNotEmpty) {
                        print(
                          '📦 [PLAYLIST] Starting import of ${playlistUrls.length} URLs',
                        );
                        int successCount = 0;
                        int failCount = 0;

                        for (int i = 0; i < playlistUrls.length; i++) {
                          final url = playlistUrls[i];
                          print(
                            '📦 [PLAYLIST] Processing URL ${i + 1}/${playlistUrls.length}: $url',
                          );

                          try {
                            final createResult = await _webViewController
                                .runJavaScriptReturningResult('''
                              (async function() {
                                try {
                                  const url = ${jsonEncode(url)};
                                  const furnitureId = ${jsonEncode(furnitureId)};
                                  
                                  console.log('📦 [PLAYLIST JS] Creating object from URL:', url);
                                  
                                  // Check if urlManager exists
                                  if (!window.app?.urlManager) {
                                    console.error('❌ urlManager not available');
                                    return JSON.stringify({ success: false, error: 'urlManager not available' });
                                  }
                                  
                                  // Create link object using urlManager
                                  const newObject = await window.app.urlManager.createLinkFromURL(url);
                                  
                                  if (!newObject) {
                                    console.error('❌ Failed to create object from URL:', url);
                                    return JSON.stringify({ success: false, error: 'Failed to create object' });
                                  }
                                  
                                  console.log('✅ [PLAYLIST JS] Object created:', newObject.userData.id);
                                  
                                  // Wait for object to be fully initialized
                                  await new Promise(resolve => setTimeout(resolve, 200));
                                  
                                  // Add object to furniture
                                  console.log('🪑 [PLAYLIST JS] Adding to furniture:', furnitureId);
                                  const slotIndex = await window.app.furnitureManager.addObjectToFurniture(
                                    furnitureId,
                                    newObject.userData.id
                                  );
                                  
                                  if (slotIndex !== -1) {
                                    console.log('✅ [PLAYLIST JS] Object added to furniture at slot:', slotIndex);
                                    return JSON.stringify({ success: true, slotIndex: slotIndex, objectId: newObject.userData.id });
                                  } else {
                                    console.warn('⚠️ Furniture full or failed to add object');
                                    return JSON.stringify({ success: false, error: 'Furniture full' });
                                  }
                                } catch (error) {
                                  console.error('❌ [PLAYLIST JS] Error:', error.message || error);
                                  return JSON.stringify({ success: false, error: error.message || String(error) });
                                }
                              })();
                            ''');

                            // Parse result
                            final result = jsonDecode(createResult.toString());
                            if (result['success'] == true) {
                              successCount++;
                              print(
                                '✅ [PLAYLIST] Object ${i + 1} added to slot ${result['slotIndex']}',
                              );
                            } else {
                              failCount++;
                              print(
                                '❌ [PLAYLIST] Failed to add object ${i + 1}: ${result['error']}',
                              );
                            }

                            // Delay between objects
                            await Future.delayed(
                              const Duration(milliseconds: 250),
                            );
                          } catch (e) {
                            print(
                              '❌ [PLAYLIST] Error adding URL to furniture: $e',
                            );
                            failCount++;
                          }
                        }

                        print(
                          '📦 [PLAYLIST] Import complete: $successCount success, $failCount failed',
                        );

                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Furniture created with $successCount/${playlistUrls.length} items',
                              ),
                              backgroundColor: successCount > 0
                                  ? Colors.green
                                  : Colors.orange,
                              duration: const Duration(seconds: 3),
                            ),
                          );
                        }
                      } else {
                        print('🔍 [DEBUG] Condition check failed:');
                        print('🔍   importFromPlaylist = $importFromPlaylist');
                        print(
                          '🔍   playlistUrls.isNotEmpty = ${playlistUrls.isNotEmpty}',
                        );
                        print('🔍   Skipping playlist import');

                        // Regular furniture creation (no playlist)
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Furniture added successfully!'),
                              backgroundColor: Colors.green,
                              duration: Duration(seconds: 2),
                            ),
                          );
                        }
                      }
                    } catch (e, stackTrace) {
                      print('❌❌❌ EXCEPTION IN FURNITURE CREATION ❌❌❌');
                      print('Error: $e');
                      print('Stack trace: $stackTrace');
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Error creating furniture: $e'),
                            backgroundColor: Colors.red,
                            duration: const Duration(seconds: 3),
                          ),
                        );
                      }
                    }
                  },
                  child: const Text('Add Furniture'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // CRITICAL: Call super.build() to activate AutomaticKeepAliveClientMixin
    super.build(context);

    return Scaffold(
      // AppBar removed for fullscreen 3D experience
      body: _isWebViewInitialized
          ? Column(
              children: [
                // Main content area with WebView and UI elements
                Expanded(
                  child: Stack(
                    children: [
                      // WebViewWidget still needs the controller for its own setup
                      WebViewWidget(controller: _webViewController),

                      // Floating Options Button - Top Left
                      Positioned(
                        top: MediaQuery.of(context).padding.top + 10,
                        left: 10,
                        child: MiniFloatingActionButtonWidget(
                          onPressed: _showOptionsMenu,
                          icon: Icons.more_vert,
                        ),
                      ),

                      // Floating Explore Button - Top Left (next to options button)
                      Positioned(
                        top: MediaQuery.of(context).padding.top + 10,
                        left:
                            58, // Position next to options button with spacing
                        child: MiniFloatingActionButtonWidget(
                          onPressed: _toggleExploreMode,
                          icon: _navigationMode == 0
                              ? Icons
                                    .visibility // Default mode - eye icon
                              : _navigationMode == 1
                              ? Icons
                                    .map_outlined // EasyNav mode
                              : Icons.directions_walk, // Explore mode
                        ),
                      ),

                      // World Switch Button - Top Left (next to explore button)
                      Positioned(
                        top: MediaQuery.of(context).padding.top + 10,
                        left:
                            106, // Position next to explore button with spacing
                        child: MiniFloatingActionButtonWidget(
                          onPressed: _showWorldSwitchDialog,
                          icon: Icons.public,
                        ),
                      ),

                      // View as List Button - Top Left (below World Switch button)
                      Positioned(
                        top: MediaQuery.of(context).padding.top + 58,
                        left: 10,
                        child: MiniFloatingActionButtonWidget(
                          onPressed: () {
                            // Navigate to Furniture Manager (2D view)
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => FurnitureManagerScreen(
                                  webViewController: _webViewController,
                                  threeJsInteropService: _threeJsInteropService,
                                ),
                              ),
                            );
                          },
                          icon: Icons.view_list,
                        ),
                      ),

                      // Furniture Button - Top Right (to the left of search toggle)
                      Positioned(
                        top: MediaQuery.of(context).padding.top + 10,
                        right: _isSearchActive
                            ? 360 // Adjust position when search is active
                            : (MediaQuery.of(context).orientation ==
                                      Orientation.landscape
                                  ? 256 // Further left in landscape to clear toggle button
                                  : 206), // Left of toggle in portrait
                        child: MiniFloatingActionButtonWidget(
                          onPressed: _showFurnitureMenu,
                          icon: Icons.add, // Plus icon for Add Content
                        ),
                      ),

                      // Search Mode Toggle - Top Right (left of search box)
                      Positioned(
                        top: MediaQuery.of(context).padding.top + 10,
                        right: _isSearchActive
                            ? 208 // Left of search box when active
                            : (MediaQuery.of(context).orientation ==
                                      Orientation.portrait
                                  ? 158 // Left of narrower search box in portrait
                                  : 208), // Left of wider search box in landscape
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _searchMode = _searchMode == 'world'
                                  ? 'platform'
                                  : 'world';
                              _searchController.clear();
                              _isSearchActive = false;
                            });
                          },
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: _searchMode == 'platform'
                                  ? Colors.red.withOpacity(0.8)
                                  : Colors.black.withOpacity(0.8),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Colors.white.withOpacity(0.3),
                                width: 1,
                              ),
                            ),
                            child: Icon(
                              _searchMode == 'world'
                                  ? Icons
                                        .search // World object search icon
                                  : Icons.audiotrack, // Platform search icon
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        ),
                      ),

                      // Search Box - Top Right (always visible)
                      Positioned(
                        top: MediaQuery.of(context).padding.top + 10,
                        right: _isSearchActive
                            ? 160 // Leave more space for wider "Finished Searching" button
                            : 10, // Normal position when search is not active
                        child: Container(
                          width:
                              MediaQuery.of(context).orientation ==
                                  Orientation.portrait
                              ? 150 // Narrower in portrait to make room for furniture button
                              : 200, // Full width in landscape
                          height: 40,
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.8),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: _isSearchActive
                                  ? (_searchMode == 'platform'
                                        ? Colors.red
                                        : Colors.blue)
                                  : Colors.white.withOpacity(0.3),
                              width: 1,
                            ),
                          ),
                          child: TextField(
                            controller: _searchController,
                            focusNode: _searchFocusNode,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                            ),
                            decoration: InputDecoration(
                              hintText: _searchMode == 'world'
                                  ? 'Search objects...'
                                  : 'Search music & videos...',
                              hintStyle: TextStyle(
                                color: Colors.white.withOpacity(0.6),
                                fontSize: 14,
                              ),
                              prefixIcon: Icon(
                                Icons.search,
                                color: Colors.white.withOpacity(0.8),
                                size: 20,
                              ),
                              suffixIcon: _searchController.text.isNotEmpty
                                  ? IconButton(
                                      icon: Icon(
                                        Icons.clear,
                                        color: Colors.white.withOpacity(0.8),
                                        size: 16,
                                      ),
                                      onPressed: () {
                                        _searchController.clear();
                                        setState(() {});
                                      },
                                    )
                                  : null,
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 8,
                              ),
                            ),
                            onSubmitted: (_) => _handleSearchSubmit(),
                            onChanged: (value) {
                              setState(
                                () {},
                              ); // Refresh to show/hide clear button
                            },
                          ),
                        ),
                      ),

                      // Search Done Button - Top Right (visible when search is active)
                      if (_isSearchActive)
                        Positioned(
                          top: MediaQuery.of(context).padding.top + 10,
                          right: 10,
                          child: ElevatedButton.icon(
                            onPressed: _finishSearch,
                            icon: const Icon(Icons.done, size: 18),
                            label: const Text(
                              'Finished Searching',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green.withOpacity(0.9),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                              elevation: 4,
                            ),
                          ),
                        ),

                      // Search Results Count Indicator - REMOVED (not needed)

                      // POLISH PHASE: Axis Selection Status Overlay
                      if (_showAxisIndicators && _currentSelectedAxis != null)
                        Positioned(
                          top: 80,
                          left: 16,
                          right: 16,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.blue.withOpacity(0.9),
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  ThreeJsConstants
                                          .axisIcons[_currentSelectedAxis!] ??
                                      ThreeJsConstants.defaultAxisIcon,
                                  color: Colors.white,
                                  size: 24,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'Movement Mode: ${ThreeJsConstants.axisDisplayNames[_currentSelectedAxis!] ?? ThreeJsConstants.defaultAxisDisplayName}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      if (_statusMessage.isNotEmpty)
                                        Text(
                                          _statusMessage,
                                          style: const TextStyle(
                                            color: Colors.white70,
                                            fontSize: 12,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                      Positioned(
                        bottom: 24,
                        right:
                            24, // Position in bottom-right corner for better landscape usage
                        child: CameraControls(
                          // Focus on object feature replaces zoom functionality
                          onHome: () => _threeJsInteropService.resetHomeView(),
                        ),
                      ),

                      // SMS Text Input Widget - Positioned at bottom when visible
                      // Enhanced positioning for landscape mode support
                      Builder(
                        builder: (context) {
                          final screenSize = MediaQuery.of(context).size;
                          final isLandscape =
                              MediaQuery.of(context).orientation ==
                              Orientation.landscape;
                          final screenWidth = screenSize.width;

                          // In landscape mode, position in left half (40% width) for better text input visibility
                          // In portrait mode, use full width as before
                          if (isLandscape && _isSmsInputVisible) {
                            return Positioned(
                              bottom: 20,
                              left: 20,
                              width:
                                  screenWidth *
                                  0.40, // Reduced from 48% to 40% width
                              child: SmsTextInputWidget(
                                contactId: _currentSmsContactId,
                                webViewController: _isWebViewInitialized
                                    ? _webViewController
                                    : null,
                                isVisible: _isSmsInputVisible,
                                onClose: _closeSmsInput,
                                onSend: _sendSmsMessage,
                                isLandscapeMode: true,
                              ),
                            );
                          } else {
                            // Portrait mode or SMS not visible - use original full-width positioning
                            return Positioned(
                              bottom: 20,
                              left: 20,
                              right: 20,
                              child: SmsTextInputWidget(
                                contactId: _currentSmsContactId,
                                webViewController: _isWebViewInitialized
                                    ? _webViewController
                                    : null,
                                isVisible: _isSmsInputVisible,
                                onClose: _closeSmsInput,
                                onSend: _sendSmsMessage,
                                isLandscapeMode: false,
                              ),
                            );
                          }
                        },
                      ),

                      // Professional Loading Overlay - Shows until 3D world is ready
                      // Note: Not const to allow internal state updates (rotating messages)
                      if (!_isWorldReady) LoadingScreenOverlay(),
                    ],
                  ),
                ),
                // AdMob Banner Ad - Fixed row at bottom (FREE tier users only)
                const BannerAdWidget(),
              ],
            )
          : LoadingScreenOverlay(), // No hardcoded message - use rotating messages
    );
  }

  @override
  void dispose() {
    print(
      "❌ ThreeJsScreen DISPOSE called - This should NOT happen on back from browser!",
    );
    print(
      "❌ If you see this after returning from browser, AutomaticKeepAlive is not working",
    );

    // Remove app lifecycle observer
    WidgetsBinding.instance.removeObserver(this);

    // Restore normal system UI mode when leaving the screen
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

    // Clean up the axis menu timer
    _axisMenuTimer?.cancel();
    _axisIndicatorTimer?.cancel();

    // Clean up deep link subscription
    _deepLinkSubscription?.cancel();

    // Clean up JavaScript channels helper
    _jsChannels.dispose();

    // Clean up search resources
    _searchController.dispose();
    _searchFocusNode.dispose();

    // Clear static reference
    if (ThreeJsScreen._currentInstance == this) {
      ThreeJsScreen._currentInstance = null;
    }

    super.dispose();
  }

  // =============================================================================
  // SMS TEXT INPUT METHODS
  // =============================================================================

  /// Show SMS text input for a specific contact
  @override
  void showSmsInput(String contactId) {
    setState(() {
      _currentSmsContactId = contactId;
      _isSmsInputVisible = true;
    });
    print('📱 SMS input activated for contact: $contactId');
  }

  /// Hide SMS text input
  void _closeSmsInput() {
    // Store the current contact ID before clearing it for the event dispatch
    final String? contactIdForEvent = _currentSmsContactId;

    print(
      '📱 🔥 SMS X BUTTON PRESSED - CLOSING TEXT INPUT for contact: $contactIdForEvent',
    );

    setState(() {
      _isSmsInputVisible = false;
      _currentSmsContactId = null;
    });

    // Dispatch flutter-keyboard-closed event to JavaScript for bidirectional close functionality
    _dispatchFlutterKeyboardClosedEvent(contactIdForEvent);

    print('📱 ✅ Text input HIDDEN - State updated to invisible');
    print('📱 SMS input deactivated');
  }

  /// Dispatch flutter-keyboard-closed event to JavaScript
  /// This enables bidirectional close functionality - when Flutter X button is tapped,
  /// the JavaScript SMS screen will also close automatically
  Future<void> _dispatchFlutterKeyboardClosedEvent(String? contactId) async {
    try {
      await _webViewController.runJavaScript('''
        (function() {
          try {
            const event = new CustomEvent('flutter-keyboard-closed', {
              detail: {
                contactId: ${contactId != null ? "'$contactId'" : 'null'},
                timestamp: Date.now(),
                source: 'flutter-text-input-widget'
              }
            });
            window.dispatchEvent(event);
            console.log('📤 [Flutter] Dispatched flutter-keyboard-closed event for contact: ${contactId ?? 'null'}');
            return 'success';
          } catch (error) {
            console.error('📱 [Flutter] Failed to dispatch flutter-keyboard-closed:', error);
            return 'error: ' + error.message;
          }
        })();
      ''');

      print(
        '📤 [Flutter] Dispatched flutter-keyboard-closed event to JavaScript for contact: ${contactId ?? 'null'}',
      );
    } catch (error) {
      print(
        '❌ [Flutter] Error dispatching flutter-keyboard-closed event: $error',
      );
    }
  }

  /// Send SMS message
  void _sendSmsMessage(String message) {
    if (_currentSmsContactId == null || message.trim().isEmpty) {
      print('📱 Cannot send SMS: missing contact ID or message');
      return;
    }

    print('📱 Sending SMS: "$message" to contact: $_currentSmsContactId');

    // Send SMS via SMS Channel Manager
    _smsChannelManager
        .sendSmsMessage(_currentSmsContactId!, message)
        .then((success) {
          if (success) {
            print('📱 SMS sent successfully');
          } else {
            print('❌ Failed to send SMS');
          }
        })
        .catchError((error) {
          print('❌ Failed to send SMS: $error');
        });
  }

  /// Notify JavaScript entity manager to refresh level progression
  void _notifyJavaScriptLevelRefresh() {
    final premiumService = PremiumService.instance;

    // Check current state of gaming levels
    final level4Unlocked = premiumService.isFeatureUnlocked('gaming_level_4');
    final level5Unlocked = premiumService.isFeatureUnlocked('gaming_level_5');

    print(
      '🎮 FLUTTER → JS: Level 4 unlocked: $level4Unlocked, Level 5 unlocked: $level5Unlocked',
    );

    // Convert booleans to string literals for JavaScript
    final level4JS = level4Unlocked ? 'true' : 'false';
    final level5JS = level5Unlocked ? 'true' : 'false';

    // Directly enable/disable gaming levels in JavaScript like world theme switching
    _webViewController.runJavaScript('''
      console.log('🎮 FLUTTER → JS: Setting gaming levels - Level 4: $level4JS, Level 5: $level5JS');
      
      if (window.app && window.app.svgEntityManager) {
        // Directly set gaming level availability (like world theme switching)
        window.app.svgEntityManager.setPremiumLevelsEnabled({
          level4: $level4JS,
          level5: $level5JS
        });
        
        console.log('🎮 FLUTTER → JS: Refreshing level progression after direct level update');
        if (typeof window.app.svgEntityManager.refreshLevelProgression === 'function') {
          window.app.svgEntityManager.refreshLevelProgression();
        }
      } else {
        console.warn('🎮 FLUTTER → JS: Entity manager not found - checking window.app:', !!window.app);
        if (window.app) {
          console.warn('🎮 FLUTTER → JS: app.svgEntityManager available:', !!window.app.svgEntityManager);
        }
      }
    ''');
  }
}
