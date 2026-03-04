import 'package:flutter/material.dart';
import '../services/state_manager_service.dart';
import '../services/object_manager_service.dart';
import '../models/file_model.dart';

/// Widget that provides controls for arranging and sorting objects
class ObjectArrangementControls extends StatelessWidget {
  final StateManagerService stateManager;
  final VoidCallback? onArrangementChanged;

  const ObjectArrangementControls({
    super.key,
    required this.stateManager,
    this.onArrangementChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Object Arrangement',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _buildSortingSection(),
            const SizedBox(height: 16),
            _buildArrangementSection(),
            const SizedBox(height: 16),
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildSortingSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Sort By:', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: SortCriteria.values.map((criteria) {
            return FilterChip(
              label: Text(_getSortCriteriaDisplayName(criteria)),
              selected: stateManager.currentSortCriteria == criteria,
              onSelected: (selected) {
                if (selected) {
                  stateManager.updateSortCriteria(criteria);
                  onArrangementChanged?.call();
                }
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildArrangementSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Arrange In:',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: ArrangementPattern.values.map((pattern) {
            return FilterChip(
              label: Text(_getArrangementPatternDisplayName(pattern)),
              selected: stateManager.currentArrangement == pattern,
              onSelected: (selected) {
                if (selected) {
                  stateManager.updateArrangement(pattern);
                  onArrangementChanged?.call();
                }
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        ElevatedButton.icon(
          onPressed: stateManager.canUndo
              ? () {
                  stateManager.undo();
                  onArrangementChanged?.call();
                }
              : null,
          icon: const Icon(Icons.undo),
          label: const Text('Undo'),
        ),
        const SizedBox(width: 8),
        ElevatedButton.icon(
          onPressed: () {
            _showArrangementPreview();
          },
          icon: const Icon(Icons.preview),
          label: const Text('Preview'),
        ),
      ],
    );
  }

  String _getSortCriteriaDisplayName(SortCriteria criteria) {
    switch (criteria) {
      case SortCriteria.name:
        return 'Name';
      case SortCriteria.type:
        return 'Type';
      case SortCriteria.extension:
        return 'Extension';
      case SortCriteria.size:
        return 'Size';
    }
  }

  String _getArrangementPatternDisplayName(ArrangementPattern pattern) {
    switch (pattern) {
      case ArrangementPattern.grid:
        return 'Grid';
      case ArrangementPattern.circle:
        return 'Circle';
      case ArrangementPattern.spiral:
        return 'Spiral';
      case ArrangementPattern.line:
        return 'Line';
    }
  }

  void _showArrangementPreview() {
    // This could show a dialog with a preview of how objects would be arranged
    // For now, it's a placeholder
  }
}

/// Widget that shows statistics about the current files
class FileStatisticsWidget extends StatelessWidget {
  final StateManagerService stateManager;

  const FileStatisticsWidget({super.key, required this.stateManager});

  @override
  Widget build(BuildContext context) {
    final stats = stateManager.getFileStatistics();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'File Statistics',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Text('Total Files: ${stats['totalCount']}'),
            const SizedBox(height: 8),
            _buildTypeStatistics(stats),
            const SizedBox(height: 8),
            _buildExtensionStatistics(stats),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeStatistics(Map<String, dynamic> stats) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('By Type:', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        ...FileType.values.map((type) {
          final count = stats[type.toString()] ?? 0;
          if (count > 0) {
            return Padding(
              padding: const EdgeInsets.only(left: 16.0),
              child: Text('${_getFileTypeDisplayName(type)}: $count'),
            );
          }
          return const SizedBox.shrink();
        }),
      ],
    );
  }

  Widget _buildExtensionStatistics(Map<String, dynamic> stats) {
    final extensionCounts = stats['extensionCounts'] as Map<String, int>? ?? {};

    if (extensionCounts.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'By Extension:',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        ...extensionCounts.entries.map((entry) {
          return Padding(
            padding: const EdgeInsets.only(left: 16.0),
            child: Text('${entry.key}: ${entry.value}'),
          );
        }),
      ],
    );
  }

  String _getFileTypeDisplayName(FileType type) {
    switch (type) {
      case FileType.pdf:
        return 'PDF';
      case FileType.word:
        return 'Word';
      case FileType.ppt:
        return 'PowerPoint';
      case FileType.mp3:
        return 'Audio';
      case FileType.mp4:
        return 'Video (MP4)';
      case FileType.image:
        return 'Image';
      case FileType.video:
        return 'Video';
      case FileType.app:
        return 'App';
      case FileType.other:
        return 'Other';
    }
  }
}

/// Widget for display options that affect object visualization
class ObjectDisplayControls extends StatelessWidget {
  final StateManagerService stateManager;
  final Function(Map<String, bool>)? onDisplayOptionsChanged;

  const ObjectDisplayControls({
    super.key,
    required this.stateManager,
    this.onDisplayOptionsChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Display Options',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            SwitchListTile(
              title: const Text('Show File Info'),
              subtitle: const Text('Display filename labels'),
              value: stateManager.showFileInfo,
              onChanged: (value) {
                stateManager.updateDisplayOptions(showFileInfo: value);
                onDisplayOptionsChanged?.call(
                  stateManager.getDisplayOptionsForJS(),
                );
              },
            ),
            SwitchListTile(
              title: const Text('Show Image and Video Previews'),
              subtitle: const Text('Display images and videos on object faces'),
              value: stateManager.useFaceTextures,
              onChanged: (value) {
                stateManager.updateDisplayOptions(useFaceTextures: value);
                onDisplayOptionsChanged?.call(
                  stateManager.getDisplayOptionsForJS(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Widget that shows currently selected object information
class SelectedObjectInfo extends StatelessWidget {
  final StateManagerService stateManager;
  final VoidCallback? onClearSelection;

  const SelectedObjectInfo({
    super.key,
    required this.stateManager,
    this.onClearSelection,
  });

  @override
  Widget build(BuildContext context) {
    final selectedFile = stateManager.selectedFile;

    if (selectedFile == null) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Selected Object',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  onPressed: onClearSelection,
                  icon: const Icon(Icons.close),
                  tooltip: 'Clear Selection',
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildFileInfo(selectedFile),
            const SizedBox(height: 12),
            _buildPositionInfo(selectedFile),
          ],
        ),
      ),
    );
  }

  Widget _buildFileInfo(FileModel file) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Name: ${file.name}',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        Text('Type: ${file.type.toString().split('.').last}'),
        const SizedBox(height: 4),
        Text('Extension: ${file.extension}'),
        if (file.parentFolder != null) ...[
          const SizedBox(height: 4),
          Text('Folder: ${file.parentFolder}'),
        ],
      ],
    );
  }

  Widget _buildPositionInfo(FileModel file) {
    if (file.x == null || file.y == null || file.z == null) {
      return const Text('Position: Not set');
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Position:', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text('X: ${file.x!.toStringAsFixed(2)}'),
        Text('Y: ${file.y!.toStringAsFixed(2)}'),
        Text('Z: ${file.z!.toStringAsFixed(2)}'),
      ],
    );
  }
}
