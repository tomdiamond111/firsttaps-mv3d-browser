# MV3D App Changes for World-Themed Backgrounds

## File to Modify:
`FirstTapsMV3D_v10REF/assets/web/js/modules/sharing/furnitureShareManager.js`

## Changes Needed:

### 1. Add World Data to Share Structure (around line 145)

**Find this code:**
```javascript
// Build share data structure
const shareData = {
    version: '1.0',
    furniture: {
        id: furniture.id,
        type: furniture.type,
        name: furniture.name,
        style: furniture.style,
        position: furniture.position,
        rotation: furniture.rotation,
        capacity: furniture.capacity,
        autoSort: furniture.autoSort,
        sortCriteria: furniture.sortCriteria,
        sortDirection: furniture.sortDirection
    },
    objects,
    excludedCount,
    createdAt: new Date().toISOString()
};
```

**Replace with:**
```javascript
// Build share data structure
const shareData = {
    version: '1.0',
    furniture: {
        id: furniture.id,
        type: furniture.type,
        name: furniture.name,
        style: furniture.style,
        position: furniture.position,
        rotation: furniture.rotation,
        capacity: furniture.capacity,
        autoSort: furniture.autoSort,
        sortCriteria: furniture.sortCriteria,
        sortDirection: furniture.sortDirection
    },
    world: {
        type: this.app.currentWorldTemplate ? this.app.currentWorldTemplate.getType() : 'green-plane',
        name: this.getWorldDisplayName()
    },
    objects,
    excludedCount,
    createdAt: new Date().toISOString()
};
```

### 2. Add Helper Method (add at end of class, before the closing brace)

**Add this new method to the FurnitureShareManager class:**
```javascript
/**
 * Get display name for current world
 * @returns {string} - Human-readable world name
 */
getWorldDisplayName() {
    if (!this.app.currentWorldTemplate) return 'Green Plane World';
    
    const worldNames = {
        'green-plane': 'Green Plane World',
        'space': 'Space World',
        'ocean': 'Ocean World',
        'forest': 'Forest Realm',
        'dazzle': 'Dazzle Bedroom',
        'cave': 'Cave World',
        'christmas': 'Christmas World',
        'desert-oasis': 'Desert Oasis',
        'tropical-paradise': 'Tropical Paradise',
        'flower-wonderland': 'Flower Wonderland'
    };
    
    const worldType = this.app.currentWorldTemplate.getType();
    return worldNames[worldType] || worldType.replace(/-./g, x => ' ' + x[1].toUpperCase());
}
```

## Summary of Changes:
- Added `world` object to share data containing:
  - `type`: World template ID (e.g., 'space', 'ocean', 'forest')
  - `name`: Human-readable world name
- Added `getWorldDisplayName()` helper method to map world types to display names

## Result:
The furniture viewer will now automatically display the appropriate background theme matching the world the user was in when they shared the furniture playlist.

## Testing:
1. Share furniture from different worlds in the MV3D app
2. Open the shared links in the viewer
3. Verify the background matches the source world:
   - Space: Black background with stars
   - Ocean: Deep blue with fog
   - Forest: Green with mist
   - Dazzle: Pink/purple gradient
   - Green Plane: Sky blue
   - etc.
