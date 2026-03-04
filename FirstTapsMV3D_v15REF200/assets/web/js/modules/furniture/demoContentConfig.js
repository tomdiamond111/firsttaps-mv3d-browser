/**
 * ═══════════════════════════════════════════════════════════════════
 * DEMO CONTENT CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════
 * 
 * EASILY EDIT DEMO PLAYLISTS HERE
 * Just paste YouTube/Spotify/TikTok/Instagram links and local file names
 * 
 * FORMAT:
 * - For YouTube: Full YouTube URL or video ID (e.g., 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * - For Spotify: Spotify track URL (e.g., 'https://open.spotify.com/track/xxxxx')
 * - For demo files: Use 'assets/demomedia/filename.mp3' (matches FileModel.path from Dart)
 * - For TikTok: Full TikTok URL (e.g., 'https://www.tiktok.com/@user/video/123456')
 * - For Instagram: Full Instagram Reel URL (e.g., 'https://www.instagram.com/reel/ABC123/')
 * 
 * INSTRUCTIONS TO CHANGE DEMO CONTENT:
 * 1. Find the playlist section you want to edit below
 * 2. Replace the links array with your own URLs or local files
 * 3. Maximum 10 items per playlist
 * 4. Save this file
 * 5. Rebuild JavaScript bundle: .\build_modular_fixed.ps1 -Production
 * 6. To reset demo: localStorage.removeItem('mv3d_default_furniture_created') in console
 */

(function() {
    'use strict';

    console.log('🎵 Loading Demo Content Configuration...');

    // ═══════════════════════════════════════════════════════════════════
    // HARDCODED CONTENT (For platforms WITHOUT API access)
    // ═══════════════════════════════════════════════════════════════════
    // These links will be MERGED with API content (YouTube from Dart)
    // UPDATE THESE REGULARLY with fresh trending content!
    // ═══════════════════════════════════════════════════════════════════

    const DEMO_PLAYLISTS = {
        // ═════════════════════════════════════════════════════════════
        // GALLERY WALL - Video mix (API + GitHub remote config)
        // Target: YouTube (from API), Dailymotion (from API), TikTok (from GitHub remote config), Instagram (from GitHub remote config), Vimeo (from GitHub remote config)
        // TOTAL MIX: All content from API (YouTube + Dailymotion) + GitHub remote config (TikTok/Instagram/Vimeo)
        // ═════════════════════════════════════════════════════════════
        topHitsMix: {
            furnitureType: 'gallery_wall',
            title: 'Top Hits Mix',
            links: [
                // 🔄 ALL manually curated content (TikTok, Instagram, Vimeo) comes from GitHub remote config
                // See recommendation_service.dart for remote config + Dart fallbacks
                // API provides dynamic YouTube + Dailymotion videos
            ]
        },

        // ═════════════════════════════════════════════════════════════
        // RISER - Music video content (API + Vimeo hardcoded)
        // YouTube and Dailymotion music videos from API - add Vimeo here
        // ═════════════════════════════════════════════════════════════
        chillVibes: {
            furnitureType: 'riser',
            title: 'Music Videos',
            links: [
                // 🔄 UPDATE THESE VIMEO LINKS REGULARLY (YouTube + Dailymotion come from API)
                'https://vimeo.com/336892869',                                    // Vimeo 1 (Rick Astley - verified working)
                'https://vimeo.com/1154762165',                                   // Vimeo 2
                'https://vimeo.com/6973286',                                      // Vimeo 3
                'https://vimeo.com/6980166',                                      // Vimeo 4
                'https://vimeo.com/74211781',                                     // Vimeo 5
                'https://vimeo.com/221721058',                                    // Vimeo 6
                'https://vimeo.com/119637514',                                    // Vimeo 7 (My Dear by Charlie Hustle)
                'https://vimeo.com/45569479',                                     // Vimeo 8 (Willow - Sweater)
                'https://vimeo.com/247467951',                                    // Vimeo 9
                'https://vimeo.com/148445630',                                    // Vimeo 10
                'https://vimeo.com/148751763',                                    // Vimeo 11
                'https://vimeo.com/173733156',                                    // Vimeo 12
                'https://vimeo.com/125879689',                                    // Vimeo 13
                'https://vimeo.com/188092373',                                    // Vimeo 14
                'https://vimeo.com/190062231',                                    // Vimeo 15
            ]
        },

        // ═════════════════════════════════════════════════════════════
        // SMALL STAGE - Music audio from API + SoundCloud fallback (13 slots: 1 featured + 12 back)
        // PLATFORMS: Spotify, Deezer, YouTube Music (API), SoundCloud (hardcoded fallback)
        // ═════════════════════════════════════════════════════════════
        shortsAndReels: {
            furnitureType: 'stage_small',
            title: 'Music Tracks',
            links: [
                // 🔄 SoundCloud fallback tracks (merged with API content from Spotify + Deezer + YouTube Music)
                'https://soundcloud.com/shaboozey/shaboozey-a-bar-song-tipsy',
                'https://soundcloud.com/billieeilish/birds-of-a-feather',
                'https://soundcloud.com/teddyswims/lose-control',
                'https://soundcloud.com/sabrinacarpenter/sabrina-carpenter-espresso',
                'https://soundcloud.com/bensonboone/beautiful-things',
                'https://soundcloud.com/hozier/too-sweet',
                'https://soundcloud.com/morgan-wallen/im-the-problem',
                'https://soundcloud.com/mylessmithuk/stargazing',
                'https://soundcloud.com/lolayoung-music/messy',
                'https://soundcloud.com/epilogtik/afrohouse-mix-best-of-series-008',
                'https://soundcloud.com/epilogtik/best-of-january-2026-live-dj-set-by-epilogtik-004',
                'https://soundcloud.com/peteris-cekonovs-38/deep-land-auriga-set-098',
                'https://soundcloud.com/itsproppa/liveatmbird',
            ]
        },

        // ═════════════════════════════════════════════════════════════
        // BOOKSHELF - Empty initially, fills with user favorites from all platforms
        // Mix of API + hardcoded content for user favorites
        // ═════════════════════════════════════════════════════════════
        userFavorites: {
            furnitureType: 'bookshelf',
            title: 'User Favorites',
            links: [
                // Initially empty - fills with user's favorite content over time
                // Can include: YouTube, Vimeo, TikTok, Instagram, Dailymotion, Spotify, Deezer
            ]
        },

        // ═════════════════════════════════════════════════════════════
        // AMPHITHEATRE - Mixed content from all platforms (LIMITED TO 15 FOR PERFORMANCE)
        // Variety mix: videos, music, shorts from all sources
        // ═════════════════════════════════════════════════════════════
        mixedContent: {
            furnitureType: 'amphitheatre',
            title: 'Mixed Trending',
            links: [
                // 🔄 UPDATE THESE MIXED PLATFORM LINKS REGULARLY (YouTube + Dailymotion come from API)
                // Limited to ~15 total for performance on weaker tablets
                'https://vimeo.com/336892869',                                    // Vimeo
                'https://www.tiktok.com/@ifkf137/video/7594422601221426462',     // TikTok
                'https://www.instagram.com/reel/CdIxYYqgXYZ/',                    // Instagram
                'https://open.spotify.com/track/7tICCrK3CcyRFKza7yrR0z',         // Spotify
                'https://vimeo.com/1154762165',                                   // Vimeo 2
                'https://soundcloud.com/sabrinacarpenter/sabrina-carpenter-espresso', // SoundCloud
                // API will add ~8-10 more from YouTube + Dailymotion to reach ~15 total
            ]
        }
    };

    // ============================================================================
    // EXPORT
    // ============================================================================
    
    window.DEMO_PLAYLISTS = DEMO_PLAYLISTS;
    
    console.log('✅ Demo Content Configuration loaded');
    console.log('📋 Configured playlists:', Object.keys(DEMO_PLAYLISTS));
})();
