import 'dart:convert';
import 'package:webview_flutter/webview_flutter.dart'; // Ensure this is the correct import
import '../models/file_model.dart' as fm; // Using the alias

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

  Future<void> sendFilesToWebView(List<fm.FileModel> files) async {
    if (!_isControllerAvailable()) return;

    print(
      "ThreeJsInteropService: Attempting to send ${files.length} files to WebView...",
    );
    try {
      if (files.isNotEmpty) {
        List<Map<String, dynamic>> fileMetadatasJson = files
            .map((f) => f.toJsonForWebView())
            .toList();
        String jsonData = jsonEncode(fileMetadatasJson);
        print("ThreeJsInteropService: Sending JSON to JS: $jsonData");
        await _webViewController!.runJavaScript(
          'createFileObjectsJS($jsonData);',
        );
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

  // ZOOM FUNCTIONALITY REMOVED: Focus on object feature replaces zoom buttons
  // Double-click objects for smart camera positioning instead

  Future<void> resetHomeView() async {
    if (!_isControllerAvailable()) return;
    print("ThreeJsInteropService: Requesting JS to reset home view.");
    await _webViewController!.runJavaScript('resetHomeView();');
  }

  Future<void> emergencyReset() async {
    if (!_isControllerAvailable()) return;
    print("ThreeJsInteropService: Requesting JS emergency camera reset.");
    await _webViewController!.runJavaScript('emergencyReset();');
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

  // AXIS SELECTION SYSTEM: Phase 1 - Basic Dart-JS interop
  Future<void> selectObjectForMoveAxisJS(String axis) async {
    if (!_isControllerAvailable()) return;

    // Validate axis parameter on Dart side
    const validAxes = ['XY', 'X', 'Y', 'Z'];
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
  Future<bool> restoreObjectById(fm.FileModel fileData) async {
    if (!_isControllerAvailable()) return false;

    try {
      final fileDataMap = {
        'id': fileData.path, // Use path as ID consistently
        'name': fileData.name,
        'extension': fileData.extension,
        'x': fileData.x ?? 0.0,
        'y': fileData.y ?? 0.0,
        'z': fileData.z ?? 0.0,
        'thumbnailDataUrl': fileData.thumbnailDataUrl,
      };

      final jsCode =
          '''
        (function() {
          try {
            if (typeof restoreObjectById === 'function') {
              return restoreObjectById(${jsonEncode(fileDataMap)});
            } else {
              console.error('restoreObjectById function not available');
              return false;
            }
          } catch (error) {
            console.error('Error in restoreObjectById:', error);
            return false;
          }
        })();
      ''';
      print('ThreeJsInteropService: Restoring object ${fileData.name}');
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
      print("ThreeJsInteropService: Current world type: $result");
      return result.toString();
    } catch (e) {
      print("ThreeJsInteropService: Error getting current world type: $e");
      return null;
    }
  }
}
