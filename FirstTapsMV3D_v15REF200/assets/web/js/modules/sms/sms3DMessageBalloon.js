/**
 * SMS 3D Message Balloon
 * Individual balloon class for 3D message display
 */

(function() {
    'use strict';

    /**
     * 3D Message Balloon
     */
    class Sms3DMessageBalloon extends THREE.Sprite {
        constructor(message, yOffset, contactPosition, renderer, soundManager) {
            // Determine if message is outgoing (sent by user)
            // Check both isOutgoing flag and type property
            const isOutgoing = message.isOutgoing || message.type === 'sent';
            
            // Validate contactPosition before using it
            if (!contactPosition || typeof contactPosition.x === 'undefined') {
                console.warn('🎈 Invalid contactPosition in constructor, using default');
                contactPosition = new THREE.Vector3(0, 0, 0);
            }
            
            // Create sprite using renderer
            const sprite = renderer.createBalloon(
                message.text, 
                isOutgoing, 
                message.timestamp || message.id
            );
            
            super(sprite.material);
            
            // Copy sprite properties and metadata
            this.scale.copy(sprite.scale);
            this.heightMultiplier = sprite.userData.heightMultiplier || 1.0;
            
            // CRITICAL: Set position immediately before THREE.js tries to render
            // yOffset is the cumulative height from previous balloons
            const baseY = contactPosition.y + 4.5; // Start well above contact head to avoid covering avatar
            const yPosition = baseY + yOffset;
            
            // Align received (incoming) left, sent (outgoing) right like 2D SMS
            const horizontalOffset = isOutgoing ? 1.5 : -1.5;
            this.position.set(
                contactPosition.x + horizontalOffset,
                yPosition,
                contactPosition.z
            );
            
            this.message = message;
            this.message.isOutgoing = isOutgoing; // Normalize the property
            this.yOffset = yOffset; // Store for later reference
            this.renderer = renderer;
            this.soundManager = soundManager;
            
            // Animation state
            this.floatOffset = Math.random() * Math.PI * 2; // Random starting phase
            this.floatSpeed = 0.5;
            this.targetPosition = new THREE.Vector3();
            this.currentPosition = new THREE.Vector3();
            
            // Initialize animation positions to match actual position (no delay on first render)
            this.targetPosition.copy(this.position);
            this.currentPosition.copy(this.position);
            
            // Make it interactive (like SMS screen for double-tap teleport)
            this.userData.isMessageBalloon = true;
            this.userData.isSmsScreen = true; // Allow same double-tap behavior as SMS screen
            this.userData.contactId = message.contactId || null;
            this.userData.messageId = message.id || message.timestamp;
            this.userData.isInteractable = true;
            
            // Visual effects state
            this.glowIntensity = 0;
            this.glowDecay = 2.0; // Glow fades in 0.5 seconds
            
            console.log(`🎈 Created balloon for message: "${message.text.substring(0, 30)}..."`);
        }

        /**
         * Calculate balloon position
         */
        calculatePosition(contactPosition, index) {
            // Ensure contactPosition is valid
            if (!contactPosition || typeof contactPosition.x === 'undefined') {
                console.warn('🎈 Invalid contactPosition, using default (0, 0, 0)');
                contactPosition = { x: 0, y: 0, z: 0 };
            }
            
            const baseSpacing = 1.4; // Increased to create visible gap between balloons
            const spacing = baseSpacing * (this.heightMultiplier || 1.0); // Vertical spacing based on balloon height
            const baseY = contactPosition.y + 2.5; // Start above contact head
            // Align received (incoming) left, sent (outgoing) right like 2D SMS
            const horizontalOffset = this.message.isOutgoing ? 1.5 : -1.5;
            
            this.targetPosition.set(
                contactPosition.x + horizontalOffset,
                baseY + (index * spacing),
                contactPosition.z
            );
            
            this.currentPosition.copy(this.targetPosition);
        }

        /**
         * Shift balloon position up (when new message arrives)
         */
        shiftUp(spacing) {
            this.index += 1;
            // Use provided spacing or calculate dynamic spacing
            const actualSpacing = spacing || (1.4 * (this.heightMultiplier || 1.0));
            this.targetPosition.y += actualSpacing;
        }

        /**
         * Animate balloon (gentle hover only - NO position animation delay)
         */
        animate(delta) {
            // Guard against undefined properties
            if (!this.currentPosition || !this.targetPosition || !this.position || !this.rotation) {
                console.warn('🎈 Balloon animate called with undefined properties');
                return;
            }
            
            const animSpeed = window.Sms3DSettings ? 
                window.Sms3DSettings.getAnimationSpeed() : 0.5;
            
            // Gentle hover animation (bob up and down)
            this.floatOffset += delta * this.floatSpeed * animSpeed;
            const hoverAmount = Math.sin(this.floatOffset) * 0.12; // Increased bobbing motion
            
            // Gentle side-to-side sway (like balloons in wind)
            const swayAmountX = Math.sin(this.floatOffset * 0.6) * 0.08; // Increased horizontal sway
            const swayAmountZ = Math.cos(this.floatOffset * 0.4) * 0.06; // Increased depth sway
            
            // INSTANT position update - no lerp animation delay
            // This ensures balloons appear immediately at full size without compression/expansion
            this.currentPosition.copy(this.targetPosition);
            
            // Apply position with hover and sway offsets
            this.position.set(
                this.currentPosition.x + swayAmountX,
                this.currentPosition.y + hoverAmount,
                this.currentPosition.z + swayAmountZ
            );
            
            // Subtle rotation for organic floating feel (gentle tilt)
            this.rotation.z = Math.sin(this.floatOffset * 0.5) * 0.05; // Increased rotation
            
            // Glow effect decay
            if (this.glowIntensity > 0) {
                this.glowIntensity -= this.glowDecay * delta;
                if (this.glowIntensity < 0) this.glowIntensity = 0;
                
                // Update material emissive (glow)
                if (this.material && this.material.emissive) {
                    const glowColor = this.message.isOutgoing ? 0x0066cc : 0x888888;
                    this.material.emissive.setHex(glowColor);
                    this.material.emissiveIntensity = this.glowIntensity;
                }
            }
        }

        /**
         * Handle tap/click interaction
         * Now supports interactive mode (camera teleport) instead of just expanding
         */
        onTap() {
            // Don't expand - let the interaction system handle double-tap teleport
            // The userData.isSmsScreen flag ensures double-tap will teleport the camera
            console.log(`🎈 Balloon tapped: "${this.message.text.substring(0, 30)}..."`);
            
            // Play tap sound
            if (this.soundManager) {
                this.soundManager.playSound('tap');
            }
            
            // Add brief glow effect to indicate interaction
            this.addGlowEffect(0.3);
        }

        /**
         * Add glow effect (for new messages)
         */
        addGlowEffect(duration = 0.5) {
            this.glowIntensity = 1.0;
            this.glowDecay = 1.0 / duration;
            
            // Ensure material supports emissive
            if (this.material && !this.material.emissive) {
                this.material.emissive = new THREE.Color(0x000000);
                this.material.emissiveIntensity = 0;
            }
        }

        /**
         * Add pulsing effect (for received messages)
         */
        addPulseEffect(pulseCount = 3) {
            // Add subtle glow pulse for received messages
            this.addGlowEffect(0.5);
            
            console.log(`🎈 Balloon pulse effect added (${pulseCount} pulses)`);
        }

        /**
         * Update balloon after settings change
         */
        updateAppearance() {
            // Recreate the balloon with new settings
            const newSprite = this.renderer.createBalloon(
                this.message.text,
                this.message.isOutgoing,
                this.message.timestamp || this.message.id
            );
            
            // Replace material and scale
            if (this.material) {
                if (this.material.map) this.material.map.dispose();
                this.material.dispose();
            }
            
            this.material = newSprite.material;
            this.scale.copy(newSprite.scale);
            this.heightMultiplier = newSprite.userData.heightMultiplier || 1.0;
            
            console.log('🎈 Balloon appearance updated');
        }

        /**
         * Clean up resources
         */
        dispose() {
            if (this.material) {
                if (this.material.map) this.material.map.dispose();
                this.material.dispose();
            }
        }
    }

    // Export globally
    window.Sms3DMessageBalloon = Sms3DMessageBalloon;

    console.log('🎈 SMS 3D Message Balloon class loaded');

})();
