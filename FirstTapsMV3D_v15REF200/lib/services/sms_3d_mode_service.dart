import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'sms_3d_settings_channel.dart';

/// Service for managing 3D SMS mode settings
/// Bridges Flutter preferences with JavaScript 3D system
class Sms3DModeService {
  static const String _keyEnabled = 'sms_3d_enabled';
  static const String _keyColorScheme = 'sms_3d_color_scheme';
  static const String _keyTextSize = 'sms_3d_text_size';
  static const String _keySoundPack = 'sms_3d_sound_pack';
  static const String _keySoundVolume = 'sms_3d_sound_volume';
  static const String _keyAnimationSpeed = 'sms_3d_animation_speed';

  static Sms3DModeService? _instance;
  SharedPreferences? _prefs;
  Sms3DSettingsChannel? _channel;

  Sms3DModeService._();

  /// Get singleton instance
  static Future<Sms3DModeService> getInstance() async {
    if (_instance == null) {
      _instance = Sms3DModeService._();
      await _instance!._init();
    }
    return _instance!;
  }

  /// Initialize service
  Future<void> _init() async {
    _prefs = await SharedPreferences.getInstance();
    _channel = Sms3DSettingsChannel(this);
    if (kDebugMode) {
      print('📱 SMS 3D Mode Service initialized');
    }
  }

  /// Get the settings channel for WebView integration
  Sms3DSettingsChannel? get channel => _channel;

  /// Check if 3D mode is enabled
  Future<bool> isEnabled() async {
    await _ensureInitialized();
    return _prefs!.getBool(_keyEnabled) ?? false;
  }

  /// Set 3D mode enabled/disabled
  Future<void> setEnabled(bool enabled) async {
    await _ensureInitialized();
    await _prefs!.setBool(_keyEnabled, enabled);
    await _channel?.updateSetting('enabled', enabled);
    if (kDebugMode) {
      print('📱 3D mode ${enabled ? 'enabled' : 'disabled'}');
    }
  }

  /// Get color scheme
  Future<String> getColorScheme() async {
    await _ensureInitialized();
    return _prefs!.getString(_keyColorScheme) ?? 'standard';
  }

  /// Set color scheme
  Future<void> setColorScheme(String scheme) async {
    await _ensureInitialized();
    await _prefs!.setString(_keyColorScheme, scheme);
    await _channel?.updateSetting('colorScheme', scheme);
    if (kDebugMode) {
      print('📱 Color scheme set to: $scheme');
    }
  }

  /// Get text size
  Future<String> getTextSize() async {
    await _ensureInitialized();
    return _prefs!.getString(_keyTextSize) ?? 'medium';
  }

  /// Set text size
  Future<void> setTextSize(String size) async {
    await _ensureInitialized();
    await _prefs!.setString(_keyTextSize, size);
    await _channel?.updateSetting('textSize', size);
    if (kDebugMode) {
      print('📱 Text size set to: $size');
    }
  }

  /// Get sound pack
  Future<String> getSoundPack() async {
    await _ensureInitialized();
    return _prefs!.getString(_keySoundPack) ?? 'standard';
  }

  /// Set sound pack
  Future<void> setSoundPack(String pack) async {
    await _ensureInitialized();
    await _prefs!.setString(_keySoundPack, pack);
    await _channel?.updateSetting('soundPack', pack);
    if (kDebugMode) {
      print('📱 Sound pack set to: $pack');
    }
  }

  /// Get sound volume
  Future<double> getSoundVolume() async {
    await _ensureInitialized();
    return _prefs!.getDouble(_keySoundVolume) ?? 0.5;
  }

  /// Set sound volume
  Future<void> setSoundVolume(double volume) async {
    await _ensureInitialized();
    await _prefs!.setDouble(_keySoundVolume, volume);
    await _channel?.updateSetting('soundVolume', volume);
    if (kDebugMode) {
      print('📱 Sound volume set to: $volume');
    }
  }

  /// Get animation speed
  Future<double> getAnimationSpeed() async {
    await _ensureInitialized();
    return _prefs!.getDouble(_keyAnimationSpeed) ?? 0.5;
  }

  /// Set animation speed
  Future<void> setAnimationSpeed(double speed) async {
    await _ensureInitialized();
    await _prefs!.setDouble(_keyAnimationSpeed, speed);
    await _channel?.updateSetting('animationSpeed', speed);
    if (kDebugMode) {
      print('📱 Animation speed set to: $speed');
    }
  }

  /// Get all settings as JSON (for JavaScript bridge)
  Future<Map<String, dynamic>> getAllSettings() async {
    await _ensureInitialized();

    return {
      'enabled': await isEnabled(),
      'colorScheme': await getColorScheme(),
      'textSize': await getTextSize(),
      'sound': {'pack': await getSoundPack(), 'volume': await getSoundVolume()},
      'animationSpeed': await getAnimationSpeed(),
    };
  }

  /// Set all settings from JSON (for JavaScript bridge)
  Future<void> setAllSettings(Map<String, dynamic> settings) async {
    await _ensureInitialized();

    if (settings.containsKey('enabled')) {
      await setEnabled(settings['enabled']);
    }
    if (settings.containsKey('colorScheme')) {
      await setColorScheme(settings['colorScheme']);
    }
    if (settings.containsKey('textSize')) {
      await setTextSize(settings['textSize']);
    }
    if (settings.containsKey('sound')) {
      final sound = settings['sound'];
      if (sound.containsKey('pack')) {
        await setSoundPack(sound['pack']);
      }
      if (sound.containsKey('volume')) {
        await setSoundVolume(sound['volume']);
      }
    }
    if (settings.containsKey('animationSpeed')) {
      await setAnimationSpeed(settings['animationSpeed']);
    }

    print('📱 All settings updated');
  }

  /// Get settings JSON string (for WebView postMessage)
  Future<String> getSettingsJson() async {
    final settings = await getAllSettings();
    return jsonEncode(settings);
  }

  /// Sync settings to JavaScript (called when settings change)
  Future<void> syncToJavaScript() async {
    // This will be called by the settings widget
    // Implementation depends on your JavaScript bridge setup
    // Example: controller.evaluateJavascript("window.Sms3DSettings.loadFromFlutter($settingsJson)");
    print('📱 Settings synced to JavaScript');
  }

  /// Reset to default settings
  Future<void> resetToDefaults() async {
    await _ensureInitialized();

    await setEnabled(false);
    await setColorScheme('standard');
    await setTextSize('medium');
    await setSoundPack('standard');
    await setSoundVolume(0.5);
    await setAnimationSpeed(0.5);

    print('📱 Settings reset to defaults');
  }

  /// Ensure service is initialized
  Future<void> _ensureInitialized() async {
    if (_prefs == null) {
      await _init();
    }
  }

  /// Dispose (cleanup)
  void dispose() {
    _channel?.dispose();
    if (kDebugMode) {
      print('📱 SMS 3D Mode Service disposed');
    }
  }
}
