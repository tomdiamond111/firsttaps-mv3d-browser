# 🎵 Recommendations System - Quick Start Checklist

## ✅ Completed Setup
- ✅ JSON storage layer created (`recommendations_storage.dart`)
- ✅ API integration services (YouTube, Spotify)
- ✅ Favorites tracking with weighted algorithm
- ✅ Content manager (`recommendation_content_manager.dart`)
- ✅ Preferences UI screen
- ✅ 3D badge JavaScript for visual indicators
- ✅ Configuration file with update schedules
- ✅ Dependencies added to `pubspec.yaml` (uuid added)
- ✅ All SQLite files removed (simplified to JSON)
- ✅ **NEW: Demo content integration helper** (`demo_content_with_recommendations_helper.dart`)

## 📋 Next Steps

### 1. Install Dependencies (REQUIRED)
```bash
flutter pub get
```

### 2. Configure API Keys (REQUIRED)
Edit `lib/config/recommendations_config.dart` and add your API keys:

#### **YouTube Data API v3** (Required):
```dart
static String get youtubeApiKey {
  // Get from: https://console.cloud.google.com/
  return 'AIzaSyC_YOUR_YOUTUBE_API_KEY_HERE';
}
```
- **Free:** 10,000 units/day
- **Get key:** https://console.cloud.google.com/

#### **Last.fm API** (Required for music):
```dart
static String get lastFmApiKey {
  // Get from: https://www.last.fm/api/account/create
  return 'YOUR_LASTFM_API_KEY_HERE';
}
```
- **Free:** 5 million calls/day
- **Get key:** https://www.last.fm/api/account/create
- **No Premium needed!**

#### **Deezer API** (Already works!):
- ✅ No API key required
- ✅ Already enabled by default
- ✅ Just works out of the box

#### **Vimeo API** (Optional):
```dart
static String get vimeoAccessToken {
  // Get from: https://developer.vimeo.com/apps
  return 'YOUR_VIMEO_ACCESS_TOKEN_HERE';
}
```
- **Free:** Public video access
- **Get token:** https://developer.vimeo.com/apps

#### **TikTok/Instagram** (Optional - if you have API source):
```dart
static String get tiktokTrendingApiUrl {
  return 'YOUR_TIKTOK_API_URL'; // If you have one
}

static String get instagramTrendingApiUrl {
  return 'YOUR_INSTAGRAM_API_URL'; // If you have one
}
```

### 3. Integrate with Existing Demo Furniture (REQUIRED)
The easiest way is to use the new integration helper.

**Add to your demo loading code:**
```dart
import 'package:firsttaps_mv3d/helpers/demo_content_with_recommendations_helper.dart';

// Replace existing demo content registration with:
await DemoContentWithRecommendationsHelper.registerRecommendedDemoContent(
  stateManager, // Your StateManagerService instance
  useRecommendations: true, // Set to false to use local files only
  skipIfRegistered: true,
);
```

**Where to add this:**
- In `home_page_controller.dart` (likely in init() or _registerDemoContent() method)
- See `lib/examples/recommendation_integration_example.dart` for complete examples

**What it does:**
- If API keys are set + internet available: Fetches trending content
- Otherwise: Falls back to local demo files automatically
- Creates FileModel objects that work exactly like local files

### 4. Track Link Opens (REQUIRED for Favorites)
Wherever a user clicks/opens a link:
```dart
await contentManager.recordLinkOpen(
  url: 'https://youtube.com/watch?v=abc123',
  title: 'Song Title',
  platform: 'youtube', // or 'spotify'
);
```

### 5. Add Preferences to Settings Menu (OPTIONAL)
In your settings/menu screen:
```dart
import 'package:firsttaps_mv3d/screens/recommendation_preferences_screen.dart';

// Add a button/menu item:
ElevatedButton(
  onPressed: () {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => RecommendationPreferencesScreen()),
    );
  },
  child: Text('Content Preferences'),
)
```

### 6. Load 3D Badges (OPTIONAL)
To show gold "Recommendations" badges on furniture:
1. Include `assets/web/js/recommendation_badges.js` in your HTML
2. After furniture loads, call: `addRecommendationBadge(furnitureObject, 'Gallery Wall')`

### 7. Test the System
```dart
// Test API calls (requires internet)
final service = RecommendationService();
final shorts = await service.fetchTrendingShorts();
print('Got ${shorts.length} trending shorts');

// Test storage
final storage = RecommendationsStorage.instance;
await storage.saveCachedRecommendation('gallery_wall', shorts, DateTime.now());
final cached = await storage.getCachedRecommendation('gallery_wall');
print('Cached ${cached?.data.length} shorts');
```

## 🎯 How It Works

### Content Mapping
- **Gallery Wall** → YouTube trending shorts (24h cache, updates daily)
- **Small Stage** → Spotify top music (5-day cache, updates every 5 days)
- **Riser** → YouTube music videos (5-day cache, updates every 5 days)
- **Bookshelf** → User favorites based on opens (24h cache, updates daily)
- **Amphitheatre** → Mixed variety content (7-day cache, updates weekly)

### Favorites Algorithm
- Tracks when users open links
- Calculates weighted score: `(recency × 0.7) + (frequency × 0.3)`
- Recency: Exponential decay over time (fresher = higher)
- Frequency: Logarithmic scaling (diminishing returns)

### Update Schedule
Updates are staggered to avoid overwhelming users:
- Day 1: Gallery Wall + Bookshelf
- Day 6: Small Stage + Riser
- Day 8: Amphitheatre
- (Repeat cycle)

### Modified Furniture Protection
- System tracks furniture IDs that user has modified
- Will NOT overwrite user's custom furniture
- Use `markFurnitureAsModified(furnitureId)` when user edits furniture

## 📖 Full Documentation
See `RECOMMENDATIONS_JSON_SIMPLE_GUIDE.md` for complete integration details.

## 🔧 Troubleshooting

**Error: "API quota exceeded"**
- YouTube: 10k units/day limit (each request = 1 unit)
- Solution: Reduce fetch frequency or increase cache duration

**Error: "No internet connection"**
- System falls back to cached data automatically
- Cached data expires after configured duration

**Empty results**
- Check API keys are configured correctly
- Verify internet connection
- Check console for API error responses
- Ensure user hasn't disabled all content types in preferences

**Favorites not working**
- Verify `recordLinkOpen()` is called when user opens links
- Check `LinkInteraction` objects are being saved
- Test favorites algorithm with mock data

## 🎉 Ready to Go!
Once you complete steps 1-4 above, the system will automatically:
- Fetch trending content based on update schedules
- Cache results to minimize API calls
- Respect user preferences for genres/categories
- Build personalized favorites over time
- Protect user-modified furniture from updates
