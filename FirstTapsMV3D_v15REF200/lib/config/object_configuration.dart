import '../models/file_model.dart';

/// Configuration class for object behaviors and appearance
/// This makes it easy to modify how objects are moved, sorted, and displayed
/// without changing core logic
class ObjectConfiguration {
  // Movement settings
  static const double defaultObjectSpacing = 3.0;
  static const double minObjectDistance = 2.0;
  static const double maxObjectDistance = 50.0;
  static const double snapToGridTolerance = 0.5;
  static const bool enableSnapToGrid = true;

  // Visual settings
  static const double defaultObjectHeight = 2.0;
  static const double defaultObjectWidth = 1.5;
  static const double defaultObjectDepth = 1.5;
  static const double labelOffsetY = 1.0;
  static const double previewOffsetX = 3.0;

  // Interaction settings
  static const int longPressThreshold = 500; // milliseconds
  static const int doubleTapThreshold = 300; // milliseconds
  static const double dragThreshold = 10.0; // pixels

  // Animation settings
  static const int animationDuration = 300; // milliseconds
  static const bool enableAnimations = true;
  static const double easingFactor = 0.1;

  // Arrangement settings
  static const int maxGridSize = 20;
  static const double circleRadiusMultiplier = 0.5;
  static const double spiralStepSize = 0.5;
  static const double lineSpacing = 2.0;

  /// Gets the color for a file type
  static int getColorForFileType(FileType fileType) {
    switch (fileType) {
      case FileType.pdf:
        return 0xff4444; // Red
      case FileType.word:
        return 0x4444ff; // Blue
      case FileType.ppt:
        return 0xff8800; // Orange
      case FileType.mp3:
        return 0x44ff44; // Green
      case FileType.mp4:
        return 0x8844ff; // Purple
      case FileType.image:
        return 0xffff44; // Yellow
      case FileType.video:
        return 0x8844ff; // Purple
      case FileType.app:
        return 0x44ffff; // Cyan
      case FileType.other:
        return 0x888888; // Gray
    }
  }

  /// Gets the color for a file extension
  static int getColorForExtension(String extension) {
    final extensionColors = {
      '.pdf': 0xff4444,
      '.doc': 0x4444ff,
      '.docx': 0x4444ff,
      '.ppt': 0xff8800,
      '.pptx': 0xff8800,
      '.mp3': 0x44ff44,
      '.mp4': 0x8844ff,
      '.mov': 0x8844ff,
      '.avi': 0x8844ff,
      '.mkv': 0x8844ff,
      '.jpg': 0xffff44,
      '.jpeg': 0xffff44,
      '.png': 0xffff44,
      '.gif': 0xffff44,
      '.bmp': 0xffff44,
      '.webp': 0xffff44,
      '.tiff': 0xffff44,
      '.svg': 0xffff44,
    };

    return extensionColors[extension.toLowerCase()] ?? 0x888888;
  }

  /// Gets the dimensions for a file type
  static ObjectDimensions getDimensionsForFileType(FileType fileType) {
    switch (fileType) {
      case FileType.pdf:
        return const ObjectDimensions(width: 2.0, height: 3.0, depth: 0.3);
      case FileType.word:
        return const ObjectDimensions(width: 2.0, height: 2.5, depth: 0.3);
      case FileType.ppt:
        return const ObjectDimensions(width: 2.5, height: 2.0, depth: 0.3);
      case FileType.mp3:
        return const ObjectDimensions(
          width: 1.6,
          height: 1.5,
          depth: 1.6,
          isRound: true,
        );
      case FileType.mp4:
        return const ObjectDimensions(width: 4.5, height: 2.53, depth: 0.4);
      case FileType.image:
        return const ObjectDimensions(width: 4.0, height: 5.0, depth: 0.2);
      case FileType.video:
        return const ObjectDimensions(width: 4.5, height: 2.53, depth: 0.4);
      case FileType.app:
        return const ObjectDimensions(width: 2.0, height: 2.0, depth: 2.0);
      case FileType.other:
        return const ObjectDimensions(width: 1.5, height: 1.5, depth: 1.5);
    }
  }

  /// Gets the interaction behavior for a file type
  static InteractionBehavior getInteractionBehaviorForFileType(
    FileType fileType,
  ) {
    switch (fileType) {
      case FileType.pdf:
      case FileType.word:
      case FileType.ppt:
        return InteractionBehavior.openOnDoubleClick;
      case FileType.mp3:
      case FileType.mp4:
      case FileType.video:
        return InteractionBehavior.previewOnHover;
      case FileType.image:
        return InteractionBehavior.previewOnClick;
      case FileType.app:
        return InteractionBehavior.openOnDoubleClick;
      case FileType.other:
        return InteractionBehavior.moveOnClick;
    }
  }

  /// Gets the sorting priority for a file type (lower number = higher priority)
  static int getSortPriorityForFileType(FileType fileType) {
    switch (fileType) {
      case FileType.pdf:
        return 1;
      case FileType.word:
        return 2;
      case FileType.ppt:
        return 3;
      case FileType.image:
        return 4;
      case FileType.video:
      case FileType.mp4:
        return 5;
      case FileType.mp3:
        return 6;
      case FileType.app:
        return 7;
      case FileType.other:
        return 8;
    }
  }

  /// Checks if a file type should show thumbnail previews
  static bool shouldShowThumbnailForFileType(FileType fileType) {
    switch (fileType) {
      case FileType.image:
      case FileType.video:
      case FileType.mp4:
        return true;
      case FileType.pdf:
      case FileType.word:
      case FileType.ppt:
      case FileType.mp3:
      case FileType.app:
      case FileType.other:
        return false;
    }
  }

  /// Gets the movement constraints for a file type
  static MovementConstraints getMovementConstraintsForFileType(
    FileType fileType,
  ) {
    switch (fileType) {
      case FileType.pdf:
      case FileType.word:
      case FileType.ppt:
        return MovementConstraints.snapToGrid;
      case FileType.image:
        return MovementConstraints.freeMovement;
      case FileType.video:
      case FileType.mp4:
      case FileType.mp3:
        return MovementConstraints.constrainedMovement;
      case FileType.app:
        return MovementConstraints.snapToGrid;
      case FileType.other:
        return MovementConstraints.freeMovement;
    }
  }

  /// Gets the arrangement weight for a file type (used in auto-arrangement)
  static double getArrangementWeightForFileType(FileType fileType) {
    switch (fileType) {
      case FileType.pdf:
        return 1.0;
      case FileType.word:
        return 0.9;
      case FileType.ppt:
        return 0.8;
      case FileType.image:
        return 0.7;
      case FileType.video:
      case FileType.mp4:
        return 0.6;
      case FileType.mp3:
        return 0.5;
      case FileType.app:
        return 0.3;
      case FileType.other:
        return 0.4;
    }
  }
}

/// Represents the dimensions of a 3D object
class ObjectDimensions {
  final double width;
  final double height;
  final double depth;
  final bool isRound;

  const ObjectDimensions({
    required this.width,
    required this.height,
    required this.depth,
    this.isRound = false,
  });
}

/// Represents different interaction behaviors
enum InteractionBehavior {
  openOnDoubleClick,
  previewOnHover,
  previewOnClick,
  moveOnClick,
}

/// Represents different movement constraints
enum MovementConstraints { snapToGrid, freeMovement, constrainedMovement }

/// Extension methods for easier configuration access
extension FileModelConfiguration on FileModel {
  /// Gets the color for this file
  int get displayColor => ObjectConfiguration.getColorForFileType(type);

  /// Gets the dimensions for this file
  ObjectDimensions get dimensions =>
      ObjectConfiguration.getDimensionsForFileType(type);

  /// Gets the interaction behavior for this file
  InteractionBehavior get interactionBehavior =>
      ObjectConfiguration.getInteractionBehaviorForFileType(type);

  /// Gets the movement constraints for this file
  MovementConstraints get movementConstraints =>
      ObjectConfiguration.getMovementConstraintsForFileType(type);

  /// Gets the sort priority for this file
  int get sortPriority => ObjectConfiguration.getSortPriorityForFileType(type);

  /// Gets the arrangement weight for this file
  double get arrangementWeight =>
      ObjectConfiguration.getArrangementWeightForFileType(type);

  /// Checks if this file should show thumbnail previews
  bool get shouldShowThumbnail =>
      ObjectConfiguration.shouldShowThumbnailForFileType(type);
}
