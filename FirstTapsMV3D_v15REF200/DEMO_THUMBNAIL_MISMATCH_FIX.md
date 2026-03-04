##DEMO CONTENT THUMBNAIL MISMATCH ISSUE

### Problem Description
Some demo recommendation link objects show thumbnails that don't match the actual link content.
For example: An object with an Instagram (IG) logo on the front, but the link points to TikTok.

### Root Cause Analysis

#### 1. External URL Thumbnails (TikTok, Instagram, etc.)
- Demo content includes external platform URLs configured in:
  `assets/web/js/modules/furniture/demoContentConfig.js`
  
- These URLs are processed by the URLProcessor which fetches metadata asynchronously:
  ```javascript
  // TikTok example from demoContentConfig.js:
  'https://www.tiktok.com/@tiktok/video/7016050803294422277'
  
  // Instagram example:
  'https://www.instagram.com/reel/CdIxYYqgXYZ/'
  ```

- Thumbnail fetching happens in multiple places:
  1. **Dart side**: `MusicSearchService` has `getTikTokMetadata()` and `getInstagramMetadata()`
  2. **JavaScript side**: `URLProcessor` and `LinkVisualManager` also try to fetch from oEmbed APIs
  
- **Race Condition**: If thumbnails are fetched asynchronously and applied in wrong order, you get mismatches

#### 2. CORS and API Limitations
- TikTok and Instagram have strict CORS policies
- oEmbed endpoints may return HTTP 400/403 errors
- When thumbnail fetch fails, the system falls back to text logos (platform icons)
- If caching is involved, one platform's thumbnail might get cached under the wrong key

#### 3. Demo Content Initialization Flow
1. `defaultFurnitureSpawner.js` reads `DEMO_PLAYLISTS` config
2. For each URL, it calls `urlManager.createLinkFromURL()`
3. URLProcessor attempts to fetch metadata (title, thumbnail)
4. If metadata fetching is deferred (skipMetadata mode), minimal objects are created
5. Background enrichment tries to fetch thumbnails later
6. **Problem**: If enrichment fails or thumbnails get mixed up, wrong images appear

### Diagnostic Steps

1. **Run the diagnostic script** (`demo_thumbnail_diagnostic.js`):
   - Open browser DevTools console
   - Paste and run the script
   - Check which objects have thumbnails and which platforms they belong to

2. **Check console logs** for oEmbed failures:
   ```
   Search for: "TikTok oEmbed" or "Instagram oEmbed"
   Look for: 403, 400, or CORS errors
   ```

3. **Inspect object face textures**:
   - In console, run:
     ```javascript
     const demoObjects = window.app.stateManager.fileObjects.filter(o => o.userData?.isDemoContent);
     demoObjects.forEach(o => {
       console.log(o.userData.fileName, o.userData.url, !!o.userData.thumbnailDataUrl);
     });
     ```

### Solutions

#### Option 1: Use YouTube Shorts Instead (Recommended)
YouTube's API is more reliable and provides consistent thumbnails.

**Edit `demoContentConfig.js`:**
```javascript
shortsAndReels: {
    furnitureType: 'stage_small',
    title: 'Shorts & Reels',
    links: [
        'assets/demomedia/video1_baseball.mp4',
        'assets/demomedia/video2_treelighting.mp4',
        // Replace TikTok/Instagram with YouTube Shorts:
        'https://www.youtube.com/shorts/jNQXAC9IVRw',
        'https://www.youtube.com/shorts/5yx6BWlEVcY',
        'https://www.youtube.com/shorts/abc123def456',  // Add more YouTube Shorts
        'https://www.youtube.com/shorts/xyz789uvw012',
    ]
}
```

#### Option 2: Pre-fetch and Cache TikTok/Instagram Thumbnails in Dart
Modify `DemoAssetLoader` to fetch external URL thumbnails before injecting them.

**Add to `demo_asset_loader.dart`:**
```dart
/// Fetch thumbnail for external URL (bypasses CORS)
static Future<String?> fetchExternalThumbnail(String url) async {
  try {
    final musicSearch = MusicSearchService();
    
    if (url.contains('tiktok.com')) {
      final metadata = await musicSearch.getTikTokMetadata(url);
      if (metadata != null && metadata['thumbnailUrl'] != null) {
        // Download thumbnail and convert to data URL
        final response = await http.get(Uri.parse(metadata['thumbnailUrl']));
        if (response.statusCode == 200) {
          return 'data:image/jpeg;base64,${base64Encode(response.bodyBytes)}';
        }
      }
    } else if (url.contains('instagram.com')) {
      final metadata = await musicSearch.getInstagramMetadata(url);
      if (metadata != null && metadata['thumbnailUrl'] != null) {
        // Download thumbnail and convert to data URL
        final response = await http.get(Uri.parse(metadata['thumbnailUrl']));
        if (response.statusCode == 200) {
          return 'data:image/jpeg;base64,${base64Encode(response.bodyBytes)}';
        }
      }
    }
    
    return null;
  } catch (e) {
    print('Failed to fetch external thumbnail: $e');
    return null;
  }
}
```

#### Option 3: Disable oEmbed and Use Platform Logos Only
If thumbnails are unreliable, use consistent platform logos instead.

**Edit `linkVisualManager.js`:**
```javascript
// In addLogoToTopSurface(), disable thumbnail fetching:
if (domain === 'tiktok.com') {
    // Skip thumbnail fetch, use text logo
    this.applyTextLogo(linkObject, '🎵', category, domain);
    return; // Don't try to fetch thumbnail
}

if (domain === 'instagram.com') {
    // Skip thumbnail fetch, use text logo
    this.applyTextLogo(linkObject, '📸', category, domain);
    return; // Don't try to fetch thumbnail
}
```

#### Option 4: Clear Cache and Reset Demo Content
Sometimes cached incorrect data persists.

```javascript
// In browser console:
localStorage.clear();
location.reload();
```

### Testing After Fix

1. Clear demo content:
   ```javascript
   localStorage.removeItem('mv3d_default_furniture_created');
   location.reload();
   ```

2. Watch console for thumbnail fetch logs
3. Verify each object's thumbnail matches its URL
4. Run diagnostic script again to confirm

### Recommended Approach

**For production**, use Option 1 (YouTube Shorts only) because:
- YouTube API is stable and reliable
- Thumbnails are consistently available
- No CORS issues
- Better user experience

**For testing/development**, use the diagnostic scripts to identify specific mismatches.

### Files to Modify

Primary:
- `assets/web/js/modules/furniture/demoContentConfig.js` - Update demo URLs
- `assets/web/js/modules/visuals/linkVisualManager.js` - Thumbnail fetching logic

Optional (for advanced fixes):
- `lib/services/demo_asset_loader.dart` - Add external URL support
- `lib/services/music_search_service.dart` - Improve metadata fetching
- `assets/web/js/modules/url/urlProcessor.js` - Fix race conditions
