# Demo Content System - "First 5 Minutes" Experience

## Overview
The demo content system automatically populates furniture with pre-configured media on **first app launch only**, providing instant value to new users. Demo files are intentionally NOT persisted and will disappear after the first session. This gives users a preview of local media features without cluttering their library permanently.

**Important:** User-added MP3/MP4 files WILL persist normally across app restarts.

## Architecture

### 1. Configuration Layer (`demoContentConfig.js`)
**Location:** `assets/web/js/modules/furniture/demoContentConfig.js`

Defines demo playlists for each furniture type:
- **Gallery Wall** (center focal point): "Top Hits Mix"
- **Choir Riser** (left side): "Chill Vibes"  
- **Stage** (right side): "Shorts & Reels"

Each playlist contains up to 10 items mixing:
- Local files (`local:filename.mp3`)
- YouTube links
- Spotify links
- TikTok videos
- Instagram content

**To Update Demo Content:**
1. Edit `demoContentConfig.js`
2. Modify links array in any playlist
3. Keep max 10 items per playlist
4. Rebuild bundle: `.\build_modular_fixed.ps1 -Production`

### 2. Population Layer (`defaultFurnitureSpawner.js`)
**Location:** `assets/web/js/modules/furniture/defaultFurnitureSpawner.js`

**Furniture Positions:**
```javascript
Gallery Wall:    x: 0,   z: 5   (center focal point)
Choir Riser:     x: -10, z: 6   (left side)
Stage:           x: 10,  z: 6   (right side)
Amphitheatre:    x: 0,   z: -20 (back)
Bookshelf:       x: -15, z: 10  (left side)
```

**Key Methods:**
- `populateFurnitureWithDemoContent()` - Iterates furniture and adds demo items
- `addLocalFileToFurniture()` - Handles local demo files
- `addExternalLinkToFurniture()` - Handles YouTube/Spotify/etc links
- `parseLinkUrl()` - Extracts metadata from URLs

### 3. Flutter Bridge Layer
**Files:**
- `lib/helpers/demo_content_helper.dart` - Registers local demo files
- `lib/screens/helpers/three_js_javascript_channels.dart` - Bridge functions
- `lib/models/file_model.dart` - Data model with `isDemo` flag

**Bridge Functions:**
- `window.addDemoFileToFurniture(furnitureId, filename, slotIndex)`
- `window.addDemoLinkToFurniture(furnitureId, url, title, type, slotIndex)`

**JavaScript Channels:**
- `DemoFileToFurnitureChannel` - Adds local files to furniture
- `DemoLinkToFurnitureChannel` - Adds external links to furniture

### 4. Demo Files
**Location:** `assets/demomedia/`

Current demo files (registered in `DemoContentHelper`):
- Bach Prelude No. 1.mp3
- Bach Prelude No. 2.mp3
- Bach Prelude No. 3.mp3
- Schubert Trio Rondo.mp3
- cuttyranks_limb_by_limb.mp4
- baseball.mp4

## How It Works

1. **First Launch Detection**
   - `defaultFurnitureSpawner.js` checks localStorage flag
   - If not set, creates default furniture

2. **Furniture Creation**
   - Creates 5 furniture pieces at optimized positions
   - Gallery Wall at center (0,0,5) as focal point
   - Stores furniture references for population

3. **Demo Content Population**
   - Matches each furniture to its playlist via `furnitureType`
   - Iterates playlist links (max 10)
   - Calls appropriate bridge function for each item:
     - Local files → `addDemoFileToFurniture()`
     - External URLs → `addDemoLinkToFurniture()`

4. **Flutter Processing**
   - DemoContentHelper registers local files as FileModels
   - Bridge handlers find/create FileModels
   - Updates furniture assignment via `onFileMoved` callback
   - Files marked with `isDemo: true`

5. **Result**
   - User opens app to see pre-populated furniture
   - Gallery Wall showcases mix of local + streaming content
   - All demo content is deletable (no special protection)

## Demo Content Properties

### FileModel.isDemo Flag
- **Purpose:** Distinguishes demo content from user-added content
- **Default:** `false`
- **Serialization:** Included in toJson/fromJson
- **Usage:** Future filtering/management features

### Demo Content is Deletable
Demo content behaves exactly like user-added content:
- Can be deleted normally
- Can be moved to other furniture
- Can be removed from furniture
- No special locking or protection

## Testing the Demo System

### Reset Demo State
In browser console:
```javascript
localStorage.removeItem('mv3d_default_furniture_created');
```

### Test Flow
1. Clear demo flag (above)
2. Restart app
3. Demo files appear on furniture (first install)
4. Restart app again
5. Demo files disappear (expected behavior - first-install-only)
3. Check Gallery Wall at center for demo content
4. Verify mix of local files and streaming links
5. Test playback by clicking objects
6. Verify deletion works normally

### Debugging
Console logs show:
- `🎵 Adding demo content to [furniture]...`
- `🎵 Adding local file: [filename]`
- `🔗 Adding external link: [url]`
- Bridge function calls with furniture IDs

## Maintenance

### Adding New Demo Files
1. Add file to `assets/demomedia/`
2. Update `DemoContentHelper.getDemoMediaFiles()` in Dart
3. Add `local:filename` to playlist in `demoContentConfig.js`
4. Rebuild bundle

### Changing Demo Links
1. Edit `demoContentConfig.js`
2. Replace links in any playlist
3. Maintain format: direct URLs (YouTube, Spotify, etc.)
4. Rebuild bundle: `.\build_modular_fixed.ps1 -Production`

### Modifying Furniture Layout
1. Edit `getDefaultFurnitureConfigs()` in `defaultFurnitureSpawner.js`
2. Update x/z positions
3. Maintain Gallery Wall as focal point (0,0,5)
4. Rebuild bundle

## Why Demo Files Don't Persist

**Design Decision:** Demo files are intentionally excluded from persistence (see `PersistenceService.savePersistedFiles()`).

**Rationale:**
- ✅ Gives users a clean "preview" of local media features
- ✅ Doesn't clutter user's library with content they may not want
- ✅ Keeps persistence storage clean
- ✅ Users can add their own MP3/MP4 files that WILL persist normally
- ✅ Simpler architecture - no special handling needed after first install

**User-Added Files:** Any MP3/MP4 files that users add themselves are NOT marked as demo content and will persist correctly across app restarts.

## Future Enhancements

### Potential Features
- Demo tour/walkthrough
- "Load Demo Content" button for existing users
- Demo playlist editor UI
- Seasonal/themed demo rotations
- Analytics on demo engagement

### Spotify Integration
- User setting up Spotify developer account
- Replace placeholder links with real Spotify URLs
- Add Spotify playback via iframe API
- Test with `demoContentConfig.js` Spotify links

## Technical Notes

### Why This Architecture?
- **Config-based:** Easy editing without code changes
- **Separated concerns:** Config, population, bridge, Flutter all independent
- **Extensible:** New furniture types just need playlist entry
- **Testable:** Clear reset mechanism via localStorage
- **Production-ready:** Full error handling and logging

### Performance
- Demo population happens async during furniture creation
- Does not block UI or world initialization
- Local files already in app bundle (fast)
- External links load metadata on demand

### Known Limitations
- Max 10 items per furniture (design choice for "First 5 Minutes")
- Demo files must be in `assets/demomedia/` (Flutter asset system)
- External links require network (graceful fallback)
- **First launch only** (intentional design decision):
  - Demo files are NOT persisted across app restarts
  - Files disappear after first session to keep user's library clean
  - User-added media files persist normally
  - To see demo again: Clear `localStorage` flag (see Testing section)
