/**
 * JavaScript Testing Bridge - Provides testing functionality in the webview
 * This script sets up the testing environment and connects to Flutter's LevelTestingHelper
 * Compatible with bundle system (no ES6 imports/exports)
 */

class JavaScriptTestingBridge {
    constructor() {
        this.isInitialized = false;
        this.debugMode = false;
        this.initialize();
    }

    initialize() {
        // Set up the testing environment
        this.setupGlobalTestingHelper();
        this.enableDebugMode();
        this.isInitialized = true;
        
        console.log('🔧 JavaScript Testing Bridge initialized');
        console.log('📱 Testing functions available: jumpToLevel5, setTestPoints, togglePremiumTesting');
    }

    setupGlobalTestingHelper() {
        // Create a global LevelTestingHelper object
        window.LevelTestingHelper = {
            jumpToLevel5: this.jumpToLevel5.bind(this),
            setTestingPoints: this.setTestingPoints.bind(this),
            enablePremiumTesting: this.enablePremiumTesting.bind(this),
            isAvailable: () => true
        };
    }

    enableDebugMode() {
        this.debugMode = true;
        
        // Enable debug mode on the scoreboard if it exists
        if (window.entityUIManager && window.entityUIManager.scoreBillboard) {
            window.entityUIManager.scoreBillboard.enableDebugMode();
        }
        
        console.log('🔧 Debug mode enabled - testing controls will be visible');
    }

    jumpToLevel5() {
        console.log('🚀 JavaScript Bridge: Jumping to Level 5');
        
        try {
            // Set points to Level 5 threshold (40,000 points)
            this.setTestingPoints(40000);
            
            // Also update any existing UI
            if (window.entityUIManager) {
                window.entityUIManager.totalPoints = 40000;
                
                // Trigger UI update if needed
                if (window.entityUIManager.updateScoreboard) {
                    window.entityUIManager.updateScoreboard();
                }
            }
            
            // Show success message
            this.showTestingMessage('✅ Jumped to Level 5! (40,000 points)', 'success');
            
        } catch (error) {
            console.error('Error jumping to Level 5:', error);
            this.showTestingMessage('❌ Error jumping to Level 5', 'error');
        }
    }

    setTestingPoints(points) {
        console.log(`📊 JavaScript Bridge: Setting testing points to ${points}`);
        
        try {
            // Update the global points
            if (window.entityUIManager) {
                window.entityUIManager.totalPoints = points;
            }
            
            // Update AppSync if available
            if (window.AppSync && window.AppSync.setTotalPoints) {
                window.AppSync.setTotalPoints(points);
            }
            
            // Show success message
            this.showTestingMessage(`📊 Points set to ${points.toLocaleString()}!`, 'success');
            
            // Refresh any visible scoreboard
            setTimeout(() => {
                const scoreboard = document.getElementById('full-scoreboard');
                if (scoreboard && scoreboard.style.display !== 'none') {
                    // Trigger scoreboard refresh
                    const event = new CustomEvent('scoreboardRefresh');
                    window.dispatchEvent(event);
                }
            }, 100);
            
        } catch (error) {
            console.error('Error setting testing points:', error);
            this.showTestingMessage('❌ Error setting points', 'error');
        }
    }

    enablePremiumTesting() {
        console.log('👑 JavaScript Bridge: Enabling premium testing');
        
        try {
            // Set a flag for premium testing
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
            
            // Show success message
            this.showTestingMessage('👑 Premium testing enabled!', 'success');
            
        } catch (error) {
            console.error('Error enabling premium testing:', error);
            this.showTestingMessage('❌ Error enabling premium', 'error');
        }
    }

    showTestingMessage(message, type = 'info') {
        // Create a temporary notification
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
            transition: opacity 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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

    // Method to check if testing is enabled
    isTestingEnabled() {
        return this.debugMode || 
               window.location.hostname === 'localhost' || 
               window.location.href.includes('test') ||
               this.isInitialized;
    }
}

// Initialize the testing bridge immediately when this script loads
const testingBridge = new JavaScriptTestingBridge();

// Make it available globally for other scripts
window.JavaScriptTestingBridge = testingBridge;