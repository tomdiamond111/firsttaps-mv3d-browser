import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../helpers/three_js_undo_delete_handler.dart';
import '../helpers/three_js_dialog_helper.dart';
import '../helpers/three_js_sms_positioning_helper.dart';
import '../../services/three_js_interop_service.dart';
import '../../models/file_model.dart' as fm;

/// Mixin for undo-related operations and enhanced UI functionality
/// This restores missing undo operations from the refactoring
mixin ThreeJsUndoOperationsMixin<T extends StatefulWidget> on State<T>
    implements
        UndoDeleteDelegate,
        DialogHelperDelegate,
        SmsPositioningDelegate {
  // Helper instances
  late ThreeJsUndoDeleteHandler _undoDeleteHandler;
  late ThreeJsDialogHelper _dialogHelper;
  late ThreeJsSmsPositioningHelper _smsPositioningHelper;

  /// Initialize the undo operations mixin
  /// This should be called in initState() of the implementing class
  void initializeUndoOperations() {
    _undoDeleteHandler = ThreeJsUndoDeleteHandler(this);
    _dialogHelper = ThreeJsDialogHelper(this);
    _smsPositioningHelper = ThreeJsSmsPositioningHelper(this);
  }

  /// Dispose of undo operations resources
  /// This should be called in dispose() of the implementing class
  void disposeUndoOperations() {
    // Helper classes don't need explicit disposal
    // but this method is available for future use
  }

  // ============================================================================
  // UNDO DELETE OPERATIONS - Restored from refactoring
  // ============================================================================

  /// Show undo delete snackbar for individual objects
  /// This method was completely lost in the refactoring
  void showUndoDeleteSnackbar(String objectId, String objectName) {
    _undoDeleteHandler.showUndoDeleteSnackbar(objectId, objectName);
  }

  /// Undo delete for individual objects with full attribute restoration
  /// This critical method was lost in the refactoring
  Future<void> undoDeleteObject(String objectId, String objectName) {
    return _undoDeleteHandler.undoDeleteObject(objectId, objectName);
  }

  /// Handle object deletion with undo functionality
  /// This bridges JavaScript deletion events with Flutter undo UI
  void handleObjectDeletionWithUndo(String objectId, String objectName) {
    _undoDeleteHandler.handleObjectDeletionWithUndo(objectId, objectName);
  }

  /// Check if an object can be restored
  bool canRestoreObject(String objectId) {
    return _undoDeleteHandler.canRestoreObject(objectId);
  }

  // ============================================================================
  // ENHANCED DIALOG OPERATIONS - Restored from refactoring
  // ============================================================================

  /// Show advanced delete options dialog
  /// This enhanced dialog was lost in the refactoring
  void showAdvancedDeleteOptionsDialog() {
    _dialogHelper.showDeleteOptionsDialog();
  }

  /// Show delete objects only confirmation
  void showDeleteObjectsConfirmation() {
    _dialogHelper.showDeleteObjectsConfirmation();
  }

  /// Show delete objects and files confirmation
  void showDeleteObjectsAndFilesConfirmation() {
    _dialogHelper.showDeleteObjectsAndFilesConfirmation();
  }

  /// Show undo confirmation dialog
  void showUndoConfirmationDialog() {
    _dialogHelper.showUndoConfirmationDialog();
  }

  /// Show premium upgrade dialog
  void showPremiumUpgradeDialog(String featureName) {
    _dialogHelper.showPremiumUpgradeDialog(featureName);
  }

  /// Show premium control panel for testing
  void showPremiumControlPanel() {
    _dialogHelper.showPremiumControlPanel();
  }

  /// Show custom confirmation dialog
  void showConfirmationDialog({
    required String title,
    required String content,
    required String confirmLabel,
    required VoidCallback onConfirm,
    Color confirmColor = Colors.red,
    bool useWhiteText = true,
  }) {
    _dialogHelper.showConfirmationDialog(
      title: title,
      content: content,
      confirmLabel: confirmLabel,
      onConfirm: onConfirm,
      confirmColor: confirmColor,
      useWhiteText: useWhiteText,
    );
  }

  // ============================================================================
  // ENHANCED SMS POSITIONING - Restored from refactoring
  // ============================================================================

  /// Build enhanced SMS input with landscape support
  /// This enhanced positioning was lost in the refactoring
  Widget buildEnhancedSmsInput() {
    return _smsPositioningHelper.buildEnhancedSmsInput();
  }

  /// Get optimal SMS input width based on orientation
  double getOptimalSmsWidth(BuildContext context) {
    return _smsPositioningHelper.getOptimalSmsWidth(context);
  }

  /// Get optimal SMS input margins based on orientation
  EdgeInsets getOptimalSmsMargins(BuildContext context) {
    return _smsPositioningHelper.getOptimalSmsMargins(context);
  }

  /// Check if landscape optimizations should be used
  bool shouldUseLandscapeOptimizations(BuildContext context) {
    return _smsPositioningHelper.shouldUseLandscapeOptimizations(context);
  }

  /// Build keyboard avoiding SMS input
  Widget buildKeyboardAvoidingSmsInput(Widget child) {
    return _smsPositioningHelper.buildKeyboardAvoidingSmsInput(child);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /// Show loading dialog
  void showLoadingDialog(String message) {
    _dialogHelper.showLoadingDialog(message);
  }

  /// Hide loading dialog
  void hideLoadingDialog() {
    _dialogHelper.hideLoadingDialog();
  }

  /// Show success dialog
  void showSuccessDialog(String message) {
    _dialogHelper.showSuccessDialog(message);
  }

  /// Show error dialog
  void showErrorDialog(String message) {
    _dialogHelper.showErrorDialog(message);
  }

  // ============================================================================
  // ABSTRACT METHODS - Must be implemented by the using class
  // ============================================================================

  // UndoDeleteDelegate requirements
  @override
  BuildContext get context;

  @override
  bool get mounted;

  @override
  ThreeJsInteropService get threeJsInteropService;

  @override
  List<fm.FileModel> get filesToDisplay;

  // SmsPositioningDelegate requirements
  @override
  String? get currentSmsContactId;

  @override
  bool get isSmsInputVisible;

  @override
  bool get isWebViewInitialized;

  @override
  WebViewController get webViewController;

  @override
  void Function() get closeSmsInput;

  @override
  void Function(String message) get sendSmsMessage;

  // ============================================================================
  // STATIC INSTANCE MANAGEMENT - Restored from refactoring
  // ============================================================================

  /// Static reference for global access
  /// This was lost in the refactoring and is needed for JavaScript communication
  static State? _currentInstance;

  /// Set current instance for global access
  void setAsCurrentInstance() {
    _currentInstance = this;
  }

  /// Clear current instance
  void clearCurrentInstance() {
    if (_currentInstance == this) {
      _currentInstance = null;
    }
  }

  /// Get current instance for global operations
  static State? get currentInstance => _currentInstance;

  /// Check if there's a current instance available
  static bool get hasCurrentInstance => _currentInstance != null;

  // ============================================================================
  // JAVASCRIPT INTEGRATION HELPERS
  // ============================================================================

  /// Notify JavaScript about level refresh (for premium features)
  /// This method was missing from the refactored version
  void notifyJavaScriptLevelRefresh() {
    // This will be implemented by the main screen class
    // using the WebViewController
    print('🎮 Level refresh notification from mixin');
  }

  /// Handle global gaming level refresh
  /// This static method was lost in the refactoring
  static void refreshGamingLevelsGlobally() {
    print('🎮 STATIC METHOD: refreshGamingLevelsGlobally called from mixin');
    if (_currentInstance != null &&
        _currentInstance is ThreeJsUndoOperationsMixin) {
      final mixinInstance = _currentInstance as ThreeJsUndoOperationsMixin;
      mixinInstance.notifyJavaScriptLevelRefresh();
      print('🎮 STATIC METHOD: ✅ Level refresh completed');
    } else {
      print('⚠️ STATIC METHOD: No instance available for level refresh');
    }
  }
}
