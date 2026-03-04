import 'package:file_picker/file_picker.dart' as fp;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firsttaps_mv3d/models/file_model.dart' as fm; // Added alias fm
import 'package:firsttaps_mv3d/config/app_config.dart';
import 'package:firsttaps_mv3d/services/persistence_service.dart';
import 'package:firsttaps_mv3d/screens/three_js_screen.dart';
import 'package:firsttaps_mv3d/services/device_file_service.dart';
import 'package:firsttaps_mv3d/services/state_manager_service.dart';
import 'package:firsttaps_mv3d/services/object_deletion_state_service.dart';
import 'package:firsttaps_mv3d/services/three_js_interop_service.dart';
import 'package:firsttaps_mv3d/services/file_metadata_service.dart';
import 'package:firsttaps_mv3d/services/app_service.dart';
import '../services/app_position_service.dart';
import '../services/app_menu_service.dart';
import 'package:firsttaps_mv3d/widgets/app_picker_dialog.dart';
import 'package:firsttaps_mv3d/widgets/premium_gaming_popup.dart';
import 'package:firsttaps_mv3d/services/device_contact_service.dart';
import 'package:firsttaps_mv3d/services/premium_service.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:provider/provider.dart';
import 'package:firsttaps_mv3d/utils/metadata_test_helper.dart';
import 'package:firsttaps_mv3d/utils/metadata_repair_helper.dart';
import 'package:firsttaps_mv3d/helpers/demo_content_helper.dart';
import 'package:firsttaps_mv3d/helpers/demo_content_with_recommendations_helper.dart';
import 'package:firsttaps_mv3d/models/music_search_result.dart';
import 'package:firsttaps_mv3d/screens/music_search_screen.dart';
import 'dart:developer' as developer;
import 'dart:async';

class HomePageController with ChangeNotifier {
  final PersistenceService _persistenceService;
  final DeviceFileService _deviceFileService;
  final AppService _appService;
  final StateManagerService _stateManager;
  final ObjectDeletionStateService _deletionStateService =
      ObjectDeletionStateService();
  final FileMetadataService _fileMetadataService = FileMetadataService();
  late final AppPositionService _appPositionService;
  late final AppMenuService _appMenuService;

  ThreeJsInteropService?
  _threeJsInteropService; // Add this for undo functionality

  // Store URL to be processed when navigating to 3D world
  String? _pendingLinkUrl;

  // Keep track of current context for showing snackbars
  BuildContext? _currentContext;

  HomePageController({
    required PersistenceService persistenceService,
    required DeviceFileService deviceFileService,
    required AppService appService,
  }) : _persistenceService = persistenceService,
       _deviceFileService = deviceFileService,
       _appService = appService,
       _stateManager = StateManagerService() {
    print('🎵 [CONSTRUCTOR START] HomePageController constructor called');

    _appPositionService = AppPositionService(appService: _appService);
    _appMenuService = AppMenuService(_appService);

    // Pause app preloading during initialization to avoid conflicts with 3D world loading
    _appMenuService.pausePreloading();

    // Register demo content immediately (runs synchronously in constructor)
    // Demo files MUST exist before JavaScript queries them
    // CRITICAL: Only register on FIRST app launch using persistent flag
    print('🎵 [CONSTRUCTOR] About to check demo content registration...');
    print(
      '🎵 [CONSTRUCTOR] Current files before loading: ${_stateManager.files.length}',
    );

    // Load persisted files FIRST
    print('🎵 [CONSTRUCTOR] Loading persisted files...');
    _loadPersistedFiles();

    print(
      '🎵 [CONSTRUCTOR] Files after persistence load: ${_stateManager.files.length}',
    );

    // ✅ DEMO FILES: First-install-only experience with recommendations
    // Load demo content with trending recommendations from YouTube, Spotify, etc.
    // Falls back to local demo files if network/APIs unavailable
    // Demo files are NOT persisted (by design) - they refresh on each app launch
    // User-added MP3/MP4 files WILL persist normally across app loads.
    _registerDemoContent();

    // Note: App preloading now happens in SplashScreen instead of here
    // This eliminates the 3D world initialization freezing
  }

  /// Register demo content with recommendations from YouTube, Spotify, etc.
  /// This runs async and loads trending content to populate demo furniture
  /// Falls back to local demo files if network/APIs unavailable
  Future<void> _registerDemoContent() async {
    print('🎵 [RECOMMENDATIONS] _registerDemoContent() method called');
    try {
      developer.log(
        '🎵 Loading demo content with recommendations...',
        name: 'HomePageController',
      );
      print(
        '🎵 [RECOMMENDATIONS] Current file count: ${_stateManager.files.length}',
      );

      // Register demo content with recommendations (YouTube, Spotify, Deezer, Vimeo)
      await DemoContentWithRecommendationsHelper.registerRecommendedDemoContent(
        _stateManager,
        useRecommendations: true,
        skipIfRegistered: true,
      );

      print(
        '🎵 [RECOMMENDATIONS] After registration, file count: ${_stateManager.files.length}',
      );

      // Notify state manager of changes
      notifyListeners();

      developer.log(
        '🎵 Demo content with recommendations loaded successfully',
        name: 'HomePageController',
      );
      print('🎵 [RECOMMENDATIONS] Demo content registration complete');
    } catch (e) {
      print('❌ [RECOMMENDATIONS] Exception caught in _registerDemoContent: $e');
      developer.log(
        '❌ Error loading demo content with recommendations: $e',
        name: 'HomePageController',
      );
    }
  }

  // Delegate getters to state manager
  List<fm.FileModel> get files => _stateManager.files;
  bool get isLoading => _stateManager.isLoading;
  StateManagerService get stateManager => _stateManager;

  // Deletion state getters
  ObjectDeletionStateService get deletionStateService => _deletionStateService;
  bool get hasDeletedObjects => _deletionStateService.hasDeletedObjects;
  fm.FileModel? get mostRecentlyDeletedObject =>
      _deletionStateService.getMostRecentlyDeletedObject();

  // Set the ThreeJs service (to be called from ThreeJsScreen)
  void setThreeJsInteropService(ThreeJsInteropService service) {
    print('🔗 HomePageController: Three.js interop service set');
    _threeJsInteropService = service;
    print(
      '🔗 HomePageController: Service is now ${_threeJsInteropService == null ? "NULL" : "NOT NULL"}',
    );
    print('🔗 HomePageController: Checking for pending link...');
    // Process any pending link URL
    _processPendingLinkIfNeeded();

    // Initialize contact system when WebView is ready
    _initializeContactSystem();
  }

  // Initialize contact system
  Future<void> _initializeContactSystem() async {
    if (_threeJsInteropService == null) return;

    try {
      print('📱 Initializing contact system...');

      // Wait a bit for the WebView to be fully loaded
      await Future.delayed(const Duration(milliseconds: 2000));

      // Initialize the contact system
      final initialized = await _threeJsInteropService!
          .initializeContactSystem();
      if (!initialized) {
        print('❌ Contact system initialization failed');
        return;
      }

      // Wait a bit more for initialization to complete
      await Future.delayed(const Duration(milliseconds: 1000));

      // Skip automatic test contact creation - contacts will be managed by user
      print('✅ Contact system initialized - ready for user contacts');

      // DON'T pre-load apps immediately - wait for 3D world to load first
      // Apps will be pre-loaded when user navigates to 3D world and it has time to load
      print('🔄 App preloading will start after 3D world loads...');
    } catch (e) {
      print('❌ Error initializing contact system: $e');
    }
  }

  /// Smart app preloading that waits for 3D world to load first
  Future<void> _startSmartAppPreloading() async {
    try {
      print('🧠 Starting smart app preloading with delay for 3D world...');
      // Resume preloading after 6 seconds to give 3D world time to load
      // The preloading will then be spread over 60 seconds to avoid freezing
      await _appMenuService.resumePreloadingAfterDelay(6);
      print('✅ Smart app preloading completed successfully');
    } catch (e) {
      print('⚠️ Smart app pre-loading failed: $e');
      // Not a critical error - apps will still load when menu is opened
    }
  }

  // Set current context for snackbars
  void setCurrentContext(BuildContext context) {
    _currentContext = context;
  }

  Future<void> _loadPersistedFiles() async {
    _stateManager.setLoading(true);

    developer.log('Loading persisted files...', name: 'HomePageController');
    final persistedFiles = await _persistenceService.loadPersistedFiles();

    developer.log(
      'Loaded ${persistedFiles.length} persisted files',
      name: 'HomePageController',
    );

    // DEBUG: Check for link objects in persisted files
    print('🔗 DEBUG: Checking persisted files for link objects...');
    final linkObjects = persistedFiles
        .where(
          (file) =>
              file.type == fm.FileType.app &&
              file.mimeType != null &&
              file.mimeType!.startsWith('link:'),
        )
        .toList();
    print('🔗 DEBUG: Found ${linkObjects.length} link objects in persistence:');
    for (var linkObj in linkObjects) {
      print('  - ${linkObj.name} (${linkObj.mimeType})');
    }

    // Check if any files need metadata repair
    final repairStats = MetadataRepairHelper.getRepairStats(persistedFiles);
    developer.log(
      'Metadata repair stats: ${repairStats['needsRepair']}/${repairStats['total']} files need repair',
      name: 'HomePageController',
    );

    if (repairStats['needsRepair']! > 0) {
      developer.log(
        'Starting metadata repair for ${repairStats['needsRepair']} files...',
        name: 'HomePageController',
      );

      // Check if metadata service is available
      final isServiceReady =
          await MetadataRepairHelper.isMetadataServiceReady();

      if (isServiceReady) {
        // Repair metadata for files that need it
        final filesToRepair = persistedFiles
            .where(MetadataRepairHelper.needsMetadataRepair)
            .toList();

        final repairedFiles = await MetadataRepairHelper.repairBatchMetadata(
          filesToRepair,
          batchSize: 3, // Small batch size to avoid overwhelming the system
        );

        // Replace the original files with repaired ones
        final Map<String, fm.FileModel> repairedMap = {
          for (var file in repairedFiles) file.path: file,
        };

        final finalFiles = persistedFiles.map((file) {
          return repairedMap[file.path] ?? file;
        }).toList();

        // Save the repaired files back to persistence
        await _persistenceService.savePersistedFiles(finalFiles);

        developer.log(
          'Metadata repair complete. Updated files saved to persistence.',
          name: 'HomePageController',
        );

        // Update state with repaired files (demo content handled by JavaScript)
        _stateManager.updateFiles(finalFiles);

        // DEBUG: Check StateManager files after update
        print(
          '🔗 DEBUG: StateManager files after final update: ${_stateManager.files.length}',
        );
        final stateManagerLinkObjects = _stateManager.files
            .where(
              (file) =>
                  file.type == fm.FileType.app &&
                  file.mimeType != null &&
                  file.mimeType!.startsWith('link:'),
            )
            .toList();
        print(
          '🔗 DEBUG: Link objects in StateManager: ${stateManagerLinkObjects.length}',
        );
        for (var linkObj in stateManagerLinkObjects) {
          print('  - ${linkObj.name} (${linkObj.mimeType})');
        }
      } else {
        developer.log(
          'Metadata service not available, skipping repair',
          name: 'HomePageController',
        );

        // Update state with persisted files (demo content handled by JavaScript)
        _stateManager.updateFiles(persistedFiles);

        // DEBUG: Check StateManager files after update (no repair case)
        print(
          '🔗 DEBUG: StateManager files after no-repair update: ${_stateManager.files.length}',
        );
        final stateManagerLinkObjects = _stateManager.files
            .where(
              (file) =>
                  file.type == fm.FileType.app &&
                  file.mimeType != null &&
                  file.mimeType!.startsWith('link:'),
            )
            .toList();
        print(
          '🔗 DEBUG: Link objects in StateManager (no repair): ${stateManagerLinkObjects.length}',
        );
        for (var linkObj in stateManagerLinkObjects) {
          print('  - ${linkObj.name} (${linkObj.mimeType})');
        }
      }
    } else {
      developer.log(
        'All files have metadata, no repair needed',
        name: 'HomePageController',
      );
      _stateManager.updateFiles(persistedFiles);

      // DEBUG: Check StateManager files after update (all have metadata case)
      print(
        '🔗 DEBUG: StateManager files after all-metadata update: ${_stateManager.files.length}',
      );
      final stateManagerLinkObjects = _stateManager.files
          .where(
            (file) =>
                file.type == fm.FileType.app &&
                file.mimeType != null &&
                file.mimeType!.startsWith('link:'),
          )
          .toList();
      print(
        '🔗 DEBUG: Link objects in StateManager (all metadata): ${stateManagerLinkObjects.length}',
      );
      for (var linkObj in stateManagerLinkObjects) {
        print('  - ${linkObj.name} (${linkObj.mimeType})');
      }
    }

    _stateManager.setLoading(false);
  }

  // Combined method for picking files and then navigating
  Future<void> addFilesAndNavigate(BuildContext context) async {
    print('DEBUG: addFilesAndNavigate method called!');
    developer.log(
      'DEBUG: addFilesAndNavigate method started',
      name: 'HomePageController',
    );

    fp.FilePickerResult? result = await fp.FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: fp.FileType.custom, // Use aliased FileType from file_picker
      allowedExtensions: [
        'pdf',
        'doc',
        'docx',
        'ppt',
        'pptx',
        'mp3',
        'mp4',
        'jpeg',
        'jpg',
        'png',
        'gif',
      ],
    );
    if (result != null) {
      List<fm.FileModel> selectedFiles =
          []; // Test metadata service on first file pick
      await MetadataTestHelper.testMetadataService();

      // SIMPLE METHOD CHANNEL TEST
      print('DEBUG: Testing method channel directly...');
      try {
        final testResult = await MethodChannel(
          'file_metadata',
        ).invokeMethod('isServiceAvailable');
        print('DEBUG: Direct method channel test result: $testResult');
      } catch (e) {
        print('DEBUG: Direct method channel test error: $e');
      }
      for (var file in result.files) {
        print('DEBUG: Processing file: ${file.name}');
        final String name = file.name;
        final String extension = file.extension?.toLowerCase() ?? '';
        final String filePath = file.path ?? '';
        print('DEBUG: File path: $filePath');
        fm.FileType type;
        String? thumbnailDataUrl;

        // Extract detailed metadata using platform channel
        Map<String, dynamic>? metadata;
        if (filePath.isNotEmpty) {
          print('DEBUG: About to extract metadata for: $filePath');
          developer.log(
            'Extracting metadata for: $filePath',
            name: 'HomePageController',
          );

          // Test if platform channel is available
          try {
            final isAvailable = await _fileMetadataService
                .isMetadataServiceAvailable();
            developer.log(
              'Metadata service available: $isAvailable',
              name: 'HomePageController',
            );
          } catch (e) {
            developer.log(
              'Error checking service availability: $e',
              name: 'HomePageController',
            );
          }
          metadata = await _fileMetadataService.getFileMetadata(filePath);
          print('DEBUG: Metadata service returned: $metadata');

          if (metadata != null) {
            print('DEBUG: Metadata successfully extracted');
            developer.log(
              'Successfully extracted metadata: $metadata',
              name: 'HomePageController',
            );
            MetadataTestHelper.logMetadataDetails(metadata, name);
          } else {
            print('DEBUG: No metadata was returned');
            developer.log(
              'No metadata available for: $filePath',
              name: 'HomePageController',
            );
          }
        } else {
          print('DEBUG: File path is empty, skipping metadata extraction');
        }

        // Determine FileType and generate thumbnail if applicable
        switch (extension) {
          case 'pdf':
            type = fm.FileType.pdf;
            break;
          case 'doc':
          case 'docx':
            type = fm.FileType.word;
            break;
          case 'ppt':
          case 'pptx':
            type = fm.FileType.ppt;
            break;
          case 'mp3':
            type = fm.FileType.mp3;
            break;
          case 'mp4':
          case 'mov': // Added mov for video thumbnails
          case 'avi': // Added avi for video thumbnails
          case 'mkv': // Added mkv for video thumbnails
            type = fm.FileType.video;
            if (filePath.isNotEmpty) {
              thumbnailDataUrl = await _deviceFileService.getThumbnailDataUrl(
                filePath,
                '.$extension',
              );
            }
            break;
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif':
          case 'bmp':
          case 'webp':
            type = fm.FileType.image;
            if (filePath.isNotEmpty) {
              thumbnailDataUrl = await _deviceFileService.getThumbnailDataUrl(
                filePath,
                '.$extension',
              );
            }
            break;
          default:
            type = fm.FileType.other;
        } // Create FileModel with extracted metadata
        final newFile = fm.FileModel(
          name: name,
          path: filePath, // Ensure path is not null
          extension: extension,
          type: type,
          thumbnailDataUrl: thumbnailDataUrl, // Add thumbnail data
          height:
              1.0, // Set a default height for all objects          // Add metadata fields from platform channel
          fileSize: metadata?['fileSize'] as int?,
          lastModified: metadata?['lastModified'] as int?,
          created: metadata?['created'] as int?,
          mimeType: metadata?['mimeType'] as String?,
          isReadable: metadata?['isReadable'] as bool?,
          isWritable: metadata?['isWritable'] as bool?,
          // Add EXIF metadata fields for image files
          cameraMake: metadata?['cameraMake'] as String?,
          cameraModel: metadata?['cameraModel'] as String?,
          dateTimeOriginal: metadata?['dateTimeOriginal'] as String?,
          imageWidth: metadata?['imageWidth'] as int?,
          imageHeight: metadata?['imageHeight'] as int?,
          aperture: metadata?['aperture'] as String?,
          shutterSpeed: metadata?['shutterSpeed'] as String?,
          iso: metadata?['iso'] as String?,
          focalLength: metadata?['focalLength'] as String?,
          flash: metadata?['flash'] as String?,
          whiteBalance: metadata?['whiteBalance'] as String?,
          orientation: metadata?['orientation'] as int?,
          gpsLatitude: metadata?['gpsLatitude'] as double?,
          gpsLongitude: metadata?['gpsLongitude'] as double?,
          gpsAltitude: metadata?['gpsAltitude'] as double?,
          lensModel: metadata?['lensModel'] as String?,
          exposureTime: metadata?['exposureTime'] as String?,
          fNumber: metadata?['fNumber'] as String?,
          photographicSensitivity:
              metadata?['photographicSensitivity'] as String?,
          digitalZoomRatio: metadata?['digitalZoomRatio'] as String?,
          sceneCaptureType: metadata?['sceneCaptureType'] as String?,
          subjectDistance: metadata?['subjectDistance'] as String?,
        ); // Debug the created file model
        print('DEBUG: Created FileModel for ${newFile.name}');
        print('DEBUG: - fileSize: ${newFile.fileSize}');
        print('DEBUG: - lastModified: ${newFile.lastModified}');
        print('DEBUG: - created: ${newFile.created}');
        print('DEBUG: - mimeType: ${newFile.mimeType}');
        // Debug EXIF fields for image files
        if (newFile.cameraMake != null || newFile.cameraModel != null) {
          print('DEBUG: - EXIF Data Found:');
          print('DEBUG:   - cameraMake: ${newFile.cameraMake}');
          print('DEBUG:   - cameraModel: ${newFile.cameraModel}');
          print('DEBUG:   - dateTimeOriginal: ${newFile.dateTimeOriginal}');
          print('DEBUG:   - imageWidth: ${newFile.imageWidth}');
          print('DEBUG:   - imageHeight: ${newFile.imageHeight}');
          print('DEBUG:   - aperture: ${newFile.aperture}');
          print('DEBUG:   - iso: ${newFile.iso}');
        }

        selectedFiles.add(newFile);
      }
      if (selectedFiles.isNotEmpty) {
        // Add each file using the state manager
        for (var newFile in selectedFiles) {
          _stateManager.addFile(newFile);
        }

        // Save to persistence
        await _persistenceService.savePersistedFiles(_stateManager.files);

        // Check if already in 3D world
        if (_threeJsInteropService != null) {
          // Already in 3D world - send ONLY NEW files to JavaScript
          // This prevents clearFileObjects() from wiping existing objects
          print(
            '📁 Adding ${selectedFiles.length} new file(s) to existing 3D world',
          );
          await _threeJsInteropService!.addNewFilesToWorld(selectedFiles);

          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('${selectedFiles.length} file(s) added to world'),
                backgroundColor: Colors.green,
                duration: const Duration(seconds: 2),
              ),
            );
          }
        } else if (context.mounted) {
          // Not in 3D world yet - navigate as before
          print(
            '📁 Navigating to 3D world with ${selectedFiles.length} file(s)',
          );
          navigateToThreeJsScreen(context);
        }
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No supported files selected.')),
          );
        }
      }
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('File picking cancelled.')),
        );
      }
    }
  }

  // This method is kept if direct navigation without picking is needed by "Go to World"
  void navigateToThreeJsScreen(BuildContext context) {
    // Add debugging to check metadata in files
    print(
      'DEBUG: Navigating to ThreeJsScreen with ${_stateManager.files.length} files',
    );

    // DEBUG: Check for link objects being sent to 3D screen
    final linkObjectsToSend = _stateManager.files
        .where(
          (file) =>
              file.type == fm.FileType.app &&
              file.mimeType != null &&
              file.mimeType!.startsWith('link:'),
        )
        .toList();
    print(
      '🔗 DEBUG: Sending ${linkObjectsToSend.length} link objects to ThreeJsScreen:',
    );
    for (var linkObj in linkObjectsToSend) {
      print('  - ${linkObj.name} (${linkObj.mimeType})');
    }

    for (var file in _stateManager.files) {
      print(
        'DEBUG: File ${file.name} - fileSize: ${file.fileSize}, lastModified: ${file.lastModified}, created: ${file.created}',
      );
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ThreeJsScreen(
          filesToDisplay: _stateManager.files,
          onFileDeleted: handleFileDeleted,
          onFileMoved: handleFileMoved, // Pass the new callback
          onLinkObjectAdded:
              handleLinkObjectAdded, // Pass the link object callback
          onSetInteropService:
              setThreeJsInteropService, // Pass the interop service callback
          onUndoObjectDelete: undoDeleteObject, // Pass the undo callback
          onDeleteAllObjects:
              handleDeleteAllObjects, // Pass the delete all callback
          onLinkNameChanged:
              handleLinkNameChanged, // Pass the link name change callback
          onPremiumGamingPopupRequested:
              handlePremiumGamingPopupRequest, // Pass the premium gaming popup callback
          onGetCurrentFileState:
              getCurrentFileStateFromStateManager, // Pass the current file state callback
          onFileAdded:
              handleFileAdded, // Pass the file addition callback for path tracking
          shouldResetCamera:
              true, // Add this parameter to ensure proper camera positioning
        ),
      ),
    ).then(
      (_) => _loadPersistedFiles(),
    ); // Refresh files when returning from ThreeJsScreen

    // Start smart app preloading with delay to let 3D world load first
    _startSmartAppPreloading();
  }

  // Method to handle file deletion, to be passed to ThreeJsScreen

  Future<void> handleFileDeleted(String fileId) async {
    try {
      // PHASE 1: Check if this is a contact deletion first
      if (fileId.contains('-') &&
          !fileId.startsWith('/') &&
          !fileId.startsWith('app_')) {
        // This looks like a contact ID, handle it specially
        developer.log(
          'Contact deletion detected via ID pattern: $fileId',
          name: 'HomePageController',
        );

        // Find the contact file by matching the contact ID
        final contactFiles = _stateManager.files
            .where((file) => _isContactFile(file))
            .toList();

        fm.FileModel? contactFileToDelete;
        for (final file in contactFiles) {
          final contactId = _extractContactId(file);
          if (contactId == fileId) {
            contactFileToDelete = file;
            break;
          }
        }

        if (contactFileToDelete != null) {
          developer.log(
            'Found contact file for deletion: ${contactFileToDelete.name}',
            name: 'HomePageController',
          );

          // Store for undo functionality
          _deletionStateService.addDeletedObject(contactFileToDelete);

          // Remove from state manager
          _stateManager.removeFile(contactFileToDelete.path);
          await _persistenceService.savePersistedFiles(_stateManager.files);

          developer.log(
            'Contact file deleted successfully: ${contactFileToDelete.name}',
            name: 'HomePageController',
          );

          // Show undo snackbar if context is available
          if (_currentContext != null) {
            _showUndoDeleteSnackbar(contactFileToDelete);
          }
          return;
        } else {
          developer.log(
            'No contact file found for contact ID: $fileId',
            name: 'HomePageController',
          );
          return;
        }
      }

      // Regular file deletion logic
      // Find the file to delete and store for undo
      final fileToDelete = _stateManager.files.firstWhere(
        (file) => file.path == fileId,
        orElse: () => throw Exception('File not found: $fileId'),
      );

      // Store for undo functionality
      _deletionStateService.addDeletedObject(fileToDelete);

      // If it's an app, remove it from favorites
      if (_isAppFile(fileToDelete)) {
        final packageName = _extractPackageName(fileToDelete);
        if (packageName != null) {
          developer.log(
            'Removing app $packageName from favorites on deletion',
            name: 'HomePageController',
          );
          await _removeAppFromFavorites(packageName);
        }
      }

      // PHASE 1: If it's a contact, sync with menu state (mirrors app system)
      if (_isContactFile(fileToDelete)) {
        final contactId = _extractContactId(fileToDelete);
        if (contactId != null) {
          final contactName = fileToDelete.name.replaceAll('.contact', '');
          developer.log(
            'Contact deleted from 3D world, syncing menu state: $contactName ($contactId)',
            name: 'HomePageController',
          );
          // Note: Contact is already being removed from state manager below
          // The 3D world ContactManager will handle its own cleanup via handleContactDeletion
        }
      }

      // Remove from main list
      _stateManager.removeFile(fileId);
      await _persistenceService.savePersistedFiles(_stateManager.files);

      print(
        "HomePageController: File $fileId removed. Files count: ${_stateManager.files.length}",
      );

      // Show undo snackbar if context is available
      if (_currentContext != null) {
        _showUndoDeleteSnackbar(fileToDelete);
      }

      notifyListeners();
    } catch (e) {
      print('HomePageController: Error deleting file: $e');
    }
  }

  // Undo single object deletion
  Future<void> undoDeleteObject(
    fm.FileModel fileModel, {
    bool suppressSnackbar = false,
  }) async {
    try {
      print('HomePageController: =========== UNDO DELETE CALLED ===========');
      print('HomePageController: Undoing deletion of ${fileModel.name}');
      print('HomePageController: File model path: ${fileModel.path}');
      print('HomePageController: File model extension: ${fileModel.extension}');
      print('HomePageController: Suppress snackbar: $suppressSnackbar');

      // Add back to main list first
      _stateManager.addFile(fileModel);
      print('HomePageController: File added back to state manager');

      // Restore in 3D scene if service is available (immediate visual restoration)
      bool restoredIn3D = false;
      if (_threeJsInteropService != null) {
        print(
          'HomePageController: About to call ThreeJsInteropService.restoreObjectById...',
        );
        restoredIn3D = await _threeJsInteropService!.restoreObjectById(
          fileModel,
        );
        if (restoredIn3D) {
          print(
            'HomePageController: 3D restoration successful with flash animation',
          );
        } else {
          print('HomePageController: Warning - 3D restoration may have failed');
        }
      } else {
        print('HomePageController: ThreeJsInteropService is null!');
      }

      // If it's an app, add it back to favorites
      if (_isAppFile(fileModel)) {
        final packageName = _extractPackageName(fileModel);
        if (packageName != null) {
          developer.log(
            'Adding app $packageName back to favorites on undo',
            name: 'HomePageController',
          );
          await _addAppToFavorites(fileModel, packageName);
        }
      }

      // Remove from deleted list
      _deletionStateService.removeFromDeletedObjects(fileModel.path);

      // Save changes
      await _persistenceService.savePersistedFiles(_stateManager.files);

      print('HomePageController: Successfully restored ${fileModel.name}');

      // Show success message only if not suppressed
      if (_currentContext != null && !suppressSnackbar) {
        final message = restoredIn3D
            ? '${fileModel.name} restored in 3D scene'
            : '${fileModel.name} restored. Navigate to 3D view to see it.';

        ScaffoldMessenger.of(_currentContext!).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }

      notifyListeners();
    } catch (e) {
      print('HomePageController: Error undoing delete: $e');

      // Show error message if context is available and not suppressed
      if (_currentContext != null && !suppressSnackbar) {
        ScaffoldMessenger.of(_currentContext!).showSnackBar(
          SnackBar(
            content: Text('Failed to restore ${fileModel.name}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Undo deletion with 3D scene restoration
  Future<void> undoDeleteObjectWithRestore(
    fm.FileModel fileModel,
    ThreeJsInteropService? interopService,
  ) async {
    try {
      print(
        'HomePageController: Undoing deletion with 3D restore for ${fileModel.name}',
      );

      // Add back to main list first
      _stateManager.addFile(fileModel);

      // Restore in 3D scene if service is available
      if (interopService != null) {
        final restored = await interopService.restoreObjectById(fileModel);
        if (!restored) {
          print(
            'HomePageController: Warning - 3D restoration may have failed for ${fileModel.name}',
          );
        }
      }

      // Remove from deleted list
      _deletionStateService.removeFromDeletedObjects(fileModel.path);

      // Save changes
      await _persistenceService.savePersistedFiles(_stateManager.files);

      print(
        'HomePageController: Successfully restored ${fileModel.name} with 3D scene',
      );
      notifyListeners();
    } catch (e) {
      print('HomePageController: Error undoing delete with restore: $e');

      // Show error message if context is available
      if (_currentContext != null) {
        ScaffoldMessenger.of(_currentContext!).showSnackBar(
          SnackBar(
            content: Text('Failed to restore ${fileModel.name}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Show undo snackbar
  void _showUndoDeleteSnackbar(fm.FileModel deletedFile) {
    if (_currentContext == null) return;

    // Skip undo snackbar for contact objects
    if (_isContactFile(deletedFile)) {
      print('Skipping undo snackbar for contact: ${deletedFile.name}');
      return;
    }

    final scaffoldMessenger = ScaffoldMessenger.of(_currentContext!);

    print(
      'HomePageController: Showing undo delete snackbar for ${deletedFile.name}',
    );

    scaffoldMessenger.showSnackBar(
      SnackBar(
        content: Text('${deletedFile.name} deleted'),
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'UNDO',
          onPressed: () {
            print(
              'HomePageController: Undo button pressed for deleted object ${deletedFile.name}',
            );
            undoDeleteObject(deletedFile);
          },
        ),
      ),
    );
  }

  // Method to handle deletion of all objects from both 3D scene and persistent storage
  Future<void> handleDeleteAllObjects() async {
    try {
      // Store all files for undo functionality
      _deletionStateService.markAll3DObjectsDeleted(_stateManager.files);

      // Clear all files from state manager and persistent storage
      _stateManager.clearAllFiles();
      await _persistenceService.savePersistedFiles(_stateManager.files);

      // CRITICAL: Use clearFileObjectsIncludingContactsJS to remove ALL objects including contacts
      // This bypasses the normal contact preservation behavior of clearFileObjectsJS
      try {
        await _threeJsInteropService?.executeJavaScript(
          'if (window.clearFileObjectsIncludingContactsJS) { window.clearFileObjectsIncludingContactsJS(); } else { console.error("clearFileObjectsIncludingContactsJS not available"); }',
        );
        print(
          "HomePageController: Called clearFileObjectsIncludingContactsJS to remove all objects including contacts",
        );
      } catch (e) {
        print(
          "HomePageController: Error calling clearFileObjectsIncludingContactsJS: $e",
        );
        // Fallback to regular clear + empty list
        try {
          await _threeJsInteropService?.sendFilesToWebView([]);
          print(
            "HomePageController: Fallback - sent empty file list to clear 3D world",
          );
        } catch (fallbackError) {
          print("HomePageController: Fallback also failed: $fallbackError");
        }
      }

      print(
        "HomePageController: All objects deleted from persistent storage. Files count: ${_stateManager.files.length}",
      );

      // Show undo snackbar if context is available
      if (_currentContext != null) {
        _showUndoDeleteAllSnackbar();
      }

      notifyListeners();
    } catch (e) {
      print('HomePageController: Error deleting all objects: $e');
    }
  }

  // Show undo snackbar for delete all
  void _showUndoDeleteAllSnackbar() {
    if (_currentContext == null) return;

    final scaffoldMessenger = ScaffoldMessenger.of(_currentContext!);

    scaffoldMessenger.showSnackBar(
      SnackBar(
        content: Text('All objects deleted'),
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'UNDO',
          onPressed: () => undoDeleteAllObjects(),
        ),
      ),
    );
  }

  // Undo delete all objects
  Future<void> undoDeleteAllObjects() async {
    try {
      if (!_deletionStateService.canUndoObjectDeletion) {
        print(
          "HomePageController: No recent deletion to undo or timeout exceeded",
        );
        return;
      }

      // Get the backed up files from the deletion service
      final backedUpFiles = _deletionStateService.restoreAll3DObjects();

      if (backedUpFiles == null || backedUpFiles.isEmpty) {
        print("HomePageController: No backed up files to restore");
        return;
      }

      // Filter out contact files - do not restore contact objects
      final nonContactFiles = backedUpFiles
          .where((file) => !_isContactFile(file))
          .toList();

      print(
        'HomePageController: Restoring ${nonContactFiles.length} non-contact objects (excluded ${backedUpFiles.length - nonContactFiles.length} contact objects)',
      );

      // Restore only non-contact files to state manager
      for (var file in nonContactFiles) {
        _stateManager.addFile(file);
      }

      // Save to persistent storage
      await _persistenceService.savePersistedFiles(_stateManager.files);

      // CRITICAL: Send ALL files from state manager to the 3D world to ensure complete synchronization
      try {
        await _threeJsInteropService?.sendFilesToWebView(_stateManager.files);
        print(
          "HomePageController: Sent all ${_stateManager.files.length} files (including ${nonContactFiles.length} restored objects) to 3D world for complete synchronization",
        );
      } catch (e) {
        print("HomePageController: Error sending files to 3D world: $e");
      }

      print(
        'HomePageController: Successfully restored ${nonContactFiles.length} objects. Total files in state: ${_stateManager.files.length}',
      );

      // Show success message
      if (_currentContext != null) {
        ScaffoldMessenger.of(_currentContext!).showSnackBar(
          SnackBar(
            content: Text(
              '${nonContactFiles.length} objects restored. Navigate to 3D view to see them.',
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );
      }

      notifyListeners();
    } catch (e) {
      print('HomePageController: Error undoing delete all: $e');

      // Show error message if context is available
      if (_currentContext != null) {
        ScaffoldMessenger.of(_currentContext!).showSnackBar(
          SnackBar(
            content: Text('Failed to restore objects'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Get current file state from state manager with latest position
  /// This is used by the undo delete functionality to capture accurate positions
  fm.FileModel? getCurrentFileStateFromStateManager(String objectId) {
    try {
      // Find the file in the state manager's current files
      final fileIndex = _stateManager.files.indexWhere(
        (f) => f.path == objectId,
      );

      if (fileIndex != -1) {
        final file = _stateManager.files[fileIndex];
        print(
          "DEBUG: Found current file state for '$objectId' at position (${file.x}, ${file.y}, ${file.z})",
        );
        return file;
      } else {
        print(
          "DEBUG: File '$objectId' not found in state manager current files",
        );
        return null;
      }
    } catch (e) {
      print("Error getting current file state for '$objectId': $e");
      return null;
    }
  }

  Future<void> handleFileMoved(
    String fileId,
    double x,
    double y,
    double z, {
    double? rotation, // ROTATION FIX: Add rotation parameter
    String? furnitureId,
    int? furnitureSlotIndex,
    bool updateFurniture = false,
  }) async {
    print(
      "DEBUG: handleFileMoved called with fileId: '$fileId' at position ($x, $y, $z), rotation: ${rotation != null ? '${(rotation * 180 / 3.14159).toStringAsFixed(1)}°' : 'null'}, furniture: $furnitureId slot: $furnitureSlotIndex, updateFurniture: $updateFurniture",
    );

    // CRITICAL: Skip path objects - they are managed entirely by JavaScript PathManager
    // Paths use IDs like "path_1765336039280_dvvqv9" and should NOT be persisted in Flutter state
    if (fileId.startsWith('path_')) {
      print(
        "🛤️ Ignoring path move notification - paths managed by JavaScript PathManager",
      );
      return;
    }

    // Check if this is a contact object (JavaScript sends with contact:// prefix)
    final isContactObject = fileId.startsWith('contact://');
    final isAppObject = fileId.startsWith('app_');

    print("DEBUG: Is contact object: $isContactObject");
    print("DEBUG: Is app object: $isAppObject");

    // For contact objects, we need to find the contact by the display name in the prefix
    int fileIndex = -1;
    String actualFileId = fileId;

    if (isContactObject) {
      // Extract the display name from the contact:// prefix
      final contactDisplayName = fileId.replaceFirst('contact://', '');
      print(
        "DEBUG: Contact object detected. Display name: '$contactDisplayName'",
      );

      // Convert JavaScript display name format to actual contact name
      // JavaScript: "andre-at-planet" -> Contact: "Andre At Planet"
      final normalizedDisplayName = contactDisplayName
          .split('-')
          .map(
            (word) => word[0].toUpperCase() + word.substring(1).toLowerCase(),
          )
          .join(' ');

      print("DEBUG: Normalized display name: '$normalizedDisplayName'");

      // Find the contact file by matching the normalized display name
      fileIndex = _stateManager.files.indexWhere(
        (file) =>
            file.path.startsWith('contact://') &&
            (file.name == normalizedDisplayName + '.contact' ||
                file.name.toLowerCase().replaceAll(' ', '-') ==
                    contactDisplayName.toLowerCase() ||
                file.name == contactDisplayName + '.contact'),
      );

      // If not found by exact match, try fuzzy matching
      if (fileIndex == -1) {
        fileIndex = _stateManager.files.indexWhere(
          (file) =>
              file.path.startsWith('contact://') &&
              (file.name.toLowerCase().contains(
                    normalizedDisplayName.toLowerCase(),
                  ) ||
                  file.name.toLowerCase().contains(
                    contactDisplayName.toLowerCase(),
                  )),
        );
      }

      // Enhanced debug: show all contact files and their names for troubleshooting
      if (fileIndex == -1) {
        print(
          "DEBUG: Enhanced contact search - looking for: '$contactDisplayName' or '$normalizedDisplayName'",
        );
        final contactFiles = _stateManager.files
            .where((file) => file.path.startsWith('contact://'))
            .toList();
        print("DEBUG: All contact files:");
        for (final file in contactFiles) {
          final baseName = file.name.replaceAll('.contact', '');
          final nameToJS = baseName.toLowerCase().replaceAll(' ', '-');
          print(
            "  - '${file.path}' -> '${file.name}' -> JS format: '$nameToJS'",
          );
        }
      }

      if (fileIndex != -1) {
        actualFileId = _stateManager.files[fileIndex].path;
        print("DEBUG: Found contact file with path: '$actualFileId'");
      }
    } else {
      // For non-contact objects, use direct path matching
      fileIndex = _stateManager.files.indexWhere((file) => file.path == fileId);
      actualFileId = fileId;
    }
    print(
      "DEBUG: File found at index: $fileIndex (total files: ${_stateManager.files.length})",
    );

    if (fileIndex != -1) {
      print(
        "DEBUG: Found file '${_stateManager.files[fileIndex].name}' with path '${_stateManager.files[fileIndex].path}'",
      );
    } else {
      print(
        "DEBUG: File with ID '$actualFileId' not found in state manager. Available paths:",
      );
      for (final file in _stateManager.files) {
        print("  - '${file.path}' (${file.name})");
      }

      // For contact objects, also log the contact-specific search if not found
      if (isContactObject && fileIndex == -1) {
        final contactDisplayName = fileId.replaceFirst('contact://', '');
        print(
          "DEBUG: Final search failed for contact with display name: '$contactDisplayName'",
        );
      }
    }

    // Update position using the actual file ID (without contact:// prefix)
    _stateManager.updateFilePosition(
      actualFileId,
      x,
      y,
      z,
      rotation: rotation, // ROTATION FIX: Pass rotation to state manager
      furnitureId: furnitureId,
      furnitureSlotIndex: furnitureSlotIndex,
      updateFurniture: updateFurniture,
    );
    await _persistenceService.savePersistedFiles(_stateManager.files);

    if (isContactObject) {
      print(
        "🔄 CONTACT POSITION FIXED: Contact $actualFileId moved to x:$x, y:$y, z:$z${furnitureId != null ? ' on furniture $furnitureId slot $furnitureSlotIndex' : ''} and persisted to Flutter storage",
      );
    } else {
      print(
        "HomePageController: File $actualFileId moved to x:$x, y:$y, z:$z${furnitureId != null ? ' on furniture $furnitureId slot $furnitureSlotIndex' : ''}. Files count: ${_stateManager.files.length}",
      );
    }
  }

  // Method to handle file addition (called when paths are created in JavaScript)
  Future<void> handleFileAdded(fm.FileModel fileModel) async {
    print(
      "🛤️ HomePageController: Adding file to state: ${fileModel.name} (${fileModel.path})",
    );
    _stateManager.addFile(fileModel);
    notifyListeners();
    await _persistenceService.savePersistedFiles(_stateManager.files);
    print(
      "🛤️ HomePageController: File added to state. Total files: ${_stateManager.files.length}",
    );
  }

  // ============================================================================
  // APP MANAGEMENT METHODS
  // ============================================================================
  /// Show app picker dialog and handle app selection
  /// Apps are now preloaded in SplashScreen, so this shows picker immediately
  Future<void> addAppsAndNavigate(BuildContext context) async {
    if (!context.mounted) return;

    try {
      developer.log('Getting apps for picker...', name: 'HomePageController');

      // Get apps from service (will use cache from splash screen preload)
      final apps = await _appService.getInstalledApps();

      if (apps.isEmpty) {
        _showSnackBar('No apps found');
        return;
      }

      developer.log(
        'Showing app picker with ${apps.length} apps',
        name: 'HomePageController',
      );

      // Show app picker dialog immediately (no loading dialog needed)
      await showAppPickerDialog(
        context,
        apps,
        await _appService.loadFavoriteApps(),
        (selectedApps) async {
          print(
            '🎯 DEBUG: App picker callback triggered with ${selectedApps.length} apps',
          );
          await _handleAppSelection(context, selectedApps);
        },
      );
    } catch (e) {
      developer.log('Error showing app picker: $e', name: 'HomePageController');
      _showSnackBar('Error loading apps. Please try again.');
    }
  }

  /// Handle app selection and navigation
  Future<void> _handleAppSelection(
    BuildContext context,
    List<AppInfo> selectedApps,
  ) async {
    print(
      '🚀 DEBUG: _handleAppSelection CALLED with ${selectedApps.length} selected apps',
    );
    try {
      developer.log(
        'Handling app selection: ${selectedApps.length} apps',
        name: 'HomePageController',
      );

      // Use the app position service to handle position preservation
      final newAppFileModels = await _appPositionService.processAppSelection(
        selectedApps,
        _stateManager.files,
      );

      print(
        '🚀 DEBUG: processAppSelection returned ${newAppFileModels.length} new app models',
      );

      // Get current app files and selected app paths for comparison
      final currentAppFiles = _stateManager.files
          .where((file) => _isAppFile(file))
          .toList();

      final selectedAppPaths = selectedApps
          .map((app) => 'app_${app.packageName}')
          .toSet();

      // Remove app files that are no longer selected
      final appFilesToRemove = currentAppFiles
          .where((file) => !selectedAppPaths.contains(file.path))
          .toList();

      developer.log(
        'Removing ${appFilesToRemove.length} unselected app files',
        name: 'HomePageController',
      );

      for (final appFile in appFilesToRemove) {
        _stateManager.removeFile(appFile.path);
      }

      developer.log(
        'Adding ${newAppFileModels.length} new app files to state manager',
        name: 'HomePageController',
      );

      // Add only the new app files to state manager
      for (final appFile in newAppFileModels) {
        _stateManager.addFile(appFile);
      }

      // Save persistence
      await _persistenceService.savePersistedFiles(_stateManager.files);

      // Check if we're already in the 3D world (interop service is set)
      if (_threeJsInteropService != null) {
        // We're already in the 3D world - add only NEW apps to the scene
        developer.log(
          '🔄 Already in 3D world - adding ${newAppFileModels.length} new apps to scene',
          name: 'HomePageController',
        );

        if (newAppFileModels.isNotEmpty) {
          await _threeJsInteropService!.addNewFilesToWorld(newAppFileModels);
          _showSnackBar('Added ${newAppFileModels.length} apps to your world!');
        } else {
          // If no new apps but some were removed, refresh the entire scene
          await _threeJsInteropService!.sendFilesToWebView(_stateManager.files);
          _showSnackBar('App selection updated!');
        }
      } else {
        // We're on the home screen - navigate to 3D world
        developer.log(
          '🚀 Navigating to 3D world with apps',
          name: 'HomePageController',
        );
        if (context.mounted) {
          navigateToThreeJsScreen(context);
        }

        if (newAppFileModels.isNotEmpty) {
          _showSnackBar('Added ${newAppFileModels.length} apps to your world!');
        } else {
          _showSnackBar('App selection updated!');
        }
      }
    } catch (e) {
      developer.log(
        'Error handling app selection: $e',
        name: 'HomePageController',
      );
      _showSnackBar('Error adding apps: ${e.toString()}');
    }
  }

  /// Launch an app by package name
  Future<void> launchApp(String packageName) async {
    try {
      developer.log('Launching app: $packageName', name: 'HomePageController');

      final success = await _appService.launchApp(packageName);
      if (success) {
        _showSnackBar('App launched successfully');
      } else {
        _showSnackBar('Failed to launch app');
      }
    } catch (e) {
      developer.log('Error launching app: $e', name: 'HomePageController');
      _showSnackBar('Error launching app: ${e.toString()}');
    }
  }

  /// Get favorite apps
  Future<List<AppInfo>> getFavoriteApps() async {
    return await _appService.loadFavoriteApps();
  }

  /// Clear app cache
  Future<void> clearAppCache() async {
    await _appService.clearCache();
  }

  /// Show a snackbar message
  void _showSnackBar(String message) {
    if (_currentContext != null) {
      ScaffoldMessenger.of(
        _currentContext!,
      ).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  // ============================================================================
  // ADD CONTACTS FUNCTIONALITY
  // ============================================================================

  /// Show contact picker dialog and handle contact selection
  Future<void> addContactsAndNavigate(BuildContext context) async {
    try {
      developer.log('Starting contact picker flow', name: 'HomePageController');
      print(
        '🔍 DEBUG: _threeJsInteropService is ${_threeJsInteropService == null ? "NULL" : "NOT NULL"}',
      );

      // Check permissions first
      if (!await DeviceContactService.hasContactsPermission()) {
        final granted = await DeviceContactService.requestContactsPermission();
        if (!granted) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Contacts permission is required to add contacts',
                ),
                backgroundColor: Colors.red,
              ),
            );
          }
          return;
        }
      }

      // No loading dialog needed - search is instant

      // Get existing contact files to show selected state
      final existingContactFiles = files
          .where((file) => DeviceContactService.isContactFile(file))
          .toList();

      final existingContactIds = existingContactFiles
          .map((file) => file.mimeType?.substring('contact:'.length))
          .where((id) => id != null)
          .toSet();

      // Show search-based contact picker dialog
      if (context.mounted) {
        final selectedContactResult = await _showSearchContactPickerDialog(
          context,
          existingContactIds,
        );

        print('🔍 DEBUG: selectedContactResult = $selectedContactResult');

        if (selectedContactResult != null) {
          final selectedContacts = selectedContactResult['selected']!;
          final deselectedContacts = selectedContactResult['deselected']!;

          print(
            '🔍 DEBUG: selectedContacts.length = ${selectedContacts.length}',
          );
          print(
            '🔍 DEBUG: deselectedContacts.length = ${deselectedContacts.length}',
          );

          // PHASE 1: Enhanced sync strategy - handle both additions and removals

          // Remove deselected contacts first
          if (deselectedContacts.isNotEmpty) {
            developer.log(
              'Removing ${deselectedContacts.length} deselected contacts',
              name: 'HomePageController',
            );

            for (final contact in deselectedContacts) {
              final contactFiles = _stateManager.files
                  .where(
                    (file) =>
                        _isContactFile(file) &&
                        _extractContactId(file) == contact.id,
                  )
                  .toList();

              for (final contactFile in contactFiles) {
                _stateManager.removeFile(contactFile.path);
              }
            }
          }

          // Add newly selected contacts
          if (selectedContacts.isNotEmpty) {
            developer.log(
              'Adding ${selectedContacts.length} new contact files to state manager',
              name: 'HomePageController',
            );

            // Convert selected contacts to FileModels
            final contactFiles = selectedContacts
                .map(
                  (contact) => DeviceContactService.contactToFileModel(contact),
                )
                .toList();

            // Add selected contacts to state manager
            for (var contactFile in contactFiles) {
              _stateManager.addFile(contactFile);
            }
          }

          // Save to persistence
          await _persistenceService.savePersistedFiles(files);

          final totalChanges =
              selectedContacts.length + deselectedContacts.length;
          developer.log(
            'Contact menu synchronized: +${selectedContacts.length} -${deselectedContacts.length} contacts',
            name: 'HomePageController',
          );

          // Show success message
          if (totalChanges > 0 && context.mounted) {
            String message;
            if (selectedContacts.isNotEmpty && deselectedContacts.isNotEmpty) {
              message =
                  'Updated contacts: +${selectedContacts.length} -${deselectedContacts.length}';
            } else if (selectedContacts.isNotEmpty) {
              message =
                  'Added ${selectedContacts.length} contact(s) to your world';
            } else {
              message =
                  'Removed ${deselectedContacts.length} contact(s) from your world';
            }

            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(message), backgroundColor: Colors.green),
            );
          }

          // Check if already in 3D world
          if (_threeJsInteropService != null) {
            print('🔍 DEBUG: In 3D world, checking selectedContacts...');
            print(
              '🔍 DEBUG: selectedContacts.length = ${selectedContacts.length}',
            );
            print(
              '🔍 DEBUG: selectedContacts.isNotEmpty = ${selectedContacts.isNotEmpty}',
            );

            // Already in 3D world - send only NEW contact FileModels to JavaScript
            // This prevents clearFileObjects() from wiping existing objects
            if (selectedContacts.isNotEmpty) {
              // Convert selected contacts to FileModels
              final newContactFiles = selectedContacts
                  .map(
                    (contact) =>
                        DeviceContactService.contactToFileModel(contact),
                  )
                  .toList();
              print(
                '👥 Adding ${newContactFiles.length} new contact(s) to existing 3D world',
              );

              // DEBUG: Print contact details
              for (var contact in newContactFiles) {
                print(
                  '🔍 DEBUG Contact: name="${contact.name}", path="${contact.path}", mimeType="${contact.mimeType}"',
                );
              }

              print('🔍 DEBUG: About to call addNewFilesToWorld()');
              await _threeJsInteropService!.addNewFilesToWorld(newContactFiles);
              print('🔍 DEBUG: addNewFilesToWorld() completed');
            }
            // Note: Deselected contacts are already deleted via removeFile(), no need to track here
          } else {
            // Not in 3D world yet - navigate as before
            print('👥 Navigating to 3D world with contacts');
            navigateToThreeJsScreen(context);
          }
        }
      }
    } catch (e) {
      developer.log('Error adding contacts: $e', name: 'HomePageController');

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading contacts: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Show search-based contact picker dialog
  Future<Map<String, List<Contact>>?> _showSearchContactPickerDialog(
    BuildContext context,
    Set<String?> existingContactIds,
  ) async {
    final selectedContacts = <Contact>[];
    final searchController = TextEditingController();
    final searchResults = <Contact>[];
    bool isSearching = false;

    return showDialog<Map<String, List<Contact>>>(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setState) {
            // Perform search
            void performSearch(String query) async {
              if (query.trim().isEmpty) {
                setState(() {
                  searchResults.clear();
                  isSearching = false;
                });
                return;
              }

              setState(() => isSearching = true);

              final results = await DeviceContactService.searchContacts(query);

              setState(() {
                searchResults.clear();
                searchResults.addAll(results);
                isSearching = false;
              });
            }

            // Get screen dimensions and orientation
            final mediaQuery = MediaQuery.of(context);
            final screenHeight = mediaQuery.size.height;
            final screenWidth = mediaQuery.size.width;
            final keyboardHeight = mediaQuery.viewInsets.bottom;
            final isLandscape = mediaQuery.orientation == Orientation.landscape;

            // Calculate responsive dimensions with keyboard awareness
            // Calculate actual usable screen height (what's not covered by keyboard)
            final usableScreenHeight = screenHeight - keyboardHeight;

            final dialogWidth = isLandscape
                ? screenWidth * 0.85
                : screenWidth * 0.9;

            // Build action buttons
            final actionButtons = [
              TextButton(
                onPressed: () => Navigator.of(context).pop(null),
                child: const Text('Cancel'),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: selectedContacts.isEmpty
                    ? null
                    : () {
                        Navigator.of(context).pop({
                          'selected': selectedContacts,
                          'deselected': <Contact>[],
                        });
                      },
                child: Text(
                  selectedContacts.isEmpty
                      ? 'Add Contacts'
                      : 'Add ${selectedContacts.length}',
                ),
              ),
            ];

            // Build search field widget
            final searchField = TextField(
              controller: searchController,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Search contacts...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          searchController.clear();
                          performSearch('');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
              ),
              onChanged: (value) {
                performSearch(value);
              },
            );

            // Build contact results list widget
            final contactResultsList = Column(
              children: [
                // Selected contacts count
                if (selectedContacts.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.check_circle,
                          color: Colors.green.shade700,
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '${selectedContacts.length} selected',
                          style: TextStyle(
                            color: Colors.green.shade700,
                            fontWeight: FontWeight.w500,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (selectedContacts.isNotEmpty) const SizedBox(height: 6),

                // Results list
                Expanded(
                  child: isSearching
                      ? const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              CircularProgressIndicator(),
                              SizedBox(height: 12),
                              Text('Searching contacts...'),
                            ],
                          ),
                        )
                      : searchResults.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                searchController.text.isEmpty
                                    ? Icons.search
                                    : Icons.person_search,
                                size: 48,
                                color: Colors.grey.shade400,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                searchController.text.isEmpty
                                    ? 'Start typing to search contacts'
                                    : 'No contacts found',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          itemCount: searchResults.length,
                          itemBuilder: (context, index) {
                            final contact = searchResults[index];
                            final isSelected = selectedContacts.contains(
                              contact,
                            );
                            final alreadyAdded = existingContactIds.contains(
                              contact.id,
                            );
                            final phoneNumber = contact.phones.isNotEmpty
                                ? contact.phones.first.number
                                : 'No phone';

                            return ListTile(
                              dense: true,
                              visualDensity: VisualDensity.compact,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 2,
                              ),
                              leading: CircleAvatar(
                                radius: 18,
                                backgroundImage: contact.thumbnail != null
                                    ? MemoryImage(contact.thumbnail!)
                                    : null,
                                child: contact.thumbnail == null
                                    ? const Icon(Icons.person, size: 18)
                                    : null,
                              ),
                              title: Text(
                                contact.displayName,
                                style: const TextStyle(fontSize: 14),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    phoneNumber,
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  if (alreadyAdded)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 1,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.blue.shade100,
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                        ),
                                        child: Text(
                                          'Already added',
                                          style: TextStyle(
                                            fontSize: 9,
                                            color: Colors.blue.shade700,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              trailing: Checkbox(
                                value: isSelected,
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                                visualDensity: VisualDensity.compact,
                                onChanged: alreadyAdded
                                    ? null
                                    : (bool? value) {
                                        setState(() {
                                          if (value == true) {
                                            selectedContacts.add(contact);
                                          } else {
                                            selectedContacts.remove(contact);
                                          }
                                        });
                                      },
                              ),
                              onTap: alreadyAdded
                                  ? null
                                  : () {
                                      setState(() {
                                        if (selectedContacts.contains(
                                          contact,
                                        )) {
                                          selectedContacts.remove(contact);
                                        } else {
                                          selectedContacts.add(contact);
                                        }
                                      });
                                    },
                            );
                          },
                        ),
                ),
              ],
            );

            return Dialog(
              insetPadding: EdgeInsets.zero,
              child: Container(
                margin: EdgeInsets.symmetric(
                  horizontal: isLandscape ? 8 : 20,
                  vertical: isLandscape ? 8 : 20,
                ),
                width: isLandscape ? screenWidth - 16 : dialogWidth,
                height: usableScreenHeight - (isLandscape ? 36 : 40),
                child: Material(
                  elevation: 24,
                  borderRadius: BorderRadius.circular(4),
                  child: isLandscape
                      ? Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Column 1: Title only
                            SizedBox(
                              width: 100,
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Text(
                                  'Add Contacts',
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                            const VerticalDivider(width: 1),
                            // Column 2: Search box and action buttons
                            SizedBox(
                              width: 250,
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  children: [
                                    searchField,
                                    const Spacer(),
                                    // Action buttons at bottom
                                    Row(children: actionButtons),
                                  ],
                                ),
                              ),
                            ),
                            const VerticalDivider(width: 1),
                            // Column 3: Contact results list
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: contactResultsList,
                              ),
                            ),
                          ],
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Title
                            Padding(
                              padding: const EdgeInsets.fromLTRB(
                                20,
                                16,
                                20,
                                12,
                              ),
                              child: Text(
                                'Add Contacts',
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                            ),
                            const Divider(height: 1),
                            // Content - expanded to fill available space
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                child: Column(
                                  children: [
                                    searchField,
                                    const SizedBox(height: 8),
                                    Expanded(child: contactResultsList),
                                  ],
                                ),
                              ),
                            ),
                            // Actions (portrait only)
                            const Divider(height: 1),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: actionButtons,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  // ============================================================================
  // ADD LINK FUNCTIONALITY
  // ============================================================================

  /// Show URL input dialog and handle link creation
  Future<void> addLinkAndNavigate(BuildContext context) async {
    try {
      developer.log('Starting add link flow', name: 'HomePageController');

      // Show URL input dialog
      final TextEditingController urlController = TextEditingController();
      String? enteredUrl;

      final bool? result = await showDialog<bool>(
        context: context,
        builder: (context) {
          final isLandscape =
              MediaQuery.of(context).orientation == Orientation.landscape;
          final screenWidth = MediaQuery.of(context).size.width;
          final screenHeight = MediaQuery.of(context).size.height;
          final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
          final usableScreenHeight = screenHeight - keyboardHeight;
          final dialogWidth = MediaQuery.of(context).size.width * 0.85;

          // Action buttons
          final actionButtons = [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: () {
                enteredUrl = urlController.text.trim();
                Navigator.of(context).pop(true);
              },
              child: const Text('Add Link'),
            ),
          ];

          // URL input field
          final urlInputField = TextField(
            controller: urlController,
            autofocus: true,
            decoration: const InputDecoration(
              labelText: 'URL',
              hintText: 'https://www.youtube.com/watch?v=...',
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
            ),
            keyboardType: TextInputType.url,
            autocorrect: false,
            textInputAction: TextInputAction.done,
            onSubmitted: (value) {
              enteredUrl = urlController.text.trim();
              Navigator.of(context).pop(true);
            },
          );

          // Help text
          final helpText = Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'Supported Content:',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                '• YouTube videos',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              Text(
                '• Websites and web pages',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              Text(
                '• Social media links',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              Text(
                '• Online articles',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          );

          return Dialog(
            insetPadding: EdgeInsets.zero,
            child: Container(
              margin: EdgeInsets.symmetric(
                horizontal: isLandscape ? 8 : 20,
                vertical: isLandscape ? 8 : 20,
              ),
              width: isLandscape ? screenWidth - 16 : dialogWidth,
              height: usableScreenHeight - (isLandscape ? 16 : 40),
              child: Material(
                elevation: 24,
                borderRadius: BorderRadius.circular(4),
                child: isLandscape
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Column 1: Title only
                          SizedBox(
                            width: 100,
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text(
                                'Add Link',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                          const VerticalDivider(width: 1),
                          // Column 2: URL input only
                          SizedBox(
                            width: 300,
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const Text(
                                    'Enter a URL:',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  urlInputField,
                                ],
                              ),
                            ),
                          ),
                          const VerticalDivider(width: 1),
                          // Column 3: Help text only
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: helpText,
                            ),
                          ),
                          const VerticalDivider(width: 1),
                          // Column 4: Action buttons
                          SizedBox(
                            width: 140,
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.end,
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: actionButtons
                                    .map(
                                      (btn) => Padding(
                                        padding: const EdgeInsets.only(
                                          bottom: 8,
                                        ),
                                        child: btn is SizedBox
                                            ? const SizedBox.shrink()
                                            : btn,
                                      ),
                                    )
                                    .where(
                                      (w) =>
                                          w is! SizedBox ||
                                          (w as SizedBox).width != 8,
                                    )
                                    .toList(),
                              ),
                            ),
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Title
                          Padding(
                            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                            child: Text(
                              'Add Link',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ),
                          const Divider(height: 1),
                          // Content
                          Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const Text(
                                  'Enter a URL to add to your 3D world:',
                                ),
                                const SizedBox(height: 16),
                                urlInputField,
                                const SizedBox(height: 8),
                                const Text(
                                  'Supports YouTube videos, websites, and more',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Actions
                          const Divider(height: 1),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: actionButtons,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          );
        },
      );

      if (result == true && enteredUrl != null && enteredUrl!.isNotEmpty) {
        // Normalize the URL (add https:// if missing)
        String normalizedUrl = _normalizeUrl(enteredUrl!);

        print('🔗 HomePageController: URL entered: $enteredUrl');
        print('🔗 HomePageController: Normalized URL: $normalizedUrl');

        // Check if we're already on the ThreeJS screen
        if (_threeJsInteropService != null) {
          // Already in 3D world - create the link directly
          print('🔗 Already in 3D world, creating link directly');
          await _createLinkInThreeJS(normalizedUrl);

          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Link added to world'),
                backgroundColor: Colors.green,
                duration: Duration(seconds: 2),
              ),
            );
          }
        } else {
          // Not in 3D world yet - store URL and navigate
          _pendingLinkUrl = normalizedUrl;
          print('🔗 HomePageController: Stored pending URL: $_pendingLinkUrl');

          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Link will be added when opening 3D world...'),
              backgroundColor: Colors.blue,
            ),
          );
          print('🔗 HomePageController: Navigating to 3D world...');

          // Navigate to 3D world
          navigateToThreeJsScreen(context);
        }
      }
    } catch (e) {
      developer.log('Error in add link flow: $e', name: 'HomePageController');

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error adding link: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  } // End of addLinkAndNavigate method

  /// Create link object in Three.js using the URL Manager
  Future<void> _createLinkInThreeJS(String url) async {
    try {
      print('🔗 HomePageController: Creating link in Three.js: $url');
      developer.log(
        'Creating link in Three.js: $url',
        name: 'HomePageController',
      );

      // Initialize the Three.js interop service if not already done
      if (_threeJsInteropService == null) {
        print('🔗 HomePageController: Three.js interop service not available!');
        throw Exception('Three.js interop service not available');
      }

      print('🔗 HomePageController: Calling interop service...');
      // Create a dedicated method for creating links in the ThreeJsInteropService
      // For now, use the existing pattern similar to other methods
      await _createLinkViaInterop(url);

      print('🔗 HomePageController: Link created successfully in Three.js');
      developer.log(
        'Link created successfully in Three.js',
        name: 'HomePageController',
      );
    } catch (e) {
      print('🔗 HomePageController: Error creating link in Three.js: $e');
      developer.log(
        'Error creating link in Three.js: $e',
        name: 'HomePageController',
      );
      throw Exception('Failed to create link: $e');
    }
  }

  /// Helper method to create link via interop service
  Future<void> _createLinkViaInterop(String url) async {
    print('🔗 HomePageController: Calling createLinkFromURL with: $url');
    final success = await _threeJsInteropService!.createLinkFromURL(url);
    print('🔗 HomePageController: createLinkFromURL returned: $success');
    if (!success) {
      throw Exception('Failed to create link in Three.js');
    }
  }

  /// Normalize URL by adding protocol if missing
  String _normalizeUrl(String url) {
    url = url.trim();

    // If URL doesn't start with http:// or https://, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://$url';
    }

    return url;
  }

  // ============================================================================
  // MUSIC SEARCH FUNCTIONALITY
  // ============================================================================

  /// Navigate to music search screen
  Future<void> searchMusicAndNavigate(
    BuildContext context, {
    String? initialQuery,
  }) async {
    try {
      developer.log(
        'Opening music search screen${initialQuery != null ? ' with query: $initialQuery' : ''}',
        name: 'HomePageController',
      );

      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => MusicSearchScreen(initialQuery: initialQuery),
        ),
      );
    } catch (e) {
      developer.log(
        'Error opening music search: $e',
        name: 'HomePageController',
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error opening music search: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Create link object from music search result
  Future<void> createLinkFromMusicSearchResult(
    BuildContext context,
    MusicSearchResult result,
  ) async {
    try {
      developer.log(
        'Creating link from search result: ${result.title}',
        name: 'HomePageController',
      );

      // Check if we're already on the ThreeJS screen
      if (_threeJsInteropService != null) {
        // Directly create the link in the current 3D world
        developer.log(
          'Already on ThreeJS screen, creating link directly',
          name: 'HomePageController',
        );
        await _createLinkInThreeJS(result.url);
      } else {
        // Store the URL to be processed when navigating to 3D world
        _pendingLinkUrl = result.url;

        developer.log(
          'Stored pending music URL: $_pendingLinkUrl',
          name: 'HomePageController',
        );

        // Navigate to 3D world where the link will be created
        navigateToThreeJsScreen(context);
      }
    } catch (e) {
      developer.log(
        'Error creating link from search result: $e',
        name: 'HomePageController',
      );
      rethrow;
    }
  }

  /// Check and process any pending link URL when Three.js service becomes available
  Future<void> _processPendingLinkIfNeeded() async {
    print('🔗 HomePageController: Processing pending link check...');
    print('🔗 HomePageController: Pending URL: $_pendingLinkUrl');
    print(
      '🔗 HomePageController: Interop service available: ${_threeJsInteropService != null}',
    );

    if (_pendingLinkUrl != null && _threeJsInteropService != null) {
      try {
        print(
          '🔗 HomePageController: Processing pending link: $_pendingLinkUrl',
        );
        developer.log(
          'Processing pending link: $_pendingLinkUrl',
          name: 'HomePageController',
        );
        await _createLinkInThreeJS(_pendingLinkUrl!);
        _pendingLinkUrl = null; // Clear after processing
        print('🔗 HomePageController: Pending link processed successfully');
        developer.log(
          'Pending link processed successfully',
          name: 'HomePageController',
        );
      } catch (e) {
        print('🔗 HomePageController: Error processing pending link: $e');
        developer.log(
          'Error processing pending link: $e',
          name: 'HomePageController',
        );
        _pendingLinkUrl = null; // Clear even on error to avoid retry loops
      }
    } else {
      print(
        '🔗 HomePageController: No pending link to process or service not available',
      );
    }
  }

  /// Handle new link object added from the 3D scene
  Future<void> handleLinkObjectAdded(fm.FileModel linkFile) async {
    try {
      print("🔗 HomePageController: Adding new link object: ${linkFile.name}");
      print("🔗 Link path: ${linkFile.path}");
      print("🔗 Link position: (${linkFile.x}, ${linkFile.y}, ${linkFile.z})");

      // Add the link file to the state manager
      _stateManager.addFile(linkFile);

      // Persist the updated file list
      await _persistenceService.savePersistedFiles(_stateManager.files);

      print("✅ Link object successfully added and persisted: ${linkFile.name}");

      // Show success notification (only if not during initial loading, and not demo/refreshed content)
      if (_currentContext != null && !isLoading && !linkFile.isDemo) {
        ScaffoldMessenger.of(_currentContext!).showSnackBar(
          SnackBar(
            content: Text(
              'Link "${linkFile.name}" added and will persist across app restarts',
            ),
            duration: const Duration(seconds: 3),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (error) {
      print("❌ Error adding link object to persistence: $error");

      // Show error notification (only if not during initial loading, and not demo/refreshed content)
      if (_currentContext != null && !isLoading && !linkFile.isDemo) {
        ScaffoldMessenger.of(_currentContext!).showSnackBar(
          SnackBar(
            content: Text('Failed to save link "${linkFile.name}": $error'),
            duration: const Duration(seconds: 3),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Handle link name change from JavaScript - update FileModel with custom name
  Future<void> handleLinkNameChanged(String objectId, String customName) async {
    try {
      print(
        "🔗 HomePageController: Handling link name change for $objectId -> '$customName'",
      );

      // Find the link object in our files
      final linkIndex = _stateManager.files.indexWhere(
        (file) => file.path == objectId,
      );

      if (linkIndex != -1) {
        final currentFile = _stateManager.files[linkIndex];

        // Create updated FileModel with custom display name
        final updatedFile = fm.FileModel(
          name: currentFile.name, // Keep original name
          type: currentFile.type,
          path: currentFile.path,
          parentFolder: currentFile.parentFolder,
          extension: currentFile.extension,
          x: currentFile.x,
          y: currentFile.y,
          z: currentFile.z,
          thumbnailDataUrl: currentFile.thumbnailDataUrl,
          height: currentFile.height,
          fileSize: currentFile.fileSize,
          lastModified: currentFile.lastModified,
          created: currentFile.created,
          mimeType: currentFile.mimeType,
          isReadable: currentFile.isReadable,
          isWritable: currentFile.isWritable,
          customDisplayName: customName, // Set the custom display name
          // EXIF metadata fields
          cameraMake: currentFile.cameraMake,
          cameraModel: currentFile.cameraModel,
          dateTimeOriginal: currentFile.dateTimeOriginal,
          imageWidth: currentFile.imageWidth,
          imageHeight: currentFile.imageHeight,
          aperture: currentFile.aperture,
          shutterSpeed: currentFile.shutterSpeed,
          iso: currentFile.iso,
          focalLength: currentFile.focalLength,
          flash: currentFile.flash,
          whiteBalance: currentFile.whiteBalance,
          orientation: currentFile.orientation,
          gpsLatitude: currentFile.gpsLatitude,
          gpsLongitude: currentFile.gpsLongitude,
          gpsAltitude: currentFile.gpsAltitude,
          lensModel: currentFile.lensModel,
          exposureTime: currentFile.exposureTime,
          fNumber: currentFile.fNumber,
          photographicSensitivity: currentFile.photographicSensitivity,
          digitalZoomRatio: currentFile.digitalZoomRatio,
          sceneCaptureType: currentFile.sceneCaptureType,
          subjectDistance: currentFile.subjectDistance,
        );

        // Update in state manager
        _stateManager.files[linkIndex] = updatedFile;

        // Save to persistence
        await _persistenceService.savePersistedFiles(_stateManager.files);

        print(
          "✅ HomePageController: Successfully updated link name in FileModel and persistence",
        );
        notifyListeners();
      } else {
        print(
          "⚠️ HomePageController: Link object not found in files: $objectId",
        );
      }
    } catch (e) {
      print("❌ HomePageController: Error handling link name change: $e");
    }
  }

  /// Check if a file is an app type and extract package name
  bool _isAppFile(fm.FileModel file) {
    // Check if it's an app type with the app_ prefix
    if (file.type != fm.FileType.app || !file.path.startsWith('app_')) {
      return false;
    }

    // Exclude link objects - they have mimeType starting with 'link:'
    if (file.mimeType != null && file.mimeType!.startsWith('link:')) {
      return false;
    }

    return true;
  }

  /// Extract package name from app file
  String? _extractPackageName(fm.FileModel file) {
    if (!_isAppFile(file)) return null;
    return file.path.replaceFirst('app_', '');
  }

  /// Remove an app from favorites list when it's deleted from 3D world
  Future<void> _removeAppFromFavorites(String packageName) async {
    try {
      // Get current favorites
      final currentFavorites = await _appService.loadFavoriteApps();

      // Remove the app with matching package name
      final updatedFavorites = currentFavorites
          .where((app) => app.packageName != packageName)
          .toList();

      // Save updated favorites if any were removed
      if (updatedFavorites.length != currentFavorites.length) {
        await _appService.saveFavoriteApps(updatedFavorites);
        developer.log(
          'Removed app $packageName from favorites. ${currentFavorites.length - updatedFavorites.length} apps removed.',
          name: 'HomePageController',
        );
      }
    } catch (e) {
      developer.log(
        'Error removing app from favorites: $e',
        name: 'HomePageController',
      );
    }
  }

  /// Add an app to favorites list
  Future<void> _addAppToFavorites(
    fm.FileModel appFile,
    String packageName,
  ) async {
    try {
      // Get current favorites
      final currentFavorites = await _appService.loadFavoriteApps();

      // Check if the app is already in favorites
      final isAlreadyFavorite = currentFavorites.any(
        (app) => app.packageName == packageName,
      );

      if (isAlreadyFavorite) {
        print('App $packageName is already in favorites');
        return;
      }

      // Add the app to favorites
      currentFavorites.add(
        AppInfo(
          id: packageName,
          name: appFile.name,
          packageName: packageName,
          iconPath: null,
          isSystemApp: false,
        ),
      );

      // Save updated favorites
      await _appService.saveFavoriteApps(currentFavorites);

      developer.log(
        'Added app $packageName to favorites',
        name: 'HomePageController',
      );
    } catch (e) {
      developer.log(
        'Error adding app to favorites: $e',
        name: 'HomePageController',
      );
    }
  }

  // Note: _preloadApps() method removed - app preloading now happens in SplashScreen

  @override
  void dispose() {
    // Cleanup resources
    super.dispose();
  }

  // ============================================================================
  // CONTACT MENU SYNCHRONIZATION (mirrors app system)
  // ============================================================================

  /// Check if a file is a contact type (mirrors _isAppFile)
  bool _isContactFile(fm.FileModel file) {
    return DeviceContactService.isContactFile(file);
  }

  /// Extract contact ID from contact file (mirrors _extractPackageName)
  String? _extractContactId(fm.FileModel file) {
    if (!_isContactFile(file)) return null;
    if (file.mimeType == null || !file.mimeType!.startsWith('contact:')) {
      return null;
    }
    return file.mimeType!.substring('contact:'.length);
  }

  /// Remove contact from menu state when deleted in 3D world (mirrors _removeAppFromFavorites)
  Future<void> removeContactFromMenu(
    String contactId,
    String contactName,
  ) async {
    try {
      developer.log(
        'Removing contact $contactName ($contactId) from menu state',
        name: 'HomePageController',
      );

      // Find and remove the contact file from state manager
      final contactFiles = _stateManager.files
          .where((file) => _isContactFile(file))
          .toList();

      final contactToRemove = contactFiles.firstWhere(
        (file) => _extractContactId(file) == contactId,
        orElse: () => throw Exception('Contact not found in files'),
      );

      // Remove from state manager
      _stateManager.removeFile(contactToRemove.path);

      // Save updated files to persistence
      await _persistenceService.savePersistedFiles(_stateManager.files);

      developer.log(
        'Contact $contactName removed from menu state successfully',
        name: 'HomePageController',
      );

      // Note: State updates will be handled by the state manager
    } catch (e) {
      developer.log(
        'Error removing contact from menu: $e',
        name: 'HomePageController',
      );
    }
  }

  /// Add contact to menu state when restored in 3D world (mirrors _addAppToFavorites)
  Future<void> addContactToMenu(String contactId, String contactName) async {
    try {
      developer.log(
        'Adding contact $contactName ($contactId) to menu state',
        name: 'HomePageController',
      );

      // Check if contact already exists
      final existingContact = _stateManager.files.firstWhere(
        (file) => _isContactFile(file) && _extractContactId(file) == contactId,
        orElse: () => throw Exception('Contact not found'),
      );

      if (existingContact.path.isNotEmpty) {
        developer.log('Contact $contactName already exists in menu state');
        return;
      }

      // Note: For restoration, the contact file should already exist in the system
      // This method is primarily for validation and state refresh
      developer.log(
        'Contact $contactName restoration validated in menu state',
        name: 'HomePageController',
      );

      // State updates will be handled by the state manager
    } catch (e) {
      // This is expected during restoration - contact will be re-added via normal flow
      developer.log(
        'Contact $contactName will be restored via normal contact restoration flow',
        name: 'HomePageController',
      );
    }
  }

  /// Get current contact files for JavaScript bridge (mirrors app system)
  List<Map<String, dynamic>> getContactFilesForSync() {
    final contactFiles = _stateManager.files
        .where((file) => _isContactFile(file))
        .map(
          (file) => {
            'id': _extractContactId(file) ?? file.path,
            'name': file.name.replaceAll('.contact', ''),
            'filePath': file.path,
            'mimeType': file.mimeType,
            'isActive': true,
          },
        )
        .toList();

    developer.log(
      'Providing ${contactFiles.length} contact files for JavaScript sync',
      name: 'HomePageController',
    );

    return contactFiles;
  }

  /// Handle premium gaming popup request from JavaScript
  Future<void> handlePremiumGamingPopupRequest(
    Map<String, dynamic> data,
  ) async {
    developer.log('🎮 Premium gaming popup requested with data: $data');

    if (_currentContext == null) {
      developer.log('⚠️ No context available for premium gaming popup');
      return;
    }

    // Show the proper PremiumGamingPopup widget with testing toggle using helper function
    await showPremiumGamingPopup(
      _currentContext!,
      showTestingToggle: AppConfig.showPremiumGamingTestToggle,
      onUnlocked: () {
        developer.log('🎮 POPUP CALLBACK: Premium gaming levels unlocked!');
        // Actually unlock the gaming levels
        final premiumService = _currentContext!.read<PremiumService>();

        developer.log('🎮 POPUP CALLBACK: Unlocking gaming_level_4');
        premiumService.unlockFeature('gaming_level_4');

        developer.log('🎮 POPUP CALLBACK: Unlocking gaming_level_5');
        premiumService.unlockFeature('gaming_level_5');

        developer.log('🎮 POPUP CALLBACK: ✅ Both gaming levels unlocked');
      },
      onDismissed: () {
        developer.log('🎮 Premium gaming popup dismissed');
      },
      onJavaScriptRefresh: () {
        developer.log(
          '🎮 POPUP CALLBACK: JavaScript refresh requested from popup',
        );
        // This callback will trigger JavaScript level refresh
        try {
          developer.log(
            '🎮 POPUP CALLBACK: Calling notifyJavaScriptLevelRefresh()',
          );
          notifyJavaScriptLevelRefresh();
          developer.log(
            '🎮 POPUP CALLBACK: ✅ JavaScript refresh call completed',
          );
        } catch (error) {
          developer.log(
            '🎮 POPUP CALLBACK: ❌ Error in JavaScript refresh: $error',
          );
        }
      },
    );
  }

  /// Notify JavaScript entity manager to refresh level progression
  void notifyJavaScriptLevelRefresh() {
    developer.log(
      '🎮 HOME CONTROLLER: Notifying JavaScript to refresh gaming level progression',
    );

    try {
      // Use the static method to access the current ThreeJsScreen's webview controller
      developer.log(
        '🎮 HOME CONTROLLER: Calling ThreeJsScreen.refreshGamingLevelsGlobally()',
      );
      ThreeJsScreen.refreshGamingLevelsGlobally();
      developer.log('🎮 HOME CONTROLLER: ✅ JavaScript refresh call completed');
    } catch (error) {
      developer.log(
        '🎮 HOME CONTROLLER: ❌ Error calling JavaScript refresh: $error',
      );
    }
  }
}
