# Furniture Playback Testing Guide

**Bundle:** 20251219_1559  
**Test Date:** _____________  
**Tester:** _____________

---

## Test 1: Featured Marker Fix

### Setup
1. Open app with new bundle
2. Create a small stage furniture piece
3. Observe the markers

### Expected Results
- ✅ Gold marker appears at front-center position (slot[0])
- ✅ 12 blue markers in two back rows
- ✅ Total of 13 markers visible

### Test Actions
1. Drag a photo/video object to the gold marker
2. Release near the gold marker

### Expected Results
- ✅ Object snaps to gold marker
- ✅ Object is seated on the marker
- ✅ Can tap seated object to open media

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:** _______________________________________________

---

## Test 2: Basic Playback Navigation

### Setup
1. Create bookshelf or gallery wall
2. Add 4-5 media objects (mix of photos, videos, audio)
3. Verify all objects are seated

### Test Actions
**A. Start Playback**
1. Tap any occupied marker

### Expected Results
- ✅ Media opens immediately
- ✅ Tapped marker glows orange (playing)
- ✅ Next marker glows green (next up)
- ✅ Previous markers (if any) glow red (played)
- ✅ Empty markers remain blue/invisible

**B. Auto-Advance**
1. Close the media preview

### Expected Results
- ✅ Next media opens automatically after ~100ms
- ✅ Orange marker shifts to new current
- ✅ Green marker shifts to next
- ✅ Previous markers remain red

**C. Complete Playlist**
1. Let playlist play through all objects

### Expected Results
- ✅ Plays through all occupied slots
- ✅ Reaches last object
- ✅ Closes last media
- ✅ Loops back to first object (auto-loop)

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:** _______________________________________________

---

## Test 3: Marker Tap Navigation

### Setup
1. Use furniture with 5+ objects
2. Start playback on first object

### Test Actions
**A. Skip Forward**
1. While media is open, tap a green marker (next)

### Expected Results
- ✅ Current media closes
- ✅ Selected media opens
- ✅ Orange glow moves to selected marker
- ✅ Markers update correctly (red=played, green=next)

**B. Jump Backward**
1. Tap a red marker (previously played)

### Expected Results
- ✅ Current media closes
- ✅ Selected media opens
- ✅ Can replay already-played content
- ✅ Markers update correctly

**C. Jump Multiple Slots**
1. Tap a marker 3+ slots away

### Expected Results
- ✅ Jumps correctly to selected slot
- ✅ All intermediate markers marked as played (red)
- ✅ Playback continues from selected slot

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:** _______________________________________________

---

## Test 4: Smart Auto-Sort

### Setup
1. Create bookshelf with auto-sort enabled
2. Set sort criteria to "Name" ascending

### Test Actions
**A. Add New Objects**
1. Drag 3 objects to furniture (names: "Zebra", "Apple", "Monkey")

### Expected Results
- ✅ Objects auto-sort by name: Apple, Monkey, Zebra
- ✅ Markers are filled in sorted order

**B. Manual Rearrangement**
1. Tap-hold object on furniture
2. Drag to different slot on SAME furniture
3. Release to move

### Expected Results
- ✅ Object moves to new slot
- ✅ Furniture does NOT re-sort
- ✅ Manual arrangement is preserved

**C. Add Another New Object**
1. Drag a new object (name: "Banana") to furniture

### Expected Results
- ✅ New object is sorted into correct position
- ✅ Previously manually-arranged objects stay in place
- ✅ Only the new object is inserted/sorted

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:** _______________________________________________

---

## Test 5: Edge Cases

### Test 5A: Empty Markers
**Action:** Tap an empty marker  
**Expected:** Nothing happens (no error)  
**Status:** ⬜ Pass / ⬜ Fail

### Test 5B: Single Object
**Action:** Furniture with only 1 object, start playback  
**Expected:** Opens media, loops to same object on close  
**Status:** ⬜ Pass / ⬜ Fail

### Test 5C: Sparse Furniture
**Action:** Furniture with objects at slots 0, 3, 7 (gaps)  
**Expected:** Playback skips empty slots correctly  
**Status:** ⬜ Pass / ⬜ Fail

### Test 5D: Remove During Playback
**Action:** Delete an object while playback is active  
**Expected:** Playback continues or stops gracefully (no crash)  
**Status:** ⬜ Pass / ⬜ Fail

### Test 5E: Multiple Furniture Pieces
**Action:** Two furniture pieces with playback, switch between them  
**Expected:** Each maintains independent playback state  
**Status:** ⬜ Pass / ⬜ Fail

**Notes:** _______________________________________________

---

## Test 6: Visual Verification

### Marker Colors
- ⬜ Inactive (blue): Unplayed objects - dull appearance
- ⬜ Next (green): Next in queue - medium glow
- ⬜ Playing (orange): Current media - bright glow
- ⬜ Played (red): Already played - dim glow
- ⬜ Featured (gold): Slot[0] on stages - gold appearance

### Marker Behavior
- ⬜ Glow radius changes (no size changes)
- ⬜ Smooth material transitions
- ⬜ No flickering or visual glitches

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:** _______________________________________________

---

## Test 7: Performance

### Test Actions
1. Create furniture with max capacity (30 objects for amphitheatre)
2. Start playback
3. Skip through multiple objects rapidly

### Expected Results
- ⬜ No lag or stuttering
- ⬜ Marker updates are smooth
- ⬜ Media opens quickly
- ⬜ No memory leaks after extended use

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:** _______________________________________________

---

## Test 8: Furniture Types

Test playback on each furniture type:

- ⬜ **Bookshelf** (20 capacity)
- ⬜ **Riser** (5 capacity)  
- ⬜ **Gallery Wall** (12 capacity)
- ⬜ **Stage Small** (13 capacity) - Test featured marker
- ⬜ **Stage Large** (20 capacity) - Test featured marker
- ⬜ **Amphitheatre** (30 capacity)

**Notes:** _______________________________________________

---

## Critical Issues Found

| Issue # | Description | Severity | Reproducible? |
|---------|-------------|----------|---------------|
| 1 |  | High/Med/Low | Yes/No |
| 2 |  | High/Med/Low | Yes/No |
| 3 |  | High/Med/Low | Yes/No |

---

## Console Log Checks

Look for these logs during testing:

✅ Success Logs:
- `🪑 Started playback on furniture X at slot Y`
- `🪑 Playing next: slot Y`
- `🪑 Jumped to slot Y on furniture X`
- `🪑 Auto-sorting NEW object`
- `🪑 Object being rearranged manually - skipping auto-sort`

⚠️ Warning Logs (Should Not Appear):
- `🪑 Cannot start playback - furniture not found`
- `🪑 Object not found`
- Any JavaScript errors or stack traces

---

## Overall Assessment

**Features Working:** ____ / 8  
**Bugs Found:** ____  
**Ready for Production:** ⬜ Yes / ⬜ No / ⬜ With Fixes

**Summary:**
_______________________________________________
_______________________________________________
_______________________________________________

**Recommendations:**
_______________________________________________
_______________________________________________
_______________________________________________

**Tester Signature:** _________________ **Date:** _________
