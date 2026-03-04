# Multi-Platform Playback Strategy

## Problem Solved: YouTube Embedding Restrictions

**Issue:** YouTube Error 150 - "The owner of the requested video does not allow it to be played in embedded players."

**Solution Implemented:** Intelligent fallback system with error tracking and native app integration.

---

## ✅ Enhanced Features (Build 20260126_1112)

### 1. **Embedding Restriction Detection**
```javascript
// Detects YouTube errors:
// 150/101 = Embedding not allowed
// 100 = Video removed/not found
// 2 = Invalid video ID
// 5 = HTML5 player error
```

### 2. **User-Controlled Navigation for Restricted Content**
- When embedding restricted → Opens media preview (native YouTube app)
- **STOPS auto-advance** - User controls navigation via buttons
- Mini-player stays minimized (visible but inactive)
- User presses Next/Prev/Close buttons to continue
- Prevents jarring "flipping through screens" experience

### 3. **Smart Playlist Navigation**
- Tracks which videos have failed (erroredVideoIds Set)
- Skips failed videos automatically (for embeddable content only)
- After 3 consecutive errors → Stops playback (prevents infinite loops)
- Clears error history when playlist loops (fresh attempt)

### 4. **User Feedback**
- Error messages displayed in mini-player
- Track title shows "⚠️ Unable to play multiple videos..."
- Color-coded warnings (red for errors)
- Auto-dismiss after 5 seconds

---

## 🎵 How It Works Now

### Scenario A: All Videos Embeddable
```
User taps Play → Mini-player appears → Videos play in embedded player
User navigates 3D world while listening → Auto-advances through playlist
```

### Scenario B: Mixed Embeddable/Restricted Videos
```
Track 1: Embeddable → Plays in mini-player ✓
Track 2: Restricted (Error 150) → Opens native preview → WAITS for user
User presses Next → Track 3: Embeddable → Plays in mini-player ✓
User presses Next → Track 4: Restricted → Opens native preview → WAITS for user
```

### Scenario C: All Videos Restricted (Gallery Wall)
```
User taps Play on furniture
Track 1: Error 150 → Opens native preview → WAITS for user
User presses "View on YouTube" → Opens native YouTube app
User returns to 3D world → Preview screen still visible
User presses Next → Track 2: Error 150 → Opens next preview → WAITS
User presses Next → Track 3: Error 150 → Opens next preview → WAITS
User presses Close → Stops playback, returns to 3D world
```

**Key improvement:** NO automatic flipping through screens! User has full control.

---

## 📊 Multi-Platform Playback Capabilities

| Platform | Embeddable? | Background Audio? | Strategy |
|----------|-------------|-------------------|----------|
| **YouTube** | Some videos | ✅ Yes (embedded) | Mini-player with native fallback |
| **Spotify** | Web Playback SDK | ✅ Yes (embedded) | Future: Similar to YouTube approach |
| **MP3 Files** | ✅ Always | ✅ Yes (HTML5 audio) | Future: HTML5 audio player overlay |
| **MP4 Files** | ✅ Always | ✅ Yes (HTML5 video) | Future: Picture-in-picture overlay |
| **TikTok** | ❌ No | ❌ No | Native app only (current behavior) |
| **Facebook** | ❌ No | ❌ No | Native app only (current behavior) |
| **Instagram** | ❌ No | ❌ No | Native app only (current behavior) |

---

## 🎯 Achieving Seamless Multi-Platform Playback

### Phase 1: YouTube ✅ COMPLETE
- [x] Mini-player overlay
- [x] Playlist management
- [x] Error handling with fallback
- [x] Smart navigation (skip errors)
- [x] Background audio during 3D navigation

### Phase 2: Local Media Files (HIGH PRIORITY)
**MP3 Audio Files:**
```javascript
// Create HTML5 audio player (no UI needed)
const audioPlayer = new Audio(url);
audioPlayer.play();
// Reuse mini-player UI (show track info, controls)
// Full background playback capability
```

**MP4 Video Files:**
```javascript
// Picture-in-picture overlay
<video src={url} pip controls />
// Minimize to corner (similar to mini-player)
// User can expand/collapse while navigating
```

### Phase 3: Spotify Integration (REQUIRES DEV ACCOUNT)
**Spotify Web Playback SDK:**
```javascript
// Similar architecture to YouTube player
const player = new Spotify.Player({
  name: 'FirstTaps 3D Player',
  getOAuthToken: cb => cb(token)
});
// Reuse mini-player UI design
// Full playlist support
// Background audio ✓
```

**Limitations:**
- Requires Spotify Premium account
- Requires Spotify Developer App (free)
- 30-second preview for non-premium users

### Phase 4: Social Media Platforms (LIMITED)
**TikTok, Facebook, Instagram:**
- ❌ **Cannot embed** - Terms of Service restrictions
- ❌ **No background audio** - App must be in foreground
- ✅ **Native app only** - Current behavior (opens external app)

**Best we can do:**
- Detect platform (already done)
- Open native app immediately
- User watches content externally
- Returns to 3D world when done

---

## 🛠️ Implementation Details

### Error Tracking System
```javascript
class YouTubePlayerManager {
  constructor() {
    // Error tracking
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 3;
    this.erroredVideoIds = new Set();
  }
  
  onPlayerError(event) {
    const errorCode = event.data;
    this.consecutiveErrors++;
    this.erroredVideoIds.add(this.currentVideoId);
    
    // Embedding restricted?
    if (errorCode === 150 || errorCode === 101) {
      this.openInNativeApp(this.currentVideoId);
    }
    
    // Too many errors?
    if (this.consecutiveErrors >= 3) {
      this.showErrorMessage('Unable to play videos');
      this.close();
      return;
    }
    
    // Try next track
    setTimeout(() => this.playNext(), 1500);
  }
  
  playNext() {
    // Skip already-errored videos
    do {
      this.currentIndex++;
    } while (this.erroredVideoIds.has(playlist[currentIndex].videoId));
    
    this.playVideo(playlist[currentIndex].videoId);
  }
}
```

### Native App Fallback
```javascript
openInNativeApp(videoId) {
  // Find original object
  const track = this.playlist[this.currentIndex];
  const objectMesh = findObjectById(track.objectId);
  
  // Minimize mini-player (stays visible)
  this.isExpanded = false;
  
  // Open media preview → launches native app
  window.mediaPreviewManager.togglePreview(
    objectMesh.userData,
    objectMesh
  );
  
  // User watches externally
  // Returns to 3D world when done
  // Can tap Next/Prev in mini-player to continue
}
```

---

## 🎮 User Experience Goals

### Ideal Experience (Embeddable Content):
1. User taps Play on furniture
2. Mini-player appears at bottom (80px)
3. Music plays in background
4. User flies around 3D world
5. Auto-advances through playlist
6. **Never leaves the app**

### Reality (Mixed Content):
1. User taps Play on furniture
2. Mini-player appears
3. **Track 1:** Embeddable → Plays in mini-player ✓
4. **Track 2:** Restricted → Opens native YouTube app
5. User watches video externally
6. User closes native app → Returns to 3D world
7. Mini-player still visible → Can continue playlist
8. **Track 3:** Embeddable → Plays in mini-player ✓

### Compromise:
- ✅ **Best case:** 100% embedded playback (stays in app)
- ⚠️ **Mixed case:** Some embedded, some external (acceptable)
- ❌ **Worst case:** All restricted (stops after 3 errors to prevent frustration)

---

## 📝 Testing Scenarios

### Test 1: All Embeddable Videos
**Furniture with:**
- Popular music videos (usually embeddable)
- Video game soundtracks
- Creative Commons content

**Expected:** Seamless playback in mini-player

### Test 2: Mixed Content
**Furniture with:**
- Embeddable music video
- VEVO official video (often restricted)
- Embeddable indie artist
- Movie trailer (usually restricted)

**Expected:** 
- Embedded videos play in mini-player
- Restricted videos open native app
- Playlist continues after native app closes

### Test 3: All Restricted
**Furniture with:**
- Multiple VEVO official videos
- Movie trailers
- Premium content

**Expected:**
- First 3 open native app
- After 3 consecutive errors → Shows error message
- Playback stops (prevents infinite loops)

---

## 🔮 Future Enhancements

### MP3/MP4 Player (Next Priority)
**Advantages:**
- ✅ No embedding restrictions
- ✅ Full control over playback
- ✅ Works offline (cached files)
- ✅ No API quotas or rate limits

**Implementation:**
```javascript
class LocalMediaPlayerManager {
  constructor() {
    // Reuse YouTube mini-player UI
    this.audioElement = new Audio();
    this.videoElement = document.createElement('video');
  }
  
  playMP3(url, trackInfo) {
    this.audioElement.src = url;
    this.audioElement.play();
    // Background audio ✓
  }
  
  playMP4(url, trackInfo) {
    // Picture-in-picture overlay
    this.videoElement.src = url;
    this.videoElement.requestPictureInPicture();
    // User can navigate 3D world ✓
  }
}
```

### Unified Playback Manager
**Goal:** Single interface for all media types

```javascript
class UnifiedPlaybackManager {
  play(url, trackInfo) {
    if (isYouTube(url)) {
      return this.youtubePlayer.play(url, trackInfo);
    } else if (isSpotify(url)) {
      return this.spotifyPlayer.play(url, trackInfo);
    } else if (isMP3(url)) {
      return this.localMediaPlayer.playMP3(url, trackInfo);
    } else if (isMP4(url)) {
      return this.localMediaPlayer.playMP4(url, trackInfo);
    } else {
      // Social media → native app
      return this.openNativeApp(url);
    }
  }
}
```

---

## ✨ What You've Achieved

✅ **Smart Error Handling**
- Detects embedding restrictions automatically
- Fallback to native app for restricted videos
- Prevents infinite error loops

✅ **Playlist Continuity**
- Skips failed videos intelligently
- Remembers which videos failed
- Continues playlist after native app returns

✅ **User-Friendly Experience**
- Clear error messages
- Visual feedback (color coding)
- Doesn't crash or hang on errors

✅ **Foundation for Multi-Platform**
- Architecture supports YouTube, Spotify, local media
- Consistent UI across all platforms
- Easy to extend for new media types

**Next Step:** Add MP3/MP4 player for fully controllable local media playback! 🎵🎬
