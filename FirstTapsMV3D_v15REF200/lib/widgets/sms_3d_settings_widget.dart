import 'package:flutter/material.dart';
import '../services/sms_3d_mode_service.dart';

/// Widget for 3D SMS settings UI
/// Allows users to customize balloon appearance, sounds, and animations
class Sms3DSettingsWidget extends StatefulWidget {
  final Function(Map<String, dynamic>)? onSettingsChanged;

  const Sms3DSettingsWidget({Key? key, this.onSettingsChanged})
    : super(key: key);

  @override
  State<Sms3DSettingsWidget> createState() => _Sms3DSettingsWidgetState();
}

class _Sms3DSettingsWidgetState extends State<Sms3DSettingsWidget> {
  late Sms3DModeService _service;
  bool _isLoading = true;

  // Settings state
  bool _enabled = false;
  String _colorScheme = 'standard';
  String _textSize = 'medium';
  String _soundPack = 'standard';
  double _soundVolume = 0.5;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  /// Load settings from service
  Future<void> _loadSettings() async {
    _service = await Sms3DModeService.getInstance();

    setState(() {
      _isLoading = true;
    });

    _enabled = await _service.isEnabled();
    _colorScheme = await _service.getColorScheme();
    _textSize = await _service.getTextSize();
    _soundPack = await _service.getSoundPack();
    _soundVolume = await _service.getSoundVolume();

    setState(() {
      _isLoading = false;
    });
  }

  /// Save settings and notify
  Future<void> _saveSettings() async {
    await _service.setEnabled(_enabled);
    await _service.setColorScheme(_colorScheme);
    await _service.setTextSize(_textSize);
    await _service.setSoundPack(_soundPack);
    await _service.setSoundVolume(_soundVolume);

    // Notify parent if callback provided
    if (widget.onSettingsChanged != null) {
      final settings = await _service.getAllSettings();
      widget.onSettingsChanged!(settings);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header
        Text(
          '3D Message Balloons',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(
          'Display messages as floating 3D balloons instead of flat text',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 24),

        // Enable/Disable Switch
        SwitchListTile(
          title: const Text('Enable 3D Mode'),
          subtitle: const Text('Show messages as floating balloons'),
          value: _enabled,
          onChanged: (value) {
            setState(() {
              _enabled = value;
            });
            _saveSettings();
          },
        ),
        const Divider(),

        // Color Scheme Selection
        ListTile(
          title: const Text('Color Scheme'),
          subtitle: Text(_getColorSchemeName(_colorScheme)),
        ),
        _buildColorSchemeSelector(),
        const Divider(),

        // Text Size Selection
        ListTile(
          title: const Text('Text Size'),
          subtitle: Text(_getTextSizeName(_textSize)),
        ),
        _buildTextSizeSelector(),
        const Divider(),

        // Sound Pack Selection
        ListTile(
          title: const Text('Sound Effects'),
          subtitle: Text(_getSoundPackName(_soundPack)),
        ),
        _buildSoundPackSelector(),
        const SizedBox(height: 16),

        // Sound Volume Slider
        ListTile(
          title: const Text('Sound Volume'),
          subtitle: Text('${(_soundVolume * 100).round()}%'),
        ),
        Slider(
          value: _soundVolume,
          min: 0.0,
          max: 1.0,
          divisions: 10,
          label: '${(_soundVolume * 100).round()}%',
          onChanged: (value) {
            setState(() {
              _soundVolume = value;
            });
          },
          onChangeEnd: (value) {
            _saveSettings();
          },
        ),
        const Divider(),

        // Reset Button
        const SizedBox(height: 16),
        ElevatedButton.icon(
          onPressed: () async {
            await _service.resetToDefaults();
            await _loadSettings();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Settings reset to defaults'),
                duration: Duration(seconds: 2),
              ),
            );
          },
          icon: const Icon(Icons.restore),
          label: const Text('Reset to Defaults'),
          style: ElevatedButton.styleFrom(backgroundColor: Colors.grey[700]),
        ),
      ],
    );
  }

  /// Build color scheme selector
  Widget _buildColorSchemeSelector() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildColorSchemeButton(
            'standard',
            'Standard',
            Colors.blue,
            Colors.grey,
          ),
          _buildColorSchemeButton(
            'redBlue',
            'Red/Blue',
            Colors.red,
            Colors.blue,
          ),
          _buildColorSchemeButton(
            'pinkPurple',
            'Pink/Purple',
            Colors.pink,
            Colors.purple,
          ),
          _buildColorSchemeButton(
            'goldSilver',
            'Gold/Silver',
            Colors.amber,
            Colors.grey[300]!,
          ),
        ],
      ),
    );
  }

  /// Build individual color scheme button
  Widget _buildColorSchemeButton(
    String scheme,
    String label,
    Color color1,
    Color color2,
  ) {
    final isSelected = _colorScheme == scheme;
    return Column(
      children: [
        InkWell(
          onTap: () {
            setState(() {
              _colorScheme = scheme;
            });
            _saveSettings();
          },
          child: Container(
            width: 60,
            height: 40,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [color1, color2]),
              border: Border.all(
                color: isSelected ? Colors.white : Colors.grey,
                width: isSelected ? 3 : 1,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  /// Build text size selector
  Widget _buildTextSizeSelector() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: _buildTextSizeButton('small', 'Small', 16),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: _buildTextSizeButton('medium', 'Medium', 20),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: _buildTextSizeButton('large', 'Large', 24),
            ),
          ),
        ],
      ),
    );
  }

  /// Build individual text size button
  Widget _buildTextSizeButton(String size, String label, double fontSize) {
    final isSelected = _textSize == size;
    return ElevatedButton(
      onPressed: () {
        setState(() {
          _textSize = size;
        });
        _saveSettings();
      },
      style: ElevatedButton.styleFrom(
        backgroundColor: isSelected ? Colors.blue : Colors.grey[700],
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      ),
      child: Text(label, style: TextStyle(fontSize: fontSize * 0.7)),
    );
  }

  /// Build sound pack selector
  Widget _buildSoundPackSelector() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildSoundPackButton('none', 'None', Icons.volume_off),
          _buildSoundPackButton('standard', 'Standard', Icons.volume_up),
          _buildSoundPackButton('retro', 'Retro', Icons.videogame_asset),
          _buildSoundPackButton(
            'futuristic',
            'Futuristic',
            Icons.rocket_launch,
          ),
        ],
      ),
    );
  }

  /// Build individual sound pack button
  Widget _buildSoundPackButton(String pack, String label, IconData icon) {
    final isSelected = _soundPack == pack;
    return Column(
      children: [
        IconButton(
          onPressed: () {
            setState(() {
              _soundPack = pack;
            });
            _saveSettings();
          },
          icon: Icon(icon),
          color: isSelected ? Colors.blue : Colors.grey,
          iconSize: 32,
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  // Helper methods for display names
  String _getColorSchemeName(String scheme) {
    switch (scheme) {
      case 'standard':
        return 'Standard (Blue/Grey)';
      case 'redBlue':
        return 'Red & Blue';
      case 'pinkPurple':
        return 'Pink & Purple';
      case 'goldSilver':
        return 'Gold & Silver';
      default:
        return 'Unknown';
    }
  }

  String _getTextSizeName(String size) {
    switch (size) {
      case 'small':
        return 'Small';
      case 'medium':
        return 'Medium';
      case 'large':
        return 'Large';
      default:
        return 'Unknown';
    }
  }

  String _getSoundPackName(String pack) {
    switch (pack) {
      case 'none':
        return 'Silent (No Sounds)';
      case 'standard':
        return 'Standard Tones';
      case 'retro':
        return 'Retro 8-bit';
      case 'futuristic':
        return 'Futuristic Sci-Fi';
      default:
        return 'Unknown';
    }
  }
}
