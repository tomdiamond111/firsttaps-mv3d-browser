# Instructions Dialog Fix - March 17, 2026

## Problem
The startup instructions dialog (Welcome Dialog) was not closeable or tappable. Users could not:
- Click the close button (X) in the header
- Click the "Got It!" button at the bottom  
- Tap outside the dialog to dismiss it

The dialog would appear and remain stuck on screen, blocking all user interaction.

## Root Cause
The Welcome Instructions Dialog was managing iframe pointer events DIFFERENTLY from other dialogs:

1. **Welcome Dialog** called its own `show()` method which used:
   - `html.document.querySelector('iframe')` to find tframe
   - Set `pointer-events: none` in its own try/finally block
   
2. **Other dialogs** used WorldViewScreen's `_showDialogWithIframeDisabled()` helper which used:
   - Direct reference to `_iframeElement` stored in WorldViewScreen
   - Managed pointer events consistently

This dual management approach caused conflicts where:
- The iframe's pointer-events might not be restored correctly
- Different DOM querySelector results vs stored element references
- Timing issues between multiple dialog flows

The same issue affected:
- Music Preferences Dialog
- Privacy Policy Dialog

## Solution
Centralized ALL dialog iframe management through WorldViewScreen's `_showDialogWithIframeDisabled()` helper method:

### 1. Updated Dialog Widgets
Removed iframe pointer-events management from:
- `lib/widgets/welcome_instructions_dialog.dart`
- `lib/widgets/music_preferences_dialog.dart`
- `lib/widgets/privacy_policy_dialog.dart`

These dialogs now only handle their UI display, not iframe management.

### 2. Added Callbacks to OptionsMenuWidget
Added three new callback parameters:
- `onShowInstructions` - Shows welcome dialog
- `onShowMusicPreferences` - Shows music preferences dialog
- `onShowPrivacyPolicy` - Shows privacy policy dialog

### 3. Updated WorldViewScreen
All dialog displays now use `_showDialogWithIframeDisabled()`:

```dart
// Welcome dialog during first launch
await _showDialogWithIframeDisabled(
  (dialogContext) => WelcomeInstructionsDialog(
    onClose: () => Navigator.of(dialogContext).pop(),
  ),
);

// From options menu
onShowInstructions: () {
  _showDialogWithIframeDisabled(
    (instructionsContext) => WelcomeInstructionsDialog(
      onClose: () => Navigator.of(instructionsContext).pop(),
    ),
  );
},
```

## Files Changed

### Modified Files
1. **lib/widgets/welcome_instructions_dialog.dart**
   - Removed iframe management from `show()` method
   - Added documentation comment about iframe handling

2. **lib/widgets/music_preferences_dialog.dart**
   - Removed iframe management from `show()` method
   - Added documentation comment about iframe handling

3. **lib/widgets/privacy_policy_dialog.dart**
   - Removed iframe management from `show()` method
   - Added documentation comment about iframe handling

4. **lib/widgets/options_menu_widget.dart**
   - Added `onShowInstructions` callback property
   - Added `onShowMusicPreferences` callback property
   - Added `onShowPrivacyPolicy` callback property
   - Updated `onTap` handlers to use callbacks instead of direct dialog calls

5. **lib/screens/world_view_screen.dart**
   - Updated first-launch welcome dialog to use `_showDialogWithIframeDisabled()`
   - Updated first-launch music preferences to use `_showDialogWithIframeDisabled()`
   - Added callbacks to OptionsMenuWidget instantiation:
     - `onShowInstructions`
     - `onShowMusicPreferences`
     - `onShowPrivacyPolicy`

## Testing Required
After deploying this fix, verify:

1. **First Launch Flow:**
   - Clear browser cache and localStorage
   - Reload app
   - Welcome dialog should appear and be dismissible via:
     - Close button (X)
     - "Got It!" button
     - Clicking outside dialog
   - Music preferences dialog should appear next
   - Music preferences should be dismissible

2. **Options Menu Flow:**
   - Open options menu (⋮ button)
   - Tap "Instructions" → Welcome dialog appears and is closeable
   - Tap "Music Preferences" → Dialog appears and is closeable
   - Tap "Privacy Policy" → Dialog appears and is closeable

3. **3D World Interaction:**
   - After closing dialogs, verify 3D canvas is responsive
   - Can tap/click objects in the 3D world
   - Can navigate with mouse/touch controls

## Technical Details

### Iframe Pointer Events Management
The `_showDialogWithIframeDisabled()` helper ensures:
- Iframe pointer events disabled BEFORE dialog shows
- Dialog can receive all mouse/touch events
- Iframe pointer events restored AFTER dialog closes (via finally block)
- Works even if dialog is dismissed by clicking outside

### Consistent Pattern
ALL dialogs now follow the same pattern:
```dart
_showDialogWithIframeDisabled(
  (dialogContext) => SomeDialog(...),
)
```

This ensures:
- No conflicts between different iframe management approaches
- Predictable behavior for all dialogs
- Proper cleanup even if errors occur

## Version Info
- Fix Date: March 17, 2026
- Files Changed: 5
- Issue: Instructions dialog not closeable
- Status: ✅ Fixed - Ready for testing
