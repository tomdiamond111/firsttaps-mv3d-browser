/**
 * ENTITY COLLECTION TEMPLATE - LEVEL X
 * Copy this template to create new entity collection levels
 * 
 * Instructions:
 * 1. Replace "LevelX" with actual level number (e.g., "Level8")
 * 2. Replace entity names and descriptions
 * 3. Set appropriate point values (incremental: Level 8 = 800-1200, Level 9 = 900-1300)
 * 4. Choose movement patterns from MovementPatterns helper
 * 5. Update LEVEL_X_ENTITIES array at bottom
 */

/**
 * SHARED MATERIALS - Available to all Level X entities
 * Reuse materials to optimize performance
 */
const SharedMaterialsLevelX = {
    // Add your materials here
    primary: new THREE.MeshPhongMaterial({ 
        color: 0xFF6B35,
        shininess: 100,
        specular: 0x333333
    }),
    secondary: new THREE.MeshPhongMaterial({ 
        color: 0x4ECDC4,
        shininess: 150,
        specular: 0x666666
    }),
    accent: new THREE.MeshPhongMaterial({ 
        color: 0xFFE66D,
        shininess: 200,
        specular: 0x999999
    })
};

/**
 * ENTITY 1 - Level X.1 (800 points)
 * [Description of entity behavior]
 */
class EntityName1 extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'entity_name_1',
            pointValue: 800,
            level: 15, // Level 8 = 15, Level 9 = 16, etc.
            moveSpeed: 0.06,
            rotationSpeed: 0.03,
            clickable: true,
            description: 'Entity Name 1'
        });
        
        // Use movement pattern helper
        MovementPatterns.setupBouncingMovement(this, {
            bounds: { 
                x: { min: -120, max: 120 }, 
                y: { min: 1, max: 15 }, 
                z: { min: -120, max: 120 } 
            },
            velocity: { x: 0.04, y: 0.05, z: 0.03 }
        });
        
        this.createMesh();
        this.positionAtWorldEdge();
    }
    
    createMesh() {
        // Create your entity geometry here
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const mesh = new THREE.Mesh(geometry, SharedMaterialsLevelX.primary);
        this.group.add(mesh);
    }
    
    updateMovement(deltaTime) {
        // Use movement pattern helper
        MovementPatterns.updateBouncingMovement(this, deltaTime);
        
        // Add custom behavior here
        this.group.rotation.y += this.rotationSpeed;
    }

    cleanup() {
        super.dispose();
    }

    animateClick() {
        super.animateClick();
    }

    update(currentTime) {
        if (!this.isActive) return;
        super.update();
        
        const deltaTime = currentTime - (this.lastUpdateTime || currentTime);
        this.lastUpdateTime = currentTime;
        this.updateMovement(deltaTime);
    }
}

/**
 * ENTITY 2 - Level X.2 (900 points)
 * [Description of entity behavior]
 */
class EntityName2 extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'entity_name_2',
            pointValue: 900,
            level: 15,
            moveSpeed: 0.07,
            rotationSpeed: 0.04,
            clickable: true,
            description: 'Entity Name 2'
        });
        
        // Use circular movement pattern
        MovementPatterns.setupCircularMovement(this, {
            centerRange: { x: 100, z: 100 }, // Random center within ±100 units
            radius: { min: 20, max: 40 },
            height: { min: 8, max: 18 },
            speed: 0.03
        });
        
        this.createMesh();
        this.positionAtWorldEdge();
    }
    
    createMesh() {
        const geometry = new THREE.SphereGeometry(0.8, 12, 12);
        const mesh = new THREE.Mesh(geometry, SharedMaterialsLevelX.secondary);
        this.group.add(mesh);
    }
    
    updateMovement(deltaTime) {
        MovementPatterns.updateCircularMovement(this, deltaTime);
    }

    cleanup() {
        super.dispose();
    }

    animateClick() {
        super.animateClick();
    }

    update(currentTime) {
        if (!this.isActive) return;
        super.update();
        
        const deltaTime = currentTime - (this.lastUpdateTime || currentTime);
        this.lastUpdateTime = currentTime;
        this.updateMovement(deltaTime);
    }
}

/**
 * ENTITY 3 - Level X.3 (1000 points)
 * [Description of entity behavior]
 */
class EntityName3 extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'entity_name_3',
            pointValue: 1000,
            level: 15,
            moveSpeed: 0.08,
            rotationSpeed: 0.05,
            clickable: true,
            description: 'Entity Name 3'
        });
        
        // Use fly-through movement pattern
        MovementPatterns.setupFlyThroughMovement(this, {
            worldSize: 140,
            height: { min: 10, max: 20 },
            speed: 0.12
        });
        
        this.createMesh();
        this.positionAtWorldEdge();
    }
    
    createMesh() {
        const geometry = new THREE.ConeGeometry(0.6, 1.5, 8);
        const mesh = new THREE.Mesh(geometry, SharedMaterialsLevelX.accent);
        this.group.add(mesh);
    }
    
    updateMovement(deltaTime) {
        MovementPatterns.updateFlyThroughMovement(this, deltaTime);
    }

    cleanup() {
        super.dispose();
    }

    animateClick() {
        super.animateClick();
    }

    update(currentTime) {
        if (!this.isActive) return;
        super.update();
        
        const deltaTime = currentTime - (this.lastUpdateTime || currentTime);
        this.lastUpdateTime = currentTime;
        this.updateMovement(deltaTime);
    }
}

/**
 * ENTITY 4 - Level X.4 (1100 points)
 * [Description of entity behavior]
 */
class EntityName4 extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'entity_name_4',
            pointValue: 1100,
            level: 15,
            moveSpeed: 0.05,
            rotationSpeed: 0.02,
            clickable: true,
            description: 'Entity Name 4'
        });
        
        // Use hybrid movement pattern
        MovementPatterns.setupHybridMovement(this, {
            bounds: { 
                x: { min: -130, max: 130 }, 
                y: { min: 2, max: 18 }, 
                z: { min: -130, max: 130 } 
            },
            patterns: ['bouncing', 'circular'],
            switchInterval: 10000 // Switch every 10 seconds
        });
        
        this.createMesh();
        this.positionAtWorldEdge();
    }
    
    createMesh() {
        const geometry = new THREE.CylinderGeometry(0.5, 0.8, 1.2, 6);
        const mesh = new THREE.Mesh(geometry, SharedMaterialsLevelX.primary);
        this.group.add(mesh);
    }
    
    updateMovement(deltaTime) {
        MovementPatterns.updateHybridMovement(this, deltaTime);
    }

    cleanup() {
        super.dispose();
    }

    animateClick() {
        super.animateClick();
    }

    update(currentTime) {
        if (!this.isActive) return;
        super.update();
        
        const deltaTime = currentTime - (this.lastUpdateTime || currentTime);
        this.lastUpdateTime = currentTime;
        this.updateMovement(deltaTime);
    }
}

/**
 * ENTITY 5 - Level X.5 (1200 points)
 * [Description of entity behavior]
 */
class EntityName5 extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'entity_name_5',
            pointValue: 1200,
            level: 15,
            moveSpeed: 0.04,
            rotationSpeed: 0.06,
            clickable: true,
            description: 'Entity Name 5'
        });
        
        // Custom movement - mix of patterns
        this.setupCustomMovement();
        
        this.createMesh();
        this.positionAtWorldEdge();
    }
    
    setupCustomMovement() {
        // Example: Start with bouncing, switch to circular after time
        this.movementState = 'bouncing';
        this.stateTimer = 0;
        this.switchThreshold = 15000; // 15 seconds
        
        MovementPatterns.setupBouncingMovement(this, {
            bounds: { 
                x: { min: -140, max: 140 }, 
                y: { min: 1, max: 20 }, 
                z: { min: -140, max: 140 } 
            },
            velocity: { x: 0.03, y: 0.04, z: 0.035 }
        });
    }
    
    createMesh() {
        const geometry = new THREE.OctahedronGeometry(1);
        const mesh = new THREE.Mesh(geometry, SharedMaterialsLevelX.accent);
        this.group.add(mesh);
    }
    
    updateMovement(deltaTime) {
        this.stateTimer += deltaTime;
        
        if (this.stateTimer > this.switchThreshold) {
            if (this.movementState === 'bouncing') {
                this.movementState = 'circular';
                MovementPatterns.setupCircularMovement(this, {
                    centerRange: { x: 120, z: 120 },
                    radius: { min: 25, max: 45 },
                    height: { min: 5, max: 15 },
                    speed: 0.02
                });
            } else {
                this.movementState = 'bouncing';
                MovementPatterns.setupBouncingMovement(this, {
                    bounds: { 
                        x: { min: -140, max: 140 }, 
                        y: { min: 1, max: 20 }, 
                        z: { min: -140, max: 140 } 
                    },
                    velocity: { x: 0.03, y: 0.04, z: 0.035 }
                });
            }
            this.stateTimer = 0;
        }
        
        if (this.movementState === 'bouncing') {
            MovementPatterns.updateBouncingMovement(this, deltaTime);
        } else {
            MovementPatterns.updateCircularMovement(this, deltaTime);
        }
    }

    cleanup() {
        super.dispose();
    }

    animateClick() {
        super.animateClick();
    }

    update(currentTime) {
        if (!this.isActive) return;
        super.update();
        
        const deltaTime = currentTime - (this.lastUpdateTime || currentTime);
        this.lastUpdateTime = currentTime;
        this.updateMovement(deltaTime);
    }
}

// ============================================================================
// REGISTRATION - Auto-export all entities
// ============================================================================
const LEVEL_X_ENTITIES = [
    'EntityName1', 'EntityName2', 'EntityName3', 'EntityName4', 'EntityName5'
];

// Export to global window object
LEVEL_X_ENTITIES.forEach(entityName => {
    window[entityName] = eval(entityName);
});

console.log(`🎮 Level X entity template loaded: ${LEVEL_X_ENTITIES.join(', ')}`);