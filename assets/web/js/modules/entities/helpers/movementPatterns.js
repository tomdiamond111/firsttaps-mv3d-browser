/**
 * MOVEMENT PATTERNS HELPER
 * Reusable movement patterns for entities to ensure consistent behavior
 * and prevent common issues like origin-locking and method call errors
 */

class MovementPatterns {
    
    /**
     * Setup bouncing movement pattern
     * Safe alternative to calling super.updateMovement()
     */
    static setupBouncingMovement(entity, config = {}) {
        entity.movementType = 'bouncing';
        entity.velocity = config.velocity || { x: 0.03, y: 0.04, z: 0.02 };
        entity.bounds = config.bounds || { 
            x: { min: -120, max: 120 }, 
            y: { min: 1, max: 15 }, 
            z: { min: -120, max: 120 } 
        };
        entity.maxSpeed = config.maxSpeed || 0.08;
        
        console.log(`🎮 Setup bouncing movement for ${entity.type}`);
    }
    
    /**
     * Update bouncing movement pattern
     */
    static updateBouncingMovement(entity, deltaTime) {
        if (entity.movementType !== 'bouncing') return;
        
        // Update position
        entity.group.position.x += entity.velocity.x;
        entity.group.position.y += entity.velocity.y;
        entity.group.position.z += entity.velocity.z;
        
        // Bounce off bounds
        if (entity.group.position.x <= entity.bounds.x.min || 
            entity.group.position.x >= entity.bounds.x.max) {
            entity.velocity.x *= -1;
        }
        if (entity.group.position.y <= entity.bounds.y.min || 
            entity.group.position.y >= entity.bounds.y.max) {
            entity.velocity.y *= -1;
        }
        if (entity.group.position.z <= entity.bounds.z.min || 
            entity.group.position.z >= entity.bounds.z.max) {
            entity.velocity.z *= -1;
        }
        
        // Limit velocity to prevent runaway speed
        ['x', 'y', 'z'].forEach(axis => {
            if (Math.abs(entity.velocity[axis]) > entity.maxSpeed) {
                entity.velocity[axis] = Math.sign(entity.velocity[axis]) * entity.maxSpeed;
            }
        });
    }
    
    /**
     * Setup circular movement pattern
     * Prevents origin-locking by using random centers
     */
    static setupCircularMovement(entity, config = {}) {
        entity.movementType = 'circular';
        
        // Random patrol center anywhere in the world (not origin-locked)
        const centerRange = config.centerRange || { x: 100, z: 100 };
        entity.patrolCenter = {
            x: (Math.random() - 0.5) * centerRange.x * 2,
            y: config.height ? (config.height.min + Math.random() * (config.height.max - config.height.min)) : (8 + Math.random() * 12),
            z: (Math.random() - 0.5) * centerRange.z * 2
        };
        
        const radiusConfig = config.radius || { min: 15, max: 40 };
        entity.patrolRadius = radiusConfig.min + Math.random() * (radiusConfig.max - radiusConfig.min);
        entity.patrolAngle = Math.random() * Math.PI * 2;
        entity.patrolSpeed = config.speed || (0.02 + Math.random() * 0.03);
        
        console.log(`🎮 Setup circular movement for ${entity.type} at center (${entity.patrolCenter.x.toFixed(1)}, ${entity.patrolCenter.z.toFixed(1)}) radius ${entity.patrolRadius.toFixed(1)}`);
    }
    
    /**
     * Update circular movement pattern
     */
    static updateCircularMovement(entity, deltaTime) {
        if (entity.movementType !== 'circular') return;
        
        entity.patrolAngle += entity.patrolSpeed;
        entity.group.position.x = entity.patrolCenter.x + Math.cos(entity.patrolAngle) * entity.patrolRadius;
        entity.group.position.z = entity.patrolCenter.z + Math.sin(entity.patrolAngle) * entity.patrolRadius;
        entity.group.position.y = entity.patrolCenter.y + Math.sin(entity.patrolAngle * 2) * 1.5; // Vertical bobbing
    }
    
    /**
     * Setup fly-through movement pattern
     * Entities fly from one world edge to opposite edge
     */
    static setupFlyThroughMovement(entity, config = {}) {
        entity.movementType = 'flythrough';
        
        const worldSize = config.worldSize || 140;
        const heightConfig = config.height || { min: 8, max: 20 };
        const flyHeight = heightConfig.min + Math.random() * (heightConfig.max - heightConfig.min);
        
        // Random entry edge (0=North, 1=East, 2=South, 3=West)
        const entryEdge = Math.floor(Math.random() * 4);
        const exitEdge = (entryEdge + 2) % 4; // Opposite edge
        
        const getEdgePosition = (edge) => {
            switch(edge) {
                case 0: return { x: (Math.random() - 0.5) * worldSize * 2, y: flyHeight, z: -worldSize };
                case 1: return { x: worldSize, y: flyHeight, z: (Math.random() - 0.5) * worldSize * 2 };
                case 2: return { x: (Math.random() - 0.5) * worldSize * 2, y: flyHeight, z: worldSize };
                case 3: return { x: -worldSize, y: flyHeight, z: (Math.random() - 0.5) * worldSize * 2 };
            }
        };
        
        entity.startPosition = getEdgePosition(entryEdge);
        entity.targetPosition = getEdgePosition(exitEdge);
        
        // Calculate movement vector
        entity.direction = {
            x: entity.targetPosition.x - entity.startPosition.x,
            y: entity.targetPosition.y - entity.startPosition.y,
            z: entity.targetPosition.z - entity.startPosition.z
        };
        
        // Normalize direction
        const length = Math.sqrt(entity.direction.x ** 2 + entity.direction.y ** 2 + entity.direction.z ** 2);
        entity.direction.x /= length;
        entity.direction.y /= length;
        entity.direction.z /= length;
        
        entity.flySpeed = config.speed || 0.12;
        
        // Set initial position
        entity.group.position.copy(entity.startPosition);
        
        console.log(`🎮 Setup fly-through movement for ${entity.type} from edge ${entryEdge} to ${exitEdge}`);
    }
    
    /**
     * Update fly-through movement pattern
     */
    static updateFlyThroughMovement(entity, deltaTime) {
        if (entity.movementType !== 'flythrough') return;
        
        // Linear movement
        entity.group.position.x += entity.direction.x * entity.flySpeed;
        entity.group.position.y += entity.direction.y * entity.flySpeed + Math.sin(Date.now() * 0.002) * 0.2; // Slight bobbing
        entity.group.position.z += entity.direction.z * entity.flySpeed;
        
        // Smooth rotation toward movement direction
        const targetRotationY = Math.atan2(entity.direction.x, entity.direction.z);
        entity.group.rotation.y += (targetRotationY - entity.group.rotation.y) * 0.1;
    }
    
    /**
     * Setup hybrid movement pattern
     * Switches between different movement types
     */
    static setupHybridMovement(entity, config = {}) {
        entity.movementType = 'hybrid';
        entity.hybridPatterns = config.patterns || ['bouncing', 'circular'];
        entity.hybridSwitchInterval = config.switchInterval || 15000; // 15 seconds
        entity.hybridCurrentPattern = 0;
        entity.hybridTimer = 0;
        entity.hybridConfig = config;
        
        // Start with first pattern
        const firstPattern = entity.hybridPatterns[0];
        if (firstPattern === 'bouncing') {
            this.setupBouncingMovement(entity, config);
        } else if (firstPattern === 'circular') {
            this.setupCircularMovement(entity, config);
        } else if (firstPattern === 'flythrough') {
            this.setupFlyThroughMovement(entity, config);
        }
        
        entity.movementType = 'hybrid'; // Restore after pattern setup
        
        console.log(`🎮 Setup hybrid movement for ${entity.type} with patterns: ${entity.hybridPatterns.join(', ')}`);
    }
    
    /**
     * Update hybrid movement pattern
     */
    static updateHybridMovement(entity, deltaTime) {
        if (entity.movementType !== 'hybrid') return;
        
        entity.hybridTimer += deltaTime;
        
        // Check if it's time to switch patterns
        if (entity.hybridTimer > entity.hybridSwitchInterval) {
            entity.hybridCurrentPattern = (entity.hybridCurrentPattern + 1) % entity.hybridPatterns.length;
            entity.hybridTimer = 0;
            
            const newPattern = entity.hybridPatterns[entity.hybridCurrentPattern];
            console.log(`🎮 ${entity.type} switching to ${newPattern} movement`);
            
            // Setup new pattern
            if (newPattern === 'bouncing') {
                this.setupBouncingMovement(entity, entity.hybridConfig);
            } else if (newPattern === 'circular') {
                this.setupCircularMovement(entity, entity.hybridConfig);
            } else if (newPattern === 'flythrough') {
                this.setupFlyThroughMovement(entity, entity.hybridConfig);
            }
            
            entity.movementType = 'hybrid'; // Restore after pattern setup
        }
        
        // Update current pattern
        const currentPattern = entity.hybridPatterns[entity.hybridCurrentPattern];
        if (currentPattern === 'bouncing') {
            this.updateBouncingMovement(entity, deltaTime);
        } else if (currentPattern === 'circular') {
            this.updateCircularMovement(entity, deltaTime);
        } else if (currentPattern === 'flythrough') {
            this.updateFlyThroughMovement(entity, deltaTime);
        }
    }
    
    /**
     * Get world-aware bounds based on level
     * Prevents origin-locking by providing appropriate bounds
     */
    static getWorldBounds(level, size = 'normal') {
        const bounds = {
            small: { 
                x: { min: -100, max: 100 }, 
                y: { min: 1, max: 12 }, 
                z: { min: -100, max: 100 } 
            },
            normal: { 
                x: { min: -120, max: 120 }, 
                y: { min: 1, max: 15 }, 
                z: { min: -120, max: 120 } 
            },
            large: { 
                x: { min: -140, max: 140 }, 
                y: { min: 1, max: 18 }, 
                z: { min: -140, max: 140 } 
            }
        };
        
        return bounds[size] || bounds.normal;
    }
    
    /**
     * Get appropriate speeds based on level
     */
    static getLevelSpeeds(level) {
        const baseSpeed = 0.03 + (level - 1) * 0.01; // Increase speed with level
        return {
            slow: baseSpeed * 0.7,
            normal: baseSpeed,
            fast: baseSpeed * 1.5,
            veryFast: baseSpeed * 2
        };
    }
}

// Export for global use
window.MovementPatterns = MovementPatterns;
console.log('🎮 MovementPatterns helper loaded');