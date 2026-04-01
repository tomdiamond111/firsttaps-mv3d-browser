# YouTube API Proxy Setup for Mobile App (Flutter)

## Overview
Hide the YouTube Data API v3 key server-side using the existing Cloudflare Worker that's already deployed for the browser app.

**Problem:** YouTube API keys are exposed in mobile apps (APK/IPA can be decompiled)  
**Solution:** Route all YouTube API calls through Cloudflare Worker proxy  
**Worker URL:** `https://firsttaps-paste.firsttaps.workers.dev`

---

## Prerequisites

1. Cloudflare Worker is **already deployed** for browser app (same Worker handles both)
2. YouTube API key already configured as Worker secret: `YOUTUBE_API_KEY`
3. API key has HTTP referrer restrictions allowing `*.workers.dev/*`

---

## Implementation Steps

### Step 1: Remove Conflicting Worker Config (If Exists)

**⚠️ IMPORTANT:** Check if root directory has `wrangler.jsonc` or `wrangler.toml`:

```bash
# Check for conflicting files
ls -la wrangler.*
```

If found, **DELETE or RENAME** them (they interfere with Worker deployment):
```bash
mv wrangler.jsonc wrangler.jsonc.backup
```

### Step 2: Update `recommendation_service.dart`

Find the YouTube API configuration section (likely near the top of the file):

**BEFORE (INSECURE - DO NOT USE):**
```dart
class RecommendationService {
  final String _youtubeApiKey = 'YOUR_API_KEY'; // ❌ EXPOSED IN COMPILED JS
  final String _youtubeApiBaseUrl = 'https://www.googleapis.com/youtube/v3';
  
  // ... rest of class
}
```

**AFTER (SECURE - USE THIS):**
```dart
class RecommendationService {
  // Cloudflare Worker proxy (keeps API key hidden server-side)
  final String _workerBaseUrl = 'https://firsttaps-paste.firsttaps.workers.dev';
  
  // NO hardcoded API keys - all handled by Worker
  
  // ... rest of class
}
```

### Step 3: Update YouTube Shorts Fetch Method

Find `_fetchYouTubeShorts()` or similar method:

**BEFORE:**
```dart
Future<List<String>> _fetchYouTubeShorts({int maxResults = 50}) async {
  try {
    final url = Uri.parse(
      '$_youtubeApiBaseUrl/videos?'
      'part=snippet,contentDetails,statistics'
      '&chart=mostPopular'
      '&regionCode=US'
      '&maxResults=$maxResults'
      '&key=$_youtubeApiKey'
    );
    
    final response = await http.get(url);
    // ... process response
  } catch (e) {
    // ... error handling
  }
}
```

**AFTER:**
```dart
Future<List<String>> _fetchYouTubeShorts({int maxResults = 50}) async {
  try {
    // Call Cloudflare Worker proxy instead of YouTube directly
    final url = Uri.parse(
      '$_workerBaseUrl/api/youtube/shorts?maxResults=$maxResults'
    );
    
    print('[YOUTUBE PROXY] Fetching shorts via Worker...');
    
    final response = await http.get(url);
    
    if (response.statusCode != 200) {
      print('[YOUTUBE PROXY] Error: ${response.statusCode}');
      return [];
    }
    
    final data = json.decode(response.body);
    final items = data['items'] as List<dynamic>? ?? [];
    
    // Extract video URLs
    final urls = items
        .where((item) => item['id'] != null)
        .map((item) {
          final videoId = item['id'] as String;
          return 'https://www.youtube.com/watch?v=$videoId';
        })
        .toList();
    
    print('[YOUTUBE PROXY] Received ${urls.length} shorts');
    return urls;
    
  } catch (e) {
    print('[YOUTUBE PROXY] Fetch failed: $e');
    return [];
  }
}
```

### Step 4: Update Music Videos Fetch Method

Find `_fetchYouTubeMusicVideos()` method:

**AFTER:**
```dart
Future<List<String>> _fetchYouTubeMusicVideos({int maxResults = 50}) async {
  try {
    // Call Worker proxy for music videos (category 10)
    final url = Uri.parse(
      '$_workerBaseUrl/api/youtube/music-videos?maxResults=$maxResults'
    );
    
    print('[YOUTUBE MUSIC PROXY] Fetching music videos via Worker...');
    
    final response = await http.get(url);
    
    if (response.statusCode != 200) {
      print('[YOUTUBE MUSIC PROXY] Error: ${response.statusCode}');
      return [];
    }
    
    final data = json.decode(response.body);
    final items = data['items'] as List<dynamic>? ?? [];
    
    final urls = items
        .where((item) => item['id'] != null)
        .map((item) {
          final videoId = item['id'] as String;
          return 'https://www.youtube.com/watch?v=$videoId';
        })
        .toList();
    
    print('[YOUTUBE MUSIC PROXY] Received ${urls.length} music videos');
    return urls;
    
  } catch (e) {
    print('[YOUTUBE MUSIC PROXY] Fetch failed: $e');
    return [];
  }
}
```

### Step 5: Update Music Audio Fetch Method

Find `_fetchYouTubeMusicAudio()` method:

**AFTER:**
```dart
Future<List<String>> _fetchYouTubeMusicAudio({int maxResults = 25}) async {
  try {
    // Call Worker proxy for audio tracks (search endpoint)
    final url = Uri.parse(
      '$_workerBaseUrl/api/youtube/music-audio?maxResults=$maxResults'
    );
    
    print('[YOUTUBE AUDIO PROXY] Fetching audio tracks via Worker...');
    
    final response = await http.get(url);
    
    if (response.statusCode != 200) {
      print('[YOUTUBE AUDIO PROXY] Error: ${response.statusCode}');
      return [];
    }
    
    final data = json.decode(response.body);
    final items = data['items'] as List<dynamic>? ?? [];
    
    // Search endpoint returns id.videoId (different from videos endpoint)
    final urls = items
        .where((item) => item['id']?['videoId'] != null)
        .map((item) {
          final videoId = item['id']['videoId'] as String;
          return 'https://www.youtube.com/watch?v=$videoId';
        })
        .toList();
    
    print('[YOUTUBE AUDIO PROXY] Received ${urls.length} audio tracks');
    return urls;
    
  } catch (e) {
    print('[YOUTUBE AUDIO PROXY] Fetch failed: $e');
    return [];
  }
}
```

---

## Testing

### Test in Development

Run the app and check console logs:

```
[YOUTUBE PROXY] Fetching shorts via Worker...
[YOUTUBE PROXY] Received 50 shorts
[YOUTUBE MUSIC PROXY] Fetching music videos via Worker...
[YOUTUBE MUSIC PROXY] Received 50 music videos
[YOUTUBE AUDIO PROXY] Fetching audio tracks via Worker...
[YOUTUBE AUDIO PROXY] Received 25 audio tracks
```

### Test Worker Endpoints Directly

```bash
# Test shorts
curl "https://firsttaps-paste.firsttaps.workers.dev/api/youtube/shorts?maxResults=2"

# Test music videos
curl "https://firsttaps-paste.firsttaps.workers.dev/api/youtube/music-videos?maxResults=2"

# Test music audio
curl "https://firsttaps-paste.firsttaps.workers.dev/api/youtube/music-audio?maxResults=2"
```

---

## Worker Endpoints Reference

| Endpoint | Description | Used By | Max Results |
|----------|-------------|---------|-------------|
| `/api/youtube/shorts` | Most popular videos (any duration) | Gallery Wall / General content | 50 (default) |
| `/api/youtube/music-videos` | Music category videos (category 10) | Riser / Music sections | 50 (default) |
| `/api/youtube/music-audio` | Audio-focused search results | Small Stage / Audio players | 25 (default) |

**Query Parameters:**
- `maxResults` (optional): Number of results to return

**Response Format:** Standard YouTube Data API v3 JSON response

---

## Benefits

✅ **API Key Hidden:** Never exposed in APK/IPA (can't be extracted)  
✅ **Instant Key Rotation:** Update Worker secret, no app rebuild needed  
✅ **Reduced Quota Usage:** Worker caches responses for 30 minutes  
✅ **Same Worker:** Uses existing `firsttaps-paste` Worker (no new deployment)  
✅ **HTTP Referrer Protection:** Still applies on Worker's fetch to YouTube  

---

## Future Key Rotation (No App Update Required!)

To rotate the YouTube API key:

```bash
cd cloudflare-worker
wrangler secret put YOUTUBE_API_KEY
# Paste new key when prompted
```

Changes take effect **immediately** - no mobile app rebuild/redeploy needed!

---

## Troubleshooting

### Error: "YouTube API key not configured on server"
- Worker secret not set. Run: `wrangler secret put YOUTUBE_API_KEY`

### Error: "YouTube API error: 403"
- API key HTTP referrer restrictions don't include `*.workers.dev/*`
- Add to Google Cloud Console → APIs & Services → Credentials

### Error: 404 on Worker endpoints
- Worker not deployed. Deploy from `cloudflare-worker` directory:
  ```bash
  cd cloudflare-worker
  wrangler deploy
  ```

### Old API calls still happening
- Clear app cache/data on device
- Rebuild app: `flutter clean && flutter build apk/ios`

---

## Architecture Diagram

```
Mobile App (Flutter)
  ↓ (calls Worker proxy)
Cloudflare Worker (has API key secret)
  ↓ (calls YouTube with Referer header)
YouTube Data API v3
  ↓ (returns videos, cached 30min)
Cloudflare Worker
  ↓ (returns to mobile app)
Mobile App (receives videos, never sees API key)
```

---

## Additional Notes

1. **No code changes for key rotation** - just update the Worker secret
2. **Caching reduces quota** - Worker caches responses for 30 minutes
3. **Same Worker for browser + mobile** - no separate infrastructure needed
4. **Share functionality unaffected** - paste endpoints still work on same Worker

---

## Commit Message Template

```
feat: Hide YouTube API key via Cloudflare Worker proxy

- Route all YouTube API calls through Worker to hide API key
- Prevents key extraction from APK/IPA decompilation
- Enables instant key rotation without app rebuild
- Adds 30-minute caching to reduce API quota usage
- Uses existing firsttaps-paste Worker (no new deployment)

Worker endpoints:
- /api/youtube/shorts (Gallery Wall)
- /api/youtube/music-videos (Riser)
- /api/youtube/music-audio (Small Stage)

Closes #[issue-number]
```
