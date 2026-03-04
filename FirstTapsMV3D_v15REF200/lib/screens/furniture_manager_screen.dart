import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/three_js_interop_service.dart';
import 'widgets/white_divider_widget.dart';

/// 2D Furniture Manager Screen
/// Provides an accessible, senior-friendly interface for managing furniture and objects
/// without requiring complex 3D navigation.
class FurnitureManagerScreen extends StatefulWidget {
  final WebViewController webViewController;
  final ThreeJsInteropService threeJsInteropService;

  const FurnitureManagerScreen({
    Key? key,
    required this.webViewController,
    required this.threeJsInteropService,
  }) : super(key: key);

  @override
  State<FurnitureManagerScreen> createState() => _FurnitureManagerScreenState();
}

class _FurnitureManagerScreenState extends State<FurnitureManagerScreen> {
  List<Map<String, dynamic>> _furnitureList = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadFurniture();
  }

  /// Load all furniture from JavaScript
  Future<void> _loadFurniture() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Get furniture data from JavaScript
      final result = await widget.webViewController
          .runJavaScriptReturningResult('''
        (function() {
          if (window.app && window.app.furnitureManager) {
            const allFurniture = window.app.furnitureManager.getAllFurniture();
            const furnitureData = allFurniture.map(f => ({
              id: f.id,
              name: f.name,
              type: f.type,
              capacity: f.capacity,
              objectIds: f.objectIds || [],
              position: f.position,
              rotation: f.rotation,
              material: f.material || 'metal'
            }));
            return JSON.stringify(furnitureData);
          }
          return JSON.stringify([]);
        })();
      ''');

      if (result != null) {
        final String jsonString = result
            .toString()
            .replaceAll('"', '')
            .replaceAll('\\', '');
        // Try to parse, handling potential JSON issues
        try {
          final decoded = jsonDecode(jsonString);
          if (decoded is List) {
            setState(() {
              _furnitureList = List<Map<String, dynamic>>.from(
                decoded.map((item) => Map<String, dynamic>.from(item)),
              );
              _isLoading = false;
            });
          }
        } catch (parseError) {
          // Try alternative parsing for escaped JSON
          try {
            final decoded = jsonDecode(result.toString());
            if (decoded is String) {
              final innerDecoded = jsonDecode(decoded);
              if (innerDecoded is List) {
                setState(() {
                  _furnitureList = List<Map<String, dynamic>>.from(
                    innerDecoded.map((item) => Map<String, dynamic>.from(item)),
                  );
                  _isLoading = false;
                });
              }
            }
          } catch (e) {
            setState(() {
              _errorMessage = 'Failed to parse furniture data';
              _isLoading = false;
            });
          }
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error loading furniture: $e';
        _isLoading = false;
      });
    }
  }

  /// Get object name from ID via JavaScript
  Future<String> _getObjectName(String objectId) async {
    try {
      final result = await widget.webViewController
          .runJavaScriptReturningResult('''
        (function() {
          if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
            const obj = window.app.stateManager.fileObjects.find(o => o.userData.id === '$objectId' || o.userData.fileId === '$objectId');
            if (obj && obj.userData) {
              return obj.userData.fileName || obj.userData.name || '$objectId';
            }
          }
          return '$objectId';
        })();
      ''');
      return result?.toString().replaceAll('"', '') ?? objectId;
    } catch (e) {
      return objectId;
    }
  }

  /// Remove object from furniture slot
  Future<void> _removeObjectFromFurniture(
    String furnitureId,
    String objectId,
  ) async {
    try {
      await widget.webViewController.runJavaScript('''
        (async function() {
          if (window.app && window.app.furnitureManager) {
            await window.app.furnitureManager.removeObjectFromFurniture('$furnitureId', '$objectId');
            console.log('Object $objectId removed from furniture $furnitureId');
          }
        })();
      ''');

      // Reload furniture data
      await _loadFurniture();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Object removed from furniture'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error removing object: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Delete entire furniture piece
  Future<void> _deleteFurniture(
    String furnitureId,
    String furnitureName,
  ) async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Furniture?'),
        content: Text(
          'Are you sure you want to delete "$furnitureName"? All objects will be released back into the world.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await widget.webViewController.runJavaScript('''
          (async function() {
            if (window.app && window.app.furnitureManager) {
              await window.app.furnitureManager.deleteFurniture('$furnitureId');
              console.log('Furniture $furnitureId deleted');
            }
          })();
        ''');

        await _loadFurniture();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Furniture deleted'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error deleting furniture: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  /// Check if a specific slot is currently playing
  Future<bool> _isSlotCurrentlyPlaying(
    String furnitureId,
    int slotIndex,
  ) async {
    try {
      final result = await widget.webViewController
          .runJavaScriptReturningResult('''
        (function() {
          if (window.app && window.app.furnitureManager) {
            const furniture = window.app.furnitureManager.storageManager.getFurniture('$furnitureId');
            if (furniture && furniture.isPlaying && furniture.currentIndex === $slotIndex) {
              return 'true';
            }
          }
          return 'false';
        })();
      ''');
      return result.toString().contains('true');
    } catch (e) {
      return false;
    }
  }

  /// Handle object tap - toggle play/stop or jump to slot
  Future<void> _handleObjectTap(
    String furnitureId,
    int slotIndex,
    String objectId,
  ) async {
    try {
      // Check if this slot is currently playing
      final isPlaying = await _isSlotCurrentlyPlaying(furnitureId, slotIndex);

      if (isPlaying) {
        // Stop playback
        await widget.webViewController.runJavaScript('''
          (function() {
            if (window.app && window.app.furnitureManager) {
              window.app.furnitureManager.stopFurniturePlayback('$furnitureId');
            }
            // Close media preview if open
            if (window.mediaPreviewManager) {
              window.mediaPreviewManager.hide();
            }
          })();
        ''');

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Playback stopped'),
              duration: Duration(seconds: 1),
              backgroundColor: Colors.orange,
            ),
          );
          // Refresh to update visual indicators
          await _loadFurniture();
        }
      } else {
        // Start playback from this slot
        await widget.webViewController.runJavaScript('''
          (function() {
            if (window.app && window.app.furnitureManager) {
              window.app.furnitureManager.jumpToSlot('$furnitureId', $slotIndex);
            }
          })();
        ''');

        // Close furniture manager so user can see the media preview
        if (mounted) {
          Navigator.pop(context);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  /// Start furniture playback
  Future<void> _startPlayback(String furnitureId) async {
    try {
      await widget.webViewController.runJavaScript('''
        (function() {
          if (window.app && window.app.furnitureManager) {
            window.app.furnitureManager.startFurniturePlayback('$furnitureId');
          }
        })();
      ''');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Playback started'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error starting playback: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Share furniture
  Future<void> _shareFurniture(String furnitureId, String furnitureName) async {
    try {
      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      // Call JavaScript share function
      final result = await widget.webViewController
          .runJavaScriptReturningResult('''
        (async function() {
          if (window.app && window.app.shareManager) {
            const result = await window.app.shareManager.shareFurniture('$furnitureId');
            return JSON.stringify(result);
          }
          return JSON.stringify({ error: 'Share manager not available' });
        })();
      ''');

      if (mounted) {
        Navigator.pop(context); // Dismiss loading

        if (result != null) {
          final String jsonString = result.toString().replaceAll('\\"', '"');
          final decoded = jsonDecode(jsonString);

          if (decoded['error'] != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Share failed: \${decoded["error"]}'),
                backgroundColor: Colors.red,
              ),
            );
          } else {
            final shareUrl = decoded['url'] as String? ?? '';
            final stats = decoded['stats'] as Map<String, dynamic>? ?? {};

            // Copy to clipboard immediately
            if (shareUrl.isNotEmpty) {
              Clipboard.setData(ClipboardData(text: shareUrl));
            }

            // Show success dialog with share URL
            showDialog(
              context: context,
              builder: (context) => AlertDialog(
                title: const Row(
                  children: [
                    Icon(Icons.share, color: Colors.blue),
                    SizedBox(width: 8),
                    Text('Share Furniture'),
                  ],
                ),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Share "$furnitureName" with others!'),
                    const SizedBox(height: 16),
                    const Text(
                      'Stats:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text('  • Total Objects: ${stats["totalObjects"] ?? 0}'),
                    Text('  • YouTube Videos: ${stats["youtubeObjects"] ?? 0}'),
                    Text('  • Web Links: ${stats["webLinkObjects"] ?? 0}'),
                    if (stats['excludedLocalMedia'] != null &&
                        stats['excludedLocalMedia'] > 0)
                      Text(
                        '  • Local Media Excluded: ${stats["excludedLocalMedia"]}',
                        style: const TextStyle(color: Colors.orange),
                      ),
                    if (decoded['warning'] != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        'Note: ${decoded["warning"]}',
                        style: const TextStyle(
                          color: Colors.orange,
                          fontSize: 12,
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    // Full viewer URL with data
                    Builder(
                      builder: (context) {
                        const viewerBaseUrl =
                            'https://tomdiamond111.github.io/furniture-playlist-viewer/';
                        final fullViewerUrl = '$viewerBaseUrl#data=$shareUrl';

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: SelectableText(
                                    fullViewerUrl,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.blue[900],
                                    ),
                                    maxLines: 3,
                                  ),
                                ),
                                IconButton(
                                  icon: Icon(
                                    Icons.copy,
                                    size: 24,
                                    color: Colors.blue[700],
                                  ),
                                  onPressed: () async {
                                    try {
                                      await Clipboard.setData(
                                        ClipboardData(text: fullViewerUrl),
                                      );
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(
                                          context,
                                        ).showSnackBar(
                                          const SnackBar(
                                            content: Text(
                                              '✓ Link copied to clipboard!',
                                            ),
                                            duration: Duration(seconds: 2),
                                            backgroundColor: Colors.green,
                                          ),
                                        );
                                      }
                                    } catch (e) {
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(
                                          context,
                                        ).showSnackBar(
                                          SnackBar(
                                            content: Text('Failed to copy: $e'),
                                            backgroundColor: Colors.red,
                                          ),
                                        );
                                      }
                                    }
                                  },
                                  tooltip: 'Copy Viewer Link',
                                ),
                              ],
                            ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                      // Re-enable camera controls after dialog closes
                      widget.webViewController.runJavaScript('''
                        if (window.app && window.app.cameraControls) {
                          window.app.cameraControls.enabled = true;
                          console.log('📷 Camera controls re-enabled after share dialog');
                        }
                      ''');
                    },
                    child: const Text('Close'),
                  ),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.share),
                    label: const Text('Share'),
                    onPressed: () async {
                      try {
                        const viewerBaseUrl =
                            'https://tomdiamond111.github.io/furniture-playlist-viewer/';
                        final fullViewerUrl = '$viewerBaseUrl#data=$shareUrl';

                        await Share.share(
                          'Check out this furniture playlist from FirstTaps MV3D!\n\nFurniture: $furnitureName\n\nView it here:\n$fullViewerUrl\n\nDownload FirstTaps MV3D:\nWebsite: www.firsttaps.com\nGoogle Play: https://play.google.com/store/apps/details?id=com.firsttaps.firsttapsmv3d',
                          subject: 'FirstTaps MV3D Furniture: $furnitureName',
                        );
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Share error: $e')),
                          );
                        }
                      }
                    },
                  ),
                ],
              ),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Dismiss loading if still showing
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error sharing furniture: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Get furniture type icon
  IconData _getFurnitureIcon(String type) {
    switch (type) {
      case 'bookshelf':
        return Icons.menu_book;
      case 'riser':
        return Icons.view_week;
      case 'gallery_wall':
        return Icons.photo_library;
      case 'stage_small':
      case 'stage_large':
        return Icons.theaters;
      case 'amphitheatre':
        return Icons.stadium;
      default:
        return Icons.weekend;
    }
  }

  /// Get friendly furniture type name
  String _getFurnitureTypeName(String type) {
    switch (type) {
      case 'bookshelf':
        return 'Bookshelf';
      case 'riser':
        return 'Riser';
      case 'gallery_wall':
        return 'Gallery Wall';
      case 'stage_small':
        return 'Small Stage';
      case 'stage_large':
        return 'Large Stage';
      case 'amphitheatre':
        return 'Amphitheatre';
      default:
        return type;
    }
  }

  /// One-time cleanup: Remove duplicate slot assignments
  Future<void> _cleanupDuplicateSlots() async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clean Up Duplicates'),
        content: const Text(
          'This will scan all furniture and remove duplicate slot assignments.\n\n'
          'Each object will only be kept in its first slot.\n\n'
          'This is a one-time cleanup and cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Clean Up'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      // Call JavaScript cleanup function
      final result = await widget.webViewController
          .runJavaScriptReturningResult('''
        (function() {
          if (window.app && window.app.furnitureManager) {
            const result = window.app.furnitureManager.cleanupDuplicateSlots();
            return JSON.stringify(result);
          }
          return JSON.stringify({success: false, error: 'Furniture manager not available'});
        })();
      ''');

      if (result != null) {
        final decoded = jsonDecode(result.toString());
        final cleanupResult = jsonDecode(decoded);

        if (cleanupResult['success'] == true) {
          final duplicatesRemoved =
              cleanupResult['totalDuplicatesRemoved'] ?? 0;
          final furnitureAffected = cleanupResult['furnitureAffected'] ?? 0;

          if (!mounted) return;

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                duplicatesRemoved > 0
                    ? 'Cleanup complete: Removed $duplicatesRemoved duplicate(s) from $furnitureAffected furniture piece(s)'
                    : 'No duplicates found',
              ),
              backgroundColor: duplicatesRemoved > 0
                  ? Colors.green
                  : Colors.blue,
              duration: const Duration(seconds: 4),
            ),
          );

          // Reload furniture data to show updated counts
          await _loadFurniture();
        } else {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Cleanup failed: ${cleanupResult['error']}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error during cleanup: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Furniture Manager'),
        backgroundColor: Colors.grey[900],
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadFurniture,
            tooltip: 'Refresh',
          ),
        ],
      ),
      backgroundColor: Colors.grey[850],
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
              ),
            )
          : _errorMessage != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                  const SizedBox(height: 16),
                  Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.white),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadFurniture,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : _furnitureList.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.weekend_outlined,
                    size: 64,
                    color: Colors.grey[600],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No furniture in this world',
                    style: TextStyle(color: Colors.grey[400], fontSize: 18),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Add furniture from the Options menu',
                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _furnitureList.length,
              itemBuilder: (context, index) {
                final furniture = _furnitureList[index];
                return _buildFurnitureCard(furniture);
              },
            ),
    );
  }

  Widget _buildFurnitureCard(Map<String, dynamic> furniture) {
    final String furnitureId = furniture['id'] ?? '';
    final String name = furniture['name'] ?? 'Unnamed';
    final String type = furniture['type'] ?? '';
    final int capacity = furniture['capacity'] ?? 0;
    final List objectIds = furniture['objectIds'] ?? [];
    final int occupiedSlots = objectIds
        .where((id) => id != null && id.toString().isNotEmpty)
        .length;

    return Card(
      color: Colors.grey[800],
      margin: const EdgeInsets.only(bottom: 16),
      child: ExpansionTile(
        leading: Icon(
          _getFurnitureIcon(type),
          color: Colors.blue[300],
          size: 32,
        ),
        title: Text(
          name,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        subtitle: Text(
          '${_getFurnitureTypeName(type)} • $occupiedSlots/$capacity slots',
          style: TextStyle(color: Colors.grey[400]),
        ),
        trailing: PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, color: Colors.white),
          onSelected: (value) {
            if (value == 'delete') {
              _deleteFurniture(furnitureId, name);
            } else if (value == 'play') {
              _startPlayback(furnitureId);
            } else if (value == 'share') {
              _shareFurniture(furnitureId, name);
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'play',
              child: Row(
                children: [
                  Icon(Icons.play_arrow, color: Colors.green),
                  SizedBox(width: 8),
                  Text('Start Playback'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'share',
              child: Row(
                children: [
                  Icon(Icons.share, color: Colors.blue),
                  SizedBox(width: 8),
                  Text('Share Furniture'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'delete',
              child: Row(
                children: [
                  Icon(Icons.delete, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Delete Furniture'),
                ],
              ),
            ),
          ],
        ),
        children: [
          const WhiteDividerWidget(),
          if (occupiedSlots == 0)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'No objects on this furniture',
                style: TextStyle(color: Colors.grey[500]),
                textAlign: TextAlign.center,
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: objectIds.length,
              itemBuilder: (context, slotIndex) {
                final objectId = objectIds[slotIndex];
                if (objectId == null || objectId.toString().isEmpty) {
                  return const SizedBox.shrink();
                }

                return FutureBuilder<String>(
                  future: _getObjectName(objectId.toString()),
                  builder: (context, snapshot) {
                    final objectName = snapshot.data ?? objectId.toString();
                    return FutureBuilder<bool>(
                      future: _isSlotCurrentlyPlaying(furnitureId, slotIndex),
                      builder: (context, playingSnapshot) {
                        final isPlaying = playingSnapshot.data ?? false;
                        return ListTile(
                          dense: true,
                          leading: Stack(
                            alignment: Alignment.center,
                            children: [
                              CircleAvatar(
                                backgroundColor: isPlaying
                                    ? Colors.green[600] // Green when playing
                                    : Colors.blue[700], // Blue when idle
                                radius: 16,
                                child: Text(
                                  '${slotIndex + 1}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              if (isPlaying)
                                Positioned(
                                  right: 0,
                                  bottom: 0,
                                  child: Container(
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                    padding: const EdgeInsets.all(2),
                                    child: const Icon(
                                      Icons.play_arrow,
                                      size: 12,
                                      color: Colors.green,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          title: Text(
                            objectName,
                            style: const TextStyle(color: Colors.white),
                          ),
                          subtitle: isPlaying
                              ? Text(
                                  'Now playing',
                                  style: TextStyle(
                                    color: Colors.green[300],
                                    fontSize: 12,
                                  ),
                                )
                              : null,
                          trailing: IconButton(
                            icon: const Icon(
                              Icons.remove_circle_outline,
                              color: Colors.red,
                            ),
                            onPressed: () => _removeObjectFromFurniture(
                              furnitureId,
                              objectId.toString(),
                            ),
                            tooltip: 'Remove from furniture',
                          ),
                          onTap: () => _handleObjectTap(
                            furnitureId,
                            slotIndex,
                            objectId.toString(),
                          ),
                        );
                      },
                    );
                  },
                );
              },
            ),
        ],
      ),
    );
  }
}
