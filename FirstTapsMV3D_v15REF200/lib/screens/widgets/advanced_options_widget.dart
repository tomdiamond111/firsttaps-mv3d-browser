import 'package:flutter/material.dart';
import '../widgets/white_divider_widget.dart';
import '../../widgets/sms_3d_settings_widget.dart';

class AdvancedOptionsWidget extends StatelessWidget {
  // State variables
  final bool sortFileObjects;
  final bool showFileInfo;
  final bool useFaceTextures;
  final bool canUndoObjectDeletion;

  // Callback functions
  final ValueChanged<bool> onSortFileObjectsChanged;
  final ValueChanged<bool> onShowFileInfoChanged;
  final ValueChanged<bool> onUseFaceTexturesChanged;
  final VoidCallback onShowDeleteOptions;
  final VoidCallback onShowUndoConfirmation;
  final VoidCallback onShowStackingCriteria;

  const AdvancedOptionsWidget({
    super.key,
    required this.sortFileObjects,
    required this.showFileInfo,
    required this.useFaceTextures,
    required this.canUndoObjectDeletion,
    required this.onSortFileObjectsChanged,
    required this.onShowFileInfoChanged,
    required this.onUseFaceTexturesChanged,
    required this.onShowDeleteOptions,
    required this.onShowUndoConfirmation,
    required this.onShowStackingCriteria,
  });

  @override
  Widget build(BuildContext context) {
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;
    final screenHeight = MediaQuery.of(context).size.height;
    final maxHeight = isLandscape ? screenHeight * 0.85 : screenHeight * 0.75;

    return StatefulBuilder(
      builder: (BuildContext context, StateSetter setModalState) {
        return SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: maxHeight, minHeight: 200),
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header
                    Row(
                      children: [
                        const Icon(Icons.settings, color: Colors.white),
                        const SizedBox(width: 8),
                        const Text(
                          'Advanced Options',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close, color: Colors.white),
                        ),
                      ],
                    ),
                    const WhiteDividerWidget(),

                    // Sort File Objects toggle
                    ListTile(
                      leading: Icon(
                        Icons.sort,
                        color: sortFileObjects ? Colors.green : Colors.white,
                      ),
                      title: const Text(
                        'Sort File Objects',
                        style: TextStyle(color: Colors.white),
                      ),
                      subtitle: const Text(
                        'Automatically arrange files in organized groups',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      trailing: Switch(
                        value: sortFileObjects,
                        activeColor: Colors.green,
                        activeTrackColor: Colors.green.withOpacity(0.5),
                        inactiveThumbColor: Colors.grey[400],
                        inactiveTrackColor: Colors.grey[700],
                        onChanged: (value) {
                          setModalState(() {
                            // Update local state in modal
                          });
                          onSortFileObjectsChanged(value);
                        },
                      ),
                    ),

                    const WhiteDividerWidget(),

                    // Show File Info toggle
                    ListTile(
                      leading: Icon(
                        Icons.info_outline,
                        color: showFileInfo ? Colors.blue : Colors.white,
                      ),
                      title: const Text(
                        'Show File Info',
                        style: TextStyle(color: Colors.white),
                      ),
                      subtitle: const Text(
                        'Display file details and metadata on objects',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      trailing: Switch(
                        value: showFileInfo,
                        activeColor: Colors.blue,
                        activeTrackColor: Colors.blue.withOpacity(0.5),
                        inactiveThumbColor: Colors.grey[400],
                        inactiveTrackColor: Colors.grey[700],
                        onChanged: (value) {
                          setModalState(() {
                            // Update local state in modal
                          });
                          onShowFileInfoChanged(value);
                        },
                      ),
                    ),

                    const WhiteDividerWidget(),

                    // Use Face Textures toggle
                    ListTile(
                      leading: Icon(
                        Icons.texture,
                        color: useFaceTextures ? Colors.orange : Colors.white,
                      ),
                      title: const Text(
                        'Use Face Textures',
                        style: TextStyle(color: Colors.white),
                      ),
                      subtitle: const Text(
                        'Apply custom textures to contact avatars',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      trailing: Switch(
                        value: useFaceTextures,
                        activeColor: Colors.orange,
                        activeTrackColor: Colors.orange.withOpacity(0.5),
                        inactiveThumbColor: Colors.grey[400],
                        inactiveTrackColor: Colors.grey[700],
                        onChanged: (value) {
                          setModalState(() {
                            // Update local state in modal
                          });
                          onUseFaceTexturesChanged(value);
                        },
                      ),
                    ),

                    const WhiteDividerWidget(),

                    // Delete All Objects
                    ListTile(
                      leading: const Icon(
                        Icons.delete_forever,
                        color: Colors.white,
                      ),
                      title: const Text(
                        'Delete All Objects',
                        style: TextStyle(color: Colors.white),
                      ),
                      subtitle: const Text(
                        'Remove all objects from current world',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      trailing: const Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: Colors.white,
                      ),
                      onTap: () {
                        Navigator.pop(context);
                        onShowDeleteOptions();
                      },
                    ),

                    const WhiteDividerWidget(),

                    // Undo Recent Deletion
                    ListTile(
                      enabled: canUndoObjectDeletion,
                      leading: Icon(
                        Icons.undo,
                        color: canUndoObjectDeletion
                            ? Colors.white
                            : Colors.grey,
                      ),
                      title: Text(
                        'Undo Recent Deletion of All Objects',
                        style: TextStyle(
                          color: canUndoObjectDeletion
                              ? Colors.white
                              : Colors.grey,
                        ),
                      ),
                      subtitle: Text(
                        'Restore all recently deleted objects from world',
                        style: TextStyle(
                          color: canUndoObjectDeletion
                              ? Colors.white70
                              : Colors.grey,
                          fontSize: 12,
                        ),
                      ),
                      trailing: Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: canUndoObjectDeletion
                            ? Colors.white
                            : Colors.grey,
                      ),
                      onTap: canUndoObjectDeletion
                          ? () {
                              Navigator.pop(context);
                              onShowUndoConfirmation();
                            }
                          : null,
                    ),

                    const WhiteDividerWidget(),

                    // Object Stacking Criteria
                    ListTile(
                      leading: const Icon(Icons.layers, color: Colors.white),
                      title: const Text(
                        'Object Stacking Criteria',
                        style: TextStyle(color: Colors.white),
                      ),
                      subtitle: const Text(
                        'Configure how objects are grouped and stacked',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      trailing: const Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: Colors.white,
                      ),
                      onTap: () {
                        Navigator.pop(context);
                        onShowStackingCriteria();
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
