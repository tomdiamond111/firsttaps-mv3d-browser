/// Stub for demo_asset_loader (browser version)
/// Loads demo assets and content for the 3D world

class DemoAssetLoader {
  static Future<Map<String, dynamic>> loadDemoContent() async {
    // Return empty demo content for web
    return {'furniture': [], 'links': [], 'contacts': []};
  }

  static Future<List<Map<String, dynamic>>> getDemoFurniture() async {
    return [];
  }

  static Future<List<Map<String, dynamic>>> getDemoLinks() async {
    return [];
  }

  static Future<List<Map<String, dynamic>>> getDemoContacts() async {
    return [];
  }

  static Future<bool> isDemoContentAvailable() async {
    return false;
  }

  static Future<void> clearDemoContent() async {
    // No-op for web
  }

  static Future<Map<String, String>> preloadAllDemoAssets() async {
    // Return empty map for web
    return {};
  }

  static Future<Map<String, String>> preloadAllDemoMedia() async {
    // Return empty map for web
    return {};
  }

  static Future<Map<String, dynamic>> getCacheStats() async {
    // Return empty cache stats for web
    return {
      'totalSize': 0,
      'itemCount': 0,
      'cachedThumbnails': 0,
      'thumbnailSizeMB': 0.0,
      'cachedMedia': 0,
      'mediaSizeMB': 0.0,
      'cachedExternal': 0,
      'externalSizeMB': 0.0,
    };
  }

  static Future<List<String>> prefetchExternalThumbnails(
    List<String> urls,
  ) async {
    // No-op for web - return empty list
    return [];
  }
}
