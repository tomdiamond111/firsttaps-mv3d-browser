# Security and Deployment Guide

## ⚠️ CRITICAL: API Key Security

**NEVER commit API keys or build output to version control.**

### What Happened (Security Incident - 2026)

Three API keys were exposed in the GitHub repository:
1. **YouTube API Key #1**: `AIzaSyCCG_qmLjFhFbQ2YysRaFJF-g27qrd_qG8` ❌ REVOKED
2. **YouTube API Key #2**: `AIzaSyDEcecldoivws6foJ04U2CiB3y9eiADibE` ❌ REVOKED  
3. **Vimeo Access Token**: `0fa39fb74f07bfe8453358466360d387` ❌ REVOKED

**Root Cause**: 
- API keys were hardcoded as "fallback values" in Dart source files
- When Flutter compiled to JavaScript (`main.dart.js`), keys were embedded in the output
- Build output was accidentally committed to Git and pushed to GitHub

---

## 🛡️ Security Architecture (Fixed)

### Current Secure Design

```
Browser App (Flutter) 
    ↓
    ↓ HTTPS Request (no API keys)
    ↓
Cloudflare Worker (https://firsttaps-paste.firsttaps.workers.dev)
    ↓
    ↓ Uses Worker Secrets (secure)
    ↓
YouTube/Vimeo APIs
```

**All API keys are now stored server-side as Cloudflare Worker secrets.**

### Worker Endpoints

| Endpoint | Purpose | API Used |
|----------|---------|----------|
| `/api/youtube/shorts` | Trending YouTube shorts | YouTube Data API v3 |
| `/api/youtube/music-videos` | Music category videos | YouTube Data API v3 |
| `/api/youtube/music-audio` | Music search results | YouTube Data API v3 |
| `/api/vimeo/staff-picks` | Vimeo staff picks | Vimeo API |
| `/api/paste` | Furniture sharing | Cloudflare KV (no auth) |

---

## 🔐 Setting Up API Keys (Server-Side Only)

### 1. Create API Keys

**YouTube Data API v3:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create new project or select existing
3. Enable "YouTube Data API v3"
4. Create API key (select "API key" under "Create Credentials")
5. **Recommended**: Add HTTP referrer restriction: `https://mv3d.firsttaps.com/*`

**Vimeo Access Token (Optional):**
1. Go to https://developer.vimeo.com/apps
2. Create new app or select existing
3. Generate personal access token
4. Required scopes: `public` and `video_files`

**GitHub Token (NOT NEEDED for browser app):**
- Browser app uses Cloudflare Worker `/api/paste` endpoint
- No GitHub token required for furniture sharing
- Only needed if you're building the mobile/desktop Flutter app

### 2. Store Keys in Cloudflare Worker Secrets

```powershell
# Navigate to worker directory
cd cloudflare-worker

# Set YouTube API key (will prompt for value)
wrangler secret put YOUTUBE_API_KEY

# Set Vimeo access token (will prompt for value)
wrangler secret put VIMEO_ACCESS_TOKEN
```

**NEVER commit these keys to Git!**

### 3. Verify Secrets

```powershell
# List all secrets (doesn't show values)
wrangler secret list
```

---

## 📝 Pre-Commit Checklist

Before committing ANY code, verify:

- [ ] ✅ No API keys in source code (search for `AIza`, `Bearer`, `access_token`)
- [ ] ✅ No hardcoded secrets or credentials
- [ ] ✅ `build/` directory is gitignored and not staged
- [ ] ✅ No `.dart.js` or `.dart.js.map` files staged
- [ ] ✅ `.env.local` is not staged (only `.env.example` should be committed)
- [ ] ✅ No `*.secret` or `*credentials*` files staged

### Quick Security Scan

```powershell
# Search for potential API keys in staged files
git diff --cached | Select-String -Pattern "AIza|Bearer|api[_-]?key|access[_-]?token"

# Check what's staged for commit
git status

# Verify build directory is not staged
git ls-files | Select-String "build/"
```

---

## 🚀 Deployment Process

### Step 1: Deploy Cloudflare Worker (One-Time Setup)

```powershell
cd cloudflare-worker

# Login to Cloudflare
wrangler login

# Deploy worker
wrangler deploy

# Set secrets (if not already done)
wrangler secret put YOUTUBE_API_KEY
wrangler secret put VIMEO_ACCESS_TOKEN
```

### Step 2: Build Flutter Web App

```powershell
# From project root
.\build.ps1
```

**The build script:**
- Runs `flutter build web --release`
- Creates optimized production build in `build/web/`
- **Does NOT inject environment variables** (not needed - worker handles secrets)

### Step 3: Deploy to GitHub Pages

```powershell
.\deploy.ps1
```

**The deploy script:**
- Copies `build/web/` contents to your GitHub Pages repository
- Pushes to GitHub (which serves the static site)
- **Never commits the build output to this repository**

---

## 🚫 What NOT to Do

### ❌ Don't Hardcode Keys

```dart
// ❌ WRONG - Exposes key in compiled JavaScript
static const String apiKey = 'AIzaSy...';

// ✅ CORRECT - Use worker endpoint
final response = await http.get(
  Uri.parse('https://firsttaps-paste.firsttaps.workers.dev/api/youtube/shorts'),
);
```

### ❌ Don't Commit Build Output

```powershell
# ❌ WRONG
git add build/
git add main.dart.js

# ✅ CORRECT - Only commit source code
git add lib/
git add pubspec.yaml
```

### ❌ Don't Use Environment Variables in Flutter Web

Flutter web environment variables are compiled into JavaScript and visible in browser source. All secrets must be server-side only.

---

## 🔍 Monitoring and Alerts

### GitHub Secret Scanning

GitHub automatically scans for exposed secrets. If you receive an alert:

1. **Immediately revoke the exposed key** in the service (Google Cloud, Vimeo, etc.)
2. Generate a new key
3. Update the Cloudflare Worker secret
4. Remove the key from Git history (see below)

### Remove Secrets from Git History

If you accidentally committed a secret:

```powershell
# Option 1: BFG Repo Cleaner (easiest)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text secrets.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Option 2: git filter-branch
git filter-branch --force --index-filter `
  "git rm --cached --ignore-unmatch path/to/file" `
  --prune-empty --tag-name-filter cat -- --all

# Force push to update remote
git push --force --all origin
```

⚠️ **Force pushing rewrites history and may affect collaborators.**

---

## 📚 Additional Resources

- [Cloudflare Worker Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [YouTube API Key Best Practices](https://developers.google.com/youtube/v3/getting-started#before-you-start)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [BFG Repo Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

## ✅ Verification After Fix

Run these checks to ensure keys are not exposed:

```powershell
# 1. Search source code for any API key patterns
Get-ChildItem -Recurse -Filter *.dart | Select-String -Pattern "AIza|Bearer" 

# 2. Verify .gitignore is protecting sensitive files
git check-ignore build/web/main.dart.js
# Should output: build/web/main.dart.js

# 3. Test worker endpoints
curl "https://firsttaps-paste.firsttaps.workers.dev/api/youtube/shorts?maxResults=2"

# 4. Check that no keys are in Git history
git log -p | Select-String -Pattern "AIza" -Context 2
```

---

## 🆘 Emergency Response

If you discover an exposed API key:

1. ✅ **IMMEDIATELY revoke the key** at the service provider
2. ✅ Generate a new key 
3. ✅ Update Cloudflare Worker secret
4. ✅ Remove from Git history (if committed)
5. ✅ Force push to overwrite remote history
6. ✅ Notify team members to pull fresh history
7. ✅ Monitor API usage for unauthorized activity

---

**Last Updated**: April 1, 2026  
**Security Contact**: [Your Email]
