# Furniture Playlist Viewer - Setup Instructions

## Overview
This viewer displays shared furniture playlists from FirstTaps MV3D using a paste service to avoid long URLs.

## Setup on GitHub Pages

### Option 1: Update Existing Repository

If you already have a `furniture-playlist-viewer` repository:

1. **Navigate to your repository locally:**
```bash
cd /path/to/furniture-playlist-viewer
```

2. **Replace the existing `index.html` with the new viewer:**
```bash
# Copy the updated viewer file
cp /path/to/furniture-playlist-viewer-updated.html index.html
```

3. **Commit and push:**
```bash
git add index.html
git commit -m "Update viewer to support paste service URLs"
git push origin main
```

### Option 2: Create New Repository

If you don't have the repository yet:

1. **Create new repository on GitHub:**
   - Go to https://github.com/new
   - Repository name: `furniture-playlist-viewer`
   - Make it **Public**
   - Don't initialize with README (we'll add files)
   - Click "Create repository"

2. **Set up locally:**
```bash
# Create directory
mkdir furniture-playlist-viewer
cd furniture-playlist-viewer

# Initialize git
git init
git branch -M main

# Copy the viewer file
cp /path/to/furniture-playlist-viewer-updated.html index.html

# Create README
echo "# FirstTaps MV3D Furniture Viewer" > README.md
echo "" >> README.md
echo "Web viewer for shared furniture playlists from FirstTaps MV3D app." >> README.md

# Commit
git add .
git commit -m "Initial commit: Furniture viewer with paste service support"

# Connect to GitHub (replace <username> with your GitHub username)
git remote add origin https://github.com/<username>/furniture-playlist-viewer.git
git push -u origin main
```

3. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** tab
   - Scroll to **Pages** section (left sidebar)
   - Under "Source", select **main** branch
   - Click **Save**
   - Wait 1-2 minutes

4. **Verify it's live:**
   - URL will be: `https://<username>.github.io/furniture-playlist-viewer/`
   - Visit the URL to confirm it's working

## How It Works

### URL Formats Supported

1. **Paste.ee (Primary):**
   ```
   https://<username>.github.io/furniture-playlist-viewer/?paste=abc123
   ```

2. **JSONbin.io (Fallback):**
   ```
   https://<username>.github.io/furniture-playlist-viewer/?bin=xyz789
   ```

3. **Legacy Direct Data (Backup):**
   ```
   https://<username>.github.io/furniture-playlist-viewer/#data=<base64data>
   ```

### Data Flow

1. User shares furniture in FirstTaps MV3D app
2. App uploads furniture data to paste.ee
3. Paste.ee returns a short ID (e.g., `abc123`)
4. App creates URL: `viewer/?paste=abc123`
5. Recipient clicks link
6. Viewer fetches data from paste.ee using the ID
7. Viewer displays furniture playlist with all objects

## Testing

### Test with Sample Data

1. **Manual test:**
   ```
   https://<username>.github.io/furniture-playlist-viewer/?paste=test
   ```
   (This will show an error since "test" isn't a valid paste ID)

2. **Real test:**
   - Share a furniture item from FirstTaps MV3D app
   - The app will create a real paste and give you a working URL
   - Click the URL to see your shared furniture

## Troubleshooting

### Viewer shows "Unable to Load Furniture"
- Check the paste ID is correct in the URL
- Paste might have expired (paste.ee free tier has limited retention)
- Network issue - try again

### GitHub Pages not updating
- Wait 2-3 minutes after pushing changes
- Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Check GitHub Actions tab for build status

### Share link not working from app
- Make sure you've pushed the updated viewer to GitHub
- Verify GitHub Pages is enabled and the site is live
- Check Flutter app is using correct GitHub username in the URL

## Updating the Viewer

To make changes to the viewer:

1. Edit `index.html` locally
2. Test changes by opening file in browser
3. Commit and push:
   ```bash
   git add index.html
   git commit -m "Update viewer: <describe changes>"
   git push origin main
   ```
4. Wait 1-2 minutes for GitHub Pages to rebuild

## Important Notes

- **Paste.ee** free tier may have limitations on storage time
- **JSONbin.io** fallback provides additional reliability
- **Legacy mode** (direct data in URL) still works but creates very long URLs
- The viewer is **read-only** - it displays data but cannot modify furniture

## Features

✅ Clean, modern UI  
✅ Displays furniture name and statistics  
✅ Lists all objects with icons  
✅ Shows object types (YouTube, Spotify, etc.)  
✅ Mobile-responsive design  
✅ Error handling with helpful messages  
✅ Call-to-action to download the app  

## Next Steps

1. ✅ Update your GitHub repository with the new viewer
2. ✅ Enable GitHub Pages if not already enabled
3. ✅ Test sharing a furniture item from the app
4. ✅ Share the link with someone to verify it works

Your viewer URL will be:
```
https://<your-github-username>.github.io/furniture-playlist-viewer/
```

Replace `<your-github-username>` with your actual GitHub username (e.g., `tomdiamond111`).
