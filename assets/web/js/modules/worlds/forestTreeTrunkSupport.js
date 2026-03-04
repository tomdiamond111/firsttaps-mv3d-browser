// Forest Tree Trunk Support System
// Creates visual tree trunks that dynamically extend from ground to support elevated objects in forest world

/**
 * Tree Trunk Support Manager for Forest World
 * Manages visual tree trunks that support elevated objects
 */
class ForestTreeTrunkSupport {
    constructor(scene, THREE) {
        this.scene = scene;
        this.THREE = THREE;
        this.treeTrunks = new Map(); // objectId -> trunk mesh
        this.isForestWorld = false;
        
        // Initialize leaves system
        if (window.ForestTreeLeavesSystem) {
            this.leavesSystem = new window.ForestTreeLeavesSystem(scene, THREE);
        }
        
        console.log('🌲 ForestTreeTrunkSupport initialized with leaves system');
    }

    /**
     * Enable/disable tree trunk support based on world type
     */
    setWorldType(worldType) {
        const wasForestWorld = this.isForestWorld;
        this.isForestWorld = worldType === 'forest';
        
        console.log(`🌲 World type changed to: ${worldType}, forest support: ${this.isForestWorld}`);
        
        // Update leaves system too
        if (this.leavesSystem) {
            this.leavesSystem.setWorldType(worldType);
        }
        
        // If switching away from forest world, remove all tree trunks
        if (wasForestWorld && !this.isForestWorld) {
            this.removeAllTreeTrunks();
        }
        
        // If switching to forest world, create tree trunks for elevated objects
        if (!wasForestWorld && this.isForestWorld) {
            this.updateAllTreeTrunks();
        }
    }

    /**
     * Update tree trunk for a specific object
     */
    updateTreeTrunk(object) {
        if (!this.isForestWorld) {
            return;
        }

        const objectId = this.getObjectId(object);
        const currentY = object.position.y;
        
        // If object is on ground level (Y <= 0.1), remove tree trunk
        if (currentY <= 0.1) {
            this.removeTreeTrunk(objectId);
            return;
        }

        // Object is elevated, create or update tree trunk
        const existingTrunk = this.treeTrunks.get(objectId);
        
        if (existingTrunk) {
            // Update existing trunk height
            this.updateTrunkHeight(existingTrunk, currentY, object.position);
        } else {
            // Create new tree trunk
            this.createTreeTrunk(objectId, object.position, currentY);
        }
    }

    /**
     * Create a new tree trunk for an elevated object
     */
    createTreeTrunk(objectId, position, height) {
        try {
            // Create trunk geometry - cylinder from ground to object
            const trunkRadius = 0.4; // Thicker trunk for better visibility
            const trunkHeight = height;
            const trunkGeometry = new this.THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, trunkHeight, 8);
            
            // Brown bark material
            const trunkMaterial = new this.THREE.MeshLambertMaterial({
                color: 0x8B4513, // SaddleBrown
                roughness: 0.8
            });
            
            const trunkMesh = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
            
            // Position trunk - center at half height, same X/Z as object
            trunkMesh.position.set(position.x, trunkHeight / 2, position.z);
            
            // Mark as tree trunk for identification
            trunkMesh.userData = {
                isTreeTrunk: true,
                supportingObjectId: objectId,
                trunkType: 'support'
            };
            
            this.scene.add(trunkMesh);
            this.treeTrunks.set(objectId, trunkMesh);
            
            // Create leaves at the top of the trunk
            if (this.leavesSystem) {
                const objectType = this.getObjectTypeFromId(objectId);
                this.leavesSystem.createLeavesForObject(objectId, position, height, objectType);
            }
            
            console.log(`🌲 Created tree trunk for object ${objectId} at height ${height.toFixed(2)}`);
            
        } catch (error) {
            console.error('🌲 Error creating tree trunk:', error);
        }
    }

    /**
     * Update the height of an existing tree trunk
     */
    updateTrunkHeight(trunkMesh, newHeight, newPosition) {
        try {
            // Remove old trunk
            this.scene.remove(trunkMesh);
            if (trunkMesh.geometry) trunkMesh.geometry.dispose();
            if (trunkMesh.material) trunkMesh.material.dispose();
            
            // Create new trunk with updated height
            const objectId = trunkMesh.userData.supportingObjectId;
            this.createTreeTrunk(objectId, newPosition, newHeight);
            
        } catch (error) {
            console.error('🌲 Error updating tree trunk height:', error);
        }
    }

    /**
     * Remove tree trunk for a specific object
     */
    removeTreeTrunk(objectId) {
        const trunkMesh = this.treeTrunks.get(objectId);
        if (trunkMesh) {
            try {
                this.scene.remove(trunkMesh);
                if (trunkMesh.geometry) trunkMesh.geometry.dispose();
                if (trunkMesh.material) trunkMesh.material.dispose();
                this.treeTrunks.delete(objectId);
                
                // Remove associated leaves
                if (this.leavesSystem) {
                    this.leavesSystem.removeLeaves(objectId);
                }
                
                console.log(`🌲 Removed tree trunk for object ${objectId}`);
            } catch (error) {
                console.error('🌲 Error removing tree trunk:', error);
            }
        }
    }

    /**
     * Update all tree trunks for current objects
     */
    updateAllTreeTrunks() {
        if (!this.isForestWorld) {
            return;
        }

        // Get all file objects
        const allObjects = window.app?.stateManager?.fileObjects || [];
        
        for (const obj of allObjects) {
            this.updateTreeTrunk(obj);
        }
    }

    /**
     * Remove all tree trunks (when switching away from forest world)
     */
    removeAllTreeTrunks() {
        console.log(`🌲 Removing all ${this.treeTrunks.size} tree trunks`);
        
        for (const [objectId, trunkMesh] of this.treeTrunks) {
            try {
                this.scene.remove(trunkMesh);
                if (trunkMesh.geometry) trunkMesh.geometry.dispose();
                if (trunkMesh.material) trunkMesh.material.dispose();
            } catch (error) {
                console.error('🌲 Error removing tree trunk during cleanup:', error);
            }
        }
        
        this.treeTrunks.clear();
    }

    /**
     * Get unique identifier for an object
     */
    getObjectId(object) {
        return object.userData?.fileId || 
               object.userData?.fileName || 
               object.userData?.id || 
               object.uuid;
    }

    /**
     * Determine object type from object ID by finding the object
     */
    getObjectTypeFromId(objectId) {
        // Try to find the object to determine its type
        const allObjects = window.app?.stateManager?.fileObjects || [];
        const foundObject = allObjects.find(obj => this.getObjectId(obj) === objectId);
        
        if (foundObject) {
            if (foundObject.userData.isContact) return 'contact';
            if (foundObject.userData.isFile) return 'file';
            if (foundObject.userData.isApp) return 'app';
            if (foundObject.userData.isLink) return 'link';
            
            // Enhanced link detection: check for "link:" in ID or mime type
            const objectDataId = foundObject.userData.id || objectId || '';
            const mimeType = foundObject.userData.mimeType || foundObject.userData.type || '';
            if (objectDataId.includes('link:') || objectDataId.includes('link') || 
                mimeType.includes('link') || mimeType.includes('url')) {
                return 'link';
            }
            
            // Check for URL patterns in various properties
            const fileName = foundObject.userData.fileName || foundObject.userData.name || '';
            const fileDataUrl = foundObject.userData.fileDataUrl || '';
            const url = foundObject.userData.url || '';
            
            if (fileName.includes('http') || fileName.includes('www') ||
                fileDataUrl.includes('http') || url.includes('http')) {
                return 'link';
            }
            
            // File extension check
            if (fileName.includes('.')) return 'file';
        }
        
        // Additional ID pattern check for cases where object isn't found in stateManager
        if (objectId && objectId.includes('link:')) {
            return 'link';
        }
        
        return 'file'; // Default to file type
    }

    /**
     * Clean up tree trunks for objects that no longer exist
     */
    cleanupOrphanedTrunks() {
        if (!this.isForestWorld) {
            return;
        }

        const allObjects = window.app?.stateManager?.fileObjects || [];
        const existingObjectIds = new Set(allObjects.map(obj => this.getObjectId(obj)));
        
        // Remove trunks for objects that no longer exist
        for (const [objectId, trunkMesh] of this.treeTrunks) {
            if (!existingObjectIds.has(objectId)) {
                console.log(`🌲 Removing orphaned tree trunk for object ${objectId}`);
                this.removeTreeTrunk(objectId);
            }
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ForestTreeTrunkSupport = ForestTreeTrunkSupport;
}

console.log('🌲 Forest Tree Trunk Support module loaded');
