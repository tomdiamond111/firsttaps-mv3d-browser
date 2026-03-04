# Content Preference Learning System - Implementation Summary

## Overview
Implemented an intelligent pattern detection system that learns from user dislikes and automatically filters unwanted content types. The system detects patterns across **language, channel, country, and keywords** (including music genres like rap, hip hop, metal) and auto-blocks matching content after 3+ dislikes.

## Implementation Date
Completed: Current session

## What Was Implemented

### Phase 1: Metadata Extraction & Storage ✅
- **Enhanced YouTube API parsing** to extract:
  - `defaultAudioLanguage` (e.g., "es", "hi", "en")
  - `channelTitle` and `channelId`
  - `tags` (keywords from uploader)
  - `categoryId` (video category)
  - `regionRestriction` (country data)
  
- **Metadata caching system**:
  - URL → metadata mapping in `RecommendationService._metadataCache`
  - Populated during content filtering (`_applyPreferenceFiltering`)
  - Cache size limited to 500 entries (auto-prunes oldest)
  - Enables metadata lookup when user dislikes content

### Phase 2: Pattern Detection & Auto-Filtering ✅
- **Created new service**: `ContentPreferenceLearningService` (377 lines)
  - Tracks dislike metadata across app sessions
  - Detects patterns: counts occurrences of languages, channels, countries, keywords
  - Auto-blocks when threshold reached (default: 3 dislikes)
  - Storage: `SharedPreferences` keys:
    - `'mv3d_content_preferences'` → blocked items (languages, channels, countries, keywords)
    - `'mv3d_dislike_metadata'` → full dislike history (up to 200 entries)

- **Filtering layers** (checked in order):
  1. **Language**: Blocks content in disliked languages (e.g., Spanish "es", Hindi "hi")
  2. **Channel**: Blocks specific YouTube channels by ID or title
  3. **Country**: Blocks content tagged with disliked countries
  4. **Keywords/Genres**: Blocks content with disliked tags or title keywords

- **Music genre detection** (25+ keywords supported):
  - Rap variations: `rap`, `hiphop`, `hip hop`, `hip-hop`, `mumble rap`, `trap`, `drill`, `gangsta rap`
  - Metal variations: `metal`, `death metal`, `heavy metal`, `metalcore`, `thrash metal`
  - Other genres: `reggaeton`, `k-pop`, `kpop`, `bollywood`, `telugu`, `tamil`, `malayalam`, `punjabi`, `hindi`
  - Geographic keywords: `spanish`, `español`, `cricket`, `football`

### Phase 3: Integration ✅
- **Modified files**:
  1. `lib/services/content_preference_learning_service.dart` (NEW)
  2. `lib/services/recommendation_service.dart`:
     - Added import for `ContentPreferenceLearningService`
     - Added `_preferenceService` instance
     - Added `_metadataCache` Map for URL → metadata lookup
     - Enhanced YouTube metadata extraction (lines 295-318)
     - Added `_applyPreferenceFiltering()` method (lines 2348-2419)
     - Added `recordDislikeWithMetadata()` method (lines 2421-2445)
     - Created global `recommendationService` instance (line 2683)
  
  3. `lib/screens/helpers/three_js_javascript_channels.dart`:
     - Added import for `RecommendationService`
     - Enhanced `_handleContentFeedback()` to call `recordDislikeWithMetadata()` on dislike (lines 2515-2528)

- **Service initialization**:
  - Global singletons created:
    - `contentPreferenceLearningService` (in content_preference_learning_service.dart)
    - `recommendationService` (in recommendation_service.dart)
  - Auto-initialized on first use via lazy loading

## How It Works

### Content Fetching Flow
```
1. User taps refresh → fetchTrendingShorts() called
2. YouTube API fetches videos with full metadata
3. Metadata extracted: language, channel, tags, categoryId
4. _applyPreferenceFiltering() checks each video:
   - shouldFilterContent() → checks blocked languages, channels, countries, keywords
   - Matching content removed BEFORE display
   - Metadata cached by URL for later dislike recording
5. Filtered content shuffled and displayed
```

### Dislike Recording Flow
```
1. User taps dislike button in JavaScript → sends ContentFeedback message
2. _handleContentFeedback() in three_js_javascript_channels.dart:
   - Records basic feedback via contentFeedbackService
   - Calls recommendationService.recordDislikeWithMetadata(url, title)
3. recordDislikeWithMetadata():
   - Looks up metadata in _metadataCache by URL
   - Calls preferenceService.recordDislike() with full metadata
4. ContentPreferenceLearningService.recordDislike():
   - Adds to dislike history (JSON storage)
   - Calls _detectAndApplyPatterns()
5. _detectAndApplyPatterns():
   - Counts occurrences of each attribute across all dislikes
   - If language/channel/country/keyword appears 3+ times → auto-block
   - Updates blocked sets in SharedPreferences
   - Logs "🔇 Auto-blocking..." messages
```

### Pattern Detection Examples

**Example 1: Spanish Content**
```
User dislikes 3 videos with language "es"
→ System auto-blocks language "es"
→ Future Spanish videos filtered before display
→ Log: "🔇 Auto-blocking language: es (3 occurrences)"
```

**Example 2: Rap Music**
```
User dislikes videos with titles:
  - "New Rap Music 2024"
  - "Best Hip Hop Mix"
  - "Trap Beats Playlist"
→ System detects keyword "rap" appears 3+ times
→ Auto-blocks keyword "rap"
→ Future videos with "rap" in title/tags filtered
→ Log: "🔇 Auto-blocking keyword: rap (4 occurrences)"
```

**Example 3: Channel Blocking**
```
User dislikes 3 videos from "T.I. - Official"
→ System auto-blocks channelId: "UC..."
→ All future videos from that channel filtered
→ Log: "🔇 Auto-blocking channel: T.I. - Official (3 occurrences)"
```

## Testing Guide

### Test 1: Language Filtering (Spanish Content)
**Steps:**
1. Fresh install or clear app data
2. Open app → wait for recommendations to load
3. Find 3 videos with Spanish language (check title for Spanish words)
4. Dislike all 3 videos (tap thumbs down)
5. Tap refresh button
6. **Expected result**: No Spanish videos appear in new set
7. **Check logs**: Look for "🔇 Auto-blocking language: es (3 occurrences)"

### Test 2: Music Genre Filtering (Rap/Hip Hop)
**Steps:**
1. Fresh install or clear app data
2. Look for rap/hip hop videos (titles like "Rap", "Hip Hop", "Trap", "Drill")
3. Dislike 3 rap videos
4. Tap refresh
5. **Expected result**: No more rap videos appear
6. **Check logs**: Look for "🔇 Auto-blocking keyword: rap (3 occurrences)"

### Test 3: Channel Blocking
**Steps:**
1. Find videos from the same channel (e.g., T.I., Bruno Mars)
2. Dislike 3 videos from that channel
3. Refresh
4. **Expected result**: No more videos from that channel
5. **Check logs**: Look for "🔇 Auto-blocking channel: [Channel Name] (3 occurrences)"

### Test 4: Proactive Filtering
**Steps:**
1. Complete Test 1 or Test 2 to establish blocks
2. Close app completely
3. Reopen app → wait for recommendations
4. **Expected result**: Blocked content never appears (filtered before display)
5. **Check logs**: Look for "🔇 Filtered: [Title] (lang: es, channel: ...)"

### Test 5: Metal Music Filtering
**Steps:**
1. Find videos with "metal" in title or tags
2. Dislike 3 metal videos
3. Refresh
4. **Expected result**: No more metal videos
5. **Check logs**: "🔇 Auto-blocking keyword: metal (3 occurrences)"

## Debug Logging

### Key Log Messages to Watch For

**Successful Pattern Detection:**
```
🔇 Auto-blocking language: es (3 occurrences)
🔇 Auto-blocking channel: T.I. - Official (3 occurrences)  
🔇 Auto-blocking country: IN (3 occurrences)
🔇 Auto-blocking keyword: rap (4 occurrences)
```

**Filtering Active:**
```
🔇 Filtered: "Spanish Music Video" (lang: es, channel: ...)
🔇 Filtered 6 videos based on learned preferences
```

**Metadata Recording:**
```
📝 Recording dislike with metadata for: [Video Title]
✅ Dislike recorded with full metadata
```

**Missing Metadata (Issue):**
```
⚠️ Dislike recorded without metadata (not in cache)
↳ This means the video wasn't in recent recommendations
```

## Storage Keys & Data Format

### SharedPreferences Keys
- `'mv3d_content_preferences'` - Blocked items
- `'mv3d_dislike_metadata'` - Dislike history

### Blocked Items Format (JSON)
```json
{
  "blockedLanguages": ["es", "hi", "ta"],
  "blockedChannels": ["UC...channelId1", "UC...channelId2"],
  "blockedCountries": ["IN", "MX"],
  "blockedKeywords": ["rap", "metal", "reggaeton"]
}
```

### Dislike Metadata Format (JSON Array)
```json
[
  {
    "url": "https://youtube.com/watch?v=...",
    "title": "Video Title",
    "language": "es",
    "channelTitle": "Channel Name",
    "channelId": "UC...channelId",
    "country": "MX",
    "tags": ["rap", "music", "2024"],
    "timestamp": "2024-01-20T10:30:00.000Z"
  },
  ...
]
```

## Configuration Constants

### Pattern Detection Threshold
```dart
// In ContentPreferenceLearningService
static const int _autoBlockThreshold = 3;
```
**To adjust**: Change value (1-10 recommended)
- Lower = more aggressive filtering (1-2 dislikes trigger block)
- Higher = more patient (5+ dislikes needed)

### Cache Size Limit
```dart
// In RecommendationService
if (_metadataCache.length > 500) {
  // Prune oldest 250 entries
}
```

### Dislike History Limit
```dart
// In ContentPreferenceLearningService
const int maxHistorySize = 200; // Keep last 200 dislikes
```

## API Methods

### ContentPreferenceLearningService

**`initialize()`**
```dart
await contentPreferenceLearningService.initialize();
```
Loads blocked items and dislike history from storage.

**`recordDislike()`**
```dart
await contentPreferenceLearningService.recordDislike(
  url: 'https://...',
  title: 'Video Title',
  language: 'es',
  channelTitle: 'Channel Name',
  channelId: 'UC...',
  country: 'MX',
  tags: ['rap', 'music'],
);
```
Records dislike and checks for patterns to auto-block.

**`shouldFilterContent()`**
```dart
final shouldFilter = contentPreferenceLearningService.shouldFilterContent(
  language: 'es',
  channelId: 'UC...',
  channelTitle: 'Channel',
  country: 'MX',
  title: 'Video Title',
  tags: ['rap', 'music'],
);
if (shouldFilter) {
  // Don't show this content
}
```
Returns `true` if content matches any blocked criteria.

**`getBlockedLanguages()`, `getBlockedChannels()`, etc.**
```dart
final blockedLanguages = contentPreferenceLearningService.getBlockedLanguages();
// Returns: ['es', 'hi', 'ta']
```

**`unblock()`**
```dart
// Unblock a specific item
await contentPreferenceLearningService.unblock('language', 'es');
await contentPreferenceLearningService.unblock('channel', 'UC...');
await contentPreferenceLearningService.unblock('keyword', 'rap');
```

**`clearAllPreferences()`**
```dart
// Reset all blocks and history (for testing)
await contentPreferenceLearningService.clearAllPreferences();
```

### RecommendationService

**`recordDislikeWithMetadata()`**
```dart
await recommendationService.recordDislikeWithMetadata(url, title);
```
Looks up cached metadata and records dislike with full details.

## Known Limitations

1. **Metadata cache is in-memory**: Cleared when app restarts (not persistent)
   - **Impact**: Only recent content (last 500 URLs) can be recorded with metadata
   - **Workaround**: Pattern detection still works across app restarts via SharedPreferences

2. **Only YouTube metadata extracted**: Vimeo, Dailymotion, TikTok, Instagram not yet enhanced
   - **Impact**: Pattern learning only works for YouTube content currently
   - **Future**: Extend metadata extraction to other platforms

3. **Keyword matching is case-insensitive but exact**: "hip hop" won't match "hiphop" unless both added
   - **Current**: Added 25+ variations (hip hop, hiphop, hip-hop, etc.)
   - **Future**: Could use fuzzy matching or stemming

4. **No UI for viewing/managing blocks**: All management via logs and storage inspection
   - **Future**: Add settings screen to view/edit blocked items

## Future Enhancements (Phase 3 - Not Yet Implemented)

### Positive Pattern Learning
- Detect liked patterns (genres, languages, channels)
- Boost content matching positive patterns
- "More like this" recommendations

### Advanced Filtering
- Fuzzy keyword matching (stemming, Levenshtein distance)
- Multi-platform metadata extraction (Vimeo, Dailymotion, etc.)
- Time-based pattern decay (old dislikes expire)

### User Interface
- Settings screen showing blocked items
- Manual block/unblock controls
- "Why was this filtered?" explanations
- Statistics dashboard (most disliked genres, channels, etc.)

### Smart Recommendations
- Combine positive + negative patterns
- Genre preference scores
- Personalized content diversity

## Troubleshooting

### Issue: "Dislike recorded without metadata (not in cache)"
**Cause**: Video URL not in metadata cache (wasn't in recent recommendations)
**Solution**: This is normal for older content. Pattern learning still works, just metadata might be incomplete.

### Issue: Content still appearing after 3 dislikes
**Possible causes:**
1. Different videos from same genre (keyword not exact match)
2. Metadata extraction failed (check YouTube API response)
3. Cache cleared between dislikes

**Debug steps:**
1. Check logs for "🔇 Auto-blocking..." messages
2. Inspect SharedPreferences: `'mv3d_content_preferences'`
3. Verify metadata extraction: look for "language:", "channelTitle:" in logs

### Issue: Too aggressive filtering (everything blocked)
**Solution**: Clear preferences and increase threshold:
```dart
await contentPreferenceLearningService.clearAllPreferences();
// Then edit ContentPreferenceLearningService._autoBlockThreshold to 5
```

## Code References

- **Main service**: [lib/services/content_preference_learning_service.dart](lib/services/content_preference_learning_service.dart)
- **Integration**: [lib/services/recommendation_service.dart](lib/services/recommendation_service.dart) (lines 2348-2445)
- **Callback handler**: [lib/screens/helpers/three_js_javascript_channels.dart](lib/screens/helpers/three_js_javascript_channels.dart) (lines 2515-2528)
- **YouTube metadata**: [lib/services/recommendation_service.dart](lib/services/recommendation_service.dart) (lines 295-318)

## Summary

The Content Preference Learning System successfully implements **Phase 1 (Metadata Extraction)** and **Phase 2 (Pattern Detection & Auto-Filtering)**. The system:

✅ Extracts rich metadata from YouTube (language, channel, tags, etc.)  
✅ Caches metadata for dislike recording  
✅ Detects patterns after 3+ dislikes (language, channel, country, keywords)  
✅ Auto-blocks matching content types  
✅ Filters content BEFORE display (proactive)  
✅ Supports music genre filtering (rap, hip hop, metal, etc.)  
✅ Persists preferences across app restarts  
✅ Integrated with existing feedback system  

**Ready for testing!** Follow the testing guide above to verify functionality.
