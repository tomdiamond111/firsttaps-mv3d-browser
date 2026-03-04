# Remote Config Setup Guide

## Overview

Your app now fetches content URLs dynamically from GitHub Pages! This means you can update Spotify, TikTok, Instagram, Vimeo, and SoundCloud links **without resubmitting to Google Play**.

## Quick Start (5 Minutes)

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: **`firsttaps-app-config`**
3. Description: "Remote configuration for FirstTaps MV3D app"
4. Visibility: **Public** (required for free GitHub Pages)
5. ✅ Initialize with README
6. Click **Create repository**

### Step 2: Upload config.json

**Option A: Web Upload (Easiest)**

1. In your new repo, click **"Add file"** → **"Upload files"**
2. Upload: `C:\Users\tomdi\FirstTapsMV3D_v15\config.json`
3. Commit message: "Initial configuration"
4. Click **"Commit changes"**

**Option B: Git Command Line**

```powershell
cd C:\Users\tomdi
git clone https://github.com/<your-username>/firsttaps-app-config
cd firsttaps-app-config

# Copy config file
Copy-Item "C:\Users\tomdi\FirstTapsMV3D_v15\config.json" -Destination "."

git add config.json
git commit -m "Initial configuration"
git push
```

### Step 3: Enable GitHub Pages

1. In your repo, go to **Settings** → **Pages** (left sidebar)
2. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main** (or master)
   - Folder: **/ (root)**
3. Click **Save**
4. Wait 30-60 seconds
5. **Refresh the page** - You'll see:
   ```
   Your site is live at https://<username>.github.io/firsttaps-app-config/
   ```

### Step 4: Update App Configuration

Open `lib/services/remote_config_service.dart` and update line 17:

**BEFORE:**
```dart
static const String configUrl = 
    'https://<your-username>.github.io/firsttaps-app-config/config.json';
```

**AFTER:**
```dart
static const String configUrl = 
    'https://tomdiamond111.github.io/firsttaps-app-config/config.json';
    // ^^^^^^^^^^^^^^ Replace with YOUR GitHub username
```

### Step 5: Test in App

1. Run your app
2. Check logs for:
   ```
   🌐 Fetching remote config from GitHub Pages...
   ✅ Remote config fetched successfully
      Version: 1.0.0
      Last updated: 2026-02-24T00:00:00Z
   ```

3. If you see this, it's working! ✅

---

## How It Works

### Flow Diagram

```
App Startup
    ↓
Fetch config.json from GitHub Pages
    ↓
    ├─ Success? → Cache for 24 hours → Use remote URLs
    │
    └─ Failed?  → Use hardcoded fallback URLs
```

### Caching Strategy

- **First load**: Fetch from GitHub Pages
- **Subsequent loads**: Use cached version (24 hours)
- **After 24 hours**: Auto-refresh from GitHub Pages
- **Network fail**: Always use last cached or hardcoded fallback

### Files Created

```
lib/services/remote_config_service.dart    - Fetches and caches config
lib/config/recommendations_config.dart     - Updated with async getters
lib/helpers/demo_content_*.dart            - Updated to use remote config
config.json                                - Template to upload to GitHub Pages
```

---

## Updating Content (After Setup)

Once setup is complete, updating content is **super easy**:

### Online (GitHub Website)

1. Go to your repo: `https://github.com/<username>/firsttaps-app-config`
2. Click on **`config.json`**
3. Click **pencil icon** (Edit this file)
4. Update URLs (add/remove/change)
5. Update `"version"` and `"last_updated"` fields
6. Commit changes
7. **Done!** Changes live in 30-60 seconds

### Locally (Git)

```powershell
cd C:\Users\tomdi\firsttaps-app-config

# Edit config.json with your favorite editor
notepad config.json

git add config.json
git commit -m "Update TikTok trending URLs - Feb 24, 2026"
git push

# Done! Live in 30-60 seconds
```

### When Do Users Get Updates?

- **Existing users**: Within 24 hours (when cache expires)
- **New installs**: Immediately (no cached version)
- **Force refresh**: Users can restart app to fetch immediately

---

## Testing Remote Config

### Test Fetch Manually

Run in Dart DevTools console or create a test button:

```dart
import 'package:firsttaps_mv3d/services/remote_config_service.dart';

// Test fetch
final config = await RemoteConfigService.forceRefresh();
print('Config version: ${config['version']}');
print('Spotify URLs: ${config['spotify_trending_urls']?.length ?? 0}');

// Check cache info
final version = await RemoteConfigService.getCachedVersion();
final age = await RemoteConfigService.getCacheAgeHours();
print('Cached version: $version (age: $age hours)');

// Check if using fallback
final isFallback = await RemoteConfigService.isUsingFallback();
print('Using fallback: $isFallback');
```

### Debug Logs

Enable debug output in your app to see config fetch status:

```
🌐 Fetching remote config from GitHub Pages...
✅ Remote config fetched successfully
   Version: 1.0.0
   Last updated: 2026-02-24T00:00:00Z
💾 Remote config cached to disk
```

Or if using cached:

```
✅ Using disk-cached remote config
```

Or if falling back:

```
⚠️ Remote config fetch failed: HTTP 404
   Using fallback hardcoded config
📦 Using fallback hardcoded config
```

---

## URL Format Requirements

### config.json Structure

```json
{
  "version": "1.0.0",                    // Required
  "last_updated": "2026-02-24T...",      // Recommended
  "spotify_trending_urls": [ ... ],      // Array of strings
  "tiktok_trending_urls": [ ... ],       // Array of strings
  "instagram_reel_urls": [ ... ],        // Array of strings
  "vimeo_music_urls": [ ... ],           // Array of strings
  "soundcloud_trending_urls": [ ... ]    // Array of strings
}
```

### URL Validation

- ✅ Must be valid HTTPS URLs
- ✅ Must match platform format (e.g., spotify.com/track/...)
- ✅ No duplicates recommended
- ⚠️ Invalid URLs will be skipped by app

### Content Limits

Configured in `recommendations_config.dart`:
- **Gallery Wall**: 9 shorts (videos)
- **Small Stage**: 30 tracks (audio)
- **Riser**: 18 videos (music videos)
- **Bookshelf**: 6-15 items (user favorites)
- **Amphitheatre**: 80 items (mixed)

App will use as many URLs as available, up to these limits.

---

## Troubleshooting

### Config Not Loading

**Check these:**

1. ✅ Repository is **public** (required for GitHub Pages)
2. ✅ GitHub Pages is **enabled** in repo settings
3. ✅ `config.json` is in **root directory** (not in a subfolder)
4. ✅ URL in `remote_config_service.dart` matches your repo
5. ✅ `config.json` has valid JSON format (use jsonlint.com)

**Test URL directly in browser:**
```
https://<your-username>.github.io/firsttaps-app-config/config.json
```

Should see your JSON config file. If 404, GitHub Pages isn't set up correctly.

### App Using Fallback

If logs show "Using fallback hardcoded config":

- Check GitHub Pages is live (visit URL in browser)
- Verify `configUrl` in `remote_config_service.dart` is correct
- Check device has internet connection
- Wait 1-2 minutes after committing changes (GitHub Pages rebuild time)

### Cache Not Updating

Force clear cache:

```dart
await RemoteConfigService.forceRefresh();
```

Or clear app data:
- Android: Settings → Apps → FirstTaps → Storage → Clear Data
- iOS: Uninstall and reinstall

### JSON Validation Error

Validate your JSON:
1. Copy `config.json` content
2. Go to https://jsonlint.com
3. Paste and click "Validate JSON"
4. Fix any errors shown

---

## Advanced Options

### Use CDN for Faster Loading

Instead of GitHub Pages directly, use jsDelivr CDN:

In `remote_config_service.dart`:
```dart
static const String configUrl = 
    'https://cdn.jsdelivr.net/gh/<username>/firsttaps-app-config@main/config.json';
```

Benefits:
- Faster global delivery
- Automatic caching on CDN edge servers
- No GitHub Pages setup needed

### Multiple Environments

Create branches for different configs:

```
main        → Production config
staging     → Testing config
dev         → Development config
```

Point to different branches:
```dart
// Production
'https://cdn.jsdelivr.net/gh/<user>/firsttaps-app-config@main/config.json'

// Staging
'https://cdn.jsdelivr.net/gh/<user>/firsttaps-app-config@staging/config.json'
```

### A/B Testing

Create multiple config files:

```
config.json           → Default
config-variant-a.json → Variant A
config-variant-b.json → Variant B
```

Randomly pick in app:
```dart
final variant = Random().nextBool() ? 'a' : 'b';
final url = variant == 'a' 
    ? '$baseUrl/config-variant-a.json'
    : '$baseUrl/config-variant-b.json';
```

---

## Migration Path

### Week 1: Deploy Remote Config
- ✅ Create GitHub repo and upload config.json
- ✅ Update `configUrl` in app
- ✅ Test fetching works
- Build and submit to Google Play

### Week 2: Monitor
- Check logs for fetch success rate
- Verify users getting remote config
- Keep hardcoded fallbacks active

### Week 3: First Remote Update
- Update config.json on GitHub
- Don't rebuild app, just commit
- Verify users get new content within 24 hours

### Week 4+: Regular Updates
- Update config.json whenever needed
- Only rebuild app for code changes
- Content updates = just commit to GitHub

---

## Benefits Summary

✅ **No app updates needed** for content changes  
✅ **Instant rollout** (30-60 seconds to live)  
✅ **Free hosting** (GitHub Pages)  
✅ **Version control** (Git history)  
✅ **Rollback capability** (revert commits)  
✅ **Graceful fallback** (hardcoded values if fetch fails)  
✅ **Cached for performance** (24-hour cache)  

---

## Support

If you encounter issues:

1. Check logs for error messages
2. Test config URL in browser
3. Verify JSON structure
4. Clear cache and retry
5. Check GitHub Pages deployment status

---

## Next Steps

1. ✅ Create GitHub repository
2. ✅ Upload config.json
3. ✅ Enable GitHub Pages
4. ✅ Update configUrl in app
5. ✅ Test fetch works
6. 🚀 Build and deploy app
7. 🎉 Update content anytime via GitHub!

**You're all set!** Content updates are now decoupled from app releases. 🎊
