# Missing Functionality Analysis - Browser vs Mobile App

## 1. ADD CONTENT MENU

### Current Browser Version Has:
- Search Music/Videos ✅
- Paste Link/URL ✅
- Create Furniture ✅
- Furniture Manager ✅

### Mobile App Reference Has (MISSING):
- Add Files & Media ❌
- Add Apps ❌
- Add Contacts ❌
- Create Path ❌

**Action Required**: These are mobile-specific features, can remain disabled for browser version.

---

## 2. OBJECT INTERACTION HANDLERS

### Current Browser Implementation:
```dart
void _onObjectClicked(Map<dynamic, dynamic> data) {
  final objectId = data['objectId'] as String?;
  print('🖱️ Object clicked: $objectId');
  // TODO: Show object details dialog
}
```

### Mobile App Reference Implementation:
- Opens media preview for link objects
- Shows action bottom sheet for objects
- Handles double-tap to open in native app
- Supports furniture slot navigation

**Actions Required**:
1. ✅ Implement link opening in new tab/window
2. ✅ Add media preview functionality  
3. ✅ Handle furniture playlist navigation
4. ✅ Add object action menu

---

## 3. LINK OPENED HANDLER

### Current Browser Implementation:
```dart
void _onLinkOpened(Map<dynamic, dynamic> data) {
  final url = data['url'] as String?;
  final title = data['title'] as String?;
  final platform = data['platform'] as String?;
  print('🎵 Link opened: $title ($platform)');
  // TODO: Open URL in browser/native app
}
```

### Required Implementation:
- Use `url_launcher` package (already in pubspec)
- Open YouTube/Spotify/etc URLs in new tab
- Track user activity for recommendations

---

## 4. MESSAGE HANDLERS (browserBridge.js)

### Current Handlers:
- initialize ✅
- createObject ✅
- deleteObject ✅
- loadFurniture ✅
- switchWorld ✅
- addLink ✅
- createFurniture ✅
- showScoreboard ✅
- resetHomeView ✅
- setExploreMode ✅
- searchPlatforms/searchWorld ✅
- createDemoContent ✅

### Missing Handlers (from reference app):
- setGenrePreferences ❌
- openMediaPreview ❌
- navigateFurniture ❌
- refreshRecommendations (partially implemented) ⚠️

---

## 5. MUSIC SEARCH SCREEN

### Status: Exists but needs verification
- File exists: music_search_screen.dart
- Needs testing with browser interaction

---

## 6. URL LAUNCHER SETUP

### Current pubspec.yaml:
- url_launcher: ^6.1.10 ✅

### Required:
- Import url_launcher in world_view_screen.dart ❌
- Implement _openUrl method ❌

---

## 7. MOUSE/HOVER SUPPORT

### Current Status:
- Welcome dialog: ✅ Has MouseRegion
- Music preferences dialog: ✅ Has MouseRegion
- Add Content menu: ✅ Has MouseRegion (just added)
- Menu items: ✅ Use InkWell

---

## 8. MEDIA PREVIEW SYSTEM

### Mobile App:
- Uses JavaScript mediaPreviewManager
- Toggles preview overlay
- Handles furniture playlists
- Supports navigation controls

### Browser Version:
- JavaScript side likely has mediaPreviewManager (in bundle)
- Dart side needs message handling ❌

---

## IMPLEMENTATION PRIORITY:

### HIGH PRIORITY (Core Functionality):
1. ✅ **Link opening** - url_launcher implementation
2. ✅ **Object click handling** - Open links in  new tab
3. ✅ **Media preview** - Message bridge to JS mediaPreviewManager
4. ✅ **Genre preferences messaging** - Already partially done

### MEDIUM PRIORITY (Enhanced UX):
5. ⚠️ **Furniture navigation** - Next/prev in playlist
6. ⚠️ **Object action menu** - Context menu for objects
7. ⚠️ **Search verification** - Test music search flow

### LOW PRIORITY (Browser Limitations):
8. ❌ **Files & Media** - N/A for browser
9. ❌ **Apps** - N/A for browser
10. ❌ **Contacts** - N/A for browser
11. ❌ **Paths** - May add later

---

## FILES TO MODIFY:

1. **lib/screens/world_view_screen.dart**
   - Add url_launcher import
   - Implement `_onLinkOpened` properly
   - Add `_onObjectClicked` media preview handling
   - Add media preview message handlers

2. **assets/web/js/browserBridge.js**
   - Add setGenrePreferences handler (done)
   - Add openMediaPreview handler
   - Add navigateFurniture handler

3. **lib/widgets/add_content_menu_widget.dart**
   - Already has mouse support ✅
   - Menu items properly configured ✅

4. **Testing Required:**
   - Music search screen functionality
   - Link object interactions
   - Furniture playlist navigation
   - Genre preference syncing
