enum FileType { pdf, word, ppt, mp3, mp4, image, video, app, other }

class FileModel {
  final String name;
  final FileType type;
  final String path;
  final String? parentFolder;
  final String extension; // e.g., "pdf", "docx"
  double? x; // Position in 3D space
  double? y;
  double? z;
  double? rotation; // ROTATION FIX: Rotation in radians around Y-axis
  double? height; // Height of the 3D object for correct placement
  String? thumbnailDataUrl; // For image/video previews
  // Metadata fields from platform channel
  int? fileSize; // File size in bytes
  int? lastModified; // Last modified timestamp
  int? created; // Creation timestamp
  String? mimeType; // MIME type
  bool? isReadable; // Read permission
  bool? isWritable; // Write permission

  // EXIF metadata fields for image files
  String? cameraMake; // Camera manufacturer
  String? cameraModel; // Camera model
  String? dateTimeOriginal; // When the photo was taken
  int? imageWidth; // Image width in pixels
  int? imageHeight; // Image height in pixels
  String? aperture; // Aperture value (f-stop)
  String? shutterSpeed; // Shutter speed
  String? iso; // ISO sensitivity
  String? focalLength; // Focal length
  String? flash; // Flash setting
  String? whiteBalance; // White balance setting
  int? orientation; // Image orientation
  double? gpsLatitude; // GPS latitude
  double? gpsLongitude; // GPS longitude
  double? gpsAltitude; // GPS altitude
  String? lensModel; // Lens model
  String? exposureTime; // Exposure time
  String? fNumber; // F-number
  String? photographicSensitivity; // Photographic sensitivity
  String? digitalZoomRatio; // Digital zoom ratio
  String? sceneCaptureType; // Scene capture type
  String? subjectDistance; // Subject distance

  // Custom display name for user-customized names (especially for link objects)
  String? customDisplayName;

  // Furniture seating data - tracks if object is seated on furniture
  String? furnitureId; // ID of furniture piece object is seated on
  int? furnitureSlotIndex; // Slot index on the furniture

  // Demo content flag - marks files from assets/demomedia/
  final bool isDemo;

  // Getter for effective display name - uses custom name if available, otherwise original name
  String get displayName => customDisplayName ?? name;

  FileModel({
    required this.name,
    required this.type,
    required this.path,
    this.parentFolder,
    required this.extension,
    this.x,
    this.y,
    this.z,
    this.rotation, // ROTATION FIX: Add to constructor
    this.thumbnailDataUrl,
    this.height, // Metadata fields
    this.fileSize,
    this.lastModified,
    this.created,
    this.mimeType,
    this.isReadable,
    this.isWritable,
    this.customDisplayName, // Add to constructor
    this.furnitureId, // Add furniture fields to constructor
    this.furnitureSlotIndex,
    this.isDemo = false, // Demo content flag - defaults to false
    // EXIF metadata fields
    this.cameraMake,
    this.cameraModel,
    this.dateTimeOriginal,
    this.imageWidth,
    this.imageHeight,
    this.aperture,
    this.shutterSpeed,
    this.iso,
    this.focalLength,
    this.flash,
    this.whiteBalance,
    this.orientation,
    this.gpsLatitude,
    this.gpsLongitude,
    this.gpsAltitude,
    this.lensModel,
    this.exposureTime,
    this.fNumber,
    this.photographicSensitivity,
    this.digitalZoomRatio,
    this.sceneCaptureType,
    this.subjectDistance,
  });
  // Method to convert FileModel instance to a Map, suitable for JSON encoding for the WebView
  Map<String, dynamic> toJsonForWebView() => {
    'id': path, // Use path as the unique ID for the object in JS
    'path': path, // Also send path field for JavaScript routing logic
    'name': name,
    'type': type.toString().split('.').last, // Include type for JS side
    // Ensure extension starts with a dot for JS side, and is lowercased
    'extension':
        extension.isNotEmpty &&
            extension.startsWith('.') // Add null/empty check for extension
        ? extension.toLowerCase()
        : extension
              .isNotEmpty // Add null/empty check for extension
        ? '.${extension.toLowerCase()}'
        : '', // Handle case where extension might be empty
    'x': x,
    'y': y,
    'z': z,
    'rotation': rotation, // ROTATION FIX: Add to JSON for WebView
    'height': height,
    'thumbnailDataUrl':
        thumbnailDataUrl, // Pass thumbnail data to JS    // Pass metadata to JavaScript for billboard display
    'fileSize': fileSize,
    'lastModified': lastModified,
    'created': created,
    'mimeType': mimeType,
    'isReadable': isReadable,
    'isWritable': isWritable,
    // Pass EXIF metadata to JavaScript for display and filtering
    'cameraMake': cameraMake,
    'cameraModel': cameraModel,
    'dateTimeOriginal': dateTimeOriginal,
    'imageWidth': imageWidth,
    'imageHeight': imageHeight,
    'aperture': aperture,
    'shutterSpeed': shutterSpeed,
    'iso': iso,
    'focalLength': focalLength,
    'flash': flash,
    'whiteBalance': whiteBalance,
    'orientation': orientation,
    'gpsLatitude': gpsLatitude,
    'gpsLongitude': gpsLongitude,
    'gpsAltitude': gpsAltitude,
    'lensModel': lensModel,
    'exposureTime': exposureTime,
    'fNumber': fNumber,
    'photographicSensitivity': photographicSensitivity,
    'digitalZoomRatio': digitalZoomRatio,
    'sceneCaptureType': sceneCaptureType,
    'subjectDistance': subjectDistance,
    'customDisplayName': customDisplayName, // Pass custom display name to JS
    'furnitureId': furnitureId, // Pass furniture seating data to JS
    'furnitureSlotIndex': furnitureSlotIndex,
    'isDemoContent':
        isDemo, // CRITICAL: Pass demo flag to JS to prevent redundant link creation
  };
  // Method to convert FileModel instance to a Map for shared_preferences
  Map<String, dynamic> toJson() => {
    'name': name,
    'type': type.toString().split('.').last, // Store enum as string
    'path': path,
    'parentFolder': parentFolder,
    'extension': extension,
    'x': x,
    'y': y,
    'z': z,
    'rotation': rotation, // ROTATION FIX: Persist rotation to storage
    'height': height,
    'thumbnailDataUrl':
        thumbnailDataUrl, // Persist thumbnail data    // Persist metadata fields
    'fileSize': fileSize,
    'lastModified': lastModified,
    'created': created,
    'mimeType': mimeType,
    'isReadable': isReadable,
    'isWritable': isWritable,
    // Persist EXIF metadata fields
    'cameraMake': cameraMake,
    'cameraModel': cameraModel,
    'dateTimeOriginal': dateTimeOriginal,
    'imageWidth': imageWidth,
    'imageHeight': imageHeight,
    'aperture': aperture,
    'shutterSpeed': shutterSpeed,
    'iso': iso,
    'focalLength': focalLength,
    'flash': flash,
    'whiteBalance': whiteBalance,
    'orientation': orientation,
    'gpsLatitude': gpsLatitude,
    'gpsLongitude': gpsLongitude,
    'gpsAltitude': gpsAltitude,
    'lensModel': lensModel,
    'exposureTime': exposureTime,
    'fNumber': fNumber,
    'photographicSensitivity': photographicSensitivity,
    'digitalZoomRatio': digitalZoomRatio,
    'sceneCaptureType': sceneCaptureType,
    'subjectDistance': subjectDistance,
    'customDisplayName': customDisplayName, // Include custom display name
    'furnitureId': furnitureId, // Persist furniture seating data
    'furnitureSlotIndex': furnitureSlotIndex,
    'isDemo': isDemo, // Persist demo flag
  };
  // Factory constructor to create a FileModel from a Map (from shared_preferences)
  factory FileModel.fromJson(Map<String, dynamic> json) {
    return FileModel(
      name: json['name'],
      type: FileType.values.firstWhere(
        (e) => e.toString().split('.').last == json['type'],
        orElse: () => FileType.other, // Default if type string is not found
      ),
      path: json['path'],
      parentFolder: json['parentFolder'],
      extension: json['extension'],
      x: json['x'] as double?,
      y: json['y'] as double?,
      z: json['z'] as double?,
      rotation:
          json['rotation']
              as double?, // ROTATION FIX: Load rotation from storage
      thumbnailDataUrl:
          json['thumbnailDataUrl'] as String?, // Load thumbnail data
      height: json['height'] as double?, // Load metadata fields
      fileSize: json['fileSize'] as int?,
      lastModified: json['lastModified'] as int?,
      created: json['created'] as int?,
      mimeType: json['mimeType'] as String?,
      isReadable: json['isReadable'] as bool?,
      isWritable: json['isWritable'] as bool?,
      // Load EXIF metadata fields
      cameraMake: json['cameraMake'] as String?,
      cameraModel: json['cameraModel'] as String?,
      dateTimeOriginal: json['dateTimeOriginal'] as String?,
      imageWidth: json['imageWidth'] as int?,
      imageHeight: json['imageHeight'] as int?,
      aperture: json['aperture'] as String?,
      shutterSpeed: json['shutterSpeed'] as String?,
      iso: json['iso'] as String?,
      focalLength: json['focalLength'] as String?,
      flash: json['flash'] as String?,
      whiteBalance: json['whiteBalance'] as String?,
      orientation: json['orientation'] as int?,
      gpsLatitude: json['gpsLatitude'] as double?,
      gpsLongitude: json['gpsLongitude'] as double?,
      gpsAltitude: json['gpsAltitude'] as double?,
      lensModel: json['lensModel'] as String?,
      exposureTime: json['exposureTime'] as String?,
      fNumber: json['fNumber'] as String?,
      photographicSensitivity: json['photographicSensitivity'] as String?,
      digitalZoomRatio: json['digitalZoomRatio'] as String?,
      sceneCaptureType: json['sceneCaptureType'] as String?,
      subjectDistance: json['subjectDistance'] as String?,
      customDisplayName:
          json['customDisplayName'] as String?, // Load custom display name
      furnitureId:
          json['furnitureId'] as String?, // Load furniture seating data
      furnitureSlotIndex: json['furnitureSlotIndex'] as int?,
      isDemo: json['isDemo'] as bool? ?? false, // Load demo flag, default false
    );
  }
}
