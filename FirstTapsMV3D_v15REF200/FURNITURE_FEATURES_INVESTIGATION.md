# Furniture Features Investigation & Recommendations

**Date:** December 19, 2025  
**Status:** Investigation Complete - Ready for Implementation

---

## Executive Summary

Investigation of three furniture feature requests:
1. **Auto-sort on markers** when objects dragged to furniture
2. **Play media function** with playback controls for furniture (similar to Paths)
3. **Featured marker issue** on small stage - object seating not working

---

## Issue #1: Auto-Sort on Furniture Markers

### Current State

**✅ Working for Paths:**
- Path has `autoSort` property (default: `true`)
- Location: `pathDataModel.js` lines 61-62
- Sorting by: `name`, `date`, `size` (ascending/descending)
- Auto-triggers when objects added via `fillWithObjects()`

**❌ Missing for Furniture:**
- Furniture has NO auto-sort functionality
- Objects placed manually on markers
- No reordering mechanism exists

### Investigation Findings

1. **Path Auto-Sort Implementation:**
   - `pathManager.js` lines 234-272: `sortPathObjects(pathId)`
   - Sorts objects by criteria: `sortObjectsByCriteria(objects, criteria, direction)`
   - Uses object metadata: `userData.fileData.name`, `modifiedDate`, `size`
   - Animates objects to new positions after sorting

2. **Furniture Marker System:**
   - Markers generated in `furnitureDataModel.js`
   - Markers created as visual cylinders in `furnitureVisualManager.js` lines 419-450
   - Each marker has position: `{ x, y, z }`
   - Objects tracked in furniture's `objectIds[]` array

3. **Gap Analysis:**
   - Furniture has no `autoSort` property
   - No sorting logic in `furnitureManager.js`
   - No criteria selection (name/date/size)

### Recommendations

#### **Option A: Full Auto-Sort (Recommended)**
Mirror path functionality - add auto-sort toggle to furniture.

**Benefits:**
- Consistent UX with paths
- Users can organize furniture contents automatically
- Useful for playlists (name order = playback order)

**Implementation:**
1. Add `autoSort`, `sortCriteria`, `sortDirection` to `FurnitureDataModel`
2. Create `sortFurnitureObjects(furnitureId)` in `furnitureManager.js`
3. Add UI toggle in furniture options menu (similar to path options)

**Complexity:** Medium (2-3 hours)

#### **Option B: Simple "Sort Now" Button**
Manual sort trigger instead of automatic.

**Benefits:**
- Simpler implementation
- Users control when sorting happens
- Less automatic behavior

**Implementation:**
1. Add "Sort Objects" button to furniture menu
2. Create one-time sort function
3. Choose sort criteria (default: alphabetical by name)

**Complexity:** Low (1 hour)

#### **Option C: No Auto-Sort (Manual Only)**
Keep current manual placement.

**Benefits:**
- Zero development time
- Users have full control over positions

**Drawbacks:**
- Tedious for large collections
- No consistent ordering for playlists

---

## Issue #2: Furniture Playback Controls

### Current State

**✅ Path Playback Working:**
- `pathManager.js` lines 356-450
- Functions: `startPathPlayback()`, `stopPathPlayback()`, `playNext()`
- Auto-advance: When object closes, next object opens automatically
- Visual feedback: Markers change color (white → green → white)
- Looping: At end, restarts from beginning

**❌ Furniture Has No Playback:**
- No playback state tracking
- No sequential object opening
- No auto-advance between objects
- No visual feedback on markers

### Investigation Findings

1. **Path Playback Architecture:**
   ```javascript
   // Path data structure
   path.isPlaying = true;
   path.currentIndex = 0;
   
   // Playback flow
   startPathPlayback(pathId) → playNext(pathId) → openObject(mesh, pathId)
   
   // Auto-advance (in mediaPreviewScreen.js line 1633-1640)
   if (mediaData.activePathPlayback) {
       await app.pathManager.playNext(pathId);
   }
   ```

2. **Marker State Management:**
   - `pathVisualManager.js` lines 417-440: `updateMarkerStates(pathId, activeIndex)`
   - Active marker: Green glow
   - Completed markers: Return to default
   - START marker: Yellow flash on playback start

3. **Control Points:**
   - Double-tap path marker → Toggle playback
   - Media preview screen → Auto-advance on close
   - Path loops at end

### Recommendations

#### **Option A: Unified Playback System (Recommended)**
Create shared playback system for BOTH furniture and paths.

**Architecture:**
```javascript
// New module: playbackManager.js
class PlaybackManager {
    startPlayback(containerId, containerType) // containerType = 'path' or 'furniture'
    stopPlayback(containerId)
    playNext(containerId)
    playPrevious(containerId)
    pause(containerId)
    resume(containerId)
}
```

**Benefits:**
- Consistent UX across furniture and paths
- Shared control UI (play/pause/forward/back)
- Single source of truth for playback state
- Easier to maintain

**Implementation:**
1. Create `playbackManager.js` module
2. Refactor path playback to use new manager
3. Add furniture playback support
4. Create unified control panel UI (Flutter widget)

**Controls Location:**
- **Option A1:** Floating control bar (bottom of screen when playback active)
- **Option A2:** Object preview screen (play/pause/forward/back buttons)
- **Option A3:** Both (minimal controls on preview + full controls in bar)

**Complexity:** High (6-8 hours) - BUT eliminates duplicate code long-term

#### **Option B: Duplicate Path System for Furniture**
Copy path playback code to furniture.

**Benefits:**
- Faster initial implementation
- Path and furniture remain independent

**Drawbacks:**
- Code duplication
- Two systems to maintain
- Inconsistent behavior over time

**Complexity:** Medium (3-4 hours)

#### **Option C: No Playback - Manual Only**
Users manually tap each object.

**Benefits:**
- Zero development time
- Simple UX

**Drawbacks:**
- Tedious for large collections
- No "slideshow" mode
- Inconsistent with path UX

### Playback Control UI Design

#### **Minimal Control Set:**
```
[◀ Previous] [⏸️ Pause/▶️ Play] [Next ▶]
```

#### **Extended Control Set:**
```
[🔀 Shuffle] [◀◀ First] [◀ Previous] [⏸️ Pause/▶️ Play] [Next ▶] [Last ▶▶] [🔁 Loop]
```

#### **Current Path Behavior:**
- Auto-advance on object close
- Loop at end (restart from beginning)
- No pause (playback stops when path closed)

#### **Recommended Behavior (for both Paths & Furniture):**
- **Auto-advance:** ON by default (configurable)
- **Loop:** ON by default (configurable)
- **Pause:** Show paused overlay on current object
- **Skip controls:** Forward/back work immediately
- **Close preview:** Stops playback vs continues in background (configurable)

---

## Issue #3: Small Stage Featured Marker Not Working

### Current State

**Small Stage Structure:**
- Platform with roof, back wall, pillars
- **30 marker capacity** (5 rows × 6 columns)
- Back rows: 2 rows of regular markers (blue cylinders)
- **Featured marker:** Front-center gold cylinder (visual only)

**Problem:** Cannot seat object on featured marker

### Investigation Findings

1. **Marker Generation (`furnitureDataModel.js` lines 360-376):**
   ```javascript
   generateStageSmallSlots() {
       const { width, height, depth, rows, columns } = this.geometryParams;
       const spacingX = width / (columns + 1);
       const backRows = 2; // Only 2 back rows
       const rowSpacing = depth / 4;
       
       // Create 2 back rows
       for (let row = 0; row < backRows; row++) {
           for (let col = 0; col < columns; col++) {
               const x = (col - (columns - 1) / 2) * spacingX;
               const y = height + 0.5; // On top of platform
               const z = -depth / 2 + row * rowSpacing + rowSpacing;
               
               this.positions.push({ x, y, z });
           }
       }
       
       // Add single front center marker position (gold marker will be visual only)
       // Note: The visual gold marker is created in furnitureVisualManager, not as a slot
   }
   ```

2. **Visual Gold Marker (`furnitureVisualManager.js` lines 343-352):**
   ```javascript
   // Center stage marker (featured position) - glowing yellow cylinder
   const markerMaterial = new THREE.MeshStandardMaterial({
       color: 0xFFD700, // Gold
       emissive: 0xFFD700,
       emissiveIntensity: 0.5,
       metalness: 0.8,
       roughness: 0.2
   });
   const markerGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
   const centerMarker = new THREE.Mesh(markerGeometry, markerMaterial);
   centerMarker.position.set(0, height + 0.05, depth / 2 - 1);
   centerMarker.userData = this.createStructureUserData(furniture);
   furnitureGroup.add(centerMarker);
   visualElements.structure.push(centerMarker); // WRONG ARRAY!
   ```

3. **Root Cause:**
   - Featured marker is added to `structure[]` array (non-interactive)
   - Should be added to `slots[]` array (interactive markers)
   - Comment says "visual only" - confirming it was intentionally excluded
   - Position is NOT added to `furniture.positions[]` array

4. **Why This Happened:**
   - Original design: Featured marker was decorative (spotlight position)
   - Not intended for object seating
   - Changed requirement: Now should be functional

### Recommendations

#### **Fix Featured Marker (Recommended)**
Make featured marker functional as first marker in playlist.

**Implementation:**
```javascript
// In furnitureDataModel.js - generateStageSmallSlots()
generateStageSmallSlots() {
    const { width, height, depth, rows, columns } = this.geometryParams;
    const spacingX = width / (columns + 1);
    const backRows = 2;
    const rowSpacing = depth / 4;
    
    // ADD FEATURED MARKER FIRST (index 0)
    this.positions.push({
        x: 0,                    // Front center
        y: height + 0.5,        // On platform surface
        z: depth / 2 - 1        // Near front edge
    });
    
    // Then add back row markers (indices 1-12)
    for (let row = 0; row < backRows; row++) {
        for (let col = 0; col < columns; col++) {
            const x = (col - (columns - 1) / 2) * spacingX;
            const y = height + 0.5;
            const z = -depth / 2 + row * rowSpacing + rowSpacing;
            
            this.positions.push({ x, y, z });
        }
    }
}

// In furnitureVisualManager.js - createMarkers()
// Featured marker at slot[0] should use gold material
if (slotIndex === 0 && furniture.type === FURNITURE_TYPES.STAGE_SMALL) {
    markerMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: 0.3
    });
}

// Remove decorative gold marker from createStageStructure()
// (Delete lines 343-352)
```

**Result:**
- Total markers: 13 (1 featured + 12 back row)
- Featured marker is slot[0] (first in playlist)
- Gold appearance preserved
- Fully functional for object seating

**Complexity:** Low (30 minutes)

#### **Alternative: Add More Featured Markers**
Expand featured positions to front row (6 markers).

**Implementation:**
- Add full front row: 6 featured positions
- Total capacity: 18 markers (6 front + 12 back)
- All front markers use gold material
- Good for "lead singers" vs "chorus"

**Complexity:** Low (1 hour)

---

## Unified Recommendations Summary

### Priority 1: Fix Featured Marker (MUST DO)
**Time:** 30 minutes  
**Impact:** Fixes broken functionality

### Priority 2: Add Furniture Playback (HIGH VALUE)
**Time:** 6-8 hours (unified system)  
**Impact:** Major feature parity with paths

**Recommended Approach:**
- Unified `PlaybackManager` for both furniture and paths
- Floating control bar UI (Flutter widget)
- Controls: [◀ Previous] [⏸️ Pause/▶️ Play] [Next ▶]
- Auto-advance ON by default
- Loop ON by default

### Priority 3: Add Auto-Sort to Furniture (NICE TO HAVE)
**Time:** 2-3 hours (full implementation)  
**Impact:** QoL improvement for organization

**Recommended Approach:**
- Full auto-sort matching path functionality
- UI toggle in furniture options menu
- Default sort: Alphabetical by name

---

## Simpler/More Intuitive Control Ideas

### Current Path Playback Issues:
1. No visible controls during playback
2. Users don't know playback is active
3. No way to pause/resume
4. No way to go back to previous object

### Proposed Unified Control Panel

**Location:** Floating bar at bottom of screen (only visible during playback)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ 🎵 Playing: "PhotoName.jpg" (3/15)             │
│                                                 │
│ [◀◀] [◀ Prev] [⏸️ Pause] [Next ▶] [▶▶]         │
│                                                 │
│ [🔁 Loop: ON] [🔀 Shuffle: OFF] [⚙️ Settings]  │
└─────────────────────────────────────────────────┘
```

**Controls:**
- **◀◀ First:** Jump to first object
- **◀ Prev:** Previous object
- **⏸️ Pause/▶️ Play:** Toggle playback
- **Next ▶:** Next object
- **▶▶ Last:** Jump to last object
- **🔁 Loop:** Toggle loop mode
- **🔀 Shuffle:** Toggle shuffle mode
- **⚙️ Settings:** Playback preferences

**Settings Options:**
- Auto-advance speed (immediate / 3s delay / 5s delay)
- Loop mode (once / repeat all / repeat one)
- Close behavior (stop / continue in background)
- Shuffle mode

**Interaction:**
- Tap object in preview → Skip to that object
- Swipe preview left → Next
- Swipe preview right → Previous
- Double-tap furniture/path → Toggle playback
- Single-tap furniture/path → Show playlist view

### Alternative: Gesture-Based Controls

**Simpler Approach (No UI):**
- **Double-tap container:** Start/stop playback
- **Swipe left on preview:** Next object
- **Swipe right on preview:** Previous object
- **Long-press preview:** Pause/resume

**Benefits:**
- No screen real estate
- Natural touch gestures
- Cleaner interface

**Drawbacks:**
- Not discoverable
- No visual feedback for playback state

---

## Questions for User

1. **Auto-Sort:** Do you want automatic sorting or just a "Sort Now" button?

2. **Playback Controls:** Do you prefer:
   - Visible control bar (always shows current state)
   - Gesture-only (cleaner but less discoverable)
   - Hybrid (gestures + minimal indicator)

3. **Featured Markers:** Should other furniture get featured markers?
   - Gallery Wall: Top row = featured?
   - Bookshelf: Top shelf = featured?
   - Amphitheatre: Front row = featured?

4. **Playlist Behavior:** For furniture with mixed object types (video/image/audio):
   - Auto-advance through all?
   - Group by type?
   - User choice?

5. **Future Enhancements:** Priority ranking?
   - [ ] Auto-sort
   - [ ] Playback controls
   - [ ] Featured markers
   - [ ] Shuffle mode
   - [ ] Playlist editing UI
   - [ ] Object tagging/filtering
