/**
 * FURNITURE HISTORY MANAGER
 * Manages content history for furniture pieces to enable back/undo functionality
 * Stores last 3 states per furniture piece
 */

(function() {
    'use strict';

    console.log('⏮️ Loading Furniture History Manager...');

    class FurnitureHistoryManager {
        constructor() {
            // Map of furniture UUID -> history array
            // Each entry contains: { objectIds: [], timestamp: number, source: string }
            this.historyMap = new Map();
            
            // Maximum history entries per furniture
            this.maxHistoryDepth = 3;
            
            console.log('✅ Furniture History Manager initialized');
        }

        /**
         * Save current state of furniture
         * @param {string} furnitureUUID - Furniture UUID
         * @param {Array<string>} objectIds - Array of object UUIDs currently on furniture
         * @param {string} source - Source description (e.g., "demo", "refresh", "category_pop")
         */
        saveState(furnitureUUID, objectIds, source = 'manual') {
            if (!furnitureUUID || !Array.isArray(objectIds)) {
                console.error('❌ Invalid parameters for saveState');
                return false;
            }

            // Get or create history for this furniture
            let history = this.historyMap.get(furnitureUUID);
            if (!history) {
                history = [];
                this.historyMap.set(furnitureUUID, history);
            }

            // Create state snapshot
            const state = {
                objectIds: [...objectIds],
                timestamp: Date.now(),
                source: source
            };

            // Add to history
            history.push(state);

            // Trim to max depth
            if (history.length > this.maxHistoryDepth) {
                history.shift(); // Remove oldest
            }

            console.log(`💾 Saved state for furniture ${furnitureUUID.substring(0, 8)}:`, {
                objectCount: objectIds.length,
                source: source,
                historyDepth: history.length
            });

            return true;
        }

        /**
         * Get previous state for furniture (without removing it)
         * @param {string} furnitureUUID - Furniture UUID
         * @returns {Object|null} Previous state or null if no history
         */
        peekPreviousState(furnitureUUID) {
            const history = this.historyMap.get(furnitureUUID);
            
            if (!history || history.length < 2) {
                console.log(`⚠️ No previous state for furniture ${furnitureUUID.substring(0, 8)}`);
                return null;
            }

            // Return second-to-last (because last is current)
            return history[history.length - 2];
        }

        /**
         * Restore previous state for furniture
         * @param {string} furnitureUUID - Furniture UUID
         * @returns {Object|null} Previous state or null if no history
         */
        restorePreviousState(furnitureUUID) {
            const history = this.historyMap.get(furnitureUUID);
            
            if (!history || history.length < 2) {
                console.log(`⚠️ No previous state to restore for furniture ${furnitureUUID.substring(0, 8)}`);
                return null;
            }

            // Remove current state
            history.pop();

            // Get and return previous state (but keep it in history)
            const previousState = history[history.length - 1];

            console.log(`⏮️ Restoring previous state for furniture ${furnitureUUID.substring(0, 8)}:`, {
                objectCount: previousState.objectIds.length,
                source: previousState.source,
                age: Math.round((Date.now() - previousState.timestamp) / 1000) + 's ago'
            });

            return previousState;
        }

        /**
         * Check if furniture has history (can go back)
         * @param {string} furnitureUUID - Furniture UUID
         * @returns {boolean} True if can go back
         */
        canGoBack(furnitureUUID) {
            const history = this.historyMap.get(furnitureUUID);
            return history && history.length >= 2;
        }

        /**
         * Get history depth for furniture
         * @param {string} furnitureUUID - Furniture UUID
         * @returns {number} Number of history entries
         */
        getHistoryDepth(furnitureUUID) {
            const history = this.historyMap.get(furnitureUUID);
            return history ? history.length : 0;
        }

        /**
         * Clear history for specific furniture
         * @param {string} furnitureUUID - Furniture UUID
         */
        clearHistory(furnitureUUID) {
            if (this.historyMap.has(furnitureUUID)) {
                this.historyMap.delete(furnitureUUID);
                console.log(`🗑️ Cleared history for furniture ${furnitureUUID.substring(0, 8)}`);
            }
        }

        /**
         * Clear all furniture history
         */
        clearAllHistory() {
            this.historyMap.clear();
            console.log('🗑️ Cleared all furniture history');
        }

        /**
         * Get full history for furniture (for debugging)
         * @param {string} furnitureUUID - Furniture UUID
         * @returns {Array} History array
         */
        getFullHistory(furnitureUUID) {
            return this.historyMap.get(furnitureUUID) || [];
        }

        /**
         * Get statistics about history usage
         * @returns {Object} Statistics object
         */
        getStats() {
            const stats = {
                furnitureCount: this.historyMap.size,
                totalEntries: 0,
                avgDepth: 0,
                furnitureWithHistory: []
            };

            this.historyMap.forEach((history, uuid) => {
                stats.totalEntries += history.length;
                if (history.length > 1) {
                    stats.furnitureWithHistory.push({
                        uuid: uuid.substring(0, 8),
                        depth: history.length,
                        canGoBack: history.length >= 2
                    });
                }
            });

            if (this.historyMap.size > 0) {
                stats.avgDepth = (stats.totalEntries / this.historyMap.size).toFixed(1);
            }

            return stats;
        }

        /**
         * Export history for persistence (if needed)
         * @returns {Object} Serializable history data
         */
        exportHistory() {
            const exported = {};
            this.historyMap.forEach((history, uuid) => {
                exported[uuid] = history;
            });
            return exported;
        }

        /**
         * Import history from persistence
         * @param {Object} data - Exported history data
         */
        importHistory(data) {
            if (!data || typeof data !== 'object') {
                console.error('❌ Invalid history data for import');
                return;
            }

            this.historyMap.clear();
            
            Object.entries(data).forEach(([uuid, history]) => {
                if (Array.isArray(history)) {
                    this.historyMap.set(uuid, history);
                }
            });

            console.log('✅ Imported furniture history:', this.getStats());
        }
    }

    // ============================================================================
    // GLOBAL INSTANCE
    // ============================================================================
    
    window.FurnitureHistoryManager = FurnitureHistoryManager;
    
    // Create global instance
    if (!window.furnitureHistory) {
        window.furnitureHistory = new FurnitureHistoryManager();
        console.log('⏮️ Global FurnitureHistoryManager instance created');
    }

    console.log('✅ Furniture History Manager module loaded');
})();
