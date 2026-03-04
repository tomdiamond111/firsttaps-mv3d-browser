# Content Recommendations System - Simplified JSON-Based Implementation

## Overview
This is a simplified recommendations system that uses **JSON persistence** (SharedPreferences) instead of SQLite, and **integrates with your existing demo furniture system** rather than creating separate recommendation furniture entities.

## Key Architectural Changes

### 1. JSON Storage Instead of SQLite
- **No database complexity** - Uses `SharedPreferences` for JSON storage
- **No migrations** - Simple key-value storage
- **No DAOs** - Direct JSON serialization

### 2. Enhances Existing Demo Furniture
- **Replaces local demo files** - Instead of mp3/mp4 files, demo furniture shows trending links
- **Reuses existing furniture** - Gallery Wall, Small Stage, Riser, Bookshelf, Amphitheatre
- **No new furniture types** - Works with what you already have

### 3. Simplified Dependencies
Only need:
- `http` - For API calls (you likely already have this)
- `uuid` - For generating IDs  
- `shared_preferences` - For JSON storage (you likely already have this)

**Removed**:
- ❌ `sqflite` - Not needed with JSON storage
- ❌ `workmanager` - Can use simple scheduled checks instead
- ❌ `path` - Not needed without SQLite

## Files Created

### Core Services
- **recommendations_storage.dart** - JSON persistence using SharedPreferences
- **recommendation_service.dart** - Fetches content from YouTube/Spotify APIs
- **favorites_service_simplified.dart** - Tracks link opens and calculates favorites
- **recommendation_content_manager.dart** - Main manager that provides links for each furniture type

### Models (Same as before)
- **recommendation_preferences.dart** - User preferences
- **link_interaction.dart** - Tracks link opens
- **link_object.dart** - Represents a content link
- **cached_recommendation.dart** - API response caching

### UI & Config
- **recommendation_preferences_screen.dart** - Preferences UI (updated for JSON)
- **recommendations_config.dart** - Configuration constants
- **recommendation_badges.js** - 3D badges (unchanged)

### Files NOT Created
- ❌ No database schema files
- ❌ No database DAO files  
- ❌ No background scheduler (can add later if needed)
- ❌ No separate recommendation furniture entities

## How It Works

### Content Flow

1. **User opens app** →
2. **Check if recommendations enabled** (from SharedPreferences) →
3. **Check if content needs update** (based on last update timestamp) →
4. **Fetch from API or use cached** →
5. **Return links** for furniture

### Furniture Integration

Instead of creating new "recommendation furniture", the system provides **link lists** for existing furniture:

```dart
final manager = RecommendationContentManager();

// Get links for Gallery Wall (replaces demo videos)
final galleryLinks = await manager.getGalleryWallLinks(); // YouTube Shorts

// Get links for Small Stage (replaces demo audio)
final stageLinks = await manager.getSmallStageLinks(); // Spotify/YouTube Music

// Get links for Riser (replaces demo videos)
final riserLinks = await manager.getRiserLinks(); // YouTube Music Videos

// Get links for Bookshelf (user favorites)
final bookshelfLinks = await manager.getBookshelfLinks(); // Based on opens

// Get links for Amphitheatre (mixed content)
final amphiLinks = await manager.getAmphitheatreLinks(); // Various categories
```

### Storage Structure

All data stored as JSON in SharedPreferences:

```dart
// Keys
'recommendation_preferences'   // User settings
'link_interactions'            // Array of interaction objects
'recommendation_cache'         // Map of content type → cached data
'modified_furniture_ids'       // Set of furniture IDs user modified
'last_update_gallery_wall'     // Timestamp
'last_update_small_stage'      // Timestamp
// ... etc
```

## Integration Steps

### 1. Add Dependencies (pubspec.yaml)

```yaml
dependencies:
  http: ^1.1.0                   # API requests (may already have)
  uuid: ^4.2.1                   # UUID generation
  shared_preferences: ^2.2.2     # JSON storage (may already have)
```

### 2. Configure API Keys

Update `lib/config/recommendations_config.dart`:

```dart
static String get youtubeApiKey {
  // Load from secure storage or environment variable
  return 'YOUR_YOUTUBE_API_KEY';
}

static String get spotifyClientId {
  return 'YOUR_SPOTIFY_CLIENT_ID';
}

static String get spotifyClientSecret {
  return 'YOUR_SPOTIFY_CLIENT_SECRET';
}
```

### 3. Replace Demo Content with Recommendations

In your existing demo furniture loading code:

```dart
import 'managers/recommendation_content_manager.dart';

final contentManager = RecommendationContentManager();

// Check if recommendations are enabled
if (await contentManager.isEnabled()) {
  // Load recommendation links instead of local demo files
  final galleryLinks = await contentManager.getGalleryWallLinks();
  
  // Use these links to populate your Gallery Wall furniture
  for (var link in galleryLinks) {
    // Add link to furniture (use your existing furniture system)
    addLinkToFurniture(
      furnitureId: 'gallery_wall_demo',
      url: link.url,
      title: link.title,
      thumbnailUrl: link.thumbnailUrl,
    );
  }
} else {
  // Fall back to local demo files
  loadLocalDemoFiles();
}
```

### 4. Track Link Opens

When user clicks a link anywhere in app:

```dart
import 'managers/recommendation_content_manager.dart';

final contentManager = RecommendationContentManager();

// When user opens a link
await contentManager.recordLinkOpen(
  url: linkUrl,
  title: linkTitle,
  platform: 'youtube', // or 'spotify', etc.
  furnitureId: furnitureId, // optional
);
```

This builds the favorites data for the Bookshelf.

### 5. Add Preferences UI

Add a navigation item to your settings:

```dart
import 'screens/recommendation_preferences_screen.dart';

// In your settings menu
ListTile(
  leading: Icon(Icons.recommend),
  title: Text('Content Recommendations'),
  onTap: () {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => RecommendationPreferencesScreen(),
      ),
    );
  },
),
```

### 6. Optional: Mark Furniture as Modified

If user edits furniture (adds/removes links), mark it as modified so recommendations don't overwrite:

```dart
final contentManager = RecommendationContentManager();

// When user edits furniture
await contentManager.markFurnitureAsModified(furnitureId);

// Later, check if modified
if (await contentManager.isFurnitureModified(furnitureId)) {
  // Don't replace with recommendations
}
```

### 7. Optional: Manual Refresh

Add a refresh button in UI:

```dart
final contentManager = RecommendationContentManager();

// Refresh all content
await contentManager.refreshAllContent();
```

## Update Schedule Logic

Content updates based on intervals:

- **Gallery Wall** (Shorts): Daily (1 day)
- **Small Stage** (Music): Every 5 days
- **Riser** (Music Videos): Every 5 days
- **Bookshelf** (Favorites): Daily (1 day)
- **Amphitheatre** (Mixed): Weekly (7 days)

Manager automatically checks timestamps and only fetches if needed.

## Testing

### Test API Calls

```dart
final service = RecommendationService();

// Test YouTube Shorts
final shorts = await service.fetchTrendingShorts();
print('Fetched ${shorts.length} shorts: ${shorts.map((s) => s.title).join(", ")}');

// Test Spotify Music
final music = await service.fetchTrendingMusic();
print('Fetched ${music.length} music tracks');

// Test favorites
final favService = FavoritesService();
await favService.recordLinkOpen(
  url: 'https://youtube.com/test',
  title: 'Test Video',
  platform: 'youtube',
);

final favorites = await favService.getFavorites();
print('Got ${favorites.length} favorites');
```

### Test Storage

```dart
final storage = RecommendationsStorage.instance;

// Test preferences
final prefs = await storage.getPreferences();
print('Recommendations enabled: ${prefs.enabled}');

// Test interactions
final interactions = await storage.getInteractions();
print('Total interactions: ${interactions.length}');

// Test cache
final cache = await storage.getCache();
print('Cached content types: ${cache.keys.join(", ")}');
```

## Background Updates (Optional)

Since we removed WorkManager, you have options:

### Option A: Check on App Launch
```dart
void main() async {
  // ...initialization...
  
  final contentManager = RecommendationContentManager();
  // Check if content needs refresh
  await contentManager.refreshAllContent();
  
  runApp(MyApp());
}
```

### Option B: Add WorkManager Later
If you need true background updates, add `workmanager` package later.

### Option C: Use Flutter's Background Fetch
Simpler than WorkManager for periodic checks.

## API Quotas & Costs

### YouTube Data API v3
- **Free**: 10,000 units/day
- **Cost of operations**:
  - `videos.list`: 1 unit per call
  - Can make ~10,000 calls/day
- **For 1000 users**: ~10 calls per user before hitting limit

### Spotify Web API
- **Free**: Unlimited for public playlists
- No quotas for Client Credentials flow
- No cost

### Strategy to Stay Under Limits
- Cache aggressively (24 hours for shorts, 5-7 days for music)
- Batch updates (update content once for all users)
- Use reasonable `maxResults` limits

## Advantages of This Approach

✅ **Simpler** - No database migrations, no complex DAO layer  
✅ **Lighter** - Fewer dependencies  
✅ **Easier to maintain** - JSON is easy to inspect and debug  
✅ **Integrates with existing code** - Works with your demo furniture system  
✅ **Gradual adoption** - Can enable/disable per furniture type  
✅ **No local media files needed** - All content from web APIs

## Quick Start Summary

1. `flutter pub add uuid http shared_preferences` (if not already added)
2. Configure API keys in `recommendations_config.dart`
3. In furniture loading code:
   ```dart
   final manager = RecommendationContentManager();
   final links = await manager.getGalleryWallLinks();
   // Use links instead of loading from assets/demomedia/
   ```
4. Track link opens for favorites:
   ```dart
   await manager.recordLinkOpen(url: url, title: title, platform: 'youtube');
   ```
5. Add preferences screen to settings menu
6. Done!

## File Locations

```
lib/
  config/
    recommendations_config.dart
  managers/
    recommendation_content_manager.dart
  models/
    cached_recommendation.dart
    link_interaction.dart
    link_object.dart
    recommendation_preferences.dart
  screens/
    recommendation_preferences_screen.dart
  services/
    favorites_service_simplified.dart
    recommendation_service.dart
    recommendations_storage.dart

assets/web/js/
  recommendation_badges.js
```

## Next Steps

1. Test the API integration
2. Replace local demo files with recommendation links
3. Add preferences UI to your app
4. Test favorites tracking
5. Add visual indicators (badges) to 3D furniture
6. Deploy!

---

This simplified approach gives you all the benefits of content recommendations without the complexity of SQLite and WorkManager. It integrates seamlessly with your existing JSON-based architecture.
