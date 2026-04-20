/**
 * PLATFORM URL HANDLER
 * Handles opening media URLs with platform-specific app schemes when available
 */

(function() {
    'use strict';

    console.log('🔗 Loading Platform URL Handler...');

    class PlatformURLHandler {
        /**
         * Open a URL with platform-specific handling
         * @param {string} url - The URL to open
         * @param {string} platform - The platform type (youtube, spotify, etc.)
         * @returns {boolean} Whether the URL was opened
         */
        static open(url, platform) {
            if (!url) {
                console.warn('🔗 No URL provided to open');
                return false;
            }

            console.log(`🔗 Opening ${platform} URL: ${url}`);

            // Platform-specific URL schemes (mobile apps will intercept these in browser)
            const platformSchemes = {
                'youtube': (url) => this._handleYouTube(url),
                'spotify': (url) => this._handleSpotify(url),
                'tiktok': (url) => this._handleTikTok(url),
                'instagram': (url) => this._handleInstagram(url),
                'vimeo': (url) => this._handleVimeo(url)
            };

            // Try app scheme first (for mobile browsers)
            if (platformSchemes[platform.toLowerCase()]) {
                platformSchemes[platform.toLowerCase()](url);
            } else {
                // Generic handling - just open the URL
                window.open(url, '_blank');
            }

            return true;
        }

        /**
         * Handle YouTube URLs
         * @private
         */
        static _handleYouTube(url) {
            const videoId = this.extractYouTubeId(url);
            
            if (videoId && this._isMobile()) {
                // Try YouTube app scheme on mobile
                const appUrl = `vnd.youtube://${videoId}`;
                const appWindow = window.open(appUrl, '_blank');
                
                // Fallback to web URL after 1 second if app didn't open
                setTimeout(() => {
                    if (appWindow) {
                        appWindow.close();
                    }
                    window.open(url, '_blank');
                }, 1000);
            } else {
                // Desktop or no video ID - use web URL
                window.open(url, '_blank');
            }
        }

        /**
         * Handle Spotify URLs
         * @private
         */
        static _handleSpotify(url) {
            if (this._isMobile()) {
                // Try Spotify app scheme
                const appUrl = url.replace('https://open.spotify.com', 'spotify:');
                const appWindow = window.open(appUrl, '_blank');
                
                // Fallback to web URL
                setTimeout(() => {
                    if (appWindow) {
                        appWindow.close();
                    }
                    window.open(url, '_blank');
                }, 1000);
            } else {
                // Desktop - use web URL
                window.open(url, '_blank');
            }
        }

        /**
         * Handle TikTok URLs
         * @private
         */
        static _handleTikTok(url) {
            // TikTok app handles http links directly
            window.open(url, '_blank');
        }

        /**
         * Handle Instagram URLs
         * @private
         */
        static _handleInstagram(url) {
            if (this._isMobile()) {
                // Try Instagram app scheme
                const appUrl = url.replace('https://www.instagram.com', 'instagram://');
                const appWindow = window.open(appUrl, '_blank');
                
                // Fallback to web URL
                setTimeout(() => {
                    if (appWindow) {
                        appWindow.close();
                    }
                    window.open(url, '_blank');
                }, 1000);
            } else {
                // Desktop - use web URL
                window.open(url, '_blank');
            }
        }

        /**
         * Handle Vimeo URLs
         * @private
         */
        static _handleVimeo(url) {
            // Vimeo doesn't have widespread app scheme support
            window.open(url, '_blank');
        }

        /**
         * Extract YouTube video ID from various URL formats
         * @param {string} url - YouTube URL
         * @returns {string|null} Video ID or null
         */
        static extractYouTubeId(url) {
            if (!url) return null;
            
            // Handle various YouTube URL formats
            const patterns = [
                /(?:youtube\.com\/watch\?v=)([^&\?]+)/,
                /(?:youtu\.be\/)([^&\?]+)/,
                /(?:youtube\.com\/embed\/)([^&\?]+)/,
                /(?:youtube\.com\/v\/)([^&\?]+)/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    return match[1];
                }
            }
            
            return null;
        }

        /**
         * Check if running on mobile device
         * @private
         */
        static _isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }

        /**
         * Get platform-specific color for UI elements
         * @param {string} platform - Platform name
         * @returns {string} Hex color code
         */
        static getPlatformColor(platform) {
            const colors = {
                'youtube': '#FF0000',
                'spotify': '#1DB954',
                'vimeo': '#1AB7EA',
                'tiktok': '#000000',
                'instagram': '#E1306C',
                'soundcloud': '#FF5500',
                'apple-music': '#FA243C'
            };
            
            return colors[platform.toLowerCase()] || '#666666';
        }

        /**
         * Get platform display name
         * @param {string} platform - Platform identifier
         * @returns {string} Display name
         */
        static getPlatformDisplayName(platform) {
            const names = {
                'youtube': 'YouTube',
                'spotify': 'Spotify',
                'vimeo': 'Vimeo',
                'tiktok': 'TikTok',
                'instagram': 'Instagram',
                'soundcloud': 'SoundCloud',
                'apple-music': 'Apple Music'
            };
            
            return names[platform.toLowerCase()] || platform;
        }
    }

    // Export to window
    window.PlatformURLHandler = PlatformURLHandler;
    console.log('🔗 Platform URL Handler loaded');

})();
