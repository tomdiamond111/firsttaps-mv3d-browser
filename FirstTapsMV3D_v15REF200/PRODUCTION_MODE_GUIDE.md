# Production Mode Configuration Guide

## Overview
A centralized production/development mode flag system has been implemented to control ALL testing features across the app.

## Quick Start - Switching Between Modes

### For Production (Public Release)
**File:** `lib/config/app_config.dart`
```dart
static const bool isProduction = true;
```

**File:** `assets/web/js/modules/config/appConfig.js`
```javascript
IS_PRODUCTION: true,
```

### For Development/Testing
**File:** `lib/config/app_config.dart`
```dart
static const bool isProduction = false;  // Enable all testing features
```

**File:** `assets/web/js/modules/config/appConfig.js`
```javascript
IS_PRODUCTION: false,  // Enable all testing features
```

## What Gets Controlled

### When `isProduction = true` (ALL HIDDEN):
1. ❌ **Premium Gaming Popup** - No "Testing Mode" toggle visible
2. ❌ **Premium World Popup** - No test panel for toggling premium access
3. ❌ **Scoreboard Testing Controls** - No buttons visible:
   - Jump to Level 5
   - Set 55k Points
   - Toggle Premium
   - LEVEL 6 NOW!
   - FORCE LEVEL 6!

### When `isProduction = false` (ALL VISIBLE):
1. ✅ All testing toggles and buttons appear
2. ✅ Can unlock premium features for testing
3. ✅ Can manipulate points and levels

## Build Process

### After Changing the Flags:

1. **Rebuild JavaScript Bundles:**
   ```powershell
   cd assets\web\js
   .\build_modular_fixed.ps1 -Production
   ```

2. **Hot Restart Flutter App** (for testing):
   - Press `R` in terminal or click hot restart in VS Code

3. **Build Release AAB** (for production):
   ```powershell
   flutter build appbundle --release
   ```

## Files Modified

### Dart/Flutter Files:
- `lib/config/app_config.dart` - **Main production flag**
- `lib/services/premium_service.dart` - Uses AppConfig
- `lib/services/premium_gaming_webview_handler.dart` - Uses AppConfig
- `lib/controllers/home_page_controller.dart` - Uses AppConfig

### JavaScript Files:
- `assets/web/js/modules/config/appConfig.js` - **Main JS production flag**
- `assets/web/js/modules/entities/ui/simpleMobileScoreboard.js` - Uses AppConfig for debug mode
- `assets/web/js/modules/entities/managers/entityUIManager.js` - Uses AppConfig for test panel visibility
- `assets/web/js/build_modular_fixed.ps1` - Updated to include appConfig.js FIRST

## Important Notes

1. **Always keep both flags in sync:**
   - Dart: `lib/config/app_config.dart` → `isProduction`
   - JS: `assets/web/js/modules/config/appConfig.js` → `IS_PRODUCTION`

2. **Testing Checklist Before Production:**
   - [ ] Set both flags to `true`
   - [ ] Rebuild JavaScript bundles
   - [ ] Hot restart app
   - [ ] Verify scoreboard has NO testing buttons
   - [ ] Switch to premium world - verify NO test panel shows
   - [ ] Tap to levels 4/5 - verify NO testing toggle in popup
   - [ ] Build release AAB

3. **One Change = Easy Switch:**
   - Change 2 lines (one in Dart, one in JS)
   - Rebuild bundles
   - Restart/rebuild app
   - ALL testing features toggle together

## Current Status
- ✅ Production flags set to `true`
- ✅ JavaScript bundles rebuilt (timestamp: 20251119_2006)
- ⏳ Ready for testing before AAB build
