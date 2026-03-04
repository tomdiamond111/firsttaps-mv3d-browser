# User Activity Tracking & Personalized Recommendations Implementation

**Date**: February 23, 2026  
**Status**: ✅ Fully Implemented & Ready to Test

## Overview

Implemented a complete user activity tracking system that powers personalized music and video recommendations based on user behavior. The bookshelf furniture now displays **real user favorites** mixed with **AI-generated recommendations** based on what the user actually watches and listens to.

---

## What Was Implemented

### 1. **User Activity Tracking System (Flutter)**

#### New Services Created:
- **`lib/services/user_activity_service.dart`**
  - Tracks every link the user opens (URL, title, platform, play count)
  - Stores data in JSON via SharedPreferences
  - Provides methods to get:
    - Most played links (for bookshelf favorites)
    - Recently played links (last 7 days)
    - Top artists (extracted from link titles)
    - Top platforms (YouTube, Spotify, Deezer, etc.)
    - Low engagement content (for future auto-removal)

- **`lib/services/similar_content_service.dart`**
  - Fetches related/similar content from platform APIs
  - **YouTube API**: 
    - Related videos based on what user watched
    - Search by artist name
  - **Deezer API**: 
    - Related artists
    - Top tracks from artist
  - **Dailymotion API**: 
    - Search videos by artist
  - **Vimeo API**: 
    - Search videos by artist
    - Uses your existing access token
  - **Personalized recommendations**: Combines data from multiple platforms based on user's top artists and favorite URLs

---

### 2. **JavaScript Integration**

#### Updated Files:

**`assets/web/js/modules/interaction/linkInteractionManager.js`**
- Enhanced `handleLinkDoubleClick()` to extract:
  - Link title
  - Platform (YouTube, Spotify, Deezer, etc.)
  - Furniture ID (where link was accessed from)
- Added `detectPlatformFromUrl()` method
- Added `recordUserActivity()` to send data to Flutter via `UserActivityChannel`
- Updated `trackLinkOpening()` to include full metadata

**`assets/web/js/modules/furniture/dynamicContentGenerator.js`**
- **Rewrote `generateMostPlayedContent()`**:
  - Was a placeholder returning fallback content
  - Now fetches **real user favorites** from Flutter
  - Calculates 60/40 split: 60% favorites + 40% recommendations
  - Requests personalized recommendations based on user activity
- Added `getUserFavorites()` - communicates with Flutter to get top played links
- Added `getRecommendationsBasedOnFavorites()` - gets AI recommendations
- Made `generateContentConfig()` async to handle the new promise-based system

---

### 3. **Flutter-JavaScript Communication Channel**

**`lib/screens/helpers/three_js_javascript_channels.dart`**
- Added `UserActivityChannel` JavaScriptChannel
- Handles 3 types of requests from JavaScript:
  1. **`recordLinkActivity`**: Records when user opens a link
  2. **`getUserFavorites`**: Returns user's most played links
  3. **`getRecommendations`**: Generates personalized recommendations using:
     - User's top 5 artists
     - User's recently played URLs
     - YouTube related videos
     - Deezer similar artists
     - Dailymotion content
- Uses CustomEvents to respond back to JavaScript with data

---

## How It Works (User Flow)

### **When User Opens a Link:**

1. **User double-taps a link** on furniture in the 3D world
2. **JavaScript** (`linkInteractionManager.js`):
   - Extracts URL, title, platform
   - Opens the link in external browser
   - Calls `recordUserActivity()` with metadata
3. **Flutter** (`UserActivityService`):
   - Receives activity data via `UserActivityChannel`
   - Increments play count for that link
   - Stores to JSON (SharedPreferences)
   - Updates last played timestamp

### **When Bookshelf Loads/Refreshes:**

1. **JavaScript** (`dynamicContentGenerator.js`):
   - Bookshelf furniture strategy is `MOST_PLAYED`
   - Calls `generateMostPlayedContent(slotCount)`
2. **Requests favorites** from Flutter:
   - Sends `getUserFavorites` message
   - Waits for `userFavoritesResponse` event
3. **Flutter** (`UserActivityService`):
   - Queries stored interactions
   - Sorts by play count + recency
   - Returns top 15 links
4. **Requests recommendations** from Flutter:
   - Sends `getRecommendations` message
   - Waits for `recommendationsResponse` event
5. **Flutter** (`SimilarContentService`):
   - Gets user's top artists
   - Gets recently played URLs
   - Calls YouTube API for related videos
   - Calls Deezer API for similar artists/tracks
   - Calls Dailymotion API for more content
   - Returns combined recommendations
6. **JavaScript** creates content config:
   - 60% = User's proven favorites
   - 40% = AI-generated recommendations
   - Shuffles and returns to furniture

---

## Platform API Integration

### **YouTube API** ✅
- **Related Videos**: `/search?relatedToVideoId={id}`
- **Search by Artist**: `/search?q={artist}&videoCategoryId=10`
- Uses existing `youtubeApiKey` from `recommendations_config.dart`

### **Deezer API** ✅  
- **Related Artists**: `/artist/{id}/related`
- **Top Tracks**: `/artist/{id}/top?limit={N}`
- **No auth required** - free public API

### **Dailymotion API** ✅
- **Search Videos**: `/videos?search={query}&limit={N}`
- **No auth required** - free public API

### **Vimeo API** ✅
- **Search Videos**: `/videos?query={query}&per_page={N}`
- **Uses your existing access token** from `recommendations_config.dart`
- **No OAuth sign-in needed** - just the access token

### **Spotify API** ⏳ (On Hold)
- Per your request, waiting for Spotify API improvements
- Integration code ready when needed

---

## Files Created/Modified

### **New Files Created:**
✅ `lib/services/user_activity_service.dart` (200 lines)
✅ `lib/services/similar_content_service.dart` (400 lines)

### **Modified Files:**
✅ `lib/screens/helpers/three_js_javascript_channels.dart`
  - Added imports for new services
  - Added `UserActivityChannel`
  - Added `_handleUserActivityRequest()` method

✅ `assets/web/js/modules/interaction/linkInteractionManager.js`
  - Enhanced link metadata extraction
  - Added activity tracking
  - Added `detectPlatformFromUrl()`
  - Added `recordUserActivity()`

✅ `assets/web/js/modules/furniture/dynamicContentGenerator.js`
  - Rewrote `generateMostPlayedContent()` with real data
  - Added `getUserFavorites()`
  - Added `getRecommendationsBasedOnFavorites()`
  - Made `generateContentConfig()` async

### **Build Status:**
✅ JavaScript bundle built successfully (4.8 MB total)
✅ No Dart compilation errors
✅ All services compiled cleanly

---

## Key Features Implemented

### ✅ **Behavior-Based Tracking**
- Automatically tracks every link opened
- No user prompts or surveys
- Implicit preference learning

### ✅ **Smart Bookshelf**
- Shows user's actual most-played content
- Mixes favorites with fresh recommendations
- Updates in real-time as user interacts

### ✅ **Multi-Platform API Integration**
- YouTube related videos
- Deezer similar artists & tracks
- Dailymotion search
- Vimeo search (using your access token)
- Platform-agnostic recommendations

### ✅ **JSON Persistence**
- Uses SharedPreferences (your existing pattern)
- No SQLite required
- Stores: URL, title, platform, play count, timestamps

### ✅ **Artist Extraction**
- Parses link titles to extract artist names
- Patterns: "Artist - Song", "Song by Artist"
- Uses for generating related content

### ✅ **Platform Detection**
- Auto-detects platform from URL
- Supports: YouTube, Spotify, Deezer, SoundCloud, TikTok, Instagram, Vimeo, Dailymotion, Twitch

---

## Next Steps (Optional Enhancements)

### **Phase 2 - Smart Refresh Strategy:**
Not yet implemented, but designed:
- **Sticky content** (20%): Keep top performers
- **Refresh content** (60%): Replace with similar
- **Discovery content** (20%): Completely new

### **Phase 3 - Advanced Analytics:**
- Track skip behavior (user opens then immediately closes)
- Track dwell time (how long they stayed on content)
- Dynamic genre weighting (increase genres they play, decrease what they skip)

### **Phase 4 - Sub-Genre Drilling:**
- If user likes "Rock", show "Indie Rock", "Punk Rock", etc.
- Use platform recommendation APIs for genre expansion

---

## Testing Instructions

### **1. Test Link Tracking:**
```
1. Open the app
2. Double-tap any link on furniture
3. Check Flutter logs for: "📊 Recording link activity: {title}"
4. Check for: "✅ Link activity recorded successfully"
```

### **2. Test Bookshelf Favorites:**
```
1. Open several links (3-5 different ones)
2. Open one link multiple times to make it a "favorite"
3. Navigate to bookshelf furniture
4. Check Flutter logs for: "📊 Fetching user favorites"
5. Bookshelf should show your most-played links
```

### **3. Test Recommendations:**
```
1. After building activity history
2. Refresh bookshelf content
3. Check Flutter logs for: "📊 Generating recommendations"
4. Should see: "Using X artists and Y URLs for recommendations"
5. Bookshelf should show mix of favorites + new recommendations
```

### **4. Test Platform APIs:**
```
1. Open a YouTube video
2. Refresh bookshelf
3. Check logs for: "Found X related YouTube videos"
4. Check logs for: "Found X Deezer tracks"
5. Check logs for: "Found X Dailymotion videos"
```

---

## Configuration

### **API Keys Required:**
- **YouTube API Key**: Already configured in `recommendations_config.dart`
- **Deezer**: No API key needed (public API)
- **Dailymotion**: No API key needed (public API)
- **Vimeo**: ✅ Access token already configured (`0fa39fb74f07bfe8453358466360d387`)
- **Spotify**: OAuth needed (waiting for API improvements)

### **Adjust Recommendation Mix:**
Edit in `dynamicContentGenerator.js`:
```javascript
// Current: 60% favorites, 40% recommendations
const favoriteCount = Math.ceil(slotCount * 0.6);
const recommendationCount = slotCount - favoriteCount;

// Change to 50/50:
const favoriteCount = Math.ceil(slotCount * 0.5);
```

### **Adjust Favorite Limit:**
Edit in `dynamicContentGenerator.js`:
```javascript
// Current: Request top 20 favorites
action: 'getUserFavorites',
limit: 20  // Change this number
```

---

## Architecture Summary

```
USER OPENS LINK
       ↓
JavaScript (linkInteractionManager)
  - Extracts: URL, title, platform
  - Sends: UserActivityChannel.postMessage()
       ↓
Flutter (UserActivityService)
  - Saves to JSON (SharedPreferences)
  - Increments play count
       ↓
BOOKSHELF LOADS
       ↓
JavaScript (dynamicContentGenerator)
  - Requests: getUserFavorites
       ↓
Flutter (UserActivityService)
  - Returns: Top played links
       ↓
JavaScript
  - Requests: getRecommendations
       ↓
Flutter (SimilarContentService)
  - Calls: YouTube API (related videos)
  - Calls: Deezer API (similar artists)
  - Calls: Dailymotion API (search)
  - Returns: Combined recommendations
       ↓
JavaScript
  - Creates: 60% favorites + 40% recommendations
  - Shuffles and populates bookshelf
```

---

## Performance Notes

- **JSON Storage**: Lightweight, ~1-10 KB for typical usage
- **API Calls**: Only when bookshelf loads/refreshes
- **Caching**: Recommendations cached by existing system
- **Async Operations**: Non-blocking, won't freeze UI
- **Timeout Handling**: 2-3 second timeouts prevent hanging

---

## Privacy Considerations

- **All data stored locally** (SharedPreferences)
- **No cloud sync** (unless you implement it later)
- **No third-party tracking**
- **User can clear history** (call `clearAllInteractions()`)

---

## Summary

✅ User activity tracking fully implemented  
✅ Bookshelf shows real favorites + AI recommendations  
✅ YouTube, Deezer, Dailymotion, Vimeo APIs integrated  
✅ JSON persistence working  
✅ No user prompts needed (behavior-based)  
✅ Platform-agnostic design  
✅ Production build completed successfully

**The app now learns what you like and shows you more of it!** 🎉
