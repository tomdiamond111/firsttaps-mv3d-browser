import 'package:flutter/material.dart';
import 'package:firsttaps_mv3d/models/music_search_result.dart';

/// Widget that displays a single music/video search result
class MusicSearchResultCard extends StatelessWidget {
  final MusicSearchResult result;
  final VoidCallback onAddToWorld;

  const MusicSearchResultCard({
    super.key,
    required this.result,
    required this.onAddToWorld,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onAddToWorld,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Thumbnail
              _buildThumbnail(),
              const SizedBox(width: 12),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title
                    Text(
                      result.title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),

                    // Artist/Channel
                    Text(
                      result.artist,
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),

                    // Platform badge and metadata
                    Row(
                      children: [
                        // Platform badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: _getPlatformColor().withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                result.platformIcon,
                                style: const TextStyle(fontSize: 12),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                result.platform.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: _getPlatformColor(),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),

                        // View count
                        if (result.viewCount != null)
                          Text(
                            result.formattedViewCount,
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey[500],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),

              // Add button
              IconButton(
                icon: const Icon(Icons.add_circle),
                color: const Color(0xFF228B22),
                iconSize: 32,
                onPressed: onAddToWorld,
                tooltip: 'Add to World',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildThumbnail() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: 120,
        height: 68, // 16:9 aspect ratio
        child: result.thumbnailUrl.isNotEmpty
            ? Image.network(
                result.thumbnailUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return _buildThumbnailPlaceholder();
                },
              )
            : _buildThumbnailPlaceholder(),
      ),
    );
  }

  Widget _buildThumbnailPlaceholder() {
    return Container(
      color: Colors.grey[300],
      child: const Center(
        child: Icon(Icons.music_note, size: 32, color: Colors.grey),
      ),
    );
  }

  Color _getPlatformColor() {
    final colorHex = result.platformColor.replaceAll('#', '');
    return Color(int.parse('FF$colorHex', radix: 16));
  }
}
