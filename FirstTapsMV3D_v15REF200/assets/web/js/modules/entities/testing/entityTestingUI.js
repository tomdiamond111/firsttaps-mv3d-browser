/**
 * ENTITY TESTING UI COMPONENT
 * Provides temporary testing buttons for level progression during development
 * Only active in debug/testing mode
 */

class EntityTestingUI {
    constructor(entityManager, uiManager) {
        this.entityManager = entityManager;
        this.uiManager = uiManager;
        this.testingContainer = null;
        this.isVisible = false;
        
        // Only create in testing environment
        this.isTestingMode = this.checkTestingMode();
        
        if (this.isTestingMode) {
            console.log('🧪 Entity Testing UI initialized');
            this.createTestingButtons();
        }
    }

    /**
     * Check if we're in testing mode
     */
    checkTestingMode() {
        // Check for various testing indicators
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
        const hasTestParam = window.location.search.includes('testing=true');
        const isDebugBuild = window.location.search.includes('debug=true');
        
        return isLocalhost || hasTestParam || isDebugBuild;
    }

    /**
     * Create testing buttons and add to score UI
     */
    createTestingButtons() {
        if (!this.isTestingMode) return;

        // Create testing container
        this.testingContainer = document.createElement('div');
        this.testingContainer.id = 'entityTestingUI';
        this.testingContainer.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(255, 0, 0, 0.8);
            border: 2px solid #ff6666;
            border-radius: 8px;
            padding: 10px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: white;
            z-index: 9999;
            min-width: 140px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;

        // Testing mode header
        const header = document.createElement('div');
        header.textContent = '🧪 TESTING MODE';
        header.style.cssText = `
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
            font-size: 11px;
            background: rgba(0,0,0,0.3);
            padding: 5px;
            border-radius: 4px;
        `;

        // Level 5 button (primary testing button)
        const level5Button = document.createElement('button');
        level5Button.textContent = '🎮 Jump to Level 5';
        level5Button.style.cssText = this.getButtonStyle('#4CAF50');
        level5Button.onclick = () => this.jumpToLevel5();

        // Level 6 threshold button
        const level6Button = document.createElement('button');
        level6Button.textContent = '🎾 Level 6 Threshold';
        level6Button.style.cssText = this.getButtonStyle('#2196F3');
        level6Button.onclick = () => this.jumpToLevel6Threshold();

        // Level 7 threshold button
        const level7Button = document.createElement('button');
        level7Button.textContent = '🛸 Level 7 Threshold';
        level7Button.style.cssText = this.getButtonStyle('#9C27B0');
        level7Button.onclick = () => this.jumpToLevel7Threshold();

        // Add points button
        const addPointsButton = document.createElement('button');
        addPointsButton.textContent = '+ 5000 Points';
        addPointsButton.style.cssText = this.getButtonStyle('#FF9800');
        addPointsButton.onclick = () => this.addTestingPoints(5000);

        // Reset button
        const resetButton = document.createElement('button');
        resetButton.textContent = '🔄 Reset Game';
        resetButton.style.cssText = this.getButtonStyle('#F44336');
        resetButton.onclick = () => this.resetGameState();

        // Enable premium button
        const premiumButton = document.createElement('button');
        premiumButton.textContent = '👑 Enable Premium';
        premiumButton.style.cssText = this.getButtonStyle('#FFC107');
        premiumButton.onclick = () => this.enablePremiumLevels();

        // Current state display
        const stateDisplay = document.createElement('div');
        stateDisplay.id = 'testingStateDisplay';
        stateDisplay.style.cssText = `
            margin-top: 10px;
            padding: 8px;
            background: rgba(0,0,0,0.4);
            border-radius: 4px;
            font-size: 10px;
            line-height: 1.3;
        `;

        // Assemble container
        this.testingContainer.appendChild(header);
        this.testingContainer.appendChild(level5Button);
        this.testingContainer.appendChild(level6Button);
        this.testingContainer.appendChild(level7Button);
        this.testingContainer.appendChild(addPointsButton);
        this.testingContainer.appendChild(resetButton);
        this.testingContainer.appendChild(premiumButton);
        this.testingContainer.appendChild(stateDisplay);

        // Add to page
        document.body.appendChild(this.testingContainer);

        // Update state display initially
        this.updateStateDisplay();

        // Update state display every 2 seconds
        setInterval(() => this.updateStateDisplay(), 2000);

        console.log('🧪 Testing buttons created and added to UI');
    }

    /**
     * Get consistent button styling
     */
    getButtonStyle(backgroundColor) {
        return `
            display: block;
            width: 100%;
            background: ${backgroundColor};
            color: white;
            border: none;
            padding: 6px 8px;
            margin: 3px 0;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
    }

    /**
     * Jump to Level 5 (45,000 points)
     */
    jumpToLevel5() {
        console.log('🧪 Testing: Jumping to Level 5');
        
        this.entityManager.totalPoints = 45000;
        this.entityManager.calculateLevel();
        this.entityManager.updateUIManagerData();
        this.uiManager.updateScoreUI();
        
        this.showTestingNotification('Level 5 Activated (45,000 pts)', '#4CAF50');
        this.updateStateDisplay();
    }

    /**
     * Jump to Level 6 threshold (50,000 points)
     */
    jumpToLevel6Threshold() {
        console.log('🧪 Testing: Jumping to Level 6 threshold');
        
        this.entityManager.totalPoints = 50000;
        this.entityManager.calculateLevel();
        this.entityManager.updateUIManagerData();
        this.uiManager.updateScoreUI();
        
        this.showTestingNotification('Level 6 Threshold (50,000 pts)', '#2196F3');
        this.updateStateDisplay();
    }

    /**
     * Jump to Level 7 threshold (120,000 points)
     */
    jumpToLevel7Threshold() {
        console.log('🧪 Testing: Jumping to Level 7 threshold');
        
        this.entityManager.totalPoints = 120000;
        this.entityManager.calculateLevel();
        this.entityManager.updateUIManagerData();
        this.uiManager.updateScoreUI();
        
        this.showTestingNotification('Level 7 Threshold (120,000 pts)', '#9C27B0');
        this.updateStateDisplay();
    }

    /**
     * Add testing points
     */
    addTestingPoints(points) {
        console.log(`🧪 Testing: Adding ${points} points`);
        
        const oldPoints = this.entityManager.totalPoints;
        this.entityManager.totalPoints += points;
        this.entityManager.calculateLevel();
        this.entityManager.updateUIManagerData();
        this.uiManager.updateScoreUI();
        
        this.showTestingNotification(`+${points} points (${oldPoints} → ${this.entityManager.totalPoints})`, '#FF9800');
        this.updateStateDisplay();
    }

    /**
     * Reset game state
     */
    resetGameState() {
        console.log('🧪 Testing: Resetting game state');
        
        // Reset core values
        this.entityManager.totalPoints = 0;
        this.entityManager.currentLevel = 1;
        this.entityManager.hasShownPremiumPopup = false;
        
        // Clear entities
        this.entityManager.activeEntities.forEach(entity => {
            if (entity.cleanup) entity.cleanup();
        });
        this.entityManager.activeEntities.clear();
        this.entityManager.activeSessions.clear();
        
        // Reset premium levels
        Object.keys(this.entityManager.premiumLevelsState).forEach(key => {
            this.entityManager.premiumLevelsState[key] = false;
        });
        
        // Update UI
        this.entityManager.calculateLevel();
        this.entityManager.updateUIManagerData();
        this.uiManager.updateScoreUI();
        
        this.showTestingNotification('Game State Reset', '#F44336');
        this.updateStateDisplay();
    }

    /**
     * Enable premium levels for testing
     */
    enablePremiumLevels() {
        console.log('🧪 Testing: Enabling all premium levels');
        
        this.entityManager.premiumLevelsState.level4 = true;
        this.entityManager.premiumLevelsState.level5 = true;
        this.entityManager.premiumLevelsState.level6 = true;
        this.entityManager.premiumLevelsState.level7 = true;
        
        this.showTestingNotification('Premium Levels Enabled', '#FFC107');
        this.updateStateDisplay();
    }

    /**
     * Show testing notification
     */
    showTestingNotification(message, color) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50px;
            left: 20px;
            background: ${color};
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            animation: slideInLeft 0.3s ease-out;
        `;

        notification.textContent = `🧪 ${message}`;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInLeft {
                from { transform: translateX(-100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Auto-remove after 2 seconds
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    /**
     * Update state display
     */
    updateStateDisplay() {
        const stateDisplay = document.getElementById('testingStateDisplay');
        if (!stateDisplay || !this.entityManager) return;

        const state = {
            points: this.entityManager.totalPoints?.toLocaleString() || '0',
            level: this.entityManager.currentLevel || 1,
            entities: this.entityManager.activeEntities?.size || 0,
            premium: this.getPremiumStatus()
        };

        stateDisplay.innerHTML = `
            <div>Points: ${state.points}</div>
            <div>Level: ${state.level}</div>
            <div>Entities: ${state.entities}</div>
            <div>Premium: ${state.premium}</div>
        `;
    }

    /**
     * Get premium status summary
     */
    getPremiumStatus() {
        if (!this.entityManager.premiumLevelsState) return 'None';
        
        const enabled = [];
        Object.entries(this.entityManager.premiumLevelsState).forEach(([key, value]) => {
            if (value) {
                enabled.push(key.replace('level', 'L'));
            }
        });
        
        return enabled.length > 0 ? enabled.join(',') : 'None';
    }

    /**
     * Show/hide testing UI
     */
    toggle() {
        if (!this.testingContainer) return;
        
        this.isVisible = !this.isVisible;
        this.testingContainer.style.display = this.isVisible ? 'block' : 'none';
    }

    /**
     * Remove testing UI
     */
    remove() {
        if (this.testingContainer) {
            this.testingContainer.remove();
            this.testingContainer = null;
        }
    }

    /**
     * Check if testing UI is active
     */
    get isActive() {
        return this.isTestingMode && this.testingContainer !== null;
    }
}

// Make globally accessible
window.EntityTestingUI = EntityTestingUI;

console.log('🧪 Entity Testing UI module loaded');