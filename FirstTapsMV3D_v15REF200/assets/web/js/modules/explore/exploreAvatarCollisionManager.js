/**
 * EXPLORE AVATAR COLLISION MANAGER
 * Manages collision detection for the explore mode avatar using an invisible sphere
 * Provides easier targeting for double-tap interactions while avoiding interference with other objects
 */

class ExploreAvatarCollisionManager {
    constructor(app) {
        this.app = app;
        this.collisionSphere = null;
        this.exploreMode = null;
        
        // Collision sphere settings
        this.collisionRadius = 1.5; // Small sphere around avatar for easy targeting
        this.collisionHeight = 1.0; // Height offset from avatar base
    }
    
    /**
     * Set reference to explore mode
     */
    setExploreMode(exploreMode) {
        this.exploreMode = exploreMode;
    }
    
    /**
     * Create invisible collision sphere around avatar
     */
    createCollisionSphere(avatar) {
        if (!avatar || !this.app.scene) {
            console.warn('🎯 Cannot create collision sphere - missing avatar or scene');
            return;
        }
        
        // Remove existing collision sphere if any
        this.removeCollisionSphere();
        
        // Create invisible sphere geometry
        const sphereGeometry = new THREE.SphereGeometry(this.collisionRadius, 8, 8);
        
        // Create invisible material - transparent but still detectable by raycaster
        const invisibleMaterial = new THREE.MeshBasicMaterial({ 
            transparent: true, 
            opacity: 0,
            depthWrite: false,
            depthTest: false,
            colorWrite: false
            // Note: Don't set visible: false as it prevents raycasting
        });
        
        // Create collision sphere mesh
    this.collisionSphere = new THREE.Mesh(sphereGeometry, invisibleMaterial);
    this.collisionSphere.renderOrder = -1; // renderOrder belongs on the mesh
        
        // Position sphere around avatar center
        this.collisionSphere.position.set(0, this.collisionHeight, 0);
        
        // Add userData to identify this as avatar collision
        this.collisionSphere.userData = {
            type: 'avatarCollision',
            isAvatarCollisionSphere: true,
            parentAvatar: avatar,
            interactionType: 'exploreAvatarCustomization'
        };
        
        // Add to avatar group so it moves with avatar
        avatar.add(this.collisionSphere);
        
        console.log('🎯 Avatar collision sphere created with radius:', this.collisionRadius);
        
        return this.collisionSphere;
    }
    
    /**
     * Remove collision sphere
     */
    removeCollisionSphere() {
        if (this.collisionSphere) {
            // Remove from parent (avatar)
            if (this.collisionSphere.parent) {
                this.collisionSphere.parent.remove(this.collisionSphere);
            }
            
            // Clean up geometry and material
            if (this.collisionSphere.geometry) {
                this.collisionSphere.geometry.dispose();
            }
            if (this.collisionSphere.material) {
                this.collisionSphere.material.dispose();
            }
            
            this.collisionSphere = null;
            console.log('🎯 Avatar collision sphere removed');
        }
    }
    
    /**
     * Update collision sphere position (called when avatar moves)
     */
    updateCollisionSphere() {
        // Collision sphere automatically moves with avatar since it's a child
        // This method exists for future enhancements if needed
    }
    
    /**
     * Check if an object is the avatar collision sphere
     */
    isAvatarCollisionSphere(object) {
        return object && object.userData && object.userData.isAvatarCollisionSphere === true;
    }
    
    /**
     * Handle avatar collision sphere interaction
     */
    handleAvatarCollisionInteraction(collisionObject) {
        console.log('🎯 Avatar collision sphere double-tapped - using ContactCustomizationManager');
        
        // Use the existing ContactCustomizationManager with special explore avatar ID
        if (window.ContactCustomizationManager && window.ContactCustomizationManager.instance) {
            try {
                const contactData = {
                    name: 'Explore Avatar',
                    id: 'EXPLORE_AVATAR',
                    object: null // No actual contact object for explore avatar
                };
                
                const success = window.ContactCustomizationManager.instance.showCustomizationMenu('EXPLORE_AVATAR', contactData);
                if (success !== false) {
                    console.log('🎯 ✅ Avatar customization menu opened using ContactCustomizationManager');
                    return true;
                } else {
                    console.warn('🎯 ⚠️ Avatar customization menu failed to open');
                }
            } catch (error) {
                console.error('🎯 ❌ Error opening avatar customization:', error);
            }
        } else {
            console.error('🎯 ❌ ContactCustomizationManager not available');
        }
        
        return false;
    }
    
    /**
     * Get collision sphere world position
     */
    getCollisionSphereWorldPosition() {
        if (!this.collisionSphere) {
            return null;
        }
        
        const worldPosition = new THREE.Vector3();
        this.collisionSphere.getWorldPosition(worldPosition);
        return worldPosition;
    }
    
    /**
     * Get collision sphere radius
     */
    getCollisionRadius() {
        return this.collisionRadius;
    }
    
    /**
     * Set collision sphere radius (useful for testing different sizes)
     */
    setCollisionRadius(radius) {
        this.collisionRadius = radius;
        
        // Update existing sphere if it exists
        if (this.collisionSphere) {
            this.collisionSphere.geometry.dispose();
            this.collisionSphere.geometry = new THREE.SphereGeometry(this.collisionRadius, 8, 8);
            console.log('🎯 Collision sphere radius updated to:', this.collisionRadius);
        }
    }
    
    /**
     * Enable debug visualization (makes collision sphere visible)
     */
    enableDebugVisualization() {
        if (this.collisionSphere) {
            this.collisionSphere.material.visible = true;
            this.collisionSphere.material.opacity = 0.3;
            this.collisionSphere.material.color.setHex(0x00ff00); // Green wireframe
            this.collisionSphere.material.wireframe = true;
            console.log('🎯 Debug visualization enabled for avatar collision sphere');
        }
    }
    
    /**
     * Disable debug visualization (makes collision sphere invisible again)
     */
    disableDebugVisualization() {
        if (this.collisionSphere) {
            this.collisionSphere.material.visible = false;
            this.collisionSphere.material.opacity = 0;
            this.collisionSphere.material.wireframe = false;
            console.log('🎯 Debug visualization disabled for avatar collision sphere');
        }
    }
    
    /**
     * Static instance for singleton pattern
     */
    static instance = null;
    
    /**
     * Static initialization method
     */
    static initialize(app) {
        if (!ExploreAvatarCollisionManager.instance) {
            ExploreAvatarCollisionManager.instance = new ExploreAvatarCollisionManager(app);
            console.log('🎯 ExploreAvatarCollisionManager initialized');
        }
        return ExploreAvatarCollisionManager.instance;
    }
    
    /**
     * Static method to handle collision interaction
     */
    static handleAvatarCollisionInteraction(collisionObject) {
        if (ExploreAvatarCollisionManager.instance) {
            return ExploreAvatarCollisionManager.instance.handleAvatarCollisionInteraction(collisionObject);
        } else {
            console.error('🎯 ExploreAvatarCollisionManager not initialized');
            return false;
        }
    }
    
    /**
     * Static method to check if object is avatar collision sphere
     */
    static isAvatarCollisionSphere(object) {
        if (ExploreAvatarCollisionManager.instance) {
            return ExploreAvatarCollisionManager.instance.isAvatarCollisionSphere(object);
        }
        return false;
    }
}

// Export the manager
window.ExploreAvatarCollisionManager = ExploreAvatarCollisionManager;
