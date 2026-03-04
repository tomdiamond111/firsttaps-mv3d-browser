import 'package:flutter/material.dart';
import 'dart:async';

/// Professional loading screen overlay with FirstTapsMV3D branding
/// Shows during app initialization and 3D viewer loading
class LoadingScreenOverlay extends StatefulWidget {
  final String? message;
  final bool showProgress;

  const LoadingScreenOverlay({
    super.key,
    this.message,
    this.showProgress = true,
  });

  @override
  State<LoadingScreenOverlay> createState() => _LoadingScreenOverlayState();
}

class _LoadingScreenOverlayState extends State<LoadingScreenOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  int _dotCount = 0;
  Timer? _dotTimer;

  // Rotating loading messages - shows real-time progress during 20s load
  final List<String> _loadingMessages = [
    'Loading THREE.js engine',
    'Loading JavaScript bundles (4.8 MB)',
    'Initializing 3D world',
    'Creating demo content',
    'Preparing your workspace',
    'Almost ready',
  ];
  int _currentMessageIndex = 0;
  Timer? _messageTimer;

  @override
  void initState() {
    super.initState();

    // Setup pulse animation for the logo
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Animate loading dots
    _dotTimer = Timer.periodic(const Duration(milliseconds: 500), (timer) {
      if (mounted) {
        setState(() {
          _dotCount = (_dotCount + 1) % 4;
        });
      }
    });

    // Rotate through loading messages every 3.5 seconds (6 messages over ~20s)
    _messageTimer = Timer.periodic(const Duration(milliseconds: 3500), (timer) {
      if (mounted) {
        setState(() {
          _currentMessageIndex =
              (_currentMessageIndex + 1) % _loadingMessages.length;
        });
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _dotTimer?.cancel();
    _messageTimer?.cancel();
    super.dispose();
  }

  String get _dots => '.' * _dotCount;

  @override
  Widget build(BuildContext context) {
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;
    final logoSize = isLandscape ? 120.0 : 200.0;
    final verticalSpacing = isLandscape ? 20.0 : 40.0;

    return Container(
      color: Colors.black,
      child: SafeArea(
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
                SizedBox(height: isLandscape ? 10 : 20),

                // FirstTapsMV3D Logo with pulse animation
                ScaleTransition(
                  scale: _pulseAnimation,
                  child: Container(
                    padding: EdgeInsets.all(isLandscape ? 15 : 20),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: Colors.white.withOpacity(0.1),
                        width: 1,
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(15),
                      child: Image.asset(
                        'assets/images/FirstTapsMV3D_logo1.jpg',
                        width: logoSize,
                        height: logoSize,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) {
                          // Fallback to icon if main logo fails
                          return Image.asset(
                            'assets/images/FirstTapsMV3D_logo1icon.png',
                            width: logoSize,
                            height: logoSize,
                            fit: BoxFit.contain,
                          );
                        },
                      ),
                    ),
                  ),
                ),

                SizedBox(height: verticalSpacing),

                // App name
                Text(
                  'FirstTaps MV3D',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: isLandscape ? 22 : 28,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.5,
                  ),
                ),

                SizedBox(height: isLandscape ? 5 : 10),

                // Tagline
                Text(
                  'Your Media in 3D',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: isLandscape ? 14 : 16,
                    fontWeight: FontWeight.w300,
                    letterSpacing: 1.2,
                  ),
                ),

                SizedBox(height: isLandscape ? 25 : 50),

                // Modern circular progress indicator
                if (widget.showProgress)
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      // Outer glow effect
                      Container(
                        width: isLandscape ? 50 : 70,
                        height: isLandscape ? 50 : 70,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.blue.withOpacity(0.3),
                              blurRadius: 20,
                              spreadRadius: 5,
                            ),
                          ],
                        ),
                      ),
                      // Progress indicator
                      SizedBox(
                        width: isLandscape ? 45 : 60,
                        height: isLandscape ? 45 : 60,
                        child: const CircularProgressIndicator(
                          strokeWidth: 4,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.blue,
                          ),
                          backgroundColor: Colors.white12,
                        ),
                      ),
                    ],
                  ),

                SizedBox(height: isLandscape ? 15 : 30),

                // Loading message with animated dots
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 500),
                  child: Text(
                    widget.message ??
                        '${_loadingMessages[_currentMessageIndex]}$_dots',
                    key: ValueKey<String>(
                      widget.message ?? _loadingMessages[_currentMessageIndex],
                    ),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: isLandscape ? 14 : 16,
                      fontWeight: FontWeight.w400,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),

                SizedBox(height: isLandscape ? 5 : 10),

                // Reassuring subtext
                Text(
                  'Please wait, this may take a moment',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.4),
                    fontSize: isLandscape ? 11 : 13,
                    fontWeight: FontWeight.w300,
                  ),
                ),

                SizedBox(height: isLandscape ? 10 : 20),

                // Bottom decorative element
                Container(
                  margin: EdgeInsets.only(bottom: isLandscape ? 15 : 30),
                  padding: EdgeInsets.symmetric(
                    horizontal: isLandscape ? 30 : 40,
                    vertical: isLandscape ? 8 : 10,
                  ),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: Colors.white.withOpacity(0.1),
                      width: 1,
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.check_circle_outline,
                        size: isLandscape ? 14 : 16,
                        color: Colors.green.withOpacity(0.7),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Everything is loading properly',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.5),
                          fontSize: isLandscape ? 11 : 12,
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
}
