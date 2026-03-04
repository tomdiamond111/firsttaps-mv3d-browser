/**
 * SMS 3D Balloon Manager
 * Main controller for 3D message balloon system
 */

(function() {
    'use strict';

    /**
     * 3D Balloon Manager
     * Manages balloon creation, positioning, animation, and interaction
     */
    class Sms3DBalloonManager {
        constructor(scene, contact) {
            this.scene = scene;
            this.contact = contact;
            
            // Managers
            this.renderer = new window.Sms3DBalloonRenderer();
            this.soundManager = new window.Sms3DSoundManager();
            
            // Balloon storage
            this.balloons = []; // Array of Sms3DMessageBalloon instances
            this.maxBalloons = 10; // Maximum visible balloons (increased to show more history)
            
            // Contact position reference
            this.contactPosition = new THREE.Vector3();
            if (contact.mesh) {
                this.contactPosition.copy(contact.mesh.position);
            }
            
            // Animation state
            this.enabled = false;
            this.isAnimating = false;
            
            // Raycaster for interaction
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
            
            // Message polling (because Android doesn't deliver real-time SMS broadcasts reliably)
            this.pollingInterval = null;
            this.lastMessageCount = 0;
            
            // Set up passive SMS event listener (non-interfering)
            this.setupPassiveSmsListener();
            
            console.log('🎈 SMS 3D Balloon Manager initialized');
        }

        /**
         * Set up passive listener to observe existing SMS message flow
         * Uses the SAME system as 2D SMS screen - registers with Simple Core
         */
        setupPassiveSmsListener() {
            // Register with SMS Simple Core (same as 2D SMS screen)
            if (window.smsSimpleCore) {
                // FIX: Use contact.contactData.id, not contact.id (which doesn't exist)
                const contactId = this.contact.contactData.id;
                console.log(`🎈 Registering with SMS Simple Core for ${contactId}`);
                window.smsSimpleCore.registerSmsScreen(contactId, this);
            } else {
                console.error('🎈 SMS Simple Core not available!');
            }

            console.log('🎈 Balloon manager registered with SMS Simple Core (same as 2D screen)');
        }

        /**
         * Enable/disable 3D balloons
         */
        setEnabled(enabled) {
            this.enabled = enabled;
            
            if (enabled) {
                console.log('🎈 3D Balloon mode enabled');
                
                // IMMEDIATE DISPLAY: Force conversation refresh from Simple Core
                // This triggers an immediate get_conversation call instead of waiting 3 seconds for polling
                const contactId = this.contact.contactData.id;
                if (window.smsSimpleCore) {
                    console.log('🎈 Requesting immediate conversation refresh from Simple Core');
                    window.smsSimpleCore.requestConversationRefresh(contactId);
                } else {
                    console.warn('🎈 Simple Core not available, waiting for polling cycle');
                }
                
                // Start polling for new messages (Android doesn't deliver SMS broadcasts reliably)
                this.startMessagePolling();
            } else {
                console.log('🎈 3D Balloon mode disabled');
                this.clearAllBalloons();
                this.stopMessagePolling();
            }
        }
        
        /**
         * Toggle balloons on/off (for contact tap interaction)
         */
        toggle() {
            this.setEnabled(!this.enabled);
        }

        /**
         * Check if 3D mode is enabled
         */
        isEnabled() {
            return this.enabled && window.Sms3DSettings && 
                   window.Sms3DSettings.getSetting('enabled');
        }

        /**
         * Called by SMS Simple Core when messages update
         * This is the SAME method the 2D SMS screen implements
         * We're a pure visual alternative that uses the same interface
         */
        updateMessages(messages) {
            console.log(`🎈 updateMessages() called by Simple Core with ${messages?.length || 0} messages (enabled: ${this.enabled})`);
            
            // Messages come from Flutter with NEWEST FIRST
            // Take the first N messages (most recent)
            const recentMessages = (messages || []).slice(0, this.maxBalloons);
            
            console.log(`🎈 Showing ${recentMessages.length} most recent messages`);
            if (recentMessages.length > 0) {
                console.log(`🎈 Newest message: "${recentMessages[0].text}" (${recentMessages[0].type})`);
                console.log(`🎈 DEBUG: All ${recentMessages.length} messages:`, recentMessages.map(m => ({
                    text: m.text?.substring(0, 20),
                    type: m.type,
                    isOutgoing: m.isOutgoing,
                    contactId: m.contactId
                })));
            }
            
            // Always clear and update balloon state (even if disabled)
            // This keeps the balloon manager in sync with message state
            this.balloons.forEach(balloon => {
                this.scene.remove(balloon);
                balloon.dispose();
            });
            this.balloons = [];
            
            // Only create visible balloons if enabled
            if (!this.enabled) {
                console.log('🎈 Balloon manager disabled - balloons cleared but not recreated');
                return;
            }
            
            // Create balloons: newest message at BOTTOM (index 0), oldest at TOP
            // Use cumulative Y positioning to account for variable balloon heights
            let currentY = 0; // Start at base position
            recentMessages.forEach((message, index) => {
                console.log(`🎈 Creating balloon ${index + 1}/${recentMessages.length}: "${message.text?.substring(0, 30)}" type=${message.type}`);
                const balloon = this.addMessageInternal(message, currentY);
                if (balloon) {
                    console.log(`🎈 ✅ Balloon created successfully`);
                    // Use actual sprite scale.y (world units) instead of just heightMultiplier
                    const balloonHeight = balloon.scale.y;
                    currentY += (balloonHeight * 0.8); // Spacing between balloons (50% reduced)
                } else {
                    console.error(`🎈 ❌ Failed to create balloon for message`);
                }
            });
        }

        /**
         * Add a new message balloon (internal - used during refresh)
         */
        addMessageInternal(message, yOffset) {
            // Create balloon at specified Y offset position
            const balloon = new window.Sms3DMessageBalloon(
                message,
                yOffset,
                this.contactPosition,
                this.renderer,
                this.soundManager
            );
            
            // Add to scene and array
            this.scene.add(balloon);
            this.balloons.push(balloon);
            
            // Add subtle visual effects (no sound during batch refresh)
            if (message.type === 'sent') {
                balloon.addGlowEffect(0.3);
            } else if (message.type === 'received') {
                balloon.addPulseEffect(1);
            }
            
            // Return balloon for height calculation
            return balloon;
        }
        
        /**
         * Add a new message balloon (public - for manual adding)
         */
        addMessage(message) {
            if (!this.isEnabled()) return;
            
            // Create new balloon
            const balloon = new window.Sms3DMessageBalloon(
                message,
                0, // Always index 0 (newest)
                this.contactPosition,
                this.renderer,
                this.soundManager
            );
            
            // Calculate spacing based on new balloon's height
            const spacing = 1.4 * (balloon.heightMultiplier || 1.0);
            
            // Shift existing balloons up
            this.balloons.forEach(existingBalloon => {
                existingBalloon.shiftUp(spacing);
            });
            
            // Add to scene and array
            this.scene.add(balloon);
            this.balloons.unshift(balloon); // Add to beginning (newest first)
            
            // Add visual and sound effects
            if (message.type === 'sent') {
                balloon.addGlowEffect(0.5);
                this.soundManager.playSound('send');
            } else if (message.type === 'received') {
                balloon.addPulseEffect(3);
                this.soundManager.playSound('receive');
            }
            
            // Remove oldest balloon if exceeding max
            if (this.balloons.length > this.maxBalloons) {
                const oldBalloon = this.balloons.pop();
                this.scene.remove(oldBalloon);
                oldBalloon.dispose();
            }
            
            console.log(`🎈 Added balloon (total: ${this.balloons.length})`);
        }

        /**
         * Refresh all balloons (when switching to 3D mode)
         */
        refreshAllBalloons() {
            // Clear existing balloons
            this.clearAllBalloons();
            
            // Get messages from contact's SMS screen (passive observer pattern)
            if (!this.contact || !this.contact.smsScreen || 
                !this.contact.smsScreen.messages || 
                this.contact.smsScreen.messages.length === 0) {
                console.log('🎈 No messages to display (SMS screen:', 
                    this.contact?.smsScreen ? 'exists' : 'not created', 
                    'messages:', this.contact?.smsScreen?.messages?.length || 0, ')');
                return;
            }
            
            // Get most recent messages (up to maxBalloons)
            const recentMessages = this.contact.smsScreen.messages.slice(-this.maxBalloons).reverse();
            
            // Create balloons for each message
            recentMessages.forEach((message, index) => {
                const balloon = new window.Sms3DMessageBalloon(
                    message,
                    index,
                    this.contactPosition,
                    this.renderer,
                    this.soundManager
                );
                
                // Mark balloon as interactive SMS screen element for double-tap teleport
                balloon.userData.isSmsScreen = true;
                balloon.userData.contactId = this.contact.contactData.id;
                balloon.userData.isInteractable = true;
                
                this.scene.add(balloon);
                this.balloons.push(balloon);
            });
            
            console.log(`🎈 Refreshed ${this.balloons.length} balloons from SMS screen`);
        }

        /**
         * Clear all balloons (when switching to 2D mode)
         */
        clearAllBalloons() {
            this.balloons.forEach(balloon => {
                this.scene.remove(balloon);
                balloon.dispose();
            });
            this.balloons = [];
            console.log('🎈 Cleared all balloons');
        }

        /**
         * Update settings (called when user changes preferences)
         */
        updateSettings() {
            // Update sound manager volume
            const soundSettings = window.Sms3DSettings ? 
                window.Sms3DSettings.getSetting('sound') : null;
            if (soundSettings) {
                this.soundManager.soundPack = soundSettings.pack;
                this.soundManager.volume = soundSettings.volume;
            }
            
            // Update all balloon appearances
            this.balloons.forEach(balloon => {
                balloon.updateAppearance();
            });
            
            console.log('🎈 Settings updated for all balloons');
        }

        /**
         * Animate all balloons
         */
        animate(delta) {
            if (!this.isEnabled() || this.balloons.length === 0) return;
            
            this.balloons.forEach(balloon => {
                balloon.animate(delta);
            });
        }

        /**
         * Handle click/tap on balloons
         */
        handleClick(event, camera) {
            if (!this.isEnabled() || this.balloons.length === 0) return;
            
            // Calculate mouse position in normalized device coordinates
            const rect = event.target.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Update raycaster
            this.raycaster.setFromCamera(this.mouse, camera);
            
            // Check for intersections
            const intersects = this.raycaster.intersectObjects(this.balloons);
            
            if (intersects.length > 0) {
                const balloon = intersects[0].object;
                if (balloon.onTap) {
                    balloon.onTap();
                    return true; // Consumed the click
                }
            }
            
            return false; // Did not consume the click
        }

        /**
         * Update contact position (if contact moves)
         */
        updateContactPosition(newPosition) {
            this.contactPosition.copy(newPosition);
            
            // Recalculate all balloon positions
            this.balloons.forEach((balloon, index) => {
                balloon.calculatePosition(this.contactPosition, index);
            });
        }

        /**
         * Get balloon count
         */
        getBalloonCount() {
            return this.balloons.length;
        }

        /**
         * Start polling for new messages
         * GOOGLE PLAY COMPLIANCE: Polling occurs only while SMS screen is open
         * This is on-demand message loading, not background monitoring
         */
        startMessagePolling() {
            // Clear any existing polling
            this.stopMessagePolling();
            
            const contactId = this.contact.contactData.id;
            console.log(`🎈 📡 Starting on-demand message polling for contact ${contactId} (every 3 seconds while screen open)`);
            
            // Poll every 3 seconds for new messages (Google Play compliant - on-demand while screen visible)
            this.pollingInterval = setInterval(() => {
                if (!this.enabled) {
                    console.log('🎈 Balloon manager disabled, stopping polling');
                    this.stopMessagePolling();
                    return;
                }
                
                // Request fresh conversation data from Flutter (on-demand reading)
                if (window.smsSimpleCore) {
                    window.smsSimpleCore.refreshConversation(contactId);
                }
            }, 3000); // Poll every 3 seconds (Google Play compliant - on-demand only while screen visible)
            
            console.log('🎈 📡 On-demand message polling started (Google Play compliant)');
        }

        /**
         * Stop polling for new messages
         */
        stopMessagePolling() {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
                console.log('🎈 📡 Message polling stopped');
            }
        }

        /**
         * Dispose of all resources
         */
        dispose() {
            this.stopMessagePolling();
            this.clearAllBalloons();
            this.soundManager.dispose();
            this.renderer.dispose();
            console.log('🎈 Balloon Manager disposed');
        }
    }

    // Export globally
    window.Sms3DBalloonManager = Sms3DBalloonManager;

    console.log('🎈 SMS 3D Balloon Manager class loaded');

})();
