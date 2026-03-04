# Furniture Refresh Debug Fix

## Issue Reported
When pressing the furniture refresh button:
- Objects on the gallery wall did NOT change
- New objects were created that looked like Spotify objects (which shouldn't be on gallery wall)
- Objects appeared somewhere else in the scene, not on the gallery wall

## Root Cause Analysis

The issue likely stems from one or more of these problems:
1. **Incorrect playlist matching**: Gallery wall might be matched with wrong playlist containing Spotify links
2. **Spotify content in gallery wall playlist**: Gallery wall should only have video content (YouTube, TikTok, Vimeo), not audio (Spotify, Deezer)
3. **Object removal not working**: Old objects might not be properly removed before new ones are created
4. **Object placement issues**: New objects might be created but not placed correctly on furniture

## Changes Made

### 1. Enhanced Debug Logging (`dynamicContentGenerator.js`)

Added comprehensive console logging to trace:
- All furniture pieces being refreshed (type, ID, current object count)
- All available playlists and their furnitureType mappings
- Playlist matching process for each furniture type
- Sample links from each playlist
- Object removal details (which objects, their positions)
- Object creation details (slot positions, world positions)
- Success/failure counts for each furniture piece

**Look for these console messages:**
```
🔄 ========== Refreshing gallery_wall (12345678) ==========
🔍 Looking for playlist with furnitureType="gallery_wall"...
✅ Found playlist "Trending Shorts" with 10 items for gallery_wall
   First 3 links:
   1. https://youtube.com/...
   2. https://youtube.com/...
   3. https://youtube.com/...
🧹 Removing X existing objects from gallery_wall...
🗑️ Removed object abc123 (Video Title at (1.2, 3.4, -15.0))
🎨 Creating 10 new objects on gallery_wall (10 slots available)...
   Furniture world position: (0.0, 0.0, -15.0)
🔗 [Slot 0] Creating object: https://youtube.com/...
   Slot local position: (-10.0, 2.0, 0.0)
✅ [Slot 0] Object created at world position: (-10.0, 2.0, -15.0)
✅ gallery_wall refresh complete: 10/10 objects created
```

### 2. Gallery Wall Content Validation

Added automatic filtering to prevent Spotify/Deezer audio content from being placed on gallery wall:

```javascript
// VALIDATION: Gallery Wall should ONLY have video content
if (furnitureType === 'gallery_wall') {
    playlist.links = playlist.links.filter(link => {
        const isSpotify = link.includes('spotify.com');
        const isDeezer = link.includes('deezer.com');
        return !isSpotify && !isDeezer;
    });
}
```

**Look for these warnings:**
```
⚠️ Filtered out audio link from Gallery Wall: https://open.spotify.com/...
⚠️ Gallery Wall playlist had 5 audio links removed (5 video links remain)
```

**Error if playlist has no valid video content:**
```
❌ Gallery Wall playlist has no valid video links after filtering audio content - skipping
```

### 3. Improved Object Tracking

Enhanced logging shows:
- Object names and positions before removal
- Whether objects are found in the scene
- Slot-by-slot creation progress
- Final object count after refresh

## Testing Instructions

### 1. Open Browser Console
Before clicking the refresh button, open your browser's developer console (F12).

### 2. Click Furniture Refresh Button
Look at the gallery wall furniture and click the refresh button.

### 3. Check Console Output

#### ✅ Expected Healthy Output:
```
📋 Found 5 furniture pieces to refresh:
   - gallery_wall (abc12345) with 10 objects
   - bookshelf (def67890) with 6 objects
   ...
✅ Using recommendations with 5 playlists
   Available playlists: topHitsMix, chillVibes, shortsAndReels, userFavorites, mixedContent
   📦 topHitsMix: furnitureType="gallery_wall", 10 links (e.g., https://youtube.com/shorts/...)

🔄 ========== Refreshing gallery_wall (abc12345) ==========
🔍 Looking for playlist with furnitureType="gallery_wall"...
✅ Found playlist "Trending Shorts" with 10 items for gallery_wall
   First 3 links:
   1. https://youtube.com/shorts/xyz123
   2. https://youtube.com/shorts/abc456
   3. https://youtube.com/shorts/def789
🧹 Removing 10 existing objects from gallery_wall...
🗑️ Removed object old_obj_1 (Old Video at (-10.0, 2.0, -15.0))
...
🎨 Creating 10 new objects on gallery_wall (10 slots available)...
   Furniture world position: (0.0, 0.0, -15.0)
🔗 [Slot 0] Creating object: https://youtube.com/shorts/xyz123...
   Slot local position: (-10.0, 2.0, 0.0)
✅ [Slot 0] Object created at world position: (-10.0, 2.0, -15.0)
...
✅ gallery_wall refresh complete: 10/10 objects created
   Furniture abc12345 now has 10 objects registered
```

#### ❌ Problem Indicators:

**Problem 1: Wrong Playlist Matched**
```
⚠️ No playlist found for gallery_wall, skipping
   Available furnitureTypes in playlists: stage_small, riser, bookshelf
```
→ **Issue**: No playlist has `furnitureType: 'gallery_wall'`

**Problem 2: Spotify Content on Gallery Wall**
```
⚠️ Filtered out audio link from Gallery Wall: https://open.spotify.com/track/...
⚠️ Gallery Wall playlist had 10 audio links removed (0 video links remain)
❌ Gallery Wall playlist has no valid video links after filtering audio content - skipping
```
→ **Issue**: Gallery wall playlist contains only Spotify/Deezer links (should have YouTube/TikTok/Vimeo)

**Problem 3: Objects Not Removed**
```
🧹 Removing 10 existing objects from gallery_wall...
❌ Error removing object old_obj_1: [error details]
```
→ **Issue**: Object removal is failing

**Problem 4: Objects Created Elsewhere**
```
🔗 [Slot 0] Creating object: https://youtube.com/...
   Slot local position: (-10.0, 2.0, 0.0)
✅ [Slot 0] Object created at world position: (25.5, 1.5, 10.0)
```
→ **Issue**: World position doesn't match expected gallery wall location (should be near x:0, z:-15)

**Problem 5: Creation Failures**
```
⚠️ [Slot 0] Object creation returned null
❌ Error creating object for slot 1: [error details]
✅ gallery_wall refresh complete: 3/10 objects created
```
→ **Issue**: Some or all object creations are failing

## What to Report

After testing, please provide:

1. **Full console output** from clicking refresh button
2. **Which furniture type** you refreshed (gallery_wall, riser, bookshelf, etc.)
3. **What you saw happen** in the 3D scene:
   - Did old objects disappear?
   - Did new objects appear?
   - Where did the new objects appear (on the furniture or somewhere else)?
   - What type of content did you see (videos, audio, images)?

4. **Any error messages** in the console (look for ❌ or ⚠️)

## Expected Behavior

### Gallery Wall
- **Content Type**: YouTube shorts, TikTok videos, Instagram reels (VIDEO only)
- **Location**: Wall at z = -15 (behind starting position)
- **Count**: 10 objects in 2 rows × 5 columns
- **After Refresh**: Old videos disappear, new trending videos appear in same positions

### Bookshelf
- **Content Type**: User favorites (any platform)
- **Location**: Left side around x = -15
- **Count**: 6 objects in 2 rows × 3 columns

### Riser
- **Content Type**: Music videos (YouTube, Vimeo)
- **Location**: Front-left around x = -10, z = 6
- **Count**: 8 objects in elevated grid

### Small Stage
- **Content Type**: Music audio (Spotify, YouTube Music, Deezer)
- **Location**: Front-right around x = 10, z = 6
- **Count**: 13 objects in performance layout

## Next Steps

Based on your console output, we can:
1. Fix playlist generation if wrong content is being assigned to gallery wall
2. Fix object removal if old objects aren't being deleted
3. Fix object placement if objects are appearing in wrong locations
4. Debug object creation if objects aren't being created successfully

The enhanced logging will pinpoint exactly where the furniture refresh process is breaking down.
