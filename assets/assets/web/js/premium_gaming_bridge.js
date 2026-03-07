/**
 * PREMIUM GAMING POPUP BRIDGE
 * Establishes communication between JavaScript and Flutter for premium gaming popups
 * Replaces the missing PremiumGamingPopupChannel functionality
 */

(function() {
    'use strict';
    
    console.log('🎮 Loading Premium Gaming Popup Bridge...');

    class PremiumGamingPopupBridge {
        constructor() {
            this.isFlutterReady = false;
            this.pendingRequests = [];
            
            this.setupFlutterBridge();
            this.setupFallbackDetection();
            this.enablePremiumLevelsForTesting();
            
            console.log('🎮 Premium Gaming Popup Bridge initialized');
        }
        
        /**
         * Enable premium levels for testing purposes
         */
        enablePremiumLevelsForTesting() {
            console.log('🎮 Enabling premium gaming levels for testing...');
            
            // Set localStorage flags for testing
            localStorage.setItem('test_premium_level_4', 'true');
            localStorage.setItem('test_premium_level_5', 'true');
            
            // Directly enable premium levels in entity manager if available
            setTimeout(() => {
                if (window.app && window.app.svgEntityManager) {
                    const levelsState = {
                        level4: true,
                        level5: true,
                        level6: false,
                        level7: false
                    };
                    window.app.svgEntityManager.setPremiumLevelsEnabled(levelsState);
                    console.log('🎮 Premium levels enabled in entity manager:', levelsState);
                } else {
                    console.log('🎮 Entity manager not yet available, levels will be enabled when ready');
                }
            }, 1000);
            
            // Also try again after more time in case entity manager loads later
            setTimeout(() => {
                if (window.app && window.app.svgEntityManager) {
                    const levelsState = {
                        level4: true,
                        level5: true,
                        level6: false,
                        level7: false
                    };
                    window.app.svgEntityManager.setPremiumLevelsEnabled(levelsState);
                    console.log('🎮 Premium levels re-enabled in entity manager (delayed):', levelsState);
                }
            }, 5000);
        }
        
        /**
         * Setup Flutter WebView bridge communication
         */
        setupFlutterBridge() {
            // Wait for Flutter WebView to be ready
            const checkFlutterReady = () => {
                if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                    this.isFlutterReady = true;
                    console.log('🎮 Flutter WebView bridge detected and ready');
                    
                    // Process any pending requests
                    this.processPendingRequests();
                    
                    // Register the global channel
                    this.registerGlobalChannel();
                } else {
                    console.log('🎮 Waiting for Flutter WebView bridge...');
                    setTimeout(checkFlutterReady, 100);
                }
            };
            
            checkFlutterReady();
        }
        
        /**
         * Register the global PremiumGamingPopupChannel
         */
        registerGlobalChannel() {
            window.PremiumGamingPopupChannel = {
                postMessage: (data) => this.sendToFlutter(data)
            };
            
            console.log('🎮 PremiumGamingPopupChannel registered globally');
        }
        
        /**
         * Send popup request to Flutter
         */
        sendToFlutter(data) {
            if (!this.isFlutterReady) {
                console.log('🎮 Flutter not ready, queueing popup request');
                this.pendingRequests.push(data);
                return;
            }
            
            try {
                const popupData = typeof data === 'string' ? JSON.parse(data) : data;
                
                console.log('🎮 Sending premium popup request to Flutter:', popupData);
                
                // Use the established Flutter bridge
                window.flutter_inappwebview.callHandler('handlePremiumGamingPopup', popupData)
                    .then(response => {
                        console.log('🎮 Flutter premium popup response:', response);
                    })
                    .catch(error => {
                        console.error('🎮 Error sending to Flutter:', error);
                        this.showFallbackPopup(popupData);
                    });
                    
            } catch (error) {
                console.error('🎮 Error processing popup data:', error);
                this.showFallbackPopup({});
            }
        }
        
        /**
         * Process queued requests when Flutter becomes ready
         */
        processPendingRequests() {
            if (this.pendingRequests.length > 0) {
                console.log(`🎮 Processing ${this.pendingRequests.length} pending popup requests`);
                
                this.pendingRequests.forEach(request => {
                    this.sendToFlutter(request);
                });
                
                this.pendingRequests = [];
            }
        }
        
        /**
         * Setup fallback detection for web popup
         */
        setupFallbackDetection() {
            // Monitor for fallback popup usage
            const originalShowWebPremiumPopup = window.EntityUIManager?.prototype?.showWebPremiumPopup;
            
            if (originalShowWebPremiumPopup) {
                window.EntityUIManager.prototype.showWebPremiumPopup = function() {
                    console.warn('🎮 Using web fallback popup - Flutter bridge may not be working');
                    return originalShowWebPremiumPopup.call(this);
                };
            }
        }
        
        /**
         * Enhanced fallback popup with better integration
         */
        showFallbackPopup(popupData) {
            console.log('🎮 Showing enhanced fallback popup');
            
            // Use the existing web popup but enhance it
            if (window.app && window.app.svgEntityManager && window.app.svgEntityManager.uiManager) {
                window.app.svgEntityManager.uiManager.showWebPremiumPopup();
            }
            
            // Add purchase button enhancement
            setTimeout(() => {
                this.enhanceFallbackPopup(popupData);
            }, 500);
        }
        
        /**
         * Enhance the fallback popup with purchase integration
         */
        enhanceFallbackPopup(popupData) {
            const popup = document.getElementById('premiumPopup');
            if (!popup) return;
            
            // Add a "Try Purchase" button that opens the premium store
            const purchaseBtn = document.createElement('button');
            purchaseBtn.textContent = '🛒 Open Premium Store';
            purchaseBtn.className = 'premium-btn';
            purchaseBtn.style.cssText = `
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                margin: 8px;
                transition: all 0.3s ease;
            `;
            
            purchaseBtn.onclick = () => {
                // Try to open premium store
                if (window.flutter_inappwebview) {
                    window.flutter_inappwebview.callHandler('openPremiumStore', {
                        productId: 'game_l4_l5',
                        source: 'level_progression'
                    });
                }
                
                // Close popup
                const backdrop = popup.parentElement;
                if (backdrop) {
                    document.body.removeChild(backdrop);
                }
            };
            
            // Insert the button before the continue button
            const continueBtn = popup.querySelector('#continueBtn');
            if (continueBtn && continueBtn.parentNode) {
                continueBtn.parentNode.insertBefore(purchaseBtn, continueBtn);
            }
        }
        
        /**
         * Test the bridge connection
         */
        testConnection() {
            console.log('🎮 Testing Premium Gaming Popup Bridge...');
            
            const testData = {
                trigger: 'bridge_test',
                currentLevel: 3,
                unlockedLevels: [4, 5],
                currentScore: 30000,
                timestamp: Date.now()
            };
            
            this.sendToFlutter(testData);
        }
    }
    
    // Initialize the bridge
    const premiumBridge = new PremiumGamingPopupBridge();
    
    // Make available globally for testing
    window.premiumGamingBridge = premiumBridge;
    
    // Auto-test when page is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => premiumBridge.testConnection(), 1000);
        });
    } else {
        setTimeout(() => premiumBridge.testConnection(), 1000);
    }
    
    console.log('🎮 Premium Gaming Popup Bridge loaded successfully');

})();

// Global helper functions for easy testing
window.testPremiumPopup = function() {
    if (window.premiumGamingBridge) {
        window.premiumGamingBridge.testConnection();
    } else {
        console.error('🎮 Premium gaming bridge not available');
    }
};

window.triggerPremiumPopup = function() {
    if (window.app && window.app.svgEntityManager && window.app.svgEntityManager.uiManager) {
        window.app.svgEntityManager.uiManager.showPremiumGamingPopup();
    } else {
        console.error('🎮 Entity manager not available');
    }
};