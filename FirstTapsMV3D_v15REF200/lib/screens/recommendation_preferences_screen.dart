import 'package:flutter/material.dart';
import '../models/recommendation_preferences.dart';
import '../services/recommendations_storage.dart';
import '../services/recommendation_service.dart';
import '../managers/recommendation_content_manager.dart';

/// Screen for configuring content recommendation preferences
class RecommendationPreferencesScreen extends StatefulWidget {
  const RecommendationPreferencesScreen({Key? key}) : super(key: key);

  @override
  State<RecommendationPreferencesScreen> createState() =>
      _RecommendationPreferencesScreenState();
}

class _RecommendationPreferencesScreenState
    extends State<RecommendationPreferencesScreen> {
  final RecommendationsStorage _storage = RecommendationsStorage.instance;
  final RecommendationService _recommendationService = RecommendationService();
  final RecommendationContentManager _contentManager =
      RecommendationContentManager();

  RecommendationPreferences? _preferences;
  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    setState(() => _isLoading = true);

    try {
      final prefs = await _storage.getPreferences();
      setState(() {
        _preferences = prefs;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      _showError('Error loading preferences: $e');
    }
  }

  Future<void> _savePreferences() async {
    if (_preferences == null) return;

    setState(() => _isSaving = true);

    try {
      await _storage.savePreferences(_preferences!);

      // If recommendations were just enabled, refresh content
      if (_preferences!.enabled) {
        await _contentManager.refreshAllContent();
      }

      setState(() => _isSaving = false);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Preferences saved successfully'),
          duration: Duration(seconds: 2),
        ),
      );

      Navigator.pop(context);
    } catch (e) {
      setState(() => _isSaving = false);
      _showError('Error saving preferences: $e');
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Content Recommendations'),
        actions: [
          if (!_isLoading && _preferences != null)
            TextButton(
              onPressed: _isSaving ? null : _savePreferences,
              child: _isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('SAVE', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _preferences == null
          ? const Center(child: Text('Error loading preferences'))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildMasterToggle(),
                  const SizedBox(height: 24),
                  if (_preferences!.enabled) ...[
                    _buildMusicPreferences(),
                    const SizedBox(height: 24),
                    _buildVideoPreferences(),
                    const SizedBox(height: 24),
                    _buildContentTypes(),
                    const SizedBox(height: 24),
                    _buildFilters(),
                    const SizedBox(height: 24),
                    _buildActions(),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildMasterToggle() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            SwitchListTile(
              title: const Text(
                'Enable Recommendations',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              subtitle: const Text(
                'Get fresh content daily from trending platforms',
              ),
              value: _preferences!.enabled,
              onChanged: (value) {
                setState(() {
                  _preferences = _preferences!.copyWith(enabled: value);
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMusicPreferences() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                Icon(Icons.music_note, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  'MUSIC PREFERENCES',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const Divider(),
            _buildCheckbox('Pop / Top 40', _preferences!.musicPop, (value) {
              setState(
                () => _preferences = _preferences!.copyWith(musicPop: value),
              );
            }),
            _buildCheckbox('Rock / Alternative', _preferences!.musicRock, (
              value,
            ) {
              setState(
                () => _preferences = _preferences!.copyWith(musicRock: value),
              );
            }),
            _buildCheckbox('Hip Hop / Rap', _preferences!.musicHipHop, (value) {
              setState(
                () => _preferences = _preferences!.copyWith(musicHipHop: value),
              );
            }),
            _buildCheckbox('Country', _preferences!.musicCountry, (value) {
              setState(
                () =>
                    _preferences = _preferences!.copyWith(musicCountry: value),
              );
            }),
            _buildCheckbox('Classical', _preferences!.musicClassical, (value) {
              setState(
                () => _preferences = _preferences!.copyWith(
                  musicClassical: value,
                ),
              );
            }),
            _buildCheckbox(
              'Electronic / Dance',
              _preferences!.musicElectronic,
              (value) {
                setState(
                  () => _preferences = _preferences!.copyWith(
                    musicElectronic: value,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVideoPreferences() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                Icon(Icons.video_library, color: Colors.red),
                SizedBox(width: 8),
                Text(
                  'VIDEO PREFERENCES',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const Divider(),
            _buildCheckbox(
              'Comedy / Entertainment',
              _preferences!.videoComedy,
              (value) {
                setState(
                  () =>
                      _preferences = _preferences!.copyWith(videoComedy: value),
                );
              },
            ),
            _buildCheckbox('Sports', _preferences!.videoSports, (value) {
              setState(
                () => _preferences = _preferences!.copyWith(videoSports: value),
              );
            }),
            _buildCheckbox('News / Current Events', _preferences!.videoNews, (
              value,
            ) {
              setState(
                () => _preferences = _preferences!.copyWith(videoNews: value),
              );
            }),
            _buildCheckbox('Gaming', _preferences!.videoGaming, (value) {
              setState(
                () => _preferences = _preferences!.copyWith(videoGaming: value),
              );
            }),
            _buildCheckbox('Educational', _preferences!.videoEducational, (
              value,
            ) {
              setState(
                () => _preferences = _preferences!.copyWith(
                  videoEducational: value,
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildContentTypes() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                Icon(Icons.category, color: Colors.green),
                SizedBox(width: 8),
                Text(
                  'CONTENT TYPES',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const Divider(),
            _buildCheckbox(
              'Short Videos (TikTok/Reels)',
              _preferences!.showShorts,
              (value) {
                setState(
                  () =>
                      _preferences = _preferences!.copyWith(showShorts: value),
                );
              },
            ),
            _buildCheckbox('Music Videos', _preferences!.showMusicVideos, (
              value,
            ) {
              setState(
                () => _preferences = _preferences!.copyWith(
                  showMusicVideos: value,
                ),
              );
            }),
            _buildCheckbox('Audio Tracks', _preferences!.showAudio, (value) {
              setState(
                () => _preferences = _preferences!.copyWith(showAudio: value),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildFilters() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                Icon(Icons.filter_alt, color: Colors.orange),
                SizedBox(width: 8),
                Text(
                  'FILTERS',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const Divider(),
            _buildCheckbox(
              'Include Explicit Content',
              _preferences!.explicitContent,
              (value) {
                setState(
                  () => _preferences = _preferences!.copyWith(
                    explicitContent: value,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActions() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'ACTIONS',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const Divider(),
            ElevatedButton.icon(
              onPressed: _clearCache,
              icon: const Icon(Icons.refresh),
              label: const Text('Clear Cache & Refresh Content'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
              ),
            ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: _resetToDefaults,
              icon: const Icon(Icons.restore),
              label: const Text('Reset to Defaults'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
                backgroundColor: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCheckbox(String label, bool value, Function(bool) onChanged) {
    return CheckboxListTile(
      title: Text(label),
      value: value,
      onChanged: (newValue) => onChanged(newValue ?? false),
      controlAffinity: ListTileControlAffinity.leading,
      dense: true,
    );
  }

  Future<void> _clearCache() async {
    try {
      await _recommendationService.clearAllCaches();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cache cleared. New content will be fetched.'),
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      _showError('Error clearing cache: $e');
    }
  }

  Future<void> _resetToDefaults() async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset to Defaults'),
        content: const Text(
          'Are you sure you want to reset all preferences to default values?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await _preferencesDao.resetToDefaults();
              await _loadPreferences();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Preferences reset to defaults'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
            child: const Text('RESET'),
          ),
        ],
      ),
    );
  }
}
