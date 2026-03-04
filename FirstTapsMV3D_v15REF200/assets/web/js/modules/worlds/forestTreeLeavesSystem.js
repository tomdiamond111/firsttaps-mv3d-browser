// Forest Tree Leaves System
// Creates different types of leaves at the top of tree trunks based on object type

/**
 * Forest Tree Leaves System
 * Creates object-type-specific leaves at the top of tree trunks
 */
class ForestTreeLeavesSystem {
    constructor(scene, THREE) {
        this.scene = scene;
        this.THREE = THREE;
        this.leavesMap = new Map(); // objectId -> leaves mesh group
        this.isForestWorld = false;
        
        console.log('🍃 ForestTreeLeavesSystem initialized');
    }

    /**
     * Enable/disable leaves system based on world type
     */
    setWorldType(worldType) {
        const wasForestWorld = this.isForestWorld;
        this.isForestWorld = worldType === 'forest';
        
        console.log(`🍃 World type changed to: ${worldType}, leaves support: ${this.isForestWorld}`);
        
        // If switching away from forest world, remove all leaves
        if (wasForestWorld && !this.isForestWorld) {
            this.removeAllLeaves();
        }
    }

    /**
     * Create leaves for an elevated object at the top of its tree trunk
     */
    createLeavesForObject(objectId, position, height, objectType) {
        if (!this.isForestWorld || height <= 0.1) {
            return;
        }

        // Remove existing leaves if any
        this.removeLeaves(objectId);

        const leavesGroup = new this.THREE.Group();
        // Position leaves 2-3 units below the object so they appear under it
        const leavesY = height - 2.5; // Leaves positioned below the object

        switch (objectType) {
            case 'contact':
                this.createPalmLeaves(leavesGroup, leavesY);
                break;
            case 'file':
                this.createMapleLeaves(leavesGroup, leavesY);
                break;
            case 'app':
                this.createPineLeaves(leavesGroup, leavesY);
                break;
            case 'link':
                this.createAppleTreeLeaves(leavesGroup, leavesY);
                break;
            default:
                this.createMapleLeaves(leavesGroup, leavesY); // Default to maple
        }

        // Position the leaves group at the base XZ position of the trunk
        leavesGroup.position.set(position.x, 0, position.z);
        leavesGroup.userData = {
            isTreeLeaves: true,
            supportingObjectId: objectId,
            objectType: objectType
        };

        this.scene.add(leavesGroup);
        this.leavesMap.set(objectId, leavesGroup);

        console.log(`🍃 Created ${objectType} leaves for object ${objectId} at height ${leavesY.toFixed(2)}`);
    }

    /**
     * Create palm tree leaves for contact objects
     */
    createPalmLeaves(group, leavesY) {
        const frondCount = 6; // Six palm fronds
        
        for (let i = 0; i < frondCount; i++) {
            const angle = (i / frondCount) * Math.PI * 2;
            
            // Create a branch first (must connect to trunk center)
            const branchLength = 1.2;
            const branchGeometry = new this.THREE.CylinderGeometry(0.05, 0.08, branchLength, 6);
            const branchMaterial = new this.THREE.MeshLambertMaterial({
                color: 0x8B4513 // Brown branch
            });
            
            const branch = new this.THREE.Mesh(branchGeometry, branchMaterial);
            branch.userData = { isTreeBranch: true, nonInteractive: true };
            
            // Position branch from trunk center outward
            branch.position.set(
                Math.cos(angle) * (branchLength / 2),
                leavesY,
                Math.sin(angle) * (branchLength / 2)
            );
            
            // Rotate branch to point outward from center
            branch.rotation.z = angle + Math.PI / 2;
            
            group.add(branch);
            
            // Now create palm frond at the end of the branch
            const frondGeometry = new this.THREE.PlaneGeometry(1.8, 0.6, 4, 2);
            const frondMaterial = new this.THREE.MeshLambertMaterial({
                color: 0x228B22, // Forest green
                side: this.THREE.DoubleSide
            });
            
            const frond = new this.THREE.Mesh(frondGeometry, frondMaterial);
            frond.userData = { isTreeLeaf: true, nonInteractive: true };
            
            // Position frond at the end of the branch
            frond.position.set(
                Math.cos(angle) * branchLength,
                leavesY + 0.1,
                Math.sin(angle) * branchLength
            );
            
            // Rotate frond to face outward and droop slightly
            frond.rotation.y = angle;
            frond.rotation.x = Math.PI * 0.2; // Downward droop
            
            group.add(frond);
        }

        console.log(`🌴 Created ${frondCount} palm fronds with branches at Y=${leavesY.toFixed(2)}`);
    }

    /**
     * Create maple tree leaves for file objects
     */
    createMapleLeaves(group, leavesY) {
        const branchCount = 4;
        const branchLength = 1.8;

        for (let i = 0; i < branchCount; i++) {
            const angle = (i / branchCount) * Math.PI * 2;
            
            // Create branch that extends from trunk center outward
            const branchGeometry = new this.THREE.CylinderGeometry(0.05, 0.05, branchLength, 4);
            const branchMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const branch = new this.THREE.Mesh(branchGeometry, branchMaterial);
            
            // Position branch horizontally extending from trunk
            const branchX = Math.cos(angle) * branchLength * 0.5;
            const branchZ = Math.sin(angle) * branchLength * 0.5;
            
            branch.position.set(branchX, leavesY, branchZ);
            branch.rotation.z = angle; // Point outward from center
            branch.rotation.y = Math.PI / 2; // Horizontal orientation
            
            group.add(branch);
            
            // Add leaves clustered at the end of each branch
            const leafClusterCount = 4;
            for (let j = 0; j < leafClusterCount; j++) {
                const leafGeometry = new this.THREE.CircleGeometry(0.4, 5); // Pentagon-like maple leaf
                const leafMaterial = new this.THREE.MeshLambertMaterial({
                    color: 0x32CD32, // Lime green
                    side: this.THREE.DoubleSide
                });
                
                const leaf = new this.THREE.Mesh(leafGeometry, leafMaterial);
                
                // Position leaves at the end of the branch with some clustering
                const leafOffsetX = Math.cos(angle) * branchLength + (Math.random() - 0.5) * 0.3;
                const leafOffsetZ = Math.sin(angle) * branchLength + (Math.random() - 0.5) * 0.3;
                const leafOffsetY = (Math.random() - 0.5) * 0.2; // Small Y variation
                
                leaf.position.set(
                    leafOffsetX,
                    leavesY + leafOffsetY,
                    leafOffsetZ
                );
                
                // Random rotation for natural look
                leaf.rotation.z = Math.random() * Math.PI * 2;
                
                group.add(leaf);
            }
        }

        console.log(`🍁 Created ${branchCount} maple branches with leaves at Y=${leavesY.toFixed(2)}`);
    }

    /**
     * Create pine tree leaves for app objects
     */
    createPineLeaves(group, leavesY) {
        const layerCount = 3;
        const baseRadius = 1.5;

        for (let layer = 0; layer < layerCount; layer++) {
            const layerY = leavesY + layer * 0.4;
            const layerRadius = baseRadius * (1 - layer * 0.25);
            const branchCount = Math.max(8, 12 - layer * 2);

            // Create main branches for this layer
            for (let i = 0; i < branchCount; i++) {
                const angle = (i / branchCount) * Math.PI * 2;
                
                // Create branch extending from trunk center
                const branchLength = layerRadius;
                const branchGeometry = new this.THREE.CylinderGeometry(0.04, 0.06, branchLength, 4);
                const branchMaterial = new this.THREE.MeshLambertMaterial({
                    color: 0x8B4513 // Brown
                });
                
                const branch = new this.THREE.Mesh(branchGeometry, branchMaterial);
                
                // Position branch horizontally from trunk center
                branch.position.set(
                    Math.cos(angle) * (branchLength / 2),
                    layerY,
                    Math.sin(angle) * (branchLength / 2)
                );
                
                // Rotate branch to extend horizontally outward
                branch.rotation.z = angle + Math.PI / 2;
                branch.rotation.x = -Math.PI * 0.1; // Slight downward tilt
                
                group.add(branch);
                
                // Add pine needles along the branch
                const needleClusterCount = 4;
                for (let j = 0; j < needleClusterCount; j++) {
                    const needlePosition = (j + 1) / needleClusterCount; // Position along branch
                    const needlesPerCluster = 8;
                    
                    for (let k = 0; k < needlesPerCluster; k++) {
                        const needleAngle = (k / needlesPerCluster) * Math.PI * 2;
                        
                        const needleGeometry = new this.THREE.CylinderGeometry(0.01, 0.01, 0.4, 3);
                        const needleMaterial = new this.THREE.MeshLambertMaterial({
                            color: 0x006400 // Dark green
                        });
                        
                        const needle = new this.THREE.Mesh(needleGeometry, needleMaterial);
                        
                        // Position needle at point along branch
                        const branchPointX = Math.cos(angle) * branchLength * needlePosition;
                        const branchPointZ = Math.sin(angle) * branchLength * needlePosition;
                        
                        needle.position.set(
                            branchPointX + Math.cos(needleAngle) * 0.15,
                            layerY + Math.sin(needleAngle) * 0.1,
                            branchPointZ + Math.sin(needleAngle) * 0.15
                        );
                        
                        // Point needles outward and slightly downward
                        needle.rotation.z = angle + needleAngle;
                        needle.rotation.x = Math.PI * 0.3; // Downward angle
                        
                        group.add(needle);
                    }
                }
            }
        }

        console.log(`🌲 Created ${layerCount} pine needle layers with branches at Y=${leavesY.toFixed(2)}`);
    }

    /**
     * Create apple tree leaves for link objects
     */
    createAppleTreeLeaves(group, leavesY) {
        const branchCount = 4;
        const branchLength = 1.6;

        for (let i = 0; i < branchCount; i++) {
            const angle = (i / branchCount) * Math.PI * 2;
            
            // Create main branch extending from trunk center (MUST connect to center)
            const branchGeometry = new this.THREE.CylinderGeometry(0.06, 0.08, branchLength, 6);
            const branchMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const branch = new this.THREE.Mesh(branchGeometry, branchMaterial);
            
            // Position branch so it starts at trunk center and extends outward
            branch.position.set(
                Math.cos(angle) * (branchLength / 2), // Half the branch length from center
                leavesY,
                Math.sin(angle) * (branchLength / 2)
            );
            
            // Rotate branch to extend horizontally from center
            branch.rotation.z = angle + Math.PI / 2;
            branch.rotation.x = -Math.PI * 0.1; // Slight downward angle
            
            group.add(branch);
            
            // Add smaller twigs at the end of main branch
            const twigCount = 3;
            for (let t = 0; t < twigCount; t++) {
                const twigAngle = angle + (t - 1) * 0.4; // Spread twigs around main branch
                const twigLength = 0.4;
                
                const twigGeometry = new this.THREE.CylinderGeometry(0.03, 0.04, twigLength, 4);
                const twig = new this.THREE.Mesh(twigGeometry, branchMaterial);
                
                // Position twig at end of main branch
                const branchEndX = Math.cos(angle) * branchLength;
                const branchEndZ = Math.sin(angle) * branchLength;
                
                twig.position.set(
                    branchEndX + Math.cos(twigAngle) * (twigLength / 2),
                    leavesY - 0.1,
                    branchEndZ + Math.sin(twigAngle) * (twigLength / 2)
                );
                
                twig.rotation.z = twigAngle + Math.PI / 2;
                twig.rotation.x = -Math.PI * 0.2; // More downward angle for twigs
                
                group.add(twig);
                
                // Add leaves at the end of each twig
                const leafClusterSize = 2;
                for (let l = 0; l < leafClusterSize; l++) {
                    const leafGeometry = new this.THREE.PlaneGeometry(0.4, 0.6);
                    const leafMaterial = new this.THREE.MeshLambertMaterial({
                        color: 0x228B22, // Forest green
                        side: this.THREE.DoubleSide
                    });
                    
                    const leaf = new this.THREE.Mesh(leafGeometry, leafMaterial);
                    
                    // Position leaves at end of twig
                    leaf.position.set(
                        branchEndX + Math.cos(twigAngle) * twigLength + (Math.random() - 0.5) * 0.1,
                        leavesY - 0.1 + (Math.random() - 0.5) * 0.1,
                        branchEndZ + Math.sin(twigAngle) * twigLength + (Math.random() - 0.5) * 0.1
                    );
                    
                    leaf.rotation.z = Math.random() * Math.PI * 2;
                    
                    group.add(leaf);
                }
                
                // Add apple hanging from twig (high chance for visibility)
                if (Math.random() > 0.2) { // 80% chance of apple on twig
                    const appleGeometry = new this.THREE.SphereGeometry(0.15, 8, 6);
                    const appleMaterial = new this.THREE.MeshLambertMaterial({ 
                        color: 0xFF0000 // Bright red apple
                    });
                    const apple = new this.THREE.Mesh(appleGeometry, appleMaterial);
                    
                    // Hang apple below the twig end
                    apple.position.set(
                        branchEndX + Math.cos(twigAngle) * twigLength,
                        leavesY - 0.4, // Hang well below twig
                        branchEndZ + Math.sin(twigAngle) * twigLength
                    );
                    
                    group.add(apple);
                }
            }
        }

        console.log(`🍎 Created ${branchCount} apple tree branches with twigs, leaves, and apples at Y=${leavesY.toFixed(2)}`);
    }

    /**
     * Update leaves for an object (when trunk height changes)
     */
    updateLeavesForObject(objectId, position, height, objectType) {
        this.createLeavesForObject(objectId, position, height, objectType);
    }

    /**
     * Remove leaves for a specific object
     */
    removeLeaves(objectId) {
        const leavesGroup = this.leavesMap.get(objectId);
        if (leavesGroup) {
            try {
                // Dispose of all geometries and materials
                leavesGroup.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                
                this.scene.remove(leavesGroup);
                this.leavesMap.delete(objectId);
                
                console.log(`🍃 Removed leaves for object ${objectId}`);
            } catch (error) {
                console.error('🍃 Error removing leaves:', error);
            }
        }
    }

    /**
     * Remove all leaves (when switching away from forest world)
     */
    removeAllLeaves() {
        console.log(`🍃 Removing all ${this.leavesMap.size} leaves groups`);
        
        for (const [objectId, leavesGroup] of this.leavesMap) {
            try {
                leavesGroup.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                
                this.scene.remove(leavesGroup);
            } catch (error) {
                console.error('🍃 Error removing leaves during cleanup:', error);
            }
        }
        
        this.leavesMap.clear();
    }

    /**
     * Determine object type from object userData
     */
    getObjectType(object) {
        if (object.userData.isContact) return 'contact';
        if (object.userData.isFile) return 'file';
        if (object.userData.isApp) return 'app';
        if (object.userData.isLink) return 'link';
        
        // Enhanced link detection: check for "link:" in ID or mime type
        const objectDataId = object.userData.id || '';
        const mimeType = object.userData.mimeType || object.userData.type || '';
        if (objectDataId.includes('link:') || objectDataId.includes('link') || 
            mimeType.includes('link') || mimeType.includes('url')) {
            return 'link';
        }
        
        // Check for URL patterns in various properties
        const fileName = object.userData.fileName || object.userData.name || '';
        const fileDataUrl = object.userData.fileDataUrl || '';
        const url = object.userData.url || '';
        
        if (fileName.includes('http') || fileName.includes('www') ||
            fileDataUrl.includes('http') || url.includes('http')) {
            return 'link';
        }
        
        // File extension check
        if (fileName.includes('.')) return 'file';
        
        return 'file'; // Default to file type
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ForestTreeLeavesSystem = ForestTreeLeavesSystem;
}

console.log('🍃 Forest Tree Leaves System module loaded');
