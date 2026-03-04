/**
 * Advanced Stacking Criteria - Phase 3A Implementation
 * Handles sophisticated conditional stacking rules based on object type and metadata
 */

class AdvancedStackingCriteria {
    constructor() {
        this.name = 'AdvancedStackingCriteria';
        this.version = '3.0.0';
        
        // Cache for extracted metadata to avoid repeated processing
        this.metadataCache = new Map();
        
        // Session tracking for link objects
        this.sessionStartTime = Date.now();
        this.sessionWindow = 30 * 60 * 1000; // 30 minutes
        
        console.log('🔧 Advanced Stacking Criteria initialized');
    }

    /**
     * Main entry point for advanced stacking criteria
     * Routes to appropriate handler based on object type
     */
    getAdvancedStackingCriteria(objA, objB, criteriaType) {
        const typeA = this.getObjectType(objA);
        const typeB = this.getObjectType(objB);
        
        // Objects must be same type to be considered for stacking
        if (typeA !== typeB) {
            return {
                canStack: false,
                reason: 'Different object types'
            };
        }
        
        switch (typeA) {
            case 'image':
                return this.getImageStackingCriteria(objA, objB, criteriaType);
            case 'audio':
                return this.getAudioStackingCriteria(objA, objB, criteriaType);
            case 'file':
                return this.getFileStackingCriteria(objA, objB, criteriaType);
            case 'app':
                return this.getAppStackingCriteria(objA, objB, criteriaType);
            case 'link':
                return this.getLinkStackingCriteria(objA, objB, criteriaType);
            default:
                return this.getDefaultStackingCriteria(objA, objB, criteriaType);
        }
    }

    /**
     * Determine object type from file data
     */
    getObjectType(obj) {
        if (!obj.userData || !obj.userData.fileData) {
            return 'unknown';
        }
        
        const fileData = obj.userData.fileData;
        const extension = fileData.extension?.toLowerCase() || '';
        const id = fileData.id || '';
        
        // App objects
        if (id.startsWith('app_')) {
            return 'app';
        }
        
        // Link objects (URLs)
        if (fileData.mimeType?.startsWith('link:') || fileData.url) {
            return 'link';
        }
        
        // Image files
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'].includes(extension)) {
            return 'image';
        }
        
        // Audio files
        if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(extension)) {
            return 'audio';
        }
        
        // Everything else is a file
        return 'file';
    }

    /**
     * Image stacking criteria:
     * - Stack if same capture date (year, month, day)
     * - Sort with most recent on top
     */
    getImageStackingCriteria(objA, objB, criteriaType) {
        const dateA = this.extractImageCaptureDate(objA);
        const dateB = this.extractImageCaptureDate(objB);
        
        if (!dateA || !dateB) {
            // Fallback to filename prefix if no date available
            return this.getFilenamePrefix8Criteria(objA, objB);
        }
        
        // Compare year, month, day only
        const dayA = this.getDateKey(dateA);
        const dayB = this.getDateKey(dateB);
        
        const canStack = dayA === dayB;
        
        return {
            canStack: canStack,
            value: dayA,
            sortValue: dateA.getTime(), // Most recent first (higher timestamp)
            reason: canStack ? `Same capture date: ${dayA}` : 'Different capture dates',
            metadata: {
                dateA: dateA.toISOString(),
                dateB: dateB.toISOString(),
                dayKeyA: dayA,
                dayKeyB: dayB
            }
        };
    }

    /**
     * Audio stacking criteria:
     * - Stack if same artist name OR same song name
     * - Sort alphabetically by artist, then by song
     */
    getAudioStackingCriteria(objA, objB, criteriaType) {
        const metaA = this.extractAudioMetadata(objA);
        const metaB = this.extractAudioMetadata(objB);
        
        // Check if they share artist or song name
        const sameArtist = metaA.artist && metaB.artist && 
                          metaA.artist.toLowerCase() === metaB.artist.toLowerCase();
        const sameSong = metaA.song && metaB.song && 
                        metaA.song.toLowerCase() === metaB.song.toLowerCase();
        
        const canStack = sameArtist || sameSong;
        
        let stackKey, reason;
        if (sameArtist) {
            stackKey = `artist:${metaA.artist.toLowerCase()}`;
            reason = `Same artist: ${metaA.artist}`;
        } else if (sameSong) {
            stackKey = `song:${metaA.song.toLowerCase()}`;
            reason = `Same song: ${metaA.song}`;
        } else {
            // Fallback to filename prefix
            return this.getFilenamePrefix8Criteria(objA, objB);
        }
        
        // Sort value: artist name + song name for consistent ordering
        const sortValue = `${metaA.artist || 'zzz'}_${metaA.song || 'zzz'}`.toLowerCase();
        
        return {
            canStack: canStack,
            value: stackKey,
            sortValue: sortValue,
            reason: reason,
            metadata: {
                artistA: metaA.artist,
                songA: metaA.song,
                artistB: metaB.artist,
                songB: metaB.song
            }
        };
    }

    /**
     * File stacking criteria:
     * - Stack if same 8-character filename prefix
     * - Sort numerically (0-9) then alphabetically (A-Z)
     */
    getFileStackingCriteria(objA, objB, criteriaType) {
        return this.getFilenamePrefix8Criteria(objA, objB);
    }

    /**
     * App stacking criteria:
     * - Stack if same 6-character app name prefix
     * - Sort alphabetically
     */
    getAppStackingCriteria(objA, objB, criteriaType) {
        const nameA = (objA.userData.fileData?.name || '').substring(0, 6).toLowerCase();
        const nameB = (objB.userData.fileData?.name || '').substring(0, 6).toLowerCase();
        
        const canStack = nameA === nameB && nameA.length >= 3; // Minimum 3 chars for meaningful grouping
        
        return {
            canStack: canStack,
            value: nameA,
            sortValue: objA.userData.fileData?.name?.toLowerCase() || '',
            reason: canStack ? `Same app prefix: "${nameA}"` : 'Different app prefixes',
            metadata: {
                prefixA: nameA,
                prefixB: nameB,
                fullNameA: objA.userData.fileData?.name,
                fullNameB: objB.userData.fileData?.name
            }
        };
    }

    /**
     * Link stacking criteria:
     * - Stack if same 8-character link name prefix OR created in same session
     * - Sort by creation time
     */
    getLinkStackingCriteria(objA, objB, criteriaType) {
        const nameA = (objA.userData.fileData?.name || '').substring(0, 8).toLowerCase();
        const nameB = (objB.userData.fileData?.name || '').substring(0, 8).toLowerCase();
        
        const timeA = objA.userData.fileData?.lastModified || 0;
        const timeB = objB.userData.fileData?.lastModified || 0;
        
        // Check prefix match
        const samePrefix = nameA === nameB && nameA.length >= 4;
        
        // Check session match (within 30 minutes)
        const timeDiff = Math.abs(timeA - timeB);
        const sameSession = timeDiff <= this.sessionWindow;
        
        const canStack = samePrefix || sameSession;
        
        let stackKey, reason;
        if (samePrefix) {
            stackKey = `prefix:${nameA}`;
            reason = `Same link prefix: "${nameA}"`;
        } else if (sameSession) {
            stackKey = `session:${Math.floor(Math.min(timeA, timeB) / this.sessionWindow)}`;
            reason = `Same session (${Math.round(timeDiff / 60000)} min apart)`;
        } else {
            stackKey = `individual:${objA.userData.fileData?.id || Math.random()}`;
            reason = 'Different prefix and session';
        }
        
        return {
            canStack: canStack,
            value: stackKey,
            sortValue: timeA, // Sort by creation time
            reason: reason,
            metadata: {
                prefixA: nameA,
                prefixB: nameB,
                timeA: timeA,
                timeB: timeB,
                timeDiff: timeDiff,
                sessionWindow: this.sessionWindow
            }
        };
    }

    /**
     * Extract image capture date from EXIF data or fall back to file date
     */
    extractImageCaptureDate(obj) {
        const fileData = obj.userData.fileData;
        if (!fileData) return null;
        
        // Check cache first
        const cacheKey = `date:${fileData.id}`;
        if (this.metadataCache.has(cacheKey)) {
            return this.metadataCache.get(cacheKey);
        }
        
        let captureDate = null;
        
        // Try EXIF dateTimeOriginal first
        if (fileData.dateTimeOriginal) {
            captureDate = new Date(fileData.dateTimeOriginal);
        }
        // Fall back to file modification date
        else if (fileData.lastModified) {
            captureDate = new Date(fileData.lastModified);
        }
        // Last resort: creation date
        else if (fileData.dateCreated) {
            captureDate = new Date(fileData.dateCreated);
        }
        
        // Validate date
        if (captureDate && !isNaN(captureDate.getTime())) {
            this.metadataCache.set(cacheKey, captureDate);
            return captureDate;
        }
        
        return null;
    }

    /**
     * Extract audio metadata from filename (artist - song pattern)
     */
    extractAudioMetadata(obj) {
        const fileData = obj.userData.fileData;
        if (!fileData) return { artist: null, song: null };
        
        // Check cache first
        const cacheKey = `audio:${fileData.id}`;
        if (this.metadataCache.has(cacheKey)) {
            return this.metadataCache.get(cacheKey);
        }
        
        const filename = fileData.name || '';
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        
        let artist = null;
        let song = null;
        
        // Try to parse "Artist - Song" pattern
        const dashMatch = nameWithoutExt.match(/^(.+?)\s*-\s*(.+)$/);
        if (dashMatch) {
            artist = dashMatch[1].trim();
            song = dashMatch[2].trim();
        }
        // Try to parse "Artist_Song" pattern
        else {
            const underscoreMatch = nameWithoutExt.match(/^(.+?)_(.+)$/);
            if (underscoreMatch) {
                artist = underscoreMatch[1].trim().replace(/_/g, ' ');
                song = underscoreMatch[2].trim().replace(/_/g, ' ');
            }
        }
        
        // If no pattern found, use filename as song title
        if (!artist && !song) {
            song = nameWithoutExt;
        }
        
        const metadata = { artist, song };
        this.metadataCache.set(cacheKey, metadata);
        return metadata;
    }

    /**
     * Get filename 8-character prefix criteria (fallback for many cases)
     */
    getFilenamePrefix8Criteria(objA, objB) {
        const nameA = (objA.userData.fileData?.name || '').substring(0, 8).toLowerCase();
        const nameB = (objB.userData.fileData?.name || '').substring(0, 8).toLowerCase();
        
        const canStack = nameA === nameB && nameA.length >= 3;
        
        // Create sort value that handles numbers naturally
        const fullNameA = objA.userData.fileData?.name || '';
        const sortValue = this.createNaturalSortKey(fullNameA);
        
        return {
            canStack: canStack,
            value: nameA,
            sortValue: sortValue,
            reason: canStack ? `Same filename prefix: "${nameA}"` : 'Different filename prefixes',
            metadata: {
                prefixA: nameA,
                prefixB: nameB,
                fullNameA: fullNameA,
                fullNameB: objB.userData.fileData?.name || ''
            }
        };
    }

    /**
     * Create natural sort key (numbers before letters, natural number ordering)
     */
    createNaturalSortKey(str) {
        return str.toLowerCase().replace(/(\d+)/g, (match) => {
            return match.padStart(10, '0'); // Pad numbers for proper sorting
        });
    }

    /**
     * Get date key for grouping (YYYY-MM-DD format)
     */
    getDateKey(date) {
        if (!date || isNaN(date.getTime())) return null;
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    /**
     * Default stacking criteria for unknown types
     */
    getDefaultStackingCriteria(objA, objB, criteriaType) {
        return this.getFilenamePrefix8Criteria(objA, objB);
    }

    /**
     * Check if two dates are within specified days of each other
     */
    isWithinDays(dateA, dateB, days) {
        if (!dateA || !dateB) return false;
        
        const diffTime = Math.abs(dateA.getTime() - dateB.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= days;
    }

    /**
     * Clear metadata cache (useful for memory management)
     */
    clearCache() {
        this.metadataCache.clear();
        console.log('🧹 Advanced stacking criteria cache cleared');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.AdvancedStackingCriteria = AdvancedStackingCriteria;
    console.log('🔧 AdvancedStackingCriteria registered globally');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedStackingCriteria;
}
