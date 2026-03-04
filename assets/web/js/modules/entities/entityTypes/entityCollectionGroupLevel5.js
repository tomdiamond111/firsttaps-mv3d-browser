/**
 * ENTITY COLLECTION GROUP LEVEL 5 - "GLOWING OBJECTS" (PREMIUM)
 * Premium level for subscribed players who have reached 25,000+ points
 * 
 * Contains: Blue Pulsing Orb, Yellow Spinning Disc, Red Siren, Pink/Purple Dancing Orbs, White/Green Flashing Cube
 * Points: 500-2000 (highest value targets with spectacular effects)
 * Theme: Luminous objects with advanced animations and glow effects through the file zone
 */

/**
 * SHARED MATERIALS - Available to all Level 5 entities
 */
const SharedMaterialsLevel5 = {
    // Base glow colors
    blue: new THREE.MeshLambertMaterial({ 
        color: 0x0080FF,
        emissive: 0x0040AA,
        emissiveIntensity: 0.3
    }),
    brightBlue: new THREE.MeshLambertMaterial({ 
        color: 0x00BFFF,
        emissive: 0x0080FF,
        emissiveIntensity: 0.5
    }),
    yellow: new THREE.MeshLambertMaterial({ 
        color: 0xFFD700,
        emissive: 0xFFA500,
        emissiveIntensity: 0.4
    }),
    brightYellow: new THREE.MeshLambertMaterial({ 
        color: 0xFFFF00,
        emissive: 0xFFD700,
        emissiveIntensity: 0.6
    }),
    red: new THREE.MeshLambertMaterial({ 
        color: 0xFF0000,
        emissive: 0xAA0000,
        emissiveIntensity: 0.4
    }),
    brightRed: new THREE.MeshLambertMaterial({ 
        color: 0xFF4444,
        emissive: 0xFF0000,
        emissiveIntensity: 0.7
    }),
    pink: new THREE.MeshLambertMaterial({ 
        color: 0xFF69B4,
        emissive: 0xDD1493,
        emissiveIntensity: 0.3
    }),
    purple: new THREE.MeshLambertMaterial({ 
        color: 0x9932CC,
        emissive: 0x7B68EE,
        emissiveIntensity: 0.4
    }),
    white: new THREE.MeshLambertMaterial({ 
        color: 0xFFFFFF,
        emissive: 0xCCCCCC,
        emissiveIntensity: 0.3
    }),
    green: new THREE.MeshLambertMaterial({ 
        color: 0x00FF00,
        emissive: 0x00AA00,
        emissiveIntensity: 0.4
    }),
    
    // Transparent glow materials
    blueGlow: new THREE.MeshLambertMaterial({ 
        color: 0x0080FF,
        transparent: true,
        opacity: 0.6,
        emissive: 0x0040AA,
        emissiveIntensity: 0.8
    }),
    energyTrail: new THREE.MeshLambertMaterial({ 
        color: 0xFFD700,
        transparent: true,
        opacity: 0.4,
        emissive: 0xFFA500,
        emissiveIntensity: 0.9
    })
};

// Make SharedMaterialsLevel5 globally accessible
window.SharedMaterialsLevel5 = SharedMaterialsLevel5;

/**
 * BLUE PULSING ORB ENTITY - Level 5.1 (500 points)
 * Rhythmic pulsing with expanding energy rings
 */
class BluePulsingOrbEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'blue_orb',
            pointValue: 500,
            level: 17,
            moveSpeed: 0.02,
            changeDirectionInterval: 120,
            sessionDuration: 20000 // 20 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Orb-specific properties
        this.pulsePhase = 0;
        this.pulseIntensity = 1;
        this.energyRings = [];
        this.floatPhase = 0;
        
        this.createBluePulsingOrbMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createBluePulsingOrbMesh() {
        this.group = new THREE.Group();
        
        // Main orb core
        const coreGeometry = new THREE.SphereGeometry(0.4, 16, 12);
        this.core = new THREE.Mesh(coreGeometry, SharedMaterialsLevel5.brightBlue);
        this.group.add(this.core);
        
        // Inner glow layer
        const innerGlowGeometry = new THREE.SphereGeometry(0.5, 12, 8);
        this.innerGlow = new THREE.Mesh(innerGlowGeometry, SharedMaterialsLevel5.blueGlow);
        this.group.add(this.innerGlow);
        
        // Energy rings around orb
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.TorusGeometry(0.8 + i * 0.3, 0.05, 8, 16);
            const ring = new THREE.Mesh(ringGeometry, SharedMaterialsLevel5.blue);
            ring.rotation.x = Math.PI / 2;
            ring.rotation.z = i * Math.PI / 3;
            this.group.add(ring);
            this.energyRings.push(ring);
        }
        
        // Particle effects
        this.particles = [];
        for (let i = 0; i < 8; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.03, 6, 4);
            const particle = new THREE.Mesh(particleGeometry, SharedMaterialsLevel5.brightBlue);
            
            const angle = (i / 8) * Math.PI * 2;
            particle.position.set(
                Math.cos(angle) * 1.2,
                Math.sin(angle) * 0.3,
                Math.sin(angle) * 1.2
            );
            
            this.group.add(particle);
            this.particles.push({ mesh: particle, angle: angle, radius: 1.2 });
        }
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'blue_orb';
        
        this.scene.add(this.group);
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Pulsing animation
        this.pulsePhase += 0.08;
        this.floatPhase += 0.03;
        
        // Core pulsing
        const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.3;
        this.core.scale.setScalar(pulseScale);
        
        // Glow intensity pulsing
        const glowPulse = 0.6 + Math.sin(this.pulsePhase * 1.5) * 0.4;
        this.innerGlow.material.opacity = glowPulse;
        this.innerGlow.scale.setScalar(1.2 + Math.sin(this.pulsePhase) * 0.2);
        
        // Energy rings rotation
        this.energyRings.forEach((ring, i) => {
            ring.rotation.y += 0.02 * (i + 1);
            ring.rotation.z += 0.01 * (i + 1);
        });
        
        // Floating movement through file zone
        this.group.position.y = 2 + Math.sin(this.floatPhase) * 0.8;
        this.group.position.z += this.moveSpeed;
        this.group.position.x += Math.sin(this.floatPhase * 0.7) * 0.01;
        
        // Orbiting particles
        this.particles.forEach((particle, i) => {
            particle.angle += 0.05;
            particle.mesh.position.x = Math.cos(particle.angle) * particle.radius;
            particle.mesh.position.z = Math.sin(particle.angle) * particle.radius;
            particle.mesh.position.y = Math.sin(particle.angle * 2) * 0.3;
        });
        
        // Overall orb rotation
        this.group.rotation.y += 0.02;
    }
}

/**
 * YELLOW SPINNING DISC ENTITY - Level 5.2 (700 points)
 * High-speed rotation with energy trails
 */
class YellowSpinningDiscEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'yellow_disc',
            pointValue: 2000,
            level: 18,
            moveSpeed: 0.025,
            changeDirectionInterval: 100,
            sessionDuration: 18000 // 18 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Disc-specific properties
        this.spinSpeed = 0;
        this.maxSpinSpeed = 0.3;
        this.energyTrails = [];
        this.trailPhase = 0;
        
        this.createYellowSpinningDiscMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createYellowSpinningDiscMesh() {
        this.group = new THREE.Group();
        
        // Main disc
        const discGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 32);
        this.disc = new THREE.Mesh(discGeometry, SharedMaterialsLevel5.brightYellow);
        this.group.add(this.disc);
        
        // Disc rim with segments
        for (let i = 0; i < 16; i++) {
            const segmentGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.15);
            const segment = new THREE.Mesh(segmentGeometry, SharedMaterialsLevel5.yellow);
            
            const angle = (i / 16) * Math.PI * 2;
            segment.position.x = Math.cos(angle) * 0.55;
            segment.position.z = Math.sin(angle) * 0.55;
            segment.rotation.y = angle;
            
            this.disc.add(segment);
        }
        
        // Center hub
        const hubGeometry = new THREE.SphereGeometry(0.15, 12, 8);
        const hub = new THREE.Mesh(hubGeometry, SharedMaterialsLevel5.brightYellow);
        this.group.add(hub);
        
        // Energy trails behind disc
        for (let i = 0; i < 5; i++) {
            const trailGeometry = new THREE.PlaneGeometry(0.3, 1.5);
            const trail = new THREE.Mesh(trailGeometry, SharedMaterialsLevel5.energyTrail);
            trail.position.z = -0.5 - i * 0.3;
            trail.material.opacity = 0.8 - i * 0.15;
            this.group.add(trail);
            this.energyTrails.push(trail);
        }
        
        // Spinning blade effects
        this.blades = [];
        for (let i = 0; i < 4; i++) {
            const bladeGeometry = new THREE.PlaneGeometry(0.8, 0.05);
            const blade = new THREE.Mesh(bladeGeometry, SharedMaterialsLevel5.energyTrail);
            blade.rotation.z = i * Math.PI / 2;
            this.disc.add(blade);
            this.blades.push(blade);
        }
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'yellow_disc';
        
        this.scene.add(this.group);
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Accelerating spin
        this.spinSpeed = Math.min(this.maxSpinSpeed, this.spinSpeed + 0.005);
        this.disc.rotation.y += this.spinSpeed;
        
        // Trail animation
        this.trailPhase += 0.1;
        this.energyTrails.forEach((trail, i) => {
            trail.material.opacity = (0.8 - i * 0.15) * (0.5 + Math.sin(this.trailPhase + i) * 0.5);
            trail.rotation.y = Math.sin(this.trailPhase + i * 0.5) * 0.2;
        });
        
        // Blade glow effects
        this.blades.forEach((blade, i) => {
            blade.material.opacity = 0.6 + Math.sin(this.trailPhase * 2 + i) * 0.4;
        });
        
        // Movement through file zone with slight wobble
        this.group.position.z += this.moveSpeed;
        this.group.position.y = 1.5 + Math.sin(Date.now() * 0.003) * 0.3;
        this.group.position.x += Math.sin(Date.now() * 0.002) * 0.008;
        
        // Disc tilting from spin force
        this.group.rotation.z = Math.sin(Date.now() * 0.001) * 0.1;
    }
}

/**
 * RED SIREN ENTITY - Level 5.3 (900 points)
 * Emergency flash patterns with alarm movement
 */
class RedSirenEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'red_siren',
            pointValue: 900,
            level: 19,
            moveSpeed: 0.03,
            changeDirectionInterval: 60,
            sessionDuration: 16000 // 16 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Siren-specific properties
        this.flashPhase = 0;
        this.isFlashing = true;
        this.urgentMovement = true;
        this.sirenLights = [];
        
        this.createRedSirenMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createRedSirenMesh() {
        this.group = new THREE.Group();
        
        // Main siren body
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.3, 0.6, 12);
        const body = new THREE.Mesh(bodyGeometry, SharedMaterialsLevel5.red);
        this.group.add(body);
        
        // Siren dome (top)
        const domeGeometry = new THREE.SphereGeometry(0.4, 12, 8);
        domeGeometry.scale(1, 0.7, 1);
        this.dome = new THREE.Mesh(domeGeometry, SharedMaterialsLevel5.brightRed);
        this.dome.position.y = 0.4;
        this.group.add(this.dome);
        
        // Rotating light strips
        for (let i = 0; i < 4; i++) {
            const stripGeometry = new THREE.BoxGeometry(0.6, 0.05, 0.05);
            const strip = new THREE.Mesh(stripGeometry, SharedMaterialsLevel5.brightRed);
            strip.rotation.y = i * Math.PI / 2;
            strip.position.y = 0.4;
            this.dome.add(strip);
            this.sirenLights.push(strip);
        }
        
        // Base platform
        const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const base = new THREE.Mesh(baseGeometry, SharedMaterialsLevel5.red);
        base.position.y = -0.35;
        this.group.add(base);
        
        // Warning beacons around base
        for (let i = 0; i < 8; i++) {
            const beaconGeometry = new THREE.SphereGeometry(0.06, 8, 6);
            const beacon = new THREE.Mesh(beaconGeometry, SharedMaterialsLevel5.brightRed);
            
            const angle = (i / 8) * Math.PI * 2;
            beacon.position.x = Math.cos(angle) * 0.45;
            beacon.position.z = Math.sin(angle) * 0.45;
            beacon.position.y = -0.3;
            
            base.add(beacon);
            this.sirenLights.push(beacon);
        }
        
        // Emergency glow effect
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 12);
        this.glow = new THREE.Mesh(glowGeometry, SharedMaterialsLevel5.red);
        this.glow.material.transparent = true;
        this.glow.material.opacity = 0.3;
        this.group.add(this.glow);
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'red_siren';
        
        this.scene.add(this.group);
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Emergency flash pattern
        this.flashPhase += 0.25; // Fast flashing
        
        const flashOn = Math.sin(this.flashPhase) > 0;
        const flashIntensity = flashOn ? 1 : 0.2;
        
        // Flash all siren lights
        this.sirenLights.forEach((light, i) => {
            light.material.emissiveIntensity = flashIntensity * (0.7 + Math.sin(this.flashPhase + i) * 0.3);
        });
        
        // Dome and glow pulsing
        this.dome.material.emissiveIntensity = flashIntensity * 0.8;
        this.glow.material.opacity = flashIntensity * 0.4;
        this.glow.scale.setScalar(1 + flashIntensity * 0.2);
        
        // Dome rotation
        this.dome.rotation.y += 0.08;
        
        // Urgent movement pattern through file zone
        this.group.position.z += this.moveSpeed;
        
        // Erratic emergency movement
        if (this.urgentMovement) {
            this.group.position.x += Math.sin(this.flashPhase * 0.5) * 0.02;
            this.group.position.y = 1 + Math.sin(this.flashPhase * 0.3) * 0.4;
        }
        
        // Random direction changes (emergency response)
        if (Math.random() < 0.03) {
            this.moveSpeed += (Math.random() - 0.5) * 0.01;
            this.moveSpeed = Math.max(0.02, Math.min(0.05, this.moveSpeed));
        }
        
        // Slight tilt from urgent movement
        this.group.rotation.z = Math.sin(this.flashPhase * 0.2) * 0.1;
    }
}

/**
 * PINK/PURPLE DANCING ORBS ENTITY - Level 5.4 (1000 points)
 * Synchronized pair with choreographed movements
 */
class DancingOrbsEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'dancing_orbs',
            pointValue: 1500,
            level: 20,
            moveSpeed: 0.02,
            changeDirectionInterval: 180,
            sessionDuration: 22000 // 22 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Dancing orbs-specific properties
        this.dancePhase = 0;
        this.choreographyPhase = 0;
        this.orbDistance = 1.5;
        this.colorShiftPhase = 0;
        
        this.createDancingOrbsMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createDancingOrbsMesh() {
        this.group = new THREE.Group();
        
        // Orb 1 (Pink)
        const orb1Geometry = new THREE.SphereGeometry(0.3, 16, 12);
        this.orb1 = new THREE.Mesh(orb1Geometry, SharedMaterialsLevel5.pink);
        this.group.add(this.orb1);
        
        // Orb 2 (Purple)
        const orb2Geometry = new THREE.SphereGeometry(0.3, 16, 12);
        this.orb2 = new THREE.Mesh(orb2Geometry, SharedMaterialsLevel5.purple);
        this.group.add(this.orb2);
        
        // Energy connection between orbs
        this.connections = [];
        for (let i = 0; i < 3; i++) {
            const connectionGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1);
            const connection = new THREE.Mesh(connectionGeometry, SharedMaterialsLevel5.pink);
            connection.material.transparent = true;
            connection.material.opacity = 0.6;
            this.group.add(connection);
            this.connections.push(connection);
        }
        
        // Particle trails for each orb
        this.orb1Trails = [];
        this.orb2Trails = [];
        
        for (let i = 0; i < 5; i++) {
            // Pink orb trails
            const trail1Geometry = new THREE.SphereGeometry(0.05, 8, 6);
            const trail1 = new THREE.Mesh(trail1Geometry, SharedMaterialsLevel5.pink);
            trail1.material.transparent = true;
            trail1.material.opacity = 0.8 - i * 0.15;
            this.group.add(trail1);
            this.orb1Trails.push(trail1);
            
            // Purple orb trails
            const trail2Geometry = new THREE.SphereGeometry(0.05, 8, 6);
            const trail2 = new THREE.Mesh(trail2Geometry, SharedMaterialsLevel5.purple);
            trail2.material.transparent = true;
            trail2.material.opacity = 0.8 - i * 0.15;
            this.group.add(trail2);
            this.orb2Trails.push(trail2);
        }
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'dancing_orbs';
        
        this.scene.add(this.group);
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Dancing choreography
        this.dancePhase += 0.05;
        this.choreographyPhase += 0.03;
        this.colorShiftPhase += 0.02;
        
        // Synchronized dancing positions
        const dance1X = Math.sin(this.dancePhase) * this.orbDistance;
        const dance1Y = Math.cos(this.dancePhase * 1.3) * 0.8;
        const dance1Z = Math.sin(this.dancePhase * 0.7) * 0.5;
        
        const dance2X = Math.sin(this.dancePhase + Math.PI) * this.orbDistance;
        const dance2Y = Math.cos(this.dancePhase * 1.3 + Math.PI) * 0.8;
        const dance2Z = Math.sin(this.dancePhase * 0.7 + Math.PI) * 0.5;
        
        // Position orbs in dance formation
        this.orb1.position.set(dance1X, 1.5 + dance1Y, dance1Z);
        this.orb2.position.set(dance2X, 1.5 + dance2Y, dance2Z);
        
        // Update energy connections
        this.connections.forEach((connection, i) => {
            const midX = (dance1X + dance2X) / 2;
            const midY = 1.5 + (dance1Y + dance2Y) / 2;
            const midZ = (dance1Z + dance2Z) / 2;
            
            connection.position.set(midX, midY, midZ);
            connection.lookAt(this.orb2.position);
            connection.scale.y = this.orb1.position.distanceTo(this.orb2.position);
            
            // Pulsing connections
            connection.material.opacity = 0.6 + Math.sin(this.colorShiftPhase + i) * 0.3;
        });
        
        // Trail effects
        this.orb1Trails.forEach((trail, i) => {
            trail.position.copy(this.orb1.position);
            trail.position.z -= i * 0.1;
            trail.position.x += Math.sin(this.dancePhase - i * 0.2) * 0.1;
        });
        
        this.orb2Trails.forEach((trail, i) => {
            trail.position.copy(this.orb2.position);
            trail.position.z -= i * 0.1;
            trail.position.x += Math.sin(this.dancePhase - i * 0.2 + Math.PI) * 0.1;
        });
        
        // Color shifting
        const colorShift = Math.sin(this.colorShiftPhase);
        this.orb1.material.emissiveIntensity = 0.3 + colorShift * 0.2;
        this.orb2.material.emissiveIntensity = 0.4 + colorShift * 0.3;
        
        // Forward movement through file zone
        this.group.position.z += this.moveSpeed;
        
        // Gentle swaying of entire pair
        this.group.position.x += Math.sin(this.choreographyPhase) * 0.005;
        
        // Synchronized rotation
        this.group.rotation.y += 0.01;
    }
}

/**
 * WHITE/GREEN FLASHING CUBE ENTITY - Level 5.5 (1200 points)
 * Geometric transformations with high-value rare spawns
 */
class FlashingCubeEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'flashing_cube',
            pointValue: 1200,
            level: 21,
            moveSpeed: 0.015,
            changeDirectionInterval: 200,
            sessionDuration: 25000 // 25 seconds - rare but valuable
        });
        
        this.shouldBeRemovedFlag = false;

        // Cube-specific properties
        this.transformPhase = 0;
        this.flashPhase = 0;
        this.geometryMode = 0; // 0=cube, 1=pyramid, 2=sphere
        this.transformTimer = 0;
        this.currentColor = 'white';
        
        this.createFlashingCubeMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createFlashingCubeMesh() {
        this.group = new THREE.Group();
        
        // Main transforming shape
        this.mainShape = new THREE.Group();
        
        // Cube form
        const cubeGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        this.cubeForm = new THREE.Mesh(cubeGeometry, SharedMaterialsLevel5.white);
        this.mainShape.add(this.cubeForm);
        
        // Pyramid form (initially hidden)
        const pyramidGeometry = new THREE.ConeGeometry(0.6, 1, 4);
        this.pyramidForm = new THREE.Mesh(pyramidGeometry, SharedMaterialsLevel5.green);
        this.pyramidForm.visible = false;
        this.mainShape.add(this.pyramidForm);
        
        // Sphere form (initially hidden)
        const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 12);
        this.sphereForm = new THREE.Mesh(sphereGeometry, SharedMaterialsLevel5.white);
        this.sphereForm.visible = false;
        this.mainShape.add(this.sphereForm);
        
        this.group.add(this.mainShape);
        
        // Wireframe overlay
        const wireGeometry = new THREE.BoxGeometry(0.85, 0.85, 0.85);
        const wireEdges = new THREE.EdgesGeometry(wireGeometry);
        this.wireframe = new THREE.LineSegments(wireEdges, new THREE.LineBasicMaterial({ 
            color: 0x00FF00,
            transparent: true,
            opacity: 0.7
        }));
        this.group.add(this.wireframe);
        
        // Energy field around cube
        const fieldGeometry = new THREE.SphereGeometry(1.2, 16, 12);
        this.energyField = new THREE.Mesh(fieldGeometry, SharedMaterialsLevel5.white);
        this.energyField.material.transparent = true;
        this.energyField.material.opacity = 0.2;
        this.group.add(this.energyField);
        
        // Floating data fragments
        this.dataFragments = [];
        for (let i = 0; i < 12; i++) {
            const fragGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
            const fragment = new THREE.Mesh(fragGeometry, SharedMaterialsLevel5.green);
            
            const angle = (i / 12) * Math.PI * 2;
            fragment.position.set(
                Math.cos(angle) * 1.5,
                Math.sin(angle * 2) * 0.5,
                Math.sin(angle) * 1.5
            );
            
            this.group.add(fragment);
            this.dataFragments.push({ mesh: fragment, angle: angle, speed: 0.02 + Math.random() * 0.03 });
        }
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'flashing_cube';
        
        this.scene.add(this.group);
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Transformation and flashing
        this.transformPhase += 0.02;
        this.flashPhase += 0.15;
        this.transformTimer++;
        
        // Geometric transformation every 3 seconds
        if (this.transformTimer >= 180) {
            this.transformTimer = 0;
            this.geometryMode = (this.geometryMode + 1) % 3;
            
            // Hide all forms
            this.cubeForm.visible = false;
            this.pyramidForm.visible = false;
            this.sphereForm.visible = false;
            
            // Show current form
            switch (this.geometryMode) {
                case 0:
                    this.cubeForm.visible = true;
                    this.currentColor = 'white';
                    break;
                case 1:
                    this.pyramidForm.visible = true;
                    this.currentColor = 'green';
                    break;
                case 2:
                    this.sphereForm.visible = true;
                    this.currentColor = 'white';
                    break;
            }
        }
        
        // Flashing effect
        const flashOn = Math.sin(this.flashPhase) > 0;
        const flashIntensity = flashOn ? 1 : 0.3;
        
        // Apply flash to current form
        this.cubeForm.material.emissiveIntensity = this.cubeForm.visible ? flashIntensity * 0.5 : 0;
        this.pyramidForm.material.emissiveIntensity = this.pyramidForm.visible ? flashIntensity * 0.6 : 0;
        this.sphereForm.material.emissiveIntensity = this.sphereForm.visible ? flashIntensity * 0.4 : 0;
        
        // Energy field pulsing
        this.energyField.material.opacity = 0.2 + flashIntensity * 0.3;
        this.energyField.scale.setScalar(1 + Math.sin(this.transformPhase) * 0.1);
        
        // Wireframe animation
        this.wireframe.material.opacity = 0.7 + Math.sin(this.flashPhase * 2) * 0.3;
        
        // Main shape rotation
        this.mainShape.rotation.x += 0.02;
        this.mainShape.rotation.y += 0.03;
        this.mainShape.rotation.z += 0.01;
        
        // Data fragments orbiting
        this.dataFragments.forEach((fragment, i) => {
            fragment.angle += fragment.speed;
            fragment.mesh.position.x = Math.cos(fragment.angle) * 1.5;
            fragment.mesh.position.z = Math.sin(fragment.angle) * 1.5;
            fragment.mesh.position.y = Math.sin(fragment.angle * 3) * 0.5;
            
            // Fragment rotation
            fragment.mesh.rotation.x += 0.05;
            fragment.mesh.rotation.y += 0.03;
        });
        
        // Movement through file zone
        this.group.position.z += this.moveSpeed;
        this.group.position.y = 2 + Math.sin(this.transformPhase) * 0.4;
        
        // Slight side-to-side drift
        this.group.position.x += Math.sin(this.transformPhase * 0.5) * 0.003;
        
        // Overall group rotation
        this.group.rotation.y += 0.005;
    }
}

// Export entity classes for global access
window.BluePulsingOrbEntity = BluePulsingOrbEntity;
window.YellowSpinningDiscEntity = YellowSpinningDiscEntity;
window.RedSirenEntity = RedSirenEntity;
window.DancingOrbsEntity = DancingOrbsEntity;
window.FlashingCubeEntity = FlashingCubeEntity;

console.log('✨ Level 5 Glowing Objects entities loaded - Premium spectacle ready');