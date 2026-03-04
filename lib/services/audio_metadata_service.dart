import 'dart:developer' as developer;

/// AudioMetadataService
/// Handles extraction and processing of audio file metadata
/// Provides fallback strategies for when metadata is not available
class AudioMetadataService {
  /// Extract basic metadata from audio filename
  /// Returns a map with 'artist', 'title', and 'displayText' keys
  static Map<String, String?> extractMetadataFromFilename(String filename) {
    developer.log(
      'Extracting metadata from audio filename: $filename',
      name: 'AudioMetadataService',
    );

    if (filename.isEmpty) {
      return {'artist': null, 'title': 'Unknown', 'displayText': 'Unknown'};
    }

    // Remove file extension
    String cleanName = filename.replaceAll(
      RegExp(r'\.(mp3|wav|flac|aac|ogg|wma|m4a)$', caseSensitive: false),
      '',
    );

    // Pattern 1: "Artist - Song Title" (most common)
    if (cleanName.contains(' - ')) {
      List<String> parts = cleanName.split(' - ');
      if (parts.length >= 2) {
        String artist = _cleanText(parts[0]);
        String title = _cleanText(parts.sublist(1).join(' - '));

        developer.log(
          'Parsed as Artist-Title: "$artist" - "$title"',
          name: 'AudioMetadataService',
        );

        return {
          'artist': artist,
          'title': title,
          'displayText': _createDisplayText(artist, title),
        };
      }
    }

    // Pattern 2: Multiple words - try to split intelligently
    List<String> words = cleanName
        .split(RegExp(r'[_\s]+'))
        .where((word) => word.isNotEmpty)
        .toList();

    if (words.length >= 3) {
      // Use first 2 words as artist, rest as title
      String artist = _cleanText(words.take(2).join(' '));
      String title = _cleanText(words.skip(2).join(' '));

      developer.log(
        'Parsed as multi-word: "$artist" - "$title"',
        name: 'AudioMetadataService',
      );

      return {
        'artist': artist,
        'title': title,
        'displayText': _createDisplayText(artist, title),
      };
    }

    // Fallback: Use entire filename as title, truncated to 8 characters
    String fallbackTitle = _cleanText(cleanName);
    String truncatedTitle = _truncateText(fallbackTitle, 8);

    developer.log(
      'No artist detected, using as title: "$truncatedTitle"',
      name: 'AudioMetadataService',
    );

    return {
      'artist': null,
      'title': truncatedTitle,
      'displayText': truncatedTitle,
    };
  }

  /// Clean text by removing unwanted characters and normalizing
  static String _cleanText(String text) {
    if (text.isEmpty) return 'Unknown';

    String cleaned = text;

    // Remove common prefixes/suffixes
    cleaned = cleaned.replaceAll(
      RegExp(r'^\d+[\s\-\.]*'),
      '',
    ); // Remove track numbers
    cleaned = cleaned.replaceAll(
      RegExp(r'\s*\(.*\)$'),
      '',
    ); // Remove parentheses content
    cleaned = cleaned.replaceAll(
      RegExp(r'\s*\[.*\]$'),
      '',
    ); // Remove bracket content
    cleaned = cleaned.replaceAll(
      RegExp(r'\s*-\s*\d{4}$'),
      '',
    ); // Remove year suffix

    // Normalize spaces
    cleaned = cleaned.trim().replaceAll(RegExp(r'\s+'), ' ');

    // Capitalize first letter of each word
    cleaned = cleaned
        .split(' ')
        .map(
          (word) => word.isNotEmpty
              ? word[0].toUpperCase() + word.substring(1).toLowerCase()
              : word,
        )
        .join(' ');

    return cleaned.isNotEmpty ? cleaned : 'Unknown';
  }

  /// Truncate text to specified length without "..." suffix
  static String _truncateText(String text, int maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength);
  }

  /// Create display text for face texture
  static String _createDisplayText(String? artist, String title) {
    if (artist != null && artist.isNotEmpty) {
      // Truncate both to fit nicely on cylinder
      const int maxArtistLength = 8;
      const int maxTitleLength = 8;

      String shortArtist = _truncateText(artist, maxArtistLength);
      String shortTitle = _truncateText(title, maxTitleLength);

      return '$shortArtist\\n$shortTitle'; // Use \\n for JavaScript parsing
    } else {
      return _truncateText(title, 8);
    }
  }

  /// Check if filename is an audio file
  static bool isAudioFile(String filename) {
    if (filename.isEmpty) return false;

    const List<String> audioExtensions = [
      'mp3',
      'wav',
      'flac',
      'aac',
      'ogg',
      'wma',
      'm4a',
    ];

    String extension = filename.split('.').last.toLowerCase();
    return audioExtensions.contains(extension);
  }

  /// Get supported audio file extensions
  static List<String> getSupportedExtensions() {
    return ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'];
  }

  /// Enhanced metadata extraction for when file system metadata is available
  /// This is a placeholder for future enhancement with actual metadata reading
  static Future<Map<String, String?>> extractEnhancedMetadata(
    String filepath,
  ) async {
    developer.log(
      'Enhanced metadata extraction requested for: $filepath',
      name: 'AudioMetadataService',
    );

    // For now, fall back to filename parsing
    // In the future, this could use platform channels to read ID3 tags, etc.
    String filename = filepath.split('/').last.split('\\').last;
    return extractMetadataFromFilename(filename);
  }
}
