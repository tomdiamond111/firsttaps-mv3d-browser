# Content Recommendations System Implementation

## Overview
A daily/weekly content recommendation system that automatically populates furniture with trending content from YouTube, Spotify, TikTok, and Instagram. Users get fresh content without losing their customizations.

## Content Sources (Free APIs)

### Daily Updates
- **YouTube Trending** (Shorts focus for Gallery Wall)
  - API: YouTube Data API v3 - `videos.list` with chart="mostPopular"
  - Filter by `videoCategoryId` and duration for shorts
  - Endpoint: https://www.googleapis.com/youtube/v3/videos

### Weekly Updates (Every 4-7 Days)
- **YouTube Music Charts**
  - API: YouTube Data API v3 - trending music videos
  - Filter: `videoCategoryId=10` (Music)
  
- **Spotify Charts**
  - API: Spotify Web API - `browse/featured-playlists` or direct playlist access
  - Top 50 Global playlist: `37i9dQZEVXbMDoHDwVN2tF`
  - Viral 50 playlist: `37i9dQZEVXbLiRSasKsNU9`
  
- **TikTok Creative Center**
  - Manual scraping or API if available
  - Resource: https://ads.tiktok.com/business/creativecenter/trending-songs
  - Note: May need headless browser for data extraction
  
- **Instagram Reels Trends**
  - Manual curation from https://later.com/blog/instagram-reels-trends/
  - Alternative: YouTube channels that compile trending reels

## Furniture Mapping

| Furniture Type | Content Type | Update Frequency | Link Count | Source |
|---------------|-------------|------------------|------------|---------|
| **Gallery Wall** | Short videos (TikTok, IG, YT Shorts) | Daily | 6-9 | YouTube Trending Shorts |
| **Small Stage** | Audio tracks (music only) | Every 4-7 days | 5-7 | Spotify Charts, YouTube Music |
| **Riser** | Music videos | Every 4-7 days | 8-12 | YouTube Music Charts |
| **Bookshelf** | User favorites (dynamic) | Real-time | 10-15 | User interaction tracking |
| **Amphitheatre** | Mixed long-form content | Weekly | 15-20 | YouTube Trending (longer videos) |

## Data Models

### RecommendationFurniture
```dart
class RecommendationFurniture {
  String id;                      // Unique identifier
  String furnitureType;           // "gallery_wall", "small_stage", etc.
  bool isRecommendation;          // Always true for rec furniture
  bool isModified;                // Has user edited this furniture?
  DateTime lastUpdated;           // Last content refresh
  DateTime spawnedAt;             // When this instance was created
  List<LinkObject> links;         // The recommended links
  String contentCategory;         // "shorts", "music", "music_videos", etc.
}
```

### RecommendationPreferences
```dart
class RecommendationPreferences {
  bool enabled;                   // Master toggle
  
  // Music preferences
  bool musicPop;
  bool musicRock;
  bool musicHipHop;
  bool musicCountry;
  bool musicClassical;
  bool musicElectronic;
  
  // Video preferences
  bool videoComedy;
  bool videoSports;
  bool videoNews;
  bool videoGaming;
  bool videoEducational;
  
  // Content filters
  bool showShorts;
  bool showMusicVideos;
  bool showAudio;
  bool explicitContent;          // Allow explicit lyrics/content
  
  // Update preferences
  String updateFrequency;         // "daily", "weekly", "manual"
}
```

### FavoritesTracking
```dart
class LinkInteraction {
  String linkUrl;
  String linkTitle;
  String platform;                // "youtube", "spotify", etc.
  int openCount;                  // How many times opened
  DateTime lastOpened;            // Most recent interaction
  DateTime firstOpened;           // First interaction
  String furnitureId;             // Where it was accessed from
}
```

## Architecture

### 1. Content Fetcher Service (`RecommendationService`)

**Location**: `lib/services/recommendation_service.dart`

**Responsibilities**:
- Fetch trending content from each platform API
- Cache results locally (24 hours for daily, 7 days for weekly)
- Filter content based on user preferences
- Handle API rate limits and errors gracefully
- Background refresh scheduling

**Key Methods**:
```dart
Future<List<LinkObject>> fetchTrendingShorts(String region)
Future<List<LinkObject>> fetchTrendingMusic(List<String> genres)
Future<List<LinkObject>> fetchTrendingMusicVideos(String region)
Future<List<LinkObject>> getFavorites(int limit)
void scheduleContentRefresh()
```

### 2. Recommendation Furniture Manager

**Location**: `lib/managers/recommendation_furniture_manager.dart`

**Responsibilities**:
- Spawn recommendation furniture on first launch
- Replace oldest unmodified recommendation furniture on updates
- Check if furniture has been modified by user
- Add visual "Recommendations" badge to furniture
- Persist state across app launches

**Key Logic**:

```dart
// Furniture Replacement Logic
Future<void> updateRecommendationFurniture(String furnitureType) async {
  // Get all recommendation furniture of this type
  List<RecommendationFurniture> existing = 
    await getRecommendationFurnitureByType(furnitureType);
  
  // Find unmodified instances
  List<RecommendationFurniture> unmodified = 
    existing.where((f) => !f.isModified).toList();
  
  if (unmodified.isEmpty) {
    // All existing rec furniture is modified, spawn new
    await spawnNewRecommendationFurniture(furnitureType);
  } else {
    // Replace oldest unmodified
    unmodified.sort((a, b) => a.spawnedAt.compareTo(b.spawnedAt));
    RecommendationFurniture toReplace = unmodified.first;
    
    // Fetch new content
    List<LinkObject> newLinks = await getLinksForFurnitureType(furnitureType);
    
    // Update furniture
    toReplace.links = newLinks;
    toReplace.lastUpdated = DateTime.now();
    await saveFurniture(toReplace);
  }
}

// Check if furniture has been modified
bool isFurnitureModified(RecommendationFurniture furniture) {
  // Compare current state with original spawn state
  // Consider modified if:
  // - Links added or removed
  // - Link order changed
  // - Furniture position/rotation changed
  // - Custom name applied
  return furniture.links.length != furniture.originalLinkCount ||
         furniture.position != furniture.originalPosition ||
         furniture.hasCustomName;
}
```

### 3. Favorites Algorithm

**Location**: `lib/services/favorites_service.dart`

**Algorithm**: Weighted score based on recency and frequency

```dart
double calculateFavoriteScore(LinkInteraction interaction) {
  // Recency weight (exponential decay)
  Duration timeSinceLastOpen = DateTime.now().difference(interaction.lastOpened);
  double recencyScore = exp(-timeSinceLastOpen.inDays / 7.0); // Decay over 7 days
  
  // Frequency weight (logarithmic to prevent dominance)
  double frequencyScore = log(interaction.openCount + 1);
  
  // Combined score (70% recency, 30% frequency)
  return (recencyScore * 0.7) + (frequencyScore * 0.3);
}

Future<List<LinkObject>> getFavoritesForBookshelf(int limit) async {
  List<LinkInteraction> interactions = await getAllInteractions();
  
  // Calculate scores
  Map<LinkInteraction, double> scores = {};
  for (var interaction in interactions) {
    scores[interaction] = calculateFavoriteScore(interaction);
  }
  
  // Sort by score descending
  var sorted = scores.entries.toList()
    ..sort((a, b) => b.value.compareTo(a.value));
  
  // Take top N
  return sorted
    .take(limit)
    .map((e) => createLinkObjectFromInteraction(e.key))
    .toList();
}
```

### 4. Visual Indicators

#### 3D World Badge
**Location**: Three.js modification in web view

```javascript
// Add gold "Recommendations" sign on top of furniture
function addRecommendationBadge(furnitureGroup) {
  const badgeGeometry = new THREE.PlaneGeometry(2, 0.5);
  const badgeTexture = createTextTexture('Recommendations', {
    fontSize: 48,
    fontColor: '#FFD700',
    backgroundColor: '#000000',
    padding: 10
  });
  const badgeMaterial = new THREE.MeshBasicMaterial({
    map: badgeTexture,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  const badge = new THREE.Mesh(badgeGeometry, badgeMaterial);
  
  // Position on top surface of furniture
  const bbox = new THREE.Box3().setFromObject(furnitureGroup);
  badge.position.y = bbox.max.y + 0.3;
  badge.rotation.x = -Math.PI / 2; // Face upward
  
  furnitureGroup.add(badge);
}
```

#### Furniture Manager UI
**Location**: `lib/widgets/furniture_manager_widget.dart`

```dart
// Add chip/badge to furniture cards
Widget buildFurnitureCard(Furniture furniture) {
  return Card(
    child: Column(
      children: [
        // ... existing furniture card content
        if (furniture is RecommendationFurniture)
          Chip(
            label: Text('Recommendations'),
            backgroundColor: Colors.amber,
            avatar: Icon(Icons.trending_up, size: 16),
          ),
      ],
    ),
  );
}
```

## Options/Preferences Menu

**Location**: `lib/screens/recommendations_preferences_screen.dart`

### UI Layout
```
┌─────────────────────────────────────┐
│  Content Recommendations            │
├─────────────────────────────────────┤
│                                     │
│  Enable Recommendations    [Toggle] │
│  Update daily at midnight           │
│                                     │
│  MUSIC PREFERENCES                  │
│  ☑ Pop / Top 40                     │
│  ☑ Rock / Alternative               │
│  ☑ Hip Hop / Rap                    │
│  ☐ Country                          │
│  ☐ Classical                        │
│  ☑ Electronic / Dance               │
│                                     │
│  VIDEO PREFERENCES                  │
│  ☑ Comedy / Entertainment           │
│  ☑ Sports                           │
│  ☐ News / Current Events            │
│  ☑ Gaming                           │
│  ☐ Educational                      │
│                                     │
│  CONTENT TYPES                      │
│  ☑ Short Videos (TikTok/Reels)      │
│  ☑ Music Videos                     │
│  ☑ Audio Tracks                     │
│                                     │
│  FILTERS                            │
│  ☐ Include Explicit Content         │
│                                     │
│  [Save Preferences]                 │
│                                     │
└─────────────────────────────────────┘
```

## Update Scheduling

**Location**: `lib/services/recommendation_scheduler.dart`

### Background Task Registration
```dart
import 'package:workmanager/workmanager.dart';

class RecommendationScheduler {
  static const String DAILY_UPDATE_TASK = "dailyRecommendationsUpdate";
  static const String WEEKLY_UPDATE_TASK = "weeklyRecommendationsUpdate";
  
  Future<void> initialize() async {
    await Workmanager().initialize(callbackDispatcher);
    
    // Schedule daily update (Gallery Wall - Shorts)
    await Workmanager().registerPeriodicTask(
      DAILY_UPDATE_TASK,
      DAILY_UPDATE_TASK,
      frequency: Duration(hours: 24),
      initialDelay: Duration(hours: 1),
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
    );
    
    // Schedule weekly update (other furniture)
    await Workmanager().registerPeriodicTask(
      WEEKLY_UPDATE_TASK,
      WEEKLY_UPDATE_TASK,
      frequency: Duration(days: 7),
      initialDelay: Duration(hours: 2),
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
    );
  }
}

void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    switch (task) {
      case RecommendationScheduler.DAILY_UPDATE_TASK:
        await RecommendationService().updateGalleryWallShorts();
        break;
      case RecommendationScheduler.WEEKLY_UPDATE_TASK:
        await RecommendationService().updateWeeklyContent();
        break;
    }
    return Future.value(true);
  });
}
```

## API Integration Details

### YouTube Data API v3

**Setup**:
1. Already have YouTube API key (check existing implementation)
2. Enable YouTube Data API v3 in Google Cloud Console
3. Free quota: 10,000 units/day (should be sufficient)

**Fetching Trending Shorts**:
```dart
Future<List<LinkObject>> fetchYouTubeTrendingShorts(String regionCode) async {
  final response = await http.get(Uri.parse(
    'https://www.googleapis.com/youtube/v3/videos?'
    'part=snippet,contentDetails,statistics&'
    'chart=mostPopular&'
    'regionCode=$regionCode&'
    'videoCategoryId=0&'  // All categories or specific
    'maxResults=50&'
    'key=$YOUTUBE_API_KEY'
  ));
  
  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    final videos = data['items'] as List;
    
    // Filter for shorts (duration < 60 seconds)
    final shorts = videos.where((video) {
      final duration = video['contentDetails']['duration'];
      return parseDuration(duration) < Duration(seconds: 60);
    }).toList();
    
    // Convert to LinkObjects
    return shorts.map((video) => LinkObject(
      url: 'https://www.youtube.com/watch?v=${video['id']}',
      title: video['snippet']['title'],
      platform: 'youtube',
      thumbnailUrl: video['snippet']['thumbnails']['high']['url'],
    )).toList();
  }
  
  throw Exception('Failed to fetch YouTube trending shorts');
}
```

### Spotify Web API

**Setup**:
1. Register app at https://developer.spotify.com/dashboard
2. Get Client ID and Client Secret
3. Use Client Credentials Flow (no user auth needed for public playlists)

**Fetching Top Charts**:
```dart
Future<List<LinkObject>> fetchSpotifyTopTracks() async {
  // Get access token
  final tokenResponse = await http.post(
    Uri.parse('https://accounts.spotify.com/api/token'),
    headers: {
      'Authorization': 'Basic ${base64Encode(utf8.encode('$CLIENT_ID:$CLIENT_SECRET'))}',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  );
  
  final accessToken = json.decode(tokenResponse.body)['access_token'];
  
  // Fetch Top 50 Global playlist
  final playlistResponse = await http.get(
    Uri.parse('https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF/tracks'),
    headers: {'Authorization': 'Bearer $accessToken'},
  );
  
  if (playlistResponse.statusCode == 200) {
    final data = json.decode(playlistResponse.body);
    final tracks = data['items'] as List;
    
    return tracks.map((item) {
      final track = item['track'];
      return LinkObject(
        url: track['external_urls']['spotify'],
        title: '${track['name']} - ${track['artists'][0]['name']}',
        platform: 'spotify',
        thumbnailUrl: track['album']['images'][0]['url'],
      );
    }).toList();
  }
  
  throw Exception('Failed to fetch Spotify charts');
}
```

### TikTok Creative Center

**Note**: No official public API. Options:
1. Manual curation weekly
2. Web scraping (use with caution, check ToS)
3. Use TikTok content aggregated on YouTube

**Recommended approach**: Use YouTube channels that compile trending TikTok videos

```dart
// Search YouTube for "TikTok Trending" compilations
Future<List<LinkObject>> fetchTikTokTrending() async {
  final response = await http.get(Uri.parse(
    'https://www.googleapis.com/youtube/v3/search?'
    'part=snippet&'
    'q=tiktok+trending+today&'
    'type=video&'
    'order=date&'
    'maxResults=10&'
    'key=$YOUTUBE_API_KEY'
  ));
  
  // Process results...
}
```

## Persistence

### Local Storage (SQLite)

**Tables**:

```sql
-- Recommendation Furniture
CREATE TABLE recommendation_furniture (
  id TEXT PRIMARY KEY,
  furniture_type TEXT NOT NULL,
  is_modified INTEGER DEFAULT 0,
  spawned_at INTEGER NOT NULL,
  last_updated INTEGER NOT NULL,
  content_category TEXT,
  position_json TEXT,
  rotation_json TEXT,
  custom_name TEXT
);

-- Recommendation Links (many-to-one with furniture)
CREATE TABLE recommendation_links (
  id TEXT PRIMARY KEY,
  furniture_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  platform TEXT,
  thumbnail_url TEXT,
  slot_index INTEGER,
  FOREIGN KEY (furniture_id) REFERENCES recommendation_furniture(id)
);

-- Link Interactions (for favorites)
CREATE TABLE link_interactions (
  id TEXT PRIMARY KEY,
  link_url TEXT NOT NULL,
  link_title TEXT,
  platform TEXT,
  open_count INTEGER DEFAULT 0,
  first_opened INTEGER,
  last_opened INTEGER,
  furniture_id TEXT
);

-- User Preferences
CREATE TABLE recommendation_preferences (
  id INTEGER PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  music_pop INTEGER DEFAULT 1,
  music_rock INTEGER DEFAULT 1,
  music_hip_hop INTEGER DEFAULT 1,
  music_country INTEGER DEFAULT 0,
  music_classical INTEGER DEFAULT 0,
  music_electronic INTEGER DEFAULT 1,
  video_comedy INTEGER DEFAULT 1,
  video_sports INTEGER DEFAULT 1,
  video_news INTEGER DEFAULT 0,
  video_gaming INTEGER DEFAULT 1,
  video_educational INTEGER DEFAULT 0,
  show_shorts INTEGER DEFAULT 1,
  show_music_videos INTEGER DEFAULT 1,
  show_audio INTEGER DEFAULT 1,
  explicit_content INTEGER DEFAULT 0
);

-- Cached Content (reduce API calls)
CREATE TABLE cached_recommendations (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,  -- "shorts", "music", "music_videos"
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  content_json TEXT NOT NULL
);
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create data models (`RecommendationFurniture`, `RecommendationPreferences`, etc.)
- [ ] Set up SQLite tables and DAOs
- [ ] Implement basic RecommendationService structure
- [ ] Create preferences UI screen
- [ ] Add preferences save/load functionality

### Phase 2: API Integration (Week 2)
- [ ] Integrate YouTube Data API for trending shorts
- [ ] Integrate YouTube Data API for music/music videos
- [ ] Integrate Spotify Web API for audio tracks
- [ ] Implement caching layer for API responses
- [ ] Handle API errors and rate limits

### Phase 3: Furniture Management (Week 2-3)
- [ ] Implement RecommendationFurnitureManager
- [ ] Add furniture spawn logic
- [ ] Implement modification detection
- [ ] Add oldest-unmodified replacement logic
- [ ] Test furniture proliferation prevention

### Phase 4: Visual Indicators (Week 3)
- [ ] Add "Recommendations" badge to 3D furniture (Three.js)
- [ ] Add indicator in Furniture Manager UI
- [ ] Test visibility in different camera angles

### Phase 5: Content Distribution (Week 3-4)
- [ ] Map content types to furniture types
- [ ] Implement content filtering based on preferences
- [ ] Create link objects and populate furniture
- [ ] Test content variety and quality

### Phase 6: Favorites System (Week 4)
- [ ] Track link interactions (opens)
- [ ] Implement favorites scoring algorithm
- [ ] Auto-populate bookshelf with favorites
- [ ] Test algorithm with various usage patterns

### Phase 7: Scheduling & Updates (Week 4-5)
- [ ] Integrate WorkManager for background tasks
- [ ] Schedule daily Gallery Wall updates
- [ ] Schedule weekly other furniture updates
- [ ] Test update reliability and battery usage

### Phase 8: Testing & Polish (Week 5-6)
- [ ] End-to-end testing of full flow
- [ ] Performance optimization (API calls, rendering)
- [ ] User onboarding flow
- [ ] Analytics integration (track feature usage)

### Phase 9: Seasonal Content (Future)
- [ ] Add seasonal/holiday detection
- [ ] Create seasonal furniture templates
- [ ] Implement seasonal content rotation
- [ ] Test with upcoming holidays

## Edge Cases & Error Handling

### API Failures
- **Scenario**: YouTube API quota exceeded
- **Solution**: Use cached content from previous day, show user notification

### Network Unavailable
- **Scenario**: User has no internet when update scheduled
- **Solution**: Retry on next app launch when connected

### No Matching Content
- **Scenario**: User preferences filter out all available content
- **Solution**: Fall back to "Popular" generic content, prompt to adjust preferences

### Furniture Deletion Loop
- **Scenario**: User deletes recommendation furniture immediately after spawn
- **Solution**: Track deletion timestamp, don't re-spawn same type for 7 days

### First Launch
- **Scenario**: New user, no furniture exists yet
- **Solution**: Spawn all recommendation furniture on first launch, show tutorial

## Analytics & Metrics

Track these metrics for optimization:

- Recommendation furniture interaction rate (clicks per furniture)
- Most popular content categories
- Favorites bookshelf usage
- Furniture modification rate
- Recommendation deletion rate
- Daily active users who engage with recommendations
- Content source effectiveness (YouTube vs Spotify vs TikTok)

## Future Enhancements

### Phase 10+ (Optional)
- AI-powered personalization using on-device ML
- Collaborative filtering ("Users like you also enjoyed...")
- Social sharing of favorite recommendations
- Push notifications for highly-relevant new content
- Integration with user's own Spotify/YouTube playlists
- Voice search for recommendation preferences
- AR preview of furniture before spawning

## Dependencies

### New Package Requirements
```yaml
# pubspec.yaml additions
dependencies:
  workmanager: ^0.5.1           # Background task scheduling
  http: ^1.1.0                  # API requests (may already exist)
  sqflite: ^2.3.0              # Local database (may already exist)
  shared_preferences: ^2.2.2    # Settings persistence
  
dev_dependencies:
  mockito: ^5.4.0               # Testing API mocks
```

### API Keys & Secrets
Store in environment config (NOT in version control):
- `YOUTUBE_API_KEY` (already have)
- `SPOTIFY_CLIENT_ID` (new - register app)
- `SPOTIFY_CLIENT_SECRET` (new - register app)

## Configuration

### Environment Setup
Create `lib/config/api_config.dart`:
```dart
class ApiConfig {
  // Load from secure storage or env variables
  static String get youtubeApiKey => const String.fromEnvironment('YOUTUBE_API_KEY');
  static String get spotifyClientId => const String.fromEnvironment('SPOTIFY_CLIENT_ID');
  static String get spotifyClientSecret => const String.fromEnvironment('SPOTIFY_CLIENT_SECRET');
  
  // Feature flags
  static const bool ENABLE_RECOMMENDATIONS = true;
  static const bool ENABLE_TIKTOK_CONTENT = false;  // Manual curation for now
  
  // Update intervals (in days)
  static const int SHORTS_UPDATE_INTERVAL = 1;
  static const int MUSIC_UPDATE_INTERVAL = 5;
  static const int VIDEO_UPDATE_INTERVAL = 7;
  
  // Content limits
  static const int MAX_SHORTS_PER_FURNITURE = 9;
  static const int MAX_MUSIC_PER_FURNITURE = 7;
  static const int MAX_VIDEOS_PER_FURNITURE = 12;
  static const int MAX_FAVORITES = 15;
}
```

## Testing Strategy

### Unit Tests
- `RecommendationService` API parsing
- Favorites scoring algorithm
- Furniture modification detection
- Content filtering based on preferences

### Integration Tests
- End-to-end furniture spawn and update
- API integration with mocked responses
- Database persistence and retrieval
- Scheduling and background tasks

### User Acceptance Testing
- Install on test devices
- Verify daily updates occur
- Test furniture modification preservation
- Validate content quality and variety
- Check battery/performance impact

## Launch Checklist

Before releasing to production:
- [ ] All API keys secured and not in source code
- [ ] Rate limiting implemented for all APIs
- [ ] Fallback content available for API failures
- [ ] User preferences properly persist
- [ ] Furniture modification detection working
- [ ] Background updates not draining battery
- [ ] Analytics tracking implemented
- [ ] User onboarding/tutorial created
- [ ] Legal review of content sources (fair use, attribution)
- [ ] Privacy policy updated (if collecting interaction data)

---

## Quick Start Guide (For Developers)

### 1. Register for API Access
```bash
# Spotify
Visit: https://developer.spotify.com/dashboard
Create new app → Get Client ID & Secret

# YouTube (existing)
Use current YouTube Data API key
```

### 2. Add API Keys
```bash
# Create .env file (add to .gitignore)
YOUTUBE_API_KEY=your_key_here
SPOTIFY_CLIENT_ID=your_id_here
SPOTIFY_CLIENT_SECRET=your_secret_here
```

### 3. Install Dependencies
```bash
flutter pub get
```

### 4. Initialize Database
```bash
# Run migration script (create when implementing Phase 1)
flutter run lib/scripts/init_recommendations_db.dart
```

### 5. Test API Connections
```bash
# Run test script
flutter test test/services/recommendation_service_test.dart
```

### 6. Enable Feature Flag
```dart
// In api_config.dart
static const bool ENABLE_RECOMMENDATIONS = true;
```

## Summary

This is a comprehensive content recommendation system that:
- ✅ Provides daily fresh content from major platforms
- ✅ Preserves user customizations
- ✅ Uses free APIs to minimize cost
- ✅ Staggers updates to avoid overwhelming users
- ✅ Learns from user behavior (favorites)
- ✅ Respects user preferences
- ✅ Scales cleanly without furniture proliferation

Estimated implementation time: **4-6 weeks** for full feature set, or **2-3 weeks** for MVP with just YouTube trending content.
