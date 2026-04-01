# Content Recommendation System - Browser Implementation

## 🎯 Overview

The browser app now includes a complete multi-platform content recommendation system with:

- **13 Platform-Specific Fetch Methods** for selective cache replenishment
- **Aggressive Caching** (2-14 days) to minimize YouTube API quota usage
- **Selective Platform Fetching** - only fetches from insufficient platforms
- **Content Preference Learning** - automatically filters disliked content
- **Multi-Platform Support** - YouTube, Vimeo, Dailymotion, Spotify, Deezer, SoundCloud, TikTok, Instagram

---

## 📁 New Files Created

### Service Files (`assets/web/js/modules/services/`)

1. **recommendationsConfig.js** - Configuration constants
   - Platform identifiers
   - Cache durations (48h shorts, 168h music, 336h videos)
   - API endpoints
   - Platform minimums for selective fetching

2. **recommendationsStorage.js** - localStorage-based caching
   - Stores recommendation data with expiration timestamps
   - Cache validation and cleanup
   - Cache statistics

3. **recommendationService.js** - Core API fetching service
   - 13 platform-specific public methods
   - YouTube API integration (quota-optimized)
   - Preference-based filtering integration
   - Metadata caching for dislike tracking

4. **contentPreferenceLearningService.js** - User preference learning
   - Tiered blocking system (soft/hard blocks)
   - Pattern detection from dislikes
   - Automatic content filtering
   - Language, channel, artist, keyword filtering

5. **recommendationContentManager.js** - Content manager for furniture
   - Multi-platform cache checking
   - Selective platform fetching
   - Cache merging (preserves existing content)
   - 3 furniture-specific methods:
     - `getGalleryWallLinks()` - 10 slots (shorts)
     - `getSmallStageLinks()` - 30 slots (music audio)
     - `getRiserLinks()` - 15 slots (music videos)

### Updated Files

6. **demoContentConfig.js** - Enhanced with API integration
   - `getContentForFurniture()` function for API+fallback
   - Merges API content with hardcoded fallbacks
   - Platform detection from URLs

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                          │
│                  (3D Furniture Objects)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              demoContentConfig.js                           │
│     getContentForFurniture(furnitureType, forceRefresh)    │
│     - Gallery Wall → getGalleryWallLinks()                  │
│     - Small Stage → getSmallStageLinks()                    │
│     - Riser → getRiserLinks()                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│        RecommendationContentManager                         │
│  - Multi-platform cache checking (per platform counts)     │
│  - Selective fetching (only insufficient platforms)        │
│  - Cache merging (preserves existing content)              │
└────────┬─────────────────────┬──────────────────────────────┘
         │                     │
         ↓                     ↓
┌──────────────────┐  ┌──────────────────────────────────────┐
│ RecommendationsStorage│  │   RecommendationService               │
│ (localStorage)     │  │ - fetchYouTubeShortsOnly()          │
│ - getCached()      │  │ - fetchVimeoShortsOnly()            │
│ - saveCached()     │  │ - fetchDailymotionShortsOnly()      │
│ - deleteCached()   │  │ - fetchSpotifyTracksOnly()          │
└──────────────────┘  │ - fetchDeezerTracksOnly()           │
                      │ - fetchSoundCloudTracksOnly()       │
                      │ - + 7 more platform methods         │
                      └─────────┬────────────────────────────┘
                                │
                                ↓
                      ┌──────────────────────────────────────┐
                      │ ContentPreferenceLearningService     │
                      │ - recordDislike(metadata)            │
                      │ - shouldFilterContent(metadata)      │
                      │ - Tiered blocking (soft 70%, hard 100%)│
                      └──────────────────────────────────────┘
```

---

## 🔑 API Key Configuration

### For Browser App

1. Create a `.env` file or configure `window.ENV` object:

```javascript
window.ENV = {
  YOUTUBE_API_KEY: 'your_youtube_api_key_here',
  VIMEO_ACCESS_TOKEN: 'your_vimeo_token_here',
  SOUNDCLOUD_CLIENT_ID: 'your_soundcloud_client_id',
  GITHUB_TOKEN: 'your_github_token_here'
};
```

2. Or load from environment variables server-side

### API Keys Removed

✅ **All API keys have been removed from:**
- `FirstTapsMV3D_v15REFNEW/.env.local` (reference folder)
- `FirstTapsMV3D_v15REFNEW/lib/config/recommendations_config.dart`
- Replaced with placeholders or environment variable loading

---

## 📊 Quota Optimization Strategy

### Before (Old System)
```
Gallery Wall refresh → Fetches ALL platforms
- YouTube: 100 API units
- Vimeo: 1 API call
- Dailymotion: 1 API call
Total: 100+ units WASTED if platforms already cached
```

### After (New System)
```
Gallery Wall refresh → Checks each platform:
- YouTube: 25/12 ✅ Sufficient (no fetch)
- Vimeo: 3/4 ❌ Insufficient (fetch only Vimeo)
- Dailymotion: 12/4 ✅ Sufficient (no fetch)
Result: 0 YouTube units, 1 Vimeo call
💰 SAVED: 100 YouTube API units
```

### Cache Durations
- **Shorts** (Gallery Wall): 48 hours → 75% quota savings
- **Music** (Small Stage): 168 hours (7 days) → 83% quota savings
- **Music Videos** (Riser): 336 hours (14 days) → 93% quota savings

---

## 🎯 Furniture Type Configurations

### Gallery Wall (10 slots)
**Target Distribution:**
- 6 YouTube Shorts
- 2 Vimeo Shorts
- 2 Dailymotion Videos

**Minimum Pool Sizes** (2x buffer):
- YouTube: 12 videos
- Vimeo: 4 videos
- Dailymotion: 4 videos

### Small Stage (30 slots)
**Target Distribution:**
- 9 YouTube Music Audio
- 7 Spotify Tracks
- 7 Deezer Tracks
- 7 SoundCloud Tracks

**Minimum Pool Sizes:**
- YouTube: 18 tracks
- Spotify: 14 tracks
- Deezer: 14 tracks
- SoundCloud: 14 tracks

### Riser (15 slots)
**Target Distribution:**
- 10 YouTube Music Videos
- 3 Vimeo Music Videos
- 2 Dailymotion Music Videos

**Minimum Pool Sizes:**
- YouTube: 20videos
- Vimeo: 6 videos
- Dailymotion: 4 videos

---

## 🔧 Usage Examples

### Basic Usage (with API integration)

```javascript
// Initialize services (once on app load)
await window.contentPreferenceLearningService.initialize();

// Get content for Gallery Wall
const galleryLinks = await window.getContentForFurniture('gallery_wall', false);
console.log(`Loaded ${galleryLinks.length} links for Gallery Wall`);

// Force refresh (selective fetching will occur)
const freshLinks = await window.getContentForFurniture('gallery_wall', true);

// Get content for Small Stage
const stageLinks = await window.getContentForFurniture('stage_small', false);

// Get content for Riser
const riserLinks = await window.getContentForFurniture('riser', false);
```

### Recording Dislikes

```javascript
// When user dislikes content
const metadata = {
  title: 'Video Title - Artist Name',
  channelTitle: 'Channel Name',
  language: 'en',
  tags: ['music', 'pop', 'trending'],
  categoryId: '10'
};

await window.contentPreferenceLearningService.recordDislike(metadata);
// After 3+ dislikes of same channel, it will be soft-blocked (70% filter)
// After 6+ dislikes, it will be hard-blocked (100% filter)
```

### Cache Management

```javascript
// Get cache statistics
const stats = await window.recommendationsStorage.getCacheStats();
console.log('Cache stats:', stats);

// Clear all caches (force fresh fetch on next load)
await window.recommendationsStorage.clearAllCaches();

// Clear specific cache
await window.recommendationsStorage.deleteCachedRecommendation('shorts');
```

---

## 📝 Implementation Checklist

- [x] Created `recommendationsConfig.js` with all constants
- [x] Created `recommendationsStorage.js` with localStorage caching
- [x] Created `recommendationService.js` with 13 platform methods
- [x] Created `contentPreferenceLearningService.js` with preference learning
- [x] Created `recommendationContentManager.js` with selective fetching
- [x] Updated `demoContentConfig.js` with API integration
- [x] Removed all exposed API keys from reference folder
- [x] Updated Dart config to use environment variables

---

## 🔍 Testing the System

### 1. Load the Page
```javascript
// Check if services loaded
console.log('Config:', window.RecommendationsConfig);
console.log('Storage:', window.recommendationsStorage);
console.log('Service:', window.recommendationService);
console.log('Manager:', window.recommendationContentManager);
console.log('Preferences:', window.contentPreferenceLearningService);
```

### 2. Test Cache
```javascript
// Get Gallery Wall content (should cache)
const links = await window.getContentForFurniture('gallery_wall', false);
console.log('Fetched:', links.length);

// Check cache stats
const stats = await window.recommendationsStorage.getCacheStats();
console.log('Cache:', stats);

// Refresh (should use cache if sufficient)
const refreshed = await window.getContentForFurniture('gallery_wall', true);
console.log('Check console for selective fetch logs');
```

### 3. Test Preference Learning
```javascript
// Initialize
await window.contentPreferenceLearningService.initialize();

// Record dislikes
for (let i = 0; i < 6; i++) {
  await window.contentPreferenceLearningService.recordDislike({
    channelTitle: 'Test Channel',
    language: 'es',
    title: 'Test Video',
    tags: ['test']
  });
}

// Check filters
const stats = window.contentPreferenceLearningService.getFilterStats();
console.log('Filter stats:', stats);
```

---

## 🎨 Expected Console Logs

### Successful Selective Fetch
```
[RecommendationContentManager] getGalleryWallLinks() called (forceRefresh: true)
[RecommendationsStorage] ✅ Valid cache found for shorts (22 items)
[RecommendationContentManager] Cache returned 22 links
[RecommendationContentManager] 🎬 Multi-platform cache: YouTube: 25/12 ✅, Vimeo: 3/4 ❌, Dailymotion: 12/4 ✅
[RecommendationContentManager] 🔄 Gallery refresh + insufficient platforms [Vimeo] - selective fetching...
[RecommendationService] 📊 [SELECTIVE] Fetching Vimeo shorts only...
[RecommendationService] 📊 [SELECTIVE] Vimeo returned 4 shorts
[RecommendationContentManager] 📊 Fetched 4 Vimeo shorts to replenish pool
[RecommendationContentManager] ✅ Selective fetch: 4 new + 22 cached = 26 total
[RecommendationsStorage] ✅ Saved 26 items to cache: shorts
```

### All Platforms Sufficient (Quota Saved)
```
[RecommendationContentManager] 🎬 Multi-platform cache: YouTube: 25/12 ✅, Vimeo: 10/4 ✅, Dailymotion: 12/4 ✅
[RecommendationContentManager] ♻️ Gallery refresh but all platforms sufficient - reusing cache (0 API calls)
[RecommendationContentManager] 💰 Quota saved - Pool extras: YouTube +13, Vimeo +6, Dailymotion +8
```

---

## 🚀 Next Steps

1. **Configure API Keys**: Set up your API keys in the browser environment
2. **Load Services**: Include all service files in your HTML/bundle
3. **Initialize**: Call initialization methods on app startup
4. **Test**: Verify selective fetching and caching in console
5. **Monitor**: Check cache stats and quota usage

---

## 📚 Key Differences from Flutter Implementation

| Feature | Flutter (Dart) | Browser (JavaScript) |
|---------|---------------|---------------------|
| Storage | SharedPreferences (JSON) | localStorage (JSON) |
| Async | async/await (Future) | async/await (Promise) |
| Type Safety | Strong typing | Duck typing |
| Caching | Duration objects | Milliseconds |
| API Keys | Environment variables (--dart-define) | window.ENV object |
| Platform Detection | Built-in | Manual URL parsing |

---

## ⚠️ Important Notes

1. **API Keys**: Never commit API keys to git. Use environment variables or secure config.
2. **CORS**: YouTube API requires proper origin configuration in Google Cloud Console.
3. **Quotas**: Monitor your YouTube API quota at [Google Cloud Console](https://console.cloud.google.com).
4. **Testing**: Test with small cache durations first (e.g., 1 hour) for development.
5. **Production**: Increase cache durations in production to minimize API usage.

---

## 📞 Support

For issues or questions:
1. Check browser console for detailed logs (all services log their actions)
2. Verify API keys are properly configured
3. Check cache stats: `await window.recommendationsStorage.getCacheStats()`
4. Clear caches if needed: `await window.recommendationsStorage.clearAllCaches()`

---

**Last Updated**: March 10, 2026  
**System Version**: v1.0 (Browser Implementation)
