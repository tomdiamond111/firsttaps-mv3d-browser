# API Key Setup (Cloudflare Worker Proxy)

## Overview
API keys for YouTube and Vimeo are now **hidden server-side** via Cloudflare Worker proxy. 
The browser never sees the API keys - only the Worker does.

## Benefits
- ✅ **Security**: API keys never exposed to client
- ✅ **No rebuilds**: Update keys instantly via Worker secrets
- ✅ **Caching**: 30-minute cache reduces API quota usage
- ✅ **HTTP referrer protection**: Still applies on Worker's fetch to APIs

## Deployment Steps

### 1. Set API Keys as Worker Secrets

Run these commands in the `cloudflare-worker` directory:

```bash
cd cloudflare-worker

# Set YouTube API key
wrangler secret put YOUTUBE_API_KEY

# Set Vimeo access token
wrangler secret put VIMEO_ACCESS_TOKEN
```

When prompted, paste your API keys:
- Get your YouTube API key from: https://console.cloud.google.com/apis/credentials
- Get your Vimeo access token from: https://developer.vimeo.com/apps

These are stored as encrypted environment variables on Cloudflare.

### 2. Deploy the Updated Worker

```bash
wrangler deploy
```

This deploys the worker with the new YouTube proxy endpoints.

### 3. Verify Worker is Live

Test the endpoints:

```bash
# Test shorts endpoint
curl "https://firsttaps-paste.firsttaps.workers.dev/api/youtube/shorts?maxResults=2"

# Test music videos endpoint
curl "https://firsttaps-paste.firsttaps.workers.dev/api/youtube/music-videos?maxResults=2"

# Test music audio endpoint
curl "https://firsttaps-paste.firsttaps.workers.dev/api/youtube/music-audio?maxResults=2"

# Test Vimeo staff picks endpoint
curl "https://firsttaps-paste.firsttaps.workers.dev/api/vimeo/staff-picks?maxResults=2"
```

You should see API responses (not errors).

### 4. Build and Deploy Browser App

```powershell
cd ..
.\build.ps1
.\deploy.ps1
```

This deploys the latest version which uses the Worker proxy for both YouTube and Vimeo.

## Worker Endpoints

The Worker now has these endpoints:

| Endpoint | Description | Used By |
|----------|-------------|---------|
| `GET /api/youtube/shorts?maxResults=50` | Most popular videos (any duration) | Gallery Wall |
| `GET /api/youtube/music-videos?maxResults=50` | Music category videos (category 10) | Riser |
| `GET /api/youtube/music-audio?maxResults=25` | Audio-focused search results | Small Stage |
| `GET /api/vimeo/staff-picks?maxResults=50` | Vimeo Staff Picks channel videos | Gallery Wall, Riser, Amphitheatre |
| `POST /api/paste` | Store furniture playlist data | Share feature |
| `GET /api/paste/:id` | Retrieve shared furniture | Share feature |

## Future Key Rotation

To update API keys in the future (NO rebuild required):

```bash
cd cloudflare-worker

# Update YouTube API key
wrangler secret put YOUTUBE_API_KEY

# Update Vimeo access token
wrangler secret put VIMEO_ACCESS_TOKEN
```

Paste new keys when prompted. Changes take effect immediately - no app rebuild needed!

## Troubleshooting

### Error: "YouTube API key not configured on server"
- Run `wrangler secret put YOUTUBE_API_KEY` to set the key
- Verify deployment with `wrangler deployments list`

### Error: "Vimeo access token not configured on server"
- Run `wrangler secret put VIMEO_ACCESS_TOKEN` to set the token
- Verify deployment with `wrangler deployments list`

### Error: "YouTube API error: 403"
- Check API key has HTTP referrer restrictions allowing `*.workers.dev` domain
- Worker makes requests FROM Cloudflare to YouTube (not from browser)

### Error: "Vimeo API error: 401"
- Verify Vimeo access token is valid and not expired
- Check token has proper permissions for reading Staff Picks channel
- Get new token from: https://developer.vimeo.com/apps

### Error: "Worker not found"
- Verify Worker URL in browserRecommendationsFetcher.js matches your Worker name
- Current URL: `https://firsttaps-paste.firsttaps.workers.dev`

## Architecture

```
Browser
  ↓ (calls Worker)
Cloudflare Worker (has API key secrets)
  ↓ (calls YouTube/Vimeo)
YouTube/Vimeo APIs
  ↓ (returns videos)
Cloudflare Worker (caches 30min)
  ↓ (returns to browser)
Browser (receives videos, never sees API keys)
```

## API Key Security

- ✅ Stored as encrypted Worker secrets (not in code)
- ✅ Never sent to browser/client
- ✅ HTTP referrer restrictions still apply (YouTube)
- ✅ Worker request logs don't expose secrets
- ✅ Can rotate instantly without code changes
- ✅ No .env.local file needed for API keys in most cases
