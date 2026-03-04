# FURNITURE CONTENT PREFERENCES SYSTEM

## 🎯 Overview

This system allows users to select music genres/categories and dynamically generates furniture content based on their preferences. It includes:

1. **Content Preferences Service** - User genre selection and clean mode
2. **Dynamic Content Generator** - Genre-based content distribution
3. **Furniture History Manager** - Back button / undo functionality
4. **Furniture UI Controls** - Refresh and back buttons overlay
5. **Music Preferences Dialog** - Flutter UI for genre selection

---

## 🏗️ Architecture

### JavaScript Modules (Order matters for loading)

1. **contentPreferencesService.js**
   - Stores user's selected genres in localStorage
   - Manages clean mode preference
   - Provides API filters for content requests
   - Location: `assets/web/js/modules/preferences/`

2. **dynamicContentGenerator.js**
   - Generates content based on preferences and furniture type
   - Implements distribution strategies (ALL_GENRES, SINGLE_GENRE_ROTATING, MOST_PLAYED, CURATED)
   - Handles daily genre rotation for Riser/Stage
   - Location: `assets/web/js/modules/furniture/`

3. **furnitureHistoryManager.js**
   - Tracks last 3 states per furniture piece
   - Enables back/undo functionality
   - Stores object IDs and timestamps
   - Location: `assets/web/js/modules/furniture/`

4. **furnitureUIControls.js**
   - Displays refresh/back buttons when looking at furniture
   - Handles button clicks and cooldowns
   - Shows toast notifications
   - Location: `assets/web/js/modules/furniture/`

### Flutter Widget

**music_preferences_dialog.dart**
- Checkbox UI for 11 music genres
- Family-friendly mode toggle
- SharedPreferences storage
- Location: `lib/widgets/`

---

## 📦 Module Loading Order

Added to `build_modular_fixed.ps1` after `demoContentConfig.js`:

```powershell
# NEW: Content preferences and dynamic generation system
'modules\preferences\contentPreferencesService.js',
'modules\furniture\dynamicContentGenerator.js',
'modules\furniture\furnitureHistoryManager.js',
'modules\furniture\furnitureUIControls.js',
```

---

## 🎭 Available Genres

| Genre ID | Name | Icon | Search Terms |
|----------|------|------|--------------|
| `pop` | Pop | 🎵 | pop music, top pop hits, popular songs |
| `country` | Country | 🤠 | country music, country hits, nashville |
| `rock` | Rock | 🎸 | rock music, rock classics, guitar rock |
| `hip_hop` | Hip Hop / Rap | 🎤 | hip hop, rap music, urban beats |
| `indie` | Indie / Alternative | 🎧 | indie music, alternative, indie rock |
| `electronic` | Electronic / EDM | 🎹 | electronic music, edm, house music |
| `r_and_b` | R&B / Soul | 🎶 | r&b music, soul, rhythm and blues |
| `classical` | Classical | 🎻 | classical music, orchestra, symphony |
| `jazz` | Jazz | 🎺 | jazz music, smooth jazz, jazz classics |
| `latin` | Latin | 💃 | latin music, reggaeton, salsa |
| `reggae` | Reggae / Dancehall | 🌴 | reggae music, dancehall, ska |

**Default Selection:** Pop, Country, Indie (3 genres)

---

## 🪑 Furniture Content Strategy

### Gallery Wall
- **Strategy:** `ALL_GENRES`
- **Content:** Music videos from ALL selected genres
- **Platforms:** YouTube (50%), Vimeo (20%), Dailymotion (30%)
- **Behavior:** Distributes slots evenly across all selected genres

### Bookshelf
- **Strategy:** `MOST_PLAYED`
- **Content:** User's most played content (all platforms/types)
- **Platforms:** Mixed (YouTube, Spotify, Vimeo, SoundCloud, Deezer)
- **Behavior:** Tracks play counts (TODO: Integration pending)

### Riser (Couch/Sofa)
- **Strategy:** `SINGLE_GENRE_ROTATING`
- **Content:** Music videos/audio from ONE genre
- **Platforms:** YouTube (40%), Spotify (30%), SoundCloud (20%), Deezer (10%)
- **Behavior:** Rotates to different genre daily (different from Stage)

### Stage (Small)
- **Strategy:** `SINGLE_GENRE_ROTATING`
- **Content:** Music videos/audio from ONE genre
- **Platforms:** YouTube (40%), Spotify (30%), SoundCloud (20%), Deezer (10%)
- **Behavior:** Rotates to different genre daily (different from Riser)

### Amphitheatre
- **Strategy:** `CURATED_ENTERTAINMENT`
- **Content:** Non-music entertainment (viral clips, comedy, talent)
- **Platforms:** YouTube (50%), Vimeo (30%), TikTok (10%), Instagram (10%)
- **Behavior:** No genre filtering, purely entertainment-focused

---

## 🎮 UI Controls

### Refresh Button
- **Icon:** 🔄
- **Tooltip:** "Refresh Content"
- **Function:** Instantly regenerates content for furniture
- **Cooldown:** 1 second
- **Behavior:**
  - Calls `FurnitureManager.refreshFurnitureContent(uuid)`
  - Saves current state to history before refresh
  - Generates new content from selected genres
  - Updates content immediately

### Back Button
- **Icon:** ⏮️
- **Tooltip:** "Previous Playlist"
- **Function:** Restores previous furniture state
- **State:** Disabled if no history available (grayed out)
- **Behavior:**
  - Calls `furnitureHistory.restorePreviousState(uuid)`
  - Restores object IDs from history
  - Refetches metadata if needed
  - Maximum 3 states per furniture

### Info Button
- **Icon:** ℹ️
- **Tooltip:** "Furniture Info"
- **Function:** Shows furniture details
- **Info Displayed:**
  - Furniture type
  - Content strategy
  - Current genre (for rotating furniture)
  - Object count
  - History depth

---

## 💾 Data Storage

### localStorage (JavaScript)

```javascript
// Content preferences
{
  "selectedGenres": ["pop", "country", "indie"],
  "cleanMode": true,
  "explicitContent": false,
  "refreshInterval": 24,
  "lastRefresh": 1708547234567,
  "version": 1.0
}
```

### SharedPreferences (Flutter)

```dart
// Keys
const String _genresPrefsKey = 'content_selected_genres';
const String _cleanModePrefsKey = 'content_clean_mode';

// Values
List<String> genres = ['pop', 'country', 'indie'];
bool cleanMode = true;
```

---

## 🔄 Daily Rotation Logic

**Single-Genre Furniture** (Riser & Stage):

1. Check time since last rotation:
   ```javascript
   const hoursSinceRotation = (Date.now() - lastRotation) / (1000 * 60 * 60);
   if (hoursSinceRotation >= 24) { /* rotate */ }
   ```

2. Assign random genre (different from other single-genre furniture):
   ```javascript
   const otherGenre = rotationState[furnitureType === 'riser' ? 'stage_small' : 'riser'];
   const availableGenres = userGenres.filter(g => g !== otherGenre);
   const assigned = availableGenres[random];
   ```

3. Store rotation state:
   ```javascript
   rotationState = {
     riser: 'pop',
     stage_small: 'rock',
     lastRotation: Date.now()
   };
   ```

---

## 🔌 Integration Points

### 1. JavaScript Initialization

```javascript
// Global instances created automatically on module load
window.contentPreferences = new ContentPreferencesService();
window.contentGenerator = new DynamicContentGenerator();
window.furnitureHistory = new FurnitureHistoryManager();
window.furnitureUI = new FurnitureUIControls();
```

### 2. FurnitureManager Integration (TODO)

Add methods to `furnitureManager.js`:

```javascript
/**
 * Refresh furniture content
 */
refreshFurnitureContent(furnitureUUID) {
  const furniture = this.getFurniture(furnitureUUID);
  const currentObjects = this.getObjectsOnFurniture(furnitureUUID);
  
  // Save state to history
  window.furnitureHistory.saveState(
    furnitureUUID,
    currentObjects.map(o => o.uuid),
    'refresh'
  );
  
  // Generate new content
  const newConfig = window.contentGenerator.refreshContent(
    furniture.type,
    furnitureUUID,
    furniture.slotCount
  );
  
  // Clear and repopulate furniture
  this.clearFurniture(furnitureUUID);
  this.populateFurniture(furnitureUUID, newConfig);
}

/**
 * Restore furniture state from history
 */
restoreFurnitureState(furnitureUUID, state) {
  const objectIds = state.objectIds;
  
  // Clear current content
  this.clearFurniture(furnitureUUID);
  
  // Restore objects by ID
  objectIds.forEach(id => {
    const object = this.getObjectByID(id);
    if (object) {
      this.placeObjectOnFurniture(object, furnitureUUID);
    }
  });
}

/**
 * Get object count on furniture
 */
getObjectCount(furnitureUUID) {
  const objects = this.getObjectsOnFurniture(furnitureUUID);
  return objects.length;
}
```

### 3. Camera/Focus Integration (TODO)

Add to camera/focus system to show/hide controls:

```javascript
// When camera looks at furniture
if (focusedObject && focusedObject.type === 'furniture') {
  window.furnitureUI.showControls({
    uuid: focusedObject.uuid,
    type: focusedObject.furnitureType
  });
}

// When camera looks away
if (!focusedObject || focusedObject.type !== 'furniture') {
  window.furnitureUI.hideControls();
}
```

### 4. Default Furniture Spawner Integration (TODO)

Update `defaultFurnitureSpawner.js` to use dynamic content:

```javascript
// Replace hardcoded DEMO_PLAYLISTS with dynamic generation
const galleryWallConfig = window.contentGenerator.generateContentConfig(
  'gallery_wall',
  15
);

const riserConfig = window.contentGenerator.generateContentConfig(
  'riser',
  20
);

// etc...
```

### 5. Flutter Bridge Integration (TODO)

Add to `three_js_javascript_channels.dart`:

```dart
// Send preferences to JavaScript when changed
void _updateContentPreferences() async {
  final genres = await MusicPreferencesDialog.loadSelectedGenres();
  final cleanMode = await MusicPreferencesDialog.loadCleanMode();
  
  final prefsJson = jsonEncode({
    'genres': genres,
    'cleanMode': cleanMode,
  });
  
  _webViewController?.runJavaScript(
    "window.contentPreferences.importFromFlutter('$prefsJson');"
  );
}
```

---

## 🚀 Usage Examples

### Show Music Preferences Dialog (Flutter)

```dart
// From any widget with BuildContext
await MusicPreferencesDialog.show(context);
```

### Get Current Preferences (JavaScript)

```javascript
// Get selected genres
const genres = window.contentPreferences.getSelectedGenres();
// Returns: ['pop', 'country', 'indie']

// Get clean mode
const cleanMode = window.contentPreferences.isCleanMode();
// Returns: true

// Get API filters
const filters = window.contentPreferences.getAPIFilters();
// Returns: { genres: [...], cleanMode: true, explicit: false, safeSearch: 'strict' }
```

### Generate Content for Furniture

```javascript
// Generate content configuration
const config = window.contentGenerator.generateContentConfig(
  'gallery_wall', // furniture type
  15              // slot count
);

// Returns:
{
  furnitureType: 'gallery_wall',
  strategy: 'ALL_GENRES',
  slotCount: 15,
  genres: ['pop', 'country', 'indie'],
  cleanMode: true,
  contentItems: [
    {
      type: 'dynamic',
      platform: 'youtube',
      searchTerm: 'pop music',
      genre: 'pop',
      cleanMode: true,
      metadata: { ... }
    },
    // ... 14 more items
  ]
}
```

### Save/Restore Furniture State

```javascript
// Save current state
window.furnitureHistory.saveState(
  furnitureUUID,
  ['obj1-uuid', 'obj2-uuid', 'obj3-uuid'],
  'manual'
);

// Check if can go back
const canGoBack = window.furnitureHistory.canGoBack(furnitureUUID);

// Restore previous state
const previousState = window.furnitureHistory.restorePreviousState(furnitureUUID);
// Returns: { objectIds: [...], timestamp: ..., source: 'refresh' }
```

### Show/Hide UI Controls

```javascript
// Show controls when looking at furniture
window.furnitureUI.showControls({
  uuid: 'furniture-uuid-123',
  type: 'gallery_wall'
});

// Hide controls
window.furnitureUI.hideControls();

// Show notification
window.furnitureUI.showNotification('Content refreshed!', 'success', 3000);
```

---

## 🎨 UI Styling

### Button Appearance

- **Size:** 60x60px circular buttons
- **Background:** `rgba(0, 0, 0, 0.7)` with blur backdrop
- **Border:** 2px white with 0.3 opacity
- **Shadow:** `0 4px 12px rgba(0, 0, 0, 0.3)`
- **Position:** Fixed bottom-right (100px from bottom, 20px from right)
- **Animation:** Fade in/out with slide from right

### Tooltips

- **Position:** Left of button (70px offset)
- **Background:** `rgba(0, 0, 0, 0.9)`
- **Padding:** 8px horizontal, 12px vertical
- **Font:** System font, 14px

### Notifications

- **Position:** Below buttons (180px from bottom)
- **Colors:**
  - Success: `rgba(34, 197, 94, 0.9)` (green)
  - Error: `rgba(239, 68, 68, 0.9)` (red)
  - Warning: `rgba(251, 191, 36, 0.9)` (yellow)
  - Info: `rgba(59, 130, 246, 0.9)` (blue)
- **Duration:** 3 seconds default

---

## 🔧 Configuration

### Preferences Service Defaults

```javascript
defaults = {
  selectedGenres: ['pop', 'country', 'indie'],
  cleanMode: true,
  explicitContent: false,
  refreshInterval: 24, // hours
  lastRefresh: Date.now(),
  version: 1.0
}
```

### Platform Weights

```javascript
platformWeights = {
  gallery_wall: { youtube: 0.5, vimeo: 0.2, dailymotion: 0.3 },
  riser: { youtube: 0.4, spotify: 0.3, soundcloud: 0.2, deezer: 0.1 },
  stage_small: { youtube: 0.4, spotify: 0.3, soundcloud: 0.2, deezer: 0.1 },
  bookshelf: { youtube: 0.3, spotify: 0.3, vimeo: 0.1, soundcloud: 0.15, deezer: 0.15 },
  amphitheatre: { youtube: 0.5, vimeo: 0.3, tiktok: 0.1, instagram: 0.1 }
}
```

### History Settings

```javascript
maxHistoryDepth = 3; // Maximum states per furniture
cooldownDuration = 1000; // Button cooldown in milliseconds
```

---

## 📝 TODO Items

### High Priority
1. **Integrate with FurnitureManager** - Add refresh/restore methods
2. **Camera Focus Detection** - Show controls when looking at furniture
3. **Replace hardcoded demo content** - Use dynamic generator in spawner
4. **Flutter bridge** - Send preferences from Dart to JavaScript

### Medium Priority
5. **Play tracking system** - Implement "Most Played" for Bookshelf
6. **Content API integration** - Connect to real platform APIs
7. **Thumbnail caching** - Cache generated content metadata
8. **Settings menu button** - Add to home screen UI

### Low Priority
9. **Genre icons in 3D** - Show current genre above furniture
10. **Shuffle mode** - Random genre per refresh (instead of daily rotation)
11. **Content blacklist** - Let users hide specific content
12. **Export/import preferences** - Share settings across devices

---

## 🐛 Known Limitations

1. **Most Played not implemented** - Bookshelf uses fallback content
2. **No API rate limiting** - Need throttling for refresh spam
3. **No content deduplication** - Same content can appear multiple times
4. **No genre preview** - Can't see content before selecting genre
5. **No manual genre override** - Can't force genre on rotating furniture

---

## 🔍 Debugging

### Check Preferences

```javascript
// In browser console
window.contentPreferences.getPreferences();
window.contentPreferences.exportForFlutter();
```

### Check History

```javascript
// Get statistics
window.furnitureHistory.getStats();

// Get specific furniture history
window.furnitureHistory.getFullHistory('furniture-uuid');
```

### Check Content Generation

```javascript
// Test content generation
const config = window.contentGenerator.generateContentConfig('gallery_wall', 10);
console.log(config);

// Check rotation state
window.contentGenerator.rotationState;
```

### Check UI State

```javascript
// Check if controls are visible
window.furnitureUI.isVisible;

// Get current furniture
window.furnitureUI.getCurrentFurniture();
```

---

## 📚 Related Documentation

- `MULTI_PLATFORM_API_INTEGRATION.md` - Platform API details
- `FURNITURE_IMPLEMENTATION_SUMMARY.md` - Overall furniture system
- `demoContentConfig.js` - Original hardcoded demo content
- `defaultFurnitureSpawner.js` - Furniture creation on first install

---

## ✅ Testing Checklist

- [ ] Load preferences from SharedPreferences
- [ ] Save preferences to SharedPreferences
- [ ] Toggle genres in Flutter dialog
- [ ] Toggle clean mode
- [ ] Generate content for each furniture type
- [ ] Verify content distribution matches strategy
- [ ] Test daily rotation logic
- [ ] Test refresh button functionality
- [ ] Test back button functionality
- [ ] Test button disabled states
- [ ] Test notification toasts
- [ ] Test button cooldowns
- [ ] Verify UI shows/hides with furniture focus
- [ ] Test minimum 1 genre requirement
- [ ] Test preferences persist across app restarts

---

## 🎉 Success Criteria

✅ **User Experience**
- Users can easily select favorite genres
- Content feels personalized and varied
- Refresh provides instant gratification
- Back button enables easy undo

✅ **Technical**
- No hardcoded demo content
- Preferences persist correctly
- History works reliably
- UI controls responsive and intuitive

✅ **Content Quality**
- Content matches selected genres
- Clean mode filters appropriately
- Good variety across platforms
- No excessive duplicates

---

**Created:** 2025-01-21  
**Version:** 1.0  
**Status:** Implementation Complete (Integration Pending)
