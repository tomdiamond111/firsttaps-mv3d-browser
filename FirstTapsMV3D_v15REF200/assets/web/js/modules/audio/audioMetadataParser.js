// modules/audio/audioMetadataParser.js
// Dependencies: None (standalone utility)
// Exports: window.AudioMetadataParser

(function() {
    'use strict';
    
    console.log("Loading AudioMetadataParser module...");
    
    /**
     * AudioMetadataParser - Extracts song and artist information from audio filenames
     * Handles common naming patterns and provides fallback strategies
     */
    class AudioMetadataParser {
        
        /**
         * Parse audio filename to extract song title and artist
         * @param {string} filename - The audio filename (e.g., "Artist - Song.mp3")
         * @returns {Object} - { artist: string, title: string, displayText: string }
         */
        parseAudioFilename(filename) {
            if (!filename) {
                return {
                    artist: null,
                    title: 'Unknown',
                    displayText: 'Unknown',
                    fallbackName: 'UNKNOWN'
                };
            }
            
            // Remove file extension
            let cleanName = filename.replace(/\.(mp3|wav|flac|aac|ogg|wma|m4a)$/i, '');
            
            console.log(`🎵 Parsing audio filename: "${filename}" → "${cleanName}"`);
            
            // Pattern 1: "Artist - Song Title" (most common)
            if (cleanName.includes(' - ')) {
                const parts = cleanName.split(' - ');
                if (parts.length >= 2) {
                    const artist = this.cleanText(parts[0]);
                    const title = this.cleanText(parts.slice(1).join(' - ')); // Handle multiple dashes
                    
                    console.log(`✅ Parsed as Artist-Title: "${artist}" - "${title}"`);
                    return {
                        artist: artist,
                        title: title,
                        displayText: this.createDisplayText(artist, title),
                        fallbackName: cleanName
                    };
                }
            }
            
            // Pattern 2: "Artist_Song" or "Artist Song"
            const underscorePattern = cleanName.replace(/_/g, ' ');
            const words = underscorePattern.split(' ').filter(word => word.length > 0);
            
            if (words.length >= 2) {
                // Try to detect common artist indicators
                const artistIndicators = ['feat', 'ft', 'featuring', 'vs', 'vs.', 'x', '&'];
                let artistEndIndex = -1;
                
                for (let i = 0; i < words.length - 1; i++) {
                    if (artistIndicators.includes(words[i].toLowerCase())) {
                        artistEndIndex = i;
                        break;
                    }
                }
                
                if (artistEndIndex > 0) {
                    const artist = this.cleanText(words.slice(0, artistEndIndex).join(' '));
                    const title = this.cleanText(words.slice(artistEndIndex + 1).join(' '));
                    
                    console.log(`✅ Parsed with indicator: "${artist}" - "${title}"`);
                    return {
                        artist: artist,
                        title: title,
                        displayText: this.createDisplayText(artist, title),
                        fallbackName: cleanName
                    };
                }
                
                // Simple split: first word(s) as artist, rest as title
                if (words.length >= 3) {
                    const artist = this.cleanText(words.slice(0, 2).join(' ')); // First 2 words as artist
                    const title = this.cleanText(words.slice(2).join(' '));
                    
                    console.log(`✅ Parsed as multi-word: "${artist}" - "${title}"`);
                    return {
                        artist: artist,
                        title: title,
                        displayText: this.createDisplayText(artist, title),
                        fallbackName: cleanName
                    };
                }
            }
            
            // Pattern 3: Single word or fallback - use as title only
            const fallbackTitle = this.cleanText(cleanName);
            const truncatedTitle = this.truncateText(fallbackTitle, 8);
            
            console.log(`⚠️ No artist detected, using as title: "${truncatedTitle}"`);
            return {
                artist: null,
                title: truncatedTitle,
                displayText: truncatedTitle,
                fallbackName: cleanName // Store original for fallback display
            };
        }
        
        /**
         * Clean text by removing unwanted characters and normalizing
         * @param {string} text - Text to clean
         * @returns {string} - Cleaned text
         */
        cleanText(text) {
            if (!text) return '';
            
            let cleaned = text;
            
            // Remove common prefixes/suffixes
            cleaned = cleaned.replace(/^\d+[\s\-\.]*/, ''); // Remove track numbers
            cleaned = cleaned.replace(/\s*\(.*\)$/, ''); // Remove parentheses content
            cleaned = cleaned.replace(/\s*\[.*\]$/, ''); // Remove bracket content
            cleaned = cleaned.replace(/\s*-\s*\d{4}$/, ''); // Remove year suffix
            
            // Normalize spaces and trim
            cleaned = cleaned.trim().replace(/\s+/g, ' ');
            
            // Capitalize first letter of each word
            cleaned = cleaned.replace(/\b\w+/g, word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            );
            
            return cleaned || 'Unknown';
        }
        
        /**
         * Truncate text to specified length without "..." suffix
         * @param {string} text - Text to truncate
         * @param {number} maxLength - Maximum length
         * @returns {string} - Truncated text
         */
        truncateText(text, maxLength) {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength);
        }
        
        /**
         * Create display text for face texture
         * @param {string} artist - Artist name
         * @param {string} title - Song title
         * @returns {string} - Formatted display text
         */
        createDisplayText(artist, title) {
            if (artist && title) {
                // Truncate both to exactly 8 characters for cylinder display
                const shortArtist = this.truncateText(artist, 8);
                const shortTitle = this.truncateText(title, 8);
                
                return `${shortArtist}\n${shortTitle}`;
            } else if (title) {
                return this.truncateText(title, 8);
            } else {
                return 'UNKNOWN';
            }
        }
        
        /**
         * Get common audio file extensions
         * @returns {Array} - Array of supported extensions
         */
        getSupportedExtensions() {
            return ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'];
        }
        
        /**
         * Check if filename is an audio file
         * @param {string} filename - Filename to check
         * @returns {boolean} - True if audio file
         */
        isAudioFile(filename) {
            if (!filename) return false;
            
            const extension = filename.split('.').pop()?.toLowerCase();
            return this.getSupportedExtensions().includes(extension);
        }
    }

    // Export the class
    window.AudioMetadataParser = AudioMetadataParser;
    console.log("AudioMetadataParser module loaded successfully");
})();
