# Furniture & Path Auto-Sort Feature - Investigation & Recommendations

## Executive Summary

**Goal:** Enable users to drag-and-drop objects onto furniture/paths with Y-axis vertical placement support, plus an auto-sort toggle for both furniture AND paths.

**Current State:**
- ✅ Paths have snap-to-marker functionality (X/Z axes only)
- ✅ Furniture has slot markers but NO snap-to functionality
- ✅ Stacking/sorting configuration exists globally
- ❌ No auto-sort toggle for furniture
- ❌ No auto-sort toggle for paths
- ❌ No Y-axis drag support for vertical placement

---

## Part 1: Drag-and-Drop with Y-Axis Vertical Placement

### Current Implementation Analysis

#### **Path Snap-to-Marker (Working)**
- **Location:** `assets/web/js/modules/paths/pathManager.js` lines 420-500
- **How it works:**
  1. User drags object near a path marker (X/Z proximity check)
  2. `findNearestPathStep()` calculates 2D distance (X/Z only)
  3. `snapObjectToPath()` animates object to marker position + 1.0 elevation
  4. Object position persists with `userData.preservePosition = true`
  5. Visual feedback: Blue flash on marker

**Limitation:** Only works for ground-level paths (Y is fixed at marker.y + 1.0)

#### **Furniture Slot Markers (Not Snapping)**
- **Location:** `assets/web/js/modules/furniture/furnitureVisualManager.js` lines 419-450
- **Current state:**
  - Slot markers exist visually (gray cylinders)
  - Markers have full userData for raycasting
  - NO snap functionality implemented
  - Objects can be manually placed but don't auto-snap

**Gap:** Furniture has markers but no snap-to logic

---

### Recommended Implementation

#### **1. Extend Movement System for Y-Axis Dragging**

**File:** `assets/web/js/modules/interaction/moveManager.js`

**Current Limitation:**
- Movement is constrained to ground plane (Y is fixed by `getIntersectionWithGroundPlane()`)
- Need to detect when user is near vertical furniture and allow Y-axis movement

**Solution: Multi-Axis Drag Mode**

```javascript
// Add to moveManager.js

/**
 * Determine if we should use Y-axis drag mode (for vertical furniture placement)
 */
shouldUseYAxisDragMode(object, mousePosition) {
    // Check if object is near furniture or elevated path
    const nearbyFurniture = this.findNearbyFurniture(object.position, 5.0);
    const nearbyElevatedMarkers = this.findNearbyElevatedMarkers(object.position, 5.0);
    
    return nearbyFurniture || nearbyElevatedMarkers;
}

/**
 * Get intersection with vertical plane (for Y-axis dragging)
 */
getIntersectionWithVerticalPlane(mouse) {
    this.raycaster.setFromCamera(mouse, this.camera);
    
    // Create a vertical plane at the furniture/marker's X/Z position
    const verticalPlane = new THREE.Plane(
        new THREE.Vector3(0, 0, 1), // Normal pointing in Z direction
        -this.dragTargetPosition.z  // Distance from origin
    );
    
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(verticalPlane, intersection);
    
    return intersection;
}

/**
 * Enhanced drag with Y-axis support
 */
handleDragMove(event) {
    if (!this.isDragging || !this.draggedObject) return;
    
    const mouse = this.getMousePosition(event);
    
    if (this.useYAxisMode) {
        // Vertical drag for furniture placement
        const intersection = this.getIntersectionWithVerticalPlane(mouse);
        if (intersection) {
            this.draggedObject.position.y = intersection.y;
            // Constrain Y to valid range (0.5 to max furniture height)
            this.draggedObject.position.y = Math.max(0.5, Math.min(10.0, intersection.y));
        }
    } else {
        // Standard ground plane drag
        const intersection = this.getIntersectionWithGroundPlane(mouse);
        if (intersection) {
            this.draggedObject.position.x = intersection.x;
            this.draggedObject.position.z = intersection.z;
        }
    }
    
    // Check for nearby markers (furniture or path)
    this.checkForMarkerProximity(this.draggedObject);
}
```

**Complexity:** Medium
**Files to modify:** 
- `moveManager.js` (~200 lines of changes)
- Test with bookshelf, gallery wall, choir riser

---

#### **2. Add Furniture Snap-to-Slot Logic**

**File:** `assets/web/js/modules/furniture/furnitureManager.js`

**New Methods Needed:**

```javascript
/**
 * Find nearest furniture slot to object position (3D distance with Y support)
 */
findNearestFurnitureSlot(objectPosition, maxDistance = 3.0) {
    let nearestFurniture = null;
    let nearestSlotIndex = -1;
    let nearestDistance = maxDistance;
    
    this.storageManager.getAllFurniture().forEach(furniture => {
        const visualElements = this.visualManager.furnitureMeshes.get(furniture.id);
        if (!visualElements) return;
        
        visualElements.slots.forEach((slot, index) => {
            // Get slot WORLD position (handles furniture rotation/position)
            const worldPos = new THREE.Vector3();
            slot.getWorldPosition(worldPos);
            
            // 3D distance calculation (includes Y-axis)
            const dx = objectPosition.x - worldPos.x;
            const dy = objectPosition.y - worldPos.y;
            const dz = objectPosition.z - worldPos.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestFurniture = furniture;
                nearestSlotIndex = index;
            }
        });
    });
    
    return nearestFurniture ? { furniture: nearestFurniture, slotIndex: nearestSlotIndex, distance: nearestDistance } : null;
}

/**
 * Snap object to furniture slot with visual feedback
 */
async snapObjectToFurnitureSlot(objectMesh, snapInfo) {
    const { furniture, slotIndex } = snapInfo;
    
    // Check if slot is already occupied
    if (furniture.objectIds[slotIndex]) {
        console.warn(`🪑 Slot ${slotIndex} already occupied`);
        return false;
    }
    
    // Get slot marker's world position
    const visualElements = this.visualManager.furnitureMeshes.get(furniture.id);
    const slot = visualElements.slots[slotIndex];
    const worldPos = new THREE.Vector3();
    slot.getWorldPosition(worldPos);
    
    // Animate object to slot position
    objectMesh.position.copy(worldPos);
    objectMesh.position.y += 0.5; // Elevate slightly above slot
    
    // Mark as furniture-seated
    objectMesh.userData.furnitureId = furniture.id;
    objectMesh.userData.furnitureSlotIndex = slotIndex;
    objectMesh.userData.preservePosition = true;
    
    // Update furniture data
    furniture.objectIds[slotIndex] = objectMesh.userData.id || objectMesh.userData.fileData?.path;
    await this.storageManager.updateFurniture(furniture);
    
    // Visual feedback: Flash slot blue
    const originalMaterial = slot.material;
    slot.material = this.visualManager.slotMaterials.active;
    setTimeout(() => {
        slot.material = this.visualManager.slotMaterials.occupied;
    }, 500);
    
    // Trigger auto-sort if enabled
    if (furniture.autoSort) {
        await this.autoSortFurnitureObjects(furniture.id);
    }
    
    return true;
}
```

**Integration with moveManager:**

```javascript
// In moveManager.js handleDragEnd()

// Check for furniture snap
const furnitureSnap = window.app.furnitureManager.findNearestFurnitureSlot(
    this.draggedObject.position, 
    3.0 // snap radius
);

if (furnitureSnap) {
    const snapped = await window.app.furnitureManager.snapObjectToFurnitureSlot(
        this.draggedObject, 
        furnitureSnap
    );
    
    if (!snapped) {
        // Slot occupied - return to previous position
        this.returnObjectToPreviousPosition(this.draggedObject);
    }
}
```

**Complexity:** Medium-High
**Files to modify:**
- `furnitureManager.js` (~150 lines)
- `moveManager.js` (~50 lines for integration)
- `furnitureDataModel.js` (add `autoSort` property)

---

## Part 2: Auto-Sort Toggle for Furniture & Paths

### Current State Analysis

#### **Stacking Configuration (Global)**
- **Location:** `assets/web/js/modules/sorting/sortingManager.js`
- **Config structure:**
```javascript
stackingConfig = {
    enabled: true,
    primarySort: 'fileName',  // or 'fileType', 'date', etc.
    secondarySort: 'fileType',
    grouping: true,
    direction: 'vertical'
}
```

**Gap:** This is GLOBAL, not per-furniture or per-path

#### **Furniture Data Model**
- **Location:** `assets/web/js/modules/furniture/furnitureDataModel.js`
- **Has:** `sortingCriteria` property (line ~100)
- **Missing:** `autoSort` boolean flag

#### **Path Data Model**
- **Location:** `assets/web/js/modules/paths/pathDataModel.js`
- **Missing:** Any sorting-related properties

---

### Recommended Implementation

#### **1. Add Auto-Sort Property to Furniture**

**File:** `assets/web/js/modules/furniture/furnitureDataModel.js`

```javascript
class Furniture {
    constructor(config = {}) {
        // ... existing properties ...
        
        // Auto-sort configuration (NEW)
        this.autoSort = config.autoSort !== undefined ? config.autoSort : true; // Default ON
        this.sortCriteria = config.sortCriteria || 'fileName'; // What to sort by
        this.sortDirection = config.sortDirection || 'ascending'; // asc/desc
        
        // Manual positions (when autoSort is OFF)
        this.manualPositions = config.manualPositions || {}; // { objectId: slotIndex }
    }
    
    /**
     * Serialize for storage
     */
    toJSON() {
        return {
            // ... existing fields ...
            autoSort: this.autoSort,
            sortCriteria: this.sortCriteria,
            sortDirection: this.sortDirection,
            manualPositions: this.manualPositions
        };
    }
}
```

#### **2. Add Auto-Sort Property to Paths**

**File:** `assets/web/js/modules/paths/pathDataModel.js`

```javascript
class Path {
    constructor(config = {}) {
        // ... existing properties ...
        
        // Auto-sort configuration (NEW)
        this.autoSort = config.autoSort !== undefined ? config.autoSort : true; // Default ON
        this.sortCriteria = config.sortCriteria || 'fileName';
        this.sortDirection = config.sortDirection || 'ascending';
        
        // Manual positions (when autoSort is OFF)
        this.manualPositions = config.manualPositions || {}; // { objectId: stepIndex }
    }
    
    toJSON() {
        return {
            // ... existing fields ...
            autoSort: this.autoSort,
            sortCriteria: this.sortCriteria,
            sortDirection: this.sortDirection,
            manualPositions: this.manualPositions
        };
    }
}
```

#### **3. Implement Auto-Sort Logic**

**File:** `assets/web/js/modules/furniture/furnitureManager.js`

```javascript
/**
 * Auto-sort objects in furniture based on configured criteria
 */
async autoSortFurnitureObjects(furnitureId) {
    const furniture = this.storageManager.getFurniture(furnitureId);
    if (!furniture || !furniture.autoSort) {
        console.log(`🪑 Auto-sort disabled for ${furnitureId}`);
        return;
    }
    
    console.log(`🪑 Auto-sorting furniture ${furnitureId} by ${furniture.sortCriteria}`);
    
    // Get all objects currently on furniture
    const objects = furniture.objectIds
        .map((id, slotIndex) => ({ id, slotIndex, mesh: this.findObjectById(id) }))
        .filter(obj => obj.mesh);
    
    if (objects.length === 0) return;
    
    // Sort objects based on criteria
    const sortedObjects = this.sortObjectsByCriteria(objects, furniture.sortCriteria, furniture.sortDirection);
    
    // Reassign to slots in sorted order
    furniture.objectIds = new Array(furniture.capacity).fill(null);
    
    sortedObjects.forEach((obj, index) => {
        if (index >= furniture.capacity) return;
        
        furniture.objectIds[index] = obj.id;
        
        // Update object position to new slot
        const slotPos = furniture.getSlotPosition(index);
        const furnitureGroup = this.visualManager.getFurnitureGroup(furniture.id);
        const worldPos = new THREE.Vector3(slotPos.x, slotPos.y, slotPos.z);
        furnitureGroup.localToWorld(worldPos);
        
        obj.mesh.position.copy(worldPos);
        obj.mesh.userData.furnitureSlotIndex = index;
    });
    
    // Persist updated furniture state
    await this.storageManager.updateFurniture(furniture);
    
    console.log(`🪑 Auto-sorted ${sortedObjects.length} objects on ${furnitureId}`);
}

/**
 * Sort objects based on criteria
 */
sortObjectsByCriteria(objects, criteria, direction) {
    const sorted = [...objects].sort((a, b) => {
        let aValue, bValue;
        
        switch (criteria) {
            case 'fileName':
                aValue = a.mesh.userData.fileName || '';
                bValue = b.mesh.userData.fileName || '';
                break;
            case 'fileType':
                aValue = a.mesh.userData.fileType || '';
                bValue = b.mesh.userData.fileType || '';
                break;
            case 'artist':
                aValue = a.mesh.userData.artist || '';
                bValue = b.mesh.userData.artist || '';
                break;
            case 'title':
                aValue = a.mesh.userData.title || '';
                bValue = b.mesh.userData.title || '';
                break;
            case 'date':
                aValue = a.mesh.userData.date || 0;
                bValue = b.mesh.userData.date || 0;
                break;
            default:
                aValue = a.mesh.userData.fileName || '';
                bValue = b.mesh.userData.fileName || '';
        }
        
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return direction === 'ascending' ? comparison : -comparison;
    });
    
    return sorted;
}
```

**Mirror implementation in pathManager.js for paths**

**Complexity:** Medium
**Files to modify:**
- `furnitureDataModel.js` (~30 lines)
- `pathDataModel.js` (~30 lines)
- `furnitureManager.js` (~100 lines)
- `pathManager.js` (~100 lines)

---

#### **4. Add Long-Press Menu Toggle UI**

**Files:** Flutter side - `lib/screens/helpers/three_js_javascript_channels.dart`

**Current:** Long-press shows basic move/delete menu (line 287-300)

**Enhancement:** Add "Auto-Sort Objects" toggle to menu

```dart
// In showObjectActionBottomSheet() for furniture/path

void showFurnitureActionMenu(String furnitureId, String furnitureName) {
  showModalBottomSheet(
    context: context,
    builder: (context) => Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Existing options...
        ListTile(
          leading: Icon(Icons.swap_vert),
          title: Text('Move Furniture'),
          onTap: () => _handleMoveFurniture(furnitureId),
        ),
        ListTile(
          leading: Icon(Icons.delete),
          title: Text('Delete Furniture'),
          onTap: () => _handleDeleteFurniture(furnitureId),
        ),
        
        // NEW: Auto-sort toggle
        SwitchListTile(
          secondary: Icon(Icons.sort),
          title: Text('Auto-Sort Objects'),
          subtitle: Text('Sort by: File Name (A-Z)'),
          value: _isAutoSortEnabled(furnitureId),
          onChanged: (bool value) {
            _toggleAutoSort(furnitureId, value);
          },
        ),
        
        // NEW: Sort criteria selector (when auto-sort is ON)
        if (_isAutoSortEnabled(furnitureId))
          ListTile(
            leading: Icon(Icons.settings),
            title: Text('Sort Settings'),
            trailing: Icon(Icons.chevron_right),
            onTap: () => _showSortSettingsDialog(furnitureId),
          ),
      ],
    ),
  );
}

void _toggleAutoSort(String furnitureId, bool enabled) async {
  // Send message to JavaScript
  await _webViewController.runJavaScript('''
    if (window.app && window.app.furnitureManager) {
      const furniture = window.app.furnitureManager.storageManager.getFurniture('$furnitureId');
      if (furniture) {
        furniture.autoSort = $enabled;
        window.app.furnitureManager.storageManager.updateFurniture(furniture);
        
        if ($enabled) {
          // Trigger immediate sort
          window.app.furnitureManager.autoSortFurnitureObjects('$furnitureId');
        }
      }
    }
  ''');
  
  Navigator.pop(context);
}
```

**Mirror for paths:**
- Same UI pattern
- Call `pathManager.toggleAutoSort()` instead

**Complexity:** Low-Medium
**Files to modify:**
- `three_js_javascript_channels.dart` (~150 lines)
- Create new sort settings dialog widget (~100 lines)

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
**Priority: HIGH**
1. Add `autoSort`, `sortCriteria`, `sortDirection` properties to Furniture & Path models
2. Update storage serialization/deserialization
3. Test data persistence across app restarts

**Deliverable:** Data model supports auto-sort configuration

---

### Phase 2: Auto-Sort Logic (Week 2)
**Priority: HIGH**
1. Implement `autoSortFurnitureObjects()` in furnitureManager.js
2. Implement `autoSortPathObjects()` in pathManager.js
3. Add `sortObjectsByCriteria()` helper
4. Test sorting by fileName, fileType, artist, title, date

**Deliverable:** Objects auto-sort when placed on furniture/paths

---

### Phase 3: Long-Press Menu UI (Week 2-3)
**Priority: MEDIUM**
1. Add "Auto-Sort Objects" toggle to furniture/path long-press menu
2. Add "Sort Settings" dialog with criteria selector
3. Wire up toggle to JavaScript manager
4. Test toggle persistence

**Deliverable:** Users can enable/disable auto-sort via UI

---

### Phase 4: Y-Axis Drag Support (Week 3-4)
**Priority: MEDIUM**
1. Extend moveManager.js with `shouldUseYAxisDragMode()`
2. Add `getIntersectionWithVerticalPlane()`
3. Modify `handleDragMove()` to support Y-axis
4. Test with bookshelf, gallery wall, choir riser

**Deliverable:** Users can drag objects vertically near furniture

---

### Phase 5: Snap-to-Slot for Furniture (Week 4-5)
**Priority: MEDIUM**
1. Implement `findNearestFurnitureSlot()` with 3D distance
2. Implement `snapObjectToFurnitureSlot()` with visual feedback
3. Integrate with moveManager drag-end
4. Add "return to previous position" if slot occupied
5. Test snap-to behavior with all furniture types

**Deliverable:** Objects snap to furniture slots like paths

---

### Phase 6: Polish & Testing (Week 5-6)
**Priority: LOW**
1. Add sound effects for snap (optional)
2. Add haptic feedback (optional)
3. Test edge cases (moving furniture with objects, undo/redo)
4. Performance testing with 100+ objects on amphitheatre
5. Document feature in user guide

**Deliverable:** Feature is production-ready

---

## Technical Risks & Mitigations

### Risk 1: Performance with Large Furniture
**Issue:** Amphitheatre has 100 slots - sorting could be slow

**Mitigation:**
- Debounce auto-sort (max 1 sort per 500ms)
- Use efficient sorting algorithms (quicksort)
- Cache sorted results until furniture changes

---

### Risk 2: Conflicts with Existing Stacking System
**Issue:** Global stacking config vs. per-furniture auto-sort

**Mitigation:**
- Furniture/path auto-sort takes precedence when objects are seated
- Only apply global stacking to unseated objects
- Clear `preservePosition` flag when object removed from furniture

---

### Risk 3: Y-Axis Drag Complexity
**Issue:** Vertical dragging might feel unnatural on mobile

**Mitigation:**
- Add visual guide (vertical line/plane indicator)
- Snap to nearest Y-level (quantize to shelf heights)
- Fallback to X/Z drag if user moves away from furniture

---

### Risk 4: Persistence Complexity
**Issue:** Manual positions need to persist when auto-sort OFF

**Mitigation:**
- Store `manualPositions` map: `{ objectId: slotIndex }`
- When toggling auto-sort OFF, snapshot current positions as manual
- When toggling ON, clear manual positions and re-sort

---

## Key Files to Modify

### JavaScript
1. **furnitureDataModel.js** - Add autoSort properties (~30 lines)
2. **pathDataModel.js** - Add autoSort properties (~30 lines)
3. **furnitureManager.js** - Snap & sort logic (~250 lines)
4. **pathManager.js** - Snap & sort logic (~150 lines)
5. **moveManager.js** - Y-axis drag support (~200 lines)

### Flutter/Dart
6. **three_js_javascript_channels.dart** - Menu enhancements (~150 lines)
7. **New: sort_settings_dialog.dart** - Sort criteria UI (~100 lines)

### Total Estimated Changes
- **~910 lines of new/modified code**
- **7 files**
- **~5-6 weeks development time**

---

## Success Criteria

### Must Have ✅
1. Objects snap to furniture slots when dragged nearby
2. Objects snap to path markers when dragged nearby (already works)
3. Y-axis dragging works for vertical furniture (bookshelf, gallery wall)
4. Auto-sort toggle in long-press menu for furniture
5. Auto-sort toggle in long-press menu for paths
6. Objects sort by fileName (A-Z) by default when auto-sort ON
7. Manual positions persist when auto-sort OFF
8. Settings persist across app restarts

### Should Have 🎯
1. Sort criteria selector (fileName, fileType, artist, title, date)
2. Visual feedback on snap (slot flash blue)
3. Return-to-previous-position if slot occupied
4. Sort direction toggle (ascending/descending)

### Nice to Have 🌟
1. Sound effects on snap
2. Haptic feedback on snap
3. Visual guide for Y-axis dragging
4. Animated transitions when auto-sorting
5. Undo support for auto-sort

---

## Conclusion

This feature is **feasible** and follows established patterns in the codebase:

- **Snap-to functionality:** Extend existing path snap logic to furniture with 3D distance
- **Auto-sort:** Leverage existing stacking configuration patterns but make per-furniture/path
- **Y-axis drag:** Extend moveManager with vertical plane intersection (moderate complexity)
- **UI integration:** Add toggles to existing long-press menu system

**Recommended Approach:** Phased implementation starting with auto-sort logic (easiest), then snap-to furniture, finally Y-axis drag (hardest).

**Estimated Timeline:** 5-6 weeks for full implementation and testing.

**Primary Challenges:**
1. Y-axis drag UX on mobile (needs careful testing)
2. Performance with 100-slot amphitheatre (needs optimization)
3. Coordination between furniture auto-sort and global stacking system
