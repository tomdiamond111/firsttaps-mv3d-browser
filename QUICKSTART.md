# Quick Start - Build & Deploy

## One-Command Build and Deploy
```powershell
.\build.ps1; .\deploy.ps1
```

## Step by Step

### 1. Build
```powershell
.\build.ps1
```
Compiles JavaScript bundles + Flutter web app
Output: `build/web/`

### 2. Deploy
```powershell
.\deploy.ps1
```
Pushes `build/web/` to `gh-pages` branch
Live at: https://mv3d.firsttaps.com

## Important Files

- **`.env.local`** - API keys (NEVER commit!)
- **`build.ps1`** - Build script
- **`deploy.ps1`** - Deploy script
- **`build/web/`** - Build output (gitignored)

## Troubleshooting 404

1. Wait 2-3 minutes after deploy
2. Force refresh browser (Ctrl+Shift+R)
3. Check `gh-pages` branch has `index.html`
4. Verify GitHub Pages is enabled in repo settings

## Git Branches

- **`main`** - Source code (work here)
- **`gh-pages`** - Deployed app (auto-managed)

Always work on `main` branch!

---
Full documentation: BUILD_AND_DEPLOY.md
