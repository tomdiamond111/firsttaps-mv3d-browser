import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firsttaps_mv3d/services/app_service.dart';
import 'package:firsttaps_mv3d/controllers/home_page_controller.dart';
import 'package:firsttaps_mv3d/screens/three_js_screen.dart';
import 'dart:async';
import 'dart:developer' as developer;

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() {
    print('🔥 SplashScreen: createState() called');
    return _SplashScreenState();
  }
}

class _SplashScreenState extends State<SplashScreen> {
  bool _appsLoaded = false;
  bool _minimumTimeReached = false;
  Timer? _navigationTimer;
  Timer? _minimumTimeTimer;

  @override
  void initState() {
    super.initState();
    print('🔥 SplashScreen: initState() called');
    final startTime = DateTime.now();
    developer.log(
      '🚀 Splash screen started at ${startTime.toIso8601String()}',
      name: 'SplashScreen',
    );

    // Start loading apps immediately
    print('🔥 SplashScreen: About to call _startAppLoading()');
    _startAppLoading();

    // Set maximum timeout (10 seconds) - only to prevent infinite loading
    print('🔥 SplashScreen: Setting up 10-second maximum timeout');
    _navigationTimer = Timer(const Duration(seconds: 10), () {
      print('🔥 SplashScreen: 10-second maximum timeout fired!');
      final endTime = DateTime.now();
      final duration = endTime.difference(startTime);
      developer.log(
        '⏱️ Maximum timeout fired after ${duration.inMilliseconds}ms',
        name: 'SplashScreen',
      );

      if (mounted) {
        print('🔥 SplashScreen: Maximum timeout reached, forcing navigation');
        _navigateToHomePage();
      } else {
        print('🔥 SplashScreen: Widget not mounted, skipping navigation');
      }
    });
  }

  /// Start loading apps in the background
  void _startAppLoading() async {
    try {
      print('🔥 SplashScreen: _startAppLoading() called');
      developer.log('📱 Starting app loading...', name: 'SplashScreen');
      print('🔥 SplashScreen: About to get Provider');
      final appService = Provider.of<AppService>(context, listen: false);
      print('🔥 SplashScreen: Got AppService, calling getInstalledApps()');

      final apps = await appService.getInstalledApps();
      print(
        '🔥 SplashScreen: getInstalledApps() completed with ${apps.length} apps',
      );

      if (mounted) {
        print('🔥 SplashScreen: Widget still mounted, updating state');
        setState(() {
          _appsLoaded = true;
        });
        developer.log(
          '✅ Apps loaded successfully: ${apps.length} apps',
          name: 'SplashScreen',
        );
        print('🔥 SplashScreen: State updated, apps loaded = $_appsLoaded');

        // Now that apps are loaded, start the minimum display timer (3 seconds)
        print(
          '🔥 SplashScreen: Apps loaded! Starting 3-second minimum display timer',
        );
        _minimumTimeTimer = Timer(const Duration(seconds: 3), () {
          print('🔥 SplashScreen: 3-second minimum display timer fired!');
          setState(() {
            _minimumTimeReached = true;
          });
          // Apps are loaded AND minimum time has passed - navigate now
          if (mounted) {
            print(
              '🔥 SplashScreen: Both conditions met, navigating to HomePage',
            );
            _navigateToHomePage();
          }
        });
      } else {
        print('🔥 SplashScreen: Widget not mounted, skipping state update');
      }
    } catch (e) {
      print('🔥 SplashScreen: ERROR in _startAppLoading: $e');
      developer.log('❌ App loading failed: $e', name: 'SplashScreen');
      // Continue anyway - we'll handle the error in HomePage
      if (mounted) {
        setState(() {
          _appsLoaded = false;
        });
      }
    }
  }

  /// Navigate directly to 3D World (ThreeJsScreen)
  void _navigateToHomePage() {
    final currentTime = DateTime.now();
    developer.log(
      '🏠 Navigating to 3D World at ${currentTime.toIso8601String()} (apps loaded: $_appsLoaded)',
      name: 'SplashScreen',
    );

    // Get controller and navigate with all required callbacks
    final controller = Provider.of<HomePageController>(context, listen: false);

    // Wait a bit for persisted files to load (they load async in controller constructor)
    // This ensures previously saved objects appear in the 3D world
    Future.delayed(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      _performNavigation(controller);
      // Note: First-launch instructions now shown from ThreeJsScreen after objects load
    });
  }

  void _performNavigation(HomePageController controller) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => ThreeJsScreen(
          filesToDisplay: controller.files,
          onFileDeleted: controller.handleFileDeleted,
          onFileMoved: controller.handleFileMoved,
          onLinkObjectAdded: controller.handleLinkObjectAdded,
          onSetInteropService: controller.setThreeJsInteropService,
          onUndoObjectDelete: controller.undoDeleteObject,
          onDeleteAllObjects: controller.handleDeleteAllObjects,
          onLinkNameChanged: controller.handleLinkNameChanged,
          onPremiumGamingPopupRequested:
              controller.handlePremiumGamingPopupRequest,
          onGetCurrentFileState: controller.getCurrentFileStateFromStateManager,
          onFileAdded: controller.handleFileAdded,
          shouldResetCamera: true,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _navigationTimer?.cancel();
    _minimumTimeTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    print('🔥 SplashScreen: build() called');
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight:
                  MediaQuery.of(context).size.height -
                  MediaQuery.of(context).padding.top -
                  MediaQuery.of(context).padding.bottom,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // FirstTaps MV3D animated splash
                Center(
                  child: Image.asset(
                    'assets/images/FirstTapsMV3D_splash1.gif',
                    fit: BoxFit.contain,
                    // Responsive constraints
                    width:
                        MediaQuery.of(context).size.width *
                        (isLandscape ? 0.5 : 0.8),
                    height:
                        MediaQuery.of(context).size.height *
                        (isLandscape ? 0.6 : 0.8),
                  ),
                ),

                // Optional loading indicator at bottom
                Padding(
                  padding: EdgeInsets.only(bottom: isLandscape ? 20.0 : 50.0),
                  child: Column(
                    children: [
                      SizedBox(
                        width: isLandscape ? 20 : 24,
                        height: isLandscape ? 20 : 24,
                        child: const CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white,
                          ),
                        ),
                      ),
                      SizedBox(height: isLandscape ? 10 : 16),
                      Text(
                        _getProgressText(),
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: isLandscape ? 14 : 16,
                          fontWeight: FontWeight.w300,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Get progress text based on current state
  String _getProgressText() {
    if (!_appsLoaded) {
      return 'Loading apps...';
    } else if (!_minimumTimeReached) {
      return 'Almost ready...';
    } else {
      return 'Ready!';
    }
  }
}
