/**
 * TREASURE BOX MANAGER
 * Enhanced treasure box system with variable behaviors and rarity tiers
 * 
 * Features:
 * - Variable spawn delays (1-60 seconds)
 * - Weighted treasure behaviors: 50% standard, 25% balloon escape, 25% dash escape
 * - Rarity system: 85% common, 12% rare, 3% legendary rainbow
 * - 3-second behavior window for special treasures
 * - Legendary rainbow floats upward (3 taps max)
 */

class TreasureBoxManager {
    constructor(app) {
        this.app = app;
        this.scene = app.scene;
        this.camera = app.camera;
        this.renderer = app.renderer;
        this.svgEntityManager = app.svgEntityManager; // Reference for pause state
        
        // Enhanced treasure management
        this.activeTreasureBoxes = new Map();
        this.treasureBoxValue = 1000; // Base reward
        this.currentLevel = 1; // Track current treasure level
        
        // Variable spawn timing
        this.minSpawnDelay = 1000; // 1 second minimum
        this.maxSpawnDelay = 60000; // 60 seconds maximum
        this.treasureLifetime = 15000; // 15 seconds before auto-removal
        this.behaviorWindowDuration = 7000; // 7 seconds for special behaviors
        this.nextSpawnTime = null;
        this.scheduleActive = false; // Track if scheduling is running
        
        // Rarity system - Level-based distribution
        this.rarityWeights = {
            1: { // Level 1
                common: 0.55,      // 55% - Standard behavior  
                rare: 0.40,        // 40% - Special behaviors (balloon/dash)
                legendary: 0.05    // 5% - Rainbow treasure (reduced from 10%)
            },
            2: { // Level 2
                common: 0.30,      // 30% - Standard gold treasure
                rare: 0.45,        // 45% - Splitting, Growing, Mimic, Phase treasures
                legendary: 0.25    // 25% - Enhanced behaviors
            },
            3: { // Level 3
                common: 0.30,      // 30% - Standard gold treasure
                rare: 0.60,        // 60% - Portal, Shield, Elemental treasures
                legendary: 0.10    // 10% - Most powerful treasures
            }
        };
        
        // Special behavior weights (for rare treasures)
        this.specialBehaviorWeights = {
            balloon: 0.5,      // 50% of special behaviors
            dash: 0.5          // 50% of special behaviors
        };
        
        // Session management  
        this.currentSessionId = null;
        this.sessionStartTime = Date.now();
        this.boxesFoundThisSession = 0;
        this.elementalAuras = new Map();
        
        // Placement zones (strategic locations near home area and file zones)
        this.placementZones = [
            // Home area perimeter
            { center: { x: 0, z: 0 }, radius: 15, name: 'home_perimeter', weight: 3 },
            
            // File zone clusters (common file placement areas)
            { center: { x: -20, z: -20 }, radius: 12, name: 'file_zone_sw', weight: 2 },
            { center: { x: 20, z: -20 }, radius: 12, name: 'file_zone_se', weight: 2 },
            { center: { x: -20, z: 20 }, radius: 12, name: 'file_zone_nw', weight: 2 },
            { center: { x: 20, z: 20 }, radius: 12, name: 'file_zone_ne', weight: 2 },
            
            // Mid-range areas (not too far from home)
            { center: { x: -10, z: 0 }, radius: 8, name: 'mid_west', weight: 1 },
            { center: { x: 10, z: 0 }, radius: 8, name: 'mid_east', weight: 1 },
            { center: { x: 0, z: -15 }, radius: 8, name: 'mid_south', weight: 1 },
            { center: { x: 0, z: 15 }, radius: 8, name: 'mid_north', weight: 1 }
        ];
        
        // Initialize with variable delay for first treasure
        this.scheduleNextTreasure();
        
        console.log('💎 Enhanced Treasure Box Manager initialized - variable timing and behaviors enabled!');
    }

    /**
     * Update current treasure level based on entity manager level
     */
    updateTreasureLevel() {
        if (this.svgEntityManager && this.svgEntityManager.currentLevel) {
            const newLevel = this.svgEntityManager.currentLevel;
            if (newLevel !== this.currentLevel) {
                this.currentLevel = newLevel;
                console.log(`💎 Treasure system upgraded to Level ${this.currentLevel}!`);
                console.log(`💎 New treasure rarity weights:`, this.rarityWeights[this.currentLevel]);
            }
        } else if (this.svgEntityManager) {
            // Fallback: check points directly
            const points = this.svgEntityManager.totalPoints || 0;
            let detectedLevel = 1;
            if (points >= 10000) detectedLevel = 3;
            else if (points >= 5000) detectedLevel = 2;
            
            if (detectedLevel !== this.currentLevel) {
                this.currentLevel = detectedLevel;
                console.log(`💎 Treasure system upgraded to Level ${this.currentLevel} (${points} points)!`);
                console.log(`💎 New treasure rarity weights:`, this.rarityWeights[this.currentLevel]);
            }
        }
    }
    
    /**
     * Schedule the next treasure spawn with variable delay
     */
    scheduleNextTreasure() {
        // Don't schedule new treasures if game play is paused
        if (this.svgEntityManager && this.svgEntityManager.isGamePlayPaused()) {
            console.log('💎 Treasure spawning paused - waiting for unpause');
            this.scheduleActive = false;
            return;
        }
        
        // Mark scheduling as active
        this.scheduleActive = true;
        
        const delay = this.minSpawnDelay + Math.random() * (this.maxSpawnDelay - this.minSpawnDelay);
        this.nextSpawnTime = Date.now() + delay;
        
        console.log(`💎 Next treasure scheduled in ${(delay / 1000).toFixed(1)} seconds`);
        
        setTimeout(() => {
            // Check pause state again when the timeout executes
            if (this.svgEntityManager && this.svgEntityManager.isGamePlayPaused()) {
                console.log('💎 Treasure spawning cancelled due to pause - will restart when unpaused');
                this.scheduleActive = false;
                return; // Stop here, don't reschedule - unpause will restart
            }
            this.spawnEnhancedTreasureBox();
        }, delay);
    }
    
    /**
     * Determine treasure rarity using weighted random selection
     */
    determineTreasureRarity() {
        // Update level first
        this.updateTreasureLevel();
        
        const levelWeights = this.rarityWeights[this.currentLevel] || this.rarityWeights[1];
        console.log(`💎 Determining rarity for Level ${this.currentLevel} treasure using weights:`, levelWeights);
        
        const random = Math.random();
        let cumulativeWeight = 0;
        
        for (const [rarity, weight] of Object.entries(levelWeights)) {
            cumulativeWeight += weight;
            if (random <= cumulativeWeight) {
                console.log(`💎 Selected rarity: ${rarity} (random: ${random.toFixed(3)}, threshold: ${cumulativeWeight.toFixed(3)})`);
                return rarity;
            }
        }
        
        return 'common'; // Fallback
    }
    
    /**
     * Determine special behavior for rare treasures based on level
     */
    determineSpecialBehavior() {
        if (this.currentLevel === 1) {
            const random = Math.random();
            return random < this.specialBehaviorWeights.balloon ? 'balloon' : 'dash';
        } else if (this.currentLevel === 2) {
            const level2Behaviors = ['splitting', 'growing', 'mimic', 'phase'];
            return level2Behaviors[Math.floor(Math.random() * level2Behaviors.length)];
        } else if (this.currentLevel === 3) {
            const level3Behaviors = ['portal', 'shield', 'elemental'];
            return level3Behaviors[Math.floor(Math.random() * level3Behaviors.length)];
        }
        // Fallback to level 1 behavior
        const random = Math.random();
        return random < this.specialBehaviorWeights.balloon ? 'balloon' : 'dash';
    }
    

    /**
     * Spawn an enhanced treasure box with variable behaviors
     */
    spawnEnhancedTreasureBox() {
        const id = `treasure_${Date.now()}`;
        
        // Determine treasure characteristics
        const rarity = this.determineTreasureRarity();
        const behavior = rarity === 'rare' ? this.determineSpecialBehavior() : 'standard';
        
        // Find a good hiding spot
        const position = this.findHidingSpot();
        if (!position) {
            console.warn('💎 Could not find suitable hiding spot for treasure box');
            return;
        }
        
        // Create the treasure box based on rarity and behavior
        const treasureBox = this.createEnhancedTreasureBoxMesh(rarity, behavior);
        treasureBox.position.copy(position);
        treasureBox.userData.treasureBoxId = id;
        treasureBox.userData.isTreasureBox = true;
        treasureBox.userData.pointValue = this.treasureBoxValue;
        treasureBox.userData.rarity = rarity;
        treasureBox.userData.behavior = behavior;
        
        // Add to scene
        this.scene.add(treasureBox);
        
        // Create treasure box entity instance
        const treasureBoxInstance = {
            id: id,
            mesh: treasureBox,
            manager: this,
            rarity: rarity,
            behavior: behavior,
            clickCount: 0,
            maxClicks: rarity === 'legendary' ? 3 : 1,
            behaviorActive: false,
            behaviorStartTime: null,
            animateClick: function() {
                this.manager.handleEnhancedTreasureBoxClick(this.id);
            }
        };
        
        // Register with SVG Entity Manager for unified click detection
        const treasureEntity = {
            id: id,
            type: 'treasure',
            mesh: treasureBox,
            clickable: true,
            position: position.clone(),
            spawnTime: Date.now(),
            session: {
                clickCount: 0,
                maxClicks: treasureBoxInstance.maxClicks
            },
            entityInstance: treasureBoxInstance
        };
        
        // Register with SVG Entity Manager
        if (this.app.svgEntityManager) {
            this.app.svgEntityManager.activeEntities.set(id, treasureEntity);
        }
        
        // Track locally for treasure-specific logic
        this.activeTreasureBoxes.set(id, {
            id: id,
            mesh: treasureBox,
            position: position.clone(),
            spawnTime: Date.now(),
            rarity: rarity,
            behavior: behavior,
            instance: treasureBoxInstance,
            found: false,
            autoRemoveTimer: rarity === 'legendary' ? null : setTimeout(() => {
                this.removeTreasureBox(id);
                this.scheduleNextTreasure();
            }, this.treasureLifetime)
        });
        
        console.log(`💎 ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} treasure (${behavior}) hidden at (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
        
        // Start behavior window for special treasures
        if (rarity === 'rare') {
            if (behavior === 'elemental') {
                // Elemental treasures have a constant aura instead of a timed window
                const aura = this.createElementalAura(treasureBox);
                this.elementalAuras.set(id, aura);
            } else {
                treasureBoxInstance.behaviorStartTime = Date.now();
                treasureBoxInstance.behaviorActive = true;
                
                setTimeout(() => {
                    treasureBoxInstance.behaviorActive = false;
                    console.log(`💎 Behavior window expired for ${behavior} treasure`);
                }, this.behaviorWindowDuration);
            }
        }
    }
    
    /**
     * Create enhanced treasure box mesh based on rarity
     */
    createEnhancedTreasureBoxMesh(rarity, behavior = 'standard') {
        const group = new THREE.Group();
        
        // Base colors by rarity and behavior
        let baseColor, accentColor, lockColor;
        
        switch (rarity) {
            case 'common':
                baseColor = 0xFFD700; // Gold
                accentColor = 0xDAA520; // Darker gold
                lockColor = 0x8B4513; // Dark brown
                break;
            case 'rare':
                // Different colors for Level 3 behaviors
                if (behavior === 'portal') {
                    baseColor = 0x0000FF; // Blue
                    accentColor = 0xFF0000; // Red
                    lockColor = 0x4B0082; // Indigo
                } else if (behavior === 'shield') {
                    baseColor = 0x9400D3; // Violet
                    accentColor = 0xC0C0C0; // Silver for shield effect
                    lockColor = 0x8B4513; // Dark brown
                } else if (behavior === 'elemental') {
                    baseColor = 0xFFFFFF; // White
                    accentColor = 0x000000; // Black
                    lockColor = 0x808080; // Gray
                } else {
                    // Level 2 behaviors - keep violet
                    baseColor = 0x9400D3; // Violet
                    accentColor = 0x7B68EE; // Medium slate blue
                    lockColor = 0x4B0082; // Indigo
                }
                break;
            case 'legendary':
                // Rainbow effect will be handled in update loop
                baseColor = 0xFF0000; // Start with red
                accentColor = 0xFF7F00; // Orange
                lockColor = 0xFFD700; // Gold lock
                group.userData.isRainbow = true;
                break;
        }
        
        // Main treasure chest body - restored to original size
        const chestGeometry = new THREE.BoxGeometry(1.2, 0.8, 1.0);
        const chestMaterial = new THREE.MeshBasicMaterial({ 
            color: baseColor,
            transparent: false
        });
        const chest = new THREE.Mesh(chestGeometry, chestMaterial);
        chest.position.set(0, 0.4, 0);
        group.add(chest);
        
        // Treasure chest lid
        const lidGeometry = new THREE.BoxGeometry(1.3, 0.15, 1.1);
        const lidMaterial = new THREE.MeshBasicMaterial({ 
            color: accentColor
        });
        const lid = new THREE.Mesh(lidGeometry, lidMaterial);
        lid.position.set(0, 0.875, 0);
        group.add(lid);
        
        // Chest lock/keyhole
        const lockGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8);
        const lockMaterial = new THREE.MeshBasicMaterial({ color: lockColor });
        const lock = new THREE.Mesh(lockGeometry, lockMaterial);
        lock.position.set(0, 0.5, 0.51);
        lock.rotation.x = Math.PI / 2;
        group.add(lock);
        
        // Chest corners (metal reinforcements)
        const cornerMaterial = new THREE.MeshBasicMaterial({ color: 0x708090 }); // Slate gray
        
        for (let i = 0; i < 4; i++) {
            const cornerGeometry = new THREE.BoxGeometry(0.05, 0.45, 0.05);
            const corner = new THREE.Mesh(cornerGeometry, cornerMaterial);
            
            const angle = (i / 4) * Math.PI * 2;
            corner.position.set(
                Math.cos(angle) * 0.275,
                0.2,
                Math.sin(angle) * 0.225
            );
            group.add(corner);
        }
        
        // Store references for material updates
        group.userData.chestMaterial = chestMaterial;
        group.userData.lidMaterial = lidMaterial;
        group.userData.lockMaterial = lockMaterial;
        group.userData.animationTimer = Math.random() * Math.PI * 2;
        group.userData.rainbowTimer = 0;
        
        return group;
    }
    
    /**
     * Find a strategic hiding spot for treasure box
     */
    findHidingSpot() {
        const maxAttempts = 20;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            // Select a placement zone based on weight
            const zone = this.selectWeightedZone();
            
            // Generate random position within the zone
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * zone.radius;
            
            const candidate = {
                x: zone.center.x + Math.cos(angle) * distance,
                y: 0.5, // Slightly above ground for visibility
                z: zone.center.z + Math.sin(angle) * distance
            };
            
            // Check if position is valid (not too close to other treasure boxes)
            if (this.isValidTreasurePosition(candidate)) {
                console.log(`💎 Found hiding spot in ${zone.name} after ${attempts + 1} attempts`);
                return new THREE.Vector3(candidate.x, candidate.y, candidate.z);
            }
            
            attempts++;
        }
        
        console.warn('💎 Could not find valid treasure position after maximum attempts');
        // Fallback to home area
        return new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            0.5,
            (Math.random() - 0.5) * 20
        );
    }
    
    /**
     * Select a placement zone based on weight
     */
    selectWeightedZone() {
        const totalWeight = this.placementZones.reduce((sum, zone) => sum + zone.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const zone of this.placementZones) {
            random -= zone.weight;
            if (random <= 0) {
                return zone;
            }
        }
        
        // Fallback
        return this.placementZones[0];
    }
    
    /**
     * Check if a treasure position is valid (not too close to other treasures)
     */
    isValidTreasurePosition(candidate) {
        const minDistance = 8.0; // Minimum distance between treasure boxes
        
        for (const [id, treasureBox] of this.activeTreasureBoxes) {
            const distance = Math.sqrt(
                Math.pow(candidate.x - treasureBox.position.x, 2) +
                Math.pow(candidate.z - treasureBox.position.z, 2)
            );
            
            if (distance < minDistance) {
                return false;
            }
        }
        
        return true;
    }

    
    /**
     * Handle enhanced treasure box click with behaviors
     */
    handleEnhancedTreasureBoxClick(treasureBoxId) {
        const treasureBox = this.activeTreasureBoxes.get(treasureBoxId);
        
        if (!treasureBox || treasureBox.found) {
            return; // Already found or invalid
        }
        
        const instance = treasureBox.instance;
        
        // Don't increment click count here for growing treasures - they handle their own counting
        if (treasureBox.behavior !== 'growing') {
            instance.clickCount++;
        }
        
        console.log(`💎 ${treasureBox.rarity.toUpperCase()} TREASURE CLICKED! (${instance.clickCount || 0}/${instance.maxClicks || 1})`);
        
        // Handle different behaviors
        if (treasureBox.rarity === 'legendary') {
            // Legendary rainbow treasure - float upward, multiple taps
            this.handleLegendaryTreasure(treasureBox, instance);
        } else if (treasureBox.rarity === 'rare') {
            // For elemental, the behavior is always active due to the aura
            if (treasureBox.behavior === 'elemental' || instance.behaviorActive) {
                this.handleRareTreasureBehavior(treasureBox, instance);
            } else {
                // Standard behavior if window expired for other rare types
                this.handleStandardTreasure(treasureBox, instance);
            }
        } else {
            // Standard behavior - immediate collection
            this.handleStandardTreasure(treasureBox, instance);
        }
    }
    
    /**
     * Handle legendary rainbow treasure behavior
     */
    handleLegendaryTreasure(treasureBox, instance) {
        const points = this.treasureBoxValue * 2; // Double points for legendary
        
        // Start floating upward on first click
        if (instance.clickCount === 1) {
            instance.floatingUp = true;
            instance.floatStartTime = Date.now();
            treasureBox.mesh.userData.floatingUp = true;
            
            console.log(`💎 LEGENDARY RAINBOW TREASURE activated! Float escape initiated! (${instance.clickCount}/3 taps)`);
            this.showTreasureFoundFeedback(treasureBox.mesh, `+${points} (${instance.clickCount}/3)`);
        } else {
            this.showTreasureFoundFeedback(treasureBox.mesh, `+${points} (${instance.clickCount}/3)`);
        }
        
        // Check if fully collected
        if (instance.clickCount >= instance.maxClicks) {
            console.log(`💎 LEGENDARY RAINBOW TREASURE FULLY COLLECTED! Total: ${points * 3} points!`);
            treasureBox.found = true;
            
            // Clear auto-removal timer if it exists
            if (treasureBox.autoRemoveTimer) {
                clearTimeout(treasureBox.autoRemoveTimer);
            }
            
            // Remove and schedule next
            setTimeout(() => {
                this.removeTreasureBox(treasureBox.id);
                this.scheduleNextTreasure();
            }, 1000);
        }
    }
    
    /**
     * Handle rare treasure special behaviors
     */
    handleRareTreasureBehavior(treasureBox, instance) {
        const basePoints = Math.floor(this.treasureBoxValue * 1.5); // 1.5x points for rare
        
        console.log(`💎 RARE TREASURE (${treasureBox.behavior}) CLICKED within behavior window!`);
        
        // Level 1 behaviors
        if (treasureBox.behavior === 'balloon') {
            // Balloon escape behavior
            instance.balloonEscape = true;
            instance.escapeStartTime = Date.now();
            treasureBox.mesh.userData.balloonEscape = true;
            
            // Add realistic balloon visuals
            this.addBalloonVisuals(treasureBox.mesh);
            
            console.log(`💎 Balloon escape activated! Treasure floating away with balloons!`);
            this.showTreasureFoundFeedback(treasureBox.mesh, `+${basePoints} RARE!`);
        } else if (treasureBox.behavior === 'dash') {
            // Dash escape behavior
            instance.dashEscape = true;
            instance.escapeStartTime = Date.now();
            instance.dashDirection = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                0,
                (Math.random() - 0.5) * 2
            ).normalize();
            treasureBox.mesh.userData.dashEscape = true;
            treasureBox.mesh.userData.dashDirection = instance.dashDirection;
            
            console.log(`💎 Dash escape activated! Treasure dashing away!`);
            this.showTreasureFoundFeedback(treasureBox.mesh, `+${basePoints} RARE!`);
        }
        // Level 2 behaviors
        else if (treasureBox.behavior === 'splitting') {
            this.handleSplittingTreasure(treasureBox, instance);
        } else if (treasureBox.behavior === 'growing') {
            this.handleGrowingTreasure(treasureBox, instance);
            return; // Growing treasure handles its own removal timing
        } else if (treasureBox.behavior === 'mimic') {
            this.handleMimicTreasure(treasureBox, instance);
        } else if (treasureBox.behavior === 'phase') {
            this.handlePhaseTreasure(treasureBox, instance);
        }
        // Level 3 behaviors
        else if (treasureBox.behavior === 'portal') {
            this.handlePortalTreasure(treasureBox, instance);
            return; // Portal treasure handles its own removal
        } else if (treasureBox.behavior === 'shield') {
            this.handleShieldTreasure(treasureBox, instance);
            return; // Shield treasure handles its own removal
        } else if (treasureBox.behavior === 'elemental') {
            this.handleElementalTreasure(treasureBox, instance);
            return; // Elemental treasure handles its own removal
        }
        
        // Mark as found and remove
        treasureBox.found = true;
        
        // Clear auto-remove timer
        if (treasureBox.autoRemoveTimer) {
            clearTimeout(treasureBox.autoRemoveTimer);
        }
        
        setTimeout(() => {
            this.removeTreasureBox(treasureBox.id);
            this.scheduleNextTreasure();
        }, 2000); // Longer delay to see escape behavior
    }
    
    /**
     * Handle standard treasure behavior
     */
    handleStandardTreasure(treasureBox, instance) {
        console.log(`💎 COMMON TREASURE FOUND! Standard collection for ${this.treasureBoxValue} points!`);
        
        // Mark as found
        treasureBox.found = true;
        this.boxesFoundThisSession++;
        
        // Visual feedback
        this.showTreasureFoundFeedback(treasureBox.mesh, `+${this.treasureBoxValue}`);
        
        // Clear auto-remove timer
        if (treasureBox.autoRemoveTimer) {
            clearTimeout(treasureBox.autoRemoveTimer);
        }
        
        // Remove and schedule next
        setTimeout(() => {
            this.removeTreasureBox(treasureBox.id);
            this.scheduleNextTreasure();
        }, 500);
    }

    /**
     * Called by SVG Entity Manager when a treasure box is clicked
     */
    animateClick() {
        // This method is called on the treasure box manager, not individual treasures
        // The SVG Entity Manager handles the scoring automatically
        console.log('💎 Enhanced treasure box clicked! Processing with advanced behaviors...');
    }
    

    
    /**
     * Add realistic balloon visuals for balloon escape behavior
     */
    addBalloonVisuals(treasureBoxMesh) {
        const balloonColors = [0xFF0000, 0xFFFFFF, 0x0000FF]; // Red, White, Blue
        const balloonCount = 3;
        
        for (let i = 0; i < balloonCount; i++) {
            // Simple balloon geometry (revert to basic spheres)
            const balloonGeometry = new THREE.SphereGeometry(0.8, 8, 6);
            const balloonMaterial = new THREE.MeshBasicMaterial({ 
                color: balloonColors[i],
                transparent: true,
                opacity: 0.9
            });
            
            const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
            
            // Position balloons around treasure box
            const angle = (i / balloonCount) * Math.PI * 2;
            balloon.position.set(
                Math.cos(angle) * 2.0,
                2.5 + i * 0.3, // Stagger heights
                Math.sin(angle) * 2.0
            );
            
            treasureBoxMesh.add(balloon);
        }
        
        console.log('🎈 Added red, white, and blue balloons to treasure box!');
    }
    
    /**
     * Show visual feedback for treasure found with enhanced text
     */
    showTreasureFoundFeedback(treasureBoxMesh, text) {
        const position = treasureBoxMesh.position.clone();
        
        // Create floating text
        this.createFloatingText(text.toString(), position);
        
        // Create sparkle effect
        this.createSparkleEffect(position);
        
        // Scale and fade animation for the treasure box
        this.animateTreasureBoxDisappear(treasureBoxMesh);
    }
    
    /**
     * Create floating text effect
     */
    createFloatingText(text, worldPosition) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        
        // Style the text
        context.fillStyle = '#FFD700';
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.strokeStyle = '#000000';
        context.lineWidth = 3;
        
        // Draw text with outline
        context.strokeText(text, 128, 64);
        context.fillText(text, 128, 64);
        
        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1
        });
        
        // Create plane for text
        const geometry = new THREE.PlaneGeometry(4, 2);
        const textMesh = new THREE.Mesh(geometry, material);
        textMesh.position.copy(worldPosition);
        textMesh.position.y += 2;
        
        // Make text face camera
        textMesh.lookAt(this.camera.position);
        
        this.scene.add(textMesh);
        
        // Animate text
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 2000; // 2 second animation
            
            if (progress < 1) {
                textMesh.position.y = worldPosition.y + 2 + (progress * 3);
                textMesh.material.opacity = 1 - progress;
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(textMesh);
                geometry.dispose();
                material.dispose();
                texture.dispose();
            }
        };
        
        animate();
    }
    
    /**
     * Create sparkle particle effect
     */
    createSparkleEffect(worldPosition) {
        const particleCount = 20;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.05, 6, 6);
            const material = new THREE.MeshBasicMaterial({ 
                color: Math.random() < 0.5 ? 0xFFD700 : 0xFFFFFF,
                transparent: true
            });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(worldPosition);
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 5
            );
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Animate particles
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 1500; // 1.5 second animation
            
            if (progress < 1) {
                particles.forEach(particle => {
                    particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.02));
                    particle.userData.velocity.y -= 0.1; // Gravity
                    particle.material.opacity = 1 - progress;
                });
                requestAnimationFrame(animate);
            } else {
                particles.forEach(particle => {
                    this.scene.remove(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                });
            }
        };
        
        animate();
    }
    
    /**
     * Animate treasure box disappearing
     */
    animateTreasureBoxDisappear(treasureBoxMesh) {
        const startTime = Date.now();
        const originalScale = treasureBoxMesh.scale.clone();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 500; // 0.5 second animation
            
            if (progress < 1) {
                const scale = 1 + progress * 0.5; // Grow slightly
                const opacity = 1 - progress;
                
                treasureBoxMesh.scale.set(originalScale.x * scale, originalScale.y * scale, originalScale.z * scale);
                
                // Fade all materials
                treasureBoxMesh.traverse(child => {
                    if (child.material) {
                        child.material.transparent = true;
                        child.material.opacity = opacity;
                    }
                });
                
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    /**
     * Remove treasure box from scene and tracking
     */
    removeTreasureBox(treasureBoxId) {
        const treasureBox = this.activeTreasureBoxes.get(treasureBoxId);
        if (treasureBox) {
            // Clean up elemental aura if it exists
            if (this.elementalAuras.has(treasureBoxId)) {
                const aura = this.elementalAuras.get(treasureBoxId);
                aura.particles.forEach(p => {
                    this.scene.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                });
                this.elementalAuras.delete(treasureBoxId);
            }

            // Clear any timers
            if (treasureBox.autoRemoveTimer) {
                clearTimeout(treasureBox.autoRemoveTimer);
            }
            
            setTimeout(() => {
                if (treasureBox.mesh.parent) {
                    this.scene.remove(treasureBox.mesh);
                }
                
                // Dispose of geometry and materials
                treasureBox.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }, 500); // Remove after animation
            
            // Remove from SVG Entity Manager
            if (this.app.svgEntityManager) {
                this.app.svgEntityManager.activeEntities.delete(treasureBoxId);
            }
            
            this.activeTreasureBoxes.delete(treasureBoxId);
        }
    }
    
    /**
     * Update treasure boxes with enhanced behaviors
     */
    update() {
        const currentTime = Date.now();
        
        // Update elemental auras
        this.updateElementalAuras(currentTime);

        for (const [id, treasureBox] of this.activeTreasureBoxes) {
            const mesh = treasureBox.mesh;
            const instance = treasureBox.instance;
            
            // Basic floating animation
            mesh.userData.animationTimer += 0.02;
            const baseFloatOffset = Math.sin(mesh.userData.animationTimer * 0.7) * 0.05;
            
            // Handle legendary rainbow treasure
            if (treasureBox.rarity === 'legendary') {
                // Rainbow color cycling
                mesh.userData.rainbowTimer += 0.05;
                const hue = (mesh.userData.rainbowTimer * 0.1) % 1;
                const rainbowColor = new THREE.Color().setHSL(hue, 1, 0.5);
                
                if (mesh.userData.chestMaterial) {
                    mesh.userData.chestMaterial.color.copy(rainbowColor);
                }
                
                // Floating upward behavior
                if (instance && instance.floatingUp) {
                    const floatTime = currentTime - instance.floatStartTime;
                    const floatProgress = Math.min(floatTime / 5000, 1); // 5 seconds to float away
                    
                    mesh.position.y = treasureBox.position.y + baseFloatOffset + (floatProgress * 10);
                    mesh.rotation.y += 0.02; // Gentle rotation while floating
                    
                    // Remove if floated away completely without being clicked enough
                    if (floatProgress >= 1 && instance.clickCount < instance.maxClicks) {
                        console.log('💎 Legendary treasure floated away uncollected!');
                        this.removeTreasureBox(id);
                        this.scheduleNextTreasure();
                        continue;
                    }
                } else {
                    mesh.position.y = treasureBox.position.y + baseFloatOffset;
                }
            }
            // Handle rare treasure behaviors
            else if (treasureBox.rarity === 'rare' && instance) {
                // Balloon escape behavior
                if (instance.balloonEscape) {
                    const escapeTime = currentTime - instance.escapeStartTime;
                    const escapeProgress = Math.min(escapeTime / 12000, 1); // 12 seconds to escape for easier tapping
                    
                    mesh.position.y = treasureBox.position.y + baseFloatOffset + (escapeProgress * 4); // Slower, gentler rise
                    mesh.rotation.y += 0.02; // Medium rotation while escaping
                    
                    // Remove when escaped
                    if (escapeProgress >= 1) {
                        console.log('💎 Balloon treasure escaped!');
                        this.removeTreasureBox(id);
                        this.scheduleNextTreasure();
                        continue;
                    }
                }
                // Dash escape behavior
                else if (instance.dashEscape && instance.dashDirection) {
                    const escapeTime = currentTime - instance.escapeStartTime;
                    const escapeProgress = Math.min(escapeTime / 2000, 1); // 2 seconds to dash away
                    
                    const dashDistance = escapeProgress * 15; // Dash 15 units away
                    mesh.position.x = treasureBox.position.x + (instance.dashDirection.x * dashDistance);
                    mesh.position.z = treasureBox.position.z + (instance.dashDirection.z * dashDistance);
                    mesh.position.y = treasureBox.position.y + baseFloatOffset;
                    
                    // Spinning while dashing
                    mesh.rotation.y += 0.1;
                    
                    // Remove when dashed away
                    if (escapeProgress >= 1) {
                        console.log('💎 Dash treasure escaped!');
                        this.removeTreasureBox(id);
                        this.scheduleNextTreasure();
                        continue;
                    }
                }
                // Mimic treasure behavior - circular movement
                else if (instance.mimicActive) {
                    const runTime = currentTime - instance.mimicStartTime;
                    instance.mimicPhase += 0.05; // Speed of circular movement
                    
                    const radius = 3; // Radius of circular movement
                    const centerX = instance.originalPosition.x;
                    const centerZ = instance.originalPosition.z;
                    
                    mesh.position.x = centerX + Math.cos(instance.mimicPhase) * radius;
                    mesh.position.z = centerZ + Math.sin(instance.mimicPhase) * radius;
                    mesh.position.y = treasureBox.position.y + baseFloatOffset;
                    
                    // Bouncing animation while running
                    mesh.rotation.y += 0.08; // Fast spinning while running
                    
                } else {
                    mesh.position.y = treasureBox.position.y + baseFloatOffset;
                }
            }
            // Standard treasure behavior
            else {
                mesh.position.y = treasureBox.position.y + baseFloatOffset;
            }
        }
    }
    
    /**
     * Get current treasure session stats
     */
    getTreasureStats() {
        return {
            sessionId: this.currentSessionId,
            boxesRemaining: this.activeTreasureBoxes.size,
            boxesFoundThisSession: this.boxesFoundThisSession,
            sessionStartTime: this.sessionStartTime
        };
    }
    
    /**
     * Cleanup - remove all treasure boxes
     */
    cleanup() {
        // Remove all active treasure boxes
        for (const [id, treasureBox] of this.activeTreasureBoxes) {
            if (treasureBox.mesh.parent) {
                this.scene.remove(treasureBox.mesh);
            }
        }
        this.activeTreasureBoxes.clear();
        
        console.log('💎 Enhanced Treasure Box Manager cleaned up');
    }
    
    /**
     * Check if scheduling needs to be restarted after unpause
     */
    restartSchedulingIfNeeded() {
        if (!this.scheduleActive && !this.svgEntityManager?.isGamePlayPaused()) {
            console.log('💎 Restarting treasure spawning after unpause');
            this.scheduleNextTreasure();
            return true;
        }
        return false;
    }

    // ========== ELEMENTAL TREASURE ENHANCEMENTS ==========

    createElementalAura(treasureBoxMesh) {
        const particleCount = 50;
        const particles = [];
        const elements = {
            'fire': { color: 0xFF4500 },
            'ice': { color: 0x00BFFF },
            'lightning': { color: 0xFFFF00 }
        };
        const elementKeys = Object.keys(elements);

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.08, 6, 6);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xffffff, // Start as white, will be colored in update
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(treasureBoxMesh.position);
            particle.userData.offset = new THREE.Vector3(
                (Math.random() - 0.5) * 2.5,
                (Math.random() - 0.5) * 2.5,
                (Math.random() - 0.5) * 2.5
            );
            particle.userData.phase = Math.random() * Math.PI * 2;
            
            this.scene.add(particle);
            particles.push(particle);
        }

        return {
            particles: particles,
            mesh: treasureBoxMesh,
            elements: elements,
            elementKeys: elementKeys,
            currentColor: new THREE.Color()
        };
    }

    updateElementalAuras(currentTime) {
        for (const [id, aura] of this.elementalAuras) {
            const cycleDuration = 9000; // 9 seconds for a full cycle (3s per element)
            const elementIndex = Math.floor((currentTime / (cycleDuration / aura.elementKeys.length)) % aura.elementKeys.length);
            const currentElementKey = aura.elementKeys[elementIndex];
            const targetColor = new THREE.Color(aura.elements[currentElementKey].color);

            // Smoothly transition color
            aura.currentColor.lerp(targetColor, 0.05);

            aura.particles.forEach((particle, i) => {
                particle.userData.phase += 0.02 + (i / aura.particles.length) * 0.01;

                const orbitRadius = 1.5;
                const x = aura.mesh.position.x + Math.cos(particle.userData.phase) * orbitRadius;
                const y = aura.mesh.position.y + Math.sin(particle.userData.phase * 2) * 0.5;
                const z = aura.mesh.position.z + Math.sin(particle.userData.phase) * orbitRadius;

                particle.position.set(x, y, z);
                particle.material.color.copy(aura.currentColor);
            });
            
            // Store the current element on the treasure box instance for the click handler
            const treasureBox = this.activeTreasureBoxes.get(id);
            if (treasureBox && treasureBox.instance) {
                treasureBox.instance.currentElement = {
                    key: currentElementKey,
                    ...aura.elements[currentElementKey]
                };
            }
        }
    }

    // ========== LEVEL 2 TREASURE BEHAVIORS ==========

    /**
     * Handle splitting treasure - splits into 3 smaller boxes
     */
    handleSplittingTreasure(treasureBox, instance) {
        const points = 500; // Each small box gives 500 points (1500 total)
        
        console.log('💎 SPLITTING TREASURE activated! Creating 3 smaller treasures!');
        
        // Create 3 smaller treasure boxes
        for (let i = 0; i < 3; i++) {
            const smallTreasureId = `split_${treasureBox.id}_${i}`;
            const angle = (i * Math.PI * 2) / 3; // 120 degrees apart
            const distance = 3; // Distance from original
            
            const newPosition = {
                x: treasureBox.position.x + Math.cos(angle) * distance,
                y: treasureBox.position.y,
                z: treasureBox.position.z + Math.sin(angle) * distance
            };
            
            // Create smaller treasure box
            const smallTreasure = this.createEnhancedTreasureBoxMesh('common', 'standard');
            smallTreasure.scale.set(0.6, 0.6, 0.6); // Make them smaller
            smallTreasure.position.copy(newPosition);
            smallTreasure.userData.treasureBoxId = smallTreasureId;
            smallTreasure.userData.isTreasureBox = true;
            smallTreasure.userData.pointValue = points;
            smallTreasure.userData.rarity = 'common';
            
            this.scene.add(smallTreasure);
            
            // Add to active treasures
            this.activeTreasureBoxes.set(smallTreasureId, {
                mesh: smallTreasure,
                id: smallTreasureId,
                position: newPosition,
                rarity: 'common',
                behavior: 'standard',
                clickCount: 0,
                maxClicks: 1,
                behaviorActive: false,
                autoRemoveTimer: setTimeout(() => {
                    this.removeTreasureBox(smallTreasureId);
                }, this.treasureLifetime)
            });
        }
        
        this.showTreasureFoundFeedback(treasureBox.mesh, '+1500 SPLIT!');
        
        // Remove original treasure
        treasureBox.found = true;
        setTimeout(() => {
            this.removeTreasureBox(treasureBox.id);
        }, 1000);
    }

    /**
     * Handle growing treasure - gets larger with each tap
     */
    handleGrowingTreasure(treasureBox, instance) {
        instance.clickCount = (instance.clickCount || 0) + 1;
        const maxClicks = 3;
        const pointValues = [800, 1200, 2000]; // Increasing points
        const currentPoints = pointValues[instance.clickCount - 1] || 2000;
        
        // Scale the treasure larger
        const scale = 1 + (instance.clickCount * 0.4); // 40% larger each tap for more visible growth
        treasureBox.mesh.scale.set(scale, scale, scale);
        
        console.log(`💎 GROWING TREASURE tap ${instance.clickCount}/${maxClicks}! Scale: ${scale.toFixed(2)}`);
        this.showTreasureFoundFeedback(treasureBox.mesh, `+${currentPoints} (${instance.clickCount}/${maxClicks})`);
        
        if (instance.clickCount >= maxClicks) {
            // Final collection with animation
            treasureBox.found = true;
            console.log(`💎 GROWING TREASURE FULLY COLLECTED! Total: ${pointValues.reduce((a, b) => a + b)} points!`);
            
            setTimeout(() => {
                this.removeTreasureBox(treasureBox.id);
                this.scheduleNextTreasure();
            }, 1500); // Give more time to see the final scale
        } else {
            // Not fully collected yet - show visual feedback but keep treasure active
            console.log(`💎 Growing treasure waiting for next click... (${maxClicks - instance.clickCount} more needed)`);
        }
    }

    /**
     * Handle mimic treasure - runs away in circles
     */
    handleMimicTreasure(treasureBox, instance) {
        const points = Math.floor(this.treasureBoxValue * 2); // 2x points for the challenge
        
        console.log('💎 MIMIC TREASURE activated! It\'s running away!');
        
        // Add legs animation and circular movement
        instance.mimicActive = true;
        instance.mimicStartTime = Date.now();
        instance.originalPosition = { ...treasureBox.position };
        instance.mimicPhase = 0;
        
        treasureBox.mesh.userData.mimicActive = true;
        
        this.showTreasureFoundFeedback(treasureBox.mesh, `+${points} MIMIC!`);
        
        // It will run for 5 seconds then stop
        setTimeout(() => {
            if (instance.mimicActive) {
                instance.mimicActive = false;
                treasureBox.mesh.userData.mimicActive = false;
                console.log('💎 Mimic treasure stopped running - now collectable!');
            }
        }, 5000);
    }

    /**
     * Handle phase treasure - becomes transparent
     */
    handlePhaseTreasure(treasureBox, instance) {
        const points = Math.floor(this.treasureBoxValue * 1.8); // 1.8x points
        
        console.log('💎 PHASE TREASURE activated! It\'s becoming transparent!');
        
        // Make it semi-transparent and harder to see
        treasureBox.mesh.traverse((child) => {
            if (child.material) {
                child.material.transparent = true;
                child.material.opacity = 0.3; // Very transparent
            }
        });
        
        instance.phaseActive = true;
        treasureBox.mesh.userData.phaseActive = true;
        
        this.showTreasureFoundFeedback(treasureBox.mesh, `+${points} PHASE!`);
        
        // Becomes solid again after 3 seconds
        setTimeout(() => {
            if (treasureBox.mesh) {
                treasureBox.mesh.traverse((child) => {
                    if (child.material) {
                        child.material.opacity = 1.0;
                        child.material.transparent = false;
                    }
                });
            }
        }, 3000);
        
        treasureBox.found = true;
        setTimeout(() => {
            this.removeTreasureBox(treasureBox.id);
            this.scheduleNextTreasure();
        }, 1000);
    }

    // ========== LEVEL 3 TREASURE BEHAVIORS ==========

    /**
     * Handle portal treasure - teleports around the map
     */
    handlePortalTreasure(treasureBox, instance) {
        const points = Math.floor(this.treasureBoxValue * 2.5); // 2.5x points
        const maxClicks = 3;
        
        console.log(`💎 PORTAL TREASURE activated! Click ${instance.clickCount}/${maxClicks}`);
        
        if (instance.clickCount < maxClicks) {
            // Teleport to a new random location
            const newPosition = this.findHidingSpot();
            if (newPosition) {
                treasureBox.mesh.position.copy(newPosition);
                treasureBox.position.copy(newPosition);
                
                // Portal effect
                this.createSparkleEffect(newPosition);
                this.showTreasureFoundFeedback(treasureBox.mesh, `PORTAL ${instance.clickCount}/${maxClicks}`);
            }
        } else {
            // Final collection
            this.showTreasureFoundFeedback(treasureBox.mesh, `+${points} PORTAL!`);
            treasureBox.found = true;
            
            if (treasureBox.autoRemoveTimer) {
                clearTimeout(treasureBox.autoRemoveTimer);
            }

            setTimeout(() => {
                this.removeTreasureBox(treasureBox.id);
                this.scheduleNextTreasure();
            }, 1000);
        }
    }

    /**
     * Handle shield treasure - requires multiple hits to break shield
     */
    handleShieldTreasure(treasureBox, instance) {
        const maxHits = 5;
        const pointsPerHit = 100;
        const finalBonus = 2000;

        console.log(`💎 SHIELD TREASURE hit ${instance.clickCount}/${maxHits}!`);

        // Add shield visual on first hit if it doesn't exist
        if (!instance.shieldMesh) {
            const shieldGeometry = new THREE.SphereGeometry(1.5, 16, 16);
            const shieldMaterial = new THREE.MeshBasicMaterial({
                color: 0x00BFFF,
                transparent: true,
                opacity: 0.5,
                wireframe: true
            });
            instance.shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
            treasureBox.mesh.add(instance.shieldMesh);
        }
        
        // Visual feedback - reduce shield opacity
        const shieldOpacity = 0.5 * (1 - (instance.clickCount / maxHits));
        instance.shieldMesh.material.opacity = shieldOpacity;
        
        this.showTreasureFoundFeedback(treasureBox.mesh, `+${pointsPerHit} (${instance.clickCount}/${maxHits})`);
        
        if (instance.clickCount >= maxHits) {
            console.log(`💎 SHIELD TREASURE BROKEN! Total: ${pointsPerHit * maxHits + finalBonus} points!`);
            this.showTreasureFoundFeedback(treasureBox.mesh, `+${finalBonus} SHIELD BREAK!`);
            treasureBox.found = true;

            if (treasureBox.autoRemoveTimer) {
                clearTimeout(treasureBox.autoRemoveTimer);
            }

            setTimeout(() => {
                this.removeTreasureBox(treasureBox.id);
                this.scheduleNextTreasure();
            }, 1000);
        }
    }

    /**
     * Handle elemental treasure - different bonuses based on element
     */
    handleElementalTreasure(treasureBox, instance) {
        const elements = {
            'fire': { multiplier: 2.0, bonus: 'FIRE!', color: 0xFF4500 },
            'ice': { multiplier: 1.5, bonus: 'ICE!', color: 0x00BFFF },
            'lightning': { multiplier: 3.0, bonus: 'LIGHTNING!', color: 0xFFFF00 }
        };
        
        // Use the current element stored by the aura update loop
        const currentElement = instance.currentElement || { key: 'fire', ...elements.fire };
        
        const points = this.treasureBoxValue * currentElement.multiplier;
        
        console.log(`💎 ELEMENTAL TREASURE (${currentElement.key}) activated!`);
        this.showTreasureFoundFeedback(treasureBox.mesh, `+${Math.floor(points)} ${currentElement.bonus}`);
        
        // Elemental effect
        this.createElementalEffect(treasureBox.mesh.position, currentElement.color);

        treasureBox.found = true;

        if (treasureBox.autoRemoveTimer) {
            clearTimeout(treasureBox.autoRemoveTimer);
        }

        setTimeout(() => {
            this.removeTreasureBox(treasureBox.id);
            this.scheduleNextTreasure();
        }, 1000);
    }

    createElementalEffect(position, color) {
        const particleCount = 50; // Increased from 30
        const particles = [];
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.15, 8, 8); // Slightly larger
            const material = new THREE.MeshBasicMaterial({ color: color, transparent: true });
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            const radius = 1.5 + Math.random() * 2; // Wider explosion
            const angle = Math.random() * Math.PI * 2;
            const verticalAngle = (Math.random() - 0.5) * Math.PI; // More verticality
            
            particle.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(verticalAngle) * radius,
                Math.sin(verticalAngle) * radius * 1.5, // More upward force
                Math.sin(angle) * Math.cos(verticalAngle) * radius
            );
            this.scene.add(particle);
            particles.push(particle);
        }

        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 2000; // Longer duration
            if (progress < 1) {
                particles.forEach(p => {
                    p.position.add(p.userData.velocity.clone().multiplyScalar(0.03));
                    p.userData.velocity.y -= 0.15; // Stronger gravity
                    p.material.opacity = 1 - progress;
                    p.scale.setScalar(1 - progress); // Shrink as they fade
                });
                requestAnimationFrame(animate);
            } else {
                particles.forEach(p => {
                    this.scene.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                });
            }
        };
        animate();
    }
}

// Export for module system
window.TreasureBoxManager = TreasureBoxManager;

/**
 * Initialize Enhanced Treasure Box Manager with the main app
 */
window.initializeTreasureBoxes = function(app) {
    if (!app || !app.scene || !app.camera || !app.renderer) {
        console.warn('💎 Cannot initialize enhanced treasure boxes - app components missing');
        return null;
    }
    
    if (app.treasureBoxManager) {
        console.log('💎 Enhanced Treasure Box Manager already initialized');
        return app.treasureBoxManager;
    }
    
    try {
        app.treasureBoxManager = new TreasureBoxManager(app);
        console.log('💎 Enhanced Treasure Box Manager initialized successfully with variable behaviors!');
        return app.treasureBoxManager;
    } catch (error) {
        console.error('💎 Error initializing Enhanced Treasure Box Manager:', error);
        return null;
    }
};

console.log('💎 Enhanced Treasure Box Manager module loaded with variable behaviors and rarity system!');
