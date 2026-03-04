/**
 * SVG ENTITY MANAGER
 * Manages interactive SVG entities in the 3D world with click rewards
 * 
 * Features:
 * - Spawn rare interactive entities (blimp, airplane, dog, UFO, bird)
 * - Click detection with point rewards (100-500 points based on difficulty)
 * - Session management (max 3 clicks per session, 2 concurrent sessions max)
 * - Billboard text display ("FirstTaps")
 * 
 * Dependencies: EntityUIManager for all UI functionality
 */

// Ensure EntityUIManager is available
if (typeof EntityUIManager === 'undefined') {
    console.warn('🎮 EntityUIManager not loaded - UI functionality may not work');
}

class SVGEntityManager {
    constructor(app) {
        this.app = app;
        this.scene = app.scene;
        this.camera = app.camera;
        this.renderer = app.renderer;
        
        // Entity management
        this.activeEntities = new Map();
        this.activeSessions = new Set();
        this.maxConcurrentSessions = 2;
        this.sessionClickLimit = 3;
        
        // Pause functionality
        this.gamePlayPaused = false;
        
        // Spawn timing - Original balanced frequency
        this.lastSpawnTime = Date.now();
        this.minSpawnInterval = 10 * 1000; // 10 seconds (restored original)
        this.maxSpawnInterval = 20 * 1000; // 20 seconds (restored original)
        this.nextSpawnTime = this.calculateNextSpawnTime();

        console.log('SVGEntityManager: Spawn intervals restored to 10-20 seconds for balanced gameplay');        // Point system
        this.totalPoints = 0;
        this.sessionStats = {
            currentSessionClicks: 0,
            totalClicks: 0,
            entitiesClicked: {},
            sessionsCompleted: 0
        };
        this.pointLevels = {
            blimp: 200,    // Level 1 - Very slow, predictable (doubled)
            airplane: 300, // Level 1 - Medium speed, straight (doubled)
            dog: 400,      // Level 1 - Fast + erratic ground (doubled)
            ufo: 500,      // Level 1 - Fast + erratic vertical (doubled)
            bird: 600,     // Level 1 - Fastest, brief appearance (doubled)
            frog: 600,     // Level 1 - Hopping green frog (doubled)
            treasure: 1000, // Special - Hidden treasure boxes
            
            // Level 2 entities (woodland creatures)
            rabbit: 700,   // Level 2.1 - Fast hopping
            squirrel: 1200, // Level 2.2 - Spiral climbing (fastest, highest points)
            owl: 900,      // Level 2.3 - Silent swooping
            deer: 1000,    // Level 2.4 - Graceful leaping
            fox: 800,      // Level 2.5 - Cunning zigzag
            
            // Level 3 entities (mythical creatures)
            dragon: 1400,  // Level 3.1 - Figure-8 flight
            phoenix: 1600, // Level 3.2 - Rising/falling
            unicorn: 1800, // Level 3.3 - Galloping rainbow
            griffin: 2000, // Level 3.4 - Flight/ground switching
            pegasus: 2200, // Level 3.5 - Soaring patterns
            
            // Level 4 entities (insect kingdom) - PREMIUM
            spider: 500,       // Level 4.1 - Web patterns, medium difficulty  
            mantis: 1000,      // Level 4.2 - Quick strikes, harder to catch
            housefly: 2000,    // Level 4.3 - Erratic buzzing, very fast (hardest)
            butterfly: 600,    // Level 4.4 - Graceful but predictable
            ladybug: 1000,     // Level 4.5 - Small target, challenging
            
            // Level 5 entities (glowing objects) - PREMIUM
            blue_orb: 1300,     // Level 5.1 - Pulsing blue orb
            yellow_disc: 1500,  // Level 5.2 - Spinning yellow disc
            red_siren: 1700,    // Level 5.3 - Flashing red siren
            dancing_orbs: 2000, // Level 5.4 - Dancing pink orbs
            flashing_cube: 2200, // Level 5.5 - Flashing cube
            
            // Level 6 entities (bouncing balls bonanza) - PREMIUM
            red_ball: 1500,     // Level 6.1 - Simple bouncing
            blue_sphere: 1800,  // Level 6.2 - Diagonal bouncing
            golden_orb: 2100,   // Level 6.3 - Multi-directional bouncing
            rainbow_ball: 2400, // Level 6.4 - Color-changing
            mega_sphere: 2800, // Level 6.5 - Splits when clicked
            
            // Level 7 entities (UFO invasion) - PREMIUM
            scout_ufo: 2000,        // Level 7.1 - Fast reconnaissance
            warship_ufo: 2400,      // Level 7.2 - Medium attack UFO
            mothership_ufo: 2800,   // Level 7.3 - Large command ship
            cloaked_ufo: 3200,      // Level 7.4 - Periodically invisible
            swarm_commander: 4000   // Level 7.5 - Controls mini-UFOs (ultimate challenge)
        };
        
        // Level progression system
        this.levelThresholds = {
            1: 0,       // Default level (original entities)
            2: 10000,   // Level 2: Woodland creatures (10k+ points)
            3: 20000,   // Level 3: Mythical creatures (20k+ points)
            4: 35000,   // Level 4: Insect Kingdom (35k+ points + PREMIUM)
            5: 55000,   // Level 5: Energy Orbs (55k+ points + PREMIUM)
            6: 80000,   // Level 6: Bouncing Balls Bonanza (80k+ points + PREMIUM)
            7: 120000   // Level 7: UFO Invasion (120k+ points + PREMIUM)
        };
        
        this.currentLevel = 1; // Start at level 1
        this.levelCollections = new Map(); // Will store loaded entity collections
        this.hasShownPremiumPopup = false; // Track if premium popup has been shown
        
        // Premium gaming levels state (set directly by Flutter like world theme switching)
        this.premiumLevelsState = {
            level4: false,
            level5: false,
            level6: false,
            level7: false
        };
        
        // Raycasting
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // PROMOTIONAL ENTITIES SYSTEM (independent of gaming)
        this.promotionalEntities = new Map();
        this.lastPromotionalSpawnTime = Date.now();
        this.minPromotionalInterval = 5 * 60 * 1000; // 5 minutes
        this.maxPromotionalInterval = 10 * 60 * 1000; // 10 minutes
        this.nextPromotionalSpawnTime = this.calculateNextPromotionalSpawnTime();
        this.promotionalTypes = ['biplane', 'balloon', 'bus']; // Available promotional entities
        
        // Initialize UI Manager
        this.uiManager = new EntityUIManager({
            entityManager: this,
            totalPoints: this.totalPoints,
            sessionStats: this.sessionStats,
            currentLevel: this.currentLevel,
            gamePlayPaused: this.gamePlayPaused,
            maxConcurrentSessions: this.maxConcurrentSessions,
            sessionClickLimit: this.sessionClickLimit,
            pointLevels: this.pointLevels,
            levelThresholds: this.levelThresholds,
            activeSessions: this.activeSessions,
            activeEntities: this.activeEntities,
            nextSpawnTime: this.nextSpawnTime,
            hasShownPremiumPopup: this.hasShownPremiumPopup
        });
        
        // Initialize
        this.setupEventListeners();
        this.uiManager.initialize(); // Use UI manager instead of createScoreUI()
        this.startUpdateLoop();
        
        // Pre-load entity collections for higher levels
        this.preloadEntityCollections();
        
        // Check initial level after setup (in case points are restored from session)
        setTimeout(() => {
            this.checkInitialLevelState();
        }, 1000);
        
        console.log('🎮 SVG Entity Manager initialized - rare interactive entities ready');
    }
    
    /**
     * Calculate next spawn time with randomization
     */
    calculateNextSpawnTime() {
        const randomInterval = this.minSpawnInterval + 
            Math.random() * (this.maxSpawnInterval - this.minSpawnInterval);
        return Date.now() + randomInterval;
    }
    
    /**
     * Calculate next promotional entity spawn time (5-10 minutes)
     */
    calculateNextPromotionalSpawnTime() {
        const randomInterval = this.minPromotionalInterval + 
            Math.random() * (this.maxPromotionalInterval - this.minPromotionalInterval);
        const nextTime = Date.now() + randomInterval;
        console.log(`📢 Next promotional entity spawns in ${Math.floor(randomInterval/60000)} minutes`);
        return nextTime;
    }
    
    /**
     * Get current player level based on total points
     */
    /**
     * Check if premium level is unlocked via Flutter bridge
     */
    isPremiumLevelUnlocked(level) {
        // Check direct premium level state (set by Flutter, like world theme switching)
        if (this.premiumLevelsState) {
            const levelKey = `level${level}`;
            const isDirectlyEnabled = this.premiumLevelsState[levelKey];
            if (isDirectlyEnabled !== undefined) {
                console.log(`🎯 Premium level ${level} directly enabled: ${isDirectlyEnabled}`);
                return isDirectlyEnabled;
            }
        }
        
        // Check if we have premium feature channel available (fallback)
        if (window.premiumFeatureChannel && window.premiumFeatureChannel.isPremiumFeatureUnlocked) {
            try {
                const featureKey = `gaming_level_${level}`;
                return window.premiumFeatureChannel.isPremiumFeatureUnlocked(featureKey);
            } catch (error) {
                console.warn(`⚠️ Error checking premium status for level ${level}:`, error);
                return false;
            }
        }
        
        // Fallback: check localStorage for development testing
        const testKey = level === 4 ? 'test_premium_level_4' : 'test_premium_level_5';
        return localStorage.getItem(testKey) === 'true';
    }

    // NEW METHOD: Directly set premium gaming level availability (like world theme switching)
    setPremiumLevelsEnabled(levelsState) {
        console.log('🎮 JS: Setting premium gaming levels state:', levelsState);
        this.premiumLevelsState = levelsState;
    }

    getCurrentLevel() {
        let level = 1;
        // console.log(`🎮 DEBUG: getCurrentLevel starting with ${this.totalPoints} points`);
        for (const [threshold, minPoints] of Object.entries(this.levelThresholds)) {
            const targetLevel = parseInt(threshold);
            // console.log(`🎮 DEBUG: Checking level ${targetLevel}, threshold: ${minPoints}, points: ${this.totalPoints}`);
            
            if (this.totalPoints >= minPoints) {
                // console.log(`🎮 DEBUG: Points sufficient for level ${targetLevel}`);
                // Check if this is a premium level that requires unlocking
                if (targetLevel >= 4) {
                    const unlocked = this.isPremiumLevelUnlocked(targetLevel);
                    // console.log(`🎮 DEBUG: Level ${targetLevel} premium check: ${unlocked}`);
                    if (unlocked) {
                        level = targetLevel;
                        // console.log(`🎮 DEBUG: Level advanced to ${targetLevel}`);
                    } else {
                        // console.log(`🎮 DEBUG: Level ${targetLevel} locked, staying at ${level}`);
                    }
                    // If premium level not unlocked, continue with previous level
                } else {
                    // Non-premium levels (1-3) are always available
                    level = targetLevel;
                    // console.log(`🎮 DEBUG: Non-premium level advanced to ${targetLevel}`);
                }
            } else {
                // console.log(`🎮 DEBUG: Points insufficient for level ${targetLevel}`);
            }
        }
        // console.log(`🎮 DEBUG: getCurrentLevel returning ${level}`);
        return level;
    }
    
    /**
     * Get next level threshold points
     */
    getNextLevelThreshold() {
        const levels = Object.keys(this.levelThresholds).map(Number).sort((a, b) => a - b);
        const currentLevelIndex = levels.findIndex(level => level === this.currentLevel);
        
        if (currentLevelIndex >= 0 && currentLevelIndex < levels.length - 1) {
            const nextLevel = levels[currentLevelIndex + 1];
            return this.levelThresholds[nextLevel];
        }
        
        return null; // Max level reached
    }
    
    /**
     * Check if player has leveled up and trigger celebration
     */
    checkLevelProgression() {
        const newLevel = this.getCurrentLevel();
        console.log(`🎮 LEVEL CHECK: Current level: ${this.currentLevel}, Calculated level: ${newLevel}, Points: ${this.totalPoints}`);
        
        // Check if we need to show premium popup (at 35,000 points - Level 4 threshold)
        if (this.totalPoints >= 35000 && !this.hasShownPremiumPopup) {
            console.log(`� TRIGGERING PREMIUM POPUP for being at level ${newLevel}!`);
            setTimeout(() => {
                this.uiManager.showPremiumGamingPopup();
            }, 2000);
            this.hasShownPremiumPopup = true;
        }
        
        if (newLevel > this.currentLevel) {
            console.log(`🎮 LEVEL UP! Player reached Level ${newLevel} (${this.totalPoints} points)`);
            this.currentLevel = newLevel;
            this.showLevelUpCelebration(newLevel);
            this.loadEntityCollectionForLevel(newLevel);
        }
        
        // Check for level progression opportunities (Level 6 & 7 paywalls)
        if (this.uiManager && this.uiManager.progressionNotifier) {
            this.uiManager.progressionNotifier.checkProgressionOpportunities(
                this.totalPoints, 
                newLevel
            );
        }
    }

    /**
     * Check initial level state on startup (handles restored sessions)
     */
    checkInitialLevelState() {
        const calculatedLevel = this.getCurrentLevel();
        console.log(`🎮 INITIAL LEVEL CHECK: Current: ${this.currentLevel}, Calculated: ${calculatedLevel}, Points: ${this.totalPoints}`);
        
        if (calculatedLevel > this.currentLevel) {
            console.log(`🎮 RESTORING LEVEL: Setting level to ${calculatedLevel} based on existing points`);
            this.currentLevel = calculatedLevel;
            this.loadEntityCollectionForLevel(calculatedLevel);
        }
        
        // If we have 35,000+ points (Level 4 threshold) and haven't shown popup, show it
        if (this.totalPoints >= 35000 && !this.hasShownPremiumPopup) {
            console.log(`🎮 SHOWING PREMIUM POPUP: ${this.totalPoints} points reached (Level 4 threshold), showing popup now`);
            setTimeout(() => {
                this.uiManager.showPremiumGamingPopup();
            }, 3000); // Longer delay for restored sessions
            this.hasShownPremiumPopup = true;
        }
    }
    
    /**
     * Show level up celebration animation
     */
    showLevelUpCelebration(level) {
        // Create temporary celebration overlay
        const celebration = document.createElement('div');
        celebration.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #FFD700, #FFA500);
            color: #000;
            font-family: 'Arial', sans-serif;
            font-size: 24px;
            font-weight: bold;
            padding: 20px 40px;
            border-radius: 15px;
            border: 3px solid #FF6B35;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
            z-index: 2000;
            text-align: center;
            animation: levelUpPulse 3s ease-in-out;
            pointer-events: none;
        `;
        
        celebration.innerHTML = `
            🎊 LEVEL UP! 🎊<br>
            <div style="font-size: 32px; margin: 10px 0;">LEVEL ${level}</div>
            <div style="font-size: 16px;">New creatures unlocked!</div>
        `;
        
        // Add celebration CSS animation
        if (!document.getElementById('levelUpStyles')) {
            const styles = document.createElement('style');
            styles.id = 'levelUpStyles';
            styles.textContent = `
                @keyframes levelUpPulse {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                    80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(celebration);
        
        // Remove after animation
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, 3000);
    }
    
    /**
     * Load entity collection for specific level
     */
    async loadEntityCollectionForLevel(level) {
        if (this.levelCollections.has(level)) {
            console.log(`✅ Level ${level} entities already loaded`);
            return;
        }
        
        // Since entities are now bundled, just verify they're available
        try {
            let available = false;
            
            switch (level) {
                case 2:
                    // Check if Level 2 entities are available from bundle
                    available = window.RabbitEntity && window.SquirrelEntity && 
                               window.OwlEntity && window.DeerEntity && window.FoxEntity;
                    break;
                case 3:
                    // Check if Level 3 entities are available from bundle
                    available = window.DragonEntity && window.PhoenixEntity && 
                               window.UnicornEntity && window.GriffinEntity && window.PegasusEntity;
                    break;
                case 4:
                    // Check if Level 4 premium entities are available from bundle
                    available = window.BlackSpiderEntity && window.PrayingMantisEntity && 
                               window.HouseflyEntity && window.ButterflyEntity && window.LadybugEntity;
                    break;
                case 5:
                    // Check if Level 5 premium entities are available from bundle
                    available = window.BluePulsingOrbEntity && window.YellowSpinningDiscEntity && 
                               window.RedSirenEntity && window.DancingOrbsEntity && window.FlashingCubeEntity;
                    break;
                case 6:
                    // Check if Level 6 premium entities are available from bundle
                    available = window.RedBouncingBallEntity && window.BlueSphereEntity && 
                               window.GoldenOrbEntity && window.RainbowBallEntity && window.MegaSphereEntity;
                    break;
                case 7:
                    // Check if Level 7 premium entities are available from bundle
                    available = window.ScoutUFOEntity && window.WarshipUFOEntity && 
                               window.MothershipUFOEntity && window.CloakedUFOEntity && window.SwarmCommanderUFOEntity;
                    break;
                default:
                    console.log(`No special entities for level ${level}`);
                    return;
            }
            
            if (available) {
                // console.log(`🎮 Level ${level} entity collection available from bundle`);
                this.levelCollections.set(level, true);
                this.verifyLevelEntities(level);
            } else {
                console.warn(`⚠️ Level ${level} entities not yet available in bundle`);
            }
            
        } catch (error) {
            console.error(`❌ Error checking Level ${level} entities:`, error);
        }
    }
    
    /**
     * Verify that level entities are available
     */
    verifyLevelEntities(level) {
        const levelEntityChecks = {
            2: ['RabbitEntity', 'SquirrelEntity', 'OwlEntity', 'DeerEntity', 'FoxEntity'],
            3: ['DragonEntity', 'PhoenixEntity', 'UnicornEntity', 'GriffinEntity', 'PegasusEntity'],
            4: ['BlackSpiderEntity', 'PrayingMantisEntity', 'HouseflyEntity', 'ButterflyEntity', 'LadybugEntity'],
            5: ['BluePulsingOrbEntity', 'YellowSpinningDiscEntity', 'RedSirenEntity', 'DancingOrbsEntity', 'FlashingCubeEntity'],
            6: ['RedBouncingBallEntity', 'BlueSphereEntity', 'GoldenOrbEntity', 'RainbowBallEntity', 'MegaSphereEntity'],
            7: ['ScoutUFOEntity', 'WarshipUFOEntity', 'MothershipUFOEntity', 'CloakedUFOEntity', 'SwarmCommanderUFOEntity']
        };
        
        if (levelEntityChecks[level]) {
            const entities = levelEntityChecks[level];
            const available = entities.filter(entityName => window[entityName]);
            console.log(`🎮 Level ${level} entities available: ${available.join(', ')}`);
            
            if (available.length !== entities.length) {
                const missing = entities.filter(entityName => !window[entityName]);
                console.warn(`⚠️ Missing Level ${level} entities: ${missing.join(', ')}`);
            }
        }
    }
    
    /**
     * Get entity collection for spawning based on current level
     */
    getEntityCollectionForLevel(level = null) {
        const targetLevel = level || this.currentLevel;
        
        const collections = {
            1: [
                { type: 'blimp', weight: 1.0 },
                { type: 'airplane', weight: 1.0 },
                { type: 'dog', weight: 1.0 },
                { type: 'ufo', weight: 1.0 },
                { type: 'bird', weight: 1.0 },
                { type: 'frog', weight: 1.0 }
            ],
            2: [
                { type: 'rabbit', weight: 1.0 },
                { type: 'squirrel', weight: 1.0 },
                { type: 'owl', weight: 1.0 },
                { type: 'deer', weight: 1.0 },
                { type: 'fox', weight: 1.0 }
            ],
            3: [
                { type: 'dragon', weight: 1.0 },
                { type: 'phoenix', weight: 1.0 },
                { type: 'unicorn', weight: 1.0 },
                { type: 'griffin', weight: 1.0 },
                { type: 'pegasus', weight: 1.0 }
            ],
            4: [
                { type: 'spider', weight: 1.0 },
                { type: 'mantis', weight: 1.0 },
                { type: 'housefly', weight: 1.0 },
                { type: 'butterfly', weight: 1.0 },
                { type: 'ladybug', weight: 1.0 }
            ],
            5: [
                { type: 'blue_orb', weight: 1.0 },
                { type: 'yellow_disc', weight: 1.0 },
                { type: 'red_siren', weight: 1.0 },
                { type: 'dancing_orbs', weight: 1.0 },
                { type: 'flashing_cube', weight: 1.0 }
            ],
            6: [
                { type: 'red_ball', weight: 1.0 },
                { type: 'blue_sphere', weight: 1.0 },
                { type: 'golden_orb', weight: 1.0 },
                { type: 'rainbow_ball', weight: 1.0 },
                { type: 'mega_sphere', weight: 1.0 }
            ],
            7: [
                { type: 'scout_ufo', weight: 1.0 },
                { type: 'warship_ufo', weight: 1.0 },
                { type: 'mothership_ufo', weight: 1.0 },
                { type: 'cloaked_ufo', weight: 1.0 },
                { type: 'swarm_commander', weight: 1.0 }
            ]
        };
        
        return collections[targetLevel] || collections[1];
    }
    
    /**
     * Pre-load entity collections for higher levels (optional performance optimization)
     */
    preloadEntityCollections() {
        // Pre-load Level 2 entities (woodland creatures)
        setTimeout(() => {
            this.loadEntityCollectionForLevel(2);
        }, 2000); // Load after 2 seconds
        
        // Pre-load Level 3 entities (mythical creatures)
        setTimeout(() => {
            this.loadEntityCollectionForLevel(3);
        }, 5000); // Load after 5 seconds
        
        // Pre-load premium levels if available
        setTimeout(() => {
            this.loadEntityCollectionForLevel(4); // Insect Safari
        }, 8000); // Load after 8 seconds
        
        setTimeout(() => {
            this.loadEntityCollectionForLevel(5); // Glowing Objects
        }, 11000); // Load after 11 seconds
        
        setTimeout(() => {
            this.loadEntityCollectionForLevel(6); // Bouncing Balls Bonanza
        }, 14000); // Load after 14 seconds
        
        setTimeout(() => {
            this.loadEntityCollectionForLevel(7); // UFO Invasion
        }, 17000); // Load after 17 seconds
        
        console.log('🎮 Pre-loading advanced entity collections (including premium)...');
    }
    
    /**
     * Setup mouse/touch event listeners for entity interaction
     */
    setupEventListeners() {
        const canvas = this.renderer.domElement;
        
        // Mouse events
        canvas.addEventListener('click', (event) => this.handleClick(event));
        canvas.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        
        // Touch events for mobile
        canvas.addEventListener('touchend', (event) => {
            event.preventDefault();
            this.handleClick(event.changedTouches[0]);
        });
        
        console.log('🎮 Entity interaction events registered');
    }
    
    // NOTE: createScoreUI() method moved to EntityUIManager

    // NOTE: setupScoreDisplayInteraction() method moved to EntityUIManager
    
    // NOTE: createFullScoreboard() method moved to EntityUIManager

    // NOTE: showFullScoreboard() method moved to EntityUIManager

    // NOTE: hideFullScoreboard() method moved to EntityUIManager
    
    // NOTE: updateScoreUI() method moved to EntityUIManager
    
    /**
     * Handle mouse/touch click on entities
     */
    handleClick(event) {
        // Convert to normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Raycast to find clicked entities
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const clickableObjects = [];
        this.activeEntities.forEach(entity => {
            if (entity.clickable && entity.mesh) {
                entity.mesh.traverse(child => {
                    if (child.isMesh) clickableObjects.push(child);
                });
            }
        });
        
        const intersects = this.raycaster.intersectObjects(clickableObjects);
        
        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            const entity = this.findEntityByMesh(hitObject);
            if (entity && entity.clickable) {
                this.handleEntityClick(entity);
            }
        }
    }
    
    /**
     * Handle mouse movement for hover effects
     */
    handleMouseMove(event) {
        // Convert to normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Raycast for hover detection
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const clickableObjects = [];
        this.activeEntities.forEach(entity => {
            if (entity.clickable && entity.mesh) {
                entity.mesh.traverse(child => {
                    if (child.isMesh) clickableObjects.push(child);
                });
            }
        });
        
        const intersects = this.raycaster.intersectObjects(clickableObjects);
        
        // Update hover states
        this.activeEntities.forEach(entity => {
            if (entity.clickable) {
                const isHovered = intersects.some(intersect => 
                    this.findEntityByMesh(intersect.object) === entity
                );
                this.updateEntityHoverState(entity, isHovered);
            }
        });
    }
    
    /**
     * Find entity that owns a specific mesh
     */
    findEntityByMesh(mesh) {
        // Check gaming entities first
        for (let entity of this.activeEntities.values()) {
            if (entity.mesh && this.meshBelongsToEntity(mesh, entity.mesh)) {
                return entity;
            }
        }
        
        // Check promotional entities
        for (let promoEntity of this.promotionalEntities.values()) {
            if (promoEntity.mesh && this.meshBelongsToEntity(mesh, promoEntity.mesh)) {
                return promoEntity;
            }
        }
        
        return null;
    }
    
    /**
     * Check if mesh belongs to entity group
     */
    meshBelongsToEntity(mesh, entityMesh) {
        if (mesh === entityMesh) return true;
        
        let parent = mesh.parent;
        while (parent) {
            if (parent === entityMesh) return true;
            parent = parent.parent;
        }
        return false;
    }
    
    /**
     * Handle successful entity click
     */
    handleEntityClick(entity) {
        // Check if this is a promotional entity (no points, opens subscription)
        if (entity.isPromotional) {
            this.handlePromotionalEntityClick(entity);
            return;
        }
        
        if (!entity.clickable || entity.session.clickCount >= this.sessionClickLimit) {
            return;
        }
        
        // Award points
        const points = this.pointLevels[entity.type] || 100;
        this.totalPoints += points;
        entity.session.clickCount++;
        
        // Update session stats
        this.sessionStats.currentSessionClicks++;
        this.sessionStats.totalClicks++;
        if (!this.sessionStats.entitiesClicked[entity.type]) {
            this.sessionStats.entitiesClicked[entity.type] = 0;
        }
        this.sessionStats.entitiesClicked[entity.type]++;
        
        // Visual feedback
        this.showClickFeedback(entity, points);
        this.updatePointsDisplay();
        this.updateUIManagerData(); // Update UI manager with latest data
        this.uiManager.updateScoreUI(); // Update the UI
        
        // Trigger entity-specific click animation
        if (entity.entityInstance && entity.entityInstance.animateClick) {
            entity.entityInstance.animateClick();
        }
        
        // Audio feedback (optional)
        this.playClickSound(entity.type);
        
        // console.log(`🎮 ${entity.type} clicked! +${points} points (Total: ${this.totalPoints})`);
        
        // Check if session is complete
        if (entity.session.clickCount >= this.sessionClickLimit) {
            entity.clickable = false;
            this.updateEntityHoverState(entity, false);
            this.sessionStats.sessionsCompleted++;
            this.sessionStats.currentSessionClicks = 0; // Reset for next session
            // console.log(`🎮 Session complete for ${entity.type} (${this.sessionClickLimit} clicks)`);
        }
        
        // Sync points with Flutter
        this.syncPointsWithFlutter();
    }
    
    /**
     * Show visual feedback for successful click
     */
    showClickFeedback(entity, points) {
        try {
            const clickPosition = entity.mesh.position.clone();
            
            // console.log(`🎮 VISUAL FEEDBACK: Starting feedback for ${entity.type} at position`, clickPosition);
            
            // 1. Create floating score text
            this.createFloatingText(`+${points}`, clickPosition, entity.type);
            // console.log(`🎮 VISUAL FEEDBACK: Floating text created`);
            
            // 2. Create particle burst
            this.createParticleBurst(clickPosition, entity.type);
            // console.log(`🎮 VISUAL FEEDBACK: Particle burst created`);
            
            // 3. Entity color flash and scale animation
            this.animateEntityClick(entity);
            // console.log(`🎮 VISUAL FEEDBACK: Entity animation triggered`);
            
            // 4. Play sound effect
            this.playClickSound(entity.type, points);
            // console.log(`🎮 VISUAL FEEDBACK: Sound played successfully`);
            
        } catch (error) {
            console.error('🎮 ERROR in showClickFeedback:', error);
            // Don't let visual feedback errors break the game
        }
    }
    
    /**
     * Create floating text that rises and fades (like mobile games)
     */
    createFloatingText(text, worldPosition, entityType) {
        // Convert world position to screen coordinates
        const screenPosition = new THREE.Vector3();
        screenPosition.copy(worldPosition);
        screenPosition.project(this.camera);
        
        // Convert to pixel coordinates
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const x = (screenPosition.x * 0.5 + 0.5) * rect.width + rect.left;
        const y = (screenPosition.y * -0.5 + 0.5) * rect.height + rect.top;
        
        // Create floating text element
        const floatingText = document.createElement('div');
        floatingText.textContent = text;
        floatingText.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            color: ${this.getEntityColor(entityType)};
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            pointer-events: none;
            z-index: 10000;
            transform: translate(-50%, -50%);
            animation: floatScore 2s ease-out forwards;
        `;
        
        // Add CSS animation keyframes if not already added
        if (!document.getElementById('floatingScoreStyles')) {
            const style = document.createElement('style');
            style.id = 'floatingScoreStyles';
            style.textContent = `
                @keyframes floatScore {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    20% {
                        transform: translate(-50%, -50%) scale(1.3);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -150px) scale(0.8);
                    }
                }
                @keyframes particlePop {
                    0% {
                        opacity: 1;
                        transform: scale(0) rotate(0deg);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1) rotate(180deg);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(0.5) rotate(360deg);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(floatingText);
        
        // Remove element after animation
        setTimeout(() => {
            if (floatingText.parentNode) {
                floatingText.parentNode.removeChild(floatingText);
            }
        }, 2000);
    }
    
    /**
     * Create particle burst effect at click point
     */
    createParticleBurst(worldPosition, entityType) {
        const particleCount = 8;
        const particleGeometry = new THREE.SphereGeometry(0.1, 6, 4);
        const particleColor = this.getEntityColorHex(entityType);
        
        for (let i = 0; i < particleCount; i++) {
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: particleColor,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Start at click position
            particle.position.copy(worldPosition);
            
            // Random burst direction
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 0.3 + Math.random() * 0.2;
            const direction = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.random() * 0.5 + 0.2,
                Math.sin(angle) * speed
            );
            
            this.scene.add(particle);
            
            // Animate particle
            const startTime = Date.now();
            const duration = 800;
            
            const animateParticle = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;
                
                if (progress < 1) {
                    // Move particle
                    particle.position.add(direction);
                    direction.y -= 0.01; // Gravity
                    direction.multiplyScalar(0.98); // Air resistance
                    
                    // Fade out
                    particle.material.opacity = 0.8 * (1 - progress);
                    
                    requestAnimationFrame(animateParticle);
                } else {
                    // Remove particle
                    this.scene.remove(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                }
            };
            
            animateParticle();
        }
    }
    
    /**
     * Get entity-specific color for effects
     */
    getEntityColor(entityType) {
        const colors = {
            blimp: '#4169E1',    // Blue
            airplane: '#DC143C',  // Red
            dog: '#8B4513',      // Brown
            ufo: '#C0C0C0',      // Silver
            bird: '#4A4A4A'      // Gray
        };
        return colors[entityType] || '#00FF00';
    }
    
    /**
     * Get entity-specific color as hex for THREE.js
     */
    getEntityColorHex(entityType) {
        const colors = {
            blimp: 0x4169E1,
            airplane: 0xDC143C,
            dog: 0x8B4513,
            ufo: 0xC0C0C0,
            bird: 0x4A4A4A
        };
        return colors[entityType] || 0x00FF00;
    }
    
    /**
     * Enhanced entity click animation with color flash
     */
    animateEntityClick(entity) {
        if (!entity.mesh) return;
        
        const originalScale = entity.mesh.scale.clone();
        const duration = 400;
        const startTime = Date.now();
        
        // Store original materials for color flash
        const originalMaterials = new Map();
        entity.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                originalMaterials.set(child, {
                    color: child.material.color ? child.material.color.clone() : null,
                    emissive: child.material.emissive ? child.material.emissive.clone() : null
                });
            }
        });
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale animation (more dramatic)
            if (progress < 0.3) {
                // Quick scale up
                const factor = 1 + (0.5 * (progress / 0.3));
                entity.mesh.scale.copy(originalScale).multiplyScalar(factor);
            } else {
                // Scale back down with bounce
                const bounceProgress = (progress - 0.3) / 0.7;
                const factor = 1.5 - 0.5 * bounceProgress;
                entity.mesh.scale.copy(originalScale).multiplyScalar(factor);
            }
            
            // Color flash effect
            const flashIntensity = progress < 0.2 ? (1 - progress / 0.2) : 0;
            entity.mesh.traverse(child => {
                if (child.isMesh && child.material && originalMaterials.has(child)) {
                    const original = originalMaterials.get(child);
                    
                    // Bright white flash
                    if (original.color && flashIntensity > 0) {
                        const flashColor = new THREE.Color(0xFFFFFF);
                        child.material.color.lerpColors(original.color, flashColor, flashIntensity);
                    }
                    
                    // Emissive glow
                    if (child.material.emissive) {
                        const glowColor = new THREE.Color(0x444444);
                        if (original.emissive) {
                            child.material.emissive.lerpColors(original.emissive, glowColor, flashIntensity);
                        } else {
                            child.material.emissive.lerpColors(new THREE.Color(0x000000), glowColor, flashIntensity);
                        }
                    }
                }
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Restore original scale and colors
                entity.mesh.scale.copy(originalScale);
                originalMaterials.forEach((original, child) => {
                    if (original.color) child.material.color.copy(original.color);
                    if (original.emissive) child.material.emissive.copy(original.emissive);
                });
            }
        };
        
        animate();
    }
    
    /**
     * Play click sound based on entity type and points
     */
    playClickSound(entityType, points) {
        // Create audio context if not exists
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Different frequencies for different entity levels
        const frequencies = {
            blimp: 261.63,    // C4 - Low pitch for Level 1
            airplane: 329.63, // E4 - Medium-low for Level 2
            dog: 392.00,      // G4 - Medium for Level 3
            ufo: 523.25,      // C5 - Medium-high for Level 4
            bird: 659.25      // E5 - High pitch for Level 5
        };
        
        const frequency = frequencies[entityType] || 440;
        
        // Create oscillator for the "ding" sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Bell-like sound with harmonic
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 2, this.audioContext.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(frequency, this.audioContext.currentTime + 0.3);
        
        // Volume envelope for pleasant ding
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        // Play the sound
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
        
        // Add a second harmonic for richer sound
        setTimeout(() => {
            const harmonic = this.audioContext.createOscillator();
            const harmonicGain = this.audioContext.createGain();
            
            harmonic.connect(harmonicGain);
            harmonicGain.connect(this.audioContext.destination);
            
            harmonic.type = 'sine';
            harmonic.frequency.setValueAtTime(frequency * 1.5, this.audioContext.currentTime);
            
            harmonicGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            harmonicGain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
            harmonicGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            harmonic.start(this.audioContext.currentTime);
            harmonic.stop(this.audioContext.currentTime + 0.3);
        }, 50);
        
        console.log(`🔊 Playing ${entityType} click sound (${frequency}Hz) for ${points} points`);
    }
    
    /**
     * Update entity hover state (simple glow effect)
     */
    updateEntityHoverState(entity, isHovered) {
        if (!entity.mesh) return;
        
        entity.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                if (isHovered && entity.clickable) {
                    // Simple glow effect - slightly brighten material
                    if (!child.userData.originalEmissive) {
                        child.userData.originalEmissive = child.material.emissive ? 
                            child.material.emissive.clone() : new THREE.Color(0x000000);
                    }
                    child.material.emissive = new THREE.Color(0x222222); // Subtle glow
                } else {
                    // Restore original emissive
                    if (child.userData.originalEmissive) {
                        child.material.emissive = child.userData.originalEmissive;
                    }
                }
            }
        });
    }
    
    /**
     * Update UI Manager with current data
     */
    updateUIManagerData() {
        if (this.uiManager) {
            this.uiManager.updateData({
                totalPoints: this.totalPoints,
                sessionStats: this.sessionStats,
                currentLevel: this.currentLevel,
                gamePlayPaused: this.gamePlayPaused,
                activeSessions: this.activeSessions,
                activeEntities: this.activeEntities,
                nextSpawnTime: this.nextSpawnTime,
                hasShownPremiumPopup: this.hasShownPremiumPopup
            });
        }
    }
    
    /**
     * Update points display in UI
     */
    updatePointsDisplay() {
        // This will integrate with the UI system
        console.log(`🎮 Total Points: ${this.totalPoints}`);
    }
    
    /**
     * Sync points with Flutter app
     */
    syncPointsWithFlutter() {
        // Send points to Flutter via existing bridge
        if (window.flutterChannel) {
            window.flutterChannel.postMessage({
                type: 'updatePoints',
                points: this.totalPoints
            });
        }
    }
    
    /**
     * Main update loop - check for spawning and update entities
     */
    startUpdateLoop() {
        const update = () => {
            try {
                this.updateEntities();
                this.checkSpawning();
                this.checkPromotionalSpawning(); // Check for promotional entities
                
                // Update treasure boxes if manager is available
                if (this.app.treasureBoxManager && typeof this.app.treasureBoxManager.update === 'function') {
                    this.app.treasureBoxManager.update();
                }
                
                // Update UI every few frames
                if (!this.uiUpdateCounter) this.uiUpdateCounter = 0;
                this.uiUpdateCounter++;
                if (this.uiUpdateCounter % 30 === 0) { // Update UI every 30 frames (~0.5 seconds)
                    this.updateUIManagerData();
                    this.uiManager.updateScoreUI();
                }
            } catch (error) {
                console.error('🎮 ERROR in update loop:', error);
                // Don't let errors break the update loop
            }
            
            requestAnimationFrame(update);
        };
        update();
    }
    
    /**
     * Update all active entities (movement, animations)
     */
    updateEntities() {
        const currentTime = Date.now();
        const entitiesToRemove = [];
        
        this.activeEntities.forEach((entity, id) => {
            if (entity.update) {
                entity.update(currentTime);
            }
            
            // Check if entity should be removed (collect for later removal)
            if (entity.entityInstance && entity.entityInstance.shouldBeRemoved && entity.entityInstance.shouldBeRemoved()) {
                entitiesToRemove.push(id);
            }
            
            // Check entity lifetime - remove if expired
            if (entity.session && entity.session.startTime) {
                const entityAge = currentTime - entity.session.startTime;
                const maxLifetime = this.getEntityLifetime(entity.type);
                if (entityAge > maxLifetime) {
                    console.log(`🎮 Entity ${entity.type} expired after ${Math.floor(entityAge/1000)}s (max: ${Math.floor(maxLifetime/1000)}s)`);
                    entitiesToRemove.push(id);
                }
            }
            
            // Check if entity is out of bounds
            if (this.isEntityOutOfBounds(entity)) {
                entitiesToRemove.push(id);
            }
        });
        
        
        // Update promotional entities
        const promotionalToRemove = [];
        this.promotionalEntities.forEach((entity, id) => {
            if (entity.update && entity.update()) {
                // Entity returns true when it should be removed
                promotionalToRemove.push(id);
            }
        });
        
        // Remove expired promotional entities
        promotionalToRemove.forEach(id => this.removePromotionalEntity(id));
        // Remove expired and out-of-bounds entities AFTER iteration completes
        entitiesToRemove.forEach(id => this.removeEntity(id));
    }
    
    /**
     * Get lifetime for specific entity type
     */
    getEntityLifetime(entityType) {
        const lifetimes = {
            // Level 1 entities
            blimp: 15 * 1000,    // 15 seconds
            airplane: 12 * 1000, // 12 seconds  
            dog: 5 * 1000,       // 5 seconds - SHORT for testing
            ufo: 8 * 1000,       // 8 seconds
            bird: 6 * 1000,      // 6 seconds
            
            // Level 2 entities (woodland creatures)
            rabbit: 25 * 1000,   // 25 seconds
            squirrel: 22 * 1000, // 22 seconds
            owl: 20 * 1000,      // 20 seconds
            deer: 18 * 1000,     // 18 seconds
            fox: 15 * 1000,      // 15 seconds
            
            // Level 6 entities (bouncing balls)
            red_ball: 20 * 1000,    // 20 seconds
            blue_sphere: 18 * 1000, // 18 seconds
            golden_orb: 22 * 1000,  // 22 seconds
            rainbow_ball: 25 * 1000, // 25 seconds
            mega_sphere: 30 * 1000,  // 30 seconds
            
            // Level 7 entities (UFO invasion)
            scout_ufo: 15 * 1000,        // 15 seconds
            warship_ufo: 18 * 1000,      // 18 seconds
            mothership_ufo: 25 * 1000,   // 25 seconds
            cloaked_ufo: 20 * 1000,      // 20 seconds
            swarm_commander: 30 * 1000   // 30 seconds
        };
        return lifetimes[entityType] || 10 * 1000; // Default 10 seconds
    }
    
    /**
     * Check if entity is out of the viewable area
     */
    isEntityOutOfBounds(entity) {
        if (!entity.mesh) return false;
        
        const position = entity.mesh.position;
        const bounds = 100; // Generous bounds around world
        
        return Math.abs(position.x) > bounds || 
               Math.abs(position.z) > bounds || 
               position.y > bounds || 
               position.y < -10;
    }
    
    /**
     * Check if it's time to spawn new entities
     */
    checkSpawning() {
        // Don't spawn new entities if game play is paused
        if (this.gamePlayPaused) {
            return;
        }
        
        const currentTime = Date.now();
        const timeUntilSpawn = Math.max(0, this.nextSpawnTime - currentTime);
        
        // Debug logging enabled temporarily for troubleshooting
        if (!this._lastLogTime || currentTime - this._lastLogTime > 10000) {
            console.log(`🎮 Entity spawn check: ${Math.floor(timeUntilSpawn/1000)}s until next spawn, ${this.activeSessions.size}/${this.maxConcurrentSessions} active sessions, level ${this.currentLevel}`);
            this._lastLogTime = currentTime;
        }
        
        // Level-specific concurrent session limits
        let maxConcurrentForLevel = this.maxConcurrentSessions;
        if (this.currentLevel >= 13) { // Level 6 and 7 (premium levels)
            maxConcurrentForLevel = 1; // Only 1 concurrent session for complex premium entities
            console.log(`🎮 Premium level ${this.currentLevel}: limiting to ${maxConcurrentForLevel} concurrent session`);
        }
        
        if (currentTime >= this.nextSpawnTime && 
            this.activeSessions.size < maxConcurrentForLevel) {
            
            console.log(`🎮 SPAWNING ENTITY NOW! (Level ${this.currentLevel}, ${this.activeSessions.size}/${maxConcurrentForLevel} sessions)`);
            this.spawnRandomEntity();
            this.nextSpawnTime = this.calculateNextSpawnTime();
            console.log(`🎮 Next spawn in ${Math.floor((this.nextSpawnTime - currentTime)/1000)} seconds`);
        }
    }
    
    /**
     * Spawn a random entity type with weighted probabilities based on current level
     */
    spawnRandomEntity() {
        // Check for level progression first
        this.checkLevelProgression();
        
        // Get appropriate entity collection for current level
        const entityWeights = this.getEntityCollectionForLevel();
        console.log(`🎮 DEBUG: Current level ${this.currentLevel}, entity weights:`, entityWeights);

        // Calculate total weight
        const totalWeight = entityWeights.reduce((sum, item) => sum + item.weight, 0);

        // Random selection based on weights
        let random = Math.random() * totalWeight;
        let selectedType = entityWeights[0].type; // fallback to first entity
        
        for (const item of entityWeights) {
            random -= item.weight;
            if (random <= 0) {
                selectedType = item.type;
                break;
            }
        }

        console.log(`🎮 Level ${this.currentLevel}: Spawning ${selectedType} entity...`);
        console.log(`🎮 Total points: ${this.totalPoints}, selected from:`, entityWeights.map(e => e.type));
        
        try {
            // Level 1 entities (original)
            if (this.currentLevel === 1) {
                switch (selectedType) {
                    case 'blimp':
                        this.spawnBlimp();
                        break;
                    case 'airplane':
                        this.spawnAirplane();
                        break;
                    case 'dog':
                        this.spawnDog();
                        break;
                    case 'ufo':
                        this.spawnUFO();
                        break;
                    case 'bird':
                        this.spawnBird();
                        break;
                    case 'frog':
                        this.spawnFrog();
                        break;
                }
            }
            // Level 2 entities (woodland creatures)
            else if (this.currentLevel === 2) {
                this.spawnLevelEntity(selectedType, 2);
            }
            // Level 3 entities (mythical creatures)
            else if (this.currentLevel === 3) {
                this.spawnLevelEntity(selectedType, 3);
            }
            // Level 4 entities (insect safari - premium)
            else if (this.currentLevel === 4) {
                this.spawnLevelEntity(selectedType, 4);
            }
            // Level 5 entities (glowing objects - premium)
            else if (this.currentLevel === 5) {
                this.spawnLevelEntity(selectedType, 5);
            }
            // Level 6 entities (bouncing balls bonanza - premium)
            else if (this.currentLevel === 6) {
                this.spawnLevelEntity(selectedType, 6);
            }
            // Level 7 entities (UFO invasion - premium)
            else if (this.currentLevel === 7) {
                this.spawnLevelEntity(selectedType, 7);
            }
            
            // console.log(`🎮 SUCCESS: Level ${this.currentLevel} ${selectedType} entity spawned successfully`);
            // console.log(`🎮 Current active sessions: ${this.activeSessions.size}/${this.maxConcurrentSessions}`);
        } catch (error) {
            console.error(`🎮 ERROR spawning ${selectedType}:`, error);
        }
    }
    
    /**
     * Spawn level-specific entity (Level 2 or 3)
     */
    spawnLevelEntity(entityType, level) {
        const id = `${entityType}_${Date.now()}`;
        const session = {
            id: id,
            clickCount: 0,
            startTime: Date.now()
        };
        
        let entityInstance = null;
        
        // Level 2 entities
        if (level === 2) {
            // console.log(`🎮 Level 2: Attempting to spawn ${entityType}...`);
            // console.log(`🎮 Entity classes available: RabbitEntity=${!!window.RabbitEntity}, SquirrelEntity=${!!window.SquirrelEntity}, OwlEntity=${!!window.OwlEntity}, DeerEntity=${!!window.DeerEntity}, FoxEntity=${!!window.FoxEntity}`);
            
            switch (entityType) {
                case 'rabbit':
                    if (window.RabbitEntity) {
                        entityInstance = new window.RabbitEntity(this.scene);
                        // console.log(`🎮 Level 2 rabbit entity created successfully`);
                    } else {
                        console.warn(`⚠️ RabbitEntity not available for spawning`);
                    }
                    break;
                case 'squirrel':
                    if (window.SquirrelEntity) {
                        try {
                            entityInstance = new window.SquirrelEntity(this.scene);
                            // console.log(`🎮 Level 2 squirrel entity created successfully`);
                        } catch (error) {
                            console.error(`❌ Error creating SquirrelEntity:`, error);
                            console.error(`❌ SquirrelEntity constructor:`, window.SquirrelEntity);
                        }
                    } else {
                        console.warn(`⚠️ SquirrelEntity not available for spawning`);
                    }
                    break;
                case 'owl':
                    if (window.OwlEntity) {
                        try {
                            entityInstance = new window.OwlEntity(this.scene);
                            // console.log(`🎮 Level 2 owl entity created successfully`);
                        } catch (error) {
                            console.error(`❌ Error creating OwlEntity:`, error);
                            console.error(`❌ OwlEntity constructor:`, window.OwlEntity);
                        }
                    } else {
                        console.warn(`⚠️ OwlEntity not available for spawning`);
                    }
                    break;
                case 'deer':
                    if (window.DeerEntity) {
                        entityInstance = new window.DeerEntity(this.scene);
                        // console.log(`🎮 Level 2 deer entity created successfully`);
                    } else {
                        console.warn(`⚠️ DeerEntity not available for spawning`);
                    }
                    break;
                case 'fox':
                    if (window.FoxEntity) {
                        try {
                            entityInstance = new window.FoxEntity(this.scene);
                            // console.log(`🎮 Level 2 fox entity created successfully`);
                        } catch (error) {
                            console.error(`❌ Error creating FoxEntity:`, error);
                            console.error(`❌ FoxEntity constructor:`, window.FoxEntity);
                        }
                    } else {
                        console.warn(`⚠️ FoxEntity not available for spawning`);
                    }
                    break;
            }
        }
        // Level 3 entities
        else if (level === 3) {
            switch (entityType) {
                case 'dragon':
                    if (window.DragonEntity) {
                        entityInstance = new window.DragonEntity(this.scene);
                    }
                    break;
                case 'phoenix':
                    if (window.PhoenixEntity) {
                        entityInstance = new window.PhoenixEntity(this.scene);
                    }
                    break;
                case 'unicorn':
                    if (window.UnicornEntity) {
                        entityInstance = new window.UnicornEntity(this.scene);
                    }
                    break;
                case 'griffin':
                    if (window.GriffinEntity) {
                        entityInstance = new window.GriffinEntity(this.scene);
                    }
                    break;
                case 'pegasus':
                    if (window.PegasusEntity) {
                        entityInstance = new window.PegasusEntity(this.scene);
                    }
                    break;
            }
        }
        // Level 4 entities (Insect Safari - Premium)
        else if (level === 4) {
            // console.log(`🎮 Level 4: Attempting to spawn premium ${entityType}...`);
            switch (entityType) {
                case 'spider':
                    if (window.BlackSpiderEntity) {
                        entityInstance = new window.BlackSpiderEntity(this.scene);
                        // console.log(`🎮 Level 4 spider entity created successfully`);
                    } else {
                        console.warn(`⚠️ BlackSpiderEntity not available for spawning`);
                    }
                    break;
                case 'mantis':
                    if (window.PrayingMantisEntity) {
                        entityInstance = new window.PrayingMantisEntity(this.scene);
                        // console.log(`🎮 Level 4 mantis entity created successfully`);
                    } else {
                        console.warn(`⚠️ PrayingMantisEntity not available for spawning`);
                    }
                    break;
                case 'housefly':
                    if (window.HouseflyEntity) {
                        entityInstance = new window.HouseflyEntity(this.scene);
                        // console.log(`🎮 Level 4 housefly entity created successfully`);
                    } else {
                        console.warn(`⚠️ HouseflyEntity not available for spawning`);
                    }
                    break;
                case 'butterfly':
                    if (window.ButterflyEntity) {
                        entityInstance = new window.ButterflyEntity(this.scene);
                        // console.log(`🎮 Level 4 butterfly entity created successfully`);
                    } else {
                        console.warn(`⚠️ ButterflyEntity not available for spawning`);
                    }
                    break;
                case 'ladybug':
                    if (window.LadybugEntity) {
                        entityInstance = new window.LadybugEntity(this.scene);
                        // console.log(`🎮 Level 4 ladybug entity created successfully`);
                    } else {
                        console.warn(`⚠️ LadybugEntity not available for spawning`);
                    }
                    break;
            }
        }
        // Level 5 entities (Glowing Objects - Premium)
        else if (level === 5) {
            // console.log(`🎮 Level 5: Attempting to spawn premium glowing ${entityType}...`);
            switch (entityType) {
                case 'blue_orb':
                    if (window.BluePulsingOrbEntity) {
                        entityInstance = new window.BluePulsingOrbEntity(this.scene);
                        // console.log(`🎮 Level 5 blue orb entity created successfully`);
                    } else {
                        console.warn(`⚠️ BluePulsingOrbEntity not available for spawning`);
                    }
                    break;
                case 'yellow_disc':
                    if (window.YellowSpinningDiscEntity) {
                        entityInstance = new window.YellowSpinningDiscEntity(this.scene);
                        // console.log(`🎮 Level 5 yellow disc entity created successfully`);
                    } else {
                        console.warn(`⚠️ YellowSpinningDiscEntity not available for spawning`);
                    }
                    break;
                case 'red_siren':
                    if (window.RedSirenEntity) {
                        entityInstance = new window.RedSirenEntity(this.scene);
                        // console.log(`🎮 Level 5 red siren entity created successfully`);
                    } else {
                        console.warn(`⚠️ RedSirenEntity not available for spawning`);
                    }
                    break;
                case 'dancing_orbs':
                    if (window.DancingOrbsEntity) {
                        entityInstance = new window.DancingOrbsEntity(this.scene);
                        // console.log(`🎮 Level 5 dancing orbs entity created successfully`);
                    } else {
                        console.warn(`⚠️ DancingOrbsEntity not available for spawning`);
                    }
                    break;
                case 'flashing_cube':
                    if (window.FlashingCubeEntity) {
                        entityInstance = new window.FlashingCubeEntity(this.scene);
                        // console.log(`🎮 Level 5 flashing cube entity created successfully`);
                    } else {
                        console.warn(`⚠️ FlashingCubeEntity not available for spawning`);
                    }
                    break;
            }
        }
        // Level 6 entities (Bouncing Balls Bonanza - Premium)
        else if (level === 6) {
            // console.log(`🎮 Level 6: Attempting to spawn premium bouncing ${entityType}...`);
            switch (entityType) {
                case 'red_ball':
                    if (window.RedBouncingBallEntity) {
                        entityInstance = new window.RedBouncingBallEntity(this.scene);
                        // console.log(`🎮 Level 6 red bouncing ball entity created successfully`);
                    } else {
                        console.warn(`⚠️ RedBouncingBallEntity not available for spawning`);
                    }
                    break;
                case 'blue_sphere':
                    if (window.BlueSphereEntity) {
                        entityInstance = new window.BlueSphereEntity(this.scene);
                        // console.log(`🎮 Level 6 blue sphere entity created successfully`);
                    } else {
                        console.warn(`⚠️ BlueSphereEntity not available for spawning`);
                    }
                    break;
                case 'golden_orb':
                    if (window.GoldenOrbEntity) {
                        entityInstance = new window.GoldenOrbEntity(this.scene);
                        // console.log(`🎮 Level 6 golden orb entity created successfully`);
                    } else {
                        console.warn(`⚠️ GoldenOrbEntity not available for spawning`);
                    }
                    break;
                case 'rainbow_ball':
                    if (window.RainbowBallEntity) {
                        entityInstance = new window.RainbowBallEntity(this.scene);
                        // console.log(`🎮 Level 6 rainbow ball entity created successfully`);
                    } else {
                        console.warn(`⚠️ RainbowBallEntity not available for spawning`);
                    }
                    break;
                case 'mega_sphere':
                    if (window.MegaSphereEntity) {
                        entityInstance = new window.MegaSphereEntity(this.scene);
                        // console.log(`🎮 Level 6 mega sphere entity created successfully`);
                    } else {
                        console.warn(`⚠️ MegaSphereEntity not available for spawning`);
                    }
                    break;
            }
        }
        // Level 7 entities (UFO Invasion - Premium)
        else if (level === 7) {
            // console.log(`🎮 Level 7: Attempting to spawn premium UFO ${entityType}...`);
            switch (entityType) {
                case 'scout_ufo':
                    if (window.ScoutUFOEntity) {
                        entityInstance = new window.ScoutUFOEntity(this.scene);
                        // console.log(`🎮 Level 7 scout UFO entity created successfully`);
                    } else {
                        console.warn(`⚠️ ScoutUFOEntity not available for spawning`);
                    }
                    break;
                case 'warship_ufo':
                    if (window.WarshipUFOEntity) {
                        entityInstance = new window.WarshipUFOEntity(this.scene);
                        // console.log(`🎮 Level 7 warship UFO entity created successfully`);
                    } else {
                        console.warn(`⚠️ WarshipUFOEntity not available for spawning`);
                    }
                    break;
                case 'mothership_ufo':
                    if (window.MothershipUFOEntity) {
                        entityInstance = new window.MothershipUFOEntity(this.scene);
                        // console.log(`🎮 Level 7 mothership UFO entity created successfully`);
                    } else {
                        console.warn(`⚠️ MothershipUFOEntity not available for spawning`);
                    }
                    break;
                case 'cloaked_ufo':
                    if (window.CloakedUFOEntity) {
                        entityInstance = new window.CloakedUFOEntity(this.scene);
                        // console.log(`🎮 Level 7 cloaked UFO entity created successfully`);
                    } else {
                        console.warn(`⚠️ CloakedUFOEntity not available for spawning`);
                    }
                    break;
                case 'swarm_commander':
                    if (window.SwarmCommanderEntity) {
                        entityInstance = new window.SwarmCommanderEntity(this.scene);
                        // console.log(`🎮 Level 7 swarm commander entity created successfully`);
                    } else {
                        console.warn(`⚠️ SwarmCommanderEntity not available for spawning`);
                    }
                    break;
            }
        }
        
        if (entityInstance) {
            // Create proper entity wrapper object following Level 1 pattern
            const entity = {
                id: id,
                type: entityType,
                session: session,
                clickable: true,
                mesh: entityInstance.group, // Use the group from the entity instance
                entityInstance: entityInstance, // Keep reference to the entity
                update: (time) => {
                    if (entityInstance.update) {
                        entityInstance.update(time);
                    }
                    // Note: Entity removal is now handled in updateEntities() after iteration
                }
            };
            
            // Store entity with session management
            this.activeEntities.set(id, entity);
            this.activeSessions.add(session);
            
            // console.log(`🎮 Level ${level} ${entityType} entity created successfully`);
        } else {
            console.error(`❌ Failed to create Level ${level} ${entityType} entity - class not available`);
        }
    }
    
    /**
     * Spawn blimp entity (Level 1 - 100 points)
     */
    spawnBlimp() {
        const id = `blimp_${Date.now()}`;
        const session = {
            id: id,
            clickCount: 0,
            startTime: Date.now()
        };
        
        // Use BlimpEntity class if available, otherwise fallback
        let entity;
        if (window.BlimpEntity) {
            // Use consolidated BlimpEntity with self-management
            const blimpEntity = new window.BlimpEntity(this.scene);
            entity = {
                id: id,
                type: 'blimp',
                session: session,
                clickable: true,
                mesh: blimpEntity.group, // Use the group instead of createMesh()
                entityInstance: blimpEntity, // Keep reference to the entity
                speed: 2,
                direction: blimpEntity.direction.clone(),
                update: (time) => {
                    blimpEntity.update();
                    // Check if entity should be removed
                    if (blimpEntity.shouldBeRemoved()) {
                        this.removeEntity(id);
                    }
                }
            };
            
            // The BlimpEntity already positioned itself and added to scene
            
        } else {
            // Fallback to old system
            const blimpMesh = this.createBlimpMesh();
            entity = {
                id: id,
                type: 'blimp',
                session: session,
                clickable: true,
                mesh: blimpMesh,
                speed: 2,
                direction: new THREE.Vector3(1, 0, 0),
                update: (time) => this.updateBlimpMovement(entity, time)
            };
            
            // Position at edge of world
            entity.mesh.position.set(-50, 15, 0);
            this.scene.add(entity.mesh);
        }
        this.activeEntities.set(id, entity);
        this.activeSessions.add(session);
        
        // console.log('🎮 Blimp spawned - slow horizontal movement, "FirstTaps" billboard');
    }
    
    /**
     * Create blimp mesh with "FirstTaps" billboard
     */
    createBlimpMesh() {
        const group = new THREE.Group();
        
        // Main blimp body (ellipsoid)
        const bodyGeometry = new THREE.SphereGeometry(2, 16, 8);
        bodyGeometry.scale(2, 0.7, 0.7); // Make it blimp-shaped
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 }); // Blue
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);
        
        // Gondola underneath
        const gondolaGeometry = new THREE.BoxGeometry(1, 0.3, 0.4);
        const gondolaMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
        const gondola = new THREE.Mesh(gondolaGeometry, gondolaMaterial);
        gondola.position.set(0, -1, 0);
        group.add(gondola);
        
        // Fins
        const finGeometry = new THREE.BoxGeometry(0.1, 1, 1.5);
        const finMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
        
        const topFin = new THREE.Mesh(finGeometry, finMaterial);
        topFin.position.set(-2, 0.5, 0);
        group.add(topFin);
        
        const sideFin = new THREE.Mesh(finGeometry, finMaterial);
        sideFin.position.set(-2, 0, 0.8);
        sideFin.rotation.y = Math.PI / 2;
        group.add(sideFin);
        
        // Billboard text "FirstTaps" on sides (simplified for now)
        // TODO: Add proper text rendering
        const billboardGeometry = new THREE.PlaneGeometry(3, 0.8);
        const billboardMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            side: THREE.DoubleSide
        });
        
        const leftBillboard = new THREE.Mesh(billboardGeometry, billboardMaterial);
        leftBillboard.position.set(0, 0, 1.5);
        leftBillboard.rotation.y = Math.PI / 2;
        group.add(leftBillboard);
        
        const rightBillboard = new THREE.Mesh(billboardGeometry, billboardMaterial);
        rightBillboard.position.set(0, 0, -1.5);
        rightBillboard.rotation.y = -Math.PI / 2;
        group.add(rightBillboard);
        
        return group;
    }
    
    /**
     * Update blimp movement (straight horizontal)
     */
    updateBlimpMovement(entity, time) {
        const deltaTime = 0.016; // Approximate frame time
        const movement = entity.direction.clone().multiplyScalar(entity.speed * deltaTime);
        entity.mesh.position.add(movement);
    }
    
    /**
     * Spawn airplane entity (Level 2 - 200 points)
     */
    spawnAirplane() {
        const id = `airplane_${Date.now()}`;
        const session = {
            id: id,
            clickCount: 0,
            startTime: Date.now()
        };
        
        // Use AirplaneEntity class if available, otherwise fallback
        let airplaneMesh;
        let spawnPosition;
        let direction;
        
        if (window.AirplaneEntity) {
            const airplaneEntity = new window.AirplaneEntity();
            airplaneMesh = airplaneEntity.createMesh();
            spawnPosition = airplaneEntity.getSpawnPosition();
            direction = airplaneEntity.getMovementDirection(spawnPosition);
        } else {
            airplaneMesh = this.createSimpleAirplaneMesh();
            spawnPosition = new THREE.Vector3(-60, 25, 0);
            direction = new THREE.Vector3(1, 0, 0);
        }
        
        const entity = {
            id: id,
            type: 'airplane',
            session: session,
            clickable: true,
            mesh: airplaneMesh,
            speed: 5, // Medium speed
            direction: direction,
            update: (time) => this.updateAirplaneMovement(entity, time)
        };
        
        // Position airplane
        entity.mesh.position.copy(spawnPosition);
        
        this.scene.add(entity.mesh);
        this.activeEntities.set(id, entity);
        this.activeSessions.add(session);
        
        // console.log('🎮 Airplane spawned - medium speed with FirstTaps banner');
    }
    
    /**
     * Spawn dog entity (Level 3 - 300 points)
     */
    spawnDog() {
        const id = `dog_${Date.now()}`;
        const session = {
            id: id,
            clickCount: 0,
            startTime: Date.now()
        };
        
        // Use DogEntity class
        let dogInstance;
        if (window.DogEntity) {
            dogInstance = new window.DogEntity(this.scene);
        } else {
            console.warn('🎮 DogEntity class not available');
            return;
        }
        
        const entity = {
            id: id,
            type: 'dog',
            session: session,
            clickable: true,
            mesh: dogInstance.group,
            entityInstance: dogInstance,
            update: (time) => {
                if (dogInstance.update) {
                    dogInstance.update();
                }
            }
        };
        
        this.activeEntities.set(id, entity);
        this.activeSessions.add(session);
        
        // console.log('🎮 Dog spawned - erratic ground movement with FirstTaps collar');
    }
    
    /**
     * Spawn UFO entity (Level 4 - 400 points)
     */
    spawnUFO() {
        const id = `ufo_${Date.now()}`;
        const session = {
            id: id,
            clickCount: 0,
            startTime: Date.now()
        };
        
        // Use UFOEntity class
        let ufoInstance;
        if (window.UFOEntity) {
            ufoInstance = new window.UFOEntity(this.scene);
        } else {
            console.warn('🎮 UFOEntity class not available');
            return;
        }
        
        const entity = {
            id: id,
            type: 'ufo',
            session: session,
            clickable: true,
            mesh: ufoInstance.group,
            entityInstance: ufoInstance,
            update: (time) => {
                if (ufoInstance.update) {
                    ufoInstance.update();
                }
            }
        };
        
        this.activeEntities.set(id, entity);
        this.activeSessions.add(session);
        
        // console.log('🎮 UFO spawned - erratic vertical movement with FirstTaps hull text');
    }
    
    /**
     * Spawn bird entity (Level 5 - 500 points)
     */
    spawnBird() {
        const id = `bird_${Date.now()}`;
        const session = {
            id: id,
            clickCount: 0,
            startTime: Date.now()
        };
        
        // Use BirdEntity class
        let birdInstance;
        if (window.BirdEntity) {
            birdInstance = new window.BirdEntity(this.scene);
        } else {
            console.warn('🎮 BirdEntity class not available');
            return;
        }
        
        const entity = {
            id: id,
            type: 'bird',
            session: session,
            clickable: true,
            mesh: birdInstance.group,
            entityInstance: birdInstance,
            update: (time) => {
                if (birdInstance.update) {
                    birdInstance.update();
                }
                // Check if bird should be removed (flew out of bounds)
                if (birdInstance.shouldBeRemoved && birdInstance.shouldBeRemoved()) {
                    this.removeEntity(id);
                }
            }
        };
        
        this.activeEntities.set(id, entity);
        this.activeSessions.add(session);
        
        // console.log('🎮 Bird spawned - fast straight-line movement with FirstTaps banner');
    }
    
    /**
     * Spawn snake entity (Level 6 - 500 points)
     */
    spawnFrog() {
        const id = `snake_${Date.now()}`;
        const session = {
            id: id,
            clickCount: 0,
            startTime: Date.now()
        };
        
        // Use FrogEntity class (replaced SnakeEntity)
        let frogInstance;
        if (window.FrogEntity) {
            frogInstance = new window.FrogEntity(this.scene);
        } else {
            console.warn('🎮 FrogEntity class not available');
            return;
        }
        
        const entity = {
            id: id,
            type: 'frog',
            session: session,
            clickable: true,
            mesh: frogInstance.group,
            entityInstance: frogInstance,
            update: (time) => {
                if (frogInstance.update) {
                    frogInstance.update();
                }
                // Check if frog should be removed (session timeout or escaped)
                if (frogInstance.shouldBeRemoved && frogInstance.shouldBeRemoved()) {
                    this.removeEntity(id);
                }
            }
        };
        
        this.activeEntities.set(id, entity);
        this.activeSessions.add(session);
        
        // console.log('🎮 Snake spawned - 30 second fast slithering hunt begins!');
    }
    
    /**
     * Update airplane movement (straight with propeller animation)
     */
    updateAirplaneMovement(entity, time) {
        const deltaTime = 0.016; // Approximate frame time
        const movement = entity.direction.clone().multiplyScalar(entity.speed * deltaTime);
        entity.mesh.position.add(movement);
        
        // Rotate propeller if using AirplaneEntity
        if (window.AirplaneEntity) {
            entity.mesh.traverse(child => {
                if (child.name && (child.name.includes('propeller') || child.name.includes('Propeller'))) {
                    child.rotation.x += 0.8;
                }
            });
        }
    }
    
    /**
     * Create simple airplane mesh (fallback)
     */
    createSimpleAirplaneMesh() {
        const group = new THREE.Group();
        
        // Simple fuselage
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.1, 2, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xDC143C });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;
        group.add(body);
        
        // Simple wings
        const wingGeometry = new THREE.BoxGeometry(3, 0.1, 0.6);
        const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xB22222 });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        group.add(wings);
        
        return group;
    }
    removeEntity(id) {
        const entity = this.activeEntities.get(id);
        if (!entity) return;
        
        // Dispose entity instance if it has a dispose method
        if (entity.entityInstance && entity.entityInstance.dispose) {
            entity.entityInstance.dispose();
        } else {
            // Remove from scene
            if (entity.mesh && this.scene) {
                this.scene.remove(entity.mesh);
            }
        }
        
        // Remove from active sessions
        this.activeSessions.delete(entity.session);
        
        // Remove from active entities
        this.activeEntities.delete(id);
        
        console.log(`🎮 Entity ${id} removed from scene`);
    }
    
    /**
     * Reset points to zero
     */
    resetPoints() {
        this.totalPoints = 0;
        this.updatePointsDisplay();
        this.updateUIManagerData();
        this.uiManager.updateScoreUI();
        this.syncPointsWithFlutter();
        console.log('🎮 Points reset to zero');
    }
    
    /**
     * Reset all stats and scores
     */
    resetAllStats() {
        this.totalPoints = 0;
        this.sessionStats = {
            currentSessionClicks: 0,
            totalClicks: 0,
            entitiesClicked: {},
            sessionsCompleted: 0
        };
        
        // Clear all active entities
        this.activeEntities.forEach((entity, id) => {
            this.removeEntity(id);
        });
        
        // Reset spawn timing
        this.lastSpawnTime = Date.now();
        this.nextSpawnTime = this.calculateNextSpawnTime();
        
        this.updatePointsDisplay();
        this.updateUIManagerData();
        this.uiManager.updateScoreUI();
        this.syncPointsWithFlutter();
        
        console.log('🎮 All stats and entities reset');
    }
    
    /**
     * Get current total points
     */
    getTotalPoints() {
        return this.totalPoints;
    }
    
    /**
     * Cleanup - remove all entities and UI
     */
    cleanup() {
        this.activeEntities.forEach((entity, id) => {
            this.removeEntity(id);
        });
        
        // Cleanup UI Manager
        if (this.uiManager) {
            this.uiManager.cleanup();
            this.uiManager = null;
        }
        
        console.log('🎮 SVG Entity Manager cleaned up');
    }
    
    // NOTE: updatePauseButton() method moved to EntityUIManager
    
    /**
     * Pause or resume game play
     */
    toggleGamePlayPause() {
        this.gamePlayPaused = !this.gamePlayPaused;
        console.log(`🎮 Game play ${this.gamePlayPaused ? 'PAUSED' : 'RESUMED'}`);
        
        // Update next spawn time when resuming to avoid immediate spawn
        if (!this.gamePlayPaused) {
            this.nextSpawnTime = this.calculateNextSpawnTime();
            
            // Restart treasure spawning if treasure manager exists
            if (this.app && this.app.treasureManager) {
                console.log('💎 Checking if treasure spawning needs restart after unpause');
                this.app.treasureManager.restartSchedulingIfNeeded();
            }
        }
        
        return this.gamePlayPaused;
    }
    
    /**
     * Get current pause state
     */
    isGamePlayPaused() {
        return this.gamePlayPaused;
    }
    
    /**
     * Set pause state directly
     */
    setGamePlayPaused(paused) {
        this.gamePlayPaused = paused;
        console.log(`🎮 Game play ${this.gamePlayPaused ? 'PAUSED' : 'RESUMED'}`);
        
        // Update next spawn time when resuming to avoid immediate spawn
        if (!this.gamePlayPaused) {
            this.nextSpawnTime = this.calculateNextSpawnTime();
            
            // Restart treasure spawning if treasure manager exists
            if (this.app && this.app.treasureManager) {
                console.log('💎 Checking if treasure spawning needs restart after unpause');
                this.app.treasureManager.restartSchedulingIfNeeded();
            }
        }
    }

    // NOTE: showPremiumGamingPopup() method moved to EntityUIManager

    // NOTE: showWebPremiumPopup() method moved to EntityUIManager

    /**
     * Refresh level progression (called when premium features are unlocked)
     */
    refreshLevelProgression() {
        console.log('🎮 REFRESH LEVEL PROGRESSION: Recalculating levels after premium unlock');
        const oldLevel = this.currentLevel;
        const newLevel = this.getCurrentLevel();
        
        console.log(`🎮 REFRESH: Old level: ${oldLevel}, New calculated level: ${newLevel}, Points: ${this.totalPoints}`);
        
        if (newLevel > oldLevel) {
            console.log(`🎮 REFRESH LEVEL UP! Player progressed from Level ${oldLevel} to Level ${newLevel}`);
            this.currentLevel = newLevel;
            this.showLevelUpCelebration(newLevel);
            this.loadEntityCollectionForLevel(newLevel);
        } else if (newLevel === oldLevel) {
            console.log(`🎮 REFRESH: Level unchanged (${newLevel}), but reloading entity collection to ensure premium entities are loaded`);
            // Force reload the entity collection to ensure premium entities are available
            this.loadEntityCollectionForLevel(newLevel);
        }
    }
    
    /**
     * ==========================================
     * PROMOTIONAL ENTITIES SYSTEM
     * ==========================================
     * These entities spawn independently of gaming state
     * and promote FirstTaps Premium subscriptions
     */
    
    /**
     * Check if it's time to spawn promotional entity
     */
    checkPromotionalSpawning() {
        const currentTime = Date.now();
        
        // Limit concurrent promotional entities
        if (this.promotionalEntities.size >= 1) {
            return; // Only 1 promotional entity at a time
        }
        
        // Check if it's time to spawn
        if (currentTime >= this.nextPromotionalSpawnTime) {
            console.log(`📢 SPAWNING PROMOTIONAL ENTITY NOW!`);
            this.spawnRandomPromotionalEntity();
            this.nextPromotionalSpawnTime = this.calculateNextPromotionalSpawnTime();
        }
    }
    
    /**
     * Spawn a random promotional entity
     */
    spawnRandomPromotionalEntity() {
        const entityType = this.promotionalTypes[
            Math.floor(Math.random() * this.promotionalTypes.length)
        ];
        
        console.log(`📢 Spawning ${entityType} promotional entity...`);
        
        try {
            let entityInstance = null;
            
            switch (entityType) {
                case 'biplane':
                    if (window.RedBiplaneEntity) {
                        entityInstance = new window.RedBiplaneEntity(this.scene);
                    }
                    break;
                case 'balloon':
                    if (window.HotAirBalloonEntity) {
                        entityInstance = new window.HotAirBalloonEntity(this.scene);
                    }
                    break;
                case 'bus':
                    if (window.DoubleDeckrBusEntity) {
                        entityInstance = new window.DoubleDeckrBusEntity(this.scene);
                    }
                    break;
            }
            
            if (entityInstance) {
                const id = `promo_${entityType}_${Date.now()}`;
                const entity = {
                    id: id,
                    type: entityType,
                    mesh: entityInstance.group,
                    entityInstance: entityInstance,
                    isPromotional: true,
                    clickable: true,
                    update: () => entityInstance.update()
                };
                
                this.promotionalEntities.set(id, entity);
                console.log(`📢 SUCCESS: ${entityType} promotional entity spawned`);
            } else {
                console.warn(`⚠️ ${entityType} promotional entity class not available`);
            }
        } catch (error) {
            console.error(`📢 ERROR spawning ${entityType}:`, error);
        }
    }
    
    /**
     * Handle promotional entity click - open subscription page
     */
    handlePromotionalEntityClick(entity) {
        console.log(`📢 Promotional entity clicked: ${entity.type}`);
        
        // Visual feedback
        this.showPromotionalClickFeedback(entity);
        
        // Open subscription page via Flutter channel
        this.openPremiumStore(entity.type);
        
        // Remove entity after click
        setTimeout(() => {
            this.removePromotionalEntity(entity.id);
        }, 500);
    }
    
    /**
     * Visual feedback for promotional click
     */
    showPromotionalClickFeedback(entity) {
        try {
            const clickPosition = entity.mesh.position.clone();
            
            // Create floating text "Opening Premium Store..."
            this.createPromotionalFloatingText('Opening Premium Store...', clickPosition);
            
            // Flash effect on entity
            this.animatePromotionalClick(entity);
            
            // Play success sound
            this.playPromotionalClickSound();
            
        } catch (error) {
            console.error('📢 ERROR in showPromotionalClickFeedback:', error);
        }
    }
    
    /**
     * Create floating text for promotional click
     */
    createPromotionalFloatingText(text, worldPosition) {
        // Convert world position to screen coordinates
        const screenPosition = new THREE.Vector3();
        screenPosition.copy(worldPosition);
        screenPosition.project(this.camera);
        
        // Convert to pixel coordinates
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const x = (screenPosition.x * 0.5 + 0.5) * rect.width + rect.left;
        const y = (screenPosition.y * -0.5 + 0.5) * rect.height + rect.top;
        
        // Create floating text element
        const floatingText = document.createElement('div');
        floatingText.textContent = text;
        floatingText.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            color: #FF6B35;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            pointer-events: none;
            z-index: 10000;
            transform: translate(-50%, -50%);
            animation: floatScore 2s ease-out forwards;
        `;
        
        document.body.appendChild(floatingText);
        
        // Remove element after animation
        setTimeout(() => {
            if (floatingText.parentNode) {
                floatingText.parentNode.removeChild(floatingText);
            }
        }, 2000);
    }
    
    /**
     * Animate promotional entity click
     */
    animatePromotionalClick(entity) {
        if (!entity.mesh) return;
        
        const originalScale = entity.mesh.scale.clone();
        const duration = 300;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Quick pulse
            const factor = 1 + 0.2 * Math.sin(progress * Math.PI);
            entity.mesh.scale.copy(originalScale).multiplyScalar(factor);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                entity.mesh.scale.copy(originalScale);
            }
        };
        
        animate();
    }
    
    /**
     * Play promotional click sound
     */
    playPromotionalClickSound() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Pleasant "ding" sound for promotional click
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, this.audioContext.currentTime + 0.1); // C6
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
    
    /**
     * Open Premium Store via Flutter channel
     */
    openPremiumStore(source) {
        console.log(`📢 Opening Premium Store from source: ${source}`);
        
        // Send message to Flutter
        if (window.flutterChannel) {
            window.flutterChannel.postMessage({
                type: 'openPremiumStore',
                source: `promotional_${source}`,
                context: 'promotional_entity_click'
            });
            console.log('📢 Message sent to Flutter: openPremiumStore');
        } else {
            console.warn('📢 Flutter channel not available');
        }
    }
    
    /**
     * Remove promotional entity
     */
    removePromotionalEntity(id) {
        const entity = this.promotionalEntities.get(id);
        if (entity) {
            // Dispose entity
            if (entity.entityInstance && entity.entityInstance.dispose) {
                entity.entityInstance.dispose();
            }
            
            this.promotionalEntities.delete(id);
            console.log(`📢 Removed promotional entity: ${id}`);
        }
    }
}

// Export for module system
window.SVGEntityManager = SVGEntityManager;

// Add global method for Flutter premium unlock callback
window.refreshGamingLevels = function() {
    console.log('🎮 GLOBAL: Flutter called refreshGamingLevels()');
    if (window.svgEntityManager && typeof window.svgEntityManager.refreshLevelProgression === 'function') {
        console.log('🎮 GLOBAL: Calling entity manager refreshLevelProgression()');
        window.svgEntityManager.refreshLevelProgression();
    } else {
        console.warn('🎮 GLOBAL: SVG Entity Manager not available for level refresh');
    }
};

/**
 * Initialize SVG Entity Manager with the main app
 */
window.initializeSVGEntities = function(app) {
    if (!app || !app.scene || !app.camera || !app.renderer) {
        console.warn('🎮 Cannot initialize SVG entities - app components missing');
        return null;
    }
    
    if (app.svgEntityManager) {
        console.log('🎮 SVG Entity Manager already initialized');
        return app.svgEntityManager;
    }
    
    try {
        app.svgEntityManager = new SVGEntityManager(app);
        console.log('🎮 ✅ SVG Entity Manager initialized successfully');
        return app.svgEntityManager;
    } catch (error) {
        console.error('🎮 Failed to initialize SVG Entity Manager:', error);
        return null;
    }
};

console.log('🎮 SVG Entity Manager class loaded');
