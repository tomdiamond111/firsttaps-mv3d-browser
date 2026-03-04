/**
 * ENTITY COLLECTION GROUP 1
 * Consolidated interactive SVG entities with shared base architecture
 * 
 * Contains: Blimp, Airplane, Dog, UFO, Bird (Levels 1-5)
 * Points: 100, 200, 300, 400, 500 respectively
 */

/**
 * Base Interactive Entity Class
 * Shared functionality for all clickable entities
 */
class BaseInteractiveEntity {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.group = new THREE.Group();
        
        // Entity properties
        this.type = config.type || 'unknown';
        this.pointValue = config.pointValue || 100;
        this.level = config.level || 1;
        this.moveSpeed = config.moveSpeed || 0.05;
        this.isHovered = false;
        this.isActive = true; // Entity is active by default
        
        // Movement properties
        this.direction = new THREE.Vector3();
        this.changeDirectionTimer = 0;
        this.changeDirectionInterval = config.changeDirectionInterval || 60;
        
        // Animation properties
        this.animationTimer = 0;
        this.rotationSpeed = config.rotationSpeed || 0.02;
        
        // Removal flag
        this.shouldBeRemovedFlag = false;
        
        // Add to scene
        if (this.scene) {
            this.scene.add(this.group);
        }
        
        // Set up interaction userData for raycasting
        this.setupInteraction();
    }
    
    /**
     * Set up entity for interaction (clicking, etc.)
     */
    setupInteraction() {
        if (!this.group) return;
        
        // Set userData for raycasting and interaction
        this.group.userData = {
            ...this.group.userData,
            clickable: true,
            tappable: true,
            isEntity: true,
            entityType: this.type,
            pointValue: this.pointValue,
            level: this.level,
            entityInstance: this // Reference to this entity instance
        };
        
        // Ensure all child meshes are also clickable
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    ...child.userData,
                    clickable: true,
                    tappable: true,
                    isEntity: true,
                    entityType: this.type,
                    pointValue: this.pointValue,
                    parentEntity: this
                };
            }
        });
    }
    
    /**
     * Base update method - override in subclasses
     */
    update() {
        this.animationTimer++;
        // Base movement logic can go here
    }
    
    /**
     * Base click animation - can be enhanced per entity
     */
    animateClick() {
        if (!this.group) return;
        
        const originalScale = this.group.scale.clone();
        const targetScale = originalScale.clone().multiplyScalar(1.2);
        
        const duration = 300;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 0.5) {
                const factor = 1 + (0.2 * (progress * 2));
                this.group.scale.copy(originalScale).multiplyScalar(factor);
            } else {
                const factor = 1 + (0.2 * (2 - progress * 2));
                this.group.scale.copy(originalScale).multiplyScalar(factor);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.group.scale.copy(originalScale);
            }
        };
        
        animate();
    }
    
    /**
     * Mark entity for removal from scene
     */
    markForRemoval() {
        this.shouldBeRemovedFlag = true;
    }
    
    /**
     * Check if entity should be removed
     */
    shouldBeRemoved() {
        return this.shouldBeRemovedFlag;
    }
    
    /**
     * Add hover glow effect
     */
    setHoverState(isHovered) {
        this.isHovered = isHovered;
        
        this.group.traverse(child => {
            if (child.isMesh && child.material) {
                if (isHovered) {
                    if (!child.userData.originalEmissive) {
                        child.userData.originalEmissive = child.material.emissive ? 
                            child.material.emissive.clone() : new THREE.Color(0x000000);
                    }
                    child.material.emissive = new THREE.Color(0x222222);
                } else {
                    if (child.userData.originalEmissive) {
                        child.material.emissive = child.userData.originalEmissive;
                    }
                }
            }
        });
    }
    
    /**
     * Cleanup entity
     */
    dispose() {
        if (this.group && this.scene) {
            this.scene.remove(this.group);
            
            this.group.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Helper method to add "FirstTaps" billboard
     */
    addFirstTapsBillboard(group, width = 7, height = 2, position = { x: 0, y: 0, z: 2 }) {
        const billboardGeometry = new THREE.PlaneGeometry(width, height);
        const billboardMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95
        });
        
        const billboard = new THREE.Mesh(billboardGeometry, billboardMaterial);
        billboard.position.set(position.x, position.y, position.z);
        billboard.rotation.y = Math.PI / 2;
        group.add(billboard);
        
        return billboard;
    }
    
    /**
     * Generic method to add billboard text (wrapper for addFirstTapsBillboard)
     */
    addBillboardText(text, position = { x: 0, y: 0, z: 0 }) {
        // For now, just use the FirstTaps billboard (can be enhanced later for custom text)
        return this.addFirstTapsBillboard(this.group, 7, 2, position);
    }
    
    /**
     * Position entity at world edge for entry movement
     */
    positionAtWorldEdge() {
        // Random entry side (0=left, 1=right, 2=top, 3=bottom)
        const side = Math.floor(Math.random() * 4);
        const worldSize = 50; // Adjust based on your world size
        
        switch(side) {
            case 0: // Left side entry
                this.group.position.set(-worldSize, Math.random() * 20 + 5, Math.random() * 20 - 10);
                this.direction.set(1, 0, 0); // Move right
                break;
            case 1: // Right side entry
                this.group.position.set(worldSize, Math.random() * 20 + 5, Math.random() * 20 - 10);
                this.direction.set(-1, 0, 0); // Move left
                break;
            case 2: // Top entry
                this.group.position.set(Math.random() * 20 - 10, 30, Math.random() * 20 - 10);
                this.direction.set(0, -1, 0); // Move down
                break;
            case 3: // Bottom entry (from ground level)
                this.group.position.set(Math.random() * 20 - 10, 2, Math.random() * 20 - 10);
                this.direction.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(); // Random ground movement
                break;
        }
    }
    
    /**
     * Random direction change for natural movement
     */
    setRandomDirection() {
        // Set a random direction for movement
        this.direction.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 0.5, // Less vertical movement
            (Math.random() - 0.5) * 2
        ).normalize();
    }
    
    /**
     * Position entity randomly on ground
     */
    setRandomGroundPosition() {
        this.group.position.set(
            Math.random() * 40 - 20, // Random X within play area
            2, // Ground level
            Math.random() * 40 - 20  // Random Z within play area
        );
    }
    
    /**
     * Randomize movement direction
     */
    randomizeDirection() {
        this.direction.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 0.5, // Less vertical movement
            (Math.random() - 0.5) * 2
        ).normalize();
    }
    
    /**
     * Enforce movement boundaries to keep entities within play area
     */
    enforceBoundaries() {
        if (!this.group) return;
        
        const boundarySize = 50; // World boundary size
        const position = this.group.position;
        
        // Check X boundaries
        if (position.x > boundarySize) {
            position.x = boundarySize;
            this.direction.x = -Math.abs(this.direction.x); // Bounce back
        } else if (position.x < -boundarySize) {
            position.x = -boundarySize;
            this.direction.x = Math.abs(this.direction.x); // Bounce back
        }
        
        // Check Z boundaries
        if (position.z > boundarySize) {
            position.z = boundarySize;
            this.direction.z = -Math.abs(this.direction.z); // Bounce back
        } else if (position.z < -boundarySize) {
            position.z = -boundarySize;
            this.direction.z = Math.abs(this.direction.z); // Bounce back
        }
        
        // Check Y boundaries (keep above ground, below sky)
        if (position.y < 0.5) {
            position.y = 0.5;
            this.direction.y = Math.abs(this.direction.y); // Bounce up
        } else if (position.y > 30) {
            position.y = 30;
            this.direction.y = -Math.abs(this.direction.y); // Bounce down
        }
    }
}

/**
 * BLIMP ENTITY - Level 1 (100 points)
 * Slow horizontal movement with FirstTaps billboard
 */
class BlimpEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'blimp',
            pointValue: 100,
            level: 1,
            moveSpeed: 0.03,
            changeDirectionInterval: 120
        });
        
        this.createBlimp();
        this.setLinearMovementPath();
    }
    
    /**
     * Set up linear movement path (left-to-right or right-to-left)
     */
    setLinearMovementPath() {
        // Random entry direction (true = left-to-right, false = right-to-left)
        this.isLeftToRight = Math.random() < 0.5;
        
        // Set starting position and direction
        if (this.isLeftToRight) {
            // Enter from left, move right
            this.group.position.set(-60, 10 + Math.random() * 10, Math.random() * 20 - 10);
            this.direction.set(1, 0, 0);
        } else {
            // Enter from right, move left  
            this.group.position.set(60, 10 + Math.random() * 10, Math.random() * 20 - 10);
            this.direction.set(-1, 0, 0);
        }
        
        // Adjust speed for 30-40 second transit (distance ~120 units)
        this.moveSpeed = 0.05; // About 35 seconds to cross screen
    }
    
    createBlimp() {
        this.group.name = 'BlimpEntity';
        
        // Main blimp body (ellipsoid) - LARGE for mobile visibility
        const bodyGeometry = new THREE.SphereGeometry(4, 16, 8);
        bodyGeometry.scale(2.5, 0.8, 0.8);
        
        // Create canvas texture for "FirstTaps" text
        const textTexture = this.createFirstTapsTexture();
        
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4169E1, // Royal blue
            transparent: false,
            opacity: 1.0,
            map: textTexture
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.group.add(body);
        
        // Enhanced gondola underneath - passenger compartment
        const gondolaGeometry = new THREE.BoxGeometry(3.0, 1.2, 1.6);
        const gondolaMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const gondola = new THREE.Mesh(gondolaGeometry, gondolaMaterial);
        gondola.position.set(0, -2.8, 0);
        this.group.add(gondola);
        
        // Enhanced gondola details - passenger compartment windows
        const windowGeometry = new THREE.PlaneGeometry(0.4, 0.3);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, // Sky blue for windows
            transparent: true,
            opacity: 0.7
        });
        
        // Side windows
        for (let i = 0; i < 3; i++) {
            const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
            leftWindow.position.set(-1 + i * 0.7, -2.7, 0.81);
            this.group.add(leftWindow);
            
            const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
            rightWindow.position.set(-1 + i * 0.7, -2.7, -0.81);
            this.group.add(rightWindow);
        }
        
        // Enhanced tail fins
        const finMaterial = new THREE.MeshLambertMaterial({ color: 0x2E4BC6 });
        
        // Large vertical tail fin
        const verticalFinGeometry = new THREE.BoxGeometry(0.15, 2.0, 1.8);
        const verticalFin = new THREE.Mesh(verticalFinGeometry, finMaterial);
        verticalFin.position.set(-3.2, 0.5, 0);
        this.group.add(verticalFin);
        
        // Large horizontal tail fins (stabilizers)
        const horizontalFinGeometry = new THREE.BoxGeometry(0.12, 0.8, 2.2);
        const topHorizontalFin = new THREE.Mesh(horizontalFinGeometry, finMaterial);
        topHorizontalFin.position.set(-3.2, 1.2, 0);
        topHorizontalFin.rotation.x = Math.PI / 2;
        this.group.add(topHorizontalFin);
        
        const bottomHorizontalFin = new THREE.Mesh(horizontalFinGeometry, finMaterial);
        bottomHorizontalFin.position.set(-3.2, -0.2, 0);
        bottomHorizontalFin.rotation.x = Math.PI / 2;
        this.group.add(bottomHorizontalFin);
        
        // Propeller
        this.addPropeller();
    }
    
    /**
     * Create canvas texture with "FirstTaps" text for blimp sides
     */
    createFirstTapsTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Make canvas transparent
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set up text properties
        ctx.fillStyle = 'white';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add subtle stroke for better visibility
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        
        // Draw "FirstTaps" text on both sides (mirrored for proper wrapping)
        const text = 'FirstTaps';
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw stroke first, then fill
        ctx.strokeText(text, centerX, centerY);
        ctx.fillText(text, centerX, centerY);
        
        // Create THREE.js texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 1); // Repeat on both sides of blimp
        
        return texture;
    }
    
    addPropeller() {
        // Enhanced propeller with multiple blades
        const propellerGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
        const propellerMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        this.propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        this.propeller.position.set(-3, 0, 0);
        this.propeller.rotation.z = Math.PI / 2;
        this.group.add(this.propeller);
        
        // Propeller blades
        const bladeGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.02);
        const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        for (let i = 0; i < 3; i++) {
            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            blade.position.set(-3.1, 0, 0);
            blade.rotation.x = (i * Math.PI * 2) / 3;
            this.group.add(blade);
        }
    }
    
    update() {
        super.update();
        
        // Straight horizontal movement (no direction changes)
        const movement = this.direction.clone().multiplyScalar(this.moveSpeed);
        this.group.position.add(movement);
        
        // Propeller animation
        if (this.propeller) {
            this.propeller.rotation.x += 0.3;
        }
        
        // Check if blimp has exited the world bounds
        if (this.isLeftToRight && this.group.position.x > 120) { // Doubled from 60
            this.markForRemoval();
        } else if (!this.isLeftToRight && this.group.position.x < -60) {
            this.markForRemoval();
        }
    }
    
    /**
     * Override shouldBeRemoved to use the linear movement bounds
     */
    shouldBeRemoved() {
        return this.shouldBeRemovedFlag || 
               (this.isLeftToRight && this.group.position.x > 200) || // Increased from 140 to 200
               (!this.isLeftToRight && this.group.position.x < -200); // Increased from -140 to -200
    }
}

/**
 * AIRPLANE ENTITY - Level 2 (200 points)
 * Medium speed straight-line movement with propeller
 */
class AirplaneEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'airplane',
            pointValue: 200,
            level: 2,
            moveSpeed: 0.08,
            changeDirectionInterval: 180
        });
        
        this.createAirplane();
        this.setRandomSkyPosition();
        this.setRandomDirection();
    }
    
    createAirplane() {
        this.group.name = 'AirplaneEntity';
        
        // Fuselage (main body)
        const fuselageGeometry = new THREE.CylinderGeometry(0.6, 0.4, 6, 12);
        const fuselageMaterial = new THREE.MeshLambertMaterial({ color: 0xDC143C }); // Red
        const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
        fuselage.rotation.z = Math.PI / 2;
        this.group.add(fuselage);
        
        // Wings
        const wingGeometry = new THREE.BoxGeometry(8, 0.2, 2);
        const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xB22222 });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        this.group.add(wings);
        
        // Vertical stabilizer
        const tailGeometry = new THREE.BoxGeometry(0.2, 2, 1.5);
        const tailMaterial = new THREE.MeshLambertMaterial({ color: 0xB22222 });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(-2.8, 0.5, 0);
        this.group.add(tail);
        
        // Propeller
        const propellerGeometry = new THREE.BoxGeometry(0.1, 4, 0.1);
        const propellerMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
        this.propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        this.propeller.position.set(3.2, 0, 0);
        this.group.add(this.propeller);
        
        // Trailing banner instead of billboard
        this.addTrailingBanner();
    }
    
    /**
     * Create mesh for SVG entity manager compatibility
     */
    createMesh() {
        return this.group;
    }
    
    /**
     * Get spawn position for airplane (enters from various angles)
     */
    getSpawnPosition() {
        const side = Math.random() < 0.5 ? -1 : 1; // Left or right side
        return new THREE.Vector3(
            side * 70, 
            20 + Math.random() * 15, // Higher altitude
            Math.random() * 40 - 20
        );
    }
    
    /**
     * Get movement direction (straight line across sky)
     */
    getMovementDirection(spawnPosition) {
        // Move toward opposite side
        const targetX = spawnPosition.x > 0 ? -140 : 140; // Doubled from 70
        const direction = new THREE.Vector3(targetX - spawnPosition.x, 0, 0);
        return direction.normalize();
    }
    
    /**
     * Add trailing banner with "FirstTaps" text behind airplane
     */
    addTrailingBanner() {
        // Banner rope/cable connecting to airplane
        const ropeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 8, 6);
        const ropeMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 }); // Brown rope
        const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
        rope.position.set(-6, 0, 0); // Behind the airplane
        rope.rotation.z = Math.PI / 2;
        this.group.add(rope);
        
        // Create canvas texture for "FirstTaps" text on banner
        const bannerTexture = this.createBannerTexture();
        
        // Banner fabric - 2x airplane length (airplane is ~6 units, banner is 12)
        const bannerGeometry = new THREE.PlaneGeometry(12, 2.5);
        const bannerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            side: THREE.DoubleSide,
            transparent: false,
            opacity: 1.0,
            map: bannerTexture
        });
        const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
        banner.position.set(-14, 0, 0); // Trailing behind airplane
        this.group.add(banner);
        
        // Banner support poles (top and bottom)
        const poleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6);
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown poles
        
        const topPole = new THREE.Mesh(poleGeometry, poleMaterial);
        topPole.position.set(-14, 1.25, 0);
        this.group.add(topPole);
        
        const bottomPole = new THREE.Mesh(poleGeometry, poleMaterial);
        bottomPole.position.set(-14, -1.25, 0);
        this.group.add(bottomPole);
    }
    
    /**
     * Create canvas texture with "FirstTaps" text for banner
     */
    createBannerTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set up text properties
        ctx.fillStyle = 'black';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add red border for visibility
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        
        // Draw "FirstTaps" text centered
        const text = 'FirstTaps';
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        ctx.fillText(text, centerX, centerY);
        
        // Create THREE.js texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        
        return texture;
    }
    
    setRandomSkyPosition() {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.group.position.set(
            side * (60 + Math.random() * 20),
            20 + Math.random() * 15,
            -40 + Math.random() * 80
        );
    }
    
    setRandomDirection() {
        const targetX = this.group.position.x > 0 ? -160 : 160; // Doubled from 80
        this.direction.set(targetX - this.group.position.x, 0, Math.random() * 20 - 10).normalize();
    }
    
    update() {
        super.update();
        
        // Orient airplane to face movement direction
        const movementDirection = this.direction.clone();
        this.group.lookAt(
            this.group.position.x + movementDirection.x,
            this.group.position.y + movementDirection.y, 
            this.group.position.z + movementDirection.z
        );
        
        // Straight movement
        const movement = this.direction.clone().multiplyScalar(this.moveSpeed);
        this.group.position.add(movement);
        
        // Propeller animation
        if (this.propeller) {
            this.propeller.rotation.x += 0.5;
        }
    }
    
    /**
     * Override shouldBeRemoved to use distance bounds for airplanes
     */
    shouldBeRemoved() {
        return this.shouldBeRemovedFlag || 
               Math.abs(this.group.position.x) > 160 || 
               Math.abs(this.group.position.z) > 160;
    }
}

/**
 * DOG ENTITY - Level 3 (300 points)
 * Erratic ground-level movement with collar
 */
class DogEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'dog',
            pointValue: 300,
            level: 3,
            moveSpeed: 0.08,
            changeDirectionInterval: 60
        });
        
        this.legAnimation = 0;
        this.tailAnimation = 0;
        
        this.createDog();
        this.setRandomGroundPosition();
        this.setRandomDirection();
    }
    
    createDog() {
        this.group.name = 'DogEntity';
        
        // Dog body
        const bodyGeometry = new THREE.CylinderGeometry(0.8, 1.0, 3.0, 12);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;
        body.position.set(0, 1.5, 0);
        this.group.add(body);
        
        // Dog head
        const headGeometry = new THREE.SphereGeometry(1.2, 12, 8);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(2.2, 1.8, 0);
        this.group.add(head);
        
        // Snout
        const snoutGeometry = new THREE.CylinderGeometry(0.4, 0.6, 1.0, 8);
        const snoutMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 });
        const snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
        snout.rotation.z = Math.PI / 2;
        snout.position.set(3.2, 1.6, 0);
        this.group.add(snout);
        
        // Ears
        const earGeometry = new THREE.SphereGeometry(0.6, 8, 6);
        const leftEar = new THREE.Mesh(earGeometry, snoutMaterial);
        leftEar.position.set(1.8, 2.4, -0.8);
        leftEar.scale.set(0.7, 1.2, 0.4);
        this.group.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeometry, snoutMaterial);
        rightEar.position.set(1.8, 2.4, 0.8);
        rightEar.scale.set(0.7, 1.2, 0.4);
        this.group.add(rightEar);
        
        // Legs (store references for animation)
        this.legs = [];
        const legGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
        const legPositions = [
            { x: 1.0, z: -0.6 }, { x: 1.0, z: 0.6 },
            { x: -1.0, z: -0.6 }, { x: -1.0, z: 0.6 }
        ];
        
        legPositions.forEach((pos, i) => {
            const leg = new THREE.Mesh(legGeometry, snoutMaterial);
            leg.position.set(pos.x, 0.75, pos.z);
            this.legs.push(leg);
            this.group.add(leg);
        });
        
        // Tail
        const tailGeometry = new THREE.CylinderGeometry(0.15, 0.1, 1.5, 8);
        this.tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        this.tail.position.set(-1.8, 2.0, 0);
        this.tail.rotation.x = Math.PI / 4;
        this.group.add(this.tail);
        
        // FirstTaps collar
        const collarGeometry = new THREE.CylinderGeometry(1.3, 1.3, 0.2, 12);
        const collarMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        const collar = new THREE.Mesh(collarGeometry, collarMaterial);
        collar.position.set(2.2, 1.4, 0);
        this.group.add(collar);
    }
    
    setRandomGroundPosition() {
        this.group.position.set(
            -40 + Math.random() * 80,
            0,
            -40 + Math.random() * 80
        );
    }
    
    setRandomDirection() {
        this.direction.set(
            (Math.random() - 0.5) * 2,
            0,
            (Math.random() - 0.5) * 2
        ).normalize();
    }
    
    update() {
        super.update();
        
        // Erratic movement with direction changes
        this.changeDirectionTimer++;
        if (this.changeDirectionTimer >= this.changeDirectionInterval) {
            this.setRandomDirection();
            this.changeDirectionTimer = 0;
        }
        
        const movement = this.direction.clone().multiplyScalar(this.moveSpeed);
        this.group.position.add(movement);
        
        // Leg walking animation
        this.legAnimation += 0.15;
        this.legs.forEach((leg, i) => {
            const offset = i * Math.PI / 2;
            leg.rotation.x = Math.sin(this.legAnimation + offset) * 0.3;
        });
        
        // Tail wagging
        this.tailAnimation += 0.2;
        if (this.tail) {
            this.tail.rotation.z = Math.sin(this.tailAnimation) * 0.5;
        }
    }
}

/**
 * UFO ENTITY - Level 4 (400 points)
 * Erratic vertical movement with rotating lights
 */
class UFOEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'ufo',
            pointValue: 400,
            level: 4,
            moveSpeed: 0.06,
            changeDirectionInterval: 90,
            rotationSpeed: 0.02
        });
        
        this.verticalDirection = 1;
        this.bobTimer = 0;
        
        // Enhanced movement properties for close-to-ground behavior
        this.currentSpeed = this.moveSpeed;
        this.descentTimer = 0;
        this.descentInterval = 300; // Descend every 5 seconds
        this.isDescending = false;
        this.descentTargetY = 3; // Close to XZ plane for easy tapping
        this.originalY = 0;
        
        this.createUFO();
        this.setRandomSkyPosition();
        this.setRandomDirection();
    }
    
    createUFO() {
        this.group.name = 'UFOEntity';
        
        // UFO main saucer body (large for mobile visibility)
        const saucerGeometry = new THREE.CylinderGeometry(3.5, 4.0, 0.8, 16);
        const saucerMaterial = new THREE.MeshBasicMaterial({ color: 0xC0C0C0 }); // Silver
        const saucer = new THREE.Mesh(saucerGeometry, saucerMaterial);
        saucer.position.set(0, 0, 0);
        this.group.add(saucer);

        // UFO dome/cockpit
        const domeGeometry = new THREE.SphereGeometry(2.0, 12, 8);
        const domeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00FFFF, 
            transparent: true, 
            opacity: 0.7 
        }); // Translucent cyan
        const dome = new THREE.Mesh(domeGeometry, domeMaterial);
        dome.position.set(0, 1.0, 0);
        dome.scale.y = 0.6; // Flatten the dome
        this.group.add(dome);

        // UFO lights around the rim (for classic UFO look)
        this.lights = [];
        const lightGeometry = new THREE.SphereGeometry(0.2, 8, 6);
        const lightColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF];
        
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const lightMaterial = new THREE.MeshBasicMaterial({ 
                color: lightColors[i % lightColors.length]
            });
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(
                Math.cos(angle) * 3.8,
                -0.2,
                Math.sin(angle) * 3.8
            );
            this.lights.push(light);
            this.group.add(light);
        }

        // UFO bottom details
        const bottomGeometry = new THREE.CylinderGeometry(1.5, 2.0, 0.4, 8);
        const bottomMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
        const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
        bottom.position.set(0, -0.6, 0);
        this.group.add(bottom);

        // Tractor beam effect (optional visual flair)
        const beamGeometry = new THREE.ConeGeometry(2.0, 6.0, 8, 1, true);
        const beamMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00FF00, 
            transparent: true, 
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.set(0, -3.5, 0);
        this.group.add(beam);

        // Add "FirstTaps" text on the UFO hull
        this.addFirstTapsTextToHull();
    }
    
    /**
     * Add "FirstTaps" text to UFO hull using geometric shapes
     */
    addFirstTapsTextToHull() {
        const textGroup = new THREE.Group();
        const letterMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black text
        const letterDepth = 0.05;
        
        // Large letters for mobile visibility, arranged around the curve
        const radius = 3.2;
        const letters = ['T', 'O', 'P', 'T', 'A', 'P', 'S'];
        
        for (let i = 0; i < letters.length; i++) {
            const angle = (i / letters.length) * Math.PI * 2 - Math.PI / 2; // Start from front
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            const letterGroup = new THREE.Group();
            
            switch (letters[i]) {
                case 'T':
                    const tTop = new THREE.BoxGeometry(0.6, 0.1, letterDepth);
                    const tVertical = new THREE.BoxGeometry(0.1, 0.5, letterDepth);
                    const tTopMesh = new THREE.Mesh(tTop, letterMaterial);
                    const tVerticalMesh = new THREE.Mesh(tVertical, letterMaterial);
                    tTopMesh.position.set(0, 0.2, 0);
                    tVerticalMesh.position.set(0, 0, 0);
                    letterGroup.add(tTopMesh);
                    letterGroup.add(tVerticalMesh);
                    break;
                    
                case 'O':
                    const oGeometry = new THREE.RingGeometry(0.15, 0.25, 12);
                    const oMesh = new THREE.Mesh(oGeometry, letterMaterial);
                    letterGroup.add(oMesh);
                    break;
                    
                case 'P':
                    const pVertical = new THREE.BoxGeometry(0.1, 0.5, letterDepth);
                    const pTop = new THREE.BoxGeometry(0.25, 0.1, letterDepth);
                    const pMiddle = new THREE.BoxGeometry(0.25, 0.1, letterDepth);
                    const pVerticalMesh = new THREE.Mesh(pVertical, letterMaterial);
                    const pTopMesh = new THREE.Mesh(pTop, letterMaterial);
                    const pMiddleMesh = new THREE.Mesh(pMiddle, letterMaterial);
                    pVerticalMesh.position.set(-0.075, 0, 0);
                    pTopMesh.position.set(0.075, 0.2, 0);
                    pMiddleMesh.position.set(0.075, 0.05, 0);
                    letterGroup.add(pVerticalMesh);
                    letterGroup.add(pTopMesh);
                    letterGroup.add(pMiddleMesh);
                    break;
                    
                case 'A':
                    const aLeft = new THREE.BoxGeometry(0.1, 0.5, letterDepth);
                    const aRight = new THREE.BoxGeometry(0.1, 0.5, letterDepth);
                    const aTop = new THREE.BoxGeometry(0.25, 0.1, letterDepth);
                    const aMiddle = new THREE.BoxGeometry(0.2, 0.1, letterDepth);
                    const aLeftMesh = new THREE.Mesh(aLeft, letterMaterial);
                    const aRightMesh = new THREE.Mesh(aRight, letterMaterial);
                    const aTopMesh = new THREE.Mesh(aTop, letterMaterial);
                    const aMiddleMesh = new THREE.Mesh(aMiddle, letterMaterial);
                    aLeftMesh.position.set(-0.075, 0, 0);
                    aRightMesh.position.set(0.075, 0, 0);
                    aTopMesh.position.set(0, 0.2, 0);
                    aMiddleMesh.position.set(0, 0.05, 0);
                    letterGroup.add(aLeftMesh);
                    letterGroup.add(aRightMesh);
                    letterGroup.add(aTopMesh);
                    letterGroup.add(aMiddleMesh);
                    break;
                    
                case 'S':
                    const sTop = new THREE.BoxGeometry(0.25, 0.1, letterDepth);
                    const sMiddle = new THREE.BoxGeometry(0.25, 0.1, letterDepth);
                    const sBottom = new THREE.BoxGeometry(0.25, 0.1, letterDepth);
                    const sTopMesh = new THREE.Mesh(sTop, letterMaterial);
                    const sMiddleMesh = new THREE.Mesh(sMiddle, letterMaterial);
                    const sBottomMesh = new THREE.Mesh(sBottom, letterMaterial);
                    sTopMesh.position.set(0, 0.15, 0);
                    sMiddleMesh.position.set(0, 0, 0);
                    sBottomMesh.position.set(0, -0.15, 0);
                    letterGroup.add(sTopMesh);
                    letterGroup.add(sMiddleMesh);
                    letterGroup.add(sBottomMesh);
                    break;
            }
            
            // Position letter around the UFO and face outward
            letterGroup.position.set(x, 0.3, z);
            letterGroup.lookAt(x * 2, 0.3, z * 2);
            textGroup.add(letterGroup);
        }
        
        this.group.add(textGroup);
    }
    
    setRandomSkyPosition() {
        // UFO flies lower for better visibility - closer to XZ plane
        this.group.position.set(
            -50 + Math.random() * 100,
            6 + Math.random() * 8, // Lower altitude: 6-14 instead of 8-16
            -50 + Math.random() * 100
        );
    }
    
    setRandomDirection() {
        // Enhanced 3D direction for more erratic movement
        const angle = Math.random() * Math.PI * 2;
        this.direction.set(
            Math.cos(angle),
            (Math.random() - 0.5) * 0.5, // Some vertical movement
            Math.sin(angle)
        ).normalize();
        
        // Random speed variation for erratic movement
        this.currentSpeed = this.moveSpeed * (0.5 + Math.random() * 0.8);
        
        // Vary the direction change interval for unpredictability
        this.changeDirectionInterval = 60 + Math.random() * 90; // 1-2.5 seconds
    }
    
    update() {
        super.update();
        
        // Enhanced erratic movement with close-to-ground behavior
        this.changeDirectionTimer++;
        this.descentTimer++;
        
        // Regular direction changes for erratic movement
        if (this.changeDirectionTimer >= this.changeDirectionInterval) {
            this.setRandomDirection();
            this.changeDirectionTimer = 0;
        }
        
        // Close-to-ground descent behavior for easier tapping
        if (this.descentTimer >= this.descentInterval && !this.isDescending) {
            this.isDescending = true;
            this.originalY = this.group.position.y;
            this.descentTargetY = 2 + Math.random() * 3; // Descend to 2-5 units above XZ plane
            console.log('🛸 UFO beginning descent for easier tapping');
        }
        
        // Handle descent and ascent
        if (this.isDescending) {
            const distanceToTarget = Math.abs(this.group.position.y - this.descentTargetY);
            if (distanceToTarget > 0.5) {
                // Move toward target altitude
                const descentDirection = this.group.position.y > this.descentTargetY ? -1 : 1;
                this.group.position.y += descentDirection * 0.08; // Smooth descent/ascent
            } else {
                // Stay at low altitude for a period (easier to tap)
                if (this.descentTimer > this.descentInterval + 180) { // Stay low for 3 seconds
                    // Start ascending back to original altitude
                    if (this.group.position.y < this.originalY - 0.5) {
                        this.group.position.y += 0.06; // Slower ascent
                    } else {
                        // Finished descent cycle
                        this.isDescending = false;
                        this.descentTimer = 0;
                        this.descentInterval = 300 + Math.random() * 300; // 5-10 seconds until next descent
                        console.log('🛸 UFO completing ascent, next descent in', Math.round(this.descentInterval/60), 'seconds');
                    }
                }
            }
        }
        
        // Enhanced movement with 3D direction and speed variation
        const movement = this.direction.clone().multiplyScalar(this.currentSpeed);
        this.group.position.add(movement);
        
        // Enhanced bobbing motion
        this.bobTimer += 0.05;
        const bobOffset = Math.sin(this.bobTimer) * 0.3;
        this.group.position.y += bobOffset * 0.03;
        
        // Boundary management - keep within reasonable bounds
        const bounds = 40;
        const minY = 2;   // Very low minimum for tapping
        const maxY = 18;  // Moderate maximum
        
        if (Math.abs(this.group.position.x) > bounds || Math.abs(this.group.position.z) > bounds) {
            // Bounce off boundaries
            if (Math.abs(this.group.position.x) > bounds) {
                this.direction.x *= -1;
                this.group.position.x = Math.sign(this.group.position.x) * bounds;
            }
            if (Math.abs(this.group.position.z) > bounds) {
                this.direction.z *= -1;
                this.group.position.z = Math.sign(this.group.position.z) * bounds;
            }
        }
        
        // Keep in altitude bounds (unless descending intentionally)
        if (!this.isDescending && (this.group.position.y < minY || this.group.position.y > maxY)) {
            this.direction.y *= -1;
            this.group.position.y = Math.max(minY, Math.min(maxY, this.group.position.y));
        }
        
        // Rotate the entire UFO for classic spinning effect
        this.group.rotation.y += this.rotationSpeed;
        
        // Enhanced pulsing lights with varied patterns
        this.lights.forEach((light, i) => {
            const pulse = Math.sin(this.animationTimer * 0.1 + i * 0.5) * 0.4 + 0.6;
            light.material.opacity = pulse;
            
            // Add occasional bright flashes for attention
            if (Math.random() < 0.001) {
                light.material.opacity = 1.0;
            }
        });
    }
}

/**
 * BIRD ENTITY - Level 5 (500 points)
 * Fast straight-line movement with wing flapping
 */
class BirdEntity extends BaseInteractiveEntity {
    constructor(scene) {
        super(scene, {
            type: 'bird',
            pointValue: 500,
            level: 5,
            moveSpeed: 0.15,
            changeDirectionInterval: 180
        });
        
        this.wingFlapTimer = 0;
        this.wingFlapSpeed = 0.3;
        this.shouldBeRemovedFlag = false;
        
        this.createBird();
        this.setRandomSkyPosition();
        this.setRandomDirection();
    }
    
    createBird() {
        this.group.name = 'BirdEntity';
        
        // Make bird larger for better visibility
        this.group.scale.set(1.5, 1.5, 1.5);
        
        // Bird body (streamlined for flight) - enhanced ellipsoid shape
        const bodyGeometry = new THREE.SphereGeometry(0.8, 12, 8);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x4A4A4A });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.set(0.5, 0.4, 1.5); // Make spherical body more bird-like
        body.position.set(0, 0, 0);
        this.group.add(body);
        
        // Bird head
        const headGeometry = new THREE.SphereGeometry(0.5, 10, 8);
        const head = new THREE.Mesh(headGeometry, 
            new THREE.MeshBasicMaterial({ color: 0x2F2F2F }));
        head.position.set(0, 0.2, 1.2);
        head.scale.set(0.8, 0.8, 0.9);
        this.group.add(head);
        
        // Beak
        const beakGeometry = new THREE.ConeGeometry(0.1, 0.4, 6);
        const beak = new THREE.Mesh(beakGeometry, 
            new THREE.MeshBasicMaterial({ color: 0xFFA500 }));
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.1, 1.8);
        this.group.add(beak);
        
        // Bird eyes
        const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 6);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 0.3, 1.4);
        this.group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 0.3, 1.4);
        this.group.add(rightEye);
        
        // Enhanced wings (realistic plane geometry)
        this.createWings();
        
        // Enhanced tail
        const tailGeometry = new THREE.ConeGeometry(0.6, 1.0, 6);
        const tailMaterial = new THREE.MeshBasicMaterial({ color: 0x4A4A4A });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.rotation.x = Math.PI / 2;
        tail.position.set(0, 0.1, -1.5);
        this.group.add(tail);
        
        // FirstTaps banner trailing behind
        this.addFirstTapsBanner();
    }
    
    /**
     * Create realistic bird wings
     */
    createWings() {
        // Left wing - use PlaneGeometry for realistic wing shape
        const leftWingGeometry = new THREE.PlaneGeometry(2.0, 0.8);
        const wingMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x6A6A6A, 
            side: THREE.DoubleSide 
        });
        this.leftWing = new THREE.Mesh(leftWingGeometry, wingMaterial);
        this.leftWing.position.set(-1.2, 0, 0);
        this.leftWing.rotation.z = Math.PI / 6; // Slight upward angle
        this.group.add(this.leftWing);

        // Right wing
        const rightWingGeometry = new THREE.PlaneGeometry(2.0, 0.8);
        this.rightWing = new THREE.Mesh(rightWingGeometry, wingMaterial);
        this.rightWing.position.set(1.2, 0, 0);
        this.rightWing.rotation.z = -Math.PI / 6; // Slight upward angle
        this.group.add(this.rightWing);
    }
    
    /**
     * Add FirstTaps banner trailing behind bird
     */
    addFirstTapsBanner() {
        // Banner rope/string
        const ropeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 3.0, 8);
        const ropeMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
        const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
        rope.position.set(0, -0.5, -4.0);
        this.group.add(rope);

        // Banner fabric (large for mobile visibility)
        const bannerGeometry = new THREE.PlaneGeometry(6.0, 1.5);
        const bannerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF, 
            side: THREE.DoubleSide 
        });
        const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
        banner.position.set(0, -0.5, -6.5);
        this.group.add(banner);

        // Add FirstTaps text to banner
        this.addFirstTapsTextToBanner(banner);
    }
    
    /**
     * Add FirstTaps text to banner using geometric shapes
     */
    addFirstTapsTextToBanner(banner) {
        const textGroup = new THREE.Group();
        const letterMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black text
        const letterDepth = 0.03;
        
        // Large letters for mobile visibility
        // T
        const tTop = new THREE.BoxGeometry(0.8, 0.12, letterDepth);
        const tVertical = new THREE.BoxGeometry(0.12, 0.6, letterDepth);
        const tTopMesh = new THREE.Mesh(tTop, letterMaterial);
        const tVerticalMesh = new THREE.Mesh(tVertical, letterMaterial);
        tTopMesh.position.set(-2.4, 0.24, 0.02);
        tVerticalMesh.position.set(-2.4, 0, 0.02);
        textGroup.add(tTopMesh);
        textGroup.add(tVerticalMesh);
        
        // O
        const oGeometry = new THREE.RingGeometry(0.15, 0.22, 12);
        const oMesh = new THREE.Mesh(oGeometry, letterMaterial);
        oMesh.position.set(-1.6, 0, 0.02);
        textGroup.add(oMesh);
        
        // P
        const pVertical = new THREE.BoxGeometry(0.12, 0.6, letterDepth);
        const pTop = new THREE.BoxGeometry(0.3, 0.12, letterDepth);
        const pMiddle = new THREE.BoxGeometry(0.3, 0.12, letterDepth);
        const pVerticalMesh = new THREE.Mesh(pVertical, letterMaterial);
        const pTopMesh = new THREE.Mesh(pTop, letterMaterial);
        const pMiddleMesh = new THREE.Mesh(pMiddle, letterMaterial);
        pVerticalMesh.position.set(-0.9, 0, 0.02);
        pTopMesh.position.set(-0.75, 0.24, 0.02);
        pMiddleMesh.position.set(-0.75, 0.06, 0.02);
        textGroup.add(pVerticalMesh);
        textGroup.add(pTopMesh);
        textGroup.add(pMiddleMesh);
        
        // T (second)
        const t2Top = new THREE.BoxGeometry(0.6, 0.12, letterDepth);
        const t2Vertical = new THREE.BoxGeometry(0.12, 0.6, letterDepth);
        const t2TopMesh = new THREE.Mesh(t2Top, letterMaterial);
        const t2VerticalMesh = new THREE.Mesh(t2Vertical, letterMaterial);
        t2TopMesh.position.set(-0.2, 0.24, 0.02);
        t2VerticalMesh.position.set(-0.2, 0, 0.02);
        textGroup.add(t2TopMesh);
        textGroup.add(t2VerticalMesh);
        
        // A
        const aLeft = new THREE.BoxGeometry(0.12, 0.6, letterDepth);
        const aRight = new THREE.BoxGeometry(0.12, 0.6, letterDepth);
        const aTop = new THREE.BoxGeometry(0.3, 0.12, letterDepth);
        const aMiddle = new THREE.BoxGeometry(0.25, 0.12, letterDepth);
        const aLeftMesh = new THREE.Mesh(aLeft, letterMaterial);
        const aRightMesh = new THREE.Mesh(aRight, letterMaterial);
        const aTopMesh = new THREE.Mesh(aTop, letterMaterial);
        const aMiddleMesh = new THREE.Mesh(aMiddle, letterMaterial);
        aLeftMesh.position.set(0.45, 0, 0.02);
        aRightMesh.position.set(0.75, 0, 0.02);
        aTopMesh.position.set(0.6, 0.24, 0.02);
        aMiddleMesh.position.set(0.6, 0.06, 0.02);
        textGroup.add(aLeftMesh);
        textGroup.add(aRightMesh);
        textGroup.add(aTopMesh);
        textGroup.add(aMiddleMesh);
        
        // P (second)
        const p2Vertical = new THREE.BoxGeometry(0.12, 0.6, letterDepth);
        const p2Top = new THREE.BoxGeometry(0.3, 0.12, letterDepth);
        const p2Middle = new THREE.BoxGeometry(0.3, 0.12, letterDepth);
        const p2VerticalMesh = new THREE.Mesh(p2Vertical, letterMaterial);
        const p2TopMesh = new THREE.Mesh(p2Top, letterMaterial);
        const p2MiddleMesh = new THREE.Mesh(p2Middle, letterMaterial);
        p2VerticalMesh.position.set(1.35, 0, 0.02);
        p2TopMesh.position.set(1.5, 0.24, 0.02);
        p2MiddleMesh.position.set(1.5, 0.06, 0.02);
        textGroup.add(p2VerticalMesh);
        textGroup.add(p2TopMesh);
        textGroup.add(p2MiddleMesh);
        
        // S
        const sTop = new THREE.BoxGeometry(0.3, 0.12, letterDepth);
        const sMiddle = new THREE.BoxGeometry(0.3, 0.12, letterDepth);
        const sBottom = new THREE.BoxGeometry(0.3, 0.12, letterDepth);
        const sTopMesh = new THREE.Mesh(sTop, letterMaterial);
        const sMiddleMesh = new THREE.Mesh(sMiddle, letterMaterial);
        const sBottomMesh = new THREE.Mesh(sBottom, letterMaterial);
        sTopMesh.position.set(2.1, 0.18, 0.02);
        sMiddleMesh.position.set(2.1, 0, 0.02);
        sBottomMesh.position.set(2.1, -0.18, 0.02);
        textGroup.add(sTopMesh);
        textGroup.add(sMiddleMesh);
        textGroup.add(sBottomMesh);
        
        banner.add(textGroup);
    }
    
    setRandomSkyPosition() {
        // Start from closer distance (80-100 units) for better visibility
        const side = Math.random() < 0.5 ? -1 : 1;
        const startDistance = 80 + Math.random() * 20;
        const angle = Math.random() * Math.PI * 2;
        
        this.group.position.set(
            Math.cos(angle) * startDistance,
            8, // Slightly lower altitude for better visibility
            Math.sin(angle) * startDistance
        );
    }
    
    setRandomDirection() {
        // Head towards center area for better visibility
        const targetX = -this.group.position.x * 0.3 + (Math.random() - 0.5) * 20;
        const targetZ = -this.group.position.z * 0.3 + (Math.random() - 0.5) * 20;
        this.direction.set(targetX, 0, targetZ).normalize();
    }
    
    shouldBeRemoved() {
        const distanceFromCenter = Math.sqrt(
            this.group.position.x * this.group.position.x + 
            this.group.position.z * this.group.position.z
        );
        return distanceFromCenter > 360; // Doubled the boundary (was 180)
    }
    
    update() {
        super.update();
        
        // Enhanced movement with realistic flight behavior
        const movement = this.direction.clone().multiplyScalar(this.moveSpeed);
        this.group.position.add(movement);
        
        // Maintain stable low altitude (around 10 units above XZ plane for mobile tapping)
        this.group.position.y = 10 + Math.sin(this.animationTimer * 0.3) * 0.5; // Gentle altitude variation 9.5-10.5
        
        // Wing flapping animation for realism
        this.wingFlapTimer += this.wingFlapSpeed * 2;
        if (this.leftWing && this.rightWing) {
            const flapAngle = Math.sin(this.wingFlapTimer) * 0.5;
            this.leftWing.rotation.z = Math.PI / 6 + flapAngle;
            this.rightWing.rotation.z = -Math.PI / 6 - flapAngle;
        }
        
        // Gentle banking/turning motion
        const bankAngle = this.direction.x * 0.02;
        this.group.rotation.z = -bankAngle;
        
        // Face direction of movement
        const direction = Math.atan2(this.direction.z, this.direction.x);
        this.group.rotation.y = direction - Math.PI / 2;
        
        // Distance-based appearance behavior
        this.updateDistanceBasedBehavior();
    }
    
    /**
     * Update bird behavior based on distance from center for realistic approach/departure
     */
    updateDistanceBasedBehavior() {
        const distanceFromCenter = Math.sqrt(
            this.group.position.x * this.group.position.x + 
            this.group.position.z * this.group.position.z
        );
        
        // Scale and opacity based on distance for realistic appearance
        if (distanceFromCenter > 240) { // Doubled from 120
            // Far away - small and fading
            const fadeFactor = Math.max(0.1, 1 - (distanceFromCenter - 240) / 120); // Doubled the distances
            this.group.scale.setScalar(0.5 * fadeFactor);
            this.group.traverse((child) => {
                if (child.material && child.material.opacity !== undefined) {
                    child.material.opacity = fadeFactor;
                    child.material.transparent = true;
                }
            });
        } else if (distanceFromCenter < 40) {
            // Close - full size and opacity
            this.group.scale.setScalar(1.0);
            this.group.traverse((child) => {
                if (child.material && child.material.opacity !== undefined) {
                    child.material.opacity = 1.0;
                    child.material.transparent = false;
                }
            });
        } else {
            // Medium distance - gradual scaling
            const scaleFactor = 0.5 + (40 - distanceFromCenter + 40) / 80 * 0.5;
            this.group.scale.setScalar(scaleFactor);
            this.group.traverse((child) => {
                if (child.material && child.material.opacity !== undefined) {
                    child.material.opacity = 1.0;
                    child.material.transparent = false;
                }
            });
        }
    }
}

// Export all entity classes
window.BaseInteractiveEntity = BaseInteractiveEntity;
window.BlimpEntity = BlimpEntity;
window.AirplaneEntity = AirplaneEntity; 
window.DogEntity = DogEntity;
window.UFOEntity = UFOEntity;
window.BirdEntity = BirdEntity;

console.log('🎮 Entity Collection Group 1 loaded - 5 interactive entities with base architecture');
