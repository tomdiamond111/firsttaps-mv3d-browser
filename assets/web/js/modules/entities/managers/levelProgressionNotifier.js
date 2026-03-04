/**
 * LEVEL PROGRESSION NOTIFIER
 * Handles paywall notifications and level progression UI for premium gaming levels
 * 
 * Features:
 * - Level 5 → Level 6 progression notifications
 * - Level 6 → Level 7 progression notifications  
 * - Premium entitlement checks
 * - Paywall UI similar to existing Level 3 → Level 4 system
 */

class LevelProgressionNotifier {
    constructor(entityManager) {
        this.entityManager = entityManager;
        this.uiManager = entityManager.uiManager;
        
        // Track progression notifications to avoid spam
        this.notificationHistory = new Set();
        
        console.log('🎮 Level Progression Notifier initialized');
    }

    /**
     * Check if user should see Level 6 progression notification
     */
    shouldShowLevel6Notification(currentPoints, currentLevel) {
        const level6Threshold = 50000;
        const notificationKey = 'level5_to_level6';
        
        return (
            currentPoints >= level6Threshold &&
            currentLevel >= 5 &&
            !this.notificationHistory.has(notificationKey) &&
            !this.entityManager.premiumLevelsState.level6
        );
    }

    /**
     * Check if user should see Level 7 progression notification
     */
    shouldShowLevel7Notification(currentPoints, currentLevel) {
        const level7Threshold = 120000;
        const notificationKey = 'level6_to_level7';
        
        return (
            currentPoints >= level7Threshold &&
            currentLevel >= 6 &&
            !this.notificationHistory.has(notificationKey) &&
            !this.entityManager.premiumLevelsState.level7
        );
    }

    /**
     * Show Level 6 progression notification (Bouncing Balls Bonanza)
     */
    showLevel6ProgressionNotification() {
        const notificationKey = 'level5_to_level6';
        
        if (this.notificationHistory.has(notificationKey)) {
            console.log('🎮 Level 6 notification already shown');
            return;
        }

        console.log('🎮 Showing Level 6 progression notification');
        
        this.notificationHistory.add(notificationKey);
        
        // Create custom notification for Level 6
        this.showCustomProgressionPopup({
            title: '🎾 Level 6 Unlocked!',
            subtitle: 'Bouncing Balls Bonanza',
            description: 'Experience physics-based bouncing ball entities with trail effects and dynamic movement patterns!',
            features: [
                '🔴 Red Bouncing Balls with gravity physics',
                '🔵 Blue Spheres with diagonal bouncing',
                '🟡 Golden Orbs with shimmer effects',
                '🌈 Rainbow Balls that change colors',
                '⚫ Mega Spheres that split when clicked'
            ],
            pointRequirement: '50,000+ Points Required',
            entitlementName: 'game_l6_l7',
            levelNumber: 6,
            onUnlock: () => this.handleLevel6Unlock(),
            onPurchase: () => this.handleLevel6Purchase()
        });
    }

    /**
     * Show Level 7 progression notification (UFO Invasion)
     */
    showLevel7ProgressionNotification() {
        const notificationKey = 'level6_to_level7';
        
        if (this.notificationHistory.has(notificationKey)) {
            console.log('🎮 Level 7 notification already shown');
            return;
        }

        console.log('🎮 Showing Level 7 progression notification');
        
        this.notificationHistory.add(notificationKey);
        
        // Create custom notification for Level 7
        this.showCustomProgressionPopup({
            title: '🛸 Level 7 Unlocked!',
            subtitle: 'UFO Invasion',
            description: 'Command the skies with advanced UFO entities featuring formation flying, cloaking technology, and swarm tactics!',
            features: [
                '🔍 Scout UFOs with rapid reconnaissance',
                '⚔️ Warship UFOs with weapon systems',
                '🚁 Mothership UFOs with energy rings',
                '👻 Cloaked UFOs with phase shifting',
                '👑 Swarm Commanders with mini-UFO fleets'
            ],
            pointRequirement: '60,000+ Points Required',
            entitlementName: 'game_l6_l7',
            levelNumber: 7,
            onUnlock: () => this.handleLevel7Unlock(),
            onPurchase: () => this.handleLevel7Purchase()
        });
    }

    /**
     * Show custom progression popup (similar to existing premium popup system)
     */
    showCustomProgressionPopup(config) {
        // Remove any existing popup
        this.removeExistingPopup();

        // Create popup container
        this.progressionPopup = document.createElement('div');
        this.progressionPopup.id = 'levelProgressionPopup';
        this.progressionPopup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-in;
            font-family: Arial, sans-serif;
        `;

        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.style.cssText = `
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            border: 3px solid #ffd700;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            text-align: center;
            color: white;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
            position: relative;
            animation: slideInScale 0.4s ease-out;
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = config.title;
        title.style.cssText = `
            margin: 0 0 10px 0;
            font-size: 28px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            color: #ffd700;
        `;

        // Subtitle
        const subtitle = document.createElement('h3');
        subtitle.textContent = config.subtitle;
        subtitle.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 20px;
            color: #87ceeb;
            font-style: italic;
        `;

        // Description
        const description = document.createElement('p');
        description.textContent = config.description;
        description.style.cssText = `
            margin: 0 0 25px 0;
            font-size: 16px;
            line-height: 1.4;
            color: #e0e0e0;
        `;

        // Features list
        const featuresContainer = document.createElement('div');
        featuresContainer.style.cssText = `
            text-align: left;
            margin: 0 0 25px 0;
            padding: 15px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
        `;

        config.features.forEach(feature => {
            const featureItem = document.createElement('div');
            featureItem.textContent = feature;
            featureItem.style.cssText = `
                margin: 8px 0;
                font-size: 14px;
                color: #ffffff;
                padding-left: 10px;
            `;
            featuresContainer.appendChild(featureItem);
        });

        // Point requirement
        const pointReq = document.createElement('div');
        pointReq.textContent = config.pointRequirement;
        pointReq.style.cssText = `
            margin: 0 0 25px 0;
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            background: rgba(255, 215, 0, 0.1);
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #ffd700;
        `;

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        `;

        // Purchase button
        const purchaseButton = document.createElement('button');
        purchaseButton.textContent = 'Unlock Level ' + config.levelNumber;
        purchaseButton.style.cssText = `
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;

        purchaseButton.onmouseover = () => {
            purchaseButton.style.transform = 'translateY(-2px)';
            purchaseButton.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
        };

        purchaseButton.onmouseout = () => {
            purchaseButton.style.transform = 'translateY(0)';
            purchaseButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };

        purchaseButton.onclick = () => {
            config.onPurchase();
            this.removeExistingPopup();
        };

        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Maybe Later';
        closeButton.style.cssText = `
            background: linear-gradient(135deg, #666, #555);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;

        closeButton.onclick = () => {
            this.removeExistingPopup();
        };

        // Assemble popup
        buttonContainer.appendChild(purchaseButton);
        buttonContainer.appendChild(closeButton);

        popupContent.appendChild(title);
        popupContent.appendChild(subtitle);
        popupContent.appendChild(description);
        popupContent.appendChild(featuresContainer);
        popupContent.appendChild(pointReq);
        popupContent.appendChild(buttonContainer);

        this.progressionPopup.appendChild(popupContent);

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideInScale {
                from { 
                    transform: scale(0.8) translateY(-20px);
                    opacity: 0;
                }
                to { 
                    transform: scale(1) translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        // Add to page
        document.body.appendChild(this.progressionPopup);

        console.log(`🎮 Level ${config.levelNumber} progression popup displayed`);
    }

    /**
     * Remove existing popup
     */
    removeExistingPopup() {
        if (this.progressionPopup) {
            this.progressionPopup.remove();
            this.progressionPopup = null;
        }
    }

    /**
     * Handle Level 6 unlock
     */
    handleLevel6Unlock() {
        console.log('🎮 Level 6 unlocked through progression');
        
        // Enable Level 6 in the entity manager
        this.entityManager.premiumLevelsState.level6 = true;
        
        // Recalculate level to trigger Level 6 entities
        this.entityManager.calculateLevel();
        
        // Update UI
        this.entityManager.updateUIManagerData();
        this.uiManager.updateScoreUI();
        
        // Show success notification
        this.showUnlockSuccessNotification(6, 'Bouncing Balls Bonanza');
    }

    /**
     * Handle Level 7 unlock
     */
    handleLevel7Unlock() {
        console.log('🎮 Level 7 unlocked through progression');
        
        // Enable Level 7 in the entity manager
        this.entityManager.premiumLevelsState.level7 = true;
        
        // Recalculate level
        this.entityManager.calculateLevel();
        
        // Update UI
        this.entityManager.updateUIManagerData();
        this.uiManager.updateScoreUI();
        
        // Show success notification
        this.showUnlockSuccessNotification(7, 'UFO Invasion');
    }

    /**
     * Handle Level 6 purchase (redirect to premium store)
     */
    handleLevel6Purchase() {
        console.log('🎮 Redirecting to premium store for Level 6 purchase');
        
        // This would communicate with Flutter to open the premium store
        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('openPremiumStore', {
                productId: 'game_l6_l7',
                levelNumber: 6
            });
        }
    }

    /**
     * Handle Level 7 purchase (redirect to premium store)
     */
    handleLevel7Purchase() {
        console.log('🎮 Redirecting to premium store for Level 7 purchase');
        
        // This would communicate with Flutter to open the premium store
        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('openPremiumStore', {
                productId: 'game_l6_l7',
                levelNumber: 7
            });
        }
    }

    /**
     * Show unlock success notification
     */
    showUnlockSuccessNotification(levelNumber, levelName) {
        // Create simple success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10001;
            animation: slideInRight 0.3s ease-out;
        `;

        notification.textContent = `🎉 Level ${levelNumber} Unlocked! ${levelName}`;

        // Add CSS for animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { 
                    transform: translateX(100%);
                    opacity: 0;
                }
                to { 
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    /**
     * Check for progression opportunities
     */
    checkProgressionOpportunities(currentPoints, currentLevel) {
        // Check Level 6 progression
        if (this.shouldShowLevel6Notification(currentPoints, currentLevel)) {
            this.showLevel6ProgressionNotification();
        }
        
        // Check Level 7 progression
        if (this.shouldShowLevel7Notification(currentPoints, currentLevel)) {
            this.showLevel7ProgressionNotification();
        }
    }

    /**
     * Reset notification history (for testing)
     */
    resetNotificationHistory() {
        this.notificationHistory.clear();
        console.log('🎮 Level progression notification history reset');
    }
}

// Make globally accessible
window.LevelProgressionNotifier = LevelProgressionNotifier;

console.log('🎮 Level Progression Notifier module loaded');