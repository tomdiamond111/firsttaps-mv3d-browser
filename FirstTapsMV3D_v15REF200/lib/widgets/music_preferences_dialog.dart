import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Music/Content Preference Categories Dialog
/// Allows users to select music genres/categories for dynamic furniture content
class MusicPreferencesDialog extends StatefulWidget {
  final WebViewController? webViewController;

  const MusicPreferencesDialog({super.key, this.webViewController});

  static const String _genresPrefsKey = 'content_selected_genres';
  static const String _cleanModePrefsKey = 'content_clean_mode';

  /// Available music genres/categories
  static const List<GenreOption> availableGenres = [
    GenreOption(id: 'pop', name: 'Pop', icon: '🎵'),
    GenreOption(id: 'country', name: 'Country', icon: '🤠'),
    GenreOption(id: 'rock', name: 'Rock', icon: '🎸'),
    GenreOption(id: 'hip_hop', name: 'Hip Hop / Rap', icon: '🎤'),
    GenreOption(id: 'indie', name: 'Indie / Alternative', icon: '🎧'),
    GenreOption(id: 'electronic', name: 'Electronic / EDM', icon: '🎹'),
    GenreOption(id: 'r_and_b', name: 'R&B / Soul', icon: '🎶'),
    GenreOption(id: 'classical', name: 'Classical', icon: '🎻'),
    GenreOption(id: 'jazz', name: 'Jazz', icon: '🎺'),
    GenreOption(id: 'latin', name: 'Latin', icon: '💃'),
    GenreOption(id: 'reggae', name: 'Reggae / Dancehall', icon: '🌴'),
  ];

  /// Show the preferences dialog
  static Future<void> show(
    BuildContext context, {
    WebViewController? webViewController,
  }) async {
    await showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) =>
          MusicPreferencesDialog(webViewController: webViewController),
    );
  }

  /// Load selected genres from SharedPreferences
  static Future<List<String>> loadSelectedGenres() async {
    final prefs = await SharedPreferences.getInstance();
    final genres = prefs.getStringList(_genresPrefsKey);

    // Default to Pop, Country, Indie if first time
    return genres ?? ['pop', 'country', 'indie'];
  }

  /// Save selected genres to SharedPreferences
  static Future<void> saveSelectedGenres(List<String> genres) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_genresPrefsKey, genres);
  }

  /// Load clean mode preference
  static Future<bool> loadCleanMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_cleanModePrefsKey) ??
        true; // Default to clean mode ON
  }

  /// Save clean mode preference
  static Future<void> saveCleanMode(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_cleanModePrefsKey, enabled);
  }

  @override
  State<MusicPreferencesDialog> createState() => _MusicPreferencesDialogState();
}

class _MusicPreferencesDialogState extends State<MusicPreferencesDialog> {
  List<String> selectedGenres = [];
  bool cleanMode = true;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final genres = await MusicPreferencesDialog.loadSelectedGenres();
    final clean = await MusicPreferencesDialog.loadCleanMode();

    setState(() {
      selectedGenres = genres;
      cleanMode = clean;
      isLoading = false;
    });
  }

  Future<void> _savePreferences() async {
    final timestamp = DateTime.now()
        .toIso8601String()
        .split('T')[1]
        .split('.')[0];
    print('💾 [MUSIC PREFS $timestamp] _savePreferences() called');

    await MusicPreferencesDialog.saveSelectedGenres(selectedGenres);
    await MusicPreferencesDialog.saveCleanMode(cleanMode);

    // Notify JavaScript of preference changes
    _notifyJavaScript();
  }

  void _notifyJavaScript() {
    final timestamp = DateTime.now()
        .toIso8601String()
        .split('T')[1]
        .split('.')[0];
    final callId = DateTime.now().millisecondsSinceEpoch;
    print(
      '📢 [MUSIC PREFS $timestamp] _notifyJavaScript() called [CALL_ID: $callId] - Updating JavaScript preferences',
    );

    // Send preferences to JavaScript via bridge if WebViewController is available
    if (widget.webViewController != null) {
      print('🎵 [CALL_ID: $callId] Sending music preferences to JavaScript...');
      final jsonData = jsonEncode({
        'selectedGenres': selectedGenres,
        'cleanMode': cleanMode,
        'refreshInterval': 300, // 5 minutes in seconds
      });

      widget.webViewController!.runJavaScript('''
        console.log('🎵 [FLUTTER CALL_ID: $callId] Music preferences update received');
        
        if (window.contentPreferences && window.contentPreferences.importFromFlutter) {
          console.log('🎵 [FLUTTER CALL_ID: $callId] Importing preferences...');
          window.contentPreferences.importFromFlutter('$jsonData');
          console.log('✅ [FLUTTER CALL_ID: $callId] Preferences updated in JavaScript');
          
          // Trigger IMMEDIATE refresh using existing recommendations (no Dart API call)
          // This refilters content based on new genre preferences without fetching new data
          if (window.contentGenerator && window.contentGenerator._performFurnitureRefresh) {
            console.log('🔄 [FLUTTER CALL_ID: $callId] Triggering immediate content refilter with new genre preferences...');
            window.contentGenerator._performFurnitureRefresh();
          } else {
            console.warn('⚠️ [CALL_ID: $callId] _performFurnitureRefresh not available, content will update on next refresh');
          }
        } else {
          console.warn('⚠️ [CALL_ID: $callId] contentPreferences not available');
        }
      ''');
    } else {
      print(
        '🎵 [CALL_ID: $callId] Music preferences updated (WebViewController not available):',
      );
      print('  Selected genres: $selectedGenres');
      print('  Clean mode: $cleanMode');
    }
  }

  void _toggleGenre(String genreId) {
    setState(() {
      if (selectedGenres.contains(genreId)) {
        // Don't allow removing last genre
        if (selectedGenres.length > 1) {
          selectedGenres.remove(genreId);
        } else {
          _showMinimumGenreWarning();
        }
      } else {
        selectedGenres.add(genreId);
      }
    });
    // Don't save/refresh immediately - wait for Done button
  }

  void _showMinimumGenreWarning() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Please keep at least one genre selected'),
        duration: Duration(seconds: 2),
        backgroundColor: Colors.orange,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Dialog(
        child: Padding(
          padding: EdgeInsets.all(40.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 20),
              Text('Loading preferences...'),
            ],
          ),
        ),
      );
    }

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
          maxWidth: 500,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.fromLTRB(24, 20, 12, 16),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF6B46C1), Color(0xFF9333EA)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.music_note, color: Colors.white, size: 28),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Music Categories',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    tooltip: 'Close',
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ],
              ),
            ),

            // Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Description
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.purple.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.purple.shade200,
                          width: 1.5,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(
                                Icons.info_outline,
                                color: Color(0xFF9333EA),
                                size: 20,
                              ),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Customize Your Music Experience',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF6B46C1),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Select your favorite music genres. Furniture will display content based on your selections:',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade800,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.blue.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.lightbulb_outline,
                                color: Colors.blue.shade700,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'How it works:',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue.shade900,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          _buildInfoRow(
                            '📺',
                            'Gallery Wall',
                            'Videos from ALL selected genres',
                          ),
                          const SizedBox(height: 6),
                          _buildInfoRow(
                            '🎵',
                            'Riser & Stage',
                            'ONE rotating genre per day',
                          ),
                          const SizedBox(height: 6),
                          _buildInfoRow(
                            '📚',
                            'Bookshelf',
                            'Your most played content',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Clean Mode Toggle
                    Container(
                      decoration: BoxDecoration(
                        color: cleanMode
                            ? Colors.green.shade50
                            : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: cleanMode
                              ? Colors.green.shade300
                              : Colors.grey.shade300,
                          width: 2,
                        ),
                      ),
                      child: SwitchListTile(
                        title: Text(
                          'Family-Friendly Mode',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade900,
                          ),
                        ),
                        subtitle: Text(
                          cleanMode
                              ? 'Only clean, age-appropriate content'
                              : 'Allow all content types',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade700,
                          ),
                        ),
                        secondary: Icon(
                          cleanMode
                              ? Icons.family_restroom
                              : Icons.warning_amber,
                          color: cleanMode ? Colors.green : Colors.orange,
                          size: 32,
                        ),
                        value: cleanMode,
                        activeColor: Colors.green,
                        onChanged: (value) {
                          setState(() {
                            cleanMode = value;
                          });
                          // Don't save/refresh immediately - wait for Done button
                        },
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Selected count and hint
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.purple.shade100,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${selectedGenres.length} selected',
                            style: TextStyle(
                              color: Colors.purple.shade900,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            'Tap to select/deselect',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Genre checkboxes
                    ...MusicPreferencesDialog.availableGenres.map((genre) {
                      final isSelected = selectedGenres.contains(genre.id);
                      return _buildGenreCheckbox(genre, isSelected);
                    }),
                  ],
                ),
              ),
            ),

            // Footer with action buttons
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(20),
                  bottomRight: Radius.circular(20),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: () {
                      setState(() {
                        selectedGenres = ['pop', 'country', 'indie'];
                        cleanMode = true;
                      });
                      // Don't save/refresh immediately - wait for Done button
                    },
                    icon: const Icon(Icons.restore),
                    label: const Text('Reset to Default'),
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.grey.shade700,
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      final timestamp = DateTime.now()
                          .toIso8601String()
                          .split('T')[1]
                          .split('.')[0];
                      print(
                        '✅ [MUSIC PREFS $timestamp] Done button pressed - Saving preferences and triggering ONE refresh',
                      );
                      _savePreferences();
                      Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.check),
                    label: const Text('Done'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF9333EA),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String emoji, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(emoji, style: const TextStyle(fontSize: 16)),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: TextStyle(fontSize: 13, color: Colors.grey.shade800),
              children: [
                TextSpan(
                  text: '$title: ',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                TextSpan(text: description),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGenreCheckbox(GenreOption genre, bool isSelected) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => _toggleGenre(genre.id),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? Colors.purple.shade50 : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? Colors.purple.shade300 : Colors.grey.shade300,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              // Checkbox
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF9333EA) : Colors.white,
                  border: Border.all(
                    color: isSelected
                        ? const Color(0xFF9333EA)
                        : Colors.grey.shade400,
                    width: 2,
                  ),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: isSelected
                    ? const Icon(Icons.check, color: Colors.white, size: 16)
                    : null,
              ),
              const SizedBox(width: 12),

              // Icon
              Text(genre.icon, style: const TextStyle(fontSize: 24)),
              const SizedBox(width: 12),

              // Label
              Expanded(
                child: Text(
                  genre.name,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: isSelected
                        ? FontWeight.bold
                        : FontWeight.normal,
                    color: isSelected ? Colors.purple.shade900 : Colors.black87,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Genre option data class
class GenreOption {
  final String id;
  final String name;
  final String icon;

  const GenreOption({required this.id, required this.name, required this.icon});
}
