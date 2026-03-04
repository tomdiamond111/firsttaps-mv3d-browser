import 'dart:async';
import 'dart:convert';

/// ====================================================================
/// CAMERA OPTIMIZATION HELPER
/// ====================================================================
///
/// Flutter bridge for camera optimization controls and diagnostics.
/// Provides Dart interface to the new JavaScript camera optimization system.
///
/// Features:
/// - Centralized camera state management interface
/// - Smooth transition controls with configurable easing
/// - Camera diagnostics and health monitoring
/// - Cleanup and reset capabilities
/// - Performance monitoring
///
/// This helper enables Flutter to leverage the optimized JavaScript
/// camera system for smoother, more reliable navigation.

class CameraOptimizationHelper {
  // ================================================================
  // CONSTANTS
  // ================================================================

  static const String _tag = 'CameraOptimizationHelper';
  static const Duration _defaultTransitionDuration = Duration(
    milliseconds: 1000,
  );

  // ================================================================
  // PROPERTIES
  // ================================================================

  dynamic _webViewController; // Generic type to avoid import issues
  Timer? _healthCheckTimer;
  bool _isInitialized = false;
  bool _debugMode = false;

  // State tracking
  bool _isTransitioning = false;
  DateTime? _lastStateChange;
  int _transitionCount = 0;

  // Performance tracking
  List<Duration> _transitionDurations = [];
  int _resetCount = 0;

  // ================================================================
  // INITIALIZATION
  // ================================================================

  /// Initialize the camera optimization helper with a WebView controller
  Future<void> initialize(
    dynamic webViewController, {
    bool debugMode = false,
  }) async {
    _webViewController = webViewController;
    _debugMode = debugMode;

    try {
      // Check if JavaScript modules are loaded
      final bool isReady = await _checkJavaScriptModulesReady();

      if (isReady) {
        _isInitialized = true;
        _startHealthCheck();
        _log('Camera optimization system initialized successfully');
      } else {
        throw Exception('JavaScript camera optimization modules not ready');
      }
    } catch (e) {
      _log('Failed to initialize camera optimization: $e', isError: true);
      rethrow;
    }
  }

  /// Check if the JavaScript camera optimization modules are loaded
  Future<bool> _checkJavaScriptModulesReady() async {
    if (_webViewController == null) return false;

    try {
      final result = await _webViewController.runJavaScriptReturningResult('''
        (function() {
          return !!(
            window.CameraStateManager && 
            window.CameraTransitionController &&
            window.setCameraState &&
            window.getCameraState
          );
        })();
      ''');

      return result == true;
    } catch (e) {
      _log('Error checking JavaScript modules: $e', isError: true);
      return false;
    }
  }

  // ================================================================
  // CAMERA STATE MANAGEMENT
  // ================================================================

  /// Get current camera state
  Future<CameraState?> getCurrentCameraState() async {
    if (!_isInitialized || _webViewController == null) return null;

    try {
      final result = await _webViewController.runJavaScriptReturningResult('''
        (function() {
          const state = window.getCameraState();
          return JSON.stringify({
            position: {
              x: state.position.x,
              y: state.position.y,
              z: state.position.z
            },
            target: {
              x: state.target.x,
              y: state.target.y,
              z: state.target.z
            },
            isTransitioning: state.isTransitioning
          });
        })();
      ''');

      if (result != null) {
        final Map<String, dynamic> stateData = jsonDecode(result.toString());
        return CameraState.fromJson(stateData);
      }
    } catch (e) {
      _log('Error getting camera state: $e', isError: true);
    }

    return null;
  }

  /// Set camera position with smooth transition
  Future<bool> setCameraPosition(
    Vector3 position, {
    Vector3? target,
    Duration? duration,
    String easing = 'easeOutCubic',
    bool immediate = false,
  }) async {
    if (!_isInitialized || _webViewController == null) return false;

    try {
      _isTransitioning = true;
      _lastStateChange = DateTime.now();
      _transitionCount++;

      final durationMs =
          duration?.inMilliseconds ?? _defaultTransitionDuration.inMilliseconds;

      final result = await _webViewController.runJavaScriptReturningResult('''
        (function() {
          const position = new THREE.Vector3(${position.x}, ${position.y}, ${position.z});
          ${target != null ? 'const target = new THREE.Vector3(${target.x}, ${target.y}, ${target.z});' : 'const target = null;'}
          
          window.setCameraState(position, target, {
            immediate: $immediate,
            smooth: ${!immediate},
            duration: $durationMs,
            easing: '$easing'
          });
          
          return true;
        })();
      ''');

      // Track transition completion
      if (!immediate) {
        _trackTransitionCompletion(Duration(milliseconds: durationMs));
      } else {
        _isTransitioning = false;
      }

      _log(
        'Camera position set: $position${target != null ? ' -> $target' : ''}',
      );
      return result == true;
    } catch (e) {
      _log('Error setting camera position: $e', isError: true);
      _isTransitioning = false;
      return false;
    }
  }

  /// Smooth camera movement to target
  Future<bool> smoothMoveTo(
    Vector3 position, {
    Duration? duration,
    String easing = 'easeOutCubic',
  }) async {
    if (!_isInitialized || _webViewController == null) return false;

    try {
      final durationMs =
          duration?.inMilliseconds ?? _defaultTransitionDuration.inMilliseconds;

      final result = await _webViewController.runJavaScriptReturningResult('''
        (function() {
          const position = new THREE.Vector3(${position.x}, ${position.y}, ${position.z});
          window.smoothMoveCameraTo(position, {
            duration: $durationMs,
            easing: '$easing'
          });
          return true;
        })();
      ''');

      _log('Smooth move to: $position');
      return result == true;
    } catch (e) {
      _log('Error in smooth move: $e', isError: true);
      return false;
    }
  }

  /// Smooth camera look at target
  Future<bool> smoothLookAt(
    Vector3 target, {
    Duration? duration,
    String easing = 'easeOutCubic',
  }) async {
    if (!_isInitialized || _webViewController == null) return false;

    try {
      final durationMs =
          duration?.inMilliseconds ?? _defaultTransitionDuration.inMilliseconds;

      final result = await _webViewController.runJavaScriptReturningResult('''
        (function() {
          const target = new THREE.Vector3(${target.x}, ${target.y}, ${target.z});
          window.smoothLookAt(target, {
            duration: $durationMs,
            easing: '$easing'
          });
          return true;
        })();
      ''');

      _log('Smooth look at: $target');
      return result == true;
    } catch (e) {
      _log('Error in smooth look at: $e', isError: true);
      return false;
    }
  }

  // ================================================================
  // CAMERA DIAGNOSTICS & HEALTH
  // ================================================================

  /// Check camera system health
  Future<CameraHealthReport> checkCameraHealth() async {
    if (!_isInitialized || _webViewController == null) {
      return CameraHealthReport.unhealthy(
        'Camera optimization not initialized',
      );
    }

    try {
      final result = await _webViewController.runJavaScriptReturningResult('''
        (function() {
          const health = {
            isInitialized: !!(window.CameraStateManager && window.CameraTransitionController),
            hasCamera: !!(window.app && window.app.camera),
            hasControls: !!(window.app && window.app.cameraControls),
            controlsEnabled: window.app && window.app.cameraControls ? window.app.cameraControls.enabled : false,
            isTransitioning: window.isCameraTransitioning ? window.isCameraTransitioning() : false,
            activeTransitions: window.CameraTransitionController ? window.CameraTransitionController.getActiveTransitionCount() : 0
          };
          return JSON.stringify(health);
        })();
      ''');

      if (result != null) {
        final Map<String, dynamic> healthData = jsonDecode(result.toString());
        return CameraHealthReport.fromJson(healthData);
      }
    } catch (e) {
      _log('Error checking camera health: $e', isError: true);
    }

    return CameraHealthReport.unhealthy('Health check failed');
  }

  /// Force camera reset (for stuck situations)
  Future<bool> forceCameraReset() async {
    if (!_isInitialized || _webViewController == null) return false;

    try {
      _resetCount++;
      _log('Forcing camera reset (reset #$_resetCount)');

      final result = await _webViewController.runJavaScriptReturningResult('''
        (function() {
          // Cancel any active transitions
          if (window.cancelCameraTransitions) {
            window.cancelCameraTransitions();
          }
          
          // Use existing force reset function
          if (window.forceCameraReset) {
            window.forceCameraReset();
          }
          
          // Cleanup state manager
          if (window.CameraStateManager) {
            window.CameraStateManager.cleanup();
          }
          
          return true;
        })();
      ''');

      _isTransitioning = false;
      _log('Camera reset completed');
      return result == true;
    } catch (e) {
      _log('Error in camera reset: $e', isError: true);
      return false;
    }
  }

  /// Cancel all active transitions
  Future<bool> cancelAllTransitions() async {
    if (!_isInitialized || _webViewController == null) return false;

    try {
      final result = await _webViewController.runJavaScriptReturningResult('''
        (function() {
          if (window.cancelCameraTransitions) {
            window.cancelCameraTransitions();
            return true;
          }
          return false;
        })();
      ''');

      _isTransitioning = false;
      _log('All camera transitions cancelled');
      return result == true;
    } catch (e) {
      _log('Error cancelling transitions: $e', isError: true);
      return false;
    }
  }

  // ================================================================
  // PERFORMANCE MONITORING
  // ================================================================

  /// Get performance statistics
  CameraPerformanceStats getPerformanceStats() {
    final avgTransitionDuration = _transitionDurations.isNotEmpty
        ? _transitionDurations.reduce(
                (a, b) =>
                    Duration(microseconds: a.inMicroseconds + b.inMicroseconds),
              ) ~/
              _transitionDurations.length
        : Duration.zero;

    return CameraPerformanceStats(
      totalTransitions: _transitionCount,
      totalResets: _resetCount,
      averageTransitionDuration: avgTransitionDuration,
      isCurrentlyTransitioning: _isTransitioning,
      lastStateChange: _lastStateChange,
    );
  }

  // ================================================================
  // PRIVATE HELPERS
  // ================================================================

  void _trackTransitionCompletion(Duration expectedDuration) {
    Timer(expectedDuration + const Duration(milliseconds: 100), () {
      _isTransitioning = false;
      _transitionDurations.add(expectedDuration);

      // Keep only last 50 durations for average calculation
      if (_transitionDurations.length > 50) {
        _transitionDurations.removeAt(0);
      }
    });
  }

  void _startHealthCheck() {
    _healthCheckTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      final health = await checkCameraHealth();
      if (!health.isHealthy) {
        _log(
          'Camera health check failed: ${health.issues.join(", ")}',
          isError: true,
        );
      }
    });
  }

  void _log(String message, {bool isError = false}) {
    if (_debugMode || isError) {
      if (isError) {
        print('❌ $_tag: $message');
      } else {
        print('🎯 $_tag: $message');
      }
    }
  }

  // ================================================================
  // CLEANUP
  // ================================================================

  /// Dispose of resources
  void dispose() {
    _healthCheckTimer?.cancel();
    _webViewController = null;
    _isInitialized = false;
    _transitionDurations.clear();
    _log('Camera optimization helper disposed');
  }
}

// ====================================================================
// DATA MODELS
// ====================================================================

/// 3D Vector representation
class Vector3 {
  final double x;
  final double y;
  final double z;

  const Vector3(this.x, this.y, this.z);

  @override
  String toString() => 'Vector3($x, $y, $z)';
}

/// Camera state data
class CameraState {
  final Vector3 position;
  final Vector3 target;
  final bool isTransitioning;

  const CameraState({
    required this.position,
    required this.target,
    required this.isTransitioning,
  });

  factory CameraState.fromJson(Map<String, dynamic> json) {
    return CameraState(
      position: Vector3(
        json['position']['x'].toDouble(),
        json['position']['y'].toDouble(),
        json['position']['z'].toDouble(),
      ),
      target: Vector3(
        json['target']['x'].toDouble(),
        json['target']['y'].toDouble(),
        json['target']['z'].toDouble(),
      ),
      isTransitioning: json['isTransitioning'] ?? false,
    );
  }
}

/// Camera health report
class CameraHealthReport {
  final bool isHealthy;
  final List<String> issues;
  final Map<String, dynamic> details;

  const CameraHealthReport({
    required this.isHealthy,
    required this.issues,
    required this.details,
  });

  factory CameraHealthReport.healthy() {
    return const CameraHealthReport(isHealthy: true, issues: [], details: {});
  }

  factory CameraHealthReport.unhealthy(String issue) {
    return CameraHealthReport(isHealthy: false, issues: [issue], details: {});
  }

  factory CameraHealthReport.fromJson(Map<String, dynamic> json) {
    final issues = <String>[];

    if (!(json['isInitialized'] ?? false))
      issues.add('Camera system not initialized');
    if (!(json['hasCamera'] ?? false)) issues.add('Camera not found');
    if (!(json['hasControls'] ?? false))
      issues.add('Camera controls not found');
    if (!(json['controlsEnabled'] ?? false))
      issues.add('Camera controls disabled');

    final activeTransitions = json['activeTransitions'] ?? 0;
    if (activeTransitions > 5)
      issues.add('Too many active transitions ($activeTransitions)');

    return CameraHealthReport(
      isHealthy: issues.isEmpty,
      issues: issues,
      details: json,
    );
  }
}

/// Performance statistics
class CameraPerformanceStats {
  final int totalTransitions;
  final int totalResets;
  final Duration averageTransitionDuration;
  final bool isCurrentlyTransitioning;
  final DateTime? lastStateChange;

  const CameraPerformanceStats({
    required this.totalTransitions,
    required this.totalResets,
    required this.averageTransitionDuration,
    required this.isCurrentlyTransitioning,
    this.lastStateChange,
  });
}
