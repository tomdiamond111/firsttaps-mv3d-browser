import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:external_app_launcher/external_app_launcher.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:open_filex/open_filex.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';

import '../../services/three_js_interop_service.dart';
import '../../services/device_contact_service.dart';
import '../../services/contact_dialer_service.dart';
import '../../services/poster_url_persistence_service.dart';
import '../../services/music_search_service.dart';
import '../../services/user_activity_service.dart';
import '../../services/similar_content_service.dart';
import '../../services/content_feedback_service.dart';
import '../../services/recommendation_service.dart';
import '../../sms/sms_channel_manager.dart';
import '../../models/file_model.dart' as fm;
import '../premium_store_screen.dart';

/// Delegate interface that provides access to main screen dependencies
abstract class JavaScriptChannelDelegate {
  // Core dependencies
  WebViewController get webViewController;
  ThreeJsInteropService get threeJsInteropService;
  SmsChannelManager get smsChannelManager;
  BuildContext get context;
  bool get mounted;

  // State management
  void setState(VoidCallback fn);

  // State getters
  List<fm.FileModel> get filesToDisplay;
  bool get isWorldReady; // Track if 3D world has finished initializing

  // Callback functions
  Future<void> Function(String fileId) get onFileDeleted;
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
  get onFileMoved;
  Future<void> Function(fm.FileModel linkFile)? get onLinkObjectAdded;
  Future<void> Function(String objectId, String customName)?
  get onLinkNameChanged;
  Future<void> Function(Map<String, dynamic> data)?
  get onPremiumGamingPopupRequested;

  // UI methods
  void showSmsInput(String contactId);
  void showDeleteConfirmationDialog(String objectId, String objectName);
  void showObjectActionBottomSheet(String objectId, String objectName);
  Future<void> handleObjectDeletion(String objectId);
  void updateRecentMovesState();
  Future<void> handleOpenFileRequest(String fileId);

  // NEW: Missing undo delete methods that were lost in refactoring
  void showUndoDeleteSnackbar(String objectId, String objectName);
  Future<void> undoDeleteObject(String objectId, String objectName);
  void handleObjectDeletionWithUndo(String objectId, String objectName);

  // NEW: Track last created furniture ID for playlist import
  void setLastCreatedFurnitureId(String? furnitureId);

  // Path tracking method
  void addFileToState(fm.FileModel fileModel);

  // World ready callback
  void onWorldReady();
}

/// Helper class to manage all JavaScript channel setup and handling
class ThreeJsJavaScriptChannels {
  final JavaScriptChannelDelegate delegate;

  ThreeJsJavaScriptChannels(this.delegate);

  /// Add all JavaScript channels to the WebViewController
  void setupJavaScriptChannels(WebViewController controller) {
    // Add WorldReadyChannel - notifies Flutter when 3D world finishes loading
    controller.addJavaScriptChannel(
      'WorldReadyChannel',
      onMessageReceived: (message) {
        print("🚀 WorldReadyChannel: 3D world is fully loaded!");
        delegate.onWorldReady();
      },
    );

    // Add FlutterLog channel
    controller.addJavaScriptChannel(
      'FlutterLog',
      onMessageReceived: (message) {
        print("JS Log: ${message.message}");
      },
    );

    // Add DeleteRequestHandler channel
    controller.addJavaScriptChannel(
      'DeleteRequestHandler',
      onMessageReceived: (message) {
        print("JS DeleteRequestHandler: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          final String objectId = data['id']; // This ID is the file path
          final String objectName = data['name'] ?? 'this file';
          delegate.showDeleteConfirmationDialog(objectId, objectName);
        } catch (e) {
          print("Error processing delete request from JS: $e");
        }
      },
    );

    // Add HideSmsKeyboard channel
    controller.addJavaScriptChannel(
      'HideSmsKeyboard',
      onMessageReceived: (message) {
        print("📤 [JavaScript] SMS screen requested to hide keyboard");
        _closeSmsInput();
      },
    );

    // Add ObjectMovedChannel
    controller.addJavaScriptChannel(
      'ObjectMovedChannel',
      onMessageReceived: (message) {
        print("JS ObjectMovedChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          final String fileId = data['id']; // This ID is the file path
          final double x = (data['x'] as num).toDouble();
          final double y = (data['y'] as num).toDouble(); // This is the base Y
          final double z = (data['z'] as num).toDouble();

          // ROTATION FIX: Extract rotation if present
          final double? rotation = data.containsKey('rotation')
              ? (data['rotation'] as num?)?.toDouble()
              : null;

          // Only extract furniture metadata if the keys exist in the message
          // This distinguishes between "furniture data not sent" vs "furniture data sent as null"
          final String? furnitureId = data.containsKey('furnitureId')
              ? data['furnitureId'] as String?
              : null;
          // FURNITURE FIX: JavaScript sends "slotIndex" not "furnitureSlotIndex"
          final int? furnitureSlotIndex = data.containsKey('slotIndex')
              ? data['slotIndex'] as int?
              : null;
          final bool hasFurnitureData = data.containsKey('furnitureId');

          // Call the callback to notify about the moved file
          delegate.onFileMoved(
            fileId,
            x,
            y,
            z,
            rotation: rotation, // Pass rotation to delegate
            furnitureId: hasFurnitureData ? furnitureId : null,
            furnitureSlotIndex: hasFurnitureData ? furnitureSlotIndex : null,
            updateFurniture: hasFurnitureData,
          );

          // Update recent moves state after an object is moved
          Future.delayed(const Duration(milliseconds: 200), () {
            delegate.updateRecentMovesState();
          });
        } catch (e) {
          print("Error processing object moved from JS: $e");
        }
      },
    );

    // Add OpenFileChannel
    controller.addJavaScriptChannel(
      'OpenFileChannel',
      onMessageReceived: (message) {
        print("JS OpenFileChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          final String fileId = data['id']; // This ID is the file path

          // Check if this is a contact file and avoid showing user messages
          final isContactFile =
              fileId.contains('contact://') ||
              fileId.contains('.contact') ||
              data.toString().contains('contact');

          if (isContactFile) {
            print("Contact interaction detected - no user message needed");
            // For contacts, we just log but don't call the file handler
            // since contacts are handled by their own interaction system
          } else {
            // For non-contact files, handle normally
            delegate.handleOpenFileRequest(fileId);
          }
        } catch (e) {
          print("Error processing open file request from JS: $e");
        }
      },
    );

    // Add LinkObjectAddedChannel
    controller.addJavaScriptChannel(
      'LinkObjectAddedChannel',
      onMessageReceived: (message) {
        print("JS LinkObjectAddedChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          handleLinkObjectAdded(data);
        } catch (e) {
          print("Error processing link object added from JS: $e");
        }
      },
    );

    // Add PremiumGamingPopupChannel
    controller.addJavaScriptChannel(
      'PremiumGamingPopupChannel',
      onMessageReceived: (message) {
        print("JS PremiumGamingPopupChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          // Call home page controller to show premium gaming popup
          if (delegate.onPremiumGamingPopupRequested != null) {
            delegate.onPremiumGamingPopupRequested!(data);
          }
        } catch (e) {
          print("Error processing premium gaming popup request from JS: $e");
        }
      },
    );

    // Add LinkNameChangeChannel
    controller.addJavaScriptChannel(
      'LinkNameChangeChannel',
      onMessageReceived: (message) {
        print("JS LinkNameChangeChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          handleLinkNameChange(data);
        } catch (e) {
          print("Error processing link name change from JS: $e");
        }
      },
    );

    // Add LinkNameLoadChannel
    controller.addJavaScriptChannel(
      'LinkNameLoadChannel',
      onMessageReceived: (message) {
        print("JS LinkNameLoadChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          handleLinkNameLoad(data);
        } catch (e) {
          print("Error processing link name load from JS: $e");
        }
      },
    );

    // Add DeezerMetadataChannel
    controller.addJavaScriptChannel(
      'DeezerMetadataChannel',
      onMessageReceived: (message) {
        print("JS DeezerMetadataChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          handleDeezerMetadataRequest(data);
        } catch (e) {
          print("Error processing Deezer metadata request from JS: $e");
        }
      },
    );

    // Add SpotifyMetadataChannel
    controller.addJavaScriptChannel(
      'SpotifyMetadataChannel',
      onMessageReceived: (message) {
        print("JS SpotifyMetadataChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          handleSpotifyMetadataRequest(data);
        } catch (e) {
          print("Error processing Spotify metadata request from JS: $e");
        }
      },
    );

    // Add VimeoMetadataChannel
    controller.addJavaScriptChannel(
      'VimeoMetadataChannel',
      onMessageReceived: (message) {
        print("JS VimeoMetadataChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          handleVimeoMetadataRequest(data);
        } catch (e) {
          print("Error processing Vimeo metadata request from JS: $e");
        }
      },
    );

    // Add TikTokMetadataChannel
    controller.addJavaScriptChannel(
      'TikTokMetadataChannel',
      onMessageReceived: (message) {
        print("JS TikTokMetadataChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          handleTikTokMetadataRequest(data);
        } catch (e) {
          print("Error processing TikTok metadata request from JS: $e");
        }
      },
    );

    // Add InstagramMetadataChannel
    controller.addJavaScriptChannel(
      'InstagramMetadataChannel',
      onMessageReceived: (message) {
        print("JS InstagramMetadataChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          handleInstagramMetadataRequest(data);
        } catch (e) {
          print("Error processing Instagram metadata request from JS: $e");
        }
      },
    );

    // Add DailymotionMetadataChannel
    controller.addJavaScriptChannel(
      'DailymotionMetadataChannel',
      onMessageReceived: (message) {
        print("JS DailymotionMetadataChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          handleDailymotionMetadataRequest(data);
        } catch (e) {
          print("Error processing Dailymotion metadata request from JS: $e");
        }
      },
    );

    // Add MusicPreferencesUpdateChannel - receives music preference updates from Flutter
    controller.addJavaScriptChannel(
      'MusicPreferencesUpdateChannel',
      onMessageReceived: (message) {
        print("🎵 MusicPreferencesUpdateChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          handleMusicPreferencesUpdate(data);
        } catch (e) {
          print("Error processing music preferences update: $e");
        }
      },
    );

    // Add FileObjectDebugChannel for receiving execution diagnostics from JavaScript
    controller.addJavaScriptChannel(
      'FileObjectDebugChannel',
      onMessageReceived: (message) {
        print("📍 JS DEBUG: ${message.message}");
      },
    );

    // Add ObjectActionChannel
    controller.addJavaScriptChannel(
      'ObjectActionChannel',
      onMessageReceived: (message) {
        print("JS ObjectActionChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          final String action = data['action'] ?? '';
          final String? objectIdNullable = data['id']; // Allow null
          final String objectName = data['name'] ?? 'Unknown Object';

          // If no ID provided, skip processing
          if (objectIdNullable == null) {
            print("ObjectActionChannel: No ID provided, skipping action");
            return;
          }
          final String objectId = objectIdNullable; // Now safe to use

          // Handle object deletion action - show undo snackbar AND handle deletion
          if (action == 'objectDeleted') {
            print("Object deleted: $objectName (ID: $objectId)");

            // CRITICAL FIX: Prevent duplicate handling for contact objects
            // Contact deletion triggers both "143" and "contact://143" events
            // Only handle the contact:// version to avoid duplicate snackbars
            if (objectId.contains('contact://')) {
              // This is the proper contact deletion event - handle it with undo
              print(
                "Showing undo delete snackbar for: $objectName (ID: $objectId)",
              );
              delegate.handleObjectDeletionWithUndo(objectId, objectName);
            } else {
              // Check if this might be a contact ID that will have a contact:// counterpart
              final isLikelyContactId =
                  objectId.length <= 5 && RegExp(r'^\d+$').hasMatch(objectId);

              if (isLikelyContactId) {
                print(
                  "Ignoring numeric contact ID $objectId - waiting for contact:// version",
                );
                // This looks like a contact ID, ignore it completely
                // The contact:// version will handle both deletion and undo
                return;
              } else {
                // This is a regular object (app, file, etc.) - handle normally
                delegate.handleObjectDeletionWithUndo(objectId, objectName);
              }
            }
            return;
          }

          // Handle path creation - SKIP adding to Flutter file state
          // Paths are managed entirely by JavaScript PathManager in localStorage
          if (action == 'pathCreated') {
            print("🛤️ Path created: $objectName (ID: $objectId)");
            print(
              "🛤️ Path will be managed by JavaScript PathManager - NOT adding to Flutter state",
            );
            // DO NOT create FileModel or add to state - paths persist in JS localStorage only
            return;
          }

          // Handle furniture creation - SKIP showing dialog
          // Furniture is managed by JavaScript FurnitureManager with Flutter persistence
          if (action == 'furnitureCreated') {
            print("🪑 Furniture created: $objectName (ID: $objectId)");
            print(
              "🪑 Furniture will be managed by JavaScript FurnitureManager - NOT showing dialog",
            );
            // Store furniture ID for playlist import feature
            delegate.setLastCreatedFurnitureId(objectId);
            // DO NOT show action dialog for furniture creation - but long press is allowed
            return;
          }

          // Handle furniture long press - show move/delete menu
          final objectType = data['type'];
          if (objectType == 'furniture' ||
              (objectId.startsWith('furniture_'))) {
            print("🪑 Furniture long press: $objectName (ID: $objectId)");
            print("🪑 Showing move/delete menu for furniture");
            // Show standard action menu for furniture
            delegate.showObjectActionBottomSheet(objectId, objectName);
            return;
          }

          // Handle other actions - show action bottom sheet
          // Check if this is an app object (ID starts with "app_")
          if (objectId.startsWith('app_')) {
            // Handle app object
            print("Detected app object: $objectName");

            // Use the app name for the dialog
            delegate.showObjectActionBottomSheet(objectId, objectName);
          } else {
            // Handle file object - attempt to find the file model
            fm.FileModel? file = delegate.filesToDisplay.firstWhere(
              (f) => f.path == objectId, // Use path for matching
              orElse: () => fm.FileModel(
                // Provide a default if not found
                name: objectName,
                path: objectId,
                type: fm.FileType.other, // Default type
                extension: '', // Default extension
                x: 0,
                y: 0,
                z: 0,
              ),
            );
            // Use delegate method for file objects
            delegate.showObjectActionBottomSheet(objectId, file.name);
          }
        } catch (e) {
          print("Error processing object action request from JS: $e");
        }
      },
    );

    // Add BackupDataHandler
    controller.addJavaScriptChannel(
      'BackupDataHandler',
      onMessageReceived: (message) {
        print("JS BackupDataHandler: Received backup data");
        try {
          // Store backup data if needed in the future
          print("Backup data received successfully");
        } catch (e) {
          print("Error handling backup data: $e");
        }
      },
    );

    // Add AppLaunchHandler
    controller.addJavaScriptChannel(
      'AppLaunchHandler',
      onMessageReceived: (message) {
        print("JS AppLaunchHandler: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          final String packageName = data['packageName'] ?? '';
          final String appName = data['appName'] ?? '';
          if (packageName.isNotEmpty) {
            _handleAppLaunchFromJS(packageName, appName);
          }
        } catch (e) {
          print("Error processing app launch request from JS: $e");
        }
      },
    );

    // Add ContactDialerChannel
    controller.addJavaScriptChannel(
      'ContactDialerChannel',
      onMessageReceived: (message) {
        print("JS ContactDialerChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          final String action = data['action'] ?? '';

          if (action == 'dialContact') {
            final String phoneNumber = data['phoneNumber'] ?? '';
            final String contactName = data['contactName'] ?? '';

            if (phoneNumber.isNotEmpty) {
              print("📞 Dialing contact: $contactName ($phoneNumber)");
              _handleContactDialing(phoneNumber);
            } else {
              print("📞 Error: No phone number provided");
            }
          }
        } catch (e) {
          print("📞 Error processing contact dialer request from JS: $e");
        }
      },
    );

    // Add SMSChannel
    controller.addJavaScriptChannel(
      'SMSChannel',
      onMessageReceived: (message) {
        print("JS SMSChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          final String action = data['action'] ?? '';

          if (action == 'openSMS') {
            final String phoneNumber = data['phoneNumber'] ?? '';
            final String contactName = data['contactName'] ?? '';

            if (phoneNumber.isNotEmpty) {
              print("💬 Opening SMS for contact: $contactName ($phoneNumber)");
              _handleSMSOpen(phoneNumber);
            } else {
              print("💬 Error: No phone number provided");
            }
          }
        } catch (e) {
          print("💬 Error processing SMS request from JS: $e");
        }
      },
    );

    // Add ExternalUrlHandler
    controller.addJavaScriptChannel(
      'ExternalUrlHandler',
      onMessageReceived: (message) {
        print("JS ExternalUrlHandler: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          final String url = data['url'] ?? '';
          final String linkType = data['linkType'] ?? 'website';
          if (url.isNotEmpty) {
            _openExternalUrl(url, linkType);
          }
        } catch (e) {
          print("Error processing external URL request from JS: $e");
        }
      },
    );

    // Add UserActivityChannel - tracks link opens for personalized recommendations
    controller.addJavaScriptChannel(
      'UserActivityChannel',
      onMessageReceived: (message) {
        print("📊 JS UserActivityChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          _handleUserActivityRequest(data);
        } catch (e) {
          print("Error processing user activity request from JS: $e");
        }
      },
    );

    // Add SmsInputChannel
    controller.addJavaScriptChannel(
      'SmsInputChannel',
      onMessageReceived: (message) {
        print("JS SmsInputChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          // Handle SMS input requests from JavaScript
          _handleSmsInputRequest(data);
        } catch (e) {
          print("Error processing SMS input request from JS: $e");
        }
      },
    );

    // Add SmsDataChannel
    controller.addJavaScriptChannel(
      'SmsDataChannel',
      onMessageReceived: (message) {
        print("JS SmsDataChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          // Handle SMS data requests from JavaScript
          _handleSmsDataRequest(data);
        } catch (e) {
          print("Error processing SMS data request from JS: $e");
        }
      },
    );

    // Add SmsStatusChannel
    controller.addJavaScriptChannel(
      'SmsStatusChannel',
      onMessageReceived: (message) {
        print("JS SmsStatusChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          // Handle SMS status requests from JavaScript
          _handleSmsStatusRequest(data);
        } catch (e) {
          print("Error processing SMS status request from JS: $e");
        }
      },
    );

    // Add ContactsChannel
    controller.addJavaScriptChannel(
      'ContactsChannel',
      onMessageReceived: (message) {
        print("JS ContactsChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          _handleContactsRequest(data);
        } catch (e) {
          print("Error processing contacts request from JS: $e");
        }
      },
    );

    // Add ExploreChannel
    controller.addJavaScriptChannel(
      'ExploreChannel',
      onMessageReceived: (message) {
        print("JS ExploreChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          _handleExploreRequest(data);
        } catch (e) {
          print("Error processing explore request from JS: $e");
        }
      },
    );

    // Add AvatarPersistenceChannel
    controller.addJavaScriptChannel(
      'AvatarPersistenceChannel',
      onMessageReceived: (message) {
        print("JS AvatarPersistenceChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          _handleAvatarPersistenceRequest(data);
        } catch (e) {
          print("Error processing avatar persistence request from JS: $e");
        }
      },
    );

    // Add FurniturePersistenceChannel
    controller.addJavaScriptChannel(
      'FurniturePersistenceChannel',
      onMessageReceived: (message) async {
        print("JS FurniturePersistenceChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          await _handleFurniturePersistenceRequest(data);
        } catch (e) {
          print("Error processing furniture persistence request from JS: $e");
        }
      },
    );

    // Add posterURLPersistence
    controller.addJavaScriptChannel(
      'posterURLPersistence',
      onMessageReceived: (message) {
        print("JS posterURLPersistence: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          _handlePosterURLPersistenceRequest(data);
        } catch (e) {
          print("Error processing poster URL persistence request from JS: $e");
        }
      },
    );

    // Register Premium Store channel (must be done here, before page loads)
    controller.addJavaScriptChannel(
      'openPremiumStore',
      onMessageReceived: (message) {
        print("🛒 Premium Store requested from JS: ${message.message}");
        _handleOpenPremiumStoreFromJS(message.message);
      },
    );

    // Add MediaFileDataChannel - Convert local files to base64 data URLs for playback
    controller.addJavaScriptChannel(
      'MediaFileDataChannel',
      onMessageReceived: (message) {
        print("JS MediaFileDataChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          _handleMediaFileDataRequest(data);
        } catch (e) {
          print("Error processing media file data request from JS: $e");
        }
      },
    );

    // Add DemoFileToFurnitureChannel - For adding local demo files to furniture
    controller.addJavaScriptChannel(
      'DemoFileToFurnitureChannel',
      onMessageReceived: (message) {
        print("JS DemoFileToFurnitureChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          _handleAddDemoFileToFurniture(data);
        } catch (e) {
          print("Error processing demo file add request from JS: $e");
        }
      },
    );

    // Add DemoLinkToFurnitureChannel - For adding external links to furniture
    controller.addJavaScriptChannel(
      'DemoLinkToFurnitureChannel',
      onMessageReceived: (message) {
        print("JS DemoLinkToFurnitureChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          _handleAddDemoLinkToFurniture(data);
        } catch (e) {
          print("Error processing demo link add request from JS: $e");
        }
      },
    );

    // Add RefreshRecommendationsChannel - For refreshing furniture content with fresh API data
    controller.addJavaScriptChannel(
      'RefreshRecommendationsChannel',
      onMessageReceived: (message) {
        print(
          "🔄 RefreshRecommendationsChannel: Message received: ${message.message}",
        );

        // Try to parse as JSON for more complex requests
        try {
          final data = jsonDecode(message.message);
          if (data is Map<String, dynamic>) {
            final action = data['action'] as String?;

            if (action == 'getAdditionalRecommendations') {
              // Handle request for additional recommendations to fill empty slots
              final furnitureType = data['furnitureType'] as String?;
              final count = data['count'] as int? ?? 10;
              print(
                "📡 Requesting $count additional recommendations for $furnitureType",
              );
              _handleGetAdditionalRecommendations(furnitureType, count);
            } else {
              // Default: treat as refresh request
              _handleRefreshRecommendations();
            }
          } else {
            // Simple string message - treat as refresh
            _handleRefreshRecommendations();
          }
        } catch (e) {
          // Not JSON - treat as simple refresh request
          print("🔄 Simple refresh request (not JSON)");
          _handleRefreshRecommendations();
        }
      },
    );

    // Add ContentFeedbackChannel - For recording user likes/dislikes on content
    controller.addJavaScriptChannel(
      'ContentFeedbackChannel',
      onMessageReceived: (message) {
        print("👍👎 ContentFeedbackChannel: ${message.message}");
        try {
          final data = jsonDecode(message.message);
          _handleContentFeedback(data);
        } catch (e) {
          print("Error processing content feedback from JS: $e");
        }
      },
    );
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - IMPLEMENTATIONS MOVED FROM MAIN CLASS
  // ============================================================================

  // State variables needed for some operations
  DateTime? _lastAvatarSaveTime;
  Timer? _avatarSaveDebounceTimer;
  String? _lastSavedAvatarData;
  static const Duration _avatarSaveDebounceDelay = Duration(milliseconds: 2000);
  bool _isExploreMode = false;

  void _closeSmsInput() {
    print('📱 🔥 SMS X BUTTON PRESSED - CLOSING TEXT INPUT');
    // This will be handled by the delegate
    // delegate.setState(() {
    //   _isSmsInputVisible = false;
    //   _currentSmsContactId = null;
    // });
    print('📱 ✅ Text input HIDDEN - State updated to invisible');
    print('📱 SMS input deactivated');
  }

  void _showUndoDeleteSnackbar(String objectId, String objectName) {
    print("Showing undo delete snackbar for: $objectName (ID: $objectId)");

    // Delegate to the main screen's undo delete functionality
    delegate.showUndoDeleteSnackbar(objectId, objectName);
  }

  /// Handle Premium Store open request from JavaScript
  void _handleOpenPremiumStoreFromJS(String message) {
    print("🛒 Opening Premium Store from JavaScript channel");

    // Open Premium Store screen
    if (delegate.mounted && delegate.context.mounted) {
      Navigator.of(delegate.context).push(
        MaterialPageRoute(builder: (context) => const PremiumStoreScreen()),
      );
      print("🛒 Premium Store screen opened successfully");
    } else {
      print("🛒 ERROR: Context not mounted, cannot open Premium Store");
    }
  }

  /// Handle app launch request from JavaScript
  Future<void> _handleAppLaunchFromJS(
    String packageName,
    String appName,
  ) async {
    try {
      print("Handling app launch request: $appName ($packageName)");

      // Strip 'app_' prefix if present
      String cleanPackageName = packageName;
      if (packageName.startsWith('app_')) {
        cleanPackageName = packageName.substring(4);
      }

      print("Clean package name: $cleanPackageName");

      // Try to launch the app using external_app_launcher
      final result = await LaunchApp.openApp(
        androidPackageName: cleanPackageName,
        iosUrlScheme: cleanPackageName,
        appStoreLink: '',
      );

      print("App launch result: $result");

      // Show feedback to user
      if (delegate.mounted) {
        final message = "Launching $appName...";
        ScaffoldMessenger.of(delegate.context).showSnackBar(
          SnackBar(
            content: Text(message),
            duration: const Duration(seconds: 2),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      print("Error launching app: $e");

      // Show error feedback to user
      if (delegate.mounted) {
        final message = "Failed to launch $appName";
        ScaffoldMessenger.of(delegate.context).showSnackBar(
          SnackBar(
            content: Text(message),
            duration: const Duration(seconds: 3),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Handle contact dialing request from JavaScript
  Future<void> _handleContactDialing(String phoneNumber) async {
    try {
      print("Handling contact dialing request: $phoneNumber");

      await ContactDialerService.dialContact(phoneNumber: phoneNumber);

      if (delegate.mounted) {
        ScaffoldMessenger.of(delegate.context).showSnackBar(
          const SnackBar(
            content: Text("Opening dialer..."),
            duration: Duration(seconds: 2),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      print("Error opening dialer: $e");

      if (delegate.mounted) {
        ScaffoldMessenger.of(delegate.context).showSnackBar(
          const SnackBar(
            content: Text("Failed to open dialer"),
            duration: Duration(seconds: 3),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Handle SMS open request from JavaScript
  Future<void> _handleSMSOpen(String phoneNumber) async {
    try {
      print("💬 Handling SMS open request: $phoneNumber");

      // Create SMS URL
      final smsUri = Uri.parse('sms:$phoneNumber');

      // Check if SMS URL can be launched
      if (await canLaunchUrl(smsUri)) {
        await launchUrl(smsUri, mode: LaunchMode.externalNonBrowserApplication);
        print("💬 ✅ SMS app opened successfully");

        if (delegate.mounted) {
          ScaffoldMessenger.of(delegate.context).showSnackBar(
            const SnackBar(
              content: Text("Opening SMS app..."),
              duration: Duration(seconds: 2),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        print("💬 ❌ Cannot launch SMS URL: $smsUri");
        throw Exception("SMS app not available");
      }
    } catch (e) {
      print("💬 ❌ Error opening SMS app: $e");

      if (delegate.mounted) {
        ScaffoldMessenger.of(delegate.context).showSnackBar(
          const SnackBar(
            content: Text("Failed to open SMS app"),
            duration: Duration(seconds: 3),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Handle external URL opening request from JavaScript
  ///
  /// Note: When native apps (YouTube, Spotify, etc.) are installed, they open in separate tasks
  /// and back navigation works correctly. If only browser is available, Android may aggressively
  /// reclaim memory, but AutomaticKeepAliveClientMixin should preserve WebView state.
  ///
  /// TikTok requires special handling due to task affinity issues - uses more aggressive separation.
  Future<void> _openExternalUrl(String url, String linkType) async {
    try {
      print("🌐 Opening external URL: $url (type: $linkType)");

      // Parse the URL to ensure it's valid
      final uri = Uri.parse(url);

      // Check if URL can be launched
      if (await canLaunchUrl(uri)) {
        // TikTok requires externalApplication mode for proper task separation
        // Other apps work fine with externalNonBrowserApplication
        final launchMode = linkType == 'tiktok'
            ? LaunchMode.externalApplication
            : LaunchMode.externalNonBrowserApplication;

        print("🌐 Launching URL with $launchMode mode");
        final success = await launchUrl(uri, mode: launchMode);

        if (success) {
          print("Successfully opened URL in external browser: $url");

          // Show success feedback
          if (delegate.mounted) {
            ScaffoldMessenger.of(delegate.context).showSnackBar(
              SnackBar(
                content: Text("Opening $linkType link..."),
                duration: const Duration(seconds: 2),
                backgroundColor: Colors.green,
              ),
            );
          }
        } else {
          throw Exception("Failed to launch URL");
        }
      } else {
        throw Exception("Cannot launch URL: $url");
      }
    } catch (e) {
      print("Error opening external URL: $e");

      // Show error feedback
      if (delegate.mounted) {
        ScaffoldMessenger.of(delegate.context).showSnackBar(
          SnackBar(
            content: Text("Failed to open link: $url"),
            duration: const Duration(seconds: 3),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Handle SMS input requests from JavaScript
  Future<void> _handleSmsInputRequest(Map<String, dynamic> data) async {
    try {
      print("📱 SMS Input Request: ${data['action']}");

      // Forward to the SMS Channel Manager
      await delegate.smsChannelManager.handleJavaScriptRequest('input', data);
    } catch (e) {
      print("📱 Error handling SMS input request: $e");
    }
  }

  /// Handle SMS data requests from JavaScript
  Future<void> _handleSmsDataRequest(Map<String, dynamic> data) async {
    try {
      print("📱 SMS Data Request: ${data['action']}");

      // Forward to the SMS Channel Manager
      await delegate.smsChannelManager.handleJavaScriptRequest('data', data);
    } catch (e) {
      print("📱 Error handling SMS data request: $e");
    }
  }

  /// Handle SMS status requests from JavaScript
  Future<void> _handleSmsStatusRequest(Map<String, dynamic> data) async {
    try {
      print("📱 SMS Status Request: ${data['action']}");

      // Forward to the SMS Channel Manager
      await delegate.smsChannelManager.handleJavaScriptRequest('status', data);
    } catch (e) {
      print("📱 Error handling SMS status request: $e");
    }
  }

  /// Handle contacts requests from JavaScript
  Future<void> _handleContactsRequest(Map<String, dynamic> data) async {
    try {
      final String action = data['action'] ?? '';
      print("📱 Contacts Request: $action");

      switch (action) {
        case 'getDeviceContacts':
          await _getDeviceContacts();
          break;
        case 'getContactFiles':
          await _getContactFiles();
          break;
        case 'checkContactPermissions':
          await _checkContactPermissions();
          break;
        case 'requestContactPermissions':
          await _requestContactPermissions();
          break;
        default:
          print("📱 Unknown contacts action: $action");
      }
    } catch (e) {
      print("📱 Error handling contacts request: $e");
    }
  }

  /// Get device contacts and send to JavaScript
  Future<void> _getDeviceContacts() async {
    try {
      print("📱 Getting device contacts...");

      final contacts = await DeviceContactService.getAllContactsWithPhones();

      // Convert contacts to JavaScript-friendly format
      final contactsData = contacts.map((contact) {
        return {
          'id': contact.id,
          'displayName': contact.displayName,
          'name': contact.displayName,
          'phones': contact.phones
              .map(
                (phone) => {'number': phone.number, 'label': phone.label.name},
              )
              .toList(),
          'phoneNumbers': contact.phones.map((phone) => phone.number).toList(),
        };
      }).toList();

      print("📱 Sending ${contactsData.length} contacts to JavaScript");

      // Send contacts back to JavaScript
      await delegate.webViewController.runJavaScript('''
        if (window.contactsLoadCallback) {
          window.contactsLoadCallback(${jsonEncode(contactsData)});
        } else {
          console.log("📱 No contactsLoadCallback found, storing contacts in window.deviceContacts");
          window.deviceContacts = ${jsonEncode(contactsData)};
        }
      ''');
    } catch (e) {
      print("📱 Error getting device contacts: $e");

      // Send error to JavaScript
      await delegate.webViewController.runJavaScript('''
        if (window.contactsLoadCallback) {
          window.contactsLoadCallback(null, "$e");
        }
      ''');
    }
  }

  /// Get contact files from persistence
  Future<void> _getContactFiles() async {
    try {
      print("📱 Getting contact files from persistence...");

      // For now, return empty list since we don't have direct access to controller
      // This could be enhanced later by passing controller as parameter
      final contactFiles = <Map<String, dynamic>>[];

      print("📱 Found ${contactFiles.length} contact files in persistence");

      // Send contact files back to JavaScript
      await delegate.webViewController.runJavaScript('''
        if (window.contactFilesCallback) {
          window.contactFilesCallback(${jsonEncode(contactFiles)});
        } else {
          console.log("📱 No contactFilesCallback found, storing in window.contactFiles");
          window.contactFiles = ${jsonEncode(contactFiles)};
        }
      ''');
    } catch (e) {
      print("📱 Error getting contact files: $e");

      await delegate.webViewController.runJavaScript('''
        if (window.contactFilesCallback) {
          window.contactFilesCallback(null, "$e");
        }
      ''');
    }
  }

  /// Check contact permissions
  Future<void> _checkContactPermissions() async {
    try {
      final hasPermission = await DeviceContactService.hasContactsPermission();

      print("📱 Contact permissions check: $hasPermission");

      await delegate.webViewController.runJavaScript('''
        if (window.contactPermissionsCallback) {
          window.contactPermissionsCallback($hasPermission);
        } else {
          console.log("📱 Contact permissions: $hasPermission");
          window.contactPermissions = $hasPermission;
        }
      ''');
    } catch (e) {
      print("📱 Error checking contact permissions: $e");
    }
  }

  /// Request contact permissions
  Future<void> _requestContactPermissions() async {
    try {
      final granted = await DeviceContactService.requestContactsPermission();

      print("📱 Contact permissions request result: $granted");

      await delegate.webViewController.runJavaScript('''
        if (window.contactPermissionsCallback) {
          window.contactPermissionsCallback($granted);
        } else {
          console.log("📱 Contact permissions granted: $granted");
          window.contactPermissions = $granted;
        }
      ''');
    } catch (e) {
      print("📱 Error requesting contact permissions: $e");
    }
  }

  /// Handle media file data requests - convert local files to base64 data URLs
  Future<void> _handleMediaFileDataRequest(Map<String, dynamic> data) async {
    try {
      final String action = data['action'] ?? '';
      final String filePath = data['filePath'] ?? '';
      final String extension = data['extension'] ?? '';

      print("🎵 Media file data request: $action for $filePath");

      if (action == 'getMediaDataUrl' && filePath.isNotEmpty) {
        final file = File(filePath);

        if (await file.exists()) {
          final fileSize = await file.length();
          const maxSizeForDataUrl = 50 * 1024 * 1024; // 50MB limit

          print(
            "🎵 File size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toStringAsFixed(2)}MB)",
          );

          // If file is too large, open in external app instead
          if (fileSize > maxSizeForDataUrl) {
            print("🎵 File exceeds 50MB limit - opening in external app");

            // Notify JavaScript that we're opening externally
            await delegate.webViewController.runJavaScript('''
              if (window.mediaFileDataCallback) {
                window.mediaFileDataCallback(${jsonEncode(filePath)}, "OPEN_EXTERNAL");
                console.log("🎵 Opening large file in external app");
              }
            ''');

            // Open file in native app using open_filex
            await _openFileInExternalApp(filePath);
            return;
          }

          // For files under 50MB, proceed with normal data URL conversion
          final bytes = await file.readAsBytes();
          final mimeType = _getMimeType(extension);
          final dataUrl = 'data:$mimeType;base64,${base64Encode(bytes)}';

          print("🎵 Converted ${bytes.lengthInBytes} bytes to data URL");

          // Send data URL back to JavaScript via callback
          await delegate.webViewController.runJavaScript('''
            if (window.mediaFileDataCallback) {
              window.mediaFileDataCallback(${jsonEncode(filePath)}, ${jsonEncode(dataUrl)});
              console.log("🎵 Media data URL sent to JavaScript");
            } else {
              console.error("🎵 No mediaFileDataCallback found!");
            }
          ''');
        } else {
          print("🎵 File not found: $filePath");
          // Send error to JavaScript
          await delegate.webViewController.runJavaScript('''
            if (window.mediaFileDataCallback) {
              window.mediaFileDataCallback(${jsonEncode(filePath)}, null);
            }
          ''');
        }
      }
    } catch (e) {
      print("🎵 Error handling media file data request: $e");

      // Send error to JavaScript
      final filePath = data['filePath'] ?? '';
      await delegate.webViewController.runJavaScript('''
        if (window.mediaFileDataCallback) {
          window.mediaFileDataCallback(${jsonEncode(filePath)}, null);
        }
      ''');
    }
  }

  /// Open file in external app (for files >50MB)
  Future<void> _openFileInExternalApp(String filePath) async {
    try {
      final result = await OpenFilex.open(filePath);
      print("🎵 External app open result: ${result.type} - ${result.message}");
    } catch (e) {
      print("🎵 Error opening file in external app: $e");
    }
  }

  /// Get MIME type from file extension
  String _getMimeType(String extension) {
    final ext = extension.toLowerCase();

    // Video types
    if (ext == '.mp4') return 'video/mp4';
    if (ext == '.mov') return 'video/quicktime';
    if (ext == '.avi') return 'video/x-msvideo';
    if (ext == '.webm') return 'video/webm';
    if (ext == '.mkv') return 'video/x-matroska';

    // Audio types
    if (ext == '.mp3') return 'audio/mpeg';
    if (ext == '.wav') return 'audio/wav';
    if (ext == '.flac') return 'audio/flac';
    if (ext == '.aac') return 'audio/aac';
    if (ext == '.ogg') return 'audio/ogg';
    if (ext == '.m4a') return 'audio/mp4';

    // Default
    return 'application/octet-stream';
  }

  /// Handle explore mode requests from JavaScript
  void _handleExploreRequest(Map<String, dynamic> data) {
    try {
      final String action = data['action'] ?? '';
      print("🚶 Explore Request: $action");

      switch (action) {
        case 'toggle':
          _toggleExploreMode();
          break;
        case 'status':
          // Update explore mode status from JavaScript
          delegate.setState(() {
            _isExploreMode = data['enabled'] ?? false;
          });
          break;
        default:
          print("🚶 Unknown explore action: $action");
      }
    } catch (e) {
      print("🚶 Error handling explore request: $e");
    }
  }

  /// Toggle explore mode and synchronize with JavaScript
  void _toggleExploreMode() {
    final newState = !_isExploreMode;
    delegate.setState(() {
      _isExploreMode = newState;
    });

    print("🚶 Toggling explore mode: $newState");

    // Send command to JavaScript
    delegate.webViewController.runJavaScript('''
      if (window.toggleExploreMode) {
        window.toggleExploreMode($newState);
        console.log("🚶 Explore mode toggled from Flutter: $newState");
      } else {
        console.warn("🚶 toggleExploreMode function not found in JavaScript");
      }
    ''');
  }

  /// Handle avatar persistence requests from JavaScript
  Future<void> _handleAvatarPersistenceRequest(
    Map<String, dynamic> data,
  ) async {
    try {
      final String action = data['action'] ?? '';

      // AGGRESSIVE DEBOUNCING: Block frequent avatar save operations
      if (action == 'saveToPrefs' || action == 'saveAvatarCustomizations') {
        final now = DateTime.now();
        if (_lastAvatarSaveTime != null &&
            now.difference(_lastAvatarSaveTime!).inSeconds < 10) {
          // Block saves within 10 seconds - too frequent
          return;
        }
        _lastAvatarSaveTime = now;
      }

      // Greatly reduced avatar logging - only log errors and important actions
      if (action == 'saveToFile' ||
          action == 'readFileFromStorage' ||
          action == 'saveExploreAvatarCustomization' ||
          action == 'loadExploreAvatarCustomization') {
        print("👤 Avatar Persistence Request: $action");
      }

      switch (action) {
        case 'saveAvatarCustomizations':
        case 'storeAvatarData':
          final String avatarData = data['data'] ?? '';
          await _saveAvatarCustomizations(avatarData);
          break;
        case 'loadAvatarCustomizations':
          await _loadAvatarCustomizations();
          break;
        case 'saveExploreAvatarCustomization':
          final String exploreAvatarData = data['data'] ?? '';
          await _saveExploreAvatarCustomization(exploreAvatarData);
          break;
        case 'loadExploreAvatarCustomization':
          await _loadExploreAvatarCustomization();
          break;
        case 'saveToFile':
        case 'readFileFromStorage':
          final String filename =
              data['filename'] ?? 'avatar_customizations.json';
          final String? fileData = data['data'];
          if (fileData != null) {
            await _saveAvatarToFile(filename, fileData);
          } else {
            await _readAvatarFromFile(filename);
          }
          break;
        case 'saveToPrefs':
        case 'getStringPreference':
        case 'loadStringFromPrefs':
        case 'getUserPreference':
        case 'SharedPreferencesChannel':
          final String key = data['key'] ?? 'contactAvatarCustomizations';
          final String? prefData = data['data'];
          if (prefData != null) {
            await _saveAvatarToPrefs(key, prefData);
          } else {
            await _loadAvatarFromPrefs(key);
          }
          break;
        default:
          print("👤 Unknown avatar persistence action: $action");
      }
    } catch (e) {
      print("👤 Error handling avatar persistence request: $e");
    }
  }

  /// Save avatar customizations to SharedPreferences using AsyncAPI with debouncing
  Future<void> _saveAvatarCustomizations(String avatarData) async {
    try {
      // Check if data actually changed
      if (_lastSavedAvatarData == avatarData) {
        return; // Skip save if data hasn't changed
      }

      // Cancel existing timer if running
      _avatarSaveDebounceTimer?.cancel();

      // Set up debounced save
      _avatarSaveDebounceTimer = Timer(_avatarSaveDebounceDelay, () async {
        await _performAvatarSave(avatarData);
      });
    } catch (e) {
      print("👤 Error setting up avatar save: $e");
    }
  }

  /// Perform the actual avatar save operation
  Future<void> _performAvatarSave(String avatarData) async {
    try {
      final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
      await asyncPrefs.setString('contactAvatarCustomizations', avatarData);

      // Silent verification - only log failures
      final String? verifyData = await asyncPrefs.getString(
        'contactAvatarCustomizations',
      );
      if (verifyData == null || verifyData != avatarData) {
        print(
          "👤 [ERROR] Avatar save verification failed! Expected: ${avatarData.length} chars, Got: ${verifyData?.length ?? 0} chars",
        );
      } else {
        _lastSavedAvatarData = avatarData; // Update last saved data
      }

      // Confirm save to JavaScript (reduced logging)
      await delegate.webViewController.runJavaScript('''
        if (window.avatarSaveCallback) {
          window.avatarSaveCallback(true);
        }
      ''');
    } catch (e) {
      print("👤 Error saving avatar customizations: $e");

      // Report error to JavaScript
      await delegate.webViewController.runJavaScript('''
        console.error("👤 Error saving avatar customizations: $e");
        if (window.avatarSaveCallback) {
          window.avatarSaveCallback(false);
        }
      ''');
    }
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

      await delegate.webViewController.runJavaScript('''
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
      await delegate.webViewController.runJavaScript('''
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
  // FURNITURE PERSISTENCE HANDLERS
  // ============================================================================

  Future<void> _handleFurniturePersistenceRequest(
    Map<String, dynamic> data,
  ) async {
    try {
      final String action = data['action'] ?? '';

      switch (action) {
        case 'saveFurnitureData':
          final String furnitureData = data['data'] ?? '';
          await _saveFurnitureData(furnitureData);
          break;
        case 'loadFurnitureData':
          await _loadFurnitureData();
          break;
        default:
          print("🪑 Unknown furniture persistence action: $action");
      }
    } catch (e) {
      print("🪑 Error handling furniture persistence request: $e");
    }
  }

  /// Save furniture data to SharedPreferences
  Future<void> _saveFurnitureData(String furnitureData) async {
    try {
      final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
      await asyncPrefs.setString('furnitureData', furnitureData);

      print("🪑 Saved furniture data: ${furnitureData.length} characters");

      // Confirm save to JavaScript
      await delegate.webViewController.runJavaScript('''
        if (window.furnitureSaveCallback) {
          window.furnitureSaveCallback(true);
        }
      ''');
    } catch (e) {
      print("🪑 Error saving furniture data: $e");

      // Report error to JavaScript
      await delegate.webViewController.runJavaScript('''
        console.error("🪑 Error saving furniture data: $e");
        if (window.furnitureSaveCallback) {
          window.furnitureSaveCallback(false);
        }
      ''');
    }
  }

  /// Load furniture data from SharedPreferences
  Future<void> _loadFurnitureData() async {
    try {
      final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
      final String? furnitureData = await asyncPrefs.getString('furnitureData');

      if (furnitureData != null && furnitureData.isNotEmpty) {
        print("🪑 Loaded furniture data: ${furnitureData.length} characters");
      } else {
        print("🪑 No furniture data found in storage");
      }

      // Use base64 encoding to safely pass data through JavaScript
      final String? safeData = furnitureData != null
          ? base64Encode(utf8.encode(furnitureData))
          : null;

      await delegate.webViewController.runJavaScript('''
        console.log("🪑 [FLUTTER LOAD] Sending furniture data to JS...");
        console.log("🪑 [FLUTTER LOAD] Data available: ${furnitureData != null}");
        console.log("🪑 [FLUTTER LOAD] Data length: ${furnitureData?.length ?? 0}");
        
        var furnitureDataToPass = ${safeData != null ? '"$safeData"' : 'null'};
        
        if (furnitureDataToPass) {
          console.log("🪑 [FLUTTER LOAD] Decoding base64 data...");
          console.log("🪑 [FLUTTER LOAD] Decoded data length: " + atob(furnitureDataToPass).length);
          furnitureDataToPass = atob(furnitureDataToPass);
        }
        
        if (window.furnitureLoadCallback) {
          console.log("🪑 [FLUTTER LOAD] ✅ Using furnitureLoadCallback - calling now...");
          try {
            window.furnitureLoadCallback(furnitureDataToPass);
            console.log("🪑 [FLUTTER LOAD] ✅ Callback executed successfully");
          } catch (error) {
            console.error("🪑 [FLUTTER LOAD] ❌ Callback error:", error);
          }
        } else {
          console.log("🪑 [FLUTTER LOAD] ❌ No furnitureLoadCallback found!");
          window.loadedFurnitureData = furnitureDataToPass;
        }
      ''');
    } catch (e) {
      print("🪑 Error loading furniture data: $e");

      // Report error to JavaScript
      final errorMessage = e
          .toString()
          .replaceAll('"', '\\"')
          .replaceAll('\n', '\\n');
      await delegate.webViewController.runJavaScript('''
        console.error("🪑 [FLUTTER LOAD] ❌ Error loading furniture data: $errorMessage");
        if (window.furnitureLoadCallback) {
          console.log("🪑 [FLUTTER LOAD] Calling callback with null due to error");
          window.furnitureLoadCallback(null);
        } else {
          console.log("🪑 [FLUTTER LOAD] No callback available to report error");
        }
      ''');
    }
  }

  /// Save avatar data to file
  Future<void> _saveAvatarToFile(String filename, String data) async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/$filename');
      await file.writeAsString(data);
      print("👤 Avatar data saved to file: $filename");

      // Confirm save to JavaScript
      await delegate.webViewController.runJavaScript('''
        console.log("👤 Avatar data saved to file successfully: $filename");
        if (window.avatarFileSaveCallback) {
          window.avatarFileSaveCallback(true);
        }
      ''');
    } catch (e) {
      print("👤 Error saving avatar to file: $e");

      // Report error to JavaScript
      await delegate.webViewController.runJavaScript('''
        console.error("👤 Error saving avatar to file: $e");
        if (window.avatarFileSaveCallback) {
          window.avatarFileSaveCallback(false);
        }
      ''');
    }
  }

  /// Read avatar data from file
  Future<void> _readAvatarFromFile(String filename) async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/$filename');

      if (await file.exists()) {
        final String data = await file.readAsString();
        print(
          "👤 Avatar data read from file: $filename (${data.length} characters)",
        );

        // Send data to JavaScript
        await delegate.webViewController.runJavaScript('''
          if (window.avatarFileLoadCallback) {
            window.avatarFileLoadCallback("$data");
          } else {
            console.log("👤 Avatar file data loaded: $data");
            window.loadedAvatarFileData = "$data";
          }
        ''');
      } else {
        print("👤 Avatar file does not exist: $filename");

        // Send null to JavaScript
        await delegate.webViewController.runJavaScript('''
          if (window.avatarFileLoadCallback) {
            window.avatarFileLoadCallback(null);
          } else {
            console.log("👤 Avatar file does not exist: $filename");
            window.loadedAvatarFileData = null;
          }
        ''');
      }
    } catch (e) {
      print("👤 Error reading avatar from file: $e");

      // Report error to JavaScript
      await delegate.webViewController.runJavaScript('''
        console.error("👤 Error reading avatar from file: $e");
        if (window.avatarFileLoadCallback) {
          window.avatarFileLoadCallback(null);
        }
      ''');
    }
  }

  /// Save avatar data to SharedPreferences with custom key using AsyncAPI with debouncing
  Future<void> _saveAvatarToPrefs(String key, String data) async {
    try {
      // Skip frequent saves for contactAvatarCustomizations
      if (key == 'contactAvatarCustomizations' &&
          _lastSavedAvatarData == data) {
        return; // Skip save if data hasn't changed
      }

      final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
      await asyncPrefs.setString(key, data);

      // Update last saved data for debouncing
      if (key == 'contactAvatarCustomizations') {
        _lastSavedAvatarData = data;
      }

      // Confirm save to JavaScript
      await delegate.webViewController.runJavaScript('''
        if (window.avatarPrefsSaveCallback) {
          window.avatarPrefsSaveCallback(true);
        }
      ''');
    } catch (e) {
      print("👤 Error saving avatar to prefs: $e");

      // Report error to JavaScript
      await delegate.webViewController.runJavaScript('''
        console.error("👤 Error saving avatar to prefs: $e");
        if (window.avatarPrefsSaveCallback) {
          window.avatarPrefsSaveCallback(false);
        }
      ''');
    }
  }

  /// Load avatar data from SharedPreferences with custom key using AsyncAPI
  Future<void> _loadAvatarFromPrefs(String key) async {
    try {
      final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
      final String? data = await asyncPrefs.getString(key);

      // Only log when data is actually loaded or when there's an error
      if (data != null && data.isNotEmpty) {
        print(
          "👤 Avatar data loaded from prefs '$key': ${data.length} characters",
        );
      }

      // Send data to JavaScript
      await delegate.webViewController.runJavaScript('''
        if (window.avatarPrefsLoadCallback) {
          window.avatarPrefsLoadCallback(${data != null ? '"$data"' : 'null'});
        } else {
          console.log("👤 Avatar prefs data loaded (AsyncAPI) for key '$key': ${data != null ? data : 'null'}");
          window.loadedAvatarPrefsData = ${data != null ? '"$data"' : 'null'};
        }
      ''');
    } catch (e) {
      print("👤 Error loading avatar from prefs: $e");

      // Report error to JavaScript
      await delegate.webViewController.runJavaScript('''
        console.error("👤 Error loading avatar from prefs: $e");
        if (window.avatarPrefsLoadCallback) {
          window.avatarPrefsLoadCallback(null);
        }
      ''');
    }
  }

  /// Save explore avatar customization to SharedPreferences using AsyncAPI
  Future<void> _saveExploreAvatarCustomization(String avatarData) async {
    try {
      print("🚶 [SAVE DEBUG] Starting explore avatar save operation...");
      print("🚶 [SAVE DEBUG] Data length: ${avatarData.length}");

      final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
      print("🚶 [SAVE DEBUG] SharedPreferencesAsync instance created");

      await asyncPrefs.setString('exploreAvatarCustomization', avatarData);
      print("🚶 [SAVE DEBUG] setString completed successfully");

      // IMMEDIATE READ-BACK VERIFICATION
      final String? verifyData = await asyncPrefs.getString(
        'exploreAvatarCustomization',
      );
      if (verifyData != null && verifyData == avatarData) {
        print(
          "🚶 [SAVE DEBUG] ✅ VERIFICATION PASSED - Data persisted correctly",
        );
      } else {
        print(
          "🚶 [SAVE DEBUG] ⚠️ VERIFICATION FAILED - Data may not have persisted",
        );
        print("🚶 [SAVE DEBUG] Expected: $avatarData");
        print("🚶 [SAVE DEBUG] Got: $verifyData");
      }

      // Report success to JavaScript
      await delegate.webViewController.runJavaScript('''
        console.log("🚶 Explore avatar customization saved successfully to SharedPreferences");
      ''');
    } catch (e) {
      print("🚶 Error saving explore avatar customization: $e");

      // Report error to JavaScript
      await delegate.webViewController.runJavaScript('''
        console.error("🚶 Error saving explore avatar customization: $e");
      ''');
    }
  }

  /// Load explore avatar customization from SharedPreferences using AsyncAPI
  Future<void> _loadExploreAvatarCustomization() async {
    try {
      final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
      final String? data = await asyncPrefs.getString(
        'exploreAvatarCustomization',
      );

      print(
        "🚶 Loaded explore avatar data from SharedPreferences (AsyncAPI): ${data?.length ?? 0} characters",
      );

      // Send data to JavaScript
      await delegate.webViewController.runJavaScript('''
        if (window.exploreAvatarLoadCallback) {
          window.exploreAvatarLoadCallback(${data != null ? '"$data"' : 'null'});
        } else {
          console.log("🚶 Explore avatar data loaded (AsyncAPI): ${data != null ? data : 'null'}");
          window.loadedExploreAvatarData = ${data != null ? '"$data"' : 'null'};
        }
      ''');
    } catch (e) {
      print("🚶 Error loading explore avatar customization: $e");

      // Report error to JavaScript
      await delegate.webViewController.runJavaScript('''
        console.error("🚶 Error loading explore avatar customization: $e");
        if (window.exploreAvatarLoadCallback) {
          window.exploreAvatarLoadCallback(null);
        }
      ''');
    }
  }

  /// Handle poster URL persistence requests from JavaScript
  Future<void> _handlePosterURLPersistenceRequest(
    Map<String, dynamic> data,
  ) async {
    try {
      final String action = data['action'] ?? '';
      print("🖼️ Poster URL Persistence Request: $action");

      switch (action) {
        case 'savePosterURLsForWorld':
          final String worldType = data['worldType'] ?? 'dazzle';
          final Map<String, dynamic> posterData = data['posterData'] ?? {};

          // Convert poster data to Map<String, String>
          final Map<String, String> posterUrls = {};
          posterData.forEach((key, value) {
            if (value is String) {
              posterUrls[key] = value;
            }
          });

          await PosterURLPersistenceService.savePosterURLsForWorld(
            worldType,
            Map<String, dynamic>.from(posterUrls),
          );

          // Send success response back to JavaScript
          _sendPosterPersistenceResponse(data, success: true);
          break;

        case 'loadPosterURLsForWorld':
          try {
            final String worldType = data['worldType'] ?? 'dazzle';
            final String? callbackId = data['callbackId'];

            print("🖼️ Loading poster URLs for world: $worldType");

            final posterUrls =
                await PosterURLPersistenceService.loadPosterURLsForWorld(
                  worldType,
                );

            // Convert Map<String, dynamic> to Map<String, String> safely
            final Map<String, String> stringPosterUrls = {};
            posterUrls.forEach((key, value) {
              stringPosterUrls[key] = value.toString();
            });

            print(
              "🖼️ Loaded ${stringPosterUrls.length} poster URLs: $stringPosterUrls",
            );

            // Send response back to JavaScript with the loaded data
            _sendPosterPersistenceResponse(
              data,
              success: true,
              responseData: stringPosterUrls,
              callbackId: callbackId,
            );
          } catch (e) {
            print("🖼️ Error loading poster URLs: $e");
            _sendPosterPersistenceResponse(
              data,
              success: false,
              error: e.toString(),
            );
          }
          break;

        case 'saveSinglePosterURL':
          final String worldType = data['worldType'] ?? 'dazzle';
          final String posterType = data['posterType'] ?? '';
          final String url = data['url'] ?? '';

          if (posterType.isNotEmpty) {
            await PosterURLPersistenceService.saveSinglePosterURL(
              worldType,
              posterType,
              url,
            );
            _sendPosterPersistenceResponse(data, success: true);
          } else {
            _sendPosterPersistenceResponse(
              data,
              success: false,
              error: 'Missing posterType',
            );
          }
          break;

        case 'clearPosterURLsForWorld':
          final String worldType = data['worldType'] ?? 'dazzle';
          await PosterURLPersistenceService.clearPosterURLsForWorld(worldType);
          _sendPosterPersistenceResponse(data, success: true);
          break;

        case 'clearAllPosterURLs':
          await PosterURLPersistenceService.clearAllPosterURLs();
          _sendPosterPersistenceResponse(data, success: true);
          break;

        default:
          print("🖼️ Unknown poster URL persistence action: $action");
          _sendPosterPersistenceResponse(
            data,
            success: false,
            error: 'Unknown action',
          );
      }
    } catch (e) {
      print("🖼️ Error handling poster URL persistence request: $e");
      _sendPosterPersistenceResponse(data, success: false, error: e.toString());
    }
  }

  /// Send response back to JavaScript for poster URL persistence operations
  void _sendPosterPersistenceResponse(
    Map<String, dynamic> originalData, {
    required bool success,
    Map<String, String>? responseData,
    String? error,
    String? callbackId,
  }) {
    try {
      final response = {
        'success': success,
        'action': originalData['action'] ?? '',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };

      if (responseData != null) {
        response['data'] = responseData;
      }

      if (error != null) {
        response['error'] = error;
      }

      if (callbackId != null) {
        response['callbackId'] = callbackId;
      }

      final responseJson = jsonEncode(response);

      // Send response back to JavaScript
      delegate.webViewController.runJavaScript(
        'if (window.handlePosterURLPersistenceResponse) { window.handlePosterURLPersistenceResponse($responseJson); }',
      );

      print("🖼️ Sent poster persistence response: $success");
    } catch (e) {
      print("🖼️ Error sending poster persistence response: $e");
    }
  }

  /// Handle link object added from JavaScript - add to persistence
  Future<void> handleLinkObjectAdded(Map<String, dynamic> linkData) async {
    try {
      final linkName = linkData['name'] as String;
      print("🔗 Handling link object added from JS: $linkName");

      // Check if this is a demo media file (MP3/MP4 from assets/demomedia/)
      final isDemoFile = linkData['isDemoContent'] == true;
      final isMediaFile =
          linkData['path']?.toString().startsWith('assets/demomedia/') == true;
      if (isDemoFile && isMediaFile) {
        print(
          '🔍 DEMO: Demo media file detected: $linkName (will be added to list for tap handling)',
        );
        // Continue - demo files need to be in filesToDisplay so handleOpenFileRequest can find them
      }

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
        // Mark demo content (includes both demo media files and refreshed furniture content)
        isDemo: isDemoFile,
      );

      print("🔗 Created FileModel for link: ${linkFile.path}");
      print("🔗 Link URL stored in mimeType: ${linkFile.mimeType}");
      print(
        "🔗 Link thumbnail stored in thumbnailDataUrl: ${linkFile.thumbnailDataUrl != null ? 'Yes' : 'No'}",
      );

      // Add the link object to the parent's state manager using the new callback
      if (delegate.onLinkObjectAdded != null) {
        await delegate.onLinkObjectAdded!(linkFile);
        print(
          "✅ Link object added via onLinkObjectAdded callback: ${linkFile.name}",
        );
      } else {
        // Fallback: just update position for existing files
        delegate.onFileMoved(
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
      if (delegate.mounted && delegate.isWorldReady && !linkFile.isDemo) {
        ScaffoldMessenger.of(delegate.context).showSnackBar(
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
      if (delegate.mounted && delegate.isWorldReady && !isDemoContent) {
        ScaffoldMessenger.of(delegate.context).showSnackBar(
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
        if (delegate.onLinkNameChanged != null) {
          delegate.onLinkNameChanged!(objectId, customName);
        } else {
          print("⚠️ onLinkNameChanged callback not available");
        }

        // Show success feedback
        if (delegate.mounted) {
          ScaffoldMessenger.of(delegate.context).showSnackBar(
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
      if (delegate.mounted) {
        ScaffoldMessenger.of(delegate.context).showSnackBar(
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
        await delegate.webViewController.runJavaScript('''
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
            console.log("🔗 [FLUTTER LOAD] ❌ No linkNameLoadCallback found!");
            console.log("🔗 [FLUTTER LOAD] Available window properties:", Object.keys(window).filter(k => k.includes('link')));
          }
        ''');
      } else {
        print("⚠️ Invalid load request action: $action");
      }
    } catch (e) {
      print("❌ Error in handleLinkNameLoad: $e");

      // Send error response
      await delegate.webViewController.runJavaScript('''
        if (window.linkNameLoadCallback) {
          window.linkNameLoadCallback({});
        }
      ''');
    }
  }

  /// Handle adding a demo local file to furniture
  Future<void> _handleAddDemoFileToFurniture(Map<String, dynamic> data) async {
    try {
      final String furnitureId = data['furnitureId'] ?? '';
      final String filename = data['filename'] ?? '';
      final int slotIndex = data['slotIndex'] ?? 0;

      print(
        "🎨 Adding demo file to furniture: $filename → $furnitureId slot $slotIndex",
      );

      if (furnitureId.isEmpty || filename.isEmpty) {
        print("⚠️ Invalid demo file data: missing furnitureId or filename");
        return;
      }

      // Find the file in the existing files list - match by filename only
      final fileModel = delegate.filesToDisplay.firstWhere(
        (file) => file.name == filename || file.path.endsWith('/$filename'),
        orElse: () => throw Exception('Demo file not found: $filename'),
      );

      // Update the file's furniture assignment
      await delegate.onFileMoved(
        fileModel.path,
        fileModel.x ?? 0.0,
        fileModel.y ?? 0.0,
        fileModel.z ?? 0.0,
        rotation: fileModel.rotation,
        furnitureId: furnitureId,
        furnitureSlotIndex: slotIndex,
        updateFurniture: true,
      );

      print("✅ Demo file added to furniture successfully");
    } catch (e) {
      print("❌ Error adding demo file to furniture: $e");
    }
  }

  /// Handle adding a demo external link to furniture
  Future<void> _handleAddDemoLinkToFurniture(Map<String, dynamic> data) async {
    try {
      final String furnitureId = data['furnitureId'] ?? '';
      final String url = data['url'] ?? '';
      final String title = data['title'] ?? '';
      final String type = data['type'] ?? 'link';
      final int slotIndex = data['slotIndex'] ?? 0;

      print(
        "🔗 Adding demo link to furniture: $title ($url) → $furnitureId slot $slotIndex",
      );

      if (furnitureId.isEmpty || url.isEmpty) {
        print("⚠️ Invalid demo link data: missing furnitureId or url");
        return;
      }

      // Create a FileModel for the link object
      final linkFile = fm.FileModel(
        name: title.isNotEmpty ? title : url,
        path: url,
        extension: '',
        type: fm.FileType.other,
        x: 0.0,
        y: 0.0,
        z: 0.0,
        rotation: 0.0,
        furnitureId: furnitureId,
        furnitureSlotIndex: slotIndex,
        isDemo: true, // Mark as demo content
      );

      // Add to files list
      delegate.addFileToState(linkFile);

      // Notify JavaScript (if needed)
      if (delegate.onLinkObjectAdded != null) {
        await delegate.onLinkObjectAdded!(linkFile);
      }

      print("✅ Demo link added to furniture successfully");
    } catch (e) {
      print("❌ Error adding demo link to furniture: $e");
    }
  }

  /// Handle furniture refresh request from JavaScript
  /// Fetches fresh recommendations from platform APIs and injects them into JavaScript
  Future<void> _handleRefreshRecommendations() async {
    try {
      print(
        "🔄 [REFRESH] Fetching fresh recommendations from platform APIs...",
      );

      // Get feedback stats BEFORE refresh to show in JavaScript console
      final stats = contentFeedbackService.getStats();
      await delegate.webViewController.runJavaScript('''
        console.log('📊 [DART] Feedback stats before filtering:');
        console.log('  👍 Liked: ${stats.liked} items');
        console.log('  👎 Disliked: ${stats.disliked} items');
        console.log('  📺 Platform distribution: ${stats.platformDistribution}');
      ''');

      // Call the recommendation service via ThreeJsInteropService
      await delegate.threeJsInteropService.refreshAndInjectRecommendations();

      print("✅ [REFRESH] Fresh recommendations injected successfully");

      // Notify JavaScript that recommendations are ready
      await delegate.webViewController.runJavaScript('''
        console.log('✅ [DART] Fresh recommendations ready');
        console.log('  🔍 Disliked URLs were filtered out from API results');
        console.log('  ⚡ Liked platforms/genres were boosted in ranking');
        if (window.onRecommendationsRefreshed) {
          window.onRecommendationsRefreshed();
        }
      ''');
    } catch (e) {
      print("❌ [REFRESH] Error refreshing recommendations: $e");

      // Notify JavaScript of failure
      await delegate.webViewController.runJavaScript('''
        console.error('❌ [DART] Failed to refresh recommendations');
        if (window.onRecommendationsRefreshFailed) {
          window.onRecommendationsRefreshFailed();
        }
      ''');
    }
  }

  /// Handle request for additional recommendations to fill empty furniture slots
  /// Called when JavaScript needs more content after some objects failed to create
  Future<void> _handleGetAdditionalRecommendations(
    String? furnitureType,
    int count,
  ) async {
    try {
      print(
        "📡 [ADDITIONAL] Fetching $count additional recommendations for $furnitureType...",
      );

      // Fetch additional recommendations from appropriate platforms
      final additionalLinks = await delegate.threeJsInteropService
          .getAdditionalRecommendations(furnitureType, count);

      print(
        "✅ [ADDITIONAL] Fetched ${additionalLinks.length} additional links",
      );

      // Send recommendations back to JavaScript
      final jsonLinks = jsonEncode({'recommendations': additionalLinks});
      await delegate.webViewController.runJavaScript('''
        console.log('✅ [DART] Sending ${additionalLinks.length} additional recommendations to JavaScript');
        if (window.onAdditionalRecommendations) {
          window.onAdditionalRecommendations($jsonLinks);
        } else {
          console.warn('⚠️ window.onAdditionalRecommendations callback not found');
        }
      ''');
    } catch (e) {
      print("❌ [ADDITIONAL] Error fetching additional recommendations: $e");

      // Send empty array on failure
      await delegate.webViewController.runJavaScript('''
        console.error('❌ [DART] Failed to fetch additional recommendations');
        if (window.onAdditionalRecommendations) {
          window.onAdditionalRecommendations({recommendations: []});
        }
      ''');
    }
  }

  /// Handle content feedback from JavaScript (likes/dislikes)
  Future<void> _handleContentFeedback(Map<String, dynamic> data) async {
    try {
      print("👍👎 Processing content feedback from JavaScript...");

      final String? url = data['url'] as String?;
      final String? sentiment = data['sentiment'] as String?;
      final String? platform = data['platform'] as String?;
      final String? title = data['title'] as String?;
      final String? genre = data['genre'] as String?;

      if (url == null || sentiment == null || platform == null) {
        print("⚠️ Missing required feedback data");
        return;
      }

      // Use the global content feedback service instance
      await contentFeedbackService.recordFeedback(
        url: url,
        sentiment: sentiment,
        platform: platform,
        title: title,
        genre: genre,
      );

      // PATTERN LEARNING: If disliked, record with metadata for pattern detection
      if (sentiment == 'disliked') {
        await recommendationService.recordDislikeWithMetadata(url, title ?? '');
      }

      // Get updated stats
      final stats = contentFeedbackService.getStats();
      print(
        "📊 Feedback stats: ${stats.liked} liked, ${stats.disliked} disliked",
      );

      // Send acknowledgment back to JavaScript
      await delegate.webViewController.runJavaScript('''
        console.log('✅ [DART] Feedback recorded: $sentiment for $platform');
        if (window.onFeedbackRecorded) {
          window.onFeedbackRecorded({
            url: '$url',
            sentiment: '$sentiment',
            platform: '$platform'
          });
        }
      ''');
    } catch (e) {
      print("❌ Error handling content feedback: $e");
    }
  }

  /// Handle Deezer metadata request from JavaScript
  /// Fetches metadata from Deezer API (bypasses CORS) and returns to JS via callback
  Future<void> handleDeezerMetadataRequest(
    Map<String, dynamic> requestData,
  ) async {
    try {
      final String action = requestData['action'] ?? '';
      final String contentType = requestData['contentType'] ?? '';
      final String contentId = requestData['contentId'] ?? '';
      final String callbackName =
          requestData['callbackName'] ?? 'deezerMetadataCallback';

      print(
        "🎵 Handling Deezer metadata request from JS: $contentType/$contentId (callback: $callbackName)",
      );

      if (action == 'getDeezerMetadata' &&
          contentType.isNotEmpty &&
          contentId.isNotEmpty) {
        // Create a MusicSearchService instance and fetch metadata
        // Import statement already at top: import '../../services/music_search_service.dart';
        final searchService = MusicSearchService();
        final metadata = await searchService.getDeezerMetadata(
          contentType,
          contentId,
        );

        if (metadata != null) {
          print(
            "✅ Deezer metadata fetched: ${metadata['title']} by ${metadata['artist']}",
          );

          // Send response back to JavaScript via callback
          final jsonMetadata = jsonEncode(metadata);
          await delegate.webViewController.runJavaScript('''
            console.log("🎵 [DEEZER FLUTTER] Sending metadata to JS callback ($callbackName)...");
            if (window.$callbackName) {
              console.log("🎵 [DEEZER FLUTTER] ✅ Calling $callbackName...");
              window.$callbackName($jsonMetadata);
              console.log("🎵 [DEEZER FLUTTER] ✅ Callback executed");
            } else {
              console.error("❌ $callbackName not found on window");
            }
          ''');
        } else {
          print("⚠️ Failed to fetch Deezer metadata");

          // Send null to JS to indicate failure
          await delegate.webViewController.runJavaScript('''
            console.log("🎵 [DEEZER FLUTTER] Metadata fetch failed, sending null...");
            if (window.$callbackName) {
              window.$callbackName(null);
            }
          ''');
        }
      } else {
        print(
          "⚠️ Invalid Deezer metadata request: action=$action, contentType=$contentType, contentId=$contentId",
        );
      }
    } catch (e) {
      final String callbackName =
          requestData['callbackName'] ?? 'deezerMetadataCallback';
      print("❌ Error handling Deezer metadata request: $e");

      // Send null to JS to indicate error
      await delegate.webViewController.runJavaScript('''
        console.log("🎵 [DEEZER FLUTTER] Error: $e");
        if (window.$callbackName) {
          window.$callbackName(null);
        }
      ''');
    }
  }

  /// Handle Spotify metadata request from JavaScript
  /// Fetches metadata from Spotify oEmbed API (bypasses CORS) and returns to JS via callback
  Future<void> handleSpotifyMetadataRequest(
    Map<String, dynamic> requestData,
  ) async {
    try {
      final String action = requestData['action'] ?? '';
      final String trackId = requestData['trackId'] ?? '';
      final String callbackName =
          requestData['callbackName'] ?? 'spotifyMetadataCallback';

      print(
        "🎵 Handling Spotify metadata request from JS: $trackId (callback: $callbackName)",
      );

      if (action == 'getSpotifyMetadata' && trackId.isNotEmpty) {
        final searchService = MusicSearchService();
        final metadata = await searchService.getSpotifyMetadata(trackId);

        if (metadata != null) {
          print(
            "✅ Spotify metadata fetched: ${metadata['title']} by ${metadata['artist']}",
          );

          final jsonMetadata = jsonEncode(metadata);
          await delegate.webViewController.runJavaScript('''
            console.log("🎵 [SPOTIFY FLUTTER] Sending metadata to JS callback ($callbackName)...");
            if (window.$callbackName) {
              console.log("🎵 [SPOTIFY FLUTTER] ✅ Calling $callbackName...");
              window.$callbackName($jsonMetadata);
            } else {
              console.error("❌ $callbackName not found on window");
            }
          ''');
        } else {
          print("⚠️ Failed to fetch Spotify metadata");
          await delegate.webViewController.runJavaScript('''
            if (window.$callbackName) {
              window.$callbackName(null);
            }
          ''');
        }
      }
    } catch (e) {
      final String callbackName =
          requestData['callbackName'] ?? 'spotifyMetadataCallback';
      print("❌ Error handling Spotify metadata request: $e");
      await delegate.webViewController.runJavaScript('''
        if (window.$callbackName) {
          window.$callbackName(null);
        }
      ''');
    }
  }

  /// Handle Vimeo metadata request from JavaScript
  /// Fetches metadata from Vimeo oEmbed API (bypasses CORS) and returns to JS via callback
  Future<void> handleVimeoMetadataRequest(
    Map<String, dynamic> requestData,
  ) async {
    try {
      final String action = requestData['action'] ?? '';
      final String url = requestData['url'] ?? '';
      final String callbackName =
          requestData['callbackName'] ?? 'vimeoMetadataCallback';

      print(
        "🎵 Handling Vimeo metadata request from JS: $url (callback: $callbackName)",
      );

      if (action == 'getVimeoMetadata' && url.isNotEmpty) {
        final searchService = MusicSearchService();
        final metadata = await searchService.getVimeoMetadata(url);

        if (metadata != null) {
          print(
            "✅ Vimeo metadata fetched: ${metadata['title']} by ${metadata['author']}",
          );

          final jsonMetadata = jsonEncode(metadata);
          await delegate.webViewController.runJavaScript('''
            console.log("🎵 [VIMEO FLUTTER] Sending metadata to JS callback ($callbackName)...");
            if (window.$callbackName) {
              console.log("🎵 [VIMEO FLUTTER] ✅ Calling $callbackName...");
              window.$callbackName($jsonMetadata);
            } else {
              console.error("❌ $callbackName not found on window");
            }
          ''');
        } else {
          print("⚠️ Failed to fetch Vimeo metadata");
          await delegate.webViewController.runJavaScript('''
            if (window.$callbackName) {
              window.$callbackName(null);
            }
          ''');
        }
      }
    } catch (e) {
      final String callbackName =
          requestData['callbackName'] ?? 'vimeoMetadataCallback';
      print("❌ Error handling Vimeo metadata request: $e");
      await delegate.webViewController.runJavaScript('''
        if (window.$callbackName) {
          window.$callbackName(null);
        }
      ''');
    }
  }

  /// Handle TikTok metadata request from JavaScript
  /// Fetches metadata from TikTok oEmbed API (bypasses CORS) and returns to JS via callback
  Future<void> handleTikTokMetadataRequest(
    Map<String, dynamic> requestData,
  ) async {
    try {
      final String action = requestData['action'] ?? '';
      final String url = requestData['url'] ?? '';
      final String callbackName =
          requestData['callbackName'] ?? 'tiktokMetadataCallback';

      print(
        "🎵 Handling TikTok metadata request from JS: $url (callback: $callbackName)",
      );

      if (action == 'getTikTokMetadata' && url.isNotEmpty) {
        final searchService = MusicSearchService();
        final metadata = await searchService.getTikTokMetadata(url);

        if (metadata != null) {
          print(
            "✅ TikTok metadata fetched: ${metadata['title']} by ${metadata['author']}",
          );

          final jsonMetadata = jsonEncode(metadata);
          await delegate.webViewController.runJavaScript('''
            console.log("🎵 [TIKTOK FLUTTER] Sending metadata to JS callback: $callbackName");
            if (window.$callbackName) {
              console.log("🎵 [TIKTOK FLUTTER] ✅ Calling $callbackName...");
              window.$callbackName($jsonMetadata);
            } else {
              console.error("❌ $callbackName not found on window");
            }
          ''');
        } else {
          print("⚠️ Failed to fetch TikTok metadata");
          await delegate.webViewController.runJavaScript('''
            if (window.$callbackName) {
              window.$callbackName(null);
            }
          ''');
        }
      }
    } catch (e) {
      final String callbackName =
          requestData['callbackName'] ?? 'tiktokMetadataCallback';
      print("❌ Error handling TikTok metadata request: $e");
      await delegate.webViewController.runJavaScript('''
        if (window.$callbackName) {
          window.$callbackName(null);
        }
      ''');
    }
  }

  /// Handle Instagram metadata request from JavaScript
  /// Fetches metadata from Instagram oEmbed API (bypasses CORS) and returns to JS via callback
  Future<void> handleInstagramMetadataRequest(
    Map<String, dynamic> requestData,
  ) async {
    try {
      final String action = requestData['action'] ?? '';
      final String url = requestData['url'] ?? '';

      print("📸 Handling Instagram metadata request from JS: $url");

      if (action == 'getInstagramMetadata' && url.isNotEmpty) {
        final searchService = MusicSearchService();
        final metadata = await searchService.getInstagramMetadata(url);

        if (metadata != null) {
          print(
            "✅ Instagram metadata fetched: ${metadata['title']} by ${metadata['author']}",
          );

          final jsonMetadata = jsonEncode(metadata);
          await delegate.webViewController.runJavaScript('''
            console.log("📸 [INSTAGRAM FLUTTER] Sending metadata to JS callback...");
            if (window.instagramMetadataCallback) {
              console.log("📸 [INSTAGRAM FLUTTER] ✅ Calling instagramMetadataCallback...");
              window.instagramMetadataCallback($jsonMetadata);
            } else {
              console.error("❌ instagramMetadataCallback not found on window");
            }
          ''');
        } else {
          print("⚠️ Failed to fetch Instagram metadata");
          await delegate.webViewController.runJavaScript('''
            if (window.instagramMetadataCallback) {
              window.instagramMetadataCallback(null);
            }
          ''');
        }
      }
    } catch (e) {
      print("❌ Error handling Instagram metadata request: $e");
      await delegate.webViewController.runJavaScript('''
        if (window.instagramMetadataCallback) {
          window.instagramMetadataCallback(null);
        }
      ''');
    }
  }

  /// Handle Dailymotion metadata request from JavaScript
  /// Fetches metadata from Dailymotion oEmbed API (bypasses CORS) and returns to JS via callback
  Future<void> handleDailymotionMetadataRequest(
    Map<String, dynamic> requestData,
  ) async {
    try {
      final String action = requestData['action'] ?? '';
      final String url = requestData['url'] ?? '';
      final String callbackName =
          requestData['callbackName'] ?? 'dailymotionMetadataCallback';

      print(
        "🎬 Handling Dailymotion metadata request from JS: $url (callback: $callbackName)",
      );

      if (action == 'getDailymotionMetadata' && url.isNotEmpty) {
        final searchService = MusicSearchService();
        final metadata = await searchService.getDailymotionMetadata(url);

        if (metadata != null) {
          print(
            "✅ Dailymotion metadata fetched: ${metadata['title']} by ${metadata['author']}",
          );

          final jsonMetadata = jsonEncode(metadata);
          await delegate.webViewController.runJavaScript('''
            console.log("🎬 [DAILYMOTION FLUTTER] Sending metadata to JS callback ($callbackName)...");
            if (window.$callbackName) {
              console.log("🎬 [DAILYMOTION FLUTTER] ✅ Calling $callbackName...");
              window.$callbackName($jsonMetadata);
            } else {
              console.error("❌ $callbackName not found on window");
            }
          ''');
        } else {
          print("⚠️ Failed to fetch Dailymotion metadata");
          await delegate.webViewController.runJavaScript('''
            if (window.$callbackName) {
              window.$callbackName(null);
            }
          ''');
        }
      }
    } catch (e) {
      final String callbackName =
          requestData['callbackName'] ?? 'dailymotionMetadataCallback';
      print("❌ Error handling Dailymotion metadata request: $e");
      await delegate.webViewController.runJavaScript('''
        if (window.$callbackName) {
          window.$callbackName(null);
        }
      ''');
    }
  }

  /// Handle music preferences update from Flutter
  /// Sends updated preferences to JavaScript and triggers furniture content refresh
  Future<void> handleMusicPreferencesUpdate(
    Map<String, dynamic> preferencesData,
  ) async {
    try {
      final selectedGenres =
          preferencesData['selectedGenres'] as List<dynamic>?;
      final cleanMode = preferencesData['cleanMode'] as bool?;

      print("🎵 Music preferences update received:");
      print("  Selected genres: $selectedGenres");
      print("  Clean mode: $cleanMode");

      if (selectedGenres != null) {
        // Convert to JSON string for JavaScript
        final jsonData = jsonEncode({
          'selectedGenres': selectedGenres,
          'cleanMode': cleanMode ?? false,
          'refreshInterval': 300, // Default 5 minutes
        });

        // Send to JavaScript contentPreferencesService
        await delegate.webViewController.runJavaScript('''
          console.log('🎵 [FLUTTER] Sending music preferences to JavaScript...');
          
          if (window.contentPreferences && window.contentPreferences.importFromFlutter) {
            console.log('🎵 [FLUTTER] Calling contentPreferences.importFromFlutter...');
            window.contentPreferences.importFromFlutter('$jsonData');
            
            // Trigger furniture content refresh
            if (window.contentGenerator && window.contentGenerator.refreshAllFurniture) {
              console.log('🎵 [FLUTTER] Triggering furniture content refresh...');
              window.contentGenerator.refreshAllFurniture();
            }
          } else {
            console.warn('⚠️ contentPreferences or contentGenerator not available');
          }
        ''');

        print("✅ Music preferences sent to JavaScript");
      }
    } catch (e) {
      print("❌ Error handling music preferences update: $e");
    }
  }

  /// Handle user activity requests from JavaScript
  /// Tracks link opens and provides favorites/recommendations
  Future<void> _handleUserActivityRequest(Map<String, dynamic> data) async {
    try {
      final action = data['action'] as String?;

      if (action == 'recordLinkActivity') {
        // Record a link being opened
        final url = data['url'] as String?;
        final title = data['title'] as String?;
        final platform = data['platform'] as String?;
        final furnitureId = data['furnitureId'] as String?;

        if (url != null && title != null && platform != null) {
          print("📊 Recording link activity: $title ($platform)");

          await UserActivityService.instance.recordLinkOpen(
            url: url,
            title: title,
            platform: platform,
            furnitureId: furnitureId,
          );

          print("✅ Link activity recorded successfully");
        }
      } else if (action == 'getUserFavorites') {
        // Get user's most played links for bookshelf
        final limit = data['limit'] as int? ?? 15;

        print("📊 Fetching user favorites (limit: $limit)");

        final interactions = await UserActivityService.instance
            .getMostPlayedLinks(limit: limit);

        // Convert to JSON format for JavaScript
        final favorites = interactions
            .map(
              (interaction) => {
                'url': interaction.linkUrl,
                'title': interaction.linkTitle,
                'platform': interaction.platform,
                'playCount': interaction.openCount,
                'thumbnailUrl': null, // Will be fetched by JS if needed
              },
            )
            .toList();

        print("✅ Retrieved ${favorites.length} favorites");

        // Send response back to JavaScript
        await delegate.webViewController.runJavaScript('''
          const event = new CustomEvent('userFavoritesResponse', {
            detail: {
              action: 'userFavoritesResponse',
              favorites: ${jsonEncode(favorites)}
            }
          });
          window.dispatchEvent(event);
          console.log('📊 Sent ${favorites.length} favorites to JavaScript');
        ''');
      } else if (action == 'getRecommendations') {
        // Get personalized recommendations based on user activity
        final count = data['count'] as int? ?? 10;

        print("📊 Generating recommendations (count: $count)");

        // Get top artists and favorite URLs
        final topArtists = await UserActivityService.instance.getTopArtists(
          limit: 5,
        );
        final recentLinks = await UserActivityService.instance
            .getRecentlyPlayedLinks(days: 7);

        final favoriteUrls = recentLinks.take(3).map((i) => i.linkUrl).toList();
        final artistNames = topArtists.keys.toList();

        print(
          "📊 Using ${artistNames.length} artists and ${favoriteUrls.length} URLs for recommendations",
        );

        // Get personalized recommendations
        final linkObjects = await SimilarContentService.instance
            .getPersonalizedRecommendations(
              favoriteUrls: favoriteUrls,
              favoriteArtists: artistNames,
              maxResults: count,
            );

        // Convert to JSON
        final recommendations = linkObjects
            .map(
              (link) => {
                'url': link.url,
                'title': link.title,
                'platform': link.platform,
                'thumbnailUrl': link.thumbnailUrl,
                'basedOn': 'user_activity',
              },
            )
            .toList();

        print("✅ Generated ${recommendations.length} recommendations");

        // Send response back to JavaScript
        await delegate.webViewController.runJavaScript('''
          const event = new CustomEvent('recommendationsResponse', {
            detail: {
              action: 'recommendationsResponse',
              recommendations: ${jsonEncode(recommendations)}
            }
          });
          window.dispatchEvent(event);
          console.log('📊 Sent ${recommendations.length} recommendations to JavaScript');
        ''');
      }
    } catch (e) {
      print("❌ Error handling user activity request: $e");
    }
  }

  /// Cleanup method to dispose of timers
  void dispose() {
    _avatarSaveDebounceTimer?.cancel();
  }
}
