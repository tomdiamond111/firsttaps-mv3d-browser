# GitHub Pages Deployment Guide

## Quick Setup (5 minutes)

### Option 1: Use Your Existing GitHub Account

Since you already have a GitHub Copilot account, you have GitHub access.

#### Step 1: Create Repository

1. Go to https://github.com/new
2. Repository name: `furniture-playlist-viewer`
3. Description: "Shared furniture playlist viewer for FirstTaps"
4. **Important**: Set to **Public** (required for free GitHub Pages)
5. Initialize with README: ✅ Yes
6. Click "Create repository"

#### Step 2: Upload Viewer File

**Via Web Interface** (easiest):

1. In your new repo, click "Add file" → "Upload files"
2. Drag and drop: `C:\Users\tomdi\FirstTapsMV3D_v4b\assets\web\furniture-viewer.html`
3. Rename it to `index.html` (this becomes your homepage)
4. Commit message: "Add furniture viewer"
5. Click "Commit changes"

**Via Git Command Line** (alternative):

```powershell
# Clone your repo
cd C:\Users\tomdi
git clone https://github.com/<your-username>/furniture-playlist-viewer
cd furniture-playlist-viewer

# Copy viewer file
Copy-Item "C:\Users\tomdi\FirstTapsMV3D_v4b\assets\web\furniture-viewer.html" -Destination "index.html"

# Commit and push
git add index.html
git commit -m "Add furniture viewer"
git push
```

#### Step 3: Enable GitHub Pages

1. Go to your repo → **Settings** (top right)
2. Scroll down left sidebar → Click **Pages**
3. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main** (or master)
   - Folder: **/ (root)**
4. Click **Save**
5. Wait 30-60 seconds
6. Refresh page - you'll see: "Your site is live at https://&lt;username&gt;.github.io/furniture-playlist-viewer/"

#### Step 4: Test Your Viewer

Your viewer is now live at:
```
https://<your-username>.github.io/furniture-playlist-viewer/
```

Test it:
1. Open your Flutter app
2. Run the test script in console to generate a share URL
3. Replace `furniture-viewer.html` with your GitHub Pages URL
4. Share that URL with anyone!

---

## Configure App to Use GitHub Pages URL

### Update Share Manager

Add this to your app initialization (or run in console once):

```javascript
// Set the GitHub Pages URL as your viewer base
if (window.app && window.app.shareManager) {
    window.app.shareManager.setViewerBaseUrl(
        'https://<your-username>.github.io/furniture-playlist-viewer/#data='
    );
    console.log('✅ Share manager configured for GitHub Pages');
}
```

Now when you call `shareFurniture()`, it will generate URLs pointing to your GitHub Pages site.

---

## Verification Checklist

- [ ] Repository created and public
- [ ] `index.html` uploaded (renamed from furniture-viewer.html)
- [ ] GitHub Pages enabled
- [ ] Site live at `https://<username>.github.io/furniture-playlist-viewer/`
- [ ] Test URL works (loads viewer with sample data)
- [ ] Share manager configured with GitHub Pages URL

---

## Custom Domain (Optional)

Want a custom domain like `share.firsttaps.com`?

1. Buy domain from any registrar
2. Add CNAME record: `share` → `<username>.github.io`
3. In repo settings → Pages → Custom domain: `share.firsttaps.com`
4. Wait for DNS propagation (5 minutes)
5. Enable "Enforce HTTPS"

Your shares will now use: `https://share.firsttaps.com/#data=...`

---

## Troubleshooting

### Issue: 404 Not Found
**Solution**: Make sure file is named `index.html` (not `furniture-viewer.html`)

### Issue: Page not updating
**Solution**: Wait 1-2 minutes, then hard refresh (Ctrl+F5)

### Issue: "Repository is private"
**Solution**: Settings → Change visibility to Public

### Issue: Share URLs too long
**Solution**: Reduce object count or thumbnail quality in share manager

---

## Cost

**GitHub Pages**: $0 (free for public repos)
**Bandwidth**: 100GB/month soft limit (plenty for share links)
**Storage**: 1GB (your viewer is ~50KB)

---

## Privacy Note

- GitHub Pages sites are **public** (anyone can access)
- Share URLs contain **no private data** (only YouTube links, furniture config)
- Local MP3/MP4 files are **never** included in shares
- No user tracking or analytics (unless you add them)

---

## Next Steps After Deployment

1. **Update documentation** with your GitHub Pages URL
2. **Add share button** to Flutter UI (long-press furniture menu)
3. **Create QR codes** for easy mobile sharing
4. **Add social preview** (OpenGraph tags) for better link sharing
5. **Track usage** (optional: Google Analytics)
