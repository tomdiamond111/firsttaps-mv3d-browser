import 'dart:math' as math;
import '../models/file_model.dart';

/// Service responsible for managing object operations like movement, sorting, and positioning
class ObjectManagerService {
  static const double _defaultObjectSpacing = 3.0;

  /// Calculates the optimal position for a new object based on existing objects
  /// Ensures no floating objects: stacks on top of existing or places on XZ plane
  static Map<String, double> calculateOptimalPosition(
    List<FileModel> existingFiles,
    FileModel newFile,
  ) {
    // Always place new files so their base sits on the XZ plane (y = -height/2 if origin is center)
    double y = 0.0;
    // If the FileModel has a height property, use it. Otherwise, default to 0.
    final double objectHeight = newFile.height ?? 0.0;
    // If the 3D model's origin is at the center, set y so the base is at 0
    y = -objectHeight / 2.0;

    // Find the best position using a simple grid-based approach
    final usedPositions = existingFiles
        .map((f) => {'x': f.x ?? 0.0, 'z': f.z ?? 0.0})
        .toSet();

    if (existingFiles.isEmpty) {
      return {'x': 0.0, 'y': y, 'z': 0.0};
    }

    // Try positions in a spiral pattern
    for (int radius = 1; radius <= 10; radius++) {
      for (int angle = 0; angle < 360; angle += 45) {
        final double x =
            radius *
            _defaultObjectSpacing *
            (angle == 0 ? 1 : (angle == 180 ? -1 : 0));
        final double z =
            radius *
            _defaultObjectSpacing *
            (angle == 90 ? 1 : (angle == 270 ? -1 : 0));
        final candidate = {'x': x, 'y': y, 'z': z};
        if (!usedPositions.any((pos) => (pos['x']! - x).abs() < _defaultObjectSpacing * 0.8 && (pos['z']! - z).abs() < _defaultObjectSpacing * 0.8)) {
          return candidate;
        }
      }
    }

    // Fallback to a random position if all else fails
    final double fallbackX = (existingFiles.length * _defaultObjectSpacing) % 20.0 - 10.0;
    final double fallbackZ = (existingFiles.length * _defaultObjectSpacing * 0.7) % 20.0 - 10.0;
    return {
      'x': fallbackX,
      'y': y,
      'z': fallbackZ,
    };
  }

  /// Checks if a position is already occupied
  static bool _isPositionOccupied(
    Map<String, double> candidate,
    Set<Map<String, double>> usedPositions,
  ) {
    const double tolerance = _defaultObjectSpacing * 0.8;
    return usedPositions.any(
      (pos) =>
          (pos['x']! - candidate['x']!).abs() < tolerance &&
          (pos['z']! - candidate['z']!).abs() < tolerance,
    );
  }

  /// Sorts files by different criteria
  static List<FileModel> sortFiles(
    List<FileModel> files,
    SortCriteria criteria,
  ) {
    final sortedFiles = List<FileModel>.from(files);
    switch (criteria) {
      case SortCriteria.name:
        sortedFiles.sort((a, b) => a.name.compareTo(b.name));
        break;
      case SortCriteria.type:
        sortedFiles.sort((a, b) => a.type.index.compareTo(b.type.index));
        break;
      case SortCriteria.extension:
        sortedFiles.sort((a, b) => a.extension.compareTo(b.extension));
        break;
      case SortCriteria.size:
        // For now, we don't have size info, so sort by name as fallback
        sortedFiles.sort((a, b) => a.name.compareTo(b.name));
        break;
    }
    return sortedFiles;
  }

  /// Arranges files in different patterns
  static List<FileModel> arrangeFiles(
    List<FileModel> files,
    ArrangementPattern pattern,
  ) {
    final arrangedFiles = <FileModel>[];
    switch (pattern) {
      case ArrangementPattern.grid:
        arrangedFiles.addAll(_arrangeInGrid(files));
        break;
      case ArrangementPattern.circle:
        arrangedFiles.addAll(_arrangeInCircle(files));
        break;
      case ArrangementPattern.spiral:
        arrangedFiles.addAll(_arrangeInSpiral(files));
        break;
      case ArrangementPattern.line:
        arrangedFiles.addAll(_arrangeInLine(files));
        break;
    }
    return arrangedFiles;
  }

  /// Arranges files in a grid pattern
  static List<FileModel> _arrangeInGrid(List<FileModel> files) {
    final arrangedFiles = <FileModel>[];
    final int gridSize = math.sqrt(files.length.toDouble()).ceil();
    for (int i = 0; i < files.length; i++) {
      final int row = i ~/ gridSize;
      final int col = i % gridSize;
      final double x = (col - gridSize / 2) * _defaultObjectSpacing;
      final double z = (row - gridSize / 2) * _defaultObjectSpacing;
      arrangedFiles.add(_updateFilePosition(files[i], x, 0.0, z));
    }
    return arrangedFiles;
  }

  /// Arranges files in a circle pattern
  static List<FileModel> _arrangeInCircle(List<FileModel> files) {
    final arrangedFiles = <FileModel>[];
    final double radius = files.length * _defaultObjectSpacing / (2 * math.pi);
    for (int i = 0; i < files.length; i++) {
      final double angle = (2 * math.pi * i) / files.length;
      final double x = radius * math.cos(angle);
      final double z = radius * math.sin(angle);
      arrangedFiles.add(_updateFilePosition(files[i], x, 0.0, z));
    }
    return arrangedFiles;
  }

  /// Arranges files in a spiral pattern
  static List<FileModel> _arrangeInSpiral(List<FileModel> files) {
    final arrangedFiles = <FileModel>[];
    for (int i = 0; i < files.length; i++) {
      final double angle = i * 0.5;
      final double radius = i * 0.5 * _defaultObjectSpacing;
      final double x = radius * math.cos(angle);
      final double z = radius * math.sin(angle);
      arrangedFiles.add(_updateFilePosition(files[i], x, 0.0, z));
    }
    return arrangedFiles;
  }

  /// Arranges files in a line pattern
  static List<FileModel> _arrangeInLine(List<FileModel> files) {
    final arrangedFiles = <FileModel>[];
    for (int i = 0; i < files.length; i++) {
      final double x = (i - files.length / 2) * _defaultObjectSpacing;
      arrangedFiles.add(_updateFilePosition(files[i], x, 0.0, 0.0));
    }
    return arrangedFiles;
  }

  /// Creates a new FileModel with updated position
  static FileModel _updateFilePosition(
    FileModel file,
    double x,
    double y,
    double z,
  ) {
    return FileModel(
      name: file.name,
      type: file.type,
      path: file.path,
      parentFolder: file.parentFolder,
      extension: file.extension,
      x: x,
      y: y,
      z: z,
      thumbnailDataUrl: file.thumbnailDataUrl,
    );
  }

  /// Validates if a position is valid (not overlapping, within bounds)
  static bool isValidPosition(
    double x,
    double y,
    double z,
    List<FileModel> existingFiles,
  ) {
    const double minDistance = _defaultObjectSpacing * 0.8;
    const double maxDistance = 50.0; // Maximum distance from origin
    // Check if within bounds
    if (x.abs() > maxDistance || z.abs() > maxDistance) {
      return false;
    }
    // Check if too close to existing objects
    for (final file in existingFiles) {
      if (file.x != null && file.z != null) {
        final double distance = math.sqrt(
          (x - file.x!) * (x - file.x!) + (z - file.z!) * (z - file.z!),
        );
        if (distance < minDistance) {
          return false;
        }
      }
    }
    return true;
  }
}

enum SortCriteria { name, type, extension, size }
enum ArrangementPattern { grid, circle, spiral, line }
