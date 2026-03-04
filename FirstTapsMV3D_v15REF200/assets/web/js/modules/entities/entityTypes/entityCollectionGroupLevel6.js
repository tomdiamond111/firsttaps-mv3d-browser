/**
 * ENTITY COLLECTION GROUP LEVEL 6 - "BOUNCING BALLS BONANZA" (PREMIUM)
 * Premium level for subscribed players who have reached 50,000+ points
 * 
 * Contains: Red Bouncing Ball, Blue Sphere, Golden Orb, Rainbow Ball, Mega Sphere
 * Points: 600-1000 (physics-based bouncing challenges)
 * Theme: Colorful bouncing spheres with trail effects and physics-based movement
 */

/**
 * SHARED MATERIALS - Available to all Level 6 entities
 */
const SharedMaterialsLevel6 = {
    // Ball colors with enhanced reflectivity
    red: new THREE.MeshPhongMaterial({ 
        color: 0xFF0000,
        shininess: 100,
        specular: 0x333333
    }),
    brightRed: new THREE.MeshPhongMaterial({ 
        color: 0xFF4444,
        shininess: 150,
        specular: 0x666666
    }),
    blue: new THREE.MeshPhongMaterial({ 
        color: 0x0080FF,
        shininess: 100,
        specular: 0x333333
    }),
    brightBlue: new THREE.MeshPhongMaterial({ 
        color: 0x00BFFF,
        shininess: 150,
        specular: 0x666666
    }),
    gold: new THREE.MeshPhongMaterial({ 
        color: 0xFFD700,
        shininess: 200,
        specular: 0x999999
    }),
    brightGold: new THREE.MeshPhongMaterial({ 
        color: 0xFFF700,
        shininess: 250,
        specular: 0xCCCCCC
    }),
    rainbow: new THREE.MeshPhongMaterial({ 
        color: 0xFF69B4,
        shininess: 150,
        specular: 0x666666
    }),
    megaBall: new THREE.MeshPhongMaterial({ 
        color: 0x9932CC,
        shininess: 100,
        specular: 0x333333
    }),
    // Trail materials
    trailRed: new THREE.MeshBasicMaterial({ 
        color: 0xFF0000, 
        transparent: true, 
        opacity: 0.3 
    }),
    trailBlue: new THREE.MeshBasicMaterial({ 
        color: 0x0080FF, 
        transparent: true, 
        opacity: 0.3 
    }),
    trailGold: new THREE.MeshBasicMaterial({ 
        color: 0xFFD700, 
        transparent: true, 
        opacity: 0.4 
    })
};

// Make SharedMaterialsLevel6 globally accessible
window.SharedMaterialsLevel6 = SharedMaterialsLevel6;

/**
 * RED BOUNCING BALL ENTITY - Level 6.1 (600 points)
 * Simple vertical bouncing with medium speed
 */
class RedBouncingBallEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'red_ball',
            pointValue: 600,
            level: 13,
            moveSpeed: 0.03,
            rotationSpeed: 0.02,
            clickable: true,
            description: 'Red Bouncing Ball'
        });
        
        this.bounceVelocity = { x: 0, y: 0.05, z: 0 };
        this.bounceAcceleration = -0.002; // Gravity effect
        this.bounceHeight = 5; // Max bounce height
        this.groundLevel = 1; // Minimum Y position
        
        this.createBallMesh();
        this.positionAtWorldEdge();
    }
    
    createBallMesh() {
        const geometry = new THREE.SphereGeometry(0.8, 16, 16);
        const mainBall = new THREE.Mesh(geometry, SharedMaterialsLevel6.red);
        
        // Add highlight
        const highlightGeometry = new THREE.SphereGeometry(0.85, 16, 16);
        const highlight = new THREE.Mesh(highlightGeometry, SharedMaterialsLevel6.brightRed);
        highlight.position.set(0.1, 0.1, 0.1);
        
        this.group.add(mainBall);
        this.group.add(highlight);
    }
    
    updateMovement(deltaTime) {
        // Update bounce physics
        this.bounceVelocity.y += this.bounceAcceleration;
        this.group.position.y += this.bounceVelocity.y;
        
        // Bounce off ground
        if (this.group.position.y <= this.groundLevel) {
            this.group.position.y = this.groundLevel;
            this.bounceVelocity.y = Math.abs(this.bounceVelocity.y) * 0.8; // Energy loss
        }
        
        // Bounce off ceiling
        if (this.group.position.y >= this.bounceHeight) {
            this.bounceVelocity.y = -Math.abs(this.bounceVelocity.y);
        }
        
        // Horizontal movement
        this.group.position.x += Math.sin(Date.now() * 0.001) * 0.01;
        this.group.position.z += Math.cos(Date.now() * 0.001) * 0.01;
        
        // Rotation
        this.group.rotation.x += this.rotationSpeed;
        this.group.rotation.z += this.rotationSpeed * 0.5;
    }
    
    cleanup() {
        super.dispose();
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

// Make RedBouncingBallEntity globally accessible
window.RedBouncingBallEntity = RedBouncingBallEntity;

/**
 * BLUE SPHERE ENTITY - Level 6.2 (700 points)
 * Diagonal bouncing with trail effects
 */
class BlueSphereEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'blue_sphere',
            pointValue: 700,
            level: 13,
            moveSpeed: 0.04,
            rotationSpeed: 0.03,
            clickable: true,
            description: 'Blue Sphere'
        });
        
        this.velocity = { x: 0.03, y: 0.04, z: 0.02 };
        this.bounds = { 
            x: { min: -120, max: 120 }, 
            y: { min: 1, max: 12 }, 
            z: { min: -120, max: 120 } 
        };
        
        this.createSphereMesh();
        this.positionAtWorldEdge();
    }
    
    createSphereMesh() {
        const geometry = new THREE.SphereGeometry(0.9, 20, 20);
        const mainSphere = new THREE.Mesh(geometry, SharedMaterialsLevel6.blue);
        
        // Add inner glow
        const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
        const glowMaterial = SharedMaterialsLevel6.brightBlue.clone();
        glowMaterial.transparent = true;
        glowMaterial.opacity = 0.6;
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        
        this.group.add(mainSphere);
        this.group.add(glow);
    }
    
    updateMovement(deltaTime) {
        // Update position
        this.group.position.x += this.velocity.x;
        this.group.position.y += this.velocity.y;
        this.group.position.z += this.velocity.z;
        
        // Bounce off bounds
        if (this.group.position.x <= this.bounds.x.min || 
            this.group.position.x >= this.bounds.x.max) {
            this.velocity.x *= -1;
        }
        if (this.group.position.y <= this.bounds.y.min || 
            this.group.position.y >= this.bounds.y.max) {
            this.velocity.y *= -1;
        }
        if (this.group.position.z <= this.bounds.z.min || 
            this.group.position.z >= this.bounds.z.max) {
            this.velocity.z *= -1;
        }
        
        // Rotation
        this.group.rotation.x += this.rotationSpeed;
        this.group.rotation.y += this.rotationSpeed * 1.5;
    }
    
    cleanup() {
        super.dispose();
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

// Make BlueSphereEntity globally accessible
window.BlueSphereEntity = BlueSphereEntity;

/**
 * GOLDEN ORB ENTITY - Level 6.3 (800 points)
 * Multi-directional bouncing with shimmer effects
 */
class GoldenOrbEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'golden_orb',
            pointValue: 800,
            level: 13,
            moveSpeed: 0.035,
            rotationSpeed: 0.04,
            clickable: true,
            description: 'Golden Orb'
        });
        
        this.velocity = { 
            x: (Math.random() - 0.5) * 0.06, 
            y: (Math.random() - 0.5) * 0.06, 
            z: (Math.random() - 0.5) * 0.06 
        };
        this.bounds = { 
            x: { min: -130, max: 130 }, 
            y: { min: 1, max: 15 }, 
            z: { min: -130, max: 130 } 
        };
        this.shimmerTime = 0;
        
        this.createOrbMesh();
        this.positionAtWorldEdge();
    }
    
    createOrbMesh() {
        const geometry = new THREE.SphereGeometry(1.0, 24, 24);
        const mainOrb = new THREE.Mesh(geometry, SharedMaterialsLevel6.gold);
        
        // Add shimmer layer
        const shimmerGeometry = new THREE.SphereGeometry(1.05, 20, 20);
        const shimmerMaterial = SharedMaterialsLevel6.brightGold.clone();
        shimmerMaterial.transparent = true;
        shimmerMaterial.opacity = 0.5;
        this.shimmerMesh = new THREE.Mesh(shimmerGeometry, shimmerMaterial);
        
        this.group.add(mainOrb);
        this.group.add(this.shimmerMesh);
    }
    
    updateMovement(deltaTime) {
        this.shimmerTime += deltaTime * 0.01;
        
        // Update shimmer effect
        if (this.shimmerMesh) {
            this.shimmerMesh.material.opacity = 0.3 + Math.sin(this.shimmerTime * 5) * 0.3;
            this.shimmerMesh.rotation.y += 0.05;
        }
        
        // Update position with slight randomness
        this.velocity.x += (Math.random() - 0.5) * 0.001;
        this.velocity.y += (Math.random() - 0.5) * 0.001;
        this.velocity.z += (Math.random() - 0.5) * 0.001;
        
        this.group.position.x += this.velocity.x;
        this.group.position.y += this.velocity.y;
        this.group.position.z += this.velocity.z;
        
        // Bounce off bounds with slight energy gain
        if (this.group.position.x <= this.bounds.x.min || 
            this.group.position.x >= this.bounds.x.max) {
            this.velocity.x *= -1.1;
        }
        if (this.group.position.y <= this.bounds.y.min || 
            this.group.position.y >= this.bounds.y.max) {
            this.velocity.y *= -1.1;
        }
        if (this.group.position.z <= this.bounds.z.min || 
            this.group.position.z >= this.bounds.z.max) {
            this.velocity.z *= -1.1;
        }
        
        // Limit velocity
        const maxSpeed = 0.08;
        Object.keys(this.velocity).forEach(axis => {
            if (Math.abs(this.velocity[axis]) > maxSpeed) {
                this.velocity[axis] = Math.sign(this.velocity[axis]) * maxSpeed;
            }
        });
        
        // Rotation
        this.group.rotation.x += this.rotationSpeed;
        this.group.rotation.y += this.rotationSpeed * 0.7;
        this.group.rotation.z += this.rotationSpeed * 1.3;
    }
    
    cleanup() {
        super.dispose();
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

// Make GoldenOrbEntity globally accessible
window.GoldenOrbEntity = GoldenOrbEntity;

/**
 * RAINBOW BALL ENTITY - Level 6.4 (900 points)
 * Color-changing while bouncing, harder to track
 */
class RainbowBallEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'rainbow_ball',
            pointValue: 900,
            level: 13,
            moveSpeed: 0.05,
            rotationSpeed: 0.06,
            clickable: true,
            description: 'Rainbow Ball'
        });
        
        this.velocity = { x: 0.04, y: 0.03, z: 0.035 };
        this.bounds = { 
            x: { min: -140, max: 140 }, 
            y: { min: 1, max: 18 }, 
            z: { min: -140, max: 140 } 
        };
        this.colorTime = 0;
        this.colors = [
            0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 
            0x0000FF, 0x4B0082, 0x9400D3
        ]; // Rainbow colors
        this.currentColorIndex = 0;
        
        this.createRainbowMesh();
        this.positionAtWorldEdge();
    }
    
    createRainbowMesh() {
        const geometry = new THREE.SphereGeometry(0.85, 20, 20);
        this.rainbowMaterial = new THREE.MeshPhongMaterial({ 
            color: this.colors[0],
            shininess: 150,
            specular: 0x666666
        });
        const mainBall = new THREE.Mesh(geometry, this.rainbowMaterial);
        
        // Add aurora effect
        const auroraGeometry = new THREE.SphereGeometry(0.95, 16, 16);
        this.auroraMaterial = new THREE.MeshBasicMaterial({ 
            color: this.colors[1],
            transparent: true,
            opacity: 0.4
        });
        this.auroraMesh = new THREE.Mesh(auroraGeometry, this.auroraMaterial);
        
        this.group.add(mainBall);
        this.group.add(this.auroraMesh);
    }
    
    updateMovement(deltaTime) {
        this.colorTime += deltaTime * 0.01;
        
        // Cycle through rainbow colors
        const colorProgress = (this.colorTime * 3) % this.colors.length;
        const currentIndex = Math.floor(colorProgress);
        const nextIndex = (currentIndex + 1) % this.colors.length;
        const lerpFactor = colorProgress - currentIndex;
        
        // Interpolate between colors
        const currentColor = new THREE.Color(this.colors[currentIndex]);
        const nextColor = new THREE.Color(this.colors[nextIndex]);
        const interpolatedColor = currentColor.lerp(nextColor, lerpFactor);
        
        this.rainbowMaterial.color = interpolatedColor;
        this.auroraMaterial.color = new THREE.Color(this.colors[nextIndex]);
        
        // Erratic movement pattern
        this.velocity.x += Math.sin(this.colorTime * 7) * 0.002;
        this.velocity.y += Math.cos(this.colorTime * 5) * 0.002;
        this.velocity.z += Math.sin(this.colorTime * 6) * 0.002;
        
        this.group.position.x += this.velocity.x;
        this.group.position.y += this.velocity.y;
        this.group.position.z += this.velocity.z;
        
        // Bounce off bounds
        if (this.group.position.x <= this.bounds.x.min || 
            this.group.position.x >= this.bounds.x.max) {
            this.velocity.x *= -0.9;
        }
        if (this.group.position.y <= this.bounds.y.min || 
            this.group.position.y >= this.bounds.y.max) {
            this.velocity.y *= -0.9;
        }
        if (this.group.position.z <= this.bounds.z.min || 
            this.group.position.z >= this.bounds.z.max) {
            this.velocity.z *= -0.9;
        }
        
        // Complex rotation
        this.group.rotation.x += this.rotationSpeed * Math.sin(this.colorTime);
        this.group.rotation.y += this.rotationSpeed * Math.cos(this.colorTime);
        this.group.rotation.z += this.rotationSpeed * 0.5;
        
        // Aurora rotation
        if (this.auroraMesh) {
            this.auroraMesh.rotation.y += 0.08;
            this.auroraMesh.rotation.x += 0.03;
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

// Make RainbowBallEntity globally accessible
window.RainbowBallEntity = RainbowBallEntity;

/**
 * MEGA SPHERE ENTITY - Level 6.5 (1000 points)
 * Large, slow sphere that splits into smaller balls when clicked
 */
class MegaSphereEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'mega_sphere',
            pointValue: 1000,
            level: 13,
            moveSpeed: 0.02,
            rotationSpeed: 0.015,
            clickable: true,
            description: 'Mega Sphere'
        });
        
        this.velocity = { x: 0.015, y: 0.02, z: 0.018 };
        this.bounds = { 
            x: { min: -100, max: 100 }, 
            y: { min: 2, max: 12 }, 
            z: { min: -100, max: 100 } 
        };
        this.hasBeenClicked = false;
        this.miniSpheres = [];
        this.pulseTime = 0;
        
        this.createMegaMesh();
        this.positionAtWorldEdge();
    }
    
    createMegaMesh() {
        const geometry = new THREE.SphereGeometry(1.5, 32, 32);
        const mainSphere = new THREE.Mesh(geometry, SharedMaterialsLevel6.megaBall);
        
        // Add energy rings
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.TorusGeometry(1.8 + i * 0.3, 0.1, 8, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x9932CC,
                transparent: true,
                opacity: 0.6 - i * 0.15
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2 + i * 0.3;
            ring.userData.rotationSpeed = 0.02 + i * 0.01;
            this.group.add(ring);
        }
        
        this.group.add(mainSphere);
    }
    
    updateMovement(deltaTime) {
        if (this.hasBeenClicked) {
            this.updateMiniSpheres(deltaTime);
            return;
        }
        
        this.pulseTime += deltaTime * 0.01;
        
        // Slow, steady movement
        this.group.position.x += this.velocity.x;
        this.group.position.y += this.velocity.y;
        this.group.position.z += this.velocity.z;
        
        // Bounce off bounds
        if (this.group.position.x <= this.bounds.x.min || 
            this.group.position.x >= this.bounds.x.max) {
            this.velocity.x *= -1;
        }
        if (this.group.position.y <= this.bounds.y.min || 
            this.group.position.y >= this.bounds.y.max) {
            this.velocity.y *= -1;
        }
        if (this.group.position.z <= this.bounds.z.min || 
            this.group.position.z >= this.bounds.z.max) {
            this.velocity.z *= -1;
        }
        
        // Slow rotation
        this.group.rotation.y += this.rotationSpeed;
        
        // Animate energy rings
        this.group.children.forEach((child, index) => {
            if (child.userData.rotationSpeed) {
                child.rotation.z += child.userData.rotationSpeed;
                child.material.opacity = 0.6 + Math.sin(this.pulseTime + index) * 0.2;
            }
        });
    }
    
    animateClick() {
        if (this.hasBeenClicked) return;
        
        this.hasBeenClicked = true;
        this.splitIntoMiniSpheres();
        
        // Hide main sphere
        this.group.visible = false;
    }
    
    splitIntoMiniSpheres() {
        const numMiniSpheres = 4;
        const currentPos = this.group.position.clone();
        
        for (let i = 0; i < numMiniSpheres; i++) {
            const angle = (i / numMiniSpheres) * Math.PI * 2;
            const miniSphere = {
                mesh: new THREE.Mesh(
                    new THREE.SphereGeometry(0.4, 12, 12),
                    SharedMaterialsLevel6.brightRed
                ),
                velocity: {
                    x: Math.cos(angle) * 0.08,
                    y: 0.06,
                    z: Math.sin(angle) * 0.08
                },
                life: 60, // frames
                maxLife: 60
            };
            
            miniSphere.mesh.position.copy(currentPos);
            this.scene.add(miniSphere.mesh);
            this.miniSpheres.push(miniSphere);
        }
    }
    
    updateMiniSpheres(deltaTime) {
        for (let i = this.miniSpheres.length - 1; i >= 0; i--) {
            const mini = this.miniSpheres[i];
            
            // Update position
            mini.mesh.position.x += mini.velocity.x;
            mini.mesh.position.y += mini.velocity.y;
            mini.mesh.position.z += mini.velocity.z;
            
            // Apply gravity
            mini.velocity.y -= 0.003;
            
            // Rotation
            mini.mesh.rotation.x += 0.1;
            mini.mesh.rotation.y += 0.08;
            
            // Fade out
            mini.life--;
            const alpha = mini.life / mini.maxLife;
            mini.mesh.material.opacity = alpha;
            mini.mesh.material.transparent = true;
            
            // Remove when life expires
            if (mini.life <= 0) {
                this.scene.remove(mini.mesh);
                this.miniSpheres.splice(i, 1);
            }
        }
        
        // Remove main entity when all mini spheres are gone
        if (this.miniSpheres.length === 0) {
            this.markForRemoval();
        }
    }
    
    cleanup() {
        // Clean up mini spheres
        this.miniSpheres.forEach(mini => {
            this.scene.remove(mini.mesh);
        });
        this.miniSpheres = [];
        
        super.dispose();
    }

    update(currentTime) {
        if (!this.isActive) return;
        super.update();
        
        const deltaTime = currentTime - (this.lastUpdateTime || currentTime);
        this.lastUpdateTime = currentTime;
        this.updateMovement(deltaTime);
    }
}

// Make MegaSphereEntity globally accessible
window.MegaSphereEntity = MegaSphereEntity;

console.log('🎾 Level 6 Entity Collection - "Bouncing Balls Bonanza" loaded successfully!');
