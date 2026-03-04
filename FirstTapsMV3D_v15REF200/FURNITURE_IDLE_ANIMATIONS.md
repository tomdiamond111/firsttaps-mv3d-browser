# Furniture Idle Animations System

## Overview

The Furniture Idle Animation System adds visual effects to furniture when **NOT** in playback mode, creating an "attraction mode" that makes the 3D world feel alive and draws user attention to interactive furniture.

## Features

### Animation Types by Furniture

1. **Choir Riser** - "Wave of Voices" 🔵
   - Blue glow wave flows across 3 tiers from bottom to top
   - Like voices rising in a choir
   - 4-second cycle with 300ms tier stagger
   - Emissive intensity: 0-0.35

2. **Gallery Wall** - "Heartbeat" ❤️
   - Red/pink dual-pulse pattern
   - Like a beating heart of creativity
   - 1.2-second cycle (strong pulse → weak pulse → pause)
   - Subtle breathing scale animation (1.0 → 1.008 → 1.0)
   - Emissive intensity: 0-0.4

3. **Stage (Small & Large)** - "Spotlight Sweep" 💡
   - Golden/orange spotlights sweep across structure
   - Like stage lights during sound check
   - 3-3.5 second cycle
   - Each structure element illuminated sequentially
   - Emissive intensity: 0-0.45

4. **Amphitheatre** - "Aurora Wave" 🌈
   - Rainbow gradient flows across 5 tiers
   - Like northern lights dancing
   - 5-second full rainbow cycle
   - Each tier offset by 72 degrees (360/5)
   - Constant glow with shimmer (0.25-0.5 intensity)
   - Metalness animation for extra shimmer

## Implementation

### Files

- **`assets/web/js/modules/furniture/furnitureIdleAnimations.js`** - Main animation module
- **`assets/web/js/modules/furniture/furnitureVisualManager.js`** - Integration (initializes animation manager)
- **`assets/web/js/threeSetup.js`** - Main loop integration (calls updateAllAnimations)
- **`assets/web/js/build_modular_fixed.ps1`** - Build script (includes new module)

### Architecture

```
Main Animation Loop (threeSetup.js)
    ↓
FurnitureVisualManager.idleAnimationManager
    ↓
updateAllAnimations() → checks each furniture
    ↓
If furniture.isPlaying === false:
    → updateFurnitureAnimation()
        → animateRiserWave()
        → animateGalleryHeartbeat()
        → animateStageSweep()
        → animateAmphitheatreRainbow()

If furniture.isPlaying === true:
    → stopAnimation() (clears emissive effects)
```

### Performance

- **Per-furniture cost:** ~0.1-0.3ms per frame
- **10 furniture pieces:** ~1-3ms total (well within 60fps budget)
- **Optimization:** Only animates furniture NOT in playback
- **No geometry changes:** Only material property updates (emissive, metalness, scale)

## Material Color Preservation

**Critical Design:** Animations use **additive emissive** effects, NOT color replacement!

- Base material color (`material.color`) stays intact
- Emissive glow added ON TOP of base color
- Reduced emissive intensities (0.35-0.5 max) preserve color differentiation
- Furniture styles remain distinguishable:
  - Woodgrain (brown) - still looks brown with blue/gold/rainbow glow
  - Marble (white) - still looks white with glow
  - Metal (black) - still looks black with glow
  - Silver - retains metallic appearance
  - Glass (cyan transparent) - retains translucency
  - Neon (magenta) - combines with animation glow

## Customization

### Adjusting Animation Parameters

Edit `furnitureIdleAnimations.js` → `this.params` object:

```javascript
this.params = {
    riser: {
        glowColor: 0x4A90E2,        // Change blue color
        maxIntensity: 0.35,          // Increase/decrease brightness
        waveSpeed: 2.0,              // Faster/slower wave
        tierStagger: 0.3,            // More/less tier delay
        cyclePeriod: 4.0             // Longer/shorter pause
    },
    // ... etc
};
```

### Disabling Animations

```javascript
// In browser console:
window.app.furnitureManager.visualManager.idleAnimationManager.setEnabled(false);

// Re-enable:
window.app.furnitureManager.visualManager.idleAnimationManager.setEnabled(true);
```

### Adding New Furniture Type Animation

1. Add case to `updateFurnitureAnimation()` switch statement
2. Create new `animate[Type]()` method
3. Define animation parameters in `this.params`

Example:
```javascript
// In updateFurnitureAnimation():
case window.FURNITURE_TYPES.NEW_TYPE:
    this.animateNewTypeCool(visualElements.structure, time, this.params.new_type);
    break;

// New method:
animateNewTypeCool(structures, time, params) {
    // Your animation logic here
    structures.forEach(mesh => {
        mesh.material.emissive.setHex(0xFF0000);
        mesh.material.emissiveIntensity = Math.sin(time) * 0.5;
    });
}
```

## Testing

### Visual Verification

1. Launch app and create furniture (any type)
2. Watch for idle animations (should start immediately)
3. Tap object on furniture → playback starts
4. Verify animation stops during playback
5. Close media preview → animation resumes

### Performance Testing

```javascript
// In browser console:
const startTime = performance.now();
window.app.furnitureManager.visualManager.idleAnimationManager.updateAllAnimations(
    window.app.furnitureManager.visualManager,
    performance.now()
);
const duration = performance.now() - startTime;
console.log(`Animation update took ${duration.toFixed(2)}ms`);
```

## Troubleshooting

### Animations not appearing?

1. **Check if animation manager initialized:**
   ```javascript
   console.log(window.app?.furnitureManager?.visualManager?.idleAnimationManager);
   // Should output: FurnitureIdleAnimationManager {...}
   ```

2. **Check if enabled:**
   ```javascript
   console.log(window.app.furnitureManager.visualManager.idleAnimationManager.isEnabled);
   // Should output: true
   ```

3. **Check furniture playback state:**
   ```javascript
   window.app.furnitureManager.storageManager.getAllFurniture().forEach(f => {
       console.log(`${f.name}: isPlaying = ${f.isPlaying}`);
   });
   // Animations only run when isPlaying = false
   ```

### Animations not stopping during playback?

- Ensure `furniture.isPlaying` is set to `true` in `furnitureManager.js` when playback starts
- Check console for "🎨 Stopped idle animation for furniture..." message

### Base colors not visible?

- Reduce `maxIntensity` values in `this.params`
- Check that materials have proper base color set
- Verify `material.emissive` is being reset to 0x000000 when not animating

## Future Enhancements

Potential additions:
- [ ] Audio-reactive animations (pulse with music)
- [ ] Particle effects (floating hearts for gallery, stars for amphitheatre)
- [ ] LOD system (simpler animations for distant furniture)
- [ ] Camera frustum culling (don't animate furniture off-screen)
- [ ] User-customizable animation styles per furniture
- [ ] Playback progress indicator animations

## Related Documentation

- [FURNITURE_IMPLEMENTATION_SUMMARY.md](FURNITURE_IMPLEMENTATION_SUMMARY.md) - Core furniture system
- [FURNITURE_PLAYBACK_IMPLEMENTATION.md](FURNITURE_PLAYBACK_IMPLEMENTATION.md) - Playback system
- [MV3D_QUICK_REFERENCE.md](MV3D_QUICK_REFERENCE.md) - General MV3D features

---

**Implementation Date:** January 15, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
