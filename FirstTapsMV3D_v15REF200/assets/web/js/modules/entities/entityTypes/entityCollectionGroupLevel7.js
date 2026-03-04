/**
 * ENTITY COLLECTION GROUP LEVEL 7 - "UFO INVASION" (PREMIUM)
 * Premium level for subscribed players who have reached 60,000+ points
 * 
 * Contains: Scout UFO, Warship UFO, Mothership UFO, Cloaked UFO, Swarm Commander UFO
 * Points: 700-1200 (advanced UFO invasion with formation flying and special abilities)
 * Theme: Alien invasion with enhanced UFOs featuring formation flying, cloaking, and swarm behaviors
 */

/**
 * SHARED MATERIALS - Available to all Level 7 entities
 */
const SharedMaterialsLevel7 = {
    // UFO hull materials
    scoutSilver: new THREE.MeshPhongMaterial({ 
        color: 0xC0C0C0,
        shininess: 100,
        specular: 0x666666
    }),
    warshipDark: new THREE.MeshPhongMaterial({ 
        color: 0x404040,
        shininess: 150,
        specular: 0x888888
    }),
    mothershipGold: new THREE.MeshPhongMaterial({ 
        color: 0xFFD700,
        shininess: 200,
        specular: 0xAAAAAA
    }),
    cloakedPhase: new THREE.MeshPhongMaterial({ 
        color: 0x8080FF,
        transparent: true,
        opacity: 0.3,
        shininess: 50
    }),
    commanderRed: new THREE.MeshPhongMaterial({ 
        color: 0xFF0000,
        shininess: 120,
        specular: 0x777777
    }),
    
    // Dome materials
    scoutDome: new THREE.MeshBasicMaterial({ 
        color: 0x00FFFF, 
        transparent: true, 
        opacity: 0.7 
    }),
    warshipDome: new THREE.MeshBasicMaterial({ 
        color: 0xFF0000, 
        transparent: true, 
        opacity: 0.8 
    }),
    mothershipDome: new THREE.MeshBasicMaterial({ 
        color: 0xFFFF00, 
        transparent: true, 
        opacity: 0.9 
    }),
    cloakedDome: new THREE.MeshBasicMaterial({ 
        color: 0xFF00FF, 
        transparent: true, 
        opacity: 0.5 
    }),
    commanderDome: new THREE.MeshBasicMaterial({ 
        color: 0x00FF00, 
        transparent: true, 
        opacity: 0.8 
    }),
    
    // Special effects
    tractorBeam: new THREE.MeshBasicMaterial({ 
        color: 0x00FF00, 
        transparent: true, 
        opacity: 0.2,
        side: THREE.DoubleSide
    }),
    warpField: new THREE.MeshBasicMaterial({ 
        color: 0x8080FF, 
        transparent: true, 
        opacity: 0.3,
        side: THREE.DoubleSide
    })
};

// Make SharedMaterialsLevel7 globally accessible
window.SharedMaterialsLevel7 = SharedMaterialsLevel7;

/**
 * SCOUT UFO ENTITY - Level 7.1 (700 points)
 * Small, fast reconnaissance UFOs with erratic movement
 */
class ScoutUFOEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'scout_ufo',
            pointValue: 700,
            level: 14,
            moveSpeed: 0.12, // Increased speed for more dynamic movement
            rotationSpeed: 0.04,
            clickable: true,
            description: 'Scout UFO'
        });
        
        // Choose random movement pattern: 0=circle, 1=fly-through
        this.movementPattern = Math.random() > 0.5 ? 'circle' : 'flythrough';
        
        if (this.movementPattern === 'circle') {
            this.setupCircularMovement();
        } else {
            this.setupFlyThroughMovement();
        }
        
        this.scanTimer = 0;
        this.lightTimer = 0;
        
        this.createScoutUFO();
        this.positionAtWorldEdgeLevel7();
    }
    
    /**
     * Enhanced positioning for Level 7 UFOs - much larger operational area
     */
    positionAtWorldEdgeLevel7() {
        // Random entry strategy (0-6 for different approaches)
        const entryStrategy = Math.floor(Math.random() * 7);
        const worldSize = 200; // Much larger than base entities
        
        switch(entryStrategy) {
            case 0: // Far North entry
                this.group.position.set(
                    (Math.random() - 0.5) * worldSize * 2, 
                    15 + Math.random() * 30, 
                    -worldSize * 1.5
                );
                this.direction = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.3, 
                    (Math.random() - 0.5) * 0.1, 
                    0.7 + Math.random() * 0.3
                ).normalize();
                break;
                
            case 1: // Far East entry
                this.group.position.set(
                    worldSize * 1.5, 
                    15 + Math.random() * 30, 
                    (Math.random() - 0.5) * worldSize * 2
                );
                this.direction = new THREE.Vector3(
                    -0.7 - Math.random() * 0.3, 
                    (Math.random() - 0.5) * 0.1, 
                    (Math.random() - 0.5) * 0.3
                ).normalize();
                break;
                
            case 2: // Far South entry
                this.group.position.set(
                    (Math.random() - 0.5) * worldSize * 2, 
                    15 + Math.random() * 30, 
                    worldSize * 1.5
                );
                this.direction = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.3, 
                    (Math.random() - 0.5) * 0.1, 
                    -0.7 - Math.random() * 0.3
                ).normalize();
                break;
                
            case 3: // Far West entry
                this.group.position.set(
                    -worldSize * 1.5, 
                    15 + Math.random() * 30, 
                    (Math.random() - 0.5) * worldSize * 2
                );
                this.direction = new THREE.Vector3(
                    0.7 + Math.random() * 0.3, 
                    (Math.random() - 0.5) * 0.1, 
                    (Math.random() - 0.5) * 0.3
                ).normalize();
                break;
                
            case 4: // High altitude entry
                this.group.position.set(
                    (Math.random() - 0.5) * worldSize, 
                    45 + Math.random() * 25, 
                    (Math.random() - 0.5) * worldSize
                );
                this.direction = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.4, 
                    -0.3 - Math.random() * 0.3, 
                    (Math.random() - 0.5) * 0.4
                ).normalize();
                break;
                
            case 5: // Low altitude stealth entry
                this.group.position.set(
                    (Math.random() - 0.5) * worldSize * 1.2, 
                    3 + Math.random() * 8, 
                    (Math.random() - 0.5) * worldSize * 1.2
                );
                this.direction = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.6, 
                    0.1 + Math.random() * 0.2, 
                    (Math.random() - 0.5) * 0.6
                ).normalize();
                break;
                
            case 6: // Diagonal corner entry
                const corner = Math.floor(Math.random() * 4);
                const cornerPositions = [
                    [-worldSize, 20 + Math.random() * 20, -worldSize], // NW
                    [worldSize, 20 + Math.random() * 20, -worldSize],  // NE
                    [worldSize, 20 + Math.random() * 20, worldSize],   // SE
                    [-worldSize, 20 + Math.random() * 20, worldSize]   // SW
                ];
                this.group.position.set(...cornerPositions[corner]);
                this.direction = new THREE.Vector3(
                    -cornerPositions[corner][0] * 0.003,
                    (Math.random() - 0.5) * 0.1,
                    -cornerPositions[corner][2] * 0.003
                ).normalize();
                break;
        }
    }
    
    setupCircularMovement() {
        // ENHANCED: Much larger patrol areas covering entire file zones
        const worldSize = 200; // Expanded world coverage
        this.patrolCenter = {
            x: (Math.random() - 0.5) * worldSize * 2, // -200 to +200
            y: 15 + Math.random() * 35, // Height between 15-50 (much higher)
            z: (Math.random() - 0.5) * worldSize * 2  // -200 to +200
        };
        this.patrolRadius = 25 + Math.random() * 50; // Radius 25-75 units (larger sweeps)
        this.patrolAngle = Math.random() * Math.PI * 2;
        this.patrolSpeed = 0.015 + Math.random() * 0.025; // Variable patrol speed
        
        // Add spiral movement component
        this.spiralPhase = Math.random() * Math.PI * 2;
        this.spiralAmplitude = 5 + Math.random() * 15; // Vertical spiral range
        this.spiralSpeed = 0.01 + Math.random() * 0.02;
    }
    
    setupFlyThroughMovement() {
        // ENHANCED: Much larger flight paths across entire world
        const worldSize = 250; // Expanded for more dramatic fly-throughs
        const flyHeight = 12 + Math.random() * 40; // Height between 12-52 (much higher range)
        
        // Random entry edge (0=North, 1=East, 2=South, 3=West, 4=High, 5=Low)
        const entryEdge = Math.floor(Math.random() * 6); // Added high/low entries
        
        // Calculate entry and exit positions with much larger coverage
        const getEdgePosition = (edge) => {
            switch(edge) {
                case 0: return { x: (Math.random() - 0.5) * worldSize * 2.5, y: flyHeight, z: -worldSize * 1.2 }; // North
                case 1: return { x: worldSize * 1.2, y: flyHeight, z: (Math.random() - 0.5) * worldSize * 2.5 }; // East
                case 2: return { x: (Math.random() - 0.5) * worldSize * 2.5, y: flyHeight, z: worldSize * 1.2 }; // South
                case 3: return { x: -worldSize * 1.2, y: flyHeight, z: (Math.random() - 0.5) * worldSize * 2.5 }; // West
                case 4: return { x: (Math.random() - 0.5) * worldSize, y: flyHeight + 30, z: (Math.random() - 0.5) * worldSize }; // High altitude entry
                case 5: return { x: (Math.random() - 0.5) * worldSize, y: flyHeight - 8, z: (Math.random() - 0.5) * worldSize }; // Low altitude entry
            }
        };
        
        this.startPosition = getEdgePosition(entryEdge);
        
        // Choose exit strategy: opposite edge, random edge, or center target
        const exitStrategy = Math.floor(Math.random() * 3);
        let exitEdge;
        
        if (exitStrategy === 0) {
            // Opposite edge (traditional)
            exitEdge = (entryEdge + 3) % 6;
        } else if (exitStrategy === 1) {
            // Random different edge
            do {
                exitEdge = Math.floor(Math.random() * 6);
            } while (exitEdge === entryEdge);
        } else {
            // Center target (reconnaissance sweep)
            this.endPosition = {
                x: (Math.random() - 0.5) * 60, // Target center area
                y: flyHeight + (Math.random() - 0.5) * 20,
                z: (Math.random() - 0.5) * 60
            };
        }
        
        if (!this.endPosition) {
            this.endPosition = getEdgePosition(exitEdge);
        }
        
        this.startPosition = getEdgePosition(entryEdge);
        this.targetPosition = getEdgePosition(exitEdge);
        
        // Calculate movement vector
        this.direction = {
            x: this.targetPosition.x - this.startPosition.x,
            y: this.targetPosition.y - this.startPosition.y,
            z: this.targetPosition.z - this.startPosition.z
        };
        
        // Normalize direction
        const length = Math.sqrt(this.direction.x ** 2 + this.direction.y ** 2 + this.direction.z ** 2);
        this.direction.x /= length;
        this.direction.y /= length;
        this.direction.z /= length;
    }
    
    createScoutUFO() {
        // Smaller scout UFO - 60% size of original
        const scale = 0.6;
        
        // Main saucer body
        const saucerGeometry = new THREE.CylinderGeometry(2.1 * scale, 2.4 * scale, 0.5 * scale, 12);
        const saucer = new THREE.Mesh(saucerGeometry, SharedMaterialsLevel7.scoutSilver);
        this.group.add(saucer);

        // Dome/cockpit
        const domeGeometry = new THREE.SphereGeometry(1.2 * scale, 10, 6);
        const dome = new THREE.Mesh(domeGeometry, SharedMaterialsLevel7.scoutDome);
        dome.position.set(0, 0.6 * scale, 0);
        dome.scale.y = 0.6;
        this.group.add(dome);

        // Scout lights (fewer, brighter)
        this.lights = [];
        const lightGeometry = new THREE.SphereGeometry(0.15 * scale, 6, 4);
        const lightColors = [0xFF0000, 0x0000FF, 0xFFFF00, 0xFF00FF];
        
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const lightMaterial = new THREE.MeshBasicMaterial({ 
                color: lightColors[i % lightColors.length]
            });
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(
                Math.cos(angle) * 2.3 * scale,
                -0.1 * scale,
                Math.sin(angle) * 2.3 * scale
            );
            this.lights.push(light);
            this.group.add(light);
        }

        // Scanner beam (thin)
        const beamGeometry = new THREE.ConeGeometry(1.0 * scale, 3.0 * scale, 6, 1, true);
        this.scannerBeam = new THREE.Mesh(beamGeometry, SharedMaterialsLevel7.tractorBeam);
        this.scannerBeam.position.set(0, -2.0 * scale, 0);
        this.group.add(this.scannerBeam);
    }
    
    updateMovement(deltaTime) {
        this.lightTimer += deltaTime * 0.01;
        this.scanTimer += deltaTime * 0.01;
        
        if (this.movementPattern === 'circle') {
            // ENHANCED: Circular patrol with spiral movement
            this.patrolAngle += this.patrolSpeed;
            this.spiralPhase += this.spiralSpeed;
            
            // Base circular position
            const baseX = this.patrolCenter.x + Math.cos(this.patrolAngle) * this.patrolRadius;
            const baseZ = this.patrolCenter.z + Math.sin(this.patrolAngle) * this.patrolRadius;
            
            // Add spiral component for more interesting movement
            this.group.position.x = baseX + Math.cos(this.spiralPhase * 3) * 8;
            this.group.position.z = baseZ + Math.sin(this.spiralPhase * 3) * 8;
            this.group.position.y = this.patrolCenter.y + 
                                   Math.sin(this.scanTimer * 2) * 2.5 + // Vertical bobbing
                                   Math.sin(this.spiralPhase) * this.spiralAmplitude; // Spiral altitude changes
            
            // Dynamic banking turns based on direction change
            const currentDirection = new THREE.Vector3(
                Math.cos(this.patrolAngle + this.patrolSpeed) - Math.cos(this.patrolAngle),
                0,
                Math.sin(this.patrolAngle + this.patrolSpeed) - Math.sin(this.patrolAngle)
            ).normalize();
            
            this.group.rotation.y = Math.atan2(currentDirection.x, currentDirection.z);
            this.group.rotation.z = Math.sin(this.patrolAngle * 2) * 0.2; // Banking in turns
            
        } else {
            // ENHANCED: Linear fly-through with evasive maneuvers
            const baseSpeed = this.moveSpeed;
            
            // Add evasive maneuver patterns
            const evasiveX = Math.sin(this.scanTimer * 8) * 2.0;
            const evasiveZ = Math.cos(this.scanTimer * 6) * 1.5;
            const evasiveY = Math.sin(this.scanTimer * 4) * 1.0;
            
            this.group.position.x += this.direction.x * baseSpeed + evasiveX * 0.1;
            this.group.position.y += this.direction.y * baseSpeed + evasiveY * 0.1;
            this.group.position.z += this.direction.z * baseSpeed + evasiveZ * 0.1;
            
            // Advanced banking and rolling during evasive maneuvers
            this.group.rotation.z = Math.sin(this.scanTimer * 8) * 0.3; // Rolling
            this.group.rotation.x = Math.sin(this.scanTimer * 6) * 0.15; // Pitching
            
            // Smooth rotation toward movement direction with banking
            const targetRotationY = Math.atan2(this.direction.x, this.direction.z);
            this.group.rotation.y += (targetRotationY - this.group.rotation.y) * 0.08;
        }
        
        // Enhanced light animation with variety
        this.lights.forEach((light, index) => {
            const frequency = 6 + index * 2; // Different frequencies per light
            const intensity = 0.4 + Math.sin(this.lightTimer * frequency + index * Math.PI) * 0.6;
            light.material.opacity = Math.max(0.1, intensity);
            light.material.transparent = true;
        });
        
        // Enhanced scanner beam with scanning behavior
        if (this.scannerBeam) {
            this.scannerBeam.rotation.y += 0.15; // Faster rotation
            const scanPulse = 0.15 + Math.sin(this.scanTimer * 6) * 0.15;
            this.scannerBeam.material.opacity = scanPulse;
            
            // Vary beam intensity based on movement pattern
            if (this.movementPattern === 'circle') {
                this.scannerBeam.scale.y = 1.0 + Math.sin(this.scanTimer * 4) * 0.3;
            }
        }
    }

    animateClick() {
        // Only visual feedback, no removal - let session timeout handle removal
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

// Make ScoutUFOEntity globally accessible
window.ScoutUFOEntity = ScoutUFOEntity;

/**
 * WARSHIP UFO ENTITY - Level 7.2 (800 points)
 * Medium UFOs with pulsing red lights and aggressive movement
 */
class WarshipUFOEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'warship_ufo',
            pointValue: 800,
            level: 14,
            moveSpeed: 0.08, // Increased speed
            rotationSpeed: 0.025,
            clickable: true,
            description: 'Warship UFO'
        });
        
        this.attackMode = false;
        this.attackTimer = 0;
        // ENHANCED: Much larger patrol area for warship operations
        const worldSize = 180; // Expanded patrol zone
        this.patrolBase = {
            x: (Math.random() - 0.5) * worldSize * 1.5, // -135 to +135
            y: 10 + Math.random() * 25, // Height 10-35 (higher altitude)
            z: (Math.random() - 0.5) * worldSize * 1.5
        };
        this.targetPosition = { ...this.patrolBase };
        this.weaponChargeTimer = 0;
        this.lightPulseTimer = 0;
        
        // Add formation behavior variables
        this.formationMovement = Math.random() > 0.6; // 40% chance for formation patterns
        this.sweepPattern = Math.random() > 0.5; // 50% chance for sweep patterns
        this.combatReadiness = 0.3 + Math.random() * 0.7; // Variable aggression level
        
        this.createWarshipUFO();
        this.positionAtWorldEdgeLevel7();
    }
    
    createWarshipUFO() {
        // Standard size with military modifications
        const scale = 1.0;
        
        // Main saucer body (darker, more angular)
        const saucerGeometry = new THREE.CylinderGeometry(3.5 * scale, 4.2 * scale, 1.0 * scale, 8);
        const saucer = new THREE.Mesh(saucerGeometry, SharedMaterialsLevel7.warshipDark);
        this.group.add(saucer);

        // Command dome
        const domeGeometry = new THREE.SphereGeometry(2.0 * scale, 10, 6);
        const dome = new THREE.Mesh(domeGeometry, SharedMaterialsLevel7.warshipDome);
        dome.position.set(0, 1.0 * scale, 0);
        dome.scale.y = 0.6;
        this.group.add(dome);

        // Weapon ports (red lights)
        this.weapons = [];
        const weaponGeometry = new THREE.SphereGeometry(0.25 * scale, 8, 6);
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const weaponMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xFF0000,
                emissive: 0x440000
            });
            const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
            weapon.position.set(
                Math.cos(angle) * 3.8 * scale,
                -0.2 * scale,
                Math.sin(angle) * 3.8 * scale
            );
            this.weapons.push(weapon);
            this.group.add(weapon);
        }

        // Armor plating
        for (let i = 0; i < 4; i++) {
            const plateGeometry = new THREE.BoxGeometry(1.5 * scale, 0.3 * scale, 0.5 * scale);
            const plate = new THREE.Mesh(plateGeometry, SharedMaterialsLevel7.warshipDark);
            const angle = (i / 4) * Math.PI * 2;
            plate.position.set(
                Math.cos(angle) * 2.5 * scale,
                0.2 * scale,
                Math.sin(angle) * 2.5 * scale
            );
            plate.rotation.y = angle;
            this.group.add(plate);
        }

        // Weapon charging field
        const fieldGeometry = new THREE.CylinderGeometry(4.5 * scale, 4.5 * scale, 0.1 * scale, 16);
        this.weaponField = new THREE.Mesh(fieldGeometry, SharedMaterialsLevel7.warpField);
        this.weaponField.position.set(0, -0.8 * scale, 0);
        this.group.add(this.weaponField);
    }
    
    positionAtWorldEdgeLevel7() {
        const entryStrategy = Math.floor(Math.random() * 7);
        const worldSize = 200;
        
        switch(entryStrategy) {
            case 0:
                this.group.position.set((Math.random() - 0.5) * worldSize * 2, 15 + Math.random() * 30, -worldSize * 1.5);
                break;
            case 1:
                this.group.position.set(worldSize * 1.5, 15 + Math.random() * 30, (Math.random() - 0.5) * worldSize * 2);
                break;
            case 2:
                this.group.position.set((Math.random() - 0.5) * worldSize * 2, 15 + Math.random() * 30, worldSize * 1.5);
                break;
            case 3:
                this.group.position.set(-worldSize * 1.5, 15 + Math.random() * 30, (Math.random() - 0.5) * worldSize * 2);
                break;
            case 4:
                this.group.position.set((Math.random() - 0.5) * worldSize, 45 + Math.random() * 25, (Math.random() - 0.5) * worldSize);
                break;
            case 5:
                this.group.position.set((Math.random() - 0.5) * worldSize * 1.2, 3 + Math.random() * 8, (Math.random() - 0.5) * worldSize * 1.2);
                break;
            case 6:
                const corner = Math.floor(Math.random() * 4);
                const cornerPositions = [[-worldSize, 20 + Math.random() * 20, -worldSize], [worldSize, 20 + Math.random() * 20, -worldSize], [worldSize, 20 + Math.random() * 20, worldSize], [-worldSize, 20 + Math.random() * 20, worldSize]];
                this.group.position.set(...cornerPositions[corner]);
                break;
        }
    }
    
    updateMovement(deltaTime) {
        this.lightPulseTimer += deltaTime * 0.01;
        this.weaponChargeTimer += deltaTime * 0.01;
        this.attackTimer += deltaTime * 0.01;
        
        // ENHANCED: Advanced combat patterns with much larger operational area
        if (this.formationMovement) {
            // Formation sweep pattern across multiple file zones
            const sweepRadius = 60 + Math.sin(this.attackTimer * 0.015) * 40; // Variable sweep radius
            const sweepAngle = this.attackTimer * 0.008; // Slow deliberate sweep
            
            this.targetPosition.x = Math.cos(sweepAngle) * sweepRadius;
            this.targetPosition.z = Math.sin(sweepAngle) * sweepRadius;
            this.targetPosition.y = this.patrolBase.y + Math.sin(this.attackTimer * 0.01) * 8;
            
            this.attackMode = Math.sin(this.attackTimer * 0.02) > 0; // Periodic attack readiness
            
        } else if (this.sweepPattern) {
            // Tactical sweep pattern - larger figure-8 movements
            const sweepPhase = this.attackTimer * 0.006;
            const sweepScale = 80; // Much larger sweep area
            
            this.targetPosition.x = this.patrolBase.x + Math.sin(sweepPhase) * sweepScale;
            this.targetPosition.z = this.patrolBase.z + Math.sin(sweepPhase * 2) * sweepScale * 0.6; // Figure-8
            this.targetPosition.y = this.patrolBase.y + Math.cos(sweepPhase * 3) * 12; // Altitude changes
            
            this.attackMode = Math.abs(Math.sin(sweepPhase)) > 0.7; // Attack mode during aggressive parts
            
        } else {
            // Enhanced attack/patrol cycle with larger range
            if (this.attackTimer % 300 < 150) { // Longer cycles
                // Attack mode - target distant zones
                this.attackMode = true;
                const worldSize = 150; // Much larger attack range
                if (this.attackTimer % 30 < 5) { // Update target less frequently for sustained attacks
                    this.targetPosition = { 
                        x: (Math.random() - 0.5) * worldSize * 1.5, 
                        y: 8 + Math.random() * 25, // Higher attack altitude
                        z: (Math.random() - 0.5) * worldSize * 1.5
                    };
                }
            } else {
                // Patrol mode - larger patrol radius
                this.attackMode = false;
                const patrolRadius = 45; // Increased patrol radius
                const patrolPhase = this.attackTimer * 0.01;
                
                this.targetPosition.x = this.patrolBase.x + Math.sin(patrolPhase) * patrolRadius + Math.cos(patrolPhase * 3) * 15;
                this.targetPosition.z = this.patrolBase.z + Math.cos(patrolPhase) * patrolRadius + Math.sin(patrolPhase * 2) * 15;
                this.targetPosition.y = this.patrolBase.y + Math.sin(patrolPhase * 2) * 6;
            }
        }
        
        // Enhanced movement with momentum and banking
        const dx = this.targetPosition.x - this.group.position.x;
        const dy = this.targetPosition.y - this.group.position.y;
        const dz = this.targetPosition.z - this.group.position.z;
        
        const moveSpeed = this.attackMode ? 0.04 : 0.025; // Faster in attack mode
        this.group.position.x += dx * moveSpeed;
        this.group.position.y += dy * moveSpeed;
        this.group.position.z += dz * moveSpeed;
        
        // Enhanced rotation with banking and combat maneuvering
        const targetRotation = Math.atan2(dx, dz);
        this.group.rotation.y += (targetRotation - this.group.rotation.y) * 0.1;
        
        // Banking during turns
        const bankingAmount = Math.sin(this.attackTimer * 0.02) * 0.25;
        this.group.rotation.z = bankingAmount * this.combatReadiness;
        
        // Combat maneuvering pitch
        if (this.attackMode) {
            this.group.rotation.x = Math.sin(this.attackTimer * 0.08) * 0.15;
        }
        
        // Enhanced weapon port animation
        this.weapons.forEach((weapon, index) => {
            const baseIntensity = this.attackMode ? 1.0 : 0.4;
            const combatPulse = this.attackMode ? Math.sin(this.lightPulseTimer * 12 + index * 0.5) : Math.sin(this.lightPulseTimer * 4 + index);
            const pulse = combatPulse * 0.5 + 0.5;
            weapon.material.emissiveIntensity = baseIntensity * pulse * this.combatReadiness;
        });
        
        // Enhanced weapon field with combat charging
        if (this.weaponField) {
            this.weaponField.rotation.y += this.attackMode ? 0.08 : 0.03;
            const chargeLevel = this.attackMode ? 0.6 : 0.15;
            this.weaponField.material.opacity = chargeLevel + Math.sin(this.weaponChargeTimer * 6) * 0.2;
            
            const chargeScale = 1 + Math.sin(this.weaponChargeTimer * (this.attackMode ? 8 : 4)) * 0.15;
            this.weaponField.scale.setScalar(chargeScale);
        }
    }

    update(currentTime) {
        if (!this.isActive) return;
        super.update();
        
        const deltaTime = currentTime - (this.lastUpdateTime || currentTime);
        this.lastUpdateTime = currentTime;
        this.updateMovement(deltaTime);
    }

    animateClick() {
        // Only visual feedback, no removal - let session timeout handle removal
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

// Make WarshipUFOEntity globally accessible
window.WarshipUFOEntity = WarshipUFOEntity;

/**
 * MOTHERSHIP UFO ENTITY - Level 7.3 (900 points)
 * Large UFOs with complex light patterns and slow, imposing movement
 */
class MothershipUFOEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'mothership_ufo',
            pointValue: 900,
            level: 14,
            moveSpeed: 0.06, // Increased speed for more dynamic movement
            rotationSpeed: 0.01,
            clickable: true,
            description: 'Mothership UFO'
        });
        
        this.lightSequenceTimer = 0;
        this.tractorBeamActive = false;
        this.tractorBeamTimer = 0;
        this.energyRings = [];
        
        this.createMothershipUFO();
        this.positionAtWorldEdgeLevel7();
    }
    
    createMothershipUFO() {
        // Large mothership - 150% size
        const scale = 1.5;
        
        // Massive main hull
        const saucerGeometry = new THREE.CylinderGeometry(5.25 * scale, 6.0 * scale, 1.2 * scale, 20);
        const saucer = new THREE.Mesh(saucerGeometry, SharedMaterialsLevel7.mothershipGold);
        this.group.add(saucer);

        // Command dome
        const domeGeometry = new THREE.SphereGeometry(3.0 * scale, 16, 10);
        const dome = new THREE.Mesh(domeGeometry, SharedMaterialsLevel7.mothershipDome);
        dome.position.set(0, 1.5 * scale, 0);
        dome.scale.y = 0.7;
        this.group.add(dome);

        // Ring of lights (more elaborate)
        this.lights = [];
        const lightGeometry = new THREE.SphereGeometry(0.3 * scale, 10, 8);
        const lightColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFFFFF];
        
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const lightMaterial = new THREE.MeshPhongMaterial({ 
                color: lightColors[i % lightColors.length],
                emissive: lightColors[i % lightColors.length],
                emissiveIntensity: 0.5
            });
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(
                Math.cos(angle) * 5.7 * scale,
                -0.3 * scale,
                Math.sin(angle) * 5.7 * scale
            );
            this.lights.push(light);
            this.group.add(light);
        }

        // Energy rings around the mothership
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.TorusGeometry((6.5 + i * 1.0) * scale, 0.2 * scale, 8, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xFFD700,
                transparent: true,
                opacity: 0.4
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(0, 0.5 * scale, 0);
            ring.rotation.x = Math.PI / 2;
            ring.userData.rotationSpeed = 0.01 + i * 0.005;
            ring.userData.pulseOffset = i * Math.PI / 3;
            this.energyRings.push(ring);
            this.group.add(ring);
        }

        // Massive tractor beam
        const beamGeometry = new THREE.ConeGeometry(4.0 * scale, 8.0 * scale, 12, 1, true);
        this.tractorBeam = new THREE.Mesh(beamGeometry, SharedMaterialsLevel7.tractorBeam);
        this.tractorBeam.position.set(0, -5.0 * scale, 0);
        this.group.add(this.tractorBeam);
    }
    
    positionAtWorldEdgeLevel7() {
        const entryStrategy = Math.floor(Math.random() * 7);
        const worldSize = 200;
        
        switch(entryStrategy) {
            case 0:
                this.group.position.set((Math.random() - 0.5) * worldSize * 2, 15 + Math.random() * 30, -worldSize * 1.5);
                break;
            case 1:
                this.group.position.set(worldSize * 1.5, 15 + Math.random() * 30, (Math.random() - 0.5) * worldSize * 2);
                break;
            case 2:
                this.group.position.set((Math.random() - 0.5) * worldSize * 2, 15 + Math.random() * 30, worldSize * 1.5);
                break;
            case 3:
                this.group.position.set(-worldSize * 1.5, 15 + Math.random() * 30, (Math.random() - 0.5) * worldSize * 2);
                break;
            case 4:
                this.group.position.set((Math.random() - 0.5) * worldSize, 45 + Math.random() * 25, (Math.random() - 0.5) * worldSize);
                break;
            case 5:
                this.group.position.set((Math.random() - 0.5) * worldSize * 1.2, 3 + Math.random() * 8, (Math.random() - 0.5) * worldSize * 1.2);
                break;
            case 6:
                const corner = Math.floor(Math.random() * 4);
                const cornerPositions = [[-worldSize, 20 + Math.random() * 20, -worldSize], [worldSize, 20 + Math.random() * 20, -worldSize], [worldSize, 20 + Math.random() * 20, worldSize], [-worldSize, 20 + Math.random() * 20, worldSize]];
                this.group.position.set(...cornerPositions[corner]);
                break;
        }
    }
    
    updateMovement(deltaTime) {
        this.lightSequenceTimer += deltaTime * 0.01;
        this.tractorBeamTimer += deltaTime * 0.01;
        
        // Slow, majestic movement
        this.group.position.x += Math.sin(this.lightSequenceTimer * 0.5) * 0.01;
        this.group.position.z += Math.cos(this.lightSequenceTimer * 0.3) * 0.01;
        this.group.position.y = 6 + Math.sin(this.lightSequenceTimer * 0.7) * 1;
        
        // Slow rotation
        this.group.rotation.y += this.rotationSpeed;
        
        // Complex light sequence
        this.lights.forEach((light, index) => {
            const wave = Math.sin(this.lightSequenceTimer * 2 + index * 0.4);
            light.material.emissiveIntensity = 0.3 + wave * 0.4;
            light.scale.setScalar(0.8 + wave * 0.3);
        });
        
        // Animate energy rings
        this.energyRings.forEach((ring, index) => {
            ring.rotation.z += ring.userData.rotationSpeed;
            const pulse = Math.sin(this.lightSequenceTimer * 3 + ring.userData.pulseOffset);
            ring.material.opacity = 0.2 + pulse * 0.3;
            ring.scale.setScalar(1 + pulse * 0.1);
        });
        
        // Tractor beam activation
        this.tractorBeamActive = Math.sin(this.tractorBeamTimer * 0.8) > 0.3;
        if (this.tractorBeam) {
            this.tractorBeam.visible = this.tractorBeamActive;
            this.tractorBeam.rotation.y += 0.03;
            this.tractorBeam.material.opacity = this.tractorBeamActive ? 0.3 : 0;
        }
    }

    animateClick() {
        // Only visual feedback, no removal - let session timeout handle removal
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

// Make MothershipUFOEntity globally accessible
window.MothershipUFOEntity = MothershipUFOEntity;

/**
 * CLOAKED UFO ENTITY - Level 7.4 (1000 points)
 * Periodically invisible UFOs with phase shifting effects
 */
class CloakedUFOEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'cloaked_ufo',
            pointValue: 1000,
            level: 14,
            moveSpeed: 0.07, // Increased speed for more dynamic movement
            rotationSpeed: 0.02,
            clickable: true,
            description: 'Cloaked UFO'
        });
        
        this.cloakTimer = 0;
        this.cloakCycle = 240; // Frames per cloak cycle
        this.isCloaked = false;
        this.phaseShiftTimer = 0;
        this.cloakMaterials = [];
        
        this.createCloakedUFO();
        this.positionAtWorldEdgeLevel7();
    }
    
    createCloakedUFO() {
        const scale = 0.9;
        
        // Main saucer with phase material
        const saucerGeometry = new THREE.CylinderGeometry(3.15 * scale, 3.6 * scale, 0.7 * scale, 14);
        const saucer = new THREE.Mesh(saucerGeometry, SharedMaterialsLevel7.cloakedPhase.clone());
        this.cloakMaterials.push(saucer.material);
        this.group.add(saucer);

        // Phase dome
        const domeGeometry = new THREE.SphereGeometry(1.8 * scale, 12, 8);
        const dome = new THREE.Mesh(domeGeometry, SharedMaterialsLevel7.cloakedDome.clone());
        dome.position.set(0, 0.9 * scale, 0);
        dome.scale.y = 0.6;
        this.cloakMaterials.push(dome.material);
        this.group.add(dome);

        // Phase lights
        this.lights = [];
        const lightGeometry = new THREE.SphereGeometry(0.2 * scale, 8, 6);
        
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const lightMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x8080FF,
                transparent: true,
                opacity: 0.7
            });
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(
                Math.cos(angle) * 3.4 * scale,
                -0.15 * scale,
                Math.sin(angle) * 3.4 * scale
            );
            this.lights.push(light);
            this.cloakMaterials.push(light.material);
            this.group.add(light);
        }

        // Cloaking field generator
        const fieldGeometry = new THREE.SphereGeometry(4.5 * scale, 16, 12);
        this.cloakField = new THREE.Mesh(fieldGeometry, SharedMaterialsLevel7.warpField.clone());
        this.cloakField.material.side = THREE.BackSide;
        this.cloakMaterials.push(this.cloakField.material);
        this.group.add(this.cloakField);
    }
    
    positionAtWorldEdgeLevel7() {
        const entryStrategy = Math.floor(Math.random() * 7);
        const worldSize = 200;
        
        switch(entryStrategy) {
            case 0:
                this.group.position.set((Math.random() - 0.5) * worldSize * 2, 15 + Math.random() * 30, -worldSize * 1.5);
                break;
            case 1:
                this.group.position.set(worldSize * 1.5, 15 + Math.random() * 30, (Math.random() - 0.5) * worldSize * 2);
                break;
            case 2:
                this.group.position.set((Math.random() - 0.5) * worldSize * 2, 15 + Math.random() * 30, worldSize * 1.5);
                break;
            case 3:
                this.group.position.set(-worldSize * 1.5, 15 + Math.random() * 30, (Math.random() - 0.5) * worldSize * 2);
                break;
            case 4:
                this.group.position.set((Math.random() - 0.5) * worldSize, 45 + Math.random() * 25, (Math.random() - 0.5) * worldSize);
                break;
            case 5:
                this.group.position.set((Math.random() - 0.5) * worldSize * 1.2, 3 + Math.random() * 8, (Math.random() - 0.5) * worldSize * 1.2);
                break;
            case 6:
                const corner = Math.floor(Math.random() * 4);
                const cornerPositions = [[-worldSize, 20 + Math.random() * 20, -worldSize], [worldSize, 20 + Math.random() * 20, -worldSize], [worldSize, 20 + Math.random() * 20, worldSize], [-worldSize, 20 + Math.random() * 20, worldSize]];
                this.group.position.set(...cornerPositions[corner]);
                break;
        }
    }
    
    updateMovement(deltaTime) {
        this.cloakTimer += deltaTime * 0.01;
        this.phaseShiftTimer += deltaTime * 0.01;
        
        // Cloak cycle: visible 60%, cloaked 40%
        const cyclePosition = (this.cloakTimer * 2) % this.cloakCycle;
        this.isCloaked = cyclePosition > this.cloakCycle * 0.6;
        
        // Stealth movement pattern
        const stealthFactor = this.isCloaked ? 1.5 : 1.0;
        this.group.position.x += Math.sin(this.cloakTimer * 0.8) * 0.02 * stealthFactor;
        this.group.position.z += Math.cos(this.cloakTimer * 0.6) * 0.02 * stealthFactor;
        this.group.position.y = 4 + Math.sin(this.cloakTimer * 1.2) * 2;
        
        // Phase rotation
        this.group.rotation.y += this.rotationSpeed;
        
        // Cloaking effect
        const targetOpacity = this.isCloaked ? 0.15 : 0.8;
        const phaseShift = Math.sin(this.phaseShiftTimer * 8) * 0.1;
        
        this.cloakMaterials.forEach(material => {
            material.opacity += (targetOpacity - material.opacity) * 0.05;
            
            // Phase shifting color effect
            if (material.color) {
                const hue = (this.phaseShiftTimer * 0.5) % 1;
                material.color.setHSL(hue, 0.8, 0.6);
            }
        });
        
        // Animate lights with phase effect
        this.lights.forEach((light, index) => {
            const pulse = Math.sin(this.phaseShiftTimer * 6 + index) * 0.3 + 0.7;
            light.material.opacity = (this.isCloaked ? 0.1 : 0.7) * pulse;
        });
        
        // Animate cloak field
        if (this.cloakField) {
            this.cloakField.rotation.x += 0.02;
            this.cloakField.rotation.y += 0.015;
            this.cloakField.scale.setScalar(1 + phaseShift);
        }
    }

    animateClick() {
        // Only visual feedback, no removal - let session timeout handle removal
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

// Make CloakedUFOEntity globally accessible
window.CloakedUFOEntity = CloakedUFOEntity;

/**
 * SWARM COMMANDER UFO ENTITY - Level 7.5 (1200 points)
 * Controls multiple mini-UFOs in formation
 */
class SwarmCommanderUFOEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'swarm_commander',
            pointValue: 1200,
            level: 14,
            moveSpeed: 0.05, // Increased speed for more dynamic movement
            rotationSpeed: 0.015,
            clickable: true,
            description: 'Swarm Commander UFO'
        });
        
        this.commandTimer = 0;
        this.swarmMinions = [];
        this.formationAngle = 0;
        this.commandSignals = [];
        
        this.createCommanderUFO();
        this.createSwarmMinions();
        this.positionAtWorldEdgeLevel7();
    }
    
    createCommanderUFO() {
        // Command vessel - distinctive red design
        const scale = 1.2;
        
        // Angular command hull
        const hullGeometry = new THREE.CylinderGeometry(4.2 * scale, 4.8 * scale, 1.1 * scale, 6);
        const hull = new THREE.Mesh(hullGeometry, SharedMaterialsLevel7.commanderRed);
        this.group.add(hull);

        // Command dome
        const domeGeometry = new THREE.SphereGeometry(2.4 * scale, 12, 8);
        const dome = new THREE.Mesh(domeGeometry, SharedMaterialsLevel7.commanderDome);
        dome.position.set(0, 1.2 * scale, 0);
        dome.scale.y = 0.65;
        this.group.add(dome);

        // Command arrays (communication equipment)
        for (let i = 0; i < 6; i++) {
            const arrayGeometry = new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 1.5 * scale, 6);
            const array = new THREE.Mesh(arrayGeometry, SharedMaterialsLevel7.commanderRed);
            const angle = (i / 6) * Math.PI * 2;
            array.position.set(
                Math.cos(angle) * 4.5 * scale,
                0.8 * scale,
                Math.sin(angle) * 4.5 * scale
            );
            array.rotation.z = Math.PI / 6;
            this.group.add(array);
        }

        // Command lights
        this.lights = [];
        const lightGeometry = new THREE.SphereGeometry(0.25 * scale, 8, 6);
        
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const lightMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x00FF00,
                emissive: 0x00AA00,
                emissiveIntensity: 0.8
            });
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(
                Math.cos(angle) * 4.2 * scale,
                -0.2 * scale,
                Math.sin(angle) * 4.2 * scale
            );
            this.lights.push(light);
            this.group.add(light);
        }
    }
    
    createSwarmMinions() {
        const numMinions = 6;
        
        for (let i = 0; i < numMinions; i++) {
            const minion = {
                mesh: new THREE.Group(),
                angle: (i / numMinions) * Math.PI * 2,
                distance: 8,
                height: 0,
                bobSpeed: 1 + Math.random() * 0.5
            };
            
            // Create mini UFO
            const scale = 0.3;
            const miniSaucer = new THREE.Mesh(
                new THREE.CylinderGeometry(1.0 * scale, 1.2 * scale, 0.3 * scale, 8),
                SharedMaterialsLevel7.scoutSilver
            );
            minion.mesh.add(miniSaucer);
            
            const miniDome = new THREE.Mesh(
                new THREE.SphereGeometry(0.6 * scale, 8, 6),
                SharedMaterialsLevel7.scoutDome
            );
            miniDome.position.y = 0.3 * scale;
            miniDome.scale.y = 0.6;
            minion.mesh.add(miniDome);
            
            // Mini lights
            for (let j = 0; j < 4; j++) {
                const lightAngle = (j / 4) * Math.PI * 2;
                const miniLight = new THREE.Mesh(
                    new THREE.SphereGeometry(0.05 * scale, 6, 4),
                    new THREE.MeshBasicMaterial({ color: 0x00FF00 })
                );
                miniLight.position.set(
                    Math.cos(lightAngle) * 1.1 * scale,
                    -0.05 * scale,
                    Math.sin(lightAngle) * 1.1 * scale
                );
                minion.mesh.add(miniLight);
            }
            
            this.scene.add(minion.mesh);
            this.swarmMinions.push(minion);
        }
    }
    
    positionAtWorldEdgeLevel7() {
        const entryStrategy = Math.floor(Math.random() * 7);
        const worldSize = 200;
        
        switch(entryStrategy) {
            case 0:
                this.group.position.set((Math.random() - 0.5) * worldSize * 2, 15 + Math.random() * 30, -worldSize * 1.5);
                break;
            case 1:
                this.group.position.set(worldSize * 1.5, 15 + Math.random() * 30, (Math.random() - 0.5) * worldSize * 2);
                break;
            case 2:
                this.group.position.set((Math.random() - 0.5) * worldSize * 2, 15 + Math.random() * 30, worldSize * 1.5);
                break;
            case 3:
                this.group.position.set(-worldSize * 1.5, 15 + Math.random() * 30, (Math.random() - 0.5) * worldSize * 2);
                break;
            case 4:
                this.group.position.set((Math.random() - 0.5) * worldSize, 45 + Math.random() * 25, (Math.random() - 0.5) * worldSize);
                break;
            case 5:
                this.group.position.set((Math.random() - 0.5) * worldSize * 1.2, 3 + Math.random() * 8, (Math.random() - 0.5) * worldSize * 1.2);
                break;
            case 6:
                const corner = Math.floor(Math.random() * 4);
                const cornerPositions = [[-worldSize, 20 + Math.random() * 20, -worldSize], [worldSize, 20 + Math.random() * 20, -worldSize], [worldSize, 20 + Math.random() * 20, worldSize], [-worldSize, 20 + Math.random() * 20, worldSize]];
                this.group.position.set(...cornerPositions[corner]);
                break;
        }
    }
    
    updateMovement(deltaTime) {
        this.commandTimer += deltaTime * 0.01;
        this.formationAngle += 0.02;
        
        // Commander movement
        this.group.position.x = Math.sin(this.commandTimer * 0.3) * 6;
        this.group.position.z = Math.cos(this.commandTimer * 0.25) * 6;
        this.group.position.y = 5 + Math.sin(this.commandTimer * 0.4) * 1.5;
        
        // Command rotation
        this.group.rotation.y += this.rotationSpeed;
        
        // Update swarm formation
        this.swarmMinions.forEach((minion, index) => {
            const formationAngle = this.formationAngle + minion.angle;
            const leaderPos = this.group.position;
            
            minion.mesh.position.x = leaderPos.x + Math.cos(formationAngle) * minion.distance;
            minion.mesh.position.z = leaderPos.z + Math.sin(formationAngle) * minion.distance;
            minion.mesh.position.y = leaderPos.y - 2 + Math.sin(this.commandTimer * minion.bobSpeed) * 0.5;
            
            // Minion rotation
            minion.mesh.rotation.y += 0.03;
            
            // Face toward commander
            const dx = leaderPos.x - minion.mesh.position.x;
            const dz = leaderPos.z - minion.mesh.position.z;
            minion.mesh.rotation.y = Math.atan2(dx, dz);
        });
        
        // Animate command lights
        this.lights.forEach((light, index) => {
            const commandPulse = Math.sin(this.commandTimer * 4 + index * 0.5);
            light.material.emissiveIntensity = 0.5 + commandPulse * 0.4;
        });
    }
    
    cleanup() {
        // Clean up swarm minions
        this.swarmMinions.forEach(minion => {
            this.scene.remove(minion.mesh);
        });
        this.swarmMinions = [];
    }

    markForRemoval() {
        this.shouldBeRemovedFlag = true;
    }

    shouldBeRemoved() {
        return this.shouldBeRemovedFlag;
    }

    animateClick() {
        super.animateClick();
        super.cleanup();
    }

    animateClick() {
        // Only visual feedback, no removal - let session timeout handle removal
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

// Make SwarmCommanderUFOEntity globally accessible
window.SwarmCommanderUFOEntity = SwarmCommanderUFOEntity;

console.log('🛸 Level 7 Entity Collection - "UFO Invasion" loaded successfully!');
