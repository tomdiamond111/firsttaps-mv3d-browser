// Forest World Integration
// Coordinates tree trunk support and gravity for forest-style worlds (forest and cave)

/**
 * Forest World Integration Manager
 * Coordinates all forest-specific systems without affecting other worlds
 * Now supports both Forest Realm and Cave Explorer worlds
 */
class ForestWorldIntegration {
    constructor() {
        this.isForestWorld = false;
        this.initialized = false;
        console.log('🌲 ForestWorldIntegration initialized');
    }

    /**
     * Initialize forest systems when app is ready
     */
    initialize(app) {
        if (this.initialized) return;

        this.app = app;
        
        // Initialize tree trunk support if available
        if (window.ForestTreeTrunkSupport && app.scene && app.THREE) {
            this.treeTrunkSupport = new window.ForestTreeTrunkSupport(app.scene, app.THREE);
        }

        // Initialize forest gravity if available
        if (window.forestGravity) {
            this.forestGravity = window.forestGravity;
        }

        this.initialized = true;
        console.log('🌲 Forest systems initialized');
    }

    /**
     * Handle world type change
     */
    setWorldType(worldType) {
        const wasForestWorld = this.isForestWorld;
        // Include both forest and cave worlds since Cave Explorer extends Forest Realm functionality
        this.isForestWorld = worldType === 'forest' || worldType === 'cave';

        console.log(`🌲 Forest integration - world type: ${worldType}, is forest-style world: ${this.isForestWorld}`);

        // Update tree trunk support
        if (this.treeTrunkSupport) {
            this.treeTrunkSupport.setWorldType(worldType);
        }

        // Update forest gravity (applies to both forest and cave worlds)
        if (this.forestGravity) {
            this.forestGravity.setActive(this.isForestWorld);
        }

        // Handle transition away from forest-style world
        if (wasForestWorld && !this.isForestWorld) {
            this.handleForestExit(worldType);
        }
    }

    /**
     * Handle object movement in forest-style world (forest and cave)
     */
    onObjectMoved(object) {
        if (!this.isForestWorld) return;

        // Update tree trunk for moved object (works for both forest trees and cave stalagmites)
        if (this.treeTrunkSupport) {
            this.treeTrunkSupport.updateTreeTrunk(object);
        }
    }

    /**
     * Handle object addition in forest-style world (forest and cave)
     */
    onObjectAdded(object) {
        if (!this.isForestWorld) return;

        // Create tree trunk/stalagmite if object is elevated
        if (this.treeTrunkSupport && object.position.y > 0.1) {
            this.treeTrunkSupport.updateTreeTrunk(object);
        }
    }

    /**
     * Handle object removal from forest-style world (forest and cave)
     */
    onObjectRemoved(objectId) {
        if (!this.isForestWorld) return;

        // Remove associated tree trunk/stalagmite
        if (this.treeTrunkSupport) {
            this.treeTrunkSupport.removeTreeTrunk(objectId);
        }
    }

    /**
     * Check if object should be exempt from gravity (forest-specific)
     */
    shouldPreserveElevation(object, currentY) {
        if (!this.forestGravity) return false;
        return this.forestGravity.shouldPreserveElevation(object, currentY);
    }

    /**
     * Handle transition away from forest-style world (forest or cave)
     */
    handleForestExit(newWorldType) {
        console.log(`🌲 Exiting forest-style world, transitioning to: ${newWorldType}`);

        // Apply gravity to all elevated objects when leaving forest-style world
        const allObjects = this.app?.stateManager?.fileObjects || [];
        
        for (const object of allObjects) {
            if (object.position.y > 0.1) {
                console.log(`🌲 Applying gravity to elevated object: ${object.userData?.fileName} (Y=${object.position.y.toFixed(2)})`);
                
                // Apply world-specific gravity
                if (this.app.applyGravityToSpecificObject) {
                    this.app.applyGravityToSpecificObject(object, newWorldType);
                }
            }
        }
    }

    /**
     * Update all forest-style systems (forest and cave)
     */
    updateAll() {
        if (!this.isForestWorld) return;

        // Update all tree trunks/stalagmites
        if (this.treeTrunkSupport) {
            this.treeTrunkSupport.updateAllTreeTrunks();
        }
    }

    /**
     * Clean up orphaned resources
     */
    cleanup() {
        if (this.treeTrunkSupport) {
            this.treeTrunkSupport.cleanupOrphanedTrunks();
        }
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.ForestWorldIntegration = ForestWorldIntegration;
    window.forestIntegration = new ForestWorldIntegration();
}

console.log('🌲 Forest World Integration module loaded');
