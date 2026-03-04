/**
 * ENTITY COLLECTION GROUP LEVEL 4 - "INSECT SAFARI" (PREMIUM)
 * Premium level for subscribed players who have reached 15,000+ points
 * 
 * Contains: Black Spider, Green Praying Mantis, Black Housefly, Orange/Black Butterfly, Red/Black Ladybug
 * Points: 500-2000 (challenging insect hunting)
 * Theme: Realistic insects with authentic movement patterns through the file zone
 */

/**
 * SHARED MATERIALS - Available to all Level 4 entities
 */
const SharedMaterialsLevel4 = {
    // Insect colors
    black: new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
    darkBlack: new THREE.MeshLambertMaterial({ color: 0x0a0a0a }),
    green: new THREE.MeshLambertMaterial({ color: 0x228B22 }), // Forest Green
    darkGreen: new THREE.MeshLambertMaterial({ color: 0x006400 }), // Dark Green
    orange: new THREE.MeshLambertMaterial({ color: 0xFF4500 }), // Orange Red
    red: new THREE.MeshLambertMaterial({ color: 0xDC143C }), // Crimson
    yellow: new THREE.MeshLambertMaterial({ color: 0xFFD700 }), // Gold
    brown: new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // Saddle Brown
    white: new THREE.MeshLambertMaterial({ color: 0xFFFFFF }),
    
    // Transparent materials for wings
    clearWing: new THREE.MeshLambertMaterial({ 
        color: 0xFFFFFF, 
        transparent: true, 
        opacity: 0.3 
    }),
    orangeWing: new THREE.MeshLambertMaterial({ 
        color: 0xFF4500, 
        transparent: true, 
        opacity: 0.7 
    })
};

// Make SharedMaterialsLevel4 globally accessible
window.SharedMaterialsLevel4 = SharedMaterialsLevel4;

/**
 * BLACK SPIDER ENTITY - Level 4.1 (300 points)
 * Web-swinging movement across file zone with occasional stops
 */
class BlackSpiderEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'spider',
            pointValue: 500,
            level: 12,
            moveSpeed: 0.025,
            changeDirectionInterval: 80,
            sessionDuration: 22000 // 22 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Spider-specific properties
        this.swingPhase = 0;
        this.swingAmplitude = 2;
        this.isSwinging = true;
        this.pauseTimer = 0;
        this.webPoints = [];
        
        this.createSpiderMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createSpiderMesh() {
        this.group = new THREE.Group();
        
        // Spider body (abdomen)
        const bodyGeometry = new THREE.SphereGeometry(0.4, 12, 8);
        bodyGeometry.scale(1, 0.8, 1.4);
        const body = new THREE.Mesh(bodyGeometry, SharedMaterialsLevel4.black);
        this.group.add(body);
        
        // Spider thorax
        const thoraxGeometry = new THREE.SphereGeometry(0.25, 10, 6);
        const thorax = new THREE.Mesh(thoraxGeometry, SharedMaterialsLevel4.darkBlack);
        thorax.position.set(0, 0, 0.5);
        this.group.add(thorax);
        
        // Spider legs (8 legs)
        for (let i = 0; i < 8; i++) {
            const legGroup = new THREE.Group();
            
            // Upper leg segment
            const upperLegGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.6);
            const upperLeg = new THREE.Mesh(upperLegGeometry, SharedMaterialsLevel4.darkBlack);
            upperLeg.position.y = 0.3;
            upperLeg.rotation.z = (i < 4 ? 0.5 : -0.5);
            
            // Lower leg segment
            const lowerLegGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.5);
            const lowerLeg = new THREE.Mesh(lowerLegGeometry, SharedMaterialsLevel4.black);
            lowerLeg.position.y = 0.6;
            lowerLeg.rotation.z = (i < 4 ? 0.3 : -0.3);
            
            legGroup.add(upperLeg, lowerLeg);
            
            // Position legs around body
            const angle = (i / 8) * Math.PI * 2;
            legGroup.position.x = Math.cos(angle) * 0.3;
            legGroup.position.z = Math.sin(angle) * 0.2;
            legGroup.rotation.y = angle;
            
            this.group.add(legGroup);
        }
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'spider';
        
        // Flip spider 180 degrees so legs point down instead of up
        this.group.rotation.x = Math.PI; // 180 degrees rotation
        
        this.scene.add(this.group);
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Web-swinging movement
        if (this.isSwinging) {
            this.swingPhase += 0.04;
            
            // Move in pendulum arc through file zone
            const swingX = Math.sin(this.swingPhase) * this.swingAmplitude;
            const swingY = Math.cos(this.swingPhase * 0.5) * 0.5;
            
            this.group.position.x += swingX * 0.01;
            this.group.position.y = Math.max(1, this.group.position.y + swingY * 0.01);
            
            // Move forward through file zone
            this.group.position.z += this.moveSpeed;
            
            // Occasional pause
            if (Math.random() < 0.005) {
                this.isSwinging = false;
                this.pauseTimer = 60; // Pause for 1 second at 60fps
            }
        } else {
            // Stationary pause
            this.pauseTimer--;
            if (this.pauseTimer <= 0) {
                this.isSwinging = true;
            }
        }
        
        // Rotate body slightly during movement
        this.group.rotation.z = Math.sin(this.swingPhase) * 0.1;
    }
}

/**
 * GREEN PRAYING MANTIS ENTITY - Level 4.2 (400 points)
 * Quick strike movements with camouflaged pauses
 */
class PrayingMantisEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'mantis',
            pointValue: 1000,
            level: 13,
            moveSpeed: 0.02,
            changeDirectionInterval: 100,
            sessionDuration: 20000 // 20 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Mantis-specific properties
        this.strikePhase = 0;
        this.isStriking = false;
        this.camouflageTimer = 0;
        this.stealthMode = false;
        this.headTurnPhase = 0;
        
        this.createMantisMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createMantisMesh() {
        this.group = new THREE.Group();
        
        // Mantis thorax (main body)
        const thoraxGeometry = new THREE.CylinderGeometry(0.15, 0.2, 1.2);
        const thorax = new THREE.Mesh(thoraxGeometry, SharedMaterialsLevel4.green);
        thorax.rotation.x = Math.PI / 2;
        this.group.add(thorax);
        
        // Mantis head
        const headGeometry = new THREE.SphereGeometry(0.3, 10, 8);
        headGeometry.scale(0.8, 1, 0.9);
        this.head = new THREE.Mesh(headGeometry, SharedMaterialsLevel4.darkGreen);
        this.head.position.set(0, 0.2, 0.8);
        this.group.add(this.head);
        
        // Compound eyes
        for (let i = 0; i < 2; i++) {
            const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 6);
            const eye = new THREE.Mesh(eyeGeometry, SharedMaterialsLevel4.black);
            eye.position.set(i === 0 ? -0.15 : 0.15, 0.1, 0.2);
            this.head.add(eye);
        }
        
        // Praying arms (raptorial forelegs)
        for (let i = 0; i < 2; i++) {
            const armGroup = new THREE.Group();
            
            // Upper arm
            const upperArmGeometry = new THREE.CylinderGeometry(0.04, 0.06, 0.6);
            const upperArm = new THREE.Mesh(upperArmGeometry, SharedMaterialsLevel4.green);
            upperArm.position.y = 0.3;
            
            // Lower arm with spikes
            const lowerArmGeometry = new THREE.CylinderGeometry(0.03, 0.05, 0.5);
            const lowerArm = new THREE.Mesh(lowerArmGeometry, SharedMaterialsLevel4.darkGreen);
            lowerArm.position.y = 0.6;
            
            armGroup.add(upperArm, lowerArm);
            armGroup.position.set(i === 0 ? -0.2 : 0.2, 0, 0.4);
            armGroup.rotation.z = i === 0 ? 0.3 : -0.3;
            
            this.group.add(armGroup);
            
            // Store arm reference for striking animation
            if (i === 0) this.leftArm = armGroup;
            else this.rightArm = armGroup;
        }
        
        // Wings
        for (let i = 0; i < 4; i++) {
            const wingGeometry = new THREE.PlaneGeometry(0.8, 0.3);
            const wing = new THREE.Mesh(wingGeometry, SharedMaterialsLevel4.clearWing);
            wing.position.set(
                i < 2 ? -0.3 : 0.3,
                0.1,
                i % 2 === 0 ? -0.2 : -0.4
            );
            wing.rotation.x = -0.2;
            this.group.add(wing);
        }
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'mantis';
        
        this.scene.add(this.group);
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Head turning movement
        this.headTurnPhase += 0.02;
        this.head.rotation.y = Math.sin(this.headTurnPhase) * 0.3;
        
        // Strike movement pattern
        if (!this.isStriking && Math.random() < 0.01) {
            this.isStriking = true;
            this.strikePhase = 0;
        }
        
        if (this.isStriking) {
            this.strikePhase += 0.15;
            
            // Quick forward lunge
            const strikeForward = Math.sin(this.strikePhase) * 0.5;
            this.group.position.z += strikeForward * 0.02;
            
            // Arm striking motion
            if (this.leftArm && this.rightArm) {
                this.leftArm.rotation.z = 0.3 + Math.sin(this.strikePhase * 2) * 0.4;
                this.rightArm.rotation.z = -0.3 - Math.sin(this.strikePhase * 2) * 0.4;
            }
            
            if (this.strikePhase >= Math.PI) {
                this.isStriking = false;
                this.camouflageTimer = 120; // Pause after strike
            }
        } else {
            // Normal movement through file zone
            this.group.position.z += this.moveSpeed;
            this.group.position.x += Math.sin(Date.now() * 0.001) * 0.01;
            
            // Camouflage pause
            if (this.camouflageTimer > 0) {
                this.camouflageTimer--;
                // Slight color change during camouflage
                this.stealthMode = true;
            } else {
                this.stealthMode = false;
            }
        }
    }
}

/**
 * BLACK HOUSEFLY ENTITY - Level 4.3 (500 points)
 * Very fast erratic buzzing movement, small target
 */
class HouseflyEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'housefly',
            pointValue: 2000,
            level: 14,
            moveSpeed: 0.04, // Fast movement
            changeDirectionInterval: 20, // Frequent direction changes
            sessionDuration: 15000 // 15 seconds - shorter due to difficulty
        });
        
        this.shouldBeRemovedFlag = false;

        // Housefly-specific properties
        this.buzzPhase = 0;
        this.buzzAmplitude = 0.3;
        this.erraticMovement = true;
        this.wingBeatPhase = 0;
        
        this.createHouseflyMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createHouseflyMesh() {
        this.group = new THREE.Group();
        
        // Fly body (very small)
        const bodyGeometry = new THREE.SphereGeometry(0.08, 8, 6);
        bodyGeometry.scale(1, 0.6, 1.5);
        const body = new THREE.Mesh(bodyGeometry, SharedMaterialsLevel4.black);
        this.group.add(body);
        
        // Fly head
        const headGeometry = new THREE.SphereGeometry(0.05, 8, 6);
        const head = new THREE.Mesh(headGeometry, SharedMaterialsLevel4.darkBlack);
        head.position.set(0, 0, 0.1);
        this.group.add(head);
        
        // Compound eyes (large relative to head)
        for (let i = 0; i < 2; i++) {
            const eyeGeometry = new THREE.SphereGeometry(0.03, 6, 4);
            const eye = new THREE.Mesh(eyeGeometry, SharedMaterialsLevel4.red);
            eye.position.set(i === 0 ? -0.04 : 0.04, 0.02, 0.03);
            head.add(eye);
        }
        
        // Wings (transparent, fast beating)
        for (let i = 0; i < 2; i++) {
            const wingGeometry = new THREE.PlaneGeometry(0.12, 0.06);
            this.wing = new THREE.Mesh(wingGeometry, SharedMaterialsLevel4.clearWing);
            this.wing.position.set(i === 0 ? -0.06 : 0.06, 0.02, 0);
            this.wing.rotation.x = -0.1;
            this.group.add(this.wing);
            
            // Store wing reference for animation
            if (i === 0) this.leftWing = this.wing;
            else this.rightWing = this.wing;
        }
        
        // Scale down entire fly to be very small
        this.group.scale.setScalar(0.7);
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'housefly';
        
        this.scene.add(this.group);
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Erratic buzzing movement
        this.buzzPhase += 0.2; // Fast buzzing
        this.wingBeatPhase += 0.8; // Very fast wing beats
        
        // Irregular flight pattern through file zone
        const buzzX = Math.sin(this.buzzPhase) * this.buzzAmplitude;
        const buzzY = Math.cos(this.buzzPhase * 1.3) * this.buzzAmplitude;
        const buzzZ = Math.sin(this.buzzPhase * 0.7) * 0.2;
        
        this.group.position.x += buzzX * 0.01;
        this.group.position.y = Math.max(0.5, this.group.position.y + buzzY * 0.01);
        this.group.position.z += this.moveSpeed + buzzZ * 0.01;
        
        // Random direction changes
        if (Math.random() < 0.1) {
            this.moveSpeed += (Math.random() - 0.5) * 0.01;
            this.moveSpeed = Math.max(0.02, Math.min(0.06, this.moveSpeed));
        }
        
        // Wing beating animation
        if (this.leftWing && this.rightWing) {
            const wingBeat = Math.sin(this.wingBeatPhase) * 0.5;
            this.leftWing.rotation.y = wingBeat;
            this.rightWing.rotation.y = -wingBeat;
        }
        
        // Body rotation from flight instability
        this.group.rotation.x = Math.sin(this.buzzPhase * 0.5) * 0.1;
        this.group.rotation.z = Math.cos(this.buzzPhase * 0.7) * 0.1;
    }
}

/**
 * ORANGE/BLACK BUTTERFLY ENTITY - Level 4.4 (600 points)
 * Graceful flutter patterns with wing animations
 */
class ButterflyEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'butterfly',
            pointValue: 600,
            level: 15,
            moveSpeed: 0.015,
            changeDirectionInterval: 150,
            sessionDuration: 25000 // 25 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Butterfly-specific properties
        this.flutterPhase = 0;
        this.flutterAmplitude = 1.5;
        this.wingBeatPhase = 0;
        this.glidePhase = 0;
        this.isGliding = false;
        
        this.createButterflyMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createButterflyMesh() {
        this.group = new THREE.Group();
        
        // Butterfly body
        const bodyGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.8);
        const body = new THREE.Mesh(bodyGeometry, SharedMaterialsLevel4.black);
        body.rotation.x = Math.PI / 2;
        this.group.add(body);
        
        // Butterfly head
        const headGeometry = new THREE.SphereGeometry(0.06, 8, 6);
        const head = new THREE.Mesh(headGeometry, SharedMaterialsLevel4.black);
        head.position.set(0, 0, 0.4);
        this.group.add(head);
        
        // Antennae
        for (let i = 0; i < 2; i++) {
            const antennaGeometry = new THREE.CylinderGeometry(0.005, 0.01, 0.2);
            const antenna = new THREE.Mesh(antennaGeometry, SharedMaterialsLevel4.black);
            antenna.position.set(i === 0 ? -0.03 : 0.03, 0.05, 0.15);
            antenna.rotation.x = -0.3;
            antenna.rotation.z = i === 0 ? 0.2 : -0.2;
            this.group.add(antenna);
        }
        
        // Wings (large and colorful)
        const wingConfigs = [
            { pos: [-0.4, 0.1, 0.1], scale: [1.2, 0.8], rot: 0.2 }, // Left upper
            { pos: [0.4, 0.1, 0.1], scale: [1.2, 0.8], rot: -0.2 }, // Right upper
            { pos: [-0.3, 0.1, -0.2], scale: [0.8, 0.6], rot: 0.3 }, // Left lower
            { pos: [0.3, 0.1, -0.2], scale: [0.8, 0.6], rot: -0.3 }  // Right lower
        ];
        
        this.wings = [];
        wingConfigs.forEach((config, i) => {
            const wingGeometry = new THREE.PlaneGeometry(0.6, 0.4);
            const wingMaterial = i < 2 ? SharedMaterialsLevel4.orangeWing : SharedMaterialsLevel4.orange;
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            
            wing.position.set(...config.pos);
            wing.scale.set(...config.scale, 1);
            wing.rotation.y = config.rot;
            
            // Add black spots/patterns
            if (i < 2) { // Upper wings get spots
                const spotGeometry = new THREE.CircleGeometry(0.08, 8);
                const spot = new THREE.Mesh(spotGeometry, SharedMaterialsLevel4.black);
                spot.position.set(0, 0, 0.01);
                wing.add(spot);
            }
            
            this.group.add(wing);
            this.wings.push(wing);
        });
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'butterfly';
        
        this.scene.add(this.group);
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Graceful flutter movement
        this.flutterPhase += 0.03;
        this.wingBeatPhase += 0.4;
        this.glidePhase += 0.01;
        
        // Wing beating animation
        const wingBeat = Math.sin(this.wingBeatPhase) * 0.3;
        this.wings.forEach((wing, i) => {
            const side = i % 2 === 0 ? 1 : -1;
            wing.rotation.x = wingBeat * side;
        });
        
        // Flutter movement pattern
        if (!this.isGliding) {
            const flutterX = Math.sin(this.flutterPhase) * this.flutterAmplitude;
            const flutterY = Math.cos(this.flutterPhase * 1.2) * 0.8;
            
            this.group.position.x += flutterX * 0.005;
            this.group.position.y = Math.max(1, this.group.position.y + flutterY * 0.008);
            this.group.position.z += this.moveSpeed;
            
            // Occasional gliding
            if (Math.random() < 0.01) {
                this.isGliding = true;
                this.glideTimer = 60;
            }
        } else {
            // Gliding motion
            this.group.position.z += this.moveSpeed * 1.5;
            this.group.position.y -= 0.01; // Gradual descent
            
            this.glideTimer--;
            if (this.glideTimer <= 0) {
                this.isGliding = false;
            }
        }
        
        // Gentle body swaying
        this.group.rotation.z = Math.sin(this.flutterPhase * 0.5) * 0.1;
    }
}

/**
 * RED/BLACK LADYBUG ENTITY - Level 4.5 (800 points)
 * Circular crawling movements with brief flight patterns
 */
class LadybugEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'ladybug',
            pointValue: 1000,
            level: 16,
            moveSpeed: 0.018,
            changeDirectionInterval: 200,
            sessionDuration: 18000 // 18 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Ladybug-specific properties
        this.crawlPhase = 0;
        this.isFlying = false;
        this.flightTimer = 0;
        this.circleRadius = 0.8;
        this.legWalkPhase = 0;
        
        this.createLadybugMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createLadybugMesh() {
        this.group = new THREE.Group();
        
        // Ladybug body (dome-shaped)
        const bodyGeometry = new THREE.SphereGeometry(0.3, 12, 8);
        bodyGeometry.scale(1, 0.6, 1.2);
        const body = new THREE.Mesh(bodyGeometry, SharedMaterialsLevel4.red);
        this.group.add(body);
        
        // Black spots on back
        const spotPositions = [
            [-0.1, 0.2, 0.1], [0.1, 0.2, 0.1],
            [-0.15, 0.15, -0.1], [0.15, 0.15, -0.1],
            [0, 0.25, -0.2]
        ];
        
        spotPositions.forEach(pos => {
            const spotGeometry = new THREE.SphereGeometry(0.04, 8, 6);
            const spot = new THREE.Mesh(spotGeometry, SharedMaterialsLevel4.black);
            spot.position.set(...pos);
            this.group.add(spot);
        });
        
        // Head (hidden under body)
        const headGeometry = new THREE.SphereGeometry(0.15, 8, 6);
        const head = new THREE.Mesh(headGeometry, SharedMaterialsLevel4.black);
        head.position.set(0, -0.1, 0.35);
        this.group.add(head);
        
        // Antennae
        for (let i = 0; i < 2; i++) {
            const antennaGeometry = new THREE.CylinderGeometry(0.01, 0.02, 0.15);
            const antenna = new THREE.Mesh(antennaGeometry, SharedMaterialsLevel4.black);
            antenna.position.set(i === 0 ? -0.08 : 0.08, 0, 0.4);
            antenna.rotation.x = -0.3;
            this.group.add(antenna);
        }
        
        // Legs (6 legs)
        this.legs = [];
        for (let i = 0; i < 6; i++) {
            const legGeometry = new THREE.CylinderGeometry(0.01, 0.015, 0.2);
            const leg = new THREE.Mesh(legGeometry, SharedMaterialsLevel4.black);
            
            const side = i < 3 ? -1 : 1;
            const legIndex = i % 3;
            
            leg.position.set(side * 0.25, -0.15, (legIndex - 1) * 0.2);
            leg.rotation.z = side * 0.4;
            
            this.group.add(leg);
            this.legs.push(leg);
        }
        
        // Wings (hidden until flight)
        this.wings = [];
        for (let i = 0; i < 2; i++) {
            const wingGeometry = new THREE.PlaneGeometry(0.4, 0.2);
            const wing = new THREE.Mesh(wingGeometry, SharedMaterialsLevel4.clearWing);
            wing.position.set(i === 0 ? -0.2 : 0.2, 0.1, 0);
            wing.rotation.x = -Math.PI / 2;
            wing.visible = false; // Hidden initially
            this.group.add(wing);
            this.wings.push(wing);
        }
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'ladybug';
        
        this.scene.add(this.group);
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        this.legWalkPhase += 0.1;
        
        if (!this.isFlying) {
            // Crawling movement in circular patterns
            this.crawlPhase += 0.02;
            
            const crawlX = Math.sin(this.crawlPhase) * this.circleRadius;
            const crawlZ = Math.cos(this.crawlPhase) * this.circleRadius;
            
            this.group.position.x += crawlX * 0.005;
            this.group.position.z += this.moveSpeed + crawlZ * 0.005;
            
            // Walking leg animation
            this.legs.forEach((leg, i) => {
                leg.rotation.x = Math.sin(this.legWalkPhase + i * 0.5) * 0.2;
            });
            
            // Keep wings hidden
            this.wings.forEach(wing => {
                wing.visible = false;
            });
            
            // Occasional flight
            if (Math.random() < 0.008) {
                this.isFlying = true;
                this.flightTimer = 90; // Fly for 1.5 seconds
                this.wings.forEach(wing => {
                    wing.visible = true;
                });
            }
        } else {
            // Flying movement
            this.group.position.y = Math.max(0.5, this.group.position.y + 0.02);
            this.group.position.z += this.moveSpeed * 2;
            
            // Wing beating during flight
            const wingBeat = Math.sin(this.legWalkPhase * 2) * 0.4;
            this.wings.forEach(wing => {
                wing.rotation.z = wingBeat;
            });
            
            this.flightTimer--;
            if (this.flightTimer <= 0) {
                this.isFlying = false;
                this.group.position.y = 0.3; // Land
            }
        }
        
        // Body tilting during movement
        if (!this.isFlying) {
            this.group.rotation.z = Math.sin(this.crawlPhase) * 0.05;
        }
    }
}

// Export entity classes for global access
window.BlackSpiderEntity = BlackSpiderEntity;
window.PrayingMantisEntity = PrayingMantisEntity;
window.HouseflyEntity = HouseflyEntity;
window.ButterflyEntity = ButterflyEntity;
window.LadybugEntity = LadybugEntity;

console.log('🐛 Level 4 Insect Safari entities loaded - Premium content ready');