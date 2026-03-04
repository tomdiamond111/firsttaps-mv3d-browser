# 🎵 Recommendations System Integration Guide

## Overview
The recommendations system is now ready to integrate with your demo furniture. This guide will walk you through enabling trending content from YouTube and Spotify in your 3D world.

## Current Status ✅

### What's Complete:
- ✅ JSON storage layer (no SQLite)
- ✅ YouTube & Spotify API integration
- ✅ Favorites tracking with weighted algorithm
- ✅ Content manager for all furniture types
- ✅ Preferences UI screen
- ✅ 3D badge JavaScript
- ✅ Configuration system
- ✅ **NEW: Demo content integration helper**
- ✅ Dependencies installed (uuid, http, shared_preferences)

### Integration Architecture:
```
Demo Furniture → DemoContentWithRecommendationsHelper
                 ↓
                 RecommendationContentManager (manages cache, API calls)
                 ↓
                 ├── YouTube API (shorts, music videos)
                 ├── Spotify API (music tracks)
                 └── Favorites Service (personalized)
                 ↓
                 FileModel list (seamlessly replaces local demo files)
```

## Step-by-Step Integration

### Step 1: Get API Keys

#### YouTube Data API v3 (Required for videos/shorts)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services** → **Library**
4. Search for "YouTube Data API v3" and enable it
5. Go to **Credentials** → **Create Credentials** → **API Key**
6. Copy your API key (looks like: `AIzaSyC...`)
7. **Free quota: 10,000 units/day** (each video fetch = ~1 unit)

#### Spotify Web API (Required for music)
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with Spotify account (create free account if needed)
3. Click **Create App**
4. Fill in details (name, description, redirect URI can be `http://localhost`)
5. Accept terms and create
6. Copy **Client ID** and **Client Secret**
7. **Free quota: Unlimited** for public playlists

### Step 2: Configure API Keys

Edit `lib/config/recommendations_config.dart`:

```dart
class RecommendationsConfig {
  // YouTube Data API v3
  static String get youtubeApiKey {
    const key = String.fromEnvironment('YOUTUBE_API_KEY', defaultValue: '');
    if (key.isEmpty) {
      // Add your YouTube API key here:
      return 'AIzaSyC_YOUR_YOUTUBE_API_KEY_HERE';
    }
    return key;
  }

  static String get spotifyClientId {
    const id = String.fromEnvironment('SPOTIFY_CLIENT_ID', defaultValue: '');
    if (id.isEmpty) {
      // Add your Spotify Client ID here:
      return 'YOUR_SPOTIFY_CLIENT_ID_HERE';
    }
    return id;
  }

  static String get spotifyClientSecret {
    const secret = String.fromEnvironment('SPOTIFY_CLIENT_SECRET', defaultValue: '');
    if (secret.isEmpty) {
      // Add your Spotify Client Secret here:
      return 'YOUR_SPOTIFY_CLIENT_SECRET_HERE';
    }
    return secret;
  }
  
  // ... rest of config
}
```

**Security Note:** For production, use environment variables or secure storage instead of hardcoded keys.

### Step 3: Enable Recommendations in Demo Loading

Find where demo content is registered in your app (likely in `home_page_controller.dart` around line 100-130).

**Look for this pattern:**
```dart
import 'package:firsttaps_mv3d/helpers/demo_content_helper.dart';

// In _registerDemoContent() or similar method:
await DemoContentHelper.registerDemoContent(_stateManager.files);
// or
DemoContentHelper.registerDemoContentSync(_stateManager, skipIfRegistered: true);
```

**Replace with:**
```dart
import 'package:firsttaps_mv3d/helpers/demo_content_with_recommendations_helper.dart';

// In _registerDemoContent() or similar method:
await DemoContentWithRecommendationsHelper.registerRecommendedDemoContent(
  _stateManager,
  useRecommendations: true, // Set to false to use local files only
  skipIfRegistered: true,
);
```

### Step 4: Track User Interactions (Optional but Recommended)

To enable the personalized favorites system, track when users open/play content:

Find where your app plays videos or music (e.g., when user taps a furniture item), and add:

```dart
import 'package:firsttaps_mv3d/helpers/demo_content_with_recommendations_helper.dart';

// When user clicks/plays a link:
await DemoContentWithRecommendationsHelper.recordLinkOpen(
  url: fileModel.path, // The streaming URL
  title: fileModel.name, // The content title
  platform: 'youtube', // or 'spotify'
);
```

This feeds the weighted favorites algorithm (70% recency, 30% frequency).

### Step 5: Add Preferences UI (Optional)

Let users customize what content they see:

**In your settings/menu screen:**
```dart
import 'package:firsttaps_mv3d/screens/recommendation_preferences_screen.dart';

// Add a button or list item:
ListTile(
  leading: Icon(Icons.tune),
  title: Text('Content Preferences'),
  subtitle: Text('Customize recommendations'),
  onTap: () {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => RecommendationPreferencesScreen(),
      ),
    );
  },
)
```

Users can then:
- Toggle music genres (Pop, Rock, Hip-Hop, Electronic, etc.)
- Toggle video categories (Music, Entertainment, Gaming, etc.)
- Choose content types (Videos, Shorts, Music)

### Step 6: Test the Integration

**Test with API keys configured:**
```dart
// Check if recommendations are enabled:
final enabled = DemoContentWithRecommendationsHelper.areRecommendationsEnabled;
print('Recommendations enabled: $enabled');

// Fetch content manually:
final content = await DemoContentWithRecommendationsHelper.fetchRecommendedContent();
print('Fetched categories: ${content.keys}');
for (final entry in content.entries) {
  print('${entry.key}: ${entry.value.length} files');
}
```

**Expected output (with internet and valid API keys):**
```
Recommendations enabled: true
Fetched categories: [gallery_wall, small_stage, riser, bookshelf, amphitheatre]
gallery_wall: 9 files     ← YouTube shorts
small_stage: 7 files      ← Spotify music
riser: 12 files           ← YouTube music videos
bookshelf: 15 files       ← User favorites
amphitheatre: 20 files    ← Mixed content
```

## Content Update Schedule

Once enabled, content automatically refreshes on these schedules:

| Furniture Type | Content Source | Update Interval | Cache Duration |
|----------------|----------------|-----------------|----------------|
| **Gallery Wall** | YouTube trending shorts | Daily | 24 hours |
| **Small Stage** | Spotify top tracks | Every 5 days | 5 days |
| **Riser** | YouTube music videos | Every 5 days | 5 days |
| **Bookshelf** | User favorites (algorithm) | Daily | 24 hours |
| **Amphitheatre** | Mixed variety | Weekly | 7 days |

Updates are **staggered** to avoid overwhelming users with changes all at once.

## API Quota Management

### YouTube Quota Usage
- **Daily limit:** 10,000 units
- **Typical usage:**
  - Fetch 50 trending videos: ~1 unit
  - Fetch video details: ~1 unit per video
- **Optimization:** Results are cached, so fetches only happen when cache expires
- **Estimated usage:** ~10-50 units/day (well under limit)

### Spotify Quota
- **No rate limits** for public playlist access
- Unlimited fetches from Top 50, Viral 50 playlists

## Troubleshooting

### Issue: "No recommendations fetched"
**Causes:**
- API keys not configured
- No internet connection
- API quota exceeded (YouTube)
- Invalid API credentials

**Solution:**
- Check keys in `recommendations_config.dart`
- Verify internet connection
- Check console logs for specific API errors
- System automatically falls back to local demo files

### Issue: "Favorites not updating"
**Cause:** `recordLinkOpen()` not being called

**Solution:** Add tracking calls where users play/open content (see Step 4)

### Issue: "Content not refreshing"
**Cause:** Cache hasn't expired yet

**Solution:**
- Wait for cache expiration (24h for shorts, 5 days for music, etc.)
- Or manually clear cache in code

### Issue: "Empty content categories"
**Cause:** User disabled all content types in preferences

**Solution:** Check preferences screen, ensure at least some categories are enabled

## Next Steps

1. ✅ **Get API keys** (YouTube, Spotify)
2. ✅ **Configure keys** in [recommendations_config.dart](lib/config/recommendations_config.dart)
3. ✅ **Update demo loading** in [home_page_controller.dart](lib/controllers/home_page_controller.dart) to use `DemoContentWithRecommendationsHelper`
4. ✅ **Add interaction tracking** where content is played
5. ⏳ **Test with internet** to verify API calls work
6. ⏳ **Test offline** to verify fallback works
7. ⏳ **Add preferences UI** to settings menu (optional)

## Success Criteria

You'll know it's working when:
- ✅ App launches successfully with or without internet
- ✅ Demo furniture has **trending YouTube/Spotify content** instead of local files
- ✅ Content **updates automatically** based on schedule
- ✅ User favorites **appear in Bookshelf** after playing content
- ✅ **No errors** in console related to recommendations
- ✅ App **falls back gracefully** when offline or APIs unavailable

---

**Need help?** Check console logs for detailed debugging info. All recommendation operations log their status with emoji prefixes:
- 🎵 = Info/Progress
- ✅ = Success
- ⚠️ = Warning/Fallback
- ❌ = Error
