import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firsttaps_mv3d_browser/models/music_search_result.dart';
import 'package:firsttaps_mv3d_browser/services/music_search_service.dart';
import 'package:firsttaps_mv3d_browser/widgets/music_search_result_card.dart';
import 'package:firsttaps_mv3d_browser/controllers/home_page_controller.dart';

/// Full-screen music/video search interface
class MusicSearchScreen extends StatefulWidget {
  final String? initialQuery;

  const MusicSearchScreen({super.key, this.initialQuery});

  @override
  State<MusicSearchScreen> createState() => _MusicSearchScreenState();
}

class _MusicSearchScreenState extends State<MusicSearchScreen> {
  final MusicSearchService _searchService = MusicSearchService();
  final TextEditingController _searchController = TextEditingController();
  final List<MusicSearchResult> _results = [];

  bool _isLoading = false;
  bool _hasSearched = false;
  String? _errorMessage;
  Timer? _debounceTimer;

  // Platform filter state
  final Set<String> _selectedPlatforms = {
    'youtube',
    'deezer',
    'vimeo',
    'soundcloud',
    'dailymotion',
    // 'local' - disabled due to plugin compatibility issues
  };

  @override
  void initState() {
    super.initState();
    // Pre-fill search field if initial query provided
    if (widget.initialQuery != null && widget.initialQuery!.isNotEmpty) {
      _searchController.text = widget.initialQuery!;
      // Trigger search automatically
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _performSearch(_searchController.text.trim());
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _togglePlatform(String platform) {
    setState(() {
      if (_selectedPlatforms.contains(platform)) {
        // Don't allow deselecting all platforms
        if (_selectedPlatforms.length > 1) {
          _selectedPlatforms.remove(platform);
        }
      } else {
        _selectedPlatforms.add(platform);
      }
    });

    // Re-run search if we already have a query
    if (_searchController.text.trim().isNotEmpty) {
      _performSearch(_searchController.text.trim());
    }
  }

  void _onSearchChanged(String query) {
    // Cancel previous timer
    _debounceTimer?.cancel();

    // Wait 500ms after user stops typing before searching
    _debounceTimer = Timer(const Duration(milliseconds: 500), () {
      if (query.trim().isNotEmpty) {
        _performSearch(query);
      } else {
        setState(() {
          _results.clear();
          _hasSearched = false;
          _errorMessage = null;
        });
      }
    });
  }

  Future<void> _performSearch(String query) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _hasSearched = true;
    });

    try {
      // Search across selected platforms
      final results = await _searchService.searchAllPlatforms(
        query,
        platforms: _selectedPlatforms,
      );

      setState(() {
        _results.clear();
        _results.addAll(results);
        _isLoading = false;
      });

      // Check YouTube quota warning if YouTube is enabled
      if (_selectedPlatforms.contains('youtube')) {
        final isWarning = await _searchService.isQuotaWarningThreshold();
        if (isWarning) {
          final quotaStatus = await _searchService.getQuotaStatus();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  '⚠️ YouTube API quota at ${quotaStatus['percentUsed']}% - ${quotaStatus['searchesRemaining']} searches remaining today',
                ),
                duration: const Duration(seconds: 4),
              ),
            );
          }
        }
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Search failed: $_errorMessage'),
            backgroundColor: Colors.red[700],
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  void _addResultToWorld(MusicSearchResult result) async {
    final controller = context.read<HomePageController>();

    try {
      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      // Create link object from search result
      await controller.createLinkFromMusicSearchResult(context, result);

      // Close loading dialog
      if (mounted) {
        Navigator.pop(context);

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Added "${result.title}" to your world!'),
            backgroundColor: const Color(0xFF228B22),
            duration: const Duration(seconds: 2),
          ),
        );

        // Close search screen after brief delay
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) {
            Navigator.pop(context);
          }
        });
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) {
        Navigator.pop(context);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to add to world: $e'),
            backgroundColor: Colors.red[700],
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final screenHeight = mediaQuery.size.height;
    final keyboardHeight = mediaQuery.viewInsets.bottom;
    final isLandscape = mediaQuery.orientation == Orientation.landscape;

    // In landscape with keyboard, use a different layout
    if (isLandscape && keyboardHeight > 0) {
      // Calculate usable screen height (not covered by keyboard)
      final usableScreenHeight = screenHeight - keyboardHeight;

      return Scaffold(
        backgroundColor: const Color(0xFF228B22),
        body: SafeArea(
          child: Container(
            height: usableScreenHeight,
            child: Row(
              children: [
                // Left column: Search and header
                Container(
                  width: 280,
                  decoration: BoxDecoration(
                    color: const Color(0xFF228B22),
                    border: Border(
                      right: BorderSide(color: Colors.white.withOpacity(0.2)),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Back button and title
                      Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(
                                Icons.arrow_back,
                                color: Colors.white,
                              ),
                              onPressed: () => Navigator.pop(context),
                            ),
                            const Text(
                              'Music Search',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Search field
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        child: TextField(
                          controller: _searchController,
                          autofocus: true,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            hintText:
                                'Search music and videos across platforms...',
                            hintStyle: TextStyle(
                              color: Colors.white.withOpacity(0.7),
                              fontSize: 13,
                            ),
                            filled: true,
                            fillColor: Colors.white.withOpacity(0.15),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(
                                color: Colors.white.withOpacity(0.5),
                                width: 1.5,
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Colors.white,
                                width: 2,
                              ),
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(
                                color: Colors.white.withOpacity(0.5),
                                width: 1.5,
                              ),
                            ),
                            prefixIcon: const Icon(
                              Icons.search,
                              color: Colors.white,
                            ),
                            suffixIcon: _searchController.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(
                                      Icons.clear,
                                      color: Colors.white,
                                    ),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() {
                                        _results.clear();
                                        _hasSearched = false;
                                        _errorMessage = null;
                                      });
                                    },
                                  )
                                : null,
                          ),
                          onChanged: _onSearchChanged,
                          textInputAction: TextInputAction.search,
                          onSubmitted: _performSearch,
                        ),
                      ),
                      // Loading indicator in left column
                      if (_isLoading)
                        const Padding(
                          padding: EdgeInsets.all(16.0),
                          child: Center(
                            child: CircularProgressIndicator(
                              color: Colors.white,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                // Right column: Results
                Expanded(
                  child: Container(color: Colors.white, child: _buildBody()),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Normal layout for portrait or landscape without keyboard
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF228B22),
        foregroundColor: Colors.white,
        title: TextField(
          controller: _searchController,
          autofocus: false,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Search music and videos across platforms...',
            hintStyle: TextStyle(
              color: Colors.white.withValues(alpha: 0.7),
              fontSize: 13,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(
                color: Colors.white.withValues(alpha: 0.5),
                width: 1.5,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Colors.white, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 8,
            ),
            isDense: true,
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, color: Colors.white),
                    onPressed: () {
                      _searchController.clear();
                      setState(() {
                        _results.clear();
                        _hasSearched = false;
                        _errorMessage = null;
                      });
                    },
                  )
                : null,
          ),
          onChanged: _onSearchChanged,
          textInputAction: TextInputAction.search,
          onSubmitted: _performSearch,
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    // Loading state
    if (_isLoading) {
      // Determine which platforms are being searched
      final platformNames = _selectedPlatforms
          .map((p) => p[0].toUpperCase() + p.substring(1))
          .join(', ');

      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(color: Color(0xFF228B22)),
            const SizedBox(height: 16),
            Text(
              'Searching $platformNames...',
              style: const TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    // Error state
    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  if (_searchController.text.trim().isNotEmpty) {
                    _performSearch(_searchController.text.trim());
                  }
                },
                child: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    // Empty state - before first search
    if (!_hasSearched || _results.isEmpty && _searchController.text.isEmpty) {
      return SingleChildScrollView(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: MediaQuery.of(context).size.height - 200,
          ),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.search, size: 80, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'Search for Music & Videos',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Search YouTube, Vimeo, Dailymotion, and Deezer',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 24),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: [
                      _buildExampleChip('The Weeknd'),
                      _buildExampleChip('Billie Eilish'),
                      _buildExampleChip('Drake'),
                      _buildExampleChip('Taylor Swift'),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    // Results list with platform filters
    return Column(
      children: [
        // Platform filter chips
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.grey[100],
            border: Border(
              bottom: BorderSide(color: Colors.grey[300]!, width: 1),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Search in:',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.black54,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildPlatformChip('YouTube', 'youtube', Colors.red),
                  _buildPlatformChip(
                    'Deezer',
                    'deezer',
                    const Color(0xFFFF0092),
                  ),
                  _buildPlatformChip('Vimeo', 'vimeo', const Color(0xFF1AB7EA)),
                  _buildPlatformChip(
                    'SoundCloud',
                    'soundcloud',
                    const Color(0xFFFF5500),
                  ),
                  _buildPlatformChip(
                    'Dailymotion',
                    'dailymotion',
                    const Color(0xFF0066DC),
                  ),
                  // Local files search temporarily disabled due to plugin compatibility
                  // _buildPlatformChip('My Files', 'local', Colors.green),
                ],
              ),
            ],
          ),
        ),
        // Results
        Expanded(
          child: _results.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.music_off,
                          size: 64,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'No results found',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Try a different search term or enable more platforms',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  itemCount: _results.length,
                  padding: const EdgeInsets.only(top: 8, bottom: 16),
                  itemBuilder: (context, index) {
                    return MusicSearchResultCard(
                      result: _results[index],
                      onAddToWorld: () => _addResultToWorld(_results[index]),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildExampleChip(String text) {
    return ActionChip(
      label: Text(text),
      onPressed: () {
        _searchController.text = text;
        _performSearch(text);
      },
    );
  }

  Widget _buildPlatformChip(String label, String platform, Color color) {
    final isSelected = _selectedPlatforms.contains(platform);

    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) => _togglePlatform(platform),
      selectedColor: color.withOpacity(0.2),
      checkmarkColor: color,
      backgroundColor: Colors.white,
      side: BorderSide(
        color: isSelected ? color : Colors.grey[300]!,
        width: isSelected ? 2 : 1,
      ),
      labelStyle: TextStyle(
        color: isSelected ? color.withOpacity(0.9) : Colors.black87,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
      ),
    );
  }
}
