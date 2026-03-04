/**
 * ENTITY COLLECTION GROUP 2
 * Advanced interactive entities with specialized movement patterns
 * 
 * Contains: Frog (Level 6)
 * Points: 500
 */

/**
 * FROG ENTITY - Level 6 (500 points)
 * Green hopping frog that moves in predictable hops for easy tapping
 * Much better visual appeal than the snake
 */
class FrogEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'frog',
            pointValue: 500,
            level: 6,
            moveSpeed: 0.8, // Hop distance
            changeDirectionInterval: 80, // Time between hops
            sessionDuration: 45000 // 45 seconds
        });
        
        // Frog properties
        this.isHopping = false;
        this.hopTimer = 0;
        this.hopDuration = 30; // Frames for hop animation
        this.hopHeight = 2.0;
        this.groundY = 1.5;
        
        // Leg animation
        this.legExtension = 0;
        this.legAnimationSpeed = 0.3;
        
        // Click state for color change
        this.isClicked = false;
        this.originalColors = [];
        
        // Session timing
        this.sessionStartTime = Date.now();
        
        this.createFrog();
        this.setRandomGroundPosition();
        this.setRandomDirection();
        
        console.log('� Green Hopping Frog entity created!');
    }
    
    createFrog() {
        this.group.name = 'FrogEntity';
        
        // Frog body (main green body)
        const bodyGeometry = new THREE.SphereGeometry(1.2, 12, 8);
        const bodyMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x228B22 // Forest green
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.set(0, this.groundY, 0);
        this.body.scale.set(1.0, 0.8, 1.3); // Slightly flattened and elongated
        this.group.add(this.body);
        this.originalColors.push({ mesh: this.body, color: 0x228B22 });
        
        // Frog head (slightly smaller and forward)
        const headGeometry = new THREE.SphereGeometry(0.9, 10, 8);
        const headMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x32CD32 // Lime green
        });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.set(0, this.groundY + 0.3, 1.0);
        this.head.scale.set(1.1, 0.9, 1.0);
        this.group.add(this.head);
        this.originalColors.push({ mesh: this.head, color: 0x32CD32 });
        
        // Big frog eyes (characteristic bulging eyes)
        const eyeGeometry = new THREE.SphereGeometry(0.25, 8, 6);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFF4500 }); // Orange-red
        
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.4, this.groundY + 0.8, 1.2);
        this.group.add(this.leftEye);
        
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.4, this.groundY + 0.8, 1.2);
        this.group.add(this.rightEye);
        
        // Eye pupils
        const pupilGeometry = new THREE.SphereGeometry(0.1, 6, 4);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.4, this.groundY + 0.8, 1.35);
        this.group.add(leftPupil);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.4, this.groundY + 0.8, 1.35);
        this.group.add(rightPupil);
        
        // Front legs (smaller)
        this.createLeg(-0.6, 0.4, 0.4, 0.3); // left front
        this.createLeg(0.6, 0.4, 0.4, 0.3);  // right front
        
        // Back legs (larger, for hopping power)
        this.createLeg(-0.8, -0.6, 0.6, 0.4); // left back
        this.createLeg(0.8, -0.6, 0.6, 0.4);  // right back
    }
    
    createLeg(x, z, width, height) {
        const legGeometry = new THREE.CylinderGeometry(width * 0.6, width, height, 8);
        const legMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x006400 // Dark green
        });
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(x, this.groundY - height * 0.3, z);
        this.group.add(leg);
        this.originalColors.push({ mesh: leg, color: 0x006400 });
        
        // Store reference for animation
        if (!this.legs) this.legs = [];
        this.legs.push(leg);
    }
    
    setRandomGroundPosition() {
        this.group.position.set(
            -30 + Math.random() * 60,
            0,
            -30 + Math.random() * 60
        );
    }
    
    setRandomDirection() {
        const angle = Math.random() * Math.PI * 2;
        this.direction.set(Math.cos(angle), 0, Math.sin(angle)).normalize();
    }
    
    update() {
        super.update();
        
        // Check if it's time to hop
        this.hopTimer++;
        
        if (!this.isHopping && this.hopTimer >= this.changeDirectionInterval) {
            this.startHop();
        }
        
        if (this.isHopping) {
            this.updateHopAnimation();
        }
        
        // Simple leg animation when not hopping
        if (!this.isHopping && this.legs) {
            this.legExtension = Math.sin(Date.now() * 0.003) * 0.1;
            for (let leg of this.legs) {
                leg.position.y = this.groundY - 0.2 + this.legExtension;
            }
        }
        
        // Session timeout check
        const sessionElapsed = Date.now() - this.sessionStartTime;
        if (sessionElapsed > this.sessionDuration) {
            this.markForRemoval();
        }
    }
    
    startHop() {
        this.isHopping = true;
        this.hopTimer = 0;
        
        // Set new random direction occasionally
        if (Math.random() < 0.3) {
            this.setRandomDirection();
        }
        
        // Reduced logging - this was spamming console
        // console.log('🐸 Frog starting hop!');
    }
    
    updateHopAnimation() {
        const progress = this.hopTimer / this.hopDuration;
        
        if (progress >= 1.0) {
            // Hop complete
            this.isHopping = false;
            this.hopTimer = 0;
            this.group.position.y = 0; // Back on ground
            
            // Reset leg positions
            if (this.legs) {
                for (let leg of this.legs) {
                    leg.position.y = this.groundY - 0.2;
                }
            }
            return;
        }
        
        // Hop arc movement
        const hopProgress = Math.sin(progress * Math.PI);
        
        // Move forward and up
        const movement = this.direction.clone().multiplyScalar(this.moveSpeed * progress);
        this.group.position.add(movement);
        this.group.position.y = hopProgress * this.hopHeight;
        
        // Animate legs during hop
        if (this.legs) {
            const legExtension = Math.sin(progress * Math.PI) * 0.3;
            for (let leg of this.legs) {
                leg.position.y = this.groundY - 0.2 - legExtension;
            }
        }
        
        this.hopTimer++;
    }
    
    /**
     * Handle click - turn white
     */
    animateClick() {
        if (this.isClicked) return; // Already clicked
        
        console.log('� Frog clicked! Turning white...');
        this.isClicked = true;
        
        // Turn all parts white
        for (let colorData of this.originalColors) {
            colorData.mesh.material.color.setHex(0xFFFFFF);
        }
        
        // Visual feedback - brief scaling
        const originalScale = this.group.scale.clone();
        this.group.scale.multiplyScalar(1.1);
        
        setTimeout(() => {
            if (this.group.scale) {
                this.group.scale.copy(originalScale);
            }
        }, 200);
    }
    
    shouldBeRemoved() {
        const sessionTime = Date.now() - this.sessionStartTime;
        return this.shouldBeRemovedFlag || 
               sessionTime > this.sessionDuration ||
               Math.abs(this.group.position.x) > 100 ||
               Math.abs(this.group.position.z) > 100;
    }
}

// Export frog entity
window.FrogEntity = FrogEntity;

console.log('🎮 Entity Collection Group 2 loaded - Green Hopping Frog');
