// Forest World Gravity Handler
// Handles forest-specific gravity behavior without affecting other worlds

/**
 * Forest World Gravity Manager
 * Provides forest-specific gravity behavior that preserves elevated positions
 */
class ForestWorldGravity {
    constructor() {
        this.isActive = false;
        console.log('🌲 ForestWorldGravity initialized');
    }

    /**
     * Set whether forest gravity rules are active
     */
    setActive(isForestWorld) {
        this.isActive = isForestWorld;
        console.log(`🌲 Forest gravity active: ${this.isActive}`);
    }

    /**
     * Check if an object should be exempt from gravity in forest world
     * Returns true if object should be preserved at its current position
     */
    shouldPreserveElevation(object, currentY) {
        if (!this.isActive) {
            return false; // Not in forest world, use standard gravity
        }

        // In forest world, preserve all elevated positions (like magical tree trunk support)
        if (currentY > 0.1) {
            console.log(`🌲 [FOREST-GRAVITY] Preserving elevation for ${object.userData?.fileName || object.userData?.name} at Y=${currentY.toFixed(2)} - tree trunk support`);
            return true;
        }

        return false; // Object is on ground, normal gravity applies
    }

    /**
     * Apply forest-specific position constraints
     * This ensures objects moved in forest world don't float in other worlds
     */
    applyForestConstraints(object, targetPosition, currentWorldType) {
        // Only apply forest constraints when actually in forest world
        if (currentWorldType !== 'forest') {
            return targetPosition; // Use standard world constraints
        }

        // In forest world, allow any Y position (tree trunks will provide visual support)
        return {
            x: targetPosition.x,
            y: Math.max(0.05, targetPosition.y), // Minimum ground clearance
            z: targetPosition.z
        };
    }

    /**
     * Handle world transition from forest to other worlds
     * Ensures objects don't float when switching away from forest
     */
    handleWorldTransition(object, newWorldType, stateManager) {
        // If switching FROM forest TO another world, apply proper gravity
        if (!this.isActive && object.position.y > 0.1) {
            console.log(`🌲 [WORLD-TRANSITION] Object ${object.userData?.fileName} was elevated in forest, applying gravity for ${newWorldType} world`);
            
            // Apply world-specific gravity through the standard system
            if (window.app && window.app.applyGravityToSpecificObject) {
                window.app.applyGravityToSpecificObject(object, newWorldType);
            }
        }
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.ForestWorldGravity = ForestWorldGravity;
    window.forestGravity = new ForestWorldGravity();
}

console.log('🌲 Forest World Gravity module loaded');
