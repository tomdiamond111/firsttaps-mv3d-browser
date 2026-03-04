/**
 * FurnitureNameManager - Handles furniture name changes with persistence
 * 
 * Unlike LinkNameManager, this is intentionally lightweight because furniture
 * already has robust persistence through FurnitureStorageManager.updateFurniture().
 * We just need a simple rename interface that leverages that existing system.
 */

class FurnitureNameManager {
    constructor() {
        console.log('🪑 FurnitureNameManager initialized');
    }

    /**
     * Update a furniture piece's name
     * @param {string} furnitureId - The furniture ID
     * @param {string} newName - The new name to set
     * @returns {boolean} - Success status
     */
    updateFurnitureName(furnitureId, newName) {
        try {
            console.log(`🪑 FurnitureNameManager: Updating name for ${furnitureId} to "${newName}"`);

            // Get furniture from storage
            const furniture = window.app?.furnitureManager?.storageManager?.getFurniture(furnitureId);
            if (!furniture) {
                console.error(`❌ FurnitureNameManager: Furniture ${furnitureId} not found`);
                return false;
            }

            console.log(`🪑 FurnitureNameManager: Found furniture - current name: "${furniture.name}"`);

            // Update the name
            furniture.name = newName;
            furniture.lastModified = Date.now();
            
            console.log(`🪑 FurnitureNameManager: Updated furniture.name to "${newName}"`);

            // Save using existing furniture persistence system
            // This handles ALL persistence automatically (localStorage, Flutter bridge, etc.)
            window.app.furnitureManager.storageManager.updateFurniture(furniture);
            console.log('💾 FurnitureNameManager: Saved via updateFurniture() - persistence complete');

            // Update visual display if furniture group exists
            this.refreshVisualDisplay(furnitureId, newName);

            console.log(`✅ FurnitureNameManager: Successfully renamed furniture to "${newName}"`);
            return true;

        } catch (error) {
            console.error('❌ FurnitureNameManager: Error updating furniture name:', error);
            return false;
        }
    }

    /**
     * Refresh the visual display of renamed furniture
     * @param {string} furnitureId - The furniture ID
     * @param {string} newName - The new name
     */
    refreshVisualDisplay(furnitureId, newName) {
        try {
            console.log(`🔄 FurnitureNameManager: Refreshing visual display for ${furnitureId}`);

            const furnitureGroup = window.app?.furnitureManager?.visualManager?.getFurnitureGroup(furnitureId);
            if (furnitureGroup) {
                // Update userData if it exists (used by UI elements)
                if (furnitureGroup.userData) {
                    furnitureGroup.userData.name = newName;
                    console.log('🔄 Updated furnitureGroup.userData.name');
                }

                // Update the group name itself
                furnitureGroup.name = newName;
                console.log('🔄 Updated furnitureGroup.name');

                console.log(`✅ FurnitureNameManager: Visual display refreshed for "${newName}"`);
            } else {
                console.log('ℹ️ FurnitureNameManager: No visual group found (furniture may not be visible)');
            }

        } catch (error) {
            console.error('❌ FurnitureNameManager: Error refreshing visual display:', error);
        }
    }

    /**
     * Get current furniture name
     * @param {string} furnitureId - The furniture ID
     * @returns {string|null} - Current name or null if not found
     */
    getFurnitureName(furnitureId) {
        try {
            const furniture = window.app?.furnitureManager?.storageManager?.getFurniture(furnitureId);
            return furniture ? furniture.name : null;
        } catch (error) {
            console.error('❌ FurnitureNameManager: Error getting furniture name:', error);
            return null;
        }
    }
}

// Create global instance for Flutter to call
if (typeof window !== 'undefined') {
    window.furnitureNameHandler = new FurnitureNameManager();
    console.log('✅ FurnitureNameManager: Global handler ready (window.furnitureNameHandler)');
} else {
    console.warn('⚠️ FurnitureNameManager: Window not available, cannot create global handler');
}
