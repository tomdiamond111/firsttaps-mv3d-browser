/**
 * GENRE PARSER
 * Parses genre tags from content URLs in remote config
 * Format: "P:https://..." or "C:https://..." etc.
 */

(function() {
    'use strict';

    class GenreParser {
        constructor() {
            // Genre code mappings
            this.genreCodes = {
                'P': 'pop',
                'C': 'country',
                'R': 'rock',
                'RH': 'hip_hop',
                'RB': 'r_and_b',
                'E': 'electronic',
                'J': 'jazz',
                'CL': 'classical',
                'L': 'latin',
                'RE': 'reggae',
                'I': 'indie'
            };

            // Reverse mapping for quick lookup
            this.genreNames = {};
            for (const [code, name] of Object.entries(this.genreCodes)) {
                this.genreNames[name] = code;
            }
        }

        /**
         * Parse a single URL string that may have a genre prefix
         * @param {string} urlString - Format: "P:https://..." or "https://..."
         * @returns {Object} - {genre: 'pop', url: 'https://...'}
         */
        parseUrl(urlString) {
            if (!urlString || typeof urlString !== 'string') {
                return { genre: null, url: null };
            }

            // Check if URL has genre prefix (e.g., "P:" or "RH:")
            const colonIndex = urlString.indexOf(':');
            
            // If no colon, or colon is part of http://, no genre tag
            if (colonIndex === -1 || urlString.startsWith('http')) {
                return {
                    genre: null,
                    url: urlString.trim()
                };
            }

            // Extract potential genre code before colon
            const potentialCode = urlString.substring(0, colonIndex).trim().toUpperCase();
            
            // Check if it's a valid genre code
            if (this.genreCodes[potentialCode]) {
                const genre = this.genreCodes[potentialCode];
                const url = urlString.substring(colonIndex + 1).trim();
                
                return { genre, url };
            }

            // Not a recognized genre code, treat whole string as URL
            return {
                genre: null,
                url: urlString.trim()
            };
        }

        /**
         * Parse an array of URL strings
         * @param {Array<string>} urlStrings - Array of URLs with optional genre prefixes
         * @returns {Array<Object>} - Array of {genre, url} objects
         */
        parseUrls(urlStrings) {
            if (!Array.isArray(urlStrings)) {
                console.warn('⚠️ GenreParser.parseUrls: Expected array, got:', typeof urlStrings);
                return [];
            }

            return urlStrings
                .map(urlString => this.parseUrl(urlString))
                .filter(parsed => parsed.url !== null); // Filter out invalid entries
        }

        /**
         * Filter parsed URLs by selected genres
         * @param {Array<Object>} parsedUrls - Array of {genre, url} objects
         * @param {Array<string>} selectedGenres - Array of genre names (e.g., ['pop', 'rock'])
         * @returns {Array<Object>} - Filtered array
         */
        filterByGenres(parsedUrls, selectedGenres) {
            if (!Array.isArray(parsedUrls) || !Array.isArray(selectedGenres)) {
                console.warn('⚠️ GenreParser.filterByGenres: Invalid input');
                return parsedUrls || [];
            }

            // If no genres selected, return all
            if (selectedGenres.length === 0) {
                console.log('📊 No genres selected, returning all URLs');
                return parsedUrls;
            }

            // Filter by selected genres, keeping URLs without genre tags
            const filtered = parsedUrls.filter(item => {
                // Keep items without genre tag (null genre)
                if (!item.genre) return true;
                
                // Keep items matching selected genres
                return selectedGenres.includes(item.genre);
            });

            console.log(`📊 Genre filtering: ${parsedUrls.length} → ${filtered.length} URLs (genres: ${selectedGenres.join(', ')})`);
            
            return filtered;
        }

        /**
         * Extract just the URLs from parsed objects
         * @param {Array<Object>} parsedUrls - Array of {genre, url} objects
         * @returns {Array<string>} - Array of URL strings
         */
        extractUrls(parsedUrls) {
            if (!Array.isArray(parsedUrls)) return [];
            return parsedUrls.map(item => item.url).filter(url => url);
        }

        /**
         * Parse, filter, and extract URLs in one call
         * @param {Array<string>} urlStrings - Raw URL strings from config
         * @param {Array<string>} selectedGenres - User's selected genres
         * @returns {Array<string>} - Filtered URL strings
         */
        parseAndFilter(urlStrings, selectedGenres) {
            const parsed = this.parseUrls(urlStrings);
            const filtered = this.filterByGenres(parsed, selectedGenres);
            return this.extractUrls(filtered);
        }

        /**
         * Get distribution of genres in a URL list
         * @param {Array<string>} urlStrings - Raw URL strings
         * @returns {Object} - Genre counts {pop: 5, rock: 3, ...}
         */
        analyzeGenres(urlStrings) {
            const parsed = this.parseUrls(urlStrings);
            const distribution = {};

            parsed.forEach(item => {
                const genre = item.genre || 'untagged';
                distribution[genre] = (distribution[genre] || 0) + 1;
            });

            return distribution;
        }
    }

    // Export for module systems and global access
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GenreParser;
    }

    // Create global instance
    window.GenreParser = GenreParser;
    window.genreParser = new GenreParser();

    console.log('✅ GenreParser module loaded');

})();
