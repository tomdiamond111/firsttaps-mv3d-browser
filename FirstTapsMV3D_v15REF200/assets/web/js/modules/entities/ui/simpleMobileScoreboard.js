/**
 * SimpleMobileScoreboard - Clean, working scoreboard for mobile devices
 * Separate landscape/portrait layouts, working scroll, visible testing controls
 */
class SimpleMobileScoreboard {
    constructor() {
        this.type = 'SimpleMobileScoreboard';
        this.visible = false;
        this.scoreboardElement = null;
        // Use AppConfig if available, fallback to false for safety
        this.isDebugMode = window.AppConfig ? window.AppConfig.showScoreboardDebugControls : false;
        
        // Only initialize testing functions in debug mode
        if (this.isDebugMode) {
            this.initializeGlobalFunctions();
            console.log('🔧 Debug mode enabled - testing controls will be visible');
        } else {
            console.log('🔒 Production mode - testing controls disabled');
        }
    }

    initializeGlobalFunctions() {
        // Make testing functions available globally
        window.jumpToLevel5 = () => {
            console.log('🚀 JUMP TO LEVEL 5 TRIGGERED');
            this.setTestingPoints(40000);
            this.showMessage('🚀 Jumped to Level 5! (40,000 points)', 'success');
            this.hideScoreboard();
        };
        
        window.setTestPoints = (points) => {
            console.log(`📊 Setting test points to: ${points}`);
            this.setTestingPoints(points);
            this.showMessage(`📊 Points set to ${points.toLocaleString()}!`, 'success');
        };
        
        window.togglePremium = () => {
            console.log('👑 Premium testing enabled');
            window.premiumTestingEnabled = true;
            
            // Enable all premium levels in the entity manager
            if (window.app && window.app.svgEntityManager) {
                window.app.svgEntityManager.premiumLevelsState.level4 = true;
                window.app.svgEntityManager.premiumLevelsState.level5 = true;
                window.app.svgEntityManager.premiumLevelsState.level6 = true;
                window.app.svgEntityManager.premiumLevelsState.level7 = true;
                
                // Refresh level progression to activate new levels
                window.app.svgEntityManager.refreshLevelProgression();
                
                console.log('👑 All premium levels enabled and progression refreshed');
            }
            
            this.showMessage('👑 Premium testing enabled!', 'success');
        };
        
        window.enableLevel6Testing = () => {
            console.log('🚀 LEVEL 6 TESTING: Setting points to 55k and enabling all premium levels');
            
            // Set points to 55k (well above level 6 threshold)
            window.setTestPoints(55000);
            
            // Enable all premium levels
            window.premiumTestingEnabled = true;
            if (window.app && window.app.svgEntityManager) {
                window.app.svgEntityManager.premiumLevelsState.level4 = true;
                window.app.svgEntityManager.premiumLevelsState.level5 = true;
                window.app.svgEntityManager.premiumLevelsState.level6 = true;
                window.app.svgEntityManager.premiumLevelsState.level7 = true;
                
                // Force level 6 to stay enabled - protect from Flutter override
                setInterval(() => {
                    if (window.app && window.app.svgEntityManager) {
                        if (!window.app.svgEntityManager.premiumLevelsState.level6) {
                            console.log('🔒 PROTECTING: Re-enabling level 6 after Flutter override');
                            window.app.svgEntityManager.premiumLevelsState.level6 = true;
                            window.app.svgEntityManager.premiumLevelsState.level7 = true;
                        }
                    }
                }, 1000);
                
                // Refresh level progression to activate new levels
                window.app.svgEntityManager.refreshLevelProgression();
                
                console.log('🚀 Level 6 testing enabled: 55k points + all premium levels unlocked');
            }
            
            this.showMessage('🚀 LEVEL 6 TESTING ENABLED! (55k points + premium unlocked)', 'success');
        };
        
        window.forceLevel6Now = () => {
            console.log('💥 FORCE LEVEL 6: Manually overriding all level checks');
            if (window.app && window.app.svgEntityManager) {
                // Force the current level to 6
                window.app.svgEntityManager.currentLevel = 6;
                window.app.svgEntityManager.premiumLevelsState.level6 = true;
                window.app.svgEntityManager.premiumLevelsState.level7 = true;
                console.log('💥 FORCED: currentLevel=6, level6=true, level7=true');
                this.showMessage('💥 LEVEL 6 FORCED!', 'success');
            }
        };
    }

    setTestingPoints(points) {
        // Update global points
        if (window.entityUIManager) {
            window.entityUIManager.totalPoints = points;
        }
        
        // Update AppSync if available
        if (window.AppSync && window.AppSync.setTotalPoints) {
            window.AppSync.setTotalPoints(points);
        }
        
        // Refresh scoreboard if open
        if (this.visible) {
            setTimeout(() => this.updateContent(), 100);
        }
    }

    showScoreboard() {
        this.visible = true;
        
        if (!this.scoreboardElement) {
            this.createScoreboard();
        }
        
        // Update content first
        this.updateContent();
        
        // Show with stable display (no transitions that can cause flashing)
        this.scoreboardElement.style.display = 'block';
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Force immediate layout to prevent any layout shifts
        this.scoreboardElement.offsetHeight; // Force reflow
    }

    hideScoreboard() {
        this.visible = false;
        if (this.scoreboardElement) {
            this.scoreboardElement.style.display = 'none';
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    createScoreboard() {
        // Remove any existing scoreboard
        const existing = document.getElementById('simple-scoreboard');
        if (existing) {
            existing.remove();
        }

        // Create scoreboard container
        this.scoreboardElement = document.createElement('div');
        this.scoreboardElement.id = 'simple-scoreboard';
        
        // Base styles - will be updated by updateLayout()
        this.scoreboardElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            z-index: 3000;
            display: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', roboto, sans-serif;
        `;

        document.body.appendChild(this.scoreboardElement);
        
        // Listen for orientation changes with proper throttling to prevent layout spam
        let orientationTimeout;
        let isUpdating = false;
        let frameRequest;
        
        window.addEventListener('orientationchange', () => {
            if (isUpdating) return; // Prevent cascading updates
            
            clearTimeout(orientationTimeout);
            orientationTimeout = setTimeout(() => {
                if (this.visible && !isUpdating) {
                    console.log('📱 Orientation change - stabilizing scoreboard layout');
                    isUpdating = true;
                    
                    if (frameRequest) cancelAnimationFrame(frameRequest);
                    frameRequest = requestAnimationFrame(() => {
                        this.updateLayout();
                        isUpdating = false;
                    });
                }
            }, 200); // Longer delay for orientation changes
        });
        
        window.addEventListener('resize', () => {
            if (isUpdating) return; // Prevent cascading updates
            
            clearTimeout(orientationTimeout);
            orientationTimeout = setTimeout(() => {
                if (this.visible && !isUpdating) {
                    isUpdating = true;
                    
                    if (frameRequest) cancelAnimationFrame(frameRequest);
                    frameRequest = requestAnimationFrame(() => {
                        this.updateLayout();
                        isUpdating = false;
                    });
                }
            }, 150);
        });
    }

    updateContent() {
        if (!this.scoreboardElement) return;
        
        // Prevent any content flashing during updates
        const container = this.scoreboardElement.querySelector('.scoreboard-container');
        if (container) {
            // Store current scroll position to prevent rebound
            const scrollableContent = container.querySelector('[style*="overflow-y: auto"]');
            const currentScrollTop = scrollableContent ? scrollableContent.scrollTop : 0;
            
            // Update content
            this.scoreboardElement.innerHTML = this.generateScoreboardHTML();
            this.updateLayout();
            
            // Restore scroll position to prevent rebound
            const newScrollableContent = this.scoreboardElement.querySelector('[style*="overflow-y: auto"]');
            if (newScrollableContent && currentScrollTop > 0) {
                newScrollableContent.scrollTop = currentScrollTop;
            }
        } else {
            // First time - create normally
            this.scoreboardElement.innerHTML = this.generateScoreboardHTML();
            this.updateLayout();
        }
    }

    updateLayout() {
        const container = this.scoreboardElement.querySelector('.scoreboard-container');
        if (!container) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isLandscape = viewportWidth > viewportHeight;

        console.log(`📱 Layout update: ${viewportWidth}x${viewportHeight}, landscape: ${isLandscape}`);

        // Apply orientation-specific styles to the main container
        if (isLandscape) {
            // LANDSCAPE: Wider, shorter modal
            container.style.width = '600px';
            container.style.maxWidth = '85vw';
            container.style.height = '70vh';
            container.style.maxHeight = '500px';
        } else {
            // PORTRAIT: Narrower, taller modal
            container.style.width = '90vw';
            container.style.maxWidth = '500px';
            container.style.height = '85vh';
            container.style.maxHeight = 'none';
        }
    }

    generateScoreboardHTML() {
        const currentPoints = this.getCurrentPoints();
        const currentLevel = this.getCurrentLevel(currentPoints);
        
        // This structure uses flexbox to ensure the header and footer are fixed
        // while the middle content area scrolls independently.
        return `
            <div class="scoreboard-container" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid #4CAF50;
                border-radius: 8px;
                color: white;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                z-index: 3000;
            ">
                <!-- Header -->
                <div style="
                    padding: 15px;
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    border-bottom: 2px solid #388E3C;
                    flex-shrink: 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Score Board</h2>
                    <button onclick="window.simpleMobileScoreboard.hideScoreboard()" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 5px 10px;
                        border-radius: 50%;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.backgroundColor='rgba(255,255,255,0.2)'" 
                       onmouseout="this.style.backgroundColor='transparent'">×</button>
                </div>
                
                <!-- Scrollable Content -->
                <div class="scoreboard-content" style="
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 15px;
                    -webkit-overflow-scrolling: touch;
                ">
                    <!-- Current Status -->
                    <div style="
                        margin-bottom: 20px;
                        padding: 15px;
                        background: rgba(76, 175, 80, 0.2);
                        border-radius: 8px;
                        border: 1px solid #4CAF50;
                        text-align: center;
                    ">
                        <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                            Level ${currentLevel}
                        </div>
                        <div style="font-size: 16px; margin-bottom: 8px;">
                            Score: ${currentPoints.toLocaleString()} points
                        </div>
                        ${this.generateNextLevelInfo(currentLevel, currentPoints)}
                    </div>
                    
                    <!-- Level Chart -->
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #4CAF50; margin-bottom: 15px; text-align: center;">
                            Level Progression
                        </h3>
                        ${this.generateLevelChart(currentPoints)}
                    </div>
                    
                    <!-- Entity Scores by Level -->
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #4CAF50; margin-bottom: 15px; text-align: center;">
                            Entity Scores by Level
                        </h3>
                        ${this.generateEntityScoresByLevel()}
                    </div>
                    
                    <!-- TESTING CONTROLS - Only visible in debug mode -->
                    ${this.isDebugMode ? `
                    <div style="
                        margin-bottom: 20px;
                        padding: 15px;
                        background: rgba(255, 193, 7, 0.2);
                        border-radius: 8px;
                        border: 1px solid #FFC107;
                    ">
                        <h4 style="color: #FFC107; margin-bottom: 15px; text-align: center;">
                            🔧 Testing Controls
                        </h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                            <button onclick="window.jumpToLevel5()" style="
                                padding: 12px 20px;
                                background: #FF9800;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: bold;
                                transition: background-color 0.2s;
                            " onmouseover="this.style.backgroundColor='#F57C00'" 
                               onmouseout="this.style.backgroundColor='#FF9800'">
                                🚀 Jump to Level 5
                            </button>
                            
                            <button onclick="window.setTestPoints(45000)" style="
                                padding: 12px 20px;
                                background: #2196F3;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                            " onmouseover="this.style.backgroundColor='#1976D2'" 
                               onmouseout="this.style.backgroundColor='#2196F3'">
                                Set 45k Points
                            </button>
                            
                            <button onclick="window.setTestPoints(55000)" style="
                                padding: 12px 20px;
                                background: #9C27B0;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                            " onmouseover="this.style.backgroundColor='#7B1FA2'" 
                               onmouseout="this.style.backgroundColor='#9C27B0'">
                                Set 55k Points
                            </button>
                            
                            <button onclick="window.togglePremium()" style="
                                padding: 12px 20px;
                                background: #FFD700;
                                color: black;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: bold;
                            " onmouseover="this.style.backgroundColor='#FFC107'" 
                               onmouseout="this.style.backgroundColor='#FFD700'">
                                👑 Toggle Premium
                            </button>
                            
                            <button onclick="window.enableLevel6Testing()" style="
                                padding: 12px 20px;
                                background: linear-gradient(45deg, #FF4081, #FF6EC7);
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                            " onmouseover="this.style.background='linear-gradient(45deg, #E91E63, #FF4081)'" 
                               onmouseout="this.style.background='linear-gradient(45deg, #FF4081, #FF6EC7)'">
                                🚀 LEVEL 6 NOW!
                            </button>
                            
                            <button onclick="window.forceLevel6Now()" style="
                                padding: 12px 20px;
                                background: linear-gradient(45deg, #FF5722, #FF9800);
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                            " onmouseover="this.style.background='linear-gradient(45deg, #D84315, #FF5722)'" 
                               onmouseout="this.style.background='linear-gradient(45deg, #FF5722, #FF9800)'">
                                💥 FORCE LEVEL 6!
                            </button>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- Action Buttons -->
                <div style="
                    padding: 15px;
                    background: rgba(255, 255, 255, 0.1);
                    border-top: 1px solid #555;
                    flex-shrink: 0;
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    flex-wrap: wrap;
                ">
                    <button onclick="window.simpleMobileScoreboard.openPremiumStore()" style="
                        padding: 12px 20px;
                        background: linear-gradient(135deg, #FFD700, #FFA000);
                        color: black;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    " onmouseover="this.style.background='linear-gradient(135deg, #FFC107, #FF8F00)'" 
                       onmouseout="this.style.background='linear-gradient(135deg, #FFD700, #FFA000)'">
                        👑 Premium Store
                    </button>
                    
                    <button onclick="location.reload()" style="
                        padding: 12px 24px;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: bold;
                    " onmouseover="this.style.backgroundColor='#45a049'" 
                       onmouseout="this.style.backgroundColor='#4CAF50'">
                        🔄 Refresh
                    </button>
                    
                    <button onclick="window.simpleMobileScoreboard.hideScoreboard()" style="
                        padding: 12px 24px;
                        background: #f44336;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: bold;
                    " onmouseover="this.style.backgroundColor='#d32f2f'" 
                       onmouseout="this.style.backgroundColor='#f44336'">
                        ✖️ Close
                    </button>
                </div>
            </div>
        `;
    }

    generateNextLevelInfo(level, points) {
        const nextThreshold = this.getNextLevelThreshold(level);
        if (!nextThreshold) {
            return '<div style="font-size: 14px; color: #4CAF50;">🏆 Max level reached!</div>';
        }
        
        const pointsNeeded = nextThreshold - points;
        if (pointsNeeded > 0) {
            return `<div style="font-size: 14px; color: #FFC107;">
                Next Level: ${pointsNeeded.toLocaleString()} points to go
            </div>`;
        } else {
            return '<div style="font-size: 14px; color: #4CAF50;">✅ Ready for next level!</div>';
        }
    }

    generateLevelChart(currentPoints) {
        const levels = [
            { level: 1, threshold: 0, title: 'Sky & Ground Creatures', subtitle: 'Airplanes, Blimps, Dogs, UFOs, Birds, Frogs' },
            { level: 2, threshold: 10000, title: 'Woodland Creatures', subtitle: 'Deer, Squirrel, Rabbit, Owl, Fox' },
            { level: 3, threshold: 20000, title: 'Mythical Creatures', subtitle: 'Dragons, Phoenix, Unicorns, Griffins, Pegasus' },
            { level: 4, threshold: 35000, title: 'Insect Kingdom', subtitle: 'Spiders, Mantis, Houseflies, Butterflies, Ladybugs' },
            { level: 5, threshold: 55000, title: 'Energy Orbs', subtitle: 'Pulsing Orbs, Spinning Discs, Sirens, Dancing Orbs, Cubes' },
            { level: 6, threshold: 80000, title: 'Bouncing Balls Bonanza', subtitle: 'Bouncing Balls, Spheres, Golden Orbs, Rainbow Balls', premium: true },
            { level: 7, threshold: 120000, title: 'UFO Invasion', subtitle: 'Scout UFOs, Warships, Motherships, Cloaked UFOs', premium: true }
        ];
        
        let chart = '';
        
        levels.forEach((levelData, index) => {
            const isCurrentLevel = currentPoints >= levelData.threshold && 
                (index === levels.length - 1 || currentPoints < levels[index + 1].threshold);
            const isUnlocked = currentPoints >= levelData.threshold;
            
            chart += `
                <div style="
                    display: flex;
                    align-items: center;
                    padding: 10px;
                    margin-bottom: 6px;
                    background: ${isCurrentLevel ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
                    border-radius: 6px;
                    border-left: 3px solid ${isUnlocked ? '#4CAF50' : '#666'};
                ">
                    <div style="
                        width: 25px;
                        height: 25px;
                        border-radius: 50%;
                        margin-right: 12px;
                        background: ${isUnlocked ? '#4CAF50' : '#666'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 12px;
                        color: white;
                    ">
                        ${levelData.level}
                    </div>
                    
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 2px; font-size: 14px;">
                            ${levelData.title}
                            ${levelData.premium ? '<span style="color: #FFD700; font-size: 10px; margin-left: 5px;">👑</span>' : ''}
                        </div>
                        <div style="font-size: 10px; color: #ccc; margin-bottom: 2px;">
                            ${levelData.subtitle}
                        </div>
                        <div style="font-size: 11px; color: #aaa;">
                            ${levelData.threshold.toLocaleString()}+ points
                        </div>
                    </div>
                    
                    <div style="font-weight: bold; font-size: 11px;">
                        ${isCurrentLevel ? '<span style="color: #4CAF50;">CURRENT</span>' : 
                          isUnlocked ? '<span style="color: #4CAF50;">✓</span>' : 
                          '<span style="color: #666;">🔒</span>'}
                    </div>
                </div>
            `;
        });
        
        return chart;
    }

    generateEntityScoresByLevel() {
        // Get entity scores from various sources
        let entityScores = {};
        
        // Get from entity UI manager if available
        if (window.entityUIManager && window.entityUIManager.sessionStats) {
            entityScores = window.entityUIManager.sessionStats;
        }
        
        // Get from SVG entity manager if available
        if (window.svgEntityManager && window.svgEntityManager.sessionStats) {
            entityScores = window.svgEntityManager.sessionStats;
        }
        
        // Show total summary first
        const totalEntities = Object.values(entityScores).reduce((sum, stats) => sum + (stats.count || 0), 0);
        const totalEntityPoints = Object.values(entityScores).reduce((sum, stats) => sum + (stats.points || 0), 0);
        
        let scoresHTML = `
            <div style="
                padding: 12px;
                background: rgba(76, 175, 80, 0.2);
                border-radius: 8px;
                border: 1px solid #4CAF50;
                margin-bottom: 15px;
                text-align: center;
            ">
                <div style="font-weight: bold; margin-bottom: 5px;">Session Summary</div>
                <div style="font-size: 14px;">
                    Entities Tapped: ${totalEntities} | Points Earned: ${totalEntityPoints.toLocaleString()}
                </div>
            </div>
        `;
        
        // Show key entities by level (simplified)
        const currentPoints = this.getCurrentPoints();
        const currentLevel = this.getCurrentLevel(currentPoints);
        
        scoresHTML += `
            <div style="
                padding: 12px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                margin-bottom: 10px;
            ">
                <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50;">
                    Current Level ${currentLevel} Entities:
                </div>
        `;
        
        if (currentLevel >= 1) {
            scoresHTML += this.generateLevelEntityRow('Level 1', ['blimp', 'airplane', 'dog', 'ufo', 'bird', 'frog'], entityScores);
        }
        if (currentLevel >= 2) {
            scoresHTML += this.generateLevelEntityRow('Level 2', ['deer', 'squirrel', 'rabbit', 'owl', 'fox'], entityScores);
        }
        if (currentLevel >= 3) {
            scoresHTML += this.generateLevelEntityRow('Level 3', ['dragon', 'phoenix', 'unicorn', 'griffin', 'pegasus'], entityScores);
        }
        if (currentLevel >= 4) {
            scoresHTML += this.generateLevelEntityRow('Level 4', ['spider', 'mantis', 'housefly', 'butterfly', 'ladybug'], entityScores);
        }
        if (currentLevel >= 5) {
            scoresHTML += this.generateLevelEntityRow('Level 5', ['bluePulsingOrb', 'yellowSpinningDisc', 'redSiren', 'dancingOrbs', 'flashingCube'], entityScores);
        }
        if (currentLevel >= 6) {
            scoresHTML += this.generateLevelEntityRow('Level 6 👑', ['redBouncingBall', 'blueSphere', 'goldenOrb', 'rainbowBall', 'megaSphere'], entityScores);
        }
        if (currentLevel >= 7) {
            scoresHTML += this.generateLevelEntityRow('Level 7 👑', ['scoutUFO', 'warshipUFO', 'mothershipUFO', 'cloakedUFO', 'swarmCommanderUFO'], entityScores);
        }
        
        scoresHTML += '</div>';
        
        // Show individual entity scores if any exist
        const hasAnyScores = Object.keys(entityScores).some(key => entityScores[key].count > 0);
        
        if (hasAnyScores) {
            scoresHTML += `
                <div style="
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    margin-top: 10px;
                ">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50;">
                        Detailed Scores:
                    </div>
            `;
            
            Object.keys(entityScores).forEach(entityType => {
                const stats = entityScores[entityType];
                const count = stats.count || 0;
                const points = stats.points || 0;
                
                if (count > 0) {
                    scoresHTML += `
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            padding: 5px 0;
                            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                            font-size: 12px;
                        ">
                            <span>${entityType.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span style="color: #4CAF50;">${count}x → ${points.toLocaleString()} pts</span>
                        </div>
                    `;
                }
            });
            
            scoresHTML += '</div>';
        } else {
            scoresHTML += `
                <div style="
                    padding: 15px;
                    text-align: center;
                    color: #ccc;
                    font-style: italic;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    margin-top: 10px;
                ">
                    No entities tapped yet. Start playing to see your scores!
                </div>
            `;
        }
        
        return scoresHTML;
    }

    generateLevelEntityRow(levelName, entityKeys, entityScores) {
        const totalTapped = entityKeys.reduce((sum, key) => sum + (entityScores[key]?.count || 0), 0);
        const totalPoints = entityKeys.reduce((sum, key) => sum + (entityScores[key]?.points || 0), 0);
        
        return `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 0;
                font-size: 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            ">
                <span style="color: #ccc;">${levelName}</span>
                <span style="color: ${totalTapped > 0 ? '#4CAF50' : '#666'};">
                    ${totalTapped > 0 ? `${totalTapped} tapped → ${totalPoints.toLocaleString()} pts` : 'Not played yet'}
                </span>
            </div>
        `;
    }

    getCurrentPoints() {
        // Try to get points from various sources
        if (window.entityUIManager && window.entityUIManager.totalPoints !== undefined) {
            return window.entityUIManager.totalPoints;
        }
        
        if (window.AppSync && window.AppSync.getTotalPoints) {
            return window.AppSync.getTotalPoints();
        }
        
        // Default for testing
        return 25000;
    }

    getCurrentLevel(points) {
        if (points >= 120000) return 7;
        if (points >= 80000) return 6;
        if (points >= 55000) return 5;
        if (points >= 35000) return 4;
        if (points >= 20000) return 3;
        if (points >= 10000) return 2;
        return 1;
    }

    getNextLevelThreshold(currentLevel) {
        const thresholds = {
            1: 10000,
            2: 20000,
            3: 30000,
            4: 55000,
            5: 80000,
            6: 120000,
            7: null // Max level
        };
        return thresholds[currentLevel];
    }

    showMessage(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 4000;
            max-width: 300px;
            word-wrap: break-word;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: opacity 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    openPremiumStore() {
        console.log('👑 Opening Premium Store from scoreboard...');
        this.hideScoreboard();
        
        try {
            // Use the webview_flutter channel registered in premium_gaming_webview_handler.dart
            if (window.openPremiumStore && typeof window.openPremiumStore.postMessage === 'function') {
                console.log('👑 Calling Flutter openPremiumStore channel');
                
                // Send JSON data as expected by PremiumGamingWebViewHandler
                const storeData = JSON.stringify({
                    productId: 'game_l4_l5',
                    source: 'scoreboard'
                });
                
                window.openPremiumStore.postMessage(storeData);
                console.log('👑 Premium Store channel called successfully');
                return;
            }
            
            console.log('👑 DEBUG: openPremiumStore channel not found');
            console.log('👑 Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('premium') || k.toLowerCase().includes('store')));
            
            // Show fallback message
            this.showMessage('👑 Use the 3-dot menu to access the Premium Store', 'info');
        } catch (error) {
            console.error('👑 Error opening Premium Store:', error);
            this.showMessage('👑 Error opening store. Use the 3-dot menu instead.', 'error');
        }
    }

    // Public methods for external access
    showFullScoreboard() {
        this.showScoreboard();
    }

    hideFullScoreboard() {
        this.hideScoreboard();
    }

    update() {
        // No 3D updates needed
    }

    render() {
        // No 3D rendering needed
    }

    dispose() {
        if (this.scoreboardElement) {
            this.scoreboardElement.remove();
            this.scoreboardElement = null;
        }
        
        // Clean up global functions
        if (window.jumpToLevel5) delete window.jumpToLevel5;
        if (window.setTestPoints) delete window.setTestPoints;
        if (window.togglePremium) delete window.togglePremium;
        if (window.enableLevel6Testing) delete window.enableLevel6Testing;
        if (window.forceLevel6Now) delete window.forceLevel6Now;
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Create global instance immediately
window.simpleMobileScoreboard = new SimpleMobileScoreboard();

// Export for both module systems
window.SimpleMobileScoreboard = SimpleMobileScoreboard;

console.log('📱 SimpleMobileScoreboard loaded and initialized');