/**
 * Cloudflare Worker for FirstTaps MV3D Furniture Playlist Sharing
 * 
 * This worker stores and retrieves compressed furniture playlist data
 * using Cloudflare Workers KV storage.
 * 
 * Endpoints:
 * - POST /api/paste - Store new paste, returns paste ID
 * - GET /api/paste/:id - Retrieve paste by ID
 * 
 * Free Tier Limits:
 * - 100,000 reads/day
 * - 1,000 writes/day  
 * - 1 GB storage
 */

// CORS headers for browser access
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/**
 * Generate a random paste ID
 * @returns {string} - Random 8-character ID
 */
function generatePasteId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Handle incoming requests
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    // POST /api/paste - Create new paste
    if (request.method === 'POST' && url.pathname === '/api/paste') {
      try {
        // Read request body (compressed furniture data)
        const content = await request.text();
        
        // Validate size (max 1 MB for safety)
        if (content.length > 1024 * 1024) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Content too large (max 1 MB)'
          }), {
            status: 413,
            headers: { 
              'Content-Type': 'application/json',
              ...CORS_HEADERS 
            }
          });
        }

        // Generate unique ID
        let pasteId = generatePasteId();
        
        // Ensure ID is unique (check if exists)
        let exists = await env.FURNITURE_PASTES.get(pasteId);
        let attempts = 0;
        while (exists && attempts < 5) {
          pasteId = generatePasteId();
          exists = await env.FURNITURE_PASTES.get(pasteId);
          attempts++;
        }

        if (exists) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to generate unique ID'
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...CORS_HEADERS 
            }
          });
        }

        // Store in KV with metadata
        const pasteData = {
          content: content,
          created: Date.now(),
          size: content.length
        };

        // Store with 1 year expiration (31536000 seconds)
        await env.FURNITURE_PASTES.put(
          pasteId, 
          JSON.stringify(pasteData),
          { expirationTtl: 31536000 }
        );

        // Return success response
        return new Response(JSON.stringify({
          success: true,
          id: pasteId,
          url: `${url.origin}/api/paste/${pasteId}`,
          size: content.length
        }), {
          status: 201,
          headers: { 
            'Content-Type': 'application/json',
            ...CORS_HEADERS 
          }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...CORS_HEADERS 
          }
        });
      }
    }

    // GET /api/paste/:id - Retrieve paste
    if (request.method === 'GET' && url.pathname.startsWith('/api/paste/')) {
      const pasteId = url.pathname.split('/').pop();
      
      if (!pasteId || pasteId.length !== 8) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid paste ID'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...CORS_HEADERS 
          }
        });
      }

      try {
        // Retrieve from KV
        const pasteDataStr = await env.FURNITURE_PASTES.get(pasteId);
        
        if (!pasteDataStr) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Paste not found or expired'
          }), {
            status: 404,
            headers: { 
              'Content-Type': 'application/json',
              ...CORS_HEADERS 
            }
          });
        }

        const pasteData = JSON.parse(pasteDataStr);
        
        // Return raw content (for viewer)
        return new Response(pasteData.content, {
          status: 200,
          headers: { 
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
            ...CORS_HEADERS 
          }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...CORS_HEADERS 
          }
        });
      }
    }

    // GET /api/youtube/shorts - Proxy YouTube API for Gallery Wall (mostPopular)
    if (request.method === 'GET' && url.pathname === '/api/youtube/shorts') {
      return handleYouTubeRequest(env, 'shorts', url.searchParams);
    }

    // GET /api/youtube/music-videos - Proxy YouTube API for Riser (videoCategoryId=10)
    if (request.method === 'GET' && url.pathname === '/api/youtube/music-videos') {
      return handleYouTubeRequest(env, 'music-videos', url.searchParams);
    }

    // GET /api/youtube/music-audio - Proxy YouTube API for Small Stage (audio search)
    if (request.method === 'GET' && url.pathname === '/api/youtube/music-audio') {
      return handleYouTubeRequest(env, 'music-audio', url.searchParams);
    }

    // GET /api/vimeo/staff-picks - Proxy Vimeo API for Staff Picks
    if (request.method === 'GET' && url.pathname === '/api/vimeo/staff-picks') {
      return handleVimeoRequest(env, url.searchParams);
    }

    // Default 404
    return new Response('Not Found', {
      status: 404,
      headers: CORS_HEADERS
    });
  }
};

/**
 * Handle YouTube API proxy requests
 * @param {Object} env - Environment bindings (includes YOUTUBE_API_KEY secret)
 * @param {string} type - Type of request: 'shorts', 'music-videos', 'music-audio'
 * @param {URLSearchParams} params - Query parameters (maxResults, etc.)
 * @returns {Response} - YouTube API response
 */
async function handleYouTubeRequest(env, type, params) {
  try {
    // Check if API key is configured
    if (!env.YOUTUBE_API_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'YouTube API key not configured on server'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...CORS_HEADERS 
        }
      });
    }

    // Get maxResults from query params (default to 50 for videos, 25 for audio)
    const requestedMaxResults = parseInt(params.get('maxResults') || (type === 'music-audio' ? '25' : '50'));
    
    // YouTube API only supports 'mostPopular' chart (NOT 'trending')
    // Force mostPopular to avoid 400 errors
    const chart = 'mostPopular';
    
    // Get region code (US, CA, GB, etc.) - default to US
    const regionCode = params.get('regionCode') || 'US';
    
    // YouTube API caps maxResults at 50 per request
    // If more than 50 requested, we'll paginate
    const needsPagination = requestedMaxResults > 50;
    const perPageLimit = Math.min(requestedMaxResults, 50);
    
    // Helper function to build YouTube API URL
    const buildYouTubeUrl = (pageToken = null) => {
      let baseUrl;
      
      if (type === 'shorts') {
        // Gallery Wall: Music category videos (videoCategoryId=10)
        // Using Videos API (1 quota unit) instead of Search API (100 quota units)
        // Only supports 'mostPopular' chart (forcing above)
        baseUrl = `https://www.googleapis.com/youtube/v3/videos?` +
          `part=snippet,contentDetails,statistics` +
          `&chart=${chart}` +
          `&videoCategoryId=10` +
          `&regionCode=${regionCode}` +
          `&maxResults=${perPageLimit}` +
          `&key=${env.YOUTUBE_API_KEY}`;
      } 
      else if (type === 'music-videos') {
        // Riser: Music category (videoCategoryId=10)
        baseUrl = `https://www.googleapis.com/youtube/v3/videos?` +
          `part=snippet,contentDetails,statistics` +
          `&chart=${chart}` +
          `&videoCategoryId=10` +
          `&regionCode=${regionCode}` +
          `&maxResults=${perPageLimit}` +
          `&key=${env.YOUTUBE_API_KEY}`;
      }
      else if (type === 'music-audio') {
        // Small Stage: Search with audio query
        baseUrl = `https://www.googleapis.com/youtube/v3/search?` +
          `part=snippet` +
          `&type=video` +
          `&videoCategoryId=10` +
          `&q=official+audio|lyric+video` +
          `&order=viewCount` +
          `&regionCode=${regionCode}` +
          `&maxResults=${perPageLimit}` +
          `&key=${env.YOUTUBE_API_KEY}`;
      }
      
      // Add pageToken if provided
      if (pageToken) {
        baseUrl += `&pageToken=${pageToken}`;
      }
      
      return baseUrl;
    };
    
    // Collect all items across pages
    let allItems = [];
    let nextPageToken = null;
    let totalFetched = 0;
    let pageCount = 0;
    const maxPages = 3; // Safety limit: max 3 pages (50 x 3 = 150 videos)
    
    do {
      const youtubeUrl = buildYouTubeUrl(nextPageToken);
      
      // Fetch from YouTube API with Referer header (required for HTTP referrer restrictions)
      const response = await fetch(youtubeUrl, {
        headers: {
          'Referer': 'https://mv3d.firsttaps.com/'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({
          success: false,
          error: `YouTube API error: ${response.status}`,
          details: errorText
        }), {
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            ...CORS_HEADERS 
          }
        });
      }

      const data = await response.json();
      
      // Collect items
      if (data.items && data.items.length > 0) {
        allItems = allItems.concat(data.items);
        totalFetched += data.items.length;
      }
      
      // Check if we need another page
      nextPageToken = data.nextPageToken;
      pageCount++;
      
      // Stop if:
      // 1. No more pages available
      // 2. We've reached requested amount
      // 3. We've hit max page safety limit
      if (!nextPageToken || totalFetched >= requestedMaxResults || pageCount >= maxPages || !needsPagination) {
        break;
      }
      
    } while (nextPageToken && totalFetched < requestedMaxResults && pageCount < maxPages);
    
    // Build combined response
    const combinedData = {
      kind: 'youtube#videoListResponse',
      items: allItems.slice(0, requestedMaxResults), // Trim to exact requested amount
      pageInfo: {
        totalResults: allItems.length,
        resultsPerPage: allItems.length
      }
    };

    // Return YouTube API response with CORS headers
    // Cache for 15 minutes (reduced from 30 to get fresher content)
    return new Response(JSON.stringify(combinedData), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900', // 15 minutes
        'X-Total-Pages': pageCount.toString(),
        'X-Total-Items': allItems.length.toString(),
        ...CORS_HEADERS 
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...CORS_HEADERS 
      }
    });
  }
}

/**
 * Handle Vimeo API proxy requests
 * @param {Object} env - Environment bindings (includes VIMEO_ACCESS_TOKEN secret)
 * @param {URLSearchParams} params - Query parameters (maxResults, etc.)
 * @returns {Response} - Vimeo API response
 */
async function handleVimeoRequest(env, params) {
  try {
    // Check if API token is configured
    if (!env.VIMEO_ACCESS_TOKEN) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Vimeo access token not configured on server'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...CORS_HEADERS 
        }
      });
    }

    // Get maxResults from query params (default to 50)
    const maxResults = params.get('maxResults') || '50';

    // Build Vimeo API URL for Staff Picks channel
    const vimeoUrl = `https://api.vimeo.com/channels/staffpicks/videos?` +
      `per_page=${maxResults}` +
      `&fields=uri,link` +
      `&filter=featured` +
      `&sort=date`;

    // Fetch from Vimeo API with Bearer token
    const response = await fetch(vimeoUrl, {
      headers: {
        'Authorization': `Bearer ${env.VIMEO_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({
        success: false,
        error: `Vimeo API error: ${response.status}`,
        details: errorText
      }), {
        status: response.status,
        headers: { 
          'Content-Type': 'application/json',
          ...CORS_HEADERS 
        }
      });
    }

    const data = await response.json();

    // Return Vimeo API response with CORS headers
    // Cache for 30 minutes to reduce API usage
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800', // 30 minutes
        ...CORS_HEADERS 
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...CORS_HEADERS 
      }
    });
  }
}
