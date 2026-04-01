# FirstTaps MV3D Cloudflare Worker - Paste Service

A Cloudflare Worker that provides reliable paste service functionality for sharing furniture playlists.

## Features

- ✅ Store compressed furniture playlist data in Cloudflare KV
- ✅ Global CDN delivery (fast worldwide)
- ✅ 1-year expiration on pastes
- ✅ CORS-enabled for browser access
- ✅ Free tier: 100K reads/day, 1K writes/day, 1 GB storage

## Setup Instructions

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create KV Namespace

```bash
# Production namespace
wrangler kv:namespace create "FURNITURE_PASTES"

# Preview namespace (for testing)
wrangler kv:namespace create "FURNITURE_PASTES" --preview
```

This will output namespace IDs like:
```
{ binding = "FURNITURE_PASTES", id = "abc123..." }
{ binding = "FURNITURE_PASTES", preview_id = "def456..." }
```

### 4. Update wrangler.toml

Copy the namespace IDs from step 3 into `wrangler.toml`:

```toml
kv_namespaces = [
  { binding = "FURNITURE_PASTES", id = "abc123...", preview_id = "def456..." }
]
```

### 5. Deploy Worker

```bash
# Deploy to production
wrangler deploy

# Or test locally first
wrangler dev
```

### 6. Note Your Worker URL

After deployment, Wrangler will show your worker URL:
- workers.dev: `https://firsttaps-paste.YOUR_SUBDOMAIN.workers.dev`
- Custom domain: `https://paste.firsttaps.com`

### 7. Update Application Code

Update the worker URL in:
- `assets/web/js/modules/sharing/furnitureShareManager.js`
- `furniture-playlist-viewerREFSHARE/index.html`
- `lib/services/furniture_import_service.dart`

Replace `YOUR_WORKER_URL` with your actual worker URL.

## API Endpoints

### POST /api/paste
Store new paste data.

**Request:**
```
POST https://YOUR_WORKER_URL/api/paste
Content-Type: text/plain

<compressed furniture data>
```

**Response:**
```json
{
  "success": true,
  "id": "abc12345",
  "url": "https://YOUR_WORKER_URL/api/paste/abc12345",
  "size": 82456
}
```

### GET /api/paste/:id
Retrieve paste data.

**Request:**
```
GET https://YOUR_WORKER_URL/api/paste/abc12345
```

**Response:**
```
<raw compressed furniture data>
```

## Custom Domain (Optional)

To use a custom domain like `paste.firsttaps.com`:

1. Add the domain to Cloudflare
2. Update `wrangler.toml`:
```toml
routes = [
  { pattern = "paste.firsttaps.com/*", zone_name = "firsttaps.com" }
]
```
3. Redeploy: `wrangler deploy`

## Testing

Test the worker locally:
```bash
wrangler dev
```

Then test in another terminal:
```bash
# Store paste
curl -X POST http://localhost:8787/api/paste -d "test data"

# Retrieve paste (use ID from response)
curl http://localhost:8787/api/paste/abc12345
```

## Monitoring

View usage and logs:
```bash
# View logs
wrangler tail

# Check KV storage
wrangler kv:key list --binding=FURNITURE_PASTES
```

## Costs

**Free Tier:**
- 100,000 requests/day
- 1,000 KV writes/day
- 100,000 KV reads/day
- 1 GB storage

This is more than sufficient for typical usage.

## Troubleshooting

**Error: "KV namespace not found"**
- Make sure you created the namespace and updated `wrangler.toml` with the correct IDs

**CORS errors in browser**
- Worker includes CORS headers by default
- If using custom domain, ensure it's properly configured

**Paste not found**
- Pastes expire after 1 year
- Check KV storage: `wrangler kv:key list --binding=FURNITURE_PASTES`
