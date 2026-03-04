# Config.json Update Instructions

This file controls what content appears in your app's demo furniture.

## Quick Update (GitHub Website)

1. Go to: https://github.com/YOUR-USERNAME/firsttaps-app-config
2. Click `config.json`
3. Click pencil icon (Edit)
4. Make changes
5. Update version and last_updated
6. Commit
7. Done! Live in 30-60 seconds

## What Each Section Does

### spotify_trending_urls
- **Where**: Small Stage, Bookshelf, Amphitheatre
- **What**: Audio tracks from Spotify
- **Format**: `https://open.spotify.com/track/TRACK_ID`
- **Limit**: 30-80 tracks recommended

### tiktok_trending_urls
- **Where**: Gallery Wall (shorts)
- **What**: Short videos for Gallery Wall
- **Format**: `https://www.tiktok.com/@USERNAME/video/VIDEO_ID`
- **Limit**: 9 videos (more ok, app uses first 9)

### tiktok_music_urls
- **Where**: Riser (music videos)
- **What**: Music videos from TikTok
- **Format**: Same as above
- **Limit**: 5-10 videos recommended

### instagram_reel_urls
- **Where**: Gallery Wall (shorts)
- **What**: Instagram Reels/short videos
- **Format**: `https://www.instagram.com/reel/REEL_ID/`
- **Limit**: 9 videos (more ok, app uses first 9)

### instagram_music_urls
- **Where**: Riser (music videos)
- **What**: Instagram music videos
- **Format**: Same as above
- **Limit**: 5-10 videos recommended

### vimeo_music_urls
- **Where**: Riser (music videos)
- **What**: Vimeo music videos
- **Format**: `https://vimeo.com/VIDEO_ID`
- **Limit**: 5-10 videos recommended

### soundcloud_trending_urls
- **Where**: Small Stage
- **What**: SoundCloud tracks
- **Format**: `https://soundcloud.com/ARTIST/TRACK`
- **Limit**: 20-30 tracks recommended

## Best Practices

### Before Committing
- ✅ Test URLs in browser (make sure they work)
- ✅ Remove dead/broken links
- ✅ Update `"version"` field (e.g., "1.0.1", "1.1.0")
- ✅ Update `"last_updated"` to current date/time
- ✅ Keep URLs appropriate (user-facing content)

### URL Guidelines
- Use HTTPS (not HTTP)
- No spaces in URLs
- No duplicate URLs (wastes space)
- Verify platform matches format

### Version Numbering
```
"1.0.0"  → Initial release
"1.0.1"  → Minor content update
"1.1.0"  → Major content refresh
"2.0.0"  → Complete content overhaul
```

## Testing Changes

### In Browser
Visit: `https://YOUR-USERNAME.github.io/firsttaps-app-config/config.json`

Should see your JSON with changes.

### In App
1. Close and restart app (force refresh)
2. Check logs for:
   ```
   ✅ Remote config fetched successfully
      Version: 1.0.1  ← Your new version
   ```
3. Verify new content appears in furniture

## Rollback Bad Changes

Made a mistake? Revert in GitHub:

1. Go to repo → `config.json`
2. Click "History"
3. Find last good commit
4. Click "..." → "View file"
5. Copy content
6. Go back to current file and replace
7. Commit as "Rollback to version X.X"

## Common Issues

### ❌ URLs not working
- Check URL format matches examples above
- Verify URLs work in browser
- Some platforms block embedding (Instagram sometimes)

### ❌ Changes not appearing
- Wait 1-2 minutes after commit (GitHub Pages rebuild)
- Force close app and restart
- Check GitHub Pages is enabled in repo settings

### ❌ JSON error
- Use https://jsonlint.com to validate
- Common errors:
  - Missing comma between items
  - Extra comma at end of list
  - Unescaped quotes in URLs

## Update Schedule

Recommended:
- **Weekly**: Refresh top trending content
- **Monthly**: Major content overhaul
- **As needed**: Remove broken links, add new hits

## Support

Issues? Check:
1. [REMOTE_CONFIG_SETUP.md](../REMOTE_CONFIG_SETUP.md) - Full setup guide
2. GitHub Pages status (Settings → Pages)
3. JSON validity (jsonlint.com)
