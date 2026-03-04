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
 * - For local files: Use 'local:filename.mp3' format (files from assets/demomedia/)
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

    const DEMO_PLAYLISTS = {
        // ═════════════════════════════════════════════════════════════
        // PLAYLIST 1: "Top Hits Mix" - Gallery Wall (center, 15 slots but max 10 objects)
        // FOCAL POINT - First thing user sees when app opens
        // Mix of YouTube videos, Spotify tracks, and local file
        // ═════════════════════════════════════════════════════════════
        topHitsMix: {
            furnitureType: 'gallery_wall',
            title: 'Top Hits Mix',
            links: [
                // EDIT THESE LINKS - Max 10 items
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ',                    // YouTube example 1
                'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp',         // Spotify example 1
                'local:cuttyranks_livingcondition.mp4',                          // Local video file
                'https://www.youtube.com/watch?v=9bZkp7q19f0',                    // YouTube example 2
                'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',         // Spotify example 2
                'https://www.youtube.com/watch?v=kJQP7kiw5Fk',                    // YouTube example 3
                'https://open.spotify.com/track/0yc6Gst2xkRu0eMLeRMGCX',         // Spotify: Flowers by Miley Cyrus
                'https://www.youtube.com/watch?v=OPf0YbXqDm0',                    // YouTube example 4
            ]
        },

        // ═════════════════════════════════════════════════════════════
        // PLAYLIST 2: "Chill Vibes" - Left Choir Riser (15 slots total)
        // Classical music and relaxing content
        // YouTube videos + local MP3 files
        // ═════════════════════════════════════════════════════════════
        chillVibes: {
            furnitureType: 'riser',
            title: 'Chill Vibes',
            links: [
                // EDIT THESE LINKS - Max 15 items
                'local:Bach Prelude BWV933 piano.mp3',                           // Local Bach MP3
                'local:Diamond Bach BWV937 Full rubbermetal good.mp3',           // Local Bach MP3
                'local:Diamond_Schubert_German Dance D643.mp3',                  // Local Schubert MP3
                'https://www.youtube.com/watch?v=jgpJVI3tDbY',                    // Relaxing YouTube 1
                'https://www.youtube.com/watch?v=vCadcBR95oU',                    // Relaxing YouTube 2
                'https://www.youtube.com/watch?v=5qap5aO4i9A',                    // Relaxing YouTube 3
            ]
        },

        // ═════════════════════════════════════════════════════════════
        // PLAYLIST 3: "Music Tracks" - Small Stage (13 slots: 1 featured + 12 back)
        // Audio content from Spotify, Deezer, YouTube Music, SoundCloud
        // API-driven with SoundCloud fallback
        // ═════════════════════════════════════════════════════════════
        shortsAndReels: {
            furnitureType: 'stage_small',
            title: 'Music Tracks',
            links: [
                // 🔄 SoundCloud fallback tracks (merged with API content)
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
