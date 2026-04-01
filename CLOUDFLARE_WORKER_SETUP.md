# Cloudflare Worker Setup Guide

## Problem with Current Paste Services

### rentry.co (BROKEN)
- **Status**: ❌ No longer works
- **Issue**: As of 2026, rentry.co requires access codes to fetch raw paste content
- **Error**: Returns HTML page saying "Access Code Required" instead of paste data
- **Solution**: Service removed from app

### paste.gg (SLOW/UNRELIABLE)
- **Status**: ⚠️ Works but has issues
- **Issues**: 
  - Times out frequently (30+ seconds)
  - Intermittent 5xx errors
  - Community-run (no SLA)
  - Can be slow on mobile networks
- **Current Role**: Fallback only

## Cloudflare Workers Solution

Cloudflare Workers KV provides a reliable, fast, free alternative with these benefits:

- ✅ **Reliable**: 99.9% uptime guarantee
- ✅ **Fast**: Global CDN (millisecond latency worldwide)
- ✅ **Free**: 100K reads/day, 1K writes/day, 1 GB storage
- ✅ **You control it**: No third-party dependencies
- ✅ **CORS-enabled**: Works from any browser
- ✅ **Simple API**: Two endpoints (POST to create, GET to retrieve)

## Setup Steps

### 1. Deploy the Worker

```bash
cd cloudflare-worker

# Install Wrangler CLI (if not already installed)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create KV namespace
wrangler kv:namespace create "FURNITURE_PASTES"
wrangler kv:namespace create "FURNITURE_PASTES" --preview

# Update wrangler.toml with the namespace IDs from above

# Deploy
wrangler deploy
```

The deployment will output your worker URL, for example:
- `https://firsttaps-paste.YOUR_SUBDOMAIN.workers.dev`

### 2. Update the Application Code

Replace `YOUR_WORKER_URL_HERE` with your actual worker URL in these files:

#### assets/web/js/modules/sharing/furnitureShareManager.js
```javascript
// Line ~23
this.cloudflareWorkerUrl = 'https://firsttaps-paste.YOUR_SUBDOMAIN.workers.dev';
```

#### furniture-playlist-viewerREFSHARE/index.html
```javascript
// Line ~1553
const workerUrl = 'https://firsttaps-paste.YOUR_SUBDOMAIN.workers.dev';
```

#### lib/services/furniture_import_service.dart
```dart
// Line ~217
const workerUrl = 'https://firsttaps-paste.YOUR_SUBDOMAIN.workers.dev';
```

### 3. Rebuild and Deploy

```powershell
# Build the app
.\build.ps1

# Deploy to GitHub Pages
.\deploy.ps1
```

### 4. Test the Integration

1. Open the app
2. Create a furniture piece with some links
3. Tap "Share" on the furniture
4. Verify the share link uses `?cf=` parameter
5. Open the share link in the viewer
6. Verify the furniture loads correctly

## Custom Domain (Optional)

To use a custom domain like `paste.firsttaps.com`:

1. Add `firsttaps.com` to your Cloudflare account
2. Update `wrangler.toml`:
```toml
routes = [
  { pattern = "paste.firsttaps.com/*", zone_name = "firsttaps.com" }
]
```
3. Redeploy: `wrangler deploy`
4. Update the URLs in the app code to use `https://paste.firsttaps.com`

## Monitoring

```bash
# View live logs
wrangler tail

# Check storage usage
wrangler kv:key list --binding=FURNITURE_PASTES

# Get a specific paste
wrangler kv:key get --binding=FURNITURE_PASTES "abc12345"
```

## Costs

**Cloudflare Workers Free Tier:**
- 100,000 requests/day
- 1,000 KV writes/day
- 100,000 KV reads/day  
- 1 GB storage
- No credit card required

This is more than sufficient for typical usage. If you exceed these limits, the paid plan is $5/month.

## Troubleshooting

### "Cloudflare Worker URL not configured"
- You need to replace `YOUR_WORKER_URL_HERE` in the three files listed above

### CORS errors
- The worker includes CORS headers automatically
- If using a custom domain, ensure it's in the same Cloudflare account

### Paste not found
- Pastes expire after 1 year
- Check if the paste exists: `wrangler kv:key get --binding=FURNITURE_PASTES "paste_id"`

### Deployment fails
- Make sure you updated `wrangler.toml` with your KV namespace IDs
- Run `wrangler whoami` to verify you're logged in
