# Furniture Playlist Viewer - Cloudflare Worker Integration

## Instructions for Adding Cloudflare Worker Support

### Step 1: Add Cloudflare to URL Parameter Detection

Find the section where paste services are detected from URL parameters (around line 1460-1505 in index.html).

**Add this FIRST in the list (before 'gist'):**

```javascript
if (urlParams.has('cf')) {
    pasteId = urlParams.get('cf');
    pasteService = 'cloudflare';
} else if (urlParams.has('gist')) {
```

**Also add it to the hash parameters section (around line 1540):**

```javascript
if (hashParams.has('cf')) {
    pasteId = hashParams.get('cf');
    pasteService = 'cloudflare';
} else if (hashParams.has('gist')) {
```

### Step 2: Add Cloudflare Fetch Handler

Find where the service-specific fetch handlers start (around line 1550, after `if (pasteId && pasteService) {`).

**Add this FIRST (before the 'gist' handler):**

```javascript
if (pasteService === 'cloudflare') {
    console.log('📥 Loading from Cloudflare Workers KV:', this.pasteId);
    
    const workerUrl = 'https://firsttaps-paste.firsttaps.workers.dev';
    
    // Cloudflare Worker API - direct fetch, CORS enabled
    response = await fetch(`${workerUrl}/api/paste/${this.pasteId}`);
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Paste not found or expired. Please generate a new share link.');
        }
        throw new Error(`Failed to fetch from Cloudflare Workers (HTTP ${response.status})`);
    }
    
    let rawData = await response.text();
    console.log('📦 Raw data from Cloudflare (first 100 chars):', rawData.substring(0, 100));
    
    // Clean whitespace
    const originalLength = rawData.length;
    furnitureData = rawData.replace(/\s+/g, '');
    if (furnitureData.length !== originalLength) {
        console.log(`🧹 Cleaned data: ${originalLength} → ${furnitureData.length} chars`);
    }
    
    // Decompress with LZ-String
    console.log('🗜️ Decompressing with LZ-String...');
    const jsonString = LZString.decompressFromEncodedURIComponent(furnitureData);
    if (!jsonString) {
        throw new Error('Failed to decompress data. The share link may be corrupted.');
    }
    console.log('✅ Data decompressed successfully');
    const data = JSON.parse(jsonString);
    console.log('✅ Furniture data loaded:', data);
    return data;
} else if (pasteService === 'gist') {
```

### Step 3: Test the Integration

1. **Commit and push** the changes to the furniture-playlist-viewer repo
2. **Test with a share link** that uses the `?cf=` parameter
3. **Check console logs** for:
   - "📥 Loading from Cloudflare Workers KV"
   - "📦 Raw data from Cloudflare"
   - "✅ Data decompressed successfully"

### Summary of Changes

**What this does:**
- Detects `?cf=PASTE_ID` URLs
- Fetches furniture data from your Cloudflare Worker
- Decompresses and loads the furniture

**Worker URL:**
```
https://firsttaps-paste.firsttaps.workers.dev
```

**Example share link format:**
```
https://share.firsttaps.com/?cf=a7wqruvb
```

### Notes

- The Cloudflare handler must be **first** in the if-else chain
- Make sure the worker URL matches your deployed worker
- The viewer and main app now both support Cloudflare Workers

---

## Quick Copy-Paste Version

### URL Parameter Detection (add at line ~1464):
```javascript
if (urlParams.has('cf')) {
    pasteId = urlParams.get('cf');
    pasteService = 'cloudflare';
} else
```

### Hash Parameter Detection (add at line ~1508):
```javascript
if (hashParams.has('cf')) {
    pasteId = hashParams.get('cf');
    pasteService = 'cloudflare';
} else
```

### Fetch Handler (add at line ~1550):
```javascript
if (pasteService === 'cloudflare') {
    console.log('📥 Loading from Cloudflare Workers KV:', this.pasteId);
    const workerUrl = 'https://firsttaps-paste.firsttaps.workers.dev';
    response = await fetch(`${workerUrl}/api/paste/${this.pasteId}`);
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Paste not found or expired. Please generate a new share link.');
        }
        throw new Error(`Failed to fetch from Cloudflare Workers (HTTP ${response.status})`);
    }
    let rawData = await response.text();
    console.log('📦 Raw data from Cloudflare (first 100 chars):', rawData.substring(0, 100));
    const originalLength = rawData.length;
    furnitureData = rawData.replace(/\s+/g, '');
    if (furnitureData.length !== originalLength) {
        console.log(`🧹 Cleaned data: ${originalLength} → ${furnitureData.length} chars`);
    }
    console.log('🗜️ Decompressing with LZ-String...');
    const jsonString = LZString.decompressFromEncodedURIComponent(furnitureData);
    if (!jsonString) {
        throw new Error('Failed to decompress data. The share link may be corrupted.');
    }
    console.log('✅ Data decompressed successfully');
    const data = JSON.parse(jsonString);
    console.log('✅ Furniture data loaded:', data);
    return data;
} else
```
