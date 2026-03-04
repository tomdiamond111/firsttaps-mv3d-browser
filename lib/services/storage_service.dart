import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Storage Service for browser version
/// Uses localStorage (via shared_preferences) to persist data
/// No backend or sign-in required - all data stored locally in browser
class StorageService extends ChangeNotifier {
  SharedPreferences? _prefs;
  bool _initialized = false;

  bool get isInitialized => _initialized;

  Future<void> initialize() async {
    try {
      _prefs = await SharedPreferences.getInstance();
      _initialized = true;
      print('💾 Storage Service initialized (using localStorage)');
    } catch (e) {
      print('❌ Storage Service initialization failed: $e');
      _initialized = false;
    }
  }

  /// Save furniture configuration
  Future<bool> saveFurniture(
    String furnitureId,
    Map<String, dynamic> data,
  ) async {
    if (!_initialized || _prefs == null) return false;

    try {
      final key = 'furniture_$furnitureId';
      final json = jsonEncode(data);
      await _prefs!.setString(key, json);
      notifyListeners();
      return true;
    } catch (e) {
      print('❌ Error saving furniture: $e');
      return false;
    }
  }

  /// Load furniture configuration
  Map<String, dynamic>? loadFurniture(String furnitureId) {
    if (!_initialized || _prefs == null) return null;

    try {
      final key = 'furniture_$furnitureId';
      final json = _prefs!.getString(key);
      if (json == null) return null;
      return jsonDecode(json) as Map<String, dynamic>;
    } catch (e) {
      print('❌ Error loading furniture: $e');
      return null;
    }
  }

  /// Get all furniture IDs
  List<String> getAllFurnitureIds() {
    if (!_initialized || _prefs == null) return [];

    final keys = _prefs!.getKeys();
    return keys
        .where((key) => key.startsWith('furniture_'))
        .map((key) => key.substring('furniture_'.length))
        .toList();
  }

  /// Delete furniture
  Future<bool> deleteFurniture(String furnitureId) async {
    if (!_initialized || _prefs == null) return false;

    try {
      final key = 'furniture_$furnitureId';
      await _prefs!.remove(key);
      notifyListeners();
      return true;
    } catch (e) {
      print('❌ Error deleting furniture: $e');
      return false;
    }
  }

  /// Save app settings
  Future<bool> saveSetting(String key, dynamic value) async {
    if (!_initialized || _prefs == null) return false;

    try {
      if (value is String) {
        await _prefs!.setString(key, value);
      } else if (value is int) {
        await _prefs!.setInt(key, value);
      } else if (value is double) {
        await _prefs!.setDouble(key, value);
      } else if (value is bool) {
        await _prefs!.setBool(key, value);
      } else {
        await _prefs!.setString(key, jsonEncode(value));
      }
      notifyListeners();
      return true;
    } catch (e) {
      print('❌ Error saving setting: $e');
      return false;
    }
  }

  /// Load app setting
  T? loadSetting<T>(String key, {T? defaultValue}) {
    if (!_initialized || _prefs == null) return defaultValue;

    try {
      if (T == String) {
        return (_prefs!.getString(key) ?? defaultValue) as T?;
      } else if (T == int) {
        return (_prefs!.getInt(key) ?? defaultValue) as T?;
      } else if (T == double) {
        return (_prefs!.getDouble(key) ?? defaultValue) as T?;
      } else if (T == bool) {
        return (_prefs!.getBool(key) ?? defaultValue) as T?;
      } else {
        final json = _prefs!.getString(key);
        if (json == null) return defaultValue;
        return jsonDecode(json) as T?;
      }
    } catch (e) {
      print('❌ Error loading setting: $e');
      return defaultValue;
    }
  }

  /// Clear all data
  Future<bool> clearAll() async {
    if (!_initialized || _prefs == null) return false;

    try {
      await _prefs!.clear();
      notifyListeners();
      print('🗑️ All data cleared from localStorage');
      return true;
    } catch (e) {
      print('❌ Error clearing data: $e');
      return false;
    }
  }

  /// Get storage usage info (for display purposes)
  Map<String, dynamic> getStorageInfo() {
    if (!_initialized || _prefs == null) {
      return {'error': 'Storage not initialized'};
    }

    final keys = _prefs!.getKeys();
    final furnitureCount = keys.where((k) => k.startsWith('furniture_')).length;

    return {
      'total_keys': keys.length,
      'furniture_count': furnitureCount,
      'settings_count': keys.length - furnitureCount,
    };
  }
}
