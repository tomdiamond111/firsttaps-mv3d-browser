/**
 * Content Preference Learning Service (Browser Implementation)
 * Learns user content preferences through pattern detection
 * Automatically filters content based on repeated dislikes
 */

class ContentPreferenceLearningService {
  constructor() {
    this.storageKey = 'mv3d_content_preferences';
    this.dislikeMetadataKey = 'mv3d_dislike_metadata';
    
    // TIERED BLOCKING SYSTEM:
    // Artists/Channels (high priority): Soft at 3, Hard at 6
    // Language (high priority): Soft at 3, Hard at 6
    // Keywords/Genres (lower priority): Soft at 4, Hard at 8
    this.softBlockThresholdHighPriority = 3;  // 70% reduction
    this.hardBlockThresholdHighPriority = 6;  // 100% block
    this.softBlockThresholdLowPriority = 4;
    this.hardBlockThresholdLowPriority = 8;
    
    // User's negative preferences (auto-detected from patterns)
    this.blockedLanguages = new Set();
    this.softBlockedLanguages = new Set();
    this.blockedChannels = new Set();
    this.softBlockedChannels = new Set();
    this.blockedArtists = new Set();
    this.softBlockedArtists = new Set();
    this.blockedCountries = new Set();
    this.blockedKeywords = new Set();
    this.softBlockedKeywords = new Set();
    
    // Track dislike metadata for pattern detection
    this.dislikeHistory = [];
    
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) {
      console.log('[PREFERENCE LEARNING] Already initialized');
      return;
    }
    
    console.log('[PREFERENCE LEARNING] 🔧 Initializing...');
    await this._loadPreferences();
    await this._loadDislikeHistory();
    this.initialized = true;
    console.log(`[PREFERENCE LEARNING] ✅ Initialized - ${this.dislikeHistory.length} dislikes in history`);
    this._logCurrentFilters();
  }

  /**
   * Load saved preferences from storage
   */
  async _loadPreferences() {
    try {
      const jsonString = localStorage.getItem(this.storageKey);
      
      if (jsonString) {
        const data = JSON.parse(jsonString);
        this.blockedLanguages = new Set(data.blockedLanguages || []);
        this.softBlockedLanguages = new Set(data.softBlockedLanguages || []);
        this.blockedChannels = new Set(data.blockedChannels || []);
        this.softBlockedChannels = new Set(data.softBlockedChannels || []);
        this.blockedArtists = new Set(data.blockedArtists || []);
        this.softBlockedArtists = new Set(data.softBlockedArtists || []);
        this.blockedCountries = new Set(data.blockedCountries || []);
        this.blockedKeywords = new Set(data.blockedKeywords || []);
        this.softBlockedKeywords = new Set(data.softBlockedKeywords || []);
      }
    } catch (e) {
      console.error('⚠️ Failed to load content preferences:', e);
    }
  }

  /**
   * Load dislike history for pattern detection
   */
  async _loadDislikeHistory() {
    try {
      const jsonString = localStorage.getItem(this.dislikeMetadataKey);
      
      if (jsonString) {
        this.dislikeHistory = JSON.parse(jsonString);
      }
    } catch (e) {
      console.error('⚠️ Failed to load dislike history:', e);
      this.dislikeHistory = [];
    }
  }

  /**
   * Save preferences to storage
   */
  async _savePreferences() {
    try {
      const data = {
        blockedLanguages: Array.from(this.blockedLanguages),
        softBlockedLanguages: Array.from(this.softBlockedLanguages),
        blockedChannels: Array.from(this.blockedChannels),
        softBlockedChannels: Array.from(this.softBlockedChannels),
        blockedArtists: Array.from(this.blockedArtists),
        softBlockedArtists: Array.from(this.softBlockedArtists),
        blockedCountries: Array.from(this.blockedCountries),
        blockedKeywords: Array.from(this.blockedKeywords),
        softBlockedKeywords: Array.from(this.softBlockedKeywords),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('⚠️ Failed to save content preferences:', e);
    }
  }

  /**
   * Save dislike history to storage
   */
  async _saveDislikeHistory() {
    try {
      localStorage.setItem(this.dislikeMetadataKey, JSON.stringify(this.dislikeHistory));
    } catch (e) {
      console.error('⚠️ Failed to save dislike history:', e);
    }
  }

  /**
   * Record a content dislike and learn from patterns
   * @param {Object} metadata - Content metadata {title, channelTitle, language, tags, etc.}
   */
  async recordDislike(metadata) {
    console.log('[PREFERENCE LEARNING] 📊 Recording dislike:', metadata);
    
    // Add to history with timestamp
    this.dislikeHistory.push({
      ...metadata,
      timestamp: new Date().toISOString()
    });
    
    // Analyze patterns and update filters
    await this._analyzePatterns();
    
    // Save updated data
    await this._saveDislikeHistory();
    await this._savePreferences();
    
    this._logCurrentFilters();
  }

  /**
   * Analyze dislike patterns and update filters
   */
  async _analyzePatterns() {
    // Count occurrences of each attribute
    const languageCounts = {};
    const channelCounts = {};
    const artistCounts = {};
    const keywordCounts = {};
    
    this.dislikeHistory.forEach(item => {
      // Count languages
      if (item.language) {
        languageCounts[item.language] = (languageCounts[item.language] || 0) + 1;
      }
      
      // Count channels
      if (item.channelTitle) {
        channelCounts[item.channelTitle] = (channelCounts[item.channelTitle] || 0) + 1;
      }
      
      // Extract artist from title (first part before '-' or '|')
      if (item.title) {
        const artistMatch = item.title.match(/^([^-|]+)[-|]/);
        if (artistMatch) {
          const artist = artistMatch[1].trim();
          artistCounts[artist] = (artistCounts[artist] || 0) + 1;
        }
      }
      
      // Count keywords from tags
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          const normalizedTag = tag.toLowerCase();
          keywordCounts[normalizedTag] = (keywordCounts[normalizedTag] || 0) + 1;
        });
      }
    });
    
    // Update language filters (HIGH PRIORITY)
    Object.entries(languageCounts).forEach(([lang, count]) => {
      if (count >= this.hardBlockThresholdHighPriority) {
        this.blockedLanguages.add(lang);
        this.softBlockedLanguages.delete(lang);
        console.log(`[PREFERENCE LEARNING] 🚫 Hard blocked language: ${lang} (${count} dislikes)`);
      } else if (count >= this.softBlockThresholdHighPriority) {
        this.softBlockedLanguages.add(lang);
        console.log(`[PREFERENCE LEARNING] ⚠️ Soft blocked language: ${lang} (${count} dislikes)`);
      }
    });
    
    // Update channel filters (HIGH PRIORITY)
    Object.entries(channelCounts).forEach(([channel, count]) => {
      if (count >= this.hardBlockThresholdHighPriority) {
        this.blockedChannels.add(channel);
        this.softBlockedChannels.delete(channel);
        console.log(`[PREFERENCE LEARNING] 🚫 Hard blocked channel: ${channel} (${count} dislikes)`);
      } else if (count >= this.softBlockThresholdHighPriority) {
        this.softBlockedChannels.add(channel);
        console.log(`[PREFERENCE LEARNING] ⚠️ Soft blocked channel: ${channel} (${count} dislikes)`);
      }
    });
    
    // Update artist filters (HIGH PRIORITY)
    Object.entries(artistCounts).forEach(([artist, count]) => {
      if (count >= this.hardBlockThresholdHighPriority) {
        this.blockedArtists.add(artist);
        this.softBlockedArtists.delete(artist);
        console.log(`[PREFERENCE LEARNING] 🚫 Hard blocked artist: ${artist} (${count} dislikes)`);
      } else if (count >= this.softBlockThresholdHighPriority) {
        this.softBlockedArtists.add(artist);
        console.log(`[PREFERENCE LEARNING] ⚠️ Soft blocked artist: ${artist} (${count} dislikes)`);
      }
    });
    
    // Update keyword filters (LOW PRIORITY)
    Object.entries(keywordCounts).forEach(([keyword, count]) => {
      if (count >= this.hardBlockThresholdLowPriority) {
        this.blockedKeywords.add(keyword);
        this.softBlockedKeywords.delete(keyword);
        console.log(`[PREFERENCE LEARNING] 🚫 Hard blocked keyword: ${keyword} (${count} dislikes)`);
      } else if (count >= this.softBlockThresholdLowPriority) {
        this.softBlockedKeywords.add(keyword);
        console.log(`[PREFERENCE LEARNING] ⚠️ Soft blocked keyword: ${keyword} (${count} dislikes)`);
      }
    });
  }

  /**
   * Check if content should be filtered based on learned preferences
   * @param {Object} metadata - Content metadata
   * @returns {Object} {shouldFilter: boolean, reason: string, isSoftBlock: boolean}
   */
  shouldFilterContent(metadata) {
    // Hard blocks (100% filter)
    if (metadata.language && this.blockedLanguages.has(metadata.language)) {
      return { shouldFilter: true, reason: `Blocked language: ${metadata.language}`, isSoftBlock: false };
    }
    
    if (metadata.channelTitle && this.blockedChannels.has(metadata.channelTitle)) {
      return { shouldFilter: true, reason: `Blocked channel: ${metadata.channelTitle}`, isSoftBlock: false };
    }
    
    // Check artist in title
    if (metadata.title) {
      const artistMatch = metadata.title.match(/^([^-|]+)[-|]/);
      if (artistMatch) {
        const artist = artistMatch[1].trim();
        if (this.blockedArtists.has(artist)) {
          return { shouldFilter: true, reason: `Blocked artist: ${artist}`, isSoftBlock: false };
        }
        // Check soft block (70% chance of filtering)
        if (this.softBlockedArtists.has(artist) && Math.random() > 0.3) {
          return { shouldFilter: true, reason: `Soft blocked artist: ${artist}`, isSoftBlock: true };
        }
      }
    }
    
    // Soft blocks (70% filter chance)
    if (metadata.language && this.softBlockedLanguages.has(metadata.language) && Math.random() > 0.3) {
      return { shouldFilter: true, reason: `Soft blocked language: ${metadata.language}`, isSoftBlock: true };
    }
    
    if (metadata.channelTitle && this.softBlockedChannels.has(metadata.channelTitle) && Math.random() > 0.3) {
      return { shouldFilter: true, reason: `Soft blocked channel: ${metadata.channelTitle}`, isSoftBlock: true };
    }
    
    // Check keywords (hard block)
    if (metadata.tags && Array.isArray(metadata.tags)) {
      for (const tag of metadata.tags) {
        const normalizedTag = tag.toLowerCase();
        if (this.blockedKeywords.has(normalizedTag)) {
          return { shouldFilter: true, reason: `Blocked keyword: ${tag}`, isSoftBlock: false };
        }
        // Soft block keywords
        if (this.softBlockedKeywords.has(normalizedTag) && Math.random() > 0.3) {
          return { shouldFilter: true, reason: `Soft blocked keyword: ${tag}`, isSoftBlock: true };
        }
      }
    }
    
    return { shouldFilter: false, reason: '', isSoftBlock: false };
  }

  /**
   * Clear all learned preferences
   */
  async clearPreferences() {
    this.blockedLanguages.clear();
    this.softBlockedLanguages.clear();
    this.blockedChannels.clear();
    this.softBlockedChannels.clear();
    this.blockedArtists.clear();
    this.softBlockedArtists.clear();
    this.blockedCountries.clear();
    this.blockedKeywords.clear();
    this.softBlockedKeywords.clear();
    this.dislikeHistory = [];
    
    await this._savePreferences();
    await this._saveDislikeHistory();
    
    console.log('[PREFERENCE LEARNING] 🗑️ Cleared all preferences');
  }

  /**
   * Log current filters for debugging
   */
  _logCurrentFilters() {
    console.log('[PREFERENCE LEARNING] 📊 Current Filters:');
    console.log(`  Hard Blocked Languages: ${Array.from(this.blockedLanguages).join(', ') || 'None'}`);
    console.log(`  Soft Blocked Languages: ${Array.from(this.softBlockedLanguages).join(', ') || 'None'}`);
    console.log(`  Hard Blocked Channels: ${Array.from(this.blockedChannels).join(', ') || 'None'}`);
    console.log(`  Soft Blocked Channels: ${Array.from(this.softBlockedChannels).join(', ') || 'None'}`);
    console.log(`  Hard Blocked Artists: ${Array.from(this.blockedArtists).join(', ') || 'None'}`);
    console.log(`  Soft Blocked Artists: ${Array.from(this.softBlockedArtists).join(', ') || 'None'}`);
    console.log(`  Hard Blocked Keywords: ${Array.from(this.blockedKeywords).join(', ') || 'None'}`);
    console.log(`  Soft Blocked Keywords: ${Array.from(this.softBlockedKeywords).join(', ') || 'None'}`);
  }

  /**
   * Get current filter statistics
   */
  getFilterStats() {
    return {
      hardBlockedLanguages: this.blockedLanguages.size,
      softBlockedLanguages: this.softBlockedLanguages.size,
      hardBlockedChannels: this.blockedChannels.size,
      softBlockedChannels: this.softBlockedChannels.size,
      hardBlockedArtists: this.blockedArtists.size,
      softBlockedArtists: this.softBlockedArtists.size,
      hardBlockedKeywords: this.blockedKeywords.size,
      softBlockedKeywords: this.softBlockedKeywords.size,
      totalDislikes: this.dislikeHistory.length
    };
  }
}

// Create singleton instance
const contentPreferenceLearningService = new ContentPreferenceLearningService();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = contentPreferenceLearningService;
}

// Make available globally
window.ContentPreferenceLearningService = ContentPreferenceLearningService;
window.contentPreferenceLearningService = contentPreferenceLearningService;

console.log('✅ ContentPreferenceLearningService loaded');
