/**
 * CONTENT PREFERENCES SERVICE
 * Manages user preferences for music genres, content filtering, and recommendations
 * Stored in localStorage for persistence across sessions
 */

(function() {
    'use strict';

    console.log('🎛️ Loading Content Preferences Service...');

    class ContentPreferencesService {
        constructor() {
            this.storageKey = 'mv3d_content_preferences';
            
            // Available music genres/categories
            this.availableGenres = [
                { id: 'pop', name: 'Pop', icon: '🎵' },
                { id: 'country', name: 'Country', icon: '🤠' },
                { id: 'rock', name: 'Rock', icon: '🎸' },
                { id: 'hip_hop', name: 'Hip Hop / Rap', icon: '🎤' },
                { id: 'indie', name: 'Indie / Alternative', icon: '🎧' },
                { id: 'electronic', name: 'Electronic / EDM', icon: '🎹' },
                { id: 'r_and_b', name: 'R&B / Soul', icon: '🎶' },
                { id: 'classical', name: 'Classical', icon: '🎻' },
                { id: 'jazz', name: 'Jazz', icon: '🎺' },
                { id: 'latin', name: 'Latin', icon: '💃' },
                { id: 'reggae', name: 'Reggae / Dancehall', icon: '🌴' }
            ];

            // Default preferences
            this.defaults = {
                selectedGenres: ['pop', 'country', 'indie'], // Default 3 genres
                cleanMode: true, // Family-friendly content only
                explicitContent: false, // Allow explicit lyrics
                refreshInterval: 24, // Hours between auto-refresh
                lastRefresh: Date.now(),
                version: 1.0
            };

            // Load saved preferences or use defaults
            this.preferences = this.load();
            
            // CRITICAL: Check for Flutter-injected genre preferences (first install)
            // This ensures genres selected in Flutter dialog are used before furniture creation
            if (window.FLUTTER_INITIAL_GENRES && Array.isArray(window.FLUTTER_INITIAL_GENRES)) {
                console.log('🎵 [INIT] Found Flutter-injected genres:', window.FLUTTER_INITIAL_GENRES);
                this.setSelectedGenres(window.FLUTTER_INITIAL_GENRES);
                delete window.FLUTTER_INITIAL_GENRES; // Clean up
                console.log('✅ [INIT] Genre preferences loaded from Flutter');
            }
            
            console.log('✅ Content Preferences Service initialized');
            console.log('🎭 Selected genres:', this.preferences.selectedGenres);
            console.log('🔒 Clean mode:', this.preferences.cleanMode);
        }

        /**
         * Load preferences from localStorage
         * @returns {Object} Preferences object
         */
        load() {
            try {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    const prefs = JSON.parse(stored);
                    console.log('📂 Loaded saved preferences:', prefs);
                    // Merge with defaults to ensure all keys exist
                    return { ...this.defaults, ...prefs };
                }
            } catch (error) {
                console.error('❌ Error loading preferences:', error);
            }
            
            console.log('📋 Using default preferences');
            return { ...this.defaults };
        }

        /**
         * Save preferences to localStorage
         * @returns {boolean} Success status
         */
        save() {
            try {
                const json = JSON.stringify(this.preferences);
                localStorage.setItem(this.storageKey, json);
                console.log('💾 Preferences saved:', this.preferences);
                return true;
            } catch (error) {
                console.error('❌ Error saving preferences:', error);
                return false;
            }
        }

        /**
         * Get current preferences
         * @returns {Object} Current preferences
         */
        getPreferences() {
            return { ...this.preferences };
        }

        /**
         * Get selected genres
         * @returns {Array<string>} Array of genre IDs
         */
        getSelectedGenres() {
            return [...this.preferences.selectedGenres];
        }

        /**
         * Set selected genres
         * @param {Array<string>} genreIds - Array of genre IDs
         * @returns {boolean} Success status
         */
        setSelectedGenres(genreIds) {
            if (!Array.isArray(genreIds) || genreIds.length === 0) {
                console.error('❌ Invalid genre selection');
                return false;
            }

            // Validate genre IDs
            const validIds = genreIds.filter(id => 
                this.availableGenres.some(g => g.id === id)
            );

            if (validIds.length === 0) {
                console.error('❌ No valid genres selected');
                return false;
            }

            this.preferences.selectedGenres = validIds;
            console.log('🎭 Updated selected genres:', validIds);
            return this.save();
        }

        /**
         * Toggle a genre on/off
         * @param {string} genreId - Genre ID to toggle
         * @returns {boolean} New state (true = selected, false = unselected)
         */
        toggleGenre(genreId) {
            const index = this.preferences.selectedGenres.indexOf(genreId);
            
            if (index === -1) {
                // Add genre
                this.preferences.selectedGenres.push(genreId);
                console.log('➕ Added genre:', genreId);
                this.save();
                return true;
            } else {
                // Remove genre (but keep at least one)
                if (this.preferences.selectedGenres.length > 1) {
                    this.preferences.selectedGenres.splice(index, 1);
                    console.log('➖ Removed genre:', genreId);
                    this.save();
                    return false;
                } else {
                    console.warn('⚠️ Cannot remove last genre');
                    return true; // Still selected
                }
            }
        }

        /**
         * Check if genre is selected
         * @param {string} genreId - Genre ID to check
         * @returns {boolean} True if selected
         */
        isGenreSelected(genreId) {
            return this.preferences.selectedGenres.includes(genreId);
        }

        /**
         * Get clean mode status
         * @returns {boolean} True if clean mode enabled
         */
        isCleanMode() {
            return this.preferences.cleanMode;
        }

        /**
         * Set clean mode
         * @param {boolean} enabled - Enable/disable clean mode
         * @returns {boolean} Success status
         */
        setCleanMode(enabled) {
            this.preferences.cleanMode = Boolean(enabled);
            console.log('🔒 Clean mode:', this.preferences.cleanMode);
            return this.save();
        }

        /**
         * Get explicit content status
         * @returns {boolean} True if explicit content allowed
         */
        allowExplicitContent() {
            return this.preferences.explicitContent;
        }

        /**
         * Set explicit content preference
         * @param {boolean} allow - Allow/disallow explicit content
         * @returns {boolean} Success status
         */
        setExplicitContent(allow) {
            this.preferences.explicitContent = Boolean(allow);
            // If allowing explicit, disable clean mode
            if (allow) {
                this.preferences.cleanMode = false;
            }
            console.log('🔞 Explicit content:', this.preferences.explicitContent);
            return this.save();
        }

        /**
         * Get API filter parameters for content requests
         * @returns {Object} Filter parameters
         */
        getAPIFilters() {
            return {
                genres: this.getSelectedGenres(),
                cleanMode: this.isCleanMode(),
                explicit: this.allowExplicitContent(),
                safeSearch: this.isCleanMode() ? 'strict' : 'moderate'
            };
        }

        /**
         * Record content refresh timestamp
         */
        markRefreshed() {
            this.preferences.lastRefresh = Date.now();
            this.save();
        }

        /**
         * Check if content should auto-refresh
         * @returns {boolean} True if refresh needed
         */
        shouldAutoRefresh() {
            const hoursSinceRefresh = (Date.now() - this.preferences.lastRefresh) / (1000 * 60 * 60);
            return hoursSinceRefresh >= this.preferences.refreshInterval;
        }

        /**
         * Reset to default preferences
         * @returns {boolean} Success status
         */
        reset() {
            this.preferences = { ...this.defaults };
            console.log('🔄 Preferences reset to defaults');
            return this.save();
        }

        /**
         * Export preferences for Flutter bridge
         * @returns {string} JSON string of preferences
         */
        exportForFlutter() {
            return JSON.stringify({
                genres: this.getSelectedGenres(),
                genreNames: this.getSelectedGenres().map(id => {
                    const genre = this.availableGenres.find(g => g.id === id);
                    return genre ? genre.name : id;
                }),
                cleanMode: this.isCleanMode(),
                explicitContent: this.allowExplicitContent()
            });
        }

        /**
         * Import preferences from Flutter bridge
         * @param {string} jsonString - JSON string of preferences
         * @returns {boolean} Success status
         */
        importFromFlutter(jsonString) {
            try {
                const data = JSON.parse(jsonString);
                
                if (data.genres) {
                    this.setSelectedGenres(data.genres);
                }
                if (data.cleanMode !== undefined) {
                    this.setCleanMode(data.cleanMode);
                }
                if (data.explicitContent !== undefined) {
                    this.setExplicitContent(data.explicitContent);
                }
                
                console.log('✅ Imported preferences from Flutter');
                return true;
            } catch (error) {
                console.error('❌ Error importing preferences:', error);
                return false;
            }
        }
    }

    // ============================================================================
    // GLOBAL INSTANCE
    // ============================================================================
    
    window.ContentPreferencesService = ContentPreferencesService;
    
    // Create global instance
    if (!window.contentPreferences) {
        window.contentPreferences = new ContentPreferencesService();
        console.log('🎛️ Global ContentPreferencesService instance created');
    }

    console.log('✅ Content Preferences Service module loaded');
})();
