# Build and Deploy Guide

This document explains how to build and deploy the FirstTaps MV3D Browser app to GitHub Pages.

## Prerequisites

- Flutter SDK installed and in PATH
- Git configured with GitHub credentials
- PowerShell (Windows)
- `.env.local` file with API keys (see `.env.example`)

## File Structure

```
firsttaps_mv3d_browser_v3/
├── .env.local                 # API keys (NOT committed to git)
├── build.ps1                  # Build script
├── deploy.ps1                 # Deploy script
├── lib/                       # Flutter/Dart source code
├── assets/web/js/            # JavaScript modules
│   └── build_modular_fixed.ps1  # JS bundle builder
├── build/web/                # Build output (gitignored)
└── web/                      # Flutter web assets
```

## Build Process

### 1. Build the App

Run the build script to compile both JavaScript bundles and Flutter web app:

```powershell
.\build.ps1
```

This script will:
1. Load environment variables from `.env.local`
2. Build JavaScript bundles (`bundle_core_production.js`, `bundle_premium_production.js`)
3. Build Flutter web app with environment variables injected

**Output:** `build/web/` directory with complete web app

### 2. Deploy to GitHub Pages

After building, deploy to GitHub Pages:

```powershell
.\deploy.ps1
```

This script will:
1. Verify build output exists
2. Create temporary deployment directory
3. Copy build files and add `CNAME` and `.nojekyll`
4. Push to `gh-pages` branch on GitHub

**Result:** App deployed to:
- https://mv3d.firsttaps.com (custom domain)
- https://tomdiamond111.github.io/firsttaps-mv3d-browser/ (GitHub Pages URL)

## Important Notes

### Environment Variables

Create a `.env.local` file with your API keys:

```env
YOUTUBE_API_KEY=your_key_here
VIMEO_ACCESS_TOKEN=your_token_here
SOUNDCLOUD_CLIENT_ID=your_client_id_here
GITHUB_TOKEN=your_github_token_here
```

**Never commit `.env.local` to git!** It's in `.gitignore` to prevent accidental commits.

### Git Branches

- **`main`**: Source code (Flutter, Dart, JavaScript modules)
- **`gh-pages`**: Deployed web app only (auto-generated, force-pushed)

Always work on the `main` branch. The `gh-pages` branch is automatically managed by `deploy.ps1`.

### GitHub Pages Configuration

On GitHub repository settings:
1. Go to Settings → Pages
2. Source: Deploy from branch `gh-pages`
3. Folder: `/ (root)`
4. Custom domain: `mv3d.firsttaps.com` (optional)

### 404 Errors

If you get 404 errors:

1. **Check GitHub Pages is enabled** on the `gh-pages` branch
2. **Verify index.html exists** in the root of `gh-pages` branch
3. **Wait 1-2 minutes** for GitHub to process the deployment
4. **Check build output** - make sure `build/web/index.html` exists before deploying
5. **Force refresh** your browser (Ctrl+Shift+R)

### Troubleshooting

**Build fails:**
- Check that `.env.local` exists with valid API keys
- Verify Flutter SDK is installed: `flutter doctor`
- Check JavaScript modules exist in `assets/web/js/modules/`

**Deploy fails:**
- Check Git credentials are configured
- Verify network connection to GitHub
- Check repository URL in `deploy.ps1` is correct

**404 on GitHub Pages:**
- Verify `gh-pages` branch exists and has `index.html` in root
- Check GitHub Actions tab for any deployment errors
- Wait 2-3 minutes for GitHub Pages cache to update

## Quick Reference

```powershell
# Build and deploy in one go
.\build.ps1; .\deploy.ps1

# Build only (for testing)
.\build.ps1

# Deploy existing build (if build already done)
.\deploy.ps1

# Build JavaScript bundles only
cd assets\web\js
.\build_modular_fixed.ps1 -Production

# Check build output
Test-Path build\web\index.html

# View current git branch
git branch

# Switch to main branch (if needed)
git checkout main
```

## Development Workflow

1. Make changes to source code in `lib/` or `assets/web/js/`
2. Test locally (if desired)
3. Run `.\build.ps1` to build
4. Run `.\deploy.ps1` to deploy
5. Wait 1-2 minutes and verify at https://mv3d.firsttaps.com

## Additional Resources

- Flutter Web: https://docs.flutter.dev/platform-integration/web
- GitHub Pages: https://docs.github.com/en/pages
- Custom Domain Setup: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
