import 'package:flutter/material.dart';
import '../services/three_js_interop_service.dart';

/// Dialog for configuring object stacking criteria for both sorting and searching
class StackingCriteriaDialog extends StatefulWidget {
  final ThreeJsInteropService threeJsService;

  const StackingCriteriaDialog({super.key, required this.threeJsService});

  @override
  State<StackingCriteriaDialog> createState() => _StackingCriteriaDialogState();
}

class _StackingCriteriaDialogState extends State<StackingCriteriaDialog> {
  // Available stacking criteria
  final List<String> availableCriteria = [
    'fileType',
    'fileName',
    'fileSize',
    'dateModified',
    'dateCreated',
    'filename8CharPrefix',
    'filenameExact',
    'filenameNumericAlpha',
    'advancedContextual',
    'smartImageDate',
    'smartAudioMeta',
    'smartFilePrefix',
    'smartAppPrefix',
    'smartLinkSession',
  ];

  // User-friendly labels for criteria
  final Map<String, String> criteriaLabels = {
    'fileType': 'File Type',
    'fileName': 'File Name',
    'fileSize': 'File Size',
    'dateModified': 'Date Modified',
    'dateCreated': 'Date Created',
    'filename8CharPrefix': 'Filename (8-char prefix)',
    'filenameExact': 'Filename (exact match)',
    'filenameNumericAlpha': 'Filename (numeric+alphabetical)',
    'advancedContextual': 'Smart Contextual (Recommended)',
    'smartImageDate': 'Smart Image Dating',
    'smartAudioMeta': 'Smart Audio Metadata',
    'smartFilePrefix': 'Smart File Prefixes',
    'smartAppPrefix': 'Smart App Grouping',
    'smartLinkSession': 'Smart Link Sessions',
  };

  // Detailed descriptions for criteria
  final Map<String, String> criteriaDescriptions = {
    'fileType': 'Group by file extension (.jpg, .mp4, etc.)',
    'fileName': 'Group by full filename alphabetically',
    'fileSize': 'Group by file size ranges',
    'dateModified': 'Group by modification date',
    'dateCreated': 'Group by creation date',
    'filename8CharPrefix':
        'Group by first 8 characters of filename (e.g., "Document" → "DOCUMENT")',
    'filenameExact':
        'Group by exact filename without extension (e.g., "photo.jpg" → "photo")',
    'filenameNumericAlpha':
        'Sort within groups using numbers first, then alphabetically',
    'advancedContextual':
        'Intelligent stacking based on object type: images by date, audio by artist/song, files by prefix, apps by name similarity, links by session',
    'smartImageDate':
        'Stack images taken on the same day (EXIF date), sort by newest first',
    'smartAudioMeta':
        'Stack audio files by same artist OR same song name, extracted from filename',
    'smartFilePrefix':
        'Stack files with same 8-char prefix, sort numerically then alphabetically',
    'smartAppPrefix':
        'Stack apps with same 6-char name prefix (e.g., "Amazon Music" + "Amazon Shopping")',
    'smartLinkSession':
        'Stack links created in same session (30 min) or with same 8-char prefix',
  };

  // Current configuration state - Optimal defaults for smart stacking
  String? primaryCriteria =
      'advancedContextual'; // Smart Contextual (Recommended)
  String? secondaryCriteria = 'fileType'; // File Type fallback
  bool stackingEnabled = true;
  double stackHeightLimit = 10.0;

  // Loading state
  bool isLoading = true;
  bool isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentConfiguration();
  }

  /// Load current stacking configuration from the JavaScript backend
  Future<void> _loadCurrentConfiguration() async {
    try {
      // Use unified stacking config that applies to both sorting and searching
      final config = await widget.threeJsService.getUnifiedStackingConfig();

      setState(() {
        if (config != null && config.isNotEmpty) {
          primaryCriteria = config['primarySort'] ?? 'advancedContextual';
          secondaryCriteria = config['secondarySort'] ?? 'fileType';
          stackingEnabled = config['enabled'] ?? true;
          stackHeightLimit = (config['stackHeightLimit'] ?? 10.0).toDouble();
          print('Loaded stacking config: $config');
        } else {
          // Use optimal defaults if no config found
          primaryCriteria = 'advancedContextual';
          secondaryCriteria = 'fileType';
          stackingEnabled = true;
          stackHeightLimit = 10.0;
          print('Using optimal default stacking config');
        }
        isLoading = false;
      });
    } catch (e) {
      print('Error loading stacking configuration: $e');
      setState(() {
        // Fallback to optimal defaults on error
        primaryCriteria = 'advancedContextual';
        secondaryCriteria = 'fileType';
        stackingEnabled = true;
        stackHeightLimit = 10.0;
        isLoading = false;
      });
    }
  }

  /// Save configuration to JavaScript backend
  Future<void> _saveConfiguration() async {
    setState(() {
      isSaving = true;
    });

    try {
      // Build complete configuration object - JavaScript validation expects all properties
      final config = {
        'enabled': stackingEnabled,
        'primarySort': primaryCriteria ?? 'advancedContextual',
        'secondarySort': secondaryCriteria ?? 'fileType',
        'stackHeightLimit': stackHeightLimit,
        'spacingBetweenStacks': 6.0, // Default value from JS
        'autoApplyOnLoad': true, // Default value from JS
        'preserveUserStacks': true, // Default value from JS
      };

      print('Saving unified stacking config: $config');

      // Use unified stacking config that applies to both sorting and searching
      final success = await widget.threeJsService.updateUnifiedStackingConfig(
        config,
      );

      if (success) {
        // Apply the unified configuration to trigger re-stacking in both systems
        final applySuccess = await widget.threeJsService
            .applyUnifiedStackingConfig();

        if (applySuccess) {
          // Show success message
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Stacking criteria applied successfully to both sorting and searching',
                ),
                backgroundColor: Colors.green,
              ),
            );
            Navigator.of(context).pop();
          }
        } else {
          throw Exception('Failed to apply unified stacking configuration');
        }
      } else {
        throw Exception('Failed to update unified stacking configuration');
      }
    } catch (e) {
      print('Error saving stacking configuration: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving configuration: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }

    setState(() {
      isSaving = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: Colors.grey[900],
      title: const Row(
        children: [
          Icon(Icons.layers, color: Colors.white),
          SizedBox(width: 8),
          Flexible(
            child: Text(
              'Object Stacking Criteria',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
      content: isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.white))
          : SizedBox(
              width: MediaQuery.of(context).size.width * 0.8,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Enable/Disable Stacking
                    SwitchListTile(
                      title: const Text(
                        'Enable Object Stacking',
                        style: TextStyle(color: Colors.white),
                      ),
                      subtitle: const Text(
                        'Group similar objects into stacks (applies to both sorting and searching)',
                        style: TextStyle(color: Colors.white70),
                      ),
                      value: stackingEnabled,
                      activeColor: Colors.blue,
                      onChanged: (bool value) {
                        setState(() {
                          stackingEnabled = value;
                        });
                      },
                    ),

                    if (stackingEnabled) ...[
                      const SizedBox(height: 16),
                      const Divider(color: Colors.white),

                      // Primary Stacking Criteria
                      const Text(
                        'Primary Stacking Criteria',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Objects with the same primary criteria will be stacked together in both sorting and search results',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      const SizedBox(height: 8),

                      // Primary criteria checkboxes
                      ...availableCriteria.map(
                        (criteria) => CheckboxListTile(
                          title: Text(
                            criteriaLabels[criteria] ?? criteria,
                            style: const TextStyle(color: Colors.white),
                          ),
                          subtitle: Text(
                            criteriaDescriptions[criteria] ?? '',
                            style: const TextStyle(
                              color: Colors.white60,
                              fontSize: 11,
                            ),
                          ),
                          value: primaryCriteria == criteria,
                          activeColor: Colors.blue,
                          checkColor: Colors.white,
                          onChanged: (bool? value) {
                            setState(() {
                              if (value == true) {
                                primaryCriteria = criteria;
                                // Clear secondary if same as primary
                                if (secondaryCriteria == criteria) {
                                  secondaryCriteria = null;
                                }
                              } else {
                                primaryCriteria = null;
                              }
                            });
                          },
                        ),
                      ),

                      const SizedBox(height: 16),
                      const Divider(color: Colors.white),

                      // Secondary Stacking Criteria
                      const Text(
                        'Secondary Stacking Criteria (Optional)',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Used for sub-sorting within stacks of the same primary criteria (applies to both systems)',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      const SizedBox(height: 8),

                      // Secondary criteria checkboxes (exclude primary selection)
                      ...availableCriteria
                          .where((criteria) => criteria != primaryCriteria)
                          .map(
                            (criteria) => CheckboxListTile(
                              title: Text(
                                criteriaLabels[criteria] ?? criteria,
                                style: const TextStyle(color: Colors.white),
                              ),
                              subtitle: Text(
                                criteriaDescriptions[criteria] ?? '',
                                style: const TextStyle(
                                  color: Colors.white60,
                                  fontSize: 11,
                                ),
                              ),
                              value: secondaryCriteria == criteria,
                              activeColor: Colors.green,
                              checkColor: Colors.white,
                              onChanged: (bool? value) {
                                setState(() {
                                  if (value == true) {
                                    secondaryCriteria = criteria;
                                  } else {
                                    secondaryCriteria = null;
                                  }
                                });
                              },
                            ),
                          ),

                      const SizedBox(height: 16),
                      const Divider(color: Colors.white),

                      // Stack Height Limit
                      const Text(
                        'Stack Height Limit',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Maximum height: ${stackHeightLimit.toStringAsFixed(1)} units',
                        style: const TextStyle(color: Colors.white70),
                      ),
                      Slider(
                        value: stackHeightLimit,
                        min: 5.0,
                        max: 20.0,
                        divisions: 30,
                        activeColor: Colors.blue,
                        inactiveColor: Colors.grey,
                        onChanged: (double value) {
                          setState(() {
                            stackHeightLimit = value;
                          });
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel', style: TextStyle(color: Colors.white70)),
        ),
        ElevatedButton(
          onPressed: isSaving ? null : _saveConfiguration,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
          child: isSaving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Apply'),
        ),
      ],
    );
  }
}
