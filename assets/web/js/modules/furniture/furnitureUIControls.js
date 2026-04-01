/**
 * FURNITURE UI CONTROLS
 * Adds interactive UI controls (refresh, back buttons) to furniture pieces
 * Displays when user looks at furniture, handles refresh/back actions
 */

(function() {
    'use strict';

    console.log('🎮 Loading Furniture UI Controls...');

    class FurnitureUIControls {
        constructor() {
            this.container = null;
            this.currentFurniture = null;
            this.isVisible = false;
            
            // Button state
            this.buttons = {
                refresh: null,
                back: null,
                done: null,
                info: null
            };

            // Cooldown to prevent spam clicking
            this.clickCooldown = false;
            this.cooldownDuration = 1000; // 1 second

            this.initialize();
            console.log('✅ Furniture UI Controls initialized');
        }

        /**
         * Initialize UI elements
         */
        initialize() {
            // Create container
            this.container = document.createElement('div');
            this.container.id = 'furniture-controls';
            this.container.style.cssText = `
                position: fixed;
                bottom: 100px;
                right: 90px;
                display: none;
                flex-direction: column;
                gap: 12px;
                z-index: 1000;
                pointer-events: auto;
            `;

            // Create refresh button
            this.buttons.refresh = this.createButton('🔄', 'Refresh Content', () => {
                this.handleRefreshClick();
            });

            // Create done button (for exiting move mode)
            this.buttons.done = this.createButton('✓', 'Done Moving', () => {
                this.handleDoneClick();
            });
            // Style done button with green background
            this.buttons.done.style.background = 'rgba(76, 175, 68, 0.9)';
            this.buttons.done.style.display = 'none'; // Hidden by default, shown during move mode

            // Create back button
            this.buttons.back = this.createButton('⏮️', 'Previous Playlist', () => {
                this.handleBackClick();
            });
            // Hide back button - feature not yet fully implemented
            this.buttons.back.style.display = 'none';

            // Info button removed - not needed
            // this.buttons.info = this.createButton('ℹ️', 'Furniture Info', () => {
            //     this.handleInfoClick();
            // });

            // Add buttons to container
            this.container.appendChild(this.buttons.refresh);
            this.container.appendChild(this.buttons.done);
            this.container.appendChild(this.buttons.back);
            // Info button removed: this.container.appendChild(this.buttons.info);

            // Add to document
            document.body.appendChild(this.container);

            console.log('✅ Furniture UI controls created');
        }

        /**
         * Create a button element
         * @param {string} emoji - Button emoji
         * @param {string} tooltip - Tooltip text
         * @param {Function} onClick - Click handler
         * @returns {HTMLElement} Button element
         */
        createButton(emoji, tooltip, onClick) {
            const button = document.createElement('button');
            button.className = 'furniture-control-btn';
            button.innerHTML = `
                <span class="btn-emoji">${emoji}</span>
                <span class="btn-tooltip">${tooltip}</span>
            `;
            
            button.style.cssText = `
                width: 60px;
                height: 60px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.3);
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(10px);
                color: white;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;

            // Tooltip styling
            const tooltipSpan = button.querySelector('.btn-tooltip');
            tooltipSpan.style.cssText = `
                position: absolute;
                right: 70px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            // Hover effects
            button.addEventListener('mouseenter', () => {
                button.style.background = 'rgba(0, 0, 0, 0.85)';
                button.style.transform = 'scale(1.1)';
                button.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                tooltipSpan.style.opacity = '1';
            });

            button.addEventListener('mouseleave', () => {
                button.style.background = 'rgba(0, 0, 0, 0.7)';
                button.style.transform = 'scale(1)';
                button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                tooltipSpan.style.opacity = '0';
            });

            // Click handler
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!this.clickCooldown) {
                    onClick();
                    this.startCooldown();
                    
                    // Visual feedback
                    button.style.transform = 'scale(0.9)';
                    setTimeout(() => {
                        button.style.transform = 'scale(1)';
                    }, 100);
                }
            });

            return button;
        }

        /**
         * Show controls for specific furniture
         * @param {Object} furniture - Furniture object with UUID and type
         * @param {boolean} showTutorialHint - Show tutorial hint for first-time users
         */
        showControls(furniture, showTutorialHint = false) {
            if (!furniture || (!furniture.uuid && !furniture.userData?.id)) {
                this.hideControls();
                return;
            }

            this.currentFurniture = furniture;
            this.isVisible = true;
            this.container.style.display = 'flex';

            // Animate in
            this.container.style.opacity = '0';
            this.container.style.transform = 'translateX(20px)';
            
            requestAnimationFrame(() => {
                this.container.style.transition = 'all 0.3s ease';
                this.container.style.opacity = '1';
                this.container.style.transform = 'translateX(0)';
            });

            // Update button states
            this.updateButtonStates();
            
            // Show Done button if we're in move mode (object is being moved)
            // Hide refresh button during move mode
            if (window.app && window.app.stateManager && window.app.stateManager.movingObject) {
                this.buttons.done.style.display = 'flex';
                this.buttons.refresh.style.display = 'none';
                console.log('✓ Showing Done button - furniture is being moved');
            } else {
                this.buttons.done.style.display = 'none';
                this.buttons.refresh.style.display = 'flex';
            }

            // Show tutorial hint if requested and not shown before
            if (showTutorialHint && !localStorage.getItem('furniture_controls_tutorial_shown')) {
                this.showTutorialHint();
                localStorage.setItem('furniture_controls_tutorial_shown', 'true');
            }

            console.log(`👁️ Showing controls for furniture ${furniture.uuid.substring(0, 8)}`);
        }

        /**
         * Show a brief tutorial hint about furniture controls
         */
        showTutorialHint() {
            const hint = document.createElement('div');
            hint.style.cssText = `
                position: fixed;
                bottom: 250px;
                right: 20px;
                background: rgba(0, 150, 255, 0.95);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 14px;
                max-width: 250px;
                z-index: 1001;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease;
            `;
            hint.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 6px;">💡 Furniture Controls</div>
                <div style="font-size: 12px; opacity: 0.95;">Use these buttons to refresh content or navigate playlists!</div>
            `;
            document.body.appendChild(hint);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                hint.style.transition = 'opacity 0.3s ease';
                hint.style.opacity = '0';
                setTimeout(() => hint.remove(), 300);
            }, 5000);
        }

        /**
         * Hide controls
         */
        hideControls() {
            if (!this.isVisible) return;

            this.container.style.transition = 'all 0.2s ease';
            this.container.style.opacity = '0';
            this.container.style.transform = 'translateX(20px)';

            setTimeout(() => {
                this.container.style.display = 'none';
                this.currentFurniture = null;
                this.isVisible = false;
            }, 200);

            console.log('👁️ Hiding furniture controls');
        }

        /**
         * Update button enabled/disabled states
         */
        updateButtonStates() {
            if (!this.currentFurniture) return;

            // Refresh button always enabled
            this.buttons.refresh.disabled = false;
            this.buttons.refresh.style.opacity = '1';

            // Back button enabled only if history exists
            const canGoBack = window.furnitureHistory && 
                             window.furnitureHistory.canGoBack(this.currentFurniture.uuid);
            
            this.buttons.back.disabled = !canGoBack;
            this.buttons.back.style.opacity = canGoBack ? '1' : '0.5';
            this.buttons.back.style.cursor = canGoBack ? 'pointer' : 'not-allowed';

            // Info button removed - no longer needed
            // this.buttons.info.disabled = false;
            // this.buttons.info.style.opacity = '1';
        }

        /**
         * Handle refresh button click
         */
        handleRefreshClick() {
            if (!this.currentFurniture) return;
            
            // Check if refresh is already in progress
            if (window.contentGenerator && window.contentGenerator.isRefreshing) {
                console.warn('⚠️ Refresh already in progress, please wait');
                this.showNotification('Refresh in progress...', 'warning');
                return;
            }

            const furnitureId = this.currentFurniture.userData?.id || this.currentFurniture.userData?.furnitureId;
            if (!furnitureId) {
                console.error('❌ Furniture ID not found in userData');
                return;
            }
            
            console.log('🔄 Refresh button clicked for:', furnitureId.substring(0, 8));

            // Show loading feedback and grey out button
            this.buttons.refresh.querySelector('.btn-emoji').textContent = '⏳';
            this.buttons.refresh.disabled = true;
            this.buttons.refresh.style.opacity = '0.5';
            this.buttons.refresh.style.cursor = 'not-allowed';

            try {
                // Use contentGenerator to refresh this specific furniture piece
                if (window.contentGenerator && typeof window.contentGenerator.refreshSingleFurniture === 'function') {
                    console.log(`🎯 Calling contentGenerator.refreshSingleFurniture(${furnitureId.substring(0, 8)})...`);
                    window.contentGenerator.refreshSingleFurniture(furnitureId);
                } else if (window.contentGenerator && typeof window.contentGenerator.refreshAllFurniture === 'function') {
                    // Fallback to refreshAllFurniture if refreshSingleFurniture not available
                    console.warn('⚠️ refreshSingleFurniture not available, falling back to refreshAllFurniture');
                    window.contentGenerator.refreshAllFurniture();
                } else {
                    console.warn('⚠️ ContentGenerator not available for refresh');
                    this.showNotification('Refresh not available', 'warning');
                }

                // Success feedback
                this.showNotification('Refreshing content...', 'success');
                
                // Poll to check when refresh is complete
                this.pollRefreshCompletion();
                
            } catch (error) {
                console.error('❌ Error refreshing furniture:', error);
                this.showNotification('Refresh failed', 'error');
                // Reset button on error
                this.resetRefreshButton();
            }
        }

        /**
         * Poll to check when refresh is complete and re-enable button
         */
        pollRefreshCompletion() {
            const checkInterval = 500; // Check every 500ms
            const maxWait = 30000; // Maximum 30 seconds
            let elapsed = 0;
            
            const pollTimer = setInterval(() => {
                elapsed += checkInterval;
                
                // Check if refresh is complete
                if (!window.contentGenerator || !window.contentGenerator.isRefreshing) {
                    clearInterval(pollTimer);
                    this.resetRefreshButton();
                    console.log('✅ Refresh completed, button re-enabled');
                    return;
                }
                
                // Timeout after max wait
                if (elapsed >= maxWait) {
                    clearInterval(pollTimer);
                    this.resetRefreshButton();
                    console.warn('⚠️ Refresh timeout, force re-enabling button');
                    return;
                }
            }, checkInterval);
        }
        
        /**
         * Reset refresh button to normal state
         */
        resetRefreshButton() {
            if (this.buttons.refresh) {
                this.buttons.refresh.querySelector('.btn-emoji').textContent = '🔄';
                this.buttons.refresh.disabled = false;
                this.buttons.refresh.style.opacity = '1';
                this.buttons.refresh.style.cursor = 'pointer';
            }
        }

        /**
         * Handle back button click
         */
        handleBackClick() {
            if (!this.currentFurniture) return;

            const canGoBack = window.furnitureHistory && 
                             window.furnitureHistory.canGoBack(this.currentFurniture.uuid);

            if (!canGoBack) {
                this.showNotification('No history available', 'warning');
                return;
            }

            console.log('⏮️ Back button clicked for:', this.currentFurniture.uuid.substring(0, 8));

            // Show loading feedback
            this.buttons.back.querySelector('.btn-emoji').textContent = '⏳';
            this.buttons.back.disabled = true;

            try {
                // Get previous state
                const previousState = window.furnitureHistory.restorePreviousState(this.currentFurniture.uuid);

                if (!previousState) {
                    this.showNotification('Could not restore previous state', 'error');
                    return;
                }

                // Restore furniture content
                const furnitureManager = window.FurnitureManager || window.furnitureManager;
                
                if (furnitureManager && typeof furnitureManager.restoreFurnitureState === 'function') {
                    furnitureManager.restoreFurnitureState(this.currentFurniture.uuid, previousState);
                    this.showNotification('Restored previous playlist', 'success');
                } else {
                    console.warn('⚠️ Furniture restore function not available');
                    this.showNotification('Restore not available', 'warning');
                }

            } catch (error) {
                console.error('❌ Error restoring furniture:', error);
                this.showNotification('Restore failed', 'error');
            }

            // Reset button after delay
            setTimeout(() => {
                this.buttons.back.querySelector('.btn-emoji').textContent = '⏮️';
                this.updateButtonStates();
            }, 1000);
        }

        /**
         * Handle done button click (exit move mode)
         */
        handleDoneClick() {
            console.log('✓ Done button clicked - exiting move mode');
            
            // Call moveManager to end the object move
            if (window.app && window.app.moveManager) {
                window.app.moveManager.handleObjectMoveEnd();
                this.showNotification('Move completed', 'success', 1500);
            } else {
                console.error('❌ MoveManager not available');
                this.showNotification('Error: Move manager not found', 'error');
            }
            
            // Hide the done button after completing move
            if (this.buttons.done) {
                this.buttons.done.style.display = 'none';
            }
        }

        /**
         * Handle info button click
         */
        handleInfoClick() {
            if (!this.currentFurniture) return;

            console.log('ℹ️ Info button clicked for:', this.currentFurniture.uuid.substring(0, 8));

            // Get furniture info
            const info = this.getFurnitureInfo(this.currentFurniture);
            this.showInfoDialog(info);
        }

        /**
         * Get furniture information
         * @param {Object} furniture - Furniture object
         * @returns {Object} Info object
         */
        getFurnitureInfo(furniture) {
            const info = {
                type: furniture.type || furniture.fileName || 'Unknown',
                name: furniture.name || furniture.type || furniture.fileName || 'Unknown',
                objectCount: 0,
                strategy: 'Unknown',
                genre: 'N/A'
            };

            // Get content generator info with multiple fallback attempts
            const contentGen = window.contentGenerator || window.app?.dynamicContentGenerator || 
                              (window.DynamicContentGenerator && new window.DynamicContentGenerator());
            
            if (contentGen && contentGen.strategies) {
                // Try multiple ways to get furniture type for strategy lookup
                const furnitureType = furniture.type || furniture.fileName?.toLowerCase() || furniture.id?.toLowerCase();
                
                // Direct lookup
                let strategyValue = contentGen.strategies[furnitureType];
                
                // If not found, try to extract type from fileName or id
                if (!strategyValue && furnitureType) {
                    // Try matching key parts (e.g., "gallery_wall_1" -> "gallery_wall")
                    for (const key of Object.keys(contentGen.strategies)) {
                        if (furnitureType.includes(key)) {
                            strategyValue = contentGen.strategies[key];
                            console.log(`ℹ️ Found strategy by partial match: ${key} -> ${strategyValue}`);
                            break;
                        }
                    }
                }
                
                // Format strategy for display
                if (strategyValue) {
                    // Convert UPPERCASE_STRATEGY to readable format
                    info.strategy = strategyValue.replace(/_/g, ' ')
                        .split(' ')
                        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
                        .join(' ');
                } else {
                    info.strategy = 'All Genres';
                }
                
                // Get current genre if available
                if (typeof contentGen.getCurrentGenre === 'function') {
                    const currentGenre = contentGen.getCurrentGenre(furnitureType);
                    info.genre = currentGenre ? currentGenre.replace(/_/g, ' ') : 'All genres';
                } else {
                    info.genre = 'All genres';
                }
            } else {
                console.warn('⚠️ ContentGenerator not available for furniture info');
                info.strategy = 'All Genres';
            }

            // Get accurate object count - count actual objects parented to furniture
            if (furniture.group && furniture.group.children) {
                // Count children that are actual content objects (not structure)
                info.objectCount = furniture.group.children.filter(child => {
                    // Check for app objects using correct userData properties
                    return child.userData && (
                        child.userData.type === 'app' ||
                        child.userData.type === 'file' ||
                        child.userData.fileData?.extension === 'app' ||
                        child.userData.fileData?.isApp === true
                    );
                }).length;
                console.log(`ℹ️ Counted ${info.objectCount} objects from furniture.group.children (${furniture.group.children.length} total children)`);
            } else if (furniture.objectIds && Array.isArray(furniture.objectIds)) {
                // Fallback: count non-null entries in objectIds array
                info.objectCount = furniture.objectIds.filter(id => id && id !== null).length;
                console.log(`ℹ️ Counted ${info.objectCount} objects from furniture.objectIds`);
            } else {
                console.warn('⚠️ Could not find objects for furniture - both group.children and objectIds unavailable');
            }

            console.log(`ℹ️ Furniture info for ${furniture.type || furniture.fileName}: strategy=${info.strategy}, genre=${info.genre}, objects=${info.objectCount}`);

            return info;
        }

        /**
         * Show info dialog
         * @param {Object} info - Info object
         */
        showInfoDialog(info) {
            const message = `
                <strong>Furniture:</strong> ${info.name}<br>
                <strong>Strategy:</strong> ${info.strategy}<br>
                <strong>Current Genre:</strong> ${info.genre}<br>
                <strong>Objects:</strong> ${info.objectCount}
            `;

            this.showNotification(message, 'info', 5000);
        }

        /**
         * Show notification toast
         * @param {string} message - Message text
         * @param {string} type - Type (success, error, warning, info)
         * @param {number} duration - Duration in ms
         */
        showNotification(message, type = 'info', duration = 3000) {
            const toast = document.createElement('div');
            toast.className = 'furniture-notification';
            toast.innerHTML = message;

            const colors = {
                success: 'rgba(34, 197, 94, 0.9)',
                error: 'rgba(239, 68, 68, 0.9)',
                warning: 'rgba(251, 191, 36, 0.9)',
                info: 'rgba(59, 130, 246, 0.9)'
            };

            toast.style.cssText = `
                position: fixed;
                bottom: 180px;
                right: 20px;
                background: ${colors[type] || colors.info};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 1001;
                opacity: 0;
                transform: translateX(20px);
                transition: all 0.3s ease;
                max-width: 300px;
            `;

            document.body.appendChild(toast);

            // Animate in
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            });

            // Remove after duration
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, duration);
        }

        /**
         * Start click cooldown
         */
        startCooldown() {
            this.clickCooldown = true;
            setTimeout(() => {
                this.clickCooldown = false;
            }, this.cooldownDuration);
        }

        /**
         * Check if furniture is currently focused
         * @returns {boolean} True if furniture focused
         */
        isFurnitureFocused() {
            return this.isVisible && this.currentFurniture !== null;
        }

        /**
         * Get current furniture
         * @returns {Object|null} Current furniture or null
         */
        getCurrentFurniture() {
            return this.currentFurniture;
        }
    }

    // ============================================================================
    // GLOBAL INSTANCE
    // ============================================================================
    
    window.FurnitureUIControls = FurnitureUIControls;
    
    // Create global instance
    if (!window.furnitureUI) {
        window.furnitureUI = new FurnitureUIControls();
        console.log('🎮 Global FurnitureUIControls instance created');
    }

    console.log('✅ Furniture UI Controls module loaded');
})();
