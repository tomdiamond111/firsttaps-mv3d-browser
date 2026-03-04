/**
 * ENTITY UI MANAGER
 * Handles all UI components for the SVG Entity gaming system
 * 
 * Features:
 * - Score display and scoreboard management
 * - Premium gaming popup system
 * - Pause/resume controls
 * - Interactive UI elements and animations
 */

class EntityUIManager {
    constructor(config = {}) {
        // Dependencies passed from main manager
        this.entityManager = config.entityManager; // Reference to main SVGEntityManager
        this.totalPoints = config.totalPoints || 0;
        this.sessionStats = config.sessionStats || {};
        this.currentLevel = config.currentLevel || 1;
        this.gamePlayPaused = config.gamePlayPaused || false;
        this.maxConcurrentSessions = config.maxConcurrentSessions || 2;
        this.sessionClickLimit = config.sessionClickLimit || 3;
        this.pointLevels = config.pointLevels || {};
        this.levelThresholds = config.levelThresholds || {};
        this.activeSessions = config.activeSessions || new Set();
        this.activeEntities = config.activeEntities || new Map();
        this.nextSpawnTime = config.nextSpawnTime || 0;
        
        // UI Elements
        this.scoreDisplay = null;
        this.scoreUI = null;
        this.scoreboardBackdrop = null;
        this.modalScoreDisplay = null;
        this.sessionInfo = null;
        this.entityCounters = null;
        this.activeIndicator = null;
        this.resetButton = null;
        this.pauseButton = null;
        
        // Premium popup tracking
        this.hasShownPremiumPopup = config.hasShownPremiumPopup || false;
        
        // Initialize level progression notifier
        if (window.LevelProgressionNotifier) {
            this.progressionNotifier = new LevelProgressionNotifier(this.entityManager);
            console.log('🎮 Level Progression Notifier initialized');
        }
        
        // BROWSER VERSION: Testing UI disabled for production
        // if (window.EntityTestingUI) {
        //     this.testingUI = new EntityTestingUI(this.entityManager, this);
        //     console.log('🧪 Testing UI initialized');
        // }
        
        console.log('🎮 EntityUIManager initialized');
    }
    
    /**
     * Initialize all UI components
     */
    initialize() {
        // Always create the persistent score button regardless of scoreboard type
        this.createScoreUI();
        
        // ONLY use SimpleMobileScoreboard - no fallbacks to avoid conflicts
        if (window.simpleMobileScoreboard) {
            this.scoreBillboard = window.simpleMobileScoreboard;
            console.log('📱 Using Simple Mobile Scoreboard (stable implementation)');
        } else {
            console.warn('⚠️ SimpleMobileScoreboard not available - creating minimal fallback');
            // Create minimal fallback if needed
            this.createMinimalScoreboardFallback();
        }
        console.log('🎮 EntityUIManager UI components created');
    }
    
    /**
     * Update UI data from main manager
     */
    updateData(data) {
        this.totalPoints = data.totalPoints || this.totalPoints;
        this.sessionStats = data.sessionStats || this.sessionStats;
        this.currentLevel = data.currentLevel || this.currentLevel;
        this.gamePlayPaused = data.gamePlayPaused || this.gamePlayPaused;
        this.activeSessions = data.activeSessions || this.activeSessions;
        this.activeEntities = data.activeEntities || this.activeEntities;
        this.nextSpawnTime = data.nextSpawnTime || this.nextSpawnTime;
        this.hasShownPremiumPopup = data.hasShownPremiumPopup || this.hasShownPremiumPopup;
    }
    
    /**
     * Create persistent score UI overlay
     */
    createScoreUI() {
        // Remove existing UI if present
        if (this.scoreUI || this.scoreDisplay) {
            if (this.scoreUI) this.scoreUI.remove();
            if (this.scoreDisplay) this.scoreDisplay.remove();
        }
        
        // Create minimal score display (always visible) - positioned bottom left as a button
        this.scoreDisplay = document.createElement('button');
        this.scoreDisplay.id = 'svgEntityScoreDisplay';
        
        // Detect initial orientation and apply appropriate styles
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (isLandscape) {
            // LANDSCAPE: Smaller, more compact button - aligned with Home button
            this.scoreDisplay.style.cssText = `
                position: fixed;
                bottom: 24px;
                left: 15px;
                background: rgba(76, 175, 80, 0.95);
                color: white;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 14px;
                font-weight: bold;
                border: 2px solid #4CAF50;
                border-radius: 8px;
                padding: 8px 12px;
                z-index: 2500;
                cursor: pointer;
                user-select: none;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                transition: none;
                outline: none;
                min-width: 100px;
                max-width: 180px;
                text-align: center;
                backdrop-filter: blur(4px);
                box-sizing: border-box;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            `;
        } else {
            // PORTRAIT: Larger, more visible button - aligned with Home button
            this.scoreDisplay.style.cssText = `
                position: fixed;
                bottom: 24px;
                left: 15px;
                background: rgba(76, 175, 80, 0.95);
                color: white;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 16px;
                font-weight: bold;
                border: 2px solid #4CAF50;
                border-radius: 10px;
                padding: 12px 16px;
                z-index: 2500;
                cursor: pointer;
                user-select: none;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                transition: none;
                outline: none;
                min-width: 120px;
                max-width: 200px;
                text-align: center;
                backdrop-filter: blur(4px);
                box-sizing: border-box;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            `;
        }
        
        this.scoreDisplay.textContent = 'Score: 0';
        
        // Double-tap detection for score display
        this.setupScoreDisplayInteraction();
        
        // Create full scoreboard modal (initially hidden)
        this.createFullScoreboard();
        
        // Add minimal display to page
        document.body.appendChild(this.scoreDisplay);
        
        // Add orientation change handling for score button stability
        let orientationTimeout;
        window.addEventListener('orientationchange', () => {
            clearTimeout(orientationTimeout);
            orientationTimeout = setTimeout(() => {
                if (this.scoreDisplay) {
                    console.log('📱 Orientation change - stabilizing score button');
                    
                    // Detect current orientation
                    const isLandscape = window.innerWidth > window.innerHeight;
                    
                    // Apply orientation-specific styles
                    if (isLandscape) {
                        // LANDSCAPE: Smaller, more compact button - aligned with Home button
                        this.scoreDisplay.style.cssText = `
                            position: fixed;
                            bottom: 24px;
                            left: 15px;
                            background: rgba(76, 175, 80, 0.95);
                            color: white;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            font-size: 14px;
                            font-weight: bold;
                            border: 2px solid #4CAF50;
                            border-radius: 8px;
                            padding: 8px 12px;
                            z-index: 2500;
                            cursor: pointer;
                            user-select: none;
                            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                            box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                            transition: none;
                            outline: none;
                            min-width: 100px;
                            max-width: 180px;
                            text-align: center;
                            backdrop-filter: blur(4px);
                            box-sizing: border-box;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        `;
                    } else {
                        // PORTRAIT: Larger, more visible button - aligned with Home button
                        this.scoreDisplay.style.cssText = `
                            position: fixed;
                            bottom: 24px;
                            left: 15px;
                            background: rgba(76, 175, 80, 0.95);
                            color: white;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            font-size: 16px;
                            font-weight: bold;
                            border: 2px solid #4CAF50;
                            border-radius: 10px;
                            padding: 12px 16px;
                            z-index: 2500;
                            cursor: pointer;
                            user-select: none;
                            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                            box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                            transition: none;
                            outline: none;
                            min-width: 120px;
                            max-width: 200px;
                            text-align: center;
                            backdrop-filter: blur(4px);
                            box-sizing: border-box;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        `;
                    }
                }
            }, 150);
        });
        
        console.log('🎮 Minimal score UI created');
    }

    /**
     * Setup double-tap interaction for score display
     */
    setupScoreDisplayInteraction() {
        let tapCount = 0;
        let tapTimeout;
        
        // Single click/tap handler
        this.scoreDisplay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showFullScoreboard();
        });
        
        this.scoreDisplay.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            tapCount++;
            
            if (tapCount === 1) {
                tapTimeout = setTimeout(() => {
                    tapCount = 0; // Reset if single tap
                    this.showFullScoreboard();
                }, 300);
            } else if (tapCount === 2) {
                clearTimeout(tapTimeout);
                tapCount = 0;
                this.showFullScoreboard();
            }
        });
        
        // Button hover effects
        this.scoreDisplay.addEventListener('mouseenter', () => {
            this.scoreDisplay.style.background = 'rgba(102, 187, 106, 0.9)';
            this.scoreDisplay.style.transform = 'scale(1.05)';
            this.scoreDisplay.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
        });
        
        this.scoreDisplay.addEventListener('mouseleave', () => {
            this.scoreDisplay.style.background = 'rgba(76, 175, 80, 0.9)';
            this.scoreDisplay.style.transform = 'scale(1)';
            this.scoreDisplay.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        });
        
        // Button press effect
        this.scoreDisplay.addEventListener('mousedown', () => {
            this.scoreDisplay.style.transform = 'scale(0.98)';
        });
        
        this.scoreDisplay.addEventListener('mouseup', () => {
            this.scoreDisplay.style.transform = 'scale(1.05)';
        });
    }

    /**
     * Create full scoreboard modal (hidden by default)
     */
    createFullScoreboard() {
        // Modal backdrop
        this.scoreboardBackdrop = document.createElement('div');
        this.scoreboardBackdrop.id = 'svgEntityScoreboardBackdrop';
        this.scoreboardBackdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2000;
            display: none;
            align-items: center;
            justify-content: center;
        `;
        
        // Full scoreboard container
        this.scoreUI = document.createElement('div');
        this.scoreUI.id = 'svgEntityFullScoreboard';
        this.scoreUI.style.cssText = `
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 15px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            min-width: 250px;
            max-width: 90vw;
            border: 2px solid #4CAF50;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
            position: relative;
        `;
        
        // Close button
        const closeButton = document.createElement('div');
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            color: #ccc;
            font-size: 20px;
            cursor: pointer;
            user-select: none;
        `;
        closeButton.textContent = 'X';
        closeButton.onclick = () => this.hideFullScoreboard();
        this.scoreUI.appendChild(closeButton);
        
        // Main score display in modal
        this.modalScoreDisplay = document.createElement('div');
        this.modalScoreDisplay.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 15px;
            text-align: center;
        `;
        this.scoreUI.appendChild(this.modalScoreDisplay);
        
        // Session info
        this.sessionInfo = document.createElement('div');
        this.sessionInfo.style.cssText = `
            font-size: 12px;
            color: #ccc;
            margin-bottom: 15px;
            text-align: center;
        `;
        this.scoreUI.appendChild(this.sessionInfo);
        
        // Entity counters
        this.entityCounters = document.createElement('div');
        this.entityCounters.style.cssText = `
            font-size: 11px;
            color: #aaa;
            margin-bottom: 15px;
        `;
        this.scoreUI.appendChild(this.entityCounters);
        
        // Active entities indicator
        this.activeIndicator = document.createElement('div');
        this.activeIndicator.style.cssText = `
            font-size: 11px;
            color: #FFD700;
            margin-bottom: 15px;
            text-align: center;
            font-weight: bold;
        `;
        this.scoreUI.appendChild(this.activeIndicator);
        
        // Reset button
        this.resetButton = document.createElement('button');
        this.resetButton.textContent = 'Reset All Stats';
        this.resetButton.style.cssText = `
            width: 100%;
            padding: 10px;
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            transition: background 0.2s;
        `;
        this.resetButton.onmouseover = () => this.resetButton.style.background = '#ff6666';
        this.resetButton.onmouseout = () => this.resetButton.style.background = '#ff4444';
        this.resetButton.onclick = () => {
            if (this.entityManager && this.entityManager.resetAllStats) {
                this.entityManager.resetAllStats();
            }
            this.hideFullScoreboard();
        };
        this.scoreUI.appendChild(this.resetButton);
        
        // Pause Game Play toggle button
        this.pauseButton = document.createElement('button');
        this.pauseButton.style.cssText = `
            width: 100%;
            padding: 10px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            transition: background 0.2s;
            margin-top: 10px;
        `;
        this.pauseButton.onmouseover = () => {
            this.pauseButton.style.background = this.gamePlayPaused ? '#ff6666' : '#66bb6a';
        };
        this.pauseButton.onmouseout = () => {
            this.pauseButton.style.background = this.gamePlayPaused ? '#ff4444' : '#4CAF50';
        };
        this.pauseButton.onclick = () => {
            if (this.entityManager && this.entityManager.toggleGamePlayPause) {
                this.gamePlayPaused = this.entityManager.toggleGamePlayPause();
            }
            this.updatePauseButton();
        };
        this.updatePauseButton(); // Set initial text and style
        this.scoreUI.appendChild(this.pauseButton);
        
        // Store button - opens Premium Store
        this.storeButton = document.createElement('button');
        this.storeButton.textContent = '🛒 Premium Store';
        this.storeButton.style.cssText = `
            width: 100%;
            padding: 10px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            transition: background 0.2s;
            margin-top: 10px;
        `;
        this.storeButton.onmouseover = () => this.storeButton.style.background = '#42A5F5';
        this.storeButton.onmouseout = () => this.storeButton.style.background = '#2196F3';
        this.storeButton.onclick = () => {
            this.hideFullScoreboard();
            this.openPremiumStore();
        };
        this.scoreUI.appendChild(this.storeButton);
        
        // Add to backdrop
        this.scoreboardBackdrop.appendChild(this.scoreUI);
        
        // Click outside to close
        this.scoreboardBackdrop.addEventListener('click', (e) => {
            if (e.target === this.scoreboardBackdrop) {
                this.hideFullScoreboard();
            }
        });
        
        // Add to page
        document.body.appendChild(this.scoreboardBackdrop);
    }

    /**
     * Show full scoreboard modal
     */
    showFullScoreboard() {
        console.log('🎮 Full scoreboard opened');
        
        // ONLY use simple mobile scoreboard - no fallbacks to avoid conflicts
        if (this.scoreBillboard && typeof this.scoreBillboard.showFullScoreboard === 'function') {
            this.scoreBillboard.showFullScoreboard();
            return;
        }
        
        // Final fallback to minimal modal scoreboard only if SimpleMobileScoreboard fails
        console.warn('⚠️ SimpleMobileScoreboard not available - using minimal modal fallback');
        if (this.scoreboardBackdrop) {
            this.updateScoreUI(); // Update content before showing
            this.scoreboardBackdrop.style.display = 'flex';
        }
    }

    /**
     * Hide full scoreboard modal
     */
    hideFullScoreboard() {
        if (this.scoreboardBackdrop) {
            this.scoreboardBackdrop.style.display = 'none';
            console.log('🎮 Full scoreboard closed');
        }
    }
    
    /**
     * Update score UI display
     */
    updateScoreUI() {
        // Always update the persistent score button display
        if (this.scoreDisplay) {
            const nextLevelThreshold = this.getNextLevelThreshold();
            if (nextLevelThreshold) {
                this.scoreDisplay.textContent = `Lv${this.currentLevel} | ${this.totalPoints}pts`;
            } else {
                this.scoreDisplay.textContent = `Lv${this.currentLevel} MAX | ${this.totalPoints}pts`;
            }
        }
        
        // ONLY update simple mobile scoreboard - no fallbacks to avoid conflicts
        if (this.scoreBillboard && typeof this.scoreBillboard.updateContent === 'function') {
            this.scoreBillboard.updateContent();
            return;
        }
        
        // Fallback to old UI system only if SimpleMobileScoreboard fails
        // Update full scoreboard modal (if it exists)
        if (!this.scoreUI) return;
        
        // Update main score in modal with level progression
        if (this.modalScoreDisplay) {
            const nextLevelThreshold = this.getNextLevelThreshold();
            let levelInfo = `Level ${this.currentLevel} | Score: ${this.totalPoints}`;
            
            if (nextLevelThreshold) {
                const pointsNeeded = nextLevelThreshold - this.totalPoints;
                levelInfo += `<br>Next Level: ${pointsNeeded} points to go`;
            } else {
                levelInfo += `<br>MAX LEVEL REACHED!`;
            }
            
            this.modalScoreDisplay.innerHTML = levelInfo;
        }
        
        // Update session info
        const activeSessionsCount = this.activeSessions.size;
        const clicksInCurrentSession = this.sessionStats.currentSessionClicks || 0;
        
        if (this.sessionInfo) {
            this.sessionInfo.innerHTML = `
                Sessions: ${activeSessionsCount}/${this.maxConcurrentSessions}<br>
                Clicks in session: ${clicksInCurrentSession}/${this.sessionClickLimit}<br>
                Total clicks: ${this.sessionStats.totalClicks || 0}
            `;
        }
        
        // Update entity counters
        if (this.entityCounters) {
            const counters = Object.keys(this.pointLevels).map(entityType => {
                const count = (this.sessionStats.entitiesClicked && this.sessionStats.entitiesClicked[entityType]) || 0;
                const points = this.pointLevels[entityType];
                return `${entityType}: ${count} (${points}pts)`;
            }).join('<br>');
            
            this.entityCounters.innerHTML = `Entity Clicks:<br>${counters}`;
        }
        
        // Update active entities indicator
        if (this.activeIndicator) {
            const activeCount = this.activeEntities.size;
            if (activeCount > 0) {
                const activeTypes = Array.from(this.activeEntities.values())
                    .map(entity => entity.type)
                    .join(', ');
                this.activeIndicator.textContent = `Active: ${activeTypes} (${activeCount})`;
            } else {
                const timeToNext = Math.max(0, Math.ceil((this.nextSpawnTime - Date.now()) / 1000));
                this.activeIndicator.textContent = `Next spawn: ${timeToNext}s`;
            }
        }
    }
    
    /**
     * Update pause button text and style based on current state
     */
    updatePauseButton() {
        if (this.pauseButton) {
            this.pauseButton.textContent = this.gamePlayPaused ? 'Resume Game Play' : 'Pause Game Play';
            this.pauseButton.style.background = this.gamePlayPaused ? '#ff4444' : '#4CAF50';
        }
    }
    
    /**
     * Get next level threshold points (helper method for UI display)
     */
    getNextLevelThreshold() {
        if (this.entityManager && this.entityManager.getNextLevelThreshold) {
            return this.entityManager.getNextLevelThreshold();
        }
        
        // Fallback calculation
        const levels = Object.keys(this.levelThresholds).map(Number).sort((a, b) => a - b);
        const currentLevelIndex = levels.findIndex(level => level === this.currentLevel);
        
        if (currentLevelIndex >= 0 && currentLevelIndex < levels.length - 1) {
            const nextLevel = levels[currentLevelIndex + 1];
            return this.levelThresholds[nextLevel];
        }
        
        return null; // Max level reached
    }

    /**
     * Show premium gaming popup when reaching Level 4 threshold
     */
    showPremiumGamingPopup() {
        console.log('🎮 PREMIUM POPUP CALLED: Showing premium gaming levels popup');
        console.log('🎮 PREMIUM POPUP: PremiumGamingPopupChannel available?', !!window.PremiumGamingPopupChannel);
        
        // Try to communicate with Flutter via JavaScript channel first
        if (window.PremiumGamingPopupChannel) {
            try {
                const popupData = {
                    trigger: 'level3_complete',
                    currentLevel: this.currentLevel,
                    unlockedLevels: [4, 5],
                    currentScore: this.totalPoints
                };
                console.log('🎮 PREMIUM POPUP: Sending data to Flutter:', popupData);
                window.PremiumGamingPopupChannel.postMessage(JSON.stringify(popupData));
                console.log('🎮 PREMIUM POPUP: Message sent successfully to Flutter channel');
                return;
            } catch (error) {
                console.error('🎮 PREMIUM POPUP ERROR: Failed to send to Flutter channel:', error);
            }
        } else {
            console.warn('🎮 PREMIUM POPUP: PremiumGamingPopupChannel not available, using web fallback');
        }
        
        // Fallback to web-based popup
        console.log('🎮 PREMIUM POPUP: Using web fallback popup');
        this.showWebPremiumPopup();
    }

    /**
     * Web-based premium gaming popup (fallback)
     */
    showWebPremiumPopup() {
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

        // Create popup container
        const popup = document.createElement('div');
        popup.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            padding: 30px;
            max-width: 90vw;
            width: 400px;
            color: white;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: popupScale 0.3s ease-out;
        `;

        // Add animation styles
        if (!document.getElementById('premiumPopupStyles')) {
            const styles = document.createElement('style');
            styles.id = 'premiumPopupStyles';
            styles.textContent = `
                @keyframes popupScale {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .premium-btn {
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    margin: 8px;
                    transition: all 0.3s ease;
                }
                .premium-btn:hover {
                    background: #45a049;
                    transform: translateY(-2px);
                }
                .premium-btn.secondary {
                    background: transparent;
                    border: 2px solid rgba(255, 255, 255, 0.5);
                }
                .premium-btn.secondary:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `;
            document.head.appendChild(styles);
        }

        popup.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 16px;">🎮 Level 3 Complete!</div>
            <div style="font-size: 18px; margin-bottom: 20px;">Continue to Premium Gaming Levels?</div>
            
            <div style="text-align: left; margin: 20px 0; padding: 20px; background: rgba(255, 255, 255, 0.1); border-radius: 12px;">
                <div style="font-weight: bold; margin-bottom: 12px;">🐛 Level 4: Insect Safari</div>
                <div style="font-size: 14px; margin-bottom: 8px;">Hunt insects through the file zone</div>
                <div style="font-size: 12px; opacity: 0.8;">Spider • Mantis • Housefly • Butterfly • Ladybug</div>
                <div style="font-size: 12px; color: #4CAF50; font-weight: bold;">300-800 points</div>
                
                <div style="margin-top: 16px; font-weight: bold; margin-bottom: 12px;">✨ Level 5: Glowing Objects</div>
                <div style="font-size: 14px; margin-bottom: 8px;">Capture luminous entities with spectacular effects</div>
                <div style="font-size: 12px; opacity: 0.8;">Pulsing Orb • Spinning Disc • Red Siren • Dancing Orbs • Flashing Cube</div>
                <div style="font-size: 12px; color: #4CAF50; font-weight: bold;">500-1200 points</div>
            </div>

            ${(window.AppConfig && window.AppConfig.showPremiumTestPanels) ? `
            <div id="premiumToggleSection" style="margin: 20px 0; padding: 16px; background: rgba(255, 165, 0, 0.2); border-radius: 12px; border: 1px solid rgba(255, 165, 0, 0.5);">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <div style="font-weight: bold; color: #FFA500;">🧪 Testing Mode</div>
                        <div style="font-size: 12px; opacity: 0.8;">Toggle premium access for testing</div>
                    </div>
                    <label style="position: relative; display: inline-block; width: 60px; height: 34px;">
                        <input type="checkbox" id="premiumToggle" style="opacity: 0; width: 0; height: 0;">
                        <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px;">
                            <span style="position: absolute; content: ''; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%;"></span>
                        </span>
                    </label>
                </div>
            </div>
            ` : ''}
            
            <div style="margin-top: 24px;">
                <button class="premium-btn" id="continueBtn">Continue with Current Levels</button>
            </div>
        `;

        backdrop.appendChild(popup);
        document.body.appendChild(backdrop);

        // Setup toggle functionality (only if test panel is shown)
        const toggle = popup.querySelector('#premiumToggle');
        const toggleSection = popup.querySelector('#premiumToggleSection');
        
        if (toggle && toggleSection) {
        // Check current premium status via entity manager
        const isUnlocked = this.entityManager && this.entityManager.isPremiumLevelUnlocked ? 
            (this.entityManager.isPremiumLevelUnlocked(4) && this.entityManager.isPremiumLevelUnlocked(5)) : false;
        toggle.checked = isUnlocked;
        
        toggle.addEventListener('change', async (e) => {
            const isEnabled = e.target.checked;
            console.log(`🎮 Premium toggle changed: ${isEnabled}`);
            
            if (isEnabled) {
                // Enable premium levels for testing
                localStorage.setItem('test_premium_level_4', 'true');
                localStorage.setItem('test_premium_level_5', 'true');
                console.log('🎮 Premium gaming levels enabled for testing');
                
                // Show success feedback
                toggleSection.style.background = 'rgba(76, 175, 80, 0.2)';
                toggleSection.style.borderColor = 'rgba(76, 175, 80, 0.5)';
                toggleSection.querySelector('div').innerHTML = `
                    <div style="font-weight: bold; color: #4CAF50;">✅ Premium Unlocked</div>
                    <div style="font-size: 12px; opacity: 0.8;">Levels 4 & 5 are now accessible</div>
                `;
            } else {
                // Disable premium levels
                localStorage.removeItem('test_premium_level_4');
                localStorage.removeItem('test_premium_level_5');
                console.log('🎮 Premium gaming levels disabled');
                
                // Reset feedback
                toggleSection.style.background = 'rgba(255, 165, 0, 0.2)';
                toggleSection.style.borderColor = 'rgba(255, 165, 0, 0.5)';
                toggleSection.querySelector('div').innerHTML = `
                    <div style="font-weight: bold; color: #FFA500;">🧪 Testing Mode</div>
                    <div style="font-size: 12px; opacity: 0.8;">Toggle premium access for testing</div>
                `;
            }
        });
        }

        // Setup continue button
        popup.querySelector('#continueBtn').addEventListener('click', () => {
            document.body.removeChild(backdrop);
            console.log('🎮 Premium popup dismissed');
        });

        // Close on backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                document.body.removeChild(backdrop);
                console.log('🎮 Premium popup dismissed via backdrop');
            }
        });
    }
    
    /**
     * Open Premium Store by calling Flutter bridge
     */
    openPremiumStore() {
        console.log('🛒 Opening Premium Store from Score Billboard');
        
        // Try to call Flutter bridge through JavaScript channel
        try {
            if (window.openPremiumStore && window.openPremiumStore.postMessage) {
                window.openPremiumStore.postMessage('openStore');
                console.log('🛒 Premium Store channel called successfully');
            } else {
                console.warn('🛒 Flutter bridge channel not available');
                // Fallback: show alert
                alert('🛒 Premium Store - Coming Soon!\n\nAccess the store through the main menu options for now.');
            }
        } catch (error) {
            console.error('🛒 Error calling Premium Store channel:', error);
            // Fallback: show alert
            alert('🛒 Premium Store - Coming Soon!\n\nAccess the store through the main menu options for now.');
        }
    }
    
    /**
     * Cleanup - remove all UI elements
     */
    cleanup() {
        // Remove score UI elements
        if (this.scoreDisplay) {
            this.scoreDisplay.remove();
            this.scoreDisplay = null;
        }
        
        if (this.scoreboardBackdrop) {
            this.scoreboardBackdrop.remove();
            this.scoreboardBackdrop = null;
        }
        
        if (this.scoreUI) {
            this.scoreUI = null;
        }
        
        console.log('🎮 EntityUIManager cleaned up');
    }
    
    /**
     * Create minimal scoreboard fallback if SimpleMobileScoreboard is not available
     */
    createMinimalScoreboardFallback() {
        this.scoreBillboard = {
            type: 'MinimalFallback',
            visible: false,
            showFullScoreboard: () => {
                console.log('📱 Showing minimal fallback scoreboard');
                alert(`Score: ${this.totalPoints} points\nLevel: ${this.currentLevel}\n\nUse browser dev tools to test:\nwindow.setTestPoints(45000)`);
            },
            hideFullScoreboard: () => {
                console.log('📱 Hiding minimal fallback scoreboard');
            },
            updateContent: () => {
                // No-op for minimal fallback
            }
        };
        console.log('📱 Created minimal scoreboard fallback');
    }
}

// Export for module system
window.EntityUIManager = EntityUIManager;
console.log('🎮 EntityUIManager class loaded');