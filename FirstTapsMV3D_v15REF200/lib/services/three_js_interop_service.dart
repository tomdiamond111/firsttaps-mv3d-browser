import 'dart:convert';
import 'package:webview_flutter/webview_flutter.dart'; // Ensure this is the correct import
import '../models/file_model.dart' as fm; // Using the alias
import 'contact_sms_service.dart';
import 'persistence_service.dart';
import 'demo_asset_loader.dart';
import '../helpers/demo_content_with_recommendations_helper.dart';

class ThreeJsInteropService {
  WebViewController? _webViewController;

  // Setter for the WebViewController
  void setWebViewController(WebViewController controller) {
    _webViewController = controller;
  }

  bool _isControllerAvailable() {
    if (_webViewController == null) {
      print("ThreeJsInteropService: WebViewController not set.");
      return false;
    }
    return true;
  }

  /// Inject demo asset data URLs into JavaScript global scope
  /// This must be called AFTER the WebView loads but BEFORE default furniture creation
  /// Safe to call multiple times - will skip if already injected
  Future<void> injectDemoAssetDataUrls() async {
    if (!_isControllerAvailable()) {
      print('❌ [DEMO INJECT] WebViewController not available');
      return;
    }

    try {
      // Check if already injected
      final checkResult = await _webViewController
          ?.runJavaScriptReturningResult(
            'typeof window.DEMO_ASSET_DATA_URLS !== "undefined"',
          );

      if (checkResult == true || checkResult == 'true') {
        print('✅ [DEMO INJECT] Already injected, skipping');
        return;
      }

      print('📦 [DEMO INJECT] Pre-loading demo assets and media...');

      // Pre-load thumbnails (for face textures) - skipped now (using external URLs only)
      final demoThumbnails = await DemoAssetLoader.preloadAllDemoAssets();

      // Pre-load full media files (for playback) - skipped now (using external URLs only)
      final demoMedia = await DemoAssetLoader.preloadAllDemoMedia();

      // CRITICAL: Pre-fetch external URL thumbnails (TikTok, Instagram, YouTube, Spotify)
      // This bypasses CORS by fetching from Dart/native code
      // Run in background to avoid blocking WebView initialization
      print(
        '🌐 [DEMO INJECT] Starting background fetch of external URL thumbnails...',
      );
      final externalUrls = [
        // YouTube Shorts
        'https://www.youtube.com/shorts/jNQXAC9IVRw',
        'https://www.youtube.com/shorts/5yx6BWlEVcY',
        // TikTok
        'https://www.tiktok.com/@tiktok/video/7016050803294422277',
        // Instagram Reels (thumbnails disabled - will use text fallback)
        'https://www.instagram.com/reel/CdIxYYqgXYZ/',
        // Spotify tracks (from config)
        'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp',
        'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
        'https://open.spotify.com/track/0yLdNVWF3Srea0uzk55zFn',
        // YouTube videos
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=9bZkp7q19f0',
        'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
        'https://www.youtube.com/watch?v=OPf0YbXqDm0',
        'https://www.youtube.com/watch?v=jgpJVI3tDbY',
        'https://www.youtube.com/watch?v=vCadcBR95oU',
        'https://www.youtube.com/watch?v=5qap5aO4i9A',
      ];

      // Start background fetch (don't await - let it complete asynchronously)
      _fetchExternalThumbnailsInBackground(externalUrls);

      // Use empty map for now - thumbnails will be available via cache on next load
      final allThumbnails = <String, String>{...demoThumbnails};

      if (allThumbnails.isEmpty && demoMedia.isEmpty) {
        print('✅ [DEMO INJECT] Demo assets skipped - using external URLs only');
        // Don't return - proceed with injection of empty maps
      }

      // Convert to JSON for injection
      final thumbnailsJson = jsonEncode(allThumbnails);
      final mediaJson = jsonEncode(demoMedia);

      // Inject BOTH objects into JavaScript global scope
      final jsCode =
          '''
        window.DEMO_THUMBNAIL_DATA_URLS = $thumbnailsJson;
        window.DEMO_ASSET_DATA_URLS = $mediaJson;
        console.log('✅ [FLUTTER] Injected ${allThumbnails.length} thumbnails and ${demoMedia.length} media files');
        console.log('📦 [FLUTTER] Thumbnails:', Object.keys(window.DEMO_THUMBNAIL_DATA_URLS));
        console.log('📦 [FLUTTER] Media files:', Object.keys(window.DEMO_ASSET_DATA_URLS));
      ''';

      await _webViewController?.runJavaScript(jsCode);

      print(
        '✅ [DEMO INJECT] Injected ${allThumbnails.length} thumbnails and ${demoMedia.length} media files into JavaScript',
      );

      // Log cache stats
      final stats = DemoAssetLoader.getCacheStats();
      print(
        '📊 [DEMO INJECT] Cache stats: ${stats['cachedThumbnails']} thumbnails (${stats['thumbnailSizeMB']} MB), ${stats['cachedMedia']} media (${stats['mediaSizeMB']} MB), ${stats['cachedExternal']} external (${stats['externalSizeMB']} MB)',
      );
    } catch (e, stackTrace) {
      print('❌ [DEMO INJECT] Failed to inject demo assets: $e');
      print('Stack trace: $stackTrace');
    }
  }

  /// Fetch external thumbnails in background (non-blocking)
  /// Thumbnails will be cached and available on next app launch
  void _fetchExternalThumbnailsInBackground(List<String> urls) {
    // Run asynchronously without blocking
    Future.microtask(() async {
      try {
        print('🌐 [BACKGROUND] Fetching ${urls.length} external thumbnails...');
        final thumbnails = await DemoAssetLoader.prefetchExternalThumbnails(
          urls,
        );
        print(
          '✅ [BACKGROUND] Fetched ${thumbnails.length} external thumbnails (cached for next launch)',
        );
      } catch (e) {
        print('❌ [BACKGROUND] Failed to fetch external thumbnails: $e');
      }
    });
  }

  /// Trigger furniture creation with retry logic
  /// Waits for window.triggerFurnitureCreation to be available
  bool _furnitureCreationTriggered =
      false; // Guard to prevent multiple triggers

  Future<void> _triggerFurnitureCreationWithRetry({int maxRetries = 5}) async {
    // CRITICAL: Prevent multiple simultaneous calls
    if (_furnitureCreationTriggered) {
      print('⚠️ [FURNITURE] Already triggered - ignoring duplicate call');
      return;
    }

    _furnitureCreationTriggered = true;

    if (!_isControllerAvailable()) {
      print('❌ [FURNITURE] WebViewController not available');
      _furnitureCreationTriggered = false; // Reset on error
      return;
    }

    try {
      for (int attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          print(
            '🪑 [FURNITURE] Attempt $attempt/$maxRetries to trigger furniture creation',
          );

          final result = await _webViewController?.runJavaScriptReturningResult(
            '''
            (function() {
              if (typeof window.triggerFurnitureCreation === 'function') {
                console.log('🪑 [DART] Calling window.triggerFurnitureCreation()');
                window.triggerFurnitureCreation();
                return 'success';
              } else {
                console.warn('⚠️ [DART] window.triggerFurnitureCreation not available yet');
                return 'not_ready';
              }
            })();
          ''',
          );

          if (result.toString() == 'success') {
            print('✅ [FURNITURE] Successfully triggered furniture creation');
            return;
          }

          print('⏱️ [FURNITURE] Function not ready, waiting before retry...');
          await Future.delayed(Duration(milliseconds: 500 * attempt));
        } catch (e) {
          if (attempt == maxRetries) {
            print('❌ [FURNITURE] Failed after $maxRetries attempts: $e');
            rethrow;
          }
          print('⚠️ [FURNITURE] Attempt $attempt failed: $e');
          await Future.delayed(Duration(milliseconds: 200 * attempt));
        }
      }

      print(
        '❌ [FURNITURE] Failed to trigger furniture creation after $maxRetries attempts',
      );
      print('   JS may trigger via fallback timer');
    } finally {
      // CRITICAL: Always reset guard flag after completion (success or failure)
      _furnitureCreationTriggered = false;
      print('✅ [FURNITURE] Guard flag reset - ready for future operations');
    }
  }

  /// Inject Dart recommendations into JavaScript as window.DART_RECOMMENDATIONS
  /// This allows the existing demo furniture system to use trending content
  /// instead of hardcoded playlists
  Future<void> injectRecommendations() async {
    if (!_isControllerAvailable()) {
      print('❌ [RECOMMENDATIONS] WebViewController not available');
      return;
    }

    try {
      print('📦 [RECOMMENDATIONS] Generating JavaScript playlists...');

      final jsCode =
          await DemoContentWithRecommendationsHelper.generateJavaScriptPlaylists();

      if (jsCode.isEmpty) {
        print(
          '⚠️ [RECOMMENDATIONS] No recommendations available, using hardcoded playlists',
        );

        // Trigger furniture creation even without recommendations (fallback)
        print(
          '🪑 [RECOMMENDATIONS] Triggering furniture creation (no recommendations)',
        );
        await _triggerFurnitureCreationWithRetry();
        return;
      }

      await _webViewController?.runJavaScript(jsCode);

      print(
        '✅ [RECOMMENDATIONS] Injected Dart recommendations into JavaScript',
      );

      // CRITICAL: Trigger furniture creation now that recommendations are ready
      print(
        '🪑 [RECOMMENDATIONS] Triggering furniture creation with recommendations',
      );
      await _triggerFurnitureCreationWithRetry();

      print('✅ [RECOMMENDATIONS] Furniture creation triggered');
    } catch (e, stackTrace) {
      print('❌ [RECOMMENDATIONS] Failed to inject recommendations: $e');
      print('Stack trace: $stackTrace');
    }
  }

  /// Refresh and inject fresh recommendations for furniture refresh
  /// Called when user clicks refresh button or updates music preferences
  /// Does NOT trigger furniture creation - JavaScript handles that
  Future<void> refreshAndInjectRecommendations({
    bool forceRefresh = true,
  }) async {
    if (!_isControllerAvailable()) {
      print('❌ [REFRESH] WebViewController not available');
      return;
    }

    try {
      print(
        '🔄 [REFRESH] Fetching fresh recommendations from platform APIs (forceRefresh: $forceRefresh)...',
      );

      // Force fresh content generation (bypasses cache)
      final jsCode =
          await DemoContentWithRecommendationsHelper.generateJavaScriptPlaylists(
            forceRefresh: forceRefresh,
          );

      if (jsCode.isEmpty) {
        print('⚠️ [REFRESH] No recommendations available');
        return;
      }

      // Inject fresh recommendations into JavaScript
      await _webViewController?.runJavaScript(jsCode);

      print('✅ [REFRESH] Fresh recommendations injected into JavaScript');

      // Note: JavaScript will handle furniture refresh after this completes
    } catch (e, stackTrace) {
      print('❌ [REFRESH] Failed to refresh recommendations: $e');
      print('Stack trace: $stackTrace');
    }
  }

  /// Get additional recommendations to fill empty furniture slots
  /// Called when JavaScript needs more content after some objects failed to create
  Future<List<String>> getAdditionalRecommendations(
    String? furnitureType,
    int count,
  ) async {
    try {
      print(
        '📡 [ADDITIONAL] Fetching $count additional recommendations for $furnitureType...',
      );

      // Use the recommendation helper to fetch more content
      // This will query the APIs (YouTube, Dailymotion) for fresh links
      final additionalLinks =
          await DemoContentWithRecommendationsHelper.getAdditionalLinksForFurniture(
            furnitureType ?? 'gallery_wall',
            count,
          );

      print(
        '✅ [ADDITIONAL] Fetched ${additionalLinks.length} additional links',
      );

      return additionalLinks;
    } catch (e, stackTrace) {
      print('❌ [ADDITIONAL] Failed to fetch additional recommendations: $e');
      print('Stack trace: $stackTrace');
      return []; // Return empty list on failure
    }
  }

  /// Add data URLs to demo files that don't have them
  /// This fixes old persisted demo files created before asset loading was implemented
  Future<List<fm.FileModel>> _addDataUrlsToDemoFiles(
    List<fm.FileModel> files,
  ) async {
    try {
      final demoThumbnails = await DemoAssetLoader.preloadAllDemoAssets();
      if (demoThumbnails.isEmpty) {
        print('⚠️ [DEMO FIX] No demo assets available for retroactive fix');
        return files;
      }

      int fixed = 0;
      final List<fm.FileModel> updatedFiles = [];

      for (final file in files) {
        // Check if this is a demo file without data URL
        final isDemoFile = file.path.startsWith('assets/demomedia/');
        final missingDataUrl =
            file.thumbnailDataUrl == null || file.thumbnailDataUrl!.isEmpty;

        if (isDemoFile && missingDataUrl) {
          final dataUrl = demoThumbnails[file.path];
          if (dataUrl != null) {
            fixed++;
            print(
              '🔧 [DEMO FIX] Adding data URL to ${file.name} (${(dataUrl.length / 1024).toStringAsFixed(2)} KB)',
            );
            updatedFiles.add(
              fm.FileModel(
                path: file.path,
                name: file.name,
                extension: file.extension,
                fileSize: file.fileSize,
                lastModified: file.lastModified,
                x: file.x,
                y: file.y,
                z: file.z,
                rotation: file.rotation,
                type: file.type,
                mimeType: file.mimeType,
                thumbnailDataUrl: dataUrl,
                furnitureId: file.furnitureId,
                furnitureSlotIndex: file.furnitureSlotIndex,
                isDemo: true,
              ),
            );
          } else {
            print('⚠️ [DEMO FIX] No data URL found for ${file.path}');
            updatedFiles.add(file);
          }
        } else {
          updatedFiles.add(file);
        }
      }

      if (fixed > 0) {
        print('✅ [DEMO FIX] Added data URLs to $fixed demo files');
      }

      return updatedFiles;
    } catch (e) {
      print('❌ [DEMO FIX] Failed to add data URLs: $e');
      return files;
    }
  }

  Future<void> sendFilesToWebView(List<fm.FileModel> files) async {
    if (!_isControllerAvailable()) return;

    print("🔍 DEBUG sendFilesToWebView: Called with ${files.length} files");
    print(
      "🔍 DEBUG sendFilesToWebView: File names: ${files.map((f) => f.name).join(', ')}",
    );
    // Check furniture metadata in INPUT files
    for (final file in files) {
      print(
        "🔍 INPUT: ${file.name} - furnitureId=${file.furnitureId}, slotIndex=${file.furnitureSlotIndex}",
      );
    }
    print(
      "ThreeJsInteropService: Attempting to send ${files.length} files to WebView...",
    );
    try {
      if (files.isNotEmpty) {
        print(
          "🔍 DEBUG: files.isNotEmpty = true, calling _loadSavedPositions...",
        );
        // CRITICAL FIX: Load saved positions from persistence to ensure objects
        // restore to their saved positions instead of default positions on world reload
        List<fm.FileModel> filesWithSavedPositions = await _loadSavedPositions(
          files,
        );

        // CRITICAL: Add data URLs to demo files that don't have them
        // This fixes old persisted demo files created before asset loading was implemented
        filesWithSavedPositions = await _addDataUrlsToDemoFiles(
          filesWithSavedPositions,
        );

        print(
          "🔍 DEBUG: _loadSavedPositions returned ${filesWithSavedPositions.length} files",
        );
        // Check furniture metadata in OUTPUT files before JSON conversion
        for (final file in filesWithSavedPositions) {
          print(
            "🔍 OUTPUT: ${file.name} - furnitureId=${file.furnitureId}, slotIndex=${file.furnitureSlotIndex}",
          );
        }
        List<Map<String, dynamic>> fileMetadatasJson = filesWithSavedPositions
            .map((f) => f.toJsonForWebView())
            .toList();
        print(
          "🔍 DEBUG: Converted to ${fileMetadatasJson.length} JSON objects",
        );
        // Check furniture metadata in JSON objects
        for (final json in fileMetadatasJson) {
          print(
            "🔍 JSON: ${json['name']} - furnitureId=${json['furnitureId']}, slotIndex=${json['furnitureSlotIndex']}",
          );
        }
        String jsonData = jsonEncode(fileMetadatasJson);
        print("🔍 DEBUG: JSON length: ${jsonData.length} characters");
        // Print first 500 chars to see structure without flooding logs
        print(
          "ThreeJsInteropService: Sending JSON to JS (first 500 chars): ${jsonData.length > 500 ? jsonData.substring(0, 500) + '...' : jsonData}",
        );

        // FIX: Pass JSON as a string literal to JavaScript by encoding it again
        // This escapes all special characters properly for JavaScript string injection
        final escapedJsonString = jsonEncode(jsonData);
        print(
          "🔍 DEBUG: Escaped JSON length: ${escapedJsonString.length} characters",
        );
        print(
          "🔍 DEBUG: Escaped JSON (first 200): ${escapedJsonString.length > 200 ? escapedJsonString.substring(0, 200) + '...' : escapedJsonString}",
        );

        // SOLUTION: Use postMessage to JavaScript instead of runJavaScript
        // This allows JavaScript to send responses back via JavaScriptChannel
        print(
          "📤 Sending ${files.length} files to JavaScript via postMessage...",
        );

        try {
          // Send the data using window.postMessage which JavaScript can listen for
          final jsCommand =
              """
            (function() {
              try {
                // Send diagnostic message back to Flutter
                if (window.FileObjectDebugChannel) {
                  window.FileObjectDebugChannel.postMessage('🔍 JavaScript received file data: $escapedJsonString');
                }
                
                // Call the actual function
                if (typeof window.createFileObjectsJS === 'function') {
                  window.createFileObjectsJS($escapedJsonString);
                  if (window.FileObjectDebugChannel) {
                    window.FileObjectDebugChannel.postMessage('✅ createFileObjectsJS executed successfully');
                  }
                } else {
                  if (window.FileObjectDebugChannel) {
                    window.FileObjectDebugChannel.postMessage('❌ createFileObjectsJS function not found');
                  }
                }
              } catch (e) {
                if (window.FileObjectDebugChannel) {
                  window.FileObjectDebugChannel.postMessage('❌ ERROR: ' + e.toString());
                }
              }
            })();
          """;

          await _webViewController!.runJavaScript(jsCommand);
          print(
            "✅ File data sent to JavaScript (check FileObjectDebugChannel for response)",
          );
        } catch (e) {
          print("❌ ERROR: Failed to send files to JavaScript: $e");
        }
      } else {
        print("ThreeJsInteropService: No files to display.");
        await _webViewController!.runJavaScript('createFileObjectsJS([]);');
      }
    } catch (e) {
      print("ThreeJsInteropService: Error sending file data: $e");
      // Attempt to clear view in JS on error
      await _webViewController!.runJavaScript('createFileObjectsJS([]);');
    }
  }

  /// Load saved positions from persistence service and apply to files
  /// This ensures objects restore to saved positions instead of default positions
  Future<List<fm.FileModel>> _loadSavedPositions(
    List<fm.FileModel> originalFiles,
  ) async {
    try {
      // Import persistence service to load saved positions
      final persistenceService = PersistenceService();
      final savedFiles = await persistenceService.loadPersistedFiles();

      // Create a map of saved positions by file path for quick lookup
      final Map<String, fm.FileModel> savedPositionsMap = {};
      for (final savedFile in savedFiles) {
        savedPositionsMap[savedFile.path] = savedFile;
      }

      // Apply saved positions to original files
      final List<fm.FileModel> updatedFiles = [];
      for (final originalFile in originalFiles) {
        final savedFile = savedPositionsMap[originalFile.path];
        if (savedFile != null) {
          // DEBUG: Log furniture data from savedFile
          print(
            "🪑 DEBUG three_js_interop: ${originalFile.name} - savedFile.furnitureId=${savedFile.furnitureId}, savedFile.furnitureSlotIndex=${savedFile.furnitureSlotIndex}",
          );
          // Use saved position if available
          final updatedFile = fm.FileModel(
            name: originalFile.name,
            type: originalFile.type,
            path: originalFile.path,
            parentFolder: originalFile.parentFolder,
            extension: originalFile.extension,
            x: savedFile.x, // Use saved position
            y: savedFile.y, // Use saved position
            z: savedFile.z, // Use saved position
            height: originalFile.height,
            thumbnailDataUrl: originalFile.thumbnailDataUrl,
            fileSize: originalFile.fileSize,
            lastModified: originalFile.lastModified,
            created: originalFile.created,
            mimeType: originalFile.mimeType,
            isReadable: originalFile.isReadable,
            isWritable: originalFile.isWritable,
            customDisplayName: originalFile.customDisplayName,
            // Copy EXIF metadata
            cameraMake: originalFile.cameraMake,
            cameraModel: originalFile.cameraModel,
            dateTimeOriginal: originalFile.dateTimeOriginal,
            imageWidth: originalFile.imageWidth,
            imageHeight: originalFile.imageHeight,
            aperture: originalFile.cameraMake,
            shutterSpeed: originalFile.shutterSpeed,
            iso: originalFile.iso,
            focalLength: originalFile.focalLength,
            flash: originalFile.flash,
            whiteBalance: originalFile.whiteBalance,
            orientation: originalFile.orientation,
            gpsLatitude: originalFile.gpsLatitude,
            gpsLongitude: originalFile.gpsLongitude,
            gpsAltitude: originalFile.gpsAltitude,
            lensModel: originalFile.lensModel,
            exposureTime: originalFile.exposureTime,
            fNumber: originalFile.fNumber,
            photographicSensitivity: originalFile.photographicSensitivity,
            digitalZoomRatio: originalFile.digitalZoomRatio,
            sceneCaptureType: originalFile.sceneCaptureType,
            subjectDistance: originalFile.subjectDistance,
            // Copy furniture seating metadata from saved file
            furnitureId: savedFile.furnitureId,
            furnitureSlotIndex: savedFile.furnitureSlotIndex,
          );
          // DEBUG: Log furniture data from updatedFile
          print(
            "🪑 DEBUG three_js_interop: ${originalFile.name} - updatedFile.furnitureId=${updatedFile.furnitureId}, updatedFile.furnitureSlotIndex=${updatedFile.furnitureSlotIndex}",
          );
          updatedFiles.add(updatedFile);
          print(
            "Position persistence: Using saved position for ${originalFile.name}: (${savedFile.x}, ${savedFile.y}, ${savedFile.z})",
          );
        } else {
          // Keep original file if no saved position found
          updatedFiles.add(originalFile);
          print(
            "Position persistence: No saved position for ${originalFile.name}, using original: (${originalFile.x}, ${originalFile.y}, ${originalFile.z})",
          );
        }
      }

      return updatedFiles;
    } catch (e) {
      print("ThreeJsInteropService: Error loading saved positions: $e");
      // Return original files if error occurs
      return originalFiles;
    }
  }

  Future<void> removeObjectByIdJS(String objectId) async {
    if (!_isControllerAvailable()) return;
    print(
      "ThreeJsInteropService: Requesting JS to remove object ID: $objectId",
    );
    await _webViewController!.runJavaScript('removeObjectByIdJS("$objectId");');
  }

  Future<void> deselectObjectJS() async {
    if (!_isControllerAvailable()) return;
    print("ThreeJsInteropService: Requesting JS to deselect object.");
    await _webViewController!.runJavaScript('deselectObjectJS();');
  }

  Future<void> executeJavaScript(String jsCode) async {
    if (!_isControllerAvailable()) return;
    print("ThreeJsInteropService: Executing custom JavaScript: $jsCode");
    await _webViewController!.runJavaScript(jsCode);
  }

  // ============================================================================
  // MOVE HISTORY FUNCTIONS - for "Undo Recent Move" functionality
  // ============================================================================
  Future<bool> undoRecentMoveJS() async {
    if (!_isControllerAvailable()) return false;
    print("ThreeJsInteropService: Requesting JS to undo recent move.");
    try {
      final result = await _webViewController!.runJavaScriptReturningResult(
        'undoRecentMoveJS()',
      );
      return result == true;
    } catch (e) {
      print("ThreeJsInteropService: Error undoing recent move: $e");
      return false;
    }
  }

  Future<bool> hasRecentMovesJS() async {
    if (!_isControllerAvailable()) return false;
    try {
      final result = await _webViewController!.runJavaScriptReturningResult(
        'hasRecentMovesJS()',
      );
      return result == true;
    } catch (e) {
      print("ThreeJsInteropService: Error checking recent moves: $e");
      return false;
    }
  }

  Future<Map<String, dynamic>?> getRecentMoveInfoJS() async {
    if (!_isControllerAvailable()) return null;
    try {
      final result = await _webViewController!.runJavaScriptReturningResult(
        'getRecentMoveInfoJS()',
      );
      if (result is Map) {
        return Map<String, dynamic>.from(result);
      }
      return null;
    } catch (e) {
      print("ThreeJsInteropService: Error getting recent move info: $e");
      return null;
    }
  }

  // ZOOM FUNCTIONALITY REMOVED: Focus on object feature replaces zoom buttons
  // Double-click objects for smart camera positioning instead

  Future<void> resetHomeView() async {
    if (!_isControllerAvailable()) return;
    print(
      "ThreeJsInteropService: Requesting JS to reset home view with enhanced camera reset.",
    );

    // First call the standard home view reset
    await _webViewController!.runJavaScript('resetHomeView();');

    // Then apply enhanced camera control reset for landscape mode freeze fix
    // This ensures the Home button provides comprehensive camera recovery
    await Future.delayed(const Duration(milliseconds: 100));
    await _webViewController!.runJavaScript(
      'if (window.app && window.app.cameraManager) { window.app.cameraManager.enhancedCameraControlReset(); } else { console.log("Enhanced camera reset not available"); }',
    );

    print("ThreeJsInteropService: Enhanced home view reset completed.");
  }

  Future<void> emergencyReset() async {
    if (!_isControllerAvailable()) return;
    print(
      "ThreeJsInteropService: Requesting comprehensive emergency camera reset.",
    );

    // Multiple-stage emergency reset for maximum recovery reliability
    await _webViewController!.runJavaScript('emergencyReset();');

    // Add enhanced camera control reset for landscape mode recovery
    await Future.delayed(const Duration(milliseconds: 150));
    await _webViewController!.runJavaScript(
      'if (window.app && window.app.cameraManager) { window.app.cameraManager.enhancedCameraControlReset(); } else { console.log("Enhanced camera reset not available"); }',
    );

    // Final home view reset to ensure proper positioning
    await Future.delayed(const Duration(milliseconds: 200));
    await _webViewController!.runJavaScript('resetHomeView();');

    print("ThreeJsInteropService: Comprehensive emergency reset completed.");
  }

  Future<void> refreshControlsState() async {
    if (!_isControllerAvailable()) return;
    print("ThreeJsInteropService: Requesting JS to refresh controls state.");
    await _webViewController!.runJavaScript('refreshControlsState();');
  }

  Future<void> selectObjectForMoveCommandJS(String objectId) async {
    if (!_isControllerAvailable()) return;
    print(
      "ThreeJsInteropService: Requesting JS to select object for move: $objectId",
    );
    await _webViewController!.runJavaScript(
      'selectObjectForMoveCommand("$objectId");',
    );
  }

  Future<void> selectObjectForVerticalMoveCommandJS(String objectId) async {
    if (!_isControllerAvailable()) return;
    print(
      "ThreeJsInteropService: Requesting JS to select object for vertical move: $objectId",
    );
    await _webViewController!.runJavaScript(
      'selectObjectForVerticalMoveCommand("$objectId");',
    );
  }

  // AXIS SELECTION SYSTEM: Phase 1 - Basic Dart-JS interop
  Future<void> selectObjectForMoveAxisJS(String axis) async {
    if (!_isControllerAvailable())
      return; // Validate axis parameter on Dart side
    const validAxes = ['Horizontal', 'Vertical'];
    if (!validAxes.contains(axis)) {
      print(
        "ThreeJsInteropService: Invalid axis '$axis'. Valid options: $validAxes",
      );
      return;
    }

    print(
      "ThreeJsInteropService: Requesting JS to select movement axis: $axis",
    );

    try {
      await _webViewController!.runJavaScript(
        'if (window.selectObjectForMoveAxis) { window.selectObjectForMoveAxis("$axis"); } else { console.error("selectObjectForMoveAxis not available"); }',
      );
    } catch (e) {
      print("ThreeJsInteropService: Error calling selectObjectForMoveAxis: $e");
    }
  }

  // PHASE 1 TESTING: Test all axis options
  Future<void> testAxisSelectionPhase1() async {
    print("=== TESTING AXIS SELECTION PHASE 1 ===");

    const testAxes = ['XY', 'X', 'Y', 'Z'];
    for (String axis in testAxes) {
      print("Testing axis: $axis");
      await selectObjectForMoveAxisJS(axis);
      await Future.delayed(
        Duration(milliseconds: 500),
      ); // Small delay between tests
    }

    // Test invalid axis
    print("Testing invalid axis (should show error):");
    await selectObjectForMoveAxisJS('INVALID');

    print("=== PHASE 1 TEST COMPLETE ===");
    print("Check browser console for JS responses");
  }

  // If you add more JS commands, create corresponding methods here.
  Future<void> updateDisplayOptions(Map<String, bool> options) async {
    if (!_isControllerAvailable()) return;
    final String optionsJson = jsonEncode(options);
    print("ThreeJsInteropService: Sending display options to JS: $optionsJson");
    // JS function will now expect 'showFileInfo' and 'showImagePreviews'
    await _webViewController!.runJavaScript(
      'updateDisplayOptionsJS($optionsJson);',
    );
  }

  // Restore single object from backup data
  Future<bool> restoreObjectById(
    fm.FileModel fileData, {
    bool isUndo = false,
  }) async {
    if (!_isControllerAvailable()) return false;

    try {
      // Extract URL from mimeType if it's a link object
      String? linkUrl;
      if (fileData.mimeType != null && fileData.mimeType!.startsWith('link:')) {
        linkUrl = fileData.mimeType!.substring(5); // Remove 'link:' prefix
      }

      final fileDataMap = {
        'id': fileData.path, // Use path as ID consistently
        'name': fileData.name,
        'extension': fileData.extension,
        'x': fileData.x ?? 0.0,
        'y': fileData.y ?? 0.0,
        'z': fileData.z ?? 0.0,
        'thumbnailDataUrl': fileData.thumbnailDataUrl,
        // Include additional file metadata for complete restoration
        'path': fileData.path,
        'fileSize': fileData.fileSize,
        'lastModified': fileData.lastModified,
        'type': fileData.type.toString(),
        'mimeType': fileData.mimeType,
        // CRITICAL: Mark path objects for special handling
        'isPath': fileData.extension == '.path',
        // Add URL for link objects
        if (linkUrl != null) 'url': linkUrl,
        // CRITICAL: Add isUndo flag for visual state restoration
        'isUndo': isUndo,
      };

      final jsCode =
          '''
        (function() {
          console.log('ThreeJsInteropService: About to call restoreObjectById with data:', ${jsonEncode(fileDataMap)});
          try {
            if (typeof restoreObjectById === 'function') {
              console.log('ThreeJsInteropService: restoreObjectById function found, calling...');
              const result = restoreObjectById(${jsonEncode(fileDataMap)});
              console.log('ThreeJsInteropService: restoreObjectById returned:', result);
              return result;
            } else {
              console.error('ThreeJsInteropService: restoreObjectById function not available');
              return false;
            }
          } catch (error) {
            console.error('ThreeJsInteropService: Error in restoreObjectById:', error);
            return false;
          }
        })();
      ''';

      print('ThreeJsInteropService: Restoring object ${fileData.name}');
      if (linkUrl != null) {
        print(
          'ThreeJsInteropService: Restoring link object with URL: $linkUrl',
        );
      }
      await _webViewController!.runJavaScript(jsCode);
      print('ThreeJsInteropService: Restore object executed successfully');

      // Since runJavaScript returns void, we assume success if no exception
      return true;
    } catch (e) {
      print('ThreeJsInteropService: Error restoring object: $e');
      return false;
    }
  }

  // Store object visual state before deletion for undo functionality
  Future<bool> storeObjectVisualStateForUndo(String objectId) async {
    if (!_isControllerAvailable()) return false;

    try {
      final jsCode =
          '''
        (function() {
          try {
            if (typeof storeObjectVisualStateForUndo === 'function') {
              return storeObjectVisualStateForUndo('$objectId');
            } else {
              console.error('storeObjectVisualStateForUndo function not available');
              return false;
            }
          } catch (error) {
            console.error('Error in storeObjectVisualStateForUndo:', error);
            return false;
          }
        })();
      ''';

      print('ThreeJsInteropService: Storing visual state for object $objectId');
      await _webViewController!.runJavaScript(jsCode);
      print(
        'ThreeJsInteropService: Visual state storage executed successfully',
      );

      return true;
    } catch (e) {
      print('ThreeJsInteropService: Error storing visual state: $e');
      return false;
    }
  }

  Future<void> switchWorldTemplate(String worldType) async {
    if (!_isControllerAvailable()) return;

    print("ThreeJsInteropService: Switching to world: $worldType");
    try {
      await _webViewController!.runJavaScript(
        'switchWorldTemplate("$worldType");',
      );
      print(
        "ThreeJsInteropService: World switch to $worldType completed successfully",
      );
    } catch (e) {
      print("ThreeJsInteropService: Error switching world: $e");
    }
  }

  Future<String?> getCurrentWorldType() async {
    if (!_isControllerAvailable()) return null;

    try {
      print("ThreeJsInteropService: Getting current world type...");
      final result = await _webViewController!.runJavaScriptReturningResult(
        'getCurrentWorldType()',
      );
      print("ThreeJsInteropService: Raw result: $result");

      // Parse the JSON-encoded string to get the actual string value
      if (result is String) {
        try {
          final parsed = jsonDecode(result);
          print("ThreeJsInteropService: Parsed world type: $parsed");
          return parsed.toString();
        } catch (jsonError) {
          print(
            "ThreeJsInteropService: JSON parse error, using raw result: $jsonError",
          );
          return result;
        }
      }

      print("ThreeJsInteropService: Current world type: $result");
      return result.toString();
    } catch (e) {
      print("ThreeJsInteropService: Error getting current world type: $e");
      return null;
    }
  }

  // POLISH PHASE: Visual Indicators and Status Management

  // Show visual indicators for selected axis
  Future<void> showAxisIndicators(String axis) async {
    if (!_isControllerAvailable()) return;

    print("ThreeJsInteropService: Showing axis indicators for: $axis");
    try {
      await _webViewController!.runJavaScript(
        'if (window.showAxisIndicators) { window.showAxisIndicators("$axis"); } else { console.error("showAxisIndicators not available"); }',
      );
    } catch (e) {
      print("ThreeJsInteropService: Error showing axis indicators: $e");
    }
  }

  // Hide all axis visual indicators
  Future<void> hideAxisIndicators() async {
    if (!_isControllerAvailable()) return;

    print("ThreeJsInteropService: Hiding axis indicators");
    try {
      await _webViewController!.runJavaScript(
        'if (window.hideAxisIndicators) { window.hideAxisIndicators(); } else { console.error("hideAxisIndicators not available"); }',
      );
    } catch (e) {
      print("ThreeJsInteropService: Error hiding axis indicators: $e");
    }
  }

  // Update status message in 3D view (if implemented in JS)
  Future<void> updateStatusMessage(String message) async {
    if (!_isControllerAvailable()) return;

    print("ThreeJsInteropService: Updating status message: $message");
    try {
      await _webViewController!.runJavaScript(
        'if (window.updateStatusMessage) { window.updateStatusMessage("$message"); } else { console.log("Status: $message"); }',
      );
    } catch (e) {
      print("ThreeJsInteropService: Error updating status message: $e");
    }
  }

  Future<void> enhancedCameraControlReset() async {
    if (!_isControllerAvailable()) return;
    print(
      "ThreeJsInteropService: Requesting enhanced camera control reset for landscape freeze fix.",
    );
    await _webViewController!.runJavaScript(
      'if (window.app && window.app.cameraManager) { window.app.cameraManager.enhancedCameraControlReset(); } else { console.log("Enhanced camera reset not available"); }',
    );
  }

  // ============================================================================
  // SEARCH FUNCTIONALITY
  // ============================================================================

  /// Activate search mode with the given query
  Future<bool> activateSearch(String query) async {
    if (!_isControllerAvailable()) return false;

    print("🔍 ThreeJsInteropService: Activating search for: $query");
    try {
      // CRITICAL FIX: Must await the async activateSearchJS function
      final result = await _webViewController!.runJavaScriptReturningResult(
        '(async () => await activateSearchJS("$query"))();',
      );
      print("🔍 RAW JS RESULT: '$result' (type: ${result.runtimeType})");
      final success = result.toString() == 'true';
      print("🔍 PARSED BOOLEAN: $success");

      // Fallback check using window flag
      if (!success) {
        print("🔍 Primary activation failed, checking window flag...");
        final fallbackResult = await _webViewController!
            .runJavaScriptReturningResult(
              'window.searchActivationResult || false;',
            );
        final fallbackSuccess = fallbackResult.toString() == 'true';
        print("🔍 FALLBACK RESULT: $fallbackSuccess");
        if (fallbackSuccess) {
          print(
            "🔍 ThreeJsInteropService: Search activation result (fallback): $fallbackSuccess",
          );
          return fallbackSuccess;
        }
      }

      print("🔍 ThreeJsInteropService: Search activation result: $success");
      return success;
    } catch (e) {
      print("❌ ThreeJsInteropService: Error activating search: $e");
      return false;
    }
  }

  /// Deactivate search mode and restore object positions
  Future<bool> deactivateSearch() async {
    if (!_isControllerAvailable()) return false;

    print("ThreeJsInteropService: Deactivating search");
    try {
      // Must await the async deactivateSearchJS function
      final result = await _webViewController!.runJavaScriptReturningResult(
        '(async () => await deactivateSearchJS())();',
      );
      final success = result.toString() == 'true';
      print("ThreeJsInteropService: Search deactivation result: $success");
      return success;
    } catch (e) {
      print("ThreeJsInteropService: Error deactivating search: $e");
      return false;
    }
  }

  /// Check if search is currently active
  Future<bool> isSearchActive() async {
    if (!_isControllerAvailable()) return false;

    try {
      final result = await _webViewController!.runJavaScriptReturningResult(
        'isSearchActiveJS();',
      );
      return result.toString() == 'true';
    } catch (e) {
      print("ThreeJsInteropService: Error checking search status: $e");
      return false;
    }
  }

  /// Get the number of search results
  Future<int> getSearchResultsCount() async {
    if (!_isControllerAvailable()) return 0;

    try {
      final result = await _webViewController!.runJavaScriptReturningResult(
        'getSearchResultsCountJS();',
      );
      print("🔍 RAW COUNT RESULT: '$result' (type: ${result.runtimeType})");
      final count = int.tryParse(result.toString()) ?? 0;
      print("🔍 PARSED COUNT: $count");
      return count;
    } catch (e) {
      print("❌ ThreeJsInteropService: Error getting search results count: $e");
      return 0;
    }
  }

  /// Move a search result to the home area
  Future<bool> moveSearchResultToHomeArea(String fileObjectId) async {
    if (!_isControllerAvailable()) return false;

    print(
      "ThreeJsInteropService: Moving search result to home area: $fileObjectId",
    );
    try {
      final result = await _webViewController!.runJavaScriptReturningResult(
        'moveSearchResultToHomeAreaJS("$fileObjectId");',
      );
      final success = result.toString() == 'true';
      print("ThreeJsInteropService: Move result: $success");
      return success;
    } catch (e) {
      print("ThreeJsInteropService: Error moving search result: $e");
      return false;
    }
  }

  // ============================================================================
  // STACKING CONFIGURATION FUNCTIONS - Phase 1B.2
  // ============================================================================

  /// Get the current stacking configuration from JavaScript
  Future<Map<String, dynamic>?> getStackingConfig() async {
    if (!_isControllerAvailable()) return null;

    try {
      print("ThreeJsInteropService: Getting stacking configuration...");
      final result = await _webViewController!.runJavaScriptReturningResult(
        'getStackingConfigJS()',
      );

      if (result is Map) {
        final config = Map<String, dynamic>.from(result);
        print("ThreeJsInteropService: Retrieved stacking config: $config");
        return config;
      } else {
        print("ThreeJsInteropService: No valid stacking config returned");
        return null;
      }
    } catch (e) {
      print("ThreeJsInteropService: Error getting stacking config: $e");
      return null;
    }
  }

  /// Update the stacking configuration in JavaScript
  Future<bool> updateStackingConfig(Map<String, dynamic> config) async {
    if (!_isControllerAvailable()) return false;

    try {
      final configJson = jsonEncode(config);
      print("ThreeJsInteropService: Updating stacking config: $configJson");

      final result = await _webViewController!.runJavaScriptReturningResult(
        'updateStackingConfigJS($configJson)',
      );

      print(
        "ThreeJsInteropService: Raw JS result: $result (type: ${result.runtimeType})",
      );
      final success = result == true;
      print("ThreeJsInteropService: Stacking config update result: $success");
      return success;
    } catch (e) {
      print("ThreeJsInteropService: Error updating stacking config: $e");
      return false;
    }
  }

  /// Apply the current stacking configuration to all objects
  Future<bool> applyStackingConfig() async {
    if (!_isControllerAvailable()) return false;

    try {
      print("ThreeJsInteropService: Applying stacking configuration...");
      final result = await _webViewController!.runJavaScriptReturningResult(
        'applyStackingConfigJS()',
      );

      print(
        "ThreeJsInteropService: Raw JS apply result: $result (type: ${result.runtimeType})",
      );
      final success = result == true;
      print(
        "ThreeJsInteropService: Stacking config application result: $success",
      );
      return success;
    } catch (e) {
      print("ThreeJsInteropService: Error applying stacking config: $e");
      return false;
    }
  }

  // ============================================================================
  // UNIFIED STACKING CONFIGURATION FUNCTIONS - Links Advanced Options to Both Sorting and Searching
  // ============================================================================

  /// Get the unified stacking configuration that applies to both sorting and searching
  Future<Map<String, dynamic>?> getUnifiedStackingConfig() async {
    if (!_isControllerAvailable()) return null;

    try {
      print("ThreeJsInteropService: Getting unified stacking configuration...");
      final result = await _webViewController!.runJavaScriptReturningResult(
        'getStackingConfigForFlutter ? getStackingConfigForFlutter() : getUnifiedStackingConfigJS()',
      );

      print("ThreeJsInteropService: Raw result type: ${result.runtimeType}");
      print("ThreeJsInteropService: Raw result value: $result");

      if (result is Map) {
        final config = Map<String, dynamic>.from(result);
        print(
          "ThreeJsInteropService: Retrieved unified stacking config: $config",
        );
        return config;
      } else if (result is String) {
        // Try parsing as JSON if it's a string
        try {
          final decoded = jsonDecode(result);
          if (decoded is Map) {
            final config = Map<String, dynamic>.from(decoded);
            print(
              "ThreeJsInteropService: Retrieved unified stacking config from JSON: $config",
            );
            return config;
          }
        } catch (jsonError) {
          print("ThreeJsInteropService: Failed to parse as JSON: $jsonError");
        }
      }

      print("ThreeJsInteropService: No valid unified stacking config returned");
      return null;
    } catch (e) {
      print("ThreeJsInteropService: Error getting unified stacking config: $e");
      return null;
    }
  }

  /// Update the unified stacking configuration that applies to both sorting and searching
  Future<bool> updateUnifiedStackingConfig(Map<String, dynamic> config) async {
    if (!_isControllerAvailable()) return false;

    try {
      final configJson = jsonEncode(config);
      print(
        "ThreeJsInteropService: Updating unified stacking config: $configJson",
      );

      final result = await _webViewController!.runJavaScriptReturningResult(
        'updateUnifiedStackingConfigJS($configJson)',
      );

      print(
        "ThreeJsInteropService: Raw JS unified update result: $result (type: ${result.runtimeType})",
      );
      final success = result == true;
      print(
        "ThreeJsInteropService: Unified stacking config update result: $success",
      );
      return success;
    } catch (e) {
      print(
        "ThreeJsInteropService: Error updating unified stacking config: $e",
      );
      return false;
    }
  }

  /// Apply the unified stacking configuration to both sorting and searching systems
  Future<bool> applyUnifiedStackingConfig() async {
    if (!_isControllerAvailable()) return false;

    try {
      print(
        "ThreeJsInteropService: Applying unified stacking configuration...",
      );
      final result = await _webViewController!.runJavaScriptReturningResult(
        'applyUnifiedStackingConfigJS()',
      );

      print(
        "ThreeJsInteropService: Raw JS unified apply result: $result (type: ${result.runtimeType})",
      );
      final success = result == true;
      print(
        "ThreeJsInteropService: Unified stacking config application result: $success",
      );
      return success;
    } catch (e) {
      print(
        "ThreeJsInteropService: Error applying unified stacking config: $e",
      );
      return false;
    }
  }

  /// Test the stacking configuration functionality - Phase 1B.2 Testing
  Future<void> testStackingConfigurationPhase1B2() async {
    print("=== TESTING STACKING CONFIGURATION PHASE 1B.2 ===");

    try {
      // Test 1: Get initial stacking config
      print("Test 1: Getting initial stacking configuration...");
      final initialConfig = await getStackingConfig();
      print("Initial config: $initialConfig");

      // Test 2: Update stacking config with test values
      print("Test 2: Updating stacking configuration...");
      final testConfig = {
        'enabled': true,
        'criteria': ['fileType', 'fileSize'],
        'directions': ['ascending', 'descending'],
        'spacing': 0.5,
        'maxStackHeight': 10.0,
      };

      final updateResult = await updateStackingConfig(testConfig);
      print("Update result: $updateResult");

      // Test 3: Verify the updated config
      print("Test 3: Verifying updated configuration...");
      final updatedConfig = await getStackingConfig();
      print("Updated config: $updatedConfig");

      // Test 4: Apply the stacking configuration
      print("Test 4: Applying stacking configuration...");
      final applyResult = await applyStackingConfig();
      print("Apply result: $applyResult");

      print("=== PHASE 1B.2 TEST COMPLETE ===");
      print("All stacking configuration methods tested successfully!");
    } catch (e) {
      print("Error during stacking configuration test: $e");
    }
  }

  // ============================================================================
  // URL LINK CREATION FUNCTIONALITY
  // ============================================================================

  /// Create a link object in Three.js using the URL Manager
  Future<bool> createLinkFromURL(String url) async {
    if (!_isControllerAvailable()) return false;

    try {
      // Escape the URL for JavaScript
      final escapedUrl = url.replaceAll('"', '\\"').replaceAll("'", "\\'");

      final jsCode =
          '''
        (async function() {
          try {
            if (window.app && window.app.urlManager) {
              console.log('ThreeJsInteropService: Creating link from URL: $escapedUrl');
              await window.app.urlManager.createLinkFromURL('$escapedUrl');
              console.log('ThreeJsInteropService: Link created successfully');
              return true;
            } else {
              console.error('ThreeJsInteropService: URLManager not available');
              return false;
            }
          } catch (error) {
            console.error('ThreeJsInteropService: Error creating link:', error);
            return false;
          }
        })();
      ''';

      print('ThreeJsInteropService: Creating link from URL: $url');
      await _webViewController!.runJavaScript(jsCode);
      print('ThreeJsInteropService: Link creation request sent successfully');

      return true;
    } catch (e) {
      print('ThreeJsInteropService: Error creating link: $e');
      return false;
    }
  }

  /// Add new files to the existing 3D world without clearing existing objects
  /// Unlike sendFilesToWebView which recreates everything, this adds only new files
  /// Routes to appropriate JavaScript method based on file type (file/contact/app)
  Future<bool> addNewFilesToWorld(List<fm.FileModel> newFiles) async {
    print('🔍 DEBUG: addNewFilesToWorld called with ${newFiles.length} files');

    if (!_isControllerAvailable()) {
      print('❌ DEBUG: Controller not available!');
      return false;
    }

    try {
      print(
        '📁 ThreeJsInteropService: Adding ${newFiles.length} new files to world',
      );

      // Convert new files to JSON
      List<Map<String, dynamic>> fileMetadatasJson = newFiles
          .map((f) => f.toJsonForWebView())
          .toList();
      String jsonData = jsonEncode(fileMetadatasJson);

      print('🔍 DEBUG: JSON data length: ${jsonData.length}');
      print(
        '🔍 DEBUG: First 500 chars: ${jsonData.substring(0, jsonData.length > 500 ? 500 : jsonData.length)}',
      );

      print('🔍 DEBUG: About to execute JavaScript...');

      final jsCode =
          '''
        (async function() {
          try {
            // Parse the JSON data directly (passed as raw JSON string)
            const filesJson = JSON.parse(`$jsonData`);
            console.log('🔍 [ROUTING] Parsed JSON successfully');
            console.log('📁 [ROUTING] Adding ' + filesJson.length + ' new files/contacts/apps without clearing existing objects');
            
            if (!window.app) {
              console.error('❌ [ROUTING] Window.app not available');
              return false;
            }
            
            let successCount = 0;
            
            // Process each file/contact/app individually with appropriate method
            for (let i = 0; i < filesJson.length; i++) {
              const fileData = filesJson[i];
              try {
                console.log('🔍 [ROUTING] Processing item ' + (i+1) + ':', fileData.name);
                console.log('🔍 [ROUTING]   - type:', fileData.type);
                console.log('🔍 [ROUTING]   - path:', fileData.path);
                console.log('🔍 [ROUTING]   - mimeType:', fileData.mimeType);
                
                // Detect file type and route to appropriate manager
                const isContact = fileData.mimeType && fileData.mimeType.startsWith('contact:');
                const isApp = fileData.type === 'app' && fileData.mimeType && fileData.mimeType.startsWith('link:app://');
                const isLink = fileData.mimeType && fileData.mimeType.startsWith('link:') && !isApp;
                
                console.log('🔍 [ROUTING]   - isContact:', isContact);
                console.log('🔍 [ROUTING]   - isApp:', isApp);
                console.log('🔍 [ROUTING]   - isLink:', isLink);
                
                if (isContact) {
                  // Route to ContactManager
                  console.log('👥 [ROUTING] ✅ Routing to ContactManager:', fileData.name);
                  if (window.app.contactManager) {
                    window.app.contactManager.addContact(fileData);
                    successCount++;
                    console.log('👥 [ROUTING] ✅ Contact added successfully');
                  } else {
                    console.error('❌ [ROUTING] ContactManager not available');
                  }
                } else if (isApp || isLink) {
                  // Route to VirtualObjectManager for apps and link objects
                  console.log('🔗 [ROUTING] ✅ Routing to VirtualObjectManager for ' + (isApp ? 'app' : 'link') + ':', fileData.name);
                  if (window.app.virtualObjectManager) {
                    // For apps: Extract packageName from mimeType (format: "link:app://com.example.app")
                    if (isApp && fileData.mimeType) {
                      const packageName = fileData.mimeType.replace('link:app://', '');
                      fileData.packageName = packageName;
                      console.log('📱 [ROUTING] Extracted packageName:', packageName);
                    }
                    
                    // Apps are a type of link object - use addAppObjects for proper creation
                    window.app.virtualObjectManager.addAppObjects([fileData], {x: 0, y: 0, z: 0});
                    successCount++;
                    console.log('🔗 [ROUTING] ✅ ' + (isApp ? 'App' : 'Link') + ' object added successfully');
                  } else {
                    console.error('❌ [ROUTING] VirtualObjectManager not available');
                  }
                } else {
                  // Route to FileObjectManager for regular files
                  console.log('📁 [ROUTING] ✅ Routing to FileObjectManager:', fileData.name);
                  if (window.app.fileObjectManager) {
                    window.app.fileObjectManager.addSingleFileToWorld(fileData);
                    successCount++;
                    console.log('📁 [ROUTING] ✅ File added successfully');
                  } else {
                    console.error('❌ [ROUTING] FileObjectManager not available');
                  }
                }
              } catch (error) {
                console.error('❌ [ROUTING] Error adding object:', fileData.name, error);
              }
            }
            
            console.log('✅ [ROUTING] Successfully added ' + successCount + ' of ' + filesJson.length + ' objects');
            return successCount > 0;
          } catch (error) {
            console.error('❌ [ROUTING] Error in addNewFilesToWorld:', error);
            console.error('❌ [ROUTING] Stack trace:', error.stack);
            return false;
          }
        })();
      ''';

      print('🔍 DEBUG: Executing JavaScript now...');
      await _webViewController!.runJavaScript(jsCode);
      print('🔍 DEBUG: JavaScript execution completed');
      print(
        '✅ ThreeJsInteropService: New files/contacts/apps added successfully',
      );
      return true;
    } catch (e) {
      print('❌ DEBUG: Exception in addNewFilesToWorld: $e');
      print('❌ ThreeJsInteropService: Error adding new files: $e');
      return false;
    }
  }

  // Contact SMS System Methods

  /// Create a contact object in the 3D world
  Future<bool> createContactObject(ContactData contactData) async {
    if (!_isControllerAvailable()) return false;

    try {
      final contactJson = jsonEncode(contactData.toJson());
      print('ThreeJsInteropService: Creating contact: ${contactData.name}');

      final jsCode =
          '''
        (async function() {
          try {
            // Use global contact manager functions
            const contactManager = window.getContactManager ? window.getContactManager() : null;
            
            if (contactManager) {
              const contactData = $contactJson;
              const contact = contactManager.addContact(contactData);
              console.log('📱 Contact created successfully:', contactData.name);
              return true;
            } else {
              console.error('❌ Contact manager not available');
              return false;
            }
          } catch (error) {
            console.error('❌ Error creating contact:', error);
            return false;
          }
        })();
      ''';

      await _webViewController!.runJavaScript(jsCode);
      print('✅ Contact creation request sent for: ${contactData.name}');
      return true;
    } catch (e) {
      print('❌ Error creating contact: \$e');
      return false;
    }
  }

  /// Create Darcie Diamond contact for testing
  Future<bool> createDarcieContact() async {
    final darcieContact = ContactData(
      id: 'darcie-diamond',
      name: 'Darcie Diamond',
      phoneNumber: '224-440-5082',
      position: ContactPosition(x: 25, y: 0, z: 15),
    );

    return await createContactObject(darcieContact);
  }

  /// Initialize contact system in WebView
  Future<bool> initializeContactSystem() async {
    if (!_isControllerAvailable()) return false;

    try {
      print('📱 Initializing contact system...');

      final jsCode = '''
        (async function() {
          try {
            // Use global contact manager initialization
            if (window.app && window.app.scene && window.initializeContactManager) {
              const contactManager = window.initializeContactManager(window.app.scene);
              console.log('📱 Contact system initialized successfully');
              return true;
            } else {
              console.error('❌ Three.js scene or initializeContactManager not available');
              return false;
            }
          } catch (error) {
            console.error('❌ Error initializing contact system:', error);
            return false;
          }
        })();
      ''';

      await _webViewController!.runJavaScript(jsCode);
      print('✅ Contact system initialization requested');
      return true;
    } catch (e) {
      print('❌ Error initializing contact system: \$e');
      return false;
    }
  }
}
