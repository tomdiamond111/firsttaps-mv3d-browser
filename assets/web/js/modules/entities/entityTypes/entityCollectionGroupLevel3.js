/**
 * ENTITY COLLECTION GROUP LEVEL 3 - "MYTHICAL & EXOTIC"
 * Advanced difficulty entities for players who have reached 100,000+ points
 * 
 * Contains: Dragon, Phoenix, Unicorn, Griffin, Pegasus
 * Points: 800-1500 (high-value challenges)
 * Theme: Mythical creatures with advanced movement patterns and visual effects
 */

/**
 * DRAGON ENTITY - Level 3.1 (1200 points)
 * Complex figure-8 flight pattern with flame particle effects
 */
class DragonEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'dragon',
            pointValue: 1500,
            level: 11,
            moveSpeed: 0.02, // Reduced from 0.04 to make it even slower and easier to tap
            changeDirectionInterval: 120,
            sessionDuration: 25000 // 25 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Dragon-specific properties
        this.flightPhase = 0;
        this.figure8Radius = 12;
        this.flightHeight = 8; // Reduced from 20 to make it swoop lower to the ground
        this.flameParticles = [];
        this.breatheFire = false;
        this.fireTimer = 0;
        
        this.createDragonMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createDragonMesh() {
        this.group = new THREE.Group();
        
        // Dragon body (elongated)
        const bodyGeometry = new THREE.SphereGeometry(1.2, 16, 10);
        bodyGeometry.scale(1, 0.6, 2.5);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B0000, // Dark red
             
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.group.add(body);
        
        // Dragon head
        const headGeometry = new THREE.SphereGeometry(0.8, 12, 8);
        headGeometry.scale(1, 0.8, 1.5);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xDC143C, // Crimson
             
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.2, 2);
        this.group.add(head);
        
        // Dragon wings (large)
        for (let i = 0; i < 2; i++) {
            const wingGeometry = new THREE.SphereGeometry(1.5, 10, 6);
            wingGeometry.scale(0.2, 0.1, 2);
            const wingMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x4B0000, // Dark maroon
                transparent: true,
                opacity: 0.8
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            wing.position.set(i === 0 ? -1.8 : 1.8, 0.5, 0);
            wing.rotation.z = i === 0 ? 0.5 : -0.5;
            this.group.add(wing);
        }
        
        // Dragon tail
        const tailGeometry = new THREE.SphereGeometry(0.6, 8, 6);
        tailGeometry.scale(0.4, 0.4, 1.8);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(0, 0, -2.5);
        this.group.add(tail);
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'dragon';
        
        this.scene.add(this.group);
        
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Figure-8 flight pattern
        this.flightPhase += 0.03; // Reduced from 0.06 to half speed for easier targeting
        
        const x = Math.sin(this.flightPhase) * this.figure8Radius;
        const z = Math.sin(this.flightPhase * 2) * this.figure8Radius * 0.5;
        const y = this.flightHeight + Math.cos(this.flightPhase) * 3;
        
        this.group.position.set(x, y, z);
        
        // Face movement direction
        this.group.lookAt(
            x + Math.cos(this.flightPhase) * 2,
            y,
            z + Math.cos(this.flightPhase * 2) * 2
        );
        
        // Fire breathing effect
        this.fireTimer += 16;
        if (this.fireTimer > 3000) { // Breathe fire every 3 seconds
            this.createFireParticles();
            this.fireTimer = 0;
        }
        
        // Update fire particles
        this.updateFireParticles();
        
        this.enforceBoundaries();
    }
    
    createFireParticles() {
        for (let i = 0; i < 8; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xFF4500, // Orange red
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position in front of dragon head
            const headPos = this.group.position.clone();
            headPos.z += 2.5;
            particle.position.copy(headPos);
            
            // Random fire direction
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.3 + 0.2
            );
            
            particle.life = 1.0;
            particle.userData.templateObject = true; // Mark for safe cleanup
            
            this.flameParticles.push(particle);
            this.scene.add(particle);
        }
    }
    
    updateFireParticles() {
        for (let i = this.flameParticles.length - 1; i >= 0; i--) {
            const particle = this.flameParticles[i];
            
            // Move particle
            particle.position.add(particle.velocity);
            
            // Fade out
            particle.life -= 0.02;
            particle.material.opacity = particle.life * 0.8;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                this.flameParticles.splice(i, 1);
            }
        }
    }
    
    dispose() {
        // Clean up fire particles
        this.flameParticles.forEach(particle => {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        });
        this.flameParticles = [];
        
        super.dispose();
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
 * PHOENIX ENTITY - Level 3.2 (1400 points)
 * Rising/falling movement with rebirth cycle (disappears/reappears)
 */
class PhoenixEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'phoenix',
            pointValue: 800,
            level: 12,
            moveSpeed: 0.12,
            changeDirectionInterval: 90,
            sessionDuration: 22000 // 22 seconds
        });
        
        this.shouldBeRemovedFlag = false;

        // Phoenix-specific properties
        this.rebirthCycle = 0;
        this.rebirthPhase = 'rising'; // 'rising', 'burning', 'reborn'
        this.maxHeight = 25;
        this.burnTimer = 0;
        this.emberParticles = [];
        
        this.createPhoenixMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createPhoenixMesh() {
        this.group = new THREE.Group();
        
        // Phoenix body
        const bodyGeometry = new THREE.SphereGeometry(0.9, 12, 8);
        bodyGeometry.scale(1, 0.8, 1.3);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFF6600, // Bright orange
             
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.group.add(body);
        
        // Phoenix head
        const headGeometry = new THREE.SphereGeometry(0.5, 10, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFD700, // Gold
             
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.3, 0.8);
        this.group.add(head);
        
        // Phoenix wings (fiery)
        for (let i = 0; i < 2; i++) {
            const wingGeometry = new THREE.SphereGeometry(1.2, 8, 6);
            wingGeometry.scale(0.3, 0.1, 1.8);
            const wingMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xFF4500, // Orange red
                transparent: true,
                opacity: 0.9
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            wing.position.set(i === 0 ? -1.5 : 1.5, 0.2, 0);
            wing.rotation.z = i === 0 ? 0.4 : -0.4;
            this.group.add(wing);
        }
        
        // Tail feathers
        const tailGeometry = new THREE.SphereGeometry(0.8, 8, 6);
        tailGeometry.scale(0.2, 0.2, 2);
        const tailMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xDC143C, // Crimson
             
        });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 0.1, -1.5);
        tail.rotation.x = -0.2;
        this.group.add(tail);
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'phoenix';
        
        this.scene.add(this.group);
        
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        this.rebirthCycle += 0.01;
        
        switch (this.rebirthPhase) {
            case 'rising':
                // Rising movement
                const riseHeight = 5 + (this.rebirthCycle * 15);
                this.group.position.y = Math.min(riseHeight, this.maxHeight);
                
                // Forward movement
                const movement = this.direction.clone().multiplyScalar(this.moveSpeed);
                this.group.position.add(movement);
                
                // Create ember trail
                if (Math.random() < 0.3) {
                    this.createEmberParticle();
                }
                
                // Transition to burning
                if (this.rebirthCycle > 4) {
                    this.rebirthPhase = 'burning';
                    this.burnTimer = 0;
                }
                break;
                
            case 'burning':
                // Burning phase - become more transparent and create more particles
                this.burnTimer += 16;
                const burnProgress = this.burnTimer / 2000; // 2 second burn
                
                this.group.traverse(child => {
                    if (child.material) {
                        child.material.transparent = true;
                        child.material.opacity = 1 - burnProgress;
                    }
                });
                
                // Intense particle creation
                if (Math.random() < 0.8) {
                    this.createEmberParticle();
                }
                
                if (burnProgress >= 1) {
                    this.rebirthPhase = 'reborn';
                    this.rebirthCycle = 0;
                }
                break;
                
            case 'reborn':
                // Rebirth - restore opacity and reset position
                this.group.traverse(child => {
                    if (child.material) {
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                    }
                });
                
                // Reset to ground level
                this.group.position.y = 5;
                this.rebirthPhase = 'rising';
                this.randomizeDirection();
                console.log('🔥 Phoenix reborn!');
                break;
        }
        
        this.updateEmberParticles();
        this.enforceBoundaries();
    }
    
    createEmberParticle() {
        const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: Math.random() < 0.5 ? 0xFF6600 : 0xFFD700, // Orange or gold
            transparent: true,
            opacity: 0.9
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        particle.position.copy(this.group.position);
        particle.position.add(new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 1,
            (Math.random() - 0.5) * 2
        ));
        
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            -Math.random() * 0.1 - 0.02,
            (Math.random() - 0.5) * 0.1
        );
        
        particle.life = 1.0;
        particle.userData.templateObject = true; // Mark for safe cleanup
        
        this.emberParticles.push(particle);
        this.scene.add(particle);
    }
    
    updateEmberParticles() {
        for (let i = this.emberParticles.length - 1; i >= 0; i--) {
            const particle = this.emberParticles[i];
            
            particle.position.add(particle.velocity);
            particle.life -= 0.015;
            particle.material.opacity = particle.life * 0.9;
            
            if (particle.life <= 0) {
                this.scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                this.emberParticles.splice(i, 1);
            }
        }
    }
    
    dispose() {
        // Clean up ember particles
        this.emberParticles.forEach(particle => {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        });
        this.emberParticles = [];
        
        super.dispose();
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
 * UNICORN ENTITY - Level 3.3 (1600 points)
 * Galloping with rainbow trail, very fast and elusive
 */
class UnicornEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'unicorn',
            pointValue: 1200,
            level: 13,
            moveSpeed: 0.18,
            changeDirectionInterval: 40,
            sessionDuration: 18000 // 18 seconds
        });
        
        this.shouldBeRemovedFlag = false;
        this.sessionStartTime = Date.now();

        // Unicorn-specific properties
        this.gallopPhase = 0;
        this.rainbowTrail = [];
        this.maxTrailLength = 20;
        this.isGalloping = true;
        
        this.createUnicornMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createUnicornMesh() {
        this.group = new THREE.Group();
        
        // Unicorn body - made 20% thinner
        const bodyGeometry = new THREE.SphereGeometry(1, 14, 10);
        bodyGeometry.scale(0.8, 0.8, 1.28); // Reduced x and z by 20%
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFFFF, // Pure white
             
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        this.group.add(body);
        
        // Unicorn head
        const headGeometry = new THREE.SphereGeometry(0.6, 12, 8);
        headGeometry.scale(0.8, 1, 1.3);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 1, 1.2);
        this.group.add(head);
        
        // Unicorn horn (magical) - made 2x larger
        const hornGeometry = new THREE.ConeGeometry(0.2, 3.0, 8); // Doubled radius and height
        const hornMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFD700, // Gold
             
        });
        const horn = new THREE.Mesh(hornGeometry, hornMaterial);
        horn.position.set(0, 2.5, 1.2); // Adjusted Y position for larger horn
        horn.rotation.x = -0.2;
        this.group.add(horn);
        
        // Legs - similar to deer legs
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 1.0, 6), bodyMaterial);
            leg.position.set(i < 2 ? 0.4 : -0.4, -0.4, i % 2 === 0 ? 0.2 : -0.2);
            this.group.add(leg);
        }
        
        // Mane (flowing)
        for (let i = 0; i < 3; i++) {
            const maneGeometry = new THREE.SphereGeometry(0.3, 6, 6);
            maneGeometry.scale(0.5, 0.3, 1.5);
            const maneColors = [0xFFB6C1, 0xDDA0DD, 0x87CEEB]; // Pink, plum, sky blue
            const maneMaterial = new THREE.MeshLambertMaterial({ 
                color: maneColors[i],
                 
            });
            const mane = new THREE.Mesh(maneGeometry, maneMaterial);
            mane.position.set(0, 1.2 - i * 0.2, 0.5 - i * 0.3);
            this.group.add(mane);
        }
        
        // Add FirstTaps text
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'unicorn';
        
        this.scene.add(this.group);
        
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        // Galloping movement
        this.gallopPhase += 0.2;
        
        if (this.isGalloping) {
            // Vertical galloping motion
            const gallopHeight = 1 + Math.abs(Math.sin(this.gallopPhase)) * 2;
            this.group.position.y = gallopHeight;
            
            // Fast forward movement
            const movement = this.direction.clone().multiplyScalar(this.moveSpeed);
            this.group.position.add(movement);
            
            // Create rainbow trail
            this.createRainbowTrail();
        }
        
        // Random direction changes (unicorns are unpredictable)
        if (Math.random() < 0.03) {
            this.randomizeDirection();
        }
        
        this.updateRainbowTrail();
        this.enforceBoundaries();
    }
    
    createRainbowTrail() {
        const colors = [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082, 0x9400D3];
        
        for (let i = 0; i < 3; i++) {
            const trailGeometry = new THREE.SphereGeometry(0.15, 6, 6);
            const trailMaterial = new THREE.MeshBasicMaterial({ 
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 0.7
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
            
            trail.position.copy(this.group.position);
            trail.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 0.5,
                -1 - Math.random() * 1
            ));
            
            trail.life = 1.0;
            trail.userData.templateObject = true; // Mark for safe cleanup
            
            this.rainbowTrail.push(trail);
            this.scene.add(trail);
            
            // Limit trail length
            if (this.rainbowTrail.length > this.maxTrailLength) {
                const oldTrail = this.rainbowTrail.shift();
                this.scene.remove(oldTrail);
                oldTrail.geometry.dispose();
                oldTrail.material.dispose();
            }
        }
    }
    
    updateRainbowTrail() {
        for (let i = this.rainbowTrail.length - 1; i >= 0; i--) {
            const trail = this.rainbowTrail[i];
            
            trail.life -= 0.02;
            trail.material.opacity = trail.life * 0.7;
            trail.scale.multiplyScalar(0.98); // Shrink over time
            
            if (trail.life <= 0) {
                this.scene.remove(trail);
                trail.geometry.dispose();
                trail.material.dispose();
                this.rainbowTrail.splice(i, 1);
            }
        }
    }
    
    dispose() {
        // Clean up rainbow trail
        this.rainbowTrail.forEach(trail => {
            this.scene.remove(trail);
            trail.geometry.dispose();
            trail.material.dispose();
        });
        this.rainbowTrail = [];
        
        super.dispose();
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
 * GRIFFIN ENTITY - Level 3.4 (1800 points)
 * Combined flight/ground movement, switches between modes
 */
class GriffinEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'griffin',
            pointValue: 800,
            level: 14,
            moveSpeed: 0.14,
            changeDirectionInterval: 60,
            sessionDuration: 16000 // 16 seconds
        });
        
        this.shouldBeRemovedFlag = false;
        this.sessionStartTime = Date.now();

        // Griffin-specific properties
        this.isFlying = true;
        this.modeTimer = 0;
        this.modeDuration = 3000; // 3 seconds per mode
        this.flightHeight = 15;
        this.wingFlapPhase = 0;
        
        this.createGriffinMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createGriffinMesh() {
        this.group = new THREE.Group();
        
        // Griffin body (lion-like back half)
        const bodyGeometry = new THREE.SphereGeometry(1, 14, 10);
        bodyGeometry.scale(1, 0.9, 1.5);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xDAA520, // Goldenrod
             
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.group.add(body);
        
        // Griffin head (eagle-like)
        const headGeometry = new THREE.SphereGeometry(0.7, 12, 8);
        headGeometry.scale(0.8, 1, 1.2);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513, // Saddle brown
             
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.5, 1.3);
        this.group.add(head);
        
        // Griffin beak
        const beakGeometry = new THREE.ConeGeometry(0.15, 0.6, 6);
        const beakMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFD700, // Gold
             
        });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.position.set(0, 0.4, 2);
        beak.rotation.x = Math.PI / 2;
        this.group.add(beak);
        
        // Griffin wings
        this.wings = [];
        for (let i = 0; i < 2; i++) {
            const wingGeometry = new THREE.SphereGeometry(1.4, 10, 6);
            wingGeometry.scale(0.3, 0.1, 2.2);
            const wingMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x654321, // Dark brown
                 
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            wing.position.set(i === 0 ? -1.6 : 1.6, 0.3, 0);
            wing.rotation.z = i === 0 ? 0.3 : -0.3;
            this.wings.push(wing);
            this.group.add(wing);
        }
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'griffin';
        
        this.scene.add(this.group);
        
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        this.modeTimer += 16;
        this.wingFlapPhase += 0.3;
        
        // Mode switching
        if (this.modeTimer > this.modeDuration) {
            this.isFlying = !this.isFlying;
            this.modeTimer = 0;
            console.log(`🦅 Griffin switching to ${this.isFlying ? 'flight' : 'ground'} mode`);
        }
        
        if (this.isFlying) {
            // Flight mode
            this.group.position.y = this.flightHeight + Math.sin(this.wingFlapPhase * 0.1) * 2;
            
            // Wing flapping animation
            this.wings.forEach((wing, index) => {
                const flapAngle = Math.sin(this.wingFlapPhase) * 0.5;
                wing.rotation.z = (index === 0 ? 0.3 : -0.3) + flapAngle;
            });
            
            // Aerial movement
            const movement = this.direction.clone().multiplyScalar(this.moveSpeed * 1.2);
            this.group.position.add(movement);
        } else {
            // Ground mode
            const targetY = 1.5;
            this.group.position.y += (targetY - this.group.position.y) * 0.1; // Smooth landing
            
            // Fold wings
            this.wings.forEach((wing, index) => {
                const foldAngle = index === 0 ? 0.1 : -0.1;
                wing.rotation.z += (foldAngle - wing.rotation.z) * 0.1;
            });
            
            // Ground movement (slower)
            const movement = this.direction.clone().multiplyScalar(this.moveSpeed * 0.7);
            this.group.position.add(movement);
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
 * PEGASUS ENTITY - Level 3.5 (2000 points)
 * Soaring flight patterns, briefly lands then takes off again
 */
class PegasusEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'pegasus',
            pointValue: 1000,
            level: 15,
            moveSpeed: 0.16,
            changeDirectionInterval: 50,
            sessionDuration: 12000 // 12 seconds - shortest for highest points
        });
        
        this.shouldBeRemovedFlag = false;
        this.sessionStartTime = Date.now();

        // Pegasus-specific properties
        this.flightState = 'soaring'; // 'soaring', 'landing', 'landed', 'taking_off'
        this.stateTimer = 0;
        this.soarHeight = 30;
        this.wingPhase = 0;
        this.cloudTrail = [];
        
        this.createPegasusMesh();
        this.positionAtWorldEdge();
        this.setupInteraction();
    }
    
    createPegasusMesh() {
        this.group = new THREE.Group();
        
        // Pegasus body (horse-like)
        const bodyGeometry = new THREE.SphereGeometry(1.1, 16, 10);
        bodyGeometry.scale(1, 0.8, 1.8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xF8F8FF, // Ghost white
             
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        this.group.add(body);
        
        // Pegasus head
        const headGeometry = new THREE.SphereGeometry(0.6, 12, 8);
        headGeometry.scale(0.8, 1.2, 1.4);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 0.8, 1.5);
        this.group.add(head);
        
        // Mane (flowing white)
        for (let i = 0; i < 4; i++) {
            const maneGeometry = new THREE.SphereGeometry(0.25, 6, 6);
            maneGeometry.scale(0.6, 0.3, 1.2);
            const maneMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xFFFFFF, // Pure white
                 
            });
            const mane = new THREE.Mesh(maneGeometry, maneMaterial);
            mane.position.set(0, 1.3 - i * 0.15, 1 - i * 0.3);
            this.group.add(mane);
        }
        
        // Pegasus wings (large and majestic)
        this.wings = [];
        for (let i = 0; i < 2; i++) {
            const wingGeometry = new THREE.SphereGeometry(1.8, 12, 8);
            wingGeometry.scale(0.25, 0.1, 2.5);
            const wingMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xF0F8FF, // Alice blue
                transparent: true,
                opacity: 0.9
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            wing.position.set(i === 0 ? -2 : 2, 0.8, 0);
            wing.rotation.z = i === 0 ? 0.4 : -0.4;
            this.wings.push(wing);
            this.group.add(wing);
        }
        
        // Mark as template object for safe cleanup
        this.group.userData.templateObject = true;
        this.group.userData.entityType = 'pegasus';
        
        this.scene.add(this.group);
        
    }
    
    update() {
        if (!this.isActive) return;
        
        super.update();
        
        this.stateTimer += 16;
        this.wingPhase += 0.2;
        
        switch (this.flightState) {
            case 'soaring':
                // High altitude soaring
                this.group.position.y = this.soarHeight + Math.sin(this.wingPhase * 0.05) * 5;
                
                // Graceful wing movement
                this.wings.forEach((wing, index) => {
                    const wingAngle = Math.sin(this.wingPhase * 0.1) * 0.3;
                    wing.rotation.z = (index === 0 ? 0.4 : -0.4) + wingAngle;
                });
                
                // Forward movement
                const soarMovement = this.direction.clone().multiplyScalar(this.moveSpeed);
                this.group.position.add(soarMovement);
                
                // Create cloud trail
                if (Math.random() < 0.1) {
                    this.createCloudTrail();
                }
                
                // Transition to landing
                if (this.stateTimer > 4000) {
                    this.flightState = 'landing';
                    this.stateTimer = 0;
                }
                break;
                
            case 'landing':
                // Descending movement
                const targetY = 2;
                this.group.position.y += (targetY - this.group.position.y) * 0.05;
                
                // Slower movement while landing
                const landMovement = this.direction.clone().multiplyScalar(this.moveSpeed * 0.5);
                this.group.position.add(landMovement);
                
                if (Math.abs(this.group.position.y - targetY) < 0.5) {
                    this.flightState = 'landed';
                    this.stateTimer = 0;
                }
                break;
                
            case 'landed':
                // Brief ground stay
                this.group.position.y = 2;
                
                // Fold wings
                this.wings.forEach((wing, index) => {
                    const foldAngle = index === 0 ? 0.1 : -0.1;
                    wing.rotation.z += (foldAngle - wing.rotation.z) * 0.1;
                });
                
                if (this.stateTimer > 1500) {
                    this.flightState = 'taking_off';
                    this.stateTimer = 0;
                }
                break;
                
            case 'taking_off':
                // Rapid ascent
                this.group.position.y += 0.3;
                
                // Powerful wing beats
                const beatAngle = Math.sin(this.wingPhase) * 0.8;
                this.wings.forEach((wing, index) => {
                    wing.rotation.z = (index === 0 ? 0.4 : -0.4) + beatAngle;
                });
                
                if (this.group.position.y > this.soarHeight) {
                    this.flightState = 'soaring';
                    this.stateTimer = 0;
                    this.randomizeDirection();
                }
                break;
        }
        
        this.updateCloudTrail();
        this.enforceBoundaries();
    }
    
    createCloudTrail() {
        const cloudGeometry = new THREE.SphereGeometry(0.3, 6, 6);
        const cloudMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.6
        });
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        
        cloud.position.copy(this.group.position);
        cloud.position.add(new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            -1,
            -2
        ));
        
        cloud.life = 1.0;
        cloud.userData.templateObject = true; // Mark for safe cleanup
        
        this.cloudTrail.push(cloud);
        this.scene.add(cloud);
        
        // Limit trail length
        if (this.cloudTrail.length > 15) {
            const oldCloud = this.cloudTrail.shift();
            this.scene.remove(oldCloud);
            oldCloud.geometry.dispose();
            oldCloud.material.dispose();
        }
    }
    
    updateCloudTrail() {
        for (let i = this.cloudTrail.length - 1; i >= 0; i--) {
            const cloud = this.cloudTrail[i];
            
            cloud.life -= 0.008;
            cloud.material.opacity = cloud.life * 0.6;
            cloud.scale.multiplyScalar(1.02); // Grow slowly
            
            if (cloud.life <= 0) {
                this.scene.remove(cloud);
                cloud.geometry.dispose();
                cloud.material.dispose();
                this.cloudTrail.splice(i, 1);
            }
        }
    }
    
    dispose() {
        // Clean up cloud trail
        this.cloudTrail.forEach(cloud => {
            this.scene.remove(cloud);
            cloud.geometry.dispose();
            cloud.material.dispose();
        });
        this.cloudTrail = [];
        
        super.dispose();
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

// Export all Level 3 entity classes
window.DragonEntity = DragonEntity;
window.PhoenixEntity = PhoenixEntity;
window.UnicornEntity = UnicornEntity;
window.GriffinEntity = GriffinEntity;
window.PegasusEntity = PegasusEntity;

console.log('✨ Entity Collection Group Level 3 loaded - 5 mythical creatures (1200-2000 points, advanced difficulty)');
