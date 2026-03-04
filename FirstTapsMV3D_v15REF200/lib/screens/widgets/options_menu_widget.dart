import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../constants/app_text_styles.dart';
import '../widgets/white_divider_widget.dart';
import '../../services/object_deletion_state_service.dart';
import '../../helpers/app_share_helper.dart';
import '../../widgets/music_preferences_dialog.dart';
import '../../widgets/welcome_instructions_dialog.dart';
import 'advanced_options_widget.dart';

class OptionsMenuWidget extends StatelessWidget {
  // WebViewController for JavaScript communication
  final WebViewController? webViewController;

  // State variables
  final bool hasDeletedObjects;
  final bool hasRecentMoves;
  final bool sortFileObjects;
  final bool showFileInfo;
  final bool useFaceTextures;
  final String currentWorldType;
  final bool canUndoObjectDeletion;
  final bool hasUndoObjectDeleteCallback;

  // Callback functions
  final VoidCallback onUndoObjectDelete;
  final VoidCallback onUndoRecentMove;
  final ValueChanged<bool> onSortFileObjectsChanged;
  final ValueChanged<bool> onShowFileInfoChanged;
  final ValueChanged<bool> onUseFaceTexturesChanged;
  final VoidCallback onShowWorldSwitchDialog;
  final VoidCallback onShowUndoConfirmationDialog;
  final VoidCallback onShowAdvancedOptionsDialog;
  final VoidCallback onShowPremiumStore;
  final VoidCallback onShareWithFriend;
  final VoidCallback onShowDeleteOptions;
  final VoidCallback onShowStackingCriteria;
  final VoidCallback onShow3DMessagingSettings;
  final VoidCallback? onShowCreatePath;
  final VoidCallback? onShowCreateFurniture;
  final VoidCallback? onShowFurnitureManager;
  final VoidCallback? onImportFurniture;

  // Utility functions
  final String Function(String) getWorldDisplayName;

  const OptionsMenuWidget({
    super.key,
    this.webViewController,
    required this.hasDeletedObjects,
    required this.hasRecentMoves,
    required this.sortFileObjects,
    required this.showFileInfo,
    required this.useFaceTextures,
    required this.currentWorldType,
    required this.canUndoObjectDeletion,
    required this.hasUndoObjectDeleteCallback,
    required this.onUndoObjectDelete,
    required this.onUndoRecentMove,
    required this.onSortFileObjectsChanged,
    required this.onShowFileInfoChanged,
    required this.onUseFaceTexturesChanged,
    required this.onShowWorldSwitchDialog,
    required this.onShowUndoConfirmationDialog,
    required this.onShowAdvancedOptionsDialog,
    required this.onShowPremiumStore,
    required this.onShareWithFriend,
    required this.onShowDeleteOptions,
    required this.onShowStackingCriteria,
    required this.onShow3DMessagingSettings,
    this.onShowCreatePath,
    this.onShowCreateFurniture,
    this.onShowFurnitureManager,
    this.onImportFurniture,
    required this.getWorldDisplayName,
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
                        const Icon(Icons.more_vert, color: Colors.white),
                        const SizedBox(width: 8),
                        const Text(
                          'Options',
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

                    // 1. About & Instructions
                    ListTile(
                      leading: const Icon(
                        Icons.info_outline,
                        color: Colors.blue,
                      ),
                      title: const Text(
                        'About & Instructions',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      subtitle: const Text(
                        'App overview and tutorial',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      trailing: const Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: Colors.white,
                      ),
                      onTap: () {
                        Navigator.pop(context);
                        WelcomeInstructionsDialog.show(context);
                      },
                    ),

                    const WhiteDividerWidget(),

                    // 2. Premium Content Store
                    ListTile(
                      leading: const Icon(Icons.stars, color: Colors.amber),
                      title: const Text(
                        'Premium Content Store',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      trailing: const Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: Colors.white,
                      ),
                      onTap: () {
                        Navigator.pop(context);
                        onShowPremiumStore();
                      },
                    ),

                    const WhiteDividerWidget(),

                    // 3. Switch World
                    ListTile(
                      leading: const Icon(Icons.public, color: Colors.white),
                      title: Text(
                        'Switch World: ${getWorldDisplayName(currentWorldType)}',
                        style: const TextStyle(color: Colors.white),
                      ),
                      trailing: const Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: Colors.white,
                      ),
                      onTap: () {
                        Navigator.pop(context);
                        onShowWorldSwitchDialog();
                      },
                    ),
                    const WhiteDividerWidget(),

                    // 2.5. Music Categories
                    ListTile(
                      leading: const Icon(
                        Icons.music_note,
                        color: Colors.purple,
                      ),
                      title: const Text(
                        'Music Categories',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      subtitle: const Text(
                        'Select genres for dynamic content',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      trailing: const Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: Colors.white,
                      ),
                      onTap: () async {
                        Navigator.pop(context);
                        await MusicPreferencesDialog.show(
                          context,
                          webViewController: webViewController,
                        );
                      },
                    ),
                    const WhiteDividerWidget(),

                    // 3. 3D Message Balloons - COMMENTED OUT (SMS removed from app, may add back later)
                    // ListTile(
                    //   leading: const Icon(
                    //     Icons.chat_bubble_outline,
                    //     color: Colors.purple,
                    //   ),
                    //   title: const Text(
                    //     '3D Message Balloons',
                    //     style: TextStyle(
                    //       color: Colors.white,
                    //       fontWeight: FontWeight.w500,
                    //     ),
                    //   ),
                    //   subtitle: const Text(
                    //     'Customize message display and animations',
                    //     style: TextStyle(color: Colors.white70, fontSize: 12),
                    //   ),
                    //   trailing: const Icon(
                    //     Icons.arrow_forward_ios,
                    //     size: 16,
                    //     color: Colors.white,
                    //   ),
                    //   onTap: () {
                    //     Navigator.pop(context);
                    //     onShow3DMessagingSettings();
                    //   },
                    // ),
                    const WhiteDividerWidget(),

                    // 4. Share with Friend
                    ListTile(
                      leading: const Icon(Icons.share, color: Colors.cyan),
                      title: const Text(
                        'Share with Friend',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      trailing: const Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: Colors.white,
                      ),
                      onTap: () async {
                        Navigator.pop(context);
                        // Show sharing dialog
                        final result = await AppShareHelper.shareApp();
                        if (result) {
                          // Show success message
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Share completed! Thanks for spreading the word! 🎉',
                              ),
                              backgroundColor: Colors.green,
                              duration: Duration(seconds: 3),
                            ),
                          );
                        }
                        onShareWithFriend();
                      },
                    ),

                    const WhiteDividerWidget(),

                    // 4.5. Create Path (Music/Video Playlist) - DISABLED (not using paths currently)
                    // if (onShowCreatePath != null)
                    //   ListTile(
                    //     leading: const Icon(Icons.route, color: Colors.orange),
                    //     title: const Text(
                    //       'Create Path',
                    //       style: TextStyle(
                    //         color: Colors.white,
                    //         fontWeight: FontWeight.w500,
                    //       ),
                    //     ),
                    //     subtitle: const Text(
                    //       'Create playlist path for music/videos',
                    //       style: TextStyle(color: Colors.white70, fontSize: 12),
                    //     ),
                    //     trailing: const Icon(
                    //       Icons.arrow_forward_ios,
                    //       size: 16,
                    //       color: Colors.white,
                    //     ),
                    //     onTap: () {
                    //       Navigator.pop(context);
                    //       onShowCreatePath!();
                    //     },
                    //   ),

                    // if (onShowCreatePath != null) const WhiteDividerWidget(),

                    // 4.6. Add Furniture
                    if (onShowCreateFurniture != null)
                      ListTile(
                        leading: const Icon(Icons.weekend, color: Colors.blue),
                        title: const Text(
                          'Add Furniture',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        subtitle: const Text(
                          'Add furniture to organize media',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        trailing: const Icon(
                          Icons.arrow_forward_ios,
                          size: 16,
                          color: Colors.white,
                        ),
                        onTap: () {
                          Navigator.pop(context);
                          onShowCreateFurniture!();
                        },
                      ),

                    if (onShowCreateFurniture != null)
                      const WhiteDividerWidget(),

                    // 4.7. Furniture Manager
                    if (onShowFurnitureManager != null)
                      ListTile(
                        leading: const Icon(
                          Icons.view_list,
                          color: Colors.green,
                        ),
                        title: const Text(
                          'Furniture Manager',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        subtitle: const Text(
                          'Manage furniture and objects (2D view)',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        trailing: const Icon(
                          Icons.arrow_forward_ios,
                          size: 16,
                          color: Colors.white,
                        ),
                        onTap: () {
                          Navigator.pop(context);
                          onShowFurnitureManager!();
                        },
                      ),

                    if (onShowFurnitureManager != null)
                      const WhiteDividerWidget(),

                    // 4.8. Import Furniture
                    if (onImportFurniture != null)
                      ListTile(
                        leading: const Icon(Icons.download, color: Colors.blue),
                        title: const Text(
                          'Import Furniture',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        subtitle: const Text(
                          'Import shared furniture using a code',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        trailing: const Icon(
                          Icons.arrow_forward_ios,
                          size: 16,
                          color: Colors.white,
                        ),
                        onTap: () {
                          Navigator.pop(context);
                          onImportFurniture!();
                        },
                      ),

                    if (onImportFurniture != null) const WhiteDividerWidget(),

                    // 5. Advanced Options
                    ListTile(
                      leading: const Icon(Icons.settings, color: Colors.white),
                      title: const Text(
                        'Advanced Options',
                        style: TextStyle(color: Colors.white),
                      ),
                      trailing: const Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: Colors.white,
                      ),
                      onTap: () {
                        Navigator.pop(context);
                        _showAdvancedOptionsModal(context);
                      },
                    ),

                    // Conditional options below main menu
                    if (hasDeletedObjects && hasUndoObjectDeleteCallback) ...[
                      const WhiteDividerWidget(),
                      ListTile(
                        leading: const Icon(Icons.undo, color: Colors.white),
                        title: const Text(
                          'Undo Object Delete',
                          style: TextStyle(color: Colors.white),
                        ),
                        onTap: () {
                          Navigator.pop(context);
                          onUndoObjectDelete();
                        },
                      ),
                    ],

                    if (hasRecentMoves) ...[
                      const WhiteDividerWidget(),
                      ListTile(
                        leading: const Icon(Icons.undo, color: Colors.white),
                        title: const Text(
                          'Undo Recent Move',
                          style: TextStyle(color: Colors.white),
                        ),
                        onTap: () {
                          Navigator.pop(context);
                          onUndoRecentMove();
                        },
                      ),
                    ],

                    if (canUndoObjectDeletion) ...[
                      const WhiteDividerWidget(),
                      ListTile(
                        leading: const Icon(Icons.undo, color: Colors.white),
                        title: const Text(
                          'Undo recent deletion of objects or files',
                          style: TextStyle(color: Colors.white),
                        ),
                        onTap: () {
                          Navigator.pop(context);
                          onShowUndoConfirmationDialog();
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  /// Show the Advanced Options modal
  void _showAdvancedOptionsModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.black87,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => AdvancedOptionsWidget(
        sortFileObjects: sortFileObjects,
        showFileInfo: showFileInfo,
        useFaceTextures: useFaceTextures,
        canUndoObjectDeletion: canUndoObjectDeletion,
        onSortFileObjectsChanged: onSortFileObjectsChanged,
        onShowFileInfoChanged: onShowFileInfoChanged,
        onUseFaceTexturesChanged: onUseFaceTexturesChanged,
        onShowDeleteOptions: onShowDeleteOptions,
        onShowUndoConfirmation: onShowUndoConfirmationDialog,
        onShowStackingCriteria: onShowStackingCriteria,
      ),
    );
  }
}
