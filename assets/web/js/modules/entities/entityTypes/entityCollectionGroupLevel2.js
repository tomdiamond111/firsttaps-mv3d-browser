/**
 * ENTITY COLLECTION GROUP LEVEL 2 - "WOODLAND CREATURES"
 * Intermediate difficulty entities for players who have reached 30,000 points in Level 1
 * Contains: Rabbit, Squirrel, Owl, Deer, Fox
 * Points: 300-1000 (progressive difficulty)
 * Theme: Forest animals with intermediate movement patterns
 */

/**
 * SHARED MATERIALS - Available to all Level 2 entities
 */
const SharedMaterialsV4 = {
    // Naturals
    brown: new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // SaddleBrown
    darkBrown: new THREE.MeshLambertMaterial({ color: 0x5C4033 }), // Dark Brown
    tan: new THREE.MeshLambertMaterial({ color: 0xD2B48C }), // Tan
    white: new THREE.MeshLambertMaterial({ color: 0xFFFFFF }),
    black: new THREE.MeshLambertMaterial({ color: 0x111111 }),
    gray: new THREE.MeshLambertMaterial({ color: 0x808080 }),

    // Fox
    foxOrange: new THREE.MeshLambertMaterial({ color: 0xD95F30 }),
    foxCream: new THREE.MeshLambertMaterial({ color: 0xF5DEB3 }),

    // Squirrel  
    squirrelBrown: new THREE.MeshLambertMaterial({ color: 0xA0522D }),
    squirrelTan: new THREE.MeshLambertMaterial({ color: 0xDEB887 }),

    // Owl
    owlBrown: new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
    owlTan: new THREE.MeshLambertMaterial({ color: 0xD2B48C }),
    owlYellow: new THREE.MeshLambertMaterial({ color: 0xFFD700 }),

    // Deer
    deerBrown: new THREE.MeshLambertMaterial({ color: 0xA0522D }),
    deerTan: new THREE.MeshLambertMaterial({ color: 0xDEB887 }),
    deerBlack: new THREE.MeshLambertMaterial({ color: 0x222222 })
};

// Make SharedMaterialsV4 globally accessible
window.SharedMaterialsV4 = SharedMaterialsV4;

/**
 * RABBIT ENTITY - Level 2.1 (600 points)
 * Fast hopping with unpredictable direction changes
 */
class RabbitEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'rabbit',
            pointValue: 300,
            level: 6,
            moveSpeed: 0.03, // Increased from 0.015 to 2x the speed
            changeDirectionInterval: 40,
            sessionDuration: 25000 // 25 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Rabbit-specific properties
        this.hopPhase = 0;
        this.hopAmplitude = 0.6; // Increased from 0.3 to 2x the jump height
        this.hopFrequency = 0.05; // Less frequent hops - reduced from 0.15
        this.isHopping = false;
        this.groundY = 0.5; // Lower to ground - reduced from 1
        
        this.createRabbitMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }

    createEyeV4(materials) {
        const eyeGroup = new THREE.Group();
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), materials.white);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), materials.black);
        pupil.position.z = 0.04;
        eyeGroup.add(eye, pupil);
        return eyeGroup;
    }
    
    createRabbitMesh() {
        this.group = new THREE.Group();
        
        // Use shared materials
        const materials = SharedMaterialsV4;

        // Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), materials.white);
        body.scale.y = 0.8;
        this.group.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), materials.white);
        head.position.set(0, 0.4, 0);
        this.group.add(head);

        // Ears
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.6, 4, 8), materials.white);
        ear.position.set(0.1, 0.8, 0);
        ear.rotation.z = -Math.PI / 12;
        this.group.add(ear);
        const ear2 = ear.clone();
        ear2.position.x = -0.1;
        ear2.rotation.z = Math.PI / 12;
        this.group.add(ear2);

        // Eyes
        const eye1 = this.createEyeV4(materials);
        eye1.position.set(0.1, 0.45, 0.2);
        this.group.add(eye1);
        const eye2 = this.createEyeV4(materials);
        eye2.position.set(-0.1, 0.45, 0.2);
        this.group.add(eye2);

        // Nose
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshLambertMaterial({ color: 0xFFC0CB }));
        nose.position.set(0, 0.4, 0.25);
        this.group.add(nose);

        // Legs with feet
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.4, 6), materials.white);
            leg.position.set(i < 2 ? 0.15 : -0.15, -0.2, i % 2 === 0 ? 0.15 : -0.15);
            this.group.add(leg);
            
            // Add feet
            const foot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), materials.white);
            foot.position.set(i < 2 ? 0.15 : -0.15, -0.4, i % 2 === 0 ? 0.15 : -0.15);
            foot.scale.set(1, 0.3, 1); // Flatten feet
            this.group.add(foot);
        }

        // Tail
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), materials.white);
        tail.position.set(0, 0.1, -0.4);
        this.group.add(tail);
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'rabbit';
        
        this.scene.add(this.group);
        
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Hopping movement
        this.hopPhase += this.hopFrequency;
        
        // Determine if currently hopping
        this.isHopping = Math.sin(this.hopPhase) > 0;
        
        if (this.isHopping) {
            // Hop up and forward
            const hopHeight = Math.sin(this.hopPhase) * this.hopAmplitude;
            this.group.position.y = this.groundY + Math.max(0, hopHeight);
            
            // Move forward while hopping
            const forwardMovement = this.direction.clone().multiplyScalar(this.moveSpeed);
            this.group.position.add(forwardMovement);
        } else {
            // Land on ground
            this.group.position.y = this.groundY;
        }
        
        // Random direction changes during hops
        if (Math.random() < 0.03 && this.isHopping) {
            this.randomizeDirection();
        }
        
        this.enforceBoundaries();
    }

    markForRemoval() {
        this.shouldBeRemovedFlag = true;
    }

    shouldBeRemoved() {
        return this.shouldBeRemovedFlag;
    }

    animateClick() {
        super.animateClick();
    }
}

/**
 * SQUIRREL ENTITY - Level 2.2 (700 points)
 * Spiral climbing movement with quick direction changes
 */
class SquirrelEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'squirrel',
            pointValue: 1000,
            level: 7,
            moveSpeed: 0.02, // Much slower - reduced from 0.10
            changeDirectionInterval: 30,
            sessionDuration: 22000 // 22 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Squirrel-specific properties
        this.spiralPhase = 0;
        this.spiralRadius = 3; // Smaller radius - reduced from 8
        this.spiralHeight = 6; // Lower height - reduced from 15
        this.climbSpeed = 0.03; // Slower climbing - reduced from 0.08
        this.isClimbing = false; // Start on ground - changed from true
        
        this.createSquirrelMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createEyeV4(materials) {
        const eyeGroup = new THREE.Group();
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), materials.white);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), materials.black);
        pupil.position.z = 0.04;
        eyeGroup.add(eye, pupil);
        return eyeGroup;
    }
    
    createSquirrelMesh() {
        this.group = new THREE.Group();
        
        // Use new V4 design
        const materials = SharedMaterialsV4;

        // Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), materials.brown);
        body.position.y = 0.3;
        this.group.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), materials.brown);
        head.position.set(0, 0.6, 0.1);
        this.group.add(head);

        // Ears
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 6), materials.brown);
        ear.position.set(0.08, 0.75, 0.1);
        ear.rotation.x = -Math.PI / 6;
        this.group.add(ear);
        const ear2 = ear.clone();
        ear2.position.x = -0.08;
        ear2.rotation.x = Math.PI / 6;
        this.group.add(ear2);

        // Eyes
        const eye1 = this.createEyeV4(materials);
        eye1.position.set(0.08, 0.65, 0.25);
        this.group.add(eye1);
        const eye2 = this.createEyeV4(materials);
        eye2.position.set(-0.08, 0.65, 0.25);
        this.group.add(eye2);

        // Nose
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), materials.black);
        nose.position.set(0, 0.6, 0.3);
        this.group.add(nose);

        // Legs with feet
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.3, 6), materials.brown);
            leg.position.set(i < 2 ? 0.12 : -0.12, 0.1, i % 2 === 0 ? 0.12 : -0.12);
            this.group.add(leg);
            
            // Add feet
            const foot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), materials.brown);
            foot.position.set(i < 2 ? 0.12 : -0.12, -0.05, i % 2 === 0 ? 0.12 : -0.12);
            foot.scale.set(1, 0.3, 1); // Flatten feet
            this.group.add(foot);
        }

        // Tail
        const tailGroup = new THREE.Group();
        let parent = tailGroup;
        for (let i = 0; i < 5; i++) {
            const segment = new THREE.Mesh(new THREE.SphereGeometry(0.15 - i * 0.01, 8, 6), materials.darkBrown);
            segment.position.y = 0.2;
            parent.add(segment);
            parent = segment;
        }
        tailGroup.position.set(0, 0.1, -0.2);
        tailGroup.rotation.x = -Math.PI / 3;
        this.group.add(tailGroup);

        // Acorn
        const acorn = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.1, 4, 8), materials.tan);
        acorn.position.set(0, 0.4, 0.3);
        this.group.add(acorn);
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'squirrel';
        
        this.scene.add(this.group);
        
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        if (this.isClimbing) {
            // Spiral climbing movement
            this.spiralPhase += 0.05; // Slower climbing - reduced from 0.1
            
            const x = Math.cos(this.spiralPhase) * this.spiralRadius;
            const z = Math.sin(this.spiralPhase) * this.spiralRadius;
            const y = 2 + (this.spiralPhase * this.climbSpeed) % this.spiralHeight; // Lower base height
            
            this.group.position.set(x, y, z);
            
            // Quick direction changes
            if (Math.random() < 0.03) { // Less frequent changes - reduced from 0.05
                this.spiralRadius = 2 + Math.random() * 4; // Smaller radius range
                this.climbSpeed *= (0.8 + Math.random() * 0.4);
            }
        } else {
            // Ground movement
            const movement = this.direction.clone().multiplyScalar(this.moveSpeed);
            this.group.position.add(movement);
            this.group.position.y = 0.4; // Keep close to ground
        }
        
        // Switch between climbing and ground movement
        if (Math.random() < 0.01) { // Less frequent switching - reduced from 0.02
            this.isClimbing = !this.isClimbing;
            if (!this.isClimbing) {
                this.group.position.y = 0.4; // Ground level
            }
        }
        
        this.enforceBoundaries();
    }

    markForRemoval() {
        this.shouldBeRemovedFlag = true;
    }

    shouldBeRemoved() {
        return this.shouldBeRemovedFlag;
    }

    animateClick() {
        super.animateClick();
    }
}

/**
 * OWL ENTITY - Level 2.3 (800 points)
 * Silent swooping flight with brief visibility windows
 */
class OwlEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'owl',
            pointValue: 800,
            level: 8,
            moveSpeed: 0.025, // Much slower - reduced from 0.15
            changeDirectionInterval: 60,
            sessionDuration: 20000 // 20 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Owl-specific properties
        this.swoopPhase = 0;
        this.swoopAmplitude = 2; // Lower swooping - reduced from 8
        this.baseHeight = 3; // Lower flight height - reduced from 8
        this.isVisible = true;
        this.hideTimer = 0;
        this.hideInterval = 2000; // Hide every 2 seconds
        this.hideDuration = 500; // Hide for 0.5 seconds
        
        this.createOwlMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createEyeV4(materials) {
        const eyeGroup = new THREE.Group();
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), materials.white);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), materials.black);
        pupil.position.z = 0.04;
        eyeGroup.add(eye, pupil);
        return eyeGroup;
    }
    
    createOwlMesh() {
        this.group = new THREE.Group();
        const materials = SharedMaterialsV4;

        // Body (using brown material like showcase)
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), materials.brown);
        body.scale.set(1, 1.2, 1);
        this.group.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), materials.darkBrown);
        head.position.y = 0.6;
        this.group.add(head);

        // Eyes
        const eyeSocket = new THREE.Mesh(new THREE.CircleGeometry(0.2, 8), materials.tan);
        eyeSocket.position.set(0.15, 0.65, 0.2);
        this.group.add(eyeSocket);
        const eyeSocket2 = eyeSocket.clone();
        eyeSocket2.position.x = -0.15;
        this.group.add(eyeSocket2);

        const eye1 = this.createEyeV4(materials);
        eye1.scale.set(2, 2, 2);
        eye1.position.set(0.15, 0.65, 0.25);
        this.group.add(eye1);
        const eye2 = eye1.clone();
        eye2.position.x = -0.15;
        this.group.add(eye2);

        // Beak
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), materials.gold);
        beak.position.set(0, 0.55, 0.3);
        beak.rotation.x = Math.PI / 2;
        this.group.add(beak);

        // Majestic outspread wings (eagle/angel style) - now brown to match body
        const featherMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513, side: THREE.DoubleSide }); // Same brown as body

        function makeFeather(length, thickness = 0.06) {
            return new THREE.Mesh(new THREE.BoxGeometry(length, thickness, 0.15), featherMaterial);
        }

        function buildWing(isLeft = true) {
            const wing = new THREE.Group();
            const baseX = isLeft ? -0.6 : 0.6;
            const dir = isLeft ? -1 : 1;

            // Create 4 layered rows of feathers (proximal -> distal)
            const rows = [
                { len: 0.22, count: 6, y: 0.0, z: 0.0, tilt: Math.PI / 12 },
                { len: 0.32, count: 5, y: 0.08, z: 0.05, tilt: Math.PI / 20 },
                { len: 0.44, count: 4, y: 0.18, z: 0.12, tilt: Math.PI / 30 },
                { len: 0.6, count: 3, y: 0.32, z: 0.24, tilt: Math.PI / 40 }
            ];

            rows.forEach((r, rowIdx) => {
                const rowGroup = new THREE.Group();
                for (let i = 0; i < r.count; i++) {
                    const feather = makeFeather(r.len);
                    // spread feathers along wing span, offset outward and slightly rotated
                    const span = (i - (r.count - 1) / 2) * (r.len * 0.5);
                    feather.position.set(span * dir, r.y + rowIdx * 0.02, r.z + i * 0.02);
                    feather.rotation.z = (dir * 0.15) + (i - r.count / 2) * 0.02 + r.tilt;
                    feather.rotation.y = (isLeft ? Math.PI / 20 : -Math.PI / 20);
                    rowGroup.add(feather);
                }
                wing.add(rowGroup);
            });

            // Slight arch and rotate for outspread pose
            wing.position.set(baseX, 0.15, 0.0);
            wing.rotation.z = isLeft ? Math.PI / 8 : -Math.PI / 8;
            wing.rotation.y = isLeft ? Math.PI / 12 : -Math.PI / 12;
            return wing;
        }

        const leftWing = buildWing(true);
        this.group.add(leftWing);
        const rightWing = buildWing(false);
        this.group.add(rightWing);
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'owl';
        
        this.scene.add(this.group);
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Swooping flight pattern
        this.swoopPhase += 0.03; // Much slower swooping - reduced from 0.08
        const swoopY = this.baseHeight + Math.sin(this.swoopPhase) * this.swoopAmplitude;
        
        // Forward movement
        const movement = this.direction.clone().multiplyScalar(this.moveSpeed);
        this.group.position.add(movement);
        this.group.position.y = swoopY;
        
        // Visibility management (stealth behavior)
        this.hideTimer += 16; // Approximate frame time
        
        if (this.hideTimer > this.hideInterval) {
            this.isVisible = false;
            this.group.visible = false;
            
            if (this.hideTimer > this.hideInterval + this.hideDuration) {
                this.isVisible = true;
                this.group.visible = true;
                this.hideTimer = 0;
            }
        }
        
        this.enforceBoundaries();
    }

    markForRemoval() {
        this.shouldBeRemovedFlag = true;
    }

    shouldBeRemoved() {
        return this.shouldBeRemovedFlag;
    }

    animateClick() {
        super.animateClick();
    }
}

/**
 * DEER ENTITY - Level 2.4 (900 points)
 * Graceful leaping movement, startles easily (speed increases when "spooked")
 */
class DeerEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'deer',
            pointValue: 300,
            level: 9,
            moveSpeed: 0.03, // Reduced from 0.08 - much slower for easier tapping
            changeDirectionInterval: 80,
            sessionDuration: 18000 // 18 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Deer-specific properties
        this.isStartled = false;
        this.startledSpeed = 0.04; // Much slower when startled - reduced from 0.08
        this.calmSpeed = 0.015; // Much slower when calm - reduced from 0.03
        this.walkPhase = 0; // Changed from leapPhase
        this.walkBob = 0.1; // Very small walking bob - reduced from 0.3
        this.startleChance = 0.008; // Less frequent startling - reduced from 0.015
        this.groundY = 1.2; // Set base height to account for leg length and scale
        
        this.createDeerMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createDeerMesh() {
        this.group = new THREE.Group();
        
        // Create improved materials (based on showcase materials)
        const deerBrown = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // SaddleBrown
        const antlerMaterial = new THREE.MeshLambertMaterial({ color: 0x5C4033 }); // Dark Brown
        const blackMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const whiteMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });

        // Body (reddish brown) - improved proportions, 20% shorter
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.12, 4, 8), deerBrown);
        body.rotation.z = Math.PI / 2;
        this.group.add(body);

        // Neck - moved to very front of body
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.7, 8), deerBrown);
        neck.position.set(0.7, 0.6, 0);
        neck.rotation.z = -Math.PI / 8;
        this.group.add(neck);

        // Head - moved to very front of body
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), deerBrown);
        head.position.set(1.1, 0.9, 0);
        this.group.add(head);

        // Snout - adjusted for new head position
        const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 6), deerBrown);
        snout.position.set(1.28, 0.82, 0);
        snout.rotation.z = -Math.PI / 2;
        this.group.add(snout);

        // Nose - adjusted for new snout position
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), blackMaterial);
        nose.position.set(1.42, 0.82, 0);
        this.group.add(nose);

        // Eyes - black dot eyes adjusted for new head position
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), blackMaterial);
        eye1.position.set(1.02, 0.95, 0.12);
        this.group.add(eye1);
        const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), blackMaterial);
        eye2.position.set(1.02, 0.95, -0.12);
        this.group.add(eye2);

        // Antlers - adjusted for new head position
        // Left antler base
        const antlerBaseL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.6, 4), antlerMaterial);
        antlerBaseL.position.set(1.1, 1.1, 0.12);
        antlerBaseL.rotation.z = Math.PI / 3;
        antlerBaseL.rotation.x = -Math.PI / 6;
        this.group.add(antlerBaseL);

        // Right antler base
        const antlerBaseR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.6, 4), antlerMaterial);
        antlerBaseR.position.set(1.1, 1.1, -0.12);
        antlerBaseR.rotation.z = -Math.PI / 3;
        antlerBaseR.rotation.x = Math.PI / 6;
        this.group.add(antlerBaseR);

        // Antler tines - adjusted for new antler base positions
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 3; i++) {
                const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.25, 4), antlerMaterial);
                tine.position.set(
                    1.1 + side * 0.15 + Math.sin(i * 0.5) * 0.1,
                    1.25 + i * 0.08,
                    side * 0.12
                );
                tine.rotation.z = side > 0 ? Math.PI / 4 : -Math.PI / 4;
                this.group.add(tine);
            }
        }

        // Legs - 50% shorter and repositioned to touch ground
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.9, 6), deerBrown); // 50% shorter: 1.8 → 0.9
            leg.position.set(i < 2 ? 0.35 : -0.35, -0.35, i % 2 === 0 ? 0.18 : -0.18); // Adjusted y to -0.35
            this.group.add(leg);
        }

        // Move entire deer up so legs touch the XZ plane
        // this.group.position.y = 0.45; // Half leg height to position legs on ground

        // Tail - moved to very back end of body
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), whiteMaterial);
        tail.position.set(-0.7, 0.4, 0);
        tail.scale.set(1.3, 1.5, 1.3); // More puffy and upright
        this.group.add(tail);
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'deer';
        
        // Scale deer to be 1.5x larger
        this.group.scale.set(1.5, 1.5, 1.5);
        
        this.scene.add(this.group);
        
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Check for startle
        if (!this.isStartled && Math.random() < this.startleChance) {
            this.isStartled = true;
            this.moveSpeed = this.startledSpeed;
            this.randomizeDirection(); // Change direction when startled
            console.log('🦌 Deer startled! Speed increased.');
        }
        
        // Walking movement with subtle bob (not leaping)
        this.walkPhase += 0.04; // Slower walking animation - reduced from 0.08
        const walkBobY = 0.8 + Math.sin(this.walkPhase) * this.walkBob; // Gentle walking bob instead of leaping
        
        // Movement with current speed
        const movement = this.direction.clone().multiplyScalar(this.moveSpeed);
        this.group.position.add(movement);
        this.group.position.y = walkBobY; // Gentle walking bob instead of leaping
        
        // Calm down after being startled
        if (this.isStartled && Math.random() < 0.008) {
            this.isStartled = false;
            this.moveSpeed = this.calmSpeed;
            console.log('🦌 Deer calmed down.');
        }
        
        this.enforceBoundaries();
    }

    markForRemoval() {
        this.shouldBeRemovedFlag = true;
    }

    shouldBeRemoved() {
        return this.shouldBeRemovedFlag;
    }

    animateClick() {
        super.animateClick();
    }
}

/**
 * FOX ENTITY - Level 2.5 (1000 points)
 * Cunning zigzag movement, occasionally "hides" (transparency changes)
 */
class FoxEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'fox',
            pointValue: 600,
            level: 10,
            moveSpeed: 0.025, // Much slower - reduced from 0.13
            changeDirectionInterval: 25,
            sessionDuration: 15000 // 15 seconds - shortest for highest points
        });
        
        this.shouldBeRemovedFlag = false;

        // Fox-specific properties
        this.zigzagPhase = 0;
        this.zigzagAmplitude = 1; // Smaller zigzag - reduced from 3
        this.isHidden = false;
        this.hideTimer = 0;
        this.hideChance = 0.01; // Less frequent hiding - reduced from 0.02
        this.hideDuration = 1000; // Hide for 1 second
        
        this.createFoxMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createEyeV4(materials) {
        const eyeGroup = new THREE.Group();
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), materials.white);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), materials.black);
        pupil.position.z = 0.04;
        eyeGroup.add(eye, pupil);
        return eyeGroup;
    }
    
    createFoxMesh() {
        this.group = new THREE.Group();
        
        // Use new V4 design
        const materials = SharedMaterialsV4;

        // Body
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), materials.foxOrange);
        body.rotation.z = Math.PI / 2;
        this.group.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), materials.foxOrange);
        head.position.set(0.6, 0.2, 0);
        this.group.add(head);

        // Snout
        const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 8), materials.foxCream);
        snout.position.set(0.8, 0.15, 0);
        snout.rotation.z = -Math.PI / 2;
        this.group.add(snout);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), materials.black);
        nose.position.set(0.9, 0.15, 0);
        this.group.add(nose);

        // Ears
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), materials.darkBrown);
        ear.position.set(0.6, 0.4, 0.15);
        ear.rotation.x = -Math.PI / 6;
        this.group.add(ear);
        const ear2 = ear.clone();
        ear2.position.z = -0.15;
        ear2.rotation.x = Math.PI / 6;
        this.group.add(ear2);

        // Eyes
        const eye1 = this.createEyeV4(materials);
        eye1.position.set(0.55, 0.25, 0.15);
        this.group.add(eye1);
        const eye2 = this.createEyeV4(materials);
        eye2.position.set(0.55, 0.25, -0.15);
        this.group.add(eye2);

        // Legs
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 6), materials.darkBrown);
            leg.position.set(i < 2 ? 0.3 : -0.3, -0.3, i % 2 === 0 ? 0.2 : -0.2);
            this.group.add(leg);
        }

        // Tail
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.7, 4, 8), materials.foxOrange);
        tail.position.set(-0.8, 0.3, 0);
        tail.rotation.z = Math.PI / 4;
        this.group.add(tail);
        const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), materials.foxCream);
        tailTip.position.set(-1.1, 0.6, 0);
        this.group.add(tailTip);
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'fox';
        
        this.scene.add(this.group);
        
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Zigzag movement pattern
        this.zigzagPhase += 0.08; // Slower zigzag - reduced from 0.15
        const zigzagOffset = Math.sin(this.zigzagPhase) * this.zigzagAmplitude;
        
        // Create perpendicular vector for zigzag
        const perpendicular = new THREE.Vector3(-this.direction.z, 0, this.direction.x);
        perpendicular.multiplyScalar(zigzagOffset * 0.01); // Smaller zigzag effect - reduced from 0.02
        
        // Forward movement with zigzag
        const movement = this.direction.clone().multiplyScalar(this.moveSpeed);
        movement.add(perpendicular);
        this.group.position.add(movement);
        
        // Keep fox closer to ground
        this.group.position.y = 0.3; // Lower to ground
        
        // Hiding behavior
        this.hideTimer += 16; // Approximate frame time
        
        if (!this.isHidden && Math.random() < this.hideChance) {
            this.isHidden = true;
            this.hideTimer = 0;
            console.log('🦊 Fox is hiding!');
        }
        
        if (this.isHidden) {
            // Gradually become transparent
            const hideProgress = Math.min(this.hideTimer / 300, 1); // 300ms to fully hide
            const opacity = 1 - (hideProgress * 0.7); // Don't go completely invisible
            
            this.group.traverse(child => {
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity = opacity;
                }
            });
            
            if (this.hideTimer > this.hideDuration) {
                this.isHidden = false;
                this.hideTimer = 0;
            }
        } else {
            // Restore full opacity
            this.group.traverse(child => {
                if (child.material) {
                    child.material.transparent = false;
                    child.material.opacity = 1.0;
                }
            });
        }
        
        this.enforceBoundaries();
    }

    markForRemoval() {
        this.shouldBeRemovedFlag = true;
    }

    shouldBeRemoved() {
        return this.shouldBeRemovedFlag;
    }

    animateClick() {
        super.animateClick();
    }
}

// Export all Level 2 entity classes
window.RabbitEntity = RabbitEntity;
window.SquirrelEntity = SquirrelEntity;
window.OwlEntity = OwlEntity;
window.DeerEntity = DeerEntity;
window.FoxEntity = FoxEntity;

console.log('🌲 Entity Collection Group Level 2 loaded - 5 woodland creatures (600-1000 points, intermediate difficulty)');
