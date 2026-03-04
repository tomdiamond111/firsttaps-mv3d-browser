import 'package:flutter/material.dart';
import '../services/state_manager_service.dart';
import '../models/file_model.dart';
import '../widgets/object_arrangement_controls.dart';

/// Demo page showing how to use the new object arrangement system
class ObjectArrangementDemo extends StatefulWidget {
  const ObjectArrangementDemo({super.key});

  @override
  _ObjectArrangementDemoState createState() => _ObjectArrangementDemoState();
}

class _ObjectArrangementDemoState extends State<ObjectArrangementDemo> {
  late StateManagerService _stateManager;

  @override
  void initState() {
    super.initState();
    _stateManager = StateManagerService();
    _createSampleFiles();
  }

  void _createSampleFiles() {
    // Create some sample files to demonstrate the arrangement system
    final sampleFiles = [
      FileModel(
        name: 'Document1.pdf',
        type: FileType.pdf,
        path: '/sample/doc1.pdf',
        extension: 'pdf',
        x: 0,
        y: 0,
        z: 0,
      ),
      FileModel(
        name: 'Presentation.pptx',
        type: FileType.ppt,
        path: '/sample/presentation.pptx',
        extension: 'pptx',
        x: 3,
        y: 0,
        z: 0,
      ),
      FileModel(
        name: 'Image.jpg',
        type: FileType.image,
        path: '/sample/image.jpg',
        extension: 'jpg',
        x: -3,
        y: 0,
        z: 0,
      ),
      FileModel(
        name: 'Video.mp4',
        type: FileType.video,
        path: '/sample/video.mp4',
        extension: 'mp4',
        x: 0,
        y: 0,
        z: 3,
      ),
      FileModel(
        name: 'Audio.mp3',
        type: FileType.mp3,
        path: '/sample/audio.mp3',
        extension: 'mp3',
        x: 0,
        y: 0,
        z: -3,
      ),
    ];

    _stateManager.updateFiles(sampleFiles);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Object Arrangement Demo'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: ListenableBuilder(
        listenable: _stateManager,
        builder: (context, child) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Object Arrangement System Demo',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                const Text(
                  'This demo shows how the new refactored system makes it easy to modify '
                  'object movement and sorting behaviors. You can change arrangements and '
                  'sorting without affecting other parts of the system.',
                  style: TextStyle(fontSize: 16),
                ),
                const SizedBox(height: 24),

                // Arrangement Controls
                ObjectArrangementControls(
                  stateManager: _stateManager,
                  onArrangementChanged: () {
                    setState(() {
                      // Trigger rebuild to show changes
                    });
                  },
                ),

                const SizedBox(height: 16),

                // Display Options
                ObjectDisplayControls(
                  stateManager: _stateManager,
                  onDisplayOptionsChanged: (options) {
                    print('Display options changed: $options');
                  },
                ),

                const SizedBox(height: 16),

                // File Statistics
                FileStatisticsWidget(stateManager: _stateManager),

                const SizedBox(height: 16),

                // Selected Object Info
                SelectedObjectInfo(
                  stateManager: _stateManager,
                  onClearSelection: () {
                    _stateManager.clearSelection();
                  },
                ),

                const SizedBox(height: 16),

                // File List Preview
                _buildFileListPreview(),

                const SizedBox(height: 16),

                // Demo Actions
                _buildDemoActions(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildFileListPreview() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Current File Arrangement',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (_stateManager.files.isEmpty)
              const Text('No files loaded')
            else
              ..._stateManager.files.map((file) => _buildFilePreviewItem(file)),
          ],
        ),
      ),
    );
  }

  Widget _buildFilePreviewItem(FileModel file) {
    final isSelected = _stateManager.selectedFile?.path == file.path;

    return Card(
      elevation: isSelected ? 4 : 1,
      color: isSelected
          ? Theme.of(context).primaryColor.withValues(alpha: 0.1)
          : null,
      child: ListTile(
        leading: Icon(
          _getIconForFileType(file.type),
          color: Color(0xFF000000 | _getColorForFileType(file.type)),
        ),
        title: Text(file.name),
        subtitle: Text(
          'Type: ${file.type.toString().split('.').last} | '
          'Position: (${file.x?.toStringAsFixed(1) ?? '?'}, '
          '${file.y?.toStringAsFixed(1) ?? '?'}, '
          '${file.z?.toStringAsFixed(1) ?? '?'})',
        ),
        trailing: file == _stateManager.selectedFile
            ? const Icon(Icons.check_circle, color: Colors.green)
            : null,
        onTap: () {
          _stateManager.selectFile(file);
        },
      ),
    );
  }

  Widget _buildDemoActions() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Demo Actions',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ElevatedButton(
                  onPressed: () => _stateManager.clearAllFiles(),
                  child: const Text('Clear All'),
                ),
                ElevatedButton(
                  onPressed: () => _createSampleFiles(),
                  child: const Text('Reset Sample'),
                ),
                ElevatedButton(
                  onPressed: () => _addRandomFile(),
                  child: const Text('Add Random File'),
                ),
                ElevatedButton(
                  onPressed: _stateManager.canUndo
                      ? () => _stateManager.undo()
                      : null,
                  child: const Text('Undo'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _addRandomFile() {
    final fileTypes = FileType.values;
    final extensions = ['pdf', 'docx', 'pptx', 'jpg', 'mp4', 'mp3', 'txt'];

    final randomType =
        fileTypes[DateTime.now().millisecondsSinceEpoch % fileTypes.length];
    final randomExtension =
        extensions[DateTime.now().millisecondsSinceEpoch % extensions.length];
    final randomName =
        'Random_${DateTime.now().millisecondsSinceEpoch}.$randomExtension';

    final newFile = FileModel(
      name: randomName,
      type: randomType,
      path: '/sample/$randomName',
      extension: randomExtension,
    );

    _stateManager.addFile(newFile);
  }

  IconData _getIconForFileType(FileType type) {
    switch (type) {
      case FileType.pdf:
        return Icons.picture_as_pdf;
      case FileType.word:
        return Icons.description;
      case FileType.ppt:
        return Icons.slideshow;
      case FileType.image:
        return Icons.image;
      case FileType.video:
      case FileType.mp4:
        return Icons.video_file;
      case FileType.mp3:
        return Icons.audio_file;
      case FileType.app:
        return Icons.apps;
      case FileType.other:
        return Icons.insert_drive_file;
    }
  }

  int _getColorForFileType(FileType type) {
    switch (type) {
      case FileType.pdf:
        return 0xff4444;
      case FileType.word:
        return 0x4444ff;
      case FileType.ppt:
        return 0xff8800;
      case FileType.image:
        return 0xffff44;
      case FileType.video:
      case FileType.mp4:
        return 0x8844ff;
      case FileType.mp3:
        return 0x44ff44;
      case FileType.app:
        return 0x44ffff;
      case FileType.other:
        return 0x888888;
    }
  }
}
