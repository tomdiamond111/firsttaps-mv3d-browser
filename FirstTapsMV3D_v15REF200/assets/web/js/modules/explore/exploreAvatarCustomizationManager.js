(function() {
    'use strict';

    class ExploreAvatarCustomizationManager {
        constructor(app) {
            this.app = app;
            this.overlay = null;
            this.customizationUI = null;
            this.isUIOpen = false;
            console.log('🎨 ExploreAvatarCustomizationManager constructor called');
        }

        showCustomizationMenu() {
            console.log("🎨 showCustomizationMenu called in ExploreAvatarCustomizationManager");
            
            if (this.isUIOpen) {
                console.log('🎨 Explore menu already open, hiding first');
                this.hideCustomizationMenu();
                // Use setTimeout to ensure DOM updates before re-opening
                setTimeout(() => {
                    this.showCustomizationMenu();
                }, 0);
                return;
            }

            this.isUIOpen = true;
            this.createOverlay();
            this.createCustomizationUI();
        }

        hideCustomizationMenu() {
            if (!this.isUIOpen) return;

            this.isUIOpen = false;
            
            // Remove UI elements safely
            if (this.customizationUI && this.customizationUI.parentNode) {
                this.customizationUI.parentNode.removeChild(this.customizationUI);
                this.customizationUI = null;
            }
            
            // Remove overlay safely
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
                this.overlay = null;
            }
            
            // Restore scene interaction
            this.unblockSceneInteraction();
        }

        createOverlay() {
            this.overlay = document.createElement('div');
            this.overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 1000;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                padding-top: 20px;
                box-sizing: border-box;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            `;
            
            // Close on overlay click
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.hideCustomizationMenu();
                }
            });
            
            // Prevent touch events from reaching the 3D scene
            this.overlay.addEventListener('touchstart', (e) => {
                e.stopPropagation();
            }, { passive: true });
            
            this.overlay.addEventListener('touchmove', (e) => {
                e.stopPropagation();
            }, { passive: true });
            
            this.overlay.addEventListener('touchend', (e) => {
                e.stopPropagation();
            }, { passive: true });

            document.body.appendChild(this.overlay);
        }

        createCustomizationUI() {
            this.customizationUI = document.createElement('div');
            this.customizationUI.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 20px;
                max-width: 90vw;
                max-height: 80vh;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                position: relative;
                z-index: 1001;
            `;

            // Add touch event handlers to prevent 3D scene interference
            this.customizationUI.addEventListener('touchstart', (e) => {
                e.stopPropagation(); // Prevent InputManager from handling this
            }, { passive: true });
            
            this.customizationUI.addEventListener('touchmove', (e) => {
                e.stopPropagation(); // Prevent InputManager from handling this
            }, { passive: true });
            
            this.customizationUI.addEventListener('touchend', (e) => {
                e.stopPropagation(); // Prevent InputManager from handling this
            }, { passive: true });

            const currentConfig = this.getExploreAvatarCustomization();
            const contactData = { name: 'Explore Avatar', id: 'exploreAvatar' };

            if (!window.ContactCustomizationManager || !window.ContactCustomizationManager.instance) {
                console.error("🎨 ContactCustomizationManager instance not found!");
                this.customizationUI.innerHTML = 'Error: Customization manager not available.';
                return;
            }

            // Use the exact same HTML generation as contact customization
            const { html, previewHTML } = window.ContactCustomizationManager.instance.getCustomizationHTML(currentConfig, contactData);
            this.customizationUI.innerHTML = html;
            
            // Add premium gaming helpers section
            this.addPremiumGamingHelpersSection(contactData.id);
            
            this.overlay.appendChild(this.customizationUI);

            const previewContainer = this.customizationUI.querySelector(`#avatar-preview-${contactData.id}`);
            if (previewContainer) {
                previewContainer.innerHTML = previewHTML;
            }

            // Use the exact same event listener setup as contact customization
            window.ContactCustomizationManager.instance.setupAvatarEventListeners(this.customizationUI, currentConfig, contactData.id);
            
            // Create initial preview using the exact same method
            window.ContactCustomizationManager.instance.updateAvatarPreview(currentConfig, contactData.id);

            // Add custom done and cancel button handlers for explore avatar
            const doneButton = this.customizationUI.querySelector(`#done-btn-${contactData.id}`);
            if (doneButton) {
                const newDoneButton = doneButton.cloneNode(true);
                doneButton.parentNode.replaceChild(newDoneButton, doneButton);
                newDoneButton.addEventListener('click', () => {
                    console.log('🎨 Explore Done button clicked');
                    const finalConfig = window.ContactCustomizationManager.instance.readConfigFromUI(this.customizationUI);
                    this.saveExploreAvatarCustomization(finalConfig);
                    this.updateExploreAvatar(finalConfig);
                    this.hideCustomizationMenu();
                });
            }

            const cancelButton = this.customizationUI.querySelector(`#cancel-btn-${contactData.id}`);
            if (cancelButton) {
                const newCancelButton = cancelButton.cloneNode(true);
                cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
                newCancelButton.addEventListener('click', () => this.hideCustomizationMenu());
            }

            const resetButton = this.customizationUI.querySelector(`#reset-btn-${contactData.id}`);
            if (resetButton) {
                const newResetButton = resetButton.cloneNode(true);
                resetButton.parentNode.replaceChild(newResetButton, resetButton);
                newResetButton.addEventListener('click', () => {
                    const defaultConfig = this.getDefaultConfig();
                    window.ContactCustomizationManager.instance.updateAvatarPreview(defaultConfig, contactData.id);
                    window.ContactCustomizationManager.instance.updateUISelections(this.customizationUI, defaultConfig);
                });
            }

            // Add "Customize Helpers" button after the existing buttons
            this.addCustomizeHelpersButton(contactData.id);

            // Prevent touch/click events from propagating to the 3D scene
            this.blockSceneInteraction();
        }

        /**
         * Block 3D scene interaction while UI is open
         */
        blockSceneInteraction() {
            console.log('🎨 Disabling camera controls for explore avatar customization UI');
            
            // Disable camera controls to prevent 3D scene interaction
            if (window.app && window.app.cameraControls) {
                this.originalCameraEnabled = window.app.cameraControls.enabled;
                window.app.cameraControls.enabled = false;
                console.log('🎨 Camera controls disabled');
            }
            
            // Disable canvas event listeners temporarily
            if (window.app && window.app.renderer && window.app.renderer.domElement) {
                const canvas = window.app.renderer.domElement;
                this.originalCanvasStyle = canvas.style.pointerEvents;
                canvas.style.pointerEvents = 'none';
                console.log('🎨 Canvas pointer events disabled');
            }
        }

        /**
         * Restore 3D scene interaction
         */
        unblockSceneInteraction() {
            console.log('🎨 Restoring 3D scene interaction after explore avatar customization UI');
            
            // Restore camera controls
            if (window.app && window.app.cameraControls && this.originalCameraEnabled !== undefined) {
                window.app.cameraControls.enabled = this.originalCameraEnabled;
                console.log('🎨 Camera controls restored');
                this.originalCameraEnabled = undefined;
            }
            
            // Restore canvas pointer events
            if (window.app && window.app.renderer && window.app.renderer.domElement && this.originalCanvasStyle !== undefined) {
                window.app.renderer.domElement.style.pointerEvents = this.originalCanvasStyle;
                console.log('🎨 Canvas pointer events restored');
                this.originalCanvasStyle = undefined;
            }
        }

        getExploreAvatarCustomization() {
            try {
                const customizations = localStorage.getItem('exploreAvatarCustomization');
                return customizations ? JSON.parse(customizations) : this.getDefaultConfig();
            } catch (error) {
                console.error("Error reading explore avatar customization from localStorage:", error);
                return this.getDefaultConfig();
            }
        }

        saveExploreAvatarCustomization(config) {
            try {
                localStorage.setItem('exploreAvatarCustomization', JSON.stringify(config));
                console.log("🎨 Explore avatar customization saved:", config);
            } catch (error) {
                console.error("Error saving explore avatar customization to localStorage:", error);
            }
        }

        updateExploreAvatar(config) {
            console.log("🎨 (Explore) Updating avatar with config:", config);
            if (window.exploreManager && typeof window.exploreManager.updateExploreAvatar === 'function') {
                window.exploreManager.updateExploreAvatar(config);
            } else {
                 console.warn("Could not find a method to update the explore avatar. Checked window.exploreManager");
            }
        }

        /**
         * Add "Customize Helpers" button to the avatar customization UI
         */
        addCustomizeHelpersButton(contactDataId) {
            // Find the button container (usually where done/cancel/reset buttons are)
            const buttonContainer = this.customizationUI.querySelector('.customization-buttons') || 
                                  this.customizationUI.querySelector(`#reset-btn-${contactDataId}`)?.parentNode;
            
            if (!buttonContainer) {
                console.warn('Could not find button container to add Customize Helpers button');
                return;
            }

            // Create the "Customize Helpers" button
            const helpersButton = document.createElement('button');
            helpersButton.id = `helpers-btn-${contactDataId}`;
            helpersButton.textContent = '🐕 Customize Helpers';
            helpersButton.style.cssText = `
                background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 12px 16px;
                margin: 4px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
                min-width: 140px;
            `;

            // Add hover effects
            helpersButton.addEventListener('mouseenter', () => {
                helpersButton.style.transform = 'translateY(-2px)';
                helpersButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            });

            helpersButton.addEventListener('mouseleave', () => {
                helpersButton.style.transform = 'translateY(0)';
                helpersButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            });

            // Add click handler to show helper selection dialog
            helpersButton.addEventListener('click', () => {
                this.showHelperSelectionDialog();
            });

            // Insert the button into the container
            buttonContainer.appendChild(helpersButton);
        }

        /**
         * Show the gaming helper selection dialog
         */
        showHelperSelectionDialog() {
            console.log('🐕 Opening helper selection dialog...');
            
            // Check if premium integration is available
            if (!window.PremiumIntegration) {
                console.error('Premium integration not available');
                this.showHelperUnavailableDialog();
                return;
            }

            // Create helper selection overlay
            const helperOverlay = document.createElement('div');
            helperOverlay.id = 'helper-selection-overlay';
            helperOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 2000;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
                box-sizing: border-box;
            `;

            // Create helper selection dialog
            const helperDialog = document.createElement('div');
            helperDialog.style.cssText = `
                background: white;
                border-radius: 16px;
                padding: 24px;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            // Get available helpers from premium integration
            const availableHelpers = this.getAvailableHelpers();
            
            helperDialog.innerHTML = `
                <h2 style="margin: 0 0 20px 0; color: #333; text-align: center;">
                    🐕 Gaming Helpers
                </h2>
                <p style="text-align: center; color: #666; margin-bottom: 20px;">
                    Choose a companion to help you find treasure in explore mode!
                </p>
                <div id="helper-options">
                    ${this.generateHelperOptionsHTML(availableHelpers)}
                </div>
                <div style="display: flex; justify-content: center; gap: 12px; margin-top: 24px;">
                    <button id="helper-cancel-btn" style="
                        background: #ccc;
                        color: #333;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 24px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Cancel</button>
                    <button id="helper-apply-btn" style="
                        background: linear-gradient(135deg, #4ECDC4, #44A08D);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 24px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Apply Helper</button>
                </div>
            `;

            helperOverlay.appendChild(helperDialog);
            document.body.appendChild(helperOverlay);

            // Set up event listeners
            this.setupHelperDialogEvents(helperOverlay, availableHelpers);
        }

        /**
         * Get available gaming helpers
         */
        getAvailableHelpers() {
            // For now, return a basic set of helpers
            // In Phase 2, this would check premium status and unlock status
            return [
                {
                    id: 'none',
                    name: 'No Helper',
                    description: 'Explore on your own',
                    icon: '🚫',
                    isPremium: false,
                    unlocked: true
                },
                {
                    id: 'dog_golden',
                    name: 'Golden Retriever',
                    description: 'Friendly and loyal treasure hunter',
                    icon: '🐕',
                    isPremium: true,
                    unlocked: window.PremiumIntegration?.isFeatureUnlocked('gaming_helpers') || false
                },
                {
                    id: 'dog_shepherd',
                    name: 'German Shepherd',
                    description: 'Smart and protective companion',
                    icon: '🐕‍🦺',
                    isPremium: true,
                    unlocked: window.PremiumIntegration?.isFeatureUnlocked('gaming_helpers') || false
                },
                {
                    id: 'cat_orange',
                    name: 'Orange Tabby Cat',
                    description: 'Curious and agile explorer',
                    icon: '🐱',
                    isPremium: true,
                    unlocked: window.PremiumIntegration?.isFeatureUnlocked('gaming_helpers') || false
                },
                {
                    id: 'cat_siamese',
                    name: 'Siamese Cat',
                    description: 'Elegant and intelligent hunter',
                    icon: '🐈',
                    isPremium: true,
                    unlocked: window.PremiumIntegration?.isFeatureUnlocked('gaming_helpers') || false
                }
            ];
        }

        /**
         * Generate HTML for helper options
         */
        generateHelperOptionsHTML(helpers) {
            return helpers.map(helper => {
                const isLocked = helper.isPremium && !helper.unlocked;
                const lockIcon = isLocked ? '🔒 ' : '';
                const opacity = isLocked ? 'opacity: 0.6;' : '';
                
                return `
                    <div class="helper-option" data-helper-id="${helper.id}" style="
                        border: 2px solid #e0e0e0;
                        border-radius: 12px;
                        padding: 16px;
                        margin: 8px 0;
                        cursor: ${isLocked ? 'not-allowed' : 'pointer'};
                        transition: all 0.3s ease;
                        ${opacity}
                    ">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 24px;">${helper.icon}</span>
                            <div style="flex: 1;">
                                <h3 style="margin: 0; color: #333; font-size: 16px;">
                                    ${lockIcon}${helper.name}
                                    ${helper.isPremium ? '<span style="background: gold; color: black; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">PREMIUM</span>' : ''}
                                </h3>
                                <p style="margin: 4px 0 0 0; color: #666; font-size: 12px;">
                                    ${helper.description}
                                </p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        /**
         * Set up event listeners for helper dialog
         */
        setupHelperDialogEvents(overlay, availableHelpers) {
            let selectedHelper = 'none'; // Default to no helper

            // Handle helper option clicks
            const helperOptions = overlay.querySelectorAll('.helper-option');
            helperOptions.forEach(option => {
                const helperId = option.dataset.helperId;
                const helper = availableHelpers.find(h => h.id === helperId);
                
                if (helper && !helper.isPremium || helper.unlocked) {
                    option.addEventListener('click', () => {
                        // Remove selection from all options
                        helperOptions.forEach(opt => {
                            opt.style.borderColor = '#e0e0e0';
                            opt.style.backgroundColor = 'white';
                        });
                        
                        // Highlight selected option
                        option.style.borderColor = '#4ECDC4';
                        option.style.backgroundColor = '#f0fffe';
                        
                        selectedHelper = helperId;
                    });
                } else {
                    // Handle locked premium helpers
                    option.addEventListener('click', () => {
                        this.showPremiumUpgradeDialog();
                    });
                }
            });

            // Handle cancel button
            const cancelBtn = overlay.querySelector('#helper-cancel-btn');
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
            });

            // Handle apply button
            const applyBtn = overlay.querySelector('#helper-apply-btn');
            applyBtn.addEventListener('click', () => {
                this.applySelectedHelper(selectedHelper);
                document.body.removeChild(overlay);
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                }
            });
        }

        /**
         * Apply the selected helper
         */
        applySelectedHelper(helperId) {
            console.log(`🐕 Applying helper: ${helperId}`);
            
            if (window.PremiumIntegration && window.PremiumIntegration.activateGamingHelper) {
                window.PremiumIntegration.activateGamingHelper(helperId);
                
                // Show success message
                this.showHelperSuccessMessage(helperId);
            } else {
                console.error('Premium integration or helper activation not available');
            }
        }

        /**
         * Show success message when helper is applied
         */
        showHelperSuccessMessage(helperId) {
            const helper = this.getAvailableHelpers().find(h => h.id === helperId);
            const message = helperId === 'none' ? 
                'Helper removed. You\'re exploring solo!' : 
                `${helper?.name || 'Helper'} is now your companion! 🎉`;
            
            // Create temporary success notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #4ECDC4, #44A08D);
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                font-weight: bold;
                box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                z-index: 3000;
                animation: fadeInOut 3s ease;
            `;
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            // Add CSS animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
            `;
            document.head.appendChild(style);
            
            // Remove after animation
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
                if (style.parentNode) {
                    document.head.removeChild(style);
                }
            }, 3000);
        }

        /**
         * Show dialog when premium features are not available
         */
        showHelperUnavailableDialog() {
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 2000;
                text-align: center;
                max-width: 300px;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin: 0 0 12px 0; color: #333;">Gaming Helpers</h3>
                <p style="color: #666; margin: 0 0 16px 0;">
                    Helper system is loading... Please try again in a moment.
                </p>
                <button onclick="this.parentNode.remove()" style="
                    background: #4ECDC4;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 16px;
                    cursor: pointer;
                ">OK</button>
            `;
            
            document.body.appendChild(dialog);
        }

        /**
         * Show premium upgrade dialog
         */
        showPremiumUpgradeDialog() {
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 2000;
                text-align: center;
                max-width: 350px;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin: 0 0 12px 0; color: #333;">🔒 Premium Feature</h3>
                <p style="color: #666; margin: 0 0 16px 0;">
                    Gaming helpers are a premium feature. Upgrade to unlock adorable companions that help you find treasure!
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="this.parentNode.parentNode.remove()" style="
                        background: #ccc;
                        color: #333;
                        border: none;
                        border-radius: 6px;
                        padding: 8px 16px;
                        cursor: pointer;
                    ">Maybe Later</button>
                    <button onclick="this.parentNode.parentNode.remove()" style="
                        background: linear-gradient(135deg, #FFD700, #FFA500);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        padding: 8px 16px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Upgrade Now</button>
                </div>
            `;
            
            document.body.appendChild(dialog);
        }

        getDefaultConfig() {
            return {
                hair: 'short',
                hairColor: 'brown',
                skinTone: 'light',
                age: 'youngAdult',
                gender: 'female',
                clothing: 'business',
                clothingStyle: 'pants',
                clothingColor: '#4169E1',
                theme: ''
            };
        }
    }

    // Attach the class to the window for access
    window.ExploreAvatarCustomizationManager = ExploreAvatarCustomizationManager;

})();
