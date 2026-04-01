/**
 * Version Manager - Handles app version tracking and update notifications
 * Helps users know when they need to clear cache for new updates
 */

(() => {
    'use strict';

    const CURRENT_APP_VERSION = '1.2.61'; // Update this when releasing changes that require cache clear
    const VERSION_KEY = 'mv3d_app_version';
    const LAST_UPDATE_NOTIFICATION_KEY = 'mv3d_last_update_notification';
    
    // Version changelog - tracks which versions require cache clear
    const VERSION_CHANGELOG = {
        '1.2.61': {
            date: '2026-04-01',
            requiresCacheClear: true,
            changes: [
                'REMOVED: Google AdSense implementation (ads.txt, banner HTML, CSS, and scripts)',
                'UI improvement: Buttons moved closer to screen edges (more space for 3D view)',
                'Score and Home buttons now 24px from edges (was 114px for ad clearance)',
                'Logo badge repositioned to 68px from bottom (above Score button)',
                'Cleaner interface with no ad banner taking up screen space',
                'Preparing for future freemium monetization model'
            ]
        },
        '1.2.60': {
            date: '2026-03-24',
            requiresCacheClear: true,
            changes: [
                'FIX: Music preferences dialog now properly appears on first load before furniture',
                'FIX: Hints appear after furniture loads (3 second delay)',
                'FIX: Logo badge made 75% smaller (24px width) and repositioned above Score button',
                'Improved first-time user flow: Music prefs → Furniture loads → Hints appear',
                'Logo badge now has subtle hover effect (1.1x scale)',
                'All UI elements properly coordinated for smooth first launch experience'
            ]
        },
        '1.2.59': {
            date: '2026-03-24',
            requiresCacheClear: true,
            changes: [
                'FIX: Music preferences dialog now appears BEFORE hints (streamlined UX)',
                'FIX: Removed long welcome instructions dialog - hints provide better guidance',
                'FIX: Logo badge path corrected and moved to right of Score button (no longer hidden by ads)',
                'NEW: Responsive AdSense banners - 728x90 (desktop), 468x60 (medium), 320x50 (mobile)',
                'Medium screens now use 33% smaller banner (468x60 vs 728x90) - less screen coverage',
                'Improved first-time user flow: Furniture loads → Music preferences → Hints',
                'All UI elements adjust positions based on ad banner size'
            ]
        },
        '1.2.58': {
            date: '2026-03-24',
            requiresCacheClear: true,
            changes: [
                'NEW: Animated splash screen with FirstTaps MV3D logo (2-3 seconds during world load)',
                'NEW: Logo badge in lower left corner - clickable link to firsttaps.com',
                'NEW: Welcome hint overlays appear after furniture loads for first-time users',
                'Hint 1: "Tap Home Button to Explore Demo Playlists, Or Tap + Button to Create Your Own"',
                'Hint 2: "Double Tap furniture to show Refresh button. Long Press furniture and objects to Move and Share"',
                'Improved first-time user experience with visual guidance and branding',
                'Mobile responsive design for all new UI elements'
            ]
        },
        '1.2.57': {
            date: '2026-03-23',
            requiresCacheClear: true,
            changes: [
                'API optimization: Reduced US fetching by 30% (0.7x), increased CA/GB by 30% (1.3x)',
                'Better genre diversity: Less hip-hop heavy US content, more diverse CA/GB content',
                'Enhanced hip hop filtering: Added trap, drill, mumble rap, freestyle, cypher, bars keywords',
                'More efficient API quota usage while maintaining content volume',
                'Hip hop filtering only activates when genre is unchecked in preferences'
            ]
        },
        '1.2.56': {
            date: '2026-03-21',
            requiresCacheClear: true,
            changes: [
                'CRITICAL: Fixed Gallery Wall slot filling - now fills all 10 slots consistently',
                'Added probabilistic hip hop reduction filter - reduces from 70% to 40% of content',
                'Increased YouTube pool from 13 to 28 videos (370% buffer vs 220%)',
                'Made preference learning less aggressive - higher thresholds (5/10 vs 3/6 dislikes)',
                'Hip hop filter: Randomly filters 60% of hip hop content for better variety',
                'Better genre diversity: pop, rock, electronic, country now have more presence',
                'Vimeo 404 errors handled gracefully with fallback thumbnails'
            ]
        },
        '1.2.55': {
            date: '2026-03-21',
            requiresCacheClear: true,
            changes: [
                'CRITICAL FIX: Gallery Wall now uses same reliable API as Riser',
                'Fixed invalid "trending" chart causing 400 errors - forced to "mostPopular"',
                'Simplified from multi-region to single US region (matching Riser)',
                'Added English language filtering - blocks hi, pa, ko, ja, zh and other non-English',
                'Added non-English channel blocking - T-Series, HYBE LABELS, Diljit Dosanjh, etc.',
                'Increased YouTube content from 13 to 18 videos (matching Riser ratio)',
                'Gallery Wall should now fill all 10 slots with English music videos',
                'Cloudflare Worker deployed with mostPopular chart fix'
            ],
            description: 'Gallery Wall English Content Fix + API Error Resolution'
        },
        '1.2.54': {
            date: '2026-03-20',
            requiresCacheClear: true,
            changes: [
                'PRIORITY 1: ContentPreferenceLearningService blocking - Blocks disliked channels/artists BEFORE oEmbed',
                'PRIORITY 2: Multi-region fetching - US (trending), CA (mostPopular), GB (mostPopular)',
                'US uses "trending" chart for more diverse music vs mostPopular ~97% hip hop',
                'CA/GB provide English indie/rock/pop content (less hip-hop heavy)',
                '35 videos per region  × 3 = ~105 total videos before filtering',
                'Cloudflare Worker supports chart= and regionCode= parameters',
                'Saves quota by filtering blocked content before expensive oEmbed validation',
                'Metadata cached for preference learning on future dislikes'
            ],
            description: 'User Preference Blocking + Multi-Region Content Diversity'
        },
        '1.2.53': {
            date: '2026-03-20',
            requiresCacheClear: true,
            changes: [
                'FIX: Cloudflare Worker now implements pagination to fetch 100+ videos',
                'YouTube API caps at 50 results per request - now fetches multiple pages',
                'Gallery Wall will receive 100-150 videos instead of 30-50',
                'Reduced cache time from 30min to 15min for fresher content',
                'Added X-Total-Pages and X-Total-Items headers for debugging',
                'Should resolve "only 3/10 slots filled" issue by providing larger content pool'
            ],
            description: 'YouTube API Pagination Implementation'
        },
        '1.2.52': {
            date: '2026-03-20',
            requiresCacheClear: true,
            changes: [
                'NEW: Genre-based content filtering using Music Preferences',
                'Gallery Wall now respects user genre selections from preferences dialog',
                'If user does NOT select Hip Hop, Rap content is reduced (not eliminated)',
                'Focused keyword filtering: rap, hip hop, country, rock, edm, reggae, jazz, classical, latin',
                'Non-aggressive approach - reduces unselected genres without blocking entirely',
                'ContentPreferencesService integrated with recommendations system'
            ],
            description: 'Music Genre Preferences Integration'
        },
        '1.2.51': {
            date: '2026-03-20',
            requiresCacheClear: true,
            changes: [
                'FIX: Aggressive client-side filtering to remove movie trailers and gaming content',
                'Filters non-music channels (PlayStation, Warner Bros, Paramount, Netflix, etc.)',
                'Filters trailer keywords (Official Trailer, Teaser, Launch Trailer, etc.)',
                'Filters gaming content (Gameplay, Walkthrough, Gaming, etc.)',
                'Uses efficient Videos API (1 quota) instead of expensive Search API (100 quota)',
                'Gallery Wall should now show ONLY music videos (no Spider-Man, Sonic, Dune trailers)'
            ],
            description: 'Enhanced Music-Only Filtering for Gallery Wall'
        },
        '1.2.50': {
            date: '2026-03-20',
            requiresCacheClear: true,
            changes: [
                'FIX: Deployed Cloudflare Worker with Music category filter (videoCategoryId=10)',
                'FIX: Added oEmbed validation to filter broken/private YouTube videos with 404 thumbnails',
                'Rejects videos with generic "YouTube Video" title (indicates restricted access)',
                'Rejects videos with no author info (deleted channels)',
                'Validates oEmbed API response before including videos',
                'Gallery Wall now properly restricted to music videos ONLY',
                'Should eliminate all broken thumbnail and non-music video issues'
            ],
            description: 'Gallery Wall Music Filter + oEmbed Validation for Broken Videos'
        },
        '1.2.49': {
            date: '2026-03-20',
            requiresCacheClear: true,
            changes: [
                'FIX: Gallery Wall now restricted to MUSIC VIDEOS ONLY (YouTube Music category - local code only, worker not deployed)',
                'FIX: Increased YouTube API fetch from 50 to 100 videos to ensure enough content after filtering',
                'FIX: Enhanced thumbnail validation to filter broken/private videos more effectively',
                'Removed overly aggressive geo-restriction filtering (music videos rarely geo-blocked)',
                'Gallery Wall now shows Music category (videoCategoryId=10) content exclusively',
                'Filters out "Topic" channels (audio-only) and live broadcasts',
                'Validates all thumbnail quality levels (default, medium, high) are present',
                'Improved content quality and consistency for Gallery Wall'
            ],
            description: 'Gallery Wall Music-Only + Enhanced Video Filtering (Worker Not Deployed)'
        },
        '1.2.48': {
            date: '2026-03-20',
            requiresCacheClear: true,
            changes: [
                'FIX: Score button and scoreboard now properly update after tapping gaming entities',
                'FIX: Score button now updates when collecting treasure boxes',
                'Score display syncs with static HTML button (scoreBtn) on all score changes',
                'Ensures consistent score display across game UI and scoreboard menu'
            ],
            description: 'Fix Score Button Update - Gaming Entities & Treasure Boxes'
        },
        '1.2.47': {
            date: '2026-03-19',
            requiresCacheClear: true,
            changes: [
                'FIX: Enhanced YouTube filtering for Gallery Wall content',
                'Filter out geo-restricted broadcast channels (ESPN, FOX News, CNN, MSNBC, TNT, truTV)',
                'Exclude sports (category 17) and news (category 25) videos from Gallery Wall',
                'Remove live broadcast content that may become unavailable',
                'Specifically targets mostPopular feed issues (Gallery Wall only)',
                'Music videos (Riser) and audio tracks (Small Stage) unaffected',
                'Prevents 404 thumbnail errors from restricted sports/news broadcasts'
            ],
            description: 'Enhanced YouTube Filtering - Geo-Restriction Fix for Gallery Wall'
        },
        '1.2.46': {
            date: '2026-03-19',
            requiresCacheClear: true,
            changes: [
                'FIX: Filter out restricted/deleted YouTube videos before display',
                'Videos without valid thumbnails now excluded from recommendations',
                'Prevents "YouTube Video" placeholder and 404 thumbnail errors',
                'Only shows videos with accessible metadata from YouTube API',
                'Improved content quality and reliability'
            ],
            description: 'Fix Broken YouTube Videos - Filter Restricted Content'
        },
        '1.2.45': {
            date: '2026-03-19',
            requiresCacheClear: true,
            changes: [
                'SECURITY: Added Vimeo proxy support via Cloudflare Worker',
                'Vimeo access token now hidden server-side (stored as Worker secret)',
                'Removed hardcoded Vimeo token from browserRecommendationsFetcher.js',
                'New Worker endpoint: /api/vimeo/staff-picks for secure Vimeo API access',
                'YouTube and Vimeo keys now fully secured - zero client exposure',
                'Fixed Worker URL: firsttaps.workers.dev (was tomdiamond111.workers.dev)',
                '.env.local no longer needed for YouTube/Vimeo keys'
            ],
            description: 'Vimeo Proxy Security + Zero API Key Exposure'
        },
        '1.2.44': {
            date: '2026-03-19',
            requiresCacheClear: true,
            changes: [
                'SECURITY: Removed YouTube API key entirely from client-side code',
                'Zero API key exposure - key only exists as encrypted Worker secret',
                'All YouTube requests route through Cloudflare Worker proxy',
                'No fallback key present - complete server-side protection',
                'API key cannot be extracted via browser DevTools or bundle inspection'
            ],
            description: 'Complete API Key Removal - Zero Client Exposure'
        },
        '1.2.43': {
            date: '2026-03-19',
            requiresCacheClear: true,
            changes: [
                'SECURITY FIX: YouTube API key now hidden via Cloudflare Worker proxy',
                'YouTube API calls now routed through Worker to prevent key exposure',
                'API key stored as Worker secret (environment variable), never sent to client',
                'Added 30-minute caching on Worker to reduce API quota usage',
                'No code changes needed for future API key rotations - just update Worker secret',
                'Worker endpoints: /api/youtube/shorts, /api/youtube/music-videos, /api/youtube/music-audio'
            ],
            description: 'Hide YouTube API Key via Cloudflare Worker Proxy'
        },
        '1.2.42': {
            date: '2026-03-19',
            requiresCacheClear: true,
            changes: [
                'CRITICAL FIX: Updated YouTube Data API v3 key (previous key expired)',
                'Previous API key error: "API key expired. Please renew the API key."',
                'New key resolves all YouTube API 400 errors on three endpoints:',
                '  - fetchYouTubeShorts() for Gallery Wall',
                '  - fetchYouTubeMusicVideos() for Riser',
                '  - fetchYouTubeMusicAudio() for Small Stage',
                'Fixes: Gallery Wall not filling 10/10 slots, Small Stage showing videos instead of audio'
            ],
            description: 'Update YouTube API Key - Fix Expired Key Issue'
        },
        '1.2.41': {
            date: '2026-03-18',
            requiresCacheClear: true,
            changes: [
                'FIXED: Small Stage now includes YouTube Music Audio (search endpoint with audio query)',
                'NEW: Bookshelf furniture type for favorite links (user-liked content)',
                'Small Stage: 10 YouTube Audio + 10 Spotify + 5 SoundCloud + 5 Deezer = 30 audio tracks',
                'Bookshelf: Mix of favorited content (placeholder until interaction tracking implemented)',
                'Mobile app ref: _fetchYouTubeMusicAudio() line 1019, getFavorites() in favorites_service.dart'
            ],
            description: 'Add YouTube Music Audio + Bookshelf Favorites'
        },
        '1.2.40': {
            date: '2026-03-18',
            requiresCacheClear: true,
            changes: [
                'ARCHITECTURAL FIX: Separate content sources per furniture type (matches mobile app)',
                'Gallery Wall: fetchYouTubeShorts() - any content, any duration',
                'Riser: fetchYouTubeMusicVideos() - videoCategoryId=10 (Music), >60sec only',
                'Small Stage: Audio only (Spotify/SoundCloud/Deezer), NO YouTube videos',
                'Each furniture type now has distinct, non-overlapping content',
                'Mobile app reference: recommendation_service.dart lines 85, 750, 1074'
            ],
            description: 'Match Mobile App Architecture - Separate Content Per Furniture Type'
        },
        '1.2.39': {
            date: '2026-03-18',
            requiresCacheClear: true,
            changes: [
                'EXACT mobile app match: Fetch 50 YouTube videos (maxResults=50)',
                'Custom distribution: 13 YouTube + 4 Dailymotion + 3 Vimeo + 1 Instagram + 1 TikTok',
                'Gallery Wall pool now 22 items for 10 slots (220% buffer for dislike filtering)',
                'More YouTube presence (59% of pool) per user preference',
                'Should fill all 10/10 slots consistently even with dislike filtering'
            ],
            description: 'Match Mobile App + Custom Distribution (13 YouTube, 1 TikTok, 1 Instagram)'
        },
        '1.2.38': {
            date: '2026-03-18',
            requiresCacheClear: true,
            changes: [
                'Fixed YouTube API by switching to videos endpoint with chart=mostPopular',
                'Matches mobile app reference implementation (recommendation_service.dart)',
                'Videos endpoint is more reliable than search endpoint (no parameter conflicts)',
                'Uses part=snippet,contentDetails,statistics for rich metadata',
                'Gallery Wall refresh now successfully fetches 12 fresh YouTube videos',
                'Ensures cache clear dialog appears for all users'
            ],
            description: 'YouTube API Fix - Videos Endpoint (Mobile App Parity) - Cache Clear Required'
        },
        '1.2.37': {
            date: '2026-03-18',
            requiresCacheClear: true,
            changes: [
                'Fixed YouTube API by switching to videos endpoint with chart=mostPopular',
                'Matches mobile app reference implementation (recommendation_service.dart)',
                'Videos endpoint is more reliable than search endpoint (no parameter conflicts)',
                'Uses part=snippet,contentDetails,statistics for rich metadata',
                'Gallery Wall refresh now successfully fetches 12 fresh YouTube videos',
                'Should fill all 10/10 slots consistently'
            ],
            description: 'YouTube API Fix - Videos Endpoint (Mobile App Parity)'
        },
        '1.2.36': {
            date: '2026-03-18',
            requiresCacheClear: true,
            changes: [
                'Fixed YouTube API 400 error: removed conflicting parameters (videoDuration, order, relevanceLanguage)',
                'YouTube search now uses simplified reliable parameters: query, type, maxResults, regionCode, safeSearch',
                'Ensures YouTube API returns 12 fresh videos instead of 0 (fixing 7/10 slot issue)',
                'Gallery Wall refresh now reliably fills all 10 slots with fresh content'
            ],
            description: 'YouTube API 400 Error Fix - Parameter Conflict Resolution'
        },
        '1.2.35': {
            date: '2026-03-18',
            requiresCacheClear: true,
            changes: [
                'Fixed YouTube API 400 error: switched from chart+videoCategoryId to search endpoint',
                'YouTube now uses search with music queries for reliable content discovery',
                'Fixed Dailymotion showing URL as title: now fetches actual title from API',
                'Dailymotion metadata now fetched directly from api.dailymotion.com during URL processing',
                'Both changes ensure 10/10 gallery wall slots filled with proper titles'
            ],
            description: 'YouTube API Fix + Dailymotion Title Fix'
        },
        '1.2.34': {
            date: '2026-03-18',
            requiresCacheClear: true,
            changes: [
                'Implemented YouTube Data API v3 integration for browser mode',
                'Gallery Wall refresh now fetches 12 fresh YouTube music videos from API',
                'Replaced static config fallback URLs with dynamic API pool-based fetching',
                'Added browser mode check to refreshAllFurniture() and refreshSingleFurniture()',
                'YouTube API uses mostPopular chart with Music category (videoCategoryId=10)',
                'Comprehensive logging shows API fetch status and video details'
            ],
            description: 'YouTube API Integration - Fresh Content on Refresh'
        },
        '1.2.33': {
            date: '2026-03-18',
            requiresCacheClear: true,
            changes: [
                'Fixed Score button not updating with correct points after tapping entities',
                'Fixed Scoreboard dialog not showing correct score and entity counts',
                'Removed duplicate sound playing when tapping entities (was causing "undefined points" console logs)',
                'Exposed entityUIManager globally for proper score synchronization',
                'Ensured immediate UI updates after entity clicks for responsive feedback'
            ],
            description: 'Entity Score Tracking & UI Update Fix'
        },
        '1.2.32': {
            date: '2026-03-18',
            requiresCacheClear: true,
            changes: [
                'Fixed nested dialog issue: Options menu now closes before opening subsequent dialogs',
                'World Switch dialog now works correctly and can be closed',
                'About & Instructions dialog now works correctly and can be closed',
                'Music Preferences dialog now works correctly and can be closed',
                'Privacy Policy dialog now works correctly and can be closed',
                'Fixed iframe pointer-events conflicts when showing dialogs from options menu'
            ],
            description: 'Options Menu Nested Dialog Fix - All Dialogs Now Fully Interactive'
        },
        '1.2.31': {
            date: '2026-03-18',
            requiresCacheClear: true,
            changes: [
                'Fixed non-tappable/closeable dialogs from options menu',
                'Converted Switch World dialog from AlertDialog to Dialog',
                'Converted Search Music/Videos dialog from AlertDialog to Dialog',
                'Converted Add URL dialog from AlertDialog to Dialog',
                'Converted Furniture Type Selector dialog from AlertDialog to Dialog',
                'Converted 2D List View dialog from AlertDialog to Dialog',
                'All dialogs now have proper close buttons and work correctly in web browser'
            ],
            description: 'Options Menu Dialog Fixes - All Dialogs Now Tappable/Closeable'
        },
        '1.2.30': {
            date: '2026-03-17',
            requiresCacheClear: true,
            changes: [
                'Added Cloudflare Workers KV paste service (primary share method)',
                'Removed rentry.co: Service now requires access codes for /raw endpoints (breaking change)',
                'Share service priority: Cloudflare Workers → paste.gg fallback',
                'Added cloudflare-worker/ directory with setup instructions',
                'Updated viewer to support ?cf= parameter for Cloudflare pastes',
                'Free tier: 100K reads/day, 1K writes/day, 1 GB storage, global CDN'
            ],
            description: 'Cloudflare Workers KV Integration + rentry.co Removal'
        },
        '1.2.29': {
            date: '2026-03-17',
            requiresCacheClear: true,
            changes: [
                'Fixed startup instructions dialog not closeable/tappable',
                'Centralized iframe pointer-events management for all dialogs',
                'Fixed welcome dialog, music preferences, and privacy policy dialogs'
            ],
            description: 'Instructions Dialog Fix'
        },
        '1.2.28': {
            date: '2026-03-17',
            requiresCacheClear: true,
            changes: [
                'Fixed Share Furniture service priority: rentry.co tries first (paste.gg times out after 30s)',
                'Added detailed rentry.co response logging to diagnose paste creation issues',
                'Improved error handling for malformed paste service responses'
            ],
            description: 'Share Furniture Service Priority Fix'
        },
        '1.2.27': {
            date: '2026-03-17',
            requiresCacheClear: true,
            changes: [
                'Fixed rentry.co: Changed upload format from FormData to URL-encoded (application/x-www-form-urlencoded)',
                'Removed dpaste.com: Service blocks app with HTTP 400 errors',
                'Improved paste service reliability: Now paste.gg → rentry.co fallback',
                'Added detailed logging for rentry API responses',
                'Added Google AdSense script for monetization'
            ],
            description: 'Share Furniture rentry.co Fix + dpaste Removal + AdSense Integration'
        },
        '1.2.26': {
            date: '2026-03-17',
            requiresCacheClear: true,
            changes: [
                'Multi-Service Fallback: paste.gg → dpaste.com → rentry.co',
                'Improved reliability: Automatically tries backup services if primary fails',
                'All services have 30-second timeouts with proper error handling'
            ],
            description: 'Share Furniture Multi-Service Fallback System'
        },
        '1.2.25': {
            date: '2026-03-17',
            requiresCacheClear: true,
            changes: [
                'Fixed Share Furniture upload timeout: Added 30-second timeout with AbortController',
                'Improved error handling: Shows "Upload timeout - please try again" instead of hanging',
                'Better error logging: Full error details now logged to console'
            ],
            description: 'Share Furniture Upload Timeout Fix'
        },
        '1.2.24': {
            date: '2026-03-17',
            requiresCacheClear: true,
            changes: [
                'Deployment verification: Cache clearing enabled',
                'Share Furniture with paste.gg fully operational',
                'Dailymotion API using correct parameters'
            ],
            description: 'Verification Build - Cache Clear Enabled'
        },
        '1.2.23': {
            date: '2026-03-17',
            requiresCacheClear: true,
            changes: [
                'Fixed Share Furniture: Switched from Hastebin to paste.gg (Hastebin now requires authentication)',
                'Fixed Dailymotion API: Changed to featured=1 instead of invalid duration_max and sort parameters',
                'Share links now use https://share.firsttaps.com/?pastegg=ID format',
                'Furniture viewer already supports paste.gg - no viewer changes needed'
            ],
            description: 'Share Furniture Fix: paste.gg + Dailymotion API Fix'
        },
        '1.2.22': {
            date: '2026-03-16',
            requiresCacheClear: true,
            changes: [
                'Implemented Share Furniture functionality - generates shareable links via Hastebin',
                'Updated viewer base URL to share.firsttaps.com',
                'Share dialog now shows clickable URL with "Open in New Tab" button',
                'Uploads compressed furniture data to Hastebin (no authentication required)',
                'Works with existing furniture viewer at share.firsttaps.com'
            ],
            description: 'Share Furniture with Hastebin Upload'
        },
        '1.2.21': {
            date: '2026-03-16',
            requiresCacheClear: true,
            changes: [
                'Fixed AdSense "No slot size for availableWidth=0" error',
                'Changed to explicit ad dimensions (728x90 desktop, 320x50 mobile)',
                'Added DOMContentLoaded check to ensure container has width before ad loads',
                'Improved AdSense error handling and debugging'
            ],
            description: 'AdSense Container Width Fix'
        },
        '1.2.20': {
            date: '2026-03-16',
            requiresCacheClear: true,
            changes: [
                'Fixed cache clear dialog to appear on FIRST page load instead of 2-3 refreshes',
                'Added inline version check script that forces immediate reload on version mismatch',
                'Build script now auto-updates EXPECTED_VERSION to match deployment version'
            ],
            description: 'First-Load Cache Clear Dialog Fix'
        },
        '1.2.19': {
            date: '2026-03-16',
            requiresCacheClear: true,
            changes: [
                'Added AdSense error handling and debugging console logs',
                'AdSense script now logs load success/failure for troubleshooting',
                'Disabled promotional entities (biplane, hot air balloon, bus) - no premium store in browser version',
                'Improved AdSense status monitoring to detect blank ads vs filled ads'
            ],
            description: 'AdSense Debugging & Promotional Entities Disabled'
        },
        '1.2.18': {
            date: '2026-03-16',
            requiresCacheClear: true,
            changes: [
                'Version bump for cache refresh'
            ],
            description: 'Cache Refresh'
        },
        '1.2.17': {
            date: '2026-03-13',
            requiresCacheClear: true,
            changes: [
                'Fixed options menu dialog - now responds to mouse clicks and taps',
                'Options menu can now be properly scrolled and closed',
                'Changed from showModalBottomSheet to Dialog with iframe pointer-events disabled'
            ],
            description: 'Options Menu Interaction Fix'
        },
        '1.2.16': {
            date: '2026-03-13',
            requiresCacheClear: true,
            changes: [
                'Fixed dislike filtering during furniture refresh - disliked videos no longer reappear',
                'Content now properly filtered by blocked channels/artists during refresh',
                'Enhanced Vimeo error handling with Flutter bridge fallback to bypass CORS issues',
                'Added YouTube metadata caching (videoMetadataCache) for filtering system',
                'Reduced Vimeo error spam in console with better caching of failed requests'
            ],
            description: 'Dislike Filter Fix & Enhanced Vimeo CORS Handling'
        },
        '1.2.15': {
            date: '2026-03-13',
            requiresCacheClear: true,
            changes: [
                'Fixed Vimeo metadata fetching - now handles 404s (private/deleted videos) and CORS errors gracefully',
                'Improved Vimeo thumbnail caching to avoid repeated failed requests',
                'Updated welcome instructions dialog with "Share Playlists (Furniture)" step',
                'Darkened instruction text color for better readability'
            ],
            description: 'Vimeo Error Handling & Instructions Updates'
        },
        '1.2.14': {
            date: '2026-03-13',
            requiresCacheClear: true,
            changes: [
                'Removed "Premium Content Store" and "Add Furniture" from options menu',
                'Fixed options menu close button to properly dismiss the menu',
                'Redesigned welcome instructions dialog with prominent navigation instructions',
                'Simplified Quick Start guide from 6 steps to 3 essential actions'
            ],
            description: 'Options Menu Cleanup & Instructions Dialog Redesign'
        },
        '1.2.13': {
            date: '2026-03-13',
            requiresCacheClear: true,
            changes: [
                'Fixed preference learning metadata extraction - now properly learning channel/artist patterns',
                'Added channelTitle, language, and tags extraction from link object metadata',
                'Disliked content will now be filtered by channel/artist name during furniture refresh'
            ],
            description: 'Preference Learning Metadata Fix'
        },
        '1.2.12': {
            date: '2026-03-12',
            requiresCacheClear: true,
            changes: [
                'Fixed preference learning integration - disliked content now properly filtered during furniture refresh',
                'Added pattern-based filtering (channels, artists, languages) to content recommendations',
                'Fixed Vimeo thumbnail extraction in media preview - uses existing metadata instead of placeholder'
            ],
            description: 'Preference Learning Integration & Vimeo Preview Fix'
        },
        '1.2.11': {
            date: '2026-03-12',
            requiresCacheClear: true,
            changes: [
                'Fixed like/dislike button positioning - aligned with Previous/Next buttons',
                'Fixed track titles to show actual metadata instead of generic "Link (platform)"',
                'YouTube tracks now display proper title from metadata',
                'Fixed object persistence - objects now restore from localStorage on reload'
            ],
            description: 'Media Preview UI Polish, Title Display & Persistence Fix'
        },
        '1.2.10': {
            date: '2026-03-12',
            requiresCacheClear: true,
            changes: [
                'Added track title and artist name display to media preview header',
                'Fixed like/dislike buttons not showing for non-playlist media',
                'Added extensive debugging for object restoration',
                'Improved cache detection logging in browserBridge'
            ],
            description: 'Media UI Polish & Persistence Debugging'
        },
        '1.2.9': {
            date: '2026-03-12',
            requiresCacheClear: true,
            changes: [
                'Fixed dialog persistence regression - instructions & music preferences now show on first install',
                'Fixed refresh button not hiding during furniture move mode',
                'Moved like/dislike buttons to same row as Previous/Next buttons in media controls',
                'Added extensive debugging for link object restoration debugging'
            ],
            description: 'UI Polish & Dialog Regression Fix'
        },
        '1.2.8': {
            date: '2026-03-12',
            requiresCacheClear: true,
            changes: [
                'Moved like/dislike buttons to bottom center of media preview',
                'Added visual feedback to like/dislike buttons (checkmark + scale animation)',
                'Fixed uncaught error when recording dislike feedback',
                'Created LinkObjectAddedChannel mock - objects created via refresh now persist',
                'Fixed instructions and music preferences dialogs showing on every reload'
            ],
            description: 'Media UI Improvements & Object Persistence Fix'
        },
        '1.2.7': {
            date: '2026-03-12',
            requiresCacheClear: true,
            changes: [
                'Added like/dislike thumb buttons to media preview screens',
                'Added Done button to exit furniture move/refresh mode',
                'Fixed refresh button positioning to not cover Home button',
                'Implemented object persistence in browser-only mode using localStorage',
                'Objects now persist their positions across browser reloads'
            ],
            description: 'UI Improvements & Browser-Only Object Persistence'
        },
        '1.2.6': {
            date: '2026-03-11',
            requiresCacheClear: true,
            changes: [
                'Demo content now persists across browser reloads',
                'Implemented localStorage-based metadata/thumbnail caching for all platforms',
                'Objects only change if user explicitly moves/deletes or refreshes furniture',
                'Modified demo objects retain user changes after reload'
            ],
            description: 'Demo Content Persistence & Metadata Caching'
        },
        '1.2.5': {
            date: '2026-03-11',
            requiresCacheClear: true,
            changes: [
                'Fixed duplicate instructions dialog appearing after music preferences',
                'Fixed non-dismissible second welcome dialog on first launch'
            ],
            description: 'Dialog Bug Fix'
        },
        '1.2.4': {
            date: '2026-03-11',
            requiresCacheClear: true,
            changes: [
                'Added like/dislike buttons to media preview screens',
                'Integrated content feedback with preference learning system',
                'Added ads.txt file for AdSense monetization',
                'Enhanced furniture slot auto-detection for manual drag',
                'Fixed furniture playlist updates when objects moved off slots'
            ],
            description: 'Media Feedback, AdSense Setup & Furniture Fixes'
        },
        '1.2.3': {
            date: '2026-03-11',
            requiresCacheClear: true,
            changes: [
                'Fixed JavaScript syntax error preventing app initialization',
                'Corrected typo in recommendationService.js (_log Debug → _logDebug)',
                'App now fully functional with recommendation system'
            ],
            description: 'Critical Fix: JavaScript Syntax Error'
        },
        '1.2.2': {
            date: '2026-03-10',
            requiresCacheClear: true,
            changes: [
                'Bundled recommendation services into core JavaScript bundle',
                'Fixed 404 errors for recommendation service files',
                'Added refreshRecommendations command to browser bridge',
                'Recommendation system now fully deployed and accessible'
            ],
            description: 'Critical Fix: Recommendation Services Deployment'
        },
        '1.2.1': {
            date: '2026-03-10',
            requiresCacheClear: true,
            changes: [
                'Fixed furniture refresh not using new recommendation API',
                'Gallery wall refresh now fetches live content from YouTube, Vimeo, etc.',
                'Critical bug fix - recommendation system now fully functional'
            ],
            description: 'Critical Fix: Furniture Refresh API Integration'
        },
        '1.2.0': {
            date: '2026-03-10',
            requiresCacheClear: true,
            changes: [
                'Integrated multi-platform content recommendation system',
                'Added API fetching for YouTube, Vimeo, Dailymotion, Spotify, Deezer',
                'Implemented user preference learning from dislike patterns',
                'Added smart caching with selective platform fetching',
                'Build-time API key injection for security'
            ],
            description: 'Major: Content Recommendation System with Live API Integration'
        },
        '1.1.3': {
            date: '2026-03-06',
            requiresCacheClear: false,
            changes: [
                'Fixed "Move to Home Area" - was using furniture ID instead of object ID'
            ],
            description: 'Critical bug fix for moving objects from furniture'
        },
        '1.1.2': {
            date: '2026-03-06',
            requiresCacheClear: false,
            changes: [
                'Fixed duplicate score button appearing momentarily',
                'Updated music preferences dialog with detailed furniture info',
                'Fixed "Move to Home Area" async handling for furniture objects',
                'Position persistence fully working (already implemented)'
            ],
            description: 'UX improvements and bug fixes'
        },
        '1.1.1': {
            date: '2026-03-06',
            requiresCacheClear: true,
            changes: [
                'Restored furniture persistence (localStorage)',
                'Restored object position & deletion persistence',
                'Fixed empty slot preservation (no duplicate demo content)',
                'Added Google AdSense banner'
            ],
            description: 'Major persistence fixes and AdSense integration'
        },
        '1.1.0': {
            date: '2026-03-06',
            requiresCacheClear: true,
            changes: [
                'Fixed Dailymotion thumbnails on object faces',
                'Removed duplicate score button',
                'Added update notification system'
            ],
            description: 'UI improvements and thumbnail fixes'
        },
        '1.0.2': {
            date: '2026-03-05',
            requiresCacheClear: true,
            changes: [
                'Added Dailymotion API integration',
                'Fixed Amphitheatre content (15 short videos)',
                'Improved content distribution'
            ],
            description: 'Content API integration'
        }
    };

    class VersionManager {
        constructor() {
            this.currentVersion = CURRENT_APP_VERSION;
            this.storedVersion = this.getStoredVersion();
            console.log(`🔖 Version Manager initialized - Current: ${this.currentVersion}, Stored: ${this.storedVersion || 'none'}`);
        }

        /**
         * Get the stored version from localStorage
         */
        getStoredVersion() {
            try {
                return localStorage.getItem(VERSION_KEY) || null;
            } catch (error) {
                console.error('Error reading stored version:', error);
                return null;
            }
        }

        /**
         * Store the current version in localStorage
         */
        setStoredVersion(version) {
            try {
                localStorage.setItem(VERSION_KEY, version);
                console.log(`✅ Version stored: ${version}`);
            } catch (error) {
                console.error('Error storing version:', error);
            }
        }

        /**
         * Check if an update is available
         */
        isUpdateAvailable() {
            if (!this.storedVersion) {
                // First install
                return false;
            }
            return this.storedVersion !== this.currentVersion;
        }

        /**
         * Check if the update requires cache clear
         */
        requiresCacheClear() {
            const changelog = VERSION_CHANGELOG[this.currentVersion];
            return changelog && changelog.requiresCacheClear;
        }

        /**
         * Get update information
         */
        getUpdateInfo() {
            const changelog = VERSION_CHANGELOG[this.currentVersion];
            return {
                currentVersion: this.currentVersion,
                storedVersion: this.storedVersion,
                isUpdateAvailable: this.isUpdateAvailable(),
                requiresCacheClear: this.requiresCacheClear(),
                changelog: changelog || null
            };
        }

        /**
         * Check if we should show update notification
         */
        shouldShowUpdateNotification() {
            if (!this.isUpdateAvailable()) {
                return false;
            }

            // Check if we've already shown notification for this version
            const lastNotification = localStorage.getItem(LAST_UPDATE_NOTIFICATION_KEY);
            if (lastNotification === this.currentVersion) {
                return false;
            }

            return this.requiresCacheClear();
        }

        /**
         * Mark update notification as shown
         */
        markUpdateNotificationShown() {
            try {
                localStorage.setItem(LAST_UPDATE_NOTIFICATION_KEY, this.currentVersion);
            } catch (error) {
                console.error('Error marking notification as shown:', error);
            }
        }

        /**
         * Show update notification to user
         */
        showUpdateNotification() {
            const info = this.getUpdateInfo();
            
            if (!info.isUpdateAvailable || !info.requiresCacheClear) {
                return;
            }

            const changes = info.changelog?.changes || [];
            const changesText = changes.map(c => `  • ${c}`).join('\n');

            // Create notification element
            const notification = document.createElement('div');
            notification.id = 'update-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #fff3cd;
                border: 2px solid #ffc107;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 10000;
                max-width: 400px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            `;

            notification.innerHTML = `
                <div style="display: flex; align-items: start; margin-bottom: 15px;">
                    <span style="font-size: 24px; margin-right: 10px;">🔔</span>
                    <div>
                        <strong style="font-size: 16px; color: #856404;">Update Available!</strong>
                        <p style="margin: 5px 0; color: #856404; font-size: 14px;">
                            Version ${info.currentVersion} requires clearing cached data for best performance.
                        </p>
                    </div>
                </div>
                <div style="margin-bottom: 15px; font-size: 13px; color: #856404;">
                    <strong>What's new:</strong><br>
                    ${changesText.replace(/\n/g, '<br>')}
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="update-clear-cache-btn" style="
                        background: #ffc107;
                        color: #856404;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                    ">Clear Cache & Reload</button>
                    <button id="update-dismiss-btn" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Dismiss</button>
                </div>
            `;

            document.body.appendChild(notification);

            // Add event listeners
            document.getElementById('update-clear-cache-btn').addEventListener('click', async () => {
                await this.clearCacheAndReload();
            });

            document.getElementById('update-dismiss-btn').addEventListener('click', () => {
                // Show confirmation before dismissing
                const confirmDismiss = confirm(
                    'Are you sure you want to dismiss this update?\n\n' +
                    'If you dismiss, the app may not function correctly until you clear the cache manually.\n\n' +
                    'It is strongly recommended to clear the cache now.'
                );
                
                if (confirmDismiss) {
                    notification.remove();
                    this.markUpdateNotificationShown();
                    console.log('⚠️ User dismissed update notification');
                }
            });

            this.markUpdateNotificationShown();
            console.log('📢 Update notification shown to user');
        }

        /**
         * Clear cache and reload directly
         */
        async clearCacheAndReload() {
            console.log('🔄 Clearing cache and reloading...');
            
            try {
                // Clear service workers
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                    }
                    console.log('✅ Service workers cleared');
                }
                
                // Clear all caches
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    console.log('✅ All caches cleared');
                }
                
                // Clear localStorage (but preserve version info temporarily)
                const updateInfo = {
                    version: this.currentVersion,
                    clearedAt: Date.now()
                };
                localStorage.clear();
                localStorage.setItem(VERSION_KEY, this.currentVersion);
                localStorage.setItem('mv3d_cache_cleared', JSON.stringify(updateInfo));
                console.log('✅ localStorage cleared');
                
                // Reload with cache-busting
                window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
            } catch (error) {
                console.error('❌ Error clearing cache:', error);
                alert('Error clearing cache. Please try the manual clear tool at: ' + 
                      window.location.origin + '/debug-storage.html');
            }
        }

        /**
         * Update the stored version (call after successful update)
         */
        updateStoredVersion() {
            this.setStoredVersion(this.currentVersion);
            this.storedVersion = this.currentVersion;
            console.log(`✅ Version updated to ${this.currentVersion}`);
        }

        /**
         * Initialize version checking - blocks app if update required
         */
        initialize() {
            console.log('🔖 Initializing version check...');
            
            // If this is first install, just store the version
            if (!this.storedVersion) {
                console.log('🆕 First install detected - storing current version');
                this.setStoredVersion(this.currentVersion);
                return false; // No blocking needed
            }

            // Check for updates
            if (this.shouldShowUpdateNotification()) {
                console.log('📢 Update notification should be shown - BLOCKING APP LOAD');
                // Show notification immediately and block app loading
                this.showUpdateNotification();
                return true; // Block app loading
            } else if (this.isUpdateAvailable() && !this.requiresCacheClear()) {
                // Silent update - just update the stored version
                console.log('✅ Silent update - no cache clear required');
                this.updateStoredVersion();
                return false; // No blocking needed
            }
            
            return false; // No blocking needed
        }
    }

    // Create global instance
    window.versionManager = new VersionManager();
    
    // Global flag to indicate if app should be blocked
    window.appLoadBlocked = false;
    
    // Auto-initialize and check if we should block app loading
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.appLoadBlocked = window.versionManager.initialize();
            console.log('🔒 App load blocked:', window.appLoadBlocked);
            
            // Dispatch event to notify other scripts
            if (window.appLoadBlocked) {
                window.dispatchEvent(new CustomEvent('versionCheckBlocked'));
            } else {
                window.dispatchEvent(new CustomEvent('versionCheckPassed'));
            }
        });
    } else {
        window.appLoadBlocked = window.versionManager.initialize();
        console.log('🔒 App load blocked:', window.appLoadBlocked);
        
        // Dispatch event to notify other scripts
        if (window.appLoadBlocked) {
            window.dispatchEvent(new CustomEvent('versionCheckBlocked'));
        } else {
            window.dispatchEvent(new CustomEvent('versionCheckPassed'));
        }
    }

    console.log('🔖 Version Manager loaded');
})();
