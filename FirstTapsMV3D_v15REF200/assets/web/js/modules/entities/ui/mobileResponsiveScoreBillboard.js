/**
 * MobileResponsiveScoreBillboard - A responsive score billboard for mobile devices
 * Handles orientation changes and provides smooth user experience
 */
class MobileResponsiveScoreBillboard {
    constructor(position = { x: 0, y: 0, z: 0 }) {
        // Initialize base properties without calling super()
        this.position = position;
        this.type = 'MobileResponsiveScoreBillboard';
        this.visible = false;
        this.fullScoreboard = null;
        this.debugMode = false;
        
        // Store window references for responsive behavior
        this.currentWidth = window.innerWidth;
        this.currentHeight = window.innerHeight;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        // Listen for resize events
        window.addEventListener('resize', () => {
            this.handleOrientationChange();
        });
    }

    handleOrientationChange() {
        if (this.visible && this.fullScoreboard) {
            // Update stored dimensions
            this.currentWidth = window.innerWidth;
            this.currentHeight = window.innerHeight;
            
            // Update the scoreboard layout
            this.updateResponsiveLayout();
        }
    }

    updateResponsiveLayout() {
        const container = this.fullScoreboard.querySelector('.scoreboard-container');
        if (container) {
            const isPortrait = this.currentWidth < this.currentHeight;
            
            // Update container size and position
            container.style.width = isPortrait ? 'min(90vw, 400px)' : 'min(500px, 90vw)';
            container.style.height = isPortrait ? 'min(80vh, 600px)' : 'min(500px, 80vh)';
            
            // Force recentering
            container.style.position = 'fixed';
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
        }
    }

    showFullScoreboard() {
        this.visible = true;
        
        if (!this.fullScoreboard) {
            this.createFullScoreboard();
        }
        
        // Update content and show
        this.updateScoreboardContent();
        this.fullScoreboard.style.display = 'block';
        this.updateResponsiveLayout();
    }

    hideFullScoreboard() {
        this.visible = false;
        if (this.fullScoreboard) {
            this.fullScoreboard.style.display = 'none';
        }
    }

    createFullScoreboard() {
        // Remove any existing scoreboard
        const existing = document.getElementById('full-scoreboard');
        if (existing) {
            existing.remove();
        }

        // Create new scoreboard
        this.fullScoreboard = document.createElement('div');
        this.fullScoreboard.id = 'full-scoreboard';
        this.fullScoreboard.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            z-index: 3000;
            display: none;
            overflow: hidden;
        `;

        document.body.appendChild(this.fullScoreboard);
        this.updateScoreboardContent();
    }

    updateScoreboardContent() {
        if (!this.fullScoreboard) return;

        const isPortrait = this.currentWidth < this.currentHeight;
        
        this.fullScoreboard.innerHTML = 
            '<div class="scoreboard-container" style="' +
                'width: ' + (isPortrait ? 'min(90vw, 400px)' : 'min(500px, 90vw)') + ';' +
                'height: ' + (isPortrait ? 'min(80vh, 600px)' : 'min(500px, 80vh)') + ';' +
                'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);' +
                'background: rgba(0, 0, 0, 0.95); color: white; border-radius: 15px;' +
                'border: 2px solid #4CAF50; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);' +
                'overflow: hidden; display: flex; flex-direction: column; z-index: 3001;' +
                'font-family: &quot;Segoe UI&quot;, Tahoma, Geneva, Verdana, sans-serif;">' +
                
                '<div class="scoreboard-header" style="' +
                    'padding: 15px 20px; background: linear-gradient(135deg, #4CAF50, #45a049);' +
                    'color: white; text-align: center; border-bottom: 2px solid #388E3C;' +
                    'box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); position: relative;">' +
                    '<h2 style="margin: 0; font-size: 24px; font-weight: bold;">Score Board</h2>' +
                    '<button class="close-btn" onclick="this.closest(\'#full-scoreboard\').style.display=\'none\'" style="' +
                        'position: absolute; top: 10px; right: 15px; background: none; border: none;' +
                        'color: white; font-size: 20px; cursor: pointer; width: 30px; height: 30px;' +
                        'border-radius: 50%; display: flex; align-items: center; justify-content: center;' +
                        'transition: background-color 0.2s;">×</button>' +
                '</div>' +
                
                '<div class="scoreboard-content" style="' +
                    'flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;' +
                    'padding: 20px; scrollbar-width: thin; scrollbar-color: #4CAF50 #2E2E2E;">' +
                    this.generateScoreContent() +
                '</div>' +
                
                '<div class="scoreboard-actions" style="' +
                    'padding: 15px 20px; background: rgba(255, 255, 255, 0.1);' +
                    'border-top: 1px solid #555; display: flex; gap: 10px; justify-content: center;' +
                    'flex-wrap: wrap;">' +
                    this.generateActionButtons() +
                '</div>' +
            '</div>';
    }

    generateScoreContent() {
        let content = '';
        
        // Current game status
        const currentPoints = this.getCurrentPoints();
        const currentLevel = this.getCurrentLevel(currentPoints);
        
        content += '<div style="margin-bottom: 20px; text-align: center; padding: 15px; background: rgba(76, 175, 80, 0.2); border-radius: 10px; border: 1px solid #4CAF50;">';
        content += this.generateLevelDisplay(currentLevel, currentPoints);
        content += '</div>';
        
        // Level progression chart
        content += '<div style="margin-bottom: 20px;">';
        content += '<h3 style="color: #4CAF50; margin-bottom: 15px; text-align: center;">Level Progression</h3>';
        content += this.generateLevelChart(currentPoints);
        content += '</div>';
        
        // Testing controls (if enabled)
        if (this.isTestingEnabled()) {
            content += '<div style="margin-bottom: 20px; padding: 15px; background: rgba(255, 193, 7, 0.2); border-radius: 10px; border: 1px solid #FFC107;">';
            content += '<h4 style="color: #FFC107; margin-bottom: 10px; text-align: center;">🔧 Testing Controls</h4>';
            content += this.generateTestingControls();
            content += '</div>';
        }
        
        return content;
    }

    generateLevelDisplay(level, points) {
        let levelInfo = '<div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Level ' + level + '</div>';
        levelInfo += '<div style="font-size: 16px; margin-bottom: 10px;">Current Score: ' + points.toLocaleString() + ' points</div>';
        
        const nextLevelThreshold = this.getNextLevelThreshold(level);
        if (nextLevelThreshold) {
            const pointsNeeded = nextLevelThreshold - points;
            if (pointsNeeded > 0) {
                levelInfo += '<div style="font-size: 14px; color: #FFC107;">Next Level: ' + pointsNeeded.toLocaleString() + ' points to go</div>';
            } else {
                levelInfo += '<div style="font-size: 14px; color: #4CAF50;">✅ Ready for next level!</div>';
            }
        }
        
        return levelInfo;
    }

    generateLevelChart(currentPoints) {
        const levels = [
            { level: 1, threshold: 0, title: 'Beginner' },
            { level: 2, threshold: 10000, title: 'Explorer' },
            { level: 3, threshold: 20000, title: 'Advanced' },
            { level: 4, threshold: 35000, title: 'Expert' },
            { level: 5, threshold: 55000, title: 'Master', premium: false },
            { level: 6, threshold: 80000, title: 'Bouncing Balls Bonanza', premium: true },
            { level: 7, threshold: 120000, title: 'UFO Invasion', premium: true }
        ];
        
        let chart = '';
        
        levels.forEach((levelData, index) => {
            const isCurrentLevel = currentPoints >= levelData.threshold && 
                (index === levels.length - 1 || currentPoints < levels[index + 1].threshold);
            const isUnlocked = currentPoints >= levelData.threshold;
            
            chart += '<div style="' +
                'display: flex; align-items: center; padding: 10px; margin-bottom: 8px;' +
                'background: ' + (isCurrentLevel ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)') + ';' +
                'border-radius: 8px; border-left: 4px solid ' + (isUnlocked ? '#4CAF50' : '#666') + ';' +
                '">';
            
            // Level indicator
            chart += '<div style="' +
                'width: 30px; height: 30px; border-radius: 50%; margin-right: 15px;' +
                'background: ' + (isUnlocked ? '#4CAF50' : '#666') + ';' +
                'display: flex; align-items: center; justify-content: center;' +
                'font-weight: bold; font-size: 14px;">' +
                levelData.level +
                '</div>';
            
            // Level info
            chart += '<div style="flex: 1;">';
            chart += '<div style="font-weight: bold; margin-bottom: 2px;">' + levelData.title;
            if (levelData.premium) {
                chart += ' <span style="color: #FFD700; font-size: 12px;">👑 PREMIUM</span>';
            }
            chart += '</div>';
            chart += '<div style="font-size: 12px; color: #ccc;">' + levelData.threshold.toLocaleString() + '+ points</div>';
            chart += '</div>';
            
            // Status indicator
            if (isCurrentLevel) {
                chart += '<div style="color: #4CAF50; font-weight: bold;">CURRENT</div>';
            } else if (isUnlocked) {
                chart += '<div style="color: #4CAF50;">✓</div>';
            } else {
                chart += '<div style="color: #666;">🔒</div>';
            }
            
            chart += '</div>';
        });
        
        return chart;
    }

    generateTestingControls() {
        let controls = '';
        
        controls += '<div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">';
        
        // Jump to Level 5 button (this is what the user is looking for)
        controls += '<button onclick="window.jumpToLevel5()" style="' +
            'padding: 8px 16px; background: #FF9800; color: white; border: none;' +
            'border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;' +
            'transition: background-color 0.2s;">🚀 Jump to Level 5</button>';
        
        // Set test points buttons
        controls += '<button onclick="window.setTestPoints(45000)" style="' +
            'padding: 8px 16px; background: #2196F3; color: white; border: none;' +
            'border-radius: 5px; cursor: pointer; font-size: 14px;">Set 45k Points</button>';
        
        controls += '<button onclick="window.setTestPoints(55000)" style="' +
            'padding: 8px 16px; background: #9C27B0; color: white; border: none;' +
            'border-radius: 5px; cursor: pointer; font-size: 14px;">Set 55k Points</button>';
        
        // Premium testing toggle
        controls += '<button onclick="window.togglePremiumTesting()" style="' +
            'padding: 8px 16px; background: #FFD700; color: black; border: none;' +
            'border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">👑 Toggle Premium</button>';
        
        controls += '</div>';
        
        return controls;
    }

    generateActionButtons() {
        let buttons = '';
        
        // Refresh button
        buttons += '<button onclick="location.reload()" style="' +
            'padding: 12px 24px; background: #4CAF50; color: white; border: none;' +
            'border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;' +
            'transition: background-color 0.2s; min-width: 100px;">🔄 Refresh</button>';
        
        // Close button
        buttons += '<button onclick="document.getElementById(\'full-scoreboard\').style.display=\'none\'" style="' +
            'padding: 12px 24px; background: #f44336; color: white; border: none;' +
            'border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;' +
            'transition: background-color 0.2s; min-width: 100px;">✖️ Close</button>';
        
        return buttons;
    }

    getCurrentPoints() {
        // Try to get points from various sources
        if (window.AppSync && window.AppSync.getTotalPoints) {
            return window.AppSync.getTotalPoints();
        }
        
        if (window.entityUIManager && window.entityUIManager.totalPoints !== undefined) {
            return window.entityUIManager.totalPoints;
        }
        
        // Default fallback
        return 25000;
    }

    getCurrentLevel(points) {
        if (points >= 60000) return 7;
        if (points >= 50000) return 6;
        if (points >= 40000) return 5;
        if (points >= 30000) return 4;
        if (points >= 20000) return 3;
        if (points >= 10000) return 2;
        return 1;
    }

    getNextLevelThreshold(currentLevel) {
        const thresholds = {
            1: 10000,
            2: 20000,
            3: 30000,
            4: 40000,
            5: 50000,
            6: 60000,
            7: null // Max level
        };
        return thresholds[currentLevel];
    }

    isTestingEnabled() {
        // Check if we're in testing/debug mode
        return this.debugMode || 
               window.location.hostname === 'localhost' || 
               window.location.href.includes('test') ||
               window.LevelTestingHelper !== undefined;
    }

    enableDebugMode() {
        this.debugMode = true;
        console.log('🔧 Debug mode enabled for scoreboard');
    }

    update() {
        // Base entity update - no rendering needed for this UI element
    }

    render(renderer, scene) {
        // This is a pure UI element, no 3D rendering needed
    }

    dispose() {
        // Clean up event listeners
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        window.removeEventListener('resize', this.handleOrientationChange);
        
        // Remove DOM elements
        if (this.fullScoreboard) {
            this.fullScoreboard.remove();
            this.fullScoreboard = null;
        }
        
        // Clean up global functions
        if (window.jumpToLevel5) delete window.jumpToLevel5;
        if (window.setTestPoints) delete window.setTestPoints;
        if (window.togglePremiumTesting) delete window.togglePremiumTesting;
    }
}

// Initialize global testing functions when the class loads
if (typeof window !== 'undefined') {
    // Jump to Level 5 function
    window.jumpToLevel5 = () => {
        console.log('🚀 Jumping to Level 5 for testing...');
        if (window.LevelTestingHelper) {
            window.LevelTestingHelper.jumpToLevel5();
        }
        // Close scoreboard after action
        const scoreboard = document.getElementById('full-scoreboard');
        if (scoreboard) scoreboard.style.display = 'none';
    };
    
    // Set test points function
    window.setTestPoints = (points) => {
        console.log('Setting test points to: ' + points);
        if (window.LevelTestingHelper) {
            window.LevelTestingHelper.setTestingPoints(points);
        }
        // Refresh scoreboard
        setTimeout(() => {
            const scoreboard = document.getElementById('full-scoreboard');
            if (scoreboard && scoreboard.style.display !== 'none') {
                // Trigger a refresh of the scoreboard content
                const event = new CustomEvent('scoreboardRefresh');
                window.dispatchEvent(event);
            }
        }, 100);
    };
    
    // Toggle premium testing function
    window.togglePremiumTesting = () => {
        console.log('Toggling premium testing mode...');
        if (window.LevelTestingHelper) {
            window.LevelTestingHelper.enablePremiumTesting();
        }
    };
}